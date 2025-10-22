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
      const child = spawn("node", ["render.mjs", "VideoRoot", outputPath, inputPropsJson], {
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
      const child = spawn("node", ["render.mjs", "VideoRoot", outputPath, inputPropsJson], {
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
    version: "1.0.0",
    endpoints: {
      "POST /api/generate-video": "Gerar vídeo simples",
      "POST /api/generate-video-with-image": "Gerar vídeo com imagem",
      "POST /api/upload-video": "Transferir vídeo",
      "GET /api/uploaded-videos": "Listar vídeos transferidos",
      "DELETE /api/uploaded-videos/:videoId": "Eliminar vídeo transferido",
      "GET /api/download/:videoId": "Download do vídeo",
      "GET /api/videos": "Listar vídeos",
      "DELETE /api/videos/:videoId": "Eliminar vídeo",
      "GET /api/health": "Verificação de saúde"
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Remotion API a correr na porta ${PORT}`);
  console.log(`📱 Aceda: http://localhost:${PORT}`);
  console.log(`🏥 Verificação de saúde: http://localhost:${PORT}/api/health`);
});