import { useState } from "react";
import type { DigitStats } from "../types";
import { useTheme } from "../contexts/ThemeContext";

type Props = { stats: DigitStats };

const BARRIERS = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Per-barrier GOD MARKET logic:
 *
 * Over 7/8  → REVERSAL: digits above barrier are underrepresented (due)
 * Over 5/6  → REVERSAL: same
 * Over 3/4  → TREND: digits 0,1,2 are LEAST appearing (most digits fall above 3)
 * Over 1/2  → REVERSAL
 *
 * Under 5/6 → TREND: digits 0,1,2,3 are MOST appearing; digits above 4 are LEAST
 * Under 1-4 / 7-8 → REVERSAL
 */
function getLogicType(tradeType: "over" | "under", barrier: number): "reversal" | "trend-up" | "trend-down" {
  if (tradeType === "over" && (barrier === 3 || barrier === 4)) return "trend-up";
  if (tradeType === "under" && (barrier === 5 || barrier === 6)) return "trend-down";
  return "reversal";
}

function computeMetrics(
  tradeType: "over" | "under",
  barrier: number,
  stats: DigitStats
) {
  const total = Math.max(stats.total, 1);
  const logic = getLogicType(tradeType, barrier);

  if (tradeType === "over") {
    if (logic === "trend-up") {
      // Over 3/4: least appearing = digits 0,1,2
      const lowDigits = [0, 1, 2];
      const lowCount = lowDigits.reduce((s, d) => s + stats.counts[d], 0);
      const lowPct = ((lowCount / total) * 100).toFixed(1);
      const edge = (30 - parseFloat(lowPct)).toFixed(1); // positive = 0-2 are rare = upward trend
      const targetPct = ((stats.counts.slice(barrier + 1).reduce((a, b) => a + b, 0) / total) * 100).toFixed(1);
      const conditionMet = parseFloat(edge) > 0;
      return { lowPct, edge, conditionMet, targetPct, logic };
    }
    // REVERSAL: digits above barrier underrepresented
    const targetDigits = Array.from({ length: 10 }, (_, i) => i).filter((d) => d > barrier);
    const targetCount = targetDigits.reduce((s, d) => s + stats.counts[d], 0);
    const targetPct = ((targetCount / total) * 100).toFixed(1);
    const expected = ((targetDigits.length / 10) * 100).toFixed(0);
    const edge = (parseFloat(expected) - parseFloat(targetPct)).toFixed(1);
    const conditionMet = parseFloat(edge) > 0;
    return { targetPct, expected, edge, conditionMet, logic };
  } else {
    if (logic === "trend-down") {
      // Under 5/6: digits 0,1,2,3 most appearing; digits >4 least
      const lowDigits = [0, 1, 2, 3];
      const highDigits = [5, 6, 7, 8, 9];
      const lowCount = lowDigits.reduce((s, d) => s + stats.counts[d], 0);
      const highCount = highDigits.reduce((s, d) => s + stats.counts[d], 0);
      const lowPct = ((lowCount / total) * 100).toFixed(1);
      const highPct = ((highCount / total) * 100).toFixed(1);
      const edgeLow = (parseFloat(lowPct) - 40).toFixed(1); // positive = 0-3 appear more
      const edgeHigh = (50 - parseFloat(highPct)).toFixed(1); // positive = 5-9 appear less
      const conditionMet = parseFloat(edgeLow) > 0 && parseFloat(edgeHigh) > 0;
      return { lowPct, highPct, edgeLow, edgeHigh, conditionMet, logic };
    }
    // REVERSAL: digits below barrier underrepresented
    const targetDigits = Array.from({ length: 10 }, (_, i) => i).filter((d) => d < barrier);
    const targetCount = targetDigits.reduce((s, d) => s + stats.counts[d], 0);
    const targetPct = ((targetCount / total) * 100).toFixed(1);
    const expected = ((targetDigits.length / 10) * 100).toFixed(0);
    const edge = (parseFloat(expected) - parseFloat(targetPct)).toFixed(1);
    const conditionMet = parseFloat(edge) > 0;
    return { targetPct, expected, edge, conditionMet, logic };
  }
}

function LogicBadge({ type }: { type: "reversal" | "trend-up" | "trend-down" }) {
  const map = {
    reversal: { label: "REVERSAL", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
    "trend-up": { label: "TREND ↑", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
    "trend-down": { label: "TREND ↓", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  };
  const s = map[type];
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        padding: "2px 7px",
        borderRadius: "6px",
        border: `1px solid ${s.color}44`,
        letterSpacing: "0.05em",
      }}
    >
      {s.label}
    </span>
  );
}

export default function OverUnderAnalysis({ stats }: Props) {
  const [barrier, setBarrier] = useState(5);
  const [activeView, setActiveView] = useState<"chart" | "explain">("chart");
  const { theme } = useTheme();

  const overMetrics = computeMetrics("over", barrier, stats);
  const underMetrics = computeMetrics("under", barrier, stats);

  // Determine which signal is stronger for the recommendation
  const overEdgeNum = parseFloat(overMetrics.edge ?? overMetrics.edgeLow ?? "0");
  const underEdgeNum = parseFloat(underMetrics.edge ?? underMetrics.edgeLow ?? "0");
  const overValid = overMetrics.conditionMet;
  const underValid = underMetrics.conditionMet;

  const recommendation =
    overValid && overEdgeNum >= underEdgeNum
      ? { label: `OVER ${barrier} SIGNAL`, color: "#3b82f6", desc: getOverDesc(barrier, overMetrics) }
      : underValid
      ? { label: `UNDER ${barrier} SIGNAL`, color: "#a855f7", desc: getUnderDesc(barrier, underMetrics) }
      : { label: "NO CLEAR SIGNAL", color: "#6b7280", desc: "Conditions not met on current market" };

  function getOverDesc(b: number, m: typeof overMetrics): string {
    if (m.logic === "trend-up") return `Digits 0,1,2 rare (${m.lowPct}%) — most digits above ${b}`;
    return `Digits ${b + 1}–9 underrepresented at ${m.targetPct}% (expected ~${m.expected}%)`;
  }

  function getUnderDesc(b: number, m: typeof underMetrics): string {
    if (m.logic === "trend-down") return `Digits 0–3 dominating (${m.lowPct}%), digits 5–9 rare (${m.highPct}%)`;
    return `Digits 0–${b - 1} underrepresented at ${m.targetPct}% (expected ~${m.expected}%)`;
  }

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
      {/* Title + toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, color: theme.text }}>Over / Under Analysis</h3>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["chart", "explain"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              style={{
                padding: "4px 10px",
                borderRadius: "8px",
                border: "none",
                background: activeView === v ? "#6366f1" : theme.cardInner,
                color: activeView === v ? "white" : theme.text,
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              {v === "chart" ? "Chart" : "Logic"}
            </button>
          ))}
        </div>
      </div>

      {/* Barrier selector */}
      <div style={{ display: "flex", gap: "5px", marginBottom: "14px", flexWrap: "wrap" }}>
        {BARRIERS.map((b) => {
          const overLogic = getLogicType("over", b);
          const isSelected = barrier === b;
          const accent = overLogic === "trend-up" ? "#22c55e" : "#6366f1";
          return (
            <button
              key={b}
              onClick={() => setBarrier(b)}
              style={{
                padding: "5px 10px",
                borderRadius: "8px",
                border: `1px solid ${isSelected ? accent : "transparent"}`,
                background: isSelected ? `${accent}22` : theme.cardInner,
                color: isSelected ? accent : theme.textMid,
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: isSelected ? 700 : 400,
                transition: "all 0.15s",
              }}
              title={
                getLogicType("over", b) === "trend-up"
                  ? "Over 3/4: TREND logic"
                  : "Reversal logic"
              }
            >
              {b}
            </button>
          );
        })}
      </div>

      {/* Logic type badges */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: theme.textSub }}>Logic:</span>
        <span style={{ fontSize: "11px", color: theme.textSub }}>Over</span>
        <LogicBadge type={getLogicType("over", barrier)} />
        <span style={{ fontSize: "11px", color: theme.textSub }}>Under</span>
        <LogicBadge type={getLogicType("under", barrier)} />
      </div>

      {activeView === "chart" ? (
        <>
          {/* Metric cards */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
            {/* Over card */}
            <div
              style={{
                background: theme.cardInner,
                padding: "12px",
                borderRadius: "14px",
                flex: 1,
                border: overValid ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
              }}
            >
              <p style={{ fontSize: "11px", color: theme.textSub, marginBottom: "4px" }}>
                Over {barrier}
              </p>
              {overMetrics.logic === "trend-up" ? (
                <>
                  <h2 style={{ fontSize: "22px", fontWeight: 700, color: overValid ? "#22c55e" : theme.text }}>
                    {overMetrics.lowPct}%
                  </h2>
                  <div style={{ fontSize: "10px", color: theme.textSub, marginTop: "2px" }}>
                    digits 0,1,2 appear
                  </div>
                  <div style={{ fontSize: "11px", color: overValid ? "#22c55e" : "#ef4444", fontWeight: 600, marginTop: "3px" }}>
                    {overValid ? `−${overMetrics.edge}% RARE ✓` : `+${Math.abs(parseFloat(overMetrics.edge ?? "0")).toFixed(1)}% HIGH ✗`}
                  </div>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: "22px", fontWeight: 700, color: overValid ? "#60a5fa" : theme.text }}>
                    {overMetrics.targetPct}%
                  </h2>
                  <div style={{ fontSize: "10px", color: theme.textSub, marginTop: "2px" }}>
                    digits {barrier + 1}–9
                  </div>
                  <div style={{ fontSize: "11px", color: overValid ? "#22c55e" : "#ef4444", fontWeight: 600, marginTop: "3px" }}>
                    {overValid ? `+${overMetrics.edge}% DUE ✓` : `${overMetrics.edge}% SAT ✗`}
                  </div>
                </>
              )}
            </div>

            {/* Under card */}
            <div
              style={{
                background: theme.cardInner,
                padding: "12px",
                borderRadius: "14px",
                flex: 1,
                border: underValid ? "1px solid rgba(168,85,247,0.4)" : "1px solid transparent",
              }}
            >
              <p style={{ fontSize: "11px", color: theme.textSub, marginBottom: "4px" }}>
                Under {barrier}
              </p>
              {underMetrics.logic === "trend-down" ? (
                <>
                  <h2 style={{ fontSize: "22px", fontWeight: 700, color: underValid ? "#22c55e" : theme.text }}>
                    {underMetrics.lowPct}%
                  </h2>
                  <div style={{ fontSize: "10px", color: theme.textSub, marginTop: "2px" }}>
                    digits 0–3 appear
                  </div>
                  <div style={{ fontSize: "11px", color: underValid ? "#22c55e" : "#ef4444", fontWeight: 600, marginTop: "3px" }}>
                    {underValid ? `${underMetrics.edgeLow}% TREND ✓` : "Conditions not met ✗"}
                  </div>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: "22px", fontWeight: 700, color: underValid ? "#c084fc" : theme.text }}>
                    {underMetrics.targetPct}%
                  </h2>
                  <div style={{ fontSize: "10px", color: theme.textSub, marginTop: "2px" }}>
                    digits 0–{barrier - 1}
                  </div>
                  <div style={{ fontSize: "11px", color: underValid ? "#22c55e" : "#ef4444", fontWeight: 600, marginTop: "3px" }}>
                    {underValid ? `+${underMetrics.edge}% DUE ✓` : `${underMetrics.edge}% SAT ✗`}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Digit circles */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "11px", color: theme.textSub, marginBottom: "6px" }}>
              Digit distribution — active: {stats.lastDigit}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", justifyContent: "center" }}>
              {Array.from({ length: 10 }, (_, i) => {
                const isActive = i === stats.lastDigit;
                const isOver = i > barrier;
                const isUnder = i < barrier;
                const isBarrierDigit = i === barrier;

                // Highlight special digits based on logic
                let bg = isOver ? "rgba(29,78,216,0.25)" : isUnder ? "rgba(124,58,237,0.25)" : "rgba(55,65,81,0.4)";
                let border = "2px solid transparent";

                // Over 3/4 logic: highlight digits 0,1,2 specially (they should be rare)
                if ((barrier === 3 || barrier === 4) && i < 3) {
                  bg = "rgba(239,68,68,0.2)";
                  border = "2px solid rgba(239,68,68,0.4)";
                }
                // Under 5/6 logic: highlight 0-3 (should be most) and 5-9 (should be least)
                if ((barrier === 5 || barrier === 6)) {
                  if (i <= 3) { bg = "rgba(34,197,94,0.2)"; border = "2px solid rgba(34,197,94,0.3)"; }
                  else if (i >= 5) { bg = "rgba(239,68,68,0.15)"; border = "2px solid rgba(239,68,68,0.25)"; }
                }

                if (isActive) {
                  bg = isOver ? "#1d4ed8" : isUnder ? "#7c3aed" : "#374151";
                  border = isOver ? "2px solid #60a5fa" : isUnder ? "2px solid #c084fc" : "2px solid #9ca3af";
                }
                if (isBarrierDigit && !isActive) border = "2px dashed #6b7280";

                return (
                  <div
                    key={i}
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      fontWeight: 700,
                      fontSize: "12px",
                      background: bg,
                      border,
                      boxShadow: isActive ? "0 0 10px rgba(99,102,241,0.4)" : "none",
                      transition: "all 0.3s",
                    }}
                  >
                    {i}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* Logic explanation view */
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: "14px",
              padding: "14px",
              fontSize: "12px",
              lineHeight: 1.7,
              color: theme.text,
            }}
          >
            <div style={{ fontWeight: 700, color: "#60a5fa", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
              Over {barrier} <LogicBadge type={getLogicType("over", barrier)} />
            </div>
            {getLogicType("over", barrier) === "trend-up" ? (
              <>
                Win if digit &gt; {barrier} (digits {barrier + 1}–9).<br />
                GOD MARKET = digits <strong>0, 1, 2 are LEAST appearing</strong> (rare).<br />
                This means most digits fall above {barrier} — strong upward trend.<br />
                Currently: digits 0,1,2 = {overMetrics.lowPct}% (target: &lt;30%) →{" "}
                <span style={{ color: overMetrics.conditionMet ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                  {overMetrics.conditionMet ? `✓ CONDITION MET (edge: ${overMetrics.edge}%)` : "✗ CONDITION NOT MET"}
                </span>
              </>
            ) : (
              <>
                Win if digit &gt; {barrier} (digits {barrier + 1}–9).<br />
                GOD MARKET = digits {barrier + 1}–9 are <strong>LEAST appearing</strong> (underrepresented → reversal due).<br />
                Currently: {overMetrics.targetPct}% vs expected {overMetrics.expected}% →{" "}
                <span style={{ color: overMetrics.conditionMet ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                  {overMetrics.conditionMet ? `✓ DUE +${overMetrics.edge}%` : `✗ SATURATED ${overMetrics.edge}%`}
                </span>
              </>
            )}
          </div>

          <div
            style={{
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: "14px",
              padding: "14px",
              fontSize: "12px",
              lineHeight: 1.7,
              color: theme.text,
            }}
          >
            <div style={{ fontWeight: 700, color: "#c084fc", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
              Under {barrier} <LogicBadge type={getLogicType("under", barrier)} />
            </div>
            {getLogicType("under", barrier) === "trend-down" ? (
              <>
                Win if digit &lt; {barrier} (digits 0–{barrier - 1}).<br />
                GOD MARKET = digits <strong>0,1,2,3 are MOST appearing</strong> AND digits <strong>5–9 are LEAST appearing</strong>.<br />
                Currently: digits 0–3 = {underMetrics.lowPct}% (target: &gt;40%) | digits 5–9 = {underMetrics.highPct}% (target: &lt;50%) →{" "}
                <span style={{ color: underMetrics.conditionMet ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                  {underMetrics.conditionMet ? "✓ BOTH CONDITIONS MET" : "✗ CONDITIONS NOT MET"}
                </span>
              </>
            ) : (
              <>
                Win if digit &lt; {barrier} (digits 0–{barrier - 1}).<br />
                GOD MARKET = digits 0–{barrier - 1} are <strong>LEAST appearing</strong> (underrepresented → reversal due).<br />
                Currently: {underMetrics.targetPct}% vs expected {underMetrics.expected}% →{" "}
                <span style={{ color: underMetrics.conditionMet ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                  {underMetrics.conditionMet ? `✓ DUE +${underMetrics.edge}%` : `✗ SATURATED ${underMetrics.edge}%`}
                </span>
              </>
            )}
          </div>

          {/* All barrier logic summary */}
          <div
            style={{
              background: theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
              borderRadius: "12px",
              padding: "12px",
              fontSize: "11px",
              color: theme.textMid,
              lineHeight: 1.8,
            }}
          >
            <div style={{ fontWeight: 600, color: theme.textMid, marginBottom: "4px" }}>Quick reference:</div>
            Over 3/4 → <span style={{ color: "#22c55e" }}>Trend: digits 0,1,2 must be LEAST</span><br />
            Over 5–8 → <span style={{ color: "#8b5cf6" }}>Reversal: digits above barrier underrepresented</span><br />
            Under 5/6 → <span style={{ color: "#3b82f6" }}>Trend: digits 0–3 MOST, digits 5–9 LEAST</span><br />
            Under 1–4 / 7–8 → <span style={{ color: "#8b5cf6" }}>Reversal: digits below barrier underrepresented</span>
          </div>
        </div>
      )}

      {/* Recommendation */}
      <div
        style={{
          padding: "12px",
          borderRadius: "14px",
          textAlign: "center",
          marginTop: "10px",
          background: `${recommendation.color}20`,
          border: `1px solid ${recommendation.color}44`,
        }}
      >
        <div style={{ fontWeight: 700, color: recommendation.color, fontSize: "14px" }}>
          {recommendation.label}
        </div>
        <div style={{ fontSize: "11px", color: theme.textMid, marginTop: "3px" }}>
          {recommendation.desc}
        </div>
      </div>
    </div>
  );
}
