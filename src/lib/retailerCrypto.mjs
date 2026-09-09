import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function encryptionKey() {
  const configured = process.env.RETAILER_TOKEN_ENCRYPTION_KEY?.trim();
  if (!configured) throw new Error("RETAILER_TOKEN_ENCRYPTION_KEY is not configured.");
  const key = /^[0-9a-f]{64}$/i.test(configured)
    ? Buffer.from(configured, "hex")
    : Buffer.from(configured, "base64");
  if (key.length !== 32) {
    throw new Error("RETAILER_TOKEN_ENCRYPTION_KEY must be a 32-byte key encoded as base64 or 64-character hex.");
  }
  return key;
}

export function sanitizeRetailerReturnTo(value) {
  const candidate = String(value || "/groceries");
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return "/groceries";
  }
  return candidate.slice(0, 500);
}

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function hashOAuthState(state) {
  return createHash("sha256").update(String(state)).digest("hex");
}

export function encryptRetailerToken(token, userId, provider) {
  if (!token) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`retailer:${provider}:${userId}`, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(String(token), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptRetailerToken(payload, userId, provider) {
  const [version, ivValue, tagValue, ciphertextValue] = String(payload || "").split(".");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Stored retailer credentials are invalid.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAAD(Buffer.from(`retailer:${provider}:${userId}`, "utf8"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
