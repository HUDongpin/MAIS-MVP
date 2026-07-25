import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_LIBRARY_FOR_TESTS,
  libraryAvailable,
  loadBenchStandards,
  readSnapshot,
  scoreCcssDepth,
  type DepthTier,
} from "./audit-ccss-depth";

/**
 * The CCSS depth-coverage gate.
 *
 * The 2026-07-25 depth audit lifted "a student can reach a visual for this
 * standard" from 257/385 to 329/385 across five passes. Every one of those wins
 * is a line in a data file — a CCSS tag, a chapter's supplemental standards, a
 * bench in a topic's `related` list — and any of them can be deleted by accident
 * with nothing to notice. Before this file existed the only record of the
 * coverage was a number in a Desktop markdown report.
 *
 * So these are FLOORS, not exact values: real work should push the numbers up
 * and the test should stay green. It fails when coverage goes DOWN.
 *
 * The scorer reads the merged bench→standards table from
 * `data/generated-content/ccss-depth/bench-standards.json`, a committed snapshot,
 * because the upstream `labs.json` lives outside the repo and CI cannot see it.
 * Refresh it with `npm run audit:ccss-depth -- --write-snapshot` whenever the
 * upstream library's CCSS tags change.
 */

const report = scoreCcssDepth(readSnapshot());
const { totals, rows, byGrade } = report;
const realVisual = totals.A + totals.B + totals.E;

/* Floors, set at the 2026-07-25 state. Raise them when coverage improves —
   that is the point of a ratchet. */
const FLOOR_REAL_VISUAL = 329;
const FLOOR_DEDICATED = 204;
const CEILING_ABSENT = 2;
const CEILING_INCIDENTAL = 50;
const GRADE_FLOORS: Record<string, number> = {
  K: 19, "1": 17, "2": 21, "3": 22, "4": 25, "5": 24, "6": 28, "7": 21, "8": 28, HS: 124,
};

test("every canonical standard is scored exactly once, into a valid tier", () => {
  assert.equal(rows.length, 385, "the canonical registry is 385 standards (229 K-8 + 156 HS)");
  const ids = new Set(rows.map((r) => r.id));
  assert.equal(ids.size, rows.length, "no standard is scored twice");
  const valid: DepthTier[] = ["A", "B", "C", "D", "E", "F"];
  for (const r of rows) {
    assert.ok(valid.includes(r.tier), `${r.id} has a valid tier (got ${r.tier})`);
  }
  assert.equal(
    Object.values(totals).reduce((a, b) => a + b, 0),
    rows.length,
    "the tier totals account for every standard"
  );
});

test("coverage has not regressed: a real visual for at least the 2026-07-25 count", () => {
  assert.ok(
    realVisual >= FLOOR_REAL_VISUAL,
    `real visual (A+B+E) fell to ${realVisual}; the floor is ${FLOOR_REAL_VISUAL}. ` +
      `Something removed a CCSS tag, a chapter's supplemental standard, or a bench from a topic's related list.`
  );
  assert.ok(
    totals.A >= FLOOR_DEDICATED,
    `dedicated-bench standards fell to ${totals.A}; the floor is ${FLOOR_DEDICATED}`
  );
});

test("no standard has slipped back to having no bench at all", () => {
  const absent = rows.filter((r) => r.tier === "F").map((r) => r.id).sort();
  assert.ok(
    absent.length <= CEILING_ABSENT,
    `${absent.length} standards have no bench (ceiling ${CEILING_ABSENT}): ${absent.join(", ")}`
  );
  /* The two known holes, recorded so a NEW one is obvious in the diff rather
     than hidden inside a count. Both are ordinary buildable work. */
  for (const id of absent) {
    assert.ok(
      ["G-GMD.2", "N-CN.8"].includes(id),
      `${id} newly has no bench at all — that is a regression, not one of the two known holes`
    );
  }
});

test("no standard has slipped back to 'taught but untracked'", () => {
  const untracked = rows.filter((r) => r.tier === "E").map((r) => r.id);
  assert.equal(
    untracked.length,
    0,
    `these are taught by a reachable bench but no lab alignment records them: ${untracked.join(", ")}`
  );
});

test("paper-only coverage has not grown", () => {
  assert.ok(
    totals.D <= CEILING_INCIDENTAL,
    `standards claimed only by a whole-domain auto-fill rose to ${totals.D}; the ceiling is ${CEILING_INCIDENTAL}. ` +
      `Adding a standard to a chapter without a bench that teaches it re-creates the paper coverage the audit removed.`
  );
});

test("no grade band has regressed", () => {
  for (const g of byGrade) {
    const floor = GRADE_FLOORS[g.grade];
    assert.ok(
      g.realVisual >= floor,
      `grade ${g.grade} fell to ${g.realVisual} standards with a real visual; the floor is ${floor}`
    );
  }
});

test("every orphaned bench is one the CCSS cannot place", () => {
  /* A bench that is ported but attached to no topic renders for nobody. The only
     legitimate orphans are the calculus benches: CCSS-M has no calculus
     standards, so there is nothing for them to join on. */
  assert.ok(
    report.benchesOrphaned <= 4,
    `${report.benchesOrphaned} benches are attached to no topic; only the 4 calculus benches should be`
  );
});

test("the committed snapshot matches the upstream library, when it is present", (t) => {
  if (!libraryAvailable(DEFAULT_LIBRARY_FOR_TESTS)) {
    t.skip(
      "the Claude Math Visual library is not on this machine (expected in CI) — " +
        "the snapshot is the source of truth here"
    );
    return;
  }
  const live = loadBenchStandards(DEFAULT_LIBRARY_FOR_TESTS);
  const snap = readSnapshot();
  const drifted: string[] = [];
  for (const name of new Set([...live.keys(), ...snap.keys()])) {
    const a = [...(live.get(name) ?? [])].sort().join(",");
    const b = [...(snap.get(name) ?? [])].sort().join(",");
    if (a !== b) drifted.push(name);
  }
  assert.equal(
    drifted.length,
    0,
    `the snapshot is stale for: ${drifted.join(", ")}. ` +
      `Run: npm run audit:ccss-depth -- --write-snapshot`
  );
});
