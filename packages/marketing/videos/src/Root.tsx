import React from "react";
import { Composition } from "remotion";
import { DemoVideo, InstallScene, ReportScene, TUIScene } from "./DemoVideo";
import { BeforeAfter } from "./scenes/BeforeAfter";
import { CostTracking } from "./scenes/CostTracking";
import { DuplicateDetection } from "./scenes/DuplicateDetection";
import { ModelOptimization } from "./scenes/ModelOptimization";
import { Budget } from "./scenes/Budget";
import { ExportIntegration } from "./scenes/ExportIntegration";
import { Security } from "./scenes/Security";
import { MultiProvider } from "./scenes/MultiProvider";
import { TUI } from "./scenes/TUI";
import { AbsoluteFill } from "remotion";

const Wrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>{children}</AbsoluteFill>
);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="DemoVideo" component={DemoVideo} durationInFrames={2220} fps={30} width={1920} height={1080} />
      <Composition id="InstallScene" component={InstallScene} durationInFrames={240} fps={30} width={1920} height={1080} />
      <Composition id="ReportScene" component={ReportScene} durationInFrames={300} fps={30} width={1920} height={1080} />
      <Composition id="TUIScene" component={TUIScene} durationInFrames={270} fps={30} width={1920} height={1080} />
      <Composition id="BeforeAfterScene" component={() => <Wrap><BeforeAfter /></Wrap>} durationInFrames={150} fps={30} width={1920} height={1080} />
      <Composition id="CostTrackingScene" component={() => <Wrap><CostTracking /></Wrap>} durationInFrames={120} fps={30} width={1920} height={1080} />
      <Composition id="DuplicateDetectionScene" component={() => <Wrap><DuplicateDetection /></Wrap>} durationInFrames={120} fps={30} width={1920} height={1080} />
      <Composition id="ModelOptimizationScene" component={() => <Wrap><ModelOptimization /></Wrap>} durationInFrames={120} fps={30} width={1920} height={1080} />
      <Composition id="BudgetScene" component={() => <Wrap><Budget /></Wrap>} durationInFrames={150} fps={30} width={1920} height={1080} />
      <Composition id="ExportIntegrationScene" component={() => <Wrap><ExportIntegration /></Wrap>} durationInFrames={150} fps={30} width={1920} height={1080} />
      <Composition id="SecurityScene" component={() => <Wrap><Security /></Wrap>} durationInFrames={120} fps={30} width={1920} height={1080} />
      <Composition id="MultiProviderScene" component={() => <Wrap><MultiProvider /></Wrap>} durationInFrames={150} fps={30} width={1920} height={1080} />
      <Composition id="TUIDashboardScene" component={() => <Wrap><TUI /></Wrap>} durationInFrames={150} fps={30} width={1920} height={1080} />
    </>
  );
};
