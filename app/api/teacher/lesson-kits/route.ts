import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createTeacherLessonKit, getTeacherLessonKitListData } from "@/lib/server/userStore";
import type { TeacherLessonKit, TextbookPublisher } from "@/types";

export const runtime = "nodejs";

const validPublishers = new Set<TextbookPublisher>(["MAINLAND_PEP", "MAINLAND_BNU"]);
const validLessonTypes = new Set<TeacherLessonKit["lessonType"]>(["new-lesson", "review", "practice", "exam-prep"]);

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const data = await getTeacherLessonKitListData(authenticated.user.id);
  if (!data) return NextResponse.json({ error: "Lesson kits unavailable." }, { status: 404 });

  return NextResponse.json({ data, kits: data.kits });
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    classId?: unknown;
    publisher?: unknown;
    topicId?: unknown;
    lessonPeriod?: unknown;
    lessonType?: unknown;
    durationMinutes?: unknown;
  } | null;

  if (
    !body ||
    typeof body.classId !== "string" ||
    typeof body.topicId !== "string" ||
    !validPublishers.has(body.publisher as TextbookPublisher) ||
    !validLessonTypes.has(body.lessonType as TeacherLessonKit["lessonType"])
  ) {
    return NextResponse.json({ error: "Invalid lesson kit payload." }, { status: 400 });
  }

  const result = await createTeacherLessonKit({
    teacherId: authenticated.user.id,
    classId: body.classId,
    publisher: body.publisher as TextbookPublisher,
    topicId: body.topicId,
    lessonPeriod: Number(body.lessonPeriod),
    lessonType: body.lessonType as TeacherLessonKit["lessonType"],
    durationMinutes: Number(body.durationMinutes)
  });

  if (result.status !== "created") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" || result.status === "topic-not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ kit: result.kit }, { status: 201 });
}
