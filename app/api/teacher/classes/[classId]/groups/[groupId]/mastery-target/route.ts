import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import {
  clearTeacherStudentGroupMasteryTarget,
  setTeacherStudentGroupMasteryTarget
} from "@/lib/server/userStore";

export const runtime = "nodejs";

function routeStatus(status: string) {
  if (status === "forbidden") return 403;
  if (status === "not-found" || status === "topic-not-found") return 404;
  return 400;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string; groupId: string }> }
) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId, groupId } = await params;
  const body = await request.json().catch(() => null) as { topicId?: unknown; mastery?: unknown; note?: unknown } | null;
  if (!body || typeof body.topicId !== "string") {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }
  if (typeof body.mastery !== "number" || !Number.isFinite(body.mastery)) {
    return NextResponse.json({ error: "Mastery must be a number from 0 to 100." }, { status: 400 });
  }

  const result = await setTeacherStudentGroupMasteryTarget({
    teacherId: authenticated.user.id,
    classId: decodeURIComponent(classId),
    groupId: decodeURIComponent(groupId),
    topicId: body.topicId,
    mastery: body.mastery,
    note: typeof body.note === "string" ? body.note : ""
  });

  if (result.status !== "saved") {
    return NextResponse.json({ error: result.status }, { status: routeStatus(result.status) });
  }

  return NextResponse.json({ group: result.group, appliedTo: result.appliedTo });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ classId: string; groupId: string }> }
) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId, groupId } = await params;
  const result = await clearTeacherStudentGroupMasteryTarget({
    teacherId: authenticated.user.id,
    classId: decodeURIComponent(classId),
    groupId: decodeURIComponent(groupId)
  });

  if (result.status !== "cleared") {
    return NextResponse.json({ error: result.status }, { status: routeStatus(result.status) });
  }

  return NextResponse.json({ group: result.group });
}
