import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getPilotPlatformLoopData } from "@/lib/server/userStore";
import type { GradeId } from "@/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const url = new URL(request.url);
  const gradeParam = url.searchParams.get("grade");
  const grade = isValidGradeId(gradeParam) ? (gradeParam as GradeId) : authenticated.settings.selectedGrade;
  const data = await getPilotPlatformLoopData({
    userId: authenticated.user.id,
    grade
  });

  if (!data) {
    return NextResponse.json({ error: "Pilot platform loop unavailable." }, { status: 404 });
  }

  return NextResponse.json({ data });
}
