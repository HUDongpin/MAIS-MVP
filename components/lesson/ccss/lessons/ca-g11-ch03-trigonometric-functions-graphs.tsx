"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)"; const SIN_COLOR = "var(--band-middle)"; const COS_COLOR = "var(--band-early)"; const MID_COLOR = "var(--band-upper)"; const ARC_COLOR = "var(--brand)";

/* ---------- pure helpers (exported so the test can walk every reachable state) ---------- */

export const CONTROLS = { deg: { min: 0, max: 360, step: 15 }, radius: { min: 1, max: 4, step: 1 }, hub: { min: 4, max: 8, step: 1 } } as const;

export const SVG = { w: 552, h: 300, padTop: 18, padBottom: 42, cx: 118, gx0: 236, gx1: 524 } as const;
export const Y_HI = 12;
/** Pixels per meter. One scale runs through both panels, so the wheel is drawn as a true circle. */
export const UNIT = (SVG.h - SVG.padTop - SVG.padBottom) / Y_HI;
export const SAMPLES = 72;

export function rad(deg: number) { return (deg * Math.PI) / 180; }
export function yPix(meters: number) { return SVG.padTop + (Y_HI - meters) * UNIT; }
export function xPix(deg: number) { return SVG.gx0 + (deg / 360) * (SVG.gx1 - SVG.gx0); }
/** The rider's height: hub height plus radius times the sine of the turn angle. */
export function riderHeight(hub: number, radius: number, deg: number) { return hub + radius * Math.sin(rad(deg)); }
/** The rider's screen column: the hub column plus radius times the cosine of the turn angle. */
export function riderX(radius: number, deg: number) { return SVG.cx + radius * Math.cos(rad(deg)) * UNIT; }
export function wavePoints(hub: number, radius: number) { return Array.from({ length: SAMPLES + 1 }, (_, i) => (360 * i) / SAMPLES).map((d) => ({ deg: d, x: xPix(d), y: yPix(riderHeight(hub, radius, d)) })); }
/** Radian measure made visible: the same turn swept along the circle of radius 1 m around the hub. */
export function arcPoint(deg: number, hub: number) { return { x: riderX(1, deg), y: yPix(riderHeight(hub, 1, deg)) }; }
export function arcPath(deg: number, hub: number) { const a = arcPoint(0, hub); const b = arcPoint(deg / 2, hub); const c = arcPoint(deg, hub); return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${UNIT} ${UNIT} 0 0 0 ${b.x.toFixed(2)} ${b.y.toFixed(2)} A ${UNIT} ${UNIT} 0 0 0 ${c.x.toFixed(2)} ${c.y.toFixed(2)}`; }

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
/** Renders a negative number with a typographic minus so the prose reads like mathematics. */
export function num(n: number) { return n < 0 ? `−${Math.abs(n)}` : `${n}`; }
/** A fixed-decimal readout with a typographic minus and never a negative zero. */
export function signedFixed(n: number, dp: number) { const s = n.toFixed(dp); return /^-0(?:\.0+)?$/u.test(s) ? s.slice(1) : s.startsWith("-") ? `−${s.slice(1)}` : s; }
export function fraction(n: number, d: number) {
  const g = gcd(Math.abs(n), Math.abs(d)) || 1; const top = n / g; const bottom = d / g;
  return { n: top, d: bottom, text: bottom === 1 ? `${top}` : `${top}/${bottom}`, value: top / bottom };
}
/** An angle in degrees rewritten as a reduced multiple of π radians. */
export function radianLabel(deg: number) {
  if (deg === 0) return "0";
  const f = fraction(deg, 180); const top = f.n === 1 ? "π" : `${f.n}π`; return f.d === 1 ? top : `${top}/${f.d}`;
}

/** Exact sines of every reference angle this figure reaches; 15 and 75 come from the addition formulas. */
export const BASE_SIN: Record<number, string> = { 0: "0", 15: "(√6 − √2)/4", 30: "1/2", 45: "√2/2", 60: "√3/2", 75: "(√6 + √2)/4", 90: "1" };
export function reference(deg: number) { const d = ((deg % 360) + 360) % 360; return d <= 90 ? d : d <= 180 ? 180 - d : d <= 270 ? d - 180 : 360 - d; }
function signed(text: string, negative: boolean) { return negative && text !== "0" ? `−${text}` : text; }
export function exactSin(deg: number) { return signed(BASE_SIN[reference(deg)], ((deg % 360) + 360) % 360 > 180); }
export function exactCos(deg: number) { const d = ((deg % 360) + 360) % 360; return signed(BASE_SIN[90 - reference(deg)], d > 90 && d < 270); }
/** Where the printed exact value really comes from, and the reduction that carries it into this quadrant. */
export function exactSource(deg: number) {
  const d = ((deg % 360) + 360) % 360; const r = reference(deg);
  const from = r === 0 || r === 90 ? "the axes of the unit circle" : r === 45 ? "the 45-45-90 triangle" : r === 30 || r === 60 ? "the 30-60-90 triangle" : "the addition formulas";
  const rule = r === 0 || r === 90 || d === r ? null : d < 180 ? `180° − ${r}°` : d < 270 ? `180° + ${r}°` : `360° − ${r}°`;
  return { from, rule, reference: r };
}

/** At 0°, 180° and 360° the mirror rider lands on the rider, so the dashed ring is widened to stay visible. */
export function mirrorCoincides(deg: number) { return Math.abs(Math.sin(rad(deg))) < 1e-9; }
export function mirrorRadius(deg: number) { return mirrorCoincides(deg) ? 8.5 : 4; }
export function mirrorNote(hub: number, radius: number, deg: number) {
  const height = signedFixed(riderHeight(hub, radius, -deg), 2);
  if (mirrorCoincides(deg)) return `At ${deg}° the mirror rider sits directly under the rider, because sin ${deg}° and −sin ${deg}° are both 0; the dashed ring is drawn wide here to mark the one height they share, ${height} m.`;
  return `The hollow dot is the rider at ${num(-deg)}°: same horizontal offset, height ${height} m, because cos(−θ) = cos θ while sin(−θ) = −sin θ.`;
}

/** Worked example: a wheel of this radius and hub height, one turn every `turn` seconds. */
export const WHEEL = { radius: 9, hub: 11, turn: 20, target: 15.5 } as const;
export function wheelHeight(t: number) { return WHEEL.hub - WHEEL.radius * Math.cos((2 * Math.PI * t) / WHEEL.turn); }
/** The single angle in [0°, 180°] whose cosine is c — the restriction that makes cosine invertible. */
export function arccosDegrees(c: number) { for (let d = 0; d <= 180; d += 15) if (Math.abs(Math.cos(rad(d)) - c) < 1e-12) return d; return Math.round((Math.acos(c) * 180) / Math.PI); }
export function workedExample() {
  const { radius, hub, turn, target } = WHEEL;
  const cosValue = (hub - target) / radius;
  const deg = arccosDegrees(cosValue);
  const sinValue = Math.sqrt(1 - cosValue * cosValue); // positive: the angle is in the upper half of the circle
  return { low: hub - radius, high: hub + radius, cosValue, deg, sinValue, first: fraction(deg * turn, 360), second: fraction((360 - deg) * turn, 360), across: radius * sinValue, sinText: exactSin(deg), radians: radianLabel(deg) };
}

/** Try it: a buoy on the swell, h(t) = 2.5 sin(πt/4) + 6. */
export const BUOY = { amp: 2.5, mid: 6, b: Math.PI / 4 } as const;
export function tryItOptions() {
  const period = (2 * Math.PI) / BUOY.b;
  const options = [
    { value: period / 4, why: `${period / 4} s is a quarter cycle — midline up to the crest — not a whole one.` },
    { value: period / 2, why: `${period / 2} s is π ÷ (π/4), which is half a cycle: crest down to trough.` },
    { value: BUOY.mid, why: `${BUOY.mid} is the midline height in meters, not a time at all.` },
    { value: period, why: `The period is 2π ÷ B = 2π ÷ (π/4) = ${period} s, so the buoy repeats every ${period} s.` },
  ];
  return { period, options, correct: options.findIndex((o) => o.value === period) };
}

export default function Lesson() {
  const [deg, setDeg] = useState(60);
  const [radius, setRadius] = useState(3);
  const [hub, setHub] = useState(6);
  const [shown, setShown] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const stepsId = useId();

  const cosV = Math.cos(rad(deg));
  const sinV = Math.sin(rad(deg));
  const h = riderHeight(hub, radius, deg);
  const mirror = riderHeight(hub, radius, -deg);
  const rx = riderX(radius, deg);
  const ex = workedExample();
  const tryIt = tryItOptions();
  const src = exactSource(deg);
  const label = `A wheel of radius ${radius} m with its hub ${hub} m up, beside the graph of h = ${hub} + ${radius} sin of the turn angle. At ${deg} degrees the rider is ${signedFixed(h, 2)} m above the ground; the top of the wheel is ${hub + radius} m up and the bottom is ${hub - radius} m up. An inner circle of radius 1 m around the hub carries the same turn marked off as an arc ${rad(deg).toFixed(2)} m long.`;

  const steps = [
    { title: "Read the three numbers off the wheel", math: `amplitude ${WHEEL.radius} m, midline ${WHEEL.hub} m, period ${WHEEL.turn} s`, note: `The radius is how far the rider swings from the hub, the hub height is the level that swing is centered on, and one turn takes ${WHEEL.turn} s. Lowest point ${ex.low} m, highest point ${ex.high} m.` },
    { title: "Write the model", math: `h(t) = ${WHEEL.hub} − ${WHEEL.radius} cos φ, with φ = 2πt/${WHEEL.turn}`, note: `The rider boards at the bottom, so this angle φ is measured up from the bottom of the wheel rather than across from the hub the way the figure's θ was — which is why cosine carries the height here while sine carries the sideways offset. Cosine starts at its maximum, so the minus sign starts the rider at the bottom: h(0) = ${WHEEL.hub} − ${WHEEL.radius} = ${wheelHeight(0)} m, and half a turn later h(${WHEEL.turn / 2}) = ${WHEEL.hub} + ${WHEEL.radius} = ${wheelHeight(WHEEL.turn / 2)} m.` },
    { title: `Set the height to ${WHEEL.target} m and isolate the cosine`, math: `cos φ = (${WHEEL.hub} − ${WHEEL.target})/${WHEEL.radius} = ${num(ex.cosValue)}`, note: `Subtracting ${WHEEL.hub} from both sides leaves −${WHEEL.radius} cos φ = ${WHEEL.target - WHEEL.hub}; dividing by −${WHEEL.radius} gives ${num(ex.cosValue)}. A negative cosine means the rider is already past the halfway mark of the climb.` },
    { title: "Undo the cosine on its restricted domain", math: `φ = arccos(${num(ex.cosValue)}) = ${ex.radians}`, note: `Cosine repeats, so it has no inverse until we keep only 0 ≤ φ ≤ π, where it slides steadily from 1 down to −1. On that stretch exactly one angle has cosine ${num(ex.cosValue)}: the special angle ${ex.deg}° = ${ex.radians}.` },
    { title: "Turn the angle back into a time", math: `t = (${ex.deg}/360)(${WHEEL.turn}) = ${ex.first.text} s ≈ ${ex.first.value.toFixed(2)} s`, note: `An angle of ${ex.deg}° is ${ex.deg}/360 of a full turn, and a full turn takes ${WHEEL.turn} s. Check: h(${ex.first.text}) = ${WHEEL.hub} − ${WHEEL.radius}(${num(ex.cosValue)}) = ${wheelHeight(ex.first.value).toFixed(1)} m.` },
    { title: "Use symmetry for every other answer", math: `t = ${ex.second.text} s ≈ ${ex.second.value.toFixed(2)} s, then every ${WHEEL.turn} s after either time`, note: `Coming back down the wheel meets the same height at the mirror angle 360° − ${ex.deg}° = ${360 - ex.deg}°, and after that the whole pattern repeats every ${WHEEL.turn} s. The identity cos²φ + sin²φ = 1 fills in the sideways position: at φ = ${ex.deg}° the sine is ${ex.sinText} ≈ ${ex.sinValue.toFixed(3)} (at ${360 - ex.deg}° it is the opposite, −${ex.sinText}), and because φ is measured from the bottom that sine is the horizontal offset, so both times the rider is ${WHEEL.radius}(${ex.sinText}) ≈ ${ex.across.toFixed(2)} m out from the wheel's central column — one side going up, the other coming down.` },
  ];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Step onto a wheel that turns at a steady rate and your height stops being a straight line and becomes a <strong>wave</strong>. Halfway up you rise fastest; at the very top, and again at the very bottom, you hang almost still; then the whole story repeats, exactly, every turn. Tides, hours of daylight, alternating current and the pressure of a musical note all behave this way, and trigonometry is the language built to describe them.
      </p>
      <p>
        The engine underneath is one point traveling around a circle. <em>Where</em> the point sits gives you cosine and sine; how its height changes <em>as it turns</em> gives you their graphs. This chapter keeps both pictures side by side, because nearly every fact ahead is a fact about the circle read off the graph, or the other way round.
      </p>

      <Figure caption="Step the wheel around. The rider on the left and the dot on the wave are the same rider at the same instant.">
        <div className="flex flex-col items-center gap-5">
          <svg className="mx-auto h-auto max-w-full" width={SVG.w} height={SVG.h} viewBox={`0 0 ${SVG.w} ${SVG.h}`} role="img" aria-label={label}>
            <line x1={30} y1={yPix(0)} x2={SVG.gx1} y2={yPix(0)} stroke="var(--ink-soft)" strokeWidth={1.5} />
            <line x1={SVG.cx} y1={yPix(0)} x2={SVG.cx} y2={yPix(hub)} stroke="var(--line)" strokeWidth={3} />
            <line x1={38} y1={yPix(hub)} x2={SVG.gx1} y2={yPix(hub)} stroke={MID_COLOR} strokeWidth={1.5} strokeDasharray="5 4" />
            <circle cx={SVG.cx} cy={yPix(hub)} r={radius * UNIT} fill="none" stroke="var(--line)" strokeWidth={2.5} />
            <circle cx={SVG.cx} cy={yPix(hub)} r={UNIT} fill="none" stroke="var(--ink-faint)" strokeWidth={1} strokeDasharray="2 3" />
            <path d={arcPath(deg, hub)} fill="none" stroke={ARC_COLOR} strokeWidth={3.5} strokeLinecap="round" />
            <line x1={SVG.cx} y1={yPix(hub)} x2={rx} y2={yPix(hub)} stroke={COS_COLOR} strokeWidth={3} />
            <line x1={rx} y1={yPix(hub)} x2={rx} y2={yPix(h)} stroke={SIN_COLOR} strokeWidth={3} />
            <line x1={SVG.cx} y1={yPix(hub)} x2={rx} y2={yPix(h)} stroke={ACCENT} strokeWidth={2} />
            <circle cx={rx} cy={yPix(mirror)} r={mirrorRadius(deg)} fill="none" stroke={MID_COLOR} strokeWidth={1.5} strokeDasharray="3 2" />
            <line x1={SVG.gx0} y1={SVG.padTop} x2={SVG.gx0} y2={yPix(0)} stroke="var(--ink-soft)" strokeWidth={1.5} />
            {[0, 6, 12].map((m) => <text key={m} x={SVG.gx0 - 8} y={yPix(m) + 4} textAnchor="end" fontSize={10} fill="var(--ink-faint)">{m}</text>)}
            {[0, 90, 180, 270, 360].map((t) => <text key={t} x={xPix(t)} y={yPix(0) + 16} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">{t}°</text>)}
            <polyline points={wavePoints(hub, radius).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} fill="none" stroke={ACCENT} strokeWidth={2.5} />
            <line x1={rx} y1={yPix(h)} x2={xPix(deg)} y2={yPix(h)} stroke={ACCENT} strokeWidth={1} strokeDasharray="3 3" opacity={0.55} />
            <circle cx={rx} cy={yPix(h)} r={5.5} fill={ACCENT} stroke="var(--surface)" strokeWidth={2} />
            <circle cx={xPix(deg)} cy={yPix(h)} r={5.5} fill={ACCENT} stroke="var(--surface)" strokeWidth={2} />
          </svg>
          <div className="flex flex-wrap justify-center gap-4 text-xs font-bold">
            <span style={{ color: COS_COLOR }}>across the hub: {radius} × cos θ</span>
            <span style={{ color: SIN_COLOR }}>above the hub: {radius} × sin θ</span>
            <span style={{ color: ARC_COLOR }}>arc swept on the r = 1 m circle</span>
            <span style={{ color: MID_COLOR }}>midline (hub level)</span>
          </div>

          <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="turn angle" value={`${deg}°`} />
            <Stat label="arc on r = 1 m" value={radianLabel(deg)} note={`${rad(deg).toFixed(3)} m`} color={ARC_COLOR} />
            <Stat label="cos θ" value={exactCos(deg)} note={signedFixed(cosV, 3)} color={COS_COLOR} />
            <Stat label="sin θ" value={exactSin(deg)} note={signedFixed(sinV, 3)} color={SIN_COLOR} />
          </div>

          <div className="w-full max-w-2xl rounded-xl bg-[var(--surface-2)] px-5 py-3 text-center text-sm">
            <div className="font-mono text-base font-black">h = {hub} + {radius} × ({signedFixed(sinV, 3)}) = {signedFixed(h, 2)} m</div>
            <div className="mt-1 text-[var(--ink-soft)]">
              The wave stays between {hub - radius} m and {hub + radius} m, centered on the hub at {hub} m. Turn one more full circle, to {deg + 360}°, and the rider is back at this very spot — so the wave repeats.
            </div>
            <div className="mt-1 text-[var(--ink-soft)]">
              The exact readouts at {deg}° get their size from {src.from}{src.rule ? `, then land in this quadrant by the ${src.rule} reduction of the circle` : ""}. The arc on the inner circle measures {rad(deg).toFixed(3)} m, and that length is what {deg}° comes to in radians.
            </div>
            <div className="mt-1 text-[var(--ink-soft)]">
              cos²θ + sin²θ = {(cosV * cosV).toFixed(3)} + {(sinV * sinV).toFixed(3)} = {(cosV * cosV + sinV * sinV).toFixed(3)}, which says the rider is always exactly {radius} m from the hub. {mirrorNote(hub, radius, deg)}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="turn angle" value={deg} min={0} max={360} step={15} suffix="°" onChange={setDeg} />
            <Stepper label="radius (m)" value={radius} min={1} max={4} step={1} onChange={setRadius} />
            <Stepper label="hub height (m)" value={hub} min={4} max={8} step={1} onChange={setHub} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: when is the rider {WHEEL.target} m up?</h2>
      <p>
        A wheel has radius {WHEEL.radius} m, its hub sits {WHEEL.hub} m above the ground, and it makes one full turn every {WHEEL.turn} s. A rider boards at the bottom at t = 0. Reveal the reasoning one move at a time.
      </p>
      <div className="card my-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setShown((s) => Math.min(steps.length, s + 1))} disabled={shown >= steps.length} aria-expanded={shown > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>
            {shown === 0 ? "Show the first step" : shown < steps.length ? "Next step" : "All steps shown"}
          </button>
          <button type="button" onClick={() => setShown(0)} disabled={shown === 0} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
          <span className="text-sm text-[var(--ink-faint)]">{shown} of {steps.length} shown</span>
        </div>
        <ol id={stepsId} className="mt-3 flex list-none flex-col gap-2 p-0">
          {steps.slice(0, shown).map((s, i) => (
            <li key={s.title} className="rounded-xl bg-[var(--surface-2)] px-4 py-2.5">
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Step {i + 1}: {s.title}</div>
              <div className="font-mono text-base font-black">{s.math}</div>
              <div className="text-sm text-[var(--ink-soft)]">{s.note}</div>
            </li>
          ))}
        </ol>
      </div>

      <h2>Try it</h2>
      <p>
        A buoy rides the swell so that its height is h(t) = {BUOY.amp} sin(πt/4) + {BUOY.mid} meters, with t in seconds. How long is one complete rise-and-fall cycle?
      </p>
      <div className="flex flex-wrap gap-2">
        {tryIt.options.map((o, i) => (
          <button key={o.value} type="button" onClick={() => setChoice(i)} aria-pressed={choice === i} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={choice === i ? { background: i === tryIt.correct ? ACCENT : MID_COLOR, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o.value} s</button>
        ))}
      </div>
      <p aria-live="polite" className="mt-3 text-sm">
        {choice === null ? "Pick the time it takes the buoy to come back to the same height moving the same way." : choice === tryIt.correct ? `Correct. ${tryIt.options[choice].why}` : `Not quite. ${tryIt.options[choice].why}`}
      </p>

      <h2>Where this chapter goes</h2>
      <p>
        Each lesson ahead lifts one piece out of the figure. <strong>The Unit Circle</strong> shrinks the wheel down to the dashed r = 1 circle you can already see and drops the hub onto the origin, so the rider&apos;s position simply <em>is</em> (cos θ, sin θ) and the turn is measured by that arc. <strong>Exact Trig Values</strong> explains where readouts like {exactCos(60)} and {exactSin(60)} come from: the two special right triangles, not a calculator. <strong>Symmetry &amp; Periodicity</strong> turns the hollow mirror dot and the repeat at {deg + 360}° into stated rules. <strong>Modeling Periodic Phenomena</strong> puts the radius and hub controls to work as amplitude and midline on real tide and daylight data, and adds a phase shift that slides the wave sideways. <strong>Inverse Trig Functions</strong> studies the restricted domain that let step 4 of the worked example name a single angle. And <strong>The Pythagorean Identity</strong> proves the one line that never changed while you stepped the wheel: cos²θ + sin²θ = 1.
      </p>

      <MathCheck>
        <p>
          Radian measure <em>is</em> arc length: on the dashed circle of radius 1 m the same turn sweeps an arc {rad(deg).toFixed(3)} m long, and that length is exactly what {radianLabel(deg)} names — which is why one whole turn, an arc of 2π radius-lengths, is 2π radians (F-TF.1). Reading the rider&apos;s position as (cos θ, sin θ) scaled by the radius defines sine and cosine for <em>every</em> angle, not only the acute ones inside a right triangle (F-TF.2). The special right triangles fix the exact size of sine and cosine at 30°, 45° and 60°, and the 180° − x, 180° + x and 360° − x readings of the circle carry those sizes into every other quadrant (F-TF.3); the two remaining reference angles this figure reaches, 15° and 75°, come instead from the addition formulas, since sin 15° = sin(45° − 30°) = sin 45° cos 30° − cos 45° sin 30° = {BASE_SIN[15]} (F-TF.9). So at {deg}° the printed cos {deg}° = {exactCos(deg)} and sin {deg}° = {exactSin(deg)} are exact rather than rounded: their size is read off {src.from}{src.rule ? `, then placed by the ${src.rule} reduction` : ""}. One more full turn returns the rider to the same point, and −θ mirrors the height while leaving the horizontal offset alone: that is precisely why the graph repeats every 360° and why sin(−θ) = −sin θ while cos(−θ) = cos θ (F-TF.4). Scaling by the radius and lifting by the hub height turns the bare sine into a model with amplitude {radius}, midline {hub} and period 360° (F-TF.5). Because a periodic model repeats, the worked example&apos;s {WHEEL.target} m height happens infinitely often on that wheel of radius {WHEEL.radius} m with its hub {WHEEL.hub} m up; cutting cosine down to the half turn from 0 to π, where it decreases without ever repeating a value, is what leaves arccos a single output (F-TF.6), and that one output plus the mirror symmetry produced both times, {ex.first.text} s and {ex.second.text} s (F-TF.7). Through all of it the rider stays exactly {radius} m from the hub, so ({radius} cos θ)² + ({radius} sin θ)² = {radius}², and dividing by {radius}² leaves the Pythagorean identity cos²θ + sin²θ = 1 (F-TF.8).
        </p>
      </MathCheck>
    </div>
  );
}

function Stat({ label, value, note, color }: { label: string; value: string; note?: string; color?: string }) {
  return (<div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-center">
    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</div>
    <div className="font-mono text-base font-bold" style={color ? { color } : undefined}>{value}</div>
    {note ? <div className="font-mono text-xs text-[var(--ink-faint)]">{note}</div> : null}
  </div>);
}

function Stepper({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (n: number) => void }) {
  return (<div className="flex flex-col items-center gap-1">
    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
      <span className="w-16 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}{suffix ?? ""}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
    </div>
  </div>);
}
