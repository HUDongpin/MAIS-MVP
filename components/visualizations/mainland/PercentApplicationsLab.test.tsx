import assert from "node:assert/strict";
import fs from "node:fs";
import test, { after, before } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";

import {
  PERCENT_APPLICATIONS_LAB_IDS,
  buildPercentApplicationsState,
  type PercentApplicationsInput,
  type PercentApplicationsLabId,
  type PercentApplicationsMode,
} from "./PercentApplicationsModel";
import { PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT } from "./PercentApplicationsControlDomain";

const COMPONENT_PATH =
  "components/visualizations/mainland/PercentApplicationsLab.tsx";

const BNU_ID = "bnu-primary-p6-upper-percentage-applications" as const;
const PEP_ID = "pep-primary-p6-upper-percent-fractions" as const;

const EXPECTED_ALLOWLIST = {
  [BNU_ID]: [
    "find-part",
    "find-whole",
    "increase",
    "decrease",
    "discount",
    "inverse",
  ],
  [PEP_ID]: [
    "convert",
    "find-part",
    "find-whole",
    "increase",
    "decrease",
    "discount",
  ],
} as const satisfies Record<
  PercentApplicationsLabId,
  readonly PercentApplicationsMode[]
>;

const reactGlobal = globalThis as unknown as { React?: typeof React };
let hadOwnReact = false;
let previousReact: typeof React | undefined;
let AppProviders: (typeof import("../../providers/AppProviders"))["AppProviders"];
let MAINLAND_PERCENT_APPLICATIONS_LAB_IDS: (typeof import("./PercentApplicationsLab"))["MAINLAND_PERCENT_APPLICATIONS_LAB_IDS"];
let PERCENT_APPLICATIONS_COPY: (typeof import("./PercentApplicationsLab"))["PERCENT_APPLICATIONS_COPY"];
let PERCENT_APPLICATIONS_MODE_ALLOWLIST: (typeof import("./PercentApplicationsLab"))["PERCENT_APPLICATIONS_MODE_ALLOWLIST"];
let PercentApplicationsLab: (typeof import("./PercentApplicationsLab"))["PercentApplicationsLab"];
let createPercentApplicationsLabUiState: (typeof import("./PercentApplicationsLab"))["createPercentApplicationsLabUiState"];
let isMainlandPercentApplicationsLabId: (typeof import("./PercentApplicationsLab"))["isMainlandPercentApplicationsLabId"];
let reducePercentApplicationsLabUiState: (typeof import("./PercentApplicationsLab"))["reducePercentApplicationsLabUiState"];
let resetPercentApplicationsLabInput: (typeof import("./PercentApplicationsLab"))["resetPercentApplicationsLabInput"];

before(async () => {
  hadOwnReact = Object.prototype.hasOwnProperty.call(reactGlobal, "React");
  previousReact = reactGlobal.React;
  reactGlobal.React = React;
  ({ AppProviders } = await import("../../providers/AppProviders"));
  ({
    MAINLAND_PERCENT_APPLICATIONS_LAB_IDS,
    PERCENT_APPLICATIONS_COPY,
    PERCENT_APPLICATIONS_MODE_ALLOWLIST,
    PercentApplicationsLab,
    createPercentApplicationsLabUiState,
    isMainlandPercentApplicationsLabId,
    reducePercentApplicationsLabUiState,
    resetPercentApplicationsLabInput,
  } = await import("./PercentApplicationsLab"));
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

function renderLab(labId: string, initialInput?: PercentApplicationsInput) {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={router as never}>
      <PathnameContext.Provider value="/visualization-lab">
        <AppProviders>
          <PercentApplicationsLab labId={labId} initialInput={initialInput} />
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

function inputForMode(
  labId: PercentApplicationsLabId,
  mode: PercentApplicationsMode,
): PercentApplicationsInput {
  return {
    amount: 36,
    base: 240,
    inverseDirection: "increase",
    labId,
    mode,
    newValue: 120,
    rateBasisPoints: 1_500,
  };
}

test("owns exactly the two frozen G05 IDs and fails closed elsewhere", () => {
  assert.deepEqual(MAINLAND_PERCENT_APPLICATIONS_LAB_IDS, PERCENT_APPLICATIONS_LAB_IDS);
  assert.equal(new Set(MAINLAND_PERCENT_APPLICATIONS_LAB_IDS).size, 2);
  assert.equal(isMainlandPercentApplicationsLabId(BNU_ID), true);
  assert.equal(isMainlandPercentApplicationsLabId(PEP_ID), true);
  assert.equal(isMainlandPercentApplicationsLabId("array-area"), false);
  assert.equal(renderLab("not-a-g05-lab"), "");
});

test("each topic renders only its reviewed mode allowlist", () => {
  assert.deepEqual(PERCENT_APPLICATIONS_MODE_ALLOWLIST, EXPECTED_ALLOWLIST);
  for (const labId of PERCENT_APPLICATIONS_LAB_IDS) {
    const markup = renderLab(labId);
    assert.equal(
      count(markup, /data-viz-mode-button="true"/gu),
      EXPECTED_ALLOWLIST[labId].length,
      labId,
    );
    for (const mode of EXPECTED_ALLOWLIST[labId]) {
      assert.match(
        markup,
        new RegExp(
          `data-viz-mode-button="true"[^>]*data-viz-mode="${mode}"`,
          "u",
        ),
      );
    }
  }
  assert.doesNotMatch(renderLab(BNU_ID), /data-viz-mode="convert"/u);
  assert.doesNotMatch(renderLab(PEP_ID), /data-viz-mode="inverse"/u);
});

test("topic resets are deterministic, domain-valid, model-valid, and topic-specific", () => {
  const bnu = resetPercentApplicationsLabInput(BNU_ID);
  const pep = resetPercentApplicationsLabInput(PEP_ID);
  assert.equal(bnu.mode, "find-part");
  assert.equal(pep.mode, "convert");
  assert.notDeepEqual(bnu, pep);
  for (const input of [bnu, pep]) {
    assert(Object.isFrozen(input));
    assert(PERCENT_APPLICATIONS_MODE_ALLOWLIST[input.labId].includes(input.mode as never));
    assert.doesNotThrow(() => buildPercentApplicationsState(input));
    const uiState = createPercentApplicationsLabUiState(input.labId, input);
    assert.equal(uiState.receipt.matchesExpected, true);
    assert.deepEqual(uiState.receipt.expected, uiState.receipt.observed);
  }
});

test("one atomic transition receipt records requested, projected, expected, and observed state", () => {
  const initial = createPercentApplicationsLabUiState(BNU_ID, {
    ...inputForMode(BNU_ID, "increase"),
    rateBasisPoints: 50_000,
  });
  const narrowed = reducePercentApplicationsLabUiState(initial, {
    controllerId: "mode",
    kind: "controller",
    value: "discount",
  });
  assert.equal(narrowed.lastRejection, null);
  assert.equal(narrowed.domainState.mode, "discount");
  assert.equal(narrowed.receipt.requested.rateBasisPoints, 50_000);
  assert.equal(narrowed.receipt.expected.rateBasisPoints, 10_000);
  assert.equal(narrowed.receipt.observed.rateBasisPoints, 10_000);
  assert.equal(narrowed.receipt.matchesExpected, true);
  assert.deepEqual(narrowed.receipt.projections.map(({ reason }) => reason), [
    "discount-rate-cannot-exceed-100-percent",
  ]);
  assert(Object.isFrozen(narrowed));
  assert(Object.isFrozen(narrowed.receipt));
});

test("rejected direct requests preserve the last observed state and expose the rejection", () => {
  const initial = createPercentApplicationsLabUiState(BNU_ID, inputForMode(BNU_ID, "discount"));
  const rejected = reducePercentApplicationsLabUiState(initial, {
    controlId: "rate-basis-points",
    kind: "control",
    value: 10_001,
  });
  assert.equal(rejected.lastRejection, "DIRECT_CONTROL_OUT_OF_RANGE");
  assert.deepEqual(rejected.domainState, initial.domainState);
  assert.deepEqual(rejected.receipt, initial.receipt);

  const forbiddenMode = reducePercentApplicationsLabUiState(initial, {
    controllerId: "mode",
    kind: "controller",
    value: "convert",
  });
  assert.equal(forbiddenMode.lastRejection, "MODE_NOT_ALLOWED");
  assert.deepEqual(forbiddenMode.domainState, initial.domainState);
});

test("default roots expose stable model, state, domain, receipt, reset, and local-scroll selectors", () => {
  for (const labId of PERCENT_APPLICATIONS_LAB_IDS) {
    const markup = renderLab(labId);
    assert.match(markup, new RegExp(`data-viz-topic-id="${labId}"`, "u"));
    assert.match(markup, /data-viz-configured-model="percent-applications-v1"/u);
    assert.match(markup, /data-viz-configured-state="[^"]+"/u);
    assert.match(markup, /data-viz-range-domain-id="percent-applications-rate-v1"/u);
    assert.match(markup, /data-viz-domain-requested="[^"]+"/u);
    assert.match(markup, /data-viz-domain-expected="[^"]+"/u);
    assert.match(markup, /data-viz-domain-observed="[^"]+"/u);
    assert.match(markup, /data-viz-domain-match="true"/u);
    assert.match(markup, /data-viz-domain-projection-count="0"/u);
    assert.match(markup, /data-viz-reset-model="true"/u);
    assert.match(markup, /data-viz-reset-module-id="configured-visualization-lab"/u);
    assert.match(markup, new RegExp(`data-viz-reset-topic-id="${labId}"`, "u"));
    assert.match(markup, /data-viz-local-scroll="horizontal"/u);
    assert.match(markup, /data-viz-pan-hint="true"/u);
  }
});

test("every allowed mode binds one discriminated visible equation and its true SVG", () => {
  const receiptKind = {
    convert: "conversion",
    decrease: "percent-change",
    discount: "discount",
    increase: "percent-change",
    inverse: "inverse",
    "find-part": "find-part",
    "find-whole": "find-whole",
  } as const;
  for (const labId of PERCENT_APPLICATIONS_LAB_IDS) {
    for (const mode of EXPECTED_ALLOWLIST[labId]) {
      const input = inputForMode(labId, mode);
      const markup = renderLab(labId, input);
      assert.match(
        markup,
        new RegExp(`data-viz-visible-receipt="${receiptKind[mode]}"`, "u"),
        `${labId}:${mode}`,
      );
      assert.equal(count(markup, /data-viz-visible-equation="true"/gu), 1);
      assert.equal(count(markup, /data-viz-percent-visual=/gu), 1);
      assert.match(markup, /data-viz-painted-mark-count="[1-9]\d*"/u);
    }
  }
});

test("conversion equation visibly binds fraction, exact decimal, and percent from one receipt", () => {
  const markup = renderLab(PEP_ID, {
    ...inputForMode(PEP_ID, "convert"),
    rateBasisPoints: 1_250,
  });
  assert.match(
    markup,
    /data-viz-visible-equation="true"[\s\S]*?1\/8 = 0\.125 = 12\.5%[\s\S]*?<\/article>/u,
  );
});

test("all learner controls have 44px contracts and dynamic rate bounds", () => {
  const discount = renderLab(BNU_ID, inputForMode(BNU_ID, "discount"));
  assert.match(
    discount,
    /data-viz-parameter="rate-basis-points"[^>]*min="0"[^>]*max="10000"[^>]*class="[^"]*min-h-11/u,
  );
  for (const selector of [
    "data-viz-mode-button",
    "data-viz-parameter",
    "data-viz-reset-model",
  ]) {
    const matches = [
      ...discount.matchAll(new RegExp(`${selector}="[^"]+"[^>]*class="([^"]+)"`, "gu")),
    ];
    assert.ok(matches.length > 0, selector);
    for (const match of matches) assert.match(match[1]!, /min-h-11/u, selector);
  }
  const inverse = renderLab(BNU_ID, inputForMode(BNU_ID, "inverse"));
  assert.match(inverse, /data-viz-direction-button="true"[^>]*class="[^"]*min-h-11/u);
});

test("learner copy is complete in en, zh, zhHans and hides raw implementation IDs", () => {
  assertLocalizedCopy(PERCENT_APPLICATIONS_COPY);
  for (const labId of PERCENT_APPLICATIONS_LAB_IDS) {
    const text = visibleText(renderLab(labId));
    assert.doesNotMatch(
      text,
      /percent-applications-v1|percent-applications-rate-v1|fraction-decimal-percent-sync|discount-base-consistency/u,
    );
  }
});

test("the component consumes only frozen G05 model/domain plus the true visual surface and has one UI state", () => {
  const source = fs.readFileSync(COMPONENT_PATH, "utf8");
  assert.match(source, /from "\.\/PercentApplicationsModel"/u);
  assert.match(source, /from "\.\/PercentApplicationsControlDomain"/u);
  assert.match(source, /from "\.\/PercentApplicationsVisualModel"/u);
  assert.doesNotMatch(source, /ConfiguredVisualizationLab|visualizationLabs|array-area|generic/u);
  assert.equal(count(source, /useState</gu), 1);
  assert.equal(count(source, /data-viz-svg-background/gu), 0);
  assert.equal(PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT.id, "percent-applications-rate-v1");
  assert.match(source, /PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT\.id/u);
});
