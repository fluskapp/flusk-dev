import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, fullScreen } from "../../styles";

const codeLines = [
  'const res = await openai.chat.completions.create({',
  '  model: "gpt-4o",',
  '  messages: [{ role: "user", content: prompt }],',
  '});',
  '// Called 47 times per request...',
];

export const TheProblem: React.FC = () => {
  const frame = useCurrentFrame();

  const costValue = interpolate(frame, [0, 140], [0.12, 12.34], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{
        backgroundColor: "#111", border: `1px solid ${COLORS.greenDim}`,
        borderRadius: 12, padding: "24px 32px", width: "70%", maxWidth: 900,
        fontFamily: "monospace", fontSize: 20, lineHeight: 1.6,
      }}>
        {codeLines.map((line, i) => {
          const op = interpolate(frame, [i * 8, i * 8 + 12], [0, 1], {
            extrapolateRight: "clamp", extrapolateLeft: "clamp",
          });
          return (
            <div key={i} style={{ opacity: op, color: i === 4 ? COLORS.gray : COLORS.white }}>
              {line}
            </div>
          );
        })}
      </div>

      <div style={{
        position: "absolute", top: 60, right: 80,
        fontSize: 48, fontWeight: 700, color: COLORS.red,
        fontFamily: "monospace",
      }}>
        ${costValue.toFixed(2)}
      </div>

      <div style={{
        position: "absolute", bottom: 80,
        fontSize: 36, color: COLORS.white, textAlign: "center",
        opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        Your AI app is burning money.{" "}
        <span style={{ color: COLORS.yellow }}>You just don't know where.</span>
      </div>
    </AbsoluteFill>
  );
};
