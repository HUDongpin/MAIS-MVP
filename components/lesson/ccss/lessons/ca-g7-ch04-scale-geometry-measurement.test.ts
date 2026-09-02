import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CELL,
  DH_MAX,
  DH_MIN,
  DW_MAX,
  DW_MIN,
  D_MAX,
  D_MIN,
  FIELD,
  H,
  K_MAX,
  K_MIN,
  MPP,
  PAD,
  PATIO,
  PIT,
  PW,
  R_MIN,
  R_STEP,
  SIDE,
  SURFACE_Y,
  W,
  clampRadius,
  figureLabel,
  figureStrings,
  maxRadius,
  meters,
  origin,
  patioSentence,
  plan,
  tryAnswerIndex,
  tryChoices,
  tryFeedback,
  units,
  workedExample,
} from "./ca-g7-ch04-scale-geometry-measurement";

const SLUG = "ca-g7-ch04-scale-geometry-measurement";
const BRIEF_STANDARDS = ["7.G.A.1", "7.G.A.2", "7.G.A.3", "7.G.B.4", "7.G.B.5", "7.G.B.6"];
/** Only used where pi enters; every other comparison is exact. */
const EPS = 1e-9;

/**
 * "1 units" is wrong and so is "2 unit" — and so is "1 meters". The guard is
 * noun-generic on purpose: it scans every "<number> <word>" pair in a readout
 * and, for any noun in this closed vocabulary, requires the singular form
 * exactly when the number is 1. A guard that only knew the word "unit" walked
 * straight past "1 meters deep" in the aria-label.
 */
const COUNTED_NOUNS = [
  "unit", "meter", "metre", "square", "wall", "side", "degree", "row", "column",
  "layer", "face", "edge", "point", "circle", "rectangle",
];
const PLURAL_TO_SINGULAR = new Map(COUNTED_NOUNS.map((word) => [`${word}s`, word]));

function assertPlurals(strings: string[], where: string) {
  for (const s of strings) {
    // An optional "sq"/"square" qualifier is skipped so "25 sq units" is read as 25 units.
    for (const m of s.matchAll(/(\d+(?:\.\d+)?) (?:sq |square )?([a-z]+)\b/gu)) {
      const n = Number(m[1]);
      const word = m[2];
      if (COUNTED_NOUNS.includes(word)) {
        assert.equal(n, 1, `${where}: "${s}" reads "${m[0]}", but the singular "${word}" only agrees with 1`);
      } else if (PLURAL_TO_SINGULAR.has(word)) {
        assert.notEqual(n, 1, `${where}: "${s}" reads "${m[0]}", but the plural "${word}" never agrees with 1`);
      }
    }
  }
}

test("the plural guard itself rejects disagreement, in either direction", () => {
  // If these did not throw, every plural assertion below would be vacuous.
  assert.throws(() => assertPlurals(["and the cross-section shows it 1 meters deep"], "self-check"));
  assert.throws(() => assertPlurals(["a fountain of radius 2 unit"], "self-check"));
  assert.throws(() => assertPlurals(["1 squares"], "self-check"));
  assert.throws(() => assertPlurals(["floor + 1 walls"], "self-check"));
  assert.doesNotThrow(() =>
    assertPlurals(
      ["shows it 1 meter deep", "1 unit = 3 m", "0.5 units", "4.5 meters", "25 sq units", "floor + 4 walls"],
      "self-check"
    )
  );
  assert.equal(units(1), "1 unit");
  assert.equal(units(2), "2 units");
  assert.equal(units(0.5), "0.5 units");
  assert.equal(meters(1), "1 meter");
  assert.equal(meters(2), "2 meters");
  assert.equal(meters(1.5), "1.5 meters");
});

test("every reachable (width, height, radius, depth, scale) state keeps the figure true and inside the viewBox", () => {
  assert.equal(CELL, 30);
  assert.equal(PAD, 30);
  assert.equal(PW, 300);
  assert.equal(SIDE, 120);
  assert.equal(W, 420);
  assert.equal(H, 240);
  assert.equal(MPP, 14);
  assert.equal(SURFACE_Y, 100);
  assert.deepEqual(
    [DW_MIN, DW_MAX, DH_MIN, DH_MAX, K_MIN, K_MAX, R_MIN, R_STEP, D_MIN, D_MAX],
    [2, 8, 3, 6, 2, 6, 0.5, 0.5, 1, 3]
  );

  let states = 0;
  let triples = 0;
  for (let dw = DW_MIN; dw <= DW_MAX; dw += 1) {
    for (let dh = DH_MIN; dh <= DH_MAX; dh += 1) {
      // Derived here from the drawing constraint, not from maxRadius: the largest
      // half-unit radius whose circle still fits the dw-unit width AND the dh - 1
      // rows left above the pool. Found by trying every candidate radius.
      let widest = 0;
      for (let candidate = R_STEP; candidate <= DW_MAX; candidate += R_STEP) {
        if (2 * candidate <= dw && 2 * candidate <= dh - 1) widest = candidate;
      }
      const rMax = maxRadius(dw, dh);
      assert.equal(rMax, widest, `largest fitting fountain for dw=${dw}, dh=${dh}`);
      // The control must never collapse to a single position: the smallest plan
      // (2 by 3) still offers 0.5 and 1.0, and the roomiest offers five sizes.
      const positions = Math.round((rMax - R_MIN) / R_STEP) + 1;
      assert.ok(positions >= 2, `the fountain stepper is inert at dw=${dw}, dh=${dh}`);
      assert.ok(positions <= 5);
      // A radius left over from a bigger plan is snapped to the half grid and
      // pulled back into range, never past it.
      for (let raw = 0; raw <= 4.5; raw += 0.25) {
        const c = clampRadius(raw, dw, dh);
        assert.ok(c >= R_MIN && c <= rMax);
        assert.equal(c, Math.min(Math.max(0.5, Math.round(raw * 2) / 2), rMax), `clamp of ${raw}`);
        assert.equal(c * 2, Math.round(c * 2), "a clamped radius is always a whole number of half units");
      }

      for (let r = R_MIN; r <= rMax + EPS; r += R_STEP) {
        triples += 1;
        for (let depth = D_MIN; depth <= D_MAX; depth += 1) {
          for (let k = K_MIN; k <= K_MAX; k += 1) {
            states += 1;

            // ---- geometry: everything drawn stays inside its panel -------------
            const { ox, oy } = origin(dw, dh);
            assert.ok(ox >= PAD && ox + dw * CELL <= PW - PAD, `plan x-extent for dw=${dw}`);
            assert.ok(oy >= PAD && oy + dh * CELL <= H - PAD, `plan y-extent for dh=${dh}`);
            assert.equal(ox, PW - (ox + dw * CELL));
            assert.equal(oy, H - (oy + dh * CELL));
            // Labels above (y = oy - 9) and left (x = ox - 11) of the plan stay inside the viewBox.
            assert.ok(oy - 9 - 11 >= 0 && ox - 11 - 11 >= 0);
            // The pool occupies the bottom row, inset half a unit at each end.
            const poolTop = oy + (dh - 1) * CELL;
            assert.ok(ox + CELL / 2 >= ox && ox + CELL / 2 + (dw - 1) * CELL <= ox + dw * CELL);
            assert.ok(poolTop + CELL === oy + dh * CELL && poolTop + CELL <= H - PAD);
            // The fountain circle is centered in the rows above the pool and never crosses either.
            const cx = ox + (dw * CELL) / 2;
            const cy = oy + ((dh - 1) * CELL) / 2;
            assert.ok(cx - r * CELL >= ox && cx + r * CELL <= ox + dw * CELL, `fountain x for dw=${dw}, r=${r}`);
            assert.ok(cy - r * CELL >= oy && cy + r * CELL <= poolTop, `fountain y for dh=${dh}, r=${r}`);
            assert.ok(2 * r <= Math.min(dw, dh - 1));
            // The cross-section of the pool sits inside the side panel at every depth and scale.
            const sideX = PW + (SIDE - k * MPP) / 2;
            assert.ok(sideX >= PW && sideX + k * MPP <= W, `cross-section x for k=${k}`);
            assert.ok(SURFACE_Y + depth * MPP + 13 <= H - PAD, `cross-section depth label for depth=${depth}`);
            assert.ok(SURFACE_Y - 24 >= 0);

            // ---- the numbers, recomputed here from scratch ----------------------
            const aw = dw * k;
            const ah = dh * k;
            const parkArea = aw * ah;
            const radius = r * k;
            const fountainArea = Math.PI * radius * radius;
            const poolLong = (dw - 1) * k;
            const poolShort = k;
            const poolFloor = poolLong * poolShort;
            const poolVolume = poolFloor * depth;
            // Five faces, listed one at a time: the floor, two long walls, two short walls.
            const poolWalls = poolLong * depth + poolLong * depth + poolShort * depth + poolShort * depth;
            const poolSurface = poolFloor + poolWalls;
            const lawnArea = parkArea - poolFloor - fountainArea;

            const p = plan(dw, dh, r, k, depth);
            assert.equal(p.aw, aw);
            assert.equal(p.ah, ah);
            assert.equal(p.drawArea, dw * dh);
            assert.equal(p.parkArea, parkArea);
            // Lengths scale once, area twice: the same park area by a second route.
            assert.equal(parkArea, dw * dh * k * k);
            assert.equal(p.areaFactor, k * k);
            assert.equal(p.radius, radius);
            assert.ok(Math.abs(p.circumference - 2 * Math.PI * radius) < EPS);
            assert.ok(Math.abs(p.circumference / (2 * radius) - Math.PI) < EPS, "C / d is pi for every circle");
            assert.ok(Math.abs(p.fountainArea - fountainArea) < EPS);
            // The pool is a right prism: base area times depth, plus a floor and four walls.
            assert.equal(p.poolLong, poolLong);
            assert.equal(p.poolShort, poolShort);
            assert.equal(p.poolFloor, poolFloor);
            assert.equal(p.poolVolume, poolVolume);
            assert.equal(p.poolVolume, poolFloor * depth);
            assert.equal(p.poolWalls, poolWalls);
            assert.equal(p.poolSurface, poolSurface);
            assert.equal(p.poolSurface, poolFloor + 2 * (poolLong + poolShort) * depth);
            assert.ok(Number.isInteger(poolVolume) && Number.isInteger(poolSurface));
            // The panel captioned "cross-section" is drawn the pool's SHORT way across,
            // which is what makes that caption honest rather than a side view.
            assert.equal(p.poolShort, k);
            assert.ok(p.poolShort <= p.poolLong);
            // The lawn is the composite remainder and is never used up.
            assert.ok(Math.abs(p.lawnArea - lawnArea) < EPS);
            assert.ok(p.lawnArea > 0, `lawn left for dw=${dw}, dh=${dh}, r=${r}`);
            assert.ok(poolFloor + fountainArea < parkArea);

            // ---- the strings a student actually reads ---------------------------
            const unitWord = (n: number) => (n === 1 ? `${n} unit` : `${n} units`);
            const meterWord = (n: number) => (n === 1 ? `${n} meter` : `${n} meters`);
            const s = figureStrings(dw, dh, r, k, depth);
            assert.equal(s.scaleChip, `Scale: 1 unit = ${k} m`);
            assert.equal(s.factorChip, `Lengths ×${k}, areas ×${k}² = ×${k * k}`);
            assert.equal(s.widthLabel, `${unitWord(dw)} = ${aw} m`);
            assert.equal(s.heightLabel, `${unitWord(dh)} = ${ah} m`);
            assert.equal(s.radiusLabel, `r = ${unitWord(r)} = ${radius} m`);
            assert.equal(s.sideTitle, "pool, cross-section");
            assert.equal(s.sideWidth, `${poolShort} m across`);
            assert.equal(s.sideDepth, `${depth} m deep`);
            assert.deepEqual(s.park, [
              `${aw} × ${ah} m`,
              `area ${parkArea} m²`,
              `${dw * dh} sq units × ${k * k} = ${parkArea}`,
            ]);
            assert.deepEqual(s.fountain, [
              `radius ${radius} m`,
              `${unitWord(r)} × ${k} = ${radius} m`,
              `C = 2π(${radius}) ≈ ${(2 * Math.PI * radius).toFixed(2)} m`,
              `A = π(${radius})² ≈ ${(Math.PI * radius * radius).toFixed(2)} m²`,
            ]);
            assert.deepEqual(s.pool, [
              `${poolLong} × ${poolShort} × ${depth} m`,
              `floor ${poolLong} × ${poolShort} = ${poolFloor} m²`,
              `V = ${poolFloor} × ${depth} = ${poolVolume} m³`,
              `floor + 4 walls = ${poolFloor} + ${poolWalls} = ${poolSurface} m²`,
            ]);
            assert.deepEqual(s.lawn, [
              `≈ ${lawnArea.toFixed(2)} m²`,
              "park − pool floor − fountain",
              `${parkArea} − ${poolFloor} − ${fountainArea.toFixed(2)}`,
            ]);
            // The subtraction the student can do by eye must agree with the rounded answer printed above it.
            assert.equal(
              (parkArea - poolFloor - Number(fountainArea.toFixed(2))).toFixed(2),
              lawnArea.toFixed(2),
              `rounded lawn arithmetic for dw=${dw}, dh=${dh}, r=${r}, k=${k}`
            );

            const label = figureLabel(dw, dh, r, k, depth);
            const flat = [
              label,
              s.scaleChip, s.factorChip, s.widthLabel, s.heightLabel, s.radiusLabel, s.sideTitle, s.sideWidth, s.sideDepth,
              ...s.park, ...s.fountain, ...s.pool, ...s.lawn,
            ];
            assertPlurals(flat, `dw=${dw}, dh=${dh}, r=${r}, k=${k}, depth=${depth}`);
            assert.ok(label.includes(`${dw} by ${unitWord(dh)}`));
            assert.ok(label.includes(`radius ${unitWord(r)} sits`));
            assert.ok(label.includes(`1 unit = ${meterWord(k)}`));
            assert.ok(label.includes(`${aw} by ${meterWord(ah)}`));
            assert.ok(label.includes(`real radius is ${meterWord(radius)}`));
            assert.ok(label.includes(`pool is ${poolLong} by ${meterWord(poolShort)}`));
            assert.ok(label.includes(`shows it ${meterWord(depth)} deep`));
            // The blind reader is told which way the cut runs, not just that a panel exists.
            assert.ok(label.includes("cross-section beside the plan cuts straight across the pool"));
            assert.doesNotMatch(label, /side view/u);
          }
        }
      }
    }
  }
  // 88 (width, height, radius) triples, each with 3 depths and 5 scales.
  assert.equal(triples, 88);
  assert.equal(states, 88 * 3 * 5);
  assert.equal(states, 1320);
});

test("worked example values are recomputed independently", () => {
  assert.deepEqual(FIELD, { realW: 90, realH: 60, scale: 6, circleR: 9 });
  assert.deepEqual(PIT, { long: 8, short: 3, depth: 0.5 });
  const ex = workedExample();
  // 90 / 6 = 15 cm, 60 / 6 = 10 cm.
  assert.equal(ex.drawW, 15);
  assert.equal(ex.drawH, 10);
  // 15 * 10 = 150 cm^2 of paper; 90 * 60 = 5400 m^2 of ground.
  assert.equal(ex.drawArea, 150);
  assert.equal(ex.realArea, 5400);
  // 1 cm stands for 6 m, so 1 cm^2 stands for 6 * 6 = 36 m^2 -- a rate, not a bare ratio.
  assert.equal(ex.areaPerSquare, 36);
  assert.equal(ex.areaPerSquare, 6 * 6);
  // The claim step 3 makes: 150 cm^2 at 36 m^2 per cm^2 really is the field's 5400 m^2.
  assert.equal(150 * 36, 5400);
  assert.equal(ex.drawArea * ex.areaPerSquare, ex.realArea);
  // 9 / 6 = 1.5 cm exactly.
  assert.equal(ex.drawR, 1.5);
  // C = 18 pi = 56.548..., A = 81 pi = 254.469...
  assert.ok(Math.abs(ex.circumference - 18 * Math.PI) < EPS);
  assert.ok(Math.abs(ex.circleArea - 81 * Math.PI) < EPS);
  assert.equal(ex.circumference.toFixed(2), "56.55");
  assert.equal(ex.circleArea.toFixed(2), "254.47");
  // The pit is a right prism: 8 * 3 = 24 m^2 of floor, 24 * 0.5 = 12 m^3 of sand.
  assert.equal(ex.pitFloor, 24);
  assert.equal(ex.pitVolume, 12);
  // Four walls: two 8 m by 0.5 m and two 3 m by 0.5 m = 4 + 4 + 1.5 + 1.5 = 11 m^2.
  assert.equal(ex.pitWalls, 4 + 4 + 1.5 + 1.5);
  assert.equal(ex.pitWalls, 11);
  assert.equal(ex.pitSurface, 35);
  assert.equal(ex.pitSurface, 24 + 11);
});

test("the Try it answer is the choice equal to (side x scale) squared, and every rationale keeps its own units", () => {
  assert.deepEqual(PATIO, { side: 2, scale: 3 });
  const values = tryChoices().map((c) => c.value);
  // 2*2 = 4, 2*2*3 = 12, (2*3)*(2*3) = 36, 4*(2*3) = 24.
  assert.deepEqual(values, [4, 12, 36, 24]);
  assert.equal(new Set(values).size, 4, "choices are distinct");
  assert.equal(tryAnswerIndex(), 2);
  assert.equal(values[tryAnswerIndex()], 6 * 6);
  assert.equal(tryChoices()[tryAnswerIndex()].why, "correct");
  assert.equal(tryChoices().filter((c) => c.why === "correct").length, 1);

  const patio = "Each side scales: 2 × 3 = 6 m, so the real patio is 6 m by 6 m and its area is 6 × 6 = 36 m².";
  assert.equal(patioSentence(), patio);
  // The four sentences a student can actually reach, in full.
  assert.equal(tryFeedback(0), `Not quite. That is the drawing's own area, 4 square units, never scaled up to the ground. ${patio}`);
  assert.equal(tryFeedback(1), `Not quite. That is the drawing's area scaled only once, 4 × 3 — but both sides scale, so area scales twice. ${patio}`);
  assert.equal(tryFeedback(2), `Right. ${patio}`);
  assert.equal(tryFeedback(3), `Not quite. That is the real patio's perimeter, 4 × 6 = 24 m, which is a length and not an area. ${patio}`);
  // The perimeter is 24 m and the drawing's area is 4 square units: neither may be called square meters.
  assert.equal(4 * (PATIO.side * PATIO.scale), 24);
  assert.doesNotMatch(tryFeedback(3), /24 m²/u);
  assert.doesNotMatch(tryFeedback(0), /4 m²/u);
  for (let i = 0; i < 4; i += 1) assert.ok(tryFeedback(i).endsWith(patio));
  assertPlurals([patioSentence(), ...[0, 1, 2, 3].map(tryFeedback)], "Try it");
});

test("lesson source cites only brief standards and keeps its markup contract", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  const cited = [...source.matchAll(/\b(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of ["7.G.A.1", "7.G.B.4", "7.G.B.6"]) assert.ok(cited.includes(must));
  // 7.G.B.6 is only honest if the lesson really computes a volume and a surface area.
  assert.match(source, /poolVolume/u);
  assert.match(source, /poolSurface/u);
  assert.match(source, /right prism/u);

  // The Math check prints the very quantities the 1320-state loop above proved, in the same arithmetic.
  const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));
  for (const fragment of [
    "real length = drawing length × the scale",
    "{p.drawArea} sq units × {p.areaFactor} m² per sq unit = {p.parkArea} m² (7.G.A.1)",
    "C = 2πr ≈ {p.circumference.toFixed(2)} m",
    "A = πr² ≈ {p.fountainArea.toFixed(2)} m²",
    "{p.poolLong} × {p.poolShort} = {p.poolFloor} m²",
    "{p.poolFloor} × {depth} = {p.poolVolume} m³",
    "{p.poolFloor} + 2({p.poolLong} × {depth}) + 2({p.poolShort} × {depth}) = {p.poolSurface} m²",
    "{p.parkArea} − {p.poolFloor} − {p.fountainArea.toFixed(2)} ≈ {p.lawnArea.toFixed(2)} m² (7.G.B.6)",
  ]) {
    assert.ok(mathCheck.includes(fragment), `the Math check must print: ${fragment}`);
  }
  // "scale factor" is reserved for a unitless ratio, so the opener must not call the meters-per-unit scale one.
  assert.doesNotMatch(source, /scale factor/u);
  // The right panel draws the pool's short way across, so it must never be called a side view.
  assert.doesNotMatch(source, /side view/u);
  assert.match(source, /width=\{p\.poolShort \* MPP\}/u);

  const svgTags = source.split("<svg").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(svgTags.length, 1);
  for (const tag of svgTags) {
    assert.ok(tag.includes("viewBox"), "every <svg> needs a viewBox");
    assert.ok(tag.includes('role="img"') && tag.includes("aria-label"), "every <svg> needs role=img and an aria-label");
  }
  const buttonTags = source.split("<button").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  // Next step, Start over, the mapped Try-it choice, and the stepper's decrease/increase pair.
  assert.equal(buttonTags.length, 5);
  for (const tag of buttonTags) assert.ok(tag.includes('type="button"'), "every <button> needs type=button");

  // Declared inline control bounds match the constants the grid above enumerated.
  assert.match(source, /label="Plan width" value=\{dw\} min=\{2\} max=\{8\}/u);
  assert.match(source, /label="Plan height" value=\{dh\} min=\{3\} max=\{6\}/u);
  assert.match(source, /label="Fountain radius" value=\{r\} min=\{0\.5\} max=\{rMax\} step=\{0\.5\}/u);
  assert.match(source, /label="Pool depth \(m\)" value=\{depth\} min=\{1\} max=\{3\}/u);
  assert.match(source, /label="Scale \(m per unit\)" value=\{k\} min=\{2\} max=\{6\}/u);
  // Every string the assertions above checked has to be the string the JSX renders.
  assert.match(source, /const s = figureStrings\(dw, dh, r, k, depth\)/u);
  assert.match(source, /aria-label=\{figureLabel\(dw, dh, r, k, depth\)\}/u);
  for (const card of ["park", "fountain", "pool", "lawn"]) {
    assert.ok(source.includes(`lines={s.${card}}`), `the ${card} card must render s.${card}`);
  }
  for (const key of ["scaleChip", "factorChip", "radiusLabel", "widthLabel", "heightLabel", "sideTitle", "sideWidth", "sideDepth"]) {
    assert.ok(source.includes(`{s.${key}}`), `the figure must render s.${key}`);
  }
  assert.match(source, /\{tryFeedback\(picked\)\}/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{picked === i\}/u);
  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/u);
});
