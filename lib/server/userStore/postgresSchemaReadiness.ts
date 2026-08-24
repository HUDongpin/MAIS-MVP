export type PostgresSchemaReadinessDependencies = {
  readCurrentMarker: () => Promise<boolean>;
  bootstrap: () => Promise<void>;
};

const postgresBootstrapContentionAttempts = 6;

export class PostgresAdvisoryBootstrapContentionError extends Error {
  constructor(cause: unknown) {
    super("Postgres schema bootstrap advisory lock is contended.", { cause });
    this.name = "PostgresAdvisoryBootstrapContentionError";
  }
}

export class PostgresAdvisoryMarkerContentionError extends Error {
  constructor(cause: unknown) {
    super("Postgres schema marker advisory lock is contended.", { cause });
    this.name = "PostgresAdvisoryMarkerContentionError";
  }
}

function isUndefinedTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "42P01"
  );
}

export async function runPostgresBootstrapWithContentionRecovery({
  bootstrap,
  readCurrentMarker
}: PostgresSchemaReadinessDependencies) {
  let lastContention: PostgresAdvisoryBootstrapContentionError | null = null;
  for (let attempt = 0; attempt < postgresBootstrapContentionAttempts; attempt += 1) {
    try {
      await bootstrap();
      return;
    } catch (error) {
      if (!(error instanceof PostgresAdvisoryBootstrapContentionError)) throw error;
      lastContention = error;
    }

    let markerExists = false;
    try {
      markerExists = await readCurrentMarker();
    } catch (error) {
      if (error instanceof PostgresAdvisoryMarkerContentionError) continue;
      if (!isUndefinedTableError(error)) throw error;
    }
    if (markerExists) return;
  }
  throw lastContention ?? new Error("Postgres schema bootstrap is unavailable.");
}

export function createPostgresSchemaReadinessGate({
  bootstrap,
  readCurrentMarker
}: PostgresSchemaReadinessDependencies) {
  // This is deliberately a bootstrap latch, not a continuing authorization or
  // schema-attestation cache. Strict external probes and partial writers must
  // re-check their own current capability on every operation.
  let readiness: Promise<void> | null = null;

  return function ensureReady(): Promise<void> {
    if (readiness) return readiness;

    const attempt = (async () => {
      let markerExists = false;

      try {
        markerExists = await readCurrentMarker();
      } catch (error) {
        if (
          !isUndefinedTableError(error)
          && !(error instanceof PostgresAdvisoryMarkerContentionError)
        ) {
          throw error;
        }
      }

      if (!markerExists) {
        await bootstrap();
      }
    })();

    readiness = attempt;
    void attempt.catch(() => {
      if (readiness === attempt) readiness = null;
    });

    return attempt;
  };
}
