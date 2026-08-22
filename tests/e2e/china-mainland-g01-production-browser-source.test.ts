import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const browserPath = new URL("./china-mainland-g01-production-browser.spec.ts", import.meta.url);
const planPath = new URL("./china-mainland-g01-production-plan.ts", import.meta.url);
const receiptPath = new URL("./china-mainland-g01-production-receipt.ts", import.meta.url);
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

function runnerContractSource(source = browserSource()) {
  const start = source.indexOf("function requireG01ProductionRunnerAuthority(");
  const end = source.indexOf("function expectedInteractionAxis", start);
  assert.ok(start >= 0 && end > start);
  return {
    block: source.slice(start, end),
    source,
  };
}

function assertCanonicalRunnerContract(source = browserSource()) {
  const runner = runnerContractSource(source);
  assert.match(
    runner.source,
    /const SUPPORTED_PROJECTS = \["desktop-chrome", "mobile-chrome"\] as const;/u,
  );
  assert.match(runner.block, /readG01RunnerInvocationEnvironment/u);
  assert.match(runner.block, /assertG01TrustedRunnerAuthority/u);
  assert.match(runner.block, /coverage unavailable/u);
  assert.doesNotMatch(runner.block, /testInfo\.config\.(?:grep|grepInvert)/u);
}

test("G01 browser producer imports the frozen plan and receipt validator without fixture evidence", () => {
  assert.equal(
    sha256(planPath),
    "5836ef5b0f5a60514621463683f0754bdb11a2557b4cc92688dd689269c90e4e",
  );
  assert.match(browserSource(), /import \{ G01_PRODUCTION_PLAN \} from "\.\/china-mainland-g01-production-plan";/u);
  assert.match(browserSource(), /sealG01ProductionBrowserPayload/u);
  assert.match(browserSource(), /validateG01ProductionBrowserReceipt/u);
  assert.doesNotMatch(browserSource(), /validateG01UntrustedStructuralReceipt/u);
  assert.doesNotMatch(browserSource(), /createG01ProductionReceiptFixture/u);
  assert.match(sha256(receiptPath), /^[a-f0-9]{64}$/u);
});

test("G01 browser keeps the hard authority guard and cannot substitute untrusted structural acceptance", () => {
  const browser = browserSource();
  const receipt = receiptSource();
  const guardCall = browser.indexOf("const runnerInvocation = requireG01ProductionRunnerAuthority();");
  const projectCall = browser.indexOf("const project = projectFrom(testInfo);", guardCall);
  const publicValidation = browser.indexOf("validateG01ProductionBrowserReceipt(receipt, project)");
  const attachment = browser.indexOf("testInfo.attach", publicValidation);

  assert.ok(guardCall >= 0 && projectCall > guardCall);
  assert.ok(publicValidation > projectCall && attachment > publicValidation);
  assert.match(browser, /assertG01TrustedRunnerAuthority/u);
  assert.doesNotMatch(browser, /validateG01UntrustedStructuralReceipt/u);
  assert.match(
    receipt,
    /export function validateG01UntrustedStructuralReceipt[\s\S]*?return true;/u,
  );
  assert.match(
    receipt,
    /export function validateG01ProductionBrowserReceipt[\s\S]*?validateG01UntrustedStructuralReceipt\(candidate, project\);[\s\S]*?native[\s\S]*?unavailable/u,
  );
});

test("G01 producer derives every project state from the exact plan without sampling or skips", () => {
  const source = browserSource();
  assert.match(source, /const SUPPORTED_PROJECTS = \["desktop-chrome", "mobile-chrome"\] as const;/u);
  assert.match(source, /G01_PRODUCTION_PLAN\.labIds/u);
  assert.match(source, /G01_PRODUCTION_PLAN\.logicalStates\.interactionStateIds\.filter/u);
  assert.match(source, /G01_PRODUCTION_PLAN\.logicalStates\.visualStateIds\.filter/u);
  assert.match(source, /expectedInteractionStateIds/u);
  assert.match(source, /expectedVisualStateIds/u);
  assert.match(source, /expect\(interactionStates\.map\(\(receipt\) => receipt\.stateId\)\)\.toEqual/u);
  assert.match(source, /expect\(visualStates\.map\(\(receipt\) => receipt\.stateId\)\)\.toEqual/u);
  assert.doesNotMatch(source, /\.skip\(|\.fixme\(|\.only\(|sample|representative/iu);
});

test("G01 producer uses real desktop and mobile inputs and a real horizontal CDP swipe", () => {
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
  assert.doesNotMatch(source, /HTMLInputElement\.prototype|dispatchEvent\s*\(|\.selectOption\s*\(|\.fill\s*\(/u);
});

test("G01 producer scans every state and all three visual scroll positions without hollow evidence", () => {
  const source = browserSource();
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
});

test("G01 producer fails closed on zero per-action analytics and binds raw event identity", () => {
  const source = browserSource();
  assert.match(source, /\/api\/learning-events/u);
  assert.match(source, /zero per-action analytics/u);
  assert.match(source, /acknowledgedEventIds/u);
  assert.match(source, /consumedAnalyticsEventIds/u);
  assert.match(source, /eventId: rawEvent\.id/u);
  assert.match(source, /source: rawEvent\.source/u);
  assert.match(source, /type: "visualization-action"/u);
  assert.match(source, /actionId: stateId/u);
  assert.match(source, /stateId/u);
  assert.doesNotMatch(source, /analyticsEvents:\s*\[\s*\{[^}]*event:/u);
  assert.match(source, /subactions/u);
  assert.match(source, /collectSubactionAnalytics/u);
  assert.match(source, /subactionId/u);
  assert.match(source, /physical-pointer/u);
  assert.match(source, /keyboard-correction/u);
  assert.doesNotMatch(source, /collectPerActionAnalytics/u);
  const parserStart = source.indexOf("function visualizationLearningEvents(");
  const parserEnd = source.indexOf("function installDiagnostics", parserStart);
  const parserSource = source.slice(parserStart, parserEnd);
  assert.match(parserSource, /for \(const \[index, candidate\] of body\.events\.entries\(\)\)/u);
  assert.doesNotMatch(parserSource, /flatMap/u);
});

test("G01 select pointer and keyboard phases have independent analytics windows", () => {
  const source = browserSource();
  const selectStart = source.indexOf("async function setSelectThroughRealInput(");
  const selectEnd = source.indexOf("type PhysicalSubactionRecorder", selectStart);
  assert.ok(selectStart >= 0 && selectEnd > selectStart);
  const selectSource = source.slice(selectStart, selectEnd);
  assert.match(selectSource, /record: PhysicalSubactionRecorder/u);
  assert.match(selectSource, /\$\{label\}-pointer/u);
  assert.match(selectSource, /\$\{label\}-keyboard/u);
  assert.match(selectSource, /await record\(/u);
});

test("G01 analytics ACKs are successful and exactly correlated to request event ids and owner", () => {
  const source = browserSource();
  assert.match(source, /responseStatus/u);
  assert.match(source, /response\.status\(\)/u);
  assert.match(source, /rawEventIds/u);
  assert.match(source, /acknowledgedEventIds/u);
  assert.match(source, /expectedUserId/u);
  assert.match(source, /x-mais-analytics-user-id/u);
  assert.match(source, /expectedSource/u);
  assert.match(source, /type !== "visualization-action"/u);
  assert.match(source, /events: parsed\.events/u);
  assert.match(source, /acknowledgedEventIds\.every/u);
  assert.doesNotMatch(source, /acknowledgedEventIds\.filter/u);
  assert.match(source, /analyticsEvidence/u);
  assert.match(source, /endpoint: "\/api\/learning-events"/u);
  assert.match(source, /method: "POST"/u);
});

test("G01 setup, reset-after, and visual-reset subactions persist ACK evidence", () => {
  const source = browserSource();
  assert.match(source, /const resetSubaction = await collectSubactionAnalytics/u);
  assert.match(source, /resetAfter = await resetReceipt\(root, resetSubaction\)/u);
  assert.match(source, /const reset = await resetReceipt\(root, resetSubaction\)/u);
  assert.match(source, /setupSubactions\.push\(\.\.\.await seedSiblingSession/u);
  assert.match(source, /primary\.subactions/u);
});

test("G01 producer proves exact once-only durable lesson sessions from the live APIs", () => {
  const source = browserSource();
  assert.match(source, /\/api\/visualization-sessions/u);
  assert.match(source, /x-mais-visualization-user-id/u);
  assert.match(source, /requestBody\(firstSessionRequest\)/u);
  assert.match(source, /acknowledgementStatus: 200/u);
  assert.match(source, /mount: \{ postCount: 0, sessionCount: 0 \}/u);
  assert.match(source, /firstAction:\s*\{\s*acknowledgementStatus:/u);
  assert.match(source, /secondAction:\s*\{\s*postCount:/u);
  assert.match(source, /reload:\s*\{\s*sameSession:/u);
  assert.match(source, /exactlyOnce:/u);
  assert.match(source, /noSiblingMutation:/u);
  assert.match(source, /serverBacked:/u);
  assert.match(source, /survivedReload:/u);
  assert.match(source, /page\.reload/u);
  assert.match(source, /visualizationSessions/u);
  assert.match(source, /firstPrimaryGate/u);
  assert.match(source, /siblingBaseline/u);
  assert.match(source, /expectSiblingSessionsUnchanged/u);
  assert.match(source, /seedSiblingSession/u);
  assert.match(source, /userId: student\.userId/u);
  assert.match(source, /targetSession/u);
  assert.match(source, /exact server session keys/u);
  assert.match(source, /siblingSnapshots/u);
  for (const stage of ["baseline", "mount", "first", "reset", "second", "reload", "final"]) {
    assert.match(source, new RegExp(`${stage}:`, "u"));
  }
  const siblingStart = source.indexOf("async function seedSiblingSessions(");
  const siblingEnd = source.indexOf("async function activeRoot", siblingStart);
  assert.ok(siblingStart >= 0 && siblingEnd > siblingStart);
  const siblingSource = source.slice(siblingStart, siblingEnd);
  assert.match(
    siblingSource,
    /G01_PRODUCTION_PLAN\.labIds\s*\.filter\(\(siblingLabId\) => siblingLabId !== targetLabId\)/u,
  );
  assert.doesNotMatch(siblingSource, /fallback|same publisher|candidate\.publisher/iu);
});

test("G01 producer covers locale, theme, reset, renderer identity, diagnostics, sealing, and attachment", () => {
  const source = browserSource();
  assert.match(source, /Language selector\|語言選擇\|语言选择/u);
  assert.match(source, /Use English\|使用英文/u);
  assert.match(source, /Use Traditional Chinese\|使用繁體中文\|使用繁体中文/u);
  assert.match(source, /Use Simplified Chinese\|使用簡體中文\|使用简体中文/u);
  assert.match(source, /Switch to dark mode\|Switch to light mode\|切換至深色模式\|切換至淺色模式\|切换至深色模式\|切换至浅色模式/u);
  assert.match(source, /data-mainland-multi-digit-operations/u);
  assert.match(source, /data-viz-reset-model/u);
  assert.match(source, /data-viz-configured-state/u);
  assert.match(source, /consoleErrors/u);
  assert.match(source, /pageErrors/u);
  assert.match(source, /requestFailures/u);
  assert.match(source, /sealG01ProductionBrowserPayload\(payload\)/u);
  assert.match(source, /validateG01ProductionBrowserReceipt\(receipt, project\)/u);
  assert.match(source, /testInfo\.attach/u);
});

test("G01 producer hashes its sources and rejects retries, shards, and unsupported projects", () => {
  const source = browserSource();
  assert.match(source, /createHash\("sha256"\)/u);
  assert.match(source, /producerSha256/u);
  assert.match(source, /receiptValidatorSha256/u);
  assert.match(source, /routingSpecSha256/u);
  assert.match(source, /testInfo\.retry/u);
  assert.match(source, /testInfo\.config\.shard/u);
  assert.match(source, /testInfo\.config\.projects/u);
  assert.match(source, /canonical two-project set/u);
  assert.doesNotMatch(source, /testInfo\.config\.(?:grep|grepInvert)/u);
  assert.match(source, /SUPPORTED_PROJECTS/u);
  assert.match(source, /retries: 0/u);
  assert.match(source, /shard: null/u);
});

test("G01 runner contract accepts only the canonical two-project set", () => {
  const source = browserSource();
  assert.doesNotThrow(() => assertCanonicalRunnerContract(source));
  assert.throws(() => assertCanonicalRunnerContract(source.replace(
    '["desktop-chrome", "mobile-chrome"]',
    '["desktop-chrome"]',
  )));
});

test("G01 runner binds every configured project to zero retries and expected passed status", () => {
  const source = browserSource();
  const runner = runnerContractSource(source).block;
  assert.match(runner, /configuredProject\.retries[\s\S]{0,120}\.toBe\(0\)/u);
  assert.match(runner, /testInfo\.expectedStatus[\s\S]{0,120}\.toBe\("passed"\)/u);
  assert.match(source, /configuredProjects: \[\.\.\.SUPPORTED_PROJECTS\]/u);
  assert.match(source, /complete: false/u);
  assert.match(source, /runnerInvocation/u);
});

test("G01 runner contract rejects global and per-project grep narrowing", () => {
  const source = receiptSource();
  assert.match(source, /"--workers=1"/u);
  assert.match(source, /"--retries=0"/u);
  assert.match(source, /"--reporter=line"/u);
  assert.doesNotMatch(source, /"--grep(?:=|")|"-g"/u);
  assert.doesNotMatch(source, /"--project(?:=|")/u);
});

test("G01 runner contract rejects grepInvert narrowing", () => {
  assert.doesNotMatch(receiptSource(), /"--grep-invert(?:=|")/u);
});

test("G01 runner contract rejects shard and retry evidence", () => {
  const source = receiptSource();
  assert.doesNotMatch(source, /"--shard(?:=|")/u);
  assert.doesNotMatch(source, /"--repeat-each(?:=|")|"--only-changed"|"--last-failed"/u);
  assert.match(source, /retries: 0/u);
});

test("installed Playwright 1.59 CLI model proves public FullConfig is not CLI-selection evidence", () => {
  const packageJson = JSON.parse(readFileSync(playwrightPackagePath, "utf8")) as {
    version?: unknown;
  };
  const cliModel = readFileSync(playwrightCliModelPath, "utf8");
  assert.equal(packageJson.version, "1.59.1");
  assert.match(cliModel, /config\.cliGrep = opts\.grep/u);
  assert.match(cliModel, /config\.cliGrepInvert = opts\.grepInvert/u);
  assert.match(cliModel, /config\.cliProjectFilter = opts\.project \|\| void 0/u);
  assert.match(cliModel, /filterProjects\)\(config\.projects, config\.cliProjectFilter\)/u);
});

test("G01 spec cannot treat caller-forgeable JSON plus SHA as trusted runner authority", () => {
  const source = browserSource();
  const contract = receiptSource();
  assertCanonicalRunnerContract(source);
  assert.match(contract, /authorityAvailable: false/u);
  assert.match(contract, /releaseReady: false/u);
  assert.match(contract, /runnerReceiptSha256: null/u);
  assert.match(source, /caller-forged[\s\S]{0,80}exact JSON\+SHA/u);
  assert.match(source, /direct Playwright/u);
  assert.match(source, /desktop-only/u);
  assert.match(source, /grep narrowing/u);
  assert.match(source, /runnerInvocation/u);
  assert.doesNotMatch(source, /cliProjectFilter|cliGrepInvert|cliGrep/u);
});

test("G01 producer retains every raw learning-events POST and seals terminal set equality", () => {
  const source = browserSource();
  assert.match(source, /rawBodyText/u);
  assert.match(source, /rawEventIds/u);
  assert.match(source, /requestMalformedReason/u);
  assert.match(source, /responseMalformedReason/u);
  assert.match(source, /waitForAnalyticsQuiescence/u);
  assert.match(source, /validateG01RawAnalyticsDeliveryWindow/u);
  assert.match(source, /validateG01AnalyticsTerminalEvidence/u);
  assert.match(source, /observedDeliveryEventIds/u);
  assert.match(source, /serializedEventIds/u);
  assert.match(source, /consumedEventIds/u);
  assert.doesNotMatch(source, /slice\(start\)\s*\.filter\(\(delivery\)/u);
});
