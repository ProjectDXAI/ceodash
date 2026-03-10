"use client";

import { useState, useEffect, useMemo } from "react";

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

interface CeoPortfolioProps {
  ceoSlug: string;
  ceoName: string;
  color: string;
  vaults: VaultEntry[];
  onClose: () => void;
}

interface AggregatedPosition {
  tokenAddress: string;
  tokenSymbol: string;
  tokenImage: string | null;
  totalValueUsd: number;
}

const CEO_GIFS: Record<string, string> = {
  chatgpt: "/openai.gif",
  claude: "/anthropic.gif",
  gemini: "/gemini.gif",
  grok: "/xai.gif",
};

// Agent nicknames themed to their CEO's brand
const AGENT_NAMES: Record<string, string> = {
  // CashGPT — Wall Street bro finance names
  "chatgpt-agent-1": "Chadsworth",
  "chatgpt-agent-2": "Buckley",
  "chatgpt-agent-3": "Pennington",
  "chatgpt-agent-4": "Sterling",
  "chatgpt-agent-5": "Goldman",
  // Claudius Capital — Roman empire names
  "claude-agent-1": "Maximus",
  "claude-agent-2": "Brutus",
  "claude-agent-3": "Aurelius",
  "claude-agent-4": "Cassius",
  "claude-agent-5": "Nero",
  // Gem Street — jewel/mineral names
  "gemini-agent-1": "Onyx",
  "gemini-agent-2": "Topaz",
  "gemini-agent-3": "Quartz",
  "gemini-agent-4": "Opal",
  "gemini-agent-5": "Jasper",
  // Grokefeller — old money tycoon names
  "grok-agent-1": "Rockwell",
  "grok-agent-2": "Vanderbilt",
  "grok-agent-3": "Carnegie",
  "grok-agent-4": "Astor",
  "grok-agent-5": "Morgan",
};

// NFT ID per vault address → sprite URL
const AGENT_NFT_IDS: Record<string, number> = {
  "0xd2274fdbfa9c47b0729996c296e1421f12a240c9": 10,
  "0x26e3ccb2ab0082894d68889fb5bb975dad3c936d": 9,
  "0x2348e9962772bd352a92e9507d1113484c750eff": 14,
  "0x5b378cc54b70aca1458679eba27fdd7947f7c5d3": 36,
  "0x57eaedafa040add196f195a344fae58597f3b365": 41,
  "0x0bb22d2c518b38cc3434096764c35631226b37fd": 25,
  "0x4d8ece90bcc18b98bc8aad7cbf1528ce668c5ecf": 8,
  "0x12f1801a0d5756ca455fe37d3a0490adac27eb6a": 30,
  "0xf9dfd4b4b4d203f825ca70dc621dc39eda5ea52c": 39,
  "0x9caa55d583e0acd5ea3a5a97aff91330bf5727c2": 26,
  "0x666baee66c981a07d1bf52641afed936b2b06be4": 20,
  "0x9d96a8b81fd6ddada13f65189d55ee44a4148161": 6,
  "0x784b0cce05510ea3c525382a9f8a8f7f216f0a3a": 13,
  "0x274abcb8bcb2b4dc3ef7a3f23f219cb211562401": 45,
  "0xd58685780150d6783058bb3a5a2439050de6d68b": 43,
  "0x6069e929c87374e030359c49c2dbd771e58baf41": 7,
  "0xb897d458371b2efda424a8b8c876a19e3d6f18cb": 33,
  "0xa6810600bb9b93096aeecc0f35e2a968776b9f8f": 19,
  "0xbab6260d444fd63eedae791f00fddc0d0cd19b66": 29,
  "0xa08c46c5aca658c5069ed824560c6576a1279abf": 16797,
};

function getSpriteSheetUrl(vaultAddress: string): string | null {
  const nftId = AGENT_NFT_IDS[vaultAddress.toLowerCase()];
  if (!nftId) return null;
  return `/team_rotations/${nftId}.png`;
}

// 3x3 sprite sheet rotation animation component
// Frames cycle clockwise: front → front-right → right → back-right → back → back-left → left → front-left
const ROTATION_FRAMES: [number, number][] = [
  [1, 0], // front
  [2, 0], // front-right
  [2, 1], // right
  [2, 2], // back-right
  [1, 2], // back
  [0, 2], // back-left
  [0, 1], // left
  [0, 0], // front-left
];

function AnimatedSprite({ src, size = 36 }: { src: string; size?: number }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % ROTATION_FRAMES.length);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const [col, row] = ROTATION_FRAMES[frame];

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${src})`,
        backgroundSize: "300% 300%",
        backgroundPosition: `${col * 50}% ${row * 50}%`,
        imageRendering: "pixelated",
        borderRadius: "50%",
        flexShrink: 0,
      }}
    />
  );
}

function getVaultUrl(vaultAddress: string): string {
  return `https://www.terminal.markets/?address=${vaultAddress}`;
}

function getTokenUrl(tokenAddress: string): string {
  return `https://www.terminal.markets/?token=${tokenAddress}`;
}

function formatUsd(value: number): string {
  if (isNaN(value)) return "$0.00";
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CeoPortfolio({
  ceoSlug,
  ceoName,
  color,
  vaults,
  onClose,
}: CeoPortfolioProps) {
  const [positions, setPositions] = useState<AggregatedPosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [positionsError, setPositionsError] = useState(false);

  useEffect(() => {
    async function fetchPositions() {
      if (vaults.length === 0) {
        setPositionsLoading(false);
        return;
      }

      const addresses = vaults.map((v) => v.vault_address).join(",");

      try {
        const [posRes, marketRes] = await Promise.all([
          fetch(`/api/positions?addresses=${addresses}`),
          fetch("/api/market"),
        ]);
        const posJson = await posRes.json();
        const marketJson = await marketRes.json();

        const tokenImageMap: Record<string, string> = {};
        if (marketJson.success && marketJson.data?.overview?.top_tokens_by_price_usd) {
          for (const t of marketJson.data.overview.top_tokens_by_price_usd) {
            tokenImageMap[t.tokenAddress.toLowerCase()] = t.image;
          }
        }

        if (!posJson.success) {
          setPositionsError(true);
          setPositionsLoading(false);
          return;
        }

        const tokenMap: Record<
          string,
          { tokenSymbol: string; totalValueUsd: number; tokenImage: string | null }
        > = {};

        for (const vaultData of Object.values(posJson.data)) {
          if (!vaultData || typeof vaultData !== "object") continue;
          const vault = vaultData as Record<string, unknown>;

          const positionsArray = Array.isArray(vault.positions) ? vault.positions : [];
          const nonEthPositionsUsd = positionsArray.reduce((sum, pos) => {
            const valUsd = parseFloat(String((pos as Record<string, unknown>).currentValueUsd || "0"));
            return sum + (isNaN(valUsd) ? 0 : valUsd);
          }, 0);

          const ethBalanceWei = vault.ethBalance as string | undefined;
          if (ethBalanceWei && parseFloat(ethBalanceWei) > 0) {
            const vaultTotalUsd = parseFloat(String(vault.overallValueUsd || "0"));
            const ethUsd = Math.max(0, vaultTotalUsd - nonEthPositionsUsd);
            if (ethUsd > 0) {
              if (!tokenMap["eth"]) {
                tokenMap["eth"] = { tokenSymbol: "ETH", totalValueUsd: 0, tokenImage: null };
              }
              tokenMap["eth"].totalValueUsd += ethUsd;
            }
          }

          for (const pos of positionsArray as Array<Record<string, unknown>>) {
            const addr = pos.tokenAddress as string;
            if (!addr) continue;
            const key = addr.toLowerCase();
            const valUsd = parseFloat(String(pos.currentValueUsd || "0"));
            if (!tokenMap[key]) {
              tokenMap[key] = {
                tokenSymbol: (pos.tokenSymbol as string) || key.slice(0, 6),
                totalValueUsd: 0,
                tokenImage: tokenImageMap[key] || null,
              };
            }
            tokenMap[key].totalValueUsd += valUsd;
          }
        }

        const aggregated: AggregatedPosition[] = Object.entries(tokenMap)
          .map(([tokenAddress, data]) => ({
            tokenAddress,
            tokenSymbol: data.tokenSymbol,
            tokenImage: data.tokenImage,
            totalValueUsd: data.totalValueUsd,
          }))
          .filter((p) => p.totalValueUsd > 0.01)
          .sort((a, b) => b.totalValueUsd - a.totalValueUsd);

        setPositions(aggregated);
      } catch (e) {
        console.error("Failed to fetch positions:", e);
        setPositionsError(true);
      } finally {
        setPositionsLoading(false);
      }
    }

    fetchPositions();
  }, [vaults]);

  const stats = useMemo(() => {
    const teamPnl = vaults.reduce((sum, v) => sum + (v.latest_pnl_usd || 0), 0);
    const totalIntents = vaults.reduce((sum, v) => sum + (v.total_intent_count || 0), 0);

    const weightedAccuracy =
      totalIntents > 0
        ? vaults.reduce(
            (sum, v) => sum + (v.total_tool_call_success_percentage || 0) * (v.total_intent_count || 0),
            0
          ) / totalIntents
        : 0;

    return { teamPnl, totalIntents, avgAccuracy: weightedAccuracy };
  }, [vaults]);

  return (
    <div
      className="bg-[#0a0a0a] rounded-2xl mt-4 p-4 overflow-hidden"
      style={{ border: `1px solid ${color}33` }}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {CEO_GIFS[ceoSlug] && (
            <img
              src={CEO_GIFS[ceoSlug]}
              alt={ceoName}
              className="w-10 h-10 rounded-full object-cover"
              style={{ imageRendering: "pixelated" }}
            />
          )}
          <h3 className="text-lg font-bold" style={{ color }}>
            {ceoName}
          </h3>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-[#666] text-xs">Team P&L</p>
            <p className={`font-bold ${stats.teamPnl >= 0 ? "text-[#81c784]" : "text-[#e57373]"}`}>
              {formatUsd(stats.teamPnl)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[#666] text-xs">Total Intents</p>
            <p className="font-bold text-white">{stats.totalIntents.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[#666] text-xs">Avg Accuracy</p>
            <p className="font-bold text-white">{stats.avgAccuracy.toFixed(1)}%</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-[#666] hover:text-white transition-colors text-xl leading-none px-2 cursor-pointer"
          title="Close"
        >
          &times;
        </button>
      </div>

      {/* Portfolio Holdings */}
      <div className="mb-4">
        <p className="text-xs text-[#666] font-bold uppercase tracking-wider mb-2">
          Portfolio Holdings
        </p>

        {positionsLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-32 h-16 bg-[#141414] rounded-xl animate-pulse border border-[#2a2a2a]"
              />
            ))}
          </div>
        ) : positionsError || positions.length === 0 ? (
          <p className="text-sm text-[#555]">No holdings data</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {positions.map((pos) => {
              const isToken = pos.tokenAddress !== "eth" && pos.tokenAddress.startsWith("0x");
              const inner = (
                <div className={`flex-shrink-0 bg-[#141414] rounded-xl p-3 border border-[#2a2a2a] min-w-[120px] ${isToken ? "hover:border-[#444] transition-colors cursor-pointer" : ""}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {pos.tokenImage ? (
                      <img src={pos.tokenImage} alt={pos.tokenSymbol} className="w-6 h-6 rounded-full" />
                    ) : pos.tokenSymbol === "ETH" ? (
                      <div className="w-6 h-6 rounded-full bg-[#627eea] flex items-center justify-center">
                        <svg viewBox="0 0 256 417" className="w-3.5 h-3.5" fill="white">
                          <path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" opacity=".6" />
                          <path d="M127.962 0L0 212.32l127.962 75.639V154.158z" />
                          <path d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" opacity=".6" />
                          <path d="M127.962 416.905v-104.72L0 236.585z" />
                        </svg>
                      </div>
                    ) : (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: `${color}66` }}
                      >
                        {pos.tokenSymbol.slice(0, 2)}
                      </div>
                    )}
                    <span className="text-xs font-bold text-[#ccc]">{pos.tokenSymbol}</span>
                  </div>
                  <p className="text-sm font-bold text-white">
                    ${pos.totalValueUsd.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              );

              if (isToken) {
                return (
                  <a
                    key={pos.tokenAddress}
                    href={getTokenUrl(pos.tokenAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    {inner}
                  </a>
                );
              }
              return <div key={pos.tokenAddress} className="flex-shrink-0">{inner}</div>;
            })}
          </div>
        )}
      </div>

      {/* Agent Team Grid */}
      <div>
        <p className="text-xs text-[#666] font-bold uppercase tracking-wider mb-2">
          Agent Team
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {vaults.map((vault, i) => {
            const apiLabel = vault.agent_label || `${ceoSlug}-agent-${i + 1}`;
            const nickname = AGENT_NAMES[apiLabel] || `Agent ${i + 1}`;
            const spriteSheet = getSpriteSheetUrl(vault.vault_address);
            const pnl = vault.latest_pnl_usd || 0;
            const accuracy = vault.total_tool_call_success_percentage || 0;
            const swaps = vault.total_swap_count || 0;
            const intents = vault.total_intent_count || 0;

            return (
              <a
                key={vault.managed_vault_id || i}
                href={getVaultUrl(vault.vault_address)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#141414] rounded-xl p-3 border border-[#2a2a2a] hover:border-[#444] transition-colors block"
              >
                <div className="flex items-center gap-3 mb-2">
                  {spriteSheet ? (
                    <AnimatedSprite src={spriteSheet} size={72} />
                  ) : (
                    <div
                      className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {nickname.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#ccc] truncate">{nickname}</p>
                    <p className="text-[9px] text-[#444] font-mono truncate">
                      {vault.vault_address.slice(0, 6)}...{vault.vault_address.slice(-4)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#666]">P&L</span>
                    <span className={`font-bold ${pnl >= 0 ? "text-[#81c784]" : "text-[#e57373]"}`}>
                      {formatUsd(pnl)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666]">Success</span>
                    <span className="text-white font-bold">{accuracy.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666]">Swaps</span>
                    <span className="text-white font-bold">{swaps.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666]">Intents</span>
                    <span className="text-white font-bold">{intents.toLocaleString()}</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
