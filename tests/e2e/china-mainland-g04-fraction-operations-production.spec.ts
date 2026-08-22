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
import { readFileSync, realpathSync } from "node:fs";

import {
  MAINLAND_FRACTION_OPERATIONS_LAB_IDS,
} from "../../components/visualizations/mainland/FractionOperationsLab";
import {
  FRACTION_OPERATIONS_MODE_ALLOWLIST,
  FRACTION_OPERATIONS_RESET_INPUTS,
  type FractionArithmeticOperation,
  type FractionOperationsLabId,
  type FractionOperationsMode,
} from "../../components/visualizations/mainland/FractionOperationsModel";
import {
  FRACTION_OPERATIONS_ACTION_RECEIPT_CONTRACT,
  FractionOperationsDivisorDomainError,
  FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
  FRACTION_OPERATIONS_DIVISOR_DOMAIN_VERSION,
  auditFractionOperationsDivisorTransition,
  createFractionOperationsAcceptedActionReceipt,
  createFractionOperationsRejectedActionReceipt,
  planFractionOperationsDivisorTransition,
  type FractionOperationsActionReceipt,
  type FractionOperationsActionRequest,
  type FractionOperationsControlId,
  type FractionOperationsDomainRequest,
  type FractionOperationsDomainState,
  type FractionOperationsEvaluatedOperation,
  type FractionOperationsDivisorTransitionReceipt,
} from "../../components/visualizations/mainland/FractionOperationsControlDomain";
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
  chinaVisualizationCollisionPairKinds,
} from "./china-visualization-collision-receipt";
import {
  installHkVisualizationEffectiveVisibilityInspector,
  scanHkVisualizationCollisions,
  type HkVisualizationCollisionCandidatePairCounts,
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
const endpointNames = ["min", "mid", "max"] as const;
const numericParameters = [
  "left-numerator",
  "left-denominator",
  "right-numerator",
  "right-denominator",
] as const satisfies readonly FractionOperationsControlId[];
const maximumStatesPerChunk = 32;
const expectedStateCountPerProject = 357;
const expectedChunkCountPerProject = 13;
const expectedCanonicalExecutionCount = 26;
const expectedStatePlanSha256 =
  "077767c50993274aac87f94d8c0da07c18219fc23ce1c6c6f95b84f40a81ff41";
const expectedStateDescriptorPlanSha256 =
  "701af7210820f410d663a2eab8018c3d9f4cfe2cbc55651e68c3d5f25adf3978";
const expectedTopicModeControlTableSha256 =
  "a671d2aead108507445a1acb72182b7caccb7fe2bac6ad0341f5b938b55e4171";
const expectedDurabilityBrowserHelperSha256 =
  "f27ae08a91ec2f5daa97ed905342f99d7abf9693c4d82532a3b1f6d8fc93bccb";
const expectedDurabilityBrowserHelperTestSha256 =
  "86ac16b4cc4b23a4cd99196fb49a6cd6a632a47aa3cd3003c0d9ff5a26020d76";
const expectedDurabilityBrowserPairAggregateSha256 =
  "e94c63f04a68a67f014181bbbbf098e6222b7a9bd31981752ad470c55d85fff3";
const expectedDurabilityFourFileAggregateSha256 =
  "d7d9a07f10b5d9e7726fd0fb8e30549ae6d73f1ec92fcd1c06ceab8f743404ba";
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
const expectedScannerSixCaseTestSha256 =
  "0e6c42d5750c9b127fa583625be7c49757370cd239155fac9c0766c05ac1f7e7";
const expectedScannerPackageAggregateSha256 =
  "6ff36e516d1d2da6ff04c4be632942c4f52cf63929b83013b56a35e7255e2502";
const collisionScannerSha256 =
  "b775c93f615522da021cf813a42304bee27d5ba437b0e06247ccd4f5049f5824";
const contrastScannerSha256 =
  "81cd3d4a612ae5934586be0cd0fa5a3e6987c96c3d6c89af32f76b8ef697913e";

const exactLabIds = [
  "bnu-primary-p5-lower-fraction-add-sub",
  "bnu-primary-p5-lower-fraction-division",
  "bnu-primary-p5-lower-fraction-multiplication",
  "hjb-primary-p5-lower-fractions-equivalence-operations",
  "pep-primary-p5-lower-factors-fractions",
] as const satisfies readonly FractionOperationsLabId[];

const exactNumericControls = [
  "left-numerator",
  "left-denominator",
  "right-numerator",
  "right-denominator",
] as const;
const exactEstimateControls = [
  "estimate-operation",
  ...exactNumericControls,
] as const;
const expectedTopicModeControlTable = {
  "bnu-primary-p5-lower-fraction-add-sub": {
    controls: {
      add: exactNumericControls,
      estimate: exactEstimateControls,
      simplify: exactNumericControls,
      subtract: exactNumericControls,
    },
    estimateOperations: ["add", "subtract"],
    modes: ["add", "subtract", "simplify", "estimate"],
  },
  "bnu-primary-p5-lower-fraction-division": {
    controls: {
      divide: exactNumericControls,
      estimate: exactEstimateControls,
      simplify: exactNumericControls,
    },
    estimateOperations: ["divide"],
    modes: ["divide", "simplify", "estimate"],
  },
  "bnu-primary-p5-lower-fraction-multiplication": {
    controls: {
      estimate: exactEstimateControls,
      multiply: exactNumericControls,
      simplify: exactNumericControls,
    },
    estimateOperations: ["multiply"],
    modes: ["multiply", "simplify", "estimate"],
  },
  "hjb-primary-p5-lower-fractions-equivalence-operations": {
    controls: {
      add: exactNumericControls,
      compare: exactNumericControls,
      equivalence: exactNumericControls,
      estimate: exactEstimateControls,
      simplify: exactNumericControls,
      subtract: exactNumericControls,
    },
    estimateOperations: ["add", "subtract"],
    modes: [
      "equivalence",
      "compare",
      "add",
      "subtract",
      "simplify",
      "estimate",
    ],
  },
  "pep-primary-p5-lower-factors-fractions": {
    controls: {
      add: exactNumericControls,
      compare: exactNumericControls,
      divide: exactNumericControls,
      equivalence: exactNumericControls,
      estimate: exactEstimateControls,
      multiply: exactNumericControls,
      simplify: exactNumericControls,
      subtract: exactNumericControls,
    },
    estimateOperations: ["add", "subtract", "multiply", "divide"],
    modes: [
      "equivalence",
      "compare",
      "add",
      "subtract",
      "multiply",
      "divide",
      "simplify",
      "estimate",
    ],
  },
} as const;

type EndpointName = (typeof endpointNames)[number];
type NumericParameter = (typeof numericParameters)[number];
type Publisher = "MAINLAND_BNU" | "MAINLAND_HJB" | "MAINLAND_PEP";
type Track = "MAINLAND_BNU" | "MAINLAND_HJB" | "MAINLAND_PEP_PRIMARY";
type Stage = "audit" | "interaction" | "mount";
type DomainScenario = "direct-divide" | "estimate-divide";
type DomainStep =
  | "zero-outside-divide"
  | "project-enter-divide"
  | "reject-direct-zero"
  | "leave-divide"
  | "reenter-no-resurrection";

type RuntimeCase = Readonly<{
  estimateOperations: readonly FractionArithmeticOperation[];
  lab: FeaturedLabDefinition;
  labId: FractionOperationsLabId;
  modes: readonly FractionOperationsMode[];
  publisher: Publisher;
  track: Track;
}>;

type InitialPlan = Readonly<{
  atomicGroup?: string;
  id: "initial";
  kind: "initial";
}>;

type FirstInteractionPlan = Readonly<{
  atomicGroup?: string;
  id: "first-interaction";
  kind: "first-interaction";
}>;

type ModePlan = Readonly<{
  atomicGroup?: string;
  id: string;
  kind: "mode";
  mode: FractionOperationsMode;
}>;

type NumericEndpointPlan = Readonly<{
  atomicGroup?: string;
  endpoint: EndpointName;
  id: string;
  kind: "numeric-endpoint";
  mode: FractionOperationsMode;
  parameter: NumericParameter;
}>;

type EstimateOperationPlan = Readonly<{
  atomicGroup?: string;
  id: string;
  kind: "estimate-operation";
  operation: FractionArithmeticOperation;
}>;

type DomainPlan = Readonly<{
  atomicGroup: string;
  id: string;
  kind: "domain";
  scenario: DomainScenario;
  step: DomainStep;
}>;

type ResetPlan = Readonly<{
  atomicGroup?: string;
  id: "reset";
  kind: "reset";
}>;

type StatePlan =
  | InitialPlan
  | FirstInteractionPlan
  | ModePlan
  | NumericEndpointPlan
  | EstimateOperationPlan
  | DomainPlan
  | ResetPlan;

type RuntimeChunk = Readonly<{
  id: string;
  index: number;
  plans: readonly StatePlan[];
  runtime: RuntimeCase;
  total: number;
}>;

type ControlSnapshot = Readonly<{
  affects: readonly string[];
  disabled: boolean;
  kind: "number" | "select";
  max: number | null;
  min: number | null;
  options: readonly string[];
  parameter: string;
  projection: string | null;
  projectionReason: string | null;
  step: number | null;
  value: string;
  zeroExcluded: boolean | null;
}>;

type DomainState = FractionOperationsDomainState;

type DomainReceipt = Readonly<{
  expected: DomainState;
  match: true;
  observed: DomainState;
  projectionCount: number;
  projectionReasons: readonly string[];
  rejection: string | null;
  requested: DomainState;
}>;

type VisualReceipt = Readonly<{
  kind: string;
  markCount: number;
  receipt: unknown;
  status: "supported";
}>;

type VisualAudit = Readonly<{
  expectedInterpretations: readonly string[];
  supported: readonly VisualReceipt[];
  unsupported: readonly Readonly<{ kind: string; reason: string }>[];
}>;

type CollisionReceipt = Readonly<{
  candidatePairCounts: HkVisualizationCollisionCandidatePairCounts;
  htmlTextFragmentCount: number;
  inspectedCandidateCount: number;
  learnerControlCount: number;
  overlapExemptionCount: number;
  paintedMarkCount: number;
  svgSurfaceCount: number;
  svgTextFragmentCount: number;
  totalCandidatePairCount: number;
}>;

type PlannedRequest = FractionOperationsActionRequest;

type PlannedStateDescriptor = Readonly<{
  labId: FractionOperationsLabId;
  plan: Readonly<{
    controlParameter:
      | FractionOperationsControlId
      | "mode/evaluated-operation"
      | null;
    kind: FractionOperationsActionRequest["kind"];
    mode: FractionOperationsMode;
    request: FractionOperationsActionRequest;
  }>;
  stateId: string;
}>;

type ActionEvidence = Readonly<{
  beforeControls: readonly ControlSnapshot[];
  beforeDomain: DomainReceipt;
  expectedActionReceipt: FractionOperationsActionReceipt;
  expectedRejection: string | null;
  expectedProjection: boolean | null;
  oracleAfter: DomainState;
  oracleBefore: DomainState;
  observedControls: readonly ControlSnapshot[];
  plannedRequest: PlannedRequest;
  plannerReceipt: FractionOperationsDivisorTransitionReceipt | null;
  rejectedRequest: FractionOperationsDomainRequest | null;
}>;

type StateReceipt = Readonly<{
  action: ActionEvidence;
  collision: CollisionReceipt;
  configuredState: string;
  contrast: Readonly<{
    auditedTextCount: number;
    minRatio: number;
    requiredRatio: number;
    worstTarget: string;
  }>;
  controls: readonly ControlSnapshot[];
  domain: DomainReceipt;
  evaluatedOperation: string;
  mode: string;
  pageOverflow: Readonly<{
    bodyScrollWidth: number;
    documentClientWidth: number;
    documentScrollWidth: number;
  }>;
  productActionReceipt: FractionOperationsActionReceipt;
  runtimeSignature: RuntimeSignature;
  stateId: string;
  touchTargetCount: number;
  visual: VisualAudit;
}>;

type RuntimeSignature = Readonly<{
  action: Readonly<Record<string, string>>;
  configuredState: string | null;
  controls: readonly Readonly<{
    attributes: Readonly<Record<string, string>>;
    disabled: boolean;
    options: readonly Readonly<{ disabled: boolean; value: string }> [];
    tagName: string;
    text: string;
    value: string | null;
  }>[];
  domain: Readonly<{
    domainId: string | null;
    domainVersion: string | null;
    expected: unknown;
    match: string | null;
    observed: unknown;
    projectionCount: string | null;
    projectionReasons: readonly string[];
    projections: readonly Readonly<{
      affects: string | null;
      parameter: string | null;
      projection: string;
      reason: string | null;
    }>[];
    rejection: string | null;
    requested: unknown;
  }>;
  evaluatedOperation: string | null;
  mode: string | null;
  semanticState: string | null;
  visual: Readonly<{
    geometry: readonly Readonly<{
      attributes: Readonly<Record<string, string>>;
      text: string;
    }>[];
    interpretations: readonly Readonly<{
      attributes: Readonly<Record<string, string>>;
      text: string;
    }>[];
    visibleReceipts: readonly Readonly<{
      attributes: Readonly<Record<string, string>>;
      text: string;
    }>[];
  }>;
}>;

type ObservedWrite = Readonly<{
  body: unknown;
  method: string;
  pathname: string;
  stage: Stage;
}>;

type FirstSessionAcknowledgement = Readonly<{
  acknowledgedUserId: string;
  durablyPersisted: true;
  session: Readonly<{
    completedAt: string;
    explored: true;
    moduleId: typeof configuredModuleId;
    source: FeaturedLabDefinition["analyticsSource"];
    topicId: FractionOperationsLabId;
    updatedAt: string;
  }>;
}>;

function fail(message: string): never {
  throw new TypeError(message);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
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
  fail(`G04 descriptor value is not canonical JSON: ${String(value)}.`);
}

function assertJsonExact(label: string, actual: unknown, expected: unknown) {
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    fail(
      `${label} drifted; expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}.`,
    );
  }
}

function assertExactOwnKeys(
  label: string,
  value: unknown,
  expectedKeys: readonly string[],
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    fail(`${label}: value is not a record.`);
  }
  const actualKeys = Reflect.ownKeys(value);
  if (
    actualKeys.some((key) => typeof key !== "string") ||
    JSON.stringify((actualKeys as string[]).sort()) !==
      JSON.stringify([...expectedKeys].sort())
  ) {
    fail(
      `${label}: keys are not exact; expected=${JSON.stringify([...expectedKeys].sort())} actual=${JSON.stringify(actualKeys)}.`,
    );
  }
}

function sourceFileSha256(relativePath: string) {
  return createHash("sha256")
    .update(readFileSync(`${__dirname}/${relativePath}`))
    .digest("hex");
}

const scannerPackagePaths = [
  "tests/e2e/hk-visualization-collision-scanner.ts",
  "tests/e2e/hk-visualization-text-contrast-scanner.ts",
  "tests/e2e/hk-visualization-scanner-six-case-contract.test.mjs",
] as const;

function scannerPackageSha256() {
  const hash = createHash("sha256");
  for (const repositoryRelativePath of scannerPackagePaths) {
    hash.update(repositoryRelativePath, "utf8");
    hash.update(Uint8Array.of(0));
    hash.update(readFileSync(`${__dirname}/../../${repositoryRelativePath}`));
  }
  return hash.digest("hex");
}

const durabilityBrowserPairPaths = [
  "tests/e2e/visualization-lesson-session-durability-browser.ts",
  "tests/e2e/visualization-lesson-session-durability-browser.test.ts",
] as const;
const durabilityFourFilePaths = [
  ...durabilityBrowserPairPaths,
  "tests/e2e/visualization-lesson-session-durability.ts",
  "tests/e2e/visualization-lesson-session-durability.test.ts",
] as const;

function shasumLineAggregateSha256(
  repositoryRelativePaths: readonly string[],
) {
  const aggregate = createHash("sha256");
  for (const repositoryRelativePath of repositoryRelativePaths) {
    const digest = createHash("sha256")
      .update(readFileSync(`${__dirname}/../../${repositoryRelativePath}`))
      .digest("hex");
    aggregate.update(`${digest}  ${repositoryRelativePath}\n`, "utf8");
  }
  return aggregate.digest("hex");
}

const integrationSourceSha256 = Object.freeze({
  durabilityBrowser: sourceFileSha256(
    "visualization-lesson-session-durability-browser.ts",
  ),
  durabilityBrowserPairAggregate: shasumLineAggregateSha256(
    durabilityBrowserPairPaths,
  ),
  durabilityBrowserTest: sourceFileSha256(
    "visualization-lesson-session-durability-browser.test.ts",
  ),
  durabilityFourFileAggregate: shasumLineAggregateSha256(
    durabilityFourFilePaths,
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
  scannerCollision: sourceFileSha256("hk-visualization-collision-scanner.ts"),
  scannerContrast: sourceFileSha256(
    "hk-visualization-text-contrast-scanner.ts",
  ),
  scannerSixCaseTest: sourceFileSha256(
    "hk-visualization-scanner-six-case-contract.test.mjs",
  ),
  scannerPackageAggregate: scannerPackageSha256(),
});
assertJsonExact("G04 approved durability/validator source SHA", integrationSourceSha256, {
  durabilityBrowser: expectedDurabilityBrowserHelperSha256,
  durabilityBrowserPairAggregate:
    expectedDurabilityBrowserPairAggregateSha256,
  durabilityBrowserTest: expectedDurabilityBrowserHelperTestSha256,
  durabilityFourFileAggregate: expectedDurabilityFourFileAggregateSha256,
  durabilityPure: expectedDurabilityPureHelperSha256,
  durabilityPureTest: expectedDurabilityPureHelperTestSha256,
  focusedReportValidator: expectedFocusedReportValidatorSha256,
  focusedReportValidatorTest: expectedFocusedReportValidatorTestSha256,
  nextEnv: expectedNextEnvSha256,
  scannerCollision: collisionScannerSha256,
  scannerContrast: contrastScannerSha256,
  scannerSixCaseTest: expectedScannerSixCaseTestSha256,
  scannerPackageAggregate: expectedScannerPackageAggregateSha256,
});
const producerSourceSha256 = createHash("sha256")
  .update(readFileSync(__filename))
  .digest("hex");

function exactPlannerReceipt(
  current: DomainState,
  request: FractionOperationsDomainRequest,
) {
  const plan = planFractionOperationsDivisorTransition(current, request);
  const receipt = auditFractionOperationsDivisorTransition(plan, plan.expected);
  if (!receipt.matchesExpected) {
    fail(`G04 production planner audit rejected ${JSON.stringify(request)}.`);
  }
  assertJsonExact("planner requested receipt", receipt.requested, plan.requested);
  assertJsonExact("planner expected receipt", receipt.expected, plan.expected);
  assertJsonExact("planner observed receipt", receipt.observed, plan.expected);
  assertJsonExact("planner projection receipt", receipt.projections, plan.projections);
  return receipt;
}

function assertProductionPlannerCanaries() {
  const simplify: DomainState = {
    evaluatedOperation: "simplify",
    leftDenominator: 8,
    leftNumerator: 7,
    mode: "simplify",
    rightDenominator: 9,
    rightNumerator: 0,
  };
  const add = exactPlannerReceipt(simplify, {
    evaluatedOperation: "add",
    kind: "controller",
    mode: "add",
  });
  assertJsonExact("simplify to add requested state", add.requested, {
    ...simplify,
    evaluatedOperation: "add",
    mode: "add",
  });
  assertJsonExact("simplify to add expected state", add.expected, add.requested);
  assertJsonExact("simplify to add observed state", add.observed, add.requested);
  assertJsonExact("simplify to add projections", add.projections, []);

  const estimateDivide = exactPlannerReceipt(simplify, {
    evaluatedOperation: "divide",
    kind: "controller",
    mode: "estimate",
  });
  assertJsonExact("estimate divide requested state", estimateDivide.requested, {
    ...simplify,
    evaluatedOperation: "divide",
    mode: "estimate",
  });
  assertJsonExact("estimate divide expected state", estimateDivide.expected, {
    ...estimateDivide.requested,
    rightNumerator: 1,
  });
  assertJsonExact("estimate divide exact single projection", estimateDivide.projections, [
    {
      affectedControlId: "right-numerator",
      after: 1,
      before: 0,
      controllerInputs: {
        evaluatedOperation: "divide",
        mode: "estimate",
      },
      domainId: FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
      projection: "exclude-zero",
      reason: "division-divisor-cannot-be-zero",
    },
  ]);

  const leftDivide = exactPlannerReceipt(estimateDivide.expected, {
    evaluatedOperation: "simplify",
    kind: "controller",
    mode: "simplify",
  });
  const reenteredDivide = exactPlannerReceipt(leftDivide.expected, {
    evaluatedOperation: "divide",
    kind: "controller",
    mode: "estimate",
  });
  if (
    leftDivide.expected.rightNumerator !== 1 ||
    reenteredDivide.expected.rightNumerator !== 1
  ) {
    fail("G04 leave/reenter canary resurrected a stale zero divisor.");
  }
  assertJsonExact("leave divide projections", leftDivide.projections, []);
  assertJsonExact("reenter divide projections", reenteredDivide.projections, []);

  const rejectionPreimage = JSON.stringify(reenteredDivide.expected);
  let rejectionCode: string | null = null;
  try {
    planFractionOperationsDivisorTransition(reenteredDivide.expected, {
      controlId: "right-numerator",
      kind: "control",
      value: 0,
    });
  } catch (error) {
    if (error instanceof FractionOperationsDivisorDomainError) {
      rejectionCode = error.code;
    } else {
      throw error;
    }
  }
  if (rejectionCode !== "DIRECT_DIVISOR_ZERO_REQUEST") {
    fail(`G04 direct-zero canary returned ${String(rejectionCode)}.`);
  }
  if (JSON.stringify(reenteredDivide.expected) !== rejectionPreimage) {
    fail("G04 direct-zero canary mutated the full pre-rejection state.");
  }
  const acceptedAction = createFractionOperationsAcceptedActionReceipt({
    before: simplify,
    expected: estimateDivide.expected,
    observed: estimateDivide.observed,
    projections: estimateDivide.projections,
    request: estimateDivide.request,
    requested: estimateDivide.requested,
  });
  assertJsonExact("accepted action canary", acceptedAction, {
    accepted: true,
    before: simplify,
    domainId: FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
    domainVersion: FRACTION_OPERATIONS_DIVISOR_DOMAIN_VERSION,
    expected: estimateDivide.expected,
    matchesExpected: true,
    observed: estimateDivide.observed,
    projections: estimateDivide.projections,
    rejection: null,
    request: estimateDivide.request,
    requested: estimateDivide.requested,
    requestedValidity: "requires-projection",
    status: "accepted",
    version: FRACTION_OPERATIONS_ACTION_RECEIPT_CONTRACT.id,
  });
  const rejectedRequest = {
    controlId: "right-numerator",
    kind: "control",
    value: 0,
  } as const satisfies FractionOperationsDomainRequest;
  const rejectedAction = createFractionOperationsRejectedActionReceipt({
    before: reenteredDivide.expected,
    rejection: "DIRECT_DIVISOR_ZERO_REQUEST",
    request: rejectedRequest,
  });
  assertJsonExact("rejected action canary", rejectedAction, {
    accepted: false,
    before: reenteredDivide.expected,
    domainId: FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
    domainVersion: FRACTION_OPERATIONS_DIVISOR_DOMAIN_VERSION,
    expected: reenteredDivide.expected,
    matchesExpected: true,
    observed: reenteredDivide.expected,
    projections: [],
    rejection: "DIRECT_DIVISOR_ZERO_REQUEST",
    request: rejectedRequest,
    requested: { ...reenteredDivide.expected, rightNumerator: 0 },
    requestedValidity: "rejected-invalid",
    status: "rejected",
    version: FRACTION_OPERATIONS_ACTION_RECEIPT_CONTRACT.id,
  });
  return Object.freeze({
    acceptedActionStatus: acceptedAction.status,
    directZeroRejection: rejectionCode,
    estimateDivideProjectionCount: estimateDivide.projections.length,
    leaveReenterRightNumerator: reenteredDivide.expected.rightNumerator,
    rejectedActionStatus: rejectedAction.status,
    simplifyToAddPreservedOperands: true,
  });
}

const sourcePlannerCanaries = assertProductionPlannerCanaries();

function exactSorted(values: readonly string[]) {
  return [...values].sort();
}

function assertExactSet(
  label: string,
  actual: readonly string[],
  expected: readonly string[],
) {
  const actualSorted = exactSorted(actual);
  const expectedSorted = exactSorted(expected);
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    fail(
      `${label} must remain exact; expected=${JSON.stringify(expectedSorted)} actual=${JSON.stringify(actualSorted)}.`,
    );
  }
}

assertExactSet(
  "G04 Mainland production registry",
  MAINLAND_FRACTION_OPERATIONS_LAB_IDS,
  exactLabIds,
);

function topicModeControlContract(labId: FractionOperationsLabId): Readonly<{
  controls: Readonly<
    Partial<Record<FractionOperationsMode, readonly string[]>>
  >;
  estimateOperations: readonly FractionArithmeticOperation[];
  modes: readonly FractionOperationsMode[];
}> {
  return expectedTopicModeControlTable[labId];
}

function runtimeCase(
  labId: FractionOperationsLabId,
  publisher: Publisher,
  track: Track,
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
    fail(
      `${labId}: catalog identity drifted: ${JSON.stringify({
        curriculumTrack: lab.curriculumTrack,
        labId: lab.labId,
        moduleId: lab.moduleId,
        publisher: lab.publisher,
        templateId: lab.templateId,
        topicId: lab.topicId,
      })}.`,
    );
  }
  const topicContract = topicModeControlContract(labId);
  if (
    JSON.stringify(FRACTION_OPERATIONS_MODE_ALLOWLIST[labId]) !==
    JSON.stringify(topicContract.modes)
  ) {
    fail(`${labId}: production modes drifted from the independent topic table.`);
  }
  for (const mode of topicContract.modes) {
    if (!topicContract.controls[mode]) {
      fail(`${labId}:${mode}: independent topic control row is missing.`);
    }
  }
  const modes = topicContract.modes;
  const estimateOperations = topicContract.estimateOperations;
  return { estimateOperations, lab, labId, modes, publisher, track };
}

const runtimeCases = [
  runtimeCase(
    "bnu-primary-p5-lower-fraction-add-sub",
    "MAINLAND_BNU",
    "MAINLAND_BNU",
  ),
  runtimeCase(
    "bnu-primary-p5-lower-fraction-division",
    "MAINLAND_BNU",
    "MAINLAND_BNU",
  ),
  runtimeCase(
    "bnu-primary-p5-lower-fraction-multiplication",
    "MAINLAND_BNU",
    "MAINLAND_BNU",
  ),
  runtimeCase(
    "hjb-primary-p5-lower-fractions-equivalence-operations",
    "MAINLAND_HJB",
    "MAINLAND_HJB",
  ),
  runtimeCase(
    "pep-primary-p5-lower-factors-fractions",
    "MAINLAND_PEP",
    "MAINLAND_PEP_PRIMARY",
  ),
] as const;

function resetDomainState(runtime: RuntimeCase): DomainState {
  const reset = FRACTION_OPERATIONS_RESET_INPUTS[runtime.labId];
  const evaluatedOperation = reset.mode as FractionOperationsEvaluatedOperation;
  return {
    evaluatedOperation,
    leftDenominator: reset.left.denominator,
    leftNumerator: reset.left.numerator,
    mode: reset.mode,
    rightDenominator: reset.right.denominator,
    rightNumerator: reset.right.numerator,
  };
}

function evaluatedOperationForMode(
  runtime: RuntimeCase,
  mode: FractionOperationsMode,
): FractionOperationsEvaluatedOperation {
  if (mode !== "estimate") {
    return mode as FractionOperationsEvaluatedOperation;
  }
  const evaluatedOperation = runtime.estimateOperations[0];
  if (!evaluatedOperation) {
    fail(`${runtime.labId}: estimate mode has no independent operation.`);
  }
  return evaluatedOperation;
}

function domainPlans(labId: FractionOperationsLabId): readonly DomainPlan[] {
  if (!(FRACTION_OPERATIONS_MODE_ALLOWLIST[labId] as readonly string[]).includes("divide")) {
    return [];
  }
  const atomicGroup = `${labId}:divisor-domain-sequences`;
  return (["direct-divide", "estimate-divide"] as const).flatMap(
    (scenario) =>
      ([
        "zero-outside-divide",
        "project-enter-divide",
        "reject-direct-zero",
        "leave-divide",
        "reenter-no-resurrection",
      ] as const).map((step) => ({
        atomicGroup,
        id: `domain:${scenario}:${step}`,
        kind: "domain" as const,
        scenario,
        step,
      })),
  );
}

function statePlans(runtime: RuntimeCase): readonly StatePlan[] {
  const plans: StatePlan[] = [
    { id: "initial", kind: "initial" },
    { id: "first-interaction", kind: "first-interaction" },
  ];
  for (const mode of runtime.modes) {
    plans.push({ id: `mode:${mode}`, kind: "mode", mode });
    for (const parameter of numericParameters) {
      for (const endpoint of endpointNames) {
        plans.push({
          endpoint,
          id: `numeric:${mode}:${parameter}:${endpoint}`,
          kind: "numeric-endpoint",
          mode,
          parameter,
        });
      }
    }
    if (mode === "estimate") {
      for (const operation of runtime.estimateOperations) {
        plans.push({
          id: `estimate-operation:${operation}`,
          kind: "estimate-operation",
          operation,
        });
      }
    }
  }
  const special = domainPlans(runtime.labId);
  if (special.length > 0) {
    plans.push(
      ...special,
      {
        atomicGroup: special[0]!.atomicGroup,
        id: "reset",
        kind: "reset",
      },
    );
  } else {
    plans.push({ id: "reset", kind: "reset" });
  }
  return plans;
}

function groupedPlans(plans: readonly StatePlan[]): readonly (readonly StatePlan[])[] {
  const groups: StatePlan[][] = [];
  for (const plan of plans) {
    const prior = groups.at(-1);
    if (
      plan.atomicGroup &&
      prior?.[0]?.atomicGroup === plan.atomicGroup
    ) {
      prior.push(plan);
    } else {
      groups.push([plan]);
    }
  }
  return groups;
}

function chunkRuntime(runtime: RuntimeCase): readonly RuntimeChunk[] {
  const chunks: StatePlan[][] = [];
  let current: StatePlan[] = [];
  for (const group of groupedPlans(statePlans(runtime))) {
    if (group.length > maximumStatesPerChunk) {
      fail(`${runtime.labId}: atomic state group exceeds ${maximumStatesPerChunk}.`);
    }
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
const expectedChunkStateCounts = new Map<FractionOperationsLabId, readonly number[]>([
  ["bnu-primary-p5-lower-fraction-add-sub", [32, 25]],
  ["bnu-primary-p5-lower-fraction-division", [32, 21]],
  ["bnu-primary-p5-lower-fraction-multiplication", [32, 11]],
  ["hjb-primary-p5-lower-fractions-equivalence-operations", [32, 32, 19]],
  ["pep-primary-p5-lower-factors-fractions", [32, 32, 32, 25]],
]);

for (const runtime of runtimeCases) {
  const actual = runtimeChunks
    .filter((chunk) => chunk.runtime.labId === runtime.labId)
    .map((chunk) => chunk.plans.length);
  const expected = expectedChunkStateCounts.get(runtime.labId);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(
      `${runtime.labId}: source-level chunk contract drifted; expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}.`,
    );
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

const expectedStateIds = runtimeChunks.flatMap((chunk) =>
  chunk.plans.map((plan) => `${chunk.runtime.labId}:${plan.id}`),
);
const expectedChunkIds = runtimeChunks.map((chunk) => chunk.id);
const expectedTestTitles = runtimeChunks.map(
  (chunk) => `G04 ${chunk.id} audits ${chunk.plans.length} exact states`,
);

function staticNumericEndpointValue(
  parameter: NumericParameter,
  endpoint: EndpointName,
) {
  const denominator = parameter.endsWith("-denominator");
  const minimum = denominator ? 1 : -48;
  const maximum = denominator ? 24 : 48;
  if (endpoint === "min") return minimum;
  if (endpoint === "max") return maximum;
  return minimum + Math.floor((maximum - minimum) / 2);
}

function staticPlanMode(
  runtime: RuntimeCase,
  plan: StatePlan,
): FractionOperationsMode {
  if (
    plan.kind === "initial" ||
    plan.kind === "first-interaction" ||
    plan.kind === "reset"
  ) {
    return FRACTION_OPERATIONS_RESET_INPUTS[runtime.labId].mode;
  }
  if (plan.kind === "mode" || plan.kind === "numeric-endpoint") {
    return plan.mode;
  }
  if (plan.kind === "estimate-operation") return "estimate";
  if (
    plan.step === "zero-outside-divide" ||
    plan.step === "leave-divide"
  ) {
    return "simplify";
  }
  return plan.scenario === "direct-divide" ? "divide" : "estimate";
}

function staticPlanEvaluatedOperation(
  runtime: RuntimeCase,
  plan: StatePlan,
): FractionOperationsEvaluatedOperation {
  if (
    plan.kind === "initial" ||
    plan.kind === "first-interaction" ||
    plan.kind === "reset"
  ) {
    return resetDomainState(runtime).evaluatedOperation;
  }
  if (plan.kind === "mode" || plan.kind === "numeric-endpoint") {
    return evaluatedOperationForMode(runtime, plan.mode);
  }
  if (plan.kind === "estimate-operation") return plan.operation;
  return plan.step === "zero-outside-divide" || plan.step === "leave-divide"
    ? "simplify"
    : "divide";
}

function staticPlanRequest(
  runtime: RuntimeCase,
  plan: StatePlan,
): FractionOperationsActionRequest {
  if (plan.kind === "initial") return { kind: "initial" };
  if (plan.kind === "reset") return { kind: "reset" };
  if (plan.kind === "first-interaction") {
    const reset = resetDomainState(runtime);
    return {
      controlId: "left-numerator",
      kind: "control",
      value:
        reset.leftNumerator < 48
          ? reset.leftNumerator + 1
          : reset.leftNumerator - 1,
    };
  }
  if (plan.kind === "mode") {
    return {
      evaluatedOperation: evaluatedOperationForMode(runtime, plan.mode),
      kind: "controller",
      mode: plan.mode,
    };
  }
  if (plan.kind === "numeric-endpoint") {
    return {
      controlId: plan.parameter,
      kind: "control",
      value: staticNumericEndpointValue(plan.parameter, plan.endpoint),
    };
  }
  if (plan.kind === "estimate-operation") {
    return {
      evaluatedOperation: plan.operation,
      kind: "controller",
      mode: "estimate",
    };
  }
  if (
    plan.step === "zero-outside-divide" ||
    plan.step === "reject-direct-zero"
  ) {
    return {
      controlId: "right-numerator",
      kind: "control",
      value: 0,
    };
  }
  if (plan.step === "leave-divide") {
    return {
      evaluatedOperation: "simplify",
      kind: "controller",
      mode: "simplify",
    };
  }
  return {
    evaluatedOperation: "divide",
    kind: "controller",
    mode: plan.scenario === "direct-divide" ? "divide" : "estimate",
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
      ? "mode/evaluated-operation"
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
    fail(`G04 descriptor count drifted; actual=${descriptors.length}.`);
  }
  for (const [index, descriptor] of descriptors.entries()) {
    const expected = expectedStateDescriptors[index];
    if (
      !expected ||
      validatorCanonicalJson(descriptor) !== validatorCanonicalJson(expected)
    ) {
      fail(`G04 descriptor semantics drifted at index ${index}.`);
    }
    assertExactSet(
      `G04 descriptor ${index} keys`,
      Object.keys(descriptor),
      ["labId", "plan", "stateId"],
    );
    assertExactSet(
      `G04 descriptor ${index} plan keys`,
      Object.keys(descriptor.plan),
      ["controlParameter", "kind", "mode", "request"],
    );
    if (!descriptor.stateId.startsWith(`${descriptor.labId}:`)) {
      fail(`G04 descriptor ${index} lab/state binding drifted.`);
    }
    const request = descriptor.plan.request;
    if (request.kind === "control") {
      assertExactSet(
        `G04 descriptor ${index} control request keys`,
        Object.keys(request),
        ["controlId", "kind", "value"],
      );
      if (descriptor.plan.controlParameter !== request.controlId) {
        fail(`G04 descriptor ${index} lost its exact controlId identity.`);
      }
    } else if (request.kind === "controller") {
      assertExactSet(
        `G04 descriptor ${index} controller request keys`,
        Object.keys(request),
        ["evaluatedOperation", "kind", "mode"],
      );
      if (
        descriptor.plan.controlParameter !== "mode/evaluated-operation" ||
        descriptor.plan.mode !== request.mode
      ) {
        fail(`G04 descriptor ${index} lost its composite controller identity.`);
      }
    } else {
      assertExactSet(
        `G04 descriptor ${index} ${request.kind} request keys`,
        Object.keys(request),
        ["kind"],
      );
      if (descriptor.plan.controlParameter !== null) {
        fail(`G04 descriptor ${index} ${request.kind} gained a fake control.`);
      }
    }
  }
  const bytes = canonicalDescriptorLines(descriptors);
  if (bytes !== expectedBytes) {
    fail("G04 descriptor canonical JSON-lines bytes drifted.");
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
    fail(`G04 descriptor mutation canary accepted ${label}.`);
  };

  mustReject("cross-lab binding", (candidate) => {
    candidate[0] = { ...candidate[0]!, labId: exactLabIds[1] };
  });
  mustReject("G04 controlId alias", (candidate) => {
    const index = candidate.findIndex(({ plan }) => plan.kind === "control");
    const descriptor = candidate[index]!;
    const request = descriptor.plan.request;
    if (request.kind !== "control") fail("G04 controlId canary has no control request.");
    candidate[index] = {
      ...descriptor,
      plan: {
        ...descriptor.plan,
        request: {
          control: request.controlId,
          kind: request.kind,
          value: request.value,
        } as unknown as FractionOperationsActionRequest,
      },
    };
  });
  mustReject("controller composite request", (candidate) => {
    const index = candidate.findIndex(({ plan }) => plan.kind === "controller");
    const descriptor = candidate[index]!;
    const request = descriptor.plan.request;
    if (request.kind !== "controller") {
      fail("G04 composite-controller canary has no controller request.");
    }
    candidate[index] = {
      ...descriptor,
      plan: {
        ...descriptor.plan,
        request: {
          controller: "mode",
          kind: request.kind,
          mode: request.mode,
        } as unknown as FractionOperationsActionRequest,
      },
    };
  });
  mustReject("controller composite control parameter", (candidate) => {
    const index = candidate.findIndex(({ plan }) => plan.kind === "controller");
    const descriptor = candidate[index]!;
    candidate[index] = {
      ...descriptor,
      plan: {
        ...descriptor.plan,
        controlParameter: "mode" as unknown as "mode/evaluated-operation",
      },
    };
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

  const canonicalBytes = canonicalDescriptorLines(expectedStateDescriptors);
  const localeSortedBytes = `${expectedStateDescriptors.map(canonicalJson).join("\n")}\n`;
  if (localeSortedBytes !== canonicalBytes) {
    fail(
      "G04 descriptor bytes diverge from the frozen validator code-unit sort algorithm.",
    );
  }
  if (!canonicalBytes.endsWith("\n")) {
    fail("G04 descriptor builder omitted its final LF.");
  }
  try {
    assertDescriptorPlan(
      expectedStateDescriptors,
      canonicalBytes.slice(0, -1),
    );
    fail("G04 descriptor final-LF mutation canary was accepted.");
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message === "G04 descriptor final-LF mutation canary was accepted."
    ) {
      throw error;
    }
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
    fail("G04 descriptor canonical-key-order mutation canary is insensitive.");
  }
}

assertDescriptorMutationCanaries();
const observedStateDescriptorPlanSha256 = assertDescriptorPlan(
  expectedStateDescriptors,
);
if (observedStateDescriptorPlanSha256 !== expectedStateDescriptorPlanSha256) {
  fail(
    `G04 ordered semantic descriptor plan SHA drifted; expected=${expectedStateDescriptorPlanSha256} actual=${observedStateDescriptorPlanSha256}.`,
  );
}

if (runtimeChunks.length !== expectedChunkCountPerProject) {
  fail(
    `G04 source-level title count must be ${expectedChunkCountPerProject}; actual=${runtimeChunks.length}.`,
  );
}
if (expectedStateIds.length !== expectedStateCountPerProject) {
  fail(
    `G04 source-level state count must be ${expectedStateCountPerProject}; actual=${expectedStateIds.length}.`,
  );
}
if (new Set(expectedStateIds).size !== expectedStateIds.length) {
  fail("G04 source-level state IDs contain duplicates.");
}
if (new Set(expectedTestTitles).size !== expectedTestTitles.length) {
  fail("G04 source-level test titles contain duplicates.");
}
if (expectedChunkCountPerProject * supportedProjects.length !== expectedCanonicalExecutionCount) {
  fail("G04 canonical desktop/mobile execution count drifted.");
}

const observedStatePlanSha256 = createHash("sha256")
  .update(`${expectedStateIds.join("\n")}\n`)
  .digest("hex");
const observedTopicModeControlTableSha256 = createHash("sha256")
  .update(`${JSON.stringify(expectedTopicModeControlTable)}\n`)
  .digest("hex");
if (observedStatePlanSha256 !== expectedStatePlanSha256) {
  fail(
    `G04 ordered state plan SHA drifted; expected=${expectedStatePlanSha256} actual=${observedStatePlanSha256}.`,
  );
}
if (
  observedTopicModeControlTableSha256 !==
  expectedTopicModeControlTableSha256
) {
  fail(
    `G04 topic-mode-control table SHA drifted; expected=${expectedTopicModeControlTableSha256} actual=${observedTopicModeControlTableSha256}.`,
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
      /import\s*\{\s*readFileSync\s*,\s*realpathSync\s*\}\s*from\s*"node:fs";/u,
    ],
  ] as const;
  for (const [label, pattern] of importContracts) {
    if (!pattern.test(source)) {
      fail(`G04 producer source SHA contract is missing ${label}.`);
    }
  }

  const dynamicDeclaration = [
    'const producerSourceSha256 = createHash("sha256")',
    "  .update(readFileSync(__filename))",
    '  .digest("hex");',
  ].join("\n");
  if (source.split(dynamicDeclaration).length !== 2) {
    fail(
      "G04 producer source SHA contract requires one dynamic hash of raw readFileSync(__filename) bytes.",
    );
  }

  const dependencyMapStart = source.indexOf(
    "const integrationSourceSha256 = Object.freeze({",
  );
  const dependencyMapEnd = source.indexOf(
    '\n});\nassertJsonExact("G04 approved durability/validator source SHA"',
    dependencyMapStart,
  );
  if (dependencyMapStart < 0 || dependencyMapEnd <= dependencyMapStart) {
    fail("G04 producer source SHA contract cannot bound the dependency map.");
  }
  if (
    source
      .slice(dependencyMapStart, dependencyMapEnd)
      .includes("producerSourceSha256")
  ) {
    fail(
      "G04 producer source SHA must remain outside integrationSourceSha256 dependencies.",
    );
  }

  const exactAttachmentSibling = [
    "                integrationSourceSha256,",
    "                producerSourceSha256,",
    "                observedStateDescriptorPlanSha256,",
  ].join("\n");
  if (source.split(exactAttachmentSibling).length !== 2) {
    fail(
      "G04 producerSourceSha256 must be one exact top-level attachment field immediately after integrationSourceSha256.",
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
      fail(`G04 producer source SHA canary could not inject ${label}.`);
    }
    try {
      assertProducerSourceSha256SourceContract(candidate);
    } catch {
      return;
    }
    fail(`G04 producer source SHA canary accepted ${label}.`);
  };

  const dynamicDeclaration = [
    'const producerSourceSha256 = createHash("sha256")',
    "  .update(readFileSync(__filename))",
    '  .digest("hex");',
  ].join("\n");
  mustReject("producerSourceSha256 omission", (candidate) =>
    candidate.replace("\n                producerSourceSha256,", ""),
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
      "readFileSync(process.env.G04_PRODUCER_SOURCE_PATH ?? __filename)",
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
function exactDurabilityProbeSource(source: string) {
  const declaration = "\nasync function runExactDurabilityProbe({";
  const declarationStart = source.lastIndexOf(declaration);
  const start = declarationStart + 1;
  const end = source.indexOf("\nfunction starshipPathReceipt", start);
  if (declarationStart < 0 || end <= start) {
    fail("G04 exact durability probe helper is absent or unbounded.");
  }
  return { end, source: source.slice(start, end), start };
}

function firstSessionAcknowledgementSource(source: string) {
  const declaration = "\nasync function awaitFirstSessionAck(";
  const declarationStart = source.lastIndexOf(declaration);
  const start = declarationStart + 1;
  const end = source.indexOf("\ntype DurabilityBrowserAdapter", start);
  if (declarationStart < 0 || end <= start) {
    fail("G04 first-session acknowledgement helper is absent or unbounded.");
  }
  return { end, source: source.slice(start, end), start };
}

function canonicalStatePlanLoopSource(source: string) {
  const suiteStart = source.lastIndexOf(
    'test.describe("Mainland G04 fraction operations production route acceptance"',
  );
  const start = source.indexOf(
    "for (const [planIndex, plan] of chunk.plans.entries()) {",
    suiteStart,
  );
  const end = source.indexOf("const actualStateIds =", start);
  if (suiteStart < 0 || start < suiteStart || end <= start) {
    fail("G04 canonical state-plan loop is absent or unbounded.");
  }
  return { end, source: source.slice(start, end), start, suiteStart };
}

function assertOrderedSourceSteps(
  label: string,
  source: string,
  steps: readonly string[],
) {
  let priorIndex = -1;
  for (const step of steps) {
    const index = source.indexOf(step, priorIndex + 1);
    if (index <= priorIndex) {
      fail(`${label} step is absent or out of order: ${step}.`);
    }
    priorIndex = index;
  }
}

function assertDurabilityDescriptorSourceContract(source: string) {
  if (!/async\s+function\s+runExactDurabilityProbe\s*\(/u.test(source)) {
    fail(
      "G04 durability/descriptor source contract requires one dedicated exact-control probe.",
    );
  }
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
      fail(`G04 durability/descriptor source contract is missing ${label}.`);
    }
  }

  const acknowledgement = firstSessionAcknowledgementSource(source);
  const exactAcknowledgementKeys = [
    '  assertExactOwnKeys(`${runtime.labId}: first-control ACK`, delivery, [',
    '    "acknowledgedUserId",',
    '    "durablyPersisted",',
    '    "session",',
    "  ]);",
  ].join("\n");
  const exactSessionKeys = [
    '  assertExactOwnKeys(`${runtime.labId}: first-control ACK session`, delivery.session, [',
    '    "completedAt",',
    '    "explored",',
    '    "moduleId",',
    '    "source",',
    '    "topicId",',
    '    "updatedAt",',
    "  ]);",
  ].join("\n");
  if (
    !acknowledgement.source.includes(exactAcknowledgementKeys) ||
    !acknowledgement.source.includes(exactSessionKeys)
  ) {
    fail(
      "G04 first-session ACK must require the exact three-key acknowledgement and six-key session payload.",
    );
  }
  const completedAtContract = [
    'typeof delivery.session.completedAt !== "string"',
    "delivery.session.completedAt.trim().length === 0",
    "new Date(delivery.session.completedAt).toISOString() !==",
    "delivery.session.completedAt !== delivery.session.updatedAt",
    "completedAt: delivery.session.completedAt,",
  ] as const;
  const missingCompletedAtContract = completedAtContract.filter(
    (step) => !acknowledgement.source.includes(step),
  );
  if (
    acknowledgement.source.includes(
      "delivery.session.completedAt !== null",
    ) ||
    missingCompletedAtContract.length > 0
  ) {
    fail(
      `G04 first-session ACK source RED: honest completedAt must reject null, absence, mismatch, and noncanonical timestamps; missing=${JSON.stringify(missingCompletedAtContract)}.`,
    );
  }
  assertOrderedSourceSteps(
    "G04 strict first-session acknowledgement",
    acknowledgement.source,
    [
      "expect(response.status()).toBe(200);",
      'expect(response.headers()["content-type"]).toBe("application/json");',
      "const responseUrl = new URL(response.url());",
      'expect(responseUrl.pathname).toBe("/api/visualization-sessions");',
      'expect(responseUrl.search).toBe("");',
      'expect(responseUrl.hash).toBe("");',
      "const delivery = await readJson<unknown>(",
      'assertExactOwnKeys(`${runtime.labId}: first-control ACK`, delivery, [',
      'assertExactOwnKeys(`${runtime.labId}: first-control ACK session`, delivery.session, [',
      'typeof delivery.session.updatedAt !== "string" ||',
      "new Date(delivery.session.updatedAt).toISOString() !==",
      'typeof delivery.session.completedAt !== "string" ||',
      "new Date(delivery.session.completedAt).toISOString() !==",
      "delivery.session.completedAt !== delivery.session.updatedAt",
      "const acknowledgement: FirstSessionAcknowledgement = {",
      "completedAt: delivery.session.completedAt,",
      "expect(delivery).toEqual(acknowledgement);",
      "return acknowledgement;",
    ],
  );
  if (/\.toMatchObject\s*\(/u.test(acknowledgement.source)) {
    fail("G04 first-session ACK must be exact rather than a partial match.");
  }

  const planLoop = canonicalStatePlanLoopSource(source);
  if (
    /durability\.(?:armRealControl|finishFirstRealControl|finishSecondRealControl)\s*\(/u.test(
      planLoop.source,
    ) ||
    /page\.waitForResponse\s*\(/u.test(planLoop.source)
  ) {
    fail(
      "G04 canonical 357-state loop must contain zero durability fences, finishes, and session waiters.",
    );
  }

  const helper = exactDurabilityProbeSource(source);
  assertOrderedSourceSteps("G04 exact durability probe", helper.source, [
    "await assertResetState(root, runtime);",
    "const probeMode = runtime.modes.find((mode) => mode !== reset.mode);",
    'await expect(probeModeButton).toHaveAttribute("data-viz-mode-active", "false");',
    "const firstFence = await durability.armRealControl({",
    "expectedButtonClick: {",
    "controlKey: probeMode,",
    'eventTypes: ["pointerup", "click"],',
    "ordinal: 1,",
    "const firstSessionResponse = page.waitForResponse(",
    "await probeModeButton.click();",
    "const sessionAcknowledgement = await awaitFirstSessionAck(",
    "const first = await durability.finishFirstRealControl({",
    "expect(first.expectedControl).toEqual({",
    "expect(first.controlEvents.map(({ controlKey, key, type }) => ({",
    "const resetButton = root.locator(",
    "const secondFence = await durability.armRealControl({",
    "expectedButtonClick: {",
    "controlKey: runtime.labId,",
    'eventTypes: ["pointerup", "click"],',
    "ordinal: 2,",
    "await resetButton.click();",
    "const second = await durability.finishSecondRealControl({",
    "const controlObserverStop = second.controlObserverStop;",
    "expect(controlObserverStop).toMatchObject({",
    "active: false,",
    "eventCount: 4,",
    "lastSequence: 4,",
    "removalCount: 1,",
    "removedExactlyOnce: true,",
    "removedListenerCount: 5,",
    "expect(controlObserverStop.events).toEqual([",
    "...first.controlEvents,",
    "...second.controlEvents,",
    "expect(controlObserverStop.removedEventTypes).toEqual([",
    "expect(Object.isFrozen(controlObserverStop.events)).toBe(true);",
    "expect(controlObserverStop.events.every((event) => Object.isFrozen(event))).toBe(true);",
    "await assertResetState(root, runtime);",
    "return Object.freeze({",
    "controlObserverStop,",
    "first,",
    "second,",
    "sessionAcknowledgement,",
  ]);

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
  for (const [label, window, exactClick] of [
    ["first", helper.source.slice(firstArm, firstFinish), "await probeModeButton.click();"],
    ["second", helper.source.slice(secondArm, secondFinish), "await resetButton.click();"],
  ] as const) {
    if (
      (window.match(/\.click\s*\(/gu) ?? []).length !== 1 ||
      !window.includes(exactClick) ||
      /\.press\s*\(/u.test(window) ||
      /\b(?:clickReset|executePlan|normalPlanAction|domainPlanAction)\s*\(/u.test(
        window,
      )
    ) {
      fail(
        `G04 exact durability ${label} fence must contain one exact Locator.click and no canonical-plan preparation.`,
      );
    }
  }
  if (
    (helper.source.match(/durability\.armRealControl\s*\(/gu) ?? []).length !== 2 ||
    (helper.source.match(/durability\.finishFirstRealControl\s*\(/gu) ?? [])
      .length !== 1 ||
    (helper.source.match(/durability\.finishSecondRealControl\s*\(/gu) ?? [])
      .length !== 1 ||
    (helper.source.match(/page\.waitForResponse\s*\(/gu) ?? []).length !== 1 ||
    /controlIdentities\s*:/u.test(helper.source)
  ) {
    fail(
      "G04 exact durability probe lifecycle cardinality or receipt-derived identity contract drifted.",
    );
  }

  const runtimeSource = source.slice(planLoop.suiteStart);
  assertOrderedSourceSteps("G04 durability lifecycle", runtimeSource, [
    "await prepareVisualizationLessonLearnerProfileBeforeArm({",
    "createVisualizationLessonDurabilityBrowserAdapter({",
    "await durability.armBeforeNavigation({ learnerProfileSetup })",
    "await page.goto(`/student/lessons/${encodeURIComponent(lessonSlug)}`",
    "await durability.waitForMountTerminal({",
    "let capturedInitial:",
    "const exactDurabilityProbe = await runExactDurabilityProbe({",
    "for (const [planIndex, plan] of chunk.plans.entries()) {",
    "await durability.replayFirstDeliveryExactly({",
    "const durabilityReceipt: VisualizationLessonDurabilityFinalReceipt =",
    "await durability.finalReceipt();",
    "expect(durabilityReceipt.controlObserverStop).toBe(",
    "exactDurabilityProbe.controlObserverStop,",
    "expect(durabilityReceipt.expectedControl).toEqual({",
    "expect(durabilityReceipt.controlEvents).toEqual({",
    "controlEvidence: {",
    "first: {",
    "controlEvents: exactDurabilityProbe.first.controlEvents,",
    "expectedControl: exactDurabilityProbe.first.expectedControl,",
    "second: {",
    "controlEvents: exactDurabilityProbe.second.controlEvents,",
    "controlObserverStop: exactDurabilityProbe.second.controlObserverStop,",
    "expectedControl: exactDurabilityProbe.second.expectedControl,",
    "final: {",
    "controlEvents: durabilityReceipt.controlEvents,",
    "controlObserverStop: durabilityReceipt.controlObserverStop,",
    "expectedControl: durabilityReceipt.expectedControl,",
    "firstSessionAcknowledgement:",
    "exactDurabilityProbe.sessionAcknowledgement,",
  ]);
  if (
    (runtimeSource.match(/runExactDurabilityProbe\s*\(/gu) ?? []).length !== 1 ||
    (runtimeSource.match(/durability\.replayFirstDeliveryExactly\s*\(/gu) ?? [])
      .length !== 1 ||
    (runtimeSource.match(/durability\.finalReceipt\s*\(/gu) ?? []).length !== 1 ||
    /controlIdentities\s*:/u.test(runtimeSource)
  ) {
    fail(
      "G04 runtime requires one probe/replay/final lifecycle and receipt-derived control evidence only.",
    );
  }
  for (const [label, pattern] of [
    ["planned semantic descriptors", /plannedStateDescriptors\.push\s*\(/u],
    ["descriptor-plan SHA attachment", /expectedStateDescriptorPlanSha256,/u],
    ["durability receipt attachment", /durabilityReceipts\s*:/u],
    [
      "schema v4 attachment",
      /schemaVersion\s*:\s*"china-mainland-g04-fraction-operations-production\.v4"/u,
    ],
    [
      "catalog analytics source",
      /source\s*:\s*chunk\.runtime\.lab\.analyticsSource/u,
    ],
  ] as const) {
    if (!pattern.test(runtimeSource)) {
      fail(`G04 durability/descriptor runtime contract is missing ${label}.`);
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
      fail(`G04 durability/descriptor runtime contract forbids ${label}.`);
    }
  }
}

function assertDurabilityDescriptorSourceMutationCanaries(source: string) {
  const mustReject = (
    label: string,
    mutate: (candidate: string) => string,
  ) => {
    const candidate = mutate(source);
    if (candidate === source) {
      fail(`G04 durability source canary could not inject ${label}.`);
    }
    try {
      assertDurabilityDescriptorSourceContract(candidate);
    } catch {
      return;
    }
    fail(`G04 durability source canary accepted ${label}.`);
  };
  const mutateHelper = (
    candidate: string,
    mutate: (helper: string) => string,
  ) => {
    const bounds = exactDurabilityProbeSource(candidate);
    const mutated = mutate(bounds.source);
    return `${candidate.slice(0, bounds.start)}${mutated}${candidate.slice(bounds.end)}`;
  };
  const mutateAcknowledgement = (
    candidate: string,
    mutate: (acknowledgement: string) => string,
  ) => {
    const bounds = firstSessionAcknowledgementSource(candidate);
    const mutated = mutate(bounds.source);
    return `${candidate.slice(0, bounds.start)}${mutated}${candidate.slice(bounds.end)}`;
  };
  const mutateRuntime = (
    candidate: string,
    mutate: (runtime: string) => string,
  ) => {
    const bounds = canonicalStatePlanLoopSource(candidate);
    const runtime = candidate.slice(bounds.suiteStart);
    return `${candidate.slice(0, bounds.suiteStart)}${mutate(runtime)}`;
  };

  mustReject("missing first expected control", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace("controlKey: probeMode,", "controlKey: runtime.labId,"),
    ),
  );
  mustReject("missing second observer stop binding", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace(
        "const controlObserverStop = second.controlObserverStop;",
        "const controlObserverStop = first.controlEvents;",
      ),
    ),
  );
  mustReject("extra action inside second fence", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace(
        "await resetButton.click();",
        "await resetButton.click();\n  await resetButton.click();",
      ),
    ),
  );
  mustReject("partial first-session acknowledgement", (candidate) => {
    const bounds = firstSessionAcknowledgementSource(candidate);
    const mutated = bounds.source.replace(
      "expect(delivery).toEqual(acknowledgement);",
      "expect(delivery).toMatchObject(acknowledgement);",
    );
    return `${candidate.slice(0, bounds.start)}${mutated}${candidate.slice(bounds.end)}`;
  });
  mustReject("surplus top-level first-session ACK key", (candidate) =>
    mutateAcknowledgement(candidate, (acknowledgement) =>
      acknowledgement.replace(
        ['    "session",', "  ]);"].join("\n"),
        ['    "session",', '    "forged",', "  ]);"].join("\n"),
      ),
    ),
  );
  mustReject("missing first-session response Content-Type", (candidate) =>
    mutateAcknowledgement(candidate, (acknowledgement) =>
      acknowledgement.replace(
        'expect(response.headers()["content-type"]).toBe("application/json");',
        "",
      ),
    ),
  );
  mustReject("wrong first-session response Content-Type", (candidate) =>
    mutateAcknowledgement(candidate, (acknowledgement) =>
      acknowledgement.replace(
        'toBe("application/json");',
        'toBe("application/json; charset=utf-8");',
      ),
    ),
  );
  mustReject("weakened first-session response Content-Type matcher", (candidate) =>
    mutateAcknowledgement(candidate, (acknowledgement) =>
      acknowledgement.replace(
        'expect(response.headers()["content-type"]).toBe("application/json");',
        'expect(response.headers()["content-type"]).toContain("application/json");',
      ),
    ),
  );
  mustReject("null first-session completedAt", (candidate) =>
    mutateAcknowledgement(candidate, (acknowledgement) =>
      acknowledgement.replace(
        "completedAt: delivery.session.completedAt,",
        "completedAt: null,",
      ),
    ),
  );
  mustReject("absent first-session completedAt", (candidate) =>
    mutateAcknowledgement(candidate, (acknowledgement) =>
      acknowledgement.replace(
        '    "completedAt",\n',
        "",
      ),
    ),
  );
  mustReject("mismatched first-session completedAt", (candidate) =>
    mutateAcknowledgement(candidate, (acknowledgement) =>
      acknowledgement.replace(
        "delivery.session.completedAt !== delivery.session.updatedAt",
        "delivery.session.completedAt === delivery.session.updatedAt",
      ),
    ),
  );
  mustReject("noncanonical first-session completedAt", (candidate) =>
    mutateAcknowledgement(candidate, (acknowledgement) =>
      acknowledgement.replace(
        [
          "new Date(delivery.session.completedAt).toISOString() !==",
          "      delivery.session.completedAt ||",
        ].join("\n"),
        "false ||",
      ),
    ),
  );
  mustReject("durability fence inside canonical state loop", (candidate) =>
    mutateRuntime(candidate, (runtime) =>
      runtime.replace(
        "for (const [planIndex, plan] of chunk.plans.entries()) {",
        "for (const [planIndex, plan] of chunk.plans.entries()) {\n        await durability.armRealControl({ expectedButtonClick: { controlKey: chunk.runtime.labId, eventTypes: [\"pointerup\", \"click\"] }, ordinal: 2 });",
      ),
    ),
  );
  mustReject("replay before canonical state loop", (candidate) =>
    mutateRuntime(candidate, (runtime) =>
      runtime.replace(
        "for (const [planIndex, plan] of chunk.plans.entries()) {",
        "await durability.replayFirstDeliveryExactly({ first: exactDurabilityProbe.first });\n      for (const [planIndex, plan] of chunk.plans.entries()) {",
      ),
    ),
  );
  mustReject("final before canonical state loop", (candidate) =>
    mutateRuntime(candidate, (runtime) =>
      runtime.replace(
        "for (const [planIndex, plan] of chunk.plans.entries()) {",
        "await durability.finalReceipt();\n      for (const [planIndex, plan] of chunk.plans.entries()) {",
      ),
    ),
  );
  mustReject("self-authored control identities", (candidate) =>
    mutateRuntime(candidate, (runtime) =>
      runtime.replace(
        "controlEvidence: {",
        "controlEvidence: {\n                  controlIdentities: { first: \"mode\", second: \"reset\" },",
      ),
    ),
  );
  mustReject("missing terminal observer-stop identity", (candidate) =>
    mutateRuntime(candidate, (runtime) =>
      runtime.replace(
        "expect(durabilityReceipt.controlObserverStop).toBe(",
        "expect(durabilityReceipt.controlObserverStop).toEqual(",
      ),
    ),
  );
}

assertDurabilityDescriptorSourceContract(ownSource);
assertDurabilityDescriptorSourceMutationCanaries(ownSource);
function assertP0HardeningSourceContract(source: string) {
  const required = [
    ["typed action evidence", /type\s+ActionEvidence\s*=/u],
    ["independent state-plan SHA", /expectedStatePlanSha256\s*=/u],
    ["exact topic-mode-control table", /expectedTopicModeControlTable\s*=/u],
    ["canonical full-config guard", /function\s+assertCanonicalRunner\s*\(/u],
    ["canonical CLI helper", /assertMainlandFocusedCanonicalCli\s*\(/u],
    ["production planner canaries", /assertProductionPlannerCanaries\s*\(/u],
    [
      "production transition planner",
      /planFractionOperationsDivisorTransition/u,
    ],
    [
      "production transition audit",
      /auditFractionOperationsDivisorTransition/u,
    ],
    ["independent action oracle", /oracleState/u],
    ["production planner receipt", /plannerReceipt/u],
    ["fresh product action receipt", /productActionReceipt\s*\(/u],
    [
      "rejected action receipt oracle",
      /createFractionOperationsRejectedActionReceipt/u,
    ],
    ["pre-scan runtime signature", /runtimeSignatureBeforeScans/u],
    ["post-scan runtime signature", /runtimeSignatureAfterScans/u],
  ] as const;
  for (const [label, pattern] of required) {
    if (!pattern.test(source)) {
      fail(`G04 P0 source contract is missing ${label}.`);
    }
  }
}

assertP0HardeningSourceContract(ownSource);
for (const forbidden of [".sk" + "ip(", ".fix" + "me(", ".on" + "ly("]) {
  if (ownSource.includes(forbidden)) {
    fail(`G04 source contains forbidden ${forbidden}.`);
  }
}

const canonicalCliReceipt = assertMainlandFocusedCanonicalCli({
  requiredSpec:
    "tests/e2e/china-mainland-g04-fraction-operations-production.spec.ts",
});

for (const environmentName of [
  "G04_VIZ_ALLOW_PARTIAL",
  "G04_VIZ_CHUNK_FILTER",
  "G04_VIZ_FILTER",
  "G04_VIZ_LAB_FILTER",
  "G04_VIZ_LESSON_FULL",
  "G04_VIZ_PROJECT_FILTER",
  "G04_VIZ_STATE_FILTER",
]) {
  if (process.env[environmentName] !== undefined) {
    fail(`G04 canonical acceptance rejects ${environmentName}.`);
  }
}
const canonicalCwd = realpathSync.native(process.cwd());
if (!canonicalCwd.startsWith("/Volumes/Starship/")) {
  fail(`G04 canonical worktree escaped Starship: ${canonicalCwd}.`);
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

function requestBody(request: Request): unknown {
  return parseJson(request.postData());
}

function visualizationLearningEvents(body: unknown) {
  if (!isRecord(body) || !Array.isArray(body.events)) return [];
  return body.events.filter((event) => {
    if (!isRecord(event)) return false;
    const type = typeof event.type === "string" ? event.type : "";
    const source = typeof event.source === "string" ? event.source : "";
    return (
      type.startsWith("visualization-") ||
      [
        "visualization-lab",
        "function-graph",
        "function-model",
        "geometry",
        "probability",
        "coordinate-plane",
        "trig-wave",
        "calculus-stats",
      ].includes(source)
    );
  });
}

function mountWriteViolations(observedWrites: readonly ObservedWrite[]) {
  const violations: string[] = [];
  for (const write of observedWrites.filter((entry) => entry.stage === "mount")) {
    if (isApiFamilyPath(write.pathname, "/api/visualization-sessions")) {
      violations.push(`${write.method} ${write.pathname} created a session during mount.`);
      continue;
    }
    if (
      isApiFamilyPath(write.pathname, "/api/gamification") ||
      isApiFamilyPath(write.pathname, "/api/rewards") ||
      isApiFamilyPath(write.pathname, "/api/teacher/gamification") ||
      isApiFamilyPath(write.pathname, "/api/teacher/rewards") ||
      isApiFamilyPath(write.pathname, "/api/teacher/reward-awards")
    ) {
      violations.push(`${write.method} ${write.pathname} changed reward state during mount.`);
      continue;
    }
    if (
      write.pathname === "/api/learning-events" &&
      visualizationLearningEvents(write.body).length > 0
    ) {
      violations.push(`${write.method} ${write.pathname} emitted a visualization event during mount.`);
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
    fail(`${label}: response is not JSON: ${text.slice(0, 300)}.`);
  }
}

async function registerMainlandStudent(
  page: Page,
  testInfo: TestInfo,
  chunk: RuntimeChunk,
) {
  const runtime = chunk.runtime;
  const suffix = `${uniqueSuffix(testInfo)}-${chunk.index}-${runtime.publisher.toLowerCase()}`
    .replace(/[^a-z0-9-]+/giu, "-")
    .slice(0, 100);
  const username = `g04-${suffix}@example.test`;
  const project = testInfo.project.name;
  if (!supportedProjects.includes(project as (typeof supportedProjects)[number])) {
    fail(`${chunk.id}: unsupported canonical project ${project}.`);
  }
  const theme = themeForChunkProject(
    chunk.index,
    project as (typeof supportedProjects)[number],
  );
  const response = await page.request.post("/api/auth/register", {
    data: {
      curriculumProfile: { publisher: runtime.publisher, region: "MAINLAND" },
      curriculumTrack: runtime.track,
      email: username,
      grade: runtime.lab.grade,
      language: "zh-Hans",
      name: `G04 ${runtime.publisher} ${suffix}`,
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
      grade?: unknown;
      id?: unknown;
      role?: unknown;
      username?: unknown;
    };
  }>(response, `${chunk.id}: disposable Mainland student registration`);
  expect(body.user?.role).toBe("student");
  expect(body.user?.grade).toBe(runtime.lab.grade);
  expect(body.user?.username).toBe(username);
  expect(body.user?.curriculumProfile).toEqual({
    publisher: runtime.publisher,
    region: "MAINLAND",
  });
  expect(body.user?.curriculumTrack).toBe(runtime.track);
  if (typeof body.user?.id !== "string" || body.user.id.trim().length === 0) {
    fail(`${chunk.id}: registration exposed no exact student id.`);
  }
  return { theme, userId: body.user.id, username };
}

async function visualizationSessions(page: Page) {
  const response = await page.request.get("/api/visualization-sessions");
  const body = await readJson<{
    sessions?: Array<{
      explored?: unknown;
      moduleId?: unknown;
      source?: unknown;
      topicId?: unknown;
      updatedAt?: unknown;
    }>;
  }>(response, "visualization session server reread");
  if (!Array.isArray(body.sessions)) {
    fail("Visualization session reread has no raw sessions array.");
  }
  return body.sessions;
}

async function visibleControls(root: Locator): Promise<ControlSnapshot[]> {
  return await root.evaluate((element) =>
    Array.from(
      element.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "input[data-viz-parameter], select[data-viz-parameter]",
      ),
    )
      .filter((control) => {
        if (control.closest("[data-viz-lesson-action-slot]")) return false;
        const style = getComputedStyle(control);
        const rect = control.getBoundingClientRect();
        return (
          control.isConnected &&
          rect.width > 1 &&
          rect.height > 1 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      })
      .map((control) => ({
        affects: (control.getAttribute("data-viz-range-affects") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        disabled: control.disabled,
        kind: control instanceof HTMLSelectElement ? "select" : "number",
        max:
          control instanceof HTMLInputElement ? Number(control.max) : null,
        min:
          control instanceof HTMLInputElement ? Number(control.min) : null,
        options:
          control instanceof HTMLSelectElement
            ? Array.from(control.options).map((option) => option.value)
            : [],
        parameter: control.getAttribute("data-viz-parameter") ?? "",
        projection: control.getAttribute("data-viz-range-projection"),
        projectionReason: control.getAttribute("data-viz-range-projection-reason"),
        step:
          control instanceof HTMLInputElement
            ? Number(control.step || "1")
            : null,
        value: control.value,
        zeroExcluded:
          control instanceof HTMLInputElement
            ? control.getAttribute("data-viz-zero-excluded") === "true"
            : null,
      })),
  );
}

function controlMap(controls: readonly ControlSnapshot[]) {
  const map = new Map<string, ControlSnapshot>();
  for (const control of controls) {
    if (!control.parameter) fail("Visible control has no data-viz-parameter.");
    if (map.has(control.parameter)) {
      fail(`Visible control parameter ${control.parameter} is not unique.`);
    }
    map.set(control.parameter, control);
  }
  return map;
}

function valuesOf(controls: readonly ControlSnapshot[]) {
  return new Map(controls.map((control) => [control.parameter, control.value]));
}

function parseDomainState(value: string | null, label: string): DomainState {
  const parsed = parseJson(value);
  if (!isRecord(parsed)) fail(`${label}: domain state is not an object.`);
  const expectedKeys = [
    "evaluatedOperation",
    "leftDenominator",
    "leftNumerator",
    "mode",
    "rightDenominator",
    "rightNumerator",
  ];
  if (JSON.stringify(Object.keys(parsed).sort()) !== JSON.stringify(expectedKeys)) {
    fail(`${label}: domain state keys drifted: ${JSON.stringify(Object.keys(parsed).sort())}.`);
  }
  const numericKeys = [
    "leftDenominator",
    "leftNumerator",
    "rightDenominator",
    "rightNumerator",
  ] as const;
  for (const key of numericKeys) {
    if (!Number.isSafeInteger(parsed[key])) {
      fail(`${label}: ${key} is not a safe integer.`);
    }
  }
  if (typeof parsed.mode !== "string" || typeof parsed.evaluatedOperation !== "string") {
    fail(`${label}: controller values are not strings.`);
  }
  return parsed as DomainState;
}

function controlsMatchDomain(controls: readonly ControlSnapshot[], domain: DomainState) {
  const map = valuesOf(controls);
  expect(map.get("left-numerator")).toBe(String(domain.leftNumerator));
  expect(map.get("left-denominator")).toBe(String(domain.leftDenominator));
  expect(map.get("right-numerator")).toBe(String(domain.rightNumerator));
  expect(map.get("right-denominator")).toBe(String(domain.rightDenominator));
}

async function domainReceipt(root: Locator): Promise<DomainReceipt> {
  const owner = root.locator("[data-mainland-fraction-operations]");
  await expect(owner).toHaveCount(1);
  await expect(owner).toHaveAttribute(
    "data-viz-range-domain-id",
    FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
  );
  await expect(owner).toHaveAttribute(
    "data-viz-domain-version",
    String(FRACTION_OPERATIONS_DIVISOR_DOMAIN_VERSION),
  );
  await expect(owner).toHaveAttribute("data-viz-domain-match", "true");
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
  expect(observed).toEqual(expected);
  const projectionCount = Number(
    await owner.getAttribute("data-viz-domain-projection-count"),
  );
  if (!Number.isSafeInteger(projectionCount) || projectionCount < 0) {
    fail(`Domain projection count is invalid: ${String(projectionCount)}.`);
  }
  const projectionReasons = (
    (await owner.getAttribute("data-viz-domain-projection-reasons")) ?? ""
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  expect(projectionReasons).toHaveLength(projectionCount);
  return {
    expected,
    match: true,
    observed,
    projectionCount,
    projectionReasons,
    rejection: await owner.getAttribute("data-viz-domain-rejection"),
    requested,
  };
}

async function productActionReceipt(
  root: Locator,
): Promise<FractionOperationsActionReceipt> {
  const owner = root.locator("[data-mainland-fraction-operations]");
  await expect(owner).toHaveCount(1);
  const parsed = parseJson(await owner.getAttribute("data-viz-action-receipt"));
  if (!isRecord(parsed)) {
    fail("G04 product action receipt is not an object.");
  }
  const receipt = parsed as unknown as FractionOperationsActionReceipt;
  await expect(owner).toHaveAttribute(
    "data-viz-action-receipt-version",
    FRACTION_OPERATIONS_ACTION_RECEIPT_CONTRACT.id,
  );
  await expect(owner).toHaveAttribute(
    "data-viz-action-accepted",
    String(receipt.accepted),
  );
  await expect(owner).toHaveAttribute(
    "data-viz-action-status",
    receipt.status,
  );
  await expect(owner).toHaveAttribute(
    "data-viz-action-rejection",
    receipt.rejection ?? "none",
  );
  await expect(owner).toHaveAttribute(
    "data-viz-action-requested-validity",
    receipt.requestedValidity,
  );
  assertJsonExact(
    "split action before",
    parseDomainState(await owner.getAttribute("data-viz-action-before"), "action-before"),
    receipt.before,
  );
  assertJsonExact(
    "split action request",
    parseJson(await owner.getAttribute("data-viz-action-request")),
    receipt.request,
  );
  assertJsonExact(
    "split action requested",
    parseDomainState(
      await owner.getAttribute("data-viz-action-requested"),
      "action-requested",
    ),
    receipt.requested,
  );
  assertJsonExact(
    "split action expected",
    parseDomainState(await owner.getAttribute("data-viz-action-expected"), "action-expected"),
    receipt.expected,
  );
  assertJsonExact(
    "split action observed",
    parseDomainState(await owner.getAttribute("data-viz-action-observed"), "action-observed"),
    receipt.observed,
  );
  assertJsonExact(
    "split action projections",
    parseJson(await owner.getAttribute("data-viz-action-projections")),
    receipt.projections,
  );
  return receipt;
}

async function runtimeSignature(root: Locator): Promise<RuntimeSignature> {
  const owner = root.locator("[data-mainland-fraction-operations]");
  await expect(owner).toHaveCount(1);
  const snapshot = await root.evaluate((element) => {
    const normalizedText = (target: Element) =>
      (target.textContent ?? "").replace(/\s+/gu, " ").trim();
    const selectedAttributes = (
      target: Element,
      predicate: (name: string) => boolean,
    ) =>
      Object.fromEntries(
        Array.from(target.attributes)
          .filter((attribute) => predicate(attribute.name))
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((attribute) => [attribute.name, attribute.value]),
      );
    const visualRecord = (target: Element) => ({
      attributes: selectedAttributes(
        target,
        (name) => name.startsWith("data-viz-") || name === "role",
      ),
      text: normalizedText(target),
    });
    const isVisible = (target: Element) => {
      if (!(target instanceof HTMLElement || target instanceof SVGElement)) {
        return false;
      }
      const style = getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      return (
        target.isConnected &&
        rect.width > 1 &&
        rect.height > 1 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    };
    const ownerElement = element.querySelector<HTMLElement>(
      "[data-mainland-fraction-operations]",
    );
    if (!ownerElement) {
      throw new TypeError("G04 runtime signature has no semantic owner.");
    }
    const controls = Array.from(
      element.querySelectorAll<HTMLElement>(
        [
          "[data-viz-mode-button]",
          "input[data-viz-parameter]",
          "select[data-viz-parameter]",
          "[data-viz-reset-model]",
        ].join(","),
      ),
    )
      .filter((target) => !target.closest("[data-viz-lesson-action-slot]"))
      .filter(isVisible)
      .map((target) => ({
        attributes: selectedAttributes(
          target,
          (name) =>
            name.startsWith("data-viz-") ||
            name.startsWith("aria-") ||
            ["max", "min", "role", "step", "tabindex", "type"].includes(
              name,
            ),
        ),
        disabled:
          (target instanceof HTMLInputElement ||
            target instanceof HTMLSelectElement ||
            target instanceof HTMLButtonElement) &&
          target.disabled,
        options:
          target instanceof HTMLSelectElement
            ? Array.from(target.options).map((option) => ({
                disabled: option.disabled,
                value: option.value,
              }))
            : [],
        tagName: target.tagName.toLowerCase(),
        text: normalizedText(target),
        value:
          target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement
            ? target.value
            : null,
      }));
    const projectionDescriptors = controls
      .filter(
        (control) =>
          typeof control.attributes["data-viz-range-projection"] === "string",
      )
      .map((control) => ({
        affects: control.attributes["data-viz-range-affects"] ?? null,
        parameter: control.attributes["data-viz-parameter"] ?? null,
        projection: control.attributes["data-viz-range-projection"]!,
        reason:
          control.attributes["data-viz-range-projection-reason"] ?? null,
      }));
    return {
      action: selectedAttributes(
        ownerElement,
        (name) => name.startsWith("data-viz-action-"),
      ),
      configuredState: ownerElement.getAttribute("data-viz-configured-state"),
      controls,
      domain: {
        domainId: ownerElement.getAttribute("data-viz-range-domain-id"),
        domainVersion: ownerElement.getAttribute("data-viz-domain-version"),
        expected: ownerElement.getAttribute("data-viz-domain-expected"),
        match: ownerElement.getAttribute("data-viz-domain-match"),
        observed: ownerElement.getAttribute("data-viz-domain-observed"),
        projectionCount: ownerElement.getAttribute(
          "data-viz-domain-projection-count",
        ),
        projectionReasons:
          ownerElement.getAttribute("data-viz-domain-projection-reasons") ?? "",
        projections: projectionDescriptors,
        rejection: ownerElement.getAttribute("data-viz-domain-rejection"),
        requested: ownerElement.getAttribute("data-viz-domain-requested"),
      },
      evaluatedOperation: ownerElement.getAttribute(
        "data-viz-evaluated-operation",
      ),
      mode: ownerElement.getAttribute("data-viz-mode"),
      semanticState: ownerElement.getAttribute("data-viz-state"),
      visual: {
        geometry: Array.from(
          element.querySelectorAll("[data-viz-fraction-visual]"),
        ).map(visualRecord),
        interpretations: Array.from(
          element.querySelectorAll("[data-viz-interpretation-status]"),
        ).map(visualRecord),
        visibleReceipts: Array.from(
          element.querySelectorAll("[data-viz-visible-receipt]"),
        ).map(visualRecord),
      },
    };
  });
  return {
    ...snapshot,
    domain: {
      ...snapshot.domain,
      expected: parseJson(snapshot.domain.expected),
      observed: parseJson(snapshot.domain.observed),
      projectionReasons: snapshot.domain.projectionReasons
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      requested: parseJson(snapshot.domain.requested),
    },
  };
}

async function runtimeDigest(root: Locator) {
  return JSON.stringify(await runtimeSignature(root));
}

async function settleExactRuntime(root: Locator, phase: string) {
  const deadline = Date.now() + 5_000;
  let prior = "";
  while (Date.now() < deadline) {
    await root.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    const current = await runtimeDigest(root);
    if (current === prior) return;
    prior = current;
  }
  fail(`${phase}: renderer did not expose two consecutive exact state digests.`);
}

async function assertProductionIdentity(root: Locator, runtime: RuntimeCase) {
  await expect(root).toHaveAttribute("data-viz-active-lab-id", runtime.labId);
  await expect(root).toHaveAttribute(
    "data-viz-lesson-session-owner",
    "first-control-interaction",
  );
  await expect(root).toHaveAttribute("data-viz-module-id", configuredModuleId);
  await expect(root).toHaveAttribute("data-viz-topic-id", runtime.labId);
  await expect(root).toHaveAttribute(
    "data-viz-production-renderer",
    "mainland-fraction-operations",
  );

  const renderer = root.locator(
    `[data-mainland-fraction-operations="true"][data-viz-topic-id=${JSON.stringify(runtime.labId)}]`,
  );
  await expect(renderer).toHaveCount(1);
  await expect(renderer).toBeVisible();
  await expect(renderer).toHaveAttribute(
    "data-viz-configured-model",
    "fraction-operations-v2",
  );
  await expect(renderer).toHaveAttribute(
    "data-viz-range-domain-id",
    FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
  );
  const configuredState = await renderer.getAttribute("data-viz-configured-state");
  expect(configuredState).toMatch(/^fraction-operations-v2\|/u);

  await expect(root.locator("[data-viz-configured-model]")).toHaveCount(1);
  await expect(root.locator('[data-viz-configured-model="fraction-bar"]')).toHaveCount(0);
  await expect(root.locator("[data-viz-renderer-mode]")).toHaveCount(0);
  await expect(
    root.locator("[data-viz-authoring-only], [data-viz-manim-authoring-dock]"),
  ).toHaveCount(0);

  const reset = root.locator(
    `[data-viz-reset-model][data-viz-reset-module-id=${JSON.stringify(configuredModuleId)}][data-viz-reset-topic-id=${JSON.stringify(runtime.labId)}]`,
  );
  await expect(reset).toHaveCount(1);
  await expect(reset).toBeVisible();
}

async function currentController(root: Locator) {
  const owner = root.locator("[data-mainland-fraction-operations]");
  const mode = await owner.getAttribute("data-viz-mode");
  const evaluatedOperation = await owner.getAttribute(
    "data-viz-evaluated-operation",
  );
  if (!mode || !evaluatedOperation) fail("G04 renderer exposed no exact controller state.");
  return { evaluatedOperation, mode };
}

async function assertModeAndControls(root: Locator, runtime: RuntimeCase) {
  const { evaluatedOperation, mode } = await currentController(root);
  if (!runtime.modes.includes(mode as FractionOperationsMode)) {
    fail(`${runtime.labId}: unsupported runtime mode ${JSON.stringify(mode)}.`);
  }
  const buttons = root.locator("[data-viz-mode-button]");
  await expect(buttons).toHaveCount(runtime.modes.length);
  expect(
    await buttons.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-viz-mode") ?? ""),
    ),
  ).toEqual([...runtime.modes]);
  await expect(root.locator('[data-viz-mode-button][data-viz-mode-active="true"]')).toHaveCount(1);
  await expect(
    root.locator(
      `[data-viz-mode-button][data-viz-mode=${JSON.stringify(mode)}]`,
    ),
  ).toHaveAttribute("data-viz-mode-active", "true");

  const controls = await visibleControls(root);
  const map = controlMap(controls);
  const topicContract = topicModeControlContract(runtime.labId);
  const expectedParameters =
    topicContract.controls[mode as FractionOperationsMode];
  if (!expectedParameters) {
    fail(`${runtime.labId}:${mode}: independent control row is missing.`);
  }
  expect([...map.keys()]).toEqual(expectedParameters);
  for (const control of controls) expect(control.disabled).toBe(false);
  for (const parameter of numericParameters) {
    const control = map.get(parameter);
    expect(control).toMatchObject({ kind: "number", step: 1 });
  }
  expect(map.get("left-numerator")).toMatchObject({ min: -48, max: 48 });
  expect(map.get("right-numerator")).toMatchObject({
    min: -48,
    max: 48,
    zeroExcluded: evaluatedOperation === "divide",
  });
  expect(map.get("left-denominator")).toMatchObject({ min: 1, max: 24 });
  expect(map.get("right-denominator")).toMatchObject({ min: 1, max: 24 });
  if (mode === "estimate") {
    expect(map.get("estimate-operation")).toMatchObject({
      affects: ["right-numerator"],
      kind: "select",
      options: [...topicContract.estimateOperations],
      projection: "exclude-zero",
      projectionReason: "division-divisor-cannot-be-zero",
      value: evaluatedOperation,
    });
  }
  return { controls, evaluatedOperation, mode };
}

const interpretationKinds = new Map([
  ["multiplication-area-interpretation", "area-grid"],
  ["multiplication-repeated-group-interpretation", "part-of-quantity"],
  ["multiplication-scaling-interpretation", "scaling"],
  ["division-measurement-interpretation", "measurement-division"],
  ["division-sharing-interpretation", "sharing-division"],
] as const);
type InterpretationName = Parameters<typeof interpretationKinds.get>[0];

async function auditVisualSurface(root: Locator, evaluatedOperation: string): Promise<VisualAudit> {
  const expectedInterpretations =
    evaluatedOperation === "multiply"
      ? [
          "multiplication-area-interpretation",
          "multiplication-repeated-group-interpretation",
          "multiplication-scaling-interpretation",
        ]
      : evaluatedOperation === "divide"
        ? [
            "division-measurement-interpretation",
            "division-sharing-interpretation",
          ]
        : [];
  const actualInterpretations = await root
    .locator(
      [
        '[data-viz-name="multiplication-area-interpretation"]',
        '[data-viz-name="multiplication-repeated-group-interpretation"]',
        '[data-viz-name="multiplication-scaling-interpretation"]',
        '[data-viz-name="division-measurement-interpretation"]',
        '[data-viz-name="division-sharing-interpretation"]',
      ].join(","),
    )
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-viz-name") ?? ""),
    );
  expect(actualInterpretations).toEqual(expectedInterpretations);

  const supported: VisualReceipt[] = [];
  const unsupported: Array<{ kind: string; reason: string }> = [];
  for (const name of expectedInterpretations) {
    const kind = interpretationKinds.get(name as InterpretationName);
    if (!kind) fail(`Unknown interpretation ${name}.`);
    const interpretation = root.locator(
      `[data-viz-name=${JSON.stringify(name)}]`,
    );
    await expect(interpretation).toHaveCount(1);
    const status = await interpretation.getAttribute(
      "data-viz-interpretation-status",
    );
    const visual = interpretation.locator(
      `[data-viz-fraction-visual=${JSON.stringify(kind)}]`,
    );
    if (status === "supported") {
      await expect(visual).toHaveCount(1);
      await expect(visual).toBeVisible();
      await expect(visual).toHaveAttribute("data-viz-svg-background", "opaque");
      await expect(visual).toHaveAttribute("role", "img");
      const markCount = Number(
        await visual.getAttribute("data-viz-painted-mark-count"),
      );
      expect(Number.isSafeInteger(markCount)).toBe(true);
      expect(markCount).toBeGreaterThan(0);
      await expect(visual.locator('[data-viz-painted-mark="true"]')).toHaveCount(
        markCount,
      );
      const receipt = parseJson(
        await visual.getAttribute("data-viz-geometry-receipt"),
      );
      expect(receipt).toMatchObject({ kind, status: "supported" });
      supported.push({ kind, markCount, receipt, status: "supported" });
    } else if (status === "unsupported") {
      const reason = await interpretation.getAttribute(
        "data-viz-unsupported-reason",
      );
      if (!reason?.trim()) fail(`${name}: unsupported interpretation has no reason.`);
      await expect(visual).toHaveCount(0);
      await expect(
        interpretation.locator(
          "[data-viz-fraction-visual], [data-viz-painted-mark-count], [data-viz-painted-mark=\"true\"]",
        ),
      ).toHaveCount(0);
      unsupported.push({ kind, reason });
    } else {
      fail(`${name}: interpretation status is ${JSON.stringify(status)}.`);
    }
  }
  await expect(root.locator("[data-viz-fraction-visual]")).toHaveCount(
    supported.length,
  );
  return { expectedInterpretations, supported, unsupported };
}

async function auditCollision(
  root: Locator,
  stateId: string,
  visual: VisualAudit,
): Promise<CollisionReceipt> {
  const snapshot = await scanHkVisualizationCollisions(root, stateId);
  expect(snapshot.truncated).toBe(false);
  expect(snapshot.issues).toEqual([]);
  expect(Object.keys(snapshot.candidatePairCounts).sort()).toEqual(
    [...chinaVisualizationCollisionPairKinds].sort(),
  );
  const pairTotal = chinaVisualizationCollisionPairKinds.reduce(
    (total, kind) => total + snapshot.candidatePairCounts[kind],
    0,
  );
  expect(snapshot.totalCandidatePairCount).toBe(pairTotal);
  expect(snapshot.totalCandidatePairCount).toBeGreaterThan(0);
  const inspectedTotal =
    snapshot.htmlTextFragmentCount +
    snapshot.learnerControlCount +
    snapshot.paintedMarkCount +
    snapshot.svgTextFragmentCount;
  expect(snapshot.inspectedCandidateCount).toBe(inspectedTotal);
  expect(snapshot.inspectedCandidateCount).toBeGreaterThan(0);
  expect(snapshot.learnerControlCount).toBeGreaterThan(0);
  expect(snapshot.htmlTextFragmentCount).toBeGreaterThan(0);
  expect(snapshot.paintedMarkCount).toBeGreaterThan(0);
  if (visual.supported.length > 0) {
    expect(snapshot.svgSurfaceCount).toBeGreaterThanOrEqual(
      visual.supported.length,
    );
  }
  for (const exemption of snapshot.overlapExemptions) {
    expect(exemption.risk).toBe("explicit-narrow-pair");
    expect(exemption.owner.trim().length).toBeGreaterThan(0);
    expect(exemption.reason?.trim().length ?? 0).toBeGreaterThan(0);
  }
  return {
    candidatePairCounts: { ...snapshot.candidatePairCounts },
    htmlTextFragmentCount: snapshot.htmlTextFragmentCount,
    inspectedCandidateCount: snapshot.inspectedCandidateCount,
    learnerControlCount: snapshot.learnerControlCount,
    overlapExemptionCount: snapshot.overlapExemptions.length,
    paintedMarkCount: snapshot.paintedMarkCount,
    svgSurfaceCount: snapshot.svgSurfaceCount,
    svgTextFragmentCount: snapshot.svgTextFragmentCount,
    totalCandidatePairCount: snapshot.totalCandidatePairCount,
  };
}

async function auditTouchAndOverflow(root: Locator) {
  const touchTargets = await root.evaluate((element) => {
    const selector = [
      "[data-viz-mode-button]",
      "input[data-viz-parameter]",
      "select[data-viz-parameter]",
      "[data-viz-reset-model]",
    ].join(",");
    return Array.from(element.querySelectorAll<HTMLElement>(selector))
      .filter((target) => !target.closest("[data-viz-lesson-action-slot]"))
      .filter((target) => {
        const style = getComputedStyle(target);
        const rect = target.getBoundingClientRect();
        return (
          rect.width > 1 &&
          rect.height > 1 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      })
      .map((target) => {
        const rect = target.getBoundingClientRect();
        return {
          description:
            target.getAttribute("data-viz-parameter") ??
            target.getAttribute("data-viz-mode") ??
            target.getAttribute("aria-label") ??
            target.tagName.toLowerCase(),
          height: rect.height,
          width: rect.width,
        };
      });
  });
  expect(touchTargets.length).toBeGreaterThan(0);
  for (const target of touchTargets) {
    expect(target.width, `${target.description}: touch width`).toBeGreaterThanOrEqual(44);
    expect(target.height, `${target.description}: touch height`).toBeGreaterThanOrEqual(44);
  }

  const scroll = root.locator('[data-viz-scroll-container="true"]');
  await expect(scroll).toHaveCount(1);
  await expect(scroll).toHaveAttribute("tabindex", "0");
  const localScroll = await scroll.evaluate((element) => ({
    clientWidth: element.clientWidth,
    overflowX: getComputedStyle(element).overflowX,
    scrollWidth: element.scrollWidth,
  }));
  if (localScroll.scrollWidth > localScroll.clientWidth + 1) {
    expect(["auto", "scroll"]).toContain(localScroll.overflowX);
    await expect(root.locator('[data-viz-pan-hint="true"]')).toBeVisible();
  }

  const pageOverflow = await root.page().evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
  }));
  expect(pageOverflow.documentScrollWidth).toBeLessThanOrEqual(
    pageOverflow.documentClientWidth + 1,
  );
  expect(pageOverflow.bodyScrollWidth).toBeLessThanOrEqual(
    pageOverflow.documentClientWidth + 1,
  );
  return { pageOverflow, touchTargetCount: touchTargets.length };
}

function assertSuccessfulDomainReceipt(
  domain: DomainReceipt,
  plannerReceipt: FractionOperationsDivisorTransitionReceipt,
) {
  expect(domain.rejection).toBeNull();
  expect(plannerReceipt.matchesExpected).toBe(true);
  expect(domain.requested).toEqual(plannerReceipt.requested);
  expect(domain.expected).toEqual(plannerReceipt.expected);
  expect(domain.observed).toEqual(plannerReceipt.observed);
  expect(domain.projectionCount).toBe(plannerReceipt.projections.length);
  expect(domain.projectionReasons).toEqual(
    plannerReceipt.projections.map((projection) => projection.reason),
  );
}

function assertPlannedDomainReceipt(
  action: ActionEvidence,
  domain: DomainReceipt,
  productAction: FractionOperationsActionReceipt,
) {
  expect(productAction).toEqual(action.expectedActionReceipt);
  expect(domain.rejection).toBe(action.expectedActionReceipt.rejection);
  expect(domain.requested).toEqual(action.expectedActionReceipt.requested);
  expect(domain.expected).toEqual(action.expectedActionReceipt.expected);
  expect(domain.observed).toEqual(action.expectedActionReceipt.observed);
  expect(domain.projectionCount).toBe(
    action.expectedActionReceipt.projections.length,
  );
  expect(domain.projectionReasons).toEqual(
    action.expectedActionReceipt.projections.map(
      (projection) => projection.reason,
    ),
  );
  if (action.expectedRejection) {
    expect(action.plannerReceipt).toBeNull();
    expect(action.rejectedRequest).not.toBeNull();
    expect(productAction.accepted).toBe(false);
    expect(productAction.status).toBe("rejected");
    expect(productAction.requestedValidity).toBe("rejected-invalid");
    expect(productAction.request).toEqual(action.rejectedRequest);
    expect(productAction.rejection).toBe(action.expectedRejection);
    expect(action.oracleAfter).toEqual(action.oracleBefore);
    expect(domain.observed).toEqual(action.oracleBefore);
    return;
  }
  expect(productAction.accepted).toBe(true);
  expect(productAction.status).toBe("accepted");
  if (!action.plannerReceipt) {
    fail("G04 accepted action has no production planner receipt.");
  }
  expect(action.rejectedRequest).toBeNull();
  assertSuccessfulDomainReceipt(domain, action.plannerReceipt);
  expect(action.oracleAfter).toEqual(action.plannerReceipt.expected);
  expect(domain.observed).toEqual(action.oracleAfter);
  expect(action.expectedProjection).toBe(
    action.plannerReceipt.projections.length > 0,
  );
}

async function auditSettledState(
  root: Locator,
  runtime: RuntimeCase,
  stateId: string,
  action: ActionEvidence,
): Promise<StateReceipt> {
  await settleExactRuntime(root, stateId);
  await assertProductionIdentity(root, runtime);
  const { controls, evaluatedOperation, mode } = await assertModeAndControls(
    root,
    runtime,
  );
  const domain = await domainReceipt(root);
  const productAction = await productActionReceipt(root);
  controlsMatchDomain(controls, domain.observed);
  expect(domain.observed.mode).toBe(mode);
  expect(domain.observed.evaluatedOperation).toBe(evaluatedOperation);
  assertPlannedDomainReceipt(action, domain, productAction);

  const visual = await auditVisualSurface(root, evaluatedOperation);
  const runtimeSignatureBeforeScans = await runtimeSignature(root);
  const collision = await auditCollision(root, stateId, visual);
  const contrast = await root.evaluate(scanHkVisualizationTextContrast, {
    authoringSelector:
      "[data-viz-authoring-only], [data-viz-manim-authoring-dock]",
  });
  expect(contrast.checkedTextCount).toBeGreaterThan(0);
  expect(contrast.worst).not.toBeNull();
  expect(contrast.issues).toEqual([]);
  if (!contrast.worst) fail(`${stateId}: contrast scanner returned no worst sample.`);
  const { pageOverflow, touchTargetCount } = await auditTouchAndOverflow(root);
  await root.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  const runtimeSignatureAfterScans = await runtimeSignature(root);
  expect(
    runtimeSignatureAfterScans,
    `${stateId}: G04 runtime drifted during collision/contrast/layout audits`,
  ).toEqual(runtimeSignatureBeforeScans);
  const configuredState = runtimeSignatureAfterScans.configuredState ?? "";
  expect(configuredState).toMatch(/^fraction-operations-v2\|/u);
  expect(runtimeSignatureAfterScans.semanticState).toBe(configuredState);
  return {
    action,
    collision,
    configuredState,
    contrast: {
      auditedTextCount: contrast.checkedTextCount,
      minRatio: contrast.worst.contrastRatio,
      requiredRatio: contrast.worst.requiredRatio,
      worstTarget: contrast.worst.target,
    },
    controls,
    domain,
    evaluatedOperation,
    mode,
    pageOverflow,
    productActionReceipt: productAction,
    runtimeSignature: runtimeSignatureAfterScans,
    stateId,
    touchTargetCount,
    visual,
  };
}

function bindPlannedDescriptorToReceipt(
  descriptor: PlannedStateDescriptor,
  receipt: StateReceipt,
  runtime: RuntimeCase,
  plan: StatePlan,
) {
  const configuredParts = receipt.configuredState.split("|");
  const configuredLab = configuredParts[1]?.startsWith("lab=")
    ? configuredParts[1].slice("lab=".length)
    : "";
  const configuredMode = configuredParts[2]?.startsWith("mode=")
    ? configuredParts[2].slice("mode=".length)
    : "";
  const configuredEvaluatedOperation = configuredParts[3]?.startsWith(
    "evaluated=",
  )
    ? configuredParts[3].slice("evaluated=".length)
    : "";
  const expected = expectedStateDescriptorById.get(receipt.stateId);
  if (
    expected === undefined ||
    validatorCanonicalJson(descriptor) !== validatorCanonicalJson(expected) ||
    descriptor.stateId !== receipt.stateId ||
    descriptor.labId !== configuredLab ||
    descriptor.plan.mode !== configuredMode ||
    descriptor.plan.mode !== receipt.mode ||
    staticPlanEvaluatedOperation(runtime, plan) !==
      configuredEvaluatedOperation ||
    staticPlanEvaluatedOperation(runtime, plan) !==
      receipt.evaluatedOperation ||
    descriptor.plan.kind !== receipt.action.plannedRequest.kind ||
    validatorCanonicalJson(descriptor.plan.request) !==
      validatorCanonicalJson(receipt.action.plannedRequest)
  ) {
    fail(
      `${descriptor.stateId}: planned semantic descriptor does not bind to its real receipt.`,
    );
  }
  const request = receipt.action.plannedRequest;
  const expectedControlParameter = request.kind === "control"
    ? request.controlId
    : request.kind === "controller"
      ? "mode/evaluated-operation"
      : null;
  if (descriptor.plan.controlParameter !== expectedControlParameter) {
    fail(
      `${descriptor.stateId}: descriptor control parameter drifted from its real request.`,
    );
  }
  if (
    request.kind === "control" &&
    !receipt.controls.some(({ parameter }) => parameter === request.controlId)
  ) {
    fail(
      `${descriptor.stateId}: exact G04 controlId is absent from its real receipt controls.`,
    );
  }
  if (
    request.kind === "controller" &&
    (request.mode !== receipt.mode ||
      request.evaluatedOperation !== receipt.evaluatedOperation)
  ) {
    fail(
      `${descriptor.stateId}: composite controller request does not bind to mode/evaluatedOperation.`,
    );
  }
  return descriptor;
}

async function setNumberValue(control: Locator, value: number) {
  await control.evaluate((element, nextValue) => {
    if (!(element instanceof HTMLInputElement) || element.type !== "number") {
      throw new TypeError("Numeric endpoint target is not input[type=number].");
    }
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    if (!setter) {
      throw new TypeError("Native HTMLInputElement value setter is unavailable.");
    }
    setter.call(element, String(nextValue));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

function endpointValue(control: ControlSnapshot, endpoint: EndpointName) {
  if (
    control.kind !== "number" ||
    control.min === null ||
    control.max === null ||
    control.step === null ||
    !Number.isFinite(control.min) ||
    !Number.isFinite(control.max) ||
    !Number.isFinite(control.step) ||
    control.step <= 0 ||
    control.max < control.min
  ) {
    fail(`${control.parameter}: invalid numeric descriptor ${JSON.stringify(control)}.`);
  }
  if (endpoint === "min") return control.min;
  if (endpoint === "max") return control.max;
  const stepCount = Math.floor((control.max - control.min) / control.step / 2);
  return Math.min(control.max, control.min + stepCount * control.step);
}

async function clickMode(root: Locator, mode: FractionOperationsMode) {
  const button = root.locator(
    `[data-viz-mode-button][data-viz-mode=${JSON.stringify(mode)}]`,
  );
  await expect(button).toHaveCount(1);
  await expect(button).toBeEnabled();
  await button.click();
  await settleExactRuntime(root, `enter-mode:${mode}`);
}

async function selectEstimateOperation(
  root: Locator,
  operation: FractionArithmeticOperation,
) {
  const select = root.locator(
    'select[data-viz-parameter="estimate-operation"]',
  );
  await expect(select).toHaveCount(1);
  await expect(select).toBeEnabled();
  await select.selectOption(operation);
  await settleExactRuntime(root, `estimate-operation:${operation}`);
}

async function clickReset(root: Locator, runtime: RuntimeCase) {
  const reset = root.locator(
    `[data-viz-reset-model][data-viz-reset-module-id=${JSON.stringify(configuredModuleId)}][data-viz-reset-topic-id=${JSON.stringify(runtime.labId)}]`,
  );
  await expect(reset).toHaveCount(1);
  await reset.click();
  await settleExactRuntime(root, `prepare-reset:${runtime.labId}`);
}

async function assertResetState(root: Locator, runtime: RuntimeCase) {
  const reset = FRACTION_OPERATIONS_RESET_INPUTS[runtime.labId];
  const { evaluatedOperation, mode } = await currentController(root);
  expect(mode).toBe(reset.mode);
  expect(evaluatedOperation).toBe(reset.mode);
  expect([...valuesOf(await visibleControls(root)).entries()]).toEqual([
    ["left-numerator", String(reset.left.numerator)],
    ["left-denominator", String(reset.left.denominator)],
    ["right-numerator", String(reset.right.numerator)],
    ["right-denominator", String(reset.right.denominator)],
  ]);
}

type ExecutedPlan = Readonly<{
  action: ActionEvidence;
  oracleState: DomainState;
}>;

function assertOraclePrecondition(
  label: string,
  domain: DomainReceipt,
  oracleState: DomainState,
) {
  expect(domain.observed, `${label}: DOM/oracle precondition`).toEqual(
    oracleState,
  );
}

function acceptedActionEvidence({
  beforeControls,
  beforeDomain,
  oracleBefore,
  observedControls,
  plannedRequest,
  plannerReceipt,
}: {
  beforeControls: readonly ControlSnapshot[];
  beforeDomain: DomainReceipt;
  oracleBefore: DomainState;
  observedControls: readonly ControlSnapshot[];
  plannedRequest: PlannedRequest;
  plannerReceipt: FractionOperationsDivisorTransitionReceipt;
}): ExecutedPlan {
  if (plannedRequest.kind !== "initial" && plannedRequest.kind !== "reset") {
    assertJsonExact(
      "accepted planned request",
      plannedRequest,
      plannerReceipt.request,
    );
  }
  const expectedActionReceipt =
    createFractionOperationsAcceptedActionReceipt({
      before: oracleBefore,
      expected: plannerReceipt.expected,
      observed: plannerReceipt.observed,
      projections: plannerReceipt.projections,
      request: plannedRequest,
      requested: plannerReceipt.requested,
    });
  return {
    action: {
      beforeControls,
      beforeDomain,
      expectedActionReceipt,
      expectedProjection: plannerReceipt.projections.length > 0,
      expectedRejection: null,
      observedControls,
      oracleAfter: plannerReceipt.expected,
      oracleBefore,
      plannedRequest,
      plannerReceipt,
      rejectedRequest: null,
    },
    oracleState: plannerReceipt.expected,
  };
}

function exactPlannerRejection(
  oracleState: DomainState,
  request: FractionOperationsDomainRequest,
  expectedCode: "DIRECT_DIVISOR_ZERO_REQUEST",
) {
  const preimage = canonicalJson(oracleState);
  let observedCode: string | null = null;
  try {
    planFractionOperationsDivisorTransition(oracleState, request);
  } catch (error) {
    if (error instanceof FractionOperationsDivisorDomainError) {
      observedCode = error.code;
    } else {
      throw error;
    }
  }
  if (observedCode !== expectedCode) {
    fail(
      `G04 planner rejection drifted; expected=${expectedCode} actual=${String(observedCode)}.`,
    );
  }
  if (canonicalJson(oracleState) !== preimage) {
    fail("G04 planner rejection mutated the independent oracle state.");
  }
  return observedCode;
}

function rejectedActionEvidence({
  beforeControls,
  beforeDomain,
  oracleState,
  observedControls,
  plannedRequest,
  rejectedRequest,
}: {
  beforeControls: readonly ControlSnapshot[];
  beforeDomain: DomainReceipt;
  oracleState: DomainState;
  observedControls: readonly ControlSnapshot[];
  plannedRequest: PlannedRequest;
  rejectedRequest: FractionOperationsDomainRequest;
}): ExecutedPlan {
  assertJsonExact(
    "rejected planned request",
    plannedRequest,
    rejectedRequest,
  );
  const expectedActionReceipt =
    createFractionOperationsRejectedActionReceipt({
      before: oracleState,
      rejection: "DIRECT_DIVISOR_ZERO_REQUEST",
      request: rejectedRequest,
    });
  return {
    action: {
      beforeControls,
      beforeDomain,
      expectedActionReceipt,
      expectedProjection: null,
      expectedRejection: "DIRECT_DIVISOR_ZERO_REQUEST",
      observedControls,
      oracleAfter: oracleState,
      oracleBefore: oracleState,
      plannedRequest,
      plannerReceipt: null,
      rejectedRequest,
    },
    oracleState,
  };
}

async function initialOrResetEvidence(
  root: Locator,
  runtime: RuntimeCase,
  kind: "initial" | "reset",
  actionBefore: DomainState,
): Promise<ExecutedPlan> {
  const oracleState = resetDomainState(runtime);
  const controls = await visibleControls(root);
  const beforeDomain = await domainReceipt(root);
  assertOraclePrecondition(kind, beforeDomain, oracleState);
  const plannerReceipt = exactPlannerReceipt(oracleState, {
    evaluatedOperation: oracleState.evaluatedOperation,
    kind: "controller",
    mode: oracleState.mode,
  });
  return acceptedActionEvidence({
    beforeControls: controls,
    beforeDomain,
    observedControls: controls,
    oracleBefore: actionBefore,
    plannedRequest: { kind },
    plannerReceipt,
  });
}

async function applyControllerPreparation(
  root: Locator,
  oracleState: DomainState,
  request: Extract<FractionOperationsDomainRequest, { kind: "controller" }>,
  interact: () => Promise<void>,
  label: string,
) {
  const beforeDomain = await domainReceipt(root);
  assertOraclePrecondition(label, beforeDomain, oracleState);
  const plannerReceipt = exactPlannerReceipt(oracleState, request);
  await interact();
  const afterDomain = await domainReceipt(root);
  assertSuccessfulDomainReceipt(afterDomain, plannerReceipt);
  const expectedActionReceipt =
    createFractionOperationsAcceptedActionReceipt({
      before: oracleState,
      expected: plannerReceipt.expected,
      observed: plannerReceipt.observed,
      projections: plannerReceipt.projections,
      request,
      requested: plannerReceipt.requested,
    });
  expect(await productActionReceipt(root)).toEqual(expectedActionReceipt);
  return plannerReceipt.expected;
}

async function normalPlanAction(
  root: Locator,
  runtime: RuntimeCase,
  plan: Exclude<StatePlan, DomainPlan | InitialPlan>,
  oracleState: DomainState,
): Promise<ExecutedPlan> {
  if (plan.kind === "reset") {
    await clickReset(root, runtime);
    await assertResetState(root, runtime);
    return await initialOrResetEvidence(root, runtime, "reset", oracleState);
  }
  if (plan.kind === "first-interaction") {
    const beforeControls = await visibleControls(root);
    const beforeDomain = await domainReceipt(root);
    assertOraclePrecondition(plan.id, beforeDomain, oracleState);
    const value =
      oracleState.leftNumerator < 48
        ? oracleState.leftNumerator + 1
        : oracleState.leftNumerator - 1;
    const key = value > oracleState.leftNumerator ? "ArrowUp" : "ArrowDown";
    const request = {
      controlId: "left-numerator",
      kind: "control",
      value,
    } as const satisfies FractionOperationsDomainRequest;
    const plannerReceipt = exactPlannerReceipt(oracleState, request);
    const control = root.locator(
      'input[type="number"][data-viz-parameter="left-numerator"]',
    );
    expect(Number(await control.inputValue())).toBe(oracleState.leftNumerator);
    await control.focus();
    await control.press(key);
    await settleExactRuntime(root, plan.id);
    const observedControls = await visibleControls(root);
    return acceptedActionEvidence({
      beforeControls,
      beforeDomain,
      observedControls,
      oracleBefore: oracleState,
      plannedRequest: request,
      plannerReceipt,
    });
  }
  if (plan.kind === "mode") {
    const beforeControls = await visibleControls(root);
    const beforeDomain = await domainReceipt(root);
    assertOraclePrecondition(plan.id, beforeDomain, oracleState);
    const evaluatedOperation = evaluatedOperationForMode(runtime, plan.mode);
    const request = {
      evaluatedOperation,
      kind: "controller",
      mode: plan.mode,
    } as const satisfies FractionOperationsDomainRequest;
    const plannerReceipt = exactPlannerReceipt(oracleState, request);
    // never derive expected controller value from post-click DOM.
    await clickMode(root, plan.mode);
    return acceptedActionEvidence({
      beforeControls,
      beforeDomain,
      observedControls: await visibleControls(root),
      oracleBefore: oracleState,
      plannedRequest: request,
      plannerReceipt,
    });
  }
  if (plan.kind === "estimate-operation") {
    const defaultOperation = evaluatedOperationForMode(runtime, "estimate");
    oracleState = await applyControllerPreparation(
      root,
      oracleState,
      {
        evaluatedOperation: defaultOperation,
        kind: "controller",
        mode: "estimate",
      },
      async () => await clickMode(root, "estimate"),
      `${plan.id}:prepare-estimate`,
    );
    const beforeControls = await visibleControls(root);
    const beforeDomain = await domainReceipt(root);
    assertOraclePrecondition(plan.id, beforeDomain, oracleState);
    const request = {
      evaluatedOperation: plan.operation,
      kind: "controller",
      mode: "estimate",
    } as const satisfies FractionOperationsDomainRequest;
    const plannerReceipt = exactPlannerReceipt(oracleState, request);
    await selectEstimateOperation(root, plan.operation);
    return acceptedActionEvidence({
      beforeControls,
      beforeDomain,
      observedControls: await visibleControls(root),
      oracleBefore: oracleState,
      plannedRequest: request,
      plannerReceipt,
    });
  }

  const evaluatedOperation = evaluatedOperationForMode(runtime, plan.mode);
  oracleState = await applyControllerPreparation(
    root,
    oracleState,
    {
      evaluatedOperation,
      kind: "controller",
      mode: plan.mode,
    },
    async () => await clickMode(root, plan.mode),
    `${plan.id}:prepare-mode`,
  );
  const beforeControls = await visibleControls(root);
  const beforeDomain = await domainReceipt(root);
  assertOraclePrecondition(plan.id, beforeDomain, oracleState);
  const targetSnapshot = controlMap(beforeControls).get(plan.parameter);
  if (!targetSnapshot) fail(`${plan.id}: numeric control is missing.`);
  const targetValue = endpointValue(targetSnapshot, plan.endpoint);
  const request = {
    controlId: plan.parameter,
    kind: "control",
    value: targetValue,
  } as const satisfies FractionOperationsDomainRequest;
  const target = root.locator(
    `input[type="number"][data-viz-parameter=${JSON.stringify(plan.parameter)}]`,
  );
  await expect(target).toHaveCount(1);
  await expect(target).toBeEnabled();

  let plannerReceipt: FractionOperationsDivisorTransitionReceipt | null = null;
  let rejectionCode: string | null = null;
  try {
    plannerReceipt = exactPlannerReceipt(oracleState, request);
  } catch (error) {
    if (error instanceof FractionOperationsDivisorDomainError) {
      rejectionCode = error.code;
    } else {
      throw error;
    }
  }
  if (rejectionCode) {
    if (rejectionCode !== "DIRECT_DIVISOR_ZERO_REQUEST") {
      fail(`${plan.id}: unexpected planner rejection ${rejectionCode}.`);
    }
    exactPlannerRejection(
      oracleState,
      request,
      "DIRECT_DIVISOR_ZERO_REQUEST",
    );
  } else if (!plannerReceipt) {
    fail(`${plan.id}: planner returned neither receipt nor rejection.`);
  }

  await setNumberValue(target, targetValue);
  await settleExactRuntime(root, plan.id);
  const observedControls = await visibleControls(root);
  if (rejectionCode) {
    expect(observedControls).toEqual(beforeControls);
    return rejectedActionEvidence({
      beforeControls,
      beforeDomain,
      observedControls,
      oracleState,
      plannedRequest: request,
      rejectedRequest: request,
    });
  }
  return acceptedActionEvidence({
    beforeControls,
    beforeDomain,
    observedControls,
    oracleBefore: oracleState,
    plannedRequest: request,
    plannerReceipt: plannerReceipt!,
  });
}

async function domainPlanAction(
  root: Locator,
  runtime: RuntimeCase,
  plan: DomainPlan,
  oracleState: DomainState,
): Promise<ExecutedPlan> {
  const rightNumerator = root.locator(
    'input[type="number"][data-viz-parameter="right-numerator"]',
  );
  if (plan.step === "zero-outside-divide") {
    await clickReset(root, runtime);
    await assertResetState(root, runtime);
    oracleState = resetDomainState(runtime);
    oracleState = await applyControllerPreparation(
      root,
      oracleState,
      {
        evaluatedOperation: "simplify",
        kind: "controller",
        mode: "simplify",
      },
      async () => await clickMode(root, "simplify"),
      `${plan.id}:prepare-simplify`,
    );
    const beforeControls = await visibleControls(root);
    const beforeDomain = await domainReceipt(root);
    assertOraclePrecondition(plan.id, beforeDomain, oracleState);
    const request = {
      controlId: "right-numerator",
      kind: "control",
      value: 0,
    } as const satisfies FractionOperationsDomainRequest;
    const plannerReceipt = exactPlannerReceipt(oracleState, request);
    await setNumberValue(rightNumerator, 0);
    await settleExactRuntime(root, plan.id);
    return acceptedActionEvidence({
      beforeControls,
      beforeDomain,
      observedControls: await visibleControls(root),
      oracleBefore: oracleState,
      plannedRequest: request,
      plannerReceipt,
    });
  }
  if (plan.step === "project-enter-divide") {
    const mode = plan.scenario === "direct-divide" ? "divide" : "estimate";
    if (
      plan.scenario === "estimate-divide" &&
      evaluatedOperationForMode(runtime, "estimate") !== "divide"
    ) {
      const defaultOperation = evaluatedOperationForMode(runtime, "estimate");
      oracleState = await applyControllerPreparation(
        root,
        oracleState,
        {
          evaluatedOperation: defaultOperation,
          kind: "controller",
          mode: "estimate",
        },
        async () => await clickMode(root, "estimate"),
        `${plan.id}:prepare-estimate`,
      );
    }
    const beforeControls = await visibleControls(root);
    const beforeDomain = await domainReceipt(root);
    assertOraclePrecondition(plan.id, beforeDomain, oracleState);
    const request = {
      evaluatedOperation: "divide",
      kind: "controller",
      mode,
    } as const satisfies FractionOperationsDomainRequest;
    const plannerReceipt = exactPlannerReceipt(oracleState, request);
    if (plan.scenario === "direct-divide") {
      await clickMode(root, "divide");
    } else if (evaluatedOperationForMode(runtime, "estimate") === "divide") {
      await clickMode(root, "estimate");
    } else {
      await selectEstimateOperation(root, "divide");
    }
    return acceptedActionEvidence({
      beforeControls,
      beforeDomain,
      observedControls: await visibleControls(root),
      oracleBefore: oracleState,
      plannedRequest: request,
      plannerReceipt,
    });
  }
  if (plan.step === "reject-direct-zero") {
    const beforeControls = await visibleControls(root);
    const beforeDomain = await domainReceipt(root);
    assertOraclePrecondition(plan.id, beforeDomain, oracleState);
    const request = {
      controlId: "right-numerator",
      kind: "control",
      value: 0,
    } as const satisfies FractionOperationsDomainRequest;
    exactPlannerRejection(
      oracleState,
      request,
      "DIRECT_DIVISOR_ZERO_REQUEST",
    );
    await setNumberValue(rightNumerator, 0);
    await settleExactRuntime(root, plan.id);
    const observedControls = await visibleControls(root);
    expect(observedControls).toEqual(beforeControls);
    return rejectedActionEvidence({
      beforeControls,
      beforeDomain,
      observedControls,
      oracleState,
      plannedRequest: request,
      rejectedRequest: request,
    });
  }
  if (plan.step === "leave-divide") {
    const beforeControls = await visibleControls(root);
    const beforeDomain = await domainReceipt(root);
    assertOraclePrecondition(plan.id, beforeDomain, oracleState);
    const request = {
      evaluatedOperation: "simplify",
      kind: "controller",
      mode: "simplify",
    } as const satisfies FractionOperationsDomainRequest;
    const plannerReceipt = exactPlannerReceipt(oracleState, request);
    await clickMode(root, "simplify");
    return acceptedActionEvidence({
      beforeControls,
      beforeDomain,
      observedControls: await visibleControls(root),
      oracleBefore: oracleState,
      plannedRequest: request,
      plannerReceipt,
    });
  }

  const mode = plan.scenario === "direct-divide" ? "divide" : "estimate";
  const beforeControls = await visibleControls(root);
  const beforeDomain = await domainReceipt(root);
  assertOraclePrecondition(plan.id, beforeDomain, oracleState);
  const request = {
    evaluatedOperation: "divide",
    kind: "controller",
    mode,
  } as const satisfies FractionOperationsDomainRequest;
  const plannerReceipt = exactPlannerReceipt(oracleState, request);
  await clickMode(root, mode);
  return acceptedActionEvidence({
    beforeControls,
    beforeDomain,
    observedControls: await visibleControls(root),
    oracleBefore: oracleState,
    plannedRequest: request,
    plannerReceipt,
  });
}

async function executePlan(
  root: Locator,
  runtime: RuntimeCase,
  plan: StatePlan,
  planIndex: number,
  priorPlan: StatePlan | undefined,
  oracleState: DomainState,
): Promise<ExecutedPlan> {
  if (plan.kind === "initial") {
    await assertResetState(root, runtime);
    expect(oracleState).toEqual(resetDomainState(runtime));
    return await initialOrResetEvidence(root, runtime, "initial", oracleState);
  }
  const domainContinuation =
    plan.kind === "domain" &&
    priorPlan?.kind === "domain" &&
    priorPlan.atomicGroup === plan.atomicGroup;
  if (
    planIndex > 0 &&
    plan.kind !== "first-interaction" &&
    plan.kind !== "domain" &&
    plan.kind !== "reset"
  ) {
    await clickReset(root, runtime);
    await assertResetState(root, runtime);
    oracleState = resetDomainState(runtime);
  } else if (plan.kind === "domain" && !domainContinuation) {
    // The first domain step resets both UI and independent oracle itself.
  }
  if (plan.kind === "domain") {
    return await domainPlanAction(root, runtime, plan, oracleState);
  }
  return await normalPlanAction(root, runtime, plan, oracleState);
}

async function awaitFirstSessionAck(
  responsePromise: Promise<import("@playwright/test").Response>,
  runtime: RuntimeCase,
  userId: string,
): Promise<FirstSessionAcknowledgement> {
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/json");
  const responseUrl = new URL(response.url());
  expect(responseUrl.pathname).toBe("/api/visualization-sessions");
  expect(responseUrl.search).toBe("");
  expect(responseUrl.hash).toBe("");
  const request = response.request();
  expect(request.method()).toBe("POST");
  expect(decodeURIComponent(request.headers()["x-mais-visualization-user-id"] ?? "")).toBe(
    userId,
  );
  expect(requestBody(request)).toEqual({
    moduleId: configuredModuleId,
    source: runtime.lab.analyticsSource,
    topicId: runtime.labId,
  });
  const delivery = await readJson<unknown>(
    response,
    `${runtime.labId}: first-control ACK`,
  );
  assertExactOwnKeys(`${runtime.labId}: first-control ACK`, delivery, [
    "acknowledgedUserId",
    "durablyPersisted",
    "session",
  ]);
  assertExactOwnKeys(`${runtime.labId}: first-control ACK session`, delivery.session, [
    "completedAt",
    "explored",
    "moduleId",
    "source",
    "topicId",
    "updatedAt",
  ]);
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
    fail(`${runtime.labId}: first-control ACK timestamps are not exact.`);
  }
  const acknowledgement: FirstSessionAcknowledgement = {
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
  };
  expect(delivery).toEqual(acknowledgement);
  return acknowledgement;
}

type DurabilityBrowserAdapter = ReturnType<
  typeof createVisualizationLessonDurabilityBrowserAdapter
>;

async function runExactDurabilityProbe({
  durability,
  includeRaw,
  page,
  root,
  runtime,
  setStage,
  userId,
}: {
  durability: DurabilityBrowserAdapter;
  includeRaw: boolean;
  page: Page;
  root: Locator;
  runtime: RuntimeCase;
  setStage: (next: Stage) => void;
  userId: string;
}) {
  const reset = FRACTION_OPERATIONS_RESET_INPUTS[runtime.labId];
  const resetState = resetDomainState(runtime);
  await assertResetState(root, runtime);
  expect((await domainReceipt(root)).observed).toEqual(resetState);

  const probeMode = runtime.modes.find((mode) => mode !== reset.mode);
  if (!probeMode) {
    fail(`${runtime.labId}: exact durability probe has no non-reset mode.`);
  }
  const probeModeButton = root.locator(
    `[data-viz-mode-button][data-viz-mode=${JSON.stringify(probeMode)}][data-viz-mode-active="false"]`,
  );
  await expect(probeModeButton).toHaveCount(1);
  await expect(probeModeButton).toBeVisible();
  await expect(probeModeButton).toBeEnabled();
  await expect(probeModeButton).toHaveAttribute("data-viz-mode-active", "false");
  const firstRequest = {
    evaluatedOperation: evaluatedOperationForMode(runtime, probeMode),
    kind: "controller",
    mode: probeMode,
  } as const satisfies FractionOperationsDomainRequest;
  const firstPlannerReceipt = exactPlannerReceipt(resetState, firstRequest);
  const expectedFirstActionReceipt =
    createFractionOperationsAcceptedActionReceipt({
      before: resetState,
      expected: firstPlannerReceipt.expected,
      observed: firstPlannerReceipt.observed,
      projections: firstPlannerReceipt.projections,
      request: firstRequest,
      requested: firstPlannerReceipt.requested,
    });

  setStage("interaction");
  const firstFence = await durability.armRealControl({
    expectedButtonClick: {
      controlKey: probeMode,
      eventTypes: ["pointerup", "click"],
    },
    ordinal: 1,
  });
  const firstSessionResponse = page.waitForResponse(
    (candidate) =>
      candidate.request().method() === "POST" &&
      isSameOriginApplicationUrl(candidate.url()) &&
      new URL(candidate.url()).pathname === "/api/visualization-sessions",
    { timeout: 30_000 },
  );
  await probeModeButton.click();
  const sessionAcknowledgement = await awaitFirstSessionAck(
    firstSessionResponse,
    runtime,
    userId,
  );
  const first = await durability.finishFirstRealControl({
    fence: firstFence,
    includeRaw,
    root,
  });
  expect(first.expectedControl).toEqual({
    controlKey: probeMode,
    eventTypes: ["pointerup", "click"],
  });
  expect(first.controlEvents.map(({ controlKey, key, type }) => ({
    controlKey,
    key,
    type,
  }))).toEqual([
    { controlKey: probeMode, key: null, type: "pointerup" },
    { controlKey: probeMode, key: null, type: "click" },
  ]);
  setStage("audit");

  expect(await currentController(root)).toEqual({
    evaluatedOperation: firstRequest.evaluatedOperation,
    mode: probeMode,
  });
  const firstDomain = await domainReceipt(root);
  assertSuccessfulDomainReceipt(firstDomain, firstPlannerReceipt);
  expect(await productActionReceipt(root)).toEqual(expectedFirstActionReceipt);

  const resetButton = root.locator(
    `[data-viz-reset-model][data-viz-reset-module-id=${JSON.stringify(configuredModuleId)}][data-viz-reset-topic-id=${JSON.stringify(runtime.labId)}]`,
  );
  await expect(resetButton).toHaveCount(1);
  await expect(resetButton).toBeVisible();
  await expect(resetButton).toBeEnabled();
  const resetRequest = {
    evaluatedOperation: reset.mode as FractionOperationsEvaluatedOperation,
    kind: "controller",
    mode: reset.mode,
  } as const satisfies FractionOperationsDomainRequest;
  const resetPlannerReceipt = exactPlannerReceipt(
    firstPlannerReceipt.expected,
    resetRequest,
  );
  const expectedResetActionReceipt =
    createFractionOperationsAcceptedActionReceipt({
      before: firstPlannerReceipt.expected,
      expected: resetPlannerReceipt.expected,
      observed: resetPlannerReceipt.observed,
      projections: resetPlannerReceipt.projections,
      request: { kind: "reset" },
      requested: resetPlannerReceipt.requested,
    });
  const secondFence = await durability.armRealControl({
    expectedButtonClick: {
      controlKey: runtime.labId,
      eventTypes: ["pointerup", "click"],
    },
    ordinal: 2,
  });
  await resetButton.click();
  const second = await durability.finishSecondRealControl({
    fence: secondFence,
    root,
  });
  expect(second.expectedControl).toEqual({
    controlKey: runtime.labId,
    eventTypes: ["pointerup", "click"],
  });
  expect(second.controlEvents.map(({ controlKey, key, type }) => ({
    controlKey,
    key,
    type,
  }))).toEqual([
    { controlKey: runtime.labId, key: null, type: "pointerup" },
    { controlKey: runtime.labId, key: null, type: "click" },
  ]);
  const controlObserverStop = second.controlObserverStop;
  expect(controlObserverStop).toMatchObject({
    active: false,
    adapterId: first.adapterId,
    eventCount: 4,
    lastSequence: 4,
    removalCount: 1,
    removedExactlyOnce: true,
    removedListenerCount: 5,
  });
  expect(controlObserverStop.events).toEqual([
    ...first.controlEvents,
    ...second.controlEvents,
  ]);
  expect(controlObserverStop.removedEventTypes).toEqual([
    "change",
    "click",
    "input",
    "keyup",
    "pointerup",
  ]);
  expect(controlObserverStop.eventsSha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(Object.isFrozen(controlObserverStop)).toBe(true);
  expect(Object.isFrozen(controlObserverStop.events)).toBe(true);
  expect(controlObserverStop.events.every((event) => Object.isFrozen(event))).toBe(true);

  await assertResetState(root, runtime);
  expect(await currentController(root)).toEqual({
    evaluatedOperation: reset.mode,
    mode: reset.mode,
  });
  const resetDomain = await domainReceipt(root);
  assertSuccessfulDomainReceipt(resetDomain, resetPlannerReceipt);
  expect(resetDomain.observed).toEqual(resetState);
  expect(await productActionReceipt(root)).toEqual(expectedResetActionReceipt);

  return Object.freeze({
    controlObserverStop,
    first,
    second,
    sessionAcknowledgement,
  });
}

function starshipPathReceipt(testInfo: TestInfo) {
  const manifestPath = process.env.PLAYWRIGHT_PATH_MANIFEST_PATH;
  if (!manifestPath?.startsWith("/Volumes/Starship/")) {
    fail(`G04 path manifest escaped Starship: ${String(manifestPath)}.`);
  }
  const manifest = parseJson(readFileSync(manifestPath, "utf8"));
  if (
    !isRecord(manifest) ||
    manifest.schemaVersion !== 1 ||
    manifest.status !== "preflight-passed" ||
    !isRecord(manifest.contract) ||
    !isRecord(manifest.paths) ||
    !isRecord(manifest.process)
  ) {
    fail("G04 Starship path manifest is malformed.");
  }
  expect(manifest.contract).toMatchObject({
    mutablePathsOnlyOnStarship: true,
    starshipRoot: "/Volumes/Starship",
  });
  expect(manifest.process.cwd).toBe(process.cwd());
  expect(manifest.paths.repositoryRoot).toBe(canonicalCwd);

  const paths = {
    browserProfileEvidencePath:
      process.env.PLAYWRIGHT_BROWSER_PROFILE_EVIDENCE_PATH,
    browserProcessEvidencePath:
      process.env.PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH,
    browserTempDir: process.env.PLAYWRIGHT_BROWSER_TEMP_DIR,
    crashDumpDir: process.env.PLAYWRIGHT_CRASH_DUMP_DIR,
    databasePath: process.env.HK_MATH_DB_PATH,
    e2eRunRoot: process.env.PLAYWRIGHT_E2E_ROOT,
    nextDistDir: process.env.PLAYWRIGHT_NEXT_DIST_DIR,
    nextTsconfigPath: process.env.PLAYWRIGHT_NEXT_TSCONFIG_PATH,
    nodeCompileCacheDir: process.env.NODE_COMPILE_CACHE,
    npmCacheDir: process.env.npm_config_cache,
    outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR,
    pathManifestPath: manifestPath,
    reportDir: process.env.PLAYWRIGHT_REPORT_DIR,
    serverCommandOwnerPidPath:
      process.env.PLAYWRIGHT_SERVER_COMMAND_OWNER_PID_PATH,
    serverLogPath: process.env.PLAYWRIGHT_SERVER_LOG_PATH,
  } as const;
  for (const [label, value] of Object.entries(paths)) {
    if (typeof value !== "string" || !value.startsWith("/Volumes/Starship/")) {
      fail(`G04 ${label} escaped Starship: ${JSON.stringify(value)}.`);
    }
    expect(manifest.paths[label], `${label}: manifest/environment drift`).toBe(
      value,
    );
  }
  for (const environmentName of ["TEMP", "TMP", "TMPDIR"] as const) {
    const value = process.env[environmentName];
    if (!value?.startsWith("/Volumes/Starship/")) {
      fail(`G04 ${environmentName} escaped Starship: ${String(value)}.`);
    }
    expect(value).toBe(paths.browserTempDir);
  }
  expect(process.env.PLAYWRIGHT_STARSHIP_PRELAUNCH).toBe("1");
  expect(process.env.PLAYWRIGHT_BROWSER_CHANNEL).toBe("chrome");
  expect(testInfo.project.outputDir).toBe(paths.outputDir);
  expect(testInfo.outputDir.startsWith(`${paths.outputDir}/`)).toBe(true);
  for (const [label, value] of Object.entries(manifest.paths)) {
    if (typeof value !== "string" || !value.startsWith("/Volumes/Starship/")) {
      fail(`G04 Starship manifest path ${label} is invalid: ${String(value)}.`);
    }
  }
  return {
    manifestPath,
    paths,
    process: manifest.process,
    temporaryPaths: {
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      TMPDIR: process.env.TMPDIR,
    },
  };
}

function assertCanonicalRunner(testInfo: TestInfo) {
  expect(testInfo.retry, "G04 release evidence forbids retries").toBe(0);
  expect(testInfo.repeatEachIndex, "G04 release evidence forbids repeats").toBe(
    0,
  );
  expect(testInfo.config.shard, "G04 release evidence forbids sharding").toBeNull();
  const grep = Array.isArray(testInfo.config.grep)
    ? testInfo.config.grep
    : [testInfo.config.grep];
  expect(
    grep.every((pattern) => pattern.source === ".*" && pattern.flags === ""),
    "G04 release evidence forbids grep filtering",
  ).toBe(true);
  expect(
    testInfo.config.grepInvert,
    "G04 release evidence forbids grep-invert",
  ).toBeNull();
  expect(
    testInfo.config.projects.map((project) => project.name).sort(),
    "G04 release evidence requires the exact desktop/mobile project pair",
  ).toEqual([...supportedProjects].sort());
  expect(testInfo.config.maxFailures, "G04 release evidence forbids maxFailures").toBe(
    0,
  );
  expect(testInfo.config.workers, "G04 release evidence requires one worker").toBe(1);
  expect(testInfo.config.fullyParallel).toBe(false);
  for (const project of testInfo.config.projects) {
    expect(project.repeatEach, `${project.name}: repeatEach`).toBe(1);
    expect(project.retries, `${project.name}: retries`).toBe(0);
    expect(project.use.channel, `${project.name}: browser channel`).toBe("chrome");
  }
  const configFile = testInfo.config.configFile;
  if (!configFile) fail("G04 canonical runner exposed no config file.");
  expect(realpathSync.native(configFile)).toBe(
    `${canonicalCwd}/playwright.config.ts`,
  );
  expect(realpathSync.native(testInfo.config.rootDir)).toBe(
    `${canonicalCwd}/tests/e2e`,
  );
  expect(realpathSync.native(testInfo.file)).toBe(
    `${canonicalCwd}/tests/e2e/china-mainland-g04-fraction-operations-production.spec.ts`,
  );
  return starshipPathReceipt(testInfo);
}

const executedChunkIds: string[] = [];
const executedStateIds: string[] = [];
const executedRawReplayTopicIds: string[] = [];
const executedProjectNames = new Set<string>();
const expectedRawReplayCountAcrossReport = 5 as const;
const expectedRawReplayProjects = ["desktop-chrome"] as const;
if (exactLabIds.length !== expectedRawReplayCountAcrossReport) {
  fail("G04 report-wide raw replay quota must remain exactly five topics.");
}

test.describe("Mainland G04 fraction operations production route acceptance", () => {
  test.describe.configure({ mode: "serial", retries: 0 });

  test.afterAll(() => {
    expect(executedChunkIds, "G04 chunk ledger rejects grep/shard/partial runs").toEqual(
      expectedChunkIds,
    );
    expect(executedStateIds, "G04 state ledger rejects gaps/duplicates/out-of-order").toEqual(
      expectedStateIds,
    );
    expect(new Set(executedStateIds).size).toBe(expectedStateCountPerProject);
    const expectedRawTopics = executedProjectNames.has("desktop-chrome")
      ? [...exactLabIds]
      : [];
    expect(
      executedRawReplayTopicIds,
      "G04 raw replay ledger requires one desktop first-chunk representative per topic and zero mobile replays",
    ).toEqual(expectedRawTopics);
    expect(new Set(executedRawReplayTopicIds).size).toBe(
      executedRawReplayTopicIds.length,
    );
  });

  for (const [chunkIndex, chunk] of runtimeChunks.entries()) {
    const title = expectedTestTitles[chunkIndex]!;
    test(title, async ({ baseURL, page }, testInfo) => {
      test.setTimeout(45_000 + chunk.plans.length * 30_000);
      const pathReceipt = assertCanonicalRunner(testInfo);
      expect(supportedProjects).toContain(testInfo.project.name);
      const viewport = page.viewportSize();
      expect(viewport).not.toBeNull();
      if (!viewport) fail(`${testInfo.project.name}: Playwright exposed no viewport.`);
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
      const observedWrites: ObservedWrite[] = [];
      let stage: Stage = "mount";
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("requestfailed", (request) => {
        if (!isSameOriginApplicationUrl(request.url())) return;
        requestFailures.push(
          `${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText ?? "unknown failure"}`,
        );
      });
      page.on("response", (response) => {
        if (!isSameOriginApplicationUrl(response.url()) || response.status() < 500) return;
        serverErrors.push(
          `${response.request().method()} ${new URL(response.url()).pathname}: ${response.status()}`,
        );
      });
      page.on("request", (request) => {
        if (!isSameOriginApplicationUrl(request.url())) return;
        const method = request.method();
        if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
        observedWrites.push({
          body: requestBody(request),
          method,
          pathname: new URL(request.url()).pathname,
          stage,
        });
      });

      await installHkVisualizationEffectiveVisibilityInspector(page);
      const student = await registerMainlandStudent(page, testInfo, chunk);
      expect(await visualizationSessions(page)).toEqual([]);
      if (page.url() !== "about:blank") {
        fail(`${chunk.id}: registration navigated the bound page before durability arm.`);
      }
      if (typeof baseURL !== "string") {
        fail(`${chunk.id}: Playwright exposed no application baseURL.`);
      }
      const databasePath = pathReceipt.paths.databasePath;
      if (typeof databasePath !== "string") {
        fail(`${chunk.id}: Starship database path is absent.`);
      }
      const appOrigin = new URL(baseURL).origin;
      const lessonSlug = lessonSlugForTopicId(chunk.runtime.labId);
      const siblingTopicIds = exactLabIds.filter(
        (topicId) => topicId !== chunk.runtime.labId,
      );
      if (siblingTopicIds.length !== 4) {
        fail(`${chunk.id}: durability sibling set must contain the other four G04 labs.`);
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
      const activeRootSelector =
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
        rootSelector: activeRootSelector,
        controlSelector:
          "[data-viz-mode-button], [data-viz-parameter], [data-viz-reset-model]",
        readRuntimeDigest: async (activeRoot) => await runtimeSignature(activeRoot),
      });
      await durability.armBeforeNavigation({ learnerProfileSetup });
      const response =
        await page.goto(`/student/lessons/${encodeURIComponent(lessonSlug)}`, {
          waitUntil: "domcontentloaded",
        });
      expect(response).not.toBeNull();
      expect(response?.status()).toBeLessThan(400);
      expect(
        await page
          .locator("html")
          .evaluate((element) => element.classList.contains("dark")),
      ).toBe(student.theme === "dark");

      const visualizationSection = page.locator("section#visualization");
      await expect(visualizationSection).toHaveCount(1);
      await expect(visualizationSection).toBeVisible({ timeout: 30_000 });
      await expect(page.locator(activeRootSelector)).toHaveCount(1);
      const root = visualizationSection.locator(activeRootSelector);
      await expect(root).toHaveCount(1);
      await expect(root).toBeVisible({ timeout: 30_000 });
      await assertProductionIdentity(root, chunk.runtime);
      await assertResetState(root, chunk.runtime);

      const rawReplayRepresentative =
        testInfo.project.name === "desktop-chrome" && chunk.index === 0;
      const mountDurability = await durability.waitForMountTerminal({
        deadlineMs: 30_000,
        includeRaw: rawReplayRepresentative,
        root,
      });
      expect(await visualizationSessions(page)).toEqual([]);
      expect(mountWriteViolations(observedWrites)).toEqual([]);

      const receipts: StateReceipt[] = [];
      const plannedStateDescriptors: PlannedStateDescriptor[] = [];
      const firstPlan = chunk.plans[0];
      let capturedInitial:
        | Readonly<{
            descriptor: PlannedStateDescriptor;
            receipt: StateReceipt;
          }>
        | null = null;
      if (firstPlan?.kind === "initial") {
        const stateId = `${chunk.runtime.labId}:${firstPlan.id}`;
        const executed = await executePlan(
          root,
          chunk.runtime,
          firstPlan,
          0,
          undefined,
          resetDomainState(chunk.runtime),
        );
        const receipt = await auditSettledState(
          root,
          chunk.runtime,
          stateId,
          executed.action,
        );
        expect(receipt.action.observedControls).toEqual(receipt.controls);
        expect(receipt.domain.observed).toEqual(executed.oracleState);
        capturedInitial = Object.freeze({
          descriptor: bindPlannedDescriptorToReceipt(
            plannedStateDescriptor(chunk.runtime, firstPlan),
            receipt,
            chunk.runtime,
            firstPlan,
          ),
          receipt,
        });
      }
      expect(capturedInitial === null).toBe(firstPlan?.kind !== "initial");

      const exactDurabilityProbe = await runExactDurabilityProbe({
        durability,
        includeRaw: rawReplayRepresentative,
        page,
        root,
        runtime: chunk.runtime,
        setStage: (next) => {
          stage = next;
        },
        userId: student.userId,
      });
      await assertResetState(root, chunk.runtime);

      let priorPlan: StatePlan | undefined;
      let oracleState = resetDomainState(chunk.runtime);
      for (const [planIndex, plan] of chunk.plans.entries()) {
        const stateId = `${chunk.runtime.labId}:${plan.id}`;
        let receipt: StateReceipt;
        let descriptor: PlannedStateDescriptor;
        if (planIndex === 0 && plan.kind === "initial") {
          if (capturedInitial === null) {
            fail(`${chunk.id}: canonical initial receipt was not captured before the probe.`);
          }
          receipt = capturedInitial.receipt;
          descriptor = capturedInitial.descriptor;
          oracleState = receipt.domain.observed;
        } else {
          const executed = await executePlan(
            root,
            chunk.runtime,
            plan,
            planIndex,
            priorPlan,
            oracleState,
          );
          oracleState = executed.oracleState;
          receipt = await auditSettledState(
            root,
            chunk.runtime,
            stateId,
            executed.action,
          );
          expect(receipt.action.observedControls).toEqual(receipt.controls);
          expect(receipt.domain.observed).toEqual(oracleState);
          descriptor = bindPlannedDescriptorToReceipt(
            plannedStateDescriptor(chunk.runtime, plan),
            receipt,
            chunk.runtime,
            plan,
          );
        }
        receipts.push(receipt);
        plannedStateDescriptors.push(descriptor);
        priorPlan = plan;
      }

      const actualStateIds = receipts.map((receipt) => receipt.stateId);
      const plannedStateIds = chunk.plans.map(
        (plan) => `${chunk.runtime.labId}:${plan.id}`,
      );
      expect(actualStateIds).toEqual(plannedStateIds);
      expect(new Set(actualStateIds).size).toBe(plannedStateIds.length);
      expect(plannedStateDescriptors.map(({ stateId }) => stateId)).toEqual(
        actualStateIds,
      );
      if (chunk.index === chunk.total - 1) {
        expect(actualStateIds.at(-1)).toBe(`${chunk.runtime.labId}:reset`);
        expect(receipts.at(-1)?.mode).toBe(
          FRACTION_OPERATIONS_RESET_INPUTS[chunk.runtime.labId].mode,
        );
      }

      const sessionWrites = observedWrites.filter(
        (write) => write.pathname === "/api/visualization-sessions",
      );
      expect(sessionWrites).toHaveLength(1);
      expect(sessionWrites[0]).toMatchObject({
        body: {
          moduleId: configuredModuleId,
          source: chunk.runtime.lab.analyticsSource,
          topicId: chunk.runtime.labId,
        },
        method: "POST",
      });
      expect(
        observedWrites.filter(
          (write) =>
            isApiFamilyPath(write.pathname, "/api/gamification") ||
            isApiFamilyPath(write.pathname, "/api/rewards") ||
            isApiFamilyPath(write.pathname, "/api/teacher/gamification") ||
            isApiFamilyPath(write.pathname, "/api/teacher/rewards") ||
            isApiFamilyPath(write.pathname, "/api/teacher/reward-awards"),
        ),
      ).toEqual([]);
      for (const write of observedWrites.filter(
        (entry) => entry.pathname === "/api/learning-events",
      )) {
        for (const event of visualizationLearningEvents(write.body)) {
          expect(event).toMatchObject({ topicId: chunk.runtime.labId });
        }
      }
      if (rawReplayRepresentative) {
        await durability.replayFirstDeliveryExactly({
          first: exactDurabilityProbe.first,
        });
        executedRawReplayTopicIds.push(chunk.runtime.labId);
      }
      const finalSessions = await visualizationSessions(page);
      expect(finalSessions).toEqual([
        expect.objectContaining({
          explored: true,
          moduleId: configuredModuleId,
          source: chunk.runtime.lab.analyticsSource,
          topicId: chunk.runtime.labId,
          updatedAt: expect.any(String),
        }),
      ]);
      expect(await visualizationSessions(page)).toEqual(finalSessions);
      const durabilityReceipt: VisualizationLessonDurabilityFinalReceipt =
        await durability.finalReceipt();
      expect(durabilityReceipt.coverage).toBe(
        rawReplayRepresentative ? "full-raw-replay" : "browser",
      );
      expect(durabilityReceipt.directReplayCount).toBe(
        rawReplayRepresentative ? 1 : 0,
      );
      expect(durabilityReceipt.controlObserverStop).toBe(
        exactDurabilityProbe.controlObserverStop,
      );
      expect(durabilityReceipt.controlObserverStop).toBe(
        exactDurabilityProbe.second.controlObserverStop,
      );
      expect(durabilityReceipt.expectedControl).toEqual({
        first: exactDurabilityProbe.first.expectedControl,
        second: exactDurabilityProbe.second.expectedControl,
      });
      expect(durabilityReceipt.controlEvents).toEqual({
        first: exactDurabilityProbe.first.controlEvents,
        second: exactDurabilityProbe.second.controlEvents,
      });

      await testInfo.attach(
        `china-mainland-g04-${chunk.runtime.labId}-${String(chunk.index + 1).padStart(2, "0")}-${testInfo.project.name}.json`,
        {
          body: Buffer.from(
            JSON.stringify(
              {
                canonicalExecutionCount: expectedCanonicalExecutionCount,
                chunkId: chunk.id,
                collisionScannerSha256,
                contrastScannerSha256,
                durabilityReceipts: {
                  controlEvidence: {
                    first: {
                      controlEvents: exactDurabilityProbe.first.controlEvents,
                      expectedControl: exactDurabilityProbe.first.expectedControl,
                    },
                    second: {
                      controlEvents: exactDurabilityProbe.second.controlEvents,
                      controlObserverStop: exactDurabilityProbe.second.controlObserverStop,
                      expectedControl: exactDurabilityProbe.second.expectedControl,
                    },
                    final: {
                      controlEvents: durabilityReceipt.controlEvents,
                      controlObserverStop: durabilityReceipt.controlObserverStop,
                      expectedControl: durabilityReceipt.expectedControl,
                    },
                  },
                  final: durabilityReceipt,
                  firstSessionAcknowledgement:
                    exactDurabilityProbe.sessionAcknowledgement,
                  mount: mountDurability,
                  rawReplayLedger: {
                    expectedCountAcrossReport: expectedRawReplayCountAcrossReport,
                    expectedProjects: expectedRawReplayProjects,
                    expectedTopicIds: exactLabIds,
                    included: rawReplayRepresentative,
                    representativeRule:
                      "desktop-chrome:first-canonical-chunk-per-g04-topic",
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
                observedStateDescriptorPlanSha256,
                observedStatePlanSha256,
                observedTopicModeControlTableSha256,
                pathReceipt,
                plannedStateDescriptors,
                plannedStateIds,
                project: testInfo.project.name,
                receipts,
                schemaVersion:
                  "china-mainland-g04-fraction-operations-production.v4",
                sessionWrites,
                sourcePlannerCanaries,
                canonicalCliReceipt,
                testTitle: title,
                theme: student.theme,
                userId: student.userId,
                viewport,
              },
              null,
              2,
            ),
          ),
          contentType: "application/json",
        },
      );

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
