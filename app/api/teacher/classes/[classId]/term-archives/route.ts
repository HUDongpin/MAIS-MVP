import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createTermArchive, getTeacherOperationsData } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId } = await params;
  const data = await getTeacherOperationsData(authenticated.user.id, decodeURIComponent(classId));
  if (!data) return NextResponse.json({ error: "Term archives unavailable." }, { status: 404 });
  return NextResponse.json({ archives: data.termArchives });
}

export async function POST(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId } = await params;
  const body = await request.json().catch(() => null) as { termLabel?: unknown } | null;
  const result = await createTermArchive({
    teacherId: authenticated.user.id,
    classId: decodeURIComponent(classId),
    termLabel: typeof body?.termLabel === "string" ? body.termLabel : ""
  });

  if (result.status !== "created") {
    const status = result.status === "forbidden" ? 403 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ archive: result.archive }, { status: 201 });
}
