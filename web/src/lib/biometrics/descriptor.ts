/** 128-d face-api.js descriptor comparison. Shared by the browser and the verify API. */

export const FACE_DESCRIPTOR_LENGTH = 128;
/** Stricter than face-api's suggested 0.6. */
export const FACE_MATCH_THRESHOLD = 0.5;

export interface FaceMatch {
  isMatch: boolean;
  distance: number;
  score: number;
}

export interface LivenessFrame {
  ear: number;
  noseX: number;
}

export function parseFaceDescriptor(raw: unknown): number[] | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(value) || value.length !== FACE_DESCRIPTOR_LENGTH) return null;
  const nums: number[] = [];
  for (const item of value) {
    if (typeof item !== 'number' || !Number.isFinite(item)) return null;
    nums.push(item);
  }
  return nums;
}

export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const delta = a[i] - b[i];
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

export function matchFaceDescriptors(stored: number[], live: number[], threshold = FACE_MATCH_THRESHOLD): FaceMatch {
  const distance = euclideanDistance(stored, live);
  return {
    isMatch: distance < threshold,
    distance,
    score: Math.max(0, 1 - distance),
  };
}

export function averageDescriptors(samples: number[][]): number[] | null {
  if (samples.length === 0) return null;
  const length = samples[0].length;
  const out = new Array<number>(length).fill(0);
  for (const sample of samples) {
    if (sample.length !== length) return null;
    for (let i = 0; i < length; i++) out[i] += sample[i];
  }
  for (let i = 0; i < length; i++) out[i] /= samples.length;
  return out;
}

type Point = { x: number; y: number };

/** Eye aspect ratio from 6 landmark points (face-api 68-point eye). */
export function eyeAspectRatio(eye: Point[]): number | null {
  if (eye.length < 6) return null;
  const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const horizontal = dist(eye[0], eye[3]);
  if (horizontal === 0) return null;
  return (dist(eye[1], eye[5]) + dist(eye[2], eye[4])) / (2 * horizontal);
}

/**
 * Live person, not a still photo: a blink (EAR drops then opens) or a small head turn.
 * Needs several frames. A frozen frame never passes.
 */
export function livenessPassed(frames: LivenessFrame[]): boolean {
  if (frames.length < 4) return false;
  let minEar = Number.POSITIVE_INFINITY;
  let maxEar = Number.NEGATIVE_INFINITY;
  let minNose = Number.POSITIVE_INFINITY;
  let maxNose = Number.NEGATIVE_INFINITY;
  for (const frame of frames) {
    if (!Number.isFinite(frame.ear) || !Number.isFinite(frame.noseX)) return false;
    if (frame.ear < minEar) minEar = frame.ear;
    if (frame.ear > maxEar) maxEar = frame.ear;
    if (frame.noseX < minNose) minNose = frame.noseX;
    if (frame.noseX > maxNose) maxNose = frame.noseX;
  }
  const blinked = minEar < 0.22 && maxEar > 0.28 && maxEar - minEar > 0.08;
  const turned = maxNose - minNose > 0.08;
  return blinked || turned;
}
