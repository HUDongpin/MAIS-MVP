import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { addStudentToTeacherClass, getTeacherClassEnrollments } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId } = await params;
  const enrollments = await getTeacherClassEnrollments(authenticated.user.id, classId);
  if (!enrollments) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  return NextResponse.json({ enrollments });
}

export async function POST(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId } = await params;
  const body = await request.json().catch(() => null) as { username?: unknown } | null;
  if (!body || typeof body.username !== "string") {
    return NextResponse.json({ error: "Student username is required." }, { status: 400 });
  }

  const result = await addStudentToTeacherClass({
    teacherId: authenticated.user.id,
    classId,
    username: body.username
  });

  if (result.status !== "added") {
    const status = result.status === "forbidden"
      ? 403
      : result.status === "not-found" || result.status === "student-not-found"
        ? 404
        : result.status === "duplicate" || result.status === "curriculum-mismatch"
          ? 409
          : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
