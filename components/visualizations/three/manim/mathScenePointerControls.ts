import type { Vec3 } from "./mathSceneTypes";

export type MathScenePointerFrameAction = "drag-pan" | "none" | "pan-2d" | "pan-3d" | "scroll-scale";
export type MathScenePointerEventType =
  | "mouse-drag"
  | "mouse-motion"
  | "mouse-press"
  | "mouse-release"
  | "mouse-scroll";

export const SCENE_POINTER_CONTROL_SOURCE_CONTRACT =
  "Scene.on_mouse_*: update mouse points, dispatch EVENT_DISPATCHER, then pan/scale camera frame unless propagation stops" as const;

export type MathScenePointerControlPlan = {
  button: number | null;
  buttons: number | null;
  deltaPoint: Vec3;
  dispatchesEvent: boolean;
  eventType: MathScenePointerEventType;
  frameAction: MathScenePointerFrameAction;
  frameShift: Vec3;
  modifiers: number | null;
  mouseDragPointUpdated: boolean;
  mousePointUpdated: boolean;
  offset: Vec3;
  phiDelta: number;
  pointerControlVersion: "mais-manim-pointer-controls/v1";
  point: Vec3;
  propagationStopped: boolean;
  scaleAboutPoint: Vec3;
  scaleFactor: number;
  scrollRelativeOffset: number;
  sourceContract: typeof SCENE_POINTER_CONTROL_SOURCE_CONTRACT;
  summary: string;
  thetaDelta: number;
  windowAssertionSatisfied: boolean;
};

export type MathScenePointerControlInput = {
  button?: number;
  buttons?: number;
  deltaPoint?: Vec3;
  dispatcherResult?: boolean | null;
  dragToPan?: boolean;
  eventType: MathScenePointerEventType;
  fixedFrameDeltaPoint?: Vec3;
  hasWindow?: boolean;
  isPan3dKeyPressed?: boolean;
  isPanKeyPressed?: boolean;
  modifiers?: number;
  offset?: Vec3;
  panSensitivity?: number;
  pixelHeight?: number;
  point: Vec3;
  scrollSensitivity?: number;
  yPixelOffset?: number;
};

const ZERO_VEC3: Vec3 = [0, 0, 0];

function finite(value: number | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function finiteOptionalInteger(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function vec3(value: Vec3 | undefined, fallback: Vec3 = ZERO_VEC3): Vec3 {
  return [
    finite(value?.[0], fallback[0]),
    finite(value?.[1], fallback[1]),
    finite(value?.[2], fallback[2])
  ];
}

function negate(value: Vec3): Vec3 {
  return value.map((coordinate) => {
    const next = -coordinate;
    return Math.abs(next) < 1e-12 ? 0 : next;
  }) as Vec3;
}

function positivePixelHeight(value: number | undefined) {
  const height = finite(value, 1);
  return height > 0 ? height : 1;
}

function fixedNumber(value: number) {
  const safe = Math.abs(value) < 0.0005 ? 0 : value;
  return safe.toFixed(3);
}

function formatVec3(value: Vec3) {
  return value.map(fixedNumber).join(",");
}

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;

  const stableObject: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (entry !== undefined) stableObject[key] = stableValue(entry);
  }

  return stableObject;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function buildSummary(plan: Omit<MathScenePointerControlPlan, "pointerControlVersion" | "summary">) {
  return [
    `pointer:${plan.eventType}`,
    `action=${plan.frameAction}`,
    `stopped=${String(plan.propagationStopped)}`,
    `window=${String(plan.windowAssertionSatisfied)}`
  ].join(":");
}

function motionFrameAction(input: {
  deltaPoint: Vec3;
  dispatcherStopped: boolean;
  fixedFrameDeltaPoint: Vec3;
  isPan3dKeyPressed: boolean;
  isPanKeyPressed: boolean;
  panSensitivity: number;
  windowAssertionSatisfied: boolean;
}) {
  if (!input.windowAssertionSatisfied || input.dispatcherStopped) {
    return {
      frameAction: "none" as const,
      frameShift: ZERO_VEC3,
      phiDelta: 0,
      thetaDelta: 0
    };
  }

  if (input.isPan3dKeyPressed) {
    return {
      frameAction: "pan-3d" as const,
      frameShift: ZERO_VEC3,
      phiDelta: input.fixedFrameDeltaPoint[1] * input.panSensitivity,
      thetaDelta: -input.fixedFrameDeltaPoint[0] * input.panSensitivity
    };
  }

  if (input.isPanKeyPressed) {
    return {
      frameAction: "pan-2d" as const,
      frameShift: negate(input.deltaPoint),
      phiDelta: 0,
      thetaDelta: 0
    };
  }

  return {
    frameAction: "none" as const,
    frameShift: ZERO_VEC3,
    phiDelta: 0,
    thetaDelta: 0
  };
}

function scrollFrameAction(input: {
  dispatcherStopped: boolean;
  pixelHeight: number;
  point: Vec3;
  scrollSensitivity: number;
  yPixelOffset: number;
}) {
  if (input.dispatcherStopped) {
    return {
      frameAction: "none" as const,
      scaleAboutPoint: ZERO_VEC3,
      scaleFactor: 1,
      scrollRelativeOffset: 0
    };
  }

  const scrollRelativeOffset = input.yPixelOffset / input.pixelHeight;
  const scaleFactor = finite(1 - input.scrollSensitivity * scrollRelativeOffset, 1);

  return {
    frameAction: "scroll-scale" as const,
    scaleAboutPoint: input.point,
    scaleFactor,
    scrollRelativeOffset
  };
}

// Manim source contract:
// - on_mouse_motion asserts a window, calls mouse_point.move_to(point), dispatches
//   EVENT_DISPATCHER MouseMotionEvent, then pans 3D with increment_theta /
//   increment_phi or shifts the frame when the pan key is pressed.
// - on_mouse_drag calls mouse_drag_point.move_to(point), applies drag_to_pan
//   frame.shift(-d_point) before dispatching MouseDragEvent.
// - on_mouse_press calls mouse_drag_point.move_to(point) and dispatches only.
// - on_mouse_release dispatches only.
// - on_mouse_scroll dispatches MouseScrollEvent, then calls frame.scale(...)
//   about the pointer unless propagation is stopped.
export function buildScenePointerControlPlan(input: MathScenePointerControlInput): MathScenePointerControlPlan {
  const eventType = input.eventType;
  const point = vec3(input.point);
  const deltaPoint = vec3(input.deltaPoint);
  const offset = vec3(input.offset);
  const fixedFrameDeltaPoint = vec3(input.fixedFrameDeltaPoint, deltaPoint);
  const motionRequiresWindow = eventType === "mouse-motion";
  const windowAssertionSatisfied = !motionRequiresWindow || input.hasWindow !== false;
  const dispatchesEvent = windowAssertionSatisfied;
  const propagationStopped = dispatchesEvent && input.dispatcherResult === false;
  const panSensitivity = finite(input.panSensitivity, 1);
  const scrollSensitivity = finite(input.scrollSensitivity, 1);
  const pixelHeight = positivePixelHeight(input.pixelHeight);
  const yPixelOffset = finite(input.yPixelOffset, 0);

  const motionAction = eventType === "mouse-motion"
    ? motionFrameAction({
      deltaPoint,
      dispatcherStopped: propagationStopped,
      fixedFrameDeltaPoint,
      isPan3dKeyPressed: input.isPan3dKeyPressed === true,
      isPanKeyPressed: input.isPanKeyPressed === true,
      panSensitivity,
      windowAssertionSatisfied
    })
    : null;
  const dragFrameShift = eventType === "mouse-drag" && input.dragToPan === true
    ? negate(deltaPoint)
    : ZERO_VEC3;
  const scrollAction = eventType === "mouse-scroll"
    ? scrollFrameAction({
      dispatcherStopped: propagationStopped,
      pixelHeight,
      point,
      scrollSensitivity,
      yPixelOffset
    })
    : null;
  const frameAction: MathScenePointerFrameAction = motionAction?.frameAction
    ?? scrollAction?.frameAction
    ?? (eventType === "mouse-drag" && input.dragToPan === true ? "drag-pan" : "none");
  const frameShift = motionAction?.frameShift ?? dragFrameShift;
  const basePlan = {
    button: finiteOptionalInteger(input.button),
    buttons: finiteOptionalInteger(input.buttons),
    deltaPoint,
    dispatchesEvent,
    eventType,
    frameAction,
    frameShift,
    modifiers: finiteOptionalInteger(input.modifiers),
    mouseDragPointUpdated: eventType === "mouse-drag" || eventType === "mouse-press",
    mousePointUpdated: eventType === "mouse-motion" && windowAssertionSatisfied,
    offset,
    phiDelta: motionAction?.phiDelta ?? 0,
    point,
    propagationStopped,
    scaleAboutPoint: scrollAction?.scaleAboutPoint ?? ZERO_VEC3,
    scaleFactor: scrollAction?.scaleFactor ?? 1,
    scrollRelativeOffset: scrollAction?.scrollRelativeOffset ?? 0,
    sourceContract: SCENE_POINTER_CONTROL_SOURCE_CONTRACT,
    thetaDelta: motionAction?.thetaDelta ?? 0,
    windowAssertionSatisfied
  };

  return {
    ...basePlan,
    pointerControlVersion: "mais-manim-pointer-controls/v1",
    summary: buildSummary(basePlan)
  };
}

export function scenePointerControlDataAttributes(plan: MathScenePointerControlPlan): Record<string, string> {
  return {
    "data-viz-manim-pointer-button": plan.button === null ? "none" : String(plan.button),
    "data-viz-manim-pointer-buttons": plan.buttons === null ? "none" : String(plan.buttons),
    "data-viz-manim-pointer-control-version": plan.pointerControlVersion,
    "data-viz-manim-pointer-delta-point": formatVec3(plan.deltaPoint),
    "data-viz-manim-pointer-dispatches-event": String(plan.dispatchesEvent),
    "data-viz-manim-pointer-event-type": plan.eventType,
    "data-viz-manim-pointer-frame-action": plan.frameAction,
    "data-viz-manim-pointer-frame-shift": formatVec3(plan.frameShift),
    "data-viz-manim-pointer-modifiers": plan.modifiers === null ? "none" : String(plan.modifiers),
    "data-viz-manim-pointer-mouse-drag-point-updated": String(plan.mouseDragPointUpdated),
    "data-viz-manim-pointer-mouse-point-updated": String(plan.mousePointUpdated),
    "data-viz-manim-pointer-offset": formatVec3(plan.offset),
    "data-viz-manim-pointer-phi-delta": fixedNumber(plan.phiDelta),
    "data-viz-manim-pointer-point": formatVec3(plan.point),
    "data-viz-manim-pointer-propagation-stopped": String(plan.propagationStopped),
    "data-viz-manim-pointer-scale-about-point": formatVec3(plan.scaleAboutPoint),
    "data-viz-manim-pointer-scale-factor": fixedNumber(plan.scaleFactor),
    "data-viz-manim-pointer-scroll-relative-offset": fixedNumber(plan.scrollRelativeOffset),
    "data-viz-manim-pointer-source-contract": plan.sourceContract,
    "data-viz-manim-pointer-summary": plan.summary,
    "data-viz-manim-pointer-theta-delta": fixedNumber(plan.thetaDelta),
    "data-viz-manim-pointer-window-ok": String(plan.windowAssertionSatisfied)
  };
}

export function serializeScenePointerControlPlan(plan: MathScenePointerControlPlan) {
  return stableSerialize(plan);
}
