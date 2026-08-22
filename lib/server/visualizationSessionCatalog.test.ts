import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { visualizationLabCatalog } from "@/data/visualizationLabs";
import { generatedVisualizationSessionCatalog } from "@/lib/server/visualizationSessionCatalog.generated";

function projectCatalog() {
  return visualizationLabCatalog
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
}

test("server projection is deterministic and exactly matches both catalog session identities", () => {
  assert.deepEqual(generatedVisualizationSessionCatalog, projectCatalog());
});

test("the final HK S3 split topics are explicit generated session rows", () => {
  for (const labId of ["identities-square-patterns", "arc-length-sector-area"]) {
    const catalogLab = visualizationLabCatalog.find((lab) => lab.labId === labId);
    assert.ok(catalogLab, `${labId} must exist in the final catalog before release`);
    const generated = generatedVisualizationSessionCatalog.find((entry) => entry.labId === labId);
    assert.deepEqual(generated, {
      labId,
      topicId: labId,
      source: "geometry",
      grade: "S3",
      curriculumTrack: "HK",
      publisher: null,
      directoryModuleId: `geometry:${labId}:${labId}`,
      lessonModuleId: "configured-visualization-lab"
    });
  }
});

test("runtime session eligibility has no visualization component or UI catalog dependency", async () => {
  const source = await readFile(new URL("./visualizationSessionEligibility.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /data\/visualizationLabs|components\//);
  assert.match(source, /visualizationSessionCatalog\.generated/);
});
