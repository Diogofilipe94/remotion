import React from "react";
import { AbsoluteFill } from "remotion";

interface VideoComponentProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
}

const VideoComponent: React.FC<VideoComponentProps> = ({ title, subtitle, backgroundColor, textColor }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: backgroundColor || "#000000",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 72,
            fontWeight: "bold",
            color: textColor || "#ffffff",
            margin: 0,
            marginBottom: 20,
          }}
        >
          {title || "Título Padrão"}
        </h1>
        <h2
          style={{
            fontSize: 48,
            fontWeight: "normal",
            color: textColor || "#ffffff",
            margin: 0,
            opacity: 0.8,
          }}
        >
          {subtitle || "Subtítulo Padrão"}
        </h2>
      </div>
    </AbsoluteFill>
  );
};

export default VideoComponent;

