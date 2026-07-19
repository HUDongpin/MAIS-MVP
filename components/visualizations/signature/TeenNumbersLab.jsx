'use client';

/* ============================================================================
   TeenNumbersLab — an interactive "bench" for the idea that unlocks the whole
   base-ten system for a five-year-old: a TEEN NUMBER IS ONE TEN AND SOME MORE.
   N = 10 + n, for n = 1…9  →  11, 12, … 19.   (CCSS K.NBT.A.1; K.CC.A.3;
   1.NBT.B.2a–b.)  Pitched at Kindergarten / early Grade 1.

   ---------------------------------------------------------------------------
   WHY THIS LAB EXISTS, AND HOW IT IS DISTINCT FROM ITS SIBLINGS
   ---------------------------------------------------------------------------
   "Teen numbers" sits in the most crowded corner of the library, and the two
   obvious pictures for it are BOTH already owned:

     • CountingLab (K.CC) owns the TEN-FRAME.  Its default arrangement is a
       double ten-frame for 11–20, filled five-and-some-more.
     • TwoDigitNumberLab (1.NBT.B.2) owns BUNDLING.  Its star is the action of
       ten loose ones snapping into a connected carmine ten-rod, for 0–99 —
       a range that already CONTAINS every teen.

   Re-drawing either picture here would be a duplicate wearing a new title.  So
   this lab does not draw them.  It takes the one thing those labs only mention
   in passing — TwoDigitNumberLab's parenthetical "(we say them oddly: sixteen,
   not ten-six)" — and makes it the entire subject:

     THIS LAB OWNS THE TEEN'S *NAME*.

   English says a teen number BACKWARDS.  You SAY the ones first ("four" …
   "-teen") but you WRITE the ten first (1, then 4).  Draw an arrow from each
   spoken part to the digit it becomes and THE ARROWS CROSS.  That crossing is
   the whole difficulty of the teens: it is why a child who writes exactly what
   they hear writes 41 for "fourteen", and it is the reason the Common Core
   gives 11–19 a standard of its very own while 20–99 has none.  Every number
   from twenty up is said in writing order — the teens are the ONLY numbers
   English reverses.  The lab proves that claim on screen, and the audit proves
   it exhaustively over 0–99.

   THE SIGNATURE CENTERPIECE (the analogue of the ellipse "string", CountingLab's
   cardinal ring, TwoDigitNumberLab's snapping rod) = THE CROSSING.  Three lanes
   — SAY IT / WRITE IT / IT IS — wired together by arrows that are coloured by
   which part of the MATH they carry (carmine = the ten, blue = the some-more).
   The colour IS the proof: you watch carmine start on the RIGHT of the spoken
   word and land on the LEFT of the numeral.

   BUILT FOR FIVE-YEAR-OLDS, WHICH IS A DESIGN CONSTRAINT, NOT A NOTE.  This is
   a K3 lab, so the whole page holds ONE dial — Some more — and nothing else the
   child can drag.  The rows of the picture are declared per step in STEPS[].lens
   rather than exposed as toggle buttons: the child is never asked to assemble a
   view, and no step turns on both the trap and the twenty-comparison, so the
   canvas cannot crowd itself.  There is no facts table, no equation header and
   no legend — everything they say is already said, in colour, on the canvas.
   (An earlier draft also drew a "Tens" dial permanently locked at 1, to make the
   point that a teen has exactly one ten.  It was cut: a control that invites a
   drag and then refuses is a puzzle about the UI, not about mathematics.  The
   ten's constancy is shown instead by the red pill simply never changing while
   the dial runs 11 → 19, which is the more direct demonstration anyway.)

   REFUSALS (deliberate, and enforced by audit-teennumbers.mjs, which greps this
   very file for them — a distinctness promise written only in prose is a promise
   you will break):
     • REFUSAL: no ten-frame, no frame grid, no dashed cells to fill.  That is
       CountingLab's picture.
     • REFUSAL: no bundling event, no ten-rod forming, no rows of ten snapping
       together.  That is TwoDigitNumberLab's picture — and this lab is
       deliberately DOWNSTREAM of it: here the ten arrives ALREADY MADE, drawn
       as one sealed carmine pill marked 10 with no cells inside it, because
       the point of a ten is that you STOP counting it.  You use a ten; you do
       not build one.  Building one is the sibling's lesson.
     • REFUSAL: no counting animation, no finger touching objects one at a time.
       That is CountingLab's picture.
     • REFUSAL: no number line, no count-on hops.  That is AddLab's picture.
     • REFUSAL: no place-value chart with independent digit dials.  That is
       NumberLab's picture.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials/lenses that unlock one per lesson step, predict-then-check questions
   (Next is gated on ANSWERED, not correct), and a calibration challenge with a
   live match meter and a CALIBRATED stamp that cannot fire falsely.

   One-accent discipline: carmine = THE TEN, everywhere it goes — the "-teen"
   you say, the 1 you write, the sealed pill it is, and the arrow that carries
   it between them.  Blue = the some-more, on the same journey.  (Those two
   colour roles match TwoDigitNumberLab on purpose: a child moving between labs
   must not have to relearn what carmine means.)

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/TeenNumbersLab.jsx
     2. Import and render it:
          import TeenNumbersLab from './TeenNumbersLab';
          export default function Page() { return <TeenNumbersLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (one number `n`, the
              some-more, 0–9, plus the lesson step and the lens toggles).
     MODEL  — pure integer arithmetic + a table of how English builds the
              number words.  It knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  This lab is for five-year-olds, so it has exactly ONE
   dial: Some more.  Nothing else on the page can be dragged.

   The extra rows of the picture (the spoken word, the trap, the twenty-something
   comparison) are NOT toggle buttons — they are declared per lesson step, in
   STEPS[].lens, and appear on their own.  A child never assembles a view; the
   step hands them one.  That also caps the picture at four rows: no step turns
   on both the trap and the comparison, so the canvas can never crowd itself.
   ------------------------------------------------------------------------- */
const TEN = '#c81e4f'; // carmine — THE TEN: the accent, the one idea
const MORE = '#3f74a6'; // blue — the "some more"
const INK_HEX = '#1c2b3a'; // neutral: the calibration marks are UNCOLOURED on purpose

const DIALS = [
  { key: 'more', name: 'Some more', role: 'the loose ones · 0–9', min: 0, max: 9, unlock: 1, color: MORE },
];

const START_N = 4; // 14 — the canonical teen
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Two halves, both exact.

   (a) The arithmetic.  A teen is 10 + n.  Integers only; nothing here can
       round, drift, or surprise.
   (b) The English.  A table of how each number word is BUILT out loud, which
       is the actual subject of this lab.  `sayParts` returns the spoken parts
       in SPOKEN ORDER, each tagged with the part of the math it carries; the
       written digits are always in WRITTEN ORDER (tens first).  `crosses` then
       falls out as a DERIVED fact rather than a claim: a number is said
       backwards exactly when the first thing you say is the some-more.  The
       audit sweeps 0–99 and confirms that set is precisely {13…19}.
   ------------------------------------------------------------------------- */
const tensOf = (v) => Math.floor(v / 10);
const onesOf = (v) => v % 10;
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
const teenValue = (n) => 10 + n; // n = 0…9 → 10…19

/* Number-to-words, 0–99 (US English). */
const ONES_W = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS_W = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function wordForm(v) {
  if (v < 20) return ONES_W[v];
  return TENS_W[Math.floor(v / 10)] + (v % 10 ? '-' + ONES_W[v % 10] : '');
}

/* How English builds each teen out loud: root + "teen".  Three of the roots are
   BENT out of shape (three→thir, five→fif, eight→eigh, which swallows a t), and
   eleven/twelve are OPAQUE — they say nothing at all about their parts.  The
   audit checks every root re-assembles into the real word. */
const TEEN_ROOT = { 13: 'thir', 14: 'four', 15: 'fif', 16: 'six', 17: 'seven', 18: 'eigh', 19: 'nine' };
const isOpaqueTeen = (v) => v === 11 || v === 12;

/* The spoken word, split into parts, in the order a mouth says them. */
function sayParts(v) {
  if (v < 10) return [{ text: ONES_W[v], role: 'more' }];
  if (v === 10) return [{ text: 'ten', role: 'ten' }];
  if (isOpaqueTeen(v)) return [{ text: ONES_W[v], role: 'opaque' }];
  if (v <= 19) return [{ text: TEEN_ROOT[v], role: 'more' }, { text: 'teen', role: 'ten' }];
  const t = tensOf(v);
  const o = onesOf(v);
  if (o === 0) return [{ text: TENS_W[t], role: 'ten' }];
  return [{ text: TENS_W[t], role: 'ten' }, { text: ONES_W[o], role: 'more' }];
}

/* DERIVED, not asserted: you write the ten first, always.  So a number is said
   "backwards" exactly when the first part you SAY is the some-more. */
function crosses(v) {
  const p = sayParts(v);
  return p.length === 2 && p[0].role === 'more';
}

/* The trap: a child writes what they hear, in the order they hear it.  For
   "four-teen" that is 4, then the ten → 41.  Only the transparent teens have a
   trap; eleven and twelve give a child nothing to mis-transcribe. */
const hasTrap = (v) => v >= 13 && v <= 19;
const trapNumeral = (v) => onesOf(v) * 10 + 1;

/* ---------------------------------------------------------------------------
   Pure layout for the "IT IS" lane, kept free of the canvas so the audit can
   check it: t sealed carmine pills (each one ten, worth 10, NOT drawn as ten
   countable cells) and o blue dots, as one centred group.
   ------------------------------------------------------------------------- */
function layoutQuantity(t, o, cx, cy, k) {
  const pillW = 26 * k;
  const pillH = 58 * k;
  const gap = 6 * k;
  const dotD = 18 * k;
  const groupGap = 20 * k;
  const pillsW = t > 0 ? t * pillW + (t - 1) * gap : 0;
  const dotsW = o > 0 ? o * dotD + (o - 1) * gap : 0;
  const totalW = pillsW + dotsW + (t > 0 && o > 0 ? groupGap : 0);
  let x = cx - totalW / 2;
  const pills = [];
  for (let i = 0; i < t; i++) {
    pills.push({ x, y: cy - pillH / 2, w: pillW, h: pillH });
    x += pillW;
    if (i < t - 1) x += gap; // no trailing gap, or the group drifts off centre
  }
  if (t > 0 && o > 0) x += groupGap;
  const dots = [];
  for (let i = 0; i < o; i++) {
    dots.push({ cx: x + dotD / 2, cy, r: dotD / 2 });
    x += dotD;
    if (i < o - 1) x += gap;
  }
  return { pills, dots, totalW, pillsW, dotsW, pillH, dotD, pillW };
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Write what you hear."  A teen word appears (plain,
   unsplit, uncoloured — colouring it would hand over the answer), and the child
   writes the numeral with two dials: the LEFT mark and the RIGHT mark.  They are
   not called tens and ones on purpose: deciding what the left mark means IS the
   task.  Six steps taught that a teen's ten is locked; the capstone takes the
   lock OFF and asks the child to put the ten where it belongs themselves.

   The stage echoes back whatever they wrote — its word, its arrows, its piles —
   so writing 71 for "seventeen" answers itself out loud: "seventy-one."

   No false stamp, provably: targets live in 11…19, so the only (l,r) scoring
   100 is (1, target−10).  Both digits right ⇔ 10l+r = target, because a number
   in 0–99 has exactly one pair of digits.  The audit sweeps all 9 targets ×
   all 100 (l,r) pairs and confirms it.
   ------------------------------------------------------------------------- */
const digitsRightOf = (l, r, t) => (l === tensOf(t) ? 1 : 0) + (r === onesOf(t) ? 1 : 0);
const matchPercent = (l, r, t) => 50 * digitsRightOf(l, r, t);
const isCalibrated = (l, r, t) => l * 10 + r === t;

function makeTarget(prev) {
  let t;
  do {
    t = 11 + Math.floor(Math.random() * 9); // 11 … 19
  } while (prev != null && t === prev);
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; one dial or lens unlocks with the step;
   the reveal lives in `feedback`, never in `body`.  Every distractor is a real
   thing a five-year-old believes: that the 1 in 14 is worth one; that hearing
   "four" first means writing 4 first; that every number is said the way it is
   written.  Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A ten and some more',
    body: 'This is 14: one red ten and 4 more.',
    lens: {},
    demo: 4,
    q: 'What are the two parts of 14?',
    choices: ['One ten, and 4 more', 'Two tens', 'A one and a four'],
    answer: 0,
    feedback: 'The 1 you write in 14 is worth TEN. So 14 is 10 + 4.',
  },
  {
    title: 'The ten never changes',
    body: 'Slide Some more. Watch the red ten.',
    lens: {},
    q: 'You slide from 4 to 7. What happens to the ten?',
    choices: ['It stays one ten', 'It becomes seven tens', 'It goes away'],
    answer: 0,
    feedback: 'Every teen has exactly ONE ten. Slide to 0: plain 10. Past 9: that is 20.',
  },
  {
    title: 'Say it — the arrows cross',
    body: 'Say it out loud: four … teen. Watch the two arrows.',
    lens: { say: true },
    demo: 4,
    q: 'In “fourteen”, which part do you SAY first?',
    choices: ['The four', 'The ten', 'Both at once'],
    answer: 0,
    feedback: 'You SAY “four” first but WRITE the ten first. The arrows cross!',
  },
  {
    title: 'The trap',
    body: 'You hear “four … teen” and write 4 first. You get 41! Look at the piles.',
    lens: { say: true, trap: true },
    demo: 4,
    q: 'A child writes exactly what they hear. They write…',
    choices: ['41 — but 41 is forty-one', '14', '4'],
    answer: 0,
    feedback: '41 is forty-one: FOUR tens! The word said the ones first.',
  },
  {
    title: 'Is every number backwards?',
    body: 'No. Look at twenty-four below, built the same way.',
    lens: { say: true, twenty: true },
    demo: 4,
    q: 'In “twenty-four”, do the arrows cross?',
    choices: ['No — they go straight down', 'Yes', 'There are no arrows'],
    answer: 0,
    feedback: 'Only 13 to 19 are backwards. Eleven and twelve say nothing at all!',
  },
  {
    title: 'Write what you hear',
    body: 'A word appears. Write it with the two dials — careful!',
    lens: { say: true },
    calib: true,
  },
];

/* True when the user asks for reduced motion — every animation checks this. */
const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TeenNumbersLab() {
  const [n, setN] = useState(START_N); // the some-more, 0–9 → value 10–19
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);
  const [wl, setWl] = useState(0); // calibration: the LEFT mark
  const [wr, setWr] = useState(0); // calibration: the RIGHT mark
  const [canSpeak, setCanSpeak] = useState(false);
  const [burst, setBurst] = useState(0); // confetti burst id (0 = none)
  const [everSpoken, setEverSpoken] = useState(false); // Say-it button attention pulse

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const prevCalRef = useRef(false); // previous calibrated value, to fire the burst on the edge

  const current = STEPS[step];
  const calib = !!current.calib;

  /* In the lesson the stage shows the teen being built; in the calibration it
     shows whatever the child has written — that echo is the whole challenge. */
  const displayValue = calib ? wl * 10 + wr : teenValue(n);

  /* The picture is declared by the step, never assembled by the child.  The
     trap row also needs a trap to show — slide to 11 or 12 and there is nothing
     to mis-hear, so the row simply is not drawn. */
  const L = current.lens || {};
  const showSay = calib ? true : !!L.say;
  const showTrap = !calib && !!L.trap && hasTrap(displayValue);
  const showTwenty = !calib && !!L.twenty;

  const pct = target != null ? matchPercent(wl, wr, target) : 0;
  const marksRight = target != null ? digitsRightOf(wl, wr, target) : 0;
  const calibrated = target != null ? isCalibrated(wl, wr, target) : false;

  sceneRef.current = {
    v: displayValue,
    n,
    showSay,
    showTrap,
    showTwenty,
    calib,
    calibrated: calib && calibrated,
  };

  useEffect(() => {
    setCanSpeak(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  /* K-motion: confetti on the moment CALIBRATED becomes true. The stamp is
     driven by isCalibrated exactly as before — this effect only decorates the
     transition and never feeds back into it. */
  useEffect(() => {
    const was = prevCalRef.current;
    prevCalRef.current = calibrated;
    if (!calibrated || was || !calib) return;
    if (reduceMotion()) return;
    setBurst(Date.now());
    const t = setTimeout(() => setBurst(0), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calibrated]);

  /* Optional read-aloud. A five-year-old cannot read "seventeen" — but the
     challenge is to write what you HEAR, so hearing it matters. Enhancement
     only: the word is always on screen as text too, and nothing gates on it. */
  const sayAloud = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new window.SpeechSynthesisUtterance(text);
      u.rate = 0.75;
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
    } catch (e) {
      /* a browser that refuses to speak is not a reason to break the lab */
    }
  };

  /* ---- full redraw from state: SAY IT / WRITE IT / IT IS, and the crossing -- */
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
    const GHOST = '#8b93a0';
    const OK = '#1f8a5b';

    const S = sceneRef.current;
    const V = S.v;
    const T = tensOf(V);
    const O = onesOf(V);

    const rr = (x, y, w, h, rad) => {
      const rC = Math.max(0, Math.min(rad, w / 2, h / 2));
      ctx.beginPath();
      ctx.moveTo(x + rC, y);
      ctx.arcTo(x + w, y, x + w, y + h, rC);
      ctx.arcTo(x + w, y + h, x, y + h, rC);
      ctx.arcTo(x, y + h, x, y, rC);
      ctx.arcTo(x, y, x + w, y, rC);
      ctx.closePath();
    };
    const shade = (hex, amt) => {
      const val = parseInt(hex.slice(1), 16);
      let R = (val >> 16) & 255;
      let G = (val >> 8) & 255;
      let B = val & 255;
      const to = amt < 0 ? 0 : 255;
      const f = Math.abs(amt);
      R = Math.round(R + (to - R) * f);
      G = Math.round(G + (to - G) * f);
      B = Math.round(B + (to - B) * f);
      return `rgb(${R},${G},${B})`;
    };
    const roleColor = (role) => (role === 'ten' ? TEN : role === 'more' ? MORE : INK);

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

    /* ---- vertical budget, then one uniform scale so nothing ever collides --- */
    const capH = 24;
    const sayH = S.showSay ? 44 : 0;
    const crossH = S.showSay ? 60 : 14;
    const writeH = 58;
    const dropH = 32;
    const qtyH = 60;
    const qLabH = 17;
    const trapH = S.showTrap ? 84 : 0;
    // the comparison row draws a whole say+write pair at 0.74 scale: 158 design
    // units × 0.74 ≈ 117, plus padding. Budgeting 108 let the equation collide
    // with its digit boxes — the row advances by its MEASURED bottom below.
    const twH = S.showTwenty ? 134 : 0;
    const eqH = 32;
    const neededH = capH + sayH + crossH + writeH + dropH + qtyH + qLabH + trapH + twH + eqH + 16;

    /* widest thing we might draw: the trap's pile is the worst case (91 → nine
       pills and a dot), so measure it rather than guess */
    const worstT = S.showTrap ? Math.max(T, tensOf(trapNumeral(V))) : T;
    const worstO = S.showTrap ? Math.max(O, onesOf(trapNumeral(V))) : O;
    const neededW = layoutQuantity(worstT, worstO, 0, 0, 1).totalW + 150;

    const k = Math.min(1, (H - 8) / neededH, (W - 20) / Math.max(neededW, 320));
    const f = (px, weight) => `${weight || 600} ${Math.max(7, px * k).toFixed(1)}px ui-monospace, Menlo, monospace`;

    /* Centre the whole figure in the stage.  The number of rows changes from
       step to step, so anchoring at the top would leave a large dead void on
       the early steps and make the picture look like it had fallen out of the
       frame. */
    const cx = W / 2;
    let y = Math.max(4, (H - neededH * k) / 2) + capH * k;

    /* one line of orientation, and only in the calibration, where the picture
       stops being the lesson's number and starts being the child's answer */
    if (S.calib) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = f(12, 600);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('this is what YOU wrote', 12, y - 8 * k);
    }

    /* ---- helper: a rounded word chip.  `scale` shrinks the whole chip, font
       included, so a measured width always matches the drawn width. --------- */
    const chipW = (text, scale) => {
      ctx.font = f(19 * scale, 700);
      return ctx.measureText(text).width + 26 * k * scale;
    };
    const chip = (text, role, cxc, cyc, scale) => {
      const kk = k * scale;
      const w = chipW(text, scale); // sets ctx.font as a side effect — reused below
      const h = 38 * kk;
      const x = cxc - w / 2;
      const yy = cyc - h / 2;
      const col = roleColor(role);
      ctx.fillStyle = role === 'opaque' ? 'rgba(28,43,58,0.06)' : shade(col, 0.88);
      rr(x, yy, w, h, 8 * kk);
      ctx.fill();
      ctx.strokeStyle = role === 'opaque' ? 'rgba(28,43,58,0.3)' : col;
      ctx.lineWidth = 1.4;
      rr(x, yy, w, h, 8 * kk);
      ctx.stroke();
      ctx.fillStyle = role === 'opaque' ? INK : shade(col, -0.15);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cxc, cyc + 1);
      return { x, y: yy, w, h, cx: cxc, cy: cyc };
    };

    /* ---- helper: a digit box ---------------------------------------------- */
    const digitBox = (d, role, cxc, cyc, ghost, scale) => {
      const kk = k * scale;
      const w = 46 * kk;
      const h = 54 * kk;
      const x = cxc - w / 2;
      const yy = cyc - h / 2;
      const col = ghost ? GHOST : roleColor(role);
      ctx.fillStyle = ghost ? 'rgba(139,147,160,0.07)' : shade(col, 0.9);
      rr(x, yy, w, h, 7 * kk);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = ghost ? 1.2 : 1.6;
      if (ghost) ctx.setLineDash([4, 3]);
      rr(x, yy, w, h, 7 * kk);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ghost ? col : shade(col, -0.18);
      ctx.font = f(30 * scale, 700);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(d), cxc, cyc + 1);
      return { x, y: yy, w, h, cx: cxc, cy: cyc };
    };

    /* ---- helper: an arrow with an optional white bridge at a crossing ------ */
    const arrow = (x0, y0, x1, y1, col, bridge) => {
      const my = (y0 + y1) / 2;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(x0, my, x1, my, x1, y1 - 8 * k);
      };
      if (bridge) {
        // draw a fat white stroke first so this arrow reads as passing OVER
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6 * k;
        ctx.lineCap = 'round';
        path();
        ctx.stroke();
      }
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.2 * k;
      ctx.lineCap = 'round';
      path();
      ctx.stroke();
      // head
      const a = Math.PI / 2;
      const hs = 7 * k;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - hs * Math.cos(a - 0.45), y1 - hs * Math.sin(a - 0.45));
      ctx.lineTo(x1 - hs * Math.cos(a + 0.45), y1 - hs * Math.sin(a + 0.45));
      ctx.closePath();
      ctx.fill();
    };

    /* ---- helper: the SAY row + WRITE row + the arrows between them --------- */
    const sayWrite = (val, yTop, scale, withSay) => {
      const kk = k * scale;
      const parts = sayParts(val);
      const t = tensOf(val);
      const o = onesOf(val);
      const twoDigit = val >= 10;

      let chips = [];
      let yy = yTop;
      if (withSay) {
        // measure first so the group can be centred
        const ws = parts.map((p) => chipW(p.text, scale));
        const gap = 10 * kk;
        const totW = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
        let x = cx - totW / 2;
        const cyc = yy + 19 * kk;
        chips = parts.map((p, i) => {
          const c = chip(p.text, p.role, x + ws[i] / 2, cyc, scale);
          x += ws[i] + gap;
          return c;
        });
        yy += 44 * kk + 60 * kk;
      } else {
        yy += 14 * kk;
      }

      // the numeral: tens digit LEFT, ones digit RIGHT — always written order
      const boxes = [];
      const bw = 46 * kk;
      const bgap = 8 * kk;
      const cyb = yy + 27 * kk;
      if (twoDigit) {
        const totW = bw * 2 + bgap;
        const x0 = cx - totW / 2;
        boxes.push(digitBox(t, 'ten', x0 + bw / 2, cyb, false, scale));
        boxes.push(digitBox(o, 'more', x0 + bw * 1.5 + bgap, cyb, false, scale));
      } else {
        boxes.push(digitBox(o, 'more', cx, cyb, false, scale));
      }

      /* the arrows — the centrepiece.  Each spoken part flies to the digit it
         becomes.  For a teen those two flights CROSS. */
      if (withSay && chips.length) {
        const didCross = crosses(val);
        const targetFor = (p) => {
          if (p.role === 'opaque') return null;
          if (!twoDigit) return boxes[0];
          return p.role === 'ten' ? boxes[0] : boxes[1];
        };
        // draw the some-more arrow first, then the ten's arrow bridges over it
        const order = [...parts.keys()].sort((a, b) => (parts[a].role === 'ten' ? 1 : 0) - (parts[b].role === 'ten' ? 1 : 0));
        for (const i of order) {
          const tgt = targetFor(parts[i]);
          if (!tgt) continue;
          arrow(
            chips[i].cx,
            chips[i].y + chips[i].h,
            tgt.cx,
            tgt.y - 2 * kk,
            roleColor(parts[i].role),
            didCross && parts[i].role === 'ten'
          );
        }
        if (parts.length === 1 && parts[0].role === 'opaque') {
          ctx.fillStyle = INK_SOFT;
          ctx.font = f(11.5 * scale, 600);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            'this word hides its parts — no “-teen”, no clue',
            cx,
            (chips[0].y + chips[0].h + boxes[0].y) / 2
          );
        } else {
          ctx.fillStyle = didCross ? TEN : INK_SOFT;
          ctx.font = f(11.5 * scale, 700);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          const label = didCross ? 'they cross ✕' : 'straight down ∥';
          const midY = (chips[0].y + chips[0].h + boxes[0].y) / 2;
          ctx.fillText(label, cx + (twoDigit ? 62 : 34) * kk, midY);
        }
      }
      return { boxes, bottom: cyb + 27 * kk };
    };

    /* ---- lane labels ------------------------------------------------------- */
    const laneTag = (text, yy) => {
      ctx.fillStyle = INK_SOFT;
      ctx.font = f(9.5, 700);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillText(text, 12, yy);
      ctx.restore();
    };

    /* =================== the main figure =================== */
    if (S.showSay) laneTag('SAY IT', y + 19 * k);
    const main = sayWrite(V, y, 1, S.showSay);
    laneTag('WRITE IT', main.bottom - 27 * k);
    y = main.bottom;

    /* ---- IT IS: sealed pills + loose dots ---------------------------------- */
    /* REFUSAL — the pill is drawn SEALED: one carmine object marked 10, with no
       cells, no subdivisions, no fill animation.  This lab is deliberately
       downstream of the sibling that owns the MAKING of a ten; here a ten
       arrives already made, because the whole point of a ten is that you stop
       counting it.  You use one; you do not build one.  (audit-teennumbers.mjs
       greps everything below the header to keep this honest.) */
    const qy = y + dropH * k + (qtyH * k) / 2;
    const q = layoutQuantity(T, O, cx, qy, k);
    laneTag('IT IS', qy);

    // drop arrows: the tens digit → the pills, the ones digit → the dots
    if (V >= 10 && q.pills.length) {
      const px = q.pills.reduce((a, p) => a + p.x + p.w / 2, 0) / q.pills.length;
      arrow(main.boxes[0].cx, main.boxes[0].y + main.boxes[0].h, px, qy - q.pillH / 2 - 2 * k, TEN, false);
    }
    if (q.dots.length) {
      const dx = q.dots.reduce((a, d) => a + d.cx, 0) / q.dots.length;
      const fromBox = main.boxes[main.boxes.length - 1];
      arrow(fromBox.cx, fromBox.y + fromBox.h, dx, qy - q.dotD / 2 - 2 * k, MORE, false);
    }

    const drawPills = (pills, col, label) => {
      for (const p of pills) {
        ctx.fillStyle = col;
        rr(p.x, p.y, p.w, p.h, 9 * k);
        ctx.fill();
        ctx.strokeStyle = shade(col, -0.28);
        ctx.lineWidth = 1.2;
        rr(p.x, p.y, p.w, p.h, 9 * k);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = f(12, 700);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, p.x + p.w / 2, p.y + p.h / 2);
      }
    };
    const drawDots = (dots, col) => {
      for (const d of dots) {
        ctx.beginPath();
        ctx.arc(d.cx, d.cy, d.r, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.strokeStyle = shade(col, -0.28);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };
    drawPills(q.pills, TEN, '10');
    drawDots(q.dots, MORE);

    // captions under each group
    ctx.textBaseline = 'top';
    ctx.font = f(11, 700);
    const capY = qy + q.pillH / 2 + 5 * k;
    const tenCap = `${T} ${T === 1 ? 'ten' : 'tens'} = ${T * 10}`;
    const moreCap = `${O} more`;
    let tenX = null;
    let moreX = null;
    if (q.pills.length) {
      const last = q.pills[q.pills.length - 1];
      tenX = (q.pills[0].x + last.x + last.w) / 2;
    }
    if (q.dots.length) {
      const d0 = q.dots[0];
      const d1 = q.dots[q.dots.length - 1];
      moreX = (d0.cx - d0.r + d1.cx + d1.r) / 2;
    }
    /* At 11 the picture is one pill and one dot, so the two captions sit ~40px
       apart while needing ~65 — "1 ten = 10" and "1 more" collided into one
       unreadable line. Push them apart only as far as they must go, keeping
       each as close to its own group as possible. (Caught at n=1 in the
       browser; the colours still tie each caption to its group.) */
    if (tenX != null && moreX != null) {
      const need = (ctx.measureText(tenCap).width + ctx.measureText(moreCap).width) / 2 + 8 * k;
      if (moreX - tenX < need) {
        const mid = (tenX + moreX) / 2;
        tenX = mid - need / 2;
        moreX = mid + need / 2;
      }
    }
    ctx.textAlign = 'center';
    if (tenX != null) {
      ctx.fillStyle = shade(TEN, -0.1);
      ctx.fillText(tenCap, tenX, capY);
    }
    if (moreX != null) {
      ctx.fillStyle = shade(MORE, -0.1);
      ctx.fillText(moreCap, moreX, capY);
    }
    y = qy + q.pillH / 2 + qLabH * k + 6 * k;

    /* ---- the trap row ------------------------------------------------------ */
    if (S.showTrap) {
      const tv = trapNumeral(V);
      const ty = y + (trapH * k) / 2;
      ctx.strokeStyle = 'rgba(139,147,160,0.5)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1;
      rr(10, y + 2 * k, W - 20, trapH * k - 6 * k, 8 * k);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = GHOST;
      ctx.font = f(10.5, 700);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('WRITE WHAT YOU HEAR →', 18, y + 8 * k);

      const tq = layoutQuantity(tensOf(tv), onesOf(tv), cx + 40 * k, ty + 8 * k, k * 0.86);
      drawPills(tq.pills, GHOST, '10');
      drawDots(tq.dots, GHOST);

      ctx.fillStyle = GHOST;
      ctx.font = f(22, 700);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(tv), cx - tq.totalW / 2 - 6 * k + 40 * k - 14 * k, ty + 8 * k);

      ctx.font = f(11, 700);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`= ${wordForm(tv)}, not ${wordForm(V)}`, cx + 40 * k + tq.totalW / 2 + 10 * k, ty + 8 * k);
      y += trapH * k;
    }

    /* ---- the twenty comparison -------------------------------------------- */
    if (S.showTwenty) {
      ctx.strokeStyle = 'rgba(28,43,58,0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(12, y + 3 * k);
      ctx.lineTo(W - 12, y + 3 * k);
      ctx.stroke();
      laneTag('NOT A TEEN', y + 26 * k);
      const tw = sayWrite(20 + S.n, y + 8 * k, 0.74, true);
      y = tw.bottom + 8 * k; // advance by what was actually drawn, not a guess
    }

    /* ---- the equation ------------------------------------------------------ */
    const eqY = Math.min(H - 10 * k, y + (eqH * k) / 2);
    ctx.textBaseline = 'middle';
    ctx.font = f(17, 700);
    const seg =
      V >= 10
        ? [
            { s: `${T * 10}`, c: TEN },
            { s: ' + ', c: INK_SOFT },
            { s: `${O}`, c: MORE },
            { s: ' = ', c: INK_SOFT },
            { s: `${V}`, c: INK },
          ]
        : [{ s: `${V}`, c: MORE }];
    let totalW = 0;
    seg.forEach((p) => (totalW += ctx.measureText(p.s).width));
    let ex = Math.max(10, cx - totalW / 2);
    ctx.textAlign = 'left';
    seg.forEach((p) => {
      ctx.fillStyle = p.c;
      ctx.fillText(p.s, ex, eqY);
      ex += ctx.measureText(p.s).width;
    });

    /* ---- CALIBRATED stamp -------------------------------------------------- */
    if (S.calibrated) {
      ctx.save();
      ctx.translate(W - 84, 30);
      ctx.rotate(-0.05);
      ctx.fillStyle = 'rgba(31,138,91,0.10)';
      rr(-62, -14, 124, 28, 7);
      ctx.fill();
      ctx.strokeStyle = OK;
      ctx.lineWidth = 2;
      rr(-62, -14, 124, 28, 7);
      ctx.stroke();
      ctx.fillStyle = OK;
      ctx.font = '700 12px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓ CALIBRATED', 0, 0.5);
      ctx.restore();
    }
  }, []);

  /* redraw when the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [displayValue, n, showSay, showTrap, showTwenty, calib, calibrated, draw]);

  /* redraw on resize */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* Every step whose words name an example opens on that example.  Without
     this the card says "four … teen" while the picture still shows whatever the
     child left the dial on — and a five-year-old reading a card about fourteen
     beside a canvas showing seventeen learns only that the lab is unreliable.
     The dial stays live afterwards, so exploring from the example still works.
     Step 1, the exploration step, deliberately has no demo and keeps the dial
     wherever the child put it. */
  useEffect(() => {
    const d = STEPS[step].demo;
    if (d != null) setN(d);
  }, [step]);

  /* hand a target to the calibration the first time we reach it; clear the
     marks so it starts un-matched */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setWl(0);
      setWr(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const setDial = (key, v) => setN(clampInt(v, 0, 9));
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    if (calib) {
      setWl(0);
      setWr(0);
    } else {
      setN(START_N);
    }
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const parts = sayParts(displayValue);
  const spoken =
    displayValue >= 10
      ? `${wordForm(displayValue)}: ${tensOf(displayValue)} ${tensOf(displayValue) === 1 ? 'ten' : 'tens'} and ` +
        `${onesOf(displayValue)} more. You say ${parts.map((p) => p.text).join('-')}, ` +
        `but you write ${tensOf(displayValue)} then ${onesOf(displayValue)}.` +
        (crosses(displayValue) ? ' The arrows cross.' : '')
      : `${wordForm(displayValue)}: no tens, just ${displayValue}.`;

  return (
    <div className="tnlab">
      <header className="head">
        <h1>Teen Numbers: Ten and Some More</h1>
        <p className="lede">
          A teen number is <em>one ten and some more</em>: 14 is 10 + 4. The hard part is not the maths — it is
          the <em>name</em>. You say “<em>four</em>-teen” but you write the <em>ten</em> first, so the arrows{' '}
          <span className="mono">cross</span>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            {burst > 0 && (
              <div className="confetti" aria-hidden="true">
                {Array.from({ length: 26 }, (_, i) => (
                  <span
                    key={i}
                    style={{
                      left: `${(i * 137) % 100}%`,
                      background: ['#c81e4f', '#3f74a6', '#1f8a5b'][i % 3],
                      animationDelay: `${(i % 7) * 60}ms`,
                      '--drift': `${((i * 53) % 60) - 30}px`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — you wrote ${wordForm(target)} correctly.` : ''}
          </p>

          <div className="toolbar">
            {canSpeak && (
              <button
                type="button"
                className={'btn ghost' + (!everSpoken ? ' attn' : '')}
                onClick={() => {
                  setEverSpoken(true);
                  sayAloud(wordForm(displayValue));
                }}
              >
                🔊 Say it aloud
              </button>
            )}
            <button type="button" className="btn ghost" onClick={reset}>
              Reset
            </button>
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
            {!calib &&
              DIALS.map((d) => {
                const unlocked = step >= d.unlock;
                return (
                  <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                    <span className="dk" style={{ color: d.color }}>
                      {d.name}
                    </span>
                    <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                    <input
                      type="range"
                      min={d.min}
                      max={d.max}
                      step={1}
                      value={n}
                      disabled={!unlocked}
                      aria-label={`${d.name} — ${d.role}`}
                      onChange={(e) => setDial(d.key, e.target.value)}
                      style={{ accentColor: d.color }}
                    />
                    <output className="dv" style={unlocked ? { color: d.color } : undefined}>
                      {unlocked ? n : '🔒'}
                    </output>
                  </label>
                );
              })}

            {calib && (
              <>
                <label className="dial">
                  <span className="dk" style={{ color: INK_HEX }}>
                    Left mark
                  </span>
                  <span className="drole">the first thing you write</span>
                  <input
                    type="range"
                    min={0}
                    max={9}
                    step={1}
                    value={wl}
                    aria-label="Left mark — the first digit you write"
                    onChange={(e) => setWl(clampInt(e.target.value, 0, 9))}
                  />
                  <output className="dv">{wl}</output>
                </label>
                <label className="dial">
                  <span className="dk" style={{ color: INK_HEX }}>
                    Right mark
                  </span>
                  <span className="drole">the second thing you write</span>
                  <input
                    type="range"
                    min={0}
                    max={9}
                    step={1}
                    value={wr}
                    aria-label="Right mark — the second digit you write"
                    onChange={(e) => setWr(clampInt(e.target.value, 0, 9))}
                  />
                  <output className="dv">{wr}</output>
                </label>
              </>
            )}
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
              <div className="target-card">
                <span className="target-k">Write this word as a number</span>
                <div className="target-word-row">
                  <span className="target-word">{wordForm(target)}</span>
                  {canSpeak && (
                    <button
                      type="button"
                      className="speak"
                      onClick={() => sayAloud(wordForm(target))}
                      aria-label={`Hear the word ${wordForm(target)}`}
                    >
                      🔊
                    </button>
                  )}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? `${wordForm(target)} = 10 + ${onesOf(target)} = ${target}`
                    : 'careful — do not just write what you hear'}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">marks right&nbsp;{marksRight}/2</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    you wrote {wl}
                    {wr} — {wordForm(wl * 10 + wr)}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setWl(0);
                  setWr(0);
                }}
              >
                New word
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
                  setN(START_N);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">N = 10 + n</span> &nbsp;·&nbsp; a teen number is <em>one</em> ten and <em>n</em>{' '}
        more, 11–19 (CCSS K.NBT.A.1, 1.NBT.B.2a–b). The teens are the only numbers English says backwards.
      </footer>

      <style jsx>{`
        .tnlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --ten: #c81e4f;
          --more: #3f74a6;
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
        .cap {
          text-transform: capitalize;
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
            /* minmax(0, 1fr), never a bare 1fr: a bare 1fr is minmax(AUTO, 1fr),
               so the column floors at the item's min-content width — and the
               stage's aspect-ratio × min-height gives it an intrinsic width of
               ~602px, which blew the whole lab out to 604px inside a 375px
               phone and scrolled the page sideways. */
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
          background: var(--ten);
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
          grid-template-columns: 96px 1fr 40px;
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
          font-weight: 600;
          font-size: 15px;
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
        }
        .dv {
          grid-column: 3;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 17px;
          font-weight: 700;
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
          border-left: 3px solid var(--ten);
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
          background: rgba(63, 116, 166, 0.06);
        }
        .target-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .target-word-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .target-word {
          font-family: var(--serif);
          font-size: 30px;
          font-weight: 600;
          text-transform: capitalize;
          letter-spacing: 0.01em;
        }
        .speak {
          font-size: 15px;
          line-height: 1;
          padding: 6px 8px;
          border-radius: 8px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          cursor: pointer;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--ten));
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
            box-shadow: 0 0 0 0 rgba(63, 116, 166, 0);
          }
          50% {
            box-shadow: 0 0 0 7px rgba(63, 116, 166, 0.22);
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
        .foot em {
          font-style: italic;
          color: var(--ink);
        }
        :global(.tnlab) :focus-visible {
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
