import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createRewardCampaign } from "@/lib/server/userStore";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!isRecord(body)) return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });

  const classId = typeof body.classId === "string" ? body.classId.trim() : "";
  const budgetPoints = typeof body.budgetPoints === "number" ? body.budgetPoints : Number(body.budgetPoints);
  if (!classId || !Number.isFinite(budgetPoints)) return NextResponse.json({ error: "Invalid campaign payload." }, { status: 400 });

  const result = await createRewardCampaign({
    teacherId: authenticated.user.id,
    classId,
    titleEn: typeof body.titleEn === "string" ? body.titleEn : undefined,
    titleZh: typeof body.titleZh === "string" ? body.titleZh : undefined,
    descriptionEn: typeof body.descriptionEn === "string" ? body.descriptionEn : undefined,
    descriptionZh: typeof body.descriptionZh === "string" ? body.descriptionZh : undefined,
    budgetPoints,
    questIds: stringArray(body.questIds),
    startsAt: typeof body.startsAt === "string" ? body.startsAt : undefined,
    endsAt: typeof body.endsAt === "string" ? body.endsAt : undefined
  });

  if (result.status === "created") return NextResponse.json({ gamification: result.gamification }, { status: 201 });
  if (result.status === "forbidden") return NextResponse.json({ error: result.status }, { status: 403 });
  if (result.status === "class-not-found") return NextResponse.json({ error: result.status }, { status: 404 });

  return NextResponse.json({ error: result.status }, { status: 400 });
}
