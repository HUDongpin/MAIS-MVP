/* ============================================================================
   audit-associative.mjs — numeric proof that AssociativeMultiplicationLab's
   model is exact, that its picture actually shows the theorem it claims, and
   that its calibration can never award a false CALIBRATED stamp.

   The lab's thesis: a board of a trays × b bags × c marbles can be bundled two
   ways WITHOUT MOVING A MARBLE — outline the bags ((a×b)×c) or outline the
   trays (a×(b×c)) — so the two routes count the same objects and must agree.
   Everything below verifies that claim, the facts printed on screen, and the
   layout property the thesis rests on: geometry does not depend on the route.

   Run:  node audit-associative.mjs
   Zero dependencies. Mirrors the pure functions in AssociativeMultiplicationLab
   .jsx exactly, and PARSES the .jsx for the values the lesson prose hard-codes.
   ========================================================================== */

import { readFileSync } from 'node:fs';

const SRC = 'AssociativeMultiplicationLab.jsx';

/* ---- model, copied verbatim from AssociativeMultiplicationLab.jsx -------- */
const A_MAX = 5;
const B_MAX = 6;
const C_MAX = 6;

function routePair(route, a, b, c) {
  return route === 'right' ? b * c : a * b;
}
function easierRoute(a, b, c) {
  const lTen = (a * b) % 10 === 0;
  const rTen = (b * c) % 10 === 0;
  if (lTen && !rTen) return 'left';
  if (rTen && !lTen) return 'right';
  return null;
}
const TARGETS = [30, 40, 60, 80, 90, 100, 120, 150];

const PAD_X = 22;
const PAD_TOP = 30;
const PAD_BOT = 38;
const GUTTER = 58;
const BADGE_GAP = 9;
const BADGE_MAX = 40;
const TRAY_GAP = 12;
const TRAY_PAD = 9;
const BAG_GAP = 7;

function computeLayout(W, H, a, b) {
  const availW = Math.max(60, W - PAD_X * 2 - GUTTER);
  const availH = Math.max(60, H - PAD_TOP - PAD_BOT);
  const bagHRaw = Math.min((availH - (a - 1) * TRAY_GAP) / a - 2 * TRAY_PAD, 88);
  const bagWRaw = Math.min((availW - 2 * TRAY_PAD - (b - 1) * BAG_GAP) / b, 106);
  const side = Math.max(8, Math.min(bagWRaw, bagHRaw));
  const bagH = side;
  const bagW = Math.max(8, Math.min(bagWRaw, side * 1.25));
  const trayH = bagH + 2 * TRAY_PAD;
  const trayW = b * bagW + (b - 1) * BAG_GAP + 2 * TRAY_PAD;
  const boardH = a * trayH + (a - 1) * TRAY_GAP;
  const x0 = PAD_X + (availW - trayW) / 2 + GUTTER / 2;
  const y0 = PAD_TOP + Math.max(0, (availH - boardH) / 2);
  return { x0, y0, trayW, trayH, bagW, bagH, boardH };
}

const PIP_POS = {
  1: [[0.5, 0.5]],
  2: [[0.5, 0.22], [0.5, 0.78]],
  3: [[0.5, 0.22], [0.5, 0.5], [0.5, 0.78]],
  4: [[0.26, 0.22], [0.74, 0.22], [0.26, 0.78], [0.74, 0.78]],
  5: [[0.26, 0.22], [0.74, 0.22], [0.5, 0.5], [0.26, 0.78], [0.74, 0.78]],
  6: [[0.26, 0.22], [0.74, 0.22], [0.26, 0.5], [0.74, 0.5], [0.26, 0.78], [0.74, 0.78]],
};

/* the calibration verdict + meter, copied verbatim from the component */
function calibVerdict(a, b, c, route, target) {
  const P = a * b * c;
  const pair = routePair(route, a, b, c);
  const tenPair = pair % 10 === 0;
  const hitTotal = P === target;
  const calibrated = hitTotal && tenPair && route !== 'none';
  const pct = calibrated
    ? 100
    : hitTotal
    ? 65
    : tenPair
    ? 40
    : Math.round(30 * Math.max(0, 1 - Math.abs(P - target) / target));
  return { P, pair, tenPair, hitTotal, calibrated, pct };
}

/* ---- harness ------------------------------------------------------------ */
let checks = 0;
let fails = 0;
const failSamples = [];
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    if (failSamples.length < 20) failSamples.push(msg);
  }
}
function section(name, fn) {
  const c0 = checks;
  const f0 = fails;
  fn();
  const tag = fails === f0 ? 'ok  ' : 'FAIL';
  console.log(`  [${tag}] ${name.padEnd(52)} ${checks - c0} checks`);
}

const VIEWPORTS = [
  [720, 480], // desktop stage, 3/2
  [560, 373],
  [420, 420], // phone, 1/1
  [340, 340], // narrow phone
];

console.log('\naudit-associative.mjs — AssociativeMultiplicationLab\n');

/* =======================================================================
   1. THE THEOREM ITSELF — the whole point of the lab.
   ======================================================================= */
section('associative law holds over the dial ranges', () => {
  for (let a = 1; a <= A_MAX; a++)
    for (let b = 1; b <= B_MAX; b++)
      for (let c = 1; c <= C_MAX; c++) {
        const left = a * b * c; // (a×b)×c
        const right = a * (b * c); // a×(b×c)
        ok(a * b * c === left, `L route ${a},${b},${c}`);
        ok(left === right, `associativity ${a},${b},${c}`);
        ok(Number.isInteger(left), `integer ${a},${b},${c}`);
        /* the displayed total is the same number both routes reach */
        ok(left === a * b * c && right === a * b * c, `total agrees ${a},${b},${c}`);
      }
});

section('associativity generalises well beyond the dials', () => {
  /* the law is stated "for every a, b and c" — check it far outside the board */
  for (let a = 0; a <= 40; a++)
    for (let b = 0; b <= 40; b++)
      for (let c = 0; c <= 40; c += 1) {
        ok(a * b * c === a * (b * c), `assoc ${a},${b},${c}`);
      }
});

/* =======================================================================
   2. THE PICTURE — the counts the canvas and facts panel assert.
   ======================================================================= */
section('board counts: bags = a·b, per-tray = b·c, total = a·b·c', () => {
  for (let a = 1; a <= A_MAX; a++)
    for (let b = 1; b <= B_MAX; b++)
      for (let c = 1; c <= C_MAX; c++) {
        const bagCount = a * b;
        const perTray = b * c;
        const P = a * b * c;
        /* count the marbles the renderer actually draws: a trays × b bags × c pips */
        let drawn = 0;
        for (let i = 0; i < a; i++)
          for (let j = 0; j < b; j++) drawn += (PIP_POS[c] || PIP_POS[1]).length;
        ok(drawn === P, `drawn marbles ${a},${b},${c}: ${drawn} vs ${P}`);
        /* count the bags the renderer draws */
        let bags = 0;
        for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) bags++;
        ok(bags === bagCount, `drawn bags ${a},${b},${c}`);
        /* Route L's story: bagCount bags × c each */
        ok(bagCount * c === P, `route L story ${a},${b},${c}`);
        /* Route R's story: a trays × perTray each */
        ok(a * perTray === P, `route R story ${a},${b},${c}`);
        /* the per-tray badge value must be what one tray really holds */
        let inOneTray = 0;
        for (let j = 0; j < b; j++) inOneTray += (PIP_POS[c] || PIP_POS[1]).length;
        ok(inOneTray === perTray, `tray badge ${a},${b},${c}`);
      }
});

section('routePair returns the pair each bracketing does first', () => {
  for (let a = 1; a <= A_MAX; a++)
    for (let b = 1; b <= B_MAX; b++)
      for (let c = 1; c <= C_MAX; c++) {
        ok(routePair('left', a, b, c) === a * b, `pair L ${a},${b},${c}`);
        ok(routePair('right', a, b, c) === b * c, `pair R ${a},${b},${c}`);
        /* and the second step of each route completes the product */
        ok(routePair('left', a, b, c) * c === a * b * c, `L completes ${a},${b},${c}`);
        ok(a * routePair('right', a, b, c) === a * b * c, `R completes ${a},${b},${c}`);
      }
});

/* =======================================================================
   3. PIP LAYOUT — c marbles, countable, never overlapping, never outside.
   ======================================================================= */
section('PIP_POS holds exactly c pips for each c, all distinct', () => {
  for (let c = 1; c <= C_MAX; c++) {
    const p = PIP_POS[c];
    ok(!!p, `PIP_POS[${c}] exists`);
    ok(p.length === c, `PIP_POS[${c}] has ${p.length}, want ${c}`);
    for (const [x, y] of p) {
      ok(x > 0 && x < 1 && y > 0 && y < 1, `pip in bag ${c}`);
    }
    for (let i = 0; i < p.length; i++)
      for (let j = i + 1; j < p.length; j++)
        ok(p[i][0] !== p[j][0] || p[i][1] !== p[j][1], `distinct pips ${c}`);
  }
});

section('marbles never overlap or leave their bag, any board, any viewport', () => {
  for (const [W, H] of VIEWPORTS)
    for (let a = 1; a <= A_MAX; a++)
      for (let b = 1; b <= B_MAX; b++) {
        const L = computeLayout(W, H, a, b);
        const pr = Math.max(1.8, Math.min(L.bagW, L.bagH) * 0.115);
        for (let c = 1; c <= C_MAX; c++) {
          const pips = PIP_POS[c];
          for (let i = 0; i < pips.length; i++) {
            const xi = pips[i][0] * L.bagW;
            const yi = pips[i][1] * L.bagH;
            /* inside the bag */
            ok(xi - pr >= -0.01 && xi + pr <= L.bagW + 0.01, `pip x in bag ${W}x${H} ${a},${b},${c}`);
            ok(yi - pr >= -0.01 && yi + pr <= L.bagH + 0.01, `pip y in bag ${W}x${H} ${a},${b},${c}`);
            /* separated from every other pip */
            for (let j = i + 1; j < pips.length; j++) {
              const dx = xi - pips[j][0] * L.bagW;
              const dy = yi - pips[j][1] * L.bagH;
              ok(
                Math.hypot(dx, dy) >= 2 * pr - 0.01,
                `pips overlap ${W}x${H} a=${a} b=${b} c=${c} d=${Math.hypot(dx, dy).toFixed(2)} 2r=${(
                  2 * pr
                ).toFixed(2)}`
              );
            }
          }
        }
      }
});

/* =======================================================================
   4. LAYOUT — the board fits, and (the thesis!) does NOT depend on route.
   ======================================================================= */
section('board fits inside the stage at every board size / viewport', () => {
  for (const [W, H] of VIEWPORTS)
    for (let a = 1; a <= A_MAX; a++)
      for (let b = 1; b <= B_MAX; b++) {
        const L = computeLayout(W, H, a, b);
        ok(L.x0 >= PAD_X - 0.01, `left edge ${W}x${H} ${a},${b}`);
        /* the board is honestly centred on the stage */
        ok(
          Math.abs(L.x0 + L.trayW / 2 - W / 2) < 0.01,
          `board centred ${W}x${H} ${a},${b}: ${L.x0 + L.trayW / 2} vs ${W / 2}`
        );
        /* and the per-tray badge still fits the lane beside it, at its hard cap */
        ok(
          L.x0 + L.trayW + BADGE_GAP + BADGE_MAX <= W + 0.01,
          `badge fits ${W}x${H} ${a},${b}: needs ${
            L.x0 + L.trayW + BADGE_GAP + BADGE_MAX
          }, have ${W}`
        );
        ok(L.y0 >= PAD_TOP - 0.01, `top edge ${W}x${H} ${a},${b}`);
        ok(L.boardH <= H - PAD_TOP - PAD_BOT + 0.01, `bottom edge ${W}x${H} ${a},${b}`);
        ok(L.bagW >= 8 && L.bagH >= 8, `bag not degenerate ${W}x${H} ${a},${b}`);
        /* bags read as bags, not letterboxes */
        ok(L.bagW / L.bagH <= 1.2501, `bag aspect ${W}x${H} ${a},${b} = ${L.bagW / L.bagH}`);
        /* the tray hugs its bags exactly */
        ok(
          Math.abs(L.trayW - (b * L.bagW + (b - 1) * BAG_GAP + 2 * TRAY_PAD)) < 1e-9,
          `tray hugs bags ${a},${b}`
        );
      }
});

section('THESIS: geometry is independent of the bracketing', () => {
  /* If any marble moved when the brackets moved, the lab's whole argument would
     collapse. computeLayout is not given `route` at all — assert that
     STRUCTURALLY against the shipped source, not just against this copy. */
  const src = readFileSync(SRC, 'utf8');
  const m = src.match(/function computeLayout\(([^)]*)\)\s*\{([\s\S]*?)\n\}/);
  ok(!!m, 'computeLayout found in source');
  if (m) {
    const params = m[1].split(',').map((s) => s.trim());
    ok(
      params.join(',') === 'W,H,a,b',
      `computeLayout params are (W,H,a,b), got (${params.join(',')})`
    );
    ok(!/\broute\b/.test(m[2]), 'computeLayout body never mentions route');
  }
  /* every call site passes exactly four arguments and no route */
  const calls = [...src.matchAll(/computeLayout\(([^)]*)\)/g)].filter(
    (x) => !x[0].startsWith('function')
  );
  for (const call of calls) {
    if (/^\s*W,\s*H,\s*a,\s*b\s*$/.test(call[1])) continue; // the declaration
    ok(!/route/.test(call[1]), `call site passes no route: computeLayout(${call[1]})`);
  }
  /* and the gutter is reserved unconditionally, so nothing shifts when the
     per-tray badges appear */
  ok(/const availW = Math\.max\(60, W - PAD_X \* 2 - GUTTER\)/.test(src), 'gutter always reserved');
});

/* =======================================================================
   5. THE "EASIER ROUTE" CLAIM — honest, or silent.
   ======================================================================= */
section('easierRoute only ever claims a route that truly makes a ten', () => {
  for (let a = 1; a <= A_MAX; a++)
    for (let b = 1; b <= B_MAX; b++)
      for (let c = 1; c <= C_MAX; c++) {
        const e = easierRoute(a, b, c);
        const lTen = (a * b) % 10 === 0;
        const rTen = (b * c) % 10 === 0;
        ok(e === 'left' || e === 'right' || e === null, `verdict domain ${a},${b},${c}`);
        if (e === 'left') {
          ok(lTen && !rTen, `left claim justified ${a},${b},${c}`);
          ok(routePair('left', a, b, c) % 10 === 0, `left pair is a ten ${a},${b},${c}`);
        }
        if (e === 'right') {
          ok(rTen && !lTen, `right claim justified ${a},${b},${c}`);
          ok(routePair('right', a, b, c) % 10 === 0, `right pair is a ten ${a},${b},${c}`);
        }
        if (e === null) {
          ok(lTen === rTen, `silence justified (both or neither) ${a},${b},${c}`);
        }
        /* whatever it says, both routes still give the same product — the tag
           is about EFFORT, never about the answer */
        ok(a * b * c === a * (b * c), `answer unaffected ${a},${b},${c}`);
      }
});

/* =======================================================================
   6. CALIBRATION — reachable, diagnostic, and never a false stamp.
   ======================================================================= */
const solCounts = [];
section('every target is reachable, by at least two distinct triples', () => {
  for (const T of TARGETS) {
    const sols = [];
    for (let a = 1; a <= A_MAX; a++)
      for (let b = 1; b <= B_MAX; b++)
        for (let c = 1; c <= C_MAX; c++) {
          if (a * b * c !== T) continue;
          const route = (a * b) % 10 === 0 ? 'left' : (b * c) % 10 === 0 ? 'right' : null;
          if (route) sols.push([a, b, c, route]);
        }
    ok(sols.length >= 1, `target ${T} is winnable`);
    ok(sols.length >= 2, `target ${T} has several answers (${sols.length})`);
    solCounts.push(`${T}→${sols.length}`);
    /* and each recorded solution really does stamp */
    for (const [a, b, c, route] of sols) {
      const v = calibVerdict(a, b, c, route, T);
      ok(v.calibrated && v.pct === 100, `solution ${a}x${b}x${c} ${route} stamps for ${T}`);
    }
  }
});

section('no false stamp: full grid × both routes × every target', () => {
  for (const T of TARGETS)
    for (let a = 1; a <= A_MAX; a++)
      for (let b = 1; b <= B_MAX; b++)
        for (let c = 1; c <= C_MAX; c++)
          for (const route of ['left', 'right']) {
            const v = calibVerdict(a, b, c, route, T);
            /* the stamp is EXACTLY the conjunction of the two stated conditions */
            const should = a * b * c === T && routePair(route, a, b, c) % 10 === 0;
            ok(v.calibrated === should, `stamp ${a},${b},${c} ${route} T=${T}`);
            /* 100% happens if and only if the stamp is earned */
            ok((v.pct === 100) === should, `100% iff stamped ${a},${b},${c} ${route} T=${T}`);
            /* the meter never overstates */
            ok(v.pct >= 0 && v.pct <= 100, `meter in range ${a},${b},${c} ${route} T=${T}`);
            /* a right total with the wrong bracket must NOT stamp — the crucial
               half-way state this challenge exists to teach */
            if (v.hitTotal && !v.tenPair) {
              ok(!v.calibrated && v.pct === 65, `right total / wrong bracket ${a},${b},${c} T=${T}`);
            }
            /* a ten with the wrong total must NOT stamp either */
            if (!v.hitTotal && v.tenPair) {
              ok(!v.calibrated && v.pct === 40, `ten but wrong total ${a},${b},${c} T=${T}`);
            }
          }
});

section('the challenge never opens already solved', () => {
  /* entering the challenge resets the board to 1 × 1 × 1 with route 'left' */
  for (const T of TARGETS) {
    const v = calibVerdict(1, 1, 1, 'left', T);
    ok(!v.calibrated, `1x1x1 does not stamp for ${T}`);
    ok(v.pct < 100, `1x1x1 meter below 100 for ${T}`);
    ok(v.P === 1 && v.P !== T, `1x1x1 total is 1, not ${T}`);
  }
  /* and TARGETS itself never contains a product that 1×1×1 could hit */
  for (const T of TARGETS) ok(T > 1, `target ${T} > 1`);
});

section('targets are well-formed and pickTarget always changes', () => {
  for (const T of TARGETS) {
    ok(Number.isInteger(T) && T > 0, `target ${T} is a positive integer`);
    ok(T <= A_MAX * B_MAX * C_MAX, `target ${T} <= max board ${A_MAX * B_MAX * C_MAX}`);
  }
  ok(new Set(TARGETS).size === TARGETS.length, 'targets are distinct');
  ok(TARGETS.length >= 2, 'pickTarget can always find a different target');
  /* this file's copy of the model must not drift from the shipped one */
  const src = readFileSync(SRC, 'utf8');
  const m = src.match(/const TARGETS = \[([^\]]*)\]/);
  ok(!!m, 'TARGETS found in source');
  if (m) {
    const shipped = m[1].split(',').map((s) => parseInt(s.trim(), 10));
    ok(
      shipped.length === TARGETS.length && shipped.every((t, i) => t === TARGETS[i]),
      `audit TARGETS match the lab's (${shipped.join(',')})`
    );
  }
  for (const [k, v] of [['A_MAX', A_MAX], ['B_MAX', B_MAX], ['C_MAX', C_MAX]]) {
    const mm = src.match(new RegExp(`const ${k} = (\\d+);`));
    ok(!!mm && parseInt(mm[1], 10) === v, `audit ${k} matches the lab's`);
  }
});

/* =======================================================================
   7. THE LESSON — the numbers the prose hard-codes must be true.
   ======================================================================= */
section('lesson word-problem arithmetic and answer keys', () => {
  /* step 2: a=3 trays, b=4 bags → 12 bags; distractors are genuinely wrong */
  ok(3 * 4 === 12, 'step 2 key');
  ok(3 + 4 !== 12, 'step 2 distractor "7" is wrong');
  ok(3 !== 12, 'step 2 distractor "3" is wrong');
  /* step 3: b=4 bags, c=5 marbles → 20 per tray */
  ok(4 * 5 === 20, 'step 3 key');
  ok(4 + 5 !== 20, 'step 3 distractor "9" is wrong');
  ok(5 !== 20, 'step 3 distractor "5" is wrong');
  /* step 1: a trays of 20 → a×20, and adding is a different number */
  for (let a = 2; a <= A_MAX; a++) ok(a * 20 !== 20 + a, `step 1: a=${a} multiply ≠ add`);
  /* step 7: 7 × 5 × 2 — both routes give 70, and the ten is on the RIGHT pair,
     so the keyed answer is not merely "go left to right" */
  ok(7 * 5 * 2 === 70, 'step 7 product');
  ok((7 * 5) * 2 === 7 * (5 * 2), 'step 7 associativity');
  ok(7 * (5 * 2) === 70 && (5 * 2) === 10, 'step 7 key: 5×2 makes a ten');
  ok(easierRoute(7, 5, 2) === 'right', 'step 7: the model agrees the easy route is R');
  ok(7 + 5 + 2 !== 70 && (7 + 5 + 2) * 2 !== 70, 'step 7 "add them" distractor is wrong');
  /* the START board is the canonical 3 × 4 × 5 = 60 example the prose uses */
  ok(3 * 4 * 5 === 60, 'START total');
  ok(3 * 4 === 12 && 4 * 5 === 20 && 12 * 5 === 60 && 3 * 20 === 60, 'START both routes');
});

section('step-7 seeded board matches the prose it is written under', () => {
  /* VarianceLab precedent: parse the SHIPPED source, so a later edit to the seed
     cannot silently contradict the step's body text. */
  const src = readFileSync(SRC, 'utf8');
  const m = src.match(/if \(step === 7 && !seededRef\.current\) \{([\s\S]*?)\n    \}/);
  ok(!!m, 'step-7 seed block found');
  if (m) {
    const nums = [...m[1].matchAll(/set([ABC])\((\d+)\)/g)];
    ok(nums.length === 3, `seed sets all three dials (found ${nums.length})`);
    const seed = {};
    for (const [, k, v] of nums) seed[k.toLowerCase()] = parseInt(v, 10);
    const { a, b, c } = seed;
    ok(a >= 1 && a <= A_MAX, `seed a=${a} in range`);
    ok(b >= 1 && b <= B_MAX, `seed b=${b} in range`);
    ok(c >= 1 && c <= C_MAX, `seed c=${c} in range`);
    /* the step exists to show that the easy route is NOT always left-to-right,
       so the seeded board must genuinely favour the RIGHT bracket */
    ok(easierRoute(a, b, c) === 'right', `seed ${a},${b},${c} favours route R`);
    ok((b * c) % 10 === 0, `seed inner pair ${b}×${c} makes a ten`);
    ok((a * b) % 10 !== 0, `seed outer pair ${a}×${b} does not make a ten`);
    ok(a * b * c === a * (b * c), `seed associativity`);
  }
});

section('the badge lane is wide enough BY CONSTRUCTION', () => {
  /* The board is centred, so the free lane on each side is at least
     PAD_X + GUTTER/2. The badge must fit inside it for EVERY stage width — this
     is the arithmetic that makes the per-viewport checks above hold, and the
     reason BADGE_MAX is capped in the renderer rather than left to font metrics. */
  ok(PAD_X + GUTTER / 2 >= BADGE_GAP + BADGE_MAX, `lane ${PAD_X + GUTTER / 2} ≥ badge ${BADGE_GAP + BADGE_MAX}`);
  /* the widest label the badge ever shows is b·c, which is at most two digits */
  ok(String(B_MAX * C_MAX).length <= 2, `badge label "${B_MAX * C_MAX}" is ≤ 2 digits`);
  /* and the renderer really does cap it */
  const src = readFileSync(SRC, 'utf8');
  ok(
    /Math\.max\(30, Math\.min\(BADGE_MAX, ctx\.measureText\(label\)\.width \+ 16\)\)/.test(src),
    'badge width is capped at BADGE_MAX in the renderer'
  );
  for (const [k, v] of [['GUTTER', GUTTER], ['BADGE_GAP', BADGE_GAP], ['BADGE_MAX', BADGE_MAX], ['PAD_X', PAD_X]]) {
    const mm = src.match(new RegExp(`const ${k} = (\\d+)`));
    ok(!!mm && parseInt(mm[1], 10) === v, `audit ${k} matches the lab's`);
  }
});

section('dial ranges keep every board drawable and countable', () => {
  ok(C_MAX <= 6, 'c stays subitizable (a bag is read at a glance)');
  ok(Object.keys(PIP_POS).length === C_MAX, 'a pip layout exists for every legal c');
  ok(A_MAX * B_MAX * C_MAX === 180, 'the biggest board is 180 marbles');
  for (let c = 1; c <= C_MAX; c++) ok(PIP_POS[c] != null, `PIP_POS covers c=${c}`);
});

/* ---- report ------------------------------------------------------------- */
console.log(`\n  winning (triple, bracket) pairs per target: ${solCounts.join('  ')}`);
console.log(`\n  ${checks.toLocaleString()} checks, ${fails} failures`);
if (fails) {
  console.log('\n  sample failures:');
  for (const f of failSamples) console.log('   ·', f);
  process.exit(1);
}
console.log('  ALL PASS\n');
