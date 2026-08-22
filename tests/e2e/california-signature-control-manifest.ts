import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  signatureLabAssignments,
  type SignatureLabId
} from "@/data/signatureLabAssignments";
import {
  resolveCaliforniaSignatureProductProjectRoot
} from "./california-signature-product-root";

/**
 * Source-backed control coverage for the California signature benches.
 *
 * The browser must not decide its own coverage target: a control that fails to
 * render would then disappear from both the page and the expected set.  This
 * module instead derives the target from the reviewed JSX sources and freezes
 * two aggregate identities below.  A source edit, a removed lesson step, or a
 * removed non-first control therefore stops the static gate before browser QA.
 *
 * The browser traversal remains an independent second layer.  It emits exact
 * state/control/endpoint keys and must compare them with a reviewed runtime
 * key set through `assertExactCaliforniaSignatureCoverage`.  Updating either
 * frozen source digest or the reviewed runtime set is an explicit review act;
 * DOM discovery alone can never approve a smaller surface.
 */

export const CALIFORNIA_SIGNATURE_SOURCE_SCHEMA_VERSION = 4;

// Filled from the current reviewed source tree.  These are intentionally one
// aggregate per layer, not a hand-maintained 186-entry hash map.
export const CALIFORNIA_SIGNATURE_COMPONENT_SOURCE_SHA256 =
  "ea07bd1b1e7721bf61d24ddd67879b02b1b8e96d707208e621f56d721290a745";
export const CALIFORNIA_SIGNATURE_CONTROL_BLUEPRINT_SHA256 =
  "5deadcb36c89272a406da254185831760b5a859d1f4d0fb2cbc5caeb207e845b";

export type CaliforniaSignatureControlKind =
  | "action-button"
  | "checkbox"
  | "number"
  | "press-button"
  | "radio"
  | "range"
  | "select"
  | "textarea"
  | "interaction-surface";

export type CaliforniaSignatureSourceEndpointTarget = {
  /** Stable source identity. Runtime evidence must cite this; DOM values cannot invent it. */
  key: string;
  /** Static upper cardinality for mapped option/handler sites. */
  expectedMultiplicity: number;
  multiplicityIsExact: boolean;
  name: string;
  sourceExpression: string;
};

export type CaliforniaSignatureCanonicalNumericEndpoints = {
  max: string;
  mid: string;
  min: string;
};

export type CaliforniaSignatureNumericMidpointAudit =
  | {
      reason: null;
      /** Runtime execution must prove one strict, step-valid interior value. */
      status: "required";
      sourceExpression: string;
    }
  | {
      reason: "dynamic min/max/step expression requires exact runtime-state audit";
      /** Source expressions are dynamic; every exact runtime instance must classify itself. */
      status: "runtime-audited";
      sourceExpression: string;
    }
  | {
      /** Exact source-backed reason why this control has only two reachable states. */
      reason: string;
      status: "unavailable";
      sourceExpression: string;
    };

/**
 * Resolve one exact, step-valid numeric midpoint without trusting browser DOM
 * discovery to invent the expected value. Missing HTML step uses the platform
 * default of 1; `step="any"` uses the arithmetic midpoint. A discrete two-state
 * control has no midpoint and fails closed; callers must bind that source truth
 * through an explicit `unavailable` audit instead of duplicating an endpoint.
 */
export function canonicalCaliforniaSignatureNumericEndpoints(
  minValue: unknown,
  maxValue: unknown,
  stepValue: unknown,
  label = "California signature numeric control"
): CaliforniaSignatureCanonicalNumericEndpoints {
  const minText = String(minValue ?? "");
  const maxText = String(maxValue ?? "");
  const minimum = Number(minText);
  const maximum = Number(maxText);
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum >= maximum) {
    throw new Error(
      `${label}: numeric min/max must be finite and strictly ordered; ` +
      `received ${JSON.stringify(minText)}/${JSON.stringify(maxText)}`
    );
  }
  const stepText = String(stepValue ?? "").trim();
  const anyStep = stepText.toLowerCase() === "any";
  const step = stepText === "" ? 1 : Number(stepText);
  if (!anyStep && (!Number.isFinite(step) || step <= 0)) {
    throw new Error(`${label}: numeric step must be "any" or a finite positive value; received ${JSON.stringify(stepText)}`);
  }

  const arithmeticMidpoint = minimum + (maximum - minimum) / 2;
  let midpoint = arithmeticMidpoint;
  if (!anyStep) {
    const idealIndex = (arithmeticMidpoint - minimum) / step;
    const candidateIndices = [...new Set([
      Math.round(idealIndex),
      Math.floor(idealIndex),
      Math.ceil(idealIndex)
    ])].sort((left, right) =>
      Math.abs(left - idealIndex) - Math.abs(right - idealIndex) || left - right
    );
    const candidate = candidateIndices
      .map((index) => minimum + index * step)
      .find((value) => value > minimum && value < maximum);
    if (candidate === undefined) {
      throw new Error(
        `${label}: numeric min/max/step expose no distinct reachable midpoint; ` +
        `received ${JSON.stringify(minText)}/${JSON.stringify(maxText)}/${JSON.stringify(stepText || "1")}`
      );
    }
    midpoint = candidate;
  }
  const canonicalMidpoint = Number(midpoint.toPrecision(15)).toString();
  if (!Number.isFinite(Number(canonicalMidpoint))) {
    throw new Error(`${label}: canonical midpoint is not finite`);
  }
  if (!(minimum < Number(canonicalMidpoint) && Number(canonicalMidpoint) < maximum)) {
    throw new Error(`${label}: canonical midpoint must be strictly between min and max`);
  }
  return { max: maxText, mid: canonicalMidpoint, min: minText };
}

export type CaliforniaSignatureResolvedNumericEndpoints = {
  max: string;
  mid: string | null;
  min: string;
  reachableCardinality: 1 | 2 | 3;
  reason: string | null;
  sourceExpression: string;
  status: "available" | "unavailable";
  step: string;
};

/**
 * Resolve runtime values against the exact source midpoint audit. An authored
 * two-state control must still fail the strict midpoint helper, while every
 * `required` site must produce a distinct interior value.
 */
export function resolveCaliforniaSignatureNumericEndpoints(
  audit: CaliforniaSignatureNumericMidpointAudit | null,
  minValue: unknown,
  maxValue: unknown,
  stepValue: unknown,
  label = "California signature numeric control"
): CaliforniaSignatureResolvedNumericEndpoints {
  if (!audit) throw new Error(`${label}: numeric midpoint audit is missing`);
  const minText = String(minValue ?? "");
  const maxText = String(maxValue ?? "");
  const minimum = Number(minText);
  const maximum = Number(maxText);
  const stepText = String(stepValue ?? "default:1");
  if (
    audit.status === "runtime-audited" &&
    Number.isFinite(minimum) && Number.isFinite(maximum) && minimum === maximum
  ) {
    return {
      max: maxText,
      mid: null,
      min: minText,
      reason: `runtime min=${minText}; max=${maxText}; step=${stepText} has only one distinct reachable value`,
      reachableCardinality: 1,
      sourceExpression: audit.sourceExpression,
      status: "unavailable",
      step: stepText
    };
  }
  try {
    const resolved = canonicalCaliforniaSignatureNumericEndpoints(
      minValue,
      maxValue,
      stepValue,
      label
    );
    if (audit.status === "unavailable") {
      throw new Error(
        `${label}: source marks midpoint unavailable but runtime exposed distinct interior ${resolved.mid}`
      );
    }
    return {
      ...resolved,
      reason: null,
      reachableCardinality: 3,
      sourceExpression: audit.sourceExpression,
      status: "available",
      step: stepText
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      audit.status === "required" ||
      !message.includes("no distinct reachable midpoint")
    ) {
      throw error;
    }
    const min = minText;
    const max = maxText;
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || !(minimum < maximum)) {
      throw new Error(`${label}: unavailable midpoint runtime min/max are invalid`);
    }
    return {
      max,
      mid: null,
      min,
      reason: audit.status === "unavailable"
        ? audit.reason
        : `runtime min=${min}; max=${max}; step=${stepText} ` +
          "has no distinct step-valid interior value",
      sourceExpression: audit.sourceExpression,
      reachableCardinality: 2,
      status: "unavailable",
      step: stepText
    };
  }
}

export type CaliforniaSignatureCustomComponentNamespace = {
  callsiteCount: number;
  componentName: string;
  /** A destructured prop whose reviewed literal values distinguish every callsite. */
  expression: string;
  reviewedValues: readonly string[];
};

export type CaliforniaSignatureImperativeBinding = {
  /** Lexical receiver used by every reviewed addEventListener call. */
  receiverExpression: string;
  /** Exact JSX ref expression which resolves to that receiver. */
  refExpression: string;
  /** Ordered source event/handler identities; no DOM label or index participates. */
  eventTargets: readonly {
    eventName: string;
    handlerExpression: string;
  }[];
};

export type CaliforniaSignatureUnresolvedInteraction = {
  candidateFamilies: readonly CaliforniaSignatureInteractionFamily[];
  eventNames: readonly string[];
  handlerRef: string;
  reason: string;
  semanticHints: readonly string[];
  siteKey: string;
  sourceText: string;
};

export type CaliforniaSignatureInteractionFamily =
  | "canvas-discrete-pick"
  | "canvas-drag"
  | "keyboard-nudge"
  | "viewport-orbit";

export type CaliforniaSignatureLessonStep = {
  choiceCount: number;
  index: number;
  key: string;
  title: string;
};

export type CaliforniaSignatureControlSite = {
  /** Exact JSX source expression(s) whose values the driver must exercise. */
  endpointExpressions: readonly string[];
  endpointTargets: readonly CaliforniaSignatureSourceEndpointTarget[];
  /** Static upper multiplicity of the closest `.map` that creates controls. */
  expectedMultiplicity: number;
  /** `current.choices` is exact per lesson step rather than one global count. */
  lessonChoiceMultiplicity: readonly number[] | null;
  /** False only when the source expression cannot be statically cardinalized. */
  multiplicityIsExact: boolean;
  /** Null for non-numeric sites; otherwise the exact source midpoint contract. */
  numericMidpoint: CaliforniaSignatureNumericMidpointAudit | null;
  /** Closest `.map` receiver, retained to make review failures actionable. */
  renderCollection: string | null;
  /** Every enclosing map, inner first. Multiplicity is their product. */
  renderCollections: readonly string[];
  /** Source guards which must be echoed by the runtime driver. */
  sourceConditionKeys: readonly string[];
  customComponentNamespace: CaliforniaSignatureCustomComponentNamespace | null;
  /** Present only for a ref-backed imperative addEventListener surface. */
  imperativeBinding: CaliforniaSignatureImperativeBinding | null;
  /** Exact raw source handlers backing one or more semantic gestures. */
  interactionSourceHandlers: readonly {
    eventName: string;
    handlerExpression: string;
  }[] | null;
  kind: CaliforniaSignatureControlKind;
  siteKey: string;
  sourceOrdinal: number;
  sourceText: string;
};

export type CaliforniaSignatureBenchControlBlueprint = {
  benchId: SignatureLabId;
  controlSites: readonly CaliforniaSignatureControlSite[];
  lessonSteps: readonly CaliforniaSignatureLessonStep[];
  unresolvedInteractions: readonly CaliforniaSignatureUnresolvedInteraction[];
  sourcePath: string;
  sourceSha256: string;
};

export type CaliforniaSignatureSourceManifest = {
  benches: readonly CaliforniaSignatureBenchControlBlueprint[];
  blueprintSha256: string;
  componentSourceSha256: string;
  counts: {
    benches: number;
    controlSites: number;
    exactMultiplicitySites: number;
    lessonChoices: number;
    lessonSteps: number;
    unresolvedInteractions: number;
  };
  schemaVersion: number;
};

export type CaliforniaSignatureTraversalScale = {
  /** One functional axis: all states, controls, and endpoints. */
  functionalOneAxisKeys: number;
  /** Every authored lesson state on all twelve locale/viewport/theme axes. */
  lessonStateTwelveAxisRecords: number;
  /** Naive state/control/endpoint Cartesian product over all twelve axes. */
  naiveTwelveAxisKeys: number;
  /**
   * Recommended executable split: one complete functional axis, the other
 * eleven lesson-state visual axes, and an independent geometry record for
 * every endpoint on all twelve locale × viewport × theme layout axes.  The
 * one-axis functional activation proves semantics; the twelve records prove
 * the resulting UI geometry and are intentionally counted separately.
   */
  recommendedSplitRecords: number;
  projectedControlInstances: number;
  projectedEndpointActivations: number;
  unresolvedMultiplicitySites: number;
};

export type CaliforniaSignatureTraversalControl = {
  /** A stable runtime discriminator when one JSX site renders several controls. */
  instanceKey: string;
  kind: CaliforniaSignatureControlKind;
  /** Must equal a `siteKey` from the source blueprint. */
  sourceSiteKey: string;
  /**
   * Exact endpoint names exposed by the runtime driver.  Range/number controls
   * use `min`, a step-valid `mid`, and `max`; select/radio controls use every option value;
   * checkbox controls use `false` and `true`; ordinary buttons use `activate`;
   * aria-pressed buttons use `activate` and `restore`.
   */
  endpoints: readonly CaliforniaSignatureRuntimeEndpoint[];
  /** Exact source guards attributed by staging instrumentation/driver. */
  sourceConditionKeys: readonly string[];
};

export type CaliforniaSignatureRuntimeEndpoint = {
  /** Must name a source-derived endpoint target; never generated from DOM alone. */
  sourceTargetKey: string;
  /** Stable identity for mapped option endpoints; `direct` otherwise. */
  instanceKey: string;
  /** Exact runtime value used for activation and frozen evidence. */
  value: string;
};

export type CaliforniaSignatureSemanticActionStep =
  | {
      event: "click" | "contextmenu" | "pointercancel" | "pointerdown" |
        "pointerleave" | "pointermove" | "pointerup";
      type: "pointer";
      /** Coordinates are fractions of the exact attributed surface box. */
      x: number;
      y: number;
    }
  | {
      key: string;
      type: "key";
    };

export type CaliforniaSignatureSemanticEndpointAction = {
  activationEndpoint: string;
  sourceEventTargetKey: string;
  steps: readonly CaliforniaSignatureSemanticActionStep[];
};

export type CaliforniaSignatureSemanticInteractionRegistryEntry = {
  benchId: SignatureLabId;
  endpointActions: readonly CaliforniaSignatureSemanticEndpointAction[];
  siteKey: string;
  /** Exact ordered semantic-target expression from the source blueprint. */
  sourceHandlerRef: string;
};

export type CaliforniaSignatureTraversalDriver = {
  /**
   * Reach a step even when earlier questions gate Next.  Implementations must
   * answer (without assuming correctness), advance one step at a time, and
   * verify the visible `Step n of m` state before returning.
   */
  unlockLessonStep(
    bench: CaliforniaSignatureBenchControlBlueprint,
    step: CaliforniaSignatureLessonStep
  ): Promise<void>;
  /**
   * Resolve every control reachable from this step to its source site.  Before
   * returning, the driver must reversibly activate every group/select/radio/
   * aria-pressed branch and encode the replay path in `instanceKey`; returning
   * only the controls visible in the default DOM is insufficient.  Later,
   * `activateEndpoint` replays that path before changing the endpoint.
   */
  controlsForStep(
    bench: CaliforniaSignatureBenchControlBlueprint,
    step: CaliforniaSignatureLessonStep
  ): Promise<readonly CaliforniaSignatureTraversalControl[]>;
  /** Exercise one endpoint and wait for deterministic model-response evidence. */
  activateEndpoint(
    control: CaliforniaSignatureTraversalControl,
    endpoint: CaliforniaSignatureRuntimeEndpoint
  ): Promise<void>;
  /** Run collision, clipping, touch-target, canvas-text, and network gates. */
  runGates(exactStateKey: string): Promise<void>;
  /** Restore the measured default before the next independent endpoint. */
  restoreDefault(): Promise<void>;
};

export type CaliforniaSignatureTraversalEvidence = {
  coveredKeys: string[];
  sourceSitePeakMultiplicity: ReadonlyMap<string, number>;
};

export type CaliforniaSignatureReviewedRuntimeSnapshot = {
  blueprintSha256: string;
  keyCount: number;
  keysSha256: string;
  schemaVersion: number;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeSourceText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function assertSignatureBenchThemeIndependent(sourcePath: string, source: string) {
  const themeSensitive = /(?:prefers-color-scheme|data-theme|useTheme\s*\(|classList\.(?:add|remove|toggle)\(\s*["']dark|\bdark:|\.dark(?:\s|[,{.#:]))/;
  if (themeSensitive.test(source)) {
    throw new Error(
      `${sourcePath}: theme-sensitive bench source invalidates the six-axis endpoint geometry split; ` +
      "run every endpoint on both themes or re-review the theme contract"
    );
  }
}

function propertyName(node: ts.PropertyName, sourceFile: ts.SourceFile) {
  return ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)
    ? node.text
    : normalizeSourceText(node.getText(sourceFile));
}

function objectProperty(
  object: ts.ObjectLiteralExpression,
  name: string,
  sourceFile: ts.SourceFile
) {
  return object.properties.find((property): property is ts.PropertyAssignment =>
    ts.isPropertyAssignment(property) && propertyName(property.name, sourceFile) === name
  )?.initializer ?? null;
}

function stringValue(node: ts.Expression | null, sourceFile: ts.SourceFile) {
  if (!node) return "";
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return normalizeSourceText(node.getText(sourceFile));
}

function arrayLength(node: ts.Expression | null) {
  return node && ts.isArrayLiteralExpression(node) ? node.elements.length : 0;
}

function topLevelArrayInitializers(sourceFile: ts.SourceFile) {
  const arrays = new Map<string, ts.ArrayLiteralExpression>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.initializer &&
          ts.isArrayLiteralExpression(declaration.initializer)
        ) {
          arrays.set(declaration.name.text, declaration.initializer);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return arrays;
}

function lessonSteps(sourceFile: ts.SourceFile, arrays: Map<string, ts.ArrayLiteralExpression>) {
  const steps = arrays.get("STEPS");
  if (!steps) throw new Error(`${sourceFile.fileName}: missing literal STEPS array`);
  return steps.elements.map((element, index): CaliforniaSignatureLessonStep => {
    if (!ts.isObjectLiteralExpression(element)) {
      throw new Error(`${sourceFile.fileName}: STEPS[${index}] must remain an object literal`);
    }
    const title = stringValue(objectProperty(element, "title", sourceFile), sourceFile);
    if (!title) throw new Error(`${sourceFile.fileName}: STEPS[${index}] is missing a title`);
    return {
      choiceCount: arrayLength(objectProperty(element, "choices", sourceFile)),
      index,
      key: `lesson-step:${index}`,
      title
    };
  });
}

function jsxAttribute(
  node: ts.JsxOpeningLikeElement,
  name: string,
  sourceFile: ts.SourceFile
) {
  const attribute = node.attributes.properties.find((candidate): candidate is ts.JsxAttribute =>
    ts.isJsxAttribute(candidate) && candidate.name.getText(sourceFile) === name
  );
  if (!attribute?.initializer) return null;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
    return normalizeSourceText(attribute.initializer.expression.getText(sourceFile));
  }
  return normalizeSourceText(attribute.initializer.getText(sourceFile));
}

function jsxAttributeNode(
  node: ts.JsxOpeningLikeElement,
  name: string,
  sourceFile: ts.SourceFile
) {
  return node.attributes.properties.find((candidate): candidate is ts.JsxAttribute =>
    ts.isJsxAttribute(candidate) && candidate.name.getText(sourceFile) === name
  ) ?? null;
}

const INTERACTIVE_JSX_HANDLER_NAMES = [
  "onClick",
  "onContextMenu",
  "onDoubleClick",
  "onKeyDown",
  "onKeyUp",
  "onMouseDown",
  "onPointerDown",
  "onTouchStart",
  "onWheel"
] as const;

const POINTER_GESTURE_HANDLER_NAMES = [
  "onPointerDown", "onPointerMove", "onPointerUp", "onPointerCancel", "onPointerLeave"
] as const;

const ALL_SEMANTIC_INTERACTION_HANDLER_NAMES = [
  ...INTERACTIVE_JSX_HANDLER_NAMES,
  "onPointerMove",
  "onPointerUp",
  "onPointerCancel",
  "onPointerLeave"
] as const;

const IMPERATIVE_INTERACTION_EVENTS = new Set([
  "click", "contextmenu", "dblclick", "keydown", "keyup", "mousedown",
  "pointerdown", "pointermove", "pointerup", "touchstart", "wheel"
]);

function interactiveHandlerNames(node: ts.JsxOpeningLikeElement, sourceFile: ts.SourceFile) {
  return INTERACTIVE_JSX_HANDLER_NAMES.filter((name) => jsxAttributeNode(node, name, sourceFile));
}

function jsxInteractionSourceHandlers(node: ts.JsxOpeningLikeElement, sourceFile: ts.SourceFile) {
  return [...new Set(ALL_SEMANTIC_INTERACTION_HANDLER_NAMES)]
    .flatMap((eventName) => {
      const expression = jsxAttribute(node, eventName, sourceFile);
      return expression === null ? [] : [{ eventName, handlerExpression: expression }];
    });
}

function semanticInteractionEndpointTargets(
  handlers: readonly { eventName: string; handlerExpression: string }[]
) {
  const byName = new Map(handlers.map((handler) => [handler.eventName, handler.handlerExpression]));
  const targets: CaliforniaSignatureSourceEndpointTarget[] = [];
  const add = (name: string, members: readonly string[]) => {
    const sourceExpression = members.map((eventName) => {
      const handler = byName.get(eventName);
      if (handler === undefined) throw new Error(`semantic interaction ${name} is missing ${eventName}`);
      return `${eventName}=${handler}`;
    }).join(";");
    targets.push({
      expectedMultiplicity: 1,
      key: `${name}:${sha256(sourceExpression).slice(0, 16)}`,
      multiplicityIsExact: true,
      name,
      sourceExpression
    });
  };
  const pointerMembers = POINTER_GESTURE_HANDLER_NAMES.filter((name) => byName.has(name));
  if (byName.has("onPointerDown")) {
    add(byName.has("onPointerMove") ? "drag" : "pointer-pick", pointerMembers);
  } else if (byName.has("pointerdown")) {
    const imperativePointerMembers = ["pointerdown", "pointermove", "pointerup", "pointercancel", "pointerleave"]
      .filter((name) => byName.has(name));
    add(byName.has("pointermove") ? "drag" : "pointer-pick", imperativePointerMembers);
  }
  if (byName.has("onClick")) add("click", ["onClick"]);
  if (byName.has("onContextMenu")) add("context-menu", ["onContextMenu"]);
  if (byName.has("onDoubleClick")) add("double-click", ["onDoubleClick"]);
  if (byName.has("onKeyDown")) add("key-nudge", ["onKeyDown"]);
  if (targets.length === 0) {
    throw new Error(`interaction surface has no supported semantic gesture: ${JSON.stringify(handlers)}`);
  }
  return targets;
}

function controlKind(node: ts.JsxOpeningLikeElement, sourceFile: ts.SourceFile) {
  const tag = node.tagName.getText(sourceFile);
  if (tag === "button") {
    return jsxAttribute(node, "aria-pressed", sourceFile) === null
      ? "action-button"
      : "press-button";
  }
  if (tag === "select" || tag === "textarea") return tag;
  if (tag !== "input") {
    return /^[a-z]/.test(tag) && interactiveHandlerNames(node, sourceFile).length > 0
      ? "interaction-surface"
      : null;
  }
  const inputType = jsxAttribute(node, "type", sourceFile) ?? "text";
  if (["checkbox", "number", "radio", "range"].includes(inputType)) {
    return inputType as Extract<CaliforniaSignatureControlKind, "checkbox" | "number" | "radio" | "range">;
  }
  throw new Error(`${sourceFile.fileName}: unsupported input type ${JSON.stringify(inputType)}`);
}

function mapReceivers(node: ts.Node, sourceFile: ts.SourceFile) {
  const receivers: string[] = [];
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (
      ts.isCallExpression(current) &&
      ts.isPropertyAccessExpression(current.expression) &&
      current.expression.name.text === "map"
    ) {
      receivers.push(normalizeSourceText(current.expression.expression.getText(sourceFile)));
    }
    current = current.parent;
  }
  return receivers;
}

function conditionKeys(node: ts.Node, sourceFile: ts.SourceFile) {
  const conditions: string[] = [];
  let current: ts.Node | undefined = node.parent;
  while (current && !ts.isSourceFile(current)) {
    if (ts.isConditionalExpression(current)) {
      conditions.push(normalizeSourceText(current.condition.getText(sourceFile)));
    } else if (
      ts.isBinaryExpression(current) &&
      [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(current.operatorToken.kind)
    ) {
      conditions.push(normalizeSourceText(current.left.getText(sourceFile)));
    }
    current = current.parent;
  }
  return [...new Set(conditions)].sort();
}

type StaticCollectionBound = {
  exact: boolean;
  length: number;
  lessonChoices: number[] | null;
};

type StaticCollectionAnalysis = {
  arrays: Map<string, ts.ArrayLiteralExpression>;
  bindings: ReadonlyMap<string, ts.Expression>;
  sourceFile: ts.SourceFile;
  steps: readonly CaliforniaSignatureLessonStep[];
};

function parsedStaticExpression(sourceText: string) {
  const parsed = ts.createSourceFile(
    "static-collection-expression.ts",
    `const __value = ${sourceText};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  return (parsed.statements[0] as ts.VariableStatement | undefined)
    ?.declarationList.declarations[0]?.initializer ?? null;
}

function unwrapStaticExpression(expression: ts.Expression): ts.Expression {
  if (
    ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) || ts.isNonNullExpression(expression)
  ) return unwrapStaticExpression(expression.expression);
  return expression;
}

function staticCallArgument(expression: ts.Expression, analysis: StaticCollectionAnalysis) {
  const unwrapped = unwrapStaticExpression(expression);
  return ts.isIdentifier(unwrapped) && analysis.bindings.has(unwrapped.text)
    ? analysis.bindings.get(unwrapped.text)!
    : expression;
}

function withStaticBindingCycleGuard<T>(
  kind: string,
  name: string,
  seen: ReadonlySet<string>,
  unresolved: T,
  resolve: (nextSeen: ReadonlySet<string>) => T
) {
  const key = `binding:${kind}:${name}`;
  if (seen.has(key)) return unresolved;
  return resolve(new Set(seen).add(key));
}

const namedStaticInitializerCache = new WeakMap<ts.SourceFile, Map<string, readonly ts.Expression[]>>();

function lexicalStaticInitializers(identifier: ts.Identifier, sourceFile: ts.SourceFile) {
  if (identifier.getSourceFile() !== sourceFile) return [];
  let current: ts.Node | undefined = identifier.parent;
  while (current) {
    if (ts.isBlock(current) || ts.isSourceFile(current)) {
      const statements = current.statements.filter((statement) => statement.pos < identifier.pos);
      const candidates = statements.flatMap((statement) => {
        if (!ts.isVariableStatement(statement)) return [];
        return statement.declarationList.declarations.flatMap((declaration) =>
          ts.isIdentifier(declaration.name) && declaration.name.text === identifier.text &&
          declaration.initializer
            ? [declaration.initializer]
            : []
        );
      });
      if (candidates.length > 0) return [candidates.at(-1)!];
    }
    current = current.parent;
  }
  return [];
}

function namedStaticInitializers(name: string, sourceFile: ts.SourceFile) {
  const sourceCache = namedStaticInitializerCache.get(sourceFile) ?? new Map();
  namedStaticInitializerCache.set(sourceFile, sourceCache);
  const cached = sourceCache.get(name);
  if (cached) return [...cached];
  const expressions: ts.Expression[] = [];
  const setterNames = new Set<string>();
  const parameterOwners: Array<{ functionName: string; parameterIndex: number }> = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      if (ts.isIdentifier(node.name) && node.name.text === name) {
        expressions.push(node.initializer);
      } else if (
        ts.isArrayBindingPattern(node.name) && ts.isCallExpression(node.initializer) &&
        ts.isIdentifier(node.initializer.expression) && node.initializer.expression.text === "useState"
      ) {
        const stateName = node.name.elements[0];
        if (stateName && ts.isBindingElement(stateName) && ts.isIdentifier(stateName.name) &&
          stateName.name.text === name && node.initializer.arguments[0]) {
          expressions.push(node.initializer.arguments[0]);
          const setter = node.name.elements[1];
          if (setter && ts.isBindingElement(setter) && ts.isIdentifier(setter.name)) {
            setterNames.add(setter.name.text);
          }
        }
      }
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left) && node.left.text === name
    ) {
      // A `let` declared before a retry/calibration loop often receives its
      // finite source value in a later assignment (for example a fixed array
      // selected from a literal target table).  Track those writes as source
      // variants; compound/property writes are deliberately excluded.
      expressions.push(node.right);
    }
    if (ts.isFunctionDeclaration(node) && node.name) {
      node.parameters.forEach((parameter, parameterIndex) => {
        if (ts.isIdentifier(parameter.name) && parameter.name.text === name) {
          parameterOwners.push({ functionName: node.name!.text, parameterIndex });
        }
      });
    } else if (
      ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      const functionName = node.name.text;
      node.initializer.parameters.forEach((parameter, parameterIndex) => {
        if (ts.isIdentifier(parameter.name) && parameter.name.text === name) {
          parameterOwners.push({ functionName, parameterIndex });
        }
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  // A lexical variable/state declaration is a stronger source binding than an
  // unrelated same-named function parameter elsewhere in the file.  Only use
  // callsite arguments when a name has no declaration of its own; otherwise a
  // common short parameter such as `B` can contaminate a JSX receiver `B`.
  if (expressions.length === 0 && parameterOwners.length > 0) {
    const visitCallsites = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        for (const owner of parameterOwners) {
          if (node.expression.text === owner.functionName && node.arguments[owner.parameterIndex]) {
            expressions.push(node.arguments[owner.parameterIndex]);
          }
        }
      }
      ts.forEachChild(node, visitCallsites);
    };
    visitCallsites(sourceFile);
  }
  if (setterNames.size > 0) {
    const visitSetters = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
        setterNames.has(node.expression.text) && node.arguments[0]
      ) {
        const value = node.arguments[0];
        if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) {
          expressions.push(...staticReturnExpressions(value as typeof value & { body: ts.ConciseBody }));
        } else {
          expressions.push(value);
        }
      }
      ts.forEachChild(node, visitSetters);
    };
    visitSetters(sourceFile);
  }
  sourceCache.set(name, expressions);
  return expressions;
}

type NamedStaticFunction = ts.FunctionLikeDeclaration & { body: ts.ConciseBody };

const namedStaticFunctionCache = new WeakMap<
  ts.SourceFile,
  Map<string, readonly NamedStaticFunction[]>
>();

function namedStaticFunctions(name: string, sourceFile: ts.SourceFile): NamedStaticFunction[] {
  const sourceCache = namedStaticFunctionCache.get(sourceFile) ??
    new Map<string, readonly NamedStaticFunction[]>();
  namedStaticFunctionCache.set(sourceFile, sourceCache);
  const cached = sourceCache.get(name);
  if (cached) return [...cached];
  const functions: NamedStaticFunction[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name && node.body) {
      functions.push(node as ts.FunctionDeclaration & { body: ts.Block });
    } else if (
      ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name &&
      node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      functions.push(node.initializer as typeof functions[number]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  sourceCache.set(name, functions);
  return functions;
}

function staticReturnExpressions(fn: ts.FunctionLikeDeclaration & { body: ts.ConciseBody }) {
  if (!ts.isBlock(fn.body)) return [fn.body];
  const returns: ts.Expression[] = [];
  const visit = (node: ts.Node) => {
    if (node !== fn.body && ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression) returns.push(node.expression);
    ts.forEachChild(node, visit);
  };
  visit(fn.body);
  return returns;
}

function combineStaticBounds(bounds: readonly StaticCollectionBound[]): StaticCollectionBound {
  if (bounds.length === 0) return { exact: false, length: 1, lessonChoices: null };
  return {
    exact: bounds.every((bound) => bound.exact),
    length: Math.max(...bounds.map((bound) => bound.length)),
    lessonChoices: null
  };
}

function staticObjectPropertyExpressions(
  expression: ts.Expression,
  property: string,
  analysis: StaticCollectionAnalysis,
  seen: ReadonlySet<string>
): ts.Expression[] {
  const node = unwrapStaticExpression(expression);
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.flatMap((candidate) => {
      if (ts.isPropertyAssignment(candidate) && propertyName(candidate.name, analysis.sourceFile) === property) {
        return [candidate.initializer];
      }
      if (ts.isShorthandPropertyAssignment(candidate) && candidate.name.text === property) {
        return namedStaticInitializers(property, analysis.sourceFile);
      }
      return [];
    });
  }
  if (ts.isIdentifier(node)) {
    const binding = analysis.bindings.get(node.text);
    if (binding) {
      return withStaticBindingCycleGuard("object", node.text, seen, [], (nextSeen) =>
        staticObjectPropertyExpressions(binding, property, analysis, nextSeen)
      );
    }
    const key = `object:${node.text}:${property}`;
    if (seen.has(key)) return [];
    const nextSeen = new Set(seen).add(key);
    const lexical = lexicalStaticInitializers(node, analysis.sourceFile);
    const initializers = lexical.length > 0
      ? lexical
      : namedStaticInitializers(node.text, analysis.sourceFile);
    return initializers.flatMap((initializer) =>
      staticObjectPropertyExpressions(initializer, property, analysis, nextSeen)
    );
  }
  if (ts.isElementAccessExpression(node)) {
    const bases = staticExpressionVariants(node.expression, analysis, seen);
    return bases.flatMap((base) => {
      const unwrapped = unwrapStaticExpression(base);
      if (ts.isArrayLiteralExpression(unwrapped)) {
        return unwrapped.elements.filter(ts.isExpression).flatMap((element) =>
          staticObjectPropertyExpressions(element, property, analysis, seen)
        );
      }
      if (ts.isObjectLiteralExpression(unwrapped)) {
        const direct = objectProperty(unwrapped, property, analysis.sourceFile);
        if (direct) return [direct];
        return unwrapped.properties.flatMap((candidate) =>
          ts.isPropertyAssignment(candidate)
            ? staticObjectPropertyExpressions(candidate.initializer, property, analysis, seen)
            : []
        );
      }
      return [];
    });
  }
  if (ts.isConditionalExpression(node)) {
    return [node.whenTrue, node.whenFalse].flatMap((branch) =>
      staticObjectPropertyExpressions(branch, property, analysis, seen)
    );
  }
  if (
    ts.isBinaryExpression(node) &&
    [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)
  ) {
    return [node.left, node.right].flatMap((branch) =>
      staticObjectPropertyExpressions(branch, property, analysis, seen)
    );
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    if (
      node.expression.text === "useRef" && property === "current" &&
      node.arguments[0]
    ) {
      return [node.arguments[0]];
    }
    const callKey = `call:object:${node.expression.text}`;
    if (seen.has(callKey)) return [];
    const callSeen = new Set(seen).add(callKey);
    return namedStaticFunctions(node.expression.text, analysis.sourceFile).flatMap((fn) => {
      const bindings = new Map(analysis.bindings);
      fn.parameters.forEach((parameter, index) => {
        if (ts.isIdentifier(parameter.name) && node.arguments[index]) {
          const argument = staticCallArgument(node.arguments[index], analysis);
          if (!ts.isIdentifier(argument) || argument.text !== parameter.name.text) {
            bindings.set(parameter.name.text, argument);
          }
        }
      });
      const nested = { ...analysis, bindings };
      return staticReturnExpressions(fn).flatMap((returned) =>
        staticObjectPropertyExpressions(returned, property, nested, callSeen)
      );
    });
  }
  if (ts.isCallExpression(node)) {
    const variants = staticExpressionVariants(node, analysis, seen);
    if (!(variants.length === 1 && variants[0] === node)) {
      return variants.flatMap((variant) =>
        staticObjectPropertyExpressions(variant, property, analysis, seen)
      );
    }
  }
  return [];
}

function staticExpressionVariants(
  expression: ts.Expression,
  analysis: StaticCollectionAnalysis,
  seen: ReadonlySet<string>
): ts.Expression[] {
  const node = unwrapStaticExpression(expression);
  if (ts.isIdentifier(node)) {
    const binding = analysis.bindings.get(node.text);
    if (binding) {
      return withStaticBindingCycleGuard("variant", node.text, seen, [], (nextSeen) =>
        staticExpressionVariants(binding, analysis, nextSeen)
      );
    }
    const key = `variant:${node.text}`;
    if (seen.has(key)) return [];
    const lexical = lexicalStaticInitializers(node, analysis.sourceFile);
    const initializers = lexical.length > 0
      ? lexical
      : namedStaticInitializers(node.text, analysis.sourceFile);
    if (initializers.length === 0) return [node];
    const nextSeen = new Set(seen).add(key);
    return initializers.flatMap((initializer) => staticExpressionVariants(initializer, analysis, nextSeen));
  }
  if (ts.isPropertyAccessExpression(node)) {
    const properties = staticObjectPropertyExpressions(
      node.expression,
      node.name.text,
      analysis,
      seen
    );
    return properties.length > 0
      ? properties.flatMap((property) => staticExpressionVariants(property, analysis, seen))
      : [node];
  }
  if (ts.isElementAccessExpression(node)) {
    const values = staticExpressionVariants(node.expression, analysis, seen).flatMap((base) => {
      const unwrapped = unwrapStaticExpression(base);
      const index = node.argumentExpression && ts.isStringLiteralLike(node.argumentExpression)
        ? node.argumentExpression.text
        : node.argumentExpression && ts.isNumericLiteral(node.argumentExpression)
          ? node.argumentExpression.text
          : null;
      if (ts.isArrayLiteralExpression(unwrapped)) {
        if (index !== null && /^\d+$/.test(index)) {
          const selected = unwrapped.elements[Number(index)];
          return selected && ts.isExpression(selected) ? [selected] : [];
        }
        return unwrapped.elements.filter(ts.isExpression);
      }
      if (ts.isObjectLiteralExpression(unwrapped)) {
        const properties = unwrapped.properties.filter(ts.isPropertyAssignment);
        if (index !== null) {
          return properties.filter((property) =>
            propertyName(property.name, analysis.sourceFile) === index
          ).map((property) => property.initializer);
        }
        return properties.map((property) => property.initializer);
      }
      return [];
    });
    return values.length > 0
      ? values.flatMap((value) => staticExpressionVariants(value, analysis, seen))
      : [node];
  }
  if (ts.isConditionalExpression(node)) {
    return [node.whenTrue, node.whenFalse].flatMap((branch) =>
      staticExpressionVariants(branch, analysis, seen)
    );
  }
  if (
    ts.isBinaryExpression(node) &&
    [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)
  ) {
    return [node.left, node.right].flatMap((branch) =>
      staticExpressionVariants(branch, analysis, seen)
    );
  }
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    const owner = node.expression.expression;
    const method = node.expression.name.text;
    if (method === "find") {
      return staticExpressionVariants(owner, analysis, seen).flatMap((collection) => {
        const unwrapped = unwrapStaticExpression(collection);
        return ts.isArrayLiteralExpression(unwrapped)
          ? unwrapped.elements.filter(ts.isExpression)
          : [];
      });
    }
    if (
      ts.isIdentifier(owner) && owner.text === "Object" && method === "fromEntries" &&
      node.arguments[0] && ts.isCallExpression(node.arguments[0]) &&
      ts.isPropertyAccessExpression(node.arguments[0].expression) &&
      node.arguments[0].expression.name.text === "map"
    ) {
      const mappedSource = node.arguments[0].expression.expression;
      return staticExpressionVariants(mappedSource, analysis, seen).flatMap((collection) => {
        const unwrapped = unwrapStaticExpression(collection);
        return ts.isArrayLiteralExpression(unwrapped)
          ? unwrapped.elements.filter(ts.isExpression)
          : [];
      });
    }
  }
  return [node];
}

function staticNumericUpper(
  expression: ts.Expression,
  analysis: StaticCollectionAnalysis,
  seen: ReadonlySet<string>
): number | null {
  const node = unwrapStaticExpression(expression);
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) {
    const value = staticNumericUpper(node.operand, analysis, seen);
    return value === null ? null : -value;
  }
  if (ts.isIdentifier(node)) {
    const binding = analysis.bindings.get(node.text);
    if (binding) {
      return withStaticBindingCycleGuard("number", node.text, seen, null, (nextSeen) =>
        staticNumericUpper(binding, analysis, nextSeen)
      );
    }
    const key = `number:${node.text}`;
    if (seen.has(key)) return null;
    const lexical = lexicalStaticInitializers(node, analysis.sourceFile);
    const initializers = lexical.length > 0
      ? lexical
      : namedStaticInitializers(node.text, analysis.sourceFile);
    const values = initializers
      .map((initializer) => staticNumericUpper(initializer, analysis, new Set(seen).add(key)))
      .filter((value): value is number => value !== null);
    return values.length > 0 ? Math.max(...values) : null;
  }
  if (ts.isPropertyAccessExpression(node) && node.name.text === "length") {
    const bound = staticCollectionBoundForExpression(node.expression, analysis, seen);
    return bound.exact ? bound.length : null;
  }
  if (ts.isPropertyAccessExpression(node)) {
    const values = staticObjectPropertyExpressions(node.expression, node.name.text, analysis, seen)
      .map((value) => staticNumericUpper(value, analysis, seen))
      .filter((value): value is number => value !== null);
    return values.length > 0 ? Math.max(...values) : null;
  }
  if (ts.isConditionalExpression(node)) {
    const values = [node.whenTrue, node.whenFalse]
      .map((branch) => staticNumericUpper(branch, analysis, seen))
      .filter((value): value is number => value !== null);
    return values.length === 2 ? Math.max(...values) : null;
  }
  if (ts.isBinaryExpression(node)) {
    const left = staticNumericUpper(node.left, analysis, seen);
    const right = staticNumericUpper(node.right, analysis, seen);
    if (left === null || right === null) return null;
    if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) return left + right;
    if (node.operatorToken.kind === ts.SyntaxKind.MinusToken) return left - right;
    if (node.operatorToken.kind === ts.SyntaxKind.AsteriskToken) return left * right;
    if (node.operatorToken.kind === ts.SyntaxKind.SlashToken && right !== 0) return left / right;
  }
  if (ts.isCallExpression(node)) {
    if (
      ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "Math"
    ) {
      const method = node.expression.name.text;
      const values = node.arguments.map((argument) =>
        staticNumericUpper(argument, analysis, seen)
      );
      if (values.every((value): value is number => value !== null)) {
        if (method === "min") return Math.min(...values);
        if (method === "max") return Math.max(...values);
        if (values.length === 1 && method === "floor") return Math.floor(values[0]!);
        if (values.length === 1 && method === "ceil") return Math.ceil(values[0]!);
        if (values.length === 1 && method === "abs") return Math.abs(values[0]!);
      }
    }
    if (ts.isIdentifier(node.expression)) {
      const callKey = `call:number:${node.expression.text}`;
      if (seen.has(callKey)) return null;
      const callSeen = new Set(seen).add(callKey);
      const values = namedStaticFunctions(node.expression.text, analysis.sourceFile).flatMap((fn) => {
        const bindings = new Map(analysis.bindings);
        fn.parameters.forEach((parameter, index) => {
          if (ts.isIdentifier(parameter.name) && node.arguments[index]) {
            const argument = staticCallArgument(node.arguments[index], analysis);
            if (!ts.isIdentifier(argument) || argument.text !== parameter.name.text) {
              bindings.set(parameter.name.text, argument);
            }
          }
        });
        const nested = { ...analysis, bindings };
        return staticReturnExpressions(fn).map((returned) =>
          staticNumericUpper(returned, nested, callSeen)
        );
      }).filter((value): value is number => value !== null);
      if (values.length > 0) return Math.max(...values);
    }
  }
  return null;
}

const staticSourceInputMaximumCache = new WeakMap<ts.SourceFile, number | null>();

function staticSourceInputMaximum(analysis: StaticCollectionAnalysis) {
  if (staticSourceInputMaximumCache.has(analysis.sourceFile)) {
    return staticSourceInputMaximumCache.get(analysis.sourceFile)!;
  }
  // Re-entrant numeric resolution of a `max` expression must not recursively
  // start another whole-source max scan.
  staticSourceInputMaximumCache.set(analysis.sourceFile, null);
  const maxima: number[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const maximum = jsxAttributeNode(node, "max", analysis.sourceFile);
      if (maximum?.initializer) {
        const expression = ts.isJsxExpression(maximum.initializer)
          ? maximum.initializer.expression
          : ts.isStringLiteral(maximum.initializer)
            ? maximum.initializer
            : null;
        if (expression) {
          const value = staticNumericUpper(expression, analysis, new Set());
          if (value !== null) maxima.push(value);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(analysis.sourceFile);
  const result = maxima.length > 0 ? Math.max(...maxima) : null;
  staticSourceInputMaximumCache.set(analysis.sourceFile, result);
  return result;
}

function staticCountedLoopCeiling(loop: ts.ForStatement, analysis: StaticCollectionAnalysis) {
  if (!loop.initializer || !ts.isVariableDeclarationList(loop.initializer) ||
    loop.initializer.declarations.length !== 1 || !loop.condition) return null;
  const declaration = loop.initializer.declarations[0]!;
  if (!ts.isIdentifier(declaration.name) || !declaration.initializer) return null;
  const start = staticNumericUpper(declaration.initializer, analysis, new Set());
  if (start === null || !ts.isBinaryExpression(loop.condition)) return null;
  const variable = declaration.name.text;
  const inclusive = loop.condition.operatorToken.kind === ts.SyntaxKind.LessThanEqualsToken;
  if (!inclusive && loop.condition.operatorToken.kind !== ts.SyntaxKind.LessThanToken) return null;
  let quadratic = false;
  if (ts.isIdentifier(loop.condition.left) && loop.condition.left.text === variable) {
    quadratic = false;
  } else if (
    ts.isBinaryExpression(loop.condition.left) &&
    loop.condition.left.operatorToken.kind === ts.SyntaxKind.AsteriskToken &&
    ts.isIdentifier(loop.condition.left.left) && loop.condition.left.left.text === variable &&
    ts.isIdentifier(loop.condition.left.right) && loop.condition.left.right.text === variable
  ) {
    quadratic = true;
  } else {
    return null;
  }
  const end = staticNumericUpper(loop.condition.right, analysis, new Set()) ??
    staticSourceInputMaximum(analysis);
  if (end === null) return null;
  const last = quadratic ? Math.floor(Math.sqrt(Math.max(0, end))) : Math.floor(end);
  return Math.max(0, last - start + (inclusive ? 1 : 0));
}

const activeStaticAccumulatorScans = new WeakMap<ts.SourceFile, Set<string>>();

function staticAccumulatorCeiling(name: string, analysis: StaticCollectionAnalysis) {
  const active = activeStaticAccumulatorScans.get(analysis.sourceFile) ?? new Set();
  activeStaticAccumulatorScans.set(analysis.sourceFile, active);
  if (active.has(name)) return null;
  active.add(name);
  let pushed = false;
  const caps: number[] = [];
  const loopCaps: number[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) && node.expression.expression.text === name &&
      node.expression.name.text === "push"
    ) {
      pushed = true;
      let owner: ts.Node | undefined = node.parent;
      while (owner && !ts.isFunctionLike(owner)) {
        if (ts.isForStatement(owner)) {
          const cap = staticCountedLoopCeiling(owner, analysis);
          if (cap !== null) loopCaps.push(cap * Math.max(1, node.arguments.length));
          break;
        }
        if (ts.isForOfStatement(owner)) {
          const bound = staticCollectionBoundForExpression(owner.expression, analysis, new Set());
          if (bound.exact) loopCaps.push(bound.length * Math.max(1, node.arguments.length));
          break;
        }
        owner = owner.parent;
      }
    }
    if (
      ts.isBinaryExpression(node) &&
      [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.GreaterThanEqualsToken].includes(node.operatorToken.kind) &&
      ts.isPropertyAccessExpression(node.left) && ts.isIdentifier(node.left.expression) &&
      node.left.expression.text === name && node.left.name.text === "length"
    ) {
      const cap = staticNumericUpper(node.right, analysis, new Set());
      if (cap !== null) caps.push(cap);
    }
    ts.forEachChild(node, visit);
  };
  visit(analysis.sourceFile);
  active.delete(name);
  if (!pushed) return null;
  if (caps.length > 0) return Math.max(...caps);
  return loopCaps.length > 0 ? Math.max(...loopCaps) : null;
}

const staticStateCollectionCeilingCache = new WeakMap<ts.SourceFile, Map<string, number | null>>();

function staticStateCollectionCeiling(name: string, analysis: StaticCollectionAnalysis) {
  const sourceCache = staticStateCollectionCeilingCache.get(analysis.sourceFile) ?? new Map();
  staticStateCollectionCeilingCache.set(analysis.sourceFile, sourceCache);
  if (sourceCache.has(name)) return sourceCache.get(name)!;

  // Install a re-entry sentinel before following any initializer or setter.
  // A state callback can return the state identifier itself, and a helper can
  // mutually recurse through another helper; neither is proof of a finite
  // cardinality and neither may overflow the analyzer stack.
  sourceCache.set(name, null);
  const setterNames = new Set<string>();
  const stateInitializers: ts.Expression[] = [];
  const visitState = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) &&
      node.initializer && ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === "useState"
    ) {
      const state = node.name.elements[0];
      const setter = node.name.elements[1];
      if (
        state && setter && ts.isBindingElement(state) && ts.isIdentifier(state.name) &&
        state.name.text === name && ts.isBindingElement(setter) && ts.isIdentifier(setter.name)
      ) {
        setterNames.add(setter.name.text);
        const initializer = node.initializer.arguments[0];
        if (initializer) {
          if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
            stateInitializers.push(...staticReturnExpressions(initializer));
          } else {
            stateInitializers.push(initializer);
          }
        }
      }
    }
    ts.forEachChild(node, visitState);
  };
  visitState(analysis.sourceFile);
  if (setterNames.size === 0 || stateInitializers.length === 0) {
    return null;
  }

  const explicitCaps: number[] = [];
  const inspectExplicitCap = (node: ts.Node) => {
    if (
      ts.isBinaryExpression(node) &&
      [
        ts.SyntaxKind.LessThanToken,
        ts.SyntaxKind.LessThanEqualsToken,
        ts.SyntaxKind.GreaterThanToken,
        ts.SyntaxKind.GreaterThanEqualsToken
      ].includes(node.operatorToken.kind) &&
      ts.isPropertyAccessExpression(node.left) && node.left.name.text === "length"
    ) {
      const cap = staticNumericUpper(node.right, analysis, new Set());
      if (cap !== null) {
        explicitCaps.push(
          cap + (node.operatorToken.kind === ts.SyntaxKind.LessThanEqualsToken ? 1 : 0)
        );
      }
    }
    if (
      ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "slice" && node.arguments[1]
    ) {
      const cap = staticNumericUpper(node.arguments[1], analysis, new Set());
      if (cap !== null) explicitCaps.push(cap);
    }
    ts.forEachChild(node, inspectExplicitCap);
  };

  const directSetterValues: ts.Expression[] = [];
  const callbackSetterValues: Array<ts.ArrowFunction | ts.FunctionExpression> = [];
  let escapedSetterReference = false;
  const visitSetters = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
      setterNames.has(node.expression.text) && node.arguments[0]
    ) {
      const value = node.arguments[0];
      inspectExplicitCap(value);
      if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) {
        callbackSetterValues.push(value);
      } else {
        directSetterValues.push(value);
      }
    } else if (ts.isIdentifier(node) && setterNames.has(node.text)) {
      const parent = node.parent;
      const isDeclaration = ts.isBindingElement(parent) && parent.name === node;
      const isDirectCall = ts.isCallExpression(parent) && parent.expression === node;
      if (!isDeclaration && !isDirectCall) escapedSetterReference = true;
    }
    ts.forEachChild(node, visitSetters);
  };
  visitSetters(analysis.sourceFile);

  if (escapedSetterReference) return null;

  type Candidate = { bound: StaticCollectionBound; expression: ts.Expression };
  const candidates: Candidate[] = [];
  let unresolved = false;
  const addCandidate = (expression: ts.Expression, scopedAnalysis = analysis) => {
    const bound = staticCollectionBoundForExpression(expression, scopedAnalysis, new Set());
    if (!bound.exact) {
      unresolved = true;
      return;
    }
    candidates.push({ bound, expression });
  };
  stateInitializers.forEach((initializer) => addCandidate(initializer));
  directSetterValues.forEach((value) => addCandidate(value));
  if (unresolved || candidates.length === 0) return null;

  // Functional state setters receive every source-proven state shape.  Their
  // returned collections must be statically bounded and non-expanding unless
  // the source itself supplies an explicit cap.  This rejects an apparently
  // finite `[...previous, value]` callback that could grow on every click.
  const directMaximum = Math.max(...candidates.map(({ bound }) => bound.length));
  for (const callback of callbackSetterValues) {
    const returned = staticReturnExpressions(callback);
    if (returned.length === 0) return null;
    const parameter = callback.parameters[0];
    if (!parameter || !ts.isIdentifier(parameter.name)) return null;
    // Snapshot the source-proven seeds: `addCandidate` records the returned
    // shapes for the final maximum, but those records are not new source state
    // variants to iterate again during this same callback analysis.
    for (const seed of [...candidates]) {
      const bindings = new Map(analysis.bindings);
      bindings.set(parameter.name.text, seed.expression);
      const nested = { ...analysis, bindings };
      for (const expression of returned) addCandidate(expression, nested);
    }
  }
  if (unresolved) return null;
  const returnedMaximum = Math.max(...candidates.map(({ bound }) => bound.length));
  if (explicitCaps.length === 0 && returnedMaximum > directMaximum) return null;
  const result = Math.max(returnedMaximum, ...explicitCaps);
  sourceCache.set(name, result);
  return result;
}

function staticObjectKeyUpper(
  expression: ts.Expression,
  analysis: StaticCollectionAnalysis,
  seen: ReadonlySet<string>
) {
  const variants = staticExpressionVariants(expression, analysis, seen);
  const counts = variants.map((variant) => unwrapStaticExpression(variant))
    .filter(ts.isObjectLiteralExpression)
    .map((object) => object.properties.filter((property) =>
      ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property) ||
      ts.isMethodDeclaration(property)
    ).length);
  return counts.length === variants.length && counts.length > 0 ? Math.max(...counts) : null;
}

function staticCollectionBoundForExpression(
  expression: ts.Expression,
  analysis: StaticCollectionAnalysis,
  seen: ReadonlySet<string>
): StaticCollectionBound {
  const node = unwrapStaticExpression(expression);
  if (ts.isArrayLiteralExpression(node)) {
    const parts = node.elements.map((element) => {
      if (ts.isSpreadElement(element)) {
        return staticCollectionBoundForExpression(element.expression, analysis, seen);
      }
      return { exact: true, length: 1, lessonChoices: null };
    });
    return {
      exact: parts.every((part) => part.exact),
      length: parts.reduce((sum, part) => sum + part.length, 0),
      lessonChoices: null
    };
  }
  if (
    ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
    node.expression.text === "Array" && node.arguments?.[0]
  ) {
    const length = staticNumericUpper(node.arguments[0], analysis, seen);
    return length === null
      ? { exact: false, length: 1, lessonChoices: null }
      : { exact: true, length: Math.max(0, Math.floor(length)), lessonChoices: null };
  }
  if (ts.isIdentifier(node)) {
    const binding = analysis.bindings.get(node.text);
    if (binding) {
      return withStaticBindingCycleGuard(
        "collection",
        node.text,
        seen,
        { exact: false, length: 1, lessonChoices: null },
        (nextSeen) => staticCollectionBoundForExpression(binding, analysis, nextSeen)
      );
    }
    const literalArray = analysis.arrays.get(node.text);
    if (literalArray && literalArray.elements.length > 0) {
      return { exact: true, length: literalArray.elements.length, lessonChoices: null };
    }
    const stateCap = staticStateCollectionCeiling(node.text, analysis);
    if (stateCap !== null) return { exact: true, length: stateCap, lessonChoices: null };
    const cap = staticAccumulatorCeiling(node.text, analysis);
    if (cap !== null) return { exact: true, length: cap, lessonChoices: null };
    if (literalArray) {
      return { exact: true, length: literalArray.elements.length, lessonChoices: null };
    }
    const key = `collection:${node.text}`;
    if (seen.has(key)) return { exact: false, length: 1, lessonChoices: null };
    const lexical = lexicalStaticInitializers(node, analysis.sourceFile);
    const initializers = lexical.length > 0
      ? lexical
      : namedStaticInitializers(node.text, analysis.sourceFile);
    return combineStaticBounds(initializers.map((initializer) =>
      staticCollectionBoundForExpression(initializer, analysis, new Set(seen).add(key))
    ));
  }
  if (ts.isConditionalExpression(node)) {
    return combineStaticBounds([node.whenTrue, node.whenFalse].map((branch) =>
      staticCollectionBoundForExpression(branch, analysis, seen)
    ));
  }
  if (
    ts.isBinaryExpression(node) &&
    [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)
  ) {
    return combineStaticBounds([node.left, node.right].map((branch) =>
      staticCollectionBoundForExpression(branch, analysis, seen)
    ));
  }
  if (ts.isPropertyAccessExpression(node)) {
    const variants = staticObjectPropertyExpressions(node.expression, node.name.text, analysis, seen);
    if (variants.length > 0) {
      return combineStaticBounds(variants.map((variant) =>
        staticCollectionBoundForExpression(variant, analysis, seen)
      ));
    }
  }
  if (ts.isCallExpression(node)) {
    if (ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      if (["fill", "filter", "map", "slice", "sort"].includes(method)) {
        return staticCollectionBoundForExpression(node.expression.expression, analysis, seen);
      }
      if (
        ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "Object" &&
        method === "keys" && node.arguments[0]
      ) {
        const count = staticObjectKeyUpper(node.arguments[0], analysis, seen);
        return count === null
          ? { exact: false, length: 1, lessonChoices: null }
          : { exact: true, length: count, lessonChoices: null };
      }
      if (
        ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "Array" &&
        method === "from" && node.arguments[0]
      ) {
        const lengths = staticObjectPropertyExpressions(node.arguments[0], "length", analysis, seen)
          .map((length) => staticNumericUpper(length, analysis, seen))
          .filter((length): length is number => length !== null);
        return lengths.length > 0
          ? { exact: true, length: Math.max(...lengths), lessonChoices: null }
          : { exact: false, length: 1, lessonChoices: null };
      }
    }
    if (ts.isIdentifier(node.expression)) {
      const callKey = `call:collection:${node.expression.text}`;
      if (seen.has(callKey)) return { exact: false, length: 1, lessonChoices: null };
      const callSeen = new Set(seen).add(callKey);
      const functions = namedStaticFunctions(node.expression.text, analysis.sourceFile);
      const bounds = functions.flatMap((fn) => {
        const bindings = new Map(analysis.bindings);
        fn.parameters.forEach((parameter, index) => {
          if (ts.isIdentifier(parameter.name) && node.arguments[index]) {
            const argument = staticCallArgument(node.arguments[index], analysis);
            if (!ts.isIdentifier(argument) || argument.text !== parameter.name.text) {
              bindings.set(parameter.name.text, argument);
            }
          }
        });
        const nested = { ...analysis, bindings };
        return staticReturnExpressions(fn).map((returned) =>
          staticCollectionBoundForExpression(returned, nested, callSeen)
        );
      });
      if (bounds.length > 0) return combineStaticBounds(bounds);
    }
  }
  const variants = staticExpressionVariants(node, analysis, seen);
  if (variants.length > 0 && !(variants.length === 1 && variants[0] === node)) {
    return combineStaticBounds(variants.map((variant) =>
      staticCollectionBoundForExpression(variant, analysis, seen)
    ));
  }
  return { exact: false, length: 1, lessonChoices: null };
}

function staticCollectionLength(
  receiver: string | null,
  arrays: Map<string, ts.ArrayLiteralExpression>,
  steps: readonly CaliforniaSignatureLessonStep[],
  sourceFile: ts.SourceFile
): StaticCollectionBound {
  if (!receiver) return { exact: true, length: 1, lessonChoices: null };
  if (receiver === "current.choices") {
    const counts = steps.map((step) => step.choiceCount);
    return {
      exact: true,
      length: Math.max(0, ...counts),
      lessonChoices: counts
    };
  }
  const expression = parsedStaticExpression(receiver);
  if (!expression) return { exact: false, length: 1, lessonChoices: null };
  return staticCollectionBoundForExpression(expression, {
    arrays,
    bindings: new Map(),
    sourceFile,
    steps
  }, new Set());
}

/**
 * Narrow source-analyzer canary API.  It intentionally exposes only the
 * finite result, never analyzer internals, so recursive identifier/helper
 * fixtures can prove fail-closed termination without becoming production
 * cardinality allowlists.
 */
export function inspectCaliforniaSignatureStaticCollectionForTest(
  source: string,
  receiver: string
) {
  const sourceFile = ts.createSourceFile(
    "california-static-collection-canary.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const arrays = topLevelArrayInitializers(sourceFile);
  const steps = arrays.has("STEPS") ? lessonSteps(sourceFile, arrays) : [];
  const result = staticCollectionLength(receiver, arrays, steps, sourceFile);
  return { exact: result.exact, length: result.length };
}

function multiplicityForReceivers(
  receivers: readonly string[],
  arrays: Map<string, ts.ArrayLiteralExpression>,
  steps: readonly CaliforniaSignatureLessonStep[],
  sourceFile: ts.SourceFile,
  parameterCollectionLengths: ReadonlyMap<string, number> = new Map()
) {
  let exact = true;
  let length = 1;
  let lessonChoices: number[] | null = null;
  for (const receiver of receivers) {
    const current = parameterCollectionLengths.has(receiver)
      ? { exact: true, length: parameterCollectionLengths.get(receiver)!, lessonChoices: null }
      : staticCollectionLength(receiver, arrays, steps, sourceFile);
    exact &&= current.exact;
    if (current.lessonChoices) {
      lessonChoices = current.lessonChoices.map((count) => count * length);
    } else {
      length *= current.length;
      if (lessonChoices) lessonChoices = lessonChoices.map((count) => count * current.length);
    }
  }
  return {
    exact,
    length: lessonChoices ? Math.max(0, ...lessonChoices) : length,
    lessonChoices
  };
}

type LocalControlComponent = {
  body: ts.Node;
  namespace: CaliforniaSignatureCustomComponentNamespace;
  parameterCollectionLengths: ReadonlyMap<string, number>;
};

function localControlComponents(sourceFile: ts.SourceFile) {
  const definitions: Array<{ body: ts.Node; name: string; parameters: readonly ts.ParameterDeclaration[] }> = [];
  const visitDefinitions = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      definitions.push({ body: node.body, name: node.name.text, parameters: node.parameters });
    } else if (
      ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      definitions.push({ body: node.initializer.body, name: node.name.text, parameters: node.initializer.parameters });
    }
    ts.forEachChild(node, visitDefinitions);
  };
  visitDefinitions(sourceFile);

  const results: LocalControlComponent[] = [];
  for (const definition of definitions) {
    let containsControl = false;
    const findControl = (node: ts.Node) => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && controlKind(node, sourceFile)) {
        containsControl = true;
        return;
      }
      ts.forEachChild(node, findControl);
    };
    findControl(definition.body);
    if (!containsControl) continue;

    const callsites: ts.JsxOpeningLikeElement[] = [];
    const findCallsites = (node: ts.Node) => {
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        node.tagName.getText(sourceFile) === definition.name
      ) callsites.push(node);
      ts.forEachChild(node, findCallsites);
    };
    findCallsites(sourceFile);
    if (callsites.length <= 1) continue;

    const bindingNames = definition.parameters.flatMap((parameter) =>
      ts.isObjectBindingPattern(parameter.name)
        ? parameter.name.elements.map((element) => element.name.getText(sourceFile))
        : []
    );
    const namespaceName = bindingNames.find((name) => {
      const values = callsites.map((callsite) => {
        const attribute = jsxAttributeNode(callsite, name, sourceFile);
        return attribute?.initializer && ts.isStringLiteral(attribute.initializer)
          ? attribute.initializer.text
          : null;
      });
      return values.every((value): value is string => value !== null) && new Set(values).size === values.length;
    });
    if (!namespaceName) {
      throw new Error(
        `${sourceFile.fileName}: custom control component ${definition.name} has ${callsites.length} callsites ` +
        "without a unique reviewed literal namespace prop"
      );
    }
    const parameterCollectionLengths = new Map<string, number>();
    for (const name of bindingNames) {
      const lengths = callsites.map((callsite) => {
        const attribute = jsxAttributeNode(callsite, name, sourceFile);
        return attribute?.initializer && ts.isJsxExpression(attribute.initializer) &&
          attribute.initializer.expression && ts.isArrayLiteralExpression(attribute.initializer.expression)
          ? attribute.initializer.expression.elements.length
          : null;
      });
      if (lengths.every((length): length is number => length !== null) && new Set(lengths).size === 1) {
        parameterCollectionLengths.set(name, lengths[0]!);
      }
    }
    results.push({
      body: definition.body,
      parameterCollectionLengths,
      namespace: {
        callsiteCount: callsites.length,
        componentName: definition.name,
        expression: namespaceName,
        reviewedValues: callsites.map((callsite) => jsxAttribute(callsite, namespaceName, sourceFile)!)
      }
    });
  }
  return results;
}

function customComponentFor(node: ts.Node, components: readonly LocalControlComponent[]) {
  return components.find((component) => node.pos >= component.body.pos && node.end <= component.body.end) ?? null;
}

function exactNumericSourceLiteral(expression: string) {
  const trimmed = expression.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function numericMidpointAudit(
  node: ts.JsxOpeningLikeElement,
  sourceFile: ts.SourceFile
): CaliforniaSignatureNumericMidpointAudit {
  const minimum = jsxAttribute(node, "min", sourceFile) ?? "runtime";
  const maximum = jsxAttribute(node, "max", sourceFile) ?? "runtime";
  const authoredStep = jsxAttribute(node, "step", sourceFile);
  const step = authoredStep ?? "default:1";
  const sourceExpression = `canonical-midpoint(min=${minimum};max=${maximum};step=${step})`;
  const staticMinimum = exactNumericSourceLiteral(minimum);
  const staticMaximum = exactNumericSourceLiteral(maximum);
  const staticStep = authoredStep === null
    ? 1
    : authoredStep.trim().toLowerCase() === "any"
      ? "any"
      : exactNumericSourceLiteral(authoredStep);

  // Dynamic expressions remain a strict runtime obligation. They are never
  // interpreted or sampled by this AST pass.
  if (staticMinimum === null || staticMaximum === null || staticStep === null) {
    return {
      reason: "dynamic min/max/step expression requires exact runtime-state audit",
      sourceExpression,
      status: "runtime-audited"
    };
  }
  try {
    canonicalCaliforniaSignatureNumericEndpoints(
      staticMinimum,
      staticMaximum,
      staticStep,
      `${sourceFile.fileName}: ${sourceExpression}`
    );
    return { reason: null, sourceExpression, status: "required" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("no distinct reachable midpoint")) throw error;
    return {
      reason:
        `source min=${minimum}; max=${maximum}; step=${step} has no distinct step-valid interior value`,
      sourceExpression,
      status: "unavailable"
    };
  }
}

function endpointTargets(
  node: ts.JsxOpeningLikeElement,
  kind: CaliforniaSignatureControlKind,
  sourceFile: ts.SourceFile,
  arrays: Map<string, ts.ArrayLiteralExpression>,
  steps: readonly CaliforniaSignatureLessonStep[],
  midpointAudit: CaliforniaSignatureNumericMidpointAudit | null
): CaliforniaSignatureSourceEndpointTarget[] {
  const direct = (name: string, sourceExpression: string): CaliforniaSignatureSourceEndpointTarget => ({
    expectedMultiplicity: 1,
    key: `${name}:${sha256(sourceExpression).slice(0, 16)}`,
    multiplicityIsExact: true,
    name,
    sourceExpression
  });
  if (kind === "range" || kind === "number") {
    const minimum = jsxAttribute(node, "min", sourceFile) ?? "runtime";
    const maximum = jsxAttribute(node, "max", sourceFile) ?? "runtime";
    if (!midpointAudit) throw new Error(`${sourceFile.fileName}: numeric midpoint audit is missing`);
    return [
      direct("min", minimum),
      ...(midpointAudit.status !== "unavailable"
        ? [direct("mid", midpointAudit.sourceExpression)]
        : []),
      direct("max", maximum)
    ];
  }
  if (kind === "select") {
    const targets: CaliforniaSignatureSourceEndpointTarget[] = [];
    const visit = (candidate: ts.Node) => {
      if (
        (ts.isJsxOpeningElement(candidate) || ts.isJsxSelfClosingElement(candidate)) &&
        candidate.tagName.getText(sourceFile) === "option"
      ) {
        const sourceExpression = jsxAttribute(candidate, "value", sourceFile) ?? normalizeSourceText(candidate.getText(sourceFile));
        const multiplicity = multiplicityForReceivers(
          mapReceivers(candidate, sourceFile), arrays, steps, sourceFile
        );
        const sourceText = normalizeSourceText(candidate.getText(sourceFile));
        targets.push({
          expectedMultiplicity: multiplicity.length,
          key: `option:${targets.length}:${sha256(sourceText).slice(0, 16)}`,
          multiplicityIsExact: multiplicity.exact,
          name: "option",
          sourceExpression
        });
      }
      ts.forEachChild(candidate, visit);
    };
    if (ts.isJsxOpeningElement(node) && ts.isJsxElement(node.parent)) {
      for (const child of node.parent.children) visit(child);
    }
    if (targets.length === 0) throw new Error(`${sourceFile.fileName}: select has no source option targets`);
    return targets;
  }
  if (kind === "radio") return [direct("value", jsxAttribute(node, "value", sourceFile) ?? "runtime")];
  if (kind === "checkbox") return [direct("false", "false"), direct("true", "true")];
  if (kind === "press-button") return [direct("activate", "true"), direct("restore", "false")];
  if (kind === "textarea") return [direct("minimum", "minimum"), direct("maximum", "maximum")];
  if (kind === "interaction-surface") {
    return interactiveHandlerNames(node, sourceFile).map((name) => direct(name, jsxAttribute(node, name, sourceFile) ?? name));
  }
  return [direct("activate", "activate")];
}

type ResolvedImperativeControl = {
  binding: CaliforniaSignatureImperativeBinding;
  node: ts.JsxOpeningLikeElement;
  sourceTexts: readonly string[];
};

function nearestFunctionLike(
  node: ts.Node
): (ts.FunctionLikeDeclaration & { body: ts.ConciseBody }) | null {
  let current: ts.Node | undefined = node.parent;
  while (current && !ts.isSourceFile(current)) {
    if (ts.isFunctionLike(current) && "body" in current && current.body) {
      return current as ts.FunctionLikeDeclaration & { body: ts.ConciseBody };
    }
    current = current.parent;
  }
  return null;
}

function imperativeReceiverRef(
  call: ts.CallExpression,
  receiverExpression: string,
  sourceFile: ts.SourceFile
) {
  const owner = nearestFunctionLike(call);
  if (!owner || !owner.body) {
    throw new Error(`${sourceFile.fileName}: imperative receiver ${receiverExpression} has no lexical function owner`);
  }
  const matches: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) &&
      node.name.text === receiverExpression && node.initializer &&
      ts.isPropertyAccessExpression(node.initializer) && node.initializer.name.text === "current"
    ) {
      matches.push(normalizeSourceText(node.initializer.expression.getText(sourceFile)));
    }
    // A nested callback owns a different lexical `stage`; do not let it make
    // this listener's receiver/ref resolution ambiguous.
    if (node !== owner && ts.isFunctionLike(node)) return;
    ts.forEachChild(node, visit);
  };
  visit(owner.body);
  if (matches.length !== 1) {
    throw new Error(
      `${sourceFile.fileName}: imperative receiver ${receiverExpression} resolves to ` +
      `${matches.length} ref expressions in its lexical owner`
    );
  }
  return matches[0]!;
}

function resolvedImperativeControls(sourceFile: ts.SourceFile) {
  const groups = new Map<string, {
    eventTargets: Array<{ eventName: string; handlerExpression: string }>;
    receiverExpression: string;
    refExpression: string;
    sourceTexts: string[];
  }>();
  const visitListeners = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "addEventListener" && node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0]) && IMPERATIVE_INTERACTION_EVENTS.has(node.arguments[0].text)
    ) {
      const receiverExpression = normalizeSourceText(node.expression.expression.getText(sourceFile));
      const refExpression = imperativeReceiverRef(node, receiverExpression, sourceFile);
      const handler = node.arguments[1];
      if (!handler) {
        throw new Error(`${sourceFile.fileName}: ${receiverExpression}.${node.arguments[0].text} has no handler`);
      }
      const owner = nearestFunctionLike(node);
      const key = `${owner?.pos ?? -1}\0${receiverExpression}\0${refExpression}`;
      const group = groups.get(key) ?? {
        eventTargets: [], receiverExpression, refExpression, sourceTexts: []
      };
      group.eventTargets.push({
        eventName: node.arguments[0].text,
        handlerExpression: normalizeSourceText(handler.getText(sourceFile))
      });
      group.sourceTexts.push(normalizeSourceText(node.getText(sourceFile)));
      groups.set(key, group);
    }
    ts.forEachChild(node, visitListeners);
  };
  visitListeners(sourceFile);

  const jsxByRef = new Map<string, ts.JsxOpeningLikeElement[]>();
  const visitJsx = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const refExpression = jsxAttribute(node, "ref", sourceFile);
      if (refExpression) {
        const matches = jsxByRef.get(refExpression) ?? [];
        matches.push(node);
        jsxByRef.set(refExpression, matches);
      }
    }
    ts.forEachChild(node, visitJsx);
  };
  visitJsx(sourceFile);

  const resolved = new Map<number, ResolvedImperativeControl>();
  for (const group of groups.values()) {
    const nodes = jsxByRef.get(group.refExpression) ?? [];
    if (nodes.length !== 1) {
      throw new Error(
        `${sourceFile.fileName}: imperative receiver ${group.receiverExpression} / ref ${group.refExpression} ` +
        `matches ${nodes.length} JSX nodes; expected exactly one`
      );
    }
    const node = nodes[0]!;
    if (resolved.has(node.pos)) {
      throw new Error(`${sourceFile.fileName}: duplicate imperative listener groups target ref ${group.refExpression}`);
    }
    const eventNames = group.eventTargets.map((target) => target.eventName);
    if (new Set(eventNames).size !== eventNames.length) {
      throw new Error(`${sourceFile.fileName}: duplicate imperative event target on ref ${group.refExpression}`);
    }
    resolved.set(node.pos, {
      binding: {
        eventTargets: group.eventTargets,
        receiverExpression: group.receiverExpression,
        refExpression: group.refExpression
      },
      node,
      sourceTexts: group.sourceTexts
    });
  }
  return resolved;
}

function controlSites(
  sourceFile: ts.SourceFile,
  arrays: Map<string, ts.ArrayLiteralExpression>,
  steps: readonly CaliforniaSignatureLessonStep[]
) {
  const sites: CaliforniaSignatureControlSite[] = [];
  const components = localControlComponents(sourceFile);
  const imperativeControls = resolvedImperativeControls(sourceFile);
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const imperative = imperativeControls.get(node.pos) ?? null;
      const kind = imperative ? "interaction-surface" : controlKind(node, sourceFile);
      if (kind) {
        const sourceOrdinal = sites.length;
        const sourceText = normalizeSourceText(node.getText(sourceFile));
        const renderCollections = mapReceivers(node, sourceFile);
        const customComponent = customComponentFor(node, components);
        const customComponentNamespace = customComponent?.namespace ?? null;
        const multiplicity = multiplicityForReceivers(
          renderCollections,
          arrays,
          steps,
          sourceFile,
          customComponent?.parameterCollectionLengths
        );
        if (customComponentNamespace) {
          multiplicity.length *= customComponentNamespace.callsiteCount;
          if (multiplicity.lessonChoices) {
            multiplicity.lessonChoices = multiplicity.lessonChoices.map(
              (count) => count * customComponentNamespace.callsiteCount
            );
          }
        }
        const interactionSourceHandlers = kind === "interaction-surface"
          ? imperative?.binding.eventTargets ?? jsxInteractionSourceHandlers(node, sourceFile)
          : null;
        const midpointAudit = kind === "range" || kind === "number"
          ? numericMidpointAudit(node, sourceFile)
          : null;
        const targets = interactionSourceHandlers
          ? semanticInteractionEndpointTargets(interactionSourceHandlers)
          : endpointTargets(node, kind, sourceFile, arrays, steps, midpointAudit);
        const identityText = imperative
          ? `${sourceText}\0imperative:${JSON.stringify(imperative.binding)}\0${imperative.sourceTexts.join("|")}`
          : sourceText;
        sites.push({
          endpointExpressions: targets.map((target) => `${target.name}:${target.sourceExpression}`),
          endpointTargets: targets,
          expectedMultiplicity: multiplicity.length,
          lessonChoiceMultiplicity: multiplicity.lessonChoices,
          multiplicityIsExact: multiplicity.exact,
          numericMidpoint: midpointAudit,
          renderCollection: renderCollections[0] ?? null,
          renderCollections,
          sourceConditionKeys: conditionKeys(node, sourceFile),
          customComponentNamespace,
          imperativeBinding: imperative?.binding ?? null,
          interactionSourceHandlers,
          kind,
          siteKey: `${kind}:${sourceOrdinal}:${sha256(identityText).slice(0, 16)}`,
          sourceOrdinal,
          sourceText
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return sites;
}

type SemanticTargetContract = Pick<
  CaliforniaSignatureSourceEndpointTarget,
  "key" | "name" | "sourceExpression"
>;

const SEMANTIC_TARGET_CONTRACTS = {
  clickIrrational: {
    key: "click:c1188d89490162f9",
    name: "click",
    sourceExpression: "onClick=onStageClick"
  },
  clickProbability: {
    key: "click:f8723626dfabf245",
    name: "click",
    sourceExpression: "onClick=onCanvasClick"
  },
  contextTable: {
    key: "context-menu:0e1a8cc4bee4efeb",
    name: "context-menu",
    sourceExpression: "onContextMenu=onContextMenu"
  },
  dragCylinderImperative: {
    key: "drag:127be37e4b2f6294",
    name: "drag",
    sourceExpression: "pointerdown=down;pointermove=move;pointerup=up"
  },
  dragData: {
    key: "drag:57012a4ba11c292c",
    name: "drag",
    sourceExpression:
      "onPointerDown=onPointerDown;onPointerMove=onPointerMove;onPointerUp=onPointerUp;onPointerLeave=onPointerLeave"
  },
  dragDistance: {
    key: "drag:1f975a7a1fe98f73",
    name: "drag",
    sourceExpression:
      "onPointerDown=onPointerDown;onPointerMove=onPointerMove;onPointerUp=endDrag;onPointerCancel=endDrag;onPointerLeave=endDrag"
  },
  dragHover: {
    key: "drag:ea8458b1555aad54",
    name: "drag",
    sourceExpression:
      "onPointerDown=onPointerDown;onPointerMove=onPointerMove;onPointerLeave=onPointerLeave"
  },
  dragLength: {
    key: "drag:5cf605915d137bb4",
    name: "drag",
    sourceExpression:
      "onPointerDown=onPointerDown;onPointerMove=onPointerMove;onPointerUp=onPointerUp;onPointerCancel=onPointerUp"
  },
  dragOrbitEnd: {
    key: "drag:45449f2900440578",
    name: "drag",
    sourceExpression:
      "onPointerDown=onPointerDown;onPointerMove=onPointerMove;onPointerUp=endDrag;onPointerLeave=endDrag"
  },
  dragPoint: {
    key: "drag:e871d5235dc7073a",
    name: "drag",
    sourceExpression:
      "onPointerDown=onDown;onPointerMove=onMove;onPointerUp=onUp;onPointerCancel=onUp"
  },
  dragProbe: {
    key: "drag:c212a99b3f7a1642",
    name: "drag",
    sourceExpression:
      "onPointerDown=onPointerDown;onPointerMove=onPointerMove;onPointerUp=onPointerUp"
  },
  dragRational: {
    key: "drag:b662e38666af562e",
    name: "drag",
    sourceExpression:
      "onPointerDown=onPointerDown;onPointerMove=onPointerMove;onPointerUp=endDrag;onPointerCancel=endDrag;onPointerLeave=onPointerLeave"
  },
  dragStandard: {
    key: "drag:5c6c012d5a59b825",
    name: "drag",
    sourceExpression:
      "onPointerDown=onPointerDown;onPointerMove=onPointerMove;onPointerUp=onPointerUp;onPointerLeave=onPointerUp"
  },
  keyPrime: {
    key: "key-nudge:0dda33cad8733a14",
    name: "key-nudge",
    sourceExpression: "onKeyDown=onStageKeyDown"
  },
  keySphere: {
    key: "key-nudge:b31c895eaa08bc73",
    name: "key-nudge",
    sourceExpression: "onKeyDown=onStageKey"
  },
  keyStandard: {
    key: "key-nudge:2d17f461d94b3478",
    name: "key-nudge",
    sourceExpression: "onKeyDown=onKeyDown"
  },
  pickStage: {
    key: "pointer-pick:10213d92950de67b",
    name: "pointer-pick",
    sourceExpression: "onPointerDown=onStagePointerDown"
  },
  pickStandard: {
    key: "pointer-pick:39de23ad101c7085",
    name: "pointer-pick",
    sourceExpression: "onPointerDown=onPointerDown"
  }
} as const satisfies Record<string, SemanticTargetContract>;

type SemanticTargetName = keyof typeof SEMANTIC_TARGET_CONTRACTS;

const SEMANTIC_INTERACTION_SITE_SPECS = [
  ["AreaLab", "interaction-surface:0:daf4d9c2f4fd9f97", ["dragStandard"]],
  ["AssociativeAdditionLab", "interaction-surface:0:a3c9e0824985277d", ["dragHover"]],
  ["BoxPlotLab", "interaction-surface:0:148cf43c2037929c", ["dragData"]],
  ["CommutativeLab", "interaction-surface:0:dfb521455e962b26", ["pickStandard"]],
  ["ComposingShapesLab", "interaction-surface:0:4c7044fa9b423217", ["dragStandard", "keyStandard"]],
  ["ConeLab", "interaction-surface:0:6bf82249e75bbffe", ["dragOrbitEnd", "keyStandard"]],
  ["CongruenceLab", "interaction-surface:0:02fad253fca46da4", ["pickStandard"]],
  ["CountingLab", "interaction-surface:0:4238288c9117d00b", ["dragHover"]],
  ["CubeLab", "interaction-surface:0:8db074947efd4707", ["dragStandard"]],
  ["CylinderLab", "interaction-surface:0:f308d00dddd90dfb", ["dragCylinderImperative"]],
  ["DataLab", "interaction-surface:0:f9b587aa308a795d", ["dragData"]],
  ["DilationsLab", "interaction-surface:0:02fad253fca46da4", ["pickStandard"]],
  ["DistanceLab", "interaction-surface:0:87a34e4b0e001507", ["dragDistance"]],
  ["EqualSharesLab", "interaction-surface:0:02fad253fca46da4", ["pickStandard"]],
  ["EquivalentFractionsLab", "interaction-surface:0:4238288c9117d00b", ["dragHover"]],
  ["ExpressionLab", "interaction-surface:0:ac87a35d4c84cb45", ["pickStage"]],
  ["FactorLab", "interaction-surface:0:ac87a35d4c84cb45", ["pickStage"]],
  ["FactoringQuadraticsLab", "interaction-surface:0:2ec42e2ab96d5357", ["pickStage"]],
  ["FractionLab", "interaction-surface:0:4238288c9117d00b", ["dragHover"]],
  ["FractionLinePlotLab", "interaction-surface:0:02fad253fca46da4", ["pickStandard"]],
  ["FunctionLab", "interaction-surface:0:c7b576e7c6be004a", ["dragProbe"]],
  ["GraphsLab", "interaction-surface:2:a0cc3de7f39db961", ["dragStandard"]],
  ["InequalityLab", "interaction-surface:0:b18601a8c57a9dda", ["dragPoint"]],
  ["IntegerLab", "interaction-surface:0:9feffb9263795e66", ["dragRational"]],
  ["IrrationalLab", "interaction-surface:0:8e5a2e2b3f4a463d", ["clickIrrational"]],
  ["LengthComparisonLab", "interaction-surface:0:b67e6bf5c7baf1c9", ["dragLength", "keyStandard"]],
  ["LinePlotLab", "interaction-surface:0:02fad253fca46da4", ["pickStandard"]],
  ["MeanLab", "interaction-surface:0:a0cc3de7f39db961", ["dragStandard"]],
  ["MedianLab", "interaction-surface:0:54b0edd84a03d05f", ["dragData"]],
  ["ModeLab", "interaction-surface:0:6879f23d536720af", ["dragHover"]],
  ["NumberBondLab", "interaction-surface:0:4238288c9117d00b", ["dragHover"]],
  ["ParallelogramLab", "interaction-surface:0:3da06171645218c9", ["dragStandard", "keyStandard"]],
  ["PiLab", "interaction-surface:0:c7b576e7c6be004a", ["dragProbe"]],
  ["PointLab", "interaction-surface:0:b18601a8c57a9dda", ["dragPoint"]],
  ["PrimeFactorizationLab", "interaction-surface:0:90b85839765e406c", ["pickStage", "keyPrime"]],
  ["PrimeNumbersLab", "interaction-surface:0:dfb521455e962b26", ["pickStandard"]],
  ["ProbabilityLab", "interaction-surface:0:a1fc28ab9222bc6e", ["clickProbability"]],
  ["PyramidLab", "interaction-surface:0:8db074947efd4707", ["dragStandard"]],
  ["QuadrilateralLab", "interaction-surface:0:c4f8e6a8e1c94b96", ["dragStandard", "keyStandard"]],
  ["RatioLab", "interaction-surface:0:4238288c9117d00b", ["dragHover"]],
  ["RationalNumbersLab", "interaction-surface:0:9feffb9263795e66", ["dragRational"]],
  ["RectangleLab", "interaction-surface:0:cd69f829155a7dcc", ["dragStandard"]],
  ["RectangularPrismLab", "interaction-surface:0:d5664b6467e3d103", ["dragStandard", "keyStandard"]],
  ["ScatterPlotLab", "interaction-surface:0:02fad253fca46da4", ["pickStandard"]],
  ["SetTheoryLab", "interaction-surface:0:7bffd902dfa91fe4", ["pickStandard"]],
  ["SortLab", "interaction-surface:2:7bffd902dfa91fe4", ["pickStandard"]],
  ["SphereLab", "interaction-surface:0:8509f201b4d87bd4", ["dragStandard", "keySphere"]],
  ["StandardDeviationLab", "interaction-surface:0:0e90aa3c9be2f881", ["dragData"]],
  ["TableLab", "interaction-surface:0:52d11334a4e17d98", ["dragHover", "contextTable"]],
  ["TrapezoidLab", "interaction-surface:0:e17a92cf6a470dc1", ["dragStandard", "keyStandard"]],
  ["TriangleLab", "interaction-surface:0:2ca78acb0f933d67", ["dragStandard", "keyStandard"]],
  ["TwoVariableInequalityLab", "interaction-surface:0:0c1e6f4ab98b0d18", ["dragPoint"]],
  ["UnitCircleLab", "interaction-surface:0:c7b576e7c6be004a", ["dragProbe"]],
  ["VariableLab", "interaction-surface:0:ac87a35d4c84cb45", ["pickStage"]],
  ["VarianceLab", "interaction-surface:0:a0cc3de7f39db961", ["dragStandard"]],
  ["VolumeLab", "interaction-surface:0:8db074947efd4707", ["dragStandard"]]
] as const satisfies readonly [SignatureLabId, string, readonly SemanticTargetName[]][];

function semanticActionSteps(target: SemanticTargetContract): CaliforniaSignatureSemanticActionStep[] {
  return target.sourceExpression.split(";").map((member, index) => {
    const sourceEventName = member.slice(0, member.indexOf("="));
    if (sourceEventName === "onKeyDown") return { key: "ArrowRight", type: "key" };
    const event = ({
      onClick: "click",
      onContextMenu: "contextmenu",
      onPointerCancel: "pointercancel",
      onPointerDown: "pointerdown",
      onPointerLeave: "pointerleave",
      onPointerMove: "pointermove",
      onPointerUp: "pointerup",
      pointerdown: "pointerdown",
      pointermove: "pointermove",
      pointerup: "pointerup"
    } as const)[sourceEventName as keyof typeof eventNameMarker];
    if (!event) throw new Error(`unsupported semantic source event ${sourceEventName}`);
    const coordinate = index === 0 ? 0.45 : 0.62;
    return { event, type: "pointer", x: coordinate, y: index === 0 ? 0.48 : 0.56 };
  });
}

const SEMANTIC_POINTER_START_OVERRIDES: Readonly<Record<string, readonly [number, number]>> = {
  "AreaLab\0drag": [0.65, 0.4],
  "AssociativeAdditionLab\0drag": [0.4, 0.3],
  "CountingLab\0drag": [0.17, 0.325],
  "DilationsLab\0pointer-pick": [0.5, 0.6],
  "DistanceLab\0drag": [0.4, 0.55],
  "EquivalentFractionsLab\0drag": [0.43, 0.775],
  "ExpressionLab\0pointer-pick": [0.05, 0.05],
  "FactorLab\0pointer-pick": [0.05, 0.7],
  "FractionLab\0drag": [0.05, 0.1],
  "LinePlotLab\0pointer-pick": [0.5, 0.7],
  "ParallelogramLab\0drag": [0.25, 0.65],
  "PrimeFactorizationLab\0pointer-pick": [0.5, 0.5],
  "QuadrilateralLab\0drag": [0.25, 0.65],
  "RatioLab\0drag": [0.05, 0.1],
  "RectangleLab\0drag": [0.65, 0.4],
  "ScatterPlotLab\0pointer-pick": [0.5, 0.25],
  "SetTheoryLab\0pointer-pick": [0.05, 0.05],
  "TrapezoidLab\0drag": [0.2, 0.65],
  "TriangleLab\0drag": [0.3, 0.65]
};

function reviewedSemanticActionSteps(
  benchId: SignatureLabId,
  target: SemanticTargetContract
): CaliforniaSignatureSemanticActionStep[] {
  if (benchId === "ComposingShapesLab" && target.name === "key-nudge") {
    return [{ key: "1", type: "key" }, { key: "ArrowRight", type: "key" }];
  }
  if (benchId === "PrimeFactorizationLab" && target.name === "key-nudge") {
    return [{ key: " ", type: "key" }];
  }
  const steps = semanticActionSteps(target);
  const start = SEMANTIC_POINTER_START_OVERRIDES[`${benchId}\0${target.name}`];
  if (!start) return steps;
  let pointerOrdinal = 0;
  return steps.map((step) => {
    if (step.type !== "pointer") return step;
    const ordinal = pointerOrdinal++;
    return {
      ...step,
      x: Math.min(0.98, start[0] + ordinal * 0.08),
      y: Math.min(0.98, start[1] + ordinal * 0.05)
    };
  });
}

// This declaration exists only to give the event lookup above a stable key type.
const eventNameMarker = {
  onClick: true,
  onContextMenu: true,
  onPointerCancel: true,
  onPointerDown: true,
  onPointerLeave: true,
  onPointerMove: true,
  onPointerUp: true,
  pointerdown: true,
  pointermove: true,
  pointerup: true
} as const;

/**
 * Reviewed one-site-at-a-time semantic gestures.  There is deliberately no
 * broad interaction-family allowlist: source site, ordered raw handlers, exact
 * semantic target key, and executable event sequence must all agree.
 */
export const CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY:
readonly CaliforniaSignatureSemanticInteractionRegistryEntry[] =
  SEMANTIC_INTERACTION_SITE_SPECS.map(([benchId, siteKey, targetNames]) => {
    const targets = targetNames.map((name) => SEMANTIC_TARGET_CONTRACTS[name]);
    return {
      benchId,
      endpointActions: targets.map((target) => ({
        activationEndpoint: target.name,
        sourceEventTargetKey: target.key,
        steps: reviewedSemanticActionSteps(benchId, target)
      })),
      siteKey,
      sourceHandlerRef: targets.map((target) =>
        `${target.name}=${target.sourceExpression}`
      ).join(";")
    };
  });

function reachableBenchIds() {
  return [...new Set(Object.values(signatureLabAssignments).flatMap((assignment) => [
    assignment.primary,
    ...(assignment.related ?? [])
  ]))].sort() as SignatureLabId[];
}

function candidateFamiliesForSite(site: CaliforniaSignatureControlSite) {
  const endpointNames = site.endpointTargets.map((target) => target.name);
  return [
    ...(endpointNames.includes("drag") ? ["canvas-drag" as const] : []),
    ...(endpointNames.some((name) => ["pointer-pick", "click", "context-menu", "double-click"].includes(name))
      ? ["canvas-discrete-pick" as const] : []),
    ...(endpointNames.includes("key-nudge")
      ? ["keyboard-nudge" as const] : []),
    ...(/orbit/i.test(site.sourceText) ? ["viewport-orbit" as const] : [])
  ];
}

function canonicalBlueprint(bench: CaliforniaSignatureBenchControlBlueprint) {
  return {
    benchId: bench.benchId,
    controlSites: bench.controlSites.map((site) => ({
      endpointExpressions: site.endpointExpressions,
      endpointTargets: site.endpointTargets,
      expectedMultiplicity: site.expectedMultiplicity,
      imperativeBinding: site.imperativeBinding,
      interactionSourceHandlers: site.interactionSourceHandlers,
      kind: site.kind,
      lessonChoiceMultiplicity: site.lessonChoiceMultiplicity,
      multiplicityIsExact: site.multiplicityIsExact,
      numericMidpoint: site.numericMidpoint,
      customComponentNamespace: site.customComponentNamespace,
      renderCollection: site.renderCollection,
      renderCollections: site.renderCollections,
      sourceConditionKeys: site.sourceConditionKeys,
      siteKey: site.siteKey,
      sourceOrdinal: site.sourceOrdinal,
      sourceText: site.sourceText
    })),
    lessonSteps: bench.lessonSteps,
    unresolvedInteractions: bench.unresolvedInteractions
  };
}

export function buildCaliforniaSignatureSourceManifest(
  projectRoot = resolveCaliforniaSignatureProductProjectRoot()
): CaliforniaSignatureSourceManifest {
  const registryKeys = CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY.map((entry) =>
    `${entry.benchId}\0${entry.siteKey}`
  );
  if (new Set(registryKeys).size !== registryKeys.length) {
    throw new Error("California signature semantic interaction registry contains duplicate source sites");
  }
  const benches = reachableBenchIds().map((benchId): CaliforniaSignatureBenchControlBlueprint => {
    const sourcePath = path.posix.join("components/visualizations/signature", `${benchId}.jsx`);
    const source = readFileSync(path.join(projectRoot, sourcePath), "utf8");
    assertSignatureBenchThemeIndependent(sourcePath, source);
    const sourceFile = ts.createSourceFile(
      sourcePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JSX
    );
    const parseErrors = (sourceFile as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] })
      .parseDiagnostics ?? [];
    if (parseErrors.length > 0) {
      throw new Error(`${sourcePath}: JSX parse failed with ${parseErrors.length} diagnostic(s)`);
    }
    const arrays = topLevelArrayInitializers(sourceFile);
    const steps = lessonSteps(sourceFile, arrays);
    const sites = controlSites(sourceFile, arrays, steps);
    if (sites.length === 0) throw new Error(`${sourcePath}: no interactive control source sites found`);
    const unresolvedInteractions = [
      ...sites.filter((site) => {
        if (site.kind !== "interaction-surface") return false;
        const entry = CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY.find((candidate) =>
          candidate.benchId === benchId && candidate.siteKey === site.siteKey
        );
        const handlerRef = site.endpointTargets.map((target) =>
          `${target.name}=${target.sourceExpression}`
        ).join(";");
        const sourceTargetKeys = site.endpointTargets.map((target) => target.key).sort();
        const registryTargetKeys = entry?.endpointActions.map((action) => action.sourceEventTargetKey).sort() ?? [];
        return !entry || entry.sourceHandlerRef !== handlerRef ||
          JSON.stringify(registryTargetKeys) !== JSON.stringify(sourceTargetKeys) ||
          entry.endpointActions.some((action) => action.steps.length === 0);
      })
        .map((site): CaliforniaSignatureUnresolvedInteraction => ({
          candidateFamilies: candidateFamiliesForSite(site),
          eventNames: site.endpointTargets.map((target) => target.name),
          handlerRef: site.endpointTargets.map((target) =>
            `${target.name}=${target.sourceExpression}`
          ).join(";"),
          reason: "interactive source site lacks an exact reviewed handler/target/action contract",
          semanticHints: [
            ...site.sourceConditionKeys.map((condition) => `condition:${condition}`),
            ...(site.imperativeBinding
              ? [
                  `imperative receiver:${site.imperativeBinding.receiverExpression}`,
                  `imperative ref:${site.imperativeBinding.refExpression}`
                ]
              : []),
            ...(source.includes("data-viz-keyboard-equivalent") ? ["bench-has-keyboard-equivalent"] : []),
            ...(site.sourceText.match(/aria-label=([^ >]+)/)?.[1]
              ? [`aria-label:${site.sourceText.match(/aria-label=([^ >]+)/)![1]}`]
              : [])
          ],
          siteKey: site.siteKey,
          sourceText: site.sourceText
        }))
    ];
    return {
      benchId,
      controlSites: sites,
      lessonSteps: steps,
      unresolvedInteractions,
      sourcePath,
      sourceSha256: sha256(source)
    };
  });
  const sourceInteractionKeys = new Set(benches.flatMap((bench) => bench.controlSites
    .filter((site) => site.kind === "interaction-surface")
    .map((site) => `${bench.benchId}\0${site.siteKey}`)));
  const staleRegistryKeys = registryKeys.filter((key) => !sourceInteractionKeys.has(key));
  if (staleRegistryKeys.length > 0) {
    throw new Error(
      `California signature semantic interaction registry cites ${staleRegistryKeys.length} stale source site(s): ` +
      staleRegistryKeys.slice(0, 5).join(", ")
    );
  }
  const componentSourceSha256 = sha256(benches.map((bench) =>
    `${bench.benchId}\0${bench.sourceSha256}`
  ).join("\n"));
  const blueprintSha256 = sha256(JSON.stringify(benches.map(canonicalBlueprint)));
  return {
    benches,
    blueprintSha256,
    componentSourceSha256,
    counts: {
      benches: benches.length,
      controlSites: benches.reduce((sum, bench) => sum + bench.controlSites.length, 0),
      exactMultiplicitySites: benches.reduce((sum, bench) =>
        sum + bench.controlSites.filter((site) => site.multiplicityIsExact).length, 0),
      lessonChoices: benches.reduce((sum, bench) =>
        sum + bench.lessonSteps.reduce((stepSum, step) => stepSum + step.choiceCount, 0), 0),
      lessonSteps: benches.reduce((sum, bench) => sum + bench.lessonSteps.length, 0),
      unresolvedInteractions: benches.reduce((sum, bench) => sum + bench.unresolvedInteractions.length, 0)
    },
    schemaVersion: CALIFORNIA_SIGNATURE_SOURCE_SCHEMA_VERSION
  };
}

/**
 * Planning projection, not acceptance evidence.  The exact browser totals are
 * frozen only after the source-aware driver resolves the filtered/dynamic map
 * sites and all select option values.  This projection prevents accidental
 * selection of an unexecutable endpoints × twelve-axes Cartesian product.
 */
export function estimateCaliforniaSignatureTraversalScale(
  manifest: CaliforniaSignatureSourceManifest
): CaliforniaSignatureTraversalScale {
  let projectedControlInstances = 0;
  let projectedEndpointActivations = 0;
  let unresolvedMultiplicitySites = 0;
  for (const bench of manifest.benches) {
    for (const site of bench.controlSites) {
      const instances = site.lessonChoiceMultiplicity
        ? site.lessonChoiceMultiplicity.reduce((sum, count) => sum + count, 0)
        : site.expectedMultiplicity;
      projectedControlInstances += instances;
      if (!site.multiplicityIsExact) unresolvedMultiplicitySites += 1;
      const endpointsPerInstance = site.endpointTargets.reduce(
        (sum, target) => sum + target.expectedMultiplicity,
        0
      );
      projectedEndpointActivations += instances * endpointsPerInstance;
    }
  }
  const functionalOneAxisKeys =
    manifest.counts.lessonSteps + projectedControlInstances + projectedEndpointActivations;
  const lessonStateTwelveAxisRecords = manifest.counts.lessonSteps * 12;
  const naiveTwelveAxisKeys = functionalOneAxisKeys * 12;
  const recommendedSplitRecords =
    functionalOneAxisKeys +
    manifest.counts.lessonSteps * 11 +
    projectedEndpointActivations * 12;
  return {
    functionalOneAxisKeys,
    lessonStateTwelveAxisRecords,
    naiveTwelveAxisKeys,
    recommendedSplitRecords,
    projectedControlInstances,
    projectedEndpointActivations,
    unresolvedMultiplicitySites
  };
}

export function assertCaliforniaSignatureSourceManifestFrozen(
  manifest: CaliforniaSignatureSourceManifest
) {
  if (manifest.componentSourceSha256 !== CALIFORNIA_SIGNATURE_COMPONENT_SOURCE_SHA256) {
    throw new Error(
      "California signature component source identity drifted: " +
      `${manifest.componentSourceSha256} != ${CALIFORNIA_SIGNATURE_COMPONENT_SOURCE_SHA256}. ` +
      "Do not update the frozen digest until the changed states and controls are reviewed."
    );
  }
  if (manifest.blueprintSha256 !== CALIFORNIA_SIGNATURE_CONTROL_BLUEPRINT_SHA256) {
    throw new Error(
      "California signature control blueprint drifted: " +
      `${manifest.blueprintSha256} != ${CALIFORNIA_SIGNATURE_CONTROL_BLUEPRINT_SHA256}. ` +
      "A lesson, mode, control, or endpoint changed and requires a reviewed runtime snapshot."
    );
  }
}

export function stateCoverageKey(benchId: string, stepKey: string) {
  return `${benchId}:${stepKey}:state`;
}

export function controlCoverageKey(
  benchId: string,
  stepKey: string,
  control: Pick<CaliforniaSignatureTraversalControl, "instanceKey" | "sourceSiteKey">
) {
  return `${benchId}:${stepKey}:control:${control.sourceSiteKey}:${control.instanceKey}`;
}

export function endpointCoverageKey(
  benchId: string,
  stepKey: string,
  control: Pick<CaliforniaSignatureTraversalControl, "instanceKey" | "sourceSiteKey">,
  endpoint: CaliforniaSignatureRuntimeEndpoint
) {
  return `${controlCoverageKey(benchId, stepKey, control)}:endpoint:` +
    `${endpoint.sourceTargetKey}:${endpoint.instanceKey}:${endpoint.value}`;
}

function unresolvedSourceTargetReasons(bench: CaliforniaSignatureBenchControlBlueprint) {
  return [
    ...bench.unresolvedInteractions.map((interaction) =>
      `${interaction.siteKey}: ${interaction.reason}`
    ),
    ...bench.controlSites.filter((site) => !site.multiplicityIsExact).map((site) =>
      `${site.siteKey}: unresolved control multiplicity for ${site.renderCollections.join(" × ")}`
    ),
    ...bench.controlSites.flatMap((site) => site.endpointTargets
      .filter((target) => !target.multiplicityIsExact)
      .map((target) => `${site.siteKey}/${target.key}: unresolved endpoint multiplicity`))
  ];
}

export function assertCaliforniaSignatureSourceTargetsResolved(
  benchOrManifest: CaliforniaSignatureBenchControlBlueprint | CaliforniaSignatureSourceManifest
) {
  const benches = "benches" in benchOrManifest ? benchOrManifest.benches : [benchOrManifest];
  const reasons = benches.flatMap((bench) => unresolvedSourceTargetReasons(bench).map(
    (reason) => `${bench.benchId}/${reason}`
  ));
  if (reasons.length > 0) {
    throw new Error(
      `California signature source targets are unresolved (${reasons.length}): ` +
      reasons.slice(0, 12).join("; ") + (reasons.length > 12 ? `; ... +${reasons.length - 12}` : "")
    );
  }
}

function validateRuntimeEndpoints(
  bench: CaliforniaSignatureBenchControlBlueprint,
  site: CaliforniaSignatureControlSite,
  control: CaliforniaSignatureTraversalControl
) {
  assertExactCaliforniaSignatureCoverage(
    site.sourceConditionKeys,
    control.sourceConditionKeys,
    `${bench.benchId}/${site.siteKey}/${control.instanceKey} source conditions`
  );
  const targets = new Map(site.endpointTargets.map((target) => [target.key, target]));
  const identities = new Set<string>();
  const counts = new Map<string, number>();
  for (const endpoint of control.endpoints) {
    const target = targets.get(endpoint.sourceTargetKey);
    if (!target) {
      throw new Error(`${bench.benchId}/${site.siteKey}: runtime endpoint cites unknown source target ${endpoint.sourceTargetKey}`);
    }
    if (!endpoint.instanceKey || endpoint.value === "") {
      throw new Error(`${bench.benchId}/${site.siteKey}/${target.key}: runtime endpoint identity/value is empty`);
    }
    const identity = `${endpoint.sourceTargetKey}\0${endpoint.instanceKey}\0${endpoint.value}`;
    if (identities.has(identity)) {
      throw new Error(`${bench.benchId}/${site.siteKey}: duplicate runtime endpoint ${identity}`);
    }
    identities.add(identity);
    counts.set(target.key, (counts.get(target.key) ?? 0) + 1);
  }
  for (const target of site.endpointTargets) {
    const actual = counts.get(target.key) ?? 0;
    if (!target.multiplicityIsExact || actual > target.expectedMultiplicity) {
      throw new Error(
        `${bench.benchId}/${site.siteKey}/${target.key}: runtime endpoints ${actual}/${target.expectedMultiplicity} ceiling ` +
        `(${target.multiplicityIsExact ? "exact" : "unresolved source target"})`
      );
    }
  }
  if (site.kind === "range" || site.kind === "number") {
    const values = new Map(control.endpoints.map((endpoint) => [targets.get(endpoint.sourceTargetKey)!.name, Number(endpoint.value)]));
    const minimum = values.get("min");
    const midpoint = values.get("mid");
    const maximum = values.get("max");
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || !(minimum! < maximum!)) {
      throw new Error(`${bench.benchId}/${site.siteKey}: numeric min/max endpoints are not finite ordered values`);
    }
    if (!site.numericMidpoint) {
      throw new Error(`${bench.benchId}/${site.siteKey}: numeric midpoint audit is missing`);
    }
    if (site.numericMidpoint.status === "unavailable") {
      if (midpoint !== undefined || site.endpointTargets.some((target) => target.name === "mid")) {
        throw new Error(`${bench.benchId}/${site.siteKey}: unavailable numeric midpoint was exposed as an endpoint`);
      }
    } else if (!Number.isFinite(midpoint) || !(minimum! < midpoint! && midpoint! < maximum!)) {
      throw new Error(`${bench.benchId}/${site.siteKey}: numeric midpoint is not a distinct finite interior value`);
    }
  }
  return control.endpoints;
}

/**
 * Browser orchestration API.  It deliberately delegates locator resolution to
 * the caller while owning the fail-closed sequence and evidence keys:
 *
 *  1. unlock every lesson step in order;
 *  2. gate the step before mutation;
 *  3. require exact source-site attribution for every live control;
 *  4. exercise min/mid/max numeric states, every select/radio option, both toggle
 *     states, and each reversible action;
 *  5. gate each endpoint state and restore the measured default;
 *  6. prove every source site appeared, including non-first mapped controls.
 */
export async function traverseCaliforniaSignatureBenchControls(
  bench: CaliforniaSignatureBenchControlBlueprint,
  driver: CaliforniaSignatureTraversalDriver
): Promise<CaliforniaSignatureTraversalEvidence> {
  assertCaliforniaSignatureSourceTargetsResolved(bench);
  const coveredKeys = new Set<string>();
  const sourceSites = new Map(bench.controlSites.map((site) => [site.siteKey, site]));
  const sourceSitePeakMultiplicity = new Map<string, number>();
  const exercisedControlInstances = new Set<string>();

  for (const step of bench.lessonSteps) {
    await driver.unlockLessonStep(bench, step);
    const stateKey = stateCoverageKey(bench.benchId, step.key);
    await driver.runGates(stateKey);
    coveredKeys.add(stateKey);

    const controls = await driver.controlsForStep(bench, step);
    const instancesBySite = new Map<string, Set<string>>();
    for (const control of controls) {
      const site = sourceSites.get(control.sourceSiteKey);
      if (!site) {
        throw new Error(`${bench.benchId}/${step.key}: runtime control references unknown source site ${control.sourceSiteKey}`);
      }
      if (site.kind !== control.kind) {
        throw new Error(
          `${bench.benchId}/${step.key}/${control.sourceSiteKey}: runtime kind ${control.kind} != source kind ${site.kind}`
        );
      }
      const instances = instancesBySite.get(site.siteKey) ?? new Set<string>();
      if (instances.has(control.instanceKey)) {
        throw new Error(`${bench.benchId}/${step.key}/${site.siteKey}: duplicate runtime instance ${control.instanceKey}`);
      }
      instances.add(control.instanceKey);
      instancesBySite.set(site.siteKey, instances);

      // A stable dial or mode button is exercised once at the first lesson
      // state where it is enabled.  Question-choice sites are different: the
      // same JSX `.map` renders a new authored option set on each lesson step,
      // so their identity includes the step.  This avoids an endpoints × every
      // lesson-step Cartesian product without skipping any authored control.
      const exerciseIdentity = site.lessonChoiceMultiplicity
        ? `${step.key}:${site.siteKey}:${control.instanceKey}`
        : `${site.siteKey}:${control.instanceKey}`;
      if (exercisedControlInstances.has(exerciseIdentity)) continue;
      exercisedControlInstances.add(exerciseIdentity);

      const requiredEndpoints = validateRuntimeEndpoints(bench, site, control);

      const controlKey = controlCoverageKey(bench.benchId, step.key, control);
      coveredKeys.add(controlKey);
      for (const endpoint of requiredEndpoints) {
        await driver.activateEndpoint(control, endpoint);
        const endpointKey = endpointCoverageKey(bench.benchId, step.key, control, endpoint);
        await driver.runGates(endpointKey);
        coveredKeys.add(endpointKey);
        await driver.restoreDefault();
      }
    }
    for (const [siteKey, instances] of instancesBySite) {
      sourceSitePeakMultiplicity.set(
        siteKey,
        Math.max(sourceSitePeakMultiplicity.get(siteKey) ?? 0, instances.size)
      );
    }
    for (const site of bench.controlSites) {
      if (!site.lessonChoiceMultiplicity) continue;
      const expectedChoices = site.lessonChoiceMultiplicity[step.index] ?? 0;
      const actualChoices = instancesBySite.get(site.siteKey)?.size ?? 0;
      if (actualChoices !== expectedChoices) {
        throw new Error(
          `${bench.benchId}/${step.key}: ${site.siteKey} rendered ` +
          `${actualChoices}/${expectedChoices} reviewed lesson choices`
        );
      }
    }
  }

  for (const site of bench.controlSites) {
    const observed = sourceSitePeakMultiplicity.get(site.siteKey) ?? 0;
    if (observed === 0) {
      throw new Error(`${bench.benchId}: source control site never rendered: ${site.siteKey}`);
    }
    if (site.multiplicityIsExact && site.renderCollection !== "current.choices" && observed > site.expectedMultiplicity) {
      throw new Error(
        `${bench.benchId}: ${site.siteKey} rendered ${observed}/${site.expectedMultiplicity} reviewed ceiling`
      );
    }
  }

  return {
    coveredKeys: [...coveredKeys].sort(),
    sourceSitePeakMultiplicity
  };
}

/** Exact-set comparison used by both the real ledger and mutation canaries. */
export function assertExactCaliforniaSignatureCoverage(
  expectedKeys: Iterable<string>,
  actualKeys: Iterable<string>,
  label = "California signature control coverage"
) {
  const expectedInput = [...expectedKeys];
  const actualInput = [...actualKeys];
  const expected = [...new Set(expectedInput)].sort();
  const actual = [...new Set(actualInput)].sort();
  if (expected.length !== expectedInput.length) {
    throw new Error(`${label} expected set contains duplicate keys`);
  }
  if (actual.length !== actualInput.length) {
    throw new Error(`${label} actual evidence contains duplicate keys`);
  }
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((key) => !actualSet.has(key));
  const extra = actual.filter((key) => !expectedSet.has(key));
  if (missing.length > 0 || extra.length > 0 || expected.length !== actual.length) {
    const compact = (keys: readonly string[]) =>
      keys.slice(0, 8).join(", ") + (keys.length > 8 ? ` ... +${keys.length - 8}` : "");
    throw new Error(
      `${label} is not exact; expected=${expected.length}, actual=${actual.length}, ` +
      `missing=[${compact(missing)}], extra=[${compact(extra)}]`
    );
  }
}

/**
 * Compact reviewed runtime snapshot: three fields replace a 12k-line checked-in
 * key map while retaining exact drift detection.  The source-aware browser
 * evidence remains the actionable artifact; this digest is the acceptance pin.
 */
export function snapshotCaliforniaSignatureRuntimeCoverage(
  coveredKeys: Iterable<string>,
  blueprintSha256 = CALIFORNIA_SIGNATURE_CONTROL_BLUEPRINT_SHA256
): CaliforniaSignatureReviewedRuntimeSnapshot {
  const input = [...coveredKeys];
  const keys = [...new Set(input)].sort();
  if (keys.length !== input.length) {
    throw new Error("California signature runtime snapshot refuses duplicate coverage keys");
  }
  return {
    blueprintSha256,
    keyCount: keys.length,
    keysSha256: sha256(keys.join("\n")),
    schemaVersion: CALIFORNIA_SIGNATURE_SOURCE_SCHEMA_VERSION
  };
}

export function assertReviewedCaliforniaSignatureRuntimeSnapshot(
  reviewed: CaliforniaSignatureReviewedRuntimeSnapshot,
  actualKeys: Iterable<string>
) {
  const actual = snapshotCaliforniaSignatureRuntimeCoverage(actualKeys, reviewed.blueprintSha256);
  if (
    reviewed.schemaVersion !== actual.schemaVersion ||
    reviewed.blueprintSha256 !== CALIFORNIA_SIGNATURE_CONTROL_BLUEPRINT_SHA256 ||
    reviewed.keyCount !== actual.keyCount ||
    reviewed.keysSha256 !== actual.keysSha256
  ) {
    throw new Error(
      "California signature reviewed runtime snapshot drifted: " +
      `reviewed=${JSON.stringify(reviewed)}, actual=${JSON.stringify(actual)}`
    );
  }
}
