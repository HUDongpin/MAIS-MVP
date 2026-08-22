import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";

import { AppProviders } from "../../providers/AppProviders";
import { visualizationLabCatalog } from "../../../data/visualizationLabs";
import { DecimalArithmeticLab } from "./DecimalArithmeticLab";
import { MultiDigitOperationsLab } from "./MultiDigitOperationsLab";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const router = {
  back() {},
  forward() {},
  prefetch() {
    return Promise.resolve();
  },
  push() {},
  refresh() {},
  replace() {}
};

function count(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].length;
}

test("G01 and G02 rendering or state derivation never emits a learning event", () => {
  const events: string[] = [];
  const record = (type: "visualization-probe" | "visualization-reset" | "visualization-slider") => {
    events.push(type);
  };
  const decimalLab = visualizationLabCatalog.find(
    ({ labId }) => labId === "bnu-primary-p4-lower-decimal-meaning-add-sub"
  );
  assert.ok(decimalLab);

  renderToStaticMarkup(
    <AppRouterContext.Provider value={router as never}>
      <PathnameContext.Provider value="/visualization-lab">
        <AppProviders>
          <MultiDigitOperationsLab
            labId="bnu-primary-p3-lower-two-digit-multiplication"
            onLearningEvent={record}
          />
          <DecimalArithmeticLab lab={decimalLab} onLearningEvent={record} />
        </AppProviders>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  );

  assert.deepEqual(events, []);
});

test("G01 and G02 retain physical commit wiring while G03-G06 stay untouched and G07 joins", () => {
  const multiDigitSource = fs.readFileSync(
    "components/visualizations/mainland/MultiDigitOperationsLab.tsx",
    "utf8"
  );
  const decimalSource = fs.readFileSync(
    "components/visualizations/mainland/DecimalArithmeticLab.tsx",
    "utf8"
  );
  const hostSource = fs.readFileSync(
    "components/visualizations/ConfiguredVisualizationLab.tsx",
    "utf8"
  );

  assert.match(multiDigitSource, /createMainlandPhysicalCommitHandlers/u);
  assert.match(multiDigitSource, /onLearningEvent\?: MainlandPhysicalCommitRecorder/u);
  assert.equal(count(multiDigitSource, /onPointerUp=\{recordRangeCommit\}/gu), 3);
  assert.equal(
    count(
      multiDigitSource,
      /onKeyUp=\{\(event\) => recordRangeKeyCommit\(event\.key, event\)\}/gu
    ),
    3
  );
  assert.match(multiDigitSource, /function selectMode[\s\S]*?recordModeCommit\(\);/u);
  assert.match(
    multiDigitSource,
    /function selectEstimateOperation[\s\S]*?recordModeCommit\(\);/u
  );
  assert.match(multiDigitSource, /function selectRoundingPlace[\s\S]*?recordModeCommit\(\);/u);
  assert.match(multiDigitSource, /function reset[\s\S]*?recordResetCommit\(\);/u);

  assert.match(decimalSource, /createMainlandPhysicalCommitHandlers/u);
  assert.match(decimalSource, /onLearningEvent\?: MainlandPhysicalCommitRecorder/u);
  assert.match(decimalSource, /onCommit: \(\) => void;/u);
  assert.match(
    decimalSource,
    /onKeyCommit: \(event: KeyboardEvent<HTMLInputElement>\) => void;/u
  );
  assert.equal(count(decimalSource, /onPointerUp=\{onCommit\}/gu), 1);
  assert.equal(count(decimalSource, /onKeyUp=\{onKeyCommit\}/gu), 1);
  assert.equal(count(decimalSource, /onCommit=\{recordRangeCommit\}/gu), 4);
  assert.equal(
    count(
      decimalSource,
      /onKeyCommit=\{\(event\) => recordRangeKeyCommit\(event\.key, event\)\}/gu
    ),
    4
  );
  assert.match(decimalSource, /function setOperation[\s\S]*?recordModeCommit\(\);/u);
  assert.match(decimalSource, /function reset[\s\S]*?recordResetCommit\(\);/u);

  assert.match(
    hostSource,
    /function recordDedicatedPhysicalCommit[\s\S]*?preservePhysicalCommit: true/u
  );
  assert.equal(
    count(
      hostSource,
      /onLearningEvent=\{recordDedicatedPhysicalCommit\}/gu
    ),
    3
  );
  const untouchedBranches = hostSource.slice(
    hostSource.indexOf('productionRenderer === "mainland-fraction-operations"'),
    hostSource.indexOf('productionRenderer === "mainland-symbolic-expressions"')
  );
  assert.doesNotMatch(untouchedBranches, /onLearningEvent/u);
  const g07Branch = hostSource.slice(
    hostSource.indexOf('productionRenderer === "mainland-symbolic-expressions"'),
    hostSource.indexOf('productionRenderer === "hk-dedicated"')
  );
  assert.match(g07Branch, /onLearningEvent=\{recordDedicatedPhysicalCommit\}/u);
});
