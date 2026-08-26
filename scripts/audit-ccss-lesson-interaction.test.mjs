import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audit = path.join(root, "scripts/audit-ccss-lesson-interaction.mjs");

test("interaction audit rejects missing selected and bounded-control states", () => {
  const fixtureDir = mkdtempSync(path.join(tmpdir(), "ccss-interaction-negative-"));

  try {
    writeFileSync(
      path.join(fixtureDir, "negative-fixture.tsx"),
      `"use client";
import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";

export default function NegativeFixture() {
  const [mode, setMode] = useState("a");
  const [value, setValue] = useState(1);
  return <div>
    <button type="button" onClick={() => setMode("b")} style={mode === "b" ? { color: "red" } : { color: "blue" }}>Choose</button>
    <button type="button" onClick={() => setValue(Math.min(2, value + 1))} aria-label="Increase value">+</button>
    <MathCheck><p>Check the current state.</p></MathCheck>
  </div>;
}
`
    );

    const result = spawnSync(process.execPath, [audit], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, CCSS_LESSON_DIR: fixtureDir }
    });
    const output = `${result.stdout}\n${result.stderr}`;

    assert.equal(result.status, 1, output);
    assert.match(output, /button-selected-state/);
    assert.match(output, /bounded-stepper-disabled-state/);
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("interaction audit accepts an explicit helper for origin and both axis states", () => {
  const fixtureDir = mkdtempSync(path.join(tmpdir(), "ccss-interaction-axis-helper-"));

  try {
    writeFileSync(
      path.join(fixtureDir, "four-quadrant-plane.tsx"),
      `"use client";
import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";

export default function AxisFixture() {
  const [p, setP] = useState({ x: 1, y: 1 });
  const location = pointLocation(p);
  return <div>
    <p>Point ({p.x}, {p.y}) is <strong>{location}</strong>.</p>
    <button type="button" onClick={() => setP({ ...p, x: p.x - 1 })} disabled={p.x <= -1} aria-label="Decrease x">−</button>
    <button type="button" onClick={() => setP({ ...p, x: p.x + 1 })} disabled={p.x >= 1} aria-label="Increase x">+</button>
    <MathCheck><p>Points on either axis are in no quadrant.</p></MathCheck>
  </div>;
}

function pointLocation(p: { x: number; y: number }) {
  if (p.x === 0 && p.y === 0) return "at the origin, on both axes and in no quadrant";
  if (p.y === 0) return "on the x-axis and in no quadrant";
  if (p.x === 0) return "on the y-axis and in no quadrant";
  return "in a quadrant";
}
`
    );

    const result = spawnSync(process.execPath, [audit], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, CCSS_LESSON_DIR: fixtureDir }
    });
    const output = `${result.stdout}\n${result.stderr}`;

    assert.doesNotMatch(output, /axis-no-quadrant-copy/);
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});
