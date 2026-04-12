import { healthController } from "@/server/controllers/health.controller";

export function GET(request: Request) {
  return healthController.get(request);
}
