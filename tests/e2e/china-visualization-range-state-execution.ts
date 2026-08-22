export type ChinaVisualizationRangeStateSignatureEntry = {
  disabled: boolean;
  id: string;
  index: number;
  max: number;
  min: number;
  value: number;
};

export type ChinaVisualizationRangeStateExecutionMismatch = {
  affectedControlIds: string[];
  controllerInputs: string[];
  domainId: string;
  domainKind: "independent" | "projected";
  domainVersion: number;
  expected: ChinaVisualizationRangeStateSignatureEntry[];
  observed: ChinaVisualizationRangeStateSignatureEntry[];
  observedDomain: {
    affectedControlIds: string[];
    controllerInputs: string[];
    domainId: string;
    domainKind: string;
    domainVersion: number;
    projection: string;
  } | null;
  phase: "before-scan" | "after-scan";
  projection: string;
  requested: ChinaVisualizationRangeStateSignatureEntry[];
  stateId: string;
};

export type ChinaVisualizationRangeStateExecutionPlan = {
  affectedControlIds: string[];
  controllerInputs: string[];
  domainId: string;
  domainKind: "independent" | "projected";
  domainVersion: number;
  expected: ChinaVisualizationRangeStateSignatureEntry[];
  projection: string;
  requested: ChinaVisualizationRangeStateSignatureEntry[];
};

export function independentChinaVisualizationRangeStateExecutionPlan(
  signature: readonly ChinaVisualizationRangeStateSignatureEntry[]
): ChinaVisualizationRangeStateExecutionPlan {
  return {
    affectedControlIds: [],
    controllerInputs: [],
    domainId: "independent-controls",
    domainKind: "independent",
    domainVersion: 1,
    expected: signature.map((entry) => ({ ...entry })),
    projection: "identity",
    requested: signature.map((entry) => ({ ...entry }))
  };
}

export function chinaVisualizationRangeStateSignaturesMatch(
  requested: readonly ChinaVisualizationRangeStateSignatureEntry[],
  observed: readonly ChinaVisualizationRangeStateSignatureEntry[]
) {
  return requested.length === observed.length && requested.every((expected, index) => {
    const actual = observed[index];
    return Boolean(
      actual &&
        actual.disabled === expected.disabled &&
        actual.id === expected.id &&
        actual.index === expected.index &&
        Number.isFinite(actual.max) &&
        actual.max === expected.max &&
        Number.isFinite(actual.min) &&
        actual.min === expected.min &&
        Number.isFinite(actual.value) &&
        actual.value === expected.value
    );
  });
}

export function chinaVisualizationRangeStateExecutionMismatch(
  stateId: string,
  phase: ChinaVisualizationRangeStateExecutionMismatch["phase"],
  plan: ChinaVisualizationRangeStateExecutionPlan,
  observed: readonly ChinaVisualizationRangeStateSignatureEntry[]
): ChinaVisualizationRangeStateExecutionMismatch | null {
  if (chinaVisualizationRangeStateSignaturesMatch(plan.expected, observed)) return null;
  return {
    affectedControlIds: [...plan.affectedControlIds],
    controllerInputs: [...plan.controllerInputs],
    domainId: plan.domainId,
    domainKind: plan.domainKind,
    domainVersion: plan.domainVersion,
    expected: plan.expected.map((entry) => ({ ...entry })),
    observed: observed.map((entry) => ({ ...entry })),
    observedDomain: null,
    phase,
    projection: plan.projection,
    requested: plan.requested.map((entry) => ({ ...entry })),
    stateId
  };
}
