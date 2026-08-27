import assert from "node:assert/strict";
import test from "node:test";

import {
  COURSE_INTEGRATION_SCHEMA_VERSION,
  createCanonicalCourseVersion
} from "./model";

test("canonical course versions retain stable relationships and immutable version metadata", () => {
  const importedAt = "2026-08-27T04:00:00.000Z";
  const packageSha256 = "a".repeat(64);
  const version = createCanonicalCourseVersion({
    packageIdentity: {
      sha256: packageSha256,
      schemaVersion: COURSE_INTEGRATION_SCHEMA_VERSION,
      sourceFormat: "scorm-1.2",
      importedAt
    },
    versionMetadata: {
      versionId: `sha256:${packageSha256}`,
      createdAt: importedAt,
      predecessorVersionId: null,
      contentSha256: packageSha256,
      immutable: true
    },
    course: {
      kind: "course",
      id: "scorm:manifest:course-1",
      sourceId: "course-1",
      parentId: null,
      order: 0,
      title: "Safe algebra"
    },
    modules: [{
      kind: "module",
      id: "scorm:organization:org-1",
      sourceId: "org-1",
      parentId: "scorm:manifest:course-1",
      order: 0,
      title: "Module 1"
    }],
    units: [{
      kind: "unit",
      id: "scorm:item:unit-1",
      sourceId: "unit-1",
      parentId: "scorm:organization:org-1",
      order: 0,
      title: "Unit 1",
      resourceIds: ["scorm:resource:resource-1"],
      assessmentIds: []
    }],
    activities: [{
      kind: "activity",
      id: "scorm:item:activity-1",
      sourceId: "activity-1",
      parentId: "scorm:item:unit-1",
      order: 0,
      title: "Activity 1",
      resourceIds: ["scorm:resource:resource-1"],
      assessmentIds: ["assessment:quiz-1"]
    }],
    resources: [{
      kind: "resource",
      id: "scorm:resource:resource-1",
      sourceId: "resource-1",
      parentId: "scorm:manifest:course-1",
      order: 0,
      title: null,
      href: "lesson.html",
      scormType: "sco",
      filePaths: ["lesson.html"],
      dependencyResourceIds: [],
      referencedByIds: ["scorm:item:unit-1", "scorm:item:activity-1"]
    }],
    assessments: [{
      kind: "assessment",
      id: "assessment:quiz-1",
      sourceId: "quiz-1",
      parentId: "scorm:item:activity-1",
      order: 0,
      title: "Quiz 1",
      assessmentType: "quiz",
      resourceIds: ["scorm:resource:resource-1"]
    }]
  });

  assert.equal(version.units[0]?.parentId, version.modules[0]?.id);
  assert.deepEqual(version.activities[0]?.resourceIds, [version.resources[0]?.id]);
  assert.equal(version.assessments[0]?.parentId, version.activities[0]?.id);
  assert.deepEqual(version.activities[0]?.assessmentIds, [version.assessments[0]?.id]);
  assert.ok(Object.isFrozen(version));
  assert.ok(Object.isFrozen(version.versionMetadata));
  assert.ok(Object.isFrozen(version.activities[0]?.resourceIds));
  assert.throws(() => {
    (version.versionMetadata as { versionId: string }).versionId = "mutable";
  }, TypeError);
});
