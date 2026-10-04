import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const SALT = "societyhub-wa-v1";

function keyFrom(material: string): Buffer {
  return scryptSync(material, SALT, 32);
}

export function integrationConfigKey(): string {
  return process.env.INTEGRATION_CONFIG_KEY ?? "";
}

/** AES-256-GCM. Stored form is iv.tag.ciphertext, all base64. */
export function encryptSecret(plain: string, material = integrationConfigKey()): string {
  if (!material) throw new Error("INTEGRATION_CONFIG_KEY is required to store secrets");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(material), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptSecret(stored: string, material = integrationConfigKey()): string {
  if (!material) throw new Error("INTEGRATION_CONFIG_KEY is required to read secrets");
  const [ivB64, tagB64, dataB64] = stored.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("invalid ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", keyFrom(material), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}
