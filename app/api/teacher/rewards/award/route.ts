import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { awardTeacherRewardPoints } from "@/lib/server/userStore";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!isRecord(body)) return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });

  const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
  const reasonPresetId = typeof body.reasonPresetId === "string" ? body.reasonPresetId.trim() : "";
  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
  const note = typeof body.note === "string" ? body.note : undefined;

  if (!studentId || !reasonPresetId || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "Invalid award payload." }, { status: 400 });
  }

  const result = await awardTeacherRewardPoints({
    teacherId: authenticated.user.id,
    studentId,
    amount,
    reasonPresetId,
    note
  });

  if (result.status === "awarded") return NextResponse.json({ rewards: result.rewards }, { status: 201 });
  if (result.status === "capped") return NextResponse.json({ error: "Daily teacher award cap reached.", rewards: result.rewards }, { status: 429 });
  if (result.status === "forbidden") return NextResponse.json({ error: result.status }, { status: 403 });
  if (result.status === "student-not-found") return NextResponse.json({ error: result.status }, { status: 404 });

  return NextResponse.json({ error: result.status }, { status: 400 });
}
