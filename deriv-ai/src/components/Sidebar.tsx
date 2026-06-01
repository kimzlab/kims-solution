import type { ActiveView } from "../types";
import { MARKETS } from "../types";
import { useTheme } from "../contexts/ThemeContext";

const menuItems: ActiveView[] = [
  "Digits Analysis",
  "Even / Odd",
  "Over / Under",
  "Matches / Differs",
  "AI Prediction",
  "Volatility Indexes",
  "Smart Signals",
];

type Props = {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  selectedSymbol: string;
  onMarketChange: (symbol: string) => void;
  connected: boolean;
  tickCount: number;
};

export default function Sidebar({ activeView, onViewChange, selectedSymbol, onMarketChange, connected, tickCount }: Props) {
  const { theme, toggleTheme } = useTheme();
  const selectedMarket = MARKETS.find((m) => m.symbol === selectedSymbol);
  const volMarkets = MARKETS.filter((m) => m.symbol.startsWith("R_") || m.symbol.startsWith("1HZ"));
  const otherMarkets = MARKETS.filter((m) => !m.symbol.startsWith("R_") && !m.symbol.startsWith("1HZ"));

  return (
    <aside
      style={{
        width: "240px",
        minWidth: "240px",
        background: "#111827",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "linear-gradient(135deg,#f59e0b,#ef4444)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "16px",
            flexShrink: 0,
          }}
        >
          K
        </div>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, lineHeight: 1 }}>Kimz Analysis</h2>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
            Center
          </p>
        </div>
      </div>

      {/* Connection status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 12px",
          background: connected ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          borderRadius: "10px",
          marginBottom: "16px",
          border: connected ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(239,68,68,0.2)",
          fontSize: "11px",
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: connected ? "#22c55e" : "#ef4444",
            animation: connected ? "pulse 2s infinite" : "none",
          }}
        />
        <span style={{ color: connected ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
          {connected ? `Live · ${tickCount} ticks` : "Connecting..."}
        </span>
      </div>

      {/* Market picker */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Market
        </div>

        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginBottom: "4px" }}>
          — Volatility (Normal)
        </div>
        {volMarkets.filter((m) => !m.symbol.startsWith("1HZ")).map((m) => (
          <button
            key={m.symbol}
            onClick={() => onMarketChange(m.symbol)}
            style={{
              width: "100%",
              background: selectedSymbol === m.symbol ? "rgba(255,68,79,0.15)" : "transparent",
              border: "none",
              borderLeft: selectedSymbol === m.symbol ? "3px solid #ff444f" : "3px solid transparent",
              color: selectedSymbol === m.symbol ? "white" : "rgba(255,255,255,0.55)",
              padding: "6px 10px",
              cursor: "pointer",
              textAlign: "left",
              fontSize: "13px",
              borderRadius: "0 8px 8px 0",
              marginBottom: "2px",
            }}
          >
            {m.label}
          </button>
        ))}

        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", margin: "8px 0 4px" }}>
          — Volatility (1s)
        </div>
        {volMarkets.filter((m) => m.symbol.startsWith("1HZ")).map((m) => (
          <button
            key={m.symbol}
            onClick={() => onMarketChange(m.symbol)}
            style={{
              width: "100%",
              background: selectedSymbol === m.symbol ? "rgba(255,68,79,0.15)" : "transparent",
              border: "none",
              borderLeft: selectedSymbol === m.symbol ? "3px solid #ff9a3c" : "3px solid transparent",
              color: selectedSymbol === m.symbol ? "white" : "rgba(255,255,255,0.55)",
              padding: "6px 10px",
              cursor: "pointer",
              textAlign: "left",
              fontSize: "13px",
              borderRadius: "0 8px 8px 0",
              marginBottom: "2px",
            }}
          >
            {m.label}
          </button>
        ))}

        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", margin: "8px 0 4px" }}>
          — Other Markets
        </div>
        {otherMarkets.map((m) => (
          <button
            key={m.symbol}
            onClick={() => onMarketChange(m.symbol)}
            style={{
              width: "100%",
              background: selectedSymbol === m.symbol ? "rgba(255,68,79,0.15)" : "transparent",
              border: "none",
              borderLeft: selectedSymbol === m.symbol ? "3px solid #6366f1" : "3px solid transparent",
              color: selectedSymbol === m.symbol ? "white" : "rgba(255,255,255,0.55)",
              padding: "6px 10px",
              cursor: "pointer",
              textAlign: "left",
              fontSize: "13px",
              borderRadius: "0 8px 8px 0",
              marginBottom: "2px",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Nav menu */}
      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Views
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {menuItems.map((item) => {
          const isActive = item === activeView;
          return (
            <button
              key={item}
              onClick={() => onViewChange(item)}
              style={{
                background: isActive
                  ? "linear-gradient(135deg,#ff444f,#ff9a3c)"
                  : "#1f2937",
                border: "none",
                color: "white",
                padding: "11px 14px",
                borderRadius: "12px",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                transition: "all 0.2s",
                transform: isActive ? "translateX(4px)" : "none",
                boxShadow: isActive ? "0 4px 12px rgba(255,68,79,0.25)" : "none",
              }}
            >
              {item}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", paddingTop: "16px" }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            width: "100%",
            marginBottom: "10px",
            padding: "9px 14px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.8)",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)")}
        >
          <span style={{ fontSize: "16px" }}>{theme.isDark ? "☀️" : "🌙"}</span>
          {theme.isDark ? "Light Mode" : "Dark Mode"}
        </button>

        <div
          style={{
            background: "rgba(255,68,79,0.08)",
            border: "1px solid rgba(255,68,79,0.15)",
            borderRadius: "10px",
            padding: "12px",
            fontSize: "11px",
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.5,
          }}
        >
          <div style={{ color: "#ff444f", fontWeight: 600, marginBottom: "3px" }}>Disclaimer</div>
          For educational purposes only. Not financial advice.
        </div>
      </div>
    </aside>
  );
}
