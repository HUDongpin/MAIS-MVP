import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherInboxData } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { threadId } = await params;
  const inbox = await getTeacherInboxData(authenticated.user.id, decodeURIComponent(threadId));
  const thread = inbox?.selectedThread;
  if (!thread) return NextResponse.json({ error: "Thread not found." }, { status: 404 });

  const latestMessage = thread.messages.at(-1);
  const studentName = thread.studentName ?? "there";
  const subject = thread.subject.en || thread.subject.zh || "your question";
  const draft = [
    `Hi ${studentName}, thanks for your message about ${subject}.`,
    latestMessage?.body ? `I have read your note: "${latestMessage.body.slice(0, 120)}".` : "I have read your note.",
    "Please show your first working step, and I will help you check the method before you continue."
  ].join(" ");

  return NextResponse.json({ draft });
}

