import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getStudentResourceDetailData, markStudentResourceViewed } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { resourceId } = await params;
  const data = await getStudentResourceDetailData(authenticated.user.id, decodeURIComponent(resourceId));
  if (!data) return NextResponse.json({ error: "Resource not found." }, { status: 404 });

  return NextResponse.json({ data });
}

export async function POST(request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { resourceId } = await params;
  const result = await markStudentResourceViewed(authenticated.user.id, decodeURIComponent(resourceId));
  if (result.status === "not-found") return NextResponse.json({ error: "Resource not found." }, { status: 404 });

  return NextResponse.json({ resource: result.resource });
}

