import { useTheme } from "../contexts/ThemeContext";
import type { DigitStats } from "../types";

type Props = {
  stats: DigitStats;
};

type Strength = "VERY STRONG" | "STRONG" | "MODERATE" | "PRESENT" | "INACTIVE";

type SignalDef = {
  id: string;
  label: string;
  sublabel: string;
  active: boolean;
  confirmed: boolean; // both top AND bottom conditions met
  strength: Strength;
  matchCount: number;
  bottomMatchCount: number;
  activeColor: string;
  activeGlow: string;
  activeBg: string;
  icon: string;
};

const TOP_COLORS = ["#14532d", "#1d4ed8", "#0369a1"];
const BOTTOM_COLORS = ["#991b1b", "#ea580c", "#7f1d1d"];
const TOP_LABELS = ["1ST", "2ND", "3RD"];
const BOTTOM_LABELS = ["LOW1", "LOW2", "LOW3"];

function StrengthBars({ strength, color }: { strength: Strength; color: string }) {
  const n = { "VERY STRONG": 4, STRONG: 3, MODERATE: 2, PRESENT: 1, INACTIVE: 0 }[strength];
  return (
    <div style={{ display: "flex", gap: "3px", marginTop: "5px" }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: "18px",
            height: "5px",
            borderRadius: "3px",
            background: i < n ? color : "rgba(255,255,255,0.1)",
            transition: "background 0.3s",
          }}
        />
      ))}
    </div>
  );
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        color,
        textTransform: "uppercase",
        marginBottom: "10px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <div style={{ flex: 1, height: "1px", background: `${color}33` }} />
      {label}
      <div style={{ flex: 1, height: "1px", background: `${color}33` }} />
    </div>
  );
}

export default function TradingSignals({ stats }: Props) {
  const { theme } = useTheme();
  const top3 = stats.topDigits;
  const bottom3 = stats.bottomDigits;

  // ── UNDER signals ────────────────────────────────────────────────
  // Active when ALL top 3 digits are below the barrier
  // Confirmed when bottom 3 also validate (bottom 3 ≥ barrier, meaning digits ≥ barrier are cold)
  const underDefs: SignalDef[] = [
    {
      id: "under6",
      label: "UNDER 6",
      sublabel: "Digits 0–5",
      active: top3.every((d) => d < 6),
      confirmed: top3.every((d) => d < 6) && bottom3.every((d) => d >= 6),
      strength: top3.every((d) => d < 6) ? "VERY STRONG" : "INACTIVE",
      matchCount: top3.filter((d) => d < 6).length,
      bottomMatchCount: bottom3.filter((d) => d >= 6).length,
      activeColor: "#22c55e",
      activeGlow: "0 0 20px rgba(34,197,94,0.4), 0 0 40px rgba(34,197,94,0.15)",
      activeBg: "rgba(34,197,94,0.1)",
      icon: "🎯",
    },
    {
      id: "under7",
      label: "UNDER 7",
      sublabel: "Digits 0–6",
      active: top3.every((d) => d < 7),
      confirmed: top3.every((d) => d < 7) && bottom3.every((d) => d >= 7),
      strength: top3.every((d) => d < 7) ? "STRONG" : "INACTIVE",
      matchCount: top3.filter((d) => d < 7).length,
      bottomMatchCount: bottom3.filter((d) => d >= 7).length,
      activeColor: "#3b82f6",
      activeGlow: "0 0 20px rgba(59,130,246,0.4), 0 0 40px rgba(59,130,246,0.15)",
      activeBg: "rgba(59,130,246,0.1)",
      icon: "📈",
    },
    {
      id: "under8",
      label: "UNDER 8",
      sublabel: "Digits 0–7",
      active: top3.every((d) => d < 8),
      confirmed: top3.every((d) => d < 8) && bottom3.every((d) => d >= 8),
      strength: top3.every((d) => d < 8) ? "MODERATE" : "INACTIVE",
      matchCount: top3.filter((d) => d < 8).length,
      bottomMatchCount: bottom3.filter((d) => d >= 8).length,
      activeColor: "#f59e0b",
      activeGlow: "0 0 16px rgba(245,158,11,0.35), 0 0 32px rgba(245,158,11,0.12)",
      activeBg: "rgba(245,158,11,0.09)",
      icon: "📊",
    },
  ];

  // Prepend UNDER 5 as the most extreme under signal
  underDefs.unshift({
    id: "under5",
    label: "UNDER 5",
    sublabel: "Digits 0–4",
    active: top3.every((d) => d < 5),
    confirmed: top3.every((d) => d < 5) && bottom3.every((d) => d >= 5),
    strength: top3.every((d) => d < 5) ? "VERY STRONG" : "INACTIVE",
    matchCount: top3.filter((d) => d < 5).length,
    bottomMatchCount: bottom3.filter((d) => d >= 5).length,
    activeColor: "#10b981",
    activeGlow: "0 0 20px rgba(16,185,129,0.5), 0 0 40px rgba(16,185,129,0.2)",
    activeBg: "rgba(16,185,129,0.12)",
    icon: "💎",
  });

  // Update strength of remaining under signals (shifted down one notch)
  underDefs[1] = { ...underDefs[1], strength: underDefs[1].active ? "STRONG" : "INACTIVE" };
  underDefs[2] = { ...underDefs[2], strength: underDefs[2].active ? "MODERATE" : "INACTIVE" };
  underDefs[3] = { ...underDefs[3], strength: underDefs[3].active ? "PRESENT" : "INACTIVE" };

  // ── OVER signals ─────────────────────────────────────────────────
  // Active when ALL top 3 digits are above the barrier
  // Confirmed when bottom 3 also ≤ barrier (cold digits are the low ones)
  const overDefs: SignalDef[] = [
    {
      id: "over4",
      label: "OVER 4",
      sublabel: "Digits 5–9",
      active: top3.every((d) => d > 4),
      confirmed: top3.every((d) => d > 4) && bottom3.every((d) => d <= 4),
      strength: top3.every((d) => d > 4) ? "VERY STRONG" : "INACTIVE",
      matchCount: top3.filter((d) => d > 4).length,
      bottomMatchCount: bottom3.filter((d) => d <= 4).length,
      activeColor: "#ec4899",
      activeGlow: "0 0 20px rgba(236,72,153,0.4), 0 0 40px rgba(236,72,153,0.15)",
      activeBg: "rgba(236,72,153,0.1)",
      icon: "🎯",
    },
    {
      id: "over3",
      label: "OVER 3",
      sublabel: "Digits 4–9",
      active: top3.every((d) => d > 3),
      confirmed: top3.every((d) => d > 3) && bottom3.every((d) => d <= 3),
      strength: top3.every((d) => d > 3) ? "STRONG" : "INACTIVE",
      matchCount: top3.filter((d) => d > 3).length,
      bottomMatchCount: bottom3.filter((d) => d <= 3).length,
      activeColor: "#f43f5e",
      activeGlow: "0 0 20px rgba(244,63,94,0.4), 0 0 40px rgba(244,63,94,0.15)",
      activeBg: "rgba(244,63,94,0.1)",
      icon: "📈",
    },
    {
      id: "over2",
      label: "OVER 2",
      sublabel: "Digits 3–9",
      active: top3.every((d) => d > 2),
      confirmed: top3.every((d) => d > 2) && bottom3.every((d) => d <= 2),
      strength: top3.every((d) => d > 2) ? "MODERATE" : "INACTIVE",
      matchCount: top3.filter((d) => d > 2).length,
      bottomMatchCount: bottom3.filter((d) => d <= 2).length,
      activeColor: "#fb923c",
      activeGlow: "0 0 16px rgba(251,146,60,0.35), 0 0 32px rgba(251,146,60,0.12)",
      activeBg: "rgba(251,146,60,0.09)",
      icon: "📊",
    },
    {
      id: "over1",
      label: "OVER 1",
      sublabel: "Digits 2–9",
      active: top3.every((d) => d > 1),
      confirmed: top3.every((d) => d > 1) && bottom3.some((d) => d <= 1),
      strength: top3.every((d) => d > 1) ? "PRESENT" : "INACTIVE",
      matchCount: top3.filter((d) => d > 1).length,
      bottomMatchCount: bottom3.filter((d) => d <= 1).length,
      activeColor: "#fb7185",
      activeGlow: "0 0 14px rgba(251,113,133,0.3), 0 0 28px rgba(251,113,133,0.1)",
      activeBg: "rgba(251,113,133,0.09)",
      icon: "🔴",
    },
  ];

  // ── EVEN / ODD signals ────────────────────────────────────────────
  // EVEN: top 3 most-appearing digits are ALL even
  // ODD:  top 2 are odd  AND  bottom 3 (least-appearing) are ALL even
  const top3EvenCount  = top3.filter((d) => d % 2 === 0).length;
  const top2BothOdd    = top3[0] % 2 !== 0 && top3[1] % 2 !== 0;
  const bottom3AllEven = bottom3.every((d) => d % 2 === 0);
  const top3AllOdd     = top3.every((d) => d % 2 !== 0);

  const evenSignal: SignalDef = {
    id: "even",
    label: "TRADE EVEN",
    sublabel: "Top digits all even (0,2,4,6,8)",
    active: top3EvenCount >= 2,
    confirmed: top3EvenCount === 3,
    strength:
      top3EvenCount === 3 ? "VERY STRONG" :
      top3EvenCount === 2 ? "STRONG" :
      "INACTIVE",
    matchCount: top3EvenCount,
    bottomMatchCount: 0,
    activeColor: "#06b6d4",
    activeGlow: "0 0 20px rgba(6,182,212,0.4), 0 0 40px rgba(6,182,212,0.15)",
    activeBg: "rgba(6,182,212,0.1)",
    icon: "⚡",
  };

  const oddSignal: SignalDef = {
    id: "odd",
    label: "TRADE ODD",
    sublabel: "Top 2 odd + bottom 3 all even",
    active: top2BothOdd,
    confirmed: top2BothOdd && bottom3AllEven,
    strength:
      (top3AllOdd && bottom3AllEven)  ? "VERY STRONG" :
      (top2BothOdd && bottom3AllEven) ? "STRONG" :
      top2BothOdd                     ? "MODERATE" :
      "INACTIVE",
    matchCount: top3.filter((d) => d % 2 !== 0).length,
    bottomMatchCount: bottom3AllEven ? 3 : bottom3.filter((d) => d % 2 === 0).length,
    activeColor: "#f97316",
    activeGlow: "0 0 20px rgba(249,115,22,0.4), 0 0 40px rgba(249,115,22,0.15)",
    activeBg: "rgba(249,115,22,0.1)",
    icon: "🔥",
  };

  const renderCard = (sig: SignalDef, showBottom = true) => {
    const inactive = !sig.active;
    const barrier = sig.id.startsWith("under")
      ? parseInt(sig.id.replace("under", ""))
      : sig.id.startsWith("over")
      ? parseInt(sig.id.replace("over", ""))
      : -1;
    const isOver = sig.id.startsWith("over");
    const isUnder = sig.id.startsWith("under");

    return (
      <div
        key={sig.id}
        style={{
          borderRadius: "18px",
          padding: "16px 14px",
          background: inactive ? theme.card : sig.activeBg,
          border: inactive
            ? `1px solid ${theme.border}`
            : `1px solid ${sig.activeColor}55`,
          boxShadow: inactive ? "none" : sig.activeGlow,
          transition: "all 0.4s ease",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {sig.active && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "18px",
              border: `2px solid ${sig.activeColor}`,
              animation: "signal-pulse 2s infinite",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: inactive ? theme.textSub : sig.activeColor, marginBottom: "3px" }}>
              {sig.icon} {sig.sublabel}
            </div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: inactive ? theme.textMid : sig.activeColor }}>
              {sig.label}
            </div>
          </div>
          <div
            style={{
              padding: "4px 8px",
              borderRadius: "8px",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              background: inactive ? "rgba(255,255,255,0.04)" : `${sig.activeColor}20`,
              color: inactive ? theme.textSub : sig.activeColor,
              border: inactive ? "none" : `1px solid ${sig.activeColor}44`,
              whiteSpace: "nowrap",
            }}
          >
            {sig.active ? (sig.confirmed ? "✓ CONFIRMED" : "● ACTIVE") : "○ WAIT"}
          </div>
        </div>

        <StrengthBars strength={sig.strength} color={sig.activeColor} />

        <div style={{ marginTop: "6px", fontSize: "10px", fontWeight: 700, color: inactive ? theme.textSub : sig.activeColor, letterSpacing: "0.05em" }}>
          {sig.strength === "INACTIVE" ? "NO SIGNAL" : `⚡ ${sig.strength}`}
        </div>

        {/* Top 3 digit chips */}
        <div style={{ marginTop: "10px", display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "9px", color: theme.textSub, marginRight: "2px" }}>Top:</span>
          {top3.map((d, i) => {
            const hit =
              sig.id === "even" ? d % 2 === 0 :
              sig.id === "odd" ? d % 2 !== 0 :
              isUnder ? d < barrier :
              isOver ? d > barrier : false;
            return (
              <div
                key={i}
                title={TOP_LABELS[i]}
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "7px",
                  background: hit ? TOP_COLORS[i] : "rgba(255,255,255,0.05)",
                  border: hit ? "none" : `1px solid ${theme.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: hit ? "white" : theme.textSub,
                }}
              >
                {d}
              </div>
            );
          })}
          <span style={{ fontSize: "9px", color: inactive ? theme.textSub : sig.activeColor, fontWeight: 600, marginLeft: "2px" }}>
            {sig.matchCount}/3
          </span>
        </div>

        {/* Bottom 3 digit chips (cold confirmation) */}
        {showBottom && (isOver || isUnder) && (
          <div style={{ marginTop: "6px", display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "9px", color: theme.textSub, marginRight: "2px" }}>Cold:</span>
            {bottom3.map((d, i) => {
              const hit =
                isUnder ? d >= barrier :
                isOver ? d <= barrier : false;
              return (
                <div
                  key={i}
                  title={BOTTOM_LABELS[i]}
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "7px",
                    background: hit ? BOTTOM_COLORS[i] : "rgba(255,255,255,0.05)",
                    border: hit ? "none" : `1px solid ${theme.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: hit ? "white" : theme.textSub,
                  }}
                >
                  {d}
                </div>
              );
            })}
            <span style={{ fontSize: "9px", color: sig.bottomMatchCount > 0 ? sig.activeColor : theme.textSub, fontWeight: 600, marginLeft: "2px" }}>
              {sig.bottomMatchCount}/3
            </span>
          </div>
        )}
      </div>
    );
  };

  const allSignals = [...underDefs, ...overDefs, evenSignal, oddSignal];
  const activeCount = allSignals.filter((s) => s.active).length;
  const confirmedCount = allSignals.filter((s) => s.confirmed).length;

  return (
    <div
      style={{
        background: theme.card,
        borderRadius: "24px",
        padding: "22px",
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadow,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: theme.text, margin: 0 }}>
            📡 Trading Signals
          </h3>
          <div style={{ fontSize: "11px", color: theme.textSub, marginTop: "3px" }}>
            Top 3 most-appearing + bottom 3 cold digits
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {confirmedCount > 0 && (
            <div style={{ padding: "6px 12px", borderRadius: "10px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", fontSize: "12px", fontWeight: 700, color: "#22c55e" }}>
              ✓ {confirmedCount} Confirmed
            </div>
          )}
          <div style={{ padding: "6px 12px", borderRadius: "10px", background: activeCount > 0 ? "rgba(99,102,241,0.12)" : theme.cardInner, border: activeCount > 0 ? "1px solid rgba(99,102,241,0.3)" : `1px solid ${theme.border}`, fontSize: "12px", fontWeight: 700, color: activeCount > 0 ? "#a5b4fc" : theme.textSub }}>
            ● {activeCount} Active
          </div>
        </div>
      </div>

      {/* Current top + bottom 3 legend */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px", padding: "10px 14px", background: theme.cardInner, borderRadius: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "10px", color: theme.textSub, marginRight: "4px" }}>Top 3 (hot):</span>
        {top3.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "9px", background: TOP_COLORS[i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "white" }}>
              {d}
            </div>
            <span style={{ fontSize: "10px", color: theme.textSub }}>{stats.percentages[d]}%</span>
          </div>
        ))}
        <div style={{ width: "1px", height: "24px", background: theme.border, margin: "0 6px" }} />
        <span style={{ fontSize: "10px", color: theme.textSub, marginRight: "4px" }}>Bottom 3 (cold):</span>
        {bottom3.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "9px", background: BOTTOM_COLORS[i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "white" }}>
              {d}
            </div>
            <span style={{ fontSize: "10px", color: theme.textSub }}>{stats.percentages[d]}%</span>
          </div>
        ))}
      </div>

      {/* UNDER signals */}
      <SectionLabel label="UNDER BARRIER" color="#22c55e" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        {underDefs.map((s) => renderCard(s))}
      </div>

      {/* OVER signals */}
      <SectionLabel label="OVER BARRIER" color="#ec4899" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        {overDefs.map((s) => renderCard(s))}
      </div>

      {/* EVEN / ODD signals */}
      <SectionLabel label="EVEN / ODD" color="#06b6d4" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {renderCard(evenSignal, false)}
        {renderCard(oddSignal, false)}
      </div>

      <style>{`
        @keyframes signal-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.01); }
        }
      `}</style>
    </div>
  );
}
