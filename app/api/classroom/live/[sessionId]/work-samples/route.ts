import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createClassroomWorkSample, recordAiGovernanceEvent, updateClassroomWorkSampleStatus } from "@/lib/server/userStore";
import { evaluateMediaStoragePolicy, imageDataUrlMediaDescriptor, mediaStoragePolicyFromEnv } from "@/lib/server/aiGovernance";
import {
  mediaObjectReferenceFromUnknown,
  readStoredMediaObject,
  type StoredMediaObjectReference
} from "@/lib/server/mediaObjectStore";
import type { ClassroomWorkSampleStatus } from "@/types";

export const runtime = "nodejs";

const validSampleStatuses = new Set<ClassroomWorkSampleStatus>(["submitted", "selected", "hidden"]);

async function mediaPolicyViolationResponse(imageDataUrl: unknown, userId: string) {
  if (typeof imageDataUrl !== "string") return null;
  const media = imageDataUrlMediaDescriptor(imageDataUrl);
  if (!media) return null;
  const decision = evaluateMediaStoragePolicy({
    policy: mediaStoragePolicyFromEnv(),
    capability: "classroom-work-sample",
    media
  });
  if (decision.allowed) return null;
  await recordAiGovernanceEvent({
    userId,
    capability: "classroom-work-sample",
    action: "media-policy-blocked",
    reason: decision.code,
    metadata: { code: decision.code }
  }).catch((error) => {
    console.error("Classroom work sample media governance event recording failed", error instanceof Error ? error.name : typeof error);
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

async function validateWorkSampleImageObject(
  imageObject: unknown,
  user: { id: string; role: string }
): Promise<{ media?: StoredMediaObjectReference; response?: NextResponse }> {
  if (imageObject === undefined || imageObject === null || imageObject === "") return {};
  const media = mediaObjectReferenceFromUnknown(imageObject);
  if (!media || !media.objectKey.startsWith("classroom-work-sample/")) {
    return { response: NextResponse.json({ error: "Work sample image object reference is invalid." }, { status: 400 }) };
  }

  const decision = evaluateMediaStoragePolicy({
    policy: mediaStoragePolicyFromEnv(),
    capability: "classroom-work-sample",
    media
  });
  if (!decision.allowed) {
    await recordAiGovernanceEvent({
      userId: user.id,
      capability: "classroom-work-sample",
      action: "media-policy-blocked",
      reason: decision.code,
      metadata: { code: decision.code }
    }).catch((error) => {
      console.error("Classroom work sample object governance event recording failed", error instanceof Error ? error.name : typeof error);
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
      capability: "classroom-work-sample",
      action: "media-policy-blocked",
      reason: stored.code,
      metadata: { code: stored.code }
    }).catch((error) => {
      console.error("Classroom work sample object read governance event recording failed", error instanceof Error ? error.name : typeof error);
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

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { sessionId } = await params;
  const body = await request.json().catch(() => null) as {
    imageDataUrl?: unknown;
    imageObject?: unknown;
    caption?: unknown;
    studentId?: unknown;
  } | null;
  if (!body || (typeof body.imageDataUrl !== "string" && !body.imageObject)) {
    return NextResponse.json({ error: "Invalid work sample payload." }, { status: 400 });
  }
  const mediaPolicyViolation = await mediaPolicyViolationResponse(body.imageDataUrl, authenticated.user.id);
  if (mediaPolicyViolation) return mediaPolicyViolation;
  const imageObjectValidation = await validateWorkSampleImageObject(body.imageObject, authenticated.user);
  if (imageObjectValidation.response) return imageObjectValidation.response;

  const result = await createClassroomWorkSample({
    userId: authenticated.user.id,
    sessionId: decodeURIComponent(sessionId),
    imageDataUrl: typeof body.imageDataUrl === "string" ? body.imageDataUrl : undefined,
    imageObject: imageObjectValidation.media,
    caption: typeof body.caption === "string" ? body.caption : undefined,
    studentId: typeof body.studentId === "string" ? body.studentId : undefined
  });

  if (result.status !== "created") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ sample: result.sample }, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { sessionId } = await params;
  const body = await request.json().catch(() => null) as {
    sampleId?: unknown;
    status?: unknown;
  } | null;
  if (!body || typeof body.sampleId !== "string" || !validSampleStatuses.has(body.status as ClassroomWorkSampleStatus)) {
    return NextResponse.json({ error: "Invalid work sample patch." }, { status: 400 });
  }

  const result = await updateClassroomWorkSampleStatus({
    teacherId: authenticated.user.id,
    sessionId: decodeURIComponent(sessionId),
    sampleId: body.sampleId,
    status: body.status as ClassroomWorkSampleStatus
  });

  if (result.status !== "updated") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ samples: result.samples });
}
