"use client";

import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { format } from "date-fns";

interface Intent {
  id: number;
  cycle_id: number;
  ceo_slug: string;
  vault_address: string;
  action_type: string;
  abi_function: string;
  typed_args: Record<string, unknown>;
  rationale: string;
  validation_status: string;
  execution_status: string;
  tx_hash: string | null;
  planned_at: string;
  submitted_at: string;
  mined_at: string | null;
  reverted_at: string | null;
}

const CEO_AVATARS: Record<string, string> = {
  chatgpt: "/openai.png",
  claude: "/claude.png",
  gemini: "/gemini.png",
  grok: "/grok.png",
};

const CEO_NAMES: Record<string, string> = {
  chatgpt: "ChiefGPT",
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

const ACTION_ICONS: Record<string, string> = {
  unpause_vault: "›",
  pause_vault: "‖",
  update_settings: "*",
  add_strategy: "+",
  disable_strategy: "x",
  buy_token: "+",
  sell_token: "–",
};

function formatAction(action: string): string {
  return action.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function ActivityFeed() {
  const [intents, setIntents] = useState<Intent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchIntents() {
      try {
        const res = await fetch("/api/intents");
        const json = await res.json();
        if (json.success && json.data) {
          setIntents(json.data);
        }
      } catch (e) {
        console.error("Failed to fetch intents:", e);
      }
    }
    fetchIntents();
    const interval = setInterval(fetchIntents, 60000);
    return () => clearInterval(interval);
  }, []);

  const filtered = intents
    .slice()
    .sort((a, b) => new Date(a.submitted_at || a.planned_at).getTime() - new Date(b.submitted_at || b.planned_at).getTime());

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useLayoutEffect(() => {
    scrollToBottom();
  }, [filtered.length]);

  useEffect(() => {
    const t = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(t);
  }, [filtered.length]);

  if (intents.length === 0) return null;

  return (
    <div data-panel="activity" className="panel-ethereal panel-ethereal-delay-1 rounded-[20px] border border-[#2a2a2a] overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#111] relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">Activity</span>
          <span className="text-[10px] text-[#555]">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-[#3a2a2a] eva-ticker-dot" style={{ animationDelay: "-0.7s" }}>CHAIN:BASE</span>
          <div className="w-8 h-[3px] bg-[#1a1a1a] rounded overflow-hidden">
            <div className="eva-meter-bar-2 bg-[#e74c3c]/40" />
          </div>
        </div>
      </div>

      {/* Feed */}
      <div
        ref={scrollRef}
        className="max-h-[220px] overflow-y-auto px-3 py-2 space-y-0.5"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%)",
        }}
      >
        {filtered.map((intent) => {
          const avatar = CEO_AVATARS[intent.ceo_slug] || "/claude.png";
          const name = CEO_NAMES[intent.ceo_slug] || intent.ceo_slug;
          const color = CEO_COLORS[intent.ceo_slug] || "#888";
          const icon = ACTION_ICONS[intent.action_type] || "·";
          const ts = intent.mined_at || intent.submitted_at || intent.planned_at;
          const time = format(new Date(ts), "h:mm");

          return (
            <div
              key={intent.id}
              className="group flex items-start gap-0 py-0.5 px-1 rounded hover:bg-[#ffffff06] transition-colors"
            >
              <span className="text-[10px] text-[#333] w-8 flex-shrink-0 pt-0.5 text-right mr-2 font-mono">
                {time}
              </span>
              <img
                src={avatar}
                alt={name}
                className="w-4 h-4 rounded-full object-cover flex-shrink-0 mr-1.5 mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold mr-1" style={{ color }}>
                  {name}
                </span>
                <span className="text-[10px] mr-1">{icon}</span>
                <span className="text-xs text-[#777]">
                  {formatAction(intent.action_type)}
                </span>
                {intent.tx_hash && (
                  <a
                    href={`https://basescan.org/tx/${intent.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] text-[#3498db] hover:underline font-mono ml-1.5"
                  >
                    {intent.tx_hash.slice(0, 6)}..
                  </a>
                )}
                {intent.rationale && (
                  <span className="text-[10px] text-[#555] ml-1.5">
                    — {intent.rationale.length > 50 ? intent.rationale.slice(0, 50) + "…" : intent.rationale}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-1.5 bg-[#111] border-t border-[#1a1a1a] flex items-center gap-2 relative z-10">
        <div className="flex -space-x-1.5">
          {Object.entries(CEO_AVATARS).map(([slug, src]) => (
            <img key={slug} src={src} alt="" className="w-4 h-4 rounded-full border border-[#0a0a0a]" />
          ))}
        </div>
        <span className="text-[10px] text-[#333]">{filtered.length} actions</span>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-[#333]">GAS</span>
            <div className="w-6 h-[3px] bg-[#1a1a1a] rounded overflow-hidden">
              <div className="eva-meter-bar bg-[#e74c3c]/40" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-[#333]">BLK</span>
            <div className="w-6 h-[3px] bg-[#1a1a1a] rounded overflow-hidden">
              <div className="eva-meter-bar-2 bg-[#2ecc71]/40" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="led-3 w-1.5 h-1.5 rounded-full bg-[#2ecc71]" style={{ boxShadow: "0 0 4px #2ecc71" }} />
            <span className="led-1 w-1.5 h-1.5 rounded-full bg-[#e74c3c]" style={{ boxShadow: "0 0 4px #e74c3c" }} />
            <span className="led-2 w-1.5 h-1.5 rounded-full bg-[#f39c12]" style={{ boxShadow: "0 0 4px #f39c12" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
