import { useState, useRef, useCallback, useEffect } from "react";
import type { ScanResult } from "../types";
import { useMarketScanner } from "../hooks/useMarketScanner";

const BARRIERS = [2, 3, 4, 5, 6, 7, 8];

type Props = {
  onSelectMarket?: (symbol: string) => void;
};

// ── Web Speech TTS ──────────────────────────────────────────────────────────
function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.pitch = 1.05;
  u.volume = 1;
  // prefer a clearer English voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))
  );
  if (preferred) u.voice = preferred;
  window.speechSynthesis.speak(u);
}

function buildVoiceMessage(results: ScanResult[]): string {
  const qualified = results
    .filter((r) => r.bestSignal !== null)
    .sort((a, b) => (b.bestSignal?.winRate ?? 0) - (a.bestSignal?.winRate ?? 0));

  if (qualified.length === 0) {
    return "Scan complete. No market has reached the 90 percent confidence threshold right now. Keep watching.";
  }

  const top = qualified[0];
  const all = qualified
    .slice(0, 3)
    .map((r) => `${r.market.label}, ${r.bestSignal!.trade} at ${r.bestSignal!.winRate.toFixed(0)} percent`)
    .join(". ");

  const intro =
    qualified.length === 1
      ? `Scan complete. One strong signal found.`
      : `Scan complete. ${qualified.length} strong signals found.`;

  return `${intro} Best market: ${top.market.label}. Trade ${top.bestSignal!.trade}. Confidence ${top.bestSignal!.winRate.toFixed(0)} percent. ${qualified.length > 1 ? `Also: ${all}.` : ""} Good luck!`;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function MarketScanner({ onSelectMarket }: Props) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<"best" | "over" | "under" | "evenodd">("best");
  const [barrier, setBarrier] = useState(7);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [pos, setPos] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 170 });

  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const prevScanRef = useRef<Date | null>(null);

  const { results, scanning, lastScan, runScan } = useMarketScanner(enabled);

  // ── Voice announcement when scan finishes ──────────────────────────────
  useEffect(() => {
    if (!lastScan || lastScan === prevScanRef.current) return;
    prevScanRef.current = lastScan;
    if (voiceEnabled && results.length > 0) {
      // small delay so UI renders first
      setTimeout(() => speak(buildVoiceMessage(results)), 400);
    }
  }, [lastScan, results, voiceEnabled]);

  // ── Drag ──────────────────────────────────────────────────────────────
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
    if (!enabled) setEnabled(true);
    setOpen((o) => !o);
  };

  // ── Ranked lists ──────────────────────────────────────────────────────
  const bestRanked = [...results]
    .sort((a, b) => (b.bestSignal?.winRate ?? 0) - (a.bestSignal?.winRate ?? 0))
    .filter((r) => r.bestSignal !== null);

  const allByBest = [...results].sort(
    (a, b) => (b.bestSignal?.winRate ?? 0) - (a.bestSignal?.winRate ?? 0)
  );

  const getRanked = () => {
    if (activeTab === "best") return allByBest;
    if (activeTab === "evenodd") {
      return [...results].sort(
        (a, b) => Math.max(b.evenScore, b.oddScore) - Math.max(a.evenScore, a.oddScore)
      );
    }
    return [...results].sort((a, b) => {
      const as_ = activeTab === "over" ? (a.overScore[barrier] ?? 0) : (a.underScore[barrier] ?? 0);
      const bs_ = activeTab === "over" ? (b.overScore[barrier] ?? 0) : (b.underScore[barrier] ?? 0);
      return bs_ - as_;
    });
  };

  const ranked = getRanked();
  const godMarket = ranked[0];

  const getScore = (r: ScanResult) => {
    if (activeTab === "best") return r.bestSignal?.winRate ?? 0;
    if (activeTab === "over") return r.overScore[barrier] ?? 0;
    if (activeTab === "under") return r.underScore[barrier] ?? 0;
    return Math.max(r.evenScore, r.oddScore);
  };

  const sigColor = (s: number) =>
    s >= 90 ? "#22c55e" : s >= 60 ? "#f59e0b" : s > 10 ? "#6366f1" : s > 5 ? "#6b7280" : "#ef4444";

  const sigLabel = (r: ScanResult) => {
    if (activeTab === "best") {
      if (r.bestSignal?.meetsThreshold) return "🔥 FIRE";
      return r.bestSignal ? "CLOSE" : "WAIT";
    }
    const s = getScore(r);
    return s > 10 ? "STRONG" : s > 5 ? "GOOD" : s > 0 ? "WEAK" : "NONE";
  };

  const hasThresholdSignals = bestRanked.length > 0;
  const topSignal = bestRanked[0];

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 1000, userSelect: "none" }}>
      {/* ── Panel ───────────────────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "70px",
            right: "0",
            width: "360px",
            background: "#0f1117",
            borderRadius: "20px",
            border: "1px solid rgba(99,102,241,0.35)",
            boxShadow: "0 -10px 40px rgba(0,0,0,0.7)",
            overflow: "hidden",
            zIndex: 1001,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "white" }}>
                🤖 AI Market Scanner
              </div>
              <div style={{ fontSize: "10px", opacity: 0.8, color: "white" }}>
                {scanning
                  ? "⟳ Scanning all markets..."
                  : lastScan
                  ? `Scanned ${lastScan.toLocaleTimeString()} · 90% threshold`
                  : "Press Scan to start"}
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {/* Voice toggle */}
              <button
                onClick={() => setVoiceEnabled((v) => !v)}
                title={voiceEnabled ? "Voice ON — click to mute" : "Voice OFF — click to enable"}
                style={{
                  background: voiceEnabled ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.1)",
                  border: voiceEnabled ? "1px solid rgba(34,197,94,0.5)" : "1px solid transparent",
                  color: voiceEnabled ? "#4ade80" : "rgba(255,255,255,0.5)",
                  padding: "5px 8px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  lineHeight: 1,
                }}
              >
                {voiceEnabled ? "🔊" : "🔇"}
              </button>
              <button
                onClick={() => { runScan(); if (voiceEnabled) speak("Scanning all markets now. Please wait."); }}
                disabled={scanning}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "white",
                  padding: "5px 10px",
                  borderRadius: "8px",
                  cursor: scanning ? "default" : "pointer",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {scanning ? "..." : "↻ Scan"}
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "rgba(0,0,0,0.25)",
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
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {(["best", "over", "under", "evenodd"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: "9px 4px",
                  background: activeTab === tab ? "rgba(99,102,241,0.2)" : "transparent",
                  border: "none",
                  borderBottom: activeTab === tab ? "2px solid #6366f1" : "2px solid transparent",
                  color: activeTab === tab ? "white" : "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                {tab === "best" ? "⚡ BEST" : tab === "over" ? "OVER" : tab === "under" ? "UNDER" : "EVEN/ODD"}
              </button>
            ))}
          </div>

          {/* Barrier selector (only for over/under tabs) */}
          {(activeTab === "over" || activeTab === "under") && (
            <div
              style={{
                display: "flex",
                gap: "5px",
                padding: "9px 12px",
                flexWrap: "wrap",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {BARRIERS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBarrier(b)}
                  style={{
                    padding: "4px 9px",
                    borderRadius: "7px",
                    border: "none",
                    background: barrier === b ? "#6366f1" : "#1f2937",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: barrier === b ? 700 : 400,
                  }}
                >
                  {activeTab === "over" ? `>${b}` : `<${b}`}
                </button>
              ))}
            </div>
          )}

          {/* BEST tab — threshold summary */}
          {activeTab === "best" && results.length > 0 && (
            <div
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                background: hasThresholdSignals
                  ? "rgba(34,197,94,0.06)"
                  : "rgba(245,158,11,0.04)",
              }}
            >
              {hasThresholdSignals ? (
                <>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#4ade80",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      marginBottom: "8px",
                    }}
                  >
                    🔥 {bestRanked.length} MARKET{bestRanked.length > 1 ? "S" : ""} ABOVE THRESHOLD
                  </div>
                  {bestRanked.slice(0, 3).map((r, i) => (
                    <div
                      key={r.market.symbol}
                      onClick={() => { onSelectMarket?.(r.market.symbol); setOpen(false); }}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        marginBottom: "4px",
                        background:
                          i === 0
                            ? "rgba(34,197,94,0.12)"
                            : "rgba(255,255,255,0.03)",
                        border:
                          i === 0
                            ? "1px solid rgba(34,197,94,0.35)"
                            : "1px solid rgba(255,255,255,0.06)",
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "13px", color: i === 0 ? "#22c55e" : "white" }}>
                          {i === 0 ? "⚡ " : ""}{r.market.label}
                        </div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", marginTop: "1px" }}>
                          {r.bestSignal!.trade}
                        </div>
                      </div>
                      <div
                        style={{
                          background: i === 0 ? "#22c55e" : "#374151",
                          color: i === 0 ? "black" : "white",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: 800,
                        }}
                      >
                        {r.bestSignal!.winRate.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                  {topSignal && (
                    <button
                      onClick={() => speak(buildVoiceMessage(results))}
                      style={{
                        marginTop: "6px",
                        width: "100%",
                        padding: "7px",
                        background: "rgba(99,102,241,0.15)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: "8px",
                        color: "#a5b4fc",
                        cursor: "pointer",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      🔊 Read signal aloud
                    </button>
                  )}
                </>
              ) : (
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "6px" }}>
                  No market currently above 90% threshold · 60% for Even/Odd
                  <br />
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>
                    Best approaching: {allByBest[0]?.market.label ?? "—"}{" "}
                    {allByBest[0]?.bestSignal ? `(${allByBest[0].bestSignal.winRate.toFixed(1)}%)` : ""}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* God market (for over/under/evenodd tabs) */}
          {activeTab !== "best" && results.length > 0 && godMarket && (
            <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginBottom: "5px" }}>
                ⚡ TOP MARKET
              </div>
              <div
                onClick={() => { onSelectMarket?.(godMarket.market.symbol); setOpen(false); }}
                style={{
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.35)",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: "#22c55e" }}>
                    {godMarket.market.label}
                  </div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", marginTop: "2px" }}>
                    {activeTab === "evenodd"
                      ? godMarket.evenScore > godMarket.oddScore ? "EVEN" : "ODD"
                      : `${activeTab.toUpperCase()} ${barrier}`}{" "}
                    · score +{getScore(godMarket).toFixed(1)}
                  </div>
                </div>
                <div
                  style={{
                    background: "#22c55e",
                    color: "black",
                    padding: "4px 9px",
                    borderRadius: "7px",
                    fontSize: "10px",
                    fontWeight: 700,
                  }}
                >
                  USE
                </div>
              </div>
            </div>
          )}

          {/* Rankings list */}
          <div style={{ maxHeight: "220px", overflowY: "auto", padding: "6px 12px 12px" }}>
            {scanning && results.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "18px",
                  color: "rgba(255,255,255,0.35)",
                  fontSize: "12px",
                }}
              >
                Scanning markets...
              </div>
            )}
            {ranked.map((r, idx) => {
              const score = getScore(r);
              const isThreshold = activeTab === "best" && r.bestSignal?.meetsThreshold;
              return (
                <div
                  key={r.market.symbol}
                  onClick={() => { onSelectMarket?.(r.market.symbol); setOpen(false); }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 9px",
                    borderRadius: "9px",
                    marginBottom: "3px",
                    background: isThreshold
                      ? "rgba(34,197,94,0.07)"
                      : idx === 0
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(255,255,255,0.02)",
                    cursor: "pointer",
                    border: isThreshold
                      ? "1px solid rgba(34,197,94,0.2)"
                      : idx === 0
                      ? "1px solid rgba(255,255,255,0.08)"
                      : "1px solid transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background:
                          isThreshold ? "#22c55e" : idx === 0 ? "#f59e0b" : "#374151",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "9px",
                        fontWeight: 700,
                        color: idx < 2 || isThreshold ? "black" : "white",
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)" }}>
                        {r.market.label}
                      </div>
                      {activeTab === "best" && r.bestSignal && (
                        <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", marginTop: "1px" }}>
                          {r.bestSignal.trade}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        color: isThreshold ? "#22c55e" : sigColor(score),
                        fontWeight: 600,
                      }}
                    >
                      {sigLabel(r)}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: isThreshold ? "#22c55e" : score > 0 ? "#a5b4fc" : "#6b7280",
                      }}
                    >
                      {activeTab === "best"
                        ? `${score.toFixed(1)}%`
                        : `${score > 0 ? "+" : ""}${score.toFixed(1)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div
            style={{
              padding: "8px 14px",
              fontSize: "10px",
              color: "rgba(255,255,255,0.2)",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Under/Over threshold: 90% · Even/Odd: 60%</span>
            <span>{voiceEnabled ? "🔊 Voice on" : "🔇 Voice off"}</span>
          </div>
        </div>
      )}

      {/* ── Floating button ─────────────────────────────────────────────── */}
      <div
        onMouseDown={onMouseDown}
        onClick={handleClick}
        style={{
          width: "58px",
          height: "58px",
          borderRadius: "50%",
          background: hasThresholdSignals
            ? "linear-gradient(135deg,#16a34a,#22c55e)"
            : "linear-gradient(135deg,#6366f1,#8b5cf6)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "grab",
          boxShadow: hasThresholdSignals
            ? "0 0 0 3px rgba(34,197,94,0.4), 0 6px 24px rgba(34,197,94,0.5)"
            : open
            ? "0 0 0 3px rgba(99,102,241,0.4), 0 6px 24px rgba(99,102,241,0.5)"
            : "0 4px 20px rgba(99,102,241,0.5)",
          border: "2px solid rgba(255,255,255,0.18)",
          transition: "all 0.3s",
          animation: hasThresholdSignals ? "scan-pulse 2s infinite" : "none",
        }}
      >
        <div style={{ fontSize: "22px", lineHeight: 1 }}>🤖</div>
        <div style={{ fontSize: "8px", fontWeight: 700, color: "white", letterSpacing: "0.03em", marginTop: "2px" }}>
          {hasThresholdSignals ? "FIRE!" : "SCAN"}
        </div>
      </div>

      <style>{`
        @keyframes scan-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(34,197,94,0.4), 0 6px 24px rgba(34,197,94,0.5); }
          50%       { box-shadow: 0 0 0 8px rgba(34,197,94,0.15), 0 6px 32px rgba(34,197,94,0.7); }
        }
      `}</style>
    </div>
  );
}
