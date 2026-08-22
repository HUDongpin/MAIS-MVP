import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

import historicalSanitizedJson from "./authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json";
import historicalSupplementJson from "./authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json";
import {
  buildHongKongEaseExact3V4LineageCandidate,
  HK_EASE_EXACT3_V4_LINEAGE_AUTHORITY_PATH,
  HK_EASE_EXACT3_V4_LINEAGE_OUTPUT_PATHS,
  HK_EASE_EXACT3_V4_LINEAGE_REQUIRED_INPUT_BINDINGS,
  materializeHongKongEaseExact3V4LineageCandidate,
  serializeHongKongEaseExact3V4LineageCandidate
} from "./build-hk-ease-exact3-v4-lineage-candidate";

const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

type CandidateSanitizedRow = {
  baseId: string;
  prompt: {
    en: string;
    zh: string;
  };
};

type CandidateSupplementRow = {
  baseId: string;
};

type CandidateOracleRow = {
  baseId: string;
  activeId: string;
  productionComparison: {
    directProductionGraderAccepted: boolean;
    matched: boolean;
  };
};

const repositoryRoot = resolve(import.meta.dirname, "../..");
const configuredTmpRoot = process.env.TMPDIR;
assert.ok(
  typeof configuredTmpRoot === "string" && configuredTmpRoot.startsWith("/Volumes/Starship/"),
  "focused V4 lineage test requires a Starship-only TMPDIR"
);

test("exact3 V4 lineage candidate changes only the independently reviewed 1041 problem payload", async () => {
  const tempRoot = mkdtempSync(join(realpathSync(configuredTmpRoot), "hk-ease-exact3-v4-lineage-test."));
  const candidate = await buildHongKongEaseExact3V4LineageCandidate(repositoryRoot, tempRoot);

  assert.equal(candidate.schemaVersion, "hk-ease-exact3-v4-lineage-candidate-v1");
  assert.equal(candidate.status, "candidate-hold-not-live-promotion");
  assert.equal(candidate.sanitized.sourceSha256,
    "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf");
  assert.equal(candidate.sanitized.questionCount, 701);
  assert.equal(candidate.sanitized.rowsPayloadSha256,
    "ad5c83775f197de4a20c28054a3a9eac8c1624e24eee115ddf1b863fd4b4265c");

  const historicalSanitized = historicalSanitizedJson as typeof candidate.sanitized;
  const candidateSanitizedRows = candidate.sanitized.rows as CandidateSanitizedRow[];
  const historicalSanitizedRows = historicalSanitized.rows as unknown[];
  const sanitizedDiff = candidateSanitizedRows
    .map((row, index) => ({ row, index }))
    .filter(({ row, index }) => JSON.stringify(row) !== JSON.stringify(historicalSanitizedRows[index]));
  assert.deepEqual(
    sanitizedDiff.map(({ row, index }) => [index, row.baseId]),
    [[693, "hk-ease-1041"]]
  );
  assert.match(sanitizedDiff[0].row.prompt.en, /format “\(a\) No, Yes, No;/);
  assert.match(sanitizedDiff[0].row.prompt.zh, /「\(a\) 否、是、否；/);

  assert.equal(candidate.supplement.sourceSha256, sha256(candidate.serializedSanitized));
  assert.equal(sha256(candidate.serializedSupplement),
    "2eec0d9b7ce7adf06d9f50d1dfa30738df9a8d97481d09c0458ad9023eca181e");
  assert.equal(candidate.supplement.rowsPayloadSha256,
    "b68a5d7b2790c4d06bf127a11c97915e610be1e2c00cd554cfe98b5eebfbe7b6");
  assert.equal(candidate.supplement.questionCount, 701);
  assert.equal(candidate.supplement.rowSpecificDerivationCount, 701);
  assert.equal(candidate.supplement.multipleChoiceCount, 90);
  const historicalSupplement = historicalSupplementJson as typeof candidate.supplement;
  const candidateSupplementRows = candidate.supplement.rows as CandidateSupplementRow[];
  const historicalSupplementRows = historicalSupplement.rows as unknown[];
  const supplementDiff = candidateSupplementRows
    .map((row, index) => ({ row, index }))
    .filter(({ row, index }) => JSON.stringify(row) !== JSON.stringify(historicalSupplementRows[index]));
  assert.deepEqual(
    supplementDiff.map(({ row, index }) => [index, row.baseId]),
    [[693, "hk-ease-1041"]]
  );
  assert.equal(candidate.supplement.rows[693].computedResult.responseText,
    "(a) No, Yes, No; (b) Yes, Yes, Yes; (c) Yes, No, No; (d) Yes, Yes, Yes; (e) No, Yes, No; (f) Yes, Yes, Yes");
  assert.equal(candidate.supplement.rows[693].promptRequirements.explicitFormat,
    "(a) No, Yes, No; …; (f) …");
  assert.equal(candidate.supplement.rows[693].facts.length, 1);
  assert.equal(candidate.supplement.rows[693].facts[0].locator.source, "prompt.en");
  assert.equal(candidate.supplement.rows[693].facts[0].locator.start, 0);
  assert.equal(
    candidate.supplement.rows[693].facts[0].locator.end,
    candidate.sanitized.rows[693].prompt.en.length
  );
  assert.deepEqual(
    candidate.supplement.rows[693].computedResult.semanticValue.booleanMatrix,
    [
      [false, true, false],
      [true, true, true],
      [true, false, false],
      [true, true, true],
      [false, true, false],
      [true, true, true]
    ]
  );

  assert.equal(candidate.oracle.questionCount, 701);
  assert.equal(candidate.oracle.rowSpecificDerivationCount, 701);
  assert.equal(sha256(candidate.serializedOracle),
    "236b6bf6342a9524869b2cff5562a35ef74efd9712456054f326f4e6b9a16844");
  assert.equal(candidate.oracle.rowsPayloadSha256,
    "6b8999e4a92c519a774ea6888a5655c5fd26e7b0bc496d5b5de275d2ba26d19b");
  assert.equal(candidate.oracle.directProductionGraderMatchCount, 651);
  assert.equal(candidate.oracle.structuredSemanticMatchCount, 50);
  assert.deepEqual(candidate.oracle.unresolvedIds, []);
  const oracleRows = candidate.oracle.rows as CandidateOracleRow[];
  for (const [baseId, activeId] of [
    ["hk-ease-10481", "hk-ease-10481-v3"],
    ["hk-ease-10496", "hk-ease-10496-v3"],
    ["hk-ease-1041", "hk-ease-1041-v3"]
  ]) {
    const row = oracleRows.find((entry) => entry.baseId === baseId);
    assert.ok(row, `${baseId}: missing exact3 V4 row`);
    assert.equal(row.activeId, activeId);
    assert.equal(row.productionComparison.directProductionGraderAccepted, true);
    assert.equal(row.productionComparison.matched, true);
  }

  const serialized = await serializeHongKongEaseExact3V4LineageCandidate(candidate, repositoryRoot);
  assert.deepEqual(
    Object.keys(serialized).sort(),
    [...HK_EASE_EXACT3_V4_LINEAGE_OUTPUT_PATHS, HK_EASE_EXACT3_V4_LINEAGE_AUTHORITY_PATH].sort()
  );
  assert.equal(serialized[HK_EASE_EXACT3_V4_LINEAGE_OUTPUT_PATHS[0]], candidate.serializedSanitized);
  const v4TestPostimagePath = HK_EASE_EXACT3_V4_LINEAGE_OUTPUT_PATHS.find((path) =>
    path.endsWith("lib-hongKongEaseIndependentOracleV4.test.ts.snapshot")
  );
  assert.ok(v4TestPostimagePath);
  assert.equal(
    sha256(serialized[v4TestPostimagePath]),
    "459c89f15d073f50927b21605be093543e6e64ffede351734c23f1188251285a"
  );
});

test("exact3 V4 lineage candidate is deterministic, immutable, and rejects non-Starship mutable roots", async () => {
  await assert.rejects(
    () => buildHongKongEaseExact3V4LineageCandidate(repositoryRoot, "/tmp"),
    /PHASE2B4_TMPDIR_OUTSIDE_STARSHIP/
  );

  const firstTemp = mkdtempSync(join(realpathSync(configuredTmpRoot), "hk-ease-exact3-v4-first."));
  const secondTemp = mkdtempSync(join(realpathSync(configuredTmpRoot), "hk-ease-exact3-v4-second."));
  const first = await buildHongKongEaseExact3V4LineageCandidate(repositoryRoot, firstTemp);
  const second = await buildHongKongEaseExact3V4LineageCandidate(repositoryRoot, secondTemp);
  assert.equal(first.serializedSanitized, second.serializedSanitized);
  assert.equal(first.serializedSupplement, second.serializedSupplement);
  assert.equal(first.serializedOracle, second.serializedOracle);

  const materialized = await materializeHongKongEaseExact3V4LineageCandidate(repositoryRoot, firstTemp);
  for (const [relativePath, expectedBytes] of Object.entries(materialized)) {
    const absolutePath = resolve(repositoryRoot, relativePath);
    const stat = lstatSync(absolutePath);
    assert.equal(stat.isFile(), true, `${relativePath}: expected a regular file`);
    assert.equal(stat.isSymbolicLink(), false, `${relativePath}: symlink forbidden`);
    assert.equal(stat.mode & 0o777, 0o444, `${relativePath}: expected immutable mode 0444`);
    assert.equal(readFileSync(absolutePath, "utf8"), expectedBytes);
  }
});

test("exact3 V4 lineage candidate is closed over every pinned physical input and rejects each byte drift", async () => {
  const fakeRepositoryRoot = mkdtempSync(
    join(realpathSync(configuredTmpRoot), "hk-ease-exact3-v4-inputs.")
  );
  const generationTmpRoot = mkdtempSync(
    join(realpathSync(configuredTmpRoot), "hk-ease-exact3-v4-input-generation.")
  );

  assert.ok(HK_EASE_EXACT3_V4_LINEAGE_REQUIRED_INPUT_BINDINGS.length >= 20);
  for (const binding of HK_EASE_EXACT3_V4_LINEAGE_REQUIRED_INPUT_BINDINGS) {
    const sourcePath = resolve(repositoryRoot, binding.path);
    const targetPath = resolve(fakeRepositoryRoot, binding.path);
    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(sourcePath, targetPath);
    chmodSync(targetPath, 0o600);
    assert.equal(sha256(readFileSync(targetPath)), binding.sha256, binding.path);
  }

  const closureCandidate = await buildHongKongEaseExact3V4LineageCandidate(
    fakeRepositoryRoot,
    generationTmpRoot
  );
  assert.equal(sha256(closureCandidate.serializedOracle),
    "236b6bf6342a9524869b2cff5562a35ef74efd9712456054f326f4e6b9a16844");

  let mutationCount = 0;
  for (const binding of HK_EASE_EXACT3_V4_LINEAGE_REQUIRED_INPUT_BINDINGS) {
    const targetPath = resolve(fakeRepositoryRoot, binding.path);
    const originalBytes = readFileSync(targetPath);
    writeFileSync(targetPath, Buffer.concat([originalBytes, Buffer.from(" ", "utf8")]));
    await assert.rejects(
      () => buildHongKongEaseExact3V4LineageCandidate(fakeRepositoryRoot, generationTmpRoot),
      /PHASE2B4_PINNED_INPUT_DRIFT/,
      `${binding.path}: byte drift must fail closed`
    );
    writeFileSync(targetPath, originalBytes);
    mutationCount += 1;
  }
  assert.equal(mutationCount, HK_EASE_EXACT3_V4_LINEAGE_REQUIRED_INPUT_BINDINGS.length);
});
