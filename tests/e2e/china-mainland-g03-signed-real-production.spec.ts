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
  MAINLAND_SIGNED_REAL_NUMBER_LINE_LAB_IDS,
} from "../../components/visualizations/mainland/SignedRealNumberLineLab";
import {
  SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT,
  SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES,
  SIGNED_REAL_NUMBER_LINE_TOPIC_RESET_INPUTS,
  buildSignedRealNumberLineModel,
  type ExactRationalInput,
  type ExactRealInput,
  type QuadraticSurdInput,
  type SignedRealNumberLineExactMode,
  type SignedRealNumberLineInput,
  type SignedRealNumberLineLabId,
  type SignedRealNumberLineModel,
} from "../../components/visualizations/mainland/SignedRealNumberLineModel";
import {
  createSignedRealNumberLineAcceptedActionReceipt,
  createSignedRealNumberLineControlState,
  getSignedRealNumberLineControlDomainDescriptor,
  planSignedRealNumberLineControlTransition,
  SIGNED_REAL_NUMBER_LINE_ACTION_RECEIPT_CONTRACT,
  SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_CONTRACT,
  SignedRealNumberLineControlDomainError,
  type SignedRealNumberLineActionReceipt,
  type SignedRealNumberLineActionRequest,
  type SignedRealNumberLineActionSnapshot,
  type SignedRealNumberLineControlDomainErrorCode,
  type SignedRealNumberLineControlProjection,
  type SignedRealNumberLineControlRequest,
  type SignedRealNumberLineControlState,
} from "../../components/visualizations/mainland/SignedRealNumberLineControlDomain";
import {
  SIGNED_REAL_NUMBER_LINE_GEOMETRY_CONTRACT,
  buildSignedRealNumberLineGeometry,
} from "../../components/visualizations/mainland/SignedRealNumberLineGeometry";
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
  type VisualizationLessonExpectedButtonClick,
  type VisualizationLessonDurabilityFinalReceipt,
} from "./visualization-lesson-session-durability-browser";

const configuredModuleId = "configured-visualization-lab" as const;
const supportedProjects = ["desktop-chrome", "mobile-chrome"] as const;
const endpointNames = ["min", "mid", "max"] as const;
const maximumStatesPerChunk = 32;
const collisionScannerSha256 =
  "b775c93f615522da021cf813a42304bee27d5ba437b0e06247ccd4f5049f5824";
const contrastScannerSha256 =
  "81cd3d4a612ae5934586be0cd0fa5a3e6987c96c3d6c89af32f76b8ef697913e";
const scannerSixCaseTestSha256 =
  "0e6c42d5750c9b127fa583625be7c49757370cd239155fac9c0766c05ac1f7e7";
const scannerSourceAggregateSha256 =
  "6ff36e516d1d2da6ff04c4be632942c4f52cf63929b83013b56a35e7255e2502";
const scannerSourceAggregateSerialization =
  "ordered-repo-relative-path-utf8-nul-raw-file-bytes-no-final-separator" as const;
const expectedDurabilityBrowserHelperSha256 =
  "f27ae08a91ec2f5daa97ed905342f99d7abf9693c4d82532a3b1f6d8fc93bccb";
const expectedDurabilityBrowserHelperTestSha256 =
  "86ac16b4cc4b23a4cd99196fb49a6cd6a632a47aa3cd3003c0d9ff5a26020d76";
const durabilityBrowserPairAggregateSha256 =
  "e94c63f04a68a67f014181bbbbf098e6222b7a9bd31981752ad470c55d85fff3";
const durabilityFourFileAggregateSha256 =
  "d7d9a07f10b5d9e7726fd0fb8e30549ae6d73f1ec92fcd1c06ceab8f743404ba";
const durabilitySourceAggregateSerialization =
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

const exactLabIds = [
  "bnu-junior-s1-upper-rational-numbers",
  "bnu-junior-s2-upper-real-numbers",
  "hjb-junior-s2-upper-quadratic-radicals",
  "hjb-junior-s2-upper-real-numbers",
  "hjb-primary-p6-lower-rational-numbers",
  "pep-junior-s1-upper-rational-numbers",
] as const satisfies readonly SignedRealNumberLineLabId[];

const pinnedRationalModes = [
  "locate",
  "compare",
  "add",
  "subtract",
  "multiply",
  "divide",
  "opposite",
  "absolute-value",
] as const satisfies readonly SignedRealNumberLineExactMode[];
const pinnedRealModes = [
  "locate",
  "compare",
  "absolute-value",
  "radical",
  "classify",
  "square-root",
  "cube-root",
  "estimate",
] as const satisfies readonly SignedRealNumberLineExactMode[];
const pinnedQuadraticRadicalModes = [
  "simplify",
  "radical-add",
  "radical-subtract",
  "radical-multiply",
  "radical-divide",
  "estimate-check",
] as const satisfies readonly SignedRealNumberLineExactMode[];

const pinnedTopicManifest = {
  "bnu-junior-s1-upper-rational-numbers": {
    kind: "rational",
    modes: pinnedRationalModes,
    publisher: "MAINLAND_BNU",
    reset: {
      labId: "bnu-junior-s1-upper-rational-numbers",
      mode: "locate",
      precision: 2,
      value: { denominator: 2, kind: "rational", numerator: -3 },
    },
    track: "MAINLAND_BNU",
  },
  "bnu-junior-s2-upper-real-numbers": {
    kind: "real",
    modes: pinnedRealModes,
    publisher: "MAINLAND_BNU",
    reset: {
      labId: "bnu-junior-s2-upper-real-numbers",
      mode: "radical",
      precision: 3,
      value: { index: 2, kind: "radical", radicand: 2, sign: 1 },
    },
    track: "MAINLAND_BNU",
  },
  "hjb-junior-s2-upper-quadratic-radicals": {
    kind: "quadratic-radical",
    modes: pinnedQuadraticRadicalModes,
    publisher: "MAINLAND_HJB",
    reset: {
      labId: "hjb-junior-s2-upper-quadratic-radicals",
      mode: "simplify",
      precision: 3,
      value: {
        coefficient: { denominator: 1, kind: "rational", numerator: 1 },
        kind: "quadratic-surd",
        radicand: 12,
      },
    },
    track: "MAINLAND_HJB",
  },
  "hjb-junior-s2-upper-real-numbers": {
    kind: "real",
    modes: pinnedRealModes,
    publisher: "MAINLAND_HJB",
    reset: {
      labId: "hjb-junior-s2-upper-real-numbers",
      mode: "radical",
      precision: 3,
      value: { index: 2, kind: "radical", radicand: 2, sign: 1 },
    },
    track: "MAINLAND_HJB",
  },
  "hjb-primary-p6-lower-rational-numbers": {
    kind: "rational",
    modes: pinnedRationalModes,
    publisher: "MAINLAND_HJB",
    reset: {
      labId: "hjb-primary-p6-lower-rational-numbers",
      mode: "locate",
      precision: 2,
      value: { denominator: 2, kind: "rational", numerator: -3 },
    },
    track: "MAINLAND_HJB",
  },
  "pep-junior-s1-upper-rational-numbers": {
    kind: "rational",
    modes: pinnedRationalModes,
    publisher: "MAINLAND_PEP",
    reset: {
      labId: "pep-junior-s1-upper-rational-numbers",
      mode: "locate",
      precision: 2,
      value: { denominator: 2, kind: "rational", numerator: -3 },
    },
    track: "MAINLAND_PEP_JUNIOR",
  },
} as const;

type EndpointName = (typeof endpointNames)[number];
type Publisher = "MAINLAND_BNU" | "MAINLAND_HJB" | "MAINLAND_PEP";
type Track =
  | "MAINLAND_BNU"
  | "MAINLAND_HJB"
  | "MAINLAND_PEP_JUNIOR";
type Stage = "audit" | "interaction" | "mount";
type Preparation = Readonly<Record<string, string>>;

type RuntimeCase = Readonly<{
  kind: "quadratic-radical" | "rational" | "real";
  lab: FeaturedLabDefinition;
  labId: SignedRealNumberLineLabId;
  modes: readonly SignedRealNumberLineExactMode[];
  publisher: Publisher;
  track: Track;
}>;

type StatePlan =
  | Readonly<{ id: "initial"; kind: "initial"; atomicGroup?: string }>
  | Readonly<{
      id: string;
      kind: "mode";
      mode: SignedRealNumberLineExactMode;
      atomicGroup?: string;
    }>
  | Readonly<{
      endpoint: EndpointName;
      id: string;
      kind: "range";
      mode: SignedRealNumberLineExactMode;
      parameter: string;
      prepare?: Preparation;
      atomicGroup?: string;
    }>
  | Readonly<{
      id: string;
      kind: "select";
      mode: SignedRealNumberLineExactMode;
      parameter: string;
      prepare?: Preparation;
      value: string;
      atomicGroup?: string;
    }>
  | Readonly<{
      id: string;
      kind: "special";
      scenario:
        | "irrational-certified"
        | "rational-divisor"
        | "radical-divisor"
        | "sqrt4-rational2"
        | "zero-sign";
      step: string;
      atomicGroup: string;
    }>
  | Readonly<{ id: "reset"; kind: "reset"; atomicGroup?: string }>;

type RuntimeChunk = Readonly<{
  id: string;
  index: number;
  plans: readonly StatePlan[];
  runtime: RuntimeCase;
  total: number;
}>;

type ControlSnapshot = Readonly<{
  disabled: boolean;
  kind: "range" | "select";
  max: number | null;
  min: number | null;
  options: readonly string[];
  parameter: string;
  step: number | null;
  value: string;
}>;

type ControlSignature = Readonly<{
  actionReceipt: string;
  controls: readonly ControlSnapshot[];
  domainId: string;
  geometryOwners: readonly Readonly<{
    exactKey: string;
    ownerId: string;
    renderMarker: boolean;
    semanticId: string;
  }>[];
  geometryState: string;
  invariantStates: readonly string[];
  mode: SignedRealNumberLineExactMode;
  semanticState: string;
  state: string;
}>;

type ActionEvidence = Readonly<{
  beforeSignature: ControlSignature;
  expectedSignature: ControlSignature;
  observedSignature: ControlSignature;
  plannedRequest: SignedRealNumberLineActionRequest;
  projections: readonly SignedRealNumberLineControlProjection[];
  receipt: SignedRealNumberLineActionReceipt;
}>;

type ExecutedAction = Readonly<{
  beforeSignature: ControlSignature;
  plannedRequest: SignedRealNumberLineActionRequest;
  targetParameter: string | null;
}>;

type PlannedStateDescriptor = Readonly<{
  labId: SignedRealNumberLineLabId;
  plan: Readonly<{
    controlParameter: string | null;
    kind: SignedRealNumberLineActionRequest["kind"];
    mode: SignedRealNumberLineExactMode;
    request: SignedRealNumberLineActionRequest;
  }>;
  stateId: string;
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
    topicId: SignedRealNumberLineLabId;
    updatedAt: string;
  }>;
}>;

function fail(message: string): never {
  throw new TypeError(message);
}

function exactSorted(values: readonly string[]) {
  return [...values].sort();
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
    .join(",")}}`;
}

function sourceFileSha256(relativePath: string) {
  return createHash("sha256")
    .update(readFileSync(`${__dirname}/${relativePath}`))
    .digest("hex");
}

const integrationSourceSha256 = Object.freeze({
  collisionScanner: sourceFileSha256("hk-visualization-collision-scanner.ts"),
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
const producerSourceSha256 = createHash("sha256")
  .update(readFileSync(__filename))
  .digest("hex");
const expectedIntegrationSourceSha256 = Object.freeze({
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
});
if (stableJson(integrationSourceSha256) !== stableJson(expectedIntegrationSourceSha256)) {
  fail(
    `G03 approved integration source SHA drifted; expected=${JSON.stringify(expectedIntegrationSourceSha256)} actual=${JSON.stringify(integrationSourceSha256)}.`,
  );
}

const durabilityAggregateEntries = [
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
    .update(entries.map(([sha256, repoPath]) => `${sha256}  ${repoPath}\n`).join(""))
    .digest("hex");
}
const observedDurabilityBrowserPairAggregateSha256 = shasumStdoutAggregate(
  durabilityAggregateEntries.slice(0, 2),
);
const observedDurabilityFourFileAggregateSha256 = shasumStdoutAggregate(
  durabilityAggregateEntries,
);
if (
  observedDurabilityBrowserPairAggregateSha256 !==
    durabilityBrowserPairAggregateSha256 ||
  observedDurabilityFourFileAggregateSha256 !==
    durabilityFourFileAggregateSha256
) {
  fail(
    `G03 approved durability source aggregate drifted; browserExpected=${durabilityBrowserPairAggregateSha256} browserActual=${observedDurabilityBrowserPairAggregateSha256} fourExpected=${durabilityFourFileAggregateSha256} fourActual=${observedDurabilityFourFileAggregateSha256}.`,
  );
}

const scannerAggregateEntries = [
  {
    relativePath: "hk-visualization-collision-scanner.ts",
    repoPath: "tests/e2e/hk-visualization-collision-scanner.ts",
  },
  {
    relativePath: "hk-visualization-text-contrast-scanner.ts",
    repoPath: "tests/e2e/hk-visualization-text-contrast-scanner.ts",
  },
  {
    relativePath: "hk-visualization-scanner-six-case-contract.test.mjs",
    repoPath: "tests/e2e/hk-visualization-scanner-six-case-contract.test.mjs",
  },
] as const;
const observedScannerSourceAggregateSha256 = (() => {
  const aggregate = createHash("sha256");
  for (const { relativePath, repoPath } of scannerAggregateEntries) {
    aggregate.update(repoPath, "utf8");
    aggregate.update(Buffer.from([0]));
    aggregate.update(readFileSync(`${__dirname}/${relativePath}`));
  }
  return aggregate.digest("hex");
})();
if (observedScannerSourceAggregateSha256 !== scannerSourceAggregateSha256) {
  fail(
    `G03 approved scanner source aggregate drifted; expected=${scannerSourceAggregateSha256} actual=${observedScannerSourceAggregateSha256}.`,
  );
}

function assertExactSet(
  label: string,
  actual: readonly string[],
  expected: readonly string[],
) {
  if (JSON.stringify(exactSorted(actual)) !== JSON.stringify(exactSorted(expected))) {
    fail(`${label} drifted; expected=${JSON.stringify(exactSorted(expected))} actual=${JSON.stringify(exactSorted(actual))}.`);
  }
}

assertExactSet(
  "G03 Mainland production registry",
  MAINLAND_SIGNED_REAL_NUMBER_LINE_LAB_IDS,
  exactLabIds,
);

function runtimeCase(
  labId: SignedRealNumberLineLabId,
  publisher: Publisher,
  track: Track,
): RuntimeCase {
  const pinned = pinnedTopicManifest[labId];
  if (pinned.publisher !== publisher || pinned.track !== track) {
    fail(`${labId}: source runtime arguments drifted from the pinned manifest.`);
  }
  if (
    stableJson(SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES[labId]) !==
    stableJson({ kind: pinned.kind, allowedModes: pinned.modes })
  ) {
    fail(`${labId}: production topic profile drifted from the pinned manifest.`);
  }
  if (
    stableJson(SIGNED_REAL_NUMBER_LINE_TOPIC_RESET_INPUTS[labId]) !==
    stableJson(pinned.reset)
  ) {
    fail(`${labId}: production reset drifted from the pinned oracle.`);
  }
  const lab = getVisualizationLabByLabId(labId);
  if (!lab) fail(`${labId}: catalog row is missing.`);
  if (
    lab.labId !== labId ||
    lab.topicId !== labId ||
    lab.moduleId !== configuredModuleId ||
    lab.publisher !== publisher ||
    lab.curriculumTrack !== track ||
    lab.templateId !== "number-line"
  ) {
    fail(`${labId}: catalog identity drifted.`);
  }
  return {
    kind: pinned.kind,
    lab,
    labId,
    modes: pinned.modes,
    publisher,
    track,
  };
}

const runtimeCases = [
  runtimeCase("bnu-junior-s1-upper-rational-numbers", "MAINLAND_BNU", "MAINLAND_BNU"),
  runtimeCase("bnu-junior-s2-upper-real-numbers", "MAINLAND_BNU", "MAINLAND_BNU"),
  runtimeCase("hjb-junior-s2-upper-quadratic-radicals", "MAINLAND_HJB", "MAINLAND_HJB"),
  runtimeCase("hjb-junior-s2-upper-real-numbers", "MAINLAND_HJB", "MAINLAND_HJB"),
  runtimeCase("hjb-primary-p6-lower-rational-numbers", "MAINLAND_HJB", "MAINLAND_HJB"),
  runtimeCase("pep-junior-s1-upper-rational-numbers", "MAINLAND_PEP", "MAINLAND_PEP_JUNIOR"),
] as const;

type ExactDurabilityProbeContract = Readonly<{
  first: Readonly<{
    action: "click";
    expectedButtonClick: VisualizationLessonExpectedButtonClick;
    ordinal: 1;
  }>;
  second: Readonly<{
    action: "click";
    expectedButtonClick: VisualizationLessonExpectedButtonClick;
    ordinal: 2;
  }>;
}>;

function assertExactOwnKeys(
  label: string,
  value: unknown,
  expectedKeys: readonly string[],
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) fail(`${label}: value is not a record.`);
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

function assertExactExpectedButtonClick(
  label: string,
  value: unknown,
  expectedControlKey: string,
): asserts value is VisualizationLessonExpectedButtonClick {
  assertExactOwnKeys(label, value, ["controlKey", "eventTypes"]);
  if (value.controlKey !== expectedControlKey) {
    fail(
      `${label}: control key drifted; expected=${expectedControlKey} actual=${String(value.controlKey)}.`,
    );
  }
  if (!Array.isArray(value.eventTypes)) {
    fail(`${label}: eventTypes is not the exact button event tuple.`);
  }
  const eventKeys = Reflect.ownKeys(value.eventTypes);
  if (
    JSON.stringify(eventKeys) !== JSON.stringify(["0", "1", "length"]) ||
    value.eventTypes[0] !== "pointerup" ||
    value.eventTypes[1] !== "click"
  ) {
    fail(
      `${label}: eventTypes must be the exact ordered tuple [pointerup, click].`,
    );
  }
}

function exactExpectedButtonClick(
  controlKey: string,
): VisualizationLessonExpectedButtonClick {
  const expectedButtonClick = {
    controlKey,
    eventTypes: ["pointerup", "click"] as const,
  };
  assertExactExpectedButtonClick(
    "G03 exact expected button click",
    expectedButtonClick,
    controlKey,
  );
  return expectedButtonClick;
}

function assertExactDurabilityProbeContract(
  value: unknown,
  runtime: RuntimeCase,
  probeMode: SignedRealNumberLineExactMode,
): asserts value is ExactDurabilityProbeContract {
  assertExactOwnKeys("G03 exact durability probe", value, ["first", "second"]);
  for (const [key, ordinal, controlKey] of [
    ["first", 1, probeMode],
    ["second", 2, runtime.labId],
  ] as const) {
    const step = value[key];
    assertExactOwnKeys(`G03 exact durability probe ${key}`, step, [
      "action",
      "expectedButtonClick",
      "ordinal",
    ]);
    if (step.action !== "click" || step.ordinal !== ordinal) {
      fail(
        `G03 exact durability probe ${key}: expected one click at ordinal ${ordinal}.`,
      );
    }
    assertExactExpectedButtonClick(
      `G03 exact durability probe ${key} expectedButtonClick`,
      step.expectedButtonClick,
      controlKey,
    );
  }
}

function exactDurabilityProbeContract(
  runtime: RuntimeCase,
  probeMode: SignedRealNumberLineExactMode,
): ExactDurabilityProbeContract {
  const contract = {
    first: {
      action: "click",
      expectedButtonClick: exactExpectedButtonClick(probeMode),
      ordinal: 1,
    },
    second: {
      action: "click",
      expectedButtonClick: exactExpectedButtonClick(runtime.labId),
      ordinal: 2,
    },
  } as const;
  assertExactDurabilityProbeContract(contract, runtime, probeMode);
  return contract;
}

function assertExactDurabilityProbeContractCanaries() {
  const runtime = runtimeCases[0];
  const resetMode = pinnedTopicManifest[runtime.labId].reset.mode;
  const probeMode = runtime.modes.find((mode) => mode !== resetMode);
  if (!probeMode) fail("G03 exact durability probe canary has no non-reset mode.");
  const canonical = exactDurabilityProbeContract(runtime, probeMode);
  const mustReject = (
    label: string,
    mutate: (candidate: Record<string, unknown>) => void,
  ) => {
    const candidate = JSON.parse(JSON.stringify(canonical)) as Record<
      string,
      unknown
    >;
    mutate(candidate);
    try {
      assertExactDurabilityProbeContract(candidate, runtime, probeMode);
    } catch {
      return;
    }
    fail(`G03 exact durability probe mutation accepted ${label}.`);
  };
  mustReject("reversed ordinal order", (candidate) => {
    [candidate.first, candidate.second] = [candidate.second, candidate.first];
  });
  mustReject("wrong first control key", (candidate) => {
    ((candidate.first as Record<string, unknown>).expectedButtonClick as Record<
      string,
      unknown
    >).controlKey = runtime.labId;
  });
  mustReject("missing expectedButtonClick", (candidate) => {
    delete (candidate.first as Record<string, unknown>).expectedButtonClick;
  });
  mustReject("extra click declaration", (candidate) => {
    (candidate.first as Record<string, unknown>).extraAction = "click";
  });
  mustReject("press substitution", (candidate) => {
    (candidate.first as Record<string, unknown>).action = "press";
  });
  mustReject("preparation declaration", (candidate) => {
    (candidate.second as Record<string, unknown>).preparation = "reset";
  });
  mustReject("event tuple order", (candidate) => {
    ((candidate.first as Record<string, unknown>).expectedButtonClick as Record<
      string,
      unknown
    >).eventTypes = ["click", "pointerup"];
  });
}

assertExactDurabilityProbeContractCanaries();

function addRangePlans(
  plans: StatePlan[],
  mode: SignedRealNumberLineExactMode,
  parameters: readonly string[],
  prepare?: Preparation,
) {
  for (const parameter of parameters) {
    for (const endpoint of endpointNames) {
      const preparationId = prepare
        ? `:${Object.entries(prepare).map(([key, value]) => `${key}=${value}`).join("+")}`
        : "";
      plans.push({
        endpoint,
        id: `range:${mode}:${parameter}:${endpoint}${preparationId}`,
        kind: "range",
        mode,
        parameter,
        prepare,
      });
    }
  }
}

function addSelectPlans(
  plans: StatePlan[],
  mode: SignedRealNumberLineExactMode,
  parameter: string,
  values: readonly string[],
  prepare?: Preparation,
) {
  for (const value of values) {
    plans.push({
      id: `select:${mode}:${parameter}:${value}`,
      kind: "select",
      mode,
      parameter,
      prepare,
      value,
    });
  }
}

const rationalValueParameters = ["value-numerator", "value-denominator"] as const;
const rationalLeftParameters = ["left-numerator", "left-denominator"] as const;
const rationalRightParameters = ["right-numerator", "right-denominator"] as const;
const radicalValueParameters = ["value-radicand", "value-index"] as const;
const radicalLeftParameters = ["left-radicand", "left-index"] as const;
const radicalRightParameters = ["right-radicand", "right-index"] as const;
const surdValueParameters = [
  "value-coefficient-numerator",
  "value-coefficient-denominator",
  "value-radicand",
] as const;
const surdLeftParameters = [
  "left-coefficient-numerator",
  "left-coefficient-denominator",
  "left-radicand",
] as const;
const surdRightParameters = [
  "right-coefficient-numerator",
  "right-coefficient-denominator",
  "right-radicand",
] as const;

function rationalModePlans(
  plans: StatePlan[],
  mode: SignedRealNumberLineExactMode,
) {
  if (mode === "locate" || mode === "opposite" || mode === "absolute-value") {
    addRangePlans(plans, mode, rationalValueParameters);
  } else if (mode === "compare" || mode === "multiply" || mode === "divide") {
    addRangePlans(plans, mode, [...rationalLeftParameters, ...rationalRightParameters]);
  } else if (mode === "add" || mode === "subtract") {
    addRangePlans(plans, mode, [
      "start-numerator",
      "start-denominator",
      "step-numerator",
      "step-denominator",
    ]);
  } else {
    fail(`Unexpected rational topic mode ${mode}.`);
  }
  addRangePlans(plans, mode, ["precision"]);
}

function realModePlans(
  plans: StatePlan[],
  mode: SignedRealNumberLineExactMode,
) {
  if (
    mode === "locate" ||
    mode === "absolute-value" ||
    mode === "classify" ||
    mode === "estimate"
  ) {
    addSelectPlans(plans, mode, "value-kind", ["rational", "radical"]);
    addRangePlans(plans, mode, rationalValueParameters, { "value-kind": "rational" });
    addSelectPlans(plans, mode, "value-sign", ["-1", "1"], { "value-kind": "radical" });
    addRangePlans(plans, mode, radicalValueParameters, { "value-kind": "radical" });
  } else if (mode === "compare") {
    addSelectPlans(plans, mode, "left-kind", ["rational", "radical"]);
    addSelectPlans(plans, mode, "right-kind", ["rational", "radical"]);
    addRangePlans(plans, mode, rationalLeftParameters, { "left-kind": "rational" });
    addSelectPlans(plans, mode, "left-sign", ["-1", "1"], { "left-kind": "radical" });
    addRangePlans(plans, mode, radicalLeftParameters, { "left-kind": "radical" });
    addRangePlans(plans, mode, rationalRightParameters, { "right-kind": "rational" });
    addSelectPlans(plans, mode, "right-sign", ["-1", "1"], { "right-kind": "radical" });
    addRangePlans(plans, mode, radicalRightParameters, { "right-kind": "radical" });
  } else if (mode === "radical") {
    addSelectPlans(plans, mode, "value-sign", ["-1", "1"]);
    addRangePlans(plans, mode, radicalValueParameters);
  } else if (mode === "square-root") {
    addRangePlans(plans, mode, ["value-radicand"]);
  } else if (mode === "cube-root") {
    addSelectPlans(plans, mode, "value-sign", ["-1", "1"]);
    addRangePlans(plans, mode, ["value-radicand"]);
  } else {
    fail(`Unexpected real topic mode ${mode}.`);
  }
  addRangePlans(plans, mode, ["precision"]);
}

function quadraticRadicalModePlans(
  plans: StatePlan[],
  mode: SignedRealNumberLineExactMode,
) {
  if (mode === "simplify" || mode === "estimate-check") {
    addRangePlans(plans, mode, surdValueParameters);
  } else if (
    mode === "radical-add" ||
    mode === "radical-subtract" ||
    mode === "radical-multiply" ||
    mode === "radical-divide"
  ) {
    addRangePlans(plans, mode, [...surdLeftParameters, ...surdRightParameters]);
  } else {
    fail(`Unexpected quadratic-radical topic mode ${mode}.`);
  }
  addRangePlans(plans, mode, ["precision"]);
}

function specialPlans(runtime: RuntimeCase): StatePlan[] {
  const kind = runtime.kind;
  if (kind === "rational") {
    const atomicGroup = `${runtime.labId}:rational-divisor`;
    return [
      "zero-outside-divide",
      "project-enter-divide",
      "reject-direct-zero",
      "leave-divide",
      "reenter-no-resurrection",
    ].map((step) => ({
      atomicGroup,
      id: `special:rational-divisor:${step}`,
      kind: "special" as const,
      scenario: "rational-divisor" as const,
      step,
    }));
  }
  if (kind === "quadratic-radical") {
    const atomicGroup = `${runtime.labId}:radical-divisor`;
    return [
      "zero-coefficient-outside-divide",
      "zero-radicand-outside-divide",
      "project-enter-divide",
      "reject-zero-coefficient",
      "reject-zero-radicand",
      "leave-divide",
      "reenter-no-resurrection",
    ].map((step) => ({
      atomicGroup,
      id: `special:radical-divisor:${step}`,
      kind: "special" as const,
      scenario: "radical-divisor" as const,
      step,
    }));
  }
  const zeroGroup = `${runtime.labId}:zero-sign`;
  const colocateGroup = `${runtime.labId}:sqrt4-rational2`;
  const intervalGroup = `${runtime.labId}:irrational-certified`;
  return [
    ...["negative", "project-zero", "reject-negative-zero", "raise-no-resurrection"].map(
      (step) => ({
        atomicGroup: zeroGroup,
        id: `special:zero-sign:${step}`,
        kind: "special" as const,
        scenario: "zero-sign" as const,
        step,
      }),
    ),
    {
      atomicGroup: colocateGroup,
      id: "special:sqrt4-rational2:configure",
      kind: "special" as const,
      scenario: "sqrt4-rational2" as const,
      step: "configure",
    },
    {
      atomicGroup: intervalGroup,
      id: "special:irrational-certified:sqrt2",
      kind: "special" as const,
      scenario: "irrational-certified" as const,
      step: "sqrt2",
    },
  ];
}

function statePlans(runtime: RuntimeCase): readonly StatePlan[] {
  const plans: StatePlan[] = [{ id: "initial", kind: "initial" }];
  const kind = runtime.kind;
  for (const mode of runtime.modes) {
    plans.push({ id: `mode:${mode}`, kind: "mode", mode });
    if (kind === "rational") rationalModePlans(plans, mode);
    else if (kind === "real") realModePlans(plans, mode);
    else quadraticRadicalModePlans(plans, mode);
  }
  plans.push(...specialPlans(runtime), { id: "reset", kind: "reset" });
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
    if (group.length > maximumStatesPerChunk) {
      fail(`${runtime.labId}: atomic group exceeds ${maximumStatesPerChunk}.`);
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
const expectedStateIds = runtimeChunks.flatMap((chunk) =>
  chunk.plans.map((plan) => `${chunk.runtime.labId}:${plan.id}`),
);
const expectedChunkIds = runtimeChunks.map((chunk) => chunk.id);
const expectedTestTitles = runtimeChunks.map(
  (chunk) => `G03 ${chunk.id} audits ${chunk.plans.length} exact states`,
);

const expectedStateCountPerProject = 778;
const expectedChunkCountPerProject = 26;
const expectedCanonicalExecutionCount = 52;
const expectedStatePlanSha256 =
  "fde0029a129b621250ebadcf2db1fcf2625843d86e74eb1d02d3ebeaa1f6642b";
const expectedStateDescriptorPlanSha256 =
  "277bd4b9b512ac7768738f3ce3d96a32f954e971770a146f4bd51c3de87e7da0";
const stateDescriptorSerializer =
  "recursive-object-keys-code-unit-sort-compact-json-lines-final-lf" as const;
const expectedChunkStateCounts = new Map<SignedRealNumberLineLabId, readonly number[]>([
  ["bnu-junior-s1-upper-rational-numbers", [32, 32, 32, 21]],
  ["bnu-junior-s2-upper-real-numbers", [32, 32, 32, 32, 24]],
  ["hjb-junior-s2-upper-quadratic-radicals", [32, 32, 32, 27]],
  ["hjb-junior-s2-upper-real-numbers", [32, 32, 32, 32, 24]],
  ["hjb-primary-p6-lower-rational-numbers", [32, 32, 32, 21]],
  ["pep-junior-s1-upper-rational-numbers", [32, 32, 32, 21]],
]);

function staticSpecialRequest(
  plan: Extract<StatePlan, { kind: "special" }>,
): SignedRealNumberLineActionRequest {
  if (plan.scenario === "zero-sign") {
    if (plan.step === "negative" || plan.step === "reject-negative-zero") {
      return { kind: "control", control: "value-sign", value: -1 };
    }
    return {
      kind: "control",
      control: "value-radicand",
      value: plan.step === "project-zero" ? 0 : 9,
    };
  }
  if (plan.scenario === "rational-divisor") {
    if (
      plan.step === "zero-outside-divide" ||
      plan.step === "reject-direct-zero"
    ) {
      return {
        kind: "control",
        control: "right-rational-numerator",
        value: 0,
      };
    }
    return {
      kind: "controller",
      controller: "mode",
      value: plan.step === "leave-divide" ? "multiply" : "divide",
    };
  }
  if (plan.scenario === "radical-divisor") {
    if (
      plan.step === "zero-coefficient-outside-divide" ||
      plan.step === "reject-zero-coefficient"
    ) {
      return {
        kind: "control",
        control: "right-surd-coefficient-numerator",
        value: 0,
      };
    }
    if (
      plan.step === "zero-radicand-outside-divide" ||
      plan.step === "reject-zero-radicand"
    ) {
      return {
        kind: "control",
        control: "right-surd-radicand",
        value: 0,
      };
    }
    return {
      kind: "controller",
      controller: "mode",
      value:
        plan.step === "leave-divide"
          ? "radical-multiply"
          : "radical-divide",
    };
  }
  if (plan.scenario === "sqrt4-rational2") {
    return {
      kind: "control",
      control: "right-denominator",
      value: 1,
    };
  }
  return { kind: "control", control: "value-index", value: 2 };
}

function staticPlanMode(
  runtime: RuntimeCase,
  plan: StatePlan,
): SignedRealNumberLineExactMode {
  if (plan.kind === "initial" || plan.kind === "reset") {
    return pinnedTopicManifest[runtime.labId].reset.mode;
  }
  if (plan.kind !== "special") return plan.mode;
  if (plan.scenario === "zero-sign" || plan.scenario === "irrational-certified") {
    return "radical";
  }
  if (plan.scenario === "sqrt4-rational2") return "compare";
  if (plan.scenario === "rational-divisor") {
    return plan.step === "zero-outside-divide" || plan.step === "leave-divide"
      ? "multiply"
      : "divide";
  }
  return plan.step === "zero-coefficient-outside-divide" ||
    plan.step === "zero-radicand-outside-divide" ||
    plan.step === "leave-divide"
    ? "radical-multiply"
    : "radical-divide";
}

function staticPlanRequest(
  runtime: RuntimeCase,
  plan: StatePlan,
): SignedRealNumberLineActionRequest {
  if (plan.kind === "initial") {
    return { kind: "initial", topicId: runtime.labId };
  }
  if (plan.kind === "reset") {
    return { kind: "reset", topicId: runtime.labId };
  }
  if (plan.kind === "mode") {
    return { kind: "controller", controller: "mode", value: plan.mode };
  }
  if (plan.kind === "special") return staticSpecialRequest(plan);
  if (plan.kind === "select") {
    return plannedControlRequest(
      runtime,
      plan.mode,
      plan.parameter,
      plan.value,
    );
  }
  const descriptor = rangeDescriptor(plan.parameter);
  const value = plan.endpoint === "min"
    ? descriptor.min
    : plan.endpoint === "max"
      ? descriptor.max
      : descriptor.min +
        Math.floor((descriptor.max - descriptor.min) / descriptor.step / 2) *
          descriptor.step;
  return plannedControlRequest(runtime, plan.mode, plan.parameter, value);
}

function plannedStateDescriptor(
  runtime: RuntimeCase,
  plan: StatePlan,
): PlannedStateDescriptor {
  const request = staticPlanRequest(runtime, plan);
  const controlParameter = request.kind === "control"
    ? request.control
    : request.kind === "controller"
      ? request.controller
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

function canonicalDescriptorLines(descriptors: readonly PlannedStateDescriptor[]) {
  return `${descriptors.map(stableJson).join("\n")}\n`;
}

function assertDescriptorPlan(
  descriptors: readonly PlannedStateDescriptor[],
  expectedBytes = canonicalDescriptorLines(expectedStateDescriptors),
) {
  if (descriptors.length !== expectedStateCountPerProject) {
    fail(`G03 descriptor count drifted; actual=${descriptors.length}.`);
  }
  for (const [index, descriptor] of descriptors.entries()) {
    const expected = expectedStateDescriptors[index];
    if (!expected || stableJson(descriptor) !== stableJson(expected)) {
      fail(`G03 descriptor semantics drifted at index ${index}.`);
    }
    if (
      JSON.stringify(Object.keys(descriptor).sort()) !==
        JSON.stringify(["labId", "plan", "stateId"]) ||
      JSON.stringify(Object.keys(descriptor.plan).sort()) !==
        JSON.stringify(["controlParameter", "kind", "mode", "request"])
    ) {
      fail(`G03 descriptor exact keys drifted at index ${index}.`);
    }
    const separator = descriptor.stateId.indexOf(":");
    if (separator <= 0 || descriptor.stateId.slice(0, separator) !== descriptor.labId) {
      fail(`G03 descriptor lab/state binding drifted at index ${index}.`);
    }
  }
  const bytes = canonicalDescriptorLines(descriptors);
  if (bytes !== expectedBytes) fail("G03 descriptor canonical bytes drifted.");
  return createHash("sha256").update(bytes).digest("hex");
}

function assertDescriptorCanaries() {
  const clone = () =>
    JSON.parse(JSON.stringify(expectedStateDescriptors)) as PlannedStateDescriptor[];
  const mustReject = (label: string, mutate: (value: PlannedStateDescriptor[]) => void) => {
    const candidate = clone();
    mutate(candidate);
    try {
      assertDescriptorPlan(candidate);
    } catch {
      return;
    }
    fail(`G03 descriptor mutation canary accepted ${label}.`);
  };
  mustReject("cross-topic labId", (candidate) => {
    candidate[0] = { ...candidate[0]!, labId: exactLabIds[1] };
  });
  mustReject("control alias", (candidate) => {
    const index = candidate.findIndex(({ plan }) => plan.kind === "control");
    const descriptor = candidate[index]!;
    candidate[index] = {
      ...descriptor,
      plan: {
        ...descriptor.plan,
        request: {
          ...descriptor.plan.request,
          controlId: descriptor.plan.controlParameter,
        } as unknown as SignedRealNumberLineActionRequest,
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
      plan: { ...candidate[left]!.plan, request: candidate[right]!.plan.request },
    };
  });
  mustReject("descriptor order", (candidate) => {
    [candidate[0], candidate[1]] = [candidate[1]!, candidate[0]!];
  });
  const canonicalBytes = canonicalDescriptorLines(expectedStateDescriptors);
  if (
    canonicalBytes.endsWith("\n") === false ||
    createHash("sha256").update(canonicalBytes.slice(0, -1)).digest("hex") ===
      createHash("sha256").update(canonicalBytes).digest("hex")
  ) {
    fail("G03 descriptor final-newline mutation canary is not sensitive.");
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
    fail("G03 descriptor canonical-key-order mutation canary is not sensitive.");
  }
}

assertDescriptorCanaries();
const observedStateDescriptorPlanSha256 = assertDescriptorPlan(
  expectedStateDescriptors,
);
if (observedStateDescriptorPlanSha256 !== expectedStateDescriptorPlanSha256) {
  fail(
    `G03 ordered semantic descriptor plan SHA drifted; expected=${expectedStateDescriptorPlanSha256} actual=${observedStateDescriptorPlanSha256}.`,
  );
}

for (const runtime of runtimeCases) {
  const actual = runtimeChunks
    .filter((chunk) => chunk.runtime.labId === runtime.labId)
    .map((chunk) => chunk.plans.length);
  const expected = expectedChunkStateCounts.get(runtime.labId);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${runtime.labId}: chunk receipt drifted; expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}.`);
  }
}

if (expectedStateIds.length !== expectedStateCountPerProject) {
  fail(`G03 state count must be ${expectedStateCountPerProject}; actual=${expectedStateIds.length}.`);
}
if (runtimeChunks.length !== expectedChunkCountPerProject) {
  fail(`G03 chunk count must be ${expectedChunkCountPerProject}; actual=${runtimeChunks.length}.`);
}
if (expectedChunkCountPerProject * supportedProjects.length !== expectedCanonicalExecutionCount) {
  fail("G03 canonical desktop/mobile execution count drifted.");
}
if (new Set(expectedStateIds).size !== expectedStateIds.length) {
  fail("G03 source state IDs contain duplicates.");
}
if (new Set(expectedTestTitles).size !== expectedTestTitles.length) {
  fail("G03 source test titles contain duplicates.");
}
const observedStatePlanSha256 = createHash("sha256")
  .update(`${expectedStateIds.join("\n")}\n`)
  .digest("hex");
if (observedStatePlanSha256 !== expectedStatePlanSha256) {
  fail(
    `G03 ordered state plan SHA drifted; expected=${expectedStatePlanSha256} actual=${observedStatePlanSha256}.`,
  );
}

const ownSource = readFileSync(__filename, "utf8");
for (const forbidden of [".sk" + "ip(", ".fix" + "me(", ".on" + "ly("]) {
  if (ownSource.includes(forbidden)) fail(`G03 source contains forbidden ${forbidden}.`);
}

function producerSourceDeclarationBounds(source: string) {
  const mapStart = source.indexOf(
    "const integrationSourceSha256 = Object.freeze({",
  );
  const mapEndMarker = source.indexOf("\n});", mapStart);
  const mapEnd = mapEndMarker + "\n});".length;
  const declarationEnd = source.indexOf(
    "\nconst expectedIntegrationSourceSha256 = Object.freeze({",
    mapEnd,
  );
  if (mapStart < 0 || mapEndMarker < mapStart || declarationEnd <= mapEnd) {
    fail("G03 producer source declaration is absent or unbounded.");
  }
  return { declarationEnd, declarationStart: mapEnd, mapEnd, mapStart };
}

function producerAttachmentSource(source: string) {
  const start = source.lastIndexOf(
    "\n      await testInfo.attach(`china-mainland-g03-",
  );
  const end = source.indexOf(
    '\n        contentType: "application/json",',
    start,
  );
  if (start < 0 || end <= start) {
    fail("G03 producer attachment is absent or unbounded.");
  }
  return { end, source: source.slice(start, end), start };
}

function assertProducerSourceSha256SourceContract(source: string) {
  const defects: string[] = [];
  const importEnd = source.indexOf("\nconst configuredModuleId");
  const importSource = source.slice(0, importEnd);
  if (
    importEnd < 0 ||
    (importSource.match(
      /^import \{ createHash \} from "node:crypto";$/gmu,
    ) ?? []).length !== 1
  ) {
    defects.push("exact node:crypto createHash import is absent");
  }
  if (
    importEnd < 0 ||
    (importSource.match(
      /^import \{ readFileSync \} from "node:fs";$/gmu,
    ) ?? []).length !== 1
  ) {
    defects.push("exact node:fs readFileSync import is absent");
  }

  const bounds = producerSourceDeclarationBounds(source);
  const declarationSource = source
    .slice(bounds.declarationStart, bounds.declarationEnd)
    .trim();
  const exactDynamicDeclaration = [
    'const producerSourceSha256 = createHash("sha256")',
    "  .update(readFileSync(__filename))",
    '  .digest("hex");',
  ].join("\n");
  if (declarationSource !== exactDynamicDeclaration) {
    defects.push(
      "producerSourceSha256 must dynamically hash raw bytes from fixed __filename",
    );
  }
  const integrationMapSource = source.slice(bounds.mapStart, bounds.mapEnd);
  if (integrationMapSource.includes("producerSourceSha256")) {
    defects.push(
      "producerSourceSha256 must stay outside integrationSourceSha256 dependencies",
    );
  }

  const attachment = producerAttachmentSource(source);
  const exactSiblingFields = [
    "          integrationSourceSha256,",
    "          producerSourceSha256,",
  ].join("\n");
  if (!attachment.source.includes(exactSiblingFields)) {
    defects.push(
      "producerSourceSha256 must be the top-level sibling immediately after integrationSourceSha256",
    );
  }
  if (
    (attachment.source.match(
      /^          producerSourceSha256,$/gmu,
    ) ?? []).length !== 1
  ) {
    defects.push("producerSourceSha256 top-level attachment field is not exact");
  }
  if (defects.length > 0) {
    fail(`G03 producer source provenance RED: ${defects.join("; ")}.`);
  }
}

function assertProducerSourceSha256MutationCanaries(source: string) {
  const mustReject = (
    label: string,
    mutate: (candidate: string) => string,
  ) => {
    const candidate = mutate(source);
    if (candidate === source) {
      fail(`G03 producer source provenance canary could not inject ${label}.`);
    }
    try {
      assertProducerSourceSha256SourceContract(candidate);
    } catch {
      return;
    }
    fail(`G03 producer source provenance canary accepted ${label}.`);
  };
  const replaceDeclaration = (candidate: string, replacement: string) => {
    const bounds = producerSourceDeclarationBounds(candidate);
    return `${candidate.slice(0, bounds.declarationStart)}\n${replacement}${candidate.slice(bounds.declarationEnd)}`;
  };
  const replaceAttachment = (
    candidate: string,
    mutate: (attachment: string) => string,
  ) => {
    const bounds = producerAttachmentSource(candidate);
    const mutated = mutate(bounds.source);
    return `${candidate.slice(0, bounds.start)}${mutated}${candidate.slice(bounds.end)}`;
  };

  mustReject("missing node:crypto import", (candidate) =>
    candidate.replace('import { createHash } from "node:crypto";\n', ""),
  );
  mustReject("missing node:fs import", (candidate) =>
    candidate.replace('import { readFileSync } from "node:fs";\n', ""),
  );
  mustReject("static digest expression", (candidate) =>
    replaceDeclaration(
      candidate,
      'const producerSourceSha256 = "0".repeat(64);',
    ),
  );
  mustReject("literal digest", (candidate) =>
    replaceDeclaration(
      candidate,
      `const producerSourceSha256 = "${"0".repeat(64)}";`,
    ),
  );
  mustReject("text-decoded source", (candidate) =>
    replaceDeclaration(
      candidate,
      [
        'const producerSourceSha256 = createHash("sha256")',
        '  .update(readFileSync(__filename, "utf8"))',
        '  .digest("hex");',
      ].join("\n"),
    ),
  );
  mustReject("alternate source path", (candidate) =>
    replaceDeclaration(
      candidate,
      [
        'const producerSourceSha256 = createHash("sha256")',
        '  .update(readFileSync(__dirname + "/china-mainland-g03-signed-real-production.spec.ts"))',
        '  .digest("hex");',
      ].join("\n"),
    ),
  );
  mustReject("foreign source path", (candidate) =>
    replaceDeclaration(
      candidate,
      [
        'const producerSourceSha256 = createHash("sha256")',
        '  .update(readFileSync("/Volumes/Starship/foreign-producer.ts"))',
        '  .digest("hex");',
      ].join("\n"),
    ),
  );
  mustReject("attachment-controlled source path", (candidate) =>
    replaceDeclaration(
      candidate,
      [
        'const producerSourceSha256 = createHash("sha256")',
        "  .update(readFileSync(testInfo.file))",
        '  .digest("hex");',
      ].join("\n"),
    ),
  );
  mustReject("producer dependency-map entry", (candidate) => {
    const bounds = producerSourceDeclarationBounds(candidate);
    const map = candidate.slice(bounds.mapStart, bounds.mapEnd);
    const mutated = map.replace(
      "  nextEnv: sourceFileSha256",
      "  producerSourceSha256,\n  nextEnv: sourceFileSha256",
    );
    return `${candidate.slice(0, bounds.mapStart)}${mutated}${candidate.slice(bounds.mapEnd)}`;
  });
  mustReject("omitted attachment field", (candidate) =>
    replaceAttachment(candidate, (attachment) =>
      attachment.replace("\n          producerSourceSha256,", ""),
    ),
  );
  mustReject("non-adjacent attachment field", (candidate) =>
    replaceAttachment(candidate, (attachment) =>
      attachment.replace(
        [
          "          integrationSourceSha256,",
          "          producerSourceSha256,",
        ].join("\n"),
        [
          "          integrationSourceSha256,",
          "          observedStateDescriptorPlanSha256,",
          "          producerSourceSha256,",
        ].join("\n"),
      ),
    ),
  );
}

function exactDurabilityProbeSource(source: string) {
  const declaration = "\nasync function runExactDurabilityProbe(";
  const declarationStart = source.lastIndexOf(declaration);
  const start = declarationStart + 1;
  const end = source.indexOf("\nfunction assertCanonicalRunner", start);
  if (declarationStart < 0 || end <= start) {
    fail("G03 exact durability probe helper is absent or unbounded.");
  }
  return { end, source: source.slice(start, end), start };
}

function firstSessionAcknowledgementSource(source: string) {
  const declaration = "\nasync function awaitFirstSessionAck(";
  const declarationStart = source.lastIndexOf(declaration);
  const start = declarationStart + 1;
  const end = source.indexOf("\nasync function runExactDurabilityProbe(", start);
  if (declarationStart < 0 || end <= start) {
    fail("G03 first-session acknowledgement helper is absent or unbounded.");
  }
  return { end, source: source.slice(start, end), start };
}

function assertFirstSessionAcknowledgementSourceContract(source: string) {
  const acknowledgement = firstSessionAcknowledgementSource(source);
  const defects: string[] = [];
  const exactAcknowledgementKeys = [
    '  assertExactOwnKeys(`${runtime.labId}: first-control ACK`, delivery, [',
    '    "acknowledgedUserId",',
    '    "durablyPersisted",',
    '    "session",',
    "  ]);",
  ].join("\n");
  const exactSessionKeys = [
    "  assertExactOwnKeys(",
    '    `${runtime.labId}: first-control ACK session`,',
    "    delivery.session,",
    "    [",
    '      "completedAt",',
    '      "explored",',
    '      "moduleId",',
    '      "source",',
    '      "topicId",',
    '      "updatedAt",',
    "    ],",
    "  );",
  ].join("\n");
  if (!acknowledgement.source.includes(exactAcknowledgementKeys)) {
    defects.push("exact three-key top-level ACK expectation is absent");
  }
  if (!acknowledgement.source.includes(exactSessionKeys)) {
    defects.push("exact six-key session ACK expectation is absent");
  }
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
    fail(`G03 first-session ACK source RED: ${defects.join("; ")}.`);
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
    '`${runtime.labId}: first-control ACK`, delivery, [',
    '"acknowledgedUserId",',
    '"durablyPersisted",',
    '"session",',
    '`${runtime.labId}: first-control ACK session`,',
    '"completedAt",',
    '"explored",',
    '"moduleId",',
    '"source",',
    '"topicId",',
    '"updatedAt",',
    'typeof delivery.session.updatedAt !== "string" ||',
    "new Date(delivery.session.updatedAt).toISOString() !==",
    'typeof delivery.session.completedAt !== "string" ||',
    "new Date(delivery.session.completedAt).toISOString() !==",
    "delivery.session.completedAt !== delivery.session.updatedAt",
    "const acknowledgement: FirstSessionAcknowledgement = {",
    "completedAt: delivery.session.completedAt,",
    "expect(delivery).toEqual(acknowledgement);",
    "return acknowledgement;",
  ] as const;
  let priorIndex = -1;
  for (const step of orderedSteps) {
    const index = acknowledgement.source.indexOf(step, priorIndex + 1);
    if (index <= priorIndex) {
      fail(
        `G03 strict first-session ACK step is absent or out of order: ${step}.`,
      );
    }
    priorIndex = index;
  }
  if (/\.toMatchObject\s*\(/u.test(acknowledgement.source)) {
    fail("G03 first-session ACK must use exact equality, not a partial match.");
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
      fail(`G03 first-session ACK mutation canary could not inject ${label}.`);
    }
    const candidate =
      `${source.slice(0, bounds.start)}${mutatedHelper}${source.slice(bounds.end)}`;
    try {
      assertFirstSessionAcknowledgementSourceContract(candidate);
    } catch {
      return;
    }
    fail(`G03 first-session ACK mutation canary accepted ${label}.`);
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
  mustReject("weakened response Content-Type", (helper) =>
    helper.replace(
      'expect(response.headers()["content-type"]).toBe("application/json");',
      'expect(response.headers()["content-type"]).toContain("application/json");',
    ),
  );
  mustReject("surplus top-level ACK expected key", (helper) =>
    helper.replace(
      ['    "session",', "  ]);"].join("\n"),
      ['    "session",', '    "forged",', "  ]);"].join("\n"),
    ),
  );
  mustReject("surplus session ACK expected key", (helper) =>
    helper.replace(
      ['      "updatedAt",', "    ],"].join("\n"),
      ['      "updatedAt",', '      "forged",', "    ],"].join("\n"),
    ),
  );
  mustReject("missing POST method", (helper) =>
    helper.replace('expect(request.method()).toBe("POST");', ""),
  );
  mustReject("null completedAt", (helper) =>
    helper.replace(
      "completedAt: delivery.session.completedAt,",
      "completedAt: null,",
    ),
  );
  mustReject("absent completedAt key", (helper) =>
    helper.replace('      "completedAt",\n', ""),
  );
  mustReject("mismatched completedAt", (helper) =>
    helper.replace(
      "delivery.session.completedAt !== delivery.session.updatedAt",
      "delivery.session.completedAt === delivery.session.updatedAt",
    ),
  );
  mustReject("invalid updatedAt accepted", (helper) =>
    helper.replace(
      [
        "new Date(delivery.session.updatedAt).toISOString() !==",
        "      delivery.session.updatedAt ||",
      ].join("\n"),
      "false ||",
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
  mustReject("partial delivery equality", (helper) =>
    helper.replace(
      "expect(delivery).toEqual(acknowledgement);",
      "expect(delivery).toMatchObject(acknowledgement);",
    ),
  );
}

function canonicalStatePlanLoopSource(source: string) {
  const suiteStart = source.lastIndexOf(
    'test.describe("Mainland G03 signed real production route acceptance"',
  );
  const start = source.indexOf(
    "for (const [planIndex, plan] of chunk.plans.entries()) {",
    suiteStart,
  );
  const end = source.indexOf("const actualStateIds =", start);
  if (suiteStart < 0 || start < suiteStart || end <= start) {
    fail("G03 canonical state-plan loop is absent or unbounded.");
  }
  return { end, source: source.slice(start, end), start, suiteStart };
}

function assertExactDurabilityProbeSourceContract(source: string) {
  const planLoop = canonicalStatePlanLoopSource(source);
  if (
    /durability\.(?:armRealControl|finishFirstRealControl|finishSecondRealControl)\s*\(/u.test(
      planLoop.source,
    ) ||
    /page\.waitForResponse\s*\(/u.test(planLoop.source)
  ) {
    fail(
      "G03 canonical state-plan loop must not own a durability fence or session waiter.",
    );
  }

  const helper = exactDurabilityProbeSource(source);
  const orderedSteps = [
    "const resetMode = pinnedTopicManifest[runtime.labId].reset.mode;",
    "const probeMode = runtime.modes.find((mode) => mode !== resetMode);",
    "const probeContract = exactDurabilityProbeContract(runtime, probeMode);",
    "const firstFence = await durability.armRealControl({",
    "expectedButtonClick: probeContract.first.expectedButtonClick,",
    "ordinal: probeContract.first.ordinal,",
    "const sessionPromise = page.waitForResponse(",
    "await modeButton.click();",
    "await awaitFirstSessionAck(sessionPromise, runtime, userId);",
    "const first = await durability.finishFirstRealControl({",
    "const firstAction = await bindActionEvidence(",
    "expect(firstAction.observedSignature.mode).toBe(probeMode);",
    "const secondFence = await durability.armRealControl({",
    "expectedButtonClick: probeContract.second.expectedButtonClick,",
    "ordinal: probeContract.second.ordinal,",
    "await resetButton.click();",
    "const second = await durability.finishSecondRealControl({",
    "const controlObserverStop = second.controlObserverStop;",
    "expect(controlObserverStop).toMatchObject({",
    "const secondAction = await bindActionEvidence(",
    "`${runtime.labId}: durability probe ends at canonical reset`,",
    "return { controlObserverStop, first, firstAction, second, secondAction, sessionAcknowledgement } as const;",
  ] as const;
  let priorIndex = -1;
  for (const step of orderedSteps) {
    const index = helper.source.indexOf(step);
    if (index <= priorIndex) {
      fail(`G03 exact durability probe step is absent or out of order: ${step}.`);
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
  for (const [label, window, exactClick] of [
    ["first", helper.source.slice(firstArm, firstFinish), "await modeButton.click();"],
    ["second", helper.source.slice(secondArm, secondFinish), "await resetButton.click();"],
  ] as const) {
    if (
      (window.match(/\.click\s*\(/gu) ?? []).length !== 1 ||
      !window.includes(exactClick) ||
      /\.press\s*\(/u.test(window) ||
      /\b(?:reset|clickMode|selectControl|setRange|preparePlan|executeNormalPlan|executeSpecialPlan)\s*\(/u.test(
        window,
      )
    ) {
      fail(
        `G03 exact durability ${label} fence must contain one exact Locator.click and no press or preparation action.`,
      );
    }
  }
  if (
    (helper.source.match(/durability\.armRealControl\s*\(/gu) ?? []).length !== 2 ||
    (helper.source.match(/durability\.finishFirstRealControl\s*\(/gu) ?? [])
      .length !== 1 ||
    (helper.source.match(/durability\.finishSecondRealControl\s*\(/gu) ?? [])
      .length !== 1 ||
    (helper.source.match(/page\.waitForResponse\s*\(/gu) ?? []).length !== 1
  ) {
    fail("G03 exact durability probe lifecycle cardinality drifted.");
  }

  const runtimeSource = source.slice(planLoop.suiteStart);
  const replayIndex = runtimeSource.indexOf(
    "await durability.replayFirstDeliveryExactly({",
  );
  const finalIndex = runtimeSource.indexOf("await durability.finalReceipt()");
  const lifecycle = [
    "await prepareVisualizationLessonLearnerProfileBeforeArm({",
    "createVisualizationLessonDurabilityBrowserAdapter({",
    "await durability.armBeforeNavigation({ learnerProfileSetup })",
    "await page.goto(`/student/lessons/${encodeURIComponent(lessonSlug)}`",
    "await durability.waitForMountTerminal({",
    "let initialCanonicalReceipt:",
    "const durabilityProbe = await runExactDurabilityProbe({",
    "for (const [planIndex, plan] of chunk.plans.entries()) {",
    "await durability.replayFirstDeliveryExactly({",
    "await durability.finalReceipt()",
  ] as const;
  priorIndex = -1;
  for (const step of lifecycle) {
    const index = runtimeSource.indexOf(step);
    if (index <= priorIndex) {
      fail(`G03 durability lifecycle is absent or out of order: ${step}.`);
    }
    priorIndex = index;
  }
  if (
    finalIndex <= planLoop.end - planLoop.suiteStart ||
    replayIndex <= planLoop.end - planLoop.suiteStart ||
    finalIndex <= replayIndex ||
    (runtimeSource.match(/runExactDurabilityProbe\s*\(/gu) ?? []).length !== 1 ||
    /controlIdentities\s*:/u.test(runtimeSource) ||
    !runtimeSource.includes("probe: durabilityProbe,") ||
    !runtimeSource.includes(
      "expect(durabilityReceipt.controlObserverStop).toBe(durabilityProbe.controlObserverStop);",
    ) ||
    !runtimeSource.includes(
      "expect(durabilityReceipt.second.controlObserverStop).toBe(durabilityProbe.controlObserverStop);",
    ) ||
    !runtimeSource.includes(
      "expect(durabilityReceipt.controlObserverStop).toBe(durabilityReceipt.second.controlObserverStop);",
    ) ||
    !runtimeSource.includes("expect(durabilityReceipt.expectedControl).toEqual({") ||
    !runtimeSource.includes("expect(durabilityReceipt.controlEvents).toEqual({")
  ) {
    fail(
      "G03 durability attachment must expose actual probe receipts and reject self-authored control identities.",
    );
  }
}

function assertExactDurabilityProbeSourceMutationCanaries(source: string) {
  const mustReject = (label: string, mutate: (candidate: string) => string) => {
    const candidate = mutate(source);
    if (candidate === source) {
      fail(`G03 exact durability source canary could not inject ${label}.`);
    }
    try {
      assertExactDurabilityProbeSourceContract(candidate);
    } catch {
      return;
    }
    fail(`G03 exact durability source canary accepted ${label}.`);
  };
  const mutateHelper = (candidate: string, mutate: (helper: string) => string) => {
    const bounds = exactDurabilityProbeSource(candidate);
    const mutated = mutate(bounds.source);
    return `${candidate.slice(0, bounds.start)}${mutated}${candidate.slice(bounds.end)}`;
  };
  mustReject("wrong first control key", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace(
        "expectedButtonClick: probeContract.first.expectedButtonClick,",
        "expectedButtonClick: probeContract.second.expectedButtonClick,",
      ),
    ),
  );
  mustReject("missing expectedButtonClick", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace(
        "expectedButtonClick: probeContract.first.expectedButtonClick,",
        "",
      ),
    ),
  );
  for (const [label, injection] of [
    ["extra click", "await modeButton.click();"],
    ["press", 'await modeButton.press("Enter");'],
    ["preparation", "await reset(root, runtime);"],
  ] as const) {
    mustReject(label, (candidate) =>
      mutateHelper(candidate, (helper) =>
        helper.replace(
          "await modeButton.click();",
          `await modeButton.click();\n  ${injection}`,
        ),
      ),
    );
  }
  mustReject("canonical-loop session waiter", (candidate) => {
    const loop = canonicalStatePlanLoopSource(candidate);
    const mutated = loop.source.replace(
      "const stateId =",
      "page.waitForResponse(() => true);\n        const stateId =",
    );
    return `${candidate.slice(0, loop.start)}${mutated}${candidate.slice(loop.end)}`;
  });
  mustReject("self-authored control identity", (candidate) => {
    const loop = canonicalStatePlanLoopSource(candidate);
    const runtime = candidate.slice(loop.suiteStart);
    const mutated = runtime.replace(
      "durabilityReceipts: {",
      "durabilityReceipts: { controlIdentities: {},",
    );
    return `${candidate.slice(0, loop.suiteStart)}${mutated}`;
  });
  mustReject("final before canonical loop", (candidate) => {
    const loop = canonicalStatePlanLoopSource(candidate);
    const finalStatement = [
      "const durabilityReceipt: VisualizationLessonDurabilityFinalReceipt =",
      "        await durability.finalReceipt();",
    ].join("\n");
    const withoutFinal = candidate.replace(finalStatement, "");
    return withoutFinal.replace(
      "const receipts: unknown[] = [];",
      `${finalStatement}\n\n      const receipts: unknown[] = [];`,
    );
  });
  mustReject("final before replay", (candidate) => {
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
  mustReject("missing final stop identity binding", (candidate) => {
    const target =
      "expect(durabilityReceipt.controlObserverStop).toBe(durabilityReceipt.second.controlObserverStop);";
    const targetIndex = candidate.lastIndexOf(target);
    if (targetIndex < 0) return candidate;
    return `${candidate.slice(0, targetIndex)}${candidate.slice(targetIndex + target.length)}`;
  });
}

assertProducerSourceSha256SourceContract(ownSource);
assertProducerSourceSha256MutationCanaries(ownSource);
assertFirstSessionAcknowledgementSourceContract(ownSource);
assertFirstSessionAcknowledgementMutationCanaries(ownSource);
assertExactDurabilityProbeSourceContract(ownSource);
assertExactDurabilityProbeSourceMutationCanaries(ownSource);
assertMainlandFocusedCanonicalCli({
  requiredSpec:
    "tests/e2e/china-mainland-g03-signed-real-production.spec.ts",
});
const projectArguments: string[] = [];
for (const [argumentIndex, argument] of process.argv.entries()) {
  if (argument === "--project") {
    const project = process.argv[argumentIndex + 1];
    if (!project) fail("G03 --project requires an exact project name.");
    projectArguments.push(project);
  } else if (argument.startsWith("--project=")) {
    projectArguments.push(argument.slice("--project=".length));
  }
  if (
    [
      "--grep",
      "--grep-invert",
      "--last-failed",
      "--max-failures",
      "--only-changed",
      "--repeat-each",
      "--shard",
    ].some((flag) => argument === flag || argument.startsWith(`${flag}=`)) ||
    argument === "-g"
  ) {
    fail(`G03 canonical acceptance rejects partial CLI argument ${argument}.`);
  }
}
if (
  projectArguments.length > 0 &&
  JSON.stringify([...projectArguments].sort()) !==
    JSON.stringify([...supportedProjects].sort())
) {
  fail(
    `G03 canonical acceptance requires both projects; received=${JSON.stringify(projectArguments)}.`,
  );
}

for (const environmentName of [
  "G03_VIZ_ALLOW_PARTIAL",
  "G03_VIZ_FILTER",
  "G03_VIZ_LESSON_FULL",
]) {
  if (process.env[environmentName] !== undefined) {
    fail(`G03 canonical acceptance rejects ${environmentName}.`);
  }
}
if (!process.cwd().startsWith("/Volumes/Starship/")) {
  fail(`G03 canonical worktree escaped Starship: ${process.cwd()}.`);
}

function starshipPathReceipt(testInfo: TestInfo) {
  const paths = {
    browserProfileEvidencePath: process.env.PLAYWRIGHT_BROWSER_PROFILE_EVIDENCE_PATH,
    browserProcessEvidencePath: process.env.PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH,
    browserTempDir: process.env.PLAYWRIGHT_BROWSER_TEMP_DIR,
    crashDumpDir: process.env.PLAYWRIGHT_CRASH_DUMP_DIR,
    databasePath: process.env.HK_MATH_DB_PATH,
    e2eRunRoot: process.env.PLAYWRIGHT_E2E_ROOT,
    nextDistDir: process.env.PLAYWRIGHT_NEXT_DIST_DIR,
    nodeCompileCache: process.env.NODE_COMPILE_CACHE,
    npmCache: process.env.npm_config_cache,
    outputDir: testInfo.outputDir,
    pathManifestPath: process.env.PLAYWRIGHT_PATH_MANIFEST_PATH,
    reportDir: process.env.PLAYWRIGHT_REPORT_DIR,
    serverLogPath: process.env.PLAYWRIGHT_SERVER_LOG_PATH,
    temp: process.env.TEMP,
    tmp: process.env.TMP,
    tmpdir: process.env.TMPDIR,
    worktree: process.cwd(),
  };
  for (const [label, value] of Object.entries(paths)) {
    if (typeof value !== "string" || !value.startsWith("/Volumes/Starship/")) {
      fail(`${label} escaped the Starship path contract: ${JSON.stringify(value)}.`);
    }
  }
  return paths;
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

function mountWriteViolations(observedWrites: readonly ObservedWrite[]) {
  const violations: string[] = [];
  for (const write of observedWrites.filter((entry) => entry.stage === "mount")) {
    if (isApiFamilyPath(write.pathname, "/api/visualization-sessions")) {
      violations.push(`${write.method} ${write.pathname}: session during mount`);
    } else if (
      isApiFamilyPath(write.pathname, "/api/gamification") ||
      isApiFamilyPath(write.pathname, "/api/rewards") ||
      isApiFamilyPath(write.pathname, "/api/teacher/gamification") ||
      isApiFamilyPath(write.pathname, "/api/teacher/rewards")
    ) {
      violations.push(`${write.method} ${write.pathname}: reward during mount`);
    } else if (
      write.pathname === "/api/learning-events" &&
      visualizationLearningEvents(write.body).length > 0
    ) {
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

async function registerMainlandStudent(
  page: Page,
  testInfo: TestInfo,
  chunk: RuntimeChunk,
) {
  const runtime = chunk.runtime;
  const suffix = `${uniqueSuffix(testInfo)}-${chunk.index}-${runtime.publisher.toLowerCase()}`
    .replace(/[^a-z0-9-]+/giu, "-")
    .slice(0, 100);
  const username = `g03-${suffix}@example.test`;
  const theme =
    (testInfo.project.name === "desktop-chrome") === (chunk.index % 2 === 0)
      ? "light"
      : "dark";
  const response = await page.request.post("/api/auth/register", {
    data: {
      curriculumProfile: { publisher: runtime.publisher, region: "MAINLAND" },
      curriculumTrack: runtime.track,
      email: username,
      grade: runtime.lab.grade,
      language: "zh-Hans",
      name: `G03 ${runtime.publisher} ${suffix}`,
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
  }>(
    response,
    `${chunk.id}: student registration`,
  );
  expect(body.user?.role).toBe("student");
  expect(body.user?.username).toBe(username);
  expect(body.user?.curriculumProfile).toEqual({
    publisher: runtime.publisher,
    region: "MAINLAND",
  });
  expect(body.user?.curriculumTrack).toBe(runtime.track);
  expect(body.user?.theme).toBe(theme);
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
  }>(response, "visualization session reread");
  if (!Array.isArray(body.sessions)) fail("Session reread has no sessions array.");
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
        return rect.width > 1 && rect.height > 1 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((control) => ({
        disabled: control.disabled,
        kind: control instanceof HTMLSelectElement ? "select" : "range",
        max: control instanceof HTMLInputElement ? Number(control.max) : null,
        min: control instanceof HTMLInputElement ? Number(control.min) : null,
        options: control instanceof HTMLSelectElement
          ? Array.from(control.options).map((option) => option.value)
          : [],
        parameter: control.getAttribute("data-viz-parameter") ?? "",
        step: control instanceof HTMLInputElement ? Number(control.step || "1") : null,
        value: control.value,
      })),
  );
}

function controlMap(controls: readonly ControlSnapshot[]) {
  const map = new Map<string, ControlSnapshot>();
  for (const control of controls) {
    if (!control.parameter) fail("Visible control has no parameter.");
    if (map.has(control.parameter)) fail(`Duplicate visible control ${control.parameter}.`);
    map.set(control.parameter, control);
  }
  return map;
}

function canonicalEvidenceParameter(runtime: RuntimeCase, parameter: string) {
  if (runtime.kind === "rational") {
    if (parameter === "right-numerator") return "right-rational-numerator";
    if (parameter === "right-denominator") return "right-rational-denominator";
  }
  if (runtime.kind === "quadratic-radical") {
    if (parameter === "right-coefficient-numerator") {
      return "right-surd-coefficient-numerator";
    }
    if (parameter === "right-coefficient-denominator") {
      return "right-surd-coefficient-denominator";
    }
    if (parameter === "right-radicand") return "right-surd-radicand";
  }
  if (runtime.kind === "real") {
    if (parameter === "left-sign") return "value-sign";
    if (parameter === "left-radicand") return "value-radicand";
  }
  return parameter;
}

function canonicalEvidenceControls(
  runtime: RuntimeCase,
  controls: readonly ControlSnapshot[],
) {
  const canonical = controls.map((control) => ({
    ...control,
    parameter: canonicalEvidenceParameter(runtime, control.parameter),
  }));
  controlMap(canonical);
  return canonical;
}

async function controlSignature(root: Locator): Promise<ControlSignature> {
  const owner = root.locator("[data-mainland-signed-real-number-line]");
  const labId = await owner.getAttribute("data-viz-lab-id") ??
    await root.getAttribute("data-viz-active-lab-id");
  const runtime = runtimeCases.find((candidate) => candidate.labId === labId);
  if (!runtime) fail(`G03 control signature has unknown lab ${JSON.stringify(labId)}.`);
  const mode = await owner.getAttribute("data-viz-mode");
  if (!mode) fail("G03 control signature has no mode.");
  return {
    actionReceipt: (await owner.getAttribute("data-viz-action-receipt")) ?? "",
    controls: canonicalEvidenceControls(runtime, await visibleControls(root)),
    domainId: (await owner.getAttribute("data-viz-control-domain-id")) ?? "",
    geometryOwners: await root
      .locator("[data-viz-geometry-point]")
      .evaluateAll((elements) =>
        elements.map((element) => ({
          exactKey: element.getAttribute("data-viz-exact-key") ?? "",
          ownerId: element.getAttribute("data-viz-colocation-owner") ?? "",
          renderMarker:
            element.getAttribute("data-viz-render-marker") === "true",
          semanticId: element.getAttribute("data-viz-geometry-point") ?? "",
        })),
      ),
    geometryState:
      (await root
        .locator("[data-viz-geometry]")
        .getAttribute("data-viz-geometry-state")) ?? "",
    invariantStates: await root
      .locator("[data-viz-invariant]")
      .evaluateAll((elements) =>
        elements.map((element) =>
          [
            element.getAttribute("data-viz-invariant"),
            element.getAttribute("data-viz-invariant-status"),
            element.getAttribute("data-viz-invariant-expected"),
            element.getAttribute("data-viz-invariant-observed"),
          ].join("|"),
        ),
      ),
    mode: mode as SignedRealNumberLineExactMode,
    semanticState:
      (await root.locator("[data-viz-state]").getAttribute("data-viz-state")) ??
      "",
    state: (await owner.getAttribute("data-viz-configured-state")) ?? "",
  };
}

function parseActionReceipt(value: unknown, label: string) {
  if (!isRecord(value)) fail(`${label}: action receipt is not an object.`);
  if (
    value.version !== SIGNED_REAL_NUMBER_LINE_ACTION_RECEIPT_CONTRACT.version ||
    (value.status !== "accepted" && value.status !== "rejected") ||
    !isRecord(value.request) ||
    !isRecord(value.before) ||
    !isRecord(value.requested) ||
    !isRecord(value.expected) ||
    !isRecord(value.observed) ||
    !Array.isArray(value.projections)
  ) {
    fail(`${label}: action receipt shape drifted.`);
  }
  return value as unknown as SignedRealNumberLineActionReceipt;
}

async function actionReceipt(root: Locator) {
  const owner = root.locator("[data-mainland-signed-real-number-line]");
  const receipt = parseActionReceipt(
    parseJson(await owner.getAttribute("data-viz-action-receipt")),
    "G03 root",
  );
  const attributePairs = [
    ["data-viz-action-request", receipt.request],
    ["data-viz-action-before", receipt.before],
    ["data-viz-action-requested", receipt.requested],
    ["data-viz-action-expected", receipt.expected],
    ["data-viz-action-observed", receipt.observed],
    ["data-viz-action-projections", receipt.projections],
  ] as const;
  for (const [attribute, expected] of attributePairs) {
    expect(parseJson(await owner.getAttribute(attribute)), attribute).toEqual(expected);
  }
  await expect(owner).toHaveAttribute("data-viz-action-status", receipt.status);
  await expect(owner).toHaveAttribute(
    "data-viz-action-rejection",
    receipt.rejection ?? "none",
  );
  expect(receipt.requested.pendingRequest).toEqual(receipt.request);
  expect(receipt.observed).toEqual(receipt.expected);
  return receipt;
}

function rangeDescriptor(parameter: string) {
  if (parameter.endsWith("-numerator")) return { max: 24, min: -24, step: 1 };
  if (parameter.endsWith("-denominator")) return { max: 12, min: 1, step: 1 };
  if (parameter.endsWith("-radicand")) return { max: 50, min: 0, step: 1 };
  if (parameter.endsWith("-index")) return { max: 9, min: 2, step: 1 };
  if (parameter === "precision") return { max: 6, min: 0, step: 1 };
  fail(`G03 pinned manifest has no range descriptor for ${parameter}.`);
}

function pinnedControlParameters(
  runtime: RuntimeCase,
  mode: SignedRealNumberLineExactMode,
  controls: readonly ControlSnapshot[],
) {
  if (!runtime.modes.includes(mode)) fail(`${runtime.labId}: unpinned mode ${mode}.`);
  const current = controlMap(controls);
  const parameters: string[] = [];
  const rationalPair = (prefix: string) =>
    parameters.push(`${prefix}-numerator`, `${prefix}-denominator`);
  const radical = (prefix: string, includeKind: boolean) => {
    if (includeKind) parameters.push(`${prefix}-kind`);
    const kind = includeKind ? current.get(`${prefix}-kind`)?.value : "radical";
    if (kind === "rational") rationalPair(prefix);
    else parameters.push(`${prefix}-sign`, `${prefix}-radicand`, `${prefix}-index`);
  };
  const surd = (prefix: string) =>
    parameters.push(
      `${prefix}-coefficient-numerator`,
      `${prefix}-coefficient-denominator`,
      `${prefix}-radicand`,
    );

  if (runtime.kind === "rational") {
    if (mode === "locate" || mode === "opposite" || mode === "absolute-value") {
      rationalPair("value");
    } else if (mode === "compare" || mode === "multiply" || mode === "divide") {
      rationalPair("left");
      rationalPair("right");
    } else if (mode === "add" || mode === "subtract") {
      rationalPair("start");
      rationalPair("step");
    } else fail(`${runtime.labId}: invalid rational mode ${mode}.`);
  } else if (runtime.kind === "real") {
    if (
      mode === "locate" ||
      mode === "absolute-value" ||
      mode === "classify" ||
      mode === "estimate"
    ) {
      radical("value", true);
    } else if (mode === "compare") {
      radical("left", true);
      radical("right", true);
    } else if (mode === "radical") {
      radical("value", false);
    } else if (mode === "square-root") {
      parameters.push("value-radicand");
    } else if (mode === "cube-root") {
      parameters.push("value-sign", "value-radicand");
    } else fail(`${runtime.labId}: invalid real mode ${mode}.`);
  } else if (mode === "simplify" || mode === "estimate-check") {
    surd("value");
  } else {
    surd("left");
    surd("right");
  }
  parameters.push("precision");
  return parameters;
}

function assertPinnedControlSurface(
  runtime: RuntimeCase,
  signature: ControlSignature,
) {
  const expected = pinnedControlParameters(runtime, signature.mode, signature.controls);
  expect(signature.controls.map(({ parameter }) => parameter)).toEqual(
    expected.map((parameter) => canonicalEvidenceParameter(runtime, parameter)),
  );
  for (const control of signature.controls) {
    if (control.kind === "select") {
      expect(control.options).toEqual(
        control.parameter.endsWith("-kind") ? ["rational", "radical"] : ["-1", "1"],
      );
      expect(control.min).toBeNull();
      expect(control.max).toBeNull();
      expect(control.step).toBeNull();
    } else {
      expect(control).toMatchObject(rangeDescriptor(control.parameter));
      expect(control.options).toEqual([]);
    }
  }
}

async function settleExactRuntime(root: Locator, phase: string) {
  const deadline = Date.now() + 5_000;
  let prior = "";
  while (Date.now() < deadline) {
    await root.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    const current = await root.locator("[data-mainland-signed-real-number-line]").evaluate((owner) =>
      JSON.stringify({
        controls: Array.from(owner.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-viz-parameter]")).map((control) => [control.getAttribute("data-viz-parameter"), control.value]),
        expected: owner.getAttribute("data-viz-control-expected"),
        geometry: owner.querySelector("[data-viz-geometry]")?.getAttribute("data-viz-geometry-state"),
        mode: owner.getAttribute("data-viz-mode"),
        observed: owner.getAttribute("data-viz-control-observed"),
        state: owner.getAttribute("data-viz-configured-state"),
      }),
    );
    if (current === prior) return;
    prior = current;
  }
  fail(`${phase}: renderer never exposed two consecutive exact digests.`);
}

async function setRange(control: Locator, value: number) {
  await control.evaluate((element, nextValue) => {
    if (!(element instanceof HTMLInputElement) || element.type !== "range") {
      throw new TypeError("Endpoint target is not input[type=range].");
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new TypeError("Native range setter is unavailable.");
    setter.call(element, String(nextValue));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

function endpointValue(control: ControlSnapshot, endpoint: EndpointName) {
  if (
    control.kind !== "range" ||
    control.min === null ||
    control.max === null ||
    control.step === null ||
    !Number.isFinite(control.min) ||
    !Number.isFinite(control.max) ||
    !Number.isFinite(control.step) ||
    control.step <= 0
  ) {
    fail(`${control.parameter}: invalid range descriptor.`);
  }
  if (endpoint === "min") return control.min;
  if (endpoint === "max") return control.max;
  return control.min + Math.floor((control.max - control.min) / control.step / 2) * control.step;
}

async function reset(root: Locator, runtime: RuntimeCase) {
  const button = root.locator(
    `[data-viz-reset-model][data-viz-reset-module-id=${JSON.stringify(configuredModuleId)}][data-viz-reset-topic-id=${JSON.stringify(runtime.labId)}]`,
  );
  await expect(button).toHaveCount(1);
  await button.click();
  await settleExactRuntime(root, `reset:${runtime.labId}`);
}

async function clickMode(root: Locator, mode: SignedRealNumberLineExactMode) {
  const button = root.locator(`[data-viz-mode-button][data-viz-mode=${JSON.stringify(mode)}]`);
  await expect(button).toHaveCount(1);
  await button.click();
  await settleExactRuntime(root, `mode:${mode}`);
}

async function selectControl(root: Locator, parameter: string, value: string) {
  const control = root.locator(`select[data-viz-parameter=${JSON.stringify(parameter)}]`);
  await expect(control).toHaveCount(1);
  await control.selectOption(value);
  await settleExactRuntime(root, `select:${parameter}:${value}`);
}

async function preparePlan(root: Locator, plan: Extract<StatePlan, { mode: SignedRealNumberLineExactMode }>) {
  await clickMode(root, plan.mode);
  const preparation: Preparation = "prepare" in plan ? (plan.prepare ?? {}) : {};
  for (const [parameter, value] of Object.entries(preparation)) {
    await selectControl(root, parameter, value);
  }
}

function plannedControlRequest(
  runtime: RuntimeCase,
  mode: SignedRealNumberLineExactMode,
  parameter: string,
  value: string | number,
): SignedRealNumberLineActionRequest {
  if (parameter === "value-kind" || parameter === "left-kind") {
    return { kind: "controller", controller: "number-kind", value };
  }
  const requestedValue = parameter.endsWith("-sign")
    ? Number(value) === -1
      ? -1
      : 1
    : value;
  if (
    runtime.kind === "real" &&
    (parameter === "value-sign" || parameter === "left-sign")
  ) {
    return { kind: "control", control: "value-sign", value: requestedValue };
  }
  if (
    runtime.kind === "real" &&
    (parameter === "value-radicand" || parameter === "left-radicand")
  ) {
    return { kind: "control", control: "value-radicand", value };
  }
  if (
    runtime.kind === "rational" &&
    (mode === "compare" || mode === "multiply" || mode === "divide") &&
    parameter === "right-numerator"
  ) {
    return { kind: "control", control: "right-rational-numerator", value };
  }
  if (
    runtime.kind === "rational" &&
    (mode === "compare" || mode === "multiply" || mode === "divide") &&
    parameter === "right-denominator"
  ) {
    return { kind: "control", control: "right-rational-denominator", value };
  }
  if (runtime.kind === "quadratic-radical" && parameter.startsWith("right-")) {
    const suffix = parameter.slice("right-".length);
    const control =
      suffix === "coefficient-numerator"
        ? "right-surd-coefficient-numerator"
        : suffix === "coefficient-denominator"
          ? "right-surd-coefficient-denominator"
          : "right-surd-radicand";
    return { kind: "control", control, value };
  }
  return { kind: "control", control: parameter, value: requestedValue };
}

async function executeNormalPlan(
  root: Locator,
  runtime: RuntimeCase,
  plan: Exclude<StatePlan, { kind: "special" }>,
  planIndex: number,
) : Promise<ExecutedAction> {
  if (plan.kind === "initial") {
    return {
      beforeSignature: await controlSignature(root),
      plannedRequest: { kind: "initial", topicId: runtime.labId },
      targetParameter: null,
    };
  }
  if (planIndex > 0 && plan.kind !== "reset") await reset(root, runtime);
  if (plan.kind === "reset") {
    const beforeSignature = await controlSignature(root);
    await reset(root, runtime);
    return {
      beforeSignature,
      plannedRequest: { kind: "reset", topicId: runtime.labId },
      targetParameter: null,
    };
  }
  if (plan.kind === "mode") {
    const beforeSignature = await controlSignature(root);
    await clickMode(root, plan.mode);
    return {
      beforeSignature,
      plannedRequest: {
        kind: "controller",
        controller: "mode",
        value: plan.mode,
      },
      targetParameter: null,
    };
  }
  await preparePlan(root, plan);
  const beforeSignature = await controlSignature(root);
  if (plan.kind === "select") {
    await selectControl(root, plan.parameter, plan.value);
    return {
      beforeSignature,
      plannedRequest: plannedControlRequest(
        runtime,
        plan.mode,
        plan.parameter,
        plan.value,
      ),
      targetParameter: plan.parameter,
    };
  }
  const controls = controlMap(await visibleControls(root));
  const snapshot = controls.get(plan.parameter);
  if (!snapshot) fail(`${plan.id}: missing visible range ${plan.parameter}.`);
  const value = endpointValue(snapshot, plan.endpoint);
  await setRange(
    root.locator(`input[type=range][data-viz-parameter=${JSON.stringify(plan.parameter)}]`),
    value,
  );
  await settleExactRuntime(root, plan.id);
  return {
    beforeSignature,
    plannedRequest: plannedControlRequest(
      runtime,
      plan.mode,
      plan.parameter,
      value,
    ),
    targetParameter: plan.parameter,
  };
}

async function executeSpecialPlan(
  root: Locator,
  runtime: RuntimeCase,
  plan: Extract<StatePlan, { kind: "special" }>,
): Promise<ExecutedAction> {
  const range = (parameter: string) => root.locator(`input[type=range][data-viz-parameter=${JSON.stringify(parameter)}]`);
  if (plan.scenario === "zero-sign") {
    if (plan.step === "negative") {
      await reset(root, runtime);
      await clickMode(root, "radical");
      const beforeSignature = await controlSignature(root);
      await selectControl(root, "value-sign", "-1");
      return {
        beforeSignature,
        plannedRequest: { kind: "control", control: "value-sign", value: -1 },
        targetParameter: "value-sign",
      };
    } else if (plan.step === "project-zero") {
      const beforeSignature = await controlSignature(root);
      await setRange(range("value-radicand"), 0);
      await settleExactRuntime(root, plan.id);
      await expect(root.locator("[data-mainland-signed-real-number-line]")).toHaveAttribute("data-viz-value-sign", "1");
      return {
        beforeSignature,
        plannedRequest: { kind: "control", control: "value-radicand", value: 0 },
        targetParameter: "value-radicand",
      };
    } else if (plan.step === "reject-negative-zero") {
      const beforeSignature = await controlSignature(root);
      await selectControl(root, "value-sign", "-1");
      await expect(root.locator("[data-viz-control-error]")).toHaveCount(1);
      await expect(root.locator("[data-mainland-signed-real-number-line]")).toHaveAttribute("data-viz-value-sign", "1");
      return {
        beforeSignature,
        plannedRequest: { kind: "control", control: "value-sign", value: -1 },
        targetParameter: "value-sign",
      };
    } else {
      const beforeSignature = await controlSignature(root);
      await setRange(range("value-radicand"), 9);
      await settleExactRuntime(root, plan.id);
      await expect(root.locator("[data-mainland-signed-real-number-line]")).toHaveAttribute("data-viz-value-sign", "1");
      return {
        beforeSignature,
        plannedRequest: { kind: "control", control: "value-radicand", value: 9 },
        targetParameter: "value-radicand",
      };
    }
  }
  if (plan.scenario === "rational-divisor") {
    let beforeSignature: ControlSignature;
    let plannedRequest: SignedRealNumberLineActionRequest;
    if (plan.step === "zero-outside-divide") {
      await reset(root, runtime);
      await clickMode(root, "multiply");
      beforeSignature = await controlSignature(root);
      await setRange(range("right-numerator"), 0);
      plannedRequest = {
        kind: "control",
        control: "right-rational-numerator",
        value: 0,
      };
    } else if (plan.step === "project-enter-divide") {
      beforeSignature = await controlSignature(root);
      await clickMode(root, "divide");
      await expect(range("right-numerator")).toHaveValue("1");
      plannedRequest = { kind: "controller", controller: "mode", value: "divide" };
    } else if (plan.step === "reject-direct-zero") {
      beforeSignature = await controlSignature(root);
      await setRange(range("right-numerator"), 0);
      await expect(root.locator("[data-viz-control-error]")).toHaveCount(1);
      await expect(range("right-numerator")).toHaveValue("1");
      plannedRequest = {
        kind: "control",
        control: "right-rational-numerator",
        value: 0,
      };
    } else if (plan.step === "leave-divide") {
      beforeSignature = await controlSignature(root);
      await clickMode(root, "multiply");
      await expect(range("right-numerator")).toHaveValue("1");
      plannedRequest = { kind: "controller", controller: "mode", value: "multiply" };
    } else {
      beforeSignature = await controlSignature(root);
      await clickMode(root, "divide");
      await expect(range("right-numerator")).toHaveValue("1");
      plannedRequest = { kind: "controller", controller: "mode", value: "divide" };
    }
    await settleExactRuntime(root, plan.id);
    return { beforeSignature, plannedRequest, targetParameter: "right-numerator" };
  }
  if (plan.scenario === "radical-divisor") {
    let beforeSignature: ControlSignature;
    let plannedRequest: SignedRealNumberLineActionRequest;
    let targetParameter: string | null = null;
    if (plan.step === "zero-coefficient-outside-divide") {
      await reset(root, runtime);
      await clickMode(root, "radical-multiply");
      beforeSignature = await controlSignature(root);
      await setRange(range("right-coefficient-numerator"), 0);
      plannedRequest = {
        kind: "control",
        control: "right-surd-coefficient-numerator",
        value: 0,
      };
      targetParameter = "right-coefficient-numerator";
    } else if (plan.step === "zero-radicand-outside-divide") {
      beforeSignature = await controlSignature(root);
      await setRange(range("right-radicand"), 0);
      plannedRequest = {
        kind: "control",
        control: "right-surd-radicand",
        value: 0,
      };
      targetParameter = "right-radicand";
    } else if (plan.step === "project-enter-divide") {
      beforeSignature = await controlSignature(root);
      await clickMode(root, "radical-divide");
      await expect(range("right-coefficient-numerator")).toHaveValue("1");
      await expect(range("right-radicand")).toHaveValue("1");
      plannedRequest = {
        kind: "controller",
        controller: "mode",
        value: "radical-divide",
      };
    } else if (plan.step === "reject-zero-coefficient") {
      beforeSignature = await controlSignature(root);
      await setRange(range("right-coefficient-numerator"), 0);
      await expect(root.locator("[data-viz-control-error]")).toHaveCount(1);
      await expect(range("right-coefficient-numerator")).toHaveValue("1");
      plannedRequest = {
        kind: "control",
        control: "right-surd-coefficient-numerator",
        value: 0,
      };
      targetParameter = "right-coefficient-numerator";
    } else if (plan.step === "reject-zero-radicand") {
      beforeSignature = await controlSignature(root);
      await setRange(range("right-radicand"), 0);
      await expect(root.locator("[data-viz-control-error]")).toHaveCount(1);
      await expect(range("right-radicand")).toHaveValue("1");
      plannedRequest = {
        kind: "control",
        control: "right-surd-radicand",
        value: 0,
      };
      targetParameter = "right-radicand";
    } else if (plan.step === "leave-divide") {
      beforeSignature = await controlSignature(root);
      await clickMode(root, "radical-multiply");
      plannedRequest = {
        kind: "controller",
        controller: "mode",
        value: "radical-multiply",
      };
    } else {
      beforeSignature = await controlSignature(root);
      await clickMode(root, "radical-divide");
      await expect(range("right-coefficient-numerator")).toHaveValue("1");
      await expect(range("right-radicand")).toHaveValue("1");
      plannedRequest = {
        kind: "controller",
        controller: "mode",
        value: "radical-divide",
      };
    }
    await settleExactRuntime(root, plan.id);
    return { beforeSignature, plannedRequest, targetParameter };
  }
  await reset(root, runtime);
  let beforeSignature: ControlSignature;
  let plannedRequest: SignedRealNumberLineActionRequest;
  let targetParameter: string;
  if (plan.scenario === "sqrt4-rational2") {
    await clickMode(root, "compare");
    await selectControl(root, "left-kind", "radical");
    await setRange(range("left-radicand"), 4);
    await setRange(range("left-index"), 2);
    await selectControl(root, "right-kind", "rational");
    await setRange(range("right-numerator"), 2);
    await settleExactRuntime(root, `${plan.id}:right-numerator`);
    beforeSignature = await controlSignature(root);
    await setRange(range("right-denominator"), 1);
    plannedRequest = {
      kind: "control",
      control: "right-denominator",
      value: 1,
    };
    targetParameter = "right-denominator";
  } else {
    await clickMode(root, "radical");
    await selectControl(root, "value-sign", "1");
    await setRange(range("value-radicand"), 2);
    await settleExactRuntime(root, `${plan.id}:value-radicand`);
    beforeSignature = await controlSignature(root);
    await setRange(range("value-index"), 2);
    plannedRequest = { kind: "control", control: "value-index", value: 2 };
    targetParameter = "value-index";
  }
  await settleExactRuntime(root, plan.id);
  return { beforeSignature, plannedRequest, targetParameter };
}

async function assertIdentityAndReceipts(root: Locator, runtime: RuntimeCase) {
  await expect(root).toHaveAttribute("data-viz-active-lab-id", runtime.labId);
  await expect(root).toHaveAttribute("data-viz-module-id", configuredModuleId);
  await expect(root).toHaveAttribute("data-viz-topic-id", runtime.labId);
  await expect(root).toHaveAttribute("data-viz-lesson-session-owner", "first-control-interaction");
  await expect(root).toHaveAttribute("data-viz-production-renderer", "mainland-signed-real-number-line");
  const owner = root.locator(`[data-mainland-signed-real-number-line=${JSON.stringify(runtime.labId)}]`);
  await expect(owner).toHaveCount(1);
  await expect(owner).toHaveAttribute("data-viz-configured-model", SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT.version);
  const action = await actionReceipt(root);
  await expect(owner).toHaveAttribute(
    "data-viz-control-transition-status",
    action.status,
  );
  const mode = await owner.getAttribute("data-viz-mode");
  if (!mode || !runtime.modes.includes(mode as SignedRealNumberLineExactMode)) {
    fail(`${runtime.labId}: leaked mode ${JSON.stringify(mode)}.`);
  }
  const descriptor = getSignedRealNumberLineControlDomainDescriptor(
    runtime.labId,
    mode as SignedRealNumberLineExactMode,
  );
  await expect(owner).toHaveAttribute("data-viz-control-domain-id", descriptor.domainId);
  expect(parseJson(await owner.getAttribute("data-viz-control-requested"))).toEqual(
    action.request,
  );
  expect(parseJson(await owner.getAttribute("data-viz-control-expected"))).toEqual(
    action.expected,
  );
  expect(parseJson(await owner.getAttribute("data-viz-control-observed"))).toEqual(
    action.observed,
  );
  const buttons = root.locator("[data-viz-mode-button]");
  await expect(buttons).toHaveCount(runtime.modes.length);
  expect(await buttons.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-viz-mode")))).toEqual([...runtime.modes]);
  await expect(root.locator('[data-viz-mode-button][data-viz-mode-active="true"]')).toHaveCount(1);
  const geometry = root.locator(`[data-viz-geometry=${JSON.stringify(SIGNED_REAL_NUMBER_LINE_GEOMETRY_CONTRACT.version)}]`);
  await expect(geometry).toHaveCount(1);
  await expect(geometry).toBeVisible();
  await expect(root.locator('[data-viz-name="exact-symbolic-value"]')).toHaveCount(1);
  await expect(root.locator('[data-viz-name="decimal-receipt"]')).toHaveCount(1);
  await expect(root.locator('[data-viz-name="decimal-bounds"]')).toHaveCount(1);
  await expect(root.locator('[data-viz-name="geometry-receipt"]')).toHaveCount(1);
  const configuredState = await owner.getAttribute("data-viz-configured-state");
  expect(configuredState).toMatch(/^signed-real-number-line-v1\|/u);
  return {
    geometry,
    mode: mode as SignedRealNumberLineExactMode,
    owner,
  };
}

async function auditGeometry(geometry: Locator, plan: StatePlan) {
  const points = geometry.locator("[data-viz-geometry-point]");
  const count = await points.count();
  expect(count).toBeGreaterThan(0);
  const receipt = geometry.locator('[data-viz-name="geometry-receipt"]');
  expect(Number(await receipt.getAttribute("data-viz-geometry-candidates"))).toBe(count);
  const snapshots = await points.evaluateAll((elements) => elements.map((element) => ({
    exactKey: element.getAttribute("data-viz-exact-key") ?? "",
    lower: Number(element.getAttribute("data-viz-pixel-lower")),
    marker: element.querySelector("[data-viz-point-marker]") !== null,
    owner: element.getAttribute("data-viz-colocation-owner") ?? "",
    reason: element.getAttribute("data-viz-colocation-reason") ?? "",
    rendered: Number(element.getAttribute("data-viz-rendered-x")),
    semanticId: element.getAttribute("data-viz-geometry-point") ?? "",
    upper: Number(element.getAttribute("data-viz-pixel-upper")),
  })));
  for (const point of snapshots) {
    expect(point.owner.trim().length).toBeGreaterThan(0);
    expect(point.reason.trim().length).toBeGreaterThan(0);
    expect(Number.isFinite(point.lower)).toBe(true);
    expect(Number.isFinite(point.upper)).toBe(true);
    expect(point.lower).toBeLessThanOrEqual(point.rendered);
    expect(point.rendered).toBeLessThanOrEqual(point.upper);
  }
  const byKey = new Map<string, typeof snapshots>();
  for (const point of snapshots) byKey.set(point.exactKey, [...(byKey.get(point.exactKey) ?? []), point]);
  for (const colocated of byKey.values()) {
    expect(colocated.filter((point) => point.marker)).toHaveLength(1);
    expect(new Set(colocated.map((point) => point.owner)).size).toBe(1);
  }
  if (plan.kind === "special" && plan.scenario === "sqrt4-rational2") {
    const shared = [...byKey.values()].find((values) => values.length >= 2);
    expect(shared, "sqrt(4) and rational 2 must share one exact owner").toBeDefined();
    expect(shared?.filter((point) => point.marker)).toHaveLength(1);
  }
  if (plan.kind === "special" && plan.scenario === "irrational-certified") {
    expect(snapshots.some((point) => point.lower < point.upper)).toBe(true);
  }
  return snapshots;
}

async function auditNeutralInvariants(root: Locator) {
  const invariants = root.locator("[data-viz-invariant]");
  expect(await invariants.count()).toBeGreaterThan(0);
  for (const invariant of await invariants.all()) {
    const status = await invariant.getAttribute("data-viz-invariant-status");
    const applicable = await invariant.getAttribute("data-viz-invariant-applicable");
    expect(["pass", "fail", "not-applicable"]).toContain(status);
    if (status === "not-applicable") {
      expect(applicable).toBe("false");
      expect(await invariant.textContent()).not.toContain("✓");
      expect((await invariant.getAttribute("class")) ?? "").not.toContain("emerald");
    } else {
      expect(applicable).toBe("true");
    }
  }
}

async function auditTouchAndOverflow(root: Locator) {
  const targets = await root.evaluate((element) =>
    Array.from(element.querySelectorAll<HTMLElement>(
      "[data-viz-mode-button], input[data-viz-parameter], select[data-viz-parameter], [data-viz-reset-model]",
    )).filter((target) => {
      const rect = target.getBoundingClientRect();
      const style = getComputedStyle(target);
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
  const scroll = root.locator('[data-viz-scroll-container="true"]');
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

function expectedRejection(plan: StatePlan): SignedRealNumberLineControlDomainErrorCode | null {
  if (
    plan.kind === "special" &&
    ((plan.scenario === "zero-sign" && plan.step === "reject-negative-zero") ||
      (plan.scenario === "rational-divisor" && plan.step === "reject-direct-zero") ||
      (plan.scenario === "radical-divisor" &&
        (plan.step === "reject-zero-coefficient" ||
          plan.step === "reject-zero-radicand")))
  ) {
    return "DIRECT_REQUEST_VIOLATES_DOMAIN";
  }
  return null;
}

function expectedProjections(
  plan: StatePlan,
  before: ControlSignature,
): readonly SignedRealNumberLineControlProjection[] {
  if (
    plan.kind === "special" &&
    plan.scenario === "zero-sign" &&
    plan.step === "project-zero"
  ) {
    return [
      {
        affectedControl: "value-sign",
        previousValue: -1,
        expectedValue: 1,
        projection: "canonical-zero-sign",
        reason: "zero-has-no-negative-sign",
      },
    ];
  }
  if (
    plan.kind === "special" &&
    plan.scenario === "rational-divisor" &&
    plan.step === "project-enter-divide"
  ) {
    return [
      {
        affectedControl: "right-rational-numerator",
        previousValue: 0,
        expectedValue: 1,
        projection: "exclude-zero-divisor",
        reason: "division-requires-nonzero-rational-divisor",
      },
    ];
  }
  if (
    plan.kind === "special" &&
    plan.scenario === "radical-divisor" &&
    plan.step === "project-enter-divide"
  ) {
    return [
      {
        affectedControl: "right-surd-coefficient-numerator",
        previousValue: 0,
        expectedValue: 1,
        projection: "exclude-zero-divisor",
        reason: "division-requires-nonzero-surd-coefficient",
      },
      {
        affectedControl: "right-surd-radicand",
        previousValue: 0,
        expectedValue: 1,
        projection: "exclude-zero-divisor",
        reason: "division-requires-nonzero-surd-radicand",
      },
    ];
  }
  void before;
  return [];
}

function oracleRational(
  numerator: number,
  denominator = 1,
): ExactRationalInput {
  return { kind: "rational", numerator, denominator };
}

function oracleRadical(
  radicand: number,
  index = 2,
  sign: -1 | 1 = 1,
): Extract<ExactRealInput, { kind: "radical" }> {
  return {
    kind: "radical",
    radicand: Math.abs(radicand),
    index,
    sign: radicand === 0 ? 1 : sign,
  };
}

function oracleSurd(
  coefficientNumerator: number,
  radicand: number,
  coefficientDenominator = 1,
): QuadraticSurdInput {
  return {
    kind: "quadratic-surd",
    coefficient: oracleRational(
      coefficientNumerator,
      coefficientDenominator,
    ),
    radicand,
  };
}

function oracleCanonicalExactInput(value: ExactRealInput): ExactRealInput {
  return value.kind === "rational"
    ? oracleRational(value.numerator, value.denominator)
    : oracleRadical(value.radicand, value.index, value.sign ?? 1);
}

function oracleCanonicalInput(
  input: SignedRealNumberLineInput,
): SignedRealNumberLineInput {
  switch (input.mode) {
    case "locate":
    case "absolute-value":
    case "radical":
    case "classify":
    case "estimate":
      return { ...input, value: oracleCanonicalExactInput(input.value) };
    case "compare":
      return {
        ...input,
        left: oracleCanonicalExactInput(input.left),
        right: oracleCanonicalExactInput(input.right),
      };
    default:
      return input;
  }
}

function oracleControlStateFromInput(
  input: SignedRealNumberLineInput,
): SignedRealNumberLineControlState {
  let numberKind: SignedRealNumberLineControlState["numberKind"] = "rational";
  let valueSign: -1 | 1 = 1;
  let valueRadicand = 2;
  let rightRationalNumerator = 1;
  let rightRationalDenominator = 1;
  let rightSurdCoefficientNumerator = 1;
  let rightSurdCoefficientDenominator = 1;
  let rightSurdRadicand = 2;
  const primary =
    input.mode === "compare"
      ? input.left
      : input.mode === "locate" ||
          input.mode === "absolute-value" ||
          input.mode === "radical" ||
          input.mode === "classify" ||
          input.mode === "estimate"
        ? input.value
        : null;
  if (primary) numberKind = primary.kind;
  if (
    input.mode === "simplify" ||
    input.mode === "estimate-check" ||
    input.mode === "radical-add" ||
    input.mode === "radical-subtract" ||
    input.mode === "radical-multiply" ||
    input.mode === "radical-divide"
  ) {
    numberKind = "quadratic-surd";
  } else if (input.mode === "square-root" || input.mode === "cube-root") {
    numberKind = "radical";
  }
  if (primary?.kind === "radical") {
    valueSign = primary.sign ?? 1;
    valueRadicand = primary.radicand;
  } else if (input.mode === "square-root" || input.mode === "cube-root") {
    valueSign = input.radicand < 0 ? -1 : 1;
    valueRadicand = Math.abs(input.radicand);
  } else if (input.mode === "simplify" || input.mode === "estimate-check") {
    valueRadicand = input.value.radicand;
  }
  if (
    (input.mode === "compare" ||
      input.mode === "multiply" ||
      input.mode === "divide") &&
    input.right.kind === "rational"
  ) {
    rightRationalNumerator = input.right.numerator;
    rightRationalDenominator = input.right.denominator;
  }
  if (
    input.mode === "radical-add" ||
    input.mode === "radical-subtract" ||
    input.mode === "radical-multiply" ||
    input.mode === "radical-divide"
  ) {
    valueRadicand = input.left.radicand;
    rightSurdCoefficientNumerator = input.right.coefficient.numerator;
    rightSurdCoefficientDenominator = input.right.coefficient.denominator;
    rightSurdRadicand = input.right.radicand;
  }
  return createSignedRealNumberLineControlState(input.labId, input.mode, {
    numberKind,
    valueSign,
    valueRadicand,
    rightRationalNumerator,
    rightRationalDenominator,
    rightSurdCoefficientNumerator,
    rightSurdCoefficientDenominator,
    rightSurdRadicand,
  });
}

function oracleInputForMode(
  labId: SignedRealNumberLineLabId,
  mode: SignedRealNumberLineExactMode,
  controls: SignedRealNumberLineControlState,
): SignedRealNumberLineInput {
  const precision = 3;
  const exactValue =
    controls.numberKind === "radical"
      ? oracleRadical(
          controls.valueRadicand,
          2,
          controls.valueSign,
        )
      : oracleRational(-3, 2);
  switch (mode) {
    case "locate":
    case "absolute-value":
    case "classify":
    case "estimate":
      return { labId, mode, precision, value: exactValue };
    case "radical":
      return {
        labId,
        mode,
        precision,
        value: oracleRadical(
          controls.valueRadicand,
          2,
          controls.valueSign,
        ),
      };
    case "compare":
      return {
        labId,
        mode,
        precision,
        left: exactValue,
        right: oracleRational(
          controls.rightRationalNumerator,
          controls.rightRationalDenominator,
        ),
      };
    case "add":
    case "subtract":
      return {
        labId,
        mode,
        precision,
        start: oracleRational(-3, 2),
        step: oracleRational(mode === "add" ? 5 : -5, 4),
      };
    case "multiply":
    case "divide":
      return {
        labId,
        mode,
        precision,
        left: oracleRational(-3, 2),
        right: oracleRational(
          controls.rightRationalNumerator,
          controls.rightRationalDenominator,
        ),
      };
    case "opposite":
      return { labId, mode, precision, value: oracleRational(-7, 3) };
    case "square-root":
    case "cube-root":
      return {
        labId,
        mode,
        precision,
        radicand:
          mode === "cube-root"
            ? controls.valueSign * controls.valueRadicand
            : controls.valueRadicand,
      };
    case "simplify":
    case "estimate-check":
      return {
        labId,
        mode,
        precision,
        value: oracleSurd(1, controls.valueRadicand),
      };
    case "radical-add":
    case "radical-subtract":
      return {
        labId,
        mode,
        precision,
        left: oracleSurd(2, controls.valueRadicand),
        right: oracleSurd(
          controls.rightSurdCoefficientNumerator,
          controls.rightSurdRadicand,
          controls.rightSurdCoefficientDenominator,
        ),
      };
    case "radical-multiply":
    case "radical-divide":
      return {
        labId,
        mode,
        precision,
        left: oracleSurd(1, controls.valueRadicand),
        right: oracleSurd(
          controls.rightSurdCoefficientNumerator,
          controls.rightSurdRadicand,
          controls.rightSurdCoefficientDenominator,
        ),
      };
  }
}

function oracleInputAfterDomainTransition(
  current: SignedRealNumberLineInput,
  expected: SignedRealNumberLineControlState,
  request: SignedRealNumberLineControlRequest,
): SignedRealNumberLineInput {
  if (request.control === "mode" || request.control === "number-kind") {
    return oracleInputForMode(current.labId, expected.mode, expected);
  }
  if (request.control === "value-sign" || request.control === "value-radicand") {
    if (
      current.mode === "locate" ||
      current.mode === "absolute-value" ||
      current.mode === "radical" ||
      current.mode === "classify" ||
      current.mode === "estimate"
    ) {
      if (current.value.kind !== "radical") return current;
      return {
        ...current,
        value: oracleRadical(
          expected.valueRadicand,
          current.value.index,
          expected.valueSign,
        ),
      };
    }
    if (current.mode === "compare" && current.left.kind === "radical") {
      return {
        ...current,
        left: oracleRadical(
          expected.valueRadicand,
          current.left.index,
          expected.valueSign,
        ),
      };
    }
    if (current.mode === "square-root" || current.mode === "cube-root") {
      return {
        ...current,
        radicand:
          current.mode === "cube-root"
            ? expected.valueSign * expected.valueRadicand
            : expected.valueRadicand,
      };
    }
    return current;
  }
  if (
    request.control === "right-rational-numerator" ||
    request.control === "right-rational-denominator"
  ) {
    if (
      (current.mode === "compare" ||
        current.mode === "multiply" ||
        current.mode === "divide") &&
      current.right.kind === "rational"
    ) {
      return {
        ...current,
        right: oracleRational(
          expected.rightRationalNumerator,
          expected.rightRationalDenominator,
        ),
      };
    }
    return current;
  }
  if (
    request.control === "right-surd-coefficient-numerator" ||
    request.control === "right-surd-coefficient-denominator" ||
    request.control === "right-surd-radicand"
  ) {
    if (
      current.mode === "radical-add" ||
      current.mode === "radical-subtract" ||
      current.mode === "radical-multiply" ||
      current.mode === "radical-divide"
    ) {
      return {
        ...current,
        right: oracleSurd(
          expected.rightSurdCoefficientNumerator,
          expected.rightSurdRadicand,
          expected.rightSurdCoefficientDenominator,
        ),
      };
    }
  }
  return current;
}

function oracleDomainRequest(
  runtime: RuntimeCase,
  request: SignedRealNumberLineActionRequest,
): SignedRealNumberLineControlRequest | null {
  if (request.kind === "controller") {
    if (request.controller === "mode") {
      return {
        control: "mode",
        value: request.value as SignedRealNumberLineExactMode,
      };
    }
    if (request.controller === "number-kind") {
      return {
        control: "number-kind",
        value: request.value as SignedRealNumberLineControlState["numberKind"],
      };
    }
    return null;
  }
  if (request.kind !== "control") return null;
  const control = request.control;
  const isDomainControl =
    (runtime.kind === "real" &&
      (control === "value-sign" || control === "value-radicand")) ||
    (runtime.kind === "rational" &&
      (control === "right-rational-numerator" ||
        control === "right-rational-denominator")) ||
    (runtime.kind === "quadratic-radical" &&
      (control === "right-surd-coefficient-numerator" ||
        control === "right-surd-coefficient-denominator" ||
        control === "right-surd-radicand"));
  if (!isDomainControl) return null;
  return request as unknown as SignedRealNumberLineControlRequest;
}

function oracleNormalInputTransition(
  current: SignedRealNumberLineInput,
  request: Extract<SignedRealNumberLineActionRequest, { kind: "control" }>,
): SignedRealNumberLineInput {
  const next = JSON.parse(JSON.stringify(current)) as Record<string, unknown>;
  if (request.control === "precision") {
    next.precision = request.value;
    return next as unknown as SignedRealNumberLineInput;
  }
  const match = request.control.match(
    /^(value|left|right|start|step)-(kind|sign|radicand|index|numerator|denominator|coefficient-numerator|coefficient-denominator)$/u,
  );
  if (!match) fail(`G03 oracle cannot apply ${request.control}.`);
  const [, prefix, field] = match;
  if (field === "kind") {
    next[prefix] =
      request.value === "radical"
        ? oracleRadical(2)
        : oracleRational(-3, 2);
    return next as unknown as SignedRealNumberLineInput;
  }
  const target = next[prefix];
  if (!isRecord(target)) fail(`G03 oracle ${prefix} input is not an object.`);
  if (field === "coefficient-numerator" || field === "coefficient-denominator") {
    const coefficient = target.coefficient;
    if (!isRecord(coefficient)) fail(`G03 oracle ${prefix} has no coefficient.`);
    coefficient[field === "coefficient-numerator" ? "numerator" : "denominator"] =
      request.value;
  } else {
    target[field] = request.value;
  }
  return next as unknown as SignedRealNumberLineInput;
}

function oracleExpectedAction(
  runtime: RuntimeCase,
  executed: ExecutedAction,
  receipt: SignedRealNumberLineActionReceipt,
) {
  const beforeInput = receipt.before.input as unknown as SignedRealNumberLineInput;
  const beforeModel = buildSignedRealNumberLineModel(beforeInput);
  expect(beforeModel.stateKey).toBe(executed.beforeSignature.state);
  expect(
    executed.beforeSignature,
    "G03 pre-action DOM signature drifted from the pure oracle",
  ).toEqual(
    oracleSignatureForInput(
      runtime,
      beforeInput,
      executed.beforeSignature.actionReceipt,
    ),
  );
  if (executed.plannedRequest.kind === "initial") {
    const input = pinnedTopicManifest[runtime.labId]
      .reset as unknown as SignedRealNumberLineInput;
    return {
      controls: oracleControlStateFromInput(input),
      input,
      projections: [] as readonly SignedRealNumberLineControlProjection[],
      rejection: null,
    };
  }
  if (executed.plannedRequest.kind === "reset") {
    const input = pinnedTopicManifest[runtime.labId]
      .reset as unknown as SignedRealNumberLineInput;
    return {
      controls: oracleControlStateFromInput(input),
      input,
      projections: [] as readonly SignedRealNumberLineControlProjection[],
      rejection: null,
    };
  }
  const beforeControls = oracleControlStateFromInput(beforeInput);
  expect(receipt.before.controlState).toEqual(beforeControls);
  const domainRequest = oracleDomainRequest(runtime, executed.plannedRequest);
  if (domainRequest) {
    try {
      const transition = planSignedRealNumberLineControlTransition(
        beforeControls,
        domainRequest,
      );
      const input = oracleCanonicalInput(
        oracleInputAfterDomainTransition(
          beforeInput,
          transition.expected,
          domainRequest,
        ),
      );
      return {
        controls: transition.expected,
        input,
        projections: transition.projections,
        rejection: null,
      };
    } catch (error) {
      if (!(error instanceof SignedRealNumberLineControlDomainError)) throw error;
      return {
        controls: beforeControls,
        input: beforeInput,
        projections: [] as readonly SignedRealNumberLineControlProjection[],
        rejection: error.code,
      };
    }
  }
  if (executed.plannedRequest.kind !== "control") {
    fail("G03 oracle received an unsupported action request.");
  }
  const input = oracleCanonicalInput(
    oracleNormalInputTransition(beforeInput, executed.plannedRequest),
  );
  return {
    controls: oracleControlStateFromInput(input),
    input,
    projections: [] as readonly SignedRealNumberLineControlProjection[],
    rejection: null,
  };
}

function oracleParametersForInput(
  runtime: RuntimeCase,
  input: SignedRealNumberLineInput,
) {
  const parameters: string[] = [];
  const rationalPair = (prefix: string) =>
    parameters.push(`${prefix}-numerator`, `${prefix}-denominator`);
  const exact = (prefix: string, value: ExactRealInput, includeKind: boolean) => {
    if (includeKind) parameters.push(`${prefix}-kind`);
    if (value.kind === "rational") rationalPair(prefix);
    else parameters.push(`${prefix}-sign`, `${prefix}-radicand`, `${prefix}-index`);
  };
  const surd = (prefix: string) =>
    parameters.push(
      `${prefix}-coefficient-numerator`,
      `${prefix}-coefficient-denominator`,
      `${prefix}-radicand`,
    );
  if (runtime.kind === "rational") {
    if (
      input.mode === "locate" ||
      input.mode === "opposite" ||
      input.mode === "absolute-value"
    ) {
      rationalPair("value");
    } else if (
      input.mode === "compare" ||
      input.mode === "multiply" ||
      input.mode === "divide"
    ) {
      rationalPair("left");
      rationalPair("right");
    } else if (input.mode === "add" || input.mode === "subtract") {
      rationalPair("start");
      rationalPair("step");
    } else fail(`${runtime.labId}: invalid rational oracle mode ${input.mode}.`);
  } else if (runtime.kind === "real") {
    if (
      input.mode === "locate" ||
      input.mode === "absolute-value" ||
      input.mode === "classify" ||
      input.mode === "estimate"
    ) {
      exact("value", input.value, true);
    } else if (input.mode === "compare") {
      exact("left", input.left, true);
      exact("right", input.right, true);
    } else if (input.mode === "radical") {
      exact("value", input.value, false);
    } else if (input.mode === "square-root") {
      parameters.push("value-radicand");
    } else if (input.mode === "cube-root") {
      parameters.push("value-sign", "value-radicand");
    } else fail(`${runtime.labId}: invalid real oracle mode ${input.mode}.`);
  } else if (input.mode === "simplify" || input.mode === "estimate-check") {
    surd("value");
  } else if (
    input.mode === "radical-add" ||
    input.mode === "radical-subtract" ||
    input.mode === "radical-multiply" ||
    input.mode === "radical-divide"
  ) {
    surd("left");
    surd("right");
  } else fail(`${runtime.labId}: invalid radical oracle mode ${input.mode}.`);
  parameters.push("precision");
  return parameters;
}

function oracleControlValue(
  input: SignedRealNumberLineInput,
  parameter: string,
): string {
  if (parameter === "precision") return String(input.precision);
  if (
    (input.mode === "square-root" || input.mode === "cube-root") &&
    parameter === "value-radicand"
  ) {
    return String(Math.abs(input.radicand));
  }
  if (input.mode === "cube-root" && parameter === "value-sign") {
    return String(input.radicand < 0 ? -1 : 1);
  }
  const match = parameter.match(
    /^(value|left|right|start|step)-(kind|sign|radicand|index|numerator|denominator|coefficient-numerator|coefficient-denominator)$/u,
  );
  if (!match) fail(`G03 oracle cannot read ${parameter}.`);
  const [, prefix, field] = match;
  const source = (input as unknown as Record<string, unknown>)[prefix];
  if (!isRecord(source)) fail(`G03 oracle ${prefix} input is missing.`);
  if (field === "coefficient-numerator" || field === "coefficient-denominator") {
    const coefficient = source.coefficient;
    if (!isRecord(coefficient)) fail(`G03 oracle ${prefix} coefficient is missing.`);
    return String(
      coefficient[field === "coefficient-numerator" ? "numerator" : "denominator"],
    );
  }
  return String(source[field]);
}

function oracleControlsForInput(
  runtime: RuntimeCase,
  input: SignedRealNumberLineInput,
): readonly ControlSnapshot[] {
  return oracleParametersForInput(runtime, input).map((parameter) => {
    if (parameter.endsWith("-kind") || parameter.endsWith("-sign")) {
      return {
        disabled: false,
        kind: "select" as const,
        max: null,
        min: null,
        options: parameter.endsWith("-kind")
          ? (["rational", "radical"] as const)
          : (["-1", "1"] as const),
        parameter,
        step: null,
        value: oracleControlValue(input, parameter),
      };
    }
    return {
      disabled: false,
      kind: "range" as const,
      ...rangeDescriptor(parameter),
      options: [] as const,
      parameter,
      value: oracleControlValue(input, parameter),
    };
  });
}

function oracleProjectionModel(
  value: ExactRealInput,
  precision: number,
): SignedRealNumberLineModel {
  return buildSignedRealNumberLineModel({
    labId:
      value.kind === "rational"
        ? "bnu-junior-s1-upper-rational-numbers"
        : "bnu-junior-s2-upper-real-numbers",
    mode: "locate",
    precision,
    value,
  });
}

function oracleGeometry(
  model: SignedRealNumberLineModel,
  input: SignedRealNumberLineInput,
) {
  const points = [
    {
      semanticId: "origin",
      model: oracleProjectionModel(oracleRational(0), model.precision),
    },
    { semanticId: "primary", model },
  ];
  if (input.mode === "compare") {
    points.push({
      semanticId: "comparison",
      model: oracleProjectionModel(input.right, model.precision),
    });
  }
  if (model.operation) {
    points.push({
      semanticId: "operation-start",
      model: oracleProjectionModel(
        oracleRational(
          model.operation.start.numerator,
          model.operation.start.denominator,
        ),
        model.precision,
      ),
    });
    points.push({
      semanticId: "operation-endpoint",
      model: oracleProjectionModel(
        oracleRational(
          model.operation.endpoint.numerator,
          model.operation.endpoint.denominator,
        ),
        model.precision,
      ),
    });
  }
  return buildSignedRealNumberLineGeometry({ points });
}

function oracleSignatureForInput(
  runtime: RuntimeCase,
  input: SignedRealNumberLineInput,
  actionReceiptValue: string,
): ControlSignature {
  const model = buildSignedRealNumberLineModel(input);
  const geometry = oracleGeometry(model, input);
  return {
    actionReceipt: actionReceiptValue,
    controls: canonicalEvidenceControls(
      runtime,
      oracleControlsForInput(runtime, input),
    ),
    domainId: getSignedRealNumberLineControlDomainDescriptor(
      runtime.labId,
      input.mode,
    ).domainId,
    geometryOwners: geometry.points.map((point) => ({
      exactKey: point.exactKey,
      ownerId: point.coLocation.ownerId,
      renderMarker: point.coLocation.renderMarker,
      semanticId: point.semanticId,
    })),
    geometryState: geometry.stateKey,
    invariantStates: model.invariantReceipts.map((invariant) =>
      [
        invariant.id,
        invariant.status,
        invariant.expected,
        invariant.observed,
      ].join("|"),
    ),
    mode: input.mode,
    semanticState: model.stateKey,
    state: model.stateKey,
  };
}

function oracleActionSnapshot(
  input: SignedRealNumberLineInput,
  controls: SignedRealNumberLineControlState,
  pendingRequest: SignedRealNumberLineActionRequest | null,
): SignedRealNumberLineActionSnapshot {
  return {
    labId: input.labId,
    mode: input.mode,
    configuredState: buildSignedRealNumberLineModel(input).stateKey,
    input: input as unknown as SignedRealNumberLineActionSnapshot["input"],
    controlState:
      controls as unknown as SignedRealNumberLineActionSnapshot["controlState"],
    pendingRequest,
  };
}

function expectedSignatureForAction(
  runtime: RuntimeCase,
  executed: ExecutedAction,
  receipt: SignedRealNumberLineActionReceipt,
  observed: ControlSignature,
): ControlSignature {
  const oracle = oracleExpectedAction(runtime, executed, receipt);
  const beforeInput = receipt.before.input as unknown as SignedRealNumberLineInput;
  const beforeControls = oracleControlStateFromInput(beforeInput);
  const beforeSnapshot = oracleActionSnapshot(beforeInput, beforeControls, null);
  const requestedSnapshot = oracleActionSnapshot(
    beforeInput,
    beforeControls,
    executed.plannedRequest,
  );
  const settledSnapshot = oracleActionSnapshot(
    oracle.input,
    oracle.controls,
    null,
  );
  expect(receipt.before, "G03 action before snapshot drifted from the pure oracle").toEqual(
    beforeSnapshot,
  );
  expect(
    receipt.requested,
    "G03 requested snapshot did not bind the exact request to the full prior state",
  ).toEqual(requestedSnapshot);
  expect(receipt.projections).toEqual(oracle.projections);
  expect(receipt.rejection).toBe(oracle.rejection);
  expect(receipt.status).toBe(oracle.rejection ? "rejected" : "accepted");
  if (oracle.rejection) {
    expect(receipt.expected).toEqual(beforeSnapshot);
    expect(receipt.observed).toEqual(beforeSnapshot);
  } else {
    expect(receipt.expected).toEqual(settledSnapshot);
    expect(receipt.observed).toEqual(settledSnapshot);
  }
  const expectedInput = oracle.rejection ? beforeInput : oracle.input;
  return oracleSignatureForInput(
    runtime,
    expectedInput,
    observed.actionReceipt,
  );
}

function assertExactOracleSignature(
  label: string,
  actual: ControlSignature,
  expected: ControlSignature,
) {
  if (stableJson(actual) !== stableJson(expected)) {
    fail(`${label}: exact oracle signature mismatch.`);
  }
}

function assertExactOracleSignatureMismatch(
  label: string,
  actual: ControlSignature,
  expected: ControlSignature,
) {
  let rejected = false;
  try {
    assertExactOracleSignature(label, actual, expected);
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message === `${label}: exact oracle signature mismatch.`
    ) {
      rejected = true;
    } else {
      throw error;
    }
  }
  if (!rejected) fail(`${label}: corrupted surface was accepted.`);
}

function assertOracleRejectsCorruption(
  label: string,
  expected: ControlSignature,
  corrupt: (signature: ControlSignature) => ControlSignature,
) {
  const corrupted = corrupt(
    JSON.parse(JSON.stringify(expected)) as ControlSignature,
  );
  assertExactOracleSignatureMismatch(label, corrupted, expected);
}

function syntheticAcceptedActionCase(input: {
  beforeInput: SignedRealNumberLineInput;
  expectedControls: SignedRealNumberLineControlState;
  expectedInput: SignedRealNumberLineInput;
  label: string;
  plannedRequest: SignedRealNumberLineActionRequest;
  projections: readonly SignedRealNumberLineControlProjection[];
  runtime: RuntimeCase;
}) {
  const beforeControls = oracleControlStateFromInput(input.beforeInput);
  const beforeSignature = oracleSignatureForInput(
    input.runtime,
    input.beforeInput,
    `${input.label}:before`,
  );
  const beforeSnapshot = oracleActionSnapshot(
    input.beforeInput,
    beforeControls,
    null,
  );
  const settledSnapshot = oracleActionSnapshot(
    input.expectedInput,
    input.expectedControls,
    null,
  );
  const receipt = createSignedRealNumberLineAcceptedActionReceipt({
    request: input.plannedRequest,
    before: beforeSnapshot,
    requested: oracleActionSnapshot(
      input.beforeInput,
      beforeControls,
      input.plannedRequest,
    ),
    expected: settledSnapshot,
    observed: settledSnapshot,
    projections: input.projections,
  });
  const canonicalSignature = oracleSignatureForInput(
    input.runtime,
    input.expectedInput,
    stableJson(receipt),
  );
  return {
    canonicalSignature,
    executed: {
      beforeSignature,
      plannedRequest: input.plannedRequest,
      targetParameter: null,
    } satisfies ExecutedAction,
    receipt,
    runtime: input.runtime,
  };
}

function assertSyntheticActionOracleRejectsObservedFallback(
  label: string,
  synthetic: ReturnType<typeof syntheticAcceptedActionCase>,
) {
  const correctExpected = expectedSignatureForAction(
    synthetic.runtime,
    synthetic.executed,
    synthetic.receipt,
    synthetic.canonicalSignature,
  );
  assertExactOracleSignature(
    `${label}: correct oracle`,
    correctExpected,
    synthetic.canonicalSignature,
  );

  const corruptions = [
    {
      id: "visible-value",
      apply: (signature: ControlSignature): ControlSignature => ({
        ...signature,
        controls: signature.controls.map((control, index) =>
          index === 0 ? { ...control, value: "999" } : control,
        ),
      }),
    },
    {
      id: "configured-state",
      apply: (signature: ControlSignature): ControlSignature => ({
        ...signature,
        state: `${signature.state}:corrupted`,
      }),
    },
    {
      id: "semantic-state",
      apply: (signature: ControlSignature): ControlSignature => ({
        ...signature,
        semanticState: `${signature.semanticState}:corrupted`,
      }),
    },
    {
      id: "combined-surface",
      apply: (signature: ControlSignature): ControlSignature => ({
        ...signature,
        controls: signature.controls.map((control, index) =>
          index === 0 ? { ...control, value: "999" } : control,
        ),
        semanticState: `${signature.semanticState}:corrupted`,
        state: `${signature.state}:corrupted`,
      }),
    },
  ] as const;

  for (const corruption of corruptions) {
    const corruptedObserved = corruption.apply(
      JSON.parse(
        JSON.stringify(synthetic.canonicalSignature),
      ) as ControlSignature,
    );
    const expectedFromCorruptedObserved = expectedSignatureForAction(
      synthetic.runtime,
      synthetic.executed,
      synthetic.receipt,
      corruptedObserved,
    );
    assertExactOracleSignature(
      `${label}:${corruption.id}: expected resolver ignored observed corruption`,
      expectedFromCorruptedObserved,
      synthetic.canonicalSignature,
    );
    assertExactOracleSignatureMismatch(
      `${label}:${corruption.id}: observed versus expected`,
      corruptedObserved,
      expectedFromCorruptedObserved,
    );
  }

  const legacyObservedReturnFallback = corruptions.at(-1)!.apply(
    synthetic.canonicalSignature,
  );
  assertExactOracleSignatureMismatch(
    `${label}: legacy return-observed mutation`,
    legacyObservedReturnFallback,
    synthetic.canonicalSignature,
  );
}

function assertSurfaceChangeOracleCanaries() {
  let modeTransitionCount = 0;
  for (const runtime of runtimeCases) {
    const resetInput = pinnedTopicManifest[runtime.labId]
      .reset as unknown as SignedRealNumberLineInput;
    const resetSignature = oracleSignatureForInput(
      runtime,
      resetInput,
      "reset-oracle",
    );
    assertOracleRejectsCorruption(
      `${runtime.labId}: reset visible value corruption`,
      resetSignature,
      (signature) => ({
        ...signature,
        controls: signature.controls.map((control, index) =>
          index === 0 ? { ...control, value: "999" } : control,
        ),
      }),
    );
    assertOracleRejectsCorruption(
      `${runtime.labId}: reset configured-state corruption`,
      resetSignature,
      (signature) => ({
        ...signature,
        semanticState: `${signature.semanticState}:corrupted`,
        state: `${signature.state}:corrupted`,
      }),
    );

    const resetControls = oracleControlStateFromInput(resetInput);
    for (const mode of runtime.modes) {
      const transition = planSignedRealNumberLineControlTransition(
        resetControls,
        { control: "mode", value: mode },
      );
      const modeInput = oracleCanonicalInput(
        oracleInputAfterDomainTransition(
          resetInput,
          transition.expected,
          { control: "mode", value: mode },
        ),
      );
      const signature = oracleSignatureForInput(
        runtime,
        modeInput,
        `mode-oracle:${mode}`,
      );
      assertExactOracleSignature(
        `${runtime.labId}: mode ${mode}`,
        signature,
        oracleSignatureForInput(
          runtime,
          oracleInputForMode(runtime.labId, mode, transition.expected),
          `mode-oracle:${mode}`,
        ),
      );
      assertOracleRejectsCorruption(
        `${runtime.labId}: mode ${mode} control/state corruption`,
        signature,
        (candidate) => ({
          ...candidate,
          controls: candidate.controls.map((control, index) =>
            index === 0 ? { ...control, value: "999" } : control,
          ),
          semanticState: `${candidate.semanticState}:corrupted`,
          state: `${candidate.state}:corrupted`,
        }),
      );
      modeTransitionCount += 1;
    }
  }

  const rationalRuntime = runtimeCases.find(
    ({ labId }) => labId === "bnu-junior-s1-upper-rational-numbers",
  );
  if (!rationalRuntime) fail("G03 rational mode-transition canary is missing.");
  const resetInput = pinnedTopicManifest[rationalRuntime.labId]
    .reset as unknown as SignedRealNumberLineInput;
  const resetControls = oracleControlStateFromInput(resetInput);
  const transition = planSignedRealNumberLineControlTransition(resetControls, {
    control: "mode",
    value: "compare",
  });
  const compareInput = oracleInputAfterDomainTransition(
    resetInput,
    transition.expected,
    { control: "mode", value: "compare" },
  );
  const compareSignature = oracleSignatureForInput(
    rationalRuntime,
    compareInput,
    "mode-oracle:compare",
  );
  assertOracleRejectsCorruption(
    "locate-to-compare values/configured-state corruption",
    compareSignature,
    (signature) => ({
      ...signature,
      controls: signature.controls.map((control) =>
        control.parameter === "left-numerator"
          ? { ...control, value: "999" }
          : control.parameter === "right-denominator"
            ? { ...control, value: "12" }
            : control,
      ),
      semanticState: `${signature.semanticState}:corrupted`,
      state: `${signature.state}:corrupted`,
    }),
  );

  assertSyntheticActionOracleRejectsObservedFallback(
    "reset synthetic action",
    syntheticAcceptedActionCase({
      beforeInput: compareInput,
      expectedControls: resetControls,
      expectedInput: resetInput,
      label: "reset-synthetic",
      plannedRequest: {
        kind: "reset",
        topicId: rationalRuntime.labId,
      },
      projections: [],
      runtime: rationalRuntime,
    }),
  );
  assertSyntheticActionOracleRejectsObservedFallback(
    "mode synthetic action",
    syntheticAcceptedActionCase({
      beforeInput: resetInput,
      expectedControls: transition.expected,
      expectedInput: compareInput,
      label: "mode-synthetic",
      plannedRequest: {
        kind: "controller",
        controller: "mode",
        value: "compare",
      },
      projections: transition.projections,
      runtime: rationalRuntime,
    }),
  );

  const realRuntime = runtimeCases.find(
    ({ labId }) => labId === "bnu-junior-s2-upper-real-numbers",
  );
  if (!realRuntime) fail("G03 real number-kind canary is missing.");
  const rationalLocateControls = createSignedRealNumberLineControlState(
    realRuntime.labId,
    "locate",
    { numberKind: "rational" },
  );
  const rationalLocateInput = oracleInputForMode(
    realRuntime.labId,
    "locate",
    rationalLocateControls,
  );
  const numberKindTransition = planSignedRealNumberLineControlTransition(
    rationalLocateControls,
    { control: "number-kind", value: "radical" },
  );
  const radicalLocateInput = oracleCanonicalInput(
    oracleInputAfterDomainTransition(
      rationalLocateInput,
      numberKindTransition.expected,
      { control: "number-kind", value: "radical" },
    ),
  );
  assertSyntheticActionOracleRejectsObservedFallback(
    "number-kind synthetic action",
    syntheticAcceptedActionCase({
      beforeInput: rationalLocateInput,
      expectedControls: numberKindTransition.expected,
      expectedInput: radicalLocateInput,
      label: "number-kind-synthetic",
      plannedRequest: {
        kind: "controller",
        controller: "number-kind",
        value: "radical",
      },
      projections: numberKindTransition.projections,
      runtime: realRuntime,
    }),
  );
  const expectedModeTransitionCount = runtimeCases.reduce(
    (total, runtime) => total + runtime.modes.length,
    0,
  );
  if (modeTransitionCount !== expectedModeTransitionCount) {
    fail(
      `G03 mode-transition oracle count drifted; expected=${expectedModeTransitionCount} actual=${modeTransitionCount}.`,
    );
  }
}

assertSurfaceChangeOracleCanaries();

async function bindActionEvidence(
  root: Locator,
  runtime: RuntimeCase,
  plan: StatePlan,
  executed: ExecutedAction,
): Promise<ActionEvidence> {
  const receipt = await actionReceipt(root);
  expect(receipt.request).toEqual(executed.plannedRequest);
  expect(receipt.before.configuredState).toBe(executed.beforeSignature.state);
  expect(receipt.before.mode).toBe(executed.beforeSignature.mode);
  expect(receipt.before.labId).toBe(runtime.labId);
  expect(receipt.requested.pendingRequest).toEqual(executed.plannedRequest);
  const rejection = expectedRejection(plan);
  expect(receipt.rejection).toBe(rejection);
  expect(receipt.status).toBe(rejection ? "rejected" : "accepted");
  expect(receipt.projections).toEqual(
    expectedProjections(plan, executed.beforeSignature),
  );
  if (receipt.status === "rejected") {
    expect(receipt.expected).toEqual(receipt.before);
    expect(receipt.observed).toEqual(receipt.before);
  } else {
    expect(receipt.observed).toEqual(receipt.expected);
  }
  if (plan.kind === "initial" || plan.kind === "reset") {
    const resetOracle = pinnedTopicManifest[runtime.labId].reset;
    expect(receipt.expected.input).toEqual(resetOracle);
    expect(receipt.expected.mode).toBe(resetOracle.mode);
    expect(receipt.expected.labId).toBe(runtime.labId);
    if (plan.kind === "reset") {
      expect(receipt.request).toEqual({ kind: "reset", topicId: runtime.labId });
    }
  }
  const observedSignature = await controlSignature(root);
  assertPinnedControlSurface(runtime, observedSignature);
  const expectedSignature = expectedSignatureForAction(
    runtime,
    executed,
    receipt,
    observedSignature,
  );
  assertExactOracleSignature(
    `${runtime.labId}:${plan.id}: observed versus expected`,
    observedSignature,
    expectedSignature,
  );
  return {
    beforeSignature: executed.beforeSignature,
    expectedSignature,
    observedSignature,
    plannedRequest: executed.plannedRequest,
    projections: receipt.projections,
    receipt,
  };
}

function bindPlannedDescriptorToReceipt(
  descriptor: PlannedStateDescriptor,
  receipt: Readonly<{
    action: ActionEvidence;
    configuredState: string | null;
    mode: SignedRealNumberLineExactMode;
    stateId: string;
  }>,
) {
  if (receipt.configuredState === null) {
    fail(`${descriptor.stateId}: configured state is absent.`);
  }
  const configuredParts = receipt.configuredState.split("|");
  const configuredLab = configuredParts[1]?.startsWith("lab=")
    ? configuredParts[1].slice("lab=".length)
    : "";
  const expected = expectedStateDescriptorById.get(receipt.stateId);
  if (
    expected === undefined ||
    stableJson(descriptor) !== stableJson(expected) ||
    descriptor.stateId !== receipt.stateId ||
    descriptor.labId !== configuredLab ||
    descriptor.plan.mode !== receipt.mode ||
    descriptor.plan.kind !== receipt.action.plannedRequest.kind ||
    stableJson(descriptor.plan.request) !==
      stableJson(receipt.action.plannedRequest)
  ) {
    fail(`${descriptor.stateId}: planned semantic descriptor does not bind to its real receipt.`);
  }
  const expectedControlParameter = receipt.action.plannedRequest.kind === "control"
    ? receipt.action.plannedRequest.control
    : receipt.action.plannedRequest.kind === "controller"
      ? receipt.action.plannedRequest.controller
      : null;
  if (descriptor.plan.controlParameter !== expectedControlParameter) {
    fail(`${descriptor.stateId}: descriptor control parameter drifted from its real request.`);
  }
  return descriptor;
}

async function auditState(
  root: Locator,
  runtime: RuntimeCase,
  plan: StatePlan,
  stateId: string,
  executed: ExecutedAction,
) {
  await settleExactRuntime(root, stateId);
  const action = await bindActionEvidence(root, runtime, plan, executed);
  const completeSignatureBeforeScans = await controlSignature(root);
  const { geometry, mode, owner } = await assertIdentityAndReceipts(root, runtime);
  const renderedControls = await visibleControls(root);
  expect(renderedControls.length).toBeGreaterThan(0);
  for (const control of renderedControls) expect(control.disabled).toBe(false);
  const controls = completeSignatureBeforeScans.controls;
  const geometryReceipt = await auditGeometry(geometry, plan);
  await auditNeutralInvariants(root);
  const collision = chinaVisualizationCollisionReceipt(
    await scanHkVisualizationCollisions(root, stateId),
  );
  const contrast = await root.evaluate(scanHkVisualizationTextContrast, {
    authoringSelector: "[data-viz-authoring-only], [data-viz-manim-authoring-dock]",
  });
  expect(contrast.checkedTextCount).toBeGreaterThan(0);
  expect(contrast.worst).not.toBeNull();
  expect(contrast.issues).toEqual([]);
  const layout = await auditTouchAndOverflow(root);
  await root.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  const completeSignatureAfterScans = await controlSignature(root);
  expect(
    completeSignatureAfterScans,
    `${stateId}: runtime drifted during collision/contrast/layout scans`,
  ).toEqual(completeSignatureBeforeScans);
  return {
    action,
    collision,
    configuredState: await owner.getAttribute("data-viz-configured-state"),
    contrast: {
      audited: contrast.checkedTextCount,
      minRatio: contrast.worst?.contrastRatio,
      requiredRatio: contrast.worst?.requiredRatio,
    },
    controls,
    geometry: geometryReceipt,
    layout,
    mode,
    stateId,
  };
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
  expect(decodeURIComponent(request.headers()["x-mais-visualization-user-id"] ?? "")).toBe(userId);
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
  assertExactOwnKeys(
    `${runtime.labId}: first-control ACK session`,
    delivery.session,
    [
      "completedAt",
      "explored",
      "moduleId",
      "source",
      "topicId",
      "updatedAt",
    ],
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
  const resetMode = pinnedTopicManifest[runtime.labId].reset.mode;
  const probeMode = runtime.modes.find((mode) => mode !== resetMode);
  if (!probeMode) {
    fail(`${runtime.labId}: no non-reset durability probe mode is available.`);
  }
  const probeContract = exactDurabilityProbeContract(runtime, probeMode);
  const beforeFirst = await controlSignature(root);
  const resetInput = pinnedTopicManifest[runtime.labId]
    .reset as unknown as SignedRealNumberLineInput;
  assertExactOracleSignature(
    `${runtime.labId}: durability probe starts from canonical reset`,
    beforeFirst,
    oracleSignatureForInput(runtime, resetInput, beforeFirst.actionReceipt),
  );

  const modeButton = root.locator(
    `[data-viz-mode-button][data-viz-mode=${JSON.stringify(probeMode)}]`,
  );
  await expect(modeButton).toHaveCount(1);
  await expect(modeButton).toBeVisible();
  await expect(modeButton).toBeEnabled();
  await expect(modeButton).toHaveAttribute("data-viz-mode-active", "false");
  await expect(modeButton).toHaveAttribute("aria-pressed", "false");

  const firstFence = await durability.armRealControl({
    expectedButtonClick: probeContract.first.expectedButtonClick,
    ordinal: probeContract.first.ordinal,
  });
  const sessionPromise = page.waitForResponse(
    (candidate) => {
      const candidateUrl = new URL(candidate.url());
      return (
        candidate.request().method() === "POST" &&
        candidateUrl.origin === new URL(page.url()).origin &&
        candidateUrl.pathname === "/api/visualization-sessions" &&
        candidateUrl.search === "" &&
        candidateUrl.hash === ""
      );
    },
    { timeout: 30_000 },
  );
  await modeButton.click();
  const sessionAcknowledgement =
    await awaitFirstSessionAck(sessionPromise, runtime, userId);
  const first = await durability.finishFirstRealControl({
    fence: firstFence,
    includeRaw,
    root,
  });
  expect(first.expectedControl).toEqual(
    probeContract.first.expectedButtonClick,
  );
  expect(first.controlEvents.map(({ controlKey, key, type }) => ({
    controlKey,
    key,
    type,
  }))).toEqual([
    { controlKey: probeMode, key: null, type: "pointerup" },
    { controlKey: probeMode, key: null, type: "click" },
  ]);
  const firstAction = await bindActionEvidence(
    root,
    runtime,
    { id: `durability-probe:mode:${probeMode}`, kind: "mode", mode: probeMode },
    {
      beforeSignature: beforeFirst,
      plannedRequest: {
        controller: "mode",
        kind: "controller",
        value: probeMode,
      },
      targetParameter: null,
    },
  );
  expect(firstAction.observedSignature.mode).toBe(probeMode);
  expect(firstAction.observedSignature.domainId).toBe(
    getSignedRealNumberLineControlDomainDescriptor(runtime.labId, probeMode)
      .domainId,
  );

  const beforeSecond = firstAction.observedSignature;
  const resetButton = root.locator(
    `[data-viz-reset-model][data-viz-reset-module-id=${JSON.stringify(configuredModuleId)}][data-viz-reset-topic-id=${JSON.stringify(runtime.labId)}]`,
  );
  await expect(resetButton).toHaveCount(1);
  await expect(resetButton).toBeVisible();
  await expect(resetButton).toBeEnabled();
  const secondFence = await durability.armRealControl({
    expectedButtonClick: probeContract.second.expectedButtonClick,
    ordinal: probeContract.second.ordinal,
  });
  await resetButton.click();
  const second = await durability.finishSecondRealControl({
    fence: secondFence,
    root,
  });
  const controlObserverStop = second.controlObserverStop;
  expect(controlObserverStop).toMatchObject({
    active: false,
    eventCount: 4,
    lastSequence: 4,
    removalCount: 1,
    removedEventTypes: ["change", "click", "input", "keyup", "pointerup"],
    removedExactlyOnce: true,
    removedListenerCount: 5,
  });
  expect(controlObserverStop.stopId).toBe(
    `${controlObserverStop.adapterId}:control-observer-stop:1`,
  );
  expect(controlObserverStop.events).toEqual([
    ...first.controlEvents,
    ...second.controlEvents,
  ]);
  expect(Object.isFrozen(controlObserverStop)).toBe(true);
  expect(Object.isFrozen(controlObserverStop.events)).toBe(true);
  expect(controlObserverStop.events.every((event) => Object.isFrozen(event))).toBe(
    true,
  );
  expect(second.expectedControl).toEqual(
    probeContract.second.expectedButtonClick,
  );
  expect(second.controlEvents.map(({ controlKey, key, type }) => ({
    controlKey,
    key,
    type,
  }))).toEqual([
    { controlKey: runtime.labId, key: null, type: "pointerup" },
    { controlKey: runtime.labId, key: null, type: "click" },
  ]);
  const secondAction = await bindActionEvidence(
    root,
    runtime,
    { id: "reset", kind: "reset" },
    {
      beforeSignature: beforeSecond,
      plannedRequest: { kind: "reset", topicId: runtime.labId },
      targetParameter: null,
    },
  );
  assertExactOracleSignature(
    `${runtime.labId}: durability probe ends at canonical reset`,
    secondAction.observedSignature,
    oracleSignatureForInput(
      runtime,
      resetInput,
      secondAction.observedSignature.actionReceipt,
    ),
  );
  return { controlObserverStop, first, firstAction, second, secondAction, sessionAcknowledgement } as const;
}

function assertCanonicalRunner(testInfo: TestInfo) {
  expect(testInfo.retry, "G03 release evidence forbids retries").toBe(0);
  expect(testInfo.repeatEachIndex, "G03 release evidence forbids repeats").toBe(0);
  expect(testInfo.config.shard, "G03 release evidence forbids sharding").toBeNull();
  const grep = Array.isArray(testInfo.config.grep)
    ? testInfo.config.grep
    : [testInfo.config.grep];
  expect(
    grep.every((pattern) => pattern.source === ".*" && pattern.flags === ""),
    "G03 release evidence forbids grep filtering",
  ).toBe(true);
  expect(testInfo.config.grepInvert).toBeNull();
  expect(testInfo.config.maxFailures).toBe(0);
  expect(testInfo.config.workers).toBe(1);
  expect(testInfo.config.projects.map(({ name }) => name).sort()).toEqual(
    [...supportedProjects].sort(),
  );
  for (const project of testInfo.config.projects) {
    expect(project.repeatEach).toBe(1);
    expect(project.retries).toBe(0);
  }
  if (!testInfo.outputDir.startsWith("/Volumes/Starship/")) {
    fail(`G03 output escaped Starship: ${testInfo.outputDir}.`);
  }
  const manifestPath = process.env.PLAYWRIGHT_PATH_MANIFEST_PATH;
  if (!manifestPath?.startsWith("/Volumes/Starship/")) {
    fail(`G03 path manifest escaped Starship: ${String(manifestPath)}.`);
  }
  const manifest = parseJson(readFileSync(manifestPath, "utf8"));
  if (!isRecord(manifest) || !isRecord(manifest.contract) || !isRecord(manifest.paths)) {
    fail("G03 Starship path manifest is malformed.");
  }
  expect(manifest.contract.mutablePathsOnlyOnStarship).toBe(true);
  expect(manifest.contract.starshipRoot).toBe("/Volumes/Starship");
  for (const [label, value] of Object.entries(manifest.paths)) {
    if (typeof value !== "string" || !value.startsWith("/Volumes/Starship/")) {
      fail(`G03 path manifest ${label} escaped Starship: ${String(value)}.`);
    }
  }
}

const executedChunkIds: string[] = [];
const executedStateIds: string[] = [];
const executedRawReplayTopicIds: string[] = [];
const executedProjectNames = new Set<string>();
const expectedRawReplayCountAcrossReport = exactLabIds.length;
const expectedRawReplayProjects = ["desktop-chrome"] as const;
if (expectedRawReplayCountAcrossReport !== 6) {
  fail("G03 report-wide raw replay quota must remain exactly six topics.");
}

test.describe("Mainland G03 signed real production route acceptance", () => {
  test.describe.configure({ mode: "serial", retries: 0 });

  test.afterAll(() => {
    expect(executedChunkIds, "G03 chunk ledger rejects grep/shard/partial").toEqual(expectedChunkIds);
    expect(executedStateIds, "G03 state ledger rejects gap/duplicate/order drift").toEqual(expectedStateIds);
    expect(new Set(executedStateIds).size).toBe(expectedStateIds.length);
    const expectedRawTopics = executedProjectNames.has("desktop-chrome")
      ? [...exactLabIds]
      : [];
    expect(
      executedRawReplayTopicIds,
      "G03 raw replay ledger requires one canonical desktop representative per topic and none on mobile",
    ).toEqual(expectedRawTopics);
    expect(new Set(executedRawReplayTopicIds).size).toBe(
      executedRawReplayTopicIds.length,
    );
  });

  for (const [chunkIndex, chunk] of runtimeChunks.entries()) {
    const title = expectedTestTitles[chunkIndex]!;
    test(title, async ({ baseURL, page }, testInfo) => {
      test.setTimeout(45_000 + chunk.plans.length * 30_000);
      assertCanonicalRunner(testInfo);
      expect(supportedProjects).toContain(testInfo.project.name);
      const starshipPaths = starshipPathReceipt(testInfo);
      const databasePath = starshipPaths.databasePath;
      if (typeof databasePath !== "string") {
        fail(`${chunk.id}: Starship database path is absent.`);
      }
      const viewport = page.viewportSize();
      expect(viewport).not.toBeNull();
      if (!viewport) fail("Playwright exposed no viewport.");
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
      const student = await registerMainlandStudent(page, testInfo, chunk);
      expect(await visualizationSessions(page)).toEqual([]);
      if (page.url() !== "about:blank") {
        fail(`${chunk.id}: registration navigated the bound page before durability arm.`);
      }
      if (typeof baseURL !== "string") {
        fail(`${chunk.id}: Playwright exposed no application baseURL.`);
      }
      const appOrigin = new URL(baseURL).origin;
      const lessonSlug = lessonSlugForTopicId(chunk.runtime.labId);
      const siblingTopicIds = exactLabIds.filter(
        (topicId) => topicId !== chunk.runtime.labId,
      );
      const learnerProfileSetup =
        await prepareVisualizationLessonLearnerProfileBeforeArm({
          appOrigin,
          page,
          userId: student.userId,
        });
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
        rootSelector: `[data-viz-active-lab-id=${JSON.stringify(chunk.runtime.labId)}]`,
        controlSelector:
          "[data-viz-mode-button], [data-viz-parameter], [data-viz-reset-model]",
        readRuntimeDigest: async (activeRoot) => controlSignature(activeRoot),
      });
      await durability.armBeforeNavigation({ learnerProfileSetup });
      const response = await page.goto(`/student/lessons/${encodeURIComponent(lessonSlug)}`, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBeLessThan(400);

      const section = page.locator("section#visualization");
      await expect(section).toHaveCount(1);
      const activeSelector = `[data-viz-active-lab-id=${JSON.stringify(chunk.runtime.labId)}]`;
      await expect(page.locator(activeSelector)).toHaveCount(1);
      const root = section.locator(activeSelector);
      await expect(root).toBeVisible({ timeout: 30_000 });
      expect(
        ((await page.locator("html").getAttribute("class")) ?? "")
          .split(/\s+/u)
          .includes("dark"),
      ).toBe(student.theme === "dark");
      await assertIdentityAndReceipts(root, chunk.runtime);

      const rawReplayRepresentative =
        testInfo.project.name === "desktop-chrome" && chunk.index === 0;
      const mountDurability = await durability.waitForMountTerminal({
        deadlineMs: 30_000,
        includeRaw: rawReplayRepresentative,
        root,
      });
      expect(await visualizationSessions(page)).toEqual([]);
      expect(mountWriteViolations(writes)).toEqual([]);

      let initialCanonicalReceipt:
        | Awaited<ReturnType<typeof auditState>>
        | null = null;
      const firstChunkPlan = chunk.plans[0];
      if (firstChunkPlan?.kind === "initial") {
        const initialStateId = `${chunk.runtime.labId}:${firstChunkPlan.id}`;
        const beforeSignature = await controlSignature(root);
        initialCanonicalReceipt = await auditState(
          root,
          chunk.runtime,
          firstChunkPlan,
          initialStateId,
          {
            beforeSignature,
            plannedRequest: {
              kind: "initial",
              topicId: chunk.runtime.labId,
            },
            targetParameter: null,
          },
        );
        expect(initialCanonicalReceipt.stateId).toBe(initialStateId);
        expect(initialCanonicalReceipt.action.plannedRequest).toEqual({
          kind: "initial",
          topicId: chunk.runtime.labId,
        });
        expect(await visualizationSessions(page)).toEqual([]);
      }

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
      expect(probeSessionWrites).toEqual([
        {
          body: {
            moduleId: configuredModuleId,
            source: chunk.runtime.lab.analyticsSource,
            topicId: chunk.runtime.labId,
          },
          method: "POST",
          pathname: "/api/visualization-sessions",
          stage: "interaction",
        },
      ]);

      const receipts: unknown[] = [];
      const plannedStateDescriptors: PlannedStateDescriptor[] = [];
      let priorPlan: StatePlan | undefined;
      for (const [planIndex, plan] of chunk.plans.entries()) {
        const stateId = `${chunk.runtime.labId}:${plan.id}`;
        const isAtomicContinuation =
          plan.kind === "special" &&
          priorPlan?.kind === "special" &&
          plan.atomicGroup === priorPlan.atomicGroup;
        let receipt: Awaited<ReturnType<typeof auditState>>;
        if (plan.kind === "initial") {
          if (initialCanonicalReceipt === null) {
            fail(
              `${chunk.id}: canonical initial receipt was not captured before the durability probe.`,
            );
          }
          receipt = initialCanonicalReceipt;
        } else {
          let executed: ExecutedAction;
          if (plan.kind === "special") {
            if (!isAtomicContinuation && planIndex > 0) {
              await reset(root, chunk.runtime);
            }
            executed = await executeSpecialPlan(root, chunk.runtime, plan);
          } else {
            executed = await executeNormalPlan(
              root,
              chunk.runtime,
              plan,
              planIndex,
            );
          }
          receipt = await auditState(
            root,
            chunk.runtime,
            plan,
            stateId,
            executed,
          );
        }
        receipts.push(receipt);
        plannedStateDescriptors.push(
          bindPlannedDescriptorToReceipt(
            plannedStateDescriptor(chunk.runtime, plan),
            receipt,
          ),
        );
        priorPlan = plan;
      }

      const actualStateIds = receipts.map((receipt) => (receipt as { stateId: string }).stateId);
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
      expect(writes.filter((write) => isApiFamilyPath(write.pathname, "/api/gamification") || isApiFamilyPath(write.pathname, "/api/rewards"))).toEqual([]);
      for (const write of writes.filter((entry) => entry.pathname === "/api/learning-events")) {
        for (const event of visualizationLearningEvents(write.body)) {
          expect(event).toMatchObject({ topicId: chunk.runtime.labId });
        }
      }
      const durableSessions = await visualizationSessions(page);
      expect(durableSessions).toEqual([
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
      expect(await visualizationSessions(page)).toEqual(durableSessions);
      const durabilityReceipt: VisualizationLessonDurabilityFinalReceipt =
        await durability.finalReceipt();
      expect(durabilityReceipt.coverage).toBe(
        rawReplayRepresentative ? "full-raw-replay" : "browser",
      );
      expect(durabilityReceipt.directReplayCount).toBe(
        rawReplayRepresentative ? 1 : 0,
      );
      expect(durabilityReceipt.controlObserverStop).toBe(durabilityProbe.controlObserverStop);
      expect(durabilityReceipt.second.controlObserverStop).toBe(durabilityProbe.controlObserverStop);
      expect(durabilityReceipt.controlObserverStop).toBe(durabilityReceipt.second.controlObserverStop);
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

      await testInfo.attach(`china-mainland-g03-${chunk.id}-${testInfo.project.name}.json`, {
        body: Buffer.from(JSON.stringify({
          canonicalExecutionCount: expectedCanonicalExecutionCount,
          chunkId: chunk.id,
          collisionScannerSha256,
          contrastScannerSha256,
          controlDomainVersion: SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_CONTRACT.version,
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
                "desktop-chrome:first-canonical-chunk-per-g03-topic",
              topicId: chunk.runtime.labId,
            },
          },
          expectedChunkIds,
          expectedStateCountPerProject,
          expectedStateDescriptorPlanSha256,
          expectedStatePlanSha256,
          geometryVersion: SIGNED_REAL_NUMBER_LINE_GEOMETRY_CONTRACT.version,
          integrationSourceSha256,
          producerSourceSha256,
          observedStateDescriptorPlanSha256,
          observedStatePlanSha256,
          plannedStateDescriptors,
          plannedStateIds: chunk.plans.map((plan) => `${chunk.runtime.labId}:${plan.id}`),
          project: testInfo.project.name,
          receipts,
          sourceAggregates: {
            durabilityBrowserPairSha256:
              observedDurabilityBrowserPairAggregateSha256,
            durabilityFourFileSha256:
              observedDurabilityFourFileAggregateSha256,
            durabilitySerialization: durabilitySourceAggregateSerialization,
            scannerEntries: scannerAggregateEntries.map(({ repoPath }) =>
              repoPath,
            ),
            scannerSerialization: scannerSourceAggregateSerialization,
            scannerSha256: observedScannerSourceAggregateSha256,
          },
          schemaVersion: "china-mainland-g03-signed-real-production.v3",
          stateDescriptorSerializer,
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
