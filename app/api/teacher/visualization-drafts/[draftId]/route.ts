import { NextResponse } from "next/server";

import {
  archiveTeacherVisualizationDraft,
  getTeacherVisualizationDraft,
  updateTeacherVisualizationDraft
} from "@/lib/server/userStore";
import {
  authorizeTeacherVisualizationDraftRequest,
  hasExactFields,
  parseTeacherVisualizationDraftPackage,
  readStrictTeacherVisualizationDraftJson,
  teacherVisualizationDraftConflictResponse,
  teacherVisualizationDraftInvalidResponse,
  teacherVisualizationDraftNotFoundResponse,
  type TeacherVisualizationDraftRouteContext
} from "../_shared";

export const runtime = "nodejs";

export async function GET(request: Request, context: TeacherVisualizationDraftRouteContext) {
  const authorization = await authorizeTeacherVisualizationDraftRequest(request);
  if (authorization.response) return authorization.response;
  const { draftId } = await context.params;
  const result = await getTeacherVisualizationDraft({ ownerId: authorization.ownerId, draftId });
  return result.status === "found"
    ? NextResponse.json({ draft: result.draft })
    : teacherVisualizationDraftNotFoundResponse();
}

export async function PATCH(request: Request, context: TeacherVisualizationDraftRouteContext) {
  const authorization = await authorizeTeacherVisualizationDraftRequest(request);
  if (authorization.response) return authorization.response;
  const payload = await readStrictTeacherVisualizationDraftJson(request);
  if (payload.response) return payload.response;
  if (!hasExactFields(
    payload.body,
    ["baseRevision", "packageJson", "status", "title"],
    ["baseRevision"]
  )) {
    return teacherVisualizationDraftInvalidResponse();
  }
  if (!Number.isSafeInteger(payload.body.baseRevision) || (payload.body.baseRevision as number) < 1) {
    return teacherVisualizationDraftInvalidResponse();
  }
  const hasTitle = Object.prototype.hasOwnProperty.call(payload.body, "title");
  const hasPackage = Object.prototype.hasOwnProperty.call(payload.body, "packageJson");
  const hasStatus = Object.prototype.hasOwnProperty.call(payload.body, "status");
  if (!hasTitle && !hasPackage && !hasStatus) return teacherVisualizationDraftInvalidResponse();
  if (hasTitle && typeof payload.body.title !== "string") return teacherVisualizationDraftInvalidResponse();
  if (
    hasStatus
    && payload.body.status !== "editing"
    && payload.body.status !== "ready-for-review"
  ) {
    return teacherVisualizationDraftInvalidResponse();
  }
  const parsedPackage = hasPackage
    ? parseTeacherVisualizationDraftPackage(payload.body.packageJson)
    : undefined;
  if (parsedPackage?.response) return parsedPackage.response;

  const { draftId } = await context.params;
  const result = await updateTeacherVisualizationDraft({
    ownerId: authorization.ownerId,
    draftId,
    baseRevision: payload.body.baseRevision as number,
    ...(hasTitle ? { title: payload.body.title as string } : {}),
    ...(parsedPackage?.packageJson ? { packageJson: parsedPackage.packageJson } : {}),
    ...(hasStatus ? { status: payload.body.status as "editing" | "ready-for-review" } : {})
  });
  if (result.status === "not-found") return teacherVisualizationDraftNotFoundResponse();
  if (result.status === "conflict") {
    return teacherVisualizationDraftConflictResponse(result.currentRevision, result.serverVersion);
  }
  if (result.status !== "saved") return teacherVisualizationDraftInvalidResponse(result.status);
  return NextResponse.json({ draft: result.draft });
}

export async function DELETE(request: Request, context: TeacherVisualizationDraftRouteContext) {
  const authorization = await authorizeTeacherVisualizationDraftRequest(request);
  if (authorization.response) return authorization.response;
  const payload = await readStrictTeacherVisualizationDraftJson(request);
  if (payload.response) return payload.response;
  if (!hasExactFields(payload.body, ["baseRevision"], ["baseRevision"])) {
    return teacherVisualizationDraftInvalidResponse();
  }
  if (!Number.isSafeInteger(payload.body.baseRevision) || (payload.body.baseRevision as number) < 1) {
    return teacherVisualizationDraftInvalidResponse();
  }
  const { draftId } = await context.params;
  const result = await archiveTeacherVisualizationDraft({
    ownerId: authorization.ownerId,
    draftId,
    baseRevision: payload.body.baseRevision as number
  });
  if (result.status === "conflict") {
    return teacherVisualizationDraftConflictResponse(result.currentRevision, result.serverVersion);
  }
  return result.status === "archived"
    ? NextResponse.json({ draft: result.draft })
    : teacherVisualizationDraftNotFoundResponse();
}
