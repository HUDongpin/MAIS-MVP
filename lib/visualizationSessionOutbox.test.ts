import assert from "node:assert/strict";
import test from "node:test";
import {
  acknowledgeVisualizationSessionOutbox,
  clearVisualizationSessionOutboxForUser,
  isVisualizationSessionOutboxAcknowledgement,
  isVisualizationSessionOutboxRecord,
  quarantineVisualizationSessionOutboxRecord,
  queueVisualizationSessionOutbox,
  readVisualizationSessionOutbox,
  visualizationSessionOutboxScope,
  visualizationSessionOutboxAcknowledgedEventName,
  visualizationSessionOutboxFailedEventName,
  visualizationSessionOutboxStorageKey,
  visualizationSessionOutboxUpdatedEventName,
  visualizationSessionOutboxUserStoragePrefix,
  visualizationSessionOutboxQuarantineStorageKey,
  visualizationSessionOutboxDeliveryDisposition,
  visualizationSessionOutboxRecordStorageKey,
  type VisualizationSessionOutboxRecord
} from "./visualizationSessionOutbox";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    }
  };
}

function record(
  overrides: Partial<VisualizationSessionOutboxRecord> = {}
): VisualizationSessionOutboxRecord {
  return {
    userId: overrides.userId ?? "student-a",
    moduleId: overrides.moduleId ?? "geometry:triangles",
    topicId: overrides.topicId ?? "triangle-sum",
    source: overrides.source ?? "geometry",
    queuedAt: overrides.queuedAt ?? 1_780_000_000_000
  };
}

test("storage keys encode every exact scope segment without A+B and A B collisions", () => {
  const scopes = [
    record({ userId: "A+B" }),
    record({ userId: "A B" }),
    record({ moduleId: "A+B" }),
    record({ moduleId: "A B" }),
    record({ topicId: "A+B" }),
    record({ topicId: "A B" })
  ].map(visualizationSessionOutboxScope);

  const keys = scopes.map(visualizationSessionOutboxStorageKey);

  assert.equal(new Set(keys).size, keys.length);
  assert.match(keys[0]!, /A%2BB/);
  assert.match(keys[1]!, /A%20B/);
  assert.equal(
    visualizationSessionOutboxStorageKey({
      userId: "student/x",
      moduleId: "module:y",
      topicId: "topic z"
    }),
    "mais:visualization-session-outbox:v1:student%2Fx/module%3Ay/topic%20z"
  );
});

test("record validation accepts only the exact durable schema", () => {
  const valid = record();
  assert.equal(isVisualizationSessionOutboxRecord(valid), true);
  assert.equal(isVisualizationSessionOutboxRecord(null), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, unexpected: true }), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, userId: "" }), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, moduleId: "" }), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, topicId: "" }), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, source: "not-a-source" }), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, queuedAt: "1780000000000" }), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, queuedAt: Number.POSITIVE_INFINITY }), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, queuedAt: 1.5 }), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, queuedAt: -1 }), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, userId: " student-a" }), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, moduleId: "module " }), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, topicId: " topic" }), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, topicId: "x".repeat(257) }), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, userId: "\uD800" }), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, moduleId: "\uDC00" }), false);
  assert.equal(isVisualizationSessionOutboxRecord({ ...valid, topicId: "geometry-\u{1F9ED}" }), true);
});

test("queue rejects invalid input before touching storage", () => {
  const storage = memoryStorage();

  assert.throws(
    () => queueVisualizationSessionOutbox(storage, { ...record(), source: "invalid" } as never),
    /Invalid visualization session outbox record/
  );
  assert.equal(storage.length, 0);
});

test("queue rejects an unpaired UTF-16 surrogate with its documented TypeError", () => {
  const storage = memoryStorage();

  assert.throws(
    () => queueVisualizationSessionOutbox(
      storage,
      record({ userId: "student-\uD800" })
    ),
    (error: unknown) => {
      assert.equal(error instanceof TypeError, true);
      assert.equal((error as Error).name, "TypeError");
      assert.match(
        (error as Error).message,
        /Invalid visualization session outbox record/
      );
      return true;
    }
  );
  assert.equal(storage.length, 0);
});

test("read isolates users and sorts by queuedAt then moduleId then topicId", () => {
  const storage = memoryStorage();
  const late = record({ moduleId: "z-module", topicId: "z-topic", queuedAt: 30 });
  const moduleLater = record({ moduleId: "b-module", topicId: "a-topic", queuedAt: 20 });
  const topicLater = record({ moduleId: "a-module", topicId: "b-topic", queuedAt: 20 });
  const topicFirst = record({ moduleId: "a-module", topicId: "a-topic", queuedAt: 20 });
  const early = record({ moduleId: "x-module", topicId: "x-topic", queuedAt: 10 });

  [late, moduleLater, topicLater, topicFirst, early].forEach((entry) => {
    queueVisualizationSessionOutbox(storage, entry);
  });
  queueVisualizationSessionOutbox(
    storage,
    record({ userId: "student-b", moduleId: "other-user", queuedAt: 1 })
  );

  assert.deepEqual(
    readVisualizationSessionOutbox(storage, "student-a").map(
      ({ moduleId, topicId }) => `${moduleId}/${topicId}`
    ),
    [
      "x-module/x-topic",
      "a-module/a-topic",
      "a-module/b-topic",
      "b-module/a-topic",
      "z-module/z-topic"
    ]
  );
  assert.deepEqual(
    readVisualizationSessionOutbox(storage, "student-b").map(({ moduleId }) => moduleId),
    ["other-user"]
  );
});

test("read uses source as a stable final tie-break for otherwise equal records", () => {
  const storage = memoryStorage();
  const geometry = record({ source: "geometry", queuedAt: 20 });
  const visualizationLab = record({ source: "visualization-lab", queuedAt: 20 });

  storage.setItem(
    visualizationSessionOutboxRecordStorageKey(geometry),
    JSON.stringify(geometry)
  );
  storage.setItem(
    visualizationSessionOutboxRecordStorageKey(visualizationLab),
    JSON.stringify(visualizationLab)
  );

  assert.deepEqual(
    readVisualizationSessionOutbox(storage, geometry.userId).map(({ source }) => source),
    ["geometry", "visualization-lab"]
  );
});

test("queue is idempotent and preserves the first valid record for one scope", () => {
  const storage = memoryStorage();
  const first = record({ source: "geometry", queuedAt: 100 });
  const conflictingRetry = record({ source: "visualization-lab", queuedAt: 200 });

  const firstResult = queueVisualizationSessionOutbox(storage, first);
  const retryResult = queueVisualizationSessionOutbox(storage, conflictingRetry);

  assert.deepEqual(firstResult, first);
  assert.deepEqual(retryResult, first);
  assert.deepEqual(readVisualizationSessionOutbox(storage, first.userId), [first]);
  assert.equal(storage.length, 1);
});

test("re-entrant same-scope queues deterministically converge to one physical revision", () => {
  const backing = memoryStorage();
  const outer = record({ source: "visualization-lab", queuedAt: 100 });
  const interleaved = record({ source: "geometry", queuedAt: 100 });
  const outerKey = visualizationSessionOutboxRecordStorageKey(outer);
  let injected = false;
  let interleavedResult: VisualizationSessionOutboxRecord | undefined;
  const storage = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      return backing.getItem(key);
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      backing.removeItem(key);
    },
    setItem(key: string, value: string) {
      if (key === outerKey && !injected) {
        injected = true;
        interleavedResult = queueVisualizationSessionOutbox(storage, interleaved);
      }
      backing.setItem(key, value);
    }
  };

  const outerResult = queueVisualizationSessionOutbox(storage, outer);
  const pending = readVisualizationSessionOutbox(backing, outer.userId);

  assert.equal(injected, true);
  assert.deepEqual(interleavedResult, interleaved);
  assert.deepEqual(outerResult, interleaved);
  assert.deepEqual(pending, [interleaved]);
  assert.equal(backing.length, 1);
  assert.equal(
    backing.getItem(visualizationSessionOutboxRecordStorageKey(interleaved)),
    JSON.stringify(interleaved)
  );
});

test("same-scope reconciliation compares the losing slot after interleaved legacy work", () => {
  const backing = memoryStorage();
  const winner = record({ source: "geometry", queuedAt: 100 });
  const loser = record({ source: "visualization-lab", queuedAt: 100 });
  const winnerKey = visualizationSessionOutboxRecordStorageKey(winner);
  const loserKey = visualizationSessionOutboxRecordStorageKey(loser);
  const legacyKey = visualizationSessionOutboxStorageKey(
    visualizationSessionOutboxScope(loser)
  );
  const replacementRaw = JSON.stringify({ ...loser, source: "probability" });
  backing.setItem(winnerKey, JSON.stringify(winner));
  backing.setItem(loserKey, JSON.stringify(loser));
  let interleaved = false;
  let staleRemovalAttempts = 0;
  const storage = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      if (key === legacyKey && !interleaved) {
        interleaved = true;
        backing.setItem(loserKey, replacementRaw);
      }
      return backing.getItem(key);
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      if (key === loserKey) staleRemovalAttempts += 1;
      backing.removeItem(key);
    },
    setItem(key: string, value: string) {
      backing.setItem(key, value);
    }
  };

  assert.deepEqual(queueVisualizationSessionOutbox(storage, loser), winner);
  assert.equal(interleaved, true);
  assert.equal(staleRemovalAttempts, 0);
  assert.equal(backing.getItem(loserKey), replacementRaw);
  assert.deepEqual(readVisualizationSessionOutbox(backing, winner.userId), [winner]);
});

test("queue repairs a malformed value only at its own exact scope", () => {
  const storage = memoryStorage();
  const valid = record();
  const key = visualizationSessionOutboxStorageKey(visualizationSessionOutboxScope(valid));
  storage.setItem(key, "{not-json");

  assert.deepEqual(queueVisualizationSessionOutbox(storage, valid), valid);
  assert.deepEqual(readVisualizationSessionOutbox(storage, valid.userId), [valid]);
});

test("one malformed record is exact-user quarantined and never hides valid peers", () => {
  const storage = memoryStorage();
  const first = record({ moduleId: "first", topicId: "one", queuedAt: 1 });
  const second = record({ moduleId: "second", topicId: "two", queuedAt: 2 });
  queueVisualizationSessionOutbox(storage, first);
  queueVisualizationSessionOutbox(storage, second);

  const corruptKey = visualizationSessionOutboxStorageKey({
    userId: first.userId,
    moduleId: "corrupt",
    topicId: "json"
  });
  const mismatchedKey = visualizationSessionOutboxStorageKey({
    userId: first.userId,
    moduleId: "wrong-key",
    topicId: "scope"
  });
  storage.setItem(corruptKey, "{not-json");
  storage.setItem(mismatchedKey, JSON.stringify(record({ moduleId: "body-does-not-match-key" })));

  assert.deepEqual(
    readVisualizationSessionOutbox(storage, first.userId).map(({ moduleId }) => moduleId),
    ["first", "second"]
  );
  assert.equal(storage.getItem(corruptKey), "{not-json");
  assert.notEqual(
    storage.getItem(visualizationSessionOutboxQuarantineStorageKey(first.userId, corruptKey)),
    null
  );
  assert.notEqual(storage.getItem(mismatchedKey), null);
  assert.notEqual(
    storage.getItem(visualizationSessionOutboxQuarantineStorageKey(first.userId, mismatchedKey)),
    null
  );
});

test("HTTP 400 quarantines one poison session while later valid records remain deliverable", () => {
  assert.equal(visualizationSessionOutboxDeliveryDisposition(200), "ack-candidate");
  assert.equal(visualizationSessionOutboxDeliveryDisposition(400), "quarantine-and-continue");
  assert.equal(visualizationSessionOutboxDeliveryDisposition(401), "retry-after-auth");
  assert.equal(visualizationSessionOutboxDeliveryDisposition(403), "retry-after-auth");
  assert.equal(
    visualizationSessionOutboxDeliveryDisposition(403, {
      error: "Visualization is outside the authenticated learner curriculum.",
      reason: "curriculum-scope-mismatch"
    }),
    "quarantine-and-continue"
  );
  assert.equal(
    visualizationSessionOutboxDeliveryDisposition(403, {
      reason: "student-only"
    }),
    "retry-after-auth"
  );
  assert.equal(visualizationSessionOutboxDeliveryDisposition(409), "retry");
  assert.equal(visualizationSessionOutboxDeliveryDisposition(503), "retry");
});

test("an old exact-scope ACK cannot delete a concurrently queued different scope", () => {
  const storage = memoryStorage();
  const sent = record({ moduleId: "sent", topicId: "old", queuedAt: 1 });
  const concurrent = record({ moduleId: "concurrent", topicId: "new", queuedAt: 2 });
  const otherUser = record({ userId: "student-b", moduleId: "sent", topicId: "old", queuedAt: 1 });
  queueVisualizationSessionOutbox(storage, sent);

  // Another producer writes after the request captured `sent` but before its ACK.
  queueVisualizationSessionOutbox(storage, concurrent);
  queueVisualizationSessionOutbox(storage, otherUser);
  assert.equal(acknowledgeVisualizationSessionOutbox(storage, sent), true);

  assert.deepEqual(readVisualizationSessionOutbox(storage, sent.userId), [concurrent]);
  assert.deepEqual(readVisualizationSessionOutbox(storage, otherUser.userId), [otherUser]);
});

test("a late response acknowledges only its absent immutable revision and preserves a replacement", () => {
  const storage = memoryStorage();
  const sent = record({ queuedAt: 1, source: "geometry" });
  const replacement = record({ queuedAt: 2, source: "visualization-lab" });
  queueVisualizationSessionOutbox(storage, sent);

  // Model a peer tab removing the sent immutable revision and queuing a new
  // revision after this request began.
  storage.removeItem(visualizationSessionOutboxRecordStorageKey(sent));
  storage.setItem(
    visualizationSessionOutboxRecordStorageKey(replacement),
    JSON.stringify(replacement)
  );

  assert.equal(acknowledgeVisualizationSessionOutbox(storage, sent), true);
  assert.equal(
    quarantineVisualizationSessionOutboxRecord(storage, sent, "late-400"),
    true
  );
  assert.deepEqual(readVisualizationSessionOutbox(storage, sent.userId), [replacement]);
  assert.equal(
    storage.getItem(visualizationSessionOutboxQuarantineStorageKey(
      sent.userId,
      visualizationSessionOutboxRecordStorageKey(sent)
    )),
    null
  );
});

test("a valid legacy scope-key record is acknowledged through its exact read snapshot", () => {
  const storage = memoryStorage();
  const legacy = record({ queuedAt: 9 });
  const legacyKey = visualizationSessionOutboxStorageKey(
    visualizationSessionOutboxScope(legacy)
  );
  storage.setItem(legacyKey, JSON.stringify(legacy));
  const [snapshot] = readVisualizationSessionOutbox(storage, legacy.userId);
  assert.deepEqual(snapshot, legacy);
  assert.equal(acknowledgeVisualizationSessionOutbox(storage, snapshot!), true);
  assert.equal(storage.getItem(legacyKey), JSON.stringify(legacy));
  assert.deepEqual(readVisualizationSessionOutbox(storage, legacy.userId), []);
  const corrected = record({ source: "visualization-lab", queuedAt: 11 });
  storage.setItem(legacyKey, JSON.stringify(corrected));
  assert.deepEqual(readVisualizationSessionOutbox(storage, legacy.userId), [corrected]);
});

test("a valid legacy scope-key 400 is quarantined through its exact read snapshot", () => {
  const storage = memoryStorage();
  const legacy = record({ queuedAt: 10 });
  const legacyKey = visualizationSessionOutboxStorageKey(
    visualizationSessionOutboxScope(legacy)
  );
  storage.setItem(legacyKey, JSON.stringify(legacy));
  const [snapshot] = readVisualizationSessionOutbox(storage, legacy.userId);
  assert.equal(
    quarantineVisualizationSessionOutboxRecord(
      storage,
      snapshot!,
      "legacy-server-rejected-400"
    ),
    true
  );
  assert.equal(storage.getItem(legacyKey), JSON.stringify(legacy));
  assert.notEqual(
    storage.getItem(
      visualizationSessionOutboxQuarantineStorageKey(
        legacy.userId,
        visualizationSessionOutboxRecordStorageKey(legacy)
      )
    ),
    null
  );
  assert.deepEqual(readVisualizationSessionOutbox(storage, legacy.userId), []);
});

test("legacy ACK retains a corrected tuple written during immutable revision deletion", () => {
  const backing = memoryStorage();
  const legacy = record({ queuedAt: 20, source: "geometry" });
  const corrected = record({ queuedAt: 21, source: "visualization-lab" });
  const legacyKey = visualizationSessionOutboxStorageKey(
    visualizationSessionOutboxScope(legacy)
  );
  backing.setItem(legacyKey, JSON.stringify(legacy));
  const [snapshot] = readVisualizationSessionOutbox(backing, legacy.userId);
  const immutableKey = visualizationSessionOutboxRecordStorageKey(legacy);
  let correctedDuringDelete = false;
  const storage = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      return backing.getItem(key);
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      if (key === immutableKey && !correctedDuringDelete) {
        correctedDuringDelete = true;
        backing.setItem(legacyKey, JSON.stringify(corrected));
      }
      backing.removeItem(key);
    },
    setItem(key: string, value: string) {
      backing.setItem(key, value);
    }
  };

  assert.equal(acknowledgeVisualizationSessionOutbox(storage, snapshot!), true);
  assert.equal(correctedDuringDelete, true);
  assert.equal(backing.getItem(legacyKey), JSON.stringify(corrected));
  assert.deepEqual(readVisualizationSessionOutbox(backing, legacy.userId), [corrected]);
});

test("legacy 400 quarantine retains a corrected tuple written during immutable revision deletion", () => {
  const backing = memoryStorage();
  const legacy = record({ queuedAt: 30, source: "geometry" });
  const corrected = record({ queuedAt: 31, source: "visualization-lab" });
  const legacyKey = visualizationSessionOutboxStorageKey(
    visualizationSessionOutboxScope(legacy)
  );
  backing.setItem(legacyKey, JSON.stringify(legacy));
  const [snapshot] = readVisualizationSessionOutbox(backing, legacy.userId);
  const immutableKey = visualizationSessionOutboxRecordStorageKey(legacy);
  let correctedDuringDelete = false;
  const storage = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      return backing.getItem(key);
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      if (key === immutableKey && !correctedDuringDelete) {
        correctedDuringDelete = true;
        backing.setItem(legacyKey, JSON.stringify(corrected));
      }
      backing.removeItem(key);
    },
    setItem(key: string, value: string) {
      backing.setItem(key, value);
    }
  };

  assert.equal(
    quarantineVisualizationSessionOutboxRecord(
      storage,
      snapshot!,
      "legacy-curriculum-scope-mismatch"
    ),
    true
  );
  assert.equal(correctedDuringDelete, true);
  assert.equal(backing.getItem(legacyKey), JSON.stringify(corrected));
  assert.deepEqual(readVisualizationSessionOutbox(backing, legacy.userId), [corrected]);
});

test("ACK removes only its immutable physical revision when a peer queues a replacement during deletion", () => {
  const backing = memoryStorage();
  const sent = record({ queuedAt: 1, source: "geometry" });
  const replacement = record({ queuedAt: 2, source: "visualization-lab" });
  queueVisualizationSessionOutbox(backing, sent);
  const sentKey = visualizationSessionOutboxRecordStorageKey(sent);
  const replacementKey = visualizationSessionOutboxRecordStorageKey(replacement);
  let interleaved = false;
  const storage = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      return backing.getItem(key);
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      if (key === sentKey && !interleaved) {
        interleaved = true;
        backing.setItem(replacementKey, JSON.stringify(replacement));
      }
      backing.removeItem(key);
    },
    setItem(key: string, value: string) {
      backing.setItem(key, value);
    }
  };

  assert.equal(acknowledgeVisualizationSessionOutbox(storage, sent), true);
  assert.equal(backing.getItem(sentKey), null);
  assert.notEqual(backing.getItem(replacementKey), null);
  assert.deepEqual(readVisualizationSessionOutbox(backing, sent.userId), [replacement]);
});

test("400 quarantine preserves a corrected immutable revision queued during old-record deletion", () => {
  const backing = memoryStorage();
  const rejected = record({ queuedAt: 1, source: "geometry" });
  const corrected = record({ queuedAt: 2, source: "visualization-lab" });
  queueVisualizationSessionOutbox(backing, rejected);
  const rejectedKey = visualizationSessionOutboxRecordStorageKey(rejected);
  const correctedKey = visualizationSessionOutboxRecordStorageKey(corrected);
  let interleaved = false;
  const storage = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      return backing.getItem(key);
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      if (key === rejectedKey && !interleaved) {
        interleaved = true;
        backing.setItem(correctedKey, JSON.stringify(corrected));
      }
      backing.removeItem(key);
    },
    setItem(key: string, value: string) {
      backing.setItem(key, value);
    }
  };

  assert.equal(
    quarantineVisualizationSessionOutboxRecord(storage, rejected, "curriculum-scope-mismatch"),
    true
  );
  assert.equal(backing.getItem(rejectedKey), null);
  assert.notEqual(backing.getItem(correctedKey), null);
  assert.deepEqual(readVisualizationSessionOutbox(backing, rejected.userId), [corrected]);
  assert.notEqual(
    backing.getItem(
      visualizationSessionOutboxQuarantineStorageKey(rejected.userId, rejectedKey)
    ),
    null
  );
});

test("clear removes active, legacy-terminal, and raw quarantine keys only for its user", () => {
  const storage = memoryStorage();
  const active = record({ moduleId: "active", topicId: "one" });
  const legacy = record({ moduleId: "legacy", topicId: "two", queuedAt: 2 });
  const quarantined = record({ moduleId: "quarantined", topicId: "three", queuedAt: 3 });
  const otherActive = record({ userId: "student-b", moduleId: "active", topicId: "peer" });
  const otherQuarantined = record({
    userId: "student-b",
    moduleId: "quarantined",
    topicId: "peer",
    queuedAt: 4
  });

  queueVisualizationSessionOutbox(storage, active);
  const legacyKey = visualizationSessionOutboxStorageKey(
    visualizationSessionOutboxScope(legacy)
  );
  storage.setItem(legacyKey, JSON.stringify(legacy));
  const legacySnapshot = readVisualizationSessionOutbox(storage, legacy.userId).find(
    ({ moduleId }) => moduleId === legacy.moduleId
  );
  assert.equal(
    acknowledgeVisualizationSessionOutbox(storage, legacySnapshot!),
    true
  );
  queueVisualizationSessionOutbox(storage, quarantined);
  assert.equal(
    quarantineVisualizationSessionOutboxRecord(
      storage,
      quarantined,
      "raw-current-user-payload"
    ),
    true
  );

  queueVisualizationSessionOutbox(storage, otherActive);
  queueVisualizationSessionOutbox(storage, otherQuarantined);
  assert.equal(
    quarantineVisualizationSessionOutboxRecord(
      storage,
      otherQuarantined,
      "raw-other-user-payload"
    ),
    true
  );

  const malformedKey = `${visualizationSessionOutboxUserStoragePrefix(active.userId)}malformed/value`;
  const quarantineKey = visualizationSessionOutboxQuarantineStorageKey(
    quarantined.userId,
    visualizationSessionOutboxRecordStorageKey(quarantined)
  );
  const otherQuarantineKey = visualizationSessionOutboxQuarantineStorageKey(
    otherQuarantined.userId,
    visualizationSessionOutboxRecordStorageKey(otherQuarantined)
  );
  storage.setItem(malformedKey, "broken");
  storage.setItem("unrelated-key", "keep");

  assert.match(storage.getItem(quarantineKey)!, /raw-current-user-payload/);
  assert.match(storage.getItem(otherQuarantineKey)!, /raw-other-user-payload/);
  assert.equal(clearVisualizationSessionOutboxForUser(storage, active.userId), 5);
  assert.deepEqual(readVisualizationSessionOutbox(storage, active.userId), []);
  assert.equal(storage.getItem(legacyKey), null);
  assert.equal(storage.getItem(malformedKey), null);
  assert.equal(storage.getItem(quarantineKey), null);
  assert.deepEqual(readVisualizationSessionOutbox(storage, otherActive.userId), [otherActive]);
  assert.match(storage.getItem(otherQuarantineKey)!, /raw-other-user-payload/);
  assert.equal(storage.getItem("unrelated-key"), "keep");
});

test("the exported update event name is stable for Card and provider composition", () => {
  assert.equal(
    visualizationSessionOutboxUpdatedEventName,
    "mais:visualization-session-outbox-updated"
  );
  assert.equal(
    visualizationSessionOutboxAcknowledgedEventName,
    "mais:visualization-session-outbox-acknowledged"
  );
  assert.equal(
    visualizationSessionOutboxFailedEventName,
    "mais:visualization-session-outbox-failed"
  );
});

test("session ACK requires an exact durable identity, module, topic, and source match", () => {
  const pending = record();
  const acknowledged = {
    acknowledgedUserId: pending.userId,
    durablyPersisted: true,
    session: {
      explored: true,
      moduleId: pending.moduleId,
      source: pending.source,
      topicId: pending.topicId
    }
  };
  assert.equal(isVisualizationSessionOutboxAcknowledgement(200, acknowledged, pending), true);
  assert.equal(isVisualizationSessionOutboxAcknowledgement(202, acknowledged, pending), false);
  assert.equal(
    isVisualizationSessionOutboxAcknowledgement(200, { ...acknowledged, durablyPersisted: false }, pending),
    false
  );
  assert.equal(
    isVisualizationSessionOutboxAcknowledgement(200, { ...acknowledged, acknowledgedUserId: "student-b" }, pending),
    false
  );
  assert.equal(
    isVisualizationSessionOutboxAcknowledgement(200, {
      ...acknowledged,
      session: { ...acknowledged.session, topicId: "other-topic" }
    }, pending),
    false
  );
});
