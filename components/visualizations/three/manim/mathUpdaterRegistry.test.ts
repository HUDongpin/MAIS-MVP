import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  UPDATER_REGISTRY_SOURCE_CONTRACT,
  applyMathUpdaters,
  buildMathUpdaterRegistry
} from "./mathUpdaterRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathObjectSpec, MathSceneSpec } from "./mathSceneTypes";

const modulePath = "components/visualizations/three/manim/mathUpdaterRegistry.ts";

test("builds an updater registry with Manim add_updater/update(dt) source contract evidence", () => {
  const objects: MathObjectSpec[] = [
    {
      type: "parametricCurve",
      id: "curve",
      conceptId: "function-rule",
      colorRole: "function",
      samples: [[0, 0, 0], [1, 1, 0]]
    },
    {
      type: "movingPoint",
      id: "probe",
      pathObjectId: "curve",
      conceptId: "current-point",
      colorRole: "probe"
    },
    {
      type: "trace",
      id: "trace",
      sourceObjectId: "probe",
      durationSeconds: 1,
      colorRole: "trace"
    }
  ];

  const registry = buildMathUpdaterRegistry(objects);

  assert.equal(registry.sourceContract, UPDATER_REGISTRY_SOURCE_CONTRACT);
  assert.match(UPDATER_REGISTRY_SOURCE_CONTRACT, /Mobject\.add_updater/);
  assert.match(UPDATER_REGISTRY_SOURCE_CONTRACT, /Mobject\.update/);
  assert.match(UPDATER_REGISTRY_SOURCE_CONTRACT, /recursive/);
  assert.deepEqual(registry.entries.map((entry) => entry.sourceContract), [
    UPDATER_REGISTRY_SOURCE_CONTRACT,
    UPDATER_REGISTRY_SOURCE_CONTRACT,
    UPDATER_REGISTRY_SOURCE_CONTRACT
  ]);
  assert.deepEqual(registry.byObjectId, {
    curve: ["reveal-curve"],
    probe: ["move-along-path"],
    trace: ["trace-recent-path"]
  });
});

test("applyMathUpdaters applies runtime updater stages through Manim child-first traversal", () => {
  const source = fs.readFileSync(modulePath, "utf8");
  const applySource = source.slice(source.indexOf("export function applyMathUpdaters"));

  assert.match(source, /UPDATER_REGISTRY_SOURCE_CONTRACT/);
  assert.match(applySource, /updaterTraversalObjectIds\(state\)[\s\S]*alwaysRedrawnById/);
  assert.match(applySource, /updaterTraversalObjectIds\(stateWithAlwaysRedraw\)[\s\S]*stateWithObjectUpdaters/);
  assert.doesNotMatch(applySource, /Object\.values\(state\.objectGraph\.byId\)\.map/);
  assert.doesNotMatch(applySource, /Object\.values\(stateWithAlwaysRedraw\.objectGraph\.byId\)\.map/);
});

test("applyMathUpdaters refreshes bounding boxes and scene graph after dt updater mutations", () => {
  const scene: MathSceneSpec = {
    sceneId: "updater-runtime-graph-refresh-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] },
      worldRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] }
    },
    objects: [
      {
        type: "parametricCurve",
        colorRole: "function",
        conceptId: "seed-position",
        id: "seed-path",
        samples: [
          [1, 0, 0],
          [1, 0, 0]
        ]
      },
      {
        type: "movingPoint",
        colorRole: "probe",
        conceptId: "flow-probe",
        id: "flow-probe",
        pathObjectId: "seed-path"
      }
    ],
    vectorFieldUpdaters: [
      {
        coordinateMode: "world",
        id: "flow-probe-dt-updater",
        objectId: "flow-probe",
        speedScale: 1,
        system: { type: "linear2d", matrix: [[1, 0], [0, 0]] },
        type: "moveAlongVectorField"
      }
    ],
    formulas: [],
    bindings: [],
    timeline: [{ type: "wait", duration: 3 }],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 }
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0.5), { deltaSeconds: 0.5 });
  const probe = updated.objectGraph.byId["flow-probe"];
  const graphProbe = updated.sceneGraph.byId["flow-probe"];

  assert.equal(probe.renderState.kind, "point");
  if (probe.renderState.kind !== "point") throw new Error("expected vector-field-updated point render state");
  assert.deepEqual(probe.renderState.position, [1.5, 0, 0]);
  assert.deepEqual(probe.boundingBox, {
    center: [1.5, 0, 0],
    kind: "finite",
    max: [1.5, 0, 0],
    min: [1.5, 0, 0]
  });
  assert.deepEqual(graphProbe.renderState, probe.renderState);
  assert.deepEqual(graphProbe.boundingBox, probe.boundingBox);
  assert.deepEqual(updated.sceneGraph.renderGroups.scene, ["seed-path", "flow-probe"]);
  assert.equal(updated.sceneGraph.renderBatches.objectCount, updated.sceneGraph.renderGroups.all.length);
});

test("applyMathUpdaters preserves same-object add_updater order for always-method and dt updaters", () => {
  const scene: MathSceneSpec = {
    sceneId: "updater-runtime-add-order-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [-2, 12], y: [-2, 2], z: [-1, 1] },
      worldRange: { x: [-2, 12], y: [-2, 2], z: [-1, 1] }
    },
    objects: [
      {
        colorRole: "function",
        conceptId: "ordered-vector",
        from: [0, 0, 0],
        id: "ordered-vector",
        to: [2, 0, 0],
        type: "vector"
      }
    ],
    alwaysMethodUpdaters: [
      {
        id: "ordered-vector-set-x",
        objectId: "ordered-vector",
        operation: {
          coordinate: 10,
          type: "setX"
        }
      }
    ],
    vectorFieldUpdaters: [
      {
        coordinateMode: "world",
        id: "ordered-vector-dt-shift",
        objectId: "ordered-vector",
        speedScale: 1,
        system: { type: "constantVelocity", velocity: [1, 0, 0] },
        type: "moveAlongVectorField"
      }
    ],
    formulas: [],
    bindings: [],
    timeline: [{ type: "wait", duration: 3 }],
    cameraShots: [{ id: "overview", target: [5, 0, 0], position: [5, 2, 6], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 }
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1), { deltaSeconds: 1 });
  const vector = updated.objectGraph.byId["ordered-vector"];

  assert.equal(vector.renderState.kind, "vector");
  if (vector.renderState.kind !== "vector") throw new Error("expected vector render state");
  assert.deepEqual(vector.renderState.from, [10, 0, 0]);
  assert.deepEqual(vector.renderState.to, [12, 0, 0]);
  assert.deepEqual(vector.boundingBox, {
    center: [11, 0, 0],
    kind: "finite",
    max: [12, 0, 0],
    min: [10, 0, 0]
  });
  assert.deepEqual(updated.sceneGraph.byId["ordered-vector"].renderState, vector.renderState);
});

test("trace-recent-path updater appends the current traced point to the previous frame tail", () => {
  const scene: MathSceneSpec = {
    sceneId: "trace-frame-buffer-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [0, 1], y: [-1, 1], z: [-1, 1] },
      worldRange: { x: [0, 1], y: [-1, 1], z: [-1, 1] }
    },
    objects: [
      {
        type: "parametricCurve",
        colorRole: "function",
        conceptId: "line-path",
        id: "line-path",
        samples: [
          [0, 0, 0],
          [1, 0, 0]
        ]
      },
      {
        type: "movingPoint",
        colorRole: "probe",
        conceptId: "moving-probe",
        id: "moving-probe",
        pathObjectId: "line-path"
      },
      {
        type: "trace",
        colorRole: "trace",
        durationSeconds: 10,
        id: "probe-tail",
        sourceObjectId: "moving-probe"
      }
    ],
    formulas: [],
    bindings: [],
    timeline: [{ type: "moveAlongPath", objectId: "moving-probe", pathObjectId: "line-path", duration: 4 }],
    cameraShots: [{ id: "overview", target: [0.5, 0, 0], position: [1, 1, 2], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 3, expectedTokenCount: 0 }
  };
  const firstFrame = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1));
  const secondFrame = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 3), {
    deltaSeconds: 2,
    previousRuntimeState: firstFrame
  });
  const tail = secondFrame.objectGraph.byId["probe-tail"];

  assert.equal(tail.renderState.kind, "polyline");
  if (tail.renderState.kind !== "polyline") throw new Error("expected traced polyline");

  assert.deepEqual(tail.renderState.points.slice(-2), [
    [0.25, 0, 0],
    [0.75, 0, 0]
  ]);
  assert.deepEqual(secondFrame.sceneGraph.byId["probe-tail"].renderState, tail.renderState);
});
