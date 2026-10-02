import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const REDIS_KEY = 'pixel-ai:muapi-api-key';
const ENCRYPTED_PREFIX = 'v1';

function getEncryptionKey() {
  const secret = process.env.MUAPI_KEY_ENCRYPTION_SECRET;
  if (!secret || !/^[\da-fA-F]{64}$/.test(secret)) {
    throw new Error('MUAPI_KEY_ENCRYPTION_SECRET must be a 64-character hexadecimal value.');
  }
  return Buffer.from(secret, 'hex');
}

function encryptApiKey(apiKey) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [ENCRYPTED_PREFIX, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join(':');
}

function decryptApiKey(value) {
  const [prefix, encodedIv, encodedTag, encodedCiphertext] = value.split(':');
  if (prefix !== ENCRYPTED_PREFIX || !encodedIv || !encodedTag || !encodedCiphertext) {
    throw new Error('Stored Muapi API key has an invalid format.');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(encodedIv, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

async function redisCommand(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('Upstash Redis is not configured.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Upstash Redis request failed with status ${response.status}.`);
  }

  const result = await response.json();
  if (result.error) {
    throw new Error('Upstash Redis rejected the storage request.');
  }
  return result.result;
}

export function isAdminAuthorized(request) {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = request.headers.get('x-admin-password');
  if (!expectedPassword || !providedPassword) return false;

  const expectedDigest = createHash('sha256').update(expectedPassword).digest();
  const providedDigest = createHash('sha256').update(providedPassword).digest();
  return timingSafeEqual(expectedDigest, providedDigest);
}

export async function storeMuapiApiKey(apiKey) {
  await redisCommand(['SET', REDIS_KEY, encryptApiKey(apiKey)]);
}

export async function getStoredMuapiApiKey() {
  const storedValue = await redisCommand(['GET', REDIS_KEY]);
  return storedValue ? decryptApiKey(storedValue) : null;
}
