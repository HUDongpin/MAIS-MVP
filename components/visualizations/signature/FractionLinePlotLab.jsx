'use client';

/* ============================================================================
   FractionLinePlotLab — an interactive "bench" for LINE PLOTS WITH FRACTIONS:
   a scale cut to eighths, marks that stack even when their names differ, and
   subtraction done by COUNTING TICKS.

        2 1/2 and 2 4/8 land on ONE tick — two names, one place.
        longest − shortest?  walk the eighth-ticks between the farthest X's:
        six steps — 6/8, which the quarter rung calls 3/4.

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADES 4–5 lab —
   CCSS 4.MD.B.4 ("make a line plot to display a data set of measurements in
   fractions of a unit (1/2, 1/4, 1/8); solve problems involving addition and
   subtraction of fractions by using information presented in line plots")
   and 5.MD.B.2 (the same display, used with operations on fractions).
   The measuring happened offstage — every ribbon arrives as a CARD already
   read to the nearest eighth of an inch — because this lab's subject is the
   fractional SCALE and the arithmetic done ON it.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE TICK LADDER."
     Between the whole numbers the plot line is cut into eighths, and the
     ticks come in four heights: tallest = wholes, then halves, quarters,
     eighths — a ladder of rungs.  Every value to the nearest eighth has a
     tick, and every tick can carry several NAMES: the half-tick past 2 is
     2 1/2 to the half rung and 2 4/8 to the eighth rung.  Two cards with
     different names land on the same tick and their X's STACK — data at
     one value is one stack, whatever the values are called.  Then the
     arithmetic the standard asks for is done ON the scale: the span from
     the shortest ribbon to the longest is a WALK, counted tick by tick in
     eighths — 1, 2, 3, 4, 5, 6 — and the walk cannot commit the classic
     written error (subtracting the fraction parts the wrong way round),
     because feet on a scale only know forward.  The eighth is the common
     unit by CONSTRUCTION of the plot; nothing needs re-cutting.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • LinePlotLab (Grade 2) owns the MEASURE-THEN-MARK pipeline: the tray
       of worms, the fixed ruler, "the mark replaces the thing", and the
       tallest-stack-vs-longest trap on a whole-number scale.  This lab
       deliberately INHERITS the display (X's on a numeric scale — it is
       the same CCSS display, two grades on) and refuses the pipeline: no
       tray, no ruler, nothing is measured on stage, and the Grade-2 trap
       is not re-asked.  What is new here is everything fractional: the
       ladder, the two-names stack, the counted walk.
     • DataLab owns the DOT PLOT and the measures of center (and its RANGE
       readout).  Marks here are X's, never a single dot is drawn, no
       center statistic of any kind appears, and the min-to-max distance is
       never given DataLab's name — it is "the span", computed as fraction
       subtraction, which is what 4.MD.B.4 asks and DataLab never does.
     • FractionAdditionLab owns the PIECE SHELF: loose unit-fraction tiles
       counted on a shelf, the 5/16 foil.  No tiles and no shelf appear;
       sums here are read off the SCALE (two 2½-ribbons laid end to end
       reach 5), not built from pieces.
     • UnlikeDenominatorsLab owns the RE-CUT that manufactures a common
       denominator.  Nothing is re-cut here: the eighth is already the
       finest rung of the ladder, so halves and quarters arrive with an
       eighths reading built in.
     • EquivalentFractionsLab owns renaming as a SUBJECT (the name lattice,
       simplification).  Here a second name for a tick is read off a rung
       of the ladder — no machinery, no reduction; when 6/8 is called 3/4,
       it is because the span ends on a quarter rung.
     • MeasurementLab owns HOW measuring works.  The measuring is offstage
       by design.

   One-accent discipline: CARMINE is THE RECORD — the X marks and the plot
   line they stand on (inherited from LinePlotLab, deliberately: one strand,
   one accent).  GOLD is the LADDER at work — the tick being read, the
   walk's counting labels, the current card.  Everything else is quiet
   slate.  GREEN is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a ten-year-old):
     • Every value is an EXACT INTEGER COUNT OF EIGHTHS (16…32 = 2…4 in).
       A card's display name (w n/d with d ∈ {2,4,8}) converts by integer
       arithmetic — value = 8w + n·(8/d) — and the audit proves every name
       a deck can deal lands on its exact tick.
     • The ladder is exact: rungs at v≡0 (mod 8) are wholes, v≡4 halves,
       v≡2,6 quarters, odd v eighths — audited over the whole scale, and
       the ladder NAME of a span (6/8 → 3/4) is rung-reading, not gcd
       machinery (the audit greps reduction vocabulary out).
     • The lesson deck is pinned: values 19, 20, 20, 22, 25 — the two 20s
       carry different names (2 1/2 and 2 4/8), the span is exactly 6
       eighths, and the two halves sum to exactly 5 — every number in the
       copy is an audited fact of the constant.
     • The capstone deck always deals a same-tick pair with two different
       names and a span of at least 3 eighths (so every distractor is a
       positive, distinct count) — audited over thousands of deals — and
       the stamp needs every card on its true tick AND the span answered
       right, with the answer locked after one pick.
   Verified by audit-fractionlineplot.mjs (numeric proof + source greps)
   and verify-fractionlineplot.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/FractionLinePlotLab.jsx
     2. Import and render it:
          import FractionLinePlotLab from './FractionLinePlotLab';
          export default function Page() { return <FractionLinePlotLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the deck, the marks
              placed so far, the span answer, the lesson step).
     MODEL  — pure integer arithmetic in eighths; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  The scale runs 2…4 inches in eighths (16…32).  This
   lab has NO dials: the cards are the input and the ticks are the controls —
   the lesson's unlock ladder lives in how many cards each step deals.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the record: the X marks and the plot line
const GOLD = '#b98718'; // the ladder at work: the read tick, the walk, the card
const SLATE = '#5b6b7b';

const V_MIN = 16; // 2 inches, in eighths
const V_MAX = 32; // 4 inches, in eighths
const CALIB_STEP = 5;

/* the lesson's pinned deck — every number in the copy is a fact of this
   constant, audited.  {w, n, d}: the card READS "w n/d"; n = 0 reads "w". */
const LESSON_DECK = [
  { w: 2, n: 3, d: 8 }, // 2 3/8  → 19
  { w: 2, n: 1, d: 2 }, // 2 1/2  → 20
  { w: 2, n: 4, d: 8 }, // 2 4/8  → 20 — the same tick, another name
  { w: 2, n: 3, d: 4 }, // 2 3/4  → 22
  { w: 3, n: 1, d: 8 }, // 3 1/8  → 25
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact integer eighths, nothing else.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

/* a card's value in eighths: w n/d with d ∈ {2, 4, 8} — integer always */
const valueOf = (c) => 8 * c.w + c.n * (8 / c.d);
const deckValues = (deck) => deck.map(valueOf);

/* the ladder: which rung a tick belongs to */
const rungOf = (v) => (v % 8 === 0 ? 'whole' : v % 4 === 0 ? 'half' : v % 2 === 0 ? 'quarter' : 'eighth');

/* a card's face */
const fmtCard = (c) => (c.n === 0 ? `${c.w}` : `${c.w} ${c.n}/${c.d}`);

/* the ladder NAME of a count of eighths — read off the rung: an even count
   of eighths IS a count on a coarser rung, no machinery needed */
function ladderName(n8) {
  const whole = Math.floor(n8 / 8);
  const r = n8 % 8;
  let frac = '';
  if (r !== 0) {
    if (r % 2 === 1) frac = `${r}/8`;
    else if (r % 4 === 2) frac = `${r / 2}/4`;
    else frac = `${r / 4}/2`;
  }
  if (whole === 0) return frac || '0';
  return frac ? `${whole} ${frac}` : `${whole}`;
}

/* how many X's stand on each tick */
function stacksOf(vals) {
  const c = {};
  for (const v of vals) c[v] = (c[v] || 0) + 1;
  return c;
}
const spanOf = (vals) => Math.max(...vals) - Math.min(...vals);

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The curator."  Five fresh cards; TAP the tick where
   each belongs, then answer the span.  The generator always deals a same-tick
   pair wearing two different names, and a span of at least 3 eighths so the
   distractors are honest.  The stamp needs every card on its true tick AND
   the span answered right; the answer locks after one pick.
   ------------------------------------------------------------------------- */
function nameFor(v, variant) {
  /* the names a tick can wear, coarsest rung first */
  const w = Math.floor(v / 8);
  const r = v % 8;
  const names = [];
  if (r === 0) names.push({ w, n: 0, d: 8 });
  if (r !== 0) {
    if (r % 4 === 0) names.push({ w, n: r / 4, d: 2 });
    if (r % 2 === 0) names.push({ w, n: r / 2, d: 4 });
    names.push({ w, n: r, d: 8 });
  }
  return names[variant % names.length];
}
function makeDeck(prevVals) {
  let deck;
  let vals;
  do {
    /* a same-tick pair on a multi-name tick (r ∈ {2, 4, 6}), in two names */
    const w = 2 + Math.floor(Math.random() * 2);
    const r = [2, 4, 6][Math.floor(Math.random() * 3)];
    const pairV = 8 * w + r;
    deck = [nameFor(pairV, 0), nameFor(pairV, 1)];
    for (let i = 0; i < 3; i++) {
      const v = 17 + Math.floor(Math.random() * 15); // 17…31
      deck.push(nameFor(v, Math.floor(Math.random() * 3)));
    }
    /* shuffle, exactly */
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    vals = deckValues(deck);
  } while (
    spanOf(vals) < 3 ||
    (prevVals != null && vals.join(',') === prevVals.join(','))
  );
  return deck;
}
/* the span question's three counts — provably positive and distinct */
function spanChoices(deck) {
  const s = spanOf(deckValues(deck));
  return [s, s + 2, s - 2 > 0 ? s - 2 : s + 4];
}
const spanOrder = (deck) => {
  const r = spanOf(deckValues(deck)) % 3;
  return [r, (r + 1) % 3, (r + 2) % 3]; // display slot -> choice id
};
const calibChecks = (deck, placed, spanPick) => [
  placed.length === deck.length && placed.every((v, i) => v === valueOf(deck[i])),
  spanPick != null && spanOrder(deck)[spanPick] === 0,
];
const isCalibrated = (deck, placed, spanPick) => calibChecks(deck, placed, spanPick).every(Boolean);
const closeness = (deck, placed, spanPick) => {
  const c = calibChecks(deck, placed, spanPick);
  return (c[0] ? 50 : 0) + (c[1] ? 50 : 0);
};

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback; the
   traps are two-names-two-places and the flipped written subtraction.
   Next gates on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The ladder between the wholes',
    show: 1,
    body: 'A plot line from 2 to 4, cut into eighths. Tick heights are a ladder: tallest are wholes, then halves, quarters, eighths. The first card lands: 2 3/8.',
    q: 'Where does 2 3/8 stand?',
    choices: ['Three eighth-steps right of the 2', 'Three steps left of the 2', 'Just past the 3'],
    answer: 0,
    feedback:
      'Start at 2, walk three of the smallest steps right. Between wholes the line is cut into ' +
      'eighths, and the rung heights tell you where you are: pass a quarter rung, a half rung… ' +
      'A value to the nearest eighth always has a tick waiting for it.',
  },
  {
    title: 'Two names, one tick',
    show: 3,
    body: 'Two more cards land: 2 1/2, then 2 4/8. Watch where the X’s go.',
    q: '2 1/2 and 2 4/8 — two different spots?',
    choices: [
      'One spot — four eighths IS a half, so the X’s stack',
      'Two spots, one small step apart',
      'The second card is an error',
    ],
    answer: 0,
    feedback:
      'One tick, one stack of two. The half rung and the eighth rung meet at the same place: ' +
      '2 1/2 is the half-name, 2 4/8 the eighths-name, of one value. Data at the same value ' +
      'stacks — whatever the values are called. The names differ; the ribbons do not.',
  },
  {
    title: 'The whole collection',
    show: 5,
    body: 'The last cards land: 2 3/4 and 3 1/8. Five ribbons, one picture.',
    q: 'Which length holds the most X’s?',
    choices: ['2 1/2 — a stack of two', '2 3/8', '3 1/8'],
    answer: 0,
    feedback:
      'The tick at 2 1/2 carries two X’s — one wearing the name 2 1/2, one the name 2 4/8. ' +
      'Everything else stands alone. Notice the empty ticks too: a gap in the plot is also ' +
      'information — no ribbon measured there.',
  },
  {
    title: 'The span, counted',
    show: 5,
    lens: 'span',
    body: 'Longest minus shortest — but done ON the plot: the gold walk counts eighth-ticks from the shortest X to the farthest.',
    q: '3 1/8 − 2 3/8 = ?',
    choices: [
      '6 eighths — the walk counts 6, and the quarter rung calls it 3/4',
      '1 2/8 — subtract the wholes, then the tops',
      '2/8',
    ],
    answer: 0,
    feedback:
      'Walk it: from 2 3/8, six eighth-steps reach 3 1/8. So the difference is 6/8 — and since ' +
      '6 eighths ends on a quarter rung, it also wears the name 3/4. The written mistake ' +
      '“3−2 and 3/8−1/8” gives 1 2/8 because it subtracts the parts the wrong way round; feet ' +
      'on a scale cannot make that error — a walk only knows forward.',
  },
  {
    title: 'Adding off the plot',
    show: 5,
    lens: 'pair',
    body: 'The two ribbons in the stack at 2 1/2 — imagine laying them end to end. The plot already knows both lengths.',
    q: 'The two 2 1/2 ribbons, end to end, reach…',
    choices: ['5 — the two halves meet in a whole', '4 1/2 — add the wholes, keep a half', '4 2/4'],
    answer: 0,
    feedback:
      '2 1/2 + 2 1/2 = 5: the wholes make 4 and the two halves close into a fifth. The plot is ' +
      'built for exactly this — 4.MD.B.4’s problems hand you a plot and ask for sums and ' +
      'differences of what it shows. Read the marks; the arithmetic is already staged.',
  },
  {
    title: 'The curator',
    show: 0,
    calib: true,
    body: 'Five fresh cards. TAP the tick where each belongs — then answer the span. All five true and the span right: calibrated.',
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function FractionLinePlotLab() {
  const [deck, setDeck] = useState(LESSON_DECK);
  const [placed, setPlaced] = useState([]); // tick values where X's stand, in deal order
  const [spanPick, setSpanPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [tickPick, setTickPick] = useState(V_MIN);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const geomRef = useRef({ ticks: [] });

  const current = STEPS[step];
  const calib = !!current.calib;

  const pct = calib ? closeness(deck, placed, spanPick) : 0;
  const calibrated = calib ? isCalibrated(deck, placed, spanPick) : false;
  const checks = calib ? calibChecks(deck, placed, spanPick) : [false, false];
  const allDealt = placed.length >= deck.length;

  sceneRef.current = { deck, placed, calib, lens: current.lens, allDealt, spanDone: spanPick != null };

  /* ---- full redraw from state ------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const INK = '#1c2b3a';
    const INK_SOFT = '#5b6b7b';
    const S = sceneRef.current;

    ctx.clearRect(0, 0, W, H);

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    const gs = 26;
    ctx.beginPath();
    for (let x = gs; x < W; x += gs) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, H);
    }
    for (let y = gs; y < H; y += gs) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(W, Math.round(y) + 0.5);
    }
    ctx.stroke();

    /* the scale: 16…32 eighths across the lower half */
    const x0 = 44;
    const unit = (W - x0 - 36) / (V_MAX - V_MIN);
    const xOf = (v) => x0 + (v - V_MIN) * unit;
    const plotY = H * 0.72;

    /* ---- the card up top --------------------------------------------------- */
    const idx = S.placed.length;
    if (idx < S.deck.length) {
      const c = S.deck[idx];
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.2;
      ctx.fillStyle = 'rgba(185,135,24,0.06)';
      const cw = 150;
      ctx.beginPath();
      ctx.rect(W / 2 - cw / 2, 22, cw, 66);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 10.5px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`ribbon ${idx + 1} of ${S.deck.length} — measured offstage`, W / 2, 38);
      ctx.fillStyle = GOLD;
      ctx.font = '700 26px ui-monospace, Menlo, monospace';
      ctx.fillText(fmtCard(c), W / 2, 70);
      if (S.calib) {
        ctx.fillStyle = INK_SOFT;
        ctx.font = 'italic 600 12px system-ui, sans-serif';
        ctx.fillText('pick a tick below or tap it', W / 2, 106);
      }
    } else if (!S.calib || S.spanDone) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('every card is on the plot', W / 2, 40);
    } else {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('all placed — now answer the span', W / 2, 40);
    }

    /* ---- the plot line and the ladder -------------------------------------- */
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xOf(V_MIN), plotY + 0.5);
    ctx.lineTo(xOf(V_MAX), plotY + 0.5);
    ctx.stroke();
    const ticks = [];
    for (let v = V_MIN; v <= V_MAX; v++) {
      const rung = rungOf(v);
      const hh = rung === 'whole' ? 20 : rung === 'half' ? 14 : rung === 'quarter' ? 10 : 6;
      ctx.strokeStyle = rung === 'whole' ? INK : 'rgba(28,43,58,0.6)';
      ctx.lineWidth = rung === 'whole' ? 2 : 1.2;
      ctx.beginPath();
      ctx.moveTo(xOf(v) + 0.5, plotY);
      ctx.lineTo(xOf(v) + 0.5, plotY + hh);
      ctx.stroke();
      if (rung === 'whole') {
        ctx.fillStyle = INK;
        ctx.font = '700 14px ui-monospace, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(v / 8), xOf(v), plotY + 38);
      }
      ticks.push({ v, x: xOf(v) - unit / 2, w: unit, y: plotY - 130, h: 170 });
    }
    geomRef.current = { ticks };
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('the ladder: tall = whole · then half · quarter · eighth (inches)', x0, plotY + 56);

    /* ---- the X's — two carmine strokes each, stacked by count -------------- */
    const xs = 6.5;
    const seen = {};
    S.placed.forEach((v, i) => {
      seen[v] = (seen[v] || 0) + 1;
      const level = seen[v];
      const cx = xOf(v);
      const cy = plotY - 13 - (level - 1) * 18;
      const isPair = S.lens === 'pair' && v === 20;
      ctx.strokeStyle = isPair ? GOLD : CARMINE;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - xs, cy - xs);
      ctx.lineTo(cx + xs, cy + xs);
      ctx.moveTo(cx - xs, cy + xs);
      ctx.lineTo(cx + xs, cy - xs);
      ctx.stroke();
    });

    /* ---- the walk: the span counted tick by tick ---------------------------- */
    if (S.lens === 'span' || (S.calib && S.allDealt && S.placed.length > 0)) {
      const vals = S.calib ? S.placed : S.deck.map(valueOf);
      const lo = Math.min(...vals);
      const hi = Math.max(...vals);
      if (hi > lo) {
        const by = plotY - 68;
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(xOf(lo), by + 8);
        ctx.lineTo(xOf(lo), by);
        ctx.lineTo(xOf(hi), by);
        ctx.lineTo(xOf(hi), by + 8);
        ctx.stroke();
        ctx.fillStyle = GOLD;
        ctx.font = '600 10.5px ui-monospace, Menlo, monospace';
        ctx.textAlign = 'center';
        for (let v = lo + 1; v <= hi; v++) ctx.fillText(String(v - lo), xOf(v) - unit / 2, by - 6);
        if (!S.calib) {
          ctx.font = 'italic 600 12px system-ui, sans-serif';
          ctx.fillText(`the walk: ${hi - lo} eighth-steps = ${ladderName(hi - lo)}`, (xOf(lo) + xOf(hi)) / 2, by - 22);
        }
      }
    }
  }, []);

  useEffect(() => {
    draw();
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* every step opens on the scene its words describe */
  useEffect(() => {
    if (current.calib) {
      const d = makeDeck(null);
      setDeck(d);
      setPlaced([]);
      setSpanPick(null);
      return;
    }
    setDeck(LESSON_DECK);
    setPlaced(deckValues(LESSON_DECK).slice(0, current.show));
    setSpanPick(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const placeCardAt = (v) => {
    if (!calib || allDealt) return;
    setPlaced((prev) => [...prev, clampInt(v, V_MIN, V_MAX)]);
  };
  const onPointerDown = (e) => {
    if (!calib || allDealt) return;
    const stage = stageRef.current;
    const rect = stage.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    for (const t of geomRef.current.ticks) {
      if (px >= t.x && px <= t.x + t.w && py >= t.y && py <= t.y + t.h) {
        placeCardAt(t.v);
        return;
      }
    }
  };
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const newDeck = () => {
    setDeck(makeDeck(deckValues(deck)));
    setPlaced([]);
    setSpanPick(null);
  };
  const startOver = () => {
    setPlaced([]);
    setSpanPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const sOrder = spanOrder(deck);
  const sChoices = spanChoices(deck);

  const spoken = `${placed.length} of ${deck.length} cards on the plot.${
    calib && allDealt ? ' All placed; the span question is open.' : ''
  }${calibrated ? ' Calibrated.' : ''}`;

  return (
    <div className="flplab">
      <header className="head">
        <h1>Line Plots in Eighths: Read the Ladder</h1>
        <p className="lede">
          Between the whole numbers the scale is cut to eighths — and a tick can wear{' '}
          <em>two names</em>. Place the cards, stack the X’s, then do the arithmetic{' '}
          <span className="mono">by counting ticks</span>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef} role="img" aria-label={spoken} onPointerDown={onPointerDown}>
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          {calib && (
            <div className="toolbar">
              <div className="tick-picker" role="group" aria-label="Place the current card without a pointer" data-viz-keyboard-equivalent="tick-picker">
                <label>
                  {allDealt ? 'All cards placed' : `Place ${fmtCard(deck[placed.length])} at`}
                  <select
                    value={tickPick}
                    onChange={(e) => setTickPick(Number(e.target.value))}
                    disabled={allDealt}
                  >
                    {Array.from({ length: V_MAX - V_MIN + 1 }, (_, i) => V_MIN + i).map((v) => (
                      <option key={v} value={v}>{ladderName(v)}</option>
                    ))}
                  </select>
                </label>
                <button type="button" className="btn" onClick={() => placeCardAt(tickPick)} disabled={allDealt}>
                  Place card
                </button>
              </div>
              <button type="button" className="btn ghost" onClick={startOver}>
                Start over
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
              <div className="target-card">
                <span className="target-k">The curator</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>
                    {checks[0] ? '✓' : '·'} every card on its true tick ({placed.length}/{deck.length} placed)
                  </li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the span answered</li>
                </ol>
                <span className="target-hint mono">
                  {!allDealt
                    ? 'read the card, then choose its tick below'
                    : spanPick == null
                      ? 'longest minus shortest — count the walk'
                      : calibrated
                        ? 'a true record, a true count'
                        : 'something is off — Start over or New cards'}
                </span>
              </div>
              {allDealt && (
                <div className="cards">
                  {sOrder.map((choiceId, slot) => {
                    const n8 = sChoices[choiceId];
                    const isPicked = spanPick === slot;
                    const isTrue = choiceId === 0;
                    let cls = 'spancard';
                    if (spanPick != null) {
                      if (isPicked && isTrue) cls += ' correct';
                      else if (isPicked) cls += ' wrong';
                      else cls += ' dim';
                    }
                    return (
                      <button
                        type="button"
                        key={slot}
                        className={cls}
                        disabled={spanPick != null}
                        onClick={() => setSpanPick(slot)}
                      >
                        {n8}/8{n8 % 2 === 0 ? ` = ${ladderName(n8)}` : ''}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">{checks.filter(Boolean).length}/2</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">place · stack · count</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={newDeck}>
                New cards
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
                  setDeck(LESSON_DECK);
                  setPlaced([]);
                  setSpanPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">one tick, many names ⇒ one stack</span> &nbsp;·&nbsp; make a line
        plot of measurements in halves, quarters, and eighths, and solve addition and subtraction
        problems from the plot (CCSS 4.MD.B.4, 5.MD.B.2). Subtraction is a walk; count the ticks.
      </footer>

      <style jsx>{`
        .flplab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --carmine: #c81e4f;
          --gold: #b98718;
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
          max-width: 72ch;
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
            /* minmax(0,1fr), never a bare 1fr (the TeenNumbersLab phone lesson) */
            grid-template-columns: minmax(0, 1fr);
          }
        }
        .panel {
          min-width: 0;
          background: #fff;
          border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel {
          padding: 14px;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 7 / 5;
          min-height: 430px;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 5;
            min-height: 400px;
          }
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: end;
        }
        .tick-picker {
          display: flex;
          gap: 8px;
          flex: 1 1 280px;
          flex-wrap: wrap;
          align-items: end;
          padding: 8px;
          border: 1px dashed rgba(28, 43, 58, 0.22);
          border-radius: 9px;
          background: rgba(251, 251, 248, 0.72);
        }
        .tick-picker label {
          display: inline-flex;
          flex: 1 1 160px;
          flex-direction: column;
          gap: 3px;
          color: var(--ink-soft);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        .tick-picker select {
          min-height: 44px;
          padding: 5px 28px 5px 8px;
          border: 1px solid rgba(28, 43, 58, 0.28);
          border-radius: 8px;
          background: #fff;
          color: var(--ink);
          font: 700 13px/1 var(--mono);
        }
        .tick-picker .btn {
          min-width: 44px;
          min-height: 44px;
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
          background: var(--carmine);
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
          border-left: 3px solid var(--carmine);
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
        .target-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 12px;
          border: 1px solid rgba(28, 43, 58, 0.16);
          border-radius: 8px;
          background: rgba(185, 135, 24, 0.07);
        }
        .target-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .tasks {
          margin: 0;
          padding: 0 0 0 4px;
          list-style: none;
          font-size: 13.5px;
          display: grid;
          gap: 4px;
        }
        .tasks li.done {
          color: var(--ok);
          font-weight: 600;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .spancard {
          font: 700 14px/1.3 var(--mono);
          padding: 11px 6px;
          border: 2px solid rgba(28, 43, 58, 0.25);
          border-radius: 8px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, opacity 0.15s;
        }
        .spancard:not(:disabled):hover {
          border-color: var(--ink);
        }
        .spancard:disabled {
          cursor: not-allowed;
          opacity: 0.75;
        }
        .spancard.correct {
          border-color: var(--ok);
          background: rgba(31, 138, 91, 0.08);
          opacity: 1;
        }
        .spancard.wrong {
          border-color: var(--carmine);
          background: rgba(200, 30, 79, 0.07);
          opacity: 1;
        }
        .spancard.dim {
          opacity: 0.45;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--carmine));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .stamp {
          font: 700 12px/1 var(--mono);
          letter-spacing: 0.16em;
          color: var(--ok);
          border: 2px solid var(--ok);
          border-radius: 6px;
          padding: 4px 8px;
          transform: rotate(-3deg);
          white-space: nowrap;
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
        :global(.flplab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .spancard {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
