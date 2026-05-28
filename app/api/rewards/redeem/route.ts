import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { requestRewardRedemption } from "@/lib/server/userStore";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (authenticated.user.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isRecord(body)) return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });

  const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
  if (!itemId) return NextResponse.json({ error: "Reward item is required." }, { status: 400 });

  const result = await requestRewardRedemption({
    studentId: authenticated.user.id,
    itemId
  });

  if (result.status === "created") return NextResponse.json({ rewards: result.rewards }, { status: 201 });
  if (result.status === "insufficient-points") {
    return NextResponse.json({ error: "Insufficient reward points.", rewards: result.rewards }, { status: 409 });
  }
  if (result.status === "student-not-found") return NextResponse.json({ error: "Student not found." }, { status: 404 });
  if (result.status === "item-unavailable") return NextResponse.json({ error: "Reward item unavailable." }, { status: 404 });

  return NextResponse.json({ error: "Could not create reward request." }, { status: 400 });
}
