/**
 * Common Core State Standards for Mathematics — data model.
 *
 * The hierarchy mirrors the official CCSS-M structure exactly:
 *
 *   Grade  →  Domain  →  Cluster  →  Standard
 *
 * For K–8 a standard id looks like `3.NF.A.1`
 *   (grade . DOMAIN . cluster-letter . number).
 * For High School the "grade" is a conceptual category
 *   (Number & Quantity, Algebra, Functions, Geometry, Statistics & Probability)
 * and a standard id looks like `A-APR.1` (DOMAIN . number); clusters still
 * carry a letter internally per the official document.
 *
 * Descriptions are concise, faithful paraphrases of each standard (not the
 * verbatim copyrighted text) so the app can render navigable, correct content.
 */

export type GradeId =
  | "K"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "HS";

export type BandId = "early" | "upper" | "middle" | "high";

export interface Standard {
  /** Canonical CCSS id, e.g. "K.CC.A.1" or "A-APR.1". */
  id: string;
  /** Faithful one-line paraphrase of the standard. */
  description: string;
}

export interface Cluster {
  /** Cluster letter within the domain, e.g. "A". */
  letter: string;
  /** Cluster heading (major/supporting/additional not encoded here). */
  heading: string;
  standards: Standard[];
}

export interface Domain {
  /** Domain code without grade prefix, e.g. "CC", "NF", "A-APR". */
  code: string;
  /** Human-readable domain name. */
  name: string;
  /**
   * High-school conceptual category, e.g. "Algebra". Present only for HS
   * domains; K–8 domains leave this undefined.
   */
  category?: string;
  clusters: Cluster[];
}

export interface Grade {
  id: GradeId;
  /** Short label, e.g. "K" or "Grade 3" or "High School". */
  label: string;
  /** One-line description of the year's mathematical focus. */
  focus: string;
  band: BandId;
  domains: Domain[];
}

export interface Band {
  id: BandId;
  label: string;
  grades: GradeId[];
  /** CSS variable name carrying the band accent color. */
  colorVar: string;
  blurb: string;
}

/** Count every enumerated standard in a grade (for coverage summaries/tests). */
export function countStandards(grade: Grade): number {
  return grade.domains.reduce(
    (sum, d) =>
      sum + d.clusters.reduce((s, c) => s + c.standards.length, 0),
    0,
  );
}

/** All standard ids in a grade, in document order. */
export function standardIds(grade: Grade): string[] {
  return grade.domains.flatMap((d) =>
    d.clusters.flatMap((c) => c.standards.map((s) => s.id)),
  );
}
