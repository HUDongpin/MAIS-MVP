import assert from "node:assert/strict";
import test from "node:test";

import { assertSanitizedEvidence, sanitizeEvidence } from "./index";

test("redacts every free-text value before evidence leaves a runner", () => {
  const fakeFineGrainedToken = [
    "github",
    "_pat_",
    "1234567890abcdefghijklmnopqrstuvwxyz",
  ].join("");
  const fakeClassicToken = [
    "gh",
    "p_",
    "1234567890abcdefghijklmnopqrstuvwx",
  ].join("");
  const fakeDatabaseUrl = [
    "postgres",
    "ql://runner:fixture-password@db.invalid/graphops",
  ].join("");
  const fakeBearerOne = ["Bear", "er ", "fixture-sensitive-token-one"].join(
    "",
  );
  const fakeBearerTwo = ["Bear", "er ", "fixture-sensitive-token-two"].join(
    "",
  );
  const unsafe = {
    studentEmail: "learner@example.edu",
    studentName: "Jane Student",
    nested: {
      authorization: fakeBearerOne,
      note: "Contact teacher@example.edu for help",
      safeCount: 3,
    },
    direct: fakeBearerTwo,
    genericLog: `${fakeFineGrainedToken} postgres_url=${fakeDatabaseUrl}`,
    providerOutput: `${fakeClassicToken} https://private.example.invalid/deploy/123`,
    identityNote:
      "student name: Jane Student; school identifier: SCH-001; phone: +852 2345 6789",
    mixedCaseAssignment: "Api_Key=fixture-sensitive-value-123",
  };

  const sanitized = sanitizeEvidence(unsafe);

  assert.deepEqual(sanitized, {
    studentEmail: "[REDACTED]",
    studentName: "[REDACTED]",
    nested: {
      authorization: "[REDACTED]",
      note: "[REDACTED_TEXT]",
      safeCount: 3,
    },
    direct: "[REDACTED_TEXT]",
    genericLog: "[REDACTED_TEXT]",
    providerOutput: "[REDACTED_TEXT]",
    identityNote: "[REDACTED_TEXT]",
    mixedCaseAssignment: "[REDACTED_TEXT]",
  });
  assert.ok(Object.isFrozen(sanitized));
  assert.doesNotThrow(() => assertSanitizedEvidence(sanitized));
  assert.throws(() => assertSanitizedEvidence(unsafe), /unsanitized/i);
});

test("does not preserve unknown prose, names, opaque credentials, or provider output", () => {
  const opaqueCredential = [
    "fixture",
    "-credential-with-no-known-provider-prefix-",
    "0123456789",
  ].join("");
  const unknown = {
    note: "Jane Student completed an unpublished private exercise",
    opaque: opaqueCredential,
    response: "provider returned proprietary corpus text",
  };

  const sanitized = sanitizeEvidence(unknown);

  assert.deepEqual(sanitized, {
    note: "[REDACTED_TEXT]",
    opaque: "[REDACTED_TEXT]",
    response: "[REDACTED_TEXT]",
  });
  const serialized = JSON.stringify(sanitized);
  assert.equal(serialized.includes("Jane Student"), false);
  assert.equal(serialized.includes(opaqueCredential), false);
  assert.equal(serialized.includes("proprietary corpus text"), false);
  assert.doesNotThrow(() => assertSanitizedEvidence(sanitized));
});

test("rejects unbounded or non-structured evidence before receipt or ledger storage", () => {
  assert.throws(
    () => sanitizeEvidence("raw stdout"),
    /structured JSON object/i,
  );
  assert.throws(
    () => sanitizeEvidence({ message: "x".repeat(4_097) }),
    /evidence string limit/i,
  );
  assert.throws(
    () =>
      sanitizeEvidence({
        entries: new Array(10_000).fill(0),
      }),
    /collection limit/i,
  );
  assert.throws(
    () => sanitizeEvidence({ message: "x".repeat(32_769) }),
    /canonical evidence limit|evidence string limit/i,
  );
});
