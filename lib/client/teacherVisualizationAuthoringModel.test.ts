import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveMathSceneV3ReleaseStatus,
  emptyMathSceneV3ReviewLedger
} from "@/components/visualizations/three/manim/mathSceneV3GateLedger";
import type { AnimationStep, MathObjectSpec } from "@/components/visualizations/three/manim/mathSceneTypes";
import type { TeacherVisualizationDraftRecord } from "@/types";
import * as authoringModel from "./teacherVisualizationAuthoringModel";
import {
  applyTeacherVisualizationAuthoringAction,
  analyzeTeacherVisualizationAuthoringCapability,
  createGoldenTrigVisualizationAuthoringState,
  createTeacherVisualizationAuthoringStateFromDraft,
  type TeacherVisualizationAuthoringAction,
  type TeacherVisualizationAuthoringState
} from "./teacherVisualizationAuthoringModel";

function requireAuthoringHelper<T>(name: string): T {
  const candidate = (authoringModel as unknown as Record<string, unknown>)[name];
  assert.equal(typeof candidate, "function", `${name} must be a pure exported helper`);
  return candidate as T;
}

function certifiedState(): TeacherVisualizationAuthoringState {
  const seed = createGoldenTrigVisualizationAuthoringState("teacher-1");
  seed.packageJson.brief.evidenceLevel = "release-ready";
  seed.packageJson.reviewLedger = {
    A06: { evidenceIds: ["a06-runtime"], status: "passed" },
    A11: { evidenceIds: ["a11-browser"], status: "passed" },
    A18: { evidenceIds: ["a18-teaching"], status: "passed" },
    A22: { evidenceIds: ["a22-release"], status: "passed" }
  };
  return createTeacherVisualizationAuthoringStateFromDraft("teacher-1", {
    archivedAt: null,
    createdAt: "2026-08-23T01:00:00.000Z",
    id: "draft-certified",
    ownerId: "teacher-1",
    packageJson: structuredClone(seed.packageJson),
    revision: 7,
    schemaVersion: "mais-manim-scene-package/v3",
    status: "ready-for-review",
    title: "Certified scene",
    updatedAt: "2026-08-23T02:00:00.000Z"
  });
}

function assertPackageEvidenceInvalidated(state: TeacherVisualizationAuthoringState) {
  assert.equal(state.packageJson.brief.evidenceLevel, "spec-only");
  assert.deepEqual(state.packageJson.reviewLedger, emptyMathSceneV3ReviewLedger());
  const release = deriveMathSceneV3ReleaseStatus({
    deployed: true,
    deploymentEvidenceIds: ["deployment"],
    liveBrowserEvidenceIds: ["live-browser"],
    liveBrowserVerified: true,
    mergeEvidenceIds: ["merge"],
    merged: true,
    reviewLedger: state.packageJson.reviewLedger
  });
  assert.equal(release.ga, false);
  assert.notEqual(release.label, "v3 GA");
}

test("the new authoring state wraps the existing trig scene without publishing it", () => {
  const state = createGoldenTrigVisualizationAuthoringState("teacher-1");

  assert.match(state.draftId, /^local:/);
  assert.equal(state.packageJson.schemaVersion, "mais-manim-scene-package/v3");
  assert.equal(state.packageJson.scene.familyId, "three-trig-unit-wave");
  assert.equal(state.packageJson.brief.singleLearningObjective.length > 0, true);
  assert.equal(state.status, "editing");
  assert.equal(state.syncState, "dirty");
  assert.equal("published" in state, false);
});

test("brief edits participate in bounded undo and redo history", () => {
  const initial = createGoldenTrigVisualizationAuthoringState("teacher-1");
  const edited = applyTeacherVisualizationAuthoringAction(initial, {
    type: "set-brief-field",
    field: "singleLearningObjective",
    value: "Explain why the circle height equals sin(theta)."
  });

  assert.equal(
    edited.packageJson.brief.singleLearningObjective,
    "Explain why the circle height equals sin(theta)."
  );
  assert.equal(edited.syncState, "dirty");
  const undone = applyTeacherVisualizationAuthoringAction(edited, { type: "undo" });
  assert.equal(
    undone.packageJson.brief.singleLearningObjective,
    initial.packageJson.brief.singleLearningObjective
  );
  const redone = applyTeacherVisualizationAuthoringAction(undone, { type: "redo" });
  assert.equal(
    redone.packageJson.brief.singleLearningObjective,
    "Explain why the circle height equals sin(theta)."
  );
});

test("invariant editing preserves a trailing line until explicit normalization", () => {
  const normalizeInvariants = requireAuthoringHelper<(items: string[]) => string[]>(
    "normalizeTeacherVisualizationInvariants"
  );
  const initial = createGoldenTrigVisualizationAuthoringState("teacher-1");
  const withTrailingLine = applyTeacherVisualizationAuthoringAction(initial, {
    type: "set-invariants",
    invariants: ["Keep the unit radius fixed.", ""]
  });

  assert.equal(
    withTrailingLine.packageJson.brief.invariants.join("\n"),
    "Keep the unit radius fixed.\n",
    "pressing Enter must leave a writable second line"
  );

  const withSecondInvariant = applyTeacherVisualizationAuthoringAction(withTrailingLine, {
    type: "set-invariants",
    invariants: ["Keep the unit radius fixed.", "Keep x² + y² = 1."]
  });
  assert.deepEqual(withSecondInvariant.packageJson.brief.invariants, [
    "Keep the unit radius fixed.",
    "Keep x² + y² = 1."
  ]);
  assert.deepEqual(normalizeInvariants([" first ", "", "  second  ", "   "]), [
    "first",
    "second"
  ]);
});

test("numeric editor drafts commit only finite complete values on blur or Enter", () => {
  const commitNumber = requireAuthoringHelper<(
    draft: string,
    options?: { min?: number; optional?: boolean }
  ) =>
    | { ok: true; value: number | undefined }
    | { code: string; ok: false }>("commitTeacherVisualizationNumberDraft");

  for (const intermediate of ["", "-", ".", "-."]) {
    assert.equal(commitNumber(intermediate).ok, false, `${JSON.stringify(intermediate)} stays transient`);
  }
  assert.deepEqual(commitNumber("-1.25"), { ok: true, value: -1.25 });
  assert.deepEqual(commitNumber("", { optional: true }), { ok: true, value: undefined });
  assert.deepEqual(commitNumber("-0.5", { min: 0 }), {
    code: "NUMBER_BELOW_MINIMUM",
    ok: false
  });
  assert.equal(commitNumber("Infinity").ok, false);
});

test("formula token ID lists preserve a trailing comma until explicit commit", () => {
  const normalizeCommaList = requireAuthoringHelper<(draft: string) => string[] | undefined>(
    "normalizeTeacherVisualizationCommaListDraft"
  );

  assert.equal("token-a,".endsWith(","), true, "the controlled draft keeps the typed delimiter");
  assert.deepEqual(normalizeCommaList("token-a, token-b"), ["token-a", "token-b"]);
  assert.equal(normalizeCommaList(" ,  "), undefined);
});

test("every package-content action invalidates inherited release evidence", () => {
  const packageReplacement = certifiedState().packageJson;
  packageReplacement.localization.labels["unit-circle"].en = "edited unit circle";
  const actions: Array<{ label: string; action: TeacherVisualizationAuthoringAction }> = [
    {
      label: "brief content",
      action: { type: "set-brief-field", field: "courseGoal", value: "An edited course goal." }
    },
    {
      label: "direct evidence-level attempt",
      action: { type: "set-brief-field", field: "evidenceLevel", value: "release-ready" }
    },
    {
      label: "mathematical invariants",
      action: { type: "set-invariants", invariants: ["An edited invariant."] }
    },
    {
      label: "structured package replacement",
      action: { type: "replace-package", packageJson: packageReplacement }
    },
    {
      label: "local narration metadata",
      action: {
        type: "set-audio",
        audio: {
          contentHash: `sha256-${"a".repeat(64)}`,
          durationSeconds: 2,
          fileName: "narration.webm",
          mimeType: "audio/webm",
          source: "local-file"
        }
      }
    }
  ];

  for (const { label, action } of actions) {
    const edited = applyTeacherVisualizationAuthoringAction(certifiedState(), action);
    assertPackageEvidenceInvalidated(edited);
    assert.equal(edited.syncState, "dirty", label);
  }
});

test("package-content edits immediately demote ready-for-review to editing in UI and local history", () => {
  const certified = certifiedState();
  assert.equal(certified.status, "ready-for-review");

  const edited = applyTeacherVisualizationAuthoringAction(certified, {
    type: "set-brief-field",
    field: "courseGoal",
    value: "Changed after review"
  });
  assert.equal(edited.status, "editing");
  assert.equal(edited.history.at(-1)?.status, "editing");
  assert.equal(edited.packageContentDirty, true);
});

test("local audio attach and detach reset undo history so metadata never points to deleted bytes", () => {
  const contentHashA = `sha256-${"a".repeat(64)}` as const;
  const contentHashB = `sha256-${"b".repeat(64)}` as const;
  const initial = certifiedState();
  const edited = applyTeacherVisualizationAuthoringAction(initial, {
    type: "set-brief-field",
    field: "courseGoal",
    value: "An otherwise undoable edit"
  });
  const attachedA = applyTeacherVisualizationAuthoringAction(edited, {
    type: "set-audio",
    audio: {
      contentHash: contentHashA,
      durationSeconds: 2,
      fileName: "a.webm",
      mimeType: "audio/webm",
      source: "local-file"
    }
  });
  const attachedB = applyTeacherVisualizationAuthoringAction(attachedA, {
    type: "set-audio",
    audio: {
      contentHash: contentHashB,
      durationSeconds: 3,
      fileName: "b.webm",
      mimeType: "audio/webm",
      source: "local-file"
    }
  });
  const undoAfterB = applyTeacherVisualizationAuthoringAction(attachedB, { type: "undo" });

  assert.equal(attachedA.history.length, 1);
  assert.equal(attachedB.history.length, 1);
  assert.equal(undoAfterB.packageJson.audio.source, "local-file");
  assert.equal(undoAfterB.packageJson.audio.contentHash, contentHashB);

  const detached = applyTeacherVisualizationAuthoringAction(attachedB, {
    type: "set-audio",
    audio: { source: "none" }
  });
  const undoAfterDetach = applyTeacherVisualizationAuthoringAction(detached, { type: "undo" });
  const redoAfterDetach = applyTeacherVisualizationAuthoringAction(undoAfterDetach, { type: "redo" });
  assert.equal(detached.history.length, 1);
  assert.deepEqual(undoAfterDetach.packageJson.audio, { source: "none" });
  assert.deepEqual(redoAfterDetach.packageJson.audio, { source: "none" });

  const buildRevision = requireAuthoringHelper<(state: TeacherVisualizationAuthoringState) => {
    packageJson: TeacherVisualizationAuthoringState["packageJson"];
  }>("buildTeacherVisualizationLocalDraftRevision");
  assert.deepEqual(buildRevision(detached).packageJson.audio, { source: "none" });
});

test("undo and redo retain invalidated evidence after a package edit", () => {
  const certified = certifiedState();
  const edited = applyTeacherVisualizationAuthoringAction(certified, {
    type: "set-brief-field",
    field: "courseGoal",
    value: "Edited goal"
  });

  assertPackageEvidenceInvalidated(edited);
  assert.ok(edited.history.every((entry) => (
    entry.packageJson.brief.evidenceLevel === "spec-only"
    && Object.values(entry.packageJson.reviewLedger).every((gate) => (
      gate.status === "pending" && gate.evidenceIds.length === 0
    ))
  )));

  const undone = applyTeacherVisualizationAuthoringAction(edited, { type: "undo" });
  assert.equal(undone.packageJson.brief.courseGoal, certified.packageJson.brief.courseGoal);
  assertPackageEvidenceInvalidated(undone);

  const redone = applyTeacherVisualizationAuthoringAction(undone, { type: "redo" });
  assert.equal(redone.packageJson.brief.courseGoal, "Edited goal");
  assertPackageEvidenceInvalidated(redone);
});

test("metadata-only edits and server-authoritative loads preserve server gate evidence", () => {
  const certified = certifiedState();
  const titled = applyTeacherVisualizationAuthoringAction(certified, {
    type: "set-title",
    title: "Metadata-only title"
  });
  assert.equal(titled.packageJson.brief.evidenceLevel, "release-ready");
  assert.equal(titled.packageJson.reviewLedger.A06.status, "passed");
  assert.equal(titled.packageContentDirty, false);
  assert.equal(titled.metadataDirty, true);

  const statusChanged = applyTeacherVisualizationAuthoringAction(titled, {
    type: "set-status",
    status: "ready-for-review"
  });
  assert.equal(statusChanged.packageJson.brief.evidenceLevel, "release-ready");
  assert.equal(statusChanged.packageJson.reviewLedger.A22.status, "passed");
  assert.equal(statusChanged.packageContentDirty, false);
  assert.equal(statusChanged.metadataDirty, true);

  const serverDraft: TeacherVisualizationDraftRecord = {
    id: "draft-certified",
    ownerId: "teacher-1",
    title: "Server-certified package",
    schemaVersion: "mais-manim-scene-package/v3",
    status: "ready-for-review",
    revision: 7,
    packageJson: structuredClone(certified.packageJson),
    createdAt: "2026-08-23T01:00:00.000Z",
    updatedAt: "2026-08-23T02:00:00.000Z",
    archivedAt: null
  };
  for (const type of ["load-draft", "save-succeeded"] as const) {
    const loaded = applyTeacherVisualizationAuthoringAction(statusChanged, { type, draft: serverDraft });
    assert.equal(loaded.packageJson.brief.evidenceLevel, "release-ready");
    assert.equal(loaded.packageJson.reviewLedger.A18.status, "passed");
    assert.deepEqual(loaded.packageJson.reviewLedger.A18.evidenceIds, ["a18-teaching"]);
    assert.equal(loaded.packageContentDirty, false);
    assert.equal(loaded.metadataDirty, false);
  }
});

test("local restore keeps trusted evidence for metadata-only revisions and keeps real package edits pending", () => {
  type LocalRevision = {
    baseRevision: number;
    dirty: boolean;
    draftId: string;
    metadataDirty: boolean;
    packageContentDirty: boolean;
    packageJson: TeacherVisualizationAuthoringState["packageJson"];
    revision: number;
    savedAt: string;
    status: TeacherVisualizationAuthoringState["status"];
    title: string;
    userId: string;
  };
  const buildLocalRevision = requireAuthoringHelper<(
    state: TeacherVisualizationAuthoringState,
    savedAt?: string
  ) => LocalRevision>("buildTeacherVisualizationLocalDraftRevision");
  const restoreLocalRevision = requireAuthoringHelper<(
    ownerId: string,
    draftId: string,
    local: LocalRevision
  ) => TeacherVisualizationAuthoringState>("createTeacherVisualizationAuthoringStateFromLocalRevision");

  const titled = applyTeacherVisualizationAuthoringAction(certifiedState(), {
    type: "set-title",
    title: "Local metadata title"
  });
  const titleRevision = buildLocalRevision(titled, "2026-08-23T03:00:00.000Z");
  const restoredTitle = restoreLocalRevision("teacher-1", titled.draftId, titleRevision);
  assert.equal(titleRevision.packageContentDirty, false);
  assert.equal(titleRevision.metadataDirty, true);
  assert.equal(restoredTitle.title, "Local metadata title");
  assert.equal(restoredTitle.packageJson.brief.evidenceLevel, "release-ready");
  assert.equal(restoredTitle.packageJson.reviewLedger.A11.status, "passed");
  assert.deepEqual(restoredTitle.packageJson.reviewLedger.A11.evidenceIds, ["a11-browser"]);
  assert.equal(restoredTitle.packageContentDirty, false);
  assert.equal(restoredTitle.metadataDirty, true);
  assert.equal(restoredTitle.syncState, "dirty");

  const packageEdited = applyTeacherVisualizationAuthoringAction(certifiedState(), {
    type: "set-brief-field",
    field: "courseGoal",
    value: "Locally edited package content"
  });
  const packageRevision = buildLocalRevision(packageEdited, "2026-08-23T03:01:00.000Z");
  const restoredPackage = restoreLocalRevision("teacher-1", packageEdited.draftId, packageRevision);
  assert.equal(packageRevision.packageContentDirty, true);
  assert.equal(restoredPackage.packageContentDirty, true);
  assertPackageEvidenceInvalidated(restoredPackage);
});

test("draft PATCH payload omits packageJson for metadata-only saves and includes an invalidated package for content saves", () => {
  const buildPatch = requireAuthoringHelper<(
    state: TeacherVisualizationAuthoringState
  ) => {
    baseRevision: number;
    draftId: string;
    packageJson?: TeacherVisualizationAuthoringState["packageJson"];
    status?: TeacherVisualizationAuthoringState["status"];
    title?: string;
  }>("buildTeacherVisualizationDraftPatch");

  const titled = applyTeacherVisualizationAuthoringAction(certifiedState(), {
    type: "set-title",
    title: "Metadata only"
  });
  const metadataPatch = buildPatch(titled);
  assert.equal("packageJson" in metadataPatch, false);
  assert.equal(metadataPatch.title, "Metadata only");
  assert.equal(metadataPatch.status, titled.status);

  const packageEdited = applyTeacherVisualizationAuthoringAction(certifiedState(), {
    type: "set-brief-field",
    field: "courseGoal",
    value: "Content edit"
  });
  const packagePatch = buildPatch(packageEdited);
  assert.equal("packageJson" in packagePatch, true);
  assert.equal("title" in packagePatch, false);
  assert.equal("status" in packagePatch, false);
  assert.equal(packagePatch.packageJson?.brief.courseGoal, "Content edit");
  assert.equal(packagePatch.packageJson?.brief.evidenceLevel, "spec-only");
  assert.deepEqual(packagePatch.packageJson?.reviewLedger, emptyMathSceneV3ReviewLedger());
});

const animationFixtures: AnimationStep[] = [
  { type: "animationComposition", compositionId: "composition-1", duration: 1 },
  { type: "animateTracker", trackerId: "tracker-1", targetValue: 2, duration: 1, easing: "linear" },
  {
    type: "sweepParameter",
    trackerId: "tracker-2",
    targetValue: 3,
    duration: 1,
    easing: "smooth",
    conceptId: "sweep-concept",
    formulaTokenIds: ["token-a", "token-b"],
    fromValue: -1
  },
  { type: "revealCurve", objectId: "curve-1", duration: 1, easing: "linear" },
  { type: "revealSurface", objectId: "surface-1", duration: 1, easing: "smooth" },
  { type: "fadeInObject", objectId: "object-1", duration: 1, easing: "linear" },
  { type: "fadeOutObject", objectId: "object-2", duration: 1, easing: "smooth" },
  { type: "growFromCenter", objectId: "object-3", duration: 1, easing: "linear" },
  { type: "moveAlongPath", objectId: "point-1", pathObjectId: "curve-1", duration: 1 },
  {
    type: "transformObject",
    objectId: "source-1",
    targetObjectId: "target-1",
    duration: 1,
    lagRatio: 0.25,
    path: { type: "arc", angleRadians: 1.2, axis: [0, 1, 0] }
  },
  { type: "highlight", conceptId: "highlight-concept", duration: 1 },
  { type: "cameraTo", shotId: "camera-1", duration: 1 },
  {
    type: "wait",
    duration: 1,
    holdOnWait: true,
    ignorePresenterMode: false,
    maxTime: 5,
    note: "presenter pause",
    presenterMode: true,
    presenterReleaseAfterFrames: 3,
    stopConditionId: "stop-1",
    stopConditionSatisfiedAt: 2
  }
];

test("pure AnimationStep helpers cover all 13 types, preserve hidden optionals and block destructive switches", () => {
  const patchStep = requireAuthoringHelper<(
    step: AnimationStep,
    patch: Record<string, unknown>
  ) => AnimationStep>("patchTeacherVisualizationAnimationStep");
  const editableFields = requireAuthoringHelper<(
    type: AnimationStep["type"]
  ) => readonly string[]>("teacherVisualizationAnimationStepEditableFields");
  const typeSwitch = requireAuthoringHelper<(
    step: AnimationStep,
    index: number
  ) => {
    allowed: boolean;
    handoffs: Array<{ code: string; path: string }>;
  }>("analyzeTeacherVisualizationAnimationTypeSwitch");

  assert.equal(animationFixtures.length, 13);
  assert.equal(new Set(animationFixtures.map((step) => step.type)).size, 13);
  for (const [index, step] of animationFixtures.entries()) {
    const original = structuredClone(step);
    const patched = patchStep(step, { duration: step.duration + 0.5 });
    assert.deepEqual(patched, { ...original, duration: original.duration + 0.5 }, step.type);
    assert.deepEqual(step, original, `${step.type} input must stay immutable`);

    const supportedFields = new Set(editableFields(step.type));
    for (const field of Object.keys(step).filter((field) => field !== "type")) {
      assert.equal(supportedFields.has(field), true, `${step.type}.${field} must be structurally editable`);
    }

    const result = typeSwitch(step, index);
    const incompatibleFields = Object.keys(step).filter((field) => field !== "type" && field !== "duration");
    assert.equal(result.allowed, incompatibleFields.length === 0, step.type);
    assert.deepEqual(
      result.handoffs,
      incompatibleFields.map((field) => ({
        code: "A06_EXTENSION_REQUIRED",
        path: `scene.timeline[${index}].${field}`
      })),
      step.type
    );
  }
});

test("advanced scene structures are preserved and reported as an A06 handoff", () => {
  const initial = createGoldenTrigVisualizationAuthoringState("teacher-1");
  const advancedPackage = structuredClone(initial.packageJson) as typeof initial.packageJson & {
    scene: typeof initial.packageJson.scene & { vectorFields: unknown[] };
  };
  advancedPackage.scene.vectorFields = [{
    id: "field-1",
    conceptId: "field",
    system: { type: "constantVelocity", velocity: [1, 0, 0] },
    xRange: [-1, 1],
    xSteps: 4,
    yRange: [-1, 1],
    ySteps: 4
  }];

  const replaced = applyTeacherVisualizationAuthoringAction(initial, {
    type: "replace-package",
    packageJson: advancedPackage
  });
  const capability = analyzeTeacherVisualizationAuthoringCapability(replaced.packageJson);

  assert.deepEqual(replaced.packageJson.scene.vectorFields, advancedPackage.scene.vectorFields);
  assert.equal(capability.code, "A06_EXTENSION_REQUIRED");
  const handoffPaths = (capability as unknown as { preservedHandoffPaths: string[] }).preservedHandoffPaths;
  assert.ok(handoffPaths.includes("scene.vectorFields[0].system.velocity[0]"));
  assert.equal(capability.previewMode, "existing-golden-only");
  assert.equal(capability.webmExecutor, "not-connected");
});

test("capability analysis reports exact hidden object, camera, tracker and advanced paths without flagging supported fields", () => {
  const state = createGoldenTrigVisualizationAuthoringState("teacher-1");
  const packageJson = structuredClone(state.packageJson);
  packageJson.scene.objects = [
    {
      type: "axis3d",
      id: "axis-hidden",
      conceptId: "axis",
      range: { x: [-2, 2], y: [-3, 3], z: [-4, 4] },
      uniforms: { opacity: 0.75 },
      zIndex: 1
    },
    {
      type: "parametricCurve",
      id: "curve-hidden",
      conceptId: "curve",
      colorRole: "function",
      samples: [[0, 0, 0], [1, 1, 0]],
      style: { strokeWidth: 7 },
      uniforms: { shadeIn3D: true },
      zIndex: 2
    },
    {
      type: "parametricSurface",
      id: "surface-hidden",
      conceptId: "surface",
      colorRole: "surface",
      samples: [[[0, 0, 0], [1, 0, 0]], [[0, 1, 0], [1, 1, 1]]],
      style: { fillOpacity: 0.4 },
      uniforms: { fixedInFrame: false },
      uRange: [0, 1],
      vRange: [0, 1],
      zIndex: 3
    },
    {
      type: "movingPoint",
      id: "point-hidden",
      conceptId: "point",
      colorRole: "probe",
      pathObjectId: "curve-hidden",
      uniforms: { opacity: 0.8 },
      zIndex: 4
    },
    {
      type: "trace",
      id: "trace-hidden",
      sourceObjectId: "point-hidden",
      durationSeconds: 2,
      colorRole: "trace",
      style: { strokeOpacity: 0.6 },
      uniforms: { opacity: 0.7 },
      zIndex: 5
    },
    {
      type: "vector",
      id: "vector-hidden",
      conceptId: "vector",
      colorRole: "vector",
      from: [0, 0, 0],
      to: [1, 2, 3],
      style: { strokeRole: "accent" },
      uniforms: { shadeIn3D: true },
      zIndex: 6
    }
  ] satisfies MathObjectSpec[];
  packageJson.scene.cameraShots = [{
    id: "camera-hidden",
    fov: 48,
    position: [2, 3, 4],
    target: [0, 0, 0]
  }];
  packageJson.scene.parameters = [{
    id: "parameter-hidden",
    label: "Parameter",
    value: 2,
    min: -5,
    max: 5,
    role: "control",
    conceptId: "parameter"
  }];
  packageJson.scene.valueTrackers = [{
    id: "tracker-hidden",
    label: "Tracker",
    value: 0.5,
    min: 0,
    max: 1,
    conceptId: "tracker"
  }];
  packageJson.scene.timeline = structuredClone(animationFixtures);
  if (packageJson.scene.bindings[0]) packageJson.scene.bindings[0].anchorName = "top";
  packageJson.scene.vectorFields = [{
    conceptId: "field-hidden",
    id: "field-hidden",
    system: { type: "constantVelocity", velocity: [1, 2, 3] },
    xRange: [-1, 1],
    xSteps: 4,
    yRange: [-1, 1],
    ySteps: 4
  }];

  const capability = analyzeTeacherVisualizationAuthoringCapability(packageJson) as unknown as {
    preservedHandoffPaths: string[];
  };
  const paths = new Set(capability.preservedHandoffPaths);
  for (const path of [
    "scene.objects[0].uniforms.opacity",
    "scene.objects[0].zIndex",
    "scene.objects[1].samples",
    "scene.objects[1].style.strokeWidth",
    "scene.objects[1].uniforms.shadeIn3D",
    "scene.objects[1].zIndex",
    "scene.cameraShots[0].id",
    "scene.cameraShots[0].fov",
    "scene.parameters[0].id",
    "scene.parameters[0].label",
    "scene.parameters[0].min",
    "scene.parameters[0].max",
    "scene.parameters[0].role",
    "scene.parameters[0].conceptId",
    "scene.valueTrackers[0].id",
    "scene.valueTrackers[0].label",
    "scene.valueTrackers[0].value",
    "scene.valueTrackers[0].min",
    "scene.valueTrackers[0].max",
    "scene.valueTrackers[0].conceptId",
    "scene.vectorFields[0].system.velocity[2]",
    "scene.formulas.$add",
    "scene.formulas[0].id",
    "scene.formulas[0].tokens.$add",
    "scene.formulas[0].tokens.$reorder",
    "scene.formulas[0].tokens[0].id",
    "scene.formulas[0].tokens[0].conceptId",
    "scene.bindings.$add",
    "scene.bindings[0].anchorName",
    "localization.defaultLocale",
    "localization.labelStrategy",
    "localization.labels.$add",
    "captions.$add",
    "captions.$reorder",
    "captions[0].$remove",
    "scene.cameraShots.$reorder",
    "scene.formulas.$reorder",
    "scene.objects.$reorder",
    "scene.timeline.$reorder",
    "exportProfiles.$add",
    "exportProfiles[0].format",
    "scene.interactions"
  ]) assert.equal(paths.has(path), true, path);

  for (const supportedPath of [
    "scene.objects[0].range.x",
    "scene.objects[1].colorRole",
    "scene.objects[1].conceptId",
    "scene.cameraShots[0].position",
    "scene.cameraShots[0].target",
    "scene.parameters[0].value",
    "scene.timeline[1].targetValue",
    "scene.timeline[2].formulaTokenIds",
    "scene.timeline[9].lagRatio",
    "scene.timeline[12].note"
  ]) assert.equal(paths.has(supportedPath), false, supportedPath);
});

test("axis optional conceptId can be unset without writing an invalid empty string", () => {
  const patchConceptId = requireAuthoringHelper<(
    object: MathObjectSpec,
    value: string
  ) => MathObjectSpec>("patchTeacherVisualizationMathObjectConceptId");
  const axis: MathObjectSpec = {
    type: "axis3d",
    id: "axis-1",
    conceptId: "axis-concept",
    range: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }
  };
  const curve: MathObjectSpec = {
    type: "parametricCurve",
    id: "curve-1",
    conceptId: "curve-concept",
    colorRole: "function",
    samples: [[0, 0, 0], [1, 1, 0]]
  };

  const axisWithoutConcept = patchConceptId(axis, "");
  const curveWithEmptyConcept = patchConceptId(curve, "");
  assert.equal("conceptId" in axisWithoutConcept, false);
  assert.equal(axis.conceptId, "axis-concept");
  assert.equal(curveWithEmptyConcept.type, "parametricCurve");
  if (curveWithEmptyConcept.type !== "parametricCurve") throw new Error("curve type changed unexpectedly");
  assert.equal(curveWithEmptyConcept.conceptId, "");
});

test("capability analysis reports set paths for absent optional fields by concrete spec type", () => {
  const packageJson = structuredClone(createGoldenTrigVisualizationAuthoringState("teacher-1").packageJson);
  packageJson.scene.objects = [
    { type: "axis3d", id: "axis", range: { x: [-1, 1], y: [-1, 1], z: [-1, 1] } },
    { type: "parametricCurve", id: "curve", samples: [[0, 0, 0]], colorRole: "curve", conceptId: "curve" },
    { type: "parametricSurface", id: "surface", samples: [[[0, 0, 0]]], uRange: [0, 1], vRange: [0, 1], colorRole: "surface", conceptId: "surface" },
    { type: "movingPoint", id: "point", pathObjectId: "curve", colorRole: "point", conceptId: "point" },
    { type: "trace", id: "trace", sourceObjectId: "point", durationSeconds: 1, colorRole: "trace" },
    { type: "vector", id: "vector", from: [0, 0, 0], to: [1, 0, 0], colorRole: "vector", conceptId: "vector" }
  ];
  packageJson.scene.bindings = [{
    conceptId: "curve",
    formulaId: packageJson.scene.formulas[0]!.id,
    objectId: "curve",
    tokenId: packageJson.scene.formulas[0]!.tokens[0]!.id
  }];
  packageJson.scene.cameraShots = [{ id: "camera", position: [0, 0, 5], target: [0, 0, 0] }];
  packageJson.scene.parameters = [{ id: "parameter", label: "Parameter", role: "control", value: 0 }];
  packageJson.scene.valueTrackers = [{ id: "tracker", value: 0 }];
  packageJson.scene.randomSeed = undefined;
  packageJson.scene.alwaysRedraw = undefined;

  const paths = new Set(analyzeTeacherVisualizationAuthoringCapability(packageJson).preservedHandoffPaths);
  for (const index of [0, 1, 2, 3, 4, 5]) {
    for (const field of ["clippingPlanes", "fixedInFrame", "opacity", "shadeIn3D"]) {
      assert.equal(paths.has(`scene.objects[${index}].uniforms.${field}.$set`), true);
    }
    assert.equal(paths.has(`scene.objects[${index}].zIndex.$set`), true);
  }
  for (const index of [1, 2, 4, 5]) {
    for (const field of [
      "antiAliasWidth", "baseNormal", "fillOpacity", "fillRole", "jointAngleDegrees",
      "strokeZoomBehavior", "strokeOpacity", "strokeRole", "strokeWidth"
    ]) assert.equal(paths.has(`scene.objects[${index}].style.${field}.$set`), true);
  }
  for (const path of [
    "scene.bindings[0].anchorName.$set",
    "scene.cameraShots[0].fov.$set",
    "scene.parameters[0].conceptId.$set",
    "scene.parameters[0].max.$set",
    "scene.parameters[0].min.$set",
    "scene.valueTrackers[0].conceptId.$set",
    "scene.valueTrackers[0].label.$set",
    "scene.valueTrackers[0].max.$set",
    "scene.valueTrackers[0].min.$set",
    `localization.labels.${Object.keys(packageJson.localization.labels)[0]}.$rename`,
    "scene.randomSeed.$set",
    "scene.alwaysRedraw.$set"
  ]) assert.equal(paths.has(path), true, path);

  assert.equal(paths.has("scene.objects[0].conceptId.$set"), false, "axis conceptId is rendered by the structured editor");
});

test("authoring product label derives from gate and release evidence instead of hard-coding RC", () => {
  const deriveStatus = requireAuthoringHelper<(
    packageJson: TeacherVisualizationAuthoringState["packageJson"],
    releaseEvidence?: {
      deployed: boolean;
      deploymentEvidenceIds: string[];
      liveBrowserEvidenceIds: string[];
      liveBrowserVerified: boolean;
      mergeEvidenceIds: string[];
      merged: boolean;
    }
  ) => { label: string; ga: boolean }>("deriveTeacherVisualizationAuthoringProductStatus");

  const beta = deriveStatus(createGoldenTrigVisualizationAuthoringState("teacher-1").packageJson);
  assert.equal(beta.label, "Beta");
  assert.equal(beta.ga, false);

  const rc = deriveStatus(certifiedState().packageJson);
  assert.equal(rc.label, "v3 RC");
  assert.equal(rc.ga, false);

  const ga = deriveStatus(certifiedState().packageJson, {
    deployed: true,
    deploymentEvidenceIds: ["deployment"],
    liveBrowserEvidenceIds: ["live-browser"],
    liveBrowserVerified: true,
    mergeEvidenceIds: ["merge"],
    merged: true
  });
  assert.equal(ga.label, "v3 GA");
  assert.equal(ga.ga, true);
});

test("package-content actions invalidate validation while metadata and save actions do not", () => {
  const invalidatesValidation = requireAuthoringHelper<(
    action: TeacherVisualizationAuthoringAction
  ) => boolean>("teacherVisualizationActionInvalidatesPackageValidation");

  for (const action of [
    { type: "replace-package", packageJson: certifiedState().packageJson },
    { type: "set-brief-field", field: "courseGoal", value: "changed" },
    { type: "set-invariants", invariants: ["changed"] },
    { type: "set-audio", audio: { source: "none" } },
    { type: "undo" },
    { type: "redo" }
  ] as TeacherVisualizationAuthoringAction[]) assert.equal(invalidatesValidation(action), true, action.type);

  for (const action of [
    { type: "set-title", title: "metadata" },
    { type: "set-status", status: "ready-for-review" },
    { type: "save-started" },
    { type: "save-failed", errorCode: "failed" }
  ] as TeacherVisualizationAuthoringAction[]) assert.equal(invalidatesValidation(action), false, action.type);
});

test("a revision conflict preserves the dirty local package and exposes the server version", () => {
  const seed = createGoldenTrigVisualizationAuthoringState("teacher-1");
  const initial = createTeacherVisualizationAuthoringStateFromDraft("teacher-1", {
    id: "draft-1",
    ownerId: "teacher-1",
    title: "Base title",
    schemaVersion: "mais-manim-scene-package/v3",
    status: "editing",
    revision: 3,
    packageJson: structuredClone(seed.packageJson),
    createdAt: "2026-08-23T01:00:00.000Z",
    updatedAt: "2026-08-23T01:30:00.000Z",
    archivedAt: null
  });
  const dirty = applyTeacherVisualizationAuthoringAction(initial, {
    type: "set-title",
    title: "My local title"
  });
  const serverVersion: TeacherVisualizationDraftRecord = {
    id: "draft-1",
    ownerId: "teacher-1",
    title: "Server title",
    schemaVersion: "mais-manim-scene-package/v3",
    status: "editing",
    revision: 4,
    packageJson: structuredClone(initial.packageJson),
    createdAt: "2026-08-23T01:00:00.000Z",
    updatedAt: "2026-08-23T02:00:00.000Z",
    archivedAt: null
  };
  serverVersion.packageJson.brief.courseGoal = "Server-updated package goal";
  const conflicted = applyTeacherVisualizationAuthoringAction(dirty, {
    type: "save-conflict",
    currentRevision: 4,
    serverVersion
  });

  assert.equal(conflicted.title, "My local title");
  assert.equal(conflicted.syncState, "conflict");
  assert.equal(conflicted.conflict?.serverVersion.title, "Server title");
  assert.equal(conflicted.revision, initial.revision);
  const kept = applyTeacherVisualizationAuthoringAction(conflicted, { type: "keep-local-conflict-copy" });
  assert.equal(kept.syncState, "dirty");
  assert.equal(kept.conflict, null);
  assert.equal(kept.revision, 4);
  assert.equal(kept.title, "My local title");
  assert.equal(kept.packageJson.brief.courseGoal, "Server-updated package goal");
  assert.equal(kept.packageContentDirty, false);
  assert.equal(kept.metadataDirty, true);

  const conflictedAgain = applyTeacherVisualizationAuthoringAction(dirty, {
    type: "save-conflict",
    currentRevision: 4,
    serverVersion
  });
  const adopted = applyTeacherVisualizationAuthoringAction(conflictedAgain, {
    type: "adopt-server-conflict"
  } as TeacherVisualizationAuthoringAction);
  assert.equal(adopted.syncState, "clean");
  assert.equal(adopted.conflict, null);
  assert.equal(adopted.revision, 4);
  assert.equal(adopted.title, "Server title");
});

test("deferred conflict leases abort stale use-server and save-as-new handlers after an intervening edit", async () => {
  type ConflictOperationKind = "save-as-new" | "use-server";
  type ConflictOperationTarget = unknown;
  const captureTarget = requireAuthoringHelper<(
    state: TeacherVisualizationAuthoringState,
    kind: ConflictOperationKind
  ) => ConflictOperationTarget | null>("captureTeacherVisualizationConflictOperationTarget");
  const awaitLease = requireAuthoringHelper<(input: {
    ensureLease: (draftId: string) => Promise<boolean>;
    readCurrentState: () => TeacherVisualizationAuthoringState | null;
    target: ConflictOperationTarget;
  }) => Promise<boolean>>("awaitTeacherVisualizationConflictOperationLease");

  for (const kind of ["use-server", "save-as-new"] as const) {
    const base = certifiedState();
    const local = applyTeacherVisualizationAuthoringAction(base, {
      type: "set-title",
      title: `Local before ${kind}`
    });
    const serverVersion: TeacherVisualizationDraftRecord = {
      archivedAt: null,
      createdAt: "2026-08-23T01:00:00.000Z",
      id: base.draftId,
      ownerId: base.ownerId,
      packageJson: structuredClone(base.packageJson),
      revision: base.revision + 1,
      schemaVersion: "mais-manim-scene-package/v3",
      status: "editing",
      title: "Concurrent server version",
      updatedAt: "2026-08-23T04:00:00.000Z"
    };
    let current = applyTeacherVisualizationAuthoringAction(local, {
      currentRevision: serverVersion.revision,
      serverVersion,
      type: "save-conflict"
    });
    const target = captureTarget(current, kind);
    assert.notEqual(target, null);
    if (!target) continue;

    let resolveLease!: (held: boolean) => void;
    const deferredLease = new Promise<boolean>((resolve) => { resolveLease = resolve; });
    const continuation = awaitLease({
      ensureLease: async () => deferredLease,
      readCurrentState: () => current,
      target
    });

    current = applyTeacherVisualizationAuthoringAction(current, {
      type: "set-title",
      title: `Intervening ${kind} edit`
    });
    resolveLease(true);

    assert.equal(await continuation, false, `${kind} must abort after its conflict identity becomes stale`);
    assert.equal(current.title, `Intervening ${kind} edit`);
    assert.equal(current.syncState, "dirty");
    assert.equal(current.conflict, null);
  }
});

test("a package-content conflict cannot be rebased by advancing the local package revision", () => {
  const seed = createGoldenTrigVisualizationAuthoringState("teacher-1");
  const initial = createTeacherVisualizationAuthoringStateFromDraft("teacher-1", {
    id: "draft-1",
    ownerId: "teacher-1",
    title: "Base title",
    schemaVersion: "mais-manim-scene-package/v3",
    status: "ready-for-review",
    revision: 3,
    packageJson: structuredClone(seed.packageJson),
    createdAt: "2026-08-23T01:00:00.000Z",
    updatedAt: "2026-08-23T01:30:00.000Z",
    archivedAt: null
  });
  const local = applyTeacherVisualizationAuthoringAction(initial, {
    type: "set-brief-field",
    field: "courseGoal",
    value: "Local package change"
  });
  const serverVersion: TeacherVisualizationDraftRecord = {
    ...structuredClone({
      id: "draft-1",
      ownerId: "teacher-1",
      title: "Server title",
      schemaVersion: "mais-manim-scene-package/v3" as const,
      status: "editing" as const,
      revision: 4,
      packageJson: initial.packageJson,
      createdAt: "2026-08-23T01:00:00.000Z",
      updatedAt: "2026-08-23T02:00:00.000Z",
      archivedAt: null
    })
  };
  serverVersion.packageJson.brief.learnerAction = "Concurrent server package change";
  const conflicted = applyTeacherVisualizationAuthoringAction(local, {
    type: "save-conflict",
    currentRevision: serverVersion.revision,
    serverVersion
  });

  const refused = applyTeacherVisualizationAuthoringAction(conflicted, {
    type: "keep-local-conflict-copy"
  });

  assert.equal(refused, conflicted);
  assert.equal(refused.syncState, "conflict");
  assert.equal(refused.revision, 3);
  assert.equal(refused.packageJson.brief.courseGoal, "Local package change");
  assert.equal(refused.conflict?.serverVersion.packageJson.brief.learnerAction, "Concurrent server package change");
});

test("conflict and recovery copy titles remain within the server title bound", () => {
  const buildCopyTitle = requireAuthoringHelper<(
    title: string,
    suffix: "conflict copy" | "recovered copy"
  ) => string>("buildTeacherVisualizationCopyTitle");

  for (const suffix of ["conflict copy", "recovered copy"] as const) {
    const title = buildCopyTitle("x".repeat(160), suffix);
    assert.equal(title.length <= 160, true);
    assert.equal(title.endsWith(`(${suffix})`), true);
  }
});

test("a successful save advances revision, clears history dirtiness and retains the server package", () => {
  const initial = createGoldenTrigVisualizationAuthoringState("teacher-1");
  const dirty = applyTeacherVisualizationAuthoringAction(initial, {
    type: "set-title",
    title: "Saved title"
  });
  const savedRecord: TeacherVisualizationDraftRecord = {
    id: "draft-1",
    ownerId: "teacher-1",
    title: dirty.title,
    schemaVersion: "mais-manim-scene-package/v3",
    status: "editing",
    revision: 2,
    packageJson: structuredClone(dirty.packageJson),
    createdAt: "2026-08-23T01:00:00.000Z",
    updatedAt: "2026-08-23T02:00:00.000Z",
    archivedAt: null
  };

  const saved = applyTeacherVisualizationAuthoringAction(dirty, {
    type: "save-succeeded",
    draft: savedRecord
  });
  assert.equal(saved.draftId, "draft-1");
  assert.equal(saved.revision, 2);
  assert.equal(saved.syncState, "clean");
  assert.equal(saved.historyIndex, 0);
  assert.equal(saved.history.length, 1);
});
