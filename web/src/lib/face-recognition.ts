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
 * Maps getUserMedia / video play errors to user-friendly Portuguese messages.
 */
export function cameraErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
      return 'Permissão de câmera negada. Libere o acesso à câmera no navegador e tente novamente.';
    }
    if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
      return 'Nenhuma câmera encontrada neste dispositivo.';
    }
    if (err.name === 'NotReadableError' || err.name === 'AbortError') {
      return 'Câmera em uso por outro aplicativo. Feche os outros apps e tente novamente.';
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Falha ao acessar a câmera';
}

/**
 * Attaches a MediaStream to a video element and resolves once frames are
 * actually playing (or rejects with a friendly error). Required because
 * setting srcObject before the element is mounted (or before play()) leaves
 * the video black forever.
 */
export function attachStreamToVideo(video: HTMLVideoElement, stream: MediaStream): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const cleanup = () => {
    video.removeEventListener('playing', onPlaying);
    video.removeEventListener('error', onError);
  };
  const onPlaying = () => {
    cleanup();
    resolve();
  };
  const onError = () => {
    cleanup();
    reject(new Error('Falha ao iniciar o vídeo da câmera'));
  };
  if (video.srcObject !== stream) {
    video.srcObject = stream;
  }
  video.addEventListener('playing', onPlaying, { once: true });
  video.addEventListener('error', onError, { once: true });
  if (!video.paused && video.readyState >= 2) {
    // Already playing (e.g. re-attach)
    cleanup();
    resolve();
  } else {
    video.play().catch(() => {
      /* autoplay attribute retries; 'playing' listener resolves */
    });
  }
  return promise;
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

/** Result of comparing a live face descriptor against the enrolled one. */
export interface FaceMatchResult {
  isMatch: boolean;
  distance: number;
  score: number;
}

/**
 * Compares two face descriptors and returns a confidence score (0.0 to 1.0).
 * Lower Euclidean distance means higher similarity.
 * @param descriptor1 Float32Array
 * @param descriptor2 Float32Array
 * @returns
 */
export function compareFaceDescriptors(descriptor1: Float32Array, descriptor2: Float32Array): FaceMatchResult {
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
