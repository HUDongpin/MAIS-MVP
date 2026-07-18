'use client';

/* ============================================================================
   PrimeFactorizationLab — an interactive "bench" for one of the deepest ideas
   in all of arithmetic: every whole number is built from PRIMES, and there is
   only ONE way to build it (the Fundamental Theorem of Arithmetic).

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   ONE carmine accent for the mathematical object (here the PRIME atoms), a
   staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with a
   live match meter and a CALIBRATED stamp.

   The signature centerpiece is THE FACTOR TREE. A number sits at the top and
   BRANCHES DOWNWARD: click any composite branch and split it into a factor pair.
   Keep splitting until every leaf is a prime — a prime can't be broken down, so
   it glows carmine and stops. The carmine leaves, read left to right, ARE the
   prime factorization. Split a number a different way and the tree changes
   shape, yet the very same prime atoms always fall out at the bottom. That
   invariance, made visible, is the Fundamental Theorem of Arithmetic.

   DELIBERATELY DISTINCT from its siblings:
     • MultiplyLab / MultiDigitMultiplicationLab BUILD a product a × b = c.
       Prime factorization runs the other direction — it DECOMPOSES a number
       into its factors and asks what it is made of.
     • DivisionLab / LongDivisionLab split a number into equal groups and care
       about the quotient. Here the point is not the quotient but the prime
       ATOMS and the UNIQUENESS of the decomposition.
     • The function labs draw a curve y = f(x). This lab is pure number theory:
       a branching tree of whole numbers, a product of primes, an exponent form.
       No curve, no coordinate plane.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/PrimeFactorizationLab.jsx
     2. Import and render it:
          import PrimeFactorizationLab from './PrimeFactorizationLab';
          export default function Page() { return <PrimeFactorizationLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the number, the tree,
              the lesson step, answers, the challenge target).
     MODEL  — isPrime / factorize / factorPairs are pure math; they know nothing
              about pixels. A split ALWAYS uses an exact factor pair, so the
              product of the tree's leaves is an invariant equal to the number.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // THE one accent = a PRIME (an atom of the number)
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const PAPER = '#fbfbf8';
const OK = '#1f8a5b';
const COMP = '#2f6f9f'; // composite numbers — a calm blue, never the accent
const MINUS = '−';
const TIMES = '×';

/* ===========================================================================
   EDIT 2 — Model. Pure number theory, no pixels.
   =========================================================================== */

/* A prime has EXACTLY two distinct factors, 1 and itself. So 0 and 1 are not
   prime, 2 is prime (and the only even prime), and we trial-divide up to √n. */
function isPrime(n) {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n < 4) return true; // 2 and 3
  if (n % 2 === 0) return false;
  for (let d = 3; d * d <= n; d += 2) {
    if (n % d === 0) return false;
  }
  return true;
}

function smallestPrimeFactor(n) {
  if (n % 2 === 0) return 2;
  for (let d = 3; d * d <= n; d += 2) {
    if (n % d === 0) return d;
  }
  return n; // n is prime
}

/* The prime factorization as an ascending list WITH multiplicity.
   60 → [2, 2, 3, 5].  A prime p → [p].  (n ≥ 2 assumed.) */
function factorize(n) {
  const out = [];
  let m = n;
  while (m % 2 === 0) { out.push(2); m /= 2; }
  for (let d = 3; d * d <= m; d += 2) {
    while (m % d === 0) { out.push(d); m /= d; }
  }
  if (m > 1) out.push(m);
  return out;
}

/* Every UNORDERED, NON-TRIVIAL factor pair [a, b] with a ≤ b, a·b = n, a > 1.
   12 → [[2,6],[3,4]].  A prime → []. The trivial 1×n pair is excluded on
   purpose: it splits nothing and would let a tree grow forever. */
function factorPairs(n) {
  const out = [];
  for (let d = 2; d * d <= n; d++) {
    if (n % d === 0) out.push([d, n / d]);
  }
  return out;
}

/* All divisors of n, ascending. 12 → [1,2,3,4,6,12]. */
function divisorsOf(n) {
  const out = [];
  for (let d = 1; d * d <= n; d++) {
    if (n % d === 0) {
      out.push(d);
      if (d !== n / d) out.push(n / d);
    }
  }
  return out.sort((a, b) => a - b);
}

/* Group a sorted prime list into [prime, exponent] pairs. [2,2,3,5] → [[2,2],[3,1],[5,1]]. */
function groupExponents(list) {
  const out = [];
  for (const p of list) {
    const last = out[out.length - 1];
    if (last && last[0] === p) last[1] += 1;
    else out.push([p, 1]);
  }
  return out;
}

/* Number of divisors τ(n) = Π (exponent + 1). This is WHY prime factorization
   is powerful: it labels every divisor of the number at once. */
function tauFromGroups(groups) {
  return groups.reduce((acc, [, e]) => acc * (e + 1), 1);
}

/* ===========================================================================
   Tree model. A node is { id, v, kids: null | [nodeL, nodeR], bornAt }.
   Splitting a composite leaf sets its kids to a factor pair. Because a split
   uses an exact pair, the product of all leaves is forever equal to the root.
   =========================================================================== */
function leavesOf(node, acc = []) {
  if (node.kids) { leavesOf(node.kids[0], acc); leavesOf(node.kids[1], acc); }
  else acc.push(node);
  return acc;
}
function allNodes(node, acc = []) {
  acc.push(node);
  if (node.kids) { allNodes(node.kids[0], acc); allNodes(node.kids[1], acc); }
  return acc;
}
function treeComplete(root) {
  return leavesOf(root).every((l) => isPrime(l.v));
}

/* Build a fully-factored subtree by always peeling off the SMALLEST prime
   (the canonical "ladder" tree). Used for reset-to-solved and Auto-finish. */
function buildFactored(mk, v) {
  const node = mk(v, false);
  if (!isPrime(v)) {
    const p = smallestPrimeFactor(v);
    node.kids = [buildFactored(mk, p), buildFactored(mk, v / p)];
  }
  return node;
}

/* Build a fully-factored subtree whose FIRST split is a deliberately different
   pair (closest to √v). Same leaves, different shape — the FTA demonstration. */
function buildAlt(mk, v) {
  const node = mk(v, false);
  if (isPrime(v)) return node;
  const pairs = factorPairs(v);
  const pair = pairs[pairs.length - 1]; // the pair closest to √v (most "balanced")
  node.kids = [buildFactored(mk, pair[0]), buildFactored(mk, pair[1])];
  return node;
}

/* Immutably split the node with the given id into [a, b] (children pop in). */
function splitAt(mk, node, id, pair) {
  if (node.id === id) {
    return { ...node, kids: [mk(pair[0], true), mk(pair[1], true)] };
  }
  if (!node.kids) return node;
  const a = splitAt(mk, node.kids[0], id, pair);
  const b = splitAt(mk, node.kids[1], id, pair);
  if (a === node.kids[0] && b === node.kids[1]) return node;
  return { ...node, kids: [a, b] };
}

/* Replace every remaining composite leaf with its fully-factored subtree. */
function autoFinishTree(mk, node) {
  if (!node.kids) return isPrime(node.v) ? node : buildFactored(mk, node.v);
  return { ...node, kids: [autoFinishTree(mk, node.kids[0]), autoFinishTree(mk, node.kids[1])] };
}

/* ===========================================================================
   EDIT 6 — Calibration ("Break it down!"). The capstone is a CONSTRUCTION goal
   (the skill's documented alternative to curve-matching): fully decompose a
   mystery composite into primes. The meter reads the share of the number's
   prime factors already reached (prime leaves ÷ Ω), and CALIBRATED fires only
   when EVERY leaf is prime — which, since a split always preserves the product,
   is exactly a correct and complete prime factorization. No false stamp is
   possible: primeLeaves = Ω iff no composite leaf remains.
   =========================================================================== */
const CHALLENGE_POOL = (() => {
  const pool = [];
  for (let n = 12; n <= 99; n++) {
    const w = factorize(n).length; // Ω, with multiplicity
    if (!isPrime(n) && w >= 3 && w <= 4) pool.push(n); // a real 3–4 leaf tree
  }
  return pool;
})();

function makeChallenge(prev) {
  let n;
  do {
    n = CHALLENGE_POOL[Math.floor(Math.random() * CHALLENGE_POOL.length)];
  } while (n === prev && CHALLENGE_POOL.length > 1);
  return n;
}

/* ---- formatting helpers -------------------------------------------------- */
function fmt(n) {
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
/* Plain-text product for aria / facts, e.g. "2 × 2 × 3 × 5". */
function productText(list) {
  return list.map(fmt).join(` ${TIMES} `);
}
/* Plain-text exponent form for aria, e.g. "2^2 × 3 × 5". */
function exponentText(groups) {
  return groups.map(([p, e]) => (e === 1 ? `${p}` : `${p}^${e}`)).join(` ${TIMES} `);
}

/* ===========================================================================
   EDIT 4 — Lesson. One idea per step; the interaction it teaches unlocks with
   its step; the reveal lives in `feedback` (shown after answering); distractors
   are real student misconceptions (1 is prime, odd ⇒ prime, gluing 2×2×2 into
   6, "the split you pick changes the primes"). Next is gated on ANSWERED.
   =========================================================================== */
const STEPS = [
  {
    title: 'Meet the primes',
    body:
      'A prime number has exactly two factors: 1 and itself. 2, 3, 5, 7, 11, 13 … are primes. ' +
      'The number 1 is NOT prime — it has only one factor. And 2 is the only even prime; every ' +
      'other even number can be halved. Slide the number below and read its factor list.',
    q: 'Which of these is a prime number?',
    choices: [
      '11 — its only factors are 1 and 11',
      '1 — it is the smallest counting number',
      '9 — it is odd, and odd numbers are prime',
    ],
    answer: 0,
    feedback:
      '11 is prime: the only whole numbers that divide it are 1 and 11. The number 1 is NOT prime — ' +
      'a prime needs exactly two DIFFERENT factors, and 1 has just one. And “odd” does not mean ' +
      '“prime”: 9 = 3 × 3 is odd but composite.',
  },
  {
    title: 'Prime or composite?',
    body:
      'A composite number has MORE than two factors — it can be written as a product of smaller ' +
      'whole numbers. Every whole number above 1 is either prime or composite. The factor list ' +
      'below tells you which: exactly two factors ⇒ prime, more than two ⇒ composite.',
    q: 'Is 15 prime or composite?',
    choices: [
      'Composite — 15 = 3 × 5, so it has factors 1, 3, 5, 15',
      'Prime — 15 is an odd number',
      'Prime — 15 ends in 5',
    ],
    answer: 0,
    feedback:
      '15 = 3 × 5, so its factors are 1, 3, 5, 15 — four of them — which makes it composite. Being ' +
      'odd or ending in 5 does not decide it (5 itself is prime, but 15 is not). Only the number of ' +
      'factors decides prime vs composite.',
  },
  {
    title: 'Break it into two factors',
    body:
      'To factorize, split the number into two factors that multiply back to it — any pair except ' +
      '1 × itself. Tap the number at the top of the tree and choose a split. That is the first ' +
      'branch of your factor tree.',
    q: 'Which is a correct way to START breaking down 24?',
    choices: [
      '4 × 6 — both are bigger than 1, and 4 × 6 = 24',
      '24 × 1 — every number can be written this way',
      '8 × 4 — because 8 × 4 = 24',
    ],
    answer: 0,
    feedback:
      'A first split needs two factors greater than 1 that multiply to the number. 4 × 6 = 24 ✓. ' +
      'Writing 24 × 1 “splits” nothing — it just names the number again. And 8 × 4 = 32, not 24, so ' +
      'it is not a factor pair of 24 at all. Always check the product.',
  },
  {
    title: 'Keep splitting to the primes',
    body:
      'Split each composite branch again. The moment a branch reaches a prime it turns carmine and ' +
      'stops — primes cannot be broken down. You are finished when EVERY leaf is a carmine prime. ' +
      '(Stuck or in a hurry? Auto-finish completes the tree for you.)',
    q: 'When do you stop growing a factor tree?',
    choices: [
      'When every leaf is a prime number',
      'When you reach any even number',
      'When the tree has exactly three leaves',
    ],
    answer: 0,
    feedback:
      'You stop when every leaf is prime, because a prime can’t split any further. An even leaf like ' +
      '8 is NOT a stopping point — 8 = 2 × 2 × 2 still has work to do. And there is no magic leaf ' +
      'count: different numbers have different numbers of prime factors.',
  },
  {
    title: 'Write the prime factorization',
    body:
      'Read the carmine leaves from smallest to largest — that product IS the prime factorization. ' +
      'When a prime repeats, gather the copies with an exponent: 2 × 2 × 2 = 2³ (the base is the ' +
      'prime, the exponent counts how many). The tidy exponent form appears below the tree.',
    q: 'Write 2 × 2 × 2 × 5 using exponents.',
    choices: [
      '2³ × 5',
      '6 × 5 — since 2 × 2 × 2 makes 6',
      '3² × 5 — three 2’s become “3 squared”',
    ],
    answer: 0,
    feedback:
      'Three 2’s multiplied is 2³ (base 2, exponent 3), so the answer is 2³ × 5. 2³ = 8, not 6 — ' +
      'multiplying is not the same as adding the exponent onto the base. And 3² = 9 means TWO 3’s, ' +
      'a completely different number. The exponent just counts identical prime factors.',
  },
  {
    title: 'Only one way — the deep theorem',
    body:
      'Split the number a different way — 24 as 4 × 6, or 3 × 8, or 2 × 12 — and the tree changes ' +
      'shape, but the SAME prime atoms always land at the bottom. This is the Fundamental Theorem of ' +
      'Arithmetic: every number above 1 has exactly one prime factorization (apart from order). ' +
      'Press “Split differently” to watch it happen.',
    q: '12 can be split as 2 × 6 or as 3 × 4. What prime factorization comes out?',
    choices: [
      '2 × 2 × 3 both ways — the primes are always the same',
      '2 × 6 and 3 × 4 give different primes',
      'It depends on which split you choose first',
    ],
    answer: 0,
    feedback:
      'Both paths finish at 2 × 2 × 3. The order and shape of the splitting change the tree, never ' +
      'the final set of primes. That uniqueness is the Fundamental Theorem of Arithmetic — it is why ' +
      'we can speak of THE prime factorization of a number.',
  },
  {
    title: 'Break it down!',
    body:
      'A mystery number is waiting. Break it all the way down to primes — tap each composite branch ' +
      'and pick a factor pair (or use Auto-finish). Fill the meter to 100% to earn CALIBRATED, then ' +
      'press New number for a fresh one.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PrimeFactorizationLab() {
  const [n, setN] = useState(12); // the explorer number (steps 0–5)
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [challenge, setChallenge] = useState(null); // the calibration target number
  const [selected, setSelected] = useState(null); // id of the composite leaf awaiting a split
  const [tree, setTree] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const idRef = useRef(0);
  const rafRef = useRef(0);
  const reducedRef = useRef(false);

  const current = STEPS[step];
  const calib = !!current.calib;
  const canSplit = step >= 2; // splitting unlocks at "Break it into two factors"
  const activeN = calib && challenge != null ? challenge : n;

  /* node factory — bornAt drives the little pop-in; instant (bornAt 0) for
     tree rebuilds so a reset never animates the whole tree at once. */
  const mk = useCallback((v, pop = false) => {
    idRef.current += 1;
    return { id: idRef.current, v, kids: null, bornAt: pop ? nowMs() : 0 };
  }, []);

  /* reset the tree to a single unbroken root whenever the active number changes */
  useEffect(() => {
    setTree(mk(activeN, false));
    setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeN, mk]);

  /* hand a challenge number to the calibration step the first time we reach it */
  useEffect(() => {
    if (calib && challenge == null) setChallenge(makeChallenge(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calib]);

  /* record the reduced-motion preference once */
  useEffect(() => {
    reducedRef.current =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  /* ---- derived math (single source of truth reads straight from state) ---- */
  const leaves = tree ? leavesOf(tree) : [];
  const primeList = factorize(activeN); // the TRUE answer, ascending w/ multiplicity
  const groups = groupExponents(primeList);
  const Omega = primeList.length; // # prime factors with multiplicity
  const omega = groups.length; // # DISTINCT primes
  const tau = tauFromGroups(groups); // # divisors
  const nIsPrime = isPrime(activeN);
  const complete = tree ? treeComplete(tree) : false;
  const primeLeafCount = leaves.filter((l) => isPrime(l.v)).length;

  const pct = calib ? Math.min(100, Math.round((100 * primeLeafCount) / Math.max(1, Omega))) : 0;
  const calibrated = calib && complete && !nIsPrime;

  // sorted leaf values for the live product readout (prime = carmine, composite = blue)
  const leafParts = leaves
    .map((l) => ({ v: l.v, prime: isPrime(l.v) }))
    .sort((a, b) => a.v - b.v);

  // keep a fresh snapshot for the renderer & pointer handler
  sceneRef.current = { ...sceneRef.current, tree, selected, canSplit, calib };

  /* ---- full redraw of the factor tree from state ------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const S = sceneRef.current;
    const root = S.tree;
    if (!root) return;

    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

    /* faint quadrille paper for house consistency */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    const GRID = 28;
    for (let gx = GRID; gx < W; gx += GRID) { ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, H); }
    for (let gy = GRID; gy < H; gy += GRID) { ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); }
    ctx.stroke();

    /* ---- layout: leaves get evenly spaced x-slots (DFS order), each internal
       node sits centered above its two children; y is the node's depth. ---- */
    const lvs = [];
    let maxDepth = 0;
    (function walk(node, depth) {
      node._depth = depth;
      if (depth > maxDepth) maxDepth = depth;
      if (node.kids) { walk(node.kids[0], depth + 1); walk(node.kids[1], depth + 1); }
      else lvs.push(node);
    })(root, 0);
    lvs.forEach((lf, i) => { lf._x = (i + 0.5) / lvs.length; });
    (function setX(node) {
      if (node.kids) { setX(node.kids[0]); setX(node.kids[1]); node._x = (node.kids[0]._x + node.kids[1]._x) / 2; }
    })(root);

    const padX = 30;
    const padT = 34;
    const padB = 30;
    const gx = (x01) => padX + x01 * (W - 2 * padX);
    const gy = (d) => (maxDepth > 0 ? padT + (d / maxDepth) * (H - padT - padB) : (H) / 2);

    const gapX = (W - 2 * padX) / lvs.length;
    const levelGap = maxDepth > 0 ? (H - padT - padB) / maxDepth : H;
    let R = Math.min(23, gapX * 0.42, levelGap * 0.42);
    R = Math.max(12, R);

    const nodes = allNodes(root);
    const pos = new Map();
    nodes.forEach((nd) => pos.set(nd.id, { x: gx(nd._x), y: gy(nd._depth), v: nd.v }));
    S.nodePos = pos;
    S.R = R;

    /* edges first (behind the nodes) */
    ctx.strokeStyle = 'rgba(28,43,58,0.32)';
    ctx.lineWidth = 1.6;
    nodes.forEach((nd) => {
      if (!nd.kids) return;
      const p = pos.get(nd.id);
      nd.kids.forEach((k) => {
        const c = pos.get(k.id);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
      });
    });

    /* nodes */
    const t = nowMs();
    const DUR = 300;
    const reduced = reducedRef.current;
    let animating = false;

    nodes.forEach((nd) => {
      const p = pos.get(nd.id);
      const prime = isPrime(nd.v);
      const isLeaf = !nd.kids;
      const splittable = isLeaf && !prime && S.canSplit;
      const age = t - (nd.bornAt || 0);
      let scale = 1;
      if (!reduced && nd.bornAt && age < DUR) {
        const u = age / DUR;
        scale = 1 - (1 - u) * (1 - u); // ease-out
        animating = true;
      }
      const r = R * scale;

      // splittable affordance — a soft dashed carmine ring inviting a tap
      if (splittable && S.selected !== nd.id) {
        ctx.strokeStyle = 'rgba(200,30,79,0.4)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 4.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // selection ring — the branch whose split buttons are showing
      if (S.selected === nd.id && isLeaf && !prime) {
        ctx.strokeStyle = CURVE;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 5.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // the disc
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      if (prime) {
        ctx.fillStyle = CURVE; // a prime is the carmine ATOM
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(150,20,58,0.9)';
        ctx.stroke();
      } else {
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = COMP; // composite = calm blue
        ctx.stroke();
      }

      // the number
      ctx.fillStyle = prime ? '#fff' : INK;
      ctx.font = `700 ${Math.max(11, Math.min(18, r * 0.92))}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(nd.v), p.x, p.y + 0.5);
    });

    S.animating = animating;
  }, []);

  /* keep the pop-in animation running until every young node has settled */
  const animate = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const tick = () => {
      draw();
      if (sceneRef.current.animating) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [draw]);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
    if (!reducedRef.current) animate();
    return () => cancelAnimationFrame(rafRef.current);
  }, [tree, selected, step, draw, animate]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* ---- interaction: tap a composite leaf to split it --------------------- */
  const hitNode = (clientX, clientY) => {
    const S = sceneRef.current;
    if (!S.nodePos) return null;
    const rect = stageRef.current.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    let best = null;
    let bestD = Infinity;
    for (const [id, p] of S.nodePos) {
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d < (S.R + 8) && d < bestD) { best = { id, ...p }; bestD = d; }
    }
    return best;
  };

  const performSplit = (id, pair) => {
    setTree((tr) => splitAt(mk, tr, id, pair));
    setSelected(null); // the branch is no longer a leaf — drop the selection ring
  };

  const onStagePointerDown = (e) => {
    if (!canSplit) return;
    const hit = hitNode(e.clientX, e.clientY);
    if (!hit) return;
    if (isPrime(hit.v)) return; // primes are atoms — nothing to split
    const pairs = factorPairs(hit.v);
    if (pairs.length === 1) performSplit(hit.id, pairs[0]); // no choice → split now
    else setSelected(hit.id); // multiple ways → let the student choose
  };

  // keyboard fallback: Enter/Space cycles the "selected" branch through the
  // composite leaves so the split buttons are reachable without a pointer.
  const onStageKeyDown = (e) => {
    if (!canSplit) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const comp = leavesOf(tree).filter((l) => !isPrime(l.v));
    if (comp.length === 0) return;
    const idx = comp.findIndex((c) => c.id === selected);
    const next = comp[(idx + 1) % comp.length];
    if (factorPairs(next.v).length === 1) performSplit(next.id, factorPairs(next.v)[0]);
    else setSelected(next.id);
  };

  const selectedNode =
    selected != null ? leavesOf(tree || { kids: null, v: 0 }).find((l) => l.id === selected) : null;
  const selectedValid = selectedNode && !isPrime(selectedNode.v);

  /* ---- controls ---------------------------------------------------------- */
  const resetTree = () => { setTree(mk(activeN, false)); setSelected(null); };
  const autoFinish = () => { setTree((tr) => autoFinishTree(mk, tr)); setSelected(null); };
  const splitDifferently = () => { setTree(buildAlt(mk, activeN)); setSelected(null); };
  const newChallenge = () => setChallenge((c) => makeChallenge(c));

  const onN = (value) => setN(parseInt(value, 10));
  const PRESETS = [12, 18, 24, 36, 48, 60, 72, 100];

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* the exponent form rendered with real superscripts, e.g. 2² × 3 × 5 */
  const expoJsx = (grp) =>
    grp.map(([p, e], i) => (
      <span key={p}>
        {i > 0 && <span className="op"> {TIMES} </span>}
        <span className="pr">
          {p}
          {e > 1 && <sup>{e}</sup>}
        </span>
      </span>
    ));

  /* ---- spoken description for screen readers ----------------------------- */
  const spoken =
    `Factor tree of ${activeN}. ${nIsPrime ? `${activeN} is prime — it is already an atom.` : ''} ` +
    `Current leaves multiply to ${productText(leafParts.map((p) => p.v))}. ` +
    (complete && !nIsPrime
      ? `Complete: the prime factorization is ${exponentText(groups)}.`
      : 'Keep splitting the blue composite branches.') +
    (calibrated ? ' Calibrated.' : '');

  return (
    <div className="pflab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Prime Factorization</h1>
        <p className="lede">
          Every whole number is built out of <em>primes</em> — the atoms of arithmetic. Take a
          number apart with a <em>factor tree</em>: split it, split the pieces, and stop when every
          leaf is a carmine prime. Split it a different way and the tree changes shape, yet the very
          same atoms always fall out — the one, unique <em>prime factorization</em>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="prod mono">
              <span className="lead">{activeN}</span>
              <span className="eq"> = </span>
              {leafParts.map((p, i) => (
                <span key={i}>
                  {i > 0 && <span className="op"> {TIMES} </span>}
                  <span className={p.prime ? 'pr' : 'co'}>{p.v}</span>
                </span>
              ))}
            </p>
            {complete && !nIsPrime && (
              <p className="expo mono" aria-hidden="true">
                ={' '}
                {expoJsx(groups)}
              </p>
            )}
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerDown={onStagePointerDown}
            onKeyDown={onStageKeyDown}
            tabIndex={canSplit ? 0 : -1}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            {(!tree || !tree.kids) && (
              <span className="hint mono">
                {nIsPrime
                  ? `${activeN} is prime — it can’t be split`
                  : canSplit
                  ? 'tap a blue branch to split it'
                  : 'splitting unlocks at step 3'}
              </span>
            )}
          </div>
          <p className="sr-only" aria-live="polite">{spoken}</p>

          {/* the split chooser — appears when a composite branch is selected */}
          {canSplit && selectedValid && (
            <div className="splitpanel" role="group" aria-label={`Split ${selectedNode.v}`}>
              <span className="splitlabel mono">
                Split <b>{selectedNode.v}</b> into:
              </span>
              <div className="pairs">
                {factorPairs(selectedNode.v).map(([a, b]) => (
                  <button
                    key={a}
                    type="button"
                    className="pairbtn mono"
                    onClick={() => performSplit(selectedNode.id, [a, b])}
                  >
                    {a} {TIMES} {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="legend" aria-hidden="true">
            <span className="lg"><span className="sw pr" /> prime — an atom</span>
            <span className="lg"><span className="sw co" /> composite — split it</span>
            {calib && (
              <span className="lg">
                <span className="mono" style={{ color: pct >= 100 ? OK : INK_SOFT }}>
                  {pct}% broken down
                </span>
              </span>
            )}
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Number</span>
              <span className="fact-v mono" style={{ fontWeight: 700 }}>{activeN}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Prime or composite</span>
              <span className="fact-v mono" style={{ color: nIsPrime ? CURVE : COMP }}>
                {nIsPrime ? 'prime' : 'composite'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Prime factorization</span>
              <span className="fact-v mono" style={{ color: CURVE }}>
                {calib && !complete
                  ? 'break it down to reveal'
                  : nIsPrime
                  ? `${activeN} (already prime)`
                  : expoJsx(groups)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">
                Distinct primes · with repeats
              </span>
              <span className="fact-v mono">
                {calib && !complete ? '· · ·' : `${omega} · ${Omega}`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Number of divisors τ</span>
              <span className="fact-v mono">
                {calib && !complete
                  ? '?'
                  : nIsPrime
                  ? '2'
                  : `${tau}  (${groups.map(([, e]) => e + 1).join('·')})`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">All factors</span>
              <span className="fact-v mono factors">
                {calib && !complete ? '?' : divisorsOf(activeN).join(', ')}
              </span>
            </div>
          </div>

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={resetTree} disabled={!tree || !tree.kids}>
              Reset tree
            </button>
            {step >= 3 && (
              <button type="button" className="btn ghost" onClick={autoFinish} disabled={complete}>
                Auto-finish
              </button>
            )}
            {step >= 5 && !calib && (
              <button type="button" className="btn ghost" onClick={splitDifferently} disabled={nIsPrime}>
                Split differently
              </button>
            )}
          </div>
        </section>

        {/* ---------- TUTOR ---------- */}
        <aside className="panel tutor">
          <div className="progress" role="list" aria-label="Lesson progress">
            {STEPS.map((_, i) => (
              <span
                key={i}
                role="listitem"
                className={'pip' + (i === step ? ' cur' : '') + (i < step ? ' done' : '')}
                aria-current={i === step ? 'step' : undefined}
              />
            ))}
          </div>

          <p className="eyebrow small">Step {step + 1} of {STEPS.length}</p>
          <h2>{current.title}</h2>
          <p className="body">{current.body}</p>

          {/* the number picker (steps 0–5) or the challenge card (calibration) */}
          {!calib ? (
            <div className="picker">
              <label className="dial star">
                <span className="dk">N</span>
                <span className="drole">the number to break down</span>
                <input
                  type="range"
                  min={2}
                  max={100}
                  step={1}
                  value={n}
                  aria-label="The number to factorize"
                  onChange={(e) => onN(e.target.value)}
                />
                <output className="dv">{n}</output>
              </label>
              <div className="presets" role="group" aria-label="Quick numbers">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={'preset mono' + (n === p ? ' on' : '')}
                    onClick={() => setN(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="challenge">
              <div className="chbox">
                <span className="chk mono">Mystery number</span>
                <span className="chv mono">{challenge}</span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">{pct}% broken down</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">every leaf must be prime</span>
                )}
              </div>
              <div className="chbtns">
                <button type="button" className="btn ghost" onClick={autoFinish} disabled={complete}>
                  Auto-finish
                </button>
                <button type="button" className="btn ghost" onClick={resetTree} disabled={!tree || !tree.kids}>
                  Reset
                </button>
                <button type="button" className="btn" onClick={newChallenge}>
                  New number
                </button>
              </div>
            </div>
          )}

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((c, i) => {
                  const chosen = answers[step];
                  const isChosen = chosen === i;
                  const isCorrect = i === current.answer;
                  let cls = 'choice';
                  if (chosen != null) {
                    if (isCorrect) cls += ' correct';
                    else if (isChosen) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button
                      type="button"
                      key={i}
                      className={cls}
                      onClick={() => choose(i)}
                      disabled={chosen != null}
                    >
                      <span className="mark" aria-hidden="true">
                        {chosen != null && isCorrect ? '✓' : chosen != null && isChosen ? '✕' : ''}
                      </span>
                      {c}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          <div className="nav">
            <button type="button" className="btn ghost" onClick={goBack} disabled={step === 0}>
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn" onClick={goNext} disabled={!canNext}>
                {hasQuestion && !answered ? 'Answer to continue' : 'Next →'}
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setStep(0);
                  setAnswers({});
                  setChallenge(null);
                  setN(12);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">n = p₁ · p₂ · … · p<sub>k</sub></span> &nbsp;·&nbsp; every whole number
        above 1 is a product of primes in exactly one way (the Fundamental Theorem of Arithmetic).
        CCSS&nbsp;4.OA.B.4, 6.NS.B.4.
      </footer>

      <style jsx>{`
        .pflab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --comp: #2f6f9f;
          --quad: #c7d8e4;
          --ok: #1f8a5b;
          --mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
          --serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
          background: var(--page);
          color: var(--ink);
          font: 16px/1.55 system-ui, -apple-system, 'Segoe UI', sans-serif;
          padding: 28px 18px 44px;
          border-radius: 16px;
          max-width: 1120px;
          margin: 0 auto;
        }
        .mono { font-family: var(--mono); }
        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
        }
        .eyebrow {
          font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase;
          color: var(--ink-soft); margin: 0 0 6px;
        }
        .eyebrow.small { margin: 0 0 4px; }
        h1 {
          font-family: var(--serif); font-weight: 600;
          font-size: clamp(26px, 4vw, 34px); margin: 0 0 6px;
        }
        .lede { color: var(--ink-soft); margin: 0 0 22px; max-width: 74ch; }
        .lede em { font-style: italic; color: var(--ink); }
        .bench {
          display: grid; grid-template-columns: minmax(0, 1fr) 350px;
          gap: 22px; align-items: start;
        }
        @media (max-width: 940px) { .bench { grid-template-columns: 1fr; } }
        .panel {
          background: #fff; border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px; box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel { padding: 14px; }
        .stage-head { margin-bottom: 10px; min-height: 26px; }
        .prod {
          font-variant-numeric: tabular-nums; font-size: 19px; font-weight: 600;
          margin: 0; color: var(--ink); line-height: 1.3;
        }
        .prod .lead { color: var(--ink); font-weight: 700; }
        .prod .eq, .prod .op { color: var(--ink-soft); font-weight: 400; }
        .prod .pr { color: var(--curve); }
        .prod .co { color: var(--comp); }
        .expo {
          margin: 3px 0 0; font-size: 15px; color: var(--ink-soft);
          font-variant-numeric: tabular-nums;
        }
        .expo .pr { color: var(--curve); font-weight: 600; }
        .expo sup { font-size: 0.72em; }
        .stage {
          position: relative; width: min(100%, 680px); aspect-ratio: 16 / 10;
          margin: 0 auto; border: 1px solid var(--quad); border-radius: 8px;
          overflow: hidden; touch-action: none; cursor: pointer;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
        .stage canvas { display: block; width: 100%; height: 100%; }
        .hint {
          position: absolute; left: 10px; bottom: 9px; font-size: 11px;
          color: var(--ink-soft); background: rgba(251, 251, 248, 0.82);
          padding: 3px 7px; border-radius: 5px; pointer-events: none;
        }
        .splitpanel {
          display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px;
          margin: 12px auto 2px; max-width: 680px; padding: 9px 12px;
          background: rgba(200, 30, 79, 0.05); border: 1px solid rgba(200, 30, 79, 0.25);
          border-radius: 8px;
        }
        .splitlabel { font-size: 13.5px; color: var(--ink); }
        .splitlabel b { font-size: 15px; }
        .pairs { display: flex; flex-wrap: wrap; gap: 7px; }
        .pairbtn {
          font-size: 14px; font-weight: 600; padding: 7px 12px; border-radius: 7px;
          border: 1px solid var(--comp); background: #fff; color: var(--comp);
          cursor: pointer; transition: background 0.14s, color 0.14s;
        }
        .pairbtn:hover { background: var(--comp); color: #fff; }
        .legend {
          display: flex; flex-wrap: wrap; gap: 8px 16px; justify-content: center;
          margin: 10px 4px 2px; font-size: 12px; color: var(--ink-soft);
        }
        .lg { display: inline-flex; align-items: center; gap: 6px; }
        .sw { width: 13px; height: 13px; border-radius: 50%; display: inline-block; }
        .sw.pr { background: var(--curve); }
        .sw.co { background: #fff; border: 2px solid var(--comp); }
        .facts {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin: 12px 4px 4px;
        }
        @media (max-width: 480px) { .facts { grid-template-columns: 1fr; } }
        .fact {
          display: flex; flex-direction: column; gap: 1px; padding: 6px 0;
          border-top: 1px solid rgba(28, 43, 58, 0.08);
        }
        .fact-k {
          font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-soft);
        }
        .fact-v { font-size: 13.5px; font-variant-numeric: tabular-nums; }
        .fact-v.factors { font-size: 12px; color: var(--ink-soft); word-break: break-word; }
        .toolbar { margin: 12px 4px 2px; display: flex; gap: 9px; flex-wrap: wrap; }
        .btn {
          font: 600 13px/1 system-ui, sans-serif; padding: 9px 14px; border-radius: 8px;
          cursor: pointer; border: 1px solid var(--ink); background: var(--ink); color: #fff;
          transition: background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
        }
        .btn.ghost { background: transparent; color: var(--ink); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn:not(:disabled):hover { filter: brightness(1.08); }
        .tutor { padding: 18px 20px 20px; }
        .progress { display: flex; gap: 6px; margin-bottom: 14px; }
        .pip { height: 5px; flex: 1; border-radius: 3px; background: rgba(28, 43, 58, 0.14); }
        .pip.done { background: rgba(200, 30, 79, 0.45); }
        .pip.cur { background: var(--curve); }
        h2 {
          font-family: var(--serif); font-weight: 600; font-size: 20px; margin: 0 0 10px;
          padding-bottom: 9px; border-bottom: 3px double rgba(200, 30, 79, 0.45);
        }
        .body { margin: 0 0 16px; font-size: 14.5px; }
        .picker { display: grid; gap: 10px; margin-bottom: 6px; }
        .dial {
          display: grid; grid-template-columns: 22px 1fr 46px;
          grid-template-rows: auto auto; align-items: center; gap: 2px 10px;
        }
        .dk {
          grid-row: 1 / 3; font-family: var(--serif); font-style: italic; font-size: 19px;
          color: var(--curve);
        }
        .drole { grid-column: 2 / 4; font-size: 11px; color: var(--ink-soft); }
        .dial input[type='range'] { grid-column: 2; width: 100%; accent-color: var(--curve); cursor: pointer; }
        .dv {
          grid-column: 3; font-family: var(--mono); font-variant-numeric: tabular-nums;
          text-align: right; font-size: 14px; font-weight: 700;
        }
        .presets { display: flex; flex-wrap: wrap; gap: 6px; }
        .preset {
          font-size: 13px; padding: 5px 10px; border-radius: 6px;
          border: 1px solid rgba(28, 43, 58, 0.2); background: var(--paper);
          color: var(--ink); cursor: pointer; transition: border-color 0.14s, background 0.14s;
        }
        .preset:hover { border-color: var(--ink); }
        .preset.on { border-color: var(--curve); background: rgba(200, 30, 79, 0.08); color: var(--curve); }
        .challenge { display: grid; gap: 10px; margin-bottom: 6px; }
        .chbox {
          display: flex; align-items: baseline; justify-content: space-between;
          padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(28, 43, 58, 0.15);
          background: linear-gradient(180deg, #fff 0%, #f6f8f9 100%);
        }
        .chk { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-soft); }
        .chv { font-size: 34px; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
        .chbtns { display: flex; gap: 8px; flex-wrap: wrap; }
        .meter { height: 12px; border-radius: 6px; background: rgba(28, 43, 58, 0.1); overflow: hidden; }
        .meter-fill {
          height: 100%; background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--curve));
          transition: width 0.18s ease-out;
        }
        .meter-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
        .target-hint { color: var(--ink-soft); font-size: 12px; }
        .stamp {
          font: 700 12px/1 var(--mono); letter-spacing: 0.16em; color: var(--ok);
          border: 2px solid var(--ok); border-radius: 6px; padding: 4px 8px; transform: rotate(-3deg);
        }
        .quiz { margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(28, 43, 58, 0.1); }
        .q { font-size: 14px; font-weight: 600; margin: 0 0 10px; }
        .choices { display: grid; gap: 7px; }
        .choice {
          text-align: left; font: 13.5px/1.4 system-ui, sans-serif;
          padding: 9px 11px 9px 30px; border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 8px; background: var(--paper); color: var(--ink);
          cursor: pointer; position: relative; transition: border-color 0.15s, background 0.15s;
        }
        .choice:not(:disabled):hover { border-color: var(--ink); }
        .choice .mark { position: absolute; left: 10px; font-weight: 700; }
        .choice.correct { border-color: var(--ok); background: rgba(31, 138, 91, 0.08); }
        .choice.correct .mark { color: var(--ok); }
        .choice.wrong { border-color: var(--ink-soft); background: rgba(91, 107, 123, 0.08); }
        .choice.wrong .mark { color: var(--ink-soft); }
        .choice.dim { opacity: 0.55; }
        .choice:disabled { cursor: default; }
        .feedback {
          margin: 12px 0 0; font-size: 13px; line-height: 1.55; color: var(--ink);
          background: rgba(200, 30, 79, 0.05); border-left: 3px solid var(--curve);
          padding: 10px 12px; border-radius: 0 6px 6px 0;
        }
        .nav { margin-top: 20px; display: flex; justify-content: space-between; gap: 10px; }
        .foot { margin-top: 24px; font-size: 12.5px; color: var(--ink-soft); }
        .foot sub, .foot sub { font-size: 0.8em; }
        :global(.pflab) :focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px; }
        @media (prefers-reduced-motion: reduce) {
          .btn, .meter-fill, .choice, .pairbtn, .preset { transition: none; }
        }
      `}</style>
    </div>
  );
}

/* current time in ms, SSR-safe */
function nowMs() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}
