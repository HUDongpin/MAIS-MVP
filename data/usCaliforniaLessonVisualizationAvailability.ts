/**
 * Production allowlist for visualization models embedded on California lesson
 * pages.
 *
 * This list is intentionally empty. Renderer-level QA on 2026-08-09 found
 * that every California catalog entry resolves to `signature-lab`, while the
 * lesson surface still renders the generic configured template. None of the
 * 76 resulting embeds was both fully aligned and correctly bounded for its
 * displayed claim. Signature benches remain available in the separate
 * Visualization Lab catalog, but are not eligible for lesson-page promotion
 * until topic fit, localization, accessibility, and actual-route rendering are
 * independently approved.
 *
 * Keeping this as a tiny dependency-free module lets both server lesson data
 * and the client lesson directory enforce the same publication decision
 * without importing the large visualization catalog into the browser bundle.
 */
export const productionCaliforniaLessonVisualizationTopicIds = [] as const;

const productionTopicIds = new Set<string>(productionCaliforniaLessonVisualizationTopicIds);

export function hasProductionCaliforniaLessonVisualization(topicId: string | null | undefined) {
  return Boolean(topicId && productionTopicIds.has(topicId));
}
