import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createTeacherClass, getTeacherClasses } from "@/lib/server/userStore";
import type { GradeId } from "@/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const classes = await getTeacherClasses(authenticated.user.id);
  return NextResponse.json({ classes });
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    name?: unknown;
    grade?: unknown;
    academicYear?: unknown;
    description?: unknown;
  } | null;
  const grade = isValidGradeId(body?.grade) ? (body?.grade as GradeId) : null;
  if (!body || typeof body.name !== "string" || !grade || typeof body.academicYear !== "string") {
    return NextResponse.json({ error: "Invalid class payload." }, { status: 400 });
  }

  const result = await createTeacherClass({
    teacherId: authenticated.user.id,
    name: body.name,
    grade,
    academicYear: body.academicYear,
    description: typeof body.description === "string" ? body.description : ""
  });

  if (result.status !== "created") {
    return NextResponse.json({ error: result.status }, { status: result.status === "forbidden" ? 403 : 400 });
  }

  return NextResponse.json({ class: result.class }, { status: 201 });
}
