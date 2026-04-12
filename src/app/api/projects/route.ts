import { projectsController } from "@/server/controllers/projects.controller";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return projectsController.get(request);
}

export async function POST(request: Request) {
  return projectsController.post(request);
}
