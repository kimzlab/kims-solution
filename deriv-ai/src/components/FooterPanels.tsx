import { useTheme } from "../contexts/ThemeContext";
import type { DigitStats } from "../types";

type Props = { stats: DigitStats };

function MiniPanel({
  title,
  value,
  color,
  description,
}: {
  title: string;
  value: number;
  color: string;
  description?: string;
}) {
  const { theme } = useTheme();
  return (
    <div
      style={{
        background: theme.card,
        padding: "20px",
        borderRadius: "20px",
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadow,
      }}
    >
      <h4 style={{ marginBottom: "6px", fontSize: "15px", fontWeight: 600, color: theme.text }}>{title}</h4>
      {description && (
        <p style={{ fontSize: "12px", color: theme.textSub, marginBottom: "10px" }}>
          {description}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "10px" }}>
        <span style={{ fontSize: "32px", fontWeight: 700, color }}>{value}%</span>
        <span style={{ fontSize: "12px", color: theme.textSub }}>probability</span>
      </div>

      <div
        style={{
          width: "100%",
          height: "12px",
          background: theme.cardInner,
          borderRadius: "20px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
            borderRadius: "20px",
            transition: "width 0.8s ease",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "8px",
          fontSize: "11px",
          color: theme.textLow,
        }}
      >
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

export default function FooterPanels({ stats }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "20px",
      }}
    >
      <MiniPanel
        title="Matches Probability"
        value={stats.matchesProbability}
        color="#22c55e"
        description="Chance current digit repeats"
      />
      <MiniPanel
        title="Differs Probability"
        value={stats.differsProbability}
        color="#3b82f6"
        description="Chance next digit differs"
      />
      <MiniPanel
        title="AI Confidence"
        value={stats.aiConfidence}
        color="#ff444f"
        description="Model prediction strength"
      />
    </div>
  );
}
