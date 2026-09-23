#!/usr/bin/env node

/**
 * Script para baixar os modelos de IA do face-api.js para uso offline
 * 
 * Este script baixa os modelos necessarios para reconhecimento facial
 * e os armazena no diretorio assets/models/ do projeto mobile.
 * 
 * Uso:
 *   node mobile/scripts/download-face-models.mjs
 * 
 * Os modelos serao salvos em:
 *   mobile/assets/models/face-api/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração
const MODELS = [
  {
    name: 'tiny_face_detector',
    files: [
      'shard1',
      'weights_manifest.json'
    ],
    url: 'https://github.com/vladmandic/face-api/tree/main/test/model'
  },
  {
    name: 'face_landmark_68',
    files: [
      'shard1',
      'weights_manifest.json'
    ],
    url: 'https://github.com/vladmandic/face-api/tree/main/test/model'
  },
  {
    name: 'face_recognition',
    files: [
      'shard1',
      'shard2',
      'weights_manifest.json'
    ],
    url: 'https://github.com/vladmandic/face-api/tree/main/test/model'
  }
];

// URLs dos modelos (face-api.js original)
const MODEL_SOURCES = {
  tiny_face_detector: {
    shard1: 'https://github.com/justadoggeth/face-api.js/raw/master/test/model/tiny_face_detector_model-shard1',
    weights_manifest: 'https://github.com/justadoggeth/face-api.js/raw/master/test/model/tiny_face_detector_model-weights_manifest.json'
  },
  face_landmark_68: {
    shard1: 'https://github.com/justadoggeth/face-api.js/raw/master/test/model/face_landmark_68_model-shard1',
    weights_manifest: 'https://github.com/justadoggeth/face-api.js/raw/master/test/model/face_landmark_68_model-weights_manifest.json'
  },
  face_recognition: {
    shard1: 'https://github.com/justadoggeth/face-api.js/raw/master/test/model/face_recognition_model-shard1',
    shard2: 'https://github.com/justadoggeth/face-api.js/raw/master/test/model/face_recognition_model-shard2',
    weights_manifest: 'https://github.com/justadoggeth/face-api.js/raw/master/test/model/face_recognition_model-weights_manifest.json'
  }
};

// Diretorio de saída
const OUTPUT_DIR = path.join(__dirname, '../assets/models/face-api');

async function downloadFile(url, outputPath) {
  try {
    console.log(`  Downloading: ${path.basename(outputPath)}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    
    fs.writeFileSync(outputPath, buffer);
    
    const sizeKB = (buffer.length / 1024).toFixed(2);
    console.log(`  ✓ Saved: ${sizeKB} KB`);
    
    return true;
  } catch (error) {
    console.error(`  ✗ Failed: ${error.message}`);
    return false;
  }
}

async function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

async function main() {
  console.log('========================================');
  console.log('  Face-API Model Downloader');
  console.log('========================================');
  console.log('');
  
  // Criar diretorio de saída
  await ensureDirectoryExists(OUTPUT_DIR);
  
  let totalFiles = 0;
  let successFiles = 0;
  
  // Baixar modelos
  for (const [modelName, sources] of Object.entries(MODEL_SOURCES)) {
    console.log(`\nDownloading ${modelName} models...`);
    console.log('----------------------------------------');
    
    const modelDir = path.join(OUTPUT_DIR, modelName);
    await ensureDirectoryExists(modelDir);
    
    for (const fileKey of Object.keys(sources)) {
      totalFiles++;
      const url = sources[fileKey];
      const outputPath = path.join(modelDir, fileKey);
      
      const success = await downloadFile(url, outputPath);
      if (success) {
        successFiles++;
      }
    }
  }
  
  console.log('');
  console.log('========================================');
  console.log(`  Result: ${successFiles}/${totalFiles} files downloaded`);
  console.log('========================================');
  
  if (successFiles === totalFiles) {
    console.log('');
    console.log('✓ Models downloaded successfully!');
    console.log('');
    console.log('The models are now available for offline use.');
    console.log('The BiometricWebView component will automatically');
    console.log('use local models when available, falling back to');
    console.log('CDN when not.');
    console.log('');
  } else {
    console.log('');
    console.log('⚠ Some models failed to download.');
    console.log('Please check your internet connection and try again.');
    console.log('');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
