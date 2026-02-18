import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { TheProblem } from "./scenes/demo/TheProblem";
import { OneCommand } from "./scenes/demo/OneCommand";
import { AIExplains } from "./scenes/demo/AIExplains";
import { InYourCI } from "./scenes/demo/InYourCI";
import { ZeroSetup } from "./scenes/demo/ZeroSetup";
import { CallToAction } from "./scenes/demo/CallToAction";

// 40s at 30fps = 1200 frames
const scenes = [
  { start: 0, dur: 150 },      // 0-5s
  { start: 150, dur: 240 },    // 5-13s
  { start: 390, dur: 300 },    // 13-23s
  { start: 690, dur: 240 },    // 23-31s
  { start: 930, dur: 150 },    // 31-36s
  { start: 1080, dur: 120 },   // 36-40s
];

const Fade: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, dur], [1, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: "#0a0a0a", opacity: op, zIndex: 10 }} />;
};

const comps = [TheProblem, OneCommand, AIExplains, InYourCI, ZeroSetup, CallToAction];

export const DemoExplain: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
    {comps.map((C, i) => (
      <React.Fragment key={i}>
        <Sequence from={scenes[i].start} durationInFrames={scenes[i].dur}><C /></Sequence>
        {i < comps.length - 1 && (
          <Sequence from={scenes[i].start + scenes[i].dur - 15} durationInFrames={15}><Fade dur={15} /></Sequence>
        )}
      </React.Fragment>
    ))}
  </AbsoluteFill>
);

// GIF sub-compositions
export const AnalyzeGif: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}><OneCommand /></AbsoluteFill>
);

export const ExplainGif: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}><AIExplains /></AbsoluteFill>
);
