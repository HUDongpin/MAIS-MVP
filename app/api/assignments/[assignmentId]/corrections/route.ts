import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { recordAiGovernanceEvent, submitAssignmentWork } from "@/lib/server/userStore";
import { evaluateMediaStoragePolicy, imageDataUrlMediaDescriptor, mediaStoragePolicyFromEnv } from "@/lib/server/aiGovernance";
import {
  mediaObjectReferenceFromUnknown,
  readStoredMediaObject,
  type StoredMediaObjectReference
} from "@/lib/server/mediaObjectStore";
import type { AssignmentSubmissionInputType, AssignmentSubmissionOcrResult } from "@/types";

export const runtime = "nodejs";

function readInputType(value: unknown): AssignmentSubmissionInputType | undefined {
  return value === "text" || value === "image" || value === "handwriting" || value === "mixed" ? value : undefined;
}

async function mediaPolicyViolationResponse(imageDataUrl: unknown, userId: string) {
  if (typeof imageDataUrl !== "string") return null;
  const media = imageDataUrlMediaDescriptor(imageDataUrl);
  if (!media) return null;
  const decision = evaluateMediaStoragePolicy({
    policy: mediaStoragePolicyFromEnv(),
    capability: "assignment-image",
    media
  });
  if (decision.allowed) return null;
  await recordAiGovernanceEvent({
    userId,
    capability: "assignment-image",
    action: "media-policy-blocked",
    reason: decision.code,
    metadata: { code: decision.code }
  }).catch((error) => {
    console.error("Assignment correction media governance event recording failed", error instanceof Error ? error.name : typeof error);
  });
  return NextResponse.json(
    { code: decision.code, error: decision.message },
    { status: decision.code === "object-storage-required" ? 409 : 400 }
  );
}

function statusForMediaObjectRead(status: "not-found" | "forbidden" | "expired" | "rejected") {
  if (status === "forbidden") return 403;
  if (status === "expired") return 410;
  if (status === "rejected") return 503;
  return 404;
}

async function validateAssignmentImageObject(
  imageObject: unknown,
  user: { id: string; role: string }
): Promise<{ media?: StoredMediaObjectReference; response?: NextResponse }> {
  if (imageObject === undefined || imageObject === null || imageObject === "") return {};
  const media = mediaObjectReferenceFromUnknown(imageObject);
  if (!media || !media.objectKey.startsWith("assignment-image/")) {
    return { response: NextResponse.json({ error: "Assignment image object reference is invalid." }, { status: 400 }) };
  }

  const decision = evaluateMediaStoragePolicy({
    policy: mediaStoragePolicyFromEnv(),
    capability: "assignment-image",
    media
  });
  if (!decision.allowed) {
    await recordAiGovernanceEvent({
      userId: user.id,
      capability: "assignment-image",
      action: "media-policy-blocked",
      reason: decision.code,
      metadata: { code: decision.code }
    }).catch((error) => {
      console.error("Assignment correction object governance event recording failed", error instanceof Error ? error.name : typeof error);
    });
    return {
      response: NextResponse.json(
        { code: decision.code, error: decision.message },
        { status: 400 }
      )
    };
  }

  const stored = await readStoredMediaObject({
    objectKey: media.objectKey,
    requester: user
  });
  if (stored.status !== "ok") {
    await recordAiGovernanceEvent({
      userId: user.id,
      capability: "assignment-image",
      action: "media-policy-blocked",
      reason: stored.code,
      metadata: { code: stored.code }
    }).catch((error) => {
      console.error("Assignment correction object read governance event recording failed", error instanceof Error ? error.name : typeof error);
    });
    return {
      response: NextResponse.json(
        { code: stored.code, error: stored.message },
        { status: statusForMediaObjectRead(stored.status) }
      )
    };
  }

  return { media };
}

export async function POST(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    answerText?: unknown;
    imageDataUrl?: unknown;
    imageObject?: unknown;
    imageFileName?: unknown;
    inputType?: unknown;
    ocrResult?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid correction payload." }, { status: 400 });
  const mediaPolicyViolation = await mediaPolicyViolationResponse(body.imageDataUrl, authenticated.user.id);
  if (mediaPolicyViolation) return mediaPolicyViolation;
  const imageObjectValidation = await validateAssignmentImageObject(body.imageObject, authenticated.user);
  if (imageObjectValidation.response) return imageObjectValidation.response;

  const { assignmentId } = await params;
  const result = await submitAssignmentWork({
    userId: authenticated.user.id,
    assignmentId,
    kind: "correction",
    answerText: typeof body.answerText === "string" ? body.answerText : "",
    imageDataUrl: typeof body.imageDataUrl === "string" ? body.imageDataUrl : undefined,
    imageObject: imageObjectValidation.media,
    imageFileName: typeof body.imageFileName === "string" ? body.imageFileName : undefined,
    inputType: readInputType(body.inputType),
    ocrResult: body.ocrResult as AssignmentSubmissionOcrResult | null | undefined
  });

  if (result.status !== "submitted") {
    const status = result.status === "not-found" ? 404 : result.status === "closed" || result.status === "invalid-state" ? 409 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ submission: result.submission }, { status: 201 });
}
