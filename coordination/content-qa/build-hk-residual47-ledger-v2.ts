import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import v1Json from "./authoritative/2026-08-13-hk-residual47-adjudication-ledger.json";

const TARGET_PATH =
  "coordination/content-qa/authoritative/2026-08-13-hk-residual47-adjudication-ledger-v2.json";
const REFERENCED_ARTIFACTS = [
  ["coordination/content-qa/authoritative/2026-08-13-hk-residual47-adjudication-ledger.json", "0db36ad492e282d68fbe9a5ead50fd3156809f7ee8c2e6812ce2e973a6ef89e6"],
  ["coordination/content-qa/authoritative/2026-08-13-data-questions-residual28-preimage.txt", "24ec6fb77921f0d22a8281179ac3a07f55817351ad31894a94cf72cfa5cc8f7a"],
  ["coordination/content-qa/authoritative/2026-08-13-hk-residual28-source-recovery-receipt.json", "badd8ba52a6da7f7960a40f1da900357d8f9aac87a5fc0b215004143a6f60807"],
  ["data/questions.ts", "96d90f3c090b14bd7797155ffcbb20edcbf2230147a945f6c02ec32a470dbca8"],
  ["coordination/content-qa/authoritative/2026-08-13-data-questions-preimage.txt", "900ab6f081ee5e6e021fa50ec06155bfd13356cddf1d188e8d960b44937d5ef4"],
  ["coordination/content-qa/authoritative/2026-08-13-hk-residual47-partition.json", "d1f7c2eaeea5deaa41fafcf75be28498e0919ce3eff9eeace55cf7c55baeeb37"],
  ["coordination/content-qa/authoritative/2026-08-13-hk-residual47-learner-content.txt", "250aeec93a13ae0efd7b1ddc1dc161120eb785d8c4ea97bdc0b3e415912a1442"],
  ["coordination/content-qa/authoritative/2026-08-13-hk-residual47-semantic-audit-v1-superseded.json", "5021bcdb57c085fc2d9fcc9a573554da69a6f5aa4555b9e3ddaf774d2d7cb7da"],
  ["coordination/content-qa/authoritative/2026-08-13-hk-residual47-semantic-audit-addendum-v2.json", "302eeb11c0eb36a7ca254caf82dd1e167c6c8107872cb4fec622433a35b37d1b"],
  ["coordination/content-qa/authoritative/2026-08-13-hk-residual47-rewrite-recommendations-proposal.md", "a6c15272c5dcd0ff81e9f55205fc2ea711244c6c261b7769238b25f67d531eda"]
] as const;

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha(relativePath: string) {
  return sha256(readFileSync(join(process.cwd(), relativePath)));
}

export function buildHongKongResidual47LedgerV2() {
  for (const [path, expectedSha256] of REFERENCED_ARTIFACTS) {
    assert.equal(fileSha(path), expectedSha256, `${path}: builder authority drift`);
  }
  const v1 = v1Json as any;
  let cleanProposalCount = 0;
  let classifiedProposalCount = 0;
  const rows = v1.rows.map((row: any) => {
    if (row.proposal.exactWordingArtifact === null) {
      assert.equal(row.proposal.exactWordingArtifactSha256, null);
      const { exactWordingArtifactSha256: omittedLegacyNullSha, ...proposal } = row.proposal;
      assert.equal(omittedLegacyNullSha, null);
      cleanProposalCount += 1;
      return { ...row, proposal };
    }
    classifiedProposalCount += 1;
    return {
      ...row,
      proposal: {
        status: row.proposal.status,
        allowedCandidateFields: row.proposal.allowedCandidateFields,
        exactWordingArtifact: {
          classification: "immutable-artifact-resolvable",
          path: "coordination/content-qa/authoritative/2026-08-13-hk-residual47-rewrite-recommendations-proposal.md",
          sha256: row.proposal.exactWordingArtifactSha256
        }
      }
    };
  });
  assert.equal(cleanProposalCount, 19);
  assert.equal(classifiedProposalCount, 28);
  return {
    schemaVersion: 2,
    artifact: "hk-residual47-adjudication-ledger-v2",
    generatedAtUtc: v1.generatedAtUtc,
    decision: v1.decision,
    intakeAuthorized: v1.intakeAuthorized,
    implementationAuthorized: v1.implementationAuthorized,
    productionFilesEditedByThisFreeze: v1.productionFilesEditedByThisFreeze,
    supersedes: {
      classification: "immutable-artifact-resolvable",
      path: "coordination/content-qa/authoritative/2026-08-13-hk-residual47-adjudication-ledger.json",
      sha256: "0db36ad492e282d68fbe9a5ead50fd3156809f7ee8c2e6812ce2e973a6ef89e6",
      reason: "Provenance-only v2: all 47 adjudication rows, findings, counts, and payload digests remain byte-semantic; stale temporary/live path claims are replaced by package-local immutable or current-live bindings."
    },
    scope: v1.scope,
    sourceSnapshot: {
      originalSourceCoordinate: {
        classification: "non-authoritative-historical-coordinate",
        coordinate: v1.sourceSnapshot.currentQuestionsPath,
        observedSha256: v1.sourceSnapshot.currentQuestionsSha256,
        role: "historical coordinate only; authoritative bytes are the recovered immutable artifact"
      },
      immutableSourceArtifact: {
        classification: "immutable-artifact-resolvable",
        path: "coordination/content-qa/authoritative/2026-08-13-data-questions-residual28-preimage.txt",
        sha256: "24ec6fb77921f0d22a8281179ac3a07f55817351ad31894a94cf72cfa5cc8f7a",
        byteLength: 202554
      },
      sourceRecoveryReceipt: {
        classification: "immutable-artifact-resolvable",
        path: "coordination/content-qa/authoritative/2026-08-13-hk-residual28-source-recovery-receipt.json",
        sha256: "badd8ba52a6da7f7960a40f1da900357d8f9aac87a5fc0b215004143a6f60807"
      },
      currentSource: {
        classification: "live-resolvable",
        path: "data/questions.ts",
        sha256: "96d90f3c090b14bd7797155ffcbb20edcbf2230147a945f6c02ec32a470dbca8"
      },
      earlierDisplayed74Preimage: {
        classification: "immutable-artifact-resolvable",
        path: "coordination/content-qa/authoritative/2026-08-13-data-questions-preimage.txt",
        sha256: "900ab6f081ee5e6e021fa50ec06155bfd13356cddf1d188e8d960b44937d5ef4",
        role: v1.sourceSnapshot.earlierDisplayed74Preimage.role
      },
      sourceCommit: v1.sourceSnapshot.headAndBaseline,
      sourceBranch: v1.sourceSnapshot.branch
    },
    evidence: {
      partition: {
        classification: "immutable-artifact-resolvable",
        path: "coordination/content-qa/authoritative/2026-08-13-hk-residual47-partition.json",
        sha256: "d1f7c2eaeea5deaa41fafcf75be28498e0919ce3eff9eeace55cf7c55baeeb37"
      },
      learnerContentDump: {
        classification: "immutable-artifact-resolvable",
        path: "coordination/content-qa/authoritative/2026-08-13-hk-residual47-learner-content.txt",
        sha256: "250aeec93a13ae0efd7b1ddc1dc161120eb785d8c4ea97bdc0b3e415912a1442"
      },
      supersededAudit: {
        classification: "immutable-artifact-resolvable",
        path: "coordination/content-qa/authoritative/2026-08-13-hk-residual47-semantic-audit-v1-superseded.json",
        sha256: "5021bcdb57c085fc2d9fcc9a573554da69a6f5aa4555b9e3ddaf774d2d7cb7da",
        status: v1.evidence.supersededAudit.status
      },
      authoritativeAddendum: {
        classification: "immutable-artifact-resolvable",
        path: "coordination/content-qa/authoritative/2026-08-13-hk-residual47-semantic-audit-addendum-v2.json",
        sha256: "302eeb11c0eb36a7ca254caf82dd1e167c6c8107872cb4fec622433a35b37d1b"
      },
      proposedRewriteArtifact: {
        classification: "immutable-artifact-resolvable",
        path: "coordination/content-qa/authoritative/2026-08-13-hk-residual47-rewrite-recommendations-proposal.md",
        sha256: "a6c15272c5dcd0ff81e9f55205fc2ea711244c6c261b7769238b25f67d531eda",
        status: v1.evidence.proposedRewriteArtifact.status
      }
    },
    counts: v1.counts,
    claimBoundary: v1.claimBoundary,
    ...(v1.wordingSupersessions === undefined ? {} : { wordingSupersessions: v1.wordingSupersessions }),
    rows
  };
}

export function assertCheckedInHongKongResidual47LedgerV2() {
  const expected = buildHongKongResidual47LedgerV2();
  const v2Json = JSON.parse(readFileSync(join(process.cwd(), TARGET_PATH), "utf8"));
  assert.deepEqual(v2Json, expected);
  const resolvable = [
    v2Json.supersedes,
    v2Json.sourceSnapshot.immutableSourceArtifact,
    v2Json.sourceSnapshot.sourceRecoveryReceipt,
    v2Json.sourceSnapshot.currentSource,
    v2Json.sourceSnapshot.earlierDisplayed74Preimage,
    ...Object.values(v2Json.evidence),
    ...v2Json.rows
      .map((row: any) => row.proposal.exactWordingArtifact)
      .filter((artifact: unknown) => artifact !== null)
  ] as Array<{ classification: string; path: string; sha256: string }>;
  for (const artifact of resolvable) {
    assert.ok(
      artifact.classification === "live-resolvable"
        || artifact.classification === "immutable-artifact-resolvable",
      `${artifact.path}: invalid resolvable classification`
    );
    assert.equal(fileSha(artifact.path), artifact.sha256, `${artifact.path}: referenced bytes drift`);
  }
  assert.equal(
    v2Json.sourceSnapshot.originalSourceCoordinate.classification,
    "non-authoritative-historical-coordinate"
  );
  assert.deepEqual((v2Json as any).scope, (v1Json as any).scope);
  assert.deepEqual((v2Json as any).counts, (v1Json as any).counts);
  assert.equal((v2Json as any).decision, (v1Json as any).decision);
  assert.equal((v2Json as any).intakeAuthorized, (v1Json as any).intakeAuthorized);
  assert.equal((v2Json as any).implementationAuthorized, (v1Json as any).implementationAuthorized);
  assert.equal(
    (v2Json as any).productionFilesEditedByThisFreeze,
    (v1Json as any).productionFilesEditedByThisFreeze
  );
  assert.deepEqual((v2Json as any).claimBoundary, (v1Json as any).claimBoundary);
  assert.deepEqual((v2Json as any).wordingSupersessions, (v1Json as any).wordingSupersessions);
  assert.deepEqual(
    (v2Json as any).rows.map((row: any) => ({
      ...row,
      proposal: row.proposal.exactWordingArtifact === null
        ? { ...row.proposal, exactWordingArtifactSha256: null }
        : {
            ...row.proposal,
            exactWordingArtifact: (v1Json as any).rows[row.ordinal - 1].proposal.exactWordingArtifact,
            exactWordingArtifactSha256: row.proposal.exactWordingArtifact.sha256
          }
    })),
    (v1Json as any).rows
  );
  return expected;
}

if (process.argv[1]?.endsWith("build-hk-residual47-ledger-v2.ts")) {
  if (process.argv.includes("--write")) {
    writeFileSync(join(process.cwd(), TARGET_PATH), `${JSON.stringify(buildHongKongResidual47LedgerV2(), null, 2)}\n`);
    process.stdout.write("HK residual47 ledger v2: deterministic provenance bytes regenerated\n");
  } else {
    assertCheckedInHongKongResidual47LedgerV2();
    process.stdout.write("HK residual47 ledger v2: exact deterministic bytes verified\n");
  }
}
