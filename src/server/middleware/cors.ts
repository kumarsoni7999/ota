import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ALLOW_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const ALLOW_HEADERS =
  "Content-Type, Authorization, X-Request-Id, Accept-Language, Accept, X-Client-Id";

function configuredOrigins(): string[] | null {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) return null;
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length ? list : null;
}

/**
 * Resolves Access-Control-Allow-Origin. When CORS_ORIGINS is unset, uses a
 * permissive default (reflect Origin or *).
 */
export function resolveAllowOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  const allowed = configuredOrigins();

  if (!allowed) {
    return origin?.trim() || "*";
  }

  if (origin && allowed.includes(origin)) {
    return origin;
  }

  if (!origin) {
    return "*";
  }

  return null;
}

function applyCorsHeaders(
  request: NextRequest,
  response: NextResponse,
  allowOrigin: string,
) {
  response.headers.set("Access-Control-Allow-Origin", allowOrigin);
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", ALLOW_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
  response.headers.set("Access-Control-Max-Age", "86400");

  if (allowOrigin !== "*") {
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  const acrh = request.headers.get("access-control-request-headers");
  if (acrh) {
    response.headers.set("Access-Control-Allow-Headers", acrh);
  }
}

export function maybeApiCorsPreflight(request: NextRequest) {
  if (request.method !== "OPTIONS") {
    return null;
  }

  const allowOrigin = resolveAllowOrigin(request);
  if (!allowOrigin) {
    return new NextResponse(null, { status: 403 });
  }

  const response = new NextResponse(null, { status: 204 });
  applyCorsHeaders(request, response, allowOrigin);
  return response;
}

export function applyApiCorsHeaders(request: NextRequest, response: NextResponse) {
  const allowOrigin = resolveAllowOrigin(request);
  if (!allowOrigin) {
    return;
  }
  applyCorsHeaders(request, response, allowOrigin);
}
