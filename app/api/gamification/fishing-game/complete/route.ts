import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { completeFishingGame } from "@/lib/server/userStore";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : NaN;
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

  const result = await completeFishingGame({
    studentId: authenticated.user.id,
    topicId: typeof body.topicId === "string" ? body.topicId : "",
    roundQuestionIds: stringArray(body.roundQuestionIds),
    correctRoundQuestionIds: stringArray(body.correctRoundQuestionIds),
    caughtQuestionIds: stringArray(body.caughtQuestionIds),
    correctCaughtQuestionIds: stringArray(body.correctCaughtQuestionIds),
    coins: Math.round(numberValue(body.coins)),
    netsUsed: Math.round(numberValue(body.netsUsed)),
    durationSeconds: Math.round(numberValue(body.durationSeconds)),
    roundKey: typeof body.roundKey === "string" ? body.roundKey : ""
  });

  if (!result) return NextResponse.json({ error: "Fishing Game unavailable." }, { status: 404 });

  const statusCode = {
    awarded: 201,
    capped: 201,
    duplicate: 409,
    "not-eligible": 403,
    "invalid-run": 422
  }[result.status];

  return NextResponse.json(result, { status: statusCode });
}
