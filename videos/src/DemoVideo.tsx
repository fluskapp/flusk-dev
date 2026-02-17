import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Hero } from "./scenes/Hero";
import { Problem } from "./scenes/Problem";
import { Install } from "./scenes/Install";
import { Analyze } from "./scenes/Analyze";
import { Report } from "./scenes/Report";
import { CTA } from "./scenes/CTA";

export const DemoVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <Sequence from={0} durationInFrames={75}>
        <Hero />
      </Sequence>
      <Sequence from={75} durationInFrames={75}>
        <Problem />
      </Sequence>
      <Sequence from={150} durationInFrames={75}>
        <Install />
      </Sequence>
      <Sequence from={225} durationInFrames={90}>
        <Analyze />
      </Sequence>
      <Sequence from={315} durationInFrames={105}>
        <Report />
      </Sequence>
      <Sequence from={390} durationInFrames={60}>
        <CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
