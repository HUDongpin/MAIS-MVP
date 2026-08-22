import {
  expect,
  test,
  type APIResponse,
  type BrowserContext,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { join, resolve } from "node:path";
import { registerStudentApi } from "./helpers";
import {
  assertHkVisualizationAllTopicsState,
  assertHkVisualizationRenderNoWrite,
  assertHkVisualizationStateIsolation,
  buildHkVisualizationAllTopicsStateEvidence,
  buildHkVisualizationRenderNoWriteEvidence,
  buildHkVisualizationRenderNoWriteSnapshot,
  buildHkVisualizationStateIsolationEvidence,
  describeHkVisualizationRenderOnlyWrite,
  hkVisualizationLearningEventFixture,
  hkVisualizationSessionRecordFromPostBody,
  HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN,
  HK_VISUALIZATION_GRADE_SCOPE_IDS,
  HK_VISUALIZATION_RENDER_NO_WRITE_PLAN,
  HK_VISUALIZATION_STATE_ISOLATION_PLAN,
  HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS,
  HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS,
  isExactHkExploredVisualizationSession,
  isExactHkVisualizationSessionAcknowledgement,
  type HkVisualizationAllTopicsPostObservation,
  type HkVisualizationGradeScopeInput,
  type HkVisualizationStateIsolationExchange,
  type HkVisualizationStateIsolationTopicId,
} from "./hk-visualization-state-isolation-helpers";
import {
  assertHkVisualizationLessonSourceContract,
  buildHkVisualizationLessonSourceManifest,
  hkVisualizationVisibilityBlockers,
  type HkVisualizationVisibilityNode,
} from "./hk-visualization-lesson-embeddability-helpers";

const canonicalProject = "desktop-chrome";
const e2eDatabasePath = resolve(
  process.env.HK_MATH_DB_PATH?.trim() ||
    join(process.cwd(), ".tmp/e2e/hk-math-db.sqlite"),
);
const exactNewTopicLifecycleCases = [
  {
    analyticsSource: "geometry",
    parameterId: "a",
    siblingTopicId: "arc-length-sector-area",
    topicId: "identities-square-patterns",
  },
  {
    analyticsSource: "geometry",
    parameterId: "r",
    siblingTopicId: "identities-square-patterns",
    topicId: "arc-length-sector-area",
  },
] as const;
const pureStateIsolationUserId = "hk-viz-pure-student";

test.describe("HK Visualization Lab topic-scoped state isolation", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== canonicalProject,
      `API state-isolation gate runs once in ${canonicalProject}.`,
    );
  });

  test("51-topic reset/state contract supplies exact moduleId and topicId selectors", async ({}, testInfo) => {
    expect(HK_VISUALIZATION_STATE_ISOLATION_PLAN.moduleId).toBe(
      "configured-visualization-lab",
    );
    expect(HK_VISUALIZATION_STATE_ISOLATION_PLAN.topics).toHaveLength(2);
    expect(
      new Set(
        HK_VISUALIZATION_STATE_ISOLATION_PLAN.topics.map(
          (topic) => topic.topicId,
        ),
      ).size,
    ).toBe(2);

    for (const topic of HK_VISUALIZATION_STATE_ISOLATION_PLAN.topics) {
      expect(topic.moduleId).toBe(
        HK_VISUALIZATION_STATE_ISOLATION_PLAN.moduleId,
      );
      expect(topic.stateSelector).not.toBe("");
      expect(topic.resetSelector).toContain(
        '[data-viz-reset-module-id="configured-visualization-lab"]',
      );
      expect(topic.resetSelector).toContain(
        `[data-viz-reset-topic-id="${topic.topicId}"]`,
      );
    }
    expect(HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.topics).toHaveLength(51);
    expect(
      new Set(
        HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.topics.map(
          (topic) => topic.topicId,
        ),
      ).size,
    ).toBe(51);
    for (const topic of HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.topics) {
      expect(topic.moduleId).toBe("configured-visualization-lab");
      expect(topic.stateSelector).not.toBe("");
      expect(topic.resetSelector).toContain(
        `[data-viz-reset-topic-id="${topic.topicId}"]`,
      );
    }

    await testInfo.attach("hk-visualization-state-isolation-plan.json", {
      body: JSON.stringify(HK_VISUALIZATION_STATE_ISOLATION_PLAN, null, 2),
      contentType: "application/json",
    });
    await testInfo.attach("hk-visualization-all-topics-state-plan.json", {
      body: JSON.stringify(HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN, null, 2),
      contentType: "application/json",
    });
  });

  test("helper rejects a user+module overwrite with explicit missing-topic diagnostics", async () => {
    const evidence = buildHkVisualizationStateIsolationEvidence({
      authenticatedDisposableHkStudent: true,
      authenticatedUserId: pureStateIsolationUserId,
      exchanges: simulatedOverwriteExchanges(),
      generatedAt: "2026-08-09T00:00:00.000Z",
    });

    expect(evidence.status).toBe("failed");
    expect(evidence.observed.getSnapshots.beforeUpdate).toHaveLength(1);
    expect(evidence.observed.getSnapshots.afterAUpdate).toHaveLength(1);
    expect(evidence.observed.getSnapshots.afterADuplicate).toHaveLength(1);
    expect(evidence.observed.missingTopicIds).toEqual([
      "identities-square-patterns",
    ]);
    expect(() => assertHkVisualizationStateIsolation(evidence)).toThrow(
      /expected=2 actual=1 missingTopicIds=\[identities-square-patterns\]/,
    );
  });

  test("pure exact-new-topic evidence accepts coexistence and two idempotent completed repeats", async () => {
    const evidence = buildHkVisualizationStateIsolationEvidence({
      authenticatedDisposableHkStudent: true,
      authenticatedUserId: pureStateIsolationUserId,
      exchanges: exactTwoTopicExchanges(),
      generatedAt: "2026-08-09T00:00:00.500Z",
    });

    expect(evidence.status).toBe("passed");
    expect(evidence.contract).toMatchObject({
      duplicateWriteNoSecondEventOrReward: true,
      duplicateWritePreservedTopicACompletion: true,
      exactOwnerBoundPostAcknowledgements: true,
      exactRawGetRecordCounts: true,
      exactTwoTopicRecordsOnEveryGet: true,
      idempotentSameTripleNoDuplicate: true,
      noInvalidRawGetRecords: true,
      topicAStableAfterCompletedRepost: true,
      topicBStableAfterTopicAReposts: true,
    });
    assertHkVisualizationStateIsolation(evidence);
  });

  test("pure two-topic evidence rejects a malformed extra row in a raw GET response", async () => {
    const evidence = buildHkVisualizationStateIsolationEvidence({
      authenticatedDisposableHkStudent: true,
      authenticatedUserId: pureStateIsolationUserId,
      exchanges: exactTwoTopicExchanges({
        beforeUpdateExtraRows: [
          {
            explored: true,
            moduleId: "configured-visualization-lab",
            source: "lesson",
          },
        ],
      }),
      generatedAt: "2026-08-09T00:00:01.000Z",
    });

    expect(evidence.status).toBe("failed");
    expect(evidence.failures.join("\n")).toContain("invalid-raw-get-records");
  });

  test("pure two-topic evidence rejects a GET row missing required timestamp semantics", async () => {
    const beforeUpdate = exactTwoTopicSessions();
    const { updatedAt: _missingUpdatedAt, ...missingUpdatedAt } =
      beforeUpdate[0];
    const evidence = buildHkVisualizationStateIsolationEvidence({
      authenticatedDisposableHkStudent: true,
      authenticatedUserId: pureStateIsolationUserId,
      exchanges: exactTwoTopicExchanges({
        beforeUpdateSessions: [missingUpdatedAt, beforeUpdate[1]],
      }),
      generatedAt: "2026-08-09T00:00:02.000Z",
    });

    expect(evidence.status).toBe("failed");
    expect(evidence.failures.join("\n")).toContain("invalid-raw-get-records");
  });

  test("pure exact-new-topic evidence requires completed topic A and sibling topic B to stay stable", async () => {
    const evidence = buildHkVisualizationStateIsolationEvidence({
      authenticatedDisposableHkStudent: true,
      authenticatedUserId: pureStateIsolationUserId,
      exchanges: exactTwoTopicExchanges({ topicARepeatStable: false }),
      generatedAt: "2026-08-09T00:00:03.000Z",
    });

    expect(evidence.status).toBe("failed");
    expect(evidence.failures).toContain(
      "completed-topic-a-changed-after-idempotent-repost",
    );
  });

  test("pure duplicate evidence rejects recreation of the same triple completion", async () => {
    const evidence = buildHkVisualizationStateIsolationEvidence({
      authenticatedDisposableHkStudent: true,
      authenticatedUserId: pureStateIsolationUserId,
      exchanges: exactTwoTopicExchanges({ duplicateKeepsCompletion: false }),
      generatedAt: "2026-08-09T00:00:04.000Z",
    });

    expect(evidence.status).toBe("failed");
    expect(evidence.failures).toContain(
      "duplicate-write-recreated-topic-a-completion",
    );
  });

  test("pure 51-topic evidence rejects malformed extras instead of filtering them away", async () => {
    const gradeScopes = exactAllTopicGradeScopes({
      finalRowsTransform: (rows, grade) => grade === "P1"
        ? [...rows, {
            explored: true,
            moduleId: "configured-visualization-lab",
            source: "coordinate-plane",
          }]
        : rows,
    });
    const evidence = buildHkVisualizationAllTopicsStateEvidence({
      gradeScopes,
    });

    expect(evidence.status).toBe("failed");
    expect(evidence.failures.join("\n")).toContain("invalid-raw-get-records");
  });

  test("pure 51-topic evidence requires completedAt and updatedAt on every raw record", async () => {
    const gradeScopes = exactAllTopicGradeScopes({
      finalRowsTransform: (rows, grade) => {
        if (grade !== "P1") return rows;
        const { completedAt: _missingCompletedAt, ...missingCompletedAt } = rows[0];
        return [missingCompletedAt, ...rows.slice(1)];
      },
    });
    const evidence = buildHkVisualizationAllTopicsStateEvidence({
      gradeScopes,
    });

    expect(evidence.status).toBe("failed");
    expect(evidence.failures.join("\n")).toContain("invalid-raw-get-records");
  });

  test("pure auth evidence binds the active session to the newly registered student identity", async () => {
    const authBody = {
      settings: { selectedGrade: "S3" },
      user: {
        curriculumProfile: {
          publisher: "HK_UNITED_PRIME_MIA",
          region: "HK",
        },
        curriculumTrack: "HK",
        grade: "S3",
        id: "student-id-1",
        role: "student",
        username: "new-student@example.test",
      },
    };
    expect(isAuthenticatedHkStudent(authBody, "new-student@example.test", "S3")).toBe(
      true,
    );
    expect(
      isAuthenticatedHkStudent(authBody, "different-student@example.test", "S3"),
    ).toBe(false);
    expect(
      isAuthenticatedHkStudent(
        { user: { ...authBody.user, id: "" } },
        "new-student@example.test",
        "S3",
      ),
    ).toBe(false);
  });

  test("pure source-readiness and 51-topic persistence gates remain independent test cases", async () => {
    const source = readFileSync(
      join(process.cwd(), "tests/e2e/hk-visualization-state-isolation.spec.ts"),
      "utf8",
    );
    const sourceGateStart = source.indexOf(
      '\n  test("51-topic lesson source readiness is exact before lesson release"',
    );
    const persistenceGateStart = source.indexOf(
      '\n  test("51-topic API persistence retains exactly 51 distinct triples"',
    );

    expect(sourceGateStart).toBeGreaterThan(-1);
    expect(persistenceGateStart).toBeGreaterThan(sourceGateStart);
    const registrationStart = source.indexOf(
      "await registerStudentApi",
      persistenceGateStart,
    );
    expect(registrationStart).toBeGreaterThan(persistenceGateStart);
    const persistenceSetup = source.slice(
      persistenceGateStart,
      registrationStart,
    );
    expect(persistenceSetup).not.toContain(
      "buildHkVisualizationLessonSourceManifest",
    );
    expect(persistenceSetup).not.toContain(
      "assertHkVisualizationLessonSourceContract",
    );
  });

  test("pure render-only probes reject visualization writes without misclassifying ordinary lifecycle telemetry", async ({
    page,
  }) => {
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "GET",
        "/api/learning-events",
        null,
      ),
    ).toBeNull();
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/lesson-progress",
        "{}",
      ),
    ).toBeNull();
    expect(
      describeHkVisualizationRenderOnlyWrite("PATCH", "/api/profile", "{}"),
    ).toBeNull();
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/visualization-sessions",
        "{}",
      ),
    ).toBe("POST /api/visualization-sessions");
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/gamification/summary",
        "{}",
      ),
    ).toBe("POST /api/gamification/summary");
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/rewards/redeem",
        "{}",
      ),
    ).toBe("POST /api/rewards/redeem");
    for (const pathname of [
      "/api/visualization-sessions/",
      "/api/visualization-sessions/p1",
      "/api/gamification",
      "/api/teacher/gamification/campaigns",
      "/api/teacher/rewards/award",
      "/api/teacher/reward-awards",
    ]) {
      expect(
        describeHkVisualizationRenderOnlyWrite("POST", pathname, "{}"),
      ).toBe(`POST ${pathname}`);
    }
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/gamification-archive",
        "{}",
      ),
    ).toBeNull();
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/teacher/reward-awards-archive",
        "{}",
      ),
    ).toBeNull();
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/learning-events",
        JSON.stringify({
          events: [
            hkVisualizationLearningEventFixture("visualization-complete"),
          ],
        }),
      ),
    ).toContain("visualization-event-types=[visualization-complete]");
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/learning-events",
        JSON.stringify({
          events: [
            {
              ...hkVisualizationLearningEventFixture("page-view", 9),
              source: "visualization-lab",
            },
          ],
        }),
      ),
    ).toContain("visualization-event-types=[page-view@visualization-lab]");
    for (const source of [
      "function-graph",
      "function-model",
      "geometry",
      "probability",
      "coordinate-plane",
      "trig-wave",
      "calculus-stats",
    ] as const) {
      expect(
        describeHkVisualizationRenderOnlyWrite(
          "POST",
          "/api/learning-events",
          JSON.stringify({
            events: [
              {
                ...hkVisualizationLearningEventFixture("page-view", 10),
                source,
              },
            ],
          }),
        ),
      ).toContain(`visualization-event-types=[page-view@${source}]`);
    }
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/learning-events",
        JSON.stringify({
          events: [
            hkVisualizationLearningEventFixture("page-view", 1),
            hkVisualizationLearningEventFixture("mistake-review", 2),
          ],
        }),
      ),
    ).toBeNull();
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/learning-events",
        JSON.stringify({
          events: [
            hkVisualizationLearningEventFixture("page-view", 3),
            hkVisualizationLearningEventFixture("visualization-slider", 4),
            hkVisualizationLearningEventFixture("mistake-review", 5),
          ],
        }),
      ),
    ).toContain("visualization-event-types=[visualization-slider]");
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/learning-events",
        JSON.stringify({ events: [] }),
      ),
    ).toBeNull();
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/learning-events",
        JSON.stringify({ events: [{ type: "page-view" }, {}] }),
      ),
    ).toContain("unparseable-learning-events-payload");
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/learning-events",
        JSON.stringify([hkVisualizationLearningEventFixture("page-view", 6)]),
      ),
    ).toContain("unparseable-learning-events-payload");
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/learning-events",
        JSON.stringify({
          events: [hkVisualizationLearningEventFixture("unknown-event", 7)],
        }),
      ),
    ).toContain("unparseable-learning-events-payload");
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/learning-events",
        JSON.stringify({
          events: [
            {
              ...hkVisualizationLearningEventFixture("page-view", 8),
              timestamp: "not-a-time",
            },
          ],
        }),
      ),
    ).toContain("unparseable-learning-events-payload");
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/learning-events",
        null,
      ),
    ).toContain("unparseable-learning-events-payload");
    expect(
      describeHkVisualizationRenderOnlyWrite(
        "POST",
        "/api/learning-events",
        "{not-json",
      ),
    ).toContain("unparseable-learning-events-payload");

    const exitOnlyWrites: string[] = [];
    const exitOnlyPayload = JSON.stringify({
      events: [hkVisualizationLearningEventFixture("visualization-slider", 11)],
    });
    const onExitOnlyRequest = (request: {
      method(): string;
      postData(): string | null;
      url(): string;
    }) => {
      const descriptor = describeHkVisualizationRenderOnlyWrite(
        request.method(),
        new URL(request.url()).pathname,
        request.postData(),
      );
      if (descriptor) exitOnlyWrites.push(descriptor);
    };
    await page.route(
      "http://127.0.0.1:3020/api/learning-events",
      async (route) => {
        await route.fulfill({
          body: JSON.stringify({ accepted: 1 }),
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          status: 200,
        });
      },
    );
    page.on("request", onExitOnlyRequest);
    await page.setContent(
      "<main>Controlled render-only lifecycle fixture</main>",
    );
    await page.evaluate(
      ({ payload }) => {
        window.addEventListener(
          "pagehide",
          () => {
            void fetch("http://127.0.0.1:3020/api/learning-events", {
              body: payload,
              headers: { "content-type": "text/plain;charset=UTF-8" },
              keepalive: true,
              method: "POST",
            });
          },
          { once: true },
        );
      },
      { payload: exitOnlyPayload },
    );
    await flushHkVisualizationPageExitEvents(page);
    await expect
      .poll(() => [...exitOnlyWrites], {
        message: "The controlled pagehide fixture must expose its forbidden visualization event request.",
        timeout: 2_000,
      })
      .toEqual([
        "POST /api/learning-events visualization-event-types=[visualization-slider]",
      ]);
    page.off("request", onExitOnlyRequest);
    await page.unroute("http://127.0.0.1:3020/api/learning-events");
    expect(exitOnlyWrites).toEqual([
      "POST /api/learning-events visualization-event-types=[visualization-slider]",
    ]);

    const snapshot = buildHkVisualizationRenderNoWriteSnapshot({
      analyticsBody: { summary: { counts: { visualizationEvents: 0 } } },
      persistedRewardState: stablePersistedRewardState(),
      rewardsBody: stableGamificationBody(),
      sessionsBody: { sessions: [] },
    });
    expect(Object.values(snapshot.readable).every(Boolean)).toBe(true);
    const rejected = buildHkVisualizationRenderNoWriteEvidence({
      after: snapshot,
      before: snapshot,
      executedStepIds: HK_VISUALIZATION_RENDER_NO_WRITE_PLAN.steps,
      observedVisualizationWriteRequests: ["POST /api/rewards/redeem"],
    });
    expect(rejected.status).toBe("failed");
    expect(() => assertHkVisualizationRenderNoWrite(rejected)).toThrow(
      /unexpected-visualization-write-requests=\[POST \/api\/rewards\/redeem\]/,
    );

    const incompleteRewards = buildHkVisualizationRenderNoWriteSnapshot({
      analyticsBody: { summary: { counts: { visualizationEvents: 0 } } },
      persistedRewardState: stablePersistedRewardState(),
      rewardsBody: { gamification: { recentEvents: [], rewardSummary: {} } },
      sessionsBody: { sessions: [] },
    });
    expect(incompleteRewards.readable.rewards).toBe(false);
    const malformedSessions = buildHkVisualizationRenderNoWriteSnapshot({
      analyticsBody: { summary: { counts: { visualizationEvents: 0 } } },
      persistedRewardState: stablePersistedRewardState(),
      rewardsBody: stableGamificationBody(),
      sessionsBody: {
        sessions: [{ moduleId: "configured-visualization-lab" }],
      },
    });
    expect(malformedSessions.readable.sessions).toBe(false);
    const malformedPersistedRewards = buildHkVisualizationRenderNoWriteSnapshot({
      analyticsBody: { summary: { counts: { visualizationEvents: 0 } } },
      persistedRewardState: {
        gamificationEvents: [],
        rewardPointLedger: "not-an-array",
        rewardRedemptions: [],
      },
      rewardsBody: stableGamificationBody(),
      sessionsBody: { sessions: [] },
    });
    expect(malformedPersistedRewards.readable.persistedRewards).toBe(false);
    const malformedPersistedRewardEvidence =
      buildHkVisualizationRenderNoWriteEvidence({
        after: malformedPersistedRewards,
        before: snapshot,
        executedStepIds: HK_VISUALIZATION_RENDER_NO_WRITE_PLAN.steps,
        observedVisualizationWriteRequests: [],
      });
    expect(malformedPersistedRewardEvidence.status).toBe("failed");
    expect(() =>
      assertHkVisualizationRenderNoWrite(malformedPersistedRewardEvidence),
    ).toThrow(/read-only-session-event-reward-evidence-incomplete/);
  });

  test("pure 51-topic assertion preserves every legacy and new topic as a distinct triple", async ({}, testInfo) => {
    const passing = buildHkVisualizationAllTopicsStateEvidence({
      gradeScopes: exactAllTopicGradeScopes(),
    });
    expect(passing.status).toBe("passed");
    expect(passing.contract.exactCatalogExploredRecordShape).toBe(true);
    assertHkVisualizationAllTopicsState(passing);

    const rejectedShape = buildHkVisualizationAllTopicsStateEvidence({
      gradeScopes: exactAllTopicGradeScopes({
        finalRowsTransform: (rows, grade) => grade === "P1"
          ? rows.map((record, index) => index === 0
              ? { ...record, explored: false, source: "lesson" }
              : record)
          : rows,
      }),
    });
    expect(rejectedShape.status).toBe("failed");
    expect(rejectedShape.contract.exactCatalogExploredRecordShape).toBe(false);
    expect(() => assertHkVisualizationAllTopicsState(rejectedShape)).toThrow(
      /every-record-must-have-exact-catalog-source-and-explored=true/,
    );

    const rejected = buildHkVisualizationAllTopicsStateEvidence({
      gradeScopes: exactAllTopicGradeScopes({
        finalRowsTransform: (rows, grade) => grade === "S3"
          ? rows
              .filter((record) => record.topicId !== "identities-square-patterns")
              .concat({
                completedAt: "2026-08-09T00:02:00.000Z",
                explored: true,
                moduleId: "configured-visualization-lab",
                source: "function-graph",
                topicId: "quadratic-patterns",
                updatedAt: "2026-08-09T00:02:00.000Z",
              })
          : rows,
      }),
    });
    expect(rejected.status).toBe("failed");
    expect(rejected.observed.missingTopicIds).toContain(
      "identities-square-patterns",
    );
    expect(() => assertHkVisualizationAllTopicsState(rejected)).toThrow(
      /legacy-and-new-topic-ids-must-remain-four-separate-records/,
    );

    await testInfo.attach("hk-visualization-all-topics-pure-evidence.json", {
      body: JSON.stringify({ passing, rejected, rejectedShape }, null, 2),
      contentType: "application/json",
    });
  });

  test("one disposable student retains two exact topic records under the shared configured module", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const exchanges: HkVisualizationStateIsolationExchange[] = [];

    const registeredStudent = await registerStudentApi(page, testInfo, "S3");
    const authResponse = await page.request.get(
      "/api/auth/session-state?includeLessonEntry=false",
    );
    const authBody = await responseJson(authResponse);
    const authenticatedDisposableHkStudent = isAuthenticatedHkStudent(
      authBody,
      registeredStudent.username,
      "S3",
    );
    const userId = authenticatedUserId(
      authBody,
      registeredStudent.username,
      "S3",
    );
    expect(userId).not.toBeNull();
    if (!userId) {
      throw new Error("The two-topic state-isolation gate could not bind its disposable S3 learner.");
    }
    exchanges.push({
      body: redactedAuthEvidence(authBody, registeredStudent.username, "S3"),
      method: "GET",
      ok: authResponse.ok(),
      status: authResponse.status(),
      stepId: "auth/disposable-hk-student",
    });

    const post = async (
      stepId: string,
      topicId: HkVisualizationStateIsolationTopicId,
    ) => {
      const topicPlan = HK_VISUALIZATION_STATE_ISOLATION_PLAN.topics.find(
        (topic) => topic.topicId === topicId,
      );
      if (!topicPlan) throw new Error(`Missing two-topic persistence plan for ${topicId}.`);
      const request = {
        moduleId: HK_VISUALIZATION_STATE_ISOLATION_PLAN.moduleId,
        source: topicPlan.analyticsSource,
        topicId,
      } as const;
      const response = await page.request.post("/api/visualization-sessions", {
        headers: {
          "X-MAIS-Visualization-User-Id": encodeURIComponent(userId),
        },
        data: request,
      });
      exchanges.push({
        body: await responseJson(response),
        method: "POST",
        ok: response.ok(),
        ownerHeaderUserId: userId,
        request,
        status: response.status(),
        stepId,
      });
    };
    const list = async (stepId: string) => {
      const response = await page.request.get("/api/visualization-sessions");
      exchanges.push({
        body: await responseJson(response),
        method: "GET",
        ok: response.ok(),
        status: response.status(),
        stepId,
      });
    };
    const readSideEffect = async (stepId: string, pathname: string) => {
      const response = await page.request.get(pathname);
      exchanges.push({
        body: await responseJson(response),
        method: "GET",
        ok: response.ok(),
        status: response.status(),
        stepId,
      });
    };

    await post(
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postAInitial,
      HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[0],
    );
    await post(
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postBInitial,
      HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[1],
    );
    await list(HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getBeforeUpdate);
    // A and B are already completed. Every later identical POST is an
    // idempotent replay and must preserve the complete row byte-for-byte.
    await post(
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postAUpdate,
      HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[0],
    );
    await list(HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAfterAUpdate);
    await page.waitForTimeout(500);
    await readSideEffect(
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAnalyticsBeforeDuplicate,
      "/api/analytics/summary?grade=S3&window=7d",
    );
    await readSideEffect(
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getGamificationBeforeDuplicate,
      "/api/gamification/summary",
    );
    await post(
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postADuplicate,
      HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[0],
    );
    await list(HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAfterADuplicate);
    await page.waitForTimeout(500);
    await readSideEffect(
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAnalyticsAfterDuplicate,
      "/api/analytics/summary?grade=S3&window=7d",
    );
    await readSideEffect(
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getGamificationAfterDuplicate,
      "/api/gamification/summary",
    );

    const evidence = buildHkVisualizationStateIsolationEvidence({
      authenticatedDisposableHkStudent,
      authenticatedUserId: userId,
      exchanges,
    });
    await testInfo.attach("hk-visualization-state-isolation-evidence.json", {
      body: JSON.stringify(redactDisposableUserId(evidence, userId), null, 2),
      contentType: "application/json",
    });

    expect(evidence.ledger.executedStepIds).toEqual(
      evidence.ledger.plannedStepIds,
    );
    expect(evidence.ledger.missingStepIds).toEqual([]);
    expect(evidence.ledger.duplicateStepIds).toEqual([]);

    // Both exact new S3 topics must coexist under the shared module. Every
    // completed replay is fully idempotent; neither topic may overwrite the other.
    assertHkVisualizationStateIsolation(evidence);
  });

  test("rendering an embedded lesson lab without interaction creates no session, visualization event, or reward", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const registeredStudent = await registerStudentApi(page, testInfo, "P1");
    const authResponse = await page.request.get(
      "/api/auth/session-state?includeLessonEntry=false",
    );
    const authBody = await responseJson(authResponse);
    const userId = authenticatedUserId(authBody, registeredStudent.username, "P1");
    expect(authResponse.ok()).toBe(true);
    expect(userId).not.toBeNull();
    if (!userId) {
      throw new Error(
        "The render-only gate could not bind the registered P1 learner to a durable user id.",
      );
    }
    const executedStepIds: string[] = [];
    const observedVisualizationWriteRequests: string[] = [];
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      const descriptor = describeHkVisualizationRenderOnlyWrite(
        request.method(),
        pathname,
        request.postData(),
      );
      if (descriptor) observedVisualizationWriteRequests.push(descriptor);
    });

    const before = await readNoWriteSnapshot(
      page,
      "before",
      executedStepIds,
      userId,
    );
    await page.goto(HK_VISUALIZATION_RENDER_NO_WRITE_PLAN.lessonRoute, {
      waitUntil: "domcontentloaded",
    });
    executedStepIds.push("render/p1-counting-number-bonds");
    const visualizationSection = page.locator("section#visualization");
    const activeLab = visualizationSection.locator(
      '[data-viz-active-lab-id="p1-counting-number-bonds"]',
    );
    await expect(visualizationSection).toHaveCount(1);
    await expectPerceptiblyVisible(
      visualizationSection,
      "render-only Visualization Lab section",
      20_000,
    );
    await expect(activeLab).toHaveCount(1);
    await expectPerceptiblyVisible(
      activeLab,
      "render-only active Visualization Lab root",
      20_000,
    );
    await page.waitForTimeout(5_500);
    await flushHkVisualizationPageExitEvents(page);
    executedStepIds.push("flush/pagehide");
    const after = await readNoWriteSnapshot(
      page,
      "after",
      executedStepIds,
      userId,
    );
    const evidence = buildHkVisualizationRenderNoWriteEvidence({
      after,
      before,
      executedStepIds,
      observedVisualizationWriteRequests,
    });
    await testInfo.attach("hk-visualization-render-no-write-evidence.json", {
      body: JSON.stringify(redactDisposableUserId(evidence, userId), null, 2),
      contentType: "application/json",
    });
    assertHkVisualizationRenderNoWrite(evidence);
  });

  for (const lifecycleCase of exactNewTopicLifecycleCases) {
    test(`exact new topic ${lifecycleCase.topicId} separates lesson start from first lab interaction`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(120_000);
      const registeredStudent = await registerStudentApi(page, testInfo, "S3");
      const authResponse = await page.request.get(
        "/api/auth/session-state?includeLessonEntry=false",
      );
      const authBody = await responseJson(authResponse);
      const userId = authenticatedUserId(authBody, registeredStudent.username, "S3");
      expect(authResponse.ok()).toBe(true);
      expect(userId).not.toBeNull();
      if (!userId)
        throw new Error(
          "The exact-topic lifecycle gate could not bind the registered learner to a durable user id.",
        );

      const trackedTopicIds = [
        lifecycleCase.topicId,
        lifecycleCase.siblingTopicId,
      ] as const;
      const preNavigation = readExactTopicPersistenceSnapshot(
        userId,
        trackedTopicIds,
      );
      expect(preNavigation.lessonProgress).toEqual([]);
      expect(preNavigation.visualizationSessions).toEqual([]);
      expect(preNavigation.visualizationEvents).toEqual([]);
      expect(preNavigation.visualizationLearningEvents).toEqual([]);

      const observedVisualizationWriteRequests: string[] = [];
      page.on("request", (request) => {
        const descriptor = describeHkVisualizationRenderOnlyWrite(
          request.method(),
          new URL(request.url()).pathname,
          request.postData(),
        );
        if (descriptor) observedVisualizationWriteRequests.push(descriptor);
      });

      const lessonStartResponsePromise = page.waitForResponse(
        (response) => {
          const request = response.request();
          return (
            request.method() === "POST" &&
            new URL(response.url()).pathname === "/api/lesson-progress" &&
            request
              .postData()
              ?.includes(`\"slug\":\"${lifecycleCase.topicId}\"`) === true &&
            request.postData()?.includes('\"action\":\"start\"') === true
          );
        },
        { timeout: 30_000 },
      );
      await page.goto(`/student/lessons/${lifecycleCase.topicId}`, {
        waitUntil: "domcontentloaded",
      });
      const lessonStartResponse = await lessonStartResponsePromise;
      expect(lessonStartResponse.ok()).toBe(true);
      await expectPerceptiblyVisible(
        page.locator("section#visualization"),
        `${lifecycleCase.topicId} Visualization Lab section`,
        20_000,
      );
      await page.waitForTimeout(1_200);

      const afterLessonStart = readExactTopicPersistenceSnapshot(
        userId,
        trackedTopicIds,
      );
      expect(afterLessonStart.lessonProgress).toHaveLength(1);
      expect(afterLessonStart.lessonProgress[0]).toMatchObject({
        lesson_slug: lifecycleCase.topicId,
        status: "in-progress",
        topic_id: lifecycleCase.topicId,
        user_id: userId,
      });
      expect(afterLessonStart.visualizationSessions).toEqual([]);
      expect(afterLessonStart.visualizationEvents).toEqual([]);
      expect(afterLessonStart.visualizationLearningEvents).toEqual([]);
      expect(afterLessonStart.rewardState).toEqual(preNavigation.rewardState);
      expect(observedVisualizationWriteRequests).toEqual([]);

      await testInfo.attach(
        `hk-visualization-${lifecycleCase.topicId}-render-stage.json`,
        {
          body: JSON.stringify(
            redactDisposableUserId(
              {
                afterLessonStart,
                observedVisualizationWriteRequests,
                preNavigation,
                selectedTopicId: lifecycleCase.topicId,
                siblingTopicId: lifecycleCase.siblingTopicId,
              },
              userId,
            ),
            null,
            2,
          ),
          contentType: "application/json",
        },
      );

      const activeLab = page.locator(
        `section#visualization [data-viz-active-lab-id="${lifecycleCase.topicId}"]`,
      );
      await expect(activeLab).toHaveCount(1);
      await expectPerceptiblyVisible(
        activeLab,
        `${lifecycleCase.topicId} active Visualization Lab root`,
        20_000,
      );
      const parameter = activeLab.locator(
        `input[type="range"][data-viz-parameter="${lifecycleCase.parameterId}"]`,
      );
      await expect(parameter).toHaveCount(1);
      await expect(parameter).toBeEnabled();
      const beforeParameterValue = await parameter.inputValue();
      await parameter.focus();
      await parameter.press("ArrowRight");
      await expect(parameter).not.toHaveValue(beforeParameterValue);

      await flushHkVisualizationPageExitEvents(page);
      await expect
        .poll(
          () => {
            const snapshot = readExactTopicPersistenceSnapshot(
              userId,
              trackedTopicIds,
            );
            const exactSession =
              snapshot.visualizationSessions.length === 1 &&
              snapshot.visualizationSessions.every(
                (session) =>
                  session.user_id === userId &&
                  session.module_id === "configured-visualization-lab" &&
                  session.topic_id === lifecycleCase.topicId &&
                  session.source === lifecycleCase.analyticsSource &&
                  session.explored === true,
              );
            const exactVisualizationEvent =
              snapshot.visualizationEvents.length > 0 &&
              snapshot.visualizationEvents.every(
                (event) =>
                  event.user_id === userId &&
                  event.topic_id === lifecycleCase.topicId &&
                  event.source === lifecycleCase.analyticsSource,
              );
            const exactVisualizationLearningEvent =
              snapshot.visualizationLearningEvents.length > 0 &&
              snapshot.visualizationLearningEvents.every(
                (event) =>
                  event.user_id === userId &&
                  event.topic_id === lifecycleCase.topicId &&
                  event.source === lifecycleCase.analyticsSource,
              ) &&
              snapshot.visualizationLearningEvents.some(
                (event) => event.type === "visualization-slider",
              );
            return {
              exactSession,
              exactVisualizationEvent,
              exactVisualizationLearningEvent,
            };
          },
          {
            message:
              `The first real ${lifecycleCase.topicId} interaction must durably persist ` +
              "its exact session, visualization event, and visualization-slider learning event.",
            timeout: 20_000,
          },
        )
        .toEqual({
          exactSession: true,
          exactVisualizationEvent: true,
          exactVisualizationLearningEvent: true,
        });
      const afterLabInteraction = readExactTopicPersistenceSnapshot(
        userId,
        trackedTopicIds,
      );

      expect(afterLabInteraction.lessonProgress).toEqual(
        afterLessonStart.lessonProgress,
      );
      expect(afterLabInteraction.visualizationSessions).toHaveLength(1);
      expect(afterLabInteraction.visualizationSessions[0]).toMatchObject({
        explored: true,
        module_id: "configured-visualization-lab",
        topic_id: lifecycleCase.topicId,
        user_id: userId,
      });
      expect(afterLabInteraction.visualizationEvents.length).toBeGreaterThan(0);
      expect(
        afterLabInteraction.visualizationEvents.every(
          (event) =>
            event.topic_id === lifecycleCase.topicId &&
            event.source === lifecycleCase.analyticsSource,
        ),
      ).toBe(true);
      expect(
        afterLabInteraction.visualizationLearningEvents.length,
      ).toBeGreaterThan(0);
      expect(
        afterLabInteraction.visualizationLearningEvents.every(
          (event) =>
            event.topic_id === lifecycleCase.topicId &&
            event.source === lifecycleCase.analyticsSource,
        ),
      ).toBe(true);
      expect(
        afterLabInteraction.visualizationLearningEvents.some(
          (event) => event.type === "visualization-slider",
        ),
      ).toBe(true);

      const duplicateResponse = await page.request.post(
        "/api/visualization-sessions",
        {
          headers: {
            "X-MAIS-Visualization-User-Id": encodeURIComponent(userId),
          },
          data: {
            moduleId: "configured-visualization-lab",
            source: lifecycleCase.analyticsSource,
            topicId: lifecycleCase.topicId,
          },
        },
      );
      expect(duplicateResponse.ok()).toBe(true);
      expect(duplicateResponse.status()).toBe(200);
      const duplicateBody = await responseJson(duplicateResponse);
      expect(
        isExactHkVisualizationSessionAcknowledgement(
          duplicateBody,
          userId,
          lifecycleCase.topicId,
        ),
      ).toBe(true);
      const afterDuplicate = readExactTopicPersistenceSnapshot(
        userId,
        trackedTopicIds,
      );
      expect(afterDuplicate.lessonProgress).toEqual(
        afterLabInteraction.lessonProgress,
      );
      expect(afterDuplicate.visualizationSessions).toEqual(
        afterLabInteraction.visualizationSessions,
      );
      expect(afterDuplicate.visualizationEvents).toEqual(
        afterLabInteraction.visualizationEvents,
      );
      expect(afterDuplicate.visualizationLearningEvents).toEqual(
        afterLabInteraction.visualizationLearningEvents,
      );
      expect(afterDuplicate.rewardState).toEqual(
        afterLabInteraction.rewardState,
      );

      await testInfo.attach(
        `hk-visualization-${lifecycleCase.topicId}-lifecycle.json`,
        {
          body: JSON.stringify(
            redactDisposableUserId(
              {
                afterDuplicate,
                afterLabInteraction,
                afterLessonStart,
                observedVisualizationWriteRequests,
                preNavigation,
                selectedTopicId: lifecycleCase.topicId,
                siblingTopicId: lifecycleCase.siblingTopicId,
              },
              userId,
            ),
            null,
            2,
          ),
          contentType: "application/json",
        },
      );
    });
  }

  test("51-topic lesson source readiness is exact before lesson release", async ({}, testInfo) => {
    const sourceManifest = buildHkVisualizationLessonSourceManifest();
    await testInfo.attach("hk-visualization-all-topics-source-gate.json", {
      body: JSON.stringify(sourceManifest, null, 2),
      contentType: "application/json",
    });

    // Source readiness is its own hard gate. A source mismatch must not prevent
    // the independent API persistence test below from exercising all 51 keys.
    assertHkVisualizationLessonSourceContract(sourceManifest);
  });

  test("51-topic API persistence retains exactly 51 distinct triples", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const baseURL = testInfo.project.use.baseURL;
    if (typeof baseURL !== "string" || !baseURL.trim()) {
      throw new Error("The 51-topic state gate requires the canonical Playwright baseURL.");
    }

    const contexts: BrowserContext[] = [];
    const owners: Array<{
      authenticatedInitially: boolean;
      beforeSessionsBody: unknown;
      context: BrowserContext;
      grade: (typeof HK_VISUALIZATION_GRADE_SCOPE_IDS)[number];
      ownerUserId: string;
      postResults: HkVisualizationAllTopicsPostObservation[];
      username: string;
    }> = [];

    try {
      for (const grade of HK_VISUALIZATION_GRADE_SCOPE_IDS) {
        const context = await browser.newContext({ baseURL });
        contexts.push(context);
        const gradePage = await context.newPage();
        // registerStudentApi uses a millisecond-based suffix. Keep sequential
        // grade owners deterministic even on an unusually fast local server.
        await gradePage.waitForTimeout(2);
        const registeredStudent = await registerStudentApi(
          gradePage,
          testInfo,
          grade,
        );
        const authResponse = await context.request.get(
          "/api/auth/session-state?includeLessonEntry=false",
        );
        const authBody = await responseJson(authResponse);
        const authenticatedInitially = authResponse.ok()
          && isAuthenticatedHkStudent(authBody, registeredStudent.username, grade);
        const ownerUserId = authenticatedUserId(
          authBody,
          registeredStudent.username,
          grade,
        );
        if (!ownerUserId) {
          throw new Error(`The ${grade} persistence scope could not bind its disposable HK learner.`);
        }

        const beforeResponse = await context.request.get(
          "/api/visualization-sessions",
        );
        const beforeSessionsBody = beforeResponse.ok()
          ? await responseJson(beforeResponse)
          : null;
        const postResults: HkVisualizationAllTopicsPostObservation[] = [];
        const gradeTopics = HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.topics.filter(
          (topic) => topic.grade === grade,
        );
        for (const topic of gradeTopics) {
          const request = {
            moduleId: topic.moduleId,
            source: topic.analyticsSource,
            topicId: topic.topicId,
          } as const;
          const response = await context.request.post(
            "/api/visualization-sessions",
            {
              headers: {
                "X-MAIS-Visualization-User-Id": encodeURIComponent(ownerUserId),
              },
              data: request,
            },
          );
          postResults.push({
            body: await responseJson(response),
            ok: response.ok(),
            ownerHeaderUserId: ownerUserId,
            request,
            status: response.status(),
          });
        }

        owners.push({
          authenticatedInitially,
          beforeSessionsBody,
          context,
          grade,
          ownerUserId,
          postResults,
          username: registeredStudent.username,
        });
      }

      const gradeScopes: HkVisualizationGradeScopeInput[] = [];
      const redactedOwnerEvidence: Array<Record<string, unknown>> = [];
      for (const owner of owners) {
        const finalAuthResponse = await owner.context.request.get(
          "/api/auth/session-state?includeLessonEntry=false",
        );
        const finalAuthBody = await responseJson(finalAuthResponse);
        const finalAuthExact = finalAuthResponse.ok()
          && authenticatedUserId(finalAuthBody, owner.username, owner.grade)
            === owner.ownerUserId;
        const finalResponse = await owner.context.request.get(
          "/api/visualization-sessions",
        );
        const finalSessionsBody = finalResponse.ok()
          ? await responseJson(finalResponse)
          : null;
        gradeScopes.push({
          authenticatedGradeMatchedHkStudent:
            owner.authenticatedInitially && finalAuthExact,
          beforeSessionsBody: owner.beforeSessionsBody,
          executedTopicIds: owner.postResults.map(
            (result) => result.request.topicId,
          ),
          finalSessionsBody,
          grade: owner.grade,
          ownerUserId: owner.ownerUserId,
          postResults: owner.postResults,
        });
        redactedOwnerEvidence.push({
          auth: redactedAuthEvidence(finalAuthBody, owner.username, owner.grade),
          beforeGetReadable: isRecord(owner.beforeSessionsBody),
          finalGetStatus: finalResponse.status(),
          grade: owner.grade,
          postResults: owner.postResults.map((result) => ({
            acknowledgementExact: isExactHkVisualizationSessionAcknowledgement(
              result.body,
              owner.ownerUserId,
              result.request.topicId,
            ),
            ok: result.ok,
            source: result.request.source,
            status: result.status,
            topicId: result.request.topicId,
          })),
        });
      }

      const evidence = buildHkVisualizationAllTopicsStateEvidence({
        gradeScopes,
      });
      await testInfo.attach("hk-visualization-all-topics-auth-evidence.json", {
        body: JSON.stringify(redactedOwnerEvidence, null, 2),
        contentType: "application/json",
      });
      await testInfo.attach("hk-visualization-all-topics-runtime-evidence.json", {
        body: JSON.stringify({ evidence, owners: redactedOwnerEvidence }, null, 2),
        contentType: "application/json",
      });
      assertHkVisualizationAllTopicsState(evidence);
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
});

function simulatedOverwriteExchanges(): HkVisualizationStateIsolationExchange[] {
  const postSteps = [
    [
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postAInitial,
      HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[0],
    ],
    [
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postBInitial,
      HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[1],
    ],
    [
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postAUpdate,
      HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[0],
    ],
    [
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postADuplicate,
      HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[0],
    ],
  ] as const;
  const postExchanges = postSteps.map(([stepId, topicId]) => ({
    body: {
      acknowledgedUserId: pureStateIsolationUserId,
      durablyPersisted: true,
      session: exactSession(topicId),
    },
    method: "POST" as const,
    ok: true,
    ownerHeaderUserId: pureStateIsolationUserId,
    request: {
      moduleId: HK_VISUALIZATION_STATE_ISOLATION_PLAN.moduleId,
      source: twoTopicPlan(topicId).analyticsSource,
      topicId,
    },
    status: 200,
    stepId,
  }));
  const overwrittenTopicId = HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[1];
  const oneRecordBody = { sessions: [exactSession(overwrittenTopicId)] };
  const analyticsBody = { summary: { counts: { visualizationEvents: 0 } } };
  const gamificationBody = stableGamificationBody();

  return [
    {
      body: { curriculumTrack: "HK", role: "student" },
      method: "GET",
      ok: true,
      status: 200,
      stepId: HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.auth,
    },
    postExchanges[0],
    postExchanges[1],
    {
      body: oneRecordBody,
      method: "GET",
      ok: true,
      status: 200,
      stepId: HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getBeforeUpdate,
    },
    postExchanges[2],
    {
      body: oneRecordBody,
      method: "GET",
      ok: true,
      status: 200,
      stepId: HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAfterAUpdate,
    },
    {
      body: analyticsBody,
      method: "GET",
      ok: true,
      status: 200,
      stepId:
        HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAnalyticsBeforeDuplicate,
    },
    {
      body: gamificationBody,
      method: "GET",
      ok: true,
      status: 200,
      stepId:
        HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getGamificationBeforeDuplicate,
    },
    postExchanges[3],
    {
      body: oneRecordBody,
      method: "GET",
      ok: true,
      status: 200,
      stepId: HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAfterADuplicate,
    },
    {
      body: analyticsBody,
      method: "GET",
      ok: true,
      status: 200,
      stepId:
        HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAnalyticsAfterDuplicate,
    },
    {
      body: gamificationBody,
      method: "GET",
      ok: true,
      status: 200,
      stepId:
        HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getGamificationAfterDuplicate,
    },
  ];
}

function twoTopicPlan(topicId: HkVisualizationStateIsolationTopicId) {
  const topic = HK_VISUALIZATION_STATE_ISOLATION_PLAN.topics.find(
    (candidate) => candidate.topicId === topicId,
  );
  if (!topic) throw new Error(`Missing two-topic persistence plan for ${topicId}.`);
  return topic;
}

function exactSession(topicId: HkVisualizationStateIsolationTopicId) {
  const topic = twoTopicPlan(topicId);
  return {
    completedAt: "2026-08-09T00:00:00.000Z",
    explored: true,
    moduleId: HK_VISUALIZATION_STATE_ISOLATION_PLAN.moduleId,
    source: topic.analyticsSource,
    topicId,
    updatedAt: "2026-08-09T00:00:00.000Z",
  };
}

function exactAllTopicSession(
  topic: (typeof HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.topics)[number],
  index: number,
) {
  return {
    completedAt: `2026-08-09T00:01:${String(index).padStart(2, "0")}.000Z`,
    explored: true,
    moduleId: topic.moduleId,
    source: topic.analyticsSource,
    topicId: topic.topicId,
    updatedAt: `2026-08-09T00:01:${String(index).padStart(2, "0")}.000Z`,
  };
}

function exactAllTopicGradeScopes(
  options: {
    finalRowsTransform?: (
      rows: ReturnType<typeof exactAllTopicSession>[],
      grade: (typeof HK_VISUALIZATION_GRADE_SCOPE_IDS)[number],
    ) => unknown[];
  } = {},
): HkVisualizationGradeScopeInput[] {
  return HK_VISUALIZATION_GRADE_SCOPE_IDS.map((grade) => {
    const ownerUserId = `pure-hk-viz-${grade.toLowerCase()}-student`;
    const gradeTopics = HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.topics.filter(
      (topic) => topic.grade === grade,
    );
    const exactRows = gradeTopics.map((topic) =>
      exactAllTopicSession(
        topic,
        HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.topics.findIndex(
          (candidate) => candidate.topicId === topic.topicId,
        ),
      ),
    );
    const postResults: HkVisualizationAllTopicsPostObservation[] = gradeTopics.map(
      (topic, index) => {
        const request = {
          moduleId: topic.moduleId,
          source: topic.analyticsSource,
          topicId: topic.topicId,
        } as const;
        return {
          body: {
            acknowledgedUserId: ownerUserId,
            durablyPersisted: true,
            session: exactRows[index],
          },
          ok: true,
          ownerHeaderUserId: ownerUserId,
          request,
          status: 200,
        };
      },
    );
    return {
      authenticatedGradeMatchedHkStudent: true,
      beforeSessionsBody: { sessions: [] },
      executedTopicIds: gradeTopics.map((topic) => topic.topicId),
      finalSessionsBody: {
        sessions: options.finalRowsTransform
          ? options.finalRowsTransform(exactRows, grade)
          : exactRows,
      },
      grade,
      ownerUserId,
      postResults,
    };
  });
}

function exactTwoTopicSessions() {
  return [
    exactSessionAt(
      HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[0],
      "2026-08-09T00:00:00.000Z",
    ),
    exactSessionAt(
      HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[1],
      "2026-08-09T00:00:00.100Z",
    ),
  ];
}

function exactSessionAt(
  topicId: HkVisualizationStateIsolationTopicId,
  updatedAt: string,
  completedAt = topicId === HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[0]
    ? "2026-08-09T00:00:00.000Z"
    : "2026-08-09T00:00:00.100Z",
) {
  const topic = twoTopicPlan(topicId);
  return {
    completedAt,
    explored: true,
    moduleId: HK_VISUALIZATION_STATE_ISOLATION_PLAN.moduleId,
    source: topic.analyticsSource,
    topicId,
    updatedAt,
  };
}

function exactTwoTopicExchanges(
  options: {
    beforeUpdateExtraRows?: unknown[];
    beforeUpdateSessions?: unknown[];
    duplicateKeepsCompletion?: boolean;
    topicARepeatStable?: boolean;
  } = {},
): HkVisualizationStateIsolationExchange[] {
  const topicA = HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[0];
  const topicB = HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[1];
  const beforeUpdate = options.beforeUpdateSessions ?? exactTwoTopicSessions();
  const topicBRecord = exactSessionAt(topicB, "2026-08-09T00:00:00.100Z");
  const topicAAfterUpdate = exactSessionAt(
    topicA,
    options.topicARepeatStable === false
      ? "2026-08-09T00:00:00.200Z"
      : "2026-08-09T00:00:00.000Z",
  );
  const topicAAfterDuplicate = exactSessionAt(
    topicA,
    options.topicARepeatStable === false
      ? "2026-08-09T00:00:00.200Z"
      : "2026-08-09T00:00:00.000Z",
    options.duplicateKeepsCompletion === false
      ? "2026-08-09T00:00:00.250Z"
      : "2026-08-09T00:00:00.000Z",
  );
  const analyticsBody = { summary: { counts: { visualizationEvents: 2 } } };
  const gamificationBody = stableGamificationBody();
  const post = (
    stepId: string,
    topicId: HkVisualizationStateIsolationTopicId,
    session: ReturnType<typeof exactSessionAt>,
  ): HkVisualizationStateIsolationExchange => ({
    body: {
      acknowledgedUserId: pureStateIsolationUserId,
      durablyPersisted: true,
      session,
    },
    method: "POST",
    ok: true,
    ownerHeaderUserId: pureStateIsolationUserId,
    request: {
      moduleId: HK_VISUALIZATION_STATE_ISOLATION_PLAN.moduleId,
      source: twoTopicPlan(topicId).analyticsSource,
      topicId,
    },
    status: 200,
    stepId,
  });
  const get = (
    stepId: string,
    sessions: unknown,
  ): HkVisualizationStateIsolationExchange => ({
    body: { sessions },
    method: "GET",
    ok: true,
    status: 200,
    stepId,
  });

  return [
    {
      body: { authenticated: true, identityMatched: true },
      method: "GET",
      ok: true,
      status: 200,
      stepId: HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.auth,
    },
    post(
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postAInitial,
      topicA,
      exactSessionAt(topicA, "2026-08-09T00:00:00.000Z"),
    ),
    post(
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postBInitial,
      topicB,
      topicBRecord,
    ),
    get(HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getBeforeUpdate, [
      ...beforeUpdate,
      ...(options.beforeUpdateExtraRows ?? []),
    ]),
    post(
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postAUpdate,
      topicA,
      topicAAfterUpdate,
    ),
    get(HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAfterAUpdate, [
      topicAAfterUpdate,
      topicBRecord,
    ]),
    {
      body: analyticsBody,
      method: "GET",
      ok: true,
      status: 200,
      stepId:
        HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAnalyticsBeforeDuplicate,
    },
    {
      body: gamificationBody,
      method: "GET",
      ok: true,
      status: 200,
      stepId:
        HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getGamificationBeforeDuplicate,
    },
    post(
      HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postADuplicate,
      topicA,
      topicAAfterDuplicate,
    ),
    get(HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAfterADuplicate, [
      topicAAfterDuplicate,
      topicBRecord,
    ]),
    {
      body: analyticsBody,
      method: "GET",
      ok: true,
      status: 200,
      stepId:
        HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAnalyticsAfterDuplicate,
    },
    {
      body: gamificationBody,
      method: "GET",
      ok: true,
      status: 200,
      stepId:
        HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getGamificationAfterDuplicate,
    },
  ];
}

async function readNoWriteSnapshot(
  page: Page,
  phase: "after" | "before",
  executedStepIds: string[],
  userId: string,
) {
  const sessionsResponse = await page.request.get(
    "/api/visualization-sessions",
  );
  const sessionsBody = await responseJson(sessionsResponse);
  executedStepIds.push(`${phase}/visualization-sessions`);

  const analyticsResponse = await page.request.get(
    "/api/analytics/summary?grade=P1&window=7d",
  );
  const analyticsBody = await responseJson(analyticsResponse);
  executedStepIds.push(`${phase}/analytics-summary`);

  const gamificationResponse = await page.request.get(
    "/api/gamification/summary",
  );
  const rewardsBody = await responseJson(gamificationResponse);
  executedStepIds.push(`${phase}/gamification-summary`);
  const persistedRewardState = readExactTopicPersistenceSnapshot(
    userId,
    [HK_VISUALIZATION_RENDER_NO_WRITE_PLAN.topicId],
  ).rewardState;

  return buildHkVisualizationRenderNoWriteSnapshot({
    analyticsBody: analyticsResponse.ok() ? analyticsBody : null,
    persistedRewardState,
    rewardsBody: gamificationResponse.ok() ? rewardsBody : null,
    sessionsBody: sessionsResponse.ok() ? sessionsBody : null,
  });
}

async function flushHkVisualizationPageExitEvents(page: Page) {
  if (page.isClosed()) {
    throw new Error(
      "Cannot observe the render-only page-exit flush because the lesson page is already closed.",
    );
  }
  const dispatched = await page.evaluate(() => {
    const pageHideEvent =
      typeof PageTransitionEvent === "function"
        ? new PageTransitionEvent("pagehide", { persisted: false })
        : new Event("pagehide");
    return window.dispatchEvent(pageHideEvent);
  });
  if (!dispatched) {
    throw new Error(
      "The controlled pagehide event was cancelled before exit telemetry could be observed.",
    );
  }
}

type ExactTopicPersistenceRecord = Record<string, unknown> & {
  id?: string;
  student_id?: string;
  topic_id?: string;
  type?: string;
  user_id?: string;
};

type ExactTopicPersistenceSnapshot = {
  lessonProgress: ExactTopicPersistenceRecord[];
  rewardState: {
    gamificationEvents: ExactTopicPersistenceRecord[];
    rewardPointLedger: ExactTopicPersistenceRecord[];
    rewardRedemptions: ExactTopicPersistenceRecord[];
  };
  visualizationEvents: ExactTopicPersistenceRecord[];
  visualizationLearningEvents: ExactTopicPersistenceRecord[];
  visualizationSessions: ExactTopicPersistenceRecord[];
};

function persistedRecordArray(
  payload: Record<string, unknown>,
  key: string,
): ExactTopicPersistenceRecord[] {
  const value = payload[key];
  if (!Array.isArray(value)) {
    throw new Error(
      `The persisted app-state payload is missing required array ${key}.`,
    );
  }
  const invalidIndex = value.findIndex((record) => !isRecord(record));
  if (invalidIndex >= 0) {
    throw new Error(
      `The persisted app-state payload has a malformed ${key}[${invalidIndex}] record.`,
    );
  }
  return (value as ExactTopicPersistenceRecord[])
    .map((record) => ({ ...record }))
    .sort((left, right) =>
      String(left.id ?? "").localeCompare(String(right.id ?? "")),
    );
}

function readExactTopicPersistenceSnapshot(
  userId: string,
  topicIds: readonly string[],
): ExactTopicPersistenceSnapshot {
  const sqlite = new DatabaseSync(e2eDatabasePath);
  try {
    const row = sqlite
      .prepare("SELECT payload FROM app_state WHERE id = ?")
      .get("primary") as { payload?: unknown } | undefined;
    if (typeof row?.payload !== "string") {
      throw new Error(
        "The exact-topic lifecycle gate could not read the primary SQLite app-state payload.",
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.payload) as unknown;
    } catch {
      throw new Error(
        "The exact-topic lifecycle gate refuses an unreadable primary SQLite app-state payload.",
      );
    }
    if (!isRecord(parsed)) {
      throw new Error(
        "The exact-topic lifecycle gate requires an object-shaped primary SQLite app-state payload.",
      );
    }
    const trackedTopicIds = new Set(topicIds);
    const forExactUserAndTopic = (record: ExactTopicPersistenceRecord) =>
      record.user_id === userId &&
      typeof record.topic_id === "string" &&
      trackedTopicIds.has(record.topic_id);
    const forExactStudent = (record: ExactTopicPersistenceRecord) =>
      record.student_id === userId;

    return {
      lessonProgress: persistedRecordArray(parsed, "lesson_progress").filter(
        forExactUserAndTopic,
      ),
      rewardState: {
        gamificationEvents: persistedRecordArray(
          parsed,
          "gamification_events",
        ).filter(forExactStudent),
        rewardPointLedger: persistedRecordArray(
          parsed,
          "reward_point_ledger",
        ).filter(forExactStudent),
        rewardRedemptions: persistedRecordArray(
          parsed,
          "reward_redemptions",
        ).filter(forExactStudent),
      },
      visualizationEvents: persistedRecordArray(
        parsed,
        "visualization_events",
      ).filter(forExactUserAndTopic),
      visualizationLearningEvents: persistedRecordArray(
        parsed,
        "learning_events",
      ).filter(
        (record) =>
          forExactUserAndTopic(record) &&
          (record.type?.startsWith("visualization-") === true ||
            record.source === "visualization-lab"),
      ),
      visualizationSessions: persistedRecordArray(
        parsed,
        "visualization_sessions",
      ).filter(forExactUserAndTopic),
    };
  } finally {
    sqlite.close();
  }
}

function stableGamificationBody() {
  return {
    gamification: {
      badges: [],
      generatedAt: "2026-08-09T00:00:00.000Z",
      level: { current: { id: "level-1" }, next: null, progressPercent: 0 },
      quests: [],
      recentEvents: [],
      rewardSummary: { available: 0, reserved: 0 },
      streakDays: 0,
      xp: 0,
    },
  };
}

function stablePersistedRewardState() {
  return {
    gamificationEvents: [],
    rewardPointLedger: [],
    rewardRedemptions: [],
  };
}

async function expectPerceptiblyVisible(
  locator: Locator,
  label: string,
  timeout: number,
) {
  await expect(locator, `${label} must have a rendered box.`).toBeVisible({
    timeout,
  });
  const evidence = await locator.evaluate((element) => {
    const chain: HkVisualizationVisibilityNode[] = [];
    let cursor: Element | null = element;
    while (cursor) {
      const style = getComputedStyle(cursor);
      const parsedOpacity = Number.parseFloat(style.opacity);
      chain.push({
        ariaHidden:
          cursor.getAttribute("aria-hidden")?.trim().toLowerCase() === "true",
        contentVisibility: style.contentVisibility,
        display: style.display,
        hidden: cursor.hasAttribute("hidden"),
        inert:
          cursor.hasAttribute("inert") ||
          ("inert" in cursor && Boolean((cursor as HTMLElement).inert)),
        opacity: Number.isFinite(parsedOpacity) ? parsedOpacity : null,
        visibility: style.visibility,
      });
      cursor = cursor.parentElement;
    }
    const rect = element.getBoundingClientRect();
    return {
      chain,
      connected: element.isConnected,
      height: rect.height,
      width: rect.width,
    };
  });
  const blockers = hkVisualizationVisibilityBlockers(evidence.chain);
  if (
    !evidence.connected ||
    evidence.width <= 1 ||
    evidence.height <= 1 ||
    blockers.length > 0
  ) {
    throw new Error(
      `${label} is not perceptibly visible/actionable: connected=${evidence.connected}, ` +
        `box=${evidence.width.toFixed(1)}×${evidence.height.toFixed(1)}, blockers=[${blockers.join(", ")}].`,
    );
  }
}

async function responseJson(response: APIResponse): Promise<unknown> {
  const body = await response.text();
  if (!body) return null;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return { nonJsonBody: body.slice(0, 500) };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAuthenticatedHkStudent(
  value: unknown,
  expectedUsername: string,
  expectedGrade: (typeof HK_VISUALIZATION_GRADE_SCOPE_IDS)[number],
) {
  if (
    !isRecord(value)
    || !isRecord(value.user)
    || !isRecord(value.settings)
    || !isRecord(value.user.curriculumProfile)
  ) return false;
  return (
    typeof value.user.id === "string" &&
    value.user.id.trim().length > 0 &&
    value.user.username === expectedUsername &&
    value.user.role === "student" &&
    value.user.grade === expectedGrade &&
    value.settings.selectedGrade === expectedGrade &&
    value.user.curriculumTrack === "HK" &&
    value.user.curriculumProfile.region === "HK"
  );
}

function authenticatedUserId(
  value: unknown,
  expectedUsername: string,
  expectedGrade: (typeof HK_VISUALIZATION_GRADE_SCOPE_IDS)[number],
) {
  if (
    !isAuthenticatedHkStudent(value, expectedUsername, expectedGrade) ||
    !isRecord(value) ||
    !isRecord(value.user)
  ) {
    return null;
  }
  return typeof value.user.id === "string" && value.user.id.trim()
    ? value.user.id
    : null;
}

function redactedAuthEvidence(
  value: unknown,
  expectedUsername: string,
  expectedGrade: (typeof HK_VISUALIZATION_GRADE_SCOPE_IDS)[number],
) {
  if (!isRecord(value) || !isRecord(value.user)) {
    return {
      authenticated: false,
      curriculumProfileRegionExact: false,
      curriculumTrackExact: false,
      gradeExact: false,
      identityMatched: false,
      roleExact: false,
      selectedGradeExact: false,
      userIdPresent: false,
    };
  }
  return {
    authenticated: true,
    curriculumProfileRegionExact:
      isRecord(value.user.curriculumProfile)
      && value.user.curriculumProfile.region === "HK",
    curriculumTrackExact: value.user.curriculumTrack === "HK",
    gradeExact: value.user.grade === expectedGrade,
    identityMatched: value.user.username === expectedUsername,
    roleExact: value.user.role === "student",
    selectedGradeExact:
      isRecord(value.settings)
      && value.settings.selectedGrade === expectedGrade,
    userIdPresent:
      typeof value.user.id === "string" && value.user.id.trim().length > 0,
  };
}

function redactDisposableUserId(value: unknown, userId: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactDisposableUserId(item, userId));
  }
  if (!isRecord(value)) return value === userId ? "[redacted-disposable-user]" : value;
  return Object.fromEntries(
    Object.entries(value).map(([key, current]) => [
      key,
      current === userId
        ? "[redacted-disposable-user]"
        : redactDisposableUserId(current, userId),
    ]),
  );
}
