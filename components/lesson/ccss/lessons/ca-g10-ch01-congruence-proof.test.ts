import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CELL,
  EX_ABC,
  EX_DEF,
  EX_MOTION,
  GLYPH,
  LEG_MAX,
  LEG_MIN,
  MOTIONS,
  PAD,
  R,
  SIZE,
  START,
  TRY_CANDIDATES,
  TRY_IMG,
  TRY_PRE,
  dist2,
  figureLabel,
  firstMismatch,
  layout,
  lengthText,
  mapTri,
  num,
  orientationSign,
  point,
  polygonPoints,
  sameTri,
  sides,
  signedArea2,
  sx,
  sy,
  triangle,
  tryAnswerIndex,
  type Motion,
  type Pt,
  type Tri,
} from "./ca-g10-ch01-congruence-proof";

const SLUG = "ca-g10-ch01-congruence-proof";
const BRIEF_STANDARDS = [
  "G-CO.1", "G-CO.2", "G-CO.3", "G-CO.4", "G-CO.5", "G-CO.6", "G-CO.7",
  "G-CO.8", "G-CO.9", "G-CO.10", "G-CO.11", "G-CO.12", "G-CO.13",
];

/**
 * The student sees the rule as text; these are independent implementations of
 * those printed rules, keyed by the exact string the lesson displays. Every
 * check below drives the lesson's own `apply` against the rule it advertises.
 */
const PRINTED_RULES: Record<string, (p: Pt) => Pt> = {
  "(x, y) → (x + 6, y + 6)": (p) => ({ x: p.x + 6, y: p.y + 6 }),
  "(x, y) → (−y, x)": (p) => ({ x: -p.y, y: p.x }),
  "(x, y) → (−x, −y)": (p) => ({ x: -p.x, y: -p.y }),
  "(x, y) → (−x, y)": (p) => ({ x: -p.x, y: p.y }),
  "(x, y) → (x − 4, y)": (p) => ({ x: p.x - 4, y: p.y }),
  "(x, y) → (x, −y)": (p) => ({ x: p.x, y: -p.y }),
};

const LATTICE: Pt[] = [];
for (let x = -6; x <= 6; x += 1) for (let y = -6; y <= 6; y += 1) LATTICE.push({ x, y });

/** Independent squared distance, written out rather than imported. */
function gap2(p: Pt, q: Pt): number {
  const dx = q.x - p.x, dy = q.y - p.y;
  return dx * dx + dy * dy;
}

function parsePoints(pointsAttribute: string): { x: number; y: number }[] {
  return pointsAttribute.split(" ").map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    assert.ok(Number.isFinite(x) && Number.isFinite(y), `"${pair}" is not a coordinate pair`);
    return { x, y };
  });
}

test("every advertised rule is the map the lesson actually applies, and every one of them is rigid", () => {
  assert.equal(MOTIONS.length, 4);
  assert.deepEqual(MOTIONS.map((m) => m.id), ["translate", "rotate90", "rotate180", "reflect"]);
  for (const m of [...MOTIONS, ...TRY_CANDIDATES]) {
    const printed = PRINTED_RULES[m.rule];
    assert.ok(printed, `the printed rule "${m.rule}" has no independent implementation`);
    for (const p of LATTICE) assert.deepEqual(m.apply(p), printed(p), `${m.id} disagrees with its printed rule at ${point(p)}`);
    // A rigid motion preserves every distance: check all pairs of a 5 x 5 block of lattice points.
    const block = LATTICE.filter((p) => Math.abs(p.x) <= 2 && Math.abs(p.y) <= 2);
    assert.equal(block.length, 25);
    for (const p of block) {
      for (const q of block) assert.equal(gap2(m.apply(p), m.apply(q)), gap2(p, q), `${m.id} changed a distance`);
    }
  }
  // Direct motions keep the sense of a traversal; the reflection reverses it.
  assert.deepEqual(MOTIONS.map(orientationSign), [1, 1, 1, -1]);
  assert.equal(lengthText(25), "5");
  assert.equal(lengthText(16), "4");
  assert.equal(lengthText(13), "√13");
  assert.equal(num(-5), "−5");
  assert.equal(num(0), "0");
  assert.equal(point({ x: -5, y: 3 }), "(−5, 3)");
});

test("every reachable state keeps both triangles congruent, inside the grid and inside the viewBox", () => {
  assert.equal(R, 6);
  assert.equal(CELL, 22);
  assert.equal(PAD, 22);
  assert.equal(SIZE, 308);
  assert.deepEqual(START, { x: -5, y: -5 });
  assert.deepEqual([LEG_MIN, LEG_MAX], [2, 5]);
  assert.equal(sx(-R), PAD);
  assert.equal(sx(R), SIZE - PAD);
  assert.equal(sy(R), PAD);
  assert.equal(sy(-R), SIZE - PAD);

  let states = 0;
  for (let motionIdx = 0; motionIdx < MOTIONS.length; motionIdx += 1) {
    for (let legX = LEG_MIN; legX <= LEG_MAX; legX += 1) {
      for (let legY = LEG_MIN; legY <= LEG_MAX; legY += 1) {
        states += 1;
        const m = MOTIONS[motionIdx];
        const where = `${m.id} with legs ${legX} and ${legY}`;

        // The preimage, written out independently from START = (−5, −5).
        const a: Pt = { x: -5, y: -5 }, b: Pt = { x: -5 + legX, y: -5 }, c: Pt = { x: -5 + legX, y: -5 + legY };
        const pre = triangle(legX, legY);
        assert.deepEqual(pre, { a, b, c }, where);

        // The image, from the printed rule rather than from the lesson's own map.
        const rule = PRINTED_RULES[m.rule];
        const img: Tri = { a: rule(a), b: rule(b), c: rule(c) };
        const L = layout(motionIdx, legX, legY);
        assert.deepEqual(L.img, img, where);
        assert.deepEqual(L.pre, pre, where);

        // Nothing leaves the drawn grid.
        for (const [name, p] of Object.entries({ A: a, B: b, C: c, "A'": img.a, "B'": img.b, "C'": img.c })) {
          assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y), `${name} is a lattice point (${where})`);
          assert.ok(p.x >= -R && p.x <= R, `${name} x inside the grid (${where})`);
          assert.ok(p.y >= -R && p.y <= R, `${name} y inside the grid (${where})`);
        }

        // Corresponding sides: legX, legY, and the hypotenuse, equal in both triangles.
        assert.equal(L.sPre.ab, legX * legX, where);
        assert.equal(L.sPre.bc, legY * legY, where);
        assert.equal(L.sPre.ca, legX * legX + legY * legY, where);
        assert.deepEqual(L.sImg, L.sPre, `${where}: the motion changed a side length`);
        assert.equal(gap2(img.a, img.b), legX * legX, where);
        assert.equal(gap2(img.b, img.c), legY * legY, where);
        assert.equal(gap2(img.c, img.a), legX * legX + legY * legY, where);
        assert.equal(sides(img).ca, dist2(img.c, img.a), where);

        // The card prints exact lengths: an integer only for a perfect square.
        for (const d2 of [L.sPre.ab, L.sPre.bc, L.sPre.ca]) {
          const root = Math.sqrt(d2);
          assert.equal(lengthText(d2), Number.isInteger(root) ? String(root) : `√${d2}`, where);
        }

        // Right angle at B, and still a right angle at B'.
        // Math.abs keeps a −0 dot product (a rotation can produce one) comparable to 0.
        assert.equal(Math.abs((a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y)), 0, where);
        assert.equal(Math.abs((img.a.x - img.b.x) * (img.c.x - img.b.x) + (img.a.y - img.b.y) * (img.c.y - img.b.y)), 0, where);
        // Pythagoras confirms the same right angle from the three side lengths.
        assert.equal(L.sPre.ab + L.sPre.bc, L.sPre.ca, where);

        // Area is preserved; only the reflection reverses the sense of A -> B -> C.
        assert.equal(signedArea2(pre), legX * legY, where);
        assert.equal(signedArea2(img), orientationSign(m) * legX * legY, where);
        assert.equal(Math.abs(signedArea2(img)), Math.abs(signedArea2(pre)), where);

        // Pixels: every drawn point stays inside the padded viewBox.
        assert.equal(L.dots.length, 6);
        for (const d of L.dots) {
          assert.ok(d.x >= PAD && d.x <= SIZE - PAD, `dot x ${d.x} (${where})`);
          assert.ok(d.y >= PAD && d.y <= SIZE - PAD, `dot y ${d.y} (${where})`);
        }
        assert.equal(L.connectors.length, 3);
        for (const k of ["a", "b", "c"] as const) {
          const i = { a: 0, b: 1, c: 2 }[k];
          assert.equal(L.connectors[i].x1, sx(pre[k].x), where);
          assert.equal(L.connectors[i].y1, sy(pre[k].y), where);
          assert.equal(L.connectors[i].x2, sx(img[k].x), where);
          assert.equal(L.connectors[i].y2, sy(img[k].y), where);
        }
        for (const [name, attribute] of [["preimage", L.prePoints], ["image", L.imgPoints]] as const) {
          const drawn = parsePoints(attribute);
          assert.equal(drawn.length, 3, `${name} polygon (${where})`);
          for (const p of drawn) {
            assert.ok(p.x >= PAD && p.x <= SIZE - PAD, `${name} polygon x (${where})`);
            assert.ok(p.y >= PAD && p.y <= SIZE - PAD, `${name} polygon y (${where})`);
          }
        }
        assert.equal(L.prePoints, polygonPoints(pre), where);
        assert.equal(L.imgPoints, polygonPoints(img), where);

        // The right-angle squares: two perpendicular arms of equal length, inside the viewBox.
        for (const [name, attribute] of [["preimage", L.preMark], ["image", L.imgMark]] as const) {
          const mark = parsePoints(attribute);
          assert.equal(mark.length, 3, `${name} mark (${where})`);
          for (const p of mark) {
            assert.ok(p.x >= PAD && p.x <= SIZE - PAD, `${name} mark x (${where})`);
            assert.ok(p.y >= PAD && p.y <= SIZE - PAD, `${name} mark y (${where})`);
          }
          const armA = { x: mark[1].x - mark[0].x, y: mark[1].y - mark[0].y };
          const armB = { x: mark[1].x - mark[2].x, y: mark[1].y - mark[2].y };
          assert.ok(Math.abs(Math.hypot(armA.x, armA.y) - 9) < 1e-9, `${name} mark arm length (${where})`);
          assert.ok(Math.abs(Math.hypot(armB.x, armB.y) - 9) < 1e-9, `${name} mark arm length (${where})`);
          assert.ok(Math.abs(armA.x * armB.x + armA.y * armB.y) < 1e-9, `${name} mark corner is square (${where})`);
        }

        // Labels stay inside the viewBox at their estimated width.
        assert.equal(L.labels.length, 6);
        assert.deepEqual(L.labels.map((lb) => lb.text), ["A", "B", "C", "A′", "B′", "C′"]);
        for (const lb of L.labels) {
          const width = lb.text.length * GLYPH;
          const left = lb.anchor === "start" ? lb.x : lb.anchor === "end" ? lb.x - width : lb.x - width / 2;
          assert.ok(left >= 0, `label "${lb.text}" past the left edge (${where})`);
          assert.ok(left + width <= SIZE, `label "${lb.text}" past the right edge (${where})`);
          assert.ok(lb.y - 11 >= 0 && lb.y <= SIZE, `label "${lb.text}" outside vertically (${where})`);
        }

        // The spoken description repeats only what is true in this state.
        const label = figureLabel(motionIdx, legX, legY);
        assert.ok(label.includes(`A ${point(a)}, B ${point(b)}, C ${point(c)}`), where);
        assert.ok(label.includes(`The rule ${m.rule} sends it`), where);
        assert.ok(label.includes(`${point(img.a)}, ${point(img.b)}, ${point(img.c)}`), where);
        assert.ok(
          label.includes(`side lengths ${lengthText(legX * legX)}, ${lengthText(legY * legY)} and ${lengthText(legX * legX + legY * legY)}`),
          where
        );
      }
    }
  }
  assert.equal(states, 64);
});

test("the worked example is a half turn about the origin, checked vertex by vertex", () => {
  assert.deepEqual(EX_ABC, { a: { x: 1, y: 1 }, b: { x: 5, y: 1 }, c: { x: 5, y: 4 } });
  assert.deepEqual(EX_DEF, { a: { x: -1, y: -1 }, b: { x: -5, y: -1 }, c: { x: -5, y: -4 } });
  assert.equal(EX_MOTION.rule, "(x, y) → (−x, −y)");

  // Step 1: AB runs 4 across and 0 up; BC runs 0 across and 3 up; CA closes the right triangle.
  const s = sides(EX_ABC);
  assert.equal((5 - 1) ** 2 + (1 - 1) ** 2, 16);
  assert.equal((5 - 5) ** 2 + (4 - 1) ** 2, 9);
  assert.equal((1 - 5) ** 2 + (1 - 4) ** 2, 25);
  assert.deepEqual(s, { ab: 16, bc: 9, ca: 25 });
  assert.equal(lengthText(16), "4");
  assert.equal(lengthText(9), "3");
  assert.equal(lengthText(25), "5");
  // 4^2 + 3^2 = 16 + 9 = 25, so the angle at B is right.
  assert.equal(16 + 9, 25);
  assert.equal(Math.abs((1 - 5) * (5 - 5) + (1 - 1) * (4 - 1)), 0);

  // Step 2: DEF measures the same, side for side.
  const t = sides(EX_DEF);
  assert.equal((-5 - -1) ** 2 + (-1 - -1) ** 2, 16);
  assert.equal((-5 - -5) ** 2 + (-4 - -1) ** 2, 9);
  assert.equal((-1 - -5) ** 2 + (-1 - -4) ** 2, 25);
  assert.deepEqual(t, s);

  // Step 3: (x, y) -> (-x, -y) sends A to D, B to E, C to F.
  const image = mapTri(EX_MOTION, EX_ABC);
  assert.deepEqual(image.a, { x: -1, y: -1 });
  assert.deepEqual(image.b, { x: -5, y: -1 });
  assert.deepEqual(image.c, { x: -5, y: -4 });
  assert.ok(sameTri(image, EX_DEF));

  // Step 4/5: the right angle at E matches the one at B, so SAS holds on AB, angle B, BC.
  assert.equal(Math.abs((-1 - -5) * (-5 - -5) + (-1 - -1) * (-4 - -1)), 0);
  assert.equal(t.ab, s.ab);
  assert.equal(t.bc, s.bc);
  assert.equal(lengthText(t.ca), "5");
});

test("the Try it answer is the only rule that carries all three vertices", () => {
  assert.deepEqual(TRY_PRE, { a: { x: 2, y: 1 }, b: { x: 6, y: 1 }, c: { x: 6, y: 3 } });
  assert.deepEqual(TRY_IMG, { a: { x: -2, y: 1 }, b: { x: -6, y: 1 }, c: { x: -6, y: 3 } });
  assert.equal(TRY_CANDIDATES.length, 4);
  assert.equal(new Set(TRY_CANDIDATES.map((c) => c.short)).size, 4, "the four choices read differently");

  // Independently: only (x, y) -> (-x, y) sends (2, 1), (6, 1), (6, 3) to (-2, 1), (-6, 1), (-6, 3).
  const matches = TRY_CANDIDATES.map((candidate) => {
    const rule = PRINTED_RULES[candidate.rule];
    return (["a", "b", "c"] as const).every((k) => {
      const got = rule(TRY_PRE[k]);
      return got.x === TRY_IMG[k].x && got.y === TRY_IMG[k].y;
    });
  });
  assert.deepEqual(matches, [false, true, false, false]);
  const answer = tryAnswerIndex();
  assert.equal(answer, 1);
  assert.equal(TRY_CANDIDATES[answer].rule, "(x, y) → (−x, y)");
  assert.equal(firstMismatch(TRY_CANDIDATES[answer]), null);

  // The three distractors each fail at a named vertex, and the explanation quotes it correctly.
  const expected = [
    { name: "K", from: { x: 6, y: 1 }, to: { x: 2, y: 1 }, want: { x: -6, y: 1 } },
    { name: "J", from: { x: 2, y: 1 }, to: { x: -2, y: -1 }, want: { x: -2, y: 1 } },
    { name: "J", from: { x: 2, y: 1 }, to: { x: 2, y: -1 }, want: { x: -2, y: 1 } },
  ];
  const wrong = [0, 2, 3];
  wrong.forEach((i, k) => {
    const miss = firstMismatch(TRY_CANDIDATES[i]);
    assert.deepEqual(miss, expected[k], `distractor ${TRY_CANDIDATES[i].id}`);
  });
});

test("lesson source cites only brief standards and keeps its markup contract", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = [...source.matchAll(/\b(?:(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of ["G-CO.2", "G-CO.4", "G-CO.5", "G-CO.6", "G-CO.7", "G-CO.8"]) {
    assert.ok(cited.includes(must), `${must} must be cited`);
  }

  const svgTags = source.split("<svg").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(svgTags.length, 1);
  for (const tag of svgTags) {
    assert.ok(tag.includes("viewBox"), "every <svg> needs a viewBox");
    assert.ok(tag.includes('role="img"') && tag.includes("aria-label"), "every <svg> needs role=img and an aria-label");
  }

  // The four motion choices, the four Try-it choices, Next step, Start over, and the stepper pair.
  const buttonTags = source.split("<button").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(buttonTags.length, 6);
  for (const tag of buttonTags) assert.ok(tag.includes('type="button"'), "every <button> needs type=button");

  assert.match(source, /label="Horizontal leg AB" value=\{legX\} min=\{2\} max=\{5\}/u);
  assert.match(source, /label="Vertical leg BC" value=\{legY\} min=\{2\} max=\{5\}/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{idx === i\}/u);
  assert.match(source, /aria-pressed=\{picked === i\}/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/u);
});

test("exported helper types stay usable by name", () => {
  const motion: Motion = MOTIONS[0];
  const tri: Tri = triangle(3, 4);
  const p: Pt = motion.apply(tri.a);
  assert.deepEqual(p, { x: 1, y: 1 });
});
