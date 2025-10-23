import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Video,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";

interface AdvancedVideoComponentProps {
  title?: string;
  subtitle?: string;
  videoUrl?: string;
  audioUrl?: string;
  logoUrl?: string;
  backgroundColor?: string;
  textColor?: string;
}

const AdvancedVideoComponent: React.FC<AdvancedVideoComponentProps> = ({
  title = "Título Padrão",
  subtitle = "Subtítulo Padrão",
  videoUrl,
  audioUrl,
  logoUrl,
  backgroundColor = "#000000",
  textColor = "#ffffff",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Animação de fade in para o título (primeiros 30 frames = 1 segundo)
  const titleOpacity = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: {
      damping: 100,
    },
  });

  // Animação de slide in para o título (da esquerda)
  const titleTranslateX = interpolate(
    frame,
    [0, 30],
    [-100, 0],
    {
      extrapolateRight: "clamp",
    }
  );

  // Animação de fade in para o subtítulo (começa aos 15 frames)
  const subtitleOpacity = interpolate(
    frame,
    [15, 45],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Animação de slide in para o subtítulo (da direita)
  const subtitleTranslateX = interpolate(
    frame,
    [15, 45],
    [100, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Fade out no final (últimos 30 frames)
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 30, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Animação da marca de água (pulsa suavemente)
  const logoPulse = interpolate(
    frame % 60,
    [0, 30, 60],
    [1, 1.05, 1]
  );

  return (
    <AbsoluteFill>
      {/* Vídeo de fundo (se fornecido) */}
      {videoUrl && (
        <AbsoluteFill>
          <Video
            src={videoUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            volume={0.3} // Volume baixo para não competir com o áudio principal
          />
          {/* Overlay escuro para melhorar legibilidade do texto */}
          <AbsoluteFill
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* Cor de fundo sólida (se não houver vídeo) */}
      {!videoUrl && (
        <AbsoluteFill
          style={{
            backgroundColor,
          }}
        />
      )}

      {/* Áudio de fundo */}
      {audioUrl && (
        <Audio
          src={audioUrl}
          volume={1}
        />
      )}

      {/* Conteúdo principal */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "100px",
          opacity: fadeOut,
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: "1400px",
          }}
        >
          {/* Título com animação */}
          <div
            style={{
              opacity: titleOpacity,
              transform: `translateX(${titleTranslateX}px)`,
            }}
          >
            <h1
              style={{
                fontSize: 96,
                fontWeight: "bold",
                color: textColor,
                margin: 0,
                marginBottom: 30,
                textShadow: "0 4px 20px rgba(0, 0, 0, 0.8)",
                letterSpacing: "2px",
              }}
            >
              {title}
            </h1>
          </div>

          {/* Subtítulo com animação */}
          <div
            style={{
              opacity: subtitleOpacity,
              transform: `translateX(${subtitleTranslateX}px)`,
            }}
          >
            <h2
              style={{
                fontSize: 56,
                fontWeight: "normal",
                color: textColor,
                margin: 0,
                opacity: 0.9,
                textShadow: "0 2px 15px rgba(0, 0, 0, 0.8)",
                letterSpacing: "1px",
              }}
            >
              {subtitle}
            </h2>
          </div>
        </div>
      </AbsoluteFill>

      {/* Marca de água / Logotipo no canto inferior esquerdo */}
      {logoUrl && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "flex-start",
            padding: "40px",
          }}
        >
          <div
            style={{
              transform: `scale(${logoPulse})`,
              transition: "transform 0.3s ease",
            }}
          >
            <Img
              src={logoUrl}
              style={{
                height: "80px",
                width: "auto",
                opacity: 0.8,
                filter: "drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5))",
              }}
            />
          </div>
        </AbsoluteFill>
      )}

      {/* Barra decorativa no topo (opcional) */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          opacity: fadeOut,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "5px",
            background: `linear-gradient(90deg, ${textColor} 0%, transparent 100%)`,
            opacity: 0.6,
          }}
        />
      </AbsoluteFill>

      {/* Barra decorativa na base (opcional) */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          opacity: fadeOut,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "5px",
            background: `linear-gradient(90deg, transparent 0%, ${textColor} 100%)`,
            opacity: 0.6,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default AdvancedVideoComponent;

