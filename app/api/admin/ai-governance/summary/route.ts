import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { mediaStoragePolicyFromEnv } from "@/lib/server/aiGovernance";
import { getAiGovernanceSummaryForAdmin } from "@/lib/server/userStore";

export const runtime = "nodejs";

function boundedWindowMs(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 60 * 60 * 1000;
  return Math.min(7 * 24 * 60 * 60 * 1000, Math.max(5 * 60 * 1000, Math.round(parsed)));
}

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (authenticated.user.role !== "admin") {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const url = new URL(request.url);
  const summary = await getAiGovernanceSummaryForAdmin({
    adminId: authenticated.user.id,
    windowMs: boundedWindowMs(url.searchParams.get("windowMs"))
  });
  if (!summary) {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const mediaPolicy = mediaStoragePolicyFromEnv();
  return NextResponse.json({
    summary,
    mediaPolicy: {
      maxDataUrlBytes: mediaPolicy.maxDataUrlBytes,
      objectStorageRequired: mediaPolicy.objectStorageRequired,
      objectStoreConfigured: Boolean(process.env.AI_MEDIA_OBJECT_STORE_DIR?.trim()),
      requireEncryption: mediaPolicy.requireEncryption,
      encryptionKeyConfigured: Boolean(process.env.AI_MEDIA_ENCRYPTION_KEY?.trim()),
      requirePassedScan: mediaPolicy.requirePassedScan,
      retentionDays: mediaPolicy.retentionDays
    }
  });
}
