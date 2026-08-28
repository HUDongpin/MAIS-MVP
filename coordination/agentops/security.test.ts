import assert from "node:assert/strict";
import test from "node:test";

test("v1 authority policy is immutable and denies every external side effect", async () => {
  const { V1_AUTHORITY_POLICY } = await import("./security");

  assert.deepEqual(V1_AUTHORITY_POLICY, {
    repositoryReadAllowed: true,
    deterministicValidationAllowed: true,
    localCheckpointWriteAllowed: true,
    handoffWriteAllowed: true,
    codeWriteAllowed: false,
    contentWriteAllowed: false,
    credentialAccessAllowed: false,
    providerExecutionAllowed: false,
    gitMutationAllowed: false,
    deploymentAllowed: false,
    productionDataMutationAllowed: false,
  });
  assert.ok(Object.isFrozen(V1_AUTHORITY_POLICY));
});

test("sensitive credential, student, content, provider, and reasoning data fail closed", async () => {
  const { assertNoSensitivePersistence } = await import("./security");

  const forbidden = [
    { authorization: "Bearer abcdefghijklmnopqrstuvwxyz" },
    { apiKey: "sk-example-secret-value-123456789" },
    { cookie: "session=private-session-value-123456" },
    { studentId: "student-001" },
    { rawQuestion: "What is 2 + 2?" },
    { answerKey: "4" },
    { providerResponse: { output: "raw" } },
    { chainOfThought: "private reasoning trace" },
    { note: "token=abcdefghijklmnopqrstuvwxyz123456" },
  ];

  for (const value of forbidden) {
    assert.throws(() => assertNoSensitivePersistence(value), /sensitive|forbidden/i);
  }
});

test("sanitized evidence accepts only a small digest-based outward shape", async () => {
  const { sanitizeEvidence } = await import("./security");

  const evidence = sanitizeEvidence({
    summary: "AGENTS policy and lane registry were checked.",
    evidenceDigests: ["a".repeat(64)],
    repositoryPaths: ["AGENTS.md", "coordination/release-intake/owner-pathspecs.json"],
  });
  assert.deepEqual(evidence, {
    summary: "AGENTS policy and lane registry were checked.",
    evidenceDigests: ["a".repeat(64)],
    repositoryPaths: ["AGENTS.md", "coordination/release-intake/owner-pathspecs.json"],
  });
  assert.ok(Object.isFrozen(evidence));

  assert.throws(
    () =>
      sanitizeEvidence({
        summary: "unsafe",
        evidenceDigests: [],
        repositoryPaths: [],
        providerResponse: "raw",
      }),
    /unknown|schema/i,
  );
  assert.throws(
    () =>
      sanitizeEvidence({
        summary: "unsafe",
        evidenceDigests: ["not-a-digest"],
        repositoryPaths: [],
      }),
    /digest/i,
  );
});

test("redaction removes secret-like text without exposing the original value", async () => {
  const { redactText } = await import("./security");
  const source = "Authorization: Bearer abcdefghijklmnopqrstuvwxyz";
  const redacted = redactText(source);

  assert.equal(redacted.includes("abcdefghijklmnopqrstuvwxyz"), false);
  assert.match(redacted, /REDACTED/);
});
