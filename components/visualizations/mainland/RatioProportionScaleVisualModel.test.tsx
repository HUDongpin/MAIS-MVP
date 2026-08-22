import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  RATIO_PROPORTION_SCALE_UNITS,
  buildRatioProportionScaleState,
  type RatioProportionScaleInput,
  type RatioProportionScaleState,
} from "./RatioProportionScaleModel";
import {
  RATIO_PROPORTION_SCALE_VISUAL_COPY,
  RatioProportionScaleVisualModel,
  buildRatioProportionScaleVisualReceipt,
} from "./RatioProportionScaleVisualModel";

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

const defaultInput: RatioProportionScaleInput = {
  actualUnit: "m",
  drawingLength: 5,
  drawingUnit: "cm",
  labId: "pep-primary-p6-lower-ratio-proportion-scale",
  mode: "equivalent-ratios",
  ratioA: 2,
  ratioB: 3,
  scaleFactor: 4,
};

function model(overrides: Partial<RatioProportionScaleInput> = {}) {
  return buildRatioProportionScaleState({ ...defaultInput, ...overrides });
}

function render(
  overrides: Partial<RatioProportionScaleInput> = {},
  language: "en" | "zh" | "zhHans" = "en",
) {
  return renderToStaticMarkup(
    <RatioProportionScaleVisualModel
      model={model(overrides)}
      t={(copy) => copy[language]!}
    />,
  );
}

function count(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].length;
}

function visualReceiptFromMarkup(markup: string): unknown {
  const encoded = markup.match(/data-viz-geometry-receipt="([^"]+)"/u)?.[1];
  assert.ok(encoded, "serialized geometry receipt must exist");
  return JSON.parse(
    encoded.replace(/&quot;/gu, '"').replace(/&amp;/gu, "&"),
  ) as unknown;
}

test("equivalent-ratio bars bind both ratios, one factor, and equal cross-products", () => {
  const exactModel = model({
    mode: "equivalent-ratios",
    ratioA: 2,
    ratioB: 3,
    scaleFactor: 4,
  });
  const receipt = buildRatioProportionScaleVisualReceipt(exactModel);
  assert.deepEqual(receipt, {
    crossProducts: { left: "24/1", right: "24/1" },
    firstRatio: { antecedent: "2/1", consequent: "3/1" },
    kind: "equivalent-ratios",
    scaleFactor: "4/1",
    secondRatio: { antecedent: "8/1", consequent: "12/1" },
    status: "supported",
  });
  const markup = render({ mode: "equivalent-ratios" });
  assert.equal(count(markup, /data-viz-name="ratio-bar"/gu), 4);
  assert.equal(count(markup, /data-viz-name="ratio-scale-arrow"/gu), 1);
  assert.match(markup, /data-viz-painted-mark-count="5"/u);
  assert.deepEqual(visualReceiptFromMarkup(markup), receipt);
});

test("direct-proportion plot binds two ordered pairs to one exact constant", () => {
  const exactModel = model({
    mode: "direct-proportion",
    ratioA: 3,
    ratioB: 5,
    scaleFactor: 4,
  });
  const receipt = buildRatioProportionScaleVisualReceipt(exactModel);
  assert.deepEqual(receipt, {
    constantK: { first: "5/3", second: "5/3" },
    crossProducts: { left: "60/1", right: "60/1" },
    firstPair: { dependent: "5/1", independent: "3/1" },
    kind: "direct-proportion",
    scaleFactor: "4/1",
    secondPair: { dependent: "20/1", independent: "12/1" },
    status: "supported",
  });
  const markup = render({
    mode: "direct-proportion",
    ratioA: 3,
    ratioB: 5,
  });
  assert.equal(count(markup, /data-viz-name="direct-axis"/gu), 2);
  assert.equal(count(markup, /data-viz-name="direct-ray"/gu), 1);
  assert.equal(count(markup, /data-viz-name="direct-point"/gu), 2);
  assert.match(markup, /data-viz-painted-mark-count="5"/u);
  assert.deepEqual(visualReceiptFromMarkup(markup), receipt);
});

test("inverse-proportion rectangles preserve one exact product under reciprocal scaling", () => {
  const exactModel = model({
    mode: "inverse-proportion",
    ratioA: 4,
    ratioB: 9,
    scaleFactor: 3,
  });
  const receipt = buildRatioProportionScaleVisualReceipt(exactModel);
  assert.deepEqual(receipt, {
    constantProduct: { first: "36/1", second: "36/1" },
    firstPair: { first: "4/1", second: "9/1" },
    kind: "inverse-proportion",
    scaleFactor: "3/1",
    secondPair: { first: "12/1", second: "3/1" },
    status: "supported",
  });
  const markup = render({
    mode: "inverse-proportion",
    ratioA: 4,
    ratioB: 9,
    scaleFactor: 3,
  });
  assert.equal(count(markup, /data-viz-name="inverse-area"/gu), 2);
  assert.equal(count(markup, /data-viz-name="inverse-transform-arrow"/gu), 1);
  assert.match(markup, /data-viz-painted-mark-count="3"/u);
  assert.deepEqual(visualReceiptFromMarkup(markup), receipt);
});

test("scale drawing visibly binds drawing length, scale factor, exact conversion, and actual length", () => {
  const exactModel = model({
    actualUnit: "m",
    drawingLength: 5,
    drawingUnit: "cm",
    mode: "scale-drawing",
    scaleFactor: 100,
  });
  const receipt = buildRatioProportionScaleVisualReceipt(exactModel);
  assert.deepEqual(receipt, {
    actualDimension: { length: "5/1", unit: "m" },
    actualInDrawingUnits: { length: "500/1", unit: "cm" },
    drawingDimension: { length: "5/1", unit: "cm" },
    kind: "scale-drawing",
    reconstructionInDrawingUnits: "500/1",
    scaleFactor: "100/1",
    scaleRatio: { actual: "100/1", drawing: "1/1" },
    status: "supported",
    unitConversion: {
      actualUnitInMillimetres: "1000/1",
      drawingUnitInMillimetres: "10/1",
    },
  });
  const markup = render({
    actualUnit: "m",
    drawingLength: 5,
    drawingUnit: "cm",
    mode: "scale-drawing",
    scaleFactor: 100,
  });
  assert.equal(count(markup, /data-viz-name="scale-length"/gu), 2);
  assert.equal(count(markup, /data-viz-name="scale-conversion-arrow"/gu), 1);
  assert.match(markup, /data-viz-painted-mark-count="3"/u);
  assert.match(markup, /data-viz-unit="cm"/u);
  assert.match(markup, /data-viz-actual-unit="m"/u);
  assert.deepEqual(visualReceiptFromMarkup(markup), receipt);
});

test("all mm, cm, m, and km unit pairs retain exact conversion receipts", () => {
  const millimetres = { cm: 10, km: 1_000_000, m: 1_000, mm: 1 } as const;
  let checked = 0;
  for (const drawingUnit of RATIO_PROPORTION_SCALE_UNITS) {
    for (const actualUnit of RATIO_PROPORTION_SCALE_UNITS) {
      const exactModel = model({
        actualUnit,
        drawingLength: 7,
        drawingUnit,
        mode: "scale-drawing",
        scaleFactor: 125,
      });
      const receipt = buildRatioProportionScaleVisualReceipt(exactModel);
      assert.equal(receipt.status, "supported");
      assert.equal(receipt.kind, "scale-drawing");
      if (receipt.status !== "supported" || receipt.kind !== "scale-drawing") {
        continue;
      }
      assert.deepEqual(receipt.unitConversion, {
        actualUnitInMillimetres: `${millimetres[actualUnit]}/1`,
        drawingUnitInMillimetres: `${millimetres[drawingUnit]}/1`,
      });
      assert.equal(receipt.drawingDimension.unit, drawingUnit);
      assert.equal(receipt.actualDimension.unit, actualUnit);
      const markup = render({
        actualUnit,
        drawingLength: 7,
        drawingUnit,
        mode: "scale-drawing",
        scaleFactor: 125,
      });
      assert.deepEqual(visualReceiptFromMarkup(markup), receipt);
      checked += 1;
    }
  }
  assert.equal(checked, 16);
});

test("a missing applicable invariant is explicit unsupported and cannot emit affirmative SVG", () => {
  const exact = model({ mode: "direct-proportion" });
  const unverified = {
    ...exact,
    invariants: exact.invariants.map((invariant) =>
      invariant.id === "direct-proportion-constant"
        ? { ...invariant, applicable: true, holds: false, status: "pass" }
        : invariant,
    ),
  } as unknown as RatioProportionScaleState;
  assert.deepEqual(buildRatioProportionScaleVisualReceipt(unverified), {
    kind: "direct-proportion",
    reason: "applicable-model-invariant-not-verified",
    status: "unsupported",
  });
  const markup = renderToStaticMarkup(
    <RatioProportionScaleVisualModel
      model={unverified}
      t={(copy) => copy.en}
    />,
  );
  assert.match(markup, /data-viz-ratio-proportion-scale-visual-status="unsupported"/u);
  assert.match(markup, /data-viz-unsupported-reason="applicable-model-invariant-not-verified"/u);
  assert.doesNotMatch(markup, /<svg/u);
  assert.doesNotMatch(markup, /data-viz-painted-mark="true"/u);
  assert.doesNotMatch(markup, /data-viz-verified="true"/u);
});

test("every supported visual has nonzero exact coverage with one opaque SVG owner", () => {
  for (const mode of [
    "equivalent-ratios",
    "direct-proportion",
    "inverse-proportion",
    "scale-drawing",
  ] as const) {
    const expected = buildRatioProportionScaleVisualReceipt(model({ mode }));
    assert.equal(expected.status, "supported");
    const markup = render({ mode });
    const painted = Number(
      markup.match(/data-viz-painted-mark-count="(\d+)"/u)?.[1],
    );
    assert.ok(Number.isSafeInteger(painted) && painted > 0);
    assert.equal(count(markup, /data-viz-painted-mark="true"/gu), painted);
    assert.equal(
      count(markup, /data-viz-ratio-proportion-scale-visual=/gu),
      1,
    );
    assert.equal(count(markup, /data-viz-svg-background="opaque"/gu), 1);
    assert.match(markup, /<svg[^>]*data-viz-svg-background="opaque"/u);
    assert.deepEqual(visualReceiptFromMarkup(markup), expected);
  }
});

test("learner visual copy is complete in three languages and hides internal contracts", () => {
  for (const [key, copy] of Object.entries(
    RATIO_PROPORTION_SCALE_VISUAL_COPY,
  )) {
    assert.match(copy.en, /\S/u, `${key}.en`);
    assert.match(copy.zh, /[\u3400-\u9fff]/u, `${key}.zh`);
    assert.match(copy.zhHans!, /[\u3400-\u9fff]/u, `${key}.zhHans`);
  }
  for (const language of ["en", "zh", "zhHans"] as const) {
    const markup = render({ mode: "scale-drawing" }, language);
    const text = markup.replace(/<[^>]*>/gu, " ");
    assert.ok(
      markup.includes(RATIO_PROPORTION_SCALE_VISUAL_COPY.scaleDrawing[language]!),
    );
    assert.ok(
      markup.includes(RATIO_PROPORTION_SCALE_VISUAL_COPY.drawingLength[language]!),
    );
    assert.ok(
      markup.includes(RATIO_PROPORTION_SCALE_VISUAL_COPY.actualLength[language]!),
    );
    assert.doesNotMatch(
      text,
      /ratio-proportion-scale-v1|scale-drawing-unit-conversion|data-viz/u,
    );
  }
});
