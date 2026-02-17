import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, fullScreen, terminalBox } from "../styles";

const suggestions = [
  { from: "gpt-5.2", to: "gpt-5.2-mini", calls: 31, saving: "$2.10/day" },
  { from: "claude-4.6", to: "claude-4.6-haiku", calls: 8, saving: "$0.45/day" },
];

export const ModelOptimization: React.FC = () => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.green, opacity: titleOpacity, textShadow: `0 0 20px rgba(57, 255, 20, 0.4)`, marginBottom: 30 }}>
        ⚡ Model Optimization Suggestions
      </div>
      <div style={{ ...terminalBox, maxWidth: 1100 }}>
        <div style={{ fontSize: 14, color: COLORS.gray, marginBottom: 16 }}>● ● ● Terminal</div>
        <div style={{ fontSize: 20, color: COLORS.cyan, marginBottom: 20 }}>💡 Model downgrade opportunities:</div>
        {suggestions.map((s, i) => {
          const opacity = interpolate(frame, [15 + i * 20, 30 + i * 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ opacity, marginBottom: 20, fontSize: 20, padding: "16px 20px", backgroundColor: "#0a0a0a", borderRadius: 8, border: `1px solid ${COLORS.greenDim}` }}>
              <div>
                <span style={{ color: COLORS.red }}>{s.from}</span>
                <span style={{ color: COLORS.gray }}> → </span>
                <span style={{ color: COLORS.green }}>{s.to}</span>
              </div>
              <div style={{ color: COLORS.gray, fontSize: 16, marginTop: 4 }}>
                {s.calls} calls could downgrade — saving <span style={{ color: COLORS.green }}>{s.saving}</span>
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 16, fontSize: 22, color: COLORS.green, opacity: interpolate(frame, [60, 70], [0, 1], { extrapolateRight: "clamp" }), textShadow: `0 0 10px rgba(57, 255, 20, 0.3)` }}>
          💰 Estimated monthly savings: $76.50
        </div>
      </div>
    </AbsoluteFill>
  );
};
