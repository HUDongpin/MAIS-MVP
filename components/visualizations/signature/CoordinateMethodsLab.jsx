'use client';

/* ============================================================================
   CoordinateMethodsLab — an interactive "bench" for what COORDINATES let you
   COMPUTE about a figure you can only see: where a point sits when it cuts a
   segment in a given ratio, and how much fence and how much floor a polygon has
   once its corners are numbers.

        P = A + (m/(m+n))·(B − A)      the point that cuts AB in the ratio m:n
        |AB|² = (Δx)² + (Δy)²          each side, squared — always a whole number
        2·Area = |Σ (xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)|   the shoelace sum — exact, in halves

   Built for MAIS (math AI system, www.mais.ac), K-12.  GRADES 9–10 —
   CCSS G-GPE.B.6 (find the point on a directed line segment that partitions it
   in a given ratio) and G-GPE.B.7 (use coordinates to compute perimeters of
   polygons and areas of triangles and rectangles).

   ---------------------------------------------------------------------------
   HOW THIS LAB STAYS DISTINCT  (the library's hard rule)
   ---------------------------------------------------------------------------
     • DistanceLab   — owns the DISTANCE FORMULA itself, derived from Pythagoras
                       on a right triangle.  This bench CITES it and never
                       re-derives it; a side length is a tool here, not a topic.
     • PointLab      — owns what a coordinate pair IS (an address on the plane).
     • AreaLab / RectangleLab — own area as a COUNT OF UNIT SQUARES.  This bench
                       must never fall back on counting squares: its whole claim
                       is that the shoelace sum gets an area a tilted figure will
                       not let you count.  The audit greps the counting picture
                       out.
     • RatioLab      — owns ratio as a batch tape.  Here a ratio is a POSITION
                       along a segment, which is the one job that tape cannot do.
     • MidpointLab   — does not exist; the midpoint is the 1:1 case of this
                       bench's own partition, and is shown as such.

   EXACT ARITHMETIC.  Corners are lattice points, so every squared side length
   is a whole number and the shoelace sum is a whole number — the area is
   therefore EXACT IN HALVES and is printed as "17/2", never "8.5".  The
   partition point is held as a pair of REDUCED FRACTIONS.  The perimeter is the
   one rounded readout on the bench (a sum of square roots is irrational in
   general) and is labelled as an approximation, with the exact squared sides
   printed beside it.  The CALIBRATED stamp is an exact rational equality.

   The block between MODEL:START and MODEL:END is pure, React-free JavaScript;
   audit-coordinatemethods.mjs slices it out and evaluates it, so the audit
   tests the code that ships.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==== MODEL:START — pure math. No React, no pixels, no DOM. =============== */

const LIM = 9;                       // the lattice runs −9..9 in both directions
const RATIO_MAX = 6;                 // m and n each run 1..6

const gcdI = (a, b) => (b ? gcdI(b, Math.abs(a % b)) : Math.abs(a));

/* an exact reduced fraction with a positive denominator */
function frac(n, d) {
  if (d === 0) return null;
  const s = d < 0 ? -1 : 1;
  const nn = n * s, dd = d * s;
  const g = gcdI(nn, dd) || 1;
  return { n: nn / g, d: dd / g };
}
function fracString(f) {
  if (f == null) return '—';
  return f.d === 1 ? String(f.n) : `${f.n}/${f.d}`;
}
const fracIsInt = (f) => f != null && f.d === 1;
const fracValue = (f) => (f == null ? NaN : f.n / f.d);

/* G-GPE.6 — the point that cuts the DIRECTED segment A→B in the ratio m:n.
   P = A + (m/(m+n))·(B − A), held as exact fractions. The direction matters:
   m:n from A is not the same point as m:n from B unless m = n. */
function partition(A, B, m, n) {
  const t = m + n;
  if (t === 0) return null;
  return {
    x: frac(A.x * n + B.x * m, t),
    y: frac(A.y * n + B.y * m, t),
    t: frac(m, t),
  };
}
/* the midpoint is exactly the 1:1 case — the bench shows it as such rather
   than as a separate formula to memorise */
const midpoint = (A, B) => partition(A, B, 1, 1);

/* G-GPE.7 — each side, squared. A whole number on the lattice, because it is
   (Δx)² + (Δy)². DistanceLab owns WHY; this bench only uses it. */
const sideSq = (P, Q) => (P.x - Q.x) * (P.x - Q.x) + (P.y - Q.y) * (P.y - Q.y);

/* the perimeter — the one irrational readout. Returned with the exact squared
   sides beside it so the approximation is never mistaken for the fact. */
function perimeter(pts) {
  const squares = [];
  for (let i = 0; i < pts.length; i++) squares.push(sideSq(pts[i], pts[(i + 1) % pts.length]));
  const approx = squares.reduce((s, q) => s + Math.sqrt(q), 0);
  const exactSides = squares.every((q) => Number.isInteger(Math.sqrt(q)));
  return { squares, approx, exactSides };
}

/* G-GPE.7 — the shoelace sum, doubled so it stays a whole number. The area is
   this over 2, which is why an area on the lattice is always exact in halves.
   Works on a tilted figure, where counting unit squares does not. */
function shoelaceDoubled(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s);
}
const areaFrac = (pts) => frac(shoelaceDoubled(pts), 2);
/* a degenerate figure — all corners on one line — has zero area */
const isDegenerate = (pts) => shoelaceDoubled(pts) === 0;

/* ---- parameters ---------------------------------------------------------
   The two endpoints of the segment are the object; the ratio dials cut it.
   The third corner turns the segment into a triangle for the area steps. */
const DIALS = [
  { key: 'm', label: 'm — parts from A', min: 1, max: RATIO_MAX, step: 1 },
  { key: 'n', label: 'n — parts to B', min: 1, max: RATIO_MAX, step: 1 },
];
const A0 = { x: -6, y: -3 }, B0 = { x: 6, y: 5 }, C0 = { x: -3, y: 6 };
const START = { m: 1, n: 1 };

/* ---- calibration --------------------------------------------------------
   "The surveyor's stamp." A point on the segment is posted; find the ratio m:n
   that lands on it. Targets are generated from a ratio that actually divides
   the segment into lattice-friendly parts, so the goal is always reachable, and
   the stamp is an exact rational equality — never a distance tolerance. */
function makeTarget(prev, rnd) {
  const rand = rnd || Math.random;
  const pick = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  let t = null, guard = 0;
  while (guard < 999) {
    guard += 1;
    const m = pick(1, RATIO_MAX), n = pick(1, RATIO_MAX);
    if (gcdI(m, n) !== 1) continue;          // only ratios in lowest terms are posed
    if (m === n && m !== 1) continue;
    const P = partition(A0, B0, m, n);
    if (!P) continue;
    if (prev && prev.m === m && prev.n === n) continue;
    t = { m, n, P };
    break;
  }
  return t || { m: 1, n: 2, P: partition(A0, B0, 1, 2) };
}
/* exact rational equality on both coordinates */
function isCalibrated(m, n, target) {
  if (!target) return false;
  const P = partition(A0, B0, m, n);
  if (!P || !target.P) return false;
  return P.x.n === target.P.x.n && P.x.d === target.P.x.d
    && P.y.n === target.P.y.n && P.y.d === target.P.y.d;
}
/* the meter reads how far the current cut sits from the posted one, along the
   segment — an exact rational comparison turned into a percentage for display */
function matchPercent(m, n, target) {
  if (!target) return 0;
  const P = partition(A0, B0, m, n);
  if (!P || !target.P) return 0;
  const gap = Math.abs(fracValue(P.t) - fracValue(target.P.t));
  return Math.max(0, Math.min(100, 100 * (1 - gap / 0.6)));
}

/* ---- the lesson ---------------------------------------------------------- */
const STEPS = [
  {
    title: 'Halfway is the easy case',
    focus: 'midpoint',
    unlock: 0,
    body:
      'Cut the segment A→B exactly in half and the answer is the average of the two addresses: ' +
      'add the x’s and halve, add the y’s and halve. Nothing to memorise — the midpoint is just the ' +
      'ratio 1 : 1, and every other ratio works the same way.',
    q: 'Why is the midpoint the AVERAGE of the two endpoints?',
    choices: [
      'Going halfway means adding half the whole change to A — which is the average',
      'Because both coordinates are whole numbers',
      'It is a separate formula that has to be memorised',
    ],
    answer: 0,
    feedback:
      'P = A + ½(B − A) = ½A + ½B, the average. Seeing the midpoint as the 1 : 1 case means you never ' +
      'need a second formula — you need the one below, with m = n = 1.',
  },
  {
    title: 'Any ratio, same move',
    focus: 'partition',
    unlock: 2,
    body:
      'Now cut it anywhere. “m : n from A” means the segment is m + n equal parts and you walk m of ' +
      'them: P = A + (m/(m+n))·(B − A). Move the dials and read the exact coordinates — they are ' +
      'fractions, and the bench keeps them as fractions.',
    q: 'You want the point 2 : 1 from A. How far along the segment is it?',
    choices: [
      'Two thirds — m/(m+n) = 2/3 of the way from A to B',
      'Half — the ratio only says which side',
      'Twice as far as B, i.e. past the end',
    ],
    answer: 0,
    feedback:
      'The ratio names PARTS, not distances: 2 : 1 makes three parts and you take two, so P sits 2/3 ' +
      'of the way. That is why the fraction is m/(m+n) and not m/n — a mix-up that lands the point ' +
      'outside the segment.',
  },
  {
    title: 'Direction matters',
    focus: 'directed',
    unlock: 2,
    body:
      'The segment is DIRECTED: A→B, not just “the segment”. Cutting 1 : 2 from A is not the same ' +
      'point as cutting 1 : 2 from B — unless the ratio is 1 : 1. The bench marks A with a filled ' +
      'dot so you always know which end you are counting from.',
    q: 'When do “m : n from A” and “m : n from B” land on the SAME point?',
    choices: [
      'Only when m = n — the midpoint is the one point both ends agree on',
      'Always — a ratio has no direction',
      'Never — the two ends never agree',
    ],
    answer: 0,
    feedback:
      'From A you are m/(m+n) along; from B you are n/(m+n) along. Those agree exactly when m = n. ' +
      'Every other ratio gives two different points, which is why the standard says a DIRECTED segment.',
  },
  {
    title: 'Fence and floor',
    focus: 'polygon',
    unlock: 2,
    body:
      'Add a third corner and you have a triangle. Its PERIMETER is a sum of side lengths — each side ' +
      'squared is a whole number, but the lengths themselves usually are not, so the total is the one ' +
      'approximate number here. Its AREA is not approximate at all.',
    q: 'The sides squared are whole numbers. Why is the perimeter still approximate?',
    choices: [
      'Because a length is a square root, and √ of a whole number is usually irrational',
      'Because the corners are not whole numbers',
      'It is not approximate — the bench is being cautious',
    ],
    answer: 0,
    feedback:
      'Squared lengths stay whole; the lengths themselves are √13, √25, √20 and so on, and only the ' +
      'perfect squares come out whole. The bench prints the exact squares beside the rounded total so ' +
      'you can always see which number is the fact.',
  },
  {
    title: 'The shoelace: area without counting',
    focus: 'area',
    unlock: 2,
    body:
      'A tilted triangle cannot be measured by counting unit squares — no whole square fits. But the ' +
      'corners are numbers, and the SHOELACE SUM turns them straight into twice the area: multiply ' +
      'across the pairs, subtract back, take the size. The area is exact, in halves.',
    q: 'Why is a lattice polygon’s area always a whole number of halves?',
    choices: [
      'The shoelace sum is a whole number, and the area is that sum ÷ 2',
      'Because areas are always whole numbers',
      'It is a coincidence of this particular triangle',
    ],
    answer: 0,
    feedback:
      'Every term xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ is a product of integers, so the whole sum is an integer — and the ' +
      'area is half of it. That is why the readout says 17/2 and not 8.5: the fraction is the exact ' +
      'answer, and the decimal is a rounding of it.',
  },
  {
    title: 'The surveyor’s stamp',
    focus: 'calib',
    unlock: 2,
    body:
      'Last challenge. A point on the segment is posted. Find the ratio m : n from A that lands on it ' +
      'exactly. The stamp compares fractions, not distances — close does not count. Press New target ' +
      'for another.',
    calib: true,
  },
];

/* ==== MODEL:END ========================================================== */

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function CoordinateMethodsLab() {
  const [vals, setVals] = useState(START);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const focus = current.focus;
  const { m, n } = vals;

  const P = partition(A0, B0, m, n);
  const tri = [A0, B0, C0];
  const per = perimeter(tri);
  const area = areaFrac(tri);

  sceneRef.current = { m, n, focus, target };

  const calibrated = current.calib && target ? isCalibrated(m, n, target) : false;
  const pct = current.calib && target ? matchPercent(m, n, target) : 0;

  /* ---- the renderer ------------------------------------------------------ */
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
    const INK = '#1c2b3a', SOFT = '#5b6b7b', CARM = '#c81e4f', BLUE = '#3a6ea5';
    const GOLD = '#b8860b', OK = '#1f8a5b', QUAD = '#c7d8e4';

    const pad = 22;
    const size = Math.min(W, H) - pad * 2;
    const ox = W / 2, oy = H / 2;
    const u = size / (2 * LIM);
    const px = (x) => ox + x * u;
    const py = (y) => oy - y * u;

    ctx.lineWidth = 1; ctx.strokeStyle = QUAD;
    for (let g = -LIM; g <= LIM; g++) {
      ctx.globalAlpha = g === 0 ? 0 : 0.5;
      ctx.beginPath(); ctx.moveTo(px(g), py(-LIM)); ctx.lineTo(px(g), py(LIM)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px(-LIM), py(g)); ctx.lineTo(px(LIM), py(g)); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(28,43,58,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px(-LIM), py(0)); ctx.lineTo(px(LIM), py(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px(0), py(-LIM)); ctx.lineTo(px(0), py(LIM)); ctx.stroke();

    const dot = (p, color, r) => {
      ctx.fillStyle = color; ctx.beginPath();
      ctx.arc(px(p.x), py(p.y), r || 6, 0, Math.PI * 2); ctx.fill();
    };
    const tag = (p, text, color, dx, dy) => {
      ctx.fillStyle = color; ctx.font = '600 13px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(text, px(p.x) + (dx == null ? 10 : dx), py(p.y) + (dy == null ? -13 : dy));
    };

    const F = S.focus;

    // the triangle, for the perimeter / area steps
    if (F === 'polygon' || F === 'area') {
      ctx.fillStyle = 'rgba(184,134,11,0.16)';
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px(A0.x), py(A0.y));
      ctx.lineTo(px(B0.x), py(B0.y));
      ctx.lineTo(px(C0.x), py(C0.y));
      ctx.closePath(); ctx.fill(); ctx.stroke();
      dot(C0, GOLD, 6); tag(C0, `C(${C0.x}, ${C0.y})`, GOLD);
      if (F === 'polygon') {
        const pts = [A0, B0, C0];
        for (let i = 0; i < 3; i++) {
          const a = pts[i], b = pts[(i + 1) % 3];
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          ctx.fillStyle = GOLD; ctx.font = '600 11px ui-monospace, Menlo, monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`${sideSq(a, b)}`, px(mx), py(my));
        }
      }
    }

    // the segment A→B, always
    ctx.strokeStyle = CARM; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(px(A0.x), py(A0.y)); ctx.lineTo(px(B0.x), py(B0.y)); ctx.stroke();
    // the arrowhead marks the direction A→B
    {
      const x1 = px(A0.x), y1 = py(A0.y), x2 = px(B0.x), y2 = py(B0.y);
      const a = Math.atan2(y2 - y1, x2 - x1), hl = 11;
      ctx.fillStyle = CARM; ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - hl * Math.cos(a - 0.4), y2 - hl * Math.sin(a - 0.4));
      ctx.lineTo(x2 - hl * Math.cos(a + 0.4), y2 - hl * Math.sin(a + 0.4));
      ctx.closePath(); ctx.fill();
    }
    dot(A0, CARM, 7); tag(A0, `A(${A0.x}, ${A0.y})`, CARM, 10, 16);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(px(B0.x), py(B0.y), 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = CARM; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(px(B0.x), py(B0.y), 5, 0, Math.PI * 2); ctx.stroke();
    tag(B0, `B(${B0.x}, ${B0.y})`, CARM);

    // the m:n tick marks along the segment — the parts you are counting
    if (F === 'partition' || F === 'directed' || F === 'calib' || F === 'midpoint') {
      const parts = F === 'midpoint' ? 2 : S.m + S.n;
      for (let k = 1; k < parts; k++) {
        const t = k / parts;
        const qx = A0.x + t * (B0.x - A0.x), qy = A0.y + t * (B0.y - A0.y);
        ctx.fillStyle = 'rgba(58,110,165,0.85)';
        ctx.beginPath(); ctx.arc(px(qx), py(qy), 3.2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // the calibration target, behind the live point
    if (F === 'calib' && S.target && S.target.P) {
      const tp = { x: fracValue(S.target.P.x), y: fracValue(S.target.P.y) };
      ctx.strokeStyle = OK; ctx.lineWidth = 2.5;
      ctx.save(); ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(px(tp.x), py(tp.y), 13, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // the partition point itself
    if (F !== 'polygon' && F !== 'area' && P) {
      const pp = { x: fracValue(P.x), y: fracValue(P.y) };
      dot(pp, BLUE, 7);
      const lbl = F === 'midpoint' ? 'M' : 'P';
      tag(pp, `${lbl}(${fracString(P.x)}, ${fracString(P.y)})`, BLUE, 12, 14);
    }

    // the "from B" ghost, only where direction is the lesson
    if (F === 'directed') {
      const Q = partition(B0, A0, S.m, S.n);
      if (Q) {
        const qp = { x: fracValue(Q.x), y: fracValue(Q.y) };
        ctx.fillStyle = SOFT;
        ctx.beginPath(); ctx.arc(px(qp.x), py(qp.y), 6, 0, Math.PI * 2); ctx.fill();
        tag(qp, `same ratio from B`, SOFT, 12, 16);
      }
    }
    void INK;
  }, []);

  useEffect(() => { draw(); }, [vals, step, target, focus, draw]);
  useEffect(() => {
    const st = stageRef.current;
    if (!st || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(st);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (current.calib && !target) { setTarget(makeTarget(null)); setVals({ m: 1, n: 1 }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (focus === 'midpoint') setVals({ m: 1, n: 1 });
    if (focus === 'partition') setVals({ m: 2, n: 1 });
    if (focus === 'directed') setVals({ m: 1, n: 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const setDial = (key, v) => setVals((p) => ({ ...p, [key]: parseInt(v, 10) }));
  const choose = (i) => { if (answers[step] == null) setAnswers((p) => ({ ...p, [step]: i })); };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const answered = answers[step] != null;
  const canNext = step < STEPS.length - 1 && (!current.q || answered);

  const spoken = (() => {
    if (focus === 'calib' && target)
      return `Find the ratio that lands on the posted point. You are at ${m} to ${n}.`;
    if (focus === 'area') return `The triangle's area is exactly ${fracString(area)} square units.`;
    if (P) return `The point cutting A to B in ratio ${m} to ${n} is ${fracString(P.x)}, ${fracString(P.y)}.`;
    return 'A directed segment on the lattice.';
  })();

  return (
    <div className="cmlab">
      <header className="head">
        <h1>Coordinate Methods</h1>
        <p className="lede">
          Once the corners are <strong>numbers</strong>, the figure answers questions you cannot see:
          where a point sits when it cuts a segment in a ratio, and how much fence and floor a tilted
          polygon has. The area is <em>exact</em> — no counting squares, because no square fits.
        </p>
      </header>

      <div className="bench">
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef}>
            <canvas ref={canvasRef} aria-label={`A directed segment on a coordinate lattice. ${spoken}`} role="img" />
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>
          <div className="readout" role="group" aria-label="Exact readouts">
            <div className="cell">
              <span className="k">P — exact</span>
              <span className="v">({fracString(P?.x)}, {fracString(P?.y)})</span>
            </div>
            <div className="cell">
              <span className="k">along AB</span>
              <span className="v">{fracString(P?.t)}</span>
            </div>
            <div className="cell">
              <span className="k">lattice point?</span>
              <span className={'v ' + (P && fracIsInt(P.x) && fracIsInt(P.y) ? 'ok' : '')}>
                {P && fracIsInt(P.x) && fracIsInt(P.y) ? 'yes' : 'no — a fraction'}
              </span>
            </div>
            <div className="cell">
              <span className="k">2 × area</span>
              <span className="v">{shoelaceDoubled(tri)}</span>
            </div>
            {(focus === 'polygon' || focus === 'area') && (
              <div className="cell wide">
                <span className="k">sides² (exact) · perimeter (rounded) · area (exact)</span>
                <span className="v">
                  {per.squares.join(' , ')} · ≈ {per.approx.toFixed(3)} ·{' '}
                  <em className="ok">{fracString(area)}</em> square units
                  {isDegenerate(tri) ? ' — degenerate' : ''}
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
              <output className="dv">{vals[d.key]}</output>
            </label>
          ))}

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
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
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
                Land on <span className="mono goal">({fracString(target.P.x)}, {fracString(target.P.y)})</span>{' '}
                by choosing the ratio from A.
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {m} : {n} → ({fracString(P?.x)}, {fracString(P?.y)})
                </span>
                {calibrated
                  ? <span className="stamp">CALIBRATED</span>
                  : <span className="mono hint">not this cut</span>}
              </div>
              <button type="button" className="btn ghost"
                onClick={() => { setTarget(makeTarget(target)); setVals({ m: 1, n: 1 }); }}>
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
                setStep(0); setAnswers({}); setTarget(null); setVals(START);
              }}>Restart lab</button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">P = A + m/(m+n)·(B−A) · |AB|² = Δx² + Δy² · 2·Area = |Σ xᵢyᵢ₊₁ − xᵢ₊₁yᵢ|</span>
        &nbsp;·&nbsp; exact on the lattice, drawn live on a dependency-free canvas.
      </footer>

      <style jsx>{`
        .cmlab{
          --page:#eff1ee;--paper:#fbfbf8;--ink:#1c2b3a;--ink-soft:#5b6b7b;
          --curve:#c81e4f;--quad:#c7d8e4;--ok:#1f8a5b;--blue:#3a6ea5;--gold:#b8860b;
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
        .stage{position:relative;width:100%;aspect-ratio:1/1;border:1px solid var(--quad);border-radius:8px;overflow:hidden;
          background:radial-gradient(120% 120% at 30% 18%,#fdfefe 0%,#eef3f7 60%,#e3ebf1 100%);}
        .stage canvas{display:block;width:100%;height:100%;}
        .readout{margin:12px 2px 2px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
        .cell{background:var(--paper);border:1px solid rgba(28,43,58,.14);border-radius:8px;padding:8px 10px;display:grid;gap:2px;}
        .cell.wide{grid-column:1/-1;}
        .cell .k{font-size:11px;letter-spacing:.06em;color:var(--ink-soft);font-family:var(--mono);}
        .cell .v{font-family:var(--mono);font-weight:700;font-size:15px;}
        .cell .v.ok,.cell .ok{color:var(--ok);font-style:normal;}
        @media (max-width:700px){.readout{grid-template-columns:repeat(2,1fr);}}
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
        .dial{display:grid;grid-template-columns:1fr 52px;grid-template-rows:auto auto;align-items:center;gap:2px 10px;margin-bottom:12px;}
        .drole{grid-column:1/3;font-size:12px;color:var(--ink-soft);}
        .dial input[type=range]{grid-column:1;width:100%;accent-color:var(--ink);cursor:pointer;}
        .dv{grid-column:2;font-family:var(--mono);text-align:right;font-size:17px;font-weight:700;}
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
        :global(.cmlab) :focus-visible{outline:2px solid var(--ink);outline-offset:2px;border-radius:4px;}
        @media (prefers-reduced-motion:reduce){.btn,.choice,.meter-fill{transition:none;}}
      `}</style>
    </div>
  );
}
