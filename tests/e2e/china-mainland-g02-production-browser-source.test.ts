import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const browserPath = new URL("./china-mainland-g02-production-browser.spec.ts", import.meta.url);
const planPath = new URL("./china-mainland-g02-production-plan.ts", import.meta.url);
const receiptPath = new URL("./china-mainland-g02-production-receipt.ts", import.meta.url);
const playwrightPackagePath = new URL("../../node_modules/@playwright/test/package.json", import.meta.url);
const playwrightCliModelPath = new URL("../../node_modules/playwright/lib/testActions.js", import.meta.url);

function sha256(path: URL) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function browserSource() {
  return readFileSync(browserPath, "utf8");
}

function receiptSource() {
  return readFileSync(receiptPath, "utf8");
}

test("G02 browser producer imports the approved plan and exact receipt validator without fixture evidence", () => {
  assert.equal(
    sha256(planPath),
    "645490037c9bc5963b5923c5dd072b9ab744a48e8d5c0235b2dd8785af974755",
  );
  assert.match(browserSource(), /import \{ G02_PRODUCTION_PLAN \} from "\.\/china-mainland-g02-production-plan";/u);
  assert.match(browserSource(), /sealG02ProductionBrowserPayload/u);
  assert.match(browserSource(), /validateG02ProductionBrowserReceipt/u);
  assert.doesNotMatch(browserSource(), /validateG02UntrustedStructuralReceipt/u);
  assert.doesNotMatch(browserSource(), /createG02ProductionReceiptFixture/u);
  assert.equal(
    sha256(receiptPath),
    "8f01d86c76e1e489492fe8125b16d13d43cd4ec369facf0841916ab07517f5c2",
  );
  assert.equal(
    sha256(browserPath),
    "5046e4731d10537f72a3f516201fb8e774fd6bcd83ed079fc99dea06d8097268",
  );
});

test("G02 browser keeps the hard authority guard and cannot substitute untrusted structural acceptance", () => {
  const browser = browserSource();
  const receipt = receiptSource();
  const guardCall = browser.indexOf("const runnerInvocation = requireG02ProductionRunnerAuthority();");
  const projectCall = browser.indexOf("const project = projectFrom(testInfo);", guardCall);
  const publicValidation = browser.indexOf("validateG02ProductionBrowserReceipt(receipt, project)");
  const attachment = browser.indexOf("testInfo.attach", publicValidation);

  assert.ok(guardCall >= 0 && projectCall > guardCall);
  assert.ok(publicValidation > projectCall && attachment > publicValidation);
  assert.match(browser, /assertG02TrustedRunnerAuthority/u);
  assert.doesNotMatch(browser, /validateG02UntrustedStructuralReceipt/u);
  assert.match(
    receipt,
    /export function validateG02UntrustedStructuralReceipt[\s\S]*?return true;/u,
  );
  assert.match(
    receipt,
    /export function validateG02ProductionBrowserReceipt[\s\S]*?validateG02UntrustedStructuralReceipt\(candidate, project\);[\s\S]*?native[\s\S]*?unavailable/u,
  );
});

test("G02 producer derives every desktop and mobile state from the exact four-lab plan", () => {
  const source = browserSource();
  assert.match(source, /const SUPPORTED_PROJECTS = \["desktop-chrome", "mobile-chrome"\] as const;/u);
  assert.match(source, /for \(const \[labSequenceIndex, labId\] of G02_PRODUCTION_PLAN\.labIds\.entries\(\)\)/u);
  assert.match(source, /G02_PRODUCTION_PLAN\.logicalStates\.interactionStateIds\.filter/u);
  assert.match(source, /G02_PRODUCTION_PLAN\.logicalStates\.visualStateIds\.filter/u);
  assert.match(source, /expectedInteractionStateIds/u);
  assert.match(source, /expectedVisualStateIds/u);
  assert.match(source, /expect\(interactionStates\.map\(\(receipt\) => receipt\.stateId\)\)\.toEqual/u);
  assert.match(source, /expect\(visualStates\.map\(\(receipt\) => receipt\.stateId\)\)\.toEqual/u);
  assert.doesNotMatch(source, /\.skip\(|\.fixme\(|\.only\(|\brepresentative\b|\bsampled (?:state|lab|axis)/iu);
});

test("G02 producer rejects grep, grepInvert, project, shard, retry, and skip narrowing", () => {
  const source = browserSource();
  assert.match(source, /configuredProjects[\s\S]*?toEqual\(\[\.\.\.SUPPORTED_PROJECTS\]\)/u);
  assert.match(source, /globalGrep/u);
  assert.match(source, /config\.grepInvert/u);
  assert.match(source, /configuredProject\.grep/u);
  assert.match(source, /configuredProject\.grepInvert/u);
  assert.match(source, /configuredProject\.retries/u);
  assert.match(source, /testInfo\.config\.shard/u);
  assert.match(source, /testInfo\.retry/u);
  assert.doesNotMatch(source, /testInfo\.skip|test\.skip|test\.fixme|test\.only/u);
});

test("installed Playwright 1.59.1 CLI semantics prove public FullConfig is not selection authority", () => {
  const packageJson = JSON.parse(readFileSync(playwrightPackagePath, "utf8")) as {
    version?: unknown;
  };
  const cliModel = readFileSync(playwrightCliModelPath, "utf8");
  assert.equal(packageJson.version, "1.59.1");
  assert.match(cliModel, /config\.cliArgs = args/u);
  assert.match(cliModel, /config\.cliGrep = opts\.grep/u);
  assert.match(cliModel, /config\.cliGrepInvert = opts\.grepInvert/u);
  assert.match(cliModel, /config\.cliProjectFilter = opts\.project \|\| void 0/u);
  assert.match(cliModel, /filterProjects\)\(config\.projects, config\.cliProjectFilter\)/u);
  assert.match(cliModel, /retries: options\.retries \? parseInt\(options\.retries, 10\) : void 0/u);
  assert.match(cliModel, /shard: resolveShardOption\(options\.shard\)/u);
});

test("G02 direct Playwright and caller JSON plus SHA fail closed without native runner authority", () => {
  const browser = browserSource();
  const receipt = receiptSource();
  const start = browser.indexOf("function requireG02ProductionRunnerAuthority(");
  const end = browser.indexOf("function expectedInteractionAxis", start);
  assert.ok(start >= 0 && end > start);
  const authorityBlock = browser.slice(start, end);
  assert.match(authorityBlock, /readG02RunnerInvocationEnvironment\(process\.env\)/u);
  assert.match(authorityBlock, /assertG02TrustedRunnerAuthority/u);
  assert.doesNotMatch(authorityBlock, /testInfo\.config/u);
  assert.match(
    browser,
    /const runnerInvocation = requireG02ProductionRunnerAuthority\(\);[\s\S]*?const project = projectFrom\(testInfo\);/u,
  );
  assert.match(receipt, /authorityAvailable: false/u);
  assert.match(receipt, /releaseReady: false/u);
  assert.match(receipt, /runnerReceiptSha256: null/u);
  assert.match(receipt, /coverage unavailable:[\s\S]*?trusted native runner\/spawn\/wait\/immutable-receipt authority/u);
  assert.match(receipt, /direct Playwright, desktop-only, grep narrowing, grep-invert narrowing, shard, retry, and project narrowing/u);
  assert.match(browser, /execution: \{ complete: false/u);
  assert.match(browser, /runnerInvocation,/u);
  assert.doesNotMatch(authorityBlock, /cliProjectFilter|cliGrepInvert|cliGrep/u);
});

test("G02 producer gives every compound physical subaction its own exact learning-event request and ACK", () => {
  const source = browserSource();
  assert.match(source, /\/api\/learning-events/u);
  assert.match(source, /zero per-subaction analytics request/u);
  assert.match(source, /rawBody: unknown/u);
  assert.match(source, /rawEvents: unknown\[\] \| null/u);
  assert.match(source, /rawResponseBody: unknown/u);
  assert.match(source, /rawEvents: isRecord\(rawBody\) && Array\.isArray\(rawBody\.events\)/u);
  assert.match(source, /delivery\.rawEvents[\s\S]*?toHaveLength\(1\)/u);
  assert.match(source, /rawBody\.events[\s\S]*?toEqual\(delivery\.rawEvents\)/u);
  assert.match(source, /sole full-shape raw event/u);
  assert.match(source, /\["grade", "id", "source", "timestamp", "topicId", "type"\]/u);
  assert.match(source, /isExactEmptyAnalyticsHandshake/u);
  assert.match(source, /qualifyingDeliveries\(harness\)\.length - preActionQualifyingDeliveryCount/u);
  assert.match(source, /\.toBe\(1\)/u);
  assert.match(source, /delivery\.responseStatus/u);
  assert.match(source, /\.toBe\(200\)/u);
  assert.match(source, /rawResponseBody\.acknowledgedEventIds/u);
  assert.match(source, /x-mais-analytics-user-id/u);
  assert.match(source, /analyticsEvidence:/u);
  assert.match(source, /eventIds: \[event\.id\]/u);
  assert.match(source, /consumedAnalyticsEventIds/u);
  assert.match(source, /preceding analytics event/u);
  assert.match(source, /subactionId: descriptor\.subactionId/u);
  assert.match(source, /type: expectedEventType/u);
  assert.match(source, /kind: "setup"/u);
  assert.match(source, /kind: "primary"/u);
  assert.match(source, /kind: "reset"/u);
  assert.match(source, /subactions\.push\(receipt\)/u);
  assert.doesNotMatch(source, /analyticsEvents:\s*\[\s*\{[^}]*event:/u);
  assert.doesNotMatch(source, /function visualizationLearningEvents|startsWith\("visualization-"\)/u);
  assert.doesNotMatch(source, /page\.route|route\.fulfill|addInitScript|fabricat|synthetic.*analytics/iu);
});

test("G02 producer closes every analytics window and proves payload-wide captured-consumed equality", () => {
  const source = browserSource();
  const validator = receiptSource();
  assert.match(source, /ANALYTICS_QUIET_INTERVAL_MS = 250/u);
  assert.match(source, /pre-subaction analytics window must be quiet/u);
  assert.match(source, /post-action analytics window must stay quiet/u);
  assert.match(source, /preActionQualifyingDeliveryCount/u);
  assert.match(source, /postActionQualifyingDeliveryCount/u);
  assert.match(source, /captureSequence/u);
  assert.match(source, /no late\/unconsumed analytics delivery after all visual axes/u);
  assert.match(source, /labCapturedIds[\s\S]*?toEqual\(labConsumedIds\)/u);
  assert.match(source, /capturedQualifyingEventIds/u);
  assert.match(source, /consumedReceiptEventIds/u);
  assert.match(source, /unconsumedEventIds: \[\]/u);
  assert.match(source, /lateDeliveryCount: 0/u);
  assert.match(source, /monotonicWallClock/u);
  assert.match(source, /performance\.timeOrigin \+ monotonicMs/u);
  assert.match(source, /actionStartedAt/u);
  assert.match(source, /requestObservedAt/u);
  assert.match(source, /actionSettledAt/u);
  assert.match(source, /actionStartedMonotonicMs/u);
  assert.match(source, /requestObservedMonotonicMs/u);
  assert.match(source, /actionSettledMonotonicMs/u);
  assert.match(source, /CLOCK_PRECISION_TOLERANCE_MS = 2/u);
  assert.match(source, /performance\.timeOrigin/u);
  assert.match(source, /sampleOrigins/u);
  assert.match(source, /eventTimestamp[\s\S]*?requestObservedAt \+ CLOCK_PRECISION_TOLERANCE_MS/u);
  assert.match(source, /eventTimestamp[\s\S]*?actionSettledAt \+ CLOCK_PRECISION_TOLERANCE_MS/u);
  assert.match(validator, /event timestamp is stale, delayed, or outside its exact physical subaction interval/u);
  assert.match(validator, /G02_CLOCK_PRECISION_TOLERANCE_MS = 2/u);
  assert.match(validator, /jointOrigins[\s\S]*?temporal\.wallClockMinusMonotonicOriginMs[\s\S]*?Date\.parse\(temporal\.actionStartedAt\)/u);
  assert.match(validator, /actions do not share one exact wall-clock-minus-monotonic origin/u);
  assert.match(validator, /captureSequence does not strictly order later action start after prior settle in both clock domains/u);
});

test("G02 producer binds catalog source, topic, grade, and durability user in the retained event", () => {
  const source = browserSource();
  assert.match(source, /getVisualizationLabByLabId\(labId\)/u);
  assert.match(source, /event\.grade[\s\S]*?catalog\.grade/u);
  assert.match(source, /event\.topicId[\s\S]*?toBe\(labId\)/u);
  assert.match(source, /event\.source[\s\S]*?toBe\(expectedSource\)/u);
  assert.match(source, /ownerUserId[\s\S]*?toBe\(expectedUserId\)/u);
  assert.match(source, /topicId: event\.topicId/u);
  assert.match(source, /userId: expectedUserId/u);
});

test("G02 producer uses real mouse or keyboard, touch taps, and exact two-way CDP swipes", () => {
  const source = browserSource();
  assert.match(source, /page\.touchscreen\.tap/u);
  assert.match(source, /page\.mouse\.click/u);
  assert.match(source, /locator\.press/u);
  assert.match(source, /context\.newCDPSession\(page\)/u);
  assert.match(source, /Input\.dispatchTouchEvent/u);
  assert.match(source, /touchStart/u);
  assert.match(source, /touchMove/u);
  assert.match(source, /touchEnd/u);
  assert.match(source, /data-viz-scroll-container/u);
  assert.match(source, /"toward-end"/u);
  assert.match(source, /"toward-start"/u);
  assert.match(source, /signedDisplacement/u);
  assert.match(source, /afterScrollLeft: after/u);
  assert.match(source, /beforeScrollLeft: before/u);
  assert.match(source, /moveCount: 4/u);
  assert.match(source, /roundTrip: \{ continuityTolerancePx: 2, returnRegionFraction: 0\.25 \}/u);
  assert.match(receiptSource(), /continuityGap/u);
  assert.match(receiptSource(), /materially return to the initial region/u);
  assert.doesNotMatch(source, /HTMLInputElement\.prototype|dispatchEvent\s*\(|\.selectOption\s*\(|\.fill\s*\(/u);
});

test("G02 C6 mobile native ranges calibrate real touch to an exact value without setters", () => {
  const source = browserSource();
  assert.match(source, /calibrateMobileNativeRange/u);
  assert.match(source, /MOBILE_RANGE_CALIBRATION_MAX_TAPS/u);
  assert.match(source, /page\.touchscreen\.tap/u);
  assert.match(source, /await range\.inputValue\(\)/u);
  assert.match(source, /mobile range calibration could not reach exact native value/u);
  assert.match(source, /candidateX = \(lowerX \+ upperX\) \/ 2/u);
  assert.match(source, /observed === desired/u);
  const calibrationStart = source.indexOf("async function calibrateMobileNativeRange(");
  const calibrationEnd = source.indexOf("async function setRangeThroughRealInput(", calibrationStart);
  assert.ok(calibrationStart >= 0 && calibrationEnd > calibrationStart);
  const calibration = source.slice(calibrationStart, calibrationEnd);
  assert.match(calibration, /page\.touchscreen\.tap/u);
  assert.doesNotMatch(calibration, /thumbRadius|page\.mouse|evaluate\(|press\(|record\(|learning-events/u);
  assert.match(source, /page\.touchscreen\.tap:calibrated-bisection:\$\{calibrationAttempts\.length\}:exact-native-value/u);
  assert.match(receiptSource(), /calibratedMobileRange/u);
  assert.match(source, /await expect\(range\)\.toHaveValue\(String\(target\)\)/u);
  assert.match(source, /qualifyingDeliveries\(harness\)\.length - preActionQualifyingDeliveryCount[\s\S]*?toBe\(1\)/u);
  assert.doesNotMatch(source, /HTMLInputElement\.prototype|nativeSetter|\.value\s*=|dispatchEvent\s*\(/u);
});

test("G02 C8 source accounts every calibration tap and every platform pointer-up commit", () => {
  const source = browserSource();
  assert.match(source, /calibrationAttempts/u);
  assert.match(source, /beforeValue/u);
  assert.match(source, /afterValue/u);
  assert.match(source, /plannedRole/u);
  assert.match(source, /valueChanged/u);
  assert.match(source, /physicalCaptureSequence/u);
  assert.match(source, /finalSettlingAttemptIndex/u);
  assert.match(source, /one-visualization-slider-event-per-physical-tap-including-native-no-op/u);
  assert.match(source, /valueChangingAttemptCount/u);
  assert.match(source, /retainedDeliveryEventIds/u);
  assert.match(source, /consumedDeliveryEventIds/u);
  assert.match(source, /attempt\.startedAt/u);
  assert.match(source, /attempt\.settledAt/u);
  assert.match(source, /attempt\.coordinate/u);
  assert.match(source, /page\.touchscreen\.tap\(candidateX, y\)/u);
  assert.match(source, /finalAttempt\.delivery/u);
  assert.doesNotMatch(source, /uncalibrated.*setter|evaluate\([^)]*value|nativeSetter/iu);
});

test("G02 C8 source uses plan controls, immutable geometry, total taps, and per-tap slider ACKs", () => {
  const source = browserSource();
  const validator = receiptSource();
  assert.match(validator, /expected\.control/u);
  assert.match(validator, /control\.selected/u);
  assert.match(validator, /control\.min/u);
  assert.match(validator, /control\.max/u);
  assert.match(validator, /control\.step/u);
  assert.match(validator, /inputGeometry/u);
  assert.match(validator, /admissibleMinX/u);
  assert.match(validator, /admissibleMaxX/u);
  assert.match(validator, /admissibleMinY/u);
  assert.match(validator, /admissibleMaxY/u);
  assert.match(validator, /midpointX/u);
  assert.match(source, /tapCategoryCounts/u);
  assert.match(source, /calibrationAttemptCount/u);
  assert.match(source, /interactionNonRangeTapCount/u);
  assert.match(source, /sessionSeedTapCount/u);
  assert.match(source, /visualAxisSetupTapCount/u);
  assert.match(source, /visualResetTapCount/u);
  assert.match(source, /visualization-slider/u);
  assert.match(source, /calibrationAttempts\.length/u);
  assert.match(
    source,
    /one-visualization-slider-event-per-physical-tap-including-native-no-op/u,
  );
  assert.doesNotMatch(source, /nativeSetter|dispatchEvent\s*\(|\.value\s*=/u);
});

test("G02 C9 source shares only the production semantic event taxonomy", () => {
  const source = browserSource();
  const validator = receiptSource();
  assert.match(validator, /export function expectedG02AnalyticsEventType/u);
  assert.match(validator, /LearningAnalyticsEventType/u);
  assert.match(validator, /isValidLearningAnalyticsEvent/u);
  assert.match(source, /expectedG02AnalyticsEventType/u);
  assert.match(source, /expectedEventType = expectedG02AnalyticsEventType\(descriptor\)/u);
  assert.match(validator, /event\.type !== expectedG02AnalyticsEventType/u);
  assert.doesNotMatch(source, /visualization-action/u);
  assert.doesNotMatch(validator, /visualization-action/u);
});

test("G02 C9 source prepares and records fresh in-viewport geometry before every raw touch tap", () => {
  const source = browserSource();
  const validator = receiptSource();
  const preparationStart = source.indexOf("async function prepareRawTouchTarget(");
  const preparationEnd = source.indexOf("function assertRawTouchCoordinateInsidePreparation(", preparationStart);
  assert.ok(preparationStart >= 0 && preparationEnd > preparationStart);
  const preparation = source.slice(preparationStart, preparationEnd);
  assert.match(preparation, /locator\.scrollIntoViewIfNeeded\(\)/u);
  assert.match(preparation, /locator\.boundingBox\(\)/u);
  assert.match(preparation, /page\.viewportSize\(\)/u);
  const realTapStart = source.indexOf("async function realTapOrClick(");
  const realTapEnd = source.indexOf("type RawTouchPreparation", realTapStart);
  const realTap = source.slice(realTapStart, realTapEnd);
  assert.match(realTap, /prepareRawTouchTarget\(page, locator\)[\s\S]*?assertRawTouchCoordinateInsidePreparation[\s\S]*?page\.touchscreen\.tap[\s\S]*?recordRawTouchTap/u);
  const calibrationStart = source.indexOf("async function calibrateMobileNativeRange(");
  const calibrationEnd = source.indexOf("async function setRangeThroughRealInput(", calibrationStart);
  const calibration = source.slice(calibrationStart, calibrationEnd);
  assert.match(calibration, /initialPreparation = await prepareRawTouchTarget\(page, range\)[\s\S]*?inputGeometry/u);
  assert.match(calibration, /tapAndObserve[\s\S]*?prepareRawTouchTarget\(page, range\)[\s\S]*?assertRawTouchCoordinateInsidePreparation[\s\S]*?page\.touchscreen\.tap[\s\S]*?recordRawTouchTap/u);
  assert.match(source, /tapEntries/u);
  assert.match(source, /prepareRawTouchTarget\(page, locator\)/u);
  assert.match(source, /prepareRawTouchTarget\(page, range\)/u);
  assert.match(source, /assertMobileHeaderActionableAfterPriorPageBottom/u);
  assert.match(source, /const headerTransition = await assertMobileHeaderActionableAfterPriorPageBottom\([\s\S]*?priorVisualState,[\s\S]*?\);[\s\S]*?await setLocale/u);
  assert.match(validator, /coordinate is outside its fresh target rect or live viewport/u);
  assert.match(validator, /calibration input geometry does not match its fresh tap ledger/u);
});

test("G02 C10 source establishes and observes the selected interaction surface before initial and after reload", () => {
  const source = browserSource();
  const validator = receiptSource();
  assert.match(source, /language: interactionAxis\.locale/u);
  assert.match(source, /theme: interactionAxis\.theme/u);
  assert.match(source, /observeInteractionSurface/u);
  assert.match(source, /phase: "before-initial"/u);
  assert.match(source, /phase: "after-reload"/u);
  assert.match(source, /interactionSurfaceObservations/u);
  assert.match(source, /html.*getAttribute\("lang"\)/u);
  assert.match(source, /classList\.contains\("dark"\)/u);
  assert.match(validator, /exact live interaction-axis surface observations/u);
});

test("G02 C10 source serializes plan-bound tap identity and prior-bottom to next-header transitions", () => {
  const source = browserSource();
  const validator = receiptSource();
  for (const field of ["axisId", "labId", "phase", "stateId", "subactionId", "target", "before", "after"]) {
    assert.match(source, new RegExp(`${field}:`, "u"));
  }
  assert.match(source, /headerTransition/u);
  assert.match(source, /fromScrollId: "page-bottom"/u);
  assert.match(source, /priorVisualState\.scrollAudits\.at\(-1\)/u);
  assert.match(validator, /exact plan-derived raw tap semantic chronology/u);
  assert.match(validator, /globally increasing calibration physical sequence/u);
});

test("G02 C10 source has no awaited operation after final range geometry capture and before the raw tap", () => {
  const source = browserSource();
  const start = source.indexOf("const beforeValue = Number(await range.inputValue());");
  const capture = source.indexOf("const prepared = await prepareRawTouchTarget(page, range);", start);
  const tap = source.indexOf("await page.touchscreen.tap(candidateX, y);", capture);
  assert.ok(start >= 0 && capture > start && tap > capture);
  const finalCaptureToTap = source.slice(
    capture + "const prepared = await prepareRawTouchTarget(page, range);".length,
    tap,
  );
  assert.doesNotMatch(finalCaptureToTap, /\bawait\b/u);
  assert.match(source.slice(tap, source.indexOf("return afterValue;", tap)), /rangeMeasurement/u);
});

test("G02 C11 source observes the interaction surface before any attempted correction", () => {
  const source = browserSource();
  const validator = receiptSource();
  const start = source.indexOf("async function observeInteractionSurface(");
  const end = source.indexOf("async function realHorizontalSwipe(", start);
  assert.ok(start >= 0 && end > start);
  const observation = source.slice(start, end);
  assert.match(observation, /page\.locator\("html"\)\.getAttribute\("lang"\)/u);
  assert.match(observation, /classList\.contains\("dark"\)/u);
  assert.match(observation, /setupActions: \[\]/u);
  assert.match(observation, /setupTapCount: 0/u);
  assert.doesNotMatch(observation, /setLocale\(|setTheme\(|realTapOrClick\(/u);
  assert.match(source, /\{ labId, phase: "before-initial" \}/u);
  assert.match(source, /\{ labId, phase: "after-reload" \}/u);
  assert.match(validator, /passive interaction surface observation requires zero correction actions/u);
});

test("G02 C11 source captures prior bottom and unobscured next header before the next state tap", () => {
  const source = browserSource();
  const validator = receiptSource();
  const start = source.indexOf("async function assertMobileHeaderActionableAfterPriorPageBottom(");
  const end = source.indexOf("async function setTheme(", start);
  assert.ok(start >= 0 && end > start);
  const transition = source.slice(start, end);
  const boundary = transition.indexOf("await pageScrollGeometry(page, root)");
  const prepare = transition.indexOf("await prepareRawTouchTarget(page, header)");
  const fingerprint = transition.indexOf("document.elementFromPoint");
  assert.ok(boundary >= 0 && prepare > boundary && fingerprint > prepare);
  assert.match(transition, /fromBoundary/u);
  assert.match(transition, /toHeader/u);
  assert.match(transition, /targetFingerprint/u);
  assert.match(transition, /withinHeader/u);
  assert.match(source, /capturedMonotonicMs/u);
  assert.match(validator, /fresh prior page-bottom boundary/u);
  assert.match(validator, /unobscured next-header target fingerprint/u);
  assert.match(validator, /next exact state first physical tap/u);
});

test("G02 C6 source binds byte-stable durability and per-lab semantic capture boundaries", () => {
  const source = browserSource();
  const validator = receiptSource();
  assert.match(validator, /byte-stable sibling snapshots/u);
  assert.match(validator, /byte-stable exactly-once target snapshot/u);
  assert.match(validator, /final sibling projection from raw checkpoint/u);
  assert.match(validator, /final target projection from raw checkpoint/u);
  assert.match(validator, /semantic chronology must be interactions, visual resets, afterVisualFinal, then the next plan lab/u);
  assert.match(validator, /lastInteraction\.temporal\.captureSequence >= firstVisualReset\.temporal\.captureSequence/u);
  assert.match(validator, /lastVisualReset\.temporal\.actionSettledMonotonicMs >= boundary\.capturedMonotonicMs/u);
  assert.match(source, /for \(const \[labSequenceIndex, labId\] of G02_PRODUCTION_PLAN\.labIds\.entries\(\)\)/u);
  assert.match(source, /const afterVisualFinal = await visualizationSessions\(page\);\s*const afterVisualFinalCaptured = monotonicWallClock\(\)/u);
  assert.match(source, /afterActionCaptureSequence: lastVisualReset\.temporal\.captureSequence/u);
  assert.match(source, /capturedAt: afterVisualFinalCaptured\.iso/u);
  assert.match(source, /beforeNextActionCaptureSequence:/u);
});

test("G02 producer binds first-action POST/200 before reset and preserves all same-user siblings", () => {
  const source = browserSource();
  const validator = receiptSource();
  assert.match(source, /\/api\/visualization-sessions/u);
  assert.match(source, /x-mais-visualization-user-id/u);
  assert.match(source, /seedSiblingSessions/u);
  assert.match(source, /G02_PRODUCTION_PLAN\.labIds\.filter\(\(labId\) => labId !== targetLabId\)/u);
  assert.match(source, /exactG02SessionSnapshot/u);
  assert.match(source, /exactRawSessionCheckpoint/u);
  const rawStart = source.indexOf("function exactRawSessionCheckpoint(");
  const rawEnd = source.indexOf("function expectSiblingSessionsUnchanged", rawStart);
  assert.ok(rawStart >= 0 && rawEnd > rawStart);
  const rawCheckpoint = source.slice(rawStart, rawEnd);
  assert.match(rawCheckpoint, /sessions\.map\(\(\{ topicId \}\) => topicId\)/u);
  assert.match(rawCheckpoint, /before serialization/u);
  assert.match(rawCheckpoint, /sessions\.map\(durableSessionSnapshot\)/u);
  assert.doesNotMatch(rawCheckpoint, /\.filter\(/u);
  assert.match(source, /expectSiblingSessionsUnchanged/u);
  assert.match(source, /exactSiblingCounts/u);
  assert.match(source, /firstAckPromise/u);
  assert.match(source, /firstPrimaryGate/u);
  assert.match(source, /if \(firstPrimaryGate\) await firstPrimaryGate\(\);[\s\S]*?realReset/u);
  assert.match(source, /completedBeforeReset: true/u);
  assert.match(source, /reset:\s*\{[\s\S]*?postCount:/u);
  assert.match(source, /secondAction:\s*\{[\s\S]*?postCount:/u);
  assert.match(source, /page\.reload/u);
  assert.match(source, /afterFirst: exactSiblingCounts/u);
  assert.match(source, /afterReload: exactSiblingCounts/u);
  assert.match(source, /afterReset: exactSiblingCounts/u);
  assert.match(source, /afterSecond: exactSiblingCounts/u);
  assert.match(source, /afterVisualFinal: exactSiblingCounts/u);
  assert.match(source, /rawSessionCheckpoints:/u);
  assert.match(source, /afterRegistration: rawAfterRegistration/u);
  assert.match(source, /afterSiblingSeed: rawSiblingSeed/u);
  assert.match(source, /afterVisualFinal: rawAfterVisualFinal/u);
  assert.match(source, /const afterVisualFinal = await visualizationSessions/u);
  assert.match(source, /afterVisualFinal:[\s\S]*?siblingCounts:/u);
  assert.match(source, /afterVisualFinal:[\s\S]*?target:/u);
  assert.match(source, /finalSiblingSessions = exactG02SessionSnapshot\(afterVisualFinal\)[\s\S]*?topicId !== labId/u);
  assert.match(
    source,
    /for \(const axis of visualAxes\)[\s\S]*?const afterVisualFinal[\s\S]*?durabilityReceipts\.push/u,
  );
  assert.match(validator, /const exactSiblingLabIds = G02_PRODUCTION_PLAN\.labIds\.filter/u);
  assert.match(validator, /exact ordered G02 sibling sessions/u);
  assert.match(validator, /sibling \$\{index\} exact catalog tuple/u);
  assert.match(validator, /expectedRawSiblingLabIds/u);
  assert.match(validator, /expectedRawAllLabIds/u);
  assert.match(validator, /raw session topic multiset and order/u);
});

test("G02 producer scans every state and all three scroll positions without hollow evidence", () => {
  const source = browserSource();
  const validator = receiptSource();
  assert.match(source, /installHkVisualizationEffectiveVisibilityInspector/u);
  assert.match(source, /scanHkVisualizationCollisions/u);
  assert.match(source, /chinaVisualizationCollisionReceipt/u);
  assert.match(source, /scanHkVisualizationTextContrast/u);
  assert.match(source, /contrast\.checkedTextCount/u);
  assert.match(source, /touchTargetCheckedCount/u);
  assert.match(source, /horizontalOverflowPixels/u);
  assert.match(source, /clippedElementCount/u);
  assert.match(source, /"page-top", "visualization-center", "page-bottom"/u);
  assert.match(source, /candidatePairCount/u);
  assert.match(source, /paintedMarkCount/u);
  assert.match(source, /svgTextCount/u);
  assert.match(source, /surfaceCount/u);
  assert.match(source, /uiScan: \{[\s\S]*?clippedElementCount:[\s\S]*?collisionIssueCount:[\s\S]*?contrastIssueCount:/u);
  assert.match(source, /pageScrollGeometry/u);
  assert.match(source, /const scrollY = window\.scrollY/u);
  assert.match(source, /rootBottom: rect\.bottom/u);
  assert.match(source, /rootTop: rect\.top/u);
  assert.match(source, /const viewportHeight = window\.innerHeight/u);
  assert.match(source, /documentMaxScrollY/u);
  assert.match(source, /rootCenter/u);
  assert.match(source, /rootDocumentTop: rect\.top \+ scrollY/u);
  assert.match(source, /rootDocumentBottom: rect\.bottom \+ scrollY/u);
  assert.match(source, /rootDocumentCenter: rootCenter \+ scrollY/u);
  assert.match(source, /viewportCenter/u);
  assert.match(source, /centerTolerancePx/u);
  assert.match(source, /reachedScrollLandmark/u);
  assert.match(source, /geometry\.scrollY <= 1/u);
  assert.match(source, /geometry\.scrollY >= geometry\.documentMaxScrollY - 1/u);
  assert.match(source, /Math\.abs\(geometry\.rootCenter - geometry\.viewportCenter\)/u);
  assert.match(validator, /real top, centered visualization, or document bottom landmark was not reached/u);
  assert.match(validator, /stableDocumentCoordinate/u);
  assert.match(validator, /one physical root in document space/u);
  assert.match(source, /realMobileVerticalSwipe/u);
  assert.match(source, /cdp:Input\.dispatchTouchEvent:vertical/u);
});

test("G02 producer covers locale, theme, exact renderer, diagnostics, sealing, and attachment", () => {
  const source = browserSource();
  assert.match(source, /Language selector\|語言選擇\|语言选择/u);
  assert.match(source, /Use English\|使用英文/u);
  assert.match(source, /Use Traditional Chinese\|使用繁體中文\|使用繁体中文/u);
  assert.match(source, /Use Simplified Chinese\|使用簡體中文\|使用简体中文/u);
  assert.match(source, /Switch to dark mode\|Switch to light mode\|切換至深色模式\|切換至淺色模式\|切换至深色模式\|切换至浅色模式/u);
  assert.match(source, /data-mainland-decimal-arithmetic/u);
  assert.match(source, /data-viz-reset-model/u);
  assert.match(source, /data-viz-configured-state/u);
  assert.match(source, /consoleErrors/u);
  assert.match(source, /pageErrors/u);
  assert.match(source, /requestFailures/u);
  assert.match(source, /sealG02ProductionBrowserPayload\(payload\)/u);
  assert.match(source, /validateG02ProductionBrowserReceipt\(receipt, project\)/u);
  assert.match(source, /testInfo\.attach/u);
});

test("G02 producer recomputes hashes from the four exact named raw files and has no sentinel source hash", () => {
  const source = browserSource();
  for (const path of [
    "tests/e2e/china-mainland-g02-production-plan.ts",
    "tests/e2e/china-mainland-g02-production-receipt.ts",
    "tests/e2e/china-mainland-g02-production-browser.spec.ts",
    "tests/e2e/china-mainland-g01-g02-production-routing.spec.ts",
  ]) {
    assert.match(source, new RegExp(JSON.stringify(path).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
  assert.match(source, /RAW_SOURCE_PATHS\.map/u);
  assert.match(source, /createHash\("sha256"\)/u);
  assert.match(source, /readFileSync\(new URL\(path, repositoryRoot\)\)/u);
  assert.match(source, /sourceEvidence: \{ rawFiles: rawSourceEvidence\(\) \}/u);
  assert.doesNotMatch(source, /"(?:a{64}|0{64})"|\.repeat\(64\)/iu);
});
