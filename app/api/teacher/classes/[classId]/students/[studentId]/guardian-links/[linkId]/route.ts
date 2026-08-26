import { createTeacherGuardianLinkRevokeHandler } from "@/app/api/teacher/guardianAccessHandlers";

export const runtime = "nodejs";
export const DELETE = createTeacherGuardianLinkRevokeHandler();
