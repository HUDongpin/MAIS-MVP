import { stableSerializeMathSceneSpec } from "./mathSceneExport";
import { threeDFamilyIds } from "../threeDSceneTypes";
import {
  emptyMathSceneV3ReviewLedger,
  mathSceneV3GateIds,
  type MathSceneV3ReviewLedger
} from "./mathSceneV3GateLedger";
import type { AnimationStep, MathObjectSpec, MathSceneSpec, Vec3 } from "./mathSceneTypes";

export const MATH_SCENE_PACKAGE_V3_SCHEMA_VERSION = "mais-manim-scene-package/v3" as const;
export const MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES = 1_048_576;
export const MATH_SCENE_PACKAGE_V3_MAX_COLLECTION_WIDTH = 10_000;
export const MATH_SCENE_PACKAGE_V3_MAX_CAPTION_CUES = 2_000;
export const MATH_SCENE_PACKAGE_V3_MAX_DURATION_SECONDS = 86_400;
export const MATH_SCENE_PACKAGE_V3_MAX_STRUCTURE_NODES = 100_000;

export const mathScenePackageV3Locales = ["en", "zh", "zhHans"] as const;
export type MathScenePackageV3Locale = (typeof mathScenePackageV3Locales)[number];

export type SceneBriefV3 = {
  ageBand: string;
  courseGoal: string;
  evidenceLevel:
    | "interactive-preview"
    | "mp4-ready"
    | "release-ready"
    | "spec-only"
    | "teaching-approved"
    | "webm-ready";
  invariants: string[];
  learnerAction: string;
  misconception: string;
  singleLearningObjective: string;
  targetSurface: string;
};

export type MathSceneLocalizedText = Record<MathScenePackageV3Locale, string>;

export type MathScenePackageV3Localization = {
  defaultLocale: MathScenePackageV3Locale;
  labelStrategy: "locale-first-with-bilingual-fallback" | "side-by-side-bilingual" | "trilingual-review";
  labels: Record<string, MathSceneLocalizedText>;
};

export type MathSceneCaptionCue = {
  beatId: string;
  beatIndex: number;
  conceptId: string;
  endSeconds: number;
  startSeconds: number;
  text: MathSceneLocalizedText;
};

export type MathSceneLocalAudioMetadata =
  | { source: "none" }
  | {
      contentHash: `sha256-${string}`;
      durationSeconds: number;
      fileName: string;
      mimeType: "audio/mp4" | "audio/mpeg" | "audio/ogg" | "audio/wav" | "audio/webm";
      source: "local-file" | "microphone";
    };

export type MathSceneExportProfileV3 = {
  audioPolicy: "include-if-attached" | "omit";
  background: string;
  captionPolicy: "both" | "burn-in" | "none" | "sidecar";
  format: "mp4" | "webm";
  fps: number;
  height: number;
  id: string;
  mimeType: "video/mp4" | "video/webm" | "video/webm;codecs=vp8" | "video/webm;codecs=vp9";
  transparent: boolean;
  width: number;
};

export type MathScenePackageV3 = {
  audio: MathSceneLocalAudioMetadata;
  brief: SceneBriefV3;
  captions: MathSceneCaptionCue[];
  exportProfiles: MathSceneExportProfileV3[];
  localization: MathScenePackageV3Localization;
  reviewLedger: MathSceneV3ReviewLedger;
  scene: MathSceneSpec;
  schemaVersion: typeof MATH_SCENE_PACKAGE_V3_SCHEMA_VERSION;
};

export type MathScenePackageV3UpgradeOptions = {
  audio?: MathSceneLocalAudioMetadata;
  brief?: SceneBriefV3;
  captions?: MathSceneCaptionCue[];
  exportProfiles?: MathSceneExportProfileV3[];
  localization?: MathScenePackageV3Localization;
  reviewLedger?: MathSceneV3ReviewLedger;
};

export type MathScenePackageV3ValidationErrorCode =
  | "AUDIO_METADATA_INVALID"
  | "BINDING_CONCEPT_MISMATCH"
  | "CAPTION_BEAT_INVALID"
  | "CAPTION_OVERLAP"
  | "CAPTION_TIME_INVALID"
  | "DUPLICATE_ID"
  | "EXPORT_PROFILE_INVALID"
  | "GATE_LEDGER_INVALID"
  | "INVALID_JSON"
  | "INVALID_PACKAGE"
  | "NUMBER_INVALID"
  | "PACKAGE_TOO_LARGE"
  | "RANGE_INVALID"
  | "REFERENCE_NOT_FOUND"
  | "SCHEMA_VERSION_INVALID"
  | "SURFACE_GRID_INVALID"
  | "TOKEN_FORMULA_MISMATCH"
  | "UNKNOWN_FIELD";

export type MathScenePackageV3ValidationError = {
  code: MathScenePackageV3ValidationErrorCode;
  message: string;
  path: string;
};

export type MathScenePackageV3ValidationResult =
  | { ok: true; value: MathScenePackageV3 }
  | { errors: MathScenePackageV3ValidationError[]; ok: false };

const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const unsafeExternalTextPattern = /(?:\b[A-Za-z][A-Za-z0-9+.-]*:\/\/|(?:^|[\s("'`])\/\/[A-Za-z0-9\[]|\bwww\.|\b(?:import|require)\s*\()/i;
const unsafeFilePathTextPattern = /(?:^|[\s("'`])(?:\.\.?[\\/][A-Za-z0-9_.-]+(?:[\\/][A-Za-z0-9_.-]+)*|\/(?:Users|Volumes|etc|home|private|tmp|var)(?:\/[A-Za-z0-9_.-]+)*|[A-Za-z]:\\[A-Za-z0-9_.-]+(?:\\[A-Za-z0-9_.-]+)*|\\\\[A-Za-z0-9_.-]+\\[A-Za-z0-9_.-]+(?:\\[A-Za-z0-9_.-]+)*|[A-Za-z0-9_.-]+[\\/][A-Za-z0-9_.-]+\.(?:c?js|json|mjs|mts|tsx?|yaml|yml))(?:$|[\s).,"'`])/i;
const audioMimeTypes = new Set(["audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm"]);
const anchorNames = new Set([
  "back", "bottom", "center", "front", "left", "lowerLeft", "lowerRight", "right", "top", "upperLeft", "upperRight"
]);
const easingNames = new Set(["linear", "smooth"]);
const canonicalThreeDFamilyIds = new Set<string>(threeDFamilyIds);
const MATH_SCENE_PACKAGE_V3_MAX_ERRORS = 128;
const MATH_SCENE_PACKAGE_V3_MAX_PROSE_LENGTH = 4_096;
const MATH_SCENE_PACKAGE_V3_MAX_SCENE_ENTRIES = 512;
const MATH_SCENE_PACKAGE_V3_MAX_TIMELINE_STEPS = 1_024;
const MATH_SCENE_PACKAGE_V3_MAX_CURVE_SAMPLES = 4_096;
const MATH_SCENE_PACKAGE_V3_MAX_SURFACE_CELLS = 16_384;
const MATH_SCENE_PACKAGE_V3_MAX_GRID_AXIS_STEPS = 64;
const MATH_SCENE_PACKAGE_V3_MAX_STREAM_SEEDS = 256;
const MATH_SCENE_PACKAGE_V3_MAX_STREAM_WORK = 131_072;
const MATH_SCENE_PACKAGE_V3_MAX_DERIVED_RUNTIME_OBJECTS = 8_192;
const MATH_SCENE_PACKAGE_V3_MAX_STREAM_GENERATED_SAMPLES = 250_000;
const MATH_SCENE_PACKAGE_V3_MAX_ODE_STEPS = 16_384;
const sceneRootKeys = new Set([
  "alwaysMethodUpdaters", "alwaysRedraw", "animationCompositions", "animationPlans", "bindings", "cameraShots",
  "cameraUpdaters", "coordinateSpace", "diagnostics", "familyId", "formulaSvgMorphs", "formulas",
  "matchingTransforms", "objects", "odeTrajectories", "parameters", "randomSeed", "renderGroups", "sceneId",
  "soundCues", "streamLines", "timeline", "valueTrackers", "vectorFields", "vectorFieldUpdaters"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && identifierPattern.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isIntegerInRange(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && typeof value === "number" && value >= min && value <= max;
}

function safeIntegerProduct(values: readonly number[]) {
  let product = 1;
  for (const value of values) {
    if (!Number.isSafeInteger(value) || value < 0) return undefined;
    if (value !== 0 && product > Number.MAX_SAFE_INTEGER / value) return undefined;
    product *= value;
  }
  return product;
}

function containsUnsafeExternalLocator(value: string) {
  if (unsafeExternalTextPattern.test(value)) return true;
  const unslashedScheme = /(^|[^A-Za-z0-9+.-])([A-Za-z][A-Za-z0-9+.-]*):(\S)/g;
  for (const match of value.matchAll(unslashedScheme)) {
    const [, prefix, scheme, payloadStart] = match;
    // Preserve authored LaTeX labels such as L:\\vec and \\Pi:\\vec. Windows
    // drive paths remain rejected by the field-aware filesystem detector.
    if (
      (scheme.length === 1 && ["\\", "(", "[", "{"].includes(payloadStart)) ||
      (payloadStart === "\\" && prefix === "\\")
    ) continue;
    return true;
  }
  return false;
}

function utf8ByteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function cloneScene(scene: MathSceneSpec): MathSceneSpec {
  return JSON.parse(stableSerializeMathSceneSpec(scene)) as MathSceneSpec;
}

export function canonicalMathSceneBeatId(beatIndex: number) {
  return `beat-${beatIndex + 1}`;
}

function defaultBrief(scene: MathSceneSpec): SceneBriefV3 {
  return {
    ageBand: "needs-confirmation",
    courseGoal: `Confirm the bounded course goal for ${scene.sceneId}.`,
    evidenceLevel: "spec-only",
    invariants: ["Confirm the mathematical invariant before implementation."],
    learnerAction: "Confirm one observable learner action.",
    misconception: "Confirm one misconception to address.",
    singleLearningObjective: "Confirm one learning objective.",
    targetSurface: "teacher-authoring"
  };
}

function defaultLocalization(): MathScenePackageV3Localization {
  return {
    defaultLocale: "en",
    labelStrategy: "trilingual-review",
    labels: {}
  };
}

export function upgradeMathSceneSpecV1ToPackageV3(
  scene: MathSceneSpec,
  options: MathScenePackageV3UpgradeOptions = {}
): MathScenePackageV3 {
  return {
    audio: options.audio ? structuredClone(options.audio) : { source: "none" },
    brief: options.brief ? structuredClone(options.brief) : defaultBrief(scene),
    captions: options.captions ? structuredClone(options.captions) : [],
    exportProfiles: options.exportProfiles ? structuredClone(options.exportProfiles) : [],
    localization: options.localization ? structuredClone(options.localization) : defaultLocalization(),
    reviewLedger: options.reviewLedger ? structuredClone(options.reviewLedger) : emptyMathSceneV3ReviewLedger(),
    scene: cloneScene(scene),
    schemaVersion: MATH_SCENE_PACKAGE_V3_SCHEMA_VERSION
  };
}

class ValidationContext {
  readonly errors: MathScenePackageV3ValidationError[] = [];

  add(code: MathScenePackageV3ValidationErrorCode, path: string, message: string) {
    if (this.errors.length >= MATH_SCENE_PACKAGE_V3_MAX_ERRORS) return;
    const boundedPath = boundedSingleLineDiagnostic(path);
    const boundedMessage = boundedSingleLineDiagnostic(message);
    if (this.errors.some((error) => error.code === code && error.path === boundedPath && error.message === boundedMessage)) return;
    this.errors.push({ code, message: boundedMessage, path: boundedPath });
  }

  exactKeys(
    value: Record<string, unknown>,
    allowed: readonly string[],
    required: readonly string[],
    path: string,
    code: MathScenePackageV3ValidationErrorCode = "UNKNOWN_FIELD"
  ) {
    const allowedSet = new Set(allowed);
    for (const key of Object.keys(value).sort()) {
      if (!allowedSet.has(key)) {
        const keyLabel = boundedDiagnosticKey(key);
        this.add(code, `${path}${diagnosticPathSegment(key)}`, `Field ${keyLabel} is not allowed.`);
      }
    }
    for (const key of required) {
      if (!(key in value)) this.add("INVALID_PACKAGE", `${path}.${key}`, `Required field ${key} is missing.`);
    }
  }
}

function boundedSingleLineDiagnostic(value: string, maxLength = 512) {
  const escaped = value.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, (character) =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
  if (escaped.length <= maxLength) return escaped;
  return `${escaped.slice(0, maxLength - 14)}...[truncated]`;
}

function boundedDiagnosticKey(key: string) {
  const bounded = key.length <= 96 ? key : `${key.slice(0, 82)}...[truncated]`;
  return JSON.stringify(bounded);
}

function diagnosticPathSegment(key: string) {
  return /^[A-Za-z_$][A-Za-z0-9_$]{0,95}$/.test(key) ? `.${key}` : `[${boundedDiagnosticKey(key)}]`;
}

type JsonSnapshotTask = {
  assign: (value: unknown) => void;
  depth: number;
  path: string;
  source: unknown;
};

type JsonSnapshotResult =
  | { ok: false }
  | { ok: true; snapshot: unknown };

function materializeJsonSnapshot(value: unknown, context: ValidationContext): JsonSnapshotResult {
  const root: { value?: unknown } = {};
  const stack: JsonSnapshotTask[] = [{
    assign: (snapshot) => { root.value = snapshot; },
    depth: 0,
    path: "$",
    source: value
  }];
  const seen = new WeakSet<object>();
  let nodeCount = 0;

  try {
    while (stack.length > 0) {
      const entry = stack.pop()!;
      nodeCount += 1;
      if (nodeCount > MATH_SCENE_PACKAGE_V3_MAX_STRUCTURE_NODES || entry.depth > 80) {
        context.add("INVALID_PACKAGE", entry.path, "Package node budget or depth limit was exceeded.");
        return { ok: false };
      }
      if (
        typeof entry.source === "function" ||
        typeof entry.source === "symbol" ||
        typeof entry.source === "bigint" ||
        entry.source === undefined
      ) {
        context.add("INVALID_PACKAGE", entry.path, "Only JSON data values are allowed.");
        return { ok: false };
      }
      if (typeof entry.source === "number" && !Number.isFinite(entry.source)) {
        context.add("NUMBER_INVALID", entry.path, "Only finite JSON numbers are allowed.");
        return { ok: false };
      }
      if (!entry.source || typeof entry.source !== "object") {
        entry.assign(entry.source);
        continue;
      }
      if (seen.has(entry.source)) {
        context.add("INVALID_PACKAGE", entry.path, "Cyclic or aliased object data is not allowed.");
        return { ok: false };
      }
      seen.add(entry.source);

      const arraySource = Array.isArray(entry.source);
      const prototype = Object.getPrototypeOf(entry.source);
      if ((arraySource && prototype !== Array.prototype) || (!arraySource && prototype !== Object.prototype && prototype !== null)) {
        context.add("INVALID_PACKAGE", entry.path, "Only plain JSON objects and arrays are allowed.");
        return { ok: false };
      }

      if (arraySource) {
        const lengthDescriptor = Object.getOwnPropertyDescriptor(entry.source, "length");
        const length = lengthDescriptor && "value" in lengthDescriptor ? lengthDescriptor.value : undefined;
        if (!Number.isSafeInteger(length) || length < 0 || length > MATH_SCENE_PACKAGE_V3_MAX_COLLECTION_WIDTH) {
          context.add("INVALID_PACKAGE", entry.path, "Array collection width exceeds the safe collection width limit.");
          return { ok: false };
        }
        const ownKeys = Reflect.ownKeys(entry.source);
        if (ownKeys.some((key) => typeof key === "symbol") || ownKeys.length !== length + 1) {
          context.add("INVALID_PACKAGE", entry.path, "Arrays cannot contain holes, symbols, or extra own properties.");
          return { ok: false };
        }
        if (nodeCount + stack.length + length > MATH_SCENE_PACKAGE_V3_MAX_STRUCTURE_NODES) {
          context.add("INVALID_PACKAGE", entry.path, "Package node budget would be exceeded before expanding this array.");
          return { ok: false };
        }
        const snapshot: unknown[] = new Array(length);
        entry.assign(snapshot);
        for (let index = length - 1; index >= 0; index -= 1) {
          const descriptor = Object.getOwnPropertyDescriptor(entry.source, String(index));
          if (!descriptor || !("value" in descriptor) || !descriptor.enumerable || descriptor.get || descriptor.set) {
            context.add("INVALID_PACKAGE", entry.path, "Arrays cannot contain holes or accessor elements.");
            return { ok: false };
          }
          stack.push({
            assign: (child) => { snapshot[index] = child; },
            depth: entry.depth + 1,
            path: `${entry.path}[${index}]`,
            source: descriptor.value
          });
        }
        continue;
      }

      const ownKeys = Reflect.ownKeys(entry.source);
      if (ownKeys.length > MATH_SCENE_PACKAGE_V3_MAX_COLLECTION_WIDTH) {
        context.add("INVALID_PACKAGE", entry.path, "Object collection width exceeds the safe collection width limit.");
        return { ok: false };
      }
      if (ownKeys.some((key) => typeof key === "symbol")) {
        context.add("INVALID_PACKAGE", entry.path, "Symbol properties are not allowed in Scene Package data.");
        return { ok: false };
      }
      if (nodeCount + stack.length + ownKeys.length > MATH_SCENE_PACKAGE_V3_MAX_STRUCTURE_NODES) {
        context.add("INVALID_PACKAGE", entry.path, "Package node budget would be exceeded before expanding this object.");
        return { ok: false };
      }
      const snapshot = Object.create(null) as Record<string, unknown>;
      entry.assign(snapshot);
      for (let index = ownKeys.length - 1; index >= 0; index -= 1) {
        const key = ownKeys[index] as string;
        const descriptor = Object.getOwnPropertyDescriptor(entry.source, key);
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable || descriptor.get || descriptor.set) {
          context.add("INVALID_PACKAGE", `${entry.path}${diagnosticPathSegment(key)}`, "Accessor and non-enumerable properties are not allowed.");
          return { ok: false };
        }
        stack.push({
          assign: (child) => { snapshot[key] = child; },
          depth: entry.depth + 1,
          path: `${entry.path}${diagnosticPathSegment(key)}`,
          source: descriptor.value
        });
      }
    }
  } catch {
    context.add("INVALID_PACKAGE", "$", "Scene Package reflection failed closed; Proxy input is not accepted.");
    return { ok: false };
  }

  try {
    if (typeof structuredClone === "function") structuredClone(value);
  } catch {
    context.add("INVALID_PACKAGE", "$", "Scene Package cannot contain Proxy or uncloneable input.");
    return { ok: false };
  }
  return { ok: true, snapshot: root.value };
}

function validateCloudSafePayload(value: unknown, context: ValidationContext) {
  const forbiddenKeys = new Set([
    "arrayBuffer", "blob", "blobUrl", "byteArray", "bytes", "code", "data", "dataUrl", "executable",
    "filePath", "functionBody", "href", "module", "modulePath", "script", "src", "url"
  ]);
  const executableString = /(?:=>|\bfunction\s*\(|\bnew\s+Function\s*\(|\beval\s*\()/i;
  const stack: Array<{ path: string; value: unknown }> = [{ path: "$", value }];
  let nodes = 0;

  while (stack.length > 0) {
    const entry = stack.pop()!;
    nodes += 1;
    if (nodes > MATH_SCENE_PACKAGE_V3_MAX_STRUCTURE_NODES) {
      context.add("INVALID_PACKAGE", entry.path, "Package exceeds cloud-safe inspection limits.");
      return;
    }
    if (
      typeof entry.value === "string" &&
      ((!isIdentifier(entry.value) && containsUnsafeExternalLocator(entry.value)) || executableString.test(entry.value))
    ) {
      context.add("INVALID_PACKAGE", entry.path, "Remote URLs and executable-shaped strings are not allowed in a Scene Package.");
      continue;
    }
    if (!entry.value || typeof entry.value !== "object") continue;
    const arrayValue = Array.isArray(entry.value) ? entry.value : undefined;
    const objectValue = arrayValue ? undefined : entry.value as Record<string, unknown>;
    const keys = arrayValue ? undefined : Object.keys(objectValue!);
    const childCount = arrayValue?.length ?? keys!.length;
    if (nodes + stack.length + childCount > MATH_SCENE_PACKAGE_V3_MAX_STRUCTURE_NODES) {
      context.add("INVALID_PACKAGE", entry.path, "Cloud-safe node budget would be exceeded before expanding this collection.");
      return;
    }
    for (let index = childCount - 1; index >= 0; index -= 1) {
      const key = arrayValue ? String(index) : keys![index];
      const child = arrayValue ? arrayValue[index] : objectValue![key];
      const childPath = arrayValue ? `${entry.path}[${key}]` : `${entry.path}${diagnosticPathSegment(key)}`;
      if (forbiddenKeys.has(key) && entry.path !== "$.localization.labels") {
        context.add("UNKNOWN_FIELD", childPath, `Cloud Scene Packages cannot contain ${key}.`);
      }
      stack.push({ path: childPath, value: child });
    }
  }
}

function validateProse(value: unknown, path: string, context: ValidationContext) {
  if (!isNonEmptyString(value) || value.length > MATH_SCENE_PACKAGE_V3_MAX_PROSE_LENGTH) {
    context.add("INVALID_PACKAGE", path, "A non-empty bounded text value is required.");
    return;
  }
  if (containsUnsafeExternalLocator(value)) {
    context.add("INVALID_PACKAGE", path, "External URLs or executable module expressions are not allowed.");
  }
  if (unsafeFilePathTextPattern.test(value)) {
    context.add("INVALID_PACKAGE", path, "Filesystem and module paths are not allowed in prose fields.");
  }
}

function validateLatex(value: unknown, path: string, context: ValidationContext) {
  if (!isNonEmptyString(value) || value.length > MATH_SCENE_PACKAGE_V3_MAX_PROSE_LENGTH) {
    context.add("INVALID_PACKAGE", path, "A non-empty bounded LaTeX value is required.");
    return;
  }
  const trimmed = value.trim();
  if (containsUnsafeExternalLocator(value)) {
    context.add("INVALID_PACKAGE", path, "External URLs or executable module expressions are not allowed.");
  }
  if (
    /^(?:\.\.?[\\/]|\/(?:Users|Volumes|etc|home|private|tmp|var)(?:[\\/]|$)|[A-Za-z]:\\|\\\\[^\\])/i.test(trimmed)
  ) {
    context.add("INVALID_PACKAGE", path, "Filesystem and module paths are not allowed in LaTeX fields.");
  }
}

function validateIdentifier(value: unknown, path: string, context: ValidationContext) {
  if (!isIdentifier(value)) context.add("INVALID_PACKAGE", path, "A bounded identifier is required.");
}

function validateFiniteNumber(value: unknown, path: string, context: ValidationContext) {
  if (!isFiniteNumber(value)) context.add("NUMBER_INVALID", path, "A finite number is required.");
}

function validateBusinessArrayLimit(
  value: unknown[],
  path: string,
  max: number,
  context: ValidationContext,
  label: string
) {
  if (value.length <= max) return true;
  context.add("INVALID_PACKAGE", path, `${label} exceeds the bounded business array limit of ${max}.`);
  return false;
}

function safeExportMilliseconds(value: unknown) {
  if (!isFiniteNumber(value) || value < 0 || value > MATH_SCENE_PACKAGE_V3_MAX_DURATION_SECONDS) return undefined;
  const milliseconds = Math.round(value * 1_000);
  return Number.isSafeInteger(milliseconds) ? milliseconds : undefined;
}

function validateVec3(value: unknown, path: string, context: ValidationContext): value is Vec3 {
  if (!Array.isArray(value) || value.length !== 3) {
    context.add("NUMBER_INVALID", path, "A three-number vector is required.");
    return false;
  }
  value.forEach((entry, index) => validateFiniteNumber(entry, `${path}[${index}]`, context));
  return value.every(isFiniteNumber);
}

function validateRange(value: unknown, path: string, context: ValidationContext) {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(isFiniteNumber)) {
    context.add("RANGE_INVALID", path, "A finite two-number range is required.");
    return;
  }
  if (value[0] >= value[1]) context.add("RANGE_INVALID", path, "Range minimum must be below maximum.");
}

function validateAxisRange(value: unknown, path: string, context: ValidationContext) {
  if (!isRecord(value)) {
    context.add("RANGE_INVALID", path, "An axis range object is required.");
    return;
  }
  context.exactKeys(value, ["x", "y", "z"], ["x", "y", "z"], path);
  validateRange(value.x, `${path}.x`, context);
  validateRange(value.y, `${path}.y`, context);
  validateRange(value.z, `${path}.z`, context);
}

function validateBrief(value: unknown, context: ValidationContext) {
  const path = "$.brief";
  if (!isRecord(value)) {
    context.add("INVALID_PACKAGE", path, "A structured bounded brief is required.");
    return;
  }
  const keys = [
    "ageBand", "courseGoal", "evidenceLevel", "invariants", "learnerAction", "misconception",
    "singleLearningObjective", "targetSurface"
  ];
  context.exactKeys(value, keys, keys, path);
  for (const key of ["ageBand", "courseGoal", "learnerAction", "misconception", "singleLearningObjective", "targetSurface"]) {
    validateProse(value[key], `${path}.${key}`, context);
  }
  const levels = new Set([
    "interactive-preview", "mp4-ready", "release-ready", "spec-only",
    "teaching-approved", "webm-ready"
  ]);
  if (!levels.has(String(value.evidenceLevel))) {
    context.add("INVALID_PACKAGE", `${path}.evidenceLevel`, "Evidence level is not supported.");
  }
  if (!Array.isArray(value.invariants) || value.invariants.length === 0 || value.invariants.length > 20) {
    context.add("INVALID_PACKAGE", `${path}.invariants`, "One to twenty invariants are required.");
  } else {
    value.invariants.forEach((invariant, index) => validateProse(invariant, `${path}.invariants[${index}]`, context));
  }
}

function validateLocalizedText(value: unknown, path: string, context: ValidationContext) {
  if (!isRecord(value)) {
    context.add("INVALID_PACKAGE", path, "English, Traditional Chinese, and Simplified Chinese text is required.");
    return;
  }
  context.exactKeys(value, [...mathScenePackageV3Locales], [...mathScenePackageV3Locales], path);
  mathScenePackageV3Locales.forEach((locale) => validateProse(value[locale], `${path}.${locale}`, context));
}

function validateLocalization(value: unknown, context: ValidationContext) {
  const path = "$.localization";
  if (!isRecord(value)) {
    context.add("INVALID_PACKAGE", path, "Localization settings are required.");
    return;
  }
  context.exactKeys(value, ["defaultLocale", "labelStrategy", "labels"], ["defaultLocale", "labelStrategy", "labels"], path);
  if (!mathScenePackageV3Locales.includes(value.defaultLocale as MathScenePackageV3Locale)) {
    context.add("INVALID_PACKAGE", `${path}.defaultLocale`, "Default locale is not supported.");
  }
  if (!["locale-first-with-bilingual-fallback", "side-by-side-bilingual", "trilingual-review"].includes(String(value.labelStrategy))) {
    context.add("INVALID_PACKAGE", `${path}.labelStrategy`, "Label strategy is not supported.");
  }
  if (!isRecord(value.labels)) {
    context.add("INVALID_PACKAGE", `${path}.labels`, "Labels must be an object keyed by concept identifier.");
  } else {
    const labelEntries = Object.entries(value.labels);
    if (labelEntries.length > MATH_SCENE_PACKAGE_V3_MAX_SCENE_ENTRIES) {
      context.add("INVALID_PACKAGE", `${path}.labels`, "Localization labels exceed the bounded business entry limit.");
      return;
    }
    for (const [conceptId, text] of labelEntries) {
      validateIdentifier(conceptId, `${path}.labels.${conceptId}`, context);
      validateLocalizedText(text, `${path}.labels.${conceptId}`, context);
    }
  }
}

function validateLocalizationConceptReferences(
  value: unknown,
  conceptIds: Set<string>,
  context: ValidationContext
) {
  if (!isRecord(value) || !isRecord(value.labels)) return;
  for (const conceptId of Object.keys(value.labels)) {
    if (!conceptIds.has(conceptId)) {
      context.add(
        "REFERENCE_NOT_FOUND",
        `$.localization.labels.${conceptId}`,
        `Localization label concept ${conceptId} does not exist in the scene.`
      );
    }
  }
}

function validateStyle(value: unknown, path: string, context: ValidationContext) {
  if (value === undefined) return;
  if (!isRecord(value)) {
    context.add("INVALID_PACKAGE", path, "Style must be a plain object.");
    return;
  }
  const keys = [
    "antiAliasWidth", "baseNormal", "fillOpacity", "fillRole", "jointAngleDegrees", "strokeZoomBehavior",
    "strokeOpacity", "strokeRole", "strokeWidth"
  ];
  context.exactKeys(value, keys, [], path);
  for (const key of ["antiAliasWidth", "fillOpacity", "jointAngleDegrees", "strokeOpacity", "strokeWidth"]) {
    if (value[key] !== undefined) validateFiniteNumber(value[key], `${path}.${key}`, context);
  }
  if (value.baseNormal !== undefined) validateVec3(value.baseNormal, `${path}.baseNormal`, context);
  if (value.strokeZoomBehavior !== undefined && !["screen-space", "world-space"].includes(String(value.strokeZoomBehavior))) {
    context.add("INVALID_PACKAGE", `${path}.strokeZoomBehavior`, "Stroke zoom behavior is invalid.");
  }
  for (const key of ["fillRole", "strokeRole"]) {
    if (value[key] !== undefined) validateRole(value[key], `${path}.${key}`, context);
  }
}

function validateUniforms(value: unknown, path: string, context: ValidationContext) {
  if (value === undefined) return;
  if (!isRecord(value)) {
    context.add("INVALID_PACKAGE", path, "Uniforms must be a plain object.");
    return;
  }
  context.exactKeys(value, ["clippingPlanes", "fixedInFrame", "opacity", "shadeIn3D"], [], path);
  if (value.opacity !== undefined) validateFiniteNumber(value.opacity, `${path}.opacity`, context);
  for (const key of ["fixedInFrame", "shadeIn3D"]) {
    if (value[key] !== undefined && typeof value[key] !== "boolean") context.add("INVALID_PACKAGE", `${path}.${key}`, "Boolean required.");
  }
  if (value.clippingPlanes !== undefined) {
    if (!Array.isArray(value.clippingPlanes)) context.add("INVALID_PACKAGE", `${path}.clippingPlanes`, "Clipping planes must be an array.");
    else value.clippingPlanes.forEach((plane, index) => {
      const planePath = `${path}.clippingPlanes[${index}]`;
      if (!isRecord(plane)) return context.add("INVALID_PACKAGE", planePath, "Clipping plane must be an object.");
      context.exactKeys(plane, ["constant", "normal"], ["constant", "normal"], planePath);
      validateFiniteNumber(plane.constant, `${planePath}.constant`, context);
      validateVec3(plane.normal, `${planePath}.normal`, context);
    });
  }
}

function validateObjects(value: unknown, context: ValidationContext) {
  const path = "$.scene.objects";
  const objectIds = new MathSceneObjectReferenceSet();
  if (!Array.isArray(value) || value.length === 0) {
    context.add("INVALID_PACKAGE", path, "At least one math object is required.");
    return objectIds;
  }
  if (!validateBusinessArrayLimit(value, path, MATH_SCENE_PACKAGE_V3_MAX_SCENE_ENTRIES, context, "Math object list")) {
    return objectIds;
  }

  value.forEach((entry, index) => {
    const objectPath = `${path}[${index}]`;
    if (!isRecord(entry)) return context.add("INVALID_PACKAGE", objectPath, "Math object must be an object.");
    const common = ["type", "id", "conceptId", "uniforms", "zIndex"];
    const type = entry.type;
    const variantKeys: Record<string, string[]> = {
      axis3d: [...common, "range"],
      movingPoint: [...common, "pathObjectId", "colorRole"],
      parametricCurve: [...common, "samples", "colorRole", "style"],
      parametricSurface: [...common, "samples", "uRange", "vRange", "colorRole", "style"],
      trace: [...common, "sourceObjectId", "durationSeconds", "colorRole", "style"],
      vector: [...common, "from", "to", "colorRole", "style"]
    };
    if (typeof type !== "string" || !(type in variantKeys)) {
      context.add("INVALID_PACKAGE", `${objectPath}.type`, "Math object type is not supported.");
      return;
    }
    const requiredByType: Record<string, string[]> = {
      axis3d: ["type", "id", "range"],
      movingPoint: ["type", "id", "pathObjectId", "colorRole", "conceptId"],
      parametricCurve: ["type", "id", "samples", "colorRole", "conceptId"],
      parametricSurface: ["type", "id", "samples", "uRange", "vRange", "colorRole", "conceptId"],
      trace: ["type", "id", "sourceObjectId", "durationSeconds", "colorRole"],
      vector: ["type", "id", "from", "to", "colorRole", "conceptId"]
    };
    context.exactKeys(entry, variantKeys[type], requiredByType[type], objectPath);
    validateIdentifier(entry.id, `${objectPath}.id`, context);
    if (isIdentifier(entry.id)) {
      if (objectIds.has(entry.id)) context.add("DUPLICATE_ID", `${objectPath}.id`, `Duplicate object id ${entry.id}.`);
      objectIds.add(entry.id);
    }
    if (entry.conceptId !== undefined) validateIdentifier(entry.conceptId, `${objectPath}.conceptId`, context);
    if (entry.zIndex !== undefined) validateFiniteNumber(entry.zIndex, `${objectPath}.zIndex`, context);
    validateStyle(entry.style, `${objectPath}.style`, context);
    validateUniforms(entry.uniforms, `${objectPath}.uniforms`, context);

    if (type === "axis3d") validateAxisRange(entry.range, `${objectPath}.range`, context);
    if (type === "parametricCurve") {
      if (
        !Array.isArray(entry.samples) ||
        entry.samples.length < 2 ||
        entry.samples.length > MATH_SCENE_PACKAGE_V3_MAX_CURVE_SAMPLES
      ) context.add("INVALID_PACKAGE", `${objectPath}.samples`, "Curve needs a bounded sample list.");
      else entry.samples.forEach((sample, sampleIndex) => validateVec3(sample, `${objectPath}.samples[${sampleIndex}]`, context));
    }
    if (type === "parametricSurface") {
      validateRange(entry.uRange, `${objectPath}.uRange`, context);
      validateRange(entry.vRange, `${objectPath}.vRange`, context);
      if (!Array.isArray(entry.samples) || entry.samples.length === 0 || !entry.samples.every(Array.isArray)) {
        context.add("SURFACE_GRID_INVALID", `${objectPath}.samples`, "Surface samples must be a rectangular grid.");
      } else {
        const width = (entry.samples[0] as unknown[]).length;
        const gridInvalid =
          width === 0 ||
          entry.samples.length * width > MATH_SCENE_PACKAGE_V3_MAX_SURFACE_CELLS ||
          entry.samples.some((row) => (row as unknown[]).length !== width);
        if (gridInvalid) {
          context.add("SURFACE_GRID_INVALID", `${objectPath}.samples`, "Surface sample rows must have equal non-zero length.");
        } else {
          entry.samples.forEach((row, rowIndex) => (row as unknown[]).forEach((sample, columnIndex) =>
            validateVec3(sample, `${objectPath}.samples[${rowIndex}][${columnIndex}]`, context)
          ));
        }
      }
    }
    if (type === "vector") {
      validateVec3(entry.from, `${objectPath}.from`, context);
      validateVec3(entry.to, `${objectPath}.to`, context);
    }
    if (type === "trace") validateFiniteNumber(entry.durationSeconds, `${objectPath}.durationSeconds`, context);
    for (const key of ["pathObjectId", "sourceObjectId"]) {
      if (entry[key] !== undefined && !isNonEmptyString(entry[key])) context.add("INVALID_PACKAGE", `${objectPath}.${key}`, "Non-empty text required.");
    }
    if (entry.colorRole !== undefined) validateRole(entry.colorRole, `${objectPath}.colorRole`, context);
  });

  return objectIds;
}

class MathSceneObjectReferenceSet extends Set<string> {
  readonly #indexedRuntimeRanges: Array<{ count: number; prefix: string; source: string; suffix: string }> = [];
  #remainingDerivedRuntimeObjects = MATH_SCENE_PACKAGE_V3_MAX_DERIVED_RUNTIME_OBJECTS;
  #derivedRuntimeObjectBudgetReported = false;

  #reserveDerivedRuntimeObjects(count: number, path: string, source: string, context: ValidationContext) {
    if (
      !Number.isSafeInteger(count) ||
      count <= 0 ||
      count > this.#remainingDerivedRuntimeObjects
    ) {
      if (!this.#derivedRuntimeObjectBudgetReported) {
        context.add("RANGE_INVALID", path, `Runtime objects from ${source} exceed the aggregate derived-object budget.`);
        this.#derivedRuntimeObjectBudgetReported = true;
      }
      this.#remainingDerivedRuntimeObjects = 0;
      return false;
    }
    this.#remainingDerivedRuntimeObjects -= count;
    return true;
  }

  addDerived(id: string, path: string, source: string, context: ValidationContext) {
    if (!isIdentifier(id)) {
      context.add("INVALID_PACKAGE", path, `Runtime object id from ${source} exceeds the bounded identifier contract.`);
      return;
    }
    if (this.has(id)) {
      context.add("DUPLICATE_ID", path, `Runtime object id ${id} from ${source} collides with an existing runtime object.`);
      return;
    }
    if (!this.#reserveDerivedRuntimeObjects(1, path, source, context)) return;
    super.add(id);
  }

  addIndexedRuntimeRange(
    prefix: string,
    suffix: string,
    count: number,
    path: string,
    source: string,
    context: ValidationContext
  ) {
    if (!Number.isSafeInteger(count) || count <= 0) return;
    const maximumId = `${prefix}${count - 1}${suffix}`;
    if (!isIdentifier(maximumId)) {
      context.add("INVALID_PACKAGE", path, `Indexed runtime object ids from ${source} exceed the bounded identifier contract.`);
      return;
    }
    const range = { count, prefix, source, suffix };
    for (const id of this) {
      if (this.#matchesRange(id, range)) {
        context.add("DUPLICATE_ID", path, `Runtime object range from ${source} collides with existing runtime object id ${id}.`);
        break;
      }
    }
    if (this.#indexedRuntimeRanges.some((existing) =>
      existing.prefix === prefix && existing.suffix === suffix && Math.min(existing.count, count) > 0
    )) {
      context.add("DUPLICATE_ID", path, `Runtime object range from ${source} collides with another indexed runtime range.`);
    }
    if (!this.#reserveDerivedRuntimeObjects(count, path, source, context)) return;
    this.#indexedRuntimeRanges.push(range);
  }

  override has(value: string) {
    if (super.has(value)) return true;
    return this.#indexedRuntimeRanges.some((range) => this.#matchesRange(value, range));
  }

  #matchesRange(value: string, range: { count: number; prefix: string; suffix: string }) {
    if (!value.startsWith(range.prefix) || !value.endsWith(range.suffix)) return false;
    const end = range.suffix.length === 0 ? value.length : value.length - range.suffix.length;
    const indexText = value.slice(range.prefix.length, end);
    if (!/^(?:0|[1-9][0-9]*)$/.test(indexText)) return false;
    const index = Number(indexText);
    return Number.isSafeInteger(index) && index >= 0 && index < range.count;
  }
}

function addLegalRuntimeDerivedObjectIds(
  scene: Record<string, unknown>,
  objectIds: MathSceneObjectReferenceSet,
  context: ValidationContext
) {
  if (Array.isArray(scene.animationPlans)) {
    scene.animationPlans.forEach((plan, planIndex) => {
      if (
        isRecord(plan) &&
        isIdentifier(plan.objectId) &&
        objectIds.has(plan.objectId) &&
        plan.targetObjectId === `${plan.objectId}:attention-target`
      ) {
        objectIds.addDerived(
          plan.targetObjectId,
          `$.scene.animationPlans[${planIndex}].targetObjectId`,
          `attention target for ${plan.objectId}`,
          context
        );
      }
    });
  }
  if (Array.isArray(scene.odeTrajectories)) {
    scene.odeTrajectories.forEach((trajectory, trajectoryIndex) => {
      if (!isRecord(trajectory) || !isIdentifier(trajectory.id)) return;
      for (const suffix of ["current-state", "trace-tail", "trajectory-path"]) {
        objectIds.addDerived(
          `${trajectory.id}:${suffix}`,
          `$.scene.odeTrajectories[${trajectoryIndex}].id`,
          `ODE trajectory ${trajectory.id}`,
          context
        );
      }
    });
  }
  if (Array.isArray(scene.streamLines)) {
    scene.streamLines.forEach((streamLine, streamLineIndex) => {
      if (
        !isRecord(streamLine) ||
        !isIdentifier(streamLine.id) ||
        !Number.isSafeInteger(streamLine.xSteps) ||
        !Number.isSafeInteger(streamLine.ySteps) ||
        (streamLine.xSteps as number) <= 0 ||
        (streamLine.ySteps as number) <= 0
      ) return;
      const derivedCount = safeIntegerProduct([
        streamLine.xSteps as number,
        streamLine.ySteps as number
      ]);
      if (derivedCount === undefined || derivedCount <= 0) {
        context.add("RANGE_INVALID", `$.scene.streamLines[${streamLineIndex}].id`, "Stream-line runtime object count cannot be represented safely.");
        return;
      }
      objectIds.addIndexedRuntimeRange(
        `${streamLine.id}:line-`,
        "",
        derivedCount,
        `$.scene.streamLines[${streamLineIndex}].id`,
        `stream-line set ${streamLine.id}`,
        context
      );
    });
  }
  if (Array.isArray(scene.vectorFields)) {
    scene.vectorFields.forEach((field, fieldIndex) => {
      if (
        !isRecord(field) ||
        !isIdentifier(field.id) ||
        !Number.isSafeInteger(field.xSteps) ||
        !Number.isSafeInteger(field.ySteps) ||
        (field.xSteps as number) <= 0 ||
        (field.ySteps as number) <= 0
      ) return;
      const derivedCount = safeIntegerProduct([
        field.xSteps as number,
        field.ySteps as number
      ]);
      if (derivedCount === undefined || derivedCount <= 0) {
        context.add("RANGE_INVALID", `$.scene.vectorFields[${fieldIndex}].id`, "Vector-field runtime object count cannot be represented safely.");
        return;
      }
      objectIds.addIndexedRuntimeRange(
        `${field.id}:sample-`,
        ":arrow",
        derivedCount,
        `$.scene.vectorFields[${fieldIndex}].id`,
        `vector field ${field.id}`,
        context
      );
    });
  }
}

function validateFormulas(value: unknown, context: ValidationContext) {
  const formulaIds = new Set<string>();
  const tokenIds = new Set<string>();
  const tokensByFormula = new Map<string, Set<string>>();
  if (!Array.isArray(value)) {
    context.add("INVALID_PACKAGE", "$.scene.formulas", "Formula list is required.");
    return { formulaIds, tokenIds, tokensByFormula };
  }
  if (!validateBusinessArrayLimit(value, "$.scene.formulas", MATH_SCENE_PACKAGE_V3_MAX_SCENE_ENTRIES, context, "Formula list")) {
    return { formulaIds, tokenIds, tokensByFormula };
  }
  value.forEach((formula, formulaIndex) => {
    const path = `$.scene.formulas[${formulaIndex}]`;
    if (!isRecord(formula)) return context.add("INVALID_PACKAGE", path, "Formula must be an object.");
    context.exactKeys(formula, ["id", "latex", "tokens"], ["id", "latex", "tokens"], path);
    validateIdentifier(formula.id, `${path}.id`, context);
    if (isIdentifier(formula.id)) {
      if (formulaIds.has(formula.id)) context.add("DUPLICATE_ID", `${path}.id`, `Duplicate formula id ${formula.id}.`);
      formulaIds.add(formula.id);
    }
    validateLatex(formula.latex, `${path}.latex`, context);
    const ownedTokens = new Set<string>();
    if (!Array.isArray(formula.tokens)) context.add("INVALID_PACKAGE", `${path}.tokens`, "Formula tokens must be an array.");
    else if (validateBusinessArrayLimit(formula.tokens, `${path}.tokens`, MATH_SCENE_PACKAGE_V3_MAX_SCENE_ENTRIES, context, "Formula token list")) formula.tokens.forEach((token, tokenIndex) => {
      const tokenPath = `${path}.tokens[${tokenIndex}]`;
      if (!isRecord(token)) return context.add("INVALID_PACKAGE", tokenPath, "Formula token must be an object.");
      context.exactKeys(token, ["conceptId", "id", "text"], ["conceptId", "id", "text"], tokenPath);
      validateIdentifier(token.id, `${tokenPath}.id`, context);
      validateIdentifier(token.conceptId, `${tokenPath}.conceptId`, context);
      validateProse(token.text, `${tokenPath}.text`, context);
      if (isIdentifier(token.id)) {
        if (tokenIds.has(token.id)) context.add("DUPLICATE_ID", `${tokenPath}.id`, `Duplicate formula token id ${token.id}.`);
        tokenIds.add(token.id);
        ownedTokens.add(token.id);
      }
    });
    if (isIdentifier(formula.id)) tokensByFormula.set(formula.id, ownedTokens);
  });
  return { formulaIds, tokenIds, tokensByFormula };
}

function validateTrackers(
  scene: Record<string, unknown>,
  objectIds: MathSceneObjectReferenceSet,
  context: ValidationContext
) {
  const trackerIds = new Set<string>();
  const trackerSources = new Map<string, string>();
  const registerRuntimeTracker = (id: string, path: string, source: string) => {
    if (!isIdentifier(id)) {
      context.add("INVALID_PACKAGE", path, `Runtime tracker id from ${source} exceeds the bounded identifier contract.`);
      return;
    }
    const previous = trackerSources.get(id);
    if (previous !== undefined) {
      context.add("DUPLICATE_ID", path, `Runtime tracker id ${id} collides with ${previous}.`);
    } else {
      trackerSources.set(id, source);
    }
    trackerIds.add(id);
  };
  registerRuntimeTracker("timeline", "$.scene.timeline", "the canonical timeline tracker");
  registerRuntimeTracker("timeline:progress", "$.scene.timeline", "the canonical timeline progress tracker");
  const authoredIds = {
    parameter: new Set<string>(),
    tracker: new Set<string>()
  };
  const validateEntries = (value: unknown, path: string, kind: "parameter" | "tracker") => {
    if (value === undefined) return;
    if (!Array.isArray(value)) return context.add("INVALID_PACKAGE", path, `${kind} list must be an array.`);
    if (!validateBusinessArrayLimit(value, path, MATH_SCENE_PACKAGE_V3_MAX_SCENE_ENTRIES, context, `${kind} list`)) return;
    value.forEach((entry, index) => {
      const entryPath = `${path}[${index}]`;
      if (!isRecord(entry)) return context.add("INVALID_PACKAGE", entryPath, `${kind} must be an object.`);
      const allowed = kind === "parameter"
        ? ["conceptId", "id", "label", "max", "min", "role", "value"]
        : ["conceptId", "id", "label", "max", "min", "value"];
      const required = kind === "parameter" ? ["id", "label", "role", "value"] : ["id", "value"];
      context.exactKeys(entry, allowed, required, entryPath);
      validateIdentifier(entry.id, `${entryPath}.id`, context);
      if (isIdentifier(entry.id)) {
        if (authoredIds[kind].has(entry.id)) context.add("DUPLICATE_ID", `${entryPath}.id`, `Duplicate ${kind} id ${entry.id}.`);
        authoredIds[kind].add(entry.id);
        registerRuntimeTracker(
          kind === "parameter" ? `parameter:${entry.id}` : entry.id,
          `${entryPath}.id`,
          `${kind} ${entry.id}`
        );
      }
      validateFiniteNumber(entry.value, `${entryPath}.value`, context);
      if (entry.min !== undefined) validateFiniteNumber(entry.min, `${entryPath}.min`, context);
      if (entry.max !== undefined) validateFiniteNumber(entry.max, `${entryPath}.max`, context);
      if (isFiniteNumber(entry.min) && isFiniteNumber(entry.max) && entry.min > entry.max) context.add("RANGE_INVALID", entryPath, "Minimum exceeds maximum.");
      if (isFiniteNumber(entry.value) && isFiniteNumber(entry.min) && entry.value < entry.min) context.add("RANGE_INVALID", `${entryPath}.value`, "Value is below minimum.");
      if (isFiniteNumber(entry.value) && isFiniteNumber(entry.max) && entry.value > entry.max) context.add("RANGE_INVALID", `${entryPath}.value`, "Value is above maximum.");
      if (kind === "parameter" && !["control", "derived", "timeline"].includes(String(entry.role))) context.add("INVALID_PACKAGE", `${entryPath}.role`, "Parameter role is invalid.");
      if (entry.label !== undefined) validateProse(entry.label, `${entryPath}.label`, context);
      if (entry.conceptId !== undefined) validateIdentifier(entry.conceptId, `${entryPath}.conceptId`, context);
    });
  };
  validateEntries(scene.parameters, "$.scene.parameters", "parameter");
  validateEntries(scene.valueTrackers, "$.scene.valueTrackers", "tracker");

  const animatedObjectIds = new Set<string>();
  if (Array.isArray(scene.objects)) {
    scene.objects.forEach((object) => {
      if (
        isRecord(object) &&
        isIdentifier(object.id) &&
        ["movingPoint", "parametricCurve", "parametricSurface"].includes(String(object.type))
      ) animatedObjectIds.add(object.id);
    });
  }
  if (Array.isArray(scene.timeline)) {
    const objectProgressStepTypes = new Set([
      "fadeInObject", "fadeOutObject", "growFromCenter", "moveAlongPath", "revealCurve", "revealSurface", "transformObject"
    ]);
    scene.timeline.forEach((step) => {
      if (
        isRecord(step) &&
        objectProgressStepTypes.has(String(step.type)) &&
        isIdentifier(step.objectId) &&
        objectIds.has(step.objectId)
      ) animatedObjectIds.add(step.objectId);
    });
  }
  animatedObjectIds.forEach((objectId) => registerRuntimeTracker(
    `${objectId}:progress`,
    "$.scene.timeline",
    `animated object ${objectId}`
  ));
  return trackerIds;
}

function validateCameraShots(value: unknown, context: ValidationContext) {
  const shotIds = new Set<string>();
  if (!Array.isArray(value) || value.length === 0) {
    context.add("INVALID_PACKAGE", "$.scene.cameraShots", "At least one camera shot is required.");
    return shotIds;
  }
  if (!validateBusinessArrayLimit(value, "$.scene.cameraShots", 128, context, "Camera shot list")) return shotIds;
  value.forEach((shot, index) => {
    const path = `$.scene.cameraShots[${index}]`;
    if (!isRecord(shot)) return context.add("INVALID_PACKAGE", path, "Camera shot must be an object.");
    context.exactKeys(shot, ["fov", "id", "position", "target"], ["id", "position", "target"], path);
    validateIdentifier(shot.id, `${path}.id`, context);
    if (isIdentifier(shot.id)) {
      if (shotIds.has(shot.id)) context.add("DUPLICATE_ID", `${path}.id`, `Duplicate shot id ${shot.id}.`);
      shotIds.add(shot.id);
    }
    validateVec3(shot.position, `${path}.position`, context);
    validateVec3(shot.target, `${path}.target`, context);
    if (shot.fov !== undefined) validateFiniteNumber(shot.fov, `${path}.fov`, context);
  });
  return shotIds;
}

function validateBindings(
  value: unknown,
  objectIds: Set<string>,
  formulaIds: Set<string>,
  tokensByFormula: Map<string, Set<string>>,
  context: ValidationContext
) {
  if (!Array.isArray(value)) return context.add("INVALID_PACKAGE", "$.scene.bindings", "Formula bindings must be an array.");
  if (!validateBusinessArrayLimit(value, "$.scene.bindings", 2_048, context, "Formula binding list")) return;
  value.forEach((binding, index) => {
    const path = `$.scene.bindings[${index}]`;
    if (!isRecord(binding)) return context.add("INVALID_PACKAGE", path, "Formula binding must be an object.");
    context.exactKeys(binding, ["anchorName", "conceptId", "formulaId", "objectId", "tokenId"], ["conceptId", "formulaId", "objectId", "tokenId"], path);
    ["conceptId", "formulaId", "objectId", "tokenId"].forEach((key) => validateIdentifier(binding[key], `${path}.${key}`, context));
    if (binding.anchorName !== undefined && !anchorNames.has(String(binding.anchorName))) context.add("INVALID_PACKAGE", `${path}.anchorName`, "Anchor name is invalid.");
    if (isIdentifier(binding.objectId) && !objectIds.has(binding.objectId)) context.add("REFERENCE_NOT_FOUND", `${path}.objectId`, `Object ${binding.objectId} does not exist.`);
    if (isIdentifier(binding.formulaId) && !formulaIds.has(binding.formulaId)) context.add("REFERENCE_NOT_FOUND", `${path}.formulaId`, `Formula ${binding.formulaId} does not exist.`);
    if (isIdentifier(binding.formulaId) && isIdentifier(binding.tokenId) && !tokensByFormula.get(binding.formulaId)?.has(binding.tokenId)) {
      context.add("TOKEN_FORMULA_MISMATCH", `${path}.tokenId`, `Token ${binding.tokenId} does not belong to formula ${binding.formulaId}.`);
    }
  });
}

function validateBindingConceptConsistency(
  scene: Record<string, unknown>,
  context: ValidationContext
) {
  if (!Array.isArray(scene.bindings) || !Array.isArray(scene.objects) || !Array.isArray(scene.formulas)) return;
  const objectConcepts = new Map<string, string>();
  scene.objects.forEach((object) => {
    if (isRecord(object) && isIdentifier(object.id) && isIdentifier(object.conceptId)) {
      objectConcepts.set(object.id, object.conceptId);
    }
  });
  const tokenConcepts = new Map<string, string>();
  scene.formulas.forEach((formula) => {
    if (!isRecord(formula) || !isIdentifier(formula.id) || !Array.isArray(formula.tokens)) return;
    formula.tokens.forEach((token) => {
      if (isRecord(token) && isIdentifier(token.id) && isIdentifier(token.conceptId)) {
        tokenConcepts.set(`${formula.id}:${token.id}`, token.conceptId);
      }
    });
  });

  scene.bindings.forEach((binding, index) => {
    if (!isRecord(binding) || !isIdentifier(binding.conceptId)) return;
    const path = `$.scene.bindings[${index}].conceptId`;
    const objectConcept = isIdentifier(binding.objectId) ? objectConcepts.get(binding.objectId) : undefined;
    const tokenConcept = isIdentifier(binding.formulaId) && isIdentifier(binding.tokenId)
      ? tokenConcepts.get(`${binding.formulaId}:${binding.tokenId}`)
      : undefined;
    if (objectConcept !== undefined && objectConcept !== binding.conceptId) {
      context.add("BINDING_CONCEPT_MISMATCH", path, "Binding concept must match its referenced math object concept.");
    }
    if (tokenConcept !== undefined && tokenConcept !== binding.conceptId) {
      context.add("BINDING_CONCEPT_MISMATCH", path, "Binding concept must match its referenced formula token concept.");
    }
  });
}

function validatePathSpec(value: unknown, path: string, context: ValidationContext) {
  if (value === undefined) return;
  if (!isRecord(value)) return context.add("INVALID_PACKAGE", path, "Animation path must be an object.");
  if (value.type === "straight") context.exactKeys(value, ["type"], ["type"], path);
  else if (value.type === "arc") {
    context.exactKeys(value, ["angleRadians", "axis", "type"], ["angleRadians", "type"], path);
    validateFiniteNumber(value.angleRadians, `${path}.angleRadians`, context);
    if (value.axis !== undefined) validateVec3(value.axis, `${path}.axis`, context);
  } else context.add("INVALID_PACKAGE", `${path}.type`, "Animation path type is invalid.");
}

function validateBoolean(value: unknown, path: string, context: ValidationContext) {
  if (typeof value !== "boolean") context.add("INVALID_PACKAGE", path, "A boolean value is required.");
}

function validateNumberRange(
  value: unknown,
  min: number,
  max: number,
  path: string,
  context: ValidationContext
) {
  validateFiniteNumber(value, path, context);
  if (isFiniteNumber(value) && (value < min || value > max)) {
    context.add("RANGE_INVALID", path, `Number must be from ${min} to ${max}.`);
  }
}

function validateRole(value: unknown, path: string, context: ValidationContext) {
  if (!isNonEmptyString(value) || value.length > 128 || containsUnsafeExternalLocator(value) || unsafeFilePathTextPattern.test(value)) {
    context.add("INVALID_PACKAGE", path, "A bounded local visual role is required.");
  }
}

function validateEdgeFrame(value: unknown, path: string, context: ValidationContext) {
  if (!isRecord(value)) {
    context.add("INVALID_PACKAGE", path, "Edge frame must be an object.");
    return;
  }
  context.exactKeys(value, ["max", "min"], ["max", "min"], path);
  const minValid = validateVec3(value.min, `${path}.min`, context);
  const maxValid = validateVec3(value.max, `${path}.max`, context);
  if (minValid && maxValid) {
    const min = value.min as Vec3;
    const max = value.max as Vec3;
    if (min.some((entry, index) => entry > max[index])) {
      context.add("RANGE_INVALID", path, "Edge frame minimum cannot exceed maximum.");
    }
  }
}

function validateOptionalVec3Field(
  value: Record<string, unknown>,
  key: string,
  path: string,
  context: ValidationContext
) {
  if (value[key] !== undefined) validateVec3(value[key], `${path}.${key}`, context);
}

function validateOptionalBooleanField(
  value: Record<string, unknown>,
  key: string,
  path: string,
  context: ValidationContext
) {
  if (value[key] !== undefined) validateBoolean(value[key], `${path}.${key}`, context);
}

function validateStaticStyleFields(value: Record<string, unknown>, path: string, context: ValidationContext) {
  for (const key of ["antiAliasWidth", "jointAngleDegrees", "strokeWidth"]) {
    if (value[key] !== undefined) validateFiniteNumber(value[key], `${path}.${key}`, context);
  }
  for (const key of ["fillOpacity", "strokeOpacity"]) {
    if (value[key] !== undefined) validateNumberRange(value[key], 0, 1, `${path}.${key}`, context);
  }
  if (isFiniteNumber(value.antiAliasWidth) && value.antiAliasWidth < 0) context.add("RANGE_INVALID", `${path}.antiAliasWidth`, "Anti-alias width cannot be negative.");
  if (isFiniteNumber(value.strokeWidth) && value.strokeWidth < 0) context.add("RANGE_INVALID", `${path}.strokeWidth`, "Stroke width cannot be negative.");
  if (value.baseNormal !== undefined) validateVec3(value.baseNormal, `${path}.baseNormal`, context);
  for (const key of ["fillRole", "strokeRole"]) if (value[key] !== undefined) validateRole(value[key], `${path}.${key}`, context);
  if (value.strokeZoomBehavior !== undefined && !["screen-space", "world-space"].includes(String(value.strokeZoomBehavior))) {
    context.add("INVALID_PACKAGE", `${path}.strokeZoomBehavior`, "Stroke zoom behavior is invalid.");
  }
}

function validateMathSceneAnimateOperation(
  value: unknown,
  path: string,
  objectIds: Set<string>,
  context: ValidationContext
) {
  if (!isRecord(value) || !isNonEmptyString(value.type)) {
    context.add("INVALID_PACKAGE", path, "Animation operation must be a typed object.");
    return;
  }
  const styleKeys = [
    "antiAliasWidth", "baseNormal", "fillOpacity", "fillRole", "jointAngleDegrees", "strokeOpacity",
    "strokeRole", "strokeWidth", "strokeZoomBehavior"
  ];
  const variants: Record<string, { allowed: string[]; required: string[] }> = {
    alignTo: { allowed: ["direction", "targetObjectId", "type"], required: ["targetObjectId", "type"] },
    center: { allowed: ["type"], required: ["type"] },
    matchDepth: { allowed: ["aboutPoint", "stretch", "targetObjectId", "type"], required: ["targetObjectId", "type"] },
    matchHeight: { allowed: ["aboutPoint", "stretch", "targetObjectId", "type"], required: ["targetObjectId", "type"] },
    matchWidth: { allowed: ["aboutPoint", "stretch", "targetObjectId", "type"], required: ["targetObjectId", "type"] },
    matchX: { allowed: ["targetObjectId", "type"], required: ["targetObjectId", "type"] },
    matchY: { allowed: ["targetObjectId", "type"], required: ["targetObjectId", "type"] },
    matchZ: { allowed: ["targetObjectId", "type"], required: ["targetObjectId", "type"] },
    moveTo: { allowed: ["point", "type"], required: ["point", "type"] },
    nextTo: { allowed: ["buff", "direction", "targetObjectId", "type"], required: ["targetObjectId", "type"] },
    rotate: { allowed: ["aboutPoint", "angleRadians", "axis", "type"], required: ["angleRadians", "type"] },
    scale: { allowed: ["aboutPoint", "factor", "type"], required: ["factor", "type"] },
    setColorRole: { allowed: ["colorRole", "type"], required: ["colorRole", "type"] },
    setDepth: { allowed: ["aboutPoint", "depth", "stretch", "type"], required: ["depth", "type"] },
    setFill: { allowed: ["fillOpacity", "fillRole", "type"], required: ["type"] },
    setHeight: { allowed: ["aboutPoint", "height", "stretch", "type"], required: ["height", "type"] },
    setOpacity: { allowed: ["opacity", "type"], required: ["opacity", "type"] },
    setStroke: { allowed: ["strokeOpacity", "strokeRole", "strokeWidth", "type"], required: ["type"] },
    setStyle: { allowed: ["type", ...styleKeys], required: ["type"] },
    setWidth: { allowed: ["aboutPoint", "stretch", "type", "width"], required: ["type", "width"] },
    setX: { allowed: ["coordinate", "type"], required: ["coordinate", "type"] },
    setY: { allowed: ["coordinate", "type"], required: ["coordinate", "type"] },
    setZ: { allowed: ["coordinate", "type"], required: ["coordinate", "type"] },
    shift: { allowed: ["type", "vector"], required: ["type", "vector"] },
    toCorner: { allowed: ["buff", "direction", "frame", "type"], required: ["direction", "type"] },
    toEdge: { allowed: ["buff", "direction", "frame", "type"], required: ["direction", "type"] }
  };
  const variant = variants[value.type];
  if (!variant) {
    context.add("INVALID_PACKAGE", `${path}.type`, "Animation operation type is not supported.");
    return;
  }
  context.exactKeys(value, variant.allowed, variant.required, path);

  if (value.targetObjectId !== undefined) {
    validateIdentifier(value.targetObjectId, `${path}.targetObjectId`, context);
    if (isIdentifier(value.targetObjectId) && !objectIds.has(value.targetObjectId)) {
      context.add("REFERENCE_NOT_FOUND", `${path}.targetObjectId`, `Object ${value.targetObjectId} does not exist.`);
    }
  }
  for (const key of ["aboutPoint", "direction", "point", "vector"]) validateOptionalVec3Field(value, key, path, context);
  for (const key of ["stretch"]) validateOptionalBooleanField(value, key, path, context);
  for (const key of ["angleRadians", "coordinate", "jointAngleDegrees"]) {
    if (value[key] !== undefined) validateFiniteNumber(value[key], `${path}.${key}`, context);
  }
  for (const key of ["buff", "depth", "height", "strokeWidth", "width"]) {
    if (value[key] !== undefined) validateNumberRange(value[key], 0, Number.MAX_VALUE, `${path}.${key}`, context);
  }
  if (value.factor !== undefined) validateNumberRange(value.factor, Number.MIN_VALUE, Number.MAX_VALUE, `${path}.factor`, context);
  for (const key of ["fillOpacity", "opacity", "strokeOpacity"]) {
    if (value[key] !== undefined) validateNumberRange(value[key], 0, 1, `${path}.${key}`, context);
  }
  for (const key of ["colorRole", "fillRole", "strokeRole"]) if (value[key] !== undefined) validateRole(value[key], `${path}.${key}`, context);
  if (value.axis !== undefined && !["x", "y", "z"].includes(String(value.axis))) context.add("INVALID_PACKAGE", `${path}.axis`, "Rotation axis is invalid.");
  if (value.frame !== undefined) validateEdgeFrame(value.frame, `${path}.frame`, context);
  if (value.type === "setStyle") validateStaticStyleFields(value, path, context);
  if (value.type === "setFill") atLeastOnePresent(value, ["fillOpacity", "fillRole"], path, context);
  if (value.type === "setStroke") atLeastOnePresent(value, ["strokeOpacity", "strokeRole", "strokeWidth"], path, context);
  if (value.type === "setStyle") atLeastOnePresent(value, styleKeys, path, context);
}

function validateSvgPathData(value: unknown, path: string, context: ValidationContext) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 65_536 ||
    !/^[Mm](?:[\s,0-9.+\-eE]|[MmZzLlHhVvCcSsQqTtAa])*$/.test(value.trim())
  ) {
    context.add("INVALID_PACKAGE", path, "Formula morph path must be bounded SVG path data beginning with M or m.");
  }
}

function validateTimeline(
  value: unknown,
  references: {
    compositionIds: Set<string>;
    conceptIds: Set<string>;
    objectIds: Set<string>;
    shotIds: Set<string>;
    tokenIds: Set<string>;
    trackerIds: Set<string>;
  },
  context: ValidationContext
) {
  if (!Array.isArray(value) || value.length === 0) {
    context.add("INVALID_PACKAGE", "$.scene.timeline", "At least one timeline beat is required.");
    return [] as AnimationStep[];
  }
  if (!validateBusinessArrayLimit(value, "$.scene.timeline", MATH_SCENE_PACKAGE_V3_MAX_TIMELINE_STEPS, context, "Timeline")) {
    return [] as AnimationStep[];
  }
  let totalDuration = 0;
  value.forEach((step, index) => {
    const path = `$.scene.timeline[${index}]`;
    if (!isRecord(step) || !isNonEmptyString(step.type)) return context.add("INVALID_PACKAGE", path, "Timeline step type is required.");
    const base = ["type", "duration"];
    const variants: Record<string, { allowed: string[]; required: string[] }> = {
      animationComposition: {
        allowed: [...base, "compositionId"],
        required: [...base, "compositionId"]
      },
      animateTracker: {
        allowed: [...base, "trackerId", "targetValue", "easing"],
        required: [...base, "trackerId", "targetValue", "easing"]
      },
      cameraTo: {
        allowed: [...base, "shotId"],
        required: [...base, "shotId"]
      },
      fadeInObject: {
        allowed: [...base, "objectId", "easing"],
        required: [...base, "objectId", "easing"]
      },
      fadeOutObject: {
        allowed: [...base, "objectId", "easing"],
        required: [...base, "objectId", "easing"]
      },
      growFromCenter: {
        allowed: [...base, "objectId", "easing"],
        required: [...base, "objectId", "easing"]
      },
      highlight: {
        allowed: [...base, "conceptId"],
        required: [...base, "conceptId"]
      },
      moveAlongPath: {
        allowed: [...base, "objectId", "pathObjectId"],
        required: [...base, "objectId", "pathObjectId"]
      },
      revealCurve: {
        allowed: [...base, "objectId", "easing"],
        required: [...base, "objectId", "easing"]
      },
      revealSurface: {
        allowed: [...base, "objectId", "easing"],
        required: [...base, "objectId", "easing"]
      },
      sweepParameter: {
        allowed: [...base, "trackerId", "targetValue", "easing", "conceptId", "formulaTokenIds", "fromValue"],
        required: [...base, "trackerId", "targetValue", "easing"]
      },
      transformObject: {
        allowed: [...base, "objectId", "targetObjectId", "lagRatio", "path"],
        required: [...base, "objectId", "targetObjectId"]
      },
      wait: {
        allowed: [...base, "holdOnWait", "ignorePresenterMode", "maxTime", "note", "presenterMode", "presenterReleaseAfterFrames", "stopConditionId", "stopConditionSatisfiedAt"],
        required: base
      }
    };
    const variant = variants[step.type];
    if (!variant) return context.add("INVALID_PACKAGE", `${path}.type`, "Timeline step type is not supported.");
    context.exactKeys(step, variant.allowed, variant.required, path);
    validateFiniteNumber(step.duration, `${path}.duration`, context);
    if (isFiniteNumber(step.duration) && step.duration < 0) context.add("RANGE_INVALID", `${path}.duration`, "Duration cannot be negative.");
    if (isFiniteNumber(step.duration)) {
      if (safeExportMilliseconds(step.duration) === undefined) {
        context.add("RANGE_INVALID", `${path}.duration`, "Duration exceeds the safe export millisecond range.");
      }
      totalDuration += Math.max(0, step.duration);
    }
    if (step.easing !== undefined && !easingNames.has(String(step.easing))) context.add("INVALID_PACKAGE", `${path}.easing`, "Easing is invalid.");
    for (const key of ["targetValue", "fromValue", "lagRatio", "maxTime", "stopConditionSatisfiedAt"]) {
      if (step[key] !== undefined) validateFiniteNumber(step[key], `${path}.${key}`, context);
    }
    if (isFiniteNumber(step.lagRatio) && (step.lagRatio < 0 || step.lagRatio > 1)) context.add("RANGE_INVALID", `${path}.lagRatio`, "Lag ratio must be from zero to one.");
    if (step.objectId !== undefined && isIdentifier(step.objectId) && !references.objectIds.has(step.objectId)) context.add("REFERENCE_NOT_FOUND", `${path}.objectId`, `Object ${step.objectId} does not exist.`);
    if (step.targetObjectId !== undefined && isIdentifier(step.targetObjectId) && !references.objectIds.has(step.targetObjectId)) context.add("REFERENCE_NOT_FOUND", `${path}.targetObjectId`, `Object ${step.targetObjectId} does not exist.`);
    if (step.pathObjectId !== undefined && isIdentifier(step.pathObjectId) && !references.objectIds.has(step.pathObjectId)) context.add("REFERENCE_NOT_FOUND", `${path}.pathObjectId`, `Path ${step.pathObjectId} does not exist.`);
    if (step.trackerId !== undefined && isIdentifier(step.trackerId) && !references.trackerIds.has(step.trackerId)) context.add("REFERENCE_NOT_FOUND", `${path}.trackerId`, `Tracker ${step.trackerId} does not exist.`);
    if (step.shotId !== undefined && isIdentifier(step.shotId) && !references.shotIds.has(step.shotId)) context.add("REFERENCE_NOT_FOUND", `${path}.shotId`, `Shot ${step.shotId} does not exist.`);
    if (step.compositionId !== undefined && isIdentifier(step.compositionId) && !references.compositionIds.has(step.compositionId)) context.add("REFERENCE_NOT_FOUND", `${path}.compositionId`, `Composition ${step.compositionId} does not exist.`);
    if (step.conceptId !== undefined && isIdentifier(step.conceptId) && !references.conceptIds.has(step.conceptId)) context.add("REFERENCE_NOT_FOUND", `${path}.conceptId`, `Concept ${step.conceptId} does not exist.`);
    if (step.formulaTokenIds !== undefined) {
      if (!Array.isArray(step.formulaTokenIds)) context.add("INVALID_PACKAGE", `${path}.formulaTokenIds`, "Formula token ids must be an array.");
      else step.formulaTokenIds.forEach((tokenId, tokenIndex) => {
        if (!isIdentifier(tokenId) || !references.tokenIds.has(tokenId)) context.add("REFERENCE_NOT_FOUND", `${path}.formulaTokenIds[${tokenIndex}]`, `Formula token ${String(tokenId)} does not exist.`);
      });
    }
    if (step.path !== undefined) validatePathSpec(step.path, `${path}.path`, context);
    for (const key of ["holdOnWait", "ignorePresenterMode", "presenterMode"]) {
      if (step[key] !== undefined) validateBoolean(step[key], `${path}.${key}`, context);
    }
    for (const key of ["maxTime", "stopConditionSatisfiedAt"]) {
      if (isFiniteNumber(step[key]) && step[key] < 0) context.add("RANGE_INVALID", `${path}.${key}`, `${key} cannot be negative.`);
      if (step[key] !== undefined && safeExportMilliseconds(step[key]) === undefined) {
        context.add("RANGE_INVALID", `${path}.${key}`, `${key} exceeds the safe export millisecond range.`);
      }
    }
    if (
      step.presenterReleaseAfterFrames !== undefined &&
      (!Number.isSafeInteger(step.presenterReleaseAfterFrames) || (step.presenterReleaseAfterFrames as number) < 0)
    ) {
      context.add("NUMBER_INVALID", `${path}.presenterReleaseAfterFrames`, "Presenter release frames must be a non-negative safe integer.");
    }
    if (step.note !== undefined) validateProse(step.note, `${path}.note`, context);
    for (const key of ["compositionId", "conceptId", "objectId", "pathObjectId", "shotId", "targetObjectId", "trackerId"]) {
      if (step[key] !== undefined) validateIdentifier(step[key], `${path}.${key}`, context);
    }
    if (step.stopConditionId !== undefined) validateIdentifier(step.stopConditionId, `${path}.stopConditionId`, context);
  });
  if (!Number.isFinite(totalDuration) || safeExportMilliseconds(totalDuration) === undefined) {
    context.add("RANGE_INVALID", "$.scene.timeline", "Total timeline duration exceeds the safe export millisecond range.");
  }
  return value as AnimationStep[];
}

function validateAdvancedSceneReferences(
  scene: Record<string, unknown>,
  refs: { formulaIds: Set<string>; objectIds: Set<string>; tokenIds: Set<string>; tokensByFormula: Map<string, Set<string>>; trackerIds: Set<string> },
  context: ValidationContext
) {
  const planIds = new Set<string>();
  if (scene.animationPlans !== undefined) {
    if (!Array.isArray(scene.animationPlans)) context.add("INVALID_PACKAGE", "$.scene.animationPlans", "Animation plans must be an array.");
    else if (validateBusinessArrayLimit(scene.animationPlans, "$.scene.animationPlans", MATH_SCENE_PACKAGE_V3_MAX_SCENE_ENTRIES, context, "Animation plan list")) scene.animationPlans.forEach((plan, index) => {
      const path = `$.scene.animationPlans[${index}]`;
      if (!isRecord(plan)) return context.add("INVALID_PACKAGE", path, "Animation plan must be an object.");
      context.exactKeys(plan, ["duration", "id", "lagRatio", "objectId", "operations", "path", "targetObjectId"], ["duration", "id", "objectId", "operations", "targetObjectId"], path);
      validateIdentifier(plan.id, `${path}.id`, context);
      if (isIdentifier(plan.id)) {
        if (planIds.has(plan.id)) context.add("DUPLICATE_ID", `${path}.id`, `Duplicate animation plan id ${plan.id}.`);
        planIds.add(plan.id);
      }
      validateFiniteNumber(plan.duration, `${path}.duration`, context);
      if (isFiniteNumber(plan.duration) && plan.duration <= 0) context.add("RANGE_INVALID", `${path}.duration`, "Animation plan duration must be positive.");
      if (safeExportMilliseconds(plan.duration) === undefined) context.add("RANGE_INVALID", `${path}.duration`, "Animation plan duration exceeds the safe export range.");
      if (plan.lagRatio !== undefined) validateNumberRange(plan.lagRatio, 0, 1, `${path}.lagRatio`, context);
      for (const key of ["objectId", "targetObjectId"]) {
        validateIdentifier(plan[key], `${path}.${key}`, context);
        if (isIdentifier(plan[key]) && !refs.objectIds.has(plan[key])) context.add("REFERENCE_NOT_FOUND", `${path}.${key}`, `Object ${plan[key]} does not exist.`);
      }
      validatePathSpec(plan.path, `${path}.path`, context);
      if (!Array.isArray(plan.operations) || plan.operations.length === 0) context.add("INVALID_PACKAGE", `${path}.operations`, "Animation operations are required.");
      else if (validateBusinessArrayLimit(plan.operations, `${path}.operations`, 256, context, "Animation operation list")) plan.operations.forEach((operation, operationIndex) => {
        validateMathSceneAnimateOperation(operation, `${path}.operations[${operationIndex}]`, refs.objectIds, context);
      });
    });
  }

  const compositionIds = new Set<string>();
  if (scene.animationCompositions !== undefined) {
    if (!Array.isArray(scene.animationCompositions)) context.add("INVALID_PACKAGE", "$.scene.animationCompositions", "Animation compositions must be an array.");
    else if (validateBusinessArrayLimit(scene.animationCompositions, "$.scene.animationCompositions", MATH_SCENE_PACKAGE_V3_MAX_SCENE_ENTRIES, context, "Animation composition list")) scene.animationCompositions.forEach((composition, index) => {
      const path = `$.scene.animationCompositions[${index}]`;
      if (!isRecord(composition)) return context.add("INVALID_PACKAGE", path, "Animation composition must be an object.");
      context.exactKeys(composition, ["animationPlanIds", "id", "lagRatio", "rateFunction", "runTime", "type"], ["animationPlanIds", "id", "type"], path);
      validateIdentifier(composition.id, `${path}.id`, context);
      if (isIdentifier(composition.id)) {
        if (compositionIds.has(composition.id)) context.add("DUPLICATE_ID", `${path}.id`, `Duplicate composition id ${composition.id}.`);
        compositionIds.add(composition.id);
      }
      if (!["animationGroup", "laggedStart", "succession"].includes(String(composition.type))) context.add("INVALID_PACKAGE", `${path}.type`, "Composition type is invalid.");
      if (composition.rateFunction !== undefined && !easingNames.has(String(composition.rateFunction))) context.add("INVALID_PACKAGE", `${path}.rateFunction`, "Rate function is invalid.");
      if (composition.lagRatio !== undefined) validateNumberRange(composition.lagRatio, 0, 1, `${path}.lagRatio`, context);
      if (composition.runTime !== undefined) {
        validateFiniteNumber(composition.runTime, `${path}.runTime`, context);
        if (isFiniteNumber(composition.runTime) && composition.runTime <= 0) context.add("RANGE_INVALID", `${path}.runTime`, "Composition runtime must be positive.");
        if (safeExportMilliseconds(composition.runTime) === undefined) context.add("RANGE_INVALID", `${path}.runTime`, "Composition runtime exceeds the safe export range.");
      }
      if (!Array.isArray(composition.animationPlanIds) || composition.animationPlanIds.length === 0) context.add("INVALID_PACKAGE", `${path}.animationPlanIds`, "Composition plan ids are required.");
      else if (validateBusinessArrayLimit(composition.animationPlanIds, `${path}.animationPlanIds`, 256, context, "Composition plan id list")) composition.animationPlanIds.forEach((planId, planIndex) => {
        if (!isIdentifier(planId) || !planIds.has(planId)) context.add("REFERENCE_NOT_FOUND", `${path}.animationPlanIds[${planIndex}]`, `Animation plan ${String(planId)} does not exist.`);
      });
    });
  }

  if (scene.renderGroups !== undefined) {
    if (!isRecord(scene.renderGroups)) context.add("INVALID_PACKAGE", "$.scene.renderGroups", "Render groups must be an object.");
    else {
      context.exactKeys(scene.renderGroups, ["fixedInFrameObjectIds", "foregroundObjectIds"], [], "$.scene.renderGroups");
      for (const key of ["fixedInFrameObjectIds", "foregroundObjectIds"]) {
        const ids = scene.renderGroups[key];
        if (ids === undefined) continue;
        if (!Array.isArray(ids)) context.add("INVALID_PACKAGE", `$.scene.renderGroups.${key}`, "Render group ids must be an array.");
        else if (validateBusinessArrayLimit(ids, `$.scene.renderGroups.${key}`, MATH_SCENE_PACKAGE_V3_MAX_SCENE_ENTRIES, context, "Render group id list")) ids.forEach((id, index) => {
          if (!isIdentifier(id) || !refs.objectIds.has(id)) context.add("REFERENCE_NOT_FOUND", `$.scene.renderGroups.${key}[${index}]`, `Object does not exist.`);
        });
      }
    }
  }

  if (scene.formulaSvgMorphs !== undefined) {
    if (!Array.isArray(scene.formulaSvgMorphs)) context.add("INVALID_PACKAGE", "$.scene.formulaSvgMorphs", "Formula SVG morphs must be an array.");
    else if (validateBusinessArrayLimit(scene.formulaSvgMorphs, "$.scene.formulaSvgMorphs", MATH_SCENE_PACKAGE_V3_MAX_SCENE_ENTRIES, context, "Formula SVG morph list")) {
      const morphIds = new Set<string>();
      scene.formulaSvgMorphs.forEach((morph, index) => {
      const path = `$.scene.formulaSvgMorphs[${index}]`;
      if (!isRecord(morph)) return context.add("INVALID_PACKAGE", path, "Formula SVG morph must be an object.");
      context.exactKeys(morph, ["formulaId", "id", "sourcePath", "sourceTokenId", "targetPath", "targetTokenId"], ["formulaId", "id", "sourcePath", "sourceTokenId", "targetPath", "targetTokenId"], path);
      validateIdentifier(morph.id, `${path}.id`, context);
      if (isIdentifier(morph.id)) {
        if (morphIds.has(morph.id)) context.add("DUPLICATE_ID", `${path}.id`, `Duplicate formula SVG morph id ${morph.id}.`);
        morphIds.add(morph.id);
      }
      if (!isIdentifier(morph.formulaId) || !refs.formulaIds.has(morph.formulaId)) context.add("REFERENCE_NOT_FOUND", `${path}.formulaId`, "Formula does not exist.");
      for (const tokenKey of ["sourceTokenId", "targetTokenId"]) {
        if (!isIdentifier(morph[tokenKey]) || !refs.tokensByFormula.get(String(morph.formulaId))?.has(morph[tokenKey] as string)) context.add("TOKEN_FORMULA_MISMATCH", `${path}.${tokenKey}`, "Token does not belong to formula.");
      }
      for (const pathKey of ["sourcePath", "targetPath"]) validateSvgPathData(morph[pathKey], `${path}.${pathKey}`, context);
      });
    }
  }

  return compositionIds;
}

function validateSoundCues(value: unknown, context: ValidationContext) {
  if (value === undefined) return;
  const path = "$.scene.soundCues";
  const ids = new Set<string>();
  if (!Array.isArray(value)) {
    context.add("INVALID_PACKAGE", path, "Sound cues must be an array.");
    return;
  }
  if (!validateBusinessArrayLimit(value, path, MATH_SCENE_PACKAGE_V3_MAX_SCENE_ENTRIES, context, "Sound cue list")) return;
  value.forEach((cue, index) => {
    const cuePath = `${path}[${index}]`;
    if (!isRecord(cue)) {
      context.add("INVALID_PACKAGE", cuePath, "Sound cue must be an object.");
      return;
    }
    context.exactKeys(
      cue,
      ["gain", "gainToBackground", "id", "sceneTime", "soundFile", "timeOffset"],
      ["id", "sceneTime", "soundFile"],
      cuePath
    );
    validateIdentifier(cue.id, `${cuePath}.id`, context);
    if (isIdentifier(cue.id)) {
      if (ids.has(cue.id)) context.add("DUPLICATE_ID", `${cuePath}.id`, `Duplicate sound cue id ${cue.id}.`);
      ids.add(cue.id);
    }
    validateFiniteNumber(cue.sceneTime, `${cuePath}.sceneTime`, context);
    if (isFiniteNumber(cue.sceneTime) && cue.sceneTime < 0) context.add("RANGE_INVALID", `${cuePath}.sceneTime`, "Sound cue scene time cannot be negative.");
    for (const key of ["gain", "gainToBackground", "timeOffset"]) {
      if (cue[key] !== undefined) validateFiniteNumber(cue[key], `${cuePath}.${key}`, context);
    }
    if (isFiniteNumber(cue.sceneTime) && isFiniteNumber(cue.timeOffset) && cue.sceneTime + cue.timeOffset < 0) {
      context.add("RANGE_INVALID", `${cuePath}.timeOffset`, "Sound cue scheduled time cannot be negative.");
    }
    if (
      !isNonEmptyString(cue.soundFile) ||
      cue.soundFile.length > 255 ||
      cue.soundFile === "." ||
      cue.soundFile === ".." ||
      /[\\/]/.test(cue.soundFile) ||
      /^(?:https?|data|blob|file|javascript):/i.test(cue.soundFile)
    ) {
      context.add("AUDIO_METADATA_INVALID", `${cuePath}.soundFile`, "Sound cue file must be a local basename without a path or URL.");
    }
  });
}

function validateOdeSystem(value: unknown, path: string, context: ValidationContext) {
  if (!isRecord(value)) {
    context.add("INVALID_PACKAGE", path, "ODE system must be an object.");
    return;
  }
  if (value.type === "constantVelocity") {
    context.exactKeys(value, ["type", "velocity"], ["type", "velocity"], path);
    validateVec3(value.velocity, `${path}.velocity`, context);
    return;
  }
  if (value.type === "linear2d") {
    context.exactKeys(value, ["matrix", "type"], ["matrix", "type"], path);
    if (!Array.isArray(value.matrix) || value.matrix.length !== 2 || value.matrix.some((row) => !Array.isArray(row) || row.length !== 2)) {
      context.add("NUMBER_INVALID", `${path}.matrix`, "Linear 2D system needs a finite two-by-two matrix.");
    } else {
      value.matrix.forEach((row, rowIndex) => (row as unknown[]).forEach((entry, columnIndex) =>
        validateFiniteNumber(entry, `${path}.matrix[${rowIndex}][${columnIndex}]`, context)
      ));
    }
    return;
  }
  if (value.type === "lorenz") {
    context.exactKeys(value, ["beta", "rho", "sigma", "type"], ["beta", "rho", "sigma", "type"], path);
    for (const key of ["beta", "rho", "sigma"]) validateFiniteNumber(value[key], `${path}.${key}`, context);
    return;
  }
  context.add("INVALID_PACKAGE", `${path}.type`, "ODE system type is not supported.");
}

type ScalarExpressionValidationState = {
  nodeCount: number;
};

function validateAlwaysScalarExpression(
  value: unknown,
  path: string,
  trackerIds: Set<string>,
  context: ValidationContext,
  state: ScalarExpressionValidationState,
  depth = 0
) {
  state.nodeCount += 1;
  if (depth > 40 || state.nodeCount > 10_000) {
    context.add("INVALID_PACKAGE", path, "Scalar expression exceeds safe complexity limits.");
    return;
  }
  if (!isRecord(value) || !isNonEmptyString(value.type)) {
    context.add("INVALID_PACKAGE", path, "Scalar expression must be a typed object.");
    return;
  }
  if (["add", "max", "min"].includes(value.type)) {
    context.exactKeys(value, ["terms", "type"], ["terms", "type"], path);
    if (!Array.isArray(value.terms) || value.terms.length === 0) {
      context.add("INVALID_PACKAGE", `${path}.terms`, "Scalar expression terms cannot be empty.");
    } else {
      value.terms.forEach((term, index) => validateAlwaysScalarExpression(term, `${path}.terms[${index}]`, trackerIds, context, state, depth + 1));
    }
    return;
  }
  if (value.type === "multiply") {
    context.exactKeys(value, ["factors", "type"], ["factors", "type"], path);
    if (!Array.isArray(value.factors) || value.factors.length === 0) {
      context.add("INVALID_PACKAGE", `${path}.factors`, "Scalar expression factors cannot be empty.");
    } else {
      value.factors.forEach((factor, index) => validateAlwaysScalarExpression(factor, `${path}.factors[${index}]`, trackerIds, context, state, depth + 1));
    }
    return;
  }
  if (["log", "sin"].includes(value.type)) {
    context.exactKeys(value, ["type", "value"], ["type", "value"], path);
    validateAlwaysScalarExpression(value.value, `${path}.value`, trackerIds, context, state, depth + 1);
    return;
  }
  if (value.type === "constant") {
    context.exactKeys(value, ["type", "value"], ["type", "value"], path);
    validateFiniteNumber(value.value, `${path}.value`, context);
    return;
  }
  if (value.type === "t") {
    context.exactKeys(value, ["offset", "scale", "type"], ["type"], path);
    for (const key of ["offset", "scale"]) if (value[key] !== undefined) validateFiniteNumber(value[key], `${path}.${key}`, context);
    return;
  }
  if (value.type === "tracker") {
    context.exactKeys(value, ["offset", "scale", "trackerId", "type"], ["trackerId", "type"], path);
    validateIdentifier(value.trackerId, `${path}.trackerId`, context);
    if (isIdentifier(value.trackerId) && !trackerIds.has(value.trackerId)) {
      context.add("REFERENCE_NOT_FOUND", `${path}.trackerId`, `Tracker ${value.trackerId} does not exist.`);
    }
    for (const key of ["offset", "scale"]) if (value[key] !== undefined) validateFiniteNumber(value[key], `${path}.${key}`, context);
    return;
  }
  context.add("INVALID_PACKAGE", `${path}.type`, "Scalar expression type is not supported.");
}

function validateAlwaysPointExpression(
  value: unknown,
  path: string,
  trackerIds: Set<string>,
  context: ValidationContext,
  state: ScalarExpressionValidationState
) {
  if (!isRecord(value)) {
    context.add("INVALID_PACKAGE", path, "Point expression must be an object.");
    return;
  }
  context.exactKeys(value, ["x", "y", "z"], [], path);
  const present = ["x", "y", "z"].filter((key) => value[key] !== undefined);
  if (present.length === 0) context.add("INVALID_PACKAGE", path, "Point expression needs at least one coordinate expression.");
  present.forEach((key) => validateAlwaysScalarExpression(value[key], `${path}.${key}`, trackerIds, context, state));
}

function validateAlwaysRedrawFactory(
  value: unknown,
  path: string,
  trackerIds: Set<string>,
  context: ValidationContext
) {
  if (!isRecord(value)) {
    context.add("INVALID_PACKAGE", path, "Always-redraw factory must be an object.");
    return;
  }
  const keys = ["colorRole", "conceptId", "sampleCount", "style", "tRange", "type", "uniforms", "x", "y", "z"];
  context.exactKeys(value, keys, ["sampleCount", "tRange", "type", "x", "y"], path);
  if (value.type !== "parametricCurve") {
    context.add("INVALID_PACKAGE", `${path}.type`, "Only the current parametricCurve always-redraw factory is supported.");
  }
  if (!isIntegerInRange(value.sampleCount, 2, 10_000)) {
    context.add("NUMBER_INVALID", `${path}.sampleCount`, "Factory sample count must be an integer from 2 to 10000.");
  }
  validateRange(value.tRange, `${path}.tRange`, context);
  if (value.colorRole !== undefined) validateRole(value.colorRole, `${path}.colorRole`, context);
  if (value.conceptId !== undefined) validateIdentifier(value.conceptId, `${path}.conceptId`, context);
  validateStyle(value.style, `${path}.style`, context);
  validateUniforms(value.uniforms, `${path}.uniforms`, context);
  const state: ScalarExpressionValidationState = { nodeCount: 0 };
  validateAlwaysScalarExpression(value.x, `${path}.x`, trackerIds, context, state);
  validateAlwaysScalarExpression(value.y, `${path}.y`, trackerIds, context, state);
  if (value.z !== undefined) validateAlwaysScalarExpression(value.z, `${path}.z`, trackerIds, context, state);
}

function exactlyOnePresent(
  value: Record<string, unknown>,
  keys: [string, string],
  path: string,
  context: ValidationContext
) {
  const count = keys.filter((key) => value[key] !== undefined).length;
  if (count !== 1) context.add("INVALID_PACKAGE", path, `Exactly one of ${keys[0]} or ${keys[1]} is required.`);
}

function atLeastOnePresent(
  value: Record<string, unknown>,
  keys: string[],
  path: string,
  context: ValidationContext
) {
  if (!keys.some((key) => value[key] !== undefined)) context.add("INVALID_PACKAGE", path, "At least one operation value is required.");
}

function atMostOnePresent(
  value: Record<string, unknown>,
  keys: [string, string],
  path: string,
  context: ValidationContext
) {
  if (keys.every((key) => value[key] !== undefined)) {
    context.add("INVALID_PACKAGE", path, `${keys[0]} and ${keys[1]} cannot both be present.`);
  }
}

function validateAlwaysMethodOperation(
  value: unknown,
  path: string,
  objectIds: Set<string>,
  trackerIds: Set<string>,
  context: ValidationContext
) {
  if (!isRecord(value) || !isNonEmptyString(value.type)) {
    context.add("INVALID_PACKAGE", path, "Always-method operation must be a typed object.");
    return;
  }
  const staticStyleKeys = [
    "antiAliasWidth", "baseNormal", "fillOpacity", "fillRole", "jointAngleDegrees", "strokeOpacity",
    "strokeRole", "strokeWidth", "strokeZoomBehavior"
  ];
  const styleExpressionKeys = [
    "antiAliasWidthExpression", "fillOpacityExpression", "jointAngleDegreesExpression", "strokeOpacityExpression",
    "strokeWidthExpression"
  ];
  const variants: Record<string, { allowed: string[]; required: string[] }> = {
    alignTo: { allowed: ["direction", "targetObjectId", "type"], required: ["targetObjectId", "type"] },
    center: { allowed: ["type"], required: ["type"] },
    matchDepth: { allowed: ["aboutPoint", "stretch", "targetObjectId", "type"], required: ["targetObjectId", "type"] },
    matchHeight: { allowed: ["aboutPoint", "stretch", "targetObjectId", "type"], required: ["targetObjectId", "type"] },
    matchWidth: { allowed: ["aboutPoint", "stretch", "targetObjectId", "type"], required: ["targetObjectId", "type"] },
    matchX: { allowed: ["targetObjectId", "type"], required: ["targetObjectId", "type"] },
    matchY: { allowed: ["targetObjectId", "type"], required: ["targetObjectId", "type"] },
    matchZ: { allowed: ["targetObjectId", "type"], required: ["targetObjectId", "type"] },
    moveTo: { allowed: ["point", "pointExpression", "type"], required: ["type"] },
    nextTo: { allowed: ["buff", "buffExpression", "direction", "targetObjectId", "type"], required: ["targetObjectId", "type"] },
    rotate: { allowed: ["aboutPoint", "angleExpression", "angleRadians", "axis", "type"], required: ["type"] },
    scale: { allowed: ["aboutPoint", "factor", "factorExpression", "type"], required: ["type"] },
    setDepth: { allowed: ["aboutPoint", "depth", "depthExpression", "stretch", "type"], required: ["type"] },
    setFill: { allowed: ["fillOpacity", "fillOpacityExpression", "fillRole", "type"], required: ["type"] },
    setHeight: { allowed: ["aboutPoint", "height", "heightExpression", "stretch", "type"], required: ["type"] },
    setOpacity: { allowed: ["opacity", "opacityExpression", "type"], required: ["type"] },
    setStroke: { allowed: ["strokeOpacity", "strokeOpacityExpression", "strokeRole", "strokeWidth", "strokeWidthExpression", "type"], required: ["type"] },
    setStyle: { allowed: ["type", ...staticStyleKeys, ...styleExpressionKeys], required: ["type"] },
    setWidth: { allowed: ["aboutPoint", "stretch", "type", "width", "widthExpression"], required: ["type"] },
    setX: { allowed: ["coordinate", "coordinateExpression", "type"], required: ["type"] },
    setY: { allowed: ["coordinate", "coordinateExpression", "type"], required: ["type"] },
    setZ: { allowed: ["coordinate", "coordinateExpression", "type"], required: ["type"] },
    shift: { allowed: ["type", "vector", "vectorExpression"], required: ["type"] },
    stretch: { allowed: ["aboutPoint", "dim", "factor", "factorExpression", "type"], required: ["dim", "type"] },
    toCorner: { allowed: ["buff", "direction", "frame", "type"], required: ["type"] },
    toEdge: { allowed: ["buff", "direction", "frame", "type"], required: ["type"] }
  };
  const variant = variants[value.type];
  if (!variant) {
    context.add("INVALID_PACKAGE", `${path}.type`, "Always-method operation type is not supported.");
    return;
  }
  context.exactKeys(value, variant.allowed, variant.required, path);

  if (value.targetObjectId !== undefined) {
    validateIdentifier(value.targetObjectId, `${path}.targetObjectId`, context);
    if (isIdentifier(value.targetObjectId) && !objectIds.has(value.targetObjectId)) context.add("REFERENCE_NOT_FOUND", `${path}.targetObjectId`, `Object ${value.targetObjectId} does not exist.`);
  }
  for (const key of ["aboutPoint", "direction", "point", "vector"]) validateOptionalVec3Field(value, key, path, context);
  for (const key of ["stretch"]) validateOptionalBooleanField(value, key, path, context);
  if (value.frame !== undefined) validateEdgeFrame(value.frame, `${path}.frame`, context);
  if (value.axis !== undefined && !["x", "y", "z"].includes(String(value.axis))) context.add("INVALID_PACKAGE", `${path}.axis`, "Rotation axis is invalid.");
  if (value.dim !== undefined && !["x", "y", "z"].includes(String(value.dim))) context.add("INVALID_PACKAGE", `${path}.dim`, "Stretch dimension is invalid.");
  for (const key of ["angleRadians", "coordinate", "jointAngleDegrees"]) if (value[key] !== undefined) validateFiniteNumber(value[key], `${path}.${key}`, context);
  for (const key of ["buff", "depth", "height", "strokeWidth", "width"]) if (value[key] !== undefined) validateNumberRange(value[key], 0, Number.MAX_VALUE, `${path}.${key}`, context);
  if (value.factor !== undefined) validateNumberRange(value.factor, Number.MIN_VALUE, Number.MAX_VALUE, `${path}.factor`, context);
  for (const key of ["fillOpacity", "opacity", "strokeOpacity"]) if (value[key] !== undefined) validateNumberRange(value[key], 0, 1, `${path}.${key}`, context);
  for (const key of ["fillRole", "strokeRole"]) if (value[key] !== undefined) validateRole(value[key], `${path}.${key}`, context);
  if (value.type === "setStyle") validateStaticStyleFields(value, path, context);

  const state: ScalarExpressionValidationState = { nodeCount: 0 };
  const scalarExpressionKeys = [
    "angleExpression", "antiAliasWidthExpression", "buffExpression", "coordinateExpression", "depthExpression",
    "factorExpression", "fillOpacityExpression", "heightExpression", "jointAngleDegreesExpression", "opacityExpression",
    "strokeOpacityExpression", "strokeWidthExpression", "widthExpression"
  ];
  scalarExpressionKeys.forEach((key) => {
    if (value[key] !== undefined) validateAlwaysScalarExpression(value[key], `${path}.${key}`, trackerIds, context, state);
  });
  for (const key of ["pointExpression", "vectorExpression"]) {
    if (value[key] !== undefined) validateAlwaysPointExpression(value[key], `${path}.${key}`, trackerIds, context, state);
  }

  if (value.type === "moveTo") exactlyOnePresent(value, ["point", "pointExpression"], path, context);
  if (["setX", "setY", "setZ"].includes(value.type)) exactlyOnePresent(value, ["coordinate", "coordinateExpression"], path, context);
  if (value.type === "setOpacity") exactlyOnePresent(value, ["opacity", "opacityExpression"], path, context);
  if (value.type === "shift") exactlyOnePresent(value, ["vector", "vectorExpression"], path, context);
  if (["scale", "stretch"].includes(value.type)) exactlyOnePresent(value, ["factor", "factorExpression"], path, context);
  if (value.type === "rotate") exactlyOnePresent(value, ["angleRadians", "angleExpression"], path, context);
  if (value.type === "setDepth") exactlyOnePresent(value, ["depth", "depthExpression"], path, context);
  if (value.type === "setHeight") exactlyOnePresent(value, ["height", "heightExpression"], path, context);
  if (value.type === "setWidth") exactlyOnePresent(value, ["width", "widthExpression"], path, context);
  if (value.type === "nextTo" && value.buff !== undefined && value.buffExpression !== undefined) context.add("INVALID_PACKAGE", path, "nextTo cannot define both buff and buffExpression.");
  for (const pair of [
    ["fillOpacity", "fillOpacityExpression"],
    ["strokeOpacity", "strokeOpacityExpression"],
    ["strokeWidth", "strokeWidthExpression"],
    ["antiAliasWidth", "antiAliasWidthExpression"],
    ["jointAngleDegrees", "jointAngleDegreesExpression"]
  ] as Array<[string, string]>) atMostOnePresent(value, pair, path, context);
  if (value.type === "setFill") atLeastOnePresent(value, ["fillOpacity", "fillOpacityExpression", "fillRole"], path, context);
  if (value.type === "setStroke") atLeastOnePresent(value, ["strokeOpacity", "strokeOpacityExpression", "strokeRole", "strokeWidth", "strokeWidthExpression"], path, context);
  if (value.type === "setStyle") atLeastOnePresent(value, [...staticStyleKeys, ...styleExpressionKeys], path, context);
}

function validateOptionalSceneStructures(
  scene: Record<string, unknown>,
  refs: { formulaIds: Set<string>; objectIds: Set<string>; trackerIds: Set<string> },
  context: ValidationContext
) {
  let totalOdeSteps = 0;
  let remainingStreamGeneratedSamples = MATH_SCENE_PACKAGE_V3_MAX_STREAM_GENERATED_SAMPLES;
  let streamGeneratedSampleBudgetReported = false;
  const consumeStreamGeneratedSamples = (amount: number, path: string) => {
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > remainingStreamGeneratedSamples) {
      if (!streamGeneratedSampleBudgetReported) {
        context.add("RANGE_INVALID", path, "Aggregate stream-line generated sample budget is exceeded.");
        streamGeneratedSampleBudgetReported = true;
      }
      remainingStreamGeneratedSamples = 0;
      return;
    }
    remainingStreamGeneratedSamples -= amount;
  };
  const validateArray = (
    key: string,
    allowed: string[],
    required: string[],
    visit: (entry: Record<string, unknown>, path: string) => void
  ) => {
    const value = scene[key];
    if (value === undefined) return;
    const path = `$.scene.${key}`;
    if (!Array.isArray(value)) {
      context.add("INVALID_PACKAGE", path, `${key} must be an array.`);
      return;
    }
    if (!validateBusinessArrayLimit(value, path, MATH_SCENE_PACKAGE_V3_MAX_SCENE_ENTRIES, context, `${key} list`)) return;
    const ids = new Set<string>();
    value.forEach((entry, index) => {
      const entryPath = `${path}[${index}]`;
      if (!isRecord(entry)) {
        context.add("INVALID_PACKAGE", entryPath, `${key} entry must be an object.`);
        return;
      }
      context.exactKeys(entry, allowed, required, entryPath);
      if (entry.id !== undefined) {
        validateIdentifier(entry.id, `${entryPath}.id`, context);
        if (isIdentifier(entry.id)) {
          if (ids.has(entry.id)) context.add("DUPLICATE_ID", `${entryPath}.id`, `Duplicate ${key} id ${entry.id}.`);
          ids.add(entry.id);
        }
      }
      visit(entry, entryPath);
    });
  };

  validateArray(
    "cameraUpdaters",
    ["degreesPerSecond", "enabled", "endSeconds", "id", "startSeconds", "type"],
    ["degreesPerSecond", "id", "type"],
    (entry, path) => {
      if (entry.type !== "ambientRotation") context.add("INVALID_PACKAGE", `${path}.type`, "Camera updater type is invalid.");
      validateFiniteNumber(entry.degreesPerSecond, `${path}.degreesPerSecond`, context);
      for (const key of ["startSeconds", "endSeconds"]) if (entry[key] !== undefined) validateFiniteNumber(entry[key], `${path}.${key}`, context);
      if (isFiniteNumber(entry.startSeconds) && entry.startSeconds < 0) context.add("RANGE_INVALID", `${path}.startSeconds`, "Camera updater start cannot be negative.");
      if (isFiniteNumber(entry.endSeconds) && isFiniteNumber(entry.startSeconds) && entry.endSeconds < entry.startSeconds) context.add("RANGE_INVALID", `${path}.endSeconds`, "Camera updater end precedes start.");
      if (entry.enabled !== undefined && typeof entry.enabled !== "boolean") context.add("INVALID_PACKAGE", `${path}.enabled`, "Enabled must be boolean.");
    }
  );

  validateArray(
    "matchingTransforms",
    ["id", "key", "sourceFormulaId", "sourceObjectIds", "targetFormulaId", "targetObjectIds", "type"],
    ["id", "type"],
    (entry, path) => {
      if (!["transformMatchingShapes", "transformMatchingTex"].includes(String(entry.type))) context.add("INVALID_PACKAGE", `${path}.type`, "Matching transform type is invalid.");
      if (entry.key !== undefined && !["conceptId", "tokenId", "tokenText"].includes(String(entry.key))) context.add("INVALID_PACKAGE", `${path}.key`, "Matching key is invalid.");
      for (const key of ["sourceFormulaId", "targetFormulaId"]) {
        if (entry[key] !== undefined && (!isIdentifier(entry[key]) || !refs.formulaIds.has(entry[key] as string))) context.add("REFERENCE_NOT_FOUND", `${path}.${key}`, "Formula reference does not exist.");
      }
      for (const key of ["sourceObjectIds", "targetObjectIds"]) {
        if (entry[key] === undefined) continue;
        if (!Array.isArray(entry[key])) context.add("INVALID_PACKAGE", `${path}.${key}`, "Object references must be an array.");
        else (entry[key] as unknown[]).forEach((id, index) => {
          if (!isIdentifier(id) || !refs.objectIds.has(id)) context.add("REFERENCE_NOT_FOUND", `${path}.${key}[${index}]`, "Object reference does not exist.");
        });
      }
    }
  );

  validateArray(
    "odeTrajectories",
    ["bounds", "colorRole", "conceptId", "coordinateMode", "id", "method", "start", "stepCount", "system", "tailDurationSeconds", "tRange"],
    ["conceptId", "id", "start", "stepCount", "system", "tRange"],
    (entry, path) => {
      validateIdentifier(entry.conceptId, `${path}.conceptId`, context);
      validateVec3(entry.start, `${path}.start`, context);
      validateRange(entry.tRange, `${path}.tRange`, context);
      if (!isIntegerInRange(entry.stepCount, 1, MATH_SCENE_PACKAGE_V3_MAX_ODE_STEPS)) context.add("NUMBER_INVALID", `${path}.stepCount`, "Step count must be a positive bounded integer.");
      if (isIntegerInRange(entry.stepCount, 1, MATH_SCENE_PACKAGE_V3_MAX_ODE_STEPS)) {
        totalOdeSteps += Number(entry.stepCount);
        if (totalOdeSteps > 32_768) context.add("RANGE_INVALID", `${path}.stepCount`, "Total ODE step budget is exceeded.");
      }
      if (entry.method !== undefined && !["euler", "rk4"].includes(String(entry.method))) context.add("INVALID_PACKAGE", `${path}.method`, "ODE method is invalid.");
      if (entry.coordinateMode !== undefined && !["math", "world"].includes(String(entry.coordinateMode))) context.add("INVALID_PACKAGE", `${path}.coordinateMode`, "Coordinate mode is invalid.");
      if (entry.bounds !== undefined) validateAxisRange(entry.bounds, `${path}.bounds`, context);
      if (entry.tailDurationSeconds !== undefined) validateFiniteNumber(entry.tailDurationSeconds, `${path}.tailDurationSeconds`, context);
      validateOdeSystem(entry.system, `${path}.system`, context);
    }
  );

  const validateFieldLike = (entry: Record<string, unknown>, path: string) => {
    validateIdentifier(entry.conceptId, `${path}.conceptId`, context);
    validateRange(entry.xRange, `${path}.xRange`, context);
    validateRange(entry.yRange, `${path}.yRange`, context);
    for (const key of ["xSteps", "ySteps"]) if (!isIntegerInRange(entry[key], 1, MATH_SCENE_PACKAGE_V3_MAX_GRID_AXIS_STEPS)) context.add("NUMBER_INVALID", `${path}.${key}`, "Grid steps must be a positive bounded integer.");
    if (entry.coordinateMode !== undefined && !["math", "world"].includes(String(entry.coordinateMode))) context.add("INVALID_PACKAGE", `${path}.coordinateMode`, "Coordinate mode is invalid.");
    for (const key of ["maxArrowLength", "z"]) if (entry[key] !== undefined) validateFiniteNumber(entry[key], `${path}.${key}`, context);
    validateOdeSystem(entry.system, `${path}.system`, context);
  };

  validateArray(
    "vectorFields",
    ["colorRole", "conceptId", "coordinateMode", "id", "maxArrowLength", "system", "xRange", "xSteps", "yRange", "ySteps", "z"],
    ["conceptId", "id", "system", "xRange", "xSteps", "yRange", "ySteps"],
    (entry, path) => {
      validateFieldLike(entry, path);
      if (
        isIntegerInRange(entry.xSteps, 1, MATH_SCENE_PACKAGE_V3_MAX_GRID_AXIS_STEPS) &&
        isIntegerInRange(entry.ySteps, 1, MATH_SCENE_PACKAGE_V3_MAX_GRID_AXIS_STEPS)
      ) {
        const sampleCount = safeIntegerProduct([Number(entry.xSteps), Number(entry.ySteps)]);
        if (sampleCount === undefined) context.add("RANGE_INVALID", path, "Vector-field sample grid cannot be represented safely.");
        else {
          if (sampleCount > 4_096) context.add("RANGE_INVALID", path, "Vector-field sample grid exceeds the runtime object budget.");
        }
      }
    }
  );

  validateArray(
    "streamLines",
    ["bounds", "colorRole", "conceptId", "coordinateMode", "cycleSeconds", "dt", "id", "phaseOffsetStep", "stepCount", "system", "visibleProgress", "xRange", "xSteps", "yRange", "ySteps", "z"],
    ["conceptId", "dt", "id", "stepCount", "system", "xRange", "xSteps", "yRange", "ySteps"],
    (entry, path) => {
      validateFieldLike(entry, path);
      if (!isIntegerInRange(entry.stepCount, 1, 4_096)) context.add("NUMBER_INVALID", `${path}.stepCount`, "Step count must be a positive bounded integer.");
      if (
        isIntegerInRange(entry.xSteps, 1, MATH_SCENE_PACKAGE_V3_MAX_GRID_AXIS_STEPS) &&
        isIntegerInRange(entry.ySteps, 1, MATH_SCENE_PACKAGE_V3_MAX_GRID_AXIS_STEPS)
      ) {
        const seedCount = safeIntegerProduct([Number(entry.xSteps), Number(entry.ySteps)]);
        if (seedCount === undefined) context.add("RANGE_INVALID", path, "Stream-line seed grid cannot be represented safely.");
        else {
          if (seedCount > MATH_SCENE_PACKAGE_V3_MAX_STREAM_SEEDS) context.add("RANGE_INVALID", path, "Stream-line seed grid exceeds the runtime budget.");
          if (isIntegerInRange(entry.stepCount, 1, 4_096)) {
            const generatedSamples = safeIntegerProduct([seedCount, Number(entry.stepCount) + 1]);
            if (generatedSamples === undefined) context.add("RANGE_INVALID", path, "Stream-line integration work cannot be represented safely.");
            else {
              if (generatedSamples > MATH_SCENE_PACKAGE_V3_MAX_STREAM_WORK) {
                context.add("RANGE_INVALID", path, "Stream-line integration work exceeds the runtime budget.");
              }
              consumeStreamGeneratedSamples(generatedSamples, path);
            }
          }
        }
      }
      for (const key of ["cycleSeconds", "dt", "phaseOffsetStep", "visibleProgress"]) if (entry[key] !== undefined) validateFiniteNumber(entry[key], `${path}.${key}`, context);
      if (entry.bounds !== undefined) validateAxisRange(entry.bounds, `${path}.bounds`, context);
    }
  );

  validateArray(
    "vectorFieldUpdaters",
    ["bounds", "coordinateMode", "id", "objectId", "speedScale", "system", "type"],
    ["id", "objectId", "system", "type"],
    (entry, path) => {
      if (entry.type !== "moveAlongVectorField") context.add("INVALID_PACKAGE", `${path}.type`, "Vector-field updater type is invalid.");
      if (!isIdentifier(entry.objectId) || !refs.objectIds.has(entry.objectId)) context.add("REFERENCE_NOT_FOUND", `${path}.objectId`, "Updater object does not exist.");
      if (entry.coordinateMode !== undefined && !["math", "world"].includes(String(entry.coordinateMode))) context.add("INVALID_PACKAGE", `${path}.coordinateMode`, "Coordinate mode is invalid.");
      if (entry.bounds !== undefined) validateAxisRange(entry.bounds, `${path}.bounds`, context);
      if (entry.speedScale !== undefined) validateFiniteNumber(entry.speedScale, `${path}.speedScale`, context);
      validateOdeSystem(entry.system, `${path}.system`, context);
    }
  );

  validateArray(
    "alwaysRedraw",
    ["dependencyTrackerIds", "factory", "id", "objectId"],
    ["dependencyTrackerIds", "id", "objectId"],
    (entry, path) => {
      if (!isIdentifier(entry.objectId) || !refs.objectIds.has(entry.objectId)) context.add("REFERENCE_NOT_FOUND", `${path}.objectId`, "Always-redraw object does not exist.");
      if (!Array.isArray(entry.dependencyTrackerIds)) context.add("INVALID_PACKAGE", `${path}.dependencyTrackerIds`, "Dependency tracker ids must be an array.");
      else entry.dependencyTrackerIds.forEach((id, index) => {
        if (!isIdentifier(id) || !refs.trackerIds.has(id)) context.add("REFERENCE_NOT_FOUND", `${path}.dependencyTrackerIds[${index}]`, "Tracker does not exist.");
      });
      if (entry.factory !== undefined) {
        validateAlwaysRedrawFactory(entry.factory, `${path}.factory`, refs.trackerIds, context);
      }
    }
  );

  validateArray(
    "alwaysMethodUpdaters",
    ["id", "objectId", "operation"],
    ["id", "objectId", "operation"],
    (entry, path) => {
      if (!isIdentifier(entry.objectId) || !refs.objectIds.has(entry.objectId)) context.add("REFERENCE_NOT_FOUND", `${path}.objectId`, "Always-method object does not exist.");
      validateAlwaysMethodOperation(entry.operation, `${path}.operation`, refs.objectIds, refs.trackerIds, context);
    }
  );
}

function collectConceptIds(scene: Record<string, unknown>) {
  const result = new Set<string>();
  const collect = (value: unknown) => {
    if (!Array.isArray(value)) return;
    value.forEach((entry) => {
      if (isRecord(entry) && isIdentifier(entry.conceptId)) result.add(entry.conceptId);
      if (isRecord(entry) && Array.isArray(entry.tokens)) entry.tokens.forEach((token) => {
        if (isRecord(token) && isIdentifier(token.conceptId)) result.add(token.conceptId);
      });
    });
  };
  collect(scene.objects);
  collect(scene.formulas);
  collect(scene.bindings);
  collect(scene.parameters);
  collect(scene.valueTrackers);
  collect(scene.odeTrajectories);
  collect(scene.streamLines);
  collect(scene.vectorFields);
  return result;
}

function validateScene(value: unknown, context: ValidationContext) {
  const path = "$.scene";
  if (!isRecord(value)) {
    context.add("INVALID_PACKAGE", path, "An existing MathSceneSpec is required.");
    return { conceptIds: new Set<string>(), timeline: [] as AnimationStep[] };
  }
  context.exactKeys(value, [...sceneRootKeys], ["bindings", "cameraShots", "coordinateSpace", "diagnostics", "familyId", "formulas", "objects", "sceneId", "timeline"], path);
  validateIdentifier(value.sceneId, `${path}.sceneId`, context);
  if (!isNonEmptyString(value.familyId) || !canonicalThreeDFamilyIds.has(value.familyId)) {
    context.add("INVALID_PACKAGE", `${path}.familyId`, "Scene family id must be a canonical Three.js family.");
  }
  if (!isRecord(value.coordinateSpace)) context.add("RANGE_INVALID", `${path}.coordinateSpace`, "Coordinate space is required.");
  else {
    context.exactKeys(value.coordinateSpace, ["mathRange", "worldRange"], ["mathRange", "worldRange"], `${path}.coordinateSpace`);
    validateAxisRange(value.coordinateSpace.mathRange, `${path}.coordinateSpace.mathRange`, context);
    validateAxisRange(value.coordinateSpace.worldRange, `${path}.coordinateSpace.worldRange`, context);
  }
  const objectIds = validateObjects(value.objects, context);
  addLegalRuntimeDerivedObjectIds(value, objectIds, context);
  const formulas = validateFormulas(value.formulas, context);
  const trackerIds = validateTrackers(value, objectIds, context);
  const shotIds = validateCameraShots(value.cameraShots, context);
  validateBindings(value.bindings, objectIds, formulas.formulaIds, formulas.tokensByFormula, context);
  validateBindingConceptConsistency(value, context);
  const compositionIds = validateAdvancedSceneReferences(value, { ...formulas, objectIds, trackerIds }, context);
  validateOptionalSceneStructures(value, { formulaIds: formulas.formulaIds, objectIds, trackerIds }, context);
  const conceptIds = collectConceptIds(value);
  const timeline = validateTimeline(value.timeline, {
    compositionIds,
    conceptIds,
    objectIds,
    shotIds,
    tokenIds: formulas.tokenIds,
    trackerIds
  }, context);
  validateSoundCues(value.soundCues, context);

  value.objects instanceof Array && value.objects.forEach((object, index) => {
    if (!isRecord(object)) return;
    for (const key of ["pathObjectId", "sourceObjectId"]) {
      if (isIdentifier(object[key]) && !objectIds.has(object[key])) context.add("REFERENCE_NOT_FOUND", `${path}.objects[${index}].${key}`, `Object ${object[key]} does not exist.`);
    }
  });

  if (!isRecord(value.diagnostics)) context.add("INVALID_PACKAGE", `${path}.diagnostics`, "Scene diagnostics are required.");
  else {
    context.exactKeys(value.diagnostics, ["expectedBindingCount", "expectedObjectCount", "expectedTokenCount"], ["expectedBindingCount", "expectedObjectCount", "expectedTokenCount"], `${path}.diagnostics`);
    for (const key of ["expectedBindingCount", "expectedObjectCount", "expectedTokenCount"]) {
      if (!isIntegerInRange(value.diagnostics[key], 0, 1_000_000)) context.add("NUMBER_INVALID", `${path}.diagnostics.${key}`, "A non-negative integer is required.");
    }
    if (Array.isArray(value.objects) && value.diagnostics.expectedObjectCount !== value.objects.length) context.add("INVALID_PACKAGE", `${path}.diagnostics.expectedObjectCount`, "Expected object count does not match scene objects.");
    if (Array.isArray(value.bindings) && value.diagnostics.expectedBindingCount !== value.bindings.length) context.add("INVALID_PACKAGE", `${path}.diagnostics.expectedBindingCount`, "Expected binding count does not match scene bindings.");
    const tokenCount = Array.isArray(value.formulas) ? value.formulas.reduce((count, formula) => count + (isRecord(formula) && Array.isArray(formula.tokens) ? formula.tokens.length : 0), 0) : 0;
    if (value.diagnostics.expectedTokenCount !== tokenCount) context.add("INVALID_PACKAGE", `${path}.diagnostics.expectedTokenCount`, "Expected token count does not match formula tokens.");
  }

  if (value.randomSeed !== undefined) {
    if (!isRecord(value.randomSeed)) context.add("INVALID_PACKAGE", `${path}.randomSeed`, "Random seed must be an object.");
    else {
      context.exactKeys(value.randomSeed, ["algorithm", "seed", "signature", "source"], ["algorithm", "seed", "signature", "source"], `${path}.randomSeed`);
      if (value.randomSeed.algorithm !== "mulberry32" || value.randomSeed.source !== "scene") context.add("INVALID_PACKAGE", `${path}.randomSeed`, "Random seed contract is invalid.");
      validateFiniteNumber(value.randomSeed.seed, `${path}.randomSeed.seed`, context);
      validateProse(value.randomSeed.signature, `${path}.randomSeed.signature`, context);
    }
  }

  return { conceptIds, timeline };
}

function timelineBounds(timeline: AnimationStep[]) {
  let elapsed = 0;
  return timeline.map((step) => {
    const start = elapsed;
    const duration = isFiniteNumber(step.duration) ? Math.max(0, step.duration) : 0;
    elapsed += duration;
    return { end: elapsed, start };
  });
}

function validateCaptions(value: unknown, timeline: AnimationStep[], conceptIds: Set<string>, context: ValidationContext) {
  const path = "$.captions";
  if (!Array.isArray(value)) return context.add("INVALID_PACKAGE", path, "Captions must be an array.");
  if (value.length > MATH_SCENE_PACKAGE_V3_MAX_CAPTION_CUES) {
    context.add("INVALID_PACKAGE", path, "Caption cue count exceeds the export limit.");
    return;
  }
  const bounds = timelineBounds(timeline);
  let previousEnd = 0;
  value.forEach((cue, index) => {
    const cuePath = `${path}[${index}]`;
    if (!isRecord(cue)) return context.add("INVALID_PACKAGE", cuePath, "Caption cue must be an object.");
    const keys = ["beatId", "beatIndex", "conceptId", "endSeconds", "startSeconds", "text"];
    context.exactKeys(cue, keys, keys, cuePath);
    validateIdentifier(cue.conceptId, `${cuePath}.conceptId`, context);
    if (isIdentifier(cue.conceptId) && !conceptIds.has(cue.conceptId)) context.add("REFERENCE_NOT_FOUND", `${cuePath}.conceptId`, `Concept ${cue.conceptId} does not exist.`);
    if (!isIntegerInRange(cue.beatIndex, 0, timeline.length - 1) || cue.beatId !== canonicalMathSceneBeatId(Number(cue.beatIndex))) {
      context.add("CAPTION_BEAT_INVALID", `${cuePath}.beatId`, "Caption beat id and index must identify a canonical scene beat.");
    }
    validateFiniteNumber(cue.startSeconds, `${cuePath}.startSeconds`, context);
    validateFiniteNumber(cue.endSeconds, `${cuePath}.endSeconds`, context);
    if (isFiniteNumber(cue.startSeconds) && isFiniteNumber(cue.endSeconds)) {
      const startMilliseconds = safeExportMilliseconds(cue.startSeconds);
      const endMilliseconds = safeExportMilliseconds(cue.endSeconds);
      const beatIndex = typeof cue.beatIndex === "number" ? cue.beatIndex : -1;
      const bound = isIntegerInRange(beatIndex, 0, timeline.length - 1) ? bounds[beatIndex] : undefined;
      if (
        startMilliseconds === undefined ||
        endMilliseconds === undefined ||
        endMilliseconds <= startMilliseconds ||
        !bound ||
        cue.startSeconds < bound.start - 1e-6 ||
        cue.endSeconds > bound.end + 1e-6
      ) {
        context.add("CAPTION_TIME_INVALID", cuePath, "Caption cue must be ordered and contained within its scene beat.");
      }
      if (index > 0 && cue.startSeconds < previousEnd - 1e-6) context.add("CAPTION_OVERLAP", cuePath, "Caption cues must not overlap.");
      previousEnd = Math.max(previousEnd, cue.endSeconds);
    }
    validateLocalizedText(cue.text, `${cuePath}.text`, context);
  });
}

function validateAudio(value: unknown, context: ValidationContext) {
  const path = "$.audio";
  if (!isRecord(value)) return context.add("AUDIO_METADATA_INVALID", path, "Audio must be local metadata only.");
  if (value.source === "none") {
    context.exactKeys(value, ["source"], ["source"], path);
    return;
  }
  const keys = ["contentHash", "durationSeconds", "fileName", "mimeType", "source"];
  context.exactKeys(value, keys, keys, path);
  if (!["local-file", "microphone"].includes(String(value.source))) context.add("AUDIO_METADATA_INVALID", `${path}.source`, "Audio source must be local-file, microphone, or none.");
  if (
    !isNonEmptyString(value.fileName) ||
    value.fileName.length > 255 ||
    value.fileName === "." ||
    value.fileName === ".." ||
    /[\\/]/.test(value.fileName) ||
    /^(?:https?|data|blob|file):/i.test(value.fileName)
  ) context.add("AUDIO_METADATA_INVALID", `${path}.fileName`, "Audio filename must be a local basename without a path or URL.");
  if (!audioMimeTypes.has(String(value.mimeType))) context.add("AUDIO_METADATA_INVALID", `${path}.mimeType`, "Audio MIME type is not supported.");
  if (!isFiniteNumber(value.durationSeconds) || value.durationSeconds <= 0 || value.durationSeconds > 86_400) context.add("AUDIO_METADATA_INVALID", `${path}.durationSeconds`, "Audio duration must be positive and bounded.");
  if (typeof value.contentHash !== "string" || !/^sha256-[a-f0-9]{64}$/.test(value.contentHash)) context.add("AUDIO_METADATA_INVALID", `${path}.contentHash`, "Audio content hash must be a SHA-256 proof.");
}

function validateExportProfiles(value: unknown, context: ValidationContext) {
  const path = "$.exportProfiles";
  const ids = new Set<string>();
  if (!Array.isArray(value)) return context.add("INVALID_PACKAGE", path, "Export profiles must be an array.");
  value.forEach((profile, index) => {
    const profilePath = `${path}[${index}]`;
    if (!isRecord(profile)) return context.add("EXPORT_PROFILE_INVALID", profilePath, "Export profile must be an object.");
    const keys = ["audioPolicy", "background", "captionPolicy", "format", "fps", "height", "id", "mimeType", "transparent", "width"];
    context.exactKeys(profile, keys, keys, profilePath);
    validateIdentifier(profile.id, `${profilePath}.id`, context);
    if (isIdentifier(profile.id)) {
      if (ids.has(profile.id)) context.add("DUPLICATE_ID", `${profilePath}.id`, `Duplicate export profile id ${profile.id}.`);
      ids.add(profile.id);
    }
    const format = profile.format;
    const mimeType = profile.mimeType;
    const validMime = format === "mp4"
      ? mimeType === "video/mp4"
      : format === "webm" && ["video/webm", "video/webm;codecs=vp8", "video/webm;codecs=vp9"].includes(String(mimeType));
    if (!validMime) context.add("EXPORT_PROFILE_INVALID", `${profilePath}.mimeType`, "Export format and MIME type do not match.");
    if (!isIntegerInRange(profile.width, 160, 7_680) || Number(profile.width) % 2 !== 0 || !isIntegerInRange(profile.height, 90, 4_320) || Number(profile.height) % 2 !== 0) context.add("EXPORT_PROFILE_INVALID", profilePath, "Export dimensions must be even integers within supported bounds.");
    if (!isIntegerInRange(profile.fps, 1, 120)) context.add("EXPORT_PROFILE_INVALID", `${profilePath}.fps`, "Export fps must be an integer from 1 to 120.");
    if (!["both", "burn-in", "none", "sidecar"].includes(String(profile.captionPolicy))) context.add("EXPORT_PROFILE_INVALID", `${profilePath}.captionPolicy`, "Caption policy is invalid.");
    if (!["include-if-attached", "omit"].includes(String(profile.audioPolicy))) context.add("EXPORT_PROFILE_INVALID", `${profilePath}.audioPolicy`, "Audio policy is invalid.");
    if (typeof profile.transparent !== "boolean") context.add("EXPORT_PROFILE_INVALID", `${profilePath}.transparent`, "Transparent must be boolean.");
    if (profile.transparent === true && (format !== "webm" || profile.background !== "transparent")) context.add("EXPORT_PROFILE_INVALID", profilePath, "Transparent export requires WebM and a transparent background.");
    if (!isNonEmptyString(profile.background) || (profile.background !== "transparent" && !/^#[0-9a-f]{6}$/i.test(profile.background))) context.add("EXPORT_PROFILE_INVALID", `${profilePath}.background`, "Background must be transparent or a six-digit hex color.");
  });
}

function validateReviewLedger(value: unknown, context: ValidationContext) {
  const path = "$.reviewLedger";
  if (!isRecord(value)) return context.add("GATE_LEDGER_INVALID", path, "A four-gate review ledger is required.");
  context.exactKeys(value, [...mathSceneV3GateIds], [...mathSceneV3GateIds], path, "GATE_LEDGER_INVALID");
  mathSceneV3GateIds.forEach((gateId) => {
    const entry = value[gateId];
    const gatePath = `${path}.${gateId}`;
    if (!isRecord(entry)) return context.add("GATE_LEDGER_INVALID", gatePath, "Gate entry must be an object.");
    context.exactKeys(entry, ["evidenceIds", "status"], ["evidenceIds", "status"], gatePath, "GATE_LEDGER_INVALID");
    if (!["failed", "passed", "pending"].includes(String(entry.status))) context.add("GATE_LEDGER_INVALID", `${gatePath}.status`, "Gate status is invalid.");
    if (!Array.isArray(entry.evidenceIds)) context.add("GATE_LEDGER_INVALID", `${gatePath}.evidenceIds`, "Gate evidence ids must be an array.");
    else {
      entry.evidenceIds.forEach((evidenceId, index) => {
        if (!isIdentifier(evidenceId)) context.add("GATE_LEDGER_INVALID", `${gatePath}.evidenceIds[${index}]`, "Evidence id is invalid.");
      });
      if (entry.status === "passed" && entry.evidenceIds.length === 0) {
        context.add("GATE_LEDGER_INVALID", `${gatePath}.evidenceIds`, "Passed gates require at least one evidence id.");
      }
    }
  });
}

export function validateMathScenePackageV3(value: unknown): MathScenePackageV3ValidationResult {
  const context = new ValidationContext();
  try {
    const materialized = materializeJsonSnapshot(value, context);
    if (!materialized.ok) return { errors: context.errors, ok: false };
    const snapshot = materialized.snapshot;
    let serialized: string | undefined;
    try {
      serialized = JSON.stringify(snapshot);
    } catch {
      context.add("INVALID_PACKAGE", "$", "Scene Package must be safely JSON serializable.");
      return { errors: context.errors, ok: false };
    }
    if (serialized === undefined) {
      context.add("INVALID_PACKAGE", "$", "Scene Package must serialize to a JSON object.");
      return { errors: context.errors, ok: false };
    }
    if (utf8ByteLength(serialized) > MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES) {
      context.add(
        "PACKAGE_TOO_LARGE",
        "$",
        `Scene Package JSON must not exceed ${MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES} UTF-8 bytes.`
      );
      return { errors: context.errors, ok: false };
    }
    if (!isRecord(snapshot)) {
      context.add("INVALID_PACKAGE", "$", "Scene Package must be a JSON object.");
      return { errors: context.errors, ok: false };
    }
    const rootKeys = ["audio", "brief", "captions", "exportProfiles", "localization", "reviewLedger", "scene", "schemaVersion"];
    context.exactKeys(snapshot, rootKeys, rootKeys, "$" );
    if (snapshot.schemaVersion !== MATH_SCENE_PACKAGE_V3_SCHEMA_VERSION) context.add("SCHEMA_VERSION_INVALID", "$.schemaVersion", `schemaVersion must equal ${MATH_SCENE_PACKAGE_V3_SCHEMA_VERSION}.`);
    validateBrief(snapshot.brief, context);
    validateLocalization(snapshot.localization, context);
    const scene = validateScene(snapshot.scene, context);
    validateLocalizationConceptReferences(snapshot.localization, scene.conceptIds, context);
    validateCaptions(snapshot.captions, scene.timeline, scene.conceptIds, context);
    validateAudio(snapshot.audio, context);
    validateExportProfiles(snapshot.exportProfiles, context);
    validateReviewLedger(snapshot.reviewLedger, context);
    validateCloudSafePayload(snapshot, context);
    value = snapshot;
  } catch {
    context.add("INVALID_PACKAGE", "$", "Scene Package validation could not safely complete.");
  }
  return context.errors.length > 0
    ? { errors: context.errors, ok: false }
    : { ok: true, value: value as MathScenePackageV3 };
}

export function parseMathScenePackageV3Json(text: string): MathScenePackageV3ValidationResult {
  if (typeof text !== "string") {
    return { errors: [{ code: "INVALID_JSON", message: "Scene Package input must be UTF-8 JSON text.", path: "$" }], ok: false };
  }
  if (utf8ByteLength(text) > MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES) {
    return {
      errors: [{
        code: "PACKAGE_TOO_LARGE",
        message: `Scene Package JSON must not exceed ${MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES} UTF-8 bytes.`,
        path: "$"
      }],
      ok: false
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { errors: [{ code: "INVALID_JSON", message: "Scene Package contains malformed JSON.", path: "$" }], ok: false };
  }
  return validateMathScenePackageV3(parsed);
}
