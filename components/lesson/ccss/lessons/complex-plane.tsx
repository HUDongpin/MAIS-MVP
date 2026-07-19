"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const R = 5; // grid radius in units
const CELL = 26;
const PAD = 24;
const SIZE = 2 * R * CELL + 2 * PAD;
const Z = "var(--band-high)";
const W = "var(--band-upper)";
const SUM = "var(--band-middle)";
const r2 = (n: number) => Math.round(n * 100) / 100;

function fmt(re: number, im: number) {
  if (im === 0) return `${re}`;
  const sign = im < 0 ? "−" : "+";
  return `${re} ${sign} ${Math.abs(im)}i`;
}

export default function Lesson() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [c, setC] = useState(-2);
  const [d, setD] = useState(3);

  const sx = (x: number) => PAD + (x + R) * CELL;
  const sy = (y: number) => SIZE - PAD - (y + R) * CELL;

  const modZ = r2(Math.sqrt(a * a + b * b));
  const argZ = r2((Math.atan2(b, a) * 180) / Math.PI);
  const dist = r2(Math.sqrt((c - a) ** 2 + (d - b) ** 2));
  const midRe = r2((a + c) / 2), midIm = r2((b + d) / 2);
  const sumRe = a + c, sumIm = b + d;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A complex number a + bi is a <strong>point (a, b)</strong>{" "}in the plane —
        the real part across, the imaginary part up. This <strong>Argand
        diagram</strong>{" "}turns algebra into geometry: adding is a{" "}
        <strong>parallelogram</strong>, and |z| is a distance.
      </p>

      <Figure caption="z and w as points. Their sum is the parallelogram diagonal; distance and midpoint work just like coordinates.">
        <div className="flex flex-col items-center gap-6">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 340 }} role="img" aria-label="complex plane">
            {Array.from({ length: 2 * R + 1 }, (_, i) => {
              const v = i - R;
              return (
                <g key={v} stroke="var(--line)" strokeWidth={1}>
                  <line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} />
                  <line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} />
                </g>
              );
            })}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={2} />
            <text x={sx(R) - 6} y={sy(0) - 6} fontSize={10} fill="var(--ink-faint)">Re</text>
            <text x={sx(0) + 6} y={sy(R) + 12} fontSize={10} fill="var(--ink-faint)">Im</text>
            {/* parallelogram for sum */}
            <line x1={sx(0)} y1={sy(0)} x2={sx(sumRe)} y2={sy(sumIm)} stroke={SUM} strokeWidth={2} strokeDasharray="4 3" />
            <line x1={sx(a)} y1={sy(b)} x2={sx(sumRe)} y2={sy(sumIm)} stroke={W} strokeWidth={1.5} strokeDasharray="2 3" />
            <line x1={sx(c)} y1={sy(d)} x2={sx(sumRe)} y2={sy(sumIm)} stroke={Z} strokeWidth={1.5} strokeDasharray="2 3" />
            {/* vectors */}
            <Arrow x2={sx(a)} y2={sy(b)} x1={sx(0)} y1={sy(0)} color={Z} />
            <Arrow x2={sx(c)} y2={sy(d)} x1={sx(0)} y1={sy(0)} color={W} />
            <circle cx={sx(sumRe)} cy={sy(sumIm)} r={5} fill={SUM} />
            <text x={sx(a) + 6} y={sy(b) - 6} fontSize={12} fontWeight={800} fill={Z}>z</text>
            <text x={sx(c) + 6} y={sy(d) - 6} fontSize={12} fontWeight={800} fill={W}>w</text>
            <text x={sx(sumRe) + 6} y={sy(sumIm) - 6} fontSize={12} fontWeight={800} fill={SUM}>z+w</text>
          </svg>

          <div className="grid w-full max-w-lg grid-cols-2 gap-2 font-mono text-sm">
            <Info label="z + w" value={fmt(sumRe, sumIm)} c={SUM} />
            <Info label="|z| (modulus)" value={`${modZ}`} c={Z} />
            <Info label="arg z" value={`${argZ}°`} c={Z} />
            <Info label="|z − w| (distance)" value={`${dist}`} c="var(--ink)" />
            <Info label="midpoint of z, w" value={fmt(midRe, midIm)} c="var(--ink)" />
            <Info label="polar form of z" value={`${modZ}(cos${argZ}° + i·sin${argZ}°)`} c={Z} />
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
            <Stepper label="Re z" value={a} onChange={setA} />
            <Stepper label="Im z" value={b} onChange={setB} />
            <Stepper label="Re w" value={c} onChange={setC} />
            <Stepper label="Im w" value={d} onChange={setD} />
          </div>
        </div>
      </Figure>

      <h2>Rectangular and polar, side by side</h2>
      <p>
        The same point is <strong>a + bi</strong>{" "}(rectangular) or{" "}
        <strong>r(cos θ + i sin θ)</strong>{" "}(polar), where r = |z| = {modZ} and
        θ = arg z = {argZ}°. Distance and midpoint between two complex numbers use
        the ordinary coordinate formulas, because the plane is the plane.
      </p>

      <MathCheck>
        <p>
          Complex numbers have <strong>rectangular</strong>{" "}form a + bi and{" "}
          <strong>polar</strong>{" "}form r(cos θ + i sin θ) (N-CN.4). Operations are{" "}
          <strong>geometric</strong>: addition is vector/parallelogram addition
          (N-CN.5), and the plane&apos;s <strong>distance</strong>{" "}|z − w| and{" "}
          <strong>midpoint</strong>{" "}(z + w)/2 come straight from the coordinate
          formulas (N-CN.6).
        </p>
      </MathCheck>
    </div>
  );
}

function Arrow({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={3} strokeLinecap="round" />;
}

function Info({ label, value, c }: { label: string; value: string; c: string }) {
  return (
    <div className="flex flex-col rounded-lg bg-[var(--surface-2)] px-3 py-1.5">
      <span className="text-[10px] uppercase text-[var(--ink-faint)]">{label}</span>
      <span className="font-black" style={{ color: c }}>{value}</span>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(-5, value - 1))} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-lg font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(5, value + 1))} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
