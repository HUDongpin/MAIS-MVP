import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildMainlandHighRagV4PublicSolvabilityAudit,
  mainlandHighRagV4PublicSolvabilityAuditCsv,
  mainlandHighRagV4PublicSolvabilityAuditMarkdown
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
const baseName = `${reportDate}-S18-mainland-high-rag-v4-public-solvability-audit`;
// RAG-v4 has been promoted from candidate to public; keep this legacy entrypoint compile-safe.
const report = buildMainlandHighRagV4PublicSolvabilityAudit(reportDate);

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, `${baseName}.md`), mainlandHighRagV4PublicSolvabilityAuditMarkdown(report));
writeFileSync(join(outputDir, `${baseName}.json`), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(outputDir, `${baseName}.csv`), `${mainlandHighRagV4PublicSolvabilityAuditCsv(report)}\n`);

const summary = {
  totalQuestions: report.summary.totalQuestions,
  expectedQuestions: report.summary.expectedQuestions,
  publicIntegrated: report.summary.publicIntegrated,
  publicMainlandPepHighQuestions: report.summary.publicMainlandPepHighQuestions,
  gradeCounts: report.summary.gradeCounts,
  passRows: report.summary.passRows,
  failingRows: report.summary.failingRows,
  duplicateIdCount: report.summary.duplicateIdCount,
  duplicateExactPromptCount: report.summary.duplicateExactPromptCount,
  statusCounts: report.summary.statusCounts,
  inventoryIssues: report.inventoryIssues
};

console.log(JSON.stringify(summary, null, 2));

if (report.failingRows.length > 0 || report.inventoryIssues.length > 0) {
  console.error(
    `RAG-v4 public solvability audit failed with ${report.failingRows.length} non-pass rows and ${report.inventoryIssues.length} inventory issues.`
  );
  process.exitCode = 1;
}
