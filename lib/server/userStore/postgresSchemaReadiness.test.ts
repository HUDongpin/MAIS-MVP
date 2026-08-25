import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresSchemaReadinessGate,
  normalizePostgresSchemaBootstrapError,
  PostgresAdvisoryBootstrapContentionError,
  PostgresAdvisoryMarkerContentionError,
  runPostgresBootstrapWithContentionRecovery
} from "./postgresSchemaReadiness";

test("relation lock timeout after the advisory boundary becomes a stable retryable readiness error", () => {
  const sensitiveLockError = Object.assign(
    new Error("SENSITIVE projection_questions_topic_idx lock diagnostic"),
    { code: "55P03" }
  );
  const normalized = normalizePostgresSchemaBootstrapError(sensitiveLockError);

  assert.ok(normalized instanceof Error);
  assert.equal(normalized.message, "Postgres storage readiness is unavailable.");
  assert.equal(normalized.cause, sensitiveLockError);
  assert.doesNotMatch(String(normalized), /SENSITIVE|55P03|projection_questions_topic_idx/u);

  const advisoryContention = new PostgresAdvisoryBootstrapContentionError(sensitiveLockError);
  assert.equal(
    normalizePostgresSchemaBootstrapError(advisoryContention),
    advisoryContention,
    "the exact advisory-lock signal must remain eligible for bounded contention recovery"
  );

  for (const code of ["42501", "57014", "ETIMEDOUT"]) {
    const unrelated = Object.assign(new Error(`bootstrap ${code}`), { code });
    assert.equal(
      normalizePostgresSchemaBootstrapError(unrelated),
      unrelated,
      `${code} must keep its existing diagnostic and recovery semantics`
    );
  }
});

test("only exact advisory bootstrap contention may poll a strict marker and retry", async () => {
  const lockError = Object.assign(new Error("advisory lock timeout"), { code: "55P03" });
  let bootstraps = 0;
  let markerReads = 0;
  await runPostgresBootstrapWithContentionRecovery({
    bootstrap: async () => {
      bootstraps += 1;
      if (bootstraps === 1) throw new PostgresAdvisoryBootstrapContentionError(lockError);
    },
    readCurrentMarker: async () => {
      markerReads += 1;
      return false;
    }
  });
  assert.equal(bootstraps, 2);
  assert.equal(markerReads, 1);

  bootstraps = 0;
  markerReads = 0;
  await runPostgresBootstrapWithContentionRecovery({
    bootstrap: async () => {
      bootstraps += 1;
      throw new PostgresAdvisoryBootstrapContentionError(lockError);
    },
    readCurrentMarker: async () => {
      markerReads += 1;
      return true;
    }
  });
  assert.equal(bootstraps, 1);
  assert.equal(markerReads, 1);

  bootstraps = 0;
  markerReads = 0;
  await runPostgresBootstrapWithContentionRecovery({
    bootstrap: async () => {
      bootstraps += 1;
      throw new PostgresAdvisoryBootstrapContentionError(lockError);
    },
    readCurrentMarker: async () => {
      markerReads += 1;
      if (markerReads === 1) throw new PostgresAdvisoryMarkerContentionError(lockError);
      return true;
    }
  });
  assert.equal(bootstraps, 2);
  assert.equal(markerReads, 2);

  const rawRelationLockTimeout = Object.assign(new Error("relation lock timeout"), { code: "55P03" });
  await assert.rejects(
    runPostgresBootstrapWithContentionRecovery({
      bootstrap: async () => { throw new PostgresAdvisoryBootstrapContentionError(lockError); },
      readCurrentMarker: async () => { throw rawRelationLockTimeout; }
    }),
    (actual) => actual === rawRelationLockTimeout
  );
});

test("contention recovery never swallows permission, transport, statement, or DDL failures", async () => {
  for (const code of ["42501", "57014", "ETIMEDOUT", "55P03"]) {
    const error = Object.assign(new Error(`bootstrap ${code}`), { code });
    let markerReads = 0;
    await assert.rejects(
      runPostgresBootstrapWithContentionRecovery({
        bootstrap: async () => { throw error; },
        readCurrentMarker: async () => {
          markerReads += 1;
          return true;
        }
      }),
      (actual) => actual === error
    );
    assert.equal(markerReads, 0, `${code} must not enter advisory contention recovery`);
  }

  const markerTimeout = Object.assign(new Error("strict marker timeout"), { code: "57014" });
  await assert.rejects(
    runPostgresBootstrapWithContentionRecovery({
      bootstrap: async () => {
        throw new PostgresAdvisoryBootstrapContentionError(
          Object.assign(new Error("advisory lock timeout"), { code: "55P03" })
        );
      },
      readCurrentMarker: async () => { throw markerTimeout; }
    }),
    (actual) => actual === markerTimeout
  );
});

test("marker hit skips bootstrap work and latches success", async () => {
  let markerReads = 0;
  let bootstraps = 0;
  const ensureReady = createPostgresSchemaReadinessGate({
    readCurrentMarker: async () => {
      markerReads += 1;
      return true;
    },
    bootstrap: async () => {
      bootstraps += 1;
    }
  });

  const first = ensureReady();
  const second = ensureReady();

  assert.equal(first, second);
  await first;
  await ensureReady();
  assert.equal(markerReads, 1);
  assert.equal(bootstraps, 0);
});

test("missing marker runs bootstrap exactly once", async () => {
  let markerReads = 0;
  let bootstraps = 0;
  const ensureReady = createPostgresSchemaReadinessGate({
    readCurrentMarker: async () => {
      markerReads += 1;
      return false;
    },
    bootstrap: async () => {
      bootstraps += 1;
    }
  });

  await ensureReady();
  await ensureReady();

  assert.equal(markerReads, 1);
  assert.equal(bootstraps, 1);
});

test("42P01 from the marker probe bootstraps an absent migration table", async () => {
  let bootstraps = 0;
  const ensureReady = createPostgresSchemaReadinessGate({
    readCurrentMarker: async () => {
      throw { code: "42P01" };
    },
    bootstrap: async () => {
      bootstraps += 1;
    }
  });

  await ensureReady();

  assert.equal(bootstraps, 1);
});

test("non-42P01 marker probe errors propagate without bootstrapping", async () => {
  for (const code of ["42501", "57014", "ETIMEDOUT"]) {
    const error = { code };
    let bootstraps = 0;
    const ensureReady = createPostgresSchemaReadinessGate({
      readCurrentMarker: async () => {
        throw error;
      },
      bootstrap: async () => {
        bootstraps += 1;
      }
    });

    await assert.rejects(ensureReady(), (actual) => {
      assert.equal(actual, error);
      return true;
    });
    assert.equal(bootstraps, 0);
  }
});

test("concurrent callers share one in-flight marker probe", async () => {
  let markerReads = 0;
  let resolveMarker: ((value: boolean) => void) | undefined;
  const marker = new Promise<boolean>((resolve) => {
    resolveMarker = resolve;
  });
  const ensureReady = createPostgresSchemaReadinessGate({
    readCurrentMarker: async () => {
      markerReads += 1;
      return marker;
    },
    bootstrap: async () => {
      throw new Error("bootstrap should not run");
    }
  });

  const first = ensureReady();
  const second = ensureReady();

  assert.equal(first, second);
  assert.equal(markerReads, 1);
  assert.ok(resolveMarker);
  resolveMarker(true);
  await Promise.all([first, second]);
});

test("a rejected marker probe clears readiness and the next call retries", async () => {
  const firstError = { code: "42501" };
  let markerReads = 0;
  const ensureReady = createPostgresSchemaReadinessGate({
    readCurrentMarker: async () => {
      markerReads += 1;
      if (markerReads === 1) throw firstError;
      return true;
    },
    bootstrap: async () => {
      throw new Error("bootstrap should not run");
    }
  });

  await assert.rejects(ensureReady(), (actual) => {
    assert.equal(actual, firstError);
    return true;
  });
  await ensureReady();

  assert.equal(markerReads, 2);
});

test("a rejected bootstrap clears readiness and the next call retries", async () => {
  const firstError = new Error("bootstrap failed");
  let markerReads = 0;
  let bootstraps = 0;
  const ensureReady = createPostgresSchemaReadinessGate({
    readCurrentMarker: async () => {
      markerReads += 1;
      return false;
    },
    bootstrap: async () => {
      bootstraps += 1;
      if (bootstraps === 1) throw firstError;
    }
  });

  await assert.rejects(ensureReady(), (actual) => {
    assert.equal(actual, firstError);
    return true;
  });
  await ensureReady();

  assert.equal(markerReads, 2);
  assert.equal(bootstraps, 2);
});

test("42P01 from bootstrap is not swallowed and remains retryable", async () => {
  const firstError = { code: "42P01" };
  let bootstraps = 0;
  const ensureReady = createPostgresSchemaReadinessGate({
    readCurrentMarker: async () => false,
    bootstrap: async () => {
      bootstraps += 1;
      if (bootstraps === 1) throw firstError;
    }
  });

  await assert.rejects(ensureReady(), (actual) => {
    assert.equal(actual, firstError);
    return true;
  });
  await ensureReady();

  assert.equal(bootstraps, 2);
});
