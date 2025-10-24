/**
 * VAPID Keys for Web Push Notifications
 * Generated using: npx web-push generate-vapid-keys
 */

/**
 * Validate VAPID keys are configured (reads env at call time)
 */
export function validateVAPIDKeys(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  const privateKey = process.env.VAPID_PRIVATE_KEY || '';
  if (!publicKey || !privateKey) {
    console.warn('VAPID keys not configured. Push notifications disabled.');
    return false;
  }
  return true;
}

/**
 * Get VAPID public key for client (reads env at call time)
 */
export function getVAPIDPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
}

