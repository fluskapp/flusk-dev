import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, fullScreen, terminalBox } from "../styles";

const rows = [
  { model: "gpt-5.2", calls: "47", tokens: "125,340", cost: "$3.76" },
  { model: "gpt-5.2-mini", calls: "112", tokens: "89,200", cost: "$0.13" },
  { model: "claude-4.6", calls: "23", tokens: "67,800", cost: "$0.81" },
];

export const CostTracking: React.FC = () => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.green, opacity: titleOpacity, textShadow: `0 0 20px rgba(57, 255, 20, 0.4)`, marginBottom: 30 }}>
        💰 Per-Model Cost Breakdown
      </div>
      <div style={{ ...terminalBox, maxWidth: 1100 }}>
        <div style={{ fontSize: 14, color: COLORS.gray, marginBottom: 16 }}>● ● ● Terminal</div>
        <div style={{ fontSize: 20, color: COLORS.green, marginBottom: 16 }}>┌─────────────────── Flusk Cost Report ───────────────────┐</div>
        <div style={{ display: "grid", gridTemplateColumns: "200px 80px 120px 100px", gap: "8px 0", fontSize: 20 }}>
          <div style={{ color: COLORS.green, borderBottom: `1px solid ${COLORS.greenDim}`, paddingBottom: 8 }}>Model</div>
          <div style={{ color: COLORS.green, borderBottom: `1px solid ${COLORS.greenDim}`, paddingBottom: 8 }}>Calls</div>
          <div style={{ color: COLORS.green, borderBottom: `1px solid ${COLORS.greenDim}`, paddingBottom: 8 }}>Tokens</div>
          <div style={{ color: COLORS.green, borderBottom: `1px solid ${COLORS.greenDim}`, paddingBottom: 8 }}>Cost</div>
          {rows.map((r, i) => {
            const opacity = interpolate(frame, [15 + i * 10, 25 + i * 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <React.Fragment key={i}>
                <div style={{ opacity, color: COLORS.white }}>{r.model}</div>
                <div style={{ opacity, color: COLORS.gray }}>{r.calls}</div>
                <div style={{ opacity, color: COLORS.gray }}>{r.tokens}</div>
                <div style={{ opacity, color: COLORS.yellow }}>{r.cost}</div>
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ marginTop: 16, borderTop: `1px solid ${COLORS.greenDim}`, paddingTop: 12, display: "grid", gridTemplateColumns: "200px 80px 120px 100px", fontSize: 20, opacity: interpolate(frame, [50, 60], [0, 1], { extrapolateRight: "clamp" }) }}>
          <div style={{ color: COLORS.green, fontWeight: 700 }}>Total</div>
          <div style={{ color: COLORS.white }}>182</div>
          <div style={{ color: COLORS.white }}>282,340</div>
          <div style={{ color: COLORS.green, fontWeight: 700 }}>$4.70</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
