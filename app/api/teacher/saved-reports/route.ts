import { createTeacherSavedReportsGetHandler } from "@/app/api/teacher/reports/handlers";

export { POST } from "../reports/save/route";

export const runtime = "nodejs";

export const GET = createTeacherSavedReportsGetHandler();
