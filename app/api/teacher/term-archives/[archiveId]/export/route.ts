import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTermArchiveExport } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ archiveId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { archiveId } = await params;
  const exported = await getTermArchiveExport(authenticated.user.id, decodeURIComponent(archiveId));
  if (!exported) return NextResponse.json({ error: "Archive not found." }, { status: 404 });

  return new NextResponse(JSON.stringify(exported.payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${exported.fileName}"`
    }
  });
}
