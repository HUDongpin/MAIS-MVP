import assert from "node:assert/strict";
import fs from "node:fs";
import test, { after, before } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";
import {
  FRACTION_OPERATIONS_MODE_ALLOWLIST,
  FRACTION_OPERATIONS_MODEL_CONTRACT,
  FRACTION_OPERATIONS_RESET_INPUTS,
  buildFractionOperationsModel,
  type FractionArithmeticOperation,
  type FractionOperationsInput,
  type FractionOperationsLabId,
  type FractionOperationsMode,
} from "./FractionOperationsModel";
import {
  FRACTION_OPERATIONS_ACTION_RECEIPT_CONTRACT,
  FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
  FractionOperationsDivisorDomainError,
  type FractionOperationsDomainState,
} from "./FractionOperationsControlDomain";

const COMPONENT_PATH =
  "components/visualizations/mainland/FractionOperationsLab.tsx";

const EXPECTED_LAB_IDS = [
  "bnu-primary-p5-lower-fraction-add-sub",
  "bnu-primary-p5-lower-fraction-division",
  "bnu-primary-p5-lower-fraction-multiplication",
  "hjb-primary-p5-lower-fractions-equivalence-operations",
  "pep-primary-p5-lower-factors-fractions",
] as const;

const EXPECTED_MODE_ALLOWLIST = {
  "bnu-primary-p5-lower-fraction-add-sub": [
    "add",
    "subtract",
    "simplify",
    "estimate",
  ],
  "bnu-primary-p5-lower-fraction-division": [
    "divide",
    "simplify",
    "estimate",
  ],
  "bnu-primary-p5-lower-fraction-multiplication": [
    "multiply",
    "simplify",
    "estimate",
  ],
  "hjb-primary-p5-lower-fractions-equivalence-operations": [
    "equivalence",
    "compare",
    "add",
    "subtract",
    "simplify",
    "estimate",
  ],
  "pep-primary-p5-lower-factors-fractions": [
    "equivalence",
    "compare",
    "add",
    "subtract",
    "multiply",
    "divide",
    "simplify",
    "estimate",
  ],
} as const satisfies Record<
  FractionOperationsLabId,
  readonly FractionOperationsMode[]
>;

const reactGlobal = globalThis as unknown as { React?: typeof React };
let hadOwnReact = false;
let previousReact: typeof React | undefined;
let AppProviders: (typeof import("../../providers/AppProviders"))["AppProviders"];
let FRACTION_OPERATIONS_COPY: (typeof import("./FractionOperationsLab"))["FRACTION_OPERATIONS_COPY"];
let MAINLAND_FRACTION_OPERATIONS_LAB_IDS: (typeof import("./FractionOperationsLab"))["MAINLAND_FRACTION_OPERATIONS_LAB_IDS"];
let FractionOperationsLab: (typeof import("./FractionOperationsLab"))["FractionOperationsLab"];
let isMainlandFractionOperationsLabId: (typeof import("./FractionOperationsLab"))["isMainlandFractionOperationsLabId"];
let executeFractionOperationsLabTransition: (typeof import("./FractionOperationsLab"))["executeFractionOperationsLabTransition"];
let createFractionOperationsLabUiState: (typeof import("./FractionOperationsLab"))["createFractionOperationsLabUiState"];
let reduceFractionOperationsLabUiState: (typeof import("./FractionOperationsLab"))["reduceFractionOperationsLabUiState"];

before(async () => {
  hadOwnReact = Object.prototype.hasOwnProperty.call(reactGlobal, "React");
  previousReact = reactGlobal.React;
  reactGlobal.React = React;

  ({ AppProviders } = await import("../../providers/AppProviders"));
  const labExports = await import("./FractionOperationsLab");
  ({
    FRACTION_OPERATIONS_COPY,
    MAINLAND_FRACTION_OPERATIONS_LAB_IDS,
    FractionOperationsLab,
    createFractionOperationsLabUiState,
    executeFractionOperationsLabTransition,
    isMainlandFractionOperationsLabId,
    reduceFractionOperationsLabUiState,
  } = labExports);
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

function renderLab(labId: string, initialInput?: FractionOperationsInput) {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={router as never}>
      <PathnameContext.Provider value="/visualization-lab">
        <AppProviders>
          <FractionOperationsLab labId={labId} initialInput={initialInput} />
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

function estimateOperationForLab(
  labId: FractionOperationsLabId,
): FractionArithmeticOperation {
  const allowed = FRACTION_OPERATIONS_MODE_ALLOWLIST[labId];
  if (allowed.includes("add" as never)) return "add";
  if (allowed.includes("multiply" as never)) return "multiply";
  return "divide";
}

function inputForMode(
  labId: FractionOperationsLabId,
  mode: FractionOperationsMode,
): FractionOperationsInput {
  return {
    labId,
    left: { numerator: 7, denominator: 4 },
    mode,
    right: { numerator: 5, denominator: 6 },
    ...(mode === "estimate"
      ? { estimateOperation: estimateOperationForLab(labId) }
      : {}),
  };
}

function assertMark(markup: string, name: string, context?: string) {
  assert.match(
    markup,
    new RegExp(`data-viz-name="${name}"`, "u"),
    context ?? name,
  );
}

function stateSummary(markup: string): string {
  const match = markup.match(
    /<div[^>]*data-viz-state-summary="true"[^>]*>([\s\S]*?)<\/div>/u,
  );
  assert.ok(match, "state summary must exist");
  return match[1]!;
}

function visibleText(markup: string): string {
  return markup
    .replace(/<[^>]*>/gu, " ")
    .replace(/&gt;/gu, ">")
    .replace(/&lt;/gu, "<")
    .replace(/&amp;/gu, "&");
}

test("owns exactly the five reviewed G04 ids and fails closed elsewhere", () => {
  assert.deepEqual(MAINLAND_FRACTION_OPERATIONS_LAB_IDS, EXPECTED_LAB_IDS);
  assert.equal(new Set(MAINLAND_FRACTION_OPERATIONS_LAB_IDS).size, 5);
  for (const labId of EXPECTED_LAB_IDS) {
    assert.equal(isMainlandFractionOperationsLabId(labId), true, labId);
  }
  assert.equal(isMainlandFractionOperationsLabId("fraction-bar"), false);
  assert.equal(renderLab("not-a-g04-lab"), "");
});

test("each topic renders only its reviewed mode allowlist", () => {
  assert.deepEqual(FRACTION_OPERATIONS_MODE_ALLOWLIST, EXPECTED_MODE_ALLOWLIST);
  for (const labId of EXPECTED_LAB_IDS) {
    const markup = renderLab(labId);
    const allowed = EXPECTED_MODE_ALLOWLIST[labId];
    assert.equal(count(markup, /data-viz-mode-button=/gu), allowed.length, labId);
    for (const mode of allowed) {
      assert.match(
        markup,
        new RegExp(
          `data-viz-mode-button="true"[^>]*data-viz-mode="${mode}"`,
          "u",
        ),
        `${labId}: ${mode}`,
      );
    }
  }
});

test("all five reset states expose stable model, state, mode, parameter, reset, and local-scroll selectors", () => {
  for (const labId of EXPECTED_LAB_IDS) {
    const model = buildFractionOperationsModel(
      FRACTION_OPERATIONS_RESET_INPUTS[labId],
    );
    const markup = renderLab(labId);
    assert.equal(count(markup, /data-mainland-fraction-operations=/gu), 1);
    assert.match(
      markup,
      new RegExp(`data-viz-topic-id="${labId}"`, "u"),
      labId,
    );
    assert.match(markup, /data-viz-family="fraction-operations-v2"/u);
    assert.match(markup, /data-viz-model="fraction-operations-v2"/u);
    assert.match(
      markup,
      /data-viz-configured-model="fraction-operations-v2"/u,
    );
    assert.ok(
      markup.includes(`data-viz-configured-state="${model.stateKey}"`),
      `${labId}: configured state`,
    );
    assert.ok(
      markup.includes(`data-viz-state="${model.stateKey}"`),
      `${labId}: state`,
    );
    assert.match(markup, new RegExp(`data-viz-mode="${model.mode}"`, "u"));
    for (const parameter of [
      "left-numerator",
      "left-denominator",
      "right-numerator",
      "right-denominator",
    ]) {
      assert.match(
        markup,
        new RegExp(`data-viz-parameter="${parameter}"`, "u"),
        `${labId}: ${parameter}`,
      );
    }
    assert.equal(count(markup, /data-viz-reset-model=/gu), 1, labId);
    assert.match(
      markup,
      /data-viz-reset-module-id="configured-visualization-lab"/u,
    );
    assert.match(
      markup,
      new RegExp(`data-viz-reset-topic-id="${labId}"`, "u"),
    );
    assert.match(markup, /data-viz-pan-hint=/u);
    assert.match(markup, /data-viz-scroll-container=/u);
    assert.match(markup, /tabindex="0"/u);
    assert.match(markup, /data-viz-surface=/u);
    assert.doesNotMatch(markup, /<div[^>]*data-viz-svg-background=/u);
    assert.match(markup, /data-viz-state-summary=/u);
  }
});

test("the learner host commits the exact divisor-domain expected state atomically with no zero resurrection", () => {
  const initial: FractionOperationsDomainState = {
    mode: "add",
    evaluatedOperation: "add",
    leftNumerator: 3,
    leftDenominator: 4,
    rightNumerator: 0,
    rightDenominator: 5,
  };
  const enteredDivide = executeFractionOperationsLabTransition(initial, {
    kind: "controller",
    mode: "divide",
    evaluatedOperation: "divide",
  });
  assert.equal(enteredDivide.receipt.domainId, FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID);
  assert.equal(enteredDivide.receipt.requested.rightNumerator, 0);
  assert.equal(enteredDivide.receipt.expected.rightNumerator, 1);
  assert.equal(enteredDivide.receipt.observed.rightNumerator, 1);
  assert.equal(enteredDivide.receipt.matchesExpected, true);
  assert.equal(enteredDivide.state.rightNumerator, 1);
  assert.deepEqual(enteredDivide.receipt.projections.map(({ reason }) => reason), [
    "division-divisor-cannot-be-zero",
  ]);

  const leftDivide = executeFractionOperationsLabTransition(
    enteredDivide.state,
    { kind: "controller", mode: "add", evaluatedOperation: "add" },
  );
  const reenteredDivide = executeFractionOperationsLabTransition(
    leftDivide.state,
    { kind: "controller", mode: "divide", evaluatedOperation: "divide" },
  );
  assert.equal(leftDivide.state.rightNumerator, 1);
  assert.equal(reenteredDivide.state.rightNumerator, 1);
  assert.deepEqual(reenteredDivide.receipt.projections, []);

  assert.throws(
    () => executeFractionOperationsLabTransition(reenteredDivide.state, {
      kind: "control",
      controlId: "right-numerator",
      value: 0,
    }),
    (error: unknown) => {
      assert.ok(error instanceof FractionOperationsDivisorDomainError);
      assert.equal(error.code, "DIRECT_DIVISOR_ZERO_REQUEST");
      return true;
    },
  );

  const markup = renderLab("pep-primary-p5-lower-factors-fractions");
  assert.match(
    markup,
    /data-viz-range-domain-id="fraction-operations-divisor-nonzero-v1"/u,
  );
  assert.match(markup, /data-viz-domain-requested="[^"]+"/u);
  assert.match(markup, /data-viz-domain-expected="[^"]+"/u);
  assert.match(markup, /data-viz-domain-observed="[^"]+"/u);
  assert.match(markup, /data-viz-domain-match="true"/u);
});

test("the learner reducer replaces the prior receipt with a fresh exact rejected-action receipt", () => {
  assert.equal(FRACTION_OPERATIONS_ACTION_RECEIPT_CONTRACT.id, "fraction-operations-action-receipt-v1");
  assert.equal(typeof createFractionOperationsLabUiState, "function");
  assert.equal(typeof reduceFractionOperationsLabUiState, "function");
  const initialInput: FractionOperationsInput = {
    labId: "pep-primary-p5-lower-factors-fractions",
    left: { denominator: 4, numerator: 3 },
    mode: "add",
    right: { denominator: 5, numerator: 0 },
  };
  const initial = createFractionOperationsLabUiState(initialInput);
  assert.equal(initial.actionReceipt.status, "accepted");
  assert.equal(initial.actionReceipt.request.kind, "initial");
  assert.strictEqual(initial.receipt, initial.actionReceipt);

  const enteredDivide = reduceFractionOperationsLabUiState(initial, {
    evaluatedOperation: "divide",
    kind: "controller",
    mode: "divide",
  });
  assert.equal(enteredDivide.actionReceipt.accepted, true);
  assert.equal(enteredDivide.actionReceipt.status, "accepted");
  assert.equal(
    enteredDivide.actionReceipt.requestedValidity,
    "requires-projection",
  );
  assert.equal(enteredDivide.actionReceipt.requested.rightNumerator, 0);
  assert.equal(enteredDivide.actionReceipt.expected.rightNumerator, 1);
  assert.equal(enteredDivide.actionReceipt.observed.rightNumerator, 1);
  assert.strictEqual(enteredDivide.receipt, enteredDivide.actionReceipt);

  const rejectedRequest = {
    controlId: "right-numerator",
    kind: "control",
    value: 0,
  } as const;
  const rejected = reduceFractionOperationsLabUiState(
    enteredDivide,
    rejectedRequest,
  );
  assert.notStrictEqual(rejected.actionReceipt, enteredDivide.actionReceipt);
  assert.notStrictEqual(rejected.receipt, enteredDivide.receipt);
  assert.strictEqual(rejected.receipt, rejected.actionReceipt);
  assert.deepEqual(rejected.domainState, enteredDivide.domainState);
  assert.deepEqual(rejected.actionReceipt, {
    accepted: false,
    before: enteredDivide.domainState,
    domainId: "fraction-operations-divisor-nonzero-v1",
    domainVersion: 1,
    expected: enteredDivide.domainState,
    matchesExpected: true,
    observed: enteredDivide.domainState,
    projections: [],
    rejection: "DIRECT_DIVISOR_ZERO_REQUEST",
    request: rejectedRequest,
    requested: { ...enteredDivide.domainState, rightNumerator: 0 },
    requestedValidity: "rejected-invalid",
    status: "rejected",
    version: "fraction-operations-action-receipt-v1",
  });
  assert.equal(rejected.lastRejection, "DIRECT_DIVISOR_ZERO_REQUEST");

  const markup = renderLab("pep-primary-p5-lower-factors-fractions");
  assert.match(
    markup,
    /data-viz-action-receipt-version="fraction-operations-action-receipt-v1"/u,
  );
  assert.match(markup, /data-viz-action-accepted="true"/u);
  assert.match(markup, /data-viz-action-status="accepted"/u);
  assert.match(markup, /data-viz-action-requested-validity="accepted-as-requested"/u);
  assert.match(markup, /data-viz-action-receipt="[^"\s]+"/u);
});

test("every allowed topic and mode visibly binds the shared exact fraction receipts", () => {
  const sharedMarks = [
    "left-exact-fraction",
    "right-exact-fraction",
    "left-mixed-number",
    "right-mixed-number",
    "common-denominator-receipt",
    "equivalent-fraction-receipt",
    "operand-simplification-receipt",
    "cross-product-receipt",
    "operation-receipt",
    "exact-result",
    "result-mixed-number",
    "equation-check",
  ];
  for (const labId of EXPECTED_LAB_IDS) {
    for (const mode of EXPECTED_MODE_ALLOWLIST[labId]) {
      const input = inputForMode(labId, mode);
      const model = buildFractionOperationsModel(input);
      const markup = renderLab(labId, input);
      assert.ok(markup.includes(model.stateKey), model.stateKey);
      assert.match(
        markup,
        new RegExp(`data-viz-mode="${mode}"`, "u"),
        model.stateKey,
      );
      for (const mark of sharedMarks) assertMark(markup, mark, model.stateKey);
      assert.equal(
        count(markup, /data-viz-invariant=/gu),
        model.invariantReceipts.length,
        model.stateKey,
      );
      assert.doesNotMatch(markup, /NaN|Infinity/u, model.stateKey);
    }
  }
});

test("equivalence, comparison, addition, subtraction, and simplification show exact pedagogy receipts", () => {
  const labId = "pep-primary-p5-lower-factors-fractions";
  const cases: Array<{
    input: FractionOperationsInput;
    marks: string[];
  }> = [
    {
      input: {
        labId,
        left: { numerator: 6, denominator: 4 },
        mode: "equivalence",
        right: { numerator: 9, denominator: 6 },
      },
      marks: ["equivalence-operation-receipt"],
    },
    {
      input: {
        labId,
        left: { numerator: 7, denominator: 4 },
        mode: "compare",
        right: { numerator: 5, denominator: 6 },
      },
      marks: ["comparison-operation-receipt"],
    },
    {
      input: {
        labId,
        left: { numerator: 7, denominator: 4 },
        mode: "add",
        right: { numerator: 5, denominator: 6 },
      },
      marks: ["addition-receipt", "common-denominator-operation-receipt"],
    },
    {
      input: {
        labId,
        left: { numerator: 7, denominator: 4 },
        mode: "subtract",
        right: { numerator: 5, denominator: 6 },
      },
      marks: ["subtraction-receipt", "common-denominator-operation-receipt"],
    },
    {
      input: {
        labId,
        left: { numerator: 12, denominator: 8 },
        mode: "simplify",
        right: { numerator: 15, denominator: 10 },
      },
      marks: ["simplification-operation-receipt"],
    },
  ];

  for (const { input, marks } of cases) {
    const markup = renderLab(labId, input);
    for (const mark of marks) assertMark(markup, mark, input.mode);
  }

  const addMarkup = renderLab(labId, cases[2]!.input);
  assert.match(addMarkup, /data-viz-exact="7\/4"/u);
  assert.match(addMarkup, /data-viz-exact="5\/6"/u);
  assert.match(addMarkup, /data-viz-mixed="1 3\/4"/u);
  assert.match(addMarkup, /data-viz-lcd="12"/u);
  assert.match(addMarkup, /data-viz-left-converted="21\/12"/u);
  assert.match(addMarkup, /data-viz-right-converted="10\/12"/u);
  assert.match(addMarkup, /data-viz-denominator-gcf="2"/u);
  assert.match(addMarkup, /data-viz-left-cross-product="42"/u);
  assert.match(addMarkup, /data-viz-right-cross-product="20"/u);
  assert.match(addMarkup, /data-viz-unsimplified-result="31\/12"/u);
  assert.match(addMarkup, /data-viz-exact-result="31\/12"/u);
  assert.match(addMarkup, /data-viz-mixed="2 7\/12"/u);

  const simplifyMarkup = renderLab(labId, cases[4]!.input);
  assert.match(simplifyMarkup, /data-viz-source="12\/8"/u);
  assert.match(simplifyMarkup, /data-viz-gcf="4"/u);
  assert.match(simplifyMarkup, /data-viz-exact-result="3\/2"/u);
  assert.match(simplifyMarkup, /data-viz-mixed="1 1\/2"/u);
});

test("every mode renders a discriminated visibleReceipt math surface instead of a generic false equation", () => {
  const labId = "pep-primary-p5-lower-factors-fractions";
  for (const mode of EXPECTED_MODE_ALLOWLIST[labId]) {
    const input = inputForMode(labId, mode);
    const markup = renderLab(labId, input);
    const model = buildFractionOperationsModel(input);
    assert.match(
      markup,
      new RegExp(`data-viz-visible-receipt="${model.visibleReceipt.kind}"`, "u"),
      `${mode}: visible receipt kind`,
    );
    assert.ok(
      count(markup, /data-viz-math-mark=/gu) >= 3,
      `${mode}: executable HTML math marks`,
    );
  }

  const equivalence = renderLab(labId, {
    labId,
    left: { numerator: 6, denominator: 4 },
    mode: "equivalence",
    right: { numerator: 47, denominator: 23 },
  });
  assert.match(
    equivalence,
    /data-viz-visible-receipt="equivalence"[^>]*data-viz-visible-source="6\/4"[^>]*data-viz-visible-expanded="12\/8"/u,
  );
  assert.doesNotMatch(
    equivalence,
    /data-viz-visible-receipt="equivalence"[^>]*data-viz-visible-right=/u,
  );

  const comparison = renderLab(labId, {
    labId,
    left: { numerator: 7, denominator: 4 },
    mode: "compare",
    right: { numerator: 5, denominator: 6 },
  });
  assert.match(
    comparison,
    /data-viz-visible-receipt="comparison"[^>]*data-viz-visible-relation="&gt;"[^>]*data-viz-visible-gap="11\/12"/u,
  );

  const simplify = renderLab(labId, {
    labId,
    left: { numerator: 12, denominator: 8 },
    mode: "simplify",
    right: { numerator: 15, denominator: 10 },
  });
  assert.match(simplify, /data-viz-numerator-division="12÷4=3"/u);
  assert.match(simplify, /data-viz-denominator-division="8÷4=2"/u);
  assert.doesNotMatch(simplify, /÷\s*4\/4/u);
});

test("state summaries and operand simplification never reintroduce generic false equations", () => {
  const labId = "pep-primary-p5-lower-factors-fractions";
  const equivalence = renderLab(labId, {
    labId,
    left: { numerator: 6, denominator: 4 },
    mode: "equivalence",
    right: { numerator: 47, denominator: 23 },
  });
  assert.match(stateSummary(equivalence), /6\/4 × 2\/2 = 12\/8 ≡ 3\/2/u);
  assert.doesNotMatch(stateSummary(equivalence), /47\/23/u);

  const comparison = renderLab(labId, {
    labId,
    left: { numerator: 7, denominator: 4 },
    mode: "compare",
    right: { numerator: 5, denominator: 6 },
  });
  assert.match(stateSummary(comparison), /7\/4 &gt; 5\/6/u);
  assert.match(stateSummary(comparison), /Signed gap[^<]*11\/12/u);
  assert.doesNotMatch(stateSummary(comparison), /= 11\/12/u);

  const simplify = renderLab(labId, {
    labId,
    left: { numerator: 12, denominator: 8 },
    mode: "simplify",
    right: { numerator: 15, denominator: 10 },
  });
  assert.match(stateSummary(simplify), /12 ÷ 4 = 3/u);
  assert.match(stateSummary(simplify), /8 ÷ 4 = 2/u);
  assert.doesNotMatch(stateSummary(simplify), /15\/10/u);
  assert.doesNotMatch(simplify, />12\/8 ÷ 4 = 3\/2</u);
  assert.match(simplify, /\(12 ÷ 4\) \/ \(8 ÷ 4\) = 3\/2/u);
});

test("multiplication and division expose all required operation interpretations", () => {
  const labId = "pep-primary-p5-lower-factors-fractions";
  const multiply: FractionOperationsInput = {
    labId,
    left: { numerator: 3, denominator: 4 },
    mode: "multiply",
    right: { numerator: 2, denominator: 3 },
  };
  const multiplyMarkup = renderLab(labId, multiply);
  for (const mark of [
    "multiplication-receipt",
    "multiplication-area-interpretation",
    "multiplication-repeated-group-interpretation",
    "multiplication-scaling-interpretation",
  ]) {
    assertMark(multiplyMarkup, mark);
  }
  assert.match(multiplyMarkup, /data-viz-cells-per-unit="12"/u);
  assert.match(multiplyMarkup, /data-viz-overlap-cells="6"/u);
  assert.match(multiplyMarkup, /data-viz-group-count="3"/u);
  assert.match(multiplyMarkup, /data-viz-group-value="1\/6"/u);
  assert.match(multiplyMarkup, /data-viz-scale-direction="reduce"/u);
  assert.match(multiplyMarkup, /data-viz-exact-result="1\/2"/u);
  assert.equal(count(multiplyMarkup, /<svg[^>]*data-viz-fraction-visual=/gu), 3);
  assert.equal(count(multiplyMarkup, /data-viz-svg-background="opaque"/gu), 3);
  assert.match(multiplyMarkup, /data-viz-painted-mark-count="12"/u);

  const divide: FractionOperationsInput = {
    labId,
    left: { numerator: 3, denominator: 4 },
    mode: "divide",
    right: { numerator: 2, denominator: 3 },
  };
  const divideMarkup = renderLab(labId, divide);
  for (const mark of [
    "division-receipt",
    "division-reciprocal-interpretation",
    "division-measurement-interpretation",
    "division-sharing-interpretation",
  ]) {
    assertMark(divideMarkup, mark);
  }
  assert.match(divideMarkup, /data-viz-reciprocal="3\/2"/u);
  assert.match(divideMarkup, /data-viz-number-of-groups="9\/8"/u);
  assert.match(
    divideMarkup,
    /data-viz-name="division-sharing-interpretation"[^>]*data-viz-interpretation-status="unsupported"[^>]*data-viz-unsupported-reason="sharing-requires-positive-integer-group-count"/u,
  );
  assert.doesNotMatch(divideMarkup, /data-viz-share-per-group="9\/8"/u);
  assert.match(divideMarkup, /data-viz-exact-result="9\/8"/u);
  assert.equal(
    count(divideMarkup, /data-viz-fraction-visual="measurement-division"/gu),
    1,
  );
  assert.equal(
    count(divideMarkup, /data-viz-fraction-visual="sharing-division"/gu),
    0,
  );
});

test("unsupported signed, measurement, and sharing interpretations are never presented as valid models", () => {
  const labId = "pep-primary-p5-lower-factors-fractions";
  const signedMultiplication = renderLab(labId, {
    labId,
    left: { numerator: -3, denominator: 4 },
    mode: "multiply",
    right: { numerator: 2, denominator: 3 },
  });
  for (const name of [
    "multiplication-area-interpretation",
    "multiplication-repeated-group-interpretation",
    "multiplication-scaling-interpretation",
  ]) {
    assert.match(
      signedMultiplication,
      new RegExp(
        `data-viz-name="${name}"[^>]*data-viz-interpretation-status="unsupported"[^>]*data-viz-unsupported-reason="signed-operands-require-sign-model"`,
        "u",
      ),
      name,
    );
  }
  assert.equal(count(signedMultiplication, /data-viz-fraction-visual=/gu), 0);

  const fractionalGroups = renderLab(labId, {
    labId,
    left: { numerator: 3, denominator: 4 },
    mode: "divide",
    right: { numerator: 2, denominator: 3 },
  });
  assert.match(
    fractionalGroups,
    /data-viz-name="division-measurement-interpretation"[^>]*data-viz-interpretation-status="supported"/u,
  );
  assert.match(
    fractionalGroups,
    /data-viz-name="division-sharing-interpretation"[^>]*data-viz-interpretation-status="unsupported"[^>]*data-viz-unsupported-reason="sharing-requires-positive-integer-group-count"/u,
  );

  const signedMeasurement = renderLab(labId, {
    labId,
    left: { numerator: -3, denominator: 4 },
    mode: "divide",
    right: { numerator: 2, denominator: 3 },
  });
  assert.match(
    signedMeasurement,
    /data-viz-name="division-measurement-interpretation"[^>]*data-viz-interpretation-status="unsupported"[^>]*data-viz-unsupported-reason="signed-operands-require-sign-model"/u,
  );

  const integerGroups = renderLab(labId, {
    labId,
    left: { numerator: 3, denominator: 4 },
    mode: "divide",
    right: { numerator: 2, denominator: 1 },
  });
  assert.match(
    integerGroups,
    /data-viz-name="division-sharing-interpretation"[^>]*data-viz-interpretation-status="supported"/u,
  );
  assert.match(
    integerGroups,
    /data-viz-fraction-visual="sharing-division"/u,
  );
});

test("estimate shows whole-number error bounds and retains multiply or divide interpretations", () => {
  const labId = "pep-primary-p5-lower-factors-fractions";
  const addEstimate: FractionOperationsInput = {
    estimateOperation: "add",
    labId,
    left: { numerator: 7, denominator: 4 },
    mode: "estimate",
    right: { numerator: 5, denominator: 6 },
  };
  const addMarkup = renderLab(labId, addEstimate);
  assertMark(addMarkup, "estimate-receipt");
  assertMark(addMarkup, "addition-receipt");
  assert.match(addMarkup, /data-viz-lower-whole="2"/u);
  assert.match(addMarkup, /data-viz-upper-whole="3"/u);
  assert.match(addMarkup, /data-viz-estimated-whole="3"/u);
  assert.match(addMarkup, /data-viz-signed-error="5\/12"/u);
  assert.match(addMarkup, /data-viz-absolute-error="5\/12"/u);
  assert.match(
    addMarkup,
    /data-viz-rounding-rule="nearest-whole-half-away-from-zero"/u,
  );

  for (const estimateOperation of ["multiply", "divide"] as const) {
    const markup = renderLab(labId, {
      estimateOperation,
      labId,
      left: { numerator: 3, denominator: 4 },
      mode: "estimate",
      right: { numerator: 2, denominator: 3 },
    });
    assertMark(markup, "estimate-receipt", estimateOperation);
    if (estimateOperation === "multiply") {
      assertMark(markup, "multiplication-area-interpretation");
      assertMark(markup, "multiplication-repeated-group-interpretation");
      assertMark(markup, "multiplication-scaling-interpretation");
    } else {
      assertMark(markup, "division-reciprocal-interpretation");
      assertMark(markup, "division-measurement-interpretation");
      assertMark(markup, "division-sharing-interpretation");
    }
  }
});

test("invalid initial states and division by zero fail closed without rendering stale output", () => {
  const labId = "pep-primary-p5-lower-factors-fractions";
  const invalidInputs: FractionOperationsInput[] = [
    {
      labId: "bnu-primary-p5-lower-fraction-add-sub",
      left: { numerator: 1, denominator: 2 },
      mode: "add",
      right: { numerator: 1, denominator: 3 },
    },
    {
      labId,
      left: { numerator: 1, denominator: 0 },
      mode: "add",
      right: { numerator: 1, denominator: 3 },
    },
    {
      labId,
      left: { numerator: 1, denominator: 2 },
      mode: "divide",
      right: { numerator: 0, denominator: 3 },
    },
    {
      estimateOperation: "divide",
      labId,
      left: { numerator: 1, denominator: 2 },
      mode: "estimate",
      right: { numerator: 0, denominator: 3 },
    },
    {
      labId: "bnu-primary-p5-lower-fraction-add-sub",
      left: { numerator: 1, denominator: 2 },
      mode: "multiply",
      right: { numerator: 1, denominator: 3 },
    },
  ];

  for (const input of invalidInputs) {
    assert.equal(renderLab(labId, input), "", JSON.stringify(input));
  }
});

test("all learner controls have 44px contracts and estimate adds one exact-operation parameter", () => {
  const labId = "pep-primary-p5-lower-factors-fractions";
  const exactMarkup = renderLab(labId, inputForMode(labId, "multiply"));
  assert.equal(count(exactMarkup, /data-viz-parameter=/gu), 4);
  assert.equal(count(exactMarkup, /data-viz-mode-button=/gu), 8);
  assert.equal(
    count(exactMarkup, /data-viz-(?:parameter|mode-button|reset-model)=[^>]*min-h-11/gu),
    13,
  );

  const estimateMarkup = renderLab(labId, {
    ...inputForMode(labId, "estimate"),
    estimateOperation: "divide",
  });
  assert.equal(count(estimateMarkup, /data-viz-parameter=/gu), 5);
  assert.match(estimateMarkup, /data-viz-parameter="estimate-operation"/u);
  assert.match(estimateMarkup, /data-viz-zero-excluded="true"/u);
  assert.equal(count(estimateMarkup, /data-viz-reset-model=/gu), 1);
});

test("English, Traditional Chinese, and Simplified Chinese learner copy is complete", () => {
  assertLocalizedCopy(FRACTION_OPERATIONS_COPY);
  const markup = renderLab(EXPECTED_LAB_IDS[0]);
  assert.match(markup, />Fraction operations</u);
  assert.match(markup, />Left numerator</u);
  assert.match(markup, />Least common denominator</u);
  assert.match(markup, />Equation check</u);
  assert.doesNotMatch(markup, />fraction-equation\./u);
  assert.doesNotMatch(
    visibleText(markup),
    /fraction-operations-v2|fraction-(?:denominator|exact|cross|common|simplification|whole|operation)/u,
  );
});

test("source stays learner-only, locally scrollable, and free of duplicated selector contracts", () => {
  const source = fs.readFileSync(COMPONENT_PATH, "utf8");
  for (const labId of EXPECTED_LAB_IDS) {
    assert.equal(count(source, new RegExp(`"${labId}"`, "gu")), 1, labId);
  }
  assert.equal(count(source, /data-viz-mode-button/gu), 1);
  assert.equal(count(source, /data-viz-reset-model/gu), 1);
  assert.match(
    source,
    /const\s+\{\s*t\s*\}\s*=\s*useSettings\(\)/u,
  );
  assert.match(source, /overflow-x-auto/u);
  assert.match(source, /min-w-\[760px\]/u);
  assert.match(source, /model\.visibleReceipt/u);
  assert.doesNotMatch(source, /data-viz-svg-background=/u);
  assert.doesNotMatch(source, /FRACTION_OPERATIONS_MODEL_CONTRACT\.version/u);
  assert.doesNotMatch(source, /<span className="font-mono">\{receipt\.id\}<\/span>/u);
  assert.ok(
    count(source, /executeFractionOperationsLabTransition/gu) >= 2,
    "the executable transition must be consumed by the component",
  );
  assert.doesNotMatch(source, /model\.equationCheck\.reconstruction\}/u);
  assert.doesNotMatch(
    source,
    /overlapping cells out of|groups of|Scale \{|Reciprocal \{|How many \{|Share \{/u,
  );
  assert.doesNotMatch(
    source,
    /authoring|teacher-only|debug|capture|checkpoint|run-from-beat|quality dock/iu,
  );
  assert.deepEqual(FRACTION_OPERATIONS_MODEL_CONTRACT, {
    family: "fraction-operations-v2",
    version: "fraction-operations-v2",
  });
});
