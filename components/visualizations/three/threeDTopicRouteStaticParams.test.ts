import assert from "node:assert/strict";
import test from "node:test";
import { premiumThreeDLaunchLabIds } from "./threeDSceneMath";

test("premium Three.js topic route static params import without the live visualization catalog", async () => {
  const routeModule = await import("../../../app/student/tools/visualizations/[labId]/page");
  const params = routeModule.generateStaticParams();
  const labIds = params.map((param: { labId: string }) => param.labId);

  // Static params are the exact live-only launch manifest. Held candidate
  // packages must fail closed instead of retaining direct topic pages.
  assert.equal(params.length, 42);
  assert.deepEqual(new Set(labIds), premiumThreeDLaunchLabIds);
});
