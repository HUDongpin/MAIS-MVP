import { NextResponse } from "next/server";
import {
  bodyExpectedUserConstraints,
  expectedUserConstraintsFromRequest,
  guardExpectedAuthenticatedUser,
  requireAuthenticatedUser
} from "@/lib/server/auth";
import { getLearnerProfile, updateLearnerProfile } from "@/lib/server/userStore";
import type {
  LearnerProfileChallengeStart,
  LearnerProfileGoal,
  LearnerProfileHelpStyle,
  LearnerProfileOnboardingStatus,
  LearnerStartSetupAnswers
} from "@/types";

export const runtime = "nodejs";

const validGoals = new Set<LearnerProfileGoal>(["repair", "homework", "preview", "exam"]);
const validChallengeStarts = new Set<LearnerProfileChallengeStart>(["easy", "balanced", "hard"]);
const validHelpStyles = new Set<LearnerProfileHelpStyle>(["hint", "steps", "example", "method"]);
const writableStatuses = new Set<Exclude<LearnerProfileOnboardingStatus, "not-started">>(["completed", "skipped"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseAnswers(value: unknown): LearnerStartSetupAnswers | null {
  if (!isRecord(value)) return null;

  const goal = value.goal;
  const challenge = value.challenge;
  const help = value.help;

  if (!validGoals.has(goal as LearnerProfileGoal)) return null;
  if (!validChallengeStarts.has(challenge as LearnerProfileChallengeStart)) return null;
  if (!validHelpStyles.has(help as LearnerProfileHelpStyle)) return null;

  return {
    goal: goal as LearnerProfileGoal,
    challenge: challenge as LearnerProfileChallengeStart,
    help: help as LearnerProfileHelpStyle
  };
}

async function readPayload(request: Request) {
  try {
    return await request.json() as unknown;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const expectedUserConflict = guardExpectedAuthenticatedUser(
    authenticated,
    expectedUserConstraintsFromRequest(request),
    { requireConstraint: true }
  );
  if (expectedUserConflict) return expectedUserConflict;

  if (authenticated.user.role !== "student") {
    return NextResponse.json({ learnerProfile: null, shouldShowOnboarding: false });
  }

  const learnerProfile = await getLearnerProfile(authenticated.user.id);
  if (!learnerProfile) {
    return NextResponse.json({ error: "Learner profile unavailable." }, { status: 404 });
  }

  return NextResponse.json({
    learnerProfile,
    shouldShowOnboarding: learnerProfile.status === "not-started"
  });
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

  if (authenticated.user.role !== "student") {
    return NextResponse.json({ error: "Learner profile is only available for student users." }, { status: 403 });
  }

  const payload = await readPayload(request);
  const expectedUserConflict = guardExpectedAuthenticatedUser(
    authenticated,
    [
      ...expectedUserConstraintsFromRequest(request),
      ...bodyExpectedUserConstraints(payload)
    ],
    { requireConstraint: true }
  );
  if (expectedUserConflict) return expectedUserConflict;

  if (!isRecord(payload)) {
    return NextResponse.json({ error: "Invalid learner profile payload." }, { status: 400 });
  }

  const status = payload.status;
  if (!writableStatuses.has(status as Exclude<LearnerProfileOnboardingStatus, "not-started">)) {
    return NextResponse.json({ error: "Invalid learner profile status." }, { status: 400 });
  }

  const answers = parseAnswers(payload.answers);
  if (status === "completed" && !answers) {
    return NextResponse.json({ error: "Completed learner profile setup requires valid answers." }, { status: 400 });
  }

  const learnerProfile = await updateLearnerProfile(authenticated.user.id, {
    status: status as Exclude<LearnerProfileOnboardingStatus, "not-started">,
    ...(answers ? { answers } : {})
  });

  if (!learnerProfile) {
    return NextResponse.json({ error: "Learner profile update failed." }, { status: 400 });
  }

  return NextResponse.json({
    learnerProfile,
    shouldShowOnboarding: false
  });
}
