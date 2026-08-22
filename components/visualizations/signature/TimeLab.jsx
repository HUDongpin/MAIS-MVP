'use client';

/* ============================================================================
   TimeLab — an interactive "bench" for TELLING TIME on an analog clock: two
   hands turning around a 12-hour dial, read as  H:MM  and as a turn in degrees.

        time = (hour hand at  (h + m/60)·30° )  +  (minute hand at  m·6° )

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — one carmine accent for the
   mathematical object, dials that unlock one per lesson step, predict-then-check
   questions, and a calibration challenge with a live match meter.

   Grades & standards this lab serves:
     • CCSS 1.MD.B.3   — tell and write time in hours and half-hours.
     • CCSS 2.MD.C.7   — tell time to the nearest five minutes; a.m./p.m.
     • CCSS 3.MD.A.1   — tell time to the nearest minute; measure ELAPSED time.
     • Enrichment (Gr 4+) — each hour = 30°, each minute = 6°, and the angle
       between the hands (a classic competition problem) = |30h − 5.5m|.

   Why this bench is a clock, not a y = f(x) plot, and how it stays faithful:
     • A clock is a GEOMETRIC figure — a circular dial and two rays (hands)
       turning about a shared centre. So the MODEL is two hand-directions (pure
       angles) and the RENDER draws a face, ticks, numbers, and the two hands —
       not a per-pixel curve. This makes TimeLab a close sibling of AngleLab: a
       clock hand is a ray, the clock face is a double protractor.
     • THE SINGLE IDEA THAT IS THE MATHEMATICS — the one most students get wrong:
       the hour hand does NOT jump from number to number. It creeps. At 3:30 it
       sits exactly HALFWAY between 3 and 4, because 30 minutes is half an hour.
       The bench draws the hour hand at its true fractional position (h + m/60)
       and, on the centrepiece step, shades the fraction m/60 of the way from the
       hour to the next — the analogue of the ellipse "string" or the Circle's
       radius-triangle: one picture that carries the whole idea.

   Everything else — the state→model→render spine, DPI handling, unlocking dials,
   predict-then-check gating, the calibration meter — is the same machine as the
   rest of the MAIS lab library.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.  app/labs/TimeLab.jsx
     2. Import and render it:
          import TimeLab from './TimeLab';
          export default function Page() { return <TimeLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

const DEG = Math.PI / 180;

/* ---------------------------------------------------------------------------
   Palette. Carmine is the one house accent = the mathematical object. A clock
   has TWO hands that must be told apart, so — following the precedent of AddLab
   (soft-blue second quantity) and QuadrilateralLab (--blue second shape) — the
   HOUR hand keeps the carmine lead (it is the trickier, "creeping" hand and the
   centrepiece is about it) and the MINUTE hand takes a steel-blue second tint.
   ------------------------------------------------------------------------- */
const CARMINE = '#C81E4F'; // hour hand + the "time" it teaches
const BLUE = '#2D5F8C'; // minute hand
const INK = '#1C2B3A';
const INK_SOFT = '#5B6B7B';
const FADE = 'rgba(28,43,58,0.26)'; // a hand that is not the current focus

/* ---------------------------------------------------------------------------
   Lesson step indices, named so the renderer and effects read clearly.
   ------------------------------------------------------------------------- */
const S_INTRO = 0;
const S_HOUR = 1;
const S_MIN = 2;
const S_READ = 3;
const S_MOVE = 4; // the centrepiece: the hour hand keeps moving
const S_ELAPSED = 5;
const S_CALIB = 6;

/* ---------------------------------------------------------------------------
   Parameters. Two dials — the hour (1…12) and the minute (0…59) — unlocking one
   per lesson step, exactly like the arithmetic labs' two-dial pattern.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'h', label: 'h', min: 1, max: 12, step: 1, unit: '', unlock: S_HOUR, role: 'the hour · short hand' },
  { key: 'm', label: 'm', min: 0, max: 59, step: 1, unit: '', unlock: S_MIN, role: 'the minutes · long hand' },
];
const START = { h: 3, m: 0, period: 'AM' };

/* A fixed, clean scenario for the elapsed-time step (like a calibration target,
   it is set on entering the step). Start = 1:30, end (the live dials) = 4:15. */
const ELAPSED_START = { h: 1, m: 30 };
const ELAPSED_END = { h: 4, m: 15 };

/* ---------------------------------------------------------------------------
   Lesson. One idea per step; the dial unlocks with the step; the reveal lives in
   `feedback` (shown after answering); distractors are real student mistakes.
   Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the clock',
    body:
      'The SHORT fat hand is the hour hand. The LONG thin hand is the minute ' +
      'hand. Right now it reads 3 o’clock.',
    q: 'Which hand tells you the hour?',
    choices: ['The short hand', 'The long hand', 'The hand that never moves'],
    answer: 0,
    feedback: 'The short hand is the hour hand; the long thin one is the minute hand.',
  },
  {
    title: 'h — the hour hand',
    body: 'Drag h. Twelve hours make one full 360° turn.',
    q: 'From one number to the next, the hour hand turns…',
    choices: ['30° — because 360° ÷ 12 = 30°', '60°', '12°'],
    answer: 0,
    feedback: '360° shared among 12 numbers is 30° each.',
  },
  {
    title: 'm — the minute hand',
    body:
      'For the minute hand, each NUMBER counts 5 minutes: 5, 10, 15… ' +
      'Drag m and watch the ring.',
    showMinuteRing: true,
    q: 'The minute hand points at the 6. How many minutes?',
    choices: ['30 minutes', '6 minutes', '60 minutes'],
    answer: 0,
    feedback: '6 × 5 = 30 minutes. The numbers count by FIVES for the minute hand.',
  },
  {
    title: 'Reading the time together',
    body:
      'Read hour first, then minutes: H:MM. 15 past is “quarter past”, ' +
      '30 past is “half past”.',
    q: 'Hour hand just past the 4, minute hand on the 6. The time is…',
    choices: ['4:30 (half past 4)', '6:20', '4:06'],
    answer: 0,
    feedback: '4:30. “6:20” swaps the hands; “4:06” reads the 6 as 6 minutes instead of 30.',
  },
  {
    title: 'The hour hand keeps moving',
    body:
      'The hour hand never jumps — it creeps. At half past, it is halfway ' +
      'to the next number.',
    fractionGuide: true,
    q: 'It is 3:45. Where is the hour hand?',
    choices: ['¾ of the way from 3 to 4', 'Exactly on the 3', 'Exactly on the 4'],
    answer: 0,
    feedback: '45/60 = ¾ of the way. It looks “4-ish”, but the hour is still 3.',
  },
  {
    title: 'Elapsed time',
    body:
      'The grey clock starts at 1:30; your dials set the end. Count ON: ' +
      'whole hours first, then minutes.',
    q: 'How much time passes from 1:30 to 4:15?',
    choices: ['2 hours 45 minutes', '3 hours 45 minutes', '2 hours 15 minutes'],
    answer: 0,
    feedback: '1:30 → 3:30 is 2 hours, then 3:30 → 4:15 is 45 more minutes.',
  },
  {
    title: 'Calibration challenge',
    body: 'Read the dashed grey hands, then set h and m to land right on top of them.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   MODEL — pure math, no pixels.
   Angles are measured in degrees CLOCKWISE from the 12 (straight up).
     minute hand:  m · 6°           (0 min → up, 15 min → 90° → the 3, …)
     hour   hand: (h%12 + m/60)·30°  ← the fractional position: the whole point.
   ------------------------------------------------------------------------- */
function minuteAngle(m) {
  return m * 6;
}
function hourAngle(h, m) {
  return ((h % 12) + m / 60) * 30;
}
/* The smaller angle between the two hands, 0…180° — the classic clock problem. */
function betweenAngle(h, m) {
  const d = Math.abs(hourAngle(h, m) - minuteAngle(m));
  return Math.min(d, 360 - d);
}

/* Number words 0…59, for reading the time aloud ("twenty-three minutes past…"). */
const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];
function numberWord(n) {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = n % 10;
  return o ? `${t}-${ONES[o]}` : t;
}
function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* Read a clock time as natural English. */
function readClock(h, m) {
  const hourW = numberWord(h);
  const nextH = h === 12 ? 1 : h + 1;
  const nextW = numberWord(nextH);
  if (m === 0) return cap(`${hourW} o’clock`);
  if (m === 15) return cap(`quarter past ${hourW}`);
  if (m === 30) return cap(`half past ${hourW}`);
  if (m === 45) return cap(`quarter to ${nextW}`);
  if (m < 30) return cap(`${numberWord(m)} ${m === 1 ? 'minute' : 'minutes'} past ${hourW}`);
  const to = 60 - m;
  return cap(`${numberWord(to)} ${to === 1 ? 'minute' : 'minutes'} to ${nextW}`);
}

/* 24-hour ("military") reading, given the a.m./p.m. period. */
function to24(h, m, period) {
  let h24;
  if (period === 'AM') h24 = h === 12 ? 0 : h;
  else h24 = h === 12 ? 12 : h + 12;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/* Digital H:MM. */
function digital(h, m) {
  return `${h}:${String(m).padStart(2, '0')}`;
}

/* Minutes past midnight-on-a-12-hour-face: 12:00 → 0, 1:30 → 90, … (0…719). */
function total12(h, m) {
  return (h % 12) * 60 + m;
}
/* Forward elapsed from a start to an end reading, wrapping at 12 h (0…719 min). */
function elapsedMinutes(start, end) {
  return (((total12(end.h, end.m) - total12(start.h, start.m)) % 720) + 720) % 720;
}
/* Convert a 12-hour minute count back to an H:MM label (12 for the 0 slot). */
function labelFromTotal(t) {
  t = ((t % 720) + 720) % 720;
  const hh = Math.floor(t / 60);
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(t % 60).padStart(2, '0')}`;
}

/* ---------------------------------------------------------------------------
   CALIBRATION. The match metric is the RMS of the two hand-angle errors — how
   far the minute hand is from the target's, and how far the hour hand is. It is
   0 exactly when both hands coincide. But CALIBRATED is gated on the EXACT
   integer match (h and m), so a visually-close-but-wrong reading never earns the
   stamp. Targets snap minutes to the nearest 5, matching "tell time to 5 min."
   ------------------------------------------------------------------------- */
function angDiff(a, b) {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}
function matchError(p, t) {
  const eMin = angDiff(minuteAngle(p.m), minuteAngle(t.m));
  const eHour = angDiff(hourAngle(p.h, p.m), hourAngle(t.h, t.m));
  return Math.sqrt((eMin * eMin + eHour * eHour) / 2);
}
const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + err / 30)));

function makeTarget(prev) {
  let t;
  do {
    const h = 1 + Math.floor(Math.random() * 12); // 1…12
    const m = 5 * Math.floor(Math.random() * 12); // 0,5,…,55
    t = { h, m };
  } while (
    (prev && t.h === prev.h && t.m === prev.m) ||
    (t.h === 12 && t.m === 0) // never the 12:00 the dials reset to
  );
  return t;
}

/* Trim a number to a tidy string with a proper minus sign. */
const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 100) / 100;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TimeLab() {
  const [h, setH] = useState(START.h);
  const [m, setM] = useState(START.m);
  const [period, setPeriod] = useState(START.period);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [showMinuteRing, setShowMinuteRing] = useState(false);
  const [running, setRunning] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const lineWrapRef = useRef(null);
  const lineCanvasRef = useRef(null);
  const sceneRef = useRef({});
  const hRef = useRef(h);
  const mRef = useRef(m);
  hRef.current = h;
  mRef.current = m;

  const current = STEPS[step];
  const params = { h, m };

  // Snapshot everything the renderer needs so draw() (a stable callback) never
  // reads stale values.
  sceneRef.current = {
    h,
    m,
    step,
    calib: !!current.calib,
    target,
    showMinuteRing,
    fractionGuide: !!current.fractionGuide,
  };

  const err = target ? matchError(params, target) : Infinity;
  const pct = target ? matchPercent(err) : 0;
  const calibrated = target ? h === target.h && m === target.m : false;

  const timeStr = digital(h, m);
  const words = readClock(h, m);
  const hA = hourAngle(h, m);
  const mA = minuteAngle(m);
  const between = betweenAngle(h, m);

  const elapsed = elapsedMinutes(ELAPSED_START, { h, m });
  const eH = Math.floor(elapsed / 60);
  const eM = elapsed % 60;

  /* ---- clock renderer: full redraw from state on every change ------------- */
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
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const cx = W / 2;
    const cy = H / 2;
    const Rf = Math.min(W, H) * 0.4; // face radius

    /* a clock hand/point at clock-angle deg (clockwise from 12) and length L */
    const pt = (deg, L) => [cx + L * Math.sin(deg * DEG), cy - L * Math.cos(deg * DEG)];

    /* faint quadrille paper behind the face (house texture, no numbered axes) */
    const grid = Math.max(18, Math.round(Rf / 6));
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = cx % grid; x <= W; x += grid) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, H);
    }
    for (let y = cy % grid; y <= H; y += grid) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(W, Math.round(y) + 0.5);
    }
    ctx.stroke();

    /* ---- clock face -------------------------------------------------------- */
    ctx.beginPath();
    ctx.arc(cx, cy, Rf, 0, Math.PI * 2);
    ctx.fillStyle = '#fdfefe';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(28,43,58,0.75)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, Rf * 0.94, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(28,43,58,0.18)';
    ctx.stroke();

    /* ---- minute/hour tick marks ------------------------------------------- */
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      const a = i * 6;
      const [x1, y1] = pt(a, Rf * (major ? 0.86 : 0.9));
      const [x2, y2] = pt(a, Rf * 0.96);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = major ? 'rgba(28,43,58,0.6)' : 'rgba(28,43,58,0.28)';
      ctx.lineWidth = major ? 2.4 : 1;
      ctx.stroke();
    }

    /* ---- hour numbers 1…12 ------------------------------------------------- */
    ctx.fillStyle = INK;
    ctx.font = `600 ${Math.round(Rf * 0.14)}px "Iowan Old Style", Palatino, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let n = 1; n <= 12; n++) {
      const [x, y] = pt(n * 30, Rf * 0.74);
      ctx.fillText(String(n), x, y);
    }

    /* ---- optional minute-number ring (05,10,…,55 + 00) -------------------- */
    if (S.showMinuteRing) {
      ctx.fillStyle = BLUE;
      ctx.font = `600 ${Math.round(Rf * 0.075)}px ui-monospace, "SF Mono", Menlo, monospace`;
      for (let n = 0; n < 12; n++) {
        const val = n * 5;
        const [x, y] = pt(n * 30, Rf * 1.08);
        ctx.fillText(String(val).padStart(2, '0'), x, y);
      }
    }

    /* ---- calibration target: the mystery time, dashed grey, drawn under ---- */
    if (S.calib && S.target) {
      const grey = 'rgba(91,107,123,0.85)';
      const drawGhost = (deg, L, w) => {
        const [x, y] = pt(deg, L);
        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.lineCap = 'round';
        ctx.lineWidth = w;
        ctx.strokeStyle = grey;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
      };
      drawGhost(hourAngle(S.target.h, S.target.m), Rf * 0.5, 5);
      drawGhost(minuteAngle(S.target.m), Rf * 0.8, 3);
    }

    /* ---- centrepiece: the hour hand's fractional position (S_MOVE step) ---- */
    if (S.fractionGuide) {
      const hourMark = (S.h % 12) * 30; // the number the hour just left
      const handA = hourAngle(S.h, S.m); // where the hand actually is
      const nextMark = hourMark + 30;
      const gr = Rf * 0.5;
      // faint full 30° gap from this hour to the next
      ctx.save();
      ctx.beginPath();
      const N = 24;
      for (let i = 0; i <= N; i++) {
        const [x, y] = pt(hourMark + (30 * i) / N, gr);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = 'rgba(28,43,58,0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();
      // little marks at the two neighbouring numbers
      [hourMark, nextMark].forEach((mk) => {
        const [x1, y1] = pt(mk, gr - Rf * 0.05);
        const [x2, y2] = pt(mk, gr + Rf * 0.05);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(28,43,58,0.45)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      });
      // the filled carmine wedge = the fraction m/60 of the way
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const M = 24;
      for (let i = 0; i <= M; i++) {
        const [x, y] = pt(hourMark + ((handA - hourMark) * i) / M, gr);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(200,30,79,0.16)';
      ctx.fill();
      ctx.restore();
      // fraction label
      const [lx, ly] = pt(hourMark + (handA - hourMark) / 2, gr + Rf * 0.16);
      const frac = `${S.m}/60`;
      ctx.save();
      ctx.font = `700 ${Math.round(Rf * 0.075)}px ui-monospace, "SF Mono", Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(frac).width;
      ctx.fillStyle = 'rgba(251,251,248,0.9)';
      ctx.fillRect(lx - tw / 2 - 4, ly - 9, tw + 8, 18);
      ctx.fillStyle = CARMINE;
      ctx.fillText(frac, lx, ly);
      ctx.restore();
    }

    /* ---- the two hands (the mathematical object) -------------------------- */
    // focus logic: on an isolate step the other hand fades to neutral grey
    const hourColor = S.step === S_MIN ? FADE : CARMINE;
    const minColor = S.step === S_HOUR ? FADE : BLUE;

    const drawHand = (deg, L, w, color, tail) => {
      const [tx, ty] = pt(deg, L);
      const [bx, by] = pt(deg + 180, tail); // small counterweight tail
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = w;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.restore();
    };

    // minute hand: long + thin; hour hand: short + thick. Draw minute first so
    // the hour hand's hub sits on top.
    drawHand(minuteAngle(S.m), Rf * 0.82, 4.5, minColor, Rf * 0.12);
    drawHand(hourAngle(S.h, S.m), Rf * 0.52, 7, hourColor, Rf * 0.1);

    /* centre hub */
    ctx.beginPath();
    ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }, []);

  /* ---- elapsed-time count-on number line (its own inset canvas) ----------- */
  const drawElapsedLine = useCallback(() => {
    const wrap = lineWrapRef.current;
    const canvas = lineCanvasRef.current;
    if (!wrap || !canvas) return;
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const startT = total12(ELAPSED_START.h, ELAPSED_START.m);
    const total = elapsedMinutes(ELAPSED_START, { h: hRef.current, m: mRef.current });
    const wholeH = Math.floor(total / 60);
    const remM = total % 60;

    const padL = 46;
    const padR = 46;
    const baseY = H - 40;
    const x0 = padL;
    const x1 = W - padR;
    const span = Math.max(total, 1);
    const X = (offset) => x0 + ((x1 - x0) * offset) / span;

    // baseline
    ctx.strokeStyle = 'rgba(28,43,58,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x0 - 10, baseY);
    ctx.lineTo(x1 + 10, baseY);
    ctx.stroke();

    if (total === 0) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = '13px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('End time = start time → 0 minutes elapsed', W / 2, baseY - 26);
    }

    // landmark offsets: 0, 60, 120, …, wholeH·60, then +remM to the end
    const marks = [];
    for (let k = 0; k <= wholeH; k++) marks.push(k * 60);
    if (remM > 0 || total === 0) marks.push(total);

    // hops (semicircle arcs) between consecutive landmarks
    const arc = (xa, xb, color, label) => {
      const r = (xb - xa) / 2;
      const mid = (xa + xb) / 2;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(mid, baseY, r, Math.PI, 0);
      ctx.stroke();
      // arrowhead at xb
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(xb, baseY);
      ctx.lineTo(xb - 7, baseY - 6);
      ctx.lineTo(xb - 1, baseY - 9);
      ctx.closePath();
      ctx.fill();
      // label above the arc
      ctx.fillStyle = color;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, mid, baseY - r - 5);
      ctx.restore();
    };
    for (let i = 0; i < marks.length - 1; i++) {
      const isMinuteHop = i === marks.length - 2 && remM > 0;
      arc(
        X(marks[i]),
        X(marks[i + 1]),
        isMinuteHop ? BLUE : CARMINE,
        isMinuteHop ? `+${remM} min` : '+1 hr'
      );
    }

    // landmark ticks + clock-time labels
    ctx.textAlign = 'center';
    marks.forEach((off, i) => {
      const x = X(off);
      ctx.beginPath();
      ctx.moveTo(x, baseY - 5);
      ctx.lineTo(x, baseY + 5);
      ctx.strokeStyle = 'rgba(28,43,58,0.7)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = i === 0 ? INK_SOFT : i === marks.length - 1 ? CARMINE : INK;
      ctx.font = `${i === 0 || i === marks.length - 1 ? '700' : '500'} 12px ui-monospace, "SF Mono", Menlo, monospace`;
      ctx.textBaseline = 'top';
      ctx.fillText(labelFromTotal(startT + off), x, baseY + 9);
    });

    // endpoint captions
    ctx.fillStyle = INK_SOFT;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillText('start', X(0), baseY - 4);
    ctx.textAlign = 'right';
    ctx.fillText('end', X(total), baseY - 4);
  }, []);

  /* redraw the clock whenever anything visible changes */
  useEffect(() => {
    draw();
  }, [h, m, step, target, showMinuteRing, draw]);

  /* redraw the elapsed inset when it is visible */
  useEffect(() => {
    if (step === S_ELAPSED) drawElapsedLine();
  }, [h, m, step, drawElapsedLine]);

  /* redraw on resize (both canvases are fluid) */
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      draw();
      if (sceneRef.current.step === S_ELAPSED) drawElapsedLine();
    });
    if (stageRef.current) ro.observe(stageRef.current);
    if (lineWrapRef.current) ro.observe(lineWrapRef.current);
    return () => ro.disconnect();
  }, [draw, drawElapsedLine]);

  /* hand a target to the calibration step the first time we reach it, and reset
     the dials to 12:00 so it starts un-matched */
  useEffect(() => {
    if (current.calib) {
      if (!target) setTarget(makeTarget(null));
      setH(12);
      setM(0);
      setRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the minute-number ring auto-reveals on the minute step */
  useEffect(() => {
    if (STEPS[step] && STEPS[step].showMinuteRing) setShowMinuteRing(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the elapsed step sets its clean scenario on entry (start fixed, end = dials) */
  useEffect(() => {
    if (step === S_ELAPSED) {
      setH(ELAPSED_END.h);
      setM(ELAPSED_END.m);
      setRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* "Run the clock" — time-based, opt-in, respects reduced motion. Advances the
     minute (and rolls the hour over) so students SEE the minute hand lap while
     the hour hand creeps. Pauses on any dial move or step change. */
  useEffect(() => {
    if (!running) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setRunning(false);
      return;
    }
    let raf;
    let last = null;
    let acc = 0;
    const MS_PER_MIN = 55; // one clock-minute every 55 ms → an hour in ~3.3 s
    const loop = (now) => {
      if (last == null) last = now;
      acc += now - last;
      last = now;
      while (acc >= MS_PER_MIN) {
        acc -= MS_PER_MIN;
        let nm = mRef.current + 1;
        let nh = hRef.current;
        if (nm >= 60) {
          nm = 0;
          nh = (nh % 12) + 1;
        }
        mRef.current = nm;
        hRef.current = nh;
        setM(nm);
        setH(nh);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'h') setH(v);
    else setM(v);
    if (running) setRunning(false); // a dial move stops the clock
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };

  const resetDials = () => {
    setH(START.h);
    setM(START.m);
    setRunning(false);
  };

  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  return (
    <div className="tlab">
      <header className="head">
        <h1>Telling Time</h1>
        <p className="lede">
          A clock is two hands turning around a 12-hour dial. Each dial unlocks with the lesson, so
          you meet one idea at a time — the hour hand, the minute hand, how to read them together,
          and the idea most people miss: the{' '}
          <span className="mono">hour hand keeps moving</span> all through the hour. Then measure
          elapsed time and calibrate your clock onto a mystery time.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <span className="eq">
                <span className="h">{h}</span>
                <span className="colon">:</span>
                <span className="m">{String(m).padStart(2, '0')}</span>
              </span>
              <span className="seg" role="group" aria-label="a.m. or p.m.">
                {['AM', 'PM'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={'seg-btn' + (period === p ? ' on' : '')}
                    aria-pressed={period === p}
                    onClick={() => setPeriod(p)}
                  >
                    {p}
                  </button>
                ))}
              </span>
              <span className="chip">{words}</span>
            </p>
            <p className="equation-sub mono">
              24-hour: {to24(h, m, period)} &nbsp;·&nbsp; minute hand {trim(mA)}° &nbsp;·&nbsp; hour
              hand {trim(hA)}°
            </p>
          </div>

          <div className="stage" ref={stageRef}>
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={`Analog clock showing ${timeStr}, ${words}`}
            />
            <span className="hint mono">short hand = hour · long hand = minute</span>
          </div>

          {/* elapsed-time count-on inset, only on that step */}
          {step === S_ELAPSED && (
            <div className="elapsed">
              <div className="elapsed-read mono">
                <span className="ghost-clock" aria-hidden="true">
                  ◷ start 1:30
                </span>
                <span>
                  elapsed 1:30 → {timeStr} ={' '}
                  <b>
                    {eH} h {eM} min
                  </b>
                </span>
              </div>
              <div className="linewrap" ref={lineWrapRef}>
                <canvas ref={lineCanvasRef} aria-hidden="true" />
              </div>
            </div>
          )}

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Time</span>
              <span className="fact-v mono">{timeStr}</span>
            </div>
            <div className="fact">
              <span className="fact-k">In words</span>
              <span className="fact-v mono">{words}</span>
            </div>
            <div className="fact">
              <span className="fact-k">24-hour</span>
              <span className="fact-v mono">{to24(h, m, period)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Minute-hand angle</span>
              <span className="fact-v mono">{trim(mA)}°</span>
            </div>
            <div className="fact">
              <span className="fact-k">Hour-hand angle</span>
              <span className="fact-v mono">{trim(hA)}°</span>
            </div>
            <div className="fact">
              <span className="fact-k">Angle between hands</span>
              <span className="fact-v mono">{trim(between)}°</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (running ? ' on' : '')}
              onClick={() => setRunning((r) => !r)}
            >
              {running ? 'Running…' : 'Run the clock'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showMinuteRing ? ' on' : '')}
              onClick={() => setShowMinuteRing((s) => !s)}
            >
              {showMinuteRing ? 'Minute ring shown' : 'Show minute ring'}
            </button>
            <button type="button" className="btn ghost" onClick={resetDials}>
              Reset dials
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
              const val = { h, m }[d.key];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.label}</span>
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
                  <output className="dv">{unlocked ? `${val}${d.unit}` : '🔒'}</output>
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

          {current.calib && target && (
            <div className="calib">
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">set the hands to the grey time</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={() => setTarget(makeTarget(target))}>
                New target
              </button>
              <span className="sr-live" aria-live="polite">
                {calibrated ? 'Calibrated. The clock matches the target time.' : ''}
              </span>
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
                  setRunning(false);
                  setShowMinuteRing(false);
                  resetDials();
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">minute hand = m·6° &nbsp; hour hand = (h + m/60)·30°</span>{' '}
        &nbsp;·&nbsp; the hour hand moves the fraction m/60 from one number to the next, which is why
        3:30 puts it halfway between 3 and 4.
      </footer>

      <style jsx>{`
        .tlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #2d5f8c;
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
          margin: 0;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        .eq {
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .eq .h {
          color: var(--curve);
        }
        .eq .m {
          color: var(--blue);
        }
        .eq .colon {
          color: var(--ink-soft);
          margin: 0 1px;
        }
        .seg {
          display: inline-flex;
          border: 1px solid rgba(28, 43, 58, 0.22);
          border-radius: 7px;
          overflow: hidden;
        }
        .seg-btn {
          font: 600 11px/1 var(--mono);
          letter-spacing: 0.05em;
          min-width: 44px;
          min-height: 44px;
          padding: 8px 10px;
          border: none;
          background: transparent;
          color: var(--ink-soft);
          cursor: pointer;
        }
        .seg-btn.on {
          background: var(--ink);
          color: #fff;
        }
        .chip {
          font: 600 12px/1 var(--serif);
          font-style: italic;
          color: var(--ink-soft);
          background: rgba(28, 43, 58, 0.06);
          border: 1px solid rgba(28, 43, 58, 0.16);
          border-radius: 999px;
          padding: 5px 11px;
        }
        .stage {
          position: relative;
          width: min(100%, 540px);
          aspect-ratio: 1 / 1;
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
          background: rgba(251, 251, 248, 0.96);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .elapsed {
          margin: 12px auto 0;
          width: min(100%, 540px);
        }
        .elapsed-read {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          font-size: 13px;
          color: var(--ink);
          margin-bottom: 4px;
        }
        .elapsed-read b {
          color: var(--curve);
        }
        .ghost-clock {
          color: var(--ink-soft);
        }
        .linewrap {
          position: relative;
          width: 100%;
          height: 132px;
          border: 1px dashed var(--quad);
          border-radius: 8px;
          background: #fcfdfd;
        }
        .linewrap canvas {
          display: block;
          width: 100%;
          height: 100%;
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
          grid-template-columns: 22px 1fr 52px;
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
          font-size: 13.5px;
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
        .sr-live {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
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
        :global(.tlab) :focus-visible {
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
        }
      `}</style>
    </div>
  );
}
