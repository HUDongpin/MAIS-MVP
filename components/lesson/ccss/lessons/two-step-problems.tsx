"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const STEP1 = "var(--band-middle)";
const STEP2 = "var(--band-upper)";
const penCount = (count: number) => `${count} pen${count === 1 ? "" : "s"}`;

export default function Lesson() {
  const [packs, setPacks] = useState(4);
  const [per, setPer] = useState(6);
  const [give, setGive] = useState(5);

  const made = packs * per;
  const left = made - give;
  const estimatedMade = made < 10 ? made : Math.round(made / 10) * 10;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>two-step problem</strong>{" "}needs two connected operations. Read
        the situation to decide what must be found first. Here, find how many pens
        were bought before subtracting the pens given away.
      </p>

      <Figure caption="First find how many pens were bought, then subtract the pens given away. The story determines the two steps.">
        <div className="flex flex-col items-center gap-6">
          <p className="m-0 max-w-md text-center text-lg font-semibold">
            You buy <strong>{packs}</strong>{" "}pack{packs === 1 ? "" : "s"} of pens with{" "}
            <strong>{per}</strong>{" "}pen{per === 1 ? "" : "s"} in each. You give{" "}
            <strong>{give}</strong>{" "}pen{give === 1 ? "" : "s"} to friends. How many
            pens do you keep?
          </p>

          <div className="flex flex-col items-center gap-3">
            <div className="rounded-xl border-2 px-5 py-2" style={{ borderColor: STEP1 }}>
              <span className="text-xs font-bold uppercase" style={{ color: STEP1 }}>Step 1 · multiply</span>
              <div className="font-mono text-lg font-black">{packs} × {per} = {made} pen{made === 1 ? "" : "s"}</div>
            </div>
            <span className="text-[var(--ink-faint)]">↓</span>
            <div className="rounded-xl border-2 px-5 py-2" style={{ borderColor: STEP2 }}>
              <span className="text-xs font-bold uppercase" style={{ color: STEP2 }}>Step 2 · subtract</span>
              <div className="font-mono text-lg font-black">{made} − {give} = {left} pen{left === 1 ? "" : "s"}</div>
            </div>
          </div>

          <div className="rounded-xl bg-[var(--surface-2)] px-5 py-3 text-center">
            <div className="font-mono text-lg font-black">
              (<span style={{ color: STEP1 }}>{packs} × {per}</span>) − {give} = <span style={{ color: STEP2 }}>{left}</span>
            </div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">Multiply first here because that finds all the pens before any are given away.</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* Re-clamp `give` when the total shrinks. Without it the story could
                describe giving away more pens than you bought and keeping a
                negative number — "1 × 1 = 1 pens", then "1 − 5 = −4 pens". */}
            <Stepper label="Packs" value={packs} min={1} max={8} onChange={(v) => { setPacks(v); setGive((g) => Math.min(g, v * per)); }} />
            <Stepper label="Pens each" value={per} min={1} max={9} onChange={(v) => { setPer(v); setGive((g) => Math.min(g, packs * v)); }} />
            <Stepper label="Give away" value={give} min={0} max={made} onChange={setGive} />
          </div>
        </div>
      </Figure>

      <h2>The story sets the order</h2>
      <p>
        {/* At give = 0 the two groupings agree, so the contrast is false. */}
        {give === 0 ? (
          <>With nothing given away the two groupings happen to agree. Raise{" "}
          <em>Give away</em>{" "}above 0 and they part company — that is when the
          order starts to matter.</>
        ) : give <= per ? (
          <>Subtracting {give} from the number in each pack would describe a
          different story — giving away {penCount(give)} from every pack. This story
          gives away {penCount(give)} only once, after counting all {penCount(made)}.
          That is why <strong>{packs} × {per} − {give} = {left}</strong>, not{" "}
          {packs} × ({per} − {give}) = {packs * (per - give)}.</>
        ) : (
          <>This story gives away {penCount(give)} once, after counting all {penCount(made)}.
          Putting the subtraction inside the multiplication would mean
          taking {penCount(give)} from <em>each</em>{" "}pack, but each pack contains only
          {per}. That is not a valid whole-number version of this story, so keep
          the correct grouping: <strong>{packs} × {per} − {give} = {left}</strong>.</>
        )}
      </p>

      <MathCheck>
        <p>
          Two-step word problems use two of the four operations (3.OA.D.8). An
          equation must preserve what each quantity means. In this story,{" "}
          <strong>{packs} × {per} − {give}</strong>{" "}means &ldquo;find all {penCount(made)},
          then subtract {give}&rdquo; to get {left}. This also follows the conventional
          order of operations for the written expression. Estimating {packs} × {per}{" "}
          as about {estimatedMade} helps check the first step before you subtract
          the {penCount(give)} given away.
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
        <span className="w-7 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
