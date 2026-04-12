import { usersController } from "@/server/controllers/users.controller";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return usersController.get(request);
}
