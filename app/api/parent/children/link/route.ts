import { NextResponse } from "next/server";
import { requireParentUser } from "@/lib/server/auth";
import { linkParentToStudentByInviteCode } from "@/lib/server/userStore";
import type { GuardianRelationship } from "@/types";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const authenticated = await requireParentUser(request);
  if (!authenticated) return NextResponse.json({ error: "Parent access required." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  if (!isRecord(body)) return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });

  const result = await linkParentToStudentByInviteCode({
    parentId: authenticated.user.id,
    inviteCode: typeof body.inviteCode === "string" ? body.inviteCode : "",
    relationship: body.relationship as GuardianRelationship
  });

  if (result.status === "linked") return NextResponse.json({ link: result.link });
  const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
  return NextResponse.json({ error: "Could not link child." }, { status });
}
