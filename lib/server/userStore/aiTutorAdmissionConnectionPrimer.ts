export function createAiTutorAdmissionConnectionPrimer(
  startAttempt: () => Promise<void>
) {
  let activeAttempt: Promise<void> | null = null;

  const prime = () => {
    if (activeAttempt) return activeAttempt;

    let started: Promise<void>;
    try {
      started = startAttempt();
    } catch (error) {
      started = Promise.reject(error);
    }

    const attempt = Promise.resolve(started).finally(() => {
      if (activeAttempt === attempt) activeAttempt = null;
    });
    activeAttempt = attempt;
    return attempt;
  };

  const waitForActiveAttempt = async () => {
    await activeAttempt?.catch(() => undefined);
  };

  return { prime, waitForActiveAttempt };
}

function aiTutorPostgresOperationAbortError() {
  return new DOMException("AI Tutor Postgres admission was aborted.", "AbortError");
}

export async function runAbortBoundedAiTutorPostgresOperation<Result>({
  abortOperation,
  operation,
  signal
}: {
  abortOperation: () => Promise<unknown> | unknown;
  operation: () => Promise<Result>;
  signal: AbortSignal;
}): Promise<Result> {
  if (signal.aborted) throw aiTutorPostgresOperationAbortError();

  let abortRequested = false;
  let rejectForAbort!: (error: DOMException) => void;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectForAbort = reject;
  });
  const onAbort = () => {
    if (abortRequested) return;
    abortRequested = true;
    void Promise.resolve()
      .then(abortOperation)
      .catch(() => undefined)
      .then(() => rejectForAbort(aiTutorPostgresOperationAbortError()));
  };

  signal.addEventListener("abort", onAbort, { once: true });
  if (signal.aborted) onAbort();
  if (abortRequested) {
    try {
      return await aborted;
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  }

  let operationResult: Promise<Result>;
  try {
    operationResult = Promise.resolve(operation());
  } catch (error) {
    signal.removeEventListener("abort", onAbort);
    if (signal.aborted) return aborted;
    throw error;
  }

  try {
    const result = await Promise.race([operationResult, aborted]);
    if (signal.aborted) return aborted;
    return result;
  } catch (error) {
    if (signal.aborted) return aborted;
    throw error;
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
