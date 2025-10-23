import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Get parameters from command line arguments
const args = process.argv.slice(2);
const compositionId = args[0] || 'VideoTextoSimples';
const outputPath = args[1] || `output/${compositionId}.mp4`;
const inputPropsJson = args[2] || '{}';
const customDuration = args[3] ? parseInt(args[3]) : null;

let inputProps = {};
try {
  inputProps = JSON.parse(inputPropsJson);
} catch (error) {
  console.error('Error parsing input props:', error);
  process.exit(1);
}

console.log('Starting Remotion render process...');
console.log('Composition ID:', compositionId);
console.log('Output path:', outputPath);
console.log('Input props:', inputProps);

try {
  // Bundle the Remotion project
  const bundled = await bundle({
    entryPoint: require.resolve('./src/index.ts'),
    ignoreRegisterRootWarning: true,
    publicDir: '/app/uploads',  // Servir ficheiros de /app/uploads como public
    webpackOverride: (config) => {
      // Remove studio-related configurations
      config.resolve.alias = {
        ...config.resolve.alias,
        '@remotion/studio': false
      };
      
      // Add polyfills for Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "path": false,
        "fs": false,
        "os": false,
        "crypto": false,
        "stream": false,
        "util": false,
        "buffer": false,
        "process": false
      };
      
      return config;
    },
  });

  console.log('Bundle created successfully');

  // Select the composition
  let composition = await selectComposition({
    serveUrl: bundled,
    id: compositionId,
    inputProps,
  });

  // Override duration if custom duration is provided
  if (customDuration) {
    composition = {
      ...composition,
      durationInFrames: customDuration,
    };
    console.log('Custom duration applied:', customDuration, 'frames');
  }

  console.log('Composition selected:', composition.id);
  console.log('Duration:', composition.durationInFrames, 'frames at', composition.fps, 'fps');

  // Render the video
  console.log('Starting to render composition...');
  await renderMedia({
    codec: 'h264',
    composition,
    serveUrl: bundled,
    outputLocation: outputPath,
    chromiumOptions: {
      enableMultiProcessOnLinux: true,
    },
    inputProps,
  });

  console.log(`✅ Rendered composition ${composition.id} successfully!`);
  console.log(`📁 Output saved to: ${outputPath}`);
  
} catch (error) {
  console.error('❌ Error during rendering:', error);
  process.exit(1);
}