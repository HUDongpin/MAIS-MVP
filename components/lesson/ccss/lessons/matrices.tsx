"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const MATRIX_ENTRY_MIN = -9;
const MATRIX_ENTRY_MAX = 9;
type M = [[number, number], [number, number]];
type Op = "scale" | "add" | "mult";

function integerText(value: number) {
  return `${value}`.replace("-", "−");
}

function factorText(value: number) {
  const text = integerText(value);
  return value < 0 ? `(${text})` : text;
}

function additionWork(left: number, right: number) {
  return `${integerText(left)} ${right < 0 ? "−" : "+"} ${Math.abs(right)}`;
}

export default function Lesson() {
  const [A, setA] = useState<M>([[1, 2], [3, 4]]);
  const [B, setB] = useState<M>([[2, 0], [1, 2]]);
  const [k, setK] = useState(2);
  const [op, setOp] = useState<Op>("mult");

  const scale: M = [[k * A[0][0], k * A[0][1]], [k * A[1][0], k * A[1][1]]];
  const add: M = [[A[0][0] + B[0][0], A[0][1] + B[0][1]], [A[1][0] + B[1][0], A[1][1] + B[1][1]]];
  // matrix product AB
  const mult: M = [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
  ];
  const result = op === "scale" ? scale : op === "add" ? add : mult;

  const setCell = (which: "A" | "B", i: number, j: number, d: number) => {
    const upd = (m: M): M => m.map((row, ri) => row.map((v, ci) => (
      ri === i && ci === j ? Math.max(MATRIX_ENTRY_MIN, Math.min(MATRIX_ENTRY_MAX, v + d)) : v
    ))) as M;
    which === "A" ? setA(upd(A)) : setB(upd(B));
  };

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>matrix</strong>{" "}is a rectangular array of numbers — a compact
        way to store and transform data. You can <strong>scale</strong>{" "}it,{" "}
        <strong>add</strong>{" "}two of the same size, and <strong>multiply</strong>{" "}
        compatible matrices when the first matrix&apos;s column count equals the
        second&apos;s row count, using the row-times-column rule.
      </p>

      <Figure caption="Scaling and adding act entry by entry. Multiplication pairs each row of A with each column of B.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-2">
            {(["scale", "add", "mult"] as Op[]).map((o) => (
              <button key={o} type="button" onClick={() => setOp(o)} aria-label={o === "scale" ? "Scale A" : o === "add" ? "Add A and B" : "Multiply A by B"} aria-pressed={op === o} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={op === o ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>
                {o === "scale" ? `${k}·A` : o === "add" ? "A + B" : "A · B"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Matrix m={A} editable which="A" onCell={setCell} label="A" />
            <span className="text-2xl font-black">{op === "scale" ? `× ${k}` : op === "add" ? "+" : "×"}</span>
            {op !== "scale" && <Matrix m={B} editable which="B" onCell={setCell} label="B" />}
            <span className="text-2xl font-black">=</span>
            <Matrix m={result} label="result" accent />
          </div>

          {op === "scale" && <Stepper label="scalar k" value={k} onChange={setK} />}
          <p className="m-0 max-w-lg text-center text-xs text-[var(--ink-faint)]">
            {op === "scale"
              ? "Use A's − and + controls to change its entries, and the scalar controls to change k."
              : "Use − and + to change any entry of A or B."}
          </p>
        </div>
      </Figure>

      {op === "scale" ? (
        <>
          <h2>Scale every entry</h2>
          <p>
            Scalar multiplication applies the same factor to every entry. The
            top-left entry is {factorText(k)}·{factorText(A[0][0])} = {integerText(scale[0][0])}.
          </p>
        </>
      ) : op === "add" ? (
        <>
          <h2>Add matching entries</h2>
          <p>
            Matrix addition combines entries in the same position. The top-left
            entry is {additionWork(A[0][0], B[0][0])} = {integerText(add[0][0])}.
          </p>
        </>
      ) : (
        <>
          <h2>Row times column</h2>
          <p>
            Each entry of A·B is a <strong>row of A dotted with a column of B</strong>:
            the top-left is {factorText(A[0][0])}·{factorText(B[0][0])} + {factorText(A[0][1])}·{factorText(B[1][0])} = {integerText(mult[0][0])}.
          </p>
        </>
      )}

      <MathCheck>
        <p>
          Matrices <strong>organize data</strong>{" "}in rows and columns (N-VM.6).
          <strong>Scalar multiplication</strong>{" "}multiplies every entry (N-VM.7),
          and same-size matrices <strong>add and subtract</strong>{" "}(N-VM.8).
          Matrix multiplication is defined by the row-by-column dot product,
          so the number of columns of A must match the rows of B.
        </p>
      </MathCheck>
    </div>
  );
}

function Matrix({ m, editable, which, onCell, label, accent }: { m: M; editable?: boolean; which?: "A" | "B"; onCell?: (w: "A" | "B", i: number, j: number, d: number) => void; label?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-stretch">
        <span className="w-1.5 rounded-l border-2 border-r-0" style={{ borderColor: accent ? ACCENT : "var(--ink-soft)" }} />
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 px-2 py-1.5 font-mono text-lg font-bold">
          {m.map((row, i) => row.map((v, j) => (
            // Decrementing used to need shift-click or right-click, neither of
            // which exists on a touch screen: on a tablet an entry could only
            // ever go up. Both directions are buttons now.
            editable && which && onCell ? (
              <div key={`${i}-${j}`} className="flex items-center gap-0.5">
                <button type="button" onClick={() => onCell(which, i, j, -1)} disabled={v <= MATRIX_ENTRY_MIN} className="h-5 w-5 rounded border border-[var(--line)] bg-[var(--surface)] text-xs font-bold leading-none disabled:opacity-40" aria-label={`Decrease ${label ?? which} row ${i + 1} column ${j + 1}`}>−</button>
                <span className="w-6 text-center tabular-nums">{v}</span>
                <button type="button" onClick={() => onCell(which, i, j, 1)} disabled={v >= MATRIX_ENTRY_MAX} className="h-5 w-5 rounded border border-[var(--line)] bg-[var(--surface)] text-xs font-bold leading-none disabled:opacity-40" aria-label={`Increase ${label ?? which} row ${i + 1} column ${j + 1}`}>+</button>
              </div>
            ) : (
              <span key={`${i}-${j}`} className="w-8 text-center" style={{ color: accent ? ACCENT : "var(--ink)" }}>{v}</span>
            )
          )))}
        </div>
        <span className="w-1.5 rounded-r border-2 border-l-0" style={{ borderColor: accent ? ACCENT : "var(--ink-soft)" }} />
      </div>
      {label && <span className="text-xs font-bold text-[var(--ink-faint)]">{label}</span>}
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(-4, value - 1))} disabled={value <= -4} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-8 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(5, value + 1))} disabled={value >= 5} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
