import assert from "node:assert/strict";
import test from "node:test";

import { diffCanonicalCourseVersions } from "./diff";
import {
  COURSE_INTEGRATION_SCHEMA_VERSION,
  createCanonicalCourseVersion,
  type CanonicalCourseVersionInput
} from "./model";

function versionInput(
  sha256: string,
  overrides: Pick<CanonicalCourseVersionInput, "units" | "activities">
): CanonicalCourseVersionInput {
  return {
    sourceProvenance: {
      packageSha256: sha256,
      schemaVersion: COURSE_INTEGRATION_SCHEMA_VERSION,
      source: { format: "common-cartridge", version: "1.3" },
      adapter: { id: "org.mais.common-cartridge", version: "1.0.0" }
    },
    predecessorVersionId: null,
    course: {
      kind: "course",
      id: "course:stable",
      sourceId: "course-source",
      parentId: null,
      order: 0,
      title: "Stable course"
    },
    modules: [
      {
        kind: "module",
        id: "module:a",
        sourceId: "module-a",
        parentId: "course:stable",
        order: 0,
        title: "Module A"
      },
      {
        kind: "module",
        id: "module:b",
        sourceId: "module-b",
        parentId: "course:stable",
        order: 1,
        title: "Module B"
      }
    ],
    units: overrides.units,
    activities: overrides.activities,
    resources: [],
    assessments: []
  };
}

function unit(id: string, parentId: string, order: number) {
  return {
    kind: "unit" as const,
    id,
    sourceId: id,
    parentId,
    order,
    title: id,
    resourceIds: [],
    assessmentIds: []
  };
}

test("canonical version diff returns deterministic added, removed, changed, and moved stable IDs", () => {
  const before = createCanonicalCourseVersion(versionInput("a".repeat(64), {
    units: [
      unit("unit:stable", "module:a", 0),
      unit("unit:removed", "module:a", 1),
      unit("unit:moved", "module:b", 0)
    ],
    activities: [{
      kind: "activity",
      id: "activity:changed",
      sourceId: "activity-source",
      parentId: "unit:stable",
      order: 0,
      title: "Original title",
      resourceIds: [],
      assessmentIds: []
    }]
  }));
  const after = createCanonicalCourseVersion(versionInput("b".repeat(64), {
    units: [
      unit("unit:stable", "module:a", 0),
      unit("unit:moved", "module:a", 1),
      unit("unit:added", "module:b", 0)
    ],
    activities: [{
      kind: "activity",
      id: "activity:changed",
      sourceId: "activity-source",
      parentId: "unit:stable",
      order: 0,
      title: "Revised title",
      resourceIds: [],
      assessmentIds: []
    }]
  }));

  const expected = {
    added: [{ kind: "unit", id: "unit:added" }],
    removed: [{ kind: "unit", id: "unit:removed" }],
    changed: [{ kind: "activity", id: "activity:changed" }],
    moved: [{
      kind: "unit",
      id: "unit:moved",
      from: { parentId: "module:b", order: 0 },
      to: { parentId: "module:a", order: 1 }
    }]
  };

  assert.deepEqual(diffCanonicalCourseVersions(before, after), expected);
  assert.deepEqual(diffCanonicalCourseVersions(before, after), expected);
});
