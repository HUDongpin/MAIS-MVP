/**
 * Shared vocabulary for CCSS standard identifiers.
 *
 * Two dialects exist in this repo: the canonical registry in `data/ccss` emits
 * the full `K.CC.A.1` / `A-REI.D.11` form, while several tagging sources emit
 * the letter-less `K.CC.1` / `A-REI.11`. Normalizing to the letter-less form is
 * lossless over the 385-standard registry, which is why the bench-candidate
 * generator already normalizes the same way.
 *
 * `standardIdPattern` is the single definition of "this string looks like a
 * standard code". Both the `StandardRef` resolver and the prose gate that keeps
 * raw codes out of student-visible text read it from here, so the two can never
 * disagree about what they are looking at.
 */

/** K-8 form: `5.NBT.7`, `K.CC.A.1`, `6.NS.C.7`, `3.OA.A.1a`. */
const k8StandardId = /\b(?:K|[1-9]|1[0-2])\.[A-Z]{1,3}\.(?:[A-D]\.)?\d+[a-z]?\b/;
/** High-school conceptual-category form: `A-REI.D.11`, `G-CO.10`, `S-ID.6`. */
const highSchoolStandardId = /\b[A-Z]-[A-Z]{2,3}\.(?:[A-D]\.)?\d+[a-z]?\b/;

export const standardIdPattern = new RegExp(`(?:${k8StandardId.source})|(?:${highSchoolStandardId.source})`, "g");

export function looksLikeStandardId(value: string): boolean {
  return new RegExp(standardIdPattern.source).test(value);
}

/**
 * Drop the cluster letter so the repo's two id dialects resolve to one key.
 * `K.CC.A.1` -> `K.CC.1`; `A-REI.D.11` -> `A-REI.11`; anything unrecognised is
 * returned unchanged rather than mangled.
 */
export function normalizeCcssId(code: string): string {
  const highSchool = code.match(/^([A-Z]+)-([A-Z]+)\.([A-Z])\.(\d+)/);
  if (highSchool) return `${highSchool[1]}-${highSchool[2]}.${highSchool[4]}`;
  const k12 = code.match(/^(K|\d+)\.([A-Z]+)(?:\.([A-Z]))?\.(\d+)/);
  if (k12) return `${k12[1]}.${k12[2]}.${k12[4]}`;
  return code;
}

export function normalizeCcssIds(codes: readonly string[]): string[] {
  return codes.map(normalizeCcssId);
}
