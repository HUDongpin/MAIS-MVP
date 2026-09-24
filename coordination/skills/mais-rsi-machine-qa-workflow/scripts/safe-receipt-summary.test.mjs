import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  addSelfHash,
  hash,
  typedId,
  validMutatedPacket,
  validPacket,
} from "./test-fixtures.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "safe-receipt-summary.mjs");

async function withTempFile(content, fn) {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-safe-summary-test-"));
  const file = path.join(directory, "receipt.json");
  await writeFile(file, content, "utf8");
  try {
    return await fn(file);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function run(file) {
  return spawnSync(process.execPath, [SCRIPT, file], { encoding: "utf8" });
}

function parse(result) {
  assert.equal(result.stderr, "");
  return JSON.parse(result.stdout);
}

function escaped(value) {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

function safeGenericReceipt() {
  return {
    receiptType: "machine-qa-final",
    protocolId: `protocol-rsi-${hash("summary-protocol").slice(0, 16)}`,
    protocolVersion: "2.0.0",
    evidenceClass: "synthetic-calibration",
    status: "complete",
    candidateId: typedId("candidate", "summary-candidate"),
    candidateVersion: "2.0.0",
    candidateSha256: hash("summary-candidate"),
    packageCount: 3,
    questionCount: 30,
    lessonCount: 2,
    successfulProviderCalls: 4,
    providerAttempts: 5,
    failedOrLostProviderAttempts: 1,
    machineDisposition: "candidate-only",
    contentDecisionBoundary: "no-content-decision",
    prohibitedActionsObserved: false,
    claimCeiling: "machine-evidence-only",
    nextAllowedAction: "record-calibration-result",
    redaction: {
      protectedContentIncluded: false,
      credentialsIncluded: false,
      rawProviderResponsesIncluded: false,
    },
    independentReviewState: {
      status: "passed",
      freshContext: true,
      boundCandidateSha256: hash("summary-candidate"),
      reviewReceiptSha256: hash("summary-independent-review"),
      reviewerRole: "independent-machine-reviewer",
    },
    proofBoundaries: {
      localTest: { status: "passed", evidenceSha256: hash("summary-local") },
      receipt: { status: "passed", evidenceSha256: hash("summary-receipt") },
      trackedCommitted: { status: "unverified", evidenceSha256: null },
      main: { status: "unverified", evidenceSha256: null },
      ci: { status: "unverified", evidenceSha256: null },
      deployment: { status: "unverified", evidenceSha256: null },
      live: { status: "unverified", evidenceSha256: null },
    },
    deviationCodes: ["STREAM_MODE_DEVIATION"],
  };
}

test("summary rejects duplicate disposition and nested evidence keys without echo", async () => {
  const source = JSON.stringify(safeGenericReceipt());
  for (const duplicate of [
    '{"status":"DUPLICATE-PRIVATE-CANARY",' + source.slice(1),
    '{"\\u0073tatus":"blocked",' + source.slice(1),
    source.replace('"credentialsIncluded":false', '"credentialsIncluded":true,"credentialsIncluded":false'),
  ]) {
    await withTempFile(duplicate, async (file) => {
      const result = run(file);
      assert.equal(result.status, 2);
      assert.ok(parse(result).issueCodes.includes("JSON_DUPLICATE_KEY"));
      assert.doesNotMatch(result.stdout + result.stderr, /DUPLICATE-PRIVATE-CANARY/);
    });
  }
});

test("--help exits 0 and states semantic boundary", () => {
  const result = spawnSync(process.execPath, [SCRIPT, "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /cannot\s+override/);
});

test("valid self-hashed generic receipt produces a strict semantic summary", async () => {
  const receipt = addSelfHash(safeGenericReceipt());
  await withTempFile(JSON.stringify(receipt), async (file) => {
    const result = run(file);
    assert.equal(result.status, 0, result.stdout);
    assert.doesNotMatch(result.stdout, new RegExp(receipt.candidateId));
    assert.doesNotMatch(result.stdout, new RegExp(receipt.protocolId));
    const output = parse(result);
    assert.equal(output.result, "valid");
    assert.equal(output.selfHash.valid, true);
    assert.equal(output.summary.machineDisposition, "candidate-only");
    assert.equal(output.summary.candidateId, undefined);
    assert.equal(output.summary.independentReviewState.status, "passed");
    assert.equal(output.summary.proofBoundaries.receipt.status, "passed");
  });
});

test("synthetic calibration can never use an A18 handoff transition", async () => {
  const unsafeTransition = safeGenericReceipt();
  unsafeTransition.nextAllowedAction = "handoff-to-a18";
  const receipt = addSelfHash(unsafeTransition);
  await withTempFile(JSON.stringify(receipt), async (file) => {
    const result = run(file);
    assert.equal(result.status, 2, result.stdout);
    const output = parse(result);
    assert.equal(output.result, "blocked");
    assert.deepEqual(output.summary, { summaryVersion: 2 });
    assert.ok(output.issueCodes.includes("STATE_TRANSITION_INVALID"));
  });
});

test("generic blocked and invalid states preserve safe summaries but always exit 2 with consistent state", async () => {
  for (const status of ["blocked", "invalid"]) {
    const receipt = safeGenericReceipt();
    receipt.status = status;
    receipt.machineDisposition = "blocked";
    receipt.nextAllowedAction = status === "invalid" ? "revalidate-packet" : "stop-blocked";
    receipt.independentReviewState = {
      status: status === "invalid" ? "unverified" : "blocked",
      freshContext: false,
      boundCandidateSha256: receipt.candidateSha256,
      reviewReceiptSha256: null,
      reviewerRole: "independent-machine-reviewer",
    };
    receipt.proofBoundaries.receipt = { status: "unverified", evidenceSha256: null };
    const selfHashed = addSelfHash(receipt);
    await withTempFile(JSON.stringify(selfHashed), async (file) => {
      const result = run(file);
      assert.equal(result.status, 2, result.stdout);
      const output = parse(result);
      assert.equal(output.result, "blocked");
      assert.equal(output.summary.status, status);
      assert.equal(output.summary.machineDisposition, "blocked");
      assert.ok(output.issueCodes.includes(`GENERIC_STATUS_${status.toUpperCase()}`));
    });
  }

  const inconsistent = safeGenericReceipt();
  inconsistent.status = "blocked";
  const selfHashed = addSelfHash(inconsistent);
  await withTempFile(JSON.stringify(selfHashed), async (file) => {
    const result = run(file);
    assert.equal(result.status, 2);
    const output = parse(result);
    assert.ok(output.issueCodes.includes("GENERIC_STATE_INCONSISTENT"));
    assert.equal(output.summary.status, undefined);
  });
});

test("generic receipt input is closed: unknown verdict and protected aliases are blocked without disclosure", async () => {
  const cases = [
    ["releaseVerdict", "approved-for-production-canary-781"],
    ["questionBodyAlias", "protected-question-canary-782"],
  ];
  for (const [field, value] of cases) {
    const receipt = safeGenericReceipt();
    receipt[field] = value;
    const selfHashed = addSelfHash(receipt);
    await withTempFile(JSON.stringify(selfHashed), async (file) => {
      const result = run(file);
      assert.equal(result.status, 2);
      assert.doesNotMatch(result.stdout, escaped(field));
      assert.doesNotMatch(result.stdout, escaped(value));
      assert.doesNotMatch(result.stderr, escaped(field));
      assert.doesNotMatch(result.stderr, escaped(value));
      const output = parse(result);
      assert.equal(output.selfHash.valid, true);
      assert.ok(output.issueCodes.includes("GENERIC_UNKNOWN_PROPERTY"));
      assert.equal(output.result, "blocked");
    });
  }
});

test("a valid self-hash cannot authorize approved-for-production disposition", async () => {
  const receipt = safeGenericReceipt();
  receipt.machineDisposition = "approved-for-production";
  const selfHashed = addSelfHash(receipt);
  await withTempFile(JSON.stringify(selfHashed), async (file) => {
    const result = run(file);
    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout, /approved-for-production/);
    const output = parse(result);
    assert.equal(output.selfHash.valid, true);
    assert.equal(output.summary.machineDisposition, undefined);
    assert.ok(output.issueCodes.includes("FORBIDDEN_APPROVAL_CLAIM"));
    assert.ok(output.issueCodes.includes("INVALID_MACHINE_DISPOSITION"));
  });
});

test("a valid self-hash cannot override unsafe claim-ceiling booleans", async () => {
  const receipt = safeGenericReceipt();
  receipt.claimCeiling = {
    machineEvidenceOnly: true,
    contentApprovalGranted: true,
  };
  const selfHashed = addSelfHash(receipt);
  await withTempFile(JSON.stringify(selfHashed), async (file) => {
    const result = run(file);
    assert.equal(result.status, 2);
    const output = parse(result);
    assert.equal(output.selfHash.valid, true);
    assert.equal(output.summary.claimCeiling, undefined);
    assert.ok(output.issueCodes.includes("FORBIDDEN_APPROVAL_CLAIM"));
    assert.ok(output.issueCodes.includes("INVALID_CLAIM_CEILING"));
  });
});

test("hyphenated question-answer prose in candidateId is blocked and never emitted", async () => {
  const receipt = safeGenericReceipt();
  receipt.candidateId = "the-answer-to-question-seven-is-four";
  const selfHashed = addSelfHash(receipt);
  await withTempFile(JSON.stringify(selfHashed), async (file) => {
    const result = run(file);
    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout, /the-answer-to-question-seven-is-four|candidateId/);
    const output = parse(result);
    assert.equal(output.selfHash.valid, true);
    assert.ok(output.issueCodes.includes("INVALID_CANDIDATE_ID"));
  });
});

test("multiple synthetic token families are blocked despite valid self-hashes and never leak", async () => {
  const syntheticTokens = [
    "sk-SYNTHETICABCDEFGHIJKLMNOPQRST",
    "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
    "AKIAABCDEFGHIJKLMNOP",
    "xoxb-1234567890-ABCDEFGHIJKLMNOP",
    "sk_live_ABCDEFGHIJKLMNOPQRST",
    "eyJabcdefghijk.abcdefghijkl.abcdefghijkl",
  ];
  for (const syntheticToken of syntheticTokens) {
    const receipt = safeGenericReceipt();
    receipt.candidateId = syntheticToken;
    const selfHashed = addSelfHash(receipt);
    await withTempFile(JSON.stringify(selfHashed), async (file) => {
      const result = run(file);
      assert.equal(result.status, 2);
      assert.doesNotMatch(result.stdout, escaped(syntheticToken));
      assert.doesNotMatch(result.stderr, escaped(syntheticToken));
      const output = parse(result);
      assert.equal(output.selfHash.valid, true);
      assert.ok(output.issueCodes.includes("INVALID_CANDIDATE_ID"));
    });
  }
});

test("full packet policyVersion cannot carry question-answer prose despite a valid self-hash", async () => {
  const packet = validPacket();
  const canary = "the-answer-to-question-seven-is-four";
  packet.identity.policyVersion = canary;
  const receipt = addSelfHash(packet);
  await withTempFile(JSON.stringify(receipt), async (file) => {
    const result = run(file);
    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout, escaped(canary));
    assert.doesNotMatch(result.stderr, escaped(canary));
    const output = parse(result);
    assert.equal(output.selfHash.valid, true);
    assert.equal(output.result, "blocked");
    assert.ok(output.issueCodes.includes("PACKET_SEMANTICS_INVALID"));
  });
});

test("full packet positive grammars block new synthetic token families without disclosure", async () => {
  const cases = [
    {
      value: "github_pat_SYNTHETICABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      mutate(packet, value) {
        packet.sourceIdentity[0].logicalId = value;
      },
    },
    {
      value: "glpat-SYNTHETIC0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      mutate(packet, value) {
        packet.authority.required = [value];
        packet.authority.proven = [value];
      },
    },
    {
      value: "npm_SYNTHETIC0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      mutate(packet, value) {
        packet.checks[0].id = value;
      },
    },
    {
      value: "hf_SYNTHETIC0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      mutate(packet, value) {
        packet.checks[0].evidenceRef = value;
      },
    },
    {
      value: "ya29.SYNTHETIC0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      mutate(packet, value) {
        packet.identity.protocolId = value;
      },
    },
  ];
  for (const item of cases) {
    const packet = validPacket();
    item.mutate(packet, item.value);
    const receipt = addSelfHash(packet);
    await withTempFile(JSON.stringify(receipt), async (file) => {
      const result = run(file);
      assert.equal(result.status, 2);
      assert.doesNotMatch(result.stdout, escaped(item.value));
      assert.doesNotMatch(result.stderr, escaped(item.value));
      const output = parse(result);
      assert.equal(output.selfHash.valid, true);
      assert.equal(output.result, "blocked");
      assert.ok(output.issueCodes.includes("PACKET_SEMANTICS_INVALID"));
    });
  }
});

test("protected fields and invalid self-hash are blocked without key/value disclosure", async () => {
  const receipt = {
    receiptType: "machine-qa-final",
    status: "complete",
    rawProviderResponse: "RAW-PROVIDER-CANARY-71",
    apiKey: "sk-SECRET-CANARY-72",
    selfHash: "0".repeat(64),
  };
  await withTempFile(JSON.stringify(receipt), async (file) => {
    const result = run(file);
    assert.equal(result.status, 2);
    assert.doesNotMatch(
      result.stdout,
      /rawProviderResponse|RAW-PROVIDER-CANARY-71|apiKey|SECRET-CANARY-72/,
    );
    const output = parse(result);
    assert.equal(output.selfHash.valid, false);
    assert.equal(output.summary.redactedFieldCount, 2);
    assert.ok(output.issueCodes.includes("UNSAFE_FIELD_PRESENT"));
    assert.ok(output.issueCodes.includes("SELF_HASH_INVALID"));
  });
});

test("invalid hashes, proof states, and independent review are omitted and blocked", async () => {
  const receipt = safeGenericReceipt();
  receipt.candidateSha256 = "A".repeat(64);
  receipt.proofBoundaries.ci = { status: "passed", evidenceSha256: null };
  receipt.independentReviewState.reviewReceiptSha256 = null;
  const selfHashed = addSelfHash(receipt);
  await withTempFile(JSON.stringify(selfHashed), async (file) => {
    const result = run(file);
    assert.equal(result.status, 2);
    const output = parse(result);
    assert.equal(output.selfHash.valid, true);
    assert.equal(output.summary.candidateSha256, undefined);
    assert.equal(output.summary.proofBoundaries, undefined);
    assert.equal(output.summary.independentReviewState, undefined);
    assert.ok(output.issueCodes.includes("INVALID_HASH_FIELD"));
    assert.ok(output.issueCodes.includes("INVALID_PROOF_BOUNDARIES"));
    assert.ok(output.issueCodes.includes("INVALID_INDEPENDENT_REVIEW_STATE"));
  });
});

test("unverified proof with a hash is semantically invalid despite a valid self-hash", async () => {
  const receipt = safeGenericReceipt();
  receipt.proofBoundaries.main = {
    status: "unverified",
    evidenceSha256: hash("unverified-must-not-carry-hash"),
  };
  const selfHashed = addSelfHash(receipt);
  await withTempFile(JSON.stringify(selfHashed), async (file) => {
    const result = run(file);
    assert.equal(result.status, 2);
    const output = parse(result);
    assert.equal(output.selfHash.valid, true);
    assert.equal(output.summary.proofBoundaries, undefined);
    assert.ok(output.issueCodes.includes("INVALID_PROOF_BOUNDARIES"));
  });
});

test("full machine packet is validated through the shared semantic validator", async () => {
  const packet = validPacket();
  const receipt = addSelfHash(packet);
  await withTempFile(JSON.stringify(receipt), async (file) => {
    const result = run(file);
    assert.equal(result.status, 0, result.stdout);
    assert.doesNotMatch(result.stdout, new RegExp(packet.identity.candidateId));
    assert.doesNotMatch(result.stdout, new RegExp(packet.evidenceId));
    const output = parse(result);
    assert.equal(output.selfHash.valid, true);
    assert.equal(output.summary.independentReviewState.status, "passed");
    assert.equal(output.summary.proofBoundaries.live.status, "unverified");
  });
});

test("a full-packet transition mismatch suppresses the semantic summary and exits 2", async () => {
  const packet = validPacket();
  packet.nextAllowedAction = "repair-candidate";
  const receipt = addSelfHash(packet);
  await withTempFile(JSON.stringify(receipt), async (file) => {
    const result = run(file);
    assert.equal(result.status, 2, result.stdout);
    const output = parse(result);
    assert.equal(output.result, "blocked");
    assert.deepEqual(output.summary, { summaryVersion: 2 });
    assert.ok(output.issueCodes.includes("PACKET_SEMANTICS_INVALID"));
  });
});

test("safe full-packet output exposes only fixed trust status and canonical receipt identity", async () => {
  const packet = validMutatedPacket();
  const anchor = packet.remediation.priorReceiptBindings.priorTrustAnchor;
  const receipt = addSelfHash(packet);
  await withTempFile(JSON.stringify(receipt), async (file) => {
    const result = run(file);
    assert.equal(result.status, 0, result.stdout);
    assert.doesNotMatch(result.stdout, escaped(anchor.sourceIdentitySha256));
    assert.doesNotMatch(result.stdout, escaped(anchor.externalReceiptSha256));
    const output = parse(result);
    assert.deepEqual(output.summary.trustAnchors.priorEvidence, {
      status: "VERIFIED",
      receiptIdentitySha256: anchor.receiptIdentitySha256,
    });
  });
});

test("malformed receipt exits 2 without input disclosure", async () => {
  await withTempFile('{"rawProviderResponse":"DO-NOT-ECHO"', async (file) => {
    const result = run(file);
    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout, /rawProviderResponse|DO-NOT-ECHO/);
    assert.deepEqual(parse(result).issueCodes, ["JSON_MALFORMED"]);
  });
});
