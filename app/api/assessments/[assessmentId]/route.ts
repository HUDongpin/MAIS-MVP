import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getStudentAssessmentDetailData } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { assessmentId } = await params;
  const data = await getStudentAssessmentDetailData(authenticated.user.id, decodeURIComponent(assessmentId));
  if (!data) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });

  return NextResponse.json({ data });
}

