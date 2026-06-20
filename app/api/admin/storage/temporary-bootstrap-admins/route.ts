import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { cleanupTemporaryBootstrapAdminsForAdmin } from "@/lib/server/userStore";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readCleanupInput(body: unknown) {
  if (!isRecord(body)) return {};
  return {
    allowSelfRemoval: body.allowSelfRemoval === true,
    confirm: typeof body.confirm === "string" ? body.confirm : undefined,
    createdAfter: typeof body.createdAfter === "string" ? body.createdAfter : undefined,
    dryRun: body.dryRun === false ? false : true
  };
}

async function requireAdmin(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return { response: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }

  if (authenticated.user.role !== "admin") {
    return { response: NextResponse.json({ error: "Admin role required." }, { status: 403 }) };
  }

  return { authenticated };
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;

  const result = await cleanupTemporaryBootstrapAdminsForAdmin(admin.authenticated.user.id);
  return NextResponse.json({ result });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;

  const body = await request.json().catch(() => null);
  const result = await cleanupTemporaryBootstrapAdminsForAdmin(
    admin.authenticated.user.id,
    readCleanupInput(body)
  );

  if (result.status === "invalid-cutoff") {
    return NextResponse.json({ error: "Invalid createdAfter cutoff.", result }, { status: 400 });
  }

  if (result.status === "self-removal-requires-confirmation") {
    return NextResponse.json(
      {
        error: "Cleanup would remove the authenticated admin. Set allowSelfRemoval=true with the confirmation string.",
        result
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ result });
}
