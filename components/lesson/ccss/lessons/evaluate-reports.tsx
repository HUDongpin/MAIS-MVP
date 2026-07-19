"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const FLAG = "var(--band-upper)";

const CLAIMS = [
  { headline: "\"90% of dentists recommend BrightPaste!\"", issue: "How were dentists chosen? A biased or tiny sample, or a leading question, makes 90% meaningless.", ask: "Was the sample random and representative?" },
  { headline: "\"Coffee drinkers live longer, study finds.\"", issue: "Observational — coffee drinkers may exercise more or be wealthier. Correlation, not proven causation.", ask: "Was it a randomized experiment?" },
  { headline: "\"New app boosts scores by 40%!\"", issue: "40% of what? No control group, no sample size, no margin of error stated.", ask: "Compared to what, and how many people?" },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const c = CLAIMS[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Headlines love statistics — but a healthy skeptic asks <em>how the data was
        collected</em>. Was the sample random? Was there a control group? Is it an
        experiment or just a correlation? <strong>Evaluating reports</strong>{" "}is a
        core life skill.
      </p>

      <Figure caption="For each claim, ask the critical question before believing the number.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {CLAIMS.map((cl, i) => (
              <button key={i} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>Claim {i + 1}</button>
            ))}
          </div>

          <div className="rounded-2xl border-2 px-6 py-4 text-center" style={{ borderColor: FLAG }}>
            <div className="text-lg font-black">{c.headline}</div>
            <div className="mt-3 text-sm text-[var(--ink-soft)]"><strong style={{ color: FLAG }}>Red flag:</strong>{" "}{c.issue}</div>
            <div className="mt-2 rounded-lg bg-[var(--surface-2)] px-4 py-1.5 text-sm font-bold">Ask: {c.ask}</div>
          </div>
        </div>
      </Figure>

      <h2>Questions a skeptic asks</h2>
      <p>
        Who was studied, and how were they selected? Was it a randomized experiment or
        an observational study? What&apos;s the sample size and margin of error? Is
        there a control group? Could a lurking variable explain the result? A number
        without this context — like "{c.headline}" — deserves doubt, not headlines.
      </p>

      <MathCheck>
        <p>
          <strong>Evaluating reports based on data</strong>{" "}(S-IC.6): scrutinize the
          data-collection method, sampling, presence of a control group, sample size,
          and whether the design supports the claim. Distinguish{" "}
          <strong>association from causation</strong>, and watch for bias, missing
          context, and misleading graphics.
        </p>
      </MathCheck>
    </div>
  );
}
