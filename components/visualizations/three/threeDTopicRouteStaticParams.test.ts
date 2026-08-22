import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildPremiumThreeDTopicStaticParams,
  premiumThreeDDirectLabIds
} from "../premiumThreeDDirectLabs";

test("premium Three.js topic route static params import without the live visualization catalog", async () => {
  const routeModule = await import("../../../app/student/tools/visualizations/[labId]/page");
  const params = routeModule.generateStaticParams();
  const labIds = params.map((param: { labId: string }) => param.labId);

  assert.deepEqual(params, buildPremiumThreeDTopicStaticParams());
  assert.deepEqual(labIds, [...premiumThreeDDirectLabIds]);
  assert.equal(new Set(labIds).size, labIds.length);
});

test("premium topic route rejects parameters outside the generated live registry", () => {
  const routeSource = fs.readFileSync("app/student/tools/visualizations/[labId]/page.tsx", "utf8");

  assert.match(routeSource, /export const dynamicParams = false/);
  assert.match(routeSource, /buildPremiumThreeDTopicStaticParams/);
  assert.doesNotMatch(routeSource, /from "@\/components\/visualizations\/three\/threeDSceneMath"/);
});
