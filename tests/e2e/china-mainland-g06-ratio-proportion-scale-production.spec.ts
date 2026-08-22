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
  RATIO_PROPORTION_SCALE_ACTION_RECEIPT_CONTRACT,
  RATIO_PROPORTION_SCALE_CONTROL_DOMAIN_CONTRACT,
  RatioProportionScaleControlDomainError,
  createRatioProportionScaleControlDomainState,
  getRatioProportionScaleControlDomainDescriptor,
  planRatioProportionScaleControlTransition,
  type RatioProportionScaleControlDomainErrorCode,
  type RatioProportionScaleNumericControlId,
  type RatioProportionScaleUnitControlId,
} from "../../components/visualizations/mainland/RatioProportionScaleControlDomain";
import {
  RATIO_PROPORTION_SCALE_LAB_ID,
  RATIO_PROPORTION_SCALE_MODEL_CONTRACT,
  RATIO_PROPORTION_SCALE_MODES,
  RATIO_PROPORTION_SCALE_UNITS,
  resetRatioProportionScaleInput,
  type RatioProportionScaleMode,
  type RatioProportionScaleUnit,
} from "../../components/visualizations/mainland/RatioProportionScaleModel";
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
import { chinaVisualizationCollisionReceipt } from "./china-visualization-collision-receipt";
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
const productionRenderer = "mainland-ratio-proportion-scale" as const;
const supportedProjects = ["desktop-chrome", "mobile-chrome"] as const;
const endpointNames = ["min", "mid", "max"] as const;
const ratioNumericControls = ["ratio-a", "ratio-b", "scale-factor"] as const;
const scaleNumericControls = ["scale-factor", "drawing-length"] as const;
const maximumStatesPerChunk = 32;
const expectedStateCountPerProject = 62;
const expectedChunkCountPerProject = 2;
const expectedCanonicalExecutionCount = 4;
const expectedStatePlanSha256 =
  "51d09d7bf6054c918eeb1206ad2cfa78a70cc4258b2ce06c86bf9758185ef5cb";
const expectedStateDescriptorPlanSha256 =
  "3756c3e9344aebcdc68b9e5ad011061a14e5df1ddac9c79af9f0b1450460acb6";
const expectedDurabilityBrowserHelperSha256 =
  "f27ae08a91ec2f5daa97ed905342f99d7abf9693c4d82532a3b1f6d8fc93bccb";
const expectedDurabilityBrowserHelperTestSha256 =
  "86ac16b4cc4b23a4cd99196fb49a6cd6a632a47aa3cd3003c0d9ff5a26020d76";
const expectedDurabilityBrowserPairAggregateSha256 =
  "e94c63f04a68a67f014181bbbbf098e6222b7a9bd31981752ad470c55d85fff3";
const expectedDurabilityFourFileAggregateSha256 =
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
const stateDescriptorSerializer =
  "recursive-object-keys-code-unit-sort-compact-json-lines-final-lf" as const;
const collisionScannerSha256 =
  "b775c93f615522da021cf813a42304bee27d5ba437b0e06247ccd4f5049f5824";
const contrastScannerSha256 =
  "81cd3d4a612ae5934586be0cd0fa5a3e6987c96c3d6c89af32f76b8ef697913e";
const expectedScannerSixCaseTestSha256 =
  "0e6c42d5750c9b127fa583625be7c49757370cd239155fac9c0766c05ac1f7e7";
const expectedScannerPackageAggregateSha256 =
  "6ff36e516d1d2da6ff04c4be632942c4f52cf63929b83013b56a35e7255e2502";
const scannerPackageAggregateSerialization =
  "ordered-repo-relative-path-utf8-nul-raw-file-bytes-no-final-separator" as const;
const unitInMillimetres = {
  cm: 10,
  km: 1_000_000,
  m: 1_000,
  mm: 1,
} as const satisfies Record<RatioProportionScaleUnit, number>;

type EndpointName = (typeof endpointNames)[number];
type Stage = "audit" | "interaction" | "mount";

type DomainState = Readonly<{
  actualUnit: RatioProportionScaleUnit;
  drawingLength: number;
  drawingUnit: RatioProportionScaleUnit;
  labId: typeof RATIO_PROPORTION_SCALE_LAB_ID;
  mode: RatioProportionScaleMode;
  ratioA: number;
  ratioB: number;
  scaleFactor: number;
}>;

type InitialPlan = Readonly<{ id: "initial"; kind: "initial" }>;
type FirstInteractionPlan = Readonly<{
  id: "first-interaction";
  kind: "first-interaction";
}>;
type ModePlan = Readonly<{
  id: string;
  kind: "mode";
  mode: RatioProportionScaleMode;
}>;
type NumericEndpointPlan = Readonly<{
  endpoint: EndpointName;
  id: string;
  kind: "numeric-endpoint";
  mode: RatioProportionScaleMode;
  parameter: RatioProportionScaleNumericControlId;
}>;
type UnitPairPlan = Readonly<{
  actualUnit: RatioProportionScaleUnit;
  drawingUnit: RatioProportionScaleUnit;
  id: string;
  kind: "unit-pair";
}>;
type RoundTripStep =
  | "prepare-scale-factor"
  | "prepare-drawing-length"
  | "prepare-drawing-unit"
  | "prepare-actual-unit"
  | "leave-scale"
  | "return-scale";
type RoundTripPlan = Readonly<{
  atomicGroup: "scale-drawing-round-trip";
  id: string;
  kind: "round-trip";
  step: RoundTripStep;
}>;
type ResetPlan = Readonly<{ id: "reset"; kind: "reset" }>;
type StatePlan =
  | FirstInteractionPlan
  | InitialPlan
  | ModePlan
  | NumericEndpointPlan
  | ResetPlan
  | RoundTripPlan
  | UnitPairPlan;

type RuntimeCase = Readonly<{
  lab: FeaturedLabDefinition;
  labId: typeof RATIO_PROPORTION_SCALE_LAB_ID;
}>;

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

type DomainReceipt = Readonly<{
  domainId: string;
  expected: DomainState;
  match: true;
  observed: DomainState;
  projectionCount: 0;
  rejection: RatioProportionScaleControlDomainErrorCode | null;
  requested: DomainState;
}>;

type ActionEvidence = Readonly<{
  before: DomainState;
  expectedRejection: RatioProportionScaleControlDomainErrorCode | null;
  expectedState: DomainState;
  plannedRequest: ProductActionRequest;
}>;

type ProductActionRequest =
  | Readonly<{ kind: "initial" }>
  | Readonly<{ kind: "reset" }>
  | Readonly<{
      controlId: RatioProportionScaleNumericControlId;
      kind: "control";
      value: number;
    }>
  | Readonly<{
      controllerId: "mode" | RatioProportionScaleUnitControlId;
      kind: "controller";
      value: RatioProportionScaleMode | RatioProportionScaleUnit;
    }>;

type PlannedStateDescriptor = Readonly<{
  labId: typeof RATIO_PROPORTION_SCALE_LAB_ID;
  plan: Readonly<{
    controlParameter:
      | RatioProportionScaleNumericControlId
      | RatioProportionScaleUnitControlId
      | "mode"
      | null;
    kind: ProductActionRequest["kind"];
    mode: RatioProportionScaleMode;
    request: ProductActionRequest;
  }>;
  stateId: string;
}>;

type VisibleControlIdentity =
  | Readonly<{
      controlId: RatioProportionScaleNumericControlId;
      kind: "control";
    }>
  | Readonly<{
      controllerId: "mode" | RatioProportionScaleUnitControlId;
      kind: "controller";
      value: RatioProportionScaleMode | RatioProportionScaleUnit;
    }>
  | null;

type ProductActionReceipt = Readonly<{
  before: DomainState;
  expected: DomainState;
  observed: DomainState;
  projections: readonly never[];
  rejection: RatioProportionScaleControlDomainErrorCode | null;
  request: ProductActionRequest;
  requested: DomainState;
  status: "accepted" | "rejected";
  version: typeof RATIO_PROPORTION_SCALE_ACTION_RECEIPT_CONTRACT.id;
}>;

type VisualReceipt = Readonly<{
  kind: RatioProportionScaleMode;
  markCount: number;
  receipt: Record<string, unknown>;
}>;

type StateReceipt = Readonly<{
  action: ActionEvidence;
  collision: ReturnType<typeof chinaVisualizationCollisionReceipt>;
  configuredState: DomainState;
  contrast: Readonly<{
    auditedTextCount: number;
    minRatio: number;
    requiredRatio: number;
    worstTarget: string;
  }>;
  controls: readonly ControlSnapshot[];
  domain: DomainReceipt;
  localScroll: Readonly<{
    clientWidth: number;
    overflowX: string;
    scrollWidth: number;
  }>;
  pageOverflow: Readonly<{
    bodyScrollWidth: number;
    documentClientWidth: number;
    documentScrollWidth: number;
  }>;
  productAction: ProductActionReceipt;
  runtimeSignature: string;
  stateId: string;
  touchTargetCount: number;
  visibleControlIdentity: VisibleControlIdentity;
  visual: VisualReceipt;
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
  fail(`G06 descriptor value is not canonical JSON: ${String(value)}.`);
}

function exactSorted(values: readonly string[]) {
  return [...values].sort();
}

function assertExactSet(
  label: string,
  actual: readonly string[],
  expected: readonly string[],
) {
  if (
    JSON.stringify(exactSorted(actual)) !== JSON.stringify(exactSorted(expected))
  ) {
    fail(
      `${label} drifted; expected=${JSON.stringify(exactSorted(expected))} actual=${JSON.stringify(exactSorted(actual))}.`,
    );
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
const producerSourceSha256 = createHash("sha256")
  .update(readFileSync(__filename))
  .digest("hex");
assertCanonicalEqual(
  "G06 approved durability/validator/next-env source SHA",
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
    scannerSixCaseTest: expectedScannerSixCaseTestSha256,
  },
);

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
        .map(
          ([sha256, repositoryRelativePath]) =>
            `${sha256}  ${repositoryRelativePath}\n`,
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
    expectedDurabilityBrowserPairAggregateSha256 ||
  observedDurabilityFourFileAggregateSha256 !==
    expectedDurabilityFourFileAggregateSha256
) {
  fail(
    `G06 durability package aggregate drifted; pairExpected=${expectedDurabilityBrowserPairAggregateSha256} pairActual=${observedDurabilityBrowserPairAggregateSha256} fourExpected=${expectedDurabilityFourFileAggregateSha256} fourActual=${observedDurabilityFourFileAggregateSha256}.`,
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
if (observedScannerPackageAggregateSha256 !== expectedScannerPackageAggregateSha256) {
  fail(
    `G06 scanner package aggregate drifted; expected=${expectedScannerPackageAggregateSha256} actual=${observedScannerPackageAggregateSha256}.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(value: string | null): unknown {
  if (value === null) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

const ownSource = readFileSync(__filename, "utf8");

function producerSourceDeclarationBounds(source: string) {
  const mapStart = source.indexOf(
    "const integrationSourceSha256 = Object.freeze({",
  );
  const mapEndMarker = source.indexOf("\n});", mapStart);
  const mapEnd = mapEndMarker + "\n});".length;
  const declarationEnd = source.indexOf(
    '\nassertCanonicalEqual(\n  "G06 approved durability/validator/next-env source SHA",',
    mapEnd,
  );
  if (mapStart < 0 || mapEndMarker < mapStart || declarationEnd < mapEnd) {
    fail("G06 producer source declaration is absent or unbounded.");
  }
  return { declarationEnd, declarationStart: mapEnd, mapEnd, mapStart };
}

function producerAttachmentSource(source: string) {
  const start = source.lastIndexOf("\n      await testInfo.attach(");
  const end = source.indexOf(
    '\n          contentType: "application/json",',
    start,
  );
  if (start < 0 || end <= start) {
    fail("G06 producer attachment is absent or unbounded.");
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
    "                integrationSourceSha256,",
    "                producerSourceSha256,",
  ].join("\n");
  if (!attachment.source.includes(exactSiblingFields)) {
    defects.push(
      "producerSourceSha256 must be the top-level sibling immediately after integrationSourceSha256",
    );
  }
  if (
    (attachment.source.match(
      /^                producerSourceSha256,$/gmu,
    ) ?? []).length !== 1
  ) {
    defects.push("producerSourceSha256 top-level attachment field is not exact");
  }
  if (defects.length > 0) {
    fail(`G06 producer source provenance RED: ${defects.join("; ")}.`);
  }
}

function assertProducerSourceSha256MutationCanaries(source: string) {
  const mustReject = (
    label: string,
    mutate: (candidate: string) => string,
  ) => {
    const candidate = mutate(source);
    if (candidate === source) {
      fail(`G06 producer source provenance canary could not inject ${label}.`);
    }
    try {
      assertProducerSourceSha256SourceContract(candidate);
    } catch {
      return;
    }
    fail(`G06 producer source provenance canary accepted ${label}.`);
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
  mustReject("omitted producer declaration", (candidate) =>
    replaceDeclaration(candidate, ""),
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
  mustReject("circular producer digest", (candidate) =>
    replaceDeclaration(
      candidate,
      [
        'const producerSourceSha256 = createHash("sha256")',
        "  .update(producerSourceSha256)",
        '  .digest("hex");',
      ].join("\n"),
    ),
  );
  mustReject("weak text source read", (candidate) =>
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
        '  .update(readFileSync(__dirname + "/china-mainland-g06-ratio-proportion-scale-production.spec.ts"))',
        '  .digest("hex");',
      ].join("\n"),
    ),
  );
  mustReject("foreign source path", (candidate) =>
    replaceDeclaration(
      candidate,
      [
        'const producerSourceSha256 = createHash("sha256")',
        '  .update(readFileSync("/Volumes/Starship/foreign-g06-producer.ts"))',
        '  .digest("hex");',
      ].join("\n"),
    ),
  );
  mustReject("environment-controlled source path", (candidate) =>
    replaceDeclaration(
      candidate,
      [
        'const producerSourceSha256 = createHash("sha256")',
        "  .update(readFileSync(process.env.G06_PRODUCER_SOURCE_PATH!))",
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
      attachment.replace("\n                producerSourceSha256,", ""),
    ),
  );
  mustReject("non-adjacent attachment field", (candidate) =>
    replaceAttachment(candidate, (attachment) =>
      attachment.replace(
        [
          "                integrationSourceSha256,",
          "                producerSourceSha256,",
        ].join("\n"),
        [
          "                integrationSourceSha256,",
          "                observedStateDescriptorPlanSha256,",
          "                producerSourceSha256,",
        ].join("\n"),
      ),
    ),
  );
}

assertProducerSourceSha256SourceContract(ownSource);
assertProducerSourceSha256MutationCanaries(ownSource);

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
      fail(`G06 durability/descriptor source contract is missing ${label}.`);
    }
  }

  const runtimeSuiteMarker = [
    "test.describe(",
    '"Mainland G06 ratio proportion scale production route acceptance"',
  ].join("");
  const runtimeStart = source.indexOf(runtimeSuiteMarker);
  if (runtimeStart < 0) {
    fail("G06 durability/descriptor source contract cannot locate the runtime suite.");
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
        `G06 durability lifecycle is absent or out of order before Chrome: ${step}.`,
      );
    }
    priorIndex = index;
  }

  for (const [label, pattern] of [
    ["planned semantic descriptors", /plannedStateDescriptors\.push\s*\(/u],
    ["descriptor-plan SHA attachment", /expectedStateDescriptorPlanSha256,/u],
    ["durability receipt attachment", /durabilityReceipts\s*:/u],
    ["receipt-derived control evidence", /controlEvidence\s*:/u],
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
      /schemaVersion\s*:\s*"china-mainland-g06-ratio-proportion-scale-production\.v3"/u,
    ],
    ["catalog analytics source", /source\s*:\s*runtime\.lab\.analyticsSource/u],
  ] as const) {
    if (!pattern.test(runtimeSource)) {
      fail(`G06 durability/descriptor runtime contract is missing ${label}.`);
    }
  }
  for (const [label, pattern] of [
    ["post-navigation onboarding reload", /closeLearnerStartSetupIfVisible\s*\(/u],
    ["fixed mount wait", /page\.waitForTimeout\(5_500\)/u],
    ["generic lesson analytics source", /source\s*:\s*"lesson"/u],
    [
      "topic-id-as-lesson-slug navigation",
      /page\.goto\(\s*`\/student\/lessons\/\$\{encodeURIComponent\(runtime\.labId\)\}`/u,
    ],
  ] as const) {
    if (pattern.test(runtimeSource)) {
      fail(`G06 durability/descriptor runtime contract forbids ${label}.`);
    }
  }
}

function assertSourceFailFirstMutation(source: string) {
  const marker =
    'schemaVersion: "china-mainland-g06-ratio-proportion-scale-production.' +
    'v3"';
  if (source.split(marker).length !== 2) {
    fail("G06 source fail-first mutation requires one exact schema-v3 marker.");
  }
  const mutated = source.replace(
    marker,
    'schemaVersion: "china-mainland-g06-ratio-proportion-scale-production.v2"',
  );
  try {
    assertDurabilityDescriptorSourceContract(mutated);
  } catch {
    return;
  }
  fail("G06 source fail-first mutation was accepted.");
}

assertDurabilityDescriptorSourceContract(ownSource);
assertSourceFailFirstMutation(ownSource);

function exactDurabilityProbeSource(source: string) {
  const helperDeclaration = "\nasync function runExactDurabilityProbe(";
  const declarationStart = source.lastIndexOf(helperDeclaration);
  const helperStart = declarationStart + 1;
  const helperEnd = source.indexOf("\nconst executedChunkIds", helperStart);
  if (declarationStart < 0 || helperEnd <= helperStart) {
    fail("G06 exact durability probe helper is absent or unbounded.");
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
  const helperEnd = source.indexOf("\nfunction assertCanonicalRunner", helperStart);
  if (declarationStart < 0 || helperEnd <= helperStart) {
    fail("G06 first-session acknowledgement helper is absent or unbounded.");
  }
  return {
    end: helperEnd,
    source: source.slice(helperStart, helperEnd),
    start: helperStart,
  };
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

function canonicalPlanLoopSource(source: string) {
  const runtimeSuiteMarker = [
    "test.describe(",
    '"Mainland G06 ratio proportion scale production route acceptance"',
  ].join("");
  const suiteStart = source.lastIndexOf(runtimeSuiteMarker);
  const loopStart = source.indexOf(
    "for (const [planIndex, plan] of chunk.plans.entries()) {",
    suiteStart,
  );
  const loopEnd = source.indexOf("const actualStateIds =", loopStart);
  if (suiteStart < 0 || loopStart < suiteStart || loopEnd <= loopStart) {
    fail("G06 canonical state-plan loop is absent or unbounded.");
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
      "G06 canonical state-plan loop must not own a durability fence or first-session waiter.",
    );
  }

  const acknowledgement = firstSessionAcknowledgementSource(source);
  const exactAcknowledgementKeys = [
    '  assertExactSet(`${runtime.labId}: first-control ACK keys`, Object.keys(delivery), [',
    '    "acknowledgedUserId",',
    '    "durablyPersisted",',
    '    "session",',
    "  ]);",
  ].join("\n");
  const exactSessionKeys = [
    '  assertExactSet(`${runtime.labId}: first-control ACK session keys`, Object.keys(delivery.session), [',
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
      "G06 first-session ACK must require the exact three-key acknowledgement and six-key session payload.",
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
      `G06 first-session ACK source RED: honest completedAt must reject null, absence, mismatch, and noncanonical timestamps; missing=${JSON.stringify(missingCompletedAtContract)}.`,
    );
  }
  assertOrderedSourceSteps(
    "G06 strict first-session acknowledgement",
    acknowledgement.source,
    [
      "expect(response.status()).toBe(200);",
      'expect(response.headers()["content-type"]).toBe("application/json");',
      "const responseUrl = new URL(response.url());",
      'expect(responseUrl.pathname).toBe("/api/visualization-sessions");',
      'expect(responseUrl.search).toBe("");',
      'expect(responseUrl.hash).toBe("");',
      'expect(request.method()).toBe("POST");',
      'request.headers()["x-mais-visualization-user-id"]',
      "expect(requestBody(request)).toEqual({",
      "const delivery = await readJson<unknown>(",
      "if (!isRecord(delivery) || !isRecord(delivery.session)) {",
      'assertExactSet(`${runtime.labId}: first-control ACK keys`, Object.keys(delivery), [',
      'assertExactSet(`${runtime.labId}: first-control ACK session keys`, Object.keys(delivery.session), [',
      'typeof delivery.session.updatedAt !== "string" ||',
      "new Date(delivery.session.updatedAt).toISOString() !==",
      'typeof delivery.session.completedAt !== "string" ||',
      "new Date(delivery.session.completedAt).toISOString() !==",
      "delivery.session.completedAt !== delivery.session.updatedAt",
      "const acknowledgement = {",
      "completedAt: delivery.session.completedAt,",
      "expect(delivery).toEqual(acknowledgement);",
      "return acknowledgement;",
    ],
  );
  if (/\.toMatchObject\s*\(/u.test(acknowledgement.source)) {
    fail("G06 first-session ACK must be exact rather than a partial match.");
  }

  const helper = exactDurabilityProbeSource(source);
  assertOrderedSourceSteps("G06 exact durability probe", helper.source, [
    "const resetMode = stateFromReset().mode;",
    'const probeMode = "direct-proportion" as const;',
    "expect(probeMode).not.toBe(resetMode);",
    "await expect(modeButton).toBeEnabled();",
    'await expect(modeButton).toHaveAttribute("aria-pressed", "false");',
    "const firstExpectedControl = {",
    'controlKey: "direct-proportion",',
    'eventTypes: ["pointerup", "click"],',
    "const firstProductRequest: ProductActionRequest = {",
    'controllerId: "mode",',
    "value: probeMode,",
    "const firstFence = await durability.armRealControl({",
    "expectedButtonClick: firstExpectedControl,",
    "ordinal: 1,",
    "const sessionPromise = page.waitForResponse(",
    'candidate.request().method() === "POST" &&',
    "isSameOriginApplicationUrl(candidate.url()) &&",
    'new URL(candidate.url()).pathname === "/api/visualization-sessions",',
    "{ timeout: 30_000 },",
    "await modeButton.click();",
    "const sessionAcknowledgement = await awaitFirstSessionAck(",
    "const first = await durability.finishFirstRealControl({",
    "expect(first.expectedControl).toEqual(firstExpectedControl);",
    "expect(first.controlEvents.map(({ controlKey, key, type }) => ({",
    "expect(afterFirst).toEqual({ ...beforeFirst, mode: probeMode });",
    "actionEvidence(beforeFirst, afterFirst, firstProductRequest),",
    "const secondProductRequest: ProductActionRequest = { kind: \"reset\" };",
    "const secondExpectedControl = {",
    "controlKey: runtime.labId,",
    "const secondFence = await durability.armRealControl({",
    "expectedButtonClick: secondExpectedControl,",
    "ordinal: 2,",
    "await resetButton.click();",
    "const second = await durability.finishSecondRealControl({",
    "expect(second.expectedControl).toEqual(secondExpectedControl);",
    "expect(second.controlEvents.map(({ controlKey, key, type }) => ({",
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
    "await assertResetState(root);",
    "actionEvidence(afterFirst, afterSecond, secondProductRequest),",
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
      /\b(?:clickReset|clickMode|setRangeValue|executePlan|prepareIndependentMode)\s*\(/u
        .test(window)
    ) {
      fail(
        `G06 exact durability ${label} fence must contain exactly its named UI action and no prep action.`,
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
    /(?:firstControlIdentity|secondControlIdentity|controlIdentities\s*:)/u.test(
      helper.source,
    )
  ) {
    fail(
      "G06 exact durability probe lifecycle cardinality or receipt-derived identity contract drifted.",
    );
  }

  const runtimeSuiteMarker = [
    "test.describe(",
    '"Mainland G06 ratio proportion scale production route acceptance"',
  ].join("");
  const suiteStart = source.lastIndexOf(runtimeSuiteMarker);
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
  const loopEnd = planLoop.start + planLoop.source.length;
  const runtimeSource = source.slice(suiteStart);
  if (
    mountIndex < suiteStart ||
    probeCallIndex <= mountIndex ||
    probeCallIndex >= planLoop.start ||
    replayIndex <= loopEnd ||
    finalIndex <= replayIndex ||
    source.indexOf(
      "const durabilityProbe = await runExactDurabilityProbe({",
      probeCallIndex + 1,
    ) >= 0
  ) {
    fail(
      "G06 exact durability probe must run once after mount and before the canonical state ledger.",
    );
  }
  if (
    /(?:firstControlIdentity|secondControlIdentity|controlIdentities\s*:)/u.test(
      runtimeSource,
    ) ||
    !runtimeSource.includes("expect(durabilityReceipt.controlObserverStop).toBe(") ||
    !runtimeSource.includes("durabilityProbe.controlObserverStop,") ||
    !runtimeSource.includes("expect(durabilityReceipt.second.controlObserverStop).toBe(") ||
    !runtimeSource.includes("durabilityReceipt.second.controlObserverStop,") ||
    !runtimeSource.includes("expect(durabilityReceipt.expectedControl).toEqual({") ||
    !runtimeSource.includes("expect(durabilityReceipt.controlEvents).toEqual({") ||
    !runtimeSource.includes("expect(durabilityReceipt.first).toBe(") ||
    !runtimeSource.includes("expect(durabilityReceipt.second).toBe(") ||
    !runtimeSource.includes("const finalFrozenEventCount =") ||
    !runtimeSource.includes("const finalLedgerFrozen =") ||
    !runtimeSource.includes("controlEvidence: {") ||
    !runtimeSource.includes("controlEvents: durabilityProbe.first.controlEvents,") ||
    !runtimeSource.includes("expectedControl: durabilityProbe.first.expectedControl,") ||
    !runtimeSource.includes("controlEvents: durabilityProbe.second.controlEvents,") ||
    !runtimeSource.includes("controlObserverStop: durabilityProbe.second.controlObserverStop,") ||
    !runtimeSource.includes("expectedControl: durabilityProbe.second.expectedControl,") ||
    !runtimeSource.includes("controlEvents: durabilityReceipt.controlEvents,") ||
    !runtimeSource.includes("controlObserverStop: durabilityReceipt.controlObserverStop,") ||
    !runtimeSource.includes("expectedControl: durabilityReceipt.expectedControl,") ||
    !runtimeSource.includes("firstSessionAcknowledgement:") ||
    !runtimeSource.includes("durabilityProbe.sessionAcknowledgement,")
  ) {
    fail(
      "G06 durability attachment must derive exact C11 stop/control evidence from actual probe and final receipts.",
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
      fail(`G06 exact durability mutation canary could not inject ${label}.`);
    }
    try {
      assertExactDurabilityProbeSourceContract(candidate);
    } catch {
      return;
    }
    fail(`G06 exact durability mutation canary accepted ${label}.`);
  };
  const mutateHelper = (
    candidate: string,
    mutate: (helper: string) => string,
  ) => {
    const bounds = exactDurabilityProbeSource(candidate);
    const mutatedHelper = mutate(bounds.source);
    return `${candidate.slice(0, bounds.start)}${mutatedHelper}${candidate.slice(bounds.end)}`;
  };
  const mutateAcknowledgement = (
    candidate: string,
    mutate: (acknowledgement: string) => string,
  ) => {
    const bounds = firstSessionAcknowledgementSource(candidate);
    const mutatedAcknowledgement = mutate(bounds.source);
    return `${candidate.slice(0, bounds.start)}${mutatedAcknowledgement}${candidate.slice(bounds.end)}`;
  };
  const firstClick = "await modeButton.click();";
  const secondClick = "await resetButton.click();";
  for (const [label, prep] of [
    ["reset prep", "await clickReset(root);"],
    ["mode prep", 'await clickMode(root, "inverse-proportion");'],
    ["range prep", "await setRangeValue(modeButton, 1);"],
    [
      "independent-mode prep",
      'await prepareIndependentMode(root, "direct-proportion");',
    ],
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
      helper.replace(
        'controlKey: "direct-proportion",',
        "controlKey: runtime.labId,",
      ),
    ),
  );
  mustReject("wrong second control key", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace(
        "controlKey: runtime.labId,",
        'controlKey: "direct-proportion",',
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
  mustReject("wrong session waiter method", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace(
        'candidate.request().method() === "POST" &&',
        'candidate.request().method() === "GET" &&',
      ),
    ),
  );
  mustReject("missing session waiter origin binding", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace("isSameOriginApplicationUrl(candidate.url()) &&", ""),
    ),
  );
  mustReject("wrong session waiter route", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace(
        'new URL(candidate.url()).pathname === "/api/visualization-sessions",',
        'new URL(candidate.url()).pathname === "/api/learning-events",',
      ),
    ),
  );
  mustReject("unbounded session waiter", (candidate) =>
    mutateHelper(candidate, (helper) =>
      helper.replace("{ timeout: 30_000 },", "{ timeout: 0 },"),
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
    [
      "arm",
      'await durability.armRealControl({ expectedButtonClick: { controlKey: runtime.labId, eventTypes: ["pointerup", "click"] }, ordinal: 1 });',
    ],
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
  mustReject("partial first-session acknowledgement", (candidate) => {
    const bounds = firstSessionAcknowledgementSource(candidate);
    const mutated = bounds.source.replace(
      "expect(delivery).toEqual(acknowledgement);",
      "expect(delivery).toMatchObject(acknowledgement);",
    );
    return `${candidate.slice(0, bounds.start)}${mutated}${candidate.slice(bounds.end)}`;
  });
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
      acknowledgement.replace('    "completedAt",\n', ""),
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
  mustReject("self-authored control identities", (candidate) => {
    const loop = canonicalPlanLoopSource(candidate);
    const runtimeAfterLoop = candidate.slice(loop.start + loop.source.length);
    const mutated = runtimeAfterLoop.replace(
      "durabilityReceipts: {",
      "durabilityReceipts: { controlIdentities: {},",
    );
    return `${candidate.slice(0, loop.start + loop.source.length)}${mutated}`;
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
      'test.describe("Mainland G06 ratio proportion scale production route acceptance"',
    );
    const runtimeSource = candidate.slice(suiteStart);
    return `${candidate.slice(0, suiteStart)}${runtimeSource.replace(
      "durabilityReceipt.second.controlObserverStop,",
      "durabilityProbe.controlObserverStop,",
    )}`;
  });
  mustReject("missing final frozen ledger evidence", (candidate) => {
    const suiteStart = candidate.lastIndexOf(
      'test.describe("Mainland G06 ratio proportion scale production route acceptance"',
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

function assertSourceHasNoFocusedOrDisabledTests() {
  const source = readFileSync(
    `${process.cwd()}/tests/e2e/china-mainland-g06-ratio-proportion-scale-production.spec.ts`,
    "utf8",
  );
  const forbidden = new RegExp(
    ["\\btest", "\\.", "(?:", "skip", "|", "fixme", "|", "only", ")\\b"].join(""),
    "u",
  );
  if (forbidden.test(source)) {
    fail("G06 production acceptance source contains a disabled or focused test modifier.");
  }
}

function assertSourceHardRejects() {
  const scaleState = createRatioProportionScaleControlDomainState(
    RATIO_PROPORTION_SCALE_LAB_ID,
    "scale-drawing",
  );
  const hardReject = (
    label: string,
    request: Parameters<typeof planRatioProportionScaleControlTransition>[1],
    expectedCode: RatioProportionScaleControlDomainErrorCode,
  ) => {
    try {
      planRatioProportionScaleControlTransition(scaleState, request);
    } catch (error) {
      if (
        error instanceof RatioProportionScaleControlDomainError &&
        error.code === expectedCode
      ) {
        return error.code;
      }
      throw error;
    }
    fail(`${label}: invalid request unexpectedly produced a transition plan.`);
  };
  return Object.freeze({
    hidden: hardReject(
      "hidden ratio control",
      { controlId: "ratio-a", kind: "control", value: 2 },
      "CONTROL_NOT_VISIBLE",
    ),
    nonInteger: hardReject(
      "noninteger visible control",
      { controlId: "scale-factor", kind: "control", value: 1.5 },
      "INVALID_CONTROL_VALUE",
    ),
    unsafe: hardReject(
      "unsafe visible control",
      {
        controlId: "scale-factor",
        kind: "control",
        value: Number.MAX_SAFE_INTEGER + 1,
      },
      "INVALID_CONTROL_VALUE",
    ),
    zero: hardReject(
      "zero visible control",
      { controlId: "scale-factor", kind: "control", value: 0 },
      "DIRECT_CONTROL_OUT_OF_RANGE",
    ),
  });
}

assertSourceHasNoFocusedOrDisabledTests();
const sourceHardRejects = assertSourceHardRejects();
if (
  sourceHardRejects.hidden !== "CONTROL_NOT_VISIBLE" ||
  sourceHardRejects.nonInteger !== "INVALID_CONTROL_VALUE" ||
  sourceHardRejects.unsafe !== "INVALID_CONTROL_VALUE" ||
  sourceHardRejects.zero !== "DIRECT_CONTROL_OUT_OF_RANGE"
) {
  fail("G06 source hard-rejection receipt drifted.");
}

function assertCanonicalCliArguments(args: readonly string[]) {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
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
        "--test-list",
        "--test-list-invert",
      ].some((flag) => argument === flag || argument.startsWith(`${flag}=`)) ||
      argument === "-g" ||
      /^-g(?:=)?.+/u.test(argument) ||
      argument === "-x"
    ) {
      fail(`G06 canonical acceptance rejects partial CLI argument ${argument}.`);
    }
    if (
      argument === "--pass-with-no-tests" ||
      argument.startsWith("--pass-with-no-tests=")
    ) {
      fail(`G06 canonical acceptance rejects zero-test CLI argument ${argument}.`);
    }

    let workersValue: string | null = null;
    if (argument === "--workers" || argument === "-j") {
      workersValue = args[index + 1] ?? null;
      index += 1;
    } else if (argument.startsWith("--workers=")) {
      workersValue = argument.slice("--workers=".length);
    } else if (argument.startsWith("-j=")) {
      workersValue = argument.slice("-j=".length);
    } else {
      const attachedWorkers = argument.match(/^-j(.+)$/u);
      if (attachedWorkers) workersValue = attachedWorkers[1] ?? null;
    }
    if (workersValue !== null && workersValue !== "1") {
      fail(
        `G06 canonical acceptance requires exactly one worker; received ${argument}${argument.includes("=") ? "" : ` ${workersValue}`}.`,
      );
    }

    let retriesValue: string | null = null;
    if (argument === "--retries") {
      retriesValue = args[index + 1] ?? null;
      index += 1;
    } else if (argument.startsWith("--retries=")) {
      retriesValue = argument.slice("--retries=".length);
    }
    if (retriesValue !== null && retriesValue !== "0") {
      fail(
        `G06 canonical acceptance forbids retries; received ${argument}${argument.includes("=") ? "" : ` ${retriesValue}`}.`,
      );
    }
  }
}

assertMainlandFocusedCanonicalCli({
  requiredSpec:
    "tests/e2e/china-mainland-g06-ratio-proportion-scale-production.spec.ts",
});
assertCanonicalCliArguments(process.argv.slice(2));

for (const environmentName of [
  "G06_VIZ_ALLOW_PARTIAL",
  "G06_VIZ_FILTER",
  "G06_VIZ_LESSON_FULL",
]) {
  if (process.env[environmentName] !== undefined) {
    fail(`G06 canonical acceptance rejects ${environmentName}.`);
  }
}
if (!process.cwd().startsWith("/Volumes/Starship/")) {
  fail(`G06 canonical worktree escaped Starship: ${process.cwd()}.`);
}

function runtimeCase(): RuntimeCase {
  const lab = getVisualizationLabByLabId(RATIO_PROPORTION_SCALE_LAB_ID);
  if (!lab) fail(`${RATIO_PROPORTION_SCALE_LAB_ID}: catalog row is missing.`);
  if (
    lab.labId !== RATIO_PROPORTION_SCALE_LAB_ID ||
    lab.topicId !== RATIO_PROPORTION_SCALE_LAB_ID ||
    lab.moduleId !== configuredModuleId ||
    lab.publisher !== "MAINLAND_PEP" ||
    lab.curriculumTrack !== "MAINLAND_PEP_PRIMARY" ||
    lab.grade !== "P6" ||
    lab.templateId !== "fraction-bar"
  ) {
    fail(
      `G06 catalog identity drifted: ${JSON.stringify({
        curriculumTrack: lab.curriculumTrack,
        grade: lab.grade,
        labId: lab.labId,
        moduleId: lab.moduleId,
        publisher: lab.publisher,
        templateId: lab.templateId,
        topicId: lab.topicId,
      })}.`,
    );
  }
  return { lab, labId: RATIO_PROPORTION_SCALE_LAB_ID };
}

const runtime = runtimeCase();

function statePlans(): readonly StatePlan[] {
  const plans: StatePlan[] = [
    { id: "initial", kind: "initial" },
    { id: "first-interaction", kind: "first-interaction" },
  ];
  for (const mode of [
    "equivalent-ratios",
    "direct-proportion",
    "inverse-proportion",
  ] as const) {
    plans.push({ id: `mode:${mode}`, kind: "mode", mode });
    for (const parameter of ratioNumericControls) {
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
  }
  plans.push({ id: "mode:scale-drawing", kind: "mode", mode: "scale-drawing" });
  for (const parameter of scaleNumericControls) {
    for (const endpoint of endpointNames) {
      plans.push({
        endpoint,
        id: `numeric:scale-drawing:${parameter}:${endpoint}`,
        kind: "numeric-endpoint",
        mode: "scale-drawing",
        parameter,
      });
    }
  }
  for (const drawingUnit of RATIO_PROPORTION_SCALE_UNITS) {
    for (const actualUnit of RATIO_PROPORTION_SCALE_UNITS) {
      plans.push({
        actualUnit,
        drawingUnit,
        id: `units:scale-drawing:${drawingUnit}-to-${actualUnit}`,
        kind: "unit-pair",
      });
    }
  }
  for (const step of [
    "prepare-scale-factor",
    "prepare-drawing-length",
    "prepare-drawing-unit",
    "prepare-actual-unit",
    "leave-scale",
    "return-scale",
  ] as const) {
    plans.push({
      atomicGroup: "scale-drawing-round-trip",
      id: `round-trip:${step}`,
      kind: "round-trip",
      step,
    });
  }
  plans.push({ id: "reset", kind: "reset" });
  return plans;
}

function groupedPlans(plans: readonly StatePlan[]): readonly (readonly StatePlan[])[] {
  const groups: StatePlan[][] = [];
  for (const plan of plans) {
    const prior = groups.at(-1);
    const atomicGroup = plan.kind === "round-trip" ? plan.atomicGroup : undefined;
    const priorHead = prior?.[0];
    const priorAtomicGroup =
      priorHead?.kind === "round-trip" ? priorHead.atomicGroup : undefined;
    if (atomicGroup && prior && priorAtomicGroup === atomicGroup) {
      prior.push(plan);
    } else {
      groups.push([plan]);
    }
  }
  return groups;
}

function chunkRuntime(): readonly RuntimeChunk[] {
  const chunks: StatePlan[][] = [];
  let current: StatePlan[] = [];
  for (const group of groupedPlans(statePlans())) {
    if (group.length > maximumStatesPerChunk) {
      fail(`G06 atomic state group exceeds ${maximumStatesPerChunk}.`);
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

const runtimeChunks = chunkRuntime();
const expectedChunkStateCounts = [32, 30] as const;
const actualChunkStateCounts = runtimeChunks.map((chunk) => chunk.plans.length);
if (JSON.stringify(actualChunkStateCounts) !== JSON.stringify(expectedChunkStateCounts)) {
  fail(
    `G06 chunk contract drifted; expected=${JSON.stringify(expectedChunkStateCounts)} actual=${JSON.stringify(actualChunkStateCounts)}.`,
  );
}
const expectedChunkIds = runtimeChunks.map((chunk) => chunk.id);
const expectedStateIds = runtimeChunks.flatMap((chunk) =>
  chunk.plans.map((plan) => `${runtime.labId}:${plan.id}`),
);
const expectedTestTitles = runtimeChunks.map(
  (chunk) => `G06 ${chunk.id} audits ${chunk.plans.length} exact states`,
);

function staticEndpointValue(
  mode: RatioProportionScaleMode,
  parameter: RatioProportionScaleNumericControlId,
  endpoint: EndpointName,
) {
  const descriptor = getRatioProportionScaleControlDomainDescriptor(
    RATIO_PROPORTION_SCALE_LAB_ID,
    mode,
  );
  const domain = descriptor.numericDomains[parameter];
  if (!domain) {
    fail(`${mode}:${parameter}: canonical descriptor has no numeric domain.`);
  }
  if (endpoint === "min") return domain.min;
  if (endpoint === "max") return domain.max;
  const stepCount = Math.floor((domain.max - domain.min) / domain.step / 2);
  return Math.min(domain.max, domain.min + stepCount * domain.step);
}

function staticPlanMode(plan: StatePlan): RatioProportionScaleMode {
  if (plan.kind === "initial" || plan.kind === "first-interaction") {
    return "equivalent-ratios";
  }
  if (plan.kind === "mode" || plan.kind === "numeric-endpoint") {
    return plan.mode;
  }
  if (plan.kind === "unit-pair") return "scale-drawing";
  if (plan.kind === "reset") return "equivalent-ratios";
  if (plan.kind === "round-trip") {
    if (plan.step === "leave-scale") return "direct-proportion";
    return "scale-drawing";
  }
  const exhaustive: never = plan;
  return fail(`G06 descriptor mode has unsupported plan ${String(exhaustive)}.`);
}

function staticPlanRequest(plan: StatePlan): ProductActionRequest {
  if (plan.kind === "initial") return { kind: "initial" };
  if (plan.kind === "first-interaction") {
    const initial = createRatioProportionScaleControlDomainState(
      RATIO_PROPORTION_SCALE_LAB_ID,
      "equivalent-ratios",
    );
    const domain = getRatioProportionScaleControlDomainDescriptor(
      RATIO_PROPORTION_SCALE_LAB_ID,
      initial.mode,
    ).numericDomains["ratio-a"];
    if (!domain) fail("G06 first-interaction descriptor lost ratio-a domain.");
    const value =
      initial.ratioA < domain.max
        ? initial.ratioA + domain.step
        : initial.ratioA - domain.step;
    return { controlId: "ratio-a", kind: "control", value };
  }
  if (plan.kind === "mode") {
    return { controllerId: "mode", kind: "controller", value: plan.mode };
  }
  if (plan.kind === "numeric-endpoint") {
    return {
      controlId: plan.parameter,
      kind: "control",
      value: staticEndpointValue(plan.mode, plan.parameter, plan.endpoint),
    };
  }
  if (plan.kind === "unit-pair") {
    return {
      controllerId: "actual-unit",
      kind: "controller",
      value: plan.actualUnit,
    };
  }
  if (plan.kind === "reset") return { kind: "reset" };
  if (plan.step === "prepare-scale-factor") {
    return { controlId: "scale-factor", kind: "control", value: 37 };
  }
  if (plan.step === "prepare-drawing-length") {
    return { controlId: "drawing-length", kind: "control", value: 19 };
  }
  if (plan.step === "prepare-drawing-unit") {
    return {
      controllerId: "drawing-unit",
      kind: "controller",
      value: "km",
    };
  }
  if (plan.step === "prepare-actual-unit") {
    return {
      controllerId: "actual-unit",
      kind: "controller",
      value: "mm",
    };
  }
  if (plan.step === "leave-scale") {
    return {
      controllerId: "mode",
      kind: "controller",
      value: "direct-proportion",
    };
  }
  if (plan.step === "return-scale") {
    return {
      controllerId: "mode",
      kind: "controller",
      value: "scale-drawing",
    };
  }
  const exhaustive: never = plan.step;
  return fail(
    `G06 descriptor request has unsupported round-trip step ${String(exhaustive)}.`,
  );
}

function plannedStateDescriptor(plan: StatePlan): PlannedStateDescriptor {
  const request = staticPlanRequest(plan);
  const controlParameter =
    request.kind === "control"
      ? request.controlId
      : request.kind === "controller"
        ? request.controllerId
        : null;
  return {
    labId: runtime.labId,
    plan: {
      controlParameter,
      kind: request.kind,
      mode: staticPlanMode(plan),
      request,
    },
    stateId: `${runtime.labId}:${plan.id}`,
  };
}

const expectedStateDescriptors = runtimeChunks.flatMap((chunk) =>
  chunk.plans.map((plan) => plannedStateDescriptor(plan)),
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
    fail(`G06 descriptor count drifted; actual=${descriptors.length}.`);
  }
  for (const [index, descriptor] of descriptors.entries()) {
    const expected = expectedStateDescriptors[index];
    if (
      !expected ||
      validatorCanonicalJson(descriptor) !== validatorCanonicalJson(expected)
    ) {
      fail(`G06 descriptor semantics drifted at index ${index}.`);
    }
    assertExactSet(`G06 descriptor ${index} keys`, Object.keys(descriptor), [
      "labId",
      "plan",
      "stateId",
    ]);
    assertExactSet(
      `G06 descriptor ${index} plan keys`,
      Object.keys(descriptor.plan),
      ["controlParameter", "kind", "mode", "request"],
    );
    if (
      descriptor.labId !== RATIO_PROPORTION_SCALE_LAB_ID ||
      !descriptor.stateId.startsWith(`${descriptor.labId}:`) ||
      descriptor.plan.kind !== descriptor.plan.request.kind ||
      !(RATIO_PROPORTION_SCALE_MODES as readonly unknown[]).includes(
        descriptor.plan.mode,
      )
    ) {
      fail(`G06 descriptor ${index} lab/state/mode/kind binding drifted.`);
    }
    const request = descriptor.plan.request;
    if (request.kind === "control") {
      assertExactSet(
        `G06 descriptor ${index} control request keys`,
        Object.keys(request),
        ["controlId", "kind", "value"],
      );
      if (descriptor.plan.controlParameter !== request.controlId) {
        fail(`G06 descriptor ${index} lost its exact controlId identity.`);
      }
    } else if (request.kind === "controller") {
      assertExactSet(
        `G06 descriptor ${index} controller request keys`,
        Object.keys(request),
        ["controllerId", "kind", "value"],
      );
      if (descriptor.plan.controlParameter !== request.controllerId) {
        fail(`G06 descriptor ${index} lost its exact controllerId identity.`);
      }
    } else {
      assertExactSet(
        `G06 descriptor ${index} ${request.kind} request keys`,
        Object.keys(request),
        ["kind"],
      );
      if (descriptor.plan.controlParameter !== null) {
        fail(`G06 descriptor ${index} ${request.kind} gained a fake control.`);
      }
    }
  }
  const bytes = canonicalDescriptorLines(descriptors);
  if (bytes !== expectedBytes) {
    fail("G06 descriptor canonical JSON-lines bytes drifted.");
  }
  return createHash("sha256").update(bytes).digest("hex");
}

function assertDescriptorMutationCanaries() {
  const clone = () =>
    JSON.parse(
      JSON.stringify(expectedStateDescriptors),
    ) as PlannedStateDescriptor[];
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
    fail(`G06 descriptor mutation canary accepted ${label}.`);
  };

  mustReject("cross-lab labId", (candidate) => {
    candidate[0] = {
      ...candidate[0]!,
      labId:
        "g06-cross-lab-mutation-canary" as typeof RATIO_PROPORTION_SCALE_LAB_ID,
    };
  });
  mustReject("stateId mismatch", (candidate) => {
    candidate[0] = {
      ...candidate[0]!,
      stateId: candidate[1]!.stateId,
    };
  });
  mustReject("request mismatch", (candidate) => {
    const left = candidate.findIndex(({ plan }) => plan.kind === "control");
    const right = candidate.findIndex(
      ({ plan }, index) =>
        index > left &&
        plan.kind === "control" &&
        validatorCanonicalJson(plan.request) !==
          validatorCanonicalJson(candidate[left]!.plan.request),
    );
    if (left < 0 || right < 0) {
      fail("G06 request mismatch canary found no distinct control requests.");
    }
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
  mustReject("G06 exact controlId alias", (candidate) => {
    const index = candidate.findIndex(({ plan }) => plan.kind === "control");
    const descriptor = candidate[index]!;
    const request = descriptor.plan.request;
    if (request.kind !== "control") {
      fail("G06 control alias canary has no control request.");
    }
    candidate[index] = {
      ...descriptor,
      plan: {
        ...descriptor.plan,
        request: {
          control: request.controlId,
          kind: request.kind,
          value: request.value,
        } as unknown as ProductActionRequest,
      },
    };
  });
  mustReject("G06 exact controllerId alias", (candidate) => {
    const index = candidate.findIndex(({ plan }) => plan.kind === "controller");
    const descriptor = candidate[index]!;
    const request = descriptor.plan.request;
    if (request.kind !== "controller") {
      fail("G06 controller alias canary has no controller request.");
    }
    candidate[index] = {
      ...descriptor,
      plan: {
        ...descriptor.plan,
        request: {
          controller: request.controllerId,
          kind: request.kind,
          value: request.value,
        } as unknown as ProductActionRequest,
      },
    };
  });

  const canonicalBytes = canonicalDescriptorLines(expectedStateDescriptors);
  if (!canonicalBytes.endsWith("\n")) {
    fail("G06 descriptor builder omitted its final LF.");
  }
  let finalLfRejected = false;
  try {
    assertDescriptorPlan(expectedStateDescriptors, canonicalBytes.slice(0, -1));
  } catch {
    finalLfRejected = true;
  }
  if (!finalLfRejected) {
    fail("G06 descriptor final-LF mutation canary was accepted.");
  }
  const insertionOrderBytes = `${expectedStateDescriptors
    .map((descriptor) =>
      JSON.stringify({
        stateId: descriptor.stateId,
        plan: descriptor.plan,
        labId: descriptor.labId,
      }),
    )
    .join("\n")}\n`;
  if (
    insertionOrderBytes === canonicalBytes ||
    createHash("sha256").update(insertionOrderBytes).digest("hex") ===
      createHash("sha256").update(canonicalBytes).digest("hex")
  ) {
    fail("G06 descriptor canonical-key-order mutation canary is insensitive.");
  }
}

assertDescriptorMutationCanaries();
const observedStateDescriptorPlanSha256 = assertDescriptorPlan(
  expectedStateDescriptors,
);
if (
  expectedStateDescriptors.map(({ stateId }) => stateId).join("\n") !==
  expectedStateIds.join("\n")
) {
  fail("G06 descriptor order drifted from canonical runtime chunk/state order.");
}
if (observedStateDescriptorPlanSha256 !== expectedStateDescriptorPlanSha256) {
  fail(
    `G06 ordered semantic descriptor plan SHA drifted; expected=${expectedStateDescriptorPlanSha256} actual=${observedStateDescriptorPlanSha256}.`,
  );
}

const observedStatePlanSha256 = createHash("sha256")
  .update(`${expectedStateIds.join("\n")}\n`)
  .digest("hex");
if (runtimeChunks.length !== expectedChunkCountPerProject) {
  fail(`G06 chunk count must be ${expectedChunkCountPerProject}.`);
}
if (expectedStateIds.length !== expectedStateCountPerProject) {
  fail(`G06 state count must be ${expectedStateCountPerProject}.`);
}
if (new Set(expectedStateIds).size !== expectedStateIds.length) {
  fail("G06 state IDs contain duplicates.");
}
if (new Set(expectedTestTitles).size !== expectedTestTitles.length) {
  fail("G06 test titles contain duplicates.");
}
if (observedStatePlanSha256 !== expectedStatePlanSha256) {
  fail(
    `G06 ordered state plan SHA drifted; expected=${expectedStatePlanSha256} actual=${observedStatePlanSha256}.`,
  );
}
if (expectedChunkCountPerProject * supportedProjects.length !== expectedCanonicalExecutionCount) {
  fail("G06 canonical desktop/mobile execution count drifted.");
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

function rewardWrite(write: ObservedWrite) {
  return (
    isApiFamilyPath(write.pathname, "/api/gamification") ||
    isApiFamilyPath(write.pathname, "/api/rewards") ||
    isApiFamilyPath(write.pathname, "/api/teacher/gamification") ||
    isApiFamilyPath(write.pathname, "/api/teacher/rewards") ||
    isApiFamilyPath(write.pathname, "/api/teacher/reward-awards")
  );
}

function mountWriteViolations(observedWrites: readonly ObservedWrite[]) {
  const violations: string[] = [];
  for (const write of observedWrites.filter((entry) => entry.stage === "mount")) {
    if (isApiFamilyPath(write.pathname, "/api/visualization-sessions")) {
      violations.push(`${write.method} ${write.pathname} created a session during mount.`);
    } else if (rewardWrite(write)) {
      violations.push(`${write.method} ${write.pathname} changed reward state during mount.`);
    } else if (
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
  const suffix = `${uniqueSuffix(testInfo)}-${chunk.index}-pep-primary`
    .replace(/[^a-z0-9-]+/giu, "-")
    .slice(0, 100);
  const username = `g06-${suffix}@example.test`;
  const theme =
    (testInfo.project.name === "desktop-chrome") === (chunk.index === 0)
      ? "light"
      : "dark";
  const response = await page.request.post("/api/auth/register", {
    data: {
      curriculumProfile: { publisher: "MAINLAND_PEP", region: "MAINLAND" },
      curriculumTrack: "MAINLAND_PEP_PRIMARY",
      email: username,
      grade: runtime.lab.grade,
      language: "zh-Hans",
      name: `G06 PEP ${suffix}`,
      password: "start12345",
      role: "student",
      theme,
      username,
    },
  });
  const body = await readJson<{
    user?: {
      curriculumProfile?: { publisher?: unknown; region?: unknown };
      grade?: unknown;
      id?: unknown;
      role?: unknown;
      username?: unknown;
    };
  }>(response, `${chunk.id}: disposable Mainland student registration`);
  expect(body.user?.role).toBe("student");
  expect(body.user?.grade).toBe("P6");
  expect(body.user?.username).toBe(username);
  expect(body.user?.curriculumProfile).toEqual({
    publisher: "MAINLAND_PEP",
    region: "MAINLAND",
  });
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

function parseDomainState(value: string | null, label: string): DomainState {
  const parsed = parseJson(value);
  if (!isRecord(parsed)) fail(`${label}: domain state is not an object.`);
  const expectedKeys = [
    "actualUnit",
    "drawingLength",
    "drawingUnit",
    "labId",
    "mode",
    "ratioA",
    "ratioB",
    "scaleFactor",
  ];
  if (JSON.stringify(Object.keys(parsed).sort()) !== JSON.stringify(expectedKeys)) {
    fail(`${label}: domain state keys drifted: ${JSON.stringify(Object.keys(parsed).sort())}.`);
  }
  if (parsed.labId !== RATIO_PROPORTION_SCALE_LAB_ID) {
    fail(`${label}: domain state belongs to ${String(parsed.labId)}.`);
  }
  if (!(RATIO_PROPORTION_SCALE_MODES as readonly unknown[]).includes(parsed.mode)) {
    fail(`${label}: invalid mode ${String(parsed.mode)}.`);
  }
  if (!(RATIO_PROPORTION_SCALE_UNITS as readonly unknown[]).includes(parsed.drawingUnit)) {
    fail(`${label}: invalid drawing unit ${String(parsed.drawingUnit)}.`);
  }
  if (!(RATIO_PROPORTION_SCALE_UNITS as readonly unknown[]).includes(parsed.actualUnit)) {
    fail(`${label}: invalid actual unit ${String(parsed.actualUnit)}.`);
  }
  for (const key of ["drawingLength", "ratioA", "ratioB", "scaleFactor"] as const) {
    if (!Number.isSafeInteger(parsed[key]) || (parsed[key] as number) < 1) {
      fail(`${label}: ${key} is not a positive safe integer.`);
    }
  }
  return parsed as DomainState;
}

function parseProductActionRequest(value: unknown): ProductActionRequest {
  if (!isRecord(value) || typeof value.kind !== "string") {
    fail("G06 product action request is not an object with a kind.");
  }
  if (value.kind === "initial" || value.kind === "reset") {
    expect(Object.keys(value).sort()).toEqual(["kind"]);
    return { kind: value.kind };
  }
  if (value.kind === "control") {
    expect(Object.keys(value).sort()).toEqual(["controlId", "kind", "value"]);
    if (
      ![...ratioNumericControls, "drawing-length"].includes(
        value.controlId as RatioProportionScaleNumericControlId,
      ) ||
      typeof value.value !== "number" ||
      !Number.isFinite(value.value)
    ) {
      fail(`G06 product control request is malformed: ${JSON.stringify(value)}.`);
    }
    return {
      controlId: value.controlId as RatioProportionScaleNumericControlId,
      kind: "control",
      value: value.value,
    };
  }
  if (value.kind === "controller") {
    expect(Object.keys(value).sort()).toEqual(["controllerId", "kind", "value"]);
    if (
      !["mode", "actual-unit", "drawing-unit"].includes(
        value.controllerId as string,
      ) ||
      typeof value.value !== "string"
    ) {
      fail(`G06 product controller request is malformed: ${JSON.stringify(value)}.`);
    }
    return {
      controllerId: value.controllerId as
        | "mode"
        | RatioProportionScaleUnitControlId,
      kind: "controller",
      value: value.value as RatioProportionScaleMode | RatioProportionScaleUnit,
    };
  }
  fail(`G06 product action request kind is invalid: ${String(value.kind)}.`);
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
        disabled: control.disabled,
        kind: control instanceof HTMLSelectElement ? "select" : "range",
        max: control instanceof HTMLInputElement ? Number(control.max) : null,
        min: control instanceof HTMLInputElement ? Number(control.min) : null,
        options:
          control instanceof HTMLSelectElement
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
    if (!control.parameter) fail("Visible G06 control has no data-viz-parameter.");
    if (map.has(control.parameter)) fail(`Duplicate G06 control ${control.parameter}.`);
    map.set(control.parameter, control);
  }
  return map;
}

function controlsMatchState(controls: readonly ControlSnapshot[], state: DomainState) {
  const values = new Map(controls.map((control) => [control.parameter, control.value]));
  const expected =
    state.mode === "scale-drawing"
      ? [
          ["scale-factor", String(state.scaleFactor)],
          ["drawing-length", String(state.drawingLength)],
          ["actual-unit", state.actualUnit],
          ["drawing-unit", state.drawingUnit],
        ]
      : [
          ["ratio-a", String(state.ratioA)],
          ["ratio-b", String(state.ratioB)],
          ["scale-factor", String(state.scaleFactor)],
        ];
  expect([...values.entries()]).toEqual(expected);
}

async function domainReceipt(root: Locator): Promise<DomainReceipt> {
  const owner = root.locator('[data-mainland-ratio-proportion-scale="true"]');
  await expect(owner).toHaveCount(1);
  const mode = await owner.getAttribute("data-viz-mode");
  if (!(RATIO_PROPORTION_SCALE_MODES as readonly unknown[]).includes(mode)) {
    fail(`G06 renderer exposed invalid mode ${String(mode)}.`);
  }
  const typedMode = mode as RatioProportionScaleMode;
  const descriptor = getRatioProportionScaleControlDomainDescriptor(
    RATIO_PROPORTION_SCALE_LAB_ID,
    typedMode,
  );
  await expect(owner).toHaveAttribute("data-viz-range-domain-id", descriptor.domainId);
  await expect(owner).toHaveAttribute(
    "data-viz-domain-contract-id",
    RATIO_PROPORTION_SCALE_CONTROL_DOMAIN_CONTRACT.id,
  );
  await expect(owner).toHaveAttribute("data-viz-domain-version", "1");
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
  expect(projectionCount).toBe(0);
  return {
    domainId: descriptor.domainId,
    expected,
    match: true,
    observed,
    projectionCount: 0,
    rejection: (await owner.getAttribute("data-viz-domain-rejection")) as
      | RatioProportionScaleControlDomainErrorCode
      | null,
    requested,
  };
}

async function productActionReceipt(root: Locator): Promise<ProductActionReceipt> {
  const owner = root.locator('[data-mainland-ratio-proportion-scale="true"]');
  const raw = parseJson(await owner.getAttribute("data-viz-action-receipt"));
  if (!isRecord(raw)) fail("G06 product action receipt is not an object.");
  expect(Object.keys(raw).sort()).toEqual([
    "before",
    "expected",
    "observed",
    "projections",
    "rejection",
    "request",
    "requested",
    "status",
    "version",
  ]);
  if (raw.version !== RATIO_PROPORTION_SCALE_ACTION_RECEIPT_CONTRACT.id) {
    fail(`G06 product action receipt version drifted: ${String(raw.version)}.`);
  }
  if (raw.status !== "accepted" && raw.status !== "rejected") {
    fail(`G06 product action receipt status drifted: ${String(raw.status)}.`);
  }
  const rejection = raw.rejection;
  if (
    rejection !== null &&
    ![
      "CONTROL_NOT_VISIBLE",
      "DIRECT_CONTROL_OUT_OF_RANGE",
      "INVALID_CONTROL_VALUE",
      "INVALID_CONTROLLER",
      "INVALID_LAB_ID",
      "INVALID_MODE",
      "INVALID_STATE",
      "INVALID_UNIT",
    ].includes(rejection as string)
  ) {
    fail(`G06 product action rejection drifted: ${String(rejection)}.`);
  }
  if (!Array.isArray(raw.projections) || raw.projections.length !== 0) {
    fail("G06 product action receipt invented a hidden projection.");
  }
  const receipt = {
    before: parseDomainState(JSON.stringify(raw.before), "action before"),
    expected: parseDomainState(JSON.stringify(raw.expected), "action expected"),
    observed: parseDomainState(JSON.stringify(raw.observed), "action observed"),
    projections: [] as const,
    rejection: rejection as RatioProportionScaleControlDomainErrorCode | null,
    request: parseProductActionRequest(raw.request),
    requested: parseDomainState(JSON.stringify(raw.requested), "action requested"),
    status: raw.status,
    version: raw.version,
  } satisfies ProductActionReceipt;
  await expect(owner).toHaveAttribute(
    "data-viz-action-receipt-version",
    receipt.version,
  );
  await expect(owner).toHaveAttribute("data-viz-action-status", receipt.status);
  await expect(owner).toHaveAttribute(
    "data-viz-action-rejection",
    receipt.rejection ?? "none",
  );
  expect(parseJson(await owner.getAttribute("data-viz-action-request"))).toEqual(
    receipt.request,
  );
  expect(parseJson(await owner.getAttribute("data-viz-action-before"))).toEqual(
    receipt.before,
  );
  expect(parseJson(await owner.getAttribute("data-viz-action-requested"))).toEqual(
    receipt.requested,
  );
  expect(parseJson(await owner.getAttribute("data-viz-action-expected"))).toEqual(
    receipt.expected,
  );
  expect(parseJson(await owner.getAttribute("data-viz-action-observed"))).toEqual(
    receipt.observed,
  );
  expect(parseJson(await owner.getAttribute("data-viz-action-projections"))).toEqual(
    [],
  );
  return receipt;
}

async function runtimeDigest(root: Locator) {
  const owner = root.locator('[data-mainland-ratio-proportion-scale="true"]');
  return JSON.stringify({
    actionBefore: await owner.getAttribute("data-viz-action-before"),
    actionExpected: await owner.getAttribute("data-viz-action-expected"),
    actionObserved: await owner.getAttribute("data-viz-action-observed"),
    actionProjections: await owner.getAttribute("data-viz-action-projections"),
    actionReceipt: await owner.getAttribute("data-viz-action-receipt"),
    actionRejection: await owner.getAttribute("data-viz-action-rejection"),
    actionRequest: await owner.getAttribute("data-viz-action-request"),
    actionRequested: await owner.getAttribute("data-viz-action-requested"),
    actionStatus: await owner.getAttribute("data-viz-action-status"),
    actionVersion: await owner.getAttribute("data-viz-action-receipt-version"),
    controls: await visibleControls(root),
    domainId: await owner.getAttribute("data-viz-range-domain-id"),
    expected: await owner.getAttribute("data-viz-domain-expected"),
    geometry: await root
      .locator("[data-viz-ratio-proportion-scale-visual]")
      .evaluateAll((elements) =>
        elements.map((element) => ({
          kind: element.getAttribute("data-viz-ratio-proportion-scale-visual"),
          marks: element.getAttribute("data-viz-painted-mark-count"),
          receipt: element.getAttribute("data-viz-geometry-receipt"),
        })),
      ),
    mode: await owner.getAttribute("data-viz-mode"),
    observed: await owner.getAttribute("data-viz-domain-observed"),
    projectionCount: await owner.getAttribute("data-viz-domain-projection-count"),
    rejection: await owner.getAttribute("data-viz-domain-rejection"),
    requested: await owner.getAttribute("data-viz-domain-requested"),
    semanticState: await owner.getAttribute("data-viz-state"),
    state: await owner.getAttribute("data-viz-configured-state"),
  });
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
  fail(`${phase}: G06 renderer exposed no two consecutive exact digests.`);
}

async function assertProductionIdentity(root: Locator) {
  await expect(root).toHaveAttribute("data-viz-active-lab-id", runtime.labId);
  await expect(root).toHaveAttribute(
    "data-viz-lesson-session-owner",
    "first-control-interaction",
  );
  await expect(root).toHaveAttribute("data-viz-module-id", configuredModuleId);
  await expect(root).toHaveAttribute("data-viz-topic-id", runtime.labId);
  await expect(root).toHaveAttribute("data-viz-production-renderer", productionRenderer);
  await expect(root.locator('[data-mainland-ratio-proportion-scale="true"]')).toHaveCount(1);
  const renderer = root.locator('[data-mainland-ratio-proportion-scale="true"]');
  await expect(renderer).toBeVisible();
  await expect(renderer).toHaveAttribute("data-viz-topic-id", runtime.labId);
  await expect(renderer).toHaveAttribute(
    "data-viz-configured-model",
    RATIO_PROPORTION_SCALE_MODEL_CONTRACT.version,
  );
  await expect(renderer).toHaveAttribute(
    "data-viz-model",
    RATIO_PROPORTION_SCALE_MODEL_CONTRACT.version,
  );
  await expect(renderer).toHaveAttribute(
    "data-viz-family",
    RATIO_PROPORTION_SCALE_MODEL_CONTRACT.family,
  );
  await expect(root.locator("[data-viz-configured-model]")).toHaveCount(1);
  await expect(root.locator('[data-viz-configured-model="fraction-bar"]')).toHaveCount(0);
  await expect(
    root.locator("[data-viz-authoring-only], [data-viz-manim-authoring-dock]"),
  ).toHaveCount(0);
  const reset = root.locator(
    `[data-viz-reset-model][data-viz-reset-module-id=${JSON.stringify(configuredModuleId)}][data-viz-reset-topic-id=${JSON.stringify(runtime.labId)}]`,
  );
  await expect(reset).toHaveCount(1);
  await expect(reset).toBeVisible();
}

async function assertModeAndControls(root: Locator, state: DomainState) {
  const buttons = root.locator("[data-viz-mode-button]");
  await expect(buttons).toHaveCount(RATIO_PROPORTION_SCALE_MODES.length);
  expect(
    await buttons.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-viz-mode") ?? ""),
    ),
  ).toEqual([...RATIO_PROPORTION_SCALE_MODES]);
  await expect(root.locator('[data-viz-mode-button][aria-pressed="true"]')).toHaveCount(1);
  await expect(
    root.locator(
      `[data-viz-mode-button][data-viz-mode=${JSON.stringify(state.mode)}]`,
    ),
  ).toHaveAttribute("aria-pressed", "true");

  const controls = await visibleControls(root);
  const map = controlMap(controls);
  const expectedParameters =
    state.mode === "scale-drawing"
      ? ["scale-factor", "drawing-length", "actual-unit", "drawing-unit"]
      : ["ratio-a", "ratio-b", "scale-factor"];
  expect([...map.keys()]).toEqual(expectedParameters);
  for (const control of controls) expect(control.disabled).toBe(false);
  for (const parameter of
    state.mode === "scale-drawing" ? scaleNumericControls : ratioNumericControls) {
    expect(map.get(parameter)).toMatchObject({
      kind: "range",
      max: 10_000,
      min: 1,
      step: 1,
    });
    const locator = root.locator(
      `input[type="range"][data-viz-parameter=${JSON.stringify(parameter)}]`,
    );
    await expect(locator).not.toHaveAttribute("data-viz-range-affects", /.+/u);
    await expect(locator).not.toHaveAttribute("data-viz-range-projection", /.+/u);
    await expect(locator).not.toHaveAttribute("data-viz-range-projection-reason", /.+/u);
  }
  if (state.mode === "scale-drawing") {
    expect(map.get("drawing-unit")).toMatchObject({
      kind: "select",
      options: [...RATIO_PROPORTION_SCALE_UNITS],
    });
    expect(map.get("actual-unit")).toMatchObject({
      kind: "select",
      options: [...RATIO_PROPORTION_SCALE_UNITS],
    });
    await expect(root.locator('[data-viz-parameter="ratio-a"]')).toHaveCount(0);
    await expect(root.locator('[data-viz-parameter="ratio-b"]')).toHaveCount(0);
  } else {
    await expect(root.locator('[data-viz-parameter="drawing-length"]')).toHaveCount(0);
    await expect(root.locator('[data-viz-parameter="drawing-unit"]')).toHaveCount(0);
    await expect(root.locator('[data-viz-parameter="actual-unit"]')).toHaveCount(0);
  }
  controlsMatchState(controls, state);
  return controls;
}

function rationalParts(value: unknown, label: string) {
  if (typeof value !== "string" || !/^-?\d+\/\d+$/u.test(value)) {
    fail(`${label}: exact rational is ${JSON.stringify(value)}.`);
  }
  const [numerator, denominator] = value.split("/").map((part) => BigInt(part));
  if (denominator === BigInt(0)) fail(`${label}: rational denominator is zero.`);
  return { denominator, numerator };
}

function expectRational(value: unknown, numerator: bigint, denominator: bigint, label: string) {
  const actual = rationalParts(value, label);
  expect(actual.numerator * denominator, `${label}: rational numerator`).toBe(
    numerator * actual.denominator,
  );
}

function receiptRecord(value: unknown, label: string) {
  if (!isRecord(value)) fail(`${label}: visual receipt is not an object.`);
  return value;
}

async function auditVisualSurface(root: Locator, state: DomainState): Promise<VisualReceipt> {
  await expect(
    root.locator('[data-viz-ratio-proportion-scale-visual-status="unsupported"]'),
  ).toHaveCount(0);
  const visual = root.locator(
    `[data-viz-ratio-proportion-scale-visual=${JSON.stringify(state.mode)}]`,
  );
  await expect(visual).toHaveCount(1);
  await expect(visual).toBeVisible();
  await expect(visual).toHaveAttribute("data-viz-svg-background", "opaque");
  await expect(visual).toHaveAttribute("data-viz-verified", "true");
  await expect(visual).toHaveAttribute("role", "img");
  const receipt = receiptRecord(
    parseJson(await visual.getAttribute("data-viz-geometry-receipt")),
    state.mode,
  );
  expect(receipt.kind).toBe(state.mode);
  expect(receipt.status).toBe("supported");
  const markCount = Number(await visual.getAttribute("data-viz-painted-mark-count"));
  const expectedMarks =
    state.mode === "equivalent-ratios" || state.mode === "direct-proportion" ? 5 : 3;
  expect(markCount).toBe(expectedMarks);
  await expect(visual.locator('[data-viz-painted-mark="true"]')).toHaveCount(markCount);
  await expect(root.locator('[data-viz-visible-equation="true"]')).toHaveCount(1);
  await expect(root.locator("[data-viz-visible-receipt]")).toHaveAttribute(
    "data-viz-visible-receipt",
    state.mode,
  );

  const ratioA = BigInt(state.ratioA);
  const ratioB = BigInt(state.ratioB);
  const factor = BigInt(state.scaleFactor);
  if (state.mode === "equivalent-ratios") {
    const first = receiptRecord(receipt.firstRatio, "equivalent first ratio");
    const second = receiptRecord(receipt.secondRatio, "equivalent second ratio");
    const cross = receiptRecord(receipt.crossProducts, "equivalent cross products");
    expectRational(first.antecedent, ratioA, BigInt(1), "first antecedent");
    expectRational(first.consequent, ratioB, BigInt(1), "first consequent");
    expectRational(second.antecedent, ratioA * factor, BigInt(1), "second antecedent");
    expectRational(second.consequent, ratioB * factor, BigInt(1), "second consequent");
    expectRational(cross.left, ratioA * ratioB * factor, BigInt(1), "left cross product");
    expectRational(cross.right, ratioA * ratioB * factor, BigInt(1), "right cross product");
    await expect(visual.locator('[data-viz-name="ratio-bar"]')).toHaveCount(4);
    await expect(visual.locator('[data-viz-name="ratio-scale-arrow"]')).toHaveCount(1);
  } else if (state.mode === "direct-proportion") {
    const first = receiptRecord(receipt.firstPair, "direct first pair");
    const second = receiptRecord(receipt.secondPair, "direct second pair");
    const constant = receiptRecord(receipt.constantK, "direct constant");
    const cross = receiptRecord(receipt.crossProducts, "direct cross products");
    expectRational(first.independent, ratioA, BigInt(1), "direct first independent");
    expectRational(first.dependent, ratioB, BigInt(1), "direct first dependent");
    expectRational(second.independent, ratioA * factor, BigInt(1), "direct second independent");
    expectRational(second.dependent, ratioB * factor, BigInt(1), "direct second dependent");
    expectRational(constant.first, ratioB, ratioA, "direct first k");
    expectRational(constant.second, ratioB, ratioA, "direct second k");
    expectRational(cross.left, ratioA * ratioB * factor, BigInt(1), "direct left cross product");
    expectRational(cross.right, ratioA * ratioB * factor, BigInt(1), "direct right cross product");
    await expect(visual.locator('[data-viz-name="direct-axis"]')).toHaveCount(2);
    await expect(visual.locator('[data-viz-name="direct-ray"]')).toHaveCount(1);
    await expect(visual.locator('[data-viz-name="direct-point"]')).toHaveCount(2);
  } else if (state.mode === "inverse-proportion") {
    const first = receiptRecord(receipt.firstPair, "inverse first pair");
    const second = receiptRecord(receipt.secondPair, "inverse second pair");
    const product = receiptRecord(receipt.constantProduct, "inverse product");
    expectRational(first.first, ratioA, BigInt(1), "inverse first x");
    expectRational(first.second, ratioB, BigInt(1), "inverse first y");
    expectRational(second.first, ratioA * factor, BigInt(1), "inverse second x");
    expectRational(second.second, ratioB, factor, "inverse second y");
    expectRational(product.first, ratioA * ratioB, BigInt(1), "inverse first area");
    expectRational(product.second, ratioA * ratioB, BigInt(1), "inverse second area");
    await expect(visual.locator('[data-viz-name="inverse-area"]')).toHaveCount(2);
    await expect(visual.locator('[data-viz-name="inverse-transform-arrow"]')).toHaveCount(1);
  } else {
    const drawing = receiptRecord(receipt.drawingDimension, "scale drawing dimension");
    const actualInDrawing = receiptRecord(
      receipt.actualInDrawingUnits,
      "scale actual in drawing units",
    );
    const actual = receiptRecord(receipt.actualDimension, "scale actual dimension");
    const conversion = receiptRecord(receipt.unitConversion, "scale unit conversion");
    const drawingMillimetres = BigInt(unitInMillimetres[state.drawingUnit]);
    const actualMillimetres = BigInt(unitInMillimetres[state.actualUnit]);
    expect(drawing.unit).toBe(state.drawingUnit);
    expect(actualInDrawing.unit).toBe(state.drawingUnit);
    expect(actual.unit).toBe(state.actualUnit);
    expectRational(drawing.length, BigInt(state.drawingLength), BigInt(1), "drawing length");
    expectRational(
      actualInDrawing.length,
      BigInt(state.drawingLength) * factor,
      BigInt(1),
      "actual in drawing units",
    );
    expectRational(
      actual.length,
      BigInt(state.drawingLength) * factor * drawingMillimetres,
      actualMillimetres,
      "actual converted length",
    );
    expectRational(
      receipt.reconstructionInDrawingUnits,
      BigInt(state.drawingLength) * factor,
      BigInt(1),
      "scale reconstruction",
    );
    expectRational(
      conversion.drawingUnitInMillimetres,
      drawingMillimetres,
      BigInt(1),
      "drawing unit conversion",
    );
    expectRational(
      conversion.actualUnitInMillimetres,
      actualMillimetres,
      BigInt(1),
      "actual unit conversion",
    );
    await expect(visual.locator('[data-viz-name="scale-length"]')).toHaveCount(2);
    await expect(visual.locator('[data-viz-name="scale-conversion-arrow"]')).toHaveCount(1);
  }
  return { kind: state.mode, markCount, receipt };
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
  const scroll = root.locator('[data-viz-local-scroll="horizontal"]');
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
  return { localScroll, pageOverflow, touchTargetCount: touchTargets.length };
}

function assertActionReceipt(action: ActionEvidence, domain: DomainReceipt) {
  if (action.expectedRejection) {
    expect(domain.rejection).toBe(action.expectedRejection);
    expect(domain.observed).toEqual(action.before);
    expect(domain.expected).toEqual(action.before);
    expect(domain.requested).toEqual(action.before);
    return;
  }
  expect(domain.rejection).toBeNull();
  expect(domain.observed).toEqual(action.expectedState);
  expect(domain.expected).toEqual(action.expectedState);
  expect(domain.requested).toEqual(action.expectedState);
  expect(domain.projectionCount).toBe(0);
}

function assertProductActionReceipt(
  action: ActionEvidence,
  receipt: ProductActionReceipt,
) {
  expect(receipt.request).toEqual(action.plannedRequest);
  expect(receipt.before).toEqual(action.before);
  expect(receipt.projections).toEqual([]);
  if (action.expectedRejection) {
    expect(receipt.status).toBe("rejected");
    expect(receipt.rejection).toBe(action.expectedRejection);
    expect(receipt.requested).toEqual(action.before);
    expect(receipt.expected).toEqual(action.before);
    expect(receipt.observed).toEqual(action.before);
    return;
  }
  expect(receipt.status).toBe("accepted");
  expect(receipt.rejection).toBeNull();
  expect(receipt.requested).toEqual(action.expectedState);
  expect(receipt.expected).toEqual(action.expectedState);
  expect(receipt.observed).toEqual(action.expectedState);
}

async function visibleControlIdentityForRequest(
  root: Locator,
  request: ProductActionRequest,
): Promise<VisibleControlIdentity> {
  if (request.kind === "initial" || request.kind === "reset") return null;
  if (request.kind === "control") {
    const control = root.locator(
      `input[type="range"][data-viz-parameter=${JSON.stringify(request.controlId)}]`,
    );
    await expect(control).toHaveCount(1);
    await expect(control).toBeVisible();
    await expect(control).toHaveValue(String(request.value));
    return { controlId: request.controlId, kind: "control" };
  }
  if (request.controllerId === "mode") {
    const controller = root.locator(
      `[data-viz-mode-button][data-viz-mode=${JSON.stringify(request.value)}]`,
    );
    await expect(controller).toHaveCount(1);
    await expect(controller).toBeVisible();
    await expect(controller).toHaveAttribute("aria-pressed", "true");
  } else {
    const controller = root.locator(
      `select[data-viz-parameter=${JSON.stringify(request.controllerId)}]`,
    );
    await expect(controller).toHaveCount(1);
    await expect(controller).toBeVisible();
    await expect(controller).toHaveValue(String(request.value));
  }
  return {
    controllerId: request.controllerId,
    kind: "controller",
    value: request.value,
  };
}

async function auditSettledState(
  root: Locator,
  stateId: string,
  action: ActionEvidence,
): Promise<StateReceipt> {
  await settleExactRuntime(root, stateId);
  await assertProductionIdentity(root);
  const domain = await domainReceipt(root);
  assertActionReceipt(action, domain);
  const productAction = await productActionReceipt(root);
  assertProductActionReceipt(action, productAction);
  const controls = await assertModeAndControls(root, domain.observed);
  const configuredState = parseDomainState(
    await root
      .locator('[data-mainland-ratio-proportion-scale="true"]')
      .getAttribute("data-viz-configured-state"),
    "configured state",
  );
  expect(configuredState).toEqual(domain.observed);
  expect(
    parseDomainState(
      await root
        .locator('[data-mainland-ratio-proportion-scale="true"]')
        .getAttribute("data-viz-state"),
      "semantic state",
    ),
  ).toEqual(domain.observed);
  const visibleControlIdentity = await visibleControlIdentityForRequest(
    root,
    action.plannedRequest,
  );
  const visual = await auditVisualSurface(root, domain.observed);
  const runtimeSignatureBeforeScans = await runtimeDigest(root);
  const collisionSnapshot = await scanHkVisualizationCollisions(root, stateId);
  expect(collisionSnapshot.issues).toEqual([]);
  for (const exemption of collisionSnapshot.overlapExemptions) {
    expect(exemption.owner.trim().length).toBeGreaterThan(0);
    expect(exemption.reason?.trim().length ?? 0).toBeGreaterThan(0);
  }
  const collision = chinaVisualizationCollisionReceipt(collisionSnapshot);
  const contrast = await root.evaluate(scanHkVisualizationTextContrast, {
    authoringSelector: "[data-viz-authoring-only], [data-viz-manim-authoring-dock]",
  });
  expect(contrast.checkedTextCount).toBeGreaterThan(0);
  expect(contrast.worst).not.toBeNull();
  expect(contrast.issues).toEqual([]);
  if (!contrast.worst) fail(`${stateId}: contrast scanner returned no worst sample.`);
  const { localScroll, pageOverflow, touchTargetCount } =
    await auditTouchAndOverflow(root);
  await root.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  const runtimeSignatureAfterScans = await runtimeDigest(root);
  expect(
    runtimeSignatureAfterScans,
    `${stateId}: G06 runtime drifted during collision/contrast/layout audits`,
  ).toBe(runtimeSignatureBeforeScans);
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
    localScroll,
    pageOverflow,
    productAction,
    runtimeSignature: runtimeSignatureAfterScans,
    stateId,
    touchTargetCount,
    visibleControlIdentity,
    visual,
  };
}

function bindPlannedDescriptorToReceipt(
  descriptor: PlannedStateDescriptor,
  receipt: StateReceipt,
) {
  const expected = expectedStateDescriptorById.get(receipt.stateId);
  if (
    expected === undefined ||
    validatorCanonicalJson(descriptor) !== validatorCanonicalJson(expected) ||
    descriptor.stateId !== receipt.stateId ||
    descriptor.labId !== receipt.configuredState.labId ||
    descriptor.labId !== receipt.domain.observed.labId ||
    descriptor.labId !== receipt.productAction.observed.labId ||
    descriptor.plan.mode !== receipt.configuredState.mode ||
    descriptor.plan.mode !== receipt.domain.observed.mode ||
    descriptor.plan.mode !== receipt.productAction.observed.mode ||
    descriptor.plan.kind !== receipt.action.plannedRequest.kind ||
    validatorCanonicalJson(descriptor.plan.request) !==
      validatorCanonicalJson(receipt.action.plannedRequest) ||
    validatorCanonicalJson(descriptor.plan.request) !==
      validatorCanonicalJson(receipt.productAction.request)
  ) {
    fail(
      `${descriptor.stateId}: planned semantic descriptor does not bind to its actual G06 receipt.`,
    );
  }
  const request = receipt.action.plannedRequest;
  const expectedControlParameter =
    request.kind === "control"
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
      `${descriptor.stateId}: exact G06 control identity is absent from its actual receipt.`,
    );
  }
  if (
    request.kind === "control" &&
    !receipt.controls.some(({ parameter }) => parameter === request.controlId)
  ) {
    fail(
      `${descriptor.stateId}: exact G06 controlId is absent from its visible controls.`,
    );
  }
  if (
    request.kind === "controller" &&
    request.controllerId !== "mode" &&
    !receipt.controls.some(({ parameter }) => parameter === request.controllerId)
  ) {
    fail(
      `${descriptor.stateId}: exact G06 controllerId is absent from its visible controls.`,
    );
  }
  return descriptor;
}

async function currentDomainState(root: Locator) {
  return parseDomainState(
    await root
      .locator('[data-mainland-ratio-proportion-scale="true"]')
      .getAttribute("data-viz-configured-state"),
    "current domain state",
  );
}

async function setRangeValue(control: Locator, value: number) {
  await control.evaluate((element, nextValue) => {
    if (!(element instanceof HTMLInputElement) || element.type !== "range") {
      throw new TypeError("G06 endpoint target is not input[type=range].");
    }
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    if (!setter) throw new TypeError("Native range value setter is unavailable.");
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
    control.step <= 0 ||
    control.max < control.min
  ) {
    fail(`${control.parameter}: invalid endpoint descriptor ${JSON.stringify(control)}.`);
  }
  if (endpoint === "min") return control.min;
  if (endpoint === "max") return control.max;
  const stepCount = Math.floor((control.max - control.min) / control.step / 2);
  return Math.min(control.max, control.min + stepCount * control.step);
}

async function clickMode(root: Locator, mode: RatioProportionScaleMode) {
  const button = root.locator(
    `[data-viz-mode-button][data-viz-mode=${JSON.stringify(mode)}]`,
  );
  await expect(button).toHaveCount(1);
  await expect(button).toBeEnabled();
  await button.click();
  await settleExactRuntime(root, `enter-mode:${mode}`);
}

async function clickReset(root: Locator) {
  const reset = root.locator(
    `[data-viz-reset-model][data-viz-reset-module-id=${JSON.stringify(configuredModuleId)}][data-viz-reset-topic-id=${JSON.stringify(runtime.labId)}]`,
  );
  await expect(reset).toHaveCount(1);
  await reset.click();
  await settleExactRuntime(root, "reset");
}

function stateFromReset() {
  return resetRatioProportionScaleInput("equivalent-ratios") as DomainState;
}

async function assertResetState(root: Locator) {
  expect(await currentDomainState(root)).toEqual(stateFromReset());
}

async function prepareIndependentMode(
  root: Locator,
  mode: RatioProportionScaleMode,
) {
  await clickReset(root);
  await assertResetState(root);
  await clickMode(root, mode);
}

function actionEvidence(
  before: DomainState,
  expectedState: DomainState,
  plannedRequest: ActionEvidence["plannedRequest"],
  expectedRejection: RatioProportionScaleControlDomainErrorCode | null = null,
): ActionEvidence {
  return {
    before,
    expectedRejection,
    expectedState,
    plannedRequest,
  };
}

async function executeIndependentPlan(
  root: Locator,
  plan:
    | FirstInteractionPlan
    | InitialPlan
    | ModePlan
    | NumericEndpointPlan
    | ResetPlan
    | UnitPairPlan,
  planIndex: number,
) {
  if (plan.kind === "initial") {
    await assertResetState(root);
    const current = await currentDomainState(root);
    return actionEvidence(current, current, { kind: "initial" });
  }
  if (plan.kind === "first-interaction") {
    const before = await currentDomainState(root);
    const control = root.locator('input[type="range"][data-viz-parameter="ratio-a"]');
    await expect(control).toHaveCount(1);
    const current = Number(await control.inputValue());
    const maximum = Number(await control.getAttribute("max"));
    const key = current < maximum ? "ArrowUp" : "ArrowDown";
    const next = key === "ArrowUp" ? current + 1 : current - 1;
    await control.focus();
    await control.press(key);
    await settleExactRuntime(root, plan.id);
    const observed = await currentDomainState(root);
    expect(observed).toEqual({ ...before, ratioA: next });
    return actionEvidence(before, observed, {
      controlId: "ratio-a",
      kind: "control",
      value: next,
    });
  }
  if (plan.kind === "reset") {
    const before = await currentDomainState(root);
    await clickReset(root);
    await assertResetState(root);
    return actionEvidence(before, stateFromReset(), { kind: "reset" });
  }
  if (plan.kind === "mode") {
    if (planIndex > 0) await prepareIndependentMode(root, "equivalent-ratios");
    const before = await currentDomainState(root);
    await clickMode(root, plan.mode);
    const observed = await currentDomainState(root);
    expect(observed).toEqual({ ...before, mode: plan.mode });
    return actionEvidence(before, observed, {
      controllerId: "mode",
      kind: "controller",
      value: plan.mode,
    });
  }

  if (plan.kind === "numeric-endpoint") {
    await prepareIndependentMode(root, plan.mode);
    const before = await currentDomainState(root);
    const controls = controlMap(await visibleControls(root));
    const target = controls.get(plan.parameter);
    if (!target) fail(`${plan.id}: visible numeric control is missing.`);
    const value = endpointValue(target, plan.endpoint);
    await setRangeValue(
      root.locator(
        `input[type="range"][data-viz-parameter=${JSON.stringify(plan.parameter)}]`,
      ),
      value,
    );
    await settleExactRuntime(root, plan.id);
    const observed = await currentDomainState(root);
    const field = {
      "drawing-length": "drawingLength",
      "ratio-a": "ratioA",
      "ratio-b": "ratioB",
      "scale-factor": "scaleFactor",
    }[plan.parameter] as "drawingLength" | "ratioA" | "ratioB" | "scaleFactor";
    expect(observed).toEqual({ ...before, [field]: value });
    return actionEvidence(before, observed, {
      controlId: plan.parameter,
      kind: "control",
      value,
    });
  }

  await prepareIndependentMode(root, "scale-drawing");
  const before = await currentDomainState(root);
  await root
    .locator('select[data-viz-parameter="drawing-unit"]')
    .selectOption(plan.drawingUnit);
  await settleExactRuntime(root, `${plan.id}:drawing`);
  const beforeActualUnit = await currentDomainState(root);
  expect(beforeActualUnit).toEqual({ ...before, drawingUnit: plan.drawingUnit });
  await root
    .locator('select[data-viz-parameter="actual-unit"]')
    .selectOption(plan.actualUnit);
  await settleExactRuntime(root, plan.id);
  const observed = await currentDomainState(root);
  expect(observed).toEqual({
    ...before,
    actualUnit: plan.actualUnit,
    drawingUnit: plan.drawingUnit,
  });
  return actionEvidence(beforeActualUnit, observed, {
    controllerId: "actual-unit",
    kind: "controller",
    value: plan.actualUnit,
  });
}

async function executeRoundTripPlan(root: Locator, plan: RoundTripPlan) {
  if (plan.step === "prepare-scale-factor") {
    await prepareIndependentMode(root, "scale-drawing");
    const before = await currentDomainState(root);
    await setRangeValue(
      root.locator('input[type="range"][data-viz-parameter="scale-factor"]'),
      37,
    );
    await settleExactRuntime(root, plan.id);
    const observed = await currentDomainState(root);
    return actionEvidence(before, { ...before, scaleFactor: 37 }, {
      controlId: "scale-factor",
      kind: "control",
      value: 37,
    });
  }
  if (plan.step === "prepare-drawing-length") {
    const before = await currentDomainState(root);
    await setRangeValue(
      root.locator('input[type="range"][data-viz-parameter="drawing-length"]'),
      19,
    );
    await settleExactRuntime(root, plan.id);
    return actionEvidence(before, { ...before, drawingLength: 19 }, {
      controlId: "drawing-length",
      kind: "control",
      value: 19,
    });
  }
  if (plan.step === "prepare-drawing-unit") {
    const before = await currentDomainState(root);
    await root.locator('select[data-viz-parameter="drawing-unit"]').selectOption("km");
    await settleExactRuntime(root, plan.id);
    return actionEvidence(before, { ...before, drawingUnit: "km" }, {
      controllerId: "drawing-unit",
      kind: "controller",
      value: "km",
    });
  }
  if (plan.step === "prepare-actual-unit") {
    const before = await currentDomainState(root);
    await root.locator('select[data-viz-parameter="actual-unit"]').selectOption("mm");
    await settleExactRuntime(root, plan.id);
    return actionEvidence(before, { ...before, actualUnit: "mm" }, {
      controllerId: "actual-unit",
      kind: "controller",
      value: "mm",
    });
  }
  if (plan.step === "leave-scale") {
    const before = await currentDomainState(root);
    await clickMode(root, "direct-proportion");
    const observed = await currentDomainState(root);
    expect(observed).toEqual({ ...before, mode: "direct-proportion" });
    expect(observed).toMatchObject({
      actualUnit: "mm",
      drawingLength: 19,
      drawingUnit: "km",
      scaleFactor: 37,
    });
    return actionEvidence(before, observed, {
      controllerId: "mode",
      kind: "controller",
      value: "direct-proportion",
    });
  }
  const before = await currentDomainState(root);
  await clickMode(root, "scale-drawing");
  const observed = await currentDomainState(root);
  expect(observed).toEqual({ ...before, mode: "scale-drawing" });
  expect(observed).toMatchObject({
    actualUnit: "mm",
    drawingLength: 19,
    drawingUnit: "km",
    scaleFactor: 37,
  });
  return actionEvidence(before, observed, {
    controllerId: "mode",
    kind: "controller",
    value: "scale-drawing",
  });
}

async function executePlan(
  root: Locator,
  plan: StatePlan,
  planIndex: number,
) {
  if (plan.kind === "round-trip") return await executeRoundTripPlan(root, plan);
  return await executeIndependentPlan(root, plan, planIndex);
}

async function awaitFirstSessionAck(
  responsePromise: Promise<import("@playwright/test").Response>,
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
  if (!isRecord(delivery) || !isRecord(delivery.session)) {
    fail(`${runtime.labId}: first-control ACK is not an exact object.`);
  }
  assertExactSet(`${runtime.labId}: first-control ACK keys`, Object.keys(delivery), [
    "acknowledgedUserId",
    "durablyPersisted",
    "session",
  ]);
  assertExactSet(`${runtime.labId}: first-control ACK session keys`, Object.keys(delivery.session), [
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
  const acknowledgement = {
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
  expect(delivery).toEqual(acknowledgement);
  return acknowledgement;
}

function assertCanonicalRunner(testInfo: TestInfo) {
  expect(testInfo.retry, "G06 release evidence forbids retries").toBe(0);
  expect(testInfo.config.shard, "G06 release evidence forbids sharding").toBeNull();
  const grep = Array.isArray(testInfo.config.grep)
    ? testInfo.config.grep
    : [testInfo.config.grep];
  expect(
    grep.every((pattern) => pattern.source === ".*" && pattern.flags === ""),
    "G06 release evidence forbids grep filtering",
  ).toBe(true);
  expect(testInfo.config.grepInvert, "G06 release evidence forbids grep-invert").toBeNull();
  expect(testInfo.config.projects.map((project) => project.name).sort()).toEqual(
    [...supportedProjects].sort(),
  );
  expect(testInfo.config.maxFailures).toBe(0);
  expect(testInfo.config.workers).toBe(1);
  expect(testInfo.repeatEachIndex).toBe(0);
  for (const project of testInfo.config.projects) {
    expect(project.repeatEach).toBe(1);
  }
  expect(testInfo.outputDir.startsWith("/Volumes/Starship/")).toBe(true);
  const pathNames = [
    "HK_MATH_DB_PATH",
    "NODE_COMPILE_CACHE",
    "PLAYWRIGHT_BROWSER_PROFILE_EVIDENCE_PATH",
    "PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH",
    "PLAYWRIGHT_BROWSER_TEMP_DIR",
    "PLAYWRIGHT_CRASH_DUMP_DIR",
    "PLAYWRIGHT_E2E_ROOT",
    "PLAYWRIGHT_NEXT_DIST_DIR",
    "PLAYWRIGHT_OUTPUT_DIR",
    "PLAYWRIGHT_PATH_MANIFEST_PATH",
    "PLAYWRIGHT_REPORT_DIR",
    "PLAYWRIGHT_SERVER_LOG_PATH",
    "TEMP",
    "TMP",
    "TMPDIR",
    "npm_config_cache",
  ] as const;
  for (const name of pathNames) {
    const value = process.env[name];
    if (!value?.startsWith("/Volumes/Starship/")) {
      fail(`G06 ${name} escaped Starship: ${String(value)}.`);
    }
  }
  const manifestPath = process.env.PLAYWRIGHT_PATH_MANIFEST_PATH!;
  const manifest = parseJson(readFileSync(manifestPath, "utf8"));
  if (
    !isRecord(manifest) ||
    manifest.schemaVersion !== 1 ||
    manifest.status !== "preflight-passed" ||
    !isRecord(manifest.contract) ||
    !isRecord(manifest.paths)
  ) {
    fail("G06 Starship path manifest is malformed.");
  }
  expect(manifest.contract.mutablePathsOnlyOnStarship).toBe(true);
  expect(manifest.contract.starshipRoot).toBe("/Volumes/Starship");
  for (const [label, value] of Object.entries(manifest.paths)) {
    if (typeof value !== "string" || !value.startsWith("/Volumes/Starship/")) {
      fail(`G06 Starship manifest path ${label} is invalid: ${String(value)}.`);
    }
  }
  return { manifestPath, pathNames };
}

function databasePathFromStarshipManifest(manifestPath: string) {
  const manifest = parseJson(readFileSync(manifestPath, "utf8"));
  if (!isRecord(manifest) || !isRecord(manifest.paths)) {
    fail("G06 Starship path manifest lost its paths object.");
  }
  const databasePath = manifest.paths.databasePath;
  if (
    typeof databasePath !== "string" ||
    !databasePath.startsWith("/Volumes/Starship/") ||
    databasePath !== process.env.HK_MATH_DB_PATH
  ) {
    fail(
      `G06 manifest/environment database identity drifted: ${String(databasePath)}.`,
    );
  }
  return databasePath;
}

async function runExactDurabilityProbe({
  durability,
  includeRaw,
  page,
  root,
  userId,
}: Readonly<{
  durability: ReturnType<
    typeof createVisualizationLessonDurabilityBrowserAdapter
  >;
  includeRaw: boolean;
  page: Page;
  root: Locator;
  userId: string;
}>) {
  const resetMode = stateFromReset().mode;
  const probeMode = "direct-proportion" as const;
  expect(probeMode).not.toBe(resetMode);
  const beforeFirst = await currentDomainState(root);
  expect(beforeFirst).toEqual(stateFromReset());

  const modeButton = root.locator(
    `[data-viz-mode-button][data-viz-mode=${JSON.stringify(probeMode)}]`,
  );
  await expect(modeButton).toHaveCount(1);
  await expect(modeButton).toBeVisible();
  await expect(modeButton).toBeEnabled();
  await expect(modeButton).toHaveAttribute("aria-pressed", "false");
  const firstExpectedControl = {
    controlKey: "direct-proportion",
    eventTypes: ["pointerup", "click"],
  } as const;
  const firstProductRequest: ProductActionRequest = {
    controllerId: "mode",
    kind: "controller",
    value: probeMode,
  };

  const firstFence = await durability.armRealControl({
    expectedButtonClick: firstExpectedControl,
    ordinal: 1,
  });
  const sessionPromise = page.waitForResponse(
    (candidate) =>
      candidate.request().method() === "POST" &&
      isSameOriginApplicationUrl(candidate.url()) &&
      new URL(candidate.url()).pathname === "/api/visualization-sessions",
    { timeout: 30_000 },
  );
  await modeButton.click();
  const sessionAcknowledgement = await awaitFirstSessionAck(
    sessionPromise,
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
    { controlKey: "direct-proportion", key: null, type: "pointerup" },
    { controlKey: "direct-proportion", key: null, type: "click" },
  ]);
  const afterFirst = await currentDomainState(root);
  expect(afterFirst).toEqual({ ...beforeFirst, mode: probeMode });
  const firstProductAction = await productActionReceipt(root);
  assertProductActionReceipt(
    actionEvidence(beforeFirst, afterFirst, firstProductRequest),
    firstProductAction,
  );

  const resetButton = root.locator(
    `[data-viz-reset-model][data-viz-reset-module-id=${JSON.stringify(configuredModuleId)}][data-viz-reset-topic-id=${JSON.stringify(runtime.labId)}]`,
  );
  await expect(resetButton).toHaveCount(1);
  await expect(resetButton).toBeVisible();
  await expect(resetButton).toBeEnabled();
  const secondProductRequest: ProductActionRequest = { kind: "reset" };
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
  expect(second.expectedControl).toEqual(secondExpectedControl);
  expect(second.controlEvents.map(({ controlKey, key, type }) => ({
    controlKey,
    key,
    type,
  }))).toEqual([
    { controlKey: runtime.labId, key: null, type: "pointerup" },
    { controlKey: runtime.labId, key: null, type: "click" },
  ]);
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
  const frozenEventCount = controlObserverStop.events.length;
  const ledgerFrozen =
    Object.isFrozen(controlObserverStop) &&
    Object.isFrozen(controlObserverStop.events) &&
    controlObserverStop.events.every((event) => Object.isFrozen(event)) &&
    Object.isFrozen(controlObserverStop.removedEventTypes);
  expect(frozenEventCount).toBe(4);
  expect(ledgerFrozen).toBe(true);
  await assertResetState(root);
  const afterSecond = await currentDomainState(root);
  expect(afterSecond).toEqual(stateFromReset());
  const secondProductAction = await productActionReceipt(root);
  assertProductActionReceipt(
    actionEvidence(afterFirst, afterSecond, secondProductRequest),
    secondProductAction,
  );

  return Object.freeze({
    controlObserverStop,
    first,
    second,
    sessionAcknowledgement,
  });
}

const executedChunkIds: string[] = [];
const executedStateIds: string[] = [];
const executedRawReplayTopicIds: string[] = [];
const executedRawReplayProjects: string[] = [];
const executedProjectNames = new Set<string>();
const expectedRawReplayCountAcrossReport = 1 as const;
const expectedRawReplayProjects = ["desktop-chrome"] as const;
const expectedRawReplayTopicIds = [RATIO_PROPORTION_SCALE_LAB_ID] as const;
if (
  expectedRawReplayTopicIds.length !== expectedRawReplayCountAcrossReport ||
  expectedRawReplayProjects.length !== expectedRawReplayCountAcrossReport
) {
  fail("G06 report-wide raw replay quota must remain exactly one desktop topic.");
}

test.describe("Mainland G06 ratio proportion scale production route acceptance", () => {
  test.describe.configure({ mode: "serial", retries: 0 });

  test.afterAll(() => {
    expect(executedChunkIds, "G06 chunk ledger rejects grep/shard/partial runs").toEqual(
      expectedChunkIds,
    );
    expect(
      executedStateIds,
      "G06 state ledger rejects gaps/duplicates/out-of-order",
    ).toEqual(expectedStateIds);
    expect(new Set(executedStateIds).size).toBe(expectedStateCountPerProject);
    const desktopProjectExecuted = executedProjectNames.has("desktop-chrome");
    expect(
      executedRawReplayTopicIds,
      "G06 raw replay ledger requires exactly the first canonical desktop chunk and zero mobile replays",
    ).toEqual(desktopProjectExecuted ? [...expectedRawReplayTopicIds] : []);
    expect(executedRawReplayProjects).toEqual(
      desktopProjectExecuted ? [...expectedRawReplayProjects] : [],
    );
    expect(new Set(executedRawReplayTopicIds).size).toBe(
      executedRawReplayTopicIds.length,
    );
    expect(new Set(executedRawReplayProjects).size).toBe(
      executedRawReplayProjects.length,
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
        fail(`${chunk.id}: registration navigated the bound Page before durability arm.`);
      }
      if (typeof baseURL !== "string") {
        fail(`${chunk.id}: Playwright exposed no application baseURL.`);
      }
      const appOrigin = new URL(baseURL).origin;
      const lessonSlug = lessonSlugForTopicId(runtime.labId);
      const databasePath = databasePathFromStarshipManifest(
        pathReceipt.manifestPath,
      );
      const siblingTopicIds = [] as const satisfies readonly string[];
      expect(
        siblingTopicIds,
        `${chunk.id}: G06 has no sibling production topic`,
      ).toEqual([]);
      expect(runtime.lab.analyticsSource).not.toBe("lesson");
      const learnerProfileSetup =
        await prepareVisualizationLessonLearnerProfileBeforeArm({
          appOrigin,
          page,
          userId: student.userId,
        });
      expect(learnerProfileSetup).toMatchObject({
        appOrigin,
        method: "PATCH",
        pathname: "/api/me/learner-profile",
        shouldShowOnboarding: false,
        status: "skipped",
        statusCode: 200,
        userId: student.userId,
      });
      if (page.url() !== "about:blank") {
        fail(`${chunk.id}: pre-arm learner profile setup navigated the bound Page.`);
      }
      const activeRootSelector =
        `[data-viz-active-lab-id=${JSON.stringify(runtime.labId)}]`;
      const durability = createVisualizationLessonDurabilityBrowserAdapter({
        page,
        testInfo,
        expected: {
          appOrigin,
          grade: runtime.lab.grade,
          userId: student.userId,
          moduleId: configuredModuleId,
          selectedTopicId: runtime.labId,
          siblingTopicIds,
          lessonSlug,
          source: runtime.lab.analyticsSource,
        },
        databasePath,
        rootSelector: activeRootSelector,
        controlSelector:
          "[data-viz-mode-button], [data-viz-parameter], [data-viz-reset-model]",
        readRuntimeDigest: async (activeRoot) =>
          await runtimeDigest(activeRoot),
      });
      await durability.armBeforeNavigation({ learnerProfileSetup });
      const response = await page.goto(`/student/lessons/${encodeURIComponent(lessonSlug)}`, {
        waitUntil: "domcontentloaded",
      });
      expect(response).not.toBeNull();
      expect(response?.status()).toBeLessThan(400);
      expect(
        await page.locator("html").evaluate((element) => element.classList.contains("dark")),
      ).toBe(student.theme === "dark");

      const visualizationSection = page.locator("section#visualization");
      await expect(visualizationSection).toHaveCount(1);
      await expect(visualizationSection).toBeVisible({ timeout: 30_000 });
      await expect(page.locator(activeRootSelector)).toHaveCount(1);
      const root = visualizationSection.locator(activeRootSelector);
      await expect(root).toHaveCount(1);
      await expect(root).toBeVisible({ timeout: 30_000 });
      await assertProductionIdentity(root);
      await assertResetState(root);

      const rawReplayRepresentative =
        testInfo.project.name === "desktop-chrome" && chunk.index === 0;
      const mountDurability = await durability.waitForMountTerminal({
        deadlineMs: 30_000,
        includeRaw: rawReplayRepresentative,
        root,
      });
      expect(await visualizationSessions(page)).toEqual([]);
      expect(mountWriteViolations(observedWrites)).toEqual([]);

      let initialCanonicalReceipt: StateReceipt | null = null;
      const firstChunkPlan = chunk.plans[0];
      if (firstChunkPlan?.kind === "initial") {
        const initialStateId = `${runtime.labId}:${firstChunkPlan.id}`;
        initialCanonicalReceipt = await auditSettledState(
          root,
          initialStateId,
          await executePlan(root, firstChunkPlan, 0),
        );
        expect(initialCanonicalReceipt.productAction.request).toEqual({
          kind: "initial",
        });
        expect(await visualizationSessions(page)).toEqual([]);
      }

      stage = "interaction";
      const durabilityProbe = await runExactDurabilityProbe({
        durability,
        includeRaw: rawReplayRepresentative,
        page,
        root,
        userId: student.userId,
      });
      stage = "audit";
      const probeSessionWrites = observedWrites.filter(
        (write) => write.pathname === "/api/visualization-sessions",
      );
      expect(probeSessionWrites).toEqual([{
        body: {
          moduleId: configuredModuleId,
          source: runtime.lab.analyticsSource,
          topicId: runtime.labId,
        },
        method: "POST",
        pathname: "/api/visualization-sessions",
        stage: "interaction",
      }]);

      const receipts: StateReceipt[] = [];
      const plannedStateDescriptors: PlannedStateDescriptor[] = [];
      for (const [planIndex, plan] of chunk.plans.entries()) {
        const stateId = `${runtime.labId}:${plan.id}`;
        let receipt: StateReceipt;
        if (plan.kind === "initial") {
          if (initialCanonicalReceipt === null) {
            fail(`${chunk.id}: canonical initial receipt was not captured before probe.`);
          }
          receipt = initialCanonicalReceipt;
        } else {
          receipt = await auditSettledState(
            root,
            stateId,
            await executePlan(root, plan, planIndex),
          );
        }
        expect(receipt.domain.observed).toEqual(receipt.configuredState);
        receipts.push(receipt);
        plannedStateDescriptors.push(
          bindPlannedDescriptorToReceipt(plannedStateDescriptor(plan), receipt),
        );
      }

      const actualStateIds = receipts.map((receipt) => receipt.stateId);
      const plannedStateIds = chunk.plans.map((plan) => `${runtime.labId}:${plan.id}`);
      expect(actualStateIds).toEqual(plannedStateIds);
      expect(plannedStateDescriptors.map(({ stateId }) => stateId)).toEqual(
        actualStateIds,
      );
      expect(new Set(actualStateIds).size).toBe(plannedStateIds.length);
      if (chunk.index === runtimeChunks.length - 1) {
        expect(actualStateIds.at(-1)).toBe(`${runtime.labId}:reset`);
        expect(receipts.at(-1)?.configuredState).toEqual(stateFromReset());
      }

      const sessionWrites = observedWrites.filter(
        (write) => write.pathname === "/api/visualization-sessions",
      );
      expect(sessionWrites).toEqual([{
        body: {
          moduleId: configuredModuleId,
          source: runtime.lab.analyticsSource,
          topicId: runtime.labId,
        },
        method: "POST",
        pathname: "/api/visualization-sessions",
        stage: "interaction",
      }]);
      expect(observedWrites.filter(rewardWrite)).toEqual([]);
      for (const write of observedWrites.filter(
        (entry) => entry.pathname === "/api/learning-events",
      )) {
        for (const event of visualizationLearningEvents(write.body)) {
          expect(event).toMatchObject({ topicId: runtime.labId });
        }
      }
      const finalSessions = await visualizationSessions(page);
      expect(finalSessions).toEqual([
        expect.objectContaining({
          explored: true,
          moduleId: configuredModuleId,
          source: runtime.lab.analyticsSource,
          topicId: runtime.labId,
          updatedAt: expect.any(String),
        }),
      ]);
      if (rawReplayRepresentative) {
        await durability.replayFirstDeliveryExactly({
          first: durabilityProbe.first,
        });
        executedRawReplayTopicIds.push(runtime.labId);
        executedRawReplayProjects.push(testInfo.project.name);
      }
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

      await testInfo.attach(
        `china-mainland-g06-${String(chunk.index + 1).padStart(2, "0")}-${testInfo.project.name}.json`,
        {
          body: Buffer.from(
            JSON.stringify(
              {
                canonicalExecutionCount: expectedCanonicalExecutionCount,
                chunkId: chunk.id,
                chunkStateCounts: expectedChunkStateCounts,
                collisionScannerSha256,
                contrastScannerSha256,
                durabilityReceipts: {
                  controlEvidence: {
                    first: {
                      controlEvents: durabilityProbe.first.controlEvents,
                      expectedControl: durabilityProbe.first.expectedControl,
                    },
                    second: {
                      controlEvents: durabilityProbe.second.controlEvents,
                      controlObserverStop: durabilityProbe.second.controlObserverStop,
                      expectedControl: durabilityProbe.second.expectedControl,
                    },
                    final: {
                      controlEvents: durabilityReceipt.controlEvents,
                      controlObserverStop: durabilityReceipt.controlObserverStop,
                      expectedControl: durabilityReceipt.expectedControl,
                    },
                  },
                  final: durabilityReceipt,
                  firstSessionAcknowledgement:
                    durabilityProbe.sessionAcknowledgement,
                  mount: mountDurability,
                  rawReplayLedger: {
                    expectedCountAcrossReport:
                      expectedRawReplayCountAcrossReport,
                    expectedProjects: expectedRawReplayProjects,
                    expectedTopicIds: expectedRawReplayTopicIds,
                    included: rawReplayRepresentative,
                    representativeRule:
                      "desktop-chrome:first-canonical-chunk-for-g06-topic",
                    topicId: runtime.labId,
                  },
                },
                expectedChunkIds,
                expectedStateCountPerProject,
                expectedStateDescriptorPlanSha256,
                expectedStatePlanSha256,
                integrationSourceSha256,
                producerSourceSha256,
                observedStateDescriptorPlanSha256,
                observedStatePlanSha256,
                pathReceipt,
                plannedStateDescriptors,
                plannedStateIds,
                project: testInfo.project.name,
                receipts,
                schemaVersion: "china-mainland-g06-ratio-proportion-scale-production.v3",
                sessionWrites,
                sourceHardRejects,
                sourceAggregates: {
                  durabilityBrowserPairSha256:
                    observedDurabilityBrowserPairAggregateSha256,
                  durabilityFourFileSha256:
                    observedDurabilityFourFileAggregateSha256,
                  durabilitySerialization:
                    durabilityPackageAggregateSerialization,
                  scannerEntries: scannerPackageEntries.map(
                    ({ repositoryRelativePath }) => repositoryRelativePath,
                  ),
                  scannerSerialization: scannerPackageAggregateSerialization,
                  scannerSha256: observedScannerPackageAggregateSha256,
                },
                stateDescriptorSerializer,
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
