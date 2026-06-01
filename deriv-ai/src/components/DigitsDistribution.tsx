import { useTheme } from "../contexts/ThemeContext";
import type { DigitStats } from "../types";

type Props = {
  stats: DigitStats;
  flashKey: number;
};

const accentColors: Record<string, string> = {
  green: "#14532d",
  blue: "#1d4ed8",
  lightblue: "#0369a1",
  red: "#991b1b",
  orange: "#ea580c",
  maroon: "#7f1d1d",
};

function getDigitColor(
  index: number,
  topDigits: number[],
  bottomDigits: number[],
  normalColor: string
): string {
  if (index === topDigits[0]) return accentColors.green;
  if (index === topDigits[1]) return accentColors.blue;
  if (index === topDigits[2]) return accentColors.lightblue;
  if (index === bottomDigits[0]) return accentColors.red;
  if (index === bottomDigits[1]) return accentColors.orange;
  if (index === bottomDigits[2]) return accentColors.maroon;
  return normalColor;
}

function getLabel(index: number, topDigits: number[], bottomDigits: number[]) {
  if (index === topDigits[0]) return "HIGHEST";
  if (index === topDigits[1]) return "2ND";
  if (index === topDigits[2]) return "3RD";
  if (index === bottomDigits[0]) return "LOWEST";
  return null;
}

export default function DigitsDistribution({ stats, flashKey }: Props) {
  const { theme } = useTheme();
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
      <h3 style={{ marginBottom: "18px", fontSize: "18px", fontWeight: 600, color: theme.text }}>
        Digits Distribution
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        {stats.counts.map((_count: number, i: number) => {
          const bg = getDigitColor(i, stats.topDigits, stats.bottomDigits, theme.cardInner);
          const label = getLabel(i, stats.topDigits, stats.bottomDigits);
          return (
            <div
              key={i}
              style={{
                height: "78px",
                borderRadius: "18px",
                background: bg,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                transition: "transform 0.2s",
                cursor: "default",
                position: "relative",
                border:
                  i === stats.lastDigit
                    ? "2px solid rgba(255,255,255,0.4)"
                    : "2px solid transparent",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.transform = "scale(1.07)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.transform = "scale(1)")
              }
            >
              {label && (
                <div
                  style={{
                    position: "absolute",
                    top: "4px",
                    fontSize: "8px",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.8)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {label}
                </div>
              )}
              <div style={{ fontSize: "22px", fontWeight: 700, color: "white" }}>{i}</div>
              <div style={{ fontSize: "12px", marginTop: "3px", color: "rgba(255,255,255,0.85)" }}>
                {stats.percentages[i]}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Live tick */}
      <div
        key={flashKey}
        style={{
          background: theme.cardDeep,
          padding: "16px",
          borderRadius: "18px",
          textAlign: "center",
          fontSize: "20px",
          letterSpacing: "2px",
          fontWeight: 600,
          border: `1px solid ${theme.borderMid}`,
          animation: "tick-flash 0.4s ease-out",
          color: theme.text,
        }}
      >
        Last Digit:{" "}
        <span style={{ color: "#ff444f", fontSize: "28px" }}>{stats.lastDigit}</span>
        <span
          style={{
            marginLeft: "16px",
            fontSize: "13px",
            color: theme.textSub,
            fontWeight: 400,
          }}
        >
          {stats.total} ticks
        </span>
      </div>
    </div>
  );
}
