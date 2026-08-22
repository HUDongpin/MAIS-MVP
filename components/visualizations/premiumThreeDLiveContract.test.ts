import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  premiumThreeDDirectCatalogSnapshot,
  premiumThreeDDirectLabIds
} from "./generated/premiumThreeDDirectCatalog.generated";
import {
  isLivePremiumThreeDMetadata,
  projectPremiumThreeDDirectLab
} from "./three/premiumThreeDLiveContract";
import { visualizationLabCatalog } from "../../data/visualizationLabs";

const metadataBase = {
  coverageTier: "premium-3d" as const,
  fallbackTemplateId: "function-family" as const,
  familyId: "three-function-family" as const
};

test("premium direct-route eligibility requires enabled and premiumLaunch together", () => {
  assert.equal(isLivePremiumThreeDMetadata({ ...metadataBase, enabled: true, premiumLaunch: true }), true);
  assert.equal(isLivePremiumThreeDMetadata({ ...metadataBase, enabled: true, premiumLaunch: false }), false);
  assert.equal(isLivePremiumThreeDMetadata({ ...metadataBase, enabled: false, premiumLaunch: true }), false);
  assert.equal(isLivePremiumThreeDMetadata({ ...metadataBase, enabled: false, premiumLaunch: false }), false);
  assert.equal(isLivePremiumThreeDMetadata(undefined), false);
});

test("premium direct projection preserves every catalog field and changes only moduleId", () => {
  const catalogLab = {
    analyticsSource: "catalog",
    displayDisambiguator: { en: "Lower volume", zh: "下冊", zhHans: "下册" },
    labId: "fixture-live-lab",
    moduleId: "signature-lab",
    safeguard: { en: "Use the model carefully.", zh: "請小心使用模型。", zhHans: "请小心使用模型。" },
    studentNote: { en: "Compare both views.", zh: "比較兩種視圖。", zhHans: "比较两种视图。" },
    textbookPlacement: { semester: "lower" as const, volume: "2" },
    threeD: { ...metadataBase, enabled: true, premiumLaunch: true }
  } as const;

  const projected = projectPremiumThreeDDirectLab(catalogLab);

  assert.deepEqual(projected, {
    ...catalogLab,
    moduleId: "configured-visualization-lab"
  });
  assert.equal(catalogLab.moduleId, "signature-lab", "projection must not mutate the catalog entry");
});

test("generated live premium IDs equal the final catalog live set", () => {
  const catalogIds = visualizationLabCatalog
    .filter((lab) => isLivePremiumThreeDMetadata(lab.threeD))
    .map((lab) => lab.labId)
    .sort();

  assert.deepEqual([...premiumThreeDDirectLabIds].sort(), catalogIds);
  assert.deepEqual(Object.keys(premiumThreeDDirectCatalogSnapshot).sort(), catalogIds);
});

test("generated premium direct metadata snapshot is current", () => {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/generate-premium-three-d-direct-catalog-snapshot.mts", "--check"],
    { cwd: process.cwd(), encoding: "utf8" }
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
