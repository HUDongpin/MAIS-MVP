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
  { planHash: "dc32ab0ea2af63b0771dd285e6f0557a96bf184013a06b76ac1d916527c2182a", projectionMatrixHash: "380b2af309444ac244fcb312b6cd518f5a301e3304c158bde035786145544489", sequenceId: "p1-number-bond-known-part" },
  { planHash: "21f956ba3b255be8340c7ff67be309b34730aab289589b4205cda4adf1e17bcb", projectionMatrixHash: "627cdb326e5d8353b25a58c264bf2bca9cf9387264e46626dfec7266458290d4", sequenceId: "p1-add-step" },
  { planHash: "5931b42cfa76980d33b87db097ae04ea1b816355cfa781decaf9fbe88b2d4791", projectionMatrixHash: "9a1dbd56801f11939a75738d78c329f97a01521cac77d3036efa7fa023dd62f3", sequenceId: "p1-subtract-step" },
  { planHash: "fb0eb56bafbb02cac0346b0c030f878e81abe0b7d4ac41cace52a6c3d1586366", projectionMatrixHash: "dd095cec1e11da0d3128c40a1d0a45275bf67ecfad0b67459b26a5bd0b846c6e", sequenceId: "p2-payment-at-least-price" },
  { planHash: "0d732fdd401116ded301ffe5c61502af226d06274f3bf072174923cb14fcff43", projectionMatrixHash: "8f4858d5957cd469d8ebfa6515457baf5c40d93c08314d69236742f4e09a5b97", sequenceId: "p4-divisor-within-number" },
  { planHash: "27159db312270cf5592695e39c808cd6b659289094c50217f8fbf17b703361e7", projectionMatrixHash: "9560fb22cd8629ca2013016274fdfdb587c7dd2c7cdc6e969737b8147bb10f6b", sequenceId: "p5-first-proper-fraction" },
  { planHash: "4b367625494a40e289a8e9ab18a384da6e0745224dfef94da8d209799163fb16", projectionMatrixHash: "df72747d61064609796ef913577ee99137b961d55de5701409d75a8535e1c3ca", sequenceId: "p5-second-proper-fraction" },
  { planHash: "43f206ae706174d1b37c0ab56058786062a2cf22ab46f7e62e6250349b2cb8ec", projectionMatrixHash: "6cc345414fb8c8bd2487692b88549c224781c9cd4295ceafff2cd5b485014f4c", sequenceId: "p5-third-proper-fraction" },
  { planHash: "7b055f3c4a6cedda4c6697a77c9e69b16e4560a930338ba9e9ec53adc492f529", projectionMatrixHash: "7385a78d7fba8e89627aa4c41153843cbd3aaddfbd566b2a60d67f9c37f7d244", sequenceId: "p5-visible-volume-layers" },
  { planHash: "a31a83200348d3269785eca2a0d1c841626bd244a3970532113918c9ec2859d2", projectionMatrixHash: "48b7149b198548b4a1c0396531809c265429be5e0d49227239ea397c9ea69870", sequenceId: "s3-identity-a-projects-b" },
  { planHash: "6f32b22f4af8fe60b6c6515f0e53a5f816015f2e7da74ace7525d88402cfbf19", projectionMatrixHash: "9fda437eb4ad13900b93c4b4d87795c0af28079e9ad126949098638a6d44bef8", sequenceId: "s3-identity-b-projects-a" },
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
