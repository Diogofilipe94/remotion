import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
import path from "path";
import { renderVideo } from "./renderer.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Configurar multer para upload de ficheiros
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "./uploads";
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  },
});

// Configurar filtros para diferentes tipos de ficheiros
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'image') {
    // Para imagens
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas ficheiros de imagem são permitidos'), false);
    }
  } else if (file.fieldname === 'video') {
    // Para vídeos
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas ficheiros de vídeo são permitidos'), false);
    }
  } else {
    cb(null, true);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limite
  }
});

// Criar directórios necessários
const ensureDirectories = () => {
  fs.ensureDirSync("./uploads");
  fs.ensureDirSync("./output");
  fs.ensureDirSync("./temp");
};

ensureDirectories();

// Endpoint para gerar vídeo simples
app.post("/api/generate-video", async (req, res) => {
  try {
    const {
      title = "Título Padrão",
      subtitle = "Subtítulo Padrão",
      backgroundColor = "#000000",
      textColor = "#ffffff",
      duration = 5, // segundos
    } = req.body;

    const videoId = uuidv4();
    const outputPath = path.join("./output", `${videoId}.mp4`);

    const inputProps = {
      title,
      subtitle,
      backgroundColor,
      textColor,
    };

    const result = await renderVideo("VideoRoot", inputProps, outputPath);

    if (result.success) {
      res.json({
        success: true,
        videoId,
        downloadUrl: `/api/download/${videoId}`,
        duration: result.duration,
        message: "Vídeo gerado com sucesso!",
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in /api/generate-video:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

// Endpoint para upload de vídeo
app.post("/api/upload-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Nenhum ficheiro de vídeo foi enviado"
      });
    }

    const videoInfo = {
      id: uuidv4(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    // Guardar informações do vídeo num ficheiro JSON
    const videosDbPath = "./uploads/videos.json";
    let videos = [];
    
    if (fs.existsSync(videosDbPath)) {
      videos = JSON.parse(fs.readFileSync(videosDbPath, 'utf8'));
    }
    
    videos.push(videoInfo);
    fs.writeFileSync(videosDbPath, JSON.stringify(videos, null, 2));

    res.json({
      success: true,
      video: videoInfo,
      message: "Vídeo carregado com sucesso!"
    });

  } catch (error) {
    console.error("Error uploading video:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao carregar vídeo"
    });
  }
});

// Endpoint para listar vídeos carregados
app.get("/api/uploaded-videos", (req, res) => {
  try {
    const videosDbPath = "./uploads/videos.json";
    
    if (!fs.existsSync(videosDbPath)) {
      return res.json({
        success: true,
        videos: [],
        count: 0
      });
    }

    const videos = JSON.parse(fs.readFileSync(videosDbPath, 'utf8'));
    
    res.json({
      success: true,
      videos,
      count: videos.length
    });

  } catch (error) {
    console.error("Error listing uploaded videos:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao listar vídeos carregados"
    });
  }
});

// Endpoint para eliminar vídeo carregado
app.delete("/api/uploaded-videos/:videoId", (req, res) => {
  try {
    const { videoId } = req.params;
    const videosDbPath = "./uploads/videos.json";
    
    if (!fs.existsSync(videosDbPath)) {
      return res.status(404).json({
        success: false,
        error: "Base de dados de vídeos não encontrada"
      });
    }

    let videos = JSON.parse(fs.readFileSync(videosDbPath, 'utf8'));
    const videoIndex = videos.findIndex(v => v.id === videoId);
    
    if (videoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Vídeo não encontrado"
      });
    }

    const video = videos[videoIndex];
    
    // Eliminar ficheiro físico
    if (fs.existsSync(video.path)) {
      fs.unlinkSync(video.path);
    }
    
    // Eliminar da base de dados
    videos.splice(videoIndex, 1);
    fs.writeFileSync(videosDbPath, JSON.stringify(videos, null, 2));

    res.json({
      success: true,
      message: "Vídeo eliminado com sucesso"
    });

  } catch (error) {
    console.error("Error deleting uploaded video:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao eliminar vídeo"
    });
  }
});

// Endpoint para gerar vídeo com upload de imagem
app.post("/api/generate-video-with-image", upload.single("image"), async (req, res) => {
  try {
    const {
      title = "Título Padrão",
      subtitle = "Subtítulo Padrão",
      backgroundColor = "#000000",
      textColor = "#ffffff",
      duration = 5,
    } = req.body;

    const videoId = uuidv4();
    const outputPath = path.join("./output", `${videoId}.mp4`);

    const inputProps = {
      title,
      subtitle,
      backgroundColor,
      textColor,
      imagePath: req.file ? req.file.path : null,
    };

    const result = await renderVideo("VideoRoot", inputProps, outputPath);

    if (result.success) {
      res.json({
        success: true,
        videoId,
        downloadUrl: `/api/download/${videoId}`,
        duration: result.duration,
        message: "Vídeo gerado com sucesso!",
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in /api/generate-video-with-image:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

// Endpoint para download do vídeo
app.get("/api/download/:videoId", (req, res) => {
  try {
    const { videoId } = req.params;
    const filePath = path.join("./output", `${videoId}.mp4`);

    if (fs.existsSync(filePath)) {
      res.download(filePath, `video-${videoId}.mp4`, (err) => {
        if (err) {
          console.error("Error downloading file:", err);
          res.status(500).json({ error: "Erro ao transferir ficheiro" });
        }
      });
    } else {
      res.status(404).json({ error: "Vídeo não encontrado" });
    }
  } catch (error) {
    console.error("Error in download endpoint:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Endpoint para listar vídeos gerados
app.get("/api/videos", (req, res) => {
  try {
    const outputDir = "./output";
    const files = fs.readdirSync(outputDir);
    const videos = files
      .filter(file => file.endsWith(".mp4"))
      .map(file => ({
        id: file.replace(".mp4", ""),
        filename: file,
        downloadUrl: `/api/download/${file.replace(".mp4", "")}`,
        createdAt: fs.statSync(path.join(outputDir, file)).birthtime,
      }));

    res.json({
      success: true,
      videos,
      count: videos.length,
    });
  } catch (error) {
    console.error("Error listing videos:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao listar vídeos",
    });
  }
});

// Endpoint para eliminar vídeo
app.delete("/api/videos/:videoId", (req, res) => {
  try {
    const { videoId } = req.params;
    const filePath = path.join("./output", `${videoId}.mp4`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: "Vídeo eliminado com sucesso",
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Vídeo não encontrado",
      });
    }
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao eliminar vídeo",
    });
  }
});

// Endpoint de health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Servir ficheiros estáticos
app.use("/output", express.static("output"));
app.use("/uploads", express.static("uploads"));

// Rota raiz
app.get("/", (req, res) => {
  res.json({
    message: "Remotion Docker API Server",
    version: "1.0.0",
    endpoints: {
      "POST /api/generate-video": "Gerar vídeo simples",
      "POST /api/generate-video-with-image": "Gerar vídeo com imagem",
      "POST /api/upload-video": "Carregar vídeo",
      "GET /api/uploaded-videos": "Listar vídeos carregados",
      "DELETE /api/uploaded-videos/:videoId": "Eliminar vídeo carregado",
      "GET /api/download/:videoId": "Transferir vídeo",
      "GET /api/videos": "Listar vídeos",
      "DELETE /api/videos/:videoId": "Eliminar vídeo",
      "GET /api/health": "Verificação de saúde",
    },
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Erro interno do servidor",
  });
});

// Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor Remotion API a correr na porta ${PORT}`);
  console.log(`📱 Aceda: http://localhost:${PORT}`);
  console.log(`🏥 Verificação de saúde: http://localhost:${PORT}/api/health`);
});

export default app;
