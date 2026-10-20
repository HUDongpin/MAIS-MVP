import assert from "node:assert/strict";
import test from "node:test";

import {
  countAppStateCollections,
  defaultAppStateGrowthThresholds,
  describeAppStateWrite,
  evaluateAppStateWrite,
  measureAppStatePayloadBytes,
  rankAppStateCollections,
  readAppStateGrowthThresholds,
  reportAppStateWrite,
  shouldSampleAppStatePayloadSize,
  unboundedAppStateCollections
} from "@/lib/server/appStateGrowthObservation";

test("collection counts only consider array-valued keys", () => {
  const counts = countAppStateCollections({
    users: [{ id: "a" }, { id: "b" }],
    learning_events: [],
    schema_version: 7,
    nova_lens_policy: { enabled: true },
    nothing: null
  });

  assert.deepEqual(
    counts.sort((left, right) => left.collection.localeCompare(right.collection)),
    [
      { collection: "learning_events", rows: 0 },
      { collection: "users", rows: 2 }
    ]
  );
});

test("collection counts tolerate a non-object payload", () => {
  for (const payload of [null, undefined, 7, "state", []]) {
    assert.deepEqual(countAppStateCollections(payload), []);
  }
});

test("ranking puts the biggest collections first", () => {
  const ranked = rankAppStateCollections([
    { collection: "users", rows: 10 },
    { collection: "learning_events", rows: 9_000 },
    { collection: "attempts", rows: 500 }
  ]);

  assert.deepEqual(ranked.map((entry) => entry.collection), [
    "learning_events",
    "attempts",
    "users"
  ]);
});

test("ranking breaks ties toward collections that have no retention policy", () => {
  // `questions` is a large static seed table; `learning_events` grows forever.
  // On a tie the report must point at the one worth pruning or extracting.
  const ranked = rankAppStateCollections([
    { collection: "questions", rows: 1_000 },
    { collection: "learning_events", rows: 1_000 }
  ]);

  assert.equal(ranked[0]?.collection, "learning_events");
});

test("ranking honours the limit and never returns a negative slice", () => {
  const counts = Array.from({ length: 12 }, (_, index) => ({
    collection: `c${index}`,
    rows: index
  }));

  assert.equal(rankAppStateCollections(counts).length, 5);
  assert.equal(rankAppStateCollections(counts, 2).length, 2);
  assert.equal(rankAppStateCollections(counts, 0).length, 0);
  assert.equal(rankAppStateCollections(counts, -3).length, 0);
});

test("thresholds fall back to defaults when unset, blank, or malformed", () => {
  for (const env of [
    {},
    { MAIS_APP_STATE_WARN_BYTES: "" },
    { MAIS_APP_STATE_WARN_BYTES: "   " },
    { MAIS_APP_STATE_WARN_BYTES: "not-a-number" },
    { MAIS_APP_STATE_WARN_BYTES: "0" },
    { MAIS_APP_STATE_WARN_BYTES: "-5" }
  ]) {
    assert.equal(
      readAppStateGrowthThresholds(env).warnBytes,
      defaultAppStateGrowthThresholds.warnBytes,
      `env ${JSON.stringify(env)} should keep the default`
    );
  }
});

test("thresholds are configurable", () => {
  const thresholds = readAppStateGrowthThresholds({
    MAIS_APP_STATE_WARN_BYTES: "1024",
    MAIS_APP_STATE_CRITICAL_BYTES: "4096",
    MAIS_APP_STATE_WARN_DURATION_MS: "250"
  });

  assert.deepEqual(thresholds, { warnBytes: 1024, criticalBytes: 4096, warnDurationMs: 250 });
});

test("size sampling is off unless explicitly configured", () => {
  for (const env of [
    {},
    { MAIS_APP_STATE_SIZE_SAMPLE: "" },
    { MAIS_APP_STATE_SIZE_SAMPLE: "0" },
    { MAIS_APP_STATE_SIZE_SAMPLE: "-1" },
    { MAIS_APP_STATE_SIZE_SAMPLE: "nope" }
  ]) {
    assert.equal(
      shouldSampleAppStatePayloadSize(env, () => 0),
      false,
      `env ${JSON.stringify(env)} must not pay the serialization cost`
    );
  }
});

test("a sample rate of 1 measures every write", () => {
  assert.equal(
    shouldSampleAppStatePayloadSize({ MAIS_APP_STATE_SIZE_SAMPLE: "1" }, () => 0.999),
    true
  );
});

test("a sample rate of N measures roughly one write in N", () => {
  const env = { MAIS_APP_STATE_SIZE_SAMPLE: "10" };
  assert.equal(shouldSampleAppStatePayloadSize(env, () => 0.05), true);
  assert.equal(shouldSampleAppStatePayloadSize(env, () => 0.5), false);
});

test("a small, fast write is ok", () => {
  const observation = evaluateAppStateWrite({
    payload: { users: [{ id: "a" }] },
    durationMs: 12,
    payloadBytes: 2_048,
    env: {}
  });

  assert.equal(observation.severity, "ok");
  assert.deepEqual(observation.reasons, []);
  assert.equal(observation.totalRows, 1);
});

test("a payload over the warn threshold warns", () => {
  const observation = evaluateAppStateWrite({
    payload: { learning_events: [] },
    durationMs: 10,
    payloadBytes: defaultAppStateGrowthThresholds.warnBytes,
    env: {}
  });

  assert.equal(observation.severity, "warn");
  assert.match(observation.reasons.join(" "), /warn/);
});

test("a payload over the critical threshold is critical", () => {
  const observation = evaluateAppStateWrite({
    payload: { learning_events: [] },
    durationMs: 10,
    payloadBytes: defaultAppStateGrowthThresholds.criticalBytes + 1,
    env: {}
  });

  assert.equal(observation.severity, "critical");
});

test("a slow write warns even when size sampling is off", () => {
  // The symptom operators feel first is latency, and payloadBytes is null
  // whenever sampling is disabled — severity must not depend on it.
  const observation = evaluateAppStateWrite({
    payload: { learning_events: [] },
    durationMs: defaultAppStateGrowthThresholds.warnDurationMs,
    payloadBytes: null,
    env: {}
  });

  assert.equal(observation.severity, "warn");
  assert.equal(observation.payloadBytes, null);
  assert.match(observation.reasons.join(" "), /took/);
});

test("a critical payload stays critical even when the write was fast", () => {
  const observation = evaluateAppStateWrite({
    payload: {},
    durationMs: 1,
    payloadBytes: defaultAppStateGrowthThresholds.criticalBytes,
    env: {}
  });

  assert.equal(observation.severity, "critical");
});

test("a non-finite payload size does not fabricate a severity", () => {
  for (const payloadBytes of [Number.NaN, Number.POSITIVE_INFINITY]) {
    const observation = evaluateAppStateWrite({
      payload: {},
      durationMs: 1,
      payloadBytes,
      env: {}
    });
    assert.equal(observation.severity, "ok");
    assert.equal(observation.payloadBytes, null);
  }
});

test("the observation names the collections worth acting on", () => {
  const observation = evaluateAppStateWrite({
    payload: {
      users: [{ id: "a" }],
      learning_events: Array.from({ length: 50_000 }, (_, index) => ({ id: index })),
      attempts: Array.from({ length: 9_000 }, (_, index) => ({ id: index }))
    },
    durationMs: 5,
    env: {}
  });

  assert.equal(observation.totalRows, 59_001);
  assert.equal(observation.topCollections[0]?.collection, "learning_events");
  assert.equal(observation.topCollections[1]?.collection, "attempts");
});

test("the log shape carries only allowlisted observability fields", () => {
  const described = describeAppStateWrite(
    evaluateAppStateWrite({
      payload: { learning_events: [{ id: 1 }] },
      durationMs: 7,
      revision: 42,
      payloadBytes: 1_234,
      env: {}
    })
  );

  assert.equal(described.event, "app_state.write");
  assert.equal(described.revision, 42);
  assert.equal(described.payloadBytes, 1_234);
  assert.equal(described.durationMs, 7);
  assert.equal(described.topCollections, "learning_events=1");
});

test("the unbounded collection list stays unique and non-empty", () => {
  assert.ok(unboundedAppStateCollections.length > 0);
  assert.equal(
    new Set(unboundedAppStateCollections).size,
    unboundedAppStateCollections.length,
    "a duplicated entry would double-weight a collection in tie-breaking"
  );
});

test("an ok observation stays silent and never escalates", () => {
  const warnings: unknown[] = [];
  const captures: unknown[] = [];

  reportAppStateWrite(
    evaluateAppStateWrite({ payload: {}, durationMs: 1, payloadBytes: 10, env: {} }),
    {
      capture: (error, context) => captures.push({ error, context }),
      logWarning: (payload) => warnings.push(payload)
    }
  );

  assert.deepEqual(warnings, []);
  assert.deepEqual(captures, []);
});

test("a critical observation warns and escalates with allowlisted fields only", () => {
  const warnings: unknown[] = [];
  const captures: { error: unknown; context: Record<string, unknown> }[] = [];

  reportAppStateWrite(
    evaluateAppStateWrite({
      payload: { learning_events: [{ id: 1 }] },
      durationMs: 5,
      revision: 9,
      payloadBytes: defaultAppStateGrowthThresholds.criticalBytes,
      env: {}
    }),
    {
      capture: (error, context) => captures.push({ error, context: context as Record<string, unknown> }),
      logWarning: (payload) => warnings.push(payload)
    }
  );

  assert.equal(warnings.length, 1);
  assert.equal(captures.length, 1);

  const context = captures[0]!.context;
  assert.equal(context.scope, "datastore");
  assert.equal(context.level, "error");
  assert.equal(context.kind, "app-state-growth-critical");

  // errorMonitor drops unknown extra keys, so only allowlisted ones are sent.
  const allowed = new Set(["durationMs", "payloadBytes", "revision", "operation"]);
  for (const key of Object.keys(context.extra as Record<string, unknown>)) {
    assert.ok(allowed.has(key), `extra key ${key} is not on errorMonitor's allowlist`);
  }
});

test("a warn observation escalates at warning level", () => {
  const captures: { context: Record<string, unknown> }[] = [];

  reportAppStateWrite(
    evaluateAppStateWrite({
      payload: {},
      durationMs: defaultAppStateGrowthThresholds.warnDurationMs,
      env: {}
    }),
    {
      capture: (_error, context) => captures.push({ context: context as Record<string, unknown> }),
      logWarning: () => {}
    }
  );

  assert.equal(captures[0]?.context.level, "warning");
});

test("omitted size and revision are left out rather than sent as null", () => {
  const captures: { context: Record<string, unknown> }[] = [];

  reportAppStateWrite(
    evaluateAppStateWrite({
      payload: {},
      durationMs: defaultAppStateGrowthThresholds.warnDurationMs,
      payloadBytes: null,
      env: {}
    }),
    {
      capture: (_error, context) => captures.push({ context: context as Record<string, unknown> }),
      logWarning: () => {}
    }
  );

  const extra = captures[0]!.context.extra as Record<string, unknown>;
  assert.ok(!("payloadBytes" in extra), "a null size must not be reported as a measurement");
  assert.ok(!("revision" in extra));
});

test("a throwing monitor never breaks the write it is describing", () => {
  assert.doesNotThrow(() => {
    reportAppStateWrite(
      evaluateAppStateWrite({
        payload: {},
        durationMs: defaultAppStateGrowthThresholds.warnDurationMs,
        env: {}
      }),
      {
        capture: () => {
          throw new Error("monitor exploded");
        },
        logWarning: () => {
          throw new Error("logger exploded");
        }
      }
    );
  });
});

test("payload size is not measured unless sampling is enabled", () => {
  assert.equal(measureAppStatePayloadBytes({ a: 1 }, {}), null);
  assert.equal(
    measureAppStatePayloadBytes({ a: 1 }, { MAIS_APP_STATE_SIZE_SAMPLE: "1" }),
    Buffer.byteLength(JSON.stringify({ a: 1 }), "utf8")
  );
});

test("payload size counts UTF-8 bytes, not UTF-16 code units", () => {
  // Lesson copy is largely CJK; string length would under-report by ~a third.
  const payload = { lessons: ["分數的加法與減法"] };
  const bytes = measureAppStatePayloadBytes(payload, { MAIS_APP_STATE_SIZE_SAMPLE: "1" });

  assert.ok(bytes !== null);
  assert.ok(
    bytes! > JSON.stringify(payload).length,
    "CJK payloads must measure larger in bytes than in code units"
  );
});

test("an unserializable payload measures as null instead of throwing", () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;

  assert.doesNotThrow(() => {
    assert.equal(measureAppStatePayloadBytes(circular, { MAIS_APP_STATE_SIZE_SAMPLE: "1" }), null);
  });
});
