"use client";

import { useEffect, useState, useMemo } from "react";

interface TokenMarketData {
  priceUsd: string;
  holderCount: number;
  priceEth: string;
  "15m": TimeframeData;
  "1h": TimeframeData;
  "4h": TimeframeData;
  "1d": TimeframeData;
  all: TimeframeData;
}

interface TimeframeData {
  priceChangePercent: number;
  volumeEth: string;
  volumeUsd: string;
  buyCount: number;
  sellCount: number;
  sparkline: string[];
}

interface Token {
  tokenAddress: string;
  symbol: string;
  name: string;
  type: string;
  marketData: TokenMarketData;
  image: string;
  description: string;
  funFacts: string[];
  reaped: boolean;
}

interface MarketData {
  cycle_id: number;
  captured_at: string;
  overview: {
    eth_price: {
      priceUsd: number;
    };
    tracked_token_count: number;
    top_tokens_by_price_usd: Token[];
    launch_schedule: unknown[];
    reap_schedule: unknown[];
  };
}

const TOKEN_COLORS: string[] = [
  "#f39c12", "#e74c3c", "#2ecc71", "#3498db",
  "#9b59b6", "#1abc9c", "#e67e22", "#ec407a",
  "#26c6da", "#ff7043",
];

if (typeof window !== "undefined") {
  const preloaded = new Set<string>();
  function preloadImg(src: string) {
    if (preloaded.has(src)) return;
    preloaded.add(src);
    const img = new Image();
    img.src = src;
  }
  (window as unknown as Record<string, unknown>).__preloadTokenImg = preloadImg;
}

function formatPrice(n: number): string {
  if (n === 0) return "$0";
  if (n < 0.000001) return `$${n.toExponential(2)}`;
  if (n < 0.01) return `$${n.toFixed(6)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function formatMarketCap(priceUsd: number): string {
  const mcap = priceUsd * 1_000_000_000;
  if (mcap >= 1_000_000_000) return `$${(mcap / 1_000_000_000).toFixed(1)}B`;
  if (mcap >= 1_000_000) return `$${(mcap / 1_000_000).toFixed(1)}M`;
  if (mcap >= 1_000) return `$${(mcap / 1_000).toFixed(0)}K`;
  return `$${mcap.toFixed(0)}`;
}

export default function MarketOverview() {
  const [market, setMarket] = useState<MarketData | null>(null);

  useEffect(() => {
    async function fetchMarket() {
      try {
        const res = await fetch("/api/market");
        const json = await res.json();
        if (json.success && json.data) setMarket(json.data);
      } catch (e) {
        console.error("Failed to fetch market:", e);
      }
    }
    fetchMarket();
    const interval = setInterval(fetchMarket, 60000);
    return () => clearInterval(interval);
  }, []);

  const tokens = useMemo(() => {
    if (!market) return [];
    return market.overview.top_tokens_by_price_usd.filter(
      (t) => !t.reaped && parseFloat(t.marketData.priceUsd) > 0
    );
  }, [market]);

  useEffect(() => {
    const preload = (window as unknown as Record<string, (src: string) => void>).__preloadTokenImg;
    if (preload) tokens.forEach((t) => preload(t.image));
  }, [tokens]);

  if (!market || tokens.length === 0) return null;

  const { overview } = market;

  return (
    <div data-panel="market" className="panel-ethereal panel-ethereal-delay-2 rounded-[20px] border border-[#2a2a2a] overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#111] relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">Market</span>
          <span className="text-[10px] text-[#555]">{overview.tracked_token_count} tokens</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-mono text-[#2a3a4a] eva-ticker-dot" style={{ animationDelay: "-1.2s" }}>FEED:LIVE</span>
            <div className="w-6 h-[3px] bg-[#1a1a1a] rounded overflow-hidden">
              <div className="eva-meter-bar bg-[#9b59b6]/40" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#555]">ETH</span>
            <span className="text-[10px] text-white font-bold">
              ${overview.eth_price.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Token cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 p-3">
        {tokens.slice(0, 7).map((token, i) => {
          const price = parseFloat(token.marketData.priceUsd);
          const change = token.marketData["1d"].priceChangePercent;
          const color = TOKEN_COLORS[i % TOKEN_COLORS.length];
          return (
            <a
              key={token.symbol}
              href={`https://www.terminal.markets/?token=${token.tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-3 hover:border-[#444] transition-colors block"
              style={{ borderLeftColor: color, borderLeftWidth: 3 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <img
                  src={token.image}
                  alt={token.symbol}
                  className="w-8 h-8 rounded-full"
                  width={32}
                  height={32}
                />
                <span className="text-sm font-bold text-white">{token.symbol}</span>
              </div>
              <div className="text-sm text-white font-bold">{formatMarketCap(price)}</div>
              <div className="text-[10px] text-[#666] mt-0.5 font-mono">{formatPrice(price)}</div>
              <div
                className={`text-xs font-bold mt-1 ${
                  change >= 0 ? "text-[#2ecc71]" : "text-[#e74c3c]"
                }`}
              >
                {change >= 0 ? "+" : ""}
                {change.toFixed(2)}%
              </div>
            </a>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-1.5 bg-[#111] border-t border-[#1a1a1a] flex items-center gap-2 relative z-10">
        <div className="flex -space-x-1">
          {tokens.slice(0, 6).map((t, i) => (
            <img key={t.symbol} src={t.image} alt="" className="w-4 h-4 rounded-full border border-[#0a0a0a]" style={{ zIndex: 6 - i }} />
          ))}
        </div>
        <span className="text-[10px] text-[#333]">{tokens.length} active</span>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-[#333]">VOL</span>
            <div className="w-6 h-[3px] bg-[#1a1a1a] rounded overflow-hidden">
              <div className="eva-meter-bar bg-[#9b59b6]/40" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-[#333]">MKT</span>
            <div className="w-6 h-[3px] bg-[#1a1a1a] rounded overflow-hidden">
              <div className="eva-meter-bar-2 bg-[#3498db]/40" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="led-2 w-1.5 h-1.5 rounded-full bg-[#2ecc71]" style={{ boxShadow: "0 0 4px #2ecc71" }} />
            <span className="led-3 w-1.5 h-1.5 rounded-full bg-[#3498db]" style={{ boxShadow: "0 0 4px #3498db" }} />
            <span className="led-1 w-1.5 h-1.5 rounded-full bg-[#9b59b6]" style={{ boxShadow: "0 0 4px #9b59b6" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
