#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const reviewDir = path.join(__dirname, "review");
const reviewPage = path.join(reviewDir, "index.html");
const screenshotPath = path.join(reviewDir, "s11-candidate-preview-smoke.png");
const reviewPageLabel = path.relative(repoRoot, reviewPage).split(path.sep).join("/");
const screenshotPathLabel = path.relative(repoRoot, screenshotPath).split(path.sep).join("/");
const reviewPageNavigationUrl = pathToFileURL(reviewPage).href;
const repoRootFileUrl = pathToFileURL(`${repoRoot}${path.sep}`).href;
const homeDir = os.homedir();
const homeDirFileUrl = pathToFileURL(`${homeDir}${path.sep}`).href;
const jsonReportPath = path.join(__dirname, "s11-candidate-preview-smoke.json");
const mdReportPath = path.join(__dirname, "s11-candidate-preview-smoke.md");

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sanitizePersistedMessage(value) {
  return String(value)
    .replaceAll(reviewPageNavigationUrl, reviewPageLabel)
    .replaceAll(reviewPage, reviewPageLabel)
    .replaceAll(screenshotPath, screenshotPathLabel)
    .replaceAll(repoRootFileUrl, "")
    .replaceAll(`${repoRoot}${path.sep}`, "")
    .replaceAll(homeDirFileUrl, "<home>/")
    .replaceAll(`${homeDir}${path.sep}`, "<home>/");
}

function writeMarkdown(report) {
  fs.writeFileSync(mdReportPath, `# S11 Candidate Preview Browser Smoke

Date: 2026-06-19

Owner: S11 QA and release quality

Surface: static candidate review page

Status: ${report.status}

## Command

\`node coordination/content-qa/us-ca-math-rag-v2-candidate/run-s11-candidate-preview-smoke.mjs\`

## Evidence

- URL: \`${report.url}\`
- Viewport: ${report.viewport.width}x${report.viewport.height}
- Practice cards: ${report.practiceCards}
- Lesson cards: ${report.lessonCards}
- Console errors: ${report.consoleErrors.length}
- Page errors: ${report.pageErrors.length}
- Screenshot: \`${report.screenshotPath}\`

## Boundary

This is a browser smoke of the static candidate review page only. It does not prove live app practice/lesson route integration. S11 live regression remains required after S23 defines an integrated candidate surface.
`);
}

async function main() {
  if (!fs.existsSync(reviewPage)) {
    throw new Error(`Review page not found: ${reviewPageLabel}. Run build-s11-candidate-review-page.mjs first.`);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(sanitizePersistedMessage(message.text()));
  });
  page.on("pageerror", (error) => pageErrors.push(sanitizePersistedMessage(error.message)));

  await page.goto(reviewPageNavigationUrl);
  await page.getByRole("heading", { name: "California Math RAG v2 Candidate Review" }).waitFor();
  await page.getByText("Candidate-only / Not live").waitFor();
  await page.getByText("Questions: 68; Lessons: 68; S18 automated validation: pass.").waitFor();

  const practiceCards = await page.locator('[data-kind="practice"]').count();
  const lessonCards = await page.locator('[data-kind="lesson"]').count();
  if (practiceCards !== 2) throw new Error(`Expected 2 practice cards, found ${practiceCards}`);
  if (lessonCards !== 2) throw new Error(`Expected 2 lesson cards, found ${lessonCards}`);

  await page.screenshot({ path: screenshotPath, fullPage: true });
  await browser.close();

  const report = {
    status: consoleErrors.length || pageErrors.length ? "warn" : "pass",
    url: reviewPageLabel,
    viewport: { width: 1280, height: 900 },
    practiceCards,
    lessonCards,
    consoleErrors,
    pageErrors,
    screenshotPath: screenshotPathLabel,
    liveAppRegression: false,
    boundary: "Static candidate preview only; live app regression remains pending after integration."
  };

  writeJson(jsonReportPath, report);
  writeMarkdown(report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.status === "pass" ? 0 : 1);
}

main().catch((error) => {
  const report = {
    status: "fail",
    error: sanitizePersistedMessage(error.message),
    liveAppRegression: false,
    boundary: "Static candidate preview only; live app regression remains pending after integration."
  };
  writeJson(jsonReportPath, report);
  console.error(error);
  process.exit(1);
});
