import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createTeacherMissingWorkReminderRunHandler } from "@/lib/server/teacherNoticeEmailOutboxHandlers";
import { runTeacherMissingWorkReminders } from "@/lib/server/userStore";

export const runtime = "nodejs";

export const POST = createTeacherMissingWorkReminderRunHandler({
  authenticate: requireAuthenticatedUser,
  authorize: canAccessTeacherArea,
  runReminders: runTeacherMissingWorkReminders
});
