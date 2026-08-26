import { createTeacherNoticeResendWebhookHandler } from "@/lib/server/teacherNoticeResendWebhookHandler";
import { persistTeacherNoticeResendWebhook } from "@/lib/server/teacherNoticeResendWebhookStore";

export const runtime = "nodejs";

const handler = createTeacherNoticeResendWebhookHandler({
  persist: persistTeacherNoticeResendWebhook
});

export async function POST(request: Request) {
  return handler(request);
}
