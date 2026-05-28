import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getStudentRewardsData } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (authenticated.user.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 403 });

  const rewards = await getStudentRewardsData(authenticated.user.id);
  if (!rewards) return NextResponse.json({ error: "Rewards unavailable." }, { status: 404 });

  return NextResponse.json({ rewards });
}
