import assert from "node:assert/strict";
import test from "node:test";

import {
  createMaisManimCaptureHarnessGate,
  isValidMaisManimCaptureToken
} from "@/lib/server/maisManimCaptureHarnessGuard";

const token = "a".repeat(64);

test("capture harness is hidden unless explicitly enabled outside production", () => {
  for (const input of [
    { enabled: undefined, expectedToken: token, nodeEnv: "development" },
    { enabled: "0", expectedToken: token, nodeEnv: "development" },
    { enabled: "1", expectedToken: token, nodeEnv: "production" },
    { enabled: "1", expectedToken: "short", nodeEnv: "development" }
  ]) {
    const gate = createMaisManimCaptureHarnessGate(input);
    assert.deepEqual(gate.consume({ hostname: "127.0.0.1", suppliedToken: token }), {
      allowed: false,
      reason: "not-found"
    });
  }
});

test("capture harness requires loopback and a constant-shape random token", () => {
  assert.equal(isValidMaisManimCaptureToken(token), true);
  assert.equal(isValidMaisManimCaptureToken("A".repeat(64)), false);
  assert.equal(isValidMaisManimCaptureToken("a".repeat(63)), false);

  const wrongHost = createMaisManimCaptureHarnessGate({
    enabled: "1",
    expectedToken: token,
    nodeEnv: "test"
  });
  assert.deepEqual(wrongHost.consume({ hostname: "0.0.0.0", suppliedToken: token }), {
    allowed: false,
    reason: "not-found"
  });

  const wrongToken = createMaisManimCaptureHarnessGate({
    enabled: "1",
    expectedToken: token,
    nodeEnv: "test"
  });
  assert.deepEqual(wrongToken.consume({ hostname: "127.0.0.1", suppliedToken: "b".repeat(64) }), {
    allowed: false,
    reason: "not-found"
  });
});

test("a valid harness token is consumed exactly once", () => {
  const gate = createMaisManimCaptureHarnessGate({
    enabled: "1",
    expectedToken: token,
    nodeEnv: "test"
  });
  assert.deepEqual(gate.consume({ hostname: "localhost", suppliedToken: token }), {
    allowed: true
  });
  assert.deepEqual(gate.consume({ hostname: "127.0.0.1", suppliedToken: token }), {
    allowed: false,
    reason: "not-found"
  });
});
