import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { createStudentMessageThread, getStudentMessagesData } from "@/lib/server/userStore";
import type { TeacherMessagePriority } from "@/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const url = new URL(request.url);
  const data = await getStudentMessagesData(authenticated.user.id, url.searchParams.get("thread"));
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    classId?: unknown;
    assignmentId?: unknown;
    topicId?: unknown;
    subject?: unknown;
    body?: unknown;
    priority?: unknown;
  } | null;
  const priority: TeacherMessagePriority = body?.priority === "urgent" ? "urgent" : "normal";
  const result = await createStudentMessageThread({
    studentId: authenticated.user.id,
    classId: typeof body?.classId === "string" ? body.classId : null,
    assignmentId: typeof body?.assignmentId === "string" ? body.assignmentId : null,
    topicId: typeof body?.topicId === "string" ? body.topicId : null,
    subject: typeof body?.subject === "string" ? body.subject : "",
    body: typeof body?.body === "string" ? body.body : "",
    priority
  });

  if (result.status !== "created") {
    const status = result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ thread: result.thread }, { status: 201 });
}
