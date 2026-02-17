import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fullScreen, terminalBox } from "../styles";

export const Budget: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const command = "flusk budget set 50 --monthly";
  const typedChars = Math.min(command.length, Math.floor(interpolate(frame, [5, 40], [0, command.length], { extrapolateRight: "clamp" })));
  const cursorVisible = frame % 16 < 10 && frame < 45;

  const successOpacity = interpolate(frame, [45, 55], [0, 1], { extrapolateRight: "clamp" });
  const alertOpacity = interpolate(frame, [65, 75], [0, 1], { extrapolateRight: "clamp" });
  const barWidth = interpolate(frame, [75, 110], [0, 72], { extrapolateRight: "clamp" });
  const pulseGlow = frame > 100 ? 0.5 + 0.5 * Math.sin((frame - 100) * 0.15) : 0;

  const zoom = interpolate(frame, [0, 60], [0.95, 1.02], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{ fontSize: 36, color: COLORS.green, marginBottom: 30, opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" }) }}>
        Budget Alerts
      </div>
      <div style={{ ...terminalBox, maxWidth: 1100, transform: `scale(${zoom})` }}>
        <div style={{ fontSize: 14, color: COLORS.gray, marginBottom: 16 }}>● ● ● Terminal</div>
        <div style={{ fontSize: 24 }}>
          <span style={{ color: COLORS.green }}>$ </span>
          <span>{command.slice(0, typedChars)}</span>
          {cursorVisible && <span style={{ backgroundColor: COLORS.green, width: 11, height: 26, display: "inline-block", marginLeft: 2 }} />}
        </div>

        <div style={{ marginTop: 24, opacity: successOpacity }}>
          <div style={{ fontSize: 20, color: COLORS.green }}>✓ Monthly budget set to $50.00</div>
          <div style={{ fontSize: 16, color: COLORS.gray, marginTop: 6 }}>Alerts at 50%, 75%, 90%, and 100%</div>
        </div>

        <div style={{ marginTop: 28, opacity: alertOpacity }}>
          <div style={{ fontSize: 20, color: COLORS.yellow }}>⚠ Budget Alert: 72% used</div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 400, height: 24, backgroundColor: "#222", borderRadius: 12, overflow: "hidden", border: `1px solid ${COLORS.greenDim}` }}>
              <div style={{
                width: `${barWidth}%`, height: "100%",
                backgroundColor: barWidth > 90 ? COLORS.red : barWidth > 70 ? COLORS.yellow : COLORS.green,
                borderRadius: 12,
                boxShadow: `0 0 ${pulseGlow * 20}px ${barWidth > 70 ? COLORS.yellow : COLORS.green}`,
                transition: "background-color 0.3s",
              }} />
            </div>
            <span style={{ fontSize: 18, color: COLORS.white }}>$36.00 / $50.00</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
