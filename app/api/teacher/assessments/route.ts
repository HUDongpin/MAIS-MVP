import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createTeacherAssessment, getTeacherAssessmentListData } from "@/lib/server/userStore";
import type { AssessmentManualQuestion, AssessmentSourceType, AssessmentType } from "@/types";

export const runtime = "nodejs";

const validAssessmentTypes = new Set<AssessmentType>(["quiz", "test", "mock-exam", "exam"]);
const validSourceTypes = new Set<AssessmentSourceType>(["question-bank", "manual", "resource", "mistake-generated"]);

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const data = await getTeacherAssessmentListData(authenticated.user.id);
  if (!data) return NextResponse.json({ error: "Assessments unavailable." }, { status: 404 });

  return NextResponse.json({ assessments: data.assessments, data });
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    classId?: unknown;
    title?: unknown;
    type?: unknown;
    sourceType?: unknown;
    sourceResourceId?: unknown;
    questionIds?: unknown;
    manualQuestions?: unknown;
    opensAt?: unknown;
    closesAt?: unknown;
    timeLimitMinutes?: unknown;
    maxAttempts?: unknown;
    randomizeQuestionOrder?: unknown;
    showAnswersImmediately?: unknown;
    gradeWeight?: unknown;
  } | null;
  const type = validAssessmentTypes.has(body?.type as AssessmentType) ? (body?.type as AssessmentType) : null;
  const sourceType = validSourceTypes.has(body?.sourceType as AssessmentSourceType)
    ? (body?.sourceType as AssessmentSourceType)
    : null;

  if (!body || typeof body.classId !== "string" || typeof body.title !== "string" || !type || !sourceType) {
    return NextResponse.json({ error: "Invalid assessment payload." }, { status: 400 });
  }

  const result = await createTeacherAssessment({
    teacherId: authenticated.user.id,
    classId: body.classId,
    title: body.title,
    type,
    sourceType,
    sourceResourceId: typeof body.sourceResourceId === "string" && body.sourceResourceId ? body.sourceResourceId : null,
    questionIds: Array.isArray(body.questionIds)
      ? body.questionIds.filter((questionId): questionId is string => typeof questionId === "string")
      : undefined,
    manualQuestions: Array.isArray(body.manualQuestions) ? (body.manualQuestions as AssessmentManualQuestion[]) : undefined,
    opensAt: typeof body.opensAt === "string" && body.opensAt ? body.opensAt : null,
    closesAt: typeof body.closesAt === "string" && body.closesAt ? body.closesAt : null,
    timeLimitMinutes: typeof body.timeLimitMinutes === "number" ? body.timeLimitMinutes : null,
    maxAttempts: typeof body.maxAttempts === "number" ? body.maxAttempts : null,
    randomizeQuestionOrder: Boolean(body.randomizeQuestionOrder),
    showAnswersImmediately: Boolean(body.showAnswersImmediately),
    gradeWeight: typeof body.gradeWeight === "number" ? body.gradeWeight : null
  });

  if (result.status !== "created") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" || result.status === "resource-not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ assessment: result.assessment }, { status: 201 });
}
