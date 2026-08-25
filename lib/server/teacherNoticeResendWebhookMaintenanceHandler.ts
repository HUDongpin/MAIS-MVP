import type {
  TeacherNoticeResendWebhookMaintenanceOptions,
  TeacherNoticeResendWebhookMaintenanceResult
} from "./userStore/teacherNoticeResendWebhookPersistence";
import {
  teacherNoticeResendWebhookMaintenanceBudgetMs
} from "./userStore/teacherNoticeResendWebhookPersistence";
import { authorizeCronBearer } from "./cronAuthorization";
import type { CronAuthorizationDecision } from "./cronAuthorization";

type MaintenanceOptions = TeacherNoticeResendWebhookMaintenanceOptions & {
  reconciliationLimit: number;
  retentionLimit: number;
};

type HandlerOptions = {
  env?: Record<string, string | undefined>;
  monotonicNow?: () => number;
  maintain: (options: MaintenanceOptions) =>
    Promise<TeacherNoticeResendWebhookMaintenanceResult>;
};

const responseHeaders = {
  "cache-control": "private, no-store",
  "content-type": "application/json; charset=utf-8"
};

function response(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function safeNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function safeMaintenanceResult(
  value: unknown
): TeacherNoticeResendWebhookMaintenanceResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const counts = [
    candidate.reconciledProviders,
    candidate.eventsMatched,
    candidate.statesUpserted,
    candidate.eventsDeleted,
    candidate.statesDeleted
  ];
  if (
    !counts.every(safeNonnegativeInteger) ||
    typeof candidate.hasMoreReconciliation !== "boolean" ||
    typeof candidate.hasMoreRetention !== "boolean"
  ) return null;
  return {
    reconciledProviders: candidate.reconciledProviders as number,
    eventsMatched: candidate.eventsMatched as number,
    statesUpserted: candidate.statesUpserted as number,
    eventsDeleted: candidate.eventsDeleted as number,
    statesDeleted: candidate.statesDeleted as number,
    hasMoreReconciliation: candidate.hasMoreReconciliation,
    hasMoreRetention: candidate.hasMoreRetention
  };
}

export function createTeacherNoticeResendWebhookMaintenanceHandler(options: HandlerOptions) {
  const env = options.env ?? process.env;
  const monotonicNow = options.monotonicNow ?? (() => globalThis.performance.now());
  return async function handleTeacherNoticeResendWebhookMaintenance(
    request: Request
  ): Promise<Response> {
    let authorization: CronAuthorizationDecision;
    try {
      authorization = authorizeCronBearer(
        request.headers.get("authorization"),
        env.CRON_SECRET
      );
    } catch {
      return response({ error: "Service temporarily unavailable." }, 503);
    }
    if (authorization === "unavailable") {
      return response({ error: "Service temporarily unavailable." }, 503);
    }
    if (authorization === "unauthorized") {
      return response({ error: "Unauthorized." }, 401);
    }
    try {
      const startedAt = monotonicNow();
      if (!Number.isFinite(startedAt) || startedAt < 0) {
        return response({ error: "Service temporarily unavailable." }, 503);
      }
      const rawMaintenance = await options.maintain({
        reconciliationLimit: 100,
        retentionLimit: 100,
        deadlineAt: startedAt + teacherNoticeResendWebhookMaintenanceBudgetMs,
        monotonicNow
      });
      const maintenance = safeMaintenanceResult(rawMaintenance);
      if (!maintenance) {
        return response({ error: "Service temporarily unavailable." }, 503);
      }
      return response({ ok: true, maintenance }, 200);
    } catch {
      return response({ error: "Service temporarily unavailable." }, 503);
    }
  };
}
