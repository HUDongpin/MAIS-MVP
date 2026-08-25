import {
  validateMathSceneVideoExportReadyResult,
  type MathSceneVideoExportError,
  type MathSceneVideoExportReadyResult,
  type MathSceneVideoExportStatus
} from "./mathSceneVideoExportContract";

export type MathSceneVideoExportState = {
  attempt: number;
  error: MathSceneVideoExportError | null;
  requestId: string | null;
  result: MathSceneVideoExportReadyResult | null;
  status: MathSceneVideoExportStatus;
};

export type MathSceneVideoExportEvent =
  | { requestId: string; type: "prepare" }
  | { attempt: number; type: "capture" }
  | { attempt: number; type: "encode" }
  | { attempt: number; result: MathSceneVideoExportReadyResult; type: "succeed" }
  | { attempt: number; error: MathSceneVideoExportError; type: "unsupported" }
  | { attempt: number; error: MathSceneVideoExportError; type: "fail" }
  | { attempt: number; type: "cancel" }
  | { requestId: string; type: "retry" };

export type MathSceneVideoExportTransition =
  | { ok: true; state: MathSceneVideoExportState }
  | { error: MathSceneVideoExportError; ok: false; state: MathSceneVideoExportState };

const retryableStatuses = new Set<MathSceneVideoExportStatus>([
  "cancelled",
  "failed",
  "unsupported"
]);
const activeStatuses = new Set<MathSceneVideoExportStatus>([
  "preparing",
  "capturing",
  "encoding"
]);

function transitionError(
  state: MathSceneVideoExportState,
  code: MathSceneVideoExportError["code"],
  message: string,
  path = "status"
): MathSceneVideoExportTransition {
  return { error: { code, message, path }, ok: false, state };
}

function accepted(state: MathSceneVideoExportState): MathSceneVideoExportTransition {
  return { ok: true, state };
}

function requestIdIsValid(requestId: unknown): requestId is string {
  return typeof requestId === "string" && requestId.trim().length > 0;
}

function activeState(
  prior: MathSceneVideoExportState,
  status: Extract<MathSceneVideoExportStatus, "preparing" | "capturing" | "encoding">
): MathSceneVideoExportState {
  return {
    attempt: prior.attempt,
    error: null,
    requestId: prior.requestId,
    result: null,
    status
  };
}

export function createMathSceneVideoExportInitialState(): MathSceneVideoExportState {
  return {
    attempt: 0,
    error: null,
    requestId: null,
    result: null,
    status: "idle"
  };
}

export function transitionMathSceneVideoExportState(
  state: MathSceneVideoExportState,
  event: MathSceneVideoExportEvent
): MathSceneVideoExportTransition {
  if (!event || typeof event !== "object" || typeof (event as { type?: unknown }).type !== "string") {
    return transitionError(state, "INVALID_STATE_TRANSITION", "Export transition event is invalid.", "event");
  }

  if ("attempt" in event && event.attempt !== state.attempt) {
    return transitionError(
      state,
      "STALE_EXPORT_ATTEMPT",
      `Ignored export attempt ${event.attempt}; current attempt is ${state.attempt}.`,
      "attempt"
    );
  }

  switch (event.type) {
    case "prepare": {
      if (state.status !== "idle" || !requestIdIsValid(event.requestId)) {
        return transitionError(state, "INVALID_STATE_TRANSITION", "Only idle exports may prepare a valid request.");
      }
      return accepted({
        attempt: 1,
        error: null,
        requestId: event.requestId,
        result: null,
        status: "preparing"
      });
    }
    case "capture": {
      if (state.status !== "preparing") {
        return transitionError(state, "INVALID_STATE_TRANSITION", "Only preparing exports may start capture.");
      }
      return accepted(activeState(state, "capturing"));
    }
    case "encode": {
      if (state.status !== "capturing") {
        return transitionError(state, "INVALID_STATE_TRANSITION", "Only capturing exports may start encoding.");
      }
      return accepted(activeState(state, "encoding"));
    }
    case "succeed": {
      if (state.status !== "encoding") {
        return transitionError(state, "INVALID_STATE_TRANSITION", "Only encoding exports may become ready.");
      }
      const validated = validateMathSceneVideoExportReadyResult(event.result);
      if (!validated.ok) {
        const primary = validated.errors[0];
        return transitionError(
          state,
          primary?.code ?? "READY_RESULT_INVALID",
          primary?.message ?? "Ready export result is invalid.",
          primary?.path ?? "result"
        );
      }
      return accepted({
        attempt: state.attempt,
        error: null,
        requestId: state.requestId,
        result: validated.value,
        status: "ready"
      });
    }
    case "unsupported": {
      if (state.status !== "preparing") {
        return transitionError(state, "INVALID_STATE_TRANSITION", "Only preparing exports may become unsupported.");
      }
      return accepted({
        attempt: state.attempt,
        error: structuredClone(event.error),
        requestId: state.requestId,
        result: null,
        status: "unsupported"
      });
    }
    case "fail": {
      if (!activeStatuses.has(state.status)) {
        return transitionError(state, "INVALID_STATE_TRANSITION", "Only active exports may fail.");
      }
      return accepted({
        attempt: state.attempt,
        error: structuredClone(event.error),
        requestId: state.requestId,
        result: null,
        status: "failed"
      });
    }
    case "cancel": {
      if (state.status === "cancelled") return accepted(state);
      if (!activeStatuses.has(state.status)) {
        return transitionError(state, "INVALID_STATE_TRANSITION", "Only active exports may be cancelled.");
      }
      return accepted({
        attempt: state.attempt,
        error: {
          code: "CAPTURE_ABORTED",
          message: "Video export was cancelled.",
          path: "status"
        },
        requestId: state.requestId,
        result: null,
        status: "cancelled"
      });
    }
    case "retry": {
      if (!retryableStatuses.has(state.status) || !requestIdIsValid(event.requestId)) {
        return transitionError(state, "INVALID_STATE_TRANSITION", "Only retryable exports may prepare a new request.");
      }
      return accepted({
        attempt: state.attempt + 1,
        error: null,
        requestId: event.requestId,
        result: null,
        status: "preparing"
      });
    }
    default:
      return transitionError(state, "INVALID_STATE_TRANSITION", "Unknown export transition; planned is not a public state.", "event.type");
  }
}
