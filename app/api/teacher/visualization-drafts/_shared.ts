import { NextResponse } from "next/server";

import {
  MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES,
  parseMathScenePackageV3Json,
  type MathScenePackageV3
} from "@/components/visualizations/three/manim/mathScenePackageV3";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";

// The package itself remains capped at exactly 1 MiB by
// `parseMathScenePackageV3Json`. The HTTP body also contains a compact,
// bounded envelope (`packageJson`, title/status, and PATCH baseRevision), so
// applying the package-only limit to the whole request rejects an otherwise
// valid near-limit package before the package validator can inspect it.
export const TEACHER_VISUALIZATION_DRAFT_REQUEST_ENVELOPE_MAX_BYTES = 8 * 1024;
export const teacherVisualizationDraftMaxRequestBytes =
  MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES
  + TEACHER_VISUALIZATION_DRAFT_REQUEST_ENVELOPE_MAX_BYTES;

export type TeacherVisualizationDraftRouteContext = {
  params: Promise<{ draftId: string }>;
};

type AuthorizedTeacherRequest =
  | { ownerId: string; response?: never }
  | { ownerId?: never; response: NextResponse };

type StrictJsonBody =
  | { body: Record<string, unknown>; response?: never }
  | { body?: never; response: NextResponse };

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json(
    details === undefined ? { error } : { error, details },
    { status }
  );
}

export async function authorizeTeacherVisualizationDraftRequest(
  request: Request
): Promise<AuthorizedTeacherRequest> {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return { response: jsonError("not-authenticated", 401) };
  if (!canAccessTeacherArea(authenticated.user)) {
    return { response: jsonError("teacher-access-required", 403) };
  }
  return { ownerId: authenticated.user.id };
}

export async function readStrictTeacherVisualizationDraftJson(request: Request): Promise<StrictJsonBody> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return { response: jsonError("application-json-required", 415) };

  const declaredLength = request.headers.get("content-length")?.trim();
  if (declaredLength && /^\d+$/.test(declaredLength)) {
    try {
      if (BigInt(declaredLength) > BigInt(teacherVisualizationDraftMaxRequestBytes)) {
        return { response: jsonError("request-too-large", 413) };
      }
    } catch {
      // An unparseable declaration is not trusted; the streaming byte limit
      // below remains authoritative.
    }
  }

  const body = request.body;
  if (!body) return { response: jsonError("malformed-json", 400) };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > teacherVisualizationDraftMaxRequestBytes) {
        try {
          await reader.cancel();
        } catch {
          // The 413 result is stable even if the transport is already closed.
        }
        return { response: jsonError("request-too-large", 413) };
      }
      chunks.push(value);
    }
  } catch {
    try {
      await reader.cancel();
    } catch {
      // A failed request stream can also reject cancellation.
    }
    return { response: jsonError("malformed-json", 400) };
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Nothing else should consume this one-shot request body.
    }
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let raw: string;
  try {
    raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { response: jsonError("malformed-json", 400) };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { response: jsonError("malformed-json", 400) };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { response: jsonError("invalid-payload", 400) };
  }
  return { body: parsed as Record<string, unknown> };
}

export function hasExactFields(
  value: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[]
) {
  const allowedSet = new Set(allowed);
  return Object.keys(value).every((key) => allowedSet.has(key))
    && required.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

export function parseTeacherVisualizationDraftPackage(value: unknown):
  | { packageJson: MathScenePackageV3; response?: never }
  | { packageJson?: never; response: NextResponse } {
  let text: string;
  try {
    text = JSON.stringify(value);
  } catch {
    return { response: jsonError("invalid-scene-package", 400) };
  }
  if (text === undefined) return { response: jsonError("invalid-scene-package", 400) };
  const result = parseMathScenePackageV3Json(text);
  if (result.ok) return { packageJson: result.value };
  const tooLarge = result.errors.some((error) => error.code === "PACKAGE_TOO_LARGE");
  return {
    response: jsonError(
      tooLarge ? "scene-package-too-large" : "invalid-scene-package",
      tooLarge ? 413 : 400,
      result.errors.map(({ code, message, path }) => ({ code, message, path }))
    )
  };
}

export function teacherVisualizationDraftNotFoundResponse() {
  return jsonError("visualization-draft-not-found", 404);
}

export function teacherVisualizationDraftInvalidResponse(error = "invalid-visualization-draft") {
  return jsonError(error, 400);
}

export function teacherVisualizationDraftConflictResponse(
  currentRevision: number,
  serverVersion: unknown
) {
  return NextResponse.json(
    { error: "revision-conflict", currentRevision, serverVersion },
    { status: 409 }
  );
}
