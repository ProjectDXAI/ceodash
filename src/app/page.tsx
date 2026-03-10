"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import LeaderboardChart, {
  CeoEntry,
  PnlSnapshot,
} from "@/components/LeaderboardChart";
import MiiFloor from "@/components/MiiFloor";
import ChatBox from "@/components/ChatBox";
import Scoreboard from "@/components/Scoreboard";
import MarketOverview from "@/components/MarketOverview";
import ActivityFeed from "@/components/ActivityFeed";
import ToolPerformance from "@/components/ToolPerformance";
import PatchCables from "@/components/PatchCables";

const STORAGE_KEY = "ceo_bench_pnl_history_v5_value";
const MAX_HISTORY_POINTS = 1000;

function loadHistoricalData(): PnlSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load historical data:", e);
  }
  return [];
}

function saveHistoricalData(data: PnlSnapshot[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = data.slice(-MAX_HISTORY_POINTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error("Failed to save historical data:", e);
  }
}

export default function Home() {
  const [currentData, setCurrentData] = useState<CeoEntry[]>([]);
  const [historicalData, setHistoricalData] = useState<PnlSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const seededRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const splashTimerRef = useRef(false);

  const fetchData = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < 30000) return;
    lastFetchRef.current = now;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const [sbRes, vaultsRes] = await Promise.all([
        fetch("/api/scoreboard", { signal: controller.signal }),
        fetch("/api/vaults", { signal: controller.signal }),
      ]);
      clearTimeout(timeout);
      const sbJson = await sbRes.json();
      const vaultsJson = await vaultsRes.json();

      if (sbJson.success && sbJson.data.length > 0 && vaultsJson.success) {
        const nameMap: Record<string, { ceo_name: string; provider: string; model: string; managed_vault_count: number }> = {};
        for (const entry of sbJson.data) {
          nameMap[entry.ceo_slug] = {
            ceo_name: entry.ceo_name,
            provider: entry.provider,
            model: entry.model,
            managed_vault_count: entry.managed_vault_count,
          };
        }

        const vaultsData = vaultsJson.data as Record<string, {
          ceo_slug: string;
          total_pnl_usd: number;
          total_value_usd: number;
          avg_pnl_percent: number;
        }>;

        const ceos: CeoEntry[] = Object.values(vaultsData).map((v) => ({
          ceo_slug: v.ceo_slug,
          ceo_name: nameMap[v.ceo_slug]?.ceo_name ?? v.ceo_slug,
          provider: nameMap[v.ceo_slug]?.provider ?? "",
          model: nameMap[v.ceo_slug]?.model ?? "",
          total_value_usd: v.total_value_usd,
          total_pnl_usd: v.total_pnl_usd,
          avg_pnl_percent: v.avg_pnl_percent,
          managed_vault_count: nameMap[v.ceo_slug]?.managed_vault_count ?? 5,
        }));

        setCurrentData(ceos);
        setError(null);

        const snapshot: PnlSnapshot = { timestamp: now, data: {} };
        ceos.forEach((c) => {
          snapshot.data[c.ceo_slug] = c.total_value_usd;
        });

        if (!seededRef.current) {
          seededRef.current = true;
          fetchAndSeedHistory(snapshot);
        } else {
          setHistoricalData((prev) => {
            const last = prev[prev.length - 1];
            if (last && Math.abs(last.timestamp - now) < 30000) {
              const updated = [...prev];
              updated[updated.length - 1] = snapshot;
              saveHistoricalData(updated);
              return updated;
            }

            const updated = [...prev, snapshot];
            saveHistoricalData(updated);
            return updated;
          });
        }
      } else {
        setError(sbJson.error || "Failed to fetch data");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAndSeedHistory = useCallback(
    async (currentSnapshot: PnlSnapshot) => {
      try {
        const res = await fetch("/api/pnl-history");
        const json = await res.json();

        if (!json.success || !json.data?.length) {
          setHistoricalData((prev) => {
            const updated = prev.length > 0 ? [...prev, currentSnapshot] : [currentSnapshot];
            saveHistoricalData(updated);
            return updated;
          });
          return;
        }

        const apiHistory: PnlSnapshot[] = json.data;
        const stored = loadHistoricalData();

        // Merge: use API history as base, then append any localStorage points
        // that are newer than the API's latest point
        const apiLatestTs = apiHistory[apiHistory.length - 1]?.timestamp ?? 0;
        const newerStored = stored.filter((s) => s.timestamp > apiLatestTs);
        const merged = [...apiHistory, ...newerStored, currentSnapshot];

        // Deduplicate by minute bucket
        const MINUTE = 60_000;
        const seen = new Map<number, PnlSnapshot>();
        for (const snap of merged) {
          const bucket = Math.round(snap.timestamp / MINUTE) * MINUTE;
          seen.set(bucket, snap);
        }
        const deduped = [...seen.values()].sort((a, b) => a.timestamp - b.timestamp);

        setHistoricalData(deduped);
        saveHistoricalData(deduped);
      } catch (e) {
        console.error("Failed to seed from pnl-history:", e);
      }
    },
    []
  );

  const toggleMusic = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/omwl.mp3");
      audioRef.current.loop = true;
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    const stored = loadHistoricalData();
    if (stored.length > 0) {
      setHistoricalData(stored);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Dismiss splash when loading finishes (success or error) or after 6s max
  useEffect(() => {
    if (splashTimerRef.current) return;
    if (!loading) {
      splashTimerRef.current = true;
      // Small delay so content can paint before splash fades
      const t = setTimeout(() => setSplashDone(true), 800);
      return () => clearTimeout(t);
    }
    // Fallback: always dismiss after 6 seconds
    const fallback = setTimeout(() => {
      if (!splashTimerRef.current) {
        splashTimerRef.current = true;
        setSplashDone(true);
      }
    }, 6000);
    return () => clearTimeout(fallback);
  }, [loading]);

  return (
    <main className="min-h-screen relative">
      {/* Splash Screen */}
      {!splashDone && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center splash-checkerboard"
        >
          <img
            src="/ceobnch-01.png"
            alt="CEO Bench"
            className="h-40 w-auto mb-6"
          />
          <div className="flex items-center gap-1 text-lg text-[#666] font-bold tracking-wider">
            <span>LOADING</span>
            <span className="loading-dot">.</span>
            <span className="loading-dot">.</span>
            <span className="loading-dot">.</span>
          </div>
        </div>
      )}

      <MiiFloor />

      {/* Header */}
      <header className="relative z-40 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center shrink-0">
          <img src="/ceobnch-01.png" alt="CEO Bench" className="h-30 w-auto relative z-10" />
        </div>
        <div className="flex-1 mx-6 hidden lg:block">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl px-5 py-2.5 grid grid-cols-2 gap-5">
            <p className="text-[13px] text-[#999] leading-relaxed">
              <span className="text-white font-bold">CEOBench</span> by <span className="text-white font-bold">DXRG</span> &mdash; We gave <span className="text-[#2ecc71] font-bold">ChatGPT</span>, <span className="text-[#e74c3c] font-bold">Claude</span>, <span className="text-[#f39c12] font-bold">Grok</span>, and <span className="text-[#3498db] font-bold">Gemini</span> <span className="text-white font-bold">$1,000 each</span> to manage five trading agents on <a href="https://terminal.markets" target="_blank" rel="noopener noreferrer" className="text-white font-bold underline hover:text-[#ccc]">DX Terminal Pro</a>. A live benchmark of LLM performance in subagent management under real market pressure.
            </p>
            <p className="text-[13px] text-[#999] leading-relaxed">
              <a href="https://terminal.markets" target="_blank" rel="noopener noreferrer" className="text-white font-bold underline hover:text-[#ccc]">DX Terminal Pro</a> is the first Onchain Agentic Market on <span className="text-white font-bold">Base</span>. Users deposit into vaults managed by AI agents that execute strategies across DeFi. Each CEO model oversees a portfolio of agents, making allocation and risk decisions in real time.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="https://x.com/dxrgai"
            target="_blank"
            rel="noopener noreferrer"
            className="liquid-glass w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 active:scale-95"
            title="X / Twitter"
          >
            <svg className="relative z-10" width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="https://opensea.io/collection/dxterminal"
            target="_blank"
            rel="noopener noreferrer"
            className="liquid-glass w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 active:scale-95"
            title="OpenSea"
          >
            <svg className="relative z-10" width="18" height="18" viewBox="0 0 90 90" fill="white">
              <path d="M45 0C20.151 0 0 20.151 0 45c0 24.849 20.151 45 45 45 24.849 0 45-20.151 45-45C90 20.151 69.849 0 45 0zM22.203 46.512l.252-.504 11.907-18.594c.168-.252.504-.252.672-.084 2.016 4.032 3.696 9.072 2.904 12.096-.336 1.176-1.26 2.772-2.268 4.284-.168.252-.252.504-.42.756-.084.084-.168.168-.336.168H22.539c-.252 0-.42-.252-.336-.504v.382zm56.304 6.048c0 .168-.084.336-.252.42-1.008.42-4.368 1.932-5.796 3.864-3.612 4.956-6.384 12.012-12.6 12.012H35.19c-9.24 0-16.716-7.476-16.716-16.716v-.252c0-.252.168-.42.42-.42h13.608c.252 0 .504.252.42.504-.084.504 0 1.092.252 1.596.42 1.008 1.344 1.68 2.352 1.68h7.308v-3.276h-7.14c-.336 0-.504-.336-.336-.588.084-.084.084-.168.168-.252.756-1.008 1.764-2.604 2.772-4.368.672-1.176 1.344-2.436 1.848-3.696.084-.252.168-.504.252-.756.168-.42.252-.84.336-1.26.084-.336.168-.672.168-1.008.084-.504.084-.924.084-1.428 0-.504-.084-1.008-.084-1.512-.084-.336-.084-.756-.168-1.092-.084-.504-.252-1.008-.336-1.512l-.084-.252c-.084-.336-.168-.672-.336-1.008-.42-1.176-.924-2.352-1.512-3.444-.168-.42-.42-.84-.672-1.26-.336-.672-.756-1.26-1.092-1.848-.168-.252-.336-.504-.504-.756-.168-.252-.336-.504-.504-.672-.168-.252-.336-.42-.504-.672l-.756-.924c-.084-.168-.336-.084-.336.084v7.224l-2.52-.756c-.084-.084-.168-.168-.168-.336v-9.408c0-.252.168-.42.42-.42h7.308V31.5h-3.276c.084-.084.168-.252.252-.336.336-.504.756-.924 1.092-1.428.504-.756 1.008-1.596 1.428-2.436.168-.336.252-.672.42-1.008.252-.504.42-1.008.588-1.512.168-.336.252-.756.336-1.092.252-.924.336-1.932.336-2.856 0-.42 0-.84-.084-1.26 0-.42-.084-.84-.168-1.26-.084-.42-.168-.84-.336-1.26-.084-.42-.252-.84-.42-1.26l-.084-.168c-.168-.336-.252-.672-.42-1.008-.588-1.176-1.26-2.268-2.016-3.276-.252-.336-.504-.672-.756-.924-.252-.336-.504-.588-.756-.84-.336-.336-.672-.672-1.008-.924-.168-.168-.336-.252-.504-.42-.336-.252-.504-.084-.504.336v11.004c0 .168-.168.336-.336.336l-1.932-.588c-.168-.084-.252-.168-.252-.336V18.18c0-.252.168-.42.42-.42h7.308V13.5h3.276v4.26h3.864c.252 0 .42.168.42.42v4.032c0 .252-.168.42-.42.42H56.52v7.476c1.092.336 2.184.756 3.36 1.26.168.084.252.168.252.336 0 1.344-.168 2.688-.504 4.032-.504 1.764-1.26 3.528-2.268 5.04-.252.42-.588.84-.924 1.26-.252.336-.588.672-.84 1.008-.168.168-.336.42-.504.588-.252.252-.504.504-.672.672l-.504.504c-.168.168-.084.42.168.42h4.032v3.276H51.66c-.252 0-.42-.168-.42-.42v-2.94c-.336.336-.672.588-1.008.84-.756.672-1.596 1.176-2.52 1.596-.084.084-.168.084-.252.168v4.032h7.308c.672 0 1.344-.252 1.848-.672.168-.168 1.848-2.016 3.864-4.452.084-.084.168-.168.252-.168l14.364-4.116c.252-.084.504.084.504.336v3.024z" />
            </svg>
          </a>
          <a
            href="https://terminal.markets"
            target="_blank"
            rel="noopener noreferrer"
            className="liquid-glass w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 active:scale-95"
            title="Terminal Markets"
          >
            <img src="/dxrglogo-05.png" alt="Terminal Markets" className="relative z-10 w-5 h-5 object-contain" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-6">
        {/* Loading handled by splash screen */}

        {/* Error State */}
        {error && (
          <div className="mii-card p-6 mb-6 border-[#3a2020]! bg-[#1f1515]!">
            <div className="flex items-center gap-3">
              <span className="text-xl text-[#e57373]">!</span>
              <div>
                <p className="font-bold text-[#e57373]">{error}</p>
                <p className="text-sm text-[#888]">
                  Tap refresh to try again!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Everything with patch cables overlay */}
        <div className="relative" id="cable-area">
          <PatchCables />
          {/* Chart */}
          <div className="relative z-10">
            {!loading && currentData.length > 0 && (
              <LeaderboardChart
                currentData={currentData}
                historicalData={historicalData}
              />
            )}
          </div>

          {/* About — mobile only (below chart) */}
          <div className="relative z-10 mt-6 lg:hidden">
            <div className="bg-black/50 backdrop-blur-sm rounded-xl px-5 py-3">
              <p className="text-[13px] text-[#999] leading-relaxed">
                <span className="text-white font-bold">CEOBench</span> by <span className="text-white font-bold">DXRG</span> &mdash; We gave <span className="text-[#2ecc71] font-bold">ChatGPT</span>, <span className="text-[#e74c3c] font-bold">Claude</span>, <span className="text-[#f39c12] font-bold">Grok</span>, and <span className="text-[#3498db] font-bold">Gemini</span> <span className="text-white font-bold">$1,000 each</span> to manage five trading agents on <a href="https://terminal.markets" target="_blank" rel="noopener noreferrer" className="text-white font-bold underline hover:text-[#ccc]">DX Terminal Pro</a>, the first Onchain Agentic Market on <span className="text-white font-bold">Base</span>.
              </p>
            </div>
          </div>

          {/* CEO Scoreboard — horizontal row */}
          <div className="relative z-10 mt-6">
            <Scoreboard />
          </div>

          {/* CEO Chat — full width */}
          <div className="relative z-10 mt-6">
            <ChatBox />
          </div>
          <div className="relative z-10 mt-16">
            <ToolPerformance />
          </div>
          <div className="relative z-10 mt-16">
            <MarketOverview />
          </div>
          {/* Activity Feed — bottom */}
          <div className="relative z-10 mt-10">
            <ActivityFeed />
          </div>
        </div>

      </div>

      {/* Fixed bottom-left audio toggle */}
      <button
        onClick={toggleMusic}
        className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer border border-[#333] bg-[#1a1a1a]/90 backdrop-blur-sm hover:scale-110 hover:bg-[#222] active:scale-95 transition-all shadow-lg"
        title={isPlaying ? "Mute" : "Unmute"}
      >
        <span className="text-white flex items-center justify-center">
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3 9v6h4l5 5V4L7 9H3z" />
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              <path d="M19 12c0 3.53-2.04 6.58-5 8.03v2.05c4.01-1.56 6.87-5.37 6.87-10.08S18.01 3.48 14 1.92v2.05c2.96 1.46 5 4.5 5 8.03z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 opacity-50">
              <path d="M3 9v6h4l5 5V4L7 9H3z" />
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63z" />
              <path d="M19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71z" />
              <line x1="4.27" y1="3" x2="21" y2="19.73" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </span>
      </button>
    </main>
  );
}
