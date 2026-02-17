import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, fullScreen } from "../styles";

export const Problem: React.FC = () => {
  const frame = useCurrentFrame();

  const line1Opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const line2Opacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateRight: "clamp",
  });
  const costOpacity = interpolate(frame, [40, 55], [0, 1], {
    extrapolateRight: "clamp",
  });
  const costScale = interpolate(frame, [40, 55], [0.8, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={fullScreen}>
      <div
        style={{
          fontSize: 48,
          color: COLORS.white,
          opacity: line1Opacity,
          textAlign: "center",
          maxWidth: 900,
        }}
      >
        LLM API calls are{" "}
        <span style={{ color: COLORS.red }}>invisible.</span>
      </div>

      <div
        style={{
          fontSize: 48,
          color: COLORS.white,
          opacity: line2Opacity,
          marginTop: 24,
          textAlign: "center",
        }}
      >
        You're <span style={{ color: COLORS.yellow }}>bleeding money.</span>
      </div>

      <div
        style={{
          fontSize: 32,
          color: COLORS.gray,
          opacity: costOpacity,
          marginTop: 48,
          transform: `scale(${costScale})`,
        }}
      >
        Teams waste <span style={{ color: COLORS.red }}>20-40%</span> of their
        LLM budget
      </div>
    </AbsoluteFill>
  );
};
