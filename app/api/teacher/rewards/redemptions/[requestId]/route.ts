import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { updateTeacherRewardRedemption } from "@/lib/server/userStore";
import type { RewardRedemptionStatus } from "@/types";

export const runtime = "nodejs";

const validUpdateStatuses = new Set<RewardRedemptionStatus>(["approved", "rejected", "fulfilled"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { requestId } = await params;
  const body = await request.json().catch(() => null);
  if (!isRecord(body)) return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });

  const status = validUpdateStatuses.has(body.status as RewardRedemptionStatus)
    ? (body.status as RewardRedemptionStatus)
    : null;

  if (!requestId || !status) {
    return NextResponse.json({ error: "Invalid redemption update payload." }, { status: 400 });
  }

  const result = await updateTeacherRewardRedemption({
    teacherId: authenticated.user.id,
    requestId,
    status,
    teacherNote: typeof body.teacherNote === "string" ? body.teacherNote : undefined
  });

  if (result.status === "updated") return NextResponse.json({ rewards: result.rewards });
  if (result.status === "forbidden") return NextResponse.json({ error: result.status }, { status: 403 });
  if (result.status === "not-found") return NextResponse.json({ error: result.status }, { status: 404 });
  if (result.status === "invalid-transition" || result.status === "insufficient-points") {
    return NextResponse.json({ error: result.status }, { status: 409 });
  }

  return NextResponse.json({ error: result.status }, { status: 400 });
}
