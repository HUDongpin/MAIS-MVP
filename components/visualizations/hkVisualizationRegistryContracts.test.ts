import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  HK_DEDICATED_LAB_IDS,
  HK_DEDICATED_LAB_ID_SET,
  HK_PASS_THROUGH_LAB_IDS,
  HK_PASS_THROUGH_LAB_ID_SET,
  HK_PRIMARY_DEDICATED_LAB_IDS,
  HK_PRIMARY_DEDICATED_LAB_ID_SET,
  HK_SECONDARY_DEDICATED_LAB_IDS,
  HK_SECONDARY_DEDICATED_LAB_ID_SET,
  HK_VISUALIZATION_LAB_IDS,
  HK_VISUALIZATION_LAB_ID_SET,
  HK_VISUALIZATION_LAB_REGISTRY_COUNTS,
  hkVisualizationLabRegistryKind,
  isHKDedicatedLabId,
  isHKPassThroughLabId,
  isHKPrimaryDedicatedLabId,
  isHKSecondaryDedicatedLabId,
  isHKVisualizationLabId
} from "./hk/hkVisualizationLabRegistry";

const dispatcherSourcePath = "components/visualizations/hk/HKVisualizationLab.tsx";
const dispatcherSource = fs.readFileSync(dispatcherSourcePath, "utf8");

const registryPartitions: ReadonlyArray<{
  label: string;
  ids: readonly string[];
  idSet: ReadonlySet<string>;
}> = [
  {
    label: "primary dedicated",
    ids: HK_PRIMARY_DEDICATED_LAB_IDS,
    idSet: HK_PRIMARY_DEDICATED_LAB_ID_SET as ReadonlySet<string>
  },
  {
    label: "secondary dedicated",
    ids: HK_SECONDARY_DEDICATED_LAB_IDS,
    idSet: HK_SECONDARY_DEDICATED_LAB_ID_SET as ReadonlySet<string>
  },
  {
    label: "pass-through",
    ids: HK_PASS_THROUGH_LAB_IDS,
    idSet: HK_PASS_THROUGH_LAB_ID_SET as ReadonlySet<string>
  },
  {
    label: "all dedicated",
    ids: HK_DEDICATED_LAB_IDS,
    idSet: HK_DEDICATED_LAB_ID_SET as ReadonlySet<string>
  },
  {
    label: "full HK catalog",
    ids: HK_VISUALIZATION_LAB_IDS,
    idSet: HK_VISUALIZATION_LAB_ID_SET as ReadonlySet<string>
  }
];

function intersection(left: readonly string[], right: readonly string[]) {
  const rightSet = new Set(right);
  return left.filter((labId) => rightSet.has(labId));
}

function sourceSlice(startMarker: string, endMarker?: string) {
  const start = dispatcherSource.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing dispatcher marker: ${startMarker}`);

  if (!endMarker) return dispatcherSource.slice(start);
  const end = dispatcherSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing dispatcher marker after ${startMarker}: ${endMarker}`);
  return dispatcherSource.slice(start, end);
}

test("HK registry freezes an exact 22 + 22 + 7 partition of 51 unique labs", () => {
  assert.deepEqual(HK_VISUALIZATION_LAB_REGISTRY_COUNTS, {
    primaryDedicated: 22,
    secondaryDedicated: 22,
    dedicated: 44,
    passThrough: 7,
    total: 51
  });
  assert.ok(Object.isFrozen(HK_VISUALIZATION_LAB_REGISTRY_COUNTS));

  assert.equal(HK_PRIMARY_DEDICATED_LAB_IDS.length, 22);
  assert.equal(HK_SECONDARY_DEDICATED_LAB_IDS.length, 22);
  assert.equal(HK_DEDICATED_LAB_IDS.length, 44);
  assert.equal(HK_PASS_THROUGH_LAB_IDS.length, 7);
  assert.equal(HK_VISUALIZATION_LAB_IDS.length, 51);

  for (const [label, ids] of [
    ["primary dedicated", HK_PRIMARY_DEDICATED_LAB_IDS],
    ["secondary dedicated", HK_SECONDARY_DEDICATED_LAB_IDS],
    ["all dedicated", HK_DEDICATED_LAB_IDS],
    ["pass-through", HK_PASS_THROUGH_LAB_IDS],
    ["full HK catalog", HK_VISUALIZATION_LAB_IDS]
  ] as const) {
    assert.ok(Object.isFrozen(ids), `${label} tuple must be frozen.`);
    assert.equal(new Set(ids).size, ids.length, `${label} tuple must not contain duplicates.`);
  }

  assert.deepEqual(intersection(HK_PRIMARY_DEDICATED_LAB_IDS, HK_SECONDARY_DEDICATED_LAB_IDS), []);
  assert.deepEqual(intersection(HK_PRIMARY_DEDICATED_LAB_IDS, HK_PASS_THROUGH_LAB_IDS), []);
  assert.deepEqual(intersection(HK_SECONDARY_DEDICATED_LAB_IDS, HK_PASS_THROUGH_LAB_IDS), []);
  assert.deepEqual(
    [...HK_DEDICATED_LAB_IDS],
    [...HK_PRIMARY_DEDICATED_LAB_IDS, ...HK_SECONDARY_DEDICATED_LAB_IDS]
  );
  assert.deepEqual(
    [...HK_VISUALIZATION_LAB_IDS],
    [...HK_DEDICATED_LAB_IDS, ...HK_PASS_THROUGH_LAB_IDS]
  );
});

test("HK registry exposes immutable ReadonlySet facades with exact iteration", () => {
  for (const { label, ids, idSet } of registryPartitions) {
    const publicSurface = idSet as unknown as Record<string, unknown>;

    assert.ok(Object.isFrozen(idSet), `${label} set facade must be frozen.`);
    assert.equal(publicSurface.add, undefined, `${label} must not expose add().`);
    assert.equal(publicSurface.delete, undefined, `${label} must not expose delete().`);
    assert.equal(publicSurface.clear, undefined, `${label} must not expose clear().`);
    assert.equal(idSet.size, ids.length);
    assert.deepEqual([...idSet], [...ids]);
    assert.deepEqual([...idSet.keys()], [...ids]);
    assert.deepEqual([...idSet.values()], [...ids]);
    assert.deepEqual([...idSet.entries()], ids.map((labId) => [labId, labId]));

    const forEachValues: string[] = [];
    idSet.forEach((value, valueAgain, callbackSet) => {
      assert.equal(valueAgain, value);
      assert.equal(callbackSet, idSet);
      forEachValues.push(value);
    });
    assert.deepEqual(forEachValues, [...ids]);

    const first = ids[0];
    const external = new Set([first, "__registry-contract-extra__"]);
    assert.deepEqual([...idSet.union(external)], [...ids, "__registry-contract-extra__"]);
    assert.deepEqual([...idSet.intersection(external)], [first]);
    assert.deepEqual([...idSet.difference(external)], ids.slice(1));
    assert.deepEqual(
      [...idSet.symmetricDifference(external)],
      [...ids.slice(1), "__registry-contract-extra__"]
    );
    assert.equal(idSet.isSubsetOf(new Set(ids)), true);
    assert.equal(idSet.isSubsetOf(new Set(ids.slice(1))), false);
    assert.equal(idSet.isSupersetOf(new Set([first])), true);
    assert.equal(idSet.isSupersetOf(external), false);
    assert.equal(idSet.isDisjointFrom(new Set(["__registry-contract-extra__"])), true);
    assert.equal(idSet.isDisjointFrom(new Set([first])), false);
  }
});

test("old and superseding secondary ids remain dedicated together", () => {
  const requiredSecondaryIds = [
    "quadratic-patterns",
    "circles",
    "identities-square-patterns",
    "arc-length-sector-area"
  ] as const;

  for (const labId of requiredSecondaryIds) {
    assert.ok(isHKSecondaryDedicatedLabId(labId), `${labId} must be secondary dedicated.`);
    assert.ok(isHKDedicatedLabId(labId));
    assert.ok(isHKVisualizationLabId(labId));
    assert.equal(isHKPrimaryDedicatedLabId(labId), false);
    assert.equal(isHKPassThroughLabId(labId), false);
    assert.equal(hkVisualizationLabRegistryKind(labId), "secondary-dedicated");
  }
});

test("registry kind and type guards agree for every partition", () => {
  for (const labId of HK_PRIMARY_DEDICATED_LAB_IDS) {
    assert.ok(isHKPrimaryDedicatedLabId(labId));
    assert.equal(isHKSecondaryDedicatedLabId(labId), false);
    assert.equal(isHKPassThroughLabId(labId), false);
    assert.ok(isHKDedicatedLabId(labId));
    assert.ok(isHKVisualizationLabId(labId));
    assert.equal(hkVisualizationLabRegistryKind(labId), "primary-dedicated");
  }

  for (const labId of HK_SECONDARY_DEDICATED_LAB_IDS) {
    assert.equal(isHKPrimaryDedicatedLabId(labId), false);
    assert.ok(isHKSecondaryDedicatedLabId(labId));
    assert.equal(isHKPassThroughLabId(labId), false);
    assert.ok(isHKDedicatedLabId(labId));
    assert.ok(isHKVisualizationLabId(labId));
    assert.equal(hkVisualizationLabRegistryKind(labId), "secondary-dedicated");
  }

  for (const labId of HK_PASS_THROUGH_LAB_IDS) {
    assert.equal(isHKPrimaryDedicatedLabId(labId), false);
    assert.equal(isHKSecondaryDedicatedLabId(labId), false);
    assert.ok(isHKPassThroughLabId(labId));
    assert.equal(isHKDedicatedLabId(labId), false);
    assert.ok(isHKVisualizationLabId(labId));
    assert.equal(hkVisualizationLabRegistryKind(labId), "pass-through");
  }

  for (const unknownLabId of ["", "not-a-hk-lab", "identities_square_patterns"]) {
    assert.equal(isHKPrimaryDedicatedLabId(unknownLabId), false);
    assert.equal(isHKSecondaryDedicatedLabId(unknownLabId), false);
    assert.equal(isHKPassThroughLabId(unknownLabId), false);
    assert.equal(isHKDedicatedLabId(unknownLabId), false);
    assert.equal(isHKVisualizationLabId(unknownLabId), false);
    assert.equal(hkVisualizationLabRegistryKind(unknownLabId), null);
  }
});

test("HK dispatcher is a client-only split point with two independent dynamic chunks", () => {
  const primaryChunk = sourceSlice(
    "const DynamicHKPrimaryVisualizationLab",
    "const DynamicHKSecondaryVisualizationLab"
  );
  const secondaryChunk = sourceSlice(
    "const DynamicHKSecondaryVisualizationLab",
    "export function HKVisualizationLab"
  );

  assert.match(dispatcherSource, /^"use client";/);
  assert.match(dispatcherSource, /import dynamic from "next\/dynamic";/);
  assert.equal((dispatcherSource.match(/dynamic<HKVisualizationLabProps>\(/g) ?? []).length, 2);
  assert.equal((dispatcherSource.match(/ssr:\s*false/g) ?? []).length, 2);

  assert.match(primaryChunk, /import\("\.\/HKPrimaryVisualizationLab"\)/);
  assert.match(primaryChunk, /module\.HKPrimaryVisualizationLab/);
  assert.match(primaryChunk, /loading:\s*\(\) => <HKVisualizationLoadingState chunk="primary" \/>/);
  assert.match(primaryChunk, /ssr:\s*false/);

  assert.match(secondaryChunk, /import\("\.\/HKSecondaryVisualizationLab"\)/);
  assert.match(secondaryChunk, /module\.HKSecondaryVisualizationLab/);
  assert.match(secondaryChunk, /loading:\s*\(\) => <HKVisualizationLoadingState chunk="secondary" \/>/);
  assert.match(secondaryChunk, /ssr:\s*false/);

  assert.doesNotMatch(
    dispatcherSource,
    /\bfrom\s+["']\.\/HK(?:Primary|Secondary)VisualizationLab["']/,
    "Dedicated model implementations must not be statically imported."
  );
  assert.doesNotMatch(
    dispatcherSource,
    /^\s*import\s+["']\.\/HK(?:Primary|Secondary)VisualizationLab["'];?/m,
    "Dedicated model implementations must not be imported for side effects."
  );
});

test("HK dispatcher rejects non-HK and lets all pass-through ids fall through to null", () => {
  const dispatcher = sourceSlice("export function HKVisualizationLab");

  assert.match(dispatcher, /if \(lab\.curriculumTrack !== "HK"\) return null;/);
  assert.match(dispatcher, /if \(isHKPrimaryDedicatedLabId\(lab\.labId\)\)/);
  assert.match(dispatcher, /if \(isHKSecondaryDedicatedLabId\(lab\.labId\)\)/);
  assert.doesNotMatch(dispatcher, /isHKPassThroughLabId/);
  assert.match(dispatcher, /\n\s*return null;\s*\n}/);

  for (const labId of HK_PASS_THROUGH_LAB_IDS) {
    assert.equal(isHKPrimaryDedicatedLabId(labId), false);
    assert.equal(isHKSecondaryDedicatedLabId(labId), false);
  }
});

test("HK dispatcher keeps stable loading and routed selectors with localized copy", () => {
  assert.match(dispatcherSource, /data-hk-viz-dispatcher-state="loading"/);
  assert.match(dispatcherSource, /data-hk-viz-dispatcher-target=\{chunk\}/);
  assert.match(dispatcherSource, /data-hk-viz-dispatcher="v1"/);
  assert.match(dispatcherSource, /data-hk-viz-dispatcher-target="primary"/);
  assert.match(dispatcherSource, /data-hk-viz-dispatcher-target="secondary"/);
  assert.match(dispatcherSource, /data-hk-viz-dispatcher-lab-id=\{lab\.labId\}/);
  assert.match(dispatcherSource, /role="status"/);
  assert.match(dispatcherSource, /aria-live="polite"/);
  assert.match(dispatcherSource, /aria-busy="true"/);

  assert.match(dispatcherSource, /en: "Preparing the Hong Kong primary mathematics visualization…"/);
  assert.match(dispatcherSource, /zh: "正在準備香港小學數學視覺化模型……"/);
  assert.match(dispatcherSource, /zhHans: "正在准备香港小学数学可视化模型……"/);
  assert.match(dispatcherSource, /en: "Preparing the Hong Kong secondary mathematics visualization…"/);
  assert.match(dispatcherSource, /zh: "正在準備香港中學數學視覺化模型……"/);
  assert.match(dispatcherSource, /zhHans: "正在准备香港中学数学可视化模型……"/);
  assert.match(dispatcherSource, /en: "Loading the interactive controls and mathematical canvas\."/);
  assert.match(dispatcherSource, /zh: "正在載入互動控制與數學畫布。"/);
  assert.match(dispatcherSource, /zhHans: "正在加载互动控件与数学画布。"/);
});
