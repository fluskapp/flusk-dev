import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fullScreen, terminalBox } from "../styles";

const dashboardLines = [
  "┌─────────────────────────── Flusk TUI Dashboard ───────────────────────────┐",
  "│  [1] Overview   [2] Models   [3] Alerts   [4] History        q: Quit     │",
  "├───────────────────────────────────────────────────────────────────────────┤",
  "│                                                                           │",
  "│  📊 Today's Usage                        ⚡ Active Models                 │",
  "│  ─────────────────                       ──────────────                   │",
  "│  Total Calls:    182                     gpt-5.2          47 calls       │",
  "│  Total Tokens:   282,340                 gpt-5.2-mini    112 calls       │",
  "│  Total Cost:     $4.70                   claude-4.6       23 calls       │",
  "│                                                                           │",
  "│  📈 Cost Over Time (last 7 days)                                         │",
  "│  $8 ┤                                                                     │",
  "│  $6 ┤      ██                                                             │",
  "│  $4 ┤  ██  ██  ██      ██                                                │",
  "│  $2 ┤  ██  ██  ██  ██  ██  ██                                            │",
  "│  $0 ┼──Mon─Tue─Wed─Thu─Fri─Sat─Sun──                                     │",
  "│                                                                           │",
  "│  🔔 Recent Alerts                                                        │",
  "│  ⚠  Budget 72% used ($36.00 / $50.00)                                   │",
  "│  ✓  12 duplicate prompts cached                                          │",
  "└───────────────────────────────────────────────────────────────────────────┘",
];

export const TUI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 20 }, from: 0.9, to: 1 });
  const kenBurns = interpolate(frame, [0, 150], [1, 1.04], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{ fontSize: 36, color: COLORS.green, marginBottom: 30, opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }) }}>
        Interactive TUI Dashboard
      </div>
      <div style={{ ...terminalBox, maxWidth: 1300, transform: `scale(${scale * kenBurns})`, padding: "24px 32px" }}>
        <div style={{ fontSize: 14, color: COLORS.gray, marginBottom: 12 }}>● ● ● flusk tui</div>
        {dashboardLines.map((line, i) => {
          const lineStart = 10 + i * 4;
          const opacity = interpolate(frame, [lineStart, lineStart + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          let color = COLORS.white;
          if (line.includes("┌") || line.includes("┐") || line.includes("├") || line.includes("┤") || line.includes("└") || line.includes("┘") || line.includes("│")) color = COLORS.greenDim;
          if (line.includes("Flusk TUI")) color = COLORS.green;
          return (
            <div key={i} style={{ fontSize: 14, color, opacity, fontFamily: "monospace", whiteSpace: "pre", lineHeight: 1.4 }}>
              {line}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
