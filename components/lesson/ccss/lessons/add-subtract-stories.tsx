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
                // b was only re-clamped when First changed while already in
                // separate mode. Coming from "Put together" with First 1 and
                // Second 10, the Second control read 10 against a maximum of 1
                // while the story and the sentence both showed 1, and nine
                // presses of "−" changed nothing on screen.
                onClick={() => { setMode(m); setB((p) => (m === "separate" ? Math.min(p, a) : Math.max(p, 1))); }}
                className="rounded-lg border px-3 py-1.5 text-sm font-bold"
                style={mode === m ? { background: A, color: "white", borderColor: A } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}
              >
                {m === "join" ? "Put together" : m === "separate" ? "Take away" : "Add three"}
              </button>
            ))}
          </div>

          <p className="m-0 max-w-md text-center text-lg font-semibold">
            {mode === "join" && <>There are {a} 🐟 in the tank. {b} more 🐟 are added. How many fish now?</>}
            {mode === "separate" && <>There are {a} 🍪 on the plate. {bSafe} 🍪 are eaten. How many are left?</>}
            {/* All three groups render the same 🎈 glyph, separated only by CSS
                opacity, so naming three colours described a figure the page
                cannot draw. The groups are named by position instead. */}
            {mode === "three" && <>{a} 🎈 in the first bunch, {b} 🎈 in the second, and {c} 🎈 in the third. How many balloons in all?</>}
          </p>

          <div className="flex max-w-lg flex-wrap justify-center gap-1 text-2xl">
            {Array.from({ length: a }, (_, i) => <span key={`a${i}`}>{mode === "join" ? "🐟" : mode === "separate" ? "🍪" : "🎈"}</span>)}
            {mode !== "separate" && Array.from({ length: b }, (_, i) => <span key={`b${i}`} style={{ opacity: 0.55 }}>{mode === "join" ? "🐟" : "🎈"}</span>)}
            {mode === "three" && Array.from({ length: c }, (_, i) => <span key={`c${i}`} style={{ opacity: 0.3 }}>🎈</span>)}
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
            <Stepper label="First" value={a} min={1} max={12} color={A} onChange={(v) => { setA(v); if (mode === "separate") setB((p) => Math.min(p, v)); }} />
            <Stepper label="Second" value={b} min={mode === "separate" ? 0 : 1} max={mode === "separate" ? a : 10} color={B} onChange={setB} />
            {mode === "three" && <Stepper label="Third" value={c} min={1} max={8} color={CC} onChange={setC} />}
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
