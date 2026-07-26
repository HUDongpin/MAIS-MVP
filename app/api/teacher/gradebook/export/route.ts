import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherGradebookCsv } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const classId = new URL(request.url).searchParams.get("classId")?.trim();
  if (!classId) return NextResponse.json({ error: "classId is required." }, { status: 400 });

  const csv = await getTeacherGradebookCsv({ teacherId: authenticated.user.id, classId });
  if (csv === null) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  return new NextResponse(csv, {
    headers: {
      "content-disposition": `attachment; filename="${classId}-gradebook.csv"`,
      "content-type": "text/csv; charset=utf-8"
    }
  });
}
