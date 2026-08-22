export type AITutorAdmissionStage = "auth" | "classroom-policy" | "rate-limit";

export type AITutorAdmissionObservation = {
  stage: AITutorAdmissionStage;
  phase: "start" | "resolved" | "deadline" | "aborted" | "error";
  durationMs: number;
  deadlineMs: number;
};

type AITutorAdmissionDeadlines = {
  authMs: number;
  classroomPolicyMs: number;
  rateLimitMs: number;
};

type AITutorAdmissionDependencies<TAuthenticated, TClassroomPolicy, TRateLimit> = {
  authenticate(request: Request, signal: AbortSignal): Promise<TAuthenticated | null>;
  resolveClassroomPolicy(
    authenticated: TAuthenticated,
    signal: AbortSignal
  ): Promise<TClassroomPolicy>;
  shouldContinueAfterClassroomPolicy?(classroomPolicy: TClassroomPolicy): boolean;
  consumeRateLimit(
    authenticated: TAuthenticated,
    classroomPolicy: TClassroomPolicy,
    signal: AbortSignal
  ): Promise<TRateLimit>;
};

export type AITutorAdmissionResult<TAuthenticated, TClassroomPolicy, TRateLimit> =
  | {
      status: "admitted";
      authenticated: TAuthenticated;
      classroomPolicy: TClassroomPolicy;
      rateLimit: TRateLimit;
    }
  | {
      status: "unauthenticated";
    }
  | {
      status: "classroom-policy-blocked";
      authenticated: TAuthenticated;
      classroomPolicy: TClassroomPolicy;
    }
  | {
      status: "unavailable";
      stage: AITutorAdmissionStage;
      reason: "deadline" | "aborted" | "error";
    };

type StageResult<T> =
  | { status: "resolved"; value: T }
  | { status: "deadline" | "aborted" | "error" };

function boundedStageDeadlineMs(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.round(value));
}

async function runAdmissionStage<T>({
  deadlineMs: rawDeadlineMs,
  operation,
  observe,
  signal,
  stage
}: {
  deadlineMs: number;
  operation: (signal: AbortSignal) => Promise<T>;
  observe?: (event: AITutorAdmissionObservation) => void;
  signal?: AbortSignal;
  stage: AITutorAdmissionStage;
}): Promise<StageResult<T>> {
  const deadlineMs = boundedStageDeadlineMs(rawDeadlineMs);
  const startedAt = Date.now();
  const stageController = new AbortController();
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  let removeExternalAbortListener: (() => void) | undefined;

  const emit = (phase: AITutorAdmissionObservation["phase"]) => {
    observe?.({
      stage,
      phase,
      durationMs: Math.max(0, Date.now() - startedAt),
      deadlineMs
    });
  };

  emit("start");

  if (signal?.aborted) {
    stageController.abort(signal.reason);
    emit("aborted");
    return { status: "aborted" };
  }

  const operationResult: Promise<StageResult<T>> = Promise.resolve()
    .then(() => operation(stageController.signal))
    .then(
      (value): StageResult<T> => ({ status: "resolved", value }),
      (): StageResult<T> => ({ status: stageController.signal.aborted ? "aborted" : "error" })
    );

  const deadlineResult = new Promise<StageResult<T>>((resolve) => {
    deadlineTimer = setTimeout(() => resolve({ status: "deadline" }), deadlineMs);
  });

  const candidates: Array<Promise<StageResult<T>>> = [operationResult, deadlineResult];
  if (signal) {
    candidates.push(new Promise<StageResult<T>>((resolve) => {
      const onAbort = () => {
        stageController.abort(signal.reason);
        resolve({ status: "aborted" });
      };
      signal.addEventListener("abort", onAbort, { once: true });
      removeExternalAbortListener = () => signal.removeEventListener("abort", onAbort);
    }));
  }

  const result = await Promise.race(candidates);
  if (deadlineTimer) clearTimeout(deadlineTimer);
  removeExternalAbortListener?.();

  if (result.status === "deadline") {
    stageController.abort(new Error(`${stage}-deadline`));
  }
  emit(result.status);
  return result;
}

export async function runAiTutorAdmission<TAuthenticated, TClassroomPolicy, TRateLimit>({
  deadlines,
  dependencies,
  observe,
  request,
  signal
}: {
  deadlines: AITutorAdmissionDeadlines;
  dependencies: AITutorAdmissionDependencies<TAuthenticated, TClassroomPolicy, TRateLimit>;
  observe?: (event: AITutorAdmissionObservation) => void;
  request: Request;
  signal?: AbortSignal;
}): Promise<AITutorAdmissionResult<TAuthenticated, TClassroomPolicy, TRateLimit>> {
  const authentication = await runAdmissionStage({
    deadlineMs: deadlines.authMs,
    operation: (stageSignal) => dependencies.authenticate(request, stageSignal),
    observe,
    signal,
    stage: "auth"
  });
  if (authentication.status !== "resolved") {
    return {
      status: "unavailable",
      stage: "auth",
      reason: authentication.status
    };
  }
  const authenticated = authentication.value;
  if (authenticated === null) return { status: "unauthenticated" };

  const classroomPolicy = await runAdmissionStage({
    deadlineMs: deadlines.classroomPolicyMs,
    operation: (stageSignal) => dependencies.resolveClassroomPolicy(authenticated, stageSignal),
    observe,
    signal,
    stage: "classroom-policy"
  });
  if (classroomPolicy.status !== "resolved") {
    return {
      status: "unavailable",
      stage: "classroom-policy",
      reason: classroomPolicy.status
    };
  }
  if (
    dependencies.shouldContinueAfterClassroomPolicy
    && !dependencies.shouldContinueAfterClassroomPolicy(classroomPolicy.value)
  ) {
    return {
      status: "classroom-policy-blocked",
      authenticated,
      classroomPolicy: classroomPolicy.value
    };
  }

  const rateLimit = await runAdmissionStage({
    deadlineMs: deadlines.rateLimitMs,
    operation: (stageSignal) => dependencies.consumeRateLimit(
      authenticated,
      classroomPolicy.value,
      stageSignal
    ),
    observe,
    signal,
    stage: "rate-limit"
  });
  if (rateLimit.status !== "resolved") {
    return {
      status: "unavailable",
      stage: "rate-limit",
      reason: rateLimit.status
    };
  }

  return {
    status: "admitted",
    authenticated,
    classroomPolicy: classroomPolicy.value,
    rateLimit: rateLimit.value
  };
}
