import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { completeAdventureIsland, getAdventureIslandEligibility } from "@/lib/server/userStore";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function searchParamArray(url: URL, name: string) {
  return url.searchParams
    .getAll(name)
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (authenticated.user.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 403 });

  const url = new URL(request.url);
  const eligibility = await getAdventureIslandEligibility(authenticated.user.id, {
    topicId: url.searchParams.get("topicId") ?? undefined,
    roundKey: url.searchParams.get("roundKey") ?? undefined,
    roundQuestionIds: searchParamArray(url, "roundQuestionIds"),
    correctRoundQuestionIds: searchParamArray(url, "correctRoundQuestionIds")
  });
  if (!eligibility) return NextResponse.json({ error: "Adventure Island unavailable." }, { status: 404 });

  return NextResponse.json(eligibility);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!isRecord(body)) return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });

  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (authenticated.user.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 403 });

  const result = await completeAdventureIsland({
    studentId: authenticated.user.id,
    topicId: typeof body.topicId === "string" ? body.topicId : "",
    roundKey: typeof body.roundKey === "string" ? body.roundKey : "",
    roundQuestionIds: stringArray(body.roundQuestionIds),
    correctRoundQuestionIds: stringArray(body.correctRoundQuestionIds),
    correctQuestionIds: stringArray(body.correctQuestionIds),
    durationSeconds: typeof body.durationSeconds === "number" ? body.durationSeconds : 0,
    defeatedEnemies: typeof body.defeatedEnemies === "number" ? body.defeatedEnemies : 0,
    ...(typeof body.livesRemaining === "number" ? { livesRemaining: body.livesRemaining } : {})
  });

  if (!result) return NextResponse.json({ error: "Adventure Island unavailable." }, { status: 404 });

  const statusCode = {
    awarded: 201,
    capped: 201,
    duplicate: 409,
    "not-eligible": 403,
    "invalid-run": 422
  }[result.status];

  return NextResponse.json(result, { status: statusCode });
}
