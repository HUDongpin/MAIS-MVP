import assert from "node:assert/strict";
import test from "node:test";
import { HK_DEDICATED_LAB_IDS } from "../../components/visualizations/hk/hkVisualizationLabRegistry";
import {
  HK_VISUALIZATION_MATH_ORACLE_CONTRACTS,
  validateHKVisualizationMathOracleContracts,
  type HKVisualizationMathOracleContract,
  type HKVisualizationMathOracleValidationCode
} from "./hk-visualization-math-oracle-contract";

function issueCodes(contracts: readonly HKVisualizationMathOracleContract[]) {
  return new Set(validateHKVisualizationMathOracleContracts(contracts).map(({ code }) => code));
}

function replaceContract(
  labId: string,
  update: (contract: HKVisualizationMathOracleContract) => HKVisualizationMathOracleContract
) {
  return HK_VISUALIZATION_MATH_ORACLE_CONTRACTS.map((contract) => (
    contract.labId === labId ? update(contract) : contract
  ));
}

function assertRejected(
  contracts: readonly HKVisualizationMathOracleContract[],
  code: HKVisualizationMathOracleValidationCode
) {
  assert.ok(issueCodes(contracts).has(code), `Expected fail-closed issue ${code}.`);
}

test("the math-oracle registry covers exactly the 44 dedicated HK topics", () => {
  assert.equal(HK_VISUALIZATION_MATH_ORACLE_CONTRACTS.length, 44);
  assert.equal(new Set(HK_VISUALIZATION_MATH_ORACLE_CONTRACTS.map(({ labId }) => labId)).size, 44);
  assert.deepEqual(
    [...HK_VISUALIZATION_MATH_ORACLE_CONTRACTS.map(({ labId }) => labId)].sort(),
    [...HK_DEDICATED_LAB_IDS].sort()
  );
  assert.deepEqual(validateHKVisualizationMathOracleContracts(HK_VISUALIZATION_MATH_ORACLE_CONTRACTS), []);
});

test("every topic declares root-scoped state, formula, reset, topology, and named mathematical evidence", () => {
  for (const contract of HK_VISUALIZATION_MATH_ORACLE_CONTRACTS) {
    assert.ok(contract.rootSelector.includes(`[data-hk-viz-topic="${contract.labId}"]`));
    assert.ok(contract.state.selector.startsWith(contract.rootSelector));
    assert.ok(contract.formulaSelector.startsWith(contract.rootSelector));
    assert.ok(contract.resetSelector.startsWith(contract.rootSelector));
    assert.ok(contract.state.canonicalKeys.length > 0);
    assert.deepEqual(contract.state.selectorKeys, contract.state.canonicalKeys);
    assert.deepEqual(Object.keys(contract.state.reset), contract.state.canonicalKeys);
    assert.equal(Array.isArray(contract.modeTopology), true);
    for (const group of contract.modeTopology) {
      assert.deepEqual(group.modeSelectors.map(({ modeId }) => modeId), group.modeIds);
      assert.ok(group.modeSelectors.every(({ selector }) => selector.startsWith(contract.rootSelector)));
    }
    assert.ok(contract.evidenceSelectors.length > 0);
    assert.ok(contract.evidenceSelectors.every((selector) => (
      selector.startsWith(contract.rootSelector) && selector.includes("[data-viz-name=")
    )));
  }
});

test("p5 composite charts use the live array state schema rather than the stale scalar projection", () => {
  const contract = HK_VISUALIZATION_MATH_ORACLE_CONTRACTS.find(({ labId }) => labId === "p5-charts-averages");
  assert.ok(contract);
  assert.deepEqual(contract.state.canonicalKeys, ["selectedCategory", "firstSeries", "secondSeries"]);
  assert.deepEqual(contract.state.selectorKeys, ["selectedCategory", "firstSeries", "secondSeries"]);
  assert.deepEqual(contract.state.reset, {
    selectedCategory: "B",
    firstSeries: [6, 8, 5, 9],
    secondSeries: [4, 7, 8, 6]
  });
  assert.equal(contract.state.canonicalKeys.includes("firstSeriesValue"), false);
  assert.equal(contract.state.canonicalKeys.includes("secondSeriesValue"), false);
  assert.match(contract.formulaSelector, /data-hk-viz-formula="p5-charts-averages"/);
  assert.ok(contract.evidenceSelectors.some((selector) => selector.includes('data-viz-name="paired-data-bars"')));
});

test("validator rejects a missing dedicated topic", () => {
  assertRejected(HK_VISUALIZATION_MATH_ORACLE_CONTRACTS.slice(1), "missing-topic");
});

test("validator rejects a duplicate dedicated topic", () => {
  assertRejected(
    [...HK_VISUALIZATION_MATH_ORACLE_CONTRACTS, HK_VISUALIZATION_MATH_ORACLE_CONTRACTS[0]],
    "duplicate-topic"
  );
});

test("validator rejects an extra topic id", () => {
  const [first, ...rest] = HK_VISUALIZATION_MATH_ORACLE_CONTRACTS;
  assertRejected([{ ...first, labId: "outside-hk-dedicated-registry" }, ...rest], "extra-topic");
});

test("validator rejects empty selectors", () => {
  assertRejected(
    replaceContract("integers", (contract) => ({ ...contract, formulaSelector: "  " })),
    "empty-selector"
  );
});

test("validator rejects an unknown oracle family", () => {
  assertRejected(
    replaceContract("integers", (contract) => ({ ...contract, oracleFamily: "unknown-family" })),
    "unknown-family"
  );
});

test("validator rejects a conditional control that omits its parent mode", () => {
  assertRejected(
    replaceContract("p1-measurement-time", (contract) => ({
      ...contract,
      conditionalControls: contract.conditionalControls.map((control, index) => (
        index === 0 ? { ...control, parentMode: undefined } : control
      ))
    })),
    "conditional-parent-mode-missing"
  );
});

test("validator rejects a conditional control that names a nonexistent parent mode", () => {
  assertRejected(
    replaceContract("p2-money-time", (contract) => ({
      ...contract,
      conditionalControls: contract.conditionalControls.map((control, index) => (
        index === 0
          ? { ...control, parentMode: { groupId: "model", modeId: "not-a-real-mode" } }
          : control
      ))
    })),
    "conditional-parent-mode-unknown"
  );
});

test("validator rejects canonical state-key versus state-selector-key drift", () => {
  assertRejected(
    replaceContract("p5-charts-averages", (contract) => ({
      ...contract,
      state: { ...contract.state, selectorKeys: ["selectedCategory", "firstSeriesValue", "secondSeriesValue"] }
    })),
    "state-selector-key-drift"
  );
});

test("validator rejects reset state-key drift", () => {
  assertRejected(
    replaceContract("functions", (contract) => ({
      ...contract,
      state: { ...contract.state, reset: { a: 1, b: 0, activeMode: "linear" } }
    })),
    "reset-state-key-drift"
  );
});

test("validator rejects generic data-viz-mark evidence without a topic-specific name", () => {
  assertRejected(
    replaceContract("integers", (contract) => ({
      ...contract,
      evidenceSelectors: [`${contract.rootSelector} [data-viz-mark]`]
    })),
    "generic-mark-only-evidence"
  );
});
