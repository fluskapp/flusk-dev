import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fullScreen } from "../../styles";

export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const starScale = spring({ frame, fps, config: { damping: 10 } });
  const urlOp = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [50, 65], [0, 1], { extrapolateRight: "clamp" });
  const glowPulse = Math.sin(frame / 12) * 0.5 + 0.5;

  return (
    <AbsoluteFill style={fullScreen}>
      {/* Star animation */}
      <div style={{
        transform: `scale(${starScale})`, fontSize: 80, marginBottom: 32,
        textShadow: `0 0 ${20 + glowPulse * 30}px rgba(255,200,0,0.5)`,
      }}>
        ⭐
      </div>

      <div style={{
        fontSize: 36, color: COLORS.white, fontWeight: 700, opacity: urlOp,
        fontFamily: "monospace",
      }}>
        github.com/adirbenyossef/flusk-dev
      </div>

      <div style={{
        fontSize: 24, color: COLORS.gray, marginTop: 24, opacity: subOp,
      }}>
        MIT Licensed • Star us ⭐
      </div>

      <div style={{
        fontSize: 20, color: COLORS.green, marginTop: 32, opacity: subOp,
        textShadow: `0 0 15px rgba(57,255,20,0.4)`,
      }}>
        npx @flusk/cli analyze ./your-app.js
      </div>
    </AbsoluteFill>
  );
};
