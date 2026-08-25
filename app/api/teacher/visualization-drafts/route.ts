import { NextResponse } from "next/server";

import {
  createTeacherVisualizationDraft,
  listTeacherVisualizationDrafts
} from "@/lib/server/userStore";
import {
  authorizeTeacherVisualizationDraftRequest,
  hasExactFields,
  parseTeacherVisualizationDraftPackage,
  readStrictTeacherVisualizationDraftJson,
  teacherVisualizationDraftInvalidResponse
} from "./_shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authorization = await authorizeTeacherVisualizationDraftRequest(request);
  if (authorization.response) return authorization.response;
  const drafts = await listTeacherVisualizationDrafts(authorization.ownerId);
  return NextResponse.json({ drafts });
}

export async function POST(request: Request) {
  const authorization = await authorizeTeacherVisualizationDraftRequest(request);
  if (authorization.response) return authorization.response;

  const payload = await readStrictTeacherVisualizationDraftJson(request);
  if (payload.response) return payload.response;
  if (!hasExactFields(payload.body, ["packageJson", "status", "title"], ["packageJson", "title"])) {
    return teacherVisualizationDraftInvalidResponse();
  }
  if (typeof payload.body.title !== "string") return teacherVisualizationDraftInvalidResponse();
  if (
    payload.body.status !== undefined
    && payload.body.status !== "editing"
    && payload.body.status !== "ready-for-review"
  ) {
    return teacherVisualizationDraftInvalidResponse();
  }

  const parsedPackage = parseTeacherVisualizationDraftPackage(payload.body.packageJson);
  if (parsedPackage.response) return parsedPackage.response;
  const result = await createTeacherVisualizationDraft({
    ownerId: authorization.ownerId,
    title: payload.body.title,
    packageJson: parsedPackage.packageJson,
    status: payload.body.status as "editing" | "ready-for-review" | undefined
  });
  if (result.status !== "created") {
    return teacherVisualizationDraftInvalidResponse(result.status);
  }
  return NextResponse.json({ draft: result.draft }, { status: 201 });
}
