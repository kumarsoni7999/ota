import { buildMeta, createApiContext } from "@/lib/api/context";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { uploadService } from "@/server/services/upload.service";

export const uploadController = {
  async get(request: Request) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);
    try {
      const uploads = await uploadService.list();
      return apiSuccess({ uploads }, meta);
    } catch {
      return apiFailure(
        { code: "LIST_FAILED", message: "Could not read uploads" },
        meta,
        { status: 500 },
      );
    }
  },

  async post(request: Request) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return apiFailure(
        {
          code: "INVALID_FORM",
          message: "Could not parse multipart form data",
        },
        meta,
        { status: 400 },
      );
    }

    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return apiFailure(
        {
          code: "FILE_REQUIRED",
          message: "Expected multipart field \"file\"",
        },
        meta,
        { status: 400 },
      );
    }

    try {
      const upload = await uploadService.saveFromFormFile(file);
      return apiSuccess({ upload }, meta, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message === "FILE_TOO_LARGE") {
        return apiFailure(
          { code: "FILE_TOO_LARGE", message: "File exceeds configured limit" },
          meta,
          { status: 413 },
        );
      }
      return apiFailure(
        { code: "UPLOAD_FAILED", message: "Could not store file" },
        meta,
        { status: 500 },
      );
    }
  },
};
