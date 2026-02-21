import { createHash, randomBytes } from "crypto";

export function generateOAuthCode() {
  return randomBytes(32).toString("base64url");
}

export function hashOAuthCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function generateClientId() {
  return `btv_${randomBytes(16).toString("base64url")}`;
}

export function generateClientSecret() {
  return `btvs_${randomBytes(32).toString("base64url")}`;
}

export function hashClientSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function computePkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function validateRedirectUri(uri: string, allowedUris: string[]) {
  return allowedUris.includes(uri);
}
