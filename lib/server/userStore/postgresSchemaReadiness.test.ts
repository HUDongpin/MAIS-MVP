import assert from "node:assert/strict";
import test from "node:test";

import { createPostgresSchemaReadinessGate } from "./postgresSchemaReadiness";

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
