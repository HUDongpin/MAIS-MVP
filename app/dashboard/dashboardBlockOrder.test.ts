import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(join(process.cwd(), "app/dashboard/page.tsx"), "utf8");

test("student dashboard keeps the recommended block order", () => {
  const gradeContext = source.indexOf("<DashboardGradeSelectorGrid />");
  const assignedWork = source.indexOf('aria-labelledby="dashboard-assignments-heading"');
  const motivationHub = source.indexOf("<StudentMotivationHub />");
  const recommendations = source.indexOf("<DashboardNextStepPanel />");
  const rewards = source.indexOf("<StudentRewardsPanel />");
  const explore = source.indexOf('aria-labelledby="dashboard-explore-heading"');

  assert.ok(gradeContext > -1, "Greeting block should keep the grade selector grid.");
  assert.ok(assignedWork > gradeContext, "Teacher-assigned work should follow the greeting and grade context.");
  assert.ok(motivationHub > assignedWork, "Growth track should follow teacher-assigned work.");
  assert.ok(recommendations > motivationHub, "Personalized recommendations should follow the growth track.");
  assert.ok(rewards > recommendations, "Rewards should follow personalized recommendations.");
  assert.ok(explore > rewards, "Analytics and galaxy entry points should close the dashboard.");
});

test("teacher-assigned work block carries counts, due dates, CTAs, and an empty state", () => {
  const assignedWork = source.indexOf('aria-labelledby="dashboard-assignments-heading"');
  const emptyState = source.indexOf("Nothing assigned right now", assignedWork);
  const motivationHub = source.indexOf("<StudentMotivationHub />");

  assert.ok(source.includes("${openAssignments.length} to do"), "Assigned work should show an open-task count.");
  assert.ok(source.includes("${overdueAssignmentCount} overdue"), "Assigned work should surface overdue work.");
  assert.ok(source.includes("${dueSoonAssignmentCount} due within 2 days"), "Assigned work should surface work due soon.");
  assert.ok(source.includes("<AssignmentDueBadge"), "Assignment cards should render a due-date badge.");
  assert.ok(source.includes("View all ${visibleAssignments.length} assignments"), "The block should link to the full assignment list.");
  assert.ok(source.includes('{t({ en: "Open task"'), "Assignment cards should carry an explicit open CTA.");
  assert.ok(emptyState > assignedWork && emptyState < motivationHub, "The empty state should live inside the assigned-work block.");
});
