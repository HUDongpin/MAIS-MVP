import { randomUUID } from "node:crypto";

import { createTeacherNoticeEmailCronHandler } from "@/lib/server/teacherNoticeEmailOutboxHandlers";
import {
  deliverTeacherNoticeEmailOutboxBatch,
  recordTeacherNoticeEmailCronHeartbeatFailed,
  recordTeacherNoticeEmailCronHeartbeatStarted,
  recordTeacherNoticeEmailCronHeartbeatSucceeded
} from "@/lib/server/userStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = createTeacherNoticeEmailCronHandler({
  createRunId: randomUUID,
  readCronSecret: () => process.env.CRON_SECRET,
  readReleaseSha: () => process.env.MAIS_RELEASE_SHA,
  recordHeartbeatFailed: recordTeacherNoticeEmailCronHeartbeatFailed,
  recordHeartbeatStarted: recordTeacherNoticeEmailCronHeartbeatStarted,
  recordHeartbeatSucceeded: recordTeacherNoticeEmailCronHeartbeatSucceeded,
  // Eight maximum-length (30 s) provider attempts leave one minute of the
  // Pro function budget for claim/CAS transactions and cold initialization.
  runWorker: () => deliverTeacherNoticeEmailOutboxBatch(8)
});
