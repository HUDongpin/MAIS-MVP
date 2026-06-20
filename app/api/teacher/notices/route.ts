import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createTeacherNotice, getTeacherOperationsData } from "@/lib/server/userStore";
import type { TeacherNoticeAudience } from "@/types";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const validAudiences = new Set<TeacherNoticeAudience>(["parents", "students", "both"]);

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const url = new URL(request.url);
  const data = await getTeacherOperationsData(authenticated.user.id, url.searchParams.get("classId"));
  if (!data) return NextResponse.json({ error: "Teacher notices unavailable." }, { status: 404 });

  return NextResponse.json({ notices: data.notices });
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!isRecord(body)) return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });

  const audience = validAudiences.has(body.audience as TeacherNoticeAudience) ? (body.audience as TeacherNoticeAudience) : "parents";
  const result = await createTeacherNotice({
    teacherId: authenticated.user.id,
    classId: typeof body.classId === "string" ? body.classId : "",
    channelId: typeof body.channelId === "string" ? body.channelId : undefined,
    audience,
    subject: typeof body.subject === "string" ? body.subject : "",
    body: typeof body.body === "string" ? body.body : "",
    assignmentId: typeof body.assignmentId === "string" && body.assignmentId ? body.assignmentId : null,
    dueAt: typeof body.dueAt === "string" && body.dueAt ? body.dueAt : null
  });

  if (result.status !== "created") {
    const status = result.status === "forbidden" ? 403 : result.status === "assignment-not-found" || result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ notice: result.notice }, { status: 201 });
}
