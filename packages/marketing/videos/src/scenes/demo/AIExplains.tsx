import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fullScreen, terminalBox } from "../../styles";

const command = "npx @flusk/cli explain";

const insights = [
  { title: "💡 Insight 1/3", body: "73% of spend is gpt-4o for classification", action: "→ Switch to gpt-4.1-mini — save 87% ($7.85/run)" },
  { title: "💡 Insight 2/3", body: "42 duplicate prompts detected across calls", action: "→ Add response cache — save $28/month" },
  { title: "💡 Insight 3/3", body: "System prompts average 2,400 tokens (could be 600)", action: "→ Compress prompts — save $4.20/run" },
];

export const AIExplains: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const typedChars = Math.min(Math.floor(frame / 2), command.length);
  const insightsStart = 70;

  const savingsStart = insightsStart + insights.length * 45 + 20;
  const savingsScale = spring({ frame: frame - savingsStart, fps, config: { damping: 8 } });
  const glowPulse = Math.sin((frame - savingsStart) / 10) * 0.5 + 0.5;

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{ ...terminalBox, fontSize: 20, lineHeight: 1.8, maxWidth: 1000 }}>
        <div>
          <span style={{ color: COLORS.green }}>$ </span>
          <span>{command.slice(0, typedChars)}</span>
          {typedChars < command.length && (
            <span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>▌</span>
          )}
        </div>

        <div style={{ marginTop: 20 }}>
          {insights.map((insight, i) => {
            const slideIn = spring({ frame: frame - insightsStart - i * 45, fps, config: { damping: 15 } });
            const x = interpolate(Math.max(0, slideIn), [0, 1], [300, 0]);
            const op = Math.max(0, slideIn);
            return (
              <div key={i} style={{
                opacity: op, transform: `translateX(${x}px)`,
                marginBottom: 16, padding: "8px 0",
                borderLeft: `3px solid ${COLORS.cyan}`, paddingLeft: 12,
              }}>
                <div style={{ color: COLORS.cyan, fontWeight: 700 }}>{insight.title}</div>
                <div style={{ color: COLORS.gray, fontSize: 16 }}>{insight.body}</div>
                <div style={{ color: COLORS.green, fontSize: 16 }}>{insight.action}</div>
              </div>
            );
          })}
        </div>

        {frame > savingsStart && (
          <div style={{
            textAlign: "center", marginTop: 16,
            transform: `scale(${Math.max(0, savingsScale)})`,
            fontSize: 28, fontWeight: 700, color: COLORS.green,
            textShadow: `0 0 ${20 + glowPulse * 30}px rgba(57,255,20,0.6)`,
          }}>
            Total potential savings: $380/month (61%)
          </div>
        )}
      </div>

      <div style={{
        position: "absolute", bottom: 60, fontSize: 32, color: COLORS.white,
        opacity: interpolate(frame, [savingsStart + 15, savingsStart + 30], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        AI-powered advice. Not just numbers — <span style={{ color: COLORS.green }}>solutions.</span>
      </div>
    </AbsoluteFill>
  );
};
