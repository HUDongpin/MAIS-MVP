import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getClassAiTutorPolicyForTeacher, updateClassAiTutorPolicy } from "@/lib/server/userStore";
import type { ClassAiTutorMode } from "@/types";

export const runtime = "nodejs";

const classAiTutorModeSet = new Set<ClassAiTutorMode>(["open", "limited", "fallback-only"]);

function readClassAiTutorMode(value: unknown): ClassAiTutorMode | null {
  return classAiTutorModeSet.has(value as ClassAiTutorMode) ? value as ClassAiTutorMode : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) {
    return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
  }

  const { classId } = await params;
  const result = await getClassAiTutorPolicyForTeacher(authenticated.user.id, decodeURIComponent(classId));
  if (!result) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  return NextResponse.json(result);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) {
    return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
  }

  const { classId } = await params;
  const body = await request.json().catch(() => null) as {
    mode?: unknown;
    perStudentHourLimit?: unknown;
    perStudentMinuteLimit?: unknown;
  } | null;
  const mode = readClassAiTutorMode(body?.mode);
  if (!body || !mode) {
    return NextResponse.json({ error: "Invalid AI Tutor policy payload." }, { status: 400 });
  }

  const result = await updateClassAiTutorPolicy({
    teacherId: authenticated.user.id,
    classId: decodeURIComponent(classId),
    mode,
    perStudentMinuteLimit: typeof body.perStudentMinuteLimit === "number" ? body.perStudentMinuteLimit : undefined,
    perStudentHourLimit: typeof body.perStudentHourLimit === "number" ? body.perStudentHourLimit : undefined
  });

  if (result.status !== "saved") {
    return NextResponse.json(
      { error: result.status },
      { status: result.status === "forbidden" ? 403 : 404 }
    );
  }

  return NextResponse.json({ canEdit: true, policy: result.policy });
}
