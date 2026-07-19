"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";

export default function Lesson() {
  const [step, setStep] = useState(10);
  const [count, setCount] = useState(6); // number of terms shown beyond 0

  const maxCount = Math.min(count, Math.floor(1000 / step));
  const seq = Array.from({ length: maxCount + 1 }, (_, i) => i * step);
  const current = seq[seq.length - 1];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Counting one at a time is slow. <strong>Skip-counting</strong>{" "}jumps by
        the same amount each time — by <strong>5s</strong>, <strong>10s</strong>,
        or <strong>100s</strong>. It builds a pattern you can see and hear.
      </p>

      <Figure caption="Each jump adds the same amount. Watch which digit changes.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {[5, 10, 100].map((s) => (
              <button key={s} type="button" onClick={() => { setStep(s); setCount(6); }} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={step === s ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>by {s}s</button>
            ))}
          </div>

          <div className="text-5xl font-black" style={{ color: ACCENT }}>{current}</div>

          <div className="flex max-w-xl flex-wrap justify-center gap-1.5">
            {seq.map((v, i) => (
              <span key={i} className="rounded-lg px-2.5 py-1 font-mono text-sm font-bold" style={{ background: i === seq.length - 1 ? ACCENT : "var(--surface-2)", color: i === seq.length - 1 ? "white" : "var(--ink-soft)" }}>{v}</span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} disabled={maxCount <= 1} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold disabled:opacity-40">− jump</button>
            <button type="button" onClick={() => setCount((c) => c + 1)} disabled={current + step > 1000} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>+ jump</button>
          </div>
        </div>
      </Figure>

      <h2>Same jump, clear pattern</h2>
      <p>
        Skip-counting by {step} adds {step} every time. Counting by 5s ends in 0
        or 5; by 10s the tens digit climbs; by 100s the hundreds digit climbs.
        The pattern makes big numbers easy to reach.
      </p>

      <MathCheck>
        <p>
          Counting within 1000 and <strong>skip-counting by 5s, 10s, and 100s</strong>{" "}
          is 2.NBT.A.2. Each jump adds a fixed amount, so skip-counting is really
          repeated addition of {step} — a pattern that previews multiplication and
          place value.
        </p>
      </MathCheck>
    </div>
  );
}
