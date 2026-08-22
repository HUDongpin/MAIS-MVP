import { NextResponse } from "next/server";
import { isValidLearningAnalyticsEvent } from "@/lib/learningAnalytics";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { listVisualizationSessionsForUser, markVisualizationSession } from "@/lib/server/userStore";
import {
  isEligibleVisualizationSession,
  isVisualizationSessionEligibleForLearner
} from "@/lib/server/visualizationSessionEligibility";
import { isCanonicalVisualizationSessionIdentity } from "@/lib/visualizationSessionContract";
import type { LearningAnalyticsEvent } from "@/types";

export const runtime = "nodejs";

function isVisualizationSource(value: unknown): value is LearningAnalyticsEvent["source"] {
  return isValidLearningAnalyticsEvent({
    id: "validation",
    type: "visualization-complete",
    source: value,
    timestamp: new Date().toISOString(),
    grade: "S3",
    topicId: "validation"
  });
}

function serializeVisualizationSession(session: {
  module_id: string;
  topic_id: string;
  source: LearningAnalyticsEvent["source"];
  explored: boolean;
  completed_at: string | null;
  updated_at: string | null;
}) {
  return {
    moduleId: session.module_id,
    topicId: session.topic_id,
    source: session.source,
    explored: session.explored,
    completedAt: session.completed_at,
    updatedAt: session.updated_at
  };
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (authenticated.user.role !== "student") {
    return NextResponse.json({
      error: "Student access required.",
      reason: "student-only"
    }, { status: 403 });
  }

  const encodedOwnerUserId = request.headers.get("x-mais-visualization-user-id");
  if (!encodedOwnerUserId) {
    return NextResponse.json({ error: "Visualization owner is required." }, { status: 409 });
  }
  let ownerUserId = "";
  try {
    ownerUserId = decodeURIComponent(encodedOwnerUserId);
  } catch {
    return NextResponse.json({ error: "Invalid visualization owner." }, { status: 409 });
  }
  if (!ownerUserId || ownerUserId !== authenticated.user.id) {
    return NextResponse.json({ error: "Visualization owner mismatch." }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const record = body as { moduleId?: unknown; topicId?: unknown; source?: unknown } | null;
  if (
    !isCanonicalVisualizationSessionIdentity(record?.moduleId) ||
    !isCanonicalVisualizationSessionIdentity(record.topicId) ||
    !isVisualizationSource(record.source)
  ) {
    return NextResponse.json({ error: "moduleId, topicId, and source are required." }, { status: 400 });
  }
  const identity = {
    moduleId: record.moduleId,
    topicId: record.topicId,
    source: record.source
  };
  if (!isEligibleVisualizationSession(identity)) {
    return NextResponse.json({
      error: "Unknown visualization session identity.",
      reason: "unknown-visualization-session"
    }, { status: 400 });
  }
  if (!isVisualizationSessionEligibleForLearner(identity, authenticated.user)) {
    return NextResponse.json({
      error: "Visualization is outside the authenticated learner curriculum.",
      reason: "curriculum-scope-mismatch"
    }, { status: 403 });
  }

  const session = await markVisualizationSession({
    userId: authenticated.user.id,
    moduleId: record.moduleId,
    topicId: record.topicId,
    source: record.source
  });

  return NextResponse.json({
    acknowledgedUserId: authenticated.user.id,
    durablyPersisted: true,
    session: serializeVisualizationSession(session)
  });
}

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (authenticated.user.role !== "student") {
    return NextResponse.json({
      error: "Student access required.",
      reason: "student-only"
    }, { status: 403 });
  }

  const sessions = await listVisualizationSessionsForUser(authenticated.user.id);
  return NextResponse.json({ sessions });
}
