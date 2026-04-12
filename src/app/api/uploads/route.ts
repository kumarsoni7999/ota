import { uploadController } from "@/server/controllers/upload.controller";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return uploadController.get(request);
}

export async function POST(request: Request) {
  return uploadController.post(request);
}
