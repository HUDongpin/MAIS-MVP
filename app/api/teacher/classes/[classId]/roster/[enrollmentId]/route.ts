import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { updateClassRosterProfile } from "@/lib/server/userStore";

export const runtime = "nodejs";

function nullableNumber(value: unknown) {
  if (value === null) return null;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ classId: string; enrollmentId: string }> }
) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId, enrollmentId } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });

  const result = await updateClassRosterProfile({
    teacherId: authenticated.user.id,
    classId: decodeURIComponent(classId),
    enrollmentId: decodeURIComponent(enrollmentId),
    studentNo: typeof body.studentNo === "string" ? body.studentNo : undefined,
    seatLabel: typeof body.seatLabel === "string" ? body.seatLabel : undefined,
    seatRow: nullableNumber(body.seatRow),
    seatColumn: nullableNumber(body.seatColumn),
    displayOrder: typeof body.displayOrder === "number" ? body.displayOrder : undefined
  });

  if (result.status !== "updated") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ roster: result.roster });
}
