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
import { COLORS, fullScreen, terminalBox } from "../styles";

export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 15 } });
  const textOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  const cmdOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateRight: "clamp",
  });
  const glowPulse =
    0.3 + 0.7 * Math.sin(((frame - 45) / 30) * Math.PI * 2) * 0.5 + 0.5;

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{ transform: `scale(${logoScale})`, marginBottom: 32 }}>
        <Img
          src={staticFile("flusk-logo.png")}
          style={{ width: 100, height: 100 }}
        />
      </div>

      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: COLORS.green,
          opacity: textOpacity,
          textShadow: `0 0 20px rgba(57, 255, 20, 0.5)`,
        }}
      >
        Stop guessing. Start measuring.
      </div>

      <div
        style={{
          ...terminalBox,
          marginTop: 40,
          textAlign: "center",
          opacity: cmdOpacity,
          boxShadow: `0 0 ${glowPulse * 40}px rgba(57, 255, 20, 0.15)`,
        }}
      >
        <div style={{ fontSize: 28 }}>
          <span style={{ color: COLORS.green }}>$ </span>
          <span style={{ color: COLORS.white }}>
            npx @flusk/cli analyze ./your-app.js
          </span>
        </div>
      </div>

      <div
        style={{
          fontSize: 20,
          color: COLORS.gray,
          marginTop: 32,
          opacity: cmdOpacity,
        }}
      >
        ⭐ github.com/adirbenyossef/flusk-dev
      </div>
    </AbsoluteFill>
  );
};
