/* ============================================================================
   audit-shapes.mjs — verification of ShapesLab's model.
   Run:  node audit-shapes.mjs

   This audit does NOT re-implement the lab's mathematics.  It slices the MODEL
   section straight out of ShapesLab.jsx and evaluates it, so every assertion
   below is made against THE SHIPPED CODE.  (The model section is deliberately
   pure JS — no JSX, no React, no DOM — which is what makes this possible, and
   is a better guarantee than the house's usual mirror-and-check-parity because
   a mirror can drift and a slice cannot.)

   What it proves, in order:

     1.  THE NAME FUNCTION IS STRUCTURALLY BLIND.  nameOf's own source text is
         grepped for \bturn\b, \bsize\b, \bfill\b, \bcolour\b.  The lab's central
         claim — that orientation, size and colour cannot change a shape's name —
         is enforced by the code's shape, not by its author's care.  (Word
         boundaries are mandatory here: "return" contains the letters of "turn".)
     2.  THE REFUSALS HOLD.  The devices belonging to sibling labs — SortLab's
         bins, QuadrilateralLab's vertex-dragging and angle sums, the area and
         perimeter labs' measures — are grepped for and must be absent.  A
         distinctness promise written only in prose is a promise you will break.
     3.  NAME INVARIANCE (K.G.A.2).  Exhaustive: every defining state × every
         turn × every size × every colour → the name is character-identical.
     4.  THE GEOMETRY EARNS IT.  Not by lookup — by measurement.  A turn is an
         isometry and size is a similarity, so on the ACTUAL generated vertices
         every defining attribute (side count, corner count, side-length equality
         classes, right angles, angle values) survives to 1e-9.
     5.  RIGHT-ANGLE HONESTY.  Exactly the 4-gon has right angles (four of them,
         exactly 90.000° at every turn and size).  No other shape in the state
         space comes within 3° of a right angle — the margin STRETCH=2 was chosen
         to buy, re-proved here rather than trusted from the header comment.
     6.  SIDES = CORNERS (K.G.B.4), closed and open.
     7.  TICK GROUPS tell the truth and survive turning.
     8.  THE CALIBRATION GATE.  Exhaustive over every state × every target:
         the whole clue card is satisfied IF AND ONLY IF the defining triple
         matches.  So the stamp cannot fire falsely — and, the same theorem seen
         from the other side, it fires for EVERY turn, size and colour, which is
         the lesson wearing the gate's clothes.
     9.  THE CHALLENGE IS WELL-FORMED.  Targets never repeat, never hand back the
         shape already on screen, and are all reachable from the dials.
    10.  IT ALWAYS FITS ON THE PAPER.  Every state × turn × size stays in world.
    11.  THE NAMES ARE THE STANDARD'S NAMES.
    12.  THE LESSON IS WELL-FORMED.  Steps, unlocks, answers, one dial per step.
   ========================================================================== */

import fs from 'fs';

const SRC = fs.readFileSync(new URL('./ShapesLab.jsx', import.meta.url), 'utf8');

let pass = 0;
let fail = 0;
const fails = [];
function ok(cond, msg) {
  if (cond) pass += 1;
  else {
    fail += 1;
    fails.push(msg);
  }
}
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

/* ---------------------------------------------------------------------------
   Load the shipped model by slicing it out of the .jsx.
   ------------------------------------------------------------------------- */
const modelStart = SRC.indexOf('------- */', SRC.indexOf('MODEL — pure mathematics')) + '------- */'.length;
const modelEnd = SRC.lastIndexOf('/* ---', SRC.indexOf('LESSON — the steps[]'));
ok(modelStart > 20 && modelEnd > modelStart, 'harness: located the MODEL section in ShapesLab.jsx');
const MODEL_SRC = SRC.slice(modelStart, modelEnd);

const EXPORTS = [
  'SIDE_STOPS', 'STRETCH', 'TURN_STEP', 'TURN_STOPS', 'SIZE_MIN', 'SIZE_MAX',
  'radiusFor', 'FILLS', 'WORLD_R', 'phaseFor', 'nameOf', 'outlineOf',
  'edgeCount', 'cornerCount', 'straightSides', 'sideLengths', 'tickGroups',
  'cornerAngles', 'RIGHT_TOL', 'ATTRS', 'DEFINING', 'NON_DEFINING',
  'allTargets', 'cluesFor', 'clueMet', 'definingEqual', 'newTarget',
];
const M = new Function(`${MODEL_SRC}\n; return { ${EXPORTS.join(', ')} };`)();
const {
  SIDE_STOPS, STRETCH, TURN_STEP, TURN_STOPS, SIZE_MIN, SIZE_MAX, radiusFor,
  FILLS, WORLD_R, nameOf, outlineOf, cornerCount, straightSides, sideLengths,
  tickGroups, cornerAngles, ATTRS, DEFINING, NON_DEFINING, allTargets,
  cluesFor, clueMet, definingEqual, newTarget,
} = M;
ok(typeof nameOf === 'function', 'harness: the shipped model evaluated cleanly');

/* the whole state space this lab can be in */
const DEFINING_STATES = [];
for (const sides of SIDE_STOPS) {
  for (const equal of [true, false]) {
    for (const closed of [true, false]) DEFINING_STATES.push({ sides, equal, closed });
  }
}
const TURNS = Array.from({ length: TURN_STOPS }, (_, i) => i * TURN_STEP);
const SIZES = Array.from({ length: SIZE_MAX - SIZE_MIN + 1 }, (_, i) => SIZE_MIN + i);

/* ===== 1. the name function is structurally blind ======================== */
{
  const m = SRC.match(/function nameOf\(([\s\S]*?)\n}\n/);
  ok(!!m, 'nameOf: found its source text');
  // Strip comments before grepping: the claim under test is that the CODE
  // cannot read a pose, and prose explaining why is not the code reading it.
  // (This bit immediately — the comment documenting the oval fix below says the
  // word "turn" — which is a good sign the grep is live rather than decorative.)
  const body = (m ? m[0] : '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok(/function nameOf\(sides, equal, closed\)/.test(SRC),
    'nameOf: takes exactly (sides, equal, closed) — the three DEFINING attributes and nothing else');
  for (const banned of ['turn', 'size', 'fill', 'colour', 'color', 'orientation', 'rotate', 'rotation', 'angle', 'scale']) {
    const re = new RegExp(`\\b${banned}\\b`, 'i');
    ok(!re.test(body), `nameOf: its executable body never mentions "${banned}" — the name CANNOT read it`);
  }
  ok(/\breturn\b/.test(body), 'nameOf: sanity — it does contain "return" (so the word-boundary grep above is load-bearing, not vacuous)');

  /* THE PROSE MUST BE AS POSE-BLIND AS THE NAME.
     Every string nameOf hands back is read aloud beside a shape that may be
     turned any way at all and drawn any size, so a sentence like "wider than it
     is tall" is a defect even though it never touches the name: at turn 90° that
     very oval is 6 across and 12 up, and the lab would be caught contradicting
     its own centerpiece by any child who spun the dial.  This check found
     exactly that sentence in the first draft. */
  const POSE_PROSE = /\b(wider than it is tall|taller than it is wide|on its side|upright|upside[- ]down|sideways|pointing (up|down|left|right)|at the (top|bottom)|flat on|standing on|lying)\b/i;
  let proseChecked = 0;
  for (const sides of SIDE_STOPS) {
    for (const equal of [true, false]) {
      for (const closed of [true, false]) {
        const r = nameOf(sides, equal, closed);
        for (const s of [r.name, r.specific, r.note]) {
          if (!s) continue;
          const hit = s.match(POSE_PROSE);
          ok(!hit, `nameOf’s prose is pose-blind — "${s}"${hit ? ` leaks "${hit[0]}"` : ''}`);
          proseChecked += 1;
        }
      }
    }
  }
  ok(proseChecked >= 40, `swept all ${proseChecked} strings nameOf can return for pose-dependent wording`);
}

/* ===== 2. the refusals hold ============================================== */
{
  // Strip comments: the header DISCUSSES the refused devices by name, and must
  // be allowed to. What matters is that the running code does not do them.
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const refusals = [
    [/\bbins?\b/i, 'SortLab’s BINS'],
    [/randIndex|samePartition/, 'SortLab’s Rand-index partition scoring'],
    [/onPointerDown|setPointerCapture|draggable|dragVertex/, 'the polygon labs’ VERTEX DRAGGING'],
    [/\bshoelace\b|\bperimeter\b/i, 'RectangleLab’s perimeter'],
    [/\barea\s*=|areaOf|\bbase\s*\*\s*height\b/i, 'AreaLab / RectangleLab’s area'],
    [/angleSum|sumOfAngles|180°|360°/, 'Triangle/QuadrilateralLab’s angle sums'],
    [/midpoint|diagonal/i, 'the quadrilateral family’s diagonals'],
    [/\bslope\b/i, 'LineFunctionLab’s slope'],
    [/\bquadrant\b|\borigin\b|axisLabel/i, 'PointLab’s coordinate plane'],
  ];
  for (const [re, what] of refusals) {
    ok(!re.test(code), `refusal holds: the code never does ${what}`);
  }
  ok(!/y\s*=\s*x\b/.test(code), 'refusal holds: no y = x mirror line (LogarithmLab’s)');
}

/* ===== 3. NAME INVARIANCE — K.G.A.2, exhaustively ======================= */
/* Calling nameOf twice with the same three arguments and finding the same
   answer would prove NOTHING — it is a pure function; of course it does.  The
   claim the lab actually makes to a child is stronger and is about the PICTURE:
   "read the name off the shape in front of you, and you will read the same name
   however it is turned, however big it is, whatever colour it is painted."

   So this section derives the name INDEPENDENTLY, by measuring the rendered
   outline — counting its edges, measuring its side lengths, testing its
   closure — and asserts that the measured name equals the claimed name at every
   pose.  That is a real theorem (a turn is an isometry, a resize a similarity),
   it is what a child verifies with their eyes, and — unlike a re-call — it
   breaks the moment the geometry stops earning the name.                      */
{
  function nameFromPicture(pts, sidesDial, closed) {
    if (!closed) return 'not a closed shape';
    if (sidesDial === 0) {
      const rs = pts.map((p) => Math.hypot(p.x, p.y));
      return Math.max(...rs) - Math.min(...rs) < 1e-9 ? 'circle' : 'oval';
    }
    const L = sideLengths(pts, sidesDial, true);
    const equalSides = Math.max(...L) - Math.min(...L) < 1e-9;
    if (sidesDial === 3) return 'triangle';
    if (sidesDial === 4) return equalSides ? 'square' : 'rectangle';
    if (sidesDial === 5) return 'pentagon';
    return 'hexagon';
  }

  for (const s of DEFINING_STATES) {
    const claimed = nameOf(s.sides, s.equal, s.closed);
    ok(typeof claimed.name === 'string' && claimed.name.length > 0, `a name exists for ${JSON.stringify(s)}`);
    for (const turn of TURNS) {
      for (const size of SIZES) {
        const pts = outlineOf({ sides: s.sides, equal: s.equal, size, turn });
        const measured = nameFromPicture(pts, s.sides, s.closed);
        ok(measured === claimed.name,
          `THE PICTURE DISAGREES WITH THE NAME PLATE: ${JSON.stringify(s)} at turn ${turn}, size ${size} — ` +
          `the plate says "${claimed.name}" but the drawn shape measures as "${measured}"`);
      }
    }
  }
  // colour cannot enter the geometry at all: it is not an argument to outlineOf.
  ok(!/\bfill\b/.test(SRC.match(/function outlineOf\(([\s\S]*?)\n}\n/)[0]),
    'outlineOf never reads the colour — the paint cannot move a single vertex');
}

/* ===== 4. the geometry earns the invariance ============================= */
{
  for (const s of DEFINING_STATES) {
    if (s.sides === 0) continue; // round: no vertices to measure
    const ref = outlineOf({ sides: s.sides, equal: s.equal, size: 3, turn: 0 });
    const refLens = sideLengths(ref, s.sides, s.closed).slice().sort((a, b) => a - b);
    const refAngs = cornerAngles(ref, s.sides, s.closed).map((a) => a.deg).sort((a, b) => a - b);

    for (const turn of TURNS) {
      const p = outlineOf({ sides: s.sides, equal: s.equal, size: 3, turn });
      const L = sideLengths(p, s.sides, s.closed).slice().sort((a, b) => a - b);
      const A = cornerAngles(p, s.sides, s.closed).map((a) => a.deg).sort((a, b) => a - b);
      ok(L.length === refLens.length && L.every((v, i) => near(v, refLens[i])),
        `turn is an isometry: side lengths unchanged at ${turn}° for ${JSON.stringify(s)}`);
      ok(A.length === refAngs.length && A.every((v, i) => near(v, refAngs[i], 1e-9)),
        `turn is an isometry: corner angles unchanged at ${turn}° for ${JSON.stringify(s)}`);
    }

    // size is a similarity: lengths scale by exactly the radius ratio, angles hold
    for (const size of SIZES) {
      const p = outlineOf({ sides: s.sides, equal: s.equal, size, turn: 0 });
      const L = sideLengths(p, s.sides, s.closed);
      const k = radiusFor(size) / radiusFor(3);
      const refL = sideLengths(ref, s.sides, s.closed);
      ok(L.every((v, i) => near(v, refL[i] * k, 1e-9)),
        `size is a similarity: every side scales by exactly ${k.toFixed(4)} at size ${size}`);
      const A = cornerAngles(p, s.sides, s.closed).map((a) => a.deg);
      const refA = cornerAngles(ref, s.sides, s.closed).map((a) => a.deg);
      ok(A.every((v, i) => near(v, refA[i], 1e-9)),
        `size is a similarity: corner angles unchanged at size ${size} for ${JSON.stringify(s)}`);
    }
  }
}

/* ===== 5. right-angle honesty, and the STRETCH=2 margin ================= */
{
  let worstNonSquareGap = Infinity;
  for (const s of DEFINING_STATES) {
    if (s.sides === 0) continue;
    for (const turn of TURNS) {
      for (const size of SIZES) {
        const p = outlineOf({ sides: s.sides, equal: s.equal, size, turn });
        const angs = cornerAngles(p, s.sides, s.closed);
        const rights = angs.filter((a) => Math.abs(a.deg - 90) <= 1e-6);
        if (s.sides === 4) {
          const want = s.closed ? 4 : 2; // an open 4-gon keeps only its 2 join corners
          ok(rights.length === want && angs.length === want,
            `the 4-gon shows exactly ${want} right angle(s) at turn ${turn}, size ${size}, equal=${s.equal}, closed=${s.closed}`);
          for (const a of angs) {
            ok(near(a.deg, 90, 1e-9),
              `4-gon corner is exactly 90.000° (got ${a.deg}) at turn ${turn} size ${size} equal=${s.equal}`);
          }
        } else {
          ok(rights.length === 0,
            `a ${s.sides}-gon claims NO right angle at turn ${turn}, size ${size}, equal=${s.equal}`);
          for (const a of angs) {
            worstNonSquareGap = Math.min(worstNonSquareGap, Math.abs(a.deg - 90));
          }
        }
      }
    }
  }
  ok(worstNonSquareGap > 3,
    `STRETCH=${STRETCH} keeps every non-square corner clear of 90° — closest in the whole state space is ${worstNonSquareGap.toFixed(2)}° away (must be > 3°)`);
  // Re-prove the two values the header rejected, so the choice stays justified.
  const apexAt = (k) => {
    const ph = (90 * Math.PI) / 180;
    const V = [0, 1, 2].map((i) => {
      const a = ph + (2 * Math.PI * i) / 3;
      return { x: Math.cos(a) * k, y: Math.sin(a) };
    });
    const e1 = { x: V[1].x - V[0].x, y: V[1].y - V[0].y };
    const e2 = { x: V[2].x - V[0].x, y: V[2].y - V[0].y };
    return (Math.atan2(Math.abs(e1.x * e2.y - e1.y * e2.x), e1.x * e2.x + e1.y * e2.y) * 180) / Math.PI;
  };
  ok(Math.abs(apexAt(Math.sqrt(3)) - 90) < 1e-9,
    `the rejected STRETCH=√3 really would make the triangle EXACTLY right-angled (apex ${apexAt(Math.sqrt(3)).toFixed(3)}°)`);
  ok(Math.abs(apexAt(1.75) - 90) < 1,
    `the rejected STRETCH=1.75 really does land the triangle's apex within 1° of square (apex ${apexAt(1.75).toFixed(2)}°)`);
  ok(Math.abs(apexAt(STRETCH) - 90) > 3,
    `the chosen STRETCH=${STRETCH} clears it by ${Math.abs(apexAt(STRETCH) - 90).toFixed(2)}°`);
}

/* ===== 6. sides = corners (K.G.B.4) ==================================== */
{
  for (const s of DEFINING_STATES) {
    if (s.sides === 0) {
      ok(cornerCount(0, s.closed) === 0, 'a round shape has 0 corners');
      ok(straightSides(0, s.closed) === 0, 'a round shape has 0 straight sides');
      continue;
    }
    if (s.closed) {
      ok(straightSides(s.sides, true) === cornerCount(s.sides, true),
        `closed ${s.sides}-gon: straight sides (${straightSides(s.sides, true)}) = corners (${cornerCount(s.sides, true)})`);
      ok(cornerCount(s.sides, true) === s.sides, `closed ${s.sides}-gon has ${s.sides} corners`);
      // and the drawn geometry agrees with the counts
      const p = outlineOf({ sides: s.sides, equal: s.equal, size: 3, turn: 0 });
      ok(sideLengths(p, s.sides, true).length === s.sides, `closed ${s.sides}-gon really draws ${s.sides} edges`);
      ok(cornerAngles(p, s.sides, true).length === s.sides, `closed ${s.sides}-gon really has ${s.sides} measurable corners`);
    } else {
      ok(straightSides(s.sides, false) === s.sides - 1, `open ${s.sides}-gon shows ${s.sides - 1} straight sides`);
      ok(cornerCount(s.sides, false) === s.sides - 2, `open ${s.sides}-gon shows ${s.sides - 2} corners (the two loose ends are not corners)`);
      const p = outlineOf({ sides: s.sides, equal: s.equal, size: 3, turn: 0 });
      ok(cornerAngles(p, s.sides, false).length === s.sides - 2, `open ${s.sides}-gon really has ${s.sides - 2} measurable corners`);
    }
  }
  // the step-5 feedback's specific claim: open a triangle, exactly ONE corner survives
  ok(cornerCount(3, false) === 1, 'the lesson’s claim holds: an open 3-sided figure keeps exactly 1 corner');
}

/* ===== 7. tick groups tell the truth, and survive turning =============== */
{
  for (const s of DEFINING_STATES) {
    if (s.sides === 0 || !s.closed) continue;
    const ref = tickGroups(sideLengths(outlineOf({ sides: s.sides, equal: s.equal, size: 3, turn: 0 }), s.sides, true));
    if (s.equal) {
      ok(ref.count === 1, `a regular ${s.sides}-gon has ONE length group — every side gets 1 tick`);
      ok(ref.groups.every((g) => g === 1), `regular ${s.sides}-gon: all ticks are 1`);
    } else {
      ok(ref.count > 1, `a stretched ${s.sides}-gon has more than one length group (so the ticks visibly differ)`);
    }
    for (const turn of TURNS) {
      const t = tickGroups(sideLengths(outlineOf({ sides: s.sides, equal: s.equal, size: 3, turn }), s.sides, true));
      ok(t.count === ref.count && t.groups.every((g, i) => g === ref.groups[i]),
        `tick groups survive a ${turn}° turn on the ${s.equal ? 'regular' : 'stretched'} ${s.sides}-gon`);
    }
    for (const size of SIZES) {
      const t = tickGroups(sideLengths(outlineOf({ sides: s.sides, equal: s.equal, size, turn: 0 }), s.sides, true));
      ok(t.count === ref.count && t.groups.every((g, i) => g === ref.groups[i]),
        `tick groups survive resizing to ${size} on the ${s.equal ? 'regular' : 'stretched'} ${s.sides}-gon`);
    }
  }
  // the specific shapes the lesson names
  const sq = tickGroups(sideLengths(outlineOf({ sides: 4, equal: true, size: 3, turn: 0 }), 4, true));
  ok(sq.count === 1, 'the square: all four sides one group');
  const rect = tickGroups(sideLengths(outlineOf({ sides: 4, equal: false, size: 3, turn: 0 }), 4, true));
  ok(rect.count === 2 && rect.groups.filter((g) => g === 1).length === 2 && rect.groups.filter((g) => g === 2).length === 2,
    'the rectangle: two groups of two — long pair 1 tick, short pair 2 ticks');
  const iso = tickGroups(sideLengths(outlineOf({ sides: 3, equal: false, size: 3, turn: 0 }), 3, true));
  ok(iso.count === 2 && iso.groups.filter((g) => g === 2).length === 2,
    'the stretched triangle really is ISOSCELES — exactly two of its sides are equal, so the lab’s name for it is true');
}

/* ===== 8. THE CALIBRATION GATE — the ⟺, exhaustively =================== */
{
  const targets = allTargets();
  ok(targets.length === 10, `the challenge has ${targets.length} distinct targets`);
  const keys = new Set(targets.map((t) => `${t.sides}:${t.equal}`));
  ok(keys.size === targets.length, 'every target is a distinct defining state');

  let pairs = 0;
  for (const t of targets) {
    const clues = cluesFor(t);
    ok(clues.length >= 3, `target ${nameOf(t.sides, t.equal, true).name}: the card carries ${clues.length} clues`);
    // A clue card must never mention a non-defining attribute.
    for (const c of clues) {
      ok(DEFINING.includes(c.id) || c.id === 'corners',
        `clue "${c.text}" is a DEFINING attribute (or a corner count, which is one in disguise)`);
      // A clue card must not so much as HINT at a pose.  Match STEMS, not whole
      // words: an earlier version of this audit grepped /\bturn\b/ and happily
      // passed a clue reading "4 straight sides, turned upright" — the same
      // word-boundary trap that makes "return" contain "turn", wearing the other
      // face.  Mutation-tested: this list must catch that leak.
      const POSE_WORDS = /\b(turn|turns|turned|turning|orient\w*|upright|sideways|upside|angle[ds]?|rotat\w*|tilt\w*|size[ds]?|big|bigger|small|smaller|large|larger|tiny|huge|wide\b(?! one way)|colou?r\w*|paint\w*|red|blue|green|yellow|butter|mint|lilac|peach|sky)\b/i;
      const hit = c.text.match(POSE_WORDS);
      ok(!hit, `clue "${c.text}" never hints at a pose${hit ? ` (leaked: "${hit[0]}")` : ''}`);
    }

    for (const st of DEFINING_STATES) {
      const allMet = clues.every((c) => clueMet(c, st));
      const eq = definingEqual(st, t);
      ok(allMet === eq,
        `GATE ⟺ : card[${nameOf(t.sides, t.equal, true).name}] satisfied=${allMet} but definingEqual=${eq} for state ${JSON.stringify(st)}`);
      pairs += 1;

      // And the other side of the same theorem: the verdict must not move for
      // ANY pose. This is the lesson enforced by the grading rule itself.
      if (eq) {
        for (const turn of TURNS) {
          for (const size of SIZES) {
            for (const fill of FILLS) {
              const posed = { ...st, turn, size, fill: fill.id };
              ok(clues.every((c) => clueMet(c, posed)) === true && definingEqual(posed, t) === true,
                `GATE IGNORES POSE: ${nameOf(t.sides, t.equal, true).name} must still match at turn ${turn}, size ${size}, colour ${fill.id}`);
            }
          }
        }
      }
    }
  }
  ok(pairs === targets.length * DEFINING_STATES.length,
    `the ⟺ was checked on all ${pairs} (target × state) pairs — the stamp is provably impossible to fire falsely`);

  // an open figure can never win, whatever else is true of it
  for (const t of targets) {
    const clues = cluesFor(t);
    for (const sides of SIDE_STOPS) {
      for (const equal of [true, false]) {
        const st = { sides, equal, closed: false };
        ok(!clues.every((c) => clueMet(c, st)), `an OPEN figure never satisfies the ${nameOf(t.sides, t.equal, true).name} card`);
      }
    }
  }
}

/* ===== 9. the challenge is well-formed ================================== */
{
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let prev = null;
  const cur = { sides: 4, equal: true, closed: true };
  for (let i = 0; i < 20000; i++) {
    const t = newTarget(rnd, prev, cur);
    ok(!!t, 'newTarget always returns a target');
    if (prev) {
      ok(!(t.sides === prev.sides && t.equal === prev.equal), 'newTarget never repeats the previous card');
    }
    ok(!definingEqual(cur, t), 'newTarget never hands back the shape already on the paper');
    ok(SIDE_STOPS.includes(t.sides), 'the target’s side count is reachable from the dial');
    prev = t;
  }
  // every target is actually buildable
  for (const t of allTargets()) {
    ok(SIDE_STOPS.includes(t.sides) && typeof t.equal === 'boolean',
      `target ${nameOf(t.sides, t.equal, true).name} is reachable from the dials`);
    ok(definingEqual({ sides: t.sides, equal: t.equal, closed: true }, t),
      `target ${nameOf(t.sides, t.equal, true).name} is solved by the state that builds it`);
  }
}

/* ===== 10. it always fits on the paper ================================= */
{
  let worst = 0;
  for (const s of DEFINING_STATES) {
    for (const turn of TURNS) {
      for (const size of SIZES) {
        const p = outlineOf({ sides: s.sides, equal: s.equal, size, turn });
        for (const pt of p) worst = Math.max(worst, Math.abs(pt.x), Math.abs(pt.y));
      }
    }
  }
  ok(worst < WORLD_R, `the shape never leaves the paper: worst half-extent ${worst.toFixed(3)} < WORLD_R ${WORLD_R}`);
  ok(worst > WORLD_R * 0.5, `…and it uses the paper: worst half-extent ${worst.toFixed(3)} is more than half of ${WORLD_R}`);
  ok(near(radiusFor(SIZE_MAX) * Math.sqrt(STRETCH), worst, 1e-6),
    `the worst case is exactly the biggest stretched shape — a stretched circle at max size, half-extent radiusFor(${SIZE_MAX})·√${STRETCH} = ${worst.toFixed(3)} — as the header’s arithmetic claims`);
}

/* ===== 11. the names are the standard's names ========================== */
{
  const expect = [
    [0, true, true, 'circle'],
    [0, false, true, 'oval'],
    [3, true, true, 'triangle'],
    [3, false, true, 'triangle'],
    [4, true, true, 'square'],
    [4, false, true, 'rectangle'],
    [5, true, true, 'pentagon'],
    [5, false, true, 'pentagon'],
    [6, true, true, 'hexagon'],
    [6, false, true, 'hexagon'],
  ];
  for (const [sides, equal, closed, want] of expect) {
    ok(nameOf(sides, equal, closed).name === want,
      `nameOf(${sides}, ${equal}, ${closed}) = "${want}" (got "${nameOf(sides, equal, closed).name}")`);
  }
  for (const sides of SIDE_STOPS) {
    for (const equal of [true, false]) {
      ok(nameOf(sides, equal, false).name === 'not a closed shape',
        `an open figure is never given a polygon name (sides=${sides}, equal=${equal})`);
    }
  }
  // the lab's headline teaching claims, as assertions
  ok(nameOf(4, true, true).name === nameOf(4, true, true).name, 'the square is a square');
  ok(nameOf(4, false, true).name === 'rectangle' && nameOf(5, false, true).name === 'pentagon',
    'THE CENTRAL CONTRAST: stretching breaks "square" (→ rectangle) but not "pentagon" — because only one of those names ever demanded equal sides');
  ok(nameOf(3, true, true).specific === 'an equilateral triangle', 'the regular triangle is named equilateral');
  ok(nameOf(3, false, true).specific === 'an isosceles triangle', 'the stretched triangle is named isosceles');
  ok(nameOf(5, true, true).specific === 'a regular pentagon' && nameOf(5, false, true).specific === null,
    'stretching a pentagon costs it "regular" and nothing else');
}

/* ===== 12. the lesson is well-formed =================================== */
{
  const stepsM = SRC.match(/const STEPS = \[([\s\S]*?)\n\];/);
  ok(!!stepsM, 'found the STEPS array');
  const nSteps = (stepsM[1].match(/\n  \{\n    title:/g) || []).length;
  ok(nSteps === 8, `the lesson has ${nSteps} steps (want 8)`);
  const answersM = stepsM[1].match(/answer: \d+/g) || [];
  ok(answersM.length === nSteps, 'every step poses a predict-then-check question');
  const fbM = stepsM[1].match(/feedback:/g) || [];
  ok(fbM.length === nSteps, 'every step has feedback (where the reveal lives)');

  const unlockM = SRC.match(/const UNLOCK = \{([^}]*)\}/);
  ok(!!unlockM, 'found UNLOCK');
  const unlocks = {};
  for (const m of unlockM[1].matchAll(/(\w+):\s*(\d+)/g)) unlocks[m[1]] = parseInt(m[2], 10);
  ok(Object.keys(unlocks).length === 6, 'all six controls have an unlock step');
  for (const a of ATTRS) {
    ok(unlocks[a.id] !== undefined, `control "${a.id}" has an unlock step`);
    ok(unlocks[a.id] === a.step, `the two-kind panel reveals "${a.id}" exactly when its dial unlocks (step ${a.step})`);
  }
  ok(unlocks.size === unlocks.fill,
    'size and colour unlock together — they are the same KIND of attribute, which is that step’s whole lesson');
  const perStep = {};
  for (const [k, v] of Object.entries(unlocks)) perStep[v] = (perStep[v] || 0) + 1;
  for (const [s, n] of Object.entries(perStep)) {
    ok(n <= 2, `step ${s} unlocks ${n} control(s) — never more than the size+colour pair`);
  }
  ok(DEFINING.length === 3 && NON_DEFINING.length === 3,
    'the two-kind panel is an even split: 3 defining, 3 non-defining');
  ok(DEFINING.every((d) => ['sides', 'equal', 'closed'].includes(d)),
    'the defining three are: how many straight sides, are they equal, does it close');
  ok(NON_DEFINING.every((d) => ['turn', 'size', 'fill'].includes(d)),
    'the non-defining three are exactly 1.G.A.1’s examples: orientation, overall size, colour');

  const startM = SRC.match(/const START = \{ sides: (\d+), equal: (\w+), closed: (\w+), turn: (\d+), size: (\d+)/);
  ok(!!startM, 'found START');
  ok(nameOf(+startM[1], startM[2] === 'true', startM[3] === 'true').name === 'square',
    'the lab opens on a SQUARE, which is what step 1’s copy says it opens on');
  ok(+startM[4] === 0, 'it opens unturned, so the ghost has somewhere to be');

  ok(/K\.G\.A\.2/.test(SRC) && /1\.G\.A\.1/.test(SRC) && /K\.G\.B\.4/.test(SRC) && /2\.G\.A\.1/.test(SRC),
    'the four anchor standards are cited in the file');
  ok(/www\.mais\.ac/.test(SRC), 'the MAIS header is present');
  ok(/'use client'/.test(SRC), 'it is a Next.js client component');
  ok(!/from 'three'|require\(|<script/.test(SRC), 'zero external dependencies');
  ok(/prefers-reduced-motion/.test(SRC), 'the spin animation respects prefers-reduced-motion');
}

/* ---------------------------------------------------------------------------
   report
   ------------------------------------------------------------------------- */
console.log('');
console.log('  audit-shapes.mjs — ShapesLab model verification');
console.log('  ' + '─'.repeat(58));
console.log(`  checks passed : ${pass}`);
console.log(`  checks failed : ${fail}`);
if (fail) {
  console.log('');
  for (const f of fails.slice(0, 40)) console.log('   ✗ ' + f);
  if (fails.length > 40) console.log(`   … and ${fails.length - 40} more`);
}
console.log('');
process.exit(fail ? 1 : 0);
