import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";
import { AppProviders } from "../../providers/AppProviders";
import {
  visualizationLabCatalog,
  type FeaturedLabDefinition,
} from "../../../data/visualizationLabs";
import {
  DECIMAL_ARITHMETIC_COPY,
  MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS,
  DecimalArithmeticLab,
  isMainlandDecimalArithmeticLabId,
} from "./DecimalArithmeticLab";
import {
  buildDecimalArithmeticState,
  decimalArithmeticOperations,
  type DecimalArithmeticInput,
  type DecimalArithmeticOperation,
} from "./DecimalArithmeticModel";

// The focused `node --import tsx` runner preserves classic JSX in existing
// provider modules, so expose React exactly as the app runtime does.
(globalThis as typeof globalThis & { React: typeof React }).React = React;

const EXPECTED_LAB_IDS = [
  "bnu-primary-p4-lower-decimal-meaning-add-sub",
  "bnu-primary-p5-upper-decimal-division",
  "hjb-primary-p4-lower-decimals-meaning-add-sub",
  "hjb-primary-p5-upper-decimal-operations",
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

function renderLab(labId: string, initialInput?: DecimalArithmeticInput) {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={router as never}>
      <PathnameContext.Provider value="/visualization-lab">
        <AppProviders>
          <DecimalArithmeticLab
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

function inputFor(
  operation: DecimalArithmeticOperation,
  endpoint: "minimum" | "maximum",
): DecimalArithmeticInput {
  const maximum = endpoint === "maximum";
  return {
    operation,
    estimateOperation: operation === "estimate-check" ? "divide" : undefined,
    left: { unscaled: maximum ? 9_999 : 0, scale: maximum ? 3 : 0 },
    right: { unscaled: maximum ? 9_999 : 1, scale: maximum ? 3 : 0 },
    precision: maximum ? 4 : 0,
  };
}

test("the learner component owns exactly the four reviewed G02 ids and fails closed elsewhere", () => {
  assert.deepEqual(MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS, EXPECTED_LAB_IDS);
  assert.equal(new Set(MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS).size, 4);
  for (const labId of EXPECTED_LAB_IDS) {
    assert.equal(isMainlandDecimalArithmeticLabId(labId), true, labId);
  }
  assert.equal(
    isMainlandDecimalArithmeticLabId(
      "bnu-primary-p4-lower-decimal-multiplication",
    ),
    false,
  );
  assert.equal(isMainlandDecimalArithmeticLabId("p4-decimals"), false);
  assert.equal(
    renderToStaticMarkup(
      <DecimalArithmeticLab
        lab={{ ...findLab(EXPECTED_LAB_IDS[0]), labId: "not-a-g02-lab" }}
      />,
    ),
    "",
  );
});

test("all four ids SSR one exact learner root with module, topic, state, reset, and local-scroll selectors", () => {
  for (const labId of EXPECTED_LAB_IDS) {
    const lab = findLab(labId);
    const markup = renderLab(labId);
    assert.equal(
      count(markup, /data-mainland-decimal-arithmetic=/gu),
      1,
      labId,
    );
    assert.match(
      markup,
      new RegExp(`data-viz-topic-id="${lab.topicId}"`, "u"),
      labId,
    );
    assert.match(
      markup,
      new RegExp(`data-viz-module-id="${lab.moduleId}"`, "u"),
      labId,
    );
    assert.match(markup, /data-viz-family="decimal-arithmetic"/u, labId);
    assert.match(
      markup,
      /data-viz-configured-model="decimal-arithmetic-v1"/u,
      labId,
    );
    assert.match(
      markup,
      /data-viz-configured-state="decimal-arithmetic-v1\|operation=add\|/u,
      labId,
    );
    assert.equal(count(markup, /data-viz-mode-button=/gu), 5, labId);
    assert.equal(count(markup, /data-viz-reset-model=/gu), 1, labId);
    assert.match(markup, /data-viz-scroll-container=/u, labId);
    assert.match(markup, /data-viz-pan-hint=/u, labId);
    assert.match(markup, /tabindex="0"/u, labId);
    assert.match(markup, /data-viz-svg-background="opaque"/u, labId);
    assert.match(markup, /data-viz-state-summary=/u, labId);
    assert.match(markup, /data-viz-invariant=/u, labId);
    assert.match(markup, /data-viz-mark=/u, labId);
  }
});

test("every G02 id and every operation SSR its visible mathematical receipts", () => {
  const requiredMarks: Record<DecimalArithmeticOperation, readonly string[]> = {
    add: ["aligned-column", "decimal-point", "carry-receipt", "exact-result"],
    subtract: [
      "aligned-column",
      "decimal-point",
      "borrow-receipt",
      "exact-result",
    ],
    multiply: [
      "aligned-column",
      "decimal-point",
      "partial-product",
      "exact-result",
    ],
    divide: [
      "aligned-column",
      "decimal-point",
      "division-quotient",
      "division-remainder",
      "division-reconstruction",
    ],
    "estimate-check": [
      "aligned-column",
      "decimal-point",
      "rounded-estimate",
      "estimate-error",
      "absolute-estimate-error",
    ],
  };

  for (const labId of EXPECTED_LAB_IDS) {
    for (const operation of decimalArithmeticOperations) {
      const input: DecimalArithmeticInput = {
        operation,
        estimateOperation:
          operation === "estimate-check" ? "divide" : undefined,
        left: { unscaled: 1_250, scale: 2 },
        right: { unscaled: 375, scale: 2 },
        precision: 2,
      };
      const state = buildDecimalArithmeticState(input);
      const markup = renderLab(labId, input);
      assert.match(
        markup,
        new RegExp(`data-viz-mode="${operation}"`, "u"),
        `${labId}: ${operation}`,
      );
      assert.ok(
        markup.includes(`left=${state.left.unscaled}@${state.left.scale}`),
        `${labId}: ${operation}: state receipt`,
      );
      for (const mark of requiredMarks[operation]) {
        assert.match(
          markup,
          new RegExp(`data-viz-name="${mark}"`, "u"),
          `${labId}: ${operation}: ${mark}`,
        );
      }
      assert.equal(
        count(markup, /data-viz-invariant=/gu),
        state.invariants.length,
      );
      assert.doesNotMatch(markup, /NaN|Infinity/u, `${labId}: ${operation}`);
    }
  }
});

test("all mode and control endpoints remain finite, retain nonzero right operands, and render nonzero evidence counts", () => {
  for (const labId of EXPECTED_LAB_IDS) {
    for (const operation of decimalArithmeticOperations) {
      for (const endpoint of ["minimum", "maximum"] as const) {
        const markup = renderLab(labId, inputFor(operation, endpoint));
        assert.doesNotMatch(
          markup,
          /NaN|Infinity/u,
          `${labId}: ${operation}: ${endpoint}`,
        );
        assert.equal(count(markup, /data-viz-parameter=/gu) > 0, true);
        assert.equal(count(markup, /data-viz-mark=/gu) > 0, true);
        assert.equal(count(markup, /data-viz-invariant=/gu) > 0, true);
        assert.match(
          markup,
          /data-viz-parameter="operand-a"[^>]*min="0"[^>]*max="9999"/u,
        );
        assert.match(
          markup,
          /data-viz-parameter="operand-b"[^>]*min="1"[^>]*max="9999"/u,
        );
        assert.match(
          markup,
          /data-viz-parameter="decimal-scale"[^>]*min="0"[^>]*max="3"/u,
        );
        assert.match(
          markup,
          /data-viz-parameter="precision"[^>]*min="0"[^>]*max="4"/u,
        );
        assert.doesNotMatch(markup, /right=0@/u);
      }
    }
  }

  const clampedRight = renderLab(EXPECTED_LAB_IDS[0], {
    operation: "divide",
    left: { unscaled: 42, scale: 1 },
    right: { unscaled: 0, scale: 1 },
    precision: 2,
  });
  assert.match(clampedRight, /right=1@1/u);
  assert.doesNotMatch(clampedRight, /NaN|Infinity/u);
});

test("signed initial input stays curriculum-fail-closed while a nonnegative negative result exposes swap and sign", () => {
  const signedAddition: DecimalArithmeticInput = {
    operation: "add",
    left: { unscaled: -12, scale: 1 },
    right: { unscaled: 3, scale: 1 },
    precision: 1,
  };
  const signedMarkup = renderLab(EXPECTED_LAB_IDS[0], signedAddition);
  assert.equal(
    signedMarkup,
    "",
    "-1.2 + 0.3 is outside the current primary learner control domain",
  );
  assert.doesNotMatch(signedMarkup, /data-viz-mark|data-viz-configured-state/u);

  const swappedSubtraction: DecimalArithmeticInput = {
    operation: "subtract",
    left: { unscaled: 12, scale: 1 },
    right: { unscaled: 34, scale: 1 },
    precision: 1,
  };
  const markup = renderLab(EXPECTED_LAB_IDS[0], swappedSubtraction);
  assert.match(markup, /data-viz-name="column-calculation-receipt"/u);
  assert.match(markup, /data-viz-effective-operation="subtract"/u);
  assert.match(markup, /data-viz-top-source="right"/u);
  assert.match(markup, /data-viz-bottom-source="left"/u);
  assert.match(markup, /data-viz-operands-swapped="true"/u);
  assert.match(markup, /data-viz-result-sign="-1"/u);
  assert.match(markup, /data-viz-reconstructed-aligned-result="-22"/u);
  assert.match(markup, /data-viz-exact-decimal="-2.2"/u);
  assert.match(markup, />Effective operation: Subtract</u);
  assert.match(
    markup,
    />Top row: operand B = 34; Bottom row: operand A = 12</u,
  );
  assert.match(
    markup,
    />Rows swapped: yes; Result sign: -1; Reconstructed aligned result: -22\/10\^1 = -2.2</u,
  );
  assert.match(markup, />1.2 − 3.4 = -2.2</u);
  assert.match(markup, />Exact rational: -11\/5</u);
  assert.doesNotMatch(markup, /NaN|Infinity/u);
});

test("reset presents the exact scaled decimal 16.25 and keeps 65/4 as a secondary rational receipt", () => {
  const markup = renderLab(EXPECTED_LAB_IDS[0]);
  assert.match(markup, /data-viz-exact-decimal="16.25"/u);
  assert.match(markup, /data-viz-exact-rational="65\/4"/u);
  assert.match(markup, />12.5 \+ 3.75 = 16.25</u);
  assert.match(markup, />Exact rational: 65\/4</u);
  assert.doesNotMatch(markup, />12.5 \+ 3.75 = 65\/4</u);
});

test("a nonterminating division stays an exact rational instead of claiming a decimal", () => {
  const markup = renderLab(EXPECTED_LAB_IDS[1], {
    operation: "divide",
    left: { unscaled: 1, scale: 0 },
    right: { unscaled: 3, scale: 0 },
    precision: 4,
  });
  assert.match(markup, /data-viz-exact-rational="1\/3"/u);
  assert.match(markup, />1 ÷ 3 = 1\/3</u);
  assert.match(markup, />Exact rational: 1\/3</u);
  assert.doesNotMatch(markup, /Exact decimal: 1\/3/u);
  assert.doesNotMatch(markup, /NaN|Infinity/u);
});

test("all learner controls carry 44px source contracts and all three language label sets are complete", () => {
  assertLocalizedCopy(DECIMAL_ARITHMETIC_COPY);
  const markup = renderLab(EXPECTED_LAB_IDS[0]);
  assert.equal(count(markup, /data-viz-mode-button=/gu), 5);
  assert.equal(count(markup, /data-viz-parameter=/gu), 5);
  assert.equal(count(markup, /min-h-11/gu) >= 10, true);
  assert.match(markup, />Operand A</u);
  assert.match(markup, />Operand B \(non-zero\)</u);
  assert.match(markup, />Exact invariant checks</u);

  const multiplyMarkup = renderLab(EXPECTED_LAB_IDS[0], {
    operation: "multiply",
    left: { unscaled: 125, scale: 1 },
    right: { unscaled: 375, scale: 2 },
    precision: 2,
  });
  assert.match(multiplyMarkup, />Partial products</u);
});

test("source keeps one four-id allowlist, local horizontal scroll, and opaque day/night SVG backgrounds", () => {
  const source = fs.readFileSync(
    "components/visualizations/mainland/DecimalArithmeticLab.tsx",
    "utf8",
  );
  for (const labId of EXPECTED_LAB_IDS) {
    assert.equal(count(source, new RegExp(`"${labId}"`, "gu")), 1, labId);
  }
  assert.equal(count(source, /data-viz-mode-button/gu), 1);
  assert.equal(count(source, /data-viz-reset-model/gu), 1);
  assert.match(source, /overflow-x-auto/u);
  assert.match(source, /min-w-\[760px\]/u);
  assert.match(source, /visualizationThemeForTheme\(theme\)/u);
  assert.match(source, /data-viz-svg-background="opaque"/u);
  assert.doesNotMatch(
    source,
    /backdrop-filter|opacity-|bg-gradient|from-|via-|to-/iu,
  );
});

test("SSR/source coverage explicitly does not claim real-browser collision coverage", () => {
  const verificationScope = {
    browserCollisionCovered: false,
    evidence: "React server markup and source contracts only",
  } as const;
  assert.equal(verificationScope.browserCollisionCovered, false);
  assert.doesNotMatch(
    verificationScope.evidence,
    /browser pass|collision pass/iu,
  );
});
