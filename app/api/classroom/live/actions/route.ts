import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { evaluateMediaStoragePolicy, imageDataUrlMediaDescriptor, mediaStoragePolicyFromEnv } from "@/lib/server/aiGovernance";
import { mediaObjectReferenceFromUnknown, readStoredMediaObject } from "@/lib/server/mediaObjectStore";
import { recordAiGovernanceEvent, submitClassroomLiveAction } from "@/lib/server/userStore";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function statusForMediaObjectRead(status: "not-found" | "forbidden" | "expired" | "rejected") {
  if (status === "forbidden") return 403;
  if (status === "expired") return 410;
  if (status === "rejected") return 503;
  return 404;
}

async function workSampleMediaPolicyViolation(payload: unknown, user: { id: string; role: string }) {
  if (!isRecord(payload)) return null;

  if (typeof payload.imageDataUrl === "string") {
    const media = imageDataUrlMediaDescriptor(payload.imageDataUrl);
    if (media) {
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
          console.error("Classroom live action media governance event recording failed", error instanceof Error ? error.name : typeof error);
        });
        return NextResponse.json(
          { code: decision.code, error: decision.message },
          { status: decision.code === "object-storage-required" ? 409 : 400 }
        );
      }
    }
  }

  if (payload.imageObject !== undefined && payload.imageObject !== null && payload.imageObject !== "") {
    const media = mediaObjectReferenceFromUnknown(payload.imageObject);
    if (!media || !media.objectKey.startsWith("classroom-work-sample/")) {
      return NextResponse.json({ error: "Work sample image object reference is invalid." }, { status: 400 });
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
        console.error("Classroom live action object governance event recording failed", error instanceof Error ? error.name : typeof error);
      });
      return NextResponse.json(
        { code: decision.code, error: decision.message },
        { status: 400 }
      );
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
        console.error("Classroom live action object read governance event recording failed", error instanceof Error ? error.name : typeof error);
      });
      return NextResponse.json(
        { code: stored.code, error: stored.message },
        { status: statusForMediaObjectRead(stored.status) }
      );
    }
  }

  return null;
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (authenticated.user.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    sessionId?: unknown;
    action?: unknown;
    payload?: unknown;
  } | null;

  if (!body || typeof body.sessionId !== "string" || typeof body.action !== "string") {
    return NextResponse.json({ error: "Invalid classroom action payload." }, { status: 400 });
  }

  if (body.action === "work-sample-submit") {
    const mediaPolicyViolation = await workSampleMediaPolicyViolation(body.payload, authenticated.user);
    if (mediaPolicyViolation) return mediaPolicyViolation;
  }

  const result = await submitClassroomLiveAction({
    userId: authenticated.user.id,
    sessionId: body.sessionId,
    action: body.action,
    payload: body.payload
  });

  if (result.status !== "updated") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ session: result.session });
}
