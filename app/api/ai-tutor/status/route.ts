import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { providerPolicyRegionForUser } from "@/lib/aiProviderCompanyPolicy";
import { readRegionScopedAITutorProviderStatus } from "@/lib/server/regionScopedProviders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request).catch(() => null);
  return NextResponse.json(readRegionScopedAITutorProviderStatus(
    authenticated ? providerPolicyRegionForUser(authenticated.user) : null
  ), { headers: { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" } });
}
