'use client';

/* ============================================================================
   SortLab — an interactive "bench" for SORTING (classification), the very first
   data skill in the K–2 sequence.  One little tray of nine objects — each one a
   colored shape of a certain size — is sorted into BINS three different ways, and
   the whole lab turns on the idea that ties those three sorts together:

     TO SORT IS TO CHOOSE AN ATTRIBUTE.  THE ATTRIBUTE YOU LOOK AT DECIDES THE
     GROUPS — AND EVERY OBJECT LANDS IN EXACTLY ONE BIN, SO THE BIN COUNTS ALWAYS
     ADD UP TO THE WHOLE GROUP.

   The SAME nine objects sorted by COLOR make three groups (Blue 4, Yellow 3,
   Green 2); sorted by SHAPE they regroup into three different ones (Circle 3,
   Square 4, Triangle 2); sorted by SIZE they fall into just two (Big 5, Small 4).
   Flip the rule and watch every object slide to a new bin while the total never
   changes.  Then we do the piece K.MD.B.3 actually names — "sort the categories
   by count" — and order the bins from most to fewest.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at Kindergarten
   through Grade 2.  Anchor standard: CCSS K.MD.B.3 — "Classify objects into given
   categories; count the numbers of objects in each category and sort the
   categories by count (limit category counts to be less than or equal to 10)."
   Also supports K.MD.A.1 (describe measurable/observable attributes of objects)
   and MP7 (look for and make use of structure).

   A distinct, complementary sibling of the data labs already in this library:
     • ComparingLab compares TWO quantities with >, <, =.  Sort makes and counts
       MANY groups; there is no >/</= here.
     • CountingLab counts ONE collection.  Sort is many collections at once, born
       from a classification rule.
     • GraphsLab / DataLab take counts that are ALREADY categorized and draw them
       (bar / pictograph / pie / dot plot).  Sort is the step BEFORE a graph: the
       act of classifying a jumble by a chosen attribute.  Its unique idea — the
       one no other lab owns — is that the SAME objects regroup when you change
       the attribute.
     • TableLab crosses TWO attributes in a grid.  Sort uses ONE attribute at a
       time.

   House style: the interactive-math-bench standard — quadrille-paper canvas, one
   carmine accent = the mathematical object, controls that unlock one per lesson
   step, predict-then-check questions (Next gates on ANSWERED, not correct), and a
   calibration challenge with a live match meter and a CALIBRATED stamp.

   EXACT MATH — a K-2 child never meets a float artefact:
     • every count is an integer array length (the number of objects in a bin);
     • the total is always exactly 9, and the bin counts provably sum to it
       because each object has exactly one value of each attribute (it is counted
       once);
     • the calibration "match" is an EXACT rational Rand index between two
       partitions (integer pair-counts over C(9,2)=36), and CALIBRATED fires only
       on an exact partition match — never on a float coincidence.

   ONE-ACCENT DISCIPLINE: the object the lab reveals is the CLASSIFICATION itself —
   the focused/most bin, the counts, the "sort-by-count" ranking, and the
   calibration target/meter all wear CARMINE.  The objects carry their own real
   colors (blue / gold / green) because "sort by color" is meaningless if the
   objects have no color — that is the data, not a second accent.  GREEN is
   reserved for "correct" and "CALIBRATED".

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/SortLab.jsx
     2. Import and render it:
          import SortLab from './SortLab';
          export default function Page() { return <SortLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the chosen attribute,
              which objects are placed, the lesson step, the calibration puzzle).
     MODEL  — grouping / counts / Rand index are exact integer arithmetic on the
              fixed OBJECTS table; nothing here knows a pixel.
     RENDER — the canvas is fully redrawn from state on every change; objects glide
              to their targets in a time-based (dt) animation that respects
              prefers-reduced-motion.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — The objects and the attributes.  Nine fixed objects, each with three
   observable attributes.  The counts are chosen so that COLOR and SHAPE give the
   same count-signature (4,3,2) but DIFFERENT members — so a child cannot tell the
   two rules apart by counting alone; they must look at what the bin's objects
   share.  That is the heart of the calibration puzzle.
   ------------------------------------------------------------------------- */
const OBJECTS = [
  { i: 0, color: 'blue', shape: 'circle', size: 'big' },
  { i: 1, color: 'blue', shape: 'square', size: 'small' },
  { i: 2, color: 'blue', shape: 'circle', size: 'small' },
  { i: 3, color: 'blue', shape: 'square', size: 'big' },
  { i: 4, color: 'yellow', shape: 'circle', size: 'big' },
  { i: 5, color: 'yellow', shape: 'square', size: 'small' },
  { i: 6, color: 'yellow', shape: 'triangle', size: 'big' },
  { i: 7, color: 'green', shape: 'square', size: 'big' },
  { i: 8, color: 'green', shape: 'triangle', size: 'small' },
];
const N = OBJECTS.length; // 9

// object paint (real colors — the "color" attribute made visible)
const PAINT = {
  blue: { fill: '#4a83bd', stroke: '#2f5d8a', tint: 'rgba(74,131,189,0.16)' },
  yellow: { fill: '#eab63f', stroke: '#b0801c', tint: 'rgba(234,182,63,0.18)' },
  green: { fill: '#46b184', stroke: '#2c805c', tint: 'rgba(70,177,132,0.16)' },
};

// the three sorting rules; `values` is the canonical bin order for each
const ATTRS = {
  color: {
    key: 'color',
    name: 'Color',
    icon: '🎨',
    values: [
      { v: 'blue', label: 'Blue' },
      { v: 'yellow', label: 'Yellow' },
      { v: 'green', label: 'Green' },
    ],
  },
  shape: {
    key: 'shape',
    name: 'Shape',
    icon: '🔷',
    values: [
      { v: 'circle', label: 'Circle' },
      { v: 'square', label: 'Square' },
      { v: 'triangle', label: 'Triangle' },
    ],
  },
  size: {
    key: 'size',
    name: 'Size',
    icon: '🔍',
    values: [
      { v: 'big', label: 'Big' },
      { v: 'small', label: 'Small' },
    ],
  },
};
const ATTR_ORDER = ['color', 'shape', 'size'];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Pure integer classification on the fixed OBJECTS table.
   ------------------------------------------------------------------------- */
// the blocks (arrays of object ids) for a given attribute, in canonical order
function blocksOf(attr) {
  return ATTRS[attr].values.map((val) => ({
    v: val.v,
    label: val.label,
    ids: OBJECTS.filter((o) => o[attr] === val.v).map((o) => o.i),
  }));
}
// which canonical bin index an object belongs to, for a given attribute
function binIndexOf(objIdx, attr) {
  const v = OBJECTS[objIdx][attr];
  return ATTRS[attr].values.findIndex((val) => val.v === v);
}
// a partition as an assignment array: label[objIdx] = its bin index for `attr`
function assignment(attr) {
  return OBJECTS.map((o) => binIndexOf(o.i, attr));
}

// EXACT Rand index between two attributes' partitions, as {num, den, pct}.
// Counts, over all C(N,2) unordered object pairs, how many pairs the two rules
// AGREE on (together-in-both or apart-in-both).  Purely integer arithmetic.
function randIndex(attrA, attrB) {
  const A = assignment(attrA);
  const B = assignment(attrB);
  let agree = 0;
  let total = 0;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      total++;
      const togA = A[i] === A[j];
      const togB = B[i] === B[j];
      if (togA === togB) agree++;
    }
  }
  return { num: agree, den: total, pct: Math.round((agree * 100) / total) };
}
// two attributes induce the SAME partition of the objects?
function samePartition(attrA, attrB) {
  const A = assignment(attrA);
  const B = assignment(attrB);
  // same partition iff "together" relation matches on every pair
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if ((A[i] === A[j]) !== (B[i] === B[j])) return false;
    }
  }
  return true;
}

// counts of PLACED objects per bin, for the current attribute
function countsFor(attr, placed) {
  return blocksOf(attr).map((b) => b.ids.filter((id) => placed[id]).length);
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Guess the secret rule."  The machine has already sorted
   all nine objects by a HIDDEN attribute; the bins show the objects but the
   headers read "?".  The child guesses which attribute (Color / Shape / Size) the
   machine used.  The meter reads the EXACT Rand-index agreement between the guess
   and the secret rule; CALIBRATED fires only on an exact partition match — and
   because the three partitions are pairwise different, the only 100% is the true
   rule.  (Color and Shape share the count-signature 4,3,2, so a child who only
   counts is stuck at a partial score and must inspect what each bin shares.)
   ------------------------------------------------------------------------- */
function newSecret(prev) {
  let s;
  let guard = 0;
  do {
    s = ATTR_ORDER[Math.floor(Math.random() * ATTR_ORDER.length)];
    guard++;
  } while (prev && s === prev && guard < 20);
  return s;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the rule it teaches unlocks with the step;
   the reveal lives in `feedback` (shown after answering); distractors are real
   K-2 sorting misconceptions ("an object can be in two bins", "the groups never
   change", "count the objects wrong").  Next gates on ANSWERED, not correct.
   `attr` is the rule the step switches to; `place` whether all objects start
   already sorted; `order` whether the sort-by-count view is on.
   ------------------------------------------------------------------------- */
const STEP_MEET = 0;
const STEP_COUNT = 1;
const STEP_SHAPE = 2;
const STEP_SIZE = 3;
const STEP_RULE = 4;
const STEP_ORDER = 5;
const STEP_CALIB = 6;

const STEPS = [
  {
    title: 'Sort the jumble by color',
    attr: 'color',
    place: false,
    order: false,
    body: 'Nine objects, all jumbled. Click one — it flies to its color bin.',
    q: 'Where does a BLUE square go?',
    choices: ['The Blue bin', 'The Square bin', 'Both bins'],
    answer: 0,
    feedback: 'We look only at color. Blue square → Blue bin.',
  },
  {
    title: 'Count each bin',
    attr: 'color',
    place: true,
    order: false,
    body: 'Read each bin’s number. Blue 4, Yellow 3, Green 2.',
    q: '4 blue, 3 yellow, 2 green. How many in ALL?',
    choices: ['9', '4', '3'],
    answer: 0,
    feedback: '4 + 3 + 2 = 9. The bins add back to the whole tray.',
  },
  {
    title: 'Same objects, sort by shape',
    attr: 'shape',
    place: true,
    order: false,
    body: 'Same objects, new rule. Watch them slide to new bins!',
    q: 'Same groups as before?',
    choices: ['No — new rule, new groups', 'Yes', 'No groups now'],
    answer: 0,
    feedback: 'New rule, new groups. The blue group broke apart!',
  },
  {
    title: 'Sort by size',
    attr: 'size',
    place: true,
    order: false,
    body: 'Big or Small — only TWO bins this time.',
    q: 'How many bins does size make?',
    choices: ['2 bins', '3 bins', '1 bin'],
    answer: 0,
    feedback: 'Two: Big and Small. The rule decides how many bins.',
  },
  {
    title: 'The rule decides the groups',
    attr: 'color',
    place: true,
    order: false,
    body: 'Flip the rule. The objects regroup — the tray never changes.',
    q: 'A sort made just 2 bins. Which rule?',
    choices: ['Size', 'Color', 'Shape'],
    answer: 0,
    feedback: 'Only size makes 2 bins. Color and shape make 3.',
  },
  {
    title: 'Sort the bins by count',
    attr: 'color',
    place: true,
    order: true,
    body: 'Now line up the bins: most first, fewest last.',
    q: 'Most to fewest — which color bin is first?',
    choices: ['Blue — the most (4)', 'Green — the fewest (2)', 'All the same'],
    answer: 0,
    feedback: 'Blue 4, Yellow 3, Green 2. Blue wins the crown!',
  },
  {
    title: 'Guess the secret rule',
    attr: 'color',
    place: true,
    order: false,
    calib: true,
    body: 'The labels are hidden! Guess the rule: Color, Shape, or Size.',
    calibHint: 'What do all objects in one bin share?',
  },
];

/* ---------------------------------------------------------------------------
   Small readout chip component (INLINED styles — styled-jsx only scopes a
   component's own JSX, so a child must inline to look identical in Next.js and in
   the plain Babel preview harness).
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';

function BinGlyph({ attr, value }) {
  // a tiny visual token for a bin's rule-value
  if (attr === 'color') {
    return (
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: PAINT[value].fill,
          boxShadow: `inset 0 0 0 1.5px ${PAINT[value].stroke}`,
          display: 'inline-block',
        }}
      />
    );
  }
  if (attr === 'shape') {
    const common = { width: 13, height: 13, display: 'inline-block' };
    if (value === 'circle')
      return <span style={{ ...common, borderRadius: '50%', border: `2px solid ${INK_SOFT}` }} />;
    if (value === 'square')
      return <span style={{ ...common, borderRadius: 2, border: `2px solid ${INK_SOFT}` }} />;
    return (
      <svg width="14" height="13" viewBox="0 0 14 13" aria-hidden="true" style={{ display: 'inline-block' }}>
        <path d="M7 1 L13 12 L1 12 Z" fill="none" stroke={INK_SOFT} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  // size
  const d = value === 'big' ? 13 : 8;
  return (
    <span
      style={{
        width: d,
        height: d,
        borderRadius: '50%',
        background: 'none',
        border: `2px solid ${INK_SOFT}`,
        display: 'inline-block',
      }}
    />
  );
}

function SortReadout({ attr, counts, focus, total, calib, secretRevealed }) {
  const chip = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 999,
    fontFamily: 'system-ui, sans-serif',
    fontSize: 13,
    fontWeight: 600,
  };
  const blocks = blocksOf(attr);
  if (calib && !secretRevealed) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ ...chip, background: CARMINE, color: '#fff' }}>Secret rule&nbsp;?</span>
        <span style={{ color: INK_SOFT, fontSize: 13, fontStyle: 'italic' }}>
          What do the objects in each bin share?
        </span>
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ ...chip, background: INK, color: '#fff' }}>
        {ATTRS[attr].icon}&nbsp;Sorting by {ATTRS[attr].name}
      </span>
      {blocks.map((b, i) => {
        const isFocus = focus === i;
        return (
          <span
            key={b.v}
            style={{
              ...chip,
              background: isFocus ? CARMINE : 'rgba(28,43,58,0.06)',
              color: isFocus ? '#fff' : INK,
            }}
          >
            <BinGlyph attr={attr} value={b.v} />
            {b.label}
            <span
              style={{
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {counts[i]}
            </span>
          </span>
        );
      })}
      <span style={{ color: INK_SOFT, fontSize: 13, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>
        total {total}
      </span>
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function SortLab() {
  const [step, setStep] = useState(0);
  const [attr, setAttr] = useState('color');
  const [placed, setPlaced] = useState(() => OBJECTS.map(() => false)); // step 0 starts jumbled
  const [orderBy, setOrderBy] = useState(false);
  const [focus, setFocus] = useState(null); // focused bin index or null
  const [answers, setAnswers] = useState({});

  // calibration
  const [secret, setSecret] = useState(null); // the hidden attribute
  const [guess, setGuess] = useState(null); // the child's guessed attribute

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const geoRef = useRef({}); // hit geometry, written by render()
  const sceneRef = useRef({}); // snapshot the renderer reads
  const posRef = useRef(OBJECTS.map(() => ({ x: 0, y: 0, init: false }))); // live object positions
  const rafRef = useRef(0);
  const homesRef = useRef(null); // tray scatter homes (pixel), recomputed on resize

  const current = STEPS[step];
  const calib = !!current.calib;
  const effAttr = calib ? secret || 'color' : attr;
  const secretRevealed = calib && guess != null && samePartition(guess, secret);

  // placement used for drawing: in calibration everything is placed
  const effPlaced = calib ? OBJECTS.map(() => true) : placed;

  const counts = countsFor(effAttr, effPlaced);
  const total = effPlaced.filter(Boolean).length;
  const allPlaced = placed.every(Boolean);

  const blocks = blocksOf(effAttr);
  // ranking of bins by count, descending; rankOfBin[binIndex] = 0-based rank
  const ranking = useMemo(() => {
    const idx = counts.map((c, i) => i);
    idx.sort((a, b) => counts[b] - counts[a] || a - b);
    const rankOfBin = new Array(counts.length).fill(0);
    idx.forEach((binI, r) => (rankOfBin[binI] = r));
    return { order: idx, rankOfBin };
  }, [counts]);

  const mostIdx = ranking.order.length ? ranking.order[0] : -1;
  const leastIdx = ranking.order.length ? ranking.order[ranking.order.length - 1] : -1;

  // calibration meter
  const matchPct = calib && guess != null ? randIndex(guess, secret).pct : 0;
  const calibrated = calib && guess != null && samePartition(guess, secret);

  /* ---- snapshot for the renderer (never reads stale values) -------------- */
  sceneRef.current = {
    attr: effAttr,
    placed: effPlaced,
    orderBy: orderBy && !calib,
    focus: calib ? null : focus,
    calib,
    secretRevealed,
    ranking,
    mostIdx,
  };

  /* ---- layout: compute bins + per-object targets from state + size ------- */
  const computeLayout = useCallback((Wd, Hd, S) => {
    const pad = 12;
    const trayH = Math.round(Hd * 0.34);
    const trayRect = { x: pad, y: pad + 16, w: Wd - pad * 2, h: trayH - 16 };
    const binsTop = pad + trayH + 8;
    const binsRect = { x: pad, y: binsTop, w: Wd - pad * 2, h: Hd - binsTop - pad };

    const blks = blocksOf(S.attr);
    const nb = blks.length;

    // bin x-order: canonical, or sorted by count (descending) when orderBy
    let order = blks.map((_, i) => i);
    if (S.orderBy) order = S.ranking.order.slice();

    const gap = 12;
    const binW = (binsRect.w - gap * (nb - 1)) / nb;
    const binH = binsRect.h;

    // object radius — kept small enough that a bin never crowds
    const base = Math.max(10, Math.min(17, Math.min(binW / 7.5, Hd / 15.5)));
    const rOf = (sz) => (sz === 'big' ? base * 1.0 : base * 0.66);

    const bins = [];
    order.forEach((binI, slot) => {
      const x = binsRect.x + slot * (binW + gap);
      bins.push({
        binI,
        v: blks[binI].v,
        label: blks[binI].label,
        ids: blks[binI].ids,
        x,
        y: binsRect.y,
        w: binW,
        h: binH,
        rank: S.ranking.rankOfBin[binI],
      });
    });

    // per-object targets
    const headerH = 40;
    const targets = new Array(N);
    // count how many PLACED objects each bin already holds, to lay them in a grid
    bins.forEach((b) => {
      const placedIds = b.ids.filter((id) => S.placed[id]);
      const innerX = b.x + 10;
      const innerY = b.y + headerH;
      const innerW = b.w - 20;
      const innerH = b.h - headerH - 12;
      const n = placedIds.length;
      // a tidy, roomy grid: near-square, but never more columns than fit
      const fitCols = Math.max(1, Math.floor(innerW / (base * 2.3)));
      const cols = Math.max(1, Math.min(fitCols, Math.ceil(Math.sqrt(n))));
      const rowsNeeded = Math.max(1, Math.ceil(n / cols));
      const rowH = Math.min(base * 2.5, innerH / rowsNeeded);
      const gridH = rowH * rowsNeeded;
      const topPad = Math.max(0, (innerH - gridH) / 2);
      placedIds.forEach((id, k) => {
        const col = k % cols;
        const row = Math.floor(k / cols);
        // last (possibly short) row is centered
        const inRow = Math.min(cols, n - row * cols);
        const cx = innerX + (col + 0.5) * (innerW / inRow);
        const cy = innerY + topPad + (row + 0.5) * rowH;
        targets[id] = { tx: cx, ty: cy, r: rOf(OBJECTS[id].size), rot: 0, inBin: true, binI: b.binI };
      });
    });

    // unplaced objects rest at their tray homes
    if (!homesRef.current) homesRef.current = {};
    OBJECTS.forEach((o) => {
      if (targets[o.i]) return;
      const col = o.i % 3;
      const row = Math.floor(o.i / 3);
      const jx = JITTER[o.i][0];
      const jy = JITTER[o.i][1];
      const tx = trayRect.x + (col + 0.5) * (trayRect.w / 3) + jx * trayRect.w * 0.06;
      const ty = trayRect.y + (row + 0.5) * (trayRect.h / 3) + jy * trayRect.h * 0.1;
      targets[o.i] = { tx, ty, r: rOf(o.size), rot: JITTER[o.i][2], inBin: false, binI: -1 };
    });

    return { trayRect, binsRect, bins, targets, headerH };
  }, []);

  /* ---- render everything from state + live positions --------------------- */
  const render = useCallback((layout) => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const Wd = stage.clientWidth;
    const Hd = stage.clientHeight;
    if (Wd === 0 || Hd === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(Wd * dpr) || canvas.height !== Math.round(Hd * dpr)) {
      canvas.width = Math.round(Wd * dpr);
      canvas.height = Math.round(Hd * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, Wd, Hd);

    const S = sceneRef.current;
    const L = layout;

    /* faint quadrille backdrop */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    for (let gx = 0; gx <= Wd; gx += 22) {
      const X = Math.round(gx) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, Hd);
    }
    for (let gy = 0; gy <= Hd; gy += 22) {
      const Y = Math.round(gy) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(Wd, Y);
    }
    ctx.stroke();

    /* ---- tray ---- */
    const tr = L.trayRect;
    roundRect(ctx, tr.x, tr.y, tr.w, tr.h, 12);
    ctx.fillStyle = 'rgba(28,43,58,0.03)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(28,43,58,0.14)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('TRAY', tr.x + 10, L.trayRect.y - 14);
    const anyTray = L.targets.some((t) => !t.inBin);
    if (anyTray && !S.calib) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('click an object to sort it →', tr.x + tr.w / 2, tr.y + tr.h - 12);
    }

    /* ---- bins ---- */
    for (const b of L.bins) {
      const isFocus = S.focus === b.binI;
      const isMost = S.orderBy && b.binI === S.mostIdx;
      const cnt = b.ids.filter((id) => S.placed[id]).length;

      // bin body
      roundRect(ctx, b.x, b.y, b.w, b.h, 12);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.fillStyle = isFocus ? 'rgba(200,30,79,0.05)' : 'rgba(28,43,58,0.015)';
      ctx.fill();
      ctx.lineWidth = isFocus || isMost ? 2.5 : 1.4;
      ctx.strokeStyle = isFocus || isMost ? CARMINE : 'rgba(28,43,58,0.2)';
      ctx.stroke();

      // header — single line when the bin is wide; a compact two-line header
      // (glyph + count on top, label beneath) when it is narrow, so a long label
      // like "Triangle" and the count never collide on a phone-width layout.
      const narrow = b.w < 128;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const hy = narrow ? b.y + 14 : b.y + 20;
      if (S.calib && !S.secretRevealed) {
        // hidden rule
        ctx.fillStyle = CARMINE;
        ctx.font = '800 ' + (narrow ? 17 : 20) + 'px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.fillText('?', b.x + 12, hy);
      } else {
        drawBinGlyph(ctx, S.attr, b.v, b.x + 15, hy, 8);
        ctx.fillStyle = isFocus ? CARMINE : INK;
        if (narrow) {
          ctx.font = '700 11px system-ui, sans-serif';
          ctx.fillText(b.label, b.x + 10, b.y + 30);
        } else {
          ctx.font = '700 14px system-ui, sans-serif';
          ctx.fillText(b.label, b.x + 30, hy);
        }
      }
      // count (right side of the top header line)
      ctx.textAlign = 'right';
      ctx.fillStyle = isFocus || isMost ? CARMINE : INK;
      ctx.font = '800 ' + (narrow ? 18 : 22) + 'px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.fillText(String(cnt), b.x + b.w - 10, hy);

      // rank badge / crown when ordering
      if (S.orderBy) {
        const bx = b.x + b.w / 2;
        const by = b.y - 12;
        if (b.rank === 0) {
          ctx.font = '15px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText('👑', bx, by + 4);
        }
        ctx.fillStyle = b.rank === 0 ? CARMINE : INK_SOFT;
        ctx.font = '700 10px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ordinal(b.rank + 1), bx + (b.rank === 0 ? 16 : 0), by);
      }

      // header divider
      ctx.strokeStyle = 'rgba(28,43,58,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x + 8, b.y + L.headerH - 6);
      ctx.lineTo(b.x + b.w - 8, b.y + L.headerH - 6);
      ctx.stroke();
    }

    /* ---- objects (draw tray ones first, binned ones on top) ---- */
    const pos = posRef.current;
    const orderDraw = OBJECTS.map((o) => o.i).sort((a, b) => {
      const ta = L.targets[a].inBin ? 1 : 0;
      const tb = L.targets[b].inBin ? 1 : 0;
      return ta - tb;
    });
    for (const id of orderDraw) {
      const p = pos[id];
      const t = L.targets[id];
      drawObject(ctx, p.x, p.y, t.r, OBJECTS[id].shape, OBJECTS[id].color, t.rot);
    }

    /* ---- winner reveal in calibration ---- */
    if (S.calib && S.secretRevealed) {
      ctx.fillStyle = '#1f8a5b';
      ctx.font = '700 13px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('✓ the secret rule was ' + ATTRS[S.attr].name.toUpperCase(), Wd / 2, 2);
    }

    // write hit geometry
    geoRef.current = {
      calib: S.calib,
      bins: L.bins.map((b) => ({ binI: b.binI, x: b.x, y: b.y, w: b.w, h: b.h })),
      objects: OBJECTS.map((o) => ({ i: o.i, x: pos[o.i].x, y: pos[o.i].y, r: L.targets[o.i].r })),
    };

    /* helpers */
    function ordinal(n) {
      return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th';
    }
  }, []);

  /* ---- animation loop: glide object positions toward targets ------------- */
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sync = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const Wd = stage.clientWidth;
    const Hd = stage.clientHeight;
    if (Wd === 0 || Hd === 0) return;
    const layout = computeLayout(Wd, Hd, sceneRef.current);

    // initialise any object not yet positioned (mount / resize) to its target
    const pos = posRef.current;
    layout.targets.forEach((t, i) => {
      if (!pos[i].init) {
        pos[i].x = t.tx;
        pos[i].y = t.ty;
        pos[i].init = true;
      }
    });

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    if (reducedMotion) {
      layout.targets.forEach((t, i) => {
        pos[i].x = t.tx;
        pos[i].y = t.ty;
      });
      render(layout);
      return;
    }

    let last = performance.now();
    const stepAnim = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let moving = false;
      layout.targets.forEach((t, i) => {
        const p = pos[i];
        const dx = t.tx - p.x;
        const dy = t.ty - p.y;
        if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) {
          // time-based smoothing (settles ~0.5s) plus a minimum linear speed so a
          // throttled frame rate can never leave an object stranded mid-glide
          const k = 1 - Math.pow(0.00002, dt);
          const dist = Math.hypot(dx, dy);
          const minStep = Math.min(dist, 900 * dt); // px/s floor
          const move = Math.max(k, dist > 0 ? minStep / dist : 0);
          p.x += dx * move;
          p.y += dy * move;
          moving = true;
        } else {
          p.x = t.tx;
          p.y = t.ty;
        }
      });
      render(layout);
      if (moving) rafRef.current = requestAnimationFrame(stepAnim);
      else rafRef.current = 0;
    };
    render(layout);
    rafRef.current = requestAnimationFrame(stepAnim);
  }, [computeLayout, render, reducedMotion]);

  useEffect(() => {
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, attr, placed, orderBy, focus, secret, guess, sync]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      // re-init positions to new pixel space so nothing flies across on resize
      posRef.current.forEach((p) => (p.init = false));
      sync();
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, [sync]);

  useEffect(() => () => rafRef.current && cancelAnimationFrame(rafRef.current), []);

  /* ---- step entry: switch the rule, place/jumble, set up calibration ----- */
  useEffect(() => {
    const s = STEPS[step];
    setOrderBy(!!s.order);
    if (s.calib) {
      setSecret((prev) => prev || newSecret(null));
      setGuess(null);
      setFocus(null);
      setPlaced(OBJECTS.map(() => true));
    } else {
      setAttr(s.attr);
      setPlaced(OBJECTS.map(() => s.place));
      setFocus(null);
      setSecret(null);
      setGuess(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const onPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const g = geoRef.current;
    if (!g) return;

    if (g.calib) return; // calibration is solved with the rule buttons, not the canvas

    // topmost object hit first
    for (let k = g.objects.length - 1; k >= 0; k--) {
      const o = g.objects[k];
      if (Math.hypot(cssX - o.x, cssY - o.y) <= o.r + 3) {
        togglePlaced(o.i);
        return;
      }
    }
    // else a bin → focus it
    if (g.bins) {
      for (const b of g.bins) {
        if (cssX >= b.x && cssX <= b.x + b.w && cssY >= b.y && cssY <= b.y + b.h) {
          setFocus((f) => (f === b.binI ? null : b.binI));
          return;
        }
      }
    }
  };

  const togglePlaced = (id) => {
    setPlaced((prev) => {
      const next = prev.slice();
      next[id] = !next[id];
      return next;
    });
    setFocus(binIndexOf(id, attr));
  };

  const sortAll = () => setPlaced(OBJECTS.map(() => true));
  const jumble = () => {
    setPlaced(OBJECTS.map(() => false));
    setFocus(null);
  };

  const chooseAttr = (a) => {
    if (calib) {
      setGuess(a);
      return;
    }
    if (!attrUnlocked(a)) return;
    setAttr(a);
    setFocus(null);
  };

  const attrUnlocked = (a) => {
    if (step >= STEP_RULE) return true;
    if (a === 'color') return step >= STEP_MEET;
    if (a === 'shape') return step >= STEP_SHAPE;
    if (a === 'size') return step >= STEP_SIZE;
    return false;
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const restart = () => {
    setStep(0);
    setAnswers({});
    setAttr('color');
    setPlaced(OBJECTS.map(() => false));
    setOrderBy(false);
    setFocus(null);
    setSecret(null);
    setGuess(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* ---- spoken description (accessibility) -------------------------------- */
  const spoken = calib
    ? secretRevealed
      ? `Solved. The secret sorting rule was ${ATTRS[effAttr].name}.`
      : `A guess-the-rule puzzle. Nine objects are sorted into ${blocks.length} bins by a hidden rule. ` +
        `Choose whether the rule is color, shape, or size.`
    : allPlaced
    ? `Nine objects sorted by ${ATTRS[attr].name} into ${blocks.length} bins: ` +
      blocks.map((b, i) => `${b.label} ${counts[i]}`).join(', ') +
      `. The most is ${blocks[mostIdx].label} with ${counts[mostIdx]}.`
    : `Sorting nine objects by ${ATTRS[attr].name}. ${total} of ${N} are in bins so far. ` +
      `Click an object in the tray to sort it.`;

  return (
    <div className="slab">
      <header className="head">
        <h1>Sorting</h1>
        <p className="lede">
          Sort nine objects by <em>color</em>, <em>shape</em>, or <em>size</em> — and watch them regroup.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <SortReadout
                attr={effAttr}
                counts={counts}
                focus={calib ? null : focus}
                total={total}
                calib={calib}
                secretRevealed={secretRevealed}
              />
            </p>
          </div>

          <div className="viewbar" role="group" aria-label={calib ? 'Guess the secret rule' : 'Choose a sorting rule'}>
            {ATTR_ORDER.map((a) => {
              const unlocked = calib || attrUnlocked(a);
              const active = calib ? guess === a : attr === a;
              return (
                <button
                  type="button"
                  key={a}
                  className={'seg' + (active ? ' on' : '') + (!unlocked ? ' locked' : '') + (calib ? ' guess' : '')}
                  onClick={() => chooseAttr(a)}
                  disabled={!unlocked}
                  aria-pressed={active}
                >
                  <span aria-hidden="true">{ATTRS[a].icon}</span> {ATTRS[a].name}
                  {!unlocked && (
                    <span className="lock" aria-hidden="true">
                      {' '}
                      🔒
                    </span>
                  )}
                </button>
              );
            })}
            {!calib && step >= STEP_ORDER && (
              <button
                type="button"
                className={'seg order' + (orderBy ? ' on' : '')}
                onClick={() => setOrderBy((o) => !o)}
                aria-pressed={orderBy}
                title="Line the bins up from most to fewest"
              >
                Sort by count
              </button>
            )}
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerDown={onPointerDown}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {calib ? 'pick the rule below' : 'click an object to sort · click a bin to spotlight'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calibrated ? ' Calibrated — you found the secret rule.' : ''}
          </p>

          {/* facts strip */}
          <div className="facts">
            <div className="fact">
              <span className="fact-k">Total objects</span>
              <span className="fact-v mono big">{N}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Bins</span>
              <span className="fact-v mono">{blocks.length}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Most</span>
              <span className="fact-v">
                {allPlaced || calib ? `${blocks[mostIdx].label} (${counts[mostIdx]})` : '—'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Check: bins add to</span>
              <span className="fact-v mono">
                {counts.join(' + ')} = {counts.reduce((a, b) => a + b, 0)}
              </span>
            </div>
          </div>

          {!calib && (
            <div className="toolbar">
              <button type="button" className="btn" onClick={sortAll} disabled={allPlaced}>
                Sort them! ✨
              </button>
              <button type="button" className="btn ghost" onClick={jumble} disabled={!placed.some(Boolean)}>
                Jumble
              </button>
            </div>
          )}
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
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
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

          {calib && (
            <div className="calib">
              <div className="meter" aria-hidden="true">
                <div
                  className={'meter-fill' + (calibrated ? ' done' : '')}
                  style={{ width: (guess == null ? 0 : matchPct) + '%' }}
                />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{guess == null ? 0 : matchPct}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">{guess == null ? current.calibHint : 'not quite — look again'}</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setSecret((prev) => newSecret(prev));
                  setGuess(null);
                }}
              >
                New puzzle
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
              <button type="button" className="btn" onClick={restart}>
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">classify → count each bin → bins add to the whole → order by count</span>
        &nbsp;·&nbsp; Sorting &amp; classifying objects: CCSS K.MD.B.3 (category counts ≤ 10). The same objects
        regroup when you change the attribute; each object is counted exactly once, so the bin counts always
        sum to the total.
      </footer>

      <style jsx>{`
        .slab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
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
          min-height: 40px;
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        .equation {
          margin: 0;
        }
        .viewbar {
          display: flex;
          gap: 6px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .seg {
          font: 600 12.5px/1 system-ui, sans-serif;
          padding: 8px 13px;
          border-radius: 8px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s, opacity 0.15s;
        }
        .seg.on {
          background: var(--ink);
          border-color: var(--ink);
          color: #fff;
        }
        .seg.guess.on {
          background: var(--curve);
          border-color: var(--curve);
        }
        .seg.order {
          margin-left: auto;
          border-style: dashed;
        }
        .seg.order.on {
          background: var(--curve);
          border-color: var(--curve);
          color: #fff;
        }
        .seg.locked {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .seg:not(:disabled):hover {
          border-color: var(--ink);
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 8 / 5;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: manipulation;
          cursor: pointer;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
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
          background: rgba(251, 251, 248, 0.82);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1.4fr;
          gap: 8px 16px;
          margin: 14px 4px 4px;
        }
        @media (max-width: 620px) {
          .facts {
            grid-template-columns: 1fr 1fr;
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
        .fact-v.big {
          font-size: 20px;
          font-weight: 700;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
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
        .quiz {
          margin-top: 4px;
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
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--curve));
          transition: width 0.25s ease-out;
        }
        .meter-fill.done {
          background: linear-gradient(90deg, rgba(31, 138, 91, 0.6), var(--ok));
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
        :global(.slab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .seg {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Deterministic tray scatter (stable jumble): [jitterX, jitterY, rotation] per
   object.  Keeps the tray looking naturally messy but never overlapping badly.
   ------------------------------------------------------------------------- */
const JITTER = [
  [0.35, -0.2, -0.18],
  [-0.4, 0.15, 0.12],
  [0.15, 0.35, 0.22],
  [-0.25, -0.3, -0.1],
  [0.42, 0.25, 0.16],
  [-0.15, -0.15, -0.24],
  [0.28, 0.3, 0.08],
  [-0.38, -0.22, 0.2],
  [0.1, 0.18, -0.14],
];

/* ---------------------------------------------------------------------------
   Canvas drawing helpers (module scope so they are not re-created per render).
   ------------------------------------------------------------------------- */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// draw one object: a chunky, kid-friendly colored shape with a soft shadow and a
// glossy top highlight.  `rot` (radians) is used only in the tray for a playful
// jumble; objects sit upright in bins.
function drawObject(ctx, x, y, r, shape, color, rot) {
  const p = PAINT[color];
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);

  // shadow
  ctx.save();
  ctx.shadowColor = 'rgba(28,43,58,0.22)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = p.fill;
  pathShape(ctx, shape, r);
  ctx.fill();
  ctx.restore();

  // outline
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = p.stroke;
  ctx.lineJoin = 'round';
  pathShape(ctx, shape, r);
  ctx.stroke();

  // glossy highlight (upper-left)
  ctx.save();
  pathShape(ctx, shape, r);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.34)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.4, r * 0.55, r * 0.32, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function pathShape(ctx, shape, r) {
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  } else if (shape === 'square') {
    const s = r * 1.55;
    const rr = s * 0.22;
    const x = -s / 2;
    const y = -s / 2;
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + s, y, x + s, y + s, rr);
    ctx.arcTo(x + s, y + s, x, y + s, rr);
    ctx.arcTo(x, y + s, x, y, rr);
    ctx.arcTo(x, y, x + s, y, rr);
    ctx.closePath();
  } else {
    // triangle (pointing up), visually centered
    const R = r * 1.15;
    const top = { x: 0, y: -R };
    const bl = { x: -R * 0.87, y: R * 0.6 };
    const br = { x: R * 0.87, y: R * 0.6 };
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
  }
}

// a bin's rule-value glyph drawn on the canvas header, centered at (x, y)
function drawBinGlyph(ctx, attr, value, x, y, s) {
  ctx.save();
  if (attr === 'color') {
    const p = PAINT[value];
    roundRect(ctx, x - s, y - s, s * 2, s * 2, 3);
    ctx.fillStyle = p.fill;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = p.stroke;
    ctx.stroke();
  } else if (attr === 'shape') {
    ctx.translate(x, y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK_SOFT;
    ctx.lineJoin = 'round';
    pathShape(ctx, value, s);
    ctx.stroke();
  } else {
    const d = value === 'big' ? s : s * 0.6;
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK_SOFT;
    ctx.beginPath();
    ctx.arc(x, y, d, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
