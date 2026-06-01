import type { WindowStats } from "../hooks/useHistoricalTicks";
import type { DigitStats } from "../types";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  w100: WindowStats;
  w500: WindowStats;
  w1000: WindowStats;
  live: DigitStats;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  onRefetch: () => void;
  marketLabel: string;
};

/** Map a digit percentage to a background color (blue=due, green=normal, red=saturated) */
function heatColor(pct: number): { bg: string; text: string; label: string } {
  if (pct < 6)   return { bg: "rgba(59,130,246,0.85)",  text: "white", label: "DUE" };
  if (pct < 8.5) return { bg: "rgba(99,102,241,0.55)",  text: "white", label: "LOW" };
  if (pct < 11.5) return { bg: "rgba(55,65,81,0.7)",    text: "rgba(255,255,255,0.8)", label: "OK" };
  if (pct < 14)  return { bg: "rgba(245,158,11,0.55)",  text: "white", label: "HIGH" };
  return           { bg: "rgba(239,68,68,0.8)",          text: "white", label: "HOT" };
}

const WINDOWS = [
  { key: "w100",  label: "Last 100",  count: 100 },
  { key: "w500",  label: "Last 500",  count: 500 },
  { key: "w1000", label: "Last 1000", count: 1000 },
  { key: "live",  label: "Live",      count: null },
] as const;

type WKey = "w100" | "w500" | "w1000" | "live";

function getStats(key: WKey, props: Props): WindowStats {
  if (key === "live") {
    return {
      counts: props.live.counts,
      total: props.live.total,
      percentages: props.live.percentages,
      topDigits: props.live.topDigits,
      bottomDigits: props.live.bottomDigits,
    };
  }
  return props[key];
}

export default function DigitsHeatmap(props: Props) {
  const { loading, error, lastFetched, onRefetch, marketLabel } = props;
  const { theme } = useTheme();

  return (
    <div
      style={{
        background: theme.card,
        borderRadius: "24px",
        padding: "22px",
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadow,
        gridColumn: "1 / -1",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 600, color: theme.text }}>Digit Frequency Heatmap</h3>
          <p style={{ fontSize: "12px", color: theme.textSub, marginTop: "3px" }}>
            {marketLabel} · Real Deriv data · {lastFetched ? `Fetched ${lastFetched.toLocaleTimeString()}` : "Loading..."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Legend */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {[
              { bg: "rgba(59,130,246,0.85)", label: "DUE" },
              { bg: "rgba(99,102,241,0.55)", label: "LOW" },
              { bg: "rgba(55,65,81,0.7)",    label: "OK" },
              { bg: "rgba(245,158,11,0.55)", label: "HIGH" },
              { bg: "rgba(239,68,68,0.8)",   label: "HOT" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: l.bg }} />
                <span style={{ fontSize: "10px", color: theme.textMid }}>{l.label}</span>
              </div>
            ))}
          </div>
          <button
            onClick={onRefetch}
            disabled={loading}
            style={{ background: theme.cardInner, border: `1px solid ${theme.borderHi}`, color: theme.text, padding: "6px 12px", borderRadius: "8px", cursor: loading ? "default" : "pointer", fontSize: "12px", fontWeight: 600, opacity: loading ? 0.5 : 1 }}
          >
            {loading ? "⟳ Loading..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", marginBottom: "14px", fontSize: "13px", color: "#ef4444" }}>
          ⚠ {error} — Showing live session data only.
        </div>
      )}

      {/* Heatmap grid */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "4px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", fontSize: "12px", color: theme.textSub, fontWeight: 600, padding: "0 8px 8px", width: "60px" }}>Digit</th>
              {WINDOWS.map((w) => {
                const stats = getStats(w.key, props);
                return (
                  <th key={w.key} style={{ textAlign: "center", padding: "0 4px 8px", minWidth: "100px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: theme.text }}>{w.label}</div>
                    <div style={{ fontSize: "10px", color: theme.textSub, marginTop: "2px" }}>
                      {w.key === "live" ? `${stats.total} ticks` : stats.total < (w.count ?? 0) ? `${stats.total}/${w.count}` : `${w.count} ticks`}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }, (_, digit) => {
              return (
                <tr key={digit}>
                  <td style={{ padding: "3px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: theme.cardInner, color: theme.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700 }}>
                        {digit}
                      </div>
                    </div>
                  </td>
                  {WINDOWS.map((w) => {
                    const stats = getStats(w.key, props);
                    const pct = parseFloat(stats.percentages[digit] ?? "0");
                    const count = stats.counts[digit] ?? 0;
                    const { bg, text, label } = heatColor(pct);
                    const isTop = stats.topDigits[0] === digit;
                    const isBot = stats.bottomDigits[0] === digit;

                    return (
                      <td key={w.key} style={{ padding: "3px" }}>
                        <div
                          style={{
                            background: loading && w.key !== "live" ? "rgba(55,65,81,0.3)" : bg,
                            borderRadius: "10px",
                            padding: "8px 6px",
                            textAlign: "center",
                            position: "relative",
                            border: isTop ? "2px solid rgba(34,197,94,0.6)" : isBot ? "2px solid rgba(59,130,246,0.6)" : "2px solid transparent",
                            transition: "all 0.4s ease",
                          }}
                        >
                          <div style={{ fontSize: "15px", fontWeight: 700, color: loading && w.key !== "live" ? "rgba(255,255,255,0.2)" : text }}>
                            {loading && w.key !== "live" ? "—" : `${pct.toFixed(1)}%`}
                          </div>
                          <div style={{ fontSize: "10px", color: loading && w.key !== "live" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.55)", marginTop: "2px" }}>
                            {loading && w.key !== "live" ? "" : `${count}×`}
                          </div>
                          {!loading && (isTop || isBot) && (
                            <div style={{ position: "absolute", top: "-1px", right: "3px", fontSize: "9px" }}>
                              {isTop ? "🔥" : "❄️"}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary row — top/bottom per window */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginTop: "16px" }}>
        {WINDOWS.map((w) => {
          const stats = getStats(w.key, props);
          if (stats.total === 0) return null;
          const topPct = parseFloat(stats.percentages[stats.topDigits[0]]);
          const botPct = parseFloat(stats.percentages[stats.bottomDigits[0]]);
          const deviation = (topPct - 10).toFixed(1);
          return (
            <div key={w.key} style={{ background: "#1f2937", borderRadius: "12px", padding: "10px 12px" }}>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "6px", fontWeight: 600 }}>{w.label}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>HOT</div>
                  <div style={{ color: "#ef4444", fontWeight: 700 }}>
                    {stats.topDigits[0]} · {stats.percentages[stats.topDigits[0]]}%
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>DUE</div>
                  <div style={{ color: "#60a5fa", fontWeight: 700 }}>
                    {stats.bottomDigits[0]} · {stats.percentages[stats.bottomDigits[0]]}%
                  </div>
                </div>
              </div>
              <div style={{ marginTop: "6px", fontSize: "10px", color: parseFloat(deviation) > 2 ? "#ef4444" : parseFloat(deviation) > 1 ? "#f59e0b" : "#22c55e" }}>
                Max deviation: +{deviation}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
