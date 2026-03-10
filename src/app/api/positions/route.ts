import { NextRequest, NextResponse } from "next/server";

export interface PositionsResponse {
  success: boolean;
  data: Record<string, any>;
  timestamp: number;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const addressesParam = searchParams.get("addresses");

    if (!addressesParam) {
      return NextResponse.json(
        {
          success: false,
          data: {},
          timestamp: Date.now(),
          error: "Missing required query parameter: addresses",
        } as PositionsResponse,
        { status: 400 }
      );
    }

    const addresses = addressesParam
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    if (addresses.length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: {},
          timestamp: Date.now(),
          error: "No valid addresses provided",
        } as PositionsResponse,
        { status: 400 }
      );
    }

    const results = await Promise.all(
      addresses.map(async (address) => {
        try {
          const response = await fetch(
            `https://api.terminal.markets/api/v1/positions/${address}`,
            {
              headers: {
                "Content-Type": "application/json",
              },
              next: { revalidate: 30 },
            }
          );

          if (!response.ok) {
            console.error(
              `Positions API error for ${address}: status ${response.status}`
            );
            return { address, data: null };
          }

          const json = await response.json();
          return { address, data: json };
        } catch (error) {
          console.error(`Positions fetch failed for ${address}:`, error);
          return { address, data: null };
        }
      })
    );

    const data: Record<string, any> = {};
    for (const result of results) {
      data[result.address] = result.data;
    }

    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now(),
    } as PositionsResponse);
  } catch (error) {
    console.error("Positions API Error:", error);
    return NextResponse.json(
      {
        success: false,
        data: {},
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : "Unknown error",
      } as PositionsResponse,
      { status: 500 }
    );
  }
}
