import { timingSafeEqual } from "node:crypto";
import type { ApiMeta } from "@/lib/api/types";
import { CLIENT_ID_HEADER } from "@/lib/api/client-id-header";
import { apiFailure } from "@/lib/api/response";
import { readSessionFromRequest, type SessionPayload } from "@/lib/auth/session";

function clientIdsMatch(sessionCid: string, headerValue: string): boolean {
  const a = Buffer.from(sessionCid, "utf8");
  const b = Buffer.from(headerValue, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * Requires a valid session cookie and matching `X-Client-Id` header (same as session cid).
 */
export function requireApiSessionWithClient(
  request: Request,
  meta: ApiMeta,
):
  | { ok: true; session: SessionPayload }
  | { ok: false; response: ReturnType<typeof apiFailure> } {
  const session = readSessionFromRequest(request);
  if (!session) {
    return {
      ok: false,
      response: apiFailure(
        { code: "UNAUTHORIZED", message: "Sign in required" },
        meta,
        { status: 401 },
      ),
    };
  }

  const headerCid = request.headers.get(CLIENT_ID_HEADER)?.trim();
  if (!headerCid || !clientIdsMatch(session.cid, headerCid)) {
    return {
      ok: false,
      response: apiFailure(
        {
          code: "INVALID_CLIENT_ID",
          message: `Valid ${CLIENT_ID_HEADER} header is required and must match your account`,
        },
        meta,
        { status: 401 },
      ),
    };
  }

  return { ok: true, session };
}
