import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHongKongDisplayed74Test } from "./hongKongDisplayed74FocusedTestLedger";

import displayed74SnapshotJson from "../data/historical/hongKongQuestions-displayed255-preimage-20260813.json";

export const HONG_KONG_DISPLAYED74_HISTORY_PROVENANCE_SUITE_ID =
  "hk-displayed74-history-provenance-v1" as const;
const test = createHongKongDisplayed74Test(HONG_KONG_DISPLAYED74_HISTORY_PROVENANCE_SUITE_ID);
import preimageExtractionManifestJson from "../coordination/content-qa/authoritative/2026-08-13-hk-displayed74-preimage-extraction-manifest.json";
import repairContractJson from "../coordination/content-qa/authoritative/2026-08-13-hk-displayed74-repair-contract.json";

type Displayed74Snapshot = {
  adjudicationSha256: {
    explanation: string;
    response: string;
    responseDecisionV1: string;
    responseDecisionV2?: string;
  };
  adjudicationAuthority?: {
    responseDecisionV1: string;
    responseDecisionV2: string;
  };
  orderedIdListSha256: string;
  sortedIdListSha256: string;
  questionsPayloadSha256?: string;
  questions: Array<{ id: string }>;
};

const localEvidence = [
  [
    "2026-08-13-A18-displayed255-explanation-adjudication.md",
    "d86746cf2fc44cbe7f66ab22c86668340db72e1687dfaaeff2e45c5c7e0f7d55"
  ],
  [
    "2026-08-13-A18-displayed255-response-assessment-adjudication.md",
    "e282d7e64ae2e17f20a59c0a9f990a27f14659cdbb148660ad9b400703d57281"
  ],
  [
    "2026-08-13-A18-displayed255-response-decision-addendum.md",
    "4c7155b9cb854241df3e570ca79465f841ecd49575426f35c608251c7bc9cbe9"
  ],
  [
    "2026-08-13-A18-displayed255-response-decision-addendum-v2.md",
    "bcd65fca1f789a9d9f60f343d13607c099ae044a0379b423b0b84592f843287f"
  ]
] as const;

const snapshot = displayed74SnapshotJson as Displayed74Snapshot;
const preimageExtractionManifest = preimageExtractionManifestJson;
const repairContract = repairContractJson;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

test("the displayed-74 immutable preimage binds the independently approved final v2 decision", () => {
  assert.equal(
    snapshot.adjudicationSha256.responseDecisionV1,
    "4c7155b9cb854241df3e570ca79465f841ecd49575426f35c608251c7bc9cbe9"
  );
  assert.equal(
    snapshot.adjudicationSha256.responseDecisionV2,
    "bcd65fca1f789a9d9f60f343d13607c099ae044a0379b423b0b84592f843287f"
  );
  assert.deepEqual(snapshot.adjudicationAuthority, {
    responseDecisionV1: "superseded-immutable-audit-record",
    responseDecisionV2: "final-implementation-authority"
  });
});

test("every authoritative adjudication digest is reproducible from package-local evidence", () => {
  for (const [fileName, expectedSha256] of localEvidence) {
    const bytes = readFileSync(join(process.cwd(), "coordination/content-qa/authoritative", fileName));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expectedSha256, fileName);
  }
  assert.deepEqual(snapshot.adjudicationSha256, {
    explanation: localEvidence[0][1],
    response: localEvidence[1][1],
    responseDecisionV1: localEvidence[2][1],
    responseDecisionV2: localEvidence[3][1]
  });
  assert.deepEqual(repairContract.authority, {
    explanationAdjudicationSha256: localEvidence[0][1],
    responseAdjudicationSha256: localEvidence[1][1],
    responseDecisionV2Sha256: localEvidence[3][1]
  });
});

test("the provenance-only regeneration preserves the exact 74-row question set", () => {
  const ids = snapshot.questions.map((question) => question.id);
  assert.equal(ids.length, 74);
  assert.equal(new Set(ids).size, 74);
  assert.equal(sha256(JSON.stringify(ids)), "fcb17ad572d52be11b4bb7651c6eff17c82bd97d2cee18a6b61fadda86dbfcc0");
  assert.equal(
    sha256(JSON.stringify([...ids].sort((left, right) => left.localeCompare(right)))),
    "26d50e2670666468c342d20b1a2f8a04992b06a9fab3274e953bf875afaacf93"
  );
  assert.equal(
    snapshot.orderedIdListSha256,
    "fcb17ad572d52be11b4bb7651c6eff17c82bd97d2cee18a6b61fadda86dbfcc0"
  );
  assert.equal(
    snapshot.sortedIdListSha256,
    "26d50e2670666468c342d20b1a2f8a04992b06a9fab3274e953bf875afaacf93"
  );
  assert.equal(
    snapshot.questionsPayloadSha256,
    "673bdd81a8a19d53ff0589a4fdd08841ff58ec2af09930f23b95269c2c64889f"
  );
  assert.equal(
    sha256(JSON.stringify(snapshot.questions)),
    "673bdd81a8a19d53ff0589a4fdd08841ff58ec2af09930f23b95269c2c64889f"
  );
});

test("the package-local extraction manifest binds the snapshot and exact preimage source bytes", () => {
  assert.deepEqual(preimageExtractionManifest.artifact, {
    path: "data/historical/hongKongQuestions-displayed255-preimage-20260813.json",
    questionsCount: 74,
    questionsPayloadSha256: snapshot.questionsPayloadSha256,
    orderedIdListSha256: snapshot.orderedIdListSha256,
    sortedIdListSha256: snapshot.sortedIdListSha256
  });
  assert.equal(preimageExtractionManifest.source.path, "data/questions.ts");
  assert.equal(preimageExtractionManifest.source.sha256, "900ab6f081ee5e6e021fa50ec06155bfd13356cddf1d188e8d960b44937d5ef4");
  assert.equal(preimageExtractionManifest.source.byteLength, 195078);
  assert.equal(preimageExtractionManifest.source.lineCount, 3130);
  assert.match(preimageExtractionManifest.source.status, /independently recovered and hash-verified/);
  assert.match(preimageExtractionManifest.source.status, /materialized byte-for-byte as package-local immutable evidence/);

  assert.deepEqual(preimageExtractionManifest.packageLocalSourceEvidence, {
    path: "coordination/content-qa/authoritative/2026-08-13-data-questions-preimage.txt",
    sha256: "900ab6f081ee5e6e021fa50ec06155bfd13356cddf1d188e8d960b44937d5ef4",
    byteLength: 195078,
    lineCount: 3130,
    serialization: "raw UTF-8 bytes with the original trailing LF",
    authority: "byte-for-byte data/questions.ts preimage evidence only; non-runtime and never imported as production source"
  });
  const sourceEvidenceBytes = readFileSync(join(process.cwd(), preimageExtractionManifest.packageLocalSourceEvidence.path));
  const sourceEvidenceText = sourceEvidenceBytes.toString("utf8");
  assert.equal(sourceEvidenceBytes.byteLength, 195078);
  assert.equal(createHash("sha256").update(sourceEvidenceBytes).digest("hex"), preimageExtractionManifest.source.sha256);
  assert.equal(sourceEvidenceText.match(/\n/g)?.length, 3130);
  assert.ok(sourceEvidenceText.endsWith("\n"), "source evidence preserves the original trailing LF");

  assert.match(preimageExtractionManifest.externalRecoveryDiagnostic.scope, /external recovery-chain diagnostic only/);
  assert.equal(preimageExtractionManifest.externalRecoveryDiagnostic.containerSha256, "163c0ceae6a97610df44c20eabb0c2641a742bec270b17ccf1a178a3bf445de5");
  assert.equal(preimageExtractionManifest.externalRecoveryDiagnostic.forensicReceiptSha256, "53d7188262d446afeeede80e63cec4b934271a7a4a8519b6bbfdd88aa76dae97");
  assert.match(preimageExtractionManifest.reproducibilityBoundary, /Re-executing that source alone is not claimed/);
  assert.match(preimageExtractionManifest.reproducibilityBoundary, /External absolute paths document the recovery chain only and are never read/);
  assert.match(preimageExtractionManifest.extraction.objectFingerprintSerialization, /^SHA256\(JSON\.stringify\(question\)\)/);
  assert.match(preimageExtractionManifest.extraction.materialFingerprintSerialization, /curriculumTrack/);

  const evidence = preimageExtractionManifest.authorityEvidence;
  assert.deepEqual(
    [evidence.explanation.sha256, evidence.response.sha256, evidence.responseDecisionV1AuditRecord.sha256, evidence.responseDecisionV2.sha256],
    localEvidence.map(([, sha]) => sha)
  );
  assert.equal(evidence.responseDecisionV1AuditRecord.authority, "superseded-immutable-audit-record");
  assert.equal(evidence.responseDecisionV2.authority, "final-implementation-authority");
  for (const item of Object.values(evidence)) {
    const bytes = readFileSync(join(process.cwd(), item.path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, item.path);
  }

  assert.deepEqual(preimageExtractionManifest.machineContractArtifacts, {
    repairContract: {
      path: "coordination/content-qa/authoritative/2026-08-13-hk-displayed74-repair-contract.json",
      sha256: "727fa3b8c9d2351041ea624d0148d6e8aa105fce02f27a54f95c3a9bfae11aa4"
    },
    genericExplanations: {
      path: "coordination/content-qa/authoritative/2026-08-13-hk-displayed74-generic-explanations.json",
      sha256: "3582bcf6a275196c6f8aef7a235c182de267fa2e39490fc013ccdba784a8fb47"
    }
  });
  for (const item of Object.values(preimageExtractionManifest.machineContractArtifacts)) {
    const bytes = readFileSync(join(process.cwd(), item.path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, item.path);
  }
});
