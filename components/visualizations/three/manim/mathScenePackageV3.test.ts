import assert from "node:assert/strict";
import test from "node:test";
import { buildRuntimeRenderStateEvidence } from "./mathRuntimeRenderState";
import { stableSerializeMathSceneSpec } from "./mathSceneExport";
import {
  canonicalMathSceneBeatId,
  parseMathScenePackageV3Json,
  upgradeMathSceneSpecV1ToPackageV3,
  validateMathScenePackageV3,
  type MathScenePackageV3
} from "./mathScenePackageV3";
import { buildMathSceneSpecForThreeDFamily, maisManimFamilyIds } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";

function trigScene() {
  const scene = buildMathSceneSpecForThreeDFamily({
    accent: "#38bdf8",
    state: {
      comparison: 7,
      depthValue: 1.8,
      familyId: "three-trig-unit-wave",
      mode: 1,
      primaryValue: 6.8,
      secondaryValue: 7.25,
      stateSummary: "family=three-trig-unit-wave;template=trig-unit-wave;value=6.800;comparison=7.250;depth=1.800",
      templateId: "trig-unit-wave",
      value: 6
    }
  });

  assert.ok(scene);
  return scene;
}

function validPackage(): MathScenePackageV3 {
  return upgradeMathSceneSpecV1ToPackageV3(trigScene(), {
    brief: {
      ageBand: "secondary-14-16",
      courseGoal: "Connect unit-circle height to the sine graph.",
      evidenceLevel: "interactive-preview",
      invariants: ["The ordinate equals sin(theta).", "The projected point has the same height."],
      learnerAction: "Scrub theta and compare the linked points.",
      misconception: "The wave is a literal path travelled by the circle point.",
      singleLearningObjective: "Explain how circular height becomes y = sin(theta).",
      targetSurface: "teacher-authoring-and-learner-presentation"
    },
    localization: {
      defaultLocale: "en",
      labelStrategy: "locale-first-with-bilingual-fallback",
      labels: {
        "phase-angle": { en: "angle", zh: "角度", zhHans: "角度" },
        "sine-wave": { en: "sine wave", zh: "正弦波", zhHans: "正弦波" },
        "unit-circle": { en: "unit circle", zh: "單位圓", zhHans: "单位圆" }
      }
    },
    captions: [
      {
        beatId: canonicalMathSceneBeatId(0),
        beatIndex: 0,
        conceptId: "unit-circle",
        endSeconds: 1.7,
        startSeconds: 0,
        text: { en: "Build the unit circle.", zh: "建立單位圓。", zhHans: "建立单位圆。" }
      },
      {
        beatId: canonicalMathSceneBeatId(1),
        beatIndex: 1,
        conceptId: "sine-wave",
        endSeconds: 3.9,
        startSeconds: 1.8,
        text: { en: "Trace the matching height.", zh: "追蹤相同高度。", zhHans: "追踪相同高度。" }
      }
    ],
    audio: {
      contentHash: `sha256-${"a".repeat(64)}`,
      durationSeconds: 4,
      fileName: "unit-wave-narration.wav",
      mimeType: "audio/wav",
      source: "local-file"
    },
    exportProfiles: [
      {
        audioPolicy: "include-if-attached",
        background: "#07111f",
        captionPolicy: "both",
        format: "webm",
        fps: 30,
        height: 720,
        id: "webm-720p",
        mimeType: "video/webm;codecs=vp9",
        transparent: false,
        width: 1280
      },
      {
        audioPolicy: "include-if-attached",
        background: "#07111f",
        captionPolicy: "sidecar",
        format: "mp4",
        fps: 30,
        height: 720,
        id: "mp4-720p",
        mimeType: "video/mp4",
        transparent: false,
        width: 1280
      }
    ]
  });
}

function clonePackage() {
  return structuredClone(validPackage()) as MathScenePackageV3;
}

function errorCodes(value: unknown) {
  const result = validateMathScenePackageV3(value);
  assert.equal(result.ok, false);
  return result.ok ? [] : result.errors.map((error) => error.code);
}

test("wraps a v1 scene without mutation or runtime drift", () => {
  const original = trigScene();
  const originalJson = stableSerializeMathSceneSpec(original);
  const packageV3 = validPackage();

  assert.equal(packageV3.schemaVersion, "mais-manim-scene-package/v3");
  assert.notStrictEqual(packageV3.scene, original);
  assert.equal(stableSerializeMathSceneSpec(packageV3.scene), originalJson);
  assert.equal(stableSerializeMathSceneSpec(original), originalJson);

  const before = buildMathSceneRuntimeState(original, 3.2);
  const after = buildMathSceneRuntimeState(packageV3.scene, 3.2);
  assert.equal(after.sceneId, before.sceneId);
  assert.deepEqual(after.timeline, before.timeline);
  assert.deepEqual(
    buildRuntimeRenderStateEvidence(after.objectGraph),
    buildRuntimeRenderStateEvidence(before.objectGraph)
  );
});

test("validates every existing registry scene and its legal runtime-derived references", () => {
  for (const familyId of maisManimFamilyIds) {
    const scene = buildMathSceneSpecForThreeDFamily({
      accent: "#22d3ee",
      state: {
        comparison: 5,
        depthValue: 1.4,
        familyId,
        mode: 1,
        primaryValue: 6,
        secondaryValue: 5,
        stateSummary: `family=${familyId};template=function-graph;value=6.000;comparison=5.000;depth=1.400`,
        templateId: "function-graph",
        value: 6
      }
    });
    assert.ok(scene);
    const result = validateMathScenePackageV3(upgradeMathSceneSpecV1ToPackageV3(scene));
    assert.equal(result.ok, true, result.ok ? familyId : `${familyId}: ${JSON.stringify(result.errors)}`);
  }
});

test("accepts the bounded trig golden package and parses it as data", () => {
  const packageV3 = validPackage();
  const validated = validateMathScenePackageV3(packageV3);
  assert.ok(
    validated.ok || validated.errors.every((error) => error.message !== "Scene Package validation could not safely complete."),
    "a valid golden scene must not fall through the validator safety catch"
  );
  assert.equal(validated.ok, true, validated.ok ? "" : JSON.stringify(validated.errors));

  const parsed = parseMathScenePackageV3Json(JSON.stringify(packageV3));
  assert.equal(parsed.ok, true, parsed.ok ? "" : JSON.stringify(parsed.errors));
  assert.equal(parsed.ok && parsed.value.scene.familyId, "three-trig-unit-wave");
});

test("enforces the exact package version and root fields", () => {
  const wrongVersion = { ...validPackage(), schemaVersion: "mais-manim-scene-package/v2" };
  assert.ok(errorCodes(wrongVersion).includes("SCHEMA_VERSION_INVALID"));

  const unknownRoot = { ...validPackage(), execute: "export default () => fetch('https://evil.example')" };
  assert.ok(errorCodes(unknownRoot).includes("UNKNOWN_FIELD"));
});

test("uses UTF-8 bytes for the 1 MB import boundary and never throws", () => {
  const limit = 1_048_576;
  const exactOrUnder = JSON.stringify("文".repeat(Math.floor((limit - 2) / 3)));
  assert.ok(Buffer.byteLength(exactOrUnder, "utf8") <= limit);
  const underResult = parseMathScenePackageV3Json(exactOrUnder);
  assert.equal(underResult.ok, false);
  assert.ok(!underResult.ok && underResult.errors.every((error) => error.code !== "PACKAGE_TOO_LARGE"));

  const over = `${exactOrUnder.slice(0, -1)}文"`;
  assert.ok(Buffer.byteLength(over, "utf8") > limit);
  const overResult = parseMathScenePackageV3Json(over);
  assert.equal(overResult.ok, false);
  assert.ok(!overResult.ok && overResult.errors.some((error) => error.code === "PACKAGE_TOO_LARGE"));

  assert.doesNotThrow(() => parseMathScenePackageV3Json("{not-json"));
  const malformed = parseMathScenePackageV3Json("{not-json");
  assert.ok(!malformed.ok && malformed.errors[0]?.code === "INVALID_JSON");

  const oversizedObject = clonePackage();
  oversizedObject.brief.courseGoal = "文".repeat(400_000);
  assert.ok(Buffer.byteLength(JSON.stringify(oversizedObject), "utf8") > limit);
  assert.ok(errorCodes(oversizedObject).includes("PACKAGE_TOO_LARGE"));

  const cyclic = clonePackage() as unknown as Record<string, unknown>;
  cyclic.self = cyclic;
  assert.doesNotThrow(() => validateMathScenePackageV3(cyclic));
  assert.ok(errorCodes(cyclic).includes("INVALID_PACKAGE"));
});

test("rejects object, path, trace, binding and formula-token ownership errors", () => {
  const movingPoint = clonePackage();
  const point = movingPoint.scene.objects.find((object) => object.type === "movingPoint");
  assert.ok(point && point.type === "movingPoint");
  point.pathObjectId = "missing-path";
  assert.ok(errorCodes(movingPoint).includes("REFERENCE_NOT_FOUND"));

  const trace = clonePackage();
  const traceObject = trace.scene.objects.find((object) => object.type === "trace");
  assert.ok(traceObject && traceObject.type === "trace");
  traceObject.sourceObjectId = "missing-source";
  assert.ok(errorCodes(trace).includes("REFERENCE_NOT_FOUND"));

  const binding = clonePackage();
  binding.scene.bindings[0].objectId = "missing-object";
  assert.ok(errorCodes(binding).includes("REFERENCE_NOT_FOUND"));

  const tokenOwner = clonePackage();
  tokenOwner.scene.formulas.push({
    id: "other-formula",
    latex: "z=1",
    tokens: [{ conceptId: "other", id: "other-token", text: "z" }]
  });
  tokenOwner.scene.bindings[0].formulaId = "other-formula";
  assert.ok(errorCodes(tokenOwner).includes("TOKEN_FORMULA_MISMATCH"));

  const duplicate = clonePackage();
  duplicate.scene.objects[1].id = duplicate.scene.objects[0].id;
  assert.ok(errorCodes(duplicate).includes("DUPLICATE_ID"));

  const objectConceptMismatch = clonePackage();
  objectConceptMismatch.scene.bindings[0].conceptId = "sine-wave";
  assert.ok(errorCodes(objectConceptMismatch).includes("BINDING_CONCEPT_MISMATCH"));

  const tokenConceptMismatch = clonePackage();
  tokenConceptMismatch.scene.formulas[0].tokens[0].conceptId = "sine-wave";
  assert.ok(errorCodes(tokenConceptMismatch).includes("BINDING_CONCEPT_MISMATCH"));
});

test("rejects tracker, timeline, shot, composition and animation-plan reference errors", () => {
  const tracker = clonePackage();
  tracker.scene.timeline.splice(0, 0, {
    duration: 1,
    easing: "linear",
    targetValue: 2,
    trackerId: "missing-tracker",
    type: "animateTracker"
  });
  assert.ok(errorCodes(tracker).includes("REFERENCE_NOT_FOUND"));

  const shot = clonePackage();
  shot.scene.timeline[0] = { duration: 1, shotId: "missing-shot", type: "cameraTo" };
  assert.ok(errorCodes(shot).includes("REFERENCE_NOT_FOUND"));

  const composition = clonePackage();
  composition.scene.timeline[0] = { compositionId: "missing-composition", duration: 1, type: "animationComposition" };
  assert.ok(errorCodes(composition).includes("REFERENCE_NOT_FOUND"));

  const plan = clonePackage();
  plan.scene.animationPlans = [{
    duration: 1,
    id: "bad-plan",
    objectId: "missing-object",
    operations: [{ targetObjectId: "unit-circle", type: "matchX" }],
    targetObjectId: "sine-wave"
  }];
  assert.ok(errorCodes(plan).includes("REFERENCE_NOT_FOUND"));

  const operationShape = clonePackage() as unknown as { scene: Record<string, unknown> };
  operationShape.scene.animationPlans = [{
    duration: 1,
    id: "valid-plan",
    objectId: "unit-circle",
    operations: [{ targetObjectId: "sine-wave", type: "matchX", unexpected: "field" }],
    targetObjectId: "sine-wave"
  }];
  assert.ok(errorCodes(operationShape).includes("UNKNOWN_FIELD"));

  const operationRequired = clonePackage() as unknown as { scene: Record<string, unknown> };
  operationRequired.scene.animationPlans = [{
    duration: 1,
    id: "invalid-move-plan",
    objectId: "unit-circle",
    operations: [{ type: "moveTo" }],
    targetObjectId: "sine-wave"
  }];
  assert.ok(errorCodes(operationRequired).includes("INVALID_PACKAGE"));

  const operationRange = clonePackage() as unknown as { scene: Record<string, unknown> };
  operationRange.scene.animationPlans = [{
    duration: 1,
    id: "invalid-opacity-plan",
    objectId: "unit-circle",
    operations: [{ opacity: 2, type: "setOpacity" }],
    targetObjectId: "sine-wave"
  }];
  assert.ok(errorCodes(operationRange).includes("RANGE_INVALID"));

  const unknownDerivedTarget = clonePackage() as unknown as { scene: Record<string, unknown> };
  unknownDerivedTarget.scene.animationPlans = [{
    duration: 1,
    id: "unknown-derived-target",
    objectId: "unit-circle",
    operations: [{ type: "center" }],
    targetObjectId: "unit-circle:unknown-target"
  }];
  assert.ok(errorCodes(unknownDerivedTarget).includes("REFERENCE_NOT_FOUND"));

  const unknownParameterTracker = clonePackage();
  unknownParameterTracker.scene.timeline.splice(0, 0, {
    duration: 1,
    easing: "linear",
    targetValue: 2,
    trackerId: "parameter:missing",
    type: "animateTracker"
  });
  assert.ok(errorCodes(unknownParameterTracker).includes("REFERENCE_NOT_FOUND"));
});

test("validates all animation-operation variants and strict nested updater expressions", () => {
  const valid = clonePackage() as unknown as { scene: Record<string, unknown> };
  valid.scene.animationPlans = [{
    duration: 2,
    id: "all-operation-variants",
    objectId: "unit-circle",
    operations: [
      { direction: [1, 0, 0], targetObjectId: "sine-wave", type: "alignTo" },
      { type: "center" },
      { aboutPoint: [0, 0, 0], stretch: false, targetObjectId: "sine-wave", type: "matchDepth" },
      { targetObjectId: "sine-wave", type: "matchHeight" },
      { targetObjectId: "sine-wave", type: "matchWidth" },
      { targetObjectId: "sine-wave", type: "matchX" },
      { targetObjectId: "sine-wave", type: "matchY" },
      { targetObjectId: "sine-wave", type: "matchZ" },
      { point: [0, 1, 0], type: "moveTo" },
      { buff: 0.2, direction: [1, 0, 0], targetObjectId: "sine-wave", type: "nextTo" },
      { aboutPoint: [0, 0, 0], angleRadians: 1, axis: "z", type: "rotate" },
      { aboutPoint: [0, 0, 0], factor: 1.2, type: "scale" },
      { colorRole: "function", type: "setColorRole" },
      { aboutPoint: [0, 0, 0], depth: 1, stretch: false, type: "setDepth" },
      { fillOpacity: 0.5, fillRole: "surface", type: "setFill" },
      { height: 1, type: "setHeight" },
      { opacity: 0.5, type: "setOpacity" },
      { strokeOpacity: 0.7, strokeRole: "trace", strokeWidth: 2, type: "setStroke" },
      { fillOpacity: 0.2, strokeWidth: 2, type: "setStyle" },
      { width: 1, type: "setWidth" },
      { coordinate: 1, type: "setX" },
      { coordinate: 1, type: "setY" },
      { coordinate: 1, type: "setZ" },
      { type: "shift", vector: [1, 0, 0] },
      { buff: 0.1, direction: [1, 1, 0], frame: { max: [2, 2, 2], min: [-2, -2, -2] }, type: "toCorner" },
      { direction: [1, 0, 0], type: "toEdge" }
    ],
    targetObjectId: "sine-wave"
  }];
  assert.equal(validateMathScenePackageV3(valid).ok, true);

  const trackerScene = clonePackage() as unknown as { scene: Record<string, unknown> };
  trackerScene.scene.valueTrackers = [{ id: "theta-tracker", max: 10, min: -10, value: 0 }];
  trackerScene.scene.alwaysRedraw = [{
    dependencyTrackerIds: ["theta-tracker"],
    factory: {
      colorRole: "function",
      conceptId: "unit-circle",
      sampleCount: 32,
      tRange: [0, 1],
      type: "parametricCurve",
      x: { offset: 0, scale: 1, type: "t" },
      y: {
        type: "add",
        terms: [
          { type: "sin", value: { type: "tracker", trackerId: "theta-tracker" } },
          { type: "constant", value: 1 }
        ]
      },
      z: { type: "constant", value: 0 }
    },
    id: "redraw-unit-circle",
    objectId: "unit-circle"
  }];
  trackerScene.scene.alwaysMethodUpdaters = [{
    id: "move-probe",
    objectId: "wave-probe",
    operation: {
      pointExpression: {
        x: { type: "tracker", trackerId: "theta-tracker" },
        y: { type: "sin", value: { type: "tracker", trackerId: "theta-tracker" } }
      },
      type: "moveTo"
    }
  }];
  assert.equal(validateMathScenePackageV3(trackerScene).ok, true);

  const missingTracker = structuredClone(trackerScene) as unknown as { scene: Record<string, unknown> };
  const redraw = (missingTracker.scene.alwaysRedraw as Array<Record<string, unknown>>)[0];
  const factory = redraw.factory as Record<string, unknown>;
  factory.x = { type: "tracker", trackerId: "missing-tracker" };
  assert.ok(errorCodes(missingTracker).includes("REFERENCE_NOT_FOUND"));

  const badExpression = structuredClone(trackerScene) as unknown as { scene: Record<string, unknown> };
  const badFactory = ((badExpression.scene.alwaysRedraw as Array<Record<string, unknown>>)[0].factory as Record<string, unknown>);
  badFactory.x = { type: "constant", unexpected: 1, value: 0 };
  assert.ok(errorCodes(badExpression).includes("UNKNOWN_FIELD"));

  const badFactoryRange = structuredClone(trackerScene) as unknown as { scene: Record<string, unknown> };
  (((badFactoryRange.scene.alwaysRedraw as Array<Record<string, unknown>>)[0].factory as Record<string, unknown>)).sampleCount = 0;
  assert.ok(errorCodes(badFactoryRange).includes("NUMBER_INVALID"));

  const crossVariant = structuredClone(trackerScene) as unknown as { scene: Record<string, unknown> };
  ((crossVariant.scene.alwaysMethodUpdaters as Array<Record<string, unknown>>)[0].operation as Record<string, unknown>) = { factor: 2, type: "center" };
  assert.ok(errorCodes(crossVariant).includes("UNKNOWN_FIELD"));

  const missingCoordinate = structuredClone(trackerScene) as unknown as { scene: Record<string, unknown> };
  ((missingCoordinate.scene.alwaysMethodUpdaters as Array<Record<string, unknown>>)[0].operation as Record<string, unknown>) = { type: "setX" };
  assert.ok(errorCodes(missingCoordinate).includes("INVALID_PACKAGE"));
});

test("rejects invalid coordinate shapes, ragged surfaces, nonfinite values and dimensions", () => {
  const reversedRange = clonePackage();
  reversedRange.scene.coordinateSpace.mathRange.x = [2, -2];
  assert.ok(errorCodes(reversedRange).includes("RANGE_INVALID"));

  const raggedSurface = clonePackage();
  raggedSurface.scene.objects.push({
    colorRole: "surface",
    conceptId: "bad-surface",
    id: "bad-surface",
    samples: [[[0, 0, 0]], [[1, 1, 1], [2, 2, 2]]],
    type: "parametricSurface",
    uRange: [0, 1],
    vRange: [0, 1]
  });
  assert.ok(errorCodes(raggedSurface).includes("SURFACE_GRID_INVALID"));

  const nonfinite = clonePackage();
  nonfinite.scene.cameraShots[0].position[0] = Number.NaN;
  assert.ok(errorCodes(nonfinite).includes("NUMBER_INVALID"));

  const dimensions = clonePackage();
  dimensions.exportProfiles[0].width = 0;
  dimensions.exportProfiles[0].fps = 240;
  assert.ok(errorCodes(dimensions).includes("EXPORT_PROFILE_INVALID"));
});

test("rejects malformed, inverted, overlapping, out-of-beat and unknown caption cues", () => {
  const inverted = clonePackage();
  inverted.captions[0].startSeconds = 1.4;
  inverted.captions[0].endSeconds = 1.2;
  assert.ok(errorCodes(inverted).includes("CAPTION_TIME_INVALID"));

  const overlap = clonePackage();
  overlap.captions[1].startSeconds = 1.6;
  assert.ok(errorCodes(overlap).includes("CAPTION_OVERLAP"));

  const wrongBeat = clonePackage();
  wrongBeat.captions[0].beatId = "beat-99";
  assert.ok(errorCodes(wrongBeat).includes("CAPTION_BEAT_INVALID"));

  const unknownConcept = clonePackage();
  unknownConcept.captions[0].conceptId = "unknown-concept";
  assert.ok(errorCodes(unknownConcept).includes("REFERENCE_NOT_FOUND"));

  const outsideBeat = clonePackage();
  outsideBeat.captions[0].endSeconds = 2;
  assert.ok(errorCodes(outsideBeat).includes("CAPTION_TIME_INVALID"));
});

test("keeps audio local metadata-only and rejects path, URL, byte and executable-shaped input", () => {
  const badFileNames = ["../voice.wav", "/tmp/voice.wav", "folder/voice.wav", "https://evil.example/voice.wav"];
  for (const fileName of badFileNames) {
    const packageV3 = clonePackage();
    if (packageV3.audio.source === "none") assert.fail("expected local audio");
    packageV3.audio.fileName = fileName;
    assert.ok(errorCodes(packageV3).includes("AUDIO_METADATA_INVALID"), fileName);
  }

  for (const forbidden of [
    { bytes: [1, 2, 3] },
    { blobUrl: "blob:https://app.example/123" },
    { data: "data:audio/wav;base64,AAAA" },
    { module: "./voice.ts" },
    { transform: () => "run" }
  ]) {
    const packageV3 = clonePackage() as unknown as Record<string, unknown>;
    packageV3.audio = { ...(packageV3.audio as object), ...forbidden };
    const codes = errorCodes(packageV3);
    assert.ok(codes.includes("UNKNOWN_FIELD") || codes.includes("INVALID_PACKAGE"));
  }
});

test("accepts safe legacy sound-cue metadata but rejects executable, remote, path, byte, and invalid numeric forms", () => {
  const safe = clonePackage();
  safe.scene.soundCues = [{
    gain: 0.8,
    gainToBackground: -3,
    id: "cue-1",
    sceneTime: 0.25,
    soundFile: "unit-wave-chime.wav",
    timeOffset: 0
  }];
  assert.equal(validateMathScenePackageV3(safe).ok, true);

  for (const soundFile of ["../chime.wav", "/tmp/chime.wav", "folder/chime.wav", "https://evil.example/chime.wav", "blob:https://app.example/123", "data:audio/wav;base64,AAAA"]) {
    const packageV3 = clonePackage();
    packageV3.scene.soundCues = [{ id: "cue-1", sceneTime: 0, soundFile }];
    assert.ok(errorCodes(packageV3).includes("AUDIO_METADATA_INVALID"), soundFile);
  }

  const bytes = clonePackage() as unknown as { scene: Record<string, unknown> };
  bytes.scene.soundCues = [{ bytes: [1, 2, 3], id: "cue-1", sceneTime: 0, soundFile: "chime.wav" }];
  assert.ok(errorCodes(bytes).includes("UNKNOWN_FIELD"));

  const executable = clonePackage() as unknown as { scene: Record<string, unknown> };
  executable.scene.soundCues = [{ id: "cue-1", sceneTime: 0, soundFile: "chime.wav", transform: () => "run" }];
  assert.ok(errorCodes(executable).includes("INVALID_PACKAGE"));

  for (const cue of [
    { id: "cue-1", sceneTime: Number.NaN, soundFile: "chime.wav" },
    { gain: Number.POSITIVE_INFINITY, id: "cue-1", sceneTime: 0, soundFile: "chime.wav" },
    { id: "cue-1", sceneTime: 0, soundFile: "chime.wav", timeOffset: "now" }
  ]) {
    const packageV3 = clonePackage() as unknown as { scene: Record<string, unknown> };
    packageV3.scene.soundCues = [cue];
    assert.ok(errorCodes(packageV3).includes("NUMBER_INVALID"));
  }
});

test("rejects unknown fields and remote payloads inside optional MathSceneSpec structures", () => {
  const camera = clonePackage() as unknown as { scene: Record<string, unknown> };
  camera.scene.cameraUpdaters = [{
    degreesPerSecond: 10,
    id: "camera-orbit",
    type: "ambientRotation",
    unexpected: "not-in-MathSceneCameraUpdaterSpec"
  }];
  assert.ok(errorCodes(camera).includes("UNKNOWN_FIELD"));

  const updater = clonePackage() as unknown as { scene: Record<string, unknown> };
  updater.scene.vectorFieldUpdaters = [{
    id: "field-updater",
    objectId: "wave-probe",
    remote: "https://evil.example/module.js",
    system: { type: "constantVelocity", velocity: [1, 0, 0] },
    type: "moveAlongVectorField"
  }];
  const updaterCodes = errorCodes(updater);
  assert.ok(updaterCodes.includes("UNKNOWN_FIELD") || updaterCodes.includes("INVALID_PACKAGE"));
});

test("accepts SVG path data for formula morphs and rejects filesystem or URL-shaped path strings", () => {
  const safe = clonePackage();
  safe.scene.formulaSvgMorphs = [{
    formulaId: "trig-formula",
    id: "circle-to-wave",
    sourcePath: "M 0 0 L 10 0 L 10 10 Z",
    sourceTokenId: "circle-token",
    targetPath: "M 0 2 C 2 4 6 4 8 2 Z",
    targetTokenId: "wave-token"
  }];
  assert.equal(validateMathScenePackageV3(safe).ok, true);

  for (const sourcePath of ["../shape.svg", "/tmp/shape.svg", "https://evil.example/shape.svg", "M 0 0 /tmp/x", "L 0 0"]) {
    const packageV3 = structuredClone(safe);
    packageV3.scene.formulaSvgMorphs![0].sourcePath = sourcePath;
    assert.ok(errorCodes(packageV3).includes("INVALID_PACKAGE"), sourcePath);
  }

  const invalidId = structuredClone(safe);
  invalidId.scene.formulaSvgMorphs![0].id = "../bad-morph";
  assert.ok(errorCodes(invalidId).includes("INVALID_PACKAGE"));

  const duplicate = structuredClone(safe);
  duplicate.scene.formulaSvgMorphs!.push({ ...duplicate.scene.formulaSvgMorphs![0] });
  assert.ok(errorCodes(duplicate).includes("DUPLICATE_ID"));
});

test("rejects invalid gate keys, missing evidence shape, and export MIME-policy mismatches", () => {
  const badGate = clonePackage() as unknown as Record<string, unknown>;
  badGate.reviewLedger = { ...(badGate.reviewLedger as object), A09: { evidenceIds: [], status: "pending" } };
  assert.ok(errorCodes(badGate).includes("GATE_LEDGER_INVALID"));

  const passedWithoutEvidence = clonePackage();
  passedWithoutEvidence.reviewLedger.A06 = { evidenceIds: [], status: "passed" };
  assert.ok(errorCodes(passedWithoutEvidence).includes("GATE_LEDGER_INVALID"));

  const mime = clonePackage();
  mime.exportProfiles[0].mimeType = "video/mp4";
  assert.ok(errorCodes(mime).includes("EXPORT_PROFILE_INVALID"));

  const transparency = clonePackage();
  transparency.exportProfiles[1].transparent = true;
  assert.ok(errorCodes(transparency).includes("EXPORT_PROFILE_INVALID"));
});

test("allows ordinary mathematical prose and LaTeX without treating them as executable code", () => {
  const packageV3 = clonePackage();
  packageV3.brief.courseGoal = "Data: compare the function f(x) to its graph and explain y = sin(theta).";
  packageV3.scene.formulas[0].latex = String.raw`$y=A\sin(x+\theta);\quad \theta\in[0,2\pi]$`;
  const result = validateMathScenePackageV3(packageV3);
  assert.equal(result.ok, true, result.ok ? "" : JSON.stringify(result.errors));
});

test("rejects filesystem and module paths in prose fields without rejecting mathematical slash notation", () => {
  for (const courseGoal of [
    "Read ../secret.json before class.",
    "Load ./module.ts for the animation.",
    "Open /tmp/scene.json.",
    String.raw`Open C:\temp\scene.json.`,
    String.raw`Open \\server\share\scene.json.`
  ]) {
    const packageV3 = clonePackage();
    packageV3.brief.courseGoal = courseGoal;
    assert.ok(errorCodes(packageV3).includes("INVALID_PACKAGE"), courseGoal);
  }

  const labelPath = clonePackage();
  labelPath.localization.labels["unit-circle"].en = "../labels.json";
  assert.ok(errorCodes(labelPath).includes("INVALID_PACKAGE"));

  const captionPath = clonePackage();
  captionPath.captions[0].text.zhHans = "./caption-module.ts";
  assert.ok(errorCodes(captionPath).includes("INVALID_PACKAGE"));

  const math = clonePackage();
  math.brief.courseGoal = "Compare x/y, 1/2, and f(x); then explain y = sin(theta).";
  assert.equal(validateMathScenePackageV3(math).ok, true);
});

test("allows a concept id named data while still requiring localization label concept references", () => {
  const packageV3 = clonePackage();
  const axes = packageV3.scene.objects.find((object) => object.type === "axis3d");
  assert.ok(axes && axes.type === "axis3d");
  axes.conceptId = "data";
  packageV3.localization.labels.data = { en: "data", zh: "數據", zhHans: "数据" };
  assert.equal(validateMathScenePackageV3(packageV3).ok, true);

  const unknown = clonePackage();
  unknown.localization.labels["unknown-concept"] = { en: "unknown", zh: "未知", zhHans: "未知" };
  assert.ok(errorCodes(unknown).includes("REFERENCE_NOT_FOUND"));
});

test("mirrors runtime tracker namespaces without accepting raw parameter or unknown progress ids", () => {
  const packageV3 = clonePackage() as unknown as { captions: unknown[]; scene: Record<string, unknown> };
  packageV3.captions = [];
  packageV3.scene.parameters = [
    ...((packageV3.scene.parameters as unknown[]) ?? []),
    { id: "collision", label: "Collision parameter", role: "control", value: 0 }
  ];
  packageV3.scene.valueTrackers = [{ id: "local-tracker", value: 0 }];
  packageV3.scene.alwaysRedraw = [{
    dependencyTrackerIds: [
      "timeline",
      "timeline:progress",
      "parameter:collision",
      "local-tracker",
      "unit-circle:progress",
      "sine-wave:progress",
      "wave-probe:progress"
    ],
    factory: {
      colorRole: "function",
      conceptId: "unit-circle",
      sampleCount: 8,
      tRange: [0, 1],
      type: "parametricCurve",
      x: { type: "tracker", trackerId: "timeline:progress" },
      y: { type: "tracker", trackerId: "unit-circle:progress" }
    },
    id: "runtime-tracker-redraw",
    objectId: "unit-circle"
  }];
  (packageV3.scene.timeline as unknown[]).splice(0, 0, {
    duration: 0.25,
    easing: "linear",
    targetValue: 0.5,
    trackerId: "sine-wave:progress",
    type: "animateTracker"
  });
  assert.equal(validateMathScenePackageV3(packageV3).ok, true);

  const rawParameter = structuredClone(packageV3) as unknown as { scene: Record<string, unknown> };
  (rawParameter.scene.timeline as Array<Record<string, unknown>>)[0].trackerId = "collision";
  assert.ok(errorCodes(rawParameter).includes("REFERENCE_NOT_FOUND"));

  const unknownProgress = structuredClone(packageV3) as unknown as { scene: Record<string, unknown> };
  const redraw = (unknownProgress.scene.alwaysRedraw as Array<Record<string, unknown>>)[0];
  redraw.dependencyTrackerIds = ["phase-radius:progress"];
  assert.ok(errorCodes(unknownProgress).includes("REFERENCE_NOT_FOUND"));

  const missingProgress = structuredClone(packageV3) as unknown as { scene: Record<string, unknown> };
  (missingProgress.scene.timeline as Array<Record<string, unknown>>)[0].trackerId = "missing:progress";
  assert.ok(errorCodes(missingProgress).includes("REFERENCE_NOT_FOUND"));
});

test("accepts only in-range stream-line and vector-field runtime object ids", () => {
  const packageV3 = clonePackage() as unknown as { scene: Record<string, unknown> };
  packageV3.scene.streamLines = [{
    conceptId: "unit-circle",
    dt: 0.05,
    id: "flow",
    stepCount: 20,
    system: { type: "constantVelocity", velocity: [1, 0, 0] },
    xRange: [-1, 1],
    xSteps: 2,
    yRange: [-1, 1],
    ySteps: 2
  }];
  packageV3.scene.vectorFields = [{
    conceptId: "unit-circle",
    id: "field",
    system: { type: "constantVelocity", velocity: [1, 0, 0] },
    xRange: [-1, 1],
    xSteps: 2,
    yRange: [-1, 1],
    ySteps: 3
  }];
  packageV3.scene.renderGroups = {
    fixedInFrameObjectIds: ["flow:line-3"],
    foregroundObjectIds: ["field:sample-5:arrow"]
  };
  assert.equal(validateMathScenePackageV3(packageV3).ok, true);

  const outOfRangeLine = structuredClone(packageV3) as unknown as { scene: Record<string, unknown> };
  (outOfRangeLine.scene.renderGroups as { fixedInFrameObjectIds: string[] }).fixedInFrameObjectIds[0] = "flow:line-4";
  assert.ok(errorCodes(outOfRangeLine).includes("REFERENCE_NOT_FOUND"));

  const outOfRangeArrow = structuredClone(packageV3) as unknown as { scene: Record<string, unknown> };
  (outOfRangeArrow.scene.renderGroups as { foregroundObjectIds: string[] }).foregroundObjectIds[0] = "field:sample-6:arrow";
  assert.ok(errorCodes(outOfRangeArrow).includes("REFERENCE_NOT_FOUND"));

  const unknownBase = structuredClone(packageV3) as unknown as { scene: Record<string, unknown> };
  (unknownBase.scene.renderGroups as { fixedInFrameObjectIds: string[] }).fixedInFrameObjectIds[0] = "missing:line-0";
  assert.ok(errorCodes(unknownBase).includes("REFERENCE_NOT_FOUND"));
});

test("requires a canonical Three.js family id", () => {
  const packageV3 = clonePackage() as unknown as { scene: Record<string, unknown> };
  packageV3.scene.familyId = "three-not-a-canonical-family";
  assert.ok(errorCodes(packageV3).includes("INVALID_PACKAGE"));
});

test("validates exact required fields and value contracts for every timeline variant", () => {
  const packageV3 = clonePackage() as unknown as { captions: unknown[]; scene: Record<string, unknown> };
  packageV3.captions = [];
  packageV3.scene.animationPlans = [{
    duration: 1,
    id: "timeline-plan",
    objectId: "unit-circle",
    operations: [{ type: "center" }],
    targetObjectId: "sine-wave"
  }];
  packageV3.scene.animationCompositions = [{
    animationPlanIds: ["timeline-plan"],
    id: "timeline-composition",
    type: "animationGroup"
  }];
  packageV3.scene.timeline = [
    { compositionId: "timeline-composition", duration: 1, type: "animationComposition" },
    { duration: 1, easing: "linear", targetValue: 1, trackerId: "parameter:value", type: "animateTracker" },
    {
      conceptId: "unit-circle",
      duration: 1,
      easing: "smooth",
      formulaTokenIds: ["circle-token"],
      fromValue: 0,
      targetValue: 1,
      trackerId: "parameter:value",
      type: "sweepParameter"
    },
    { duration: 1, easing: "linear", objectId: "unit-circle", type: "revealCurve" },
    { duration: 1, easing: "smooth", objectId: "unit-circle", type: "revealSurface" },
    { duration: 1, easing: "linear", objectId: "unit-circle", type: "fadeInObject" },
    { duration: 1, easing: "smooth", objectId: "unit-circle", type: "fadeOutObject" },
    { duration: 1, easing: "linear", objectId: "unit-circle", type: "growFromCenter" },
    { duration: 1, objectId: "wave-probe", pathObjectId: "sine-wave", type: "moveAlongPath" },
    {
      duration: 1,
      lagRatio: 0.25,
      objectId: "unit-circle",
      path: { type: "straight" },
      targetObjectId: "sine-wave",
      type: "transformObject"
    },
    { conceptId: "unit-circle", duration: 1, type: "highlight" },
    { duration: 1, shotId: "unit-circle-link", type: "cameraTo" },
    {
      duration: 1,
      holdOnWait: true,
      ignorePresenterMode: false,
      maxTime: 2,
      note: "Pause for x/y and 1/2 reasoning.",
      presenterMode: true,
      presenterReleaseAfterFrames: 2,
      stopConditionId: "teacher-ready",
      stopConditionSatisfiedAt: 0.5,
      type: "wait"
    }
  ];
  assert.equal(validateMathScenePackageV3(packageV3).ok, true);

  const requiredByType: Record<string, string[]> = {
    animationComposition: ["compositionId"],
    animateTracker: ["trackerId", "targetValue", "easing"],
    cameraTo: ["shotId"],
    fadeInObject: ["objectId", "easing"],
    fadeOutObject: ["objectId", "easing"],
    growFromCenter: ["objectId", "easing"],
    highlight: ["conceptId"],
    moveAlongPath: ["objectId", "pathObjectId"],
    revealCurve: ["objectId", "easing"],
    revealSurface: ["objectId", "easing"],
    sweepParameter: ["trackerId", "targetValue", "easing"],
    transformObject: ["objectId", "targetObjectId"],
    wait: ["duration"]
  };
  for (const [stepIndex, step] of (packageV3.scene.timeline as Array<Record<string, unknown>>).entries()) {
    for (const required of requiredByType[String(step.type)]) {
      const missing = structuredClone(packageV3) as unknown as { scene: Record<string, unknown> };
      delete (missing.scene.timeline as Array<Record<string, unknown>>)[stepIndex][required];
      assert.ok(errorCodes(missing).includes("INVALID_PACKAGE"), `${String(step.type)}.${required}`);
    }
  }

  const invalidWaitFields: Array<[string, unknown]> = [
    ["holdOnWait", "yes"],
    ["ignorePresenterMode", 1],
    ["maxTime", -0.1],
    ["note", 7],
    ["presenterMode", "true"],
    ["presenterReleaseAfterFrames", -1],
    ["presenterReleaseAfterFrames", 1.5],
    ["stopConditionId", "/tmp/evil.ts"],
    ["stopConditionSatisfiedAt", -0.1]
  ];
  for (const [key, value] of invalidWaitFields) {
    const invalid = structuredClone(packageV3) as unknown as { scene: Record<string, unknown> };
    (invalid.scene.timeline as Array<Record<string, unknown>>).at(-1)![key] = value;
    assert.equal(validateMathScenePackageV3(invalid).ok, false, `wait.${key}`);
  }
});

test("rejects path-shaped strings in every local free-text field while preserving math text", () => {
  const probes: Array<(packageV3: ReturnType<typeof clonePackage>) => void> = [
    (packageV3) => { packageV3.scene.formulas[0].latex = "/tmp/evil.ts"; },
    (packageV3) => { packageV3.scene.formulas[0].tokens[0].text = "../evil.ts"; },
    (packageV3) => { packageV3.scene.parameters![0].label = "./evil.ts"; },
    (packageV3) => { packageV3.scene.valueTrackers = [{ id: "local", label: "/tmp/evil.ts", value: 0 }]; },
    (packageV3) => {
      const wait = packageV3.scene.timeline.at(-1);
      if (wait?.type === "wait") wait.note = "/tmp/evil.ts";
    },
    (packageV3) => { if (packageV3.scene.randomSeed) packageV3.scene.randomSeed.signature = "../evil.ts"; },
    (packageV3) => {
      const curve = packageV3.scene.objects.find((object) => object.type === "parametricCurve");
      if (curve?.type === "parametricCurve") curve.colorRole = "/tmp/evil.ts";
    },
    (packageV3) => {
      const curve = packageV3.scene.objects.find((object) => object.type === "parametricCurve");
      if (curve?.type === "parametricCurve") curve.style = { fillRole: "../evil.ts" };
    }
  ];
  for (const [index, applyProbe] of probes.entries()) {
    const packageV3 = clonePackage();
    applyProbe(packageV3);
    assert.ok(errorCodes(packageV3).includes("INVALID_PACKAGE"), `free-text probe ${index}`);
  }

  const math = clonePackage();
  math.scene.formulas[0].latex = String.raw`\frac{y}{x} + 1/2`;
  math.scene.formulas[0].tokens[0].text = "x/y";
  math.scene.parameters![0].label = "Compare f(x) and 1/2";
  math.scene.valueTrackers = [{ id: "local", label: "ratio x/y", value: 0 }];
  const wait = math.scene.timeline.at(-1);
  if (wait?.type === "wait") wait.note = "Explain x/y and 1/2.";
  if (math.scene.randomSeed) math.scene.randomSeed.signature = "deterministic math seed";
  const curve = math.scene.objects.find((object) => object.type === "parametricCurve");
  if (curve?.type === "parametricCurve") curve.colorRole = "function-primary";
  assert.equal(validateMathScenePackageV3(math).ok, true);
});

test("materializes descriptor-safe JSON without executing array hooks, accessors, or proxies", () => {
  const valid = validPackage();
  const validResult = validateMathScenePackageV3(valid);
  assert.equal(validResult.ok, true);
  assert.ok(validResult.ok && validResult.value !== valid, "validated output must be a detached JSON snapshot");

  let toJsonCalls = 0;
  const withToJson = clonePackage() as unknown as { captions: unknown[] };
  Object.defineProperty(withToJson.captions, "toJSON", {
    configurable: true,
    value: () => {
      toJsonCalls += 1;
      return [];
    }
  });
  assert.equal(validateMathScenePackageV3(withToJson).ok, false);
  assert.equal(toJsonCalls, 0, "validation must not invoke an array toJSON hook");

  let accessorCalls = 0;
  const withAccessor = clonePackage() as unknown as { captions: unknown[] };
  const firstCue = withAccessor.captions[0];
  Object.defineProperty(withAccessor.captions, "0", {
    configurable: true,
    enumerable: true,
    get: () => {
      accessorCalls += 1;
      return firstCue;
    }
  });
  assert.equal(validateMathScenePackageV3(withAccessor).ok, false);
  assert.equal(accessorCalls, 0, "validation must inspect descriptors rather than invoke array accessors");

  const withSymbol = clonePackage() as unknown as { captions: unknown[] };
  Object.defineProperty(withSymbol.captions, Symbol("hidden"), { value: "payload" });
  assert.equal(validateMathScenePackageV3(withSymbol).ok, false);

  const withExtra = clonePackage() as unknown as { captions: unknown[] };
  Object.defineProperty(withExtra.captions, "extra", { enumerable: true, value: "payload" });
  assert.equal(validateMathScenePackageV3(withExtra).ok, false);

  const withHole = clonePackage() as unknown as { captions: unknown[] };
  withHole.captions = new Array(1);
  assert.equal(validateMathScenePackageV3(withHole).ok, false);

  let proxyGetCalls = 0;
  const proxied = new Proxy(clonePackage(), {
    get(target, property, receiver) {
      proxyGetCalls += 1;
      return Reflect.get(target, property, receiver);
    }
  });
  assert.equal(validateMathScenePackageV3(proxied).ok, false, "Proxy input must fail closed");
  assert.equal(proxyGetCalls, 0, "validation must not execute Proxy get behavior");
});

test("rejects every collision in the unified runtime tracker namespace", () => {
  const collisionCases: Array<(packageV3: ReturnType<typeof clonePackage>) => void> = [
    (packageV3) => { packageV3.scene.valueTrackers = [{ id: "timeline", value: 0 }]; },
    (packageV3) => { packageV3.scene.valueTrackers = [{ id: "timeline:progress", value: 0 }]; },
    (packageV3) => { packageV3.scene.valueTrackers = [{ id: "parameter:value", value: 0 }]; },
    (packageV3) => { packageV3.scene.valueTrackers = [{ id: "unit-circle:progress", value: 0 }]; }
  ];
  for (const [index, applyCollision] of collisionCases.entries()) {
    const packageV3 = clonePackage();
    applyCollision(packageV3);
    assert.ok(errorCodes(packageV3).includes("DUPLICATE_ID"), `tracker collision ${index}`);
  }
});

test("rejects authored object ids that collide with every runtime-derived object namespace", () => {
  const addAxis = (packageV3: ReturnType<typeof clonePackage>, id: string) => {
    packageV3.scene.objects.push({
      id,
      range: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
      type: "axis3d"
    });
    packageV3.scene.diagnostics.expectedObjectCount += 1;
  };

  const attention = clonePackage();
  addAxis(attention, "unit-circle:attention-target");
  attention.scene.animationPlans = [{
    duration: 1,
    id: "attention-plan",
    objectId: "unit-circle",
    operations: [{ type: "center" }],
    targetObjectId: "unit-circle:attention-target"
  }];
  assert.ok(errorCodes(attention).includes("DUPLICATE_ID"));

  const ode = clonePackage();
  addAxis(ode, "orbit:current-state");
  ode.scene.odeTrajectories = [{
    conceptId: "unit-circle",
    id: "orbit",
    start: [0, 0, 0],
    stepCount: 2,
    system: { type: "constantVelocity", velocity: [1, 0, 0] },
    tRange: [0, 1]
  }];
  assert.ok(errorCodes(ode).includes("DUPLICATE_ID"));

  const stream = clonePackage();
  addAxis(stream, "flow:line-0");
  stream.scene.streamLines = [{
    conceptId: "unit-circle",
    dt: 0.1,
    id: "flow",
    stepCount: 2,
    system: { type: "constantVelocity", velocity: [1, 0, 0] },
    xRange: [-1, 1],
    xSteps: 1,
    yRange: [-1, 1],
    ySteps: 1
  }];
  assert.ok(errorCodes(stream).includes("DUPLICATE_ID"));

  const field = clonePackage();
  addAxis(field, "field:sample-0:arrow");
  field.scene.vectorFields = [{
    conceptId: "unit-circle",
    id: "field",
    system: { type: "constantVelocity", velocity: [1, 0, 0] },
    xRange: [-1, 1],
    xSteps: 1,
    yRange: [-1, 1],
    ySteps: 1
  }];
  assert.ok(errorCodes(field).includes("DUPLICATE_ID"));
});

test("bounds export timeline and caption milliseconds before serialization", () => {
  const oversizedStep = clonePackage();
  oversizedStep.captions = [];
  oversizedStep.scene.timeline[0].duration = 86_401;
  assert.ok(errorCodes(oversizedStep).includes("RANGE_INVALID"));

  const oversizedTotal = clonePackage();
  oversizedTotal.captions = [];
  oversizedTotal.scene.timeline = [
    { duration: 50_000, type: "wait" },
    { duration: 50_000, type: "wait" }
  ];
  assert.ok(errorCodes(oversizedTotal).includes("RANGE_INVALID"));

  const unsafeCue = clonePackage();
  unsafeCue.captions[0].startSeconds = Number.MAX_SAFE_INTEGER / 1_000;
  unsafeCue.captions[0].endSeconds = unsafeCue.captions[0].startSeconds + 1;
  assert.ok(errorCodes(unsafeCue).includes("CAPTION_TIME_INVALID"));
});

test("rejects every URL-like scheme and protocol-relative host while preserving math colons", () => {
  for (const text of [
    "ftp://evil.example/scene.json",
    "ssh://evil.example/module",
    "custom+scene://evil.example/payload",
    "https:evil.example/payload",
    "ftp:payload",
    "ws:evil.example/socket",
    "custom+scene:payload",
    "//evil.example/scene.json",
    "mailto:attacker@evil.example"
  ]) {
    const packageV3 = clonePackage();
    packageV3.brief.courseGoal = text;
    assert.ok(errorCodes(packageV3).includes("INVALID_PACKAGE"), text);
  }

  const math = clonePackage();
  math.brief.courseGoal = "Ratio: compare x/y; function: f(x); proportion: 1/2; f: x → y; time 12:30.";
  math.scene.formulas[0].latex = String.raw`\Pi:\vec n\cdot\vec r=0;\quad L:\vec r=\vec a+t\vec d`;
  assert.equal(validateMathScenePackageV3(math).ok, true);
});

test("bounds aggregate vector-field objects and stream-line generated samples", () => {
  const vectorFields = clonePackage() as unknown as { scene: Record<string, unknown> };
  vectorFields.scene.vectorFields = Array.from({ length: 3 }, (_, index) => ({
    conceptId: "unit-circle",
    id: `aggregate-field-${index}`,
    system: { type: "constantVelocity", velocity: [1, 0, 0] },
    xRange: [-1, 1],
    xSteps: 64,
    yRange: [-1, 1],
    ySteps: 64
  }));
  assert.ok(errorCodes(vectorFields).includes("RANGE_INVALID"));

  const streamLines = clonePackage() as unknown as { scene: Record<string, unknown> };
  streamLines.scene.streamLines = Array.from({ length: 2 }, (_, index) => ({
    conceptId: "unit-circle",
    dt: 0.01,
    id: `aggregate-stream-${index}`,
    stepCount: 511,
    system: { type: "constantVelocity", velocity: [1, 0, 0] },
    xRange: [-1, 1],
    xSteps: 16,
    yRange: [-1, 1],
    ySteps: 16
  }));
  assert.ok(errorCodes(streamLines).includes("RANGE_INVALID"));

  const bounded = clonePackage() as unknown as { scene: Record<string, unknown> };
  bounded.scene.streamLines = [
    (streamLines.scene.streamLines as Array<Record<string, unknown>>)[0]
  ];
  assert.equal(validateMathScenePackageV3(bounded).ok, true);
});

test("bounds and escapes unknown-field diagnostics deterministically", () => {
  const packageV3 = clonePackage() as unknown as Record<string, unknown>;
  const hostileKey = `bad\nkey\r\u2028\u2029${"x".repeat(2_000)}`;
  packageV3[hostileKey] = true;
  const first = validateMathScenePackageV3(packageV3);
  const second = validateMathScenePackageV3(packageV3);
  assert.equal(first.ok, false);
  assert.deepEqual(first, second);
  if (first.ok) assert.fail("expected bounded diagnostic");
  const unknown = first.errors.find((error) => error.code === "UNKNOWN_FIELD");
  assert.ok(unknown);
  assert.ok(unknown.path.length <= 512 && unknown.message.length <= 512);
  assert.doesNotMatch(unknown.path, /[\r\n\u2028\u2029]/);
  assert.doesNotMatch(unknown.message, /[\r\n\u2028\u2029]/);
});

test("rejects collection width and node budgets before expanding traversal work", () => {
  const tooWide = clonePackage() as unknown as { captions: unknown[] };
  tooWide.captions = new Array(10_001);
  const widthResult = validateMathScenePackageV3(tooWide);
  assert.equal(widthResult.ok, false);
  assert.ok(!widthResult.ok && widthResult.errors.some(
    (error) => error.path === "$.captions" && /collection width/i.test(error.message)
  ));

  const tooManyNodes = clonePackage() as unknown as Record<string, unknown>;
  tooManyNodes.nodeTree = Array.from({ length: 11 }, () => Array(10_000).fill(0));
  const nodeResult = validateMathScenePackageV3(tooManyNodes);
  assert.equal(nodeResult.ok, false);
  assert.ok(!nodeResult.ok && nodeResult.errors.some((error) => /node budget/i.test(error.message)));
});
