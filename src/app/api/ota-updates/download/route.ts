import { otaDownloadController } from "@/server/controllers/ota-download.controller";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return otaDownloadController.get(request);
}
