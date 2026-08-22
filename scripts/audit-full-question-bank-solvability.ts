import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildFullQuestionBankSolvabilityAudit,
  buildMainlandPepFullQuestionBankQaReport,
  fullQuestionBankAuditCsv,
  fullQuestionBankAuditMarkdown,
  mainlandPepFullQuestionBankQaCsv,
  mainlandPepFullQuestionBankQaMarkdown
} from "../lib/questionBankSolvability";

function hongKongDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

const reportDate = process.argv[2] ?? hongKongDate();
const outputDir = join(process.cwd(), "coordination", "content-qa");
const baseName = `${reportDate}-S18-full-question-bank-solvability-audit`;
const report = buildFullQuestionBankSolvabilityAudit(reportDate);
const mainlandPepBaseName = `${reportDate}-S18-mainland-pep-full-question-bank-qa`;
const mainlandPepReport = buildMainlandPepFullQuestionBankQaReport(reportDate);

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, `${baseName}.md`), fullQuestionBankAuditMarkdown(report));
writeFileSync(join(outputDir, `${baseName}.json`), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(outputDir, `${baseName}.csv`), `${fullQuestionBankAuditCsv(report)}\n`);
writeFileSync(join(outputDir, `${mainlandPepBaseName}.md`), mainlandPepFullQuestionBankQaMarkdown(mainlandPepReport));
writeFileSync(join(outputDir, `${mainlandPepBaseName}.json`), `${JSON.stringify(mainlandPepReport, null, 2)}\n`);
writeFileSync(join(outputDir, `${mainlandPepBaseName}.csv`), `${mainlandPepFullQuestionBankQaCsv(mainlandPepReport)}\n`);

const summary = {
  totalQuestions: report.summary.totalQuestions,
  hkQuestions: report.summary.hkQuestions,
  mainlandPepPrimaryQuestions: report.summary.mainlandPepPrimaryQuestions,
  mainlandPepJuniorQuestions: report.summary.mainlandPepJuniorQuestions,
  mainlandPepHighQuestions: report.summary.mainlandPepHighQuestions,
  mainlandHjbHighQuestions: report.summary.mainlandHjbHighQuestions,
  passRows: report.summary.passRows,
  failingRows: report.summary.failingRows,
  reviewOnlyCuratedAnswers: report.summary.reviewOnlyCuratedAnswers,
  invalidCuratedAnswers: report.summary.invalidCuratedAnswers,
  statusCounts: report.summary.statusCounts,
  mainlandPepQa: {
    totalQuestions: mainlandPepReport.summary.totalQuestions,
    expectedQuestions: mainlandPepReport.summary.expectedQuestions,
    passRows: mainlandPepReport.summary.passRows,
    reviewRows: mainlandPepReport.summary.reviewRows,
    p0Rows: mainlandPepReport.summary.p0Rows,
    p1Rows: mainlandPepReport.summary.p1Rows,
    p2Rows: mainlandPepReport.summary.p2Rows,
    inventoryIssueCount: mainlandPepReport.summary.inventoryIssueCount,
    manualReviewQueueRows: mainlandPepReport.summary.manualReviewQueueRows,
    sourceStatusCounts: mainlandPepReport.summary.sourceStatusCounts
  }
};

console.log(JSON.stringify(summary, null, 2));

if (report.failingRows.length > 0) {
  console.error(`Full question-bank audit failed with ${report.failingRows.length} non-pass rows.`);
  process.exitCode = 1;
}

if (mainlandPepReport.inventoryIssues.length > 0 || mainlandPepReport.reviewRows.length > 0) {
  console.error(
    `Mainland PEP full question-bank QA requires attention: ${mainlandPepReport.inventoryIssues.length} inventory issues and ${mainlandPepReport.reviewRows.length} review rows.`
  );
  process.exitCode = 1;
}
