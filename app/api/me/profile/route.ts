import { NextResponse } from "next/server";
import {
  bodyExpectedUserConstraints,
  expectedUserConstraintsFromRequest,
  guardExpectedAuthenticatedUser,
  requireAuthenticatedUser
} from "@/lib/server/auth";
import { recordAiGovernanceEvent, updateUserProfile } from "@/lib/server/userStore";
import { evaluateMediaStoragePolicy, imageDataUrlMediaDescriptor, mediaStoragePolicyFromEnv } from "@/lib/server/aiGovernance";
import {
  mediaObjectReferenceFromUnknown,
  readStoredMediaObject,
  type StoredMediaObjectReference
} from "@/lib/server/mediaObjectStore";
import type { StudentAvatarId } from "@/types";

export const runtime = "nodejs";

const validAvatarIds = new Set<StudentAvatarId>(["delta", "pi", "sigma", "theta", "function", "radical"]);
const maxAvatarImageDataUrlLength = 900_000;
const avatarImageDataUrlPattern = /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidAvatarImageDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= maxAvatarImageDataUrlLength &&
    avatarImageDataUrlPattern.test(value)
  );
}

function statusForMediaObjectRead(status: "not-found" | "forbidden" | "expired" | "rejected") {
  if (status === "forbidden") return 403;
  if (status === "expired") return 410;
  if (status === "rejected") return 503;
  return 404;
}

export async function PATCH(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const transportExpectedUserConflict = guardExpectedAuthenticatedUser(
    authenticated,
    expectedUserConstraintsFromRequest(request)
  );
  if (transportExpectedUserConflict) return transportExpectedUserConflict;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const expectedUserConflict = guardExpectedAuthenticatedUser(
      authenticated,
      expectedUserConstraintsFromRequest(request),
      { requireConstraint: true }
    );
    if (expectedUserConflict) return expectedUserConflict;
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const expectedUserConflict = guardExpectedAuthenticatedUser(
    authenticated,
    [
      ...expectedUserConstraintsFromRequest(request),
      ...bodyExpectedUserConstraints(body)
    ],
    { requireConstraint: true }
  );
  if (expectedUserConflict) return expectedUserConflict;

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const hasAvatarImageDataUrlValue =
    "avatarImageDataUrl" in body &&
    body.avatarImageDataUrl !== null &&
    body.avatarImageDataUrl !== "";
  const hasAvatarImageObjectValue =
    "avatarImageObject" in body &&
    body.avatarImageObject !== null &&
    body.avatarImageObject !== "";
  if (hasAvatarImageDataUrlValue && hasAvatarImageObjectValue) {
    return NextResponse.json(
      { error: "Choose either an avatar image data URL or an avatar image object, not both." },
      { status: 400 }
    );
  }

  const patch: Partial<{
    name: string;
    avatarId: StudentAvatarId;
    avatarImageDataUrl: string | null;
    avatarImageObject: StoredMediaObjectReference | null;
  }> = {};

  if ("name" in body) {
    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "Profile name must be text." }, { status: 400 });
    }
    patch.name = body.name;
  }

  if ("avatarId" in body) {
    if (!validAvatarIds.has(body.avatarId as StudentAvatarId)) {
      return NextResponse.json({ error: "Avatar choice is invalid." }, { status: 400 });
    }
    patch.avatarId = body.avatarId as StudentAvatarId;
  }

  if ("avatarImageDataUrl" in body) {
    if (body.avatarImageDataUrl === null || body.avatarImageDataUrl === "") {
      patch.avatarImageDataUrl = null;
    } else if (isValidAvatarImageDataUrl(body.avatarImageDataUrl)) {
      const media = imageDataUrlMediaDescriptor(body.avatarImageDataUrl);
      const storageDecision = media
        ? evaluateMediaStoragePolicy({
            policy: mediaStoragePolicyFromEnv(),
            capability: "profile-avatar",
            media
          })
        : null;
      if (!storageDecision?.allowed) {
        await recordAiGovernanceEvent({
          userId: authenticated.user.id,
          capability: "profile-avatar",
          action: "media-policy-blocked",
          reason: storageDecision?.code ?? "media-object-reference-invalid",
          metadata: {
            code: storageDecision?.code ?? "media-object-reference-invalid"
          }
        }).catch((error) => {
          console.error("Avatar media governance event recording failed", error instanceof Error ? error.name : typeof error);
        });
        return NextResponse.json(
          {
            code: storageDecision?.code ?? "media-object-reference-invalid",
            error: storageDecision?.message ?? "Avatar image storage policy could not validate this upload."
          },
          { status: storageDecision?.code === "object-storage-required" ? 409 : 400 }
        );
      }
      patch.avatarImageDataUrl = body.avatarImageDataUrl;
    } else {
      return NextResponse.json({ error: "Avatar image is invalid or too large." }, { status: 400 });
    }
  }

  if ("avatarImageObject" in body) {
    if (body.avatarImageObject === null || body.avatarImageObject === "") {
      patch.avatarImageObject = null;
    } else {
      const media = mediaObjectReferenceFromUnknown(body.avatarImageObject);
      if (!media || !media.objectKey.startsWith("profile-avatar/")) {
        return NextResponse.json({ error: "Avatar image object reference is invalid." }, { status: 400 });
      }

      const storageDecision = evaluateMediaStoragePolicy({
        policy: mediaStoragePolicyFromEnv(),
        capability: "profile-avatar",
        media
      });
      if (!storageDecision.allowed) {
        await recordAiGovernanceEvent({
          userId: authenticated.user.id,
          capability: "profile-avatar",
          action: "media-policy-blocked",
          reason: storageDecision.code,
          metadata: { code: storageDecision.code }
        }).catch((error) => {
          console.error("Avatar object governance event recording failed", error instanceof Error ? error.name : typeof error);
        });
        return NextResponse.json(
          { code: storageDecision.code, error: storageDecision.message },
          { status: 400 }
        );
      }

      const stored = await readStoredMediaObject({
        objectKey: media.objectKey,
        requester: {
          id: authenticated.user.id,
          role: authenticated.user.role
        }
      });
      if (stored.status !== "ok") {
        await recordAiGovernanceEvent({
          userId: authenticated.user.id,
          capability: "profile-avatar",
          action: "media-policy-blocked",
          reason: stored.code,
          metadata: { code: stored.code }
        }).catch((error) => {
          console.error("Avatar object read governance event recording failed", error instanceof Error ? error.name : typeof error);
        });
        return NextResponse.json(
          { code: stored.code, error: stored.message },
          { status: statusForMediaObjectRead(stored.status) }
        );
      }

      patch.avatarImageObject = media;
    }
  }

  const updated = await updateUserProfile(authenticated.user.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Could not update profile." }, { status: 400 });
  }

  return NextResponse.json({ user: updated.user, settings: updated.settings });
}
