import type { WorkerEnv } from "../lib/env";

export type TelemetryEvent = {
  name: string;
  path?: string;
  costUsd?: number;
  usedLlm?: boolean;
  degraded?: boolean;
  reason?: string;
};

export function recordEvent(env: WorkerEnv, event: TelemetryEvent): void {
  if (!env?.TELEMETRY || typeof env.TELEMETRY.writeDataPoint !== "function") return;
  env.TELEMETRY.writeDataPoint({
    blobs: [event.name, event.path ?? "", event.reason ?? "", event.usedLlm ? "llm" : "extractive"],
    doubles: [event.costUsd ?? 0, event.degraded ? 1 : 0],
    indexes: [event.name],
  });
}
