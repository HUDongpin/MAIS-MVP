import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createTeacherAnalyticsFollowUpAssignment } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    classId?: unknown;
    studentIds?: unknown;
    title?: unknown;
    description?: unknown;
    targetId?: unknown;
  } | null;
  if (
    !body ||
    typeof body.classId !== "string" ||
    typeof body.title !== "string" ||
    !Array.isArray(body.studentIds) ||
    !body.studentIds.every((studentId) => typeof studentId === "string")
  ) {
    return NextResponse.json({ error: "Invalid follow-up payload." }, { status: 400 });
  }

  const result = await createTeacherAnalyticsFollowUpAssignment({
    teacherId: authenticated.user.id,
    classId: body.classId,
    studentIds: body.studentIds,
    title: body.title,
    description: typeof body.description === "string" ? body.description : "",
    targetId: typeof body.targetId === "string" ? body.targetId : undefined
  });

  if (result.status !== "created") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ assignment: result.assignment }, { status: 201 });
}
