import { getAuthSecret } from "@/lib/auth/auth-secret";
import { isValidSessionClientId } from "@/lib/auth/client-id-format";
import type { SessionPayload } from "@/lib/auth/session-payload";

function bytesToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64UrlUtf8(encoded: string): string {
  const pad = encoded.length % 4 === 0 ? "" : "=".repeat(4 - (encoded.length % 4));
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let x = 0;
  for (let i = 0; i < a.length; i++) {
    x |= a[i]! ^ b[i]!;
  }
  return x === 0;
}

async function hmacSha256Base64Url(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bytesToBase64Url(sig);
}

/**
 * Verify session token using Web Crypto (Edge / proxy runtime).
 * Must stay in sync with `verifySessionToken` in `session.ts`.
 */
export async function verifySessionTokenEdge(
  token: string,
): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }
  const [encoded, sig] = parts as [string, string];
  if (!encoded || !sig) {
    return null;
  }
  const secret = getAuthSecret();
  const expectedSigB64 = await hmacSha256Base64Url(secret, encoded);
  const enc = new TextEncoder();
  const a = enc.encode(sig);
  const b = enc.encode(expectedSigB64);
  if (!timingSafeEqualBytes(a, b)) {
    return null;
  }
  try {
    const json = decodeBase64UrlUtf8(encoded);
    const payload = JSON.parse(json) as SessionPayload;
    if (
      typeof payload.sub !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.exp !== "number" ||
      typeof payload.cid !== "string" ||
      !isValidSessionClientId(payload.cid)
    ) {
      return null;
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
