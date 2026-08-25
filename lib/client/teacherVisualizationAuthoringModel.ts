import {
  canonicalMathSceneBeatId,
  upgradeMathSceneSpecV1ToPackageV3,
  type MathSceneLocalAudioMetadata,
  type MathScenePackageV3,
  type SceneBriefV3
} from "@/components/visualizations/three/manim/mathScenePackageV3";
import {
  deriveMathSceneV3ReleaseStatus,
  emptyMathSceneV3ReviewLedger,
  type MathSceneV3ReleaseEvidence
} from "@/components/visualizations/three/manim/mathSceneV3GateLedger";
import { buildMathSceneSpecForThreeDFamily } from "@/components/visualizations/three/manim/mathSceneRegistry";
import type { AnimationStep, MathObjectSpec } from "@/components/visualizations/three/manim/mathSceneTypes";
import type {
  TeacherVisualizationDraftRecord,
  TeacherVisualizationDraftRevisionConflict,
  TeacherVisualizationDraftStatus
} from "@/types";
import type { TeacherVisualizationLocalDraftRevision } from "./teacherVisualizationDraftIndexedDb";

export type TeacherVisualizationAuthoringSyncState =
  | "clean"
  | "conflict"
  | "dirty"
  | "error"
  | "loading"
  | "saving";

type AuthoringSnapshot = {
  packageJson: MathScenePackageV3;
  status: Exclude<TeacherVisualizationDraftStatus, "archived">;
  title: string;
};

export type TeacherVisualizationAuthoringConflict = TeacherVisualizationDraftRevisionConflict & {
  choice: "keep-local" | null;
};

export type TeacherVisualizationAuthoringState = AuthoringSnapshot & {
  conflict: TeacherVisualizationAuthoringConflict | null;
  draftId: string;
  errorCode: string | null;
  history: AuthoringSnapshot[];
  historyIndex: number;
  metadataDirty: boolean;
  ownerId: string;
  packageContentDirty: boolean;
  revision: number;
  syncState: TeacherVisualizationAuthoringSyncState;
};

export type TeacherVisualizationConflictOperationKind = "rebase-metadata" | "save-as-new" | "use-server";

export type TeacherVisualizationConflictOperationTarget = {
  conflict: TeacherVisualizationAuthoringConflict;
  draftId: string;
  kind: TeacherVisualizationConflictOperationKind;
  revision: number;
};

export type TeacherVisualizationAuthoringAction =
  | { type: "adopt-server-conflict" }
  | { type: "keep-local-conflict-copy" }
  | { type: "load-draft"; draft: TeacherVisualizationDraftRecord }
  | { type: "redo" }
  | { type: "replace-package"; packageJson: MathScenePackageV3 }
  | { type: "save-conflict"; currentRevision: number; serverVersion: TeacherVisualizationDraftRecord }
  | { type: "save-failed"; errorCode: string }
  | { type: "save-started" }
  | { type: "save-succeeded"; draft: TeacherVisualizationDraftRecord }
  | { type: "set-audio"; audio: MathSceneLocalAudioMetadata }
  | { type: "set-brief-field"; field: Exclude<keyof SceneBriefV3, "invariants">; value: string }
  | { type: "set-invariants"; invariants: string[] }
  | { type: "set-status"; status: Exclude<TeacherVisualizationDraftStatus, "archived"> }
  | { type: "set-title"; title: string }
  | { type: "undo" };

export type TeacherVisualizationAuthoringCapability = {
  code: "A06_EXTENSION_REQUIRED";
  editableAnimationStepCount: number;
  editableObjectCounts: Record<string, number>;
  preservedAdvancedFields: string[];
  preservedHandoffPaths: string[];
  previewMode: "existing-golden-only";
  webmExecutor: "not-connected";
};

const maximumHistoryLength = 50;
const advancedSceneFields = [
  "alwaysMethodUpdaters",
  "alwaysRedraw",
  "animationCompositions",
  "animationPlans",
  "cameraUpdaters",
  "formulaSvgMorphs",
  "matchingTransforms",
  "odeTrajectories",
  "renderGroups",
  "soundCues",
  "streamLines",
  "vectorFields",
  "vectorFieldUpdaters"
] as const;

const animationStepFields = {
  animationComposition: ["compositionId", "duration"],
  animateTracker: ["trackerId", "targetValue", "duration", "easing"],
  sweepParameter: [
    "trackerId",
    "targetValue",
    "duration",
    "easing",
    "conceptId",
    "formulaTokenIds",
    "fromValue"
  ],
  revealCurve: ["objectId", "duration", "easing"],
  revealSurface: ["objectId", "duration", "easing"],
  fadeInObject: ["objectId", "duration", "easing"],
  fadeOutObject: ["objectId", "duration", "easing"],
  growFromCenter: ["objectId", "duration", "easing"],
  moveAlongPath: ["objectId", "pathObjectId", "duration"],
  transformObject: ["objectId", "targetObjectId", "duration", "lagRatio", "path"],
  highlight: ["conceptId", "duration"],
  cameraTo: ["shotId", "duration"],
  wait: [
    "duration",
    "holdOnWait",
    "ignorePresenterMode",
    "maxTime",
    "note",
    "presenterMode",
    "presenterReleaseAfterFrames",
    "stopConditionId",
    "stopConditionSatisfiedAt"
  ]
} as const satisfies Record<AnimationStep["type"], readonly string[]>;

function clonePackage(packageJson: MathScenePackageV3) {
  return structuredClone(packageJson);
}

export function normalizeTeacherVisualizationInvariants(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean);
}

export function normalizeTeacherVisualizationCommaListDraft(draft: string) {
  const values = draft.split(",").map((item) => item.trim()).filter(Boolean);
  return values.length ? values : undefined;
}

export function commitTeacherVisualizationNumberDraft(
  draft: string,
  options: { min?: number; optional?: boolean } = {}
):
  | { ok: true; value: number | undefined }
  | { code: "NUMBER_BELOW_MINIMUM" | "NUMBER_NOT_FINITE" | "NUMBER_REQUIRED"; ok: false } {
  const trimmed = draft.trim();
  if (trimmed === "") {
    return options.optional
      ? { ok: true, value: undefined }
      : { code: "NUMBER_REQUIRED", ok: false };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { code: "NUMBER_NOT_FINITE", ok: false };
  if (options.min !== undefined && value < options.min) {
    return { code: "NUMBER_BELOW_MINIMUM", ok: false };
  }
  return { ok: true, value };
}

export function patchTeacherVisualizationMathObjectConceptId(
  object: MathObjectSpec,
  conceptId: string
): MathObjectSpec {
  const next = structuredClone(object) as MathObjectSpec & Record<string, unknown>;
  if (next.type === "trace") return next;
  if (next.type === "axis3d" && conceptId === "") delete next.conceptId;
  else next.conceptId = conceptId;
  return next;
}

function snapshot(state: Pick<TeacherVisualizationAuthoringState, "packageJson" | "status" | "title">): AuthoringSnapshot {
  return {
    packageJson: clonePackage(state.packageJson),
    status: state.status,
    title: state.title
  };
}

function invalidateMathScenePackageEvidence(packageJson: MathScenePackageV3): MathScenePackageV3 {
  const invalidated = clonePackage(packageJson);
  invalidated.brief.evidenceLevel = "spec-only";
  invalidated.reviewLedger = emptyMathSceneV3ReviewLedger();
  return invalidated;
}

function invalidateSnapshotPackageEvidence(value: AuthoringSnapshot): AuthoringSnapshot {
  return {
    ...snapshot(value),
    packageJson: invalidateMathScenePackageEvidence(value.packageJson)
  };
}

function pushEdit(
  state: TeacherVisualizationAuthoringState,
  next: AuthoringSnapshot,
  options: { invalidatesPackageEvidence?: boolean; metadataEdit?: boolean } = {}
): TeacherVisualizationAuthoringState {
  const previous = state.history.slice(0, state.historyIndex + 1);
  const historyBeforeEdit = options.invalidatesPackageEvidence
    ? previous.map((entry) => ({ ...invalidateSnapshotPackageEvidence(entry), status: "editing" as const }))
    : previous;
  const nextSnapshot = options.invalidatesPackageEvidence
    ? { ...invalidateSnapshotPackageEvidence(next), status: "editing" as const }
    : snapshot(next);
  const history = [...historyBeforeEdit, nextSnapshot].slice(-maximumHistoryLength);
  return {
    ...state,
    ...snapshot(nextSnapshot),
    conflict: null,
    errorCode: null,
    history,
    historyIndex: history.length - 1,
    metadataDirty: state.metadataDirty || options.metadataEdit === true,
    packageContentDirty: state.packageContentDirty || options.invalidatesPackageEvidence === true,
    syncState: "dirty"
  };
}

export function teacherVisualizationAnimationStepEditableFields(type: AnimationStep["type"]) {
  return animationStepFields[type];
}

export function patchTeacherVisualizationAnimationStep(
  step: AnimationStep,
  patch: Record<string, unknown>
): AnimationStep {
  const next = {
    ...structuredClone(step),
    ...structuredClone(patch)
  } as unknown as Record<string, unknown>;
  for (const [field, value] of Object.entries(patch)) {
    if (value === undefined) delete next[field];
  }
  return next as AnimationStep;
}

export function analyzeTeacherVisualizationAnimationTypeSwitch(step: AnimationStep, index: number) {
  const incompatibleFields = Object.keys(step).filter((field) => field !== "type" && field !== "duration");
  return {
    allowed: incompatibleFields.length === 0,
    handoffs: incompatibleFields.map((field) => ({
      code: "A06_EXTENSION_REQUIRED" as const,
      path: `scene.timeline[${index}].${field}`
    }))
  };
}

export function createTeacherVisualizationAnimationStep(
  type: AnimationStep["type"],
  packageJson: MathScenePackageV3,
  existingDuration = 1
): AnimationStep {
  const objectId = packageJson.scene.objects[0]?.id ?? "select-object";
  const pathObjectId = packageJson.scene.objects.find((object) => object.type === "parametricCurve")?.id ?? objectId;
  const surfaceId = packageJson.scene.objects.find((object) => object.type === "parametricSurface")?.id ?? objectId;
  const conceptObject = packageJson.scene.objects.find((object) => "conceptId" in object);
  const conceptId = conceptObject && "conceptId" in conceptObject
    ? conceptObject.conceptId ?? "select-concept"
    : "select-concept";
  const trackerId = packageJson.scene.valueTrackers?.[0]?.id
    ?? packageJson.scene.parameters?.[0]?.id
    ?? "select-tracker";
  const duration = existingDuration;
  if (type === "animationComposition") {
    return {
      type,
      compositionId: packageJson.scene.animationCompositions?.[0]?.id ?? "select-composition",
      duration
    };
  }
  if (type === "animateTracker") return { type, trackerId, targetValue: 1, duration, easing: "smooth" };
  if (type === "sweepParameter") {
    return { type, trackerId, targetValue: 1, duration, easing: "smooth", conceptId };
  }
  if (type === "revealCurve") return { type, objectId: pathObjectId, duration, easing: "smooth" };
  if (type === "revealSurface") return { type, objectId: surfaceId, duration, easing: "smooth" };
  if (type === "fadeInObject" || type === "fadeOutObject" || type === "growFromCenter") {
    return { type, objectId, duration, easing: "smooth" };
  }
  if (type === "moveAlongPath") return { type, objectId, pathObjectId, duration };
  if (type === "transformObject") {
    return {
      type,
      objectId,
      targetObjectId: packageJson.scene.objects[1]?.id ?? objectId,
      duration
    };
  }
  if (type === "highlight") return { type, conceptId, duration };
  if (type === "cameraTo") {
    return {
      type,
      shotId: packageJson.scene.cameraShots[0]?.id ?? "select-camera",
      duration
    };
  }
  return { type: "wait", duration };
}

export function createGoldenTrigVisualizationPackage(): MathScenePackageV3 {
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
  if (!scene) throw new Error("The existing three-trig-unit-wave scene is unavailable.");

  return upgradeMathSceneSpecV1ToPackageV3(scene, {
    brief: {
      ageBand: "secondary-14-16",
      courseGoal: "Connect unit-circle height to the sine graph.",
      evidenceLevel: "spec-only",
      invariants: [
        "The unit-circle ordinate equals sin(theta).",
        "The projected wave point keeps the same height."
      ],
      learnerAction: "Scrub theta and compare the linked points.",
      misconception: "The wave is the literal path travelled by the point on the circle.",
      singleLearningObjective: "Explain how circular height becomes y = sin(theta).",
      targetSurface: "teacher-authoring"
    },
    captions: [
      {
        beatId: canonicalMathSceneBeatId(0),
        beatIndex: 0,
        conceptId: "unit-circle",
        startSeconds: 0,
        endSeconds: 1.7,
        text: {
          en: "Build the unit circle.",
          zh: "建立單位圓。",
          zhHans: "建立单位圆。"
        }
      },
      {
        beatId: canonicalMathSceneBeatId(1),
        beatIndex: 1,
        conceptId: "sine-wave",
        startSeconds: 1.8,
        endSeconds: 3.9,
        text: {
          en: "Trace the matching height.",
          zh: "追蹤相同高度。",
          zhHans: "追踪相同高度。"
        }
      }
    ],
    exportProfiles: [
      {
        id: "browser-webm-720p",
        format: "webm",
        mimeType: "video/webm",
        width: 1280,
        height: 720,
        fps: 30,
        background: "#020617",
        transparent: false,
        captionPolicy: "both",
        audioPolicy: "include-if-attached"
      },
      {
        id: "local-mp4-720p",
        format: "mp4",
        mimeType: "video/mp4",
        width: 1280,
        height: 720,
        fps: 30,
        background: "#020617",
        transparent: false,
        captionPolicy: "both",
        audioPolicy: "include-if-attached"
      }
    ],
    localization: {
      defaultLocale: "en",
      labelStrategy: "trilingual-review",
      labels: {
        "phase-angle": { en: "angle", zh: "角度", zhHans: "角度" },
        "sine-wave": { en: "sine wave", zh: "正弦波", zhHans: "正弦波" },
        "unit-circle": { en: "unit circle", zh: "單位圓", zhHans: "单位圆" }
      }
    }
  });
}

export function createGoldenTrigVisualizationAuthoringState(
  ownerId: string,
  createId: () => string = () => globalThis.crypto.randomUUID()
): TeacherVisualizationAuthoringState {
  const initial: AuthoringSnapshot = {
    packageJson: createGoldenTrigVisualizationPackage(),
    status: "editing",
    title: "Unit circle to sine wave"
  };
  return {
    ...snapshot(initial),
    conflict: null,
    draftId: `local:${createId()}`,
    errorCode: null,
    history: [snapshot(initial)],
    historyIndex: 0,
    metadataDirty: true,
    ownerId,
    packageContentDirty: true,
    revision: 0,
    syncState: "dirty"
  };
}

export function createTeacherVisualizationAuthoringStateFromDraft(
  ownerId: string,
  draft: TeacherVisualizationDraftRecord
): TeacherVisualizationAuthoringState {
  if (draft.ownerId !== ownerId) throw new Error("Draft owner does not match the active teacher.");
  if (draft.status === "archived") throw new Error("Archived drafts cannot be opened for editing.");
  const initial: AuthoringSnapshot = {
    packageJson: clonePackage(draft.packageJson),
    status: draft.status,
    title: draft.title
  };
  return {
    ...snapshot(initial),
    conflict: null,
    draftId: draft.id,
    errorCode: null,
    history: [snapshot(initial)],
    historyIndex: 0,
    metadataDirty: false,
    ownerId,
    packageContentDirty: false,
    revision: draft.revision,
    syncState: "clean"
  };
}

export function createTeacherVisualizationAuthoringStateFromLocalRevision(
  ownerId: string,
  draftId: string,
  local: TeacherVisualizationLocalDraftRevision
): TeacherVisualizationAuthoringState {
  if (local.userId !== ownerId) throw new Error("Local draft owner does not match the active teacher.");
  if (local.draftId !== draftId) throw new Error("Local draft id does not match the requested draft.");
  const initial: AuthoringSnapshot = {
    packageJson: clonePackage(local.packageJson),
    status: local.status,
    title: local.title
  };
  return {
    ...snapshot(initial),
    conflict: null,
    draftId,
    errorCode: null,
    history: [snapshot(initial)],
    historyIndex: 0,
    metadataDirty: local.metadataDirty,
    ownerId,
    packageContentDirty: local.packageContentDirty,
    revision: local.baseRevision,
    syncState: local.dirty ? "dirty" : "clean"
  };
}

export function buildTeacherVisualizationLocalDraftRevision(
  state: TeacherVisualizationAuthoringState,
  savedAt = new Date().toISOString()
): TeacherVisualizationLocalDraftRevision {
  return {
    baseRevision: state.revision,
    dirty: state.syncState !== "clean",
    draftId: state.draftId,
    legacyDirtyDimensionsUnknown: false,
    metadataDirty: state.metadataDirty,
    packageContentDirty: state.packageContentDirty,
    packageJson: clonePackage(state.packageJson),
    revision: state.revision,
    savedAt,
    status: state.status,
    title: state.title,
    userId: state.ownerId
  };
}

export function buildTeacherVisualizationDraftPatch(state: TeacherVisualizationAuthoringState) {
  const patch: {
    baseRevision: number;
    draftId: string;
    packageJson?: MathScenePackageV3;
    status?: Exclude<TeacherVisualizationDraftStatus, "archived">;
    title?: string;
  } = {
    baseRevision: state.revision,
    draftId: state.draftId
  };
  if (state.packageContentDirty) {
    patch.packageJson = invalidateMathScenePackageEvidence(state.packageJson);
  }
  if (state.metadataDirty) {
    patch.status = state.status;
    patch.title = state.title;
  }
  return patch;
}

export function buildTeacherVisualizationCopyTitle(
  title: string,
  suffix: "conflict copy" | "recovered copy"
) {
  const suffixText = ` (${suffix})`;
  const base = title.trim() || "Untitled visualization";
  return `${base.slice(0, 160 - suffixText.length).trimEnd()}${suffixText}`;
}

export function captureTeacherVisualizationConflictOperationTarget(
  state: TeacherVisualizationAuthoringState | null,
  kind: TeacherVisualizationConflictOperationKind
): TeacherVisualizationConflictOperationTarget | null {
  if (!state?.conflict || state.syncState !== "conflict") return null;
  return {
    conflict: state.conflict,
    draftId: state.draftId,
    kind,
    revision: state.revision
  };
}

export function teacherVisualizationConflictOperationTargetMatches(
  target: TeacherVisualizationConflictOperationTarget,
  state: TeacherVisualizationAuthoringState | null
) {
  return Boolean(
    state
    && state.syncState === "conflict"
    && state.draftId === target.draftId
    && state.revision === target.revision
    && state.conflict === target.conflict
  );
}

export async function awaitTeacherVisualizationConflictOperationLease(input: {
  ensureLease: (draftId: string) => Promise<boolean>;
  readCurrentState: () => TeacherVisualizationAuthoringState | null;
  target: TeacherVisualizationConflictOperationTarget;
}) {
  if (!teacherVisualizationConflictOperationTargetMatches(input.target, input.readCurrentState())) return false;
  if (!await input.ensureLease(input.target.draftId)) return false;
  return teacherVisualizationConflictOperationTargetMatches(input.target, input.readCurrentState());
}

export function teacherVisualizationActionInvalidatesPackageValidation(
  action: TeacherVisualizationAuthoringAction
) {
  return [
    "redo",
    "replace-package",
    "set-audio",
    "set-brief-field",
    "set-invariants",
    "undo"
  ].includes(action.type);
}

export function applyTeacherVisualizationAuthoringAction(
  state: TeacherVisualizationAuthoringState,
  action: TeacherVisualizationAuthoringAction
): TeacherVisualizationAuthoringState {
  if (action.type === "set-title") {
    return pushEdit(state, { ...snapshot(state), title: action.title }, { metadataEdit: true });
  }
  if (action.type === "set-status") {
    return pushEdit(state, { ...snapshot(state), status: action.status }, { metadataEdit: true });
  }
  if (action.type === "replace-package") {
    return pushEdit(
      state,
      { ...snapshot(state), packageJson: clonePackage(action.packageJson) },
      { invalidatesPackageEvidence: true }
    );
  }
  if (action.type === "set-audio") {
    const packageJson = clonePackage(state.packageJson);
    packageJson.audio = structuredClone(action.audio);
    const next = {
      ...invalidateSnapshotPackageEvidence({ ...snapshot(state), packageJson }),
      status: "editing" as const
    };
    return {
      ...state,
      ...snapshot(next),
      conflict: null,
      errorCode: null,
      history: [snapshot(next)],
      historyIndex: 0,
      packageContentDirty: true,
      syncState: "dirty"
    };
  }
  if (action.type === "set-brief-field") {
    const packageJson = clonePackage(state.packageJson);
    Object.assign(packageJson.brief, { [action.field]: action.value });
    return pushEdit(state, { ...snapshot(state), packageJson }, { invalidatesPackageEvidence: true });
  }
  if (action.type === "set-invariants") {
    const packageJson = clonePackage(state.packageJson);
    packageJson.brief.invariants = [...action.invariants];
    return pushEdit(state, { ...snapshot(state), packageJson }, { invalidatesPackageEvidence: true });
  }
  if (action.type === "undo" || action.type === "redo") {
    const delta = action.type === "undo" ? -1 : 1;
    const historyIndex = Math.max(0, Math.min(state.history.length - 1, state.historyIndex + delta));
    const target = state.history[historyIndex];
    if (!target || historyIndex === state.historyIndex) return state;
    return {
      ...state,
      ...snapshot(target),
      conflict: null,
      errorCode: null,
      historyIndex,
      syncState: "dirty"
    };
  }
  if (action.type === "save-started") {
    if (state.syncState === "conflict") return state;
    return { ...state, errorCode: null, syncState: "saving" };
  }
  if (action.type === "save-failed") {
    return { ...state, errorCode: action.errorCode, syncState: "error" };
  }
  if (action.type === "save-conflict") {
    return {
      ...state,
      conflict: {
        choice: null,
        currentRevision: action.currentRevision,
        error: "revision-conflict",
        serverVersion: structuredClone(action.serverVersion)
      },
      errorCode: "revision-conflict",
      syncState: "conflict"
    };
  }
  if (action.type === "keep-local-conflict-copy") {
    if (!state.conflict || state.packageContentDirty) return state;
    const packageJson = clonePackage(state.conflict.serverVersion.packageJson);
    const rebased: AuthoringSnapshot = {
      packageJson,
      status: state.status,
      title: state.title
    };
    return {
      ...state,
      ...snapshot(rebased),
      conflict: null,
      errorCode: null,
      history: [snapshot(rebased)],
      historyIndex: 0,
      revision: state.conflict.currentRevision,
      syncState: "dirty"
    };
  }
  if (action.type === "adopt-server-conflict") {
    if (!state.conflict) return state;
    return createTeacherVisualizationAuthoringStateFromDraft(
      state.ownerId,
      state.conflict.serverVersion
    );
  }
  if (action.type === "save-succeeded" || action.type === "load-draft") {
    return createTeacherVisualizationAuthoringStateFromDraft(state.ownerId, action.draft);
  }
  return state;
}

function collectLeafHandoffPaths(value: unknown, path: string): string[] {
  if (Array.isArray(value)) {
    if (value.length === 0) return [path];
    return value.flatMap((entry, index) => collectLeafHandoffPaths(entry, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return [path];
    return entries.flatMap(([field, entry]) => collectLeafHandoffPaths(entry, `${path}.${field}`));
  }
  return [path];
}

const editableObjectFields = {
  axis3d: new Set(["conceptId", "range"]),
  parametricCurve: new Set(["colorRole", "conceptId"]),
  parametricSurface: new Set(["colorRole", "conceptId", "uRange", "vRange"]),
  movingPoint: new Set(["colorRole", "conceptId", "pathObjectId"]),
  trace: new Set(["colorRole", "durationSeconds", "sourceObjectId"]),
  vector: new Set(["colorRole", "conceptId", "from", "to"])
} as const satisfies Record<MathObjectSpec["type"], ReadonlySet<string>>;

const hiddenObjectStyleFields = [
  "antiAliasWidth",
  "baseNormal",
  "fillOpacity",
  "fillRole",
  "jointAngleDegrees",
  "strokeZoomBehavior",
  "strokeOpacity",
  "strokeRole",
  "strokeWidth"
] as const;
const hiddenObjectUniformFields = [
  "clippingPlanes",
  "fixedInFrame",
  "opacity",
  "shadeIn3D"
] as const;
const objectTypesWithStyle = new Set<MathObjectSpec["type"]>([
  "parametricCurve",
  "parametricSurface",
  "trace",
  "vector"
]);

function objectHandoffPaths(object: MathObjectSpec, index: number) {
  const objectPath = `scene.objects[${index}]`;
  const paths: string[] = [`${objectPath}.$remove`];
  const supported = editableObjectFields[object.type];
  for (const [field, value] of Object.entries(object)) {
    if (field === "type") {
      paths.push(`${objectPath}.type`);
      continue;
    }
    if (supported.has(field)) continue;
    const path = `${objectPath}.${field}`;
    if (field === "samples") paths.push(path);
    else paths.push(...collectLeafHandoffPaths(value, path));
  }
  for (const field of hiddenObjectUniformFields) {
    if (object.uniforms?.[field] === undefined) {
      paths.push(`${objectPath}.uniforms.${field}.$set`);
    }
  }
  if (object.uniforms?.clippingPlanes) {
    paths.push(`${objectPath}.uniforms.clippingPlanes.$add`);
    for (const [planeIndex] of object.uniforms.clippingPlanes.entries()) {
      paths.push(`${objectPath}.uniforms.clippingPlanes[${planeIndex}].$remove`);
    }
  }
  if (object.zIndex === undefined) paths.push(`${objectPath}.zIndex.$set`);
  if (objectTypesWithStyle.has(object.type)) {
    const style = "style" in object ? object.style : undefined;
    for (const field of hiddenObjectStyleFields) {
      if (style?.[field] === undefined) paths.push(`${objectPath}.style.${field}.$set`);
    }
  }
  return paths;
}

export function deriveTeacherVisualizationAuthoringProductStatus(
  packageJson: MathScenePackageV3,
  releaseEvidence: Omit<MathSceneV3ReleaseEvidence, "reviewLedger"> = {
    deployed: false,
    deploymentEvidenceIds: [],
    liveBrowserEvidenceIds: [],
    liveBrowserVerified: false,
    mergeEvidenceIds: [],
    merged: false
  }
) {
  return deriveMathSceneV3ReleaseStatus({
    ...releaseEvidence,
    reviewLedger: packageJson.reviewLedger
  });
}

export function analyzeTeacherVisualizationAuthoringCapability(
  packageJson: MathScenePackageV3
): TeacherVisualizationAuthoringCapability {
  const editableObjectCounts: Record<string, number> = {};
  const preservedHandoffPaths: string[] = [
    "captions.$add",
    "captions.$reorder",
    "exportProfiles.$add",
    "exportProfiles.$reorder",
    "localization.labels.$add",
    "scene.bindings.$add",
    "scene.bindings.$reorder",
    "scene.cameraShots.$add",
    "scene.cameraShots.$reorder",
    "scene.formulas.$add",
    "scene.formulas.$reorder",
    "scene.interactions",
    "scene.objects.$reorder",
    "scene.parameters.$add",
    "scene.parameters.$reorder",
    "scene.timeline.$reorder",
    "scene.valueTrackers.$add",
    "scene.valueTrackers.$reorder"
  ];
  for (const [index, object] of packageJson.scene.objects.entries()) {
    editableObjectCounts[object.type] = (editableObjectCounts[object.type] ?? 0) + 1;
    preservedHandoffPaths.push(...objectHandoffPaths(object, index));
  }

  for (const [index, formula] of packageJson.scene.formulas.entries()) {
    preservedHandoffPaths.push(
      `scene.formulas[${index}].$remove`,
      `scene.formulas[${index}].id`,
      `scene.formulas[${index}].tokens.$add`,
      `scene.formulas[${index}].tokens.$reorder`
    );
    for (const [tokenIndex] of formula.tokens.entries()) {
      preservedHandoffPaths.push(
        `scene.formulas[${index}].tokens[${tokenIndex}].$remove`,
        `scene.formulas[${index}].tokens[${tokenIndex}].conceptId`,
        `scene.formulas[${index}].tokens[${tokenIndex}].id`
      );
    }
  }

  for (const [index, binding] of packageJson.scene.bindings.entries()) {
    preservedHandoffPaths.push(`scene.bindings[${index}].$remove`);
    if (binding.anchorName !== undefined) {
      preservedHandoffPaths.push(`scene.bindings[${index}].anchorName`);
    } else {
      preservedHandoffPaths.push(`scene.bindings[${index}].anchorName.$set`);
    }
  }

  for (const [index, shot] of packageJson.scene.cameraShots.entries()) {
    preservedHandoffPaths.push(
      `scene.cameraShots[${index}].$remove`,
      `scene.cameraShots[${index}].id`
    );
    preservedHandoffPaths.push(shot.fov !== undefined
      ? `scene.cameraShots[${index}].fov`
      : `scene.cameraShots[${index}].fov.$set`);
  }

  for (const [index, parameter] of (packageJson.scene.parameters ?? []).entries()) {
    preservedHandoffPaths.push(`scene.parameters[${index}].$remove`);
    for (const [field, value] of Object.entries(parameter)) {
      if (field !== "value") {
        preservedHandoffPaths.push(...collectLeafHandoffPaths(value, `scene.parameters[${index}].${field}`));
      }
    }
    for (const field of ["conceptId", "max", "min"] as const) {
      if (parameter[field] === undefined) {
        preservedHandoffPaths.push(`scene.parameters[${index}].${field}.$set`);
      }
    }
  }

  for (const [index, tracker] of (packageJson.scene.valueTrackers ?? []).entries()) {
    preservedHandoffPaths.push(`scene.valueTrackers[${index}].$remove`);
    for (const [field, value] of Object.entries(tracker)) {
      preservedHandoffPaths.push(...collectLeafHandoffPaths(value, `scene.valueTrackers[${index}].${field}`));
    }
    for (const field of ["conceptId", "label", "max", "min"] as const) {
      if (tracker[field] === undefined) {
        preservedHandoffPaths.push(`scene.valueTrackers[${index}].${field}.$set`);
      }
    }
  }

  for (const [index] of packageJson.scene.timeline.entries()) {
    preservedHandoffPaths.push(`scene.timeline[${index}].$remove`);
  }
  for (const [index] of packageJson.captions.entries()) {
    preservedHandoffPaths.push(`captions[${index}].$remove`);
  }
  for (const [index, profile] of packageJson.exportProfiles.entries()) {
    preservedHandoffPaths.push(`exportProfiles[${index}].$remove`);
    preservedHandoffPaths.push(...collectLeafHandoffPaths(profile, `exportProfiles[${index}]`));
  }
  for (const conceptId of Object.keys(packageJson.localization.labels)) {
    preservedHandoffPaths.push(
      `localization.labels.${conceptId}.$remove`,
      `localization.labels.${conceptId}.$rename`
    );
  }
  preservedHandoffPaths.push("localization.defaultLocale", "localization.labelStrategy");

  preservedHandoffPaths.push(...collectLeafHandoffPaths(packageJson.scene.coordinateSpace, "scene.coordinateSpace"));
  preservedHandoffPaths.push(...collectLeafHandoffPaths(packageJson.scene.diagnostics, "scene.diagnostics"));
  preservedHandoffPaths.push("scene.familyId", "scene.sceneId");
  if (packageJson.scene.randomSeed !== undefined) {
    preservedHandoffPaths.push(...collectLeafHandoffPaths(packageJson.scene.randomSeed, "scene.randomSeed"));
  } else {
    preservedHandoffPaths.push("scene.randomSeed.$set");
  }
  for (const field of advancedSceneFields) {
    const value = packageJson.scene[field];
    if (value !== undefined) {
      preservedHandoffPaths.push(...collectLeafHandoffPaths(value, `scene.${field}`));
      if (Array.isArray(value)) {
        preservedHandoffPaths.push(`scene.${field}.$add`);
        preservedHandoffPaths.push(`scene.${field}.$reorder`);
        for (const [index] of value.entries()) preservedHandoffPaths.push(`scene.${field}[${index}].$remove`);
      }
    } else {
      preservedHandoffPaths.push(`scene.${field}.$set`);
    }
  }
  const preservedAdvancedFields = Object.keys(packageJson.scene)
    .filter((field) => (advancedSceneFields as readonly string[]).includes(field))
    .sort();
  const exactHandoffPaths = [...new Set(preservedHandoffPaths)].sort();
  return {
    code: "A06_EXTENSION_REQUIRED",
    editableAnimationStepCount: packageJson.scene.timeline.length,
    editableObjectCounts,
    preservedAdvancedFields,
    preservedHandoffPaths: exactHandoffPaths,
    previewMode: "existing-golden-only",
    webmExecutor: "not-connected"
  };
}
