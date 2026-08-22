import {
  expect,
  test,
  type APIResponse,
  type Locator,
  type Page,
  type Request,
  type TestInfo,
} from "@playwright/test";

import {
  MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS,
} from "../../components/visualizations/mainland/DecimalArithmeticLab";
import {
  MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS,
} from "../../components/visualizations/mainland/MultiDigitOperationsLab";
import {
  getVisualizationLabByLabId,
  type FeaturedLabDefinition,
} from "../../data/visualizationLabs";
import {
  closeLearnerStartSetupIfVisible,
  collectPageErrors,
  expectNoPageErrors,
  uniqueSuffix,
} from "./helpers";
import {
  chinaVisualizationCollisionReceipt,
  type ChinaVisualizationCollisionReceipt,
} from "./china-visualization-collision-receipt";
import {
  installHkVisualizationEffectiveVisibilityInspector,
  scanHkVisualizationCollisions,
} from "./hk-visualization-collision-scanner";
import { scanHkVisualizationTextContrast } from "./hk-visualization-text-contrast-scanner";

const configuredModuleId = "configured-visualization-lab" as const;
const supportedProjects = ["desktop-chrome", "mobile-chrome"] as const;
const multiDigitModes = [
  "add",
  "subtract",
  "multiply",
  "divide",
  "estimate-check",
] as const;
const decimalModes = [
  "add",
  "subtract",
  "multiply",
  "divide",
  "estimate-check",
] as const;
const endpointNames = ["min", "mid", "max"] as const;
const multiDigitRangeParameters = [
  "operand-a",
  "operand-b",
  "strategy-step",
] as const;
const decimalRangeParameters = [
  "operand-a",
  "operand-b",
  "decimal-scale",
  "precision",
] as const;
const estimateOperationOptions = [
  "add",
  "subtract",
  "multiply",
  "divide",
] as const;
const roundingPlaceOptions = [
  "1",
  "10",
  "100",
  "1000",
  "10000",
  "100000",
] as const;

const exactMultiDigitIds = [
  "bnu-primary-p3-lower-two-digit-multiplication",
  "bnu-primary-p3-upper-multi-digit-multiplication",
  "bnu-primary-p3-upper-multiplication-division-fluency",
  "bnu-primary-p4-upper-division",
  "bnu-primary-p4-upper-multiplication",
  "hjb-primary-p3-lower-two-digit-multiplication-division",
  "hjb-primary-p3-upper-multiplication-division-extension",
  "hjb-primary-p3-upper-one-digit-multiplication",
  "hjb-primary-p4-upper-four-operations-problem-solving",
] as const;

const exactDecimalIds = [
  "bnu-primary-p4-lower-decimal-meaning-add-sub",
  "bnu-primary-p5-upper-decimal-division",
  "hjb-primary-p4-lower-decimals-meaning-add-sub",
  "hjb-primary-p5-upper-decimal-operations",
] as const;

type Family = "decimal-arithmetic" | "multi-digit-operations";
type EndpointName = (typeof endpointNames)[number];
type Mode = (typeof multiDigitModes)[number];
type Publisher = "MAINLAND_BNU" | "MAINLAND_HJB";

type RuntimeCase = {
  family: Family;
  fallbackModel: "array-area" | "base-ten";
  lab: FeaturedLabDefinition;
  labId: string;
  model: "decimal-arithmetic-v1" | "multi-digit-operations-v1";
  publisher: Publisher;
  rendererAttribute: "data-mainland-decimal-arithmetic" | "data-mainland-multi-digit-operations";
  rendererAttributeValue: string;
};

type ControlSnapshot = {
  affects: string[];
  disabled: boolean;
  kind: "range" | "select";
  max: number | null;
  min: number | null;
  options: string[];
  parameter: string;
  projection: string | null;
  projectionReason: string | null;
  step: number | null;
  value: string;
};

type ObservedWrite = {
  body: unknown;
  method: string;
  pathname: string;
  stage: "audit" | "interaction" | "mount";
};

type RuntimeReceipt = {
  collision: ChinaVisualizationCollisionReceipt;
  configuredState: string;
  contrast: {
    checkedTextCount: number;
    minRatio: number;
    requiredRatio: number;
    worstTarget: string;
  };
  controls: ControlSnapshot[];
  coverageId: string;
  mode: string;
  pageOverflow: {
    bodyScrollWidth: number;
    documentClientWidth: number;
    documentScrollWidth: number;
  };
  touchTargetCount: number;
};

function assertExactSet(label: string, actual: readonly string[], expected: readonly string[]) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    throw new TypeError(
      `${label} must remain exact; expected=${JSON.stringify(expectedSorted)} actual=${JSON.stringify(actualSorted)}.`,
    );
  }
}

assertExactSet(
  "G01 Mainland multi-digit production registry",
  MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS,
  exactMultiDigitIds,
);
assertExactSet(
  "G02 Mainland decimal production registry",
  MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS,
  exactDecimalIds,
);

function runtimeCase(
  family: Family,
  labId: string,
  publisher: Publisher,
): RuntimeCase {
  const lab = getVisualizationLabByLabId(labId);
  if (!lab) throw new TypeError(`${labId}: catalog row is missing.`);
  if (
    lab.labId !== labId ||
    lab.topicId !== labId ||
    lab.publisher !== publisher ||
    lab.moduleId !== configuredModuleId
  ) {
    throw new TypeError(
      `${labId}: catalog identity drifted: ${JSON.stringify({
        labId: lab.labId,
        moduleId: lab.moduleId,
        publisher: lab.publisher,
        topicId: lab.topicId,
      })}.`,
    );
  }
  const expectedTrack = publisher;
  if (lab.curriculumTrack !== expectedTrack) {
    throw new TypeError(
      `${labId}: expected curriculumTrack=${expectedTrack}; actual=${lab.curriculumTrack}.`,
    );
  }
  return family === "multi-digit-operations"
    ? {
        family,
        fallbackModel: "array-area",
        lab,
        labId,
        model: "multi-digit-operations-v1",
        publisher,
        rendererAttribute: "data-mainland-multi-digit-operations",
        rendererAttributeValue: "v1",
      }
    : {
        family,
        fallbackModel: "base-ten",
        lab,
        labId,
        model: "decimal-arithmetic-v1",
        publisher,
        rendererAttribute: "data-mainland-decimal-arithmetic",
        rendererAttributeValue: labId,
      };
}

const runtimeCases = [
  runtimeCase(
    "multi-digit-operations",
    "bnu-primary-p3-lower-two-digit-multiplication",
    "MAINLAND_BNU",
  ),
  runtimeCase(
    "multi-digit-operations",
    "hjb-primary-p3-lower-two-digit-multiplication-division",
    "MAINLAND_HJB",
  ),
  runtimeCase(
    "decimal-arithmetic",
    "bnu-primary-p4-lower-decimal-meaning-add-sub",
    "MAINLAND_BNU",
  ),
  runtimeCase(
    "decimal-arithmetic",
    "hjb-primary-p4-lower-decimals-meaning-add-sub",
    "MAINLAND_HJB",
  ),
] as const;

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

function isApiFamilyPath(pathname: string, family: string) {
  return pathname === family || pathname.startsWith(`${family}/`);
}

function isSameOriginApplicationUrl(value: string) {
  const url = new URL(value);
  return (
    (url.protocol === "http:" || url.protocol === "https:") &&
    (url.hostname === "127.0.0.1" || url.hostname === "localhost")
  );
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
      violations.push(`${write.method} ${write.pathname} created a visualization session during mount.`);
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
      violations.push(
        `${write.method} ${write.pathname} emitted visualization learning events during mount.`,
      );
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
    throw new TypeError(`${label}: response is not JSON: ${text.slice(0, 300)}.`);
  }
}

async function registerMainlandStudent(
  page: Page,
  testInfo: TestInfo,
  runtime: RuntimeCase,
) {
  const suffix = `${uniqueSuffix(testInfo)}-${runtime.publisher.toLowerCase()}`
    .replace(/[^a-z0-9-]+/giu, "-")
    .slice(0, 100);
  const username = `g01-g02-${suffix}@example.test`;
  const response = await page.request.post("/api/auth/register", {
    data: {
      curriculumProfile: {
        publisher: runtime.publisher,
        region: "MAINLAND",
      },
      curriculumTrack: "MAINLAND_PEP_HIGH",
      email: username,
      grade: runtime.lab.grade,
      language: "zh-Hans",
      name: `G01 G02 ${runtime.publisher} ${suffix}`,
      password: "start12345",
      role: "student",
      theme: "light",
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
  }>(response, `${runtime.labId}: disposable Mainland student registration`);
  expect(body.user?.role).toBe("student");
  expect(body.user?.grade).toBe(runtime.lab.grade);
  expect(body.user?.username).toBe(username);
  expect(body.user?.curriculumProfile).toEqual({
    publisher: runtime.publisher,
    region: "MAINLAND",
  });
  if (typeof body.user?.id !== "string" || body.user.id.trim().length === 0) {
    throw new TypeError(`${runtime.labId}: registration exposed no exact student id.`);
  }
  return { userId: body.user.id, username };
}

async function visibleControls(root: Locator): Promise<ControlSnapshot[]> {
  return await root.evaluate((element) => {
    const candidates = Array.from(
      element.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        'input[data-viz-parameter], select[data-viz-parameter]',
      ),
    );
    return candidates
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
        kind: control instanceof HTMLSelectElement ? "select" : "range",
        max:
          control instanceof HTMLInputElement && control.type === "range"
            ? Number(control.max)
            : null,
        min:
          control instanceof HTMLInputElement && control.type === "range"
            ? Number(control.min)
            : null,
        options:
          control instanceof HTMLSelectElement
            ? Array.from(control.options).map((option) => option.value)
            : [],
        parameter: control.getAttribute("data-viz-parameter") ?? "",
        projection: control.getAttribute("data-viz-range-projection"),
        projectionReason: control.getAttribute(
          "data-viz-range-projection-reason",
        ),
        step:
          control instanceof HTMLInputElement && control.type === "range"
            ? Number(control.step || "1")
            : null,
        value: control.value,
      }));
  });
}

function controlMap(controls: readonly ControlSnapshot[]) {
  const map = new Map<string, ControlSnapshot>();
  for (const control of controls) {
    if (!control.parameter) throw new TypeError("Visible control has no data-viz-parameter.");
    if (map.has(control.parameter)) {
      throw new TypeError(`Visible control parameter ${control.parameter} is not unique.`);
    }
    map.set(control.parameter, control);
  }
  return map;
}

async function configuredState(root: Locator) {
  const owners = root.locator("[data-viz-configured-state]");
  await expect(owners, "configured state owner must be unique").toHaveCount(1);
  const state = await owners.getAttribute("data-viz-configured-state");
  if (!state?.trim()) throw new TypeError("Configured state owner has an empty state receipt.");
  return state;
}

async function runtimeDigest(root: Locator) {
  const controls = await visibleControls(root);
  const modelOwner = root.locator("[data-viz-configured-model]");
  await expect(modelOwner).toHaveCount(1);
  return JSON.stringify({
    activeStrategyStep: await modelOwner.getAttribute("data-viz-active-strategy-step"),
    controls,
    mode: await modelOwner.getAttribute("data-viz-mode"),
    state: await modelOwner.getAttribute("data-viz-configured-state"),
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
  throw new Error(`${phase}: renderer did not expose two consecutive exact state digests.`);
}

async function assertProductionIdentity(root: Locator, runtime: RuntimeCase) {
  await expect(root).toHaveAttribute("data-viz-active-lab-id", runtime.labId);
  await expect(root).toHaveAttribute("data-viz-lesson-session-owner", "first-control-interaction");
  await expect(root).toHaveAttribute("data-viz-module-id", configuredModuleId);
  await expect(root).toHaveAttribute("data-viz-topic-id", runtime.labId);

  const renderer = root.locator(
    `[${runtime.rendererAttribute}=${JSON.stringify(runtime.rendererAttributeValue)}]`,
  );
  await expect(renderer, `${runtime.labId}: exact production renderer`).toHaveCount(1);
  await expect(renderer).toBeVisible();
  await expect(renderer).toHaveAttribute("data-viz-configured-model", runtime.model);
  await expect(renderer).toHaveAttribute("data-viz-topic-id", runtime.labId);
  const state = await renderer.getAttribute("data-viz-configured-state");
  expect(state, `${runtime.labId}: configured state receipt`).toMatch(
    new RegExp(`^${runtime.model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\|`),
  );

  await expect(root.locator("[data-viz-configured-model]")).toHaveCount(1);
  await expect(
    root.locator(`[data-viz-configured-model=${JSON.stringify(runtime.fallbackModel)}]`),
    `${runtime.labId}: stale generic ${runtime.fallbackModel} fallback must not mount`,
  ).toHaveCount(0);
  await expect(
    root.locator("[data-viz-renderer-mode]"),
    `${runtime.labId}: generic Configured surface must not mount beside the dedicated renderer`,
  ).toHaveCount(0);

  const reset = root.locator(
    `[data-viz-reset-model][data-viz-reset-module-id=${JSON.stringify(configuredModuleId)}][data-viz-reset-topic-id=${JSON.stringify(runtime.labId)}]`,
  );
  await expect(reset, `${runtime.labId}: exact reset identity`).toHaveCount(1);
  await expect(reset).toBeVisible();
}

async function assertMode(root: Locator, runtime: RuntimeCase, mode: Mode) {
  const modeOwner = root.locator("[data-viz-configured-model]");
  await expect(modeOwner).toHaveAttribute("data-viz-mode", mode);
  const buttons = root.locator("[data-viz-mode-button]");
  await expect(buttons).toHaveCount(5);
  const values = await buttons.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-viz-mode") ?? ""),
  );
  expect(values).toEqual(
    runtime.family === "multi-digit-operations"
      ? [...multiDigitModes]
      : [...decimalModes],
  );
  await expect(root.locator('[data-viz-mode-button][data-viz-mode-active="true"]')).toHaveCount(1);
  await expect(
    root.locator(`[data-viz-mode-button][data-viz-mode=${JSON.stringify(mode)}]`),
  ).toHaveAttribute("data-viz-mode-active", "true");
  expect(await configuredState(root)).toContain(`operation=${mode}`);
}

function exactOperationFromState(state: string): string {
  const value = state.match(/(?:^|\|)exact=([^|]+)/u)?.[1];
  if (!value) throw new TypeError(`Multi-digit state has no exact operation: ${state}.`);
  return value;
}

function assertControlContract(
  runtime: RuntimeCase,
  mode: Mode,
  controls: readonly ControlSnapshot[],
  state: string,
) {
  const map = controlMap(controls);
  const expectedParameters =
    runtime.family === "multi-digit-operations"
      ? mode === "estimate-check"
        ? [
            ...multiDigitRangeParameters,
            "estimate-operation",
            "rounding-place",
          ]
        : [...multiDigitRangeParameters]
      : [...decimalRangeParameters];
  expect([...map.keys()]).toEqual(expectedParameters);
  for (const control of controls) expect(control.disabled).toBe(false);

  if (runtime.family === "decimal-arithmetic") {
    expect(map.get("operand-a")).toMatchObject({ kind: "range", min: 0, max: 9_999, step: 1 });
    expect(map.get("operand-b")).toMatchObject({ kind: "range", min: 1, max: 9_999, step: 1 });
    expect(map.get("decimal-scale")).toMatchObject({ kind: "range", min: 0, max: 3, step: 1 });
    expect(map.get("precision")).toMatchObject({ kind: "range", min: 0, max: 4, step: 1 });
    return;
  }

  expect(map.get("operand-a")).toMatchObject({ kind: "range", min: 0, max: 999_999, step: 1 });
  expect(map.get("strategy-step")).toMatchObject({ kind: "range", min: 0, max: 3, step: 1 });
  const exactOperation = exactOperationFromState(state);
  const left = Number(map.get("operand-a")?.value);
  expect(Number.isSafeInteger(left)).toBe(true);
  expect(map.get("operand-b")).toMatchObject({
    kind: "range",
    min: exactOperation === "divide" ? 1 : 0,
    max: exactOperation === "subtract" ? left : 999_999,
    step: 1,
  });
  if (mode === "subtract") {
    expect(map.get("operand-a")?.affects).toEqual(["operand-b"]);
    expect(map.get("operand-a")?.projection).toBe("clamp-max");
    expect(map.get("operand-a")?.projectionReason).toBe(
      "whole-number-subtraction-remains-nonnegative",
    );
  }
  if (mode === "estimate-check") {
    expect(map.get("estimate-operation")).toMatchObject({
      kind: "select",
      options: [...estimateOperationOptions],
    });
    expect(map.get("rounding-place")).toMatchObject({
      kind: "select",
      options: [...roundingPlaceOptions],
    });
  }
}

async function assertTouchTargetsAndOverflow(root: Locator) {
  const touchTargets = await root.evaluate((element) => {
    const selector = [
      "[data-viz-mode-button]",
      'input[type="range"][data-viz-control="range"]',
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
  expect(touchTargets.length, "learner surface must expose real touch targets").toBeGreaterThan(0);
  for (const target of touchTargets) {
    expect(target.width, `${target.description}: touch width`).toBeGreaterThanOrEqual(44);
    expect(target.height, `${target.description}: touch height`).toBeGreaterThanOrEqual(44);
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

async function auditSettledState(
  root: Locator,
  runtime: RuntimeCase,
  coverageId: string,
): Promise<RuntimeReceipt> {
  await settleExactRuntime(root, coverageId);
  await assertProductionIdentity(root, runtime);
  const mode = await root.locator("[data-viz-configured-model]").getAttribute("data-viz-mode");
  if (!mode || !multiDigitModes.includes(mode as Mode)) {
    throw new TypeError(`${coverageId}: renderer exposed unsupported mode ${JSON.stringify(mode)}.`);
  }
  await assertMode(root, runtime, mode as Mode);
  const state = await configuredState(root);
  const controls = await visibleControls(root);
  assertControlContract(runtime, mode as Mode, controls, state);

  const collision = chinaVisualizationCollisionReceipt(
    await scanHkVisualizationCollisions(root, coverageId),
  );
  const contrast = await root.evaluate(scanHkVisualizationTextContrast, {
    authoringSelector:
      "[data-viz-authoring-only], [data-viz-manim-authoring-dock]",
  });
  expect(contrast.checkedTextCount, `${coverageId}: numeric contrast candidate count`).toBeGreaterThan(0);
  expect(contrast.worst, `${coverageId}: numeric contrast evidence`).not.toBeNull();
  expect(contrast.issues, `${coverageId}: contrast issues`).toEqual([]);
  if (!contrast.worst) throw new Error(`${coverageId}: contrast scanner returned no worst sample.`);

  const { pageOverflow, touchTargetCount } = await assertTouchTargetsAndOverflow(root);
  return {
    collision,
    configuredState: state,
    contrast: {
      checkedTextCount: contrast.checkedTextCount,
      minRatio: contrast.worst.contrastRatio,
      requiredRatio: contrast.worst.requiredRatio,
      worstTarget: contrast.worst.target,
    },
    controls,
    coverageId,
    mode,
    pageOverflow,
    touchTargetCount,
  };
}

async function setRangeValue(range: Locator, value: number) {
  await range.evaluate((element, nextValue) => {
    if (!(element instanceof HTMLInputElement) || element.type !== "range") {
      throw new TypeError("Range endpoint target is not an input[type=range].");
    }
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    if (!setter) throw new TypeError("Native HTMLInputElement value setter is unavailable.");
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
    throw new TypeError(
      `${control.parameter}: invalid range descriptor ${JSON.stringify(control)}.`,
    );
  }
  if (endpoint === "min") return control.min;
  if (endpoint === "max") return control.max;
  const steps = Math.round((control.max - control.min) / control.step / 2);
  return Math.min(control.max, control.min + steps * control.step);
}

function expectedCoverageIds(runtime: RuntimeCase) {
  const modes = runtime.family === "multi-digit-operations" ? multiDigitModes : decimalModes;
  const ranges =
    runtime.family === "multi-digit-operations"
      ? multiDigitRangeParameters
      : decimalRangeParameters;
  const coverage = ["initial", "first-interaction"];
  for (const mode of modes) {
    coverage.push(`mode:${mode}`);
    for (const parameter of ranges) {
      for (const endpoint of endpointNames) {
        coverage.push(`range:${mode}:${parameter}:${endpoint}`);
      }
    }
    if (runtime.family === "multi-digit-operations" && mode === "estimate-check") {
      for (const value of estimateOperationOptions) {
        coverage.push(`select:${mode}:estimate-operation:${value}`);
      }
      for (const value of roundingPlaceOptions) {
        coverage.push(`select:${mode}:rounding-place:${value}`);
      }
    }
  }
  coverage.push("reset");
  return coverage;
}

async function exactControlValues(root: Locator) {
  const controls = await visibleControls(root);
  return new Map(controls.map((control) => [control.parameter, control.value]));
}

async function executeRangeEndpoint(
  root: Locator,
  runtime: RuntimeCase,
  mode: Mode,
  parameter: string,
  endpoint: EndpointName,
) {
  const beforeControls = await visibleControls(root);
  const beforeMap = controlMap(beforeControls);
  const beforeTarget = beforeMap.get(parameter);
  if (!beforeTarget) throw new TypeError(`${mode}/${parameter}: planned range is missing.`);
  const targetValue = endpointValue(beforeTarget, endpoint);
  const expectedValues = new Map(
    beforeControls.map((control) => [control.parameter, control.value]),
  );
  expectedValues.set(parameter, String(targetValue));

  const target = root.locator(
    `input[type="range"][data-viz-parameter=${JSON.stringify(parameter)}]`,
  );
  await expect(target).toHaveCount(1);
  await expect(target).toBeEnabled();
  await setRangeValue(target, targetValue);
  await settleExactRuntime(root, `range:${mode}:${parameter}:${endpoint}`);

  const afterControls = await visibleControls(root);
  const afterMap = controlMap(afterControls);
  expect([...afterMap.keys()]).toEqual([...beforeMap.keys()]);
  for (const affectedParameter of beforeTarget.affects) {
    if (beforeTarget.projection !== "clamp-max") {
      throw new TypeError(
        `${mode}/${parameter}: declared dependency ${affectedParameter} has unsupported projection ${beforeTarget.projection}.`,
      );
    }
    const affectedAfter = afterMap.get(affectedParameter);
    const affectedBefore = beforeMap.get(affectedParameter);
    if (
      !affectedAfter ||
      !affectedBefore ||
      affectedAfter.min === null ||
      affectedAfter.max === null
    ) {
      throw new TypeError(
        `${mode}/${parameter}: affected control ${affectedParameter} has no exact live descriptor.`,
      );
    }
    const priorValue = Number(affectedBefore.value);
    expectedValues.set(
      affectedParameter,
      String(Math.min(affectedAfter.max, Math.max(affectedAfter.min, priorValue))),
    );
  }
  const actualValues = await exactControlValues(root);
  expect([...actualValues.entries()]).toEqual([...expectedValues.entries()]);
  expect(actualValues.get(parameter)).toBe(String(targetValue));
  return targetValue;
}

async function enterMode(root: Locator, runtime: RuntimeCase, mode: Mode) {
  const button = root.locator(
    `[data-viz-mode-button][data-viz-mode=${JSON.stringify(mode)}]`,
  );
  await expect(button).toHaveCount(1);
  await expect(button).toBeEnabled();
  await button.click();
  await settleExactRuntime(root, `mode:${mode}`);
  await assertMode(root, runtime, mode);
}

async function executeSelectOption(
  root: Locator,
  mode: Mode,
  parameter: string,
  value: string,
) {
  const beforeControls = await visibleControls(root);
  const beforeMap = controlMap(beforeControls);
  const selectBefore = beforeMap.get(parameter);
  if (!selectBefore || selectBefore.kind !== "select") {
    throw new TypeError(`${mode}/${parameter}: planned select is missing.`);
  }
  expect(selectBefore.options).toContain(value);
  const expectedValues = new Map(
    beforeControls.map((control) => [control.parameter, control.value]),
  );
  expectedValues.set(parameter, value);
  const select = root.locator(
    `select[data-viz-parameter=${JSON.stringify(parameter)}]`,
  );
  await expect(select).toHaveCount(1);
  await expect(select).toBeEnabled();
  await select.selectOption(value);
  await settleExactRuntime(root, `select:${mode}:${parameter}:${value}`);
  const after = await exactControlValues(root);
  expect([...after.entries()]).toEqual([...expectedValues.entries()]);
}

async function assertInitialOrResetState(root: Locator, runtime: RuntimeCase) {
  const values = await exactControlValues(root);
  if (runtime.family === "multi-digit-operations") {
    await assertMode(root, runtime, "multiply");
    expect([...values.entries()]).toEqual([
      ["operand-a", "347"],
      ["operand-b", "26"],
      ["strategy-step", "0"],
    ]);
    expect(await configuredState(root)).toContain("left=347|right=26");
    await expect(root.locator('[data-viz-active-strategy-step="0"]')).toHaveCount(1);
    return;
  }
  await assertMode(root, runtime, "add");
  expect([...values.entries()]).toEqual([
    ["operand-a", "125"],
    ["operand-b", "375"],
    ["decimal-scale", "1"],
    ["precision", "2"],
  ]);
  const state = await configuredState(root);
  expect(state).toContain("left=125@1");
  expect(state).toContain("right=375@2");
  expect(state).toContain("precision=2");
}

async function visualizationSessions(page: Page) {
  const response = await page.request.get("/api/visualization-sessions");
  const body = await readJson<{
    sessions?: Array<{
      completedAt?: unknown;
      explored?: unknown;
      moduleId?: unknown;
      source?: unknown;
      topicId?: unknown;
      updatedAt?: unknown;
    }>;
  }>(response, "visualization session server reread");
  if (!Array.isArray(body.sessions)) {
    throw new TypeError("Visualization session reread has no raw sessions array.");
  }
  return body.sessions;
}

async function performFirstExactInteraction(
  page: Page,
  root: Locator,
  runtime: RuntimeCase,
  userId: string,
) {
  const firstRange = root.locator('input[type="range"][data-viz-parameter]').first();
  await expect(firstRange).toBeVisible();
  await expect(firstRange).toBeEnabled();
  const before = Number(await firstRange.inputValue());
  const min = Number(await firstRange.getAttribute("min"));
  const max = Number(await firstRange.getAttribute("max"));
  const key = before < max ? "ArrowRight" : "ArrowLeft";
  const expected = key === "ArrowRight" ? Math.min(max, before + 1) : Math.max(min, before - 1);
  expect(expected).not.toBe(before);

  const responsePromise = page.waitForResponse(
    (response) => {
      const request = response.request();
      return (
        request.method() === "POST" &&
        new URL(response.url()).pathname === "/api/visualization-sessions"
      );
    },
    { timeout: 30_000 },
  );
  await firstRange.focus();
  await firstRange.press(key);
  await expect(firstRange).toHaveValue(String(expected));
  const response = await responsePromise;
  const request = response.request();
  expect(decodeURIComponent(request.headers()["x-mais-visualization-user-id"] ?? "")).toBe(userId);
  expect(requestBody(request)).toEqual({
    moduleId: configuredModuleId,
    source: "lesson",
    topicId: runtime.labId,
  });
  const delivery = await readJson<{
    acknowledgedUserId?: unknown;
    durablyPersisted?: unknown;
    session?: {
      explored?: unknown;
      moduleId?: unknown;
      source?: unknown;
      topicId?: unknown;
    };
  }>(response, `${runtime.labId}: first-control visualization session ACK`);
  expect(delivery).toMatchObject({
    acknowledgedUserId: userId,
    durablyPersisted: true,
    session: {
      explored: true,
      moduleId: configuredModuleId,
      source: "lesson",
      topicId: runtime.labId,
    },
  });
  const sessions = await visualizationSessions(page);
  expect(sessions).toEqual([
    expect.objectContaining({
      explored: true,
      moduleId: configuredModuleId,
      source: "lesson",
      topicId: runtime.labId,
      updatedAt: expect.any(String),
    }),
  ]);
}

test.describe("Mainland G01/G02 production learner routing and exhaustive control endpoints", () => {
  for (const runtime of runtimeCases) {
    test(`${runtime.family} ${runtime.publisher} ${runtime.labId} is exact on the configured lesson host`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(15 * 60_000);
      expect(supportedProjects).toContain(testInfo.project.name);
      const viewport = page.viewportSize();
      expect(viewport, `${testInfo.project.name}: real viewport`).not.toBeNull();
      if (!viewport) throw new Error(`${testInfo.project.name}: Playwright exposed no viewport.`);
      if (testInfo.project.name === "desktop-chrome") {
        expect(viewport.width).toBe(1440);
        expect(viewport.height).toBe(1100);
      } else {
        expect(viewport.width).toBeLessThanOrEqual(500);
        expect(viewport.height).toBeGreaterThanOrEqual(700);
      }

      const pageErrors = collectPageErrors(page);
      const consoleErrors: string[] = [];
      const requestFailures: string[] = [];
      const serverErrors: string[] = [];
      const observedWrites: ObservedWrite[] = [];
      let stage: ObservedWrite["stage"] = "mount";
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
      const student = await registerMainlandStudent(page, testInfo, runtime);
      expect(await visualizationSessions(page)).toEqual([]);

      const response = await page.goto(
        `/student/lessons/${encodeURIComponent(runtime.labId)}`,
        { waitUntil: "domcontentloaded" },
      );
      expect(response, `${runtime.labId}: lesson navigation response`).not.toBeNull();
      expect(response?.status()).toBeLessThan(400);
      await closeLearnerStartSetupIfVisible(page);

      const visualizationSection = page.locator("section#visualization");
      await expect(visualizationSection).toHaveCount(1);
      await expect(visualizationSection).toBeVisible({ timeout: 30_000 });
      const activeRoots = page.locator(
        `[data-viz-active-lab-id=${JSON.stringify(runtime.labId)}]`,
      );
      await expect(activeRoots, `${runtime.labId}: exact-one active root`).toHaveCount(1);
      await expect(activeRoots).toBeVisible({ timeout: 30_000 });
      const root = visualizationSection.locator(
        `[data-viz-active-lab-id=${JSON.stringify(runtime.labId)}]`,
      );
      await expect(root).toHaveCount(1);
      await assertProductionIdentity(root, runtime);
      await assertInitialOrResetState(root, runtime);

      const expectedCoverage = expectedCoverageIds(runtime);
      const receipts: RuntimeReceipt[] = [];
      receipts.push(await auditSettledState(root, runtime, "initial"));

      // Delayed mount-side writes must remain impossible, not merely absent at
      // the first DOM paint. Five and a half seconds crosses the historical
      // four-second Card engagement timer and the one-second analytics flush.
      await page.waitForTimeout(5_500);
      expect(await visualizationSessions(page)).toEqual([]);
      expect(mountWriteViolations(observedWrites)).toEqual([]);

      stage = "interaction";
      await performFirstExactInteraction(page, root, runtime, student.userId);
      stage = "audit";
      receipts.push(
        await auditSettledState(root, runtime, "first-interaction"),
      );

      const modes =
        runtime.family === "multi-digit-operations"
          ? multiDigitModes
          : decimalModes;
      const rangeParameters =
        runtime.family === "multi-digit-operations"
          ? multiDigitRangeParameters
          : decimalRangeParameters;
      for (const mode of modes) {
        await enterMode(root, runtime, mode);
        receipts.push(
          await auditSettledState(root, runtime, `mode:${mode}`),
        );
        for (const parameter of rangeParameters) {
          for (const endpoint of endpointNames) {
            const targetValue = await executeRangeEndpoint(
              root,
              runtime,
              mode,
              parameter,
              endpoint,
            );
            const receipt = await auditSettledState(
              root,
              runtime,
              `range:${mode}:${parameter}:${endpoint}`,
            );
            expect(
              new Map(
                receipt.controls.map((control) => [
                  control.parameter,
                  control.value,
                ]),
              ).get(parameter),
            ).toBe(String(targetValue));
            receipts.push(receipt);
          }
        }
        if (
          runtime.family === "multi-digit-operations" &&
          mode === "estimate-check"
        ) {
          for (const value of estimateOperationOptions) {
            await executeSelectOption(
              root,
              mode,
              "estimate-operation",
              value,
            );
            receipts.push(
              await auditSettledState(
                root,
                runtime,
                `select:${mode}:estimate-operation:${value}`,
              ),
            );
          }
          for (const value of roundingPlaceOptions) {
            await executeSelectOption(root, mode, "rounding-place", value);
            receipts.push(
              await auditSettledState(
                root,
                runtime,
                `select:${mode}:rounding-place:${value}`,
              ),
            );
          }
        }
      }

      const reset = root.locator(
        `[data-viz-reset-model][data-viz-reset-module-id=${JSON.stringify(configuredModuleId)}][data-viz-reset-topic-id=${JSON.stringify(runtime.labId)}]`,
      );
      await reset.click();
      await settleExactRuntime(root, "reset");
      await assertInitialOrResetState(root, runtime);
      receipts.push(await auditSettledState(root, runtime, "reset"));

      const executedCoverage = receipts.map((receipt) => receipt.coverageId);
      expect(executedCoverage).toEqual(expectedCoverage);
      expect(new Set(executedCoverage).size).toBe(expectedCoverage.length);
      expect(
        observedWrites.filter(
          (write) => write.pathname === "/api/visualization-sessions",
        ),
      ).toHaveLength(1);
      expect(
        observedWrites.filter(
          (write) =>
            write.method !== "GET" &&
            (isApiFamilyPath(write.pathname, "/api/gamification") ||
              isApiFamilyPath(write.pathname, "/api/rewards") ||
              isApiFamilyPath(write.pathname, "/api/teacher/gamification") ||
              isApiFamilyPath(write.pathname, "/api/teacher/rewards") ||
              isApiFamilyPath(write.pathname, "/api/teacher/reward-awards")),
        ),
      ).toEqual([]);
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
          source: "lesson",
          topicId: runtime.labId,
        }),
      ]);

      await testInfo.attach(
        `china-mainland-${runtime.family}-${runtime.publisher}-${testInfo.project.name}.json`,
        {
          body: Buffer.from(
            JSON.stringify(
              {
                collisionScannerSha256:
                  "4ae63ca8f2d84eea601e27f5315ae969138f47bcef3a393523cca311720cb983",
                contrastScannerSha256:
                  "5f3c17053c2a674424384b2a5c15e4669ab31324ecd6ffd4f4a337fb8ea80056",
                executedCoverage,
                expectedCoverage,
                finalSessions,
                labId: runtime.labId,
                model: runtime.model,
                observedWrites,
                project: testInfo.project.name,
                publisher: runtime.publisher,
                receipts,
                schemaVersion: "china-mainland-g01-g02-production-routing.v1",
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
    });
  }
});
