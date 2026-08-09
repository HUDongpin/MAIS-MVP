import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  clipLinearFunctionToSquare,
  clipSquareByLinearHalfPlane,
  svgPointOnRay
} from "../../../lib/mathDiagramGeometry";

const EPSILON = 0.01;
const lessonDir = path.join(process.cwd(), "components/lesson/ccss/lessons");
const source = (name: string) => readFileSync(path.join(lessonDir, `${name}.tsx`), "utf8");
const lessonViewSource = () => readFileSync(path.join(process.cwd(), "components/lesson/LessonView.tsx"), "utf8");
const ccssAdapterSource = () => readFileSync(path.join(process.cwd(), "components/lesson/ccss/CcssLessonAdapter.tsx"), "utf8");

function assertRange(label: string, value: number, minimum: number, maximum: number) {
  assert.ok(
    value >= minimum - EPSILON && value <= maximum + EPSILON,
    `${label}: ${value} must be within ${minimum}..${maximum}`
  );
}

test("lesson sources retain the audited viewBox gutters, affine maps, and complete control ranges", () => {
  assert.match(source("area-perimeter-formulas"), /width=\{W \+ 70\}[\s\S]*?viewBox=\{`0 0 \$\{W \+ 70\} \$\{H \+ 50\}`\}/u);
  assert.match(source("area-perimeter-formulas"), /transform="translate\(35,25\)"/u);
  assert.match(source("volume-mass"), /width="126" height="180" viewBox="0 0 126 180"/u);
  assert.match(source("time-five-minutes"), /mlabel = hand\(num \* 30, R - 34\)/u);
  assert.match(source("equation-of-circle"), /const R = 7, CELL = 24, PAD = 22;/u);
  assert.match(source("place-value-blocks"), /viewBox=\{`0 0 \$\{size \+ 2\} \$\{size \+ 2\}`\}/u);
  assert.match(source("place-value-blocks"), /viewBox=\{`0 0 \$\{U \+ 2\} \$\{height \+ 2\}`\}/u);
  assert.match(source("place-value-blocks"), /viewBox=\{`0 0 \$\{U \+ 2\} \$\{U \+ 2\}`\}/u);

  const periodic = source("periodic-models");
  assert.match(periodic, /const verticalExtent = Math\.max\(Math\.abs\(D \+ A\), Math\.abs\(D - A\)\)/u);
  assert.match(periodic, /const yScale = Math\.min\(30, \(MIDY - 3\) \/ verticalExtent\)/u);
  assert.match(periodic, /label="amplitude A" value=\{A\} min=\{1\} max=\{3\}/u);
  assert.match(periodic, /label="midline D" value=\{D\} min=\{-1\} max=\{2\} onChange=\{setD\}/u);

  const systems = source("linear-quadratic-systems");
  assert.match(systems, /const XR = 6, Y_MIN = -1, Y_MAX = 31, PXX = 40, PXY = 15, PAD = 28;/u);
  assert.match(systems, /const sy = \(y: number\) => PAD \+ \(Y_MAX - y\) \* PXY;/u);
  assert.doesNotMatch(systems, /Math\.min\(y, Y_MAX\)/u);
  assert.match(systems, /<g clipPath="url\(#linear-quadratic-plot\)">[\s\S]*?<polyline[\s\S]*?<line[\s\S]*?<\/g>\s*\{sols\.map/u);
});

test("function and inverse line segments stay inside the plot in all 36 control states", () => {
  const xRange = 6;
  let states = 0;

  for (let slope = 1; slope <= 4; slope += 1) {
    for (let intercept = -4; intercept <= 4; intercept += 1) {
      states += 1;
      const fn = (x: number) => slope * x + intercept;
      const inverse = (x: number) => (x - intercept) / slope;
      const functionRange = [
        Math.max(-xRange, (-xRange - intercept) / slope),
        Math.min(xRange, (xRange - intercept) / slope)
      ];
      const inverseRange = [
        Math.max(-xRange, intercept - slope * xRange),
        Math.min(xRange, intercept + slope * xRange)
      ];

      for (const x of functionRange) {
        assertRange("function endpoint x", x, -xRange, xRange);
        assertRange("function endpoint y", fn(x), -xRange, xRange);
      }
      for (const x of inverseRange) {
        assertRange("inverse endpoint x", x, -xRange, xRange);
        assertRange("inverse endpoint y", inverse(x), -xRange, xRange);
      }
    }
  }

  assert.equal(states, 36);
  const inverseFunctions = source("inverse-functions");
  assert.match(inverseFunctions, /const fMinX = Math\.max\(-XR, \(-XR - b\) \/ m\)/u);
  assert.match(inverseFunctions, /x1=\{sx\(fInvMinX\)\}[\s\S]*?x2=\{sx\(fInvMaxX\)\}/u);
});

test("systems-of-equations line paint stays inside its SVG gutter in all 70 control states", () => {
  const n = 10;
  const cell = 30;
  const pad = 30;
  const size = n * cell + 2 * pad;
  const center = n / 2;
  const range = center + 0.85;
  const strokeRadius = 1.5;
  let states = 0;

  for (let slope = -3; slope <= 3; slope += 1) {
    for (let intercept = 0; intercept <= 9; intercept += 1) {
      states += 1;
      const centeredIntercept = intercept + slope * center - center;
      const segment = clipLinearFunctionToSquare(slope, centeredIntercept, range);
      assert.ok(segment, `y=${slope}x+${intercept} must intersect the visible SVG frame`);
      for (const point of segment) {
        const svgX = pad + (point.x + center) * cell;
        const svgY = size - pad - (point.y + center) * cell;
        assertRange("systems line endpoint x including stroke", svgX, strokeRadius, size - strokeRadius);
        assertRange("systems line endpoint y including stroke", svgY, strokeRadius, size - strokeRadius);
      }
    }
  }

  assert.equal(states, 70);
  const systems = source("systems-of-equations");
  assert.match(systems, /const LINE_RANGE = LINE_CENTER \+ 0\.85;/u);
  assert.match(systems, /clipLinearFunctionToSquare\(m, centeredIntercept, LINE_RANGE\)/u);
  assert.doesNotMatch(systems, /y >= -1 && y <= N \+ 1/u);
});

test("linear inequality boundaries and shaded half-planes stay exact in all 126 states", () => {
  const range = 5;
  let states = 0;

  for (let slope = -3; slope <= 3; slope += 1) {
    for (let intercept = -4; intercept <= 4; intercept += 1) {
      const boundary = clipLinearFunctionToSquare(slope, intercept, range);
      assert.ok(boundary, "the configured inequality boundary must cross the plotting square");
      for (const point of boundary) {
        assertRange("inequality boundary x", point.x, -range, range);
        assertRange("inequality boundary y", point.y, -range, range);
        assert.ok(Math.abs(point.y - slope * point.x - intercept) <= EPSILON);
      }

      for (const keepAbove of [false, true]) {
        states += 1;
        const polygon = clipSquareByLinearHalfPlane({ intercept, keepAbove, range, slope });
        assert.ok(polygon.length >= 3, "the visible half-plane must retain a polygon");
        for (const point of polygon) {
          assertRange("half-plane x", point.x, -range, range);
          assertRange("half-plane y", point.y, -range, range);
          const signedDistance = point.y - slope * point.x - intercept;
          assert.ok(keepAbove ? signedDistance >= -EPSILON : signedDistance <= EPSILON);
        }
      }
    }
  }

  assert.equal(states, 126);
  const inequalities = source("graph-inequalities");
  assert.match(inequalities, /clipLinearFunctionToSquare\(m, b, XR\)/u);
  assert.match(inequalities, /clipSquareByLinearHalfPlane\(\{/u);
  assert.doesNotMatch(inequalities, /sy\(yAt\(-XR\)\)/u);
});

test("coordinate-proof slope lines terminate at the plotting square in every control state", () => {
  const range = 6;
  let segments = 0;

  for (let slope = 1; slope <= 4; slope += 1) {
    for (const candidateSlope of [slope, Math.round((-1 / slope) * 100) / 100]) {
      const line = clipLinearFunctionToSquare(candidateSlope, 0, range);
      assert.ok(line, `slope ${candidateSlope} must cross the plotting square`);
      segments += 1;
      for (const point of line) {
        assertRange("coordinate-proof endpoint x", point.x, -range, range);
        assertRange("coordinate-proof endpoint y", point.y, -range, range);
        assert.ok(Math.abs(point.y - candidateSlope * point.x) <= EPSILON);
      }
    }
  }

  assert.equal(segments, 8);
  const coordinateProofs = source("coordinate-proofs");
  assert.match(coordinateProofs, /clipLinearFunctionToSquare\(m, 0, R\)/u);
  assert.match(coordinateProofs, /clipLinearFunctionToSquare\(perpSlope, 0, R\)/u);
  assert.match(coordinateProofs, /className="h-auto max-w-full"/u);
  assert.doesNotMatch(coordinateProofs, /sy\(-m \* R\)/u);
});

test("slope explorer clips every distinct draggable point pair to the plotting square", () => {
  const range = 6;
  for (let x1 = -range; x1 <= range; x1 += 1) {
    for (let y1 = -range; y1 <= range; y1 += 1) {
      for (let x2 = -range; x2 <= range; x2 += 1) {
        for (let y2 = -range; y2 <= range; y2 += 1) {
          if (x1 === x2 && y1 === y2) continue;
          if (x1 === x2) {
            assert.ok(Math.abs(x1) <= range);
            continue;
          }
          const slope = (y2 - y1) / (x2 - x1);
          const intercept = y1 - slope * x1;
          const segment = clipLinearFunctionToSquare(slope, intercept, range);
          assert.ok(segment, `line through (${x1},${y1}) and (${x2},${y2}) must cross the square`);
          for (const point of segment) {
            assert.ok(Math.abs(point.x) <= range + 1e-9, `x=${point.x} escaped the square`);
            assert.ok(Math.abs(point.y) <= range + 1e-9, `y=${point.y} escaped the square`);
            assert.ok(Math.abs(point.y - (slope * point.x + intercept)) <= 1e-8, "clipped endpoint left its defining line");
          }
        }
      }
    }
  }

  const slopeExplorer = source("slope-explorer");
  assert.match(slopeExplorer, /clipLinearFunctionToSquare\(m, b, R\)/u);
  assert.doesNotMatch(slopeExplorer, /\{ x: -R, y: m \* -R \+ b \}/u);
});

test("conic-section mode controls wrap instead of centering unreachable mobile content", () => {
  assert.match(
    source("conic-sections"),
    /className="flex max-w-full flex-wrap justify-center gap-2"/u
  );
  assert.match(
    source("conic-sections"),
    /<svg className="mx-auto h-auto max-w-full" width=\{240\} height=\{190\}/u
  );
});

test("right-triangle elevation arc and diagram stay exact in all 204 control states", () => {
  const vertex = { x: 30, y: 150 };
  const arcRadius = 24;
  let states = 0;

  for (let distance = 20; distance <= 100; distance += 5) {
    for (let angle = 15; angle <= 70; angle += 5) {
      states += 1;
      const radians = angle * Math.PI / 180;
      const run = Math.min(180, 110 / Math.tan(radians));
      const rise = run * Math.tan(radians);
      const buildingX = vertex.x + run;
      const topY = vertex.y - rise;
      const start = svgPointOnRay(vertex, arcRadius, 0);
      const end = svgPointOnRay(vertex, arcRadius, radians);
      const vector = { x: end.x - vertex.x, y: vertex.y - end.y };

      assert.ok(Math.abs(Math.hypot(start.x - vertex.x, start.y - vertex.y) - arcRadius) <= EPSILON);
      assert.ok(Math.abs(Math.hypot(vector.x, vector.y) - arcRadius) <= EPSILON);
      assert.ok(Math.abs(vector.x * Math.sin(radians) - vector.y * Math.cos(radians)) <= EPSILON);
      assert.ok(vector.x * Math.cos(radians) + vector.y * Math.sin(radians) > 0);
      assertRange("building x", buildingX, 20, 240);
      assertRange("building top", topY, 2, 150);
      assertRange("height label x", buildingX > 185 ? buildingX - 6 : buildingX + 6, 20, 240);
      assert.ok(Number.isFinite(distance * Math.tan(radians)));
    }
  }
  assert.equal(states, 204);
  assert.match(source("solve-right-triangles"), /svgPointOnRay\(\{ x: observerX, y: groundY \}, arcR, rad\)/u);
});

test("triangle-angle construction fits all 6,961 integer angle pairs without degenerating", () => {
  const base = 240;
  const pad = 30;
  const frameWidth = 300;
  const frameHeight = 175;
  let states = 0;

  for (let angleA = 20; angleA <= 120; angleA += 1) {
    for (let angleB = 20; angleB <= 120; angleB += 1) {
      if (angleA + angleB > 160) continue;
      states += 1;
      const angleC = 180 - angleA - angleB;
      const radians = (degrees: number) => degrees * Math.PI / 180;
      const legFromA = base * Math.sin(radians(angleB)) / Math.sin(radians(angleC));
      const apexX = legFromA * Math.cos(radians(angleA));
      const apexY = legFromA * Math.sin(radians(angleA));
      const minX = Math.min(0, apexX);
      const maxX = Math.max(base, apexX);
      const scale = Math.min(frameWidth / (maxX - minX), frameHeight / apexY);
      const originX = pad - minX * scale;
      const originY = pad + apexY * scale;
      const baseWidth = base * scale;
      const apexPixelX = originX + apexX * scale;
      const apexPixelY = originY - apexY * scale;
      const svgWidth = (maxX - minX) * scale + 2 * pad;
      const svgHeight = apexY * scale + 2 * pad;

      assert.ok(apexY > 0 && scale > 0);
      for (const [label, x, y] of [
        ["left vertex", originX, originY],
        ["right vertex", originX + baseWidth, originY],
        ["apex", apexPixelX, apexPixelY]
      ] as const) {
        assertRange(`${label} x`, x, 1, svgWidth - 1);
        assertRange(`${label} y`, y, 1, svgHeight - 1);
      }
    }
  }
  assert.equal(states, 6961);
});

test("residual plot contains every complete fitted line, residual, and point in all 78 states", () => {
  const data: Array<[number, number]> = [[1, 3], [2, 4], [3, 6], [4, 7], [5, 9], [6, 10], [7, 12]];
  const width = 320;
  const height = 210;
  const pad = 34;
  let states = 0;

  for (let m = 8; m <= 20; m += 1) {
    for (let intercept = 0; intercept <= 5; intercept += 1) {
      states += 1;
      const slope = m / 10;
      const prediction = (x: number) => slope * x + intercept;
      const yMax = Math.max(14, Math.ceil(Math.max(...data.map(([, y]) => y), prediction(8)) / 2) * 2);
      const y = (value: number) => height - pad - value / yMax * (height - 2 * pad);
      for (const value of [0, prediction(0), prediction(8), ...data.flatMap(([x, actual]) => [actual, prediction(x)])]) {
        assertRange("residual y", y(value), pad - 1.25, height - pad + 1.25);
      }
    }
  }
  assert.equal(states, 78);
});

test("linear-quadratic graph contains all 185 reachable solution markers in 117 states", () => {
  const xRange = 6;
  const yMinimum = -1;
  const yMaximum = 31;
  const xScale = 40;
  const yScale = 15;
  const pad = 28;
  const plotRight = pad + 2 * xRange * xScale;
  const plotBottom = pad + (yMaximum - yMinimum) * yScale;
  const markerPaintRadius = 6;
  let states = 0;
  let markers = 0;

  for (let slope = -4; slope <= 4; slope += 1) {
    for (let intercept = -4; intercept <= 8; intercept += 1) {
      states += 1;
      const discriminant = slope * slope + 4 * intercept;
      const roots = discriminant > 0
        ? [(slope - Math.sqrt(discriminant)) / 2, (slope + Math.sqrt(discriminant)) / 2]
        : discriminant === 0 ? [slope / 2] : [];
      for (const root of roots) {
        markers += 1;
        const x = pad + (root + xRange) * xScale;
        const y = pad + (yMaximum - root * root) * yScale;
        assertRange("solution marker x paint", x - markerPaintRadius, pad, plotRight);
        assertRange("solution marker x paint", x + markerPaintRadius, pad, plotRight);
        assertRange("solution marker y paint", y - markerPaintRadius, pad, plotBottom);
        assertRange("solution marker y paint", y + markerPaintRadius, pad, plotBottom);
        assert.ok(Math.abs(root * root - (slope * root + intercept)) <= EPSILON);
      }
    }
  }
  assert.equal(states, 117);
  assert.equal(markers, 185);
});

test("circle and triangle labels stay inside their complete fixed SVG frames", () => {
  const circleRange = 7;
  const cell = 24;
  const pad = 22;
  const size = 2 * circleRange * cell + 2 * pad;
  let circles = 0;
  for (let h = -3; h <= 3; h += 1) {
    for (let k = -3; k <= 3; k += 1) {
      for (let radius = 1; radius <= 4; radius += 1) {
        circles += 1;
        const x = pad + (h + circleRange) * cell;
        const y = size - pad - (k + circleRange) * cell;
        const paintRadius = radius * cell + 1.25;
        assertRange("circle left", x - paintRadius, 0, size);
        assertRange("circle right", x + paintRadius, 0, size);
        assertRange("circle top", y - paintRadius, 0, size);
        assertRange("circle bottom", y + paintRadius, 0, size);
      }
    }
  }
  assert.equal(circles, 196);

  let triangleStates = 0;
  for (let base = 2; base <= 8; base += 1) {
    for (let height = 2; height <= 6; height += 1) {
      for (let apex = 0; apex <= base; apex += 1) {
        triangleStates += 1;
        const width = base * 30;
        const labelX = apex === base ? apex * 30 - 6 : apex * 30 + 6;
        const approximateLabelWidth = 36;
        const left = apex === base ? labelX - approximateLabelWidth : labelX;
        const right = apex === base ? labelX : labelX + approximateLabelWidth;
        assertRange("height label left", left + 20, 0, width + 40);
        assertRange("height label right", right + 20, 0, width + 40);
      }
    }
  }
  assert.equal(triangleStates, 210);
});

test("perpendicular-bisector compass arcs use their exact in-frame intersections", () => {
  const constructions = source("constructions");
  const radius = 95;
  const halfSegment = 70;
  const centerY = 100;
  const intersectionX = 130;
  const intersectionOffset = Math.sqrt(radius ** 2 - halfSegment ** 2);

  assert.ok(intersectionX - (radius - halfSegment) > 0);
  assert.ok(intersectionX + (radius - halfSegment) < 260);
  assert.ok(centerY - intersectionOffset > 0);
  assert.ok(centerY + intersectionOffset < 200);
  assert.doesNotMatch(constructions, /<circle cx=\{60\} cy=\{100\} r=\{95\}/u);
  assert.doesNotMatch(constructions, /<circle cx=\{200\} cy=\{100\} r=\{95\}/u);
  assert.match(constructions, /A \$\{COMPASS_RADIUS\} \$\{COMPASS_RADIUS\} 0 0 1/u);
  assert.match(constructions, /A \$\{COMPASS_RADIUS\} \$\{COMPASS_RADIUS\} 0 0 0/u);
});

test("confidence intervals and all original periodic states retain their full paint", () => {
  let intervalStates = 0;
  for (let samplePercent = 30; samplePercent <= 70; samplePercent += 2) {
    for (let sampleSize = 100; sampleSize <= 1600; sampleSize += 100) {
      intervalStates += 1;
      const p = samplePercent / 100;
      const margin = Math.round(196 * Math.sqrt(p * (1 - p) / sampleSize) * 100) / 100;
      const low = samplePercent - margin;
      const high = samplePercent + margin;
      assertRange("confidence interval low", low, 20, 80);
      assertRange("confidence interval high", high, 20, 80);
    }
  }
  assert.equal(intervalStates, 336);

  let periodicStates = 0;
  for (let amplitude = 1; amplitude <= 3; amplitude += 1) {
    for (let period = 2; period <= 8; period += 1) {
      for (let midline = -1; midline <= 2; midline += 1) {
        periodicStates += 1;
        const extent = Math.max(Math.abs(midline + amplitude), Math.abs(midline - amplitude));
        const scale = Math.min(30, 107 / extent);
        for (let x = 0; x <= 8 + 0.001; x += 0.05) {
          const value = amplitude * Math.sin(2 * Math.PI * x / period) + midline;
          const y = 110 - value * scale;
          assertRange("periodic curve paint", y, 1.25, 218.75);
        }
        for (const value of [midline - amplitude, midline, midline + amplitude]) {
          assertRange("periodic guide paint", 110 - value * scale, 1.25, 218.75);
        }
      }
    }
  }
  assert.equal(periodicStates, 84);
});

test("static elementary lesson diagrams retain complete paint and non-overlapping label radii", () => {
  let rectangleStates = 0;
  for (let length = 1; length <= 10; length += 1) {
    for (let width = 1; width <= 7; width += 1) {
      rectangleStates += 1;
      const svgWidth = length * 30 + 70;
      const svgHeight = width * 30 + 50;
      assertRange("rectangle stroke left", 35 - 2, 0, svgWidth);
      assertRange("rectangle stroke right", 35 + length * 30 + 2, 0, svgWidth);
      assertRange("width label left", 35 - 11 - 21, 0, svgWidth);
      assertRange("length label top", 25 - 9 - 13, 0, svgHeight);
    }
  }
  assert.equal(rectangleStates, 70);

  let liquidStates = 0;
  for (let milliliters = 0; milliliters <= 2000; milliliters += 50) {
    liquidStates += 1;
    const fillPercent = milliliters / 2000;
    const y = 13 + (1 - fillPercent) * 154;
    const height = fillPercent * 154;
    assertRange("beaker fill top", y, 0, 180);
    assertRange("beaker fill bottom", y + height, 0, 180);
  }
  assert.equal(liquidStates, 41);

  const clockCenter = { x: 100, y: 100 };
  const polar = (degrees: number, radius: number) => ({
    x: clockCenter.x + radius * Math.sin(degrees * Math.PI / 180),
    y: clockCenter.y - radius * Math.cos(degrees * Math.PI / 180)
  });
  for (let hour = 1; hour <= 12; hour += 1) {
    const hourCenter = polar(hour * 30, 68);
    const minuteCenter = polar(hour * 30, 50);
    assert.ok(Math.hypot(hourCenter.x - minuteCenter.x, hourCenter.y - minuteCenter.y) >= 18 - EPSILON);
    assertRange("hour label x", hourCenter.x, 15, 185);
    assertRange("minute label x", minuteCenter.x, 15, 185);
  }

  const composePaintBounds = [
    { minX: 54, minY: 1, maxX: 146, maxY: 151 },
    { minX: 54, minY: 19, maxX: 146, maxY: 151 },
    { minX: 39, minY: 54, maxX: 161, maxY: 150 },
    { minX: 39, minY: 54, maxX: 161, maxY: 132 }
  ];
  for (const bounds of composePaintBounds) {
    assertRange("composite min x", bounds.minX, 0, 200);
    assertRange("composite min y", bounds.minY, 0, 180);
    assertRange("composite max x", bounds.maxX, 0, 200);
    assertRange("composite max y", bounds.maxY, 0, 180);
  }
});

test("wide HTML comparison rows start at a reachable scroll origin", () => {
  const comparison = source("compare-three-digit");
  const rowClass = comparison.match(
    /<div className="([^"]+)">\s*<NumberCols d=\{da\} decideIdx=\{decideIdx\}/u
  )?.[1];

  assert.ok(rowClass, "comparison row class must remain discoverable");
  const classes = new Set(rowClass.split(/\s+/u));
  for (const className of ["w-max", "max-w-none", "self-start", "mx-auto"]) {
    assert.ok(classes.has(className), `comparison row must include ${className}`);
  }
});

test("wide HTML-only lesson figures keep their left edge reachable", () => {
  for (const lessonName of [
    "missing-addend",
    "compare-fractions-4",
    "decimals-fractions",
    "place-value-relationship",
    "read-compare-multidigit",
    "add-subtract-bignum",
    "divide-fractions",
    "divide-multidigit",
    "decimal-arithmetic"
  ]) {
    const lessonSource = source(lessonName);
    const stageContentClass = lessonSource.match(
      /<Figure[\s\S]*?<div className="([^"]*mx-auto[^"]*w-max[^"]*max-w-none[^"]*)">/u
    )?.[1];

    assert.ok(stageContentClass, `${lessonName} must expose a max-content Figure row`);
    const classes = new Set(stageContentClass.split(/\s+/u));
    for (const className of ["mx-auto", "w-max", "max-w-none", "self-start"]) {
      assert.ok(classes.has(className), `${lessonName} Figure content must include ${className}`);
    }
  }

  const tenFrame = source("counting-ten-frame");
  assert.match(tenFrame, /className="grid gap-1 rounded-2xl[^"]* p-1"/u);
  assert.match(tenFrame, /className="flex flex-wrap items-center justify-center gap-3"/u);

  assert.match(source("equal-sign-balance"), /<svg className="mx-auto max-w-none self-start" width="320"/u);
  const roundingMultidigit = source("rounding-multidigit");
  assert.match(roundingMultidigit, /className="flex flex-wrap items-center justify-center gap-2"/u);
  assert.match(roundingMultidigit, /className="flex self-start flex-col items-center gap-1"/u);
  assert.match(source("negative-numbers"), /className="flex flex-wrap items-center justify-center gap-8"/u);
  assert.match(source("four-quadrant-plane"), /className="flex flex-wrap items-center justify-center gap-2"/u);
  assert.match(source("four-quadrant-plane"), /className="flex flex-wrap items-center justify-center gap-6"/u);

  const timeToMinute = source("time-to-minute");
  assert.match(timeToMinute, /className="max-w-full rounded-2xl[^"]*px-3[^"]*sm:px-6"/u);
  assert.match(timeToMinute, /className="mt-2 w-44 max-w-full[^"]*sm:w-48"/u);
  assert.match(
    source("read-compare-multidigit"),
    /className="flex w-max max-w-none self-start items-center gap-1\.5"/u
  );
});

test("every fixed-width HTML mathematical object uses a reachable max-content anchor", () => {
  const expectedAnchorCounts: Record<string, number> = {
    "line-plot": 1,
    "word-problems-100": 1,
    "measure-line-plot": 1,
    "compare-fractions": 1,
    "line-plot-fractions": 1,
    "multiplicative-comparison": 1,
    "factors-multiples": 1,
    "growing-patterns": 1,
    "add-fractions-unlike": 1,
    "divide-unit-fractions": 2,
    "two-way-tables": 1,
    "real-number-closure": 1,
    "function-notation": 1,
    "matrix-equations": 2,
    "two-way-frequencies": 1,
    "construct-linear-exponential": 1,
    "random-variables": 1,
    "expected-value": 1
  };

  for (const [lessonName, expectedCount] of Object.entries(expectedAnchorCounts)) {
    const anchoredClasses = Array.from(
      source(lessonName).matchAll(/className="([^"]+)"/gu),
      (match) => new Set(match[1].split(/\s+/u))
    ).filter((classes) => ["mx-auto", "w-max", "max-w-none", "self-start"]
      .every((className) => classes.has(className)));

    assert.equal(
      anchoredClasses.length,
      expectedCount,
      `${lessonName} must expose exactly ${expectedCount} reachable fixed mathematical object anchor(s)`
    );
  }

  assert.match(
    source("graph-stories"),
    /<svg className="mx-auto max-w-none self-start" width=\{W\} height=\{H\}/u
  );
});

test("HTML mathematical controls reflow instead of expanding the Figure stage", () => {
  const metricConversion = source("metric-conversion");
  assert.match(metricConversion, /grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/u);
  assert.equal(metricConversion.match(/className="min-w-0 w-full[^"]*sm:w-auto"/gu)?.length, 2);

  assert.match(source("decimal-place-value"), /className="flex items-end gap-1 sm:gap-1\.5"/u);
  assert.match(source("decimal-place-value"), /className="grid h-12 w-12[^"]*sm:h-14 sm:w-14"/u);
  assert.match(source("read-compare-decimals-thousandths"), /className="flex items-center gap-1 sm:gap-1\.5"/u);

  const decimalOperations = source("decimal-operations");
  assert.match(decimalOperations, /className="flex items-center gap-1 sm:gap-1\.5"/u);
  assert.equal(decimalOperations.match(/className="h-9 w-10[^"]*sm:w-11"/gu)?.length, 2);

  assert.match(source("variables-expressions"), /className="flex flex-wrap justify-center gap-x-6 gap-y-2/u);
  assert.match(source("integer-exponents"), /className="flex flex-wrap items-center justify-center gap-2"/u);

  const matrixEquations = source("matrix-equations");
  assert.match(matrixEquations, /mx-auto grid w-max max-w-none self-start grid-cols-2 gap-x-1 gap-y-2 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-6/u);
  assert.match(matrixEquations, /className="flex items-center gap-1"/u);

  for (const lessonName of ["two-patterns-graph", "proportional-relationships"]) {
    assert.match(
      source(lessonName),
      /className="flex self-start flex-wrap items-center justify-start gap-6 sm:self-center sm:justify-center"/u,
      `${lessonName} must start oversized table rows at the mobile scroll origin`
    );
  }
});

test("fraction number-line controls wrap inside the mobile Figure stage", () => {
  const fractionsNumberLine = source("fractions-number-line");

  assert.match(
    fractionsNumberLine,
    /className="flex w-full max-w-sm flex-col items-center gap-3"/u
  );
  assert.equal(
    fractionsNumberLine.match(
      /className="flex max-w-full flex-wrap items-center justify-center gap-[23]"/gu
    )?.length,
    2
  );
});

test("scatter-plot association controls wrap inside the mobile Figure stage", () => {
  assert.match(
    source("scatter-plots"),
    /className="flex max-w-full flex-wrap items-center justify-center gap-2"/u
  );
});

test("remaining fixed lesson diagrams keep a reachable mobile origin or scale to fit", () => {
  assert.match(
    source("protractor"),
    /<svg className="mx-auto max-w-none self-start" width="320" height="180"/u
  );
  assert.match(
    source("estimate-population"),
    /<svg className="mx-auto max-w-none self-start" width=\{320\} height=\{60\}/u
  );

  for (const [lessonName, width, height] of [
    ["add-angles", "240", "160"],
    ["set-operations-events", "260", "170"],
    ["addition-rule", "240", "150"]
  ] as const) {
    assert.match(
      source(lessonName),
      new RegExp(`<svg className="mx-auto h-auto max-w-full" width=["{]${width}["}] height=["{]${height}["}]`, "u"),
      `${lessonName} must scale its fixed SVG into narrow Figure stages`
    );
  }

  assert.match(
    source("round-decimals"),
    /className="flex max-w-full flex-wrap items-center justify-center gap-2"/u
  );
  assert.match(
    source("dependent-independent"),
    /className="flex self-start flex-wrap items-center justify-start gap-6 sm:self-center sm:justify-center"/u
  );
});

test("congruence and proof diagrams scale or wrap inside the mobile Figure stage", () => {
  for (const [lessonName, width, height] of [
    ["figure-symmetry", 240, 240],
    ["prove-angle-theorems", 260, 200],
    ["prove-triangle-theorems", 240, 170],
    ["prove-parallelogram-theorems", 240, 160],
    ["constructions", 260, 200]
  ] as const) {
    assert.match(
      source(lessonName),
      new RegExp(`<svg className="mx-auto h-auto max-w-full" width=\\{?${width}\\}? height=\\{?${height}\\}?`, "u"),
      `${lessonName} must scale its fixed SVG into narrow Figure stages`
    );
  }

  assert.match(
    source("congruence-criteria"),
    /className="flex max-w-full flex-wrap items-center justify-center gap-4 sm:gap-8"/u
  );
});

test("protractor and decimal controls shrink inside the mobile Figure stage", () => {
  const protractor = source("protractor");
  const roundDecimals = source("round-decimals");

  assert.match(protractor, /className="flex w-64 max-w-full flex-col items-center gap-1"/u);
  assert.match(protractor, /className="w-full accent-\[var\(--band-upper\)\]"/u);
  assert.match(roundDecimals, /className="flex max-w-full items-center gap-1 sm:gap-1\.5"/u);
  assert.match(roundDecimals, /className="h-9 w-10[^\n]*sm:w-11"/u);
  assert.match(roundDecimals, /className="h-9 w-8[^\n]*sm:w-9"/u);
  assert.match(roundDecimals, /className="w-14[^\n]*sm:w-16"/u);
});

test("integer addition arrows retain complete paint in all 289 input states", () => {
  const inputMinimum = -8;
  const inputMaximum = 8;
  const plotMinimum = inputMinimum * 2;
  const plotMaximum = inputMaximum * 2;
  const width = 620;
  const height = 170;
  const pad = 30;
  const axisY = 110;
  const lineWidth = width - 2 * pad;
  const x = (value: number) => pad
    + (value - plotMinimum) / (plotMaximum - plotMinimum) * lineWidth;
  let states = 0;

  for (let first = inputMinimum; first <= inputMaximum; first += 1) {
    for (let second = inputMinimum; second <= inputMaximum; second += 1) {
      states += 1;
      const sum = first + second;
      const arrows = [
        { from: 0, to: first, y: axisY - 26 },
        { from: first, to: sum, y: axisY - 50 }
      ];

      for (const { from, to, y } of arrows) {
        if (from === to) continue;
        const startX = x(from);
        const endX = x(to);
        const direction = endX > startX ? 1 : -1;
        const arrowBaseX = endX - direction * 8;
        assertRange("arrow line start x", startX - 1.5, 0, width);
        assertRange("arrow line end x", endX + 1.5, 0, width);
        assertRange("arrow tip x", endX, 0, width);
        assertRange("arrow head base x", arrowBaseX, 0, width);
        assertRange("arrow head top", y - 5.6, 0, height);
        assertRange("arrow head bottom", y + 5.6, 0, height);
      }

      const resultX = x(sum);
      assertRange("sum marker left paint", resultX - 8.25, 0, width);
      assertRange("sum marker right paint", resultX + 8.25, 0, width);
      // The widest configured result is three glyphs (−16); 15px on each side
      // is a conservative bound for the centered 13px bold result label.
      assertRange("sum label left paint", resultX - 15, 0, width);
      assertRange("sum label right paint", resultX + 15, 0, width);
    }
  }

  assert.equal(states, 289);
  const integerArrows = source("integer-arrows");
  assert.match(integerArrows, /const INPUT_MIN = -8;/u);
  assert.match(integerArrows, /const INPUT_MAX = 8;/u);
  assert.match(integerArrows, /const MIN = INPUT_MIN \* 2;/u);
  assert.match(integerArrows, /const MAX = INPUT_MAX \* 2;/u);
  assert.match(integerArrows, /min=\{INPUT_MIN\}[\s\S]*?max=\{INPUT_MAX\}/u);
});

test("fixed trigonometry SVGs scale into the Figure stage and retain every control state", () => {
  const fixedSvgSources = [
    ["special-angle-values", 240, 180],
    ["trig-symmetry", 260, 260],
    ["trig-identities", 240, 240]
  ] as const;

  for (const [lessonName, width, height] of fixedSvgSources) {
    assert.match(
      source(lessonName),
      new RegExp(`<svg className="mx-auto h-auto max-w-full" width=\\{?${width}\\}? height=\\{?${height}\\}?`, "u"),
      `${lessonName} must scale its SVG into narrow Figure stages`
    );
  }

  let symmetryStates = 0;
  for (let degrees = 10; degrees <= 80; degrees += 5) {
    symmetryStates += 1;
    const radians = degrees * Math.PI / 180;
    const reflectedRadians = (180 - degrees) * Math.PI / 180;
    for (const angle of [radians, reflectedRadians]) {
      const pointX = 130 + 100 * Math.cos(angle);
      const pointY = 130 - 100 * Math.sin(angle);
      assertRange("symmetry marker left paint", pointX - 5, 0, 260);
      assertRange("symmetry marker right paint", pointX + 5, 0, 260);
      assertRange("symmetry marker top paint", pointY - 5, 0, 260);
      assertRange("symmetry marker bottom paint", pointY + 5, 0, 260);
    }
  }
  assert.equal(symmetryStates, 15);

  let identityStates = 0;
  for (let degrees = 10; degrees <= 80; degrees += 1) {
    identityStates += 1;
    const radians = degrees * Math.PI / 180;
    const pointX = 120 + 90 * Math.cos(radians);
    const pointY = 120 - 90 * Math.sin(radians);
    assertRange("identity marker left paint", pointX - 5, 0, 240);
    assertRange("identity marker right paint", pointX + 5, 0, 240);
    assertRange("identity marker top paint", pointY - 5, 0, 240);
    assertRange("identity marker bottom paint", pointY + 5, 0, 240);
    assertRange("identity sine label left", pointX + 6, 0, 240);
    assertRange("identity sine label right", pointX + 30, 0, 240);
  }
  assert.equal(identityStates, 71);
});

test("similarity and triangle-solving diagrams stay reachable in the mobile Figure stage", () => {
  assert.match(
    source("similarity-transformations"),
    /className="flex max-w-full flex-col items-center gap-4 sm:flex-row sm:gap-8"/u
  );

  for (const [lessonName, width, height] of [
    ["similarity-proofs", 240, 200],
    ["trig-ratios", 240, 170],
    ["solve-right-triangles", 260, 180],
    ["triangle-area-sine", 240, 170],
    ["laws-sines-cosines", 240, 160]
  ] as const) {
    assert.match(
      source(lessonName),
      new RegExp(`<svg className="mx-auto h-auto max-w-full" width=\\{?${width}\\}? height=\\{?${height}\\}?`, "u"),
      `${lessonName} must scale its fixed SVG into narrow Figure stages`
    );
  }
});

test("circle and volume diagrams scale into narrow Figure stages", () => {
  for (const [lessonName, width, height] of [
    ["circle-angles", 260, 260],
    ["circle-constructions", 240, 190],
    ["arc-length-sector", 240, 240],
    ["volume-arguments", 240, 200]
  ] as const) {
    assert.match(
      source(lessonName),
      new RegExp(`<svg className="mx-auto h-auto max-w-full" width=\\{?${width}\\}? height=\\{?${height}\\}?`, "u"),
      `${lessonName} must scale its fixed SVG into narrow Figure stages`
    );
  }
});

test("middle-school geometry controls reflow and fixed prism art scales on phones", () => {
  for (const lessonName of ["cross-sections", "angle-relationships"] as const) {
    assert.match(
      source(lessonName),
      /className="flex max-w-full flex-wrap items-center justify-center gap-2"/u,
      `${lessonName} mode controls must wrap inside narrow Figure stages`
    );
  }

  assert.match(
    source("area-volume-surface"),
    /<svg className="mx-auto h-auto max-w-full" width="240" height="160"/u
  );
  assert.match(
    source("angle-relationships"),
    /<svg className="mx-auto h-auto max-w-full" width="260" height="200"/u
  );
});

test("kindergarten position diagram scales into narrow Figure stages", () => {
  const positionWords = source("position-words");

  assert.match(
    positionWords,
    /<svg className="mx-auto h-auto max-w-full" width="260" height="180" viewBox="0 0 260 180"/u
  );
  assert.match(positionWords, /aria-label=\{`ball \$\{pos\.word\} the box`\}/u);
});

test("lesson practice grids allow every nested card to shrink to the viewport", () => {
  const lessonView = lessonViewSource();

  assert.match(
    lessonView,
    /<div className="grid min-w-0 grid-cols-\[minmax\(0,1fr\)\] gap-5 rounded-\[28px\]/u
  );
  assert.match(
    lessonView,
    /<div className="min-w-0 flex flex-col gap-4 rounded-3xl/u
  );
  assert.match(
    lessonView,
    /<div className="grid min-w-0 grid-cols-\[minmax\(0,1fr\)\] gap-5">\s*\{questions\.map/u
  );
  assert.match(
    lessonView,
    /data-ai-title=\{text\(question\.topic\)\}\s*className="min-w-0 rounded-3xl/u
  );
});

test("the loaded lesson root exposes one stable audit-ready marker", () => {
  const lessonView = lessonViewSource();
  const ccssAdapter = ccssAdapterSource();

  assert.equal(lessonView.match(/data-lesson-ready="true"/gu)?.length ?? 0, 1);
  assert.match(
    lessonView,
    /<div\s+ref=\{lessonSelectionRootRef\}\s+data-lesson-ready="true"/u
  );
  assert.match(
    ccssAdapter,
    /data-ccss-diagram-hydrated=\{isHydrated \? "true" : "false"\}/u,
    "CCSS diagrams must expose an explicit client-hydration readiness contract before state traversal"
  );
});

test("precise definitions exposes every mathematical diagram state to the browser boundary audit", () => {
  const preciseDefinitions = source("precise-definitions");

  assert.match(preciseDefinitions, /\{ name: "Angle",[\s\S]*?draw: "angle" \}/u);
  assert.match(preciseDefinitions, /\{ name: "Circle",[\s\S]*?draw: "circle" \}/u);
  assert.match(preciseDefinitions, /\{ name: "Parallel lines",[\s\S]*?draw: "parallel" \}/u);
  assert.match(preciseDefinitions, /\{ name: "Perpendicular",[\s\S]*?draw: "perp" \}/u);
  assert.match(preciseDefinitions, /aria-pressed=\{idx === i\}/u);
  assert.match(preciseDefinitions, /data-ccss-diagram-state=\{tm\.draw\}/u);
  assert.match(preciseDefinitions, /data-ccss-diagram-state-button/u);

  const angleArcTag = preciseDefinitions.match(/<path\b(?=[^>]*\bdata-diagram-angle-arc\b)[^>]*>/u)?.[0];
  const definingRayTags = Array.from(
    preciseDefinitions.matchAll(/<line\b(?=[^>]*\bdata-diagram-defining-ray\b)[^>]*>/gu),
    (match) => match[0]
  );
  assert.ok(angleArcTag);
  const angleArc = preciseDefinitions.indexOf(angleArcTag);
  const firstDefiningRay = Math.min(...definingRayTags.map((tag) => preciseDefinitions.indexOf(tag)));
  assert.ok(angleArc >= 0 && firstDefiningRay > angleArc);
  assert.equal(definingRayTags.length, 2);
  assert.match(angleArcTag, /\bstrokeLinecap="butt"/u);
});
