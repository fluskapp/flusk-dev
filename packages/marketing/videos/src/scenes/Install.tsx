import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, fullScreen, terminalBox } from "../styles";

export const Install: React.FC = () => {
  const frame = useCurrentFrame();

  const promptOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  const command = "npx @flusk/cli analyze ./app.js";
  const typedChars = Math.min(
    command.length,
    Math.floor(interpolate(frame, [10, 45], [0, command.length], {
      extrapolateRight: "clamp",
    }))
  );

  const successOpacity = interpolate(frame, [50, 60], [0, 1], {
    extrapolateRight: "clamp",
  });

  const cursorVisible = frame % 16 < 10 && frame < 50;

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{ fontSize: 36, color: COLORS.green, marginBottom: 40 }}>
        Get started in seconds
      </div>
      <div style={terminalBox}>
        <div style={{ fontSize: 14, color: COLORS.gray, marginBottom: 16 }}>
          ● ● ● Terminal
        </div>
        <div style={{ fontSize: 26, opacity: promptOpacity }}>
          <span style={{ color: COLORS.green }}>$ </span>
          <span style={{ color: COLORS.white }}>
            {command.slice(0, typedChars)}
          </span>
          {cursorVisible && (
            <span
              style={{
                backgroundColor: COLORS.green,
                width: 12,
                height: 28,
                display: "inline-block",
                marginLeft: 2,
              }}
            />
          )}
        </div>

        <div
          style={{
            fontSize: 20,
            color: COLORS.gray,
            marginTop: 24,
            opacity: successOpacity,
          }}
        >
          <div>⏳ Instrumenting ./app.js...</div>
          <div style={{ color: COLORS.green, marginTop: 8 }}>
            ✓ Analysis complete — report saved to flusk-report.json
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
