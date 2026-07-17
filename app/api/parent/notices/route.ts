import { NextResponse } from "next/server";
import { requireParentUser } from "@/lib/server/auth";
import { getParentNoticeData } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireParentUser(request);
  if (!authenticated) return NextResponse.json({ error: "Parent access required." }, { status: 403 });

  const url = new URL(request.url);
  const data = await getParentNoticeData(authenticated.user.id, {
    selectedStudentId: url.searchParams.get("studentId"),
    recipientId: url.searchParams.get("recipientId")
  });
  if (!data) return NextResponse.json({ error: "Parent notices unavailable." }, { status: 404 });

  return NextResponse.json({ data });
}
