import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherReviewLessonDetailData, updateTeacherReviewLessonPlan } from "@/lib/server/userStore";
import type {
  TeacherReviewLessonBoardColumn,
  TeacherReviewLessonIndividualGroup,
  TeacherReviewLessonItem,
  TeacherReviewLessonPlan,
  TeacherReviewLessonPracticeQuestion,
  TeacherReviewLessonSlide,
  TeacherReviewLessonStatus
} from "@/types";

export const runtime = "nodejs";

const validStatuses = new Set<TeacherReviewLessonStatus>(["draft", "generated", "reviewed"]);

export async function GET(request: Request, { params }: { params: Promise<{ reviewLessonId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { reviewLessonId } = await params;
  const data = await getTeacherReviewLessonDetailData(authenticated.user.id, decodeURIComponent(reviewLessonId));
  if (!data) return NextResponse.json({ error: "Review lesson not found." }, { status: 404 });

  return NextResponse.json({ data, reviewLesson: data.reviewLesson });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ reviewLessonId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    title?: unknown;
    status?: unknown;
    objectives?: unknown;
    timeline?: unknown;
    items?: unknown;
    slides?: unknown;
    boardColumns?: unknown;
    variationQuestions?: unknown;
    remediationQuestions?: unknown;
    individualGroups?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid review lesson payload." }, { status: 400 });

  const { reviewLessonId } = await params;
  const result = await updateTeacherReviewLessonPlan({
    teacherId: authenticated.user.id,
    reviewLessonId: decodeURIComponent(reviewLessonId),
    title: typeof body.title === "string" ? body.title : undefined,
    status: validStatuses.has(body.status as TeacherReviewLessonStatus) ? (body.status as TeacherReviewLessonStatus) : undefined,
    objectives: Array.isArray(body.objectives) ? (body.objectives as TeacherReviewLessonPlan["objectives"]) : undefined,
    timeline: Array.isArray(body.timeline) ? (body.timeline as TeacherReviewLessonPlan["timeline"]) : undefined,
    items: Array.isArray(body.items) ? (body.items as TeacherReviewLessonItem[]) : undefined,
    slides: Array.isArray(body.slides) ? (body.slides as TeacherReviewLessonSlide[]) : undefined,
    boardColumns: Array.isArray(body.boardColumns) ? (body.boardColumns as TeacherReviewLessonBoardColumn[]) : undefined,
    variationQuestions: Array.isArray(body.variationQuestions) ? (body.variationQuestions as TeacherReviewLessonPracticeQuestion[]) : undefined,
    remediationQuestions: Array.isArray(body.remediationQuestions) ? (body.remediationQuestions as TeacherReviewLessonPracticeQuestion[]) : undefined,
    individualGroups: Array.isArray(body.individualGroups) ? (body.individualGroups as TeacherReviewLessonIndividualGroup[]) : undefined
  });

  if (result.status !== "updated") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ reviewLesson: result.reviewLesson });
}
