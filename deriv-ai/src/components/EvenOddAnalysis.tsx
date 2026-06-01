import { useTheme } from "../contexts/ThemeContext";
import type { DigitStats } from "../types";

type Props = { stats: DigitStats };

function PercentBar({ value, color }: { value: number; color: string }) {
  const { theme } = useTheme();
  return (
    <div
      style={{
        width: "100%",
        height: "6px",
        background: theme.barTrack,
        borderRadius: "10px",
        marginTop: "8px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${value}%`,
          background: color,
          borderRadius: "10px",
          transition: "width 0.5s ease",
        }}
      />
    </div>
  );
}

export default function EvenOddAnalysis({ stats }: Props) {
  const { theme } = useTheme();
  const isEvenStrong = stats.evenPercent >= stats.oddPercent;
  const evenEdge = (50 - stats.evenPercent).toFixed(1);
  const oddEdge = (50 - stats.oddPercent).toFixed(1);
  const evenDue = parseFloat(evenEdge) > 0;
  const oddDue = parseFloat(oddEdge) > 0;

  const evenDigits = [0, 2, 4, 6, 8];
  const oddDigits = [1, 3, 5, 7, 9];

  return (
    <div
      style={{
        background: theme.card,
        borderRadius: "24px",
        padding: "22px",
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadow,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h3 style={{ marginBottom: "18px", fontSize: "18px", fontWeight: 600, color: theme.text }}>
        Even / Odd Analysis
      </h3>

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <div
          style={{
            background: theme.cardInner,
            padding: "18px 16px",
            borderRadius: "18px",
            flex: 1,
            textAlign: "center",
            border: evenDue ? "1px solid rgba(34,197,94,0.4)" : isEvenStrong ? "1px solid rgba(34,197,94,0.15)" : "1px solid transparent",
          }}
        >
          <p style={{ fontSize: "11px", color: theme.textMid, marginBottom: "4px" }}>Even</p>
          <h2 style={{ fontSize: "28px", fontWeight: 700, color: isEvenStrong ? "#22c55e" : theme.text }}>
            {stats.evenPercent}%
          </h2>
          <div
            style={{
              fontSize: "11px",
              color: evenDue ? "#22c55e" : "#ef4444",
              fontWeight: 600,
              marginTop: "4px",
            }}
          >
            {evenDue ? `+${evenEdge}% DUE` : `${evenEdge}% SATURATED`}
          </div>
          <PercentBar value={stats.evenPercent} color="#22c55e" />
        </div>

        <div
          style={{
            background: theme.cardInner,
            padding: "18px 16px",
            borderRadius: "18px",
            flex: 1,
            textAlign: "center",
            border: oddDue ? "1px solid rgba(249,115,22,0.4)" : !isEvenStrong ? "1px solid rgba(249,115,22,0.15)" : "1px solid transparent",
          }}
        >
          <p style={{ fontSize: "11px", color: theme.textMid, marginBottom: "4px" }}>Odd</p>
          <h2 style={{ fontSize: "28px", fontWeight: 700, color: !isEvenStrong ? "#f97316" : theme.text }}>
            {stats.oddPercent}%
          </h2>
          <div
            style={{
              fontSize: "11px",
              color: oddDue ? "#22c55e" : "#ef4444",
              fontWeight: 600,
              marginTop: "4px",
            }}
          >
            {oddDue ? `+${oddEdge}% DUE` : `${oddEdge}% SATURATED`}
          </div>
          <PercentBar value={stats.oddPercent} color="#f97316" />
        </div>
      </div>

      {/* Per-digit breakdown */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "11px", color: theme.textSub, marginBottom: "6px" }}>
          Digit breakdown
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {Array.from({ length: 10 }, (_, i) => {
            const isEven = evenDigits.includes(i);
            const isActive = i === stats.lastDigit;
            const pct = parseFloat(stats.percentages[i]);
            const height = Math.max(8, Math.min(48, pct * 4));
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                <div style={{ fontSize: "9px", color: theme.textSub }}>{pct.toFixed(0)}%</div>
                <div
                  style={{
                    width: "100%",
                    height: `${height}px`,
                    borderRadius: "4px",
                    background: isActive
                      ? (theme.isDark ? "#fff" : "#0f172a")
                      : isEven ? "#22c55e" : "#f97316",
                    opacity: isActive ? 1 : 0.7,
                    transition: "height 0.4s ease",
                    boxShadow: isActive ? "0 0 8px rgba(99,102,241,0.5)" : "none",
                  }}
                />
                <div style={{ fontSize: "9px", color: theme.textMid, fontWeight: isActive ? 700 : 400 }}>{i}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "6px", fontSize: "10px" }}>
          <span style={{ color: "#22c55e" }}>■ Even (0,2,4,6,8)</span>
          <span style={{ color: "#f97316" }}>■ Odd (1,3,5,7,9)</span>
        </div>
      </div>

      {/* Even/Odd blend bar */}
      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            height: "8px",
            borderRadius: "10px",
            background: `linear-gradient(to right, #22c55e ${stats.evenPercent}%, #f97316 ${stats.evenPercent}%)`,
            transition: "all 0.5s ease",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: theme.textLow, marginTop: "4px" }}>
          <span>Even {stats.evenPercent}%</span>
          <span>Odd {stats.oddPercent}%</span>
        </div>
      </div>

      {/* Signal box */}
      <div
        style={{
          padding: "16px",
          borderRadius: "18px",
          textAlign: "center",
          marginTop: "auto",
          background: "linear-gradient(135deg,#ff444f,#ff9a3c)",
          fontWeight: 700,
          fontSize: "15px",
          letterSpacing: "0.02em",
          boxShadow: "0 4px 20px rgba(255,68,79,0.3)",
          color: "white",
        }}
      >
        {stats.signal}
      </div>

      {/* Reversal hint */}
      <div
        style={{
          marginTop: "10px",
          padding: "10px 14px",
          background: theme.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
          borderRadius: "12px",
          fontSize: "11px",
          color: theme.textMid,
          textAlign: "center",
        }}
      >
        Reversal logic: {evenDue ? `Even digits (${evenDigits.join(",")}) are DUE (+${evenEdge}%)` : oddDue ? `Odd digits (${oddDigits.join(",")}) are DUE (+${oddEdge}%)` : "Distribution balanced — no edge"}
      </div>
    </div>
  );
}
