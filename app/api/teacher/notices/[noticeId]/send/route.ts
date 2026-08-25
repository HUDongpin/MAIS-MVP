import { requireAuthenticatedUser } from "@/lib/server/auth";
import { createTeacherNoticeEmailSendHandler } from "@/lib/server/teacherNoticeEmailOutboxHandlers";
import { sendTeacherNotice } from "@/lib/server/userStore";

export const runtime = "nodejs";

export const POST = createTeacherNoticeEmailSendHandler({
  authenticate: requireAuthenticatedUser,
  queueNoticeEmail: sendTeacherNotice
});
