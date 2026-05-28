import { NextResponse } from "next/server";
import { decodeLessonRouteSlug } from "@/lib/lessonLinks";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getLessonBySlug } from "@/lib/server/userStore";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const authenticated = await requireAuthenticatedUser(request);
  const { slug: routeSlug } = await context.params;
  const slug = decodeLessonRouteSlug(routeSlug);
  const lesson = await getLessonBySlug(authenticated?.user.id ?? null, slug, authenticated?.user.curriculumProfile ?? "HK");

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  }

  return NextResponse.json({ lesson });
}
