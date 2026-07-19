"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
type M = [[number, number], [number, number]];

const mul = (X: M, Y: M): M => [
  [X[0][0] * Y[0][0] + X[0][1] * Y[1][0], X[0][0] * Y[0][1] + X[0][1] * Y[1][1]],
  [X[1][0] * Y[0][0] + X[1][1] * Y[1][0], X[1][0] * Y[0][1] + X[1][1] * Y[1][1]],
];

export default function Lesson() {
  const [A] = useState<M>([[1, 1], [0, 1]]);
  const [B] = useState<M>([[1, 0], [1, 1]]);
  const I: M = [[1, 0], [0, 1]];
  const Zero: M = [[0, 0], [0, 0]];

  const AB = mul(A, B);
  const BA = mul(B, A);
  const commute = AB.flat().every((v, i) => v === BA.flat()[i]);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Matrix multiplication follows most familiar rules — but <strong>not</strong>{" "}
        the commutative one: usually <strong>AB ≠ BA</strong>. Two special
        matrices anchor the system: the <strong>identity</strong>{" "}I (like the
        number 1) and the <strong>zero</strong>{" "}matrix (like 0).
      </p>

      <Figure caption="Compute AB and BA — order matters. Then see how I and 0 behave.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <Mat m={A} label="A" /><span className="font-black">·</span><Mat m={B} label="B" /><span className="font-black">=</span><Mat m={AB} label="AB" accent />
            </div>
            <div className="flex items-center gap-2">
              <Mat m={B} label="B" /><span className="font-black">·</span><Mat m={A} label="A" /><span className="font-black">=</span><Mat m={BA} label="BA" accent />
            </div>
          </div>

          <div className="rounded-xl px-5 py-2 text-center font-bold" style={{ color: commute ? "var(--ink-soft)" : ACCENT }}>
            {commute ? "Here AB = BA — but that's the exception." : "AB ≠ BA — matrix multiplication is not commutative!"}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Mat m={A} label="A" /><span className="font-black">·</span><Mat m={I} label="I" /><span className="font-black">=</span><Mat m={mul(A, I)} label="A" accent />
            </div>
            <div className="flex items-center gap-2">
              <Mat m={A} label="A" /><span className="font-black">·</span><Mat m={Zero} label="0" /><span className="font-black">=</span><Mat m={mul(A, Zero)} label="0" accent />
            </div>
          </div>
        </div>
      </Figure>

      <h2>Identity and zero, associativity, no commuting</h2>
      <p>
        The <strong>identity</strong>{" "}I = [[1,0],[0,1]] leaves any matrix
        unchanged: A·I = A. The <strong>zero</strong>{" "}matrix wipes it out: A·0 = 0.
        Multiplication is associative and distributive, but the order of factors
        genuinely changes the answer — a real break from ordinary number algebra.
      </p>

      <MathCheck>
        <p>
          Matrix multiplication is <strong>associative and distributive</strong>{" "}
          but generally <strong>not commutative</strong>: AB ≠ BA (N-VM.9). The{" "}
          <strong>identity matrix</strong>{" "}plays the role of 1 (AI = A) and the{" "}
          <strong>zero matrix</strong>{" "}the role of 0 (N-VM.10). A square matrix
          has a multiplicative inverse exactly when its determinant is nonzero.
        </p>
      </MathCheck>
    </div>
  );
}

function Mat({ m, label, accent }: { m: M; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-stretch">
        <span className="w-1 rounded-l border-2 border-r-0" style={{ borderColor: accent ? ACCENT : "var(--ink-soft)" }} />
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-0.5 px-1.5 py-1 font-mono text-base font-bold">
          {m.flat().map((v, i) => <span key={i} className="w-5 text-center" style={{ color: accent ? ACCENT : "var(--ink)" }}>{v}</span>)}
        </div>
        <span className="w-1 rounded-r border-2 border-l-0" style={{ borderColor: accent ? ACCENT : "var(--ink-soft)" }} />
      </div>
      <span className="text-[11px] font-bold text-[var(--ink-faint)]">{label}</span>
    </div>
  );
}
