import assert from "node:assert/strict";
import test from "node:test";

import { G07_PRODUCTION_PLAN } from "./china-mainland-g07-production-plan";
import {
  G07_CANONICAL_RUNNER_INVOCATION,
  assertG07TrustedRunnerAuthority,
  createG07ProductionReceiptFixture,
  deriveG07RequiredSetupCategories,
  g07DomIdentityFingerprint,
  sealG07ProductionBrowserPayload,
  validateG07ProductionBrowserReceipt,
  validateG07UntrustedStructuralReceipt,
} from "./china-mainland-g07-production-receipt";

function swapPhysicalDeliverySemantics(
  payload: any,
  leftDeliveryId: string,
  rightDeliveryId: string,
) {
  const deliveries = payload.analyticsLedger.rawDeliveries;
  const leftIndex = deliveries.findIndex(({ deliveryId }: any) => deliveryId === leftDeliveryId);
  const rightIndex = deliveries.findIndex(({ deliveryId }: any) => deliveryId === rightDeliveryId);
  assert.notEqual(leftIndex, -1);
  assert.notEqual(rightIndex, -1);
  const preservedLeft = {
    captureSequence: deliveries[leftIndex].captureSequence,
    temporal: structuredClone(deliveries[leftIndex].temporal),
  };
  const preservedRight = {
    captureSequence: deliveries[rightIndex].captureSequence,
    temporal: structuredClone(deliveries[rightIndex].temporal),
  };
  const left = structuredClone(deliveries[leftIndex]);
  const right = structuredClone(deliveries[rightIndex]);
  deliveries[leftIndex] = { ...right, ...preservedLeft };
  deliveries[rightIndex] = { ...left, ...preservedRight };
  for (const index of [leftIndex, rightIndex]) {
    const delivery = deliveries[index];
    delivery.parsedRequestBody.events[0].timestamp = delivery.temporal.requestObservedAt;
    delivery.parsedResponseBody.acknowledgedEventIds = [delivery.parsedRequestBody.events[0].id];
    delivery.rawRequestBody = delivery.serializedRequestBody = JSON.stringify(delivery.parsedRequestBody);
    delivery.rawResponseBody = delivery.serializedResponseBody = JSON.stringify(delivery.parsedResponseBody);
  }
  const deliveryIds = deliveries.map(({ deliveryId }: any) => deliveryId);
  const eventIds = deliveries.map(({ parsedRequestBody }: any) => parsedRequestBody.events[0].id);
  payload.analyticsLedger.consumedDeliveryIds = [...deliveryIds];
  for (const key of [
    "consumedEventIds",
    "parsedEventIds",
    "rawEventIds",
    "receiptEventIds",
    "serializedEventIds",
  ]) payload.analyticsLedger[key] = [...eventIds];
}

test("G07 public receipt stays plan-bound and unavailable without native runner authority", () => {
  assert.equal(
    G07_PRODUCTION_PLAN.canonicalSha256,
    "c7d41297e48880c149f25f3e7aac13ac1d16518175aa37dbd3aab6362e2cd477",
  );
  assert.deepEqual(
    {
      authorityAvailable: G07_CANONICAL_RUNNER_INVOCATION.authorityAvailable,
      releaseReady: G07_CANONICAL_RUNNER_INVOCATION.releaseReady,
      runnerReceiptSha256:
        G07_CANONICAL_RUNNER_INVOCATION.runnerReceiptSha256,
    },
    {
      authorityAvailable: false,
      releaseReady: false,
      runnerReceiptSha256: null,
    },
  );
  assert.throws(
    () => assertG07TrustedRunnerAuthority(G07_CANONICAL_RUNNER_INVOCATION),
    /trusted native runner.*unavailable/u,
  );

  const desktop = createG07ProductionReceiptFixture("desktop-chrome");
  assert.equal(
    validateG07UntrustedStructuralReceipt(desktop, "desktop-chrome"),
    true,
  );
  assert.equal(desktop.payload.visualStates.length, 42);
  assert.equal(desktop.payload.interactionStates.length, 274);
  assert.equal(desktop.payload.execution.complete, false);
});

test("G07 two project receipts cover the exact 84 visual and 548 interaction states without a Cartesian claim", () => {
  const desktop = createG07ProductionReceiptFixture("desktop-chrome");
  const mobile = createG07ProductionReceiptFixture("mobile-chrome");
  assert.equal(validateG07UntrustedStructuralReceipt(mobile, "mobile-chrome"), true);
  assert.equal(
    desktop.payload.visualStates.length + mobile.payload.visualStates.length,
    84,
  );
  assert.equal(
    desktop.payload.interactionStates.length +
      mobile.payload.interactionStates.length,
    548,
  );
  assert.equal(desktop.payload.fullVisualInteractionCartesian, false);
  assert.equal(desktop.payload.playApplicable, false);
  assert.deepEqual(
    new Set(
      desktop.payload.interactionStates
        .filter(({ scenarioId }) => scenarioId.startsWith("mode:"))
        .map(({ observation }) => observation.observed.mode),
    ),
    new Set([
      "collect-like-terms",
      "add",
      "subtract",
      "expand",
      "factor",
      "substitute",
      "fraction-simplify",
      "solve",
    ]),
  );
});

test("G07 receipts use the production analytics union, observe interaction locale/theme twice, and retain captured JSON bytes", () => {
  const desktop = createG07ProductionReceiptFixture("desktop-chrome");
  const mobile = createG07ProductionReceiptFixture("mobile-chrome");
  const desktopEvents = desktop.payload.analyticsLedger.rawDeliveries.map(
    ({ parsedRequestBody }) => parsedRequestBody.events[0],
  );
  assert.deepEqual(
    new Set(desktopEvents.map(({ type }) => type)),
    new Set(["visualization-slider", "visualization-probe", "visualization-reset"]),
  );
  for (const receipt of desktop.payload.durabilityReceipts) {
    assert.deepEqual(receipt.interactionSurfaceEvidence, {
      afterReload: { htmlLang: "en", locale: "en", theme: "light" },
      beforeInitial: { htmlLang: "en", locale: "en", theme: "light" },
    });
  }
  for (const receipt of mobile.payload.durabilityReceipts) {
    assert.deepEqual(receipt.interactionSurfaceEvidence, {
      afterReload: { htmlLang: "zh-Hans", locale: "zh-Hans", theme: "dark" },
      beforeInitial: { htmlLang: "zh-Hans", locale: "zh-Hans", theme: "dark" },
    });
  }
  const delivery = desktop.payload.analyticsLedger.rawDeliveries[0]!;
  const reorderedRaw = JSON.stringify({
    generation: delivery.parsedRequestBody.generation,
    events: delivery.parsedRequestBody.events,
  });
  delivery.rawRequestBody = reorderedRaw;
  delivery.serializedRequestBody = reorderedRaw;
  assert.equal(
    validateG07UntrustedStructuralReceipt(
      sealG07ProductionBrowserPayload(desktop.payload),
      "desktop-chrome",
    ),
    true,
  );
});

test("G07 receipt mutations kill incomplete coverage and dishonest browser evidence", async (t) => {
  type MutablePayload = any;
  const desktopCases: Array<[string, (payload: MutablePayload) => void]> = [
    ["missing lab", (payload) => payload.labIds.pop()],
    ["surplus lab", (payload) => payload.labIds.push("surplus")],
    ["duplicate lab", (payload) => (payload.labIds[1] = payload.labIds[0])],
    ["reordered lab", (payload) => payload.labIds.reverse()],
    ["missing visual axis", (payload) => payload.visualAxisIds.pop()],
    ["surplus visual axis", (payload) => payload.visualAxisIds.push("surplus")],
    ["duplicate visual axis", (payload) => (payload.visualAxisIds[1] = payload.visualAxisIds[0])],
    ["reordered visual axis", (payload) => payload.visualAxisIds.reverse()],
    ["wrong interaction axis", (payload) => (payload.interactionAxisId = "mobile-chrome|zh-Hans|dark")],
    ["missing mode state", (payload) => payload.interactionStates.splice(payload.interactionStates.findIndex(({ scenarioId }: any) => scenarioId === "mode:add"), 1)],
    ["surplus state", (payload) => payload.interactionStates.push(payload.interactionStates[0])],
    ["duplicate state", (payload) => (payload.interactionStates[1] = payload.interactionStates[0])],
    ["reordered state", (payload) => payload.interactionStates.reverse()],
    ["missing visual state", (payload) => payload.visualStates.pop()],
    ["endpoint range drift", (payload) => (payload.interactionStates.find(({ scenarioId }: any) => scenarioId.startsWith("endpoint:")).control.max += 1)],
    ["endpoint observation drift", (payload) => (payload.interactionStates.find(({ scenarioId }: any) => scenarioId.startsWith("endpoint:")).observation.observed.constantA += 1)],
    ["rejected endpoint accepted", (payload) => {
      const state = payload.interactionStates.find(({ labId, scenarioId }: any) => labId === "bnu-junior-s2-lower-algebraic-fractions-equations" && scenarioId === "endpoint:solve:constant-a:mid");
      state.observation.accepted = true;
      state.observation.error = null;
    }],
    ["reset drift", (payload) => (payload.interactionStates.find(({ resetAfter }: any) => resetAfter).resetAfter.observation.observed.constantA += 1)],
    ["generic fallback", (payload) => (payload.interactionStates[1].genericFallbackCount = 1)],
    ["hollow UI scan", (payload) => (payload.interactionStates[1].uiScan.paintedMarkCount = 0)],
    ["clipped text", (payload) => (payload.visualStates[0].scrollAudits[0].clippedElementCount = 1)],
    ["contrast failure", (payload) => (payload.visualStates[0].scrollAudits[0].contrastIssueCount = 1)],
    ["overflow", (payload) => (payload.visualStates[0].scrollAudits[0].horizontalOverflowPixels = 1)],
    ["touch target failure", (payload) => (payload.visualStates[0].scrollAudits[0].touchTargetIssueCount = 1)],
    ["fake page top", (payload) => (payload.visualStates[0].scrollAudits[0].geometry.scrollY = 20)],
    ["zero document scroll range", (payload) => payload.visualStates[0].scrollAudits.forEach(({ geometry }: any) => (geometry.documentMaxScrollY = 0))],
    ["non-strict scroll order", (payload) => (payload.visualStates[0].scrollAudits[1].geometry.scrollY = payload.visualStates[0].scrollAudits[0].geometry.scrollY)],
    ["scroll viewport drift", (payload) => (payload.visualStates[0].scrollAudits[2].geometry.viewportHeight += 1)],
    ["document-space root drift", (payload) => (payload.visualStates[0].scrollAudits[1].geometry.rootDocumentTop += 10)],
    ["zero analytics", (payload) => payload.analyticsLedger.rawDeliveries.pop()],
    ["malformed raw request", (payload) => (payload.analyticsLedger.rawDeliveries[0].rawRequestBody = "{" )],
    ["other-lab event", (payload) => {
      const delivery = payload.analyticsLedger.rawDeliveries[0];
      delivery.parsedRequestBody.events[0].topicId = payload.labIds[1];
      delivery.rawRequestBody = delivery.serializedRequestBody = JSON.stringify(delivery.parsedRequestBody);
    }],
    ["surplus raw delivery", (payload) => payload.analyticsLedger.rawDeliveries.push(structuredClone(payload.analyticsLedger.rawDeliveries[0]))],
    ["event ID reuse", (payload) => {
      const delivery = payload.analyticsLedger.rawDeliveries[1];
      delivery.parsedRequestBody.events[0].id = payload.analyticsLedger.rawDeliveries[0].parsedRequestBody.events[0].id;
      delivery.rawRequestBody = delivery.serializedRequestBody = JSON.stringify(delivery.parsedRequestBody);
    }],
    ["unsupported analytics event type", (payload) => {
      const delivery = payload.analyticsLedger.rawDeliveries[0];
      delivery.parsedRequestBody.events[0].type = "visualization-action";
      delivery.rawRequestBody = delivery.serializedRequestBody = JSON.stringify(delivery.parsedRequestBody);
    }],
    ["semantic analytics event type drift", (payload) => {
      const delivery = payload.analyticsLedger.rawDeliveries.find((candidate: any) =>
        payload.interactionStates.some(({ action }: any) =>
          action.subactions.some(({ deliveryId, target }: any) => deliveryId === candidate.deliveryId && target.startsWith("range:")),
        ),
      );
      delivery.parsedRequestBody.events[0].type = "visualization-probe";
      delivery.rawRequestBody = delivery.serializedRequestBody = JSON.stringify(delivery.parsedRequestBody);
    }],
    ["duplicate global capture sequence", (payload) => (payload.analyticsLedger.rawDeliveries[1].captureSequence = payload.analyticsLedger.rawDeliveries[0].captureSequence)],
    ["noncontiguous global capture sequence", (payload) => (payload.analyticsLedger.rawDeliveries[1].captureSequence += 10)],
    ["semantic phase reorder", (payload) => {
      const action = payload.interactionStates.find(({ action }: any) => action.subactions.length >= 3).action;
      swapPhysicalDeliverySemantics(payload, action.subactions[0].deliveryId, action.subactions[1].deliveryId);
    }],
    ["lab serial reorder", (payload) => {
      const left = payload.interactionStates.find(({ labId, action }: any) => labId === payload.labIds[0] && action.subactions.length > 0).action.subactions[0];
      const right = payload.interactionStates.find(({ labId, action }: any) => labId === payload.labIds[1] && action.subactions.length > 0).action.subactions[0];
      swapPhysicalDeliverySemantics(payload, left.deliveryId, right.deliveryId);
    }],
    ["overlapping analytics windows", (payload) => {
      const previous = payload.analyticsLedger.rawDeliveries[0].temporal;
      const current = payload.analyticsLedger.rawDeliveries[1].temporal;
      current.actionStartedMonotonicMs = previous.actionSettledMonotonicMs - 1;
      current.actionStartedAt = new Date(current.clockOriginEpochMs + current.actionStartedMonotonicMs).toISOString();
    }],
    ["wall monotonic origin drift", (payload) => {
      payload.analyticsLedger.rawDeliveries[1].temporal.requestObservedAt = "2026-08-20T03:00:00.000Z";
    }],
    ["raw capture byte drift", (payload) => {
      const delivery = payload.analyticsLedger.rawDeliveries[0];
      delivery.rawRequestBody = ` ${delivery.rawRequestBody}`;
    }],
    ["response body not ready", (payload) => (payload.analyticsLedger.rawDeliveries[0].responseBodyReady = false)],
    ["delayed event", (payload) => (payload.analyticsLedger.rawDeliveries[0].parsedRequestBody.events[0].timestamp = "2026-08-19T00:00:00.000Z")],
    ["owner drift", (payload) => (payload.analyticsLedger.rawDeliveries[0].ownerUserId = "other-user")],
    ["ACK ID drift", (payload) => (payload.analyticsLedger.rawDeliveries[0].parsedResponseBody.acknowledgedEventIds[0] = "other-event")],
    ["terminal consumed drift", (payload) => payload.analyticsLedger.consumedEventIds.pop()],
    ["unconsumed delivery", (payload) => payload.analyticsLedger.unconsumedDeliveryIds.push("delivery:late")],
    ["console error", (payload) => payload.diagnostics.consoleErrors.push("boom")],
    ["page error", (payload) => payload.diagnostics.pageErrors.push("boom")],
    ["request failure", (payload) => payload.diagnostics.requestFailures.push("GET /asset")],
    ["retry", (payload) => (payload.execution.retries = 1)],
    ["skip", (payload) => (payload.execution.skipped = 1)],
    ["forged complete", (payload) => (payload.execution.complete = true)],
    ["forged runner authority", (payload) => (payload.runnerInvocation.authorityAvailable = true)],
    ["forged release ready", (payload) => (payload.runnerInvocation.releaseReady = true)],
    ["target present at mount", (payload) => {
      payload.durabilityReceipts[0].stages[0].target = structuredClone(payload.durabilityReceipts[0].stages[1].target);
    }],
    ["missing sibling", (payload) => payload.durabilityReceipts[0].stages[2].siblings.sessions.pop()],
    ["sibling mutation", (payload) => (payload.durabilityReceipts[0].stages[3].siblings.sessions[0].updatedAt = "2026-08-20T00:00:01.000Z")],
    ["same-user drift", (payload) => (payload.durabilityReceipts[0].stages[4].siblings.userId = "other-user")],
    ["interaction locale drift before initial", (payload) => (payload.durabilityReceipts[0].interactionSurfaceEvidence.beforeInitial.htmlLang = "zh-Hans")],
    ["interaction theme drift after reload", (payload) => (payload.durabilityReceipts[0].interactionSurfaceEvidence.afterReload.theme = "dark")],
    ["second session POST", (payload) => (payload.durabilityReceipts[0].stages[3].postCount = 1)],
    ["play claim", (payload) => (payload.playApplicable = true)],
    ["Cartesian claim", (payload) => (payload.fullVisualInteractionCartesian = true)],
    ["source hash drift", (payload) => (payload.sourceEvidence.selectedCriticalSources[0].sha256 = "0".repeat(64))],
    ["critical source version drift", (payload) => (payload.sourceEvidence.selectionVersion = "stale")],
    ["unsupported recursive closure claim", (payload) => (payload.sourceEvidence.transitiveClosureClaimed = true)],
    ["missing critical source file", (payload) => payload.sourceEvidence.selectedCriticalSources.pop()],
    ["surplus critical source file", (payload) => payload.sourceEvidence.selectedCriticalSources.push(structuredClone(payload.sourceEvidence.selectedCriticalSources[0]))],
    ["reordered critical sources", (payload) => payload.sourceEvidence.selectedCriticalSources.reverse()],
  ];
  for (const [name, mutate] of desktopCases) {
    await t.test(name, () => {
      const payload = structuredClone(
        createG07ProductionReceiptFixture("desktop-chrome").payload,
      );
      mutate(payload);
      assert.throws(() =>
        validateG07UntrustedStructuralReceipt(
          sealG07ProductionBrowserPayload(payload),
          "desktop-chrome",
        ),
      );
    });
  }

  const mobileCases: Array<[string, (payload: MutablePayload) => void]> = [
    ["hasTouch false", (payload) => (payload.touchEvidence.hasTouch = false)],
    ["no two-way swipe", (payload) => payload.touchEvidence.directionalSwipes.pop()],
    ["fake swipe protocol", (payload) => (payload.touchEvidence.directionalSwipes[0].protocol = "evaluate")],
    ["no local overflow", (payload) => (payload.touchEvidence.directionalSwipes[0].scrollWidth = payload.touchEvidence.directionalSwipes[0].clientWidth)],
    ["wrong displacement", (payload) => (payload.touchEvidence.directionalSwipes[0].signedDisplacement = 0)],
    ["swipe lab identity drift", (payload) => (payload.touchEvidence.directionalSwipes[1].labId = payload.labIds[1])],
    ["swipe scroller identity drift", (payload) => (payload.touchEvidence.directionalSwipes[1].scrollerId = "other-scroller")],
    ["swipe continuity drift", (payload) => (payload.touchEvidence.directionalSwipes[1].beforeScrollLeft = payload.touchEvidence.directionalSwipes[0].afterScrollLeft - 1)],
    ["swipe fails exact return", (payload) => (payload.touchEvidence.directionalSwipes[1].afterScrollLeft = payload.touchEvidence.directionalSwipes[0].beforeScrollLeft + 1)],
    ["fake tap", (payload) => (payload.interactionStates[1].action.subactions[0].method = "evaluate:nativeSetter")],
    ["dishonest scroll method", (payload) => (payload.visualStates[0].scrollAudits[0].scrollMethod = "page.keyboard.press")],
  ];
  for (const [name, mutate] of mobileCases) {
    await t.test(name, () => {
      const payload = structuredClone(
        createG07ProductionReceiptFixture("mobile-chrome").payload,
      );
      mutate(payload);
      assert.throws(() =>
        validateG07UntrustedStructuralReceipt(
          sealG07ProductionBrowserPayload(payload),
          "mobile-chrome",
        ),
      );
    });
  }
});

test("G07 receipt envelope rejects stale SHA and surplus keys", () => {
  const stale = createG07ProductionReceiptFixture("desktop-chrome") as any;
  stale.payloadSha256 = "0".repeat(64);
  assert.throws(() =>
    validateG07UntrustedStructuralReceipt(stale, "desktop-chrome"),
  );
  const surplus = createG07ProductionReceiptFixture("desktop-chrome") as any;
  surplus.payload.surplus = true;
  assert.throws(() =>
    validateG07UntrustedStructuralReceipt(
      sealG07ProductionBrowserPayload(surplus.payload),
      "desktop-chrome",
    ),
  );
});

test("G07 C4 fixture carries exact range attempts, session checkpoints, listener lifetime, and phase boundaries", () => {
  const mobile = createG07ProductionReceiptFixture("mobile-chrome");
  const payload: any = mobile.payload;
  const rangeSubactions = payload.interactionStates.flatMap(({ action }: any) =>
    action.subactions.filter(({ target }: any) => target.startsWith("range:")),
  );
  assert.equal(payload.touchEvidence.rangeTouchAttempts.length, rangeSubactions.length);
  assert.ok(payload.touchEvidence.rangeTouchAttempts.some(({ expectedAccepted }: any) => expectedAccepted === false));
  for (const attempt of payload.touchEvidence.rangeTouchAttempts) {
    assert.equal(attempt.attemptNumber, 1);
    assert.equal(attempt.maxAttempts, 1);
    assert.equal(attempt.attemptedValue, attempt.requestedValue);
    if (attempt.expectedAccepted) assert.equal(attempt.afterObservedValue, attempt.requestedValue);
    else assert.equal(attempt.afterObservedValue, attempt.beforeObservedValue);
  }
  for (const durability of payload.durabilityReceipts) {
    assert.deepEqual(
      durability.rawSessionCheckpointChain.map(({ checkpointId }: any) => checkpointId),
      [
        "post-registration",
        "after-sibling-seed",
        "after-first",
        "after-reset",
        "after-second",
        "after-reload",
        ...payload.visualAxisIds.map((axisId: string) => `after-visual:${axisId}`),
        "final",
      ],
    );
    assert.equal(durability.phaseBoundary.labSequenceIndex, payload.labIds.indexOf(durability.labId));
  }
  assert.equal(payload.analyticsLedger.listenerLifetime.installedOnce, true);
  assert.equal(payload.analyticsLedger.listenerLifetime.disposedAfterTerminalQuiescence, true);
  assert.equal(validateG07UntrustedStructuralReceipt(mobile, "mobile-chrome"), true);
});

test("G07 C4 mutations reject dishonest range, raw checkpoint, lifetime, and phase evidence", async (t) => {
  const cases: Array<[string, (payload: any) => void]> = [
    ["missing range touch attempt", (payload) => payload.touchEvidence.rangeTouchAttempts.pop()],
    ["surplus range touch attempt", (payload) => payload.touchEvidence.rangeTouchAttempts.push(structuredClone(payload.touchEvidence.rangeTouchAttempts[0]))],
    ["range requested attempt drift", (payload) => (payload.touchEvidence.rangeTouchAttempts[0].attemptedValue += 1)],
    ["range touch geometry drift", (payload) => (payload.touchEvidence.rangeTouchAttempts[0].touchX += 5)],
    ["accepted range observed drift", (payload) => {
      const attempt = payload.touchEvidence.rangeTouchAttempts.find(({ expectedAccepted }: any) => expectedAccepted);
      attempt.afterObservedValue += 1;
    }],
    ["rejected range input changed", (payload) => {
      const attempt = payload.touchEvidence.rangeTouchAttempts.find(({ expectedAccepted }: any) => !expectedAccepted);
      attempt.afterObservedValue += 1;
    }],
    ["range attempt unbounded", (payload) => (payload.touchEvidence.rangeTouchAttempts[0].maxAttempts = 2)],
    ["missing raw checkpoint", (payload) => payload.durabilityReceipts[0].rawSessionCheckpointChain.pop()],
    ["raw session byte drift", (payload) => (payload.durabilityReceipts[0].rawSessionCheckpointChain[2].rawResponseBody += " ")],
    ["raw session full record drift", (payload) => (payload.durabilityReceipts[0].rawSessionCheckpointChain[2].fullRecords[0].updatedAt = "2026-08-20T00:00:01.000Z")],
    ["surplus non-G07 raw session", (payload) => {
      const checkpoint = payload.durabilityReceipts[0].rawSessionCheckpointChain[2];
      checkpoint.fullRecords.push({ ...structuredClone(checkpoint.fullRecords[0]), topicId: "other-lab" });
      checkpoint.parsedResponseBody.sessions = structuredClone(checkpoint.fullRecords);
      checkpoint.rawResponseBody = JSON.stringify(checkpoint.parsedResponseBody);
    }],
    ["listener installed more than once", (payload) => (payload.analyticsLedger.listenerLifetime.installedOnce = false)],
    ["terminal listener count drift", (payload) => (payload.analyticsLedger.listenerLifetime.projectTerminalRawCount -= 1)],
    ["late delivery count forged", (payload) => (payload.analyticsLedger.lateDeliveryCount = 1)],
    ["phase interaction visual swap", (payload) => {
      const phase = payload.durabilityReceipts[0].phaseBoundary;
      [phase.interactionLastCaptureSequence, phase.visualFirstCaptureSequence] = [phase.visualFirstCaptureSequence, phase.interactionLastCaptureSequence];
    }],
    ["phase final checkpoint drift", (payload) => (payload.durabilityReceipts[0].phaseBoundary.finalCheckpoint.captureSequence -= 1)],
    ["phase checkpoint overlaps next lab", (payload) => {
      const phase = payload.durabilityReceipts[0].phaseBoundary;
      const next = payload.analyticsLedger.rawDeliveries[phase.nextLabFirstCaptureSequence].temporal;
      phase.finalCheckpoint.capturedMonotonicMs = next.actionStartedMonotonicMs;
      phase.finalCheckpoint.capturedAt = next.actionStartedAt;
      const finalCheckpoint = payload.durabilityReceipts[0].rawSessionCheckpointChain.at(-1);
      finalCheckpoint.capturedMonotonicMs = phase.finalCheckpoint.capturedMonotonicMs;
      finalCheckpoint.capturedAt = phase.finalCheckpoint.capturedAt;
    }],
    ["phase next lab drift", (payload) => (payload.durabilityReceipts[0].phaseBoundary.nextLabFirstCaptureSequence += 1)],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const payload: any = structuredClone(createG07ProductionReceiptFixture("mobile-chrome").payload);
      mutate(payload);
      assert.throws(() => validateG07UntrustedStructuralReceipt(
        sealG07ProductionBrowserPayload(payload),
        "mobile-chrome",
      ));
    });
  }
});

test("G07 C5 fixture accounts for every mobile physical input and proves honest vertical landmark attempts", () => {
  const receipt = createG07ProductionReceiptFixture("mobile-chrome");
  const payload: any = receipt.payload;
  const physical = payload.touchEvidence.physicalInputLedger;
  assert.deepEqual(
    physical.entries.map(({ sequence }: any) => sequence),
    Array.from({ length: physical.entries.length }, (_, index) => index),
  );
  assert.equal(
    physical.totals.taps,
    physical.entries.filter(({ kind }: any) => kind === "tap").length,
  );
  assert.equal(
    physical.totals.swipes,
    physical.entries.filter(({ kind }: any) => kind === "swipe").length,
  );
  assert.equal(
    physical.totals.moves,
    physical.entries
      .filter(({ kind }: any) => kind === "swipe")
      .reduce((sum: number, { moveCount }: any) => sum + moveCount, 0),
  );
  assert.deepEqual(
    physical.analyticsBoundEntrySequences,
    physical.entries
      .filter(({ analyticsBound }: any) => analyticsBound)
      .map(({ sequence }: any) => sequence),
  );
  assert.equal(
    physical.analyticsBoundEntrySequences.length,
    payload.analyticsLedger.rawDeliveries.length,
  );
  assert.ok(physical.entries.some(({ category }: any) => category === "locale-option"));
  assert.ok(physical.entries.some(({ category }: any) => category === "theme-toggle"));
  assert.ok(physical.entries.some(({ category }: any) => category === "vertical-scroll"));

  const audits = payload.visualStates.flatMap(({ scrollAudits }: any) => scrollAudits);
  assert.ok(audits.some(({ scrollMethod }: any) => scrollMethod === "already-at-landmark"));
  assert.ok(audits.some(({ verticalSwipeAttempts }: any) => verticalSwipeAttempts.length > 0));
  assert.ok(!audits.every(({ scrollMethod }: any) => scrollMethod === "already-at-landmark"));
  for (const audit of audits) {
    const initiallyReached = audit.scrollId === "page-top"
      ? audit.initialGeometry.scrollY <= 1
      : audit.scrollId === "page-bottom"
        ? audit.initialGeometry.scrollY >= audit.initialGeometry.documentMaxScrollY - 1
        : Math.abs(audit.initialGeometry.rootCenter - audit.initialGeometry.viewportCenter) <= audit.initialGeometry.centerTolerancePx;
    if (audit.scrollMethod === "already-at-landmark") {
      assert.equal(initiallyReached, true);
      assert.deepEqual(audit.verticalSwipeAttempts, []);
    } else {
      assert.equal(initiallyReached, false);
      assert.ok(audit.verticalSwipeAttempts.length > 0);
      assert.equal(audit.verticalSwipeAttempts.at(-1).targetReached, true);
      for (const attempt of audit.verticalSwipeAttempts) {
        assert.equal(attempt.moveCount, 4);
        assert.equal(attempt.afterScrollY - attempt.beforeScrollY, attempt.signedDisplacement);
        assert.equal(attempt.method, "cdp:Input.dispatchTouchEvent:vertical");
      }
    }
  }
  assert.equal(validateG07UntrustedStructuralReceipt(receipt, "mobile-chrome"), true);
});

test("G07 C5 checkpoints share one project clock and are cross-bound to analytics phase windows", () => {
  const receipt = createG07ProductionReceiptFixture("mobile-chrome");
  const payload: any = receipt.payload;
  const deliveries = payload.analyticsLedger.rawDeliveries;
  const clockOrigin = deliveries[0].temporal.clockOriginEpochMs;
  const checkpoints = payload.durabilityReceipts.flatMap(({ rawSessionCheckpointChain }: any) => rawSessionCheckpointChain);
  assert.ok(checkpoints.every(({ clockOriginEpochMs }: any) => clockOriginEpochMs === clockOrigin));
  for (let index = 1; index < checkpoints.length; index += 1) {
    assert.ok(checkpoints[index].capturedMonotonicMs > checkpoints[index - 1].capturedMonotonicMs);
    assert.ok(Date.parse(checkpoints[index].capturedAt) > Date.parse(checkpoints[index - 1].capturedAt));
  }
  for (const checkpoint of checkpoints) {
    if (checkpoint.precedingAnalyticsCaptureSequence !== null) {
      const preceding = deliveries[checkpoint.precedingAnalyticsCaptureSequence];
      assert.ok(preceding.temporal.actionSettledMonotonicMs < checkpoint.capturedMonotonicMs);
    }
    if (checkpoint.followingAnalyticsCaptureSequence !== null) {
      const following = deliveries[checkpoint.followingAnalyticsCaptureSequence];
      assert.ok(checkpoint.capturedMonotonicMs < following.temporal.actionStartedMonotonicMs);
    }
  }
  assert.equal(validateG07UntrustedStructuralReceipt(receipt, "mobile-chrome"), true);
});

test("G07 C5 mutations reject physical-input, vertical-scroll, common-clock, and checkpoint-window drift", async (t) => {
  const cases: Array<[string, (payload: any) => void]> = [
    ["all mobile landmarks forged already", (payload) => payload.visualStates.flatMap(({ scrollAudits }: any) => scrollAudits).forEach((audit: any) => {
      audit.scrollMethod = "already-at-landmark";
      audit.initialGeometry = structuredClone(audit.geometry);
      audit.verticalSwipeAttempts = [];
    })],
    ["physical total mismatch", (payload) => (payload.touchEvidence.physicalInputLedger.totals.moves += 1)],
    ["physical sequence gap", (payload) => (payload.touchEvidence.physicalInputLedger.entries[1].sequence += 1)],
    ["analytics subset drift", (payload) => payload.touchEvidence.physicalInputLedger.analyticsBoundEntrySequences.pop()],
    ["vertical swipe move drift", (payload) => {
      const audit = payload.visualStates.flatMap(({ scrollAudits }: any) => scrollAudits).find(({ verticalSwipeAttempts }: any) => verticalSwipeAttempts.length);
      audit.verticalSwipeAttempts[0].moveCount = 3;
    }],
    ["vertical swipe displacement drift", (payload) => {
      const audit = payload.visualStates.flatMap(({ scrollAudits }: any) => scrollAudits).find(({ verticalSwipeAttempts }: any) => verticalSwipeAttempts.length);
      audit.verticalSwipeAttempts[0].signedDisplacement += 1;
    }],
    ["vertical swipe never reaches target", (payload) => {
      const audit = payload.visualStates.flatMap(({ scrollAudits }: any) => scrollAudits).find(({ verticalSwipeAttempts }: any) => verticalSwipeAttempts.length);
      audit.verticalSwipeAttempts.at(-1).targetReached = false;
    }],
    ["checkpoint common origin drift", (payload) => (payload.durabilityReceipts[1].rawSessionCheckpointChain[0].clockOriginEpochMs += 1)],
    ["checkpoint wall regression", (payload) => {
      const previous = payload.durabilityReceipts[0].rawSessionCheckpointChain.at(-1);
      const current = payload.durabilityReceipts[1].rawSessionCheckpointChain[0];
      current.capturedAt = previous.capturedAt;
    }],
    ["checkpoint preceding analytics drift", (payload) => (payload.durabilityReceipts[0].rawSessionCheckpointChain[2].precedingAnalyticsCaptureSequence -= 1)],
    ["checkpoint following analytics drift", (payload) => (payload.durabilityReceipts[0].rawSessionCheckpointChain[2].followingAnalyticsCaptureSequence += 1)],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const payload: any = structuredClone(createG07ProductionReceiptFixture("mobile-chrome").payload);
      mutate(payload);
      assert.throws(() => validateG07UntrustedStructuralReceipt(
        sealG07ProductionBrowserPayload(payload),
        "mobile-chrome",
      ));
    });
  }
});

test("G07 C6 fixture derives every locale/theme setup transition and phase-binds the exact physical sequence", () => {
  const receipt = createG07ProductionReceiptFixture("mobile-chrome");
  const payload: any = receipt.payload;
  const transitions = payload.touchEvidence.setupTransitions;
  assert.equal(
    transitions.length,
    payload.labIds.length * (2 + payload.visualAxisIds.length),
  );
  const setupCategories = new Set([
    "locale-menu-open",
    "locale-menu-restore",
    "locale-selector",
    "locale-option",
    "theme-toggle",
  ]);
  const setupEntries = payload.touchEvidence.physicalInputLedger.entries.filter(
    ({ category }: any) => setupCategories.has(category),
  );
  assert.deepEqual(
    transitions.flatMap(({ physicalInputSequences }: any) => physicalInputSequences),
    setupEntries.map(({ sequence }: any) => sequence),
  );
  for (const transition of transitions) {
    const expectedCategories = [
      ...(transition.before.locale !== transition.requested.locale
        ? [
            "locale-selector",
            "locale-option",
          ]
        : []),
      ...(transition.before.theme !== transition.requested.theme
        ? ["theme-toggle"]
        : []),
    ];
    assert.deepEqual(transition.requiredCategories, expectedCategories);
    const entries = transition.physicalInputSequences.map(
      (sequence: number) => payload.touchEvidence.physicalInputLedger.entries[sequence],
    );
    assert.deepEqual(entries.map(({ category }: any) => category), expectedCategories);
    assert.ok(entries.every(({ setupPhaseId }: any) => setupPhaseId === transition.phaseId));
    assert.equal(transition.after.locale, transition.requested.locale);
    assert.equal(transition.after.theme, transition.requested.theme);
  }
  assert.equal(validateG07UntrustedStructuralReceipt(receipt, "mobile-chrome"), true);
});

test("G07 C6 fixture proves bounded stable vertical geometry and viewport hit-tested tap coordinates", () => {
  const receipt = createG07ProductionReceiptFixture("mobile-chrome");
  const payload: any = receipt.payload;
  const tapEntries = payload.touchEvidence.physicalInputLedger.entries.filter(
    ({ kind }: any) => kind === "tap",
  );
  assert.ok(tapEntries.length > 0);
  for (const entry of tapEntries) {
    const tap = entry.tapEvidence;
    assert.equal(tap.boxCapturedAfterScrollIntoView, true);
    assert.equal(tap.hitTestMatched, true);
    assert.equal(tap.hitTestMethod, "document.elementFromPoint");
    assert.equal(tap.targetFingerprint, g07DomIdentityFingerprint(tap.targetIdentity));
    assert.ok(tap.x >= 0 && tap.x <= tap.viewportWidth);
    assert.ok(tap.y >= 0 && tap.y <= tap.viewportHeight);
    assert.ok(tap.x >= tap.targetRect.x && tap.x <= tap.targetRect.x + tap.targetRect.width);
    assert.ok(tap.y >= tap.targetRect.y && tap.y <= tap.targetRect.y + tap.targetRect.height);
  }
  for (const audit of payload.visualStates.flatMap(({ scrollAudits }: any) => scrollAudits)) {
    for (const geometry of [
      audit.initialGeometry,
      audit.geometry,
      ...audit.verticalSwipeAttempts.flatMap(({ beforeGeometry, afterGeometry }: any) => [beforeGeometry, afterGeometry]),
    ]) {
      assert.ok(geometry.scrollY >= 0 && geometry.scrollY <= geometry.documentMaxScrollY);
      assert.equal(geometry.documentMaxScrollY, audit.geometry.documentMaxScrollY);
      assert.equal(geometry.viewportHeight, audit.geometry.viewportHeight);
      assert.equal(geometry.rootDocumentTop, audit.geometry.rootDocumentTop);
      assert.equal(geometry.rootDocumentBottom, audit.geometry.rootDocumentBottom);
    }
  }
  assert.equal(validateG07UntrustedStructuralReceipt(receipt, "mobile-chrome"), true);
});

test("G07 C6 mutations reject setup-phase, vertical-geometry, and tap hit-test drift", async (t) => {
  const cases: Array<[string, (payload: any) => void]> = [
    ["missing setup transition", (payload) => payload.touchEvidence.setupTransitions.pop()],
    ["reordered setup transitions", (payload) => payload.touchEvidence.setupTransitions.reverse()],
    ["surplus setup transition", (payload) => payload.touchEvidence.setupTransitions.push(structuredClone(payload.touchEvidence.setupTransitions[0]))],
    ["setup before locale drift", (payload) => {
      const transition = payload.touchEvidence.setupTransitions[0];
      transition.before.locale = transition.requested.locale;
      transition.before.htmlLang = transition.requested.locale === "zh" ? "zh-Hant" : transition.requested.locale;
    }],
    ["setup required category drift", (payload) => payload.touchEvidence.setupTransitions.find(({ requiredCategories }: any) => requiredCategories.length).requiredCategories.reverse()],
    ["setup physical phase drift", (payload) => {
      const transition = payload.touchEvidence.setupTransitions.find(({ physicalInputSequences }: any) => physicalInputSequences.length);
      payload.touchEvidence.physicalInputLedger.entries[transition.physicalInputSequences[0]].setupPhaseId = "other-phase";
    }],
    ["negative initial scroll", (payload) => (payload.visualStates[0].scrollAudits[0].initialGeometry.scrollY = -1)],
    ["attempt beyond document max", (payload) => {
      const audit = payload.visualStates.flatMap(({ scrollAudits }: any) => scrollAudits).find(({ verticalSwipeAttempts }: any) => verticalSwipeAttempts.length);
      audit.verticalSwipeAttempts[0].afterGeometry.scrollY = audit.geometry.documentMaxScrollY + 1;
    }],
    ["attempt max drift", (payload) => {
      const audit = payload.visualStates.flatMap(({ scrollAudits }: any) => scrollAudits).find(({ verticalSwipeAttempts }: any) => verticalSwipeAttempts.length);
      audit.verticalSwipeAttempts[0].beforeGeometry.documentMaxScrollY += 1;
    }],
    ["attempt false reached result", (payload) => {
      const audit = payload.visualStates.flatMap(({ scrollAudits }: any) => scrollAudits).find(({ verticalSwipeAttempts }: any) => verticalSwipeAttempts.length);
      audit.verticalSwipeAttempts.at(-1).targetReached = false;
    }],
    ["extra attempt after reached", (payload) => {
      const audit = payload.visualStates.flatMap(({ scrollAudits }: any) => scrollAudits).find(({ verticalSwipeAttempts }: any) => verticalSwipeAttempts.length);
      const extra = structuredClone(audit.verticalSwipeAttempts.at(-1));
      extra.attemptNumber += 1;
      extra.beforeGeometry = structuredClone(extra.afterGeometry);
      audit.verticalSwipeAttempts.push(extra);
    }],
    ["tap x outside viewport", (payload) => {
      const entry = payload.touchEvidence.physicalInputLedger.entries.find(({ kind }: any) => kind === "tap");
      entry.tapEvidence.x = entry.tapEvidence.viewportWidth + 1;
    }],
    ["tap y outside target rect", (payload) => {
      const entry = payload.touchEvidence.physicalInputLedger.entries.find(({ kind }: any) => kind === "tap");
      entry.tapEvidence.y = entry.tapEvidence.targetRect.y + entry.tapEvidence.targetRect.height + 1;
    }],
    ["tap hit test false", (payload) => (payload.touchEvidence.physicalInputLedger.entries.find(({ kind }: any) => kind === "tap").tapEvidence.hitTestMatched = false)],
    ["tap target identity drift", (payload) => (payload.touchEvidence.physicalInputLedger.entries.find(({ kind }: any) => kind === "tap").tapEvidence.targetIdentity = "other-target")],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const payload: any = structuredClone(createG07ProductionReceiptFixture("mobile-chrome").payload);
      mutate(payload);
      assert.throws(() => validateG07UntrustedStructuralReceipt(
        sealG07ProductionBrowserPayload(payload),
        "mobile-chrome",
      ));
    });
  }
});

test("G07 C7 derives menu opening only from observed control actionability and restores the original closed surface", () => {
  const controlsVisible = {
    localeSelectorActionable: true,
    panelVisible: false,
    themeToggleActionable: true,
    triggerAriaExpanded: false,
    triggerVisible: true,
  } as const;
  assert.deepEqual(
    deriveG07RequiredSetupCategories(
      controlsVisible,
      { locale: "en", theme: "light" },
      { locale: "zh-Hans", theme: "dark" },
    ),
    ["locale-selector", "locale-option", "theme-toggle"],
  );
  assert.deepEqual(
    deriveG07RequiredSetupCategories(
      { ...controlsVisible, localeSelectorActionable: false, themeToggleActionable: false },
      { locale: "en", theme: "light" },
      { locale: "zh-Hans", theme: "dark" },
    ),
    ["locale-menu-open", "locale-selector", "locale-option", "theme-toggle", "locale-menu-restore"],
  );

  const receipt = createG07ProductionReceiptFixture("mobile-chrome");
  const transitions: any[] = (receipt.payload as any).touchEvidence.setupTransitions;
  assert.ok(transitions.length > 0);
  for (const transition of transitions) {
    assert.equal(transition.menu.before.triggerVisible, true);
    assert.equal(transition.menu.before.triggerAriaExpanded, false);
    assert.equal(transition.menu.before.panelVisible, false);
    assert.equal(transition.menu.before.localeSelectorActionable, true);
    assert.equal(transition.menu.before.themeToggleActionable, true);
    assert.equal(transition.menu.openRequired, false);
    assert.equal(transition.menu.afterOpen, null);
    assert.deepEqual(transition.menu.afterRestore, transition.menu.before);
    assert.ok(!transition.requiredCategories.includes("locale-menu-open"));
    assert.ok(!transition.requiredCategories.includes("locale-menu-restore"));
  }
  assert.equal(validateG07UntrustedStructuralReceipt(receipt, "mobile-chrome"), true);
});

test("G07 C7 fixture exposes one exact runtime-ordered physical step projection", () => {
  const receipt = createG07ProductionReceiptFixture("mobile-chrome");
  const payload: any = receipt.payload;
  const ledger = payload.touchEvidence.physicalInputLedger;
  assert.equal(ledger.orderedStepProjection.length, ledger.entries.length);
  assert.deepEqual(
    ledger.orderedStepProjection.map(({ physicalInputSequence }: any) => physicalInputSequence),
    Array.from({ length: ledger.entries.length }, (_, index) => index),
  );
  assert.deepEqual(
    new Set(ledger.orderedStepProjection.map(({ stepKind }: any) => stepKind)),
    new Set(["setup", "analytics", "horizontal", "vertical"]),
  );
  for (const transition of payload.touchEvidence.setupTransitions) {
    const projected = transition.physicalInputSequences.map(
      (sequence: number) => ledger.orderedStepProjection[sequence],
    );
    assert.ok(projected.every(({ stepKind }: any) => stepKind === "setup"));
    assert.deepEqual(
      projected.map(({ physicalInputSequence }: any) => physicalInputSequence),
      transition.physicalInputSequences,
    );
    assert.ok(projected.every(({ stateId }: any) => stateId === transition.stateId));
  }
  assert.equal(validateG07UntrustedStructuralReceipt(receipt, "mobile-chrome"), true);
});

test("G07 C7 mutations reject menu observation, runtime order, half-open bounds, and hit fingerprints", async (t) => {
  const cases: Array<[string, (payload: any) => void]> = [
    ["menu panel observation deleted", (payload) => {
      delete payload.touchEvidence.setupTransitions[0].menu.before.panelVisible;
    }],
    ["actionable locale boolean flip", (payload) => {
      const transition = payload.touchEvidence.setupTransitions.find(({ before, requested }: any) => before.locale !== requested.locale);
      transition.menu.before.localeSelectorActionable = false;
    }],
    ["menu after-open forged without need", (payload) => {
      const transition = payload.touchEvidence.setupTransitions[0];
      transition.menu.afterOpen = { ...structuredClone(transition.menu.before), panelVisible: true, triggerAriaExpanded: true };
    }],
    ["physical projection moved setup to end", (payload) => {
      const projection = payload.touchEvidence.physicalInputLedger.orderedStepProjection;
      const index = projection.findIndex(({ stepKind }: any) => stepKind === "setup");
      projection.push(projection.splice(index, 1)[0]);
    }],
    ["physical projection interleaves vertical across analytics state", (payload) => {
      const projection = payload.touchEvidence.physicalInputLedger.orderedStepProjection;
      const vertical = projection.findIndex(({ stepKind }: any) => stepKind === "vertical");
      const analytics = projection.findIndex(({ stepKind }: any) => stepKind === "analytics");
      [projection[vertical], projection[analytics]] = [projection[analytics], projection[vertical]];
    }],
    ["tap x equals viewport upper boundary", (payload) => {
      const tap = payload.touchEvidence.physicalInputLedger.entries.find(({ kind }: any) => kind === "tap").tapEvidence;
      tap.x = tap.viewportWidth;
    }],
    ["tap y equals rect upper boundary", (payload) => {
      const tap = payload.touchEvidence.physicalInputLedger.entries.find(({ kind }: any) => kind === "tap").tapEvidence;
      tap.y = tap.targetRect.y + tap.targetRect.height;
    }],
    ["actual hit fingerprint drift", (payload) => {
      const tap = payload.touchEvidence.physicalInputLedger.entries.find(({ kind }: any) => kind === "tap").tapEvidence;
      tap.hitTargetFingerprint = "button#different";
    }],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const payload: any = structuredClone(createG07ProductionReceiptFixture("mobile-chrome").payload);
      mutate(payload);
      assert.throws(() => validateG07UntrustedStructuralReceipt(
        sealG07ProductionBrowserPayload(payload),
        "mobile-chrome",
      ));
    });
  }
});

test("G07 C8 fixture binds raw elementFromPoint ancestry and every range attempt to one physical analytics tap", () => {
  const receipt = createG07ProductionReceiptFixture("mobile-chrome");
  const payload: any = receipt.payload;
  const entries = payload.touchEvidence.physicalInputLedger.entries;
  for (const entry of entries.filter(({ kind }: any) => kind === "tap")) {
    const tap = entry.tapEvidence;
    assert.equal(tap.hitAncestorFingerprints[0], tap.rawHitFingerprint);
    assert.equal(tap.hitAncestorFingerprints.at(-1), tap.targetFingerprint);
    assert.equal(tap.hitTargetFingerprint, tap.targetFingerprint);
    assert.equal(tap.targetIsHit, tap.hitAncestorFingerprints.length === 1);
    assert.equal(new Set(tap.hitAncestorFingerprints).size, tap.hitAncestorFingerprints.length);
  }
  for (const attempt of payload.touchEvidence.rangeTouchAttempts) {
    const entry = entries[attempt.physicalInputSequence];
    assert.equal(entry.category, "range-calibration");
    assert.equal(entry.deliveryId, attempt.deliveryId);
    assert.equal(entry.eventId, attempt.eventId);
    assert.equal(entry.labId, attempt.labId);
    assert.equal(entry.stateId, attempt.stateId);
    const linked = payload.interactionStates
      .flatMap(({ action }: any) => action.subactions)
      .find(({ deliveryId }: any) => deliveryId === attempt.deliveryId);
    assert.equal(entry.targetIdentity, linked.target);
    assert.equal(entry.tapEvidence.x, attempt.touchX);
    assert.equal(entry.tapEvidence.y, attempt.touchY);
    assert.deepEqual(entry.tapEvidence.targetRect, attempt.targetRect);
    assert.equal(entry.tapEvidence.viewportWidth, attempt.viewportWidth);
    assert.equal(entry.tapEvidence.viewportHeight, attempt.viewportHeight);
    const thumb = Math.min(10, attempt.targetRect.width / 20);
    assert.equal(attempt.trackStartX, attempt.targetRect.x + thumb);
    assert.equal(attempt.trackEndX, attempt.targetRect.x + attempt.targetRect.width - thumb);
  }
  assert.equal(validateG07UntrustedStructuralReceipt(receipt, "mobile-chrome"), true);
});

test("G07 C8 mutations reject foreign hit ancestry and stale or misbound range tap geometry", async (t) => {
  const cases: Array<[string, (payload: any) => void]> = [
    ["foreign raw elementFromPoint fingerprint", (payload) => {
      payload.touchEvidence.physicalInputLedger.entries.find(({ kind }: any) => kind === "tap").tapEvidence.rawHitFingerprint = "foreign-overlay";
    }],
    ["jointly forged target and resolved hit", (payload) => {
      const tap = payload.touchEvidence.physicalInputLedger.entries.find(({ kind }: any) => kind === "tap").tapEvidence;
      tap.targetFingerprint = "forged-target";
      tap.hitTargetFingerprint = "forged-target";
    }],
    ["missing hit ancestor", (payload) => {
      payload.touchEvidence.physicalInputLedger.entries.find(({ kind }: any) => kind === "tap").tapEvidence.hitAncestorFingerprints.pop();
    }],
    ["range physical sequence drift", (payload) => {
      payload.touchEvidence.rangeTouchAttempts[0].physicalInputSequence += 1;
    }],
    ["range physical delivery drift", (payload) => {
      payload.touchEvidence.rangeTouchAttempts[0].deliveryId = "delivery:foreign";
    }],
    ["range track formula drift", (payload) => {
      payload.touchEvidence.rangeTouchAttempts[0].trackStartX += 1;
    }],
    ["coordinated stale range geometry plus 1000", (payload) => {
      const attempt = payload.touchEvidence.rangeTouchAttempts[0];
      const tap = payload.touchEvidence.physicalInputLedger.entries[attempt.physicalInputSequence].tapEvidence;
      attempt.touchX += 1_000;
      attempt.targetRect.x += 1_000;
      attempt.trackStartX += 1_000;
      attempt.trackEndX += 1_000;
      tap.x += 1_000;
      tap.targetRect.x += 1_000;
    }],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const payload: any = structuredClone(createG07ProductionReceiptFixture("mobile-chrome").payload);
      mutate(payload);
      assert.throws(() => validateG07UntrustedStructuralReceipt(
        sealG07ProductionBrowserPayload(payload),
        "mobile-chrome",
      ));
    });
  }
});

test("G07 C9 fixture recomputes every fingerprint from raw DOM identities and plan-bound targets", () => {
  const receipt = createG07ProductionReceiptFixture("mobile-chrome");
  const payload: any = receipt.payload;
  const taps = payload.touchEvidence.physicalInputLedger.entries.filter(
    ({ kind }: any) => kind === "tap",
  );
  assert.ok(taps.length > 0);
  for (const entry of taps) {
    const tap = entry.tapEvidence;
    assert.equal(tap.targetFingerprint, g07DomIdentityFingerprint(tap.targetIdentity));
    assert.equal(tap.rawHitFingerprint, g07DomIdentityFingerprint(tap.rawHitIdentity));
    assert.deepEqual(
      tap.hitAncestorFingerprints,
      tap.hitAncestorIdentities.map(g07DomIdentityFingerprint),
    );
    assert.deepEqual(tap.hitAncestorIdentities.at(-1), tap.targetIdentity);
  }
  assert.equal(validateG07UntrustedStructuralReceipt(receipt, "mobile-chrome"), true);
});

test("G07 C9 mutations reject coordinated DOM self-attestation and cross-category target substitution", async (t) => {
  const coordinatedForge = (payload: any) => {
    const entry = payload.touchEvidence.physicalInputLedger.entries.find(({ kind }: any) => kind === "tap");
    const forgedIdentity = {
      ariaLabel: "Foreign overlay",
      dataVizMode: null,
      dataVizModeButton: null,
      dataVizParameter: null,
      dataVizResetModel: null,
      dataVizResetModuleId: null,
      dataVizResetTopicId: null,
      id: "foreign",
      name: null,
      role: "dialog",
      tagName: "div",
      type: null,
    };
    const fingerprint = g07DomIdentityFingerprint(forgedIdentity);
    entry.tapEvidence.targetIdentity = structuredClone(forgedIdentity);
    entry.tapEvidence.rawHitIdentity = structuredClone(forgedIdentity);
    entry.tapEvidence.hitAncestorIdentities = [structuredClone(forgedIdentity)];
    entry.tapEvidence.targetFingerprint = fingerprint;
    entry.tapEvidence.rawHitFingerprint = fingerprint;
    entry.tapEvidence.hitAncestorFingerprints = [fingerprint];
    entry.tapEvidence.hitTargetFingerprint = fingerprint;
    entry.tapEvidence.targetIsHit = true;
  };
  const cases: Array<[string, (payload: any) => void]> = [
    ["coordinated raw target hit ancestry forge", coordinatedForge],
    ["theme identity substituted for locale selector", (payload) => {
      const entries = payload.touchEvidence.physicalInputLedger.entries;
      const locale = entries.find(({ category }: any) => category === "locale-selector");
      const theme = entries.find(({ category }: any) => category === "theme-toggle");
      locale.tapEvidence = structuredClone(theme.tapEvidence);
      locale.tapEvidence.targetIdentity = structuredClone(theme.tapEvidence.targetIdentity);
    }],
    ["target identity changed with recomputed fingerprint", (payload) => {
      const entry = payload.touchEvidence.physicalInputLedger.entries.find(({ category }: any) => category === "reset");
      entry.tapEvidence.targetIdentity.role = "checkbox";
      entry.tapEvidence.targetFingerprint = g07DomIdentityFingerprint(entry.tapEvidence.targetIdentity);
      entry.tapEvidence.hitAncestorIdentities.at(-1).role = "checkbox";
      entry.tapEvidence.hitAncestorFingerprints[entry.tapEvidence.hitAncestorFingerprints.length - 1] = entry.tapEvidence.targetFingerprint;
      entry.tapEvidence.hitTargetFingerprint = entry.tapEvidence.targetFingerprint;
    }],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const payload: any = structuredClone(createG07ProductionReceiptFixture("mobile-chrome").payload);
      mutate(payload);
      assert.throws(() => validateG07UntrustedStructuralReceipt(
        sealG07ProductionBrowserPayload(payload),
        "mobile-chrome",
      ));
    });
  }
});

function refreshG07TapFingerprints(tap: any) {
  tap.rawHitFingerprint = g07DomIdentityFingerprint(tap.rawHitIdentity);
  tap.targetFingerprint = g07DomIdentityFingerprint(tap.targetIdentity);
  tap.hitAncestorFingerprints = tap.hitAncestorIdentities.map(
    g07DomIdentityFingerprint,
  );
  tap.hitTargetFingerprint = tap.hitAncestorFingerprints.at(-1);
  tap.targetIsHit = tap.hitAncestorIdentities.length === 1;
}

function firstG07RangeEntry(payload: any) {
  const entry = payload.touchEvidence.physicalInputLedger.entries.find(
    ({ category }: any) => category === "range-calibration",
  );
  assert.ok(entry);
  assert.ok(entry.tapEvidence);
  return entry;
}

test("G07 C10 structural validation accepts the producer-real range control identity", () => {
  const payload: any = structuredClone(
    createG07ProductionReceiptFixture("mobile-chrome").payload,
  );
  const entry = firstG07RangeEntry(payload);
  const controlId = entry.targetIdentity.split(":")[1];
  assert.ok(controlId);
  const tap = entry.tapEvidence;
  tap.rawHitIdentity.dataVizParameter = controlId;
  tap.targetIdentity.dataVizParameter = controlId;
  tap.hitAncestorIdentities[0].dataVizParameter = controlId;
  refreshG07TapFingerprints(tap);
  assert.equal(
    validateG07UntrustedStructuralReceipt(
      sealG07ProductionBrowserPayload(payload),
      "mobile-chrome",
    ),
    true,
  );
});

test("G07 C10 structural validation accepts the exact zh-Hans light-theme aria label", () => {
  const payload: any = structuredClone(
    createG07ProductionReceiptFixture("mobile-chrome").payload,
  );
  const transition = payload.touchEvidence.setupTransitions.find(
    ({ requested, requiredCategories }: any) =>
      requested.locale === "zh-Hans" &&
      requested.theme === "light" &&
      requiredCategories.includes("theme-toggle"),
  );
  assert.ok(transition);
  const categoryIndex = transition.requiredCategories.indexOf("theme-toggle");
  const sequence = transition.physicalInputSequences[categoryIndex];
  const tap = payload.touchEvidence.physicalInputLedger.entries[sequence]
    .tapEvidence;
  assert.ok(tap);
  tap.rawHitIdentity.ariaLabel = "切换至浅色模式";
  tap.targetIdentity.ariaLabel = "切换至浅色模式";
  tap.hitAncestorIdentities[0].ariaLabel = "切换至浅色模式";
  refreshG07TapFingerprints(tap);
  assert.equal(
    validateG07UntrustedStructuralReceipt(
      sealG07ProductionBrowserPayload(payload),
      "mobile-chrome",
    ),
    true,
  );
});

test("G07 C10 structural range identity normalizes the caller-controlled DOM id to null", () => {
  const payload: any = structuredClone(
    createG07ProductionReceiptFixture("mobile-chrome").payload,
  );
  const tap = firstG07RangeEntry(payload).tapEvidence;
  tap.rawHitIdentity.id = null;
  tap.targetIdentity.id = null;
  tap.hitAncestorIdentities[0].id = null;
  refreshG07TapFingerprints(tap);
  assert.equal(tap.targetIdentity.id, null);
  assert.equal(
    validateG07UntrustedStructuralReceipt(
      sealG07ProductionBrowserPayload(payload),
      "mobile-chrome",
    ),
    true,
  );
});

test("G07 C10 public production validation rejects even a baseline caller-sealed receipt without native physical provenance", () => {
  assert.throws(
    () =>
      validateG07ProductionBrowserReceipt(
        createG07ProductionReceiptFixture("mobile-chrome"),
        "mobile-chrome",
      ),
    /native physical provenance.*unavailable/u,
  );
});

test("G07 C10 public production validation rejects coordinated resealed raw ancestry and geometry", async (t) => {
  await t.test("coordinated raw overlay and arbitrary ancestry", () => {
    const payload: any = structuredClone(
      createG07ProductionReceiptFixture("mobile-chrome").payload,
    );
    const tap = payload.touchEvidence.physicalInputLedger.entries.find(
      ({ kind }: any) => kind === "tap",
    ).tapEvidence;
    const forgedIdentity = (id: string, role: string | null) => ({
      ariaLabel: role === "presentation" ? "Overlay" : null,
      dataVizMode: null,
      dataVizModeButton: null,
      dataVizParameter: null,
      dataVizResetModel: null,
      dataVizResetModuleId: null,
      dataVizResetTopicId: null,
      id,
      name: null,
      role,
      tagName: "span",
      type: null,
    });
    const raw = forgedIdentity("forged-raw", "presentation");
    const middle = forgedIdentity("forged-middle", null);
    tap.rawHitIdentity = raw;
    tap.hitAncestorIdentities = [
      structuredClone(raw),
      middle,
      structuredClone(tap.targetIdentity),
    ];
    refreshG07TapFingerprints(tap);
    assert.throws(
      () =>
        validateG07ProductionBrowserReceipt(
          sealG07ProductionBrowserPayload(payload),
          "mobile-chrome",
        ),
      /native physical provenance.*unavailable/u,
    );
  });

  await t.test("coordinated in-viewport range geometry translation", () => {
    const payload: any = structuredClone(
      createG07ProductionReceiptFixture("mobile-chrome").payload,
    );
    const attempt = payload.touchEvidence.rangeTouchAttempts[0];
    const tap = payload.touchEvidence.physicalInputLedger.entries[
      attempt.physicalInputSequence
    ].tapEvidence;
    attempt.targetRect.x += 1;
    attempt.trackStartX += 1;
    attempt.trackEndX += 1;
    attempt.touchX += 1;
    tap.targetRect.x += 1;
    tap.x += 1;
    assert.throws(
      () =>
        validateG07ProductionBrowserReceipt(
          sealG07ProductionBrowserPayload(payload),
          "mobile-chrome",
        ),
      /native physical provenance.*unavailable/u,
    );
  });
});
