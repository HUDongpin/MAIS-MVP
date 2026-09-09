import assert from "node:assert/strict";
import test from "node:test";

import {
  COURSE_INTEGRATION_SCHEMA_VERSION,
  createCanonicalCourseVersion,
  type CanonicalCourseVersionInput
} from "./model";

function versionInput(
  predecessorVersionId: string | null = null
): CanonicalCourseVersionInput {
  return {
    sourceProvenance: {
      packageSha256: "a".repeat(64),
      schemaVersion: COURSE_INTEGRATION_SCHEMA_VERSION,
      source: {
        format: "mais-native",
        version: "2026.08"
      },
      adapter: {
        id: "org.mais.native-course",
        version: "1.0.0"
      },
      extensions: {
        "org.mais.native": {
          curriculumTrack: "hk-secondary"
        }
      }
    },
    predecessorVersionId,
    course: {
      kind: "course",
      id: "course:course-1",
      sourceId: "course-1",
      parentId: null,
      order: 0,
      title: "Safe algebra"
    },
    modules: [{
      kind: "module",
      id: "module:org-1",
      sourceId: "org-1",
      parentId: "course:course-1",
      order: 0,
      title: "Module 1"
    }],
    units: [{
      kind: "unit",
      id: "unit:unit-1",
      sourceId: "unit-1",
      parentId: "module:org-1",
      order: 0,
      title: "Unit 1",
      resourceIds: ["resource:resource-1"],
      assessmentIds: []
    }],
    activities: [{
      kind: "activity",
      id: "activity:activity-1",
      sourceId: "activity-1",
      parentId: "unit:unit-1",
      order: 0,
      title: "Activity 1",
      resourceIds: ["resource:resource-1"],
      assessmentIds: ["assessment:quiz-1"]
    }],
    resources: [{
      kind: "resource",
      id: "resource:resource-1",
      sourceId: "resource-1",
      parentId: "course:course-1",
      order: 0,
      title: null,
      href: "lesson.html",
      filePaths: ["lesson.html"],
      dependencyResourceIds: [],
      referencedByIds: ["unit:unit-1", "activity:activity-1"],
      extensions: {
        "org.mais.native": {
          resourceRole: "lesson"
        }
      }
    }],
    assessments: [{
      kind: "assessment",
      id: "assessment:quiz-1",
      sourceId: "quiz-1",
      parentId: "activity:activity-1",
      order: 0,
      title: "Quiz 1",
      assessmentType: "quiz",
      resourceIds: ["resource:resource-1"]
    }]
  };
}

test("canonical course versions are provider-neutral, immutable, and retain stable relationships", () => {
  const version = createCanonicalCourseVersion(versionInput());

  assert.equal(version.sourceProvenance.source.format, "mais-native");
  assert.equal(version.sourceProvenance.extensions?.["org.mais.native"] &&
    typeof version.sourceProvenance.extensions["org.mais.native"] === "object", true);
  assert.equal("sourceFormat" in version.sourceProvenance, false);
  assert.equal("importedAt" in version.sourceProvenance, false);
  assert.equal("scormType" in version.resources[0]!, false);
  assert.equal(version.units[0]?.parentId, version.modules[0]?.id);
  assert.deepEqual(version.activities[0]?.resourceIds, [version.resources[0]?.id]);
  assert.equal(version.assessments[0]?.parentId, version.activities[0]?.id);
  assert.deepEqual(version.activities[0]?.assessmentIds, [version.assessments[0]?.id]);
  assert.ok(Object.isFrozen(version));
  assert.ok(Object.isFrozen(version.versionMetadata));
  assert.ok(Object.isFrozen(version.sourceProvenance.extensions));
  assert.ok(Object.isFrozen(version.activities[0]?.resourceIds));
  assert.throws(() => {
    (version.versionMetadata as { versionId: string }).versionId = "mutable";
  }, TypeError);
});

test("repeat construction is deterministic and predecessor identity is bound into versionId", () => {
  const first = createCanonicalCourseVersion(versionInput());
  const repeated = createCanonicalCourseVersion(versionInput());
  const withPredecessor = createCanonicalCourseVersion(versionInput("sha256:previous-version"));

  assert.deepEqual(repeated, first);
  assert.equal(repeated.versionMetadata.versionId, first.versionMetadata.versionId);
  assert.equal(repeated.versionMetadata.contentSha256, first.versionMetadata.contentSha256);
  assert.equal(withPredecessor.versionMetadata.contentSha256, first.versionMetadata.contentSha256);
  assert.notEqual(withPredecessor.versionMetadata.versionId, first.versionMetadata.versionId);
  assert.equal(withPredecessor.versionMetadata.predecessorVersionId, "sha256:previous-version");
  assert.equal("createdAt" in withPredecessor.versionMetadata, false);
});
