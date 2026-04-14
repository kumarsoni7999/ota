import { otaUpdatesController } from "@/server/controllers/ota-updates.controller";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return otaUpdatesController.get(request);
}

export async function POST(request: Request) {
  return otaUpdatesController.post(request);
}
