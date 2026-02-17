import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, fullScreen } from "../styles";

export const Hero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12 } });
  const taglineOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subtitleOpacity = interpolate(frame, [35, 55], [0, 1], {
    extrapolateRight: "clamp",
  });
  const glowIntensity = interpolate(frame, [0, 60], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={fullScreen}>
      <div
        style={{
          transform: `scale(${logoScale})`,
          marginBottom: 40,
          filter: `drop-shadow(0 0 ${glowIntensity * 30}px rgba(57, 255, 20, 0.4))`,
        }}
      >
        <Img
          src={staticFile("flusk-logo.png")}
          style={{ width: 180, height: 180 }}
        />
      </div>

      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: COLORS.green,
          opacity: taglineOpacity,
          letterSpacing: -1,
          textShadow: `0 0 20px rgba(57, 255, 20, 0.5)`,
        }}
      >
        Know what your AI costs
      </div>

      <div
        style={{
          fontSize: 28,
          color: COLORS.gray,
          opacity: subtitleOpacity,
          marginTop: 16,
        }}
      >
        Open-source LLM cost intelligence for Node.js
      </div>

      <div
        style={{
          fontSize: 18,
          color: COLORS.bg,
          backgroundColor: COLORS.green,
          padding: "6px 18px",
          borderRadius: 20,
          marginTop: 24,
          fontWeight: 700,
          opacity: subtitleOpacity,
          letterSpacing: 1,
        }}
      >
        v0.2.0
      </div>
    </AbsoluteFill>
  );
};
