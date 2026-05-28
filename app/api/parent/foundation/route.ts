import { NextResponse } from "next/server";
import { requireParentUser } from "@/lib/server/auth";
import { getParentFoundationData } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireParentUser(request);
  if (!authenticated) return NextResponse.json({ error: "Parent access required." }, { status: 403 });

  const url = new URL(request.url);
  const data = await getParentFoundationData(authenticated.user.id, url.searchParams.get("studentId"));
  if (!data) return NextResponse.json({ error: "Parent console unavailable." }, { status: 404 });

  return NextResponse.json({ data });
}
