import { authAvailabilityController } from "@/server/controllers/auth-availability.controller";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return authAvailabilityController.get(request);
}
