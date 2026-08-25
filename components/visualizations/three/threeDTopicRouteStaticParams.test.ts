import assert from "node:assert/strict";
import test from "node:test";
import { premiumThreeDLaunchLabIds } from "./threeDSceneMath";

test("premium Three.js topic route static params import without the live visualization catalog", async () => {
  const routeModule = await import("../../../app/student/tools/visualizations/[labId]/page");
  const params = routeModule.generateStaticParams();
  const labIds = params.map((param: { labId: string }) => param.labId);

  // 80 -> 68 on 2026-08-25: California premium-3D topics retired (Codex-lab
  // replacement plan Phase 2a); their URLs now redirect to the hub.
  assert.equal(params.length, 68);
  assert.deepEqual(new Set(labIds), premiumThreeDLaunchLabIds);
});
