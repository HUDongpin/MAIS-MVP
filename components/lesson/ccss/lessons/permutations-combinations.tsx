"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

function fact(n: number): number { return n <= 1 ? 1 : n * fact(n - 1); }
function nPr(n: number, r: number) { return fact(n) / fact(n - r); }
function nCr(n: number, r: number) { return nPr(n, r) / fact(r); }

export default function Lesson() {
  const [n, setN] = useState(5);
  const [r, setR] = useState(3);
  const [ordered, setOrdered] = useState(true);

  const count = ordered ? nPr(n, r) : nCr(n, r);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        How many ways can you choose r things from n? It depends on whether{" "}
        <strong>order matters</strong>. A <strong>permutation</strong>{" "}counts ordered
        arrangements (a race podium); a <strong>combination</strong>{" "}counts unordered
        selections (a committee).
      </p>

      <Figure caption="Order matters → permutations (nPr). Order doesn't → combinations (nCr).">
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-2">
            <button type="button" onClick={() => setOrdered(true)} className="rounded-lg border px-4 py-1.5 text-sm font-bold" style={ordered ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>Order matters (nPr)</button>
            <button type="button" onClick={() => setOrdered(false)} className="rounded-lg border px-4 py-1.5 text-sm font-bold" style={!ordered ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>Order doesn&apos;t (nCr)</button>
          </div>

          <div className="rounded-2xl border-2 px-8 py-4 text-center font-mono" style={{ borderColor: ACCENT }}>
            {ordered ? (
              <div className="text-lg">{n}P{r} = {n}! / ({n}−{r})! = <span className="text-2xl font-black" style={{ color: ACCENT }}>{count}</span></div>
            ) : (
              <div className="text-lg">{n}C{r} = {n}! / ({r}!·({n}−{r})!) = <span className="text-2xl font-black" style={{ color: ACCENT }}>{count}</span></div>
            )}
            <div className="mt-1 text-sm text-[var(--ink-soft)]">
              {ordered ? `ordered arrangements of ${r} from ${n}` : `unordered selections of ${r} from ${n}`}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="n (total)" value={n} min={2} max={9} onChange={(v) => setN(Math.max(v, r))} />
            <Stepper label="r (chosen)" value={r} min={1} max={n} onChange={setR} />
          </div>
        </div>
      </Figure>

      <h2>Order is everything</h2>
      <p>
        Picking 3 from 5 in order gives {nPr(n, 3) && nPr(5, 3)} → generally nPr = n!/(n−r)!.
        Ignoring order divides out the r! rearrangements of each group, giving nCr =
        n!/(r!(n−r)!). To turn counts into probabilities, put the number of favorable
        arrangements over the total — that&apos;s how lotteries and card hands are
        computed.
      </p>

      <MathCheck>
        <p>
          <strong>Permutations</strong>{" "}(nPr = n!/(n−r)!) count ordered arrangements;{" "}
          <strong>combinations</strong>{" "}(nCr = n!/(r!(n−r)!)) count unordered
          selections (S-CP.9). Dividing favorable outcomes by total outcomes — often
          computed with these formulas — yields probabilities for complex events like
          card hands and lotteries.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-8 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
