import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  californiaSemanticallyVerifiedThreeDLabIds,
  visualizationLabCatalog
} from "@/data/visualizationLabs";
import { generatedVisualizationSessionCatalog } from "@/lib/server/visualizationSessionCatalog.generated";
import {
  isEligibleVisualizationSession,
  isVisualizationSessionEligibleForLearner
} from "@/lib/server/visualizationSessionEligibility";

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

test("server visualization-session projection exactly matches the visible catalog", () => {
  assert.deepEqual(generatedVisualizationSessionCatalog, projectCatalog());
  assert.equal(generatedVisualizationSessionCatalog.length, visualizationLabCatalog.length);
});

test("every catalog session identity is eligible while fabricated tuple parts fail closed", () => {
  for (const lab of visualizationLabCatalog) {
    for (const moduleId of [
      `${lab.analyticsSource}:${lab.labId}:${lab.topicId}`,
      "configured-visualization-lab"
    ]) {
      assert.equal(isEligibleVisualizationSession({
        moduleId,
        topicId: moduleId === "configured-visualization-lab" ? lab.labId : lab.topicId,
        source: lab.analyticsSource
      }), true, `${lab.labId}:${moduleId}`);
    }
  }

  const first = visualizationLabCatalog[0];
  assert.ok(first);
  const identity = {
    moduleId: `${first.analyticsSource}:${first.labId}:${first.topicId}`,
    topicId: first.topicId,
    source: first.analyticsSource
  };
  assert.equal(isEligibleVisualizationSession({ ...identity, moduleId: `${identity.moduleId}:forged` }), false);
  assert.equal(isEligibleVisualizationSession({ ...identity, topicId: `${identity.topicId}:forged` }), false);
  assert.equal(isEligibleVisualizationSession({ ...identity, source: "navigation" }), false);
});

test("the two current California verified 3D rows remain in the server projection", () => {
  assert.deepEqual([...californiaSemanticallyVerifiedThreeDLabIds], [
    "us-ca-math-s4-chapter-04",
    "us-ca-math-s5-chapter-03"
  ]);
  for (const labId of californiaSemanticallyVerifiedThreeDLabIds) {
    const lab = visualizationLabCatalog.find((candidate) => candidate.labId === labId);
    const projected = generatedVisualizationSessionCatalog.find((candidate) => candidate.labId === labId);
    assert.ok(lab);
    assert.deepEqual(projected, {
      labId: lab.labId,
      topicId: lab.topicId,
      source: lab.analyticsSource,
      grade: lab.grade,
      curriculumTrack: lab.curriculumTrack,
      publisher: lab.publisher ?? null,
      directoryModuleId: `${lab.analyticsSource}:${lab.labId}:${lab.topicId}`,
      lessonModuleId: "configured-visualization-lab"
    });
  }
});

test("session eligibility is scoped to the authenticated learner curriculum", () => {
  const californiaLab = visualizationLabCatalog.find((lab) =>
    lab.curriculumTrack === "US" && lab.publisher === "US_CA_MATH" && lab.grade === "S4"
  );
  const hongKongLab = visualizationLabCatalog.find((lab) =>
    lab.curriculumTrack === "HK" && lab.grade === "S4"
  );
  assert.ok(californiaLab);
  assert.ok(hongKongLab);
  const californiaIdentity = {
    moduleId: "configured-visualization-lab",
    topicId: californiaLab.labId,
    source: californiaLab.analyticsSource
  };
  const californiaLearner = {
    grade: "S4" as const,
    curriculumTrack: "US_CA_MATH" as const,
    curriculumProfile: {
      region: "US" as const,
      publisher: "US_CA_MATH" as const
    }
  };
  assert.equal(isVisualizationSessionEligibleForLearner(californiaIdentity, californiaLearner), true);
  assert.equal(isVisualizationSessionEligibleForLearner({
    moduleId: "configured-visualization-lab",
    topicId: hongKongLab.labId,
    source: hongKongLab.analyticsSource
  }, californiaLearner), false);
  assert.equal(isVisualizationSessionEligibleForLearner(californiaIdentity, {
    ...californiaLearner,
    grade: "S5"
  }), false);

  const californiaGradeCapstone = visualizationLabCatalog.find((lab) =>
    lab.curriculumTrack === "CAPSTONE" && lab.grade === "S6"
  );
  assert.ok(californiaGradeCapstone);
  const capstoneIdentity = {
    moduleId: "configured-visualization-lab",
    topicId: californiaGradeCapstone.labId,
    source: californiaGradeCapstone.analyticsSource
  };
  assert.equal(isVisualizationSessionEligibleForLearner(capstoneIdentity, {
    ...californiaLearner,
    grade: "S6"
  }), false, "the learner UI excludes CAPSTONE from United States publisher scopes");
  assert.equal(isVisualizationSessionEligibleForLearner(capstoneIdentity, {
    grade: "S6",
    curriculumTrack: "HK",
    curriculumProfile: {
      region: "HK",
      publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"
    }
  }), true);
});

test("runtime eligibility imports only the generated server projection", async () => {
  const source = await readFile(new URL("./visualizationSessionEligibility.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /data\/visualizationLabs|components\//);
  assert.match(source, /visualizationSessionCatalog\.generated/);
});
