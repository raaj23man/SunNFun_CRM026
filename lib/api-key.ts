import crypto from "crypto";

/**
 * Computes a deterministic SHA-256 hash of an API key for indexed database lookups.
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey.trim()).digest("hex");
}

/**
 * Generates a cryptographically secure random API key and its SHA-256 hash.
 * The raw API key should be shown to the user once; only the hash is stored.
 */
export function generateApiKey(prefix: string = "snf_live_"): {
  apiKey: string;
  apiKeyHash: string;
} {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const apiKey = `${prefix}${randomBytes}`;
  const apiKeyHash = hashApiKey(apiKey);
  return { apiKey, apiKeyHash };
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function verifyApiKey(apiKey: string, expectedHash: string): boolean {
  const incomingHash = hashApiKey(apiKey);
  if (incomingHash.length !== expectedHash.length) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(incomingHash, "utf-8"),
    Buffer.from(expectedHash, "utf-8")
  );
}
