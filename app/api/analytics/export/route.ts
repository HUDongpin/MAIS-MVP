import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getAnalyticsExport } from "@/lib/server/userStore";
import type { GradeId } from "@/types";

export const runtime = "nodejs";

const validGrades = new Set<GradeId>(["S1", "S2", "S3", "S4", "S5", "S6"]);

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const url = new URL(request.url);
  const gradeParam = url.searchParams.get("grade");
  const grade = validGrades.has(gradeParam as GradeId)
    ? (gradeParam as GradeId)
    : authenticated.settings.selectedGrade;
  const exported = await getAnalyticsExport(authenticated.user.id, grade, url.searchParams.get("window"));

  return NextResponse.json(exported, {
    headers: {
      "Content-Disposition": `attachment; filename="learning-analytics-${grade}.json"`
    }
  });
}
