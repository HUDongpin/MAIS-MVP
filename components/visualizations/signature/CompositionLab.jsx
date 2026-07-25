'use client';

/* ============================================================================
   CompositionLab — an interactive "bench" for COMPOSING FUNCTIONS: wiring the
   output of one machine into the input of another, and discovering that

                        f(g(x))  is  NOT  g(f(x)).

   ORDER MATTERS. That is the whole lab. Composition is the first operation a
   student meets that is NOT commutative, and this bench makes the asymmetry a
   thing you watch: two machines on a bench, a number that flows through them
   left to right, and a SWAP that reorders them — after which the same input
   comes out a different number.

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADES 8–12 lab —
   CCSS F-BF.A.1b and F-BF.A.1c ("combine standard function types …
   compose functions"),
   with 8.F.A.1 and F-IF as the on-ramp.

   ---------------------------------------------------------------------------
   HOW THIS LAB STAYS DISTINCT FROM ITS SIBLINGS  (the library's hard rule)
   ---------------------------------------------------------------------------
   Four labs live near this one, and the naive "two machines in a row" picture
   is ALREADY one of theirs. The seam is drawn on purpose:

     • FunctionLab   — owns WHAT ONE FUNCTION IS: each input fires exactly one
                       output. It defines the machine; it does not chain them.
     • UndoLab       — owns the INVERSE: ONE pipeline (×2, then +3) run BACKWARD,
                       socks-and-shoes. Its picture is a conveyor there-and-back.
                       Composition is NOT running one machine backward; it is
                       running TWO DIFFERENT machines forward, in an order that
                       matters. This lab never reverses a machine.
     • CommutativeLab— owns the swap that PRESERVES: a+b = b+a, a×b = b×a. This
                       lab owns the swap that CHANGES. They are exact opposites
                       and belong to different operations, so they do not drift.
     • LogarithmLab  — owns the y = x mirror. Absent here on purpose.

   So this lab owns exactly one thing no sibling owns: the NON-COMMUTATIVITY of
   chaining, seen as a swap that alters the output. audit-composition.mjs greps
   this source to keep the siblings' pictures out (no "inverse", no "undo", no
   "mirror", no "backward").

   ---------------------------------------------------------------------------
   THE MATHEMATICS, EXACTLY
   ---------------------------------------------------------------------------
   Two one-operation machines, kept deliberately simple so the asymmetry is
   about ORDER and nothing else:

        TIMES:  t(x) = c · x          (multiply by c)
        PLUS:   p(x) = x + b          (add b)

   Feed x through PLUS then TIMES:   t(p(x)) = c·(x + b) = c·x + c·b
   Feed x through TIMES then PLUS:   p(t(x)) = (c·x) + b = c·x + b

   Both composites are lines with the SAME slope c, but different intercepts:
   c·b versus b. They are EQUAL for every x only when

        c·b = b   ⟺   b·(c − 1) = 0   ⟺   b = 0  or  c = 1.

   That is the exact condition the lab lets the student discover: the order
   stops mattering precisely when one machine does nothing (adding 0, or
   multiplying by 1). Everywhere else, "multiply then add" and "add then
   multiply" are different functions — which is the reason arithmetic needs an
   order of operations at all.

   EXACT INTEGER MATH. x, b, c are integers, so every number on the bench —
   each machine's output and each composite's rule — is an exact integer.
   A child never sees a float artefact. The CALIBRATED stamp is an integer
   identity (out === target), so it cannot fire falsely.

   ---------------------------------------------------------------------------
   Delivered the MAIS way: ZERO dependencies — pure <canvas> + React hooks,
   scoped styled-jsx. The two machines, the wire between them and the flowing
   token are drawn by hand.

   The block between MODEL:START and MODEL:END is pure, React-free JavaScript;
   audit-composition.mjs slices it out of this file and evaluates it, so the
   audit tests the code that ships and cannot drift from it.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==== MODEL:START — pure math. No React, no pixels, no DOM. =============== */

/* The two machines. Each is one operation, by design: the lab is about the
   ORDER of two machines, so each machine must be as plain as possible. */
const times = (c, x) => c * x; // ×c
const plus = (b, x) => x + b;  // +b

/* An ORDER is which machine the number meets FIRST. The names are literal:
   'add-first' feeds x through PLUS then TIMES; 'times-first' the other way. */
const ORDERS = ['add-first', 'times-first'];

/* Run the two machines in the given order on input x, returning the number
   AT EACH STAGE (so the render can show the token's value as it flows). */
function runChain(order, b, c, x) {
  if (order === 'add-first') {
    const mid = plus(b, x); // +b first
    return { first: 'plus', second: 'times', mid, out: times(c, mid) };
  }
  const mid = times(c, x);  // ×c first
  return { first: 'times', second: 'plus', mid, out: plus(b, mid) };
}

/* The composite RULE as (slope, intercept): out = slope·x + intercept.
     add-first  : c·(x+b) = c·x + c·b
     times-first: (c·x)+b = c·x + b
   Same slope c; the intercept is the whole story. */
function ruleOf(order, b, c) {
  return order === 'add-first'
    ? { slope: c, intercept: c * b }
    : { slope: c, intercept: b };
}

/* Do the two orders give the SAME function? Exactly when b·(c−1) = 0. This is
   an exact integer test — the lab's central claim, checked without any x. */
function ordersAgree(b, c) {
  return b * (c - 1) === 0; // ⟺ b === 0 || c === 1
}

/* The gap between the two orders at a given input: a signed integer that is 0
   exactly when the orders agree. gap = (c·x + c·b) − (c·x + b) = b·(c−1). */
function orderGap(b, c) {
  return b * (c - 1); // independent of x — the lines are parallel
}

/* ---- parameters ---------------------------------------------------------- */
const PARAMS = [
  { key: 'c', label: 'c', min: 2, max: 6, step: 1, unlock: 1, role: 'the ×c machine' },
  { key: 'b', label: 'b', min: 1, max: 9, step: 1, unlock: 2, role: 'the +b machine' },
  { key: 'x', label: 'x', min: 0, max: 9, step: 1, unlock: 3, role: 'the number you send in' },
];
/* START: ×3 and +2, sending in 5. add-first → 3·(5+2)=21; times-first → 3·5+2=17.
   A clean, memorable 21 ≠ 17 the moment the lab opens. */
const START = { c: 3, b: 2, x: 5, order: 'times-first' };

/* ---- calibration --------------------------------------------------------
   "Hit the target." Given an input x and a target output T, reach T EXACTLY by
   setting the two machines AND choosing the order. Many targets are reachable
   in one order but not the other at the same (b,c) — which is the point: the
   order is part of the answer, not an afterthought. Targets are generated from
   a real (order,b,c,x) so they are always reachable, and CALIBRATED is the
   integer identity out === target. --------------------------------------- */
function makeTarget(prev, rnd) {
  const rand = rnd || Math.random;
  const pick = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  let t;
  do {
    const order = ORDERS[pick(0, 1)];
    const c = pick(2, 6), b = pick(1, 9), x = pick(0, 9);
    t = { x, target: runChain(order, b, c, x).out };
  } while (prev && t.target === prev.target && t.x === prev.x);
  return t;
}
const isCalibrated = (order, b, c, x, target) => runChain(order, b, c, x).out === target;
function matchPercent(order, b, c, x, target) {
  const out = runChain(order, b, c, x).out;
  const span = Math.max(10, Math.abs(target) + 10);
  return Math.max(0, Math.min(100, 100 * (1 - Math.abs(out - target) / span)));
}

/* ---- the lesson ---------------------------------------------------------- */
const STEPS = [
  {
    title: 'Two machines',
    focus: 'meet',
    body:
      'Two machines sit on the bench. One MULTIPLIES by c; the other ADDS b. A machine takes a ' +
      'number in and hands a new number out — nothing more. Soon you will wire them together, so ' +
      'the number leaving one walks straight into the next.',
    q: 'A machine takes ONE number in and hands ONE number out. If ×3 is fed 5, what comes out?',
    choices: ['15', '8', '53'],
    answer: 0,
    feedback:
      '×3 turns 5 into 15 — one input, one output, every time. The +b machine works the same way: ' +
      'feed it a number, it hands back that number plus b. The interesting part starts when the ' +
      'output of one becomes the input of the other.',
  },
  {
    title: 'Send a number through',
    focus: 'chain',
    body:
      'Now they are wired in series: ×c first, then +b. Watch the number flow left to right — it is ' +
      'multiplied, and the result is what gets b added to it. With c = 3, b = 2, x = 5: ×3 makes 15, ' +
      'then +2 makes 17.',
    q: 'Send x = 5 through ×3 and THEN +2. What lands at the end?',
    choices: ['17', '21', '10'],
    answer: 0,
    feedback:
      '3·5 = 15, then 15 + 2 = 17. The middle number, 15, is the whole point of a chain: it is the ' +
      'output of the first machine AND the input of the second. Hold on to it — the next step feeds ' +
      'the SAME 5 through the SAME two machines, but in the other order.',
  },
  {
    title: 'Swap the order',
    focus: 'swap',
    body:
      'Press Swap. Now +b comes first: the 5 gets 2 added (making 7), and THAT is what gets ' +
      'multiplied by 3 — landing on 21. Same input, same two machines, different answer. Order ' +
      'matters. Composition is the first operation you have met that is not "either way is fine".',
    q: 'Send x = 5 through +2 first, THEN ×3. What lands now?',
    choices: ['21', '17', '15'],
    answer: 0,
    feedback:
      '5 + 2 = 7, then 3·7 = 21 — not 17. Multiplying-then-adding and adding-then-multiplying are ' +
      'different functions. This is exactly why arithmetic needs an order of operations: without an ' +
      'agreed order, 3·5 + 2 would have two answers.',
  },
  {
    title: 'The two rules',
    focus: 'rule',
    body:
      'Each order is itself a single new machine with its own rule. Times-first is c·x + b. ' +
      'Add-first is c·(x + b) = c·x + c·b. Same slope c — but the add-first machine adds c·b at ' +
      'the end instead of b. The two composite lines run parallel, a fixed distance apart.',
    q: 'Times-first gives c·x + b. What is the add-first rule, multiplied out?',
    choices: ['c·x + c·b', 'c·x + b', 'c·x + b + c'],
    answer: 0,
    feedback:
      'c·(x + b) = c·x + c·b. The b got multiplied by c because it went IN before the ×c machine, ' +
      'so it was scaled too. In times-first, the b is added last and escapes the multiplication. ' +
      'The gap between the two outputs is c·b − b = b·(c − 1), the same for every x.',
  },
  {
    title: 'When order stops mattering',
    focus: 'agree',
    body:
      'The two orders can only agree when the gap b·(c − 1) is zero — that is, when b = 0 (the ' +
      'add machine does nothing) or c = 1 (the times machine does nothing). Turn one machine into a ' +
      '"do nothing" and the swap stops changing the answer. Anywhere else, order matters.',
    q: 'For which setting do BOTH orders give the same output for every x?',
    choices: ['b = 0 (add nothing)', 'b = 5, c = 3', 'x = 0'],
    answer: 0,
    feedback:
      'b = 0 makes the add machine do nothing, so the order cannot matter — c·(x+0) = c·x + 0. ' +
      '(c = 1 does it the other way.) Careful with x = 0: it makes both outputs equal for THAT ' +
      'input only (c·b vs b need not match), not for every x. Order-independence is about the ' +
      'machines, not the number you happen to send in.',
  },
  {
    title: 'Hit the target',
    focus: 'calib',
    body:
      'Final challenge. You are handed an input and a target output. Reach it exactly by setting ' +
      'the two machines and choosing the order — the order is part of the puzzle. Press New target ' +
      'for a fresh one.',
    calib: true,
  },
];

/* ==== MODEL:END ========================================================== */

/* ---- formatting helpers -------------------------------------------------- */
const MINUS = '−';
const sign = (n) => (n < 0 ? MINUS + Math.abs(n) : '+ ' + n);
function ruleText(order, b, c) {
  const r = ruleOf(order, b, c);
  return `${c}x ${sign(r.intercept)}`;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function CompositionLab() {
  const [c, setC] = useState(START.c);
  const [b, setB] = useState(START.b);
  const [x, setX] = useState(START.x);
  const [order, setOrder] = useState(START.order);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);
  const [flow, setFlow] = useState(0); // 0..1 token position, opt-in animation

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const rafRef = useRef(null);

  const current = STEPS[step];
  const focus = current.focus;

  const chain = runChain(order, b, c, x);
  const rule = ruleOf(order, b, c);
  sceneRef.current = { c, b, x, order, focus, chain, flow, target };

  const cur = target ? runChain(order, b, c, x).out : 0;
  const pct = target ? matchPercent(order, b, c, x, target.target) : 0;
  const calibrated = target ? isCalibrated(order, b, c, x, target.target) : false;

  /* ---- the renderer: two machine boxes, a wire, a flowing token ---------- */
  const draw = useCallback(() => {
    const stage = stageRef.current, canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const CARM = '#c81e4f', INK = '#1c2b3a', SOFT = '#5b6b7b', BLUE = '#3a6ea5';
    const GOLD = '#b98718', OK = '#1f8a5b';

    // machine boxes: two rounded rects, left and right, wired by a rail
    const boxW = Math.min(150, W * 0.26), boxH = 84;
    const cy = H * 0.42;
    const leftX = W * 0.5 - boxW - 70;
    const rightX = W * 0.5 + 70;
    const label1 = S.chain.first === 'times' ? `× ${S.c}` : `+ ${S.b}`;
    const label2 = S.chain.second === 'times' ? `× ${S.c}` : `+ ${S.b}`;

    const railY = cy + boxH / 2 + 0;
    // the input rail, the wire between machines, the output rail
    const inX = W * 0.06, outX = W * 0.94;
    ctx.strokeStyle = SOFT; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(inX, cy); ctx.lineTo(leftX, cy);                 // in → box1
    ctx.moveTo(leftX + boxW, cy); ctx.lineTo(rightX, cy);       // box1 → box2 (the WIRE)
    ctx.moveTo(rightX + boxW, cy); ctx.lineTo(outX, cy);        // box2 → out
    ctx.stroke();

    const roundRect = (rx, ry, rw, rh, r) => {
      ctx.beginPath();
      ctx.moveTo(rx + r, ry);
      ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
      ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
      ctx.arcTo(rx, ry + rh, rx, ry, r);
      ctx.arcTo(rx, ry, rx + rw, ry, r);
      ctx.closePath();
    };
    const machine = (mx, label, isTimes) => {
      roundRect(mx, cy - boxH / 2, boxW, boxH, 12);
      ctx.fillStyle = isTimes ? 'rgba(58,110,165,0.12)' : 'rgba(185,135,24,0.12)';
      ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = isTimes ? BLUE : GOLD; ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = '600 30px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, mx + boxW / 2, cy - 6);
      ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = SOFT;
      ctx.fillText('machine', mx + boxW / 2, cy + boxH / 2 - 12);
    };
    machine(leftX, label1, S.chain.first === 'times');
    machine(rightX, label2, S.chain.second === 'times');

    // labels for the wire (the middle value) and the endpoints
    const chip = (tx, ty, text, color, big) => {
      ctx.font = `${big ? '700 20px' : '600 15px'} ui-monospace, Menlo, monospace`;
      const w = ctx.measureText(text).width;
      roundRect(tx - w / 2 - 8, ty - (big ? 16 : 13), w + 16, big ? 32 : 26, 7);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke();
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, tx, ty);
    };
    // input x
    chip(inX + 26, cy - 30, `x = ${S.x}`, INK, false);
    // the middle value on the wire — the star of a chain
    chip((leftX + boxW + rightX) / 2, cy - 34, `${S.chain.mid}`, CARM, true);
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = SOFT; ctx.textAlign = 'center';
    ctx.fillText('the number on the wire', (leftX + boxW + rightX) / 2, cy + 30);
    // output
    chip(outX - 30, cy - 30, `${S.chain.out}`, CARM, true);

    // the flowing token (opt-in animation): a carmine dot riding the rails
    if (S.flow > 0) {
      const path = [
        [inX, cy], [leftX, cy], [leftX + boxW, cy], [rightX, cy],
        [rightX + boxW, cy], [outX, cy],
      ];
      // total length param 0..1 across 5 segments
      const segs = path.length - 1;
      const t = S.flow * segs;
      const i = Math.min(segs - 1, Math.floor(t));
      const f = t - i;
      const px = path[i][0] + (path[i + 1][0] - path[i][0]) * f;
      ctx.beginPath(); ctx.arc(px, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = CARM; ctx.fill();
    }

    // the two-rule readout (steps rule/agree/calib): both composites at once
    if (S.focus === 'rule' || S.focus === 'agree' || S.focus === 'calib') {
      const ry = H * 0.80;
      const rAdd = ruleOf('add-first', S.b, S.c);
      const rTimes = ruleOf('times-first', S.b, S.c);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 15px ui-monospace, Menlo, monospace';
      const gap = orderGap(S.b, S.c);
      const agree = gap === 0;
      ctx.fillStyle = S.order === 'add-first' ? CARM : SOFT;
      ctx.fillText(`add-first:  ${S.c}x + ${rAdd.intercept}`, W * 0.5, ry - 14);
      ctx.fillStyle = S.order === 'times-first' ? CARM : SOFT;
      ctx.fillText(`times-first:  ${S.c}x + ${rTimes.intercept}`, W * 0.5, ry + 14);
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = agree ? OK : INK;
      ctx.fillText(
        agree ? 'the orders AGREE — one machine does nothing' : `gap = b·(c−1) = ${gap}, for every x`,
        W * 0.5, ry + 42,
      );
    }
  }, []);

  useEffect(() => { draw(); }, [c, b, x, order, step, target, flow, focus, draw]);
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
      setX(t.x); // the challenge POSES the input; the student tunes the machines
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* opt-in flow animation, reduced-motion aware */
  const runFlow = () => {
    if (typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFlow(1); return;
    }
    cancelAnimationFrame(rafRef.current);
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 1400);
      setFlow(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const onParam = (k, v) => {
    const n = parseInt(v, 10);
    if (k === 'c') setC(n); else if (k === 'b') setB(n); else setX(n);
  };
  const swap = () => setOrder((o) => (o === 'add-first' ? 'times-first' : 'add-first'));
  const choose = (i) => { if (answers[step] == null) setAnswers((p) => ({ ...p, [step]: i })); };
  const goNext = () => setStep((n) => Math.min(STEPS.length - 1, n + 1));
  const goBack = () => setStep((n) => Math.max(0, n - 1));
  const answered = answers[step] != null;
  const canNext = step < STEPS.length - 1 && (!current.q || answered);

  const spoken = (() => {
    if (focus === 'meet') return `A times ${c} machine and a plus ${b} machine.`;
    if (focus === 'calib' && target)
      return `Target ${target.target} from input ${target.x}. Your output is ${cur}.`;
    return `Input ${x} through ${chain.first === 'times' ? `times ${c}` : `plus ${b}`}, then ` +
      `${chain.second === 'times' ? `times ${c}` : `plus ${b}`}, gives ${chain.out}.`;
  })();

  const headline = (() => {
    if (focus === 'meet') return `× ${c}   and   + ${b}`;
    if (focus === 'rule' || focus === 'agree')
      return ordersAgree(b, c) ? 'both orders: same function' : `order matters:  ${orderGap(b, c) === 0 ? '' : 'gap ' + orderGap(b, c)}`;
    if (focus === 'calib' && target) return `goal: output = ${target.target}`;
    return `${chain.out} = ${current.focus === 'swap' ? 'the other order' : ruleText(order, b, c).replace('x', `·${x}`)}`;
  })();

  return (
    <div className="colab">
      <header className="head">
        <h1>Composing Functions</h1>
        <p className="lede">
          Wire two machines together and send a number through. Then <em>swap</em> them — and watch the
          same number come out different. <span className="mono">f(g(x))</span> is not{' '}
          <span className="mono">g(f(x))</span>: composition is the first operation where{' '}
          <strong>order matters</strong>.
        </p>
      </header>

      <div className="bench">
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">{headline}</p>
            <p className="equation-sub mono">
              ×{c} · +{b} · x={x} · out={chain.out}
            </p>
          </div>
          <div className="stage" ref={stageRef}>
            <canvas ref={canvasRef} aria-label={`Two function machines. ${spoken}`} role="img" />
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>
          <div className="toolbar">
            <button type="button" className="btn" onClick={swap}>⇄ Swap the order</button>
            <button type="button" className="btn ghost" onClick={runFlow}>▶ Send a number through</button>
          </div>
          <div className="facts">
            <div className="fact"><span className="fact-k">First machine</span>
              <span className="fact-v mono">{chain.first === 'times' ? `× ${c}` : `+ ${b}`}</span></div>
            <div className="fact"><span className="fact-k">On the wire</span>
              <span className="fact-v mono">{chain.mid}</span></div>
            <div className="fact"><span className="fact-k">Second machine</span>
              <span className="fact-v mono">{chain.second === 'times' ? `× ${c}` : `+ ${b}`}</span></div>
            <div className="fact"><span className="fact-k">Output</span>
              <span className="fact-v mono">{chain.out}</span></div>
            <div className="fact"><span className="fact-k">This order’s rule</span>
              <span className="fact-v mono">{ruleText(order, b, c)}</span></div>
            <div className="fact"><span className="fact-k">Other order</span>
              <span className="fact-v mono">
                {ruleText(order === 'add-first' ? 'times-first' : 'add-first', b, c)}
              </span></div>
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

          <div className="dials">
            {PARAMS.map((d) => {
              const xLockedForCalib = d.key === 'x' && current.calib;
              const unlocked = step >= d.unlock && !xLockedForCalib;
              const val = d.key === 'c' ? c : d.key === 'b' ? b : x;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.label}</span>
                  <span className="drole">{unlocked ? d.role : (d.key === 'x' && current.calib ? 'fixed by the challenge' : 'unlocks soon')}</span>
                  <input type="range" min={d.min} max={d.max} step={d.step} value={val}
                    disabled={!unlocked} aria-label={`Dial ${d.label} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)} />
                  <output className="dv">{unlocked ? val : (d.key === 'x' && current.calib ? val : '🔒')}</output>
                </label>
              );
            })}
          </div>

          {current.q && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((ch, i) => {
                  const chosen = answers[step];
                  let cls = 'choice';
                  if (chosen != null) {
                    if (i === current.answer) cls += ' correct';
                    else if (i === chosen) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button type="button" key={i} className={cls} onClick={() => choose(i)}
                      disabled={chosen != null}>
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
                Send <span className="mono goal">x = {target.x}</span> in; make the output{' '}
                <span className="mono goal">{target.target}</span>.
              </p>
              <p className="calib-note mono">order: {order === 'add-first' ? '+b then ×c' : '×c then +b'} · try Swap</p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">out = {cur} · match {pct.toFixed(0)}%</span>
                {calibrated
                  ? <span className="stamp">CALIBRATED</span>
                  : <span className="mono target-hint">reach {target.target}</span>}
              </div>
              <button type="button" className="btn ghost"
                onClick={() => { const t = makeTarget(target); setTarget(t); setX(t.x); }}>New target</button>
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
                setStep(0); setAnswers({}); setTarget(null);
                setC(START.c); setB(START.b); setX(START.x); setOrder(START.order);
              }}>Restart lab</button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">f(g(x)) ≠ g(f(x)) · order matters</span> &nbsp;·&nbsp;
        two machines, one wire, rendered live on a dependency-free canvas.
      </footer>

      <style jsx>{`
        .colab {
          --page:#eff1ee; --paper:#fbfbf8; --ink:#1c2b3a; --ink-soft:#5b6b7b;
          --curve:#c81e4f; --quad:#c7d8e4; --ok:#1f8a5b;
          --mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
          --serif:'Iowan Old Style',Palatino,Georgia,serif;
          background:var(--page); color:var(--ink);
          font:16px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;
          padding:28px 18px 44px; border-radius:16px; max-width:1120px; margin:0 auto;
        }
        .mono{font-family:var(--mono);}
        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
        .eyebrow{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--ink-soft);margin:0 0 6px;}
        .eyebrow.small{margin:0 0 4px;}
        h1{font-family:var(--serif);font-weight:600;font-size:clamp(26px,4vw,34px);margin:0 0 6px;}
        .lede{color:var(--ink-soft);margin:0 0 22px;max-width:68ch;}
        .bench{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:22px;align-items:start;}
        @media (max-width:920px){.bench{grid-template-columns:1fr;}}
        .panel{background:#fff;border:1px solid rgba(28,43,58,.15);border-radius:12px;box-shadow:0 1px 2px rgba(28,43,58,.05);}
        .stage-panel{padding:14px;}
        .stage-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:10px;}
        .equation{font-family:var(--mono);color:var(--curve);font-size:17px;font-weight:600;margin:0;}
        .equation-sub{color:var(--ink-soft);font-size:12.5px;margin:0;}
        .stage{position:relative;width:100%;aspect-ratio:16/11;border:1px solid var(--quad);border-radius:8px;overflow:hidden;
          background:radial-gradient(120% 120% at 30% 22%,#fdfefe 0%,#eef3f7 55%,#e3ebf1 100%);}
        .stage canvas{display:block;width:100%;height:100%;}
        .toolbar{margin:12px 4px 2px;display:flex;gap:9px;flex-wrap:wrap;}
        .btn{font:600 13px/1 system-ui,sans-serif;padding:9px 14px;border-radius:8px;cursor:pointer;
          border:1px solid var(--ink);background:var(--ink);color:#fff;transition:filter .15s,opacity .15s;}
        .btn.ghost{background:transparent;color:var(--ink);}
        .btn:disabled{opacity:.4;cursor:not-allowed;}
        .btn:not(:disabled):hover{filter:brightness(1.08);}
        .facts{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;margin:14px 4px 4px;}
        @media (max-width:460px){.facts{grid-template-columns:1fr;}}
        .fact{display:flex;flex-direction:column;gap:1px;padding:6px 0;border-top:1px solid rgba(28,43,58,.08);}
        .fact-k{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft);}
        .fact-v{font-size:14px;font-variant-numeric:tabular-nums;}
        .tutor{padding:18px 20px 20px;}
        .progress{display:flex;gap:6px;margin-bottom:14px;}
        .pip{height:5px;flex:1;border-radius:3px;background:rgba(28,43,58,.14);}
        .pip.done{background:rgba(200,30,79,.45);}
        .pip.cur{background:var(--curve);}
        h2{font-family:var(--serif);font-weight:600;font-size:20px;margin:0 0 10px;padding-bottom:9px;border-bottom:3px double rgba(200,30,79,.45);}
        .body{margin:0 0 16px;font-size:14.5px;}
        .dials{display:grid;gap:12px;margin-bottom:6px;}
        .dial{display:grid;grid-template-columns:22px 1fr 44px;grid-template-rows:auto auto;align-items:center;gap:2px 10px;}
        .dial.locked{opacity:.5;}
        .dk{grid-row:1/3;font-family:var(--serif);font-style:italic;font-size:19px;}
        .drole{grid-column:2/4;font-size:11px;color:var(--ink-soft);}
        .dial input[type=range]{grid-column:2;width:100%;accent-color:var(--ink);cursor:pointer;}
        .dial input[type=range]:disabled{cursor:not-allowed;}
        .dv{grid-column:3;font-family:var(--mono);text-align:right;font-size:13.5px;}
        .quiz{margin-top:16px;padding-top:14px;border-top:1px solid rgba(28,43,58,.1);}
        .q{font-size:14px;font-weight:600;margin:0 0 10px;}
        .choices{display:grid;gap:7px;}
        .choice{text-align:left;font:13.5px/1.4 system-ui,sans-serif;padding:9px 11px 9px 30px;
          border:1px solid rgba(28,43,58,.2);border-radius:8px;background:var(--paper);color:var(--ink);
          cursor:pointer;position:relative;transition:border-color .15s,background .15s;}
        .choice:not(:disabled):hover{border-color:var(--ink);}
        .choice .mark{position:absolute;left:10px;font-weight:700;}
        .choice.correct{border-color:var(--ok);background:rgba(31,138,91,.08);}
        .choice.correct .mark{color:var(--ok);}
        .choice.wrong{border-color:var(--ink-soft);background:rgba(91,107,123,.08);}
        .choice.wrong .mark{color:var(--ink-soft);}
        .choice.dim{opacity:.55;}
        .choice:disabled{cursor:default;}
        .feedback{margin:12px 0 0;font-size:13px;line-height:1.55;background:rgba(200,30,79,.05);
          border-left:3px solid var(--curve);padding:10px 12px;border-radius:0 6px 6px 0;}
        .calib{margin-top:16px;padding-top:14px;border-top:1px solid rgba(28,43,58,.1);display:grid;gap:10px;}
        .calib-goal{margin:0;font-size:14px;}
        .calib-goal .goal{color:var(--curve);font-weight:700;}
        .calib-note{margin:0;font-size:12px;color:var(--ink-soft);}
        .meter{height:12px;border-radius:6px;background:rgba(28,43,58,.1);overflow:hidden;}
        .meter-fill{height:100%;background:linear-gradient(90deg,rgba(200,30,79,.55),var(--curve));transition:width .12s ease-out;}
        .meter-row{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;}
        .target-hint{color:var(--ink-soft);font-size:12px;}
        .stamp{font:700 12px/1 var(--mono);letter-spacing:.16em;color:var(--ok);border:2px solid var(--ok);border-radius:6px;padding:4px 8px;transform:rotate(-3deg);}
        .nav{margin-top:20px;display:flex;justify-content:space-between;gap:10px;}
        .foot{margin-top:24px;font-size:12.5px;color:var(--ink-soft);}
        :global(.colab) :focus-visible{outline:2px solid var(--ink);outline-offset:2px;border-radius:4px;}
        @media (prefers-reduced-motion:reduce){.btn,.meter-fill,.choice{transition:none;}}
      `}</style>
    </div>
  );
}
