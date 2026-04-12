import { buildMeta, createApiContext } from "@/lib/api/context";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { isValidEmail, isValidMobile } from "@/lib/validation/contact";
import { userService } from "@/server/services/user.service";

export const authAvailabilityController = {
  async get(request: Request) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);

    const url = new URL(request.url);
    const emailRaw = url.searchParams.get("email");
    const mobileRaw = url.searchParams.get("mobile");
    const emailTrim = emailRaw?.trim() ?? "";
    const mobileTrim = mobileRaw?.trim() ?? "";

    if (!emailTrim && !mobileTrim) {
      return apiFailure(
        {
          code: "QUERY_REQUIRED",
          message: "Add an email or mobile query parameter to check availability.",
        },
        meta,
        { status: 400 },
      );
    }

    const data: {
      emailAvailable?: boolean;
      mobileAvailable?: boolean;
    } = {};

    if (emailTrim) {
      if (!isValidEmail(emailTrim)) {
        return apiFailure(
          {
            code: "INVALID_EMAIL",
            message: "That email address is not valid.",
          },
          meta,
          { status: 400 },
        );
      }
      data.emailAvailable = await userService.isEmailAvailable(emailTrim);
    }

    if (mobileTrim) {
      if (!isValidMobile(mobileTrim)) {
        return apiFailure(
          {
            code: "INVALID_MOBILE",
            message:
              "Mobile must be exactly 10 digits. Examples: 9876543210, +91 98765 43210, or 09876543210.",
          },
          meta,
          { status: 400 },
        );
      }
      data.mobileAvailable = await userService.isMobileAvailable(mobileTrim);
    }

    return apiSuccess(data, meta);
  },
};
