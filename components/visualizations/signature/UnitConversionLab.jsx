'use client';

/* ============================================================================
   UnitConversionLab — an interactive "bench" for CONVERTING MEASUREMENT UNITS.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at Grades 4-6,
   spanning the whole unit-conversion strand:

     • 4.MD.A.1  know relative sizes of units within one system; express a
                 larger unit in terms of a smaller one; record equivalents.
     • 4.MD.A.2  solve word problems that involve converting units.
     • 5.MD.A.1  convert among different-sized standard units within a system
                 and use the conversions in multi-step problems.
     • 6.RP.A.3.d use RATIO reasoning to convert units — multiply by a unit
                 rate — which is the CENTERPIECE below.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions gated on
   *answered*, and a construction-goal calibration with a live match meter.

   THE SIGNATURE CENTERPIECE — the unit-conversion analogue of the line lab's
   slope triangle or the distance lab's right triangle — is the idea that

        A CONVERSION FACTOR IS THE NUMBER 1 IN DISGUISE.

   Because 1 foot and 12 inches are the SAME length, the fraction (12 in / 1 ft)
   equals 1.  Multiplying by it therefore never changes the amount — it only
   renames the unit:

        3 ft  ×  (12 in / 1 ft)  =  36 in            [ the "ft" cancels ]

   Shown as a DOUBLE NUMBER LINE: one physical length, two rulers stacked and
   aligned so every big-unit tick lands exactly on a multiple-of-F small-unit
   tick.  A single carmine marker reads "3 ft" on the top ruler and "36 in" on
   the bottom — one length, two names.

   Everything is EXACT INTEGER ARITHMETIC.  A length is stored as a mixed
   measure — `whole` big units plus `part` leftover small units — so its total
   in small units is  whole*F + part  and nothing is ever a floating-point
   approximation.  Conversion factors are the true integer relationships
   (1 ft = 12 in, 1 yd = 3 ft, 1 m = 100 cm, 1 lb = 16 oz, 1 hr = 60 min).

   One-accent discipline, adapted for conversion: CARMINE marks the length and
   BOTH of its names (the readings on the two rulers and the marker between
   them) — it is one mathematical object.  GOLD marks the conversion factor
   itself (the tool), exactly as gold marked the measuring rod in the ruler lab.
   Soft blue is neutral structure (the rulers, the direction badge).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/UnitConversionLab.jsx
     2. Import and render it:
          import UnitConversionLab from './UnitConversionLab';
          export default function Page() { return <UnitConversionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (whole, part, famIdx,
              dir, step).
     MODEL  — the math is pure integer arithmetic; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. The length is a MIXED measure so every reachable state
   is exact integer arithmetic:
     whole — the amount in the BIG unit (0..8, kept small so the double number
             line stays legible: at most 9 big ticks).
     part  — leftover SMALL units (0 .. F-1); its max depends on the family and
             is set live in render.  This is what teaches division-with-
             remainder / mixed measures (40 in = 3 ft 4 in).
   Plus two mode controls that also unlock one per step:
     family — which pair of units (and their integer factor F).
     dir    — which way the headline reads: down = combine (×F), up = split (÷F).
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'whole', label: 'n', min: 0, max: 8, step: 1, unlock: 1, role: 'amount · in the big unit' },
  { key: 'part', label: 'r', min: 0, max: 11, step: 1, unlock: 5, role: 'leftover · in the small unit' },
];
const START = { whole: 1, part: 0, famIdx: 0, dir: 'down' };

const CENTER_STEP = 2;  // "a factor is a 1 in disguise" — the centerpiece
const FAMILY_UNLOCK = 3;
const DIR_UNLOCK = 4;
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   The unit families. Every factor is the TRUE integer relationship between the
   two units, so every number the lab ever shows is exact. `abbr` is used on the
   compact canvas/equation; the one/many names spell it out in prose.
   ------------------------------------------------------------------------- */
const FAMILIES = [
  { key: 'ftin', bigOne: 'foot', bigMany: 'feet', bigAbbr: 'ft', smallOne: 'inch', smallMany: 'inches', smallAbbr: 'in', F: 12, kind: 'length' },
  { key: 'ydft', bigOne: 'yard', bigMany: 'yards', bigAbbr: 'yd', smallOne: 'foot', smallMany: 'feet', smallAbbr: 'ft', F: 3, kind: 'length' },
  { key: 'mcm', bigOne: 'meter', bigMany: 'meters', bigAbbr: 'm', smallOne: 'centimeter', smallMany: 'centimeters', smallAbbr: 'cm', F: 100, kind: 'length' },
  { key: 'lboz', bigOne: 'pound', bigMany: 'pounds', bigAbbr: 'lb', smallOne: 'ounce', smallMany: 'ounces', smallAbbr: 'oz', F: 16, kind: 'weight' },
  { key: 'hrmin', bigOne: 'hour', bigMany: 'hours', bigAbbr: 'hr', smallOne: 'minute', smallMany: 'minutes', smallAbbr: 'min', F: 60, kind: 'time' },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Converting is exact integer arithmetic. A length is a mixed
   measure (whole big units + part small units); its size in small units is
   whole*F + part, and expressing a small total back in big units is division
   with remainder — whole = floor(total/F), part = total % F. Both directions
   are the SAME invariant read two ways.
   ------------------------------------------------------------------------- */
function totalSmall(whole, part, F) {
  return whole * F + part; // exact integer
}
/* The defining invariant this lab teaches, kept assertable for the audit:
   splitting the small total back by F reproduces the mixed measure exactly. */
function splitExact(total, F) {
  return { whole: Math.floor(total / F), part: total - Math.floor(total / F) * F };
}
function invariantHolds(whole, part, F) {
  const t = totalSmall(whole, part, F);
  const s = splitExact(t, F);
  return s.whole === whole && s.part === part && part >= 0 && part < F;
}

/* ---------------------------------------------------------------------------
   Formatting helpers.
   ------------------------------------------------------------------------- */
const plu = (n, one, many) => `${n} ${n === 1 ? one : many}`;
/* A mixed BIG reading: "3 ft", or "2 ft 6 in" when there is a leftover. */
function bigReadingAbbr(whole, part, fam) {
  const a = `${whole} ${fam.bigAbbr}`;
  return part ? `${a} ${part} ${fam.smallAbbr}` : a;
}
function bigReadingWords(whole, part, fam) {
  const a = plu(whole, fam.bigOne, fam.bigMany);
  return part ? `${a} ${plu(part, fam.smallOne, fam.smallMany)}` : a;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; each control unlocks with its step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   Grades 4-6 conversion misconceptions (add instead of multiply, "bigger unit
   -> bigger number", divide the wrong way, forget the leftover, compare across
   unlike units). Next is gated on ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One length, two rulers',
    body:
      'The stick below is measured by TWO rulers at once: feet on top, inches on the bottom. ' +
      'They are lined up so 1 foot sits exactly on 12 inches. It is one length with two names — ' +
      'the same distance, just counted in different-size units.',
    q: 'The SAME stick is measured in feet and in inches. Which will there be MORE of?',
    choices: [
      'Inches — an inch is smaller, so more of them fit',
      'Feet — feet always give the bigger number',
      'The same number of each',
    ],
    answer: 0,
    feedback:
      'A smaller unit means MORE of them fit into the same length (and a bigger unit means fewer). ' +
      'The count changes, but the actual length never does — 1 foot and 12 inches mark the very same spot.',
  },
  {
    title: 'The amount',
    body:
      'The n dial is live — it sets how many feet long the stick is. Drag it and watch the bottom ' +
      'ruler: inches = feet × 12, because every single foot is worth 12 inches. To go from a bigger ' +
      'unit to a smaller one, you MULTIPLY.',
    q: 'You have 4 feet. How many inches is that?',
    choices: ['48 inches', '16 inches — 4 + 12', '4 inches'],
    answer: 0,
    feedback:
      '4 × 12 = 48 inches. Each foot brings 12 inches along with it, so you multiply by 12 — you do ' +
      'not add. Going to a smaller unit always makes the number bigger.',
  },
  {
    title: 'A factor is a 1 in disguise',
    body:
      'Here is the secret of every conversion. Because 1 foot and 12 inches are the SAME length, the ' +
      'fraction (12 in / 1 ft) equals 1. Multiplying by 1 can never change how long the stick really ' +
      'is — it only swaps the name of the unit. The “ft” on top and bottom cancel, and inches are left.',
    q: 'Why does multiplying by (12 in / 1 ft) NOT change the real length?',
    choices: [
      'Because 12 in and 1 ft are equal, so the fraction equals 1',
      'Because 12 is a big number',
      'Because inches are longer than feet',
    ],
    answer: 0,
    feedback:
      '(12 in / 1 ft) = 1, and multiplying by 1 leaves the amount alone. That is why a conversion factor ' +
      'is a “1 in disguise”: 3 ft × (12 in / 1 ft) = 36 in — the length is identical, only the unit is new.',
  },
  {
    title: 'Different pairs, different factors',
    body:
      'The pair of units is now unlocked. Every pair has its own conversion factor: 1 yd = 3 ft, ' +
      '1 m = 100 cm, 1 lb = 16 oz, 1 hr = 60 min. Switch the pair and watch the factor — and the whole ' +
      'bottom ruler — change with it.',
    q: 'For the same 1 big unit, which pair gives the MOST small units?',
    choices: [
      'Meters & centimeters — 1 m = 100 cm',
      'Yards & feet — 1 yd = 3 ft',
      'Feet & inches — 1 ft = 12 in',
    ],
    answer: 0,
    feedback:
      'The bigger the factor, the smaller that unit is compared with the big one — so many more of them ' +
      'fit. 100 (m→cm) beats 12 (ft→in) beats 3 (yd→ft). The factor IS how many small units hide in one big one.',
  },
  {
    title: 'Split it back: divide',
    body:
      'Going the other way — from a smaller unit up to a bigger one — is the INVERSE, so you DIVIDE by ' +
      'the factor. 36 in ÷ 12 = 3 ft. Flip the direction toggle to read the same double number line as a ' +
      'division instead of a multiplication.',
    q: '24 inches equals how many feet?',
    choices: ['2 feet', '12 feet', '288 inches — you multiply'],
    answer: 0,
    feedback:
      '24 ÷ 12 = 2 feet. Dividing undoes multiplying: to a BIGGER unit the number gets smaller, because ' +
      'each big unit gobbles up 12 of the small ones.',
  },
  {
    title: 'Leftovers: mixed measures',
    body:
      'Real lengths are not always a whole number of big units. 27 inches is 2 feet with 3 inches left ' +
      'over, because 27 = 2 × 12 + 3. The r dial adds those leftover small units. Dividing to convert up ' +
      'is just division with a remainder.',
    q: '40 inches is how many feet and inches?',
    choices: ['3 feet 4 inches', '4 feet 0 inches', '3 feet 40 inches'],
    answer: 0,
    feedback:
      '40 ÷ 12 = 3 remainder 4, so 40 in = 3 ft 4 in. The quotient is the big units and the remainder is ' +
      'the leftover small units — never larger than the factor, or another whole big unit would fit.',
  },
  {
    title: 'Build it!',
    body:
      'Final challenge. Build a length equal to exactly the target shown — in the SAME units named in ' +
      'the target. Set the n dial for the big units and the r dial for the leftover small units until ' +
      'your carmine marker lands on the grey target. Remember: whole × factor + leftover = the target. ' +
      'Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): build a length that equals exactly `T` small units in a
   given family. Because the leftover is capped at F-1, the mixed measure
   (whole, part) that hits T is UNIQUE — whole = floor(T/F), part = T % F — so
   an exact match forces the correct division-with-remainder. The meter is
   integer closeness on the small total, tuned to the family's factor so being
   a big unit away still reads as progress; CALIBRATED fires only on exact hit.
   ------------------------------------------------------------------------- */
const matchPercent = (total, T, F) => 100 * Math.max(0, 1 - Math.abs(total - T) / (2 * F));
const isCalibrated = (total, T) => total === T;

function makeTarget(prevKey) {
  let pick;
  do {
    const famIdx = Math.floor(Math.random() * FAMILIES.length);
    const F = FAMILIES[famIdx].F;
    const whole = 2 + Math.floor(Math.random() * 6); // 2..7
    // Half the time force a leftover so the challenge exercises the remainder.
    const part = Math.random() < 0.5 ? 0 : 1 + Math.floor(Math.random() * (F - 1));
    const total = whole * F + part;
    pick = { famIdx, whole, part, total, F, key: `${famIdx}:${total}` };
  } while (prevKey != null && pick.key === prevKey);
  return pick;
}

/* EDIT 5 — Equation display. The headline reads the double number line in the
   chosen direction. One-accent: the numbers that NAME the length (whole, part,
   total) are carmine — they are all the one object; the conversion factor is
   gold; operators and unit words are ink-soft. */
function ConvEquation({ whole, part, fam, dir }) {
  const F = fam.F;
  const total = totalSmall(whole, part, F);
  if (dir === 'down') {
    if (part === 0) {
      return (
        <span className="eq">
          <span className="t-len">{whole}</span>
          <span className="t-op">&nbsp;{fam.bigAbbr}&nbsp;×&nbsp;</span>
          <span className="t-fac">{F}</span>
          <span className="t-op">&nbsp;=&nbsp;</span>
          <span className="t-len">{total}</span>
          <span className="t-op">&nbsp;{fam.smallAbbr}</span>
        </span>
      );
    }
    return (
      <span className="eq">
        <span className="t-len">{whole}</span>
        <span className="t-op">&nbsp;{fam.bigAbbr}&nbsp;</span>
        <span className="t-len">{part}</span>
        <span className="t-op">&nbsp;{fam.smallAbbr}&nbsp;=&nbsp;</span>
        <span className="t-len">{total}</span>
        <span className="t-op">&nbsp;{fam.smallAbbr}</span>
      </span>
    );
  }
  // up (divide / split)
  if (part === 0) {
    return (
      <span className="eq">
        <span className="t-len">{total}</span>
        <span className="t-op">&nbsp;{fam.smallAbbr}&nbsp;÷&nbsp;</span>
        <span className="t-fac">{F}</span>
        <span className="t-op">&nbsp;=&nbsp;</span>
        <span className="t-len">{whole}</span>
        <span className="t-op">&nbsp;{fam.bigAbbr}</span>
      </span>
    );
  }
  return (
    <span className="eq">
      <span className="t-len">{total}</span>
      <span className="t-op">&nbsp;{fam.smallAbbr}&nbsp;=&nbsp;</span>
      <span className="t-len">{whole}</span>
      <span className="t-op">&nbsp;{fam.bigAbbr}&nbsp;</span>
      <span className="t-len">{part}</span>
      <span className="t-op">&nbsp;{fam.smallAbbr}</span>
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function UnitConversionLab() {
  const [whole, setWhole] = useState(START.whole);
  const [part, setPart] = useState(START.part);
  const [famIdx, setFamIdx] = useState(START.famIdx);
  const [dir, setDir] = useState(START.dir);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null); // { famIdx, whole, part, total, F, key }
  const [showOne, setShowOne] = useState(false); // emphasize the "×1 in disguise" factor
  const [sweeping, setSweeping] = useState(false); // opt-in "count up" animation

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sweepRef = useRef(1); // animation progress 0..1 (1 = fully drawn)
  const sceneRef = useRef({});

  const fam = FAMILIES[famIdx];
  const current = STEPS[step];
  const calib = !!current.calib;
  const F = fam.F;
  const total = totalSmall(whole, part, F);

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // animation handler never read stale values.
  sceneRef.current = {
    whole, part, fam, dir, step, calib, target, showOne,
    isCenter: step === CENTER_STEP,
  };

  const pct = target != null ? matchPercent(total, target.total, target.F) : 0;
  const calibrated = target != null ? isCalibrated(total, target.total) : false;

  /* ---- big-unit position → screen transform + full redraw from state ------ */
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
    const CARMINE = '#C81E4F';
    const CARM_SOFT = 'rgba(200,30,79,0.12)';
    const BLUE = '#3F74A6';
    const GOLD = '#D9982B';
    const GOLD_SOFT = 'rgba(217,152,43,0.16)';
    const GRID = 'rgba(199,216,228,0.6)';

    const S = sceneRef.current;
    const f = S.fam;
    const Fv = f.F;
    const totalS = totalSmall(S.whole, S.part, Fv);
    const bigPos = S.whole + S.part / Fv; // the length, measured in big units

    // span of the number line, in big units; always shows the marker (and, in
    // calibration, the grey target too).
    let spanBig = Math.max(3, S.whole + 1);
    // in calibration, keep the grey target a tick clear of the right-edge caption
    if (S.calib && S.target) spanBig = Math.max(spanBig, Math.ceil(S.target.total / Fv) + 2);
    spanBig = Math.min(spanBig, 12);

    const padL = 46;
    const padR = 26;
    const spanW = W - padL - padR;
    const xOf = (bp) => padL + (bp / spanBig) * spanW; // big-position → x
    const xSmall = (s) => xOf(s / Fv); // small value → x (shares the transform)

    const yTop = Math.round(H * 0.36); // big ruler baseline
    const yBot = Math.round(H * 0.63); // small ruler baseline

    ctx.clearRect(0, 0, W, H);

    /* ---- faint quadrille verticals at every big tick ----------------------- */
    ctx.lineWidth = 1;
    ctx.strokeStyle = GRID;
    ctx.beginPath();
    for (let k = 0; k <= spanBig; k++) {
      const X = Math.round(xOf(k)) + 0.5;
      ctx.moveTo(X, yTop - 26);
      ctx.lineTo(X, yBot + 26);
    }
    ctx.stroke();

    /* ---- span band from 0 to the marker (the length, highlighted) ---------- */
    const sweepT = S.calib ? 1 : sweepRef.current; // never animate during calibration
    const markPos = bigPos * sweepT;
    const xM = xOf(markPos);
    ctx.fillStyle = CARM_SOFT;
    ctx.fillRect(xOf(0), yTop, xM - xOf(0), yBot - yTop);

    /* ---- the TOP ruler: the big unit --------------------------------------- */
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xOf(0), yTop);
    ctx.lineTo(xOf(spanBig), yTop);
    ctx.stroke();

    ctx.textAlign = 'center';
    for (let k = 0; k <= spanBig; k++) {
      const X = xOf(k);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(Math.round(X) + 0.5, yTop);
      ctx.lineTo(Math.round(X) + 0.5, yTop - 12);
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(k), X, yTop - 15);
    }
    // ruler caption on its own row, above the tick numbers (never collides)
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${f.bigMany} (${f.bigAbbr})`, xOf(spanBig), yTop - 31);

    /* ---- the BOTTOM ruler: the small unit ---------------------------------- */
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xOf(0), yBot);
    ctx.lineTo(xOf(spanBig), yBot);
    ctx.stroke();

    // minor small ticks only when they stay legible (small factor, not too wide)
    const drawMinor = Fv <= 12 && spanBig * Fv <= 90;
    if (drawMinor) {
      ctx.strokeStyle = 'rgba(28,43,58,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let s = 0; s <= spanBig * Fv; s++) {
        if (s % Fv === 0) continue; // majors drawn below
        const X = Math.round(xSmall(s)) + 0.5;
        ctx.moveTo(X, yBot);
        ctx.lineTo(X, yBot + 7);
      }
      ctx.stroke();
    }
    // major small ticks: aligned under every big tick, labelled with k*F
    ctx.textAlign = 'center';
    for (let k = 0; k <= spanBig; k++) {
      const X = xOf(k);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(Math.round(X) + 0.5, yBot);
      ctx.lineTo(Math.round(X) + 0.5, yBot + 13);
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textBaseline = 'top';
      ctx.fillText(String(k * Fv), X, yBot + 16);
    }
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${f.smallMany} (${f.smallAbbr})`, xOf(spanBig), yBot - 6);

    /* ---- the conversion-factor bracket: one big unit = F small units -------
       This is the "1 in disguise" made visible — the first big segment spans
       exactly F small units. Emphasised on the centerpiece step or via toggle. */
    {
      const emph = S.isCenter || S.showOne;
      const bx0 = xOf(0);
      const bx1 = xOf(1);
      const by = yBot + 34;
      ctx.strokeStyle = emph ? CARMINE : GOLD;
      ctx.lineWidth = emph ? 2.4 : 1.8;
      ctx.beginPath();
      ctx.moveTo(bx0, by - 5);
      ctx.lineTo(bx0, by);
      ctx.lineTo(bx1, by);
      ctx.lineTo(bx1, by - 5);
      ctx.stroke();
      const lab = `1 ${f.bigOne} = ${Fv} ${f.smallMany}` + (emph ? '   → × 1' : '');
      ctx.font = `${emph ? 700 : 600} 12px ui-monospace, "SF Mono", Menlo, monospace`;
      ctx.fillStyle = emph ? CARMINE : GOLD;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const tw = ctx.measureText(lab).width;
      let lx = (bx0 + bx1) / 2 - tw / 2;
      lx = Math.min(Math.max(lx, padL), W - padR - tw);
      // soft plate so it reads over the grid
      ctx.fillStyle = 'rgba(251,251,248,0.9)';
      ctx.fillRect(lx - 4, by + 3, tw + 8, 17);
      ctx.fillStyle = emph ? CARMINE : GOLD;
      ctx.fillText(lab, lx, by + 4);
    }

    /* ---- the calibration target: a grey dashed marker to aim at ------------ */
    if (S.calib && S.target != null) {
      const tx = xOf(S.target.total / Fv);
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.9)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(tx, yTop - 20);
      ctx.lineTo(tx, yBot + 20);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = INK_SOFT;
      ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('target', tx, yTop - 22);
      ctx.restore();
    }

    /* ---- the MARKER: the length, its one carmine self ---------------------- */
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(xM, yTop - 4);
    ctx.lineTo(xM, yBot + 4);
    ctx.stroke();
    // dots where the length lands on each ruler
    for (const yy of [yTop, yBot]) {
      ctx.fillStyle = CARMINE;
      ctx.beginPath();
      ctx.arc(xM, yy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(xM, yy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    /* ---- a pill for each reading (one length, two names) ------------------- */
    const drawPill = (text, cx, cy) => {
      ctx.font = '700 14px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(text).width;
      const bw = tw + 18;
      const bh = 24;
      let px = Math.min(Math.max(cx, padL + bw / 2), W - padR - bw / 2);
      const bxp = px - bw / 2;
      const rr = 7;
      ctx.fillStyle = CARMINE;
      ctx.beginPath();
      ctx.moveTo(bxp + rr, cy - bh / 2);
      ctx.arcTo(bxp + bw, cy - bh / 2, bxp + bw, cy + bh / 2, rr);
      ctx.arcTo(bxp + bw, cy + bh / 2, bxp, cy + bh / 2, rr);
      ctx.arcTo(bxp, cy + bh / 2, bxp, cy - bh / 2, rr);
      ctx.arcTo(bxp, cy - bh / 2, bxp + bw, cy - bh / 2, rr);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, px, cy + 0.5);
      return px;
    };
    // during the sweep the small reading counts up with the marker
    const shownTotal = S.calib ? totalS : Math.round(totalS * sweepT);
    const shownBig = S.calib ? bigReadingAbbr(S.whole, S.part, f) : bigReadingAbbr(Math.floor(shownTotal / Fv), shownTotal % Fv, f);
    // connector lines from marker up/down to the pills
    ctx.strokeStyle = 'rgba(200,30,79,0.4)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xM, yTop - 4);
    ctx.lineTo(xM, Math.round(H * 0.12) + 12);
    ctx.moveTo(xM, yBot + 4);
    ctx.lineTo(xM, Math.round(H * 0.9) - 12);
    ctx.stroke();
    ctx.setLineDash([]);
    drawPill(shownBig, xM, Math.round(H * 0.12));
    drawPill(`${shownTotal} ${f.smallAbbr}`, xM, Math.round(H * 0.9));

    /* ---- direction badge (top-left) ---------------------------------------- */
    {
      const down = S.dir === 'down';
      const txt = down ? `combine ↓  × ${Fv}` : `split ↑  ÷ ${Fv}`;
      ctx.font = '700 11.5px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(txt).width;
      ctx.fillStyle = 'rgba(63,116,166,0.12)';
      ctx.fillRect(10, 10, tw + 16, 22);
      ctx.strokeStyle = 'rgba(63,116,166,0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(10.5, 10.5, tw + 15, 21);
      ctx.fillStyle = BLUE;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, 18, 22);
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [whole, part, famIdx, dir, step, target, showOne, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step the first time we reach it, set the
     family to the target's, and reset the length so it starts un-matched. */
  useEffect(() => {
    if (current.calib && target == null) {
      const t = makeTarget(null);
      setTarget(t);
      setFamIdx(t.famIdx);
      setWhole(0);
      setPart(0);
      setDir('down');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the "count up" sweep — time-based, opt-in, reduced-motion aware */
  useEffect(() => {
    if (!sweeping) {
      sweepRef.current = 1;
      draw();
      return;
    }
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      sweepRef.current = 1;
      setSweeping(false);
      return;
    }
    let raf;
    let start = null;
    const dur = 1100; // ms
    sweepRef.current = 0;
    const loop = (now) => {
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / dur);
      sweepRef.current = t;
      draw();
      if (t < 1) raf = requestAnimationFrame(loop);
      else setSweeping(false);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sweeping, whole, part, famIdx, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'whole') setWhole(v);
    else setPart(Math.min(v, F - 1));
    if (sweeping) setSweeping(false);
  };
  const onFamily = (idx) => {
    setFamIdx(idx);
    setPart((p) => Math.min(p, FAMILIES[idx].F - 1)); // clamp leftover to new factor
    if (sweeping) setSweeping(false);
  };
  const onDir = (d) => setDir(d);

  const resetDials = () => {
    if (calib) {
      setWhole(0);
      setPart(0);
    } else {
      setWhole(START.whole);
      setPart(0);
    }
    setShowOne(false);
    if (sweeping) setSweeping(false);
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

  const spoken =
    `A double number line shows one length two ways. On the top ruler it reads ` +
    `${bigReadingWords(whole, part, fam)}. On the bottom ruler it reads ` +
    `${plu(total, fam.smallOne, fam.smallMany)}. ` +
    `The conversion factor is 1 ${fam.bigOne} equals ${fam.F} ${fam.smallMany}. ` +
    (dir === 'down'
      ? `To convert to the smaller unit you multiply by ${fam.F}.`
      : `To convert to the bigger unit you divide by ${fam.F}.`);

  return (
    <div className="uclab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Converting Units of Measurement</h1>
        <p className="lede">
          The same length has two names on two rulers. Change the amount and watch inches turn into
          feet: a <em>bigger</em> unit needs <em>fewer</em> of them. The secret is that a conversion
          factor like <span className="mono">(12 in / 1 ft)</span> equals <em>1</em> — so multiplying
          by it renames the unit without changing the length. Each dial unlocks with the lesson, and
          you finish by building a length to an exact target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <ConvEquation whole={whole} part={part} fam={fam} dir={dir} />
            </p>
            <p className="equation-sub mono">
              1 {fam.bigOne} = {fam.F} {fam.smallMany} &nbsp;·&nbsp; a factor is a 1 in disguise
            </p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            <span className="hint mono">carmine = the length (both names) · gold = the conversion factor</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated
              ? ` Calibrated — you built ${plu(target.total, target ? FAMILIES[target.famIdx].smallOne : '', target ? FAMILIES[target.famIdx].smallMany : '')}.`
              : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">You have</span>
              <span className="fact-v mono carm big">
                {dir === 'down' ? bigReadingAbbr(whole, part, fam) : `${total} ${fam.smallAbbr}`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Conversion factor</span>
              <span className="fact-v mono gold">
                1 {fam.bigAbbr} = {fam.F} {fam.smallAbbr}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">{dir === 'down' ? `In ${fam.smallMany}` : `In ${fam.bigMany}`}</span>
              <span className="fact-v mono carm">
                {dir === 'down' ? `${total} ${fam.smallAbbr}` : bigReadingAbbr(whole, part, fam)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Check</span>
              <span className="fact-v mono">
                {whole} × {fam.F} + {part} = {total}
              </span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className="btn ghost"
              onClick={() => setSweeping(true)}
              disabled={sweeping || calib || total === 0}
            >
              {sweeping ? 'Counting…' : 'Count up ▸'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showOne ? ' on' : '')}
              onClick={() => setShowOne((s) => !s)}
              aria-pressed={showOne}
            >
              {showOne ? 'Hide the ×1' : 'Show the ×1'}
            </button>
            <button type="button" className="btn ghost" onClick={resetDials}>
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
            {PARAMS.map((d) => {
              const unlocked = step >= d.unlock;
              const val = { whole, part }[d.key];
              const dmax = d.key === 'part' ? F - 1 : d.max;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className={'dk ' + d.key}>{d.label}</span>
                  <span className="drole">
                    {unlocked
                      ? d.key === 'whole'
                        ? `amount · in ${fam.bigMany}`
                        : `leftover · in ${fam.smallMany} (0–${dmax})`
                      : 'unlocks soon'}
                  </span>
                  <input
                    type="range"
                    min={d.min}
                    max={dmax}
                    step={d.step}
                    value={Math.min(val, dmax)}
                    disabled={!unlocked}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? Math.min(val, dmax) : '🔒'}</output>
                </label>
              );
            })}
          </div>

          {/* family selector (unlocks at step FAMILY_UNLOCK) */}
          <div className={'control' + (step >= FAMILY_UNLOCK ? '' : ' locked')}>
            <span className="ck">units</span>
            <span className="crole">
              {step >= FAMILY_UNLOCK ? 'the pair of units and its factor' : 'unlocks soon'}
            </span>
            <div className="seg" role="group" aria-label="Unit pair">
              {FAMILIES.map((fm, i) => (
                <button
                  type="button"
                  key={fm.key}
                  className={'segbtn' + (i === famIdx ? ' sel' : '')}
                  onClick={() => onFamily(i)}
                  disabled={step < FAMILY_UNLOCK || calib}
                  aria-pressed={i === famIdx}
                >
                  {fm.bigAbbr} &amp; {fm.smallAbbr}
                </button>
              ))}
            </div>
          </div>

          {/* direction toggle (unlocks at step DIR_UNLOCK) */}
          <div className={'control' + (step >= DIR_UNLOCK ? '' : ' locked')}>
            <span className="ck">way</span>
            <span className="crole">
              {step >= DIR_UNLOCK ? 'combine to small, or split to big' : 'unlocks soon'}
            </span>
            <div className="seg" role="group" aria-label="Conversion direction">
              <button
                type="button"
                className={'segbtn' + (dir === 'down' ? ' sel' : '')}
                onClick={() => onDir('down')}
                disabled={step < DIR_UNLOCK}
                aria-pressed={dir === 'down'}
              >
                combine ↓ × {F}
              </button>
              <button
                type="button"
                className={'segbtn' + (dir === 'up' ? ' sel' : '')}
                onClick={() => onDir('up')}
                disabled={step < DIR_UNLOCK}
                aria-pressed={dir === 'up'}
              >
                split ↑ ÷ {F}
              </button>
            </div>
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
              <p className="calib-goal mono">
                Build{' '}
                <strong>
                  {target.total} {FAMILIES[target.famIdx].smallMany}
                </strong>{' '}
                &nbsp;=&nbsp; {target.whole} {FAMILIES[target.famIdx].bigAbbr}
                {target.part ? ` ${target.part} ${FAMILIES[target.famIdx].smallAbbr}` : ''}
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    n × {target.F} + r must equal {target.total}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const t = makeTarget(target.key);
                  setTarget(t);
                  setFamIdx(t.famIdx);
                  setWhole(0);
                  setPart(0);
                  setDir('down');
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
                  setWhole(START.whole);
                  setPart(START.part);
                  setFamIdx(START.famIdx);
                  setDir(START.dir);
                  setShowOne(false);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">amount × factor = amount in smaller units</span> &nbsp;·&nbsp; a
        conversion factor is the number 1 in disguise; multiply to go to a smaller unit, divide to go
        to a bigger one (CCSS 4.MD.A.1–2, 5.MD.A.1, 6.RP.A.3.d).
      </footer>

      <style jsx>{`
        .uclab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #3f74a6;
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
          max-width: 70ch;
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
        }
        .equation :global(.t-len) {
          color: var(--curve);
          font-weight: 700;
        }
        .equation :global(.t-fac) {
          color: var(--gold);
          font-weight: 700;
        }
        .equation :global(.t-op) {
          color: var(--ink-soft);
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
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 5;
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
        .fact-v.gold {
          color: var(--gold);
          font-weight: 700;
        }
        .fact-v.big {
          font-size: 19px;
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
          margin-bottom: 12px;
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
        .dk.whole {
          color: var(--curve);
        }
        .dk.part {
          color: var(--gold);
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
        .control {
          display: grid;
          grid-template-columns: 46px 1fr;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 2px 10px;
          margin-bottom: 12px;
        }
        .control.locked {
          opacity: 0.5;
        }
        .ck {
          grid-row: 1 / 3;
          font-family: var(--serif);
          font-style: italic;
          font-size: 16px;
          color: var(--blue);
        }
        .crole {
          grid-column: 2;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .seg {
          grid-column: 2;
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .segbtn {
          font: 600 12px/1 var(--mono);
          padding: 6px 9px;
          border-radius: 7px;
          border: 1px solid rgba(28, 43, 58, 0.22);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, color 0.15s;
        }
        .segbtn:not(:disabled):hover {
          border-color: var(--ink);
        }
        .segbtn.sel {
          background: var(--blue);
          border-color: var(--blue);
          color: #fff;
        }
        .segbtn:disabled {
          cursor: not-allowed;
        }
        .quiz {
          margin-top: 6px;
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
        .calib-goal {
          margin: 0;
          font-size: 14px;
          color: var(--ink);
        }
        .calib-goal strong {
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
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
          text-align: right;
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
        :global(.uclab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .segbtn {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
