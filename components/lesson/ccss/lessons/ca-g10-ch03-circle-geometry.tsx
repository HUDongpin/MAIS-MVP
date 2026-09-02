"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const SOLID = "var(--band-middle)";
const EDGE = "var(--band-upper)";

/** Both drawings use 12 pixels per centimeter, so the flat wedge and the rolled cone appear at the same scale. */
export const SCALE = 12;
export const W = 250, H = 250;
export const SEC_CX = 125, SEC_CY = 125;
export const BASE_CX = 125, BASE_CY = 200;
/** The base circle is seen at an angle, so its vertical semi-axis is drawn at 0.34 of its horizontal one. */
export const ELLIPSE_RATIO = 0.34;
export const R_MIN = 3, R_MAX = 9;
export const DEG_MIN = 60, DEG_MAX = 300, DEG_STEP = 30;

export const r2 = (n: number) => Math.round(n * 100) / 100;

export function gcd(a: number, b: number): number { return b === 0 ? Math.abs(a) : gcd(b, a % b); }

/** A fraction in lowest terms: 288 over 360 becomes "4/5". */
export function fractionText(numerator: number, denominator: number): string {
  const g = gcd(numerator, denominator);
  return `${numerator / g}/${denominator / g}`;
}

/** Exact values print exactly; anything that has to be rounded shows two decimals. */
export function fmt(n: number): string { const rounded = Number(n.toFixed(2)); return rounded === n ? String(rounded) : n.toFixed(2); }

/** The relation sign that belongs in front of fmt(n): "=" when exact, "≈" when rounded. */
export function rel(n: number): string { return Number(n.toFixed(2)) === n ? "=" : "≈"; }

/** Cut a sector of `deg` degrees from a paper circle of radius `slant`, then curl the straight edges together: the arc keeps its length, so it closes into the cone's base circle. */
export function coneFromSector(slant: number, deg: number) {
  const circumference = 2 * Math.PI * slant, arc = (2 * Math.PI * slant * deg) / 360;
  const sectorArea = (Math.PI * slant * slant * deg) / 360, baseRadius = (slant * deg) / 360; // 2 pi baseRadius = arc
  const height = Math.sqrt(slant * slant - baseRadius * baseRadius), cylinderVolume = Math.PI * baseRadius * baseRadius * height;
  return {
    fraction: fractionText(deg, 360), circumference, arc, sectorArea, baseRadius, height,
    cylinderVolume, volume: cylinderVolume / 3, lateralArea: Math.PI * baseRadius * slant, radians: arc / slant,
  };
}

export function sectorLabel(slant: number, deg: number): string {
  const c = coneFromSector(slant, deg); return `A paper circle of radius ${slant} centimeters with a ${deg} degree wedge shaded. The wedge is ${c.fraction} of the circle and its curved edge is about ${c.arc.toFixed(2)} centimeters long.`;
}

export function coneLabel(slant: number, deg: number): string {
  const c = coneFromSector(slant, deg); return `The same wedge rolled into a cone of slant height ${slant} centimeters, base radius about ${c.baseRadius.toFixed(2)} centimeters, height about ${c.height.toFixed(2)} centimeters, holding about ${c.volume.toFixed(2)} cubic centimeters.`;
}

/** Every pixel the two drawings use, derived from the two control values alone. */
export function layout(slant: number, deg: number) {
  const c = coneFromSector(slant, deg);
  const toRad = (d: number) => (d * Math.PI) / 180;
  const rPx = slant * SCALE, rhoPx = c.baseRadius * SCALE, hPx = c.height * SCALE;
  const top = { x: SEC_CX, y: r2(SEC_CY - rPx) };
  const end = { x: r2(SEC_CX + rPx * Math.cos(toRad(90 - deg))), y: r2(SEC_CY - rPx * Math.sin(toRad(90 - deg))) };
  const largeArc = deg > 180 ? 1 : 0;
  const sectorPath = `M ${SEC_CX} ${SEC_CY} L ${top.x} ${top.y} A ${r2(rPx)} ${r2(rPx)} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
  const bisector = toRad(90 - deg / 2), apex = { x: BASE_CX, y: r2(BASE_CY - hPx) };
  const rimRight = { x: r2(BASE_CX + rhoPx), y: BASE_CY }, rimLeft = { x: r2(BASE_CX - rhoPx), y: BASE_CY };
  const marker = Math.min(7, Math.round(rhoPx / 2));
  const labels: { text: string; x: number; y: number; anchor: "start" | "middle" | "end" }[] = [
    { text: `R = ${slant} cm`, x: SEC_CX + 6, y: r2(SEC_CY - rPx / 2), anchor: "start" },
    { text: `${deg}°`, x: r2(SEC_CX + 26 * Math.cos(bisector)), y: r2(SEC_CY - 26 * Math.sin(bisector) + 4), anchor: "middle" },
    { text: `h ${rel(c.height)} ${fmt(c.height)}`, x: BASE_CX - 6, y: r2(BASE_CY - hPx / 2), anchor: "end" },
    { text: `r ${rel(c.baseRadius)} ${fmt(c.baseRadius)}`, x: r2(BASE_CX + rhoPx / 2), y: BASE_CY + 17, anchor: "middle" },
    { text: `slant = ${slant}`, x: r2(BASE_CX + rhoPx / 2 + 8), y: r2(BASE_CY - hPx / 2 - 4), anchor: "start" },
  ];
  return { c, rPx: r2(rPx), rhoPx: r2(rhoPx), hPx: r2(hPx), ry: r2(rhoPx * ELLIPSE_RATIO), top, end, largeArc, sectorPath, apex, rimRight, rimLeft, marker, labels };
}

/** Worked example: a party hat cut from a 15 cm paper circle, keeping 288 degrees. */
export const EX_SLANT = 15, EX_DEG = 288;
/** Try it: a 120 degree wedge of a 9 cm circle. */
export const TRY_SLANT = 9, TRY_DEG = 120;

export function tryChoices(): { text: string; why: string }[] {
  const kept = coneFromSector(TRY_SLANT, TRY_DEG), thrown = coneFromSector(TRY_SLANT, 360 - TRY_DEG);
  return [
    { text: `${fmt(TRY_SLANT)} cm`, why: "is the radius of the paper, which becomes the slant height of the cone, not the radius of its base" },
    { text: `${fmt(kept.arc)} cm`, why: "is the arc length; that arc is the whole base circumference, so it still has to be divided by 2π" },
    { text: `${fmt(kept.baseRadius)} cm`, why: "correct" },
    { text: `${fmt(thrown.baseRadius)} cm`, why: `belongs to the cone rolled from the ${360 - TRY_DEG} degree piece that is thrown away` },
  ];
}

export function tryAnswerIndex(): number {
  return tryChoices().findIndex((choice) => choice.text === `${fmt(coneFromSector(TRY_SLANT, TRY_DEG).baseRadius)} cm`);
}

export default function Lesson() {
  const [slant, setSlant] = useState(6);
  const [deg, setDeg] = useState(240);
  const [shown, setShown] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const stepsId = useId();

  const L = layout(slant, deg);
  const c = L.c;
  const cards = [
    { title: "Curved edge (arc)", color: ACCENT, big: `${rel(c.arc)} ${fmt(c.arc)} cm`, small: `2π(${slant}) × ${c.fraction}`, faint: `arc ÷ R ≈ ${c.radians.toFixed(3)}, which is the angle in radians` },
    { title: "Wedge area", color: ACCENT, big: `${rel(c.sectorArea)} ${fmt(c.sectorArea)} cm²`, small: `π(${slant})² × ${c.fraction}`, faint: `it becomes the slanted surface of the cone, πrR` },
    { title: "Base radius and height", color: EDGE, big: `r ${rel(c.baseRadius)} ${fmt(c.baseRadius)}, h ${rel(c.height)} ${fmt(c.height)}`, small: `2πr = arc gives r = ${slant} × ${c.fraction} exactly, then r² + h² = ${slant}²`, faint: "half of the triangle you see if you slice the cone through its tip" },
    { title: "Volume of the cone", color: SOLID, big: `${rel(c.volume)} ${fmt(c.volume)} cm³`, small: `(1/3)πr²h`, faint: "the cylinder on the same base with the same height holds πr²h, exactly three of these cones" },
  ];

  const ex = coneFromSector(EX_SLANT, EX_DEG);
  const steps = [
    <>The whole paper circle has circumference 2&pi;({EX_SLANT}) = {2 * EX_SLANT}&pi; {rel(ex.circumference)} {fmt(ex.circumference)} cm, and the cut keeps {EX_DEG}/360 = {ex.fraction} of the way around.</>,
    <>So the curved edge measures {ex.fraction} &times; {2 * EX_SLANT}&pi; = {(2 * EX_SLANT * EX_DEG) / 360}&pi; {rel(ex.arc)} {fmt(ex.arc)} cm. Paper does not stretch, so that arc becomes the entire rim of the finished hat.</>,
    <>The rim is a circle, and a circle of radius r has circumference 2&pi;r. Setting 2&pi;r = {(2 * EX_SLANT * EX_DEG) / 360}&pi; gives r = {fmt(ex.baseRadius)} cm &mdash; the same as {EX_SLANT} &times; {EX_DEG}/360, because the base radius is always that fraction of the paper radius.</>,
    <>Slice the hat straight down through its tip: the cut face is an isosceles triangle with base 2r = {2 * ex.baseRadius} and two sides equal to the slant {EX_SLANT}. Cut that face in half down the middle and you get a right triangle with legs r = {fmt(ex.baseRadius)} and h and hypotenuse {EX_SLANT}, so h = &radic;({EX_SLANT}&sup2; &minus; {fmt(ex.baseRadius)}&sup2;) = &radic;({EX_SLANT * EX_SLANT} &minus; {ex.baseRadius * ex.baseRadius}) = &radic;{EX_SLANT * EX_SLANT - ex.baseRadius * ex.baseRadius} = {fmt(ex.height)} cm.</>,
    <>Volume = (1/3)&pi;r&sup2;h = (1/3)&pi;({ex.baseRadius * ex.baseRadius})({fmt(ex.height)}) = {(ex.baseRadius * ex.baseRadius * ex.height) / 3}&pi; {rel(ex.volume)} {fmt(ex.volume)} cm&sup3;. The cylinder on the same base with the same height holds {ex.baseRadius * ex.baseRadius * ex.height}&pi; {rel(ex.cylinderVolume)} {fmt(ex.cylinderVolume)} cm&sup3;, and {ex.baseRadius * ex.baseRadius * ex.height} = 3 &times; {(ex.baseRadius * ex.baseRadius * ex.height) / 3}, so the cylinder is exactly three of these cones. Compare the exact multiples of &pi;: each decimal has been rounded to two places.</>,
  ];

  const choices = tryChoices(), answer = tryAnswerIndex(), t = coneFromSector(TRY_SLANT, TRY_DEG);
  const trySentence = `The ${TRY_SLANT} cm paper radius becomes the slant height. The wedge keeps ${TRY_DEG}/360 = ${t.fraction} of the circumference, so its arc is 2π(${TRY_SLANT}) × ${t.fraction} ${rel(t.arc)} ${fmt(t.arc)} cm. Rolled up, that arc is the base circle, so 2πr ${rel(t.arc)} ${fmt(t.arc)} and r = ${TRY_SLANT} × ${TRY_DEG}/360 = ${fmt(t.baseRadius)} cm.`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A party hat, a paper drinking cup and a traffic cone all begin as a flat piece of a circle. Cut a wedge out of a paper disc, curl the two straight edges
        together until they meet, and the curved edge closes into a ring: you are holding a cone. Paper does not stretch, so the curved edge of the flat wedge
        and the rim of the finished cone are exactly the same length, and that one sentence is enough to compute the whole solid.
      </p>
      <p>
        It is also the thread of this chapter. Slide the paper radius below from 3 cm to 9 cm and the wider circle is the first one dilated by a factor of 3 about
        its center: that dilation carries every point of one circle onto the other, and a translation can always move one center onto another, so any two circles
        are similar. Similar figures scale by matching powers, so every length on a circle is its radius times a constant fixed by the angle you keep, every area
        is the radius squared times such a constant, and every volume the radius cubed. From there the chapter moves outward: angles and chords inside a circle,
        circles built around and inside triangles, arcs and sectors as fractions of the whole, and at last the volumes those round shapes sweep out in space.
        Change the paper radius and the cut angle below and watch the flat wedge and the cone it becomes stay locked to each other.
      </p>

      <Figure caption="Left: the wedge cut from the paper. Right: the same wedge rolled up. The shaded arc on the left and the rim on the right are the same curve, drawn at the same scale.">
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" style={{ maxHeight: 260 }} role="img" aria-label={sectorLabel(slant, deg)}>
              <circle cx={SEC_CX} cy={SEC_CY} r={L.rPx} fill="none" stroke="var(--line)" strokeWidth={1.5} strokeDasharray="5 4" />
              <path d={L.sectorPath} fill={ACCENT} fillOpacity={0.18} stroke={ACCENT} strokeWidth={2.5} />
              <circle cx={SEC_CX} cy={SEC_CY} r={4} fill="var(--ink)" />
              {L.labels.slice(0, 2).map((lb) => (
                <text key={lb.text} x={lb.x} y={lb.y} textAnchor={lb.anchor} fontSize={11} fontWeight={800} fill="var(--ink)">{lb.text}</text>
              ))}
            </svg>
            <div className="text-sm font-black" style={{ color: ACCENT }}>roll it up &rarr;</div>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" style={{ maxHeight: 260 }} role="img" aria-label={coneLabel(slant, deg)}>
              <polygon points={`${L.apex.x},${L.apex.y} ${BASE_CX},${BASE_CY} ${L.rimRight.x},${L.rimRight.y}`} fill={EDGE} fillOpacity={0.16} />
              <ellipse cx={BASE_CX} cy={BASE_CY} rx={L.rhoPx} ry={L.ry} fill={SOLID} fillOpacity={0.18} stroke={SOLID} strokeWidth={2} />
              <line x1={L.apex.x} y1={L.apex.y} x2={L.rimLeft.x} y2={L.rimLeft.y} stroke={ACCENT} strokeWidth={2.5} />
              <line x1={L.apex.x} y1={L.apex.y} x2={L.rimRight.x} y2={L.rimRight.y} stroke={ACCENT} strokeWidth={2.5} />
              <line x1={L.apex.x} y1={L.apex.y} x2={BASE_CX} y2={BASE_CY} stroke={EDGE} strokeWidth={2} strokeDasharray="4 3" />
              <line x1={BASE_CX} y1={BASE_CY} x2={L.rimRight.x} y2={L.rimRight.y} stroke={EDGE} strokeWidth={2} />
              <rect x={BASE_CX} y={BASE_CY - L.marker} width={L.marker} height={L.marker} fill="none" stroke={EDGE} strokeWidth={1.5} />
              <circle cx={L.apex.x} cy={L.apex.y} r={4} fill="var(--ink)" />
              {L.labels.slice(2).map((lb) => (
                <text key={lb.text} x={lb.x} y={lb.y} textAnchor={lb.anchor} fontSize={11} fontWeight={800} fill="var(--ink)">{lb.text}</text>
              ))}
            </svg>
          </div>

          <div className="grid w-full max-w-2xl grid-cols-1 gap-3 text-center sm:grid-cols-2">
            {cards.map((card) => (
              <div key={card.title} className="rounded-xl border-2 px-4 py-3" style={{ borderColor: card.color }}>
                <div className="text-xs font-bold uppercase" style={{ color: card.color }}>{card.title}</div>
                <div className="font-mono text-lg font-black">{card.big}</div>
                <div className="text-xs text-[var(--ink-soft)]">{card.small}</div>
                <div className="text-xs text-[var(--ink-faint)]">{card.faint}</div>
              </div>
            ))}
          </div>

          <p className="m-0 max-w-2xl text-center text-[15px] text-[var(--ink-soft)]">
            Move the paper radius alone and you dilate the whole picture: r &divide; R stays {c.fraction} and arc &divide; R stays about {c.radians.toFixed(3)} at every radius, while the wedge area keeps a fixed ratio to R&sup2;. Lengths scale by the factor, areas by its square &mdash; that is similarity at work.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Paper radius (cm)" value={slant} min={3} max={9} step={1} onChange={setSlant} />
            <Stepper label="Cut angle (degrees)" value={deg} min={60} max={300} step={30} onChange={setDeg} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: a paper party hat</h2>
      <p>
        A hat is cut from a paper circle of radius {EX_SLANT} cm by keeping a wedge of {EX_DEG}&deg; and taping the two straight edges together. Find the length
        of the curved edge, the radius of the finished hat&apos;s base, its height, and the volume of air it encloses.
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
      <p>A wedge of {TRY_DEG}&deg; is cut from a paper circle of radius {TRY_SLANT} cm and rolled into a cone. What is the radius of the cone&apos;s base?</p>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice, i) => (
          <button key={i} type="button" onClick={() => setPicked(i)} aria-pressed={picked === i} className="rounded-lg border px-4 py-1.5 font-mono text-sm font-bold" style={picked === i ? { background: i === answer ? "var(--band-upper)" : "var(--band-early)", color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{choice.text}</button>
        ))}
      </div>
      {picked !== null && (
        <p className="mt-3 text-[15px]">{picked === answer ? `Right. ${trySentence}` : `Not quite. That length ${choices[picked].why}. ${trySentence}`}</p>
      )}

      <h2>Your path through this chapter</h2>
      <p>
        <strong>Inscribed &amp; Central Angles</strong>{" "}goes back inside the circle for the rule the rest of the chapter leans on: an inscribed angle is half
        the central angle standing on the same arc, with the similarity of circles read from the inside, through angles and chords.{" "}
        <strong>Incircles, Circumcircles, Tangents</strong>{" "}hands you the construction tools &mdash; angle bisectors meeting at the incenter, perpendicular
        bisectors meeting at the circumcenter, and the right angle where a radius meets a tangent. <strong>Arc Length &amp; Sector Area</strong>{" "}takes the fraction you have been sliding above and rewrites it in radians,
        where the arc is simply R&theta;. <strong>Where Volume Formulas Come From</strong>{" "}explains the one third in the cone volume instead of asking you to
        memorize it, by slicing solids and comparing cross-sections. <strong>Volumes of Solids</strong>{" "}puts the cylinder, cone, sphere and pyramid formulas
        to work on real containers. <strong>Cross-Sections &amp; Revolutions</strong>{" "}generalizes the triangle hiding inside the cone: any slice of a solid
        is a flat shape, and any flat shape spun about a line sweeps out a solid.
      </p>

      <MathCheck>
        <p>
          Changing the paper radius dilates the circle about its own center, and that dilation carries the whole circle onto the new one &mdash; which is what it
          means for two circles to be similar (G-C.1). A dilation multiplies every length by its factor, so ratios of lengths never move: arc &divide; R &asymp;{" "}
          {c.radians.toFixed(3)} and r &divide; R = {c.fraction} at every paper radius, while an area scales by the factor squared and a volume by its cube. A cut
          angle of {deg}&deg; keeps {c.fraction} of the way around, so the arc is that fraction of 2&pi;R ({rel(c.arc)} {fmt(c.arc)} cm) and the wedge the same
          fraction of &pi;R&sup2; ({rel(c.sectorArea)} {fmt(c.sectorArea)} cm&sup2;) &mdash; one fraction governing both, which is exactly the argument behind
          arc = R&theta; and sector area = &frac12;R&sup2;&theta; in radian measure (G-C.5). Rolling the wedge does not stretch it, so the arc closes into the base
          circle: 2&pi;r = arc gives r = R &times; {deg}/360 {rel(c.baseRadius)} {fmt(c.baseRadius)} cm, and the flat wedge is precisely the cone&apos;s slanted
          surface &pi;rR (G-GMD.1). A vertical slice through the tip is an isosceles triangle with base 2r and two sides R; half of that triangle is a right
          triangle with legs r and h and hypotenuse R (G-GMD.4), so h = &radic;(R&sup2; &minus; r&sup2;) {rel(c.height)} {fmt(c.height)} cm. The cylinder on that
          same base with that same height holds &pi;r&sup2;h, and the cone exactly one third of it: (1/3)&pi;r&sup2;h {rel(c.volume)} {fmt(c.volume)} cm&sup3; (G-GMD.3).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>&minus;</button>
        <span className="w-12 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
