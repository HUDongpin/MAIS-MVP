#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../../..");
const candidatesJsonPath = path.join(scriptDir, "gpt-image2-candidates.json");
const queuePath = path.join(scriptDir, "image2-generation-queue.jsonl");
const resultsPath = path.join(scriptDir, "image2-generation-results.json");
const manualReviewPath = path.join(scriptDir, "manual-review.csv");
const reviewDir = path.join(scriptDir, "review");
const reviewIndexPath = path.join(reviewDir, "index.html");
const approvedDir = path.join(scriptDir, "approved");
const candidatesDir = path.join(scriptDir, "candidates");
const approvedManifestPath = path.join(scriptDir, "approved-question-illustrations.json");

const model = "gpt-image-2";
const quality = "high";
const size = "1536x1024";
const outputFormat = "png";
const pilotPerType = 6;
const qaStatuses = ["pending", "approved", "needs-regenerate", "deterministic-redraw-needed", "rejected"];

const typeOrder = [
  "geometry-diagram",
  "coordinate-grid",
  "function-graph",
  "statistics-chart",
  "measurement-scene",
  "number-line"
];

const gradeOrder = new Map([
  ["S1", 1],
  ["S2", 2],
  ["S3", 3]
]);

const semesterOrder = new Map([
  ["upper", 1],
  ["lower", 2],
  ["full-year", 3]
]);

const typeGuidance = {
  "geometry-diagram": [
    "Create a clean original plane-geometry diagram with simple black/dark-blue strokes, labeled points, and minimal color highlights.",
    "Only include relationships explicitly stated in the prompt, such as parallel, perpendicular, angle, midpoint, tangent, radius, chord, arc, or similarity markings.",
    "Do not make the diagram look like a copied textbook figure; use fresh spacing and layout."
  ],
  "coordinate-grid": [
    "Create a clean coordinate grid with x-axis, y-axis, origin, unit gridlines, key points, and transformation arrows when needed.",
    "Use only coordinates and point labels stated in the prompt. Do not plot the final answer if the prompt asks students to find it.",
    "Keep tick labels sparse and legible; leave uncluttered space around labels."
  ],
  "function-graph": [
    "Create a clean function graph support visual with axes, curve/line shape, and only prompt-given points, intercepts, vertex, axis, or quadrant cues.",
    "Do not reveal final answers or computed features that are not given in the prompt.",
    "Use graph styling suitable for junior-secondary math: clear axes, thin gridlines, highlighted curve, no decorative background."
  ],
  "statistics-chart": [
    "Create a clean statistics chart or frequency-distribution visual from the prompt data.",
    "Use accurate categories, intervals, bars, or table-like grouping when the prompt supplies them.",
    "Do not add a conclusion or final statistic such as mean, mode, median, or answer text."
  ],
  "measurement-scene": [
    "Create a simple measurement-model scene with ground line, vertical object, sight lines, angle arcs, and distances that are explicitly given.",
    "Use schematic shapes rather than realistic school/site photos; avoid brands and real place identifiers.",
    "Do not compute or show the unknown height/distance answer."
  ],
  "number-line": [
    "Create a clean number-line or inequality-solution support diagram with endpoint markers and direction cues.",
    "Only include boundary values or interval information explicitly given in the prompt.",
    "Do not reveal the final solved interval if the prompt asks students to solve it."
  ]
};

const candidates = readCandidates();
const queueRows = buildQueue(candidates);
const existingResults = readJson(resultsPath, null);
const resultRows = normalizeResults(existingResults, queueRows);

fs.mkdirSync(reviewDir, { recursive: true });
fs.mkdirSync(candidatesDir, { recursive: true });
fs.mkdirSync(approvedDir, { recursive: true });

writeJsonl(queuePath, queueRows);
writeJson(resultsPath, {
  schemaVersion: "mainland-hjb-junior-image2-generation-results-v1",
  generatedAt: new Date().toISOString(),
  sourceQueue: path.relative(rootDir, queuePath),
  modelDefaults: { model, quality, size, outputFormat },
  totals: summarizeResults(resultRows),
  results: resultRows
});
writeManualReview(queueRows, resultRows);
writeReviewHtml(queueRows, resultRows);
writeApprovedManifestIfMissing();

console.log(JSON.stringify({
  queueRows: queueRows.length,
  pilotRows: queueRows.filter((row) => row.batchPhase === "pilot").length,
  fullRows: queueRows.filter((row) => row.batchPhase === "full").length,
  byType: countBy(queueRows, (row) => row.illustrationType),
  outputs: {
    queue: path.relative(rootDir, queuePath),
    results: path.relative(rootDir, resultsPath),
    manualReview: path.relative(rootDir, manualReviewPath),
    reviewIndex: path.relative(rootDir, reviewIndexPath),
    approvedManifest: path.relative(rootDir, approvedManifestPath)
  }
}, null, 2));

function readCandidates() {
  if (!fs.existsSync(candidatesJsonPath)) throw new Error(`Missing candidate JSON: ${candidatesJsonPath}`);
  const parsed = JSON.parse(fs.readFileSync(candidatesJsonPath, "utf8"));
  if (!Array.isArray(parsed.candidates)) throw new Error("gpt-image2-candidates.json must contain candidates array.");
  return parsed.candidates;
}

function buildQueue(rows) {
  const sorted = rows
    .filter((row) => row.sourceAuditNeed === "must-have")
    .sort(compareCandidates);
  const typePilotCounts = new Map(typeOrder.map((type) => [type, 0]));

  return sorted.map((row, index) => {
    const currentPilotCount = typePilotCounts.get(row.illustrationType) ?? 0;
    const batchPhase = currentPilotCount < pilotPerType ? "pilot" : "full";
    if (batchPhase === "pilot") typePilotCounts.set(row.illustrationType, currentPilotCount + 1);
    const outputPath = `candidates/${row.id}.png`;

    return {
      queueIndex: index + 1,
      questionId: row.id,
      batchPhase,
      model,
      quality,
      size,
      outputFormat,
      outputPath,
      grade: row.grade,
      semester: row.semester,
      volume: row.volume,
      unitTitle: row.unitTitle,
      topicId: row.topicId,
      questionType: row.questionType,
      difficulty: row.difficulty,
      illustrationType: row.illustrationType,
      priority: row.priority,
      promptZhHans: row.promptZhHans,
      answerForQaOnly: row.answer,
      generationBriefZhHans: row.generationBriefZhHans,
      copyrightSafetyZhHans: row.copyrightSafetyZhHans,
      prompt: buildPrompt(row),
      qaPolicy: {
        allowedStatuses: qaStatuses,
        answerMayAppearInImage: false,
        copiedTextbookLayoutAllowed: false,
        productIntegrationApproved: false
      }
    };
  });
}

function compareCandidates(left, right) {
  return (
    typeOrder.indexOf(left.illustrationType) - typeOrder.indexOf(right.illustrationType) ||
    (gradeOrder.get(left.grade) ?? 99) - (gradeOrder.get(right.grade) ?? 99) ||
    (semesterOrder.get(left.semester) ?? 99) - (semesterOrder.get(right.semester) ?? 99) ||
    left.unitTitle.localeCompare(right.unitTitle, "zh-Hans") ||
    left.id.localeCompare(right.id)
  );
}

function buildPrompt(row) {
  const typeLines = typeGuidance[row.illustrationType] ?? [
    "Create a clear original junior-secondary math support illustration.",
    "Do not reveal the answer or add extra conditions."
  ];

  const includeOptions = shouldIncludeOptions(row.promptZhHans);

  return [
    "Create one original educational math illustration for a Shanghai Education Press junior-secondary question.",
    "",
    `Question ID: ${row.id}`,
    `Grade and volume: ${row.grade} ${row.semester}, ${row.volume}`,
    `Unit: ${row.unitTitle}`,
    `Question type: ${row.questionType}`,
    `Illustration type: ${row.illustrationType}`,
    "",
    `Question prompt in Simplified Chinese: ${row.promptZhHans}`,
    includeOptions ? "If the prompt asks students to select among figure types, show only neutral schematic figure options without marking the answer." : "",
    "",
    `Generation brief: ${row.generationBriefZhHans}`,
    "",
    "Style requirements:",
    "- Clean 16:9 landscape educational diagram, PNG, white or very light background.",
    "- Use simple vector-like strokes, restrained colors, clear geometry/math layout, no decorative classroom scene unless the type is measurement-scene.",
    "- Leave breathing room for labels; avoid crowded text.",
    "",
    "Math-label policy:",
    "- Include only labels, lengths, coordinates, angles, formulas, intervals, or data values explicitly present in the prompt.",
    "- Do not compute or display the final answer, explanation, solved interval, target value, or correctness mark.",
    "- Do not add unstated equalities, parallel marks, right-angle marks, tangency marks, or symmetry marks.",
    "",
    "Copyright and safety:",
    "- Original diagram only. Do not copy, reconstruct, approximate, or imitate textbook/exam-paper figures, page layouts, watermarks, brands, or worksheet formatting.",
    "- Do not include final answer text, solution steps, teacher hints, branding, signatures, or decorative watermark.",
    "",
    "Type-specific guidance:",
    ...typeLines.map((line) => `- ${line}`),
    "",
    "Output exactly one image."
  ].filter(Boolean).join("\n");
}

function shouldIncludeOptions(prompt) {
  return /下列图形|下列说法|下列.*图/.test(prompt);
}

function normalizeResults(existingResults, queueRows) {
  const existingById = new Map((existingResults?.results ?? []).map((row) => [row.questionId, row]));
  return queueRows.map((row) => {
    const existing = existingById.get(row.questionId);
    const imagePath = path.join(scriptDir, row.outputPath);
    if (existing) {
      return {
        ...rowResultDefaults(row),
        ...existing,
        imageExists: fs.existsSync(imagePath),
        imageBytes: fs.existsSync(imagePath) ? fs.statSync(imagePath).size : 0
      };
    }

    return {
      ...rowResultDefaults(row),
      status: fs.existsSync(imagePath) ? "generated" : "queued",
      imageExists: fs.existsSync(imagePath),
      imageBytes: fs.existsSync(imagePath) ? fs.statSync(imagePath).size : 0
    };
  });
}

function rowResultDefaults(row) {
  return {
    questionId: row.questionId,
    queueIndex: row.queueIndex,
    batchPhase: row.batchPhase,
    illustrationType: row.illustrationType,
    outputPath: row.outputPath,
    status: "queued",
    qaStatus: "pending",
    attempts: 0,
    lastError: null,
    generatedAt: null,
    model: row.model,
    quality: row.quality,
    size: row.size,
    outputFormat: row.outputFormat
  };
}

function summarizeResults(rows) {
  return {
    total: rows.length,
    status: countBy(rows, (row) => row.status),
    qaStatus: countBy(rows, (row) => row.qaStatus ?? "pending"),
    batchPhase: countBy(rows, (row) => row.batchPhase),
    illustrationType: countBy(rows, (row) => row.illustrationType),
    imagesPresent: rows.filter((row) => row.imageExists).length
  };
}

function writeManualReview(queueRows, resultRows) {
  const resultById = new Map(resultRows.map((row) => [row.questionId, row]));
  const headers = [
    "questionId",
    "status",
    "qaStatus",
    "reviewNotes",
    "batchPhase",
    "illustrationType",
    "grade",
    "volume",
    "unitTitle",
    "imagePath",
    "promptZhHans",
    "generationBriefZhHans",
    "copyrightSafetyZhHans"
  ];
  const lines = [
    headers.join(","),
    ...queueRows.map((row) => {
      const result = resultById.get(row.questionId);
      const values = {
        questionId: row.questionId,
        status: result?.status ?? "queued",
        qaStatus: result?.qaStatus ?? "pending",
        reviewNotes: result?.reviewNotes ?? "",
        batchPhase: row.batchPhase,
        illustrationType: row.illustrationType,
        grade: row.grade,
        volume: row.volume,
        unitTitle: row.unitTitle,
        imagePath: row.outputPath,
        promptZhHans: row.promptZhHans,
        generationBriefZhHans: row.generationBriefZhHans,
        copyrightSafetyZhHans: row.copyrightSafetyZhHans
      };
      return headers.map((header) => csvEscape(values[header])).join(",");
    })
  ];
  fs.writeFileSync(manualReviewPath, `${lines.join("\n")}\n`, "utf8");
}

function writeReviewHtml(queueRows, resultRows) {
  const resultById = new Map(resultRows.map((row) => [row.questionId, row]));
  const cards = queueRows.map((row) => {
    const result = resultById.get(row.questionId);
    const imageExists = fs.existsSync(path.join(scriptDir, row.outputPath));
    const media = imageExists
      ? `<img src="../${escapeHtml(row.outputPath)}" alt="${escapeHtml(row.questionId)}">`
      : `<div class="placeholder">Image pending</div>`;
    return `<article class="card" data-status="${escapeHtml(result?.status ?? "queued")}" data-type="${escapeHtml(row.illustrationType)}">
      ${media}
      <div class="meta">
        <h2>${escapeHtml(row.questionId)}</h2>
        <p><strong>${escapeHtml(row.batchPhase)}</strong> · ${escapeHtml(row.illustrationType)} · ${escapeHtml(row.volume)} · ${escapeHtml(row.unitTitle)}</p>
        <p class="status">Generation: ${escapeHtml(result?.status ?? "queued")} · QA: ${escapeHtml(result?.qaStatus ?? "pending")}</p>
      </div>
      <details>
        <summary>题干 / Prompt</summary>
        <p>${escapeHtml(row.promptZhHans)}</p>
        <pre>${escapeHtml(row.prompt)}</pre>
      </details>
      <details>
        <summary>QA safety</summary>
        <p>${escapeHtml(row.copyrightSafetyZhHans)}</p>
        <p>Answer for QA only: ${escapeHtml(row.answerForQaOnly)}</p>
      </details>
    </article>`;
  }).join("\n");

  fs.writeFileSync(reviewIndexPath, `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HJB Junior Question Image2 Review</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f8fb; color: #172033; }
    header { position: sticky; top: 0; z-index: 1; background: rgba(246, 248, 251, 0.96); border-bottom: 1px solid #d9e2ef; padding: 16px 24px; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    header p { margin: 0; color: #526070; }
    main { max-width: 1480px; margin: 0 auto; padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
    .card { background: #fff; border: 1px solid #d9e2ef; border-radius: 8px; padding: 12px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); }
    img, .placeholder { width: 100%; aspect-ratio: 3 / 2; border-radius: 6px; border: 1px solid #e2e8f0; object-fit: contain; background: #eef2f7; display: grid; place-items: center; color: #64748b; }
    h2 { margin: 10px 0 4px; font-size: 15px; }
    p { font-size: 13px; line-height: 1.45; }
    details { margin-top: 8px; border-top: 1px solid #edf2f7; padding-top: 8px; }
    summary { cursor: pointer; font-size: 13px; font-weight: 700; color: #2356a7; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #f8fafc; border-radius: 6px; padding: 8px; font-size: 11px; line-height: 1.4; }
    .status { color: #2563eb; font-weight: 700; }
  </style>
</head>
<body>
  <header>
    <h1>HJB Junior Question Image2 Review</h1>
    <p>Queue: ${queueRows.length}; pilot: ${queueRows.filter((row) => row.batchPhase === "pilot").length}; model: ${model}; size: ${size}; quality: ${quality}.</p>
  </header>
  <main>${cards}</main>
</body>
</html>
`, "utf8");
}

function writeApprovedManifestIfMissing() {
  if (fs.existsSync(approvedManifestPath)) return;
  writeJson(approvedManifestPath, {
    schemaVersion: "mainland-hjb-junior-approved-question-illustrations-v1",
    generatedAt: new Date().toISOString(),
    approvalPolicy: "Only rows marked approved in manual-review.csv may be copied here by adopt-approved-image2-assets.mjs.",
    assets: []
  });
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function countBy(rows, keyFn) {
  return rows.reduce((counts, row) => {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function csvEscape(value) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
