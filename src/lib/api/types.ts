export const API_VERSION = "1";

export type ApiMeta = {
  requestId: string;
  locale: string;
  timestamp: string;
  apiVersion: string;
};

export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiSuccessBody<T> = {
  success: true;
  data: T;
  meta: ApiMeta;
};

export type ApiFailureBody = {
  success: false;
  error: ApiErrorPayload;
  meta: ApiMeta;
};

export type ApiBody<T> = ApiSuccessBody<T> | ApiFailureBody;
