import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { markStudentLearningPathStepComplete } from "@/lib/server/userStore";

export const runtime = "nodejs";

function routeStatus(status: string) {
  if (status === "forbidden") return 403;
  if (status === "not-found" || status === "step-not-found") return 404;
  if (status === "locked") return 409;
  return 400;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pathId: string; stepId: string }> }
) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { pathId, stepId } = await params;
  const result = await markStudentLearningPathStepComplete({
    studentId: authenticated.user.id,
    pathId: decodeURIComponent(pathId),
    stepId: decodeURIComponent(stepId)
  });

  if (result.status !== "completed") {
    return NextResponse.json({ error: result.status }, { status: routeStatus(result.status) });
  }

  return NextResponse.json({ path: result.path });
}
