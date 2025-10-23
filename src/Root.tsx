import { Composition } from "remotion";
import VideoComponent from "./VideoComponent";
import ImageVideoComponent from "./ImageVideoComponent";
import AdvancedVideoComponent from "./AdvancedVideoComponent";
import React from "react";

export const RemotionRoot = () => {
  return (
    <>
      {/* ========== TEMPLATES SIMPLES (SÓ TEXTO) ========== */}
      
      {/* Template básico: apenas texto com cores */}
      <Composition
        id="VideoTextoSimples"
        fps={30}
        height={1080}
        width={1920}
        durationInFrames={150}
        component={VideoComponent}
      />
      
      {/* ========== TEMPLATES COM IMAGEM ========== */}
      
      {/* Template com imagem de fundo + título + subtítulo + música + logo (Landscape 16:9) */}
      <Composition
        id="VideoImagemTituloSubtituloMusica"
        fps={30}
        height={1080}
        width={1920}
        durationInFrames={300}
        component={ImageVideoComponent}
        defaultProps={{
          title: "Título do Vídeo",
          subtitle: "Subtítulo exemplo",
          backgroundColor: "#1a1a1a",
          textColor: "#ffffff",
        }}
      />
      
      {/* Template com imagem: Instagram Post (1:1) */}
      <Composition
        id="VideoImagemTituloSubtituloMusicaInstagramPost"
        fps={30}
        height={1080}
        width={1080}
        durationInFrames={300}
        component={ImageVideoComponent}
        defaultProps={{
          title: "Título do Vídeo",
          subtitle: "Subtítulo exemplo",
          backgroundColor: "#1a1a1a",
          textColor: "#ffffff",
        }}
      />
      
      {/* Template com imagem: Instagram Stories/Reels (9:16) */}
      <Composition
        id="VideoImagemTituloSubtituloMusicaInstagramStories"
        fps={30}
        height={1920}
        width={1080}
        durationInFrames={300}
        component={ImageVideoComponent}
        defaultProps={{
          title: "Título do Vídeo",
          subtitle: "Subtítulo exemplo",
          backgroundColor: "#1a1a1a",
          textColor: "#ffffff",
        }}
      />
      
      {/* ========== TEMPLATES COM VÍDEO ========== */}
      
      {/* Template avançado: vídeo de fundo + música + título + subtítulo + logotipo - Full HD Landscape */}
      <Composition
        id="VideoTituloSubtituloMusica"
        fps={30}
        height={1080}
        width={1920}
        durationInFrames={300}
        component={AdvancedVideoComponent}
        defaultProps={{
          title: "Título do Vídeo",
          subtitle: "Subtítulo exemplo",
          backgroundColor: "#1a1a1a",
          textColor: "#ffffff",
        }}
      />
      
      {/* Template avançado: Instagram Post Quadrado (1:1) */}
      <Composition
        id="VideoTituloSubtituloMusicaInstagramPost"
        fps={30}
        height={1080}
        width={1080}
        durationInFrames={300}
        component={AdvancedVideoComponent}
        defaultProps={{
          title: "Título do Vídeo",
          subtitle: "Subtítulo exemplo",
          backgroundColor: "#1a1a1a",
          textColor: "#ffffff",
        }}
      />
      
      {/* Template avançado: Instagram Stories/Reels (9:16) */}
      <Composition
        id="VideoTituloSubtituloMusicaInstagramStories"
        fps={30}
        height={1920}
        width={1080}
        durationInFrames={300}
        component={AdvancedVideoComponent}
        defaultProps={{
          title: "Título do Vídeo",
          subtitle: "Subtítulo exemplo",
          backgroundColor: "#1a1a1a",
          textColor: "#ffffff",
        }}
      />
      
      {/* Template avançado: TikTok/YouTube Shorts (9:16) */}
      <Composition
        id="VideoTituloSubtituloMusicaTikTok"
        fps={30}
        height={1920}
        width={1080}
        durationInFrames={900}
        component={AdvancedVideoComponent}
        defaultProps={{
          title: "Título do Vídeo",
          subtitle: "Subtítulo exemplo",
          backgroundColor: "#1a1a1a",
          textColor: "#ffffff",
        }}
      />
      
      {/* Template avançado: YouTube (16:9) */}
      <Composition
        id="VideoTituloSubtituloMusicaYouTube"
        fps={30}
        height={1080}
        width={1920}
        durationInFrames={900}
        component={AdvancedVideoComponent}
        defaultProps={{
          title: "Título do Vídeo",
          subtitle: "Subtítulo exemplo",
          backgroundColor: "#1a1a1a",
          textColor: "#ffffff",
        }}
      />
    </>
  );
};