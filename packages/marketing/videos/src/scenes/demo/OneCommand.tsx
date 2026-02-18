import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fullScreen, terminalBox } from "../../styles";

const command = "npx @flusk/cli analyze ./my-ai-app.js";
const spinner = "⠋ Intercepting LLM calls...";

const tableRows = [
  { model: "gpt-4o", calls: "34", cost: "$9.02 (73.1%)", highlight: true },
  { model: "gpt-4.1-mini", calls: "8", cost: "$1.89 (15.3%)", highlight: false },
  { model: "gpt-3.5", calls: "5", cost: "$1.43 (11.6%)", highlight: false },
];

export const OneCommand: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const typedChars = Math.min(Math.floor(frame / 2), command.length);
  const showSpinner = frame > command.length * 2 + 10 && frame < command.length * 2 + 50;
  const tableStart = command.length * 2 + 50;

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{ ...terminalBox, fontSize: 22, lineHeight: 2 }}>
        <div>
          <span style={{ color: COLORS.green }}>$ </span>
          <span>{command.slice(0, typedChars)}</span>
          {typedChars < command.length && (
            <span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>▌</span>
          )}
        </div>

        {showSpinner && (
          <div style={{ color: COLORS.cyan, marginTop: 8 }}>{spinner}</div>
        )}

        {frame >= tableStart && (
          <div style={{ marginTop: 16, fontSize: 18 }}>
            <div style={{ color: COLORS.gray, borderBottom: `1px solid ${COLORS.gray}`, paddingBottom: 4, marginBottom: 8 }}>
              {"Model".padEnd(16)}{"Calls".padEnd(8)}Cost
            </div>
            {tableRows.map((row, i) => {
              const rowOp = spring({ frame: frame - tableStart - i * 12, fps, config: { damping: 20 } });
              return (
                <div key={i} style={{
                  opacity: Math.max(0, rowOp),
                  color: row.highlight ? "#ff6b35" : COLORS.white,
                  backgroundColor: row.highlight ? "rgba(255,107,53,0.1)" : "transparent",
                  padding: "4px 8px", borderRadius: 4,
                }}>
                  {row.model.padEnd(16)}{row.calls.padEnd(8)}{row.cost}
                </div>
              );
            })}
            <div style={{
              borderTop: `1px solid ${COLORS.gray}`, marginTop: 8, paddingTop: 8,
              color: COLORS.white, fontWeight: 700,
              opacity: interpolate(frame, [tableStart + 50, tableStart + 60], [0, 1], { extrapolateRight: "clamp" }),
            }}>
              {"TOTAL".padEnd(16)}{"47".padEnd(8)}$12.34
            </div>
          </div>
        )}
      </div>

      <div style={{
        position: "absolute", bottom: 80, fontSize: 36, color: COLORS.green,
        opacity: interpolate(frame, [tableStart + 60, tableStart + 75], [0, 1], { extrapolateRight: "clamp" }),
        textShadow: `0 0 20px rgba(57,255,20,0.4)`,
      }}>
        One command. Full visibility.
      </div>
    </AbsoluteFill>
  );
};
