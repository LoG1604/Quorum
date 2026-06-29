import crypto from 'node:crypto';

// ─── Master key setup ──────────────────────────────────────────────────────
// Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// Put the result in ENCRYPTION_MASTER_KEY in .env.local. This key is yours
// alone — it never leaves your server, and it's what makes every user's
// stored API keys decryptable only by your backend, not by anyone reading
// the database directly.

function getMasterKey(): Buffer {
  const hex = process.env.ENCRYPTION_MASTER_KEY;
  if (!hex) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY is not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_MASTER_KEY must be a 32-byte value encoded as hex (64 hex characters).');
  }
  return key;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended IV length for GCM

/**
 * Encrypts a plaintext string. Output is a single string combining the IV,
 * auth tag, and ciphertext (all base64), safe to store as a single DB column.
 */
export function encrypt(plaintext: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join('.');
}

/**
 * Decrypts a string produced by encrypt(). Throws if the key is wrong or
 * the data was tampered with (GCM's auth tag check fails).
 */
export function decrypt(payload: string): string {
  const key = getMasterKey();
  const [ivB64, authTagB64, dataB64] = payload.split('.');
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error('Malformed encrypted payload.');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}
