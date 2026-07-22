import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { deleteTeacherStudentGroup, updateTeacherStudentGroup } from "@/lib/server/userStore";

export const runtime = "nodejs";

function routeStatus(status: string) {
  if (status === "forbidden") return 403;
  if (status === "not-found") return 404;
  return 400;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ classId: string; groupId: string }> }
) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId, groupId } = await params;
  const body = await request.json().catch(() => null) as {
    name?: unknown;
    tier?: unknown;
    color?: unknown;
    note?: unknown;
    memberStudentIds?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid group payload." }, { status: 400 });

  const memberStudentIds = Array.isArray(body.memberStudentIds)
    ? body.memberStudentIds.filter((studentId): studentId is string => typeof studentId === "string")
    : undefined;

  const result = await updateTeacherStudentGroup({
    teacherId: authenticated.user.id,
    classId: decodeURIComponent(classId),
    groupId: decodeURIComponent(groupId),
    name: typeof body.name === "string" ? body.name : undefined,
    tier: typeof body.tier === "string" ? body.tier : undefined,
    color: typeof body.color === "string" ? body.color : undefined,
    note: typeof body.note === "string" ? body.note : undefined,
    memberStudentIds
  });

  if (result.status !== "saved") {
    return NextResponse.json({ error: result.status }, { status: routeStatus(result.status) });
  }

  return NextResponse.json({ group: result.group });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ classId: string; groupId: string }> }
) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId, groupId } = await params;
  const result = await deleteTeacherStudentGroup({
    teacherId: authenticated.user.id,
    classId: decodeURIComponent(classId),
    groupId: decodeURIComponent(groupId)
  });

  if (result.status !== "deleted") {
    return NextResponse.json({ error: result.status }, { status: routeStatus(result.status) });
  }

  return NextResponse.json({ groupId: result.groupId });
}
