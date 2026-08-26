import { createTeacherNoticeResendWebhookMaintenanceHandler } from
  "@/lib/server/teacherNoticeResendWebhookMaintenanceHandler";
import { maintainTeacherNoticeResendWebhook } from
  "@/lib/server/teacherNoticeResendWebhookStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const handler = createTeacherNoticeResendWebhookMaintenanceHandler({
  maintain: maintainTeacherNoticeResendWebhook
});

export async function GET(request: Request) {
  return handler(request);
}
