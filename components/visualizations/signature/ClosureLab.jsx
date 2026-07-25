'use client';

/* ============================================================================
   ClosureLab — an interactive "bench" for WHICH BIN THE ANSWER LANDS IN when
   you combine a rational with an irrational, and — the part that matters — WHY
   it can never land anywhere else.

        rational + rational    = rational      (the bin is closed)
        rational + irrational  = IRRATIONAL    (always — and here is why)
        (nonzero rational) × irrational = IRRATIONAL
        irrational + irrational = either       (√2 + (−√2) = 0)

   Built for MAIS (math AI system, www.mais.ac), K-12.  GRADES 9–11 —
   CCSS N-RN.B.3 ("Explain why the sum or product of two rational numbers is
   rational; that the sum of a rational number and an irrational number is
   irrational; and that the product of a nonzero rational number and an
   irrational number is irrational").

   ---------------------------------------------------------------------------
   HOW THIS LAB STAYS DISTINCT  (the library's hard rule)
   ---------------------------------------------------------------------------
     • IrrationalLab  — owns WHAT an irrational number IS: the endless
                        non-repeating decimal, √2's proof, and locating one by
                        zooming a number line.  It CLASSIFIES numbers one at a
                        time and never combines two of them.  This bench never
                        re-runs that zoom or re-proves √2 irrational; it starts
                        from "√2 is irrational" as a given and asks what happens
                        when you ADD something to it.
     • RationalNumbersLab — owns p/q as a point on the line.
     • PolynomialArithmeticLab — owns CLOSURE as an idea ("there is nowhere
                        outside the ledger for a slip to land") for polynomials.
                        This bench is its number-system sibling and cites the
                        word deliberately: same idea, different bin.
     • OperationsLab  — owns the order of operations.

   What no sibling owns: the ESCAPE ARGUMENT.  Suppose r + x were rational for
   rational r and irrational x.  Then x = (r + x) − r would be a difference of
   two rationals, hence rational — contradicting what x is.  So the sum cannot
   be rational.  The bench makes that contradiction a thing you watch: the
   rational bin is closed under subtraction, so anything that escapes it could
   be dragged back in, and x refuses to be dragged.

   EXACT ARITHMETIC IN ℚ(√2).  Every number on the bench is held as an exact
   pair of REDUCED FRACTIONS (a, b) meaning a + b·√2 — never a decimal.  Sums
   and products are exact in that form, because ℚ(√2) is closed:
        (a₁+b₁√2) + (a₂+b₂√2) = (a₁+a₂) + (b₁+b₂)√2
        (a₁+b₁√2) · (a₂+b₂√2) = (a₁a₂ + 2b₁b₂) + (a₁b₂ + a₂b₁)√2
   and a number is RATIONAL exactly when its b is 0 — an exact test, never a
   decimal comparison.  The decimal readout is a rounded shadow, labelled as one.

   The block between MODEL:START and MODEL:END is pure, React-free JavaScript;
   audit-closure.mjs slices it out and evaluates it, so the audit tests the code
   that ships.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==== MODEL:START — pure math. No React, no pixels, no DOM. =============== */

/* the dials run in HALVES, so a "rational" on this bench is a genuine fraction
   (3/2, −5/2) and not merely an integer */
const DIAL_MIN = -8, DIAL_MAX = 8;
const ROOT2 = Math.SQRT2;

const gcdI = (x, y) => (y ? gcdI(y, Math.abs(x % y)) : Math.abs(x));

/* an exact reduced fraction, denominator always positive */
function frac(n, d) {
  if (d === 0) return null;
  const s = d < 0 ? -1 : 1;
  const nn = n * s, dd = d * s;
  const g = gcdI(nn, dd) || 1;
  return { n: nn / g, d: dd / g };
}
const addF = (p, q) => frac(p.n * q.d + q.n * p.d, p.d * q.d);
const subF = (p, q) => frac(p.n * q.d - q.n * p.d, p.d * q.d);
const mulF = (p, q) => frac(p.n * q.n, p.d * q.d);
const isZeroF = (p) => p.n === 0;
const eqF = (p, q) => p.n === q.n && p.d === q.d;
const valF = (p) => p.n / p.d;
function fracString(p) {
  if (p == null) return '—';
  return p.d === 1 ? String(p.n) : `${p.n}/${p.d}`;
}

/* a number of ℚ(√2): a + b·√2, both parts exact fractions. Every number this
   bench can build lives here, which is what makes every claim checkable. */
const num = (a, b) => ({ a, b });
const fromDial = (ka, kb) => num(frac(ka, 2), frac(kb, 2));

/* N-RN.3's whole test, and it is exact: a number is RATIONAL exactly when the
   √2 part is zero. No decimal is ever compared. */
const isRational = (z) => isZeroF(z.b);
const isIrrational = (z) => !isRational(z);

/* ℚ(√2) is closed under both operations — that is why the bench can promise an
   exact answer for every combination it offers. */
const addN = (z, w) => num(addF(z.a, w.a), addF(z.b, w.b));
const subN = (z, w) => num(subF(z.a, w.a), subF(z.b, w.b));
const mulN = (z, w) => num(
  addF(mulF(z.a, w.a), mulF(frac(2, 1), mulF(z.b, w.b))),
  addF(mulF(z.a, w.b), mulF(z.b, w.a))
);
const eqN = (z, w) => eqF(z.a, w.a) && eqF(z.b, w.b);
/* the rounded shadow — the one inexact number on the bench, and it is labelled */
const decimal = (z) => valF(z.a) + valF(z.b) * ROOT2;

function numString(z) {
  const a = fracString(z.a);
  if (isZeroF(z.b)) return a;
  const bAbs = { n: Math.abs(z.b.n), d: z.b.d };
  const coef = bAbs.n === 1 && bAbs.d === 1 ? '' : `${fracString(bAbs)}·`;
  const sign = z.b.n < 0 ? ' − ' : ' + ';
  if (isZeroF(z.a)) return `${z.b.n < 0 ? '−' : ''}${coef}√2`;
  return `${a}${sign}${coef}√2`;
}

/* ---- the escape argument, as a computation --------------------------------
   Suppose r is rational, x is irrational, and s = r + x were ALSO rational.
   Then s − r would be rational (the rational bin is closed under subtraction)
   — but s − r is exactly x. So x would be rational, which it is not.
   This returns the witness of that contradiction so the bench can show it
   rather than assert it. */
function escapeWitness(r, x) {
  if (!isRational(r) || !isIrrational(x)) return null;
  const s = addN(r, x);
  const back = subN(s, r);          // = x, always
  return {
    sum: s,
    recovered: back,
    recoveredIsX: eqN(back, x),
    sumWouldBeRational: isRational(s), // must be false — that is the theorem
  };
}

/* the classification of every combination the bench offers, computed rather
   than looked up */
function classify(z, w, op) {
  const res = op === 'times' ? mulN(z, w) : addN(z, w);
  return {
    result: res,
    resultRational: isRational(res),
    zRational: isRational(z),
    wRational: isRational(w),
  };
}

/* ---- parameters --------------------------------------------------------- */
const DIALS = [
  { key: 'ka', label: 'the rational part of x (in halves)', min: DIAL_MIN, max: DIAL_MAX, step: 1 },
  { key: 'kb', label: 'the √2 part of x (in halves)', min: DIAL_MIN, max: DIAL_MAX, step: 1 },
  { key: 'kc', label: 'the rational part of y (in halves)', min: DIAL_MIN, max: DIAL_MAX, step: 1 },
  { key: 'kd', label: 'the √2 part of y (in halves)', min: DIAL_MIN, max: DIAL_MAX, step: 1 },
];
const START = { ka: 3, kb: 0, kc: 0, kd: 2 }; // x = 3/2 (rational), y = √2 (irrational)

/* ---- calibration --------------------------------------------------------
   "The escape artist." A rational target t is posted, and x is fixed as an
   IRRATIONAL number. Set y so that x + y lands exactly on t. The only way is
   to cancel the √2 part — which is the point: nothing rational can do it, so y
   must itself be irrational. CALIBRATED is exact equality in ℚ(√2). */
function makeTarget(prev, rnd) {
  const rand = rnd || Math.random;
  const pick = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  let t = null, guard = 0;
  while (guard < 999) {
    guard += 1;
    const ka = pick(DIAL_MIN, DIAL_MAX), kb = pick(DIAL_MIN, DIAL_MAX);
    if (kb === 0) continue;                       // x must be irrational
    const kt = pick(DIAL_MIN, DIAL_MAX);          // the rational target, in halves
    // y = t − x must itself be reachable on the dials
    const kcNeeded = kt - ka, kdNeeded = -kb;
    if (kcNeeded < DIAL_MIN || kcNeeded > DIAL_MAX) continue;
    if (kdNeeded < DIAL_MIN || kdNeeded > DIAL_MAX) continue;
    if (prev && prev.ka === ka && prev.kb === kb && prev.kt === kt) continue;
    t = { ka, kb, kt, x: fromDial(ka, kb), target: fromDial(kt, 0), y: fromDial(kcNeeded, kdNeeded) };
    break;
  }
  return t || {
    ka: 1, kb: 2, kt: 3,
    x: fromDial(1, 2), target: fromDial(3, 0), y: fromDial(2, -2),
  };
}
/* exact equality in ℚ(√2) — a decimal can never fire this */
function isCalibrated(y, target) {
  if (!target) return false;
  return eqN(addN(target.x, y), target.target);
}
/* the meter closes on the goal as the √2 part cancels and the rational part lands */
function matchPercent(y, target) {
  if (!target) return 0;
  const s = addN(target.x, y);
  const db = Math.abs(valF(subF(s.b, target.target.b)));
  const da = Math.abs(valF(subF(s.a, target.target.a)));
  const gap = db * 2 + da;
  return Math.max(0, Math.min(100, 100 * (1 - gap / 12)));
}

/* ---- the lesson ---------------------------------------------------------- */
const STEPS = [
  {
    title: 'Two bins',
    focus: 'bins',
    unlock: 2,
    body:
      'Every number on this bench is written a + b·√2 with a and b fractions. That one form covers ' +
      'both bins: when b = 0 the number is RATIONAL (it is just a), and when b ≠ 0 it is IRRATIONAL. ' +
      'So “which bin?” is not a decimal you squint at — it is a question about b.',
    q: 'Which of these is rational?',
    choices: ['3/2 + 0·√2 — the √2 part is zero', '0 + 3/2·√2 — it has a fraction in it', 'Both, since both use fractions'],
    answer: 0,
    feedback:
      'A fraction in front of √2 does not tame it: 3/2·√2 is still irrational. Only b = 0 puts the ' +
      'number in the rational bin. IrrationalLab proved √2 itself cannot be written p/q; this bench ' +
      'takes that as given and asks what happens when you combine it with something.',
  },
  {
    title: 'Rational + rational stays put',
    focus: 'closed',
    unlock: 2,
    body:
      'Set both √2 dials to zero so x and y are both rational, and add. The √2 parts are 0 and 0, so ' +
      'the answer’s √2 part is 0 too — it cannot be anything else. The rational bin is CLOSED: there ' +
      'is nowhere outside it for the answer to land.',
    q: 'Why is the sum of two rationals always rational?',
    choices: [
      'p/q + r/s = (ps + rq)/(qs) — still one integer over another',
      'Because fractions are small numbers',
      'It is not always — some sums escape',
    ],
    answer: 0,
    feedback:
      'The arithmetic never leaves the form. That is exactly what CLOSURE means, and it is the same ' +
      'idea PolynomialArithmeticLab calls architectural: the operation cannot produce something the ' +
      'bin does not already hold.',
  },
  {
    title: 'Add an irrational and you cannot get back',
    focus: 'escape',
    unlock: 4,
    body:
      'Now make x rational and y irrational. The sum’s √2 part is 0 + (y’s b) — which is not zero. ' +
      'So the sum is irrational. Watch the argument beneath the bins: if the sum WERE rational, then ' +
      'sum − x would be rational too (the bin is closed under subtraction) — but sum − x is exactly ' +
      'y. That would make y rational, and it is not. Contradiction.',
    q: 'What does the contradiction actually rest on?',
    choices: [
      'The rational bin being closed under subtraction — so a rational sum would drag y back in',
      'The fact that √2 ≈ 1.414 does not terminate',
      'Nothing — it is an assumption we agree to make',
    ],
    answer: 0,
    feedback:
      'The decimal is irrelevant to the proof. The whole weight sits on closure: rationals are closed ' +
      'under subtraction, so if r + x were rational then x = (r + x) − r would be rational too. The ' +
      'only escape is that r + x is NOT rational.',
  },
  {
    title: 'Multiplying by a nonzero rational cannot rescue it either',
    focus: 'product',
    unlock: 4,
    body:
      'Switch to ×. A nonzero rational times an irrational is irrational, for the same reason: if the ' +
      'product were rational, dividing by that nonzero rational would drag the irrational back into ' +
      'the bin. The word NONZERO is doing real work — set the rational to 0 and see.',
    q: 'Why must the rational factor be nonzero?',
    choices: [
      '0 × √2 = 0, which is rational — the one case that escapes the rule',
      'Because you cannot multiply by zero',
      'It need not be; the rule holds for zero as well',
    ],
    answer: 0,
    feedback:
      'Zero collapses everything into the rational bin, and you cannot divide by it to argue your way ' +
      'back. That is why the standard says a NONZERO rational — a rare case where the fine print is ' +
      'the whole mathematics.',
  },
  {
    title: 'Two irrationals prove nothing',
    focus: 'both',
    unlock: 4,
    body:
      'Make BOTH numbers irrational and the rule stops applying. √2 + (−√2) = 0, which is rational; ' +
      '√2 + √2 = 2·√2, which is not. Either can happen, so there is no theorem here — and knowing ' +
      'where a theorem STOPS is as much a part of it as knowing where it holds.',
    q: 'Irrational + irrational is…',
    choices: [
      'Sometimes rational, sometimes not — the sum can cancel the √2 part or not',
      'Always irrational, by the same argument as before',
      'Always rational, because two escapes cancel',
    ],
    answer: 0,
    feedback:
      'The earlier argument needed one of the two numbers to be rational so it could be subtracted ' +
      'back out. With two irrationals there is nothing safe to subtract, and both outcomes really ' +
      'occur. The standard claims only the mixed case — now you can see why it is careful.',
  },
  {
    title: 'The escape artist',
    focus: 'calib',
    unlock: 4,
    body:
      'Last challenge. An irrational x is posted, and so is a RATIONAL target. Set y so that x + y ' +
      'lands exactly on the target. There is only one way, and finding it is the proof in your hands: ' +
      'nothing rational can do it. Press New target for another.',
    calib: true,
  },
];

/* ==== MODEL:END ========================================================== */

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ClosureLab() {
  const [vals, setVals] = useState(START);
  const [op, setOp] = useState('plus');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const focus = current.focus;

  const x = fromDial(vals.ka, vals.kb);
  const y = fromDial(vals.kc, vals.kd);
  const activeOp = focus === 'product' ? 'times' : op;
  const cls = classify(x, y, activeOp);
  const witness = escapeWitness(x, y);

  sceneRef.current = { x, y, op: activeOp, focus, target, cls };

  const calibrated = current.calib && target ? isCalibrated(y, target) : false;
  const pct = current.calib && target ? matchPercent(y, target) : 0;

  /* ---- the renderer: two bins, and where the answer lands ---------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current, canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const INK = '#1c2b3a', SOFT = '#5b6b7b', CARM = '#c81e4f', BLUE = '#3a6ea5', OK = '#1f8a5b';

    const binW = W * 0.40, binH = H * 0.30;
    const leftX = W * 0.055, rightX = W - W * 0.055 - binW;
    const binY = H * 0.10;

    const roundRect = (rx, ry, rw, rh, r) => {
      ctx.beginPath();
      ctx.moveTo(rx + r, ry);
      ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
      ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
      ctx.arcTo(rx, ry + rh, rx, ry, r);
      ctx.arcTo(rx, ry, rx + rw, ry, r);
      ctx.closePath();
    };

    // the two bins
    const bins = [
      { x: leftX, label: 'RATIONAL', sub: 'b = 0 · can be written p/q', color: BLUE },
      { x: rightX, label: 'IRRATIONAL', sub: 'b ≠ 0 · no p/q exists', color: CARM },
    ];
    for (const b of bins) {
      roundRect(b.x, binY, binW, binH, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = b.color; ctx.stroke();
      ctx.fillStyle = b.color; ctx.font = '700 13px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(b.label, b.x + binW / 2, binY + 10);
      ctx.fillStyle = SOFT; ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(b.sub, b.x + binW / 2, binY + 29);
    }

    // where each operand sits
    const chip = (z, tagText, cy, color) => {
      const inRational = isRational(z);
      const bx = inRational ? leftX : rightX;
      const cxp = bx + binW / 2;
      ctx.fillStyle = color;
      ctx.font = '700 15px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${tagText} = ${numString(z)}`, cxp, cy);
    };
    chip(S.x, 'x', binY + binH * 0.62, INK);
    chip(S.y, 'y', binY + binH * 0.84, INK);

    // the operation, and the answer's landing
    const res = S.cls.result;
    const opSign = S.op === 'times' ? '×' : '+';
    ctx.fillStyle = INK; ctx.font = '700 20px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`x ${opSign} y`, W / 2, H * 0.52);

    const resBinX = S.cls.resultRational ? leftX : rightX;
    const resColor = S.cls.resultRational ? BLUE : CARM;
    const landY = H * 0.72;
    roundRect(resBinX, landY - 26, binW, 52, 10);
    ctx.fillStyle = S.cls.resultRational ? 'rgba(58,110,165,0.12)' : 'rgba(200,30,79,0.10)';
    ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = resColor; ctx.stroke();
    ctx.fillStyle = resColor; ctx.font = '700 17px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(numString(res), resBinX + binW / 2, landY - 6);
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = SOFT;
    ctx.fillText(`≈ ${decimal(res).toFixed(4)}  (rounded — the fact is the form above)`,
      resBinX + binW / 2, landY + 14);

    // the arrow from the operation down into the landing bin
    ctx.strokeStyle = resColor; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, H * 0.58);
    ctx.lineTo(resBinX + binW / 2, landY - 34);
    ctx.stroke();

    // the escape argument, drawn where it is the lesson
    if (S.focus === 'escape' && isRational(S.x) && isIrrational(S.y)) {
      const wit = escapeWitness(S.x, S.y);
      ctx.fillStyle = OK; ctx.font = '600 12px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(`if the sum were rational: (x + y) − x = ${numString(wit.recovered)}  — that is y, and y is irrational`,
        W / 2, H * 0.90);
      ctx.fillStyle = CARM;
      ctx.fillText('so the sum cannot be rational', W / 2, H * 0.945);
    }

    // the calibration target
    if (S.focus === 'calib' && S.target) {
      ctx.fillStyle = OK; ctx.font = '600 13px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(`target: x + y = ${numString(S.target.target)}`, W / 2, H * 0.90);
    }
    void SOFT;
  }, []);

  useEffect(() => { draw(); }, [vals, step, target, op, focus, draw]);
  useEffect(() => {
    const st = stageRef.current;
    if (!st || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(st);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (current.calib && !target) {
      const t = makeTarget(null);
      setTarget(t);
      setVals({ ka: t.ka, kb: t.kb, kc: 0, kd: 0 });
      setOp('plus');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (focus === 'bins') { setVals({ ka: 3, kb: 0, kc: 0, kd: 3 }); setOp('plus'); }
    if (focus === 'closed') { setVals({ ka: 3, kb: 0, kc: 5, kd: 0 }); setOp('plus'); }
    if (focus === 'escape') { setVals({ ka: 3, kb: 0, kc: 0, kd: 2 }); setOp('plus'); }
    if (focus === 'product') { setVals({ ka: 3, kb: 0, kc: 0, kd: 2 }); setOp('times'); }
    if (focus === 'both') { setVals({ ka: 0, kb: 2, kc: 0, kd: -2 }); setOp('plus'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const setDial = (key, v) => setVals((p) => ({ ...p, [key]: parseInt(v, 10) }));
  const choose = (i) => { if (answers[step] == null) setAnswers((p) => ({ ...p, [step]: i })); };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const answered = answers[step] != null;
  const canNext = step < STEPS.length - 1 && (!current.q || answered);

  const spoken = `x is ${numString(x)}, ${isRational(x) ? 'rational' : 'irrational'}. `
    + `y is ${numString(y)}, ${isRational(y) ? 'rational' : 'irrational'}. `
    + `The ${activeOp === 'times' ? 'product' : 'sum'} is ${numString(cls.result)}, `
    + `${cls.resultRational ? 'rational' : 'irrational'}.`;

  return (
    <div className="cllab">
      <header className="head">
        <h1>Which Bin Does the Answer Land In?</h1>
        <p className="lede">
          Add something rational to something irrational and the answer is <em>always</em> irrational —
          and the reason has nothing to do with decimals. It is that the rational bin is{' '}
          <strong>closed</strong>: if the sum were rational, you could subtract your way back and drag
          the irrational in with it.
        </p>
      </header>

      <div className="bench">
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef}>
            <canvas ref={canvasRef} aria-label={`Two bins, rational and irrational. ${spoken}`} role="img" />
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>
          <div className="ops" role="group" aria-label="Operation">
            <button type="button" className={'obtn' + (activeOp === 'plus' ? ' on' : '')}
              onClick={() => setOp('plus')} disabled={focus === 'product'}>x + y</button>
            <button type="button" className={'obtn' + (activeOp === 'times' ? ' on' : '')}
              onClick={() => setOp('times')} disabled={focus === 'closed' || focus === 'escape'}>x × y</button>
          </div>
          <div className="readout" role="group" aria-label="Exact readouts">
            <div className="cell">
              <span className="k">x</span>
              <span className={'v ' + (isRational(x) ? 'rat' : 'irr')}>
                {numString(x)} · {isRational(x) ? 'rational' : 'irrational'}
              </span>
            </div>
            <div className="cell">
              <span className="k">y</span>
              <span className={'v ' + (isRational(y) ? 'rat' : 'irr')}>
                {numString(y)} · {isRational(y) ? 'rational' : 'irrational'}
              </span>
            </div>
            <div className="cell wide">
              <span className="k">x {activeOp === 'times' ? '×' : '+'} y — exact</span>
              <span className={'v ' + (cls.resultRational ? 'rat' : 'irr')}>
                {numString(cls.result)} · {cls.resultRational ? 'rational' : 'irrational'}
                <em className="soft"> · ≈ {decimal(cls.result).toFixed(6)} (rounded)</em>
              </span>
            </div>
            {witness && (
              <div className="cell wide">
                <span className="k">the escape argument</span>
                <span className="v">
                  (x + y) − x = {numString(witness.recovered)} = y{' '}
                  <em className="soft">
                    — so a rational sum would make y rational. It is not, so the sum is not.
                  </em>
                </span>
              </div>
            )}
          </div>
        </section>

        <aside className="panel tutor">
          <div className="progress" role="list" aria-label="Lesson progress">
            {STEPS.map((_, i) => (
              <span key={i} role="listitem"
                className={'pip' + (i === step ? ' cur' : '') + (i < step ? ' done' : '')}
                aria-current={i === step ? 'step' : undefined} />
            ))}
          </div>
          <p className="eyebrow small">Step {step + 1} of {STEPS.length}</p>
          <h2>{current.title}</h2>
          <p className="body">{current.body}</p>

          {DIALS.slice(0, current.unlock).map((d) => (
            <label className="dial" key={d.key}>
              <span className="drole">{d.label}</span>
              <input type="range" min={d.min} max={d.max} step={d.step}
                value={vals[d.key]} aria-label={d.label}
                onChange={(e) => setDial(d.key, e.target.value)} />
              <output className="dv">{fracString(frac(vals[d.key], 2))}</output>
            </label>
          ))}

          {current.q && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((ch, i) => {
                  const chosen = answers[step];
                  let c = 'choice';
                  if (chosen != null) {
                    if (i === current.answer) c += ' correct';
                    else if (i === chosen) c += ' wrong';
                    else c += ' dim';
                  }
                  return (
                    <button type="button" key={i} className={c} onClick={() => choose(i)} disabled={chosen != null}>
                      <span className="mark" aria-hidden="true">
                        {chosen != null && i === current.answer ? '✓' : chosen != null && i === chosen ? '✕' : ''}
                      </span>{ch}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {current.calib && target && (
            <div className="calib">
              <p className="calib-goal">
                x = <span className="mono">{numString(target.x)}</span> (irrational). Land{' '}
                x + y on <span className="mono goal">{numString(target.target)}</span>.
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">x + y = {numString(addN(target.x, y))}</span>
                {calibrated
                  ? <span className="stamp">CALIBRATED</span>
                  : <span className="mono hint">
                      {isZeroF(addN(target.x, y).b) ? 'the √2 is gone — now the rational part' : 'the √2 part is still there'}
                    </span>}
              </div>
              <button type="button" className="btn ghost"
                onClick={() => {
                  const t = makeTarget(target);
                  setTarget(t);
                  setVals({ ka: t.ka, kb: t.kb, kc: 0, kd: 0 });
                }}>
                New target
              </button>
            </div>
          )}

          <div className="nav">
            <button type="button" className="btn ghost" onClick={goBack} disabled={step === 0}>← Back</button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn" onClick={goNext} disabled={!canNext}>
                {current.q && !answered ? 'Answer to continue' : 'Next →'}
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => {
                setStep(0); setAnswers({}); setTarget(null); setVals(START); setOp('plus');
              }}>Restart lab</button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">a + b√2 · rational ⟺ b = 0 · (r + x) − r = x</span>
        &nbsp;·&nbsp; every number exact in ℚ(√2), drawn live on a dependency-free canvas.
      </footer>

      <style jsx>{`
        .cllab{
          --page:#eff1ee;--paper:#fbfbf8;--ink:#1c2b3a;--ink-soft:#5b6b7b;
          --curve:#c81e4f;--quad:#c7d8e4;--ok:#1f8a5b;--blue:#3a6ea5;
          --mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
          --serif:'Iowan Old Style',Palatino,Georgia,serif;
          background:var(--page);color:var(--ink);
          font:16px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;
          padding:28px 18px 44px;border-radius:16px;max-width:1120px;margin:0 auto;
        }
        .mono{font-family:var(--mono);}
        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
        .eyebrow{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--ink-soft);margin:0 0 6px;}
        .eyebrow.small{margin:0 0 4px;}
        h1{font-family:var(--serif);font-weight:600;font-size:clamp(26px,4vw,34px);margin:0 0 6px;}
        .lede{color:var(--ink-soft);margin:0 0 22px;max-width:64ch;}
        .bench{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:22px;align-items:start;}
        @media (max-width:920px){.bench{grid-template-columns:1fr;}}
        .panel{background:#fff;border:1px solid rgba(28,43,58,.15);border-radius:12px;box-shadow:0 1px 2px rgba(28,43,58,.05);}
        .stage-panel{padding:14px;}
        .stage{position:relative;width:100%;aspect-ratio:16/11;border:1px solid var(--quad);border-radius:8px;overflow:hidden;
          background:radial-gradient(120% 120% at 30% 18%,#fdfefe 0%,#eef3f7 60%,#e3ebf1 100%);}
        .stage canvas{display:block;width:100%;height:100%;}
        .ops{margin:12px 2px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .obtn{font:700 15px/1 var(--mono);padding:11px 6px;border-radius:8px;cursor:pointer;
          border:2px solid rgba(28,43,58,.25);background:var(--paper);color:var(--ink-soft);transition:all .15s;}
        .obtn.on{border-color:var(--ink);background:var(--ink);color:#fff;}
        .obtn:disabled{opacity:.35;cursor:not-allowed;}
        .readout{margin:10px 2px 2px;display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .cell{background:var(--paper);border:1px solid rgba(28,43,58,.14);border-radius:8px;padding:8px 10px;display:grid;gap:2px;}
        .cell.wide{grid-column:1/-1;}
        .cell .k{font-size:11px;letter-spacing:.06em;color:var(--ink-soft);font-family:var(--mono);}
        .cell .v{font-family:var(--mono);font-weight:700;font-size:14.5px;}
        .cell .v.rat{color:var(--blue);}
        .cell .v.irr{color:var(--curve);}
        .cell .soft{color:var(--ink-soft);font-weight:400;font-size:12px;font-style:normal;}
        .btn{font:600 14px/1 system-ui,sans-serif;padding:10px 16px;border-radius:8px;cursor:pointer;
          border:1px solid var(--ink);background:var(--ink);color:#fff;transition:filter .15s,opacity .15s;}
        .btn.ghost{background:transparent;color:var(--ink);}
        .btn:disabled{opacity:.4;cursor:not-allowed;}
        .btn:not(:disabled):hover{filter:brightness(1.08);}
        .tutor{padding:18px 20px 20px;}
        .progress{display:flex;gap:6px;margin-bottom:14px;}
        .pip{height:6px;flex:1;border-radius:3px;background:rgba(28,43,58,.14);}
        .pip.done{background:rgba(200,30,79,.45);}
        .pip.cur{background:var(--curve);}
        h2{font-family:var(--serif);font-weight:600;font-size:21px;margin:0 0 10px;padding-bottom:9px;border-bottom:3px double rgba(200,30,79,.45);}
        .body{margin:0 0 16px;font-size:14.5px;}
        .dial{display:grid;grid-template-columns:1fr 52px;grid-template-rows:auto auto;align-items:center;gap:2px 10px;margin-bottom:11px;}
        .drole{grid-column:1/3;font-size:12px;color:var(--ink-soft);}
        .dial input[type=range]{grid-column:1;width:100%;accent-color:var(--ink);cursor:pointer;}
        .dv{grid-column:2;font-family:var(--mono);text-align:right;font-size:16px;font-weight:700;}
        .quiz{margin-top:4px;}
        .q{font-size:14px;font-weight:600;margin:0 0 10px;}
        .choices{display:grid;gap:8px;}
        .choice{text-align:left;font:14px/1.4 system-ui,sans-serif;padding:11px 11px 11px 32px;
          border:1px solid rgba(28,43,58,.2);border-radius:8px;background:var(--paper);color:var(--ink);
          cursor:pointer;position:relative;transition:border-color .15s,background .15s;}
        .choice:not(:disabled):hover{border-color:var(--ink);}
        .choice .mark{position:absolute;left:11px;font-weight:700;}
        .choice.correct{border-color:var(--ok);background:rgba(31,138,91,.08);}
        .choice.correct .mark{color:var(--ok);}
        .choice.wrong{border-color:var(--ink-soft);background:rgba(91,107,123,.08);}
        .choice.wrong .mark{color:var(--ink-soft);}
        .choice.dim{opacity:.55;}
        .choice:disabled{cursor:default;}
        .feedback{margin:12px 0 0;font-size:13px;line-height:1.55;background:rgba(200,30,79,.05);
          border-left:3px solid var(--curve);padding:10px 12px;border-radius:0 6px 6px 0;}
        .calib{margin-top:6px;display:grid;gap:11px;}
        .calib-goal{margin:0;font-size:15px;background:rgba(58,110,165,.08);border-radius:8px;padding:11px 13px;}
        .calib-goal .mono{font-weight:700;}
        .calib-goal .goal{color:var(--curve);}
        .meter{height:12px;border-radius:6px;background:rgba(28,43,58,.1);overflow:hidden;}
        .meter-fill{height:100%;background:linear-gradient(90deg,rgba(200,30,79,.55),var(--curve));transition:width .12s ease-out;}
        .meter-row{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;}
        .hint{color:var(--ink-soft);font-size:12.5px;}
        .stamp{font:700 12px/1 var(--mono);letter-spacing:.16em;color:var(--ok);border:2px solid var(--ok);border-radius:6px;padding:5px 9px;transform:rotate(-3deg);}
        .nav{margin-top:20px;display:flex;justify-content:space-between;gap:10px;}
        .foot{margin-top:24px;font-size:12.5px;color:var(--ink-soft);}
        :global(.cllab) :focus-visible{outline:2px solid var(--ink);outline-offset:2px;border-radius:4px;}
        @media (prefers-reduced-motion:reduce){.btn,.choice,.obtn,.meter-fill{transition:none;}}
      `}</style>
    </div>
  );
}
