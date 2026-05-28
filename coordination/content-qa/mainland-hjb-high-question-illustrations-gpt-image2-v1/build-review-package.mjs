#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const packageDir = path.relative(projectRoot, __dirname);

const sourceQueuePath = path.join(
  projectRoot,
  "coordination/content-qa/2026-05-27-S18-mainland-hjb-high-question-illustration-queue.json"
);
const promptsDir = path.join(__dirname, "prompts");
const candidatesDir = path.join(__dirname, "candidates");
const dryRunsDir = path.join(__dirname, "dry-runs");
const manifestPath = path.join(__dirname, "question-illustration-plan.json");
const manualReviewPath = path.join(__dirname, "manual-review.csv");
const validationReportPath = path.join(__dirname, "validation-report.json");
const indexMdPath = path.join(__dirname, "index.md");
const indexHtmlPath = path.join(__dirname, "index.html");
const readmePath = path.join(__dirname, "README.md");

const model = "gpt-image-2";
const useCase = "scientific-educational";
const size = "1536x864";
const quality = "medium";
const outputFormat = "png";
const moderation = "auto";
const chunkSize = 50;
const concurrency = 3;
const maxAttempts = 4;

const tierOrder = new Map([
  ["P1", 1],
  ["P2", 2],
  ["P3", 3]
]);

const gradeOrder = new Map([
  ["S4", 1],
  ["S5", 2],
  ["S6", 3]
]);

const categoryInstructions = {
  "函数图像/题干显式坐标图": {
    visual: "a clean coordinate-plane base with generic curve families, blank axes, neutral point markers, and soft interval highlights",
    avoid: "Do not render the exact function, point coordinates, interval endpoints, or any answer-bearing graph labels."
  },
  "解析几何直线坐标图": {
    visual: "a coordinate-plane line scene with generic points, a slope triangle, parallel/perpendicular cues, and intercept placeholders",
    avoid: "Do not render exact coordinates, equations, slopes, intercept values, or point names."
  },
  "立体几何长方体/线面关系图": {
    visual: "a transparent cuboid or prism-like solid with visible edges, a highlighted face, auxiliary line segments, right-angle cues, and depth shading",
    avoid: "Do not render exact edge lengths, vertex labels, plane names, or formulas."
  },
  "平面/三角几何图": {
    visual: "a clean triangle, sector, circle, or angle construction with side/angle placeholders, light auxiliary lines, and clear geometric relationships",
    avoid: "Do not render exact side lengths, angle measures, point names, or final area/length values."
  },
  "圆锥曲线坐标图": {
    visual: "a coordinate-plane conic base with an ellipse, parabola, or hyperbola shape, axis guides, focus placeholders, and soft construction lines",
    avoid: "Do not render equations, foci coordinates, directrix labels, vertices, or parameter values."
  },
  "导数曲线/切线图": {
    visual: "a smooth function curve with a tangent line, slope arrows, extrema markers, and sign/monotonicity bands",
    avoid: "Do not render derivative formulas, exact x-values, tangent-point labels, or final answers."
  },
  "概率样本空间/摸球图": {
    visual: "a probability model with a sample-space grid, event regions, a bag-and-outcome scene, or a branching tree with blank label areas",
    avoid: "Do not render exact counts, event names, fractions, or computed probabilities."
  },
  "函数/不等式教学辅助图": {
    visual: "a function and inequality support board with a blank number line, sign-chart bands, generic curve shape, and interval placeholders",
    avoid: "Do not render exact formulas, endpoints, inequality signs, or solution intervals."
  },
  "计数原理分支/槽位图": {
    visual: "a counting-principle structure with branching choices, arrangement slots, grouping boxes, and blocked impossible paths",
    avoid: "Do not render exact counts, item names, formulas, or final number of arrangements."
  },
  "三角函数单位圆/波形图": {
    visual: "a unit circle connected to sine/cosine waveforms, quadrant sign regions, a rotating angle cue, and period bands",
    avoid: "Do not render exact angle values, formulas, amplitude/phase labels, or answer options."
  },
  "统计数据图表": {
    visual: "a data-visualization support scene with generic bars, dot plots, distributions, or scatter/trend elements and blank label areas",
    avoid: "Do not render exact data values, axes labels, means, equations, or conclusions."
  }
};

const queueData = JSON.parse(fs.readFileSync(sourceQueuePath, "utf8"));
const sourceRows = queueData.queue.filter((row) => row.wideScopeCandidate === "yes");
const orderedRows = sourceRows.sort(compareRows);
const manifestRows = orderedRows.map(toManifestRow);
const chunks = chunkRows(manifestRows, chunkSize);
const smokeRows = firstPerTemplate(manifestRows);

fs.mkdirSync(promptsDir, { recursive: true });
fs.mkdirSync(candidatesDir, { recursive: true });
fs.mkdirSync(dryRunsDir, { recursive: true });
for (const fileName of fs.readdirSync(promptsDir)) {
  if (fileName.endsWith(".jsonl")) fs.rmSync(path.join(promptsDir, fileName));
}

writeManifest(manifestRows, chunks, smokeRows);
writePromptFiles(chunks, smokeRows);
writeManualReview(manifestRows);
writeIndexes(manifestRows);
writeReadme(chunks, smokeRows);
writeValidation(manifestRows, chunks, smokeRows);

console.log(JSON.stringify({
  packageDir,
  manifestRows: manifestRows.length,
  p1: manifestRows.filter((row) => row.illustrationTier === "P1").length,
  p2: manifestRows.filter((row) => row.illustrationTier === "P2").length,
  chunks: chunks.length,
  smokeRows: smokeRows.length,
  promptsDir: path.relative(projectRoot, promptsDir),
  candidatesDir: path.relative(projectRoot, candidatesDir)
}, null, 2));

function compareRows(left, right) {
  return (
    (tierOrder.get(left.illustrationTier) ?? 99) - (tierOrder.get(right.illustrationTier) ?? 99) ||
    left.reusableTemplateKey.localeCompare(right.reusableTemplateKey) ||
    (gradeOrder.get(left.grade) ?? 99) - (gradeOrder.get(right.grade) ?? 99) ||
    Number(left.topicOrder ?? 999) - Number(right.topicOrder ?? 999) ||
    left.questionId.localeCompare(right.questionId)
  );
}

function toManifestRow(row, index) {
  const id = `${row.questionId}__image2-v1`;
  const fileName = `${id}.${outputFormat}`;
  const candidatePath = `${packageDir}/candidates/${fileName}`;
  const prompt = buildPrompt(row);

  return {
    id,
    sequence: index + 1,
    questionId: row.questionId,
    grade: row.grade,
    volume: row.volume,
    chapter: row.chapter,
    topicId: row.topicId,
    topicZh: row.topicZh,
    questionType: row.questionType,
    difficulty: row.difficulty,
    batch: row.batch,
    illustrationTier: row.illustrationTier,
    illustrationCategory: row.illustrationCategory,
    reusableTemplateKey: row.reusableTemplateKey,
    sourcePromptZh: row.promptZh,
    generationPrompt: prompt,
    model,
    size,
    quality,
    outputFormat,
    moderation,
    outputPath: candidatePath,
    candidatePath,
    candidateFileName: fileName,
    exactMathLabelsNeeded: row.exactMathLabelsNeeded,
    suggestedImageKind: row.suggestedImageKind,
    generationPriority: row.generationPriority,
    reviewStatus: "pending",
    reviewerNotes: "",
    sourceQueueNotes: row.gptImage2Notes
  };
}

function buildPrompt(row) {
  const instruction = categoryInstructions[row.illustrationCategory] ?? {
    visual: row.suggestedImageKind,
    avoid: "Do not render exact labels, formulas, coordinates, or answer text."
  };

  return [
    "Use case: scientific-educational",
    "Asset type: review-only question-level math illustration candidate for MAIS.",
    "Primary request: Create one original educational raster illustration that helps a high-school student visualize the math structure of the source problem.",
    `Curriculum context: Shanghai Education Press high-school mathematics, ${row.grade}, ${row.chapter}.`,
    `Question context for visual planning only: ${row.promptZh}`,
    `Illustration category: ${row.illustrationCategory}.`,
    `Visual composition: ${instruction.visual}.`,
    "Style: crisp vector-like raster, clean white or very light background, modern math-learning app polish, restrained cyan/violet/emerald accents, clear geometry/data structure, generous whitespace for later deterministic overlays.",
    "Mathematical safety: the image must be a visual support scaffold only. Exact formulas, coordinates, point names, dimensions, angle values, data values, probability fractions, and answers must be added later outside the image model.",
    `Avoid: ${instruction.avoid}`,
    "Hard constraints: no readable text, no equations, no numerals, no answer clues, no option labels, no textbook screenshot, no worksheet or textbook-page layout, no publisher visual style imitation, no logos, no watermark, no page frame, no copied diagram.",
    "Output: one clean PNG-style educational illustration, no border, no multi-panel worksheet, no embedded caption."
  ].join("\n");
}

function chunkRows(rows, size) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push({
      index: chunks.length + 1,
      fileName: `chunk-${String(chunks.length + 1).padStart(3, "0")}.jsonl`,
      rows: rows.slice(index, index + size)
    });
  }
  return chunks;
}

function firstPerTemplate(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    if (seen.has(row.reusableTemplateKey)) return false;
    seen.add(row.reusableTemplateKey);
    return true;
  });
}

function toPromptJob(row) {
  return {
    prompt: row.generationPrompt,
    use_case: useCase,
    model: row.model,
    size: row.size,
    quality: row.quality,
    output_format: row.outputFormat,
    moderation: row.moderation,
    out: row.candidateFileName
  };
}

function writeManifest(rows, chunkList, smokeList) {
  const manifest = {
    version: "mainland-hjb-high-question-illustrations-gpt-image2-v1",
    generatedAt: new Date().toISOString(),
    sourceQueue: path.relative(projectRoot, sourceQueuePath),
    scope: {
      curriculum: "MAINLAND_HJB_HIGH",
      includeTiers: ["P1", "P2"],
      excludeTiers: ["P3"],
      expectedQuestions: 3813,
      integration: "review-package-only"
    },
    generationDefaults: {
      model,
      useCase,
      size,
      quality,
      outputFormat,
      moderation,
      concurrency,
      maxAttempts,
      chunkSize,
      skipExistingByDefault: true,
      rerunFlag: "--force"
    },
    summary: {
      totalRows: rows.length,
      byTier: countBy(rows, (row) => row.illustrationTier),
      byCategory: countBy(rows, (row) => row.illustrationCategory),
      byGrade: countBy(rows, (row) => row.grade),
      uniqueQuestionIds: new Set(rows.map((row) => row.questionId)).size,
      reusableTemplateKeys: new Set(rows.map((row) => row.reusableTemplateKey)).size,
      chunkCount: chunkList.length,
      smokeRows: smokeList.length
    },
    chunks: chunkList.map((chunk) => ({
      index: chunk.index,
      fileName: `prompts/${chunk.fileName}`,
      rowCount: chunk.rows.length,
      firstQuestionId: chunk.rows[0]?.questionId ?? null,
      lastQuestionId: chunk.rows.at(-1)?.questionId ?? null
    })),
    smokePromptFile: "prompts/smoke-by-template.jsonl",
    illustrations: rows
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function writePromptFiles(chunkList, smokeList) {
  fs.writeFileSync(
    path.join(promptsDir, "smoke-by-template.jsonl"),
    smokeList.map((row) => JSON.stringify(toPromptJob(row))).join("\n") + "\n"
  );

  for (const chunk of chunkList) {
    fs.writeFileSync(
      path.join(promptsDir, chunk.fileName),
      chunk.rows.map((row) => JSON.stringify(toPromptJob(row))).join("\n") + "\n"
    );
  }
}

function writeManualReview(rows) {
  const headers = [
    "id",
    "questionId",
    "reviewStatus",
    "reviewerNotes",
    "illustrationTier",
    "illustrationCategory",
    "reusableTemplateKey",
    "candidatePath",
    "model",
    "size",
    "quality",
    "exactMathLabelsNeeded",
    "sourcePromptZh"
  ];
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ];
  fs.writeFileSync(manualReviewPath, `${lines.join("\n")}\n`);
}

function writeIndexes(rows) {
  const categoryRows = Object.entries(groupBy(rows, (row) => row.illustrationCategory))
    .sort(([left], [right]) => left.localeCompare(right, "zh-Hans"))
    .map(([category, categoryRows]) => [category, categoryRows.length, categoryRows[0]?.illustrationTier ?? ""]);

  const markdownRows = rows.slice(0, 400).map((row) => [
    row.questionId,
    row.illustrationTier,
    row.illustrationCategory,
    row.reusableTemplateKey,
    row.candidatePath,
    row.sourcePromptZh
  ]);

  fs.writeFileSync(indexMdPath, [
    "# Mainland HJB High GPT Image2 Question Illustrations V1",
    "",
    `- Generated at: ${new Date().toISOString()}`,
    `- Source queue: \`${path.relative(projectRoot, sourceQueuePath)}\``,
    `- Review package only: no product integration, no public assets.`,
    `- Manifest rows: ${rows.length}`,
    `- Prompt chunks: ${Math.ceil(rows.length / chunkSize)} chunks of up to ${chunkSize}`,
    `- Smoke prompt rows: ${firstPerTemplate(rows).length}`,
    "",
    "## Category Counts",
    "",
    mdTable(["Category", "Rows", "Tier"], categoryRows),
    "",
    "## Preview Rows",
    "",
    "Only the first 400 rows are listed here to keep the Markdown review page manageable. Use `question-illustration-plan.json` and `manual-review.csv` for the full 3,813-row queue.",
    "",
    mdTable(["Question ID", "Tier", "Category", "Template", "Candidate Path", "Prompt"], markdownRows),
    ""
  ].join("\n"));

  const cards = rows.slice(0, 600).map((row) => {
    const relative = path.relative(__dirname, path.join(projectRoot, row.candidatePath)).replaceAll(path.sep, "/");
    const exists = fs.existsSync(path.join(projectRoot, row.candidatePath));
    const media = exists
      ? `<img src="${escapeHtml(relative)}" alt="${escapeHtml(row.questionId)}">`
      : `<div class="placeholder">pending</div>`;
    return `<article class="card">
      ${media}
      <h2>${escapeHtml(row.questionId)}</h2>
      <p><strong>${escapeHtml(row.illustrationTier)}</strong> ${escapeHtml(row.illustrationCategory)}</p>
      <p>${escapeHtml(row.sourcePromptZh)}</p>
      <code>${escapeHtml(row.reusableTemplateKey)}</code>
    </article>`;
  }).join("\n");

  fs.writeFileSync(indexHtmlPath, `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mainland HJB High GPT Image2 Question Illustrations V1</title>
  <style>
    body { margin: 0; background: #f8fafc; color: #172033; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    header { max-width: 1180px; margin: 0 auto; padding: 28px 20px 12px; }
    h1 { margin: 0 0 8px; font-size: 30px; }
    .grid { max-width: 1400px; margin: 0 auto; padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
    .card { background: #fff; border: 1px solid #dbe4ef; border-radius: 8px; padding: 12px; box-shadow: 0 8px 24px rgba(15,23,42,.05); }
    img, .placeholder { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 6px; background: #e2e8f0; display: grid; place-items: center; color: #64748b; }
    h2 { font-size: 14px; margin: 10px 0 6px; }
    p { margin: 6px 0; font-size: 12px; }
    code { display: block; overflow-wrap: anywhere; font-size: 11px; color: #475569; }
  </style>
</head>
<body>
  <header>
    <h1>Mainland HJB High GPT Image2 Question Illustrations V1</h1>
    <p>Review-only package. Showing first 600 rows; use manifest and CSV for all ${rows.length} candidates.</p>
  </header>
  <main class="grid">${cards}</main>
</body>
</html>
`);
}

function writeReadme(chunkList, smokeList) {
  const promptRoot = `${packageDir}/prompts`;
  const candidateRoot = `${packageDir}/candidates`;
  fs.writeFileSync(readmePath, [
    "# Mainland HJB High GPT Image2 Question Illustrations V1",
    "",
    "Review-only generation package for 3,813 P1/P2 Mainland HJB high-school question illustration candidates.",
    "",
    "## Generated Files",
    "",
    "- `question-illustration-plan.json`: full manifest.",
    "- `prompts/smoke-by-template.jsonl`: one row per reusable template key.",
    "- `prompts/chunk-*.jsonl`: full GPT Image2 batch prompts, 50 jobs per chunk.",
    "- `manual-review.csv`: manual QA decisions.",
    "- `index.md` / `index.html`: lightweight review indexes.",
    "- `validation-report.json`: package and image-generation validation status.",
    "",
    "## Commands",
    "",
    "Smoke dry-run through the package runner:",
    "",
    "```bash",
    `node ${packageDir}/run-gpt-image2-generation.mjs --mode smoke --dry-run`,
    "```",
    "",
    "Real smoke after `OPENAI_API_KEY` is available:",
    "",
    "```bash",
    `node ${packageDir}/run-gpt-image2-generation.mjs --mode smoke`,
    "```",
    "",
    "Full generation after smoke QA:",
    "",
    "```bash",
    `node ${packageDir}/run-gpt-image2-generation.mjs --mode full`,
    "```",
    "",
    "The runner skips existing PNG files by default. Add `--force` only when approved images should be regenerated.",
    "",
    "Direct CLI command for one prompt file, if needed:",
    "",
    "```bash",
    `python3 /Users/dongpinhu/.codex/skills/.system/imagegen/scripts/image_gen.py generate-batch \\`,
    `  --input ${promptRoot}/chunk-001.jsonl \\`,
    `  --out-dir ${candidateRoot} \\`,
    `  --model gpt-image-2 --size 1536x864 --quality medium --output-format png \\`,
    `  --concurrency 3 --max-attempts 4 --no-augment`,
    "```",
    "",
    "## Counts",
    "",
    `- Manifest rows: ${manifestRows.length}`,
    `- Prompt chunks: ${chunkList.length}`,
    `- Smoke rows: ${smokeList.length}`,
    "",
    "Do not copy any candidates into `public/` or product data until manual QA is complete and a separate integration plan is approved.",
    ""
  ].join("\n"));
}

function writeValidation(rows, chunkList, smokeList) {
  const imageRows = rows.map((row) => {
    const absolutePath = path.join(projectRoot, row.candidatePath);
    return {
      id: row.id,
      questionId: row.questionId,
      candidatePath: row.candidatePath,
      exists: fs.existsSync(absolutePath),
      dimensions: pngDimensions(absolutePath),
      bytes: fs.existsSync(absolutePath) ? fs.statSync(absolutePath).size : 0
    };
  });
  const generatedRows = imageRows.filter((row) => row.exists);
  const wrongDimensions = imageRows.filter((row) => row.exists && (!row.dimensions || row.dimensions.width !== 1536 || row.dimensions.height !== 864));
  const suspiciousSmall = imageRows.filter((row) => row.exists && row.bytes < 10_000);
  const chunkRowTotal = chunkList.reduce((sum, chunk) => sum + chunk.rows.length, 0);

  const report = {
    generatedAt: new Date().toISOString(),
    packageDir,
    sourceQueue: path.relative(projectRoot, sourceQueuePath),
    model,
    size,
    quality,
    outputFormat,
    concurrency,
    expected: {
      manifestRows: 3813,
      p1: 1622,
      p2: 2191,
      chunkRowTotal: 3813,
      chunkSize,
      smokeRows: 33,
      generatedFilesAfterFullRun: 3813
    },
    actual: {
      manifestRows: rows.length,
      p1: rows.filter((row) => row.illustrationTier === "P1").length,
      p2: rows.filter((row) => row.illustrationTier === "P2").length,
      uniqueQuestionIds: new Set(rows.map((row) => row.questionId)).size,
      chunkCount: chunkList.length,
      chunkRowTotal,
      smokeRows: smokeList.length,
      generatedFiles: generatedRows.length,
      wrongDimensionFiles: wrongDimensions.length,
      suspiciousSmallFiles: suspiciousSmall.length
    },
    checks: [
      check("manifest row count", rows.length, 3813),
      check("P1 count", rows.filter((row) => row.illustrationTier === "P1").length, 1622),
      check("P2 count", rows.filter((row) => row.illustrationTier === "P2").length, 2191),
      check("unique question IDs", new Set(rows.map((row) => row.questionId)).size, rows.length),
      check("chunk row total", chunkRowTotal, 3813),
      check("smoke rows equal reusable template keys", smokeList.length, new Set(rows.map((row) => row.reusableTemplateKey)).size)
    ],
    imageChecks: {
      status: generatedRows.length === 3813 ? "complete" : "pending-generation",
      generatedFiles: generatedRows.length,
      expectedFiles: 3813,
      wrongDimensions: wrongDimensions.map((row) => row.candidatePath),
      suspiciousSmallFiles: suspiciousSmall.map((row) => row.candidatePath),
      note: "Pixel-level non-solid checks are pending until real PNG files exist; manual QA remains required."
    }
  };

  report.packageChecksPassed = report.checks.every((item) => item.passed);
  report.readyForRealGeneration = report.packageChecksPassed;

  fs.writeFileSync(validationReportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (!report.packageChecksPassed) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  }
}

function check(name, actual, expected) {
  return {
    name,
    actual,
    expected,
    passed: JSON.stringify(actual) === JSON.stringify(expected)
  };
}

function countBy(rows, keyFn) {
  return rows.reduce((counts, row) => {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function groupBy(rows, keyFn) {
  return rows.reduce((groups, row) => {
    const key = keyFn(row);
    groups[key] ??= [];
    groups[key].push(row);
    return groups;
  }, {});
}

function csvCell(value) {
  const text = String(value ?? "").replace(/\s*\r?\n\s*/gu, " ");
  return /[",\n\r]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? "").replaceAll("|", "\\|")).join(" | ")} |`)
  ].join("\n");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pngDimensions(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}
