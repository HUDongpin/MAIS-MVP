import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

test("MAIS Manim browser runtime starts paused on the first authored beat", () => {
  assert.match(source, /const \[manimPlaybackState, setManimPlaybackState\] = useState<ManimPlaybackState>\("paused"\)/);
  assert.match(source, /data-viz-manim-playback-state=\{manimScene \? manimPlaybackState : "primitive"\}/);
});
