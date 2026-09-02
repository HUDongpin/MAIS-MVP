import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  BASE_CX,
  BASE_CY,
  DEG_MAX,
  DEG_MIN,
  DEG_STEP,
  ELLIPSE_RATIO,
  EX_DEG,
  EX_SLANT,
  H,
  R_MAX,
  R_MIN,
  SCALE,
  SEC_CX,
  SEC_CY,
  TRY_DEG,
  TRY_SLANT,
  W,
  coneFromSector,
  coneLabel,
  fmt,
  fractionText,
  gcd,
  layout,
  rel,
  sectorLabel,
  tryAnswerIndex,
  tryChoices,
} from "./ca-g10-ch03-circle-geometry";

const SLUG = "ca-g10-ch03-circle-geometry";
const BRIEF_STANDARDS = ["G-C.1", "G-C.2", "G-C.3", "G-C.4", "G-C.5", "G-GMD.1", "G-GMD.2", "G-GMD.3", "G-GMD.4"];
/** Rough glyph width at font size 11, used only to keep text labels inside the viewBox. */
const GLYPH = 6.5;

/** Every cut angle the stepper can reach. */
function angles(): number[] {
  const list: number[] = [];
  for (let deg = DEG_MIN; deg <= DEG_MAX; deg += DEG_STEP) list.push(deg);
  return list;
}

function near(actual: number, expected: number, epsilon: number, message: string): void {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${message}: ${actual} vs ${expected}`);
}

test("formatting helpers are exact", () => {
  assert.equal(gcd(288, 360), 72);
  assert.equal(gcd(9, 0), 9);
  assert.equal(fractionText(288, 360), "4/5");
  assert.equal(fractionText(60, 360), "1/6");
  assert.equal(fractionText(120, 360), "1/3");
  assert.equal(fractionText(180, 360), "1/2");
  assert.equal(fractionText(240, 360), "2/3");
  assert.equal(fractionText(300, 360), "5/6");
  assert.equal(fmt(3), "3");
  assert.equal(fmt(7.5), "7.5");
  assert.equal(fmt(0.25), "0.25");
  assert.equal(fmt(Math.PI), "3.14");
  assert.equal(rel(3), "=");
  assert.equal(rel(7.5), "=");
  assert.equal(rel(Math.PI), "≈");
});

test("every reachable (radius, angle) pair keeps the readouts true and the drawings inside the viewBox", () => {
  assert.deepEqual([R_MIN, R_MAX], [3, 9]);
  assert.deepEqual([DEG_MIN, DEG_MAX, DEG_STEP], [60, 300, 30]);
  assert.deepEqual(angles(), [60, 90, 120, 150, 180, 210, 240, 270, 300]);
  assert.equal(SCALE, 12);
  assert.equal(W, 250);
  assert.equal(H, 250);

  const radiansByAngle = new Map<number, number>();
  const shapeByAngle = new Map<number, number>();
  const areaByAngle = new Map<number, number>();
  const volumeByAngle = new Map<number, number>();
  let states = 0;

  for (let slant = R_MIN; slant <= R_MAX; slant += 1) {
    for (const deg of angles()) {
      states += 1;
      const where = `slant ${slant}, angle ${deg}`;
      const c = coneFromSector(slant, deg);

      // Independent arithmetic, written a different way from the lesson helper.
      const arc = (Math.PI * slant * deg) / 180;
      const rho = slant * (deg / 360);
      const height = Math.sqrt((slant - rho) * (slant + rho));
      const cylinder = Math.PI * rho * rho * height;

      near(c.circumference, Math.PI * 2 * slant, 1e-12, `circumference at ${where}`);
      near(c.arc, arc, 1e-12, `arc at ${where}`);
      near(c.baseRadius, rho, 1e-12, `base radius at ${where}`);
      assert.equal(c.fraction, fractionText(deg, 360));

      // The arc closes into the base circle without stretching: 2 pi r = arc.
      near(2 * Math.PI * c.baseRadius, c.arc, 1e-12, `2 pi r must equal the arc at ${where}`);
      // The wedge is the same fraction of the circle as its arc is of the circumference.
      near(c.arc / c.circumference, deg / 360, 1e-12, `arc fraction at ${where}`);
      near(c.sectorArea / (Math.PI * slant * slant), deg / 360, 1e-12, `area fraction at ${where}`);
      // The flat wedge is exactly the cone's lateral surface pi r l.
      near(c.sectorArea, Math.PI * c.baseRadius * slant, 1e-12, `lateral area at ${where}`);
      near(c.lateralArea, c.sectorArea, 1e-12, `lateral area readout at ${where}`);

      // The cone is never degenerate, and half of the slice through the apex is a right triangle.
      assert.ok(c.baseRadius > 0 && c.baseRadius < slant, `base radius stays inside the slant at ${where}`);
      assert.ok(c.height > 0, `height stays positive at ${where}`);
      near(c.height, height, 1e-12, `height at ${where}`);
      near(c.baseRadius * c.baseRadius + c.height * c.height, slant * slant, 1e-9, `r squared plus h squared at ${where}`);

      // Cone volume is one third of the cylinder on the same base with the same height.
      near(c.cylinderVolume, cylinder, 1e-9, `cylinder volume at ${where}`);
      near(c.volume, cylinder / 3, 1e-9, `cone volume at ${where}`);
      near(c.cylinderVolume - 3 * c.volume, 0, 1e-9, `cylinder is three cones at ${where}`);

      // Similar figures scale by matching powers, so it is length over R, area over R squared and
      // volume over R cubed that depend on the angle alone -- never on the radius.
      near(c.radians, (deg * Math.PI) / 180, 1e-12, `radian measure at ${where}`);
      const seenRadians = radiansByAngle.get(deg);
      if (seenRadians === undefined) radiansByAngle.set(deg, c.radians);
      else near(c.radians, seenRadians, 1e-12, `arc over R must not depend on the radius at ${where}`);
      const seenShape = shapeByAngle.get(deg);
      if (seenShape === undefined) shapeByAngle.set(deg, c.baseRadius / slant);
      else near(c.baseRadius / slant, seenShape, 1e-12, `r over R must not depend on the radius at ${where}`);
      const seenArea = areaByAngle.get(deg);
      if (seenArea === undefined) areaByAngle.set(deg, c.sectorArea / (slant * slant));
      else near(c.sectorArea / (slant * slant), seenArea, 1e-12, `area over R squared must not depend on the radius at ${where}`);
      const seenVolume = volumeByAngle.get(deg);
      if (seenVolume === undefined) volumeByAngle.set(deg, c.volume / (slant * slant * slant));
      else near(c.volume / (slant * slant * slant), seenVolume, 1e-12, `volume over R cubed must not depend on the radius at ${where}`);

      // Printed numbers, checked against an independent notion of "exact at two decimals"
      // (hundredths, computed here without calling fmt or rel on the expected side).
      for (const value of [c.arc, c.sectorArea, c.baseRadius, c.height, c.volume, c.cylinderVolume]) {
        const hundredths = Math.round(value * 100);
        const exact = Math.abs(value * 100 - hundredths) < 1e-9;
        const rounded = hundredths / 100;
        assert.equal(rel(value), exact ? "=" : "\u2248", `relation sign for ${value} at ${where}`);
        assert.equal(fmt(value), exact ? String(rounded) : rounded.toFixed(2), `printed form of ${value} at ${where}`);
      }

      // Pixel layout: both drawings stay inside their 250 by 250 viewBox in every state.
      const L = layout(slant, deg);
      assert.equal(L.rPx, slant * SCALE);
      near(L.rhoPx, rho * SCALE, 1e-9, `base radius in pixels at ${where}`);
      near(L.hPx, Math.round(height * SCALE * 100) / 100, 1e-9, `height in pixels at ${where}`);
      assert.ok(SEC_CX - L.rPx >= 2 && SEC_CX + L.rPx <= W - 2, `paper circle fits horizontally at ${where}`);
      assert.ok(SEC_CY - L.rPx >= 2 && SEC_CY + L.rPx <= H - 2, `paper circle fits vertically at ${where}`);
      assert.deepEqual(L.top, { x: SEC_CX, y: SEC_CY - slant * SCALE });
      near((L.end.x - SEC_CX) ** 2 + (L.end.y - SEC_CY) ** 2, L.rPx * L.rPx, 3, `arc end sits on the circle at ${where}`);
      // The wedge really sweeps deg degrees clockwise from the top of the circle: recover the
      // endpoint's bearing with atan2, so a reflected or mis-sized sweep cannot pass.
      const sweptTo = (((90 - deg) % 360) + 360) % 360;
      const bearing = (((Math.atan2(SEC_CY - L.end.y, L.end.x - SEC_CX) * 180) / Math.PI) % 360 + 360) % 360;
      near(bearing, sweptTo, 0.05, `swept angle at ${where}`);
      // ... and the endpoint itself, built from the radius and that bearing rather than from L.
      const endX = Math.round((SEC_CX + slant * SCALE * Math.cos(((90 - deg) * Math.PI) / 180)) * 100) / 100;
      const endY = Math.round((SEC_CY - slant * SCALE * Math.sin(((90 - deg) * Math.PI) / 180)) * 100) / 100;
      near(L.end.x, endX, 1e-9, `arc end x at ${where}`);
      near(L.end.y, endY, 1e-9, `arc end y at ${where}`);
      assert.equal(L.largeArc, deg > 180 ? 1 : 0, `large-arc flag at ${where}`);
      // The whole path string, rebuilt from independent pixels instead of from L's own fields.
      const expectedPath = `M ${SEC_CX} ${SEC_CY} L ${SEC_CX} ${SEC_CY - slant * SCALE} A ${slant * SCALE} ${slant * SCALE} 0 ${deg > 180 ? 1 : 0} 1 ${endX} ${endY} Z`;
      assert.equal(L.sectorPath, expectedPath, `sector path at ${where}`);

      assert.equal(L.apex.x, BASE_CX);
      near(L.apex.y, BASE_CY - height * SCALE, 0.01, `apex height at ${where}`);
      assert.equal(L.rimLeft.y, BASE_CY);
      assert.equal(L.rimRight.y, BASE_CY);
      near(L.rimRight.x - BASE_CX, L.rhoPx, 1e-9, `right rim at ${where}`);
      near(BASE_CX - L.rimLeft.x, L.rhoPx, 1e-9, `left rim at ${where}`);
      near(L.ry, Math.round(L.rhoPx * ELLIPSE_RATIO * 100) / 100, 1e-9, `ellipse semi-axis at ${where}`);
      for (const [name, point] of Object.entries({ top: L.top, end: L.end, apex: L.apex, rimLeft: L.rimLeft, rimRight: L.rimRight })) {
        assert.ok(point.x >= 2 && point.x <= W - 2, `${name}.x at ${where}`);
        assert.ok(point.y >= 2 && point.y <= H - 2, `${name}.y at ${where}`);
      }
      assert.ok(BASE_CY + L.ry <= H - 2 && BASE_CY - L.ry >= 2, `base ellipse fits vertically at ${where}`);
      assert.ok(L.marker >= 1 && L.marker <= L.rhoPx, `right-angle mark fits inside the base radius at ${where}`);
      assert.ok(BASE_CY - L.marker >= 2 && BASE_CX + L.marker <= W - 2, `right-angle mark stays in the viewBox at ${where}`);

      // Text labels, both their wording and their box.
      assert.equal(L.labels.length, 5);
      assert.equal(L.labels[0].text, `R = ${slant} cm`);
      assert.equal(L.labels[1].text, `${deg}°`);
      assert.equal(L.labels[2].text, `h ${rel(c.height)} ${fmt(c.height)}`);
      assert.equal(L.labels[3].text, `r ${rel(c.baseRadius)} ${fmt(c.baseRadius)}`);
      assert.equal(L.labels[4].text, `slant = ${slant}`);
      for (const label of L.labels) {
        const width = label.text.length * GLYPH;
        const left = label.anchor === "start" ? label.x : label.anchor === "end" ? label.x - width : label.x - width / 2;
        assert.ok(left >= 0, `label "${label.text}" runs past the left edge at ${where}`);
        assert.ok(left + width <= W, `label "${label.text}" runs past the right edge at ${where}`);
        assert.ok(label.y - 11 >= 0 && label.y <= H, `label "${label.text}" leaves the viewBox vertically at ${where}`);
      }

      // Both accessible descriptions are true in this state.
      const sectorText = sectorLabel(slant, deg);
      assert.ok(sectorText.includes(`radius ${slant} centimeters`), `sector label radius at ${where}`);
      assert.ok(sectorText.includes(`${deg} degree wedge`), `sector label angle at ${where}`);
      assert.ok(sectorText.includes(`${c.fraction} of the circle`), `sector label fraction at ${where}`);
      assert.ok(sectorText.includes(`about ${arc.toFixed(2)} centimeters`), `sector label arc at ${where}`);
      const coneText = coneLabel(slant, deg);
      assert.ok(coneText.includes(`slant height ${slant} centimeters`), `cone label slant at ${where}`);
      assert.ok(coneText.includes(`base radius about ${rho.toFixed(2)} centimeters`), `cone label radius at ${where}`);
      assert.ok(coneText.includes(`height about ${height.toFixed(2)} centimeters`), `cone label height at ${where}`);
      assert.ok(coneText.includes(`about ${(cylinder / 3).toFixed(2)} cubic centimeters`), `cone label volume at ${where}`);
    }
  }
  assert.equal(states, 63);

  // The scaling law the lesson now states: doubling the paper radius doubles every length,
  // quadruples every area and multiplies every volume by eight -- so area over R and volume
  // over R are NOT invariants, and no sentence may claim they are.
  const small = coneFromSector(R_MIN, DEG_MIN), big = coneFromSector(2 * R_MIN, DEG_MIN);
  near(big.arc / small.arc, 2, 1e-12, "doubling R doubles the arc");
  near(big.baseRadius / small.baseRadius, 2, 1e-12, "doubling R doubles the base radius");
  near(big.height / small.height, 2, 1e-12, "doubling R doubles the height");
  near(big.sectorArea / small.sectorArea, 4, 1e-12, "doubling R quadruples the wedge area");
  near(big.volume / small.volume, 8, 1e-12, "doubling R multiplies the volume by eight");
  near((big.sectorArea / (2 * R_MIN)) / (small.sectorArea / R_MIN), 2, 1e-12, "area over R doubles when R doubles");
  near((big.volume / (2 * R_MIN)) / (small.volume / R_MIN), 4, 1e-12, "volume over R quadruples when R doubles");
});

test("the worked example is recomputed independently", () => {
  assert.equal(EX_SLANT, 15);
  assert.equal(EX_DEG, 288);
  const ex = coneFromSector(EX_SLANT, EX_DEG);

  // 288/360 = 4/5, and gcd(288, 360) = 72 with 288/72 = 4 and 360/72 = 5.
  assert.equal(288 / 72, 4);
  assert.equal(360 / 72, 5);
  assert.equal(ex.fraction, "4/5");
  // Circumference 2 pi (15) = 30 pi.
  near(ex.circumference, 30 * Math.PI, 1e-12, "paper circumference");
  // Arc = (4/5)(30 pi) = 24 pi = 75.398..., printed as 75.40.
  assert.equal((4 * 30) / 5, 24);
  near(ex.arc, 24 * Math.PI, 1e-12, "arc of the wedge");
  assert.equal(fmt(ex.arc), "75.40");
  assert.equal(rel(ex.arc), "≈");
  // 2 pi r = 24 pi gives r = 12 exactly; also 15 x 288/360 = 4320/360 = 12.
  assert.equal(24 / 2, 12);
  assert.equal((15 * 288) / 360, 12);
  assert.equal(ex.baseRadius, 12);
  assert.equal(fmt(ex.baseRadius), "12");
  assert.equal(rel(ex.baseRadius), "=");
  // Cross-section triangle: 15^2 - 12^2 = 225 - 144 = 81 and sqrt(81) = 9.
  assert.equal(15 * 15, 225);
  assert.equal(12 * 12, 144);
  assert.equal(225 - 144, 81);
  assert.equal(ex.height, 9);
  assert.equal(12 * 12 + 9 * 9, 15 * 15);
  // Volume = (1/3) pi (144)(9) = 432 pi = 1357.168..., cylinder = 1296 pi = 4071.504...
  assert.equal((144 * 9) / 3, 432);
  assert.equal((ex.baseRadius * ex.baseRadius * ex.height) / 3, 432);
  assert.equal(ex.baseRadius * ex.baseRadius * ex.height, 1296);
  near(ex.volume, 432 * Math.PI, 1e-9, "cone volume");
  near(ex.cylinderVolume, 1296 * Math.PI, 1e-9, "cylinder volume");
  assert.equal(fmt(ex.volume), "1357.17");
  assert.equal(fmt(ex.cylinderVolume), "4071.50");
  near(ex.cylinderVolume, 3 * ex.volume, 1e-9, "the cylinder holds three cones");
  // Lateral surface = the flat wedge: pi (12)(15) = 180 pi, and pi (15^2)(4/5) = 180 pi.
  near(ex.sectorArea, 180 * Math.PI, 1e-9, "wedge area");
  near(ex.lateralArea, 180 * Math.PI, 1e-9, "lateral surface");
});

test("the Try it answer is the base radius the rolled wedge really has", () => {
  assert.equal(TRY_SLANT, 9);
  assert.equal(TRY_DEG, 120);
  // 120/360 = 1/3, so r = 9/3 = 3 and the arc is 2 pi (9)/3 = 6 pi = 18.849..., printed 18.85.
  assert.equal((9 * 120) / 360, 3);
  const arc = 6 * Math.PI;
  assert.equal(arc.toFixed(2), "18.85");
  // 2 pi (3) = 6 pi confirms the correct choice closes the rim.
  near(2 * Math.PI * 3, arc, 1e-12, "the base circle of radius 3 has the arc as its circumference");
  // The thrown-away 240 degree piece would roll to r = 9 x 240/360 = 6.
  assert.equal((9 * 240) / 360, 6);

  const choices = tryChoices();
  assert.equal(choices.length, 4);
  assert.equal(new Set(choices.map((choice) => choice.text)).size, 4, "the four options are distinct");
  assert.equal(choices.filter((choice) => choice.why === "correct").length, 1);
  assert.equal(tryAnswerIndex(), 2);
  assert.equal(choices[2].text, "3 cm");
  assert.equal(choices[2].why, "correct");
  assert.equal(choices[0].text, "9 cm");
  assert.equal(choices[1].text, "18.85 cm");
  assert.equal(choices[3].text, "6 cm");
  // None of the distractors is the true base radius.
  for (const wrong of [9, 18.85, 6]) assert.notEqual(wrong, 3);
});

test("lesson source cites only brief standards and keeps its markup contract", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = [...source.matchAll(/\b(?:(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of ["G-C.1", "G-C.5", "G-GMD.1", "G-GMD.3", "G-GMD.4"]) {
    assert.ok(cited.includes(must), `${must} must be cited`);
  }

  const svgTags = source.split("<svg").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(svgTags.length, 2);
  for (const tag of svgTags) {
    assert.ok(tag.includes("viewBox"), "every <svg> needs a viewBox");
    assert.ok(tag.includes('role="img"') && tag.includes("aria-label"), "every <svg> needs role=img and an aria-label");
  }

  const buttonTags = source.split("<button").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  // Next step, Start over, the mapped Try-it choice, and the stepper's decrease/increase pair.
  assert.equal(buttonTags.length, 5);
  for (const tag of buttonTags) assert.ok(tag.includes('type="button"'), "every <button> needs type=button");

  // The declared inline control bounds are the ones the grid above enumerated.
  assert.match(source, /label="Paper radius \(cm\)" value=\{slant\} min=\{3\} max=\{9\} step=\{1\}/u);
  assert.match(source, /label="Cut angle \(degrees\)" value=\{deg\} min=\{60\} max=\{300\} step=\{30\}/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{picked === i\}/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  // The plane through the apex meets the cone in an isosceles triangle; the 12-9-15 right
  // triangle is half of it. Both the worked example and the Math check must say so (G-GMD.4).
  assert.ok((source.match(/isosceles triangle/gu) ?? []).length >= 2, "the apex cross-section is isosceles, not a right triangle");
  assert.doesNotMatch(source, /slice through the tip is a right triangle/u, "the apex cross-section is not a right triangle");
  // G-C.1 is argued (a dilation carries one circle onto the other), not merely asserted.
  assert.match(source, /dilat/u, "the lesson must argue that all circles are similar");
  // Only lengths are proportional to R; areas go with the square and volumes with the cube.
  assert.doesNotMatch(source, /every other measurement is that radius times a/u, "similarity claim must be scoped to lengths");
  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/u);
});
