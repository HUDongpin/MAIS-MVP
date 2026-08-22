import assert from "node:assert/strict";
import fs from "node:fs";
import test, { after, before } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";

import {
  RATIO_PROPORTION_SCALE_LAB_ID,
  RATIO_PROPORTION_SCALE_MODES,
  buildRatioProportionScaleState,
  type RatioProportionScaleInput,
  type RatioProportionScaleMode,
} from "./RatioProportionScaleModel";
import { RATIO_PROPORTION_SCALE_CONTROL_DOMAIN_CONTRACT } from "./RatioProportionScaleControlDomain";

const COMPONENT_PATH =
  "components/visualizations/mainland/RatioProportionScaleLab.tsx";
const LAB_ID = "pep-primary-p6-lower-ratio-proportion-scale" as const;

const reactGlobal = globalThis as unknown as { React?: typeof React };
let hadOwnReact = false;
let previousReact: typeof React | undefined;
let AppProviders: (typeof import("../../providers/AppProviders"))["AppProviders"];
let MAINLAND_RATIO_PROPORTION_SCALE_LAB_IDS: (typeof import("./RatioProportionScaleLab"))["MAINLAND_RATIO_PROPORTION_SCALE_LAB_IDS"];
let RATIO_PROPORTION_SCALE_COPY: (typeof import("./RatioProportionScaleLab"))["RATIO_PROPORTION_SCALE_COPY"];
let RatioProportionScaleLab: (typeof import("./RatioProportionScaleLab"))["RatioProportionScaleLab"];
let createRatioProportionScaleLabUiState: (typeof import("./RatioProportionScaleLab"))["createRatioProportionScaleLabUiState"];
let isMainlandRatioProportionScaleLabId: (typeof import("./RatioProportionScaleLab"))["isMainlandRatioProportionScaleLabId"];
let reduceRatioProportionScaleLabUiState: (typeof import("./RatioProportionScaleLab"))["reduceRatioProportionScaleLabUiState"];
let resetRatioProportionScaleLabInput: (typeof import("./RatioProportionScaleLab"))["resetRatioProportionScaleLabInput"];

before(async () => {
  hadOwnReact = Object.prototype.hasOwnProperty.call(reactGlobal, "React");
  previousReact = reactGlobal.React;
  reactGlobal.React = React;
  ({ AppProviders } = await import("../../providers/AppProviders"));
  ({
    MAINLAND_RATIO_PROPORTION_SCALE_LAB_IDS,
    RATIO_PROPORTION_SCALE_COPY,
    RatioProportionScaleLab,
    createRatioProportionScaleLabUiState,
    isMainlandRatioProportionScaleLabId,
    reduceRatioProportionScaleLabUiState,
    resetRatioProportionScaleLabInput,
  } = await import("./RatioProportionScaleLab"));
});

after(() => {
  if (hadOwnReact) reactGlobal.React = previousReact;
  else delete reactGlobal.React;
});

const router = {
  back() {},
  forward() {},
  prefetch() {
    return Promise.resolve();
  },
  push() {},
  refresh() {},
  replace() {},
};

function inputForMode(
  mode: RatioProportionScaleMode,
  overrides: Partial<RatioProportionScaleInput> = {},
): RatioProportionScaleInput {
  return {
    actualUnit: "m",
    drawingLength: 5,
    drawingUnit: "cm",
    labId: LAB_ID,
    mode,
    ratioA: mode === "direct-proportion" ? 3 : 2,
    ratioB: mode === "inverse-proportion" ? 9 : 3,
    scaleFactor: mode === "scale-drawing" ? 100 : 4,
    ...overrides,
  };
}

function renderLab(labId: string, initialInput?: RatioProportionScaleInput) {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={router as never}>
      <PathnameContext.Provider value="/visualization-lab">
        <AppProviders>
          <RatioProportionScaleLab
            labId={labId}
            initialInput={initialInput}
          />
        </AppProviders>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>,
  );
}

function count(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].length;
}

function visibleText(markup: string) {
  return markup
    .replace(/<[^>]*>/gu, " ")
    .replace(/&gt;/gu, ">")
    .replace(/&lt;/gu, "<")
    .replace(/&amp;/gu, "&");
}

function assertLocalizedCopy(value: unknown, path = "copy"): void {
  assert.ok(value && typeof value === "object", `${path} must be an object`);
  const record = value as Record<string, unknown>;
  if ("en" in record || "zh" in record || "zhHans" in record) {
    assert.equal(typeof record.en, "string", `${path}.en`);
    assert.equal(typeof record.zh, "string", `${path}.zh`);
    assert.equal(typeof record.zhHans, "string", `${path}.zhHans`);
    assert.match(record.en as string, /\S/u, `${path}.en`);
    assert.match(record.zh as string, /[\u3400-\u9fff]/u, `${path}.zh`);
    assert.match(record.zhHans as string, /[\u3400-\u9fff]/u, `${path}.zhHans`);
    return;
  }
  for (const [key, child] of Object.entries(record)) {
    assertLocalizedCopy(child, `${path}.${key}`);
  }
}

test("owns exactly the frozen G06 ID and fails closed for every other Lab", () => {
  assert.equal(RATIO_PROPORTION_SCALE_LAB_ID, LAB_ID);
  assert.deepEqual(MAINLAND_RATIO_PROPORTION_SCALE_LAB_IDS, [LAB_ID]);
  assert.equal(new Set(MAINLAND_RATIO_PROPORTION_SCALE_LAB_IDS).size, 1);
  assert.equal(isMainlandRatioProportionScaleLabId(LAB_ID), true);
  assert.equal(isMainlandRatioProportionScaleLabId("p6-ratio-proportion"), false);
  assert.equal(renderLab("not-g06"), "");
});

test("the deterministic learner reset is frozen, domain-valid, and exact-model valid", () => {
  const first = resetRatioProportionScaleLabInput(LAB_ID);
  const second = resetRatioProportionScaleLabInput(LAB_ID);
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assert.equal(first.mode, "equivalent-ratios");
  assert.equal(first.ratioA, 2);
  assert.equal(first.ratioB, 3);
  assert.equal(first.scaleFactor, 4);
  assert(Object.isFrozen(first));
  assert.doesNotThrow(() => buildRatioProportionScaleState(first));
  const uiState = createRatioProportionScaleLabUiState(LAB_ID, first);
  assert.equal(uiState.receipt.matchesExpected, true);
  assert.deepEqual(uiState.receipt.expected, uiState.receipt.observed);
  assert.deepEqual(uiState.receipt.projections, []);
});

test("atomic mode, numeric, and unit transitions consume requested, expected, and observed receipts", () => {
  const initial = createRatioProportionScaleLabUiState(
    LAB_ID,
    inputForMode("equivalent-ratios"),
  );
  const ratioChanged = reduceRatioProportionScaleLabUiState(initial, {
    controlId: "ratio-a",
    kind: "control",
    value: 7,
  });
  assert.equal(ratioChanged.lastRejection, null);
  assert.equal(ratioChanged.domainState.ratioA, 7);
  assert.deepEqual(ratioChanged.receipt.requested, ratioChanged.receipt.expected);
  assert.deepEqual(ratioChanged.receipt.expected, ratioChanged.receipt.observed);
  assert.deepEqual(ratioChanged.receipt.projections, []);

  const scaleMode = reduceRatioProportionScaleLabUiState(ratioChanged, {
    controllerId: "mode",
    kind: "controller",
    value: "scale-drawing",
  });
  const drawingUnit = reduceRatioProportionScaleLabUiState(scaleMode, {
    controllerId: "drawing-unit",
    kind: "controller",
    value: "km",
  });
  const actualUnit = reduceRatioProportionScaleLabUiState(drawingUnit, {
    controllerId: "actual-unit",
    kind: "controller",
    value: "mm",
  });
  assert.equal(actualUnit.domainState.drawingUnit, "km");
  assert.equal(actualUnit.domainState.actualUnit, "mm");
  assert.equal(actualUnit.receipt.matchesExpected, true);
  assert.doesNotThrow(() =>
    buildRatioProportionScaleState({ ...actualUnit.domainState }),
  );
});

test("hidden and out-of-domain requests preserve the last observed state with a hard rejection", () => {
  const initial = createRatioProportionScaleLabUiState(
    LAB_ID,
    inputForMode("equivalent-ratios"),
  );
  for (const request of [
    { controlId: "drawing-length", kind: "control", value: 5 },
    { controlId: "ratio-a", kind: "control", value: 0 },
  ] as const) {
    const rejected = reduceRatioProportionScaleLabUiState(initial, request);
    assert.notEqual(rejected.lastRejection, null);
    assert.deepEqual(rejected.domainState, initial.domainState);
    assert.deepEqual(rejected.receipt, initial.receipt);
    assert.equal(rejected.actionReceipt.status, "rejected");
    assert.equal(rejected.actionReceipt.rejection, rejected.lastRejection);
    assert.deepEqual(rejected.actionReceipt.request, request);
    assert.deepEqual(rejected.actionReceipt.before, initial.domainState);
    assert.deepEqual(rejected.actionReceipt.requested, initial.domainState);
    assert.deepEqual(rejected.actionReceipt.expected, initial.domainState);
    assert.deepEqual(rejected.actionReceipt.observed, initial.domainState);
    assert.deepEqual(rejected.actionReceipt.projections, []);
  }
});

test("default root exposes stable topic, model, domain, receipt, reset, and local-scroll selectors", () => {
  const markup = renderLab(LAB_ID);
  assert.match(markup, new RegExp(`data-viz-topic-id="${LAB_ID}"`, "u"));
  assert.match(markup, /data-viz-configured-model="ratio-proportion-scale-v1"/u);
  assert.match(markup, /data-viz-configured-state="[^"]+"/u);
  assert.match(markup, /data-viz-mode="equivalent-ratios"/u);
  assert.match(
    markup,
    /data-viz-range-domain-id="ratio-proportion-scale-equivalent-ratios-v1"/u,
  );
  assert.match(
    markup,
    /data-viz-domain-contract-id="ratio-proportion-scale-controls-v1"/u,
  );
  assert.match(markup, /data-viz-domain-requested="[^"]+"/u);
  assert.match(markup, /data-viz-domain-expected="[^"]+"/u);
  assert.match(markup, /data-viz-domain-observed="[^"]+"/u);
  assert.match(markup, /data-viz-domain-match="true"/u);
  assert.match(markup, /data-viz-domain-projection-count="0"/u);
  assert.match(markup, /data-viz-action-receipt="[^"]+"/u);
  assert.match(markup, /data-viz-action-receipt-version="ratio-proportion-scale-action-receipt-v1"/u);
  assert.match(markup, /data-viz-action-status="accepted"/u);
  assert.match(markup, /data-viz-action-request="[^"]+"/u);
  assert.match(markup, /data-viz-action-before="[^"]+"/u);
  assert.match(markup, /data-viz-action-requested="[^"]+"/u);
  assert.match(markup, /data-viz-action-expected="[^"]+"/u);
  assert.match(markup, /data-viz-action-observed="[^"]+"/u);
  assert.match(markup, /data-viz-action-projections="\[\]"/u);
  assert.match(markup, /data-viz-action-rejection="none"/u);
  assert.match(markup, /data-viz-reset-model="true"/u);
  assert.match(markup, /data-viz-reset-module-id="configured-visualization-lab"/u);
  assert.match(markup, new RegExp(`data-viz-reset-topic-id="${LAB_ID}"`, "u"));
  assert.match(markup, /data-viz-local-scroll="horizontal"/u);
  assert.match(markup, /data-viz-pan-hint="true"/u);
});

test("all four mode buttons and each mode-specific control set have stable selectors", () => {
  const defaultMarkup = renderLab(LAB_ID);
  assert.equal(count(defaultMarkup, /data-viz-mode-button="true"/gu), 4);
  for (const mode of RATIO_PROPORTION_SCALE_MODES) {
    assert.match(
      defaultMarkup,
      new RegExp(
        `data-viz-mode-button="true"[^>]*data-viz-mode="${mode}"`,
        "u",
      ),
    );
  }

  for (const mode of [
    "equivalent-ratios",
    "direct-proportion",
    "inverse-proportion",
  ] as const) {
    const markup = renderLab(LAB_ID, inputForMode(mode));
    for (const parameter of ["ratio-a", "ratio-b", "scale-factor"]) {
      assert.match(markup, new RegExp(`data-viz-parameter="${parameter}"`, "u"));
    }
    assert.doesNotMatch(markup, /data-viz-parameter="drawing-length"/u);
    assert.doesNotMatch(markup, /data-viz-parameter="drawing-unit"/u);
    assert.doesNotMatch(markup, /data-viz-parameter="actual-unit"/u);
  }

  const scale = renderLab(LAB_ID, inputForMode("scale-drawing"));
  assert.match(scale, /data-viz-parameter="scale-factor"/u);
  assert.match(scale, /data-viz-parameter="drawing-length"/u);
  assert.match(scale, /data-viz-parameter="drawing-unit"/u);
  assert.match(scale, /data-viz-parameter="actual-unit"/u);
  assert.doesNotMatch(scale, /data-viz-parameter="ratio-a"/u);
  assert.doesNotMatch(scale, /data-viz-parameter="ratio-b"/u);
  assert.equal(count(scale, /data-viz-unit-option=/gu), 8);
});

test("every mode binds one exact visible equation and one true SVG receipt", () => {
  for (const mode of RATIO_PROPORTION_SCALE_MODES) {
    const markup = renderLab(LAB_ID, inputForMode(mode));
    assert.match(
      markup,
      new RegExp(`data-viz-visible-receipt="${mode}"`, "u"),
      mode,
    );
    assert.equal(count(markup, /data-viz-visible-equation="true"/gu), 1);
    assert.equal(
      count(markup, /data-viz-ratio-proportion-scale-visual=/gu),
      1,
    );
    assert.match(markup, /data-viz-painted-mark-count="[1-9]\d*"/u);
    assert.doesNotMatch(markup, /data-viz-ratio-proportion-scale-visual-status="unsupported"/u);
  }
});

test("visible equations reconstruct each of the four mathematical relations", () => {
  const cases = [
    [
      inputForMode("equivalent-ratios", {
        ratioA: 2,
        ratioB: 3,
        scaleFactor: 4,
      }),
      /2\/1 : 3\/1 = 8\/1 : 12\/1[\s\S]*24\/1 = 24\/1/u,
    ],
    [
      inputForMode("direct-proportion", {
        ratioA: 3,
        ratioB: 5,
        scaleFactor: 4,
      }),
      /\(3\/1, 5\/1\)[\s\S]*\(12\/1, 20\/1\)[\s\S]*5\/3/u,
    ],
    [
      inputForMode("inverse-proportion", {
        ratioA: 4,
        ratioB: 9,
        scaleFactor: 3,
      }),
      /4\/1 × 9\/1 = 12\/1 × 3\/1 = 36\/1/u,
    ],
    [
      inputForMode("scale-drawing"),
      /5\/1 cm × 100\/1 = 500\/1 cm = 5\/1 m/u,
    ],
  ] as const;
  for (const [input, pattern] of cases) {
    const markup = visibleText(renderLab(LAB_ID, input));
    assert.match(markup, pattern);
  }
});

test("every mode, numeric, unit, and reset control satisfies the 44px source contract", () => {
  for (const mode of RATIO_PROPORTION_SCALE_MODES) {
    const markup = renderLab(LAB_ID, inputForMode(mode));
    for (const selector of [
      "data-viz-mode-button",
      "data-viz-parameter",
      "data-viz-reset-model",
    ]) {
      const matches = [
        ...markup.matchAll(
          new RegExp(`${selector}="[^"]+"[^>]*class="([^"]+)"`, "gu"),
        ),
      ];
      assert.ok(matches.length > 0, `${mode}:${selector}`);
      for (const match of matches) {
        assert.match(match[1]!, /min-h-11/u, `${mode}:${selector}`);
      }
    }
  }
});

test("learner copy is complete in en, zh, zhHans and visible text hides raw contracts", () => {
  assertLocalizedCopy(RATIO_PROPORTION_SCALE_COPY);
  for (const mode of RATIO_PROPORTION_SCALE_MODES) {
    const text = visibleText(renderLab(LAB_ID, inputForMode(mode)));
    assert.doesNotMatch(
      text,
      /ratio-proportion-scale-v1|ratio-proportion-scale-controls-v1|equivalent-ratio-cross-products|direct-proportion-constant|inverse-proportion-product|scale-drawing-unit-conversion/u,
    );
  }
});

test("invalid initial identity, mode, or unit renders no misleading learner surface", () => {
  for (const input of [
    { ...inputForMode("equivalent-ratios"), labId: "not-g06" },
    { ...inputForMode("equivalent-ratios"), mode: "unknown-mode" },
    { ...inputForMode("scale-drawing"), actualUnit: "mile" },
  ]) {
    assert.equal(renderLab(LAB_ID, input as RatioProportionScaleInput), "");
  }
});

test("the learner component consumes only the frozen model/domain and true visual surface", () => {
  const source = fs.readFileSync(COMPONENT_PATH, "utf8");
  assert.match(source, /from "\.\/RatioProportionScaleModel"/u);
  assert.match(source, /from "\.\/RatioProportionScaleControlDomain"/u);
  assert.match(source, /from "\.\/RatioProportionScaleVisualModel"/u);
  assert.doesNotMatch(
    source,
    /ConfiguredVisualizationLab|visualizationLabs|generic|ThreeDLabCanvas/u,
  );
  assert.equal(count(source, /useState</gu), 1);
  assert.equal(count(source, /data-viz-svg-background/gu), 0);
  assert.equal(
    RATIO_PROPORTION_SCALE_CONTROL_DOMAIN_CONTRACT.id,
    "ratio-proportion-scale-controls-v1",
  );
  assert.match(source, /RATIO_PROPORTION_SCALE_CONTROL_DOMAIN_CONTRACT\.id/u);
});
