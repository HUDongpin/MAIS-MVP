import { normalizeCcssId, normalizeCcssIds } from "./ccssId";
import type { CurriculumTrack } from "../../types";

/**
 * The displayed-claim resolver.
 *
 * Printing a state standard code beside a piece of content is an ASSERTION to a
 * learner, a parent and a district: *this material teaches that standard*. The
 * content in this repo is tagged against CCSS; a state label on it is only true
 * to the extent that a crosswalk says so.
 *
 * Today nothing checks that. A crosswalk row's only correctness control in the
 * state-adaptation plan is a free-text rationale, and for the 6-12 chapter
 * topics the lesson join is domain-level — `data/ccssLessonAssignments.test.ts`
 * explicitly exempts chapter topics from the per-standard intersection check.
 * So an Arkansas learner could be shown an Arkansas code in the chrome and a
 * Common Core code in the body of the same lesson, with every gate green.
 *
 * This module makes the claim resolvable instead of asserted:
 *
 *   exact                     -> render the bare code
 *   narrower/broader/partial  -> render a qualifier ("develops part of ...")
 *   none / no row / no overlap-> render nothing
 *
 * A bare code is only ever produced when the crosswalk says the relation is
 * exact AND the asset itself actually carries a CCSS id that row maps to. That
 * second condition is the one that cannot be faked by writing a longer
 * rationale.
 */

export type CrosswalkRelation = "exact" | "narrower" | "broader" | "partial" | "none";

export type StandardCrosswalkRow = {
  /** The state's own code, e.g. `AR.Math.K.NPV.1`. */
  stateStandardId: string;
  /** CCSS ids this state standard maps onto. Empty for `relation: "none"`. */
  ccss: string[];
  relation: CrosswalkRelation;
  /** Why. Required by the curation contract; never machine-generated. */
  rationale: string;
};

export type StateStandardBinding =
  /** The track's own codes ARE CCSS codes (California). */
  | { kind: "ccss-identity" }
  /** The track has a transcribed crosswalk into CCSS. */
  | { kind: "crosswalk"; rows: readonly StandardCrosswalkRow[] }
  /**
   * No verified standards mapping exists for this track yet, so no state code
   * may be printed against shared content. This is the honest default and it is
   * where every non-California track sits today.
   */
  | { kind: "untranscribed" };

/**
 * Per-track binding. Exhaustive by construction: a new track cannot compile
 * without declaring how — or whether — its standard codes may be displayed.
 *
 * Every track except California is `untranscribed`, which is a statement of
 * fact rather than a placeholder. Arkansas's K-5 codes are real Arkansas codes
 * but nothing in this tree maps them to CCSS; Arkansas's 6-12 codes
 * (`AR.Math.G6.RP`) and Florida's (`FL.BEST.Math.G6.RP`) are CCSS domain
 * letters wearing a state prefix and must not be shown to anyone until they are
 * replaced with transcribed ones.
 */
export const stateStandardBindings = {
  HK: { kind: "untranscribed" },
  MAINLAND_PEP_HIGH: { kind: "untranscribed" },
  US_CA_MATH: { kind: "ccss-identity" },
  US_NC_MATH: { kind: "untranscribed" },
  US_AR_MATH: { kind: "untranscribed" },
  US_FL_MATH: { kind: "untranscribed" }
} as const satisfies Record<CurriculumTrack, StateStandardBinding>;

export type StandardRefDisplay =
  /** Show the code alone: the claim is exact and the asset carries it. */
  | { display: "code"; code: string; relation: "exact" }
  /** Show the code with a hedge: the mapping is real but not one-to-one. */
  | { display: "qualified"; code: string; relation: Exclude<CrosswalkRelation, "exact" | "none">; qualifier: string }
  /** Show nothing: the claim cannot be supported. */
  | { display: "hidden"; reason: "no-binding" | "no-crosswalk-row" | "relation-none" | "asset-does-not-carry-standard" };

const qualifierByRelation: Record<Exclude<CrosswalkRelation, "exact" | "none">, string> = {
  narrower: "develops part of",
  broader: "develops more than",
  partial: "partially develops"
};

export type StandardRefInput = {
  track: CurriculumTrack;
  /** The state code we are being asked to display. */
  stateStandardId: string;
  /** The CCSS ids the ASSET itself carries — the ground truth for the claim. */
  assetStandardIds: readonly string[];
};

export function resolveStandardRef({ track, stateStandardId, assetStandardIds }: StandardRefInput): StandardRefDisplay {
  return resolveStandardRefWithBinding(stateStandardBindings[track], stateStandardId, assetStandardIds);
}

/**
 * The rules, independent of the registry. Exported so a crosswalk can be
 * exercised end to end before any state has one committed — the registry lookup
 * is the only thing `resolveStandardRef` adds.
 */
export function resolveStandardRefWithBinding(
  binding: StateStandardBinding,
  stateStandardId: string,
  assetStandardIds: readonly string[]
): StandardRefDisplay {
  const assetIds = new Set(normalizeCcssIds(assetStandardIds));

  if (binding.kind === "untranscribed") {
    return { display: "hidden", reason: "no-binding" };
  }

  if (binding.kind === "ccss-identity") {
    // The state's code is a CCSS code, so the only question is whether the
    // asset actually carries it. A California lab tagged 5.NBT.7 may not be
    // labelled 4.NF.1 just because a topic mentions both.
    return assetIds.has(normalizeCcssId(stateStandardId))
      ? { display: "code", code: stateStandardId, relation: "exact" }
      : { display: "hidden", reason: "asset-does-not-carry-standard" };
  }

  const row = binding.rows.find((candidate) => candidate.stateStandardId === stateStandardId);
  if (!row) return { display: "hidden", reason: "no-crosswalk-row" };
  if (row.relation === "none") return { display: "hidden", reason: "relation-none" };

  const overlaps = normalizeCcssIds(row.ccss).some((id) => assetIds.has(id));
  if (!overlaps) return { display: "hidden", reason: "asset-does-not-carry-standard" };

  return row.relation === "exact"
    ? { display: "code", code: stateStandardId, relation: "exact" }
    : {
        display: "qualified",
        code: stateStandardId,
        relation: row.relation,
        qualifier: qualifierByRelation[row.relation]
      };
}

/** The exact string a surface should render, or null when it must render nothing. */
export function standardRefText(input: StandardRefInput): string | null {
  const resolved = resolveStandardRef(input);
  if (resolved.display === "code") return resolved.code;
  if (resolved.display === "qualified") return `${resolved.qualifier} ${resolved.code}`;
  return null;
}
