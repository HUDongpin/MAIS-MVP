#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(scriptDir, "../../..");
export const sourceTemplateCsvPath = path.join(
  rootDir,
  "coordination/content-qa/2026-05-27-S18-mainland-pep-junior-question-illustration-needs-template-families.csv"
);
export const sourceQuestionCsvPath = path.join(
  rootDir,
  "coordination/content-qa/2026-05-27-S18-mainland-pep-junior-question-illustration-needs-questions.csv"
);
export const manifestPath = path.join(scriptDir, "manifest.json");
export const promptsJsonPath = path.join(scriptDir, "prompts.json");
export const promptsCsvPath = path.join(scriptDir, "prompts.csv");
export const qaReportPath = path.join(scriptDir, "qa-report.md");
export const assetRootFs = path.join(rootDir, "public/question-illustrations/mainland-pep-junior");
export const assetRootPublic = "/question-illustrations/mainland-pep-junior";
export const baseImageDir = path.join(assetRootFs, "base");
export const candidateImageDir = path.join(baseImageDir, "candidates");
export const questionImageDir = path.join(assetRootFs, "questions");

export const imageDefaults = {
  model: "gpt-image-2",
  size: "1536x1024",
  quality: "medium",
  outputFormat: "png",
  background: "opaque-white",
  maxCandidatesPerTemplate: 3
};

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (const token of argv) {
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const body = token.slice(2);
    if (body.startsWith("no-")) {
      args[body.slice(3)] = false;
      continue;
    }
    const eq = body.indexOf("=");
    if (eq === -1) {
      args[body] = true;
    } else {
      args[body.slice(0, eq)] = body.slice(eq + 1);
    }
  }
  return args;
}

export function ensurePipelineDirs() {
  for (const dir of [scriptDir, baseImageDir, candidateImageDir, questionImageDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readTemplateFamilies() {
  return parseCsv(fs.readFileSync(sourceTemplateCsvPath, "utf8"));
}

export function readQuestions() {
  return parseCsv(fs.readFileSync(sourceQuestionCsvPath, "utf8"));
}

export function readManifest() {
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

export function writeManifest(manifest) {
  manifest.updatedAtHkt = hktTimestamp();
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (ch === "\"" && next === "\"") {
        cell += "\"";
        i += 1;
      } else if (ch === "\"") {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === "\"") {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value !== "")) rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  if (!headers) return [];
  return dataRows.map((dataRow) =>
    Object.fromEntries(headers.map((header, index) => [header, dataRow[index] ?? ""]))
  );
}

export function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function csvCell(value) {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, "\"\"")}"`;
  return str;
}

export function hktDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function hktTimestamp() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date());
}

export function selectedTemplateFamilies(templates, { includeOptional = false } = {}) {
  const phases = new Set(includeOptional ? ["core", "optional-second-batch"] : ["core"]);
  return templates.filter((template) => phases.has(template.illustrationPhase));
}

export function selectedQuestions(questions, { includeOptional = false } = {}) {
  const phases = new Set(includeOptional ? ["core", "optional-second-batch"] : ["core"]);
  return questions.filter((question) => phases.has(question.illustrationPhase));
}

export function validateSourceInputs(templates, questions) {
  const coreTemplates = templates.filter((row) => row.illustrationPhase === "core");
  const optionalTemplates = templates.filter((row) => row.illustrationPhase === "optional-second-batch");
  const coreQuestions = questions.filter((row) => row.illustrationPhase === "core");
  const optionalQuestions = questions.filter((row) => row.illustrationPhase === "optional-second-batch");
  const checks = [
    check("template family CSV is readable", templates.length > 0, templates.length),
    check("question CSV is readable", questions.length > 0, questions.length),
    check("core template families = 20", coreTemplates.length === 20, coreTemplates.length),
    check("core questions = 691", coreQuestions.length === 691, coreQuestions.length),
    check("optional statistics/probability template families = 3", optionalTemplates.length === 3, optionalTemplates.length),
    check("optional statistics/probability questions = 133", optionalQuestions.length === 133, optionalQuestions.length),
    check(
      "core template questionCount sum = 691",
      sumQuestionCounts(coreTemplates) === 691,
      sumQuestionCounts(coreTemplates)
    ),
    check(
      "optional template questionCount sum = 133",
      sumQuestionCounts(optionalTemplates) === 133,
      sumQuestionCounts(optionalTemplates)
    ),
    check(
      "every core template has prompt fields, output path fields can be derived, and question ids",
      coreTemplates.every((template) =>
        template.templateFamilyId &&
        template.suggestedImageKind &&
        template.exactMathLabelsNeeded &&
        template.questionIds
      ),
      `${coreTemplates.filter((template) => template.templateFamilyId && template.questionIds).length}/${coreTemplates.length}`
    )
  ];

  const failed = checks.filter((item) => !item.pass);
  return {
    passed: failed.length === 0,
    checks,
    counts: {
      templateFamilies: templates.length,
      questions: questions.length,
      coreTemplateFamilies: coreTemplates.length,
      coreQuestions: coreQuestions.length,
      optionalTemplateFamilies: optionalTemplates.length,
      optionalQuestions: optionalQuestions.length,
      coreQuestionCountFromTemplates: sumQuestionCounts(coreTemplates),
      optionalQuestionCountFromTemplates: sumQuestionCounts(optionalTemplates)
    }
  };
}

function check(name, pass, actual) {
  return { name, pass, actual };
}

function sumQuestionCounts(templates) {
  return templates.reduce((total, template) => total + Number(template.questionCount || 0), 0);
}

export function splitQuestionIds(value) {
  return String(value ?? "")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function inferOverlayType(template) {
  const kind = `${template.suggestedImageKind} ${template.normalizedPromptTemplate}`.toLowerCase();
  if (kind.includes("parallel lines") || kind.includes("transversal")) return "parallel-transversal";
  if (kind.includes("midpoint") || /线段pp长/.test(template.normalizedPromptTemplate)) return "segment-midpoint";
  if (kind.includes("right triangle side")) return "right-triangle";
  if (kind.includes("quadrilateral")) return "quadrilateral";
  if (kind.includes("similar")) return "similar-triangles";
  if (kind.includes("trigonometry") || kind.includes("elevation")) return "trig-elevation";
  if (kind.includes("circle")) return "circle-geometry";
  if (kind.includes("triangle")) return "triangle";
  if (kind.includes("angle")) return "basic-angle";
  if (kind.includes("point translation")) return "coordinate-translation";
  if (kind.includes("quadrant")) return "coordinate-quadrant";
  if (kind.includes("slope triangle")) return "line-slope";
  if (kind.includes("reciprocal")) return "reciprocal-function";
  if (kind.includes("quadratic") || kind.includes("parabola")) return "quadratic-parabola";
  if (kind.includes("linear function") || kind.includes("coordinate-plane")) return "linear-function";
  if (kind.includes("number line")) return "number-line";
  if (kind.includes("probability")) return "probability-model";
  if (kind.includes("data table") || kind.includes("chart")) return "data-table";
  return template.illustrationCategory === "coordinate_function" ? "coordinate-plane" : "generic-diagram";
}

export function buildImagePrompt(template) {
  const overlayType = inferOverlayType(template);
  const subject = promptSubject(overlayType);
  const lineSpecifics = promptSpecifics(overlayType);
  return [
    "Create an original clean middle-school math diagram base.",
    `Diagram type: ${subject}.`,
    lineSpecifics,
    "Style: simple black or dark-gray vector-like line art, balanced landscape composition, white opaque background, clear margins.",
    "Leave generous blank space around all points, line segments, arcs, axes, curves, ticks, and marker positions for later deterministic labels.",
    "Draw only the unlabeled mathematical structure and neutral marker placeholders; keep exact numbers, point names, equations, formulas, Chinese text, answer text, and solution steps out of the image.",
    "Do not include publisher branding, watermarks, textbook page texture, decorative scenes, students, characters, colored backgrounds, or copied textbook styling.",
    "Use a generic original textbook-style layout suitable for a Chinese middle-school math app, with no final-answer hint."
  ].join("\n");
}

function promptSubject(overlayType) {
  const subjects = {
    "parallel-transversal": "two parallel lines cut by one transversal, with open angle regions and parallel marks but no labels",
    "segment-midpoint": "a horizontal segment with a midpoint marker and clear space for A, B, C and length labels",
    "right-triangle": "one right triangle with a right-angle square and blank side-label space",
    quadrilateral: "a clean parallelogram or quadrilateral with parallel-side cue marks and blank vertex-label space",
    "similar-triangles": "two separated similar triangles, one larger and one smaller, with corresponding sides visually aligned",
    "trig-elevation": "a right-triangle elevation diagram with horizontal ground line, vertical height, sight line, and angle arc",
    "circle-geometry": "a circle with center, radius/chord construction lines, and blank point-label space",
    triangle: "a triangle diagram with angle arcs and side tick placeholders but no labels",
    "basic-angle": "rays or line segments forming adjacent angle regions, with open arcs and no labels",
    "coordinate-translation": "a coordinate grid with axes, an arrow path showing horizontal and vertical translation, and no tick labels",
    "coordinate-quadrant": "a four-quadrant coordinate plane with axes and light grid, no quadrant text",
    "line-slope": "a coordinate plane with one straight line through two points and a slope triangle, no coordinates or formula",
    "reciprocal-function": "a coordinate plane with two reciprocal-function branches and one blank point marker",
    "quadratic-parabola": "a coordinate plane with one parabola, vertex marker, and dashed symmetry axis without text",
    "linear-function": "a coordinate plane with one straight line and intercept/point markers, no formula or labels",
    "number-line": "one horizontal number line with arrows, ticks, two point markers, and a blank distance bracket",
    "data-table": "a simple unlabeled table or small chart frame with empty cells",
    "probability-model": "a simple sample-space or probability-tree structure with blank branch labels"
  };
  return subjects[overlayType] ?? "a generic unlabeled math diagram";
}

function promptSpecifics(overlayType) {
  if (overlayType.startsWith("coordinate") || ["line-slope", "linear-function", "reciprocal-function", "quadratic-parabola"].includes(overlayType)) {
    return "Use crisp axes, subtle grid lines, arrowheads, and enough whitespace outside the plotting area for overlaid coordinates and formulas.";
  }
  if (["parallel-transversal", "segment-midpoint", "right-triangle", "quadrilateral", "similar-triangles", "trig-elevation", "circle-geometry", "triangle", "basic-angle"].includes(overlayType)) {
    return "Use clean geometric construction lines with precise-looking but unlabeled arcs, tick marks, and open label areas.";
  }
  if (overlayType === "number-line") {
    return "Use evenly spaced ticks, arrowheads at both ends, and enough vertical space for point names and a distance bracket.";
  }
  return "Keep the structure minimal, uncluttered, and easy to annotate later.";
}

export function buildOverlaySpec(question, template) {
  const prompt = question.promptZhHans ?? "";
  const numbers = extractNumbers(prompt);
  const pointLabels = extractPointLabels(prompt);
  const formulas = extractFormulas(prompt);
  return {
    overlayType: inferOverlayType(template),
    sourceQuestionId: question.questionId,
    templateFamilyId: template.templateFamilyId,
    valuesFromPrompt: numbers,
    pointLabels,
    formulas,
    answerExcludedFromOverlay: true,
    deterministicElements: deterministicElementsFor(inferOverlayType(template)),
    qaRequired: [
      "confirm labels match the source question prompt",
      "confirm no answer-only value is introduced",
      "confirm text does not overlap or clip"
    ]
  };
}

function deterministicElementsFor(overlayType) {
  const common = {
    "parallel-transversal": ["parallel marks", "angle arc", "known angle value"],
    "segment-midpoint": ["endpoint labels", "midpoint label", "segment length"],
    "right-triangle": ["right-angle mark", "side labels"],
    quadrilateral: ["vertex labels", "parallel marks", "known side length"],
    "similar-triangles": ["corresponding vertices", "ratio label", "known side length"],
    "trig-elevation": ["angle arc", "horizontal distance", "height marker"],
    "circle-geometry": ["center label", "radius/chord marks", "angle/arc placeholders"],
    triangle: ["vertex labels", "angle arcs", "side/angle labels"],
    "basic-angle": ["vertex label", "angle arcs", "known angle value"],
    "coordinate-translation": ["axes", "point coordinates", "translation arrows"],
    "coordinate-quadrant": ["axes", "point marker", "quadrant cue"],
    "line-slope": ["axes", "two points", "slope triangle"],
    "reciprocal-function": ["axes", "curve", "given point"],
    "quadratic-parabola": ["axes", "parabola", "vertex", "symmetry axis"],
    "linear-function": ["axes", "line", "formula label if present"],
    "number-line": ["ticks", "A/B point labels", "distance bracket"],
    "data-table": ["table cells", "data values"],
    "probability-model": ["event labels", "counts", "branch placeholders"]
  };
  return common[overlayType] ?? ["source-prompt values"];
}

export function extractNumbers(text) {
  return [...String(text ?? "").matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => match[0]);
}

export function extractPointLabels(text) {
  const labels = new Set();
  for (const match of String(text ?? "").matchAll(/[A-Z]/g)) labels.add(match[0]);
  if (labels.size === 0) return ["A", "B", "C"];
  return [...labels].slice(0, 8);
}

export function extractFormulas(text) {
  const formulas = [];
  const source = String(text ?? "");
  for (const match of source.matchAll(/y\s*=\s*[^，。,；;？?\s]+/g)) formulas.push(match[0].replace(/\s+/g, ""));
  for (const match of source.matchAll(/[A-Z]\(-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?\)/g)) formulas.push(match[0]);
  return [...new Set(formulas)];
}

export function publicBasePath(templateFamilyId) {
  return `${assetRootPublic}/base/${templateFamilyId}.png`;
}

export function fsBasePath(templateFamilyId) {
  return path.join(baseImageDir, `${templateFamilyId}.png`);
}

export function publicCandidatePath(templateFamilyId, index) {
  return `${assetRootPublic}/base/candidates/${templateFamilyId}-candidate-${String(index).padStart(2, "0")}.png`;
}

export function fsCandidatePath(templateFamilyId, index) {
  return path.join(candidateImageDir, `${templateFamilyId}-candidate-${String(index).padStart(2, "0")}.png`);
}

export function publicQuestionPath(questionId) {
  return `${assetRootPublic}/questions/${questionId}.png`;
}

export function fsQuestionPath(questionId) {
  return path.join(questionImageDir, `${questionId}.png`);
}

export function relativeToRoot(filePath) {
  return path.relative(rootDir, filePath);
}

export function inspectPng(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false };
  const bytes = fs.readFileSync(filePath);
  const signature = bytes.subarray(0, 8).toString("hex");
  const isPng = signature === "89504e470d0a1a0a";
  if (!isPng || bytes.length < 33) {
    return { exists: true, isPng: false, bytes: bytes.length };
  }
  return {
    exists: true,
    isPng: true,
    bytes: bytes.length,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes[24],
    colorType: bytes[25],
    hasAlphaChannel: bytes[25] === 4 || bytes[25] === 6
  };
}

