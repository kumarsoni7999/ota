import type { HealthStatus } from "@/server/models/health.model";

export const healthService = {
  getStatus(): HealthStatus {
    return { status: "ok", service: "Sthanave OTA" };
  },
};
