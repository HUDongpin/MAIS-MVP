"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const S = 30; // unit cube edge in px
const DXZ = 15; // depth → screen x
const DYZ = 11; // depth → screen y
const PAD = 16;

const TOP = "color-mix(in oklab, var(--band-upper) 40%, white)";
const FRONT = "var(--band-upper)";
const RIGHT = "color-mix(in oklab, var(--band-upper) 70%, black)";
const STROKE = "color-mix(in oklab, var(--band-upper) 60%, black)";

export default function Lesson() {
  const [L, setL] = useState(4);
  const [W, setW] = useState(3);
  const [H, setH] = useState(2);

  const totalW = L * S + W * DXZ;
  const totalH = H * S + W * DYZ;
  const vbW = totalW + 2 * PAD;
  const vbH = totalH + 2 * PAD;

  const project = (x: number, y: number, z: number): [number, number] => [
    PAD + x * S + z * DXZ,
    PAD + totalH - (y * S + z * DYZ),
  ];
  const pts = (arr: [number, number][]) => arr.map((p) => p.join(",")).join(" ");

  // Painter's order: draw far (large z) first, then bottom-up, then left-right.
  const cubes: { x: number; y: number; z: number }[] = [];
  for (let z = W - 1; z >= 0; z--) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < L; x++) {
        cubes.push({ x, y, z });
      }
    }
  }

  const volume = L * W * H;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        <strong>Volume</strong>{" "}measures how much space a solid fills. We measure
        it by counting <strong>unit cubes</strong>{" "}— cubes that are 1 unit on
        every side. Build a box and count the cubes inside.
      </p>

      <Figure caption="One bottom layer, copied upward. Rotate the idea in your head: length across, width back, height up.">
        <div className="flex flex-col items-center gap-6">
          <FigureScroll>
            <svg
              width={vbW}
              height={vbH}
              viewBox={`0 0 ${vbW} ${vbH}`}
              className="mx-auto max-w-full"
              role="img"
              aria-label={`A box ${L} by ${W} by ${H} made of unit cubes`}
            >
              {cubes.map(({ x, y, z }) => {
                const P000 = project(x, y, z);
                const P100 = project(x + 1, y, z);
                const P010 = project(x, y + 1, z);
                const P110 = project(x + 1, y + 1, z);
                const P101 = project(x + 1, y, z + 1);
                const P111 = project(x + 1, y + 1, z + 1);
                const P011 = project(x, y + 1, z + 1);
                return (
                  <g key={`${x}-${y}-${z}`} stroke={STROKE} strokeWidth={1} strokeLinejoin="round">
                    <polygon points={pts([P000, P100, P110, P010])} fill={FRONT} />
                    <polygon points={pts([P100, P101, P111, P110])} fill={RIGHT} />
                    <polygon points={pts([P010, P110, P111, P011])} fill={TOP} />
                  </g>
                );
              })}
            </svg>
          </FigureScroll>

          <div className="text-center" aria-live="polite">
            <div className="font-mono text-xl font-bold">
              {L} × {W} × {H} ={" "}
              <span style={{ color: "var(--band-upper)" }}>{volume}</span> cubic
              units
            </div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">
              One layer holds <strong>{L * W}</strong>{" "}cube{L * W === 1 ? "" : "s"}, and there{" "}
              {H === 1 ? "is" : "are"} <strong>{H}</strong>{" "}{H === 1 ? "layer" : "layers"}:{" "}
              {L * W} × {H} = {volume}.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Slider label="Length" value={L} onChange={setL} />
            <Slider label="Width" value={W} onChange={setW} />
            <Slider label="Height" value={H} onChange={setH} />
          </div>
        </div>
      </Figure>

      <h2>From counting to multiplying</h2>
      <p>
        You could count the cubes one by one, but there is a faster way. The
        bottom layer is a rectangle of <strong>length × width</strong>{" "}cubes.
        Every layer above it is an exact copy, and there are{" "}
        <strong>height</strong>{" "}of them. So instead of counting, you multiply.
      </p>

      <MathCheck>
        <p>
          The number of unit cubes that fill a right rectangular prism equals{" "}
          <strong>length × width × height</strong>{" "}(5.MD.C.5). This is because
          the base layer contains <strong>length × width</strong>{" "}cubes, and the
          prism is exactly <strong>height</strong>{" "}identical layers stacked up —
          repeated addition of equal groups, which is multiplication. Counting
          cubes (5.MD.C.4) and the formula always give the same answer, because
          the formula is just an efficient way of doing that count.
        </p>
      </MathCheck>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
        {label}: <span className="text-[var(--ink)]">{value}</span>
      </span>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-32 accent-[var(--band-upper)]"
        aria-label={label}
      />
    </div>
  );
}
