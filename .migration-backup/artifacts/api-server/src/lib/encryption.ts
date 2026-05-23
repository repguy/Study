import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

function getDerivedKey(): Buffer {
  const secret = process.env.SESSION_SECRET ?? process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET or ENCRYPTION_KEY environment variable is required for BYOK encryption. Set one before starting the server.",
    );
  }
  return scryptSync(secret, "cluvi-byok-salt-v1", 32) as Buffer;
}

export function encrypt(plaintext: string): string {
  const key = getDerivedKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const key = getDerivedKey();
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
