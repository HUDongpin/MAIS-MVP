import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

test("MAIS Manim browser runtime starts paused on the first authored beat", () => {
  const initialCheckpointStart = source.indexOf("function initialManimCheckpointState");
  const initialCheckpointEnd = source.indexOf("\n}\n\nconst cameraTarget", initialCheckpointStart);
  const sceneInitializationStart = source.indexOf(
    '  useEffect(() => {\n    setManimAuthoringMode("playback");'
  );
  const sceneInitializationEnd = source.indexOf(
    "\n  }, [manimHistorySceneId, runtime, state.familyId]);",
    sceneInitializationStart
  );
  assert.ok(initialCheckpointStart >= 0 && initialCheckpointEnd > initialCheckpointStart);
  assert.ok(sceneInitializationStart >= 0 && sceneInitializationEnd > sceneInitializationStart);
  const initialCheckpointSource = source.slice(initialCheckpointStart, initialCheckpointEnd);
  const sceneInitializationSource = source.slice(sceneInitializationStart, sceneInitializationEnd);

  assert.match(source, /const \[manimPlaybackState, setManimPlaybackState\] = useState<ManimPlaybackState>\("paused"\)/);
  assert.match(
    initialCheckpointSource,
    /playbackState: "paused"/,
    "the initial history checkpoint must agree with the paused browser state"
  );
  assert.doesNotMatch(initialCheckpointSource, /playbackState: "playing"/);
  assert.match(
    sceneInitializationSource,
    /setManimPlaybackState\("paused"\)/,
    "mounting or changing a scene must not silently restart an infinite render loop"
  );
  assert.doesNotMatch(sceneInitializationSource, /setManimPlaybackState\("playing"\)/);
  assert.match(source, /data-viz-manim-playback-state=\{manimScene \? manimPlaybackState : "primitive"\}/);
});
