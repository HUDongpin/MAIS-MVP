import assert from "node:assert/strict";
import test from "node:test";

import { visualizationLabCatalog } from "../../data/visualizationLabs";
import {
  buildChinaVisualizationReleasePartition,
  CHINA_VISUALIZATION_DEDICATED_GROUP_MANIFESTS,
  CHINA_VISUALIZATION_RELEASE_PARTITION_CONTRACT,
  type ChinaVisualizationDedicatedGroupId,
} from "./china-visualization-release-partition";

const mainlandTracks = new Set([
  "MAINLAND_PEP_PRIMARY",
  "MAINLAND_PEP_JUNIOR",
  "MAINLAND_PEP_HIGH",
  "MAINLAND_HJB",
  "MAINLAND_BNU",
]);

function mutableDedicatedGroupManifests(): Array<{
  groupId: ChinaVisualizationDedicatedGroupId;
  labIds: string[];
}> {
  return CHINA_VISUALIZATION_DEDICATED_GROUP_MANIFESTS.map(
    ({ groupId, labIds }) => ({ groupId, labIds: [...labIds] }),
  );
}

test("the broad generic plan excludes a dedicated G01 Lab before generic assumptions", () => {
  const catalogLabIds = visualizationLabCatalog
    .filter((lab) => mainlandTracks.has(lab.curriculumTrack))
    .map((lab) => lab.labId);
  const partition = buildChinaVisualizationReleasePartition({ catalogLabIds });

  assert.equal(
    partition.genericLabIds.includes(
      "bnu-primary-p3-lower-two-digit-multiplication",
    ),
    false,
  );
});

test("the exact catalog partitions into generic301 and dedicated34 with frozen G01-G07 counts", () => {
  const catalogLabIds = visualizationLabCatalog
    .filter((lab) => mainlandTracks.has(lab.curriculumTrack))
    .map((lab) => lab.labId);
  const partition = buildChinaVisualizationReleasePartition({ catalogLabIds });

  assert.equal(partition.catalogLabIds.length, 335);
  assert.equal(partition.genericLabIds.length, 301);
  assert.equal(partition.dedicatedLabIds.length, 34);
  assert.equal(
    new Set([...partition.genericLabIds, ...partition.dedicatedLabIds]).size,
    335,
  );
  assert.deepEqual(
    Object.fromEntries(
      partition.dedicatedGroupManifests.map(({ groupId, labIds }) => [
        groupId,
        labIds.length,
      ]),
    ),
    CHINA_VISUALIZATION_RELEASE_PARTITION_CONTRACT.dedicatedGroupCounts,
  );
});

test("partition validation fails closed on count, duplicate, overlap, and group-count drift", () => {
  const catalogLabIds = visualizationLabCatalog
    .filter((lab) => mainlandTracks.has(lab.curriculumTrack))
    .map((lab) => lab.labId);

  assert.throws(
    () =>
      buildChinaVisualizationReleasePartition({
        catalogLabIds: catalogLabIds.slice(1),
      }),
    /catalog count must be 335|missing from the catalog/u,
  );
  assert.throws(
    () =>
      buildChinaVisualizationReleasePartition({
        catalogLabIds: [...catalogLabIds.slice(0, -1), catalogLabIds[0]],
      }),
    /duplicate Lab IDs|missing from the catalog/u,
  );

  const driftedGroups = mutableDedicatedGroupManifests();
  driftedGroups[1].labIds[0] = driftedGroups[0].labIds[0];
  assert.throws(
    () =>
      buildChinaVisualizationReleasePartition({
        catalogLabIds,
        dedicatedGroupManifests: driftedGroups,
      }),
    /dedicated groups overlap|dedicated union|generic partition/u,
  );

  const shortGroup = mutableDedicatedGroupManifests();
  shortGroup[6].labIds.pop();
  assert.throws(
    () =>
      buildChinaVisualizationReleasePartition({
        catalogLabIds,
        dedicatedGroupManifests: shortGroup,
      }),
    /G07 must own exactly 7|dedicated union/u,
  );

  const missingAndSurplus = mutableDedicatedGroupManifests();
  missingAndSurplus[6].labIds[0] = "surplus-dedicated-lab";
  assert.throws(
    () =>
      buildChinaVisualizationReleasePartition({
        catalogLabIds,
        dedicatedGroupManifests: missingAndSurplus,
      }),
    /missing from the catalog|generic partition must contain 301|surplus/u,
  );

  const reorderedGroups = mutableDedicatedGroupManifests();
  [reorderedGroups[0], reorderedGroups[1]] = [
    reorderedGroups[1],
    reorderedGroups[0],
  ];
  assert.throws(
    () =>
      buildChinaVisualizationReleasePartition({
        catalogLabIds,
        dedicatedGroupManifests: reorderedGroups,
      }),
    /dedicated group IDs must be exactly G01, G02, G03, G04, G05, G06, G07/u,
  );
});
