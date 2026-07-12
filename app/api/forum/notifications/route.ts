import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { markForumNotificationsRead } from "@/lib/server/userStore";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function PATCH(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const payload = isRecord(body) ? body : {};
  const result = await markForumNotificationsRead({
    userId: authenticated.user.id,
    classId: typeof payload.classId === "string" ? payload.classId : undefined,
    notificationIds: payload.notificationIds
  });

  if (result.status === "updated") return NextResponse.json({ updated: result.updated });
  return NextResponse.json({ error: "Forum notifications are not available for this account." }, { status: 403 });
}
