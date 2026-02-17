import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Hero } from "./scenes/Hero";
import { Problem } from "./scenes/Problem";
import { Install } from "./scenes/Install";
import { Analyze } from "./scenes/Analyze";
import { Report } from "./scenes/Report";
import { Security } from "./scenes/Security";
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

// Scene layout: 2220 frames total (74 sec at 30fps) — 11 scenes
const scenes = [
  { start: 0, dur: 190 },      // Hero - 6.3s
  { start: 170, dur: 190 },    // Problem - 6.3s
  { start: 340, dur: 220 },    // Install - 7.3s
  { start: 540, dur: 250 },    // Analyze - 8.3s
  { start: 770, dur: 270 },    // Report - 9s
  { start: 1020, dur: 200 },   // Security - 6.7s (NEW)
  { start: 1200, dur: 240 },   // TUI - 8s
  { start: 1420, dur: 220 },   // Budget - 7.3s
  { start: 1620, dur: 240 },   // MultiProvider - 8s
  { start: 1840, dur: 220 },   // BeforeAfter - 7.3s
  { start: 2040, dur: 180 },   // CTA - 6s
];

const sceneComponents = [Hero, Problem, Install, Analyze, Report, Security, TUI, Budget, MultiProvider, BeforeAfter, CTA];

export const DemoVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {sceneComponents.map((Component, i) => (
        <React.Fragment key={i}>
          <Sequence from={scenes[i].start} durationInFrames={scenes[i].dur}><Component /></Sequence>
          {i < sceneComponents.length - 1 && (
            <Sequence from={scenes[i].start + scenes[i].dur - 20} durationInFrames={20}><Transition durationInFrames={20} /></Sequence>
          )}
        </React.Fragment>
      ))}
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
