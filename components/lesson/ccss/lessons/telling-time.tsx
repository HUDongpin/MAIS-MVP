"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const CX = 100, CY = 100, R = 84;
const HOUR_HAND = "var(--band-upper)";
const MIN_HAND = "var(--band-early)";

const r3 = (n: number) => Math.round(n * 1000) / 1000;
function hand(angleDeg: number, len: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x2: r3(CX + len * Math.sin(a)), y2: r3(CY - len * Math.cos(a)) };
}

export default function Lesson() {
  const [half, setHalf] = useState(7); // half-hours from 12:00 -> 3:30

  const hours = Math.floor(half / 2);
  const h12 = hours % 12;
  const displayHour = h12 === 0 ? 12 : h12;
  const minute = half % 2 ? 30 : 0;

  const hourAngle = (h12 + minute / 60) * 30;
  const minAngle = minute * 6;
  const hh = hand(hourAngle, 46);
  const mh = hand(minAngle, 70);

  const digital = `${displayHour}:${minute === 0 ? "00" : "30"}`;
  const words = minute === 0 ? `${displayHour} o'clock` : `half past ${displayHour}`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A clock has two hands. The <strong>short hand</strong>{" "}shows the hour; at
        half past, it sits halfway toward the next hour. The <strong>long
        hand</strong>{" "}points to the minutes. When the long
        hand is straight up it is <strong>o'clock</strong>; straight down is{" "}
        <strong>half past</strong>.
      </p>

      <Figure caption="Move the hands by half-hours. Read the clock as o'clock or half past.">
        <div className="flex flex-col items-center gap-6">
          <svg width="200" height="200" viewBox="0 0 200 200" role="img" aria-label={`clock showing ${digital}`}>
            <circle cx={CX} cy={CY} r={R} fill="var(--surface)" stroke="var(--ink-soft)" strokeWidth="3" />
            {Array.from({ length: 12 }, (_, i) => {
              const n = i + 1;
              const p = hand(n * 30, R - 16);
              const tick = hand(n * 30, R - 4);
              const tickIn = hand(n * 30, R - 12);
              return (
                <g key={n}>
                  <line x1={tick.x2} y1={tick.y2} x2={tickIn.x2} y2={tickIn.y2} stroke="var(--ink-soft)" strokeWidth="2" />
                  <text x={p.x2} y={p.y2 + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ink)">{n}</text>
                </g>
              );
            })}
            {/* minute hand */}
            <line x1={CX} y1={CY} x2={mh.x2} y2={mh.y2} stroke={MIN_HAND} strokeWidth="4" strokeLinecap="round" style={{ transition: "all 0.4s ease" }} />
            {/* hour hand */}
            <line x1={CX} y1={CY} x2={hh.x2} y2={hh.y2} stroke={HOUR_HAND} strokeWidth="6" strokeLinecap="round" style={{ transition: "all 0.4s ease" }} />
            <circle cx={CX} cy={CY} r="6" fill="var(--ink)" />
          </svg>

          <div className="text-center">
            <div className="font-mono text-4xl font-black">{digital}</div>
            <div className="text-lg font-bold capitalize" style={{ color: MIN_HAND }}>{words}</div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setHalf((h) => Math.max(0, h - 1))} disabled={half <= 0} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold disabled:opacity-40">− 30 min</button>
            <button type="button" onClick={() => setHalf((h) => Math.min(47, h + 1))} disabled={half >= 47} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: MIN_HAND }}>+ 30 min</button>
          </div>
        </div>
      </Figure>

      <h2>O'clock and half past</h2>
      <p>
        When the long hand points to 12, we say <strong>o'clock</strong>. When it
        points to 6, half of the hour has passed, so we say{" "}
        <strong>half past</strong>{" "}— it is {digital}.
      </p>

      <MathCheck>
        <p>
          Telling and writing time to the <strong>hour and half-hour</strong>{" "}on
          an analog clock is 1.MD.B.3. The short hour hand and long minute hand
          work together: at {digital}, the hour hand is {minute === 0 ? "right on" : "halfway past"} the{" "}
          {displayHour}, and the minute hand shows {minute === 0 ? "o'clock (12)" : "half past (6)"}.
        </p>
      </MathCheck>
    </div>
  );
}
