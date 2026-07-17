import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { deleteTeacherAssignment, getTeacherAssignmentDetailData } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { assignmentId } = await params;
  const assignment = await getTeacherAssignmentDetailData(authenticated.user.id, assignmentId);
  if (!assignment) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

  return NextResponse.json({ assignment });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { assignmentId } = await params;
  const result = await deleteTeacherAssignment({
    teacherId: authenticated.user.id,
    assignmentId
  });

  if (result.status !== "deleted") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({
    status: result.status,
    assignmentId: result.assignmentId,
    deletedSubmissionCount: result.deletedSubmissionCount
  });
}
