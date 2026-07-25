import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createTeacherLearningPath } from "@/lib/server/userStore";

export const runtime = "nodejs";

function routeStatus(status: string) {
  if (status === "forbidden") return 403;
  if (status === "not-found" || status === "group-not-found") return 404;
  return 400;
}

type StepInput = { kind?: unknown; targetId?: unknown; title?: unknown; description?: unknown };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId } = await params;
  const body = await request.json().catch(() => null) as {
    title?: unknown;
    description?: unknown;
    groupId?: unknown;
    steps?: unknown;
  } | null;
  if (!body || typeof body.title !== "string") {
    return NextResponse.json({ error: "Path title is required." }, { status: 400 });
  }
  const steps = Array.isArray(body.steps) ? (body.steps as StepInput[]) : [];

  const result = await createTeacherLearningPath({
    teacherId: authenticated.user.id,
    classId: decodeURIComponent(classId),
    title: body.title,
    description: typeof body.description === "string" ? body.description : undefined,
    groupId: typeof body.groupId === "string" ? body.groupId : undefined,
    steps
  });

  if (result.status !== "created") {
    return NextResponse.json({ error: result.status }, { status: routeStatus(result.status) });
  }

  return NextResponse.json({ path: result.path }, { status: 201 });
}
