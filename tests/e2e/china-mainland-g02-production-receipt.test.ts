import assert from "node:assert/strict";
import test from "node:test";

import { getVisualizationLabByLabId } from "../../data/visualizationLabs";
import { isValidLearningAnalyticsEvent } from "../../lib/learningAnalytics";

import {
  G02_CANONICAL_RUNNER_INVOCATION,
  G02_RUNNER_INVOCATION_ENV_JSON,
  G02_RUNNER_INVOCATION_ENV_SHA256,
  assertG02TrustedRunnerAuthority,
  createG02ProductionReceiptFixture,
  g02CanonicalRunnerInvocationEnvironment,
  readG02RunnerInvocationEnvironment,
  sealG02ProductionBrowserPayload,
  validateG02ProductionBrowserReceipt,
  validateG02UntrustedStructuralReceipt,
} from "./china-mainland-g02-production-receipt";

test("G02 receipt accepts one exact hash-bound but release-unready desktop contract fixture", () => {
  const receipt = createG02ProductionReceiptFixture("desktop-chrome");

  assert.equal(
    validateG02UntrustedStructuralReceipt(receipt, "desktop-chrome"),
    true,
  );
  assert.equal(receipt.payload.visualStates.length, 24);
  assert.equal(receipt.payload.interactionStates.length, 288);
});

test("G02 desktop and mobile contract fixtures enumerate every state and bind every compound subaction to a unique ACK", () => {
  const desktop = createG02ProductionReceiptFixture("desktop-chrome");
  const mobile = createG02ProductionReceiptFixture("mobile-chrome");

  assert.equal(validateG02UntrustedStructuralReceipt(mobile, "mobile-chrome"), true);
  assert.equal(desktop.payload.visualStates.length + mobile.payload.visualStates.length, 48);
  assert.equal(desktop.payload.interactionStates.length + mobile.payload.interactionStates.length, 576);
  assert.deepEqual(desktop.payload.execution.projectsTogether, [
    "desktop-chrome",
    "mobile-chrome",
  ]);
  const compound = desktop.payload.interactionStates.find(
    ({ scenarioId }) => scenarioId === "endpoint:divide:operand-a:max",
  );
  assert.deepEqual(
    compound?.action.subactions.map(({ kind, target }) => ({ kind, target })),
    [
      { kind: "setup", target: "mode:divide" },
      { kind: "primary", target: "range:operand-a:max" },
      { kind: "reset", target: "reset" },
    ],
  );
  const eventIds = [desktop, mobile].flatMap(({ payload }) =>
    payload.interactionStates.flatMap(({ action }) =>
      action.subactions.map(({ event }) => event.eventId),
    ),
  );
  assert.equal(new Set(eventIds).size, eventIds.length);
});

test("G02 C3 retains the sole raw request event and exact request-response envelope", () => {
  const receipt = createG02ProductionReceiptFixture("desktop-chrome") as any;
  const subaction = receipt.payload.interactionStates[1].action.subactions[0];
  assert.equal(subaction.analyticsEvidence.request.body.events.length, 1);
  assert.deepEqual(
    subaction.analyticsEvidence.request.eventIds,
    [subaction.event.eventId],
  );
  assert.deepEqual(
    subaction.analyticsEvidence.response.acknowledgedEventIds,
    [subaction.event.eventId],
  );
});

test("G02 C3 serializes temporal quiescence and payload-wide captured-consumed equality", () => {
  const receipt = createG02ProductionReceiptFixture("desktop-chrome") as any;
  const coverage = receipt.payload.analyticsCoverage;
  assert.deepEqual(coverage.capturedQualifyingEventIds, coverage.consumedReceiptEventIds);
  assert.deepEqual(coverage.unconsumedEventIds, []);
  assert.equal(coverage.lateDeliveryCount, 0);
  const subaction = receipt.payload.interactionStates[1].action.subactions[0];
  assert.equal(subaction.temporal.preActionQuiet, true);
  assert.equal(subaction.temporal.postActionQuiet, true);
  assert.ok(subaction.temporal.quietIntervalMs > 0);
});

test("G02 C3 binds exact catalog topic/source and durability user to every event", () => {
  const receipt = createG02ProductionReceiptFixture("desktop-chrome") as any;
  const state = receipt.payload.interactionStates[1];
  const event = state.action.subactions[0].event;
  const durability = receipt.payload.durabilityReceipts.find(
    ({ labId }: any) => labId === state.labId,
  );
  assert.equal(event.topicId, state.labId);
  assert.equal(event.userId, durability.userId);
  assert.equal(event.source, state.action.subactions[0].analyticsEvidence.request.body.events[0].source);
});

test("G02 C3 makes the post-visual state the authoritative durability boundary", () => {
  const receipt = createG02ProductionReceiptFixture("desktop-chrome") as any;
  for (const durability of receipt.payload.durabilityReceipts) {
    assert.equal(durability.afterVisualFinal.postCount, 0);
    assert.equal(durability.afterVisualFinal.target.count, 1);
    assert.equal(durability.afterVisualFinal.siblings.count, 3);
    assert.deepEqual(
      durability.siblings.afterVisualFinal,
      durability.afterVisualFinal.siblingCounts,
    );
  }
});

test("G02 C3 mobile receipt serializes both signed directional CDP swipes", () => {
  const receipt = createG02ProductionReceiptFixture("mobile-chrome") as any;
  const swipes = receipt.payload.touchEvidence.directionalSwipes;
  assert.deepEqual(swipes.map(({ direction }: any) => direction), [
    "toward-end",
    "toward-start",
  ]);
  assert.ok(swipes[0].signedDisplacement > 0);
  assert.ok(swipes[1].signedDisplacement < 0);
  assert.equal(swipes[0].afterScrollLeft - swipes[0].beforeScrollLeft, swipes[0].signedDisplacement);
  assert.equal(swipes[1].afterScrollLeft - swipes[1].beforeScrollLeft, swipes[1].signedDisplacement);
});

test("G02 C3 persists the complete interaction UI audit rather than counts only", () => {
  const receipt = createG02ProductionReceiptFixture("desktop-chrome") as any;
  const audit = receipt.payload.interactionStates[0].uiScan;
  assert.equal(audit.clippedElementCount, 0);
  assert.equal(audit.collisionIssueCount, 0);
  assert.equal(audit.contrastIssueCount, 0);
  assert.equal(audit.horizontalOverflowPixels, 0);
  assert.equal(audit.touchTargetIssueCount, 0);
  assert.ok(audit.contrastCheckedTextCount > 0);
  assert.ok(audit.touchTargetCheckedCount > 0);
  assert.ok(audit.uiScan.paintedMarkCount > 0);
});

test("G02 C3 persists distinct real scroll geometry for top, center, and bottom", () => {
  const receipt = createG02ProductionReceiptFixture("desktop-chrome") as any;
  const audits = receipt.payload.visualStates[0].scrollAudits;
  assert.deepEqual(audits.map(({ scrollId }: any) => scrollId), [
    "page-top",
    "visualization-center",
    "page-bottom",
  ]);
  assert.equal(new Set(audits.map(({ geometry }: any) => geometry.scrollY)).size, 3);
  for (const audit of audits) {
    assert.ok(Number.isFinite(audit.geometry.rootTop));
    assert.ok(Number.isFinite(audit.geometry.rootBottom));
    assert.ok(audit.geometry.viewportHeight > 0);
    assert.ok(audit.scrollMethod.length > 0);
  }
});

test("G02 C4 keeps production coverage unavailable without trusted native runner authority", () => {
  const receipt = createG02ProductionReceiptFixture("desktop-chrome") as any;
  assert.equal(receipt.payload.execution.complete, false);
  assert.equal(receipt.payload.runnerInvocation.authorityAvailable, false);
  assert.equal(receipt.payload.runnerInvocation.releaseReady, false);
  assert.equal(receipt.payload.runnerInvocation.runnerReceiptSha256, null);
});

test("G02 C4 caller JSON plus matching SHA remains non-authoritative", () => {
  const canonical = g02CanonicalRunnerInvocationEnvironment();
  const parsed = readG02RunnerInvocationEnvironment({
    [G02_RUNNER_INVOCATION_ENV_JSON]: canonical.json,
    [G02_RUNNER_INVOCATION_ENV_SHA256]: canonical.sha256,
  });
  assert.deepEqual(parsed.args, G02_CANONICAL_RUNNER_INVOCATION.args);
  assert.equal(parsed.releaseReady, false);
  assert.throws(
    () => assertG02TrustedRunnerAuthority(parsed),
    /coverage unavailable.*trusted native runner/u,
  );
  assert.throws(() => readG02RunnerInvocationEnvironment({}), /missing/u);

  const narrowed = JSON.parse(canonical.json) as any;
  narrowed.args.splice(2, 0, "--project=desktop-chrome", "--grep=first");
  const narrowedJson = JSON.stringify(narrowed);
  assert.throws(() => readG02RunnerInvocationEnvironment({
    [G02_RUNNER_INVOCATION_ENV_JSON]: narrowedJson,
    [G02_RUNNER_INVOCATION_ENV_SHA256]: canonical.sha256,
  }), /SHA-256|exact/u);
});

test("G02 public production validation rejects a baseline caller-sealed receipt without native authority", () => {
  assert.throws(
    () => validateG02ProductionBrowserReceipt(
      createG02ProductionReceiptFixture("desktop-chrome"),
      "desktop-chrome",
    ),
    /native (?:runner )?authority.*unavailable|native.*provenance.*unavailable/u,
  );
});

test("G02 exact caller environment JSON plus matching SHA cannot authorize public production validation", () => {
  const canonical = g02CanonicalRunnerInvocationEnvironment();
  const parsed = readG02RunnerInvocationEnvironment({
    [G02_RUNNER_INVOCATION_ENV_JSON]: canonical.json,
    [G02_RUNNER_INVOCATION_ENV_SHA256]: canonical.sha256,
  });
  const receipt = createG02ProductionReceiptFixture("desktop-chrome");
  assert.deepEqual(receipt.payload.runnerInvocation, parsed);
  assert.equal(receipt.payload.runnerInvocation.authorityAvailable, false);
  assert.equal(receipt.payload.execution.complete, false);
  assert.equal(receipt.payload.runnerInvocation.releaseReady, false);
  assert.equal(receipt.payload.runnerInvocation.runnerReceiptSha256, null);
  assert.throws(
    () => validateG02ProductionBrowserReceipt(receipt, "desktop-chrome"),
    /native (?:runner )?authority.*unavailable|native.*provenance.*unavailable/u,
  );
});

test("G02 public production validation rejects a structurally valid coordinated caller reseal", () => {
  const payload: any = structuredClone(
    createG02ProductionReceiptFixture("desktop-chrome").payload,
  );
  const originalEventId =
    payload.interactionStates[1].action.subactions[0].event.eventId;
  replaceExactString(payload, originalEventId, `${originalEventId}:caller-resealed`);
  const resealed = sealG02ProductionBrowserPayload(payload);
  assert.equal(
    validateG02UntrustedStructuralReceipt(resealed, "desktop-chrome"),
    true,
  );
  assert.throws(
    () => validateG02ProductionBrowserReceipt(resealed, "desktop-chrome"),
    /native (?:runner )?authority.*unavailable|native.*provenance.*unavailable/u,
  );
});

function replaceExactString(value: unknown, before: string, after: string): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      if (entry === before) value[index] = after;
      else replaceExactString(entry, before, after);
    });
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (entry === before) (value as Record<string, unknown>)[key] = after;
    else replaceExactString(entry, before, after);
  }
}

test("G02 C4 binds event time to the exact physical subaction interval", () => {
  const receipt = createG02ProductionReceiptFixture("desktop-chrome") as any;
  const subaction = receipt.payload.interactionStates[1].action.subactions[0];
  const eventTime = Date.parse(subaction.analyticsEvidence.request.body.events[0].timestamp);
  assert.ok(Date.parse(subaction.temporal.actionStartedAt) <= eventTime);
  assert.ok(eventTime <= Date.parse(subaction.temporal.requestObservedAt));
  assert.ok(Date.parse(subaction.temporal.requestObservedAt) <= Date.parse(subaction.temporal.actionSettledAt));
  assert.ok(subaction.temporal.toleranceMs > 0);
});

test("G02 C4 final siblings are the exact ordered G02 plan siblings", () => {
  const receipt = createG02ProductionReceiptFixture("desktop-chrome") as any;
  for (const durability of receipt.payload.durabilityReceipts) {
    assert.deepEqual(
      durability.afterVisualFinal.siblings.sessions.map(({ topicId }: any) => topicId),
      receipt.payload.labIds.filter((labId: string) => labId !== durability.labId),
    );
  }
  const payload = structuredClone(receipt.payload);
  const otherCatalogLab = getVisualizationLabByLabId("capstone-primary-number-sense-bridge");
  assert.ok(otherCatalogLab);
  payload.durabilityReceipts[0].afterVisualFinal.siblings.sessions[0].topicId =
    otherCatalogLab.labId;
  payload.durabilityReceipts[0].afterVisualFinal.siblings.sessions[0].source =
    otherCatalogLab.analyticsSource;
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(payload),
      "desktop-chrome",
    ),
  );
});

test("G02 C4 proves exact top, center, and bottom scroll landmarks", () => {
  const receipt = createG02ProductionReceiptFixture("desktop-chrome") as any;
  const audits = receipt.payload.visualStates[0].scrollAudits;
  assert.ok(audits[0].geometry.scrollY <= 1);
  assert.ok(
    Math.abs(audits[1].geometry.rootCenter - audits[1].geometry.viewportCenter) <=
      audits[1].geometry.centerTolerancePx,
  );
  assert.ok(
    audits[2].geometry.scrollY >= audits[2].geometry.documentMaxScrollY - 1,
  );
});

test("G02 C5 serializes the exact unfiltered raw session checkpoints", () => {
  const receipt = createG02ProductionReceiptFixture("desktop-chrome") as any;
  for (const durability of receipt.payload.durabilityReceipts) {
    const expectedSiblings = receipt.payload.labIds.filter(
      (labId: string) => labId !== durability.labId,
    );
    const expectedAll = [...expectedSiblings, durability.labId];
    assert.deepEqual(durability.rawSessionCheckpoints.afterRegistration, []);
    assert.deepEqual(
      durability.rawSessionCheckpoints.afterSiblingSeed.map(({ topicId }: any) => topicId),
      expectedSiblings,
    );
    for (const checkpoint of ["afterFirst", "afterReset", "afterSecond", "afterReload", "afterVisualFinal"]) {
      assert.deepEqual(
        durability.rawSessionCheckpoints[checkpoint].map(({ topicId }: any) => topicId),
        expectedAll,
      );
    }
  }
});

test("G02 C5 proves one joint wall-clock and monotonic timeline across all actions", () => {
  const receipt = createG02ProductionReceiptFixture("desktop-chrome") as any;
  const subactions = receipt.payload.interactionStates.flatMap(
    ({ action }: any) => action.subactions,
  ).concat(receipt.payload.visualStates.map(({ resetAction }: any) => resetAction))
    .sort((left: any, right: any) => left.temporal.captureSequence - right.temporal.captureSequence);
  const origins = subactions.flatMap(({ temporal }: any) => [
    temporal.wallClockMinusMonotonicOriginMs,
    Date.parse(temporal.actionStartedAt) - temporal.actionStartedMonotonicMs,
    Date.parse(temporal.requestObservedAt) - temporal.requestObservedMonotonicMs,
    Date.parse(temporal.actionSettledAt) - temporal.actionSettledMonotonicMs,
  ]);
  assert.ok(Math.max(...origins) - Math.min(...origins) <= 2);
  for (let index = 1; index < subactions.length; index += 1) {
    assert.ok(
      Date.parse(subactions[index].temporal.actionStartedAt) >
        Date.parse(subactions[index - 1].temporal.actionSettledAt),
    );
    assert.ok(
      subactions[index].temporal.actionStartedMonotonicMs >
        subactions[index - 1].temporal.actionSettledMonotonicMs,
    );
  }
});

test("G02 C5 scroll landmarks preserve one physical document-space root", () => {
  const receipt = createG02ProductionReceiptFixture("desktop-chrome") as any;
  const audits = receipt.payload.visualStates[0].scrollAudits;
  assert.ok(
    Math.max(...audits.map(({ geometry }: any) => geometry.rootDocumentTop)) -
      Math.min(...audits.map(({ geometry }: any) => geometry.rootDocumentTop)) <= 1,
  );
  assert.equal(new Set(audits.map(({ geometry }: any) => geometry.viewportHeight)).size, 1);
  assert.equal(new Set(audits.map(({ geometry }: any) => geometry.documentMaxScrollY)).size, 1);
});

test("G02 C5 mobile swipes form a continuous material round trip", () => {
  const receipt = createG02ProductionReceiptFixture("mobile-chrome") as any;
  const [outward, returning] = receipt.payload.touchEvidence.directionalSwipes;
  assert.ok(
    Math.abs(returning.beforeScrollLeft - outward.afterScrollLeft) <=
      receipt.payload.touchEvidence.roundTrip.continuityTolerancePx,
  );
  assert.ok(
    Math.abs(returning.afterScrollLeft - outward.beforeScrollLeft) <=
      Math.abs(outward.signedDisplacement) *
        receipt.payload.touchEvidence.roundTrip.returnRegionFraction,
  );
});

test("G02 C6 rejects valid timestamp drift across serialized durability checkpoints", () => {
  const payload = structuredClone(
    createG02ProductionReceiptFixture("desktop-chrome").payload,
  ) as any;
  payload.durabilityReceipts[0].rawSessionCheckpoints.afterReset[0].updatedAt =
    "2026-08-20T00:00:01.000Z";
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(payload),
      "desktop-chrome",
    ),
  );
});

test("G02 C6 fixture follows per-lab interaction then visual then final chronology", () => {
  const receipt = createG02ProductionReceiptFixture("desktop-chrome") as any;
  for (const [labIndex, labId] of receipt.payload.labIds.entries()) {
    const interactionSequences = receipt.payload.interactionStates
      .filter((state: any) => state.labId === labId)
      .flatMap((state: any) => state.action.subactions)
      .map((subaction: any) => subaction.temporal.captureSequence);
    const visualSequences = receipt.payload.visualStates
      .filter((state: any) => state.labId === labId)
      .map((state: any) => state.resetAction.temporal.captureSequence);
    const durability = receipt.payload.durabilityReceipts[labIndex];
    assert.ok(Math.max(...interactionSequences) < Math.min(...visualSequences));
    assert.equal(
      durability.afterVisualFinal.captureBoundary.afterActionCaptureSequence,
      Math.max(...visualSequences),
    );
    if (labIndex > 0) {
      const prior = receipt.payload.durabilityReceipts[labIndex - 1];
      assert.ok(
        prior.afterVisualFinal.captureBoundary.capturedMonotonicMs <
          Math.min(...interactionSequences.map((sequence: number) => sequence * 2_000)),
      );
    }
  }
});

test("G02 C6 rejects a coherent visual-before-last-interaction timeline", () => {
  const payload = structuredClone(
    createG02ProductionReceiptFixture("desktop-chrome").payload,
  ) as any;
  const labId = payload.labIds[0];
  const interactionSubactions = payload.interactionStates
    .filter((state: any) => state.labId === labId)
    .flatMap((state: any) => state.action.subactions)
    .sort((left: any, right: any) => left.temporal.captureSequence - right.temporal.captureSequence);
  const visualActions = payload.visualStates
    .filter((state: any) => state.labId === labId)
    .map((state: any) => state.resetAction)
    .sort((left: any, right: any) => left.temporal.captureSequence - right.temporal.captureSequence);
  const lastInteraction = interactionSubactions.at(-1);
  const firstVisual = visualActions[0];
  const priorInteractionTemporal = structuredClone(lastInteraction.temporal);
  lastInteraction.temporal = structuredClone(firstVisual.temporal);
  firstVisual.temporal = priorInteractionTemporal;
  for (const subaction of [lastInteraction, firstVisual]) {
    subaction.analyticsEvidence.request.body.events[0].timestamp = new Date(
      Date.parse(subaction.temporal.actionStartedAt) + 100,
    ).toISOString();
  }
  const orderedIds = payload.interactionStates
    .flatMap((state: any) => state.action.subactions)
    .concat(payload.visualStates.map((state: any) => state.resetAction))
    .sort((left: any, right: any) => left.temporal.captureSequence - right.temporal.captureSequence)
    .map((subaction: any) => subaction.event.eventId);
  payload.analyticsCoverage.capturedQualifyingEventIds = orderedIds;
  payload.analyticsCoverage.consumedReceiptEventIds = [...orderedIds];
  assert.throws(
    () => validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(payload),
      "desktop-chrome",
    ),
    /semantic chronology must be interactions, visual resets, afterVisualFinal/u,
  );
});

function firstMobileRangeCalibration(payload: any) {
  const subaction = payload.interactionStates
    .flatMap((state: any) => state.action.subactions)
    .find((candidate: any) => candidate.target.startsWith("range:"));
  assert.ok(subaction, "fixture must contain a mobile range subaction");
  assert.ok(
    subaction.calibrationEvidence,
    "mobile range subaction must retain physical calibration attempts",
  );
  return {
    calibration: subaction.calibrationEvidence,
    subaction,
  };
}

test("G02 C7 retains every physical calibration tap and its honest commit delivery", () => {
  const receipt = createG02ProductionReceiptFixture("mobile-chrome") as any;
  const { calibration, subaction } = firstMobileRangeCalibration(receipt.payload);
  assert.equal(
    calibration.aggregateTapCount,
    calibration.attempts.length,
  );
  assert.ok(calibration.attempts.length >= 2);
  assert.deepEqual(
    calibration.attempts.map(({ attemptIndex }: any) => attemptIndex),
    calibration.attempts.map((_: any, index: number) => index),
  );
  const changed = calibration.attempts.filter(({ valueChanged }: any) => valueChanged);
  assert.ok(changed.length >= 1);
  assert.ok(
    calibration.attempts
      .every(({ delivery }: any) => delivery?.event?.type === "visualization-slider"),
  );
  const finalAttempt = calibration.attempts[calibration.finalSettlingAttemptIndex];
  assert.equal(finalAttempt.afterValue, calibration.targetValue);
  assert.equal(calibration.terminalValue, calibration.targetValue);
  assert.equal(finalAttempt.delivery.event.eventId, subaction.event.eventId);
  assert.equal(
    finalAttempt.delivery.analyticsCaptureSequence,
    subaction.temporal.captureSequence,
  );
});

test("G02 C7 payload coverage consumes every calibration commit event exactly once", () => {
  const receipt = createG02ProductionReceiptFixture("mobile-chrome") as any;
  const { calibration } = firstMobileRangeCalibration(receipt.payload);
  assert.ok(calibration.retainedDeliveryEventIds.length >= 2);
  const physicalDeliveryIds = receipt.payload.interactionStates
    .flatMap((state: any) => state.action.subactions)
    .concat(receipt.payload.visualStates.map((state: any) => state.resetAction))
    .flatMap((subaction: any) =>
      subaction.calibrationEvidence
        ? subaction.calibrationEvidence.attempts
            .map(({ delivery }: any) => ({
              event: delivery.event,
              captureSequence: delivery.analyticsCaptureSequence,
            }))
        : [{ event: subaction.event, captureSequence: subaction.temporal.captureSequence }],
    )
    .sort(
      (left: any, right: any) =>
        left.captureSequence - right.captureSequence,
    )
    .map(({ event }: any) => event.eventId);
  assert.deepEqual(
    receipt.payload.analyticsCoverage.capturedQualifyingEventIds,
    physicalDeliveryIds,
  );
  assert.deepEqual(
    receipt.payload.analyticsCoverage.consumedReceiptEventIds,
    physicalDeliveryIds,
  );
});

test("G02 C7 rejects early-only analytics followed by a silent value correction", () => {
  const payload = structuredClone(
    createG02ProductionReceiptFixture("mobile-chrome").payload,
  ) as any;
  const { calibration } = firstMobileRangeCalibration(payload);
  const changed = calibration.attempts.filter(({ valueChanged }: any) => valueChanged);
  assert.ok(changed.length >= 2, "fixture needs an early and a final value-changing tap");
  changed.at(-1).delivery = null;
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(payload),
      "mobile-chrome",
    ),
  );
});

test("G02 C7 rejects method count, aggregate count, and retained-delivery drift", async (t) => {
  const cases: Array<[string, (subaction: any, calibration: any) => void]> = [
    ["method claims 24 taps with one retained attempt", (subaction, calibration) => {
      calibration.attempts = [calibration.attempts.at(-1)];
      calibration.attempts[0].attemptIndex = 0;
      calibration.aggregateTapCount = 1;
      calibration.finalSettlingAttemptIndex = 0;
      subaction.method = "page.touchscreen.tap:calibrated-bisection:24:exact-native-value";
    }],
    ["aggregate tap count drift", (_subaction, calibration) => {
      calibration.aggregateTapCount += 1;
    }],
    ["retained delivery id drift", (_subaction, calibration) => {
      calibration.retainedDeliveryEventIds.pop();
    }],
    ["planned native no-op drops its required slider delivery", (_subaction, calibration) => {
      const noOp = calibration.attempts.find(({ valueChanged }: any) => !valueChanged);
      assert.ok(noOp?.delivery);
      noOp.delivery = null;
    }],
    ["planned native no-op is not the repeated midpoint coordinate", (_subaction, calibration) => {
      const noOp = calibration.attempts.find(
        ({ plannedRole }: any) => plannedRole === "midpoint-no-op-probe",
      );
      assert.ok(noOp);
      noOp.coordinate.x += 1;
    }],
    ["early commit reuses the final event id", (_subaction, calibration) => {
      const changed = calibration.attempts.filter(({ valueChanged }: any) => valueChanged);
      assert.ok(changed.length >= 2);
      const early = changed[0].delivery;
      const final = changed.at(-1).delivery;
      early.event.eventId = final.event.eventId;
      early.analyticsEvidence.request.body.events[0].id = final.event.eventId;
      early.analyticsEvidence.request.eventIds = [final.event.eventId];
      early.analyticsEvidence.response.acknowledgedEventIds = [final.event.eventId];
    }],
    ["early commit event escapes its own tap interval", (_subaction, calibration) => {
      const early = calibration.attempts.find(({ valueChanged }: any) => valueChanged);
      assert.ok(early?.delivery);
      early.delivery.analyticsEvidence.request.body.events[0].timestamp =
        new Date(Date.parse(early.settledAt) + 10).toISOString();
    }],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const payload = structuredClone(
        createG02ProductionReceiptFixture("mobile-chrome").payload,
      ) as any;
      const { calibration, subaction } = firstMobileRangeCalibration(payload);
      mutate(subaction, calibration);
      assert.throws(() =>
        validateG02UntrustedStructuralReceipt(
          sealG02ProductionBrowserPayload(payload),
          "mobile-chrome",
        ),
      );
    });
  }
});

test("G02 C8 plans a no-op midpoint probe with the platform per-pointer-up slider commit", () => {
  const receipt = createG02ProductionReceiptFixture("mobile-chrome") as any;
  const { calibration } = firstMobileRangeCalibration(receipt.payload);
  assert.equal(
    calibration.commitPolicy,
    "one-visualization-slider-event-per-physical-tap-including-native-no-op",
  );
  const noOpMidpoint = calibration.attempts.find(
    ({ plannedRole }: any) => plannedRole === "midpoint-no-op-probe",
  );
  assert.ok(noOpMidpoint);
  assert.equal(noOpMidpoint.attemptIndex, 1);
  assert.deepEqual(
    noOpMidpoint.coordinate,
    calibration.attempts[0].coordinate,
  );
  assert.equal(noOpMidpoint.beforeValue, noOpMidpoint.afterValue);
  assert.equal(noOpMidpoint.valueChanged, false);
  assert.equal(noOpMidpoint.delivery.event.type, "visualization-slider");
  assert.equal(noOpMidpoint.delivery.analyticsEvidence.response.status, 200);
});

test("G02 C8 binds calibration target and every native value to the exact plan control", () => {
  const receipt = createG02ProductionReceiptFixture("mobile-chrome") as any;
  const { calibration, subaction } = firstMobileRangeCalibration(receipt.payload);
  const state = receipt.payload.interactionStates.find((candidate: any) =>
    candidate.action.subactions.includes(subaction),
  );
  assert.ok(state?.control?.kind === "range");
  assert.equal(calibration.targetValue, state.control.selected);
  for (const attempt of calibration.attempts) {
    for (const value of [attempt.beforeValue, attempt.afterValue]) {
      assert.ok(value >= state.control.min && value <= state.control.max);
      assert.equal((value - state.control.min) % state.control.step, 0);
    }
  }

  const payload = structuredClone(receipt.payload);
  const mutated = firstMobileRangeCalibration(payload).calibration;
  for (const attempt of mutated.attempts) {
    attempt.beforeValue += 10_000;
    attempt.afterValue += 10_000;
  }
  mutated.targetValue += 10_000;
  mutated.terminalValue += 10_000;
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(payload),
      "mobile-chrome",
    ),
  );
});

test("G02 C8 binds every calibration coordinate to one immutable native input rect", () => {
  const receipt = createG02ProductionReceiptFixture("mobile-chrome") as any;
  const { calibration } = firstMobileRangeCalibration(receipt.payload);
  const geometry = calibration.inputGeometry;
  assert.deepEqual(Object.keys(geometry).sort(), [
    "admissibleMaxX",
    "admissibleMaxY",
    "admissibleMinX",
    "admissibleMinY",
    "height",
    "midpointX",
    "tapY",
    "viewportHeight",
    "viewportWidth",
    "width",
    "x",
    "y",
  ]);
  assert.equal(geometry.admissibleMinX, geometry.x + 0.5);
  assert.equal(geometry.admissibleMaxX, geometry.x + geometry.width - 0.5);
  assert.equal(geometry.admissibleMinY, geometry.y + 0.5);
  assert.equal(geometry.admissibleMaxY, geometry.y + geometry.height - 0.5);
  assert.equal(geometry.tapY, geometry.y + geometry.height / 2);
  assert.equal(geometry.midpointX, geometry.x + geometry.width / 2);
  for (const attempt of calibration.attempts) {
    assert.ok(attempt.coordinate.x >= geometry.admissibleMinX);
    assert.ok(attempt.coordinate.x <= geometry.admissibleMaxX);
    assert.ok(attempt.coordinate.y >= geometry.admissibleMinY);
    assert.ok(attempt.coordinate.y <= geometry.admissibleMaxY);
    assert.equal(attempt.coordinate.y, geometry.tapY);
  }
  assert.equal(calibration.attempts[0].coordinate.x, geometry.midpointX);
  assert.equal(calibration.attempts[1].coordinate.x, geometry.midpointX);

  const payload = structuredClone(receipt.payload);
  firstMobileRangeCalibration(payload).calibration.attempts[0].coordinate.x = -1;
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(payload),
      "mobile-chrome",
    ),
  );

  const impossibleY = structuredClone(receipt.payload);
  firstMobileRangeCalibration(impossibleY).calibration.attempts[0].coordinate.y = -1;
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(impossibleY),
      "mobile-chrome",
    ),
  );
});

test("G02 C8 accounts the exact union of every mobile UI tap category", () => {
  const receipt = createG02ProductionReceiptFixture("mobile-chrome") as any;
  const counts = receipt.payload.touchEvidence.tapCategoryCounts;
  assert.deepEqual(Object.keys(counts).sort(), [
    "calibrationAttemptCount",
    "interactionAxisSetupTapCount",
    "interactionNonRangeTapCount",
    "sessionSeedTapCount",
    "visualAxisSetupTapCount",
    "visualResetTapCount",
  ]);
  assert.equal(
    receipt.payload.touchEvidence.realTapCount,
    Object.values(counts).reduce((sum: number, count: any) => sum + count, 0),
  );
  assert.equal(
    counts.calibrationAttemptCount,
    receipt.payload.interactionStates
      .flatMap((state: any) => state.action.subactions)
      .flatMap((subaction: any) => subaction.calibrationEvidence?.attempts ?? []).length,
  );
  assert.equal(counts.visualResetTapCount, receipt.payload.visualStates.length);
  assert.equal(counts.interactionAxisSetupTapCount, 0);
  assert.equal(counts.visualAxisSetupTapCount, 60);
  assert.equal(counts.sessionSeedTapCount, 0);
  assert.deepEqual(receipt.payload.touchEvidence.nonUiSessionSeed, {
    postCount: receipt.payload.labIds.length * (receipt.payload.labIds.length - 1),
    transport: "page.request.post",
  });

  const payload = structuredClone(receipt.payload);
  payload.touchEvidence.realTapCount = 1;
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(payload),
      "mobile-chrome",
    ),
  );

  const categoryDrift = structuredClone(receipt.payload);
  categoryDrift.touchEvidence.tapCategoryCounts.visualAxisSetupTapCount -= 1;
  categoryDrift.touchEvidence.realTapCount -= 1;
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(categoryDrift),
      "mobile-chrome",
    ),
  );
});

test("G02 C8 requires one visualization-slider delivery for every physical range tap", () => {
  const receipt = createG02ProductionReceiptFixture("mobile-chrome") as any;
  const { calibration, subaction } = firstMobileRangeCalibration(receipt.payload);
  assert.equal(calibration.attempts.length, calibration.retainedDeliveryEventIds.length);
  assert.equal(calibration.attempts.length, calibration.consumedDeliveryEventIds.length);
  for (const attempt of calibration.attempts) {
    assert.ok(attempt.delivery);
    assert.equal(attempt.delivery.event.type, "visualization-slider");
    assert.equal(
      attempt.delivery.analyticsEvidence.request.body.events[0].type,
      "visualization-slider",
    );
  }
  const noOp = calibration.attempts.find(({ valueChanged }: any) => !valueChanged);
  assert.ok(noOp?.delivery, "unchanged pointer-up must still own its slider event");
  assert.equal(
    calibration.attempts[calibration.finalSettlingAttemptIndex].delivery.event.eventId,
    subaction.event.eventId,
  );

  const payload = structuredClone(receipt.payload);
  firstMobileRangeCalibration(payload).calibration.attempts[1].delivery = null;
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(payload),
      "mobile-chrome",
    ),
  );
});

test("G02 C9 shares the exact production analytics taxonomy across fixtures and validation", async () => {
  const receiptModule = await import("./china-mainland-g02-production-receipt") as Record<string, unknown>;
  const expectedType = receiptModule.expectedG02AnalyticsEventType as
    | ((subaction: { kind: string; target: string }) => string)
    | undefined;
  assert.equal(typeof expectedType, "function");
  assert.equal(expectedType?.({ kind: "primary", target: "range:operand-a:max" }), "visualization-slider");
  assert.equal(expectedType?.({ kind: "primary", target: "mode:add" }), "visualization-probe");
  assert.equal(expectedType?.({ kind: "reset", target: "reset" }), "visualization-reset");

  const receipts = [
    createG02ProductionReceiptFixture("desktop-chrome"),
    createG02ProductionReceiptFixture("mobile-chrome"),
  ] as any[];
  const rawEvents = receipts.flatMap(({ payload }) =>
    payload.interactionStates
      .flatMap((state: any) => state.action.subactions)
      .concat(payload.visualStates.map((state: any) => state.resetAction))
      .flatMap((subaction: any) =>
        subaction.calibrationEvidence
          ? subaction.calibrationEvidence.attempts.map(
              ({ delivery }: any) => delivery.analyticsEvidence.request.body.events[0],
            )
          : [subaction.analyticsEvidence.request.body.events[0]],
      ),
  );
  assert.ok(rawEvents.length > 0);
  assert.ok(rawEvents.every((event: unknown) => isValidLearningAnalyticsEvent(event)));
  assert.deepEqual(
    new Set(rawEvents.map(({ type }: any) => type)),
    new Set(["visualization-slider", "visualization-probe", "visualization-reset"]),
  );

  const payload = structuredClone(receipts[0].payload);
  const forged = payload.interactionStates
    .flatMap((state: any) => state.action.subactions)
    .find(({ target }: any) => target.startsWith("mode:"));
  assert.ok(forged);
  forged.event.type = "visualization-action";
  forged.analyticsEvidence.request.body.events[0].type = "visualization-action";
  assert.equal(isValidLearningAnalyticsEvent(forged.analyticsEvidence.request.body.events[0]), false);
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(payload),
      "desktop-chrome",
    ),
  );
});

test("G02 C9 binds every raw mobile tap to a fresh target rect and live viewport", () => {
  const receipt = createG02ProductionReceiptFixture("mobile-chrome") as any;
  const entries = receipt.payload.touchEvidence.tapEntries;
  assert.equal(entries.length, receipt.payload.touchEvidence.realTapCount);
  assert.deepEqual(
    entries.map(({ tapSequence }: any) => tapSequence),
    entries.map((_: any, index: number) => index),
  );
  for (const entry of entries) {
    assert.equal(
      entry.preparation,
      "locator.scrollIntoViewIfNeeded+fresh-bounding-box+live-viewport",
    );
    assert.ok(entry.coordinate.x >= entry.targetRect.x);
    assert.ok(entry.coordinate.x <= entry.targetRect.x + entry.targetRect.width);
    assert.ok(entry.coordinate.y >= entry.targetRect.y);
    assert.ok(entry.coordinate.y <= entry.targetRect.y + entry.targetRect.height);
    assert.ok(entry.coordinate.x >= 0 && entry.coordinate.x <= entry.viewport.width);
    assert.ok(entry.coordinate.y >= 0 && entry.coordinate.y <= entry.viewport.height);
  }

  const offTarget = structuredClone(receipt.payload);
  offTarget.touchEvidence.tapEntries[0].coordinate.x =
    offTarget.touchEvidence.tapEntries[0].targetRect.x - 1;
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(offTarget),
      "mobile-chrome",
    ),
  );

  const offViewport = structuredClone(receipt.payload);
  offViewport.touchEvidence.tapEntries[0].viewport.width =
    offViewport.touchEvidence.tapEntries[0].coordinate.x - 1;
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(offViewport),
      "mobile-chrome",
    ),
  );

  const staleCalibrationViewport = structuredClone(receipt.payload);
  firstMobileRangeCalibration(staleCalibrationViewport).calibration.inputGeometry.viewportWidth += 1;
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(staleCalibrationViewport),
      "mobile-chrome",
    ),
  );
});

test("G02 C10 serializes exact live interaction-axis surface observations before initial and after reload", () => {
  for (const project of ["desktop-chrome", "mobile-chrome"] as const) {
    const receipt = createG02ProductionReceiptFixture(project) as any;
    const observations = receipt.payload.interactionSurfaceObservations;
    assert.equal(observations.length, receipt.payload.labIds.length * 2);
    const expectedAxis = project === "desktop-chrome"
      ? { axisId: "desktop-chrome|en|light", htmlLang: "en", locale: "en", theme: "light" }
      : { axisId: "mobile-chrome|zh-Hans|dark", htmlLang: "zh-Hans", locale: "zh-Hans", theme: "dark" };
    assert.deepEqual(
      observations.map(({ phase }: any) => phase),
      receipt.payload.labIds.flatMap(() => ["before-initial", "after-reload"]),
    );
    for (const observation of observations) {
      assert.deepEqual(
        {
          axisId: observation.axisId,
          htmlLang: observation.htmlLang,
          locale: observation.locale,
          setupTapCount: observation.setupTapCount,
          theme: observation.theme,
        },
        { ...expectedAxis, setupTapCount: 0 },
      );
    }
  }
});

test("G02 C10 binds the global tap ledger to exact plan semantics and prior-bottom header transitions", () => {
  const receipt = createG02ProductionReceiptFixture("mobile-chrome") as any;
  const entries = receipt.payload.touchEvidence.tapEntries;
  for (const [index, entry] of entries.entries()) {
    assert.equal(entry.tapSequence, index);
    assert.ok(entry.axisId && entry.labId && entry.phase && entry.stateId);
    assert.ok(entry.subactionId && entry.target);
    assert.ok(Date.parse(entry.before.capturedAt) <= Date.parse(entry.after.capturedAt));
    assert.ok(entry.before.capturedMonotonicMs <= entry.after.capturedMonotonicMs);
  }
  assert.deepEqual(
    entries
      .filter(({ category }: any) => category === "calibration-attempt")
      .map(({ calibrationPhysicalCaptureSequence }: any) => calibrationPhysicalCaptureSequence),
    entries
      .filter(({ category }: any) => category === "calibration-attempt")
      .map((_: any, index: number) => index),
  );
  const transitions = receipt.payload.visualStates
    .filter(({ headerTransition }: any) => headerTransition !== null)
    .map(({ headerTransition }: any) => headerTransition);
  assert.equal(transitions.length, receipt.payload.labIds.length * 5);
  assert.deepEqual(
    transitions.map(({ transitionSequence }: any) => transitionSequence),
    transitions.map((_: any, index: number) => index),
  );
  assert.ok(transitions.every(({ fromScrollId }: any) => fromScrollId === "page-bottom"));

  const reversed = structuredClone(receipt.payload);
  reversed.touchEvidence.tapEntries.reverse();
  reversed.touchEvidence.tapEntries.forEach((entry: any, index: number) => {
    entry.tapSequence = index;
  });
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(reversed),
      "mobile-chrome",
    ),
  );

  const duplicatedSetup = structuredClone(receipt.payload);
  const firstSetup = duplicatedSetup.touchEvidence.tapEntries.find(
    ({ category }: any) => category === "visual-axis-setup",
  );
  assert.ok(firstSetup);
  duplicatedSetup.touchEvidence.tapEntries.at(-1).axisId = firstSetup.axisId;
  duplicatedSetup.touchEvidence.tapEntries.at(-1).labId = firstSetup.labId;
  duplicatedSetup.touchEvidence.tapEntries.at(-1).phase = firstSetup.phase;
  duplicatedSetup.touchEvidence.tapEntries.at(-1).stateId = firstSetup.stateId;
  duplicatedSetup.touchEvidence.tapEntries.at(-1).subactionId = firstSetup.subactionId;
  duplicatedSetup.touchEvidence.tapEntries.at(-1).target = firstSetup.target;
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(duplicatedSetup),
      "mobile-chrome",
    ),
  );
});

test("G02 C10 range tap ledger retains the final native measurement", () => {
  const receipt = createG02ProductionReceiptFixture("mobile-chrome") as any;
  const entries = receipt.payload.touchEvidence.tapEntries.filter(
    ({ category }: any) => category === "calibration-attempt",
  );
  assert.ok(entries.length > 0);
  for (const entry of entries) {
    assert.ok(entry.rangeMeasurement);
    assert.equal(entry.rangeMeasurement.valueChanged,
      entry.rangeMeasurement.beforeValue !== entry.rangeMeasurement.afterValue);
  }
});

test("G02 C11 interaction surface checkpoints are passive and cannot repair or relabel a mismatch", () => {
  for (const project of ["desktop-chrome", "mobile-chrome"] as const) {
    const receipt = createG02ProductionReceiptFixture(project) as any;
    assert.ok(receipt.payload.interactionSurfaceObservations.length > 0);
    for (const observation of receipt.payload.interactionSurfaceObservations) {
      assert.equal(observation.setupTapCount, 0);
      assert.deepEqual(observation.setupActions, []);
    }

    const mismatch = structuredClone(receipt.payload);
    mismatch.interactionSurfaceObservations[0].htmlLang =
      mismatch.interactionSurfaceObservations[0].htmlLang === "en" ? "zh-Hans" : "en";
    assert.throws(() =>
      validateG02UntrustedStructuralReceipt(
        sealG02ProductionBrowserPayload(mismatch),
        project,
      ),
    );

    const repaired = structuredClone(receipt.payload);
    repaired.interactionSurfaceObservations[0].setupTapCount = 1;
    repaired.interactionSurfaceObservations[0].setupActions = [{ method: "page.mouse.click" }];
    assert.throws(() =>
      validateG02UntrustedStructuralReceipt(
        sealG02ProductionBrowserPayload(repaired),
        project,
      ),
    );

    const relabeled = structuredClone(receipt.payload);
    relabeled.interactionSurfaceObservations[0].phase = "after-reload";
    assert.throws(() =>
      validateG02UntrustedStructuralReceipt(
        sealG02ProductionBrowserPayload(relabeled),
        project,
      ),
    );
  }
});

test("G02 C11 binds every prior page-bottom to a fresh unobscured next-header boundary", () => {
  const receipt = createG02ProductionReceiptFixture("mobile-chrome") as any;
  const payload = receipt.payload;
  const transitions = payload.visualStates
    .filter(({ headerTransition }: any) => headerTransition !== null)
    .map(({ headerTransition }: any) => headerTransition);
  assert.equal(transitions.length, 20);
  for (const transition of transitions) {
    const prior = payload.visualStates.find(
      ({ stateId }: any) => stateId === transition.fromStateId,
    );
    const bottom = prior.scrollAudits.at(-1);
    assert.equal(bottom.scrollId, "page-bottom");
    assert.deepEqual(
      {
        documentMaxScrollY: transition.fromBoundary.documentMaxScrollY,
        rootDocumentBottom: transition.fromBoundary.rootDocumentBottom,
        rootDocumentCenter: transition.fromBoundary.rootDocumentCenter,
        rootDocumentTop: transition.fromBoundary.rootDocumentTop,
        scrollY: transition.fromBoundary.scrollY,
        viewport: transition.fromBoundary.viewport,
      },
      {
        documentMaxScrollY: bottom.geometry.documentMaxScrollY,
        rootDocumentBottom: bottom.geometry.rootDocumentBottom,
        rootDocumentCenter: bottom.geometry.rootDocumentCenter,
        rootDocumentTop: bottom.geometry.rootDocumentTop,
        scrollY: bottom.geometry.scrollY,
        viewport: {
          height: bottom.geometry.viewportHeight,
          width: bottom.geometry.viewportWidth,
        },
      },
    );
    assert.ok(
      bottom.capturedMonotonicMs < transition.fromBoundary.capturedMonotonicMs &&
      transition.fromBoundary.capturedMonotonicMs < transition.toHeader.capturedMonotonicMs,
    );
    assert.equal(transition.toHeader.targetFingerprint.withinHeader, true);
    const firstNextTap = payload.touchEvidence.tapEntries.find(
      ({ stateId }: any) => stateId === transition.toStateId,
    );
    assert.ok(firstNextTap);
    assert.ok(
      transition.toHeader.capturedMonotonicMs < firstNextTap.before.capturedMonotonicMs,
    );
  }

  const reused = structuredClone(payload);
  const reusedTransitions = reused.visualStates
    .filter(({ headerTransition }: any) => headerTransition !== null)
    .map(({ headerTransition }: any) => headerTransition);
  reusedTransitions[1].fromBoundary = structuredClone(reusedTransitions[0].fromBoundary);
  reusedTransitions[1].toHeader = structuredClone(reusedTransitions[0].toHeader);
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(reused),
      "mobile-chrome",
    ),
  );

  const overlaid = structuredClone(payload);
  const overlaidTransition = overlaid.visualStates.find(
    ({ headerTransition }: any) => headerTransition !== null,
  ).headerTransition;
  overlaidTransition.toHeader.targetFingerprint.withinHeader = false;
  overlaidTransition.toHeader.targetFingerprint.tagName = "div";
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(overlaid),
      "mobile-chrome",
    ),
  );

  const reordered = structuredClone(payload);
  const reorderedTransition = reordered.visualStates.find(
    ({ headerTransition }: any) => headerTransition !== null,
  ).headerTransition;
  const firstTap = reordered.touchEvidence.tapEntries.find(
    ({ stateId }: any) => stateId === reorderedTransition.toStateId,
  );
  reorderedTransition.toHeader.capturedMonotonicMs = firstTap.before.capturedMonotonicMs + 1;
  reorderedTransition.toHeader.capturedAt = new Date(
    reorderedTransition.toHeader.wallClockMinusMonotonicOriginMs +
      reorderedTransition.toHeader.capturedMonotonicMs,
  ).toISOString();
  assert.throws(() =>
    validateG02UntrustedStructuralReceipt(
      sealG02ProductionBrowserPayload(reordered),
      "mobile-chrome",
    ),
  );
});

test("G02 receipt mutations kill incomplete states, replayed ACKs, hollow UI evidence, and sibling-session drift", async (t) => {
  type MutablePayload = any;
  const durabilityCheckpointDriftCases = [
    "afterFirst",
    "afterReset",
    "afterSecond",
    "afterReload",
    "afterVisualFinal",
  ].flatMap((checkpoint) => [
    ...(["updatedAt", "completedAt"] as const).map((field) => [
      `raw ${checkpoint} sibling ${field} valid drift`,
      (payload: MutablePayload) => {
        payload.durabilityReceipts[0].rawSessionCheckpoints[checkpoint][0][field] =
          field === "updatedAt"
            ? "2026-08-20T00:00:03.000Z"
            : "2026-08-20T00:00:02.000Z";
      },
    ] as [string, (payload: MutablePayload) => void]),
    ...(["updatedAt", "completedAt"] as const).map((field) => [
      `raw ${checkpoint} target ${field} valid drift`,
      (payload: MutablePayload) => {
        payload.durabilityReceipts[0].rawSessionCheckpoints[checkpoint].at(-1)[field] =
          field === "updatedAt"
            ? "2026-08-20T00:00:03.000Z"
            : "2026-08-20T00:00:02.000Z";
      },
    ] as [string, (payload: MutablePayload) => void]),
  ]);
  const cases: Array<[string, (payload: MutablePayload) => void]> = [
    ["missing lab", (payload) => payload.labIds.pop()],
    ["surplus lab", (payload) => payload.labIds.push("surplus")],
    ["duplicate lab", (payload) => (payload.labIds[1] = payload.labIds[0])],
    ["reordered lab", (payload) => payload.labIds.reverse()],
    ["missing visual axis", (payload) => payload.visualAxisIds.pop()],
    ["surplus visual axis", (payload) => payload.visualAxisIds.push("surplus")],
    ["wrong interaction axis", (payload) => (payload.interactionAxisId = "mobile-chrome|zh-Hans|dark")],
    ["missing visual state", (payload) => payload.visualStates.pop()],
    ["duplicate visual state", (payload) => (payload.visualStates[1] = payload.visualStates[0])],
    ["reordered visual state", (payload) => payload.visualStates.reverse()],
    ["missing interaction state", (payload) => payload.interactionStates.pop()],
    ["duplicate interaction state", (payload) => (payload.interactionStates[1] = payload.interactionStates[0])],
    ["reordered interaction state", (payload) => payload.interactionStates.reverse()],
    ["mode observation drift", (payload) => (payload.interactionStates.find(({ scenarioId }: any) => scenarioId === "mode:subtract").observation.operation = "add")],
    ["decimal scale projection drift", (payload) => (payload.interactionStates.find(({ scenarioId }: any) => scenarioId === "endpoint:add:decimal-scale:max").observation.rightScale = 2)],
    ["missing setup subaction", (payload) => payload.interactionStates.find(({ scenarioId }: any) => scenarioId === "endpoint:divide:operand-a:max").action.subactions.shift()],
    ["missing reset subaction ACK", (payload) => payload.interactionStates.find(({ scenarioId }: any) => scenarioId === "endpoint:add:operand-a:min").action.subactions.pop()],
    ["non-200 learning ACK", (payload) => (payload.interactionStates.find(({ scenarioId }: any) => scenarioId === "first").action.subactions[0].analyticsEvidence.response.status = 201)],
    ["wrong learning request path", (payload) => (payload.interactionStates.find(({ scenarioId }: any) => scenarioId === "first").action.subactions[0].analyticsEvidence.endpoint = "/api/visualization-sessions")],
    ["valid plus malformed raw event surplus", (payload) => payload.interactionStates[1].action.subactions[0].analyticsEvidence.request.body.events.push({ malformed: true })],
    ["valid plus unrelated raw event surplus", (payload) => payload.interactionStates[1].action.subactions[0].analyticsEvidence.request.body.events.push(structuredClone(payload.interactionStates[2].action.subactions[0].analyticsEvidence.request.body.events[0]))],
    ["raw request body surplus field", (payload) => (payload.interactionStates[1].action.subactions[0].analyticsEvidence.request.body.unrelated = true)],
    ["raw event body surplus field", (payload) => (payload.interactionStates[1].action.subactions[0].analyticsEvidence.request.body.events[0].unrelated = true)],
    ["raw event forged source", (payload) => (payload.interactionStates[1].action.subactions[0].analyticsEvidence.request.body.events[0].source = "forged-source")],
    ["raw event forged topic", (payload) => (payload.interactionStates[1].action.subactions[0].analyticsEvidence.request.body.events[0].topicId = payload.labIds[1])],
    ["raw request event id list drift", (payload) => (payload.interactionStates[1].action.subactions[0].analyticsEvidence.request.eventIds = ["forged-id"])],
    ["raw response ACK id drift", (payload) => (payload.interactionStates[1].action.subactions[0].analyticsEvidence.response.acknowledgedEventIds = ["forged-id"])],
    ["raw owner user drift", (payload) => (payload.interactionStates[1].action.subactions[0].analyticsEvidence.request.userId = "forged-user")],
    ["event catalog source drift", (payload) => (payload.interactionStates[1].action.subactions[0].event.source = "forged-source")],
    ["event topic drift", (payload) => (payload.interactionStates[1].action.subactions[0].event.topicId = payload.labIds[1])],
    ["event durability user drift", (payload) => (payload.interactionStates[1].action.subactions[0].event.userId = "forged-user")],
    ["cross-lab event identity", (payload) => {
      const subaction = payload.interactionStates[1].action.subactions[0];
      subaction.event.labId = payload.labIds[1];
      subaction.event.topicId = payload.labIds[1];
    }],
    ["pre-action quiet missing", (payload) => (payload.interactionStates[1].action.subactions[0].temporal.preActionQuiet = false)],
    ["post-action quiet missing", (payload) => (payload.interactionStates[1].action.subactions[0].temporal.postActionQuiet = false)],
    ["temporal delivery count drift", (payload) => (payload.interactionStates[1].action.subactions[0].temporal.postActionQualifyingDeliveryCount += 1)],
    ["capture sequence replay", (payload) => (payload.interactionStates[2].action.subactions[0].temporal.captureSequence = payload.interactionStates[1].action.subactions[0].temporal.captureSequence)],
    ["stale 2000 event timestamp", (payload) => (payload.interactionStates[1].action.subactions[0].analyticsEvidence.request.body.events[0].timestamp = "2000-01-01T00:00:00.000Z")],
    ["delayed prior-action event timestamp", (payload) => {
      const prior = payload.interactionStates[1].action.subactions[0];
      const later = payload.interactionStates[2].action.subactions[0];
      later.analyticsEvidence.request.body.events[0].timestamp = prior.analyticsEvidence.request.body.events[0].timestamp;
    }],
    ["request observed before action started", (payload) => (payload.interactionStates[1].action.subactions[0].temporal.requestObservedAt = "2026-08-19T23:59:59.000Z")],
    ["monotonic action ordering forged", (payload) => (payload.interactionStates[1].action.subactions[0].temporal.actionSettledMonotonicMs = -1)],
    ["timestamp tolerance widened", (payload) => (payload.interactionStates[1].action.subactions[0].temporal.toleranceMs = 10_000)],
    ["joint clock origin drift", (payload) => (payload.interactionStates[1].action.subactions[0].temporal.wallClockMinusMonotonicOriginMs += 100)],
    ["joint claimed origins diverge within separate local tolerances", (payload) => {
      payload.interactionStates[1].action.subactions[0].temporal.wallClockMinusMonotonicOriginMs += 2;
      payload.interactionStates[2].action.subactions[0].temporal.wallClockMinusMonotonicOriginMs -= 2;
    }],
    ["later action copies prior event and physical interval", (payload) => {
      const prior = payload.interactionStates[1].action.subactions[0];
      const later = payload.interactionStates[2].action.subactions[0];
      later.analyticsEvidence.request.body.events[0].timestamp =
        prior.analyticsEvidence.request.body.events[0].timestamp;
      later.temporal.actionStartedAt = prior.temporal.actionStartedAt;
      later.temporal.requestObservedAt = prior.temporal.requestObservedAt;
      later.temporal.actionSettledAt = prior.temporal.actionSettledAt;
      later.temporal.actionStartedMonotonicMs = prior.temporal.actionStartedMonotonicMs;
      later.temporal.requestObservedMonotonicMs = prior.temporal.requestObservedMonotonicMs;
      later.temporal.actionSettledMonotonicMs = prior.temporal.actionSettledMonotonicMs;
      later.temporal.wallClockMinusMonotonicOriginMs =
        prior.temporal.wallClockMinusMonotonicOriginMs;
    }],
    ["event timestamp after action settled", (payload) => {
      const subaction = payload.interactionStates[1].action.subactions[0];
      subaction.analyticsEvidence.request.body.events[0].timestamp = new Date(
        Date.parse(subaction.temporal.actionSettledAt) + 10,
      ).toISOString();
    }],
    ["captured coverage drops event", (payload) => payload.analyticsCoverage.capturedQualifyingEventIds.pop()],
    ["consumed coverage drifts event", (payload) => (payload.analyticsCoverage.consumedReceiptEventIds[0] = "forged-id")],
    ["late qualifying delivery", (payload) => (payload.analyticsCoverage.lateDeliveryCount = 1)],
    ["unconsumed qualifying event", (payload) => payload.analyticsCoverage.unconsumedEventIds.push("late-event")],
    ["preceding event replays for later subaction", (payload) => {
      const subactions = payload.interactionStates.find(({ scenarioId }: any) => scenarioId === "endpoint:divide:operand-a:max").action.subactions;
      subactions[1].event.eventId = subactions[0].event.eventId;
    }],
    ["event not subaction-bound", (payload) => (payload.interactionStates.find(({ scenarioId }: any) => scenarioId === "first").action.subactions[0].event.subactionId = "prior")],
    ["generic fallback", (payload) => (payload.interactionStates[1].genericFallbackCount = 1)],
    ["hollow interaction UI scan", (payload) => (payload.interactionStates[1].uiScan.uiScan.paintedMarkCount = 0)],
    ["interaction collision issue", (payload) => (payload.interactionStates[1].uiScan.collisionIssueCount = 1)],
    ["interaction contrast scan hollow", (payload) => (payload.interactionStates[1].uiScan.contrastCheckedTextCount = 0)],
    ["hollow visual UI scan", (payload) => (payload.visualStates[0].scrollAudits[0].uiScan.candidatePairCount = 0)],
    ["visual reset missing ACK", (payload) => (payload.visualStates[0].resetAction.analyticsEvidence.response.status = 0)],
    ["visual reset reuses interaction event", (payload) => (payload.visualStates[0].resetAction.event.eventId = payload.interactionStates[1].action.subactions[0].event.eventId)],
    ["collision issue", (payload) => (payload.visualStates[0].scrollAudits[0].collisionIssueCount = 1)],
    ["contrast issue", (payload) => (payload.visualStates[0].scrollAudits[0].contrastIssueCount = 1)],
    ["clipped element", (payload) => (payload.visualStates[0].scrollAudits[0].clippedElementCount = 1)],
    ["horizontal overflow", (payload) => (payload.visualStates[0].scrollAudits[0].horizontalOverflowPixels = 1)],
    ["touch target issue", (payload) => (payload.visualStates[0].scrollAudits[0].touchTargetIssueCount = 1)],
    ["scroll positions collapse", (payload) => (payload.visualStates[0].scrollAudits[1].geometry.scrollY = payload.visualStates[0].scrollAudits[0].geometry.scrollY)],
    ["plausible fake scroll triplet", (payload) => {
      payload.visualStates[0].scrollAudits[0].geometry.scrollY = 100;
      payload.visualStates[0].scrollAudits[1].geometry.scrollY = 200;
      payload.visualStates[0].scrollAudits[2].geometry.scrollY = 300;
    }],
    ["bottom document maximum forged", (payload) => (payload.visualStates[0].scrollAudits[2].geometry.documentMaxScrollY = 300)],
    ["center root landmark forged", (payload) => (payload.visualStates[0].scrollAudits[1].geometry.rootCenter = 100)],
    ["impossible root movement in document space", (payload) => {
      const geometry = payload.visualStates[0].scrollAudits[1].geometry;
      geometry.rootTop += 20;
      geometry.rootBottom += 20;
      geometry.rootCenter += 20;
      geometry.rootDocumentTop += 20;
      geometry.rootDocumentBottom += 20;
      geometry.rootDocumentCenter += 20;
    }],
    ["scroll method mislabeled", (payload) => (payload.visualStates[0].scrollAudits[0].scrollMethod = "locator.scrollIntoViewIfNeeded")],
    ["retry", (payload) => (payload.execution.retries = 1)],
    ["production completeness overclaim", (payload) => (payload.execution.complete = true)],
    ["runner release readiness forged", (payload) => (payload.runnerInvocation.releaseReady = true)],
    ["runner authority forged", (payload) => (payload.runnerInvocation.authorityAvailable = true)],
    ["runner desktop-only narrowing", (payload) => payload.runnerInvocation.args.splice(2, 0, "--project=desktop-chrome")],
    ["runner grep-invert narrowing", (payload) => payload.runnerInvocation.args.splice(2, 0, "--grep-invert=visual")],
    ["runner shard narrowing", (payload) => payload.runnerInvocation.args.splice(2, 0, "--shard=1/2")],
    ["runner receipt fabricated", (payload) => (payload.runnerInvocation.runnerReceiptSha256 = "f".repeat(64))],
    ["skip", (payload) => (payload.execution.skipped = 1)],
    ["project pair narrowed", (payload) => payload.execution.projectsTogether.pop()],
    ["console error", (payload) => payload.diagnostics.consoleErrors.push("boom")],
    ["request failure", (payload) => payload.diagnostics.requestFailures.push("GET /asset")],
    ["sentinel source hash", (payload) => (payload.sourceEvidence.rawFiles[0].sha256 = "a".repeat(64))],
    ["unnamed source", (payload) => (payload.sourceEvidence.rawFiles[0].path = "unknown")],
    ["first action after reset ambiguity", (payload) => (payload.durabilityReceipts[0].firstAction.completedBeforeReset = false)],
    ["reset creates second session", (payload) => (payload.durabilityReceipts[0].reset.postCount = 1)],
    ["second action creates second session", (payload) => (payload.durabilityReceipts[0].secondAction.postCount = 1)],
    ["sibling mutated after first", (payload) => (payload.durabilityReceipts[0].siblings.afterFirst[1].sessionCount = 2)],
    ["reload lost same session", (payload) => (payload.durabilityReceipts[0].reload.sameSession = false)],
    ["durability sequence reordered", (payload) => payload.durabilityReceipts[0].sequence.reverse()],
    ["raw after-registration session surplus", (payload) => {
      payload.durabilityReceipts[0].rawSessionCheckpoints.afterRegistration.push(
        structuredClone(payload.durabilityReceipts[0].rawSessionCheckpoints.afterSiblingSeed[0]),
      );
    }],
    ["raw sibling session order drift", (payload) => payload.durabilityReceipts[0].rawSessionCheckpoints.afterSiblingSeed.reverse()],
    ["raw target checkpoint valid non-G02 catalog surplus", (payload) => {
      const otherCatalogLab = getVisualizationLabByLabId("capstone-primary-number-sense-bridge");
      if (!otherCatalogLab) throw new TypeError("C5 non-G02 mutation catalog row is absent.");
      const surplus = structuredClone(
        payload.durabilityReceipts[0].rawSessionCheckpoints.afterVisualFinal[0],
      );
      surplus.topicId = otherCatalogLab.labId;
      surplus.source = otherCatalogLab.analyticsSource;
      payload.durabilityReceipts[0].rawSessionCheckpoints.afterVisualFinal.push(surplus);
    }],
    ...durabilityCheckpointDriftCases,
    ["final sibling projection updatedAt drift", (payload) => {
      payload.durabilityReceipts[0].afterVisualFinal.siblings.sessions[0].updatedAt =
        "2026-08-20T00:00:03.000Z";
    }],
    ["final sibling projection completedAt drift", (payload) => {
      payload.durabilityReceipts[0].afterVisualFinal.siblings.sessions[0].completedAt =
        "2026-08-20T00:00:02.000Z";
    }],
    ["final target projection updatedAt drift", (payload) => {
      payload.durabilityReceipts[0].afterVisualFinal.target.sessions[0].updatedAt =
        "2026-08-20T00:00:03.000Z";
    }],
    ["final target projection completedAt drift", (payload) => {
      payload.durabilityReceipts[0].afterVisualFinal.target.sessions[0].completedAt =
        "2026-08-20T00:00:02.000Z";
    }],
    ["coherent visual reset before last interaction", (payload) => {
      const labId = payload.labIds[0];
      const interactionSubactions = payload.interactionStates
        .filter((state: any) => state.labId === labId)
        .flatMap((state: any) => state.action.subactions)
        .sort((left: any, right: any) => left.temporal.captureSequence - right.temporal.captureSequence);
      const visualActions = payload.visualStates
        .filter((state: any) => state.labId === labId)
        .map((state: any) => state.resetAction)
        .sort((left: any, right: any) => left.temporal.captureSequence - right.temporal.captureSequence);
      const lastInteraction = interactionSubactions.at(-1);
      const firstVisual = visualActions[0];
      const priorInteractionTemporal = structuredClone(lastInteraction.temporal);
      lastInteraction.temporal = structuredClone(firstVisual.temporal);
      firstVisual.temporal = priorInteractionTemporal;
      for (const subaction of [lastInteraction, firstVisual]) {
        subaction.analyticsEvidence.request.body.events[0].timestamp = new Date(
          Date.parse(subaction.temporal.actionStartedAt) + 100,
        ).toISOString();
      }
      const chronologicallyOrderedIds = payload.interactionStates
        .flatMap((state: any) => state.action.subactions)
        .concat(payload.visualStates.map((state: any) => state.resetAction))
        .sort((left: any, right: any) => left.temporal.captureSequence - right.temporal.captureSequence)
        .map((subaction: any) => subaction.event.eventId);
      payload.analyticsCoverage.capturedQualifyingEventIds = chronologicallyOrderedIds;
      payload.analyticsCoverage.consumedReceiptEventIds = [...chronologicallyOrderedIds];
    }],
    ["after-visual capture boundary precedes last visual reset", (payload) => {
      const boundary = payload.durabilityReceipts[0].afterVisualFinal.captureBoundary;
      const lastVisual = payload.visualStates
        .filter((state: any) => state.labId === payload.labIds[0])
        .map((state: any) => state.resetAction)
        .sort((left: any, right: any) => left.temporal.captureSequence - right.temporal.captureSequence)
        .at(-1);
      boundary.capturedAt = lastVisual.temporal.actionStartedAt;
      boundary.capturedMonotonicMs = lastVisual.temporal.actionStartedMonotonicMs;
    }],
    ["after-visual capture boundary origin drifts", (payload) => {
      payload.durabilityReceipts[0].afterVisualFinal.captureBoundary.wallClockMinusMonotonicOriginMs += 3;
    }],
    ["after-visual capture boundary lab order drifts", (payload) => {
      payload.durabilityReceipts[0].afterVisualFinal.captureBoundary.labSequenceIndex = 1;
    }],
    ["after-visual capture boundary next sequence drifts", (payload) => {
      payload.durabilityReceipts[0].afterVisualFinal.captureBoundary.beforeNextActionCaptureSequence += 1;
    }],
    ["after-visual final target lost", (payload) => (payload.durabilityReceipts[0].afterVisualFinal.target.count = 0)],
    ["after-visual sibling mutation", (payload) => (payload.durabilityReceipts[0].afterVisualFinal.siblingCounts[1].sessionCount = 2)],
    ["after-visual session post", (payload) => (payload.durabilityReceipts[0].afterVisualFinal.postCount = 1)],
    ["after-visual target source forged", (payload) => (payload.durabilityReceipts[0].afterVisualFinal.target.sessions[0].source = "forged-source")],
    ["after-visual target crosses lab", (payload) => (payload.durabilityReceipts[0].afterVisualFinal.target.sessions[0].topicId = payload.labIds[1])],
    ["play claim", (payload) => (payload.playApplicable = true)],
    ["Cartesian overclaim", (payload) => (payload.fullVisualInteractionCartesian = true)],
  ];

  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const payload = structuredClone(
        createG02ProductionReceiptFixture("desktop-chrome").payload,
      );
      mutate(payload);
      assert.throws(() =>
        validateG02UntrustedStructuralReceipt(
          sealG02ProductionBrowserPayload(payload),
          "desktop-chrome",
        ),
      );
    });
  }
});

test("G02 mobile receipt rejects touchless, setter-only, and tap-free evidence", async (t) => {
  type MutablePayload = any;
  const cases: Array<[string, (payload: MutablePayload) => void]> = [
    ["hasTouch false", (payload) => (payload.touchEvidence.hasTouch = false)],
    ["no real tap", (payload) => (payload.touchEvidence.realTapCount = 0)],
    ["no real swipe", (payload) => (payload.touchEvidence.realSwipeCount = 0)],
    ["missing return swipe", (payload) => payload.touchEvidence.directionalSwipes.pop()],
    ["swipe order reversed", (payload) => payload.touchEvidence.directionalSwipes.reverse()],
    ["toward-end displacement wrong sign", (payload) => {
      payload.touchEvidence.directionalSwipes[0].afterScrollLeft = -1;
      payload.touchEvidence.directionalSwipes[0].signedDisplacement = -1;
    }],
    ["toward-start displacement mismatched", (payload) => (payload.touchEvidence.directionalSwipes[1].signedDisplacement = -99)],
    ["swipe move count hollow", (payload) => (payload.touchEvidence.directionalSwipes[0].moveCount = 0)],
    ["return swipe discontinuity", (payload) => {
      const returning = payload.touchEvidence.directionalSwipes[1];
      returning.beforeScrollLeft = 150;
      returning.signedDisplacement = returning.afterScrollLeft - returning.beforeScrollLeft;
    }],
    ["return swipe does not materially return", (payload) => {
      const returning = payload.touchEvidence.directionalSwipes[1];
      returning.afterScrollLeft = 90;
      returning.signedDisplacement = returning.afterScrollLeft - returning.beforeScrollLeft;
    }],
    ["mobile scroll mislabeled keyboard", (payload) => (payload.visualStates[0].scrollAudits[0].scrollMethod = "page.keyboard.press")],
    ["setter-only fake touch", (payload) => (payload.interactionStates[1].action.subactions[0].method = "evaluate:nativeSetter")],
    ["tap-free fake touch", (payload) => (payload.interactionStates[1].action.subactions[0].method = "locator.fill")],
    ["uncalibrated mobile native range", (payload) => {
      const rangeSubaction = payload.interactionStates
        .flatMap((state: any) => state.action.subactions)
        .find((subaction: any) => subaction.target.startsWith("range:"));
      rangeSubaction.method = "page.touchscreen.tap";
    }],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const payload = structuredClone(
        createG02ProductionReceiptFixture("mobile-chrome").payload,
      );
      mutate(payload);
      assert.throws(() =>
        validateG02UntrustedStructuralReceipt(
          sealG02ProductionBrowserPayload(payload),
          "mobile-chrome",
        ),
      );
    });
  }
});

test("G02 receipt envelope rejects stale hashes and surplus keys", () => {
  const stale = createG02ProductionReceiptFixture("desktop-chrome") as any;
  stale.payloadSha256 = "0".repeat(64);
  assert.throws(() => validateG02UntrustedStructuralReceipt(stale, "desktop-chrome"));

  const surplus = createG02ProductionReceiptFixture("desktop-chrome") as any;
  surplus.payload.surplus = true;
  surplus.payloadSha256 = "0".repeat(64);
  assert.throws(() => validateG02UntrustedStructuralReceipt(surplus, "desktop-chrome"));
});
