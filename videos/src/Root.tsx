import React from "react";
import { Composition } from "remotion";
import { DemoVideo, InstallScene, ReportScene, TUIScene } from "./DemoVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DemoVideo"
        component={DemoVideo}
        durationInFrames={2220}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="InstallScene"
        component={InstallScene}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ReportScene"
        component={ReportScene}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="TUIScene"
        component={TUIScene}
        durationInFrames={270}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
