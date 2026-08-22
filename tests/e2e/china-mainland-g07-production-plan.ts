import { createHash } from "node:crypto";

import {
  createSymbolicExpressionsControlDomainState,
  symbolicExpressionsControlDescriptorFor,
} from "../../components/visualizations/mainland/SymbolicExpressionsControlDomain";
import {
  SYMBOLIC_EXPRESSIONS_LAB_IDS,
  SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT,
  SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST,
  SYMBOLIC_EXPRESSIONS_RESET_INPUTS,
  type SymbolicExpressionsLabId,
  type SymbolicExpressionsMode,
} from "../../components/visualizations/mainland/SymbolicExpressionsModel";

function controlsFor(
  labId: SymbolicExpressionsLabId,
  mode: SymbolicExpressionsMode,
) {
  const descriptor = symbolicExpressionsControlDescriptorFor(labId, mode);
  return {
    controls: descriptor.controls.map((control) => ({
      ...control,
      endpoints: [
        { endpoint: "min" as const, value: control.min },
        {
          endpoint: "mid" as const,
          value: Math.floor((control.min + control.max) / 2),
        },
        { endpoint: "max" as const, value: control.max },
      ],
      kind: "range" as const,
    })),
    descriptor,
    mode,
  };
}

const G07_TOPICS = SYMBOLIC_EXPRESSIONS_LAB_IDS.map((labId) => ({
  allowedModes: SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId],
  labId,
  modes: SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId].map((mode) =>
    controlsFor(labId, mode),
  ),
  reset: {
    controlState: createSymbolicExpressionsControlDomainState(labId),
    input: SYMBOLIC_EXPRESSIONS_RESET_INPUTS[labId],
  },
}));

const G07_VISUAL_AXES = ["desktop-chrome", "mobile-chrome"].flatMap(
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
const G07_INTERACTION_AXES = [G07_VISUAL_AXES[0]!, G07_VISUAL_AXES.at(-1)!];

function interactionScenarioIds(topic: (typeof G07_TOPICS)[number]) {
  return [
    "initial",
    "first",
    ...topic.modes.flatMap(({ controls, mode }) => [
      `mode:${mode}`,
      ...controls.flatMap((control) =>
        control.endpoints.map(
          ({ endpoint }) =>
            `endpoint:${mode}:${control.controlId}:${endpoint}`,
        ),
      ),
    ]),
    "reset",
  ];
}

const G07_VISUAL_STATE_IDS = G07_TOPICS.flatMap(({ labId }) =>
  G07_VISUAL_AXES.map(({ axisId }) => `visual:${labId}:${axisId}:reset`),
);
const G07_INTERACTION_STATE_IDS = G07_TOPICS.flatMap((topic) =>
  G07_INTERACTION_AXES.flatMap(({ axisId }) =>
    interactionScenarioIds(topic).map(
      (scenarioId) => `interaction:${topic.labId}:${axisId}:${scenarioId}`,
    ),
  ),
);

const G07_CORE = {
  coverage: {
    fullVisualInteractionCartesian: false as const,
    interactionAxes: G07_INTERACTION_AXES,
    visualAxes: G07_VISUAL_AXES,
    visualState: "reset" as const,
  },
  family: SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT.family,
  groupId: SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT.groupId,
  labIds: SYMBOLIC_EXPRESSIONS_LAB_IDS,
  logicalStates: {
    allStateIds: [...G07_VISUAL_STATE_IDS, ...G07_INTERACTION_STATE_IDS],
    counts: {
      interaction: G07_INTERACTION_STATE_IDS.length,
      total: G07_VISUAL_STATE_IDS.length + G07_INTERACTION_STATE_IDS.length,
      visual: G07_VISUAL_STATE_IDS.length,
    },
    interactionStateIds: G07_INTERACTION_STATE_IDS,
    visualStateIds: G07_VISUAL_STATE_IDS,
  },
  playApplicable: false as const,
  schemaVersion: "china-mainland-g07-production-plan.v1" as const,
  topics: G07_TOPICS,
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

const G07_OWNED_CORE = structuredClone(G07_CORE);

export const G07_PRODUCTION_PLAN = deepFreeze({
  ...G07_OWNED_CORE,
  canonicalSha256: sha256(G07_OWNED_CORE),
});

export function validateG07ProductionPlan(candidate: unknown): boolean {
  if (canonicalJson(candidate) !== canonicalJson(G07_PRODUCTION_PLAN)) {
    throw new TypeError(
      "G07 production plan does not match the exact producer contract.",
    );
  }
  return true;
}
