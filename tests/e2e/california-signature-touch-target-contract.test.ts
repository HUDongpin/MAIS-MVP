import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

type TouchTargetContract = {
  file: string;
  selector: string;
  height?: "height" | "min-height";
  width?: "width" | "min-width";
};

const signatureDirectory = path.join(process.cwd(), "components/visualizations/signature");

const contracts: TouchTargetContract[] = [
  { file: "BoxPlotLab.jsx", selector: ".point-editor select", height: "min-height" },
  { file: "BoxPlotLab.jsx", selector: ".point-editor .btn", height: "min-height", width: "min-width" },
  { file: "DataLab.jsx", selector: ".point-editor select", height: "min-height" },
  { file: "DataLab.jsx", selector: ".point-editor .btn", height: "min-height", width: "min-width" },
  { file: "EqualSharesLab.jsx", selector: ".chipbtn", height: "min-height", width: "min-width" },
  { file: "FractionLinePlotLab.jsx", selector: ".tick-picker select", height: "min-height" },
  { file: "FractionLinePlotLab.jsx", selector: ".tick-picker .btn", height: "min-height", width: "min-width" },
  { file: "GraphsLab.jsx", selector: ".catfocus", height: "min-height", width: "min-width" },
  { file: "GraphsLab.jsx", selector: ".stepper button", height: "height", width: "width" },
  { file: "ScatterPlotLab.jsx", selector: ".point-picker select", height: "min-height" },
  { file: "ScatterPlotLab.jsx", selector: ".point-picker .btn", height: "min-height", width: "min-width" },
  { file: "SetTheoryLab.jsx", selector: ".el", height: "min-height", width: "width" },
  { file: "SortLab.jsx", selector: ".object-picker select", height: "min-height" },
  { file: "SortLab.jsx", selector: ".object-picker .btn", height: "min-height", width: "min-width" },
  { file: "CongruenceLab.jsx", selector: ".side-btn", height: "min-height", width: "min-width" },
  { file: "CongruenceLab.jsx", selector: ".chipbtn", height: "min-height", width: "min-width" },
  { file: "MeanLab.jsx", selector: ".editor-field select", height: "min-height" },
  { file: "MeanLab.jsx", selector: ".editor-range label", height: "min-height" },
  { file: "MeanLab.jsx", selector: ".editor-step", height: "min-height", width: "min-width" },
  { file: "MedianLab.jsx", selector: ".editor-field select,\n        .editor-field input[type='number']", height: "min-height" },
  { file: "MedianLab.jsx", selector: ".editor-range label", height: "min-height" },
  { file: "MedianLab.jsx", selector: ".editor-step,\n        .editor-action", height: "min-height", width: "min-width" },
  { file: "ModeLab.jsx", selector: ".editor-field select", height: "min-height" },
  { file: "ModeLab.jsx", selector: ".editor-action", height: "min-height", width: "min-width" },
  { file: "StandardDeviationLab.jsx", selector: ".editor-field select,\n        .editor-field input[type='number']", height: "min-height" },
  { file: "StandardDeviationLab.jsx", selector: ".editor-range label", height: "min-height" },
  { file: "StandardDeviationLab.jsx", selector: ".editor-step,\n        .editor-action", height: "min-height", width: "min-width" },
  { file: "TableLab.jsx", selector: ".editor-action", height: "min-height", width: "min-width" },
  { file: "VarianceLab.jsx", selector: ".editor-field select,\n        .editor-field input[type='number']", height: "min-height" },
  { file: "VarianceLab.jsx", selector: ".editor-range label", height: "min-height" },
  { file: "VarianceLab.jsx", selector: ".editor-step,\n        .editor-action", height: "min-height", width: "min-width" }
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ruleBody(source: string, selector: string) {
  const match = source.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`, "s"));
  assert.ok(match, `missing CSS rule ${JSON.stringify(selector)}`);
  return match[1] ?? "";
}

test("California signature keyboard controls preserve a 44px touch-target floor", () => {
  const sources = new Map<string, string>();

  for (const contract of contracts) {
    const source = sources.get(contract.file) ?? readFileSync(path.join(signatureDirectory, contract.file), "utf8");
    sources.set(contract.file, source);
    const body = ruleBody(source, contract.selector);

    if (contract.height) {
      assert.match(
        body,
        new RegExp(`${contract.height}:\\s*44px\\b`),
        `${contract.file} ${contract.selector} must keep a 44px ${contract.height}`
      );
    }
    if (contract.width) {
      assert.match(
        body,
        new RegExp(`${contract.width}:\\s*44px\\b`),
        `${contract.file} ${contract.selector} must keep a 44px ${contract.width}`
      );
    }
  }
});

test("VarianceLab prevents a seventh dot from sharing one rendered stack position", () => {
  const source = readFileSync(path.join(signatureDirectory, "VarianceLab.jsx"), "utf8");

  assert.match(source, /function countAtValue\(values, value, skipIndex = -1\)/);
  assert.match(source, /countAtValue\(arr, v, i\) >= MAX_STACK/);
  assert.match(source, /countAtValue\(dataRef\.current, valueAt\(cssX\)\) < MAX_STACK/);
  assert.match(source, /countAtValue\(arr, v\) < MAX_STACK \? \[\.\.\.arr, v\] : arr/);
  assert.match(source, /countAtValue\(arr, value, i\) >= MAX_STACK/);
  assert.match(source, /countAtValue\(data, value\) >= MAX_STACK/);
  assert.match(source, /disabled=\{n >= MAX_POINTS \|\| countAtValue\(data, keyboardAddValue\) >= MAX_STACK\}/);
});

test("statistics keyboard editors keep both 44px steppers inside a 335px workspace", () => {
  for (const file of ["MeanLab.jsx", "MedianLab.jsx", "StandardDeviationLab.jsx", "VarianceLab.jsx"]) {
    const source = readFileSync(path.join(signatureDirectory, file), "utf8");
    assert.match(
      source,
      /@media \(max-width: (?:620|720)px\) \{[\s\S]{0,260}\.editor-range \{\s*grid-template-columns: 44px minmax\(0, 1fr\) 2ch 44px;\s*gap: 4px;/,
      `${file} must collapse the inner editor grid, not only its outer wrapper`
    );
  }

  const modeSource = readFileSync(path.join(signatureDirectory, "ModeLab.jsx"), "utf8");
  assert.match(
    modeSource,
    /@media \(max-width: 620px\) \{[\s\S]{0,260}\.editor-actions \{\s*grid-template-columns: minmax\(44px, 1fr\) 2\.5ch minmax\(44px, 1fr\);\s*gap: 4px;/
  );
});

test("ScatterPlotLab resets the keyboard point index when a new case changes cardinality", () => {
  const source = readFileSync(path.join(signatureDirectory, "ScatterPlotLab.jsx"), "utf8");
  assert.match(
    source,
    /setKase\(makeCase\(kase\.id\)\);\s*setAssoc\(null\);\s*setEvidence\(null\);\s*setPointPick\(0\);/
  );
});

test("SetTheoryLab reflows its five 44px operations before the 335px card clips them", () => {
  const source = readFileSync(path.join(signatureDirectory, "SetTheoryLab.jsx"), "utf8");
  assert.match(
    source,
    /@media \(max-width: 560px\) \{\s*\.ops-row \{\s*grid-template-columns: repeat\(2, minmax\(44px, 1fr\)\);/
  );
});

test("inequality operation grids reflow after the page-wide 44px floor", () => {
  for (const file of ["InequalityLab.jsx", "TwoVariableInequalityLab.jsx"]) {
    const source = readFileSync(path.join(signatureDirectory, file), "utf8");
    assert.match(
      source,
      /@media \(max-width: 560px\) \{[\s\S]{0,380}\.opgroup \{\s*grid-template-columns: repeat\(2, minmax\(44px, 1fr\)\);/,
      `${file} must move its four operators below the symbol label and into two columns`
    );
  }
});

test("compact signature control grids reflow around the mobile 44px floor", () => {
  const commutative = readFileSync(path.join(signatureDirectory, "CommutativeLab.jsx"), "utf8");
  assert.match(
    commutative,
    /@media \(max-width: 520px\) \{[\s\S]{0,420}\.segs \{\s*display: grid;\s*grid-template-columns: repeat\(2, minmax\(44px, 1fr\)\);/,
    "CommutativeLab must reflow four operation buttons into two columns"
  );

  const operations = readFileSync(path.join(signatureDirectory, "OperationsLab.jsx"), "utf8");
  assert.match(
    operations,
    /@media \(max-width: 560px\) \{[\s\S]{0,520}\.nums \{\s*grid-template-columns: minmax\(0, 1fr\);/,
    "OperationsLab must stack its three compact range rows"
  );
  assert.match(
    operations,
    /@media \(max-width: 560px\) \{[\s\S]{0,760}\.ops-row \.seg \{\s*display: grid;\s*grid-template-columns: repeat\(2, minmax\(44px, 1fr\)\);/,
    "OperationsLab must reflow each four-operation segment into two columns"
  );

  const longDivision = readFileSync(path.join(signatureDirectory, "LongDivisionLab.jsx"), "utf8");
  assert.match(
    longDivision,
    /\.digit input\[type='range'\] \{[\s\S]{0,180}width: 44px;/,
    "LongDivisionLab vertical sliders must retain a 44px horizontal hit area"
  );
  assert.match(
    longDivision,
    /@media \(max-width: 560px\) \{\s*\.digits \{\s*grid-template-columns: repeat\(2, minmax\(44px, 1fr\)\);/,
    "LongDivisionLab must reflow four vertical digit sliders"
  );

  const placeJump = readFileSync(path.join(signatureDirectory, "PlaceJumpLab.jsx"), "utf8");
  assert.match(
    placeJump,
    /@media \(max-width:560px\)\{\.jumps\{grid-template-columns:repeat\(2,minmax\(44px,1fr\)\);\}\}/,
    "PlaceJumpLab must reflow four jump buttons"
  );

  const parabola = readFileSync(path.join(signatureDirectory, "ParabolaLab.jsx"), "utf8");
  assert.match(
    parabola,
    /@media \(max-width: 560px\) \{\s*\.dir-btns \{\s*grid-template-columns: repeat\(2, minmax\(44px, 1fr\)\);/,
    "ParabolaLab must reflow its four opening-direction buttons"
  );

  const logarithm = readFileSync(path.join(signatureDirectory, "LogarithmLab.jsx"), "utf8");
  assert.match(
    logarithm,
    /@media \(max-width: 560px\) \{\s*\.chips \{\s*grid-template-columns: repeat\(2, minmax\(44px, 1fr\)\);\s*margin-left: 0;/,
    "LogarithmLab must reflow quick-base chips and remove the narrow-screen indent"
  );

  const normal = readFileSync(path.join(signatureDirectory, "NormalDistributionLab.jsx"), "utf8");
  assert.match(
    normal,
    /@media \(max-width: 560px\) \{\s*\.toolbar \.seg \{\s*display: grid;\s*grid-template-columns: repeat\(2, minmax\(44px, 1fr\)\);/,
    "NormalDistributionLab must reflow its five area-band buttons"
  );

  const polynomial = readFileSync(path.join(signatureDirectory, "PolynomialFunctionLab.jsx"), "utf8");
  assert.match(
    polynomial,
    /@media \(max-width: 560px\) \{[\s\S]{0,520}\.dial\.degree \.seg \{\s*display: grid;\s*grid-template-columns: repeat\(3, minmax\(44px, 1fr\)\);/,
    "PolynomialFunctionLab must give its degree selector a full-width mobile row"
  );

  const sequences = readFileSync(path.join(signatureDirectory, "SequencesLab.jsx"), "utf8");
  assert.match(
    sequences,
    /@media \(max-width: 560px\) \{\s*\.toolbar \.seg \{\s*display: grid;\s*grid-template-columns: minmax\(44px, 1fr\);\s*width: 100%;/,
    "SequencesLab must stack long segmented-control labels on narrow screens"
  );
  assert.match(
    sequences,
    /@media \(max-width: 920px\) \{\s*\.bench \{\s*grid-template-columns: minmax\(0, 1fr\);/,
    "SequencesLab must let its one-column bench shrink below stage min-content"
  );
  assert.match(sequences, /\.panel \{\s*min-width: 0;/);
});

test("the workspace gives horizontal ranges height without forcing narrow grids wider", () => {
  const pageSource = readFileSync(
    path.join(process.cwd(), "components/visualizations/VisualizationLabPage.tsx"),
    "utf8"
  );
  const directSource = readFileSync(
    path.join(process.cwd(), "components/visualizations/PremiumThreeDDirectRouteShell.tsx"),
    "utf8"
  );
  for (const source of [pageSource, directSource]) {
    assert.match(source, /\[&_input\[type=range\]\]:min-h-11/);
    assert.match(source, /\[&_input\[type=range\]\]:min-w-0/);
    assert.doesNotMatch(source, /\[&_input\[type=range\]\]:min-w-11/);
  }
});

test("MeanLab never announces null challenge state before its target initializes", () => {
  const source = readFileSync(path.join(signatureDirectory, "MeanLab.jsx"), "utf8");
  assert.match(source, /const spoken = calib\s*\? calibInfo && unknownIndex >= 0 && target != null/);
  assert.match(source, /: 'Challenge: preparing a new target average\.'/);
});

test("CongruenceLab maps keyboard side evidence to visible numbered edges and exact lengths", () => {
  const source = readFileSync(path.join(signatureDirectory, "CongruenceLab.jsx"), "utf8");
  assert.match(source, /const outwardSign = \(normalX \* \(midX - bx\) \+ normalY \* \(midY - by\)\) >= 0 \? 1 : -1/);
  assert.match(source, /const labelX = Math\.max\(12, Math\.min\(W - 12, midX \+ normalX \* outwardSign \* 14\)\)/);
  assert.match(source, /const labelY = Math\.max\(bandH \+ 12, Math\.min\(H - 12, midY \+ normalY \* outwardSign \* 14\)\)/);
  assert.match(source, /ctx\.fillText\(String\(i \+ 1\), labelX, labelY\)/);
  assert.match(source, /Figure A has squared side lengths \$\{aSideSquares\.join\(', '\)\}/);
  assert.match(source, /squared length \$\{bSideSquares\[i\]\}/);
  assert.match(source, /Side \{i \+ 1\} · d²=\{bSideSquares\[i\]\}/);
});
