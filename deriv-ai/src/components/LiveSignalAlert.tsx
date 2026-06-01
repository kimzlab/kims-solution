import { useEffect, useRef, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import type { DigitStats } from "../types";

type Props = {
  stats: DigitStats;
};

type TradeAlert = {
  id: string;
  label: string;
  shortLabel: string;
  pct: number;
  overThreshold: boolean;
  color: string;
  bg: string;
  glow: string;
  category: "under" | "over" | "even" | "odd";
};

const THRESHOLD = 90;

function buildAlerts(stats: DigitStats): TradeAlert[] {
  const { counts, total, evenPercent, oddPercent } = stats;
  if (total < 20) return [];

  const sum = (from: number, to: number) =>
    counts.slice(from, to + 1).reduce((a, b) => a + b, 0);
  const pct = (n: number) => parseFloat(((n / total) * 100).toFixed(1));

  return [
    {
      id: "under6",
      label: "UNDER 6",
      shortLabel: "U6",
      pct: pct(sum(0, 5)),
      overThreshold: pct(sum(0, 5)) >= THRESHOLD,
      color: "#22c55e",
      bg: "rgba(34,197,94,0.12)",
      glow: "0 0 30px rgba(34,197,94,0.5), 0 0 60px rgba(34,197,94,0.2)",
      category: "under",
    },
    {
      id: "under7",
      label: "UNDER 7",
      shortLabel: "U7",
      pct: pct(sum(0, 6)),
      overThreshold: pct(sum(0, 6)) >= THRESHOLD,
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.12)",
      glow: "0 0 30px rgba(59,130,246,0.5), 0 0 60px rgba(59,130,246,0.2)",
      category: "under",
    },
    {
      id: "under8",
      label: "UNDER 8",
      shortLabel: "U8",
      pct: pct(sum(0, 7)),
      overThreshold: pct(sum(0, 7)) >= THRESHOLD,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.12)",
      glow: "0 0 30px rgba(245,158,11,0.5), 0 0 60px rgba(245,158,11,0.2)",
      category: "under",
    },
    {
      id: "under5",
      label: "UNDER 5",
      shortLabel: "U5",
      pct: pct(sum(0, 4)),
      overThreshold: pct(sum(0, 4)) >= THRESHOLD,
      color: "#10b981",
      bg: "rgba(16,185,129,0.12)",
      glow: "0 0 30px rgba(16,185,129,0.5), 0 0 60px rgba(16,185,129,0.2)",
      category: "under",
    },
    {
      id: "over4",
      label: "OVER 4",
      shortLabel: "O4",
      pct: pct(sum(5, 9)),
      overThreshold: pct(sum(5, 9)) >= THRESHOLD,
      color: "#ec4899",
      bg: "rgba(236,72,153,0.12)",
      glow: "0 0 30px rgba(236,72,153,0.5), 0 0 60px rgba(236,72,153,0.2)",
      category: "over",
    },
    {
      id: "over3",
      label: "OVER 3",
      shortLabel: "O3",
      pct: pct(sum(4, 9)),
      overThreshold: pct(sum(4, 9)) >= THRESHOLD,
      color: "#f43f5e",
      bg: "rgba(244,63,94,0.12)",
      glow: "0 0 30px rgba(244,63,94,0.5), 0 0 60px rgba(244,63,94,0.2)",
      category: "over",
    },
    {
      id: "over2",
      label: "OVER 2",
      shortLabel: "O2",
      pct: pct(sum(3, 9)),
      overThreshold: pct(sum(3, 9)) >= THRESHOLD,
      color: "#fb923c",
      bg: "rgba(251,146,60,0.12)",
      glow: "0 0 30px rgba(251,146,60,0.5), 0 0 60px rgba(251,146,60,0.2)",
      category: "over",
    },
    {
      id: "over1",
      label: "OVER 1",
      shortLabel: "O1",
      pct: pct(sum(2, 9)),
      overThreshold: pct(sum(2, 9)) >= THRESHOLD,
      color: "#fb7185",
      bg: "rgba(251,113,133,0.12)",
      glow: "0 0 30px rgba(251,113,133,0.5), 0 0 60px rgba(251,113,133,0.2)",
      category: "over",
    },
    {
      id: "even",
      label: "EVEN",
      shortLabel: "EVN",
      pct: evenPercent,
      overThreshold: evenPercent >= 60,
      color: "#06b6d4",
      bg: "rgba(6,182,212,0.12)",
      glow: "0 0 30px rgba(6,182,212,0.5), 0 0 60px rgba(6,182,212,0.2)",
      category: "even",
    },
    {
      id: "odd",
      label: "ODD",
      shortLabel: "ODD",
      pct: oddPercent,
      overThreshold: oddPercent >= 60,
      color: "#f97316",
      bg: "rgba(249,115,22,0.12)",
      glow: "0 0 30px rgba(249,115,22,0.5), 0 0 60px rgba(249,115,22,0.2)",
      category: "odd",
    },
  ];
}

export default function LiveSignalAlert({ stats }: Props) {
  const { theme } = useTheme();
  const alerts = buildAlerts(stats);
  const fired = alerts.filter((a) => a.overThreshold);

  // Track newly fired signals for flash animation
  const prevFiredIds = useRef<Set<string>>(new Set());
  const [newlyFired, setNewlyFired] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(fired.map((f) => f.id));
    const justFired = new Set<string>();
    currentIds.forEach((id) => {
      if (!prevFiredIds.current.has(id)) justFired.add(id);
    });
    prevFiredIds.current = currentIds;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (justFired.size > 0) {
      setNewlyFired(justFired);
      t = setTimeout(() => setNewlyFired(new Set()), 2000);
    }
    return () => { if (t !== undefined) clearTimeout(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fired.map((f) => f.id).join(",")]);

  if (stats.total < 20) return null;

  return (
    <div style={{ marginBottom: "18px" }}>
      {/* Live fired alerts */}
      {fired.length > 0 && (
        <div
          style={{
            borderRadius: "20px",
            padding: "16px 20px",
            marginBottom: "12px",
            background: "rgba(0,0,0,0.4)",
            border: `1px solid ${fired[0].color}55`,
            boxShadow: fired[0].glow,
            animation: "alert-entrance 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {/* Pulsing dot */}
            <div style={{ position: "relative", width: "14px", height: "14px", flexShrink: 0 }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "#22c55e",
                  animation: "live-dot 1.2s infinite",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "-4px",
                  borderRadius: "50%",
                  border: "2px solid rgba(34,197,94,0.4)",
                  animation: "live-ring 1.2s infinite",
                }}
              />
            </div>

            <div style={{ fontSize: "13px", fontWeight: 700, color: "#22c55e", letterSpacing: "0.08em" }}>
              🔴 LIVE SIGNAL — TRADE NOW
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {fired.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "10px",
                    background: a.bg,
                    border: `1px solid ${a.color}55`,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    animation: newlyFired.has(a.id) ? "new-signal-flash 0.5s 3" : "none",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 800, color: a.color }}>
                    {a.label}
                  </span>
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "white",
                      background: a.color,
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {a.pct.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: a.color }}>
                    ≥{THRESHOLD}%
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginLeft: "auto",
                fontSize: "11px",
                color: theme.textSub,
                flexShrink: 0,
              }}
            >
              {stats.total} ticks sampled
            </div>
          </div>
        </div>
      )}

      {/* Progress tracker — all signals approaching threshold */}
      <div
        style={{
          background: theme.card,
          borderRadius: "16px",
          padding: "14px 18px",
          border: `1px solid ${theme.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: fired.length > 0 ? "#22c55e" : "#6366f1",
                animation: "pulse 1.5s infinite",
              }}
            />
            <span style={{ fontSize: "13px", fontWeight: 700, color: theme.text }}>
              Live 90% Threshold Tracker
            </span>
          </div>
          <span style={{ fontSize: "11px", color: theme.textSub }}>
            {fired.length > 0
              ? `⚡ ${fired.length} signal${fired.length > 1 ? "s" : ""} above threshold`
              : `Watching all barriers · ${stats.total} ticks`}
          </span>
        </div>

        {/* Progress bars grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "8px",
          }}
        >
          {alerts.map((a) => {
            const progress = Math.min((a.pct / THRESHOLD) * 100, 100);
            const isHot = a.pct >= 85;
            return (
              <div key={a.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: a.overThreshold ? a.color : isHot ? "#f59e0b" : theme.textMid,
                    }}
                  >
                    {a.label}
                    {a.overThreshold && " ✓"}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: a.overThreshold ? a.color : isHot ? "#f59e0b" : theme.textSub,
                    }}
                  >
                    {a.pct.toFixed(1)}%
                  </span>
                </div>
                <div
                  style={{
                    height: "6px",
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: "4px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {/* Threshold marker at 90% */}
                  <div
                    style={{
                      position: "absolute",
                      left: "90%",
                      top: 0,
                      bottom: 0,
                      width: "2px",
                      background: "rgba(255,255,255,0.25)",
                      zIndex: 2,
                    }}
                  />
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      background: a.overThreshold
                        ? a.color
                        : isHot
                        ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                        : `linear-gradient(90deg, ${a.color}55, ${a.color}88)`,
                      borderRadius: "4px",
                      transition: "width 0.5s ease",
                      boxShadow: a.overThreshold ? `0 0 8px ${a.color}` : "none",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: "10px",
            fontSize: "10px",
            color: theme.textSub,
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span>
            <span style={{ color: "#f59e0b" }}>●</span> &gt;85% approaching
          </span>
          <span>
            <span style={{ color: "#22c55e" }}>●</span> ≥90% FIRE signal
          </span>
          <span style={{ color: theme.textSub }}>
            White marker = 90% threshold line
          </span>
        </div>
      </div>

      <style>{`
        @keyframes live-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        @keyframes live-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes alert-entrance {
          0% { transform: translateY(-10px) scale(0.97); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes new-signal-flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
