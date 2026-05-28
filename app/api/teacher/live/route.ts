import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { endTeacherLiveSession, getTeacherLiveData, startTeacherLiveSession } from "@/lib/server/userStore";
import type { TeacherLivePromptType } from "@/types";

export const runtime = "nodejs";

const validPromptTypes = new Set<TeacherLivePromptType>(["poll", "exit-ticket"]);

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const live = await getTeacherLiveData(authenticated.user.id);
  if (!live) return NextResponse.json({ error: "Live classroom unavailable." }, { status: 404 });

  return NextResponse.json({ live });
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    classId?: unknown;
    promptType?: unknown;
    question?: unknown;
    correctOptionId?: unknown;
    topicId?: unknown;
  } | null;
  const promptType = validPromptTypes.has(body?.promptType as TeacherLivePromptType)
    ? (body?.promptType as TeacherLivePromptType)
    : null;
  if (!body || typeof body.classId !== "string" || typeof body.question !== "string" || !promptType) {
    return NextResponse.json({ error: "Invalid live session payload." }, { status: 400 });
  }

  const result = await startTeacherLiveSession({
    teacherId: authenticated.user.id,
    classId: body.classId,
    promptType,
    question: body.question,
    correctOptionId: typeof body.correctOptionId === "string" ? body.correctOptionId : undefined,
    topicId: typeof body.topicId === "string" ? body.topicId : undefined
  });
  if (result.status !== "started") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ session: result.session }, { status: 201 });
}

export async function PATCH(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as { sessionId?: unknown; status?: unknown } | null;
  if (!body || typeof body.sessionId !== "string" || body.status !== "ended") {
    return NextResponse.json({ error: "Invalid live session patch." }, { status: 400 });
  }

  const result = await endTeacherLiveSession({
    teacherId: authenticated.user.id,
    sessionId: body.sessionId
  });
  if (result.status !== "ended") {
    return NextResponse.json({ error: result.status }, { status: result.status === "forbidden" ? 403 : 404 });
  }

  return NextResponse.json({ session: result.session });
}
