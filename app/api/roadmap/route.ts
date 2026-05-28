import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getRoadmapData } from "@/lib/server/userStore";
import type { GradeId } from "@/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  const url = new URL(request.url);
  const gradeParam = url.searchParams.get("grade");
  const grade = isValidGradeId(gradeParam) ? (gradeParam as GradeId) : undefined;
  const roadmap = await getRoadmapData(authenticated?.user.id ?? null, grade, authenticated?.user.curriculumProfile ?? "HK");

  return NextResponse.json({ roadmap });
}
