"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const TRUE_P = 0.6; // true population proportion

export default function Lesson() {
  const [samples, setSamples] = useState<number[]>([]); // list of sample proportions (×100)

  const draw = () => {
    // sample 20, count successes with prob TRUE_P — Math.random only in handler
    let hits = 0;
    for (let i = 0; i < 20; i++) if (Math.random() < TRUE_P) hits++;
    setSamples((s) => [...s, Math.round((hits / 20) * 100)]);
  };

  const exactMean = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
  const mean = Math.round(exactMean);
  const meanIsWhole = Math.abs(exactMean - mean) < 1e-9;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Statistics reasons from a <strong>sample</strong>{" "}to the whole{" "}
        <strong>population</strong>. A single sample need not exactly match the truth
        — but samples <strong>vary predictably</strong>{" "}around it. Watch many
        samples cluster near the true value of {Math.round(TRUE_P * 100)}%.
      </p>

      <Figure caption="Each draw of 20 gives a sample proportion. They scatter around the true 60% — that's sampling variability.">
        <div className="flex flex-col items-center gap-6">
          <button type="button" onClick={draw} className="rounded-lg px-5 py-2 font-bold text-white" style={{ background: ACCENT }}>Draw a sample of 20</button>

          <div className="w-full max-w-md">
            <div
              className="flex h-24 items-end gap-1 overflow-x-auto rounded-lg bg-[var(--surface-2)] p-2"
              role="img"
              aria-label={
                samples.length === 0
                  ? "Chart of sample proportions, currently empty"
                  : samples.length === 1
                    ? `Chart of sample proportions: one bar at ${samples[0]}%`
                    : `Chart of ${samples.length} sample proportions, ranging from ${Math.min(...samples)}% to ${Math.max(...samples)}%, averaging ${meanIsWhole ? "" : "approximately "}${mean}%${meanIsWhole ? "" : " to the nearest whole percent"}`
              }
            >
              {samples.length === 0 && <span className="m-auto text-sm text-[var(--ink-faint)]">Click to start sampling…</span>}
              {samples.map((p, i) => (
                <div key={i} className="w-3 flex-shrink-0 rounded-t" style={{ height: `${p}%`, background: ACCENT }} title={`${p}%`} />
              ))}
            </div>
            <div className="mt-1 text-center text-xs text-[var(--ink-faint)]">each bar = one sample&apos;s proportion (0–100%)</div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center font-mono text-sm">
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">samples drawn<br /><strong>{samples.length}</strong></div>
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">
              average of samples<br />
              <strong style={{ color: ACCENT }}>{samples.length ? `${meanIsWhole ? "=" : "≈"} ${mean}%` : "—"}</strong>
              {samples.length > 0 && !meanIsWhole && <><br /><span className="text-[10px] text-[var(--ink-faint)]">nearest whole percent</span></>}
            </div>
          </div>
        </div>
      </Figure>

      <h2>Inference and simulation</h2>
      <p>
        A single sample can equal the population proportion by chance, but it need
        not. Across many independent samples, their average tends toward the true
        60% — and estimates from bigger samples tend to vary less. This is the basis of{" "}
        <strong>inference</strong>: estimating a population value with a{" "}
        <strong>margin of error</strong>. Simulation also tests models: if a coin
        claimed fair produced a result that is rare in simulations under the fair
        model, the data would cast doubt on that model.
      </p>

      <MathCheck>
        <p>
          Statistics is the practice of <strong>drawing conclusions about a
          population from a random sample</strong>{" "}(S-IC.1), accepting that samples
          vary. <strong>Simulation</strong>{" "}decides whether a proposed model is{" "}
          <strong>consistent with observed data</strong>{" "}(S-IC.2): results far out in
          the simulated distribution cast doubt on the model.
        </p>
      </MathCheck>
    </div>
  );
}
