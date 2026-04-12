import { authController } from "@/server/controllers/auth.controller";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return authController.register(request);
}
