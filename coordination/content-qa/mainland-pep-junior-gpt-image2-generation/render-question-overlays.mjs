#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rejectDirectBrowserEntry } from "../../../scripts/reject-direct-browser-entry.mjs";
import {
  fsBasePath,
  fsQuestionPath,
  parseArgs,
  publicQuestionPath,
  readManifest,
  readQuestions,
  relativeToRoot,
  writeManifest
} from "./pipeline-lib.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const args = parseArgs();
const dryRun = Boolean(args["dry-run"]);
const allowPlaceholderBase = Boolean(args["allow-placeholder-base"]);
const limit = args.limit ? Number(args.limit) : null;
const onlyTemplate = args.template ? String(args.template) : null;
const onlyQuestion = args.question ? String(args.question) : null;

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function run() {
  const manifest = readManifest();
  if (!manifest) throw new Error("manifest.json is missing. Run prepare-prompts.mjs first.");
  const questionRows = new Map(readQuestions().map((question) => [question.questionId, question]));
  const entries = Object.values(manifest.questions)
    .filter((entry) => !onlyTemplate || entry.templateFamilyId === onlyTemplate)
    .filter((entry) => !onlyQuestion || entry.questionId === onlyQuestion);
  const targets = limit ? entries.slice(0, limit) : entries;
  if (onlyQuestion && targets.length === 0) throw new Error(`Question not found: ${onlyQuestion}`);

  const missingBase = [];
  const renderable = [];
  for (const entry of targets) {
    const basePath = fsBasePath(entry.templateFamilyId);
    if (!fs.existsSync(basePath) && !allowPlaceholderBase) {
      missingBase.push(entry);
    } else {
      renderable.push(entry);
    }
  }

  if (dryRun) {
    console.log(JSON.stringify({
      mode: "dry-run",
      requested: targets.length,
      renderable: renderable.length,
      blockedBaseMissing: missingBase.length
    }, null, 2));
    return;
  }

  for (const entry of missingBase) {
    entry.qaStatus = "blocked-base-missing";
    entry.blocker = `Approved base image missing for ${entry.templateFamilyId}`;
  }

  let browser = null;
  if (renderable.length > 0) {
    rejectDirectBrowserEntry("render-question-overlays browser rasterization");
  }

  let rendered = 0;
  try {
    for (const entry of renderable) {
      const question = questionRows.get(entry.questionId);
      if (!question) {
        entry.qaStatus = "blocked-question-missing";
        entry.blocker = "Question row missing from S18 question CSV";
        continue;
      }
      const svg = buildSvg(entry, question, {
        basePath: fs.existsSync(fsBasePath(entry.templateFamilyId)) ? fsBasePath(entry.templateFamilyId) : null
      });
      const outputPath = fsQuestionPath(entry.questionId);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      await renderSvgToPng(browser, svg, outputPath);
      entry.imageSrc = publicQuestionPath(entry.questionId);
      entry.qaStatus = allowPlaceholderBase && !fs.existsSync(fsBasePath(entry.templateFamilyId))
        ? "rendered-with-placeholder-base"
        : "pending-manual-qa";
      entry.blocker = entry.qaStatus === "pending-manual-qa" ? null : "Placeholder base used; replace with approved GPT Image2 base before final QA pass";
      rendered += 1;
    }
  } finally {
    if (browser) await browser.close();
  }

  writeManifest(manifest);
  console.log(JSON.stringify({
    rendered,
    blockedBaseMissing: missingBase.length,
    manifest: "coordination/content-qa/mainland-pep-junior-gpt-image2-generation/manifest.json"
  }, null, 2));
}

async function renderSvgToPng(browser, svg, outputPath) {
  const page = await browser.newPage({
    viewport: { width: 1536, height: 1024 },
    deviceScaleFactor: 1
  });
  await page.setContent(`<html><body style="margin:0;background:white">${svg}</body></html>`);
  await page.locator("svg").screenshot({ path: outputPath, omitBackground: false });
  await page.close();
}

function buildSvg(entry, question, { basePath }) {
  const spec = entry.overlaySpec;
  const numbers = spec.valuesFromPrompt ?? [];
  const labels = spec.pointLabels?.length ? spec.pointLabels : ["A", "B", "C"];
  const formula = spec.formulas?.[0] ?? "";
  const baseImage = basePath ? `<image href="data:image/png;base64,${fs.readFileSync(basePath, "base64")}" x="0" y="0" width="1536" height="1024" opacity="0.72"/>` : "";
  const overlay = overlayFor(spec.overlayType, { numbers, labels, formula, question });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
  <defs>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth"><path d="M2,2 L10,6 L2,10 Z" fill="#111"/></marker>
    <style>
      .line{stroke:#111;stroke-width:5;fill:none;stroke-linecap:round;stroke-linejoin:round}
      .thin{stroke:#111;stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round}
      .grid{stroke:#d7dee8;stroke-width:1.6}
      .dash{stroke-dasharray:12 12}
      .label{font-family:Arial, Helvetica, sans-serif;font-size:42px;fill:#111}
      .small{font-size:34px}
      .formula{font-size:38px}
    </style>
  </defs>
  <rect width="1536" height="1024" fill="white"/>
  ${baseImage}
  ${overlay}
</svg>`;
}

function overlayFor(type, ctx) {
  const renderers = {
    "parallel-transversal": parallelTransversal,
    "segment-midpoint": segmentMidpoint,
    "right-triangle": rightTriangle,
    quadrilateral,
    "similar-triangles": similarTriangles,
    "trig-elevation": trigElevation,
    "circle-geometry": circleGeometry,
    triangle,
    "basic-angle": basicAngle,
    "coordinate-translation": coordinateTranslation,
    "coordinate-quadrant": coordinateQuadrant,
    "line-slope": lineSlope,
    "reciprocal-function": reciprocalFunction,
    "quadratic-parabola": quadraticParabola,
    "linear-function": linearFunction,
    "number-line": numberLine,
    "data-table": dataTable,
    "probability-model": probabilityModel
  };
  return (renderers[type] ?? genericDiagram)(ctx);
}

function parallelTransversal({ numbers }) {
  const angle = numbers[0] ? `${numbers[0]}°` : "";
  return `
    <path class="line" d="M260 330 L1240 330 M220 650 L1200 650 M520 180 L850 820"/>
    <path class="thin" d="M315 292 l34 24 l-34 24 M365 292 l34 24 l-34 24 M275 612 l34 24 l-34 24 M325 612 l34 24 l-34 24"/>
    <path class="thin" d="M575 332 A86 86 0 0 0 622 252"/>
    ${text(angle, 630, 286)}
  `;
}

function segmentMidpoint({ numbers, labels }) {
  const length = numbers[0] ? `${numbers[0]} cm` : "";
  return `
    <path class="line" d="M280 512 L1256 512"/>
    <circle cx="280" cy="512" r="10" fill="#111"/><circle cx="768" cy="512" r="10" fill="#111"/><circle cx="1256" cy="512" r="10" fill="#111"/>
    ${text(labels[0] ?? "A", 250, 590)}${text(labels[2] ?? "C", 742, 590)}${text(labels[1] ?? "B", 1230, 590)}
    ${text(length, 675, 455, "small")}
  `;
}

function rightTriangle({ numbers, labels }) {
  return `
    <path class="line" d="M420 760 L420 260 L1120 760 Z"/>
    <path class="thin" d="M420 705 L475 705 L475 760"/>
    ${text(labels[0] ?? "A", 385, 815)}${text(labels[1] ?? "B", 385, 245)}${text(labels[2] ?? "C", 1125, 815)}
    ${text(numbers[0] ? `${numbers[0]} cm` : "", 300, 520, "small")}
    ${text(numbers[1] ? `${numbers[1]} cm` : "", 700, 820, "small")}
  `;
}

function quadrilateral({ numbers }) {
  return `
    <path class="line" d="M420 700 L1030 700 L1160 330 L550 330 Z"/>
    <path class="thin" d="M610 308 l45 22 l-45 22 M930 678 l45 22 l-45 22 M395 560 l40 -20 M1125 470 l40 -20"/>
    ${text("A", 390, 750)}${text("B", 1030, 750)}${text("C", 1165, 330)}${text("D", 520, 330)}
    ${text(numbers[0] ? `AB=${numbers[0]} cm` : "", 650, 760, "small")}
  `;
}

function similarTriangles({ numbers }) {
  return `
    <path class="line" d="M240 740 L570 300 L850 740 Z M970 740 L1135 520 L1275 740 Z"/>
    ${text("A", 210, 790)}${text("B", 565, 285)}${text("C", 850, 790)}${text("D", 940, 790)}${text("E", 1130, 505)}${text("F", 1275, 790)}
    ${text(numbers[0] && numbers[1] ? `ratio ${numbers[0]}:${numbers[1]}` : "", 655, 230, "small")}
    ${text(numbers[2] ? `${numbers[2]} cm` : "", 1040, 665, "small")}
  `;
}

function trigElevation({ numbers }) {
  return `
    <path class="line" d="M300 760 L1140 760 L1140 260 L300 760"/>
    <path class="thin" d="M1085 760 L1085 705 L1140 705 M390 760 A100 100 0 0 0 363 700"/>
    ${text(numbers[0] ? `${numbers[0]}°` : "", 410, 705, "small")}
    ${text(numbers[1] ? `${numbers[1]} m` : "", 675, 830, "small")}
    ${text("height", 1170, 520, "small")}
  `;
}

function circleGeometry({ labels, numbers }) {
  return `
    <circle class="line" cx="768" cy="512" r="260"/>
    <path class="thin" d="M768 512 L1028 512 M555 365 L981 690"/>
    <circle cx="768" cy="512" r="8" fill="#111"/>
    ${text(labels[0] ?? "O", 735, 500)}${text(labels[1] ?? "A", 1028, 490)}${text(labels[2] ?? "B", 535, 360)}
    ${text(numbers[0] ? `${numbers[0]}` : "", 880, 485, "small")}
  `;
}

function triangle({ numbers, labels }) {
  return `
    <path class="line" d="M380 760 L790 250 L1180 760 Z"/>
    <path class="thin" d="M470 760 A90 90 0 0 1 436 690 M1110 760 A90 90 0 0 0 1142 690"/>
    ${text(labels[0] ?? "A", 350, 810)}${text(labels[1] ?? "B", 770, 235)}${text(labels[2] ?? "C", 1180, 810)}
    ${text(numbers[0] ? `${numbers[0]}°` : "", 485, 710, "small")}
    ${text(numbers[1] ? `${numbers[1]}°` : "", 1010, 710, "small")}
  `;
}

function basicAngle({ numbers }) {
  return `
    <path class="line" d="M320 650 L1220 650 M770 650 L1040 315"/>
    <path class="thin" d="M870 650 A100 100 0 0 0 833 572"/>
    ${text("O", 735, 705)}${text(numbers[0] ? `${numbers[0]}°` : "", 900, 585, "small")}
  `;
}

function coordinateTranslation({ numbers }) {
  const [x = "4", y = "-6", dx = "3", dy = "3"] = numbers;
  return `${grid()}
    <path class="line" marker-end="url(#arrow)" d="M650 600 L800 600 L800 720"/>
    <circle cx="650" cy="600" r="12" fill="#111"/><circle cx="800" cy="720" r="12" fill="#111"/>
    ${text(`P(${x},${y})`, 520, 560, "small")}${text(`+${dx}, -${dy}`, 825, 665, "small")}
  `;
}

function coordinateQuadrant({ numbers }) {
  const [x = "x", y = "y"] = numbers;
  return `${grid()}<circle cx="610" cy="410" r="14" fill="#111"/>${text(`P(${x},${y})`, 640, 390, "small")}`;
}

function lineSlope({ numbers }) {
  const [x1 = "2", y1 = "5", x2 = "4", y2 = "15"] = numbers;
  return `${grid()}
    <path class="line" d="M430 760 L1120 260"/>
    <circle cx="610" cy="630" r="13" fill="#111"/><circle cx="910" cy="412" r="13" fill="#111"/>
    <path class="thin" d="M610 630 L910 630 L910 412"/>
    ${text(`(${x1},${y1})`, 475, 610, "small")}${text(`(${x2},${y2})`, 925, 410, "small")}
  `;
}

function reciprocalFunction({ numbers }) {
  const [x = "x", y = "y"] = numbers;
  return `${grid()}<path class="line" d="M830 420 C940 280 1100 240 1240 220 M700 600 C570 755 430 795 300 820"/>
    <circle cx="930" cy="315" r="13" fill="#111"/>${text(`P(${x},${y})`, 955, 305, "small")}
  `;
}

function quadraticParabola({ formula }) {
  return `${grid()}<path class="line" d="M450 320 C570 820 965 820 1085 320"/>
    <path class="thin dash" d="M768 205 L768 835"/><circle cx="768" cy="705" r="13" fill="#111"/>
    ${text(formula || "y=(x-h)^2+k", 900, 250, "formula")}
  `;
}

function linearFunction({ formula }) {
  return `${grid()}<path class="line" d="M360 760 L1180 310"/>${text(formula || "y=mx+b", 940, 320, "formula")}`;
}

function numberLine({ numbers }) {
  const [a = "-6", b = "2"] = numbers;
  return `
    <path class="line" marker-end="url(#arrow)" d="M250 540 L1285 540"/>
    ${Array.from({ length: 11 }, (_, i) => `<path class="thin" d="M${300 + i * 90} 510 L${300 + i * 90} 570"/>`).join("")}
    <circle cx="510" cy="540" r="13" fill="#111"/><circle cx="870" cy="540" r="13" fill="#111"/>
    <path class="thin" d="M510 430 Q690 350 870 430"/>
    ${text("A", 485, 625)}${text("B", 845, 625)}${text(a, 480, 492, "small")}${text(b, 850, 492, "small")}
  `;
}

function dataTable({ numbers }) {
  const vals = numbers.slice(0, 4);
  return `
    <path class="line" d="M410 330 H1125 V700 H410 Z M410 455 H1125 M410 580 H1125 M650 330 V700 M890 330 V700"/>
    ${vals.map((value, index) => text(value, 500 + index * 170, 530, "small")).join("")}
  `;
}

function probabilityModel({ numbers }) {
  const [a = "", b = ""] = numbers;
  return `
    <path class="line" d="M420 512 L760 330 M420 512 L760 695 M760 330 L1120 245 M760 330 L1120 415 M760 695 L1120 610 M760 695 L1120 785"/>
    ${text(a ? `red ${a}` : "event A", 800, 300, "small")}${text(b ? `blue ${b}` : "event B", 800, 690, "small")}
  `;
}

function genericDiagram({ numbers }) {
  return `<rect class="thin" x="330" y="260" width="880" height="500" rx="0"/>${text(numbers.join(", "), 520, 520, "small")}`;
}

function grid() {
  const vertical = Array.from({ length: 13 }, (_, i) => 288 + i * 80).map((x) => `<path class="grid" d="M${x} 160 L${x} 860"/>`).join("");
  const horizontal = Array.from({ length: 9 }, (_, i) => 180 + i * 80).map((y) => `<path class="grid" d="M250 ${y} L1285 ${y}"/>`).join("");
  return `${vertical}${horizontal}<path class="line" marker-end="url(#arrow)" d="M250 520 L1285 520"/><path class="line" marker-end="url(#arrow)" d="M768 860 L768 160"/>${text("x", 1260, 575, "small")}${text("y", 715, 175, "small")}`;
}

function text(value, x, y, cls = "") {
  if (!value) return "";
  return `<text class="label ${cls}" x="${x}" y="${y}">${escapeXml(value)}</text>`;
}

function escapeXml(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[ch]);
}
