import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  alwaysUpdaterAuthoringDataAttributes,
  buildAlwaysRedrawDependencyState,
  buildAlwaysUpdaterAuthoringCatalog,
  evaluateAlwaysRedrawFrame,
  evaluateAlwaysRedrawScalarExpression,
  ALWAYS_UPDATER_AUTHORING_SOURCE_CONTRACT,
  serializeAlwaysUpdaterAuthoringCatalog,
  summarizeAlwaysRedrawPlan
} from "./mathAlwaysRedraw";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import { applyMathUpdaters } from "./mathUpdaterRegistry";
import { buildValueTracker, type MathTrackerRegistry } from "./mathValueTracker";
import type { MathObjectSpec, MathSceneSpec } from "./mathSceneTypes";

function trackerRegistry(value: number): MathTrackerRegistry {
  return {
    byId: {
      "parameter:a": buildValueTracker({
        id: "parameter:a",
        label: "a",
        max: 4,
        min: 0,
        role: "control",
        source: "parameter",
        value
      }),
      "curve:progress": buildValueTracker({
        id: "curve:progress",
        max: 1,
        min: 0,
        role: "progress",
        source: "object",
        value: 0.75
      })
    }
  };
}

const baseCurve: Extract<MathObjectSpec, { type: "parametricCurve" }> = {
  colorRole: "function",
  conceptId: "linear-rule",
  id: "line",
  samples: [
    [0, 0, 0],
    [1, 1, 0]
  ],
  type: "parametricCurve"
};
const expectedAlwaysUpdaterAuthoringSourceContract =
  "Mobject.always/f_always/always_redraw: declare updater relationships separately from frame execution";

test("builds deterministic dependency signatures for tracker-driven redraws", () => {
  const state = buildAlwaysRedrawDependencyState(trackerRegistry(2.5), [
    "parameter:a",
    "curve:progress",
    "parameter:missing"
  ]);

  assert.equal(
    state.signature,
    "parameter:a=2.500000@0.625000|curve:progress=0.750000@0.750000|missing:parameter:missing"
  );
  assert.deepEqual(state.missingTrackerIds, ["parameter:missing"]);
  assert.equal(state.byId["parameter:a"].present, true);
  assert.equal(state.byId["parameter:missing"].value, 0);
});

test("evaluates always-redraw frames only when dependency signatures change", () => {
  const plan = {
    dependencyTrackerIds: ["parameter:a"],
    id: "line:always",
    objectId: "line"
  };
  const frame = evaluateAlwaysRedrawFrame(plan, trackerRegistry(2), ({ byId }) => ({
    ...baseCurve,
    samples: [
      [0, 0, 0],
      [1, byId["parameter:a"].value, 0]
    ]
  }));
  const skipped = evaluateAlwaysRedrawFrame(
    plan,
    trackerRegistry(2),
    () => {
      throw new Error("unchanged dependencies should reuse the previous object");
    },
    frame
  );
  const changed = evaluateAlwaysRedrawFrame(plan, trackerRegistry(3), ({ byId }) => ({
    ...baseCurve,
    samples: [
      [0, 0, 0],
      [1, byId["parameter:a"].value, 0]
    ]
  }), skipped);

  assert.equal(frame.changed, true);
  assert.deepEqual(frame.object.samples.at(-1), [1, 2, 0]);
  assert.equal(skipped.changed, false);
  assert.deepEqual(skipped.object.samples.at(-1), [1, 2, 0]);
  assert.equal(changed.changed, true);
  assert.deepEqual(changed.object.samples.at(-1), [1, 3, 0]);
  assert.equal(summarizeAlwaysRedrawPlan(plan), "line:always->line[parameter:a]");
});

test("evaluates nonlinear scalar expressions for tracker-driven graph redraws", () => {
  const dependencyState = buildAlwaysRedrawDependencyState(trackerRegistry(3), ["parameter:a"]);
  const input = { dependencyState, t: 0.5 };

  assert.equal(
    Number(evaluateAlwaysRedrawScalarExpression({
      type: "sin",
      value: { type: "constant", value: Math.PI / 2 }
    }, input).toFixed(6)),
    1
  );
  assert.equal(
    Number(evaluateAlwaysRedrawScalarExpression({
      type: "log",
      value: { type: "max", terms: [{ type: "constant", value: 0.05 }, { type: "add", terms: [{ type: "t" }, { type: "constant", value: 3.25 }] }] }
    }, input).toFixed(6)),
    Number(Math.log(3.75).toFixed(6))
  );
  assert.equal(
    evaluateAlwaysRedrawScalarExpression({
      type: "max",
      terms: [
        { type: "constant", value: 0.25 },
        { type: "multiply", factors: [{ type: "tracker", trackerId: "parameter:a" }, { type: "constant", value: 1 / 6 }] }
      ]
    }, input),
    0.5
  );
});

test("summarizes Manim always/f_always/always_redraw authoring for browser QA", () => {
  const alwaysRedraw = [
    {
      dependencyTrackerIds: ["parameter:a", "parameter:missing"],
      factory: {
        colorRole: "function",
        conceptId: "linear-rule",
        sampleCount: 8,
        tRange: [0, 1] as [number, number],
        type: "parametricCurve" as const,
        x: { type: "t" as const },
        y: { scale: 1, trackerId: "parameter:a", type: "tracker" as const },
        z: { type: "constant" as const, value: 0 }
      },
      id: "line:always-redraw",
      objectId: "line"
    }
  ];
  const alwaysMethodUpdaters = [
    {
      id: "label:always-next-to",
      objectId: "label",
      operation: {
        buffExpression: { scale: 0.1, trackerId: "parameter:buff", type: "tracker" as const },
        direction: [0, 1, 0] as [number, number, number],
        targetObjectId: "line",
        type: "nextTo" as const
      }
    },
    {
      id: "label:always-align-to",
      objectId: "label",
      operation: {
        direction: [0, 1, 0] as [number, number, number],
        targetObjectId: "line",
        type: "alignTo" as const
      }
    },
    {
      id: "label:always-set-y",
      objectId: "label",
      operation: {
        coordinateExpression: { trackerId: "parameter:set-y", type: "tracker" as const },
        type: "setY" as const
      }
    }
  ];
  const catalog = buildAlwaysUpdaterAuthoringCatalog({
    alwaysMethodUpdaters,
    alwaysRedraw,
    trackers: {
      byId: {
        ...trackerRegistry(2).byId,
        "parameter:buff": buildValueTracker({
          id: "parameter:buff",
          label: "buff",
          max: 1,
          min: 0,
          role: "control",
          source: "parameter",
          value: 0.4
        }),
        "parameter:set-y": buildValueTracker({
          id: "parameter:set-y",
          label: "set y",
          max: 4,
          min: -4,
          role: "control",
          source: "parameter",
          value: 2
        })
      }
    }
  });

  assert.equal(catalog.version, "mais-manim-always-updater/v1");
  assert.equal(ALWAYS_UPDATER_AUTHORING_SOURCE_CONTRACT, expectedAlwaysUpdaterAuthoringSourceContract);
  assert.equal(catalog.sourceContract, expectedAlwaysUpdaterAuthoringSourceContract);
  assert.equal(catalog.totalUpdaterCount, 4);
  assert.equal(catalog.alwaysRedrawCount, 1);
  assert.equal(catalog.alwaysMethodCount, 3);
  assert.deepEqual(catalog.objectIds, ["label", "line"]);
  assert.deepEqual(catalog.updaterIds, ["label:always-align-to", "label:always-next-to", "label:always-set-y", "line:always-redraw"]);
  assert.deepEqual(catalog.dependencyTrackerIds, ["parameter:a", "parameter:buff", "parameter:missing", "parameter:set-y"]);
  assert.deepEqual(catalog.missingTrackerIds, ["parameter:missing"]);
  assert.equal(catalog.factoryCount, 1);
  assert.deepEqual(catalog.operationTypes, ["alignTo", "nextTo", "setY"]);
  assert.equal(
    catalog.summary,
    "alwaysUpdater:total=4:redraw=1:method=3:objects=label,line:trackers=parameter:a,parameter:buff,parameter:missing,parameter:set-y:missing=parameter:missing:factories=1:operations=alignTo,nextTo,setY"
  );
  assert.deepEqual(alwaysUpdaterAuthoringDataAttributes(catalog), {
    "data-viz-manim-always-updater-count": "4",
    "data-viz-manim-always-updater-always-method-count": "3",
    "data-viz-manim-always-updater-always-redraw-count": "1",
    "data-viz-manim-always-updater-dependency-tracker-count": "4",
    "data-viz-manim-always-updater-dependency-tracker-ids": "parameter:a,parameter:buff,parameter:missing,parameter:set-y",
    "data-viz-manim-always-updater-factory-count": "1",
    "data-viz-manim-always-updater-missing-tracker-count": "1",
    "data-viz-manim-always-updater-object-ids": "label,line",
    "data-viz-manim-always-updater-operation-types": "alignTo,nextTo,setY",
    "data-viz-manim-always-updater-source-contract": expectedAlwaysUpdaterAuthoringSourceContract,
    "data-viz-manim-always-updater-summary": catalog.summary,
    "data-viz-manim-always-updater-updater-ids": "label:always-align-to,label:always-next-to,label:always-set-y,line:always-redraw"
  });

  const serialized = serializeAlwaysUpdaterAuthoringCatalog(catalog);
  assert.doesNotMatch(serialized, /<\/script|undefined|NaN|Infinity/i);
  assert.deepEqual(JSON.parse(serialized), catalog);
});

test("extracts always-method moveTo pointExpression trackers for authoring QA", () => {
  const catalog = buildAlwaysUpdaterAuthoringCatalog({
    alwaysMethodUpdaters: [
      {
        id: "dot:always-move-to",
        objectId: "dot",
        operation: {
          pointExpression: {
            x: { trackerId: "parameter:x", type: "tracker" as const },
            y: { trackerId: "parameter:y", type: "tracker" as const },
            z: { type: "constant" as const, value: 0 }
          },
          type: "moveTo" as const
        }
      }
    ],
    trackers: {
      byId: {
        "parameter:x": buildValueTracker({
          id: "parameter:x",
          label: "x",
          max: 5,
          min: -5,
          role: "control",
          source: "parameter",
          value: 2
        }),
        "parameter:y": buildValueTracker({
          id: "parameter:y",
          label: "y",
          max: 5,
          min: -5,
          role: "control",
          source: "parameter",
          value: -3
        })
      }
    }
  });

  assert.equal(catalog.totalUpdaterCount, 1);
  assert.equal(catalog.alwaysMethodCount, 1);
  assert.deepEqual(catalog.dependencyTrackerIds, ["parameter:x", "parameter:y"]);
  assert.deepEqual(catalog.missingTrackerIds, []);
  assert.deepEqual(catalog.operationTypes, ["moveTo"]);
  assert.equal(
    catalog.summary,
    "alwaysUpdater:total=1:redraw=0:method=1:objects=dot:trackers=parameter:x,parameter:y:missing=none:factories=0:operations=moveTo"
  );
  assert.equal(
    alwaysUpdaterAuthoringDataAttributes(catalog)["data-viz-manim-always-updater-dependency-tracker-ids"],
    "parameter:x,parameter:y"
  );
});

test("extracts always-method scale factorExpression trackers for authoring QA", () => {
  const catalog = buildAlwaysUpdaterAuthoringCatalog({
    alwaysMethodUpdaters: [
      {
        id: "curve:always-scale",
        objectId: "curve",
        operation: {
          factorExpression: { trackerId: "parameter:scale", type: "tracker" as const },
          type: "scale" as const
        }
      }
    ],
    trackers: {
      byId: {
        "parameter:scale": buildValueTracker({
          id: "parameter:scale",
          label: "scale",
          max: 3,
          min: 0,
          role: "control",
          source: "parameter",
          value: 1.5
        })
      }
    }
  });

  assert.equal(catalog.totalUpdaterCount, 1);
  assert.equal(catalog.alwaysMethodCount, 1);
  assert.deepEqual(catalog.dependencyTrackerIds, ["parameter:scale"]);
  assert.deepEqual(catalog.missingTrackerIds, []);
  assert.deepEqual(catalog.operationTypes, ["scale"]);
  assert.equal(
    catalog.summary,
    "alwaysUpdater:total=1:redraw=0:method=1:objects=curve:trackers=parameter:scale:missing=none:factories=0:operations=scale"
  );
  assert.equal(
    alwaysUpdaterAuthoringDataAttributes(catalog)["data-viz-manim-always-updater-dependency-tracker-ids"],
    "parameter:scale"
  );
});

test("extracts always-method setOpacity opacityExpression trackers for authoring QA", () => {
  const catalog = buildAlwaysUpdaterAuthoringCatalog({
    alwaysMethodUpdaters: [
      {
        id: "curve:always-opacity",
        objectId: "curve",
        operation: {
          opacityExpression: { trackerId: "parameter:alpha", type: "tracker" as const },
          type: "setOpacity" as const
        }
      }
    ],
    trackers: {
      byId: {
        "parameter:alpha": buildValueTracker({
          id: "parameter:alpha",
          label: "alpha",
          max: 1,
          min: 0,
          role: "control",
          source: "parameter",
          value: 0.4
        })
      }
    }
  });

  assert.equal(catalog.totalUpdaterCount, 1);
  assert.equal(catalog.alwaysMethodCount, 1);
  assert.deepEqual(catalog.dependencyTrackerIds, ["parameter:alpha"]);
  assert.deepEqual(catalog.missingTrackerIds, []);
  assert.deepEqual(catalog.operationTypes, ["setOpacity"]);
  assert.equal(
    catalog.summary,
    "alwaysUpdater:total=1:redraw=0:method=1:objects=curve:trackers=parameter:alpha:missing=none:factories=0:operations=setOpacity"
  );
  assert.equal(
    alwaysUpdaterAuthoringDataAttributes(catalog)["data-viz-manim-always-updater-operation-types"],
    "setOpacity"
  );
});

test("extracts always-method VMobject style expression trackers for authoring QA", () => {
  const catalog = buildAlwaysUpdaterAuthoringCatalog({
    alwaysMethodUpdaters: [
      {
        id: "curve:always-stroke",
        objectId: "curve",
        operation: {
          strokeOpacityExpression: { trackerId: "parameter:stroke-alpha", type: "tracker" as const },
          strokeWidthExpression: { trackerId: "parameter:stroke-width", type: "tracker" as const },
          type: "setStroke" as const
        }
      },
      {
        id: "curve:always-fill",
        objectId: "curve",
        operation: {
          fillOpacityExpression: { trackerId: "parameter:fill-alpha", type: "tracker" as const },
          type: "setFill" as const
        }
      },
      {
        id: "curve:always-style",
        objectId: "curve",
        operation: {
          antiAliasWidthExpression: { trackerId: "parameter:aa", type: "tracker" as const },
          fillOpacityExpression: { trackerId: "parameter:style-fill", type: "tracker" as const },
          strokeWidthExpression: { trackerId: "parameter:style-width", type: "tracker" as const },
          type: "setStyle" as const
        }
      }
    ],
    trackers: {
      byId: {
        "parameter:aa": buildValueTracker({
          id: "parameter:aa",
          label: "aa",
          max: 4,
          min: 0,
          role: "control",
          source: "parameter",
          value: 2
        }),
        "parameter:fill-alpha": buildValueTracker({
          id: "parameter:fill-alpha",
          label: "fill",
          max: 1,
          min: 0,
          role: "control",
          source: "parameter",
          value: 0.5
        }),
        "parameter:stroke-alpha": buildValueTracker({
          id: "parameter:stroke-alpha",
          label: "stroke alpha",
          max: 1,
          min: 0,
          role: "control",
          source: "parameter",
          value: 0.7
        }),
        "parameter:stroke-width": buildValueTracker({
          id: "parameter:stroke-width",
          label: "stroke width",
          max: 12,
          min: 1,
          role: "control",
          source: "parameter",
          value: 9
        }),
        "parameter:style-fill": buildValueTracker({
          id: "parameter:style-fill",
          label: "style fill",
          max: 1,
          min: 0,
          role: "control",
          source: "parameter",
          value: 0.4
        }),
        "parameter:style-width": buildValueTracker({
          id: "parameter:style-width",
          label: "style width",
          max: 12,
          min: 1,
          role: "control",
          source: "parameter",
          value: 6
        })
      }
    }
  });

  assert.equal(catalog.totalUpdaterCount, 3);
  assert.equal(catalog.alwaysMethodCount, 3);
  assert.deepEqual(catalog.dependencyTrackerIds, [
    "parameter:aa",
    "parameter:fill-alpha",
    "parameter:stroke-alpha",
    "parameter:stroke-width",
    "parameter:style-fill",
    "parameter:style-width"
  ]);
  assert.deepEqual(catalog.operationTypes, ["setFill", "setStroke", "setStyle"]);
  assert.equal(
    catalog.summary,
    "alwaysUpdater:total=3:redraw=0:method=3:objects=curve:trackers=parameter:aa,parameter:fill-alpha,parameter:stroke-alpha,parameter:stroke-width,parameter:style-fill,parameter:style-width:missing=none:factories=0:operations=setFill,setStroke,setStyle"
  );
});

test("extracts always-method stretch factorExpression trackers for authoring QA", () => {
  const catalog = buildAlwaysUpdaterAuthoringCatalog({
    alwaysMethodUpdaters: [
      {
        id: "curve:always-stretch",
        objectId: "curve",
        operation: {
          dim: "x",
          factorExpression: { trackerId: "parameter:stretch", type: "tracker" as const },
          type: "stretch" as const
        }
      }
    ],
    trackers: {
      byId: {
        "parameter:stretch": buildValueTracker({
          id: "parameter:stretch",
          label: "stretch",
          max: 3,
          min: 0,
          role: "control",
          source: "parameter",
          value: 1.5
        })
      }
    }
  });

  assert.equal(catalog.totalUpdaterCount, 1);
  assert.equal(catalog.alwaysMethodCount, 1);
  assert.deepEqual(catalog.dependencyTrackerIds, ["parameter:stretch"]);
  assert.deepEqual(catalog.missingTrackerIds, []);
  assert.deepEqual(catalog.operationTypes, ["stretch"]);
  assert.equal(
    catalog.summary,
    "alwaysUpdater:total=1:redraw=0:method=1:objects=curve:trackers=parameter:stretch:missing=none:factories=0:operations=stretch"
  );
  assert.equal(
    alwaysUpdaterAuthoringDataAttributes(catalog)["data-viz-manim-always-updater-dependency-tracker-ids"],
    "parameter:stretch"
  );
});

test("extracts always-method dimension setter expression trackers for authoring QA", () => {
  const catalog = buildAlwaysUpdaterAuthoringCatalog({
    alwaysMethodUpdaters: [
      {
        id: "width-vector:always-set-width",
        objectId: "width-vector",
        operation: {
          type: "setWidth" as const,
          widthExpression: { trackerId: "parameter:width", type: "tracker" as const }
        }
      },
      {
        id: "height-vector:always-set-height",
        objectId: "height-vector",
        operation: {
          heightExpression: { trackerId: "parameter:height", type: "tracker" as const },
          type: "setHeight" as const
        }
      },
      {
        id: "depth-vector:always-set-depth",
        objectId: "depth-vector",
        operation: {
          depthExpression: { trackerId: "parameter:depth", type: "tracker" as const },
          type: "setDepth" as const
        }
      }
    ],
    trackers: {
      byId: {
        "parameter:depth": buildValueTracker({
          id: "parameter:depth",
          label: "depth",
          max: 6,
          min: 0,
          role: "control",
          source: "parameter",
          value: 5
        }),
        "parameter:height": buildValueTracker({
          id: "parameter:height",
          label: "height",
          max: 6,
          min: 0,
          role: "control",
          source: "parameter",
          value: 4
        }),
        "parameter:width": buildValueTracker({
          id: "parameter:width",
          label: "width",
          max: 6,
          min: 0,
          role: "control",
          source: "parameter",
          value: 3
        })
      }
    }
  });

  assert.equal(catalog.totalUpdaterCount, 3);
  assert.equal(catalog.alwaysMethodCount, 3);
  assert.deepEqual(catalog.dependencyTrackerIds, ["parameter:depth", "parameter:height", "parameter:width"]);
  assert.deepEqual(catalog.missingTrackerIds, []);
  assert.deepEqual(catalog.operationTypes, ["setDepth", "setHeight", "setWidth"]);
  assert.equal(
    catalog.summary,
    "alwaysUpdater:total=3:redraw=0:method=3:objects=depth-vector,height-vector,width-vector:" +
      "trackers=parameter:depth,parameter:height,parameter:width:missing=none:factories=0:operations=setDepth,setHeight,setWidth"
  );
  assert.equal(
    alwaysUpdaterAuthoringDataAttributes(catalog)["data-viz-manim-always-updater-dependency-tracker-ids"],
    "parameter:depth,parameter:height,parameter:width"
  );
});

test("extracts always-method rotate angleExpression trackers for authoring QA", () => {
  const catalog = buildAlwaysUpdaterAuthoringCatalog({
    alwaysMethodUpdaters: [
      {
        id: "curve:always-rotate",
        objectId: "curve",
        operation: {
          angleExpression: { trackerId: "parameter:theta", type: "tracker" as const },
          type: "rotate" as const
        }
      }
    ],
    trackers: {
      byId: {
        "parameter:theta": buildValueTracker({
          id: "parameter:theta",
          label: "theta",
          max: Math.PI,
          min: -Math.PI,
          role: "control",
          source: "parameter",
          value: Math.PI / 2
        })
      }
    }
  });

  assert.equal(catalog.totalUpdaterCount, 1);
  assert.equal(catalog.alwaysMethodCount, 1);
  assert.deepEqual(catalog.dependencyTrackerIds, ["parameter:theta"]);
  assert.deepEqual(catalog.missingTrackerIds, []);
  assert.deepEqual(catalog.operationTypes, ["rotate"]);
  assert.equal(
    catalog.summary,
    "alwaysUpdater:total=1:redraw=0:method=1:objects=curve:trackers=parameter:theta:missing=none:factories=0:operations=rotate"
  );
  assert.equal(
    alwaysUpdaterAuthoringDataAttributes(catalog)["data-viz-manim-always-updater-dependency-tracker-ids"],
    "parameter:theta"
  );
});

test("registers scene always-redraw specs as controlled updater entries", () => {
  const scene: MathSceneSpec = {
    alwaysRedraw: [
      {
        dependencyTrackerIds: ["parameter:a"],
        id: "line:always",
        objectId: "line"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 3], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [0, 1], y: [0, 1], z: [0, 1] },
      worldRange: { x: [0, 1], y: [0, 1], z: [0, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [baseCurve],
    parameters: [
      { conceptId: "linear-rule", id: "a", label: "a", max: 4, min: 0, role: "control", value: 2 }
    ],
    sceneId: "always-redraw-scene",
    timeline: []
  };

  const runtime = buildMathSceneRuntimeState(scene, 0);

  assert.ok(runtime.updaters.byObjectId.line.includes("always-redraw"));
  assert.ok(runtime.updaters.entries.some((entry) => entry.id === "line:always"));
});

test("applies serializable always-redraw factories before dependent object updaters", () => {
  const scene: MathSceneSpec = {
    alwaysRedraw: [
      {
        dependencyTrackerIds: ["timeline"],
        factory: {
          sampleCount: 3,
          tRange: [0, 1],
          type: "parametricCurve",
          x: { type: "t" },
          y: {
            factors: [{ type: "t" }, { trackerId: "timeline", type: "tracker" }],
            type: "multiply"
          },
          z: { type: "constant", value: 0 }
        },
        id: "line:always",
        objectId: "line"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 3], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [0, 1], y: [0, 3], z: [0, 1] },
      worldRange: { x: [0, 1], y: [0, 3], z: [0, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        ...baseCurve,
        samples: [
          [0, 0, 0],
          [0.5, 0, 0],
          [1, 0, 0]
        ]
      },
      {
        colorRole: "probe",
        conceptId: "live-probe",
        id: "probe",
        pathObjectId: "line",
        type: "movingPoint"
      }
    ],
    sceneId: "always-redraw-runtime-scene",
    timeline: [{ type: "wait", duration: 3 }]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 2));
  const line = updated.objectGraph.byId.line;
  const probe = updated.objectGraph.byId.probe;

  assert.equal(line.renderState.kind, "polyline");
  assert.equal(probe.renderState.kind, "point");
  if (line.renderState.kind !== "polyline" || probe.renderState.kind !== "point") {
    throw new Error("expected always-redrawn line and dependent probe render states");
  }

  assert.deepEqual(line.spec.type, "parametricCurve");
  assert.deepEqual(line.renderState.points, [
    [0, 0, 0],
    [0.5, 1, 0],
    [1, 2, 0]
  ]);
  assert.deepEqual(probe.renderState.position, [1, 2, 0]);
});

test("infers always-redraw factory tracker dependencies like Manim closure captures", () => {
  const scene: MathSceneSpec = {
    alwaysRedraw: [
      {
        dependencyTrackerIds: [],
        factory: {
          sampleCount: 3,
          tRange: [0, 1],
          type: "parametricCurve",
          x: { type: "t" },
          y: {
            factors: [{ type: "t" }, { trackerId: "phase-tracker", type: "tracker" }],
            type: "multiply"
          },
          z: { type: "constant", value: 0 }
        },
        id: "line:always",
        objectId: "line"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 3], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [0, 1], y: [0, 1], z: [0, 1] },
      worldRange: { x: [0, 1], y: [0, 1], z: [0, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        ...baseCurve,
        samples: [
          [0, 0, 0],
          [0.5, 0, 0],
          [1, 0, 0]
        ]
      }
    ],
    sceneId: "always-redraw-hidden-tracker-scene",
    timeline: [
      {
        duration: 2,
        easing: "linear",
        targetValue: 1,
        trackerId: "phase-tracker",
        type: "animateTracker"
      }
    ],
    valueTrackers: [
      {
        conceptId: "phase",
        id: "phase-tracker",
        label: "Phase",
        max: 1,
        min: 0,
        value: 0
      }
    ]
  };
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1));
  const line = updated.objectGraph.byId.line;

  assert.equal(line.renderState.kind, "polyline");
  if (line.renderState.kind !== "polyline") {
    throw new Error("expected always-redrawn line render state");
  }

  assert.deepEqual(line.renderState.points, [
    [0, 0, 0],
    [0.5, 0.25, 0],
    [1, 0.5, 0]
  ]);
});

test("MAIS Manim always-redraw source contract stays pure and registry-owned", () => {
  const alwaysSource = fs.readFileSync("components/visualizations/three/manim/mathAlwaysRedraw.ts", "utf8");
  const registrySource = fs.readFileSync("components/visualizations/three/manim/mathUpdaterRegistry.ts", "utf8");

  assert.match(alwaysSource, /buildAlwaysRedrawDependencyState/);
  assert.match(alwaysSource, /evaluateAlwaysRedrawFrame/);
  assert.match(alwaysSource, /serializeAlwaysUpdaterAuthoringCatalog/);
  assert.match(alwaysSource, /moveTo/);
  assert.match(alwaysSource, /scale/);
  assert.match(alwaysSource, /rotate/);
  assert.match(registrySource, /always-redraw/);
  assert.doesNotMatch(alwaysSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
