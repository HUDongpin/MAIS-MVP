import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { backfillPostgresHotAuthTablesForAdmin } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (authenticated.user.role !== "admin") {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const result = await backfillPostgresHotAuthTablesForAdmin(authenticated.user.id);
  if (result.status === "forbidden") {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }
  if (result.status === "postgres-unavailable") {
    return NextResponse.json({ result }, { status: 503 });
  }
  if (result.status === "missing-postgres-url" || result.status === "not-postgres") {
    return NextResponse.json({ result }, { status: 409 });
  }

  return NextResponse.json({ result });
}
