import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import {
  createClassForumThread,
  getForumWorkspaceData
} from "@/lib/server/userStore";
import type { ForumFilter, ForumThreadKind, ForumThreadMode } from "@/lib/forum";

export const runtime = "nodejs";

const validFilters = new Set<ForumFilter>(["all", "questions", "live", "resolved", "pinned"]);
const validModes = new Set<ForumThreadMode>(["async", "live"]);
const validKinds = new Set<ForumThreadKind>(["question", "strategy", "teacher-note"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const url = new URL(request.url);
  const requestedFilter = url.searchParams.get("filter");
  const data = await getForumWorkspaceData({
    userId: authenticated.user.id,
    classId: url.searchParams.get("classId"),
    filter: validFilters.has(requestedFilter as ForumFilter) ? requestedFilter as ForumFilter : "all",
    query: url.searchParams.get("query"),
    page: Number(url.searchParams.get("page") ?? 1),
    pageSize: Number(url.searchParams.get("pageSize") ?? 8)
  });

  if (!data) return NextResponse.json({ error: "Forum access is not available for this account." }, { status: 403 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!isRecord(body) || typeof body.classId !== "string") {
    return NextResponse.json({ error: "Invalid forum thread payload." }, { status: 400 });
  }

  const mode = validModes.has(body.mode as ForumThreadMode) ? body.mode as ForumThreadMode : "async";
  const kind = validKinds.has(body.kind as ForumThreadKind) ? body.kind as ForumThreadKind : "question";
  const result = await createClassForumThread({
    userId: authenticated.user.id,
    classId: body.classId,
    title: body.title,
    body: body.body,
    subject: body.subject,
    tags: body.tags,
    attachments: body.attachments,
    mode,
    kind
  });

  if (result.status === "created") return NextResponse.json({ thread: result.thread }, { status: 201 });
  if (result.status === "forbidden") return NextResponse.json({ error: "Forum posting is not allowed for this account." }, { status: 403 });
  if (result.status === "not-found") return NextResponse.json({ error: "Class forum not found." }, { status: 404 });
  return NextResponse.json({ error: "Add a title and explanation before posting." }, { status: 400 });
}
