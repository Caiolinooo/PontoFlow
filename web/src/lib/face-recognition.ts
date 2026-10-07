import * as faceapi from 'face-api.js';
import {
  averageDescriptors,
  eyeAspectRatio,
  FACE_MATCH_THRESHOLD,
  livenessPassed,
  matchFaceDescriptors,
  parseFaceDescriptor,
  type LivenessFrame,
} from '@/lib/biometrics/descriptor';

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
 * Detection configs tried in order: first is fast, fallbacks trade speed for
 * recall. inputSize 224 @ 0.5 misses clear faces at typical webcam distance
 * (measured: 640x480 frame with face filling ~40% of height returned null,
 * while 416 @ 0.35 scored 0.96 on the same frame).
 */
const DETECTION_ATTEMPTS: ReadonlyArray<{ inputSize: number; scoreThreshold: number }> = [
  { inputSize: 224, scoreThreshold: 0.5 },
  { inputSize: 416, scoreThreshold: 0.35 },
  { inputSize: 512, scoreThreshold: 0.25 },
];

/**
 * Extracts a face descriptor (Float32Array of 128 dimensions) from a video or image element.
 * @param mediaElement HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
 * @returns Float32Array length 128 or null if no face found
 */
export async function extractFaceDescriptor(mediaElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<Float32Array | null> {
  await loadFaceModels();

  for (const options of DETECTION_ATTEMPTS) {
    const detection = await faceapi
      .detectSingleFace(mediaElement, new faceapi.TinyFaceDetectorOptions(options))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      return detection.descriptor;
    }
  }

  return null;
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
  const left = parseFaceDescriptor(Array.from(descriptor1));
  const right = parseFaceDescriptor(Array.from(descriptor2));
  if (!left || !right) {
    return { isMatch: false, distance: Number.POSITIVE_INFINITY, score: 0 };
  }
  const match = matchFaceDescriptors(left, right, FACE_MATCH_THRESHOLD);
  return { isMatch: match.isMatch, distance: match.distance, score: match.score };
}

export interface LiveFaceCapture {
  descriptor: Float32Array;
  samples: number;
}

/**
 * Samples the webcam until a blink or a small head turn proves a live person,
 * then returns the average of the open-eye descriptors.
 * Resolves null when the timeout ends without liveness or without a face.
 */
export async function captureLiveFace(
  video: HTMLVideoElement,
  options?: { timeoutMs?: number; signal?: AbortSignal }
): Promise<LiveFaceCapture | null> {
  await loadFaceModels();
  const timeoutMs = options?.timeoutMs ?? 12000;
  const deadline = Date.now() + timeoutMs;
  const frames: LivenessFrame[] = [];
  const openDescriptors: number[][] = [];
  let lastDescriptor: number[] | null = null;

  while (Date.now() < deadline) {
    if (options?.signal?.aborted) return null;
    if (video.readyState < 2) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      continue;
    }

    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      const leftEar = eyeAspectRatio(detection.landmarks.getLeftEye());
      const rightEar = eyeAspectRatio(detection.landmarks.getRightEye());
      const nose = detection.landmarks.getNose();
      const box = detection.detection.box;
      lastDescriptor = Array.from(detection.descriptor);
      if (leftEar !== null && rightEar !== null && nose.length > 0 && box.width > 0) {
        const ear = (leftEar + rightEar) / 2;
        const noseX = (nose[0].x - box.x) / box.width;
        frames.push({ ear, noseX });
        if (ear > 0.25) openDescriptors.push(lastDescriptor);
      }
    }

    if (livenessPassed(frames)) {
      const source = openDescriptors.length > 0 ? openDescriptors : lastDescriptor ? [lastDescriptor] : [];
      const mean = averageDescriptors(source);
      if (mean) {
        return { descriptor: new Float32Array(mean), samples: source.length };
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 180));
  }

  return null;
}
