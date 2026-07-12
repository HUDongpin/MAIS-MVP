import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  ALWAYS_METHOD_UPDATER_SOURCE_CONTRACT,
  alwaysMethodUpdaterEvidenceDataAttributes,
  buildAlwaysMethodUpdaterEvidence,
  serializeAlwaysMethodUpdaterEvidence
} from "./mathAlwaysMethodUpdater";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import { buildMathUpdaterSignaturePlan } from "./mathUpdaterSignature";
import { applyMathUpdaters } from "./mathUpdaterRegistry";
import type { MathSceneSpec } from "./mathSceneTypes";

function roundedVec3(vector: [number, number, number]): [number, number, number] {
  return vector.map((value) => Number(value.toFixed(6))) as [number, number, number];
}

function alwaysMethodScene(): MathSceneSpec {
  return {
    // Mirrors Manim's always(mobject.next_to, target, UP): a relationship method
    // is re-applied after the target has moved for the current frame.
    alwaysMethodUpdaters: [
      {
        id: "follower-next-to-anchor",
        objectId: "follower",
        operation: {
          buff: 0.25,
          direction: [0, 1, 0],
          targetObjectId: "anchor",
          type: "nextTo"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] },
      worldRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "function",
        conceptId: "anchor",
        from: [0, 0, 0],
        id: "anchor",
        to: [1, 0, 0],
        type: "vector"
      },
      {
        colorRole: "attention",
        conceptId: "follower",
        from: [0, 0, 0],
        id: "follower",
        to: [0.5, 0, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-updater-scene",
    timeline: [{ type: "wait", duration: 3 }],
    vectorFieldUpdaters: [
      {
        id: "anchor-drift",
        objectId: "anchor",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [1, 0, 0]
        },
        type: "moveAlongVectorField"
      }
    ]
  };
}

test("registers scene-authored always-method updaters as controlled updater entries", () => {
  const runtime = buildMathSceneRuntimeState(alwaysMethodScene(), 2);

  assert.ok(runtime.updaters.byObjectId.follower.includes("always-method"));
  assert.ok(runtime.updaters.entries.some((entry) => entry.id === "follower-next-to-anchor"));
});

test("applies always-method nextTo after runtime-updated target objects", () => {
  const scene = alwaysMethodScene();
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 2));
  const anchor = updated.objectGraph.byId.anchor;
  const follower = updated.objectGraph.byId.follower;

  assert.equal(anchor.renderState.kind, "vector");
  assert.equal(follower.renderState.kind, "vector");
  if (anchor.renderState.kind !== "vector" || follower.renderState.kind !== "vector") {
    throw new Error("expected vector render states");
  }

  assert.deepEqual(anchor.renderState.from, [2, 0, 0]);
  assert.deepEqual(anchor.renderState.to, [3, 0, 0]);
  assert.deepEqual(follower.renderState.from, [2.25, 0.25, 0]);
  assert.deepEqual(follower.renderState.to, [2.75, 0.25, 0]);
  assert.deepEqual(follower.boundingBox, {
    center: [2.5, 0.25, 0],
    kind: "finite",
    max: [2.75, 0.25, 0],
    min: [2.25, 0.25, 0]
  });
});

test("evaluates f_always-style tracker arguments before applying method updaters", () => {
  const scene: MathSceneSpec = {
    ...alwaysMethodScene(),
    alwaysMethodUpdaters: [
      {
        id: "follower-next-to-anchor-dynamic-gap",
        objectId: "follower",
        operation: {
          buffExpression: { trackerId: "parameter:gap", type: "tracker" },
          direction: [0, 1, 0],
          targetObjectId: "anchor",
          type: "nextTo"
        }
      }
    ],
    parameters: [
      {
        id: "gap",
        label: "Gap",
        max: 1,
        min: 0,
        role: "control",
        value: 0.75
      }
    ],
    sceneId: "always-method-dynamic-argument-scene",
    vectorFieldUpdaters: []
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const follower = updated.objectGraph.byId.follower;

  assert.equal(follower.renderState.kind, "vector");
  if (follower.renderState.kind !== "vector") {
    throw new Error("expected vector render state");
  }

  assert.deepEqual(follower.renderState.from, [0.25, 0.75, 0]);
  assert.deepEqual(follower.renderState.to, [0.75, 0.75, 0]);
});

test("evaluates f_always-style tracker arguments for setOpacity method updaters", () => {
  const scene: MathSceneSpec = {
    ...alwaysMethodScene(),
    alwaysMethodUpdaters: [
      {
        id: "follower-opacity-from-tracker",
        objectId: "follower",
        operation: {
          opacityExpression: { trackerId: "parameter:alpha", type: "tracker" },
          type: "setOpacity"
        }
      }
    ],
    parameters: [
      {
        id: "alpha",
        label: "Alpha",
        max: 1,
        min: 0,
        role: "control",
        value: 0.35
      }
    ],
    sceneId: "always-method-opacity-scene",
    vectorFieldUpdaters: []
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const follower = updated.objectGraph.byId.follower;
  const evidence = buildAlwaysMethodUpdaterEvidence(scene, updated);
  const attributes = alwaysMethodUpdaterEvidenceDataAttributes(evidence);

  assert.equal(follower.uniforms?.opacity, 0.35);
  assert.equal(evidence.placedCount, 1);
  assert.equal(evidence.dynamicBuffCount, 1);
  assert.equal(evidence.operationTypes, "setOpacity");
  assert.equal(evidence.buffSummary, "follower-opacity-from-tracker=0.350");
  assert.equal(
    evidence.placementSummary,
    "follower-opacity-from-tracker:expected=0.350:observed=0.350:error=0.000"
  );
  assert.equal(attributes["data-viz-manim-always-method-operation-types"], "setOpacity");
  assert.equal(attributes["data-viz-manim-always-method-dynamic-buff-count"], "1");
});

test("evaluates f_always-style tracker arguments for VMobject style method updaters", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "stroke-object-set-stroke",
        objectId: "stroke-object",
        operation: {
          strokeOpacityExpression: { trackerId: "parameter:stroke-alpha", type: "tracker" },
          strokeRole: "attention",
          strokeWidthExpression: { trackerId: "parameter:stroke-width", type: "tracker" },
          type: "setStroke"
        }
      },
      {
        id: "fill-object-set-fill",
        objectId: "fill-object",
        operation: {
          fillOpacityExpression: { trackerId: "parameter:fill-alpha", type: "tracker" },
          fillRole: "area",
          type: "setFill"
        }
      },
      {
        id: "style-object-set-style",
        objectId: "style-object",
        operation: {
          antiAliasWidth: 2,
          fillOpacityExpression: { trackerId: "parameter:style-fill-alpha", type: "tracker" },
          fillRole: "area",
          strokeOpacity: 0.7,
          strokeRole: "parameter",
          strokeWidthExpression: { trackerId: "parameter:style-width", type: "tracker" },
          type: "setStyle"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] },
      worldRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 3, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "function",
        conceptId: "stroke-object",
        from: [0, 0, 0],
        id: "stroke-object",
        to: [1, 0, 0],
        type: "vector"
      },
      {
        colorRole: "function",
        conceptId: "fill-object",
        from: [0, 1, 0],
        id: "fill-object",
        to: [1, 1, 0],
        type: "vector"
      },
      {
        colorRole: "function",
        conceptId: "style-object",
        from: [0, 2, 0],
        id: "style-object",
        to: [1, 2, 0],
        type: "vector"
      }
    ],
    parameters: [
      { id: "stroke-alpha", label: "Stroke alpha", max: 1, min: 0, role: "control", value: 0.4 },
      { id: "stroke-width", label: "Stroke width", max: 12, min: 1, role: "control", value: 9 },
      { id: "fill-alpha", label: "Fill alpha", max: 1, min: 0, role: "control", value: 0.6 },
      { id: "style-fill-alpha", label: "Style fill alpha", max: 1, min: 0, role: "control", value: 0.5 },
      { id: "style-width", label: "Style width", max: 12, min: 1, role: "control", value: 7 }
    ],
    sceneId: "always-method-vmobject-style-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const strokeObject = updated.objectGraph.byId["stroke-object"];
  const fillObject = updated.objectGraph.byId["fill-object"];
  const styleObject = updated.objectGraph.byId["style-object"];
  const evidence = buildAlwaysMethodUpdaterEvidence(scene, updated);
  const attributes = alwaysMethodUpdaterEvidenceDataAttributes(evidence);

  assert.equal(strokeObject.renderState.kind, "vector");
  assert.equal(fillObject.renderState.kind, "vector");
  assert.equal(styleObject.renderState.kind, "vector");
  if (strokeObject.renderState.kind !== "vector" || fillObject.renderState.kind !== "vector" || styleObject.renderState.kind !== "vector") {
    throw new Error("expected vector render states");
  }

  assert.equal(strokeObject.renderState.style?.strokeRole, "attention");
  assert.equal(strokeObject.renderState.style?.strokeWidth, 9);
  assert.equal(strokeObject.renderState.style?.strokeOpacity, 0.4);
  assert.equal(fillObject.renderState.style?.fillRole, "area");
  assert.equal(fillObject.renderState.style?.fillOpacity, 0.6);
  assert.equal(styleObject.renderState.style?.strokeRole, "parameter");
  assert.equal(styleObject.renderState.style?.strokeWidth, 7);
  assert.equal(styleObject.renderState.style?.strokeOpacity, 0.7);
  assert.equal(styleObject.renderState.style?.fillRole, "area");
  assert.equal(styleObject.renderState.style?.fillOpacity, 0.5);
  assert.equal(styleObject.renderState.style?.antiAliasWidth, 2);
  assert.equal(evidence.placedCount, 3);
  assert.equal(evidence.dynamicBuffCount, 3);
  assert.equal(evidence.operationTypes, "setFill,setStroke,setStyle");
  assert.equal(
    evidence.buffSummary,
    "stroke-object-set-stroke=9.000,fill-object-set-fill=0.600,style-object-set-style=7.000"
  );
  assert.match(evidence.placementSummary, /stroke-object-set-stroke:expected=stroke=attention:9\.00@0\.40/);
  assert.match(evidence.placementSummary, /fill-object-set-fill:expected=stroke=function:5\.00@1\.00;fill=area@0\.60/);
  assert.match(evidence.placementSummary, /style-object-set-style:expected=stroke=parameter:7\.00@0\.70;fill=area@0\.50;aa=2\.00/);
  assert.equal(attributes["data-viz-manim-always-method-operation-types"], "setFill,setStroke,setStyle");
  assert.equal(attributes["data-viz-manim-always-method-dynamic-buff-count"], "3");
  assert.equal(attributes["data-viz-manim-always-method-buff-summary"], evidence.buffSummary);
  assert.equal(attributes["data-viz-manim-always-method-placement-summary"], evidence.placementSummary);
});

test("applies always-method updaters in Manim children-first family order", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "probe-next-to-anchor",
        objectId: "probe",
        operation: {
          buff: 0.25,
          direction: [0, 1, 0],
          targetObjectId: "anchor",
          type: "nextTo"
        }
      },
      {
        id: "path-next-to-probe",
        objectId: "path",
        operation: {
          buff: 0.25,
          direction: [0, 1, 0],
          targetObjectId: "probe",
          type: "nextTo"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] },
      worldRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 3, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "function",
        conceptId: "path",
        id: "path",
        samples: [
          [0, 0, 0],
          [1, 0, 0]
        ],
        type: "parametricCurve"
      },
      {
        colorRole: "attention",
        conceptId: "probe",
        id: "probe",
        pathObjectId: "path",
        type: "movingPoint"
      },
      {
        colorRole: "function",
        conceptId: "anchor",
        from: [2, 2, 0],
        id: "anchor",
        to: [3, 2, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-family-order-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1));
  const path = updated.objectGraph.byId.path;
  const probe = updated.objectGraph.byId.probe;

  assert.equal(probe.renderState.kind, "point");
  assert.equal(path.renderState.kind, "polyline");
  if (probe.renderState.kind !== "point" || path.renderState.kind !== "polyline") {
    throw new Error("expected point and polyline render states");
  }

  assert.deepEqual(probe.renderState.position, [2.5, 2.25, 0]);
  assert.deepEqual(path.renderState.points, [
    [2, 2.5, 0],
    [3, 2.5, 0]
  ]);
  assert.deepEqual(path.boundingBox, {
    center: [2.5, 2.5, 0],
    kind: "finite",
    max: [3, 2.5, 0],
    min: [2, 2.5, 0]
  });
});

test("applies always-method alignTo after runtime-updated target objects", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "follower-align-to-anchor",
        objectId: "follower",
        operation: {
          direction: [0, 1, 0],
          targetObjectId: "anchor",
          type: "alignTo"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] },
      worldRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "function",
        conceptId: "anchor",
        from: [2, 2, 0],
        id: "anchor",
        to: [3, 2, 0],
        type: "vector"
      },
      {
        colorRole: "attention",
        conceptId: "follower",
        from: [0, 0, 0],
        id: "follower",
        to: [0.5, 0, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-align-to-scene",
    timeline: [{ type: "wait", duration: 3 }],
    vectorFieldUpdaters: [
      {
        id: "anchor-drift-up",
        objectId: "anchor",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [0, 1, 0]
        },
        type: "moveAlongVectorField"
      }
    ]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 2));
  const anchor = updated.objectGraph.byId.anchor;
  const follower = updated.objectGraph.byId.follower;

  assert.equal(anchor.renderState.kind, "vector");
  assert.equal(follower.renderState.kind, "vector");
  if (anchor.renderState.kind !== "vector" || follower.renderState.kind !== "vector") {
    throw new Error("expected vector render states");
  }

  assert.deepEqual(anchor.renderState.from, [2, 4, 0]);
  assert.deepEqual(anchor.renderState.to, [3, 4, 0]);
  assert.deepEqual(follower.renderState.from, [0, 4, 0]);
  assert.deepEqual(follower.renderState.to, [0.5, 4, 0]);
  assert.deepEqual(follower.boundingBox, {
    center: [0.25, 4, 0],
    kind: "finite",
    max: [0.5, 4, 0],
    min: [0, 4, 0]
  });
});

test("applies always-method matchX matchY and matchZ after runtime-updated target objects", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "x-follower-match-x-anchor",
        objectId: "x-follower",
        operation: {
          targetObjectId: "anchor",
          type: "matchX"
        }
      },
      {
        id: "y-follower-match-y-anchor",
        objectId: "y-follower",
        operation: {
          targetObjectId: "anchor",
          type: "matchY"
        }
      },
      {
        id: "z-follower-match-z-anchor",
        objectId: "z-follower",
        operation: {
          targetObjectId: "anchor",
          type: "matchZ"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-4, 12], y: [-4, 12], z: [-4, 12] },
      worldRange: { x: [-4, 12], y: [-4, 12], z: [-4, 12] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 4, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "function",
        conceptId: "anchor",
        from: [1, 2, 3],
        id: "anchor",
        to: [3, 4, 5],
        type: "vector"
      },
      {
        colorRole: "attention",
        conceptId: "x-follower",
        from: [0, 0, 0],
        id: "x-follower",
        to: [2, 0, 0],
        type: "vector"
      },
      {
        colorRole: "attention",
        conceptId: "y-follower",
        from: [0, 0, 0],
        id: "y-follower",
        to: [0, 2, 0],
        type: "vector"
      },
      {
        colorRole: "attention",
        conceptId: "z-follower",
        from: [0, 0, 0],
        id: "z-follower",
        to: [0, 0, 2],
        type: "vector"
      }
    ],
    sceneId: "always-method-coordinate-match-scene",
    timeline: [{ type: "wait", duration: 3 }],
    vectorFieldUpdaters: [
      {
        id: "anchor-drift-xyz",
        objectId: "anchor",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [1, 2, 3]
        },
        type: "moveAlongVectorField"
      }
    ]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 2));
  const anchor = updated.objectGraph.byId.anchor;
  const xFollower = updated.objectGraph.byId["x-follower"];
  const yFollower = updated.objectGraph.byId["y-follower"];
  const zFollower = updated.objectGraph.byId["z-follower"];

  assert.equal(anchor.renderState.kind, "vector");
  assert.equal(xFollower.renderState.kind, "vector");
  assert.equal(yFollower.renderState.kind, "vector");
  assert.equal(zFollower.renderState.kind, "vector");
  if (
    anchor.renderState.kind !== "vector" ||
    xFollower.renderState.kind !== "vector" ||
    yFollower.renderState.kind !== "vector" ||
    zFollower.renderState.kind !== "vector"
  ) {
    throw new Error("expected vector render states");
  }

  assert.deepEqual(anchor.boundingBox, {
    center: [4, 7, 10],
    kind: "finite",
    max: [5, 8, 11],
    min: [3, 6, 9]
  });
  assert.deepEqual(xFollower.renderState.from, [3, 0, 0]);
  assert.deepEqual(xFollower.renderState.to, [5, 0, 0]);
  assert.deepEqual(xFollower.boundingBox, {
    center: [4, 0, 0],
    kind: "finite",
    max: [5, 0, 0],
    min: [3, 0, 0]
  });
  assert.deepEqual(yFollower.renderState.from, [0, 6, 0]);
  assert.deepEqual(yFollower.renderState.to, [0, 8, 0]);
  assert.deepEqual(yFollower.boundingBox, {
    center: [0, 7, 0],
    kind: "finite",
    max: [0, 8, 0],
    min: [0, 6, 0]
  });
  assert.deepEqual(zFollower.renderState.from, [0, 0, 9]);
  assert.deepEqual(zFollower.renderState.to, [0, 0, 11]);
  assert.deepEqual(zFollower.boundingBox, {
    center: [0, 0, 10],
    kind: "finite",
    max: [0, 0, 11],
    min: [0, 0, 9]
  });
});

test("applies always-method setX setY and setZ after object frame updaters", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "free-vector-set-x",
        objectId: "free-vector",
        operation: {
          coordinate: -1,
          type: "setX"
        }
      },
      {
        id: "free-vector-set-y-from-tracker",
        objectId: "free-vector",
        operation: {
          coordinateExpression: { trackerId: "parameter:target-y", type: "tracker" },
          type: "setY"
        }
      },
      {
        id: "free-vector-set-z",
        objectId: "free-vector",
        operation: {
          coordinate: 8,
          type: "setZ"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-4, 10], y: [-4, 10], z: [-4, 10] },
      worldRange: { x: [-4, 10], y: [-4, 10], z: [-4, 10] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "free-vector",
        from: [0, 0, 0],
        id: "free-vector",
        to: [2, 2, 2],
        type: "vector"
      }
    ],
    parameters: [
      {
        id: "target-y",
        label: "Target y",
        max: 10,
        min: -10,
        role: "control",
        value: 6
      }
    ],
    sceneId: "always-method-coordinate-setter-scene",
    timeline: [{ type: "wait", duration: 3 }],
    vectorFieldUpdaters: [
      {
        id: "free-vector-drift",
        objectId: "free-vector",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [1, 1, 1]
        },
        type: "moveAlongVectorField"
      }
    ]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 2));
  const freeVector = updated.objectGraph.byId["free-vector"];

  assert.equal(freeVector.renderState.kind, "vector");
  if (freeVector.renderState.kind !== "vector") {
    throw new Error("expected vector render state");
  }

  assert.deepEqual(freeVector.renderState.from, [0, 7, 9]);
  assert.deepEqual(freeVector.renderState.to, [2, 9, 11]);
  assert.deepEqual(freeVector.boundingBox, {
    center: [1, 8, 10],
    kind: "finite",
    max: [2, 9, 11],
    min: [0, 7, 9]
  });
});

test("applies always-method moveTo after object frame updaters", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "free-vector-move-to-point",
        objectId: "free-vector",
        operation: {
          point: [5, 6, 0],
          type: "moveTo"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-4, 10], y: [-4, 10], z: [-4, 10] },
      worldRange: { x: [-4, 10], y: [-4, 10], z: [-4, 10] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "free-vector",
        from: [0, 0, 0],
        id: "free-vector",
        to: [2, 2, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-move-to-scene",
    timeline: [{ type: "wait", duration: 3 }],
    vectorFieldUpdaters: [
      {
        id: "free-vector-drift",
        objectId: "free-vector",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [1, 0, 0]
        },
        type: "moveAlongVectorField"
      }
    ]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 2));
  const freeVector = updated.objectGraph.byId["free-vector"];

  assert.equal(freeVector.renderState.kind, "vector");
  if (freeVector.renderState.kind !== "vector") {
    throw new Error("expected vector render state");
  }

  assert.deepEqual(freeVector.renderState.from, [6, 5, 0]);
  assert.deepEqual(freeVector.renderState.to, [8, 7, 0]);
  assert.deepEqual(freeVector.boundingBox, {
    center: [7, 6, 0],
    kind: "finite",
    max: [8, 7, 0],
    min: [6, 5, 0]
  });
});

test("applies always-method center after object frame updaters", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "free-vector-center",
        objectId: "free-vector",
        operation: {
          type: "center"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "free-vector",
        from: [0, 0, 0],
        id: "free-vector",
        to: [2, 2, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-center-scene",
    timeline: [{ type: "wait", duration: 3 }],
    vectorFieldUpdaters: [
      {
        id: "free-vector-drift",
        objectId: "free-vector",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [3, 0, 0]
        },
        type: "moveAlongVectorField"
      }
    ]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1));
  const freeVector = updated.objectGraph.byId["free-vector"];

  assert.equal(freeVector.renderState.kind, "vector");
  if (freeVector.renderState.kind !== "vector") {
    throw new Error("expected vector render state");
  }

  assert.deepEqual(freeVector.renderState.from, [2, -1, 0]);
  assert.deepEqual(freeVector.renderState.to, [4, 1, 0]);
  assert.deepEqual(freeVector.boundingBox, {
    center: [3, 0, 0],
    kind: "finite",
    max: [4, 1, 0],
    min: [2, -1, 0]
  });
});

test("applies always-method shift after object frame updaters", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "free-vector-shift",
        objectId: "free-vector",
        operation: {
          type: "shift",
          vector: [0.5, -1, 2]
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "free-vector",
        from: [0, 0, 0],
        id: "free-vector",
        to: [2, 2, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-shift-scene",
    timeline: [{ type: "wait", duration: 3 }],
    vectorFieldUpdaters: [
      {
        id: "free-vector-drift",
        objectId: "free-vector",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [3, 0, 0]
        },
        type: "moveAlongVectorField"
      }
    ]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1));
  const freeVector = updated.objectGraph.byId["free-vector"];

  assert.equal(freeVector.renderState.kind, "vector");
  if (freeVector.renderState.kind !== "vector") {
    throw new Error("expected vector render state");
  }

  assert.deepEqual(freeVector.renderState.from, [3.5, -1, 2]);
  assert.deepEqual(freeVector.renderState.to, [5.5, 1, 2]);
  assert.deepEqual(freeVector.boundingBox, {
    center: [4.5, 0, 2],
    kind: "finite",
    max: [5.5, 1, 2],
    min: [3.5, -1, 2]
  });
});

test("evaluates f_always-style tracker vector arguments before shifting", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "free-vector-shift-from-trackers",
        objectId: "free-vector",
        operation: {
          type: "shift",
          vectorExpression: {
            x: { trackerId: "parameter:dx", type: "tracker" },
            y: { type: "constant", value: -1 },
            z: {
              factors: [
                { trackerId: "parameter:dz", type: "tracker" },
                { type: "constant", value: 2 }
              ],
              type: "multiply"
            }
          }
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "free-vector",
        from: [0, 0, 0],
        id: "free-vector",
        to: [2, 2, 0],
        type: "vector"
      }
    ],
    parameters: [
      {
        id: "dx",
        label: "dx",
        max: 2,
        min: -2,
        role: "control",
        value: 0.5
      },
      {
        id: "dz",
        label: "dz",
        max: 2,
        min: -2,
        role: "control",
        value: 1.5
      }
    ],
    sceneId: "always-method-shift-tracker-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const freeVector = updated.objectGraph.byId["free-vector"];

  assert.equal(freeVector.renderState.kind, "vector");
  if (freeVector.renderState.kind !== "vector") {
    throw new Error("expected vector render state");
  }

  assert.deepEqual(freeVector.renderState.from, [0.5, -1, 3]);
  assert.deepEqual(freeVector.renderState.to, [2.5, 1, 3]);
  assert.deepEqual(freeVector.boundingBox, {
    center: [1.5, 0, 3],
    kind: "finite",
    max: [2.5, 1, 3],
    min: [0.5, -1, 3]
  });
});

test("applies always-method toEdge after object frame updaters", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "free-vector-to-edge",
        objectId: "free-vector",
        operation: {
          buff: 0.5,
          direction: [0, 1, 0],
          frame: { max: [6, 6, 0], min: [-6, -6, 0] },
          type: "toEdge"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "free-vector",
        from: [0, 0, 0],
        id: "free-vector",
        to: [2, 2, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-to-edge-scene",
    timeline: [{ type: "wait", duration: 3 }],
    vectorFieldUpdaters: [
      {
        id: "free-vector-drift",
        objectId: "free-vector",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [3, 0, 0]
        },
        type: "moveAlongVectorField"
      }
    ]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1));
  const freeVector = updated.objectGraph.byId["free-vector"];

  assert.equal(freeVector.renderState.kind, "vector");
  if (freeVector.renderState.kind !== "vector") {
    throw new Error("expected vector render state");
  }

  assert.deepEqual(freeVector.renderState.from, [3, 3.5, 0]);
  assert.deepEqual(freeVector.renderState.to, [5, 5.5, 0]);
  assert.deepEqual(freeVector.boundingBox, {
    center: [4, 4.5, 0],
    kind: "finite",
    max: [5, 5.5, 0],
    min: [3, 3.5, 0]
  });
});

test("applies always-method toCorner after object frame updaters", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "free-vector-to-corner",
        objectId: "free-vector",
        operation: {
          buff: 0.5,
          direction: [1, 1, 0],
          frame: { max: [6, 6, 0], min: [-6, -6, 0] },
          type: "toCorner"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "free-vector",
        from: [0, 0, 0],
        id: "free-vector",
        to: [2, 2, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-to-corner-scene",
    timeline: [{ type: "wait", duration: 3 }],
    vectorFieldUpdaters: [
      {
        id: "free-vector-drift",
        objectId: "free-vector",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [3, 0, 0]
        },
        type: "moveAlongVectorField"
      }
    ]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1));
  const freeVector = updated.objectGraph.byId["free-vector"];

  assert.equal(freeVector.renderState.kind, "vector");
  if (freeVector.renderState.kind !== "vector") {
    throw new Error("expected vector render state");
  }

  assert.deepEqual(freeVector.renderState.from, [6.5, 3.5, 0]);
  assert.deepEqual(freeVector.renderState.to, [8.5, 5.5, 0]);
  assert.deepEqual(freeVector.boundingBox, {
    center: [7.5, 4.5, 0],
    kind: "finite",
    max: [8.5, 5.5, 0],
    min: [6.5, 3.5, 0]
  });
});

test("applies always-method scale after object frame updaters", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "free-vector-scale",
        objectId: "free-vector",
        operation: {
          factor: 2,
          type: "scale"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "free-vector",
        from: [0, 0, 0],
        id: "free-vector",
        to: [2, 2, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-scale-scene",
    timeline: [{ type: "wait", duration: 3 }],
    vectorFieldUpdaters: [
      {
        id: "free-vector-drift",
        objectId: "free-vector",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [3, 0, 0]
        },
        type: "moveAlongVectorField"
      }
    ]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1));
  const freeVector = updated.objectGraph.byId["free-vector"];

  assert.equal(freeVector.renderState.kind, "vector");
  if (freeVector.renderState.kind !== "vector") {
    throw new Error("expected vector render state");
  }

  assert.deepEqual(freeVector.renderState.from, [2, -1, 0]);
  assert.deepEqual(freeVector.renderState.to, [6, 3, 0]);
  assert.deepEqual(freeVector.boundingBox, {
    center: [4, 1, 0],
    kind: "finite",
    max: [6, 3, 0],
    min: [2, -1, 0]
  });
});

test("applies always-method stretch after object frame updaters", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "free-vector-stretch-x",
        objectId: "free-vector",
        operation: {
          dim: "x",
          factor: 2,
          type: "stretch"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "free-vector",
        from: [0, 0, 0],
        id: "free-vector",
        to: [2, 2, 2],
        type: "vector"
      }
    ],
    sceneId: "always-method-stretch-scene",
    timeline: [{ type: "wait", duration: 3 }],
    vectorFieldUpdaters: [
      {
        id: "free-vector-drift",
        objectId: "free-vector",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [3, 0, 0]
        },
        type: "moveAlongVectorField"
      }
    ]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1));
  const freeVector = updated.objectGraph.byId["free-vector"];

  assert.equal(freeVector.renderState.kind, "vector");
  if (freeVector.renderState.kind !== "vector") {
    throw new Error("expected vector render state");
  }

  assert.deepEqual(freeVector.renderState.from, [2, 0, 0]);
  assert.deepEqual(freeVector.renderState.to, [6, 2, 2]);
  assert.deepEqual(freeVector.boundingBox, {
    center: [4, 1, 1],
    kind: "finite",
    max: [6, 2, 2],
    min: [2, 0, 0]
  });
});

test("applies always-method dimension setters after object frame updaters", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "width-vector-set-width",
        objectId: "width-vector",
        operation: {
          type: "setWidth",
          width: 6
        }
      },
      {
        id: "height-vector-set-height",
        objectId: "height-vector",
        operation: {
          height: 4,
          stretch: true,
          type: "setHeight"
        }
      },
      {
        id: "depth-vector-set-depth",
        objectId: "depth-vector",
        operation: {
          depth: 5,
          stretch: true,
          type: "setDepth"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-8, 8] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-8, 8] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 3, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "width-vector",
        from: [0, 0, 0],
        id: "width-vector",
        to: [2, 1, 1],
        type: "vector"
      },
      {
        colorRole: "attention",
        conceptId: "height-vector",
        from: [0, 0, 0],
        id: "height-vector",
        to: [2, 1, 2],
        type: "vector"
      },
      {
        colorRole: "attention",
        conceptId: "depth-vector",
        from: [0, 0, 0],
        id: "depth-vector",
        to: [2, 1, 2],
        type: "vector"
      }
    ],
    sceneId: "always-method-dimension-setter-scene",
    timeline: [{ type: "wait", duration: 3 }],
    vectorFieldUpdaters: [
      {
        id: "width-vector-drift",
        objectId: "width-vector",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [3, 0, 0]
        },
        type: "moveAlongVectorField"
      },
      {
        id: "height-vector-drift",
        objectId: "height-vector",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [1, 1, 0]
        },
        type: "moveAlongVectorField"
      },
      {
        id: "depth-vector-drift",
        objectId: "depth-vector",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [0, 0, 1]
        },
        type: "moveAlongVectorField"
      }
    ]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1));
  const widthVector = updated.objectGraph.byId["width-vector"];
  const heightVector = updated.objectGraph.byId["height-vector"];
  const depthVector = updated.objectGraph.byId["depth-vector"];

  assert.equal(widthVector.renderState.kind, "vector");
  assert.equal(heightVector.renderState.kind, "vector");
  assert.equal(depthVector.renderState.kind, "vector");
  if (widthVector.renderState.kind !== "vector" || heightVector.renderState.kind !== "vector" || depthVector.renderState.kind !== "vector") {
    throw new Error("expected vector render states");
  }

  assert.deepEqual(widthVector.renderState.from, [1, -1, -1]);
  assert.deepEqual(widthVector.renderState.to, [7, 2, 2]);
  assert.deepEqual(heightVector.renderState.from, [1, -0.5, 0]);
  assert.deepEqual(heightVector.renderState.to, [3, 3.5, 2]);
  assert.deepEqual(depthVector.renderState.from, [0, 0, -0.5]);
  assert.deepEqual(depthVector.renderState.to, [2, 1, 4.5]);
});

test("applies always-method dimension matchers after object frame updaters", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "width-source-match-width",
        objectId: "width-source",
        operation: {
          targetObjectId: "width-target",
          type: "matchWidth"
        }
      },
      {
        id: "height-source-match-height",
        objectId: "height-source",
        operation: {
          stretch: true,
          targetObjectId: "height-target",
          type: "matchHeight"
        }
      },
      {
        id: "depth-source-match-depth",
        objectId: "depth-source",
        operation: {
          stretch: true,
          targetObjectId: "depth-target",
          type: "matchDepth"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-8, 8] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-8, 8] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 6, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "width-source",
        from: [0, 0, 0],
        id: "width-source",
        to: [2, 1, 1],
        type: "vector"
      },
      {
        colorRole: "function",
        conceptId: "width-target",
        from: [0, 0, 0],
        id: "width-target",
        to: [6, 2, 2],
        type: "vector"
      },
      {
        colorRole: "attention",
        conceptId: "height-source",
        from: [0, 0, 0],
        id: "height-source",
        to: [2, 1, 2],
        type: "vector"
      },
      {
        colorRole: "function",
        conceptId: "height-target",
        from: [0, 0, 0],
        id: "height-target",
        to: [3, 4, 3],
        type: "vector"
      },
      {
        colorRole: "attention",
        conceptId: "depth-source",
        from: [0, 0, 0],
        id: "depth-source",
        to: [2, 1, 2],
        type: "vector"
      },
      {
        colorRole: "function",
        conceptId: "depth-target",
        from: [0, 0, 0],
        id: "depth-target",
        to: [3, 3, 5],
        type: "vector"
      }
    ],
    sceneId: "always-method-dimension-match-scene",
    timeline: [{ type: "wait", duration: 3 }],
    vectorFieldUpdaters: [
      {
        id: "width-source-drift",
        objectId: "width-source",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [3, 0, 0]
        },
        type: "moveAlongVectorField"
      },
      {
        id: "height-source-drift",
        objectId: "height-source",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [1, 1, 0]
        },
        type: "moveAlongVectorField"
      },
      {
        id: "depth-source-drift",
        objectId: "depth-source",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [0, 0, 1]
        },
        type: "moveAlongVectorField"
      }
    ]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1));
  const widthSource = updated.objectGraph.byId["width-source"];
  const heightSource = updated.objectGraph.byId["height-source"];
  const depthSource = updated.objectGraph.byId["depth-source"];

  assert.equal(widthSource.renderState.kind, "vector");
  assert.equal(heightSource.renderState.kind, "vector");
  assert.equal(depthSource.renderState.kind, "vector");
  if (widthSource.renderState.kind !== "vector" || heightSource.renderState.kind !== "vector" || depthSource.renderState.kind !== "vector") {
    throw new Error("expected vector render states");
  }

  assert.deepEqual(widthSource.renderState.from, [1, -1, -1]);
  assert.deepEqual(widthSource.renderState.to, [7, 2, 2]);
  assert.deepEqual(heightSource.renderState.from, [1, -0.5, 0]);
  assert.deepEqual(heightSource.renderState.to, [3, 3.5, 2]);
  assert.deepEqual(depthSource.renderState.from, [0, 0, -0.5]);
  assert.deepEqual(depthSource.renderState.to, [2, 1, 4.5]);
});

test("evaluates f_always-style tracker factor before scaling", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "free-vector-scale-from-tracker",
        objectId: "free-vector",
        operation: {
          factorExpression: { trackerId: "parameter:scale-factor", type: "tracker" },
          type: "scale"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "free-vector",
        from: [0, 0, 0],
        id: "free-vector",
        to: [2, 2, 0],
        type: "vector"
      }
    ],
    parameters: [
      {
        id: "scale-factor",
        label: "Scale",
        max: 3,
        min: 0,
        role: "control",
        value: 0.5
      }
    ],
    sceneId: "always-method-scale-tracker-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const freeVector = updated.objectGraph.byId["free-vector"];

  assert.equal(freeVector.renderState.kind, "vector");
  if (freeVector.renderState.kind !== "vector") {
    throw new Error("expected vector render state");
  }

  assert.deepEqual(freeVector.renderState.from, [0.5, 0.5, 0]);
  assert.deepEqual(freeVector.renderState.to, [1.5, 1.5, 0]);
  assert.deepEqual(freeVector.boundingBox, {
    center: [1, 1, 0],
    kind: "finite",
    max: [1.5, 1.5, 0],
    min: [0.5, 0.5, 0]
  });
});

test("applies always-method rotate after object frame updaters", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "free-vector-rotate",
        objectId: "free-vector",
        operation: {
          angleRadians: Math.PI / 2,
          type: "rotate"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "free-vector",
        from: [0, 0, 0],
        id: "free-vector",
        to: [2, 0, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-rotate-scene",
    timeline: [{ type: "wait", duration: 3 }],
    vectorFieldUpdaters: [
      {
        id: "free-vector-drift",
        objectId: "free-vector",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [2, 0, 0]
        },
        type: "moveAlongVectorField"
      }
    ]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1));
  const freeVector = updated.objectGraph.byId["free-vector"];

  assert.equal(freeVector.renderState.kind, "vector");
  if (freeVector.renderState.kind !== "vector") {
    throw new Error("expected vector render state");
  }

  assert.deepEqual(roundedVec3(freeVector.renderState.from), [3, -1, 0]);
  assert.deepEqual(roundedVec3(freeVector.renderState.to), [3, 1, 0]);
  assert.equal(freeVector.boundingBox.kind, "finite");
  if (freeVector.boundingBox.kind !== "finite") {
    throw new Error("expected finite bounding box");
  }
  assert.deepEqual(roundedVec3(freeVector.boundingBox.center), [3, 0, 0]);
  assert.deepEqual(roundedVec3(freeVector.boundingBox.max), [3, 1, 0]);
  assert.deepEqual(roundedVec3(freeVector.boundingBox.min), [3, -1, 0]);
});

test("evaluates f_always-style tracker angle before rotating", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "free-vector-rotate-from-tracker",
        objectId: "free-vector",
        operation: {
          angleExpression: { trackerId: "parameter:theta", type: "tracker" },
          type: "rotate"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "free-vector",
        from: [0, 0, 0],
        id: "free-vector",
        to: [2, 0, 0],
        type: "vector"
      }
    ],
    parameters: [
      {
        id: "theta",
        label: "theta",
        max: Math.PI,
        min: -Math.PI,
        role: "control",
        value: Math.PI / 2
      }
    ],
    sceneId: "always-method-rotate-tracker-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const freeVector = updated.objectGraph.byId["free-vector"];

  assert.equal(freeVector.renderState.kind, "vector");
  if (freeVector.renderState.kind !== "vector") {
    throw new Error("expected vector render state");
  }

  assert.deepEqual(roundedVec3(freeVector.renderState.from), [1, -1, 0]);
  assert.deepEqual(roundedVec3(freeVector.renderState.to), [1, 1, 0]);
  assert.equal(freeVector.boundingBox.kind, "finite");
  if (freeVector.boundingBox.kind !== "finite") {
    throw new Error("expected finite bounding box");
  }
  assert.deepEqual(roundedVec3(freeVector.boundingBox.center), [1, 0, 0]);
  assert.deepEqual(roundedVec3(freeVector.boundingBox.max), [1, 1, 0]);
  assert.deepEqual(roundedVec3(freeVector.boundingBox.min), [1, -1, 0]);
});

test("classifies always-method updaters as dependency-driven Manim updater entries", () => {
  const runtime = buildMathSceneRuntimeState(alwaysMethodScene(), 2);
  const plan = buildMathUpdaterSignaturePlan(runtime.updaters);
  const entry = plan.entries.find((candidate) => candidate.id === "follower-next-to-anchor");

  assert.ok(entry);
  assert.equal(entry.executionMode, "dependency-redraw");
  assert.equal(entry.receivesDeltaSeconds, false);
  assert.equal(entry.receivesTimelineProgress, false);
  assert.equal(entry.source, "alwaysMethod");
  assert.ok(plan.dependencyUpdaterIds.includes("follower-next-to-anchor"));
});

test("summarizes mixed always-method nextTo and alignTo geometry evidence after updater execution", () => {
  const scene: MathSceneSpec = {
    ...alwaysMethodScene(),
    alwaysMethodUpdaters: [
      ...alwaysMethodScene().alwaysMethodUpdaters!,
      {
        id: "anchor-align-to-guide",
        objectId: "anchor",
        operation: {
          direction: [0, 1, 0],
          targetObjectId: "guide",
          type: "alignTo"
        }
      }
    ],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 3, expectedTokenCount: 0 },
    objects: [
      ...alwaysMethodScene().objects,
      {
        colorRole: "reference",
        conceptId: "guide",
        from: [5, 1, 0],
        id: "guide",
        to: [6, 1, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-mixed-evidence-scene",
    vectorFieldUpdaters: []
  };
  const runtime = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const evidence = buildAlwaysMethodUpdaterEvidence(scene, runtime);
  const attributes = alwaysMethodUpdaterEvidenceDataAttributes(evidence);

  assert.equal(evidence.updaterCount, 2);
  assert.equal(evidence.placedCount, 2);
  assert.equal(evidence.missingObjectCount, 0);
  assert.equal(evidence.missingTargetCount, 0);
  assert.equal(evidence.dynamicBuffCount, 0);
  assert.equal(evidence.updaterIds, "follower-next-to-anchor,anchor-align-to-guide");
  assert.equal(evidence.objectIds, "anchor,follower");
  assert.equal(evidence.targetObjectIds, "anchor,guide");
  assert.equal(evidence.operationTypes, "alignTo,nextTo");
  assert.equal(evidence.buffSummary, "follower-next-to-anchor=0.250,anchor-align-to-guide=0.000");
  assert.equal(evidence.directionSummary, "follower-next-to-anchor=[0.000,1.000,0.000],anchor-align-to-guide=[0.000,1.000,0.000]");
  assert.equal(
    evidence.placementSummary,
    "follower-next-to-anchor:expected=0.250:observed=0.250:error=0.000,anchor-align-to-guide:expected=0.000:observed=0.000:error=0.000"
  );
  assert.equal(evidence.maxPlacementError, 0);
  assert.equal(
    evidence.summary,
    "alwaysMethod:updaters=2:placed=2:missingObjects=0:missingTargets=0:dynamicBuff=0:maxError=0.000:ids=follower-next-to-anchor,anchor-align-to-guide"
  );
  assert.equal(attributes["data-viz-manim-always-method-operation-types"], "alignTo,nextTo");
  assert.equal(attributes["data-viz-manim-always-method-placed-count"], "2");
  assert.equal(attributes["data-viz-manim-always-method-summary"], evidence.summary);
});

test("summarizes always-method coordinate matching evidence after updater execution", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "follower-match-y-anchor",
        objectId: "follower",
        operation: {
          targetObjectId: "anchor",
          type: "matchY"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-4, 8], y: [-4, 8], z: [-1, 1] },
      worldRange: { x: [-4, 8], y: [-4, 8], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "function",
        conceptId: "anchor",
        from: [2, 2, 0],
        id: "anchor",
        to: [4, 4, 0],
        type: "vector"
      },
      {
        colorRole: "attention",
        conceptId: "follower",
        from: [0, 0, 0],
        id: "follower",
        to: [0, 2, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-coordinate-match-evidence-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const runtime = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const evidence = buildAlwaysMethodUpdaterEvidence(scene, runtime);
  const attributes = alwaysMethodUpdaterEvidenceDataAttributes(evidence);

  assert.equal(evidence.updaterCount, 1);
  assert.equal(evidence.placedCount, 1);
  assert.equal(evidence.missingObjectCount, 0);
  assert.equal(evidence.missingTargetCount, 0);
  assert.equal(evidence.dynamicBuffCount, 0);
  assert.equal(evidence.updaterIds, "follower-match-y-anchor");
  assert.equal(evidence.objectIds, "follower");
  assert.equal(evidence.targetObjectIds, "anchor");
  assert.equal(evidence.operationTypes, "matchY");
  assert.equal(evidence.buffSummary, "follower-match-y-anchor=0.000");
  assert.equal(evidence.directionSummary, "follower-match-y-anchor=[0.000,1.000,0.000]");
  assert.equal(evidence.placementSummary, "follower-match-y-anchor:expected=0.000:observed=0.000:error=0.000");
  assert.equal(evidence.maxPlacementError, 0);
  assert.equal(
    evidence.summary,
    "alwaysMethod:updaters=1:placed=1:missingObjects=0:missingTargets=0:dynamicBuff=0:maxError=0.000:ids=follower-match-y-anchor"
  );
  assert.equal(attributes["data-viz-manim-always-method-operation-types"], "matchY");
  assert.equal(attributes["data-viz-manim-always-method-placement-summary"], evidence.placementSummary);
  assert.equal(attributes["data-viz-manim-always-method-summary"], evidence.summary);
});

test("summarizes tracker-driven always-method coordinate setter evidence without target objects", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "follower-set-y-from-tracker",
        objectId: "follower",
        operation: {
          coordinateExpression: { trackerId: "parameter:target-y", type: "tracker" },
          type: "setY"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-4, 8], y: [-4, 8], z: [-1, 1] },
      worldRange: { x: [-4, 8], y: [-4, 8], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "follower",
        from: [0, 0, 0],
        id: "follower",
        to: [0, 2, 0],
        type: "vector"
      }
    ],
    parameters: [
      {
        id: "target-y",
        label: "Target y",
        max: 8,
        min: -4,
        role: "control",
        value: 5
      }
    ],
    sceneId: "always-method-set-y-evidence-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const runtime = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const evidence = buildAlwaysMethodUpdaterEvidence(scene, runtime);
  const attributes = alwaysMethodUpdaterEvidenceDataAttributes(evidence);

  assert.equal(evidence.updaterCount, 1);
  assert.equal(evidence.placedCount, 1);
  assert.equal(evidence.missingObjectCount, 0);
  assert.equal(evidence.missingTargetCount, 0);
  assert.equal(evidence.dynamicBuffCount, 1);
  assert.equal(evidence.updaterIds, "follower-set-y-from-tracker");
  assert.equal(evidence.objectIds, "follower");
  assert.equal(evidence.targetObjectIds, "none");
  assert.equal(evidence.operationTypes, "setY");
  assert.equal(evidence.buffSummary, "follower-set-y-from-tracker=0.000");
  assert.equal(evidence.directionSummary, "follower-set-y-from-tracker=[0.000,1.000,0.000]");
  assert.equal(evidence.placementSummary, "follower-set-y-from-tracker:expected=5.000:observed=5.000:error=0.000");
  assert.equal(evidence.maxPlacementError, 0);
  assert.equal(
    evidence.summary,
    "alwaysMethod:updaters=1:placed=1:missingObjects=0:missingTargets=0:dynamicBuff=1:maxError=0.000:ids=follower-set-y-from-tracker"
  );
  assert.equal(attributes["data-viz-manim-always-method-operation-types"], "setY");
  assert.equal(attributes["data-viz-manim-always-method-target-object-ids"], "none");
  assert.equal(attributes["data-viz-manim-always-method-placement-summary"], evidence.placementSummary);
});

test("summarizes tracker-driven always-method moveTo evidence without target objects", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "follower-move-to-trackers",
        objectId: "follower",
        operation: {
          pointExpression: {
            x: { trackerId: "parameter:target-x", type: "tracker" },
            y: { trackerId: "parameter:target-y", type: "tracker" },
            z: { type: "constant", value: 0 }
          },
          type: "moveTo"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-4, 8], y: [-4, 8], z: [-1, 1] },
      worldRange: { x: [-4, 8], y: [-4, 8], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "follower",
        from: [0, 0, 0],
        id: "follower",
        to: [0, 2, 0],
        type: "vector"
      }
    ],
    parameters: [
      {
        id: "target-x",
        label: "Target x",
        max: 8,
        min: -4,
        role: "control",
        value: 4
      },
      {
        id: "target-y",
        label: "Target y",
        max: 8,
        min: -4,
        role: "control",
        value: 5
      }
    ],
    sceneId: "always-method-move-to-evidence-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const runtime = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const evidence = buildAlwaysMethodUpdaterEvidence(scene, runtime);
  const attributes = alwaysMethodUpdaterEvidenceDataAttributes(evidence);

  assert.equal(evidence.updaterCount, 1);
  assert.equal(evidence.placedCount, 1);
  assert.equal(evidence.missingObjectCount, 0);
  assert.equal(evidence.missingTargetCount, 0);
  assert.equal(evidence.dynamicBuffCount, 1);
  assert.equal(evidence.updaterIds, "follower-move-to-trackers");
  assert.equal(evidence.objectIds, "follower");
  assert.equal(evidence.targetObjectIds, "none");
  assert.equal(evidence.operationTypes, "moveTo");
  assert.equal(evidence.buffSummary, "follower-move-to-trackers=0.000");
  assert.equal(evidence.directionSummary, "follower-move-to-trackers=[1.000,1.000,1.000]");
  assert.equal(
    evidence.placementSummary,
    "follower-move-to-trackers:expected=[4.000,5.000,0.000]:observed=[4.000,5.000,0.000]:error=0.000"
  );
  assert.equal(evidence.maxPlacementError, 0);
  assert.equal(
    evidence.summary,
    "alwaysMethod:updaters=1:placed=1:missingObjects=0:missingTargets=0:dynamicBuff=1:maxError=0.000:ids=follower-move-to-trackers"
  );
  assert.equal(attributes["data-viz-manim-always-method-operation-types"], "moveTo");
  assert.equal(attributes["data-viz-manim-always-method-target-object-ids"], "none");
  assert.equal(attributes["data-viz-manim-always-method-placement-summary"], evidence.placementSummary);
});

test("summarizes targetless always-method center evidence", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "follower-center",
        objectId: "follower",
        operation: {
          type: "center"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-4, 8], y: [-4, 8], z: [-1, 1] },
      worldRange: { x: [-4, 8], y: [-4, 8], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "follower",
        from: [1, 2, 0],
        id: "follower",
        to: [3, 4, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-center-evidence-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const runtime = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const evidence = buildAlwaysMethodUpdaterEvidence(scene, runtime);
  const attributes = alwaysMethodUpdaterEvidenceDataAttributes(evidence);

  assert.equal(evidence.updaterCount, 1);
  assert.equal(evidence.placedCount, 1);
  assert.equal(evidence.missingObjectCount, 0);
  assert.equal(evidence.missingTargetCount, 0);
  assert.equal(evidence.dynamicBuffCount, 0);
  assert.equal(evidence.updaterIds, "follower-center");
  assert.equal(evidence.objectIds, "follower");
  assert.equal(evidence.targetObjectIds, "none");
  assert.equal(evidence.operationTypes, "center");
  assert.equal(evidence.buffSummary, "follower-center=0.000");
  assert.equal(evidence.directionSummary, "follower-center=[1.000,1.000,1.000]");
  assert.equal(evidence.placementSummary, "follower-center:expected=[0.000,0.000,0.000]:observed=[0.000,0.000,0.000]:error=0.000");
  assert.equal(evidence.maxPlacementError, 0);
  assert.equal(
    evidence.summary,
    "alwaysMethod:updaters=1:placed=1:missingObjects=0:missingTargets=0:dynamicBuff=0:maxError=0.000:ids=follower-center"
  );
  assert.equal(attributes["data-viz-manim-always-method-operation-types"], "center");
  assert.equal(attributes["data-viz-manim-always-method-target-object-ids"], "none");
  assert.equal(attributes["data-viz-manim-always-method-placement-summary"], evidence.placementSummary);
});

test("summarizes targetless always-method shift evidence", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "follower-shift",
        objectId: "follower",
        operation: {
          type: "shift",
          vector: [0.5, -1, 2]
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-4, 8], y: [-4, 8], z: [-4, 4] },
      worldRange: { x: [-4, 8], y: [-4, 8], z: [-4, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "follower",
        from: [1, 2, 0],
        id: "follower",
        to: [3, 4, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-shift-evidence-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const runtime = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const evidence = buildAlwaysMethodUpdaterEvidence(scene, runtime);
  const attributes = alwaysMethodUpdaterEvidenceDataAttributes(evidence);

  assert.equal(evidence.updaterCount, 1);
  assert.equal(evidence.placedCount, 1);
  assert.equal(evidence.missingObjectCount, 0);
  assert.equal(evidence.missingTargetCount, 0);
  assert.equal(evidence.dynamicBuffCount, 0);
  assert.equal(evidence.updaterIds, "follower-shift");
  assert.equal(evidence.objectIds, "follower");
  assert.equal(evidence.targetObjectIds, "none");
  assert.equal(evidence.operationTypes, "shift");
  assert.equal(evidence.buffSummary, "follower-shift=0.000");
  assert.equal(evidence.directionSummary, "follower-shift=[0.500,-1.000,2.000]");
  assert.equal(evidence.placementSummary, "follower-shift:expected=[0.500,-1.000,2.000]:observed=[0.500,-1.000,2.000]:error=0.000");
  assert.equal(evidence.boundingBoxSummary, "follower-shift:objectCenter=[2.500,2.000,2.000]:targetCenter=none");
  assert.equal(evidence.maxPlacementError, 0);
  assert.equal(
    evidence.summary,
    "alwaysMethod:updaters=1:placed=1:missingObjects=0:missingTargets=0:dynamicBuff=0:maxError=0.000:ids=follower-shift"
  );
  assert.equal(attributes["data-viz-manim-always-method-operation-types"], "shift");
  assert.equal(attributes["data-viz-manim-always-method-target-object-ids"], "none");
  assert.equal(attributes["data-viz-manim-always-method-placement-summary"], evidence.placementSummary);
});

test("summarizes targetless always-method toCorner frame evidence", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "follower-to-corner",
        objectId: "follower",
        operation: {
          buff: 0.5,
          direction: [1, 1, 0],
          frame: { max: [6, 6, 0], min: [-6, -6, 0] },
          type: "toCorner"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "follower",
        from: [1, 2, 0],
        id: "follower",
        to: [3, 4, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-to-corner-evidence-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const runtime = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const evidence = buildAlwaysMethodUpdaterEvidence(scene, runtime);
  const attributes = alwaysMethodUpdaterEvidenceDataAttributes(evidence);

  assert.equal(evidence.updaterCount, 1);
  assert.equal(evidence.placedCount, 1);
  assert.equal(evidence.missingObjectCount, 0);
  assert.equal(evidence.missingTargetCount, 0);
  assert.equal(evidence.dynamicBuffCount, 0);
  assert.equal(evidence.updaterIds, "follower-to-corner");
  assert.equal(evidence.objectIds, "follower");
  assert.equal(evidence.targetObjectIds, "none");
  assert.equal(evidence.operationTypes, "toCorner");
  assert.equal(evidence.buffSummary, "follower-to-corner=0.500");
  assert.equal(evidence.directionSummary, "follower-to-corner=[1.000,1.000,0.000]");
  assert.equal(
    evidence.placementSummary,
    "follower-to-corner:expected=[5.500,5.500,0.000]:observed=[5.500,5.500,0.000]:error=0.000"
  );
  assert.equal(evidence.boundingBoxSummary, "follower-to-corner:objectCenter=[4.500,4.500,0.000]:targetCenter=frame:[5.500,5.500,0.000]");
  assert.equal(evidence.maxPlacementError, 0);
  assert.equal(
    evidence.summary,
    "alwaysMethod:updaters=1:placed=1:missingObjects=0:missingTargets=0:dynamicBuff=0:maxError=0.000:ids=follower-to-corner"
  );
  assert.equal(attributes["data-viz-manim-always-method-operation-types"], "toCorner");
  assert.equal(attributes["data-viz-manim-always-method-target-object-ids"], "none");
  assert.equal(attributes["data-viz-manim-always-method-placement-summary"], evidence.placementSummary);
});

test("summarizes targetless always-method scale evidence", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "follower-scale",
        objectId: "follower",
        operation: {
          factor: 2,
          type: "scale"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "follower",
        from: [1, 2, 0],
        id: "follower",
        to: [3, 4, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-scale-evidence-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const runtime = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const evidence = buildAlwaysMethodUpdaterEvidence(scene, runtime);
  const attributes = alwaysMethodUpdaterEvidenceDataAttributes(evidence);

  assert.equal(evidence.updaterCount, 1);
  assert.equal(evidence.placedCount, 1);
  assert.equal(evidence.missingObjectCount, 0);
  assert.equal(evidence.missingTargetCount, 0);
  assert.equal(evidence.dynamicBuffCount, 0);
  assert.equal(evidence.updaterIds, "follower-scale");
  assert.equal(evidence.objectIds, "follower");
  assert.equal(evidence.targetObjectIds, "none");
  assert.equal(evidence.operationTypes, "scale");
  assert.equal(evidence.buffSummary, "follower-scale=0.000");
  assert.equal(evidence.directionSummary, "follower-scale=[1.000,1.000,1.000]");
  assert.equal(evidence.placementSummary, "follower-scale:expected=[4.000,4.000,0.000]:observed=[4.000,4.000,0.000]:error=0.000");
  assert.equal(evidence.boundingBoxSummary, "follower-scale:objectCenter=[2.000,3.000,0.000]:targetCenter=scale:[4.000,4.000,0.000]");
  assert.equal(evidence.maxPlacementError, 0);
  assert.equal(
    evidence.summary,
    "alwaysMethod:updaters=1:placed=1:missingObjects=0:missingTargets=0:dynamicBuff=0:maxError=0.000:ids=follower-scale"
  );
  assert.equal(attributes["data-viz-manim-always-method-operation-types"], "scale");
  assert.equal(attributes["data-viz-manim-always-method-target-object-ids"], "none");
  assert.equal(attributes["data-viz-manim-always-method-placement-summary"], evidence.placementSummary);
});

test("summarizes targetless always-method stretch evidence", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "follower-stretch-x",
        objectId: "follower",
        operation: {
          dim: "x",
          factor: 2,
          type: "stretch"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "follower",
        from: [0, 0, 0],
        id: "follower",
        to: [2, 2, 2],
        type: "vector"
      }
    ],
    sceneId: "always-method-stretch-evidence-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const runtime = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const evidence = buildAlwaysMethodUpdaterEvidence(scene, runtime);
  const attributes = alwaysMethodUpdaterEvidenceDataAttributes(evidence);

  assert.equal(evidence.updaterCount, 1);
  assert.equal(evidence.placedCount, 1);
  assert.equal(evidence.missingObjectCount, 0);
  assert.equal(evidence.missingTargetCount, 0);
  assert.equal(evidence.dynamicBuffCount, 0);
  assert.equal(evidence.updaterIds, "follower-stretch-x");
  assert.equal(evidence.objectIds, "follower");
  assert.equal(evidence.targetObjectIds, "none");
  assert.equal(evidence.operationTypes, "stretch");
  assert.equal(evidence.buffSummary, "follower-stretch-x=0.000");
  assert.equal(evidence.directionSummary, "follower-stretch-x=[1.000,0.000,0.000]");
  assert.equal(evidence.placementSummary, "follower-stretch-x:expected=[4.000,2.000,2.000]:observed=[4.000,2.000,2.000]:error=0.000");
  assert.equal(evidence.boundingBoxSummary, "follower-stretch-x:objectCenter=[1.000,1.000,1.000]:targetCenter=stretch:[4.000,2.000,2.000]");
  assert.equal(evidence.maxPlacementError, 0);
  assert.equal(
    evidence.summary,
    "alwaysMethod:updaters=1:placed=1:missingObjects=0:missingTargets=0:dynamicBuff=0:maxError=0.000:ids=follower-stretch-x"
  );
  assert.equal(attributes["data-viz-manim-always-method-operation-types"], "stretch");
  assert.equal(attributes["data-viz-manim-always-method-target-object-ids"], "none");
  assert.equal(attributes["data-viz-manim-always-method-placement-summary"], evidence.placementSummary);
});

test("summarizes targetless always-method dimension setter evidence", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "follower-set-width",
        objectId: "width-vector",
        operation: {
          type: "setWidth",
          width: 6
        }
      },
      {
        id: "follower-set-height",
        objectId: "height-vector",
        operation: {
          height: 4,
          stretch: true,
          type: "setHeight"
        }
      },
      {
        id: "follower-set-depth",
        objectId: "depth-vector",
        operation: {
          depth: 5,
          stretch: true,
          type: "setDepth"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-8, 8] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-8, 8] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 3, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "width-vector",
        from: [0, 0, 0],
        id: "width-vector",
        to: [2, 1, 1],
        type: "vector"
      },
      {
        colorRole: "attention",
        conceptId: "height-vector",
        from: [0, 0, 0],
        id: "height-vector",
        to: [2, 1, 2],
        type: "vector"
      },
      {
        colorRole: "attention",
        conceptId: "depth-vector",
        from: [0, 0, 0],
        id: "depth-vector",
        to: [2, 1, 2],
        type: "vector"
      }
    ],
    sceneId: "always-method-dimension-evidence-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const runtime = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const evidence = buildAlwaysMethodUpdaterEvidence(scene, runtime);
  const attributes = alwaysMethodUpdaterEvidenceDataAttributes(evidence);

  assert.equal(evidence.updaterCount, 3);
  assert.equal(evidence.placedCount, 3);
  assert.equal(evidence.missingObjectCount, 0);
  assert.equal(evidence.missingTargetCount, 0);
  assert.equal(evidence.dynamicBuffCount, 0);
  assert.equal(evidence.updaterIds, "follower-set-width,follower-set-height,follower-set-depth");
  assert.equal(evidence.objectIds, "depth-vector,height-vector,width-vector");
  assert.equal(evidence.targetObjectIds, "none");
  assert.equal(evidence.operationTypes, "setDepth,setHeight,setWidth");
  assert.equal(evidence.buffSummary, "follower-set-width=0.000,follower-set-height=0.000,follower-set-depth=0.000");
  assert.equal(
    evidence.directionSummary,
    "follower-set-width=[1.000,0.000,0.000],follower-set-height=[0.000,1.000,0.000],follower-set-depth=[0.000,0.000,1.000]"
  );
  assert.equal(
    evidence.placementSummary,
    "follower-set-width:expected=[6.000,3.000,3.000]:observed=[6.000,3.000,3.000]:error=0.000," +
      "follower-set-height:expected=[2.000,4.000,2.000]:observed=[2.000,4.000,2.000]:error=0.000," +
      "follower-set-depth:expected=[2.000,1.000,5.000]:observed=[2.000,1.000,5.000]:error=0.000"
  );
  assert.equal(
    evidence.boundingBoxSummary,
    "follower-set-width:objectCenter=[1.000,0.500,0.500]:targetCenter=setWidth:[6.000,3.000,3.000]," +
      "follower-set-height:objectCenter=[1.000,0.500,1.000]:targetCenter=setHeight:[2.000,4.000,2.000]," +
      "follower-set-depth:objectCenter=[1.000,0.500,1.000]:targetCenter=setDepth:[2.000,1.000,5.000]"
  );
  assert.equal(evidence.maxPlacementError, 0);
  assert.equal(
    evidence.summary,
    "alwaysMethod:updaters=3:placed=3:missingObjects=0:missingTargets=0:dynamicBuff=0:maxError=0.000:ids=follower-set-width,follower-set-height,follower-set-depth"
  );
  assert.equal(attributes["data-viz-manim-always-method-operation-types"], "setDepth,setHeight,setWidth");
  assert.equal(attributes["data-viz-manim-always-method-target-object-ids"], "none");
  assert.equal(attributes["data-viz-manim-always-method-placement-summary"], evidence.placementSummary);
});

test("summarizes target-backed always-method dimension matcher evidence", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "source-match-width",
        objectId: "width-source",
        operation: {
          targetObjectId: "width-target",
          type: "matchWidth"
        }
      },
      {
        id: "source-match-height",
        objectId: "height-source",
        operation: {
          stretch: true,
          targetObjectId: "height-target",
          type: "matchHeight"
        }
      },
      {
        id: "source-match-depth",
        objectId: "depth-source",
        operation: {
          stretch: true,
          targetObjectId: "depth-target",
          type: "matchDepth"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-8, 8] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-8, 8] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 6, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "width-source",
        from: [0, 0, 0],
        id: "width-source",
        to: [2, 1, 1],
        type: "vector"
      },
      {
        colorRole: "function",
        conceptId: "width-target",
        from: [0, 0, 0],
        id: "width-target",
        to: [6, 2, 2],
        type: "vector"
      },
      {
        colorRole: "attention",
        conceptId: "height-source",
        from: [0, 0, 0],
        id: "height-source",
        to: [2, 1, 2],
        type: "vector"
      },
      {
        colorRole: "function",
        conceptId: "height-target",
        from: [0, 0, 0],
        id: "height-target",
        to: [3, 4, 3],
        type: "vector"
      },
      {
        colorRole: "attention",
        conceptId: "depth-source",
        from: [0, 0, 0],
        id: "depth-source",
        to: [2, 1, 2],
        type: "vector"
      },
      {
        colorRole: "function",
        conceptId: "depth-target",
        from: [0, 0, 0],
        id: "depth-target",
        to: [3, 3, 5],
        type: "vector"
      }
    ],
    sceneId: "always-method-dimension-match-evidence-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const runtime = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const evidence = buildAlwaysMethodUpdaterEvidence(scene, runtime);
  const attributes = alwaysMethodUpdaterEvidenceDataAttributes(evidence);

  assert.equal(evidence.updaterCount, 3);
  assert.equal(evidence.placedCount, 3);
  assert.equal(evidence.missingObjectCount, 0);
  assert.equal(evidence.missingTargetCount, 0);
  assert.equal(evidence.dynamicBuffCount, 0);
  assert.equal(evidence.updaterIds, "source-match-width,source-match-height,source-match-depth");
  assert.equal(evidence.objectIds, "depth-source,height-source,width-source");
  assert.equal(evidence.targetObjectIds, "depth-target,height-target,width-target");
  assert.equal(evidence.operationTypes, "matchDepth,matchHeight,matchWidth");
  assert.equal(evidence.buffSummary, "source-match-width=0.000,source-match-height=0.000,source-match-depth=0.000");
  assert.equal(
    evidence.directionSummary,
    "source-match-width=[1.000,0.000,0.000],source-match-height=[0.000,1.000,0.000],source-match-depth=[0.000,0.000,1.000]"
  );
  assert.equal(
    evidence.placementSummary,
    "source-match-width:expected=[6.000,3.000,3.000]:observed=[6.000,3.000,3.000]:error=0.000," +
      "source-match-height:expected=[2.000,4.000,2.000]:observed=[2.000,4.000,2.000]:error=0.000," +
      "source-match-depth:expected=[2.000,1.000,5.000]:observed=[2.000,1.000,5.000]:error=0.000"
  );
  assert.equal(
    evidence.boundingBoxSummary,
    "source-match-width:objectCenter=[1.000,0.500,0.500]:targetCenter=matchWidth:[6.000,3.000,3.000]," +
      "source-match-height:objectCenter=[1.000,0.500,1.000]:targetCenter=matchHeight:[2.000,4.000,2.000]," +
      "source-match-depth:objectCenter=[1.000,0.500,1.000]:targetCenter=matchDepth:[2.000,1.000,5.000]"
  );
  assert.equal(evidence.maxPlacementError, 0);
  assert.equal(
    evidence.summary,
    "alwaysMethod:updaters=3:placed=3:missingObjects=0:missingTargets=0:dynamicBuff=0:maxError=0.000:ids=source-match-width,source-match-height,source-match-depth"
  );
  assert.equal(attributes["data-viz-manim-always-method-operation-types"], "matchDepth,matchHeight,matchWidth");
  assert.equal(attributes["data-viz-manim-always-method-target-object-ids"], "depth-target,height-target,width-target");
  assert.equal(attributes["data-viz-manim-always-method-placement-summary"], evidence.placementSummary);
});

test("summarizes targetless always-method rotate evidence", () => {
  const scene: MathSceneSpec = {
    alwaysMethodUpdaters: [
      {
        id: "follower-rotate",
        objectId: "follower",
        operation: {
          angleRadians: Math.PI / 2,
          type: "rotate"
        }
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] },
      worldRange: { x: [-8, 8], y: [-8, 8], z: [-4, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "attention",
        conceptId: "follower",
        from: [1, 2, 0],
        id: "follower",
        to: [3, 2, 0],
        type: "vector"
      }
    ],
    sceneId: "always-method-rotate-evidence-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const runtime = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const evidence = buildAlwaysMethodUpdaterEvidence(scene, runtime);
  const attributes = alwaysMethodUpdaterEvidenceDataAttributes(evidence);

  assert.equal(evidence.updaterCount, 1);
  assert.equal(evidence.placedCount, 1);
  assert.equal(evidence.missingObjectCount, 0);
  assert.equal(evidence.missingTargetCount, 0);
  assert.equal(evidence.dynamicBuffCount, 0);
  assert.equal(evidence.updaterIds, "follower-rotate");
  assert.equal(evidence.objectIds, "follower");
  assert.equal(evidence.targetObjectIds, "none");
  assert.equal(evidence.operationTypes, "rotate");
  assert.equal(evidence.buffSummary, "follower-rotate=0.000");
  assert.equal(evidence.directionSummary, "follower-rotate=[0.000,0.000,1.000]");
  assert.equal(
    evidence.placementSummary,
    "follower-rotate:expected=[[2.000,1.000,0.000];[2.000,3.000,0.000]]:observed=[[2.000,1.000,0.000];[2.000,3.000,0.000]]:error=0.000"
  );
  assert.equal(evidence.boundingBoxSummary, "follower-rotate:objectCenter=[2.000,2.000,0.000]:targetCenter=rotate:[2.000,2.000,0.000]");
  assert.equal(evidence.maxPlacementError, 0);
  assert.equal(
    evidence.summary,
    "alwaysMethod:updaters=1:placed=1:missingObjects=0:missingTargets=0:dynamicBuff=0:maxError=0.000:ids=follower-rotate"
  );
  assert.equal(attributes["data-viz-manim-always-method-operation-types"], "rotate");
  assert.equal(attributes["data-viz-manim-always-method-target-object-ids"], "none");
  assert.equal(attributes["data-viz-manim-always-method-placement-summary"], evidence.placementSummary);
});

test("summarizes always-method nextTo geometry evidence after updater execution", () => {
  const scene = alwaysMethodScene();
  const runtime = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 2));
  const evidence = buildAlwaysMethodUpdaterEvidence(scene, runtime);
  const attributes = alwaysMethodUpdaterEvidenceDataAttributes(evidence);

  assert.equal(evidence.sourceContract, ALWAYS_METHOD_UPDATER_SOURCE_CONTRACT);
  assert.equal(evidence.updaterCount, 1);
  assert.equal(evidence.placedCount, 1);
  assert.equal(evidence.missingObjectCount, 0);
  assert.equal(evidence.missingTargetCount, 0);
  assert.equal(evidence.dynamicBuffCount, 0);
  assert.equal(evidence.updaterIds, "follower-next-to-anchor");
  assert.equal(evidence.objectIds, "follower");
  assert.equal(evidence.targetObjectIds, "anchor");
  assert.equal(evidence.operationTypes, "nextTo");
  assert.equal(evidence.buffSummary, "follower-next-to-anchor=0.250");
  assert.equal(evidence.directionSummary, "follower-next-to-anchor=[0.000,1.000,0.000]");
  assert.equal(evidence.placementSummary, "follower-next-to-anchor:expected=0.250:observed=0.250:error=0.000");
  assert.equal(evidence.boundingBoxSummary, "follower-next-to-anchor:objectCenter=[2.500,0.250,0.000]:targetCenter=[2.500,0.000,0.000]");
  assert.equal(evidence.maxPlacementError, 0);
  assert.equal(
    evidence.summary,
    "alwaysMethod:updaters=1:placed=1:missingObjects=0:missingTargets=0:dynamicBuff=0:maxError=0.000:ids=follower-next-to-anchor"
  );
  assert.equal(attributes["data-viz-manim-always-method-source-contract"], ALWAYS_METHOD_UPDATER_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-always-method-count"], "1");
  assert.equal(attributes["data-viz-manim-always-method-placed-count"], "1");
  assert.equal(attributes["data-viz-manim-always-method-buff-summary"], "follower-next-to-anchor=0.250");
  assert.equal(attributes["data-viz-manim-always-method-summary"], evidence.summary);

  const serialized = serializeAlwaysMethodUpdaterEvidence(evidence);
  assert.doesNotMatch(serialized, /<\/script|undefined|NaN|Infinity/i);
  assert.deepEqual(JSON.parse(serialized), evidence);
});

test("always-method updater source stays pure and registry-owned", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathAlwaysMethodUpdater.ts", "utf8");
  const registrySource = fs.readFileSync("components/visualizations/three/manim/mathUpdaterRegistry.ts", "utf8");

  assert.match(source, /applyAlwaysMethodUpdater/);
  assert.match(source, /buildAlwaysMethodUpdaterEvidence/);
  assert.match(source, /alwaysMethodUpdaterEvidenceDataAttributes/);
  assert.match(source, /serializeAlwaysMethodUpdaterEvidence/);
  assert.match(source, /nextTo/);
  assert.match(source, /alignTo/);
  assert.match(source, /matchX/);
  assert.match(source, /matchY/);
  assert.match(source, /matchZ/);
  assert.match(source, /setX/);
  assert.match(source, /setY/);
  assert.match(source, /setZ/);
  assert.match(source, /setOpacity/);
  assert.match(source, /setStroke/);
  assert.match(source, /setFill/);
  assert.match(source, /setStyle/);
  assert.match(source, /moveTo/);
  assert.match(source, /applyCenter/);
  assert.match(source, /applyScale/);
  assert.match(source, /applyStretch/);
  assert.match(source, /applyVMobjectStyle/);
  assert.match(source, /applyDimensionSetter/);
  assert.match(source, /applyDimensionMatcher/);
  assert.match(source, /applyRotate/);
  assert.match(source, /buildMobjectToEdgeLayoutPlan/);
  assert.match(source, /buildMobjectToCornerLayoutPlan/);
  assert.match(registrySource, /always-method/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
