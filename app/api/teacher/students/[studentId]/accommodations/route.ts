import { NextResponse } from "next/server";
import { normalizeStudentAccommodations } from "@/lib/accommodations";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import {
  getStudentAccommodationsProfileForTeacher,
  setStudentAccommodationsForTeacher
} from "@/lib/server/userStore";

export const runtime = "nodejs";

function routeStatus(status: "forbidden" | "student-not-found") {
  return status === "student-not-found" ? 404 : 403;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) {
    return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
  }

  const { studentId } = await params;
  const result = await getStudentAccommodationsProfileForTeacher(authenticated.user.id, decodeURIComponent(studentId));
  if (result.status !== "ok") {
    return NextResponse.json({ error: result.status }, { status: routeStatus(result.status) });
  }

  return NextResponse.json({ profile: result.profile });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) {
    return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
  }

  const { studentId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "An accommodations profile is required." }, { status: 400 });
  }

  // The editor always submits the full profile; normalize defensively so a
  // malformed or partial payload can never widen past the allowed settings.
  const accommodations = normalizeStudentAccommodations(body);
  const result = await setStudentAccommodationsForTeacher({
    teacherId: authenticated.user.id,
    studentId: decodeURIComponent(studentId),
    accommodations
  });

  if (result.status !== "ok") {
    return NextResponse.json({ error: result.status }, { status: routeStatus(result.status) });
  }

  return NextResponse.json({ profile: result.profile });
}
