import assert from "node:assert/strict";
import test from "node:test";

import {
  createRunnerRuntimeV5R7,
  deriveImmutableTerminalCauseV5R7,
} from "./runner-v5-r7-runtime.mjs";

test("default V5-R7 runtime has no live bindings and stops before context, credential, HTTP, or egress", async () => {
  const runtime = createRunnerRuntimeV5R7();
  for (const execute of [runtime.executeOpenAIResumeStep,
    runtime.executeDeepSeekCanaryStep, runtime.executeDeepSeekResumeStep]) {
    const result = await execute({});
    assert.equal(result.status, "LIVE_BINDINGS_NOT_INSTALLED");
    assert.equal(result.providerEventCount, 0);
    assert.equal(result.httpRequestCount, 0);
    assert.equal(result.credentialReadCount, 0);
    assert.equal(result.naturalQuestionEgressCount, 0);
    assert.equal(result.activityAccountingStatus, "EXACT");
  }
});

test("terminal causes are derived from immutable ledger evidence rather than caller defaults", () => {
  const authorization = { maximumAttemptsPerItemRole: 2, maximumAttempts: 10 };
  const reservation = (ordinal) => ({ entryType: "DISPATCH_RESERVED", itemHash: "item-1",
    role: "B_PRIME_CRITIQUE", selfHash: `reservation-${ordinal}` });
  const completion = (ordinal, status) => ({ entryType: "DISPATCH_COMPLETED",
    reservationHash: `reservation-${ordinal}`, attemptStatus: status });
  assert.equal(deriveImmutableTerminalCauseV5R7({
    ledgerEntries: [reservation(1)], authorization,
  }), "ACTIVE_RESERVATION_REQUIRES_EXACT_OWNER_AUTHORIZED_RECOVERY");
  assert.equal(deriveImmutableTerminalCauseV5R7({
    ledgerEntries: [reservation(1), completion(1, "HTTP_FAILURE"),
      reservation(2), completion(2, "HTTP_FAILURE")], authorization,
  }), "ITEM_ROLE_ATTEMPT_CAP_EXHAUSTED_FROM_LEDGER");
  assert.equal(deriveImmutableTerminalCauseV5R7({
    ledgerEntries: [reservation(1), completion(1, "PROVIDER_TUPLE_DRIFT")], authorization,
  }), "PROVIDER_TUPLE_DRIFT_FROM_COMPLETION");
});
