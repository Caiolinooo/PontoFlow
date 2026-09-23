import fs from 'fs';
import path from 'path';
import https from 'https';

const MODELS_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const TARGET_DIR = path.join(process.cwd(), 'public', 'models');

const files = [
  'tiny_face_detector_model-shard1',
  'tiny_face_detector_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
  'face_recognition_model-weights_manifest.json'
];

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

function downloadFile(filename) {
  return new Promise((resolve, reject) => {
    const targetPath = path.join(TARGET_DIR, filename);
    if (fs.existsSync(targetPath)) {
      console.log(`[SKIP] ${filename} already exists.`);
      resolve();
      return;
    }

    console.log(`[DOWNLOADING] ${filename}...`);
    const file = fs.createWriteStream(targetPath);
    https.get(MODELS_URL + filename, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`[DONE] ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(targetPath, () => {});
      console.error(`[ERROR] Failed to download ${filename}:`, err.message);
      reject(err);
    });
  });
}

async function main() {
  console.log('Downloading face-api.js models to public/models...');
  for (const file of files) {
    try {
      await downloadFile(file);
    } catch (e) {
      console.error('Failed on', file);
    }
  }
  console.log('Finished downloading all models.');
}

main();
