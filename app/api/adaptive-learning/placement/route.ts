import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { applyDiagnosticPlacement, getDiagnosticPlacementBlueprint } from "@/lib/server/userStore";
import type { PlacementResponse } from "@/lib/diagnosticPlacement";
import type { GradeId } from "@/types";

export const runtime = "nodejs";

const MAX_RESPONSES = 32;

function studentGuard() {
  return NextResponse.json({
    error: "Student access required.",
    reason: "student-only",
    guard: {
      en: "Diagnostic placement is available only to the signed-in student.",
      zh: "診斷定位只對已登入學生本人開放。",
      zhHans: "诊断定位只对已登录学生本人开放。"
    }
  }, { status: 403 });
}

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (authenticated.user.role !== "student") {
    return studentGuard();
  }

  const url = new URL(request.url);
  const gradeParam = url.searchParams.get("grade");
  const grade = isValidGradeId(gradeParam) ? (gradeParam as GradeId) : authenticated.settings.selectedGrade;

  const blueprint = await getDiagnosticPlacementBlueprint({
    userId: authenticated.user.id,
    grade,
    curriculumTrack: authenticated.user.curriculumProfile
  });

  return NextResponse.json({ grade, ...blueprint });
}

function parseResponses(value: unknown): PlacementResponse[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const responses: PlacementResponse[] = [];
  for (const entry of value) {
    const record = entry as Partial<PlacementResponse> | null;
    if (!record || typeof record.skillId !== "string" || typeof record.correct !== "boolean") continue;
    if (seen.has(record.skillId)) continue;
    seen.add(record.skillId);
    responses.push({ skillId: record.skillId, correct: record.correct });
    if (responses.length >= MAX_RESPONSES) break;
  }
  return responses;
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (authenticated.user.role !== "student") {
    return studentGuard();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = body as { grade?: unknown; responses?: unknown } | null;
  const grade = isValidGradeId(payload?.grade)
    ? (payload?.grade as GradeId)
    : authenticated.settings.selectedGrade;
  const responses = parseResponses(payload?.responses);

  const result = await applyDiagnosticPlacement({
    userId: authenticated.user.id,
    grade,
    responses,
    curriculumTrack: authenticated.user.curriculumProfile
  });

  return NextResponse.json({ grade, ...result });
}
