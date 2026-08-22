import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { visualizationLabCatalog } from "@/data/visualizationLabs";
import { isCanonicalVisualizationSessionIdentity } from "@/lib/visualizationSessionContract";

const outputPath = path.join(
  process.cwd(),
  "lib/server/visualizationSessionCatalog.generated.ts"
);

export function buildVisualizationSessionCatalogProjection() {
  const projection = visualizationLabCatalog
    .map((lab) => ({
      labId: lab.labId,
      topicId: lab.topicId,
      source: lab.analyticsSource,
      grade: lab.grade,
      curriculumTrack: lab.curriculumTrack,
      publisher: lab.publisher ?? null,
      directoryModuleId: `${lab.analyticsSource}:${lab.labId}:${lab.topicId}`,
      lessonModuleId: "configured-visualization-lab" as const
    }))
    .sort((left, right) => JSON.stringify([left.labId, left.topicId, left.source])
      .localeCompare(JSON.stringify([right.labId, right.topicId, right.source])));

  const identityKeys = new Set<string>();
  for (const entry of projection) {
    for (const [moduleId, topicId] of [
      [entry.directoryModuleId, entry.topicId],
      [entry.lessonModuleId, entry.labId]
    ] as const) {
      if (
        !isCanonicalVisualizationSessionIdentity(moduleId) ||
        !isCanonicalVisualizationSessionIdentity(topicId)
      ) {
        throw new Error(`Non-canonical visualization session identity for ${entry.labId}.`);
      }
      const identityKey = JSON.stringify([moduleId, topicId, entry.source]);
      if (identityKeys.has(identityKey)) {
        throw new Error(`Duplicate visualization session identity for ${entry.labId}: ${identityKey}`);
      }
      identityKeys.add(identityKey);
    }
  }

  return projection;
}

export function renderVisualizationSessionCatalogProjection() {
  const projection = buildVisualizationSessionCatalogProjection();
  return `/* eslint-disable */
/**
 * GENERATED server-only visualization-session projection.
 *
 * Runtime API code imports this file instead of the UI-coupled catalog.
 * Regenerate with scripts/generate-visualization-session-catalog.mts.
 */

import type {
  GradeId,
  LearningAnalyticsEventSource,
  TextbookPublisher
} from "@/types";

export type GeneratedVisualizationSessionCatalogEntry = {
  labId: string;
  topicId: string;
  source: LearningAnalyticsEventSource;
  grade: GradeId;
  curriculumTrack:
    | "HK"
    | "US"
    | "MAINLAND_PEP_PRIMARY"
    | "MAINLAND_PEP_JUNIOR"
    | "MAINLAND_PEP_HIGH"
    | "MAINLAND_HJB"
    | "MAINLAND_BNU"
    | "CAPSTONE";
  publisher: TextbookPublisher | null;
  directoryModuleId: string;
  lessonModuleId: "configured-visualization-lab";
};

export const generatedVisualizationSessionCatalog = ${JSON.stringify(projection, null, 2)} as const satisfies readonly GeneratedVisualizationSessionCatalogEntry[];
`;
}

async function main() {
  const rendered = renderVisualizationSessionCatalogProjection();
  if (process.argv.includes("--check")) {
    const current = await readFile(outputPath, "utf8").catch(() => "");
    if (current !== rendered) {
      throw new Error("Generated visualization-session catalog is stale. Run the generator without --check.");
    }
    return;
  }
  await writeFile(outputPath, rendered, "utf8");
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  await main();
}
