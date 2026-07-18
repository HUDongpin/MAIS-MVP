'use client';

/* ============================================================================
   PrimeNumbersLab — an interactive "bench" for PRIME NUMBERS, told as the story
   of the SIEVE OF ERATOSTHENES: you do not find the primes by testing numbers
   one at a time, you find them by ELIMINATING everything else.

   Built for MAIS (math AI system, www.mais.ac), K-12. Grade 4 territory and up —
   CCSS 4.OA.B.4 ("... Determine whether a given whole number in the range 1–100
   is prime or composite").

   House style: the interactive-math-bench standard — a quadrille-paper canvas, a
   staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with a
   live match meter and a CALIBRATED stamp.

   THE SIGNATURE CENTERPIECE — "the sieve, and the moment it snaps shut."
     Every number from 1 to N sits in a grid. Sieve by 2: every multiple of 2
     above 2 is struck. Sieve by 3, then 5, then 7 — and STOP. At that last round
     every remaining cell turns carmine AT ONCE, because a composite number can
     never hide from all the primes up to its own square root. The lab's thesis is
     that single flip: SURVIVING IS A PROOF OF PRIMALITY.

     Honesty is designed into the picture. Mid-sieve, a survivor is NOT drawn as
     prime just because it is still standing — 9 survives round 1 and is not
     prime. A cell only turns carmine once it is genuinely proven:

         confirmed prime  ⟺  survived rounds 1..r  AND  n < q²
                                       where q = the next unused sieving prime

     which is exactly the sieve's own theorem (if n < q² were composite, its
     smallest prime factor would be < q and would already have struck it). At the
     final round q² > N, so the condition becomes vacuous and every survivor
     flips. The picture never claims more than it has proved.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files):
     • FactorLab owns ONE number's DIVISOR SET (a rectangle array that wraps N
       squares into d columns, a factor track, pairs meeting at √N). It reaches
       "prime or composite" as a verdict about ONE number, in one step.
     • PrimeFactorizationLab owns ONE number's PRIME ATOMS (an interactive
       tap-to-split factor tree, exponent form, the Fundamental Theorem).
     • MultiplesLab / GreatestCommonFactorLab / LCMLab all relate TWO numbers.
     This lab is about NONE of that: its subject is the PRIMES THEMSELVES as a
     population spread through the integers — how you harvest them all at once,
     how many there are, how they thin out, how they clump into twins, and which
     columns of a grid they are allowed to live in. It never factors a number, it
     never draws a tree or a rectangle array, and it never takes two numbers as
     input. The only overlap with FactorLab, √N, is a different theorem here: not
     "where factor pairs meet" but "when the sieve is allowed to stop".

   DROP-IN USAGE (Next.js, app or pages router):
     1. Save anywhere, e.g. app/labs/PrimeNumbersLab.jsx
     2. import PrimeNumbersLab from './PrimeNumbersLab';
        export default function Page() { return <PrimeNumbersLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the window N, the grid
              width, the sieve round, the lenses, the lesson step, the hunt).
     MODEL  — every number fact is EXACT INTEGER arithmetic. No float ever decides
              whether something is prime, and no rounding touches a claim.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // THE accent — a PRIME, and nothing else
/* struck-out composites are the calm blue #2f6f9f (the --blue token); the canvas
   needs it at several alphas, so it appears there as rgba literals */
const GOLD = '#c8891e'; // used for exactly one thing: a twin-prime gap
const GOLD_DK = '#8f6410';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';

const RUN_DUR = 3400; // ms for a full run of the sieve
const LIMIT_MIN = 20;
const LIMIT_MAX = 120;
const W_MIN = 6;
const W_MAX = 12;

/* ===========================================================================
   MODEL — pure integer math. No pixels, no floats, no rounding in any claim.
   =========================================================================== */

/* Euclid's algorithm. gcd(0, w) = w, which is what the column rule wants. */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

/* Trial division by odds. The independent check the whole lab is audited
   against — the sieve must agree with it on every cell, at every round. */
function isPrime(n) {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let d = 3; d * d <= n; d += 2) if (n % d === 0) return false;
  return true;
}

function primesUpTo(limit) {
  const out = [];
  for (let n = 2; n <= limit; n++) if (isPrime(n)) out.push(n);
  return out;
}

/* The primes you must sieve by to clear every composite up to `limit`: exactly
   those with p² ≤ limit. Integer comparison — never Math.sqrt. */
function sievePrimesFor(limit) {
  const out = [];
  for (let p = 2; p * p <= limit; p++) if (isPrime(p)) out.push(p);
  return out;
}

/* The first prime you are allowed to SKIP: the smallest q with q² > limit. */
function nextSievePrime(limit) {
  for (let n = 2; ; n++) if (isPrime(n) && n * n > limit) return n;
}

/* Which round strikes n? = 1 + the index of n's smallest prime factor among the
   sieving primes; 0 if the sieve never strikes n (n is prime, or n is 1). */
function struckRound(n, sp) {
  for (let i = 0; i < sp.length; i++) {
    const p = sp[i];
    if (n !== p && n % p === 0) return i + 1;
  }
  return 0;
}

/* THE CENTREPIECE RULE. What the picture is allowed to claim about n after
   `rounds` rounds of sieving.
     'unit'      — 1: one factor only, neither prime nor composite.
     'struck'    — proven composite: a sieving prime already divided it.
     'prime'     — PROVEN prime: it survived, and it is below q², where q is the
                   next unused sieving prime. (If it were composite its smallest
                   prime factor s would satisfy s² ≤ n < q², so s < q, so s has
                   already had its round and would have struck it.)
     'undecided' — still standing, but not yet proven either way. This is the
                   honest state that keeps 9 from looking prime after round 1.
   At rounds = maxRounds, q is undefined (q² > limit for the next prime), so every
   survivor is proven at once — the flip the whole lab is built around. */
function cellKind(n, rounds, sp) {
  if (n === 1) return 'unit';
  const sr = struckRound(n, sp);
  if (sr !== 0 && sr <= rounds) return 'struck';
  if (rounds === 0) return 'undecided'; // nothing has been proved yet
  const q = sp[rounds];
  if (q === undefined) return 'prime'; // sieve complete: q² > limit
  return n < q * q ? 'prime' : 'undecided';
}

/* Column c of a w-wide grid holds the numbers ≡ (c+1) (mod w). If that residue
   shares a factor with w, every entry BELOW ROW 1 is composite — so only the
   φ(w) columns coprime to w can hold a prime above w. */
function liveResidues(w) {
  const out = [];
  for (let c = 0; c < w; c++) {
    const rr = (c + 1) % w;
    if (gcd(rr, w) === 1) out.push(rr);
  }
  return out;
}

function twinPairs(ps) {
  const out = [];
  for (let i = 0; i + 1 < ps.length; i++) if (ps[i + 1] - ps[i] === 2) out.push([ps[i], ps[i + 1]]);
  return out;
}

function largestGap(ps) {
  let gap = 0;
  let at = null;
  for (let i = 0; i + 1 < ps.length; i++) {
    const d = ps[i + 1] - ps[i];
    if (d > gap) {
      gap = d;
      at = [ps[i], ps[i + 1]];
    }
  }
  return { gap, at };
}

/* prime -> distance to the next prime inside the window */
function gapMap(ps) {
  const m = new Map();
  for (let i = 0; i + 1 < ps.length; i++) m.set(ps[i], ps[i + 1] - ps[i]);
  return m;
}

/* "30 of 120 = 25%" when it divides exactly, "17 of 60 ≈ 28.3%" when it does
   not. The ≈ is never hidden. */
function shareText(k, n) {
  if (n === 0) return '—';
  const exact = (100 * k) % n === 0;
  const v = (100 * k) / n;
  return `${k} of ${n} ${exact ? '=' : '≈'} ${exact ? v : Math.round(v * 10) / 10}%`;
}

function nowMs() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

/* ---- the hunt windows. Each is a stretch of the chart with a handful of
   primes in it; audit-primes.mjs proves the counts and that every window is
   winnable. The grid always starts at 1 so the column rule stays true — the
   window is a highlighted region inside it, not a re-based grid. ---- */
const WINDOWS = [
  { lo: 2, hi: 30 },
  { lo: 20, hi: 50 },
  { lo: 40, hi: 70 },
  { lo: 60, hi: 90 },
  { lo: 70, hi: 100 },
];

function pickWindow(prev) {
  let w = prev;
  while (!w || (prev && w.lo === prev.lo)) w = WINDOWS[Math.floor(Math.random() * WINDOWS.length)];
  return w;
}

/* ===========================================================================
   LESSON — one capability unlocks per step; the last step is the challenge.
   =========================================================================== */
const STEPS = [
  {
    title: 'What makes a number prime',
    body:
      'A PRIME has exactly two factors: 1 and itself. A COMPOSITE has more. ' +
      'And 1 is neither — the unit.',
    q: 'Which is true of every prime number?',
    choices: ['Exactly two factors: 1 and itself', 'It is odd', 'It has no factors'],
    answer: 0,
    feedback: 'Exactly two. 2 is prime and even; 9 is odd and composite (3 × 3).',
  },
  {
    title: 'Strike the multiples of 2',
    body:
      'Eratosthenes’ idea: do not test numbers — ELIMINATE them. Click the ' +
      'circled 2 and watch its multiples fall.',
    q: 'After striking every multiple of 2 ABOVE 2, how many evens are left?',
    choices: ['One — 2 itself', 'None', 'Half of them'],
    answer: 0,
    feedback: '2 survives its own round — the one and only even prime.',
  },
  {
    title: 'The next survivor is the next prime',
    body:
      'The smallest survivor above 2 is 3 — prime, and now it strikes. ' +
      'Then 5. Then 7.',
    q: 'After the 2s and 3s rounds, what is the smallest survivor above 3?',
    choices: ['5', '4', '9'],
    answer: 0,
    feedback: '5. 4 fell as 2 × 2, and 9 fell as 3 × 3. Survive every round — that is prime.',
  },
  {
    title: 'Four rounds is all it takes',
    body: 'Sieve by 5, then 7 — and stop. Every cell still standing turns carmine.',
    q: 'To find every prime up to 100, the largest sieve you need is…',
    choices: ['7 — because 11 × 11 = 121 is past 100', '50', '97'],
    answer: 0,
    feedback:
      'A composite n has a prime factor no bigger than √n, and √100 = 10. ' +
      'So 2, 3, 5, 7 catch everything — surviving IS the proof.',
  },
  {
    title: 'Do the primes ever run out?',
    body: 'Push the window out to 120. The primes thin out — but do they stop?',
    q: 'As you look at bigger and bigger numbers, the primes…',
    choices: ['thin out, but never stop', 'stop at a biggest prime', 'keep the same pace'],
    answer: 0,
    feedback:
      '17 primes in 1–60, only 13 in 61–120 — yet Euclid proved they never end: ' +
      'multiply any list, add 1, and its factors are all NEW primes.',
  },
  {
    title: 'Gaps and twins',
    body:
      'Turn on the gap markers. Pairs just 2 apart are the TWIN PRIMES, ' +
      'marked gold.',
    q: 'Apart from 2 and 3, can two primes ever be just 1 apart?',
    choices: ['No — one of them would be even', 'Yes — 7 and 8', 'Only for very large numbers'],
    answer: 0,
    feedback:
      'Of two neighbours one is even, and the only even prime is 2. ' +
      'Twins like 11 & 13 are the closest.',
  },
  {
    title: 'Primes hide in columns',
    body:
      'Set the width to 6: every prime above 3 falls into just the columns ' +
      'headed 1 and 5!',
    q: 'With 6 columns, why can no prime above 3 sit in the column headed 4?',
    choices: [
      'Every number in it is 6k + 4, which 2 divides',
      'Every number in it is a multiple of 4',
      'Coincidence',
    ],
    answer: 0,
    feedback:
      'That column is all even. Only headers sharing NO factor with 6 survive — ' +
      'so every prime above 3 is 6k − 1 or 6k + 1.',
  },
  {
    title: 'Hunt the primes',
    body:
      'The sieve is off. Click every prime in the lit window — and only ' +
      'the primes. A wrong catch shows the factor you missed.',
    calib: true,
  },
];

/* ===========================================================================
   COMPONENT
   =========================================================================== */
export default function PrimeNumbersLab() {
  const [limit, setLimit] = useState(60);
  const [w, setW] = useState(10);
  const [rounds, setRounds] = useState(0);
  const [gaps, setGaps] = useState(false); // lens: gap-to-next-prime markers
  const [cols, setCols] = useState(false); // lens: dead-column wash + headers
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [note, setNote] = useState('');
  const [win, setWin] = useState(null); // the hunt window
  const [found, setFound] = useState([]);
  const [wrong, setWrong] = useState(null); // { n, text }

  const current = STEPS[step];
  const hunt = !!current.calib;

  /* ---- refs -------------------------------------------------------------- */
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const layoutRef = useRef(null);
  const rafRef = useRef(0);
  const runRef = useRef(null);
  const reducedRef = useRef(false);
  const seededRef = useRef({});

  /* ---- derived, exact math ---------------------------------------------- */
  const sp = useMemo(() => sievePrimesFor(limit), [limit]);
  const maxRounds = sp.length;
  const rows = Math.ceil(limit / w); // also the stage's aspect: w / rows
  const r = Math.min(rounds, maxRounds);
  const complete = r === maxRounds && maxRounds > 0;
  const skipPrime = useMemo(() => nextSievePrime(limit), [limit]);
  const primes = useMemo(() => primesUpTo(limit), [limit]);
  const gm = useMemo(() => gapMap(primes), [primes]);
  const twins = useMemo(() => twinPairs(primes), [primes]);
  const big = useMemo(() => largestGap(primes), [primes]);
  const live = useMemo(() => liveResidues(w), [w]);

  /* what the picture currently CLAIMS, counted from the same rule it draws */
  const counts = useMemo(() => {
    let prime = 0;
    let undecided = 0;
    let struck = 0;
    for (let n = 1; n <= limit; n++) {
      const k = cellKind(n, r, sp);
      if (k === 'prime') prime++;
      else if (k === 'undecided') undecided++;
      else if (k === 'struck') struck++;
    }
    return { prime, undecided, struck };
  }, [limit, r, sp]);

  /* thinning, exact: primes in the first half vs the second half of the window */
  const halves = useMemo(() => {
    const mid = Math.floor(limit / 2);
    const lo = primes.filter((p) => p <= mid).length;
    return { mid, lo, hi: primes.length - lo };
  }, [primes, limit]);

  /* ---- the hunt --------------------------------------------------------- */
  const winPrimes = useMemo(
    () => (win ? primesUpTo(win.hi).filter((p) => p >= win.lo) : []),
    [win]
  );
  const foundSet = useMemo(() => new Set(found), [found]);
  /* found ⊆ winPrimes ALWAYS (a cell is only added after isPrime passes), so
     found.length === winPrimes.length ⟺ every prime in the window was caught.
     That is why the stamp cannot be faked — proven exhaustively by the audit. */
  const calibrated = hunt && winPrimes.length > 0 && found.length === winPrimes.length;
  const pct = winPrimes.length ? Math.round((100 * found.length) / winPrimes.length) : 0;

  sceneRef.current = {
    ...sceneRef.current,
    limit,
    w,
    rounds: r,
    maxRounds,
    sp,
    gaps,
    cols,
    hunt,
    win,
    foundSet,
    wrongN: wrong ? wrong.n : 0,
    gm,
  };

  /* ---- reduced-motion awareness ----------------------------------------- */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = m.matches;
    const h = () => (reducedRef.current = m.matches);
    m.addEventListener ? m.addEventListener('change', h) : m.addListener(h);
    return () => (m.removeEventListener ? m.removeEventListener('change', h) : m.removeListener(h));
  }, []);

  /* a smaller window may need fewer rounds than are already done */
  useEffect(() => {
    setRounds((x) => Math.min(x, maxRounds));
  }, [maxRounds]);

  /* seed each lens step with a picture that is instantly worth looking at */
  useEffect(() => {
    if (step >= 3 && !seededRef.current.sieved) {
      seededRef.current.sieved = true;
      setRounds(sievePrimesFor(60).length); // arrive at "four rounds" fully sieved
    }
    if (step >= 5 && !seededRef.current.gaps) {
      seededRef.current.gaps = true;
      setGaps(true);
    }
    if (step >= 6 && !seededRef.current.cols) {
      seededRef.current.cols = true;
      setCols(true);
      setW(6);
      setLimit(60); // 6 columns × 10 rows: the two carmine stripes at full size
    }
  }, [step]);

  /* entering the hunt: pick a window, pin the chart to it, clear the board */
  useEffect(() => {
    if (hunt && win == null) {
      const nw = pickWindow(null);
      setWin(nw);
      setLimit(nw.hi);
      setFound([]);
      setWrong(null);
      setNote('');
    }
  }, [hunt, win]);

  /* a wrong catch explains itself, then clears */
  useEffect(() => {
    if (!wrong) return;
    const id = setTimeout(() => setWrong(null), 2800);
    return () => clearTimeout(id);
  }, [wrong]);

  useEffect(() => setNote(''), [step, limit, w]);

  /* =======================================================================
     RENDER — the sieve grid, redrawn from state.
     ======================================================================= */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const S = sceneRef.current;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;
    /* The hunt's window is chosen by an effect, which lands one render AFTER the
       step flips. Draw nothing until it exists rather than dereference it. */
    if (S.hunt && !S.win) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

    /* faint quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    const GRID = 28;
    for (let gx = GRID; gx < W; gx += GRID) {
      ctx.moveTo(gx + 0.5, 0);
      ctx.lineTo(gx + 0.5, H);
    }
    for (let gy = GRID; gy < H; gy += GRID) {
      ctx.moveTo(0, gy + 0.5);
      ctx.lineTo(W, gy + 0.5);
    }
    ctx.stroke();

    /* --- where the sieve has got to. While running, the round in progress is
       revealed cell by cell; the PROOF still only uses completed rounds, so
       nothing is ever called prime early. --- */
    let eff = S.rounds;
    let sweep = 1;
    let running = false;
    let hotRound = S.rounds;
    if (runRef.current != null) {
      const p = (nowMs() - runRef.current) / RUN_DUR;
      const cont = Math.min(S.maxRounds, p * S.maxRounds);
      const base = Math.min(S.maxRounds, Math.floor(cont));
      if (base < S.maxRounds) {
        eff = base;
        sweep = cont - base;
        hotRound = base + 1;
        running = true;
      } else {
        eff = S.maxRounds;
        hotRound = S.maxRounds;
      }
    }

    const rows = Math.ceil(S.limit / S.w);
    const PAD = 8;
    const hdrH = S.cols ? 18 : 0;
    const cell = Math.min((W - 2 * PAD) / S.w, (H - 2 * PAD - hdrH) / rows);
    const gx0 = (W - cell * S.w) / 2;
    const gy0 = hdrH + PAD + (H - hdrH - 2 * PAD - cell * rows) / 2;
    layoutRef.current = { gx0, gy0, cell, w: S.w, limit: S.limit };

    const fs = Math.max(7, cell * 0.4);
    const inset = Math.max(0.6, cell * 0.035);

    /* ---------------- the cells ---------------- */
    for (let n = 1; n <= S.limit; n++) {
      const i = n - 1;
      const c = i % S.w;
      const rw = Math.floor(i / S.w);
      const x = gx0 + c * cell;
      const y = gy0 + rw * cell;

      let kind;
      let isHot = false;
      if (S.hunt) {
        if (n < S.win.lo || n > S.win.hi) kind = 'out';
        else if (S.foundSet.has(n)) kind = 'prime';
        else if (S.wrongN === n) {
          kind = 'struck';
          isHot = true;
        } else kind = 'undecided';
      } else {
        kind = cellKind(n, eff, S.sp);
        const sr = struckRound(n, S.sp);
        if (running && kind === 'undecided' && sr === hotRound && n / S.limit <= sweep) {
          kind = 'struck'; // this round is landing right now
          isHot = true;
        } else if (kind === 'struck' && sr === hotRound) isHot = true;
      }

      let fill = 'rgba(255,255,255,0.9)';
      let stroke = 'rgba(28,43,58,0.22)';
      let lw = 1;
      let txt = INK;
      let bold = false;
      let dash = false;
      if (kind === 'unit') {
        fill = 'rgba(28,43,58,0.035)';
        stroke = 'rgba(28,43,58,0.3)';
        txt = INK_SOFT;
        dash = true;
      } else if (kind === 'out') {
        fill = 'rgba(255,255,255,0.35)';
        stroke = 'rgba(28,43,58,0.07)';
        txt = 'rgba(28,43,58,0.2)';
      } else if (kind === 'struck') {
        /* ONE ACCENT: carmine means PRIME and nothing else. The round landing
           right now is emphasised in a stronger BLUE — never carmine, or the
           composites would shout louder than the primes they are clearing. */
        fill = isHot ? 'rgba(47,111,159,0.17)' : 'rgba(47,111,159,0.05)';
        stroke = isHot ? 'rgba(47,111,159,0.6)' : 'rgba(47,111,159,0.16)';
        txt = isHot ? 'rgba(47,111,159,0.95)' : 'rgba(91,107,123,0.5)';
      } else if (kind === 'prime') {
        fill = 'rgba(200,30,79,0.13)';
        stroke = CURVE;
        lw = 1.6;
        txt = CURVE;
        bold = true;
      }

      roundRect(ctx, x + inset, y + inset, cell - 2 * inset, cell - 2 * inset, Math.min(4, cell * 0.12));
      ctx.fillStyle = fill;
      ctx.fill();
      if (dash) ctx.setLineDash([3, 3]);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.setLineDash([]);

      if (kind === 'struck') {
        ctx.strokeStyle = isHot ? 'rgba(47,111,159,0.75)' : 'rgba(47,111,159,0.28)';
        ctx.lineWidth = isHot ? 1.6 : 1.2;
        ctx.beginPath();
        ctx.moveTo(x + cell * 0.2, y + cell * 0.8);
        ctx.lineTo(x + cell * 0.8, y + cell * 0.2);
        ctx.stroke();
      }

      /* the sieving primes: a second inner ring = "this one did the striking".
         The next one to use is dashed — an invitation to click it. */
      if (!S.hunt) {
        const used = S.sp.indexOf(n);
        if (used >= 0 && used < eff) {
          roundRect(ctx, x + cell * 0.16, y + cell * 0.16, cell * 0.68, cell * 0.68, 3);
          ctx.strokeStyle = 'rgba(200,30,79,0.45)';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (used === eff && !running) {
          roundRect(ctx, x + cell * 0.16, y + cell * 0.16, cell * 0.68, cell * 0.68, 3);
          ctx.setLineDash([2.5, 2.5]);
          ctx.strokeStyle = CURVE;
          ctx.lineWidth = 1.3;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${bold ? 700 : 500} ${fs}px ${MONO}`;
      ctx.fillStyle = txt;
      ctx.fillText(String(n), x + cell / 2, y + cell / 2 + 0.5);

      /* the gap lens: how far to the next prime. Gold = a twin. */
      if (S.gaps && !S.hunt && kind === 'prime' && cell >= 30) {
        const g = S.gm.get(n);
        if (g) {
          ctx.font = `${g === 2 ? 700 : 400} ${Math.max(7.5, fs * 0.5)}px ${MONO}`;
          ctx.fillStyle = g === 2 ? GOLD_DK : 'rgba(91,107,123,0.85)';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText('+' + g, x + cell - cell * 0.11, y + cell - cell * 0.1);
        }
      }
    }

    /* ---------------- the column lens, washed OVER the cells ----------------
       A dead column can hold no prime below row 1 (proved: its residue shares a
       factor with w), so this wash never dulls a carmine cell. */
    if (S.cols) {
      for (let c = 0; c < S.w; c++) {
        const rr = (c + 1) % S.w;
        const isLive = gcd(rr, S.w) === 1;
        const x = gx0 + c * cell;
        if (!isLive) {
          const lastRow = Math.floor((S.limit - 1 - c) / S.w);
          if (lastRow >= 1) {
            ctx.fillStyle = 'rgba(28,43,58,0.075)';
            ctx.fillRect(x, gy0 + cell, cell, cell * lastRow);
          }
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isLive ? INK : 'rgba(28,43,58,0.32)';
        ctx.font = `${isLive ? 700 : 400} 10px ${MONO}`;
        ctx.fillText(String(rr), x + cell / 2, gy0 - 9);
      }
    }

    /* ---------------- the hunt window frame ---------------- */
    if (S.hunt && S.win) {
      ctx.strokeStyle = 'rgba(200,30,79,0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      for (let n = S.win.lo; n <= S.win.hi; n++) {
        const i = n - 1;
        const c = i % S.w;
        const rw = Math.floor(i / S.w);
        const x = gx0 + c * cell;
        const y = gy0 + rw * cell;
        // draw only the edges that face outside the window
        const nb = [
          [n - S.w, x, y, x + cell, y],
          [n + S.w, x, y + cell, x + cell, y + cell],
          [c === 0 ? -1 : n - 1, x, y, x, y + cell],
          [c === S.w - 1 ? -1 : n + 1, x + cell, y, x + cell, y + cell],
        ];
        for (const [m, x1, y1, x2, y2] of nb) {
          if (m >= S.win.lo && m <= S.win.hi) continue;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    }

    S.running = running;
  }, []);

  function roundRect(ctx, x, y, w2, h2, rr) {
    const k = Math.max(0, Math.min(rr, Math.min(w2, h2) / 2));
    ctx.beginPath();
    ctx.moveTo(x + k, y);
    ctx.arcTo(x + w2, y, x + w2, y + h2, k);
    ctx.arcTo(x + w2, y + h2, x, y + h2, k);
    ctx.arcTo(x, y + h2, x, y, k);
    ctx.arcTo(x, y, x + w2, y, k);
    ctx.closePath();
  }

  /* keep the sieve animation going until the last round lands */
  const animate = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const tick = () => {
      draw();
      if (runRef.current != null) {
        const p = (nowMs() - runRef.current) / RUN_DUR;
        if (p >= 1) {
          runRef.current = null;
          setRounds(sceneRef.current.maxRounds);
        } else {
          rafRef.current = requestAnimationFrame(tick);
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [limit, w, rounds, gaps, cols, step, win, found, wrong, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /* ---- interaction: the grid is inspectable, and clickable ---------------- */
  const hitCell = (ev) => {
    const L = layoutRef.current;
    const canvas = canvasRef.current;
    if (!L || !canvas) return 0;
    const b = canvas.getBoundingClientRect();
    const px = ev.clientX - b.left;
    const py = ev.clientY - b.top;
    const c = Math.floor((px - L.gx0) / L.cell);
    const rw = Math.floor((py - L.gy0) / L.cell);
    if (c < 0 || c >= L.w || rw < 0) return 0;
    const n = rw * L.w + c + 1;
    return n >= 1 && n <= L.limit ? n : 0;
  };

  const onPointerDown = (ev) => {
    const n = hitCell(ev);
    if (!n) return;
    if (hunt) {
      if (!win || n < win.lo || n > win.hi) return; // outside the window: not in play
      if (foundSet.has(n)) return;
      if (isPrime(n)) {
        setFound((f) => (f.includes(n) ? f : [...f, n]));
        setWrong(null);
        setNote(`${n} is prime — nothing but 1 and ${n} divides it.`);
      } else if (n === 1) {
        setWrong({ n, text: '1 has only one factor, so it is the unit — neither prime nor composite.' });
      } else {
        const d = smallestFactor(n);
        setWrong({ n, text: `${n} is not prime: ${n} = ${d} × ${n / d}.` });
      }
      return;
    }
    /* lesson mode: click the next sieving prime to run its round; click
       anything else to interrogate it */
    if (n === sp[r]) {
      setRounds(r + 1);
      setNote(`Sieving by ${n}: striking ${n} × 2, ${n} × 3, ${n} × 4, …`);
      return;
    }
    const kind = cellKind(n, r, sp);
    if (kind === 'unit') setNote('1 has only one factor — it is the unit, neither prime nor composite.');
    else if (kind === 'struck') {
      const sr = struckRound(n, sp);
      const p = sp[sr - 1];
      setNote(`${n} = ${p} × ${n / p} — struck in round ${sr}, so it is composite.`);
    } else if (kind === 'prime') setNote(`${n} is prime: it survived, and every prime below √${n} has had its round.`);
    else setNote(`${n} is still undecided — no prime has struck it yet, but the sieve is not finished.`);
  };

  function smallestFactor(n) {
    for (let d = 2; d * d <= n; d++) if (n % d === 0) return d;
    return n;
  }

  /* ---- controls ---------------------------------------------------------- */
  const runSieve = () => {
    if (reducedRef.current) {
      setRounds(maxRounds);
      return;
    }
    setRounds(0);
    runRef.current = nowMs();
    animate();
  };
  const stopRun = () => {
    runRef.current = null;
    cancelAnimationFrame(rafRef.current);
  };
  const setRoundsSafe = (v) => {
    stopRun();
    setRounds(Math.max(0, Math.min(maxRounds, v)));
  };
  const revealOne = () => {
    const missing = winPrimes.find((p) => !foundSet.has(p));
    if (missing == null) return;
    setFound((f) => [...f, missing]);
    setNote(`${missing} is prime — one for free.`);
  };
  const newWindow = () => {
    const nw = pickWindow(win);
    setWin(nw);
    setLimit(nw.hi);
    setFound([]);
    setWrong(null);
    setNote('');
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* ---- spoken description for screen readers ----------------------------- */
  const spoken = hunt
    ? `Prime hunt. Find the primes between ${win ? win.lo : 0} and ${win ? win.hi : 0}. Found ${
        found.length
      } of ${winPrimes.length}.${calibrated ? ' Calibrated.' : ''}`
    : `A sieve grid of the numbers 1 to ${limit} in ${w} columns. ${r} of ${maxRounds} rounds done${
        r > 0 ? `, sieving by ${sp.slice(0, r).join(', ')}` : ''
      }. ${counts.prime} numbers proven prime, ${counts.struck} struck out as composite, ${
        counts.undecided
      } undecided. ${complete ? `The sieve is complete: there are ${primes.length} primes up to ${limit}.` : ''}`;

  return (
    <div className="primelab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Prime Numbers</h1>
        <p className="lede">
          You don’t find the primes by <em>testing</em> numbers — you find them by getting rid of
          everything else. Strike the multiples of 2, then 3, then 5, then 7, and stop. Whatever is
          still standing is prime, and <em>surviving is the proof</em>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="prod mono">
              {hunt && win ? (
                <>
                  <span className="eq">find every prime from </span>
                  <span className="pn">{win.lo}</span>
                  <span className="eq"> to </span>
                  <span className="pn">{win.hi}</span>
                  <span className="eq"> · caught </span>
                  <span className="pp">{found.length}</span>
                  <span className="eq"> of {winPrimes.length}</span>
                </>
              ) : complete ? (
                <>
                  <span className="pp">{counts.prime}</span>
                  <span className="eq"> primes up to </span>
                  <span className="pn">{limit}</span>
                  <span className="eq"> — every survivor is prime</span>
                </>
              ) : (
                <>
                  <span className="pp">{counts.prime}</span>
                  <span className="eq"> proven prime · </span>
                  <span className="pn">{counts.undecided}</span>
                  <span className="eq"> undecided · {counts.struck} struck</span>
                </>
              )}
            </p>
            {!hunt && step >= 3 && (
              <p className="expo mono" aria-hidden="true">
                sieve by {sp.join(', ')} · stop: {skipPrime}² = {skipPrime * skipPrime} &gt; {limit}
              </p>
            )}
          </div>

          <div
            className="stage"
            ref={stageRef}
            role="img"
            aria-label={spoken}
            style={{ '--ar': (w / rows).toFixed(4) }}
          >
            <canvas ref={canvasRef} onPointerDown={onPointerDown} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <p className={'note mono' + (wrong ? ' bad' : '')}>
            {wrong
              ? wrong.text
              : note ||
                (hunt
                  ? 'Click a number you believe is prime — only the lit window is in play.'
                  : r < maxRounds
                  ? `Click any cell to interrogate it. Next: sieve by ${sp[r]} — the circled cell.`
                  : 'Click any cell to interrogate it. The sieve is complete.')}
          </p>

          {!hunt && (
            <div className="tickrow">
              <label className="ticklab mono" htmlFor="roundr">
                sieve
              </label>
              <input
                id="roundr"
                type="range"
                min={0}
                max={maxRounds}
                step={1}
                value={r}
                aria-label="Sieve rounds completed"
                disabled={step < 1}
                onChange={(e) => setRoundsSafe(parseInt(e.target.value, 10))}
              />
              <output className="tickv mono">
                {r} / {maxRounds}
              </output>
            </div>
          )}

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="sw" style={{ background: CURVE }} /> proven prime
            </span>
            <span className="lg">
              <span className="sw struck" /> struck — has a smaller factor
            </span>
            {!hunt && (
              <span className="lg">
                <span className="sw open" /> undecided
              </span>
            )}
            {gaps && !hunt && (
              <span className="lg">
                <span className="sw" style={{ background: GOLD }} /> +2 gap = twin primes
              </span>
            )}
            {cols && (
              <span className="lg">
                <span className="sw dead" /> column can hold no prime
              </span>
            )}
          </div>

          {/* NB: every fact below that names the primes is gated on !hunt. During
              the hunt these same rows would print the answer the student is being
              asked to find. */}
          <div className="facts">
            <div className="fact">
              <span className="fact-k">{hunt ? 'Caught' : complete ? 'Primes up to N' : 'Proven prime so far'}</span>
              <span className="fact-v mono" style={{ color: CURVE, fontWeight: 700 }}>
                {hunt ? `${found.length} of ${winPrimes.length}` : complete ? primes.length : counts.prime}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">{hunt ? 'A method that always works' : 'Rounds needed'}</span>
              <span className="fact-v mono">
                {/* sp is exactly the primes with p² ≤ N, so it is precisely the
                    trial-division list needed for every number on this chart —
                    never a hardcoded "2, 3, 5, 7". */}
                {hunt
                  ? `try dividing by ${sp.join(', ')} — nothing bigger is needed`
                  : `${maxRounds} — sieve by ${sp.join(', ')}`}
              </span>
            </div>
            {complete && !hunt && (
              <div className="fact wide">
                <span className="fact-k">The primes</span>
                <span className="fact-v mono" style={{ color: CURVE }}>
                  {primes.join('  ')}
                </span>
              </div>
            )}
            {complete && !hunt && (
              <div className="fact">
                <span className="fact-k">Share that are prime</span>
                <span className="fact-v mono">{shareText(primes.length, limit)}</span>
              </div>
            )}
            {complete && !hunt && step >= 4 && (
              <div className="fact">
                <span className="fact-k">Thinning out</span>
                <span className="fact-v mono">
                  1–{halves.mid}: {halves.lo} · {halves.mid + 1}–{limit}: {halves.hi}
                </span>
              </div>
            )}
            {complete && !hunt && step >= 5 && big.at && (
              <div className="fact">
                <span className="fact-k">Largest gap</span>
                <span className="fact-v mono">
                  {big.gap} — from {big.at[0]} to {big.at[1]}
                </span>
              </div>
            )}
            {complete && !hunt && step >= 5 && (
              <div className="fact">
                <span className="fact-k">Twin prime pairs</span>
                <span className="fact-v mono">
                  {twins.length}
                  {twins.length ? ' — ' : ''}
                  {twins
                    .slice(0, 4)
                    .map(([p, q2]) => `(${p}, ${q2})`)
                    .join(' ')}
                  {twins.length > 4 ? ' …' : ''}
                </span>
              </div>
            )}
            {cols && (
              <div className="fact wide">
                <span className="fact-k">Columns that can hold a prime</span>
                <span className="fact-v mono">
                  {live.length} of {w} — the numbers ≡ {live.join(', ')} (mod {w})
                </span>
              </div>
            )}
          </div>

          <div className="toolbar">
            {!hunt ? (
              <>
                <button type="button" className="btn ghost" onClick={runSieve} disabled={step < 1}>
                  ▶ Run the sieve
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setRoundsSafe(r + 1)}
                  disabled={step < 1 || r >= maxRounds}
                >
                  Sieve +1
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setRoundsSafe(0)}
                  disabled={step < 1 || r === 0}
                >
                  Reset
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn ghost" onClick={revealOne} disabled={calibrated}>
                  Reveal one
                </button>
                <button type="button" className="btn ghost" onClick={() => setFound([])} disabled={!found.length}>
                  Clear
                </button>
              </>
            )}
            {(step >= 5 || gaps) && !hunt && (
              <button
                type="button"
                className={'lens' + (gaps ? ' on' : '')}
                onClick={() => setGaps((g) => !g)}
                aria-pressed={gaps}
              >
                gaps
              </button>
            )}
            {(step >= 6 || cols) && (
              <button
                type="button"
                className={'lens' + (cols ? ' on' : '')}
                onClick={() => setCols((c) => !c)}
                aria-pressed={cols}
              >
                columns
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

          <p className="eyebrow small">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2>{current.title}</h2>
          <p className="body">{current.body}</p>

          {!hunt ? (
            <div className="picker">
              <label className="dial">
                <span className="dk">N</span>
                <span className="drole">how far the chart runs</span>
                <input
                  type="range"
                  min={LIMIT_MIN}
                  max={LIMIT_MAX}
                  step={1}
                  value={limit}
                  aria-label="How far the chart runs"
                  disabled={step < 4}
                  onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                />
                <output className="dv">{limit}</output>
              </label>
              <label className="dial">
                <span className="dk">w</span>
                <span className="drole">columns in the grid</span>
                <input
                  type="range"
                  min={W_MIN}
                  max={W_MAX}
                  step={1}
                  value={w}
                  aria-label="Columns in the grid"
                  disabled={step < 6}
                  onChange={(e) => setW(parseInt(e.target.value, 10))}
                />
                <output className="dv">{w}</output>
              </label>
              {step >= 4 && (
                <div className="presets" role="group" aria-label="Quick windows">
                  {[30, 50, 60, 100, 120].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={'preset mono' + (limit === v ? ' on' : '')}
                      onClick={() => setLimit(v)}
                    >
                      to {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="challenge">
              <div className="chbox">
                <span className="chk mono">Window</span>
                <span className="chv mono">
                  {win ? `${win.lo}–${win.hi}` : '—'}
                </span>
              </div>
              <div className="picker">
                <label className="dial">
                  <span className="dk">w</span>
                  <span className="drole">columns — the lens still helps</span>
                  <input
                    type="range"
                    min={W_MIN}
                    max={W_MAX}
                    step={1}
                    value={w}
                    aria-label="Columns in the grid"
                    onChange={(e) => setW(parseInt(e.target.value, 10))}
                  />
                  <output className="dv">{w}</output>
                </label>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {found.length} of {winPrimes.length} caught
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">{pct}%</span>
                )}
              </div>
              <div className="chbtns">
                <button type="button" className="btn" onClick={newWindow}>
                  New window
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
                  setWin(null);
                  setFound([]);
                  setWrong(null);
                  setLimit(60);
                  setW(10);
                  setRounds(0);
                  setGaps(false);
                  setCols(false);
                  setNote('');
                  seededRef.current = {};
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">a prime has exactly two factors: 1 and itself</span> &nbsp;·&nbsp; the
        Sieve of Eratosthenes strikes the multiples of every prime p with p² ≤ N and stops — because a
        composite always has a prime factor no bigger than its own square root, whatever is left
        standing is prime. 1 is the unit: neither prime nor composite. CCSS&nbsp;4.OA.B.4.
      </footer>

      <style jsx>{`
        .primelab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #2f6f9f;
          --gold: #c8891e;
          --gold-dk: #8f6410;
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
        .mono {
          font-family: var(--mono);
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0 0 6px;
        }
        .eyebrow.small {
          margin: 0 0 4px;
        }
        h1 {
          font-family: var(--serif);
          font-weight: 600;
          font-size: clamp(26px, 4vw, 34px);
          margin: 0 0 6px;
        }
        .lede {
          color: var(--ink-soft);
          margin: 0 0 22px;
          max-width: 74ch;
        }
        .lede em {
          font-style: italic;
          color: var(--ink);
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 350px;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 940px) {
          .bench {
            grid-template-columns: 1fr;
          }
        }
        .panel {
          background: #fff;
          border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel {
          padding: 14px;
        }
        .stage-head {
          margin-bottom: 10px;
          min-height: 26px;
        }
        .prod {
          font-variant-numeric: tabular-nums;
          font-size: 19px;
          font-weight: 600;
          margin: 0;
          color: var(--ink);
          line-height: 1.3;
        }
        .prod .eq {
          color: var(--ink-soft);
          font-weight: 400;
        }
        .prod .pp {
          color: var(--curve);
          font-weight: 700;
        }
        .prod .pn {
          color: var(--ink);
        }
        .expo {
          margin: 3px 0 0;
          font-size: 14px;
          color: var(--ink-soft);
          font-variant-numeric: tabular-nums;
        }
        /* The stage takes the SHAPE OF THE GRID. --ar is set inline to
           columns/rows, so a 6-wide chart is a portrait card and a 10-wide one is
           landscape; either way the cells fill the box instead of floating in a
           letterboxed margin. Height is fixed and width follows. */
        .stage {
          position: relative;
          --stage-h: 520px;
          height: var(--stage-h);
          width: min(100%, calc(var(--stage-h) * var(--ar, 1.4)));
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
          touch-action: manipulation;
          cursor: pointer;
        }
        .note {
          max-width: 720px;
          margin: 10px auto 0;
          min-height: 30px;
          font-size: 12.5px;
          line-height: 1.35;
          color: var(--ink);
          background: rgba(47, 111, 159, 0.07);
          border-left: 3px solid var(--blue);
          padding: 7px 10px;
          border-radius: 0 6px 6px 0;
          box-sizing: border-box;
        }
        /* a wrong catch reads slate, matching .choice.wrong — carmine is
           reserved for primes and must never come to mean "error" */
        .note.bad {
          background: rgba(91, 107, 123, 0.12);
          border-left-color: var(--ink-soft);
          font-weight: 600;
        }
        .tickrow {
          display: grid;
          grid-template-columns: 42px 1fr 54px;
          align-items: center;
          gap: 10px;
          max-width: 720px;
          margin: 12px auto 0;
        }
        .ticklab {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .tickrow input[type='range'] {
          width: 100%;
          cursor: pointer;
          accent-color: var(--curve);
        }
        .tickrow input[type='range']:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }
        .tickv {
          text-align: right;
          font-size: 13px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          justify-content: center;
          margin: 10px 4px 2px;
          font-size: 12px;
          color: var(--ink-soft);
        }
        .lg {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .sw {
          width: 13px;
          height: 13px;
          border-radius: 3px;
          display: inline-block;
        }
        .sw.struck {
          background: rgba(47, 111, 159, 0.12);
          border: 1px solid rgba(47, 111, 159, 0.45);
        }
        .sw.open {
          background: #fff;
          border: 1px solid rgba(28, 43, 58, 0.3);
        }
        .sw.dead {
          background: rgba(28, 43, 58, 0.16);
          border: 1px solid rgba(28, 43, 58, 0.2);
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin: 12px 4px 4px;
        }
        @media (max-width: 480px) {
          .facts {
            grid-template-columns: 1fr;
          }
        }
        .fact {
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding: 6px 0;
          border-top: 1px solid rgba(28, 43, 58, 0.08);
          min-width: 0;
        }
        .fact.wide {
          grid-column: 1 / -1;
        }
        .fact-k {
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v {
          font-size: 13.5px;
          font-variant-numeric: tabular-nums;
          word-break: break-word;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
        }
        .btn {
          font: 600 13px/1 system-ui, sans-serif;
          padding: 9px 14px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid var(--ink);
          background: var(--ink);
          color: #fff;
          transition: background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
        }
        .btn.ghost {
          background: transparent;
          color: var(--ink);
        }
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn:not(:disabled):hover {
          filter: brightness(1.08);
        }
        .lens {
          font: 600 12px/1 var(--mono);
          letter-spacing: 0.04em;
          padding: 8px 11px;
          border-radius: 999px;
          cursor: pointer;
          border: 1px dashed rgba(28, 43, 58, 0.35);
          background: transparent;
          color: var(--ink-soft);
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .lens:hover {
          border-color: var(--ink);
          color: var(--ink);
        }
        .lens.on {
          border-style: solid;
          border-color: var(--curve);
          background: rgba(200, 30, 79, 0.08);
          color: var(--curve);
        }
        .tutor {
          padding: 18px 20px 20px;
        }
        .progress {
          display: flex;
          gap: 6px;
          margin-bottom: 14px;
        }
        .pip {
          height: 5px;
          flex: 1;
          border-radius: 3px;
          background: rgba(28, 43, 58, 0.14);
        }
        .pip.done {
          background: rgba(200, 30, 79, 0.45);
        }
        .pip.cur {
          background: var(--curve);
        }
        h2 {
          font-family: var(--serif);
          font-weight: 600;
          font-size: 20px;
          margin: 0 0 10px;
          padding-bottom: 9px;
          border-bottom: 3px double rgba(200, 30, 79, 0.45);
        }
        .body {
          margin: 0 0 16px;
          font-size: 14.5px;
        }
        .picker {
          display: grid;
          gap: 10px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 22px 1fr 46px;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 2px 10px;
        }
        .dk {
          grid-row: 1 / 3;
          font-family: var(--serif);
          font-style: italic;
          font-size: 19px;
        }
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
          cursor: pointer;
        }
        .dial input[type='range']:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }
        .dv {
          grid-column: 3;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 14px;
          font-weight: 700;
        }
        .presets {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .preset {
          font-size: 13px;
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.14s, background 0.14s;
        }
        .preset:hover {
          border-color: var(--ink);
        }
        .preset.on {
          border-color: var(--curve);
          background: rgba(200, 30, 79, 0.08);
          color: var(--curve);
        }
        .challenge {
          display: grid;
          gap: 10px;
          margin-bottom: 6px;
        }
        .chbox {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(28, 43, 58, 0.15);
          background: linear-gradient(180deg, #fff 0%, #f6f8f9 100%);
        }
        .chk {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .chv {
          font-size: 30px;
          font-weight: 700;
          color: var(--curve);
          font-variant-numeric: tabular-nums;
        }
        .chbtns {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.5), var(--curve));
          transition: width 0.18s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .stamp {
          font: 700 12px/1 var(--mono);
          letter-spacing: 0.16em;
          color: var(--ok);
          border: 2px solid var(--ok);
          border-radius: 6px;
          padding: 4px 8px;
          transform: rotate(-3deg);
        }
        .quiz {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(28, 43, 58, 0.1);
        }
        .q {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 10px;
        }
        .choices {
          display: grid;
          gap: 7px;
        }
        .choice {
          text-align: left;
          font: 13.5px/1.4 system-ui, sans-serif;
          padding: 9px 11px 9px 30px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 8px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          position: relative;
          transition: border-color 0.15s, background 0.15s;
        }
        .choice:not(:disabled):hover {
          border-color: var(--ink);
        }
        .choice .mark {
          position: absolute;
          left: 10px;
          font-weight: 700;
        }
        .choice.correct {
          border-color: var(--ok);
          background: rgba(31, 138, 91, 0.08);
        }
        .choice.correct .mark {
          color: var(--ok);
        }
        .choice.wrong {
          border-color: var(--ink-soft);
          background: rgba(91, 107, 123, 0.08);
        }
        .choice.wrong .mark {
          color: var(--ink-soft);
        }
        .choice.dim {
          opacity: 0.55;
        }
        .choice:disabled {
          cursor: default;
        }
        .feedback {
          margin: 12px 0 0;
          font-size: 13px;
          line-height: 1.55;
          color: var(--ink);
          background: rgba(200, 137, 30, 0.08);
          border-left: 3px solid var(--gold);
          padding: 10px 12px;
          border-radius: 0 6px 6px 0;
        }
        .nav {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }
        .foot {
          margin-top: 24px;
          font-size: 12.5px;
          color: var(--ink-soft);
        }
        :global(.primelab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (max-width: 520px) {
          .stage {
            --stage-h: 460px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .preset,
          .lens {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
