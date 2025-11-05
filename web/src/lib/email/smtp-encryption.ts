/**
 * SMTP Password Encryption Utility
 * 
 * Encrypts and decrypts SMTP passwords for secure storage in the database.
 * Uses AES-256-GCM encryption with a secret key from environment variables.
 */

import crypto from 'crypto';

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment variable
 * Falls back to a default key if not set (NOT RECOMMENDED FOR PRODUCTION)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.SMTP_ENCRYPTION_KEY;
  
  if (!key) {
    console.warn('[smtp-encryption] WARNING: SMTP_ENCRYPTION_KEY not set. Using default key (NOT SECURE)');
    // Default key for development only - MUST be changed in production
    return crypto.scryptSync('default-insecure-key-change-me', 'salt', 32);
  }
  
  // Derive a 32-byte key from the environment variable
  return crypto.scryptSync(key, 'pontoflow-smtp-salt', 32);
}

/**
 * Encrypt SMTP password
 * 
 * @param password - Plain text password to encrypt
 * @returns Encrypted password as base64 string with format: iv:authTag:encrypted
 */
export function encryptSmtpPassword(password: string): string {
  if (!password) {
    throw new Error('Password cannot be empty');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return format: iv:authTag:encrypted (all in hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt SMTP password
 * 
 * @param encryptedPassword - Encrypted password string (format: iv:authTag:encrypted)
 * @returns Decrypted plain text password
 */
export function decryptSmtpPassword(encryptedPassword: string): string {
  if (!encryptedPassword) {
    throw new Error('Encrypted password cannot be empty');
  }

  const parts = encryptedPassword.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted password format');
  }

  const [ivHex, authTagHex, encrypted] = parts;
  
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Test encryption/decryption
 * Used for verifying the encryption setup
 */
export function testEncryption(): boolean {
  try {
    const testPassword = 'test-password-123!@#';
    const encrypted = encryptSmtpPassword(testPassword);
    const decrypted = decryptSmtpPassword(encrypted);
    
    return testPassword === decrypted;
  } catch (error) {
    console.error('[smtp-encryption] Encryption test failed:', error);
    return false;
  }
}

/**
 * Mask password for display (shows only first and last 2 characters)
 * 
 * @param password - Password to mask
 * @returns Masked password (e.g., "ab****yz")
 */
export function maskPassword(password: string): string {
  if (!password || password.length < 4) {
    return '****';
  }
  
  const first = password.substring(0, 2);
  const last = password.substring(password.length - 2);
  const middle = '*'.repeat(Math.min(password.length - 4, 8));
  
  return `${first}${middle}${last}`;
}

/**
 * Validate SMTP password strength
 * 
 * @param password - Password to validate
 * @returns Object with validation result and message
 */
export function validateSmtpPassword(password: string): { valid: boolean; message?: string } {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  // For SMTP passwords, we don't enforce strict complexity requirements
  // as many SMTP providers generate their own passwords
  return { valid: true };
}

