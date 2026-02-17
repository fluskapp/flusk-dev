import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Hero } from "./scenes/Hero";
import { Problem } from "./scenes/Problem";
import { Install } from "./scenes/Install";
import { Analyze } from "./scenes/Analyze";
import { Report } from "./scenes/Report";
import { TUI } from "./scenes/TUI";
import { Budget } from "./scenes/Budget";
import { MultiProvider } from "./scenes/MultiProvider";
import { BeforeAfter } from "./scenes/BeforeAfter";
import { CTA } from "./scenes/CTA";

const Transition: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, durationInFrames], [1, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a", opacity, zIndex: 10 }} />
  );
};

// Scene layout: ~2200 frames total (73 sec at 30fps)
// Each scene gets lots of breathing room, with 20-frame fade transitions
const scenes = [
  { start: 0, dur: 210 },      // Hero - 7s
  { start: 190, dur: 210 },    // Problem - 7s
  { start: 380, dur: 240 },    // Install - 8s
  { start: 600, dur: 270 },    // Analyze - 9s
  { start: 850, dur: 300 },    // Report - 10s
  { start: 1130, dur: 270 },   // TUI - 9s
  { start: 1380, dur: 240 },   // Budget - 8s
  { start: 1600, dur: 270 },   // MultiProvider - 9s
  { start: 1850, dur: 240 },   // BeforeAfter - 8s
  { start: 2070, dur: 150 },   // CTA - 5s
];

export const DemoVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <Sequence from={scenes[0].start} durationInFrames={scenes[0].dur}><Hero /></Sequence>
      <Sequence from={scenes[0].start + scenes[0].dur - 20} durationInFrames={20}><Transition durationInFrames={20} /></Sequence>

      <Sequence from={scenes[1].start} durationInFrames={scenes[1].dur}><Problem /></Sequence>
      <Sequence from={scenes[1].start + scenes[1].dur - 20} durationInFrames={20}><Transition durationInFrames={20} /></Sequence>

      <Sequence from={scenes[2].start} durationInFrames={scenes[2].dur}><Install /></Sequence>
      <Sequence from={scenes[2].start + scenes[2].dur - 20} durationInFrames={20}><Transition durationInFrames={20} /></Sequence>

      <Sequence from={scenes[3].start} durationInFrames={scenes[3].dur}><Analyze /></Sequence>
      <Sequence from={scenes[3].start + scenes[3].dur - 20} durationInFrames={20}><Transition durationInFrames={20} /></Sequence>

      <Sequence from={scenes[4].start} durationInFrames={scenes[4].dur}><Report /></Sequence>
      <Sequence from={scenes[4].start + scenes[4].dur - 20} durationInFrames={20}><Transition durationInFrames={20} /></Sequence>

      <Sequence from={scenes[5].start} durationInFrames={scenes[5].dur}><TUI /></Sequence>
      <Sequence from={scenes[5].start + scenes[5].dur - 20} durationInFrames={20}><Transition durationInFrames={20} /></Sequence>

      <Sequence from={scenes[6].start} durationInFrames={scenes[6].dur}><Budget /></Sequence>
      <Sequence from={scenes[6].start + scenes[6].dur - 20} durationInFrames={20}><Transition durationInFrames={20} /></Sequence>

      <Sequence from={scenes[7].start} durationInFrames={scenes[7].dur}><MultiProvider /></Sequence>
      <Sequence from={scenes[7].start + scenes[7].dur - 20} durationInFrames={20}><Transition durationInFrames={20} /></Sequence>

      <Sequence from={scenes[8].start} durationInFrames={scenes[8].dur}><BeforeAfter /></Sequence>
      <Sequence from={scenes[8].start + scenes[8].dur - 20} durationInFrames={20}><Transition durationInFrames={20} /></Sequence>

      <Sequence from={scenes[9].start} durationInFrames={scenes[9].dur}><CTA /></Sequence>
    </AbsoluteFill>
  );
};

// Sub-compositions for individual GIFs
export const InstallScene: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
    <Install />
  </AbsoluteFill>
);

export const ReportScene: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
    <Report />
  </AbsoluteFill>
);

export const TUIScene: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
    <TUI />
  </AbsoluteFill>
);
