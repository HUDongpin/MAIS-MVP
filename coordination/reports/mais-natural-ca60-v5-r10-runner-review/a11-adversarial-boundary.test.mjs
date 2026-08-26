import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");
const CORE = path.join(REPO, "coordination/content-qa/mais-natural-ca60-v1");

function source(name) {
  return readFileSync(path.join(CORE, name), "utf8");
}

function schema(name) {
  return JSON.parse(source(`schemas/${name}.schema.json`));
}

test("R10 real native reference seal cannot satisfy its registered closed schemas", () => {
  const implementation = source("raw-authoritative-reference-v5-r10.mjs");
  const sealStatus = implementation.match(/sealReconstructionStatus:\s*"([^"]+)"/u)?.[1];
  const validationStatus = implementation.match(/validationStatus:\s*"([^"]+)"/u)?.[1];
  const sealSchema = schema("MachineReferenceSealV6");
  const validationSchema = schema("ReferenceSealValidationReceiptV4");
  assert.equal(sealStatus,
    "FULL_RAW_RESPONSE_REPARSE_AND_ATTEMPT_GRAPH_RECONSTRUCTION_BOUND_TO_R9");
  assert.equal(sealSchema.properties.sealReconstructionStatus.const,
    "FULL_RAW_RESPONSE_REPARSE_AND_ATTEMPT_GRAPH_RECONSTRUCTION_BOUND_TO_R7");
  assert.notEqual(sealStatus, sealSchema.properties.sealReconstructionStatus.const);
  assert.equal(validationStatus, "RAW_AUTHORITATIVE_ATTEMPT_GRAPH_REBUILT_AND_BOUND_TO_R9");
  assert.equal(validationSchema.properties.validationStatus.const,
    "RAW_AUTHORITATIVE_ATTEMPT_GRAPH_REBUILT_AND_BOUND_TO_R7");
  assert.notEqual(validationStatus, validationSchema.properties.validationStatus.const);
  assert.match(implementation, /assertClosedSelfHashedAgainstV5R5\(seal, SEAL_SCHEMA/u);
  assert.match(implementation, /assertClosedSelfHashedAgainstV5R5\(receipt, VALIDATION_SCHEMA/u);
});

test("R10 public workflow fixture substitutes the native seal and therefore cannot close the gap", () => {
  const fixture = source("runner-v5-r10-public-cli-workflow.test.mjs");
  assert.match(fixture, /sealReferenceLabels:\s*async\s*\(\)\s*=>\s*\{/u);
  assert.match(fixture, /state\.referenceSealed\s*=\s*true/u);
  assert.doesNotMatch(fixture, /buildRawAuthoritativeMachineReferenceSealV5R10/u);
  const registeredRawReference = source("runner-v5-r7-raw-reference.test.mjs");
  assert.match(registeredRawReference, /buildRawAuthoritativeMachineReferenceSealV5R7/u);
  assert.doesNotMatch(registeredRawReference, /buildRawAuthoritativeMachineReferenceSealV5R10/u);
});

test("all four registered process-evidence schemas misidentify V5-R10 evidence as V5-R8", () => {
  for (const name of ["IndependentStaticImportGraphReceiptV1",
    "ForbiddenPrimaryScorerPathScanReceiptV1", "IndependentCommandRuntimeReceiptV1",
    "IndependentSourceEnumerationReceiptV1"]) {
    assert.equal(schema(name).properties.runnerVersion.const, "V5-R8", name);
  }
  const contract = source("schema-contract-v5-r10.mjs");
  assert.match(contract, /V5_R9_SCHEMA_CATALOG/u);
  assert.match(contract, /validateClosedSelfHashedArtifactV5R9/u);
  const review = source("review-evidence-v5-r10.mjs");
  for (const name of ["IndependentStaticImportGraphReceiptV1",
    "ForbiddenPrimaryScorerPathScanReceiptV1", "IndependentCommandRuntimeReceiptV1",
    "IndependentSourceEnumerationReceiptV1"]) assert.match(review, new RegExp(name, "u"));
});

test("R8-002 transport bypass is closed at the final credential and HTTP boundary", () => {
  const adapter = source("native-provider-adapter-v5-r10.mjs");
  const custodyLoad = adapter.indexOf("loadExactTransportActivationCustodyV5R10");
  const credentialRead = adapter.indexOf("await credentialReader");
  const fetch = adapter.indexOf("await fetchImplementation");
  assert.ok(custodyLoad >= 0 && credentialRead > custodyLoad && fetch > credentialRead);
  assert.match(adapter, /validateProviderActivationV5R10/u);
  assert.match(adapter, /const trustedInput = Object\.freeze\(\{ \.\.\.input, \.\.\.exact \}\)/u);
});

test("R8-003 raw route evidence now requires source bytes and a rebuilt probe graph", () => {
  const evidence = source("trusted-provider-evidence-v5-r10.mjs");
  for (const token of ["rawSourceBody", "rawResponseArtifact", "rawResponseBindingReceipt",
    "attemptCommitIntent", "resolvedAttemptReceipt", "reconstructRouteProbeCustodyGraphV5R10",
    "trustedProviderEvidenceAnchors"]) assert.match(evidence, new RegExp(token, "u"));
});

test("R8-004 and R8-005 terminal and decision facts are rebuilt from raw custody", () => {
  const runtime = source("runner-v5-r10-runtime.mjs");
  const scorer = source("scorer-verifier-v5-r10.mjs");
  const decision = source("decision-evidence-v5-r10.mjs");
  assert.match(runtime, /buildTerminalExecutionBundleFromRawCustodyV5R10/u);
  assert.doesNotMatch(runtime, /scoringInputBuilder|terminalEvidenceBuilder/u);
  assert.match(scorer, /reconstructDecisionEvidenceV5R10/u);
  assert.match(scorer, /attemptGraphReceiptHash|ledgerRootHash|commandJournalRootHash/u);
  assert.doesNotMatch(decision,
    /receiptChainValid:\s*input\.|providerTupleValid:\s*input\.|capsValid:\s*input\./u);
});

test("R8-006 interrupted recovery is zero-HTTP, exact-custody, and reloaded", () => {
  const recovery = source("attempt-recovery-v5-r10.mjs");
  const runtime = source("runner-v5-r10-runtime.mjs");
  assert.match(recovery, /forbids transport and credential dependencies/u);
  assert.match(recovery, /orphan ledger completion/u);
  assert.match(recovery, /prepared-completion bytes/u);
  assert.match(runtime, /loadRecoveryInput/u);
  assert.match(runtime, /reloadAttemptCustodyStoreV5R10/u);
  assert.match(runtime, /reconcile-interrupted-attempt-zero-http/u);
});

test("R8-007 composite finding key is scoped by item and R8-008 closeout is exact", () => {
  const kernel = source("statistical-kernel-v5-r10.mjs");
  assert.match(kernel, /`\$\{itemId\}\|\$\{finding\.findingId\}\|\$\{finding\.family\}\|\$\{finding\.code\}`/u);
  const closeout = JSON.parse(readFileSync(path.join(REPO,
    "coordination/reports/mais-natural-ca60-v5-r10-runner-closeout-a07/a07-runner-closeout-receipt.json"),
  "utf8"));
  assert.equal(closeout.sourceCommit, "43e88fa73acb38eca7926360f37c72d9115641f3");
  assert.equal(closeout.registrationCommit, "f3605158d12b601a6ec6b73a39998f156c4a49f3");
  assert.deepEqual([closeout.postRegistrationTestPassCount, closeout.postRegistrationTestFailCount,
    closeout.postRegistrationTestSkipCount], [52, 0, 0]);
  assert.equal(closeout.finalState, "REVIEWED_COMMIT");
});

test("R9-001 phase-order assertion recognizes the valid A07-closeout stop", () => {
  const remediation = source("runner-v5-r10-remediation.test.mjs");
  assert.match(remediation, /A07 closeout/u);
  assert.match(remediation, /credentialReads, 0/u);
  assert.match(remediation, /fetches, 0/u);
});

test("claim ceiling and zero-authority defaults remain fail closed", () => {
  const registration = JSON.parse(readFileSync(path.join(REPO,
    "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r10/runner-registration.json"),
  "utf8"));
  assert.equal(registration.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(registration.claimCeiling,
    "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED");
  assert.equal(registration.routeAuthenticityState,
    "ROUTE_AUTHENTICITY_BLOCKED_NO_PINNED_TRUST_ANCHOR");
  assert.deepEqual(registration.trustedProviderEvidenceAnchors, []);
  assert.ok(Object.values(registration.authorizationState).every((value) => value === 0 || value === false));
});
