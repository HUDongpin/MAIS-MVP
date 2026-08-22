import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import * as sourcePlanManifest from "./hk-visualization-dependent-transition-plan-manifest.mjs";
import {
  buildHkVisualizationDependentTransitionSequencePlans,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_LIVE_DESCRIPTORS,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_PHASE_IDS,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_IDS,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_SCHEMA_VERSION,
} from "./hk-visualization-range-state-ledger";
import { sha256HkVisualizationCanonical } from "./hk-visualization-state-chunk-contract";

type BuilderArgs = Parameters<typeof buildHkVisualizationDependentTransitionSequencePlans>[0];
type SequenceId = keyof typeof HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_LIVE_DESCRIPTORS;
type SequencePlan = ReturnType<typeof buildHkVisualizationDependentTransitionSequencePlans>[number];

const {
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLANS,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_BY_SEQUENCE_ID,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_MANIFEST_VERSION,
} = sourcePlanManifest;

const EXPECTED_SOURCE_PLAN_KEYS = Object.freeze([
  "companionAuthority", "domainId", "labId", "modeId", "modePreparation", "planHash",
  "projectionMatrixHash", "schemaVersion", "sequenceId",
  "visibleMathProjectionTopologies",
] as const);
const EXPECTED_COMPANION_AUTHORITY_KEYS = Object.freeze([
  "authorityHash", "geometryPolicy", "phases", "restoration",
] as const);
const EXPECTED_GEOMETRY_POLICY_KEYS = Object.freeze([
  "minimumUserEpsilon", "pixelEpsilon", "policyHash", "version",
] as const);
const EXPECTED_PHASE_AUTHORITY_KEYS = Object.freeze([
  "controls", "controlsHash", "phase", "publicStateHash",
  "rawSerializedPublicState", "resetCountSincePreviousPhase",
  "stateSignature", "stateSignatureHash", "visibleElementAuthorities",
  "visibleElementAuthoritiesHash",
] as const);
const EXPECTED_RESTORATION_AUTHORITY_KEYS = Object.freeze([
  "controls", "controlsHash", "publicStateHash", "rawSerializedPublicState",
  "resetClickCount", "stateSignature", "stateSignatureHash",
  "visibleElementAuthorities", "visibleElementAuthoritiesHash",
] as const);
const EXPECTED_TOPOLOGY_KEYS = Object.freeze([
  "ancestryScaleSummaries", "ancestryScaleSummariesHash", "elementCounts",
  "elementCountsHash", "projectionCount", "projectionHashes",
  "projectionHashesHash", "topologyHash", "totalElementCount",
] as const);
const PROJECTION_SOURCES = Object.freeze([
  "canonical-visible-baseline", "phase:pre", "phase:clamp", "phase:expand",
  "post-sequence-restoration",
] as const);

// Exact-11 authority is deliberately test-owned; it is not copied from the
// manifest, registry, DOM, or adapter output.
const EXPECTED_PLAN_AND_MATRIX_HASHES = Object.freeze([
  { planHash: "b12d3245afe5e79b3e3426419aa719e767747999cabcb0e3a1c37af701258c0c", projectionMatrixHash: "368807cf1624e0dc564973eac3fc51289053157cac07b884e2e284ca7444016a", sequenceId: "p1-number-bond-known-part" },
  { planHash: "1f07174a62071dc22c85d6582cb0787dd44bae2fdd47a38bb0376a6cb5725dc3", projectionMatrixHash: "7d499cfc70d9b14bc421dd8ba09a243ef8189b7e52a32b7a77ac82f6d6e86f02", sequenceId: "p1-add-step" },
  { planHash: "2ea5b297fcf9fbc9c64fd4b678f4df0e7c8f1e02c11e07760bc1972fa687e773", projectionMatrixHash: "a03713d0de73713cfd615d28c2002bfbf8cf2e1823dff6f367cabacef95e9004", sequenceId: "p1-subtract-step" },
  { planHash: "ddc4060cff1b4da5e3eb7ee7cf40f4f4bd24e34916ea557fd1c94ad235e2c98e", projectionMatrixHash: "17fd537f5cb8bc47ce9676f436d179ceea3d8371abd57f91ee05622b3015c065", sequenceId: "p2-payment-at-least-price" },
  { planHash: "9daebc0fdeeeec65e28354b257e15f7fbfa095badf89d2851cb8b9cb726749f3", projectionMatrixHash: "de8f2df23b43a0ab5e494537fd7564bd4dac2ba5d137ac1cfc9e2f1eab453bca", sequenceId: "p4-divisor-within-number" },
  { planHash: "fa70f6ce7dd0a7bb14beee031d9945e8d19c87572b402508e4bc8422ce129bc8", projectionMatrixHash: "5f8f55841de2f31f11f0e44a51d6ecd164b7ec53498e883170e29ead753b2bbf", sequenceId: "p5-first-proper-fraction" },
  { planHash: "928a266ad54c4e3a1c660633dea9ec85c946526bb2dfc4bc54c02ff75ffc78e1", projectionMatrixHash: "9c7abb27bf5ea1a482af9cc09fa0d4a71a27345147f76850b0dfa3c33247f04e", sequenceId: "p5-second-proper-fraction" },
  { planHash: "be10a24e1c0eb230b20089d971a24a73200fe59e60e74e681d7d1bf962e1ab8a", projectionMatrixHash: "a5eacee94cc13cdd7b7de97b54fa147ccb00bf5920366d667e5247ebbdfcc6b9", sequenceId: "p5-third-proper-fraction" },
  { planHash: "b8793eaf075866f29427ab50aaff81675481fb9c31561c822548e3d6763c6dc6", projectionMatrixHash: "67fe8c2620418cb0a6ae5834a272806dfe5cc5338dea7690e813c7f08d03ff11", sequenceId: "p5-visible-volume-layers" },
  { planHash: "b9bf7afec7d74c13f4ce123d44d72e04011543aff85de9071ac08fa2e68344dd", projectionMatrixHash: "6f72cb7416c19e55c57e8d95c9d828ba745310c57edfa54be7b2c2437437cecd", sequenceId: "s3-identity-a-projects-b" },
  { planHash: "556659194fcd9528b4802160b1c2b49cb8a63e25e78187a30e23f6c9c8e6ab49", projectionMatrixHash: "503775812b79a7d1fef460717c1bdde12cadb29adc8a14a051833b58db81b3d0", sequenceId: "s3-identity-b-projects-a" },
] as const);

function projectionTopologies(plan: SequencePlan) {
  return Object.fromEntries(
    (["en", "zh", "zh-Hans"] as const).map((language) => [language,
      Object.fromEntries((["dark", "light"] as const).map((theme) => {
        const restoration = plan.postSequenceRestoration.visibleMathProjectionContract;
        const contracts = [
          restoration,
          ...plan.phases.map(({ visibleMathProjectionContract }) => visibleMathProjectionContract),
          restoration,
        ];
        const projections = contracts.map((contract, index) => ({
          ancestryScaleSummary: contract.expectedAncestryScaleSummaries[language][theme],
          elementCount: contract.elementCount,
          hash: contract.expectedHashes[language][theme],
          source: PROJECTION_SOURCES[index],
        }));
        const summaries = projections.map(({ ancestryScaleSummary }) => ancestryScaleSummary);
        const elementCounts = projections.map(({ elementCount }) => elementCount);
        const hashes = projections.map(({ hash }) => hash);
        return [theme, {
          ancestryScaleSummaries: summaries,
          ancestryScaleSummariesHash: sha256HkVisualizationCanonical({
            contractVersion: plan.schemaVersion,
            kind: "dependent-transition-visible-math-ancestry-scale-summaries",
            sequenceId: plan.sequenceId,
            summaries,
          }),
          elementCounts,
          elementCountsHash: sha256HkVisualizationCanonical({
            contractVersion: plan.schemaVersion,
            elementCounts,
            kind: "dependent-transition-visible-math-element-counts",
            sequenceId: plan.sequenceId,
          }),
          projectionCount: projections.length,
          projectionHashes: hashes,
          projectionHashesHash: sha256HkVisualizationCanonical({
            contractVersion: plan.schemaVersion,
            hashes,
            kind: "dependent-transition-visible-math-projection-hashes",
            sequenceId: plan.sequenceId,
          }),
          topologyHash: sha256HkVisualizationCanonical({
            contractVersion: plan.schemaVersion,
            kind: "dependent-transition-visible-math-projection-topology",
            projections,
            sequenceId: plan.sequenceId,
          }),
          totalElementCount: elementCounts.reduce((sum, value) => sum + value, 0),
        }];
      })),
    ]),
  );
}

function compactProjectionTopologies(topologies: any) {
  return Object.fromEntries(
    ["en", "zh", "zh-Hans"].map((language) => [language,
      Object.fromEntries(["dark", "light"].map((theme) => {
        const {
          ancestryScaleSummariesHash,
          elementCountsHash,
          projectionCount,
          projectionHashesHash,
          topologyHash,
          totalElementCount,
        } = topologies[language][theme];
        return [theme, {
          ancestryScaleSummariesHash,
          elementCountsHash,
          projectionCount,
          projectionHashesHash,
          topologyHash,
          totalElementCount,
        }];
      })),
    ]),
  );
}

function expectedVisibleElementAuthorities(stage: any) {
  const topology: { vizName: string; occurrence: number }[] = [];
  const seen = new Set<string>();
  for (const binding of stage.visibleBindings) {
    const key = `${binding.vizName}\u0000${binding.occurrence}`;
    if (!seen.has(key)) {
      seen.add(key);
      topology.push({ vizName: binding.vizName, occurrence: binding.occurrence });
    }
  }
  return Object.fromEntries((['en', 'zh', 'zh-Hans'] as const).map((language) => [
    language,
    topology.map(({ vizName, occurrence }) => {
      const bindings = stage.visibleBindings.filter(
        (binding: any) => binding.vizName === vizName && binding.occurrence === occurrence,
      );
      const tagName = bindings.find((binding: any) => binding.attribute === '__tag')?.expectedValue;
      const math = stage.visibleMathContracts.find(
        (contract: any) => contract.vizName === vizName && contract.occurrence === occurrence,
      );
      const text = stage.visibleTextContracts.find(
        (contract: any) => contract.vizName === vizName && contract.occurrence === occurrence,
      );
      assert.ok(tagName && math && text, `${vizName}/${occurrence}`);
      return {
        attributes: [
          ['data-viz-name', vizName],
          ...bindings.filter((binding: any) => !binding.attribute.startsWith('__'))
            .map((binding: any) => [binding.attribute, binding.expectedValue]),
        ].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0),
        learnerVisible: true,
        paintedSubtree: {
          elementCount: math.elementCount,
          hash: math.expectedHashes[language],
        },
        tagName,
        textHash: createHash('sha256').update(
          text.expectedTexts[language].normalize('NFC').replace(/\s+/g, ' ').trim(),
        ).digest('hex'),
      };
    }),
  ]));
}

function expectedCompanionAuthority(plan: SequencePlan) {
  const geometryPolicy = {
    minimumUserEpsilon: 0.05,
    pixelEpsilon: 0.75,
    policyHash: sha256HkVisualizationCanonical({
      contractVersion: plan.schemaVersion,
      kind: "dependent-transition-companion-geometry-policy",
      minimumUserEpsilon: 0.05,
      pixelEpsilon: 0.75,
      version: "hk-viz-dependent-transition-geometry-policy.v1",
    }),
    version: "hk-viz-dependent-transition-geometry-policy.v1",
  };
  const stageAuthority = (
    stage: any,
    stageId: string,
    resetField: Record<string, number>,
  ) => {
    const controls = stage.expectedValues.map((value: any, index: number) => ({
      controlId: value.controlId,
      descriptor: stage.expectedDescriptors[index],
      value: value.value,
    }));
    const rawSerializedPublicState = JSON.stringify(Object.fromEntries(
      stage.expectedPublicState.map(({ key, value }: any) => [key, value]),
    ));
    const visibleElementAuthorities = expectedVisibleElementAuthorities(stage);
    return {
      controls,
      controlsHash: sha256HkVisualizationCanonical({
        contractVersion: plan.schemaVersion,
        controls,
        kind: 'dependent-transition-companion-controls',
        sequenceId: plan.sequenceId,
        stageId,
      }),
      ...(stage.phase ? { phase: stage.phase } : {}),
      publicStateHash: sha256HkVisualizationCanonical({
        contractVersion: plan.schemaVersion,
        kind: 'dependent-transition-companion-public-state',
        rawSerializedPublicState,
        sequenceId: plan.sequenceId,
        stageId,
      }),
      rawSerializedPublicState,
      ...resetField,
      stateSignature: stage.expectedStateSignature,
      stateSignatureHash: sha256HkVisualizationCanonical({
        contractVersion: plan.schemaVersion,
        kind: 'dependent-transition-companion-state-signature',
        sequenceId: plan.sequenceId,
        stageId,
        stateSignature: stage.expectedStateSignature,
      }),
      visibleElementAuthorities,
      visibleElementAuthoritiesHash: sha256HkVisualizationCanonical({
        authorities: visibleElementAuthorities,
        contractVersion: plan.schemaVersion,
        kind: 'dependent-transition-companion-visible-elements',
        sequenceId: plan.sequenceId,
        stageId,
      }),
    };
  };
  const phases = plan.phases.map((phase) => stageAuthority(
    phase,
    `phase:${phase.phase}`,
    { resetCountSincePreviousPhase: phase.resetCountSincePreviousPhase },
  ));
  const restoration = stageAuthority(
    plan.postSequenceRestoration,
    'post-sequence-restoration',
    { resetClickCount: plan.postSequenceRestoration.resetClickCount },
  );
  return {
    authorityHash: sha256HkVisualizationCanonical({
      contractVersion: plan.schemaVersion,
      geometryPolicy,
      kind: 'dependent-transition-companion-authority',
      phases,
      restoration,
      sequenceId: plan.sequenceId,
    }),
    geometryPolicy,
    phases,
    restoration,
  };
}

test("v8 source-plan manifest is an exact independent bridge to all 11 producer plans and every language/theme projection topology", () => {
  assert.equal(HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_MANIFEST_VERSION, "hk-viz-dependent-transition-source-plans-v4");
  assert.deepEqual(
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLANS.map(({ planHash, projectionMatrixHash, sequenceId }: any) => ({ planHash, projectionMatrixHash, sequenceId })),
    EXPECTED_PLAN_AND_MATRIX_HASHES,
  );
  assert.deepEqual(
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLANS.map(({ sequenceId }: any) => sequenceId),
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_IDS,
  );
  for (const sourcePlan of HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLANS as any[]) {
    assert.deepEqual(Object.keys(sourcePlan), EXPECTED_SOURCE_PLAN_KEYS);
    assert.equal(sourcePlan.schemaVersion, HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_SCHEMA_VERSION);
    const sequenceId = sourcePlan.sequenceId as SequenceId;
    const actual = buildHkVisualizationDependentTransitionSequencePlans({
      descriptors: HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_LIVE_DESCRIPTORS[sequenceId],
      domainId: sourcePlan.domainId as BuilderArgs["domainId"],
      labId: sourcePlan.labId,
      modeId: sourcePlan.modeId,
    }).find((plan) => plan.sequenceId === sequenceId);
    assert.ok(actual, sequenceId);
    assert.equal(actual.planHash, sourcePlan.planHash);
    assert.deepEqual(sourcePlan.companionAuthority, expectedCompanionAuthority(actual));
    assert.deepEqual(Object.keys(sourcePlan.companionAuthority), EXPECTED_COMPANION_AUTHORITY_KEYS);
    assert.deepEqual(
      Object.keys(sourcePlan.companionAuthority.geometryPolicy),
      EXPECTED_GEOMETRY_POLICY_KEYS,
    );
    sourcePlan.companionAuthority.phases.forEach((phase: any) =>
      assert.deepEqual(Object.keys(phase), EXPECTED_PHASE_AUTHORITY_KEYS)
    );
    assert.deepEqual(
      Object.keys(sourcePlan.companionAuthority.restoration),
      EXPECTED_RESTORATION_AUTHORITY_KEYS,
    );
    assert.deepEqual(actual.modePreparation, sourcePlan.modePreparation);
    assert.deepEqual(actual.phases.map(({ phase }) => phase), HK_VISUALIZATION_DEPENDENT_TRANSITION_PHASE_IDS);
    const expectedTopologies = projectionTopologies(actual);
    assert.deepEqual(sourcePlan.visibleMathProjectionTopologies, expectedTopologies);
    for (const language of ["en", "zh", "zh-Hans"] as const) {
      for (const theme of ["dark", "light"] as const) {
        assert.deepEqual(Object.keys(sourcePlan.visibleMathProjectionTopologies[language][theme]), EXPECTED_TOPOLOGY_KEYS);
      }
    }
    assert.equal(sourcePlan.projectionMatrixHash, sha256HkVisualizationCanonical({
      contractVersion: actual.schemaVersion,
      kind: "dependent-transition-visible-math-projection-matrix",
      sequenceId: actual.sequenceId,
      topologies: compactProjectionTopologies(expectedTopologies),
    }));
    assert.equal(HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_BY_SEQUENCE_ID[sourcePlan.sequenceId], sourcePlan);
  }
});

test("v8 source-plan manifest rejects structural, language/theme, ancestry, topology, plan, and matrix drift", () => {
  const assertExactManifest = (sourcePlanManifest as unknown as Readonly<{
    assertExactHkVisualizationDependentTransitionSourcePlanManifest?: (value: unknown) => void;
  }>).assertExactHkVisualizationDependentTransitionSourcePlanManifest;
  assert.equal(typeof assertExactManifest, "function");
  if (typeof assertExactManifest !== "function") return;
  const clean = structuredClone(HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLANS) as any[];
  assert.doesNotThrow(() => assertExactManifest(clean));
  const reordered = structuredClone(clean);
  [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
  const existingTopologies = clean[0].visibleMathProjectionTopologies ?? {
    en: { dark: {}, light: {} },
    zh: { dark: {}, light: {} },
    "zh-Hans": { dark: {}, light: {} },
  };
  const existingCompanionAuthority = clean[0].companionAuthority ?? {
    authorityHash: "0".repeat(64),
    geometryPolicy: {},
    phases: [],
    restoration: {},
  };
  const mutations: unknown[] = [
    clean.slice(1),
    [...clean, structuredClone(clean[0])],
    reordered,
    clean.map((entry, index) => index === 0 ? { ...entry, unexpected: true } : entry),
    clean.map((entry, index) => index === 0 ? { ...entry, schemaVersion: "hk-viz-dependent-transition-sequence.v7" } : entry),
    clean.map((entry, index) => index === 0 ? { ...entry, planHash: "0".repeat(64) } : entry),
    clean.map((entry, index) => index === 0 ? { ...entry, companionAuthority: { ...existingCompanionAuthority, authorityHash: "0".repeat(64) } } : entry),
    clean.map((entry, index) => index === 0 ? { ...entry, companionAuthority: { ...existingCompanionAuthority, geometryPolicy: { ...existingCompanionAuthority.geometryPolicy, policyHash: "0".repeat(64) } } } : entry),
    clean.map((entry, index) => index === 0 ? { ...entry, companionAuthority: { ...existingCompanionAuthority, phases: existingCompanionAuthority.phases.slice(1) } } : entry),
    clean.map((entry, index) => index === 0 ? { ...entry, projectionMatrixHash: "0".repeat(64) } : entry),
    clean.map((entry, index) => index === 0 ? { ...entry, visibleMathProjectionTopologies: { ...existingTopologies, unexpected: existingTopologies.en } } : entry),
    clean.map((entry, index) => index === 0 ? { ...entry, visibleMathProjectionTopologies: { ...existingTopologies, en: { ...existingTopologies.en, unexpected: existingTopologies.en.dark } } } : entry),
    clean.map((entry, index) => index === 0 ? { ...entry, visibleMathProjectionTopologies: { ...existingTopologies, en: { ...existingTopologies.en, dark: { ...existingTopologies.en.dark, unexpected: true } } } } : entry),
    clean.map((entry, index) => index === 0 ? { ...entry, visibleMathProjectionTopologies: { ...existingTopologies, en: { ...existingTopologies.en, dark: { ...existingTopologies.en.dark, ancestryScaleSummariesHash: "0".repeat(64) } } } } : entry),
    clean.map((entry, index) => index === 0 ? { ...entry, visibleMathProjectionTopologies: { ...existingTopologies, en: { ...existingTopologies.en, dark: { ...existingTopologies.en.dark, ancestryScaleSummaries: [...(existingTopologies.en.dark.ancestryScaleSummaries ?? []), {}] } } } } : entry),
    clean.map((entry, index) => index === 0 ? { ...entry, visibleMathProjectionTopologies: { ...existingTopologies, en: { ...existingTopologies.en, dark: { ...existingTopologies.en.dark, projectionCount: 4 } } } } : entry),
    clean.map((entry, index) => index === 0 ? { ...entry, visibleMathProjectionTopologies: { ...existingTopologies, en: { ...existingTopologies.en, dark: { ...existingTopologies.en.dark, topologyHash: "0".repeat(64) } } } } : entry),
  ];
  for (const mutation of mutations) assert.throws(() => assertExactManifest(mutation), /exact manifest/i);
});
