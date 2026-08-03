"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";
const BAR_W = 520;
const BAR_H = 54;

function Bar({
  parts,
  shaded,
  label,
}: {
  parts: number;
  shaded: number;
  label: string;
}) {
  const seg = BAR_W / parts;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={BAR_W}
        height={BAR_H}
        viewBox={`0 0 ${BAR_W} ${BAR_H}`}
        className="max-w-full"
        role="img"
        aria-label={`${label}: ${shaded} of ${parts} parts shaded`}
      >
        {Array.from({ length: parts }, (_, i) => (
          <rect
            key={i}
            x={i * seg}
            y={0}
            width={seg}
            height={BAR_H}
            fill={i < shaded ? ACCENT : "var(--surface-2)"}
            opacity={i < shaded ? 0.85 : 1}
            stroke="var(--surface)"
            strokeWidth={2}
          />
        ))}
        <rect
          x={1}
          y={1}
          width={BAR_W - 2}
          height={BAR_H - 2}
          fill="none"
          stroke="var(--ink-soft)"
          strokeWidth={1.5}
        />
      </svg>
      <span className="font-mono text-lg font-bold text-[var(--ink)]">
        {label}
      </span>
    </div>
  );
}

export default function Lesson() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(2);
  const [n, setN] = useState(3);

  const clampA = (v: number) => Math.max(1, Math.min(b, v));
  const setDen = (nb: number) => {
    setB(nb);
    setA((prev) => Math.min(prev, nb));
  };

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Two fractions are <strong>equivalent</strong>{" "}when they name the{" "}
        <em>same amount</em>. Here is one strip shaded to show a fraction. Below
        it, the same strip is cut into more pieces — the shaded part doesn&apos;t
        move, but its name changes.
      </p>

      <Figure caption="The shaded length is identical in both bars. Only the number of cuts changes.">
        <div className="flex flex-col items-center gap-6">
          <Bar parts={b} shaded={a} label={`${a}/${b}`} />
          <div className="text-2xl text-[var(--ink-faint)]">↓ cut each part into {n}</div>
          <Bar parts={b * n} shaded={a * n} label={`${a * n}/${b * n}`} />

          <div className="rounded-xl bg-[var(--surface-2)] px-5 py-3 text-center font-mono text-lg font-bold">
            {a}/{b} = ({a}×{n}) / ({b}×{n}) ={" "}
            <span style={{ color: ACCENT }}>
              {a * n}/{b * n}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Control
              label="Numerator a"
              value={a}
              min={1}
              max={b}
              onChange={(v) => setA(clampA(v))}
            />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
                Denominator b
              </span>
              <div className="flex gap-1.5">
                {[2, 3, 4, 5, 6].map((nb) => (
                  <button
                    key={nb}
                    type="button"
                    onClick={() => setDen(nb)}
                    className="h-8 w-8 rounded-lg border text-sm font-bold"
                    style={
                      b === nb
                        ? { background: ACCENT, color: "white", borderColor: ACCENT }
                        : { borderColor: "var(--line)", color: "var(--ink-soft)" }
                    }
                  >
                    {nb}
                  </button>
                ))}
              </div>
            </div>
            <Control
              label="Cut each part into n"
              value={n}
              min={1}
              max={4}
              onChange={setN}
            />
          </div>
        </div>
      </Figure>

      <h2>Why multiplying top and bottom works</h2>
      <p>
        When you cut every part into <strong>{n}</strong>{" "}smaller piece
        {n === 1 ? "" : "s"}, there {n === 1 ? "is" : "are"} <strong>{n}</strong>{" "}
        time{n === 1 ? "" : "s"} as many pieces in the whole (the denominator is
        multiplied by {n}) <em>and</em>{" "}<strong>{n}</strong>{" "}time
        {n === 1 ? "" : "s"} as many shaded pieces (the numerator is multiplied by{" "}
        {n}). The amount of strip covered never changed.
      </p>

      <MathCheck>
        <p>
          Multiplying numerator and denominator by the same nonzero number{" "}
          <strong>n</strong>{" "}gives an equal fraction because it is really
          multiplying by <strong>n/n = 1</strong>:{" "}
          <strong>a/b = (a/b) × (n/n) = (a×n)/(b×n)</strong>{" "}(4.NF.A.1). Since
          multiplying a number by 1 leaves it unchanged, the value — the shaded
          length — is exactly the same. This never invents or loses any amount.
        </p>
      </MathCheck>
    </div>
  );
}

function Control({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="w-6 text-center text-xl font-black tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
