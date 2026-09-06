import { NextResponse } from "next/server";
import {
  expectedUserConstraintsFromRequest,
  guardExpectedAuthenticatedUser,
  requireAuthenticatedUser
} from "@/lib/server/auth";
import { readStoredMediaObject } from "@/lib/server/mediaObjectStore";

export const runtime = "nodejs";

const legacyAvatarPattern = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/]+=*)$/u;
const avatarMimeTypePattern = /^image\/(?:jpeg|png|webp)$/u;

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store",
  "CDN-Cache-Control": "private, no-store",
  "Pragma": "no-cache",
  "Vercel-CDN-Cache-Control": "private, no-store",
  "Vary": "Cookie",
  "X-Content-Type-Options": "nosniff"
} as const;

function privateJsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: privateNoStoreHeaders });
}

function privateImageResponse(bytes: Uint8Array, mimeType: string) {
  return new Response(bytes, {
    headers: {
      ...privateNoStoreHeaders,
      "Content-Length": String(bytes.byteLength),
      "Content-Type": mimeType
    }
  });
}

export async function GET(request: Request) {
  try {
    const authenticated = await requireAuthenticatedUser(request);
    if (!authenticated) {
      return privateJsonError("Not authenticated.", 401);
    }

    const expectedUserConflict = guardExpectedAuthenticatedUser(
      authenticated,
      expectedUserConstraintsFromRequest(request),
      { requireConstraint: true }
    );
    if (expectedUserConflict) return expectedUserConflict;

    const objectKey = authenticated.user.avatarImageObjectKey;
    if (objectKey) {
      const result = await readStoredMediaObject({
        objectKey,
        requester: { id: authenticated.user.id, role: authenticated.user.role }
      });
      if (result.status === "rejected") {
        return privateJsonError("Avatar is temporarily unavailable.", 503);
      }
      if (result.status !== "ok") {
        return privateJsonError("Avatar is unavailable.", 404);
      }
      if (!avatarMimeTypePattern.test(result.metadata.mimeType)) {
        return privateJsonError("Avatar is unavailable.", 404);
      }
      return privateImageResponse(new Uint8Array(result.bytes), result.metadata.mimeType);
    }

    const legacyAvatar = authenticated.user.avatarImageDataUrl?.match(legacyAvatarPattern);
    if (!legacyAvatar) {
      return privateJsonError("Avatar is unavailable.", 404);
    }

    const bytes = Buffer.from(legacyAvatar[2], "base64");
    if (bytes.byteLength === 0 || bytes.byteLength > 700_000) {
      return privateJsonError("Avatar is unavailable.", 404);
    }
    return privateImageResponse(new Uint8Array(bytes), legacyAvatar[1] === "image/jpg" ? "image/jpeg" : legacyAvatar[1]);
  } catch {
    return privateJsonError("Avatar is temporarily unavailable.", 503);
  }
}
