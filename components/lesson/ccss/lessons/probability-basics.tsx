"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";

export default function Lesson() {
  const [heads, setHeads] = useState(0);
  const [total, setTotal] = useState(0);

  const flip = (n: number) => {
    let h = 0;
    for (let i = 0; i < n; i++) if (Math.random() < 0.5) h++;
    setHeads((prev) => prev + h);
    setTotal((prev) => prev + n);
  };

  const exp = total > 0 ? heads / total : null;
  const decimalExact = exp !== null && Math.abs(exp * 1000 - Math.round(exp * 1000)) < 1e-9;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        <strong>Probability</strong>{" "}is a number from <strong>0</strong>{" "}
        (impossible) to <strong>1</strong>{" "}(certain) that measures how likely an
        event is. You can estimate it by <strong>experiment</strong>{" "}— do it many
        times and track how often it happens.
      </p>

      <Figure caption="Flip a fair coin many times. The experimental probability of heads settles near ½.">
        <div className="flex flex-col items-center gap-6">
          {/* 0-1 scale */}
          <div className="w-full max-w-md">
            <div className="relative h-3 rounded-full" style={{ background: "linear-gradient(to right, var(--surface-2), var(--band-upper))" }}>
              {exp !== null && (
                <div className="absolute -top-1 h-5 w-1 rounded" style={{ left: `${exp * 100}%`, background: ACCENT }} />
              )}
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-semibold text-[var(--ink-faint)]">
              <span>0 impossible</span><span>½ as likely as not</span><span>1 certain</span>
            </div>
          </div>

          <div className="text-8xl">🪙</div>

          <div className="rounded-2xl border-2 px-8 py-3 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-mono text-2xl font-black" style={{ color: ACCENT }}>
              {exp !== null ? `${heads} / ${total} ${decimalExact ? "=" : "≈"} ${exp.toFixed(3)}` : "flip to begin"}
            </div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">
              experimental P(heads){exp === null ? " is undefined until the first flip" : " — theory says 0.5"}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => flip(1)} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold">Flip once</button>
            <button type="button" onClick={() => flip(50)} className="rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: ACCENT }}>Flip 50×</button>
            <button type="button" onClick={() => { setHeads(0); setTotal(0); }} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)]">Reset</button>
          </div>
        </div>
      </Figure>

      <h2>Experiment approaches theory</h2>
      <p>
        A few flips can be lopsided. Over many independent repetitions, the
        experimental proportion tends toward the theoretical <strong>½</strong>,
        although it need not get closer after every additional flip. This is the{" "}
        <strong>law of large numbers</strong>.
      </p>

      <MathCheck>
        <p>
          Probability is a number between <strong>0 and 1</strong>{" "}describing
          likelihood — near 0 is unlikely, near 1 is likely, ½ is as likely as not
          (7.SP.C.5). The <strong>experimental probability</strong>{" "}is the relative
          frequency (successes ÷ trials). Across repeated experiments, larger
          numbers of trials tend to give estimates with less variability around
          the true probability (7.SP.C.6).
        </p>
      </MathCheck>
    </div>
  );
}
