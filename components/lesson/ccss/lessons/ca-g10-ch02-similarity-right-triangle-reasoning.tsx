"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const GHOST = "var(--ink-soft)";
const MARK = "var(--band-upper)";

export type Triple = { a: number; b: number; c: number; name: string };

/** Whole-number right triangles, so every side ratio the figure prints is an exact fraction. */
export const TRIPLES: Triple[] = [
  { a: 3, b: 4, c: 5, name: "3-4-5" },
  { a: 5, b: 12, c: 13, name: "5-12-13" },
  { a: 8, b: 15, c: 17, name: "8-15-17" },
];

/** The scale stepper counts halves: 1 gives k = 0.5, 6 gives k = 3. */
export const HALVES_MIN = 1, HALVES_MAX = 6;
export const K_MAX = HALVES_MAX / 2;
export const scaleOf = (halves: number) => halves / 2;

/** Drawing box. The triangle is pinned at vertex A and grows right and up from there. */
export const W = 380, H = 220, PAD_L = 34, PAD_R = 46, PAD_T = 30, PAD_B = 34;
export const IW = W - PAD_L - PAD_R;
export const IH = H - PAD_T - PAD_B;
export const ARC_R = 18, SQ = 9;

/** Pixels per unit, floored to 3 decimals so the largest reachable triangle fits the box exactly. */
export function unitPx(t: Triple): number { return Math.floor(Math.min(IW / (t.b * K_MAX), IH / (t.a * K_MAX)) * 1000) / 1000; }
export function gcd(a: number, b: number): number { return b === 0 ? Math.abs(a) : gcd(b, a % b); }

/** Lengths here are multiples of 0.5 and squares multiples of 0.25, so two decimals always suffice. */
export function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(2);
  return s.endsWith("0") ? s.slice(0, -1) : s;
}
/** n/d in lowest terms; a whole number is printed without a denominator. */
export function fractionText(n: number, d: number): string {
  const g = gcd(n, d);
  return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`;
}
/** A reduced denominator built only from 2s and 5s gives a decimal that stops. */
export function terminates(d: number): boolean {
  let x = d;
  while (x % 2 === 0) x /= 2;
  while (x % 5 === 0) x /= 5;
  return x === 1;
}
/** "3/5 = 0.6" when the decimal stops, "5/13 = 0.385" rounded with an approximation sign when it does not. */
export function ratioText(n: number, d: number): string {
  const exact = terminates(d / gcd(n, d));
  const raw = (n / d).toFixed(3);
  const decimal = exact ? raw.replace(/0+$/, "").replace(/\.$/, "") : raw;
  return `${fractionText(n, d)} ${exact ? "=" : "≈"} ${decimal}`;
}
/** The acute angle at the fixed vertex, in degrees. Irrational, so it is only ever shown rounded. */
export function angleDegrees(t: Triple): number { return (Math.atan2(t.a, t.b) * 180) / Math.PI; }

/** Every number and pixel the figure draws, from the triangle choice and the scale stepper alone. */
export function layout(tIndex: number, halves: number) {
  const t = TRIPLES[tIndex];
  const k = scaleOf(halves), u = unitPx(t);
  const ax = PAD_L, ay = H - PAD_B, bx = ax + t.b * k * u, by = ay, cy = ay - t.a * k * u;
  const sides = { a: t.a * k, b: t.b * k, c: t.c * k };
  const labels = [
    { text: fmt(sides.b), x: (ax + bx) / 2, y: ay + 16, anchor: "middle" as const },
    { text: fmt(sides.a), x: bx + 7, y: (ay + cy) / 2 + 4, anchor: "start" as const },
    { text: fmt(sides.c), x: (ax + bx) / 2 - 8, y: (ay + cy) / 2 - 4, anchor: "end" as const },
  ];
  return {
    t, k, u, ax, ay, bx, by, cx: bx, cy, sides, labels, area: (sides.a * sides.b) / 2, baseArea: (t.a * t.b) / 2,
    ghostX: ax + t.b * u, ghostY: ay - t.a * u, rayX: ax + t.b * K_MAX * u, rayY: ay - t.a * K_MAX * u,
    arcEnd: { x: ax + (ARC_R * t.b) / t.c, y: ay - (ARC_R * t.a) / t.c },
  };
}

export function figureLabel(tIndex: number, halves: number): string {
  const L = layout(tIndex, halves);
  return `The ${L.t.name} right triangle dilated from its marked vertex by scale factor ${fmt(L.k)}: legs ${fmt(L.sides.a)} and ${fmt(L.sides.b)}, hypotenuse ${fmt(L.sides.c)}. The marked angle stays about ${angleDegrees(L.t).toFixed(1)} degrees at every scale.`;
}

/** Worked example: a measuring stick and a flagpole casting shadows at the same moment. */
export const STICK_HEIGHT = 6, STICK_SHADOW = 8, POLE_SHADOW = 60;
export function shadowExample() {
  const k = POLE_SHADOW / STICK_SHADOW;
  const poleHeight = STICK_HEIGHT * k;
  const stickLegSquares = STICK_HEIGHT * STICK_HEIGHT + STICK_SHADOW * STICK_SHADOW;
  const poleLegSquares = poleHeight * poleHeight + POLE_SHADOW * POLE_SHADOW;
  return {
    k, poleHeight, stickLegSquares, poleLegSquares, tan: STICK_HEIGHT / STICK_SHADOW,
    stickHyp: Math.sqrt(stickLegSquares), poleHyp: Math.sqrt(poleLegSquares),
    sunAngle: (Math.atan2(STICK_HEIGHT, STICK_SHADOW) * 180) / Math.PI,
  };
}

/** Try it: a second skate ramp built at the same angle as the first. */
export const RAMP_RISE = 7, RAMP_RUN = 24, LONG_RUN = 96;
export function tryChoices(): { value: number; why: string }[] {
  const k = LONG_RUN / RAMP_RUN;
  const rise = RAMP_RISE * k;
  return [
    { value: RAMP_RISE / k, why: `divides by the scale factor instead of multiplying, so it is the rise of a ramp with a run of ${fmt(RAMP_RUN / k)} ft` },
    { value: rise, why: "correct" },
    { value: RAMP_RISE + (LONG_RUN - RAMP_RUN), why: `adds the extra ${LONG_RUN - RAMP_RUN} ft of run onto the rise, but similar figures multiply lengths, they never add to them` },
    { value: Math.sqrt(LONG_RUN * LONG_RUN + rise * rise), why: "is the length of the sloping ramp surface, not the height it reaches" },
  ];
}

export function tryAnswerIndex(): number {
  const rise = RAMP_RISE * (LONG_RUN / RAMP_RUN);
  return tryChoices().findIndex((c) => c.value === rise);
}

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const [halves, setHalves] = useState(4);
  const [shown, setShown] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const stepsId = useId();

  const L = layout(idx, halves), t = L.t, s = L.sides;
  const deg = angleDegrees(t).toFixed(1), comp = (90 - angleDegrees(t)).toFixed(1);
  const cards = [
    { title: "Lengths multiply by k", color: ACCENT, big: `${fmt(s.a)}, ${fmt(s.b)}, ${fmt(s.c)}`, small: `${t.a}, ${t.b}, ${t.c} each multiplied by k = ${fmt(L.k)}` },
    { title: "The angle stays put", color: MARK, big: `θ ≈ ${deg}°`, small: `the other acute angle is 90° − θ ≈ ${comp}°, and sin θ = cos(90° − θ) = ${fractionText(t.a, t.c)}` },
    { title: "Ratios the angle alone decides", color: ACCENT, big: `sin θ = ${fmt(s.a)}/${fmt(s.c)} = ${ratioText(t.a, t.c)}`, small: `cos θ = ${fmt(s.b)}/${fmt(s.c)} = ${ratioText(t.b, t.c)}, and tan θ = ${fmt(s.a)}/${fmt(s.b)} = ${ratioText(t.a, t.b)}` },
    { title: "Pythagoras at every size", color: MARK, big: `${fmt(s.a)}² + ${fmt(s.b)}² = ${fmt(s.c)}²`, small: `${fmt(s.a * s.a)} + ${fmt(s.b * s.b)} = ${fmt(s.c * s.c)}` },
  ];

  const ex = shadowExample();
  const steps = [
    <>Sunlight arrives in parallel rays, and both the stick and the pole stand at a right angle to level ground. Two pairs of equal angles is all it takes, so by the AA criterion the two shadow triangles are similar.</>,
    <>Similar means one triangle is a dilation of the other. Use the pair of lengths you already know to find the scale factor: k = {POLE_SHADOW} ÷ {STICK_SHADOW} = {fmt(ex.k)}.</>,
    <>A dilation multiplies every length by k, so the pole is {STICK_HEIGHT} × {fmt(ex.k)} = <strong>{fmt(ex.poleHeight)} ft</strong> tall.</>,
    <>Check it with the ratio instead of the scale factor. The sun&apos;s angle of elevation satisfies tan θ = {STICK_HEIGHT}/{STICK_SHADOW} = {fmt(ex.tan)}, and the pole gives {fmt(ex.poleHeight)}/{POLE_SHADOW} = {fmt(ex.tan)} as well. Same angle, same ratio, so θ ≈ {ex.sunAngle.toFixed(1)}°.</>,
    <>The stick&apos;s hypotenuse is √({STICK_HEIGHT}² + {STICK_SHADOW}²) = √{ex.stickLegSquares} = {fmt(ex.stickHyp)} ft, so the top of the pole is {fmt(ex.stickHyp)} × {fmt(ex.k)} = {fmt(ex.poleHyp)} ft from the tip of its shadow. Pythagoras agrees: √({fmt(ex.poleHeight)}² + {POLE_SHADOW}²) = √{ex.poleLegSquares} = {fmt(ex.poleHyp)}.</>,
  ];

  const choices = tryChoices(), answer = tryAnswerIndex(), rampK = LONG_RUN / RAMP_RUN;
  const trySentence = `Both ramps have the same acute angle and a right angle at the base, so they are similar. The scale factor is ${LONG_RUN} ÷ ${RAMP_RUN} = ${fmt(rampK)}, which makes the rise ${RAMP_RISE} × ${fmt(rampK)} = ${fmt(RAMP_RISE * rampK)} ft — and rise ÷ run stays ${fractionText(RAMP_RISE, RAMP_RUN)} for both.`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Hold a photograph at arm&apos;s length, then blow it up to poster size. Every length in it multiplies by the same number, and not one angle changes. That single sentence is the engine of this
        chapter. It is why a 15-centimeter drawing can stand in for a 15-meter bridge, and why a surveyor can find the height of a tower she will never climb by measuring the shadow it throws on the ground.
      </p>
      <p>
        Push the idea one step further and trigonometry falls out of it. If two right triangles share an acute angle they are the same shape at two different sizes, so the ratio of any two matching sides
        is identical in both, which makes that ratio a property of the angle alone — and naming those ratios is exactly what sine, cosine, and tangent do. Pick a triangle below and change its size: the
        lengths grow, the angle and the ratios do not.
      </p>
      <Figure caption="The dashed triangle is the original and the shaded one is its image under a dilation from the marked vertex. The angle arc sits in the same place whatever the scale factor is.">
        <div className="flex flex-col items-center gap-5">
          <div className="flex max-w-full flex-wrap justify-center gap-2">
            {TRIPLES.map((tri, i) => (
              <button key={tri.name} type="button" onClick={() => setIdx(i)} aria-pressed={idx === i} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{tri.name} triangle</button>
            ))}
          </div>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={figureLabel(idx, halves)}>
            <line x1={L.ax} y1={L.ay} x2={L.rayX} y2={L.ay} stroke="var(--line)" strokeWidth={1.5} strokeDasharray="3 4" />
            <line x1={L.ax} y1={L.ay} x2={L.rayX} y2={L.rayY} stroke="var(--line)" strokeWidth={1.5} strokeDasharray="3 4" />
            <polygon points={`${L.ax},${L.ay} ${L.ghostX},${L.ay} ${L.ghostX},${L.ghostY}`} fill="none" stroke={GHOST} strokeWidth={1.8} strokeDasharray="5 4" />
            <polygon points={`${L.ax},${L.ay} ${L.bx},${L.by} ${L.cx},${L.cy}`} fill={ACCENT} fillOpacity={0.16} stroke={ACCENT} strokeWidth={2.5} />
            <rect x={L.bx - SQ} y={L.by - SQ} width={SQ} height={SQ} fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} />
            <path d={`M ${L.ax + ARC_R} ${L.ay} A ${ARC_R} ${ARC_R} 0 0 0 ${L.arcEnd.x} ${L.arcEnd.y}`} fill="none" stroke={MARK} strokeWidth={2.5} />
            <text x={L.ax + ARC_R + 5} y={L.ay - 7} fontSize={12} fontWeight={800} fill={MARK}>θ</text>
            <circle cx={L.ax} cy={L.ay} r={4} fill="var(--ink)" />
            {L.labels.map((lb) => (
              <text key={lb.anchor} x={lb.x} y={lb.y} textAnchor={lb.anchor} fontSize={11} fontWeight={800} fill="var(--ink)">{lb.text}</text>
            ))}
          </svg>
          <div className="grid w-full max-w-2xl grid-cols-1 gap-3 text-center sm:grid-cols-2">
            {cards.map((c) => (
              <div key={c.title} className="rounded-xl border-2 px-4 py-3" style={{ borderColor: c.color }}>
                <div className="text-xs font-bold uppercase" style={{ color: c.color }}>{c.title}</div>
                <div className="font-mono text-base font-black">{c.big}</div>
                <div className="text-xs text-[var(--ink-soft)]">{c.small}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-[var(--surface-2)] px-5 py-2 text-center text-sm">
            Area = ½ · {fmt(s.b)} · {fmt(s.a)} = <strong style={{ color: ACCENT }}>{fmt(L.area)}</strong>, which is {fmt(L.k * L.k)} × {L.baseArea}: area scales by k², never by k.
          </div>
          <Stepper label="Scale factor k" value={halves} min={1} max={6} onChange={setHalves} display={fmt(L.k)} />
        </div>
      </Figure>

      <h2>Worked example: the flagpole you cannot measure</h2>
      <p>
        A {STICK_HEIGHT}-foot measuring stick stands upright and casts a shadow {STICK_SHADOW} ft long. At that same moment the flagpole beside it casts a shadow {POLE_SHADOW} ft long. How tall is the flagpole, and how far is its top from the tip of its own shadow?
      </p>
      <div className="card my-4 p-5">
        <ol id={stepsId} className="m-0 list-none space-y-2 p-0">
          {steps.slice(0, shown).map((body, i) => (
            <li key={i} className="flex gap-3 text-[15px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: ACCENT }}>{i + 1}</span><span>{body}</span></li>
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
        A skate ramp rises {RAMP_RISE} ft over a horizontal run of {RAMP_RUN} ft. A second ramp is built at the same angle of inclination with a run of {LONG_RUN} ft. How high does the second ramp rise?
      </p>
      <div className="flex flex-wrap gap-2">
        {choices.map((c, i) => (
          <button key={i} type="button" onClick={() => setPicked(i)} aria-pressed={picked === i} className="rounded-lg border px-4 py-1.5 font-mono text-sm font-bold" style={picked === i ? { background: i === answer ? "var(--band-upper)" : "var(--band-early)", color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{fmt(c.value)} ft</button>
        ))}
      </div>
      {picked !== null && (
        <p className="mt-3 text-[15px]">{picked === answer ? `Right. ${trySentence}` : `Not quite — ${fmt(choices[picked].value)} ft ${choices[picked].why}. ${trySentence}`}</p>
      )}

      <h2>Your path through this chapter</h2>
      <p>
        <strong>Dilations</strong>{" "}takes the transformation apart: where the center goes, what a fractional factor does, and why a line that misses the center lands on a parallel line.{" "}
        <strong>Similarity &amp; the AA Criterion</strong>{" "}pins down what &ldquo;same shape&rdquo; formally means and proves that two matching angles are already enough.{" "}
        <strong>Proving with Similarity</strong>{" "}turns that into a tool, starting with the side-splitter theorem for a line drawn parallel to one side of a triangle.{" "}
        <strong>Trig Ratios from Similarity</strong>{" "}gives the three ratios in the figure above their names and explores the complementary-angle link.{" "}
        <strong>Solving Right Triangles</strong>{" "}works the flagpole problem in reverse, starting from a measured angle of elevation. <strong>Area = ½·ab·sin C</strong>{" "}
        drops the right-angle requirement, and <strong>Laws of Sines &amp; Cosines</strong>{" "}finishes the job for triangles of any shape at all.
      </p>

      <MathCheck>
        <p>
          A <strong>dilation</strong>{" "}with center A and factor k sends each point P to the point on ray AP whose distance from A is k·AP, so it multiplies every length by k and leaves every angle alone (G-SRT.1).
          That is why the {t.name} triangle and its image — sides {fmt(s.a)}, {fmt(s.b)}, {fmt(s.c)} — are <strong>similar</strong>: a similarity is a dilation followed by a rigid motion, and matching angles staying
          equal while matching sides keep one constant ratio is exactly what that produces (G-SRT.2). Read it backwards and two equal pairs of angles force the third pair to match, so <strong>AA</strong>{" "}alone
          establishes similarity and then solves for an unknown length, as the flagpole does (G-SRT.3, G-SRT.5). Because every right triangle containing θ is similar to this one, the ratios{" "}
          {fractionText(t.a, t.c)}, {fractionText(t.b, t.c)}, and {fractionText(t.a, t.b)} are properties of the <em>angle</em>, not of the triangle — which is what lets them be named sin θ, cos θ, and tan θ
          (G-SRT.6). Swapping which leg counts as &ldquo;opposite&rdquo; swaps sine and cosine, giving sin θ = cos(90° − θ) (G-SRT.7). Pythagoras survives the scaling because (k·{t.a})² + (k·{t.b})² ={" "}
          k²({t.a}² + {t.b}²) = k²·{t.c}² = (k·{t.c})², so a scaled triple is still a right triangle and can still deliver a real height or distance (G-SRT.8). Finally the area {fmt(L.area)} is{" "}
          ½·{fmt(s.b)}·{fmt(s.a)}, the right-angle case of ½·ab·sin C with sin 90° = 1, and it grows by k² rather than k (G-SRT.9).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange, display }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; display: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-12 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{display}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
