import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { normalizeCcssId, standardIdPattern } from "../../lib/standards/ccssId";
import {
  resolveStandardRef,
  resolveStandardRefWithBinding,
  standardRefText,
  stateStandardBindings
} from "../../lib/standards/standardRef";
import type { StandardCrosswalkRow, StateStandardBinding } from "../../lib/standards/standardRef";

// --- the resolver ---------------------------------------------------------

test("normalizing collapses the repo's two CCSS id dialects onto one key", () => {
  assert.equal(normalizeCcssId("K.CC.A.1"), "K.CC.1");
  assert.equal(normalizeCcssId("K.CC.1"), "K.CC.1");
  assert.equal(normalizeCcssId("A-REI.D.11"), "A-REI.11");
  assert.equal(normalizeCcssId("6.NS.C.7"), "6.NS.7");
  // Unrecognised input is returned unchanged rather than mangled.
  assert.equal(normalizeCcssId("AR.Math.K.NPV.1"), "AR.Math.K.NPV.1");
});

test("California prints a bare code only when the asset actually carries it", () => {
  assert.equal(
    standardRefText({ track: "US_CA_MATH", stateStandardId: "5.NBT.7", assetStandardIds: ["5.NBT.B.7"] }),
    "5.NBT.7"
  );
  // The asset carries a different standard: a label would be a false claim.
  assert.equal(
    standardRefText({ track: "US_CA_MATH", stateStandardId: "4.NF.1", assetStandardIds: ["5.NBT.B.7"] }),
    null
  );
});

test("an untranscribed track never prints a standard code", () => {
  // This is the live state of every non-California track. Arkansas's 6-12 codes
  // and Florida's are CCSS domain letters under a state prefix; showing them
  // would be exactly the fabricated claim this resolver exists to stop.
  for (const track of ["US_AR_MATH", "US_FL_MATH", "US_NC_MATH", "HK", "MAINLAND_PEP_HIGH"] as const) {
    const resolved = resolveStandardRef({
      track,
      stateStandardId: "AR.Math.G6.RP",
      assetStandardIds: ["6.RP.A.1"]
    });
    assert.equal(resolved.display, "hidden", `${track} must not display a standard code`);
    assert.equal(standardRefText({ track, stateStandardId: "AR.Math.G6.RP", assetStandardIds: ["6.RP.A.1"] }), null);
  }
});

test("a crosswalk prints bare codes for exact rows and hedges everything else", () => {
  const rows: StandardCrosswalkRow[] = [
    { stateStandardId: "XX.1", ccss: ["5.NBT.B.7"], relation: "exact", rationale: "same statement" },
    { stateStandardId: "XX.2", ccss: ["5.NBT.B.7"], relation: "narrower", rationale: "one case of it" },
    { stateStandardId: "XX.3", ccss: ["5.NBT.B.7"], relation: "broader", rationale: "spans more" },
    { stateStandardId: "XX.4", ccss: ["5.NBT.B.7"], relation: "partial", rationale: "overlaps" },
    { stateStandardId: "XX.5", ccss: [], relation: "none", rationale: "state-only content" }
  ];
  const binding: StateStandardBinding = { kind: "crosswalk", rows };
  // The asset carries the letter-less dialect; the crosswalk carries the
  // lettered one. Normalization is what makes them meet.
  const asset = ["5.NBT.7"];
  const resolve = (id: string, assetIds: string[] = asset) => resolveStandardRefWithBinding(binding, id, assetIds);

  assert.deepEqual(resolve("XX.1"), { display: "code", code: "XX.1", relation: "exact" });
  assert.deepEqual(resolve("XX.2"), {
    display: "qualified",
    code: "XX.2",
    relation: "narrower",
    qualifier: "develops part of"
  });
  assert.deepEqual(resolve("XX.3"), {
    display: "qualified",
    code: "XX.3",
    relation: "broader",
    qualifier: "develops more than"
  });
  assert.deepEqual(resolve("XX.4"), {
    display: "qualified",
    code: "XX.4",
    relation: "partial",
    qualifier: "partially develops"
  });
  assert.deepEqual(resolve("XX.5"), { display: "hidden", reason: "relation-none" });
  assert.deepEqual(resolve("XX.9"), { display: "hidden", reason: "no-crosswalk-row" });

  // The control a longer rationale cannot fake: the asset must actually carry
  // a CCSS id the row maps to, or there is no claim to display.
  assert.deepEqual(resolve("XX.1", ["4.NF.A.1"]), {
    display: "hidden",
    reason: "asset-does-not-carry-standard"
  });
});

test("every curriculum track declares whether its standard codes may be displayed", () => {
  for (const [track, binding] of Object.entries(stateStandardBindings)) {
    assert.ok(
      ["ccss-identity", "crosswalk", "untranscribed"].includes(binding.kind),
      `${track} has no valid standard binding`
    );
  }
});

// --- the prose gate -------------------------------------------------------

/**
 * Raw standard codes must not be interpolated into student-visible prose.
 *
 * They are today: the ported CCSS lesson bodies print codes like "(3.MD.A.1)"
 * inside their explanatory paragraphs. For California that is merely
 * unnecessary; for any other state it is a contradiction, because the chrome
 * would carry that state's code while the body carries a Common Core one.
 *
 * DECLARED DEBT, NOT AN ALLOWANCE. The counts below are the measured baseline
 * and may only fall. Each code removed from prose should be replaced by a
 * `StandardRef`, which renders nothing when the claim cannot be supported.
 */
const ccssLessonProseCeilings = { files: 266, occurrences: 369 };

function scanLessonBodiesForRawStandardCodes() {
  const dir = path.join(process.cwd(), "components/lesson/ccss/lessons");
  const files = readdirSync(dir).filter((name) => name.endsWith(".tsx"));
  let filesWithCode = 0;
  let occurrences = 0;
  const worst: { file: string; count: number }[] = [];
  for (const name of files) {
    const source = readFileSync(path.join(dir, name), "utf8");
    const matches = source.match(new RegExp(standardIdPattern.source, "g")) ?? [];
    if (matches.length > 0) {
      filesWithCode += 1;
      occurrences += matches.length;
      worst.push({ file: name, count: matches.length });
    }
  }
  return { total: files.length, filesWithCode, occurrences, worst };
}

test("raw standard codes in lesson prose stay under their recorded ceiling", () => {
  const scan = scanLessonBodiesForRawStandardCodes();
  assert.ok(scan.total > 0, "no CCSS lesson bodies found — the gate would pass vacuously");
  assert.ok(
    scan.filesWithCode <= ccssLessonProseCeilings.files,
    `${scan.filesWithCode} of ${scan.total} lesson bodies contain a raw standard code, above the recorded ceiling of ` +
      `${ccssLessonProseCeilings.files}. Route the code through <StandardRef> instead, then lower the ceiling.`
  );
  assert.ok(
    scan.occurrences <= ccssLessonProseCeilings.occurrences,
    `${scan.occurrences} raw standard codes in lesson prose, above the recorded ceiling of ${ccssLessonProseCeilings.occurrences}.`
  );
});

test("StandardRef is the only component that renders a standard code", () => {
  // Guards the seam itself: if a second component starts formatting codes, the
  // resolver can be bypassed and the ceiling above stops meaning anything.
  const component = readFileSync(path.join(process.cwd(), "components/standards/StandardRef.tsx"), "utf8");
  assert.match(component, /resolveStandardRef/);
  assert.match(component, /data-standard-ref/);
  // The component must not invent a display path of its own.
  assert.doesNotMatch(component, /narrower|broader|partial/);
});
