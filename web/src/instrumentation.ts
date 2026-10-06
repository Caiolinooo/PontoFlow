/**
 * Next.js instrumentation hook — runs once at server boot (Node runtime).
 * Fail-fast validation: the app MUST NOT start without a strong JWT_SECRET.
 * There is no legacy/insecure token fallback anymore.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      '[BOOT] FATAL: JWT_SECRET is not set. ' +
      'Generate one with `openssl rand -hex 32` and add it to your environment (see .env.example).'
    );
  }
  if (secret.length < 32) {
    throw new Error('[BOOT] FATAL: JWT_SECRET is too short (minimum 32 characters).');
  }
}
