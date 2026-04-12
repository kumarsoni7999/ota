import { NextResponse } from "next/server";
import type { ApiBody, ApiErrorPayload, ApiFailureBody, ApiMeta } from "./types";

function baseHeaders(meta: ApiMeta, extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Request-Id", meta.requestId);
  headers.set("X-Api-Version", meta.apiVersion);
  headers.set("Content-Language", meta.locale);
  return headers;
}

export function apiSuccess<T>(
  data: T,
  meta: ApiMeta,
  init?: { status?: number; headers?: HeadersInit },
) {
  const body: ApiBody<T> = { success: true, data, meta };
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: baseHeaders(meta, init?.headers),
  });
}

export function apiFailure(
  error: ApiErrorPayload,
  meta: ApiMeta,
  init?: { status?: number; headers?: HeadersInit },
) {
  const body: ApiFailureBody = { success: false, error, meta };
  return NextResponse.json(body, {
    status: init?.status ?? 400,
    headers: baseHeaders(meta, init?.headers),
  });
}
