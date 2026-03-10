"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Customized,
} from "recharts";
import { format } from "date-fns";

const GrassBackground = dynamic(() => import("./GrassBackground"), {
  ssr: false,
});

export interface CeoEntry {
  ceo_slug: string;
  ceo_name: string;
  provider: string;
  model: string;
  total_value_usd: number;
  total_pnl_usd: number;
  avg_pnl_percent: number;
  managed_vault_count: number;
}

export interface PnlSnapshot {
  timestamp: number;
  data: Record<string, number>;
}

interface LeaderboardChartProps {
  currentData: CeoEntry[];
  historicalData: PnlSnapshot[];
}

const CEO_AVATARS: Record<string, string> = {
  chatgpt: "/openai.gif",
  claude: "/anthropic.gif",
  gemini: "/gemini.gif",
  grok: "/xai.gif",
};

const CEO_COLORS: Record<string, string> = {
  chatgpt: "#2ecc71",
  claude: "#e74c3c",
  gemini: "#3498db",
  grok: "#f39c12",
};

const CEO_GIFS: Record<string, string> = {
  chatgpt: "/openai.gif",
  claude: "/anthropic.gif",
  gemini: "/gemini.gif",
  grok: "/xai.gif",
};

function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export default function LeaderboardChart({
  currentData,
  historicalData,
}: LeaderboardChartProps) {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const chartData = useMemo(() => {
    if (historicalData.length === 0) return [];

    const MINUTE = 60_000;
    const now = Date.now();
    const nowBucket = Math.floor(now / MINUTE) * MINUTE;

    const sorted = [...historicalData].sort((a, b) => a.timestamp - b.timestamp);
    const startBucket = Math.floor(sorted[0].timestamp / MINUTE) * MINUTE;

    const rawBuckets: Record<number, PnlSnapshot> = {};
    historicalData.forEach((snapshot) => {
      const bucketTime = Math.round(snapshot.timestamp / MINUTE) * MINUTE;
      rawBuckets[bucketTime] = snapshot;
    });

    const totalMinutes = Math.floor((nowBucket - startBucket) / MINUTE);
    const slugs = currentData.map((c) => c.ceo_slug);
    const points: Array<Record<string, unknown>> = [];
    const lastKnown: Record<string, number | undefined> = {};

    for (const snap of sorted) {
      if (snap.timestamp <= startBucket) {
        slugs.forEach((s) => { if (snap.data[s] !== undefined) lastKnown[s] = snap.data[s]; });
      }
    }

    for (let i = 0; i <= totalMinutes; i++) {
      const bucketTime = startBucket + i * MINUTE;
      const real = rawBuckets[bucketTime];

      if (real) {
        slugs.forEach((s) => { if (real.data[s] !== undefined) lastKnown[s] = real.data[s]; });
      }

      // Only emit points once we have at least one known value
      if (Object.values(lastKnown).some((v) => v !== undefined)) {
        points.push({
          timestamp: bucketTime,
          date: format(new Date(bucketTime), "MMM d h:mm a"),
          ...Object.fromEntries(slugs.map((s) => [s, lastKnown[s]])),
        });
      }
    }

    return points;
  }, [historicalData, currentData]);

  const { yDomain, yTicks } = useMemo(() => {
    if (chartData.length === 0) return { yDomain: [900, 1300] as [number, number], yTicks: [900, 1000, 1100, 1200, 1300] };
    const slugs = currentData.map((c) => c.ceo_slug);
    let min = Infinity;
    let max = -Infinity;
    chartData.forEach((point) => {
      slugs.forEach((slug) => {
        const val = point[slug] as number | undefined;
        if (val !== undefined) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      });
    });
    if (!isFinite(min) || !isFinite(max)) return { yDomain: [900, 1300] as [number, number], yTicks: [900, 1000, 1100, 1200, 1300] };

    const padding = Math.max((max - min) * 0.15, 20);
    const domainMin = Math.floor((min - padding) / 50) * 50;
    const domainMax = Math.ceil((max + padding) / 50) * 50;
    const ticks: number[] = [];
    for (let v = domainMin; v <= domainMax; v += 50) ticks.push(v);
    return { yDomain: [domainMin, domainMax] as [number, number], yTicks: ticks };
  }, [chartData, currentData]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ color: string; name: string; value: number; dataKey: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
    return (
      <div className="bg-[#1a1a1a] rounded-2xl p-4 shadow-lg border border-[#2a2a2a]">
        <p className="text-[#666] text-xs mb-3 font-bold">{label}</p>
        <div className="space-y-2">
          {sortedPayload.map((entry) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: CEO_COLORS[entry.dataKey] || "#888" }}
                />
                <span className="text-sm font-bold text-[#ccc]">{entry.name}</span>
              </div>
              <span
                className="text-sm font-extrabold"
                style={{ color: "#fff" }}
              >
                {formatUsd(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div data-panel="chart" className="rounded-[20px] border border-white/10 relative overflow-hidden" style={{ boxShadow: "0 0 15px rgba(255,255,255,0.15), 0 0 45px rgba(255,255,255,0.1), 0 0 100px rgba(255,255,255,0.05)" }}>
      <GrassBackground />

      {(
        <div className="relative z-10 h-[600px] p-3" style={{ background: "rgba(0,0,0,0.45)" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 30, right: 180, left: 40, bottom: 10 }}>
              <CartesianGrid strokeDasharray="6 6" stroke="rgba(255,255,255,0.15)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.6)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={8}
                fontWeight={700}
                label={{ value: "Time", position: "insideBottom", offset: -5, fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                ticks={chartData.length >= 2 ? ([
                  chartData[0].date,
                  chartData[Math.floor(chartData.length / 5)].date,
                  chartData[Math.floor(2 * chartData.length / 5)].date,
                  chartData[Math.floor(3 * chartData.length / 5)].date,
                  chartData[Math.floor(4 * chartData.length / 5)].date,
                  chartData[chartData.length - 1].date,
                ] as string[]) : undefined}
              />
              <YAxis
                type="number"
                stroke="rgba(255,255,255,0.6)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatUsd(value)}
                dx={-5}
                fontWeight={700}
                domain={yDomain}
                ticks={yTicks}
                allowDataOverflow
                label={{ value: "Value USD", angle: -90, position: "insideLeft", offset: 15, fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              {currentData.map((ceo) => {
                const color = CEO_COLORS[ceo.ceo_slug] || "#888";
                return (
                  <Line
                    key={ceo.ceo_slug}
                    type="monotone"
                    dataKey={ceo.ceo_slug}
                    name={ceo.ceo_name}
                    stroke={color}
                    strokeWidth={5}
                    dot={false}
                    activeDot={{
                      r: 6,
                      fill: color,
                      stroke: "#000",
                      strokeWidth: 2,
                    }}
                    style={{
                      filter: `drop-shadow(0 0 6px ${color}80)`,
                    }}
                  />
                );
              })}
              <Customized
                component={(props: any) => {
                  const { xAxisMap, yAxisMap } = props;
                  const xAxis = xAxisMap && Object.values(xAxisMap)[0] as { scale: (v: unknown) => number } | undefined;
                  const yAxis = yAxisMap && Object.values(yAxisMap)[0] as { scale: (v: unknown) => number } | undefined;
                  if (!xAxis?.scale || !yAxis?.scale || chartData.length === 0) return null;
                  const lastPoint = chartData[chartData.length - 1];
                  const xVal = xAxis.scale(lastPoint.date);
                  const r = 36;
                  const minGap = r * 2 + 8;

                  // Build position list sorted by raw y (ascending = top of SVG)
                  const items = currentData
                    .map((ceo) => {
                      const val = lastPoint[ceo.ceo_slug] as number | undefined;
                      if (val === undefined || val === null) return null;
                      const rawY = yAxis.scale(val);
                      if (isNaN(rawY) || isNaN(xVal)) return null;
                      return { ceo, val, rawY, adjustedY: rawY };
                    })
                    .filter(Boolean) as { ceo: CeoEntry; val: number; rawY: number; adjustedY: number }[];

                  // Sort by rawY ascending (top of chart first) for de-clustering
                  items.sort((a, b) => a.rawY - b.rawY);

                  // Push apart overlapping bubbles (top to bottom)
                  for (let i = 1; i < items.length; i++) {
                    const prev = items[i - 1];
                    const curr = items[i];
                    const gap = curr.adjustedY - prev.adjustedY;
                    if (gap < minGap) {
                      const push = (minGap - gap) / 2;
                      prev.adjustedY -= push;
                      curr.adjustedY += push;
                    }
                  }

                  // Re-sort by value ascending so highest renders on top
                  items.sort((a, b) => a.val - b.val);

                  // If one is hovered, move it to end so it renders on top of all
                  if (hoveredSlug) {
                    const idx = items.findIndex((it) => it.ceo.ceo_slug === hoveredSlug);
                    if (idx >= 0) {
                      const [hovered] = items.splice(idx, 1);
                      items.push(hovered);
                    }
                  }

                  return (
                    <g>
                      {items.map((item) => {
                        const { ceo, val, rawY, adjustedY } = item;
                        const color = CEO_COLORS[ceo.ceo_slug] || "#888";
                        const gif = CEO_GIFS[ceo.ceo_slug];
                        const labelText = `$${Math.round(val).toLocaleString("en-US")}`;
                        const labelFontSize = 16;
                        const labelWidth = labelText.length * 9 + 14;
                        const labelHeight = 28;
                        const labelX = xVal + r + 6;
                        const labelY = adjustedY - labelHeight / 2;
                        const gifSize = r * 2;
                        const isHovered = hoveredSlug === ceo.ceo_slug;
                        const nameText = ceo.ceo_name;
                        const nameFontSize = 11;
                        const nameWidth = nameText.length * 6.5 + 12;
                        const nameHeight = 20;
                        const nameX = labelX + (labelWidth - nameWidth) / 2;
                        const nameY = labelY - nameHeight - 4;
                        return (
                          <g key={`endpoint-${ceo.ceo_slug}`} style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}>
                            {/* Connector line from actual data point to adjusted bubble */}
                            {Math.abs(adjustedY - rawY) > 2 && (
                              <line x1={xVal} y1={rawY} x2={xVal} y2={adjustedY} stroke={color} strokeWidth={2} strokeOpacity={0.4} />
                            )}
                            <g
                              style={{
                                cursor: "pointer",
                                transition: "transform 0.15s ease",
                                transformOrigin: `${xVal}px ${adjustedY}px`,
                                transform: isHovered ? "scale(1.15)" : "scale(1)",
                              }}
                              onMouseEnter={() => setHoveredSlug(ceo.ceo_slug)}
                              onMouseLeave={() => setHoveredSlug(null)}
                            >
                              <circle cx={xVal} cy={adjustedY} r={r} fill={color} />
                              {gif && (
                                <foreignObject
                                  x={xVal - gifSize / 2}
                                  y={adjustedY - gifSize / 2}
                                  width={gifSize}
                                  height={gifSize}
                                  style={{ pointerEvents: "none" }}
                                >
                                  <img
                                    src={gif}
                                    alt={ceo.ceo_name}
                                    style={{
                                      width: gifSize,
                                      height: gifSize,
                                      borderRadius: "50%",
                                      objectFit: "cover",
                                      imageRendering: "pixelated",
                                    }}
                                  />
                                </foreignObject>
                              )}
                              {/* CEO name label — shown on hover */}
                              {isHovered && (
                                <>
                                  <rect
                                    x={nameX}
                                    y={nameY}
                                    width={nameWidth}
                                    height={nameHeight}
                                    fill="rgba(0,0,0,0.85)"
                                    stroke={color}
                                    strokeWidth={1}
                                    rx={4}
                                  />
                                  <text
                                    x={nameX + nameWidth / 2}
                                    y={nameY + nameHeight / 2}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fill={color}
                                    fontSize={nameFontSize}
                                    fontWeight={700}
                                  >
                                    {nameText}
                                  </text>
                                </>
                              )}
                              <rect
                                x={labelX}
                                y={labelY}
                                width={labelWidth}
                                height={labelHeight}
                                fill={color}
                                rx={6}
                              />
                              <text
                                x={labelX + labelWidth / 2}
                                y={labelY + labelHeight / 2}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="white"
                                fontSize={labelFontSize}
                                fontWeight={800}
                              >
                                {labelText}
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </g>
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
