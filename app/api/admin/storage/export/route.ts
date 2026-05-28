import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { exportDatabaseSnapshotForAdmin } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const snapshot = await exportDatabaseSnapshotForAdmin(authenticated.user.id);
  if (!snapshot) {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  return NextResponse.json(snapshot);
}
