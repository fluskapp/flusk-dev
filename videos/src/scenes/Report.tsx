import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, fullScreen, terminalBox } from "../styles";

const rows = [
  { model: "gpt-5.2", calls: "47", tokens: "125,340", cost: "$3.76" },
  { model: "gpt-5.2-mini", calls: "112", tokens: "89,200", cost: "$0.13" },
  { model: "claude-4.6", calls: "23", tokens: "67,800", cost: "$0.81" },
];

const suggestions = [
  "→ 12 duplicate prompts detected (saving ~$0.89/day)",
  "→ 31 gpt-5.2 calls could use gpt-5.2-mini (saving ~$2.10/day)",
  "→ Consider caching for repeated classification calls",
];

export const Report: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{ ...terminalBox, maxWidth: 1200 }}>
        <div
          style={{
            fontSize: 24,
            color: COLORS.green,
            textAlign: "center",
            marginBottom: 24,
            opacity: headerOpacity,
          }}
        >
          Flusk Cost Report
        </div>

        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "200px 100px 140px 120px",
            gap: 8,
            fontSize: 18,
            color: COLORS.green,
            borderBottom: `1px solid ${COLORS.greenDim}`,
            paddingBottom: 8,
            marginBottom: 8,
            opacity: headerOpacity,
          }}
        >
          <span>Model</span>
          <span>Calls</span>
          <span>Tokens</span>
          <span>Cost</span>
        </div>

        {/* Rows */}
        {rows.map((row, i) => {
          const rowStart = 10 + i * 10;
          const opacity = interpolate(frame, [rowStart, rowStart + 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "200px 100px 140px 120px",
                gap: 8,
                fontSize: 18,
                color: COLORS.white,
                opacity,
                marginTop: 6,
              }}
            >
              <span>{row.model}</span>
              <span>{row.calls}</span>
              <span>{row.tokens}</span>
              <span style={{ color: COLORS.yellow }}>{row.cost}</span>
            </div>
          );
        })}

        {/* Total */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "200px 100px 140px 120px",
            gap: 8,
            fontSize: 18,
            color: COLORS.green,
            fontWeight: 700,
            borderTop: `1px solid ${COLORS.greenDim}`,
            paddingTop: 10,
            marginTop: 10,
            opacity: interpolate(frame, [40, 48], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <span>Total</span>
          <span>182</span>
          <span>282,340</span>
          <span>$4.70</span>
        </div>

        {/* Suggestions */}
        <div style={{ marginTop: 32 }}>
          <div
            style={{
              fontSize: 18,
              color: COLORS.yellow,
              opacity: interpolate(frame, [52, 58], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            ⚠ Optimization Suggestions:
          </div>
          {suggestions.map((s, i) => {
            const sStart = 60 + i * 10;
            return (
              <div
                key={i}
                style={{
                  fontSize: 16,
                  color: COLORS.gray,
                  marginTop: 6,
                  opacity: interpolate(frame, [sStart, sStart + 8], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                {s}
              </div>
            );
          })}
        </div>

        {/* Savings */}
        <div
          style={{
            fontSize: 22,
            color: COLORS.green,
            marginTop: 24,
            textAlign: "center",
            opacity: interpolate(frame, [90, 100], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            textShadow: `0 0 15px rgba(57, 255, 20, 0.5)`,
          }}
        >
          💰 Estimated monthly savings: $89.70
        </div>
      </div>
    </AbsoluteFill>
  );
};
