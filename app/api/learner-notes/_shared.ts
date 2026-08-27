import { NextResponse } from "next/server";
import {
  bodyExpectedUserConstraints,
  expectedUserConstraintsFromRequest,
  guardExpectedAuthenticatedUser,
  requireAuthenticatedUser
} from "@/lib/server/auth";

export const learnerNotePrivateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "private, no-store",
  "Vercel-CDN-Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie"
};

export function guardLearnerNoteExpectedOwner(
  authenticated: { user: { id: string } },
  request: Request,
  body?: unknown
) {
  return guardExpectedAuthenticatedUser(
    authenticated,
    [...expectedUserConstraintsFromRequest(request), ...bodyExpectedUserConstraints(body)],
    { requireConstraint: true }
  );
}

export async function requireLearnerNoteOwner(request: Request, body?: unknown) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return { response: NextResponse.json({ error: "Not authenticated." }, { status: 401, headers: learnerNotePrivateHeaders }) } as const;
  }
  if (authenticated.user.role !== "student") {
    return { response: NextResponse.json({ error: "Student access required." }, { status: 403, headers: learnerNotePrivateHeaders }) } as const;
  }
  const expectedConflict = guardLearnerNoteExpectedOwner(authenticated, request, body);
  if (expectedConflict) return { response: expectedConflict } as const;
  return { authenticated } as const;
}

export function learnerNoteJson(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(body, {
    status: init.status,
    headers: { ...learnerNotePrivateHeaders, ...init.headers }
  });
}

export async function readLearnerNoteBody(request: Request): Promise<
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 32_768) {
    return { ok: false, error: "Request body is too large." };
  }
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: "A JSON object is required." };
    }
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return { ok: false, error: "Invalid JSON body." };
  }
}

export function learnerNotePayloadHasForbiddenOwnership(body: Record<string, unknown>) {
  return Object.prototype.hasOwnProperty.call(body, "ownerId")
    || Object.prototype.hasOwnProperty.call(body, "owner_id")
    || Object.prototype.hasOwnProperty.call(body, "userId")
    || (Object.prototype.hasOwnProperty.call(body, "visibility") && body.visibility !== "private");
}
