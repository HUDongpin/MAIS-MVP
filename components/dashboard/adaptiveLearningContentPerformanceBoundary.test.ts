import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(join(process.cwd(), "components/dashboard/AdaptiveLearningContent.tsx"), "utf8");

test("personalized learning waits for the primary dashboard before secondary fetches", () => {
  const dashboardFetch = source.indexOf("fetch(`/api/dashboard?grade=${selectedGrade}`");
  const assignmentsFetch = source.indexOf('fetch("/api/assignments"');
  const adaptiveFetch = source.indexOf("fetch(`/api/adaptive-learning/next?grade=${selectedGrade}`");
  const assignmentsPrimaryGate = source.lastIndexOf("if (isLoading || loadError) return;", assignmentsFetch);
  const adaptivePrimaryGate = source.lastIndexOf("if (isLoading || loadError) {", adaptiveFetch);

  assert.notEqual(dashboardFetch, -1, "Personalized learning should keep a primary dashboard fetch.");
  assert.notEqual(assignmentsFetch, -1, "Personalized learning should still fetch assignments.");
  assert.notEqual(adaptiveFetch, -1, "Personalized learning should still fetch the adaptive route.");
  assert.ok(assignmentsPrimaryGate > dashboardFetch, "Assignments should wait for the primary dashboard request to settle.");
  assert.ok(assignmentsPrimaryGate < assignmentsFetch, "Assignments should be gated before their fetch starts.");
  assert.ok(adaptivePrimaryGate > assignmentsFetch, "Adaptive route loading should have its own primary-ready gate.");
  assert.ok(adaptivePrimaryGate < adaptiveFetch, "Adaptive route should be gated before its fetch starts.");
  assert.ok(source.includes("[currentUserRequestKey, isLoading, loadError, settingsReady]"));
  assert.ok(source.includes("[currentUserRequestKey, isLoading, loadError, selectedGrade, settingsReady]"));
});

test("personalized learning defers analytics and progress panels", () => {
  const secondaryTimer = source.indexOf("setTimeout(() => setLoadSecondaryPanels(true), 300)");
  const firstGate = source.indexOf("{loadSecondaryPanels ? (");
  const analyticsPanel = source.indexOf("<LearningAnalyticsReport", firstGate);
  const progressPanel = source.indexOf("<DashboardProgressDetails", analyticsPanel);

  assert.notEqual(secondaryTimer, -1, "Secondary panels should be delayed after the primary route opens.");
  assert.notEqual(firstGate, -1, "Secondary panels should render behind a load gate.");
  assert.ok(analyticsPanel > firstGate, "Learning analytics should be behind the secondary load gate.");
  assert.ok(progressPanel > analyticsPanel, "Progress details should also be behind the secondary load gate.");
});
