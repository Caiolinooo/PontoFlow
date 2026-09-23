import * as faceapi from 'face-api.js';

let isModelLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Initializes face-api.js by loading the required models from the public folder.
 * This is cached, so subsequent calls are instantaneous.
 */
export async function loadFaceModels() {
  if (isModelLoaded) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      // Assuming models are served in /models/ folder
      const MODEL_URL = '/models';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      
      isModelLoaded = true;
      console.log('[Face API] Models loaded successfully from', MODEL_URL);
    })();
  }
  return loadPromise;
}

/**
 * Extracts a face descriptor (Float32Array of 128 dimensions) from a video or image element.
 * @param mediaElement HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
 * @returns Float32Array length 128 or null if no face found
 */
export async function extractFaceDescriptor(mediaElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<Float32Array | null> {
  await loadFaceModels();
  
  const detection = await faceapi
    .detectSingleFace(mediaElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
    
  if (!detection) {
    return null;
  }
  
  return detection.descriptor;
}

/**
 * Compares two face descriptors and returns a confidence score (0.0 to 1.0).
 * Lower Euclidean distance means higher similarity.
 * @param descriptor1 Float32Array
 * @param descriptor2 Float32Array
 * @returns 
 */
export function compareFaceDescriptors(descriptor1: Float32Array, descriptor2: Float32Array): { isMatch: boolean; distance: number; score: number } {
  // Compute euclidean distance
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
  
  // face-api.js recommends 0.6 as a threshold. 
  // Custom tuned threshold for "bater ponto" -> 0.45 or 0.5 (stricter is better to prevent spoofing)
  const threshold = 0.5;
  const isMatch = distance < threshold;
  
  // Convert distance (0 to ~1.2) to a percentage score (0 to 1) for UI display
  // Using 1.0 as the maximum expected distance for score calculation
  const score = Math.max(0, 1 - (distance / 1.0));
  
  return { isMatch, distance, score };
}
