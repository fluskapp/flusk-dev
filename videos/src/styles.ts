import { CSSProperties } from "react";

export const COLORS = {
  bg: "#0a0a0a",
  green: "#39FF14",
  greenDim: "#1a7a0a",
  white: "#e0e0e0",
  gray: "#666",
  red: "#ff4444",
  yellow: "#ffaa00",
  cyan: "#00d4ff",
};

export const fullScreen: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: COLORS.bg,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
  color: COLORS.white,
};

export const terminalBox: CSSProperties = {
  backgroundColor: "#111",
  border: `1px solid ${COLORS.greenDim}`,
  borderRadius: 12,
  padding: "32px 40px",
  maxWidth: 1100,
  width: "80%",
  boxShadow: `0 0 40px rgba(57, 255, 20, 0.08)`,
};
