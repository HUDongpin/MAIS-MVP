import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  visualizationLabCatalog,
  type FeaturedLabDefinition
} from "../../data/visualizationLabs";
import { resolveConfiguredVisualizationCompositeStrands } from "./configuredVisualizationCompositeStrands";
import { resolveConfiguredVisualizationSemanticModel } from "./configuredVisualizationSemanticModel";

type OracleStrand = {
  family: string;
  variant: string;
  visibleLabelCapability: string;
};

type OracleDisposition =
  | { kind: "direct"; family: string; variant: string }
  | {
      kind: "composite";
      resolverFamily: "catalog-scope" | "composite-split";
      strands: OracleStrand[];
    };

type OracleEntry = {
  auditStatus: "pass" | "repair-required";
  disposition: OracleDisposition;
  focusPolicy: "exact" | "narrow-before-live" | "omit";
  forbiddenModes: string[];
  labId: string;
  normalizedPromiseSha256: string;
  rationale: string;
  requiredInvariantIds: string[];
  requiredModes: string[];
};

type OracleArtifact = {
  schemaVersion: string;
  hashContract: {
    algorithm: string;
    normalization: string;
    serialization: string;
    promiseProjection: string;
  };
  catalogCount: number;
  catalogIdsSha256: string;
  promiseSetSha256: string;
  reviewerProvenance: {
    auditDate: string;
    auditScope: string;
    evidenceBoundary: string;
    expectedSideRuntimeImports: string[];
    productionPlannerImportedByGenerator: boolean;
    productionResolverImportedByGenerator: boolean;
    promisePolicy: string;
    reviewerRole: string;
    statusCounts: Record<string, number>;
  };
  entries: OracleEntry[];
};

type OracleDeltaExpectedEntry = Omit<OracleEntry, "labId" | "rationale"> & {
  rationale?: string;
};

type OracleDeltaArtifact = {
  schemaVersion: string;
  decision: string;
  counts: {
    catalog: number;
    frozenPass: number;
    frozenRepairRequired: number;
    promiseMismatches: number;
    routeMismatches: number;
    changedUnion: number;
    approvedChanged: number;
    remainingChangedRed: number;
    untouchedRed: number;
    candidatePassIfApplied: number;
    candidateRepairRequiredIfApplied: number;
  };
  narrowPromiseDecision: {
    entryCount: number;
    expectedAuditStatus: "pass";
    expectedFocusPolicy: "exact";
    entries: Array<{
      labId: string;
      expectedNormalizedPromiseSha256: string;
    }>;
  };
  routeDecisions: Array<{
    labId: string;
    from: OracleDeltaExpectedEntry;
    expected: OracleDeltaExpectedEntry;
  }>;
  approvedChangedLabIds: string[];
  remainingChangedRedLabIds: string[];
  untouchedRedLabIds: string[];
};

const mainlandTracks = new Set<FeaturedLabDefinition["curriculumTrack"]>([
  "MAINLAND_PEP_PRIMARY",
  "MAINLAND_PEP_JUNIOR",
  "MAINLAND_PEP_HIGH",
  "MAINLAND_BNU",
  "MAINLAND_HJB"
]);

const frozenOraclePath = path.join(
  process.cwd(),
  "coordination/content-qa/mainland-visualization-semantic-oracle.v1.json"
);
const oracleDeltaPath = path.join(
  process.cwd(),
  "coordination/content-qa/2026-08-10-A18-mainland-visualization-semantic-oracle-delta-candidate.v1.json"
);
const frozenOracleSource = readFileSync(frozenOraclePath, "utf8");
const oracleDeltaSource = readFileSync(oracleDeltaPath, "utf8");
const frozenOracle = JSON.parse(frozenOracleSource) as OracleArtifact;
const oracleDelta = JSON.parse(oracleDeltaSource) as OracleDeltaArtifact;
const effectiveEntryById = new Map(
  frozenOracle.entries.map((entry) => [entry.labId, structuredClone(entry)])
);

for (const decision of oracleDelta.narrowPromiseDecision.entries) {
  const frozen = effectiveEntryById.get(decision.labId);
  if (!frozen) throw new Error(`Oracle delta references unknown narrowed Lab ${decision.labId}.`);
  effectiveEntryById.set(decision.labId, {
    ...frozen,
    auditStatus: oracleDelta.narrowPromiseDecision.expectedAuditStatus,
    focusPolicy: oracleDelta.narrowPromiseDecision.expectedFocusPolicy,
    normalizedPromiseSha256: decision.expectedNormalizedPromiseSha256,
    rationale: ""
  });
}

for (const decision of oracleDelta.routeDecisions) {
  const frozen = effectiveEntryById.get(decision.labId);
  if (!frozen) throw new Error(`Oracle delta references unknown routed Lab ${decision.labId}.`);
  effectiveEntryById.set(decision.labId, {
    ...frozen,
    ...decision.expected,
    labId: decision.labId,
    requiredInvariantIds: [...decision.expected.requiredInvariantIds].sort(),
    rationale: decision.expected.auditStatus === "pass"
      ? ""
      : decision.expected.rationale ?? frozen.rationale
  });
}

const effectiveEntries = frozenOracle.entries.map((entry) => {
  const effective = effectiveEntryById.get(entry.labId);
  if (!effective) throw new Error(`Oracle delta lost Lab ${entry.labId}.`);
  return effective;
});
const oracle: OracleArtifact = {
  ...frozenOracle,
  promiseSetSha256: "1b00afdb28b2e1c8c23f4d819c30b05c0af8c52eb5b46fd95eb8fa1495fa3dce",
  reviewerProvenance: {
    ...frozenOracle.reviewerProvenance,
    statusCounts: {
      "pass:exact": 270,
      "repair-required:exact": 64,
      "repair-required:omit": 1
    }
  },
  entries: effectiveEntries
};
const mainlandLabs = visualizationLabCatalog
  .filter((lab) => mainlandTracks.has(lab.curriculumTrack))
  .slice()
  .sort((left, right) => left.labId < right.labId ? -1 : left.labId > right.labId ? 1 : 0);
const oracleById = new Map(oracle.entries.map((entry) => [entry.labId, entry]));

function normalize(value: unknown): string {
  return String(value ?? "").normalize("NFKC").replace(/\s+/gu, " ").trim();
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function localizedProjection(value: { en?: string; zh?: string; zhHans?: string } | undefined) {
  return {
    en: normalize(value?.en),
    zh: normalize(value?.zh),
    zhHans: normalize(value?.zhHans)
  };
}

function promiseHash(lab: FeaturedLabDefinition): string {
  const strands = resolveConfiguredVisualizationCompositeStrands(lab);
  return sha256(stableJson({
    focus: localizedProjection(lab.templateConfig.focus),
    formula: localizedProjection(lab.templateConfig.formula),
    orderedVisibleCompositeLabels: strands?.map(({ label }) => normalize(label.en)) ?? [],
    title: localizedProjection(lab.title)
  }));
}

function countBy(values: readonly string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

test("frozen Mainland oracle and reviewed A18 delta form one exact successor view", () => {
  assert.equal(
    createHash("sha256").update(frozenOracleSource).digest("hex"),
    "3ba1a22a40afed2cd4c6a315f88921df5ae179f3901bd9f17d4287672023abee"
  );
  assert.equal(
    createHash("sha256").update(oracleDeltaSource).digest("hex"),
    "6adf678d75461bf5852cec7b54429a73a751b4ba54ed7ab1a222b467eee031ca"
  );
  assert.equal(oracleDelta.schemaVersion, "mainland-visualization-semantic-oracle-delta-candidate.v1");
  assert.equal(oracleDelta.decision, "approved-for-integration-review");
  assert.deepEqual(oracleDelta.counts, {
    catalog: 335,
    frozenPass: 160,
    frozenRepairRequired: 175,
    promiseMismatches: 109,
    routeMismatches: 6,
    changedUnion: 114,
    approvedChanged: 110,
    remainingChangedRed: 4,
    untouchedRed: 61,
    candidatePassIfApplied: 270,
    candidateRepairRequiredIfApplied: 65
  });
  assert.equal(oracleDelta.narrowPromiseDecision.entryCount, 108);
  assert.equal(oracleDelta.routeDecisions.length, 6);
  assert.equal(new Set(oracleDelta.approvedChangedLabIds).size, 110);
  assert.equal(new Set(oracleDelta.remainingChangedRedLabIds).size, 4);
  assert.equal(new Set(oracleDelta.untouchedRedLabIds).size, 61);
  assert.equal(
    oracleDelta.approvedChangedLabIds.some((labId) =>
      oracleDelta.remainingChangedRedLabIds.includes(labId) ||
      oracleDelta.untouchedRedLabIds.includes(labId)
    ),
    false
  );

  for (const decision of oracleDelta.narrowPromiseDecision.entries) {
    const frozen = frozenOracle.entries.find((entry) => entry.labId === decision.labId);
    assert.ok(frozen, decision.labId);
    assert.equal(frozen.auditStatus, "repair-required", decision.labId);
    assert.equal(frozen.focusPolicy, "narrow-before-live", decision.labId);
  }
  for (const decision of oracleDelta.routeDecisions) {
    const frozen = frozenOracle.entries.find((entry) => entry.labId === decision.labId);
    assert.ok(frozen, decision.labId);
    assert.deepEqual(
      {
        auditStatus: frozen.auditStatus,
        disposition: frozen.disposition,
        focusPolicy: frozen.focusPolicy,
        forbiddenModes: frozen.forbiddenModes,
        normalizedPromiseSha256: frozen.normalizedPromiseSha256,
        requiredInvariantIds: frozen.requiredInvariantIds,
        requiredModes: frozen.requiredModes
      },
      decision.from,
      decision.labId
    );
  }

  assert.equal(oracle.schemaVersion, "mainland-visualization-semantic-oracle.v1");
  assert.deepEqual(oracle.hashContract, {
    algorithm: "sha256",
    normalization: "NFKC + Unicode whitespace collapse + trim",
    serialization: "recursive lexicographic-key stable JSON",
    promiseProjection: "localized title + localized focus + localized formula + ordered English visible composite labels"
  });
  assert.equal(oracle.catalogCount, 335);
  assert.match(oracle.catalogIdsSha256, /^[a-f0-9]{64}$/u);
  assert.match(oracle.promiseSetSha256, /^[a-f0-9]{64}$/u);
  assert.equal(oracle.reviewerProvenance.productionResolverImportedByGenerator, false);
  assert.equal(oracle.reviewerProvenance.productionPlannerImportedByGenerator, false);
  assert.deepEqual(oracle.reviewerProvenance.expectedSideRuntimeImports, [
    "data/visualizationLabs.ts catalog only"
  ]);
  assert.match(oracle.reviewerProvenance.evidenceBoundary, /no browser claims/u);
  assert.match(oracle.reviewerProvenance.promisePolicy, /specialized-title core mathematics cannot be narrowed away/u);

  const expectedKeys = [
    "auditStatus",
    "disposition",
    "focusPolicy",
    "forbiddenModes",
    "labId",
    "normalizedPromiseSha256",
    "rationale",
    "requiredInvariantIds",
    "requiredModes"
  ];
  for (const entry of oracle.entries) {
    assert.deepEqual(Object.keys(entry).sort(), expectedKeys, entry.labId);
    assert.match(entry.labId, /\S/u);
    assert.match(entry.normalizedPromiseSha256, /^[a-f0-9]{64}$/u, entry.labId);
    assert.ok(["pass", "repair-required"].includes(entry.auditStatus), entry.labId);
    assert.ok(["exact", "narrow-before-live", "omit"].includes(entry.focusPolicy), entry.labId);
    assert.ok(entry.requiredModes.length > 0, `${entry.labId}: requiredModes must not be empty`);
    assert.ok(entry.requiredInvariantIds.length > 0, `${entry.labId}: requiredInvariantIds must not be empty`);
    assert.equal(new Set(entry.requiredModes).size, entry.requiredModes.length, `${entry.labId}: duplicate required mode`);
    assert.equal(new Set(entry.forbiddenModes).size, entry.forbiddenModes.length, `${entry.labId}: duplicate forbidden mode`);
    assert.equal(
      entry.requiredModes.some((mode) => entry.forbiddenModes.includes(mode)),
      false,
      `${entry.labId}: required and forbidden modes overlap`
    );
    assert.equal(
      entry.requiredInvariantIds.every((invariant) => normalize(invariant).length > 0),
      true,
      `${entry.labId}: blank invariant id`
    );
    if (entry.auditStatus === "pass") {
      assert.equal(entry.focusPolicy, "exact", `${entry.labId}: release-approved entries must have exact focus`);
      assert.equal(entry.rationale, "", `${entry.labId}: pass rationale must be empty`);
    } else {
      assert.ok(normalize(entry.rationale).length > 0, `${entry.labId}: non-pass rationale is required`);
    }

    if (entry.disposition.kind === "direct") {
      assert.match(entry.disposition.family, /\S/u, entry.labId);
      assert.match(entry.disposition.variant, /\S/u, entry.labId);
    } else {
      assert.ok(["catalog-scope", "composite-split"].includes(entry.disposition.resolverFamily), entry.labId);
      assert.ok(entry.disposition.strands.length >= 1 && entry.disposition.strands.length <= 4, entry.labId);
      for (const strand of entry.disposition.strands) {
        assert.match(strand.family, /\S/u, entry.labId);
        assert.match(strand.variant, /\S/u, entry.labId);
        assert.match(strand.visibleLabelCapability, /\S/u, entry.labId);
      }
    }
  }

  assert.deepEqual(
    oracle.reviewerProvenance.statusCounts,
    countBy(oracle.entries.map((entry) => `${entry.auditStatus}:${entry.focusPolicy}`))
  );
});

test("oracle identity is exactly the sorted final 335-lab Mainland catalog", () => {
  const catalogIds = mainlandLabs.map(({ labId }) => labId);
  const oracleIds = oracle.entries.map(({ labId }) => labId);
  assert.equal(mainlandLabs.length, 335);
  assert.equal(new Set(catalogIds).size, 335);
  assert.equal(oracle.entries.length, 335);
  assert.equal(oracleById.size, 335);
  assert.deepEqual(oracleIds, catalogIds);
  assert.equal(sha256(stableJson(catalogIds)), oracle.catalogIdsSha256);
  assert.equal(oracle.catalogIdsSha256, "328b42b504da962863ff8da50b7dc03095e5ccf35f7e20efe8c3b8f979d23f0b");
});

test("every promise hash is computed from live title, focus, formula, and ordered visible composite labels", () => {
  for (const lab of mainlandLabs) {
    const expected = oracleById.get(lab.labId);
    assert.ok(expected, lab.labId);
    assert.equal(promiseHash(lab), expected.normalizedPromiseSha256, lab.labId);
  }
  const actualPromiseSetSha256 = sha256(stableJson(
    oracle.entries.map(({ labId, normalizedPromiseSha256 }) => ({ labId, normalizedPromiseSha256 }))
  ));
  assert.equal(actualPromiseSetSha256, oracle.promiseSetSha256);
  assert.equal(oracle.promiseSetSha256, "1b00afdb28b2e1c8c23f4d819c30b05c0af8c52eb5b46fd95eb8fa1495fa3dce");
});

test("production routing is compared one-way against the frozen independent disposition", () => {
  const productionFamilyCounts: Record<string, number> = {};
  let directCount = 0;
  let compositeCount = 0;

  for (const lab of mainlandLabs) {
    const expected = oracleById.get(lab.labId);
    assert.ok(expected, lab.labId);
    const actual = resolveConfiguredVisualizationSemanticModel(lab);
    const actualStrands = resolveConfiguredVisualizationCompositeStrands(lab);
    productionFamilyCounts[actual.semanticFamily] = (productionFamilyCounts[actual.semanticFamily] ?? 0) + 1;

    if (expected.disposition.kind === "direct") {
      directCount += 1;
      assert.equal(actualStrands, null, `${lab.labId}: unexpected production composite plan`);
      assert.deepEqual(
        [actual.semanticFamily, actual.variant],
        [expected.disposition.family, expected.disposition.variant],
        lab.labId
      );
      continue;
    }

    compositeCount += 1;
    assert.equal(actual.semanticFamily, expected.disposition.resolverFamily, lab.labId);
    assert.ok(actualStrands, `${lab.labId}: missing production composite plan`);
    assert.deepEqual(
      actualStrands.map(({ family, variant, label }) => ({
        family,
        variant,
        visibleLabelCapability: normalize(label.en)
      })),
      expected.disposition.strands,
      lab.labId
    );
  }

  assert.equal(directCount, 298);
  assert.equal(compositeCount, 37);
  assert.equal(Object.keys(productionFamilyCounts).length, 74);
  assert.equal(productionFamilyCounts["symbolic-equation"], 6);
  assert.equal(productionFamilyCounts["inequality-solver"], 3);
  assert.equal(productionFamilyCounts["composite-split"], 32);
  assert.equal(productionFamilyCounts["catalog-scope"], 5);
});

test("oracle mode and invariant fields remain deterministic, explicit, and language independent", () => {
  for (const entry of oracle.entries) {
    assert.deepEqual(entry.requiredInvariantIds, [...entry.requiredInvariantIds].sort(), entry.labId);
    assert.equal(
      entry.requiredModes.every((mode) => !/[\u3400-\u9fff]/u.test(mode)),
      true,
      `${entry.labId}: required mode IDs must be language independent`
    );
    assert.equal(
      entry.forbiddenModes.every((mode) => !/[\u3400-\u9fff]/u.test(mode)),
      true,
      `${entry.labId}: forbidden mode IDs must be language independent`
    );
  }
});

test("all 335 oracle entries are release-approved", () => {
  const blocked = oracle.entries.filter(
    (entry) => entry.auditStatus !== "pass" || entry.focusPolicy !== "exact"
  );
  assert.deepEqual(
    blocked.map(({ labId, auditStatus, focusPolicy, rationale }) => ({
      labId,
      auditStatus,
      focusPolicy,
      rationale
    })),
    [],
    `${blocked.length} Mainland Visualization Labs still require semantic repair, explicit focus narrowing, or omission.`
  );
});
