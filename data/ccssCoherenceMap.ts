import type { GradeId } from "@/types";
import { ccssClusterById, ccssClusterIdForTopic } from "./ccssStandards";

/**
 * Cross-topic / cross-grade prerequisite DAG for the CCSS coherence map (K–5 pilot,
 * plus the Grade 6 bridge targets that fractions and the coordinate plane feed into).
 *
 * Source of the edges: the CCSS "coherence map" and the CCSS Progressions documents
 * (Counting & Cardinality → Operations & Algebraic Thinking → Number & Base Ten;
 * the Number & Operations — Fractions progression; the Measurement/Geometry
 * progressions). Cluster titles elsewhere in the codebase are short paraphrases for the
 * UI, and these edges encode *pedagogical* prerequisite dependencies between CCSS
 * domain-grade clusters — they are not lifted verbatim from the legal standard text.
 *
 * Each entry maps a cluster to the clusters a learner should have working fluency in
 * *before* that cluster is developmentally reachable. Every edge points from a
 * lower-or-equal grade band to an equal-or-higher grade band, and the within-grade edges
 * are themselves acyclic, so the whole relation is a DAG (asserted in the tests).
 *
 * This is the single asset that upgrades the Knowledge Galaxy from "grade-ordered topics
 * with mastery coloring" into a real prerequisite-aware path: it powers cross-topic
 * galaxy edges, locked-until-prerequisite gating, diagnostic backtracking (a Grade 4
 * student who fails 4.NF is routed back to the specific Grade 3 prerequisite), and the
 * computed "why this next" trajectory.
 */

export type CcssClusterId = string;

/** Stage of a prerequisite topic that a dependent topic's foundation stage links to. */
export const crossTopicPrerequisiteStage = "fluency" as const;

/**
 * child cluster -> prerequisite clusters. Only clusters that actually gate the child are
 * listed; a cluster absent from this map (or with an empty list) is an entry point.
 */
export const ccssCoherenceEdges: Record<CcssClusterId, CcssClusterId[]> = {
  // ---- Counting & Cardinality → Operations, Base Ten ------------------------------
  "K.OA": ["K.CC"],
  "K.NBT": ["K.CC"],

  // ---- Operations & Algebraic Thinking (add/sub → mult/div → expressions) ---------
  "1.OA": ["K.OA"],
  "2.OA": ["1.OA"],
  "3.OA": ["2.OA", "2.NBT"], // multiplication/division grows out of arrays + place value
  "4.OA": ["3.OA"],
  "5.OA": ["4.OA"],
  "6.EE": ["5.OA"], // algebraic expressions build on numerical expressions/patterns

  // ---- Number & Operations in Base Ten (place value spine) ------------------------
  "1.NBT": ["K.CC", "K.NBT"],
  "2.NBT": ["1.NBT"],
  "3.NBT": ["2.NBT"],
  "4.NBT": ["3.NBT", "3.OA"], // multi-digit algorithms need multiplication fluency
  "5.NBT": ["4.NBT", "4.NF"], // decimals extend place value and tenths/hundredths
  "6.NS": ["5.NBT", "5.NF"], // multi-digit/decimal fluency + dividing fractions

  // ---- Number & Operations — Fractions --------------------------------------------
  "3.NF": ["3.OA", "3.G"], // unit fractions from equal groups + partitioned shapes
  "4.NF": ["3.NF", "4.OA", "4.NBT"], // equivalence/ops need mult reasoning + place value
  "5.NF": ["4.NF", "5.NBT"],

  // ---- Ratio & Proportional Relationships (Grade 6 bridge) ------------------------
  "6.RP": ["5.NF"], // ratios/unit rates extend multiplicative + fraction reasoning

  // ---- Measurement & Data (length/area/volume/data spine) -------------------------
  "1.MD": ["K.MD"],
  "2.MD": ["1.MD"],
  "3.MD": ["2.MD", "3.OA"], // area relates to multiplication (3.MD.7)
  "4.MD": ["3.MD", "4.NBT"], // unit conversion uses multiplication
  "5.MD": ["4.MD", "5.NBT"], // volume relates to multiplication
  "6.SP": ["5.MD"], // statistics extends line-plot/data work

  // ---- Geometry -------------------------------------------------------------------
  "1.G": ["K.G"],
  "2.G": ["1.G"],
  "3.G": ["2.G"],
  "4.G": ["3.G", "4.MD"], // classify by lines/angles after measuring angles
  "5.G": ["4.G", "5.OA"], // coordinate plane uses ordered pairs from patterns
  "6.G": ["5.G", "5.NF"] // area/volume with fractional dimensions
};

/** Clusters that directly gate `clusterId` (its immediate prerequisites). */
export function ccssPrerequisiteClusters(clusterId: CcssClusterId): CcssClusterId[] {
  return ccssCoherenceEdges[clusterId] ?? [];
}

const dependentsByCluster: Map<CcssClusterId, CcssClusterId[]> = (() => {
  const map = new Map<CcssClusterId, CcssClusterId[]>();
  for (const [child, parents] of Object.entries(ccssCoherenceEdges)) {
    for (const parent of parents) {
      const bucket = map.get(parent) ?? [];
      if (!bucket.includes(child)) bucket.push(child);
      map.set(parent, bucket);
    }
  }
  return map;
})();

/** Clusters that `clusterId` directly unlocks (its immediate dependents). */
export function ccssDependentClusters(clusterId: CcssClusterId): CcssClusterId[] {
  return dependentsByCluster.get(clusterId) ?? [];
}

/** Every cluster mentioned as a child or a parent in the coherence graph. */
export function ccssCoherenceClusterIds(): CcssClusterId[] {
  const ids = new Set<CcssClusterId>();
  for (const [child, parents] of Object.entries(ccssCoherenceEdges)) {
    ids.add(child);
    for (const parent of parents) ids.add(parent);
  }
  return [...ids].sort();
}

/**
 * Kahn's-algorithm topological order over the coherence DAG. Returns `null` when the
 * graph contains a cycle (used by the tests as an acyclicity guard).
 */
export function ccssCoherenceTopologicalOrder(): CcssClusterId[] | null {
  const nodes = ccssCoherenceClusterIds();
  const indegree = new Map<CcssClusterId, number>(nodes.map((id) => [id, 0]));
  // Edge direction for ordering: prerequisite -> dependent.
  for (const [child, parents] of Object.entries(ccssCoherenceEdges)) {
    indegree.set(child, (indegree.get(child) ?? 0) + parents.length);
  }
  const queue = nodes.filter((id) => (indegree.get(id) ?? 0) === 0).sort();
  const order: CcssClusterId[] = [];
  while (queue.length) {
    const node = queue.shift() as CcssClusterId;
    order.push(node);
    const next: CcssClusterId[] = [];
    for (const dependent of ccssDependentClusters(node)) {
      const remaining = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, remaining);
      if (remaining === 0) next.push(dependent);
    }
    next.sort();
    queue.push(...next);
  }
  return order.length === nodes.length ? order : null;
}

/** True when every cluster referenced by the graph exists in the CCSS registry. */
export function ccssCoherenceClustersAreKnown(): boolean {
  return ccssCoherenceClusterIds().every((id) => ccssClusterById.has(id));
}

type TopicLike = { id: string; grade: GradeId };

function skillIdForStage(topicId: string, stage: string) {
  return `${topicId}:${stage}`;
}

/**
 * Resolves the cross-topic prerequisite skill ids for each topic in a set, using the
 * coherence DAG. A dependent topic's *foundation* stage gains prerequisites equal to the
 * fluency-stage skill of every prerequisite-cluster topic that is actually present in the
 * provided set — so the graph never links to a topic the learner cannot see, and
 * curricula without a CCSS cluster mapping (e.g. HK topics) resolve to no cross links.
 */
export function resolveCrossTopicPrerequisiteSkillIds(
  topics: TopicLike[]
): Map<string, string[]> {
  const topicsByCluster = new Map<CcssClusterId, TopicLike[]>();
  const clusterByTopicId = new Map<string, CcssClusterId>();

  for (const topic of topics) {
    const clusterId = ccssClusterIdForTopic(topic.id, topic.grade);
    if (!clusterId) continue;
    clusterByTopicId.set(topic.id, clusterId);
    const bucket = topicsByCluster.get(clusterId) ?? [];
    bucket.push(topic);
    topicsByCluster.set(clusterId, bucket);
  }

  const result = new Map<string, string[]>();
  for (const topic of topics) {
    const clusterId = clusterByTopicId.get(topic.id);
    if (!clusterId) {
      result.set(topic.id, []);
      continue;
    }
    const prerequisiteSkillIds: string[] = [];
    const seen = new Set<string>();
    for (const prerequisiteCluster of ccssPrerequisiteClusters(clusterId)) {
      for (const prerequisiteTopic of topicsByCluster.get(prerequisiteCluster) ?? []) {
        if (prerequisiteTopic.id === topic.id) continue; // never self-link
        const skillId = skillIdForStage(prerequisiteTopic.id, crossTopicPrerequisiteStage);
        if (seen.has(skillId)) continue;
        seen.add(skillId);
        prerequisiteSkillIds.push(skillId);
      }
    }
    result.set(topic.id, prerequisiteSkillIds);
  }
  return result;
}

const gradeBandOrder: GradeId[] = ["K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"];

/**
 * The grade(s) immediately below `grade` whose clusters gate the given grade's clusters.
 * A galaxy/decision context can widen its topic pool by these grades to enable
 * *cross-grade* diagnostic backtracking (route a stuck learner to the earlier grade's
 * prerequisite). Returns lower grades only, nearest first.
 */
export function prerequisiteGradesForGrade(grade: GradeId, depth = 1): GradeId[] {
  const index = gradeBandOrder.indexOf(grade);
  if (index <= 0) return [];
  const grades: GradeId[] = [];
  for (let step = 1; step <= depth; step += 1) {
    const candidate = gradeBandOrder[index - step];
    if (candidate) grades.push(candidate);
  }
  return grades;
}
