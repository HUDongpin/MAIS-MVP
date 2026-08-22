import {
  MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS,
  MULTI_DIGIT_OPERATIONS_COPY,
} from "../../components/visualizations/mainland/MultiDigitOperationsLab";
import {
  MULTI_DIGIT_OPERATIONS_DOMAIN,
  MULTI_DIGIT_OPERATIONS_RESET_INPUT,
  type MultiDigitBaseOperation,
  type MultiDigitOperation,
} from "../../components/visualizations/mainland/MultiDigitOperationsModel";

const G01_ALLOWED_MODES = Object.freeze(
  Object.keys(MULTI_DIGIT_OPERATIONS_COPY.modes) as MultiDigitOperation[],
);
const G01_ESTIMATE_OPERATIONS = Object.freeze(
  G01_ALLOWED_MODES.filter((mode) => mode !== "estimate-check"),
);

function fixedRange(
  controlId: "operand-a" | "operand-b" | "strategy-step",
  min: number,
  max: number,
) {
  return {
    controlId,
    endpoints: [
      { endpoint: "min" as const, value: min },
      { endpoint: "mid" as const, value: Math.floor((min + max) / 2) },
      { endpoint: "max" as const, value: max },
    ],
    kind: "range" as const,
    max,
    min,
    step: 1 as const,
  };
}

function rangeControlsFor(exactOperation: MultiDigitBaseOperation) {
  const operandB =
    exactOperation === "subtract"
      ? {
          controlId: "operand-b" as const,
          endpoints: [
            { endpoint: "min" as const, value: 0 },
            {
              endpoint: "mid" as const,
              value: {
                round: "floor" as const,
                sourceMaxControlId: "operand-a" as const,
                sourceMin: 0,
              },
            },
            {
              endpoint: "max" as const,
              value: { sourceControlId: "operand-a" as const },
            },
          ],
          kind: "range" as const,
          max: { sourceControlId: "operand-a" as const },
          min: 0,
          step: 1 as const,
        }
      : fixedRange(
          "operand-b",
          exactOperation === "divide"
            ? 1
            : MULTI_DIGIT_OPERATIONS_DOMAIN.minOperand,
          MULTI_DIGIT_OPERATIONS_DOMAIN.maxOperand,
        );
  return [
    fixedRange(
      "operand-a",
      MULTI_DIGIT_OPERATIONS_DOMAIN.minOperand,
      MULTI_DIGIT_OPERATIONS_DOMAIN.maxOperand,
    ),
    operandB,
    fixedRange("strategy-step", 0, 3),
  ];
}

function controlsFor(mode: MultiDigitOperation) {
  const controls = rangeControlsFor(
    mode === "estimate-check"
      ? MULTI_DIGIT_OPERATIONS_RESET_INPUT.operation
      : mode,
  );
  if (mode === "estimate-check") {
    return [
      ...controls,
      {
        controlId: "estimate-operation" as const,
        kind: "select" as const,
        options: G01_ESTIMATE_OPERATIONS,
      },
      {
        controlId: "rounding-place" as const,
        kind: "select" as const,
        options: MULTI_DIGIT_OPERATIONS_DOMAIN.roundingPlaces,
      },
    ];
  }
  return controls;
}

const G01_RESET = {
  ...MULTI_DIGIT_OPERATIONS_RESET_INPUT,
  exactOperation: MULTI_DIGIT_OPERATIONS_RESET_INPUT.operation,
  roundingPlace: 10,
  strategyStep: 0,
} as const;

const G01_TOPICS = MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS.map((labId) => ({
  allowedModes: G01_ALLOWED_MODES,
  labId,
  modes: G01_ALLOWED_MODES.map((mode) => ({
    controls: controlsFor(mode),
    estimateOperationVariants:
      mode === "estimate-check"
        ? G01_ESTIMATE_OPERATIONS.map((exactOperation) => ({
            controls: rangeControlsFor(exactOperation),
            exactOperation,
          }))
        : [],
    mode,
  })),
  reset: G01_RESET,
}));

const G01_VISUAL_AXES = ["desktop-chrome", "mobile-chrome"].flatMap(
  (project) =>
    ["en", "zh", "zh-Hans"].flatMap((locale) =>
      ["light", "dark"].map((theme) => ({
        axisId: `${project}|${locale}|${theme}`,
        locale,
        project,
        theme,
      })),
    ),
);

const G01_INTERACTION_AXES = [G01_VISUAL_AXES[0]!, G01_VISUAL_AXES.at(-1)!];

function interactionScenarioIds() {
  return [
    "initial",
    "first",
    ...G01_TOPICS[0].modes.flatMap(
      ({ controls, estimateOperationVariants, mode }) => {
        if (mode !== "estimate-check") {
          return [
            `mode:${mode}`,
            ...controls.flatMap((control) =>
              control.kind === "range"
                ? control.endpoints.map(
                    ({ endpoint }) =>
                      `endpoint:${mode}:${control.controlId}:${endpoint}`,
                  )
                : [],
            ),
          ];
        }
        const roundingControl = controls.find(
          ({ controlId }) => controlId === "rounding-place",
        );
        return [
          `mode:${mode}`,
          ...estimateOperationVariants.flatMap(
            ({ controls: variantControls, exactOperation }) => [
              `estimate-from:${exactOperation}`,
              ...variantControls.flatMap((control) =>
                control.endpoints.map(
                  ({ endpoint }) =>
                    `endpoint:${mode}:${exactOperation}:${control.controlId}:${endpoint}`,
                ),
              ),
            ],
          ),
          ...(roundingControl?.kind === "select"
            ? roundingControl.options.map(
                (option) => `option:${mode}:rounding-place:${option}`,
              )
            : []),
        ];
      },
    ),
    "reset",
  ];
}

const G01_VISUAL_STATE_IDS = MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS.flatMap(
  (labId) =>
    G01_VISUAL_AXES.map(
      ({ axisId }) => `visual:${labId}:${axisId}:reset`,
    ),
);
const G01_INTERACTION_STATE_IDS =
  MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS.flatMap((labId) =>
    G01_INTERACTION_AXES.flatMap(({ axisId }) =>
      interactionScenarioIds().map(
        (scenarioId) => `interaction:${labId}:${axisId}:${scenarioId}`,
      ),
    ),
  );

const G01_CORE = {
  coverage: {
    fullVisualInteractionCartesian: false as const,
    interactionAxes: G01_INTERACTION_AXES,
    visualAxes: G01_VISUAL_AXES,
    visualState: "reset" as const,
  },
  family: "multi-digit-operations" as const,
  groupId: "G01" as const,
  labIds: MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS,
  logicalStates: {
    allStateIds: [...G01_VISUAL_STATE_IDS, ...G01_INTERACTION_STATE_IDS],
    counts: {
      interaction: G01_INTERACTION_STATE_IDS.length,
      total: G01_VISUAL_STATE_IDS.length + G01_INTERACTION_STATE_IDS.length,
      visual: G01_VISUAL_STATE_IDS.length,
    },
    interactionStateIds: G01_INTERACTION_STATE_IDS,
    visualStateIds: G01_VISUAL_STATE_IDS,
  },
  playApplicable: false as const,
  schemaVersion: "china-mainland-g01-production-plan.v1" as const,
  topics: G01_TOPICS,
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

const G01_OWNED_CORE = structuredClone(G01_CORE);

export const G01_PRODUCTION_PLAN = deepFreeze({
  ...G01_OWNED_CORE,
  canonicalSha256: sha256(G01_OWNED_CORE),
});

export function validateG01ProductionPlan(candidate: unknown): boolean {
  if (JSON.stringify(candidate) !== JSON.stringify(G01_PRODUCTION_PLAN)) {
    throw new TypeError("G01 production plan does not match the exact producer contract.");
  }
  return true;
}
import { createHash } from "node:crypto";
