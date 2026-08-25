import type { DatabaseSync } from "node:sqlite";

export class SqliteAsyncMutationError extends Error {
  constructor() {
    super("SQLite database state loaders and mutators must be synchronous; run external I/O outside the mutation boundary.");
    this.name = "SqliteAsyncMutationError";
  }
}

type SqliteMutationBoundaryOptions<State, Result> = {
  storage: DatabaseSync;
  loadState: () => State;
  mutate: (state: State) => Result | Promise<Result>;
  writeState: (state: State) => string | null;
  afterCommit?: (state: State, stateToken: string | null) => void;
};

function isPromiseLike<Result>(value: Result | Promise<Result>): value is Promise<Result> {
  return (
    (typeof value === "object" && value !== null) || typeof value === "function"
  ) && typeof (value as PromiseLike<Result>).then === "function";
}

/**
 * Runs a whole-snapshot SQLite mutation without holding the cross-process
 * writer lock across caller-owned network or filesystem awaits.
 *
 * State loaders and mutators must be synchronous and retain the ordinary
 * BEGIN IMMEDIATE read/write transaction. Promise-returning callbacks are
 * rejected and rolled back immediately; caller-owned network and filesystem
 * work must use an explicit durable reservation or compensation protocol
 * outside this helper.
 */
export async function runSqliteMutationBoundary<State, Result>({
  storage,
  loadState,
  mutate,
  writeState,
  afterCommit
}: SqliteMutationBoundaryOptions<State, Result>): Promise<Result> {
  let transactionStarted = false;

  const begin = () => {
    storage.exec("BEGIN IMMEDIATE");
    transactionStarted = true;
  };
  const commit = () => {
    storage.exec("COMMIT");
    transactionStarted = false;
  };
  const rollback = () => {
    storage.exec("ROLLBACK");
    transactionStarted = false;
  };

  try {
    begin();
    const state = loadState();
    if (isPromiseLike(state)) {
      void Promise.resolve(state).catch(() => undefined);
      throw new SqliteAsyncMutationError();
    }
    const mutationResult = mutate(state);
    if (isPromiseLike(mutationResult)) {
      // Avoid an unhandled rejection from a legacy async callback. Production
      // source contracts prohibit such callbacks because code before their
      // first await may already have initiated an irreversible side effect.
      void Promise.resolve(mutationResult).catch(() => undefined);
      throw new SqliteAsyncMutationError();
    }
    const committedStateToken = writeState(state);
    commit();
    afterCommit?.(state, committedStateToken);
    return mutationResult;
  } catch (error) {
    if (transactionStarted) {
      try {
        rollback();
      } catch {
        // Preserve the original mutation, conflict, or write failure.
      }
    }
    throw error;
  }
}
