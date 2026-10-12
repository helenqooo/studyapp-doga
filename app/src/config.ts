// Values come from app/.env (EXPO_PUBLIC_* are inlined at bundle time).
// Restart `npx expo start` after changing them.

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
export const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';

/** Below this confidence the solution screen warns the student to check the answer key. */
export const LOW_CONFIDENCE_THRESHOLD = 0.7;

/** Long side of the uploaded image in pixels, and its JPEG quality. */
export const UPLOAD_MAX_SIDE = 1600;
export const UPLOAD_JPEG_QUALITY = 0.8;

/** Solving a question or reading a karne can take a while (the model thinks first). */
export const AI_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;
