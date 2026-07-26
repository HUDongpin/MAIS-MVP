import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import {
  getStudentAiTutorTranscriptForTeacher,
  recordAiTutorTranscriptAccess
} from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) {
    return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
  }

  const { studentId: rawStudentId } = await params;
  const studentId = decodeURIComponent(rawStudentId);
  const body = await request.json().catch(() => null) as { limit?: unknown } | null;
  const limit = typeof body?.limit === "number" && Number.isFinite(body.limit) ? body.limit : 50;

  const result = await getStudentAiTutorTranscriptForTeacher({
    userId: authenticated.user.id,
    studentId,
    limit
  });

  if (result.status === "forbidden") {
    return NextResponse.json({ error: "You do not have access to this student." }, { status: 403 });
  }
  if (result.status === "student-not-found") {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  // Reading a minor's AI conversation is a logged access event (compliance audit trail).
  await recordAiTutorTranscriptAccess({
    viewerId: authenticated.user.id,
    viewerName: authenticated.user.name,
    viewerRole: authenticated.user.role,
    studentId,
    studentName: result.studentName,
    messageCount: result.messages.length
  });

  return NextResponse.json({
    data: {
      studentId,
      studentName: result.studentName,
      messages: result.messages
    }
  });
}
