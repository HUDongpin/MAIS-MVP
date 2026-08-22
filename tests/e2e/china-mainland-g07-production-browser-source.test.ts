import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const browserPath = new URL(
  "./china-mainland-g07-production-browser.spec.ts",
  import.meta.url,
);
const planPath = new URL(
  "./china-mainland-g07-production-plan.ts",
  import.meta.url,
);
const receiptPath = new URL(
  "./china-mainland-g07-production-receipt.ts",
  import.meta.url,
);
const playwrightPackagePath = new URL(
  "../../node_modules/@playwright/test/package.json",
  import.meta.url,
);
const playwrightCliModelPath = new URL(
  "../../node_modules/playwright/lib/testActions.js",
  import.meta.url,
);

function source(path: URL) {
  return readFileSync(path, "utf8");
}

function sha256(path: URL) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

test("G07 browser producer imports the immutable approved plan and public receipt gate", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  assert.equal(
    sha256(planPath),
    "33e9e4c9c5b5cd68dbf21276e3d53aaa8074825dc611099e9a0e420e9570d700",
  );
  assert.match(browser, /import \{ G07_PRODUCTION_PLAN \} from "\.\/china-mainland-g07-production-plan";/u);
  assert.match(browser, /sealG07ProductionBrowserPayload/u);
  assert.match(browser, /validateG07ProductionBrowserReceipt/u);
  assert.match(receipt, /G07_APPROVED_PLAN_CANONICAL_SHA256\s*=\s*\n?\s*"c7d41297e48880c149f25f3e7aac13ac1d16518175aa37dbd3aab6362e2cd477"/u);
  assert.match(receipt, /components\/visualizations\/mainland\/SymbolicExpressionsModel\.ts/u);
  assert.doesNotMatch(browser, /createG07ProductionReceiptFixture/u);
});

test("G07 producer derives every one of seven labs, 84 visual states, and 548 interactions from the plan", () => {
  const browser = source(browserPath);
  assert.match(browser, /const SUPPORTED_PROJECTS = \["desktop-chrome", "mobile-chrome"\] as const;/u);
  assert.match(browser, /for \(const \[labSequenceIndex, labId\] of G07_PRODUCTION_PLAN\.labIds\.entries\(\)\)/u);
  assert.match(browser, /G07_PRODUCTION_PLAN\.logicalStates\.interactionStateIds\.filter/u);
  assert.match(browser, /G07_PRODUCTION_PLAN\.logicalStates\.visualStateIds\.filter/u);
  assert.match(browser, /expectedInteractionStateIds/u);
  assert.match(browser, /expectedVisualStateIds/u);
  assert.match(browser, /interactionStates\.map\(\(receipt\) => receipt\.stateId\)/u);
  assert.match(browser, /visualStates\.map\(\(receipt\) => receipt\.stateId\)/u);
  assert.doesNotMatch(browser, /\.skip\(|\.fixme\(|\.only\(|sample|representative/iu);
});

test("Playwright 1.59 CLI canary proves public FullConfig cannot authorize narrowing", () => {
  const packageJson = JSON.parse(source(playwrightPackagePath)) as {
    version?: unknown;
  };
  const cliModel = source(playwrightCliModelPath);
  assert.equal(packageJson.version, "1.59.1");
  assert.match(cliModel, /config\.cliArgs = args/u);
  assert.match(cliModel, /config\.cliGrep = opts\.grep/u);
  assert.match(cliModel, /config\.cliGrepInvert = opts\.grepInvert/u);
  assert.match(cliModel, /config\.cliProjectFilter = opts\.project \|\| void 0/u);
  assert.match(cliModel, /filterProjects\)\(config\.projects, config\.cliProjectFilter\)/u);
});

test("G07 direct Playwright and caller JSON remain fail closed before page evidence", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  const start = browser.indexOf("function requireG07ProductionRunnerAuthority(");
  const end = browser.indexOf("function expectedInteractionAxis", start);
  assert.ok(start >= 0 && end > start);
  const authorityBlock = browser.slice(start, end);
  assert.match(authorityBlock, /readG07RunnerInvocationEnvironment\(process\.env\)/u);
  assert.match(authorityBlock, /assertG07TrustedRunnerAuthority/u);
  assert.doesNotMatch(authorityBlock, /testInfo\.config/u);
  assert.match(browser, /const runnerInvocation = requireG07ProductionRunnerAuthority\(\);[\s\S]*?const project = projectFrom\(testInfo\);/u);
  assert.match(receipt, /authorityAvailable: false/u);
  assert.match(receipt, /releaseReady: false/u);
  assert.match(receipt, /runnerReceiptSha256: null/u);
  assert.match(browser, /execution:\s*\{[\s\S]*?complete: false/u);
});

test("G07 producer retains every raw analytics delivery and proves one POST/200 ACK per physical subaction", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  assert.match(browser, /\/api\/learning-events/u);
  assert.match(browser, /rawDeliveries/u);
  assert.match(browser, /rawRequestBody/u);
  assert.match(browser, /parsedRequestBody/u);
  assert.match(browser, /serializedRequestBody/u);
  assert.match(browser, /rawResponseBody/u);
  assert.match(browser, /parsedResponseBody/u);
  assert.match(browser, /zero per-subaction analytics POST/u);
  assert.match(browser, /x-mais-analytics-user-id/u);
  assert.match(browser, /expectedAnalyticsEventType/u);
  assert.match(receipt, /"visualization-slider"/u);
  assert.match(receipt, /"visualization-probe"/u);
  assert.match(receipt, /"visualization-reset"/u);
  assert.match(browser, /responseStatus[\s\S]*?toBe\(200\)/u);
  assert.match(browser, /responseBodyReady/u);
  assert.match(browser, /kind: "setup"/u);
  assert.match(browser, /kind: "primary"/u);
  assert.match(browser, /kind: "reset"/u);
  assert.doesNotMatch(browser, /page\.route|route\.fulfill|addInitScript|fabricat|synthetic.*analytics/iu);
});

test("G07 analytics windows and terminal ledger reject late, malformed, surplus, other-lab, and reused events", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  assert.match(browser, /ANALYTICS_QUIET_INTERVAL_MS = 250/u);
  assert.match(browser, /EVENT_TIMESTAMP_TOLERANCE_MS = 1_000/u);
  assert.match(browser, /pre-subaction analytics window must be quiet/u);
  assert.match(browser, /post-action analytics window must stay quiet/u);
  assert.match(browser, /capturedRawDeliveryIds/u);
  assert.match(browser, /consumedDeliveryIds/u);
  assert.match(browser, /rawEventIds/u);
  assert.match(browser, /parsedEventIds/u);
  assert.match(browser, /serializedEventIds/u);
  assert.match(browser, /receiptEventIds/u);
  assert.match(browser, /exactTerminalEquality: true/u);
  assert.match(browser, /lateDeliveryCount: lateDeliveryCount as 0/u);
  assert.match(browser, /globalCaptureSequence/u);
  assert.match(receipt, /malformed or surplus analytics events/u);
  assert.match(receipt, /other-lab or malformed analytics event/u);
  assert.match(receipt, /event ID reuse detected/u);
  assert.match(receipt, /delayed, stale, reused/u);
});

test("G07 producer uses live mode/control descriptors and real pointer or keyboard input", () => {
  const browser = source(browserPath);
  assert.match(browser, /symbolicExpressionsControlDescriptorFor/u);
  assert.match(browser, /createSymbolicExpressionsControlDomainState/u);
  assert.match(browser, /data-mainland-symbolic-expressions/u);
  assert.match(browser, /data-viz-domain-requested/u);
  assert.match(browser, /data-viz-domain-observed/u);
  assert.match(browser, /data-viz-domain-accepted/u);
  assert.match(browser, /page\.touchscreen\.tap/u);
  assert.match(browser, /page\.mouse\.click/u);
  assert.match(browser, /locator\.press/u);
  assert.match(browser, /afterObservedValue/u);
  assert.match(browser, /calibrated real touch range/u);
  assert.doesNotMatch(browser, /HTMLInputElement\.prototype|dispatchEvent\s*\(|\.selectOption\s*\(|\.fill\s*\(/u);
});

test("G07 mobile evidence has real two-way local CDP swipe geometry", () => {
  const browser = source(browserPath);
  assert.match(browser, /context\(\)\.newCDPSession\(page\)/u);
  assert.match(browser, /Input\.dispatchTouchEvent/u);
  assert.match(browser, /touchStart/u);
  assert.match(browser, /touchMove/u);
  assert.match(browser, /touchEnd/u);
  assert.match(browser, /data-viz-local-scroll="horizontal"/u);
  assert.match(browser, /"toward-end"/u);
  assert.match(browser, /"toward-start"/u);
  assert.match(browser, /beforeScrollLeft/u);
  assert.match(browser, /afterScrollLeft/u);
  assert.match(browser, /scrollWidth/u);
  assert.match(browser, /clientWidth/u);
  assert.match(browser, /moveCount: 4/u);
  assert.match(browser, /scrollerId/u);
  assert.match(browser, /labId/u);
  assert.match(browser, /exact return/u);
});

test("G07 UI evidence scans all states at real canonical scroll landmarks", () => {
  const browser = source(browserPath);
  assert.match(browser, /installHkVisualizationEffectiveVisibilityInspector/u);
  assert.match(browser, /scanHkVisualizationCollisions/u);
  assert.match(browser, /chinaVisualizationCollisionReceipt/u);
  assert.match(browser, /scanHkVisualizationTextContrast/u);
  assert.match(browser, /"page-top", "visualization-center", "page-bottom"/u);
  assert.match(browser, /pageScrollGeometry/u);
  assert.match(browser, /documentMaxScrollY/u);
  assert.match(browser, /rootCenter/u);
  assert.match(browser, /viewportCenter/u);
  assert.match(browser, /rootDocumentTop/u);
  assert.match(browser, /rootDocumentBottom/u);
  assert.match(browser, /clippedElementCount/u);
  assert.match(browser, /horizontalOverflowPixels/u);
  assert.match(browser, /touchTargetCheckedCount/u);
  assert.match(browser, /consoleErrors/u);
  assert.match(browser, /pageErrors/u);
  assert.match(browser, /requestFailures/u);
});

test("G07 durability keeps one target and exact six same-user siblings at all six stages", () => {
  const browser = source(browserPath);
  assert.match(browser, /\/api\/visualization-sessions/u);
  assert.match(browser, /seedSiblingSessions/u);
  assert.match(browser, /G07_PRODUCTION_PLAN\.labIds\.filter\(\s*\(labId\) => labId !== targetLabId/u);
  assert.match(browser, /\[\s*"mount", "first", "reset", "second", "reload", "final",?\s*\]/u);
  assert.match(browser, /expectSiblingSessionsUnchanged/u);
  assert.match(browser, /x-mais-visualization-user-id/u);
  assert.match(browser, /firstAckPromise/u);
  assert.match(browser, /page\.reload/u);
  assert.match(browser, /interactionSurfaceEvidence/u);
  assert.match(browser, /observeLocaleTheme/u);
  assert.match(browser, /beforeInitial/u);
  assert.match(browser, /afterReload/u);
  assert.match(browser, /sameUser: true/u);
  assert.match(browser, /noSiblingMutation: true/u);
});

test("G07 producer covers locale/theme/identity, seals exact source hashes, and attaches JSON", () => {
  const browser = source(browserPath);
  assert.match(browser, /Language selector\|語言選擇\|语言选择/u);
  assert.match(browser, /Use English\|使用英文/u);
  assert.match(browser, /Use Traditional Chinese\|使用繁體中文\|使用繁体中文/u);
  assert.match(browser, /Use Simplified Chinese\|使用簡體中文\|使用简体中文/u);
  assert.match(browser, /Switch to dark mode\|Switch to light mode\|切換至深色模式\|切換至淺色模式\|切换至深色模式\|切换至浅色模式/u);
  assert.match(browser, /selectedCriticalSources: selectedCriticalSourceEvidence\(\)/u);
  assert.match(browser, /selectionVersion: G07_SELECTED_CRITICAL_SOURCES_VERSION/u);
  assert.match(browser, /transitiveClosureClaimed: false/u);
  assert.match(browser, /sealG07ProductionBrowserPayload\(payload\)/u);
  assert.match(browser, /validateG07ProductionBrowserReceipt\(receipt, project\)/u);
  assert.match(browser, /testInfo\.attach/u);
  assert.doesNotMatch(browser, /"(?:a{64}|0{64})"|\.repeat\(64\)/iu);
});

test("G07 mobile range evidence is a bounded real-touch attempt ledger with honest rejection semantics", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  assert.match(browser, /rangeTouchAttempts/u);
  assert.match(browser, /MAX_RANGE_TOUCH_ATTEMPTS/u);
  assert.match(browser, /attemptedValue/u);
  assert.match(browser, /beforeObservedValue/u);
  assert.match(browser, /afterObservedValue/u);
  assert.match(browser, /expectedAccepted/u);
  assert.match(browser, /expectedReducerError/u);
  assert.match(browser, /unchanged observed input after rejected real-touch attempt/u);
  assert.doesNotMatch(browser, /toHaveValue\(String\(requested\)\)/u);
  assert.match(receipt, /bounded real-touch attempt ledger/u);
});

test("G07 producer retains an unfiltered raw session checkpoint chain and exact projections", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  assert.match(browser, /rawSessionCheckpointChain/u);
  assert.match(browser, /rawResponseBody/u);
  assert.match(browser, /post-registration/u);
  assert.match(browser, /after-sibling-seed/u);
  assert.match(browser, /after-first/u);
  assert.match(browser, /after-reset/u);
  assert.match(browser, /after-second/u);
  assert.match(browser, /after-reload/u);
  assert.match(browser, /after-visual:/u);
  assert.match(browser, /final/u);
  const checkpointStart = browser.indexOf("async function captureRawSessionCheckpoint(");
  const checkpointEnd = browser.indexOf("function durabilityStage(", checkpointStart);
  assert.ok(checkpointStart >= 0 && checkpointEnd > checkpointStart);
  assert.doesNotMatch(browser.slice(checkpointStart, checkpointEnd), /\.filter\(/u);
  assert.match(receipt, /surplus non-G07 raw session/u);
  assert.match(receipt, /raw checkpoint bytes or full records drifted/u);
});

test("G07 analytics capture is one project-lifetime listener through terminal quiescence", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  const install = browser.indexOf("const analytics = installAnalyticsHarness(");
  const loop = browser.indexOf("for (const [labSequenceIndex, labId] of G07_PRODUCTION_PLAN.labIds.entries())");
  const dispose = browser.lastIndexOf("analytics.dispose()");
  assert.ok(install >= 0 && loop > install && dispose > loop);
  assert.equal(browser.slice(loop, dispose).match(/installAnalyticsHarness\(/gu)?.length ?? 0, 0);
  assert.match(browser, /projectTerminalRawCount/u);
  assert.match(browser, /projectQuiescentRawCount/u);
  assert.match(browser, /lateDeliveryCount = projectQuiescentRawCount - projectTerminalRawCount/u);
  assert.match(receipt, /listenerLifetime/u);
  assert.match(receipt, /global raw analytics listener equality/u);
});

test("G07 per-lab phase boundaries bind interaction, visual, final checkpoint, and next-lab order", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  for (const token of [
    "labSequenceIndex",
    "clockOriginEpochMs",
    "interactionLastCaptureSequence",
    "visualFirstCaptureSequence",
    "visualLastCaptureSequence",
    "finalCheckpoint",
    "nextLabFirstCaptureSequence",
  ]) {
    assert.match(browser, new RegExp(token, "u"));
    assert.match(receipt, new RegExp(token, "u"));
  }
  assert.match(receipt, /coherent phase boundary/u);
});

test("G07 selected critical sources are exact ordered without a recursive closure claim", () => {
  const receipt = source(receiptPath);
  const required = [
    "components/visualizations/mainland/SymbolicExpressionsVisualModel.tsx",
    "tests/e2e/china-visualization-collision-receipt.ts",
    "tests/e2e/hk-visualization-collision-scanner.ts",
    "tests/e2e/hk-visualization-text-contrast-scanner.ts",
    "data/visualizationLabs.ts",
    "components/providers/AppProviders.tsx",
    "lib/learningAnalytics.ts",
    "tests/e2e/helpers.ts",
    "lib/server/userStore.ts",
    "lib/server/userStore/studentActivityPersistence.ts",
    "lib/server/sessionCookie.ts",
    "app/api/learning-events/route.ts",
    "app/api/visualization-sessions/route.ts",
  ];
  let prior = -1;
  for (const path of required) {
    const index = receipt.indexOf(`"${path}"`);
    assert.ok(index > prior, `${path} must occur once in the ordered critical-source selection`);
    prior = index;
  }
  assert.match(receipt, /G07_SELECTED_CRITICAL_SOURCES_VERSION/u);
  assert.match(receipt, /transitiveClosureClaimed: false/u);
  assert.doesNotMatch(receipt, /exact ordered transitive source closure/u);
});

test("G07 scroll receipts inspect initial geometry and serialize each physical vertical swipe", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  assert.match(browser, /initialGeometry/u);
  assert.match(browser, /verticalSwipeAttempts/u);
  assert.match(browser, /signedDisplacement/u);
  assert.match(browser, /targetReached/u);
  assert.match(browser, /physicalInputLedger/u);
  assert.match(browser, /locale-option/u);
  assert.match(browser, /theme-toggle/u);
  assert.match(receipt, /analyticsBoundEntrySequences/u);
  assert.match(receipt, /all mobile landmarks.*already/u);
});

test("G07 checkpoints use the analytics clock and carry exact surrounding phase bindings", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  for (const token of [
    "precedingAnalyticsCaptureSequence",
    "followingAnalyticsCaptureSequence",
    "projectClockOriginEpochMs",
  ]) {
    assert.match(browser, new RegExp(token, "u"));
    assert.match(receipt, new RegExp(token, "u"));
  }
  assert.match(receipt, /globally strict checkpoint chronology/u);
});

test("G07 locale/theme setup phases derive and bind exact physical transition categories", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  for (const token of [
    "setupTransitions",
    "requiredCategories",
    "physicalInputSequences",
    "setupPhaseId",
    "before",
    "after",
  ]) {
    assert.match(browser, new RegExp(token, "u"));
    assert.match(receipt, new RegExp(token, "u"));
  }
  assert.match(receipt, /exact locale\/theme setup phase order/u);
});

test("G07 raw taps use fresh viewport boxes and elementFromPoint hit-test evidence", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  assert.match(browser, /scrollIntoViewIfNeeded\(\)/u);
  assert.match(browser, /document\.elementFromPoint/u);
  assert.match(browser, /boxCapturedAfterScrollIntoView/u);
  assert.match(browser, /viewportWidth/u);
  assert.match(browser, /viewportHeight/u);
  assert.match(receipt, /tapEvidence/u);
  assert.match(receipt, /targetIdentity/u);
});

test("G07 vertical attempts retain full stable geometry and independently recompute landmark success", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  assert.match(browser, /beforeGeometry/u);
  assert.match(browser, /afterGeometry/u);
  assert.match(receipt, /recomputedTargetReached/u);
  assert.match(receipt, /attempt.*documentMaxScrollY/u);
  assert.match(receipt, /early termination/u);
});

test("G07 C7 producer observes menu expansion, panel visibility, and actionable controls before deciding to open", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  assert.match(browser, /observeMobileMenuSurface/u);
  assert.match(browser, /aria-expanded/u);
  assert.match(browser, /panelVisible/u);
  assert.match(browser, /localeSelectorActionable/u);
  assert.match(browser, /themeToggleActionable/u);
  assert.match(browser, /deriveG07RequiredSetupCategories/u);
  assert.match(browser, /locale-menu-open/u);
  assert.match(browser, /locale-menu-restore/u);
  assert.match(receipt, /afterOpen/u);
  assert.match(receipt, /afterRestore/u);
});

test("G07 C7 producer serializes one runtime physical-step projection across setup, analytics, horizontal, and vertical phases", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  assert.match(browser, /deriveG07PhysicalStepProjection/u);
  assert.match(browser, /orderedStepProjection/u);
  assert.match(receipt, /stepKind: "analytics" \| "horizontal" \| "setup" \| "vertical"/u);
  assert.match(receipt, /expected runtime physical step order/u);
});

test("G07 C7 tap proof uses half-open coordinate bounds and actual DOM target fingerprints", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  assert.match(browser, /targetFingerprint/u);
  assert.match(browser, /hitTargetFingerprint/u);
  assert.match(browser, /document\.elementFromPoint/u);
  assert.match(receipt, /tap\.x >= tap\.viewportWidth/u);
  assert.match(receipt, /tap\.y >= tap\.viewportHeight/u);
  assert.match(receipt, /tap\.x >= tap\.targetRect\.x \+ tap\.targetRect\.width/u);
  assert.match(receipt, /tap\.y >= tap\.targetRect\.y \+ tap\.targetRect\.height/u);
});

test("G07 C7 range geometry and hit proof are captured after analytics prequiet and immediately before touchscreen tap", () => {
  const browser = source(browserPath);
  const rangeStart = browser.indexOf("async function setRangeThroughRealInput(");
  const rangeEnd = browser.indexOf("function topicPlan", rangeStart);
  assert.ok(rangeStart >= 0 && rangeEnd > rangeStart);
  const rangeBlock = browser.slice(rangeStart, rangeEnd);
  const callbackStart = rangeBlock.indexOf("const physicalSubaction = await record(descriptor, async () => {");
  const scroll = rangeBlock.indexOf("await range.scrollIntoViewIfNeeded()", callbackStart);
  const box = rangeBlock.indexOf("await range.boundingBox()", scroll);
  const hit = rangeBlock.indexOf("await tapEvidenceAt(page, range, box, x, y, descriptor.target)", box);
  const tap = rangeBlock.indexOf("await page.touchscreen.tap(x, y)", hit);
  assert.ok(callbackStart >= 0 && scroll > callbackStart && box > scroll && hit > box && tap > hit);
  assert.doesNotMatch(rangeBlock.slice(hit, tap), /await\s+(?!tapEvidenceAt)/u);
});

test("G07 C8 producer records the raw hit node and its exact ancestor fingerprint path to the intended target", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  assert.match(browser, /hitAncestorFingerprints/u);
  assert.match(browser, /targetIsHit/u);
  assert.match(browser, /current = current\.parentElement/u);
  assert.match(browser, /rawHitIdentity: identity\(hit\)/u);
  assert.match(browser, /const rawHitFingerprint = g07DomIdentityFingerprint\(rawHitIdentity\)/u);
  assert.match(receipt, /hitAncestorFingerprints\[0\][\s\S]*rawHitFingerprint/u);
  assert.match(receipt, /hitAncestorFingerprints\.at\(-1\)[\s\S]*targetFingerprint/u);
});

test("G07 C8 range attempt serializes and cross-binds the exact physical tap and same-box thumb geometry", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  for (const token of [
    "physicalInputSequence",
    "targetRect",
    "touchY",
    "viewportHeight",
    "viewportWidth",
  ]) {
    assert.match(browser, new RegExp(token, "u"));
    assert.match(receipt, new RegExp(token, "u"));
  }
  assert.match(receipt, /Math\.min\(10, attempt\.targetRect\.width \/ 20\)/u);
  assert.match(receipt, /range attempt and physical tap geometry/u);
});

test("G07 C9 producer serializes raw DOM identities and structural validation recomputes every fingerprint", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  for (const token of [
    "rawHitIdentity",
    "targetIdentity",
    "hitAncestorIdentities",
    "g07DomIdentityFingerprint",
  ]) {
    assert.match(browser, new RegExp(token, "u"));
    assert.match(receipt, new RegExp(token, "u"));
  }
  assert.match(browser, /rawHitIdentity: identity\(hit\)/u);
  assert.match(receipt, /expected physical step target identity/u);
});

test("G07 C9 validator derives exact target contracts from physical category and plan target", () => {
  const receipt = source(receiptPath);
  for (const category of [
    "locale-selector",
    "locale-option",
    "theme-toggle",
    "mode",
    "range-calibration",
    "reset",
  ]) assert.match(receipt, new RegExp(`case "${category}"`, "u"));
  assert.match(receipt, /orderedStepProjection\[entry\.sequence\]/u);
  assert.match(receipt, /dataVizParameter/u);
  assert.match(receipt, /dataVizMode/u);
  assert.match(receipt, /dataVizResetModel/u);
});

test("G07 C10 source separates untrusted structural inspection from fail-closed public production validation", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  assert.match(
    receipt,
    /export function validateG07UntrustedStructuralReceipt/u,
  );
  assert.match(
    receipt,
    /native physical provenance is unavailable/u,
  );
  assert.match(
    browser,
    /validateG07ProductionBrowserReceipt\(receipt, project\)/u,
  );
  assert.doesNotMatch(
    browser,
    /validateG07UntrustedStructuralReceipt\(receipt, project\)/u,
  );
});

test("G07 C10 source normalizes range DOM ids and uses exact producer-derived range and zh-Hans identities", () => {
  const browser = source(browserPath);
  const receipt = source(receiptPath);
  assert.match(
    browser,
    /id:\s*tagName === "input" && type === "range"\s*\? null\s*:\s*candidate\.getAttribute\("id"\)/u,
  );
  assert.match(receipt, /dataVizParameter:\s*controlId/u);
  assert.match(receipt, /id:\s*null,[\s\S]*?role:\s*"slider"/u);
  assert.match(receipt, /zhHans:\s*"切换至浅色模式"/u);
  assert.doesNotMatch(receipt, /切换至淺色模式/u);
});
