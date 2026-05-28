import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { updateUserProfile } from "@/lib/server/userStore";
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

export async function PATCH(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const patch: Partial<{ name: string; avatarId: StudentAvatarId; avatarImageDataUrl: string | null }> = {};

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
      patch.avatarImageDataUrl = body.avatarImageDataUrl;
    } else {
      return NextResponse.json({ error: "Avatar image is invalid or too large." }, { status: 400 });
    }
  }

  const updated = await updateUserProfile(authenticated.user.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Could not update profile." }, { status: 400 });
  }

  return NextResponse.json({ user: updated.user, settings: updated.settings });
}
