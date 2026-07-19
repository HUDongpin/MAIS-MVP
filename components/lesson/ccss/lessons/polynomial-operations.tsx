"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

// polynomials as coefficient arrays [constant, x, x², ...]
function polyStr(c: number[]): string {
  const parts: string[] = [];
  for (let i = c.length - 1; i >= 0; i--) {
    if (c[i] === 0) continue;
    const v = c[i];
    const term = i === 0 ? `${Math.abs(v)}` : `${Math.abs(v) === 1 ? "" : Math.abs(v)}x${i === 1 ? "" : "^" + i}`;
    parts.push((parts.length === 0 ? (v < 0 ? "−" : "") : v < 0 ? " − " : " + ") + term);
  }
  return parts.join("") || "0";
}

function add(a: number[], b: number[]): number[] {
  const n = Math.max(a.length, b.length);
  return Array.from({ length: n }, (_, i) => (a[i] || 0) + (b[i] || 0));
}
function mul(a: number[], b: number[]): number[] {
  const out = Array(a.length + b.length - 1).fill(0);
  a.forEach((av, i) => b.forEach((bv, j) => (out[i + j] += av * bv)));
  return out;
}

type Op = "add" | "sub" | "mul";

export default function Lesson() {
  const [A] = useState([3, 2, 1]); // 1x² + 2x + 3
  const [B] = useState([-1, 4]); // 4x − 1
  const [op, setOp] = useState<Op>("mul");

  const result = op === "add" ? add(A, B) : op === "sub" ? add(A, B.map((v) => -v)) : mul(A, B);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Polynomials behave like integers under arithmetic. Add or subtract by{" "}
        <strong>combining like terms</strong>; multiply by{" "}
        <strong>distributing</strong>{" "}every term of one across the other. The
        result is <em>always</em>{" "}another polynomial — the system is{" "}
        <strong>closed</strong>.
      </p>

      <Figure caption="Add, subtract, or multiply two polynomials. The answer is always a polynomial.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-2">
            {(["add", "sub", "mul"] as Op[]).map((o) => (
              <button key={o} type="button" onClick={() => setOp(o)} className="rounded-lg border px-4 py-1.5 text-sm font-bold" style={op === o ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>
                {o === "add" ? "A + B" : o === "sub" ? "A − B" : "A · B"}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2 font-mono text-lg">
            <span>A = <strong>{polyStr(A)}</strong></span>
            <span>B = <strong>{polyStr(B)}</strong></span>
          </div>

          <div className="rounded-2xl border-2 px-8 py-3 text-center font-mono text-2xl font-black" style={{ borderColor: ACCENT, color: ACCENT }}>
            {polyStr(result)}
          </div>

          {op === "mul" && (
            <p className="m-0 max-w-md text-center text-sm text-[var(--ink-soft)]">
              Every term of A times every term of B: (1x²)(4x) gives 4x³, and so on,
              then combine like terms.
            </p>
          )}
        </div>
      </Figure>

      <h2>Closed, like the integers</h2>
      <p>
        Just as adding or multiplying two integers yields an integer, combining
        two polynomials yields a polynomial. Multiplication distributes term by
        term and collects like powers — here A · B = {polyStr(mul(A, B))}. There is
        no way to "escape" the polynomials with +, −, or ×.
      </p>

      <MathCheck>
        <p>
          Polynomials form a system <strong>closed</strong>{" "}under addition,
          subtraction, and multiplication (A-APR.1): the sum, difference, or
          product of polynomials is always a polynomial, mirroring the integers.
          Adding/subtracting combines like terms; multiplying distributes and
          collects powers.
        </p>
      </MathCheck>
    </div>
  );
}
