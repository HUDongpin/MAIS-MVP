import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { teacherWorkspaceCacheTag } from "@/app/teacher/getTeacherFoundation";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import {
  listContentSafetyAlertsForViewer,
  updateContentSafetyFlagStatus
} from "@/lib/server/userStore";
import type { ContentSafetyFlagStatus } from "@/types";

export const runtime = "nodejs";

const statusFilters = new Set<ContentSafetyFlagStatus>(["new", "acknowledged", "resolved"]);
const updatableStatuses = new Set<Extract<ContentSafetyFlagStatus, "acknowledged" | "resolved">>([
  "acknowledged",
  "resolved"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!canAccessTeacherArea(authenticated.user)) {
    return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status = statusParam && statusFilters.has(statusParam as ContentSafetyFlagStatus)
    ? (statusParam as ContentSafetyFlagStatus)
    : undefined;
  const studentId = url.searchParams.get("studentId") || undefined;
  const limitParam = Number(url.searchParams.get("limit") ?? "");
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;

  const data = await listContentSafetyAlertsForViewer(authenticated.user.id, {
    ...(status ? { status } : {}),
    ...(studentId ? { studentId } : {}),
    ...(limit ? { limit } : {})
  });

  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!canAccessTeacherArea(authenticated.user)) {
    return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const flagId = typeof body.flagId === "string" ? body.flagId.trim() : "";
  const status = body.status as Extract<ContentSafetyFlagStatus, "acknowledged" | "resolved">;
  const note = typeof body.note === "string" ? body.note : undefined;

  if (!flagId) {
    return NextResponse.json({ error: "flagId is required." }, { status: 400 });
  }
  if (!updatableStatuses.has(status)) {
    return NextResponse.json({ error: "status must be acknowledged or resolved." }, { status: 400 });
  }

  const result = await updateContentSafetyFlagStatus({
    flagId,
    actorId: authenticated.user.id,
    status,
    ...(note ? { note } : {})
  });

  if (!result.ok) {
    if (result.reason === "not-found") {
      return NextResponse.json({ error: "Safety alert not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "You cannot update this safety alert." }, { status: 403 });
  }

  // Keep the nav badge / dashboard summary fresh after a resolution.
  revalidateTag(teacherWorkspaceCacheTag);

  return NextResponse.json({ flag: result.flag });
}
