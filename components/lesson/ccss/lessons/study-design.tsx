"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

const TYPES = [
  { name: "Survey", concl: "Estimates a population value.", desc: "Use an appropriate probability sample to support generalization and reduce selection bias. Sampling and nonresponse problems can still bias an estimate. A survey alone cannot show causation.", ex: "Poll a probability sample of 500 voters to estimate approval." },
  { name: "Observational study", concl: "Finds associations, not causes.", desc: "Observe groups as they are, measuring variables without intervening. Lurking variables can confound, so it shows correlation, not cause.", ex: "Compare health of coffee drinkers vs not." },
  { name: "Experiment", concl: "Can support causal inference.", desc: "Randomly assign subjects to treatments and compare. Randomization makes groups comparable in expectation; with valid implementation and appropriate chance analysis, outcome differences can support a treatment-effect conclusion.", ex: "Randomly give a drug or placebo, compare." },
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
        well-designed <strong>randomized experiment</strong>{" "}can support a
        <strong>causal inference</strong>{" "}under its design assumptions.
      </p>

      <Figure caption="Match the study type to the question — only randomized experiments support causal claims.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {TYPES.map((ty, i) => (
              <button key={ty.name} type="button" onClick={() => setIdx(i)} aria-pressed={idx === i} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{ty.name}</button>
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
        treatments makes the groups comparable in expectation. With valid
        implementation, no important interference or attrition problems, and a
        difference unlikely under chance assignment, the study can support a
        treatment-effect conclusion. Without random assignment, a difference may
        reflect confounding, so association alone is not a causal result.
      </p>

      <MathCheck>
        <p>
          <strong>Surveys</strong>{" "}(sample surveys), <strong>observational
          studies</strong>, and <strong>experiments</strong>{" "}serve different purposes
          (S-IC.3). Appropriate probability <strong>sampling</strong>{" "}supports
          generalizing to the sampled population when coverage, response, and
          implementation are adequate; random <strong>assignment</strong>{" "}in an
          experiment supports causal conclusions when the experiment is well
          conducted and the observed evidence is assessed against chance.
          Confusing the two leads to overclaiming from data.
        </p>
      </MathCheck>
    </div>
  );
}
