import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildFractionOperationsModel,
  type FractionOperationsInput,
} from "./FractionOperationsModel";
import {
  FRACTION_OPERATIONS_VISUAL_COPY,
  FractionOperationsVisualModel,
  buildFractionOperationsVisualReceipt,
  type FractionOperationsVisualKind,
} from "./FractionOperationsVisualModel";

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

const labId = "pep-primary-p5-lower-factors-fractions" as const;

function model(input: Omit<FractionOperationsInput, "labId">) {
  return buildFractionOperationsModel({ labId, ...input });
}

function count(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}

function render(
  kind: FractionOperationsVisualKind,
  input: Omit<FractionOperationsInput, "labId">,
  language: "en" | "zh" | "zhHans" = "en",
): string {
  return renderToStaticMarkup(
    <FractionOperationsVisualModel
      kind={kind}
      model={model(input)}
      t={(copy) => copy[language]!}
    />,
  );
}

function parseFraction(text: string): [number, number] {
  const [numerator, denominator = "1"] = text.split("/");
  return [Number(numerator), Number(denominator)];
}

function multiplyFractions(left: string, right: string): [number, number] {
  const [leftNumerator, leftDenominator] = parseFraction(left);
  const [rightNumerator, rightDenominator] = parseFraction(right);
  return [
    leftNumerator * rightNumerator,
    leftDenominator * rightDenominator,
  ];
}

function greatestCommonDivisorForTest(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

function canonicalForTest(numerator: number, denominator: number): string {
  const divisor = greatestCommonDivisorForTest(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

function assertProductEquals(
  left: string,
  right: string,
  expected: string,
): void {
  const [productNumerator, productDenominator] = multiplyFractions(left, right);
  const [expectedNumerator, expectedDenominator] = parseFraction(expected);
  assert.equal(
    productNumerator * expectedDenominator,
    expectedNumerator * productDenominator,
    `${left} × ${right} must reconstruct ${expected}`,
  );
}

function geometryReceiptFromMarkup(markup: string): unknown {
  const encoded = markup.match(/data-viz-geometry-receipt="([^"]+)"/u)?.[1];
  assert.ok(encoded, "serialized geometry receipt must exist");
  return JSON.parse(
    encoded.replace(/&quot;/gu, '"').replace(/&amp;/gu, "&"),
  ) as unknown;
}

test("multi-unit area geometry reconstructs every selected cell and the exact product", () => {
  const multiplication = model({
    left: { numerator: 7, denominator: 4 },
    mode: "multiply",
    right: { numerator: 5, denominator: 3 },
  });
  const receipt = buildFractionOperationsVisualReceipt(
    multiplication,
    "area-grid",
  );
  assert.equal(receipt.status, "supported");
  if (receipt.status !== "supported" || receipt.kind !== "area-grid") {
    assert.fail("expected supported area-grid receipt");
  }
  assert.deepEqual(
    {
      columns: receipt.columns,
      rows: receipt.rows,
      selectedColumns: receipt.selectedColumns,
      selectedRows: receipt.selectedRows,
      totalGridCells: receipt.totalGridCells,
      selectedCells: receipt.selectedCells,
      wholeUnits: receipt.wholeUnits,
      remainingCells: receipt.remainingCells,
    },
    {
      columns: 6,
      rows: 8,
      selectedColumns: 5,
      selectedRows: 7,
      totalGridCells: 48,
      selectedCells: 35,
      wholeUnits: 2,
      remainingCells: 11,
    },
  );
  assert.equal(
    receipt.selectedCells,
    receipt.selectedRows * receipt.selectedColumns,
  );
  assert.equal(
    receipt.totalGridCells,
    receipt.rows * receipt.columns,
  );
  assert.deepEqual(
    multiplyFractions(receipt.rowFactor, receipt.columnFactor),
    [receipt.selectedCells, receipt.cellsPerUnit],
  );

  const markup = render("area-grid", {
    left: { numerator: 7, denominator: 4 },
    mode: "multiply",
    right: { numerator: 5, denominator: 3 },
  });
  assert.match(markup, /<svg[^>]*data-viz-fraction-visual="area-grid"/u);
  assert.equal(
    count(markup, /data-viz-name="fraction-area-cell"/gu),
    receipt.totalGridCells,
  );
  assert.equal(
    count(
      markup,
      /data-viz-name="fraction-area-cell"[^>]*data-viz-selected="true"/gu,
    ),
    receipt.selectedCells,
  );
  assert.match(markup, /data-viz-painted-mark-count="48"/u);
});

test("part-of-quantity and scaling receipts remain source-faithful", () => {
  const multiplication = model({
    left: { numerator: 3, denominator: 4 },
    mode: "multiply",
    right: { numerator: 2, denominator: 3 },
  });
  const repeated = buildFractionOperationsVisualReceipt(
    multiplication,
    "part-of-quantity",
  );
  assert.equal(repeated.status, "supported");
  if (repeated.status !== "supported" || repeated.kind !== "part-of-quantity") {
    assert.fail("expected supported part-of-quantity receipt");
  }
  assert.equal(repeated.factor, "3/4");
  assert.equal(repeated.startingQuantity, "2/3");
  assert.equal(repeated.partitionDenominator, 4);
  assert.equal(repeated.selectedCount, 3);
  assert.equal(repeated.unitShare, "1/6");
  assert.equal(repeated.product, "1/2");
  assert.equal(repeated.partitionReconstruction, "2/3");
  assert.equal(repeated.selectionReconstruction, "1/2");
  assertProductEquals(repeated.factor, repeated.startingQuantity, repeated.product);
  assertProductEquals(
    `${repeated.partitionDenominator}/1`,
    repeated.unitShare,
    repeated.partitionReconstruction,
  );
  assertProductEquals(
    `${repeated.selectedCount}/1`,
    repeated.unitShare,
    repeated.selectionReconstruction,
  );

  const scaling = buildFractionOperationsVisualReceipt(
    multiplication,
    "scaling",
  );
  assert.equal(scaling.status, "supported");
  if (scaling.status !== "supported" || scaling.kind !== "scaling") {
    assert.fail("expected supported scaling receipt");
  }
  assert.equal(scaling.startingValue, "2/3");
  assert.equal(scaling.factor, "3/4");
  assert.equal(scaling.product, "1/2");
  assert.equal(scaling.scaleDirection, "reduce");
  assertProductEquals(scaling.startingValue, scaling.factor, scaling.product);

  const repeatedMarkup = render("part-of-quantity", {
    left: { numerator: 3, denominator: 4 },
    mode: "multiply",
    right: { numerator: 2, denominator: 3 },
  });
  assert.equal(
    count(repeatedMarkup, /data-viz-name="fraction-partition-share"/gu),
    4,
  );
  assert.equal(
    count(
      repeatedMarkup,
      /data-viz-name="fraction-partition-share"[^>]*data-viz-selected="true"/gu,
    ),
    3,
  );
  assert.match(repeatedMarkup, /data-viz-painted-mark-count="4"/u);

  const scalingMarkup = render("scaling", {
    left: { numerator: 3, denominator: 4 },
    mode: "multiply",
    right: { numerator: 2, denominator: 3 },
  });
  assert.match(scalingMarkup, /data-viz-name="fraction-scaling-start"/u);
  assert.match(scalingMarkup, /data-viz-name="fraction-scaling-result"/u);
  assert.match(scalingMarkup, /data-viz-painted-mark-count="4"/u);
});

test("measurement and sharing division expose independently reconstructible geometry", () => {
  const measurement = model({
    left: { numerator: 3, denominator: 4 },
    mode: "divide",
    right: { numerator: 1, denominator: 4 },
  });
  const measurementReceipt = buildFractionOperationsVisualReceipt(
    measurement,
    "measurement-division",
  );
  assert.equal(measurementReceipt.status, "supported");
  if (
    measurementReceipt.status !== "supported" ||
    measurementReceipt.kind !== "measurement-division"
  ) {
    assert.fail("expected supported measurement receipt");
  }
  assert.equal(measurementReceipt.available, "3/4");
  assert.equal(measurementReceipt.unitSize, "1/4");
  assert.equal(measurementReceipt.numberOfGroups, "3/1");
  assert.equal(measurementReceipt.fullGroups, 3);
  assert.equal(measurementReceipt.remainderOfUnit, "0/1");
  assertProductEquals(
    measurementReceipt.unitSize,
    measurementReceipt.numberOfGroups,
    measurementReceipt.available,
  );
  const measurementMarkup = render("measurement-division", {
    left: { numerator: 3, denominator: 4 },
    mode: "divide",
    right: { numerator: 1, denominator: 4 },
  });
  assert.equal(
    count(measurementMarkup, /data-viz-name="fraction-measurement-group"/gu),
    3,
  );
  assert.match(measurementMarkup, /data-viz-painted-mark-count="3"/u);

  const partialMeasurement = buildFractionOperationsVisualReceipt(
    model({
      left: { numerator: 3, denominator: 4 },
      mode: "divide",
      right: { numerator: 2, denominator: 3 },
    }),
    "measurement-division",
  );
  assert.equal(partialMeasurement.status, "supported");
  if (
    partialMeasurement.status !== "supported" ||
    partialMeasurement.kind !== "measurement-division"
  ) {
    assert.fail("expected supported partial measurement receipt");
  }
  assert.equal(partialMeasurement.fullGroups, 1);
  assert.equal(partialMeasurement.remainderOfUnit, "1/8");
  const partialMarkup = render("measurement-division", {
    left: { numerator: 3, denominator: 4 },
    mode: "divide",
    right: { numerator: 2, denominator: 3 },
  });
  assert.equal(
    count(partialMarkup, /data-viz-name="fraction-measurement-group"/gu),
    2,
  );
  assert.match(partialMarkup, /data-viz-complete="false"/u);

  const sharing = model({
    left: { numerator: 3, denominator: 4 },
    mode: "divide",
    right: { numerator: 3, denominator: 1 },
  });
  const sharingReceipt = buildFractionOperationsVisualReceipt(
    sharing,
    "sharing-division",
  );
  assert.equal(sharingReceipt.status, "supported");
  if (
    sharingReceipt.status !== "supported" ||
    sharingReceipt.kind !== "sharing-division"
  ) {
    assert.fail("expected supported sharing receipt");
  }
  assert.equal(sharingReceipt.total, "3/4");
  assert.equal(sharingReceipt.groupCount, 3);
  assert.equal(sharingReceipt.sharePerGroup, "1/4");
  assertProductEquals(
    `${sharingReceipt.groupCount}/1`,
    sharingReceipt.sharePerGroup,
    sharingReceipt.total,
  );
  const sharingMarkup = render("sharing-division", {
    left: { numerator: 3, denominator: 4 },
    mode: "divide",
    right: { numerator: 3, denominator: 1 },
  });
  assert.equal(
    count(sharingMarkup, /data-viz-name="fraction-sharing-group"/gu),
    3,
  );
  assert.match(sharingMarkup, /data-viz-painted-mark-count="3"/u);
});

test("bounded signed matrix proves every visual applicability and reconstruction branch", () => {
  for (let leftNumerator = -3; leftNumerator <= 5; leftNumerator += 1) {
    for (let leftDenominator = 1; leftDenominator <= 4; leftDenominator += 1) {
      for (let rightNumerator = -3; rightNumerator <= 5; rightNumerator += 1) {
        for (let rightDenominator = 1; rightDenominator <= 4; rightDenominator += 1) {
          const multiplication = model({
            left: { numerator: leftNumerator, denominator: leftDenominator },
            mode: "multiply",
            right: { numerator: rightNumerator, denominator: rightDenominator },
          });
          for (const kind of [
            "area-grid",
            "part-of-quantity",
            "scaling",
          ] as const) {
            const receipt = buildFractionOperationsVisualReceipt(
              multiplication,
              kind,
            );
            if (leftNumerator < 0 || rightNumerator < 0) {
              assert.equal(receipt.status, "unsupported");
              if (receipt.status === "unsupported") {
                assert.equal(receipt.reason, "signed-operands-require-sign-model");
              }
              continue;
            }
            assert.equal(receipt.status, "supported");
            if (receipt.status !== "supported") continue;
            if (receipt.kind === "area-grid") {
              assert.equal(
                receipt.selectedCells,
                leftNumerator * rightNumerator,
              );
              assert.equal(
                receipt.cellsPerUnit,
                leftDenominator * rightDenominator,
              );
              assertProductEquals(
                receipt.rowFactor,
                receipt.columnFactor,
                canonicalForTest(
                  leftNumerator * rightNumerator,
                  leftDenominator * rightDenominator,
                ),
              );
            } else if (receipt.kind === "part-of-quantity") {
              assertProductEquals(
                receipt.factor,
                receipt.startingQuantity,
                receipt.product,
              );
              assertProductEquals(
                `${receipt.partitionDenominator}/1`,
                receipt.unitShare,
                receipt.partitionReconstruction,
              );
              assertProductEquals(
                `${receipt.selectedCount}/1`,
                receipt.unitShare,
                receipt.selectionReconstruction,
              );
            } else if (receipt.kind === "scaling") {
              assertProductEquals(
                receipt.startingValue,
                receipt.factor,
                receipt.product,
              );
            }
          }

          if (rightNumerator === 0) continue;
          const division = model({
            left: { numerator: leftNumerator, denominator: leftDenominator },
            mode: "divide",
            right: { numerator: rightNumerator, denominator: rightDenominator },
          });
          const measurement = buildFractionOperationsVisualReceipt(
            division,
            "measurement-division",
          );
          if (leftNumerator < 0 || rightNumerator < 0) {
            assert.equal(measurement.status, "unsupported");
          } else {
            assert.equal(measurement.status, "supported");
            if (
              measurement.status === "supported" &&
              measurement.kind === "measurement-division"
            ) {
              assertProductEquals(
                measurement.unitSize,
                measurement.numberOfGroups,
                measurement.available,
              );
            }
          }

          const sharing = buildFractionOperationsVisualReceipt(
            division,
            "sharing-division",
          );
          const rightDivisor = greatestCommonDivisorForTest(
            rightNumerator,
            rightDenominator,
          );
          const normalizedRightNumerator = rightNumerator / rightDivisor;
          const normalizedRightDenominator = rightDenominator / rightDivisor;
          const sharingSupported =
            leftNumerator >= 0 &&
            normalizedRightNumerator > 0 &&
            normalizedRightDenominator === 1;
          assert.equal(
            sharing.status,
            sharingSupported ? "supported" : "unsupported",
          );
          if (
            sharing.status === "supported" &&
            sharing.kind === "sharing-division"
          ) {
            assertProductEquals(
              `${sharing.groupCount}/1`,
              sharing.sharePerGroup,
              sharing.total,
            );
          }
        }
      }
    }
  }
});

test("unsupported signed and noninteger-sharing states render no affirmative SVG", () => {
  for (const kind of [
    "area-grid",
    "part-of-quantity",
    "scaling",
  ] as const) {
    const signed = model({
      left: { numerator: -3, denominator: 4 },
      mode: "multiply",
      right: { numerator: 2, denominator: 3 },
    });
    const receipt = buildFractionOperationsVisualReceipt(signed, kind);
    assert.deepEqual(receipt, {
      kind,
      reason: "signed-operands-require-sign-model",
      status: "unsupported",
    });
    assert.equal(
      render(kind, {
        left: { numerator: -3, denominator: 4 },
        mode: "multiply",
        right: { numerator: 2, denominator: 3 },
      }),
      "",
    );
  }

  const nonintegerSharing = model({
    left: { numerator: 3, denominator: 4 },
    mode: "divide",
    right: { numerator: 2, denominator: 3 },
  });
  assert.deepEqual(
    buildFractionOperationsVisualReceipt(
      nonintegerSharing,
      "sharing-division",
    ),
    {
      kind: "sharing-division",
      reason: "sharing-requires-positive-integer-group-count",
      status: "unsupported",
    },
  );
  assert.equal(
    render("sharing-division", {
      left: { numerator: 3, denominator: 4 },
      mode: "divide",
      right: { numerator: 2, denominator: 3 },
    }),
    "",
  );
});

test("every supported SVG has a nonzero exact coverage receipt and no self-selector shortcut", () => {
  const cases: Array<{
    input: Omit<FractionOperationsInput, "labId">;
    kind: FractionOperationsVisualKind;
  }> = [
    {
      input: {
        left: { numerator: 7, denominator: 4 },
        mode: "multiply",
        right: { numerator: 5, denominator: 3 },
      },
      kind: "area-grid",
    },
    {
      input: {
        left: { numerator: 3, denominator: 4 },
        mode: "multiply",
        right: { numerator: 2, denominator: 3 },
      },
      kind: "part-of-quantity",
    },
    {
      input: {
        left: { numerator: 3, denominator: 4 },
        mode: "multiply",
        right: { numerator: 2, denominator: 3 },
      },
      kind: "scaling",
    },
    {
      input: {
        left: { numerator: 3, denominator: 4 },
        mode: "divide",
        right: { numerator: 1, denominator: 4 },
      },
      kind: "measurement-division",
    },
    {
      input: {
        left: { numerator: 3, denominator: 4 },
        mode: "divide",
        right: { numerator: 3, denominator: 1 },
      },
      kind: "sharing-division",
    },
  ];

  for (const { input, kind } of cases) {
    const expectedReceipt = buildFractionOperationsVisualReceipt(
      model(input),
      kind,
    );
    const markup = render(kind, input);
    const painted = Number(
      markup.match(/data-viz-painted-mark-count="(\d+)"/u)?.[1],
    );
    assert.ok(Number.isInteger(painted) && painted > 0, kind);
    assert.equal(count(markup, /data-viz-painted-mark="true"/gu), painted, kind);
    assert.equal(count(markup, /data-viz-fraction-visual=/gu), 1, kind);
    assert.match(markup, new RegExp(`data-viz-owner="${kind}"`, "u"), kind);
    assert.match(markup, /data-viz-geometry-receipt="[^"]+"/u, kind);
    assert.deepEqual(geometryReceiptFromMarkup(markup), expectedReceipt, kind);
  }
});

test("supported zero quantities keep an explicit nonzero visual coverage receipt", () => {
  const zeroMultiply = {
    left: { numerator: 0, denominator: 4 },
    mode: "multiply" as const,
    right: { numerator: 2, denominator: 3 },
  };
  for (const kind of ["area-grid", "part-of-quantity", "scaling"] as const) {
    const markup = render(kind, zeroMultiply);
    const painted = Number(
      markup.match(/data-viz-painted-mark-count="(\d+)"/u)?.[1],
    );
    assert.ok(painted > 0, kind);
    assert.equal(count(markup, /data-viz-painted-mark="true"/gu), painted, kind);
  }
  const areaMarkup = render("area-grid", zeroMultiply);
  assert.equal(
    count(
      areaMarkup,
      /data-viz-name="fraction-area-cell"[^>]*data-viz-selected="true"/gu,
    ),
    0,
  );

  const zeroMeasurement = render("measurement-division", {
    left: { numerator: 0, denominator: 4 },
    mode: "divide",
    right: { numerator: 1, denominator: 4 },
  });
  assert.match(zeroMeasurement, /data-viz-painted-mark-count="1"/u);
  assert.match(zeroMeasurement, /data-viz-name="fraction-measurement-empty"/u);
});

test("visual learner copy renders in English, Traditional Chinese, and Simplified Chinese", () => {
  for (const [key, copy] of Object.entries(FRACTION_OPERATIONS_VISUAL_COPY)) {
    assert.match(copy.en, /\S/u, `${key}.en`);
    assert.match(copy.zh, /[\u3400-\u9fff]/u, `${key}.zh`);
    assert.match(copy.zhHans!, /[\u3400-\u9fff]/u, `${key}.zhHans`);
  }
  const input = {
    left: { numerator: 3, denominator: 4 },
    mode: "multiply" as const,
    right: { numerator: 2, denominator: 3 },
  };
  for (const language of ["en", "zh", "zhHans"] as const) {
    const markup = render("area-grid", input, language);
    const visibleText = markup.replace(/<[^>]*>/gu, " ");
    assert.ok(markup.includes(FRACTION_OPERATIONS_VISUAL_COPY.areaGrid[language]!));
    assert.ok(markup.includes(FRACTION_OPERATIONS_VISUAL_COPY.selectedCells[language]!));
    assert.doesNotMatch(visibleText, /fraction-operations-v2|fraction-/u);
  }
});
