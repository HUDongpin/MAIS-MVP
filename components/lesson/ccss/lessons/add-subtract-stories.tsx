"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Mode = "join" | "separate" | "three";
const A = "var(--band-early)";
const B = "var(--band-middle)";
const CC = "var(--band-high)";

export default function Lesson() {
  const [mode, setMode] = useState<Mode>("join");
  const [a, setA] = useState(6);
  const [b, setB] = useState(5);
  const [c, setC] = useState(3);

  // Clamp first, then compute from the clamped value. The story and the number
  // sentence already rendered bSafe while the answer used the raw b, so lowering
  // First below Second printed "1 − 1 = -11" in a Grade 1 lesson (1.OA.A.1).
  const bSafe = mode === "separate" ? Math.min(b, a) : b;
  const answer = mode === "join" ? a + bSafe : mode === "separate" ? a - bSafe : a + bSafe + c;

  function changeMode(nextMode: Mode) {
    if (nextMode === "join") {
      setB(Math.min(Math.max(b, 1), 20 - a));
    } else if (nextMode === "separate") {
      setB(Math.min(b, a));
    } else {
      const nextB = Math.max(1, Math.min(b, 20 - a - 1));
      const nextC = Math.max(1, Math.min(c, 20 - a - nextB));
      setB(nextB);
      setC(nextC);
    }
    setMode(nextMode);
  }

  function changeFirst(nextA: number) {
    setA(nextA);
    if (mode === "separate") {
      setB((previous) => Math.min(previous, nextA));
    } else if (mode === "join") {
      setB((previous) => Math.min(previous, 20 - nextA));
    } else {
      const nextB = Math.max(1, Math.min(b, 20 - nextA - 1));
      setB(nextB);
      setC((previous) => Math.max(1, Math.min(previous, 20 - nextA - nextB)));
    }
  }

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Math tells stories. Some stories <strong>put groups together</strong>{" "}
        (that is adding). Some <strong>take part away</strong>{" "}(that is
        subtracting). The picture and the number sentence say the same thing.
      </p>

      <Figure caption="Read the story, count the pictures, and match it to the number sentence.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {(["join", "separate", "three"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => changeMode(m)}
                aria-pressed={mode === m} className="rounded-lg border px-3 py-1.5 text-sm font-bold"
                style={mode === m ? { background: A, color: "white", borderColor: A } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}
              >
                {m === "join" ? "Put together" : m === "separate" ? "Take away" : "Add three"}
              </button>
            ))}
          </div>

          <p className="m-0 max-w-md text-center text-lg font-semibold">
            {mode === "join" && <>There {a === 1 ? "is" : "are"} {a} fish in the tank. {b} more {b === 1 ? "fish is" : "fish are"} added. How many fish now?</>}
            {mode === "separate" && <>There {a === 1 ? "is" : "are"} {a} {a === 1 ? "cookie" : "cookies"} on the plate. {bSafe} {bSafe === 1 ? "cookie is" : "cookies are"} eaten. How many are left?</>}
            {/* All three groups render the same 🎈 glyph, separated only by CSS
                opacity, so naming three colours described a figure the page
                cannot draw. The groups are named by position instead. */}
            {mode === "three" && <>{a} {a === 1 ? "balloon" : "balloons"} in the first bunch, {b} {b === 1 ? "balloon" : "balloons"} in the second, and {c} {c === 1 ? "balloon" : "balloons"} in the third. How many balloons in all?</>}
          </p>

          <div
            className="flex max-w-lg flex-wrap items-end justify-center gap-1 text-2xl"
            role="img"
            aria-label={mode === "join"
              ? `${a} fish in the first group and ${b} fish in the second group`
              : mode === "separate"
                ? `${a} ${a === 1 ? "cookie" : "cookies"} at first; ${bSafe} ${bSafe === 1 ? "cookie is" : "cookies are"} crossed out as eaten; ${answer} ${answer === 1 ? "cookie remains" : "cookies remain"}`
                : `${a} ${a === 1 ? "balloon" : "balloons"}, ${b} ${b === 1 ? "balloon" : "balloons"}, and ${c} ${c === 1 ? "balloon" : "balloons"} in three groups`}
          >
            {mode === "separate" ? (
              <>
                <span className="flex flex-col items-center gap-1" aria-hidden="true">
                  <span className="flex flex-wrap justify-center gap-1">
                    {Array.from({ length: answer }, (_, i) => <span key={`left${i}`}>🍪</span>)}
                  </span>
                  <span className="text-xs font-bold text-[var(--ink-soft)]">{answer} left</span>
                </span>
                {bSafe > 0 && (
                  <span className="flex flex-col items-center gap-1" aria-hidden="true">
                    <span className="flex flex-wrap justify-center gap-1 opacity-35 line-through decoration-2">
                      {Array.from({ length: bSafe }, (_, i) => <span key={`eaten${i}`}>🍪</span>)}
                    </span>
                    <span className="text-xs font-bold text-[var(--ink-soft)]">{bSafe} eaten</span>
                  </span>
                )}
              </>
            ) : (
              <>
                {Array.from({ length: a }, (_, i) => <span key={`a${i}`} aria-hidden="true">{mode === "join" ? "🐟" : "🎈"}</span>)}
                {Array.from({ length: b }, (_, i) => <span key={`b${i}`} aria-hidden="true" style={{ opacity: 0.55 }}>{mode === "join" ? "🐟" : "🎈"}</span>)}
              </>
            )}
            {mode === "three" && Array.from({ length: c }, (_, i) => <span key={`c${i}`} aria-hidden="true" style={{ opacity: 0.3 }}>🎈</span>)}
          </div>

          <div className="font-mono text-3xl font-black">
            {mode === "separate" ? (
              <><span style={{ color: A }}>{a}</span> − <span style={{ color: B }}>{bSafe}</span></>
            ) : mode === "three" ? (
              <><span style={{ color: A }}>{a}</span> + <span style={{ color: B }}>{b}</span> + <span style={{ color: CC }}>{c}</span></>
            ) : (
              <><span style={{ color: A }}>{a}</span> + <span style={{ color: B }}>{b}</span></>
            )}{" "}
            = <span>{answer}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="First" value={a} min={1} max={mode === "three" ? Math.min(12, 20 - b - c) : 12} color={A} onChange={changeFirst} />
            <Stepper label="Second" value={b} min={mode === "separate" ? 0 : 1} max={mode === "separate" ? a : mode === "three" ? Math.min(10, 20 - a - c) : Math.min(10, 20 - a)} color={B} onChange={setB} />
            {mode === "three" && <Stepper label="Third" value={c} min={1} max={Math.min(8, 20 - a - b)} color={CC} onChange={setC} />}
          </div>
        </div>
      </Figure>

      <h2>The picture and the numbers agree</h2>
      <p>
        Every story has a matching number sentence. When groups come together,
        we <strong>add</strong>. When some go away, we <strong>subtract</strong>.
      </p>

      <MathCheck>
        <p>
          Addition and subtraction within 20 model real situations — putting
          together, taking apart, and comparing (1.OA.A.1). Some stories join{" "}
          <strong>three</strong>{" "}groups at once, which is still addition:{" "}
          {mode === "three" ? `${a} + ${b} + ${c} = ${answer}` : "a + b + c"}{" "}
          (1.OA.A.2). The equation is just a shorter way to tell the same story.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, color, onChange }: { label: string; value: number; min: number; max: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
