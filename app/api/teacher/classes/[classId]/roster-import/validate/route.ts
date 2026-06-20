import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { validateTeacherRosterImport } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId } = await params;
  const body = await request.json().catch(() => null) as { csvText?: unknown } | null;
  if (!body || typeof body.csvText !== "string") return NextResponse.json({ error: "csvText is required." }, { status: 400 });

  const result = await validateTeacherRosterImport({
    teacherId: authenticated.user.id,
    classId: decodeURIComponent(classId),
    csvText: body.csvText
  });

  if (result.status !== "validated") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ validation: result.validation });
}
