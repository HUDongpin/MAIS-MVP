import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { runTeacherMissingWorkReminders } from "@/lib/server/userStore";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (body !== null && !isRecord(body)) return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  const url = new URL(request.url);
  const result = await runTeacherMissingWorkReminders({
    teacherId: authenticated.user.id,
    classId: typeof body?.classId === "string" ? body.classId : null,
    assignmentId: typeof body?.assignmentId === "string" ? body.assignmentId : null,
    manual: typeof body?.manual === "boolean" ? body.manual : false,
    origin: url.origin
  });

  if (result.status !== "ran") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ runs: result.runs });
}
