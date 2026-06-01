import { useMemo } from "react";
import { MARKETS } from "../types";
import { useTheme } from "../contexts/ThemeContext";
import type { MarketTickState } from "../hooks/useAllMarketTicks";
import { computeStats } from "../pages/Dashboard";

type Props = {
  allMarkets: Record<string, MarketTickState>;
  onSelectMarket: (symbol: string) => void;
};

type SignalStrength = "STRONG" | "MODERATE" | "WEAK" | "NONE";

type MarketSignal = {
  market: { symbol: string; label: string };
  tickCount: number;
  lastQuote: number;
  evenEdge: number;
  oddEdge: number;
  bestOver: { barrier: number; edge: number };
  bestUnder: { barrier: number; edge: number };
  topDigit: number;
  topPct: number;
  coldDigit: number;
  coldPct: number;
  signalStrength: SignalStrength;
  recommendation: string;
  recommendationColor: string;
};

const BARRIERS = [1, 2, 3, 4, 5, 6, 7, 8];

function computeOverEdge(barrier: number, counts: number[], total: number): number {
  const isOver34 = barrier === 3 || barrier === 4;
  if (isOver34) {
    const lowCount = [0, 1, 2].reduce((s, d) => s + counts[d], 0);
    const lowPct = (lowCount / total) * 100;
    return 30 - lowPct; // positive = digits 0-2 are rare = over signal
  }
  const targetCount = counts.slice(barrier + 1).reduce((a, b) => a + b, 0);
  const targetPct = (targetCount / total) * 100;
  const expected = ((9 - barrier) / 10) * 100;
  return expected - targetPct; // positive = digits above barrier underrepresented
}

function computeUnderEdge(barrier: number, counts: number[], total: number): number {
  const isUnder56 = barrier === 5 || barrier === 6;
  if (isUnder56) {
    const lowCount = [0, 1, 2, 3].reduce((s, d) => s + counts[d], 0);
    const lowPct = (lowCount / total) * 100;
    return lowPct - 40; // positive = 0-3 dominate = trend down
  }
  const targetCount = counts.slice(0, barrier).reduce((a, b) => a + b, 0);
  const targetPct = (targetCount / total) * 100;
  const expected = (barrier / 10) * 100;
  return expected - targetPct;
}

function scoreStrength(edge: number): SignalStrength {
  if (edge >= 8) return "STRONG";
  if (edge >= 4) return "MODERATE";
  if (edge >= 1) return "WEAK";
  return "NONE";
}

export default function SmartSignals({ allMarkets, onSelectMarket }: Props) {
  const { theme } = useTheme();

  const signals: MarketSignal[] = useMemo(() => {
    return MARKETS.map((market) => {
      const ms = allMarkets[market.symbol];
      const counts = ms?.counts ?? Array(10).fill(0);
      const total = Math.max(ms?.tickCount ?? 0, 1);
      const lastQuote = ms?.lastQuote ?? 0;
      const tickCount = ms?.tickCount ?? 0;

      const stats = computeStats(counts, ms?.lastDigit ?? 0, ms?.tickCount ?? 0);

      const evenEdge = 50 - stats.evenPercent;
      const oddEdge = 50 - stats.oddPercent;

      let bestOver = { barrier: 5, edge: -99 };
      let bestUnder = { barrier: 5, edge: -99 };
      for (const b of BARRIERS) {
        const oe = computeOverEdge(b, counts, total);
        const ue = computeUnderEdge(b, counts, total);
        if (oe > bestOver.edge) bestOver = { barrier: b, edge: oe };
        if (ue > bestUnder.edge) bestUnder = { barrier: b, edge: ue };
      }

      const topDigit = stats.topDigits[0];
      const topPct = parseFloat(stats.percentages[topDigit]);
      const coldDigit = stats.bottomDigits[0];
      const coldPct = parseFloat(stats.percentages[coldDigit]);

      const maxEdge = Math.max(bestOver.edge, bestUnder.edge, Math.abs(evenEdge), Math.abs(oddEdge));
      const strength = tickCount < 20 ? "NONE" : scoreStrength(maxEdge);

      let recommendation = "Collecting data...";
      let recommendationColor = theme.textSub;

      if (tickCount >= 20) {
        if (bestOver.edge >= bestUnder.edge && bestOver.edge >= Math.abs(evenEdge)) {
          recommendation = `OVER ${bestOver.barrier} (+${bestOver.edge.toFixed(1)}%)`;
          recommendationColor = "#3b82f6";
        } else if (bestUnder.edge >= Math.abs(evenEdge)) {
          recommendation = `UNDER ${bestUnder.barrier} (+${bestUnder.edge.toFixed(1)}%)`;
          recommendationColor = "#a855f7";
        } else if (evenEdge > 0) {
          recommendation = `EVEN (+${evenEdge.toFixed(1)}%)`;
          recommendationColor = "#22c55e";
        } else {
          recommendation = `ODD (+${oddEdge.toFixed(1)}%)`;
          recommendationColor = "#f97316";
        }
      }

      return {
        market,
        tickCount,
        lastQuote,
        evenEdge,
        oddEdge,
        bestOver,
        bestUnder,
        topDigit,
        topPct,
        coldDigit,
        coldPct,
        signalStrength: strength,
        recommendation,
        recommendationColor,
      };
    }).sort((a, b) => {
      const order = { STRONG: 0, MODERATE: 1, WEAK: 2, NONE: 3 };
      return order[a.signalStrength] - order[b.signalStrength];
    });
  }, [allMarkets, theme.textSub]);

  const strengthConfig: Record<SignalStrength, { label: string; color: string; bg: string }> = {
    STRONG: { label: "STRONG", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
    MODERATE: { label: "MODERATE", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    WEAK: { label: "WEAK", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
    NONE: { label: "NO DATA", color: theme.textSub, bg: "transparent" },
  };

  const strongCount = signals.filter((s) => s.signalStrength === "STRONG").length;
  const modCount = signals.filter((s) => s.signalStrength === "MODERATE").length;

  return (
    <div>
      {/* Header summary */}
      <div
        style={{
          background: theme.card,
          borderRadius: "20px",
          padding: "20px 24px",
          border: `1px solid ${theme.border}`,
          boxShadow: theme.shadow,
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: theme.text }}>Smart Signals</div>
          <div style={{ fontSize: "12px", color: theme.textSub, marginTop: "2px" }}>
            All markets running in background — live signal ranking
          </div>
        </div>
        <div style={{ display: "flex", gap: "16px", marginLeft: "auto", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#22c55e" }}>{strongCount}</div>
            <div style={{ fontSize: "11px", color: theme.textSub }}>Strong signals</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#f59e0b" }}>{modCount}</div>
            <div style={{ fontSize: "11px", color: theme.textSub }}>Moderate</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: theme.text }}>
              {signals.reduce((s, m) => s + m.tickCount, 0).toLocaleString()}
            </div>
            <div style={{ fontSize: "11px", color: theme.textSub }}>Total ticks</div>
          </div>
        </div>
      </div>

      {/* Market rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {signals.map((sig) => {
          const sc = strengthConfig[sig.signalStrength];
          return (
            <div
              key={sig.market.symbol}
              onClick={() => onSelectMarket(sig.market.symbol)}
              style={{
                background: theme.card,
                borderRadius: "16px",
                padding: "14px 18px",
                border: `1px solid ${sig.signalStrength === "STRONG" ? "rgba(34,197,94,0.25)" : sig.signalStrength === "MODERATE" ? "rgba(245,158,11,0.2)" : theme.border}`,
                boxShadow: theme.shadow,
                display: "grid",
                gridTemplateColumns: "180px 80px 1fr 1fr 1fr 1fr 140px",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateX(4px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)";
              }}
            >
              {/* Market name */}
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px", color: theme.text }}>{sig.market.label}</div>
                <div style={{ fontSize: "11px", color: theme.textSub, marginTop: "2px" }}>
                  {sig.tickCount > 0 ? `${sig.tickCount} ticks · ${sig.lastQuote}` : "Connecting..."}
                </div>
              </div>

              {/* Strength badge */}
              <div
                style={{
                  background: sc.bg,
                  color: sc.color,
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "4px 8px",
                  borderRadius: "8px",
                  textAlign: "center",
                  border: `1px solid ${sc.color}33`,
                  letterSpacing: "0.05em",
                }}
              >
                {sc.label}
              </div>

              {/* Best Over */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: theme.textSub, marginBottom: "2px" }}>Best Over</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: sig.bestOver.edge > 3 ? "#3b82f6" : theme.textMid }}>
                  {sig.tickCount >= 20 ? `${sig.bestOver.barrier} (+${sig.bestOver.edge.toFixed(1)}%)` : "—"}
                </div>
              </div>

              {/* Best Under */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: theme.textSub, marginBottom: "2px" }}>Best Under</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: sig.bestUnder.edge > 3 ? "#a855f7" : theme.textMid }}>
                  {sig.tickCount >= 20 ? `${sig.bestUnder.barrier} (+${sig.bestUnder.edge.toFixed(1)}%)` : "—"}
                </div>
              </div>

              {/* Hot digit */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: theme.textSub, marginBottom: "2px" }}>🔥 Hot digit</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#ef4444" }}>
                  {sig.tickCount >= 10 ? `${sig.topDigit} (${sig.topPct.toFixed(1)}%)` : "—"}
                </div>
              </div>

              {/* Cold digit */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: theme.textSub, marginBottom: "2px" }}>❄️ Cold digit</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#3b82f6" }}>
                  {sig.tickCount >= 10 ? `${sig.coldDigit} (${sig.coldPct.toFixed(1)}%)` : "—"}
                </div>
              </div>

              {/* Recommendation */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "10px", color: theme.textSub, marginBottom: "2px" }}>Recommendation</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: sig.recommendationColor }}>
                  {sig.recommendation}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "14px", fontSize: "11px", color: theme.textSub, textAlign: "center" }}>
        Click any market to switch to it · Signals update in real-time · Min 20 ticks for analysis
      </div>
    </div>
  );
}
