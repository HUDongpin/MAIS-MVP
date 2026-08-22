import assert from "node:assert/strict";
import fs from "node:fs";
import test, { after, before } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";

import {
  SYMBOLIC_EXPRESSIONS_LAB_IDS,
  SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST,
  SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT,
  buildSymbolicExpressionsModel,
  type SymbolicExpressionsLabId,
  type SymbolicExpressionsMode,
} from "./SymbolicExpressionsModel";
import {
  SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT,
  buildSymbolicExpressionsScenarioInput,
  createSymbolicExpressionsControlDomainState,
  planSymbolicExpressionsControlTransition,
  type SymbolicExpressionsControlDomainState,
} from "./SymbolicExpressionsControlDomain";

const COMPONENT_PATH =
  "components/visualizations/mainland/SymbolicExpressionsLab.tsx";

const reactGlobal = globalThis as unknown as { React?: typeof React };
let hadOwnReact = false;
let previousReact: typeof React | undefined;
let AppProviders: (typeof import("../../providers/AppProviders"))["AppProviders"];
let MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS: (typeof import("./SymbolicExpressionsLab"))["MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS"];
let SYMBOLIC_EXPRESSIONS_COPY: (typeof import("./SymbolicExpressionsLab"))["SYMBOLIC_EXPRESSIONS_COPY"];
let SymbolicExpressionsLab: (typeof import("./SymbolicExpressionsLab"))["SymbolicExpressionsLab"];
let createSymbolicExpressionsLabUiState: (typeof import("./SymbolicExpressionsLab"))["createSymbolicExpressionsLabUiState"];
let isMainlandSymbolicExpressionsLabId: (typeof import("./SymbolicExpressionsLab"))["isMainlandSymbolicExpressionsLabId"];
let reduceSymbolicExpressionsLabUiState: (typeof import("./SymbolicExpressionsLab"))["reduceSymbolicExpressionsLabUiState"];

before(async () => {
  hadOwnReact = Object.prototype.hasOwnProperty.call(reactGlobal, "React");
  previousReact = reactGlobal.React;
  reactGlobal.React = React;
  ({ AppProviders } = await import("../../providers/AppProviders"));
  ({
    MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS,
    SYMBOLIC_EXPRESSIONS_COPY,
    SymbolicExpressionsLab,
    createSymbolicExpressionsLabUiState,
    isMainlandSymbolicExpressionsLabId,
    reduceSymbolicExpressionsLabUiState,
  } = await import("./SymbolicExpressionsLab"));
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

function stateFor(labId: SymbolicExpressionsLabId, mode: SymbolicExpressionsMode) {
  return planSymbolicExpressionsControlTransition(
    createSymbolicExpressionsControlDomainState(labId),
    { controllerId: "mode", kind: "controller", value: mode },
  ).expected;
}

function renderLab(labId: string, initialState?: SymbolicExpressionsControlDomainState) {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={router as never}>
      <PathnameContext.Provider value="/visualization-lab">
        <AppProviders>
          <SymbolicExpressionsLab labId={labId} initialState={initialState} />
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
  assert.ok(value && typeof value === "object", path);
  const record = value as Record<string, unknown>;
  if ("en" in record || "zh" in record || "zhHans" in record) {
    assert.equal(typeof record.en, "string", `${path}.en`);
    assert.match(record.zh as string, /[\u3400-\u9fff]/u, `${path}.zh`);
    assert.match(record.zhHans as string, /[\u3400-\u9fff]/u, `${path}.zhHans`);
    return;
  }
  for (const [key, child] of Object.entries(record)) {
    assertLocalizedCopy(child, `${path}.${key}`);
  }
}

test("owns exactly the seven frozen G07 topics and fails closed elsewhere", () => {
  assert.deepEqual(MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS, SYMBOLIC_EXPRESSIONS_LAB_IDS);
  assert.equal(new Set(MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS).size, 7);
  for (const labId of SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    assert.equal(isMainlandSymbolicExpressionsLabId(labId), true);
  }
  assert.equal(isMainlandSymbolicExpressionsLabId("array-area"), false);
  assert.equal(renderLab("not-g07"), "");
});

test("each topic renders only its reviewed allowlist and upstream reset mode", () => {
  for (const labId of SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    const state = createSymbolicExpressionsControlDomainState(labId);
    const markup = renderLab(labId);
    assert.equal(
      count(markup, /data-viz-mode-button="true"/gu),
      SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId].length,
      labId,
    );
    for (const mode of SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId]) {
      assert.match(markup, new RegExp(`data-viz-mode="${mode}"`, "u"));
    }
    assert.match(
      markup,
      new RegExp(`data-viz-mode="${state.mode}"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-viz-mode="${state.mode}"`, "u"),
    );
    assert.doesNotThrow(() =>
      buildSymbolicExpressionsModel(buildSymbolicExpressionsScenarioInput(state)),
    );
  }
});

test("one atomic UI state records requested, expected, observed, projections, and rejection", () => {
  const labId = "pep-junior-s2-upper-polynomials-fractions" as const;
  const carried = {
    ...createSymbolicExpressionsControlDomainState(labId),
    domainNumerator: 2,
    excludedRoot: 2,
  } as SymbolicExpressionsControlDomainState;
  const initial = createSymbolicExpressionsLabUiState(labId, carried);
  const projected = reduceSymbolicExpressionsLabUiState(initial, {
    controllerId: "mode",
    kind: "controller",
    value: "fraction-simplify",
  });
  assert.equal(projected.lastRejection, null);
  assert.equal(projected.receipt.requested.domainNumerator, 2);
  assert.equal(projected.receipt.expected.domainNumerator, 3);
  assert.equal(projected.receipt.observed.domainNumerator, 3);
  assert.equal(projected.receipt.matchesExpected, true);
  assert.deepEqual(projected.receipt.projections.map(({ reason }) => reason), [
    "domain-value-cannot-equal-cancelled-factor-root",
  ]);

  const rejected = reduceSymbolicExpressionsLabUiState(projected, {
    controlId: "domain-numerator",
    kind: "control",
    value: 2,
  });
  assert.equal(rejected.lastRejection, "MODEL_REJECTED_STATE");
  assert.deepEqual(rejected.domainState, projected.domainState);
  const rejectedReceipt = rejected.receipt as unknown as {
    accepted: boolean;
    error: {
      causeCode: string | null;
      code: string;
    } | null;
    expected: SymbolicExpressionsControlDomainState;
    matchesExpected: boolean;
    observed: SymbolicExpressionsControlDomainState;
    projections: unknown[];
    request: unknown;
    requested: SymbolicExpressionsControlDomainState;
  };
  assert.equal(rejectedReceipt.accepted, false);
  assert.deepEqual(rejectedReceipt.request, {
    controlId: "domain-numerator",
    kind: "control",
    value: 2,
  });
  assert.equal(rejectedReceipt.requested.domainNumerator, 2);
  assert.deepEqual(rejectedReceipt.expected, projected.domainState);
  assert.deepEqual(rejectedReceipt.observed, projected.domainState);
  assert.equal(rejectedReceipt.matchesExpected, false);
  assert.deepEqual(rejectedReceipt.projections, []);
  assert.deepEqual(rejectedReceipt.error, {
    causeCode: "DOMAIN_VIOLATION",
    code: "MODEL_REJECTED_STATE",
  });

  const rejectedAgain = reduceSymbolicExpressionsLabUiState(rejected, {
    controlId: "domain-numerator",
    kind: "control",
    value: 2,
  });
  assert.equal(
    (rejectedAgain.receipt as unknown as { accepted: boolean }).accepted,
    false,
  );
  const valid = reduceSymbolicExpressionsLabUiState(rejectedAgain, {
    controlId: "domain-numerator",
    kind: "control",
    value: 4,
  });
  assert.equal(valid.lastRejection, null);
  assert.equal((valid.receipt as unknown as { accepted: boolean }).accepted, true);
  assert.equal(valid.domainState.domainNumerator, 4);
  const roundTrip = reduceSymbolicExpressionsLabUiState(
    reduceSymbolicExpressionsLabUiState(valid, {
      controllerId: "mode",
      kind: "controller",
      value: "expand",
    }),
    {
      controllerId: "mode",
      kind: "controller",
      value: "fraction-simplify",
    },
  );
  assert.equal((roundTrip.receipt as unknown as { accepted: boolean }).accepted, true);
  assert.equal(roundTrip.domainState.domainNumerator, 4);
  assert(Object.isFrozen(rejected));
});

test("learner direct controls reach a truthful all-zero collection and Reset restores the reviewed model", () => {
  const labId = "bnu-junior-s1-upper-algebraic-expressions" as const;
  let state = createSymbolicExpressionsLabUiState(labId);
  for (const [controlId, value] of [
    ["coefficient-a", 0],
    ["coefficient-b", 0],
    ["coefficient-c", 0],
    ["constant-a", 0],
  ] as const) {
    state = reduceSymbolicExpressionsLabUiState(state, {
      controlId,
      kind: "control",
      value,
    });
    assert.equal(state.receipt.accepted, true, controlId);
    assert.equal(state.lastRejection, null, controlId);
  }
  const zeroInput = buildSymbolicExpressionsScenarioInput(state.domainState);
  assert.equal(zeroInput.mode, "collect-like-terms");
  if (zeroInput.mode !== "collect-like-terms") assert.fail("wrong zero-input mode");
  assert.deepEqual(
    zeroInput.terms.map(({ coefficient }) => coefficient),
    [0, 0, 0, 0],
  );
  const zeroMarkup = renderLab(labId, state.domainState);
  assert.match(zeroMarkup, /data-viz-name="zero-expression"/u);
  assert.match(zeroMarkup, /data-viz-zero-result="true"/u);
  assert.equal(count(zeroMarkup, /data-viz-name="algebra-tile"/gu), 0);
  assert.match(visibleText(zeroMarkup), /0 → 0/u);

  const reset = reduceSymbolicExpressionsLabUiState(state, { kind: "reset" });
  assert.equal(reset.receipt.accepted, true);
  assert.equal(reset.lastRejection, null);
  assert.deepEqual(
    reset.domainState,
    createSymbolicExpressionsControlDomainState(labId),
  );
  const resetMarkup = renderLab(labId, reset.domainState);
  assert.doesNotMatch(resetMarkup, /data-viz-name="zero-expression"/u);
  assert.ok(count(resetMarkup, /data-viz-name="algebra-tile"/gu) > 0);
});

test("learner direct controls reach truthful all-zero add and subtract states before Reset", () => {
  for (const labId of [
    "bnu-junior-s1-upper-algebraic-expressions",
    "hjb-junior-s1-upper-polynomial-add-subtract",
  ] as const) {
    for (const mode of ["add", "subtract"] as const) {
      let state = createSymbolicExpressionsLabUiState(labId);
      state = reduceSymbolicExpressionsLabUiState(state, {
        controllerId: "mode",
        kind: "controller",
        value: mode,
      });
      assert.equal(state.receipt.accepted, true, `${labId}:${mode}:mode`);
      for (const controlId of [
        "constant-a",
        "coefficient-a",
        "coefficient-b",
        "constant-b",
        "coefficient-c",
        "coefficient-d",
      ] as const) {
        state = reduceSymbolicExpressionsLabUiState(state, {
          controlId,
          kind: "control",
          value: 0,
        });
        assert.equal(state.receipt.accepted, true, `${labId}:${mode}:${controlId}`);
        assert.equal(state.lastRejection, null, `${labId}:${mode}:${controlId}`);
      }
      const zeroInput = buildSymbolicExpressionsScenarioInput(state.domainState);
      assert.equal(zeroInput.mode, mode);
      if (zeroInput.mode !== "add" && zeroInput.mode !== "subtract") {
        assert.fail("wrong binary zero-input mode");
      }
      assert.deepEqual(zeroInput.left, [0]);
      assert.deepEqual(zeroInput.right, [0]);
      const model = buildSymbolicExpressionsModel(zeroInput);
      assert.equal(model.result.kind, "polynomial");
      if (model.result.kind !== "polynomial") assert.fail("wrong binary result");
      assert.deepEqual(model.result.polynomial.coefficients, [0]);
      const zeroMarkup = renderLab(labId, state.domainState);
      assert.equal(count(zeroMarkup, /data-viz-name="zero-expression"/gu), 1);
      assert.equal(count(zeroMarkup, /data-viz-name="algebra-tile"/gu), 0);
      assert.match(zeroMarkup, /data-viz-zero-result="true"/u);
      assert.match(visibleText(zeroMarkup), /= 0/u);

      const reset = reduceSymbolicExpressionsLabUiState(state, { kind: "reset" });
      assert.equal(reset.receipt.accepted, true);
      assert.deepEqual(
        reset.domainState,
        createSymbolicExpressionsControlDomainState(labId),
      );
      const resetMarkup = renderLab(labId, reset.domainState);
      assert.doesNotMatch(resetMarkup, /data-viz-name="zero-expression"/u);
      assert.ok(count(resetMarkup, /data-viz-name="algebra-tile"/gu) > 0);
    }
  }
});

test("invariant UI renders not-applicable neutrally and never presents N/A as passed", () => {
  const markup = renderLab(
    "pep-junior-s2-upper-polynomials-fractions",
    stateFor("pep-junior-s2-upper-polynomials-fractions", "expand"),
  );
  assert.equal(count(markup, /data-viz-invariant-status="passed"/gu), 1);
  assert.equal(count(markup, /data-viz-invariant-status="not-applicable"/gu), 5);
  assert.equal(count(markup, /data-viz-invariant-applicable="false"/gu), 5);
  assert.match(visibleText(markup), /Not used in this mode/u);
  assert.doesNotMatch(
    markup,
    /data-viz-invariant-status="not-applicable"[^>]*data-viz-invariant-holds="true"/u,
  );
});

test("fractional solve visible equation retains both original denominator conditions and exact exclusions", () => {
  const markup = renderLab(
    "bnu-junior-s2-lower-algebraic-fractions-equations",
  );
  const text = visibleText(markup);
  assert.match(text, /x - 1 ≠ 0/u);
  assert.match(text, /1 ≠ 0/u);
  assert.match(text, /x ≠ 1/u);
  assert.match(markup, /data-viz-equation-kind="fractional-linear"/u);
  assert.equal(count(markup, /data-viz-equation-exclusion=/gu), 1);
});

test("roots expose stable state/domain/reset/local-scroll selectors and no duplicate active owner", () => {
  for (const labId of SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    const markup = renderLab(labId);
    assert.match(markup, new RegExp(`data-viz-topic-id="${labId}"`, "u"));
    assert.match(markup, new RegExp(`data-viz-configured-model="${SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT.version}"`, "u"));
    assert.match(markup, /data-viz-configured-state="[^"]+"/u);
    assert.match(markup, new RegExp(`data-viz-range-domain-id="${SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT.id}"`, "u"));
    assert.match(markup, /data-viz-domain-requested="[^"]+"/u);
    assert.match(markup, /data-viz-domain-expected="[^"]+"/u);
    assert.match(markup, /data-viz-domain-observed="[^"]+"/u);
    assert.match(markup, /data-viz-domain-match="true"/u);
    assert.match(markup, /data-viz-reset-model="true"/u);
    assert.match(markup, /data-viz-reset-module-id="configured-visualization-lab"/u);
    assert.match(markup, new RegExp(`data-viz-reset-topic-id="${labId}"`, "u"));
    assert.match(markup, /data-viz-local-scroll="horizontal"/u);
    assert.match(markup, /data-viz-pan-hint="true"/u);
    assert.equal(count(markup, /data-viz-active-lab-id=/gu), 0);
  }
});

test("all allowed modes bind one receipt-derived visible equation and one true visual status", () => {
  for (const labId of SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    for (const mode of SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId]) {
      const markup = renderLab(labId, stateFor(labId, mode));
      assert.equal(count(markup, /data-viz-visible-equation="true"/gu), 1);
      assert.equal(
        count(markup, /data-viz-symbolic-visual(?:=|-status=)/gu),
        1,
        `${labId}:${mode}`,
      );
      assert.doesNotMatch(visibleText(markup), /N\/A|undefined|false = true/u);
    }
  }
});

test("mode, scenario, and reset controls meet the 44px contract", () => {
  for (const labId of SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    const markup = renderLab(labId);
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
      assert.ok(matches.length > 0, `${labId}:${selector}`);
      for (const match of matches) assert.match(match[1]!, /min-h-11/u);
    }
  }
});

test("controls are finite scenario scalars with exact bounds and never raw JSON or arrays", () => {
  for (const labId of SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    for (const mode of SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId]) {
      const markup = renderLab(labId, stateFor(labId, mode));
      const controls = [
        ...markup.matchAll(/data-viz-parameter="([^"]+)"[^>]*min="(-?\d+)"[^>]*max="(-?\d+)"/gu),
      ];
      assert.ok(controls.length >= 4, `${labId}:${mode}`);
      for (const [, controlId, minimum, maximum] of controls) {
        assert.doesNotMatch(controlId!, /json|array|polynomial|terms/u);
        assert.ok(Number.isFinite(Number(minimum)));
        assert.ok(Number.isFinite(Number(maximum)));
      }
    }
  }
});

test("learner copy is complete in en, zh, zhHans and hides raw implementation IDs", () => {
  assertLocalizedCopy(SYMBOLIC_EXPRESSIONS_COPY);
  for (const labId of SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    const text = visibleText(renderLab(labId));
    assert.doesNotMatch(
      text,
      /symbolic-transform-suite-v1|symbolic-expressions-scenarios-v1|like-term-coefficient-conservation|algebraic-fraction-domain|polynomial-visible-tiles/u,
    );
  }
});

test("source consumes only frozen Model, Domain, Visual and keeps one atomic React state", () => {
  const source = fs.readFileSync(COMPONENT_PATH, "utf8");
  assert.match(source, /from "\.\/SymbolicExpressionsModel"/u);
  assert.match(source, /from "\.\/SymbolicExpressionsControlDomain"/u);
  assert.match(source, /from "\.\/SymbolicExpressionsVisualModel"/u);
  assert.doesNotMatch(source, /ConfiguredVisualizationLab|visualizationLabs|generic|JSON\.parse/u);
  assert.equal(count(source, /useState</gu), 1);
  assert.equal(count(source, /data-viz-svg-background/gu), 0);
});
