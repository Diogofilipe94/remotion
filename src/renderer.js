import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";

export async function renderVideo(compositionId, inputProps, outputPath) {
  try {
    // Bundle the Remotion project with minimal configuration
    const bundleLocation = await bundle({
      entryPoint: "./src/index.ts",
    });

    // Select the composition
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps,
    });

    // Render the video with optimized settings for Docker
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      chromiumOptions: {
        enableMultiProcessOnLinux: true,
      },
      inputProps,
    });

    return {
      success: true,
      outputPath,
      duration: composition.durationInFrames / composition.fps,
    };
  } catch (error) {
    console.error("Error rendering video:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Alternative method using the render script
export async function renderVideoWithScript(compositionId, inputProps, outputPath) {
  return new Promise((resolve, reject) => {
    const inputPropsJson = JSON.stringify(inputProps);
    const child = spawn('node', ['render.mjs', compositionId, outputPath, inputPropsJson], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('Render output:', data.toString());
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('Render error:', data.toString());
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          outputPath,
          stdout,
        });
      } else {
        reject({
          success: false,
          error: stderr || 'Render process failed',
          code,
        });
      }
    });

    child.on('error', (error) => {
      reject({
        success: false,
        error: error.message,
      });
    });
  });
}
