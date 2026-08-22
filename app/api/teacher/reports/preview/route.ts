import { createTeacherReportPreviewGetHandler } from "@/app/api/teacher/reports/preview/handler";

export const runtime = "nodejs";
export const GET = createTeacherReportPreviewGetHandler();
