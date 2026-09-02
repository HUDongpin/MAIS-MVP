"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)", PAIR = "var(--band-upper)", REAL_INK = "var(--band-middle)";

export type Zero = { re: number; im: number };
/** Declared control bounds: the real zero r, and the pair p ± qi. */
export const R_MIN = -3, R_MAX = 3, P_MIN = -2, P_MAX = 2, Q_MIN = 0, Q_MAX = 3;
/** Left panel: y = p(x) across XMIN ≤ x ≤ XMAX. STEP is 1/16, exact in binary. */
export const GW = 300, GH = 220, GPAD = 28, XMIN = -4, XMAX = 4;
export const GMID = GH / 2, GHALF = GH / 2 - GPAD, STEP = 1 / 16, SAMPLES = (XMAX - XMIN) / STEP;
export const gx = (x: number) => GPAD + ((x - XMIN) / (XMAX - XMIN)) * (GW - 2 * GPAD);
/**
 * A sample's y in panel pixels, clipped to the panel.
 *
 * The vertical scale is set by the window holding the zeros (see `yUnit`), so a
 * cubic's far tail runs off the top or bottom. Clipping it at the edge is the
 * ordinary graph-window behaviour and keeps every drawn point inside the frame.
 */
export const gyOf = (y: number, unit: number) => Math.min(GH - GPAD, Math.max(GPAD, GMID - y * unit));
/** Right panel: the complex plane, CRANGE units each way from the origin. */
export const CW = 220, CH = 220, CPAD = 26, CRANGE = 3.5, CUNIT = (CW - 2 * CPAD) / (2 * CRANGE);
export const cxOf = (re: number) => CPAD + (re + CRANGE) * CUNIT;
export const cyOf = (im: number) => CPAD + (CRANGE - im) * CUNIT;

/** Integers with a true minus sign, and one addend of a printed running sum. */
export function num(n: number): string { return n < 0 ? `−${Math.abs(n)}` : String(n); }
export function signedAddend(value: number): string { return `${value < 0 ? "−" : "+"} ${Math.abs(value)}`; }
/** One signed term of a printed polynomial; an empty string when the coefficient is 0. */
export function term(coefficient: number, suffix: string): string {
  const size = Math.abs(coefficient);
  return coefficient === 0 ? "" : ` ${coefficient < 0 ? "−" : "+"} ${suffix && size === 1 ? suffix : `${size}${suffix}`}`;
}
export function cubicText(b: number, c: number, d: number): string { return `x³${term(b, "x²")}${term(c, "x")}${term(d, "")}`; }
export function linearFactorText(root: number): string { return root === 0 ? "x" : `x ${root > 0 ? "−" : "+"} ${Math.abs(root)}`; }
/** The quadratic factor whose zeros are p ± qi: x² − 2px + (p² + q²). */
export function quadraticFactorText(p: number, q: number): string { return `x²${term(-2 * p, "x")}${term(p * p + q * q, "")}`; }
export function complexText(re: number, im: number): string {
  const unit = Math.abs(im) === 1 ? "i" : `${Math.abs(im)}i`;
  if (im === 0) return num(re);
  return re === 0 ? (im < 0 ? `−${unit}` : unit) : `${num(re)} ${im < 0 ? "−" : "+"} ${unit}`;
}
/** p(x) = (x − r)(x² − 2px + p² + q²), a monic cubic with integer coefficients. */
export function polyValue(r: number, p: number, q: number, x: number): number { return (x - r) * (x * x - 2 * p * x + (p * p + q * q)); }
/** The same cubic multiplied out. Each `0 −` keeps a signed zero out of the display. */
export function expand(r: number, p: number, q: number): { b: number; c: number; d: number } {
  return { b: 0 - (r + 2 * p), c: p * p + q * q + 2 * p * r, d: 0 - r * (p * p + q * q) };
}
/** All three zeros, counted with multiplicity — q = 0 makes the last two coincide. */
export function zeros(r: number, p: number, q: number): Zero[] { return [{ re: r, im: 0 }, { re: p, im: q }, { re: p, im: -q }]; }
/** The zeros a real graph can show, smallest first, without repeats. */
export function realZeros(r: number, p: number, q: number): number[] { return q !== 0 || r === p ? [r] : [Math.min(r, p), Math.max(r, p)]; }
/** The quadratic factor's discriminant is 4p² − 4(p² + q²) = −4q², whatever p is. */
export function discriminant(q: number): number { return 0 - 4 * q * q; }
export function graphSamples(r: number, p: number, q: number): { x: number; y: number }[] {
  return Array.from({ length: SAMPLES + 1 }, (_, i) => ({ x: XMIN + i * STEP, y: polyValue(r, p, q, XMIN + i * STEP) }));
}
/**
 * Pixels per output unit.
 *
 * Scaling by the tallest sample let the far tail of a cubic set the scale, so on
 * the settings with a distant zero the interesting part of the curve — the
 * crossings the copy describes — flattened onto the axis. Scale by the peak over
 * the window that actually holds the zeros instead; gyOf clips the tails at the
 * panel edge.
 */
export function yUnit(r: number, p: number, q: number): number {
  const zs = zeros(r, p, q).filter((z) => z.im === 0).map((z) => z.re);
  const lo = Math.min(...zs) - 1.5, hi = Math.max(...zs) + 1.5;
  const near = graphSamples(r, p, q).filter((s) => s.x >= lo && s.x <= hi);
  const peak = (near.length ? near : graphSamples(r, p, q)).reduce((best, s) => Math.max(best, Math.abs(s.y)), 0);
  return GHALF / Math.max(peak, 1);
}
/**
 * The zeros written as a sum, e.g. "(−3) + (−2) + (−2) = −7".
 *
 * Building this inline parenthesised only the non-real zeros, so a negative real
 * zero rendered as "−3 + −2 + −2", which is not how a sum is written. Every
 * addend that is not a plain non-negative number gets brackets.
 */
export function zeroSumText(r: number, p: number, q: number): string {
  return zeros(r, p, q)
    .map((z) => {
      const text = complexText(z.re, z.im);
      return z.im === 0 && z.re >= 0 ? text : `(${text})`;
    })
    .join(" + ");
}
export function crossingText(r: number, p: number, q: number): string {
  if (q > 0) return `crosses the horizontal axis once, at x = ${num(r)}`;
  if (r === p) return `crosses the horizontal axis once, at x = ${num(r)}, where all three zeros pile up`;
  return `crosses the horizontal axis at x = ${num(r)} and touches it without crossing at x = ${num(p)}`;
}
export function zeroCountText(r: number, p: number, q: number): string {
  const count = realZeros(r, p, q).length;
  const head = `${count} distinct real ${count === 1 ? "zero" : "zeros"}`;
  if (q > 0) return `${head} and one conjugate pair — three in all, counting multiplicity`;
  return `${head} and no non-real zeros — three in all, because x = ${num(p)} is counted ${r === p ? "three times" : "twice"}`;
}
/** The note printed under each written form of the polynomial. */
export function factoredNote(p: number, q: number): string { return q > 0 ? `the quadratic factor has discriminant ${num(discriminant(q))}, so it never reaches zero on the real line` : `the quadratic factor is the perfect square (${linearFactorText(p)})²`; }
export function expandedNote(): string { return "multiplying polynomials gives a polynomial, and every coefficient here is an integer"; }
export function rebuildNote(r: number, p: number, q: number): string { const { b, d } = expand(r, p, q); return `so the x² coefficient is −(${num(r + 2 * p)}) = ${num(b)}, and the product ${num(r * (p * p + q * q))} makes the constant term −(${num(r * (p * p + q * q))}) = ${num(d)}`; }
export function graphLabel(r: number, p: number, q: number): string {
  const { b, c, d } = expand(r, p, q);
  return `Graph of y = ${cubicText(b, c, d)} for x from ${num(XMIN)} to ${num(XMAX)}. The curve ${crossingText(r, p, q)}.`;
}
export function planeLabel(r: number, p: number, q: number): string {
  const listed = zeros(r, p, q).map((z) => complexText(z.re, z.im)).join(", ");
  const where = q > 0 ? "one on the horizontal real axis and two mirrored across it" : "all three on the horizontal real axis";
  return `Complex plane from −3 to 3 on both axes, marking the zeros ${listed} — ${where}.`;
}
/** The Math check, one sentence per claim; the JSX supplies each citation after it. */
export function closureSentence(r: number, p: number, q: number): string { const { b, c, d } = expand(r, p, q); return `Multiplying (${linearFactorText(r)}) by (${quadraticFactorText(p, q)}) gives ${cubicText(b, c, d)}: a product of polynomials is always another polynomial, which is what makes the factored and expanded rows above two spellings of one object`; }
export function factorSentence(r: number): string { return `Because p(${num(r)}) = 0, the remainder on dividing by (${linearFactorText(r)}) is 0, so that factor divides the cubic exactly, with nothing left over — and the same test is what lets the worked example peel one factor off a cubic given only its coefficients`; }
export function graphSentence(r: number, p: number, q: number): string { return `The real zeros are exactly where the left-hand curve meets the axis, so the zeros alone sketch its shape: the curve ${crossingText(r, p, q)}`; }
export function discriminantSentence(p: number, q: number): string { return q > 0 ? `The quadratic factor has discriminant ${num(discriminant(q))}, which is negative, so no real number is a zero of it, and the one thing still missing is a square root for a negative number — exactly what i, with i² = −1, supplies` : `The quadratic factor has discriminant ${num(discriminant(q))}, so it is the perfect square (${linearFactorText(p)})² and both of its zeros are the same real number ${num(p)}: a real double zero, not a conjugate pair. Raise the imaginary part above 0 and that discriminant, −4q², turns negative, and then a square root for a negative number is needed — exactly what i, with i² = −1, supplies`; }
export function formulaSentence(p: number, q: number): string { return q > 0 ? `With i in hand the quadratic formula finishes even here, returning ${complexText(p, q)} and ${complexText(p, -q)}` : `With i in hand the quadratic formula finishes even when a discriminant is negative, returning a conjugate pair a + bi and a − bi that no real graph can show — raise the imaginary part above 0 to bring one onto the right-hand panel`; }
export function conjugateSentence(p: number, q: number): string { return q > 0 ? `Those two are conjugates, which is forced rather than chosen: their sum ${num(2 * p)} and their product ${num(p * p + q * q)} are both real, so multiplying the pair back together restores real coefficients, and a real polynomial can never carry a non-real zero without its mirror image` : `Any such pair is conjugate, which is forced rather than chosen: the sum 2a and the product a² + b² of a + bi and a − bi are both real, so multiplying the pair back together restores real coefficients, and a real polynomial can never carry a non-real zero without its mirror image. The repeated real zero on screen right now is a different matter: real coefficients never force a real zero to repeat`; }
export function planeSentence(q: number): string { return q > 0 ? `Plotting a + bi as the point (a, b) puts every zero on one diagram, with the non-real pair sitting symmetrically above and below the real axis` : `Plotting a + bi as the point (a, b) puts every zero on one diagram, and with the imaginary part at 0 all three sit on the real axis itself`; }
export function ftaSentence(r: number, p: number, q: number): string { return `A degree-three polynomial has exactly three zeros once complex numbers are allowed: ${zeroCountText(r, p, q)}. That is the Fundamental Theorem of Algebra doing its work`; }
/** Worked example: a cubic assembled from one real zero and one conjugate pair. */
export const WE_ROOT = 1, WE_RE = 2, WE_IM = 3;
export function workedExample() {
  const { b, c, d } = expand(WE_ROOT, WE_RE, WE_IM);
  const remainder = WE_ROOT ** 3 + b * WE_ROOT ** 2 + c * WE_ROOT + d;
  const q1 = b + WE_ROOT, q0 = c + WE_ROOT * q1, rest = d + WE_ROOT * q0;   // synthetic division by (x − WE_ROOT)
  const disc = q1 * q1 - 4 * q0, re = -q1 / 2, im = Math.sqrt(-disc) / 2;
  const quotient = `x²${term(q1, "x")}${term(q0, "")}`;
  return { b, c, d, remainder, q1, q0, rest, disc, re, im, quotient, cubic: cubicText(b, c, d), sum: WE_ROOT + 2 * re, product: WE_ROOT * (re * re + im * im) };
}
/** Try it: a real-coefficient quartic missing one zero. */
export const TRY_DEGREE = 4, TRY_REAL_ZEROS = [0, 5];
export const TRY_KNOWN: Zero = { re: 2, im: -7 };
export const TRY_CHOICES: { z: Zero; why: string }[] = [
  { z: { re: -2, im: 7 }, why: "flips the real part too; conjugating changes only the sign of the imaginary part" },
  { z: { re: 2, im: 7 }, why: "correct" },
  { z: { re: -2, im: -7 }, why: "negates both parts of the number rather than reflecting it across the real axis" },
  { z: { re: 7, im: 2 }, why: "swaps the real and imaginary parts, which is not what a conjugate does" },
];
export function conjugate(z: Zero): Zero { return { re: z.re, im: -z.im }; }
export function tryAnswerIndex(): number {
  const want = conjugate(TRY_KNOWN);
  return TRY_CHOICES.findIndex((choice) => choice.z.re === want.re && choice.z.im === want.im);
}
/** (x − z)(x − z̄) = x² − 2·Re(z)·x + (Re(z)² + Im(z)²), whose coefficients are always real. */
export function realQuadraticFromPair(z: Zero): { b: number; c: number } { return { b: -2 * z.re, c: z.re * z.re + z.im * z.im }; }

export default function Lesson() {
  const [r, setR] = useState(-1);
  const [p, setP] = useState(2);
  const [q, setQ] = useState(2);
  const [shown, setShown] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const stepsId = useId();

  const { b, c, d } = expand(r, p, q);
  const unit = yUnit(r, p, q), roots = zeros(r, p, q);
  const path = graphSamples(r, p, q).map((s) => `${gx(s.x).toFixed(2)},${gyOf(s.y, unit).toFixed(2)}`).join(" ");
  const sum = r + 2 * p;
  const addends = zeroSumText(r, p, q);
  const cards = [
    { title: "Factored form", color: ACCENT, big: `p(x) = (${linearFactorText(r)})(${quadraticFactorText(p, q)})`, small: factoredNote(p, q) },
    { title: "Expanded form", color: REAL_INK, big: `p(x) = ${cubicText(b, c, d)}`, small: expandedNote() },
    { title: "The zeros", color: PAIR, big: roots.map((z) => complexText(z.re, z.im)).join(",  "), small: zeroCountText(r, p, q) },
    { title: "Zeros rebuild the coefficients", color: ACCENT, big: `${addends} = ${num(sum)}`, small: rebuildNote(r, p, q) },
  ];

  const we = workedExample();
  const steps = [
    <>Start from the cubic q(x) = {we.cubic} and test x = {WE_ROOT}. The Remainder Theorem says the remainder on dividing by ({linearFactorText(WE_ROOT)}) is just q({WE_ROOT}) = {WE_ROOT ** 3} {signedAddend(we.b * WE_ROOT ** 2)} {signedAddend(we.c * WE_ROOT)} {signedAddend(we.d)} = {we.remainder}.</>,
    <>A remainder of {we.remainder} means ({linearFactorText(WE_ROOT)}) divides q exactly, so x = {WE_ROOT} is a zero and that factor can be pulled out.</>,
    <>Divide with synthetic division on the coefficients 1, {num(we.b)}, {we.c}, {num(we.d)} using x = {WE_ROOT}. Bring down 1; then {WE_ROOT} × 1 + ({num(we.b)}) = {num(we.q1)}; then {WE_ROOT} × ({num(we.q1)}) + {we.c} = {we.q0}; then {WE_ROOT} × {we.q0} + ({num(we.d)}) = {we.rest}. The quotient is {we.quotient}, so q(x) = ({linearFactorText(WE_ROOT)})({we.quotient}).</>,
    <>Solve {we.quotient} = 0. Its discriminant is ({num(we.q1)})² − 4 × {we.q0} = {we.q1 * we.q1} − {4 * we.q0} = {num(we.disc)}, which is negative, so no real number works. Writing {num(we.disc)} as {-we.disc}i² lets the quadratic formula finish: x = ({num(-we.q1)} ± {Math.sqrt(-we.disc)}i) ÷ 2 = {complexText(we.re, we.im)} and {complexText(we.re, -we.im)}.</>,
    <>The three zeros are {WE_ROOT}, {complexText(we.re, we.im)} and {complexText(we.re, -we.im)} — one for each degree, and the two non-real ones are a conjugate pair. The coefficients agree: the zeros add to {WE_ROOT} + {we.re} + {we.re} = {we.sum} because {complexText(0, we.im)} and {complexText(0, -we.im)} cancel, and −({we.sum}) = {num(we.b)} is exactly the x² coefficient.</>,
  ];

  const answer = tryAnswerIndex();
  const guard = realQuadraticFromPair(TRY_KNOWN);
  const trySentence = `Pairing ${complexText(TRY_KNOWN.re, TRY_KNOWN.im)} with ${complexText(-guard.b / 2, -TRY_KNOWN.im)} gives (x − (${complexText(TRY_KNOWN.re, TRY_KNOWN.im)}))(x − (${complexText(TRY_KNOWN.re, -TRY_KNOWN.im)})) = x²${term(guard.b, "x")}${term(guard.c, "")}, whose coefficients are real. No other pairing clears the i out of the product.`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A cubic that models the volume of a tray folded from a flat sheet crosses zero three times, and every crossing is a fold you could actually cut. A cubic that
        models how a loaded shelf settles after a book lands on it may cross zero only once — and the two missing crossings are not missing at all. They are a pair of
        numbers of the form a + bi, and an engineer reads them as the shelf oscillating rather than sagging quietly into place. The graph simply cannot draw them.
      </p>
      <p>
        That is this chapter in one picture. Allow numbers with an imaginary part and every polynomial splits into exactly as many linear factors as its degree — no
        more, no fewer. When the coefficients are real, the zeros that are not real always arrive in mirror-image pairs a + bi and a − bi, and that mirroring is
        precisely what keeps the multiplied-out coefficients real. Move the three dials below: the left panel is the graph you could draw on paper, the right panel is
        the complex plane where all of the zeros live at once, and both written forms of the polynomial rewrite themselves to match.
      </p>

      <Figure caption="Left: the real graph, which can only show real zeros; its vertical scale adjusts so the whole curve fits. Right: the complex plane, where all three zeros are always visible. Drop the imaginary part to 0 and the pair slides onto the real axis.">
        <div className="flex flex-col items-center gap-5">
          <div className="flex w-full flex-wrap items-center justify-center gap-4">
            <svg width={GW} height={GH} viewBox={`0 0 ${GW} ${GH}`} className="mx-auto h-auto max-w-full" role="img" aria-label={graphLabel(r, p, q)}>
              <line x1={gx(XMIN)} y1={GMID} x2={gx(XMAX)} y2={GMID} stroke="var(--ink-soft)" strokeWidth={2} />
              <line x1={gx(0)} y1={GPAD} x2={gx(0)} y2={GH - GPAD} stroke="var(--ink-soft)" strokeWidth={2} />
              {[-3, -2, -1, 1, 2, 3].map((v) => <text key={v} x={gx(v)} y={GMID + 14} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{num(v)}</text>)}
              <polyline points={path} fill="none" stroke={ACCENT} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              {realZeros(r, p, q).map((v) => <circle key={v} cx={gx(v)} cy={GMID} r={5} fill={REAL_INK} stroke="white" strokeWidth={2} />)}
            </svg>

            <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`} className="mx-auto h-auto max-w-full" role="img" aria-label={planeLabel(r, p, q)}>
              {[-3, -2, -1, 0, 1, 2, 3].map((v) => <g key={v} stroke="var(--line)" strokeWidth={1}><line x1={cxOf(v)} y1={cyOf(CRANGE)} x2={cxOf(v)} y2={cyOf(-CRANGE)} /><line x1={cxOf(-CRANGE)} y1={cyOf(v)} x2={cxOf(CRANGE)} y2={cyOf(v)} /></g>)}
              <line x1={cxOf(-CRANGE)} y1={cyOf(0)} x2={cxOf(CRANGE)} y2={cyOf(0)} stroke="var(--ink-soft)" strokeWidth={2} />
              <line x1={cxOf(0)} y1={cyOf(CRANGE)} x2={cxOf(0)} y2={cyOf(-CRANGE)} stroke="var(--ink-soft)" strokeWidth={2} />
              {[-3, -2, -1, 1, 2, 3].map((v) => <g key={v} fontSize={8} fill="var(--ink-faint)" fontFamily="var(--font-mono)"><text x={cxOf(v)} y={cyOf(0) + 11} textAnchor="middle">{num(v)}</text><text x={cxOf(0) - 6} y={cyOf(v) + 3} textAnchor="end">{complexText(0, v)}</text></g>)}
              <text x={cxOf(CRANGE)} y={cyOf(0) - 6} textAnchor="end" fontSize={10} fill="var(--ink-faint)">Re</text>
              <text x={cxOf(0) + 6} y={cyOf(CRANGE) + 10} fontSize={10} fill="var(--ink-faint)">Im</text>
              {q > 0 && <line x1={cxOf(p)} y1={cyOf(q)} x2={cxOf(p)} y2={cyOf(-q)} stroke={PAIR} strokeWidth={1.5} strokeDasharray="4 3" />}
              {roots.map((z, i) => <g key={i}><circle cx={cxOf(z.re)} cy={cyOf(z.im)} r={6} fill={z.im === 0 ? REAL_INK : PAIR} stroke="white" strokeWidth={2} /><text x={z.re >= 1 ? cxOf(z.re) - 10 : cxOf(z.re) + 10} y={cyOf(z.im) - 9} textAnchor={z.re >= 1 ? "end" : "start"} fontSize={10} fontWeight={700} fill={z.im === 0 ? REAL_INK : PAIR}>{complexText(z.re, z.im)}</text></g>)}
            </svg>
          </div>

          <div className="grid w-full max-w-2xl grid-cols-1 gap-3 text-center sm:grid-cols-2">
            {cards.map((card) => (
              <div key={card.title} className="rounded-xl border-2 px-4 py-3" style={{ borderColor: card.color }}>
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: card.color }}>{card.title}</div>
                <div className="font-mono text-base font-black">{card.big}</div><div className="mt-0.5 text-xs text-[var(--ink-soft)]">{card.small}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <Stepper label="Real zero r" value={r} min={-3} max={3} color={REAL_INK} onChange={setR} />
            <Stepper label="Real part p" value={p} min={-2} max={2} color={PAIR} onChange={setP} />
            <Stepper label="Imaginary part q" value={q} min={0} max={3} color={PAIR} onChange={setQ} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: finding all three zeros of a cubic</h2>
      <p>
        A cubic arrives already multiplied out, with no factoring in sight: q(x) = {we.cubic}. Test one small value of x, divide out the factor it reveals, and the leftover quadratic will hand over the rest — including the zeros the graph refuses to draw.
      </p>
      <div className="card my-4 p-5">
        <ol id={stepsId} className="m-0 list-none space-y-2 p-0">
          {steps.slice(0, shown).map((body, i) => (
            <li key={i} className="flex gap-3 text-[15px]">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: ACCENT }}>{i + 1}</span><span>{body}</span>
            </li>
          ))}
        </ol>
        {shown === 0 && <p className="m-0 text-sm text-[var(--ink-faint)]">Press &ldquo;Next step&rdquo; to watch the solution unfold.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" aria-expanded={shown > 0} aria-controls={stepsId} disabled={shown >= steps.length} onClick={() => setShown((n) => Math.min(steps.length, n + 1))} className="rounded-lg px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>Next step</button>
          <button type="button" disabled={shown === 0} onClick={() => setShown(0)} className="rounded-lg border border-[var(--line)] px-4 py-1.5 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>
        A polynomial of degree {TRY_DEGREE} has real coefficients, and {TRY_REAL_ZEROS.length + 1} of its zeros are already known: {TRY_REAL_ZEROS[0]}, {TRY_REAL_ZEROS[1]} and {complexText(TRY_KNOWN.re, TRY_KNOWN.im)}. What must the fourth zero be?
      </p>
      <div className="flex flex-wrap gap-2">
        {TRY_CHOICES.map((choice, i) => <button type="button" key={complexText(choice.z.re, choice.z.im)} onClick={() => setPicked(i)} aria-pressed={picked === i} className="rounded-lg border px-4 py-1.5 font-mono text-sm font-bold" style={picked === i ? { background: i === answer ? PAIR : "var(--band-early)", color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{complexText(choice.z.re, choice.z.im)}</button>)}
      </div>
      {picked !== null && <p className="mt-3 text-[15px]">{picked === answer ? `Right. ${trySentence}` : `Not quite: ${complexText(TRY_CHOICES[picked].z.re, TRY_CHOICES[picked].z.im)} ${TRY_CHOICES[picked].why}. ${trySentence}`}</p>}

      <h2>Where this chapter goes</h2>
      <p>
        <strong>Complex Numbers: a + bi</strong>{" "}builds the number i from scratch and shows that adding, subtracting and multiplying with it works exactly like
        binomial algebra, with i² = −1 as the only new rule. <strong>Conjugates and Modulus</strong>{" "}slows down the mirroring you just used and turns it into a tool
        for division. <strong>The Complex Plane</strong>{" "}gives the right-hand panel above its full treatment: plotting, adding as a parallelogram, distance and
        midpoint. <strong>Complex Roots of Quadratics</strong>{" "}works the negative-discriminant case that made the pair appear here. On the polynomial side,{" "}
        <strong>Polynomial Arithmetic</strong>{" "}establishes that sums, differences and products of polynomials are polynomials, and{" "}
        <strong>The Remainder Theorem</strong>{" "}proves the shortcut the worked example leaned on. <strong>Identities &amp; the Binomial Theorem</strong>{" "}collects the
        always-true rewrites, Pascal&rsquo;s triangle included, and <strong>Rational Expressions</strong>{" "}takes the last step, dividing one polynomial by another and
        simplifying the ratio the way you simplify a fraction.
      </p>

      <MathCheck>
        <p>
          {closureSentence(r, p, q)} (A-APR.1). {factorSentence(r)} (A-APR.2). {graphSentence(r, p, q)} (A-APR.3). {discriminantSentence(p, q)} (N-CN.1). {formulaSentence(p, q)} (N-CN.7). {conjugateSentence(p, q)} (N-CN.3, N-CN.8). {planeSentence(q)} (N-CN.4). {ftaSentence(r, p, q)} (N-CN.9).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, color, onChange }: { label: string; value: number; min: number; max: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums" style={{ color }}>{num(value)}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button></div>
    </div>
  );
}
