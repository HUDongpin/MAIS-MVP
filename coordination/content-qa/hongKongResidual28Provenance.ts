import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import recoveryReceiptJson from "./authoritative/2026-08-13-hk-residual28-source-recovery-receipt.json";
import repairContractJson from "./authoritative/2026-08-13-hk-residual28-repair-contract.json";
import semanticReauditJson from "./authoritative/2026-08-13-hk-residual28-semantic-reaudit-v3.json";
import ledgerV2Json from "./authoritative/2026-08-13-hk-residual47-adjudication-ledger-v2.json";
import residualSnapshotJson from "../../data/historical/hongKongQuestions-residual28-preimage-20260813.json";
import promotionManifestJson from "../../data/historical/hongKongResidual28PromotionManifest.json";
import { resolveHongKongEaseExact3ImmutablePreimage } from "./hk-ease-exact3-immutable-preimage-relocation";

export type ProvenanceClassification =
  | "live-resolvable"
  | "immutable-artifact-resolvable"
  | "explicitly-reconstructible";

export type DiscoveredProvenancePair = {
  owner: string;
  key: string;
  path: string;
  sha256: string;
  classification: ProvenanceClassification;
};

type StandaloneDigest = { owner: string; key: string; sha256: string };
type NonAuthoritativeCoordinate = { owner: string; key: string; coordinate: string; sha256: string };
type Reconstruction = {
  owner: string;
  key: string;
  sourcePostimagePath: string;
  sourcePostimageSha256: string;
  serialization: string;
  byteLength: number;
  sha256: string;
};
type Scan = {
  pairs: DiscoveredProvenancePair[];
  standalone: StandaloneDigest[];
  nonAuthoritative: NonAuthoritativeCoordinate[];
  reconstructible: Reconstruction[];
};

const SHA256 = /^[0-9a-f]{64}$/;
const EXPECTED_PAIR_COUNT = 63;
const EXPECTED_PAIR_TUPLE_SHA256 = "cb2b0755491f8165fadf340957af9c7532c908d28e9c742b223e018f5a5c1f71";
const EXPECTED_STANDALONE_COUNT = 219;
const EXPECTED_STANDALONE_TUPLE_SHA256 = "f5769251ab8e4a213110ed92d176ef62ce51ec630bb02a1598f9a5746ae11fad";
const EXPECTED_NON_AUTHORITATIVE_COUNT = 3;
const EXPECTED_NON_AUTHORITATIVE_TUPLE_SHA256 = "d37abcb1eaff0c6ad48f064235d233b8aff3c40f3cb1e2ee5fd55d01cb23e6ff";

export const hongKongResidual28ProvenanceArtifacts: Record<string, unknown> = {
  sourceRecoveryReceipt: recoveryReceiptJson,
  semanticReaudit: semanticReauditJson,
  ledgerV2: ledgerV2Json,
  residualSnapshot: residualSnapshotJson,
  repairContract: repairContractJson,
  promotionManifest: promotionManifestJson
};

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function assertSafeRelativePath(path: string, label: string) {
  assert.equal(isAbsolute(path), false, `${label}: absolute provenance path forbidden`);
  assert.equal(path.includes("\\"), false, `${label}: non-canonical path separator forbidden`);
  assert.equal(path.split("/").includes(".."), false, `${label}: traversal provenance path forbidden`);
  assert.equal(path.split("/").includes("."), false, `${label}: dot-segment provenance path forbidden`);
  assert.equal(path.split("/").some((segment) => segment.toLowerCase() === ".tmp"), false, `${label}: temporary provenance path forbidden`);
  assert.notEqual(path, "", `${label}: empty provenance path forbidden`);
}

export function hashRepositoryProvenanceFile(
  relativePath: string,
  repositoryRoot = process.cwd(),
  label = relativePath
) {
  assertSafeRelativePath(relativePath, label);
  const root = realpathSync(repositoryRoot);
  const resolved = resolve(root, relativePath);
  const lexicalRelative = relative(root, resolved);
  assert.ok(lexicalRelative && lexicalRelative !== ".." && !lexicalRelative.startsWith(`..${sep}`), `${label}: repository escape forbidden`);
  let exactCursor = root;
  for (const segment of relativePath.split("/")) {
    assert.ok(readdirSync(exactCursor).includes(segment), `${label}: repository path spelling drift`);
    exactCursor = join(exactCursor, segment);
  }
  const stats = lstatSync(resolved);
  assert.equal(stats.isSymbolicLink(), false, `${label}: symlink provenance target forbidden`);
  const physical = realpathSync(resolved);
  const physicalRelative = relative(root, physical);
  assert.ok(physicalRelative && physicalRelative !== ".." && !physicalRelative.startsWith(`..${sep}`), `${label}: physical repository escape forbidden`);
  assert.equal(physicalRelative, lexicalRelative, `${label}: physical target drift`);
  return sha256(readFileSync(physical));
}

function fileSha(relativePath: string, label = relativePath, repositoryRoot = process.cwd()) {
  return hashRepositoryProvenanceFile(relativePath, repositoryRoot, label);
}

export function readHongKongResidual28ReconstructionSource(request: {
  repositoryRoot: string;
  sourcePostimagePath: string;
  sourcePostimageSha256: string;
}) {
  const resolution = resolveHongKongEaseExact3ImmutablePreimage({
    repositoryRoot: request.repositoryRoot,
    logicalPath: request.sourcePostimagePath,
    expectedOldSha256: request.sourcePostimageSha256
  });
  let versionManifest: unknown;
  try {
    versionManifest = JSON.parse(resolution.bytes.toString("utf8"));
  } catch {
    throw new Error("HK_RESIDUAL28_RECONSTRUCTION_SOURCE_JSON_INVALID");
  }
  assert.ok(
    versionManifest && typeof versionManifest === "object" && !Array.isArray(versionManifest),
    "HK_RESIDUAL28_RECONSTRUCTION_SOURCE_SHAPE_INVALID"
  );
  const manifest = versionManifest as Record<string, unknown>;
  assert.equal(manifest.schemaVersion, 1, "HK_RESIDUAL28_RECONSTRUCTION_SOURCE_SCHEMA_DRIFT");
  assert.equal(
    typeof manifest.historySourceCommit,
    "string",
    "HK_RESIDUAL28_RECONSTRUCTION_SOURCE_HISTORY_COMMIT_INVALID"
  );
  assert.ok(
    manifest.activeIdByHistoricalId &&
      typeof manifest.activeIdByHistoricalId === "object" &&
      !Array.isArray(manifest.activeIdByHistoricalId),
    "HK_RESIDUAL28_RECONSTRUCTION_SOURCE_MAPPING_INVALID"
  );
  assert.ok(
    Array.isArray(manifest.retiredHistoricalIds) &&
      manifest.retiredHistoricalIds.every((id) => typeof id === "string"),
    "HK_RESIDUAL28_RECONSTRUCTION_SOURCE_RETIRED_IDS_INVALID"
  );
  return {
    bytes: resolution.bytes,
    immutableSnapshotPath: resolution.immutableSnapshotPath,
    versionManifest: manifest
  };
}

function inferredClassification(path: string): Exclude<ProvenanceClassification, "explicitly-reconstructible"> {
  return path === "data/questions.ts" || path === "data/historical/hongKongQuestionVersionManifest.json"
    ? "live-resolvable"
    : "immutable-artifact-resolvable";
}

function expectedStandaloneKeys() {
  const keys = new Set<string>([
    "ledgerV2:scope.residualOrderedIdSha256",
    "ledgerV2:scope.residualQuestionsPayloadSha256",
    "residualSnapshot:residual47OrderedIdSha256",
    "residualSnapshot:residual47QuestionsPayloadSha256",
    "residualSnapshot:questionsPayloadSha256",
    "residualSnapshot:orderedIdListSha256",
    "residualSnapshot:sortedIdListSha256",
    "repairContract:sourceSnapshot.preimageQuestionsPayloadSha256",
    "repairContract:sourceSnapshot.residual47PartitionSha256",
    "repairContract:sourceSnapshot.residual47OrderedIdSha256",
    "repairContract:sourceSnapshot.residual47QuestionsPayloadSha256",
    "repairContract:sourceSnapshot.unaffectedMappingEntriesSha256",
    "repairContract:sourceSnapshot.unaffectedRetiredIdsSha256"
  ]);
  for (let index = 0; index < 47; index += 1) keys.add(`ledgerV2:rows[${index}].currentQuestionPayloadSha256`);
  for (let index = 0; index < 19; index += 1) keys.add(`repairContract:cleanRows[${index}].questionPayloadSha256`);
  for (let index = 0; index < 28; index += 1) {
    keys.add(`repairContract:repairs[${index}].preimageQuestionPayloadSha256`);
    keys.add(`promotionManifest:promotions[${index}].preimageQuestionPayloadSha256`);
    keys.add(`promotionManifest:promotions[${index}].successorQuestionPayloadSha256`);
    keys.add(`promotionManifest:promotions[${index}].preimageMaterialSha256`);
    keys.add(`promotionManifest:promotions[${index}].successorMaterialSha256`);
  }
  return keys;
}

const STANDALONE_KEYS = expectedStandaloneKeys();
const NON_AUTHORITATIVE_KEYS = new Set([
  "sourceRecoveryReceipt:historicalCacheContainer",
  "sourceRecoveryReceipt:sourceMapExtraction",
  "ledgerV2:sourceSnapshot.originalSourceCoordinate"
]);
const RECONSTRUCTIBLE_KEYS = new Set([
  "repairContract:sourceSnapshot.preimageVersionManifestReconstruction",
  "promotionManifest:preimageVersionManifestReconstruction"
]);

function exactKeys(record: Record<string, unknown>, expected: string[], label: string) {
  assert.deepEqual(Object.keys(record).sort(), [...expected].sort(), `${label}: exact object shape drift`);
}

function classifiedShape(owner: string, keyPath: string, classification: string) {
  const identity = `${owner}:${keyPath}`;
  switch (classification) {
    case "live-resolvable":
      return ["classification", "path", "sha256"];
    case "immutable-artifact-resolvable":
      if (identity === "sourceRecoveryReceipt:immutableCacheContainer" || identity === "sourceRecoveryReceipt:recoveredArtifact" || identity === "ledgerV2:sourceSnapshot.immutableSourceArtifact") {
        return ["classification", "path", "sha256", "byteLength"];
      }
      if (identity === "ledgerV2:supersedes") return ["classification", "path", "sha256", "reason"];
      if (identity === "ledgerV2:sourceSnapshot.earlierDisplayed74Preimage") return ["classification", "path", "sha256", "role"];
      if (identity === "ledgerV2:evidence.supersededAudit" || identity === "ledgerV2:evidence.proposedRewriteArtifact") return ["classification", "path", "sha256", "status"];
      return ["classification", "path", "sha256"];
    case "explicitly-reconstructible":
      return ["classification", "sourcePostimagePath", "sourcePostimageSha256", "serialization", "byteLength", "sha256"];
    default:
      return [];
  }
}

export function scanHongKongResidual28Provenance(artifacts: Record<string, unknown>): Scan {
  const scan: Scan = { pairs: [], standalone: [], nonAuthoritative: [], reconstructible: [] };
  const seenObjects = new Set<object>();
  function visit(owner: string, current: unknown, keyPath: string) {
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(owner, item, `${keyPath}[${index}]`));
      return;
    }
    if (!current || typeof current !== "object") return;
    assert.equal(seenObjects.has(current), false, `${owner}:${keyPath}: duplicate/cyclic object occurrence forbidden`);
    seenObjects.add(current);
    const record = current as Record<string, unknown>;
    const classification = record.classification;
    let consumedClassifiedFields = new Set<string>();

    if ("classification" in record) {
      assert.equal(typeof classification, "string", `${owner}:${keyPath}: classification must be a string`);
      switch (classification) {
        case "live-resolvable":
        case "immutable-artifact-resolvable": {
          exactKeys(record, classifiedShape(owner, keyPath, classification), `${owner}:${keyPath}`);
          assert.equal(typeof record.path, "string", `${owner}:${keyPath}: classified path missing`);
          assertSafeRelativePath(record.path as string, `${owner}:${keyPath}`);
          assert.equal(typeof record.sha256, "string", `${owner}:${keyPath}: classified SHA missing`);
          assert.match(record.sha256 as string, SHA256, `${owner}:${keyPath}: malformed/lowercase classified SHA`);
          if (classification === "live-resolvable") {
            assert.equal(`${owner}:${keyPath}`, "ledgerV2:sourceSnapshot.currentSource", `${owner}:${keyPath}: live classification misuse`);
            assert.equal(record.path, "data/questions.ts", `${owner}:${keyPath}: live path drift`);
          } else {
            assert.notEqual(record.path, "data/questions.ts", `${owner}:${keyPath}: immutable classification misuse`);
          }
          scan.pairs.push({ owner, key: keyPath, path: record.path as string, sha256: record.sha256 as string, classification });
          consumedClassifiedFields = new Set(["classification", "path", "sha256"]);
          break;
        }
        case "non-authoritative-historical-coordinate":
        case "non-authoritative-recovery-coordinate": {
          const identity = `${owner}:${keyPath}`;
          assert.ok(NON_AUTHORITATIVE_KEYS.has(identity), `${identity}: non-authoritative classification misuse`);
          const expected = classification === "non-authoritative-historical-coordinate"
            ? ["classification", "coordinate", "observedSha256", "role"]
            : identity === "sourceRecoveryReceipt:historicalCacheContainer"
              ? ["classification", "historicalPath", "historicalSha256", "byteLength"]
              : ["classification", "historicalPath", "historicalSha256", "matchingSourceCount", "sourceIndex", "utf8ByteLength"];
          exactKeys(record, expected, identity);
          const coordinate = record.coordinate ?? record.historicalPath;
          const observedSha = record.observedSha256 ?? record.historicalSha256;
          assert.equal(typeof coordinate, "string", `${identity}: historical coordinate missing`);
          assert.equal(typeof observedSha, "string", `${identity}: historical SHA missing`);
          assert.match(observedSha as string, SHA256, `${identity}: malformed/lowercase historical SHA`);
          scan.nonAuthoritative.push({ owner, key: keyPath, coordinate: coordinate as string, sha256: observedSha as string });
          consumedClassifiedFields = new Set(Object.keys(record));
          break;
        }
        case "explicitly-reconstructible": {
          assert.ok(RECONSTRUCTIBLE_KEYS.has(`${owner}:${keyPath}`), `${owner}:${keyPath}: reconstructible classification misuse`);
          exactKeys(record, classifiedShape(owner, keyPath, classification), `${owner}:${keyPath}`);
          assert.equal(typeof record.sourcePostimagePath, "string", `${owner}:${keyPath}: source path missing`);
          assertSafeRelativePath(record.sourcePostimagePath as string, `${owner}:${keyPath}.sourcePostimagePath`);
          assert.equal(typeof record.sourcePostimageSha256, "string", `${owner}:${keyPath}: source SHA missing`);
          assert.match(record.sourcePostimageSha256 as string, SHA256);
          assert.equal(typeof record.serialization, "string");
          assert.equal(
            record.serialization,
            "UTF-8 JSON.stringify({ schemaVersion, historySourceCommit, activeIdByHistoricalId, retiredHistoricalIds }, null, 2) + U+000A after exact28 postimage reversal",
            `${owner}:${keyPath}: reconstruction serialization drift`
          );
          assert.equal(typeof record.byteLength, "number");
          assert.ok(Number.isSafeInteger(record.byteLength) && (record.byteLength as number) > 0);
          assert.equal(typeof record.sha256, "string");
          assert.match(record.sha256 as string, SHA256);
          scan.reconstructible.push({ owner, key: keyPath, sourcePostimagePath: record.sourcePostimagePath as string, sourcePostimageSha256: record.sourcePostimageSha256 as string, serialization: record.serialization as string, byteLength: record.byteLength as number, sha256: record.sha256 as string });
          consumedClassifiedFields = new Set(Object.keys(record));
          break;
        }
        case "confirmed-defect":
        case "independently-clean-on-bound-snapshot": {
          assert.equal(owner, "ledgerV2");
          assert.match(keyPath, /^rows\[\d+]$/);
          exactKeys(record, ["classification", "confirmedIssues", "currentQuestionPayloadSha256", "id", "ordinal", "proposal"], `${owner}:${keyPath}`);
          assert.ok(record.proposal && typeof record.proposal === "object" && !Array.isArray(record.proposal));
          const proposal = record.proposal as Record<string, unknown>;
          exactKeys(proposal, ["status", "allowedCandidateFields", "exactWordingArtifact"], `${owner}:${keyPath}.proposal`);
          if (classification === "confirmed-defect") {
            assert.ok(proposal.exactWordingArtifact && typeof proposal.exactWordingArtifact === "object", `${owner}:${keyPath}: defect proposal must be classified`);
          } else {
            assert.equal(proposal.exactWordingArtifact, null, `${owner}:${keyPath}: clean proposal must be exact null shape`);
          }
          consumedClassifiedFields = new Set(["classification"]);
          break;
        }
        default:
          assert.fail(`${owner}:${keyPath}: unknown provenance classification ${String(classification)}`);
      }
    }

    for (const [key, child] of Object.entries(record)) {
      const childPath = keyPath ? `${keyPath}.${key}` : key;
      if (consumedClassifiedFields.has(key)) continue;
      if (key === "path" || key === "sha256") {
        assert.fail(`${owner}:${childPath}: unclassified lowercase provenance key forbidden`);
      }
      if (key.endsWith("Path")) {
        assert.equal(typeof child, "string", `${owner}:${childPath}: path must be a string`);
        assertSafeRelativePath(child as string, `${owner}:${childPath}`);
        const shaKey = `${key.slice(0, -4)}Sha256`;
        assert.equal(typeof record[shaKey], "string", `${owner}:${childPath}: orphan path`);
        assert.match(record[shaKey] as string, SHA256, `${owner}:${childPath}: malformed/lowercase paired SHA`);
        scan.pairs.push({ owner, key: childPath, path: child as string, sha256: record[shaKey] as string, classification: inferredClassification(child as string) });
      }
      if (key.endsWith("Sha256")) {
        assert.notEqual(child, null, `${owner}:${childPath}: nullable SHA bypass forbidden`);
        assert.equal(typeof child, "string", `${owner}:${childPath}: SHA must be a string`);
        assert.match(child as string, SHA256, `${owner}:${childPath}: malformed/lowercase SHA`);
        const pathKey = `${key.slice(0, -6)}Path`;
        if (typeof record[pathKey] !== "string") {
          const identity = `${owner}:${childPath}`;
          assert.ok(STANDALONE_KEYS.has(identity), `${identity}: orphan or unapproved standalone SHA`);
          scan.standalone.push({ owner, key: childPath, sha256: child as string });
        }
      }
      visit(owner, child, childPath);
    }
  }
  for (const [owner, artifact] of Object.entries(artifacts)) visit(owner, artifact, "");
  assert.equal(scan.standalone.length, STANDALONE_KEYS.size, "exact standalone owner/key allowlist incomplete");
  assert.deepEqual(new Set(scan.standalone.map(({ owner, key }) => `${owner}:${key}`)), STANDALONE_KEYS);
  assert.equal(scan.nonAuthoritative.length, NON_AUTHORITATIVE_KEYS.size, "exact non-authoritative allowlist incomplete");
  assert.deepEqual(new Set(scan.nonAuthoritative.map(({ owner, key }) => `${owner}:${key}`)), NON_AUTHORITATIVE_KEYS);
  assert.equal(scan.reconstructible.length, RECONSTRUCTIBLE_KEYS.size, "exact reconstruction allowlist incomplete");
  assert.deepEqual(new Set(scan.reconstructible.map(({ owner, key }) => `${owner}:${key}`)), RECONSTRUCTIBLE_KEYS);
  return scan;
}

function sortedTupleHash(values: unknown[]) {
  return sha256(JSON.stringify(values.map((value) => JSON.stringify(value)).sort()));
}

function reconstructVersionManifest(injectedPromotionManifest: any, injectedVersionManifest: any) {
  assert.ok(Array.isArray(injectedPromotionManifest?.promotions));
  assert.equal(injectedPromotionManifest.promotions.length, 28, "injected promotion manifest exact28 required");
  const reversedMap = { ...injectedVersionManifest.activeIdByHistoricalId };
  const oldIds = new Set<string>();
  for (const promotion of injectedPromotionManifest.promotions) {
    exactKeys(promotion, ["fromId", "baseId", "toId", "preimageQuestionPayloadSha256", "successorQuestionPayloadSha256", "preimageMaterialSha256", "successorMaterialSha256", "allowedPaths", "replacements", "materialBindings"], `${promotion?.fromId}: injected promotion`);
    oldIds.add(promotion.fromId);
    assert.equal(reversedMap[promotion.fromId], promotion.toId, `${promotion.fromId}: injected mapping drift`);
    delete reversedMap[promotion.fromId];
    if (promotion.fromId.endsWith("-v2")) {
      assert.equal(reversedMap[promotion.baseId], promotion.toId, `${promotion.baseId}: injected base mapping drift`);
      reversedMap[promotion.baseId] = promotion.fromId;
    }
  }
  const reversedRetired = injectedVersionManifest.retiredHistoricalIds.filter((id: string) => !oldIds.has(id));
  return `${JSON.stringify({ schemaVersion: injectedVersionManifest.schemaVersion, historySourceCommit: injectedVersionManifest.historySourceCommit, activeIdByHistoricalId: reversedMap, retiredHistoricalIds: reversedRetired }, null, 2)}\n`;
}

export function assertHongKongResidual28ProvenanceGraph(
  artifacts: Record<string, unknown> = hongKongResidual28ProvenanceArtifacts,
  versionManifest?: unknown,
  repositoryRoot = process.cwd()
) {
  exactKeys(artifacts, ["sourceRecoveryReceipt", "semanticReaudit", "ledgerV2", "residualSnapshot", "repairContract", "promotionManifest"], "provenance artifact owners");
  const scan = scanHongKongResidual28Provenance(artifacts);
  for (const pair of scan.pairs) {
    assert.equal(
      fileSha(pair.path, `${pair.owner}:${pair.key}`, repositoryRoot),
      pair.sha256,
      `${pair.owner}:${pair.key}: referenced bytes drift`
    );
  }
  const reconstructionSources = scan.reconstructible.map((reconstruction) => {
    try {
      return readHongKongResidual28ReconstructionSource({
        repositoryRoot,
        sourcePostimagePath: reconstruction.sourcePostimagePath,
        sourcePostimageSha256: reconstruction.sourcePostimageSha256
      });
    } catch (error) {
      assert.fail(
        `${reconstruction.owner}:${reconstruction.key}: reconstruction source drift: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  });
  assert.equal(reconstructionSources.length, 2, "residual28 exact dual reconstruction source count drift");
  assert.equal(
    new Set(reconstructionSources.map(({ immutableSnapshotPath }) => immutableSnapshotPath)).size,
    1,
    "residual28 dual reconstruction pairs must resolve to one immutable f0c snapshot"
  );
  assert.ok(
    reconstructionSources.every(({ bytes }) => bytes.equals(reconstructionSources[0].bytes)),
    "residual28 dual reconstruction source bytes drift"
  );
  const boundVersionManifest = versionManifest ?? reconstructionSources[0].versionManifest;
  const reconstructedBytes = reconstructVersionManifest(
    artifacts.promotionManifest,
    boundVersionManifest as any
  );
  for (const [index, reconstruction] of scan.reconstructible.entries()) {
    assert.equal(
      sha256(reconstructionSources[index].bytes),
      reconstruction.sourcePostimageSha256,
      `${reconstruction.owner}:${reconstruction.key}: reconstruction source drift`
    );
    assert.equal(Buffer.byteLength(reconstructedBytes), reconstruction.byteLength, `${reconstruction.owner}:${reconstruction.key}: reconstruction byte length drift`);
    assert.equal(sha256(reconstructedBytes), reconstruction.sha256, `${reconstruction.owner}:${reconstruction.key}: reconstruction output drift`);
  }
  const reconstructedPairs = scan.reconstructible.map((value) => ({
    ...value,
    path: value.sourcePostimagePath,
    classification: "explicitly-reconstructible" as const
  }));
  const allPairs = [...scan.pairs, ...reconstructedPairs];
  assert.equal(allPairs.length, EXPECTED_PAIR_COUNT, "provenance pair occurrence count drift");
  assert.equal(sortedTupleHash(allPairs), EXPECTED_PAIR_TUPLE_SHA256, `provenance pair tuple drift; actual ${sortedTupleHash(allPairs)}`);
  assert.equal(scan.standalone.length, EXPECTED_STANDALONE_COUNT, "standalone digest count drift");
  assert.equal(sortedTupleHash(scan.standalone), EXPECTED_STANDALONE_TUPLE_SHA256, "standalone digest tuple drift");
  assert.equal(scan.nonAuthoritative.length, EXPECTED_NON_AUTHORITATIVE_COUNT, "non-authoritative coordinate count drift");
  assert.equal(sortedTupleHash(scan.nonAuthoritative), EXPECTED_NON_AUTHORITATIVE_TUPLE_SHA256, `historical-coordinate tuple drift; actual ${sortedTupleHash(scan.nonAuthoritative)}`);
  return { ...scan, pairs: allPairs };
}
