import { NextResponse } from "next/server";
import { requireParentUser } from "@/lib/server/auth";
import { getParentChildSummary } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const authenticated = await requireParentUser(_request);
  if (!authenticated) return NextResponse.json({ error: "Parent access required." }, { status: 403 });

  const { studentId } = await params;
  const summary = await getParentChildSummary(authenticated.user.id, studentId);
  if (!summary) return NextResponse.json({ error: "Child summary unavailable." }, { status: 404 });

  return NextResponse.json({ summary });
}
