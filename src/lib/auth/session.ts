import { createHmac, timingSafeEqual } from "node:crypto";
import { getAuthSecret } from "@/lib/auth/auth-secret";
import { isValidSessionClientId } from "@/lib/auth/client-id-format";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-constants";
import type { SessionPayload } from "@/lib/auth/session-payload";
import type { UserRole } from "@/server/models/role.model";

export { SESSION_COOKIE_NAME } from "@/lib/auth/session-constants";
export type { SessionPayload } from "@/lib/auth/session-payload";
export { isValidSessionClientId } from "@/lib/auth/client-id-format";

export function createSessionToken(
  input: { userId: string; role: UserRole; clientId: string },
  ttlSeconds = 60 * 60 * 24 * 7,
): string {
  if (!isValidSessionClientId(input.clientId)) {
    throw new Error("createSessionToken: invalid clientId");
  }
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload: SessionPayload = {
    sub: input.userId,
    role: input.role,
    exp,
    cid: input.clientId,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const sig = createHmac("sha256", getAuthSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }
  const [encoded, sig] = parts as [string, string];
  if (!encoded || !sig) {
    return null;
  }
  const expected = createHmac("sha256", getAuthSecret())
    .update(encoded)
    .digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
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

function sessionCookieSecureSuffix(): string {
  const explicit = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (explicit === "false" || explicit === "0") {
    return "";
  }
  if (explicit === "true" || explicit === "1") {
    return "; Secure";
  }
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

export function buildSessionSetCookieHeader(token: string): string {
  const maxAge = 60 * 60 * 24 * 7;
  const secure = sessionCookieSecureSuffix();
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function buildSessionClearCookieHeader(): string {
  const secure = sessionCookieSecureSuffix();
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

/** Read and verify the session cookie from an incoming `Request` (e.g. Route Handlers). */
export function readSessionFromRequest(request: Request) {
  const raw = request.headers.get("cookie");
  if (!raw) {
    return null;
  }
  for (const part of raw.split(";")) {
    const p = part.trim();
    const eq = p.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = p.slice(0, eq).trim();
    if (key !== SESSION_COOKIE_NAME) {
      continue;
    }
    const value = decodeURIComponent(p.slice(eq + 1).trim());
    return verifySessionToken(value);
  }
  return null;
}
