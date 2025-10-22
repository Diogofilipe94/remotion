import { Composition } from "remotion";
import VideoComponent from "./VideoComponent";
import React from "react";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="VideoRoot"
        fps={30}
        height={1080}
        width={1920}
        durationInFrames={150}
        component={VideoComponent}
      />
    </>
  );
};