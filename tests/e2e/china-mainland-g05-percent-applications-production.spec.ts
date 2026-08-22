import {
  expect,
  test,
  type APIResponse,
  type Locator,
  type Page,
  type Request,
  type TestInfo,
} from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  MAINLAND_PERCENT_APPLICATIONS_LAB_IDS,
  PERCENT_APPLICATIONS_MODE_ALLOWLIST,
  resetPercentApplicationsLabInput,
} from "../../components/visualizations/mainland/PercentApplicationsLab";
import {
  PERCENT_APPLICATIONS_MODEL_CONTRACT,
  type PercentApplicationsLabId,
  type PercentApplicationsMode,
  type PercentChangeDirection,
} from "../../components/visualizations/mainland/PercentApplicationsModel";
import {
  PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT,
  PercentApplicationsControlDomainError,
  percentApplicationsControlContractFor,
  planPercentApplicationsControlTransition,
  type PercentApplicationsControlDomainErrorCode,
  type PercentApplicationsControlDomainRequest,
  type PercentApplicationsNumericControlId,
  type PercentApplicationsRateProjection,
} from "../../components/visualizations/mainland/PercentApplicationsControlDomain";
import {
  getVisualizationLabByLabId,
  type FeaturedLabDefinition,
} from "../../data/visualizationLabs";
import { lessonSlugForTopicId } from "../../lib/lessonLinks";
import {
  collectPageErrors,
  expectNoPageErrors,
  uniqueSuffix,
} from "./helpers";
import {
  chinaVisualizationCollisionReceipt,
} from "./china-visualization-collision-receipt";
import {
  installHkVisualizationEffectiveVisibilityInspector,
  scanHkVisualizationCollisions,
} from "./hk-visualization-collision-scanner";
import { scanHkVisualizationTextContrast } from "./hk-visualization-text-contrast-scanner";
import { assertMainlandFocusedCanonicalCli } from "./mainland-focused-canonical-cli";
import {
  createVisualizationLessonDurabilityBrowserAdapter,
  prepareVisualizationLessonLearnerProfileBeforeArm,
  type VisualizationLessonDurabilityFinalReceipt,
} from "./visualization-lesson-session-durability-browser";

const configuredModuleId = "configured-visualization-lab" as const;
const supportedProjects = ["desktop-chrome", "mobile-chrome"] as const;
const endpoints = ["min", "mid", "max"] as const;
const maximumStatesPerChunk = 32;
const collisionScannerSha256 =
  "b775c93f615522da021cf813a42304bee27d5ba437b0e06247ccd4f5049f5824";
const contrastScannerSha256 =
  "81cd3d4a612ae5934586be0cd0fa5a3e6987c96c3d6c89af32f76b8ef697913e";
const scannerSixCaseTestSha256 =
  "0e6c42d5750c9b127fa583625be7c49757370cd239155fac9c0766c05ac1f7e7";
const scannerPackageAggregateSha256 =
  "6ff36e516d1d2da6ff04c4be632942c4f52cf63929b83013b56a35e7255e2502";
const scannerPackageAggregateSerialization =
  "ordered-repo-relative-path-utf8-nul-raw-file-bytes-no-final-separator" as const;

const exactLabIds = [
  "bnu-primary-p6-upper-percentage-applications",
  "pep-primary-p6-upper-percent-fractions",
] as const satisfies readonly PercentApplicationsLabId[];

const expectedTopicModeControlTable = {
  "bnu-primary-p6-upper-percentage-applications": {
    modes: [
      "find-part",
      "find-whole",
      "increase",
      "decrease",
      "discount",
      "inverse",
    ],
    controls: {
      decrease: ["base", "rate-basis-points"],
      discount: ["base", "rate-basis-points"],
      "find-part": ["base", "rate-basis-points"],
      "find-whole": ["amount", "rate-basis-points"],
      increase: ["base", "rate-basis-points"],
      inverse: ["new-value", "rate-basis-points", "inverse-direction"],
    },
  },
  "pep-primary-p6-upper-percent-fractions": {
    modes: [
      "convert",
      "find-part",
      "find-whole",
      "increase",
      "decrease",
      "discount",
    ],
    controls: {
      convert: ["rate-basis-points"],
      decrease: ["base", "rate-basis-points"],
      discount: ["base", "rate-basis-points"],
      "find-part": ["base", "rate-basis-points"],
      "find-whole": ["amount", "rate-basis-points"],
      increase: ["base", "rate-basis-points"],
    },
  },
} as const;
const expectedStatePlanSha256 =
  "cc53becea61e7c5ced860d61736404b8069f66e21e9976e24cee8afd9082f641";
const expectedStateDescriptorPlanSha256 =
  "5273f49a219e3b1416d346de98c34f60d239b9904782fa817955f91ca7d3c7be";
const expectedTopicModeControlTableSha256 =
  "6341361d1d8b0c9db967b28abc75c06e96c0b1b33b32daa2ebd9946df4a10de6";
const expectedDurabilityBrowserHelperSha256 =
  "f27ae08a91ec2f5daa97ed905342f99d7abf9693c4d82532a3b1f6d8fc93bccb";
const expectedDurabilityBrowserHelperTestSha256 =
  "86ac16b4cc4b23a4cd99196fb49a6cd6a632a47aa3cd3003c0d9ff5a26020d76";
const durabilityBrowserPairAggregateSha256 =
  "e94c63f04a68a67f014181bbbbf098e6222b7a9bd31981752ad470c55d85fff3";
const durabilityFourFileAggregateSha256 =
  "d7d9a07f10b5d9e7726fd0fb8e30549ae6d73f1ec92fcd1c06ceab8f743404ba";
const durabilityPackageAggregateSerialization =
  "shasum-a-256-lowercase-digest-two-spaces-repo-relative-path-lf-fixed-order" as const;
const expectedDurabilityPureHelperSha256 =
  "fbaf8eb7be80157124617fe7da4c1666867a5185d9a1958f5134d53f48a58eca";
const expectedDurabilityPureHelperTestSha256 =
  "aa1f35b2e26ca8e7b564bf2f6fd72d9c3256d4290c367711ca690168e323d0f4";
const expectedFocusedReportValidatorSha256 =
  "1a0158b113ed470235cefc62abec1dc00fa263bb12b7f409aef211092a766ba6";
const expectedFocusedReportValidatorTestSha256 =
  "2e2503819d8a152c559a85e5dde290cb743887975e0bdfcf25bdeaf251c91a7c";
const expectedNextEnvSha256 =
  "85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6";

type Endpoint = (typeof endpoints)[number];
type Stage = "audit" | "interaction" | "mount";
type DynamicScenario = "decrease-max" | "discount-max" | "find-whole-min" | "inverse-decrease-max";

type RuntimeCase = Readonly<{
  lab: FeaturedLabDefinition;
  labId: PercentApplicationsLabId;
  modes: readonly PercentApplicationsMode[];
  publisher: "MAINLAND_BNU" | "MAINLAND_PEP";
  track: "MAINLAND_BNU" | "MAINLAND_PEP_PRIMARY";
}>;

type StatePlan =
  | Readonly<{ id: "initial"; kind: "initial"; atomicGroup?: string }>
  | Readonly<{ id: string; kind: "mode"; mode: PercentApplicationsMode; atomicGroup?: string }>
  | Readonly<{
      direction?: PercentChangeDirection;
      endpoint: Endpoint;
      id: string;
      kind: "range";
      mode: PercentApplicationsMode;
      parameter: "amount" | "base" | "new-value" | "rate-basis-points";
      atomicGroup?: string;
    }>
  | Readonly<{
      direction: PercentChangeDirection;
      id: string;
      kind: "direction";
      mode: "inverse";
      atomicGroup?: string;
    }>
  | Readonly<{
      atomicGroup: string;
      id: string;
      kind: "dynamic";
      scenario: DynamicScenario;
      step: string;
    }>
  | Readonly<{
      atomicGroup?: string;
      id: "special:conversion-partial";
      kind: "conversion-partial";
    }>
  | Readonly<{ id: "reset"; kind: "reset"; atomicGroup?: string }>;

type RuntimeChunk = Readonly<{
  id: string;
  index: number;
  plans: readonly StatePlan[];
  runtime: RuntimeCase;
  total: number;
}>;

type DomainState = Readonly<{
  amount: number;
  base: number;
  inverseDirection: PercentChangeDirection;
  labId: PercentApplicationsLabId;
  mode: PercentApplicationsMode;
  newValue: number;
  rateBasisPoints: number;
}>;

type ControlSnapshot = Readonly<{
  disabled: boolean;
  max: number;
  min: number;
  parameter: string;
  step: number;
  value: string;
}>;

type StateControlSignature = Readonly<{
  controls: readonly ControlSnapshot[];
  inverseDirection: PercentChangeDirection;
  mode: PercentApplicationsMode;
  state: DomainState;
}>;

type DomainReceipt = Readonly<{
  expected: DomainState;
  observed: DomainState;
  projectionCount: number;
  projectionReasons: readonly string[];
  rejection: PercentApplicationsControlDomainErrorCode | null;
  requested: DomainState;
}>;

type PlannedRequest =
  | PercentApplicationsControlDomainRequest
  | Readonly<{ kind: "initial" }>;

type PlannedStateDescriptor = Readonly<{
  labId: PercentApplicationsLabId;
  plan: Readonly<{
    controlParameter:
      | PercentApplicationsNumericControlId
      | "inverse-direction"
      | "mode"
      | null;
    kind: PlannedRequest["kind"];
    mode: PercentApplicationsMode;
    request: PlannedRequest;
  }>;
  stateId: string;
}>;

type VisibleControlIdentity =
  | Readonly<{
      controlId: PercentApplicationsNumericControlId;
      kind: "control";
    }>
  | Readonly<{
      controllerId: "inverse-direction" | "mode";
      kind: "controller";
      value: PercentApplicationsMode | PercentChangeDirection;
    }>
  | null;

type ActionEvidence = Readonly<{
  before: StateControlSignature;
  beforeDomain: DomainReceipt;
  expected: StateControlSignature;
  expectedDomain: DomainReceipt;
  expectedRejection: PercentApplicationsControlDomainErrorCode | null;
  observed: StateControlSignature;
  plannedProjections: readonly PercentApplicationsRateProjection[];
  plannedRequest: PlannedRequest;
}>;

type RuntimeSignature = Readonly<{
  configuredState: DomainState;
  controls: readonly ControlSnapshot[];
  domain: DomainReceipt;
  inverseDirection: PercentChangeDirection;
  mode: PercentApplicationsMode;
  semanticState: DomainState;
  visual: readonly Readonly<{
    geometryReceipt: unknown;
    kind: string | null;
    markCount: string | null;
    visibleReceipt: string | null;
  }>[];
}>;

type ObservedWrite = Readonly<{
  body: unknown;
  method: string;
  pathname: string;
  stage: Stage;
}>;

function fail(message: string): never {
  throw new TypeError(message);
}

function validatorCanonicalJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(validatorCanonicalJson).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${validatorCanonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  fail(`G05 descriptor value is not canonical JSON: ${String(value)}.`);
}

function exactSorted(values: readonly string[]) {
  return [...values].sort();
}

function assertExactSet(label: string, actual: readonly string[], expected: readonly string[]) {
  if (JSON.stringify(exactSorted(actual)) !== JSON.stringify(exactSorted(expected))) {
    fail(`${label} drifted; expected=${JSON.stringify(exactSorted(expected))} actual=${JSON.stringify(exactSorted(actual))}.`);
  }
}

function assertCanonicalEqual(label: string, actual: unknown, expected: unknown) {
  if (validatorCanonicalJson(actual) !== validatorCanonicalJson(expected)) {
    fail(
      `${label} drifted; expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}.`,
    );
  }
}

function sourceFileSha256(relativePath: string) {
  return createHash("sha256")
    .update(readFileSync(`${__dirname}/${relativePath}`))
    .digest("hex");
}

const integrationSourceSha256 = Object.freeze({
  collisionScanner: sourceFileSha256(
    "hk-visualization-collision-scanner.ts",
  ),
  contrastScanner: sourceFileSha256(
    "hk-visualization-text-contrast-scanner.ts",
  ),
  durabilityBrowser: sourceFileSha256(
    "visualization-lesson-session-durability-browser.ts",
  ),
  durabilityBrowserTest: sourceFileSha256(
    "visualization-lesson-session-durability-browser.test.ts",
  ),
  durabilityPure: sourceFileSha256(
    "visualization-lesson-session-durability.ts",
  ),
  durabilityPureTest: sourceFileSha256(
    "visualization-lesson-session-durability.test.ts",
  ),
  focusedReportValidator: sourceFileSha256(
    "../../scripts/validate-mainland-focused-visualization-report.mjs",
  ),
  focusedReportValidatorTest: sourceFileSha256(
    "../../scripts/validate-mainland-focused-visualization-report.test.mjs",
  ),
  nextEnv: sourceFileSha256("../../next-env.d.ts"),
  scannerSixCaseTest: sourceFileSha256(
    "hk-visualization-scanner-six-case-contract.test.mjs",
  ),
});
assertCanonicalEqual(
  "G05 approved durability/validator/next-env source SHA",
  integrationSourceSha256,
  {
    collisionScanner: collisionScannerSha256,
    contrastScanner: contrastScannerSha256,
    durabilityBrowser: expectedDurabilityBrowserHelperSha256,
    durabilityBrowserTest: expectedDurabilityBrowserHelperTestSha256,
    durabilityPure: expectedDurabilityPureHelperSha256,
    durabilityPureTest: expectedDurabilityPureHelperTestSha256,
    focusedReportValidator: expectedFocusedReportValidatorSha256,
    focusedReportValidatorTest: expectedFocusedReportValidatorTestSha256,
    nextEnv: expectedNextEnvSha256,
    scannerSixCaseTest: scannerSixCaseTestSha256,
  },
);
const producerSourceSha256 = createHash("sha256")
  .update(readFileSync(__filename))
  .digest("hex");

const durabilityPackageEntries = [
  [
    integrationSourceSha256.durabilityBrowser,
    "tests/e2e/visualization-lesson-session-durability-browser.ts",
  ],
  [
    integrationSourceSha256.durabilityBrowserTest,
    "tests/e2e/visualization-lesson-session-durability-browser.test.ts",
  ],
  [
    integrationSourceSha256.durabilityPure,
    "tests/e2e/visualization-lesson-session-durability.ts",
  ],
  [
    integrationSourceSha256.durabilityPureTest,
    "tests/e2e/visualization-lesson-session-durability.test.ts",
  ],
] as const;

function shasumStdoutAggregate(
  entries: readonly (readonly [string, string])[],
) {
  return createHash("sha256")
    .update(
      entries
        .map(([sha256, repositoryRelativePath]) =>
          `${sha256}  ${repositoryRelativePath}\n`
        )
        .join(""),
    )
    .digest("hex");
}

const observedDurabilityBrowserPairAggregateSha256 = shasumStdoutAggregate(
  durabilityPackageEntries.slice(0, 2),
);
const observedDurabilityFourFileAggregateSha256 = shasumStdoutAggregate(
  durabilityPackageEntries,
);
if (
  observedDurabilityBrowserPairAggregateSha256 !==
    durabilityBrowserPairAggregateSha256 ||
  observedDurabilityFourFileAggregateSha256 !==
    durabilityFourFileAggregateSha256
) {
  fail(
    `G05 durability package aggregate drifted; pairExpected=${durabilityBrowserPairAggregateSha256} pairActual=${observedDurabilityBrowserPairAggregateSha256} fourExpected=${durabilityFourFileAggregateSha256} fourActual=${observedDurabilityFourFileAggregateSha256}.`,
  );
}

const scannerPackageEntries = [
  {
    relativePath: "hk-visualization-collision-scanner.ts",
    repositoryRelativePath:
      "tests/e2e/hk-visualization-collision-scanner.ts",
  },
  {
    relativePath: "hk-visualization-text-contrast-scanner.ts",
    repositoryRelativePath:
      "tests/e2e/hk-visualization-text-contrast-scanner.ts",
  },
  {
    relativePath: "hk-visualization-scanner-six-case-contract.test.mjs",
    repositoryRelativePath:
      "tests/e2e/hk-visualization-scanner-six-case-contract.test.mjs",
  },
] as const;
const observedScannerPackageAggregateSha256 = (() => {
  const aggregate = createHash("sha256");
  for (const { relativePath, repositoryRelativePath } of scannerPackageEntries) {
    aggregate.update(repositoryRelativePath, "utf8");
    aggregate.update(Uint8Array.of(0));
    aggregate.update(readFileSync(`${__dirname}/${relativePath}`));
  }
  return aggregate.digest("hex");
})();
if (observedScannerPackageAggregateSha256 !== scannerPackageAggregateSha256) {
  fail(
    `G05 scanner package aggregate drifted; expected=${scannerPackageAggregateSha256} actual=${observedScannerPackageAggregateSha256}.`,
  );
}

assertExactSet("G05 Mainland production registry", MAINLAND_PERCENT_APPLICATIONS_LAB_IDS, exactLabIds);

function runtimeCase(
  labId: PercentApplicationsLabId,
  publisher: RuntimeCase["publisher"],
  track: RuntimeCase["track"],
): RuntimeCase {
  const lab = getVisualizationLabByLabId(labId);
  if (!lab) fail(`${labId}: catalog row is missing.`);
  if (
    lab.labId !== labId ||
    lab.topicId !== labId ||
    lab.moduleId !== configuredModuleId ||
    lab.publisher !== publisher ||
    lab.curriculumTrack !== track ||
    lab.templateId !== "fraction-bar"
  ) {
    fail(`${labId}: catalog identity drifted.`);
  }
  const pinnedModes = expectedTopicModeControlTable[labId].modes;
  if (JSON.stringify(PERCENT_APPLICATIONS_MODE_ALLOWLIST[labId]) !== JSON.stringify(pinnedModes)) {
    fail(
      `${labId}: production mode allowlist drifted from the independent topic table.`,
    );
  }
  for (const mode of pinnedModes) {
    const contract = percentApplicationsControlContractFor(mode, "increase");
    const pinnedControls = (
      expectedTopicModeControlTable[labId].controls as Partial<
        Record<PercentApplicationsMode, readonly string[]>
      >
    )[mode];
    if (!pinnedControls) {
      fail(`${labId}:${mode}: missing exact topic control row.`);
    }
    if (JSON.stringify(contract.visibleControls) !== JSON.stringify(pinnedControls)) {
      fail(
        `${labId}:${mode}: production controls drifted from the independent topic table.`,
      );
    }
  }
  return {
    lab,
    labId,
    modes: pinnedModes,
    publisher,
    track,
  };
}

const runtimeCases = [
  runtimeCase(
    "bnu-primary-p6-upper-percentage-applications",
    "MAINLAND_BNU",
    "MAINLAND_BNU",
  ),
  runtimeCase(
    "pep-primary-p6-upper-percent-fractions",
    "MAINLAND_PEP",
    "MAINLAND_PEP_PRIMARY",
  ),
] as const;

function numericParameters(
  runtime: RuntimeCase,
  mode: PercentApplicationsMode,
): readonly ("amount" | "base" | "new-value" | "rate-basis-points")[] {
  const controls = (
    expectedTopicModeControlTable[runtime.labId].controls as Partial<
      Record<PercentApplicationsMode, readonly string[]>
    >
  )[mode];
  if (!controls) fail(`${runtime.labId}:${mode}: missing planner control row.`);
  return controls.filter(
    (
      control,
    ): control is "amount" | "base" | "new-value" | "rate-basis-points" =>
      control !== "inverse-direction",
  );
}

function dynamicSequence(scenario: DynamicScenario): StatePlan[] {
  const atomicGroup = `dynamic:${scenario}`;
  const steps = scenario === "inverse-decrease-max"
    ? [
        "permissive-high",
        "project-controller",
        "reject-direct-high",
        "leave-bounded",
        "reenter-no-resurrection",
      ]
    : [
        "permissive-outside",
        "project-controller",
        "reject-direct-outside",
        "leave-bounded",
        "reenter-no-resurrection",
      ];
  return steps.map((step) => ({
    atomicGroup,
    id: `dynamic:${scenario}:${step}`,
    kind: "dynamic" as const,
    scenario,
    step,
  }));
}

function statePlans(runtime: RuntimeCase): readonly StatePlan[] {
  const plans: StatePlan[] = [{ id: "initial", kind: "initial" }];
  for (const mode of runtime.modes) {
    plans.push({ id: `mode:${mode}`, kind: "mode", mode });
    for (const parameter of numericParameters(runtime, mode)) {
      const directions: readonly (PercentChangeDirection | undefined)[] =
        mode === "inverse" && parameter === "rate-basis-points"
          ? ["increase", "decrease"]
          : [undefined];
      for (const direction of directions) {
        for (const endpoint of endpoints) {
          plans.push({
            direction,
            endpoint,
            id: `range:${mode}:${parameter}:${endpoint}${direction ? `:${direction}` : ""}`,
            kind: "range",
            mode,
            parameter,
          });
        }
      }
    }
    if (mode === "inverse") {
      for (const direction of ["increase", "decrease"] as const) {
        plans.push({
          direction,
          id: `direction:inverse:${direction}`,
          kind: "direction",
          mode: "inverse",
        });
      }
    }
  }
  plans.push(...dynamicSequence("find-whole-min"));
  plans.push(...dynamicSequence("decrease-max"));
  plans.push(...dynamicSequence("discount-max"));
  if (runtime.modes.includes("inverse")) {
    plans.push(...dynamicSequence("inverse-decrease-max"));
  }
  if (runtime.modes.includes("convert")) {
    plans.push({ id: "special:conversion-partial", kind: "conversion-partial" });
  }
  plans.push({ id: "reset", kind: "reset" });
  return plans;
}

function groupedPlans(plans: readonly StatePlan[]) {
  const groups: StatePlan[][] = [];
  for (const plan of plans) {
    const prior = groups.at(-1);
    if (plan.atomicGroup && prior?.[0]?.atomicGroup === plan.atomicGroup) prior.push(plan);
    else groups.push([plan]);
  }
  return groups;
}

function chunkRuntime(runtime: RuntimeCase): readonly RuntimeChunk[] {
  const chunks: StatePlan[][] = [];
  let current: StatePlan[] = [];
  for (const group of groupedPlans(statePlans(runtime))) {
    if (group.length > maximumStatesPerChunk) fail(`${runtime.labId}: atomic group exceeds max32.`);
    if (current.length > 0 && current.length + group.length > maximumStatesPerChunk) {
      chunks.push(current);
      current = [];
    }
    current.push(...group);
  }
  if (current.length > 0) chunks.push(current);
  return chunks.map((plans, index) => ({
    id: `${runtime.labId}:chunk-${String(index + 1).padStart(2, "0")}-of-${String(chunks.length).padStart(2, "0")}`,
    index,
    plans,
    runtime,
    total: chunks.length,
  }));
}

const runtimeChunks = runtimeCases.flatMap(chunkRuntime);
const expectedChunkIds = runtimeChunks.map((chunk) => chunk.id);
const expectedStateIds = runtimeChunks.flatMap((chunk) =>
  chunk.plans.map((plan) => `${chunk.runtime.labId}:${plan.id}`),
);
const expectedTestTitles = runtimeChunks.map(
  (chunk) => `G05 ${chunk.id} audits ${chunk.plans.length} exact states`,
);
const expectedStateCountPerProject = 126;
const expectedChunkCountPerProject = 5;
const expectedCanonicalExecutionCount = 10;
const expectedChunkStateCounts = new Map<PercentApplicationsLabId, readonly number[]>([
  ["bnu-primary-p6-upper-percentage-applications", [32, 31, 6]],
  ["pep-primary-p6-upper-percent-fractions", [32, 25]],
]);

for (const runtime of runtimeCases) {
  const actual = runtimeChunks
    .filter((chunk) => chunk.runtime.labId === runtime.labId)
    .map((chunk) => chunk.plans.length);
  const expected = expectedChunkStateCounts.get(runtime.labId);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${runtime.labId}: chunk receipt drifted; expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}.`);
  }
  const finalPlan = statePlans(runtime).at(-1);
  const finalChunkPlan = runtimeChunks
    .filter((chunk) => chunk.runtime.labId === runtime.labId)
    .at(-1)
    ?.plans.at(-1);
  if (finalPlan?.kind !== "reset" || finalChunkPlan?.kind !== "reset") {
    fail(`${runtime.labId}: Reset must remain the exact terminal state.`);
  }
}

function staticEndpointValue(
  mode: PercentApplicationsMode,
  parameter: PercentApplicationsNumericControlId,
  endpoint: Endpoint,
  direction: PercentChangeDirection = "increase",
) {
  const domain = parameter === "rate-basis-points"
    ? percentApplicationsControlContractFor(mode, direction).rate
    : { max: 1_000_000, min: 0, step: 1 };
  if (endpoint === "min") return domain.min;
  if (endpoint === "max") return domain.max;
  return domain.min +
    Math.floor((domain.max - domain.min) / domain.step / 2) * domain.step;
}

function staticDynamicMode(
  plan: Extract<StatePlan, { kind: "dynamic" }>,
): PercentApplicationsMode {
  if (plan.scenario === "inverse-decrease-max") return "inverse";
  if (plan.step === "permissive-outside" || plan.step === "leave-bounded") {
    return "increase";
  }
  if (plan.scenario === "find-whole-min") return "find-whole";
  if (plan.scenario === "decrease-max") return "decrease";
  return "discount";
}

function staticPlanMode(
  runtime: RuntimeCase,
  plan: StatePlan,
): PercentApplicationsMode {
  if (plan.kind === "initial" || plan.kind === "reset") {
    return resetState(runtime).mode;
  }
  if (plan.kind === "mode" || plan.kind === "range") return plan.mode;
  if (plan.kind === "direction") return "inverse";
  if (plan.kind === "conversion-partial") return "convert";
  return staticDynamicMode(plan);
}

function staticPlanRequest(
  runtime: RuntimeCase,
  plan: StatePlan,
): PlannedRequest {
  if (plan.kind === "initial") return { kind: "initial" };
  if (plan.kind === "reset") return { kind: "reset" };
  if (plan.kind === "conversion-partial") {
    return {
      controlId: "rate-basis-points",
      kind: "control",
      value: 1_250,
    };
  }
  if (plan.kind === "mode") {
    return {
      controllerId: "mode",
      kind: "controller",
      value: plan.mode,
    };
  }
  if (plan.kind === "direction") {
    return {
      controllerId: "inverse-direction",
      kind: "controller",
      value: plan.direction,
    };
  }
  if (plan.kind === "range") {
    return {
      controlId: plan.parameter,
      kind: "control",
      value: staticEndpointValue(
        plan.mode,
        plan.parameter,
        plan.endpoint,
        plan.direction,
      ),
    };
  }

  const isMinimum = plan.scenario === "find-whole-min";
  const outsideValue = isMinimum ? 0 : 50_000;
  const boundedMode = staticDynamicMode({
    ...plan,
    step: "project-controller",
  });
  if (
    plan.step === "permissive-outside" ||
    plan.step === "permissive-high" ||
    plan.step === "reject-direct-outside" ||
    plan.step === "reject-direct-high"
  ) {
    return {
      controlId: "rate-basis-points",
      kind: "control",
      value: outsideValue,
    };
  }
  if (plan.scenario === "inverse-decrease-max") {
    return {
      controllerId: "inverse-direction",
      kind: "controller",
      value: plan.step === "leave-bounded" ? "increase" : "decrease",
    };
  }
  return {
    controllerId: "mode",
    kind: "controller",
    value: plan.step === "leave-bounded" ? "increase" : boundedMode,
  };
}

function plannedStateDescriptor(
  runtime: RuntimeCase,
  plan: StatePlan,
): PlannedStateDescriptor {
  const request = staticPlanRequest(runtime, plan);
  const controlParameter = request.kind === "control"
    ? request.controlId
    : request.kind === "controller"
      ? request.controllerId
      : null;
  return {
    labId: runtime.labId,
    plan: {
      controlParameter,
      kind: request.kind,
      mode: staticPlanMode(runtime, plan),
      request,
    },
    stateId: `${runtime.labId}:${plan.id}`,
  };
}

const expectedStateDescriptors = runtimeChunks.flatMap((chunk) =>
  chunk.plans.map((plan) => plannedStateDescriptor(chunk.runtime, plan)),
);
const expectedStateDescriptorById = new Map(
  expectedStateDescriptors.map((descriptor) => [descriptor.stateId, descriptor]),
);

function canonicalDescriptorLines(
  descriptors: readonly PlannedStateDescriptor[],
) {
  return `${descriptors.map(validatorCanonicalJson).join("\n")}\n`;
}

function assertDescriptorPlan(
  descriptors: readonly PlannedStateDescriptor[],
  expectedBytes = canonicalDescriptorLines(expectedStateDescriptors),
) {
  if (descriptors.length !== expectedStateCountPerProject) {
    fail(`G05 descriptor count drifted; actual=${descriptors.length}.`);
  }
  for (const [index, descriptor] of descriptors.entries()) {
    const expected = expectedStateDescriptors[index];
    if (
      !expected ||
      validatorCanonicalJson(descriptor) !== validatorCanonicalJson(expected)
    ) {
      fail(`G05 descriptor semantics drifted at index ${index}.`);
    }
    assertExactSet(
      `G05 descriptor ${index} keys`,
      Object.keys(descriptor),
      ["labId", "plan", "stateId"],
    );
    assertExactSet(
      `G05 descriptor ${index} plan keys`,
      Object.keys(descriptor.plan),
      ["controlParameter", "kind", "mode", "request"],
    );
    if (!descriptor.stateId.startsWith(`${descriptor.labId}:`)) {
      fail(`G05 descriptor ${index} lab/state binding drifted.`);
    }
    const request = descriptor.plan.request;
    if (request.kind === "control") {
      assertExactSet(
        `G05 descriptor ${index} control request keys`,
        Object.keys(request),
        ["controlId", "kind", "value"],
      );
      if (descriptor.plan.controlParameter !== request.controlId) {
        fail(`G05 descriptor ${index} lost its exact controlId identity.`);
      }
    } else if (request.kind === "controller") {
      assertExactSet(
        `G05 descriptor ${index} controller request keys`,
        Object.keys(request),
        ["controllerId", "kind", "value"],
      );
      if (descriptor.plan.controlParameter !== request.controllerId) {
        fail(`G05 descriptor ${index} lost its exact controllerId identity.`);
      }
    } else {
      assertExactSet(
        `G05 descriptor ${index} ${request.kind} request keys`,
        Object.keys(request),
        ["kind"],
      );
      if (descriptor.plan.controlParameter !== null) {
        fail(`G05 descriptor ${index} ${request.kind} gained a fake control.`);
      }
    }
  }
  const bytes = canonicalDescriptorLines(descriptors);
  if (bytes !== expectedBytes) {
    fail("G05 descriptor canonical JSON-lines bytes drifted.");
  }
  return createHash("sha256").update(bytes).digest("hex");
}

function assertDescriptorMutationCanaries() {
  const clone = () =>
    JSON.parse(JSON.stringify(expectedStateDescriptors)) as PlannedStateDescriptor[];
  const mustReject = (
    label: string,
    mutate: (candidate: PlannedStateDescriptor[]) => void,
  ) => {
    const candidate = clone();
    mutate(candidate);
    try {
      assertDescriptorPlan(candidate);
    } catch {
      return;
    }
    fail(`G05 descriptor mutation canary accepted ${label}.`);
  };

  mustReject("cross-topic labId", (candidate) => {
    candidate[0] = { ...candidate[0]!, labId: exactLabIds[1] };
  });
  mustReject("request/state mismatch", (candidate) => {
    const left = candidate.findIndex(({ plan }) => plan.kind === "control");
    const right = candidate.findIndex(
      ({ plan }, index) => index > left && plan.kind === "control",
    );
    candidate[left] = {
      ...candidate[left]!,
      plan: {
        ...candidate[left]!.plan,
        request: candidate[right]!.plan.request,
      },
    };
  });
  mustReject("descriptor order", (candidate) => {
    [candidate[0], candidate[1]] = [candidate[1]!, candidate[0]!];
  });
  mustReject("G05 group-exact controlId alias", (candidate) => {
    const index = candidate.findIndex(({ plan }) => plan.kind === "control");
    const descriptor = candidate[index]!;
    const request = descriptor.plan.request;
    if (request.kind !== "control") {
      fail("G05 control alias canary has no control request.");
    }
    candidate[index] = {
      ...descriptor,
      plan: {
        ...descriptor.plan,
        request: {
          control: request.controlId,
          kind: request.kind,
          value: request.value,
        } as unknown as PlannedRequest,
      },
    };
  });
  mustReject("G05 group-exact controllerId alias", (candidate) => {
    const index = candidate.findIndex(({ plan }) => plan.kind === "controller");
    const descriptor = candidate[index]!;
    const request = descriptor.plan.request;
    if (request.kind !== "controller") {
      fail("G05 controller alias canary has no controller request.");
    }
    candidate[index] = {
      ...descriptor,
      plan: {
        ...descriptor.plan,
        request: {
          controller: request.controllerId,
          kind: request.kind,
          value: request.value,
        } as unknown as PlannedRequest,
      },
    };
  });

  const canonicalBytes = canonicalDescriptorLines(expectedStateDescriptors);
  if (!canonicalBytes.endsWith("\n")) {
    fail("G05 descriptor builder omitted its final LF.");
  }
  let finalLfRejected = false;
  try {
    assertDescriptorPlan(expectedStateDescriptors, canonicalBytes.slice(0, -1));
  } catch {
    finalLfRejected = true;
  }
  if (!finalLfRejected) {
    fail("G05 descriptor final-LF mutation canary was accepted.");
  }
  const insertionOrderBytes = `${expectedStateDescriptors.map((descriptor) =>
    JSON.stringify({
      stateId: descriptor.stateId,
      plan: descriptor.plan,
      labId: descriptor.labId,
    })
  ).join("\n")}\n`;
  if (
    insertionOrderBytes === canonicalBytes ||
    createHash("sha256").update(insertionOrderBytes).digest("hex") ===
      createHash("sha256").update(canonicalBytes).digest("hex")
  ) {
    fail("G05 descriptor canonical-key-order mutation canary is insensitive.");
  }
}

assertDescriptorMutationCanaries();
const observedStateDescriptorPlanSha256 = assertDescriptorPlan(
  expectedStateDescriptors,
);
if (observedStateDescriptorPlanSha256 !== expectedStateDescriptorPlanSha256) {
  fail(
    `G05 ordered semantic descriptor plan SHA drifted; expected=${expectedStateDescriptorPlanSha256} actual=${observedStateDescriptorPlanSha256}.`,
  );
}

if (expectedStateIds.length !== expectedStateCountPerProject) {
  fail(`G05 state count must be ${expectedStateCountPerProject}; actual=${expectedStateIds.length}.`);
}
if (runtimeChunks.length !== expectedChunkCountPerProject) {
  fail(`G05 chunk count must be ${expectedChunkCountPerProject}; actual=${runtimeChunks.length}.`);
}
if (expectedChunkCountPerProject * supportedProjects.length !== expectedCanonicalExecutionCount) {
  fail("G05 canonical desktop/mobile execution count drifted.");
}
if (new Set(expectedStateIds).size !== expectedStateIds.length) fail("G05 duplicate state IDs.");
if (new Set(expectedTestTitles).size !== expectedTestTitles.length) fail("G05 duplicate test titles.");
const observedStatePlanSha256 = createHash("sha256")
  .update(`${expectedStateIds.join("\n")}\n`)
  .digest("hex");
const observedTopicModeControlTableSha256 = createHash("sha256")
  .update(`${JSON.stringify(expectedTopicModeControlTable)}\n`)
  .digest("hex");
if (observedStatePlanSha256 !== expectedStatePlanSha256) {
  fail(
    `G05 ordered state plan SHA drifted; expected=${expectedStatePlanSha256} actual=${observedStatePlanSha256}.`,
  );
}
if (observedTopicModeControlTableSha256 !== expectedTopicModeControlTableSha256) {
  fail(
    `G05 topic-mode-control table SHA drifted; expected=${expectedTopicModeControlTableSha256} actual=${observedTopicModeControlTableSha256}.`,
  );
}

function themeForChunkProject(
  chunkIndex: number,
  project: (typeof supportedProjects)[number],
) {
  return (project === "desktop-chrome") === (chunkIndex % 2 === 0)
    ? "light"
    : "dark";
}

for (const chunk of runtimeChunks) {
  const canonicalThemes = supportedProjects
    .map((project) => themeForChunkProject(chunk.index, project))
    .sort();
  if (JSON.stringify(canonicalThemes) !== JSON.stringify(["dark", "light"])) {
    fail(`${chunk.id}: canonical project pair must audit both light and dark.`);
  }
}

const ownSource = readFileSync(__filename, "utf8");
function assertProducerSourceSha256SourceContract(source: string) {
  const importContracts = [
    [
      "createHash import",
      /import\s*\{\s*createHash\s*\}\s*from\s*"node:crypto";/u,
    ],
    [
      "readFileSync import",
      /import\s*\{\s*readFileSync\s*\}\s*from\s*"node:fs";/u,
    ],
  ] as const;
  for (const [label, pattern] of importContracts) {
    if (!pattern.test(source)) {
      fail(`G05 producer source SHA contract is missing ${label}.`);
    }
  }

  const dynamicDeclaration = [
    'const producerSourceSha256 = createHash("sha256")',
    "  .update(readFileSync(__filename))",
    '  .digest("hex");',
  ].join("\n");
  if (source.split(dynamicDeclaration).length !== 2) {
    fail(
      "G05 producer source SHA contract requires one dynamic hash of raw readFileSync(__filename) bytes.",
    );
  }

  const dependencyMapStart = source.indexOf(
    "const integrationSourceSha256 = Object.freeze({",
  );
  const dependencyMapEnd = source.indexOf(
    "\n});\nassertCanonicalEqual(",
    dependencyMapStart,
  );
  if (dependencyMapStart < 0 || dependencyMapEnd <= dependencyMapStart) {
    fail("G05 producer source SHA contract cannot bound the dependency map.");
  }
  if (
    source
      .slice(dependencyMapStart, dependencyMapEnd)
      .includes("producerSourceSha256")
  ) {
    fail(
      "G05 producer source SHA must remain outside integrationSourceSha256 dependencies.",
    );
  }

  const exactAttachmentSibling = [
    "          integrationSourceSha256,",
    "          producerSourceSha256,",
    "          observedMutationWrites: writes,",
  ].join("\n");
  if (source.split(exactAttachmentSibling).length !== 2) {
    fail(
      "G05 producerSourceSha256 must be one exact top-level attachment field immediately after integrationSourceSha256.",
    );
  }
}

function assertProducerSourceSha256SourceMutationCanaries(source: string) {
  const mustReject = (
    label: string,
    mutate: (candidate: string) => string,
  ) => {
    const candidate = mutate(source);
    if (candidate === source) {
      fail(`G05 producer source SHA canary could not inject ${label}.`);
    }
    try {
      assertProducerSourceSha256SourceContract(candidate);
    } catch {
      return;
    }
    fail(`G05 producer source SHA canary accepted ${label}.`);
  };

  const dynamicDeclaration = [
    'const producerSourceSha256 = createHash("sha256")',
    "  .update(readFileSync(__filename))",
    '  .digest("hex");',
  ].join("\n");
  mustReject("producerSourceSha256 omission", (candidate) =>
    candidate.replace("\n          producerSourceSha256,", ""),
  );
  mustReject("static producerSourceSha256 literal", (candidate) =>
    candidate.replace(
      dynamicDeclaration,
      `const producerSourceSha256 = "${"0".repeat(64)}";`,
    ),
  );
  mustReject("foreign-or-controlled producer source path", (candidate) =>
    candidate.replace(
      "readFileSync(__filename)",
      "readFileSync(process.env.G05_PRODUCER_SOURCE_PATH ?? __filename)",
    ),
  );
  mustReject("weak producer source text read", (candidate) =>
    candidate.replace(
      "readFileSync(__filename)",
      'readFileSync(__filename, "utf8")',
    ),
  );
}

assertProducerSourceSha256SourceContract(ownSource);
assertProducerSourceSha256SourceMutationCanaries(ownSource);
function assertDurabilityDescriptorSourceContract(source: string) {
  const importContracts = [
    [
      "lesson slug resolver import",
      /import\s*\{\s*lessonSlugForTopicId\s*\}\s*from\s*"\.\.\/\.\.\/lib\/lessonLinks";/u,
    ],
    [
      "approved durability browser adapter import",
      /import\s*\{[^}]*createVisualizationLessonDurabilityBrowserAdapter[^}]*prepareVisualizationLessonLearnerProfileBeforeArm[^}]*VisualizationLessonDurabilityFinalReceipt[^}]*\}\s*from\s*"\.\/visualization-lesson-session-durability-browser";/u,
    ],
  ] as const;
  for (const [label, pattern] of importContracts) {
    if (!pattern.test(source)) {
      fail(`G05 durability/descriptor source contract is missing ${label}.`);
    }
  }

  const runtimeStart = source.lastIndexOf(
    'test.describe("Mainland G05 percent applications production route acceptance"',
  );
  if (runtimeStart < 0) {
    fail("G05 durability/descriptor source contract cannot locate the runtime suite.");
  }
  const runtimeSource = source.slice(runtimeStart);
  const lifecycle = [
    "await prepareVisualizationLessonLearnerProfileBeforeArm({",
    "createVisualizationLessonDurabilityBrowserAdapter({",
    "await durability.armBeforeNavigation({ learnerProfileSetup })",
    "await page.goto(`/student/lessons/${encodeURIComponent(lessonSlug)}`",
    "await durability.waitForMountTerminal({",
    "const durabilityProbe = await runExactDurabilityProbe({",
    "await durability.replayFirstDeliveryExactly({",
    "await durability.finalReceipt()",
  ] as const;
  let priorIndex = -1;
  for (const step of lifecycle) {
    const index = runtimeSource.indexOf(step);
    if (index <= priorIndex) {
      fail(
        `G05 durability lifecycle is absent or out of order before Chrome: ${step}.`,
      );
    }
    priorIndex = index;
  }
  for (const [label, pattern] of [
    ["planned semantic descriptors", /plannedStateDescriptors\.push\s*\(/u],
    ["descriptor-plan SHA attachment", /expectedStateDescriptorPlanSha256,/u],
    ["durability receipt attachment", /durabilityReceipts\s*:/u],
    ["actual probe receipt attachment", /probe\s*:\s*durabilityProbe,/u],
    [
      "raw replay exact report count",
      /expectedCountAcrossReport\s*:\s*expectedRawReplayCountAcrossReport,/u,
    ],
    [
      "raw replay exact projects",
      /expectedProjects\s*:\s*expectedRawReplayProjects,/u,
    ],
    [
      "raw replay exact topics",
      /expectedTopicIds\s*:\s*exactLabIds,/u,
    ],
    [
      "raw replay inclusion decision",
      /included\s*:\s*rawReplayRepresentative,/u,
    ],
    [
      "raw replay representative rule",
      /representativeRule\s*:\s*\n\s*"desktop-chrome:first-canonical-chunk-per-g05-topic",/u,
    ],
    [
      "desktop chunk-zero raw replay selector",
      /const\s+rawReplayRepresentative\s*=\s*\n\s*testInfo\.project\.name\s*===\s*"desktop-chrome"\s*&&\s*chunk\.index\s*===\s*0;/u,
    ],
    ["integration leaf SHA attachment", /integrationSourceSha256,/u],
    ["source aggregate attachment", /sourceAggregates\s*:/u],
    [
      "durability pair aggregate attachment",
      /durabilityBrowserPairSha256\s*:\s*\n\s*observedDurabilityBrowserPairAggregateSha256,/u,
    ],
    [
      "durability four-file aggregate attachment",
      /durabilityFourFileSha256\s*:\s*\n\s*observedDurabilityFourFileAggregateSha256,/u,
    ],
    [
      "scanner aggregate attachment",
      /scannerSha256\s*:\s*observedScannerPackageAggregateSha256,/u,
    ],
    [
      "schema v3 attachment",
      /schemaVersion\s*:\s*"china-mainland-g05-percent-applications-production\.v3"/u,
    ],
    [
      "catalog analytics source",
      /source\s*:\s*chunk\.runtime\.lab\.analyticsSource/u,
    ],
  ] as const) {
    if (!pattern.test(runtimeSource)) {
      fail(`G05 durability/descriptor runtime contract is missing ${label}.`);
    }
  }
  for (const [label, pattern] of [
    ["post-navigation onboarding reload", /closeLearnerStartSetupIfVisible\s*\(/u],
    ["fixed mount wait", /page\.waitForTimeout\(5_500\)/u],
    ["generic lesson analytics source", /source\s*:\s*"lesson"/u],
    [
      "topic-id-as-lesson-slug navigation",
      /page\.goto\(\s*`\/student\/lessons\/\$\{encodeURIComponent\(chunk\.runtime\.labId\)\}`/u,
    ],
  ] as const) {
    if (pattern.test(runtimeSource)) {
      fail(`G05 durability/descriptor runtime contract forbids ${label}.`);
    }
  }
}

function assertSourceFailFirstMutation(source: string) {
  const marker =
    'schemaVersion: "china-mainland-g05-percent-applications-production.' +
    'v3"';
  if (source.split(marker).length !== 2) {
    fail("G05 source fail-first mutation requires one exact schema-v3 marker.");
  }
  const mutated = source.replace(
    marker,
    'schemaVersion: "china-mainland-g05-percent-applications-production.v2"',
  );
  try {
    assertDurabilityDescriptorSourceContract(mutated);
  } catch {
    return;
  }
  fail("G05 source fail-first mutation was accepted.");
}

function assertAttachmentPinMutationCanaries(source: string) {
  const mustReject = (label: string, honest: string, forged: string) => {
    const runtimeStart = source.lastIndexOf(
      'test.describe("Mainland G05 percent applications production route acceptance"',
    );
    const runtimeSource = source.slice(runtimeStart);
    const mutatedRuntime = runtimeSource.replace(honest, forged);
    if (runtimeStart < 0 || mutatedRuntime === runtimeSource) {
      fail(`G05 attachment-pin mutation canary could not inject ${label}.`);
    }
    const mutated = `${source.slice(0, runtimeStart)}${mutatedRuntime}`;
    try {
      assertDurabilityDescriptorSourceContract(mutated);
    } catch {
      return;
    }
    fail(`G05 attachment-pin mutation canary accepted ${label}.`);
  };
  mustReject(
    "mobile raw replay",
    'testInfo.project.name === "desktop-chrome" && chunk.index === 0;',
    'testInfo.project.name === "mobile-chrome" && chunk.index === 0;',
  );
  mustReject(
    "non-first raw replay chunk",
    'testInfo.project.name === "desktop-chrome" && chunk.index === 0;',
    'testInfo.project.name === "desktop-chrome" && chunk.index === 1;',
  );
  mustReject("actual probe receipt", "probe: durabilityProbe,", "probe: {},");
  mustReject(
    "raw representative rule",
    '"desktop-chrome:first-canonical-chunk-per-g05-topic",',
    '"desktop-chrome:any-chunk-per-g05-topic",',
  );
  mustReject(
    "durability pair aggregate",
    "observedDurabilityBrowserPairAggregateSha256,",
    "durabilityBrowserPairAggregateSha256,",
  );
  mustReject(
    "scanner aggregate",
    "scannerSha256: observedScannerPackageAggregateSha256,",
    "scannerSha256: scannerPackageAggregateSha256,",
  );
}

assertDurabilityDescriptorSourceContract(ownSource);
assertSourceFailFirstMutation(ownSource);
assertAttachmentPinMutationCanaries(ownSource);

function exactDurabilityProbeSource(source: string) {
  const helperDeclaration = "\nasync function runExactDurabilityProbe(";
  const declarationStart = source.lastIndexOf(helperDeclaration);
  const helperStart = declarationStart + 1;
  const helperEnd = source.indexOf(
    "\nconst executedChunkIds",
    helperStart,
  );
  if (declarationStart < 0 || helperEnd <= helperStart) {
    fail("G05 exact durability probe helper is absent or unbounded.");
  }
  return {
    end: helperEnd,
    source: source.slice(helperStart, helperEnd),
    start: helperStart,
  };
}

function firstSessionAcknowledgementSource(source: string) {
  const helperDeclaration = "\nasync function awaitFirstSessionAck(";
  const declarationStart = source.lastIndexOf(helperDeclaration);
  const helperStart = declarationStart + 1;
  const helperEnd = source.indexOf(
    "\nasync function runExactDurabilityProbe(",
    helperStart,
  );
  if (declarationStart < 0 || helperEnd <= helperStart) {
    fail("G05 first-session acknowledgement helper is absent or unbounded.");
  }
  return {
    end: helperEnd,
    source: source.slice(helperStart, helperEnd),
    start: helperStart,
  };
}

function assertFirstSessionAcknowledgementSourceContract(source: string) {
  const acknowledgement = firstSessionAcknowledgementSource(source);
  const defects: string[] = [];
  if (
    !acknowledgement.source.includes(
      'expect(response.headers()["content-type"]).toBe("application/json");',
    )
  ) {
    defects.push("exact application/json response Content-Type is absent");
  }
  if (
    acknowledgement.source.includes(
      "delivery.session.completedAt !== null",
    ) ||
    !acknowledgement.source.includes(
      'typeof delivery.session.completedAt !== "string"',
    ) ||
    !acknowledgement.source.includes(
      "delivery.session.completedAt !== delivery.session.updatedAt",
    ) ||
    !acknowledgement.source.includes(
      "new Date(delivery.session.completedAt).toISOString() !==",
    ) ||
    !acknowledgement.source.includes(
      "completedAt: delivery.session.completedAt,",
    )
  ) {
    defects.push(
      "honest canonical completedAt equal to updatedAt is rejected or not exactly bound",
    );
  }
  if (defects.length > 0) {
    fail(`G05 first-session ACK source RED: ${defects.join("; ")}.`);
  }

  const orderedSteps = [
    "expect(response.status()).toBe(200);",
    'expect(response.headers()["content-type"]).toBe("application/json");',
    "const responseUrl = new URL(response.url());",
    'expect(responseUrl.pathname).toBe("/api/visualization-sessions");',
    'expect(responseUrl.search).toBe("");',
    'expect(responseUrl.hash).toBe("");',
    "const request = response.request();",
    'expect(request.method()).toBe("POST");',
    'request.headers()["x-mais-visualization-user-id"]',
    "expect(requestBody(request)).toEqual({",
    "const delivery = await readJson<unknown>(",
    "if (!isRecord(delivery) || !isRecord(delivery.session)) {",
    '`${runtime.labId}: first interaction ACK keys`,',
    '["acknowledgedUserId", "durablyPersisted", "session"],',
    '`${runtime.labId}: first interaction ACK session keys`,',
    '["completedAt", "explored", "moduleId", "source", "topicId", "updatedAt"],',
    'typeof delivery.session.updatedAt !== "string" ||',
    'new Date(delivery.session.updatedAt).toISOString() !==',
    'typeof delivery.session.completedAt !== "string" ||',
    'new Date(delivery.session.completedAt).toISOString() !==',
    "delivery.session.completedAt !== delivery.session.updatedAt",
    "const exactDelivery = {",
    "completedAt: delivery.session.completedAt,",
    "expect(delivery).toEqual(exactDelivery);",
    "return exactDelivery;",
  ] as const;
  let priorIndex = -1;
  for (const step of orderedSteps) {
    const index = acknowledgement.source.indexOf(step, priorIndex + 1);
    if (index <= priorIndex) {
      fail(
        `G05 strict first-session ACK step is absent or out of order: ${step}.`,
      );
    }
    priorIndex = index;
  }
  if (/\.toMatchObject\s*\(/u.test(acknowledgement.source)) {
    fail("G05 first-session ACK must use exact equality, not a partial match.");
  }
}

function assertFirstSessionAcknowledgementMutationCanaries(source: string) {
  const mustReject = (
    label: string,
    mutate: (helper: string) => string,
  ) => {
    const bounds = firstSessionAcknowledgementSource(source);
    const mutatedHelper = mutate(bounds.source);
    if (mutatedHelper === bounds.source) {
      fail(`G05 first-session ACK mutation canary could not inject ${label}.`);
    }
    const candidate =
      `${source.slice(0, bounds.start)}${mutatedHelper}${source.slice(bounds.end)}`;
    try {
      assertFirstSessionAcknowledgementSourceContract(candidate);
    } catch {
      return;
    }
    fail(`G05 first-session ACK mutation canary accepted ${label}.`);
  };

  mustReject("omitted response Content-Type", (helper) =>
    helper.replace(
      'expect(response.headers()["content-type"]).toBe("application/json");',
      "",
    ),
  );
  mustReject("wrong response Content-Type", (helper) =>
    helper.replace(
      'toBe("application/json");',
      'toBe("application/json; charset=utf-8");',
    ),
  );
  mustReject("null completedAt", (helper) =>
    helper.replace(
      "completedAt: delivery.session.completedAt,",
      "completedAt: null,",
    ),
  );
  mustReject("absent completedAt key", (helper) =>
    helper.replace(
      '["completedAt", "explored", "moduleId", "source", "topicId", "updatedAt"],',
      '["explored", "moduleId", "source", "topicId", "updatedAt"],',
    ),
  );
  mustReject("mismatched completedAt", (helper) =>
    helper.replace(
      "delivery.session.completedAt !== delivery.session.updatedAt",
      "delivery.session.completedAt === delivery.session.updatedAt",
    ),
  );
  mustReject("invalid completedAt accepted", (helper) =>
    helper.replace(
      [
        "new Date(delivery.session.completedAt).toISOString() !==",
        "      delivery.session.completedAt ||",
      ].join("\n"),
      "false ||",
    ),
  );
}

assertFirstSessionAcknowledgementSourceContract(ownSource);
assertFirstSessionAcknowledgementMutationCanaries(ownSource);

function canonicalPlanLoopSource(source: string) {
  const suiteStart = source.lastIndexOf(
    'test.describe("Mainland G05 percent applications production route acceptance"',
  );
  const loopStart = source.indexOf(
    "for (const [planIndex, plan] of chunk.plans.entries()) {",
    suiteStart,
  );
  const loopEnd = source.indexOf("const actualStateIds =", loopStart);
  if (suiteStart < 0 || loopStart < suiteStart || loopEnd <= loopStart) {
    fail("G05 canonical state-plan loop is absent or unbounded.");
  }
  return {
    source: source.slice(loopStart, loopEnd),
    start: loopStart,
  };
}

function assertExactDurabilityProbeSourceContract(source: string) {
  const planLoop = canonicalPlanLoopSource(source);
  if (
    /durability\.(?:armRealControl|finishFirstRealControl|finishSecondRealControl)\s*\(/u
      .test(planLoop.source) ||
    /page\.waitForResponse\s*\(/u.test(planLoop.source)
  ) {
    fail(
      "G05 canonical state-plan loop must not own a durability fence or first-session waiter.",
    );
  }

  const helper = exactDurabilityProbeSource(source);
  const orderedSteps = [
    "const resetMode = resetState(runtime).mode;",
    "const probeMode = runtime.modes.find(",
    "expect(probeMode).not.toBe(resetMode);",
    "[data-viz-mode-active=\"false\"]",
    "await expect(modeButton).toBeEnabled();",
    'await expect(modeButton).toHaveAttribute("data-viz-mode-active", "false");',
    'await expect(modeButton).toHaveAttribute("aria-pressed", "false");',
    "const firstExpectedControl = {",
    "controlKey: probeMode,",
    'eventTypes: ["pointerup", "click"],',
    "const firstFence = await durability.armRealControl({",
    "expectedButtonClick: firstExpectedControl,",
    "ordinal: 1,",
    "const sessionPromise = page.waitForResponse(",
    "await modeButton.click();",
    "const sessionAcknowledgement = await awaitFirstSessionAck(",
    "const first = await durability.finishFirstRealControl({",
    "expect(first.expectedControl).toEqual(firstExpectedControl);",
    "expect(afterFirst.mode).toBe(probeMode);",
    "const secondExpectedControl = {",
    "controlKey: runtime.labId,",
    "const secondFence = await durability.armRealControl({",
    "expectedButtonClick: secondExpectedControl,",
    "ordinal: 2,",
    "await resetButton.click();",
    "const second = await durability.finishSecondRealControl({",
    "const controlObserverStop = second.controlObserverStop;",
    "expect(controlObserverStop).toEqual({",
    "active: false,",
    "eventCount: 4,",
    "events: [...first.controlEvents, ...second.controlEvents],",
    "removalCount: 1,",
    "removedExactlyOnce: true,",
    "const frozenEventCount = controlObserverStop.events.length;",
    "const ledgerFrozen =",
    "expect(frozenEventCount).toBe(4);",
    "expect(ledgerFrozen).toBe(true);",
    "await assertResetState(root, runtime);",
    "return {",
    "controlObserverStop,",
    "first,",
    "second,",
    "sessionAcknowledgement,",
  ] as const;
  let priorIndex = -1;
  for (const step of orderedSteps) {
    const index = helper.source.indexOf(step);
    if (index <= priorIndex) {
      fail(
        `G05 exact durability probe step is absent or out of order: ${step}.`,
      );
    }
    priorIndex = index;
  }

  const firstArm = helper.source.indexOf(
    "const firstFence = await durability.armRealControl({",
  );
  const firstFinish = helper.source.indexOf(
    "const first = await durability.finishFirstRealControl({",
  );
  const secondArm = helper.source.indexOf(
    "const secondFence = await durability.armRealControl({",
  );
  const secondFinish = helper.source.indexOf(
    "const second = await durability.finishSecondRealControl({",
  );
  const fencedWindows = [
    ["first", helper.source.slice(firstArm, firstFinish), "await modeButton.click();"],
    ["second", helper.source.slice(secondArm, secondFinish), "await resetButton.click();"],
  ] as const;
  for (const [label, window, exactClick] of fencedWindows) {
    const clicks = window.match(/\.click\s*\(/gu) ?? [];
    if (
      clicks.length !== 1 ||
      !window.includes(exactClick) ||
      /\.press\s*\(/u.test(window) ||
      /\b(?:reset|clickMode|setRange|clickDirection|executeNormal|executeDynamic)\s*\(/u
        .test(window)
    ) {
      fail(
        `G05 exact durability ${label} fence must contain exactly its named UI action and no prep action.`,
      );
    }
  }
  if (
    (helper.source.match(/durability\.armRealControl\s*\(/gu) ?? []).length !==
      2 ||
    (helper.source.match(/durability\.finishFirstRealControl\s*\(/gu) ?? [])
      .length !== 1 ||
    (helper.source.match(/durability\.finishSecondRealControl\s*\(/gu) ?? [])
      .length !== 1 ||
    (helper.source.match(/page\.waitForResponse\s*\(/gu) ?? []).length !== 1
  ) {
    fail("G05 exact durability probe lifecycle cardinality drifted.");
  }

  const suiteStart = source.lastIndexOf(
    'test.describe("Mainland G05 percent applications production route acceptance"',
  );
  const mountIndex = source.indexOf(
    "const mountDurability = await durability.waitForMountTerminal({",
    suiteStart,
  );
  const probeCallIndex = source.indexOf(
    "const durabilityProbe = await runExactDurabilityProbe({",
    suiteStart,
  );
  const replayIndex = source.indexOf(
    "await durability.replayFirstDeliveryExactly({",
    suiteStart,
  );
  const finalIndex = source.indexOf(
    "await durability.finalReceipt()",
    suiteStart,
  );
  if (
    mountIndex < suiteStart ||
    probeCallIndex <= mountIndex ||
    probeCallIndex >= planLoop.start ||
    replayIndex <= planLoop.start + planLoop.source.length ||
    finalIndex <= replayIndex ||
    source.indexOf("const durabilityProbe = await runExactDurabilityProbe({", probeCallIndex + 1) >= 0
  ) {
    fail(
      "G05 exact durability probe must run once after mount and before the canonical state ledger.",
    );
  }
  if (
    /controlIdentities\s*:/u.test(source.slice(suiteStart)) ||
    !source.slice(suiteStart).includes("probe: durabilityProbe,") ||
    !source.slice(suiteStart).includes(
      "expect(durabilityReceipt.controlObserverStop).toBe(",
    ) ||
    !source.slice(suiteStart).includes(
      "durabilityProbe.controlObserverStop,",
    ) ||
    !source.slice(suiteStart).includes(
      "expect(durabilityReceipt.second.controlObserverStop).toBe(",
    ) ||
    !source.slice(suiteStart).includes(
      "expect(durabilityReceipt.controlObserverStop).toBe(",
    ) ||
    !source.slice(suiteStart).includes(
      "durabilityReceipt.second.controlObserverStop,",
    ) ||
    !source.slice(suiteStart).includes(
      "expect(durabilityReceipt.controlObserverStop).toMatchObject({",
    ) ||
    !source.slice(suiteStart).includes(
      "expect(durabilityReceipt.expectedControl).toEqual({",
    ) ||
    !source.slice(suiteStart).includes(
      "expect(durabilityReceipt.controlEvents).toEqual({",
    ) ||
    !source.slice(suiteStart).includes(
      "const finalFrozenEventCount =",
    ) ||
    !source.slice(suiteStart).includes("const finalLedgerFrozen =")
  ) {
    fail(
      "G05 durability attachment must derive exact C11 stop/control evidence from probe receipts.",
    );
  }
}

function assertExactDurabilityProbeMutationCanaries(source: string) {
  const mustReject = (
    label: string,
    mutate: (candidate: string) => string,
  ) => {
    const candidate = mutate(source);
    if (candidate === source) {
      fail(`G05 exact durability mutation canary could not inject ${label}.`);
    }
    try {
      assertExactDurabilityProbeSourceContract(candidate);
    } catch {
      return;
    }
    fail(`G05 exact durability mutation canary accepted ${label}.`);
  };
  const mutateHelper = (
    candidate: string,
    mutate: (helper: string) => string,
  ) => {
    const bounds = exactDurabilityProbeSource(candidate);
    const mutatedHelper = mutate(bounds.source);
    return `${candidate.slice(0, bounds.start)}${mutatedHelper}${candidate.slice(bounds.end)}`;
  };
  const firstClick = "await modeButton.click();";
  const secondClick = "await resetButton.click();";
  for (const [label, prep] of [
    ["reset", "await reset(root, runtime);"],
    ["mode prep", 'await clickMode(root, "increase");'],
    ["range prep", "await setRange(modeButton, 1);"],
    ["direction prep", 'await clickDirection(root, "increase");'],
  ] as const) {
    mustReject(`first-fence ${label}`, (candidate) =>
      mutateHelper(candidate, (helper) =>
        helper.replace(firstClick, `${firstClick}\n  ${prep}`),
      ),
    );
    mustReject(`second-fence ${label}`, (candidate) =>
      mutateHelper(candidate, (helper) =>
        helper.replace(secondClick, `${secondClick}\n  ${prep}`),
      ),
    );
  }
  mustReject("wrong first control key", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace("controlKey: probeMode,", "controlKey: runtime.labId,"),
    ),
  );
  mustReject("wrong second control key", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace(
        "controlKey: runtime.labId,",
        "controlKey: probeMode,",
      ),
    ),
  );
  mustReject("missing expected button click", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace("expectedButtonClick: firstExpectedControl,", ""),
    ),
  );
  mustReject("wrong event tuple", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace(
        'eventTypes: ["pointerup", "click"],',
        'eventTypes: ["click", "pointerup"],',
      ),
    ),
  );
  mustReject("active-mode no-op", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace(
        "expect(probeMode).not.toBe(resetMode);",
        "expect(probeMode).toBe(resetMode);",
      ),
    ),
  );
  mustReject("active-mode locator", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace('[data-viz-mode-active="false"]', ""),
    ),
  );
  for (const [label, honest, forged] of [
    ["stop active", "active: false,", "active: true,"],
    ["stop event count", "eventCount: 4,", "eventCount: 3,"],
    ["stop removal count", "removalCount: 1,", "removalCount: 2,"],
    [
      "stop removed exactly once",
      "removedExactlyOnce: true,",
      "removedExactlyOnce: false,",
    ],
    [
      "frozen event count",
      "expect(frozenEventCount).toBe(4);",
      "expect(frozenEventCount).toBe(3);",
    ],
    [
      "frozen ledger",
      "expect(ledgerFrozen).toBe(true);",
      "expect(ledgerFrozen).toBe(false);",
    ],
  ] as const) {
    mustReject(label, (candidate) =>
      mutateHelper(candidate, (helper) => helper.replace(honest, forged)),
    );
  }
  for (const [label, injection] of [
    ["arm", "await durability.armRealControl({ ordinal: 1 });"],
    [
      "first finish",
      "await durability.finishFirstRealControl({ fence: firstFence, includeRaw: false, root });",
    ],
    [
      "second finish",
      "await durability.finishSecondRealControl({ fence: secondFence, root });",
    ],
    ["session waiter", "page.waitForResponse(() => true);"],
  ] as const) {
    mustReject(`plan-loop durability ${label}`, (candidate) => {
      const loop = canonicalPlanLoopSource(candidate);
      const mutatedLoop = loop.source.replace(
        "const stateId =",
        `${injection}\n        const stateId =`,
      );
      return `${candidate.slice(0, loop.start)}${mutatedLoop}${candidate.slice(loop.start + loop.source.length)}`;
    });
  }
  mustReject("self-authored control identities", (candidate) => {
    const loop = canonicalPlanLoopSource(candidate);
    const runtimeSource = candidate.slice(loop.start + loop.source.length);
    const mutatedRuntimeSource = runtimeSource.replace(
      "durabilityReceipts: {",
      "durabilityReceipts: { controlIdentities: {},",
    );
    return `${candidate.slice(0, loop.start + loop.source.length)}${mutatedRuntimeSource}`;
  });
  mustReject("final before canonical loop", (candidate) => {
    const finalStatement = [
      "const durabilityReceipt: VisualizationLessonDurabilityFinalReceipt =",
      "        await durability.finalReceipt();",
    ].join("\n");
    const withoutFinal = candidate.replace(finalStatement, "");
    return withoutFinal.replace(
      "const receipts: StateReceipt[] = [];",
      `${finalStatement}\n\n      const receipts: StateReceipt[] = [];`,
    );
  });
  mustReject("final before raw replay", (candidate) => {
    const finalStatement = [
      "const durabilityReceipt: VisualizationLessonDurabilityFinalReceipt =",
      "        await durability.finalReceipt();",
    ].join("\n");
    const withoutFinal = candidate.replace(finalStatement, "");
    return withoutFinal.replace(
      "if (rawReplayRepresentative) {",
      `${finalStatement}\n      if (rawReplayRepresentative) {`,
    );
  });
  mustReject("missing final stop identity", (candidate) => {
    const suiteStart = candidate.lastIndexOf(
      'test.describe("Mainland G05 percent applications production route acceptance"',
    );
    const runtimeSource = candidate.slice(suiteStart);
    return `${candidate.slice(0, suiteStart)}${runtimeSource.replace(
      "durabilityReceipt.second.controlObserverStop,",
      "durabilityProbe.controlObserverStop,",
    )}`;
  });
  mustReject("missing final frozen ledger evidence", (candidate) => {
    const suiteStart = candidate.lastIndexOf(
      'test.describe("Mainland G05 percent applications production route acceptance"',
    );
    const runtimeSource = candidate.slice(suiteStart);
    return `${candidate.slice(0, suiteStart)}${runtimeSource.replace(
      "const finalLedgerFrozen =",
      "const finalLedgerMutable =",
    )}`;
  });
}

assertExactDurabilityProbeSourceContract(ownSource);
assertExactDurabilityProbeMutationCanaries(ownSource);
function assertP0HardeningSourceContract(source: string) {
  const required = [
    ["typed action evidence", /type\s+ActionEvidence\s*=/u],
    ["independent state-plan SHA", /expectedStatePlanSha256\s*=/u],
    ["exact topic-mode-control table", /expectedTopicModeControlTable\s*=/u],
    ["canonical full-config guard", /function\s+assertCanonicalRunner\s*\(/u],
    ["pre-scan runtime signature", /runtimeSignatureBeforeScans/u],
    ["post-scan runtime signature", /runtimeSignatureAfterScans/u],
  ] as const;
  for (const [label, pattern] of required) {
    if (!pattern.test(source)) fail(`G05 P0 source contract is missing ${label}.`);
  }
}

assertP0HardeningSourceContract(ownSource);
for (const forbidden of [".sk" + "ip(", ".fix" + "me(", ".on" + "ly("]) {
  if (ownSource.includes(forbidden)) fail(`G05 source contains forbidden ${forbidden}.`);
}
assertMainlandFocusedCanonicalCli({
  requiredSpec:
    "tests/e2e/china-mainland-g05-percent-applications-production.spec.ts",
});
for (const argument of process.argv) {
  if (
    [
      "--grep",
      "--grep-invert",
      "--last-failed",
      "--max-failures",
      "--only-changed",
      "--project",
      "--repeat-each",
      "--shard",
    ].some((flag) => argument === flag || argument.startsWith(`${flag}=`)) ||
    argument === "-g"
  ) {
    fail(`G05 rejects partial CLI argument ${argument}.`);
  }
}
for (const name of [
  "G05_VIZ_ALLOW_PARTIAL",
  "G05_VIZ_CHUNK_FILTER",
  "G05_VIZ_FILTER",
  "G05_VIZ_LAB_FILTER",
  "G05_VIZ_LESSON_FULL",
  "G05_VIZ_PROJECT_FILTER",
  "G05_VIZ_STATE_FILTER",
]) {
  if (process.env[name] !== undefined) fail(`G05 rejects ${name}.`);
}
if (!process.cwd().startsWith("/Volumes/Starship/")) fail(`G05 escaped Starship: ${process.cwd()}.`);

function starshipPathReceipt(testInfo: TestInfo) {
  const paths = {
    browserProfileEvidencePath: process.env.PLAYWRIGHT_BROWSER_PROFILE_EVIDENCE_PATH,
    browserProcessEvidencePath: process.env.PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH,
    browserTempDir: process.env.PLAYWRIGHT_BROWSER_TEMP_DIR,
    crashDumpDir: process.env.PLAYWRIGHT_CRASH_DUMP_DIR,
    databasePath: process.env.HK_MATH_DB_PATH,
    e2eRunRoot: process.env.PLAYWRIGHT_E2E_ROOT,
    nextDistDir: process.env.PLAYWRIGHT_NEXT_DIST_DIR,
    nextTsconfigPath: process.env.PLAYWRIGHT_NEXT_TSCONFIG_PATH,
    nodeCompileCache: process.env.NODE_COMPILE_CACHE,
    npmCache: process.env.npm_config_cache,
    outputDir: testInfo.outputDir,
    outputRoot: process.env.PLAYWRIGHT_OUTPUT_DIR,
    pathManifestPath: process.env.PLAYWRIGHT_PATH_MANIFEST_PATH,
    reportDir: process.env.PLAYWRIGHT_REPORT_DIR,
    serverCommandOwnerPidPath:
      process.env.PLAYWRIGHT_SERVER_COMMAND_OWNER_PID_PATH,
    serverLogPath: process.env.PLAYWRIGHT_SERVER_LOG_PATH,
    temp: process.env.TEMP,
    tmp: process.env.TMP,
    tmpdir: process.env.TMPDIR,
    worktree: process.cwd(),
  };
  for (const [label, value] of Object.entries(paths)) {
    if (typeof value !== "string" || !value.startsWith("/Volumes/Starship/")) {
      fail(`${label} escaped Starship: ${JSON.stringify(value)}.`);
    }
  }
  return paths;
}

function assertCanonicalRunner(testInfo: TestInfo) {
  expect(testInfo.retry, "G05 release evidence forbids retries").toBe(0);
  expect(testInfo.repeatEachIndex, "G05 release evidence forbids repeats").toBe(0);
  expect(testInfo.config.shard, "G05 release evidence forbids sharding").toBeNull();
  const grep = Array.isArray(testInfo.config.grep)
    ? testInfo.config.grep
    : [testInfo.config.grep];
  expect(
    grep.every((pattern) => pattern.source === ".*" && pattern.flags === ""),
    "G05 release evidence forbids grep filtering",
  ).toBe(true);
  expect(
    testInfo.config.grepInvert,
    "G05 release evidence forbids grep-invert",
  ).toBeNull();
  expect(
    testInfo.config.projects.map((project) => project.name).sort(),
    "G05 release evidence requires the exact desktop/mobile project pair",
  ).toEqual([...supportedProjects].sort());
  expect(testInfo.config.maxFailures, "G05 release evidence forbids maxFailures").toBe(0);
  expect(testInfo.config.workers, "G05 release evidence requires one worker").toBe(1);
  for (const project of testInfo.config.projects) {
    expect(project.repeatEach, `${project.name}: repeatEach`).toBe(1);
    expect(project.retries, `${project.name}: retries`).toBe(0);
  }
  expect(testInfo.outputDir.startsWith("/Volumes/Starship/")).toBe(true);

  const manifestPath = process.env.PLAYWRIGHT_PATH_MANIFEST_PATH;
  if (!manifestPath?.startsWith("/Volumes/Starship/")) {
    fail(`G05 path manifest escaped Starship: ${String(manifestPath)}.`);
  }
  const manifest = parseJson(readFileSync(manifestPath, "utf8"));
  if (
    !isRecord(manifest) ||
    manifest.schemaVersion !== 1 ||
    manifest.status !== "preflight-passed" ||
    !isRecord(manifest.contract) ||
    !isRecord(manifest.paths)
  ) {
    fail("G05 Starship path manifest is malformed.");
  }
  expect(manifest.contract).toMatchObject({
    mutablePathsOnlyOnStarship: true,
    starshipRoot: "/Volumes/Starship",
  });
  for (const [label, value] of Object.entries(manifest.paths)) {
    if (typeof value !== "string" || !value.startsWith("/Volumes/Starship/")) {
      fail(`G05 Starship manifest path ${label} is invalid: ${String(value)}.`);
    }
  }
  return { manifestPath };
}

function parseJson(value: string | null): unknown {
  if (value === null) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requestBody(request: Request): unknown {
  return parseJson(request.postData());
}

function isSameOriginApplicationUrl(value: string) {
  const url = new URL(value);
  return (
    (url.protocol === "http:" || url.protocol === "https:") &&
    (url.hostname === "127.0.0.1" || url.hostname === "localhost")
  );
}

function isApiFamilyPath(pathname: string, family: string) {
  return pathname === family || pathname.startsWith(`${family}/`);
}

function visualizationLearningEvents(body: unknown) {
  if (!isRecord(body) || !Array.isArray(body.events)) return [];
  return body.events.filter((event) => {
    if (!isRecord(event)) return false;
    const type = typeof event.type === "string" ? event.type : "";
    const source = typeof event.source === "string" ? event.source : "";
    return type.startsWith("visualization-") || source === "visualization-lab";
  });
}

function mountWriteViolations(writes: readonly ObservedWrite[]) {
  const violations: string[] = [];
  for (const write of writes.filter((entry) => entry.stage === "mount")) {
    if (isApiFamilyPath(write.pathname, "/api/visualization-sessions")) {
      violations.push(`${write.method} ${write.pathname}: session during mount`);
    } else if (
      isApiFamilyPath(write.pathname, "/api/gamification") ||
      isApiFamilyPath(write.pathname, "/api/rewards") ||
      isApiFamilyPath(write.pathname, "/api/teacher/gamification") ||
      isApiFamilyPath(write.pathname, "/api/teacher/rewards")
    ) {
      violations.push(`${write.method} ${write.pathname}: reward during mount`);
    } else if (write.pathname === "/api/learning-events" && visualizationLearningEvents(write.body).length > 0) {
      violations.push(`${write.method} ${write.pathname}: visualization event during mount`);
    }
  }
  return violations;
}

type JsonResponseLike = Pick<APIResponse, "status" | "text">;

async function readJson<T>(response: JsonResponseLike, label: string): Promise<T> {
  const text = await response.text();
  expect(response.status(), `${label}: ${text}`).toBe(200);
  try {
    return JSON.parse(text) as T;
  } catch {
    fail(`${label}: response is not JSON.`);
  }
}

async function registerStudent(page: Page, testInfo: TestInfo, chunk: RuntimeChunk) {
  const runtime = chunk.runtime;
  const suffix = `${uniqueSuffix(testInfo)}-${chunk.index}-${runtime.publisher.toLowerCase()}`
    .replace(/[^a-z0-9-]+/giu, "-")
    .slice(0, 100);
  const username = `g05-${suffix}@example.test`;
  if (!(supportedProjects as readonly string[]).includes(testInfo.project.name)) {
    fail(`${chunk.id}: unsupported project ${testInfo.project.name}.`);
  }
  const theme = themeForChunkProject(
    chunk.index,
    testInfo.project.name as (typeof supportedProjects)[number],
  );
  const response = await page.request.post("/api/auth/register", {
    data: {
      curriculumProfile: { publisher: runtime.publisher, region: "MAINLAND" },
      curriculumTrack: runtime.track,
      email: username,
      grade: runtime.lab.grade,
      language: "zh-Hans",
      name: `G05 ${runtime.publisher} ${suffix}`,
      password: "start12345",
      role: "student",
      theme,
      username,
    },
  });
  const body = await readJson<{
    user?: {
      curriculumProfile?: { publisher?: unknown; region?: unknown };
      curriculumTrack?: unknown;
      id?: unknown;
      role?: unknown;
      theme?: unknown;
      username?: unknown;
    };
  }>(response, `${chunk.id}: student registration`);
  expect(body.user?.role).toBe("student");
  expect(body.user?.username).toBe(username);
  expect(body.user?.curriculumProfile).toEqual({
    publisher: runtime.publisher,
    region: "MAINLAND",
  });
  expect(body.user?.curriculumTrack).toBe(runtime.track);
  expect(body.user?.theme).toBe(theme);
  if (typeof body.user?.id !== "string" || body.user.id.trim().length === 0) {
    fail(`${chunk.id}: no exact user id.`);
  }
  return { theme, userId: body.user.id, username };
}

async function sessions(page: Page) {
  const response = await page.request.get("/api/visualization-sessions");
  const body = await readJson<{
    sessions?: Array<{
      explored?: unknown;
      moduleId?: unknown;
      source?: unknown;
      topicId?: unknown;
      updatedAt?: unknown;
    }>;
  }>(response, "session reread");
  if (!Array.isArray(body.sessions)) fail("Session reread has no sessions array.");
  return body.sessions;
}

function parseDomainState(value: string | null, label: string): DomainState {
  const parsed = parseJson(value);
  if (!isRecord(parsed)) fail(`${label}: not a JSON object.`);
  const keys = ["amount", "base", "inverseDirection", "labId", "mode", "newValue", "rateBasisPoints"];
  if (JSON.stringify(Object.keys(parsed).sort()) !== JSON.stringify([...keys].sort())) {
    fail(`${label}: domain state keys drifted.`);
  }
  return parsed as DomainState;
}

async function visibleControls(root: Locator): Promise<ControlSnapshot[]> {
  return await root.evaluate((element) =>
    Array.from(element.querySelectorAll<HTMLInputElement>('input[type="range"][data-viz-parameter]'))
      .filter((control) => {
        const style = getComputedStyle(control);
        const rect = control.getBoundingClientRect();
        return rect.width > 1 && rect.height > 1 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((control) => ({
        disabled: control.disabled,
        max: Number(control.max),
        min: Number(control.min),
        parameter: control.getAttribute("data-viz-parameter") ?? "",
        step: Number(control.step || "1"),
        value: control.value,
      })),
  );
}

function controlMap(controls: readonly ControlSnapshot[]) {
  const map = new Map<string, ControlSnapshot>();
  for (const control of controls) {
    if (!control.parameter || map.has(control.parameter)) fail(`Invalid visible control ${control.parameter}.`);
    map.set(control.parameter, control);
  }
  return map;
}

function expectedControlSnapshots(state: DomainState): readonly ControlSnapshot[] {
  const contract = percentApplicationsControlContractFor(
    state.mode,
    state.inverseDirection,
  );
  const visibleControls = contract.visibleControls as readonly string[];
  return visibleControls
    .filter((parameter) => parameter !== "inverse-direction")
    .map((parameter) => {
      const value =
        parameter === "amount"
          ? state.amount
          : parameter === "base"
            ? state.base
            : parameter === "new-value"
              ? state.newValue
              : state.rateBasisPoints;
      return {
        disabled: false,
        max:
          parameter === "rate-basis-points"
            ? contract.rate.max
            : 1_000_000,
        min: parameter === "rate-basis-points" ? contract.rate.min : 0,
        parameter,
        step: 1,
        value: String(value),
      };
    });
}

async function readDomainReceipt(owner: Locator): Promise<DomainReceipt> {
  const requested = parseDomainState(
    await owner.getAttribute("data-viz-domain-requested"),
    "requested",
  );
  const expected = parseDomainState(
    await owner.getAttribute("data-viz-domain-expected"),
    "expected",
  );
  const observed = parseDomainState(
    await owner.getAttribute("data-viz-domain-observed"),
    "observed",
  );
  const projectionCount = Number(
    await owner.getAttribute("data-viz-domain-projection-count"),
  );
  if (!Number.isSafeInteger(projectionCount) || projectionCount < 0) {
    fail(`G05 invalid domain projection count ${String(projectionCount)}.`);
  }
  const projectionReasons = (
    (await owner.getAttribute("data-viz-domain-projection-reasons")) ?? ""
  )
    .split(",")
    .map((reason) => reason.trim())
    .filter(Boolean);
  expect(projectionReasons).toHaveLength(projectionCount);
  return {
    expected,
    observed,
    projectionCount,
    projectionReasons,
    rejection: (await owner.getAttribute("data-viz-domain-rejection")) as
      | PercentApplicationsControlDomainErrorCode
      | null,
    requested,
  };
}

async function stateControlSignature(root: Locator): Promise<StateControlSignature> {
  const owner = root.locator('[data-mainland-percent-applications="true"]');
  const state = parseDomainState(
    await owner.getAttribute("data-viz-configured-state"),
    "configured state signature",
  );
  const semanticState = parseDomainState(
    await owner.getAttribute("data-viz-state"),
    "semantic state signature",
  );
  expect(semanticState).toEqual(state);
  const signature = {
    controls: await visibleControls(root),
    inverseDirection: state.inverseDirection,
    mode: state.mode,
    state,
  } as const;
  expect(signature.controls).toEqual(expectedControlSnapshots(state));
  return signature;
}

function expectedStateControlSignature(state: DomainState): StateControlSignature {
  return {
    controls: expectedControlSnapshots(state),
    inverseDirection: state.inverseDirection,
    mode: state.mode,
    state,
  };
}

async function runtimeSignature(root: Locator): Promise<RuntimeSignature> {
  const owner = root.locator('[data-mainland-percent-applications="true"]');
  const configuredState = parseDomainState(
    await owner.getAttribute("data-viz-configured-state"),
    "runtime configured state",
  );
  const semanticState = parseDomainState(
    await owner.getAttribute("data-viz-state"),
    "runtime semantic state",
  );
  const mode = await owner.getAttribute("data-viz-mode");
  if (mode !== configuredState.mode) {
    fail(`G05 runtime mode drifted; state=${configuredState.mode} attr=${String(mode)}.`);
  }
  expect(semanticState).toEqual(configuredState);
  return {
    configuredState,
    controls: await visibleControls(root),
    domain: await readDomainReceipt(owner),
    inverseDirection: configuredState.inverseDirection,
    mode: configuredState.mode,
    semanticState,
    visual: await root
      .locator(
        "[data-viz-visible-equation], [data-viz-percent-visual], [data-viz-percent-visual-status]",
      )
      .evaluateAll((elements) =>
        elements.map((element) => ({
          geometryReceipt: element.getAttribute("data-viz-geometry-receipt"),
          kind:
            element.getAttribute("data-viz-percent-visual") ??
            element.getAttribute("data-viz-percent-visual-status"),
          markCount: element.getAttribute("data-viz-painted-mark-count"),
          visibleReceipt: element.getAttribute("data-viz-visible-receipt"),
        })),
      ),
  };
}

async function runtimeDigest(root: Locator) {
  return JSON.stringify(await runtimeSignature(root));
}

async function settle(root: Locator, phase: string) {
  const deadline = Date.now() + 5_000;
  let prior = "";
  while (Date.now() < deadline) {
    await root.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    const current = await runtimeDigest(root);
    if (current === prior) return;
    prior = current;
  }
  fail(`${phase}: no two consecutive settled digests.`);
}

async function setRange(control: Locator, value: number, bypassDescriptor = false) {
  await control.evaluate((element, request) => {
    if (!(element instanceof HTMLInputElement) || element.type !== "range") {
      throw new TypeError("Target is not a range input.");
    }
    const oldMin = element.min;
    const oldMax = element.max;
    if (request.bypassDescriptor) {
      if (request.value < Number(oldMin)) element.min = String(request.value);
      if (request.value > Number(oldMax)) element.max = String(request.value);
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new TypeError("Native range setter is unavailable.");
    setter.call(element, String(request.value));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.min = oldMin;
    element.max = oldMax;
  }, { bypassDescriptor, value });
}

async function clickMode(root: Locator, mode: PercentApplicationsMode) {
  const button = root.locator(`[data-viz-mode-button][data-viz-mode=${JSON.stringify(mode)}]`);
  await expect(button).toHaveCount(1);
  await button.click();
  await settle(root, `mode:${mode}`);
}

async function clickDirection(root: Locator, direction: PercentChangeDirection) {
  const button = root.locator(`[data-viz-direction-button][data-viz-direction=${JSON.stringify(direction)}]`);
  await expect(button).toHaveCount(1);
  await button.click();
  await settle(root, `direction:${direction}`);
}

async function reset(root: Locator, runtime: RuntimeCase) {
  const button = root.locator(
    `[data-viz-reset-model][data-viz-reset-module-id=${JSON.stringify(configuredModuleId)}][data-viz-reset-topic-id=${JSON.stringify(runtime.labId)}]`,
  );
  await expect(button).toHaveCount(1);
  await button.click();
  await settle(root, `reset:${runtime.labId}`);
}

function resetState(runtime: RuntimeCase): DomainState {
  return resetPercentApplicationsLabInput(runtime.labId) as DomainState;
}

async function assertResetState(root: Locator, runtime: RuntimeCase) {
  expect((await stateControlSignature(root)).state).toEqual(resetState(runtime));
}

function endpointValue(control: ControlSnapshot, endpoint: Endpoint) {
  if (!Number.isFinite(control.min) || !Number.isFinite(control.max) || control.step <= 0) {
    fail(`${control.parameter}: invalid descriptor.`);
  }
  if (endpoint === "min") return control.min;
  if (endpoint === "max") return control.max;
  return control.min + Math.floor((control.max - control.min) / control.step / 2) * control.step;
}

async function actionBefore(root: Locator) {
  const before = await stateControlSignature(root);
  const beforeDomain = await readDomainReceipt(
    root.locator('[data-mainland-percent-applications="true"]'),
  );
  return { before, beforeDomain };
}

async function acceptedActionEvidence(
  root: Locator,
  context: Awaited<ReturnType<typeof actionBefore>>,
  plannedRequest: PlannedRequest,
  expectedState: DomainState,
  requestedState: DomainState,
  plannedProjections: readonly PercentApplicationsRateProjection[],
): Promise<ActionEvidence> {
  const observed = await stateControlSignature(root);
  const expected = expectedStateControlSignature(expectedState);
  expect(observed).toEqual(expected);
  const expectedDomain: DomainReceipt = {
    expected: expectedState,
    observed: expectedState,
    projectionCount: plannedProjections.length,
    projectionReasons: plannedProjections.map((projection) => projection.reason),
    rejection: null,
    requested: requestedState,
  };
  const liveDomain = await readDomainReceipt(
    root.locator('[data-mainland-percent-applications="true"]'),
  );
  expect(liveDomain).toEqual(expectedDomain);
  return {
    ...context,
    expected,
    expectedDomain,
    expectedRejection: null,
    observed,
    plannedProjections,
    plannedRequest,
  };
}

async function plannedAcceptedActionEvidence(
  root: Locator,
  context: Awaited<ReturnType<typeof actionBefore>>,
  request: PercentApplicationsControlDomainRequest,
): Promise<ActionEvidence> {
  const plan = planPercentApplicationsControlTransition(
    context.before.state,
    request,
  );
  return await acceptedActionEvidence(
    root,
    context,
    plan.request,
    plan.expected,
    plan.requested,
    plan.projections,
  );
}

async function rejectedActionEvidence(
  root: Locator,
  context: Awaited<ReturnType<typeof actionBefore>>,
  request: PercentApplicationsControlDomainRequest,
  expectedCode: PercentApplicationsControlDomainErrorCode,
): Promise<ActionEvidence> {
  let observedCode: PercentApplicationsControlDomainErrorCode | null = null;
  try {
    planPercentApplicationsControlTransition(context.before.state, request);
  } catch (error) {
    if (error instanceof PercentApplicationsControlDomainError) {
      observedCode = error.code;
    } else {
      throw error;
    }
  }
  expect(observedCode).toBe(expectedCode);
  const observed = await stateControlSignature(root);
  expect(observed).toEqual(context.before);
  const expectedDomain = {
    ...context.beforeDomain,
    rejection: expectedCode,
  } as const satisfies DomainReceipt;
  const liveDomain = await readDomainReceipt(
    root.locator('[data-mainland-percent-applications="true"]'),
  );
  expect(liveDomain).toEqual(expectedDomain);
  return {
    ...context,
    expected: context.before,
    expectedDomain,
    expectedRejection: expectedCode,
    observed,
    plannedProjections: [],
    plannedRequest: request,
  };
}

async function executeNormal(
  root: Locator,
  runtime: RuntimeCase,
  plan: Exclude<StatePlan, { kind: "dynamic" }>,
  planIndex: number,
): Promise<ActionEvidence> {
  if (plan.kind === "initial") {
    const context = await actionBefore(root);
    return await acceptedActionEvidence(
      root,
      context,
      { kind: "initial" },
      context.before.state,
      context.before.state,
      [],
    );
  }
  if (planIndex > 0 && plan.kind !== "reset") await reset(root, runtime);
  if (plan.kind === "reset") {
    const context = await actionBefore(root);
    await reset(root, runtime);
    await assertResetState(root, runtime);
    const expected = resetState(runtime);
    return await acceptedActionEvidence(
      root,
      context,
      { kind: "reset" },
      expected,
      expected,
      [],
    );
  }
  if (plan.kind === "conversion-partial") {
    await clickMode(root, "convert");
    const context = await actionBefore(root);
    const request = {
      controlId: "rate-basis-points",
      kind: "control",
      value: 1_250,
    } as const;
    await setRange(root.locator('input[data-viz-parameter="rate-basis-points"]'), 1_250);
    await settle(root, plan.id);
    return await plannedAcceptedActionEvidence(root, context, request);
  }
  if (plan.kind === "mode") {
    const context = await actionBefore(root);
    const request = {
      controllerId: "mode",
      kind: "controller",
      value: plan.mode,
    } as const;
    await clickMode(root, plan.mode);
    return await plannedAcceptedActionEvidence(root, context, request);
  }
  await clickMode(root, plan.mode);
  if (plan.kind === "direction") {
    const context = await actionBefore(root);
    const request = {
      controllerId: "inverse-direction",
      kind: "controller",
      value: plan.direction,
    } as const;
    await clickDirection(root, plan.direction);
    return await plannedAcceptedActionEvidence(root, context, request);
  }
  if (plan.direction) await clickDirection(root, plan.direction);
  const context = await actionBefore(root);
  const controls = controlMap(await visibleControls(root));
  const descriptor = controls.get(plan.parameter);
  if (!descriptor) fail(`${plan.id}: missing ${plan.parameter}.`);
  const value = endpointValue(descriptor, plan.endpoint);
  const request = {
    controlId: plan.parameter,
    kind: "control",
    value,
  } as const;
  await setRange(
    root.locator(`input[type=range][data-viz-parameter=${JSON.stringify(plan.parameter)}]`),
    value,
  );
  await settle(root, plan.id);
  return await plannedAcceptedActionEvidence(root, context, request);
}

async function executeDynamic(
  root: Locator,
  runtime: RuntimeCase,
  plan: Extract<StatePlan, { kind: "dynamic" }>,
): Promise<ActionEvidence> {
  const rate = root.locator('input[type=range][data-viz-parameter="rate-basis-points"]');
  const isMinimum = plan.scenario === "find-whole-min";
  const boundedMode: PercentApplicationsMode =
    plan.scenario === "find-whole-min"
      ? "find-whole"
      : plan.scenario === "decrease-max"
        ? "decrease"
        : plan.scenario === "discount-max"
          ? "discount"
          : "inverse";
  const projectedValue = isMinimum
    ? 1
    : plan.scenario === "inverse-decrease-max"
      ? 9_999
      : 10_000;
  const outsideValue = isMinimum ? 0 : 50_000;

  if (plan.step === "permissive-outside" || plan.step === "permissive-high") {
    await reset(root, runtime);
    if (plan.scenario === "inverse-decrease-max") {
      await clickMode(root, "inverse");
      await clickDirection(root, "increase");
    } else {
      await clickMode(root, "increase");
    }
    const context = await actionBefore(root);
    const request = {
      controlId: "rate-basis-points",
      kind: "control",
      value: outsideValue,
    } as const;
    await setRange(rate, outsideValue);
    await settle(root, plan.id);
    return await plannedAcceptedActionEvidence(root, context, request);
  } else if (plan.step === "project-controller") {
    const context = await actionBefore(root);
    const request = plan.scenario === "inverse-decrease-max"
      ? {
          controllerId: "inverse-direction",
          kind: "controller",
          value: "decrease",
        } as const
      : {
          controllerId: "mode",
          kind: "controller",
          value: boundedMode,
        } as const;
    if (plan.scenario === "inverse-decrease-max") {
      await clickDirection(root, "decrease");
    } else {
      await clickMode(root, boundedMode);
    }
    await expect(rate).toHaveValue(String(projectedValue));
    return await plannedAcceptedActionEvidence(root, context, request);
  } else if (plan.step === "reject-direct-outside" || plan.step === "reject-direct-high") {
    const context = await actionBefore(root);
    const request = {
      controlId: "rate-basis-points",
      kind: "control",
      value: outsideValue,
    } as const;
    await setRange(rate, outsideValue, true);
    await settle(root, plan.id);
    await expect(rate).toHaveValue(String(projectedValue));
    await expect(root.locator("[data-mainland-percent-applications]")).toHaveAttribute(
      "data-viz-domain-rejection",
      "DIRECT_CONTROL_OUT_OF_RANGE",
    );
    return await rejectedActionEvidence(
      root,
      context,
      request,
      "DIRECT_CONTROL_OUT_OF_RANGE",
    );
  } else if (plan.step === "leave-bounded") {
    const context = await actionBefore(root);
    const request = plan.scenario === "inverse-decrease-max"
      ? {
          controllerId: "inverse-direction",
          kind: "controller",
          value: "increase",
        } as const
      : {
          controllerId: "mode",
          kind: "controller",
          value: "increase",
        } as const;
    if (plan.scenario === "inverse-decrease-max") {
      await clickDirection(root, "increase");
    } else {
      await clickMode(root, "increase");
    }
    await expect(rate).toHaveValue(String(projectedValue));
    return await plannedAcceptedActionEvidence(root, context, request);
  } else {
    const context = await actionBefore(root);
    const request = plan.scenario === "inverse-decrease-max"
      ? {
          controllerId: "inverse-direction",
          kind: "controller",
          value: "decrease",
        } as const
      : {
          controllerId: "mode",
          kind: "controller",
          value: boundedMode,
        } as const;
    if (plan.scenario === "inverse-decrease-max") {
      await clickDirection(root, "decrease");
    } else {
      await clickMode(root, boundedMode);
    }
    await expect(rate).toHaveValue(String(projectedValue));
    return await plannedAcceptedActionEvidence(root, context, request);
  }
}

async function assertIdentityAndDomain(root: Locator, runtime: RuntimeCase) {
  await expect(root).toHaveAttribute("data-viz-active-lab-id", runtime.labId);
  await expect(root).toHaveAttribute("data-viz-module-id", configuredModuleId);
  await expect(root).toHaveAttribute("data-viz-topic-id", runtime.labId);
  await expect(root).toHaveAttribute("data-viz-lesson-session-owner", "first-control-interaction");
  await expect(root).toHaveAttribute("data-viz-production-renderer", "mainland-percent-applications");
  const owner = root.locator('[data-mainland-percent-applications="true"]');
  await expect(owner).toHaveCount(1);
  await expect(owner).toHaveAttribute("data-viz-topic-id", runtime.labId);
  await expect(owner).toHaveAttribute("data-viz-configured-model", PERCENT_APPLICATIONS_MODEL_CONTRACT.version);
  await expect(owner).toHaveAttribute("data-viz-range-domain-id", PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT.id);
  await expect(owner).toHaveAttribute("data-viz-domain-version", String(PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT.version));
  await expect(owner).toHaveAttribute("data-viz-domain-match", "true");
  const domain = await readDomainReceipt(owner);
  const { expected, observed } = domain;
  expect(observed).toEqual(expected);
  const mode = observed.mode;
  if (!runtime.modes.includes(mode)) fail(`${runtime.labId}: leaked mode ${mode}.`);
  const state = parseDomainState(await owner.getAttribute("data-viz-configured-state"), "configured-state");
  expect(state).toEqual(observed);
  const buttons = root.locator("[data-viz-mode-button]");
  await expect(buttons).toHaveCount(runtime.modes.length);
  expect(await buttons.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-viz-mode")))).toEqual([...runtime.modes]);
  await expect(root.locator('[data-viz-mode-button][aria-pressed="true"]')).toHaveCount(1);
  return {
    expected,
    mode,
    observed,
    owner,
    projectionCount: domain.projectionCount,
    projectionReasons: domain.projectionReasons,
    rejection: domain.rejection,
    requested: domain.requested,
  };
}

const domainStateKeys = [
  "amount",
  "base",
  "inverseDirection",
  "labId",
  "mode",
  "newValue",
  "rateBasisPoints",
] as const satisfies readonly (keyof DomainState)[];

function assertActionReceipt(action: ActionEvidence, domain: DomainReceipt) {
  expect(action.observed).toEqual(action.expected);
  expect(domain).toEqual(action.expectedDomain);
  expect(domain.rejection).toBe(action.expectedRejection);
  expect(action.expectedDomain.projectionCount).toBe(
    action.plannedProjections.length,
  );
  expect(action.expectedDomain.projectionReasons).toEqual(
    action.plannedProjections.map((projection) => projection.reason),
  );

  const allowedChanges = new Set<keyof DomainState>();
  const request = action.plannedRequest;
  if (request.kind === "reset") {
    for (const key of domainStateKeys) allowedChanges.add(key);
  } else if (request.kind === "control") {
    const field = {
      amount: "amount",
      base: "base",
      "new-value": "newValue",
      "rate-basis-points": "rateBasisPoints",
    }[request.controlId] as keyof DomainState;
    allowedChanges.add(field);
    expect(action.expected.state[field]).toBe(request.value);
  } else if (request.kind === "controller") {
    const field = request.controllerId === "mode" ? "mode" : "inverseDirection";
    allowedChanges.add(field);
    expect(action.expected.state[field]).toBe(request.value);
  }
  for (const projection of action.plannedProjections) {
    if (projection.controlId === "rate-basis-points") {
      allowedChanges.add("rateBasisPoints");
      expect(action.expected.state.rateBasisPoints).toBe(projection.to);
    }
  }
  for (const key of domainStateKeys) {
    if (!allowedChanges.has(key)) {
      expect(
        action.expected.state[key],
        `${String(key)} changed outside the exact request/projection allowlist`,
      ).toBe(action.before.state[key]);
    }
  }
  if (action.expectedRejection) {
    expect(action.plannedProjections).toEqual([]);
    expect(action.expected).toEqual(action.before);
    expect(action.observed).toEqual(action.before);
  }
}

async function assertControlContract(root: Locator, state: DomainState) {
  const controls = await visibleControls(root);
  const actual = controlMap(controls);
  const contract = percentApplicationsControlContractFor(state.mode, state.inverseDirection);
  const pinnedControls = (
    expectedTopicModeControlTable[state.labId].controls as Partial<
      Record<PercentApplicationsMode, readonly string[]>
    >
  )[state.mode];
  if (!pinnedControls) {
    fail(`${state.labId}:${state.mode}: mode is absent from the exact topic-control table.`);
  }
  expect(contract.visibleControls).toEqual(pinnedControls);
  const expectedNumeric = (contract.visibleControls as readonly string[]).filter(
    (control) => control !== "inverse-direction",
  );
  expect([...actual.keys()]).toEqual(expectedNumeric);
  for (const control of controls) {
    expect(control.disabled).toBe(false);
    expect(control.step).toBe(1);
    if (control.parameter === "rate-basis-points") {
      expect(control.min).toBe(contract.rate.min);
      expect(control.max).toBe(contract.rate.max);
      expect(control.value).toBe(String(state.rateBasisPoints));
    } else {
      expect(control.min).toBe(0);
      expect(control.max).toBe(1_000_000);
    }
  }
  const directions = root.locator("[data-viz-direction-button]");
  if (state.mode === "inverse") {
    await expect(directions).toHaveCount(2);
    expect(await directions.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-viz-direction")))).toEqual(["increase", "decrease"]);
    await expect(root.locator('[data-viz-direction-button][aria-pressed="true"]')).toHaveCount(1);
  } else {
    await expect(directions).toHaveCount(0);
  }
  return controls;
}

async function auditVisual(root: Locator, state: DomainState, plan: StatePlan) {
  const equation = root.locator('[data-viz-visible-equation="true"]');
  await expect(equation).toHaveCount(1);
  const expectedKind =
    state.mode === "convert"
      ? "conversion"
      : state.mode === "increase" || state.mode === "decrease"
        ? "percent-change"
        : state.mode;
  await expect(equation).toHaveAttribute("data-viz-visible-receipt", expectedKind);
  const unsupported = root.locator('[data-viz-percent-visual-status="unsupported"]');
  const zeroMagnitude =
    (state.mode === "find-part" || state.mode === "increase" || state.mode === "decrease" || state.mode === "discount")
      ? state.base === 0
      : state.mode === "find-whole"
        ? state.amount === 0
        : state.mode === "inverse"
          ? state.newValue === 0
          : false;
  if (zeroMagnitude) {
    await expect(unsupported).toHaveCount(1);
    await expect(unsupported).toHaveAttribute("data-viz-unsupported-kind", expectedKind);
    await expect(unsupported).toHaveAttribute("data-viz-unsupported-reason", "zero-magnitude-has-no-positive-area");
    await expect(root.locator("[data-viz-percent-visual], [data-viz-painted-mark=\"true\"]")).toHaveCount(0);
    return { kind: expectedKind, status: "unsupported" as const };
  }
  await expect(unsupported).toHaveCount(0);
  const visual = root.locator(`[data-viz-percent-visual=${JSON.stringify(expectedKind)}]`);
  await expect(visual).toHaveCount(1);
  await expect(visual).toBeVisible();
  await expect(visual).toHaveAttribute("data-viz-svg-background", "opaque");
  const receipt = parseJson(await visual.getAttribute("data-viz-geometry-receipt"));
  expect(receipt).toMatchObject({ kind: expectedKind, status: "supported" });
  const markCount = Number(await visual.getAttribute("data-viz-painted-mark-count"));
  expect(markCount).toBeGreaterThan(0);
  await expect(visual.locator('[data-viz-painted-mark="true"]')).toHaveCount(markCount);
  if (state.mode === "convert") {
    const expectedGridCount = Math.max(1, Math.ceil(state.rateBasisPoints / 10_000));
    expect(receipt).toMatchObject({ gridCount: expectedGridCount, totalCells: expectedGridCount * 100 });
    await expect(visual.locator('[data-viz-name="percent-grid-cell"]')).toHaveCount(expectedGridCount * 100);
    if (plan.kind === "conversion-partial") {
      await expect(visual.locator('[data-viz-name="percent-grid-partial"][data-viz-partial-basis-points="50"]')).toHaveCount(1);
    }
  } else if (state.mode === "find-part" || state.mode === "find-whole") {
    await expect(visual.locator('[data-viz-name="percent-part-whole-bar"]')).toHaveCount(2);
  } else if (state.mode === "increase" || state.mode === "decrease") {
    await expect(visual.locator('[data-viz-name="percent-change-bar"]')).toHaveCount(3);
  } else if (state.mode === "discount") {
    await expect(visual.locator('[data-viz-name="discount-value-bar"]')).toHaveCount(3);
  } else {
    await expect(visual.locator('[data-viz-name="inverse-value-bar"]')).toHaveCount(2);
    await expect(visual.locator('[data-viz-name="inverse-reconstruction-arrow"]')).toHaveCount(1);
  }
  return { kind: expectedKind, markCount, receipt, status: "supported" as const };
}

async function auditLayout(root: Locator) {
  const targets = await root.evaluate((element) =>
    Array.from(element.querySelectorAll<HTMLElement>(
      "[data-viz-mode-button], [data-viz-direction-button], input[data-viz-parameter], [data-viz-reset-model]",
    )).filter((target) => {
      const style = getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1 && style.display !== "none" && style.visibility !== "hidden";
    }).map((target) => {
      const rect = target.getBoundingClientRect();
      return { height: rect.height, width: rect.width };
    }),
  );
  expect(targets.length).toBeGreaterThan(0);
  for (const target of targets) {
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);
  }
  const scroll = root.locator('[data-viz-local-scroll="horizontal"]');
  await expect(scroll).toHaveCount(1);
  await expect(scroll).toHaveAttribute("tabindex", "0");
  const local = await scroll.evaluate((element) => ({
    clientWidth: element.clientWidth,
    overflowX: getComputedStyle(element).overflowX,
    scrollWidth: element.scrollWidth,
  }));
  if (local.scrollWidth > local.clientWidth + 1) {
    expect(["auto", "scroll"]).toContain(local.overflowX);
    await expect(root.locator('[data-viz-pan-hint="true"]')).toBeVisible();
  }
  const pageWidths = await root.page().evaluate(() => ({
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(pageWidths.body).toBeLessThanOrEqual(pageWidths.client + 1);
  expect(pageWidths.document).toBeLessThanOrEqual(pageWidths.client + 1);
  return { local, pageWidths, targetCount: targets.length };
}

async function visibleControlIdentityForRequest(
  root: Locator,
  request: PlannedRequest,
): Promise<VisibleControlIdentity> {
  if (request.kind === "initial" || request.kind === "reset") return null;
  if (request.kind === "control") {
    const control = root.locator(
      `input[type=range][data-viz-parameter=${JSON.stringify(request.controlId)}]`,
    );
    await expect(control).toHaveCount(1);
    await expect(control).toBeVisible();
    return { controlId: request.controlId, kind: "control" };
  }
  const controller = request.controllerId === "mode"
    ? root.locator(
        `[data-viz-mode-button][data-viz-mode=${JSON.stringify(request.value)}]`,
      )
    : root.locator(
        `[data-viz-direction-button][data-viz-direction=${JSON.stringify(request.value)}]`,
      );
  await expect(controller).toHaveCount(1);
  await expect(controller).toBeVisible();
  return {
    controllerId: request.controllerId,
    kind: "controller",
    value: request.value,
  };
}

async function auditState(
  root: Locator,
  runtime: RuntimeCase,
  plan: StatePlan,
  stateId: string,
  action: ActionEvidence,
) {
  await settle(root, stateId);
  const identity = await assertIdentityAndDomain(root, runtime);
  const domain = await readDomainReceipt(identity.owner);
  assertActionReceipt(action, domain);
  const controls = await assertControlContract(root, domain.observed);
  const visibleControlIdentity = await visibleControlIdentityForRequest(
    root,
    action.plannedRequest,
  );
  const visual = await auditVisual(root, domain.observed, plan);
  const runtimeSignatureBeforeScans = await runtimeSignature(root);
  const snapshot = await scanHkVisualizationCollisions(root, stateId);
  const collision = visual.status === "supported"
    ? chinaVisualizationCollisionReceipt(snapshot)
    : (() => {
        expect(snapshot.issues).toEqual([]);
        expect(snapshot.truncated).toBe(false);
        expect(snapshot.learnerControlCount).toBeGreaterThan(0);
        expect(snapshot.htmlTextFragmentCount).toBeGreaterThan(0);
        expect(snapshot.totalCandidatePairCount).toBeGreaterThan(0);
        return {
          inspectedCandidateCount: snapshot.inspectedCandidateCount,
          learnerControlCount: snapshot.learnerControlCount,
          status: "unsupported-zero-area-explicit-owner",
          totalCandidatePairCount: snapshot.totalCandidatePairCount,
        };
      })();
  const contrast = await root.evaluate(scanHkVisualizationTextContrast, {
    authoringSelector: "[data-viz-authoring-only], [data-viz-manim-authoring-dock]",
  });
  expect(contrast.checkedTextCount).toBeGreaterThan(0);
  expect(contrast.worst).not.toBeNull();
  expect(contrast.issues).toEqual([]);
  const layout = await auditLayout(root);
  await root.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  const runtimeSignatureAfterScans = await runtimeSignature(root);
  expect(
    runtimeSignatureAfterScans,
    `${stateId}: G05 runtime drifted during collision/contrast/layout audits`,
  ).toEqual(runtimeSignatureBeforeScans);
  return {
    action,
    collision,
    contrast: {
      audited: contrast.checkedTextCount,
      minRatio: contrast.worst?.contrastRatio,
      requiredRatio: contrast.worst?.requiredRatio,
    },
    controls,
    domain,
    layout,
    runtimeSignature: runtimeSignatureAfterScans,
    stateId,
    touchTargetCount: layout.targetCount,
    visibleControlIdentity,
    visual,
  };
}

type StateReceipt = Awaited<ReturnType<typeof auditState>>;

function bindPlannedDescriptorToReceipt(
  descriptor: PlannedStateDescriptor,
  receipt: StateReceipt,
) {
  const expected = expectedStateDescriptorById.get(receipt.stateId);
  const configured = receipt.runtimeSignature.configuredState;
  const semantic = receipt.runtimeSignature.semanticState;
  if (
    expected === undefined ||
    validatorCanonicalJson(descriptor) !== validatorCanonicalJson(expected) ||
    descriptor.stateId !== receipt.stateId ||
    descriptor.labId !== receipt.domain.observed.labId ||
    descriptor.labId !== configured.labId ||
    descriptor.labId !== semantic.labId ||
    descriptor.plan.mode !== receipt.domain.observed.mode ||
    descriptor.plan.mode !== configured.mode ||
    descriptor.plan.mode !== semantic.mode ||
    descriptor.plan.mode !== receipt.runtimeSignature.mode ||
    descriptor.plan.kind !== receipt.action.plannedRequest.kind ||
    validatorCanonicalJson(descriptor.plan.request) !==
      validatorCanonicalJson(receipt.action.plannedRequest)
  ) {
    fail(
      `${descriptor.stateId}: planned semantic descriptor does not bind to its actual receipt.`,
    );
  }
  const request = receipt.action.plannedRequest;
  const expectedControlParameter = request.kind === "control"
    ? request.controlId
    : request.kind === "controller"
      ? request.controllerId
      : null;
  if (descriptor.plan.controlParameter !== expectedControlParameter) {
    fail(
      `${descriptor.stateId}: descriptor control parameter drifted from its actual request.`,
    );
  }
  const expectedVisibleControlIdentity: VisibleControlIdentity =
    request.kind === "control"
      ? { controlId: request.controlId, kind: "control" }
      : request.kind === "controller"
        ? {
            controllerId: request.controllerId,
            kind: "controller",
            value: request.value,
          }
        : null;
  if (
    validatorCanonicalJson(receipt.visibleControlIdentity) !==
    validatorCanonicalJson(expectedVisibleControlIdentity)
  ) {
    fail(
      `${descriptor.stateId}: exact control identity is absent from its actual receipt.`,
    );
  }
  if (
    request.kind === "control" &&
    !receipt.controls.some(({ parameter }) => parameter === request.controlId)
  ) {
    fail(
      `${descriptor.stateId}: exact G05 controlId is absent from its visible numeric controls.`,
    );
  }
  return descriptor;
}

async function awaitFirstSessionAck(
  responsePromise: Promise<import("@playwright/test").Response>,
  runtime: RuntimeCase,
  userId: string,
) {
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/json");
  const responseUrl = new URL(response.url());
  expect(responseUrl.pathname).toBe("/api/visualization-sessions");
  expect(responseUrl.search).toBe("");
  expect(responseUrl.hash).toBe("");
  const request = response.request();
  expect(request.method()).toBe("POST");
  expect(decodeURIComponent(request.headers()["x-mais-visualization-user-id"] ?? "")).toBe(userId);
  expect(requestBody(request)).toEqual({
    moduleId: configuredModuleId,
    source: runtime.lab.analyticsSource,
    topicId: runtime.labId,
  });
  const delivery = await readJson<unknown>(
    response,
    `${runtime.labId}: first interaction ACK`,
  );
  if (!isRecord(delivery) || !isRecord(delivery.session)) {
    fail(`${runtime.labId}: first interaction ACK is not an exact object.`);
  }
  assertExactSet(
    `${runtime.labId}: first interaction ACK keys`,
    Object.keys(delivery),
    ["acknowledgedUserId", "durablyPersisted", "session"],
  );
  assertExactSet(
    `${runtime.labId}: first interaction ACK session keys`,
    Object.keys(delivery.session),
    ["completedAt", "explored", "moduleId", "source", "topicId", "updatedAt"],
  );
  if (
    typeof delivery.session.updatedAt !== "string" ||
    delivery.session.updatedAt.trim().length === 0 ||
    new Date(delivery.session.updatedAt).toISOString() !==
      delivery.session.updatedAt ||
    typeof delivery.session.completedAt !== "string" ||
    delivery.session.completedAt.trim().length === 0 ||
    new Date(delivery.session.completedAt).toISOString() !==
      delivery.session.completedAt ||
    delivery.session.completedAt !== delivery.session.updatedAt
  ) {
    fail(`${runtime.labId}: first interaction ACK timestamps are not exact.`);
  }
  const exactDelivery = {
    acknowledgedUserId: userId,
    durablyPersisted: true,
    session: {
      completedAt: delivery.session.completedAt,
      explored: true,
      moduleId: configuredModuleId,
      source: runtime.lab.analyticsSource,
      topicId: runtime.labId,
      updatedAt: delivery.session.updatedAt,
    },
  } as const;
  expect(delivery).toEqual(exactDelivery);
  return exactDelivery;
}

async function runExactDurabilityProbe({
  durability,
  includeRaw,
  page,
  root,
  runtime,
  userId,
}: Readonly<{
  durability: ReturnType<
    typeof createVisualizationLessonDurabilityBrowserAdapter
  >;
  includeRaw: boolean;
  page: Page;
  root: Locator;
  runtime: RuntimeCase;
  userId: string;
}>) {
  const resetMode = resetState(runtime).mode;
  const probeMode = runtime.modes.find(
    (mode) => mode !== resetMode,
  );
  if (!probeMode) {
    fail(`${runtime.labId}: no non-reset mode is available for durability.`);
  }
  expect(probeMode).not.toBe(resetMode);

  const modeButton = root.locator(
    `[data-viz-mode-button][data-viz-mode=${JSON.stringify(probeMode)}][data-viz-mode-active="false"]`,
  );
  await expect(modeButton).toHaveCount(1);
  await expect(modeButton).toBeVisible();
  await expect(modeButton).toBeEnabled();
  await expect(modeButton).toHaveAttribute("data-viz-mode-active", "false");
  await expect(modeButton).toHaveAttribute("aria-pressed", "false");
  const firstExpectedControl = {
    controlKey: probeMode,
    eventTypes: ["pointerup", "click"],
  } as const;

  const firstFence = await durability.armRealControl({
    expectedButtonClick: firstExpectedControl,
    ordinal: 1,
  });
  const sessionPromise = page.waitForResponse(
    (candidate) =>
      candidate.request().method() === "POST" &&
      new URL(candidate.url()).pathname === "/api/visualization-sessions",
    { timeout: 30_000 },
  );
  await modeButton.click();
  const sessionAcknowledgement = await awaitFirstSessionAck(
    sessionPromise,
    runtime,
    userId,
  );
  const first = await durability.finishFirstRealControl({
    fence: firstFence,
    includeRaw,
    root,
  });
  expect(first.expectedControl).toEqual(firstExpectedControl);
  expect(first.controlEvents.map(({ controlKey, key, type }) => ({
    controlKey,
    key,
    type,
  }))).toEqual([
    { controlKey: probeMode, key: null, type: "pointerup" },
    { controlKey: probeMode, key: null, type: "click" },
  ]);
  const afterFirst = await stateControlSignature(root);
  expect(afterFirst.mode).toBe(probeMode);
  expect(afterFirst.state.mode).not.toBe(resetMode);

  const resetButton = root.locator(
    `[data-viz-reset-model][data-viz-reset-module-id=${JSON.stringify(configuredModuleId)}][data-viz-reset-topic-id=${JSON.stringify(runtime.labId)}]`,
  );
  await expect(resetButton).toHaveCount(1);
  await expect(resetButton).toBeVisible();
  await expect(resetButton).toBeEnabled();
  const secondExpectedControl = {
    controlKey: runtime.labId,
    eventTypes: ["pointerup", "click"],
  } as const;
  const secondFence = await durability.armRealControl({
    expectedButtonClick: secondExpectedControl,
    ordinal: 2,
  });
  await resetButton.click();
  const second = await durability.finishSecondRealControl({
    fence: secondFence,
    root,
  });
  const controlObserverStop = second.controlObserverStop;
  assertExactSet(
    `${runtime.labId}: C11 control observer stop keys`,
    Object.keys(controlObserverStop),
    [
      "active",
      "adapterId",
      "eventCount",
      "events",
      "eventsSha256",
      "lastSequence",
      "removalCount",
      "removedEventTypes",
      "removedExactlyOnce",
      "removedListenerCount",
      "stopId",
    ],
  );
  expect(controlObserverStop).toEqual({
    active: false,
    adapterId: controlObserverStop.adapterId,
    eventCount: 4,
    events: [...first.controlEvents, ...second.controlEvents],
    eventsSha256: controlObserverStop.eventsSha256,
    lastSequence: 4,
    removalCount: 1,
    removedEventTypes: ["change", "click", "input", "keyup", "pointerup"],
    removedExactlyOnce: true,
    removedListenerCount: 5,
    stopId: `${controlObserverStop.adapterId}:control-observer-stop:1`,
  });
  expect(second.expectedControl).toEqual(secondExpectedControl);
  expect(second.controlEvents.map(({ controlKey, key, type }) => ({
    controlKey,
    key,
    type,
  }))).toEqual([
    { controlKey: runtime.labId, key: null, type: "pointerup" },
    { controlKey: runtime.labId, key: null, type: "click" },
  ]);
  const frozenEventCount = controlObserverStop.events.length;
  const ledgerFrozen =
    Object.isFrozen(controlObserverStop) &&
    Object.isFrozen(controlObserverStop.events) &&
    controlObserverStop.events.every((event) => Object.isFrozen(event)) &&
    Object.isFrozen(controlObserverStop.removedEventTypes);
  expect(frozenEventCount).toBe(4);
  expect(ledgerFrozen).toBe(true);
  await assertResetState(root, runtime);
  expect((await stateControlSignature(root)).state).toEqual(
    resetState(runtime),
  );

  return {
    controlObserverStop,
    first,
    second,
    sessionAcknowledgement,
  } as const;
}

const executedChunkIds: string[] = [];
const executedStateIds: string[] = [];
const executedRawReplayTopicIds: string[] = [];
const executedProjectNames = new Set<string>();
const expectedRawReplayCountAcrossReport = 2 as const;
const expectedRawReplayProjects = ["desktop-chrome"] as const;
const expectedRawReplayCaseIds = [
  "desktop-chrome:bnu-primary-p6-upper-percentage-applications:chunk-01-of-03",
  "desktop-chrome:pep-primary-p6-upper-percent-fractions:chunk-01-of-02",
] as const;
const observedRawReplayCaseIds = supportedProjects.flatMap((project) =>
  runtimeChunks
    .filter((chunk) => project === "desktop-chrome" && chunk.index === 0)
    .map((chunk) => `${project}:${chunk.id}`),
);
if (exactLabIds.length !== expectedRawReplayCountAcrossReport) {
  fail("G05 report-wide raw replay quota must remain exactly two topics.");
}
if (
  validatorCanonicalJson(observedRawReplayCaseIds) !==
    validatorCanonicalJson(expectedRawReplayCaseIds) ||
  observedRawReplayCaseIds.length !== expectedRawReplayCountAcrossReport ||
  observedRawReplayCaseIds.some((caseId) =>
    caseId.startsWith("mobile-chrome:")
  )
) {
  fail(
    `G05 raw replay representatives drifted; expected=${JSON.stringify(expectedRawReplayCaseIds)} actual=${JSON.stringify(observedRawReplayCaseIds)}.`,
  );
}

test.describe("Mainland G05 percent applications production route acceptance", () => {
  test.describe.configure({ mode: "serial", retries: 0 });

  test.afterAll(() => {
    expect(executedChunkIds, "G05 chunk ledger rejects grep/shard/partial").toEqual(expectedChunkIds);
    expect(executedStateIds, "G05 state ledger rejects gaps/duplicates/order drift").toEqual(expectedStateIds);
    expect(new Set(executedStateIds).size).toBe(expectedStateIds.length);
    const expectedRawTopics = executedProjectNames.has("desktop-chrome")
      ? [...exactLabIds]
      : [];
    expect(
      executedRawReplayTopicIds,
      "G05 raw replay ledger requires each topic's first canonical desktop chunk and zero mobile replays",
    ).toEqual(expectedRawTopics);
    expect(new Set(executedRawReplayTopicIds).size).toBe(
      executedRawReplayTopicIds.length,
    );
  });

  for (const [chunkIndex, chunk] of runtimeChunks.entries()) {
    const title = expectedTestTitles[chunkIndex]!;
    test(title, async ({ baseURL, page }, testInfo) => {
      test.setTimeout(45_000 + chunk.plans.length * 30_000);
      const canonicalRunner = assertCanonicalRunner(testInfo);
      expect(supportedProjects).toContain(testInfo.project.name);
      const starshipPaths = starshipPathReceipt(testInfo);
      const viewport = page.viewportSize();
      expect(viewport).not.toBeNull();
      if (!viewport) fail("No viewport.");
      if (testInfo.project.name === "desktop-chrome") {
        expect(viewport).toEqual({ width: 1440, height: 1100 });
      } else {
        expect(viewport.width).toBeLessThanOrEqual(500);
        expect(viewport.height).toBeGreaterThanOrEqual(700);
      }

      const pageErrors = collectPageErrors(page);
      const consoleErrors: string[] = [];
      const requestFailures: string[] = [];
      const serverErrors: string[] = [];
      const writes: ObservedWrite[] = [];
      let stage: Stage = "mount";
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("requestfailed", (request) => {
        if (isSameOriginApplicationUrl(request.url())) {
          requestFailures.push(`${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText ?? "unknown"}`);
        }
      });
      page.on("response", (response) => {
        if (isSameOriginApplicationUrl(response.url()) && response.status() >= 500) {
          serverErrors.push(`${response.status()} ${new URL(response.url()).pathname}`);
        }
      });
      page.on("request", (request) => {
        if (!isSameOriginApplicationUrl(request.url())) return;
        if (["GET", "HEAD", "OPTIONS"].includes(request.method())) return;
        writes.push({
          body: requestBody(request),
          method: request.method(),
          pathname: new URL(request.url()).pathname,
          stage,
        });
      });

      await installHkVisualizationEffectiveVisibilityInspector(page);
      const student = await registerStudent(page, testInfo, chunk);
      expect(await sessions(page)).toEqual([]);
      if (page.url() !== "about:blank") {
        fail(`${chunk.id}: registration navigated the bound Page before durability arm.`);
      }
      if (typeof baseURL !== "string") {
        fail(`${chunk.id}: Playwright exposed no application baseURL.`);
      }
      const databasePath = starshipPaths.databasePath;
      if (typeof databasePath !== "string") {
        fail(`${chunk.id}: Starship database path is absent.`);
      }
      const appOrigin = new URL(baseURL).origin;
      const lessonSlug = lessonSlugForTopicId(chunk.runtime.labId);
      const siblingTopicIds = exactLabIds.filter(
        (topicId) => topicId !== chunk.runtime.labId,
      );
      if (siblingTopicIds.length !== 1) {
        fail(`${chunk.id}: durability sibling set must contain the other G05 topic.`);
      }
      assertExactSet(
        `${chunk.id}: durability sibling identities`,
        siblingTopicIds,
        exactLabIds.filter((topicId) => topicId !== chunk.runtime.labId),
      );
      expect(chunk.runtime.lab.analyticsSource).not.toBe("lesson");
      const learnerProfileSetup =
        await prepareVisualizationLessonLearnerProfileBeforeArm({
          appOrigin,
          page,
          userId: student.userId,
        });
      const activeSelector =
        `[data-viz-active-lab-id=${JSON.stringify(chunk.runtime.labId)}]`;
      const durability = createVisualizationLessonDurabilityBrowserAdapter({
        page,
        testInfo,
        expected: {
          appOrigin,
          grade: chunk.runtime.lab.grade,
          userId: student.userId,
          moduleId: configuredModuleId,
          selectedTopicId: chunk.runtime.labId,
          siblingTopicIds,
          lessonSlug,
          source: chunk.runtime.lab.analyticsSource,
        },
        databasePath,
        rootSelector: activeSelector,
        controlSelector:
          "[data-viz-mode-button], [data-viz-direction-button], [data-viz-parameter], [data-viz-reset-model]",
        readRuntimeDigest: async (activeRoot) =>
          await runtimeSignature(activeRoot),
      });
      await durability.armBeforeNavigation({ learnerProfileSetup });
      const response = await page.goto(`/student/lessons/${encodeURIComponent(lessonSlug)}`, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBeLessThan(400);
      const section = page.locator("section#visualization");
      await expect(section).toHaveCount(1);
      await expect(page.locator(activeSelector)).toHaveCount(1);
      const root = section.locator(activeSelector);
      await expect(root).toBeVisible({ timeout: 30_000 });
      expect(
        await page.locator("html").evaluate((element) =>
          element.classList.contains("dark"),
        ),
      ).toBe(student.theme === "dark");
      await assertIdentityAndDomain(root, chunk.runtime);

      const rawReplayRepresentative =
        testInfo.project.name === "desktop-chrome" && chunk.index === 0;
      const mountDurability = await durability.waitForMountTerminal({
        deadlineMs: 30_000,
        includeRaw: rawReplayRepresentative,
        root,
      });
      expect(await sessions(page)).toEqual([]);
      expect(mountWriteViolations(writes)).toEqual([]);

      stage = "interaction";
      const durabilityProbe = await runExactDurabilityProbe({
        durability,
        includeRaw: rawReplayRepresentative,
        page,
        root,
        runtime: chunk.runtime,
        userId: student.userId,
      });
      stage = "audit";
      const probeSessionWrites = writes.filter(
        (write) => write.pathname === "/api/visualization-sessions",
      );
      expect(probeSessionWrites).toHaveLength(1);
      expect(probeSessionWrites[0]?.body).toEqual({
        moduleId: configuredModuleId,
        source: chunk.runtime.lab.analyticsSource,
        topicId: chunk.runtime.labId,
      });

      const receipts: StateReceipt[] = [];
      const plannedStateDescriptors: PlannedStateDescriptor[] = [];
      let priorPlan: StatePlan | undefined;
      for (const [planIndex, plan] of chunk.plans.entries()) {
        const stateId = `${chunk.runtime.labId}:${plan.id}`;
        const atomicContinuation =
          plan.kind === "dynamic" &&
          priorPlan?.kind === "dynamic" &&
          plan.atomicGroup === priorPlan.atomicGroup;
        let action: ActionEvidence;
        if (plan.kind === "dynamic") {
          if (!atomicContinuation && planIndex > 0) await reset(root, chunk.runtime);
          action = await executeDynamic(root, chunk.runtime, plan);
        } else {
          action = await executeNormal(root, chunk.runtime, plan, planIndex);
        }
        const receipt = await auditState(
          root,
          chunk.runtime,
          plan,
          stateId,
          action,
        );
        receipts.push(receipt);
        plannedStateDescriptors.push(
          bindPlannedDescriptorToReceipt(
            plannedStateDescriptor(chunk.runtime, plan),
            receipt,
          ),
        );
        priorPlan = plan;
      }

      const actualStateIds = receipts.map((receipt) => receipt.stateId);
      expect(actualStateIds).toEqual(chunk.plans.map((plan) => `${chunk.runtime.labId}:${plan.id}`));
      expect(plannedStateDescriptors.map(({ stateId }) => stateId)).toEqual(
        actualStateIds,
      );
      const sessionWrites = writes.filter((write) => write.pathname === "/api/visualization-sessions");
      expect(sessionWrites).toHaveLength(1);
      expect(sessionWrites[0]?.body).toEqual({
        moduleId: configuredModuleId,
        source: chunk.runtime.lab.analyticsSource,
        topicId: chunk.runtime.labId,
      });
      expect(writes.filter((write) =>
        isApiFamilyPath(write.pathname, "/api/gamification") ||
        isApiFamilyPath(write.pathname, "/api/rewards") ||
        isApiFamilyPath(write.pathname, "/api/teacher/gamification") ||
        isApiFamilyPath(write.pathname, "/api/teacher/rewards") ||
        isApiFamilyPath(write.pathname, "/api/teacher/reward-awards")
      )).toEqual([]);
      for (const write of writes.filter((entry) => entry.pathname === "/api/learning-events")) {
        for (const event of visualizationLearningEvents(write.body)) {
          expect(event).toMatchObject({ topicId: chunk.runtime.labId });
        }
      }
      const finalSessions = await sessions(page);
      expect(finalSessions).toEqual([
        expect.objectContaining({
          explored: true,
          moduleId: configuredModuleId,
          source: chunk.runtime.lab.analyticsSource,
          topicId: chunk.runtime.labId,
          updatedAt: expect.any(String),
        }),
      ]);
      if (rawReplayRepresentative) {
        await durability.replayFirstDeliveryExactly({
          first: durabilityProbe.first,
        });
        executedRawReplayTopicIds.push(chunk.runtime.labId);
      }
      expect(await sessions(page)).toEqual(finalSessions);
      const durabilityReceipt: VisualizationLessonDurabilityFinalReceipt =
        await durability.finalReceipt();
      expect(durabilityReceipt.coverage).toBe(
        rawReplayRepresentative ? "full-raw-replay" : "browser",
      );
      expect(durabilityReceipt.directReplayCount).toBe(
        rawReplayRepresentative ? 1 : 0,
      );
      expect(durabilityReceipt.controlObserverStop).toBe(
        durabilityProbe.controlObserverStop,
      );
      expect(durabilityReceipt.second.controlObserverStop).toBe(
        durabilityProbe.controlObserverStop,
      );
      expect(durabilityReceipt.controlObserverStop).toBe(
        durabilityReceipt.second.controlObserverStop,
      );
      expect(durabilityReceipt.controlObserverStop).toMatchObject({
        active: false,
        eventCount: 4,
        lastSequence: 4,
        removalCount: 1,
        removedExactlyOnce: true,
        removedListenerCount: 5,
      });
      expect(durabilityReceipt.expectedControl).toEqual({
        first: durabilityProbe.first.expectedControl,
        second: durabilityProbe.second.expectedControl,
      });
      expect(durabilityReceipt.controlEvents).toEqual({
        first: durabilityProbe.first.controlEvents,
        second: durabilityProbe.second.controlEvents,
      });
      expect(durabilityReceipt.first).toBe(durabilityProbe.first);
      expect(durabilityReceipt.second).toBe(durabilityProbe.second);
      const finalFrozenEventCount =
        durabilityReceipt.controlObserverStop.events.length;
      const finalLedgerFrozen =
        Object.isFrozen(durabilityReceipt.controlObserverStop) &&
        Object.isFrozen(durabilityReceipt.controlObserverStop.events) &&
        durabilityReceipt.controlObserverStop.events.every((event) =>
          Object.isFrozen(event)
        ) &&
        Object.isFrozen(
          durabilityReceipt.controlObserverStop.removedEventTypes,
        );
      expect(finalFrozenEventCount).toBe(4);
      expect(finalLedgerFrozen).toBe(true);

      await testInfo.attach(`china-mainland-g05-${chunk.id}-${testInfo.project.name}.json`, {
        body: Buffer.from(JSON.stringify({
          canonicalExecutionCount: expectedCanonicalExecutionCount,
          chunkId: chunk.id,
          collisionScannerSha256,
          contrastScannerSha256,
          controlDomain: PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT,
          canonicalRunner,
          durabilityReceipts: {
            final: durabilityReceipt,
            mount: mountDurability,
            probe: durabilityProbe,
            rawReplayLedger: {
              expectedCountAcrossReport: expectedRawReplayCountAcrossReport,
              expectedProjects: expectedRawReplayProjects,
              expectedTopicIds: exactLabIds,
              included: rawReplayRepresentative,
              representativeRule:
                "desktop-chrome:first-canonical-chunk-per-g05-topic",
              topicId: chunk.runtime.labId,
            },
          },
          expectedChunkIds,
          expectedStateCountPerProject,
          expectedStateDescriptorPlanSha256,
          expectedStatePlanSha256,
          expectedTopicModeControlTable,
          expectedTopicModeControlTableSha256,
          integrationSourceSha256,
          producerSourceSha256,
          observedMutationWrites: writes,
          observedStateDescriptorPlanSha256,
          observedStatePlanSha256,
          observedTopicModeControlTableSha256,
          plannedStateDescriptors,
          plannedStateIds: chunk.plans.map((plan) => `${chunk.runtime.labId}:${plan.id}`),
          project: testInfo.project.name,
          receipts,
          schemaVersion: "china-mainland-g05-percent-applications-production.v3",
          sourceAggregates: {
            durabilityBrowserPairSha256:
              observedDurabilityBrowserPairAggregateSha256,
            durabilityFourFileSha256:
              observedDurabilityFourFileAggregateSha256,
            durabilitySerialization: durabilityPackageAggregateSerialization,
            scannerEntries: scannerPackageEntries.map(
              ({ repositoryRelativePath }) => repositoryRelativePath,
            ),
            scannerSerialization: scannerPackageAggregateSerialization,
            scannerSha256: observedScannerPackageAggregateSha256,
          },
          starshipPaths,
          testTitle: title,
          theme: student.theme,
          userId: student.userId,
          viewport,
        }, null, 2)),
        contentType: "application/json",
      });

      expectNoPageErrors(pageErrors);
      expect(consoleErrors).toEqual([]);
      expect(requestFailures).toEqual([]);
      expect(serverErrors).toEqual([]);
      executedChunkIds.push(chunk.id);
      executedStateIds.push(...actualStateIds);
      executedProjectNames.add(testInfo.project.name);
    });
  }
});
