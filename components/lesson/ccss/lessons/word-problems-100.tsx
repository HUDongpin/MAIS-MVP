"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import {
  buildWordProblemTapeDiagram,
  updateWordProblemStoryState,
  wordProblemStoryControlLimits,
  type WordProblemTapeSegment,
  type WordProblemTapeStage,
  type WordProblemStoryAction,
  type WordProblemStoryState
} from "@/components/lesson/ccss/lessons/wordProblemTapeDiagram";

const A = "var(--band-middle)";
const B = "var(--band-early)";
const CC = "var(--band-high)";

export default function Lesson() {
  const [story, setStory] = useState<WordProblemStoryState>({
    changed: 18,
    landed: 12,
    start: 45,
    twoStep: false
  });
  const limits = wordProblemStoryControlLimits(story);
  const diagram = buildWordProblemTapeDiagram({
    added: story.changed,
    landed: story.landed,
    start: story.start,
    twoStep: story.twoStep
  });

  function changeStory(action: WordProblemStoryAction) {
    setStory((current) => updateWordProblemStoryState(current, action));
  }

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Word problems are math hiding inside a story. A <strong>tape diagram</strong>{" "}
        (a bar) helps you see what to add and what to take away — even when the
        story has <strong>two steps</strong>.
      </p>

      <Figure caption="The bars show the amounts. Read the story, then add or subtract.">
        <div className="flex flex-col items-center gap-6">
          <div role="group" aria-label="Choose a word-problem story" className="flex items-center gap-2">
            {[false, true].map((v) => (
              <button key={String(v)} type="button" aria-pressed={story.twoStep === v} onClick={() => changeStory({ type: "set-mode", twoStep: v })} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={story.twoStep === v ? { background: A, color: "white", borderColor: A } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{v ? "Two step" : "One step"}</button>
            ))}
          </div>

          <p className="m-0 max-w-md text-center text-lg font-semibold">
            {story.twoStep
              ? <>{story.start} birds sat on a wire. {diagram.removed} flew away. Then {story.landed} more landed. How many birds now?</>
              : <>The library had {story.start} books. {story.changed} more were donated. How many books in all?</>}
          </p>

          {/* tape diagram */}
          <div
            data-word-problem-tape={story.twoStep ? "two-step" : "one-step"}
            className="flex w-full max-w-lg flex-col gap-5"
          >
            {diagram.stages.map((stage) => (
              <TapeStage key={stage.id} scaleTotal={diagram.scaleTotal} stage={stage} />
            ))}
          </div>

          <div className="font-mono text-2xl font-black" data-word-problem-equation aria-live="polite" aria-atomic="true">
            {diagram.equation.slice(0, diagram.equation.lastIndexOf(" = "))} ={" "}
            <span style={{ color: A }}>{diagram.answer}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Start" value={story.start} min={limits.startMin} max={limits.startMax} color={A} onChange={(value) => changeStory({ type: "set-start", value })} />
            <Stepper label={story.twoStep ? "Flew away" : "Added"} value={story.changed} min={limits.changedMin} max={limits.changedMax} color={B} onChange={(value) => changeStory({ type: "set-changed", value })} />
            {story.twoStep && <Stepper label="Landed" value={story.landed} min={limits.landedMin} max={limits.landedMax} color={CC} onChange={(value) => changeStory({ type: "set-landed", value })} />}
          </div>
        </div>
      </Figure>

      <h2>One step or two</h2>
      <p>
        A one-step problem needs a single add or subtract. A two-step problem
        makes you do one operation, then use that answer in the next. The bar
        keeps track of the amounts.
      </p>

      <MathCheck>
        <p>
          Using addition and subtraction within 100 to solve one- and two-step
          word problems — putting together, taking apart, and comparing — is
          2.OA.A.1. A <strong>tape diagram</strong>{" "}models the story so you can
          choose the right operations{story.twoStep
            ? `: first ${diagram.stages[0]?.equation}, then ${diagram.stages[1]?.equation}`
            : `: ${diagram.equation}`}.
        </p>
      </MathCheck>
    </div>
  );
}

function colorForSegment(id: WordProblemTapeSegment["id"]) {
  if (id === "flew-away" || id === "added") return B;
  if (id === "landed") return CC;
  return A;
}

function TapeStage({
  scaleTotal,
  stage
}: {
  scaleTotal: number;
  stage: WordProblemTapeStage;
}) {
  const stageWidth = `${(stage.total / scaleTotal) * 100}%`;
  const columns = stage.segments
    .map((segment) => `minmax(0, ${segment.value}fr)`)
    .join(" ");

  return (
    <section data-word-problem-tape-stage={stage.id} className="min-w-0 w-full">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-xs font-black uppercase tracking-wide text-[var(--ink-faint)]">{stage.label}</span>
        <span className="font-mono text-sm font-bold text-[var(--ink-soft)]">{stage.equation}</span>
      </div>
      <div data-word-problem-tape-bar={stage.id} className="max-w-full" style={{ width: stageWidth }}>
        <div
          role="img"
          aria-label={stage.ariaLabel}
          data-tape-total={stage.total}
          className="grid min-h-12 min-w-0 w-full overflow-hidden rounded-xl border-2 border-white shadow-sm"
          style={{ gridTemplateColumns: columns }}
        >
          {stage.segments.map((segment, index) => (
            <span
              key={segment.id}
              aria-hidden="true"
              data-word-problem-tape-segment={segment.id}
              data-tape-value={segment.value}
              className={`grid min-w-0 place-items-center overflow-hidden px-1 text-xs font-black text-white ${index ? "border-l-2 border-white" : ""}`}
              style={{ background: colorForSegment(segment.id) }}
            >
              <span className="max-w-full truncate rounded-md bg-black/60 px-1.5 py-0.5 text-white">{segment.value}</span>
            </span>
          ))}
        </div>
        <div aria-hidden="true" className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[var(--ink-faint)]">
          {stage.segments.map((segment) => (
            <span key={segment.id} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorForSegment(segment.id) }} />
              {segment.value} {segment.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stepper({ label, value, min, max, color, onChange }: { label: string; value: number; min: number; max: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-11 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-11 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
