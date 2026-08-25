import {
  validateMathScenePackageV3,
  type MathScenePackageV3
} from "@/components/visualizations/three/manim/mathScenePackageV3";
import type {
  TeacherVisualizationDraftRecord,
  TeacherVisualizationDraftRevisionConflict,
  TeacherVisualizationDraftStatus
} from "@/types";

type DraftApiError = {
  kind: "http" | "invalid-response" | "network";
  message: string;
  ok: false;
  status?: number;
};

type DraftApiConflict = {
  conflict: TeacherVisualizationDraftRevisionConflict;
  kind: "conflict";
  ok: false;
};

type DraftApiSuccess<T> = { ok: true; value: T };
export type TeacherVisualizationDraftApiResult<T> = DraftApiSuccess<T> | DraftApiConflict | DraftApiError;

type FetchOption = { fetchImpl?: typeof fetch; signal?: AbortSignal };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDraftRecord(value: unknown): value is TeacherVisualizationDraftRecord {
  if (!isRecord(value) || !isRecord(value.packageJson)) return false;
  const recordShapeIsValid = (
    typeof value.id === "string"
    && typeof value.ownerId === "string"
    && typeof value.title === "string"
    && value.schemaVersion === "mais-manim-scene-package/v3"
    && ["editing", "ready-for-review", "archived"].includes(String(value.status))
    && Number.isSafeInteger(value.revision)
    && value.packageJson.schemaVersion === "mais-manim-scene-package/v3"
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string"
    && (value.archivedAt === null || typeof value.archivedAt === "string")
  );
  return recordShapeIsValid && validateMathScenePackageV3(value.packageJson).ok;
}

async function requestJson(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch
): Promise<{ body: unknown; response: Response } | DraftApiError> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      ...init,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...init.headers
      }
    });
  } catch {
    return { kind: "network", message: "visualization-draft-network-error", ok: false };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      kind: "invalid-response",
      message: "visualization-draft-invalid-response",
      ok: false,
      status: response.status
    };
  }
  return { body, response };
}

function responseError(response: Response, body: unknown): DraftApiError {
  return {
    kind: "http",
    message: isRecord(body) && typeof body.error === "string" ? body.error : "visualization-draft-request-failed",
    ok: false,
    status: response.status
  };
}

function revisionConflict(response: Response, body: unknown): DraftApiConflict | null {
  if (response.status !== 409 || !isRecord(body)) return null;
  if (
    body.error !== "revision-conflict"
    || !Number.isSafeInteger(body.currentRevision)
    || !isDraftRecord(body.serverVersion)
  ) return null;
  return {
    conflict: body as TeacherVisualizationDraftRevisionConflict,
    kind: "conflict",
    ok: false
  };
}

export async function listTeacherVisualizationDrafts(
  options: FetchOption = {}
): Promise<TeacherVisualizationDraftApiResult<TeacherVisualizationDraftRecord[]>> {
  const result = await requestJson(
    "/api/teacher/visualization-drafts",
    { method: "GET", signal: options.signal },
    options.fetchImpl ?? fetch
  );
  if ("ok" in result) return result;
  if (!result.response.ok) return responseError(result.response, result.body);
  if (!isRecord(result.body) || !Array.isArray(result.body.drafts) || !result.body.drafts.every(isDraftRecord)) {
    return { kind: "invalid-response", message: "visualization-draft-invalid-response", ok: false };
  }
  return { ok: true, value: result.body.drafts };
}

export async function getTeacherVisualizationDraft(
  input: { draftId: string } & FetchOption
): Promise<TeacherVisualizationDraftApiResult<TeacherVisualizationDraftRecord>> {
  const result = await requestJson(
    `/api/teacher/visualization-drafts/${encodeURIComponent(input.draftId)}`,
    { method: "GET", signal: input.signal },
    input.fetchImpl ?? fetch
  );
  if ("ok" in result) return result;
  if (!result.response.ok) return responseError(result.response, result.body);
  if (!isRecord(result.body) || !isDraftRecord(result.body.draft)) {
    return { kind: "invalid-response", message: "visualization-draft-invalid-response", ok: false };
  }
  return { ok: true, value: result.body.draft };
}

export async function createTeacherVisualizationDraft(
  input: {
    packageJson: MathScenePackageV3;
    status: Exclude<TeacherVisualizationDraftStatus, "archived">;
    title: string;
  } & FetchOption
): Promise<TeacherVisualizationDraftApiResult<TeacherVisualizationDraftRecord>> {
  const result = await requestJson(
    "/api/teacher/visualization-drafts",
    {
      body: JSON.stringify({ packageJson: input.packageJson, status: input.status, title: input.title }),
      method: "POST",
      signal: input.signal
    },
    input.fetchImpl ?? fetch
  );
  if ("ok" in result) return result;
  if (!result.response.ok) return responseError(result.response, result.body);
  if (!isRecord(result.body) || !isDraftRecord(result.body.draft)) {
    return { kind: "invalid-response", message: "visualization-draft-invalid-response", ok: false };
  }
  return { ok: true, value: result.body.draft };
}

export async function patchTeacherVisualizationDraft(
  input: {
    baseRevision: number;
    draftId: string;
    packageJson?: MathScenePackageV3;
    status?: Exclude<TeacherVisualizationDraftStatus, "archived">;
    title?: string;
  } & FetchOption
): Promise<TeacherVisualizationDraftApiResult<TeacherVisualizationDraftRecord>> {
  const patch: {
    baseRevision: number;
    packageJson?: MathScenePackageV3;
    status?: Exclude<TeacherVisualizationDraftStatus, "archived">;
    title?: string;
  } = { baseRevision: input.baseRevision };
  if (input.packageJson !== undefined) patch.packageJson = input.packageJson;
  if (input.status !== undefined) patch.status = input.status;
  if (input.title !== undefined) patch.title = input.title;
  const result = await requestJson(
    `/api/teacher/visualization-drafts/${encodeURIComponent(input.draftId)}`,
    {
      body: JSON.stringify(patch),
      method: "PATCH",
      signal: input.signal
    },
    input.fetchImpl ?? fetch
  );
  if ("ok" in result) return result;
  const conflict = revisionConflict(result.response, result.body);
  if (conflict) return conflict;
  if (!result.response.ok) return responseError(result.response, result.body);
  if (!isRecord(result.body) || !isDraftRecord(result.body.draft)) {
    return { kind: "invalid-response", message: "visualization-draft-invalid-response", ok: false };
  }
  return { ok: true, value: result.body.draft };
}

export async function archiveTeacherVisualizationDraft(
  input: { baseRevision: number; draftId: string } & FetchOption
): Promise<TeacherVisualizationDraftApiResult<TeacherVisualizationDraftRecord>> {
  const result = await requestJson(
    `/api/teacher/visualization-drafts/${encodeURIComponent(input.draftId)}`,
    {
      body: JSON.stringify({ baseRevision: input.baseRevision }),
      method: "DELETE",
      signal: input.signal
    },
    input.fetchImpl ?? fetch
  );
  if ("ok" in result) return result;
  const conflict = revisionConflict(result.response, result.body);
  if (conflict) return conflict;
  if (!result.response.ok) return responseError(result.response, result.body);
  if (!isRecord(result.body) || !isDraftRecord(result.body.draft)) {
    return { kind: "invalid-response", message: "visualization-draft-invalid-response", ok: false };
  }
  return { ok: true, value: result.body.draft };
}
