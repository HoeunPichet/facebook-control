import crypto from 'crypto';

/**
 * Derives a consistent 32-byte key from the environment encryption key.
 */
function getDerivedKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || 'default-cambodia-marketing-encryption-key-32chars!';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive text (e.g. Facebook Page Access Tokens) using AES-256-GCM.
 * Output format: iv:authTag:ciphertext (hex encoded)
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const key = getDerivedKey();
  const iv = crypto.randomBytes(12); // Standard 12-byte IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted token.
 */
export function decryptToken(encryptedText: string): string {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getDerivedKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

/**
 * Verifies Meta Webhook HMAC-SHA256 signature (X-Hub-Signature-256).
 */
export function verifyMetaWebhookSignature(payload: string, signatureWithPrefix: string): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signatureWithPrefix) return false;

  const [prefix, signature] = signatureWithPrefix.split('=');
  if (prefix !== 'sha256' || !signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload, 'utf8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically secure random state string for OAuth CSRF protection.
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(24).toString('hex');
}

