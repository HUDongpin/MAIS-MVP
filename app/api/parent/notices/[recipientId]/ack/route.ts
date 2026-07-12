import { NextResponse } from "next/server";
import { requireParentUser } from "@/lib/server/auth";
import { acknowledgeParentNotice } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ recipientId: string }> }) {
  const authenticated = await requireParentUser(request);
  if (!authenticated) return NextResponse.json({ error: "Parent access required." }, { status: 403 });

  const { recipientId } = await params;
  const result = await acknowledgeParentNotice({
    parentId: authenticated.user.id,
    recipientId: decodeURIComponent(recipientId)
  });

  if (result.status !== "acknowledged") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ notice: result.notice });
}
