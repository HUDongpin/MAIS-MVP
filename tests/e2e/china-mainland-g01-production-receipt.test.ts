import assert from "node:assert/strict";
import test from "node:test";

import {
  G01_CANONICAL_RUNNER_INVOCATION,
  G01_RUNNER_INVOCATION_ENV_JSON,
  G01_RUNNER_INVOCATION_ENV_SHA256,
  assertG01TrustedRunnerAuthority,
  createG01ProductionReceiptFixture,
  g01CanonicalRunnerInvocationEnvironment,
  g01ProductionReceiptSha256,
  readG01RunnerInvocationEnvironment,
  sealG01ProductionBrowserPayload,
  validateG01AnalyticsTerminalEvidence,
  validateG01ProductionBrowserReceipt,
  validateG01RawAnalyticsDeliveryWindow,
  validateG01UntrustedStructuralReceipt,
} from "./china-mainland-g01-production-receipt";

test("G01 untrusted structural validation accepts one exact hash-bound non-release desktop project receipt", () => {
  const receipt = createG01ProductionReceiptFixture("desktop-chrome");

  assert.equal(
    validateG01UntrustedStructuralReceipt(receipt, "desktop-chrome"),
    true,
  );
  assert.equal(receipt.payload.visualStates.length, 54);
  assert.equal(receipt.payload.interactionStates.length, 810);
  assert.equal(receipt.payload.durabilityReceipts[0]?.firstAction.acknowledgementStatus, 200);
});

test("G01 desktop and mobile receipts expose the exact split, modes, and dynamic estimate domains", () => {
  const desktop = createG01ProductionReceiptFixture("desktop-chrome");
  const mobile = createG01ProductionReceiptFixture("mobile-chrome");

  assert.equal(validateG01UntrustedStructuralReceipt(mobile, "mobile-chrome"), true);
  assert.equal(desktop.payload.visualStates.length + mobile.payload.visualStates.length, 108);
  assert.equal(desktop.payload.interactionStates.length + mobile.payload.interactionStates.length, 1_620);
  assert.equal(desktop.payload.fullVisualInteractionCartesian, false);
  assert.equal(mobile.payload.playApplicable, false);

  const byScenario = new Map(
    desktop.payload.interactionStates.map((state) => [state.scenarioId, state]),
  );
  assert.deepEqual(
    ["add", "subtract", "multiply", "divide"].map((operation) =>
      byScenario.get(`estimate-from:${operation}`)?.observation.exactOperation,
    ),
    ["add", "subtract", "multiply", "divide"],
  );
  assert.deepEqual(
    byScenario.get("endpoint:estimate-check:subtract:operand-b:max")?.control,
    {
      controlId: "operand-b",
      kind: "range",
      max: 347,
      min: 0,
      options: [],
      selected: 347,
      step: 1,
    },
  );
  assert.deepEqual(
    byScenario.get("endpoint:estimate-check:divide:operand-b:min")?.control,
    {
      controlId: "operand-b",
      kind: "range",
      max: 999_999,
      min: 1,
      options: [],
      selected: 1,
      step: 1,
    },
  );
  assert.equal(
    byScenario.get("endpoint:estimate-check:divide:operand-b:min")?.observation.roundingPlace,
    1,
  );
});

test("G01 receipt mutations kill incomplete axes/states and dishonest browser evidence", async (t) => {
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
    ["missing visual state", (payload) => payload.visualStates.pop()],
    ["surplus visual state", (payload) => payload.visualStates.push(payload.visualStates[0])],
    ["duplicate visual state", (payload) => (payload.visualStates[1] = payload.visualStates[0])],
    ["reordered visual state", (payload) => payload.visualStates.reverse()],
    ["missing interaction state", (payload) => payload.interactionStates.pop()],
    ["surplus interaction state", (payload) => payload.interactionStates.push(payload.interactionStates[0])],
    ["duplicate interaction state", (payload) => (payload.interactionStates[1] = payload.interactionStates[0])],
    ["reordered interaction state", (payload) => payload.interactionStates.reverse()],
    ["missing mode state", (payload) => payload.interactionStates.splice(payload.interactionStates.findIndex(({ scenarioId }: any) => scenarioId === "mode:add"), 1)],
    ["mode drift", (payload) => (payload.interactionStates.find(({ scenarioId }: any) => scenarioId === "mode:subtract").observation.mode = "add")],
    ["estimate operation drift", (payload) => (payload.interactionStates.find(({ scenarioId }: any) => scenarioId === "estimate-from:divide").observation.exactOperation = "multiply")],
    ["dynamic subtract bound drift", (payload) => (payload.interactionStates.find(({ scenarioId }: any) => scenarioId === "endpoint:estimate-check:subtract:operand-b:max").control.max = 999_999)],
    ["dynamic divide bound drift", (payload) => (payload.interactionStates.find(({ scenarioId }: any) => scenarioId === "endpoint:estimate-check:divide:operand-b:min").control.min = 0)],
    ["generic fallback", (payload) => (payload.interactionStates[1].genericFallbackCount = 1)],
    ["hollow interaction UI scan", (payload) => (payload.interactionStates[1].uiScan.paintedMarkCount = 0)],
    ["hollow visual UI scan", (payload) => (payload.visualStates[0].scrollAudits[0].uiScan.candidatePairCount = 0)],
    ["zero analytics", (payload) => (payload.interactionStates[1].analyticsEvents = [])],
    ["EVIDENCE_FREE subaction", (payload) => {
      delete payload.interactionStates[1].action.subactions[0].analyticsEvidence;
    }],
    ["EVIDENCE_FREE reset-after", (payload) => {
      delete payload.interactionStates[1].resetAfter.analyticsSubaction.analyticsEvidence;
    }],
    ["EVIDENCE_FREE visual-reset", (payload) => {
      delete payload.visualStates[0].reset.analyticsSubaction.analyticsEvidence;
    }],
    ["TWO_EVENTS in one subaction", (payload) => {
      const state = payload.interactionStates.find(
        ({ scenarioId }: any) => scenarioId === "mode:add",
      );
      const second = {
        ...state.analyticsEvents[0],
        eventId: `${state.analyticsEvents[0].eventId}:second`,
      };
      state.analyticsEvents = [state.analyticsEvents[0], second];
      state.action.subactions[0].analyticsEvents = [
        state.action.subactions[0].analyticsEvents[0],
        second,
      ];
      const evidence = state.action.subactions[0].analyticsEvidence;
      evidence.request.eventIds = [
        state.analyticsEvents[0].eventId,
        second.eventId,
      ];
      evidence.request.bodyEventIdentities = state.analyticsEvents.map((event: any) => ({
        eventId: event.eventId,
        source: event.source,
        topicId: event.labId,
        type: event.type,
      }));
      evidence.response.acknowledgedEventIds = [...evidence.request.eventIds];
    }],
    ["analytics ACK id drift", (payload) => {
      payload.interactionStates[1].action.subactions[0]
        .analyticsEvidence.response.acknowledgedEventIds[0] = "wrong-ack-id";
    }],
    ["analytics ACK surplus id", (payload) => {
      payload.interactionStates[1].action.subactions[0]
        .analyticsEvidence.response.acknowledgedEventIds.push("surplus-ack-id");
    }],
    ["analytics request owner drift", (payload) => {
      payload.interactionStates[1].action.subactions[0]
        .analyticsEvidence.request.userId = "wrong-owner";
    }],
    ["subaction aggregate method drift", (payload) => {
      payload.interactionStates[1].action.method += "+locator.click";
    }],
    ["subaction semantic label drift", (payload) => {
      const state = payload.interactionStates[1];
      state.action.subactions[0].method = "wrong-physical-step|locator.click";
      state.action.method = state.action.subactions
        .map(({ method }: any) => method)
        .join("+");
    }],
    ["analytics source drift", (payload) => {
      payload.interactionStates[1].analyticsEvents[0].source = "wrong-source";
      payload.interactionStates[1].action.subactions[0].analyticsEvents[0].source = "wrong-source";
    }],
    ["reused analytics event id", (payload) => {
      const reused = payload.interactionStates[1].analyticsEvents[0].eventId;
      payload.interactionStates[2].analyticsEvents[0].eventId = reused;
      payload.interactionStates[2].action.subactions[0].analyticsEvents[0].eventId = reused;
    }],
    ["reset drift", (payload) => (payload.interactionStates[1].resetAfter.observation.left = 348)],
    ["retry", (payload) => (payload.execution.retries = 1)],
    ["false complete overclaim", (payload) => (payload.execution.complete = true)],
    ["skip", (payload) => (payload.execution.skipped = 1)],
    ["console error", (payload) => payload.diagnostics.consoleErrors.push("boom")],
    ["request failure", (payload) => payload.diagnostics.requestFailures.push("GET /asset")],
    ["session replay", (payload) => (payload.durabilityReceipts[0].secondAction.postCount = 1)],
    ["session reload loss", (payload) => (payload.durabilityReceipts[0].reload.sameSession = false)],
    ["UNBOUND_SESSION arbitrary id", (payload) => {
      payload.durabilityReceipts[0].sessionId = "arbitrary-nonempty-session";
    }],
    ["HAS_USER missing durability owner", (payload) => {
      payload.durabilityReceipts[0].userId = "";
    }],
    ["HAS_SIBLING snapshot drift", (payload) => {
      payload.durabilityReceipts[0].siblingSnapshots.final.sessions.pop();
      payload.durabilityReceipts[0].siblingSnapshots.final.count -= 1;
    }],
    ["target server identity drift", (payload) => {
      payload.durabilityReceipts[0].targetSession.updatedAt = "2099-01-01T00:00:00.000Z";
    }],
    ["target server identity surplus key", (payload) => {
      payload.durabilityReceipts[0].targetSession.surplus = true;
    }],
    ["play claim", (payload) => (payload.playApplicable = true)],
    ["Cartesian overclaim", (payload) => (payload.fullVisualInteractionCartesian = true)],
    ["fake plan source hash", (payload) => (payload.sourceEvidence.planSha256 = "b".repeat(64))],
    ["fake producer source hash", (payload) => (payload.sourceEvidence.producerSha256 = "c".repeat(64))],
    ["fake receipt source hash", (payload) => (payload.sourceEvidence.receiptValidatorSha256 = "d".repeat(64))],
    ["fake routing source hash", (payload) => (payload.sourceEvidence.routingSpecSha256 = "e".repeat(64))],
    ["configured project narrowing", (payload) => payload.execution.configuredProjects.pop()],
    ["runner args project narrowing", (payload) => {
      payload.runnerInvocation.args.splice(2, 0, "--project=desktop-chrome");
    }],
    ["runner release authority overclaim", (payload) => {
      payload.runnerInvocation.releaseReady = true;
      payload.runnerInvocation.authorityAvailable = true;
      payload.runnerInvocation.runnerReceiptSha256 = "f".repeat(64);
    }],
    ["terminal late delivery", (payload) => {
      payload.analyticsTerminal.observedDeliveryCount += 1;
      payload.analyticsTerminal.observedDeliveryEventIds.push("late-post");
      payload.analyticsTerminal.observedRawEventIds.push("late-post");
    }],
    ["terminal unconsumed delivery", (payload) => {
      payload.analyticsTerminal.consumedEventIds.pop();
    }],
  ];

  for (const [name, mutate] of desktopCases) {
    await t.test(name, () => {
      const payload = structuredClone(
        createG01ProductionReceiptFixture("desktop-chrome").payload,
      );
      mutate(payload);
      assert.throws(() =>
        validateG01UntrustedStructuralReceipt(
          sealG01ProductionBrowserPayload(payload),
          "desktop-chrome",
        ),
      );
    });
  }

  const mobileCases: Array<[string, (payload: MutablePayload) => void]> = [
    ["hasTouch false", (payload) => (payload.touchEvidence.hasTouch = false)],
    ["no real tap", (payload) => (payload.touchEvidence.realTapCount = 0)],
    ["no real swipe", (payload) => (payload.touchEvidence.realSwipeCount = 0)],
    ["setter-only fake touch", (payload) => (payload.interactionStates[1].action.method = "evaluate:nativeSetter")],
    ["tap-free fake touch", (payload) => (payload.interactionStates[1].action.method = "locator.fill")],
  ];
  for (const [name, mutate] of mobileCases) {
    await t.test(name, () => {
      const payload = structuredClone(
        createG01ProductionReceiptFixture("mobile-chrome").payload,
      );
      mutate(payload);
      assert.throws(() =>
        validateG01UntrustedStructuralReceipt(
          sealG01ProductionBrowserPayload(payload),
          "mobile-chrome",
        ),
      );
    });
  }
});

test("G01 receipt envelope rejects stale hashes and surplus keys", () => {
  const stale = createG01ProductionReceiptFixture("desktop-chrome") as any;
  stale.payloadSha256 = "0".repeat(64);
  assert.throws(() =>
    validateG01UntrustedStructuralReceipt(stale, "desktop-chrome"),
  );

  const surplus = createG01ProductionReceiptFixture("desktop-chrome") as any;
  surplus.payload.surplus = true;
  surplus.payloadSha256 = "0".repeat(64);
  assert.throws(() =>
    validateG01UntrustedStructuralReceipt(surplus, "desktop-chrome"),
  );
});

test("G01 public production validation rejects a baseline caller-sealed receipt without native authority", () => {
  assert.throws(
    () => validateG01ProductionBrowserReceipt(
      createG01ProductionReceiptFixture("desktop-chrome"),
      "desktop-chrome",
    ),
    /native (?:runner )?authority.*unavailable|native.*provenance.*unavailable/u,
  );
});

test("G01 exact caller environment JSON plus matching SHA cannot authorize public production validation", () => {
  const canonical = g01CanonicalRunnerInvocationEnvironment();
  const parsed = readG01RunnerInvocationEnvironment({
    [G01_RUNNER_INVOCATION_ENV_JSON]: canonical.json,
    [G01_RUNNER_INVOCATION_ENV_SHA256]: canonical.sha256,
  });
  const receipt = createG01ProductionReceiptFixture("desktop-chrome");
  assert.deepEqual(receipt.payload.runnerInvocation, parsed);
  assert.equal(receipt.payload.runnerInvocation.authorityAvailable, false);
  assert.equal(receipt.payload.execution.complete, false);
  assert.equal(receipt.payload.runnerInvocation.releaseReady, false);
  assert.equal(receipt.payload.runnerInvocation.runnerReceiptSha256, null);
  assert.throws(
    () => validateG01ProductionBrowserReceipt(receipt, "desktop-chrome"),
    /native (?:runner )?authority.*unavailable|native.*provenance.*unavailable/u,
  );
});

test("G01 public production validation rejects a structurally valid coordinated caller reseal", () => {
  const payload: any = structuredClone(
    createG01ProductionReceiptFixture("desktop-chrome").payload,
  );
  const originalEventId = payload.interactionStates[1].analyticsEvents[0].eventId;
  replaceExactString(payload, originalEventId, `${originalEventId}:caller-resealed`);
  const resealed = sealG01ProductionBrowserPayload(payload);
  assert.equal(
    validateG01UntrustedStructuralReceipt(resealed, "desktop-chrome"),
    true,
  );
  assert.throws(
    () => validateG01ProductionBrowserReceipt(resealed, "desktop-chrome"),
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

test("G01 runner invocation environment is exact but has no release authority", () => {
  const canonical = g01CanonicalRunnerInvocationEnvironment();
  const parsed = readG01RunnerInvocationEnvironment({
    [G01_RUNNER_INVOCATION_ENV_JSON]: canonical.json,
    [G01_RUNNER_INVOCATION_ENV_SHA256]: canonical.sha256,
  });
  assert.deepEqual(parsed.args, G01_CANONICAL_RUNNER_INVOCATION.args);
  assert.equal(parsed.authorityAvailable, false);
  assert.equal(parsed.releaseReady, false);
  assert.equal(parsed.runnerReceiptSha256, null);
  assert.throws(
    () => assertG01TrustedRunnerAuthority(parsed),
    /coverage unavailable.*trusted dedicated runner/u,
  );
});

test("G01 runner invocation rejects missing, narrowed, inherited, and forged receipts", async (t) => {
  const canonical = g01CanonicalRunnerInvocationEnvironment();
  await t.test("missing receipt", () => {
    assert.throws(() => readG01RunnerInvocationEnvironment({}), /missing/u);
  });
  for (const [name, replacement] of [
    ["desktop-only", '"--project=desktop-chrome"'],
    ["grep narrowing", '"--grep=first"'],
    ["grep-invert narrowing", '"--grep-invert=first"'],
  ] as const) {
    await t.test(name, () => {
      const value = JSON.parse(canonical.json) as any;
      value.args.splice(2, 0, replacement);
      const json = JSON.stringify(value);
      assert.throws(() => readG01RunnerInvocationEnvironment({
        [G01_RUNNER_INVOCATION_ENV_JSON]: json,
        [G01_RUNNER_INVOCATION_ENV_SHA256]: g01ProductionReceiptSha256(value),
      }), /SHA-256|exact/u);
    });
  }
  await t.test("forged exact JSON plus matching SHA still has no authority", () => {
    const parsed = readG01RunnerInvocationEnvironment({
      [G01_RUNNER_INVOCATION_ENV_JSON]: canonical.json,
      [G01_RUNNER_INVOCATION_ENV_SHA256]: canonical.sha256,
    });
    assert.throws(() => assertG01TrustedRunnerAuthority(parsed), /coverage unavailable/u);
  });
  await t.test("inherited generic authority", () => {
    const value = JSON.parse(canonical.json) as any;
    value.authority = "inherited-environment";
    assert.throws(() => readG01RunnerInvocationEnvironment({
      [G01_RUNNER_INVOCATION_ENV_JSON]: JSON.stringify(value),
      [G01_RUNNER_INVOCATION_ENV_SHA256]: g01ProductionReceiptSha256(value),
    }), /SHA-256|exact/u);
  });
});

function rawDelivery(eventId: string, topicId = "bnu-p3-multi-digit-operations") {
  return {
    acknowledgedEventIds: [eventId],
    endpoint: "/api/learning-events" as const,
    events: [{
      id: eventId,
      source: "mainland-bnu-p3-multi-digit-operations",
      topicId,
      type: "visualization-action" as const,
    }],
    method: "POST" as const,
    ownerUserId: "fixture-user",
    rawBodyText: JSON.stringify({ events: [{
      id: eventId,
      source: "mainland-bnu-p3-multi-digit-operations",
      topicId,
      type: "visualization-action",
    }] }),
    rawEventIds: [eventId],
    requestMalformedReason: null,
    responseMalformedReason: null,
    responseStatus: 200,
  };
}

test("G01 analytics raw window rejects valid plus malformed and valid plus other-lab POSTs", () => {
  const binding = {
    expectedSource: "mainland-bnu-p3-multi-digit-operations",
    expectedUserId: "fixture-user",
    labId: "bnu-p3-multi-digit-operations",
  };
  const valid = rawDelivery("event-1");
  assert.doesNotThrow(() => validateG01RawAnalyticsDeliveryWindow([valid], binding));
  assert.throws(() => validateG01RawAnalyticsDeliveryWindow([
    valid,
    { ...rawDelivery("malformed"), events: [], requestMalformedReason: "events[0] malformed" },
  ], binding), /exactly one raw delivery|malformed/u);
  assert.throws(() => validateG01RawAnalyticsDeliveryWindow([
    valid,
    rawDelivery("other-lab", "bnu-p4-fraction-meaning-equivalence"),
  ], binding), /exactly one raw delivery|topic/u);
});

test("G01 analytics terminal evidence rejects a late post after an otherwise valid action", () => {
  const valid = {
    consumedEventIds: ["event-1"],
    observedDeliveryCount: 1,
    observedDeliveryEventIds: ["event-1"],
    observedRawEventIds: ["event-1"],
    postQuiescent: true as const,
    serializedEventIds: ["event-1"],
  };
  assert.doesNotThrow(() => validateG01AnalyticsTerminalEvidence(valid, ["event-1"]));
  assert.throws(() => validateG01AnalyticsTerminalEvidence({
    ...valid,
    observedDeliveryCount: 2,
    observedDeliveryEventIds: ["event-1", "late-post"],
    observedRawEventIds: ["event-1", "late-post"],
  }, ["event-1"]), /terminal.*exact|late|surplus/u);
});
