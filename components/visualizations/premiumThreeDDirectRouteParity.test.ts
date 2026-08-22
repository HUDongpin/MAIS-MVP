import assert from "node:assert/strict";
import test from "node:test";
import {
  hongKongSemanticallyVerifiedThreeDLabIds,
  hongKongThreeDCandidateLabIds,
  mainlandSemanticallyVerifiedThreeDLabIds,
  mainlandThreeDCandidateLabIds,
  visualizationLabCatalog
} from "../../data/visualizationLabs";
import { buildVisualizationLabHref } from "./visualizationDiagnostics";
import {
  buildPremiumThreeDDirectRouteStaticParams,
  getPremiumThreeDDirectLab,
  resolvePremiumThreeDDirectRoute
} from "./premiumThreeDDirectLabs";

function isLivePremiumThreeDLab(lab: (typeof visualizationLabCatalog)[number]) {
  return lab.threeD?.enabled === true && lab.threeD.premiumLaunch === true;
}

test("premium 3D direct-render eligibility is exactly the catalog-authoritative live premium set", () => {
  const livePremiumLabs = visualizationLabCatalog.filter(isLivePremiumThreeDLab);
  const directRenderableLabs = visualizationLabCatalog.filter((lab) => getPremiumThreeDDirectLab(lab.labId) !== null);

  assert.equal(visualizationLabCatalog.length, 691);
  assert.deepEqual(hongKongSemanticallyVerifiedThreeDLabIds, []);
  assert.deepEqual(mainlandSemanticallyVerifiedThreeDLabIds, []);
  assert.equal(livePremiumLabs.length, 24);
  assert.deepEqual(
    directRenderableLabs.map((lab) => lab.labId),
    livePremiumLabs.map((lab) => lab.labId),
    "Historical authoring candidates must not become live direct routes after the catalog downgrades them"
  );

  for (const lab of livePremiumLabs) {
    assert.strictEqual(
      getPremiumThreeDDirectLab(lab.labId),
      lab,
      `${lab.labId} must direct-render the exact catalog record rather than inferred authoring metadata`
    );
  }

  const downgradedRegionalCandidateIds = [...hongKongThreeDCandidateLabIds, ...mainlandThreeDCandidateLabIds];
  assert.ok(downgradedRegionalCandidateIds.length > 0, "The negative guard needs real downgraded candidate coverage");
  for (const labId of downgradedRegionalCandidateIds) {
    assert.equal(getPremiumThreeDDirectLab(labId), null, `${labId} must not direct-render while its verified allowlist is empty`);
  }
});

test("premium 3D direct-route resolution redirects downgraded catalog candidates and rejects unknown IDs", () => {
  const livePremiumLabs = visualizationLabCatalog.filter(isLivePremiumThreeDLab);
  const livePremiumLabIds = livePremiumLabs.map((lab) => lab.labId);

  assert.deepEqual(
    buildPremiumThreeDDirectRouteStaticParams().map((param) => param.labId),
    livePremiumLabIds,
    "Static direct routes must be generated from the live catalog, not the historical authoring manifest"
  );

  for (const lab of livePremiumLabs) {
    assert.deepEqual(resolvePremiumThreeDDirectRoute(lab.labId), { kind: "direct", lab });
  }

  for (const labId of [...hongKongThreeDCandidateLabIds, ...mainlandThreeDCandidateLabIds]) {
    const lab = visualizationLabCatalog.find((entry) => entry.labId === labId);
    assert.ok(lab);
    assert.deepEqual(resolvePremiumThreeDDirectRoute(labId), {
      href: buildVisualizationLabHref(lab),
      kind: "catalog-fallback",
      lab
    });
  }

  assert.deepEqual(resolvePremiumThreeDDirectRoute("not-a-catalog-lab"), { kind: "not-found" });
});
