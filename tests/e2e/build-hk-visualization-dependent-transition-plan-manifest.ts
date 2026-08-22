import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

import {
  buildHkVisualizationDependentTransitionSequencePlans,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_LIVE_DESCRIPTORS,
} from "./hk-visualization-range-state-ledger";
import { sha256HkVisualizationCanonical } from "./hk-visualization-state-chunk-contract";

const PROJECTION_SOURCES = Object.freeze([
  "canonical-visible-baseline",
  "phase:pre",
  "phase:clamp",
  "phase:expand",
  "post-sequence-restoration",
] as const);

type SequencePlan = ReturnType<
  typeof buildHkVisualizationDependentTransitionSequencePlans
>[number];
type TransitionStage =
  | SequencePlan["phases"][number]
  | SequencePlan["postSequenceRestoration"];

type SourcePlanIdentity = Readonly<{
  domainId: Parameters<
    typeof buildHkVisualizationDependentTransitionSequencePlans
  >[0]["domainId"];
  labId: string;
  modeId: string;
  sequenceId: keyof typeof HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_LIVE_DESCRIPTORS;
}>;

function projectionTopologies(plan: SequencePlan) {
  return Object.fromEntries(
    (["en", "zh", "zh-Hans"] as const).map((language) => [
      language,
      Object.fromEntries(
        (["dark", "light"] as const).map((theme) => {
          const restoration =
            plan.postSequenceRestoration.visibleMathProjectionContract;
          const contracts = [
            restoration,
            ...plan.phases.map(
              ({ visibleMathProjectionContract }) =>
                visibleMathProjectionContract,
            ),
            restoration,
          ];
          const projections = contracts.map((contract, index) => ({
            ancestryScaleSummary:
              contract.expectedAncestryScaleSummaries[language][theme],
            elementCount: contract.elementCount,
            hash: contract.expectedHashes[language][theme],
            source: PROJECTION_SOURCES[index],
          }));
          const summaries = projections.map(
            ({ ancestryScaleSummary }) => ancestryScaleSummary,
          );
          const elementCounts = projections.map(
            ({ elementCount }) => elementCount,
          );
          const hashes = projections.map(({ hash }) => hash);
          return [
            theme,
            {
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
              totalElementCount: elementCounts.reduce(
                (sum, value) => sum + value,
                0,
              ),
            },
          ];
        }),
      ),
    ]),
  );
}

function compactProjectionTopologies(topologies: ReturnType<typeof projectionTopologies>) {
  return Object.fromEntries(
    (["en", "zh", "zh-Hans"] as const).map((language) => [
      language,
      Object.fromEntries(
        (["dark", "light"] as const).map((theme) => {
          const {
            ancestryScaleSummariesHash,
            elementCountsHash,
            projectionCount,
            projectionHashesHash,
            topologyHash,
            totalElementCount,
          } = topologies[language][theme];
          return [
            theme,
            {
              ancestryScaleSummariesHash,
              elementCountsHash,
              projectionCount,
              projectionHashesHash,
              topologyHash,
              totalElementCount,
            },
          ];
        }),
      ),
    ]),
  );
}

function expectedVisibleElementAuthorities(stage: TransitionStage) {
  const topology: { vizName: string; occurrence: number }[] = [];
  const seen = new Set<string>();
  for (const binding of stage.visibleBindings) {
    const key = `${binding.vizName}\u0000${binding.occurrence}`;
    if (!seen.has(key)) {
      seen.add(key);
      topology.push({
        vizName: binding.vizName,
        occurrence: binding.occurrence,
      });
    }
  }
  return Object.fromEntries(
    (["en", "zh", "zh-Hans"] as const).map((language) => [
      language,
      topology.map(({ vizName, occurrence }) => {
        const bindings = stage.visibleBindings.filter(
          (binding) =>
            binding.vizName === vizName && binding.occurrence === occurrence,
        );
        const tagName = bindings.find(
          (binding) => binding.attribute === "__tag",
        )?.expectedValue;
        const math = stage.visibleMathContracts.find(
          (contract) =>
            contract.vizName === vizName && contract.occurrence === occurrence,
        );
        const text = stage.visibleTextContracts.find(
          (contract) =>
            contract.vizName === vizName && contract.occurrence === occurrence,
        );
        if (!tagName || !math || !text) {
          throw new Error(`${vizName}/${occurrence}`);
        }
        return {
          attributes: [
            ["data-viz-name", vizName],
            ...bindings
              .filter((binding) => !binding.attribute.startsWith("__"))
              .map((binding) => [binding.attribute, binding.expectedValue]),
          ].sort(([left], [right]) =>
            left < right ? -1 : left > right ? 1 : 0
          ),
          learnerVisible: true,
          paintedSubtree: {
            elementCount: math.elementCount,
            hash: math.expectedHashes[language],
          },
          tagName,
          textHash: createHash("sha256")
            .update(
              text.expectedTexts[language]
                .normalize("NFC")
                .replace(/\s+/g, " ")
                .trim(),
            )
            .digest("hex"),
        };
      }),
    ]),
  );
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
    stage: TransitionStage,
    stageId: string,
    resetField: Record<string, number>,
  ) => {
    const controls = stage.expectedValues.map((value, index) => ({
      controlId: value.controlId,
      descriptor: stage.expectedDescriptors[index],
      value: value.value,
    }));
    const rawSerializedPublicState = JSON.stringify(
      Object.fromEntries(
        stage.expectedPublicState.map(({ key, value }) => [key, value]),
      ),
    );
    const visibleElementAuthorities = expectedVisibleElementAuthorities(stage);
    return {
      controls,
      controlsHash: sha256HkVisualizationCanonical({
        contractVersion: plan.schemaVersion,
        controls,
        kind: "dependent-transition-companion-controls",
        sequenceId: plan.sequenceId,
        stageId,
      }),
      ...("phase" in stage && stage.phase ? { phase: stage.phase } : {}),
      publicStateHash: sha256HkVisualizationCanonical({
        contractVersion: plan.schemaVersion,
        kind: "dependent-transition-companion-public-state",
        rawSerializedPublicState,
        sequenceId: plan.sequenceId,
        stageId,
      }),
      rawSerializedPublicState,
      ...resetField,
      stateSignature: stage.expectedStateSignature,
      stateSignatureHash: sha256HkVisualizationCanonical({
        contractVersion: plan.schemaVersion,
        kind: "dependent-transition-companion-state-signature",
        sequenceId: plan.sequenceId,
        stageId,
        stateSignature: stage.expectedStateSignature,
      }),
      visibleElementAuthorities,
      visibleElementAuthoritiesHash: sha256HkVisualizationCanonical({
        authorities: visibleElementAuthorities,
        contractVersion: plan.schemaVersion,
        kind: "dependent-transition-companion-visible-elements",
        sequenceId: plan.sequenceId,
        stageId,
      }),
    };
  };
  const phases = plan.phases.map((phase) =>
    stageAuthority(phase, `phase:${phase.phase}`, {
      resetCountSincePreviousPhase: phase.resetCountSincePreviousPhase,
    })
  );
  const restoration = stageAuthority(
    plan.postSequenceRestoration,
    "post-sequence-restoration",
    { resetClickCount: plan.postSequenceRestoration.resetClickCount },
  );
  return {
    authorityHash: sha256HkVisualizationCanonical({
      contractVersion: plan.schemaVersion,
      geometryPolicy,
      kind: "dependent-transition-companion-authority",
      phases,
      restoration,
      sequenceId: plan.sequenceId,
    }),
    geometryPolicy,
    phases,
    restoration,
  };
}

export function buildHkVisualizationDependentTransitionSourcePlans(
  identities: readonly SourcePlanIdentity[],
) {
  return identities.map((identity) => {
    const plan = buildHkVisualizationDependentTransitionSequencePlans({
      descriptors:
        HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_LIVE_DESCRIPTORS[
          identity.sequenceId
        ],
      domainId: identity.domainId,
      labId: identity.labId,
      modeId: identity.modeId,
    }).find(({ sequenceId }) => sequenceId === identity.sequenceId);
    if (!plan) throw new Error(identity.sequenceId);
    const visibleMathProjectionTopologies = projectionTopologies(plan);
    return {
      companionAuthority: expectedCompanionAuthority(plan),
      domainId: identity.domainId,
      labId: identity.labId,
      modeId: identity.modeId,
      modePreparation: plan.modePreparation,
      planHash: plan.planHash,
      projectionMatrixHash: sha256HkVisualizationCanonical({
        contractVersion: plan.schemaVersion,
        kind: "dependent-transition-visible-math-projection-matrix",
        sequenceId: plan.sequenceId,
        topologies: compactProjectionTopologies(
          visibleMathProjectionTopologies,
        ),
      }),
      schemaVersion: plan.schemaVersion,
      sequenceId: plan.sequenceId,
      visibleMathProjectionTopologies,
    };
  });
}

async function main() {
  const { HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLANS } = await import(
    "./hk-visualization-dependent-transition-plan-manifest.mjs"
  );
  process.stdout.write(
    `${JSON.stringify(
      buildHkVisualizationDependentTransitionSourcePlans(
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLANS,
      ),
      null,
      2,
    )}\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
