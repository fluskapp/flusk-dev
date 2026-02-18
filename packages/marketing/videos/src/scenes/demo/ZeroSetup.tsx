import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fullScreen, terminalBox } from "../../styles";

const notNeeded = ["API keys", "Server", "Config files"];

export const ZeroSetup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const typedCmd = "npm install @flusk/cli";
  const typedChars = Math.min(Math.floor(frame / 2), typedCmd.length);
  const installDone = frame > 60;

  return (
    <AbsoluteFill style={{ ...fullScreen, flexDirection: "row", gap: 60 }}>
      {/* Left: terminal */}
      <div style={{ ...terminalBox, width: "40%", fontSize: 20, lineHeight: 2 }}>
        <div>
          <span style={{ color: COLORS.green }}>$ </span>
          {typedCmd.slice(0, typedChars)}
        </div>
        {installDone && (
          <>
            <div style={{ color: COLORS.gray, opacity: interpolate(frame, [60, 70], [0, 1], { extrapolateRight: "clamp" }) }}>
              added 1 package in 2.1s
            </div>
            <div style={{ marginTop: 8, opacity: interpolate(frame, [75, 85], [0, 1], { extrapolateRight: "clamp" }) }}>
              <span style={{ color: COLORS.green }}>$ </span>npx @flusk/cli analyze .
            </div>
            <div style={{ color: COLORS.green, opacity: interpolate(frame, [90, 100], [0, 1], { extrapolateRight: "clamp" }) }}>
              ✅ Ready.
            </div>
          </>
        )}
      </div>

      {/* Right: checklist */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, fontSize: 24 }}>
        {notNeeded.map((item, i) => {
          const itemOp = spring({ frame: frame - 70 - i * 15, fps, config: { damping: 15 } });
          const strike = interpolate(Math.max(0, itemOp), [0, 0.5, 1], [0, 0, 1]);
          return (
            <div key={i} style={{
              opacity: Math.max(0, itemOp), display: "flex", gap: 12, alignItems: "center",
            }}>
              <span style={{ color: COLORS.red, fontSize: 20 }}>✗</span>
              <span style={{
                textDecoration: strike > 0.5 ? "line-through" : "none",
                color: COLORS.gray,
              }}>
                {item}
              </span>
            </div>
          );
        })}
        <div style={{
          opacity: Math.max(0, spring({ frame: frame - 120, fps, config: { damping: 12 } })),
          display: "flex", gap: 12, alignItems: "center",
        }}>
          <span style={{ color: COLORS.green, fontSize: 20 }}>✓</span>
          <span style={{ color: COLORS.green, fontWeight: 700 }}>Your code — That's it</span>
        </div>
      </div>

      <div style={{
        position: "absolute", bottom: 70, fontSize: 32, color: COLORS.white,
        opacity: interpolate(frame, [130, 145], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        No API keys. No server. <span style={{ color: COLORS.green }}>Just your code.</span>
      </div>
    </AbsoluteFill>
  );
};
