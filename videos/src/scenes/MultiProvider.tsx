import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fullScreen } from "../styles";

const providers = [
  { name: "OpenAI", icon: "🤖", color: "#10a37f", models: "GPT-5.2, GPT-5.2-mini, o3" },
  { name: "Anthropic", icon: "🧠", color: "#d4a574", models: "Claude 4.6, Claude 4.6 Haiku" },
  { name: "AWS Bedrock", icon: "☁️", color: "#ff9900", models: "Titan, Llama, Mistral" },
  { name: "Google AI", icon: "🔷", color: "#4285f4", models: "Gemini 3.0 Pro, Flash" },
  { name: "Azure OpenAI", icon: "📘", color: "#0078d4", models: "Hosted GPT-5.2, o3" },
];

export const MultiProvider: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{ fontSize: 48, fontWeight: 700, color: COLORS.green, opacity: titleOpacity, textShadow: `0 0 20px rgba(57, 255, 20, 0.4)` }}>
        One tool. Every provider.
      </div>
      <div style={{ fontSize: 24, color: COLORS.gray, opacity: subtitleOpacity, marginTop: 12, marginBottom: 48 }}>
        Works with any LLM API — zero config
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", maxWidth: 1200 }}>
        {providers.map((p, i) => {
          const cardScale = spring({ frame: frame - 25 - i * 8, fps, config: { damping: 14 } });
          const kenBurns = interpolate(frame, [0, 150], [1, 1.02], { extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              backgroundColor: "#111",
              border: `1px solid ${p.color}40`,
              borderRadius: 16,
              padding: "28px 32px",
              width: 200,
              textAlign: "center",
              transform: `scale(${Math.max(0, cardScale) * kenBurns})`,
              boxShadow: `0 0 20px ${p.color}20`,
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{p.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: p.color, marginBottom: 8 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: COLORS.gray, lineHeight: 1.4 }}>{p.models}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
