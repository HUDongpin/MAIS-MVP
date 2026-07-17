#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reviewDir = path.join(__dirname, "review");

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, fileName), "utf8"));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pickByCluster(items, clusterId) {
  const item = items.find((candidate) => candidate.clusterId === clusterId);
  if (!item) throw new Error(`Missing candidate for ${clusterId}`);
  return item;
}

function renderPracticeCard(item) {
  return `
    <article class="card" data-kind="practice" data-id="${escapeHtml(item.id)}">
      <p class="eyebrow">${escapeHtml(item.grade)} practice / ${escapeHtml(item.clusterId)}</p>
      <h2>${escapeHtml(item.domainTitle)}</h2>
      <p class="prompt">${escapeHtml(item.prompt.en)}</p>
      <p><strong>Answer:</strong> ${escapeHtml(item.answer)}</p>
      <p><strong>Why:</strong> ${escapeHtml(item.explanation.en)}</p>
      <p class="meta">${escapeHtml(item.standardIds.join(", "))}</p>
    </article>`;
}

function renderLessonCard(item) {
  return `
    <article class="card" data-kind="lesson" data-id="${escapeHtml(item.id)}">
      <p class="eyebrow">${escapeHtml(item.grade)} lesson / ${escapeHtml(item.clusterId)}</p>
      <h2>${escapeHtml(item.lessonModule.title)}</h2>
      <p><strong>Objective:</strong> ${escapeHtml(item.lessonModule.objective)}</p>
      <p><strong>Worked example:</strong> ${escapeHtml(item.lessonModule.workedExample.prompt)}</p>
      <p><strong>Reasoning:</strong> ${escapeHtml(item.lessonModule.workedExample.reasoning)}</p>
      <p class="meta">${escapeHtml(item.standardIds.join(", "))}</p>
    </article>`;
}

function main() {
  const questionPack = readJson("s04-question-candidate-pack.json");
  const lessonPack = readJson("s05-lesson-candidate-pack.json");
  const validation = readJson("s18-downstream-validation.json");

  const practiceCards = [
    pickByCluster(questionPack.questions, "K.CC.cardinality-compare"),
    pickByCluster(questionPack.questions, "6.RP.ratios")
  ];
  const lessonCards = [
    pickByCluster(lessonPack.lessons, "A-SSE.structure"),
    pickByCluster(lessonPack.lessons, "S-CP.probability")
  ];

  fs.mkdirSync(reviewDir, { recursive: true });
  fs.writeFileSync(path.join(reviewDir, "index.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>California Math RAG v2 Candidate Review</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #14213d;
      background: #f6f8fb;
    }
    body {
      margin: 0;
      padding: 32px;
    }
    main {
      max-width: 1120px;
      margin: 0 auto;
    }
    header {
      border-bottom: 2px solid #d9e2ec;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 32px;
      line-height: 1.15;
    }
    .status {
      display: inline-flex;
      gap: 8px;
      padding: 6px 10px;
      border: 1px solid #8bbf9f;
      background: #effaf3;
      border-radius: 6px;
      color: #17643a;
      font-weight: 700;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #d9e2ec;
      border-radius: 8px;
      padding: 18px;
      box-shadow: 0 10px 24px rgba(20, 33, 61, 0.08);
    }
    .eyebrow {
      margin: 0 0 10px;
      color: #5f6f89;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
    }
    h2 {
      margin: 0 0 12px;
      font-size: 20px;
      line-height: 1.25;
    }
    p {
      line-height: 1.55;
    }
    .prompt {
      font-size: 18px;
      color: #111827;
    }
    .meta {
      color: #52616f;
      font-size: 12px;
      overflow-wrap: anywhere;
    }
  </style>
</head>
<body>
<main>
  <header>
    <h1>California Math RAG v2 Candidate Review</h1>
    <p class="status">Candidate-only / Not live</p>
    <p>Questions: ${validation.questionCount}; Lessons: ${validation.lessonCount}; S18 automated validation: ${validation.status}.</p>
  </header>
  <section class="grid" aria-label="Representative candidate cards">
    ${practiceCards.map(renderPracticeCard).join("\n")}
    ${lessonCards.map(renderLessonCard).join("\n")}
  </section>
</main>
</body>
</html>
`);

  console.log(JSON.stringify({
    reviewPage: path.relative(process.cwd(), path.join(reviewDir, "index.html")),
    practiceCards: practiceCards.length,
    lessonCards: lessonCards.length
  }, null, 2));
}

main();
