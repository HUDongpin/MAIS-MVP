/**
 * Shared vocabulary for CCSS standard identifiers.
 *
 * Two dialects exist in this repo: the canonical registry in `data/ccss` emits
 * the full `K.CC.A.1` / `A-REI.D.11` form, while several tagging sources emit
 * the letter-less `K.CC.1` / `A-REI.11`. Removing the cluster letter must
 * retain the complete numbered identifier, including a subpart such as `7c`.
 *
 * `standardIdPattern` is the shared detector for code-like strings in ported
 * lesson prose. The source audit checks those strings against asset metadata;
 * the footer resolver separately validates complete identifiers.
 */

/** K-8 form: `5.NBT.7`, `K.CC.A.1`, `6.NS.C.7`, `3.OA.A.1a`. */
const k8StandardId = /\b(?:K|[1-9]|1[0-2])\.[A-Z]{1,3}\.(?:[A-D]\.)?\d+[a-z]?\b/;
/** High-school conceptual-category form: `A-REI.D.11`, `G-CO.10`, `S-ID.6`. */
const highSchoolStandardId = /\b[A-Z]-[A-Z]{2,3}\.(?:[A-D]\.)?\d+[a-z]?\b/;

export const standardIdPattern = new RegExp(`(?:${k8StandardId.source})|(?:${highSchoolStandardId.source})`, "g");

export function looksLikeStandardId(value: string): boolean {
  return new RegExp(standardIdPattern.source).test(value);
}

const completeK8Id = /^(?:K|[1-9]|1[0-2])\.[A-Z]{1,3}(?:\.[A-D])?\.\d+[a-z]?$/;
const completeHighSchoolId = /^[A-Z]-[A-Z]{2,3}(?:\.[A-D])?\.\d+[a-z]?$/;

/** True only for a complete CCSS id in either registry dialect. */
export function isCcssId(value: string): boolean {
  return completeK8Id.test(value) || completeHighSchoolId.test(value);
}

/**
 * Drop the cluster letter so the repo's two id dialects resolve to one key.
 * `K.CC.A.1` -> `K.CC.1`; `A-REI.D.11` -> `A-REI.11`; anything unrecognised is
 * returned unchanged rather than mangled.
 */
export function normalizeCcssId(code: string): string {
  const highSchool = code.match(/^([A-Z]-[A-Z]{2,3})(?:\.[A-D])?\.(\d+[a-z]?)$/);
  if (highSchool) return `${highSchool[1]}.${highSchool[2]}`;
  const k12 = code.match(/^(K|[1-9]|1[0-2])\.([A-Z]{1,3})(?:\.[A-D])?\.(\d+[a-z]?)$/);
  if (k12) return `${k12[1]}.${k12[2]}.${k12[3]}`;
  return code;
}

export function normalizeCcssIds(codes: readonly string[]): string[] {
  return codes.map(normalizeCcssId);
}
