import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { deleteTeacherLearningPath, updateTeacherLearningPath } from "@/lib/server/userStore";

export const runtime = "nodejs";

function routeStatus(status: string) {
  if (status === "forbidden") return 403;
  if (status === "not-found" || status === "group-not-found") return 404;
  return 400;
}

type StepInput = { kind?: unknown; targetId?: unknown; title?: unknown; description?: unknown };

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ classId: string; pathId: string }> }
) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId, pathId } = await params;
  const body = await request.json().catch(() => null) as {
    title?: unknown;
    description?: unknown;
    status?: unknown;
    groupId?: unknown;
    steps?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid path payload." }, { status: 400 });

  const result = await updateTeacherLearningPath({
    teacherId: authenticated.user.id,
    classId: decodeURIComponent(classId),
    pathId: decodeURIComponent(pathId),
    title: typeof body.title === "string" ? body.title : undefined,
    description: typeof body.description === "string" ? body.description : undefined,
    status: body.status === "active" || body.status === "archived" ? body.status : undefined,
    groupId: body.groupId === null ? null : typeof body.groupId === "string" ? body.groupId : undefined,
    steps: Array.isArray(body.steps) ? (body.steps as StepInput[]) : undefined
  });

  if (result.status !== "saved") {
    return NextResponse.json({ error: result.status }, { status: routeStatus(result.status) });
  }

  return NextResponse.json({ path: result.path });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ classId: string; pathId: string }> }
) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId, pathId } = await params;
  const result = await deleteTeacherLearningPath({
    teacherId: authenticated.user.id,
    classId: decodeURIComponent(classId),
    pathId: decodeURIComponent(pathId)
  });

  if (result.status !== "deleted") {
    return NextResponse.json({ error: result.status }, { status: routeStatus(result.status) });
  }

  return NextResponse.json({ pathId: result.pathId });
}
