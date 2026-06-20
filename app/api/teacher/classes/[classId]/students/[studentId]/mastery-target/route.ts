import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { clearTeacherStudentMasteryTarget, setTeacherStudentMasteryTarget } from "@/lib/server/userStore";

export const runtime = "nodejs";

function routeStatus(status: string) {
  if (status === "forbidden") return 403;
  if (status === "student-not-found" || status === "topic-not-found") return 404;
  return 400;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ classId: string; studentId: string }> }
) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId, studentId } = await params;
  const body = await request.json().catch(() => null) as { topicId?: unknown; mastery?: unknown; note?: unknown } | null;
  if (!body || typeof body.topicId !== "string") {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  if (body.mastery === null) {
    const result = await clearTeacherStudentMasteryTarget({
      teacherId: authenticated.user.id,
      classId: decodeURIComponent(classId),
      studentId: decodeURIComponent(studentId),
      topicId: body.topicId
    });

    if (result.status !== "cleared") {
      return NextResponse.json({ error: result.status }, { status: routeStatus(result.status) });
    }

    return NextResponse.json({ target: null });
  }

  if (typeof body.mastery !== "number" || !Number.isFinite(body.mastery)) {
    return NextResponse.json({ error: "Mastery must be a number from 0 to 100." }, { status: 400 });
  }

  const result = await setTeacherStudentMasteryTarget({
    teacherId: authenticated.user.id,
    classId: decodeURIComponent(classId),
    studentId: decodeURIComponent(studentId),
    topicId: body.topicId,
    mastery: body.mastery,
    note: typeof body.note === "string" ? body.note : ""
  });

  if (result.status !== "saved") {
    return NextResponse.json({ error: result.status }, { status: routeStatus(result.status) });
  }

  return NextResponse.json({ target: result.target });
}
