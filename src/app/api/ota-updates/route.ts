import { otaUpdatesController } from "@/server/controllers/ota-updates.controller";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return otaUpdatesController.get(request);
}
