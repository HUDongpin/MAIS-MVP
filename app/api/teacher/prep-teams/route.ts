import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createPrepTeam, getTeacherOperationsData } from "@/lib/server/userStore";
import type { GradeId } from "@/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const data = await getTeacherOperationsData(authenticated.user.id);
  if (!data) return NextResponse.json({ error: "Prep teams unavailable." }, { status: 404 });
  return NextResponse.json({ teams: data.prepTeams });
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    name?: unknown;
    description?: unknown;
    grade?: unknown;
    teacherIds?: unknown;
  } | null;
  const grade = isValidGradeId(body?.grade) ? (body?.grade as GradeId) : undefined;
  const result = await createPrepTeam({
    teacherId: authenticated.user.id,
    name: typeof body?.name === "string" ? body.name : "",
    description: typeof body?.description === "string" ? body.description : undefined,
    grade,
    teacherIds: Array.isArray(body?.teacherIds) ? body.teacherIds.filter((id): id is string => typeof id === "string") : undefined
  });

  if (result.status !== "created") {
    const status = result.status === "forbidden" ? 403 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ team: result.team }, { status: 201 });
}
