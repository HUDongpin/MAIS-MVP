import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildConfiguredSemanticSecondaryMathState,
  CONFIGURED_SEMANTIC_SECONDARY_MARKS_SOURCE,
  ConfiguredSemanticSecondaryMarks,
  configuredSemanticSecondaryActualFamilies,
  configuredSemanticSecondaryLayout,
  configuredSemanticSecondaryFamilies,
  configuredSemanticSecondaryRequiredModeCount,
  configuredSemanticSecondaryRequiredNumericControlCount,
  formatConfiguredSemanticSecondaryDisplayValue,
  projectConfiguredSemanticSecondaryDisplayValues,
  semanticMetricNumber
} from "./ConfiguredSemanticSecondaryMarks";
import * as secondaryMarksModule from "./ConfiguredSemanticSecondaryMarks";
import { getConfiguredVisualizationSemanticControlContract } from "./configuredVisualizationSemanticControls";

const source = fs.readFileSync("components/visualizations/ConfiguredSemanticSecondaryMarks.tsx", "utf8");

const baseInput = {
  comparison: 7,
  mode: 0,
  value: 6,
  variant: "audit-contract"
} as const;

const visibleTheme = {
  axis: "#64748b",
  axisStrong: "#334155",
  grid: "#cbd5e1",
  labelFill: "#ffffff",
  labelStroke: "#0891b2",
  labelText: "#155e75",
  neutralStroke: "#475569",
  pointStroke: "#0f172a",
  softFill: "#ecfeff",
  text: "#0f172a",
  textMuted: "#475569"
} as const;

function stripQaAndMetadata(markup: string) {
  return markup
    .replace(/<metadata\b[^>]*>[\s\S]*?<\/metadata>/gu, "")
    .replace(/\sdata-viz-[\w-]+="[^"]*"/gu, "")
    .replace(/<!--\s*-->/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function renderRawSecondary(
  family: (typeof configuredSemanticSecondaryActualFamilies)[number],
  input: { comparison: number; mode: number; value: number },
  variant = "audit-contract"
) {
  return renderToStaticMarkup(createElement(
    "svg",
    { viewBox: "0 0 640 360" },
    createElement(ConfiguredSemanticSecondaryMarks, {
      ...input,
      accent: "#06b6d4",
      family,
      variant,
      vizTheme: visibleTheme
    })
  ));
}

function renderVisibleSecondary(
  family: (typeof configuredSemanticSecondaryActualFamilies)[number],
  input: { comparison: number; mode: number; value: number },
  variant = "audit-contract"
) {
  return stripQaAndMetadata(renderRawSecondary(family, input, variant));
}

type SemanticOverlapOwnerEvidence = {
  attributes: string;
  body: string;
  id: string;
};

const semanticOverlapBannedOwnerPattern =
  /\b(?:data-viz-active-lab-id|data-hk-viz-model|data-viz-configured-model|data-viz-configured-state|data-viz-surface|data-viz-panel-mode|data-viz-card|data-viz-card-body)=/u;

function semanticOverlapAttribute(attributes: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return attributes.match(new RegExp(`\\b${escapedName}="([^"]*)"`, "u"))?.[1] ?? null;
}

function semanticOverlapOwners(markup: string): SemanticOverlapOwnerEvidence[] {
  return Array.from(markup.matchAll(
    /<g\b([^>]*\bdata-viz-overlap-ok="[^"]+"[^>]*)>([\s\S]*?)<\/g>/gu
  )).map((match) => {
    const attributes = match[1] ?? "";
    return {
      attributes,
      body: match[2] ?? "",
      id: semanticOverlapAttribute(attributes, "data-viz-overlap-ok") ?? ""
    };
  });
}

function semanticOverlapProtocolIssues(markup: string) {
  const issues: string[] = [];
  const owners = semanticOverlapOwners(markup);
  const ownerIds = new Set<string>();

  for (const owner of owners) {
    if (!owner.id) issues.push("missing-owner-id");
    if (ownerIds.has(owner.id)) issues.push(`duplicate-owner:${owner.id}`);
    ownerIds.add(owner.id);
    if (!semanticOverlapAttribute(owner.attributes, "data-viz-overlap-reason")?.trim()) {
      issues.push(`missing-reason:${owner.id}`);
    }
    if (semanticOverlapBannedOwnerPattern.test(owner.attributes)) {
      issues.push(`broad-owner:${owner.id}`);
    }
    if (/\b(?:data-viz-mark|data-viz-label)=/u.test(owner.attributes)) {
      issues.push(`owner-is-candidate:${owner.id}`);
    }

    const candidates = Array.from(owner.body.matchAll(
      /<(?!g\b)[a-z][^>]*\b(?:data-viz-mark|data-viz-label)="[^"]*"[^>]*>/gu
    )).map((match) => match[0]);
    const roles = candidates.map(
      (candidate) => semanticOverlapAttribute(candidate, "data-viz-overlap-member") ?? "missing"
    );
    if (candidates.length !== 2) {
      issues.push(`candidate-count:${owner.id}:${candidates.length}`);
    }
    if (roles.toSorted().join(",") !== "label,mark") {
      issues.push(`member-roles:${owner.id}:${roles.toSorted().join(",")}`);
    }
  }

  return issues;
}

function renderSemanticOverlapFixture(
  id: string,
  members: readonly ("label" | "mark")[],
  broad = false
) {
  return renderToStaticMarkup(createElement(
    "svg",
    { viewBox: "0 0 100 40" },
    createElement(
      "g",
      {
        "data-viz-overlap-ok": id,
        "data-viz-overlap-reason": "fixture intentionally exercises the exact overlap protocol",
        ...(broad ? { "data-viz-surface": "broad-fixture" } : {})
      },
      ...members.map((member, index) => member === "mark"
        ? createElement("rect", {
            "data-viz-mark": true,
            "data-viz-overlap-member": member,
            height: 20,
            key: `${member}-${index}`,
            width: 80,
            x: 10,
            y: 10
          })
        : createElement("text", {
            "data-viz-label": true,
            "data-viz-overlap-member": member,
            key: `${member}-${index}`,
            x: 50,
            y: 25
          }, "label"))
    )
  ));
}

type RenderedPoint = readonly [number, number];

function attributeForNamedMark(markup: string, name: string, attribute: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = markup.match(
    new RegExp(`data-viz-name="${escapedName}"[^>]*\\b${attribute}="([^"]+)"`, "u")
  );
  assert.ok(match, `${name}: missing ${attribute}`);
  return match[1];
}

function renderedPolygonPoints(markup: string, name: string): RenderedPoint[] {
  return attributeForNamedMark(markup, name, "points")
    .trim()
    .split(/\s+/u)
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      assert.ok(Number.isFinite(x) && Number.isFinite(y), `${name}: finite point`);
      return [x, y] as const;
    });
}

function renderedLinePoints(markup: string, name: string): readonly [RenderedPoint, RenderedPoint] {
  const x1 = Number(attributeForNamedMark(markup, name, "x1"));
  const y1 = Number(attributeForNamedMark(markup, name, "y1"));
  const x2 = Number(attributeForNamedMark(markup, name, "x2"));
  const y2 = Number(attributeForNamedMark(markup, name, "y2"));
  assert.ok([x1, y1, x2, y2].every(Number.isFinite), `${name}: finite line`);
  return [[x1, y1], [x2, y2]];
}

function renderedDistance(a: RenderedPoint, b: RenderedPoint) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function renderedAngle(vertex: RenderedPoint, a: RenderedPoint, b: RenderedPoint) {
  const first = [a[0] - vertex[0], a[1] - vertex[1]] as const;
  const second = [b[0] - vertex[0], b[1] - vertex[1]] as const;
  const denominator = Math.hypot(...first) * Math.hypot(...second);
  assert.ok(denominator > 0, "rendered angle has non-zero rays");
  const cosine = Math.max(-1, Math.min(1, (first[0] * second[0] + first[1] * second[1]) / denominator));
  return Math.acos(cosine) * 180 / Math.PI;
}

function renderedSideLengths(points: readonly RenderedPoint[]) {
  return points.map((point, index) => renderedDistance(point, points[(index + 1) % points.length]));
}

function renderedInteriorAngles(points: readonly RenderedPoint[]) {
  return points.map((point, index) => renderedAngle(
    point,
    points[(index + points.length - 1) % points.length],
    points[(index + 1) % points.length]
  ));
}

function renderedSignedArea(points: readonly RenderedPoint[]) {
  return points.reduce((total, point, index) => {
    const next = points[(index + 1) % points.length];
    return total + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
}

function normalizedCross(first: readonly [RenderedPoint, RenderedPoint], second: readonly [RenderedPoint, RenderedPoint]) {
  const a = [first[1][0] - first[0][0], first[1][1] - first[0][1]] as const;
  const b = [second[1][0] - second[0][0], second[1][1] - second[0][1]] as const;
  return (a[0] * b[1] - a[1] * b[0]) / (Math.hypot(...a) * Math.hypot(...b));
}

function normalizedDot(first: readonly [RenderedPoint, RenderedPoint], second: readonly [RenderedPoint, RenderedPoint]) {
  const a = [first[1][0] - first[0][0], first[1][1] - first[0][1]] as const;
  const b = [second[1][0] - second[0][0], second[1][1] - second[0][1]] as const;
  return (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b));
}

function lineIntersectionParameters(
  first: readonly [RenderedPoint, RenderedPoint],
  second: readonly [RenderedPoint, RenderedPoint]
) {
  const p = first[0];
  const r = [first[1][0] - first[0][0], first[1][1] - first[0][1]] as const;
  const q = second[0];
  const s = [second[1][0] - second[0][0], second[1][1] - second[0][1]] as const;
  const denominator = r[0] * s[1] - r[1] * s[0];
  assert.ok(Math.abs(denominator) > 1e-9, "lines must intersect");
  const qMinusP = [q[0] - p[0], q[1] - p[1]] as const;
  return {
    first: (qMinusP[0] * s[1] - qMinusP[1] * s[0]) / denominator,
    second: (qMinusP[0] * r[1] - qMinusP[1] * r[0]) / denominator
  };
}

function renderedArcDegrees(markup: string, name: string, center: RenderedPoint) {
  const path = attributeForNamedMark(markup, name, "d");
  const match = path.match(
    /^M\s+(-?[\d.]+)\s+(-?[\d.]+)\s+A\s+[\d.]+\s+[\d.]+\s+0\s+0\s+[01]\s+(-?[\d.]+)\s+(-?[\d.]+)$/u
  );
  assert.ok(match, `${name}: unsupported arc path ${path}`);
  return renderedAngle(
    center,
    [Number(match[1]), Number(match[2])],
    [Number(match[3]), Number(match[4])]
  );
}

test("secondary contract is pinned to the final frozen Mainland audit", () => {
  assert.equal(
    CONFIGURED_SEMANTIC_SECONDARY_MARKS_SOURCE.frozenAuditSha256,
    "eabf3d1cc09bebc4cf81fe040152c92def6e031b106def1b82088e223554a3ea"
  );
});

test("geometry state keeps a generated triangle at 180 degrees", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "triangle-geometry"
  });

  assert.equal(state.kind, "triangle");
  assert.ok(Math.abs(semanticMetricNumber(state, "angleSum") - 180) < 1e-9);
});

test("relative-position variants show a reference, a target, and an exact route relation", () => {
  const relative = buildConfiguredSemanticSecondaryMathState({
    comparison: 1,
    family: "coordinate-position",
    mode: 0,
    value: 3,
    variant: "relative-position-grid"
  });
  assert.equal(relative.kind, "relative-position");
  assert.ok(relative.points.reference);
  assert.ok(relative.points.target);
  assert.ok(Object.keys(relative.points).length >= 3);
  assert.equal(semanticMetricNumber(relative, "horizontalSteps"), 1);
  assert.equal(semanticMetricNumber(relative, "verticalSteps"), -1);
  assert.equal(semanticMetricNumber(relative, "ordinalPosition"), 4);
  assert.equal(relative.metrics.horizontalDirection, "right");
  assert.equal(relative.metrics.verticalDirection, "below");
  assert.match(relative.formula, /Δc=\+1.*Δr=-1.*←#4/u);

  const route = buildConfiguredSemanticSecondaryMathState({
    comparison: 2,
    family: "coordinate-position",
    mode: 0,
    value: 3,
    variant: "direction-distance-route"
  });
  assert.equal(route.kind, "relative-position");
  assert.equal(semanticMetricNumber(route, "routeDistance"), 5);
  assert.equal(route.metrics.horizontalDirection, "east");
  assert.equal(route.metrics.verticalDirection, "north");
  assert.match(route.formula, /d₁=\|Δx\|\+\|Δy\|=5/u);

  for (const [variant, input] of [
    ["relative-position-grid", { comparison: 1, mode: 0, value: 3 }],
    ["direction-distance-route", { comparison: 2, mode: 0, value: 3 }]
  ] as const) {
    const markup = renderRawSecondary("coordinate-position", input, variant);
    assert.match(markup, /reference location/u, variant);
    assert.match(markup, /target location/u, variant);
    assert.match(markup, /position route/u, variant);
    assert.doesNotMatch(markup, /coordinate point 1/u, variant);
  }
});

test("similar-triangle variants generate two triangles with one exact scale factor", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    comparison: 4,
    family: "triangle-geometry",
    mode: 0,
    value: 2,
    variant: "similar-triangle-ratios"
  });
  assert.equal(state.kind, "similar-triangles");
  assert.equal(semanticMetricNumber(state, "scaleFactor"), 2);
  assert.ok(Math.abs(semanticMetricNumber(state, "sideRatioResidualAB")) < 1e-9);
  assert.ok(Math.abs(semanticMetricNumber(state, "sideRatioResidualBC")) < 1e-9);
  assert.ok(Math.abs(semanticMetricNumber(state, "sideRatioResidualCA")) < 1e-9);
  assert.ok(Math.abs(semanticMetricNumber(state, "correspondingAngleResidual")) < 1e-9);
  assert.match(state.formula, /A′B′\/AB = B′C′\/BC = C′A′\/CA = 2/u);

  const markup = renderRawSecondary(
    "triangle-geometry",
    { comparison: 4, mode: 0, value: 2 },
    "similar-triangle-ratios"
  );
  assert.match(markup, /source similar triangle/u);
  assert.match(markup, /scaled similar triangle/u);
  assert.match(markup, /corresponding vertex link/u);
  assert.doesNotMatch(markup, /triangle polygon/u);
});

test("quadrilateral variants classify exact properties and composition from generated polygons", () => {
  const expected = {
    "parallelogram-properties": ["parallelogram", "rectangle", "rhombus", "square"],
    "property-classification": ["trapezoid", "parallelogram", "rectangle", "rhombus", "square"],
    "quadrilateral-families-composition": ["parallelogram", "rectangle", "rhombus", "square", "composition"],
    "special-parallelogram-classification": ["rectangle", "rhombus", "square"],
    "triangle-quadrilateral-classification": ["triangle", "quadrilateral", "parallelogram", "rectangle"]
  } as const;

  for (const [variant, modes] of Object.entries(expected)) {
    modes.forEach((shapeName, mode) => {
      const state = buildConfiguredSemanticSecondaryMathState({
        comparison: 1,
        family: "quadrilateral-geometry",
        mode,
        value: 4,
        variant
      });
      assert.equal(state.kind, "classified-polygon", `${variant}/${shapeName}: kind`);
      assert.equal(state.metrics.shapeName, shapeName, `${variant}/${shapeName}: shape`);
      assert.equal(semanticMetricNumber(state, "pointCount"), shapeName === "triangle" ? 3 : 4);
      assert.equal(state.series.length, shapeName === "triangle" ? 3 : 4);
      if (shapeName === "rectangle" || shapeName === "square") {
        assert.equal(semanticMetricNumber(state, "rightAngleCount"), 4, `${variant}/${shapeName}`);
      }
      if (shapeName === "rhombus" || shapeName === "square") {
        assert.equal(semanticMetricNumber(state, "equalSideCount"), 4, `${variant}/${shapeName}`);
      }
      if (shapeName === "composition") {
        assert.equal(semanticMetricNumber(state, "compositionParts"), 2);
        assert.match(state.formula, /A_Q = A_△1 \+ A_△2/u);
      }
    });
  }

  const composition = renderRawSecondary(
    "quadrilateral-geometry",
    { comparison: 1, mode: 4, value: 4 },
    "quadrilateral-families-composition"
  );
  assert.match(composition, /classified composition polygon/u);
  assert.match(composition, /composition diagonal/u);
  assert.match(composition, /composition part one/u);
  assert.match(composition, /composition part two/u);
});

test("rendered classified polygons satisfy their named side, angle, and parallel constraints", () => {
  const cases = [
    ["special-parallelogram-classification", 0, "rectangle"],
    ["special-parallelogram-classification", 1, "rhombus"],
    ["special-parallelogram-classification", 2, "square"],
    ["property-classification", 0, "trapezoid"],
    ["property-classification", 1, "parallelogram"]
  ] as const;

  for (const [variant, mode, shapeName] of cases) {
    for (const orientation of [-3, 0, 3]) {
      const markup = renderRawSecondary(
        "quadrilateral-geometry",
        { comparison: orientation, mode, value: 4 },
        variant
      );
      const points = renderedPolygonPoints(markup, `classified ${shapeName} polygon`);
      const sides = renderedSideLengths(points);
      const angles = renderedInteriorAngles(points);
      const firstPairCross = normalizedCross(
        [points[0], points[1]],
        [points[3], points[2]]
      );
      const secondPairCross = normalizedCross(
        [points[1], points[2]],
        [points[0], points[3]]
      );

      if (shapeName === "trapezoid") {
        assert.ok(Math.abs(firstPairCross) < 1e-9, `${shapeName}/${orientation}: one parallel pair`);
        assert.ok(Math.abs(secondPairCross) > 1e-3, `${shapeName}/${orientation}: legs are not parallel`);
      } else {
        assert.ok(Math.abs(firstPairCross) < 1e-9, `${shapeName}/${orientation}: first parallel pair`);
        assert.ok(Math.abs(secondPairCross) < 1e-9, `${shapeName}/${orientation}: second parallel pair`);
      }
      if (shapeName === "rectangle" || shapeName === "square") {
        angles.forEach((angle) => assert.ok(Math.abs(angle - 90) < 1e-8, `${shapeName}/${orientation}: visible right angle`));
      }
      if (shapeName === "rhombus" || shapeName === "square") {
        sides.forEach((side) => assert.ok(Math.abs(side - sides[0]) < 1e-8, `${shapeName}/${orientation}: visible equal sides`));
      }
    }
  }
});

test("rendered composition partitions the visible quadrilateral into two exact triangle areas", () => {
  for (const orientation of [-3, 0, 3]) {
    const markup = renderRawSecondary(
      "quadrilateral-geometry",
      { comparison: orientation, mode: 4, value: 4 },
      "quadrilateral-families-composition"
    );
    const whole = Math.abs(renderedSignedArea(renderedPolygonPoints(markup, "classified composition polygon")));
    const first = Math.abs(renderedSignedArea(renderedPolygonPoints(markup, "composition part one")));
    const second = Math.abs(renderedSignedArea(renderedPolygonPoints(markup, "composition part two")));
    assert.ok(Math.abs(whole - first - second) < 1e-8, `composition/${orientation}: rendered area sum`);
  }
});

test("rendered similar triangles preserve one source shape and exact corresponding ratios", () => {
  const sourceAngleSignatures: number[][] = [];
  for (const scaleFactor of [1, 2, 3]) {
    const markup = renderRawSecondary(
      "triangle-geometry",
      { comparison: 4, mode: 0, value: scaleFactor },
      "similar-triangle-ratios"
    );
    const source = renderedPolygonPoints(markup, "source similar triangle");
    const scaled = renderedPolygonPoints(markup, "scaled similar triangle");
    const sourceSides = renderedSideLengths(source);
    const scaledSides = renderedSideLengths(scaled);
    const sourceAngles = renderedInteriorAngles(source);
    const scaledAngles = renderedInteriorAngles(scaled);
    sourceAngleSignatures.push(sourceAngles);
    sourceSides.forEach((side, index) => {
      assert.ok(Math.abs(scaledSides[index] / side - scaleFactor) < 1e-8, `k=${scaleFactor}: visible side ratio`);
      assert.ok(Math.abs(scaledAngles[index] - sourceAngles[index]) < 1e-8, `k=${scaleFactor}: visible corresponding angle`);
    });
    assert.match(markup, /similar side AB label/u);
    assert.match(markup, /similar side A′B′ label/u);
  }
  for (let index = 1; index < sourceAngleSignatures.length; index += 1) {
    sourceAngleSignatures[index].forEach((angle, vertex) => {
      assert.ok(
        Math.abs(angle - sourceAngleSignatures[0][vertex]) < 1e-8,
        `source vertex ${vertex}: scale factor does not distort the source triangle`
      );
    });
  }
});

test("line relation modes derive final rendered parallel, perpendicular, and intersection evidence", () => {
  for (const [mode, relation] of [
    [0, "parallel-transversal"],
    [1, "perpendicular"],
    [2, "intersecting"]
  ] as const) {
    for (const value of [0, 5, 10]) {
      for (const comparison of [0, 5, 10]) {
        const state = buildConfiguredSemanticSecondaryMathState({
          comparison,
          family: "line-angle-geometry",
          mode,
          value,
          variant: "parallel-transversal"
        });
        assert.equal(state.metrics.relationKind, relation);
        const markup = renderRawSecondary(
          "line-angle-geometry",
          { comparison, mode, value },
          "parallel-transversal"
        );
        const first = renderedLinePoints(markup, "relation line one");
        const second = renderedLinePoints(markup, "relation line two");

        if (relation === "parallel-transversal") {
          assert.ok(Math.abs(normalizedCross(first, second)) < 1e-9, `${value}/${comparison}: rendered parallel lines`);
          const transversal = renderedLinePoints(markup, "relation transversal");
          for (const line of [first, second]) {
            const parameters = lineIntersectionParameters(line, transversal);
            assert.ok(parameters.first >= 0 && parameters.first <= 1, `${value}/${comparison}: intersection lies on parallel line`);
            assert.ok(parameters.second >= 0 && parameters.second <= 1, `${value}/${comparison}: intersection lies on transversal`);
          }
          assert.match(markup, /corresponding angle one/u);
          assert.match(markup, /corresponding angle two/u);
          assert.equal(
            (markup.match(/data-viz-name="parallel marker"/gu) ?? []).length,
            2,
            `${value}/${comparison}: both parallel lines expose matching visible markers`
          );
        } else {
          const parameters = lineIntersectionParameters(first, second);
          assert.ok(parameters.first >= 0 && parameters.first <= 1, `${relation}: intersection on line one`);
          assert.ok(parameters.second >= 0 && parameters.second <= 1, `${relation}: intersection on line two`);
          if (relation === "perpendicular") {
            assert.ok(Math.abs(normalizedDot(first, second)) < 1e-9, `${value}/${comparison}: rendered perpendicular lines`);
            assert.match(markup, /perpendicular right-angle mark/u);
          } else {
            assert.ok(Math.abs(normalizedCross(first, second)) > 1e-3, `${value}/${comparison}: rendered intersecting nonparallel lines`);
            assert.match(markup, /vertical angle one/u);
            assert.match(markup, /vertical angle two/u);
            const center: RenderedPoint = [
              first[0][0] + (first[1][0] - first[0][0]) * parameters.first,
              first[0][1] + (first[1][1] - first[0][1]) * parameters.first
            ];
            const expectedDegrees = Number(attributeForNamedMark(markup, "vertical angle one", "data-viz-angle-degrees"));
            for (const arcName of ["vertical angle one", "vertical angle two"]) {
              assert.ok(
                Math.abs(renderedArcDegrees(markup, arcName, center) - expectedDegrees) < 0.8,
                `${value}/${comparison}: ${arcName} must render the declared acute angle ${expectedDegrees}°`
              );
            }
          }
        }
      }
    }
  }
});

test("relative position uses a stable 5 by 5 grid and keeps coincident locations distinguishable", () => {
  const leftMarkup = renderRawSecondary(
    "coordinate-position",
    { comparison: 2, mode: 0, value: 0 },
    "relative-position-grid"
  );
  const rightMarkup = renderRawSecondary(
    "coordinate-position",
    { comparison: 2, mode: 0, value: 4 },
    "relative-position-grid"
  );
  assert.equal(attributeForNamedMark(leftMarkup, "reference location", "cx"), attributeForNamedMark(rightMarkup, "reference location", "cx"));
  assert.equal(attributeForNamedMark(leftMarkup, "reference location", "cy"), attributeForNamedMark(rightMarkup, "reference location", "cy"));
  assert.equal((leftMarkup.match(/data-viz-name="position grid column"/gu) ?? []).length, 5);
  assert.equal((leftMarkup.match(/data-viz-name="position grid row"/gu) ?? []).length, 5);
  assert.equal((leftMarkup.match(/data-viz-name="position ordinal marker"/gu) ?? []).length, 5);

  const coincident = renderRawSecondary(
    "coordinate-position",
    { comparison: 2, mode: 0, value: 2 },
    "relative-position-grid"
  );
  assert.match(coincident, /data-viz-name="coincident target location"/u);
  assert.match(coincident, /data-viz-name="reference location"/u);
  assert.doesNotMatch(coincident, /data-viz-name="map landmark"/u);
  const coincidentTargetX = Number(attributeForNamedMark(coincident, "coincident target location", "cx"));
  const coincidentTargetRadius = Number(attributeForNamedMark(coincident, "coincident target location", "r"));
  const coincidentTargetLabelX = Number(attributeForNamedMark(coincident, "target label", "x"));
  assert.ok(
    coincidentTargetLabelX >= coincidentTargetX + coincidentTargetRadius + 4,
    "coincident target label clears its visible outer ring"
  );

  const adjacentLeft = renderRawSecondary(
    "coordinate-position",
    { comparison: 2, mode: 0, value: 1 },
    "relative-position-grid"
  );
  const adjacentReferenceX = Number(attributeForNamedMark(adjacentLeft, "reference label", "x"));
  const adjacentTargetX = Number(attributeForNamedMark(adjacentLeft, "target label", "x"));
  assert.equal(attributeForNamedMark(adjacentLeft, "target label", "text-anchor"), "end");
  assert.ok(adjacentReferenceX - adjacentTargetX >= 20, "adjacent left R/T labels retain a visible gap");

  const bottomRow = renderRawSecondary(
    "coordinate-position",
    { comparison: 0, mode: 0, value: 0 },
    "relative-position-grid"
  );
  const bottomTargetY = Number(attributeForNamedMark(bottomRow, "target location", "cy"));
  const bottomTargetRadius = Number(attributeForNamedMark(bottomRow, "target location", "r"));
  const firstOrdinalY = Number(attributeForNamedMark(bottomRow, "position ordinal marker", "y"));
  assert.ok(
    firstOrdinalY - 9 >= bottomTargetY + bottomTargetRadius + 2,
    "bottom-row target clears the first ordinal glyph box"
  );

  const zeroRoute = renderRawSecondary(
    "coordinate-position",
    { comparison: 0, mode: 0, value: 0 },
    "direction-distance-route"
  );
  assert.match(zeroRoute, /data-viz-name="coincident target location"/u);
  assert.match(zeroRoute, /data-viz-name="zero-step position route"/u);
  for (const direction of ["north", "east", "south", "west"]) {
    assert.match(zeroRoute, new RegExp(`data-viz-name="compass ${direction}"`, "u"));
  }
});

test("Chinese relative-position and quadrilateral visible state words are localized", () => {
  const strings = {
    checkLabel: "验证",
    formulaLabel: "公式"
  };
  const relative = renderToStaticMarkup(createElement(
    "svg",
    { viewBox: "0 0 640 360" },
    createElement(ConfiguredSemanticSecondaryMarks, {
      accent: "#06b6d4",
      comparison: 1,
      family: "coordinate-position",
      mode: 0,
      strings,
      value: 3,
      variant: "relative-position-grid",
      vizTheme: visibleTheme
    })
  ));
  const visibleRelative = stripQaAndMetadata(relative);
  assert.doesNotMatch(visibleRelative, /right|left|above|below|same row|same column|from left/iu);
  assert.match(visibleRelative, /右|下|从左/u);

  const simplifiedRoute = renderToStaticMarkup(createElement(
    "svg",
    { viewBox: "0 0 640 360" },
    createElement(ConfiguredSemanticSecondaryMarks, {
      accent: "#06b6d4",
      comparison: 2,
      family: "coordinate-position",
      mode: 0,
      strings,
      value: 3,
      variant: "direction-distance-route",
      vizTheme: visibleTheme
    })
  ));
  assert.match(stripQaAndMetadata(simplifiedRoute), /向东/u);
  assert.doesNotMatch(stripQaAndMetadata(simplifiedRoute), /向東/u);

  const square = renderToStaticMarkup(createElement(
    "svg",
    { viewBox: "0 0 640 360" },
    createElement(ConfiguredSemanticSecondaryMarks, {
      accent: "#06b6d4",
      comparison: 1,
      family: "quadrilateral-geometry",
      mode: 2,
      strings,
      value: 4,
      variant: "special-parallelogram-classification",
      vizTheme: visibleTheme
    })
  ));
  assert.doesNotMatch(stripQaAndMetadata(square), /square|right|equal sides|sides/iu);
});

test("plane rotation preserves distance to its center", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "plane-transform",
    mode: 2
  });

  assert.equal(state.kind, "transform");
  assert.ok(
    Math.abs(
      semanticMetricNumber(state, "distanceBefore") -
        semanticMetricNumber(state, "distanceAfter")
    ) < 1e-9
  );
});

test("analytic circle samples satisfy the displayed circle equation", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "analytic-line-circle"
  });

  assert.equal(state.kind, "analytic");
  assert.ok(Math.abs(semanticMetricNumber(state, "circleResidual")) < 1e-9);
});

test("symbolic balance applies the same operation and its solution substitutes exactly", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "symbolic-equation"
  });

  assert.equal(state.kind, "equation");
  assert.equal(semanticMetricNumber(state, "leftDelta"), semanticMetricNumber(state, "rightDelta"));
  assert.ok(Math.abs(semanticMetricNumber(state, "substitutionResidual")) < 1e-9);
});

test("multiplying an inequality by a negative reverses its relation", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "inequality-solver",
    mode: 1
  });

  assert.equal(state.kind, "inequality");
  assert.equal(state.metrics.originalOperator, "≤");
  assert.equal(state.metrics.solvedOperator, "≥");
  assert.ok(semanticMetricNumber(state, "operationFactor") < 0);
});

test("factored algebra tiles expand to the displayed polynomial", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "algebra-tiles-polynomial"
  });

  assert.equal(state.kind, "polynomial");
  assert.equal(
    semanticMetricNumber(state, "expandedLinear"),
    semanticMetricNumber(state, "factorP") + semanticMetricNumber(state, "factorQ")
  );
  assert.equal(
    semanticMetricNumber(state, "expandedConstant"),
    semanticMetricNumber(state, "factorP") * semanticMetricNumber(state, "factorQ")
  );
});

test("linear table and graph expose the same constant slope", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "linear-function"
  });

  assert.equal(state.kind, "linear");
  assert.ok(
    Math.abs(
      semanticMetricNumber(state, "slope") -
        semanticMetricNumber(state, "tableSlope")
    ) < 1e-9
  );
});

test("reciprocal samples preserve x times y equals k", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "reciprocal-function"
  });

  assert.equal(state.kind, "reciprocal");
  assert.ok(
    Math.abs(
      semanticMetricNumber(state, "sampleProduct") - semanticMetricNumber(state, "k")
    ) < 1e-9
  );
});

test("exponential and logarithmic values are mutual inverses", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "exponential-logarithmic"
  });

  assert.equal(state.kind, "exp-log");
  assert.ok(
    Math.abs(
      semanticMetricNumber(state, "logBack") - semanticMetricNumber(state, "exponent")
    ) < 1e-9
  );
});

test("every displayed sequence term obeys its recurrence", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "sequence-model",
    mode: 1
  });

  assert.equal(state.kind, "sequence");
  assert.ok(Math.abs(semanticMetricNumber(state, "maxRecurrenceResidual")) < 1e-9);
  assert.equal(state.series.every((point) => Number.isInteger(point.x)), true);
});

test("unit-circle and identity families share sin squared plus cos squared equals one", () => {
  for (const family of ["unit-circle-wave", "trigonometric-identity"] as const) {
    const state = buildConfiguredSemanticSecondaryMathState({
      ...baseInput,
      family
    });

    assert.ok(Math.abs(semanticMetricNumber(state, "identityValue") - 1) < 1e-9);
    assert.ok(Math.abs(semanticMetricNumber(state, "identityResidual")) < 1e-9);
  }
});

test("calculus tangent slope equals the analytic derivative", () => {
  for (const family of ["derivative-rate-area", "derivative-synthesis"] as const) {
    const state = buildConfiguredSemanticSecondaryMathState({
      ...baseInput,
      family
    });

    assert.ok(
      Math.abs(
        semanticMetricNumber(state, "tangentSlope") -
          semanticMetricNumber(state, "analyticDerivative")
      ) < 1e-9
    );
  }
});

test("calculus tangent paths are clipped to the semantic content frame at slider extremes", () => {
  for (const family of ["derivative-rate-area", "derivative-synthesis"] as const) {
    for (const value of [0, 10]) {
      for (const comparison of [0, 10]) {
        const markup = renderToStaticMarkup(createElement(ConfiguredSemanticSecondaryMarks, {
          accent: "#06b6d4",
          comparison,
          family,
          mode: 0,
          value,
          variant: "audit-contract",
          vizTheme: visibleTheme
        }));
        const tangent = markup.match(/data-viz-name="tangent line"[^>]*d="([^"]+)"/);
        assert.ok(tangent, `missing tangent path for ${family}/${value}/${comparison}`);
        const coordinates = [...tangent[1].matchAll(/(?:M|L)\s+(-?[\d.]+)\s+(-?[\d.]+)/g)]
          .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
        assert.equal(coordinates.length, 2);
        coordinates.forEach(({ x, y }) => {
          assert.ok(x >= configuredSemanticSecondaryLayout.contentLeft - 0.1);
          assert.ok(x <= configuredSemanticSecondaryLayout.contentRight + 0.1);
          assert.ok(y >= configuredSemanticSecondaryLayout.contentTop + 12 - 0.1);
          assert.ok(y <= configuredSemanticSecondaryLayout.contentBottom + 0.1);
        });
      }
    }
  }
});

test("optimization state identifies an optimum with zero derivative", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "optimization-derivative"
  });

  assert.equal(state.kind, "optimization");
  assert.ok(Math.abs(semanticMetricNumber(state, "derivativeAtOptimum")) < 1e-9);
});

test("vector state uses component addition and the same vectors for its dot product", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "vector-operations"
  });

  assert.equal(state.kind, "vector");
  assert.ok(Math.abs(semanticMetricNumber(state, "dotIdentityResidual")) < 1e-9);
  assert.equal(
    semanticMetricNumber(state, "sumX"),
    semanticMetricNumber(state, "uX") + semanticMetricNumber(state, "vX")
  );
});

test("space point satisfies the displayed plane equation", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "space-vector-plane"
  });

  assert.equal(state.kind, "space");
  assert.ok(Math.abs(semanticMetricNumber(state, "planeResidual")) < 1e-9);
});

test("ellipse, parabola, and hyperbola samples satisfy their active conic equation", () => {
  for (const mode of [-7, 0, 1, 2, 99]) {
    const state = buildConfiguredSemanticSecondaryMathState({
      ...baseInput,
      family: "conic-sections",
      mode
    });
    assert.equal(state.kind, "conic");
    assert.ok(Math.abs(semanticMetricNumber(state, "conicResidual")) < 1e-9);
  }
});

test("regression residuals use observed minus predicted and balance around zero", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "bivariate-regression"
  });

  assert.equal(state.kind, "regression");
  assert.ok(Math.abs(semanticMetricNumber(state, "residualSum")) < 1e-9);
  assert.ok(Math.abs(semanticMetricNumber(state, "residualDefinitionError")) < 1e-9);
});

test("complex state keeps Cartesian, polar, conjugate, and rotation values synchronized", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "complex-plane"
  });
  assert.equal(state.kind, "complex");
  assert.ok(Math.abs(semanticMetricNumber(state, "modulusResidual")) < 1e-9);
  assert.ok(Math.abs(semanticMetricNumber(state, "conjugateProductImaginary")) < 1e-9);
  assert.ok(Math.abs(semanticMetricNumber(state, "rotationModulusResidual")) < 1e-9);
});

test("quadratic inequality roots and sign interval come from one polynomial", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "quadratic-inequality"
  });
  assert.equal(state.kind, "quadratic-inequality");
  assert.ok(Math.abs(semanticMetricNumber(state, "rootAResidual")) < 1e-9);
  assert.ok(Math.abs(semanticMetricNumber(state, "rootBResidual")) < 1e-9);
  assert.equal(state.metrics.intervalSignMatches, true);
});

test("distribution state derives the observed z-score from the displayed sample", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "statistics-distribution"
  });
  assert.equal(state.kind, "distribution");
  assert.ok(Math.abs(semanticMetricNumber(state, "zResidual")) < 1e-9);
  assert.ok(semanticMetricNumber(state, "standardDeviation") > 0);
});

test("every frozen secondary family resolves to an explicit mathematical state", () => {
  for (const family of configuredSemanticSecondaryFamilies) {
    const state = buildConfiguredSemanticSecondaryMathState({
      ...baseInput,
      family
    });

    assert.equal(state.family, family);
    assert.notEqual(state.strand, "unassigned", family);
    assert.ok(state.formula.length > 0, family);
    assert.ok(state.check.length > 0, family);
  }
});

test("composite and advanced modes select genuinely different active mathematics", () => {
  const advanced = [0, 1, 2].map((mode) =>
    buildConfiguredSemanticSecondaryMathState({
      ...baseInput,
      family: "advanced-strategy",
      mode
    })
  );
  assert.equal(new Set(advanced.map((state) => state.strand)).size, 3);
  assert.equal(new Set(advanced.map((state) => state.active?.family)).size, 3);

  const composite = [0, 1, 2].map((mode) =>
    buildConfiguredSemanticSecondaryMathState({
      ...baseInput,
      family: "composite-split",
      mode,
      variant: "quadratic-circle-probability"
    })
  );
  assert.deepEqual(
    composite.map((state) => state.strand),
    ["quadratic-features", "circle-sector", "seeded-probability-experiment"]
  );
  assert.equal(composite[0].active?.family, "quadratic-features");
  assert.equal(composite[1].active?.family, "circle-sector");
  assert.equal(composite[2].active, undefined);
  assert.equal(composite[2].metrics.externalRendererRequired, true);
});

test("ambiguous composite variants stop at an explicit plan boundary instead of showing a fake model", () => {
  const unresolved = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "composite-split",
    variant: "split-topic-strands"
  });
  assert.equal(unresolved.active, undefined);
  assert.equal(unresolved.metrics.missingStrandPlan, true);
  assert.match(unresolved.strand ?? "", /^external:/);

  const planned = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    compositeStrands: [
      { family: "fraction-operations" },
      { family: "solid-projection" },
      { family: "statistics-distribution" }
    ],
    family: "composite-split",
    mode: 1,
    variant: "split-topic-strands"
  });
  assert.equal(planned.strand, "solid-projection");
  assert.equal(planned.active?.family, "solid-projection");
});

test("mode-count contract exposes controls needed by transforms, conics, strategies, and composites", () => {
  assert.equal(configuredSemanticSecondaryLayout.contentTop, 104);
  assert.equal(configuredSemanticSecondaryRequiredModeCount({ family: "plane-transform", variant: "transform" }), 4);
  assert.equal(configuredSemanticSecondaryRequiredModeCount({ family: "conic-sections", variant: "conic" }), 3);
  assert.equal(configuredSemanticSecondaryRequiredModeCount({ family: "advanced-strategy", variant: "strategy" }), 3);
  assert.equal(configuredSemanticSecondaryRequiredModeCount({ family: "composite-split", variant: "quadratic-circle-probability" }), 3);
  assert.equal(configuredSemanticSecondaryRequiredModeCount({ family: "composite-split", variant: "split-topic-strands" }), 0);
  assert.equal(configuredSemanticSecondaryRequiredModeCount({ family: "catalog-scope", variant: "split-or-omit" }), 0);
  assert.equal(configuredSemanticSecondaryRequiredNumericControlCount({ family: "catalog-scope", variant: "split-or-omit" }), 0);
  assert.equal(configuredSemanticSecondaryRequiredNumericControlCount({ family: "composite-split", variant: "split-topic-strands" }), 0);
  assert.equal(configuredSemanticSecondaryRequiredNumericControlCount({ family: "triangle-geometry", variant: "triangle-invariants" }), 2);
  assert.equal(configuredSemanticSecondaryRequiredModeCount({ family: "solid-projection", variant: "common-solids-classification" }), 5);
  assert.equal(configuredSemanticSecondaryRequiredModeCount({ family: "solid-projection", variant: "cylinder-cone-volume" }), 2);
  assert.equal(configuredSemanticSecondaryRequiredModeCount({ family: "solid-projection", variant: "surface-volume-solids" }), 5);
});

test("common-solids classification exposes five distinct solids and meaningful properties", () => {
  const expected = [
    { curvedSurfaces: 0, edges: 12, flatFaces: 6, solidType: "cube", vertices: 8 },
    { curvedSurfaces: 0, edges: 12, flatFaces: 6, solidType: "cuboid", vertices: 8 },
    { curvedSurfaces: 1, edges: 2, flatFaces: 2, solidType: "cylinder", vertices: 0 },
    { curvedSurfaces: 1, edges: 1, flatFaces: 1, solidType: "cone", vertices: 1 },
    { curvedSurfaces: 1, edges: 0, flatFaces: 0, solidType: "sphere", vertices: 0 }
  ] as const;

  expected.forEach((contract, mode) => {
    const state = buildConfiguredSemanticSecondaryMathState({
      ...baseInput,
      comparison: 1,
      family: "solid-projection",
      mode,
      value: 3,
      variant: "common-solids-classification"
    });
    assert.equal(state.kind, "solid");
    for (const [key, value] of Object.entries(contract)) assert.equal(state.metrics[key], value);
    assert.equal(state.metrics.solidModel, "classification");
    assert.match(state.formula, /flat faces=.*curved surfaces=.*edges=.*vertices=/u);

    const markup = renderToStaticMarkup(createElement(ConfiguredSemanticSecondaryMarks, {
      ...baseInput,
      accent: "#06b6d4",
      comparison: 1,
      family: "solid-projection",
      mode,
      value: 3,
      variant: "common-solids-classification",
      vizTheme: visibleTheme
    }));
    assert.match(markup, new RegExp(`data-viz-name="classified ${contract.solidType}"`, "u"));
    assert.match(markup, /data-viz-name="solid property readout"/u);
  });
});

test("cylinder and cone volume modes use the same radius and height with exact pi coefficients", () => {
  const cylinder = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    comparison: 5,
    family: "solid-projection",
    mode: 0,
    value: 3,
    variant: "cylinder-cone-volume"
  });
  const cone = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    comparison: 5,
    family: "solid-projection",
    mode: 1,
    value: 3,
    variant: "cylinder-cone-volume"
  });
  assert.equal(cylinder.metrics.solidType, "cylinder");
  assert.equal(cone.metrics.solidType, "cone");
  assert.equal(semanticMetricNumber(cylinder, "volumePiCoefficient"), 45);
  assert.equal(semanticMetricNumber(cone, "volumePiCoefficient"), 15);
  assert.equal(semanticMetricNumber(cylinder, "volume"), 45 * Math.PI);
  assert.equal(semanticMetricNumber(cone, "volume"), 15 * Math.PI);
  assert.equal(semanticMetricNumber(cylinder, "surfaceArea"), 48 * Math.PI);
  assert.ok(
    Math.abs(
      semanticMetricNumber(cone, "surfaceArea") -
        3 * Math.PI * (3 + Math.sqrt(34))
    ) < 1e-12
  );
  assert.match(cylinder.formula, /V = πr²h = 45π/u);
  assert.match(cone.formula, /V = ⅓πr²h = 15π/u);

  const cylinderMarkup = renderVisibleSecondary(
    "solid-projection",
    { comparison: 5, mode: 0, value: 3 },
    "cylinder-cone-volume"
  );
  const coneMarkup = renderVisibleSecondary(
    "solid-projection",
    { comparison: 5, mode: 1, value: 3 },
    "cylinder-cone-volume"
  );
  assert.match(cylinderMarkup, />cylinder<\/text>/u);
  assert.match(coneMarkup, />cone<\/text>/u);
  assert.notEqual(cylinderMarkup, coneMarkup);
});

test("surface-and-volume modes implement exact prism, pyramid, cylinder, cone, and sphere formulae", () => {
  const states = [0, 1, 2, 3, 4].map((mode) => buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    comparison: 5,
    family: "solid-projection",
    mode,
    value: 3,
    variant: "surface-volume-solids"
  }));
  assert.deepEqual(states.map((state) => state.metrics.solidType), ["prism", "pyramid", "cylinder", "cone", "sphere"]);
  assert.equal(semanticMetricNumber(states[0], "volume"), 45);
  assert.equal(semanticMetricNumber(states[0], "surfaceArea"), 78);
  assert.equal(semanticMetricNumber(states[1], "volume"), 15);
  assert.equal(
    semanticMetricNumber(states[1], "surfaceArea"),
    9 + 6 * Math.sqrt(27.25)
  );
  assert.equal(semanticMetricNumber(states[2], "volume"), 45 * Math.PI);
  assert.equal(semanticMetricNumber(states[3], "volume"), 15 * Math.PI);
  assert.equal(semanticMetricNumber(states[4], "volume"), 36 * Math.PI);
  assert.equal(semanticMetricNumber(states[4], "surfaceArea"), 36 * Math.PI);
  assert.match(states[0].formula, /V = s²h = 45/u);
  assert.match(states[1].formula, /V = ⅓s²h = 15/u);
  assert.match(states[4].formula, /V = ⁴⁄₃πr³ = 36π/u);

  const visible = states.map((_, mode) => renderVisibleSecondary(
    "solid-projection",
    { comparison: 5, mode, value: 3 },
    "surface-volume-solids"
  ));
  assert.equal(new Set(visible).size, 5);
  for (const markup of visible) assert.match(markup, /V≈/u);
});

test("SVG renderer exposes marks, semantic identity, visible formula, and machine state", () => {
  const markup = renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 640 360" },
      createElement(ConfiguredSemanticSecondaryMarks, {
        ...baseInput,
        accent: "#06b6d4",
        family: "triangle-geometry",
        strings: { checkLabel: "Check", formulaLabel: "Rule" },
        vizTheme: {
          axis: "#64748b",
          axisStrong: "#334155",
          grid: "#cbd5e1",
          labelFill: "#ffffff",
          labelStroke: "#0891b2",
          labelText: "#155e75",
          neutralStroke: "#475569",
          pointStroke: "#0f172a",
          softFill: "#ecfeff",
          text: "#0f172a",
          textMuted: "#475569"
        }
      })
    )
  );

  assert.match(markup, /data-viz-mark="(?:true)?"/);
  assert.match(markup, /data-viz-semantic-family="triangle-geometry"/);
  assert.match(markup, /data-viz-semantic-variant="audit-contract"/);
  assert.match(markup, /data-viz-machine-math-state="(?:true)?"/);
  assert.match(markup, /A \+ B \+ C = 180/);
});

test("the semantic formula and check use two exact narrow two-member overlap owners", () => {
  const passThroughContracts = [
    ["statistics-distribution", "statistics-s1"],
    ["statistics-distribution", "data-handling"],
    ["function-properties", "advanced-functions"],
    ["derivative-rate-area", "differentiation-intro"],
    ["derivative-rate-area", "calculus"]
  ] as const;

  for (const [family, variant] of passThroughContracts) {
    const markup = renderRawSecondary(family, { comparison: 4, mode: 0, value: 5 }, variant);
    const owners = semanticOverlapOwners(markup);

    assert.deepEqual(
      owners.map((owner) => owner.id),
      ["semantic-formula-overlap-pair", "semantic-check-overlap-pair"],
      variant
    );
    assert.deepEqual(semanticOverlapProtocolIssues(markup), [], variant);
    assert.match(markup, /data-viz-name="semantic formula"[^>]*y="307"/, variant);
    assert.match(markup, /data-viz-name="semantic invariant check"[^>]*y="327"/, variant);
    assert.match(
      markup,
      /data-viz-name="semantic formula and check outline"[^>]*x="72"[^>]*y="286"[^>]*width="496"[^>]*height="54"/,
      variant
    );
  }

  assert.equal(
    source.match(/data-viz-overlap-ok="semantic-(?:formula|check)-overlap-pair"/g)?.length,
    2
  );
  assert.equal(source.match(/data-viz-overlap-member="mark"/g)?.length, 2);
  assert.equal(source.match(/data-viz-overlap-member="label"/g)?.length, 2);
  assert.doesNotMatch(source, /data-viz-overlap-owner="semantic-formula-card"/);
});

test("the semantic overlap protocol rejects one-member, three-member, and broad owners", () => {
  assert.deepEqual(
    semanticOverlapProtocolIssues(renderSemanticOverlapFixture("one-member", ["mark"])),
    ["candidate-count:one-member:1", "member-roles:one-member:mark"]
  );
  assert.deepEqual(
    semanticOverlapProtocolIssues(renderSemanticOverlapFixture("three-members", ["mark", "label", "label"])),
    ["candidate-count:three-members:3", "member-roles:three-members:label,label,mark"]
  );
  assert.deepEqual(
    semanticOverlapProtocolIssues(renderSemanticOverlapFixture("broad", ["mark", "label"], true)),
    ["broad-owner:broad"]
  );
});

test("external composite strands render real caller-supplied marks and localized scope fallback", () => {
  const theme = {
    axis: "#64748b",
    axisStrong: "#334155",
    grid: "#cbd5e1",
    labelFill: "#ffffff",
    labelStroke: "#0891b2",
    labelText: "#155e75",
    neutralStroke: "#475569",
    pointStroke: "#0f172a",
    softFill: "#ecfeff",
    text: "#0f172a",
    textMuted: "#475569"
  };
  const externalMarkup = renderToStaticMarkup(
    createElement(ConfiguredSemanticSecondaryMarks, {
      ...baseInput,
      accent: "#06b6d4",
      family: "composite-split",
      mode: 2,
      renderCompositeStrand: ({ family }) =>
        createElement("g", { "data-viz-mark": true, "data-viz-name": `external ${family}` }),
      variant: "quadratic-circle-probability",
      vizTheme: theme
    })
  );
  assert.match(externalMarkup, /data-viz-name="external seeded-probability-experiment"/);
  assert.doesNotMatch(externalMarkup, /semantic formula background/);

  const localizedMarkup = renderToStaticMarkup(
    createElement(ConfiguredSemanticSecondaryMarks, {
      ...baseInput,
      accent: "#06b6d4",
      family: "composite-split",
      strings: { noModelLabel: "请选择一个准确的数学模型" },
      variant: "split-topic-strands",
      vizTheme: theme
    })
  );
  assert.match(localizedMarkup, /请选择一个准确的数学模型/);
  assert.doesNotMatch(localizedMarkup, /No unrelated model/);
});

test("both numeric controls change every previously inert secondary family", () => {
  for (const family of [
    "angle-measure",
    "line-angle-geometry",
    "quadrilateral-geometry",
    "shape-classifier",
    "function-properties",
    "derivative-rate-area",
    "derivative-synthesis"
  ] as const) {
    const lowValue = buildConfiguredSemanticSecondaryMathState({ ...baseInput, family, value: 0 });
    const highValue = buildConfiguredSemanticSecondaryMathState({ ...baseInput, family, value: 10 });
    const lowComparison = buildConfiguredSemanticSecondaryMathState({ ...baseInput, comparison: 0, family });
    const highComparison = buildConfiguredSemanticSecondaryMathState({ ...baseInput, comparison: 10, family });
    assert.notDeepEqual(lowValue, highValue, `${family} must respond to value`);
    assert.notDeepEqual(lowComparison, highComparison, `${family} must respond to comparison`);
  }
});

test("SSR marks are generated from the same state for geometry, algebra, conics, regression, trig, and calculus", () => {
  const theme = {
    axis: "#64748b",
    axisStrong: "#334155",
    grid: "#cbd5e1",
    labelFill: "#ffffff",
    labelStroke: "#0891b2",
    labelText: "#155e75",
    neutralStroke: "#475569",
    pointStroke: "#0f172a",
    softFill: "#ecfeff",
    text: "#0f172a",
    textMuted: "#475569"
  };
  const renderFamily = (
    family: (typeof configuredSemanticSecondaryFamilies)[number],
    variant = "audit-contract",
    mode = 0
  ) => renderToStaticMarkup(createElement(ConfiguredSemanticSecondaryMarks, {
    ...baseInput,
    accent: "#06b6d4",
    family,
    mode,
    variant,
    vizTheme: theme
  }));

  assert.match(renderFamily("right-triangle"), /data-viz-leg-a=/);
  assert.match(renderFamily("solid-projection"), /data-viz-name="linked solid"[^>]+data-viz-width=/);
  assert.match(renderFamily("solid-projection", "solid-nets-and-views", 1), /data-viz-name="solid net"/);
  assert.match(renderFamily("algebra-tiles-polynomial"), /data-viz-name="x squared algebra tile"/);
  assert.match(renderFamily("linear-system"), /data-viz-name="system intersection"/);
  assert.match(renderFamily("inequality-solver", "symbolic-inequality", 1), /data-viz-name="inequality solution ray"/);
  assert.match(renderFamily("conic-sections"), /data-viz-parameter-a=/);
  assert.match(renderFamily("bivariate-regression"), /data-viz-name="regression residual"/);
  assert.match(renderFamily("triangle-trigonometry"), /data-viz-name="marked trigonometric right triangle"/);
  const calculus = renderFamily("derivative-rate-area");
  assert.match(calculus, /data-viz-name="calculus area strip"/);
  assert.match(calculus, /data-viz-name="tangent line"/);
  assert.match(calculus, /data-viz-name="secant line"/);

  const coordinateLow = renderToStaticMarkup(createElement(ConfiguredSemanticSecondaryMarks, {
    ...baseInput,
    accent: "#06b6d4",
    comparison: 0,
    family: "coordinate-position",
    value: 0,
    vizTheme: theme
  }));
  const coordinateHigh = renderToStaticMarkup(createElement(ConfiguredSemanticSecondaryMarks, {
    ...baseInput,
    accent: "#06b6d4",
    comparison: 10,
    family: "coordinate-position",
    value: 10,
    vizTheme: theme
  }));
  const lowCircle = coordinateLow.match(/data-viz-name="coordinate point 1"[^>]+cx="([^"]+)"[^>]+cy="([^"]+)"/);
  const highCircle = coordinateHigh.match(/data-viz-name="coordinate point 1"[^>]+cx="([^"]+)"[^>]+cy="([^"]+)"/);
  assert.ok(lowCircle && highCircle);
  assert.notDeepEqual(lowCircle.slice(1), highCircle.slice(1));
});

test("all 40 executable secondary families have an exact family-and-mode display projection", () => {
  assert.equal(configuredSemanticSecondaryActualFamilies.length, 40);
  assert.deepEqual(
    configuredSemanticSecondaryActualFamilies,
    configuredSemanticSecondaryFamilies.filter(
      (family) => family !== "composite-split" && family !== "catalog-scope"
    )
  );

  for (const family of configuredSemanticSecondaryActualFamilies) {
    const variant = family === "solid-projection" ? "solid-nets" : "audit-contract";
    const familyContract = getConfiguredVisualizationSemanticControlContract(family, variant);
    assert.ok(familyContract, family);
    const modes = familyContract.modes.length ? familyContract.modes : [{ value: 0 }];
    const projectedModes: string[] = [];

    for (const declaredMode of modes) {
      const contract = getConfiguredVisualizationSemanticControlContract(
        family,
        variant,
        declaredMode.value
      );
      assert.ok(contract, `${family} mode ${declaredMode.value}`);
      assert.equal(contract.sliders.length, 2, `${family} must project two numeric controls`);
      const values = Object.fromEntries(
        contract.sliders.map((slider) => [slider.id, slider.initial])
      ) as Record<"comparison" | "value", number>;
      const input = {
        comparison: values.comparison,
        family,
        mode: declaredMode.value,
        value: values.value,
        variant
      } as const;
      const projection = projectConfiguredSemanticSecondaryDisplayValues(input);
      assert.ok(projection, `${family} mode ${declaredMode.value}`);
      projectedModes.push(projection.mode);
      assert.equal(projection.family, family);
      assert.ok(projection.value.length > 1, `${family} value projection`);
      assert.ok(projection.comparison.length > 1, `${family} comparison projection`);
      assert.equal(
        formatConfiguredSemanticSecondaryDisplayValue(input, "value"),
        projection.value
      );
      assert.equal(
        formatConfiguredSemanticSecondaryDisplayValue(input, "comparison"),
        projection.comparison
      );

      for (const slider of contract.sliders) {
        assert.notEqual(slider.id, "height", `${family} secondary control role`);
        if (slider.id === "height") continue;
        const low = projectConfiguredSemanticSecondaryDisplayValues({
          ...input,
          [slider.id]: slider.min
        });
        const high = projectConfiguredSemanticSecondaryDisplayValues({
          ...input,
          [slider.id]: slider.max
        });
        assert.ok(low && high);
        assert.notEqual(
          low[slider.id],
          high[slider.id],
          `${family} mode ${declaredMode.value} ${slider.id} display endpoint`
        );
      }
    }

    if (familyContract.modes.length > 1) {
      assert.equal(
        projectedModes.every((projectedMode) => projectedMode.length > 0),
        true,
        `${family} must name every projected mode`
      );
      assert.equal(
        new Set(projectedModes).size,
        familyContract.modes.length,
        `${family} projected mode names must be distinct`
      );
    }
  }
});

test("every declared secondary slider endpoint and mode changes visible SSR after QA metadata is stripped", () => {
  for (const family of configuredSemanticSecondaryActualFamilies) {
    const variant = family === "solid-projection" ? "solid-nets" : "audit-contract";
    const familyContract = getConfiguredVisualizationSemanticControlContract(family, variant);
    assert.ok(familyContract, family);
    const modes = familyContract.modes.length ? familyContract.modes : [{ value: 0 }];

    for (const declaredMode of modes) {
      const contract = getConfiguredVisualizationSemanticControlContract(
        family,
        variant,
        declaredMode.value
      );
      assert.ok(contract, `${family} mode ${declaredMode.value}`);
      const values = Object.fromEntries(
        contract.sliders.map((slider) => [slider.id, slider.initial])
      ) as Record<"comparison" | "value", number>;
      for (const slider of contract.sliders) {
        const low = renderVisibleSecondary(family, {
          ...values,
          [slider.id]: slider.min,
          mode: declaredMode.value
        }, variant);
        const high = renderVisibleSecondary(family, {
          ...values,
          [slider.id]: slider.max,
          mode: declaredMode.value
        }, variant);
        assert.doesNotMatch(low, /data-viz-|<metadata/u);
        assert.doesNotMatch(high, /data-viz-|<metadata/u);
        assert.notEqual(
          low,
          high,
          `${family} mode ${declaredMode.value} ${slider.id} must visibly change`
        );
      }
    }

    if (familyContract.modes.length > 1) {
      const signatures = familyContract.modes.map((declaredMode) => {
        const modeContract = getConfiguredVisualizationSemanticControlContract(
          family,
          variant,
          declaredMode.value
        );
        assert.ok(modeContract);
        const nonDegenerateValues = Object.fromEntries(
          modeContract.sliders.map((slider) => [slider.id, slider.max])
        ) as Record<"comparison" | "value", number>;
        return renderVisibleSecondary(family, {
          ...nonDegenerateValues,
          mode: declaredMode.value
        }, variant);
      });
      assert.equal(
        new Set(signatures).size,
        familyContract.modes.length,
        `${family} must visibly distinguish all declared modes`
      );
    }
  }
});

test("known non-normalized controls visibly drive geometric ratio, reference radius, and parabola translation", () => {
  const geometricLow = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    comparison: 0,
    family: "sequence-model",
    mode: 1
  });
  const geometricHigh = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    comparison: 3,
    family: "sequence-model",
    mode: 1
  });
  assert.equal(semanticMetricNumber(geometricLow, "step"), 1);
  assert.equal(semanticMetricNumber(geometricHigh, "step"), 4);
  assert.notDeepEqual(geometricLow.series, geometricHigh.series);

  for (const family of [
    "unit-circle-wave",
    "trigonometric-identity",
    "trigonometric-synthesis"
  ] as const) {
    const low = renderVisibleSecondary(family, { comparison: 0, mode: 0, value: 5 });
    const high = renderVisibleSecondary(family, { comparison: 10, mode: 0, value: 5 });
    assert.match(low, />R=2<\/text>/u);
    assert.match(high, />R=6<\/text>/u);
    assert.notEqual(low, high, `${family} reference radius`);
  }

  const parabolaLow = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    comparison: 0,
    family: "conic-sections",
    mode: 1
  });
  const parabolaHigh = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    comparison: 10,
    family: "conic-sections",
    mode: 1
  });
  assert.equal(semanticMetricNumber(parabolaLow, "translationY"), -2);
  assert.equal(semanticMetricNumber(parabolaHigh, "translationY"), 2);
  assert.notDeepEqual(parabolaLow.series, parabolaHigh.series);
});

test("complex rotation modes and advanced strategy delegates remain visibly executable", () => {
  const complexModes = [0, 1, 2, 3].map((mode) =>
    renderVisibleSecondary("complex-plane", { comparison: 8, mode, value: 8 })
  );
  assert.equal(new Set(complexModes).size, 4);
  for (const [index, degrees] of [30, 45, 60, 75].entries()) {
    assert.match(complexModes[index], new RegExp(`R${degrees}°\\(z\\)`));
  }

  const strategy = [0, 1, 2].map((mode) =>
    renderVisibleSecondary("advanced-strategy", { comparison: 2, mode, value: 2 })
  );
  assert.equal(new Set(strategy).size, 3);
  assert.match(strategy[0], /u · v|u \+ v/u);
  assert.match(strategy[1], /\(y|y²/u);
  assert.match(strategy[2], /x \+ 2y/u);
});

function openingTagsForName(markup: string, name: string) {
  return [...markup.matchAll(/<[^/][^>]*data-viz-name="([^"]+)"[^>]*>/gu)]
    .filter((match) => match[1] === name)
    .map((match) => match[0]);
}

function assertOverlapPair(
  markup: string,
  names: readonly string[],
  owner: string,
  reason: string
) {
  const tags = names.flatMap((name) => openingTagsForName(markup, name));
  assert.equal(tags.length >= names.length, true, `missing overlap marks: ${names.join(", ")}`);
  for (const tag of tags) {
    assert.match(tag, /\bdata-viz-overlap-ok(?:="")?/u);
    assert.match(tag, new RegExp(`data-viz-overlap-owner="${owner}"`, "u"));
    assert.match(tag, new RegExp(`data-viz-overlap-reason="${reason}"`, "u"));
  }
}

function assertFiniteMathState(state: ReturnType<typeof buildConfiguredSemanticSecondaryMathState>) {
  const visit = (value: unknown, path: string): void => {
    if (typeof value === "number") {
      assert.equal(Number.isFinite(value), true, `${path} must be finite`);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, entry]) => visit(entry, `${path}.${key}`));
    }
  };
  visit(state, state.variant);
}

test("triangle trigonometry keeps its adjacent label outside the triangle at control endpoints and mobile scale", () => {
  for (const value of [0, 5, 10]) {
    for (const comparison of [0, 5, 10]) {
      const markup = renderToStaticMarkup(createElement(
        "svg",
        { style: { width: 320 }, viewBox: "0 0 640 360" },
        createElement(ConfiguredSemanticSecondaryMarks, {
          accent: "#06b6d4",
          comparison,
          family: "triangle-trigonometry",
          mode: 0,
          value,
          variant: "right-triangle-ratios",
          vizTheme: visibleTheme
        })
      ));
      const triangle = openingTagsForName(markup, "marked trigonometric right triangle")[0];
      const label = openingTagsForName(markup, "adjacent label")[0];
      assert.ok(triangle && label);
      const baseY = Number(triangle.match(/data-viz-base-y="([^"]+)"/u)?.[1]);
      const labelY = Number(label.match(/data-viz-label-y="([^"]+)"/u)?.[1]);
      const clearance = Number(label.match(/data-viz-triangle-clearance="([^"]+)"/u)?.[1]);
      assert.equal(label.match(/data-viz-label-placement="([^"]+)"/u)?.[1], "outside-below-base");
      assert.ok(labelY > baseY);
      assert.ok(clearance >= 28, `${value}/${comparison}: ${clearance}`);
      assert.ok(clearance * 0.5 >= 14, `${value}/${comparison}: mobile clearance`);
      assert.doesNotMatch(triangle, /data-viz-overlap/u);
      assert.doesNotMatch(label, /data-viz-overlap/u);
    }
  }
});

test("intentional overlap contracts are symmetric, specific, and never blanket the triangle", () => {
  const trig = renderToStaticMarkup(createElement(ConfiguredSemanticSecondaryMarks, {
    ...baseInput,
    accent: "#06b6d4",
    family: "unit-circle-wave",
    vizTheme: visibleTheme
  }));
  assertOverlapPair(
    trig,
    ["reference circle", "reference radius label"],
    "trigonometry-reference-radius-label",
    "reference radius label intentionally identifies its containing reference circle"
  );

  const equation = renderToStaticMarkup(createElement(ConfiguredSemanticSecondaryMarks, {
    ...baseInput,
    accent: "#06b6d4",
    family: "symbolic-equation",
    vizTheme: visibleTheme
  }));
  assertOverlapPair(
    equation,
    ["left symbolic state", "left symbolic expression"],
    "symbolic-left-expression-card",
    "left symbolic expression is intentionally contained by its state card"
  );
  assertOverlapPair(
    equation,
    ["right symbolic state", "right symbolic expression"],
    "symbolic-right-expression-card",
    "right symbolic expression is intentionally contained by its state card"
  );

  const sets = renderToStaticMarkup(createElement(ConfiguredSemanticSecondaryMarks, {
    ...baseInput,
    accent: "#06b6d4",
    family: "set-logic",
    vizTheme: visibleTheme
  }));
  assertOverlapPair(
    sets,
    ["set A", "set B", "set membership", "set intersection size"],
    "set-logic-venn-model",
    "set labels are intentionally contained by the overlapping Venn circles"
  );
  assert.equal(openingTagsForName(sets, "set membership").length, 2);
  assert.deepEqual(
    Array.from(source.matchAll(/<g\b[^>]*\bdata-viz-overlap-ok="([^"]+)"/gu), (match) => match[1]),
    ["semantic-formula-overlap-pair", "semantic-check-overlap-pair"]
  );
  assert.equal(source.match(/data-viz-overlap-owner="trigonometry-reference-radius-label"/gu)?.length, 2);
  assert.equal(source.match(/data-viz-overlap-owner="symbolic-left-expression-card"/gu)?.length, 2);
  assert.equal(source.match(/data-viz-overlap-owner="symbolic-right-expression-card"/gu)?.length, 2);
  assert.equal(source.match(/data-viz-overlap-owner="set-logic-venn-model"/gu)?.length, 4);
});

test("advanced-functions renders one selected curve without an unproven cross-family comparison", () => {

  for (const mode of [0, 1, 2]) {
    for (const value of [1, 5, 10]) {
      for (const comparison of [0, 4, 10]) {
        const state = buildConfiguredSemanticSecondaryMathState({
          comparison,
          family: "function-properties",
          mode,
          value,
          variant: "advanced-functions"
        });
        assert.equal(state.kind, "advanced-functions");
        assert.equal(semanticMetricNumber(state, "scaleParameter"), value / 6);
        assert.equal(semanticMetricNumber(state, "verticalShift"), comparison - 5);
        assert.equal(state.metrics.primaryFamily, "quadratic");
        assert.equal(state.metrics.selectedCurveOnly, true);
        assert.equal("comparisonFamily" in state.metrics, false);
        assert.equal(state.comparisonSeries, undefined);
        assert.equal(state.series.length, 33);
        assertFiniteMathState(state);

        const markup = renderToStaticMarkup(createElement(ConfiguredSemanticSecondaryMarks, {
          accent: "#06b6d4",
          comparison,
          family: "function-properties",
          mode,
          value,
          variant: "advanced-functions",
          vizTheme: visibleTheme
        }));
        const primary = openingTagsForName(markup, "advanced primary curve")[0];
        assert.ok(primary);
        assert.match(primary, new RegExp(`data-viz-scale-parameter="${value / 6}"`, "u"));
        assert.match(primary, new RegExp(`data-viz-vertical-shift="${comparison - 5}"`, "u"));
        assert.match(primary, /data-viz-sample-count="33"/u);
        assert.equal(openingTagsForName(markup, "advanced comparison curve").length, 0);
        const readout = openingTagsForName(markup, "advanced function readout")[0];
        assert.ok(readout);
        assert.match(readout, /data-viz-formula="[^"]+"/u);
        assert.equal(
          readout.match(/data-viz-formula="([^"]+)"/u)?.[1],
          primary.match(/data-viz-formula="([^"]+)"/u)?.[1]
        );
        const samples = openingTagsForName(markup, "advanced curve sample");
        assert.equal(samples.length, 3);
        for (const sample of samples) {
          const x = Number(sample.match(/\bdata-viz-x="([^"]+)"/u)?.[1]);
          const y = Number(sample.match(/\bdata-viz-y="([^"]+)"/u)?.[1]);
          assert.ok(Number.isFinite(x) && Number.isFinite(y));
          assert.ok(Math.abs(y - ((value / 6) * x ** 2 + comparison - 5)) < 1e-10);
          assert.match(sample, /\bcx="[^"]+"/u);
          assert.match(sample, /\bcy="[^"]+"/u);
        }
        assert.doesNotMatch(markup, /data-viz-comparison-family=/u);
        assert.doesNotMatch(markup, /→/u);
      }
    }
  }

  const reset = buildConfiguredSemanticSecondaryMathState({
    comparison: 4,
    family: "function-properties",
    mode: 0,
    value: 5,
    variant: "advanced-functions"
  });
  assert.equal(semanticMetricNumber(reset, "scaleParameter"), 5 / 6);
  assert.equal(semanticMetricNumber(reset, "verticalShift"), -1);
  assert.equal(reset.metrics.primaryFamily, "quadratic");
  assert.equal(configuredSemanticSecondaryRequiredModeCount({
    family: "function-properties",
    variant: "advanced-functions"
  }), 0);
  assert.deepEqual(projectConfiguredSemanticSecondaryDisplayValues({
    comparison: 4,
    family: "function-properties",
    mode: 0,
    value: 5,
    variant: "advanced-functions"
  }), {
    comparison: "k=-1",
    family: "function-properties",
    mode: "quadratic",
    value: "a=0.83"
  });
  assert.match(reset.formula, /0\.83x² − 1/u);
  assert.doesNotMatch(reset.formula, /compare/u);
});

test("HK differentiation and calculus expose only the lesson-proven tangent state", () => {
  assert.equal(configuredSemanticSecondaryRequiredModeCount({
    family: "derivative-rate-area",
    variant: "differentiation-intro"
  }), 1);
  assert.equal(configuredSemanticSecondaryRequiredModeCount({
    family: "derivative-rate-area",
    variant: "calculus"
  }), 1);
  for (const variant of ["differentiation-intro", "calculus"] as const) {
    for (const mode of [-7, 0, 1, 2, 99]) {
      for (const value of [0, 5, 10]) {
        for (const comparison of [1, 4, 9]) {
          const state = buildConfiguredSemanticSecondaryMathState({
            comparison,
            family: "derivative-rate-area",
            mode,
            value,
            variant
          });
          assert.equal(state.metrics.activeMode, "tangent");
          assert.equal(semanticMetricNumber(state, "activeModeIndex"), 0);
          assertFiniteMathState(state);

          const markup = renderToStaticMarkup(createElement(ConfiguredSemanticSecondaryMarks, {
            accent: "#06b6d4",
            comparison,
            family: "derivative-rate-area",
            mode,
            value,
            variant,
            vizTheme: visibleTheme
          }));
          assert.match(markup, /data-viz-name="tangent line"/u);
          assert.match(markup, /data-viz-name="calculus curve"[^>]*data-viz-curvature=/u);
          const probe = openingTagsForName(markup, "calculus probe point")[0];
          const tangent = openingTagsForName(markup, "tangent line")[0];
          const readout = openingTagsForName(markup, "calculus mode readout")[0];
          assert.ok(probe && tangent && readout);
          const curvature = value / 10;
          const probeX = (comparison - 5) / 1.25;
          const probeY = 0.5 * curvature * probeX ** 2 + 0.35;
          const slope = curvature * probeX;
          assert.match(probe, new RegExp(`data-viz-x0="${probeX}"`, "u"));
          assert.match(probe, new RegExp(`data-viz-y0="${probeY}"`, "u"));
          assert.match(probe, new RegExp(`data-viz-tangent-slope="${slope}"`, "u"));
          assert.match(probe, /\bcx="[^"]+"[^>]*\bcy="[^"]+"/u);
          assert.match(tangent, new RegExp(`data-viz-slope="${slope}"`, "u"));
          assert.match(tangent, new RegExp(`data-viz-anchor-x="${probeX}"`, "u"));
          assert.match(tangent, new RegExp(`data-viz-anchor-y="${probeY}"`, "u"));
          assert.match(tangent, /\bd="M [^"]+ L [^"]+"/u);
          assert.match(readout, new RegExp(`data-viz-y0="${probeY}"`, "u"));
          assert.match(readout, new RegExp(`data-viz-tangent-slope="${slope}"`, "u"));
          assert.match(readout, /data-viz-formula="[^"]+"/u);
          assert.equal(openingTagsForName(markup, "secant line").length, 0);
          assert.equal(openingTagsForName(markup, "calculus area strip").length, 0);
          assert.doesNotMatch(markup, /data-viz-exact-integral=/u);
        }
      }
    }
  }
});

test("HK statistics variants expose only mean, spread, and symmetric-distribution state", () => {
  for (const variant of ["statistics-s1", "data-handling"] as const) {
    assert.equal(configuredSemanticSecondaryRequiredModeCount({
      family: "statistics-distribution",
      variant
    }), 0);
    for (const value of [0, 5, 10]) {
      for (const comparison of [1, 2, 4]) {
        const state = buildConfiguredSemanticSecondaryMathState({
          comparison,
          family: "statistics-distribution",
          mode: 0,
          value,
          variant
        });
        assert.equal(semanticMetricNumber(state, "mean"), value);
        assert.equal(semanticMetricNumber(state, "spread"), comparison);
        assert.ok(Math.abs(semanticMetricNumber(state, "symmetryResidual")) < 1e-12);
        assert.equal(state.metrics.summaryOnly, true);
        assert.equal("observed" in state.metrics, false);
        assert.equal("observedIndex" in state.metrics, false);
        assert.equal("zScore" in state.metrics, false);
        assert.doesNotMatch(`${state.formula} ${state.check}`, /(?:\bz\b|observed)/iu);
        assertFiniteMathState(state);

        const markup = renderToStaticMarkup(createElement(ConfiguredSemanticSecondaryMarks, {
          accent: "#06b6d4",
          comparison,
          family: "statistics-distribution",
          mode: 0,
          value,
          variant,
          vizTheme: visibleTheme
        }));
        assert.match(markup, new RegExp(`data-viz-name="distribution summary curve"[^>]*data-viz-mean="${value}"[^>]*data-viz-spread="${comparison}"`, "u"));
        assert.match(markup, /data-viz-name="distribution summary readout"/u);
        const band = openingTagsForName(markup, "distribution spread band")[0];
        const left = openingTagsForName(markup, "distribution left spread marker")[0];
        const right = openingTagsForName(markup, "distribution right spread marker")[0];
        assert.ok(band && left && right, "spread must have visible band and endpoint geometry");
        assert.match(band, new RegExp(`data-viz-left-value="${value - comparison}"`, "u"));
        assert.match(band, new RegExp(`data-viz-right-value="${value + comparison}"`, "u"));
        assert.match(band, /\bx="[^"]+"[^>]*\bwidth="[^"]+"/u);
        assert.match(left, new RegExp(`data-viz-x-value="${value - comparison}"`, "u"));
        assert.match(right, new RegExp(`data-viz-x-value="${value + comparison}"`, "u"));
        assert.match(left, /\bcx="[^"]+"[^>]*\bcy="[^"]+"/u);
        assert.match(right, /\bcx="[^"]+"[^>]*\bcy="[^"]+"/u);
        assert.doesNotMatch(markup, /data-viz-(?:observed|z-score)/u);
      }
    }
  }

  const mainland = buildConfiguredSemanticSecondaryMathState({
    ...baseInput,
    family: "statistics-distribution",
    variant: "audit-contract"
  });
  assert.equal(typeof mainland.metrics.observedIndex, "number");
  assert.equal(typeof mainland.metrics.zScore, "number");
});

test("HK distribution and advanced functions use explicit fixed viewport and tick plans", () => {
  const module = secondaryMarksModule as unknown as Record<string, unknown>;
  const plans = module.configuredSemanticSecondaryPassThroughViewportPlans as
    | Readonly<Record<string, unknown>>
    | undefined;
  assert.ok(plans, "Pass-through fixed viewports must be an exported pure topic table.");
  assert.deepEqual(plans, {
    "statistics-s1": {
      id: "hk-distribution-summary-fixed-v1",
      viewport: { xMaximum: 22, xMinimum: -12, yMaximum: 1.1, yMinimum: 0 },
      xTicks: [-10, 0, 10, 20],
      yTicks: [0, 0.5, 1]
    },
    "data-handling": {
      id: "hk-distribution-summary-fixed-v1",
      viewport: { xMaximum: 22, xMinimum: -12, yMaximum: 1.1, yMinimum: 0 },
      xTicks: [-10, 0, 10, 20],
      yTicks: [0, 0.5, 1]
    },
    "advanced-functions": {
      id: "hk-selected-quadratic-fixed-v1",
      viewport: { xMaximum: 3, xMinimum: -2.4, yMaximum: 21, yMinimum: -6 },
      xTicks: [-2, 0, 2],
      yTicks: [-5, 0, 5, 10, 15, 20]
    }
  });

  for (const [variant, family] of [
    ["statistics-s1", "statistics-distribution"],
    ["data-handling", "statistics-distribution"],
    ["advanced-functions", "function-properties"]
  ] as const) {
    const markup = renderRawSecondary(family, { comparison: 2, mode: 0, value: 5 }, variant);
    const viewport = openingTagsForName(markup, "semantic fixed viewport")[0];
    assert.ok(viewport, `${variant} fixed viewport marker`);
    const plan = plans[variant] as {
      id: string;
      viewport: { xMaximum: number; xMinimum: number; yMaximum: number; yMinimum: number };
      xTicks: readonly number[];
      yTicks: readonly number[];
    };
    assert.equal(semanticOverlapAttribute(viewport, "data-viz-viewport-id"), plan.id);
    assert.equal(semanticOverlapAttribute(viewport, "data-viz-domain-x-min"), String(plan.viewport.xMinimum));
    assert.equal(semanticOverlapAttribute(viewport, "data-viz-domain-x-max"), String(plan.viewport.xMaximum));
    assert.equal(semanticOverlapAttribute(viewport, "data-viz-domain-y-min"), String(plan.viewport.yMinimum));
    assert.equal(semanticOverlapAttribute(viewport, "data-viz-domain-y-max"), String(plan.viewport.yMaximum));
    assert.equal(semanticOverlapAttribute(viewport, "data-viz-x-ticks"), plan.xTicks.join(","));
    assert.equal(semanticOverlapAttribute(viewport, "data-viz-y-ticks"), plan.yTicks.join(","));
    assert.equal(openingTagsForName(markup, "semantic x tick").length, plan.xTicks.length);
    assert.equal(openingTagsForName(markup, "semantic y tick").length, plan.yTicks.length);
  }
});

test("fixed pass-through viewports make parameter changes visibly move painted geometry", () => {
  const path = (markup: string, name: string) => {
    const tag = openingTagsForName(markup, name)[0];
    assert.ok(tag, name);
    return semanticOverlapAttribute(tag, "d");
  };
  const coordinate = (markup: string, name: string, attribute: "cx" | "width") => {
    const tag = openingTagsForName(markup, name)[0];
    assert.ok(tag, name);
    return Number(semanticOverlapAttribute(tag, attribute));
  };

  const advancedLow = renderRawSecondary(
    "function-properties",
    { comparison: 5, mode: 0, value: 1 },
    "advanced-functions"
  );
  const advancedHigh = renderRawSecondary(
    "function-properties",
    { comparison: 5, mode: 0, value: 10 },
    "advanced-functions"
  );
  assert.notEqual(
    path(advancedLow, "advanced primary curve"),
    path(advancedHigh, "advanced primary curve"),
    "Changing positive a must change the painted curve inside one fixed viewport."
  );

  const distributionLeft = renderRawSecondary(
    "statistics-distribution",
    { comparison: 2, mode: 0, value: 0 },
    "statistics-s1"
  );
  const distributionRight = renderRawSecondary(
    "statistics-distribution",
    { comparison: 2, mode: 0, value: 10 },
    "statistics-s1"
  );
  assert.ok(
    coordinate(distributionRight, "distribution left spread marker", "cx")
      > coordinate(distributionLeft, "distribution left spread marker", "cx"),
    "Increasing mean must move the painted curve and spread markers right."
  );
  const narrow = renderRawSecondary(
    "statistics-distribution",
    { comparison: 1, mode: 0, value: 5 },
    "data-handling"
  );
  const wide = renderRawSecondary(
    "statistics-distribution",
    { comparison: 4, mode: 0, value: 5 },
    "data-handling"
  );
  assert.ok(
    Math.abs(
      coordinate(wide, "distribution spread band", "width")
        / coordinate(narrow, "distribution spread band", "width")
        - 4
    ) < 1e-9,
    "Painted spread-band width must scale exactly with spread in a fixed viewport."
  );
});

test("advanced a is positive in raw state, formula, curve, and learner readout even for stale zero input", () => {
  const state = buildConfiguredSemanticSecondaryMathState({
    comparison: 5,
    family: "function-properties",
    mode: 99,
    value: 0,
    variant: "advanced-functions"
  });
  assert.equal(semanticMetricNumber(state, "scaleParameter"), 1 / 6);
  assert.ok(semanticMetricNumber(state, "scaleParameter") > 0);
  assert.match(state.formula, /0\.17x² \+ 0/u);
  const markup = renderRawSecondary(
    "function-properties",
    { comparison: 5, mode: 99, value: 0 },
    "advanced-functions"
  );
  for (const name of ["advanced primary curve", "advanced function readout"]) {
    const tag = openingTagsForName(markup, name)[0];
    assert.ok(tag, name);
    assert.equal(semanticOverlapAttribute(tag, "data-viz-scale-parameter"), String(1 / 6));
  }
  assert.match(markup, />quadratic · a=0\.17 · k=0<\/text>/u);
});

test("secondary pass-through formula, check, and numeric readout are exact and trilingual", () => {
  const locales = [
    {
      checkLabel: "Check",
      expected: {
        advancedCheck: "selected quadratic · a=0.83 · k=0",
        advancedFormula: "y=0.83x² + 0",
        advancedReadout: "quadratic · a=0.83 · k=0",
        calculusCheck: "x₀=−0.8 · tangent slope=−0.4",
        distributionCheck: "symmetric about μ=5 · height(μ−spread)=height(μ+spread)",
        distributionFormula: "center μ=5 · spread=2",
        distributionReadout: "mean=5 · spread=2 · symmetric distribution"
      },
      formulaLabel: "Formula",
      locale: "en"
    },
    {
      checkLabel: "驗證",
      expected: {
        advancedCheck: "已選二次函數 · a=0.83 · k=0",
        advancedFormula: "y=0.83x² + 0",
        advancedReadout: "二次函數 · a=0.83 · k=0",
        calculusCheck: "x₀=−0.8 · 切線斜率=−0.4",
        distributionCheck: "關於 μ=5 對稱 · 高度(μ−離散程度)=高度(μ+離散程度)",
        distributionFormula: "中心 μ=5 · 離散程度=2",
        distributionReadout: "平均數=5 · 離散程度=2 · 對稱分佈"
      },
      formulaLabel: "公式",
      locale: "zh"
    },
    {
      checkLabel: "验证",
      expected: {
        advancedCheck: "已选二次函数 · a=0.83 · k=0",
        advancedFormula: "y=0.83x² + 0",
        advancedReadout: "二次函数 · a=0.83 · k=0",
        calculusCheck: "x₀=−0.8 · 切线斜率=−0.4",
        distributionCheck: "关于 μ=5 对称 · 高度(μ−离散程度)=高度(μ+离散程度)",
        distributionFormula: "中心 μ=5 · 离散程度=2",
        distributionReadout: "平均数=5 · 离散程度=2 · 对称分布"
      },
      formulaLabel: "公式",
      locale: "zh-Hans"
    }
  ] as const;

  const renderLocalized = (
    family: "derivative-rate-area" | "function-properties" | "statistics-distribution",
    variant: "advanced-functions" | "calculus" | "differentiation-intro" | "statistics-s1",
    strings: {
      checkLabel: string;
      formulaLabel: string;
      locale: "en" | "zh" | "zh-Hans";
    }
  ) => renderToStaticMarkup(createElement("svg", { viewBox: "0 0 640 360" }, createElement(
    ConfiguredSemanticSecondaryMarks,
    {
      accent: "#06b6d4",
      comparison: variant === "advanced-functions" ? 5 : variant === "statistics-s1" ? 2 : 4,
      family,
      mode: 0,
      strings,
      value: 5,
      variant,
      vizTheme: visibleTheme
    }
  )));

  for (const entry of locales) {
    const statistics = renderLocalized("statistics-distribution", "statistics-s1", entry);
    for (const [name, expected, attribute] of [
      ["semantic formula", entry.expected.distributionFormula, "data-viz-visible-formula"],
      ["semantic invariant check", entry.expected.distributionCheck, "data-viz-visible-check"],
      ["distribution summary readout", entry.expected.distributionReadout, "data-viz-visible-readout"]
    ] as const) {
      const tag = openingTagsForName(statistics, name)[0];
      assert.ok(tag, `${entry.locale}:${name}`);
      assert.equal(semanticOverlapAttribute(tag, "data-viz-visible-locale"), entry.locale);
      assert.equal(semanticOverlapAttribute(tag, attribute), expected);
      assert.match(
        statistics,
        new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u")
      );
    }

    const advanced = renderLocalized("function-properties", "advanced-functions", entry);
    for (const [name, expected, attribute] of [
      ["semantic formula", entry.expected.advancedFormula, "data-viz-visible-formula"],
      ["semantic invariant check", entry.expected.advancedCheck, "data-viz-visible-check"],
      ["advanced function readout", entry.expected.advancedReadout, "data-viz-visible-readout"]
    ] as const) {
      const tag = openingTagsForName(advanced, name)[0];
      assert.ok(tag, `${entry.locale}:${name}`);
      assert.equal(semanticOverlapAttribute(tag, "data-viz-visible-locale"), entry.locale);
      assert.equal(semanticOverlapAttribute(tag, attribute), expected);
    }

    for (const variant of ["differentiation-intro", "calculus"] as const) {
      const calculus = renderLocalized("derivative-rate-area", variant, entry);
      for (const [name, expected, attribute] of [
        ["semantic formula", "f(x)=0.5·a·x²+0.35, a=0.5 · f′(x)=a·x", "data-viz-visible-formula"],
        ["semantic invariant check", entry.expected.calculusCheck, "data-viz-visible-check"],
        ["calculus mode readout", entry.expected.calculusCheck, "data-viz-visible-readout"]
      ] as const) {
        const tag = openingTagsForName(calculus, name)[0];
        assert.ok(tag, `${entry.locale}:${variant}:${name}`);
        assert.equal(semanticOverlapAttribute(tag, "data-viz-visible-locale"), entry.locale);
        assert.equal(semanticOverlapAttribute(tag, attribute), expected);
      }
    }
  }
});
