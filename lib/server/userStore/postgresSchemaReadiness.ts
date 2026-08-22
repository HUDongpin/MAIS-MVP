export type PostgresSchemaReadinessDependencies = {
  readCurrentMarker: () => Promise<boolean>;
  bootstrap: () => Promise<void>;
};

function isUndefinedTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "42P01"
  );
}

export function createPostgresSchemaReadinessGate({
  bootstrap,
  readCurrentMarker
}: PostgresSchemaReadinessDependencies) {
  let readiness: Promise<void> | null = null;

  return function ensureReady(): Promise<void> {
    if (readiness) return readiness;

    const attempt = (async () => {
      let markerExists = false;

      try {
        markerExists = await readCurrentMarker();
      } catch (error) {
        if (!isUndefinedTableError(error)) throw error;
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
