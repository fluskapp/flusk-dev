import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fullScreen } from "../../styles";

const rows = [
  { endpoint: "/api/classify", model: "gpt-4o", calls: "12", cost: "$3.40", delta: "+$1.20 ⚠️", warn: true },
  { endpoint: "/api/summarize", model: "gpt-4.1-mini", calls: "8", cost: "$0.89", delta: "-$0.30 ✅", warn: false },
];

export const InYourCI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideUp = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  const y = interpolate(Math.max(0, slideUp), [0, 1], [400, 0]);

  return (
    <AbsoluteFill style={fullScreen}>
      {/* Mocked GitHub PR header */}
      <div style={{
        width: "80%", maxWidth: 1000, backgroundColor: "#161b22",
        border: "1px solid #30363d", borderRadius: 12, overflow: "hidden",
      }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #30363d", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#3fb950" }} />
          <span style={{ color: COLORS.white, fontSize: 20 }}>feat: add AI classification endpoint</span>
          <span style={{ color: COLORS.gray, fontSize: 14 }}>#42</span>
        </div>

        <div style={{
          padding: "20px 24px", transform: `translateY(${y}px)`,
          opacity: Math.max(0, slideUp),
        }}>
          <div style={{ fontSize: 18, color: COLORS.white, fontWeight: 700, marginBottom: 12 }}>
            🔍 Flusk Cost Analysis
          </div>
          <div style={{ fontSize: 14, fontFamily: "monospace" }}>
            <div style={{ color: COLORS.gray, borderBottom: "1px solid #30363d", paddingBottom: 6, marginBottom: 8 }}>
              {"Endpoint".padEnd(18)}{"Model".padEnd(14)}{"Calls".padEnd(8)}{"Cost".padEnd(10)}Δ from main
            </div>
            {rows.map((r, i) => (
              <div key={i} style={{
                color: r.warn ? "#ff6b35" : COLORS.white, padding: "4px 0",
                opacity: interpolate(frame, [60 + i * 15, 75 + i * 15], [0, 1], { extrapolateRight: "clamp" }),
              }}>
                {r.endpoint.padEnd(18)}{r.model.padEnd(14)}{r.calls.padEnd(8)}{r.cost.padEnd(10)}{r.delta}
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 16, padding: "10px 14px", backgroundColor: "rgba(57,255,20,0.08)",
            borderLeft: `3px solid ${COLORS.green}`, borderRadius: 4, fontSize: 14, color: COLORS.green,
            opacity: interpolate(frame, [110, 125], [0, 1], { extrapolateRight: "clamp" }),
          }}>
            💡 /api/classify could use gpt-4.1-mini — save ~$2.80/run
          </div>
        </div>
      </div>

      <div style={{
        position: "absolute", bottom: 70, fontSize: 36, color: COLORS.white,
        opacity: interpolate(frame, [140, 160], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        Every PR. <span style={{ color: COLORS.green }}>Automatically.</span>
      </div>
    </AbsoluteFill>
  );
};
