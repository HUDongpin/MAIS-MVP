import { createHash } from "node:crypto";

import { MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS } from "../../components/visualizations/mainland/DecimalArithmeticLab";
import {
  DECIMAL_ARITHMETIC_MODEL_CONTRACT,
  decimalArithmeticOperations,
  decimalArithmeticResetInput,
  type DecimalArithmeticOperation,
} from "../../components/visualizations/mainland/DecimalArithmeticModel";

const G02_UI_RANGE_CONTRACT = Object.freeze([
  ["operand-a", 0, 9_999],
  ["operand-b", 1, 9_999],
  ["decimal-scale", 0, 3],
  ["precision", 0, 4],
] as const);

function fixedRange(
  controlId: (typeof G02_UI_RANGE_CONTRACT)[number][0],
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

const G02_CONTROLS = G02_UI_RANGE_CONTRACT.map(([controlId, min, max]) =>
  fixedRange(controlId, min, max),
);
const G02_ESTIMATE_FROM_OPERATIONS = decimalArithmeticOperations.filter(
  (mode): mode is Exclude<DecimalArithmeticOperation, "estimate-check"> =>
    mode !== "estimate-check",
);
const G02_TOPICS = MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS.map((labId) => ({
  allowedModes: decimalArithmeticOperations,
  estimateFromOperations: G02_ESTIMATE_FROM_OPERATIONS,
  labId,
  modes: decimalArithmeticOperations.map((mode) => ({
    controls: G02_CONTROLS,
    mode,
  })),
  reset: decimalArithmeticResetInput,
}));

const G02_VISUAL_AXES = ["desktop-chrome", "mobile-chrome"].flatMap(
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
const G02_INTERACTION_AXES = [G02_VISUAL_AXES[0]!, G02_VISUAL_AXES.at(-1)!];

function interactionScenarioIds() {
  return [
    "initial",
    "first",
    ...G02_TOPICS[0].modes.flatMap(({ controls, mode }) => [
      `mode:${mode}`,
      ...controls.flatMap((control) =>
        control.endpoints.map(
          ({ endpoint }) =>
            `endpoint:${mode}:${control.controlId}:${endpoint}`,
        ),
      ),
    ]),
    ...G02_ESTIMATE_FROM_OPERATIONS.map(
      (operation) => `estimate-from:${operation}`,
    ),
    "reset",
  ];
}

const G02_VISUAL_STATE_IDS = MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS.flatMap(
  (labId) =>
    G02_VISUAL_AXES.map(
      ({ axisId }) => `visual:${labId}:${axisId}:reset`,
    ),
);
const G02_INTERACTION_STATE_IDS =
  MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS.flatMap((labId) =>
    G02_INTERACTION_AXES.flatMap(({ axisId }) =>
      interactionScenarioIds().map(
        (scenarioId) => `interaction:${labId}:${axisId}:${scenarioId}`,
      ),
    ),
  );

const G02_CORE = {
  coverage: {
    fullVisualInteractionCartesian: false as const,
    interactionAxes: G02_INTERACTION_AXES,
    visualAxes: G02_VISUAL_AXES,
    visualState: "reset" as const,
  },
  family: DECIMAL_ARITHMETIC_MODEL_CONTRACT.family,
  groupId: "G02" as const,
  labIds: MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS,
  logicalStates: {
    allStateIds: [...G02_VISUAL_STATE_IDS, ...G02_INTERACTION_STATE_IDS],
    counts: {
      interaction: G02_INTERACTION_STATE_IDS.length,
      total: G02_VISUAL_STATE_IDS.length + G02_INTERACTION_STATE_IDS.length,
      visual: G02_VISUAL_STATE_IDS.length,
    },
    interactionStateIds: G02_INTERACTION_STATE_IDS,
    visualStateIds: G02_VISUAL_STATE_IDS,
  },
  playApplicable: false as const,
  schemaVersion: "china-mainland-g02-production-plan.v1" as const,
  topics: G02_TOPICS,
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
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

const G02_OWNED_CORE = structuredClone(G02_CORE);

export const G02_PRODUCTION_PLAN = deepFreeze({
  ...G02_OWNED_CORE,
  canonicalSha256: sha256(G02_OWNED_CORE),
});

export function validateG02ProductionPlan(candidate: unknown): boolean {
  if (canonicalJson(candidate) !== canonicalJson(G02_PRODUCTION_PLAN)) {
    throw new TypeError(
      "G02 production plan does not match the exact producer contract.",
    );
  }
  return true;
}
