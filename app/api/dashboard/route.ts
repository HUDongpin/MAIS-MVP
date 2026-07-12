import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getDashboardData } from "@/lib/server/userStore";
import type { GradeId } from "@/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (authenticated.user.role !== "student") {
    return NextResponse.json({
      error: "Student access required.",
      reason: "student-only"
    }, { status: 403 });
  }

  const url = new URL(request.url);
  const gradeParam = url.searchParams.get("grade");
  const grade = isValidGradeId(gradeParam)
    ? (gradeParam as GradeId)
    : authenticated.settings.selectedGrade;
  const dashboard = await getDashboardData(authenticated.user.id, grade, authenticated.user.curriculumProfile);

  return NextResponse.json({ dashboard });
}
