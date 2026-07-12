import { NextResponse } from "next/server";
import { decodeLessonRouteSlug } from "@/lib/lessonLinks";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getLessonBySlug } from "@/lib/server/userStore";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const anonymousLessonPreviewBlockLimit = 2;
type LessonPayload = Awaited<ReturnType<typeof getLessonBySlug>>;

function jsonWithLessonApiHeaders(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.append("Vary", "Cookie");
  return response;
}

function toAnonymousLessonPreview(lesson: Awaited<ReturnType<typeof getLessonBySlug>>) {
  if (!lesson) return lesson;

  return {
    ...lesson,
    blocks: lesson.blocks.slice(0, anonymousLessonPreviewBlockLimit).map((block) => ({
      ...block,
      practiceQuestionIds: undefined
    })),
    practiceQuestions: [],
    checklistState: {}
  };
}

function toStudentLessonPayload(lesson: LessonPayload) {
  if (!lesson) return lesson;

  return {
    ...lesson,
    blocks: lesson.blocks.filter((block) => block.type !== "teacher-guide")
  };
}

export async function GET(request: Request, context: RouteContext) {
  const authenticated = await requireAuthenticatedUser(request);
  const { slug: routeSlug } = await context.params;
  const slug = decodeLessonRouteSlug(routeSlug);
  const lesson = await getLessonBySlug(null, slug, authenticated?.user.curriculumProfile ?? "HK");

  if (!lesson) {
    return jsonWithLessonApiHeaders({ error: "Lesson not found." }, { status: 404 });
  }

  if (!authenticated) {
    return jsonWithLessonApiHeaders({
      access: "preview",
      requiresSignInForFullAccess: true,
      lesson: toAnonymousLessonPreview(lesson)
    });
  }

  return jsonWithLessonApiHeaders({
    access: "full",
    lesson: authenticated.user.role === "student" ? toStudentLessonPayload(lesson) : lesson
  });
}
