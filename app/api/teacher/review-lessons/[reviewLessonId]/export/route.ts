import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherReviewLessonExportData } from "@/lib/server/userStore";

export const runtime = "nodejs";

const validFormats = new Set(["json", "markdown", "pptx"]);
type ReviewLessonExportFormat = "json" | "markdown" | "pptx";

export async function GET(request: Request, { params }: { params: Promise<{ reviewLessonId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const url = new URL(request.url);
  const requestedFormat = url.searchParams.get("format") ?? "json";
  if (!validFormats.has(requestedFormat)) {
    return NextResponse.json({ error: "Unsupported export format." }, { status: 400 });
  }
  const format = requestedFormat as ReviewLessonExportFormat;
  const { reviewLessonId } = await params;
  const result = await getTeacherReviewLessonExportData(authenticated.user.id, decodeURIComponent(reviewLessonId), format);

  if (result.status === "forbidden") return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
  if (result.status === "not-found") return NextResponse.json({ error: "Review lesson not found." }, { status: 404 });

  return new NextResponse(result.bytes, {
    headers: {
      "Content-Type": result.mimeType,
      "Content-Disposition": `attachment; filename="${result.fileName}"`
    }
  });
}
