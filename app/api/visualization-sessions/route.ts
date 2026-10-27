import { NextResponse } from "next/server";
import { isValidLearningAnalyticsEvent } from "@/lib/learningAnalytics";
import { bodyExpectedUserConstraints, expectedUserConstraintsFromRequest, guardExpectedAuthenticatedUser, requireAuthenticatedUser } from "@/lib/server/auth";
import { listVisualizationSessionsForUser, markVisualizationSession } from "@/lib/server/userStore";
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
  const transportConflict = guardExpectedAuthenticatedUser(authenticated, expectedUserConstraintsFromRequest(request));
  if (transportConflict) return transportConflict;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const conflict = guardExpectedAuthenticatedUser(authenticated, expectedUserConstraintsFromRequest(request), { requireConstraint: true });
    if (conflict) return conflict;
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const identityConflict = guardExpectedAuthenticatedUser(authenticated, [
    ...expectedUserConstraintsFromRequest(request), ...bodyExpectedUserConstraints(body)
  ], { requireConstraint: true });
  if (identityConflict) return identityConflict;
  if (authenticated.user.role !== "student") {
    return NextResponse.json({ error: "Student access required.", reason: "student-only" }, { status: 403 });
  }

  const record = body as { moduleId?: unknown; topicId?: unknown; source?: unknown } | null;
  if (
    typeof record?.moduleId !== "string" ||
    typeof record.topicId !== "string" ||
    !isVisualizationSource(record.source)
  ) {
    return NextResponse.json({ error: "moduleId, topicId, and source are required." }, { status: 400 });
  }

  const session = await markVisualizationSession({
    userId: authenticated.user.id,
    moduleId: record.moduleId,
    topicId: record.topicId,
    source: record.source
  });

  if (!session) return NextResponse.json({ error: "Account no longer exists." }, { status: 404 });
  return NextResponse.json({ session: serializeVisualizationSession(session) });
}

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const identityConflict = guardExpectedAuthenticatedUser(authenticated, expectedUserConstraintsFromRequest(request), { requireConstraint: true });
  if (identityConflict) return identityConflict;
  if (authenticated.user.role !== "student") {
    return NextResponse.json({ error: "Student access required.", reason: "student-only" }, { status: 403 });
  }

  const sessions = await listVisualizationSessionsForUser(authenticated.user.id);
  return NextResponse.json({ sessions });
}
