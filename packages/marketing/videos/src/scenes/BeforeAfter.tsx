import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fullScreen } from "../styles";

export const BeforeAfter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const beforeScale = spring({ frame, fps, config: { damping: 15 } });
  const arrowOpacity = interpolate(frame, [40, 55], [0, 1], { extrapolateRight: "clamp" });
  const afterScale = spring({ frame: frame - 50, fps, config: { damping: 15 } });
  const savingsOpacity = interpolate(frame, [90, 105], [0, 1], { extrapolateRight: "clamp" });
  const savingsGlow = frame > 105 ? 0.5 + 0.5 * Math.sin((frame - 105) * 0.12) : 0;

  const cardStyle = (color: string): React.CSSProperties => ({
    backgroundColor: "#111",
    border: `1px solid ${color}40`,
    borderRadius: 16,
    padding: "36px 44px",
    width: 380,
  });

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{ fontSize: 36, color: COLORS.green, marginBottom: 48, opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }) }}>
        The Flusk Effect
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <div style={{ ...cardStyle(COLORS.red), transform: `scale(${Math.max(0, beforeScale)})` }}>
          <div style={{ fontSize: 22, color: COLORS.red, fontWeight: 700, marginBottom: 20 }}>❌ Before Flusk</div>
          <div style={{ fontSize: 17, color: COLORS.gray, lineHeight: 1.8 }}>
            <div>Monthly LLM cost: <span style={{ color: COLORS.red, fontWeight: 700 }}>$847</span></div>
            <div>Duplicate prompts: <span style={{ color: COLORS.red }}>23%</span></div>
            <div>Wrong model usage: <span style={{ color: COLORS.red }}>31 calls/day</span></div>
            <div>Cost visibility: <span style={{ color: COLORS.red }}>None</span></div>
            <div>Budget alerts: <span style={{ color: COLORS.red }}>None</span></div>
          </div>
        </div>

        <div style={{ fontSize: 48, color: COLORS.green, opacity: arrowOpacity }}>→</div>

        <div style={{ ...cardStyle(COLORS.green), transform: `scale(${Math.max(0, afterScale)})` }}>
          <div style={{ fontSize: 22, color: COLORS.green, fontWeight: 700, marginBottom: 20 }}>✅ After Flusk</div>
          <div style={{ fontSize: 17, color: COLORS.gray, lineHeight: 1.8 }}>
            <div>Monthly LLM cost: <span style={{ color: COLORS.green, fontWeight: 700 }}>$412</span></div>
            <div>Duplicate prompts: <span style={{ color: COLORS.green }}>Cached</span></div>
            <div>Wrong model usage: <span style={{ color: COLORS.green }}>Auto-suggested</span></div>
            <div>Cost visibility: <span style={{ color: COLORS.green }}>Real-time</span></div>
            <div>Budget alerts: <span style={{ color: COLORS.green }}>Active</span></div>
          </div>
        </div>
      </div>

      <div style={{
        fontSize: 32, color: COLORS.green, fontWeight: 700, marginTop: 48,
        opacity: savingsOpacity,
        textShadow: `0 0 ${savingsGlow * 25}px rgba(57, 255, 20, 0.6)`,
      }}>
        💰 51% cost reduction — $5,220/year saved
      </div>
    </AbsoluteFill>
  );
};
