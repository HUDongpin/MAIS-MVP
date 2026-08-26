import { createTeacherNoticeOperationalReadModel } from
  "@/lib/server/userStore/teacherNoticeOperationalReadModel";
import { createTeacherNoticeOperationalHealthHandler } from "./handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = createTeacherNoticeOperationalHealthHandler({
  readCronSecret: () => process.env.CRON_SECRET,
  readHealthSecret: () => process.env.TEACHER_NOTICE_HEALTH_SECRET,
  readSnapshot: createTeacherNoticeOperationalReadModel()
});
