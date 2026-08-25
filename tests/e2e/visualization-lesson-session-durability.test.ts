import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, symlinkSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { getVisualizationLabByLabId } from "../../data/visualizationLabs";
import { lessonSlugForTopicId } from "../../lib/lessonLinks";
import { visualizationCompletionRewardSourceKey } from "../../lib/server/userStore/gamificationRewardRedemptionPersistence";
import {
  VisualizationLessonTerminalDeadlineError,
  assertStarshipVisualizationDatabasePath,
  classifyVisualizationLessonAppState,
  classifyVisualizationLessonMountWrites,
  readVisualizationLessonAppState,
  validateVisualizationLessonDuplicateReplay,
  validateVisualizationLessonFirstInteraction,
  validateVisualizationLessonMountTerminalReceipt,
} from "./visualization-lesson-session-durability";

const userId = "student-package-a";
const moduleId = "configured-visualization-lab";
const selectedTopicId = "pep-junior-s1-upper-rational-numbers";
const siblingTopicId = "bnu-junior-s1-upper-rational-numbers";
const lessonSlug = lessonSlugForTopicId(selectedTopicId);
const sessionSource = "coordinate-plane";
const grade = "S1";
const completedAt = "2026-08-11T08:09:10.000Z";
const selectedRewardKey = rewardKey(selectedTopicId);

function rewardKey(topicId: string) {
  const digest = createHash("sha256")
    .update(JSON.stringify([userId, moduleId, topicId]), "utf8")
    .digest("hex");
  return `visualization-complete:v2:${digest}`;
}

function basePayload() {
  return {
    gamification_events: [] as unknown[],
    learning_events: [] as unknown[],
    lesson_progress: [
      {
        lesson_slug: lessonSlug,
        user_id: userId,
        topic_id: selectedTopicId,
        status: "in-progress",
      },
    ] as unknown[],
    reward_point_ledger: [] as unknown[],
    visualization_events: [] as unknown[],
    visualization_sessions: [] as unknown[],
  };
}

function classify(payload = basePayload(), revision = 7) {
  return classifyVisualizationLessonAppState({
    moduleId,
    payloadBytes: JSON.stringify(payload),
    revision,
    selectedTopicId,
    siblingTopicIds: [siblingTopicId],
    updatedAt: "2026-08-11T08:00:00.000Z",
    userId,
  });
}

function completedPayload() {
  const payload = basePayload();
  payload.visualization_sessions.push({
    user_id: userId,
    module_id: moduleId,
    topic_id: selectedTopicId,
    source: sessionSource,
    explored: true,
    completed_at: completedAt,
    updated_at: completedAt,
  });
  payload.reward_point_ledger.push({
    student_id: userId,
    amount: 20,
    reason: "visualization-complete",
    source_key: selectedRewardKey,
    created_at: completedAt,
  });
  payload.gamification_events.push({
    id: "gamification-selected",
    student_id: userId,
    reward_points: 20,
    xp: 45,
    source: "visualization-complete",
    source_key: selectedRewardKey,
    status: "awarded",
    economy_version: "v1",
    created_at: completedAt,
  });
  return payload;
}

function exactSession() {
  return {
    completedAt,
    explored: true,
    moduleId,
    source: sessionSource,
    topicId: selectedTopicId,
    updatedAt: completedAt,
  };
}

function firstInteractionInput(
  payload = completedPayload(),
  revision = 8,
  session = exactSession(),
) {
  const responseBody = {
    acknowledgedUserId: userId,
    durablyPersisted: true,
    session,
  };
  const apiBody = { sessions: [session] };
  return {
    api: {
      body: apiBody,
      responseBytes: JSON.stringify(apiBody),
      status: 200,
    },
    expected: {
      moduleId,
      selectedTopicId,
      siblingTopicIds: [siblingTopicId],
      source: sessionSource,
      userId,
    },
    raw: classify(payload, revision),
    request: {
      body: {
        moduleId,
        source: sessionSource,
        topicId: selectedTopicId,
      },
      method: "POST",
      pathname: "/api/visualization-sessions",
    },
    response: {
      body: responseBody,
      responseBytes: JSON.stringify(responseBody),
      status: 200,
    },
  } as const;
}

function mountReceipt(raw = classify()) {
  return {
    activeRoot: {
      activeLabId: selectedTopicId,
      count: 1,
      moduleId,
      sessionOwner: "first-control-interaction",
      topicId: selectedTopicId,
      visible: true,
    },
    apiSessions: [],
    digest: {
      current: "mount-terminal-digest",
      previous: "mount-terminal-digest",
      stablePolls: 2,
    },
    inFlightRelevantWriteKeys: [],
    lessonProgressStartAck: {
      method: "POST",
      pathname: "/api/lesson-progress",
      responseBytes: JSON.stringify({
        lesson: {
          slug: lessonSlug,
          status: "in-progress",
          topicId: selectedTopicId,
        },
      }),
      status: 200,
      writeIndex: 0,
    },
    lessonPageViewAck: {
      method: "POST",
      pathname: "/api/learning-events",
      responseBytes: JSON.stringify({
        accepted: 1,
        acknowledgedEventIds: ["page-view-1"],
        acknowledgedUserId: userId,
        dispositions: [{ disposition: "inserted", id: "page-view-1" }],
        durablyPersisted: true,
        generation: 0,
      }),
      status: 200,
      writeIndex: 1,
    },
    outbox: {
      sessionDigestAfter: "empty-session",
      sessionDigestBefore: "empty-session",
      sessionRecords: [],
      visualizationDigestAfter: "empty-visualization",
      visualizationDigestBefore: "empty-visualization",
      visualizationRecords: [],
    },
    raw,
    visibleEnabledControlKeys: ["value"],
    dispatchedControlEventCount: 0,
    writes: [
      {
        body: { action: "start", slug: lessonSlug },
        method: "POST",
        pathname: "/api/lesson-progress",
      },
      {
        body: {
          events: [
            {
              grade,
              id: "page-view-1",
              source: "lesson",
              timestamp: completedAt,
              topicId: `student-lessons-${lessonSlug}`,
              type: "page-view",
            },
          ],
          generation: 0,
        },
        method: "POST",
        pathname: "/api/learning-events",
      },
    ],
  } as const;
}

const mountExpected = {
  grade,
  lessonSlug,
  moduleId,
  selectedTopicId,
  siblingTopicIds: [siblingTopicId],
  userId,
} as const;

test("Starship database path gate rejects off-volume and non-canonical paths", () => {
  const databasePath = "/Volumes/Starship/package-a/db/app.sqlite";
  assert.equal(assertStarshipVisualizationDatabasePath(databasePath), databasePath);
  assert.throws(
    () => assertStarshipVisualizationDatabasePath("/tmp/app.sqlite"),
    /STARSHIP_DATABASE_PATH/,
  );
  assert.throws(
    () =>
      assertStarshipVisualizationDatabasePath(
        "/Volumes/Starship/package-a/../app.sqlite",
      ),
    /STARSHIP_DATABASE_PATH/,
  );
});

test("v2 visualization reward key fixture cross-checks the production tuple digest", () => {
  assert.equal(
    selectedRewardKey,
    visualizationCompletionRewardSourceKey(userId, moduleId, selectedTopicId),
  );
  assert.equal(
    getVisualizationLabByLabId(selectedTopicId)?.analyticsSource,
    sessionSource,
  );
});

test("raw app_state classifier separates selected and sibling records and freezes JSON evidence", () => {
  const payload = basePayload();
  payload.lesson_progress.push({
    lesson_slug: lessonSlugForTopicId(siblingTopicId),
    user_id: userId,
    topic_id: siblingTopicId,
    status: "in-progress",
  });
  payload.visualization_sessions.push({
    user_id: userId,
    module_id: moduleId,
    topic_id: siblingTopicId,
    source: sessionSource,
    explored: false,
    completed_at: null,
    updated_at: completedAt,
  });

  const snapshot = classify(payload);
  assert.deepEqual(snapshot.selected.lessonProgress, [
    { lessonSlug, status: "in-progress", topicId: selectedTopicId },
  ]);
  assert.deepEqual(snapshot.siblings.lessonProgress, [
    {
      lessonSlug: lessonSlugForTopicId(siblingTopicId),
      status: "in-progress",
      topicId: siblingTopicId,
    },
  ]);
  assert.equal(snapshot.selected.sessions.length, 0);
  assert.equal(snapshot.siblings.sessions.length, 1);
  assert.deepEqual(snapshot.malformed, []);
  assert.match(snapshot.payloadSha256, /^[a-f0-9]{64}$/);
  assert.match(snapshot.visualizationSliceSha256, /^[a-f0-9]{64}$/);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.selected.lessonProgress), true);
  assert.throws(() => {
    (snapshot.selected.lessonProgress as unknown as Array<unknown>).push({});
  });
});

test("raw app_state classifier reports relevant malformed rows instead of filtering them away", () => {
  const payload = basePayload();
  payload.visualization_sessions.push({
    user_id: userId,
    module_id: moduleId,
    topic_id: selectedTopicId,
    source: sessionSource,
    explored: "true",
    completed_at: completedAt,
    updated_at: completedAt,
  });
  payload.reward_point_ledger = null as unknown as unknown[];

  const snapshot = classify(payload);
  assert.deepEqual(
    snapshot.malformed.map(({ collection, reason }) => ({ collection, reason })),
    [
      {
        collection: "reward_point_ledger",
        reason: "missing-array",
      },
      {
        collection: "visualization_sessions",
        reason: "malformed-relevant-row",
      },
    ],
  );
  assert.equal(snapshot.selected.sessions.length, 0);
});

test("raw app_state classifier catches v2 reward-key rows with a mismatched owner", () => {
  const payload = basePayload();
  payload.reward_point_ledger.push({
    amount: 20,
    created_at: completedAt,
    reason: "visualization-complete",
    source_key: selectedRewardKey,
    student_id: "different-student",
  });
  payload.gamification_events.push({
    created_at: completedAt,
    economy_version: "v1",
    id: "owner-corrupt-gamification",
    reward_points: 20,
    source: "visualization-complete",
    source_key: selectedRewardKey,
    status: "awarded",
    student_id: "different-student",
    xp: 45,
  });

  const snapshot = classify(payload);
  assert.deepEqual(
    snapshot.malformed.map(({ collection, reason }) => ({ collection, reason })),
    [
      {
        collection: "gamification_events",
        reason: "owner-mismatch-for-expected-source-key",
      },
      {
        collection: "reward_point_ledger",
        reason: "owner-mismatch-for-expected-source-key",
      },
    ],
  );
});

test("raw classifier binds lesson slug and treats the expected v2 key as relevant before reward type filters", () => {
  const missingLesson = basePayload();
  delete (missingLesson.lesson_progress[0] as Record<string, unknown>).lesson_slug;
  assert.deepEqual(
    classify(missingLesson).malformed.map(({ collection, reason }) => ({
      collection,
      reason,
    })),
    [{ collection: "lesson_progress", reason: "lesson-identity-mismatch" }],
  );

  const wrongLesson = basePayload();
  (wrongLesson.lesson_progress[0] as Record<string, unknown>).lesson_slug =
    "wrong-lesson-slug";
  const wrongLessonSnapshot = classify(wrongLesson);
  assert.deepEqual(
    wrongLessonSnapshot.malformed.map(({ collection, reason }) => ({
      collection,
      reason,
    })),
    [{ collection: "lesson_progress", reason: "lesson-identity-mismatch" }],
  );

  const polluted = completedPayload();
  polluted.reward_point_ledger.push({
    amount: 20,
    created_at: completedAt,
    reason: "teacher-award",
    source_key: selectedRewardKey,
    student_id: "different-student",
  });
  polluted.reward_point_ledger.push({
    amount: 20,
    created_at: completedAt,
    reason: "teacher-award",
    source_key: selectedRewardKey,
    student_id: userId,
  });
  polluted.gamification_events.push({
    created_at: completedAt,
    economy_version: "v1",
    id: "wrong-source-same-key",
    reward_points: 20,
    source: "teacher-award",
    source_key: selectedRewardKey,
    status: "awarded",
    student_id: userId,
    xp: 45,
  });
  const pollutedSnapshot = classify(polluted);
  assert.deepEqual(
    pollutedSnapshot.malformed.map(({ collection, reason }) => ({
      collection,
      reason,
    })),
    [
      {
        collection: "gamification_events",
        reason: "unexpected-source-for-expected-key",
      },
      {
        collection: "reward_point_ledger",
        reason: "owner-mismatch-for-expected-source-key",
      },
      {
        collection: "reward_point_ledger",
        reason: "unexpected-reason-for-expected-key",
      },
    ],
  );
  assert.throws(
    () => validateVisualizationLessonFirstInteraction(firstInteractionInput(polluted)),
    /FIRST_INTERACTION_DURABILITY.*malformed/i,
  );
});

test("SQLite reader binds one Starship app_state revision and payload", () => {
  const runRoot = process.env.VISUALIZATION_DURABILITY_TEST_ROOT;
  assert.equal(runRoot?.startsWith("/Volumes/Starship/"), true);
  mkdirSync(runRoot!, { recursive: true });
  const databasePath = path.join(runRoot!, `package-a-${process.pid}-${randomUUID()}.sqlite`);
  const database = new DatabaseSync(databasePath);
  try {
    database.exec(
      "CREATE TABLE app_state (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL)",
    );
    database
      .prepare("INSERT INTO app_state (id, revision, updated_at, payload) VALUES (?, ?, ?, ?)")
      .run("primary", 11, completedAt, JSON.stringify(basePayload()));
  } finally {
    database.close();
  }

  const snapshot = readVisualizationLessonAppState({
    databasePath,
    moduleId,
    selectedTopicId,
    siblingTopicIds: [siblingTopicId],
    userId,
  });
  assert.equal(snapshot.revision, 11);
  assert.equal(snapshot.updatedAt, completedAt);
  assert.deepEqual(snapshot.selected.lessonProgress, [
    { lessonSlug, status: "in-progress", topicId: selectedTopicId },
  ]);
  const symlinkPath = `${databasePath}.symlink`;
  symlinkSync(databasePath, symlinkPath);
  assert.throws(
    () =>
      readVisualizationLessonAppState({
        databasePath: symlinkPath,
        moduleId,
        selectedTopicId,
        siblingTopicIds: [siblingTopicId],
        userId,
      }),
    /STARSHIP_DATABASE_PATH.*symlink/u,
  );
});

test("mount write allowlist accepts only lesson start, lesson page-view, and empty analytics handshake", () => {
  const verdict = classifyVisualizationLessonMountWrites({
    expectedGrade: grade,
    expectedLessonSlug: lessonSlug,
    writes: [
      {
        method: "GET",
        pathname: "/api/visualization-sessions",
        body: null,
      },
      {
        method: "POST",
        pathname: "/api/lesson-progress",
        body: { slug: lessonSlug, action: "start" },
      },
      {
        method: "POST",
        pathname: "/api/learning-events",
        body: { generation: 0, events: [] },
      },
      {
        method: "POST",
        pathname: "/api/learning-events",
        body: {
          generation: 0,
          events: [
            {
              grade: "S1",
              id: "page-view",
              type: "page-view",
              source: "lesson",
              topicId: `student-lessons-${lessonSlug}`,
              timestamp: completedAt,
            },
          ],
        },
      },
    ],
  });
  assert.equal(verdict.ok, true);
  assert.deepEqual(verdict.allowed.map(({ kind }) => kind), [
    "safe-read",
    "lesson-progress-start",
    "analytics-empty-handshake",
    "lesson-page-view",
  ]);
  assert.deepEqual(verdict.violations, []);
});

test("mount write allowlist hard-rejects session, reward, gamification, visualization event, and unknown mutations", () => {
  const cases = [
    "/api/visualization-sessions",
    "/api/rewards/redeem",
    "/api/gamification/events",
    "/api/visualization-events",
    "/api/unknown-mutation",
  ];
  const verdict = classifyVisualizationLessonMountWrites({
    expectedGrade: grade,
    expectedLessonSlug: lessonSlug,
    writes: cases.map((pathname) => ({ body: {}, method: "POST", pathname })),
  });
  assert.equal(verdict.ok, false);
  assert.deepEqual(
    verdict.violations.map(({ pathname }) => pathname),
    cases,
  );
});

test("mount write allowlist rejects visualization telemetry hidden inside learning-event delivery", () => {
  const verdict = classifyVisualizationLessonMountWrites({
    expectedGrade: grade,
    expectedLessonSlug: lessonSlug,
    writes: [
      {
        method: "POST",
        pathname: "/api/learning-events",
        body: {
          generation: 0,
          events: [
            {
              id: "bad-viz-event",
              type: "visualization-completed",
              source: "visualization-lab",
              topicId: selectedTopicId,
              timestamp: completedAt,
            },
          ],
        },
      },
    ],
  });
  assert.equal(verdict.ok, false);
  assert.equal(verdict.violations[0]?.reason, "learning-event-not-page-view");
});

test("mount terminal validator closes without sleep only after root, control, ACK, outbox, inflight, digest, API, and raw proof agree", () => {
  const verdict = validateVisualizationLessonMountTerminalReceipt({
    expected: mountExpected,
    receipt: mountReceipt(),
  });
  assert.equal(verdict.terminal, true);
  assert.deepEqual(verdict.pending, []);
  assert.deepEqual(verdict.hardFailures, []);
  assert.equal(Object.isFrozen(verdict), true);
});

test("mount terminal identity requires the production lesson slug derived from selectedTopicId", () => {
  assert.throws(
    () => validateVisualizationLessonMountTerminalReceipt({
      expected: { ...mountExpected, lessonSlug: "fabricated-but-nonempty-slug" },
      receipt: mountReceipt(),
    }),
    /lessonSlug.*lessonSlugForTopicId|derived lesson slug/i,
  );
});

test("mount terminal validator distinguishes pending settle state from fail-closed mutation evidence", () => {
  const pendingReceipt = {
    ...mountReceipt(),
    activeRoot: { ...mountReceipt().activeRoot, count: 0, visible: false },
    digest: { current: "new", previous: "old", stablePolls: 1 },
    inFlightRelevantWriteKeys: ["POST /api/lesson-progress"],
    lessonProgressStartAck: null,
    visibleEnabledControlKeys: [],
  };
  const pending = validateVisualizationLessonMountTerminalReceipt({
    expected: mountExpected,
    receipt: pendingReceipt,
  });
  assert.equal(pending.terminal, false);
  assert.equal(pending.hardFailures.length, 0);
  assert.deepEqual(pending.pending, [
    "active-root-not-mounted",
    "learner-control-not-ready",
    "lesson-progress-start-not-acknowledged",
    "relevant-write-in-flight",
    "terminal-digest-not-stable",
  ]);

  const hardReceipt = {
    ...mountReceipt(),
    writes: [
      ...mountReceipt().writes,
      {
        body: { moduleId, topicId: selectedTopicId },
        method: "POST",
        pathname: "/api/visualization-sessions",
      },
    ],
  };
  const hard = validateVisualizationLessonMountTerminalReceipt({
    expected: mountExpected,
    receipt: hardReceipt,
  });
  assert.equal(hard.terminal, false);
  assert.deepEqual(hard.pending, []);
  assert.deepEqual(hard.hardFailures, ["mount-write-allowlist-violation"]);
});

test("mount terminal validator rejects a lesson start ACK for any other lesson identity", () => {
  const verdict = validateVisualizationLessonMountTerminalReceipt({
    expected: mountExpected,
    receipt: {
      ...mountReceipt(),
      lessonProgressStartAck: {
        ...mountReceipt().lessonProgressStartAck!,
        responseBytes: JSON.stringify({
          lesson: {
            slug: siblingTopicId,
            status: "in-progress",
            topicId: siblingTopicId,
          },
        }),
      },
    },
  });
  assert.equal(verdict.terminal, false);
  assert.deepEqual(verdict.hardFailures, ["lesson-progress-start-ack-invalid"]);
});

test("mount terminal validator requires correlated unique start and non-empty page-view ACKs", () => {
  const receipt = mountReceipt();
  const missingPageView = validateVisualizationLessonMountTerminalReceipt({
    expected: mountExpected,
    receipt: {
      ...receipt,
      lessonPageViewAck: null,
      writes: [receipt.writes[0]!],
    },
  });
  assert.equal(missingPageView.terminal, false);
  assert.deepEqual(missingPageView.pending, [
    "lesson-page-view-not-acknowledged",
  ]);

  const standaloneAck = validateVisualizationLessonMountTerminalReceipt({
    expected: mountExpected,
    receipt: {
      ...receipt,
      lessonPageViewAck: { ...receipt.lessonPageViewAck, writeIndex: 0 },
      writes: [receipt.writes[1]!],
    },
  });
  assert.equal(standaloneAck.terminal, false);
  assert.equal(
    standaloneAck.hardFailures.includes(
      "lesson-progress-start-write-count-not-one",
    ),
    true,
  );

  const duplicateStart = validateVisualizationLessonMountTerminalReceipt({
    expected: mountExpected,
    receipt: {
      ...receipt,
      lessonPageViewAck: { ...receipt.lessonPageViewAck, writeIndex: 2 },
      writes: [receipt.writes[0]!, receipt.writes[0]!, receipt.writes[1]!],
    },
  });
  assert.equal(duplicateStart.terminal, false);
  assert.equal(
    duplicateStart.hardFailures.includes(
      "lesson-progress-start-write-count-not-one",
    ),
    true,
  );
});

test("mount terminal validator requires the exact production-valid initial lesson page-view", () => {
  const receipt = mountReceipt();
  const pageViewWrite = receipt.writes[1]!;
  const pageViewBody = pageViewWrite.body as {
    readonly events: readonly Record<string, unknown>[];
    readonly generation: number;
  };
  const pageView = pageViewBody.events[0]!;
  const cases = [
    {
      label: "wrong-grade",
      event: { ...pageView, grade: "P1" },
    },
    {
      label: "missing-grade",
      event: Object.fromEntries(
        Object.entries(pageView).filter(([key]) => key !== "grade"),
      ),
    },
    {
      label: "noncanonical-timestamp",
      event: { ...pageView, timestamp: "2026-08-11 08:09:10Z" },
    },
    {
      label: "extra-field",
      event: { ...pageView, visualizationCompletion: true },
    },
  ] as const;

  for (const fixture of cases) {
    const verdict = validateVisualizationLessonMountTerminalReceipt({
      expected: mountExpected,
      receipt: {
        ...receipt,
        writes: [
          receipt.writes[0]!,
          {
            ...pageViewWrite,
            body: {
              events: [fixture.event],
              generation: pageViewBody.generation,
            },
          },
        ],
      },
    });
    assert.equal(verdict.terminal, false, fixture.label);
    assert.equal(
      verdict.hardFailures.includes("mount-write-allowlist-violation"),
      true,
      fixture.label,
    );
  }

  const extraEnvelopeKey = validateVisualizationLessonMountTerminalReceipt({
    expected: mountExpected,
    receipt: {
      ...receipt,
      writes: [
        receipt.writes[0]!,
        {
          ...pageViewWrite,
          body: { ...pageViewBody, deliveryHint: "forged" },
        },
      ],
    },
  });
  assert.equal(extraEnvelopeKey.terminal, false);
  assert.equal(
    extraEnvelopeKey.hardFailures.includes("mount-write-allowlist-violation"),
    true,
  );
});

test("first interaction validator binds exact ACK, API reread, raw session, reward, and gamification tuple", () => {
  const receipt = validateVisualizationLessonFirstInteraction(firstInteractionInput());
  assert.equal(receipt.selectedTopicId, selectedTopicId);
  assert.equal(receipt.appStateRevision, 8);
  assert.equal(receipt.rewardSourceKey, selectedRewardKey);
  assert.equal(receipt.rewardAmount, 20);
  assert.equal(receipt.gamificationRewardPoints, 20);
  assert.equal(receipt.gamificationXp, 45);
  assert.equal(Object.isFrozen(receipt), true);
});

test("first interaction validator rejects stale or additional request fields", () => {
  const input = firstInteractionInput();
  assert.throws(
    () =>
      validateVisualizationLessonFirstInteraction({
        ...input,
        request: {
          ...input.request,
          body: { ...input.request.body, explored: true },
        },
      }),
    /FIRST_INTERACTION_DURABILITY.*request-body/i,
  );
});

test("first interaction validator binds first-write timestamps, empty event stores, and exact lesson progress", () => {
  const later = "2026-08-11T08:09:11.000Z";

  const splitSessionPayload = completedPayload();
  (splitSessionPayload.visualization_sessions[0] as Record<string, unknown>).updated_at = later;
  (splitSessionPayload.reward_point_ledger[0] as Record<string, unknown>).created_at = later;
  (splitSessionPayload.gamification_events[0] as Record<string, unknown>).created_at = later;
  assert.throws(
    () =>
      validateVisualizationLessonFirstInteraction(
        firstInteractionInput(splitSessionPayload, 8, {
          ...exactSession(),
          updatedAt: later,
        }),
      ),
    /FIRST_INTERACTION_DURABILITY.*session.*timestamp/i,
  );

  const staleRewardPayload = completedPayload();
  (staleRewardPayload.reward_point_ledger[0] as Record<string, unknown>).created_at = later;
  assert.throws(
    () =>
      validateVisualizationLessonFirstInteraction(firstInteractionInput(staleRewardPayload)),
    /FIRST_INTERACTION_DURABILITY.*reward.*timestamp/i,
  );

  const staleGamificationPayload = completedPayload();
  (staleGamificationPayload.gamification_events[0] as Record<string, unknown>).created_at = later;
  assert.throws(
    () =>
      validateVisualizationLessonFirstInteraction(
        firstInteractionInput(staleGamificationPayload),
      ),
    /FIRST_INTERACTION_DURABILITY.*gamification.*timestamp/i,
  );

  const learningEventPayload = completedPayload();
  learningEventPayload.learning_events.push({
    created_at: completedAt,
    id: "unexpected-learning-event",
    source: sessionSource,
    topic_id: selectedTopicId,
    type: "visualization-slider",
    user_id: userId,
  });
  assert.throws(
    () =>
      validateVisualizationLessonFirstInteraction(firstInteractionInput(learningEventPayload)),
    /FIRST_INTERACTION_DURABILITY.*selected-event/i,
  );

  const visualizationEventPayload = completedPayload();
  visualizationEventPayload.visualization_events.push({
    created_at: completedAt,
    id: "unexpected-visualization-event",
    source: sessionSource,
    topic_id: selectedTopicId,
    user_id: userId,
  });
  assert.throws(
    () =>
      validateVisualizationLessonFirstInteraction(
        firstInteractionInput(visualizationEventPayload),
      ),
    /FIRST_INTERACTION_DURABILITY.*selected-event/i,
  );

  const lessonProgressPayload = completedPayload();
  (lessonProgressPayload.lesson_progress[0] as Record<string, unknown>).status =
    "completed";
  assert.throws(
    () =>
      validateVisualizationLessonFirstInteraction(
        firstInteractionInput(lessonProgressPayload),
      ),
    /FIRST_INTERACTION_DURABILITY.*lesson-progress/i,
  );
});

test("first interaction validator rejects sibling sessions and stale reward keys", () => {
  const siblingPayload = completedPayload();
  siblingPayload.visualization_sessions.push({
    user_id: userId,
    module_id: moduleId,
    topic_id: siblingTopicId,
    source: sessionSource,
    explored: true,
    completed_at: completedAt,
    updated_at: completedAt,
  });
  assert.throws(
    () => validateVisualizationLessonFirstInteraction(firstInteractionInput(siblingPayload)),
    /FIRST_INTERACTION_DURABILITY.*sibling-session/i,
  );

  const staleRewardPayload = completedPayload();
  (staleRewardPayload.reward_point_ledger[0] as Record<string, unknown>).source_key =
    `visualization-complete:${userId}:${moduleId}`;
  assert.throws(
    () =>
      validateVisualizationLessonFirstInteraction(
        firstInteractionInput(staleRewardPayload),
      ),
    /FIRST_INTERACTION_DURABILITY.*reward/i,
  );
});

test("duplicate replay validator requires byte-identical responses and raw app_state revision", () => {
  const first = validateVisualizationLessonFirstInteraction(firstInteractionInput());
  const replay = validateVisualizationLessonFirstInteraction(firstInteractionInput());
  const receipt = validateVisualizationLessonDuplicateReplay({ first, replay });
  assert.equal(receipt.idempotent, true);
  assert.equal(receipt.appStateRevision, 8);

  assert.throws(
    () =>
      validateVisualizationLessonDuplicateReplay({
        first,
        replay: { ...replay, appStateRevision: 9 },
      }),
    /DUPLICATE_REPLAY_NOT_IDEMPOTENT.*app-state-revision/i,
  );
  assert.throws(
    () =>
      validateVisualizationLessonDuplicateReplay({
        first,
        replay: { ...replay, responseBytes: `${replay.responseBytes}\n` },
      }),
    /DUPLICATE_REPLAY_NOT_IDEMPOTENT.*response-bytes/i,
  );
});

test("deadline error retains an immutable JSON-safe copy of the last terminal receipt", () => {
  const lastReceipt = validateVisualizationLessonMountTerminalReceipt({
    expected: mountExpected,
    receipt: {
      ...mountReceipt(),
      digest: { current: "new", previous: "old", stablePolls: 1 },
    },
  });
  const error = new VisualizationLessonTerminalDeadlineError({
    deadlineMs: 5_000,
    lastReceipt,
  });
  assert.equal(error.code, "VISUALIZATION_LESSON_TERMINAL_DEADLINE");
  assert.equal(error.deadlineMs, 5_000);
  assert.deepEqual(error.lastReceipt, lastReceipt);
  assert.notEqual(error.lastReceipt, lastReceipt);
  assert.equal(Object.isFrozen(error.lastReceipt), true);
  assert.equal(JSON.parse(JSON.stringify(error.lastReceipt)).terminal, false);
});
