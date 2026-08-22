import assert from "node:assert/strict";
import test from "node:test";
import { visualizationLabCatalog } from "../../../data/visualizationLabs";

test("premium Three.js topic route static params equal the catalog-authoritative live premium set", async () => {
  const routeModule = await import("../../../app/student/tools/visualizations/[labId]/page");
  const params = routeModule.generateStaticParams();
  const labIds = params.map((param: { labId: string }) => param.labId);
  const livePremiumLabIds = visualizationLabCatalog
    .filter((lab) => lab.threeD?.enabled === true && lab.threeD.premiumLaunch === true)
    .map((lab) => lab.labId);

  assert.equal(params.length, 24);
  assert.deepEqual(labIds, livePremiumLabIds);
});
