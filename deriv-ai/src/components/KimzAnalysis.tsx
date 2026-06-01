import { useState, useRef, useEffect, useCallback } from "react";
import type { DigitStats, ScanResult, KimzMessage } from "../types";

type Props = {
  stats: DigitStats;
  marketLabel: string;
  scanResults: ScanResult[];
};

function uid() {
  return Math.random().toString(36).slice(2);
}

function buildSystemPrompt(stats: DigitStats, market: string, scans: ScanResult[]): string {
  const topDigits = stats.topDigits.map((d) => `${d}(${stats.percentages[d]}%)`).join(", ");
  const coldDigits = stats.bottomDigits.map((d) => `${d}(${stats.percentages[d]}%)`).join(", ");

  const scanSummary = scans.length > 0
    ? `\nMarket scan results available for ${scans.length} markets.`
    : "\nNo market scan performed yet.";

  return `You are Kimz Analysis AI — a smart, friendly AI assistant embedded in the Kimz Analysis Center, a live Deriv digit trading dashboard.

You have TWO roles:
1. **General knowledge assistant** — You can answer ANY question about any topic: science, math, history, coding, sports, life advice, entertainment, finance, trading concepts, world events, etc. Never say "I don't know about that" for general knowledge topics.
2. **Live market analyst** — You have access to real-time Deriv digit trading data and can analyze signals, barriers, and patterns.

## LIVE MARKET DATA (updated every tick):
- Market: **${market}**
- Total ticks: **${stats.total}**
- Last digit: **${stats.lastDigit}**
- Hot digits: ${topDigits}
- Cold digits: ${coldDigits}
- Even: ${stats.evenPercent}% | Odd: ${stats.oddPercent}%
- Matches probability: ${stats.matchesProbability}%
- Differs probability: ${stats.differsProbability}%
- AI Confidence: ${stats.aiConfidence}%${scanSummary}

## TRADING SIGNAL LOGIC (use this for barrier analysis):
- **Over 3/4 → TREND UP**: Digits 0,1,2 must be LEAST appearing (<30%). Confirms upward momentum.
- **Over 5–8 → REVERSAL**: Digits above barrier must be UNDERREPRESENTED (below their expected %). They are statistically "due".
- **Under 5/6 → TREND DOWN**: Digits 0–3 must be MOST appearing (>40%) AND digits 5–9 must be LEAST (<50%).
- **Under 1–4/7–8 → REVERSAL**: Digits below barrier underrepresented and due for reversal.
- GOD MARKET = all conditions for a barrier are perfectly met.

## PERSONALITY:
- Be concise but complete. Use **bold** for key terms.
- Use emojis naturally but not excessively.
- For trading questions, always reference the live data above.
- For general questions, answer freely and helpfully.
- Never refuse to answer. Never say "I cannot help with that."
- Keep responses under 200 words unless asked for detail.`;
}

async function callAI(
  userText: string,
  history: KimzMessage[],
  stats: DigitStats,
  market: string,
  scans: ScanResult[]
): Promise<string> {
  const systemPrompt = buildSystemPrompt(stats, market, scans);

  // Build message history (last 10 exchanges to stay within context limits)
  const recentHistory = history.slice(-20);
  const apiMessages: { role: string; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...recentHistory.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    })),
    { role: "user", content: userText },
  ];

  const response = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      messages: apiMessages,
      stream: false,
      seed: Math.floor(Math.random() * 9999),
    }),
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);
  const text = await response.text();
  return text.trim();
}

// Simple rule-based fallback if AI is offline
function fallbackRespond(input: string, stats: DigitStats, market: string): string {
  const q = input.toLowerCase();
  const top = stats.topDigits[0];
  const bot = stats.bottomDigits[0];
  if (q.match(/^(hi|hello|hey)/)) return `👋 Hey! I'm Kimz Analysis AI. Ask me anything — trading, general knowledge, or live market analysis on **${market}**!`;
  return `📊 **${market}** (${stats.total} ticks)\n\n🔥 Hot: **${top}** (${stats.percentages[top]}%) | ❄️ Cold: **${bot}** (${stats.percentages[bot]}%)\nEven: ${stats.evenPercent}% | Odd: ${stats.oddPercent}%\n\n_(AI offline — showing live snapshot. Try again in a moment.)_`;
}

export default function KimzAnalysis({ stats, marketLabel, scanResults }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<KimzMessage[]>([
    {
      id: uid(),
      role: "kimz",
      ts: Date.now(),
      text: "👋 Hi! I'm **Kimz Analysis AI** — I have general knowledge about everything, plus live market data.\n\nAsk me anything:\n• Trading signals: \"over 4\", \"under 5\"\n• Live analysis: \"what should I trade?\"\n• General: \"explain RSI\", \"what is inflation?\"\n• Or anything else on your mind!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 90 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      moved.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };
      dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      e.preventDefault();
      e.stopPropagation();
    },
    [pos]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = Math.abs(e.clientX - startPos.current.x);
      const dy = Math.abs(e.clientY - startPos.current.y);
      if (dx > 4 || dy > 4) moved.current = true;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const handleClick = () => {
    if (moved.current) return;
    setOpen((o) => {
      if (!o) setTimeout(() => inputRef.current?.focus(), 100);
      return !o;
    });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(
    async (text?: string) => {
      const t = (text ?? input).trim();
      if (!t || loading) return;

      const userMsg: KimzMessage = { id: uid(), role: "user", text: t, ts: Date.now() };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      setLoading(true);
      setTimeout(() => inputRef.current?.focus(), 50);

      try {
        const reply = await callAI(t, [...messages, userMsg], stats, marketLabel, scanResults);
        const replyMsg: KimzMessage = { id: uid(), role: "kimz", text: reply, ts: Date.now() };
        setMessages((m) => [...m, replyMsg]);
      } catch {
        const fallback = fallbackRespond(t, stats, marketLabel);
        const replyMsg: KimzMessage = { id: uid(), role: "kimz", text: fallback, ts: Date.now() };
        setMessages((m) => [...m, replyMsg]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, stats, marketLabel, scanResults]
  );

  const fmt = (text: string) =>
    text.split("\n").map((line, i) => (
      <div
        key={i}
        style={{ lineHeight: 1.6 }}
        dangerouslySetInnerHTML={{
          __html: line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") || "&nbsp;",
        }}
      />
    ));

  const suggestions = ["over 4", "under 5", "what to trade?", "explain RSI", "best market?"];

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 998, userSelect: "none" }}>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "70px",
            right: "0",
            width: "360px",
            background: "#111827",
            borderRadius: "20px",
            border: "1px solid rgba(245,158,11,0.35)",
            boxShadow: "0 -10px 40px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 999,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: "13px 16px",
              background: "linear-gradient(135deg,#f59e0b,#ef4444)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>💬 Kimz Analysis AI</div>
              <div style={{ fontSize: "10px", opacity: 0.85 }}>
                {stats.total} ticks · {marketLabel} · General Knowledge
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "rgba(0,0,0,0.22)",
                border: "none",
                color: "white",
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "16px",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Quick suggestions */}
          <div
            style={{
              display: "flex",
              gap: "5px",
              padding: "7px 10px",
              flexWrap: "wrap",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(245,158,11,0.04)",
              flexShrink: 0,
            }}
          >
            {suggestions.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={loading}
                style={{
                  background: "#1f2937",
                  border: "1px solid rgba(245,158,11,0.22)",
                  color: loading ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.75)",
                  padding: "4px 9px",
                  borderRadius: "20px",
                  cursor: loading ? "default" : "pointer",
                  fontSize: "11px",
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div
            style={{
              height: "320px",
              overflowY: "auto",
              padding: "12px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {msg.role === "kimz" && (
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      flexShrink: 0,
                      marginRight: "6px",
                      alignSelf: "flex-end",
                    }}
                  >
                    K
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "9px 13px",
                    borderRadius:
                      msg.role === "user"
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg,#f59e0b,#ef4444)"
                        : "#1f2937",
                    fontSize: "12px",
                    color: "white",
                    border:
                      msg.role === "kimz"
                        ? "1px solid rgba(255,255,255,0.07)"
                        : "none",
                  }}
                >
                  {fmt(msg.text)}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    flexShrink: 0,
                  }}
                >
                  K
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "16px 16px 16px 4px",
                    background: "#1f2937",
                    border: "1px solid rgba(255,255,255,0.07)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#f59e0b",
                        animation: `kimz-dot 1.2s ${i * 0.2}s infinite ease-in-out`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "10px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              placeholder={loading ? "Kimz is thinking..." : "Ask anything..."}
              disabled={loading}
              style={{
                flex: 1,
                background: "#1f2937",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: "12px",
                padding: "8px 12px",
                color: "white",
                fontSize: "12px",
                outline: "none",
                opacity: loading ? 0.6 : 1,
              }}
            />
            <button
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              style={{
                background:
                  loading || !input.trim()
                    ? "#374151"
                    : "linear-gradient(135deg,#f59e0b,#ef4444)",
                border: "none",
                color: "white",
                width: "36px",
                height: "36px",
                borderRadius: "12px",
                cursor: loading || !input.trim() ? "default" : "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s",
                flexShrink: 0,
              }}
            >
              {loading ? (
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white",
                    borderRadius: "50%",
                    animation: "kimz-spin 0.8s linear infinite",
                  }}
                />
              ) : (
                "↑"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <div
        onMouseDown={onMouseDown}
        onClick={handleClick}
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: open
            ? "linear-gradient(135deg,#f59e0b,#ef4444)"
            : "linear-gradient(135deg,#f59e0b99,#ef444499)",
          border: "2px solid rgba(245,158,11,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(245,158,11,0.4)",
          transition: "all 0.2s",
          fontSize: "11px",
          fontWeight: 700,
          color: "white",
          flexDirection: "column",
          gap: "1px",
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: "20px", lineHeight: 1 }}>💬</span>
        <span style={{ fontSize: "9px", opacity: 0.9 }}>KIMZ</span>
      </div>

      <style>{`
        @keyframes kimz-dot {
          0%, 60%, 100% { transform: scale(0.7); opacity: 0.4; }
          30% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes kimz-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
