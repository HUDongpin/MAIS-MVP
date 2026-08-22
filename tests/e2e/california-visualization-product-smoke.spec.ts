import assert from "node:assert/strict";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type ConsoleMessage,
  type Locator,
  type Page,
  type TestInfo
} from "@playwright/test";
import { getSignatureLabAssignment } from "../../data/signatureLabAssignments";
import {
  visualizationLabCatalog,
  type FeaturedLabDefinition
} from "../../data/visualizationLabs";
import { premiumThreeDDirectLabIds } from "../../components/visualizations/generated/premiumThreeDDirectCatalog.generated";

const EXPECTED_CALIFORNIA_DIRECTORY_ROUTE_COUNT = 76;
const ROUTE_READY_TIMEOUT_MS = 60_000;
const PRODUCT_DELIVERY_CLOSE_SETTLE_MS = 4_000;
const STARSHIP_E2E_ROOT = "/Volumes/Starship/MAIS-ca-viz-labs-wt/.tmp";
const LEARNING_ANALYTICS_FLUSH_REQUESTED_EVENT_NAME =
  "mais:learning-analytics-flush-requested";
const PRODUCT_DELIVERY_OUTBOX_PREFIXES = [
  "mais:visualization-session-outbox:v1:",
  "mais:learning-analytics-outbox:v1:",
  "mais:learning-analytics-outbox:v2:",
  "mais:learning-analytics-unconfirmed-outbox:v1:"
] as const;
export const CALIFORNIA_PRODUCT_SMOKE_TEST_TITLE =
  "boots every canonical California lab and live premium direct route as a learner product";

const PRODUCT_SMOKE_CHECK_IDS = [
  "directory-shell-is-learner-only",
  "premium-live-direct-route-is-usable",
  "browser-diagnostics-are-clean",
  "qa-instrumentation-is-absent"
] as const;

const QA_ONLY_DOM_ATTRIBUTES = [
  "data-ca-source-site-key",
  "data-ca-source-instance-key",
  "data-ca-source-endpoints",
  "data-ca-source-endpoint-key",
  "data-ca-source-endpoint-instance-key",
  "data-ca-source-control-kind"
] as const;

const QA_ONLY_BUILD_NEEDLES = [
  ".ca-signature-qa-do-not-deploy.json",
  ".california-canvas-graphics-runtime-NO-DEPLOY.json",
  "california-canvas-graphics-runtime-instrumented",
  "__californiaCanvasGraphicsRuntime",
  "__californiaCanvasTextAudit",
  "createCaliforniaSignatureSourceExpectedProvider",
  "californiaSignatureSourceExpectedProvider"
] as const;

const QA_ONLY_BUILD_MARKER_FILES = [
  ".ca-signature-qa-do-not-deploy.json",
  ".california-canvas-graphics-runtime-NO-DEPLOY.json"
] as const;

const QA_ONLY_WINDOW_GLOBALS = [
  "__californiaCanvasGraphicsRuntime",
  "__californiaCanvasTextAudit"
] as const;

const AUTHORING_OR_DEBUG_SELECTORS = [
  "[data-viz-manim-authoring-control]",
  "[data-viz-manim-camera-mode-control]",
  "[data-viz-manim-camera-shot-control]",
  "[data-viz-manim-capture-control]",
  "[data-viz-manim-capture-screenshot]",
  "[data-viz-manim-capture-video-plan]",
  "[data-viz-manim-checkpoint-control]",
  "[data-viz-manim-debug-control]",
  "[data-viz-manim-history-control]",
  "[data-viz-manim-parameter-panel-control]",
  "[data-viz-manim-render-quality-control]",
  "[data-viz-manim-run-from-beat]",
  "[data-viz-manim-scene-selector-control]",
  "[data-viz-manim-show-final]",
  '[data-viz-manim-control-row="capture"]'
] as const;

type ProductSmokeRoute = {
  grade: FeaturedLabDefinition["grade"];
  href: string;
  lab: FeaturedLabDefinition;
  labId: string;
};

type RegisteredProductSmokeStudent = {
  grade: FeaturedLabDefinition["grade"];
  name: string;
  password: string;
  username: string;
};

type BrowserDiagnostic = {
  detail: string;
  kind: "console" | "http" | "page" | "request";
};

function directoryHref(lab: FeaturedLabDefinition) {
  const params = new URLSearchParams([
    ["grade", lab.grade],
    ["track", "all"],
    ["lab", lab.labId]
  ]);
  return `/student/tools/visualizations?${params.toString()}`;
}

function premiumDirectHref(lab: FeaturedLabDefinition) {
  const params = new URLSearchParams([
    ["grade", lab.grade],
    ["track", "all"]
  ]);
  return `/student/tools/visualizations/${encodeURIComponent(lab.labId)}?${params.toString()}`;
}

function buildProductSmokeManifest() {
  const californiaLabs = visualizationLabCatalog.filter(
    (lab) => lab.curriculumTrack === "US" && lab.publisher === "US_CA_MATH"
  );
  const premiumLabs = californiaLabs.filter(
    (lab) => lab.threeD?.enabled === true && lab.threeD.premiumLaunch === true
  );
  const globalLivePremiumLabs = visualizationLabCatalog.filter(
    (lab) => lab.threeD?.enabled === true && lab.threeD.premiumLaunch === true
  );

  assert.equal(
    californiaLabs.length,
    EXPECTED_CALIFORNIA_DIRECTORY_ROUTE_COUNT,
    "California Layer-A product smoke must collect the exact 76-route catalog."
  );
  assert.equal(
    new Set(californiaLabs.map((lab) => lab.labId)).size,
    EXPECTED_CALIFORNIA_DIRECTORY_ROUTE_COUNT,
    "California Layer-A directory lab IDs must be unique."
  );

  const catalogByLabId = new Map(californiaLabs.map((lab) => [lab.labId, lab] as const));
  const registeredDirectIds = new Set<string>(premiumThreeDDirectLabIds);
  assert.equal(
    registeredDirectIds.size,
    premiumThreeDDirectLabIds.length,
    "Premium static params must not repeat a direct lab ID."
  );
  assert.deepEqual(
    [...registeredDirectIds].sort(),
    globalLivePremiumLabs.map((lab) => lab.labId).sort(),
    "Premium static params must exactly equal the global enabled && premiumLaunch catalog set."
  );
  const californiaLivePremiumIds = premiumLabs.map((lab) => lab.labId).sort();
  const registeredCaliforniaPremiumIds: string[] = [];
  for (const labId of registeredDirectIds) {
    if (catalogByLabId.has(labId)) registeredCaliforniaPremiumIds.push(labId);
  }
  assert.deepEqual(
    registeredCaliforniaPremiumIds.sort(),
    californiaLivePremiumIds,
    "California premium static params must contain no disabled historical candidates."
  );

  const directoryRoutes: ProductSmokeRoute[] = californiaLabs.map((lab) => {
    assert.equal(lab.moduleId, "signature-lab", `${lab.labId} must remain a student-facing signature lab.`);
    assert.ok(
      getSignatureLabAssignment(lab.topicId),
      `${lab.labId} must have a reviewed signature-lab assignment.`
    );
    return { grade: lab.grade, href: directoryHref(lab), lab, labId: lab.labId };
  });
  const premiumRoutes: ProductSmokeRoute[] = premiumLabs.map((lab) => ({
    grade: lab.grade,
    href: premiumDirectHref(lab),
    lab,
    labId: lab.labId
  }));

  return Object.freeze({
    directoryRoutes: Object.freeze(directoryRoutes),
    premiumRoutes: Object.freeze(premiumRoutes)
  });
}

export const californiaVisualizationProductSmokeManifest = buildProductSmokeManifest();

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  assert.ok(value, `${name} is required for the formal California Layer-A product smoke.`);
  return value;
}

function isPathInside(candidate: string, root: string) {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function assertNoSymlinkInExistingPath(label: string, absolutePath: string) {
  let current = absolutePath;
  while (isPathInside(current, STARSHIP_E2E_ROOT)) {
    if (existsSync(current)) {
      assert.equal(lstatSync(current).isSymbolicLink(), false, `${label} must not traverse a symbolic link: ${current}`);
    }
    current = path.dirname(current);
  }
  assert.equal(current, STARSHIP_E2E_ROOT, `${label} must remain under the exact Starship E2E root.`);
  assert.equal(lstatSync(STARSHIP_E2E_ROOT).isSymbolicLink(), false, `${STARSHIP_E2E_ROOT} must not be a symlink.`);
}

function assertStarshipWritablePath(label: string, rawPath: string) {
  assert.ok(path.isAbsolute(rawPath), `${label} must be an absolute path.`);
  const absolutePath = path.resolve(rawPath);
  assert.ok(
    isPathInside(absolutePath, STARSHIP_E2E_ROOT),
    `${label} must be a strict descendant of ${STARSHIP_E2E_ROOT}; received ${absolutePath}.`
  );
  assertNoSymlinkInExistingPath(label, absolutePath);
  return absolutePath;
}

function assertFormalLayerAEnvironment(testInfo: TestInfo) {
  assert.equal(testInfo.project.use.channel, "chrome", "Layer-A product smoke requires installed Google Chrome.");
  assert.equal(requiredEnvironment("CA_VIZ_PRODUCT_SMOKE_LAYER"), "A");
  assert.equal(requiredEnvironment("CA_VIZ_PRODUCT_SMOKE_INSTRUMENTATION"), "none");
  for (const forbiddenPrecedenceVariable of ["BREAKPAD_DUMP_LOCATION", "CFFIXED_USER_HOME"] as const) {
    assert.equal(
      process.env[forbiddenPrecedenceVariable],
      undefined,
      `${forbiddenPrecedenceVariable} must be absent for command-line-only Crashpad containment.`
    );
  }

  const writableEnvironmentPaths = [
    "PLAYWRIGHT_E2E_ROOT",
    "PLAYWRIGHT_NEXT_DIST_DIR",
    "PLAYWRIGHT_OUTPUT_DIR",
    "PLAYWRIGHT_REPORT_DIR",
    "PLAYWRIGHT_CRASHPAD_DIR",
    "HK_MATH_DB_PATH",
    "TMPDIR",
    "TMP",
    "TEMP",
    "XDG_CACHE_HOME",
    "npm_config_cache",
    "NODE_COMPILE_CACHE"
  ] as const;
  for (const name of writableEnvironmentPaths) {
    assertStarshipWritablePath(name, requiredEnvironment(name));
  }
  assertStarshipWritablePath("testInfo.outputDir", testInfo.outputDir);
  const receiptDir = assertStarshipWritablePath(
    "CA_VIZ_PRODUCT_SMOKE_RECEIPT_DIR",
    requiredEnvironment("CA_VIZ_PRODUCT_SMOKE_RECEIPT_DIR")
  );
  assert.ok(lstatSync(receiptDir).isDirectory(), "Product smoke receipt root must already be a directory.");

  const nextDistDir = assertStarshipWritablePath(
    "PLAYWRIGHT_NEXT_DIST_DIR",
    requiredEnvironment("PLAYWRIGHT_NEXT_DIST_DIR")
  );
  const crashpadDir = assertStarshipWritablePath(
    "PLAYWRIGHT_CRASHPAD_DIR",
    requiredEnvironment("PLAYWRIGHT_CRASHPAD_DIR")
  );
  const launchArgs = testInfo.project.use.launchOptions?.args;
  assert.ok(Array.isArray(launchArgs), "Layer-A project must expose its resolved Chrome launch arguments.");
  assert.deepEqual(launchArgs, [`--breakpad-dump-location=${crashpadDir}`],
    "Layer-A must launch Chrome with exactly one Crashpad containment argument.");
  const diskBuildId = readFileSync(path.join(nextDistDir, "BUILD_ID"), "utf8").trim();
  const actualNextBuildId = requiredEnvironment("CA_VIZ_PRODUCT_SMOKE_BUILD_ID");
  assert.match(actualNextBuildId, /^[A-Za-z0-9_-]{8,128}$/);
  assert.equal(diskBuildId, actualNextBuildId, "Layer-A browser server must use the declared production BUILD_ID.");
  for (const marker of QA_ONLY_BUILD_MARKER_FILES) {
    assert.equal(
      existsSync(path.join(nextDistDir, marker)),
      false,
      `Layer-A production build must not contain ${marker}.`
    );
  }
  const acceptanceRunId = requiredEnvironment("CA_VIZ_ACCEPTANCE_RUN_ID");
  const buildId = requiredEnvironment("CA_VIZ_BUILD_ID");
  const sourceSnapshotSha256 = requiredEnvironment("CA_VIZ_SOURCE_SNAPSHOT_SHA256");
  assert.match(acceptanceRunId, /^[A-Za-z0-9_-]{24,128}$/);
  assert.match(buildId, /^[A-Za-z0-9._:-]{24,128}$/);
  assert.match(sourceSnapshotSha256, /^[a-f0-9]{64}$/);
  return { acceptanceRunId, actualNextBuildId, buildId, crashpadDir, nextDistDir, receiptDir, sourceSnapshotSha256 };
}

function publishProductSmokeReceipt(options: {
  acceptanceRunId: string;
  actualNextBuildId: string;
  buildId: string;
  crashpadDir: string;
  directoryRoutes: readonly string[];
  premiumRoutes: readonly string[];
  projectName: string;
  receiptDir: string;
  sourceSnapshotSha256: string;
}) {
  assert.ok(
    options.projectName === "desktop-chrome" || options.projectName === "mobile-chrome",
    `Unexpected product smoke project ${options.projectName}.`
  );
  const target = path.join(options.receiptDir, `${options.projectName}.product-smoke.passed.json`);
  assert.equal(path.dirname(target), options.receiptDir, "Product smoke receipt escaped its exact directory.");
  const bytes = Buffer.from(`${JSON.stringify({
    acceptanceRunId: options.acceptanceRunId,
    actualNextBuildId: options.actualNextBuildId,
    buildId: options.buildId,
    canvasNonTextClaim: false,
    checks: [...PRODUCT_SMOKE_CHECK_IDS],
    crashpadContainment: {
      argument: `--breakpad-dump-location=${options.crashpadDir}`,
      scheme: "chrome-command-line-switch",
      verificationBoundary: {
        globalCrashpadSettingsIdentity: "external-runner-required",
        processTree: "external-runner-required"
      }
    },
    crashpadDir: options.crashpadDir,
    directoryRoutes: [...options.directoryRoutes],
    graphicsReceipts: 0,
    instrumentation: "none",
    premiumRoutes: [...options.premiumRoutes],
    projectName: options.projectName,
    schemaVersion: 1,
    sourceSnapshotSha256: options.sourceSnapshotSha256,
    status: "passed"
  }, null, 2)}\n`, "utf8");
  const fileDescriptor = openSync(target, "wx", 0o600);
  try {
    writeFileSync(fileDescriptor, bytes);
    fsyncSync(fileDescriptor);
  } finally {
    closeSync(fileDescriptor);
  }
  const directoryDescriptor = openSync(options.receiptDir, "r");
  try {
    fsyncSync(directoryDescriptor);
  } finally {
    closeSync(directoryDescriptor);
  }
  const identity = lstatSync(target);
  assert.ok(identity.isFile() && !identity.isSymbolicLink() && identity.nlink === 1,
    "Product smoke receipt must remain one exclusive regular file.");
  assert.deepEqual(readFileSync(target), bytes, "Product smoke receipt durable reread drifted.");
}

function diagnosticDetail(message: ConsoleMessage) {
  return `${message.type()}: ${message.text()}`;
}

function collectBrowserDiagnostics(
  page: Page,
  diagnostics: BrowserDiagnostic[] = []
) {
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning" || message.type() === "assert") {
      diagnostics.push({ detail: diagnosticDetail(message), kind: "console" });
    }
  });
  page.on("pageerror", (error) => {
    diagnostics.push({ detail: error.message, kind: "page" });
  });
  page.on("requestfailed", (request) => {
    diagnostics.push({
      detail: `${request.method()} ${request.url()} ${request.failure()?.errorText ?? "unknown failure"}`,
      kind: "request"
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      diagnostics.push({ detail: `${response.status()} ${response.request().method()} ${response.url()}`, kind: "http" });
    }
  });
  return diagnostics;
}

async function expectCurrentCaliforniaStudent(
  request: APIRequestContext,
  student: RegisteredProductSmokeStudent
) {
  const me = await request.get("/api/me?includeLessonEntry=false");
  expect(me.status(), await me.text()).toBe(200);
  expect(await me.json()).toMatchObject({
    settings: { language: "en", selectedGrade: student.grade, theme: "light" },
    user: {
      curriculumProfile: { publisher: "US_CA_MATH", region: "US" },
      curriculumTrack: "US_CA_MATH",
      grade: student.grade,
      role: "student",
      username: student.username
    }
  });
}

async function registerCaliforniaStudent(
  request: APIRequestContext,
  testInfo: TestInfo,
  grade: FeaturedLabDefinition["grade"],
  ordinal: number
) {
  const safeProject = testInfo.project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  const safeGrade = grade.toLowerCase();
  const identity = `${Date.now()}-${process.pid}-${testInfo.workerIndex}-${safeProject}-${ordinal}-${safeGrade}`;
  const student: RegisteredProductSmokeStudent = {
    grade,
    name: `CA Layer A ${grade} ${safeProject} ${identity}`,
    password: "start12345",
    username: `ca-layer-a-${identity}@example.test`
  };

  const logoutBefore = await request.post("/api/auth/logout");
  expect([200, 401]).toContain(logoutBefore.status());
  const registration = await request.post("/api/auth/register", {
    data: {
      curriculumProfile: { publisher: "US_CA_MATH", region: "US" },
      curriculumTrack: "US_CA_MATH",
      email: student.username,
      grade: student.grade,
      language: "en",
      name: student.name,
      password: student.password,
      role: "student",
      theme: "light",
      username: student.username
    }
  });
  expect(registration.status(), await registration.text()).toBe(200);
  await expectCurrentCaliforniaStudent(request, student);
  return student;
}

async function registerCaliforniaStudentsByGrade(
  request: APIRequestContext,
  testInfo: TestInfo,
  routes: readonly ProductSmokeRoute[]
) {
  const grades = [...new Set(routes.map((route) => route.grade))].sort();
  const studentByGrade = new Map<FeaturedLabDefinition["grade"], RegisteredProductSmokeStudent>();
  for (const [ordinal, grade] of grades.entries()) {
    studentByGrade.set(grade, await registerCaliforniaStudent(request, testInfo, grade, ordinal));
  }
  const logout = await request.post("/api/auth/logout");
  expect(logout.status(), await logout.text()).toBe(200);
  return studentByGrade;
}

async function loginCaliforniaStudentForGrade(
  request: APIRequestContext,
  student: RegisteredProductSmokeStudent
) {
  const logout = await request.post("/api/auth/logout");
  expect([200, 401]).toContain(logout.status());

  const login = await request.post("/api/auth/login", {
    data: {
      curriculumProfile: { publisher: "US_CA_MATH", region: "US" },
      curriculumTrack: "US_CA_MATH",
      language: "en",
      password: student.password,
      theme: "light",
      username: student.username
    }
  });
  expect(login.status(), await login.text()).toBe(200);
  await expectCurrentCaliforniaStudent(request, student);
}

function pendingProductDeliveryStorageKeys(
  storageState: Awaited<ReturnType<BrowserContext["storageState"]>>
) {
  return storageState.origins.flatMap(({ localStorage, origin }) =>
    localStorage
      .filter(({ name }) => PRODUCT_DELIVERY_OUTBOX_PREFIXES.some((prefix) => name.startsWith(prefix)))
      .map(({ name }) => `${origin}\0${name}`)
  ).sort();
}

async function expectProductDeliveryOutboxesDrained(page: Page) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const settleStartedAt = Date.now();
    await page.evaluate((eventName) => {
      window.dispatchEvent(new Event(eventName));
    }, LEARNING_ANALYTICS_FLUSH_REQUESTED_EVENT_NAME);
    await expect.poll(async () => page.evaluate((prefixes) =>
      ([
        ...Object.keys(localStorage).map((key) => `local\0${key}`),
        ...Object.keys(sessionStorage).map((key) => `session\0${key}`)
      ]).filter((entry) => {
        const key = entry.substring(entry.indexOf("\0") + 1);
        return prefixes.some((prefix) => key.startsWith(prefix));
      }).sort()
    , [...PRODUCT_DELIVERY_OUTBOX_PREFIXES]), {
      message: "California Layer-A must durably acknowledge visualization sessions and learning events before changing learner scope.",
      timeout: 30_000
    }).toEqual([]);
    if (Date.now() - settleStartedAt < PRODUCT_DELIVERY_CLOSE_SETTLE_MS) return;
  }
  throw new Error("California Layer-A could not establish a quiet product-delivery close window.");
}

async function retireActiveCaliforniaStudent(
  context: BrowserContext,
  page: Page
) {
  await expectProductDeliveryOutboxesDrained(page);
  await page.goto("about:blank", { waitUntil: "load" });
  expect(page.url()).toBe("about:blank");
  expect(
    pendingProductDeliveryStorageKeys(await context.storageState()),
    "Unmounting the old learner provider must not persist a final old-owner delivery record."
  ).toEqual([]);
  await page.close({ runBeforeUnload: false });
  expect(page.isClosed()).toBe(true);
  expect(
    pendingProductDeliveryStorageKeys(await context.storageState()),
    "Closing the old learner page must not persist a final old-owner delivery record."
  ).toEqual([]);
}

function expectExactRoute(page: Page, route: ProductSmokeRoute, direct: boolean) {
  const actual = new URL(page.url());
  expect(actual.pathname).toBe(
    direct
      ? `/student/tools/visualizations/${encodeURIComponent(route.labId)}`
      : "/student/tools/visualizations"
  );
  expect([...actual.searchParams.entries()]).toEqual(
    direct
      ? [["grade", route.grade], ["track", "all"]]
      : [["grade", route.grade], ["track", "all"], ["lab", route.labId]]
  );
}

async function expectReadyVisualizationSurface(surface: Locator, labId: string) {
  await expect(surface, `${labId} must render a visible visualization surface.`).toBeVisible({
    timeout: ROUTE_READY_TIMEOUT_MS
  });
  await expect(
    surface.locator("[data-viz-mark]").first(),
    `${labId} must render a readiness mark inside its visualization surface.`
  ).toBeAttached({ timeout: ROUTE_READY_TIMEOUT_MS });
  const dimensions = await surface.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const drawable = Array.from(element.querySelectorAll<HTMLCanvasElement | SVGSVGElement>("canvas,svg"));
    let nonzeroDrawableCount = 0;
    for (const candidate of drawable) {
      const candidateRect = candidate.getBoundingClientRect();
      const canvas = candidate instanceof HTMLCanvasElement ? candidate : null;
      if (
        candidateRect.width > 0 && candidateRect.height > 0 &&
        (!canvas || (canvas.width > 0 && canvas.height > 0))
      ) {
        nonzeroDrawableCount += 1;
      }
    }
    return {
      height: rect.height,
      nonzeroDrawableCount,
      width: rect.width
    };
  });
  expect(dimensions.width, `${labId} surface width must be nonzero.`).toBeGreaterThan(0);
  expect(dimensions.height, `${labId} surface height must be nonzero.`).toBeGreaterThan(0);
  expect(dimensions.nonzeroDrawableCount, `${labId} must expose a nonzero Canvas or SVG drawable.`).toBeGreaterThan(0);
}

async function expectNoVisibleAuthoringOrDebug(root: Locator, labId: string) {
  const visible = await root.locator(AUTHORING_OR_DEBUG_SELECTORS.join(",")).evaluateAll((elements) => {
    const matches: string[] = [];
    for (const element of elements) {
      const html = element as HTMLElement;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (
        !html.hidden && style.display !== "none" && style.visibility !== "hidden" &&
        Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0
      ) {
        matches.push(element.outerHTML.replace(/\s+/g, " ").substring(0, 240));
      }
    }
    return matches;
  });
  expect(visible, `${labId} must not expose authoring, capture, history, or debug controls.`).toEqual([]);
}

async function expectNoHorizontalPageOverflow(page: Page, labId: string) {
  const overflow = await page.evaluate(() => ({
    body: Math.max(0, document.body.scrollWidth - document.body.clientWidth),
    document: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
  }));
  expect(overflow, `${labId} must not create horizontal page overflow.`).toEqual({ body: 0, document: 0 });
}

async function assertNoProductInstrumentation(page: Page, labId: string, loadedScripts: Set<string>) {
  const result = await page.evaluate(({ attributes, globals, needles }) => {
    const foundAttributes: string[] = [];
    for (const attribute of attributes) {
      if (document.querySelector(`[${attribute}]`)) foundAttributes.push(attribute);
    }
    const foundGlobals: string[] = [];
    for (const globalName of globals) {
      if (Object.prototype.hasOwnProperty.call(window, globalName)) foundGlobals.push(globalName);
    }
    const html = document.documentElement.outerHTML;
    const foundNeedles: string[] = [];
    for (const needle of needles) {
      if (html.includes(needle)) foundNeedles.push(needle);
    }
    const scripts: string[] = [];
    for (const script of Array.from(document.scripts)) {
      if (script.src) scripts.push(script.src);
    }
    return { foundAttributes, foundGlobals, foundNeedles, scripts };
  }, {
    attributes: [...QA_ONLY_DOM_ATTRIBUTES],
    globals: [...QA_ONLY_WINDOW_GLOBALS],
    needles: [...QA_ONLY_BUILD_NEEDLES]
  });
  expect(result.foundAttributes, `${labId} document must not contain signature-control QA attributes.`).toEqual([]);
  expect(result.foundGlobals, `${labId} window must not contain California QA runtime globals.`).toEqual([]);
  expect(result.foundNeedles, `${labId} document must not contain QA-only build markers/providers.`).toEqual([]);
  for (const script of result.scripts) {
    const url = new URL(script);
    if (url.origin === new URL(page.url()).origin && url.pathname.startsWith("/_next/")) {
      loadedScripts.add(url.href);
    }
  }
}

async function expectDirectoryLabProductReady(page: Page, route: ProductSmokeRoute, loadedScripts: Set<string>) {
  await page.goto(route.href, { timeout: ROUTE_READY_TIMEOUT_MS, waitUntil: "domcontentloaded" });
  expectExactRoute(page, route, false);
  const panel = page.locator(`#lab-example-${route.labId}`).first();
  await expect(panel).toBeVisible({ timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(panel).toHaveAttribute("data-viz-panel-mode", "lab", { timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(panel).toHaveAttribute("data-viz-active-lab-id", route.labId, { timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(panel).toHaveAttribute("data-viz-requested-lab-id", route.labId, { timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(panel).toHaveAttribute("data-viz-link-status", "ok", { timeout: ROUTE_READY_TIMEOUT_MS });

  const workspace = panel.locator(`section[data-lab-id=${JSON.stringify(route.labId)}]`).first();
  await expect(workspace).toBeVisible({ timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(workspace).toHaveAttribute("data-viz-current-grade", route.grade);
  await expect(workspace).toHaveAttribute("data-viz-current-track", "US");
  const assignment = getSignatureLabAssignment(route.lab.topicId);
  assert.ok(assignment, `${route.labId} lost its signature assignment after manifest collection.`);
  const switcher = workspace.locator("[data-viz-signature-switcher]").first();
  await expect(switcher).toHaveAttribute("data-viz-active-signature-bench", assignment.primary, {
    timeout: ROUTE_READY_TIMEOUT_MS
  });

  const surface = workspace.locator("[data-viz-signature-lab] [data-viz-surface]").first();
  await expectReadyVisualizationSurface(surface, route.labId);
  const reset = workspace.locator("button[data-viz-reset-model]").first();
  await expect(reset, `${route.labId} learner reset must be visible.`).toBeVisible({ timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(reset, `${route.labId} learner reset must be enabled.`).toBeEnabled({ timeout: ROUTE_READY_TIMEOUT_MS });
  await reset.click({ timeout: ROUTE_READY_TIMEOUT_MS });
  await expectReadyVisualizationSurface(surface, route.labId);

  await expectNoVisibleAuthoringOrDebug(workspace, route.labId);
  await expectNoHorizontalPageOverflow(page, route.labId);
  await assertNoProductInstrumentation(page, route.labId, loadedScripts);
}

async function expectPremiumLabProductReady(page: Page, route: ProductSmokeRoute, loadedScripts: Set<string>) {
  await page.goto(route.href, { timeout: ROUTE_READY_TIMEOUT_MS, waitUntil: "domcontentloaded" });
  expectExactRoute(page, route, true);
  const panel = page.locator(`#lab-example-${route.labId}[data-viz-direct-optimized-route]`).first();
  await expect(panel).toBeVisible({ timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(panel).toHaveAttribute("data-viz-panel-mode", "lab", { timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(panel).toHaveAttribute("data-viz-active-lab-id", route.labId, { timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(panel).toHaveAttribute("data-viz-requested-lab-id", route.labId, { timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(panel).toHaveAttribute("data-viz-current-grade", route.grade);
  await expect(panel).toHaveAttribute("data-viz-current-track", "US");

  const surface = panel.locator('[data-viz-surface][data-viz-canvas-ready="true"]').first();
  await expectReadyVisualizationSurface(surface, route.labId);
  const learnerDock = panel.locator("[data-viz-manim-control-dock]").first();
  await expect(learnerDock).toBeVisible({ timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(learnerDock).toHaveAttribute("data-viz-manim-presentation", "learner", {
    timeout: ROUTE_READY_TIMEOUT_MS
  });
  await expect(learnerDock).toHaveAttribute("data-viz-manim-authoring-controls-visible", "false", {
    timeout: ROUTE_READY_TIMEOUT_MS
  });
  await expectNoVisibleAuthoringOrDebug(panel, route.labId);

  const reset = panel.locator("button[data-viz-three-reset-camera]").first();
  const playback = panel.locator("button[data-viz-manim-playback-toggle]").first();
  const timeline = panel.locator('[data-viz-manim-timeline-scrubber][role="slider"]').first();
  await expect(reset).toBeVisible({ timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(reset).toBeEnabled({ timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(playback).toBeVisible({ timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(playback).toBeEnabled({ timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(timeline).toBeVisible({ timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(timeline).toHaveAttribute("tabindex", "0");
  await expect(timeline).toHaveAttribute("aria-valuemin", "0");
  await expect(timeline).toHaveAttribute("aria-valuemax", "1000");
  await expect(surface).toHaveAttribute("data-viz-manim-playback-state", "paused", {
    timeout: ROUTE_READY_TIMEOUT_MS
  });
  await playback.click({ timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(surface).toHaveAttribute("data-viz-manim-playback-state", "playing", {
    timeout: ROUTE_READY_TIMEOUT_MS
  });
  await playback.click({ timeout: ROUTE_READY_TIMEOUT_MS });
  await expect(surface).toHaveAttribute("data-viz-manim-playback-state", "paused", {
    timeout: ROUTE_READY_TIMEOUT_MS
  });
  await reset.click({ timeout: ROUTE_READY_TIMEOUT_MS });

  await expectNoHorizontalPageOverflow(page, route.labId);
  await assertNoProductInstrumentation(page, route.labId, loadedScripts);
}

async function assertLoadedProductionBuildIsUninstrumented(
  page: Page,
  loadedScripts: ReadonlySet<string>,
  buildId: string
) {
  const urls = new Set(loadedScripts);
  urls.add(new URL(`/_next/static/${buildId}/_buildManifest.js`, page.url()).href);
  for (const url of urls) {
    const response = await page.request.get(url);
    expect(response.status(), `Production build resource failed: ${url}`).toBe(200);
    const source = await response.text();
    const found: string[] = [];
    for (const needle of QA_ONLY_BUILD_NEEDLES) {
      if (source.includes(needle)) found.push(needle);
    }
    expect(found, `Layer-A production build resource must be uninstrumented: ${url}`).toEqual([]);
  }
}

function expectNoBrowserDiagnostics(diagnostics: readonly BrowserDiagnostic[]) {
  expect(
    diagnostics,
    diagnostics.map((diagnostic) => `${diagnostic.kind}: ${diagnostic.detail}`).join("\n")
  ).toEqual([]);
}

test.describe("California Visualization Layer-A uninstrumented product smoke", () => {
  test.describe.configure({ mode: "serial", retries: 0 });

  test(CALIFORNIA_PRODUCT_SMOKE_TEST_TITLE, async ({ context, page }, testInfo) => {
    test.setTimeout(
      (californiaVisualizationProductSmokeManifest.directoryRoutes.length +
        californiaVisualizationProductSmokeManifest.premiumRoutes.length) * ROUTE_READY_TIMEOUT_MS +
      180_000
    );
    const formalEnvironment = assertFormalLayerAEnvironment(testInfo);
    const { actualNextBuildId } = formalEnvironment;
    const diagnostics: BrowserDiagnostic[] = [];
    const loadedScripts = new Set<string>();
    const allRoutes = [
      ...californiaVisualizationProductSmokeManifest.directoryRoutes,
      ...californiaVisualizationProductSmokeManifest.premiumRoutes
    ];
    await page.close({ runBeforeUnload: false });
    expect(page.isClosed()).toBe(true);
    const studentByGrade = await registerCaliforniaStudentsByGrade(context.request, testInfo, allRoutes);
    let activePage: Page | null = null;
    let activeGrade: FeaturedLabDefinition["grade"] | null = null;
    const visitedDirectoryLabIds: string[] = [];
    const visitedPremiumLabIds: string[] = [];

    const selectStudentForRoute = async (route: ProductSmokeRoute) => {
      if (activeGrade === route.grade) {
        assert.ok(activePage, "An active learner grade must own one live product Page.");
        return activePage;
      }
      if (activePage !== null) {
        await retireActiveCaliforniaStudent(context, activePage);
        activePage = null;
        activeGrade = null;
      }
      const student = studentByGrade.get(route.grade);
      assert.ok(student, `Missing California Layer-A learner for grade ${route.grade}.`);
      assert.equal(student.grade, route.grade, "Layer-A learner grade must exactly match the visited lab grade.");
      await loginCaliforniaStudentForGrade(context.request, student);
      const nextPage = await context.newPage();
      collectBrowserDiagnostics(nextPage, diagnostics);
      activePage = nextPage;
      activeGrade = route.grade;
      return nextPage;
    };

    for (const route of californiaVisualizationProductSmokeManifest.directoryRoutes) {
      const routePage = await selectStudentForRoute(route);
      await expectDirectoryLabProductReady(routePage, route, loadedScripts);
      visitedDirectoryLabIds.push(route.labId);
      await routePage.waitForTimeout(250);
      await expectProductDeliveryOutboxesDrained(routePage);
      expectNoBrowserDiagnostics(diagnostics);
    }
    for (const route of californiaVisualizationProductSmokeManifest.premiumRoutes) {
      const routePage = await selectStudentForRoute(route);
      await expectPremiumLabProductReady(routePage, route, loadedScripts);
      visitedPremiumLabIds.push(route.labId);
      await routePage.waitForTimeout(250);
      await expectProductDeliveryOutboxesDrained(routePage);
      expectNoBrowserDiagnostics(diagnostics);
    }

    expect(visitedDirectoryLabIds).toEqual(
      californiaVisualizationProductSmokeManifest.directoryRoutes.map((route) => route.labId)
    );
    expect(visitedPremiumLabIds).toEqual(
      californiaVisualizationProductSmokeManifest.premiumRoutes.map((route) => route.labId)
    );
    const finalVisitedRoute =
      californiaVisualizationProductSmokeManifest.premiumRoutes[
        californiaVisualizationProductSmokeManifest.premiumRoutes.length - 1
      ] ?? californiaVisualizationProductSmokeManifest.directoryRoutes[
        californiaVisualizationProductSmokeManifest.directoryRoutes.length - 1
      ];
    assert.ok(finalVisitedRoute, "Layer-A must retain one final visited route for build inspection.");
    const finalPage = await selectStudentForRoute(finalVisitedRoute);
    await assertLoadedProductionBuildIsUninstrumented(finalPage, loadedScripts, actualNextBuildId);
    await finalPage.waitForTimeout(250);
    expectNoBrowserDiagnostics(diagnostics);
    await retireActiveCaliforniaStudent(context, finalPage);
    activePage = null;
    activeGrade = null;
    expectNoBrowserDiagnostics(diagnostics);

    await testInfo.attach("california-visualization-layer-a-product-smoke.json", {
      body: Buffer.from(JSON.stringify({
        buildId: actualNextBuildId,
        canvasNonTextContrastClaim: false,
        crashpadContainment: {
          argument: `--breakpad-dump-location=${formalEnvironment.crashpadDir}`,
          scheme: "chrome-command-line-switch",
          verificationBoundary: {
            globalCrashpadSettingsIdentity: "external-runner-required",
            processTree: "external-runner-required"
          }
        },
        crashpadDir: formalEnvironment.crashpadDir,
        directoryRouteCount: visitedDirectoryLabIds.length,
        directoryRoutes: visitedDirectoryLabIds,
        graphicsReceipts: 0,
        instrumentation: "none",
        layer: "A",
        premiumRouteCount: visitedPremiumLabIds.length,
        premiumRoutes: visitedPremiumLabIds,
        project: testInfo.project.name,
        registeredStudents: [...studentByGrade.values()].map(({ grade, username }) => ({ grade, username })),
        schemaVersion: 1,
        webGlNonTextContrastClaim: false
      }, null, 2)),
      contentType: "application/json"
    });
    publishProductSmokeReceipt({
      ...formalEnvironment,
      directoryRoutes: visitedDirectoryLabIds,
      premiumRoutes: visitedPremiumLabIds,
      projectName: testInfo.project.name
    });
  });
});
