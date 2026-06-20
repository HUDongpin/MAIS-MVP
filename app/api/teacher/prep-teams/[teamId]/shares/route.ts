import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createPrepTeamShare } from "@/lib/server/userStore";
import type { PrepTeamShareKind } from "@/types";

export const runtime = "nodejs";

const validKinds = new Set<PrepTeamShareKind>(["resource", "assessment", "lesson-kit", "note"]);

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { teamId } = await params;
  const body = await request.json().catch(() => null) as { kind?: unknown; title?: unknown; targetId?: unknown } | null;
  if (!body || !validKinds.has(body.kind as PrepTeamShareKind) || typeof body.title !== "string") {
    return NextResponse.json({ error: "Invalid prep team share payload." }, { status: 400 });
  }

  const result = await createPrepTeamShare({
    teacherId: authenticated.user.id,
    prepTeamId: decodeURIComponent(teamId),
    kind: body.kind as PrepTeamShareKind,
    title: body.title,
    targetId: typeof body.targetId === "string" && body.targetId ? body.targetId : null
  });

  if (result.status !== "created") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ share: result.share, team: result.team }, { status: 201 });
}
