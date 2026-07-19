"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

const TYPES = [
  { name: "Survey", concl: "Estimates a population value.", desc: "Ask a random sample and generalize to the population. Needs random sampling to be unbiased. Cannot show causation.", ex: "Poll 500 voters to estimate approval." },
  { name: "Observational study", concl: "Finds associations, not causes.", desc: "Observe groups as they are, measuring variables without intervening. Lurking variables can confound, so it shows correlation, not cause.", ex: "Compare health of coffee drinkers vs not." },
  { name: "Experiment", concl: "Can establish causation.", desc: "Randomly assign subjects to treatments and compare. Randomization balances lurking variables, so a difference can be attributed to the treatment.", ex: "Randomly give a drug or placebo, compare." },
];

export default function Lesson() {
  const [idx, setIdx] = useState(2);
  const t = TYPES[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        <em>How</em>{" "}data is collected decides what you may conclude. A{" "}
        <strong>survey</strong>{" "}estimates a population value; an{" "}
        <strong>observational study</strong>{" "}finds associations; only a{" "}
        <strong>randomized experiment</strong>{" "}can establish <strong>cause</strong>.
      </p>

      <Figure caption="Match the study type to the question — only randomized experiments support causal claims.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {TYPES.map((ty, i) => (
              <button key={ty.name} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{ty.name}</button>
            ))}
          </div>

          <div className="rounded-2xl border-2 px-6 py-4 text-center" style={{ borderColor: ACCENT }}>
            <div className="text-lg font-black" style={{ color: ACCENT }}>{t.concl}</div>
            <div className="mt-2 max-w-md text-sm text-[var(--ink-soft)]">{t.desc}</div>
            <div className="mt-2 rounded-lg bg-[var(--surface-2)] px-4 py-1 font-mono text-xs">e.g. {t.ex}</div>
          </div>
        </div>
      </Figure>

      <h2>Randomization is the key</h2>
      <p>
        The difference between an observational study and an experiment is{" "}
        <strong>intervention plus random assignment</strong>. Randomly assigning
        treatments balances out lurking variables, so any difference in outcome can be
        blamed on the treatment. Without it — as in a survey or observational study —
        you can only report associations, never causes.
      </p>

      <MathCheck>
        <p>
          <strong>Surveys</strong>{" "}(sample surveys), <strong>observational
          studies</strong>, and <strong>experiments</strong>{" "}serve different purposes
          (S-IC.3). Random <strong>sampling</strong>{" "}allows generalizing to a
          population; random <strong>assignment</strong>{" "}in an experiment allows
          causal conclusions. Confusing the two leads to overclaiming from data.
        </p>
      </MathCheck>
    </div>
  );
}
