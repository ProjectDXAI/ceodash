"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

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

interface CeoTotal {
  ceo_slug: string;
  ceo_name: string;
  latest_cycle_id: number;
  latest_total_pnl_usd: number;
  managed_vault_count: number;
  total_intent_count: number;
  total_intent_success_count: number;
  total_intent_failure_count: number;
  total_swap_count: number;
  total_tool_call_success_percentage: number;
  vaults: VaultEntry[];
}

const CEO_COLORS: Record<string, string> = {
  chatgpt: "#2ecc71",
  claude: "#e74c3c",
  gemini: "#3498db",
  grok: "#f39c12",
};

const MODEL_NAMES: Record<string, string> = {
  chatgpt: "gpt-5.4",
  claude: "claude-sonnet-4-6",
  gemini: "gemini-3.1-pro-preview",
  grok: "grok-4-1-fast-reasoning",
};

const CEO_LOGOS: Record<string, { viewBox: string; path: string }> = {
  chatgpt: {
    viewBox: "0 0 16 16",
    path: "M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455zm.742-1.577 1.758-1 1.762 1v2l-1.755 1-1.762-1z",
  },
  claude: {
    viewBox: "0 0 1200 1200",
    path: "M233.96 800.21 468.64 668.54l3.95-11.44-3.95-6.36h-11.44l-39.22-2.42-134.09-3.62-116.3-4.83-112.67-6.04-28.35-5.96L0 592.75l2.74-17.48 23.84-16.03 34.15 2.98 75.46 5.15 113.24 7.81 82.15 4.83 121.69 12.64h19.33l2.74-7.81-6.6-4.83-5.15-4.83L302.39 495.79 175.54 411.87l-66.44-48.32-35.92-24.48-18.12-22.95-7.81-50.09 32.62-35.92 43.81 2.98 11.19 2.98 44.38 34.15 94.79 73.5 123.79 91.17 18.12 15.06 7.25-5.15 1.21-3.63-8.89-13.53-67.11-121.69-71.92-123.79-31.98-51.3-8.45-30.76c-2.98-12.64-5.15-23.27-5.15-36.24l37.13-50.42 20.07-6.6 49.53 6.6 20.86 18.12 30.76 70.39 49.85 110.82 77.32 150.68 22.63 44.7 12.08 41.4 4.83 12.64h7.81v-7.25l6.36-84.88 11.76-104.21 11.44-134.09 3.95-37.77 18.68-45.26 37.13-24.48 28.99 13.85 23.84 34.15-3.39 22.07-14.57 92.13-27.78 144.32-18.12 96.84h10.64l12.08-11.96 48.89-64.66 82.15-102.68 36.24-40.75 42.28-45.02 27.14-21.42h51.3l37.77 56.13-16.91 58-52.83 67.42-43.81 56.78-62.82 84.56-39.22 67.65 3.63 5.39 9.36-.9 142.38-30.2 76.67-13.85 91.62-15.56 41.4 19.33 4.53 19.65-16.27 40.19-97.85 24.16-114.77 22.95-170.9 40.43-2.09 1.53 2.42 2.98 76.96 7.25 32.94 1.77 80.62 0 150.12 11.19 39.22 25.93 23.52 31.73-3.95 24.16-60.4 30.76-81.5-19.33-190.24-45.26-65.46-16.27-9.02 0v5.4l54.36 53.15 99.62 89.96 124.75 115.97 6.36 28.67-16.03 22.63-16.91-2.42-109.57-82.27-42.28-37.13-95.76-80.62-6.36 0v8.45l22.07 32.3 116.54 175.17 5.99 53.72-8.38 17.48-30.2 10.55-33.18-5.96-68.22-95.76-70.39-107.85-56.78-98.57-6.96 3.95-33.53 360.88-15.73 18.43-36.24 13.85-30.2-22.95-16.03-37.13 16.03-73.37 19.33-95.76 15.71-76.14 14.17-94.55 8.38-31.48-.6-2.09-6.89.9-71.25 97.85-108.44 146.5-85.77 91.84-20.5 8.16-35.71-18.43 3.37-32.94 19.93-29.21 118.64-151.28 71.61-93.56 46.23-54.04-.3-7.87h-2.69l-315.34 204.72-56.13 7.19-24.27-22.63 2.99-37.13 11.53-12.15 94.88-65.22z",
  },
  gemini: {
    viewBox: "0 0 24 24",
    path: "M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81",
  },
  grok: {
    viewBox: "0 0 24 24",
    path: "M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815",
  },
};

function LogoIcon({ slug, size = 14 }: { slug: string; size?: number }) {
  const logo = CEO_LOGOS[slug];
  if (!logo) return null;
  return (
    <svg width={size} height={size} viewBox={logo.viewBox} fill="currentColor">
      <path d={logo.path} />
    </svg>
  );
}

function CustomBarShape({ x, y, width, height, ceo_slug, fill }: {
  x: number; y: number; width: number; height: number; ceo_slug: string; fill: string;
}) {
  const logo = CEO_LOGOS[ceo_slug];
  const iconSize = Math.min(width * 0.55, height * 0.45, 56);
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.85} rx={6} ry={6} />
      {logo && height > 20 && (
        <svg
          x={x + (width - iconSize) / 2}
          y={y + (height - iconSize) / 2}
          width={iconSize}
          height={iconSize}
          viewBox={logo.viewBox}
          opacity={0.12}
        >
          <path d={logo.path} fill="white" />
        </svg>
      )}
    </g>
  );
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CeoTotal & { fillColor: string } }>;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  const color = CEO_COLORS[d.ceo_slug] || "#888";
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-4 shadow-lg border border-[#2a2a2a] min-w-[200px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-bold text-white">{d.ceo_name}</span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-[#888]">Success Rate</span>
          <span className="font-bold" style={{ color }}>{d.total_tool_call_success_percentage.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#888]">Total Intents</span>
          <span className="font-bold text-white">{d.total_intent_count}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#888]">Successful</span>
          <span className="font-bold text-[#81c784]">{d.total_intent_success_count}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#888]">Failed</span>
          <span className="font-bold text-[#e57373]">{d.total_intent_failure_count}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#888]">Total Swaps</span>
          <span className="font-bold text-white">{d.total_swap_count}</span>
        </div>
      </div>
    </div>
  );
};

export default function ToolPerformance() {
  const [data, setData] = useState<CeoTotal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/tool-performance");
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        }
      } catch (e) {
        console.error("Failed to fetch tool performance data:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => b.total_tool_call_success_percentage - a.total_tool_call_success_percentage)
      .map((d) => ({
        ...d,
        fillColor: CEO_COLORS[d.ceo_slug] || "#888",
      }));
  }, [data]);

  if (loading || data.length === 0) return null;

  return (
    <div data-panel="tool-perf" className="panel-ethereal panel-ethereal-delay-3 rounded-[20px] border border-[#2a2a2a] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-[#111] relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">Tool Call Accuracy</span>
          <span className="text-[10px] text-[#555]">{data.reduce((a, c) => a + c.total_intent_count, 0)} intents</span>
          <span className="text-[10px] text-[#444] italic">— % correct tool call formatting and values</span>
        </div>
      </div>

      <div className="flex-1 p-3">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 24, right: 10, left: 0, bottom: 5 }}
              barCategoryGap="10%"
              barGap={2}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="ceo_name"
                stroke="rgba(255,255,255,0.4)"
                fontSize={12}
                fontWeight={700}
                tickLine={false}
                axisLine={false}
                tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
                  const slug = data.find((d) => d.ceo_name === payload.value)?.ceo_slug || "";
                  const color = CEO_COLORS[slug] || "#888";
                  return (
                    <g transform={`translate(${x},${y + 12})`}>
                      <text textAnchor="middle" fill={color} fontSize={12} fontWeight={700}>
                        {payload.value}
                      </text>
                    </g>
                  );
                }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                stroke="rgba(255,255,255,0.4)"
                fontSize={11}
                fontWeight={700}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                dx={-5}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar
                dataKey="total_tool_call_success_percentage"
                shape={(props: unknown) => {
                  const entry = props as { x: number; y: number; width: number; height: number; ceo_slug: string; fillColor: string };
                  return (
                    <CustomBarShape
                      x={entry.x}
                      y={entry.y}
                      width={entry.width}
                      height={entry.height}
                      ceo_slug={entry.ceo_slug}
                      fill={entry.fillColor}
                    />
                  );
                }}
                label={({ x, y, width, value }: { x: number; y: number; width: number; value: number }) => (
                  <text
                    x={x + width / 2}
                    y={y - 8}
                    textAnchor="middle"
                    fill="white"
                    fontSize={13}
                    fontWeight={800}
                  >
                    {value.toFixed(1)}%
                  </text>
                )}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.ceo_slug} fill={entry.fillColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-3">
          {chartData.map((ceo) => {
            const color = CEO_COLORS[ceo.ceo_slug] || "#888";
            const modelName = MODEL_NAMES[ceo.ceo_slug] || ceo.ceo_slug;
            const logo = CEO_LOGOS[ceo.ceo_slug];
            return (
              <div key={ceo.ceo_slug} className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4 relative overflow-hidden">
                {logo && (
                  <svg
                    className="absolute w-[100px] h-[100px] opacity-[0.12] -left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    viewBox={logo.viewBox}
                    fill="currentColor"
                  >
                    <path d={logo.path} />
                  </svg>
                )}
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ color }}><LogoIcon slug={ceo.ceo_slug} size={18} /></span>
                    <span className="text-sm font-bold" style={{ color }}>{modelName}</span>
                  </div>
                  <div className="liquid-glass rounded-xl px-3 py-2.5">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center">
                        <p className="text-[#666] text-xs">Intents</p>
                        <p className="font-bold text-white text-lg">{ceo.total_intent_count}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[#666] text-xs">Swaps</p>
                        <p className="font-bold text-white text-lg">{ceo.total_swap_count}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[#666] text-xs">Pass</p>
                        <p className="font-bold text-[#81c784] text-lg">{ceo.total_intent_success_count}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[#666] text-xs">Fail</p>
                        <p className="font-bold text-[#e57373] text-lg">{ceo.total_intent_failure_count}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
