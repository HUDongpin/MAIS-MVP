import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getStudentResourceDownloadData } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { resourceId } = await params;
  const download = await getStudentResourceDownloadData(authenticated.user.id, decodeURIComponent(resourceId));
  if (!download) return NextResponse.json({ error: "Resource not found." }, { status: 404 });

  return new NextResponse(download.bytes, {
    headers: {
      "Content-Type": download.mimeType,
      "Content-Disposition": `attachment; filename="${download.fileName.replace(/"/g, "")}"`
    }
  });
}

