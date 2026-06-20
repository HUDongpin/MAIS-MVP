import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherLessonKitDetailData, updateTeacherLessonKit } from "@/lib/server/userStore";
import type { TeacherLessonKitReviewStatus, TeacherLessonKitSection, TeacherLessonKitStatus } from "@/types";

export const runtime = "nodejs";

const validReviewStatuses = new Set<TeacherLessonKitReviewStatus>(["needs-review", "approved", "rejected"]);
const validStatuses = new Set<TeacherLessonKitStatus>(["draft", "generated", "reviewed", "published"]);

export async function GET(request: Request, { params }: { params: Promise<{ kitId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { kitId } = await params;
  const kit = await getTeacherLessonKitDetailData(authenticated.user.id, decodeURIComponent(kitId));
  if (!kit) return NextResponse.json({ error: "Lesson kit not found." }, { status: 404 });

  return NextResponse.json({ kit });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ kitId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { kitId } = await params;
  const body = await request.json().catch(() => null) as {
    sections?: unknown;
    reviewStatus?: unknown;
    status?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid lesson kit patch." }, { status: 400 });

  const reviewStatus = validReviewStatuses.has(body.reviewStatus as TeacherLessonKitReviewStatus)
    ? (body.reviewStatus as TeacherLessonKitReviewStatus)
    : undefined;
  const status = validStatuses.has(body.status as TeacherLessonKitStatus)
    ? (body.status as TeacherLessonKitStatus)
    : undefined;
  const sections = Array.isArray(body.sections) ? (body.sections as TeacherLessonKitSection[]) : undefined;

  const result = await updateTeacherLessonKit({
    teacherId: authenticated.user.id,
    kitId: decodeURIComponent(kitId),
    sections,
    reviewStatus,
    status
  });

  if (result.status !== "updated") {
    const statusCode = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status: statusCode });
  }

  return NextResponse.json({ kit: result.kit });
}
