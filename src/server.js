import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { spawn } from "child_process";
import https from "https";
import http from "http";

const app = express();
const PORT = process.env.PORT || 3000;

// Store para guardar o status dos jobs de renderização
const jobs = new Map();

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

// Função para fazer download de URLs
const downloadFile = async (url, filename) => {
  return new Promise((resolve, reject) => {
    const filePath = `/app/uploads/${filename}`;
    const file = fsSync.createWriteStream(filePath);
    
    const protocol = url.startsWith('https:') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Download concluído: ${filename}`);
        resolve(filename);
      });
      
      file.on('error', (err) => {
        fsSync.unlink(filePath, () => {}); // Limpar ficheiro parcial
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

// Função para processar URLs e ficheiros
const processMediaFiles = async (req) => {
  const processedFiles = {};
  
  // Processar imagem (suporta tanto imageUrl quanto image)
  const imageUrl = req.body.imageUrl || req.body.image;
  if (imageUrl) {
    try {
      const filename = `${uuidv4()}-image.${imageUrl.split('.').pop().split('?')[0]}`;
      await downloadFile(imageUrl, filename);
      processedFiles.image = filename;
    } catch (error) {
      throw new Error(`Erro ao fazer download da imagem: ${error.message}`);
    }
  }
  
  // Processar vídeo (suporta tanto videoUrl quanto video)
  const videoUrl = req.body.videoUrl || req.body.video;
  if (videoUrl) {
    try {
      const filename = `${uuidv4()}-video.${videoUrl.split('.').pop().split('?')[0]}`;
      await downloadFile(videoUrl, filename);
      processedFiles.video = filename;
    } catch (error) {
      throw new Error(`Erro ao fazer download do vídeo: ${error.message}`);
    }
  }
  
  // Processar áudio
  if (req.body.audioUrl) {
    try {
      const filename = `${uuidv4()}-audio.${req.body.audioUrl.split('.').pop().split('?')[0]}`;
      await downloadFile(req.body.audioUrl, filename);
      processedFiles.audio = filename;
    } catch (error) {
      throw new Error(`Erro ao fazer download do áudio: ${error.message}`);
    }
  }
  
  // Processar logo
  if (req.body.logoUrl) {
    try {
      const filename = `${uuidv4()}-logo.${req.body.logoUrl.split('.').pop().split('?')[0]}`;
      await downloadFile(req.body.logoUrl, filename);
      processedFiles.logo = filename;
    } catch (error) {
      throw new Error(`Erro ao fazer download do logo: ${error.message}`);
    }
  }
  
  return processedFiles;
};

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
      textColor: textColor || "#ffffff",
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      audioUrl: audioUrl || null,
      logoUrl: logoUrl || null,
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
    // Usar apenas o nome do ficheiro (staticFile procura em publicDir)
    const imageUrl = files?.image ? files.image[0].filename : null;
    const audioUrl = files?.audio ? files.audio[0].filename : null;
    const logoUrl = files?.logo ? files.logo[0].filename : null;
    
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
    // Usar apenas o nome do ficheiro (staticFile procura em publicDir)
    const videoUrl = files?.video ? files.video[0].filename : null;
    const audioUrl = files?.audio ? files.audio[0].filename : null;
    const logoUrl = files?.logo ? files.logo[0].filename : null;
    
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

// Endpoint para consultar status de um job
app.get("/api/job/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({
      success: false,
      error: "Job não encontrado"
    });
  }
  
  res.json(job);
});

// Função auxiliar para processar renderização em background
async function processVideoJob(jobId, compositionId, inputProps, outputPath, durationInFrames) {
  try {
    jobs.set(jobId, {
      jobId,
      status: "processing",
      progress: 0,
      createdAt: new Date().toISOString()
    });

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
            outputPath: `output/${jobId}.mp4`,
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
      jobs.set(jobId, {
        jobId,
        status: "completed",
        progress: 100,
        videoUrl: `/output/${jobId}.mp4`,
        downloadUrl: `output/${jobId}.mp4`,
        completedAt: new Date().toISOString()
      });
    } else {
      jobs.set(jobId, {
        jobId,
        status: "failed",
        error: result.error,
        failedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    jobs.set(jobId, {
      jobId,
      status: "failed",
      error: error.message || String(error),
      failedAt: new Date().toISOString()
    });
  }
}

// Endpoint ASYNC para gerar vídeo com IMAGEM de fundo (aceita URLs e ficheiros)
app.post("/api/async/generate-video-with-image", upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, subtitle, backgroundColor, textColor, durationInSeconds, format, imageUrl, image, audioUrl, logoUrl } = req.body;
    const jobId = uuidv4();
    const outputPath = `/app/output/${jobId}.mp4`;
    
    // Processar ficheiros (URLs ou uploads)
    let processedFiles = {};
    
    console.log("🔍 Debug - URLs recebidas:", { imageUrl, image, audioUrl, logoUrl });
    
    // Se há URLs, fazer download
    if (imageUrl || image || audioUrl || logoUrl) {
      console.log("📥 Fazendo download de URLs...");
      processedFiles = await processMediaFiles(req);
      console.log("✅ Ficheiros processados:", processedFiles);
    }
    
    // Se há ficheiros uploadados, usar esses
    const files = req.files;
    const finalImageUrl = files?.image ? files.image[0].filename : processedFiles.image;
    const finalAudioUrl = files?.audio ? files.audio[0].filename : processedFiles.audio;
    const finalLogoUrl = files?.logo ? files.logo[0].filename : processedFiles.logo;
    
    const duration = parseInt(durationInSeconds) || 10;
    const durationInFrames = duration * 30;
    
    const formatMap = {
      'landscape': 'VideoImagemTituloSubtituloMusica',
      'youtube': 'VideoImagemTituloSubtituloMusica',
      'instagram-post': 'VideoImagemTituloSubtituloMusicaInstagramPost',
      'instagram-stories': 'VideoImagemTituloSubtituloMusicaInstagramStories',
      'instagram-reels': 'VideoImagemTituloSubtituloMusicaInstagramStories',
      'tiktok': 'VideoImagemTituloSubtituloMusicaInstagramStories',
      'youtube-shorts': 'VideoImagemTituloSubtituloMusicaInstagramStories'
    };
    
    const compositionId = formatMap[format] || 'VideoImagemTituloSubtituloMusica';
    
    const inputProps = {
      title: title || "Título Padrão",
      subtitle: subtitle || "Subtítulo Padrão",
      backgroundColor: backgroundColor || "#1a1a1a",
      textColor: textColor || "#ffffff",
      imageUrl: finalImageUrl,
      audioUrl: finalAudioUrl,
      logoUrl: finalLogoUrl,
    };

    // Criar job inicial
    jobs.set(jobId, {
      jobId,
      status: "pending",
      progress: 0,
      type: "image",
      format: format || 'landscape',
      createdAt: new Date().toISOString()
    });

    // Processar em background
    processVideoJob(jobId, compositionId, inputProps, outputPath, durationInFrames);

    // Retornar imediatamente
    res.json({
      success: true,
      jobId,
      status: "pending",
      message: "Job criado. Use GET /api/job/:jobId para consultar o status.",
      statusUrl: `/api/job/${jobId}`
    });

  } catch (error) {
    console.error("Erro ao criar job:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint ASYNC para gerar vídeo com VÍDEO de fundo (aceita URLs e ficheiros)
app.post("/api/async/generate-video-with-video", upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, subtitle, backgroundColor, textColor, durationInSeconds, format, videoUrl, video, audioUrl, logoUrl } = req.body;
    const jobId = uuidv4();
    const outputPath = `/app/output/${jobId}.mp4`;
    
    // Processar ficheiros (URLs ou uploads)
    let processedFiles = {};
    
    console.log("🔍 Debug - URLs recebidas:", { videoUrl, video, audioUrl, logoUrl });
    
    // Se há URLs, fazer download
    if (videoUrl || video || audioUrl || logoUrl) {
      console.log("📥 Fazendo download de URLs...");
      processedFiles = await processMediaFiles(req);
      console.log("✅ Ficheiros processados:", processedFiles);
    }
    
    // Se há ficheiros uploadados, usar esses
    const files = req.files;
    const finalVideoUrl = files?.video ? files.video[0].filename : processedFiles.video;
    const finalAudioUrl = files?.audio ? files.audio[0].filename : processedFiles.audio;
    const finalLogoUrl = files?.logo ? files.logo[0].filename : processedFiles.logo;
    
    const duration = parseInt(durationInSeconds) || 10;
    const durationInFrames = duration * 30;
    
    const formatMap = {
      'landscape': 'VideoTituloSubtituloMusica',
      'youtube': 'VideoTituloSubtituloMusicaYouTube',
      'instagram-post': 'VideoTituloSubtituloMusicaInstagramPost',
      'instagram-stories': 'VideoTituloSubtituloMusicaInstagramStories',
      'instagram-reels': 'VideoTituloSubtituloMusicaInstagramStories',
      'tiktok': 'VideoTituloSubtituloMusicaTikTok',
      'youtube-shorts': 'VideoTituloSubtituloMusicaTikTok'
    };
    
    const compositionId = formatMap[format] || 'VideoTituloSubtituloMusica';
    
    const inputProps = {
      title: title || "Título Padrão",
      subtitle: subtitle || "Subtítulo Padrão",
      backgroundColor: backgroundColor || "#1a1a1a",
      textColor: textColor || "#ffffff",
      videoUrl: finalVideoUrl,
      audioUrl: finalAudioUrl,
      logoUrl: finalLogoUrl,
    };

    // Criar job inicial
    jobs.set(jobId, {
      jobId,
      status: "pending",
      progress: 0,
      type: "video",
      format: format || 'landscape',
      createdAt: new Date().toISOString()
    });

    // Processar em background
    processVideoJob(jobId, compositionId, inputProps, outputPath, durationInFrames);

    // Retornar imediatamente
    res.json({
      success: true,
      jobId,
      status: "pending",
      message: "Job criado. Use GET /api/job/:jobId para consultar o status.",
      statusUrl: `/api/job/${jobId}`
    });

  } catch (error) {
    console.error("Erro ao criar job:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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