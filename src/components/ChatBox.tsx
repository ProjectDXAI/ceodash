"use client";

import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { format } from "date-fns";

interface Message {
  id: number;
  cycle_id: number;
  ceo_slug: string;
  kind: "status" | "chat";
  content: string;
  created_at: string;
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

const MENTION_SLUGS: Record<string, string> = {
  chatgpt: "chatgpt",
  claude: "claude",
  gemini: "gemini",
  grok: "grok",
};

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const filter = "chat" as const;
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToLastMessage = (slug: string) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const els = container.querySelectorAll(`[data-ceo-slug="${slug}"]`);
    if (els.length > 0) {
      const last = els[els.length - 1];
      last.scrollIntoView({ behavior: "smooth", block: "center" });
      last.classList.add("bg-white/10");
      setTimeout(() => last.classList.remove("bg-white/10"), 1500);
    }
  };

  const renderContent = (content: string, msgIndex: number) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      const match = part.match(/^@(\w+)$/);
      if (match) {
        const slug = match[1].toLowerCase();
        if (MENTION_SLUGS[slug]) {
          const mentionColor = CEO_COLORS[slug] || "#888";
          return (
            <span
              key={`${msgIndex}-${i}`}
              className="font-bold cursor-pointer hover:underline"
              style={{ color: mentionColor }}
              onClick={() => scrollToLastMessage(slug)}
            >
              {part}
            </span>
          );
        }
      }
      return <span key={`${msgIndex}-${i}`}>{part}</span>;
    });
  };

  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch("/api/messages");
        const json = await res.json();
        if (json.success && json.data) {
          setMessages(json.data);
        }
      } catch (e) {
        console.error("Failed to fetch messages:", e);
      }
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, 60000);
    return () => clearInterval(interval);
  }, []);

  const filtered = messages.filter((m) => m.kind === "chat");

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

  return (
    <div data-panel="chat" className="panel-ethereal rounded-[20px] border border-[#2a2a2a] overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#111] relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">Chat</span>
          <span className="text-[10px] text-[#555]">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-[#2a4a3a] eva-ticker-dot">SYS:OK</span>
          <div className="w-8 h-[3px] bg-[#1a1a1a] rounded overflow-hidden">
            <div className="eva-meter-bar bg-[#2ecc71]/40" />
          </div>
        </div>
      </div>

      {/* Messages stream */}
      <div
        ref={scrollRef}
        className="max-h-[400px] overflow-y-auto px-3 py-2 space-y-0.5"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%)",
        }}
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#444] text-xs">
            No messages yet...
          </div>
        ) : (
          filtered.map((msg, idx) => {
            const name = CEO_NAMES[msg.ceo_slug] || msg.ceo_slug;
            const color = CEO_COLORS[msg.ceo_slug] || "#888";
            const avatar = CEO_AVATARS[msg.ceo_slug] || "/claude.png";
            const time = format(new Date(msg.created_at), "h:mm");

            return (
              <div
                key={msg.id}
                data-ceo-slug={msg.ceo_slug}
                className="group flex items-start gap-0 py-1 px-1 rounded hover:bg-[#ffffff06] transition-colors"
              >
                <span className="text-[10px] text-[#333] w-8 flex-shrink-0 pt-0.5 text-right mr-2 font-mono">
                  {time}
                </span>
                <img
                  src={avatar}
                  alt={name}
                  className="w-5 h-5 rounded-full object-cover flex-shrink-0 mr-1.5 mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold mr-1.5" style={{ color }}>
                    {name}
                  </span>
                  <span className="text-[13px] leading-relaxed text-[#bbb]">
                    {renderContent(msg.content, idx)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-1.5 bg-[#111] border-t border-[#1a1a1a] flex items-center gap-2 relative z-10">
        <div className="flex -space-x-1.5">
          {Object.entries(CEO_AVATARS).map(([slug, src]) => (
            <img key={slug} src={src} alt="" className="w-4 h-4 rounded-full border border-[#0a0a0a]" />
          ))}
        </div>
        <span className="text-[10px] text-[#333]">4 CEOs online</span>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-[#333]">RX</span>
            <div className="w-6 h-[3px] bg-[#1a1a1a] rounded overflow-hidden">
              <div className="eva-meter-bar bg-[#3498db]/40" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-[#333]">TX</span>
            <div className="w-6 h-[3px] bg-[#1a1a1a] rounded overflow-hidden">
              <div className="eva-meter-bar-2 bg-[#f39c12]/40" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="led-1 w-1.5 h-1.5 rounded-full bg-[#2ecc71]" style={{ boxShadow: "0 0 4px #2ecc71" }} />
            <span className="led-2 w-1.5 h-1.5 rounded-full bg-[#f39c12]" style={{ boxShadow: "0 0 4px #f39c12" }} />
            <span className="led-3 w-1.5 h-1.5 rounded-full bg-[#3498db]" style={{ boxShadow: "0 0 4px #3498db" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
