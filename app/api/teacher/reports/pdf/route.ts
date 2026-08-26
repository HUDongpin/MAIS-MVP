import { createTeacherReportPdfExportGetHandler } from "@/app/api/teacher/reports/handlers";

export const runtime = "nodejs";

export const GET = createTeacherReportPdfExportGetHandler();
