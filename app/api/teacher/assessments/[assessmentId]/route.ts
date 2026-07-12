import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherAssessmentDetailData, updateTeacherAssessment } from "@/lib/server/userStore";
import type { AssessmentManualQuestion, AssessmentPaperSection, AssessmentSourceType, AssessmentType } from "@/types";

export const runtime = "nodejs";

const validAssessmentTypes = new Set<AssessmentType>(["quiz", "test", "mock-exam", "exam"]);
const validSourceTypes = new Set<AssessmentSourceType>(["question-bank", "manual", "resource", "mistake-generated", "mixed"]);
const validStatusIntents = new Set(["draft", "publish"]);

export async function GET(request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { assessmentId } = await params;
  const assessment = await getTeacherAssessmentDetailData(authenticated.user.id, assessmentId);
  if (!assessment) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });

	  return NextResponse.json({ assessment });
	}

export async function PATCH(request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    title?: unknown;
    type?: unknown;
    sourceType?: unknown;
    sourceResourceId?: unknown;
    questionIds?: unknown;
    manualQuestions?: unknown;
    paperSections?: unknown;
    statusIntent?: unknown;
    opensAt?: unknown;
    closesAt?: unknown;
    timeLimitMinutes?: unknown;
    maxAttempts?: unknown;
    randomizeQuestionOrder?: unknown;
    showAnswersImmediately?: unknown;
    gradeWeight?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid assessment payload." }, { status: 400 });

  const { assessmentId } = await params;
  const result = await updateTeacherAssessment({
    teacherId: authenticated.user.id,
    assessmentId: decodeURIComponent(assessmentId),
    title: typeof body.title === "string" ? body.title : undefined,
    type: validAssessmentTypes.has(body.type as AssessmentType) ? (body.type as AssessmentType) : undefined,
    sourceType: validSourceTypes.has(body.sourceType as AssessmentSourceType) ? (body.sourceType as AssessmentSourceType) : undefined,
    sourceResourceId: typeof body.sourceResourceId === "string" && body.sourceResourceId ? body.sourceResourceId : null,
    questionIds: Array.isArray(body.questionIds)
      ? body.questionIds.filter((questionId): questionId is string => typeof questionId === "string")
      : undefined,
    manualQuestions: Array.isArray(body.manualQuestions) ? (body.manualQuestions as AssessmentManualQuestion[]) : undefined,
    paperSections: Array.isArray(body.paperSections) ? (body.paperSections as AssessmentPaperSection[]) : undefined,
    statusIntent: validStatusIntents.has(body.statusIntent as string) ? (body.statusIntent as "draft" | "publish") : undefined,
    opensAt: typeof body.opensAt === "string" && body.opensAt ? body.opensAt : null,
    closesAt: typeof body.closesAt === "string" && body.closesAt ? body.closesAt : null,
    timeLimitMinutes: typeof body.timeLimitMinutes === "number" ? body.timeLimitMinutes : null,
    maxAttempts: typeof body.maxAttempts === "number" ? body.maxAttempts : null,
    randomizeQuestionOrder: typeof body.randomizeQuestionOrder === "boolean" ? body.randomizeQuestionOrder : undefined,
    showAnswersImmediately: typeof body.showAnswersImmediately === "boolean" ? body.showAnswersImmediately : undefined,
    gradeWeight: typeof body.gradeWeight === "number" ? body.gradeWeight : null
  });

  if (result.status !== "updated") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" || result.status === "resource-not-found" ? 404 : result.status === "locked" ? 409 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ assessment: result.assessment });
}
