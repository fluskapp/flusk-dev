import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, fullScreen, terminalBox } from "../styles";

const features = [
  { icon: "🔑", label: "Auth Token Validation", desc: "Bearer tokens verified on every request" },
  { icon: "🔒", label: "PII Redaction (--redact)", desc: "Strips emails, keys & secrets from logs" },
  { icon: "🛡️", label: "Path Validation", desc: "Only whitelisted files can be analyzed" },
  { icon: "📋", label: "Session Isolation", desc: "Each run scoped to unique session ID" },
];

export const Security: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 80], [0.96, 1.02], { extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{ fontSize: 42, fontWeight: 700, color: COLORS.green, opacity: titleOpacity, textShadow: `0 0 20px rgba(57, 255, 20, 0.4)`, marginBottom: 40 }}>
        🛡️ Security First
      </div>

      <div style={{ ...terminalBox, maxWidth: 1000, transform: `scale(${zoom})` }}>
        {features.map((f, i) => {
          const start = 15 + i * 14;
          const opacity = interpolate(frame, [start, start + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, marginTop: i > 0 ? 20 : 0, opacity }}>
              <div style={{ fontSize: 36 }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 22, color: COLORS.green, fontWeight: 700 }}>{f.label}</div>
                <div style={{ fontSize: 16, color: COLORS.gray, marginTop: 4 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
