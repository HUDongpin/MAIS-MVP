import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherResourceDownloadData } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { resourceId } = await params;
  const download = await getTeacherResourceDownloadData(authenticated.user.id, decodeURIComponent(resourceId));
  if (!download) return NextResponse.json({ error: "Resource not found." }, { status: 404 });

  return new NextResponse(download.bytes, {
    headers: {
      "Content-Type": download.mimeType,
      "Content-Disposition": `attachment; filename="${download.fileName.replace(/"/g, "")}"`
    }
  });
}

