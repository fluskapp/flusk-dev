import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, fullScreen, terminalBox } from "../styles";

const duplicates = [
  { prompt: '"Summarize this article: ..."', count: 12, cost: "$0.89/day" },
  { prompt: '"Classify sentiment: ..."', count: 8, cost: "$0.34/day" },
  { prompt: '"Translate to Spanish: ..."', count: 5, cost: "$0.21/day" },
];

export const DuplicateDetection: React.FC = () => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.green, opacity: titleOpacity, textShadow: `0 0 20px rgba(57, 255, 20, 0.4)`, marginBottom: 30 }}>
        🔍 Duplicate Prompt Detection
      </div>
      <div style={{ ...terminalBox, maxWidth: 1100 }}>
        <div style={{ fontSize: 14, color: COLORS.gray, marginBottom: 16 }}>● ● ● Terminal</div>
        <div style={{ fontSize: 20, color: COLORS.yellow, marginBottom: 20 }}>⚠ Duplicate prompts detected:</div>
        {duplicates.map((d, i) => {
          const opacity = interpolate(frame, [15 + i * 15, 25 + i * 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ opacity, marginBottom: 16, fontSize: 18 }}>
              <div style={{ color: COLORS.white }}>  → {d.prompt}</div>
              <div style={{ color: COLORS.gray, marginLeft: 32 }}>
                Repeated <span style={{ color: COLORS.red }}>{d.count}x</span> — wasting <span style={{ color: COLORS.green }}>{d.cost}</span>
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 24, fontSize: 22, color: COLORS.green, opacity: interpolate(frame, [65, 75], [0, 1], { extrapolateRight: "clamp" }), textShadow: `0 0 10px rgba(57, 255, 20, 0.3)` }}>
          💰 Cache these prompts to save ~$1.44/day ($43.20/month)
        </div>
      </div>
    </AbsoluteFill>
  );
};
