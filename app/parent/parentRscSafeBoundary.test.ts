import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function source(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("parent server pages project raw persistence models before crossing into client components", async () => {
  const [foundation, childPage, reportsPage, noticesPage] = await Promise.all([
    source("app/parent/getParentFoundation.ts"),
    source("app/parent/children/[studentId]/page.tsx"),
    source("app/parent/reports/page.tsx"),
    source("app/parent/notices/page.tsx")
  ]);

  assert.match(foundation, /toParentFoundationSafeData/);
  assert.match(foundation, /return toParentFoundationSafeData\(foundation\)/);

  assert.match(childPage, /toParentChildSummarySafe/);
  assert.match(childPage, /const safeChild = toParentChildSummarySafe\(child\)/);
  assert.match(childPage, /<ParentChildDetail child=\{safeChild\}/);

  assert.match(reportsPage, /toParentReportDataSafe/);
  assert.match(reportsPage, /const safeData = toParentReportDataSafe\(data\)/);
  assert.match(reportsPage, /<ParentReportsView data=\{safeData\}/);

  assert.match(noticesPage, /toParentNoticeDataSafe/);
  assert.match(noticesPage, /const safeData = toParentNoticeDataSafe\(data\)/);
  assert.match(noticesPage, /<ParentNoticesView data=\{safeData\}/);
});

test("non-message parent client props accept only parent-safe DTO types", async () => {
  const [shell, views, notices, motivation] = await Promise.all([
    source("components/parent/ParentShell.tsx"),
    source("components/parent/ParentViews.tsx"),
    source("components/parent/ParentNoticesView.tsx"),
    source("components/gamification/ParentMotivationSummary.tsx")
  ]);

  assert.match(shell, /ParentIdentitySafe/);
  assert.match(shell, /ParentChildSummarySafe/);
  assert.doesNotMatch(shell, /\b(?:StudentSession|ParentChildSummary)\b/);

  for (const safeType of ["ParentChildSummarySafe", "ParentFoundationSafeData", "ParentReportSafeData", "ParentReportSafe"]) {
    assert.match(views, new RegExp(`\\b${safeType}\\b`));
  }
  assert.match(views, /\bParentMessagesData\b/, "Messages keeps its existing A08-owned model for now");
  assert.doesNotMatch(views, /\b(?:ParentChildSummary|ParentFoundationData|ParentReportData|TeacherReport)\b/);

  assert.match(notices, /ParentNoticeSafeData/);
  assert.match(notices, /ParentNoticeRecipientSafe/);
  assert.doesNotMatch(notices, /\b(?:ParentNoticeData|TeacherNoticeRecipient)\b/);

  assert.match(motivation, /ParentMotivationSummarySafe/);
  assert.doesNotMatch(motivation, /\bGamificationSummary\b/);
});
