import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { withAuthRouteJsonBoundary } from "@/lib/server/authRouteGuards";
import { exportUserAccountData } from "@/lib/server/userStore";

export const runtime = "nodejs";

/** Subject-access request: everything the platform holds about the caller, as JSON. */
export async function GET(request: Request) {
  return withAuthRouteJsonBoundary("me-export", () => handleExport(request));
}

async function handleExport(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const data = await exportUserAccountData(authenticated.user.id);
  if (!data) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mais-data-export-${authenticated.user.id}.json"`,
      "Cache-Control": "no-store"
    }
  });
}
