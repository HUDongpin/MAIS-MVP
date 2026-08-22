import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  premiumThreeDDirectLabIds
} from "../../components/visualizations/generated/premiumThreeDDirectCatalog.generated";
import { buildPremiumThreeDTopicStaticParams } from "../../components/visualizations/premiumThreeDDirectLabs";
import { getSignatureLabAssignment } from "../../data/signatureLabAssignments";
import { visualizationLabCatalog } from "../../data/visualizationLabs";

const smokePath = "tests/e2e/california-visualization-product-smoke.spec.ts";
const smokeSource = readFileSync(smokePath, "utf8");
const configPath = "playwright.config.ts";
const configSource = readFileSync(configPath, "utf8");

function californiaInventory() {
  const labs = visualizationLabCatalog.filter(
    (lab) => lab.curriculumTrack === "US" && lab.publisher === "US_CA_MATH"
  );
  const premiumLabs = labs.filter(
    (lab) => lab.threeD?.enabled === true && lab.threeD.premiumLaunch === true
  );
  return { labs, premiumLabs };
}

test("Layer-A product smoke manifest is the exact unfiltered 76-route California catalog", () => {
  const { labs } = californiaInventory();
  assert.equal(labs.length, 76);
  assert.equal(new Set(labs.map((lab) => lab.labId)).size, 76);
  assert.equal(new Set(labs.map((lab) => `${lab.grade}\0${lab.labId}`)).size, 76);
  for (const lab of labs) {
    assert.equal(lab.moduleId, "signature-lab", `${lab.labId} must remain a signature lab`);
    assert.ok(getSignatureLabAssignment(lab.topicId), `${lab.labId} is missing a signature assignment`);
  }

  assert.match(smokeSource, /EXPECTED_CALIFORNIA_DIRECTORY_ROUTE_COUNT = 76/);
  assert.match(smokeSource, /visualizationLabCatalog\.filter\([\s\S]*lab\.curriculumTrack === "US" && lab\.publisher === "US_CA_MATH"/);
  assert.match(smokeSource, /for \(const route of californiaVisualizationProductSmokeManifest\.directoryRoutes\)/);
  assert.match(smokeSource, /visitedDirectoryLabIds\)\.toEqual\([\s\S]*directoryRoutes\.map/);
  assert.doesNotMatch(smokeSource, /test\.(?:skip|fixme|only)\s*\(/);
  assert.doesNotMatch(smokeSource, /test\.describe\.(?:skip|fixme|only)\s*\(/);
  assert.doesNotMatch(smokeSource, /CA_VIZ_[A-Z0-9_]*(?:FILTER|GRADE|LAB_IDS?|SHARD)/);
  assert.doesNotMatch(smokeSource, /\.slice\s*\(/);
  assert.match(smokeSource, /test\.describe\.configure\(\{ mode: "serial", retries: 0 \}\)/);
});

test("premium static params exactly equal the global catalog-derived enabled && premiumLaunch set", () => {
  const globalLiveIds = visualizationLabCatalog
    .filter((lab) => lab.threeD?.enabled === true && lab.threeD.premiumLaunch === true)
    .map((lab) => lab.labId)
    .sort();
  const generatedIds = [...premiumThreeDDirectLabIds].sort();
  const staticParamIds = buildPremiumThreeDTopicStaticParams().map(({ labId }) => labId).sort();
  assert.equal(new Set(premiumThreeDDirectLabIds).size, premiumThreeDDirectLabIds.length);
  assert.deepEqual(staticParamIds, generatedIds);
  assert.deepEqual(generatedIds, globalLiveIds);
});

test("Layer-A California premium direct subset is exact and derived only from both live flags", () => {
  const { labs, premiumLabs } = californiaInventory();
  const californiaIds = new Set(labs.map((lab) => lab.labId));
  const registeredCaliforniaIds: string[] = [];
  for (const labId of premiumThreeDDirectLabIds) {
    if (californiaIds.has(labId)) registeredCaliforniaIds.push(labId);
  }
  for (const lab of premiumLabs) {
    assert.equal(lab.threeD?.enabled, true);
    assert.equal(lab.threeD?.premiumLaunch, true);
  }
  assert.deepEqual(
    registeredCaliforniaIds.sort(),
    premiumLabs.map((lab) => lab.labId).sort()
  );

  assert.match(smokeSource, /lab\.threeD\?\.enabled === true && lab\.threeD\.premiumLaunch === true/);
  assert.match(smokeSource, /premiumThreeDDirectLabIds/);
  assert.match(smokeSource, /globalLivePremiumLabs\.map\(\(lab\) => lab\.labId\)\.sort\(\)/);
  assert.match(smokeSource, /registeredCaliforniaPremiumIds\.sort\(\)/);
  assert.match(smokeSource, /for \(const route of californiaVisualizationProductSmokeManifest\.premiumRoutes\)/);
  assert.match(smokeSource, /visitedPremiumLabIds\)\.toEqual\([\s\S]*premiumRoutes\.map/);
  assert.doesNotMatch(smokeSource, /EXPECTED_(?:CALIFORNIA_)?PREMIUM_(?:ROUTE_)?COUNT/);
  assert.doesNotMatch(smokeSource, /premium(?:Labs|Routes)\.length\s*,\s*\d+/);
});

test("Layer-A source cannot import or install contrast, control, graphics, or source-oracle instrumentation", () => {
  const importSpecifiers = [...smokeSource.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
  const allowedImports = new Set([
    "node:assert/strict",
    "node:fs",
    "node:path",
    "@playwright/test",
    "../../data/signatureLabAssignments",
    "../../data/visualizationLabs",
    "../../components/visualizations/generated/premiumThreeDDirectCatalog.generated"
  ]);
  assert.deepEqual(importSpecifiers.filter((specifier) => !allowedImports.has(specifier)), []);
  assert.doesNotMatch(smokeSource, /from\s+["'][^"']*(?:contrast|instrumentation|source-expected|exhaustive-qa|qa-helpers|canvas-graphics-runtime)[^"']*["']/);
  assert.doesNotMatch(smokeSource, /\b(?:install|prepare|instrument)California[A-Z][A-Za-z0-9_]*\s*\(/);
  assert.doesNotMatch(smokeSource, /\b(?:addInitScript|exposeFunction|exposeBinding)\s*\(/);
  assert.match(smokeSource, /QA_ONLY_WINDOW_GLOBALS/);
  assert.match(smokeSource, /QA_ONLY_DOM_ATTRIBUTES/);
  assert.match(smokeSource, /QA_ONLY_BUILD_NEEDLES/);
  assert.match(smokeSource, /assertLoadedProductionBuildIsUninstrumented/);
  assert.match(smokeSource, /CA_VIZ_PRODUCT_SMOKE_INSTRUMENTATION"\), "none"/);
});

test("Layer-A browser contract proves learner boot and diagnostics without claiming Canvas or WebGL non-text contrast", () => {
  for (const assertion of [
    /data-viz-panel-mode", "lab"/,
    /data-viz-active-lab-id", route\.labId/,
    /data-viz-requested-lab-id", route\.labId/,
    /data-viz-current-grade", route\.grade/,
    /data-viz-current-track", "US"/,
    /expectReadyVisualizationSurface/,
    /button\[data-viz-reset-model\]/,
    /data-viz-manim-presentation", "learner"/,
    /data-viz-manim-authoring-controls-visible", "false"/,
    /expectNoVisibleAuthoringOrDebug/,
    /expectNoHorizontalPageOverflow/,
    /collectBrowserDiagnostics/,
    /expectNoBrowserDiagnostics/
  ]) {
    assert.match(smokeSource, assertion);
  }
  assert.match(smokeSource, /canvasNonTextContrastClaim: false/);
  assert.match(smokeSource, /webGlNonTextContrastClaim: false/);
  assert.match(smokeSource, /graphicsReceipts: 0/);
  assert.match(smokeSource, /instrumentation: "none"/);
  assert.doesNotMatch(smokeSource, /(?:audit|assert)[A-Za-z0-9_]*(?:Canvas|WebGl).*Contrast\s*\(/);
});

test("Layer-A formal run rejects non-Starship writable paths and requires one production BUILD_ID", () => {
  for (const variable of [
    "PLAYWRIGHT_E2E_ROOT",
    "PLAYWRIGHT_NEXT_DIST_DIR",
    "PLAYWRIGHT_OUTPUT_DIR",
    "PLAYWRIGHT_REPORT_DIR",
    "HK_MATH_DB_PATH",
    "TMPDIR",
    "TMP",
    "TEMP",
    "XDG_CACHE_HOME",
    "npm_config_cache",
    "NODE_COMPILE_CACHE"
  ]) {
    assert.match(smokeSource, new RegExp(`"${variable}"`));
  }
  assert.match(smokeSource, /STARSHIP_E2E_ROOT = "\/Volumes\/Starship\/MAIS-ca-viz-labs-wt\/\.tmp"/);
  assert.match(smokeSource, /CA_VIZ_PRODUCT_SMOKE_BUILD_ID/);
  assert.match(smokeSource, /testInfo\.project\.use\.channel, "chrome"/);
  assert.match(smokeSource, /_next\/static\/\$\{buildId\}\/_buildManifest\.js/);
  assert.match(smokeSource, /registerCaliforniaStudentsByGrade\(context\.request, testInfo/);
  assert.match(smokeSource, /loginCaliforniaStudentForGrade\(context\.request, student/);
  assert.match(smokeSource, /studentByGrade\.get\(route\.grade\)/);
  assert.match(smokeSource, /student\.grade, route\.grade/);
  assert.doesNotMatch(smokeSource, /grade: "P1"/);
  assert.match(smokeSource, /expectProductDeliveryOutboxesDrained/);
  assert.match(smokeSource, /mais:visualization-session-outbox:v1:/);
  assert.match(smokeSource, /mais:learning-analytics-outbox:v1:/);
  assert.match(smokeSource, /mais:learning-analytics-outbox:v2:/);
  assert.match(smokeSource, /mais:learning-analytics-unconfirmed-outbox:v1:/);
  assert.match(smokeSource, /mais:learning-analytics-flush-requested/);
  assert.match(smokeSource, /await expectProductDeliveryOutboxesDrained\(page\)/);
  assert.match(smokeSource, /Object\.keys\(sessionStorage\)/);
  assert.match(smokeSource, /await page\.goto\("about:blank", \{ waitUntil: "load" \}\)/);
  assert.match(smokeSource, /Unmounting the old learner provider must not persist/);
  assert.match(smokeSource, /await page\.close\(\{ runBeforeUnload: false \}\)/);
  assert.match(smokeSource, /expect\(page\.isClosed\(\)\)\.toBe\(true\)/);
  assert.match(smokeSource, /test\(CALIFORNIA_PRODUCT_SMOKE_TEST_TITLE, async \(\{ context, page \}, testInfo\)/);
  assert.match(smokeSource, /await page\.close\(\{ runBeforeUnload: false \}\);[\s\S]*registerCaliforniaStudentsByGrade\(context\.request/);
  assert.match(smokeSource, /await retireActiveCaliforniaStudent\(context, activePage\);[\s\S]*activePage = null;[\s\S]*await loginCaliforniaStudentForGrade\(context\.request, student\);[\s\S]*await context\.newPage\(\)/);
  assert.match(smokeSource, /collectBrowserDiagnostics\(nextPage, diagnostics\)/);
  assert.doesNotMatch(smokeSource, /page\.request\.post\("\/api\/auth\/(?:logout|login|register)"/);
  assert.doesNotMatch(smokeSource, /(?:process\.env\.)?(?:HOME|CODEX_HOME)\s*=/);
  assert.doesNotMatch(smokeSource, /\b(?:npx|npm\s+run)\b/);
});

test("Layer-A Chrome Crashpad containment is fail-closed from config through the product receipt", () => {
  assert.match(configSource, /PLAYWRIGHT_CRASHPAD_DIR/);
  assert.match(
    configSource,
    /--breakpad-dump-location=\$\{e2eCrashpadDir\}/
  );
  assert.match(
    configSource,
    /launchOptions:\s*\{\s*args:\s*\[`--breakpad-dump-location=\$\{e2eCrashpadDir\}`\]\s*\}/
  );
  assert.equal(configSource.match(/\blaunchOptions\s*:/g)?.length, 1);
  assert.equal(configSource.match(/--breakpad-dump-location=/g)?.length, 1);
  assert.match(configSource, /runsFormalCaliforniaLayerAProductSmoke[\s\S]*PLAYWRIGHT_CRASHPAD_DIR is required/);
  assert.match(configSource, /path\.isAbsolute\(value\)/);
  assert.match(configSource, /STARSHIP_VOLUME_ROOT = "\/Volumes\/Starship"/);
  assert.match(configSource, /generatedRoot = path\.resolve\(generatedRootValue\)/);
  assert.match(configSource, /absolutePath === generatedRoot \|\| !isPathInside\(absolutePath, generatedRoot\)/);
  assert.match(
    configSource,
    /assertSafeStarshipGeneratedPath\(\s*"PLAYWRIGHT_CRASHPAD_DIR",[\s\S]*e2eRunRoot\s*\)/
  );

  for (const forbiddenPrecedenceVariable of ["BREAKPAD_DUMP_LOCATION", "CFFIXED_USER_HOME"]) {
    assert.match(configSource, new RegExp(`"${forbiddenPrecedenceVariable}"`));
    assert.match(smokeSource, new RegExp(`"${forbiddenPrecedenceVariable}"`));
  }
  assert.match(configSource, /process\.env\[forbiddenPrecedenceVariable\] !== undefined/);
  assert.match(configSource, /\$\{forbiddenPrecedenceVariable\} must be absent/);

  assert.match(smokeSource, /"PLAYWRIGHT_CRASHPAD_DIR"/);
  assert.match(smokeSource, /testInfo\.project\.use\.launchOptions\?\.args/);
  assert.match(smokeSource, /assert\.deepEqual\(launchArgs, \[`--breakpad-dump-location=\$\{crashpadDir\}`\]/);
  assert.match(smokeSource, /crashpadDir:\s*formalEnvironment\.crashpadDir/);
  assert.match(smokeSource, /scheme:\s*"chrome-command-line-switch"/);
  assert.match(smokeSource, /globalCrashpadSettingsIdentity:\s*"external-runner-required"/);
  assert.match(smokeSource, /processTree:\s*"external-runner-required"/);
  assert.doesNotMatch(smokeSource, /(?:globalCrashpadSettingsIdentity|processTree):\s*(?:true|"passed"|"sealed")/);

  const combinedHarnessSource = `${configSource}\n${smokeSource}`;
  assert.doesNotMatch(
    combinedHarnessSource,
    /(?:process\.env(?:\.|\[)["']?(?:HOME|home|CODEX_HOME)["']?\]?\s*=|delete\s+process\.env(?:\.|\[)["']?(?:HOME|home|CODEX_HOME)["']?\]?)/
  );
  assert.doesNotMatch(configSource, /PLAYWRIGHT_CRASHPAD_DIR\s*\?\?\s*["']\.\//);
  assert.doesNotMatch(configSource, /launchOptions:\s*\{[^}]*\benv\s*:/);
});

test("Layer-A browser publishes one exclusive durable receipt per exact project without unsupported claims", () => {
  assert.match(smokeSource, /CA_VIZ_PRODUCT_SMOKE_RECEIPT_DIR/);
  assert.match(smokeSource, /CA_VIZ_ACCEPTANCE_RUN_ID/);
  assert.match(smokeSource, /CA_VIZ_SOURCE_SNAPSHOT_SHA256/);
  assert.match(smokeSource, /\.product-smoke\.passed\.json/);
  assert.match(smokeSource, /openSync\([^\n]+"wx",\s*0o600\)/);
  assert.match(smokeSource, /fsyncSync\(/);
  assert.match(smokeSource, /directoryRoutes:\s*visitedDirectoryLabIds/);
  assert.match(smokeSource, /premiumRoutes:\s*visitedPremiumLabIds/);
  assert.doesNotMatch(smokeSource, /signature-control-changes-model/);
  assert.doesNotMatch(smokeSource, /signature-reset-restores-model/);
});
