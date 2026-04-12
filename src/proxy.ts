import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  applyApiCorsHeaders,
  maybeApiCorsPreflight,
} from "@/server/middleware/cors";

/**
 * Runs only for `/api/*`: CORS preflight and response headers.
 * Dashboard auth stays in `src/app/dashboard/layout.tsx` (no proxy on pages).
 */
export default function proxy(request: NextRequest) {
  const preflight = maybeApiCorsPreflight(request);
  if (preflight) {
    return preflight;
  }
  const response = NextResponse.next();
  applyApiCorsHeaders(request, response);
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
