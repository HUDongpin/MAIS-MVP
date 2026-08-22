import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

test("MAIS Manim browser runtime starts paused on the first authored beat", () => {
  assert.match(source, /const \[manimPlaybackState, setManimPlaybackState\] = useState<ManimPlaybackState>\("paused"\)/);
  assert.match(source, /data-viz-manim-playback-state=\{manimScene \? manimPlaybackState : "primitive"\}/);
});

test("the Three.js clock required by React Three Fiber is production-console clean", async () => {
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (...parts: unknown[]) => {
    warnings.push(parts.map(String).join(" "));
  };

  try {
    const { Clock } = await import("three");
    const clock = new Clock(false);
    clock.start();
    clock.getDelta();
    clock.stop();
  } finally {
    console.warn = originalWarn;
  }

  assert.deepEqual(
    warnings,
    [],
    `Three.js must not emit a production warning when React Three Fiber creates its required clock: ${warnings.join(" | ")}`
  );
});
