import {
  authenticatedUserFromAuthRecords,
  projectedStudentProfileRecord,
  projectedUserRecord,
  projectedUserSettingsRecord,
  type AuthSession
} from "@/lib/server/userStore/authSessionPersistence";

export type AuthAdmissionCancellableQuery<Row> = PromiseLike<readonly Row[]> & {
  cancel(): void;
};

export type AuthAdmissionJoinedRow = {
  profile_record: unknown;
  schema_ready: unknown;
  settings_record: unknown;
  user_record: unknown;
};

export function mapAuthAdmissionJoinedRow(
  row: AuthAdmissionJoinedRow,
  {
    mediaObjectUrlForKey,
    now
  }: {
    mediaObjectUrlForKey: (objectKey: string) => string | null | undefined;
    now?: Date;
  }
): AuthSession | null {
  if (row.schema_ready !== true) {
    throw new Error("AI Tutor authentication schema is unavailable.");
  }

  const user = projectedUserRecord(row.user_record);
  const profile = projectedStudentProfileRecord(row.profile_record);
  if (!user || !profile) return null;

  return authenticatedUserFromAuthRecords({
    mediaObjectUrlForKey,
    now,
    profile,
    settingsRecord: projectedUserSettingsRecord(row.settings_record),
    user
  });
}

function authAdmissionAbortError() {
  return new DOMException("AI Tutor authentication was aborted.", "AbortError");
}

function throwIfAuthAdmissionAborted(signal: AbortSignal) {
  if (signal.aborted) throw authAdmissionAbortError();
}

export function createAbortableAuthAdmissionSlot() {
  type Waiter = {
    abort: () => void;
    grant: () => void;
    signal: AbortSignal;
  };

  let active = false;
  const waiters: Waiter[] = [];

  const releaseSlot = () => {
    const next = waiters.shift();
    if (next) {
      next.signal.removeEventListener("abort", next.abort);
      next.grant();
      return;
    }
    active = false;
  };

  const acquireSlot = (signal: AbortSignal): Promise<() => void> => {
    throwIfAuthAdmissionAborted(signal);
    if (!active) {
      active = true;
      return Promise.resolve(releaseSlot);
    }

    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        abort: () => {
          const index = waiters.indexOf(waiter);
          if (index >= 0) waiters.splice(index, 1);
          signal.removeEventListener("abort", waiter.abort);
          reject(authAdmissionAbortError());
        },
        grant: () => resolve(releaseSlot),
        signal
      };
      waiters.push(waiter);
      signal.addEventListener("abort", waiter.abort, { once: true });
      if (signal.aborted) waiter.abort();
    });
  };

  return {
    async run<Result>(signal: AbortSignal, operation: () => Promise<Result>): Promise<Result> {
      const release = await acquireSlot(signal);
      let released = false;
      try {
        throwIfAuthAdmissionAborted(signal);
        return await operation();
      } finally {
        if (!released) {
          released = true;
          release();
        }
      }
    }
  };
}

export async function runCancellableAuthAdmissionQuery<Row, Authenticated>({
  createQuery,
  mapRow,
  onAuthoritativeMiss,
  signal,
  userId
}: {
  createQuery: (userId: string) => AuthAdmissionCancellableQuery<Row>;
  mapRow: (row: Row) => Authenticated | null;
  onAuthoritativeMiss?: (userId: string) => Authenticated | null;
  signal: AbortSignal;
  userId: string;
}): Promise<Authenticated | null> {
  throwIfAuthAdmissionAborted(signal);

  let query: AuthAdmissionCancellableQuery<Row>;
  try {
    query = createQuery(userId);
  } catch (error) {
    throwIfAuthAdmissionAborted(signal);
    throw error;
  }

  let cancelRequested = false;
  let rejectForAbort!: (error: DOMException) => void;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectForAbort = reject;
  });
  const cancelQuery = () => {
    if (cancelRequested) return;
    cancelRequested = true;
    try {
      query.cancel();
    } catch {
      // Cancellation is best-effort. The independent abort promise still
      // settles the admission wrapper, while the transaction slot stays held
      // until its local timeout and rollback finish cleaning up the query.
    }
    rejectForAbort(authAdmissionAbortError());
  };

  signal.addEventListener("abort", cancelQuery, { once: true });
  if (signal.aborted) cancelQuery();

  try {
    const queryResult = Promise.resolve(query);
    const rows = await Promise.race([queryResult, aborted]);
    throwIfAuthAdmissionAborted(signal);
    if (rows.length === 0) {
      const fallback = onAuthoritativeMiss?.(userId);
      return fallback === undefined ? null : fallback;
    }
    if (rows.length !== 1) {
      throw new Error("AI Tutor authentication query returned an invalid row count.");
    }

    const authenticated = mapRow(rows[0]);
    if (authenticated === null) {
      throw new Error("AI Tutor authentication records are invalid.");
    }
    return authenticated;
  } catch (error) {
    if (signal.aborted) throw authAdmissionAbortError();
    throw error;
  } finally {
    signal.removeEventListener("abort", cancelQuery);
  }
}
