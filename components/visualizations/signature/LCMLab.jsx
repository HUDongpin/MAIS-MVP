'use client';

/* ============================================================================
   LCMLab — an interactive "bench" for the LEAST COMMON MULTIPLE, told as the
   story of TWO SPINNING CYCLES THAT RE-SYNCHRONIZE.

   Built for MAIS (math AI system, www.mais.ac), K-12. Grade 6 territory —
   CCSS 6.NS.B.4 ("find the least common multiple of two whole numbers ≤ 12 …
   and use it to solve real-world problems").

   House style: the interactive-math-bench standard — a quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with a
   live match meter and a CALIBRATED stamp.

   THE SIGNATURE CENTERPIECE — "two wheels that come home together."
     Two wheels sit side by side. Wheel A has `a` notches and advances one notch
     per tick, so its pointer returns HOME (straight up) every a ticks. Wheel B
     has `b` notches and comes home every b ticks. Both start pointing home at
     tick 0, then drift apart because they turn at different speeds. Run them and
     the question answers itself: the FIRST tick at which BOTH point home again
     is the least common multiple. By that moment wheel A has turned exactly
     b÷GCF whole times and wheel B a÷GCF times — which is precisely why
     LCM = a·b ÷ GCF. The LCM is a PERIOD here, not a place on a line.

   Following the colour convention of SystemsOfEquationsLab (carmine = first
   object, blue = second object, GOLD = the answer where they agree), the ONE
   spotlight colour is the gold RE-SYNC — the moment the whole lab is about.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files):
     • MultiplesLab owns the LINEAR picture: a skip-count NUMBER LINE of equal
       carmine hops landing on n, 2n, 3n, … running off to "forever", with a
       second counter whose coincidences give the LCM. This lab is ROTATIONAL and
       never draws that line: the multiples appear only as WHOLE TURNS of a
       wheel, and the LCM is the RE-SYNC PERIOD of two rhythms. Same theorem,
       deliberately opposite mental model (cyclic vs. sequential) — the same way
       MedianLab refuses to reuse DataLab's dot plot.
     • GreatestCommonFactorLab owns the shared-FACTOR picture (common-factor
       columns + the "prime-brick overlap" that multiplies the SHARED primes to
       the GCF). This lab therefore does NOT draw a prime-factor Venn at all —
       the GCF appears only as the number that explains WHY the wheels re-sync
       early (÷GCF), never as its own overlap diagram.
     • FactorLab decomposes ONE number into its finite divisors;
       PrimeFactorizationLab grows ONE number's factor tree. Neither has cycles.

   DROP-IN USAGE (Next.js, app or pages router):
     1. Save anywhere, e.g. app/labs/LCMLab.jsx
     2. import LCMLab from './LCMLab';
        export default function Page() { return <LCMLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the two periods, the
              tick, the lesson step, answers, the challenge target).
     MODEL  — gcd / lcm are pure integer math; they know nothing about pixels and
              stay EXACT (no floats decide anything).
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // cycle A
const BLUE = '#2f6f9f'; // cycle B
const GOLD = '#c8891e'; // THE spotlight — the re-sync (the LCM)
const GOLD_DK = '#8f6410';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const OK = '#1f8a5b';
const TIMES = '×';

const RUN_DUR = 2600; // ms for a full 0 → LCM run

/* ===========================================================================
   MODEL — pure integer math, no pixels, no floats.
   =========================================================================== */

/* Euclid's algorithm. gcd(12,18)=6. */
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

/* Least common multiple, exact. Divide before multiplying so a/gcd·b stays an
   integer. This IS the re-sync period of two cycles of length a and b. */
function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return (a / gcd(a, b)) * b;
}

/* current time in ms, SSR-safe */
function nowMs() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

/* Is a wheel of this period pointing HOME (straight up) at time tau?
   True exactly when tau/period is a whole number; the epsilon only forgives
   mid-animation float dust, never decides any stated fact. */
function isHome(period, tau) {
  const turns = tau / period;
  const frac = turns - Math.floor(turns + 1e-9);
  return frac < 0.012 || frac > 0.988;
}

/* ---- calibration targets: every value is the LCM of some pair in 2..12, and
   most have several solutions, so "tune ANY pair that re-syncs on it" is a real
   task with many right answers. Reachability is proven by audit-lcm.mjs. ---- */
const TARGETS = [6, 10, 12, 15, 18, 20, 24, 30, 36, 40, 60, 72];

function pickTarget(prev) {
  let t = prev;
  while (t === prev) t = TARGETS[Math.floor(Math.random() * TARGETS.length)];
  return t;
}

/* ===========================================================================
   LESSON — one capability unlocks per step; the last step is the challenge.
   =========================================================================== */
const STEPS = [
  {
    title: 'A cycle that comes home',
    body:
      'Wheel A has a notches and turns one notch per tick. After a ticks it has made ONE whole turn ' +
      'and its pointer is back HOME at the top. So it comes home at tick a, 2a, 3a, … — the multiples ' +
      'of a, seen as complete turns. Slide the period and drag the tick to watch it come home.',
    q: 'A wheel comes home every 4 ticks. At which tick has it come home exactly 3 times?',
    choices: [
      '12 — that is 4 × 3, three whole turns',
      '7 — one turn of 4, then 3 more ticks',
      '3 — it comes home once per tick',
    ],
    answer: 0,
    feedback:
      'Coming home every 4 ticks means home at 4, 8, 12, … so the 3rd time is 4 × 3 = 12. It only ' +
      'comes home after a WHOLE turn of 4 ticks — not every tick, and 7 is mid-turn.',
  },
  {
    title: 'Two wheels, two rhythms',
    body:
      'Now add wheel B with b notches — it comes home every b ticks. Both point home at tick 0, then ' +
      'drift apart because they turn at different speeds. The question of this whole lab: when do they ' +
      'BOTH point home at the same tick again?',
    q: 'Wheel A comes home every 3 ticks, wheel B every 5. At tick 10, who is home?',
    choices: [
      'Only B — 10 is a multiple of 5 but not of 3',
      'Both — 10 is big enough for each of them',
      'Neither — wheels with different periods never match',
    ],
    answer: 0,
    feedback:
      'B is home at 5, 10, 15, … so B is home at 10. A is home at 3, 6, 9, 12, … so A is mid-turn at 10. ' +
      'For BOTH you need a tick that is a multiple of 3 AND of 5 — and they certainly do match eventually.',
  },
  {
    title: 'Watch them re-sync',
    body:
      'Run the wheels. A points home on the multiples of a; B points home on the multiples of b. Only on ' +
      'a tick that is a multiple of BOTH do they point home together — the gold RE-SYNC. Keep running and ' +
      'it happens again and again, at a steady beat.',
    q: 'Two wheels of period 4 and 6 both start home. They re-sync at 12, then next at…?',
    choices: [
      '24 — re-syncs repeat every 12 ticks',
      '18 — add 6, wheel B’s period',
      '16 — add 4, wheel A’s period',
    ],
    answer: 0,
    feedback:
      'Re-syncs land on the common multiples of 4 and 6: 12, 24, 36, … — a steady beat of 12. Adding 6 ' +
      'only brings B home; adding 4 only brings A home. You need both at once.',
  },
  {
    title: 'The FIRST re-sync is the LCM',
    body:
      'The very first tick where both point home again is the least common multiple, LCM(a, b) — the ' +
      'RE-SYNC PERIOD. Press “Run to re-sync”. By the time they line up, wheel A has made b ÷ GCF whole ' +
      'turns and wheel B has made a ÷ GCF turns. Those turn counts are shown under each wheel.',
    q: 'Wheels of period 6 and 8 both start home. What is the first tick they re-sync?',
    choices: [
      '24 — that is LCM(6, 8)',
      '48 — that is 6 × 8',
      '2 — that is the greatest common factor of 6 and 8',
    ],
    answer: 0,
    feedback:
      'The first re-sync is the least common multiple, 24. 6 × 8 = 48 is a LATER re-sync, not the first. ' +
      'And 2 is the greatest common FACTOR — the largest number dividing both, a different idea entirely.',
  },
  {
    title: 'A shortcut for the re-sync time',
    body:
      'You never have to spin them: LCM = a × b ÷ GCF(a, b). Why divide by the GCF? The wheels ' +
      'share GCF-worth of rhythm, so A needs only b ÷ GCF turns to catch up. Two cases to know: ' +
      'GCF = 1 means re-sync only after a × b; one period dividing the other means re-sync at the ' +
      'larger one.',
    q: 'Wheels of period 4 and 6, whose GCF is 2. Their re-sync time is…?',
    choices: [
      '12 — that is 4 × 6 ÷ 2',
      '24 — that is 4 × 6',
      '2 — that is the GCF itself',
    ],
    answer: 0,
    feedback:
      'LCM = a·b ÷ GCF = 24 ÷ 2 = 12. Plain 4 × 6 = 24 overshoots because it double-counts the rhythm the ' +
      'two wheels share; dividing by the GCF (2) corrects it. The GCF is a factor, never the re-sync time.',
  },
  {
    title: 'Re-syncing cycles are everywhere',
    body:
      'This is the LCM at work in the world. Two meshing gears with a and b teeth return to their starting ' +
      'bite after LCM turns of teeth. Two lights blinking every a and b seconds flash together every ' +
      'LCM seconds. Planets line up on an LCM-year cycle. Even adding fractions uses it: the least common ' +
      'denominator IS an LCM.',
    q: 'A red light blinks every 6 s and a green light every 8 s. They just flashed together. When next?',
    choices: [
      'After 24 s — LCM(6, 8) = 24',
      'After 48 s — that is 6 × 8',
      'After 14 s — that is 6 + 8',
    ],
    answer: 0,
    feedback:
      'They re-sync at the least common multiple: 24 s. 6 × 8 = 48 is a later match, so they would already ' +
      'have flashed together at 24. Adding the periods (14) is not how repeating cycles line up.',
  },
  {
    title: 'Tune the re-sync time',
    body:
      'A target re-sync time is shown below. Set the two wheels’ periods so they re-sync EXACTLY every ' +
      'that many ticks — that is, so LCM(a, b) equals the target. Many different pairs work. Land it and ' +
      'the meter fills and the CALIBRATED stamp appears. Press New target for another.',
    calib: true,
  },
];

/* ===========================================================================
   COMPONENT
   =========================================================================== */
export default function LCMLab() {
  const [a, setA] = useState(4);
  const [b, setB] = useState(6);
  const [t, setT] = useState(0); // the tick
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const current = STEPS[step];
  const calib = !!current.calib;
  const single = step === 0; // step 0 shows wheel A alone

  /* ---- refs -------------------------------------------------------------- */
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const rafRef = useRef(0);
  const reducedRef = useRef(false);
  const runStartRef = useRef(null);

  /* ---- derived, exact math ---------------------------------------------- */
  const g = gcd(a, b);
  const L = lcm(a, b);
  const turnsA = L / a; // = b / gcf
  const turnsB = L / b; // = a / gcf
  /* how far the tick can run. Step 0 knows nothing of wheel B, so it gets six
     turns of A; every later step runs exactly as far as the first re-sync. */
  const tickMax = single ? a * 6 : L;

  const calibrated = calib && target != null && L === target;
  const pct =
    target == null
      ? 0
      : L === target
      ? 100
      : Math.min(99, Math.round((100 * Math.min(L, target)) / Math.max(L, target)));

  sceneRef.current = { ...sceneRef.current, a, b, t, step, single, g, L, turnsA, turnsB, tickMax };

  /* ---- reduced-motion awareness ----------------------------------------- */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = m.matches;
    const h = () => (reducedRef.current = m.matches);
    m.addEventListener ? m.addEventListener('change', h) : m.addListener(h);
    return () => (m.removeEventListener ? m.removeEventListener('change', h) : m.removeListener(h));
  }, []);

  /* changing a period — or the step — re-homes the wheels, since the tick range
     itself changes underneath them */
  useEffect(() => {
    runStartRef.current = null;
    cancelAnimationFrame(rafRef.current);
    setT(0);
  }, [a, b, step]);

  /* hand the challenge a fresh target the first time we reach it */
  useEffect(() => {
    if (STEPS[step].calib && target == null) {
      setTarget(pickTarget(null));
      setA(2);
      setB(2); // start well below any target so the meter reads low
    }
  }, [step, target]);

  /* =======================================================================
     RENDER — two wheels, redrawn from state.
     ======================================================================= */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const S = sceneRef.current;
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

    /* the animated tick: continuous while running, else the integer state */
    let tau = S.t;
    if (runStartRef.current != null) {
      tau = Math.min(S.tickMax, ((nowMs() - runStartRef.current) / RUN_DUR) * S.tickMax);
    }

    const R = Math.max(44, Math.min(W * 0.19, H * 0.29));
    const cy = H * 0.47;
    const cxA = S.single ? W * 0.5 : W * 0.31;
    const cxB = W * 0.69;

    const homeA = isHome(S.a, tau);
    const homeB = isHome(S.b, tau);
    const sync = !S.single && homeA && homeB && tau > 0.5;

    /* gold halo behind both wheels at the moment of re-sync */
    if (sync) {
      ctx.fillStyle = 'rgba(200,137,30,0.16)';
      ctx.beginPath();
      ctx.arc(cxA, cy, R + 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cxB, cy, R + 14, 0, Math.PI * 2);
      ctx.fill();
    }

    wheel(ctx, MONO, cxA, cy, R, S.a, tau, CURVE, 'A', homeA, sync, S.step >= 3 ? S.turnsA : 0);
    if (!S.single) {
      wheel(ctx, MONO, cxB, cy, R, S.b, tau, BLUE, 'B', homeB, sync, S.step >= 3 ? S.turnsB : 0);
    }

    /* top-centre: the tick counter and the sync lamp */
    const tickTxt = String(Math.round(tau));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK_SOFT;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText('TICK', W / 2, 18);
    ctx.fillStyle = INK;
    ctx.font = `700 26px ${MONO}`;
    ctx.fillText(tickTxt, W / 2, 40);

    if (!S.single) {
      const lampY = H - 22;
      if (sync) {
        const label = `IN SYNC — both home at ${Math.round(tau)}`;
        ctx.font = `700 13px ${MONO}`;
        const w = ctx.measureText(label).width + 26;
        roundRect(ctx, W / 2 - w / 2, lampY - 13, w, 26, 13);
        ctx.fillStyle = 'rgba(200,137,30,0.16)';
        ctx.fill();
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = GOLD_DK;
        ctx.fillText(label, W / 2, lampY);
      } else {
        ctx.fillStyle = INK_SOFT;
        ctx.font = `11.5px ${MONO}`;
        ctx.fillText(`next re-sync at tick ${S.L}`, W / 2, lampY);
      }
    }

    S.running = runStartRef.current != null && tau < S.tickMax;
  }, []);

  /* one wheel: rim, notches, home flag, pointer, turn counter */
  function wheel(ctx, MONO, cx, cy, R, period, tau, color, name, home, sync, needTurns) {
    // rim
    ctx.strokeStyle = 'rgba(28,43,58,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    // notches — one per tick of this wheel's period
    for (let k = 0; k < period; k++) {
      const ang = -Math.PI / 2 + (k / period) * Math.PI * 2;
      const inR = k === 0 ? R - 11 : R - 7;
      ctx.strokeStyle = k === 0 ? color : 'rgba(28,43,58,0.28)';
      ctx.lineWidth = k === 0 ? 3 : 1.4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * inR, cy + Math.sin(ang) * inR);
      ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
      ctx.stroke();
    }

    // the HOME flag just outside the top notch
    ctx.fillStyle = home ? (sync ? GOLD : color) : 'rgba(28,43,58,0.35)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - R - 4);
    ctx.lineTo(cx - 5, cy - R - 13);
    ctx.lineTo(cx + 5, cy - R - 13);
    ctx.closePath();
    ctx.fill();

    // home glow ring when the pointer is actually home
    if (home) {
      ctx.strokeStyle = sync ? GOLD : color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // the pointer
    const ang = -Math.PI / 2 + (tau / period) * Math.PI * 2;
    const px = cx + Math.cos(ang) * R * 0.8;
    const py = cy + Math.sin(ang) * R * 0.8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // hub
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // name + period + turns
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.font = `700 13px ${MONO}`;
    ctx.fillText(`${name} · home every ${period}`, cx, cy + R + 20);
    const turns = Math.floor(tau / period + 1e-9);
    ctx.fillStyle = INK_SOFT;
    ctx.font = `11.5px ${MONO}`;
    const suffix = needTurns ? ` of ${needTurns}` : '';
    ctx.fillText(`${turns}${suffix} turn${turns === 1 && !needTurns ? '' : 's'}`, cx, cy + R + 37);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* keep the run animation going until the wheels arrive */
  const animate = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const tick = () => {
      draw();
      if (runStartRef.current != null) {
        const p = (nowMs() - runStartRef.current) / RUN_DUR;
        if (p >= 1) {
          runStartRef.current = null;
          setT(sceneRef.current.tickMax); // land exactly on the re-sync
        } else {
          rafRef.current = requestAnimationFrame(tick);
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [a, b, t, step, target, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /* ---- controls ---------------------------------------------------------- */
  const runToSync = () => {
    if (reducedRef.current) {
      setT(tickMax);
      return;
    }
    runStartRef.current = nowMs();
    animate();
  };
  const stopRun = () => {
    runStartRef.current = null;
    cancelAnimationFrame(rafRef.current);
  };
  const onTick = (v) => {
    stopRun();
    setT(v);
  };
  const newTarget = () => {
    stopRun();
    setTarget((x) => pickTarget(x));
    setA(2);
    setB(2);
  };
  const PAIRS = [
    [4, 6],
    [3, 5],
    [6, 8],
    [8, 12],
    [9, 12],
    [5, 10],
  ];

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const atSync = !single && t > 0 && t % L === 0;

  /* ---- spoken description for screen readers ----------------------------- */
  const spoken = single
    ? `Wheel A has period ${a}: it comes home every ${a} ticks. Tick ${t}, ${Math.floor(t / a)} whole turns.`
    : `Two wheels. A comes home every ${a} ticks, B every ${b} ticks. At tick ${t}, A has made ${Math.floor(
        t / a
      )} turns and B ${Math.floor(t / b)}. ${
        atSync ? 'They are in sync.' : `They re-sync at tick ${L}.`
      } The least common multiple of ${a} and ${b} is ${L}.` + (calibrated ? ' Calibrated.' : '');

  return (
    <div className="lcmlab">
      <header className="head">
        <h1>Least Common Multiple</h1>
        <p className="lede">
          Two wheels spin at different speeds. Both start pointing <em>home</em>, then drift apart —
          and the first tick they point home <em>together</em> again is the{' '}
          <em>least common multiple</em>. The LCM isn’t a spot on a line here; it’s the beat on which
          two rhythms re-synchronize.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            {single ? (
              <p className="prod mono">
                <span className="eq">wheel </span>
                <span className="pa">A</span>
                <span className="eq"> comes home every </span>
                <span className="pa">{a}</span>
                <span className="eq"> ticks</span>
              </p>
            ) : (
              <p className="prod mono">
                <span className="eq">LCM(</span>
                <span className="pa">{a}</span>
                <span className="eq">, </span>
                <span className="pb">{b}</span>
                <span className="eq">) = </span>
                <span className="pg">{L}</span>
                <span className="eq"> ticks per re-sync</span>
              </p>
            )}
            {!single && step >= 4 && (
              <p className="expo mono" aria-hidden="true">
                {a} {TIMES} {b} ÷ {g} = {L}
              </p>
            )}
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {single ? 'one whole turn = one multiple of a' : 'both flags lit = a re-sync'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          {/* the tick control — time, not a number line */}
          <div className="tickrow">
            <label className="ticklab mono" htmlFor="tickr">
              tick
            </label>
            <input
              id="tickr"
              type="range"
              min={0}
              max={tickMax}
              step={1}
              value={Math.min(t, tickMax)}
              aria-label="Tick"
              onChange={(e) => onTick(parseInt(e.target.value, 10))}
            />
            <output className="tickv mono">
              {Math.min(t, tickMax)} / {tickMax}
            </output>
          </div>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="sw" style={{ background: CURVE }} /> cycle A
            </span>
            {!single && (
              <span className="lg">
                <span className="sw" style={{ background: BLUE }} /> cycle B
              </span>
            )}
            {!single && (
              <span className="lg">
                <span className="sw" style={{ background: GOLD }} /> re-sync = LCM
              </span>
            )}
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Cycle A period</span>
              <span className="fact-v mono" style={{ color: CURVE, fontWeight: 700 }}>
                {a}
              </span>
            </div>
            {!single && (
              <div className="fact">
                <span className="fact-k">Cycle B period</span>
                <span className="fact-v mono" style={{ color: BLUE, fontWeight: 700 }}>
                  {b}
                </span>
              </div>
            )}
            {!single && (
              <div className="fact">
                <span className="fact-k">Re-sync period (LCM)</span>
                <span className="fact-v mono" style={{ color: GOLD_DK, fontWeight: 700 }}>
                  {L} ticks
                </span>
              </div>
            )}
            {!single && step >= 3 && (
              <div className="fact">
                <span className="fact-k">Turns to re-sync · A / B</span>
                <span className="fact-v mono">
                  {turnsA} / {turnsB}
                </span>
              </div>
            )}
            {!single && step >= 4 && (
              <div className="fact">
                <span className="fact-k">Greatest common factor</span>
                <span className="fact-v mono">{g}</span>
              </div>
            )}
            {!single && step >= 4 && (
              <div className="fact">
                <span className="fact-k">Shortcut · a × b ÷ GCF</span>
                <span className="fact-v mono">
                  {a} {TIMES} {b} ÷ {g} = {L}
                </span>
              </div>
            )}
          </div>

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={runToSync}>
              {single ? '▶ Run' : '▶ Run to re-sync'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => onTick(Math.min(tickMax, t + 1))}
              disabled={t >= tickMax}
            >
              Step +1
            </button>
            <button type="button" className="btn ghost" onClick={() => onTick(0)} disabled={t === 0}>
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

          {!calib ? (
            <div className="picker">
              <label className="dial">
                <span className="dk" style={{ color: CURVE }}>
                  a
                </span>
                <span className="drole">wheel A’s period</span>
                <input
                  type="range"
                  min={2}
                  max={12}
                  step={1}
                  value={a}
                  aria-label="Wheel A period"
                  style={{ accentColor: CURVE }}
                  onChange={(e) => setA(parseInt(e.target.value, 10))}
                />
                <output className="dv">{a}</output>
              </label>
              {!single && (
                <label className="dial">
                  <span className="dk" style={{ color: BLUE }}>
                    b
                  </span>
                  <span className="drole">wheel B’s period</span>
                  <input
                    type="range"
                    min={2}
                    max={12}
                    step={1}
                    value={b}
                    aria-label="Wheel B period"
                    style={{ accentColor: BLUE }}
                    onChange={(e) => setB(parseInt(e.target.value, 10))}
                  />
                  <output className="dv">{b}</output>
                </label>
              )}
              {!single && (
                <div className="presets" role="group" aria-label="Quick pairs">
                  {PAIRS.map(([pa, pb]) => (
                    <button
                      key={`${pa}-${pb}`}
                      type="button"
                      className={'preset mono' + (a === pa && b === pb ? ' on' : '')}
                      onClick={() => {
                        setA(pa);
                        setB(pb);
                      }}
                    >
                      {pa} &amp; {pb}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="challenge">
              <div className="chbox">
                <span className="chk mono">Target re-sync</span>
                <span className="chv mono">{target}</span>
              </div>
              <div className="picker">
                <label className="dial">
                  <span className="dk" style={{ color: CURVE }}>
                    a
                  </span>
                  <span className="drole">wheel A’s period</span>
                  <input
                    type="range"
                    min={2}
                    max={12}
                    step={1}
                    value={a}
                    aria-label="Wheel A period"
                    style={{ accentColor: CURVE }}
                    onChange={(e) => setA(parseInt(e.target.value, 10))}
                  />
                  <output className="dv">{a}</output>
                </label>
                <label className="dial">
                  <span className="dk" style={{ color: BLUE }}>
                    b
                  </span>
                  <span className="drole">wheel B’s period</span>
                  <input
                    type="range"
                    min={2}
                    max={12}
                    step={1}
                    value={b}
                    aria-label="Wheel B period"
                    style={{ accentColor: BLUE }}
                    onChange={(e) => setB(parseInt(e.target.value, 10))}
                  />
                  <output className="dv">{b}</output>
                </label>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  re-syncs every {L} tick{L === 1 ? '' : 's'}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">aim for {target}</span>
                )}
              </div>
              <div className="chbtns">
                <button type="button" className="btn ghost" onClick={runToSync}>
                  ▶ Run
                </button>
                <button type="button" className="btn" onClick={newTarget}>
                  New target
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
                  setTarget(null);
                  setA(4);
                  setB(6);
                  setT(0);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">LCM(a, b) = a·b ÷ GCF(a, b)</span> &nbsp;·&nbsp; two cycles of length a
        and b, started together, come home together again after LCM(a, b) ticks — the smallest positive
        number that is a multiple of both. CCSS&nbsp;6.NS.B.4.
      </footer>

      <style jsx>{`
        .lcmlab {
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
        .prod .pa {
          color: var(--curve);
        }
        .prod .pb {
          color: var(--blue);
        }
        .prod .pg {
          color: var(--gold-dk);
          font-weight: 700;
        }
        .expo {
          margin: 3px 0 0;
          font-size: 15px;
          color: var(--ink-soft);
          font-variant-numeric: tabular-nums;
        }
        .stage {
          position: relative;
          width: min(100%, 720px);
          aspect-ratio: 16 / 9;
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
        .tickrow {
          display: grid;
          grid-template-columns: 34px 1fr 74px;
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
          accent-color: var(--gold);
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
          border-radius: 50%;
          display: inline-block;
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
          font-size: 34px;
          font-weight: 700;
          color: var(--gold-dk);
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
          background: linear-gradient(90deg, rgba(200, 137, 30, 0.55), var(--gold));
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
        :global(.lcmlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .preset {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
