import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherOperationsData, upsertTeacherClassCollaborator } from "@/lib/server/userStore";
import type { TeacherClassCollaboratorRole } from "@/types";

export const runtime = "nodejs";

const validRoles = new Set<TeacherClassCollaboratorRole>(["co-teacher", "viewer"]);

export async function GET(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId } = await params;
  const data = await getTeacherOperationsData(authenticated.user.id, decodeURIComponent(classId));
  if (!data) return NextResponse.json({ error: "Collaborators unavailable." }, { status: 404 });
  return NextResponse.json({ collaborators: data.collaborators });
}

export async function POST(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId } = await params;
  const body = await request.json().catch(() => null) as { teacherUsername?: unknown; role?: unknown } | null;
  if (!body || typeof body.teacherUsername !== "string" || !validRoles.has(body.role as TeacherClassCollaboratorRole)) {
    return NextResponse.json({ error: "Invalid collaborator payload." }, { status: 400 });
  }

  const result = await upsertTeacherClassCollaborator({
    teacherId: authenticated.user.id,
    classId: decodeURIComponent(classId),
    teacherUsername: body.teacherUsername,
    role: body.role as Exclude<TeacherClassCollaboratorRole, "owner">
  });

  if (result.status !== "saved") {
    const status = result.status === "forbidden" ? 403 : result.status === "teacher-not-found" ? 404 : result.status === "school-mismatch" || result.status === "owner" ? 409 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ collaborator: result.collaborator }, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ classId: string }> }) {
  return POST(request, context);
}
