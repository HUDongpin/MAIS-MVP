import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";

import { AppProviders } from "../../providers/AppProviders";
import {
  createMainlandPhysicalCommitHandlers,
  type MainlandPhysicalCommitLearningEvent,
} from "./MainlandPhysicalCommitAnalytics";
import {
  MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS,
  SymbolicExpressionsLab,
  createSymbolicExpressionsLabUiState,
  reduceSymbolicExpressionsLabUiState,
} from "./SymbolicExpressionsLab";
import {
  SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST,
  type SymbolicExpressionsLabId,
} from "./SymbolicExpressionsModel";
import { symbolicExpressionsControlDescriptorFor } from "./SymbolicExpressionsControlDomain";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

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

const rangeCommitKeys = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
] as const;

function count(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].length;
}

function modeCount(labId: SymbolicExpressionsLabId) {
  return SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId].length;
}

test("G07 rendering and pure state derivation emit zero learning events for all exact labs", () => {
  const events: MainlandPhysicalCommitLearningEvent[] = [];

  for (const labId of MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    let uiState = createSymbolicExpressionsLabUiState(labId);
    for (const mode of SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId]) {
      uiState = reduceSymbolicExpressionsLabUiState(uiState, {
        controllerId: "mode",
        kind: "controller",
        value: mode,
      });
    }
    uiState = reduceSymbolicExpressionsLabUiState(uiState, { kind: "reset" });
    assert.equal(uiState.domainState.labId, labId);

    const markup = renderToStaticMarkup(
      <AppRouterContext.Provider value={router as never}>
        <PathnameContext.Provider value="/visualization-lab">
          <AppProviders>
            <SymbolicExpressionsLab
              labId={labId}
              onLearningEvent={(type) => events.push(type)}
            />
          </AppProviders>
        </PathnameContext.Provider>
      </AppRouterContext.Provider>,
    );

    assert.equal(
      count(markup, /data-viz-mode-button="true"/gu),
      modeCount(labId),
      `${labId} must render every allowed physical mode choice`,
    );
  }

  assert.deepEqual(events, []);
});

test("G07 every allowed physical mode choice maps once to production probe taxonomy", () => {
  const events: MainlandPhysicalCommitLearningEvent[] = [];
  const { recordModeCommit } = createMainlandPhysicalCommitHandlers((type) =>
    events.push(type),
  );
  const expectedModeCommits = MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS.reduce(
    (total, labId) => total + modeCount(labId),
    0,
  );

  for (const labId of MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    for (const _mode of SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId]) {
      recordModeCommit();
    }
  }

  assert.equal(events.length, expectedModeCommits);
  assert.ok(events.every((type) => type === "visualization-probe"));
});

test("G07 every range commits pointer boundaries and unmodified allowlisted keys exactly once", () => {
  const events: MainlandPhysicalCommitLearningEvent[] = [];
  const { recordRangeCommit, recordRangeKeyCommit } =
    createMainlandPhysicalCommitHandlers((type) => events.push(type));
  let rangeCount = 0;

  for (const labId of MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    for (const mode of SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId]) {
      const descriptor = symbolicExpressionsControlDescriptorFor(labId, mode);
      for (const control of descriptor.controls) {
        assert.ok(control.min <= control.max);
        rangeCount += 1;
        recordRangeCommit();
        recordRangeCommit();
        for (const key of rangeCommitKeys) recordRangeKeyCommit(key);
      }
    }
  }

  assert.equal(events.length, rangeCount * (2 + rangeCommitKeys.length));
  assert.ok(events.every((type) => type === "visualization-slider"));
});

test("G07 range commits reject Tab, modifiers, and character keys", () => {
  const events: MainlandPhysicalCommitLearningEvent[] = [];
  const { recordRangeKeyCommit } = createMainlandPhysicalCommitHandlers((type) =>
    events.push(type),
  );

  for (const key of ["Tab", "Shift", "Control", "Alt", "Meta", "a", "7", " "]) {
    recordRangeKeyCommit(key);
  }
  recordRangeKeyCommit("ArrowRight", { altKey: true });
  recordRangeKeyCommit("ArrowRight", { ctrlKey: true });
  recordRangeKeyCommit("ArrowRight", { metaKey: true });
  recordRangeKeyCommit("ArrowRight", { shiftKey: true });

  assert.deepEqual(events, []);
});

test("G07 each exact lab reset click maps once to production reset taxonomy", () => {
  const events: MainlandPhysicalCommitLearningEvent[] = [];
  const { recordResetCommit } = createMainlandPhysicalCommitHandlers((type) =>
    events.push(type),
  );

  for (const _labId of MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    recordResetCommit();
  }

  assert.equal(events.length, MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS.length);
  assert.ok(events.every((type) => type === "visualization-reset"));
});

test("G07 source wires only physical commits and retains live host identity", () => {
  const componentSource = fs.readFileSync(
    "components/visualizations/mainland/SymbolicExpressionsLab.tsx",
    "utf8",
  );
  const hostSource = fs.readFileSync(
    "components/visualizations/ConfiguredVisualizationLab.tsx",
    "utf8",
  );

  assert.match(componentSource, /createMainlandPhysicalCommitHandlers/u);
  assert.match(componentSource, /onLearningEvent\?: MainlandPhysicalCommitRecorder/u);
  assert.match(
    componentSource,
    /function selectMode[\s\S]*?dispatch\([\s\S]*?recordModeCommit\(\);/u,
  );
  assert.match(componentSource, /onClick=\{\(\) => selectMode\(mode\)\}/u);
  assert.equal(count(componentSource, /onPointerUp=\{onCommit\}/gu), 1);
  assert.equal(count(componentSource, /onKeyUp=\{onKeyCommit\}/gu), 1);
  assert.equal(count(componentSource, /onCommit=\{recordRangeCommit\}/gu), 1);
  assert.equal(
    count(
      componentSource,
      /onKeyCommit=\{\(event\) => recordRangeKeyCommit\(event\.key, event\)\}/gu,
    ),
    1,
  );
  assert.match(
    componentSource,
    /function reset[\s\S]*?dispatch\(\{ kind: "reset" \}\);[\s\S]*?recordResetCommit\(\);/u,
  );
  assert.match(componentSource, /onClick=\{reset\}/u);
  const updateControlSource = componentSource.slice(
    componentSource.indexOf("function updateControl"),
    componentSource.indexOf("function selectMode"),
  );
  assert.doesNotMatch(
    updateControlSource,
    /record(?:Mode|Range|Reset)Commit/u,
  );

  assert.equal(
    count(hostSource, /onLearningEvent=\{recordDedicatedPhysicalCommit\}/gu),
    3,
  );
  assert.match(
    hostSource,
    /productionRenderer === "mainland-symbolic-expressions"[\s\S]*?<SymbolicExpressionsLab[\s\S]*?onLearningEvent=\{recordDedicatedPhysicalCommit\}/u,
  );
  const g03ThroughG06Branches = hostSource.slice(
    hostSource.indexOf('productionRenderer === "mainland-fraction-operations"'),
    hostSource.indexOf('productionRenderer === "mainland-symbolic-expressions"'),
  );
  assert.doesNotMatch(g03ThroughG06Branches, /onLearningEvent/u);
  assert.match(
    hostSource,
    /function recordDedicatedPhysicalCommit[\s\S]*?recordLearningEvent\([\s\S]*?source: lab\?\.analyticsSource \?\? "visualization-lab"[\s\S]*?topicId: lab\?\.topicId \?\? topicId \?\? "configured-visualization"[\s\S]*?preservePhysicalCommit: true/u,
  );
});

test("G07 C10 public production evidence boundary remains native-provenance fail-closed", () => {
  const browserSource = fs.readFileSync(
    "tests/e2e/china-mainland-g07-production-browser.spec.ts",
    "utf8",
  );
  const receiptSource = fs.readFileSync(
    "tests/e2e/china-mainland-g07-production-receipt.ts",
    "utf8",
  );

  assert.match(
    browserSource,
    /validateG07ProductionBrowserReceipt\(receipt, project\)/u,
  );
  assert.doesNotMatch(
    browserSource,
    /validateG07UntrustedStructuralReceipt\(receipt, project\)/u,
  );
  assert.match(
    receiptSource,
    /export function validateG07ProductionBrowserReceipt[\s\S]*?validateG07UntrustedStructuralReceipt\(candidate, project\);[\s\S]*?native physical provenance is unavailable/u,
  );
});
