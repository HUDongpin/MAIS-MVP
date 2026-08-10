"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const ACCENT = "var(--band-upper)";
const W = 560;
const H = 150;
const PAD = 40;
const LINE_Y = 95;
const lineW = W - 2 * PAD;

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default function Lesson() {
  const [b, setB] = useState(4); // denominator
  const [a, setA] = useState(3); // numerator

  const clampA = (n: number) => Math.max(0, Math.min(b, n));
  const setDenominator = (nb: number) => {
    setB(nb);
    setA((prev) => Math.min(prev, nb));
  };

  const x = (k: number) => PAD + (k / b) * lineW;
  const g = gcd(a, b);
  const whole = a === b;
  const simplified = a === 0
    ? "0"
    : whole
      ? null
      : g > 1
        ? `${a / g}/${b / g}`
        : null;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A fraction like <strong>3/4</strong>{" "}is a <em>number</em>. It lives at a
        certain spot on the number line. First we split the distance from{" "}
        <strong>0 to 1</strong>{" "}into equal parts. Then we count parts.
      </p>

      <Figure caption="Choose how many equal parts (the denominator), then count parts (the numerator).">
        <div className="flex flex-col items-center gap-5">
          <FigureScroll>
            <svg
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              className="mx-auto max-w-full"
              role="img"
              aria-label={`Number line showing ${a} over ${b}`}
            >
              {/* shaded distance from 0 to a/b */}
              <rect
                x={PAD}
                y={LINE_Y - 6}
                width={(a / b) * lineW}
                height={12}
                rx={6}
                fill={ACCENT}
                opacity={0.28}
              />
              {/* base line */}
              <line
                x1={PAD}
                y1={LINE_Y}
                x2={W - PAD}
                y2={LINE_Y}
                stroke="var(--ink-soft)"
                strokeWidth={2}
              />
              {/* ticks */}
              {Array.from({ length: b + 1 }, (_, k) => {
                const endpoint = k === 0 || k === b;
                return (
                  <g key={k}>
                    <line
                      x1={x(k)}
                      y1={LINE_Y - (endpoint ? 16 : 10)}
                      x2={x(k)}
                      y2={LINE_Y + (endpoint ? 16 : 10)}
                      stroke="var(--ink-soft)"
                      strokeWidth={endpoint ? 2 : 1}
                    />
                    {endpoint && (
                      <text
                        x={x(k)}
                        y={LINE_Y + 34}
                        textAnchor="middle"
                        fontSize={15}
                        fontWeight={700}
                        fill="var(--ink)"
                      >
                        {k === 0 ? "0" : "1"}
                      </text>
                    )}
                    {!endpoint && (
                      <text
                        x={x(k)}
                        y={LINE_Y + 30}
                        textAnchor="middle"
                        fontSize={11}
                        fill="var(--ink-faint)"
                        fontFamily="var(--font-mono)"
                      >
                        {k}/{b}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* draggable-looking marker */}
              <g transform={`translate(${x(a)}, ${LINE_Y})`}>
                <circle r={9} fill={ACCENT} stroke="white" strokeWidth={2.5} />
                <line x1={0} y1={-40} x2={0} y2={-9} stroke={ACCENT} strokeWidth={2} />
                <rect x={-26} y={-62} width={52} height={22} rx={6} fill={ACCENT} />
                <text
                  x={0}
                  y={-46}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={800}
                  fill="white"
                  fontFamily="var(--font-mono)"
                >
                  {a}/{b}
                </text>
              </g>
            </svg>
          </FigureScroll>

          <div className="text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            {a}/{b} means <strong>{a}</strong>{" "}{a === 1 ? "copy" : "copies"} of{" "}
            <strong>1/{b}</strong>
            {simplified && (
              <>
                {" "}
                — the same spot as <strong>{simplified}</strong>
              </>
            )}
            {whole && <> — and that&apos;s the whole, <strong>1</strong></>}.
          </div>

          <div className="flex flex-col items-center gap-3">
            {/* The heading was a plain span, so the buttons under it announced
                a bare number with nothing saying what it selects. */}
            <div className="flex items-center gap-2" role="group" aria-label="Number of equal parts">
              <span aria-hidden="true" className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
                Equal parts
              </span>
              {[2, 3, 4, 5, 6, 8].map((nb) => (
                <button
                  key={nb}
                  type="button"
                  onClick={() => setDenominator(nb)}
                  aria-label={`Split the whole into ${nb} equal parts`}
                  aria-pressed={b === nb}
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setA(clampA(a - 1))}
                disabled={a === 0}
                className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
              >
                − part
              </button>
              <span className="w-16 text-center font-mono text-lg font-bold">
                {a}/{b}
              </span>
              <button
                type="button"
                onClick={() => setA(clampA(a + 1))}
                disabled={a === b}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: ACCENT }}
              >
                + part
              </button>
            </div>
          </div>
        </div>
      </Figure>

      <h2>Same length, every time</h2>
      <p>
        The key word is <strong>equal</strong>. Every part between two ticks is
        the <em>same length</em>. That shared length is <strong>1/{b}</strong>.
        To reach the fraction <strong>{a}/{b}</strong>, you hop that length{" "}
        <strong>{a}</strong>{" "}{a === 1 ? "time" : "times"} starting from 0.
      </p>

      <MathCheck>
        <p>
          On the number line, <strong>1/b</strong>{" "}is defined as the length of
          one part when the segment from 0 to 1 is cut into <strong>b</strong>{" "}
          equal parts (3.NF.A.1). The fraction <strong>a/b</strong>{" "}is the point
          you reach after <strong>a</strong>{" "}of those parts (3.NF.A.2) — that is,{" "}
          <strong>a/b = a × (1/b)</strong>. When the numerator equals the
          denominator, the point lands exactly on <strong>1</strong>, because{" "}
          <strong>b × (1/b) = 1</strong>.
        </p>
      </MathCheck>
    </div>
  );
}
