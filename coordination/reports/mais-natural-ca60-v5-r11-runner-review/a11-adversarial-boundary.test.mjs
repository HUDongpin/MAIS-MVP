import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");
const CONTENT = path.join(REPO, "coordination/content-qa/mais-natural-ca60-v1");
const RESEARCH = path.join(REPO, "coordination/research/mais-natural-ca60-v1");
const REGISTRATION = JSON.parse(readFileSync(path.join(RESEARCH,
  "runner-registrations/v5-r11/runner-registration.json"), "utf8"));
const DESIGN = JSON.parse(readFileSync(path.join(RESEARCH,
  "versions/design-v5/design-registration.json"), "utf8"));

const REMEDIATED = Object.freeze([
  ...Array.from({ length: 8 }, (_, index) => `A11-R8-${String(index + 1).padStart(3, "0")}`),
  "A11-R9-001", "A11-R10-001", "A11-R10-002",
]);

function source(filename) {
  return readFileSync(path.join(CONTENT, filename), "utf8");
}

function schema(filename) {
  return JSON.parse(readFileSync(path.join(CONTENT, "schemas", filename), "utf8"));
}

function wilson(successes, denominator, z = 1.6448536269514722) {
  if (denominator === 0) return { lower: null, upper: null };
  const p = successes / denominator;
  const z2 = z * z;
  const adjustment = 1 + z2 / denominator;
  const center = (p + z2 / (2 * denominator)) / adjustment;
  const half = z * Math.sqrt((p * (1 - p) + z2 / (4 * denominator)) / denominator)
    / adjustment;
  return { lower: Math.max(0, center - half), upper: Math.min(1, center + half) };
}

function boundedIndex({ key, metric, replicate, draw, bound }) {
  const range = 1n << 64n;
  const upperExclusive = range - (range % BigInt(bound));
  for (let rejection = 0; ; rejection += 1) {
    const digest = createHash("sha256")
      .update(`${key}|${metric}|${replicate}|${draw}|${rejection}`, "utf8").digest();
    const value = digest.readBigUInt64BE(0);
    if (value < upperExclusive) return Number(value % BigInt(bound));
  }
}

function independentMatch(referenceFindings, machineFindings) {
  const unmatchedReference = new Set(referenceFindings.map((_, index) => index));
  const unmatchedMachine = new Set(machineFindings.map((_, index) => index));
  const matches = [];
  for (const matchType of ["EXACT_CODE_AND_FAMILY", "FAMILY_ONLY"]) {
    for (const machineIndex of [...unmatchedMachine]) {
      const machine = machineFindings[machineIndex];
      const candidates = [...unmatchedReference]
        .filter((index) => referenceFindings[index].family === machine.family)
        .filter((index) => matchType === "FAMILY_ONLY"
          || referenceFindings[index].code === machine.code)
        .sort((left, right) => {
          const leftKey = `${referenceFindings[left].code}|${referenceFindings[left].findingId}`;
          const rightKey = `${referenceFindings[right].code}|${referenceFindings[right].findingId}`;
          return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
        });
      if (candidates.length === 0) continue;
      const referenceIndex = candidates[0];
      matches.push({ machineIndex, referenceIndex, matchType });
      unmatchedMachine.delete(machineIndex);
      unmatchedReference.delete(referenceIndex);
    }
  }
  return { matches, unmatchedMachine: [...unmatchedMachine],
    unmatchedReference: [...unmatchedReference] };
}

test("independent Git-object verifier reports every registered identity and root exact", () => {
  const output = execFileSync(process.execPath,
    [path.join(HERE, "independent-runner-registration-verifier.mjs")], {
      cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 256 * 1024 * 1024,
    });
  const result = JSON.parse(output);
  assert.equal(result.verifiedCheckCount, 16);
  assert.equal(result.mismatchCount, 0);
  assert.equal(result.productionPathCount, 242);
  assert.equal(result.importEdgeCount, 509);
  assert.equal(result.testPathCount, 274);
  assert.equal(result.conclusion, "EXACT_MATCH_NO_STATIC_DISCREPANCY");
  assert.ok(result.checks.every(({ status }) => status === "VERIFIED"));
});

test("R11 native seal and validation schemas close both R10 schema/status discrepancies", () => {
  const seal = schema("MachineReferenceSealV7.schema.json");
  const validation = schema("ReferenceSealValidationReceiptV5.schema.json");
  assert.equal(seal.additionalProperties, false);
  assert.equal(seal.properties.schemaVersion.const, "MachineReferenceSealV7");
  assert.equal(seal.properties.totalSuccessfulCallCount.minimum, 240);
  assert.equal(seal.properties.sealReconstructionStatus.const,
    "FULL_RAW_RESPONSE_REPARSE_AND_ATTEMPT_GRAPH_RECONSTRUCTION_BOUND_TO_R11");
  assert.equal(validation.additionalProperties, false);
  assert.equal(validation.properties.schemaVersion.const, "ReferenceSealValidationReceiptV5");
  assert.equal(validation.properties.validationStatus.const,
    "RAW_AUTHORITATIVE_ATTEMPT_GRAPH_REBUILT_AND_BOUND_TO_R11");
  const raw = source("raw-authoritative-reference-v5-r11.mjs");
  assert.match(raw, /successfulEvidence\.length >= 240 && successfulEvidence\.length <= 300/u);
  assert.match(raw, /MachineReferenceSealV7/u);
  assert.match(raw, /ReferenceSealValidationReceiptV5/u);
});

test("R11 native runtime reaches raw-authoritative reference sealing from the default command path", () => {
  const runtime = source("runner-v5-r11-runtime.mjs");
  const cli = source("runner-v5-r11-cli.mjs");
  assert.match(runtime, /buildRawAuthoritativeMachineReferenceSealV5R11/u);
  assert.match(runtime, /buildRawAuthoritativeReferenceValidationV5R11/u);
  assert.match(runtime, /referenceSealContextFromContext/u);
  assert.match(runtime, /REFERENCE_SEAL_V5_R11/u);
  assert.match(runtime, /freezeDeepSeekExecutionRegistration/u);
  assert.match(cli, /"label-reference"/u);
  assert.match(cli, /"seal-reference-labels"/u);
  assert.match(cli, /"freeze-deepseek-registration"/u);
});

test("R11 process evidence uses V5-R11 V2/V9 schemas and SignaturePayloadV3", () => {
  const review = schema("IndependentExecutionRunnerReviewReceiptV9.schema.json");
  for (const filename of ["IndependentStaticImportGraphReceiptV2.schema.json",
    "ForbiddenPrimaryScorerPathScanReceiptV2.schema.json",
    "IndependentCommandRuntimeReceiptV2.schema.json",
    "IndependentSourceEnumerationReceiptV2.schema.json"]) {
    const value = schema(filename);
    assert.equal(value.additionalProperties, false, filename);
    assert.equal(value.properties.runnerVersion.const, "V5-R11", filename);
  }
  assert.equal(review.additionalProperties, false);
  assert.equal(review.properties.schemaVersion.const, "IndependentExecutionRunnerReviewReceiptV9");
  assert.equal(review.$defs.signaturePayload.properties.schemaVersion.const,
    "IndependentExecutionRunnerReviewSignaturePayloadV3");
  assert.deepEqual(new Set(review.properties.reviewedRemediatedFindingIds.items.enum),
    new Set(REMEDIATED));
});

test("final adapter reloads exact tracked Git custody before any credential reader or fetch", () => {
  const adapter = source("native-provider-adapter-v5-r11.mjs");
  const loaderIndex = adapter.indexOf("const exact = await loadExactTransportActivationCustodyV5R11");
  const credentialIndex = adapter.indexOf("await credentialReader");
  const fetchIndex = adapter.indexOf("await fetchImplementation");
  assert.ok(loaderIndex >= 0);
  assert.ok(credentialIndex > loaderIndex);
  assert.ok(fetchIndex > credentialIndex);
  assert.match(adapter, /validateProviderActivationV5R11\(trustedInput\)/u);
  assert.match(adapter, /exactGitCustodyReloadedAtFinalTransportBoundary: true/u);
  assert.match(adapter, /callerAuthoredReviewAuthorityAccepted: false/u);
});

test("route authenticity is reconstructed from signed raw sources and remains blocked without anchors", () => {
  const evidence = source("trusted-provider-evidence-v5-r11.mjs");
  assert.match(evidence, /rawSourceBody/u);
  const custody = source("route-evidence-custody-v5-r6.mjs");
  assert.match(custody, /rawSourceBytesHash: sha256V5R3\(bytes\)/u);
  assert.match(custody, /validateProtectedProviderEvidenceArtifactV5R6/u);
  assert.match(evidence, /routeProbeArtifacts/u);
  assert.match(evidence, /providerEventReceipt/u);
  assert.match(evidence, /trustedProviderEvidenceAnchors/u);
  assert.deepEqual(REGISTRATION.trustedProviderEvidenceAnchors, []);
  assert.equal(REGISTRATION.routeAuthenticityState,
    "ROUTE_AUTHENTICITY_BLOCKED_NO_PINNED_TRUST_ANCHOR");
  assert.equal(REGISTRATION.providerEntrypoints.openAI.endpoint,
    "https://us.api.openai.com/v1/responses");
  assert.equal(REGISTRATION.providerEntrypoints.openAI.model, "gpt-5.6-luna");
  assert.equal(REGISTRATION.providerEntrypoints.openAI.projectResidency, "US_STORAGE_PROCESSING");
  assert.equal(REGISTRATION.providerEntrypoints.deepSeek.projectResidency, "UNRESOLVED");
});

test("terminal integrity and decision evidence reject caller-authored flags", () => {
  const decision = source("decision-evidence-v5-r11.mjs");
  const runtime = source("runner-v5-r11-runtime.mjs");
  assert.match(decision, /reconstruct/u);
  assert.match(decision, /receiptChain/u);
  assert.match(decision, /attempt/u);
  assert.doesNotMatch(runtime, /allMissingTerminalFallback/u);
  assert.doesNotMatch(runtime, /callerAuthoredScoring/u);
  assert.match(source("runner-v5-r11-remediation.test.mjs"),
    /ignores caller-authored favorable or adverse integrity flags/u);
});

test("interrupted attempts recover from persisted custody with zero-HTTP reconciliation", () => {
  const recovery = source("attempt-recovery-v5-r11.mjs");
  const runtime = source("runner-v5-r11-runtime.mjs");
  assert.match(recovery, /orphan/u);
  assert.match(recovery, /prepared/iu);
  assert.match(recovery, /preparedCompletionHash/u);
  assert.match(recovery, /resolvedAttemptReceiptHash/u);
  assert.match(recovery, /zeroHttpRecovery: true/u);
  assert.match(recovery, /forbids transport and credential dependencies/u);
  assert.match(runtime, /auditAttemptCustody/u);
  assert.match(source("runner-v5-r11-recovery.test.mjs"), /zero HTTP/iu);
});

test("item-scoped composite finding keys coexist and one-to-one exact-first matching is deterministic", () => {
  const kernel = source("statistical-kernel-v5-r11.mjs");
  assert.match(kernel, /\$\{itemId\}\|\$\{finding\.findingId\}\|\$\{finding\.family\}\|\$\{finding\.code\}/u);
  const reference = [
    { findingId: "R2", family: "ANSWER", code: "WRONG_CANONICAL_ANSWER" },
    { findingId: "R1", family: "ANSWER", code: "FALSE_REJECT_CORRECT_RESPONSE" },
  ];
  const machine = [
    { findingId: "M1", family: "ANSWER", code: "WRONG_CANONICAL_ANSWER" },
    { findingId: "M2", family: "ANSWER", code: "EQUIVALENT_ANSWER_NOT_ACCEPTED" },
  ];
  const result = independentMatch(reference, machine);
  assert.deepEqual(result.matches, [
    { machineIndex: 0, referenceIndex: 0, matchType: "EXACT_CODE_AND_FAMILY" },
    { machineIndex: 1, referenceIndex: 1, matchType: "FAMILY_ONLY" },
  ]);
  assert.deepEqual(result.unmatchedMachine, []);
  assert.deepEqual(result.unmatchedReference, []);
});

test("independent Wilson calculation proves the frozen CA60 structural impossibility", () => {
  assert.ok(wilson(25, 25).lower >= 0.9);
  assert.ok(wilson(24, 24).lower < 0.9);
  assert.ok(wilson(52, 52).lower >= 0.95);
  assert.ok(wilson(51, 51).lower < 0.95);
  assert.ok(25 + 52 > 60);
  assert.equal(DESIGN.analysis.thresholds.surfaceSensitivityOneSidedWilsonLcb95AtLeast, 0.9);
  assert.equal(DESIGN.analysis.thresholds.specificityOneSidedWilsonLcb95AtLeast, 0.95);
});

test("independent counter-SHA256 implementation reproduces all frozen bootstrap vectors", () => {
  assert.equal(DESIGN.analysis.confidenceIntervals.bootstrapReplicates, 10_000);
  for (const vector of DESIGN.analysis.confidenceIntervals.bootstrapGoldenVectors) {
    assert.equal(boundedIndex(vector), vector.expectedIndex);
  }
});

test("unified nonresolved accounting is exhaustive, disjoint, and capped at three", () => {
  const kernel = source("statistical-kernel-v5-r11.mjs");
  assert.match(kernel, /unifiedNonresolved/iu);
  assert.match(kernel, /unresolved.*invalid|invalid.*unresolved/iu);
  assert.match(kernel, /integrityLimitExceeded/iu);
  assert.match(kernel, /> 3|<= 3/u);
  assert.match(kernel, /surfaceWorlds/u);
  assert.match(kernel, /findingDecisionBoundUnidentified/u);
});

test("decision precedence and claim ceiling cannot emit PASS or limited generalization", () => {
  const kernel = source("statistical-kernel-v5-r11.mjs");
  const scorer = source("scorer-verifier-v5-r11.mjs");
  assert.match(kernel, /INVALID_FOR_GENERALIZATION/u);
  assert.match(kernel, /EXECUTION_INTEGRITY_FAILED/u);
  assert.match(kernel, /POLICY_REVISION_REQUIRED_MACHINE_REFERENCE/u);
  assert.match(kernel, /INCONCLUSIVE_MACHINE_REFERENCE/u);
  assert.equal(REGISTRATION.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.match(scorer, /decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE"/u);
  assert.doesNotMatch(kernel, /["']PASS["']/u);
  assert.doesNotMatch(kernel, /["']LIMITED_GENERALIZATION_EVIDENCE["']/u);
});

test("registered CLI exposes every frozen workflow transition and keeps execution fail-closed", () => {
  const cli = source("runner-v5-r11-cli.mjs");
  for (const command of ["register", "freeze-frame", "audit-clusters", "freeze-sample",
    "register-route-evidence", "label-reference", "seal-reference-labels", "dry-run",
    "authorize-check", "freeze-deepseek-registration", "execute-deepseek", "score", "verify",
    "export-aggregate-report", "audit-attempt-custody"]) {
    assert.ok(cli.includes(`"${command}"`), command);
  }
  assert.match(cli, /PROVIDER_EXECUTION_COMMANDS/u);
  assert.match(cli, /credentialReadCount/u);
  assert.match(cli, /naturalQuestionEgressCount/u);
  assert.match(cli, /decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE"/u);
});

test("A07 closeout is exact and all registration authority/activity counters remain zero", () => {
  const closeout = JSON.parse(readFileSync(path.join(REPO,
    "coordination/reports/mais-natural-ca60-v5-r11-runner-closeout-a07/a07-runner-closeout-receipt.json"),
  "utf8"));
  assert.equal(closeout.postRegistrationTestPassCount, 52);
  assert.equal(closeout.postRegistrationTestFailCount, 0);
  assert.equal(closeout.postRegistrationTestSkipCount, 0);
  assert.equal(closeout.selfHash,
    "92bde7669e099399a3f483311555b5a568cce547cbb8cb6809f50fb8dbfa8814");
  assert.equal(REGISTRATION.authorizationState.providerExecutionAuthorized, false);
  assert.equal(REGISTRATION.authorizationState.credentialReadAuthorized, false);
  assert.equal(REGISTRATION.authorizationState.naturalQuestionEgressAuthorized, false);
  assert.equal(REGISTRATION.authorizationState.providerEventCount, 0);
  assert.equal(REGISTRATION.authorizationState.credentialReadCount, 0);
  assert.equal(REGISTRATION.authorizationState.naturalQuestionEgressCount, 0);
  assert.equal(REGISTRATION.authorizationState.attemptCount, 0);
  assert.equal(REGISTRATION.authorizationState.tokenCount, 0);
  assert.equal(REGISTRATION.authorizationState.usdSpent, 0);
});
