import { otaUpdatesController } from "@/server/controllers/ota-updates.controller";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return otaUpdatesController.postDownloadCount(request);
}

