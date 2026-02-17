import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, fullScreen, terminalBox } from "../styles";

export const ExportIntegration: React.FC = () => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  const cmd = "flusk export setup grafana --api-key gf_xxx";
  const typedChars = Math.min(cmd.length, Math.floor(interpolate(frame, [5, 40], [0, cmd.length], { extrapolateRight: "clamp" })));
  const cursorVisible = frame % 16 < 10 && frame < 45;

  const lines = [
    { text: "✓ Grafana Tempo endpoint configured", color: COLORS.green },
    { text: "✓ Test span sent successfully (200 OK)", color: COLORS.green },
    { text: "✓ Export active: SQLite + Grafana (parallel)", color: COLORS.green },
    { text: "", color: COLORS.gray },
    { text: "Active export targets:", color: COLORS.cyan },
    { text: "  → local    SQLite    /data/flusk.db", color: COLORS.white },
    { text: "  → grafana  OTLP      https://tempo.grafana.net", color: COLORS.white },
    { text: "  → datadog  OTLP      https://api.datadoghq.com", color: COLORS.white },
  ];

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.green, opacity: titleOpacity, textShadow: `0 0 20px rgba(57, 255, 20, 0.4)`, marginBottom: 30 }}>
        📊 Export & Integrations
      </div>
      <div style={{ ...terminalBox, maxWidth: 1100 }}>
        <div style={{ fontSize: 14, color: COLORS.gray, marginBottom: 16 }}>● ● ● Terminal</div>
        <div style={{ fontSize: 22, marginBottom: 16 }}>
          <span style={{ color: COLORS.green }}>$ </span>
          <span>{cmd.slice(0, typedChars)}</span>
          {cursorVisible && <span style={{ backgroundColor: COLORS.green, width: 11, height: 24, display: "inline-block", marginLeft: 2 }} />}
        </div>
        {lines.map((l, i) => {
          const opacity = interpolate(frame, [45 + i * 8, 53 + i * 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ opacity, fontSize: 20, color: l.color, marginTop: 4 }}>{l.text || "\u00A0"}</div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
