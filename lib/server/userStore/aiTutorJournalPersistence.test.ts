import assert from "node:assert/strict";
import test from "node:test";
import {
  createAiTutorPersistenceLane,
  mergeAiTutorJournalRecords
} from "@/lib/server/userStore/aiTutorJournalPersistence";

type Record = { created_at: string; id: string; value: string };

test("journal overlay replaces matching snapshot ids and appends stable journal-only rows", () => {
  const snapshot: Record[] = [
    { id: "a", created_at: "2026-08-12T00:00:00.000Z", value: "snapshot-a" },
    { id: "b", created_at: "2026-08-12T00:01:00.000Z", value: "snapshot-b" }
  ];
  const journal: Record[] = [
    { id: "c", created_at: "2026-08-12T00:03:00.000Z", value: "journal-c" },
    { id: "b", created_at: "2026-08-12T00:01:00.000Z", value: "journal-b" },
    { id: "d", created_at: "2026-08-12T00:02:00.000Z", value: "journal-d" }
  ];

  assert.deepEqual(mergeAiTutorJournalRecords(snapshot, journal), [
    snapshot[0],
    journal[1],
    journal[2],
    journal[0]
  ]);
  assert.equal(snapshot[1].value, "snapshot-b");
  assert.equal(journal[0].id, "c");
});

test("journal overlay emits every immutable id exactly once", () => {
  const snapshot: Record[] = [
    { id: "a", created_at: "2026-08-12T00:00:00.000Z", value: "snapshot-a" },
    { id: "a", created_at: "2026-08-12T00:00:01.000Z", value: "duplicate-snapshot-a" },
    { id: "b", created_at: "2026-08-12T00:01:00.000Z", value: "snapshot-b" }
  ];
  const journal: Record[] = [
    { id: "c", created_at: "2026-08-12T00:03:00.000Z", value: "stale-journal-c" },
    { id: "b", created_at: "2026-08-12T00:01:00.000Z", value: "journal-b" },
    { id: "c", created_at: "2026-08-12T00:04:00.000Z", value: "journal-c" }
  ];

  assert.deepEqual(mergeAiTutorJournalRecords(snapshot, journal), [
    snapshot[0],
    journal[1],
    journal[2]
  ]);
});

test("persistence lane serializes work and continues after a rejected task", async () => {
  const lane = createAiTutorPersistenceLane();
  const events: string[] = [];
  let releaseFirst!: () => void;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const first = lane.run(async () => {
    events.push("first:start");
    await firstGate;
    events.push("first:end");
    throw new Error("expected failure");
  });
  const second = lane.run(async () => {
    events.push("second");
    return 2;
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(events, ["first:start"]);
  releaseFirst();
  await assert.rejects(first, /expected failure/);
  assert.equal(await second, 2);
  assert.deepEqual(events, ["first:start", "first:end", "second"]);
});
