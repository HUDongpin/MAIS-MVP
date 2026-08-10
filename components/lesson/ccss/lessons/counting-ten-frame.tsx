"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
  "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];

const MAX = 20;

function TenFrame({
  offset,
  count,
  onSet,
}: {
  offset: number;
  count: number;
  onSet: (n: number) => void;
}) {
  return (
    <div
      className="grid gap-1.5 rounded-2xl border-2 border-[var(--line)] bg-[var(--surface)] p-2"
      style={{ gridTemplateColumns: "repeat(5, 2.5rem)", gridAutoRows: "2.5rem" }}
    >
      {Array.from({ length: 10 }, (_, i) => {
        const index = offset + i; // 0-based position in the full 0..19 sequence
        const filled = index < count;
        const isLast = index === count - 1;
        return (
          <button
            key={index}
            type="button"
            onClick={() => onSet(index + 1)}
            // The button fills the frame UP TO this spot; it never empties this
            // one, so aria-pressed stayed true after activating it.
            aria-label={`Fill up to ${index + 1}${filled ? ", currently filled" : ", currently empty"}`}
            className="h-10 w-10 rounded-full border-2 transition-transform active:scale-90"
            style={{
              borderColor: "var(--line)",
              background: filled
                ? "var(--band-early)"
                : "var(--surface-2)",
              boxShadow: isLast
                ? "0 0 0 4px color-mix(in oklab, var(--band-early) 35%, transparent)"
                : "none",
            }}
          />
        );
      })}
    </div>
  );
}

export default function Lesson() {
  const [count, setCount] = useState(4);

  const set = (n: number) => setCount(Math.max(0, Math.min(MAX, n)));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>ten-frame</strong>{" "}is a box with ten spots. When we count, we
        put in one counter for each thing — and we say one number for each
        counter. Tap the spots to fill them, or use the buttons.
      </p>

      <Figure caption="Tap a spot to fill up to it, or use “Add one” and “Take one away.”">
        <div className="flex flex-col items-center gap-6">
          <div
            className="text-center leading-none"
            aria-live="polite"
            aria-atomic
          >
            <div
              className="font-black tabular-nums"
              style={{ fontSize: "4.5rem", color: "var(--band-early)" }}
            >
              {count}
            </div>
            <div className="mt-1 text-lg font-semibold capitalize text-[var(--ink-soft)]">
              {NUMBER_WORDS[count]}
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-center gap-4">
            <TenFrame offset={0} count={count} onSet={set} />
            <TenFrame offset={10} count={count} onSet={set} />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set(count - 1)}
              disabled={count === 0}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] disabled:opacity-40"
            >
              − Take one away
            </button>
            <button
              type="button"
              onClick={() => set(count + 1)}
              disabled={count === MAX}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--band-early)" }}
            >
              + Add one
            </button>
            <button
              type="button"
              onClick={() => set(0)}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--ink-soft)]"
            >
              Reset
            </button>
          </div>

          {count === 10 && (
            <p className="m-0 text-center text-sm font-semibold text-[var(--band-early)]">
              🎉 The first ten-frame is full — that&apos;s a whole ten!
            </p>
          )}
        </div>
      </Figure>

      <h2>The last number tells how many</h2>
      <p>
        {count === 0 ? (
          <>There are no counters to point to, so the total is <strong>zero</strong>.</>
        ) : (
          <>Point to each counter and say the numbers in order: one, two, three…
          The <strong>last</strong>{" "}number you say is how many counters there are
          in all. That is what a count <em>means</em>.</>
        )}
      </p>

      <MathCheck>
        <p>
          Counting works because we match <strong>one number word to one
          object</strong>, in order, with none skipped and none counted twice.
          For a nonempty group, the final word in the sequence is the total;
          an empty group has a total of zero. This is the idea of{" "}
          <strong>cardinality</strong>{" "}(K.CC.B.4). The ten-frame also shows{" "}
          <strong>10 = 5 + 5</strong>{" "}and helps us see a teen number as{" "}
          <em>ten and some more</em>{" "}(for example, 14 is one full ten and 4
          more).
        </p>
      </MathCheck>
    </div>
  );
}
