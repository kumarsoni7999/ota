import { randomUUID } from "node:crypto";
import { API_VERSION } from "./types";

function pickLocaleFromAcceptLanguage(acceptLanguage: string | null): string {
  const first = acceptLanguage?.split(",")[0]?.split(";")[0]?.trim();
  return first && first.length > 0 ? first : "en";
}

export type ApiRequestContext = {
  requestId: string;
  locale: string;
};

export function createApiContext(request: Request): ApiRequestContext {
  const headerId = request.headers.get("x-request-id")?.trim();
  const requestId = headerId && headerId.length > 0 ? headerId : randomUUID();
  const locale = pickLocaleFromAcceptLanguage(
    request.headers.get("accept-language"),
  );

  return { requestId, locale };
}

export function buildMeta(ctx: ApiRequestContext) {
  return {
    requestId: ctx.requestId,
    locale: ctx.locale,
    timestamp: new Date().toISOString(),
    apiVersion: API_VERSION,
  };
}
