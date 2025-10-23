import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar multer para upload de ficheiros
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "/app/uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Apenas ficheiros de imagem e vídeo são permitidos"), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

// Criar directórios necessários
const createDirectories = async () => {
  try {
    await fs.mkdir("/app/output", { recursive: true });
    await fs.mkdir("/app/uploads", { recursive: true });
  } catch (error) {
    console.error("Erro ao criar directórios:", error);
  }
};

createDirectories();

// Servir ficheiros estáticos
app.use("/uploads", express.static("/app/uploads"));
app.use("/output", express.static("/app/output"));

// Endpoint para gerar vídeo simples
app.post("/api/generate-video", async (req, res) => {
  try {
    const { title, subtitle, backgroundColor, textColor } = req.body;
    const videoId = uuidv4();
    const outputPath = `/app/output/${videoId}.mp4`;
    
    const inputProps = {
      title: title || "Título Padrão",
      subtitle: subtitle || "Subtítulo Padrão",
      backgroundColor: backgroundColor || "#000000",
      textColor: textColor || "#ffffff"
    };

    console.log("Starting video generation...");
    console.log("Input props:", inputProps);

    const result = await new Promise((resolve, reject) => {
      const inputPropsJson = JSON.stringify(inputProps);
      const child = spawn("node", ["render.mjs", "VideoTextoSimples", outputPath, inputPropsJson], {
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
        console.log("Render output:", data.toString());
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
        console.error("Render error:", data.toString());
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve({
            success: true,
            outputPath: `output/${videoId}.mp4`,
            stdout,
          });
        } else {
          reject({
            success: false,
            error: stderr || "Render process failed",
            code,
          });
        }
      });

      child.on("error", (error) => {
        reject({
          success: false,
          error: error.message,
        });
      });
    });

    if (result.success) {
      res.json({
        success: true,
        videoId,
        outputPath: `output/${videoId}.mp4`,
        message: "Vídeo gerado com sucesso!"
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error("Erro ao gerar vídeo:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para gerar vídeo com imagem
app.post("/api/generate-video-with-image", upload.single("image"), async (req, res) => {
  try {
    const { title, subtitle, backgroundColor, textColor } = req.body;
    const videoId = uuidv4();
    const outputPath = `/app/output/${videoId}.mp4`;
    
    const inputProps = {
      title: title || "Título Padrão",
      subtitle: subtitle || "Subtítulo Padrão",
      backgroundColor: backgroundColor || "#000000",
      textColor: textColor || "#ffffff",
      imagePath: req.file ? req.file.path : null
    };

    const result = await new Promise((resolve, reject) => {
      const inputPropsJson = JSON.stringify(inputProps);
      const child = spawn("node", ["render.mjs", "VideoTextoSimples", outputPath, inputPropsJson], {
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
        console.log("Render output:", data.toString());
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
        console.error("Render error:", data.toString());
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve({
            success: true,
            outputPath: `output/${videoId}.mp4`,
            stdout,
          });
        } else {
          reject({
            success: false,
            error: stderr || "Render process failed",
            code,
          });
        }
      });

      child.on("error", (error) => {
        reject({
          success: false,
          error: error.message,
        });
      });
    });

    if (result.success) {
      res.json({
        success: true,
        videoId,
        outputPath: `output/${videoId}.mp4`,
        message: "Vídeo gerado com sucesso!"
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error("Erro ao gerar vídeo:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para gerar vídeo avançado (com vídeo, áudio, logo, título, subtítulo, música)
app.post("/api/generate-advanced-video", upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, subtitle, backgroundColor, textColor, durationInSeconds } = req.body;
    const videoId = uuidv4();
    const outputPath = `/app/output/${videoId}.mp4`;
    
    // Processar ficheiros enviados
    const files = req.files;
    const videoUrl = files?.video ? `/app/uploads/${files.video[0].filename}` : null;
    const audioUrl = files?.audio ? `/app/uploads/${files.audio[0].filename}` : null;
    const logoUrl = files?.logo ? `/app/uploads/${files.logo[0].filename}` : null;
    
    // Calcular duração em frames (padrão: 10 segundos)
    const duration = parseInt(durationInSeconds) || 10;
    const durationInFrames = duration * 30; // 30 fps
    
    const inputProps = {
      title: title || "Título Padrão",
      subtitle: subtitle || "Subtítulo Padrão",
      backgroundColor: backgroundColor || "#1a1a1a",
      textColor: textColor || "#ffffff",
      videoUrl,
      audioUrl,
      logoUrl,
    };

    console.log("Gerando vídeo avançado...");
    console.log("Input props:", inputProps);
    console.log("Duração:", durationInFrames, "frames");

    const result = await new Promise((resolve, reject) => {
      const inputPropsJson = JSON.stringify(inputProps);
      const child = spawn("node", [
        "render.mjs", 
        "VideoTituloSubtituloMusica",  // Usar a composição avançada
        outputPath, 
        inputPropsJson,
        durationInFrames.toString()  // Passar duração como argumento
      ], {
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
        console.log("Render output:", data.toString());
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
        console.error("Render error:", data.toString());
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve({
            success: true,
            outputPath: `output/${videoId}.mp4`,
            stdout,
          });
        } else {
          reject({
            success: false,
            error: stderr || "Render process failed",
            code,
          });
        }
      });

      child.on("error", (error) => {
        reject({
          success: false,
          error: error.message,
        });
      });
    });

    if (result.success) {
      res.json({
        success: true,
        videoId,
        outputPath: `output/${videoId}.mp4`,
        duration: duration,
        message: "Vídeo avançado gerado com sucesso!",
        files: {
          video: videoUrl ? files.video[0].filename : null,
          audio: audioUrl ? files.audio[0].filename : null,
          logo: logoUrl ? files.logo[0].filename : null,
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error("Erro ao gerar vídeo avançado:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para gerar vídeo com IMAGEM de fundo
app.post("/api/generate-video-with-image-full", upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, subtitle, backgroundColor, textColor, durationInSeconds, format } = req.body;
    const videoId = uuidv4();
    const outputPath = `/app/output/${videoId}.mp4`;
    
    // Processar ficheiros enviados
    const files = req.files;
    const imageUrl = files?.image ? `http://localhost:3000/uploads/${files.image[0].filename}` : null;
    const audioUrl = files?.audio ? `http://localhost:3000/uploads/${files.audio[0].filename}` : null;
    const logoUrl = files?.logo ? `http://localhost:3000/uploads/${files.logo[0].filename}` : null;
    
    // Calcular duração em frames (padrão: 10 segundos)
    const duration = parseInt(durationInSeconds) || 10;
    const durationInFrames = duration * 30; // 30 fps
    
    // Mapear formatos para IDs de composição (para IMAGEM)
    const formatMap = {
      'landscape': 'VideoImagemTituloSubtituloMusica',           // 16:9 - 1920x1080
      'youtube': 'VideoImagemTituloSubtituloMusica',             // 16:9 - 1920x1080
      'instagram-post': 'VideoImagemTituloSubtituloMusicaInstagramPost',  // 1:1 - 1080x1080
      'instagram-stories': 'VideoImagemTituloSubtituloMusicaInstagramStories', // 9:16 - 1080x1920
      'instagram-reels': 'VideoImagemTituloSubtituloMusicaInstagramStories',   // 9:16 - 1080x1920
      'tiktok': 'VideoImagemTituloSubtituloMusicaInstagramStories',            // 9:16 - 1080x1920
      'youtube-shorts': 'VideoImagemTituloSubtituloMusicaInstagramStories'     // 9:16 - 1080x1920
    };
    
    const compositionId = formatMap[format] || 'VideoImagemTituloSubtituloMusica';
    
    const inputProps = {
      title: title || "Título Padrão",
      subtitle: subtitle || "Subtítulo Padrão",
      backgroundColor: backgroundColor || "#1a1a1a",
      textColor: textColor || "#ffffff",
      imageUrl,
      audioUrl,
      logoUrl,
    };

    console.log("Gerando vídeo com IMAGEM de fundo...");
    console.log("Formato:", format, "→ Composição:", compositionId);
    console.log("Input props:", inputProps);
    console.log("Duração:", durationInFrames, "frames");

    const result = await new Promise((resolve, reject) => {
      const inputPropsJson = JSON.stringify(inputProps);
      const child = spawn("node", [
        "render.mjs", 
        compositionId,
        outputPath, 
        inputPropsJson,
        durationInFrames.toString()
      ], {
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
        console.log("Render output:", data.toString());
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
        console.error("Render error:", data.toString());
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve({
            success: true,
            outputPath: `output/${videoId}.mp4`,
            stdout,
          });
        } else {
          reject({
            success: false,
            error: stderr || "Render process failed",
            code,
          });
        }
      });

      child.on("error", (error) => {
        reject({
          success: false,
          error: error.message,
        });
      });
    });

    if (result.success) {
      const dimensions = {
        'landscape': { width: 1920, height: 1080, ratio: '16:9' },
        'youtube': { width: 1920, height: 1080, ratio: '16:9' },
        'instagram-post': { width: 1080, height: 1080, ratio: '1:1' },
        'instagram-stories': { width: 1080, height: 1920, ratio: '9:16' },
        'instagram-reels': { width: 1080, height: 1920, ratio: '9:16' },
        'tiktok': { width: 1080, height: 1920, ratio: '9:16' },
        'youtube-shorts': { width: 1080, height: 1920, ratio: '9:16' }
      };
      
      const formatInfo = dimensions[format] || dimensions['landscape'];
      
      res.json({
        success: true,
        videoId,
        outputPath: `output/${videoId}.mp4`,
        duration: duration,
        format: format || 'landscape',
        dimensions: formatInfo,
        type: 'image',
        message: "Vídeo com imagem gerado com sucesso!",
        files: {
          image: imageUrl ? files.image[0].filename : null,
          audio: audioUrl ? files.audio[0].filename : null,
          logo: logoUrl ? files.logo[0].filename : null,
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error("Erro ao gerar vídeo com imagem:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para gerar vídeo com VÍDEO de fundo
app.post("/api/generate-video-with-video-full", upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, subtitle, backgroundColor, textColor, durationInSeconds, format } = req.body;
    const videoId = uuidv4();
    const outputPath = `/app/output/${videoId}.mp4`;
    
    // Processar ficheiros enviados
    const files = req.files;
    const videoUrl = files?.video ? `http://localhost:3000/uploads/${files.video[0].filename}` : null;
    const audioUrl = files?.audio ? `http://localhost:3000/uploads/${files.audio[0].filename}` : null;
    const logoUrl = files?.logo ? `http://localhost:3000/uploads/${files.logo[0].filename}` : null;
    
    // Calcular duração em frames (padrão: 10 segundos)
    const duration = parseInt(durationInSeconds) || 10;
    const durationInFrames = duration * 30; // 30 fps
    
    // Mapear formatos para IDs de composição (para VÍDEO)
    const formatMap = {
      'landscape': 'VideoTituloSubtituloMusica',           // 16:9 - 1920x1080
      'youtube': 'VideoTituloSubtituloMusicaYouTube',      // 16:9 - 1920x1080
      'instagram-post': 'VideoTituloSubtituloMusicaInstagramPost',  // 1:1 - 1080x1080
      'instagram-stories': 'VideoTituloSubtituloMusicaInstagramStories', // 9:16 - 1080x1920
      'instagram-reels': 'VideoTituloSubtituloMusicaInstagramStories',   // 9:16 - 1080x1920
      'tiktok': 'VideoTituloSubtituloMusicaTikTok',        // 9:16 - 1080x1920
      'youtube-shorts': 'VideoTituloSubtituloMusicaTikTok' // 9:16 - 1080x1920
    };
    
    const compositionId = formatMap[format] || 'VideoTituloSubtituloMusica';
    
    const inputProps = {
      title: title || "Título Padrão",
      subtitle: subtitle || "Subtítulo Padrão",
      backgroundColor: backgroundColor || "#1a1a1a",
      textColor: textColor || "#ffffff",
      videoUrl,
      audioUrl,
      logoUrl,
    };

    console.log("Gerando vídeo com VÍDEO de fundo...");
    console.log("Formato:", format, "→ Composição:", compositionId);
    console.log("Input props:", inputProps);
    console.log("Duração:", durationInFrames, "frames");

    const result = await new Promise((resolve, reject) => {
      const inputPropsJson = JSON.stringify(inputProps);
      const child = spawn("node", [
        "render.mjs", 
        compositionId,
        outputPath, 
        inputPropsJson,
        durationInFrames.toString()
      ], {
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
        console.log("Render output:", data.toString());
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
        console.error("Render error:", data.toString());
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve({
            success: true,
            outputPath: `output/${videoId}.mp4`,
            stdout,
          });
        } else {
          reject({
            success: false,
            error: stderr || "Render process failed",
            code,
          });
        }
      });

      child.on("error", (error) => {
        reject({
          success: false,
          error: error.message,
        });
      });
    });

    if (result.success) {
      const dimensions = {
        'landscape': { width: 1920, height: 1080, ratio: '16:9' },
        'youtube': { width: 1920, height: 1080, ratio: '16:9' },
        'instagram-post': { width: 1080, height: 1080, ratio: '1:1' },
        'instagram-stories': { width: 1080, height: 1920, ratio: '9:16' },
        'instagram-reels': { width: 1080, height: 1920, ratio: '9:16' },
        'tiktok': { width: 1080, height: 1920, ratio: '9:16' },
        'youtube-shorts': { width: 1080, height: 1920, ratio: '9:16' }
      };
      
      const formatInfo = dimensions[format] || dimensions['landscape'];
      
      res.json({
        success: true,
        videoId,
        outputPath: `output/${videoId}.mp4`,
        duration: duration,
        format: format || 'landscape',
        dimensions: formatInfo,
        type: 'video',
        message: "Vídeo com vídeo de fundo gerado com sucesso!",
        files: {
          video: videoUrl ? files.video[0].filename : null,
          audio: audioUrl ? files.audio[0].filename : null,
          logo: logoUrl ? files.logo[0].filename : null,
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error("Erro ao gerar vídeo com vídeo de fundo:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para gerar vídeo com formato personalizado
app.post("/api/generate-video-format", upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, subtitle, backgroundColor, textColor, durationInSeconds, format } = req.body;
    const videoId = uuidv4();
    const outputPath = `/app/output/${videoId}.mp4`;
    
    // Processar ficheiros enviados
    const files = req.files;
    const videoUrl = files?.video ? `/app/uploads/${files.video[0].filename}` : null;
    const audioUrl = files?.audio ? `/app/uploads/${files.audio[0].filename}` : null;
    const logoUrl = files?.logo ? `/app/uploads/${files.logo[0].filename}` : null;
    
    // Calcular duração em frames (padrão: 10 segundos)
    const duration = parseInt(durationInSeconds) || 10;
    const durationInFrames = duration * 30; // 30 fps
    
    // Mapear formatos para IDs de composição
    const formatMap = {
      'landscape': 'VideoTituloSubtituloMusica',           // 16:9 - 1920x1080
      'youtube': 'VideoTituloSubtituloMusicaYouTube',      // 16:9 - 1920x1080
      'instagram-post': 'VideoTituloSubtituloMusicaInstagramPost',  // 1:1 - 1080x1080
      'instagram-stories': 'VideoTituloSubtituloMusicaInstagramStories', // 9:16 - 1080x1920
      'instagram-reels': 'VideoTituloSubtituloMusicaInstagramStories',   // 9:16 - 1080x1920
      'tiktok': 'VideoTituloSubtituloMusicaTikTok',        // 9:16 - 1080x1920
      'youtube-shorts': 'VideoTituloSubtituloMusicaTikTok' // 9:16 - 1080x1920
    };
    
    const compositionId = formatMap[format] || 'VideoTituloSubtituloMusica';
    
    const inputProps = {
      title: title || "Título Padrão",
      subtitle: subtitle || "Subtítulo Padrão",
      backgroundColor: backgroundColor || "#1a1a1a",
      textColor: textColor || "#ffffff",
      videoUrl,
      audioUrl,
      logoUrl,
    };

    console.log("Gerando vídeo com formato personalizado...");
    console.log("Formato:", format, "→ Composição:", compositionId);
    console.log("Input props:", inputProps);
    console.log("Duração:", durationInFrames, "frames");

    const result = await new Promise((resolve, reject) => {
      const inputPropsJson = JSON.stringify(inputProps);
      const child = spawn("node", [
        "render.mjs", 
        compositionId,
        outputPath, 
        inputPropsJson,
        durationInFrames.toString()
      ], {
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
        console.log("Render output:", data.toString());
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
        console.error("Render error:", data.toString());
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve({
            success: true,
            outputPath: `output/${videoId}.mp4`,
            stdout,
          });
        } else {
          reject({
            success: false,
            error: stderr || "Render process failed",
            code,
          });
        }
      });

      child.on("error", (error) => {
        reject({
          success: false,
          error: error.message,
        });
      });
    });

    if (result.success) {
      // Obter dimensões baseado no formato
      const dimensions = {
        'landscape': { width: 1920, height: 1080, ratio: '16:9' },
        'youtube': { width: 1920, height: 1080, ratio: '16:9' },
        'instagram-post': { width: 1080, height: 1080, ratio: '1:1' },
        'instagram-stories': { width: 1080, height: 1920, ratio: '9:16' },
        'instagram-reels': { width: 1080, height: 1920, ratio: '9:16' },
        'tiktok': { width: 1080, height: 1920, ratio: '9:16' },
        'youtube-shorts': { width: 1080, height: 1920, ratio: '9:16' }
      };
      
      const formatInfo = dimensions[format] || dimensions['landscape'];
      
      res.json({
        success: true,
        videoId,
        outputPath: `output/${videoId}.mp4`,
        duration: duration,
        format: format || 'landscape',
        dimensions: formatInfo,
        message: "Vídeo gerado com sucesso!",
        files: {
          video: videoUrl ? files.video[0].filename : null,
          audio: audioUrl ? files.audio[0].filename : null,
          logo: logoUrl ? files.logo[0].filename : null,
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error("Erro ao gerar vídeo com formato:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para transferir vídeo
app.post("/api/upload-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Nenhum ficheiro foi transferido"
      });
    }

    const videoId = uuidv4();
    const videoInfo = {
      id: videoId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      videoId,
      message: "Vídeo transferido com sucesso",
      video: videoInfo
    });

  } catch (error) {
    console.error("Erro ao transferir ficheiro:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao transferir ficheiro"
    });
  }
});

// Endpoint para listar vídeos transferidos
app.get("/api/uploaded-videos", async (req, res) => {
  try {
    const files = await fs.readdir("/app/uploads");
    const videoFiles = [];

    for (const file of files) {
      const filePath = path.join("/app/uploads", file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        videoFiles.push({
          id: file,
          filename: file,
          path: filePath,
          size: stats.size,
          uploadedAt: stats.mtime
        });
      }
    }

    res.json({
      success: true,
      videos: videoFiles
    });

  } catch (error) {
    console.error("Erro ao listar vídeos:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao listar vídeos"
    });
  }
});

// Endpoint para eliminar vídeo transferido
app.delete("/api/uploaded-videos/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;
    const filePath = path.join("/app/uploads", videoId);

    try {
      await fs.unlink(filePath);
      res.json({
        success: true,
        message: "Vídeo eliminado com sucesso"
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: "Vídeo não encontrado"
      });
    }

  } catch (error) {
    console.error("Erro ao eliminar vídeo:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao eliminar vídeo"
    });
  }
});

// Endpoint para download do vídeo
app.get("/api/download/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;
    const filePath = path.join("/app/output", `${videoId}.mp4`);
    
    try {
      await fs.access(filePath);
      res.download(filePath);
    } catch (error) {
      res.status(404).json({
        success: false,
        error: "Vídeo não encontrado"
      });
    }
  } catch (error) {
    console.error("Erro ao fazer download:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao fazer download"
    });
  }
});

// Endpoint para listar vídeos
app.get("/api/videos", async (req, res) => {
  try {
    const files = await fs.readdir("/app/output");
    const videoFiles = [];

    for (const file of files) {
      if (file.endsWith(".mp4")) {
        const filePath = path.join("/app/output", file);
        const stats = await fs.stat(filePath);
        
        videoFiles.push({
          id: file.replace(".mp4", ""),
          filename: file,
          path: filePath,
          size: stats.size,
          createdAt: stats.mtime
        });
      }
    }

    res.json({
      success: true,
      videos: videoFiles
    });

  } catch (error) {
    console.error("Erro ao listar vídeos:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao listar vídeos"
    });
  }
});

// Endpoint para eliminar vídeo
app.delete("/api/videos/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;
    const filePath = path.join("/app/output", `${videoId}.mp4`);

    try {
      await fs.unlink(filePath);
      res.json({
        success: true,
        message: "Vídeo eliminado com sucesso"
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: "Vídeo não encontrado"
      });
    }

  } catch (error) {
    console.error("Erro ao eliminar vídeo:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao eliminar vídeo"
    });
  }
});

// Endpoint de verificação de saúde
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

// Endpoint raiz
app.get("/", (req, res) => {
  res.json({
    message: "Remotion Docker API Server",
    version: "3.0.0",
    endpoints: {
      basic: {
        "POST /api/generate-video": "Vídeo básico (só texto + cores)"
      },
      withImage: {
        "POST /api/generate-video-with-image-full": "Vídeo com IMAGEM de fundo (+ título + subtítulo + música + logo + formato)"
      },
      withVideo: {
        "POST /api/generate-video-with-video-full": "Vídeo com VÍDEO de fundo (+ título + subtítulo + música + logo + formato)"
      },
      legacy: {
        "POST /api/generate-video-with-image": "LEGADO: Vídeo com imagem (formato fixo)",
        "POST /api/generate-advanced-video": "LEGADO: Vídeo avançado (formato fixo)",
        "POST /api/generate-video-format": "LEGADO: Formato personalizado"
      },
      management: {
        "POST /api/upload-video": "Transferir ficheiro",
        "GET /api/uploaded-videos": "Listar ficheiros transferidos",
        "DELETE /api/uploaded-videos/:videoId": "Eliminar ficheiro",
        "GET /api/download/:videoId": "Download do vídeo",
        "GET /api/videos": "Listar vídeos gerados",
        "DELETE /api/videos/:videoId": "Eliminar vídeo gerado",
        "GET /api/health": "Verificação de saúde"
      }
    },
    formats: {
      "landscape": "16:9 - 1920x1080 (YouTube, Website)",
      "youtube": "16:9 - 1920x1080 (YouTube)",
      "instagram-post": "1:1 - 1080x1080 (Instagram Post)",
      "instagram-stories": "9:16 - 1080x1920 (Instagram Stories)",
      "instagram-reels": "9:16 - 1080x1920 (Instagram Reels)",
      "tiktok": "9:16 - 1080x1920 (TikTok)",
      "youtube-shorts": "9:16 - 1080x1920 (YouTube Shorts)"
    },
    usage: {
      "Para vídeo com IMAGEM": "Use /api/generate-video-with-image-full",
      "Para vídeo com VÍDEO": "Use /api/generate-video-with-video-full",
      "Parâmetro format": "landscape, youtube, instagram-post, instagram-stories, tiktok, etc"
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor Remotion API a correr na porta ${PORT}`);
  console.log(`Aceda: http://localhost:${PORT}`);
  console.log(`Verificação de saúde: http://localhost:${PORT}/api/health`);
});