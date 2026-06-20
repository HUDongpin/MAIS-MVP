import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { aiCapabilityRateLimitRulesFromEnv, type AiCapability } from "@/lib/server/aiGovernance";
import {
  mediaObjectReferenceFromUnknown,
  storeMediaObjectFromDataUrl
} from "@/lib/server/mediaObjectStore";
import { consumeAiCapabilityRateLimit, recordAiGovernanceEvent } from "@/lib/server/userStore";

export const runtime = "nodejs";

const uploadCapabilities = new Set<AiCapability>([
  "ai-tutor-ocr",
  "profile-avatar",
  "assignment-image",
  "classroom-work-sample"
]);

function readUploadCapability(value: unknown): AiCapability | null {
  return typeof value === "string" && uploadCapabilities.has(value as AiCapability)
    ? value as AiCapability
    : null;
}

function statusForStorageRejection(code: string) {
  if (code === "media-too-large") return 413;
  if (code === "media-scan-failed") return 422;
  if (code === "media-encryption-key-missing") return 503;
  if (code === "media-write-failed") return 500;
  return 400;
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    capability?: unknown;
    dataUrl?: unknown;
  } | null;
  if (!body || typeof body.dataUrl !== "string") {
    return NextResponse.json({ error: "Media upload payload must include a dataUrl." }, { status: 400 });
  }

  const capability = readUploadCapability(body.capability);
  if (!capability) {
    return NextResponse.json({ error: "Media upload capability is invalid." }, { status: 400 });
  }

  const rateLimit = await consumeAiCapabilityRateLimit({
    userId: authenticated.user.id,
    capability,
    rules: aiCapabilityRateLimitRulesFromEnv(capability)
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Media upload rate limit reached." },
      {
        status: 429,
        headers: {
          "RateLimit-Remaining": String(rateLimit.remaining),
          "RateLimit-Reset": String(Math.ceil(rateLimit.resetAt.getTime() / 1000)),
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const stored = await storeMediaObjectFromDataUrl({
    capability,
    dataUrl: body.dataUrl,
    ownerId: authenticated.user.id
  });
  if (stored.status !== "stored") {
    await recordAiGovernanceEvent({
      userId: authenticated.user.id,
      capability,
      action: "media-policy-blocked",
      reason: stored.code,
      metadata: { code: stored.code }
    }).catch((error) => {
      console.error("Media object governance event recording failed", error instanceof Error ? error.name : typeof error);
    });
    return NextResponse.json(
      { code: stored.code, error: stored.message },
      { status: statusForStorageRejection(stored.code) }
    );
  }

  const media = mediaObjectReferenceFromUnknown(stored.media);
  return NextResponse.json(
    {
      accessUrl: stored.accessUrl,
      media,
      retentionExpiresAt: stored.media.retentionExpiresAt
    },
    { status: 201 }
  );
}
