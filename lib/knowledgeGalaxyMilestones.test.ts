import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import {
  diffGalaxyMilestones,
  galaxyMilestoneSnapshotForMap,
  galaxyMilestoneStorageKey,
  readGalaxyMilestoneSnapshot,
  serializeGalaxyMilestoneSnapshot
} from "./knowledgeGalaxyMilestones";
import type { GalaxyMilestoneSnapshot } from "./knowledgeGalaxyMilestones";
import type { KnowledgeGalaxyMap } from "./knowledgeGalaxyMap";

function makeSnapshot(overrides: Partial<GalaxyMilestoneSnapshot> = {}): GalaxyMilestoneSnapshot {
  return {
    litStarIds: [],
    completedConstellations: [],
    ...overrides
  };
}

test("storage key namespaces by user with a guest fallback", () => {
  equal(galaxyMilestoneStorageKey("student-1"), "hk-math-knowledge-galaxy-milestones:student-1");
  equal(galaxyMilestoneStorageKey(null), "hk-math-knowledge-galaxy-milestones:guest");
  equal(galaxyMilestoneStorageKey(undefined), "hk-math-knowledge-galaxy-milestones:guest");
});

test("snapshot round-trips through serialize and read", () => {
  const snapshot = makeSnapshot({
    litStarIds: ["topic-b:fluency", "topic-a:foundation"],
    completedConstellations: ["number-forest"]
  });

  const restored = readGalaxyMilestoneSnapshot(serializeGalaxyMilestoneSnapshot(snapshot));
  deepEqual(restored, {
    litStarIds: ["topic-a:foundation", "topic-b:fluency"],
    completedConstellations: ["number-forest"]
  });
});

test("read rejects malformed payloads instead of throwing", () => {
  equal(readGalaxyMilestoneSnapshot(null), null);
  equal(readGalaxyMilestoneSnapshot(""), null);
  equal(readGalaxyMilestoneSnapshot("not json"), null);
  equal(readGalaxyMilestoneSnapshot("[1,2,3]"), null);
  deepEqual(readGalaxyMilestoneSnapshot('{"litStarIds":[3,"ok",""],"completedConstellations":["bogus","algebra-peaks"]}'), {
    litStarIds: ["ok"],
    completedConstellations: ["algebra-peaks"]
  });
});

test("first visit is a baseline: no celebrations without a previous snapshot", () => {
  const diff = diffGalaxyMilestones(null, makeSnapshot({
    litStarIds: ["topic-a:foundation", "topic-a:fluency"],
    completedConstellations: ["number-forest"]
  }));

  deepEqual(diff, { newlyLitStarIds: [], newlyCompletedConstellations: [] });
});

test("diff reports only stars and constellations that newly crossed the threshold", () => {
  const previous = makeSnapshot({
    litStarIds: ["topic-a:foundation"],
    completedConstellations: []
  });
  const current = makeSnapshot({
    litStarIds: ["topic-a:foundation", "topic-a:fluency", "topic-a:transfer"],
    completedConstellations: ["number-forest"]
  });

  deepEqual(diffGalaxyMilestones(previous, current), {
    newlyLitStarIds: ["topic-a:fluency", "topic-a:transfer"],
    newlyCompletedConstellations: ["number-forest"]
  });
});

test("a star that dims and re-lights celebrates again", () => {
  const litBefore = makeSnapshot({ litStarIds: ["topic-a:foundation"] });
  const dimmed = makeSnapshot({ litStarIds: [] });

  deepEqual(diffGalaxyMilestones(litBefore, dimmed).newlyLitStarIds, []);
  deepEqual(diffGalaxyMilestones(dimmed, litBefore).newlyLitStarIds, ["topic-a:foundation"]);
});

test("snapshot derives from the full map lit ids and completed constellations", () => {
  const map = {
    stars: [],
    edges: [],
    constellations: [
      { id: "number-forest", complete: true },
      { id: "algebra-peaks", complete: false }
    ],
    illumination: { litCount: 2, totalCount: 4, percent: 50 },
    litStarIds: ["topic-b:fluency", "topic-a:foundation"],
    currentStarId: null
  } as unknown as KnowledgeGalaxyMap;

  deepEqual(galaxyMilestoneSnapshotForMap(map), {
    litStarIds: ["topic-a:foundation", "topic-b:fluency"],
    completedConstellations: ["number-forest"]
  });
});
