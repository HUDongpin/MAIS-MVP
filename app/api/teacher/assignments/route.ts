import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createTeacherAssignment, getTeacherAssignments } from "@/lib/server/userStore";
import type { AssignmentContentType } from "@/types";

export const runtime = "nodejs";

const validContentTypes = new Set<AssignmentContentType>(["lesson", "practice", "visualization", "resource", "assessment"]);

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const assignments = await getTeacherAssignments(authenticated.user.id);
  return NextResponse.json({ assignments });
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    classId?: unknown;
    studentIds?: unknown;
    title?: unknown;
    description?: unknown;
    contentType?: unknown;
    targetId?: unknown;
    dueAt?: unknown;
    allowRetake?: unknown;
    showAnswers?: unknown;
    countTowardsGrade?: unknown;
  } | null;
  const contentType = validContentTypes.has(body?.contentType as AssignmentContentType)
    ? (body?.contentType as AssignmentContentType)
    : null;

  if (!body || typeof body.classId !== "string" || typeof body.title !== "string" || !contentType) {
    return NextResponse.json({ error: "Invalid assignment payload." }, { status: 400 });
  }

  const result = await createTeacherAssignment({
    teacherId: authenticated.user.id,
    classId: body.classId,
    studentIds: Array.isArray(body.studentIds) ? body.studentIds.filter((studentId): studentId is string => typeof studentId === "string") : undefined,
    title: body.title,
    description: typeof body.description === "string" ? body.description : "",
    contentType,
    targetId: typeof body.targetId === "string" ? body.targetId : undefined,
    dueAt: typeof body.dueAt === "string" && body.dueAt ? body.dueAt : null,
    allowRetake: Boolean(body.allowRetake),
    showAnswers: Boolean(body.showAnswers),
    countTowardsGrade: body.countTowardsGrade !== false
  });

  if (result.status !== "created") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ assignment: result.assignment }, { status: 201 });
}
