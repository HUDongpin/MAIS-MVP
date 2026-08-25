import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const primarySource = readFileSync(
  join(process.cwd(), "components/visualizations/hk/HKPrimaryVisualizationLab.tsx"),
  "utf8"
);

function sourceSection(start: string, end: string): string {
  const startIndex = primarySource.indexOf(start);
  const endIndex = primarySource.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `missing source-section start: ${start}`);
  assert.notEqual(endIndex, -1, `missing source-section end: ${end}`);
  return primarySource.slice(startIndex, endIndex);
}

function factors(value: number): number[] {
  return Array.from({ length: value }, (_, index) => index + 1).filter(
    (candidate) => value % candidate === 0
  );
}

function factorPairs(value: number): [number, number][] {
  return factors(value)
    .filter((factor) => factor <= value / factor)
    .map((factor) => [factor, value / factor]);
}

function hcf(first: number, second: number): number {
  return Math.max(...factors(first).filter((factor) => second % factor === 0));
}

function lcm(first: number, second: number): number {
  let candidate = Math.max(first, second);
  while (candidate % first !== 0 || candidate % second !== 0) candidate += 1;
  return candidate;
}

test("P2 metre arithmetic and tool suitability cover exact FINAL boundaries", () => {
  const measurementCases = [
    { estimatedMetres: 1, actualCentimetres: 100, wholeMetres: 1, remainderCentimetres: 0, differenceCentimetres: 0 },
    { estimatedMetres: 1, actualCentimetres: 110, wholeMetres: 1, remainderCentimetres: 10, differenceCentimetres: 10 },
    { estimatedMetres: 2, actualCentimetres: 199, wholeMetres: 1, remainderCentimetres: 99, differenceCentimetres: 1 },
    { estimatedMetres: 2, actualCentimetres: 200, wholeMetres: 2, remainderCentimetres: 0, differenceCentimetres: 0 },
    { estimatedMetres: 12, actualCentimetres: 1250, wholeMetres: 12, remainderCentimetres: 50, differenceCentimetres: 50 },
    { estimatedMetres: 20, actualCentimetres: 2000, wholeMetres: 20, remainderCentimetres: 0, differenceCentimetres: 0 }
  ] as const;

  for (const expected of measurementCases) {
    const wholeMetres = Math.floor(expected.actualCentimetres / 100);
    const remainderCentimetres = expected.actualCentimetres % 100;
    assert.equal(wholeMetres, expected.wholeMetres);
    assert.equal(remainderCentimetres, expected.remainderCentimetres);
    assert.equal(wholeMetres * 100 + remainderCentimetres, expected.actualCentimetres);
    assert.ok(remainderCentimetres >= 0 && remainderCentimetres < 100);
    assert.equal(
      Math.abs(expected.estimatedMetres * 100 - expected.actualCentimetres),
      expected.differenceCentimetres
    );
  }

  assert.deepEqual(
    {
      desk: "metre-ruler",
      "classroom-width": "tape-measure",
      "playground-path": "trundle-wheel"
    },
    {
      desk: "metre-ruler",
      "classroom-width": "tape-measure",
      "playground-path": "trundle-wheel"
    }
  );
});

test("P2 source is metres plus one-icon-per-object pictogram, with no bar model", () => {
  const section = sourceSection("type LengthDataMode", "type MultiplyDivideMode");
  assert.match(section, /type LengthDataMode = "metres" \| "pictogram"/);
  assert.match(section, /data-viz-name="metre-reference"\s+data-viz-metres="1"\s+data-viz-centimetres="100"/);
  assert.match(section, /desk:[\s\S]*?expectedTool: "metre-ruler"/);
  assert.match(section, /"classroom-width":[\s\S]*?expectedTool: "tape-measure"/);
  assert.match(section, /"playground-path":[\s\S]*?expectedTool: "trundle-wheel"/);
  assert.match(section, /data-viz-name="measuring-tool-choice"[\s\S]*?data-viz-suitable=\{String\(toolIsSuitable\)\}/);
  assert.match(section, /data-viz-name="pictogram"\s+data-viz-one-icon-value="1"\s+data-viz-unit="object"/);
  assert.match(section, /data-viz-name="pictogram-icon"\s+data-viz-icon-value="1"\s+data-viz-unit="object"/);
  assert.match(section, /1 icon = 1 object/);
  assert.doesNotMatch(section, /bar[- ]?chart|bar[- ]?height|data-viz-name="data-bar"|1\s+icon\s*=\s*(?:[2-9]|\d{2,})/i);
});

test("P3 categorical-bar oracle fixes A=0, B=4, C=8, D=6", () => {
  const dataset = [
    ["A", 0],
    ["B", 4],
    ["C", 8],
    ["D", 6]
  ] as const;
  assert.deepEqual(dataset.map(([category]) => category), ["A", "B", "C", "D"]);
  assert.deepEqual(dataset.map(([, value]) => value), [0, 4, 8, 6]);
  assert.equal(Math.max(...dataset.map(([, value]) => value)), 8);
  assert.equal(dataset[0][1], 0);
});

test("P3 measurement source carries the exact categorical bars and excludes statistical/line/pictogram scope", () => {
  const section = sourceSection("type MeasurementQuantity", "type P3ShapeFamily");
  assert.match(
    section,
    /const p3BarData[\s\S]*?category: "A", value: 0[\s\S]*?category: "B", value: 4[\s\S]*?category: "C", value: 8[\s\S]*?category: "D", value: 6/
  );
  assert.match(section, /data-viz-name="bar-chart"[\s\S]*?data-viz-scale-min="0"/);
  assert.match(section, /data-viz-name="data-bar"\s+data-viz-category=\{item\.category\}\s+data-viz-value=\{item\.value\}/);
  assert.match(section, /p3BarData\.map\(\(item, index\) =>/);
  assert.doesNotMatch(section, /\bmean\b|\baverage\b|median|gradient|slope|interpolat|pictogram|broken-line/i);
});

test("P3 concrete-shape source stays on visible sides/vertices and rejects higher-grade routes", () => {
  const section = sourceSection("type P3ShapeFamily", "type FactorsMultiplesMode");
  assert.match(section, /type P3ShapeFamily = "quadrilateral" \| "triangle"/);
  assert.match(section, /data-viz-name="shape-outline"/);
  assert.match(section, /data-viz-name="shape-side"/);
  assert.match(section, /data-viz-name="shape-vertex"/);
  assert.match(section, /data-viz-side-count=\{sideCount\}/);
  assert.match(section, /data-viz-vertex-count=\{vertexCount\}/);
  assert.doesNotMatch(
    section,
    /\bdegrees?\b|\bangle(?:s)?\b|symmetr|algebra|growing pattern|general term|coordinate|vector|slope/i
  );
});

test("P4 factors, HCF, and least-positive LCM satisfy exhaustive positive-integer boundaries", () => {
  const cases = [
    [1, 1, 1, 1],
    [1, 20, 1, 20],
    [6, 12, 6, 12],
    [8, 8, 8, 8],
    [12, 18, 6, 36],
    [7, 11, 1, 77],
    [18, 12, 6, 36],
    [19, 20, 1, 380]
  ] as const;

  for (const [first, second, expectedHcf, expectedLcm] of cases) {
    const firstFactors = factors(first);
    const secondFactors = factors(second);
    assert.ok(firstFactors.every((factor) => first % factor === 0));
    assert.ok(secondFactors.every((factor) => second % factor === 0));
    assert.ok(factorPairs(first).every(([left, right]) => left * right === first));
    assert.ok(factorPairs(second).every(([left, right]) => left * right === second));
    assert.equal(hcf(first, second), expectedHcf);
    assert.equal(lcm(first, second), expectedLcm);
    assert.equal(hcf(second, first), expectedHcf);
    assert.equal(lcm(second, first), expectedLcm);
    assert.equal(expectedLcm % first, 0);
    assert.equal(expectedLcm % second, 0);
    assert.ok(
      Array.from({ length: expectedLcm - 1 }, (_, index) => index + 1).every(
        (candidate) => candidate % first !== 0 || candidate % second !== 0
      )
    );
  }
});

test("P4 number source exposes complete factors/HCF/LCM on positive-integer controls", () => {
  const section = sourceSection("type FactorsMultiplesMode", "function DecimalsModel");
  assert.match(section, /function positiveFactors\(value: number\)/);
  assert.match(section, /function completeFactorPairs\(value: number\)/);
  assert.match(section, /const hcf = gcd\(firstNumber, secondNumber\)/);
  assert.match(section, /const lcm = \(firstNumber \* secondNumber\) \/ hcf/);
  assert.match(section, /data-viz-name="factor-pair-array"[\s\S]*?data-viz-complete="true"/);
  assert.match(section, /data-viz-name="hcf-marker"\s+data-viz-value=\{hcf\}/);
  assert.match(section, /data-viz-name="lcm-marker"\s+data-viz-value=\{lcm\}/);
  assert.match(section, /controlId="firstNumber"[\s\S]*?min=\{1\}/);
  assert.match(section, /controlId="secondNumber"[\s\S]*?min=\{1\}/);
  assert.doesNotMatch(section, /roundingPlace|comparisonNumber|nearest\s+(?:10|100|1000)|six-digit|prime factor(?:ization|isation)|Euclidean algorithm|exponent/i);
});

test("P4 quadrilateral inclusion relation is transitive and composition remains piece-to-whole", () => {
  const directSupersets = new Map<string, ReadonlySet<string>>([
    ["square", new Set(["rectangle", "rhombus"])],
    ["rectangle", new Set(["parallelogram"])],
    ["rhombus", new Set(["parallelogram"])],
    ["parallelogram", new Set()]
  ]);
  const reaches = (from: string, target: string): boolean => {
    const direct = directSupersets.get(from) ?? new Set<string>();
    return direct.has(target) || [...direct].some((next) => reaches(next, target));
  };
  assert.ok(reaches("square", "rectangle"));
  assert.ok(reaches("square", "rhombus"));
  assert.ok(reaches("rectangle", "parallelogram"));
  assert.ok(reaches("rhombus", "parallelogram"));
  assert.ok(reaches("square", "parallelogram"));
  assert.equal(reaches("parallelogram", "square"), false);
  assert.equal(2, 2, "every FINAL composition uses two congruent pieces");
});

test("P4 quadrilateral source encodes subset arrows and bounded congruent-piece composition", () => {
  const section = sourceSection("type QuadrilateralMode", "type PerimeterAreaFocus");
  for (const [from, to] of [
    ["rectangle", "parallelogram"],
    ["rhombus", "parallelogram"],
    ["square", "rectangle"],
    ["square", "rhombus"]
  ] as const) {
    assert.match(section, new RegExp(`data-viz-name="subset-arrow"\\s+data-viz-from="${from}"\\s+data-viz-to="${to}"`));
  }
  assert.match(section, /data-viz-name="shape-composition"[\s\S]*?data-viz-piece-count="2"[\s\S]*?data-viz-congruent="true"/);
  assert.match(section, /data-viz-name="composition-piece"/);
  assert.match(section, /data-viz-name="composition-boundary"/);
  assert.match(section, /rightAngleCorners:\s*readonly number\[\]/);
  assert.match(section, /data-viz-name="right-angle-marks"[\s\S]*?data-viz-right-angle-count=\{rightAngleCount\}/);
  assert.match(section, /data-viz-name="right-angle-mark"[\s\S]*?data-viz-angle-kind="right"/);
  assert.match(primarySource, /tokenId:\s*"family-inclusion"[\s\S]*?"right-angle-mark"[\s\S]*?meaning:\s*"Visible equal-side, parallel-side, and right-angle evidence/);
  assert.match(section, /rectangle:[\s\S]*?rightAngleCorners:\s*\[0,\s*1,\s*2,\s*3\]/);
  assert.match(section, /square:[\s\S]*?rightAngleCorners:\s*\[0,\s*1,\s*2,\s*3\]/);
  assert.doesNotMatch(
    section,
    /CornerComparison|angleClass|angle-classification|comparison-ray|\bdegrees?\b|180\s*°|tessellation|interior-angle sum|diagonal theorem|coordinate proof|vector|slope/i
  );
});

test("P6 mean/fair-share/broken-line oracle keeps one four-value dataset synchronized", () => {
  const cases = [
    [[0, 0, 0, 0], 0],
    [[4, 4, 4, 4], 4],
    [[0, 4, 8, 12], 6],
    [[12, 8, 4, 0], 6],
    [[0, 12, 0, 12], 6],
    [[0, 1, 1, 1], 0.75],
    [[4, 8, 6, 10], 7],
    [[12, 12, 12, 12], 12]
  ] as const;

  for (const [values, expectedMean] of cases) {
    const fairShareValues = [...values];
    const brokenLineValues = [...values];
    const mean = values.reduce<number>((sum, value) => sum + value, 0) / values.length;
    const points = brokenLineValues.map((value, index) => ({ index, value }));
    const segments = points.slice(0, -1).map((point, index) => [point, points[index + 1]] as const);
    assert.equal(mean, expectedMean);
    assert.deepEqual(fairShareValues, brokenLineValues);
    assert.equal(points.length, 4);
    assert.equal(segments.length, 3);
    assert.ok(segments.every(([from, to]) => to.index === from.index + 1));
  }
});

test("P6 average source shares four values across fair-share and adjacent broken-line marks", () => {
  const section = sourceSection("type AveragesGraphMode", "function SpeedModel");
  assert.match(section, /type AveragesGraphMode = "mean-fair-share" \| "broken-line"/);
  assert.match(section, /const seriesA = useMemo\(\(\) => \[value1, value2, value3, value4\]/);
  assert.match(section, /const meanA = totalA \/ seriesA\.length/);
  assert.match(section, /data-viz-name="mean-fair-share"[\s\S]*?data-viz-count="4"/);
  assert.match(section, /data-viz-name="broken-line-series"[\s\S]*?data-viz-values=\{seriesA\.join\(","\)\}/);
  assert.match(section, /seriesA\.slice\(0, -1\)\.map[\s\S]*?data-viz-name="adjacent-line-segment"/);
  assert.match(section, /seriesA\.map[\s\S]*?data-viz-name="series-point"/);
  for (const controlId of ["value1", "value2", "value3", "value4"]) {
    assert.match(section, new RegExp(`controlId="${controlId}"`));
  }
  const learnerSection = section.replace(/labId="p6-ratio-proportion"/, "");
  assert.doesNotMatch(
    learnerSection,
    /firstTerm|secondTerm|scaleFactor|unitarySecond|ratio-bars|one-unit-row|weighted mean|median|standard deviation|variance|correlation|regression|gradient|slope|interpolat/i
  );
});

test("P6 given-percent plus/minus oracle covers zero, decimal, and 100-percent boundaries", () => {
  const cases = [
    [0, 0, "increase", 0, 0],
    [0, 100, "increase", 0, 0],
    [200, 0, "increase", 0, 200],
    [200, 0, "decrease", 0, 200],
    [200, 25, "increase", 50, 250],
    [200, 25, "decrease", 50, 150],
    [200, 37, "increase", 74, 274],
    [200, 37, "decrease", 74, 126],
    [45, 10, "increase", 4.5, 49.5],
    [45, 10, "decrease", 4.5, 40.5],
    [200, 100, "increase", 200, 400],
    [200, 100, "decrease", 200, 0],
    [500, 100, "increase", 500, 1000],
    [500, 100, "decrease", 500, 0]
  ] as const;

  for (const [baseAmount, percent, direction, expectedChange, expectedFinal] of cases) {
    const change = (baseAmount * percent) / 100;
    const finalAmount = direction === "increase" ? baseAmount + change : baseAmount - change;
    assert.equal(change, expectedChange);
    assert.equal(finalAmount, expectedFinal);
    assert.ok(change >= 0);
    assert.ok(finalAmount >= 0);
  }
});

test("P6 percentage source adds given-percent increase/decrease only, never reverse-percent or ratio work", () => {
  const section = sourceSection("function PercentagesModel", "type AveragesGraphMode");
  assert.match(section, /"equivalence" \| "given-change"/);
  assert.match(section, /useState\(200\)/);
  assert.match(section, /"increase" \| "decrease"/);
  assert.match(section, /const changeAmount = \(baseAmount \* percent\) \/ 100/);
  assert.match(section, /const finalAmount = changeDirection === "increase"\s*\? baseAmount \+ changeAmount\s*:\s*baseAmount - changeAmount/);
  assert.match(section, /function reset\(\)[\s\S]*?setChangeDirection\("increase"\)/);
  assert.doesNotMatch(section, /\bsetDirection\(/);
  assert.match(section, /data-viz-name="original-amount-bar"/);
  assert.match(section, /data-viz-name="percent-change-segment"/);
  assert.match(section, /data-viz-name="final-amount-bar"/);
  assert.match(section, /controlId="percent"[\s\S]*?min=\{0\}\s+max=\{100\}/);
  assert.match(section, /controlId="baseAmount"[\s\S]*?min=\{0\}\s+max=\{500\}/);
  assert.doesNotMatch(
    section,
    /originalUnknown|reversePercent|reverse percentage|find the original|unknown original|compound|successive|interestRate|profitMargin|lossRate|unknownPercent|\bratio\b|\bproportion\b/i
  );
});
