'use client';

/* ============================================================================
   CountingLab — an interactive "bench" for COUNTING & CARDINALITY, 0 … 20.

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is the FOUNDATION
   lab of the whole library (CCSS K.CC — Counting and Cardinality), pitched at
   a 4–6 year old meeting the very first idea in mathematics: that a set of
   things has a "how many," and counting is how you find it.

   House style: the interactive-math-bench standard — a manipulable canvas,
   dials that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter.

   THE SIGNATURE CENTERPIECE is ONE-TO-ONE CORRESPONDENCE resolving into
   CARDINALITY.  You press "Count" and a highlight touches each object in turn,
   saying one number word per object — 1, 2, 3, … — and the crux of the whole
   lab is that the LAST number you say is boxed and re-read as the total:
   "the last number you say is HOW MANY there are."  That leap from the count
   sequence to a cardinal quantity is the counting analogue of the number
   line's count-on hops or the distance formula's right triangle — the one
   picture the entire subject hangs on.

   It teaches, one step at a time, the five pillars of K.CC:
     • one-to-one correspondence  (one number word per object, K.CC.B.4a)
     • cardinality                (the last word said = how many, K.CC.B.4b)
     • the successor / "one more"  (each next number is one larger, K.CC.B.4c)
     • order irrelevance          (arrangement never changes the count, K.CC.B.4b)
     • comparison                 (more / fewer / same, by matching, K.CC.C.6)
   plus the four canonical arrangements — ten-frame, line, circle, scatter
   (K.CC.B.5) — and the numeral ↔ number-word ↔ quantity link (K.CC.A.3).

   One-accent discipline, adapted for a COUNTING lab: carmine marks the thing
   being taught — the set we are counting (Group A) and its cardinal number.
   Soft blue is the neutral second set (Group B) we compare against, exactly as
   --quad is the neutral secondary in the function labs.  Gold is the moving
   "finger" that touches each object as it is counted.

   K-MOTION TREATMENT (pilot, 2026-07-16). The counters are drawn as APPLES
   (Group A — still carmine) and BERRIES (Group B — still blue): colour variety
   lives in the objects, the semantic accents are unchanged (the apple leaf is
   a muted olive, deliberately distinct from the correctness green). Motion:
   a bounce under the counting finger and on tap, a FLIP glide when the
   arrangement changes (+1 grows the new apple in), a confetti burst + stamp
   pop on CALIBRATED, and spoken count words (speechSynthesis) behind a voice
   toggle. Every effect decorates state transitions — none gates ANSWERED or
   CALIBRATED, the settled geometry is layoutCounters' verbatim output (what
   the audit checks), and everything honours prefers-reduced-motion.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/CountingLab.jsx
     2. Import and render it:
          import CountingLab from './CountingLab';
          export default function Page() { return <CountingLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (n, m, lesson step).
     MODEL  — the math is pure integer counting; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Two whole-number set sizes. Group A (n) is the set we
   count; Group B (m) unlocks only at the comparison step. Each dial unlocks
   one lesson step later than a child needs it, so ideas arrive one at a time.
   ------------------------------------------------------------------------- */
const NMAX = 20; // "count to answer how many, up to 20 things" (K.CC.B.5)
const PARAMS = [
  { key: 'n', label: 'n', min: 0, max: NMAX, step: 1, unlock: 1, role: 'how many are in Group A' },
  { key: 'm', label: 'm', min: 0, max: NMAX, step: 1, unlock: 4, role: 'how many are in Group B — to compare' },
];
const START = { n: 5, m: 3 };

/* Lesson-step landmarks (indices into STEPS) so the render + handlers can ask
   "are we on the comparison step?" without hard-coding numbers everywhere. */
const ONE2ONE_STEP = 1; // the n dial + one-to-one correspondence
const CARD_STEP = 2; // cardinality: the last number is how many
const MORE_STEP = 3; // the successor: one more, and order does not matter
const COMPARE_STEP = 4; // the m dial + more / fewer / same
const CALIB_STEP = 5; // build-the-number calibration

/* The four canonical arrangements a set can be counted in (K.CC.B.5). */
const ARRANGEMENTS = ['tenframe', 'line', 'circle', 'scatter'];
const ARR_LABEL = {
  tenframe: 'Ten-frame',
  line: 'Line',
  circle: 'Circle',
  scatter: 'Scatter',
};

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Counting is exact whole-number arithmetic; there is nothing
   to approximate. The "how many" of a set of size n is simply n (cardinality),
   and comparison is a sign test. Kept as functions so the bench stays
   state → model → render.
   ------------------------------------------------------------------------- */
const cardinality = (n) => n; // the number of objects IS n — the whole point
const successor = (n) => n + 1; // each next number is exactly one more
// Group A relative to Group B: 'more' | 'fewer' | 'same'
const compare = (a, b) => (a > b ? 'more' : a < b ? 'fewer' : 'same');

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown only after answering); the distractors are
   real early-counter misconceptions (skip/double-count, the count is the first
   or biggest number said, rearranging changes the amount, "more" means bigger
   objects not more of them). Next is gated on ANSWERED, never on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet counting',
    body: 'Group A has 5 red apples. Press “Count” — the gold finger touches each one.',
    q: 'How many numbers for each object?',
    choices: ['Exactly one', 'As many as you like', 'Two'],
    answer: 0,
    feedback: 'One number for one object. No skips, no repeats!',
  },
  {
    title: 'One counter, one number',
    body: 'The finger lands on each apple exactly once. Tap one!',
    q: 'Counting 6 toys, a child says “five” twice. What happens?',
    choices: ['A miscount', 'It is fine', 'They get 7'],
    answer: 0,
    feedback: 'A repeat breaks the rule. Touch each toy as you count.',
  },
  {
    title: 'How many? — the last number',
    body: 'Count the group. The LAST number gets a box — it tells HOW MANY.',
    q: 'The last number you say is “seven”. How many?',
    choices: ['Seven', 'One', 'Count again to know'],
    answer: 0,
    feedback: 'Seven! The last number said is the total.',
  },
  {
    title: 'One more, any way they sit',
    body: 'Press “+1 more”. Then switch the arrangement. Watch the count.',
    q: '8 apples slide into a circle. How many now?',
    choices: ['Still 8', '9', 'It depends'],
    answer: 0,
    feedback: 'Still 8. Moving apples never changes the count.',
  },
  {
    title: 'More, fewer, or the same',
    body: 'Group B is blue. Thin lines pair the groups up.',
    q: 'A has 6, B has 4. Which is true?',
    choices: ['A has more', 'B has more', 'The same'],
    answer: 0,
    feedback: 'Four pairs form. A has 2 left over — A has more.',
  },
  {
    title: 'Build the number',
    body: 'Make Group A match the target. Fill the dashed outline!',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): produce a set of a GIVEN size N. This is cardinality run in
   reverse — instead of "count this set, how many?", it is "make a set of this
   many" — and it welds the numeral and the number-word to the quantity
   (K.CC.A.3). The meter is plain integer closeness; CALIBRATED only on an
   exact hit. Every target 3..20 is reachable with the n dial (0..20).
   ------------------------------------------------------------------------- */
const matchPercent = (n, N) => 100 * Math.max(0, 1 - Math.abs(n - N) / 6);
const isCalibrated = (n, N) => n === N;

function makeTarget(prev) {
  let N;
  do {
    N = 3 + Math.floor(Math.random() * 18); // 3 … 20, all reachable, none trivially 0/1/2
  } while (prev != null && N === prev);
  return N;
}

/* ---------------------------------------------------------------------------
   Formatting helpers.
   ------------------------------------------------------------------------- */
const numToWord = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty',
];
const word = (n) => numToWord[n] ?? String(n);

/* EDIT 5 — "Equation" display. Counting has no a+b=c equation; its symbolic
   statement is the count SEQUENCE resolving into the cardinal number:
   1, 2, 3, 4, 5 → 5.  The arrow into the boxed final number IS the cardinality
   principle rendered as symbols: the last number you say is how many. */
function CountReadout({ n }) {
  if (n === 0) {
    return (
      <span className="eq">
        <span className="t-num">0</span>
        <span className="t-op">&nbsp;· none to count</span>
      </span>
    );
  }
  const compact = n > 12; // keep the sequence short for large n
  const lead = compact ? [1, 2, 3] : Array.from({ length: n - 1 }, (_, i) => i + 1);
  return (
    <span className="eq">
      {lead.map((k) => (
        <span key={k} className="t-seq">
          {k}
        </span>
      ))}
      {compact && <span className="t-seq t-dots">⋯</span>}
      <span className="t-op">&nbsp;→&nbsp;</span>
      <span className="t-num">{n}</span>
    </span>
  );
}

/* Deterministic 0..1 hash for the scatter arrangement — same n & seed always
   give the same layout, so a full redraw never makes the counters jump. */
const frac = (x) => x - Math.floor(x);
const hash1 = (i, seed) => frac(Math.sin(i * 127.1 + seed * 311.7) * 43758.5453);
const hash2 = (i, seed) => frac(Math.sin(i * 269.5 + seed * 183.3) * 43758.5453);

/* Pure layout: given a set size k and a pixel box, return disc centres in
   COUNTING ORDER, a shared radius, and (for the ten-frame) the empty-cell
   outlines. Knows nothing about React or drawing — just geometry. */
function layoutCounters(k, box, arrangement, seed) {
  const discs = [];
  const outlines = []; // ten-frame empty cells: { x, y, s }
  let r = 12;

  if (arrangement === 'tenframe') {
    const frames = k > 10 ? 2 : 1; // one ten-frame, or a double ten-frame for 11..20
    const cols = 5;
    const rows = frames * 2;
    const frameGap = 0.55; // extra vertical gap (in cells) between the two frames
    // largest square cell that fits the box, leaving a little breathing room
    const cell = Math.min(
      box.w / (cols + 0.5),
      box.h / (rows + (frames - 1) * frameGap + 0.5)
    );
    r = cell * 0.34;
    const gridW = cols * cell;
    const gridH = rows * cell + (frames - 1) * frameGap * cell;
    const left = box.x + (box.w - gridW) / 2;
    const top = box.y + (box.h - gridH) / 2;
    const cellCentre = (i) => {
      const f = Math.floor(i / 10);
      const c = i % 10;
      const rr = Math.floor(c / 5); // row within the frame (0 top, 1 bottom)
      const cc = c % 5; // column 0..4
      const x = left + cc * cell + cell / 2;
      const y = top + (f * 2 + rr) * cell + f * frameGap * cell + cell / 2;
      return { x, y, s: cell };
    };
    const totalCells = frames * 10;
    for (let i = 0; i < totalCells; i++) {
      const p = cellCentre(i);
      if (i < k) discs.push({ x: p.x, y: p.y });
      else outlines.push(p);
    }
    // include filled cells' outlines too, so the frame reads as a full grid
    for (let i = 0; i < Math.min(k, totalCells); i++) outlines.push(cellCentre(i));
    return { discs, outlines, r, cell };
  }

  if (arrangement === 'line') {
    if (k === 0) return { discs, outlines, r };
    const gap = Math.min(box.w / k, 66);
    r = Math.min(gap * 0.36, box.h * 0.3, 24);
    const totalW = gap * k;
    const startX = box.x + (box.w - totalW) / 2 + gap / 2;
    const y = box.y + box.h / 2;
    for (let i = 0; i < k; i++) discs.push({ x: startX + i * gap, y });
    return { discs, outlines, r };
  }

  if (arrangement === 'circle') {
    if (k === 0) return { discs, outlines, r };
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const R = Math.min(box.w, box.h) * 0.38;
    if (k === 1) {
      r = Math.min(R * 0.5, 24);
      discs.push({ x: cx, y: cy });
      return { discs, outlines, r, ring: { cx, cy, R } };
    }
    const arc = (2 * Math.PI * R) / k;
    r = Math.max(6, Math.min(arc * 0.33, 22));
    for (let i = 0; i < k; i++) {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / k; // start at top, go clockwise
      discs.push({ x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) });
    }
    return { discs, outlines, r, ring: { cx, cy, R } };
  }

  // scatter — a deterministic JITTERED GRID. It reads as an informal scattered
  // pile, but every counter keeps its own cell and is only nudged within it, so
  // no two ever overlap — essential in a counting lab, where each object must
  // stay visibly distinct to be counted exactly once.
  if (k === 0) return { discs, outlines, r };
  const aspect = box.w / box.h;
  const cols = Math.max(1, Math.ceil(Math.sqrt(k * aspect)));
  const rows = Math.max(1, Math.ceil(k / cols));
  const cellW = box.w / cols;
  const cellH = box.h / rows;
  r = Math.max(9, Math.min(20, Math.min(cellW, cellH) * 0.28));
  const jit = 0.36; // fraction of a cell a counter may wander from its centre
  for (let i = 0; i < k; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = box.x + (col + 0.5) * cellW + (hash1(i, seed) - 0.5) * jit * cellW;
    const y = box.y + (row + 0.5) * cellH + (hash2(i, seed) - 0.5) * jit * cellH;
    discs.push({ x, y });
  }
  return { discs, outlines, r };
}

/* True when the user asks for reduced motion — every animation checks this. */
const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function CountingLab() {
  const [n, setN] = useState(START.n);
  const [m, setM] = useState(START.m);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [counting, setCounting] = useState(false);
  const [arrangement, setArrangement] = useState('tenframe');
  const [burst, setBurst] = useState(0); // confetti burst id (0 = none)
  const [everCounted, setEverCounted] = useState(false); // Count button attention pulse
  const [canSpeak, setCanSpeak] = useState(false);
  const [speechOn, setSpeechOn] = useState(true);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // index of the counter under the pointer, or null
  const countRef = useRef(null); // counting state: null = idle, else # counted so far (0..n)
  const sceneRef = useRef({});
  const countPhaseRef = useRef(0); // 0..1 progress of the finger within its dwell on a counter
  const flipRef = useRef(null); // { from: [{x,y}], t0, dur } — rearrangement glide
  const bounceRef = useRef(null); // { i, t0 } — transient pop on one counter
  const lastDiscsRef = useRef(null); // positions as last DRAWN (mid-flip aware), for chained flips
  const rafPendingRef = useRef(false); // guards the self-scheduling redraw during flip/bounce
  const lastSpokeRef = useRef(-1); // last counter index spoken during a count
  const prevCalRef = useRef(false); // previous calibrated value, to fire the burst on the edge
  const speechRef = useRef({ ok: false, on: true });

  /* speech support detection + cleanup (the TeenNumbersLab pattern) */
  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'speechSynthesis' in window;
    speechRef.current.ok = ok;
    setCanSpeak(ok);
    return () => {
      if (ok) window.speechSynthesis.cancel();
    };
  }, []);
  useEffect(() => {
    speechRef.current.on = speechOn;
    if (!speechOn && speechRef.current.ok) window.speechSynthesis.cancel();
  }, [speechOn]);

  /* spoken narration (audio only, never displayed) — cancel-then-speak keeps
     the voice in step with the finger */
  const say = (text) => {
    const s = speechRef.current;
    if (!s.ok || !s.on) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.pitch = 1.05;
      window.speechSynthesis.speak(u);
    } catch {
      /* speech is decoration — never let it break the lab */
    }
  };

  const current = STEPS[step];
  const calib = !!current.calib;
  const comparing = step === COMPARE_STEP;

  // Effective arrangement: comparison forces a line (so the matching lines are
  // clean columns); calibration forces a ten-frame (so "fill to the number" is
  // a crisp target); otherwise the child's chosen arrangement.
  const effArr = comparing ? 'line' : calib ? 'tenframe' : arrangement;

  const card = cardinality(n);
  const rel = compare(n, m); // A vs B

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer/animation handlers never read stale values.
  sceneRef.current = {
    n,
    m,
    step,
    calib,
    comparing,
    target,
    counting,
    arrangement: effArr,
    showLast: step >= CARD_STEP, // box/emphasise the cardinal from the cardinality step on
  };

  const pct = target != null ? matchPercent(n, target) : 0;
  const calibrated = target != null ? isCalibrated(n, target) : false;

  /* ---- full redraw from state -------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // capped for perf & crisp lines
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    /* palette (kept in one place so the drawing matches the CSS tokens) */
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const PAPER = '#FBFBF8';
    const CARMINE = '#C81E4F'; // Group A — the set being counted (the accent)
    const CARM_SOFT = 'rgba(200,30,79,0.14)';
    const BLUE = '#3F74A6'; // Group B — the neutral set we compare against
    const BLUE_SOFT = 'rgba(63,116,166,0.16)';
    const GOLD = '#D9982B'; // the counting "finger" + leftover-has-no-partner ring
    const CELL = 'rgba(28,43,58,0.16)'; // ten-frame outlines
    const LEAF = '#7F9A3D'; // apple leaf — muted olive, NOT the correctness green
    const STEM = '#7A5230'; // apple stem
    const BERRY_DARK = '#2C5578'; // berry calyx

    const S = sceneRef.current;

    ctx.clearRect(0, 0, W, H);

    /* ---- warm K wash under the quadrille (pale sky → cream, no semantics) - */
    const wash = ctx.createLinearGradient(0, 0, 0, H);
    wash.addColorStop(0, 'rgba(214,231,244,0.45)');
    wash.addColorStop(1, 'rgba(255,246,224,0.5)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);

    /* ---- faint quadrille paper backdrop ------------------------------------ */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    const ggrid = 28;
    for (let x = ggrid; x < W; x += ggrid) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, H);
    }
    for (let y = ggrid; y < H; y += ggrid) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(W, Math.round(y) + 0.5);
    }
    ctx.stroke();

    /* small helper: draw one counter as a friendly object ------------------
       kind 'apple' (Group A, carmine) | 'berry' (Group B, blue). The fruit
       details are pure decoration — the countable unit is still one disc, and
       details are skipped below r≈9px so small counters stay crisply distinct. */
    const drawDisc = (x, y, r, opts) => {
      const { fill, ring, ringW = 3, tag, tagColor, hollow, glow, kind = 'apple' } = opts;
      const fruity = !hollow && r >= 9;
      ctx.save();
      if (glow) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = 12;
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (hollow) {
        ctx.fillStyle = PAPER;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = fill;
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.shadowBlur = 0;
        // subtle top highlight so the disc reads as a physical counter
        ctx.beginPath();
        ctx.arc(x - r * 0.28, y - r * 0.3, r * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fill();
      }
      if (fruity && kind === 'apple') {
        // stem
        ctx.strokeStyle = STEM;
        ctx.lineWidth = Math.max(1.5, r * 0.13);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y - r * 0.92);
        ctx.quadraticCurveTo(x + r * 0.06, y - r * 1.18, x + r * 0.16, y - r * 1.34);
        ctx.stroke();
        // leaf (muted olive — deliberately not the correctness green)
        ctx.fillStyle = LEAF;
        ctx.beginPath();
        ctx.ellipse(x + r * 0.48, y - r * 1.12, r * 0.34, r * 0.15, -0.55, 0, Math.PI * 2);
        ctx.fill();
      } else if (fruity && kind === 'berry') {
        // five-point calyx star at the crown
        ctx.fillStyle = BERRY_DARK;
        const sy = y - r * 0.5;
        const sr = r * 0.24;
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
          const ax = x + sr * Math.cos(a);
          const ay = sy + sr * 0.8 * Math.sin(a);
          const b = a + Math.PI / 5;
          const bx = x + sr * 0.42 * Math.cos(b);
          const by = sy + sr * 0.34 * Math.sin(b);
          if (k === 0) ctx.moveTo(ax, ay);
          else ctx.lineTo(ax, ay);
          ctx.lineTo(bx, by);
        }
        ctx.closePath();
        ctx.fill();
      }
      if (ring) {
        ctx.beginPath();
        ctx.arc(x, y, r + ringW - 1, 0, Math.PI * 2);
        ctx.lineWidth = ringW;
        ctx.strokeStyle = ring;
        ctx.stroke();
      }
      if (tag != null) {
        ctx.fillStyle = tagColor || '#fff';
        ctx.font = `700 ${Math.max(10, Math.round(r * 0.95))}px ui-monospace, "SF Mono", Menlo, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(tag), x, y + 0.5);
      }
      ctx.restore();
    };

    /* label above a group ("N in all" pill / running count) ---------------- */
    const drawPill = (cx, topY, text, color) => {
      ctx.save();
      ctx.font = '700 15px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(text).width;
      const bw = tw + 18;
      const bh = 24;
      let px = cx;
      px = Math.min(Math.max(px, bw / 2 + 4), W - bw / 2 - 4);
      const py = Math.max(topY - bh - 4, 4);
      const rr = 7;
      const bx = px - bw / 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(bx + rr, py);
      ctx.arcTo(bx + bw, py, bx + bw, py + bh, rr);
      ctx.arcTo(bx + bw, py + bh, bx, py + bh, rr);
      ctx.arcTo(bx, py + bh, bx, py, rr);
      ctx.arcTo(bx, py, bx + bw, py, rr);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, px, py + bh / 2 + 0.5);
      ctx.restore();
    };

    /* ============ COMPARISON MODE (Group A over Group B) ================== */
    if (S.comparing) {
      flipRef.current = null; // no glide across mode switches
      lastDiscsRef.current = null;
      const padX = 40;
      const boxW = W - padX * 2;
      const boxAY = H * 0.16;
      const boxBY = H * 0.62;
      const rowH = H * 0.2;
      const k = Math.max(S.n, S.m, 1);
      const gap = Math.min(boxW / k, 54);
      const totalW = gap * k;
      const startX = padX + (boxW - totalW) / 2 + gap / 2;
      const rr = Math.min(gap * 0.34, rowH * 0.42, 20);
      const posA = [];
      const posB = [];
      for (let i = 0; i < S.n; i++) posA.push({ x: startX + i * gap, y: boxAY });
      for (let i = 0; i < S.m; i++) posB.push({ x: startX + i * gap, y: boxBY });

      // one-to-one matching lines between paired counters
      const pairs = Math.min(S.n, S.m);
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.32)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < pairs; i++) {
        ctx.beginPath();
        ctx.moveTo(posA[i].x, posA[i].y + rr);
        ctx.lineTo(posB[i].x, posB[i].y - rr);
        ctx.stroke();
      }
      ctx.restore();

      // draw the discs; leftover (unpaired) discs of the bigger group glow gold
      for (let i = 0; i < S.n; i++) {
        const leftover = i >= pairs;
        drawDisc(posA[i].x, posA[i].y, rr, {
          fill: CARMINE,
          ring: leftover ? GOLD : null,
          ringW: 3,
          glow: leftover ? 'rgba(217,152,43,0.9)' : null,
        });
      }
      for (let i = 0; i < S.m; i++) {
        const leftover = i >= pairs;
        drawDisc(posB[i].x, posB[i].y, rr, {
          fill: BLUE,
          kind: 'berry',
          ring: leftover ? GOLD : null,
          ringW: 3,
          glow: leftover ? 'rgba(217,152,43,0.9)' : null,
        });
      }

      // row labels
      ctx.save();
      ctx.font = '600 13px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = CARMINE;
      ctx.fillText(`A = ${S.n}`, 8, boxAY);
      ctx.fillStyle = BLUE;
      ctx.fillText(`B = ${S.m}`, 8, boxBY);
      ctx.restore();

      // verdict banner
      const relTxt =
        S.n === S.m
          ? `same — ${S.n} = ${S.m}`
          : S.n > S.m
            ? `A has more — ${S.n} > ${S.m}  (${S.n - S.m} left over)`
            : `B has more — ${S.m} > ${S.n}  (${S.m - S.n} left over)`;
      const relColor = S.n === S.m ? INK : S.n > S.m ? CARMINE : BLUE;
      // the verdict headline sits at the TOP of the canvas, clear of the
      // bottom-left legend pill (whose "= Group B" text would otherwise collide
      // with the banner and misread as "Group B has more")
      ctx.save();
      ctx.font = '700 15px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(relTxt).width;
      const bx = (W - tw) / 2 - 12;
      const by = 10;
      ctx.fillStyle = 'rgba(251,251,248,0.94)';
      ctx.fillRect(bx, by, tw + 24, 26);
      ctx.strokeStyle = relColor;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(bx + 0.5, by + 0.5, tw + 23, 25);
      ctx.fillStyle = relColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(relTxt, W / 2, by + 13);
      ctx.restore();
      return;
    }

    /* ============ SINGLE-GROUP MODE (count Group A) ====================== */
    const box = { x: 30, y: H * 0.12, w: W - 60, h: H * 0.66 };
    const seed = 1; // stable scatter layout
    const L = layoutCounters(S.n, box, S.arrangement, seed);

    /* K-motion: FLIP glide. Discs are DRAWN interpolating from their last
       drawn positions toward layoutCounters' output; the settled state is the
       verbatim model layout, so the audited geometry is untouched. A disc with
       no origin (the +1 apple) grows in at its target cell. */
    const nowT = performance.now();
    let discsAt = L.discs;
    const flip = flipRef.current;
    if (flip) {
      const t = (nowT - flip.t0) / flip.dur;
      if (t >= 1) {
        flipRef.current = null;
      } else {
        const k = 1 - Math.pow(1 - t, 3); // easeOutCubic
        discsAt = L.discs.map((p, i) => {
          const f = flip.from[i];
          return f
            ? { x: f.x + (p.x - f.x) * k, y: f.y + (p.y - f.y) * k, grow: 1 }
            : { x: p.x, y: p.y, grow: k };
        });
      }
    }
    /* transient pop: 0→peak→0 over the life of the bounce */
    const bounceAmt = (t) => 1 + 0.28 * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));

    // guide ring for the circle arrangement
    if (S.arrangement === 'circle' && L.ring) {
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.14)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(L.ring.cx, L.ring.cy, L.ring.R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // ten-frame empty-cell outlines
    if (S.arrangement === 'tenframe') {
      ctx.save();
      for (const c of L.outlines) {
        const s = c.s * 0.9;
        ctx.strokeStyle = CELL;
        ctx.lineWidth = 1.4;
        roundRect(ctx, c.x - s / 2, c.y - s / 2, s, s, 6);
        ctx.stroke();
      }
      ctx.restore();
    }

    // calibration: dashed target outline of N cells to "fill" (ten-frame)
    if (S.calib && S.target != null && S.arrangement === 'tenframe') {
      const T = layoutCounters(S.target, box, 'tenframe', seed);
      ctx.save();
      ctx.strokeStyle = 'rgba(200,30,79,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      // the target discs occupy the first N cells; ring each target cell
      const cells = layoutCounters(S.target, box, 'tenframe', seed);
      for (let i = 0; i < S.target; i++) {
        const p = cells.discs[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, T.r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // counting animation state.  countRef.current is:
    //   null      → idle (all counters resting, no tags)
    //   0..n-1    → the gold finger is on this counter index right now
    //   >= n      → finished (every counter tagged, cardinal ring on the last)
    const cur = countRef.current; // finger index, or null/idle, or n/finished
    const finished = cur != null && cur >= S.n && S.n > 0;

    // draw the counters
    for (let i = 0; i < S.n; i++) {
      const p = discsAt[i];
      if (!p) continue;
      let opts;
      if (cur == null) {
        // idle: all counters filled, no tags
        opts = { fill: CARMINE };
      } else if (finished) {
        // finished: every counter tagged 1..n; the LAST one gets the cardinal
        // ring, so "the last number you say IS how many" is literally circled
        const isLast = i === S.n - 1;
        opts = {
          fill: CARMINE,
          tag: i + 1,
          ring: isLast && S.showLast ? GOLD : null,
          ringW: 4,
          glow: isLast && S.showLast ? 'rgba(217,152,43,0.9)' : null,
        };
      } else if (i < cur) {
        // already counted (behind the finger): filled + its number tag
        opts = { fill: CARMINE, tag: i + 1 };
      } else if (i === cur) {
        // the counter the finger is on right now — its tag is the number we say
        opts = { fill: CARMINE, ring: GOLD, ringW: 4, tag: i + 1, glow: 'rgba(217,152,43,0.95)' };
      } else {
        // not yet counted
        opts = { fill: CARMINE, hollow: true };
      }
      // K-motion scales: grow-in (FLIP), the finger's landing pop, tap pop
      let scale = p.grow ?? 1;
      if (cur != null && !finished && i === cur) {
        scale *= bounceAmt(Math.min(1, (countPhaseRef.current || 0) * 2));
      }
      const b = bounceRef.current;
      if (b && b.i === i) {
        const bt = (nowT - b.t0) / 420;
        if (bt >= 1) bounceRef.current = null;
        else scale *= bounceAmt(bt);
      }
      drawDisc(p.x, p.y, L.r * scale, opts);
    }

    // remember what was actually drawn (mid-flip aware) so a chained
    // rearrangement glides from where the apples visibly are
    lastDiscsRef.current = { discs: discsAt.map((p) => ({ x: p.x, y: p.y })), n: S.n };

    // keep painting while a flip or bounce is in flight
    if ((flipRef.current || bounceRef.current) && !rafPendingRef.current) {
      rafPendingRef.current = true;
      requestAnimationFrame(() => {
        rafPendingRef.current = false;
        draw();
      });
    }

    // the "N in all" pill (or running count while animating) above the group
    if (S.n > 0) {
      let topY = Infinity;
      let sumX = 0;
      for (let i = 0; i < S.n; i++) {
        const p = L.discs[i];
        if (!p) continue;
        topY = Math.min(topY, p.y - L.r);
        sumX += p.x;
      }
      const cx = sumX / S.n;
      if (cur != null && !finished) {
        // the running count names the counter the finger is on (1-based)
        drawPill(cx, topY, `counting… ${Math.min(cur + 1, S.n)}`, INK_SOFT);
      } else {
        drawPill(cx, topY, `${S.n} in all`, CARMINE);
      }
    } else {
      // n = 0 — nothing to count
      ctx.save();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 15px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('0 — zero. an empty group has none to count.', W / 2, H * 0.45);
      ctx.restore();
    }

    // hover readout: number the counter under the pointer
    const hv = hoverRef.current;
    if (hv != null && hv < S.n && L.discs[hv]) {
      const p = L.discs[hv];
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, L.r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`#${hv + 1}`, p.x, p.y - L.r - 6);
      ctx.restore();
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [n, m, step, target, counting, arrangement, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step the first time we reach it; reset n
     to 0 so it starts clearly un-built (and clear any counting emphasis). */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setN(0);
      countRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the counting animation — the gold finger visits one counter per tick,
     time-based, opt-in, and respectful of reduced motion. On completion it
     LEAVES countRef at n (not null) so the finished count, with the cardinal
     ring on the last counter, stays on screen as a resting state. */
  useEffect(() => {
    if (!counting) {
      draw();
      return;
    }
    if (n === 0) {
      countRef.current = 0;
      setCounting(false);
      return;
    }
    if (reduceMotion()) {
      countRef.current = n; // show the finished count immediately, no motion
      // spoken (audio only) — still say the cardinal even without motion
      say(`${word(n)} in all`);
      setCounting(false);
      return;
    }
    let raf;
    let start = null;
    const per = 460; // ms the finger dwells on each counter
    countRef.current = 0; // finger starts on the first counter (says "one")
    lastSpokeRef.current = -1;
    const loop = (now) => {
      if (start == null) start = now;
      const cur = Math.floor((now - start) / per); // finger index 0,1,2,…
      countPhaseRef.current = (now - start) / per - cur; // 0..1 within the dwell
      if (cur >= n) {
        countRef.current = n; // finished — rest on the completed count
        bounceRef.current = { i: n - 1, t0: now }; // the cardinal apple pops
        // spoken (audio only) — the cardinality principle, said aloud
        say(`${word(n)} in all`);
        draw();
        setCounting(false);
      } else {
        if (lastSpokeRef.current !== cur) {
          lastSpokeRef.current = cur;
          // spoken (audio only) — one number word per object, as the finger lands
          say(word(cur + 1));
        }
        countRef.current = cur;
        draw();
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counting, n, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const clearCount = () => {
    countRef.current = null;
    if (counting) setCounting(false);
  };

  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'n') setN(v);
    else setM(v);
    clearCount();
  };

  const onPointerMove = (e) => {
    const S = sceneRef.current;
    if (S.comparing) {
      hoverRef.current = null;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const box = { x: 30, y: rect.height * 0.12, w: rect.width - 60, h: rect.height * 0.66 };
    const L = layoutCounters(S.n, box, S.arrangement, 1);
    let best = null;
    let bestD = Infinity;
    for (let i = 0; i < L.discs.length; i++) {
      const p = L.discs[i];
      const d = (p.x - cssX) ** 2 + (p.y - cssY) ** 2;
      if (d < bestD && d <= (L.r + 6) ** 2) {
        bestD = d;
        best = i;
      }
    }
    hoverRef.current = best;
    draw();
  };
  const onPointerLeave = () => {
    hoverRef.current = null;
    draw();
  };

  /* K-motion: tap an apple — it pops and says its counting number */
  const onPointerDown = (e) => {
    const S = sceneRef.current;
    if (S.comparing || S.counting) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const box = { x: 30, y: rect.height * 0.12, w: rect.width - 60, h: rect.height * 0.66 };
    const L = layoutCounters(S.n, box, S.arrangement, 1);
    for (let i = 0; i < L.discs.length; i++) {
      const p = L.discs[i];
      if ((p.x - cssX) ** 2 + (p.y - cssY) ** 2 <= (L.r + 6) ** 2) {
        if (!reduceMotion()) bounceRef.current = { i, t0: performance.now() };
        // spoken (audio only) — the tapped apple's counting number
        say(word(i + 1));
        draw();
        return;
      }
    }
  };

  /* K-motion: glide the apples from where they are to the next layout */
  const startFlip = () => {
    if (reduceMotion()) return;
    const last = lastDiscsRef.current;
    if (!last || !last.discs.length) return;
    flipRef.current = { from: last.discs, t0: performance.now(), dur: 460 };
  };

  const cycleArrangement = () => {
    startFlip();
    setArrangement((a) => {
      const i = ARRANGEMENTS.indexOf(a);
      return ARRANGEMENTS[(i + 1) % ARRANGEMENTS.length];
    });
    clearCount();
  };

  const addOne = () => {
    startFlip();
    setN((v) => Math.min(NMAX, v + 1));
    clearCount();
  };

  const resetDials = () => {
    setN(calib ? 0 : START.n);
    setM(START.m);
    setArrangement('tenframe');
    clearCount();
  };

  const choose = (idx) => {
    if (answers[step] != null) return; // lock the answer once given
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };

  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* K-motion: confetti + voice on the moment CALIBRATED becomes true. The
     stamp itself is driven by isCalibrated exactly as before — this effect
     only decorates the transition and never feeds back into it. */
  useEffect(() => {
    const was = prevCalRef.current;
    prevCalRef.current = calibrated;
    if (!calibrated || was || !calib) return;
    // spoken (audio only) — celebrate the exact build
    say(`You built ${word(target)}!`);
    if (reduceMotion()) return;
    setBurst(Date.now());
    const t = setTimeout(() => setBurst(0), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calibrated]);

  const spoken = comparing
    ? `Comparing two groups. Group A has ${word(n)}, Group B has ${word(m)}. ` +
      (n === m
        ? `They are the same — ${word(n)} equals ${word(m)}.`
        : n > m
          ? `Group A has more; ${word(n)} is more than ${word(m)}.`
          : `Group B has more; ${word(m)} is more than ${word(n)}.`)
    : n === 0
      ? 'The group is empty. Zero counters — none to count.'
      : `Counting Group A: ${Array.from({ length: n }, (_, i) => word(i + 1)).join(', ')}. ` +
        `The last number is ${word(n)}, so there are ${word(n)} in all.`;

  /* header sub-line under the count readout */
  const subLine = comparing
    ? `A = ${n}   B = ${m}   ·   ${
        rel === 'same' ? 'same number' : rel === 'more' ? 'A has more' : 'A has fewer'
      }`
    : `${word(n)}  ·  the last number you say is how many`;

  return (
    <div className="clab">
      <header className="head">
        <h1>Counting &amp; How Many</h1>
        <p className="lede">
          Count each object once. The <em>last number you say</em> is how many.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <CountReadout n={n} />
            </p>
            <p className="equation-sub mono">{subLine}</p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onPointerDown={onPointerDown}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            {burst > 0 && (
              <div className="confetti" aria-hidden="true">
                {Array.from({ length: 26 }, (_, i) => (
                  <span
                    key={i}
                    style={{
                      left: `${(i * 137) % 100}%`,
                      background: ['#c81e4f', '#d9982b', '#3f74a6', '#1f8a5b'][i % 4],
                      animationDelay: `${(i % 7) * 60}ms`,
                      '--drift': `${((i * 53) % 60) - 30}px`,
                    }}
                  />
                ))}
              </div>
            )}
            <span className="hint mono">
              {comparing ? 'red = Group A · blue = Group B' : `arrangement: ${ARR_LABEL[effArr]}`}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — you built ${word(target)}.` : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">How many (count)</span>
              <span className="fact-v mono carm big">{card}</span>
            </div>
            <div className="fact">
              <span className="fact-k">In words</span>
              <span className="fact-v mono">{word(n)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">One more</span>
              <span className="fact-v mono">
                {n < NMAX ? `${n} → ${successor(n)}` : 'at 20 (top)'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">{comparing ? 'Compare A vs B' : 'One less'}</span>
              <span className={'fact-v mono' + (comparing ? ' carm' : '')}>
                {comparing
                  ? rel === 'same'
                    ? `${n} = ${m} · same`
                    : rel === 'more'
                      ? `${n} > ${m} · A more`
                      : `${n} < ${m} · B more`
                  : n > 0
                    ? `${n} → ${n - 1}`
                    : 'none below 0'}
              </span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={
                'btn ghost' +
                (counting ? ' on' : '') +
                (!everCounted && !comparing && n > 0 ? ' attn' : '')
              }
              onClick={() => {
                setEverCounted(true);
                if (counting) clearCount();
                else setCounting(true);
              }}
              disabled={comparing || n === 0}
            >
              {counting ? 'Counting…' : 'Count'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={cycleArrangement}
              disabled={comparing || calib}
              title="Cycle ten-frame · line · circle · scatter"
            >
              Arrange: {ARR_LABEL[effArr]}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={addOne}
              disabled={comparing || n >= NMAX}
            >
              +1 more
            </button>
            <button type="button" className="btn ghost" onClick={resetDials}>
              Reset
            </button>
            {canSpeak && (
              <button
                type="button"
                className={'btn ghost' + (speechOn ? ' on' : '')}
                onClick={() => setSpeechOn((v) => !v)}
                aria-pressed={speechOn}
                aria-label="Toggle spoken counting"
              >
                {speechOn ? '🔊' : '🔇'} voice
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

          <div className="dials">
            {PARAMS.map((d) => {
              const unlocked = step >= d.unlock;
              const val = { n, m }[d.key];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className={'dk ' + d.key}>{d.label}</span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={d.step}
                    value={val}
                    disabled={!unlocked}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? val : '🔒'}</output>
                </label>
              );
            })}
          </div>

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

          {current.calib && target != null && (
            <div className="calib">
              <p className="calib-target">
                Build&nbsp;
                <span className="t-num-inline">{target}</span>
                &nbsp;— <span className="calib-word">{word(target)}</span>
              </p>
              <div className="meter" aria-hidden="true">
                <div
                  className={'meter-fill' + (calibrated ? ' done' : '')}
                  style={{ width: pct.toFixed(0) + '%' }}
                />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    set n = {target} ({n < target ? `${target - n} more` : `${n - target} fewer`})
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setN(0);
                  countRef.current = null;
                }}
              >
                New target
              </button>
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
                  setTarget(null);
                  setArrangement('tenframe');
                  setN(START.n);
                  setM(START.m);
                  countRef.current = null;
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">1, 2, 3, … → how many</span> &nbsp;·&nbsp; one-to-one counting,
        cardinality, and comparison of sets 0–20 (CCSS K.CC).
      </footer>

      <style jsx>{`
        .clab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --setb: #3f74a6;
          --quad: #c7d8e4;
          --gold: #d9982b;
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
          max-width: 68ch;
        }
        .lede em {
          font-style: italic;
          color: var(--ink);
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 920px) {
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
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .equation {
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 20px;
          font-weight: 600;
          margin: 0;
          letter-spacing: 0.01em;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 2px;
        }
        .equation .t-seq {
          color: var(--ink-soft);
          padding: 0 3px;
        }
        .equation .t-dots {
          letter-spacing: 0.1em;
        }
        .equation .t-op {
          color: var(--ink-soft);
        }
        .equation .t-num {
          color: #fff;
          background: var(--curve);
          font-weight: 700;
          border-radius: 6px;
          padding: 1px 9px;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 8 / 5;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        /* On narrow screens the 8:5 ratio gets cramped for a double ten-frame,
           so go a touch taller-than-wide there. */
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 5 / 6;
          }
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .hint {
          position: absolute;
          left: 10px;
          bottom: 9px;
          font-size: 11px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.78);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin: 14px 4px 4px;
        }
        @media (max-width: 460px) {
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
        }
        .fact-k {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v {
          font-size: 15px;
          font-variant-numeric: tabular-nums;
        }
        .fact-v.carm {
          color: var(--curve);
          font-weight: 700;
        }
        .fact-v.big {
          font-size: 22px;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
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
        .btn.ghost.on {
          background: var(--curve);
          border-color: var(--curve);
          color: #fff;
        }
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn:not(:disabled):hover {
          filter: brightness(1.08);
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
        .dials {
          display: grid;
          gap: 12px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 22px 1fr 48px;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 2px 10px;
        }
        .dial.locked {
          opacity: 0.5;
        }
        .dk {
          grid-row: 1 / 3;
          font-family: var(--serif);
          font-style: italic;
          font-size: 19px;
        }
        .dk.n {
          color: var(--curve);
        }
        .dk.m {
          color: var(--setb);
        }
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
          accent-color: var(--ink);
          cursor: pointer;
        }
        .dial input[type='range']:disabled {
          cursor: not-allowed;
        }
        .dv {
          grid-column: 3;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 15px;
          font-weight: 600;
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
          background: rgba(200, 30, 79, 0.05);
          border-left: 3px solid var(--curve);
          padding: 10px 12px;
          border-radius: 0 6px 6px 0;
        }
        .calib {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(28, 43, 58, 0.1);
          display: grid;
          gap: 10px;
        }
        .calib-target {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
        }
        .t-num-inline {
          color: #fff;
          background: var(--curve);
          font-family: var(--mono);
          font-weight: 700;
          border-radius: 6px;
          padding: 1px 10px;
          font-size: 17px;
        }
        .calib-word {
          font-style: italic;
          color: var(--curve);
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--curve));
          transition: width 0.12s ease-out, background 0.2s;
        }
        .meter-fill.done {
          background: var(--ok);
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
          animation: stamp-in 0.45s cubic-bezier(0.2, 1.5, 0.4, 1);
        }
        @keyframes stamp-in {
          from {
            transform: rotate(-3deg) scale(1.9);
            opacity: 0;
          }
          to {
            transform: rotate(-3deg) scale(1);
            opacity: 1;
          }
        }
        .btn.attn {
          animation: gentle-pulse 1.7s ease-in-out infinite;
        }
        @keyframes gentle-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(217, 152, 43, 0);
          }
          50% {
            box-shadow: 0 0 0 7px rgba(217, 152, 43, 0.22);
          }
        }
        .confetti {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .confetti span {
          position: absolute;
          top: -12px;
          width: 9px;
          height: 13px;
          border-radius: 2px;
          opacity: 0;
          animation: confetti-fall 1.3s cubic-bezier(0.25, 0.4, 0.6, 1) forwards;
        }
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translate(var(--drift, 0px), 340px) rotate(560deg);
          }
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
        :global(.clab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice {
            transition: none;
          }
          .stamp,
          .confetti span,
          .btn.attn {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

/* rounded-rect path helper for the ten-frame cell outlines */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
