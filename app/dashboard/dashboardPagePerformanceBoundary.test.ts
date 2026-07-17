import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(join(process.cwd(), "app/dashboard/page.tsx"), "utf8");

test("student dashboard waits for settings before primary fetches", () => {
  const settingsGuard = source.indexOf("if (!settingsReady)");
  const dashboardFetch = source.indexOf("fetch(`/api/dashboard?grade=${selectedGrade}`");
  const assignmentsFetch = source.indexOf('fetch("/api/assignments"');

  assert.notEqual(settingsGuard, -1, "Dashboard should guard data effects on settings readiness.");
  assert.ok(settingsGuard < dashboardFetch, "Dashboard data fetch should wait for settings readiness.");
  assert.ok(settingsGuard < assignmentsFetch, "Assignments fetch should wait for settings readiness.");
  assert.ok(source.includes("[currentUserRequestKey, loadErrorCopy, selectedGrade, settingsReady]"));
  assert.ok(source.includes("[currentUserRequestKey, settingsReady]"));
});

test("student dashboard defers secondary reward and motivation panels", () => {
  const secondaryTimer = source.indexOf("setTimeout(() => setLoadSecondaryPanels(true), 300)");
  const gatedRender = source.indexOf("{loadSecondaryPanels ? (");
  const motivationPanel = source.indexOf("<StudentMotivationHub />", gatedRender);
  const rewardsPanel = source.indexOf("<StudentRewardsPanel />", gatedRender);

  assert.notEqual(secondaryTimer, -1, "Secondary panels should be delayed after primary dashboard load.");
  assert.notEqual(gatedRender, -1, "Secondary panels should render behind a load gate.");
  assert.ok(motivationPanel > gatedRender, "Motivation panel should be behind the secondary load gate.");
  assert.ok(rewardsPanel > gatedRender, "Rewards panel should be behind the secondary load gate.");
});
