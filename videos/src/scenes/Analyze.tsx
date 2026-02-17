import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, fullScreen, terminalBox } from "../styles";

export const Analyze: React.FC = () => {
  const frame = useCurrentFrame();

  const command = "npx @flusk/cli analyze ./app.js";
  const typedChars = Math.min(
    command.length,
    Math.floor(interpolate(frame, [5, 40], [0, command.length], {
      extrapolateRight: "clamp",
    }))
  );

  const scanLines = [
    "⏳ Instrumenting with OpenTelemetry...",
    "🔍 Intercepting LLM API calls...",
    "📊 Captured 182 calls across 3 models",
    "💡 Analyzing patterns & cost optimization...",
  ];

  const cursorVisible = frame % 16 < 10 && frame < 45;

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={terminalBox}>
        <div style={{ fontSize: 14, color: COLORS.gray, marginBottom: 16 }}>
          ● ● ● Terminal
        </div>

        <div style={{ fontSize: 24 }}>
          <span style={{ color: COLORS.green }}>$ </span>
          <span>{command.slice(0, typedChars)}</span>
          {cursorVisible && (
            <span
              style={{
                backgroundColor: COLORS.green,
                width: 11,
                height: 26,
                display: "inline-block",
                marginLeft: 2,
              }}
            />
          )}
        </div>

        <div style={{ marginTop: 28 }}>
          {scanLines.map((line, i) => {
            const lineStart = 45 + i * 12;
            const opacity = interpolate(frame, [lineStart, lineStart + 8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={i}
                style={{
                  fontSize: 20,
                  color: COLORS.cyan,
                  opacity,
                  marginTop: 8,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
