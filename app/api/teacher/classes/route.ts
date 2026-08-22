import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createTeacherClass, ensureExampleTeacherProvisioned, getTeacherClasses } from "@/lib/server/userStore";
import { teacherWorkspaceCacheTag } from "@/app/teacher/getTeacherFoundation";
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

  const createInput = {
    teacherId: authenticated.user.id,
    name: body.name,
    grade,
    academicYear: body.academicYear,
    description: typeof body.description === "string" ? body.description : ""
  };
  let result = await createTeacherClass(createInput);

  if (result.status === "forbidden") {
    // The session authenticated through the storage-free example-account fallback,
    // but the mutable database has no user row for it yet. Provision the example
    // account and retry once so seeded teacher accounts can create classes.
    const provisioned = await ensureExampleTeacherProvisioned(authenticated.user.id);
    if (provisioned) {
      result = await createTeacherClass(createInput);
    }
  }

  if (result.status !== "created") {
    return NextResponse.json({ error: result.status }, { status: result.status === "forbidden" ? 403 : 400 });
  }

  // The teacher shell/foundation caches list the teacher's classes; drop them so
  // the new class shows up immediately instead of after the revalidate window.
  revalidateTag(teacherWorkspaceCacheTag, { expire: 0 });

  return NextResponse.json({ class: result.class }, { status: 201 });
}
