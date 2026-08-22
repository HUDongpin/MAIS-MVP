import assert from "node:assert/strict";
import fs from "node:fs";
import test, { after, before } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";
import {
  SIGNED_REAL_NUMBER_LINE_EXACT_MODES,
  SIGNED_REAL_NUMBER_LINE_LAB_IDS,
  SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT,
  SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES,
  SIGNED_REAL_NUMBER_LINE_TOPIC_RESET_INPUTS,
  buildSignedRealNumberLineModel,
  type QuadraticSurdInput,
  type SignedRealNumberLineExactMode,
  type SignedRealNumberLineInput,
  type SignedRealNumberLineLabId,
} from "./SignedRealNumberLineModel";
import {
  SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_CONTRACT,
  SignedRealNumberLineControlDomainError,
} from "./SignedRealNumberLineControlDomain";
import { SIGNED_REAL_NUMBER_LINE_GEOMETRY_CONTRACT } from "./SignedRealNumberLineGeometry";
import {
  visualizationLabCatalog,
  type FeaturedLabDefinition,
} from "../../../data/visualizationLabs";

const COMPONENT_PATH =
  "components/visualizations/mainland/SignedRealNumberLineLab.tsx";

const reactGlobal = globalThis as unknown as { React?: typeof React };
let hadOwnReact = false;
let previousReact: typeof React | undefined;
let AppProviders: (typeof import("../../providers/AppProviders"))["AppProviders"];
let MAINLAND_SIGNED_REAL_NUMBER_LINE_LAB_IDS: (typeof import("./SignedRealNumberLineLab"))["MAINLAND_SIGNED_REAL_NUMBER_LINE_LAB_IDS"];
let SIGNED_REAL_NUMBER_LINE_COPY: (typeof import("./SignedRealNumberLineLab"))["SIGNED_REAL_NUMBER_LINE_COPY"];
let SignedRealNumberLineLab: (typeof import("./SignedRealNumberLineLab"))["SignedRealNumberLineLab"];
let applySignedRealNumberLineLearnerDomainRequest: (typeof import("./SignedRealNumberLineLab"))["applySignedRealNumberLineLearnerDomainRequest"];
let createSignedRealNumberLineLearnerState: (typeof import("./SignedRealNumberLineLab"))["createSignedRealNumberLineLearnerState"];
let isMainlandSignedRealNumberLineLabId: (typeof import("./SignedRealNumberLineLab"))["isMainlandSignedRealNumberLineLabId"];
let rejectSignedRealNumberLineLearnerAction: (typeof import("./SignedRealNumberLineLab"))["rejectSignedRealNumberLineLearnerAction"];
let replaceSignedRealNumberLineLearnerInput: (typeof import("./SignedRealNumberLineLab"))["replaceSignedRealNumberLineLearnerInput"];
let resetSignedRealNumberLineLearnerState: (typeof import("./SignedRealNumberLineLab"))["resetSignedRealNumberLineLearnerState"];

before(async () => {
  hadOwnReact = Object.prototype.hasOwnProperty.call(reactGlobal, "React");
  previousReact = reactGlobal.React;
  reactGlobal.React = React;
  ({ AppProviders } = await import("../../providers/AppProviders"));
  ({
    MAINLAND_SIGNED_REAL_NUMBER_LINE_LAB_IDS,
    SIGNED_REAL_NUMBER_LINE_COPY,
    SignedRealNumberLineLab,
    applySignedRealNumberLineLearnerDomainRequest,
    createSignedRealNumberLineLearnerState,
    isMainlandSignedRealNumberLineLabId,
    rejectSignedRealNumberLineLearnerAction,
    replaceSignedRealNumberLineLearnerInput,
    resetSignedRealNumberLineLearnerState,
  } = await import("./SignedRealNumberLineLab"));
});

after(() => {
  if (hadOwnReact) reactGlobal.React = previousReact;
  else delete reactGlobal.React;
});

const EXPECTED_LAB_IDS = [
  "bnu-junior-s1-upper-rational-numbers",
  "bnu-junior-s2-upper-real-numbers",
  "hjb-junior-s2-upper-quadratic-radicals",
  "hjb-junior-s2-upper-real-numbers",
  "hjb-primary-p6-lower-rational-numbers",
  "pep-junior-s1-upper-rational-numbers",
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

function findLab(labId: string): FeaturedLabDefinition {
  const lab = visualizationLabCatalog.find(
    (candidate) => candidate.labId === labId,
  );
  assert.ok(lab, `catalog fixture missing ${labId}`);
  return lab;
}

function renderLab(
  labId: string,
  initialInput?: SignedRealNumberLineInput,
) {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={router as never}>
      <PathnameContext.Provider value="/visualization-lab">
        <AppProviders>
          <SignedRealNumberLineLab
            lab={findLab(labId)}
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

function surd(
  coefficientNumerator: number,
  radicand: number,
  coefficientDenominator = 1,
): QuadraticSurdInput {
  return {
    kind: "quadratic-surd",
    coefficient: {
      kind: "rational",
      numerator: coefficientNumerator,
      denominator: coefficientDenominator,
    },
    radicand,
  };
}

function inputForMode(
  labId: SignedRealNumberLineLabId,
  mode: SignedRealNumberLineExactMode,
): SignedRealNumberLineInput {
  const rational = (numerator: number, denominator = 1) => ({
    kind: "rational" as const,
    numerator,
    denominator,
  });
  const radical = (
    radicand: number,
    index: number,
    sign: -1 | 1 = 1,
  ) => ({ kind: "radical" as const, radicand, index, sign });
  const rationalTopic =
    SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES[labId].kind === "rational";
  switch (mode) {
    case "locate":
      return { labId, mode, precision: 3, value: rational(-3, 2) };
    case "compare":
      return {
        labId,
        mode,
        precision: 3,
        left: rationalTopic ? rational(7, 5) : radical(4, 2),
        right: rational(2),
      };
    case "add":
    case "subtract":
      return {
        labId,
        mode,
        precision: 3,
        start: rational(-3, 2),
        step: rational(mode === "add" ? 5 : -5, 4),
      };
    case "multiply":
    case "divide":
      return {
        labId,
        mode,
        precision: 3,
        left: rational(-3, 2),
        right: rational(mode === "divide" ? 5 : 4, 4),
      };
    case "opposite":
      return { labId, mode, precision: 3, value: rational(-7, 3) };
    case "absolute-value":
      return { labId, mode, precision: 3, value: rational(-7, 3) };
    case "radical":
      return { labId, mode, precision: 3, value: radical(2, 2, -1) };
    case "classify":
      return { labId, mode, precision: 3, value: radical(2, 2) };
    case "square-root":
      return { labId, mode, precision: 3, radicand: 4 };
    case "cube-root":
      return { labId, mode, precision: 3, radicand: -8 };
    case "estimate":
      return { labId, mode, precision: 4, value: radical(2, 2) };
    case "simplify":
    case "estimate-check":
      return { labId, mode, precision: 3, value: surd(1, 12) };
    case "radical-add":
    case "radical-subtract":
      return {
        labId,
        mode,
        precision: 3,
        left: surd(2, 3),
        right: surd(5, 3),
      };
    case "radical-multiply":
      return {
        labId,
        mode,
        precision: 3,
        left: surd(1, 8),
        right: surd(1, 18),
      };
    case "radical-divide":
      return {
        labId,
        mode,
        precision: 3,
        left: surd(1, 12),
        right: surd(1, 3),
      };
  }
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

function visibleText(markup: string) {
  return markup.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim();
}

function jsonAttribute(markup: string, name: string) {
  const match = markup.match(new RegExp(`${name}="([^"]+)"`, "u"));
  assert.ok(match, `missing ${name}`);
  return JSON.parse(
    match[1]
      .replaceAll("&quot;", '"')
      .replaceAll("&#x27;", "'")
      .replaceAll("&amp;", "&"),
  ) as unknown;
}

test("the learner component owns exactly the six reviewed G03 ids and fails closed elsewhere", () => {
  assert.equal(fs.existsSync(COMPONENT_PATH), true);
  assert.deepEqual(SIGNED_REAL_NUMBER_LINE_LAB_IDS, EXPECTED_LAB_IDS);
  assert.deepEqual(MAINLAND_SIGNED_REAL_NUMBER_LINE_LAB_IDS, EXPECTED_LAB_IDS);
  assert.equal(new Set(MAINLAND_SIGNED_REAL_NUMBER_LINE_LAB_IDS).size, 6);
  for (const labId of EXPECTED_LAB_IDS) {
    assert.equal(isMainlandSignedRealNumberLineLabId(labId), true, labId);
  }
  assert.equal(isMainlandSignedRealNumberLineLabId("not-a-g03-lab"), false);
  assert.equal(
    renderToStaticMarkup(
      <SignedRealNumberLineLab
        lab={{ ...findLab(EXPECTED_LAB_IDS[0]), labId: "not-a-g03-lab" }}
      />,
    ),
    "",
  );
});

test("each exact topic reset and mode surface follows only its topic profile", () => {
  let renderedModes = 0;
  for (const labId of EXPECTED_LAB_IDS) {
    const profile = SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES[labId];
    const reset = SIGNED_REAL_NUMBER_LINE_TOPIC_RESET_INPUTS[labId];
    const markup = renderLab(labId);
    assert.match(markup, new RegExp(`data-viz-mode="${reset.mode}"`, "u"));
    assert.equal(
      count(markup, /data-viz-mode-button=/gu),
      profile.allowedModes.length,
      labId,
    );
    for (const mode of SIGNED_REAL_NUMBER_LINE_EXACT_MODES) {
      const expected = (
        profile.allowedModes as readonly SignedRealNumberLineExactMode[]
      ).includes(mode);
      assert.equal(
        new RegExp(
          `<button[^>]*data-viz-mode-button="true"[^>]*data-viz-mode="${mode}"`,
          "u",
        ).test(markup),
        expected,
        `${labId}: ${mode}`,
      );
      if (expected) renderedModes += 1;
    }
  }
  assert.equal(renderedModes, 46);
});

test("all 46 exact topic-mode states SSR model, domain, geometry, and visible receipts", () => {
  let rendered = 0;
  for (const labId of EXPECTED_LAB_IDS) {
    for (const mode of SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES[labId]
      .allowedModes) {
      const input = inputForMode(labId, mode);
      const model = buildSignedRealNumberLineModel(input);
      const markup = renderLab(labId, input);
      assert.ok(
        markup.includes(`data-viz-configured-state="${model.stateKey}"`),
        model.stateKey,
      );
      assert.match(
        markup,
        new RegExp(
          `data-viz-control-domain-id="signed-real-number-line:${labId}:${mode}:v1"`,
          "u",
        ),
      );
      assert.match(
        markup,
        new RegExp(
          `data-viz-geometry="${SIGNED_REAL_NUMBER_LINE_GEOMETRY_CONTRACT.version}"`,
          "u",
        ),
      );
      assert.match(markup, /data-viz-control-transition-status="accepted"/u);
      assert.match(markup, /data-viz-control-requested=/u);
      assert.match(markup, /data-viz-control-expected=/u);
      assert.match(markup, /data-viz-control-observed=/u);
      assert.ok(markup.includes(model.point.symbolic), model.stateKey);
      assert.ok(markup.includes(model.approximation.text), model.stateKey);
      assert.match(markup, /data-viz-name="decimal-bounds"/u);
      assert.match(markup, /data-viz-name="geometry-receipt"/u);
      assert.equal(
        count(markup, /data-viz-invariant=/gu),
        model.invariantReceipts.length,
        model.stateKey,
      );
      assert.doesNotMatch(markup, /NaN|Infinity|\[object BigInt\]|\b\d+n\b/u);
      rendered += 1;
    }
  }
  assert.equal(rendered, 46);
});

test("the pure learner reducer records atomic zero-sign projection and no stale sign resurrection", () => {
  const labId = "bnu-junior-s2-upper-real-numbers" as const;
  const initial = createSignedRealNumberLineLearnerState(labId, {
    labId,
    mode: "radical",
    precision: 3,
    value: { kind: "radical", sign: -1, radicand: 5, index: 2 },
  });
  const zero = applySignedRealNumberLineLearnerDomainRequest(initial, {
    control: "value-radicand",
    value: 0,
  });
  assert.deepEqual(initial.actionReceipt.request, {
    kind: "initial",
    topicId: labId,
  });
  assert.equal(initial.actionReceipt.status, "accepted");
  assert.deepEqual(zero.actionReceipt.request, {
    kind: "control",
    control: "value-radicand",
    value: 0,
  });
  assert.equal(zero.actionReceipt.status, "accepted");
  assert.equal(zero.actionReceipt.rejection, null);
  assert.deepEqual(
    zero.actionReceipt.requested.pendingRequest,
    zero.actionReceipt.request,
  );
  assert.deepEqual(zero.actionReceipt.observed, zero.actionReceipt.expected);
  assert.equal(zero.actionReceipt.before.controlState.valueSign, -1);
  assert.equal(zero.actionReceipt.expected.controlState.valueSign, 1);
  assert.equal(zero.actionReceipt.expected.controlState.valueRadicand, 0);
  assert.equal(Object.isFrozen(zero.actionReceipt), true);
  assert.deepEqual(
    JSON.parse(JSON.stringify(zero.actionReceipt)),
    zero.actionReceipt,
  );
  assert.equal(zero.controls.valueRadicand, 0);
  assert.equal(zero.controls.valueSign, 1);
  assert.equal(zero.receipt.projections.length, 1);
  assert.equal(zero.receipt.observedStateKey, zero.receipt.expectedStateKey);
  assert.equal(zero.input.mode, "radical");
  assert.equal(zero.input.value.kind, "radical");
  assert.equal(zero.input.value.sign, 1);

  const raised = applySignedRealNumberLineLearnerDomainRequest(zero, {
    control: "value-radicand",
    value: 9,
  });
  assert.equal(raised.controls.valueRadicand, 9);
  assert.equal(raised.controls.valueSign, 1);
  assert.equal(raised.input.mode, "radical");
  assert.equal(raised.input.value.kind, "radical");
  assert.equal(raised.input.value.sign, 1);

  const canonicalMarkup = renderLab(labId, {
    labId,
    mode: "radical",
    precision: 3,
    value: { kind: "radical", sign: -1, radicand: 0, index: 2 },
  });
  assert.match(canonicalMarkup, /data-viz-value-sign="1"/u);
  assert.match(canonicalMarkup, /data-viz-value-radicand="0"/u);
  assert.doesNotMatch(canonicalMarkup, /<option value="-1" selected=/u);
  assert.match(canonicalMarkup, /<option value="1" selected=/u);
});

test("rational and quadratic-radical divide transitions project old zero once and reject direct zero", () => {
  const rationalLab = "pep-junior-s1-upper-rational-numbers" as const;
  const rationalState = createSignedRealNumberLineLearnerState(rationalLab, {
    labId: rationalLab,
    mode: "multiply",
    precision: 3,
    left: { kind: "rational", numerator: 3, denominator: 2 },
    right: { kind: "rational", numerator: 0, denominator: 1 },
  });
  const divide = applySignedRealNumberLineLearnerDomainRequest(rationalState, {
    control: "mode",
    value: "divide",
  });
  assert.equal(divide.controls.rightRationalNumerator, 1);
  assert.equal(divide.receipt.projections.length, 1);
  assert.throws(
    () =>
      applySignedRealNumberLineLearnerDomainRequest(divide, {
        control: "right-rational-numerator",
        value: 0,
      }),
    (error: unknown) =>
      error instanceof SignedRealNumberLineControlDomainError &&
      error.code === "DIRECT_REQUEST_VIOLATES_DOMAIN",
  );

  const radicalLab = "hjb-junior-s2-upper-quadratic-radicals" as const;
  const radicalState = createSignedRealNumberLineLearnerState(radicalLab, {
    labId: radicalLab,
    mode: "radical-multiply",
    precision: 3,
    left: surd(1, 2),
    right: surd(0, 0),
  });
  const radicalDivide = applySignedRealNumberLineLearnerDomainRequest(
    radicalState,
    { control: "mode", value: "radical-divide" },
  );
  assert.equal(radicalDivide.controls.rightSurdCoefficientNumerator, 1);
  assert.equal(radicalDivide.controls.rightSurdRadicand, 1);
  assert.equal(radicalDivide.receipt.projections.length, 2);
});

test("ordinary input, rejection, and reset actions replace stale receipts with exact full-state evidence", () => {
  const labId = "pep-junior-s1-upper-rational-numbers" as const;
  const initial = createSignedRealNumberLineLearnerState(labId);
  const input = { ...initial.input, precision: 4 } as SignedRealNumberLineInput;
  const changed = replaceSignedRealNumberLineLearnerInput(initial, input, {
    kind: "control",
    control: "precision",
    value: 4,
  });
  assert.equal(changed.actionReceipt.status, "accepted");
  assert.deepEqual(changed.actionReceipt.request, {
    kind: "control",
    control: "precision",
    value: 4,
  });
  assert.equal(
    changed.actionReceipt.before.input.precision,
    initial.input.precision,
  );
  assert.equal(changed.actionReceipt.expected.input.precision, 4);
  assert.deepEqual(changed.actionReceipt.expected, changed.actionReceipt.observed);
  assert.notEqual(changed.actionReceipt, initial.actionReceipt);

  const rejected = rejectSignedRealNumberLineLearnerAction(
    changed,
    { kind: "control", control: "right-rational-numerator", value: 0 },
    "DIRECT_REQUEST_VIOLATES_DOMAIN",
  );
  assert.equal(rejected.actionReceipt.status, "rejected");
  assert.equal(
    rejected.actionReceipt.rejection,
    "DIRECT_REQUEST_VIOLATES_DOMAIN",
  );
  assert.deepEqual(rejected.actionReceipt.expected, rejected.actionReceipt.before);
  assert.deepEqual(rejected.actionReceipt.observed, rejected.actionReceipt.before);
  assert.deepEqual(rejected.input, changed.input);
  assert.notEqual(rejected.actionReceipt, changed.actionReceipt);

  const reset = resetSignedRealNumberLineLearnerState(rejected);
  assert.deepEqual(reset.actionReceipt.request, { kind: "reset", topicId: labId });
  assert.equal(reset.actionReceipt.status, "accepted");
  assert.deepEqual(reset.input, SIGNED_REAL_NUMBER_LINE_TOPIC_RESET_INPUTS[labId]);
  assert.deepEqual(reset.actionReceipt.observed, reset.actionReceipt.expected);
  assert.equal(Object.isFrozen(reset.actionReceipt), true);
});

test("the learner root serializes one complete JSON-safe action receipt without stale summaries", () => {
  const labId = "bnu-junior-s2-upper-real-numbers" as const;
  const markup = renderLab(labId);
  const receipt = jsonAttribute(
    markup,
    "data-viz-action-receipt",
  ) as ReturnType<
    typeof createSignedRealNumberLineLearnerState
  >["actionReceipt"];
  assert.equal(receipt.status, "accepted");
  assert.deepEqual(receipt.request, { kind: "initial", topicId: labId });
  assert.deepEqual(receipt.expected, receipt.observed);
  assert.deepEqual(receipt.requested.pendingRequest, receipt.request);
  assert.deepEqual(jsonAttribute(markup, "data-viz-action-request"), receipt.request);
  assert.deepEqual(jsonAttribute(markup, "data-viz-action-before"), receipt.before);
  assert.deepEqual(
    jsonAttribute(markup, "data-viz-action-requested"),
    receipt.requested,
  );
  assert.deepEqual(
    jsonAttribute(markup, "data-viz-action-expected"),
    receipt.expected,
  );
  assert.deepEqual(
    jsonAttribute(markup, "data-viz-action-observed"),
    receipt.observed,
  );
  assert.deepEqual(
    jsonAttribute(markup, "data-viz-action-projections"),
    receipt.projections,
  );
  assert.match(markup, /data-viz-action-rejection="none"/u);
});

test("sqrt four and rational two have one exact SVG marker owner", () => {
  const labId = "bnu-junior-s2-upper-real-numbers" as const;
  const markup = renderLab(labId, {
    labId,
    mode: "compare",
    precision: 3,
    left: { kind: "radical", sign: 1, radicand: 4, index: 2 },
    right: { kind: "rational", numerator: 2, denominator: 1 },
  });
  assert.equal(count(markup, /data-viz-exact-key="r:2\/1"/gu), 2);
  assert.equal(count(markup, /data-viz-colocation-owner="comparison"/gu), 2);
  assert.match(
    markup,
    /data-viz-geometry-point="comparison"[^>]*data-viz-render-marker="true"/u,
  );
  assert.match(
    markup,
    /data-viz-geometry-point="primary"[^>]*data-viz-render-marker="false"/u,
  );
  assert.equal(count(markup, /data-viz-point-marker=/gu), 2);
});

test("rational operation, real concept, and quadratic radical receipts are visible and exact", () => {
  const rationalLab = "bnu-junior-s1-upper-rational-numbers" as const;
  for (const mode of ["multiply", "divide", "opposite"] as const) {
    const model = buildSignedRealNumberLineModel(
      inputForMode(rationalLab, mode),
    );
    const markup = renderLab(rationalLab, inputForMode(rationalLab, mode));
    assert.ok(model.rationalOperation);
    assert.match(markup, /data-viz-name="rational-operation-receipt"/u);
    assert.ok(markup.includes(model.rationalOperation.reconstruction));
    assert.ok(markup.includes(model.rationalOperation.result.symbolic));
  }

  const realLab = "hjb-junior-s2-upper-real-numbers" as const;
  for (const mode of [
    "classify",
    "square-root",
    "cube-root",
    "estimate",
  ] as const) {
    const model = buildSignedRealNumberLineModel(inputForMode(realLab, mode));
    const markup = renderLab(realLab, inputForMode(realLab, mode));
    assert.ok(model.realConcept);
    assert.match(markup, /data-viz-name="real-concept-receipt"/u);
    assert.ok(markup.includes(model.point.symbolic));
    if (mode === "square-root" || mode === "cube-root") {
      assert.match(markup, /data-viz-name="root-point"/u);
      assert.match(markup, /data-viz-root-defined="true"/u);
      assert.equal(model.point.symbolic, mode === "square-root" ? "2" : "-2");
      assert.ok(markup.includes(mode === "square-root" ? "2" : "-2"));
    }
  }

  const radicalLab = "hjb-junior-s2-upper-quadratic-radicals" as const;
  const expectations = {
    simplify: "2√3",
    "radical-add": "7√3",
    "radical-subtract": "-3√3",
    "radical-multiply": "12",
    "radical-divide": "2",
    "estimate-check": "2√3",
  } as const;
  for (const mode of SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES[radicalLab]
    .allowedModes) {
    const model = buildSignedRealNumberLineModel(inputForMode(radicalLab, mode));
    const markup = renderLab(radicalLab, inputForMode(radicalLab, mode));
    assert.ok(model.radicalOperation);
    assert.equal(model.radicalOperation.result.symbolic, expectations[mode]);
    assert.match(markup, /data-viz-name="quadratic-radical-receipt"/u);
    assert.match(markup, /data-viz-radical-defined="true"/u);
    assert.ok(markup.includes(expectations[mode]));
  }

  const unlike = {
    labId: radicalLab,
    mode: "radical-add",
    precision: 3,
    left: surd(1, 2),
    right: surd(1, 3),
  } satisfies SignedRealNumberLineInput;
  const unlikeModel = buildSignedRealNumberLineModel(unlike);
  const unlikeMarkup = renderLab(radicalLab, unlike);
  assert.ok(unlikeModel.radicalOperation);
  assert.equal(unlikeModel.radicalOperation.combinable, false);
  assert.match(unlikeMarkup, /data-viz-radical-combinable="false"/u);
  assert.ok(unlikeMarkup.includes("√2 + √3"));
});

test("tri-state invariants render not-applicable as neutral and never as verified", () => {
  const labId = "bnu-junior-s1-upper-rational-numbers" as const;
  const input = inputForMode(labId, "locate");
  const model = buildSignedRealNumberLineModel(input);
  const markup = renderLab(labId, input);
  const notApplicable = model.invariantReceipts.filter(
    ({ status }) => status === "not-applicable",
  );
  assert.ok(notApplicable.length > 0);
  assert.equal(
    count(markup, /data-viz-invariant-status="not-applicable"/gu),
    notApplicable.length,
  );
  const neutralItems = [
    ...markup.matchAll(
      /<li[^>]*data-viz-invariant-applicable="false"[^>]*>([\s\S]*?)<\/li>/gu,
    ),
  ];
  assert.equal(neutralItems.length, notApplicable.length);
  for (const item of neutralItems) {
    assert.match(item[1], /Not applicable/u);
    assert.doesNotMatch(item[1], /✓|verified/iu);
  }
  assert.equal(
    count(markup, /data-viz-invariant-status="pass"/gu),
    model.invariantReceipts.filter(({ status }) => status === "pass").length,
  );
});

test("all learner copy is localized and controls keep 44px, local scroll, and exact reset selectors", () => {
  assertLocalizedCopy(SIGNED_REAL_NUMBER_LINE_COPY);
  for (const labId of EXPECTED_LAB_IDS) {
    const lab = findLab(labId);
    const markup = renderLab(labId);
    const interactiveCount =
      count(markup, /data-viz-mode-button=/gu) +
      count(markup, /data-viz-parameter=/gu) +
      count(markup, /data-viz-reset-model=/gu);
    assert.ok(count(markup, /min-h-11/gu) >= interactiveCount, labId);
    assert.match(markup, /data-viz-scroll-container=/u);
    assert.match(markup, /tabindex="0"/u);
    assert.match(markup, /min-w-\[760px\]/u);
    assert.equal(count(markup, /data-viz-reset-model=/gu), 1);
    assert.match(
      markup,
      new RegExp(`data-viz-reset-module-id="${lab.moduleId}"`, "u"),
    );
    assert.match(
      markup,
      new RegExp(`data-viz-reset-topic-id="${lab.topicId}"`, "u"),
    );
    const text = visibleText(markup);
    assert.doesNotMatch(text, /signed-real-number-line-(?:v|geometry|control-domain)/u);
    for (const invariant of buildSignedRealNumberLineModel(
      SIGNED_REAL_NUMBER_LINE_TOPIC_RESET_INPUTS[labId],
    ).invariantReceipts) {
      assert.doesNotMatch(text, new RegExp(`\\b${invariant.id}\\b`, "u"));
    }
  }
});

test("source binds the frozen domain and geometry modules without authoring or hidden visual effects", () => {
  const source = fs.readFileSync(COMPONENT_PATH, "utf8");
  assert.match(
    source,
    /planSignedRealNumberLineControlTransition/u,
  );
  assert.match(
    source,
    /observeSignedRealNumberLineControlTransition/u,
  );
  assert.match(source, /buildSignedRealNumberLineGeometry/u);
  assert.match(source, /SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES/u);
  assert.match(source, /SIGNED_REAL_NUMBER_LINE_TOPIC_RESET_INPUTS/u);
  assert.match(source, /overflow-x-auto/u);
  assert.doesNotMatch(
    source,
    /authoring|debug|capture|checkpoint|run-from-beat|quality dock|backdrop-filter|filter:|opacity-|bg-gradient|from-|via-|to-/iu,
  );
  assert.equal(
    SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_CONTRACT.version,
    "signed-real-number-line-control-domain-v1",
  );
  assert.equal(
    SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT.version,
    "signed-real-number-line-v1",
  );
});
