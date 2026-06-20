import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getNovaLensPolicy, listNovaLensPolicyEventsForAdmin, updateNovaLensPolicy } from "@/lib/server/userStore";
import type { NovaLensPolicy } from "@/types";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readPolicyPatch(value: unknown): Partial<NovaLensPolicy> {
  if (!isRecord(value)) return {};

  return {
    ...(typeof value.enabled === "boolean" ? { enabled: value.enabled } : {}),
    ...(Array.isArray(value.allowedRoles) ? { allowedRoles: value.allowedRoles as NovaLensPolicy["allowedRoles"] } : {}),
    ...(Array.isArray(value.enabledSurfaces) ? { enabledSurfaces: value.enabledSurfaces as NovaLensPolicy["enabledSurfaces"] } : {}),
    ...(typeof value.maxSelectionLength === "number" ? { maxSelectionLength: value.maxSelectionLength } : {}),
    ...(typeof value.retentionDays === "number" ? { retentionDays: value.retentionDays } : {}),
    ...(Array.isArray(value.blockedPatterns) ? { blockedPatterns: value.blockedPatterns as string[] } : {})
  };
}

async function requireAdmin(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return { response: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  if (authenticated.user.role !== "admin") return { response: NextResponse.json({ error: "Admin role required." }, { status: 403 }) };
  return { authenticated };
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;

  const [policy, events] = await Promise.all([
    getNovaLensPolicy(),
    listNovaLensPolicyEventsForAdmin()
  ]);
  return NextResponse.json({ policy, events });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  return NextResponse.json(await updateNovaLensPolicy(admin.authenticated.user.id, readPolicyPatch(body)));
}
