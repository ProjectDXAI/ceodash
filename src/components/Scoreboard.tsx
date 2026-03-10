"use client";

import { useState, useEffect } from "react";
import CeoPortfolio from "./CeoPortfolio";

const CEO_SLUGS = ["chatgpt", "claude", "gemini", "grok"] as const;

const CEO_AVATARS: Record<string, string> = {
  chatgpt: "/openai.png",
  claude: "/claude.png",
  gemini: "/gemini.png",
  grok: "/grok.png",
};

const CEO_NAMES: Record<string, string> = {
  chatgpt: "CashGPT",
  claude: "Claudius Capital",
  gemini: "Gem Street",
  grok: "Grokefeller",
};

const CEO_COLORS: Record<string, string> = {
  chatgpt: "#2ecc71",
  claude: "#e74c3c",
  gemini: "#3498db",
  grok: "#f39c12",
};

interface VaultEntry {
  managed_vault_id: number;
  agent_label: string;
  vault_address: string;
  latest_pnl_usd: number;
  total_intent_count: number;
  total_intent_success_count: number;
  total_intent_failure_count: number;
  total_tool_call_success_percentage: number;
  total_swap_count: number;
}

interface ScoreboardEntry {
  ceo_slug: string;
  ceo_name: string;
  provider: string;
  model: string;
  total_pnl_usd: number;
  total_value_usd: number;
  avg_pnl_percent: number;
  vaults: VaultEntry[];
}

function ProviderLogo({ slug }: { slug: string }) {
  const baseClass = "absolute w-[100px] h-[100px] opacity-[0.06] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none";
  switch (slug) {
    case "chatgpt":
      return (
        <svg className={baseClass} viewBox="0 0 16 16" fill="currentColor">
          <path d="M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455zm.742-1.577 1.758-1 1.762 1v2l-1.755 1-1.762-1z" />
        </svg>
      );
    case "claude":
      return (
        <svg className={baseClass} viewBox="0 0 1200 1200" fill="currentColor">
          <path d="M233.96 800.21 468.64 668.54l3.95-11.44-3.95-6.36h-11.44l-39.22-2.42-134.09-3.62-116.3-4.83-112.67-6.04-28.35-5.96L0 592.75l2.74-17.48 23.84-16.03 34.15 2.98 75.46 5.15 113.24 7.81 82.15 4.83 121.69 12.64h19.33l2.74-7.81-6.6-4.83-5.15-4.83L302.39 495.79 175.54 411.87l-66.44-48.32-35.92-24.48-18.12-22.95-7.81-50.09 32.62-35.92 43.81 2.98 11.19 2.98 44.38 34.15 94.79 73.5 123.79 91.17 18.12 15.06 7.25-5.15 1.21-3.63-8.89-13.53-67.11-121.69-71.92-123.79-31.98-51.3-8.45-30.76c-2.98-12.64-5.15-23.27-5.15-36.24l37.13-50.42 20.07-6.6 49.53 6.6 20.86 18.12 30.76 70.39 49.85 110.82 77.32 150.68 22.63 44.7 12.08 41.4 4.83 12.64h7.81v-7.25l6.36-84.88 11.76-104.21 11.44-134.09 3.95-37.77 18.68-45.26 37.13-24.48 28.99 13.85 23.84 34.15-3.39 22.07-14.57 92.13-27.78 144.32-18.12 96.84h10.64l12.08-11.96 48.89-64.66 82.15-102.68 36.24-40.75 42.28-45.02 27.14-21.42h51.3l37.77 56.13-16.91 58-52.83 67.42-43.81 56.78-62.82 84.56-39.22 67.65 3.63 5.39 9.36-.9 142.38-30.2 76.67-13.85 91.62-15.56 41.4 19.33 4.53 19.65-16.27 40.19-97.85 24.16-114.77 22.95-170.9 40.43-2.09 1.53 2.42 2.98 76.96 7.25 32.94 1.77 80.62 0 150.12 11.19 39.22 25.93 23.52 31.73-3.95 24.16-60.4 30.76-81.5-19.33-190.24-45.26-65.46-16.27-9.02 0v5.4l54.36 53.15 99.62 89.96 124.75 115.97 6.36 28.67-16.03 22.63-16.91-2.42-109.57-82.27-42.28-37.13-95.76-80.62-6.36 0v8.45l22.07 32.3 116.54 175.17 5.99 53.72-8.38 17.48-30.2 10.55-33.18-5.96-68.22-95.76-70.39-107.85-56.78-98.57-6.96 3.95-33.53 360.88-15.73 18.43-36.24 13.85-30.2-22.95-16.03-37.13 16.03-73.37 19.33-95.76 15.71-76.14 14.17-94.55 8.38-31.48-.6-2.09-6.89.9-71.25 97.85-108.44 146.5-85.77 91.84-20.5 8.16-35.71-18.43 3.37-32.94 19.93-29.21 118.64-151.28 71.61-93.56 46.23-54.04-.3-7.87h-2.69l-315.34 204.72-56.13 7.19-24.27-22.63 2.99-37.13 11.53-12.15 94.88-65.22z" />
        </svg>
      );
    case "gemini":
      return (
        <svg className={baseClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" />
        </svg>
      );
    case "grok":
      return (
        <svg className={baseClass} viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd">
          <path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815" />
        </svg>
      );
    default:
      return null;
  }
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? "+" : "-";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

export default function Scoreboard() {
  const [entries, setEntries] = useState<ScoreboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sbRes, vaultsRes, tpRes] = await Promise.all([
          fetch("/api/scoreboard"),
          fetch("/api/vaults"),
          fetch("/api/tool-performance"),
        ]);
        const sbJson = await sbRes.json();
        const vaultsJson = await vaultsRes.json();
        const tpJson = await tpRes.json();

        if (!sbJson.success || !vaultsJson.success) return;

        const tpBySlug: Record<string, { vaults: VaultEntry[] }> = {};
        if (tpJson.success && Array.isArray(tpJson.data)) {
          for (const item of tpJson.data) {
            const slug = item.ceo_slug as string;
            if (!slug) continue;
            tpBySlug[slug] = { vaults: Array.isArray(item.vaults) ? item.vaults : [] };
          }
        }

        const nameMap: Record<string, { ceo_name: string; provider: string; model: string }> = {};
        for (const entry of sbJson.data || []) {
          nameMap[entry.ceo_slug] = {
            ceo_name: entry.ceo_name,
            provider: entry.provider,
            model: entry.model,
          };
        }

        const vaultsRaw = vaultsJson.data as Record<string, {
          ceo_slug: string;
          total_pnl_usd: number;
          total_value_usd: number;
          avg_pnl_percent: number;
        }>;
        const vaultsBySlug: Record<string, (typeof vaultsRaw)[string]> = {};
        for (const [k, v] of Object.entries(vaultsRaw)) {
          if (v?.ceo_slug) vaultsBySlug[v.ceo_slug] = v;
          if (v && CEO_SLUGS.includes(k as (typeof CEO_SLUGS)[number])) vaultsBySlug[k] = v;
        }

        const merged: ScoreboardEntry[] = CEO_SLUGS.filter((slug) => vaultsBySlug[slug] != null).map((slug) => {
          const v = vaultsBySlug[slug];
          const meta = nameMap[slug];
          return {
            ceo_slug: slug,
            ceo_name: meta?.ceo_name ?? CEO_NAMES[slug] ?? slug,
            provider: meta?.provider ?? "",
            model: meta?.model ?? "",
            total_pnl_usd: v.total_pnl_usd,
            total_value_usd: v.total_value_usd,
            avg_pnl_percent: v.avg_pnl_percent,
            vaults: tpBySlug[slug]?.vaults || [],
          };
        });

        setEntries(merged.sort((a, b) => b.avg_pnl_percent - a.avg_pnl_percent));
      } catch (e) {
        console.error("Scoreboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && entries.length === 0) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CEO_SLUGS.map((slug) => (
          <div
            key={slug}
            className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4 relative overflow-hidden flex flex-col items-center gap-3 animate-pulse"
          >
            <div className="w-16 h-16 rounded-full bg-[#2a2a2a] shrink-0" />
            <div className="w-full h-8 bg-[#2a2a2a] rounded-lg" />
            <div className="h-14 bg-[#2a2a2a] rounded-xl w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {entries.map((entry) => {
          const color = CEO_COLORS[entry.ceo_slug] || "#888";
          return (
            <div
              key={entry.ceo_slug}
              className="rounded-2xl bg-[#141414] px-3 py-3 relative overflow-hidden flex flex-col"
              style={{ border: `1px solid ${color}33` }}
            >
              <div className="flex items-center gap-3">
                <ProviderLogo slug={entry.ceo_slug} />
                <img
                  src={CEO_AVATARS[entry.ceo_slug]}
                  alt={entry.ceo_name}
                  className="w-16 h-16 object-contain shrink-0 relative z-10"
                  style={{ imageRendering: "pixelated" }}
                />
                <div className="flex-1 min-w-0 relative z-10">
                  <p className="font-bold text-sm leading-tight truncate" style={{ color }}>{entry.ceo_name}</p>
                  <p className="text-[11px] text-[#999] font-medium leading-tight mt-0.5 truncate">{entry.model || entry.provider || entry.ceo_slug}</p>
                  <div className="mt-1.5">
                    <p className={`text-2xl font-extrabold leading-none ${entry.avg_pnl_percent >= 0 ? "text-[#81c784]" : "text-[#e57373]"}`}>
                      {formatPercent(entry.avg_pnl_percent)}
                    </p>
                    <p className="text-xs text-white font-bold mt-0.5">{formatUsd(entry.total_pnl_usd)}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setExpandedSlug(expandedSlug === entry.ceo_slug ? null : entry.ceo_slug)}
                className="mt-2 w-full relative z-10 py-1.5 rounded-lg border border-[#2a2a2a] hover:border-[#444] hover:bg-[#1a1a1a] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ borderColor: expandedSlug === entry.ceo_slug ? `${color}55` : undefined }}
                aria-label={expandedSlug === entry.ceo_slug ? "Collapse portfolio" : "Expand portfolio"}
              >
                <span className="text-[10px] text-[#666] font-bold uppercase tracking-wider">
                  {expandedSlug === entry.ceo_slug ? "Hide" : "Team"}
                </span>
                <svg className={`w-3.5 h-3.5 transition-transform ${expandedSlug === entry.ceo_slug ? "rotate-180" : ""}`} style={{ color }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
      {expandedSlug && (() => {
        const entry = entries.find(e => e.ceo_slug === expandedSlug);
        if (!entry) return null;
        return (
          <CeoPortfolio
            ceoSlug={entry.ceo_slug}
            ceoName={entry.ceo_name}
            color={CEO_COLORS[entry.ceo_slug] || "#888"}
            vaults={entry.vaults}
            onClose={() => setExpandedSlug(null)}
          />
        );
      })()}
    </>
  );
}
