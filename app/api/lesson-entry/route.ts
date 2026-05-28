import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getLessonEntryTarget } from "@/lib/server/userStore";
import type { GradeId } from "@/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const url = new URL(request.url);
  const gradeParam = url.searchParams.get("grade");
  const requestedGrade = isValidGradeId(gradeParam) ? (gradeParam as GradeId) : authenticated.settings.selectedGrade;
  const grade = authenticated.user.role === "student" ? authenticated.user.grade : requestedGrade;
  const lessonEntryTarget = ["student", "teacher", "admin"].includes(authenticated.user.role)
    ? await getLessonEntryTarget(authenticated.user.id, grade, authenticated.user.curriculumProfile)
    : null;

  return NextResponse.json({ lessonEntryTarget });
}
