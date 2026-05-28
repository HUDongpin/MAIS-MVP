import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { updateRewardCampaign } from "@/lib/server/userStore";
import type { RewardCampaignStatus } from "@/types";

export const runtime = "nodejs";

const campaignStatuses = new Set<RewardCampaignStatus>(["draft", "active", "paused", "ended"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { campaignId } = await params;
  const body = await request.json().catch(() => null);
  if (!isRecord(body)) return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });

  const status = campaignStatuses.has(body.status as RewardCampaignStatus)
    ? (body.status as RewardCampaignStatus)
    : undefined;
  const budgetPoints = typeof body.budgetPoints === "number" ? body.budgetPoints : undefined;

  const result = await updateRewardCampaign({
    teacherId: authenticated.user.id,
    campaignId,
    status,
    budgetPoints
  });

  if (result.status === "updated") return NextResponse.json({ gamification: result.gamification });
  if (result.status === "forbidden") return NextResponse.json({ error: result.status }, { status: 403 });
  if (result.status === "not-found") return NextResponse.json({ error: result.status }, { status: 404 });

  return NextResponse.json({ error: result.status }, { status: 400 });
}
