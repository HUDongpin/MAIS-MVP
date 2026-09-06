import { createTeacherReportSavePostHandler } from "@/app/api/teacher/reports/handlers";

export const runtime = "nodejs";

export const POST = createTeacherReportSavePostHandler();
