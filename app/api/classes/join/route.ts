import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { joinClassByInviteCode } from "@/lib/server/userStore";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null) as unknown;
  if (!isRecord(body) || typeof body.inviteCode !== "string") {
    return NextResponse.json({ error: "Invite code is required." }, { status: 400 });
  }

  const result = await joinClassByInviteCode({
    studentId: authenticated.user.id,
    inviteCode: body.inviteCode
  });

  if (result.status === "forbidden") return NextResponse.json({ error: "Student access required." }, { status: 403 });
  if (result.status === "not-found") return NextResponse.json({ error: "Class invite code not found." }, { status: 404 });
  if (result.status === "invalid") return NextResponse.json({ error: "Invite code is required." }, { status: 400 });
  if (result.status === "curriculum-mismatch") return NextResponse.json({ error: "curriculum-mismatch" }, { status: 409 });

  return NextResponse.json(result);
}
