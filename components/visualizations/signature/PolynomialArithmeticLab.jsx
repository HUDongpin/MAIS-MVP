'use client';

/* ============================================================================
   PolynomialArithmeticLab — an interactive "bench" for POLYNOMIAL ARITHMETIC:
   the degree-slot ledger.  A term a·x^m is a DEPOSIT of a into slot m; adding
   polynomials adds slot by slot; multiplying sends every pair of deposits to
   the slot m + n; and closure is architectural — deposits can only ever land
   in whole-numbered slots, so the system can never produce anything but a
   polynomial.  (GRADES 9–12 · CCSS HSA-APR.A.1 — understand that polynomials
   form a system analogous to the integers, closed under addition,
   subtraction, and multiplication.)

   THE SIGNATURE CENTERPIECE — "THE DEGREE-SLOT LEDGER."  A gold row of
   numbered slots (x⁰, x¹, x², …) runs along the bottom of the paper.  Every
   product of terms is a deposit slip: (2)·(x) writes 2 into slot 1,
   (x)·(x) writes 1 into slot 2.  When two slips land in the same slot they
   MERGE — the carmine collision that FOIL mnemonics hide is drawn here as
   the whole point.  No rectangle, no area, no mnemonic: bookkeeping.

   THE MODEL — exact integer arithmetic throughout:
     · a polynomial is its coefficient array, low slot to high: [6, −1, 3]
       is 3x² − x + 6.  Nothing else is stored, ever.
     · addPoly is slotwise integer addition; mulPoly is the convolution —
       every (m, n) pair deposits A[m]·B[n] into slot m + n.
     · depositsOf(A, B) lists each slip (m, n, value, slot) so the drawing
       and the audit both see the individual deposits before merging.
     · degreeOf reads the highest occupied slot; the audit proves
       deg(A·B) = deg A + deg B and that top coefficients multiply.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No rectangle, no pull-apart, nothing has an area — the distributive
       bench owns a(b + c) as a picture of pieces.  The ledger cites the law
       and draws only slots and slips.
     · No FOIL, in any spelling — the mnemonic teaches four boxes and dies
       at trinomials; the ledger scales to any degree and says why.
     · No merging lesson — the like-terms bench proved which terms may merge;
       this ledger builds that law into its architecture (one slot per
       degree) and cites the bench.
     · No graphs, no zeros, no factoring — the polynomial-function bench
       owns the picture of y = p(x); the quadratic benches own un-multiplying.
     · Why slot addresses ADD is the exponent bench’s theorem (x^m · x^n =
       x^(m+n)); it is cited, not re-proved.
   COLORS: one accent. CARMINE = the collision slot and its merged total
   (the object). GOLD = the ledger row (the tool). BLUE = quiet factor
   terms and deposit slips. GREEN only on correct answers and CALIBRATED.

   THE CALIBRATION — a product of two posted factors, ledger blank.  Rule
   the x-slot total first (the slot where two slips collide), then rule the
   constant slot.  Truths are derived by convolution at answer time; the
   meter is quantized to {0, 50, 100}; the constant earns nothing until the
   x-slot stands.  The stamp provably cannot fire falsely.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ============================================================================
   MODEL — exact integer arithmetic; nothing a student sees is floated.
   ========================================================================== */
const CARMINE = '#c81e4f';
const BLUE = '#3f74a6';
const GOLD = '#b98718';
const INK_HEX = '#243342';
const SLATE = '#5b6b7b';
const CALIB_STEP = 5;
const MINUS = '−'; /* U+2212 */

/* a polynomial is its coefficient array, slot 0 first */
const addPoly = (A, B) => {
  const out = [];
  for (let k = 0; k < Math.max(A.length, B.length); k++) out.push((A[k] ?? 0) + (B[k] ?? 0));
  return out;
};
const mulPoly = (A, B) => {
  const out = new Array(A.length + B.length - 1).fill(0);
  for (let m = 0; m < A.length; m++) for (let n = 0; n < B.length; n++) out[m + n] += A[m] * B[n];
  return out;
};
/* every deposit slip, before merging */
const depositsOf = (A, B) => {
  const slips = [];
  for (let m = 0; m < A.length; m++)
    for (let n = 0; n < B.length; n++)
      if (A[m] !== 0 && B[n] !== 0) slips.push({ m, n, val: A[m] * B[n], slot: m + n });
  return slips;
};
const coefOf = (P, k) => P[k] ?? 0;
const degreeOf = (P) => {
  for (let k = P.length - 1; k >= 0; k--) if (P[k] !== 0) return k;
  throw new Error('the zero ledger has no degree');
};

const fmtInt = (n) => (n < 0 ? MINUS + String(-n) : String(n));
const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶'];
const termText = (c, k) => {
  const mag = Math.abs(c);
  const xPart = k === 0 ? '' : k === 1 ? 'x' : `x${SUP[k]}`;
  const cPart = k > 0 && mag === 1 ? '' : String(mag);
  return cPart + xPart;
};
const polyText = (P) => {
  const parts = [];
  for (let k = P.length - 1; k >= 0; k--) {
    const c = P[k] ?? 0;
    if (c === 0) continue;
    if (parts.length === 0) parts.push((c < 0 ? MINUS : '') + termText(c, k));
    else parts.push((c < 0 ? `${MINUS} ` : '+ ') + termText(c, k));
  }
  return parts.length ? parts.join(' ') : '0';
};

/* the lesson's posted scenes */
const SCENES = {
  ledger: { mode: 'single', label: 'one ledger row: 2x² + 3x + 1', A: [1, 3, 2] },
  sum: { mode: 'sum', label: 'two rows, added slot by slot', A: [1, 3, 2], B: [5, -4, 1] },
  product: { mode: 'product', label: '(x + 2)(x + 3) as deposit slips', A: [2, 1], B: [3, 1] },
  shuffle: { mode: 'product', label: '(ax² + 1)(x² + 3x): the top slots', A: [1, 0, 2], B: [0, 3, 1], dial: true },
  closure: { mode: 'product', label: 'why the system can never leave itself', A: [2, 1], B: [3, 1] },
};

/* ---------------------------------------------------------------------------
   CALIBRATION — posted factor pairs; truths derived by convolution.
   ------------------------------------------------------------------------- */
const CASES = [
  { A: [2, 1], B: [3, 1] },
  { A: [4, 1], B: [1, 1] },
  { A: [1, 2], B: [3, 1] },
  { A: [2, 1], B: [-3, 1] },
  { A: [3, 2], B: [1, 3] },
  { A: [-1, 1], B: [-5, 1] },
  { A: [2, 3], B: [2, 1] },
];
const X_CHIPS = [MINUS + '6', MINUS + '1', '5', '7', '8', '11'];
const C_CHIPS = [MINUS + '6', '3', '4', '5', '6'];

const factorText = (P) => `(${polyText(P)})`;
const labelOf = (i) => factorText(CASES[i].A) + factorText(CASES[i].B);
const xTruth = (i) => fmtInt(coefOf(mulPoly(CASES[i].A, CASES[i].B), 1));
const cTruth = (i) => fmtInt(coefOf(mulPoly(CASES[i].A, CASES[i].B), 0));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, xPick, cPick) => {
  if (i == null) return [false, false];
  const c1 = xPick === xTruth(i);
  const c2 = c1 && cPick === cTruth(i);
  return [c1, c2];
};
const closeness = (i, xPick, cPick) => {
  const [c1, c2] = calibChecks(i, xPick, cPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, xPick, cPick) => calibChecks(i, xPick, cPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A polynomial is its ledger row',
    body:
      'Forget the symbols for a moment: 2x² + 3x + 1 is three deposits — 1 in ' +
      'slot 0, 3 in slot 1, 2 in slot 2. The gold row below holds everything ' +
      'there is to know about it.',
    scene: 'ledger',
    q: 'What does slot k of the ledger hold?',
    choices: [
      'The coefficient of x^k — the whole polynomial is just its slot totals',
      'The value of the polynomial at x = k',
      'The k-th digit of the answer',
    ],
    answer: 0,
    feedback:
      'Slot k holds the coefficient of x^k, nothing more. Two polynomials are ' +
      'equal exactly when every slot matches — the ledger is a complete, honest ' +
      'record, and every operation on this bench will turn out to be a rule ' +
      'about slots: where values sit, where slips land, what merges.',
    note:
      'The empty slots matter too: 2x² + 3x + 1 has a 0 sitting silently in no ' +
      'slot here, but x³ + 1 keeps zeros in slots 1 and 2. Absence is a ' +
      'recorded value, not a blank.',
  },
  {
    title: 'Addition never crosses a wall',
    body:
      'Add (2x² + 3x + 1) + (x² − 4x + 5). Each slot settles its own affairs: ' +
      '1 + 5, 3 − 4, 2 + 1.',
    scene: 'sum',
    q: 'Why can slot 1 and slot 2 never mix during addition?',
    choices: [
      'Different powers of x are different kinds — only same-degree terms may merge, as the like-terms bench proved',
      'They could mix, but convention forbids it',
      'Because subtraction is involved',
    ],
    answer: 0,
    feedback:
      'The like-terms bench proved which terms may merge: only those of the same ' +
      'degree. The ledger builds that law into architecture — one slot per ' +
      'degree, walls between slots — so 3x²  − x + 6 assembles itself, slot by ' +
      'slot, with no judgment calls left to make.',
    note:
      'Read the middle slot: 3 − 4 = −1, so the x term survives as −x. A slot ' +
      'total of zero would mean the term vanishes from the written form but ' +
      'keeps its seat in the ledger — subtraction works the same way, slot by ' +
      'slot, each wall intact.',
  },
  {
    title: 'Multiplication mails deposit slips',
    body:
      '(x + 2)(x + 3): every term of the first factor multiplies every term of ' +
      'the second, and each product is a slip mailed to slot m + n.',
    scene: 'product',
    q: 'The slips 1·3 (from x·3) and 2·1 (from 2·x) — where do they land?',
    choices: [
      'Both in slot 1 — they collide and merge: 3 + 2 = 5, the coefficient of x',
      'In slots 1 and 2 — one each',
      'In slot 3 — products go to the top',
    ],
    answer: 0,
    feedback:
      'Both slips carry degree 1, so both land in slot 1 and merge to 5: the ' +
      'product is x² + 5x + 6. The collision is the entire story of the middle ' +
      'coefficient — and the exponent bench’s law x^m · x^n = x^(m+n) is the ' +
      'postal code system deciding where every slip goes. Four slips were ' +
      'mailed; two addresses were shared; three totals remain.',
    note:
      'Mnemonics like FOUR-LETTER letter-lists memorize the four slips of a ' +
      'two-by-two product and collapse at anything bigger. The ledger does not ' +
      'care how many terms arrive: slips are mailed, slots merge, done.',
  },
  {
    title: 'The top slots',
    body:
      'Turn the dial: (ax² + 1)(x² + 3x). Watch the highest slot of the product ' +
      'as a changes.',
    scene: 'shuffle',
    q: 'The product’s top slot is slot 4, holding a·1. What law is that?',
    choices: [
      'Degrees ADD and top coefficients MULTIPLY — the top slip has no one to collide with',
      'Degrees multiply: 2 × 2 = 4 is a coincidence here',
      'The top slot is always 1',
    ],
    answer: 0,
    feedback:
      'The highest slip comes from the two highest terms — slot 2 + slot 2 = ' +
      'slot 4 — and nothing else reaches that high, so it lands alone: ' +
      'deg(A·B) = deg A + deg B, and the top coefficients simply multiply. ' +
      'That lonely slip is why a degree can never be lost in a product.',
    note:
      'Check the dial’s claim at a = 3: the ledger reads 3 in slot 4, 6 in slot ' +
      '3, 1 in slot 2, 3 in slot 1 — every total an integer, every slip ' +
      'accounted for.',
  },
  {
    title: 'Closure is architectural',
    body:
      'Why is a product of polynomials always a polynomial? Look at where slips ' +
      'are ALLOWED to land.',
    scene: 'closure',
    q: 'What makes the system closed?',
    choices: [
      'Slips can only land in whole-numbered slots, and finitely many slips exist — the result must be a ledger row',
      'Teachers only assign problems that work out',
      'It is closed for degree 2 and below, open above',
    ],
    answer: 0,
    feedback:
      'A slip’s address is m + n: whole number plus whole number. There is no ' +
      'slot 2.5 to land in and no way to mail infinitely many slips from finite ' +
      'factors. Polynomials are closed under +, −, and × for the same ' +
      'structural reason the integers are — the operations cannot reach outside ' +
      'the system.',
    note:
      'Division is the honest exception: 1 ÷ x has no slot to live in, exactly ' +
      'as 1 ÷ 2 has no home among the integers. What division produces instead — ' +
      'a quotient row plus a remainder row — is the next bench’s story, and the ' +
      'analogy to the integers holds there too.',
  },
  {
    title: 'The bookkeeper’s stamp',
    body:
      'Two factors are posted; the ledger below is blank. Rule the x-slot total ' +
      'first — the slot where two slips collide — then rule the constant slot. ' +
      'Both exact, or no stamp.',
    scene: 'product',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PolynomialArithmeticLab() {
  const [aDial, setADial] = useState(2);
  const [xPick, setXPick] = useState(null);
  const [cPick, setCPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const scDef = SCENES[current.scene];
  const A = calib && kase != null ? CASES[kase].A : scDef.dial ? [1, 0, aDial] : scDef.A;
  const B = calib && kase != null ? CASES[kase].B : scDef.B ?? null;
  const mode = calib ? 'product' : scDef.mode;
  const product = mode === 'product' && B ? mulPoly(A, B) : null;
  const slips = mode === 'product' && B ? depositsOf(A, B) : [];

  const checks = calib ? calibChecks(kase, xPick, cPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, xPick, cPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, xPick, cPick) : false;

  const bandLabel = calib
    ? `posted: ${kase != null ? labelOf(kase) : ''}`
    : scDef.dial
      ? `(${polyText(A)})(${polyText(B)}): the top slots`
      : scDef.label;
  sceneRef.current = { mode, A, B, product, slips, calib, bandLabel };

  /* ---- full redraw from state ------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth;
    const H2 = stage.clientHeight;
    if (W === 0 || H2 === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H2 * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const S = sceneRef.current;
    ctx.clearRect(0, 0, W, H2);

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    const gs = 26;
    ctx.beginPath();
    for (let gx = gs; gx < W; gx += gs) {
      ctx.moveTo(Math.round(gx) + 0.5, 0);
      ctx.lineTo(Math.round(gx) + 0.5, H2);
    }
    for (let gy = gs; gy < H2; gy += gs) {
      ctx.moveTo(0, Math.round(gy) + 0.5);
      ctx.lineTo(W, Math.round(gy) + 0.5);
    }
    ctx.stroke();

    const bandH = 52;

    /* factor / row cards */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    if (S.mode === 'single') {
      ctx.fillText('the row in hand', 22, bandH + 8);
      ctx.fillStyle = BLUE;
      ctx.font = '600 12.5px ui-monospace, monospace';
      ctx.fillText(polyText(S.A), 22, bandH + 26);
    } else if (S.mode === 'sum') {
      ctx.fillText('two rows, one sum', 22, bandH + 8);
      ctx.fillStyle = BLUE;
      ctx.font = '600 12.5px ui-monospace, monospace';
      ctx.fillText(polyText(S.A), 22, bandH + 26);
      ctx.fillText(polyText(S.B), 22, bandH + 44);
      ctx.fillStyle = CARMINE;
      ctx.fillText(`sum: ${polyText(addPoly(S.A, S.B))}`, 22, bandH + 66);
    } else {
      ctx.fillText('the factors', 22, bandH + 8);
      ctx.fillStyle = BLUE;
      ctx.font = '600 12.5px ui-monospace, monospace';
      ctx.fillText(`${factorText(S.A)}${factorText(S.B)}`, 22, bandH + 26);
      /* the deposit slips, grouped by slot */
      const bySlot = new Map();
      for (const sl of S.slips) {
        if (!bySlot.has(sl.slot)) bySlot.set(sl.slot, []);
        bySlot.get(sl.slot).push(sl);
      }
      let y = bandH + 54;
      ctx.font = '600 11.5px ui-monospace, monospace';
      for (const slot of [...bySlot.keys()].sort((a, b) => b - a)) {
        const group = bySlot.get(slot);
        const collide = group.length > 1;
        ctx.fillStyle = collide ? CARMINE : SLATE;
        const slipTxt = group.map((g2) => `${fmtInt(g2.val)}`).join(' + ');
        ctx.fillText(
          S.calib
            ? `slot ${slot} ← ${group.length} slip${group.length > 1 ? 's' : ''}`
            : `slot ${slot} ← ${slipTxt}${collide ? ` = ${fmtInt(group.reduce((t, g2) => t + g2.val, 0))}  ← the collision` : ''}`,
          40,
          y
        );
        y += 19;
      }
    }

    /* THE LEDGER — the gold slot row along the bottom */
    const P = S.mode === 'single' ? S.A : S.mode === 'sum' ? addPoly(S.A, S.B) : S.product;
    const nSlots = Math.max(P.length, 3);
    const slotW = Math.min(92, (W - 60) / nSlots);
    const x0 = (W - nSlots * slotW) / 2;
    const yLedger = H2 - 86;
    for (let k = 0; k < nSlots; k++) {
      const x = x0 + (nSlots - 1 - k) * slotW; /* high slots on the left */
      const c = P[k] ?? 0;
      const hot = S.mode === 'product' && !S.calib && S.slips.filter((sl) => sl.slot === k).length > 1;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 4, yLedger, slotW - 8, 52);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = hot ? CARMINE : INK_HEX;
      ctx.font = (hot ? '700' : '600') + ' 15px ui-monospace, monospace';
      ctx.fillText(S.calib && k <= 1 ? '?' : fmtInt(c), x + slotW / 2, yLedger + 22);
      ctx.fillStyle = SLATE;
      ctx.font = '600 10.5px ui-monospace, monospace';
      ctx.fillText(k === 0 ? 'x⁰' : k === 1 ? 'x¹' : `x${SUP[k]}`, x + slotW / 2, yLedger + 42);
      ctx.textBaseline = 'top';
      ctx.fillText(`slot ${k}`, x + slotW / 2, yLedger + 58);
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(S.bandLabel, W / 2, bandH / 2);
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
    setADial(2);
    setXPick(null);
    setCPick(null);
    if (STEPS[step].calib) setKase(makeCase(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setADial(2);
    setXPick(null);
    setCPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. X slot ${xPick ?? 'unruled'}; constant ${cPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : mode === 'product'
      ? `${bandLabel}: the product is ${polyText(product)}.`
      : mode === 'sum'
        ? `${bandLabel}: the sum is ${polyText(addPoly(A, B))}.`
        : `${bandLabel}.`;

  return (
    <div className="palab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Polynomial Arithmetic: The Degree-Slot Ledger</h1>
        <p className="lede">
          A term a·x^m is a deposit of a into slot m. Adding settles slot by slot;
          multiplying mails every pairwise slip to slot m + n — and when two slips
          collide in one slot, they merge. Closure is architectural: <em>there is
          nowhere outside the ledger for a slip to land</em>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          {scDef.dial && !calib && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the top coefficient a</span>
                  <span className="dial-v mono">{aDial}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={aDial}
                  onChange={(e) => setADial(Number(e.target.value))}
                  aria-label={`Top coefficient, ${aDial}`}
                />
              </div>
            </div>
          )}

          <div className="toolbar" role="group" aria-label="Scene">
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

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((cq, i) => {
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
                      {cq}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
              {answered && current.note && <p className="note">{current.note}</p>}
            </div>
          )}

          {calib && kase != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted product</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the x-slot, merged</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the constant, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="X-slot ruling">
                  {X_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (xPick === c2 ? ' active' : '')}
                      onClick={() => setXPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Constant ruling">
                  {C_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (cPick === c2 ? ' active' : '')}
                      onClick={() => setCPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the books balance'
                    : checks[0]
                      ? 'x-slot merged — now the constant slip'
                      : 'two slips collide in slot 1: add them'}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">{checks.filter(Boolean).length}/2</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">the x-slot · then the constant</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setXPick(null);
                  setCPick(null);
                }}
              >
                Next case
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
                  setKase(null);
                  setXPick(null);
                  setCPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">slips land in slot m + n · collisions merge · degrees add</span>{' '}
        &nbsp;·&nbsp; the ledger has no slot 2.5 and no room for infinitely many
        slips — which is the entire proof that the system is closed.
      </footer>

      <style jsx>{`
        .palab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --carmine: #c81e4f;
          --blue: #3f74a6;
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
          min-height: 400px;
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
            min-height: 380px;
          }
        }
        .dials {
          margin: 12px 4px 0;
          display: grid;
          gap: 8px;
        }
        .dial {
          padding: 8px 10px;
          border: 1px solid rgba(28, 43, 58, 0.14);
          border-radius: 8px;
          background: var(--paper);
        }
        .dial-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }
        .dial-k {
          font-size: 12.5px;
          font-weight: 600;
        }
        .dial-v {
          font-size: 13px;
          color: var(--gold);
          font-weight: 700;
        }
        .dial input[type='range'] {
          width: 100%;
          accent-color: var(--gold);
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .chipbtn {
          font: 600 12px/1.2 system-ui, sans-serif;
          padding: 8px 11px;
          border-radius: 8px;
          cursor: pointer;
          border: 1.5px solid rgba(63, 116, 166, 0.55);
          background: var(--paper);
          color: var(--blue);
          transition: border-color 0.15s, background 0.15s;
        }
        .chipbtn.active {
          border-color: var(--blue);
          background: rgba(63, 116, 166, 0.1);
        }
        .chipbtn:hover {
          border-color: var(--ink);
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
          margin-top: 4px;
          padding-top: 6px;
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
        .target-word {
          font-family: var(--serif);
          font-size: 21px;
          font-weight: 600;
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
        .declare {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .declbtn {
          font-size: 12.5px;
          font-weight: 700;
          padding: 7px 11px;
          border-radius: 6px;
          cursor: pointer;
          border: 1.5px solid rgba(28, 43, 58, 0.28);
          background: var(--paper);
          color: var(--ink);
        }
        .declbtn.reason {
          font-size: 11.5px;
          font-weight: 600;
        }
        .declbtn.active {
          border-color: var(--carmine);
          background: rgba(200, 30, 79, 0.1);
          color: var(--carmine);
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
        :global(.palab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (max-width: 460px) {
          .toolbar {
            gap: 6px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .chipbtn {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
