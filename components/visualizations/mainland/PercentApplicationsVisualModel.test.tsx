import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildPercentApplicationsState,
  type PercentApplicationsInput,
} from "./PercentApplicationsModel";
import {
  PERCENT_APPLICATIONS_VISUAL_COPY,
  PercentApplicationsVisualModel,
  buildPercentApplicationsVisualReceipt,
} from "./PercentApplicationsVisualModel";

const reactGlobal = globalThis as unknown as { React?: typeof React };
let hadOwnReact = false;
let previousReact: typeof React | undefined;

before(() => {
  hadOwnReact = Object.prototype.hasOwnProperty.call(reactGlobal, "React");
  previousReact = reactGlobal.React;
  reactGlobal.React = React;
});

after(() => {
  if (hadOwnReact) reactGlobal.React = previousReact;
  else delete reactGlobal.React;
});

const defaultInput: PercentApplicationsInput = {
  amount: 36,
  base: 240,
  inverseDirection: "increase",
  labId: "bnu-primary-p6-upper-percentage-applications",
  mode: "find-part",
  newValue: 120,
  rateBasisPoints: 1_500,
};

function model(overrides: Partial<PercentApplicationsInput> = {}) {
  return buildPercentApplicationsState({ ...defaultInput, ...overrides });
}

function render(
  overrides: Partial<PercentApplicationsInput> = {},
  language: "en" | "zh" | "zhHans" = "en",
) {
  const exactModel = model(overrides);
  return renderToStaticMarkup(
    <PercentApplicationsVisualModel
      model={exactModel}
      t={(copy) => copy[language]!}
    />,
  );
}

function count(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].length;
}

function geometryReceiptFromMarkup(markup: string): unknown {
  const encoded = markup.match(/data-viz-geometry-receipt="([^"]+)"/u)?.[1];
  assert.ok(encoded, "serialized geometry receipt must exist");
  return JSON.parse(
    encoded.replace(/&quot;/gu, '"').replace(/&amp;/gu, "&"),
  ) as unknown;
}

test("conversion geometry reconstructs fraction, percent, whole cells, and a partial cell", () => {
  const exactModel = model({ mode: "convert", rateBasisPoints: 1_250 });
  const receipt = buildPercentApplicationsVisualReceipt(exactModel);
  assert.deepEqual(receipt, {
    decimal: "0.125",
    filledWholeCells: 12,
    fraction: "1/8",
    gridCount: 1,
    kind: "conversion",
    partialCellBasisPoints: 50,
    percentText: "12.5%",
    status: "supported",
    totalCells: 100,
  });
  assert.equal(
    receipt.status === "supported" && receipt.kind === "conversion"
      ? receipt.filledWholeCells * 100 + receipt.partialCellBasisPoints
      : -1,
    exactModel.rate.basisPoints,
  );

  const markup = render({ mode: "convert", rateBasisPoints: 1_250 });
  assert.equal(count(markup, /data-viz-name="percent-grid-cell"/gu), 100);
  assert.equal(count(markup, /data-viz-name="percent-grid-partial"/gu), 1);
  assert.match(markup, /data-viz-painted-mark-count="101"/u);
  assert.deepEqual(geometryReceiptFromMarkup(markup), receipt);
});

test("conversion supports multiple wholes instead of silently clipping above 100 percent", () => {
  const exactModel = model({ mode: "convert", rateBasisPoints: 25_000 });
  const receipt = buildPercentApplicationsVisualReceipt(exactModel);
  assert.equal(receipt.status, "supported");
  if (receipt.status !== "supported" || receipt.kind !== "conversion") return;
  assert.equal(receipt.gridCount, 3);
  assert.equal(receipt.totalCells, 300);
  assert.equal(receipt.filledWholeCells, 250);
  assert.equal(receipt.partialCellBasisPoints, 0);
  const markup = render({ mode: "convert", rateBasisPoints: 25_000 });
  assert.equal(count(markup, /data-viz-name="percent-grid-cell"/gu), 300);
  assert.doesNotMatch(markup, /data-viz-name="percent-grid-partial"/u);
});

test("find-part and find-whole bar receipts reconstruct the exact model", () => {
  const partModel = model({ base: 240, mode: "find-part", rateBasisPoints: 1_500 });
  const part = buildPercentApplicationsVisualReceipt(partModel);
  assert.deepEqual(part, {
    kind: "find-part",
    part: "36/1",
    rate: "3/20",
    reconstruction: "36/1",
    status: "supported",
    whole: "240/1",
  });

  const wholeModel = model({ amount: 36, mode: "find-whole", rateBasisPoints: 1_500 });
  const whole = buildPercentApplicationsVisualReceipt(wholeModel);
  assert.deepEqual(whole, {
    kind: "find-whole",
    knownPart: "36/1",
    rate: "3/20",
    reconstruction: "36/1",
    status: "supported",
    whole: "240/1",
  });

  for (const [overrides, receipt] of [
    [{ base: 240, mode: "find-part" as const, rateBasisPoints: 1_500 }, part],
    [{ amount: 36, mode: "find-whole" as const, rateBasisPoints: 1_500 }, whole],
  ] as const) {
    const markup = render(overrides);
    assert.equal(count(markup, /data-viz-painted-mark="true"/gu), 2);
    assert.match(markup, /data-viz-painted-mark-count="2"/u);
    assert.deepEqual(geometryReceiptFromMarkup(markup), receipt);
  }
});

test("increase and decrease geometry binds original, change, and new values", () => {
  for (const [mode, expected] of [
    ["increase", { change: "20/1", newValue: "100/1", original: "80/1" }],
    ["decrease", { change: "20/1", newValue: "60/1", original: "80/1" }],
  ] as const) {
    const exactModel = model({ base: 80, mode, rateBasisPoints: 2_500 });
    const receipt = buildPercentApplicationsVisualReceipt(exactModel);
    assert.deepEqual(receipt, {
      absoluteChange: expected.change,
      direction: mode,
      kind: "percent-change",
      multiplier: mode === "increase" ? "5/4" : "3/4",
      newValue: expected.newValue,
      original: expected.original,
      reconstruction: expected.newValue,
      status: "supported",
    });
    const markup = render({ base: 80, mode, rateBasisPoints: 2_500 });
    assert.equal(count(markup, /data-viz-name="percent-change-bar"/gu), 3);
    assert.match(markup, /data-viz-painted-mark-count="3"/u);
  }
});

test("discount geometry keeps original, discount amount, and sale price separate", () => {
  const exactModel = model({ base: 250, mode: "discount", rateBasisPoints: 2_000 });
  const receipt = buildPercentApplicationsVisualReceipt(exactModel);
  assert.deepEqual(receipt, {
    discountAmount: "50/1",
    discountRate: "1/5",
    kind: "discount",
    originalPrice: "250/1",
    reconstruction: "250/1",
    salePrice: "200/1",
    status: "supported",
  });
  const markup = render({ base: 250, mode: "discount", rateBasisPoints: 2_000 });
  assert.equal(count(markup, /data-viz-name="discount-value-bar"/gu), 3);
  assert.match(markup, /data-viz-painted-mark-count="3"/u);
  assert.deepEqual(geometryReceiptFromMarkup(markup), receipt);
});

test("inverse geometry reconstructs the original from the observed value", () => {
  const exactModel = model({
    inverseDirection: "increase",
    mode: "inverse",
    newValue: 120,
    rateBasisPoints: 2_000,
  });
  const receipt = buildPercentApplicationsVisualReceipt(exactModel);
  assert.deepEqual(receipt, {
    direction: "increase",
    forwardCheck: "120/1",
    kind: "inverse",
    multiplier: "6/5",
    observedNewValue: "120/1",
    original: "100/1",
    status: "supported",
  });
  const markup = render({
    inverseDirection: "increase",
    mode: "inverse",
    newValue: 120,
    rateBasisPoints: 2_000,
  });
  assert.equal(count(markup, /data-viz-name="inverse-value-bar"/gu), 2);
  assert.equal(count(markup, /data-viz-name="inverse-reconstruction-arrow"/gu), 1);
  assert.match(markup, /data-viz-painted-mark-count="3"/u);
});

test("inverse bar lengths preserve the exact original-to-observed ratio", () => {
  const markup = render({
    inverseDirection: "increase",
    mode: "inverse",
    newValue: 120,
    rateBasisPoints: 2_000,
  });
  const bars = [
    ...markup.matchAll(
      /data-viz-name="inverse-value-bar"[^>]*data-viz-exact="([^"]+)"[^>]*?\swidth="([^"]+)"/gu,
    ),
  ];
  assert.equal(bars.length, 2);
  const [[, originalExact, originalWidth], [, observedExact, observedWidth]] = bars;
  assert.equal(originalExact, "100/1");
  assert.equal(observedExact, "120/1");
  assert.ok(
    Math.abs(
      Number(originalWidth) / Number(observedWidth) -
        100 / 120,
    ) < 1e-12,
  );
});

test("zero-magnitude physical bars are explicit unsupported states with no affirmative SVG", () => {
  const cases: Partial<PercentApplicationsInput>[] = [
    { base: 0, mode: "find-part" },
    { amount: 0, mode: "find-whole" },
    { base: 0, mode: "increase" },
    { base: 0, mode: "discount" },
    { mode: "inverse", newValue: 0 },
  ];
  for (const overrides of cases) {
    const exactModel = model(overrides);
    const receipt = buildPercentApplicationsVisualReceipt(exactModel);
    assert.deepEqual(receipt, {
      kind: exactModel.visibleReceipt.kind,
      reason: "zero-magnitude-has-no-positive-area",
      status: "unsupported",
    });
    const markup = render(overrides);
    assert.match(markup, /data-viz-percent-visual-status="unsupported"/u);
    assert.match(markup, /data-viz-unsupported-reason="zero-magnitude-has-no-positive-area"/u);
    assert.doesNotMatch(markup, /<svg/u);
    assert.doesNotMatch(markup, /data-viz-painted-mark="true"/u);
  }
});

test("every supported visual has nonzero independent coverage and exact owner receipts", () => {
  const cases: Partial<PercentApplicationsInput>[] = [
    { mode: "convert", rateBasisPoints: 0 },
    { mode: "find-part" },
    { mode: "find-whole" },
    { mode: "increase" },
    { mode: "decrease" },
    { mode: "discount" },
    { mode: "inverse" },
  ];
  for (const overrides of cases) {
    const expectedReceipt = buildPercentApplicationsVisualReceipt(model(overrides));
    assert.equal(expectedReceipt.status, "supported");
    const markup = render(overrides);
    const painted = Number(markup.match(/data-viz-painted-mark-count="(\d+)"/u)?.[1]);
    assert.ok(Number.isSafeInteger(painted) && painted > 0);
    assert.equal(count(markup, /data-viz-painted-mark="true"/gu), painted);
    assert.equal(count(markup, /data-viz-percent-visual=/gu), 1);
    assert.match(markup, /data-viz-owner="percent-applications"/u);
    assert.deepEqual(geometryReceiptFromMarkup(markup), expectedReceipt);
  }
});

test("visual learner copy renders in English, Traditional Chinese, and Simplified Chinese", () => {
  for (const [key, copy] of Object.entries(PERCENT_APPLICATIONS_VISUAL_COPY)) {
    assert.match(copy.en, /\S/u, `${key}.en`);
    assert.match(copy.zh, /[\u3400-\u9fff]/u, `${key}.zh`);
    assert.match(copy.zhHans!, /[\u3400-\u9fff]/u, `${key}.zhHans`);
  }
  for (const language of ["en", "zh", "zhHans"] as const) {
    const markup = render({ mode: "discount" }, language);
    const visibleText = markup.replace(/<[^>]*>/gu, " ");
    assert.ok(markup.includes(PERCENT_APPLICATIONS_VISUAL_COPY.discount[language]!));
    assert.ok(markup.includes(PERCENT_APPLICATIONS_VISUAL_COPY.originalPrice[language]!));
    assert.ok(markup.includes(PERCENT_APPLICATIONS_VISUAL_COPY.discountAmount[language]!));
    assert.ok(markup.includes(PERCENT_APPLICATIONS_VISUAL_COPY.salePrice[language]!));
    if (language !== "en") {
      assert.doesNotMatch(visibleText, /Original price|Discount:|Sale price/u);
    }
    assert.doesNotMatch(visibleText, /percent-applications-v1|discount-base-consistency/u);
  }
});

test("opaque SVG ownership exists only on the real SVG element", () => {
  const markup = render({ mode: "find-part" });
  assert.equal(count(markup, /data-viz-svg-background="opaque"/gu), 1);
  assert.match(markup, /<svg[^>]*data-viz-svg-background="opaque"/u);
  assert.doesNotMatch(markup, /<div[^>]*data-viz-svg-background/u);
  assert.doesNotMatch(markup, /<figure[^>]*data-viz-svg-background/u);
});
