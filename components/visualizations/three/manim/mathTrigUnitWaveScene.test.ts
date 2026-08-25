import assert from "node:assert/strict";
import test from "node:test";
import { applyMathUpdaters } from "./mathUpdaterRegistry";
import { buildTrigUnitWaveMathSceneSpec } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState, type RuntimeMathObjectNode } from "./mathSceneRuntimeState";
import type { MathSceneSpec, Vec3 } from "./mathSceneTypes";

function trigScene(): MathSceneSpec {
  return buildTrigUnitWaveMathSceneSpec({
    accent: "#fb7185",
    state: {
      comparison: 4,
      depthValue: 1.8,
      familyId: "three-trig-unit-wave",
      mode: 0,
      primaryValue: 5,
      secondaryValue: 4,
      stateSummary: "family=three-trig-unit-wave;template=trig-unit-wave;value=5.000;comparison=4.000;depth=1.800",
      templateId: "trig-unit-wave",
      value: 5
    }
  });
}

function pointFor(node: RuntimeMathObjectNode): Vec3 {
  assert.equal(node.renderState.kind, "point", `${node.id} must render as a point`);
  if (node.renderState.kind !== "point") throw new Error(`${node.id} is not a point`);
  return node.renderState.position;
}

function pointsFor(node: RuntimeMathObjectNode): Vec3[] {
  assert.equal(node.renderState.kind, "polyline", `${node.id} must render as a polyline`);
  if (node.renderState.kind !== "polyline") throw new Error(`${node.id} is not a polyline`);
  return node.renderState.points;
}

function assertClose(actual: number, expected: number, message: string, epsilon = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${message}: expected ${expected}, received ${actual}`);
}

function assertPointClose(actual: Vec3, expected: Vec3, message: string, epsilon = 1e-6) {
  actual.forEach((value, index) => assertClose(value, expected[index], `${message}[${index}]`, epsilon));
}

function sweepWindow(scene: MathSceneSpec) {
  let elapsedBeforeSweep = 0;
  for (const step of scene.timeline) {
    if (step.type === "sweepParameter" && step.trackerId === "trig-angle") {
      return { duration: step.duration, elapsedBeforeSweep, step };
    }
    elapsedBeforeSweep += step.duration;
  }
  throw new Error("missing trig-angle sweep");
}

test("authors the sine explanation around one angle tracker and a front-on teaching camera", () => {
  const scene = trigScene();
  const objectIds = scene.objects.map((object) => object.id);
  const tracker = scene.valueTrackers?.find((candidate) => candidate.id === "trig-angle");
  const sweep = scene.timeline.find(
    (step) => step.type === "sweepParameter" && step.trackerId === "trig-angle"
  );

  assert.deepEqual(
    [
      "unit-circle",
      "circle-probe",
      "wave-probe",
      "projection-guide",
      "phase-radius",
      "angle-arc",
      "sine-trace"
    ].filter((id) => !objectIds.includes(id)),
    []
  );
  assert.equal(scene.objects.some((object) => object.type === "axis3d"), false);
  assert.equal(scene.suppressActiveProjectedLabels, true);
  assert.ok(scene.cameraShots.length >= 1);
  scene.cameraShots.forEach((shot) => {
    assertClose(shot.position[0], shot.target[0], `${shot.id} camera x must be front-on`);
    assertClose(shot.position[1], shot.target[1], `${shot.id} camera y must be front-on`);
    assert.ok(shot.position[2] > shot.target[2], `${shot.id} camera must look along the z axis`);
  });
  assert.deepEqual(tracker, {
    conceptId: "angle-parameter",
    id: "trig-angle",
    label: "Angle t",
    max: Math.PI * 2,
    min: 0,
    value: 0
  });
  assert.ok(sweep);
  assert.equal(sweep?.type, "sweepParameter");
  if (sweep?.type !== "sweepParameter") throw new Error("missing trig-angle sweep");
  assert.equal(sweep.fromValue, 0);
  assert.equal(sweep.targetValue, Math.PI * 2);
  assert.equal(sweep.easing, "linear");
  assert.match(scene.formulas[0]?.latex ?? "", /P\(t\).*Q\(t\).*\\sin t/);
  assert.doesNotMatch(scene.formulas[0]?.latex ?? "", /A\\sin|x\+\\theta|0\.44|180/);
});

test("keeps the unit-circle point, projection guide, sine trace, and graph point synchronized", () => {
  const scene = trigScene();
  const sweep = sweepWindow(scene);
  const waveXs: number[] = [];
  const radii: number[] = [];

  for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
    const elapsedSeconds = sweep.elapsedBeforeSweep + sweep.duration * fraction;
    const runtime = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, elapsedSeconds));
    const circlePoint = pointFor(runtime.objectGraph.byId["circle-probe"]);
    const wavePoint = pointFor(runtime.objectGraph.byId["wave-probe"]);
    const projectionGuide = pointsFor(runtime.objectGraph.byId["projection-guide"]);
    const phaseRadius = pointsFor(runtime.objectGraph.byId["phase-radius"]);
    const sineTrace = pointsFor(runtime.objectGraph.byId["sine-trace"]);

    assert.ok(projectionGuide.length >= 2);
    assert.ok(phaseRadius.length >= 2);
    assert.ok(sineTrace.length >= 2);
    assertClose(circlePoint[1], wavePoint[1], `shared sine height at ${fraction}`);
    projectionGuide.forEach((point) => {
      assertClose(point[1], circlePoint[1], `horizontal projection height at ${fraction}`);
    });
    assertPointClose(projectionGuide[0], circlePoint, `projection starts at circle point ${fraction}`);
    assertPointClose(projectionGuide.at(-1)!, wavePoint, `projection ends at wave point ${fraction}`);
    assertPointClose(phaseRadius.at(-1)!, circlePoint, `radius ends at circle point ${fraction}`);
    assertPointClose(sineTrace.at(-1)!, wavePoint, `trace ends at wave point ${fraction}`);

    const radiusStart = phaseRadius[0];
    radii.push(Math.hypot(circlePoint[0] - radiusStart[0], circlePoint[1] - radiusStart[1]));
    waveXs.push(wavePoint[0]);
  }

  radii.forEach((radius) => assertClose(radius, radii[0], "unit-circle radius remains invariant"));
  assert.ok(waveXs.every((value, index) => index === 0 || value > waveXs[index - 1]), "wave point x must increase with t");
});

test("declares bilingual teaching labels and canonical radian ticks with compact mobile text", () => {
  const scene = trigScene();
  const objectIds = new Set(scene.objects.map((object) => object.id));
  const projectedLabels = (scene as MathSceneSpec & {
    projectedLabels?: Array<{
      id: string;
      mobileText?: string;
      objectId: string;
      text: string;
    }>;
  }).projectedLabels ?? [];
  const labelsForObject = (objectId: string) => projectedLabels.filter((label) => label.objectId === objectId);
  const labelByObjectId = Object.fromEntries(projectedLabels.map((label) => [label.objectId, label]));

  [
    ["x-tick-0", "0"],
    ["x-tick-pi-over-2", "π/2"],
    ["x-tick-pi", "π"],
    ["x-tick-3pi-over-2", "3π/2"],
    ["x-tick-2pi", "2π"]
  ].forEach(([objectId, text]) => {
    assert.ok(objectIds.has(objectId), `${objectId} must be rendered`);
    assert.equal(labelByObjectId[objectId]?.text, text);
  });

  assert.ok(labelsForObject("unit-circle").some((label) => /单位圆.*Unit circle/.test(label.text)));
  assert.ok(labelsForObject("circle-probe").some((label) => /圆上点.*point/.test(label.text)));
  assert.ok(labelsForObject("wave-probe").some((label) => /波形点.*point/.test(label.text)));
  assert.ok(labelsForObject("projection-guide").some((label) => /同高.*same y/.test(label.text)));
  assert.ok(labelsForObject("sine-wave").some((label) => /正弦波.*sine wave/.test(label.text)));
  assert.match(labelByObjectId["graph-x-axis-title"]?.text ?? "", /弧度.*radians/);
  projectedLabels.forEach((label) => {
    assert.ok(label.mobileText, `${label.id} must define compact mobile text`);
    assert.ok((label.mobileText?.length ?? Infinity) <= 12, `${label.id} mobile text must stay compact`);
  });
});

test("balances the unit circle and one-period wave instead of shrinking the circle into an icon", () => {
  const scene = trigScene();
  const unitCircle = scene.objects.find((object) => object.id === "unit-circle");
  const sineWave = scene.objects.find((object) => object.id === "sine-wave");

  assert.equal(unitCircle?.type, "parametricCurve");
  assert.equal(sineWave?.type, "parametricCurve");
  if (unitCircle?.type !== "parametricCurve" || sineWave?.type !== "parametricCurve") {
    throw new Error("missing unit-circle or sine-wave curve");
  }

  const width = (points: Vec3[]) => {
    const xs = points.map((point) => point[0]);
    return Math.max(...xs) - Math.min(...xs);
  };
  const waveToCircleWidthRatio = width(sineWave.samples) / width(unitCircle.samples);

  assert.ok(waveToCircleWidthRatio >= 2, "one period must retain enough horizontal room to read");
  assert.ok(waveToCircleWidthRatio <= 2.7, "unit circle must remain a substantial part of the composition");
});

test("introduces every visible teaching object explicitly so the opening frame has no floating fragments", () => {
  const scene = trigScene();
  const introducedIds = new Set(scene.timeline.flatMap((step) =>
    step.type === "fadeInObject" || step.type === "growFromCenter" ? [step.objectId] : []
  ));
  const intentionallyInvisibleIds = new Set(["graph-x-axis-title"]);
  const visibleObjectIds = scene.objects
    .map((object) => object.id)
    .filter((objectId) => !intentionallyInvisibleIds.has(objectId));

  assert.deepEqual(visibleObjectIds.filter((objectId) => !introducedIds.has(objectId)), []);
});

test("provides a compact mobile formula that preserves the shared-sine invariant", () => {
  const scene = trigScene();
  const mobileLatex = (scene.formulas[0] as typeof scene.formulas[number] & { mobileLatex?: string }).mobileLatex;

  assert.match(mobileLatex ?? "", /P_y\(t\).*Q_y\(t\).*\\sin t/);
  assert.ok((mobileLatex?.length ?? Infinity) <= 40, "mobile formula must fit the compact canvas");
});
