import assert from "node:assert/strict";
import fs from "node:fs";
import test, { after, before } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";
import {
  MULTI_DIGIT_OPERATIONS_DOMAIN,
  buildMultiDigitOperationsModel,
  type MultiDigitOperationsInput,
} from "./MultiDigitOperationsModel";

const reactGlobal = globalThis as unknown as { React?: typeof React };
let hadOwnReact = false;
let previousReact: typeof React | undefined;
let AppProviders: (typeof import("../../providers/AppProviders"))["AppProviders"];
let MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS: (typeof import("./MultiDigitOperationsLab"))["MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS"];
let MULTI_DIGIT_OPERATIONS_COPY: (typeof import("./MultiDigitOperationsLab"))["MULTI_DIGIT_OPERATIONS_COPY"];
let MultiDigitOperationsLab: (typeof import("./MultiDigitOperationsLab"))["MultiDigitOperationsLab"];
let isMainlandMultiDigitOperationsLabId: (typeof import("./MultiDigitOperationsLab"))["isMainlandMultiDigitOperationsLabId"];

before(async () => {
  hadOwnReact = Object.prototype.hasOwnProperty.call(reactGlobal, "React");
  previousReact = reactGlobal.React;
  reactGlobal.React = React;

  ({ AppProviders } = await import("../../providers/AppProviders"));
  ({
    MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS,
    MULTI_DIGIT_OPERATIONS_COPY,
    MultiDigitOperationsLab,
    isMainlandMultiDigitOperationsLabId,
  } = await import("./MultiDigitOperationsLab"));
});

after(() => {
  if (hadOwnReact) {
    reactGlobal.React = previousReact;
  } else {
    delete reactGlobal.React;
  }
});

const EXPECTED_LAB_IDS = [
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

function renderLab(
  labId: string,
  initialInput?: MultiDigitOperationsInput,
  initialStrategyStep?: number,
) {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={router as never}>
      <PathnameContext.Provider value="/visualization-lab">
        <AppProviders>
          <MultiDigitOperationsLab
            labId={labId}
            initialInput={initialInput}
            initialStrategyStep={initialStrategyStep}
          />
        </AppProviders>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>,
  );
}

function count(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].length;
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

test("the learner component owns exactly the nine reviewed G01 ids and fails closed elsewhere", () => {
  assert.deepEqual(MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS, EXPECTED_LAB_IDS);
  assert.equal(new Set(MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS).size, 9);
  for (const labId of EXPECTED_LAB_IDS) {
    assert.equal(isMainlandMultiDigitOperationsLabId(labId), true, labId);
  }
  assert.equal(
    isMainlandMultiDigitOperationsLabId("p3-multiplication-division"),
    false,
  );
  assert.equal(
    isMainlandMultiDigitOperationsLabId("bnu-primary-p3-lower-area"),
    false,
  );
  assert.equal(renderLab("not-a-g01-lab"), "");
});

test("all nine ids render one learner root with exact model, topic, state, reset, and local-scroll selectors", () => {
  for (const labId of EXPECTED_LAB_IDS) {
    const markup = renderLab(labId);
    assert.equal(
      count(markup, /data-mainland-multi-digit-operations=/gu),
      1,
      labId,
    );
    assert.match(
      markup,
      new RegExp(`data-viz-topic-id="${labId}"`, "u"),
      labId,
    );
    assert.match(markup, /data-viz-family="multi-digit-operations"/u, labId);
    assert.match(
      markup,
      /data-viz-configured-model="multi-digit-operations-v1"/u,
      labId,
    );
    assert.match(
      markup,
      /data-viz-configured-state="multi-digit-operations-v1\|operation=multiply\|/u,
      labId,
    );
    assert.match(markup, /data-viz-mode="multiply"/u, labId);
    assert.equal(count(markup, /data-viz-mode-button=/gu), 5, labId);
    assert.equal(count(markup, /data-viz-reset-model=/gu), 1, labId);
    assert.match(
      markup,
      /data-viz-reset-module-id="configured-visualization-lab"/u,
      labId,
    );
    assert.match(
      markup,
      new RegExp(`data-viz-reset-topic-id="${labId}"`, "u"),
      labId,
    );
    assert.match(markup, /data-viz-pan-hint=/u, labId);
    assert.match(markup, /data-viz-scroll-container=/u, labId);
    assert.match(markup, /tabindex="0"/u, labId);
    assert.match(markup, /data-viz-surface=/u, labId);
    assert.match(markup, /data-viz-svg-background="opaque"/u, labId);
    assert.match(markup, /data-viz-state-summary=/u, labId);
    assert.match(markup, /data-viz-invariant=/u, labId);
    assert.match(markup, /data-viz-mark=/u, labId);
    assert.doesNotMatch(
      markup,
      /authoring|debug|capture|checkpoint|run-from-beat|quality dock/iu,
      labId,
    );
  }
});

test("every id and every mode SSR the exact model state and its operation-specific visible receipts", () => {
  const states: Array<{
    input: MultiDigitOperationsInput;
    requiredMarks: string[];
  }> = [
    {
      input: { operation: "add", left: 999_999, right: 1 },
      requiredMarks: ["place-value-receipt", "carry-receipt", "exact-result"],
    },
    {
      input: { operation: "subtract", left: 100_000, right: 1 },
      requiredMarks: ["place-value-receipt", "borrow-receipt", "exact-result"],
    },
    {
      input: { operation: "multiply", left: 999_999, right: 999_999 },
      requiredMarks: [
        "place-value-receipt",
        "partial-product",
        "regroup-receipt",
        "exact-result",
      ],
    },
    {
      input: { operation: "divide", left: 999_999, right: 97 },
      requiredMarks: [
        "place-value-receipt",
        "partial-quotient",
        "remainder-receipt",
        "inverse-reconstruction",
      ],
    },
    {
      input: {
        operation: "estimate-check",
        exactOperation: "multiply",
        left: 999_999,
        right: 999_999,
        roundingPlace: 100_000,
      },
      requiredMarks: [
        "place-value-receipt",
        "partial-product",
        "estimate-receipt",
        "estimate-error",
      ],
    },
  ];

  for (const labId of EXPECTED_LAB_IDS) {
    for (const { input, requiredMarks } of states) {
      const model = buildMultiDigitOperationsModel(input);
      const markup = renderLab(labId, input, 3);
      assert.match(
        markup,
        new RegExp(`data-viz-mode="${input.operation}"`, "u"),
        `${labId}: ${input.operation}`,
      );
      assert.ok(
        markup.includes(`data-viz-configured-state="${model.stateKey}"`),
        `${labId}: ${model.stateKey}`,
      );
      assert.match(markup, /data-viz-active-strategy-step="3"/u, labId);
      for (const mark of requiredMarks) {
        assert.match(
          markup,
          new RegExp(`data-viz-name="${mark}"`, "u"),
          `${labId}: ${input.operation}: ${mark}`,
        );
      }
      assert.equal(
        count(markup, /data-viz-invariant=/gu),
        model.invariantReceipts.length,
        model.stateKey,
      );
      assert.doesNotMatch(markup, /NaN|Infinity/u, model.stateKey);
    }
  }
});

test("zero and maximum operand boundaries stay finite and expose exact slider domains", () => {
  const max = MULTI_DIGIT_OPERATIONS_DOMAIN.maxOperand;
  const boundaryStates: MultiDigitOperationsInput[] = [
    { operation: "add", left: 0, right: 0 },
    { operation: "add", left: max, right: max },
    { operation: "subtract", left: 0, right: 0 },
    { operation: "subtract", left: max, right: 0 },
    { operation: "multiply", left: 0, right: max },
    { operation: "multiply", left: max, right: max },
    { operation: "divide", left: 0, right: max },
    { operation: "divide", left: max, right: 1 },
    {
      operation: "estimate-check",
      exactOperation: "divide",
      left: max,
      right: max,
      roundingPlace: 100_000,
    },
  ];

  for (const labId of EXPECTED_LAB_IDS) {
    for (const input of boundaryStates) {
      const markup = renderLab(labId, input, 0);
      assert.doesNotMatch(
        markup,
        /NaN|Infinity/u,
        `${labId}: ${JSON.stringify(input)}`,
      );
      assert.match(markup, /data-viz-parameter="operand-a"/u);
      assert.match(markup, /data-viz-parameter="operand-b"/u);
      assert.match(markup, /data-viz-parameter="strategy-step"/u);
      assert.match(markup, /max="999999"/u);
      assert.match(markup, /data-viz-active-strategy-step="0"/u);
    }
  }

  const subtract = renderLab(EXPECTED_LAB_IDS[0], {
    operation: "subtract",
    left: 42,
    right: 42,
  });
  assert.match(
    subtract,
    /data-viz-parameter="operand-a"[^>]*data-viz-range-affects="operand-b"/u,
  );
  assert.match(subtract, /data-viz-parameter="operand-b"[^>]*max="42"/u);

  const division = renderLab(EXPECTED_LAB_IDS[0], {
    operation: "divide",
    left: 42,
    right: 1,
  });
  assert.match(division, /data-viz-parameter="operand-b"[^>]*min="1"/u);

  const estimate = renderLab(EXPECTED_LAB_IDS[0], {
    operation: "estimate-check",
    exactOperation: "multiply",
    left: 347,
    right: 26,
    roundingPlace: 10,
  });
  assert.match(estimate, /data-viz-parameter="estimate-operation"/u);
  assert.match(estimate, /data-viz-parameter="rounding-place"/u);
});

test("all learner controls have 44px source contracts and only estimate mode adds its two controls", () => {
  const exactMarkup = renderLab(EXPECTED_LAB_IDS[0], {
    operation: "multiply",
    left: 347,
    right: 26,
  });
  assert.equal(count(exactMarkup, /data-viz-parameter=/gu), 3);
  assert.equal(count(exactMarkup, /data-viz-mode-button=/gu), 5);
  assert.equal(count(exactMarkup, /min-h-11/gu) >= 9, true);

  const estimateMarkup = renderLab(EXPECTED_LAB_IDS[0], {
    operation: "estimate-check",
    exactOperation: "multiply",
    left: 347,
    right: 26,
    roundingPlace: 10,
  });
  assert.equal(count(estimateMarkup, /data-viz-parameter=/gu), 5);
  assert.equal(count(estimateMarkup, /data-viz-mode-button=/gu), 5);
  assert.equal(count(estimateMarkup, /data-viz-reset-model=/gu), 1);
});

test("English, Traditional Chinese, and Simplified Chinese learner labels are complete", () => {
  assertLocalizedCopy(MULTI_DIGIT_OPERATIONS_COPY);
  const markup = renderLab(EXPECTED_LAB_IDS[0]);
  assert.match(markup, />Multi-digit operations</u);
  assert.match(markup, />Operand A</u);
  assert.match(markup, />Partial products</u);
});

test("source has one nine-id allowlist and no authoring, capture, debug, opacity, filter, or gradient UI", () => {
  const source = fs.readFileSync(
    "components/visualizations/mainland/MultiDigitOperationsLab.tsx",
    "utf8",
  );
  for (const labId of EXPECTED_LAB_IDS) {
    assert.equal(count(source, new RegExp(`"${labId}"`, "gu")), 1, labId);
  }
  assert.equal(count(source, /data-viz-mode-button/gu), 1);
  assert.equal(count(source, /data-viz-reset-model/gu), 1);
  assert.match(
    source,
    /const\s+\{\s*language,\s*t,\s*theme\s*\}\s*=\s*useSettings\(\)/u,
  );
  assert.match(source, /overflow-x-auto/u);
  assert.match(source, /min-w-\[760px\]/u);
  assert.doesNotMatch(
    source,
    /authoring|debug|capture|checkpoint|run-from-beat|backdrop-filter|filter:|opacity-|bg-gradient|from-|via-|to-/iu,
  );
});
