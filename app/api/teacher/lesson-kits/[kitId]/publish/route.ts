import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { publishTeacherLessonKit } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ kitId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { kitId } = await params;
  const result = await publishTeacherLessonKit({
    teacherId: authenticated.user.id,
    kitId: decodeURIComponent(kitId)
  });

  if (result.status !== "published") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : result.status === "needs-review" ? 409 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ result: result.result, kit: result.kit });
}
