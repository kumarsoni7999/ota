import { buildsController } from "@/server/controllers/builds.controller";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return buildsController.get(request);
}
