import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { updateLessonProgress } from "@/lib/server/userStore";

export const runtime = "nodejs";

function readChecklistState(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, checked]) => typeof key === "string" && typeof checked === "boolean")
      .map(([key, checked]) => [key, checked])
  );
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const record = body as {
    slug?: unknown;
    action?: unknown;
    durationSeconds?: unknown;
    checklistState?: unknown;
  } | null;
  const action = record?.action === "complete" || record?.action === "update" ? record.action : "start";
  const durationSeconds =
    typeof record?.durationSeconds === "number" && Number.isFinite(record.durationSeconds)
      ? record.durationSeconds
      : undefined;

  if (typeof record?.slug !== "string" || !record.slug.trim()) {
    return NextResponse.json({ error: "Lesson slug is required." }, { status: 400 });
  }

  const lesson = await updateLessonProgress({
    userId: authenticated.user.id,
    slug: record.slug,
    action,
    durationSeconds,
    checklistState: readChecklistState(record.checklistState),
    curriculumTrack: authenticated.user.curriculumProfile
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  }

  return NextResponse.json({ lesson });
}
