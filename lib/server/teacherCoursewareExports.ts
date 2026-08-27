import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { LocalizedText } from "@/types";
import {
  stableTeacherCoursewareJson,
  teacherCoursewareText,
  type TeacherCoursewareFormat,
  type TeacherCoursewareLanguage,
  type TeacherCoursewareManifest
} from "./teacherCoursewareManifest";

export type TeacherCoursewareRenderedExport = {
  bytes: Buffer;
  extension: TeacherCoursewareFormat;
  mimeType: string;
};

const slideWidth = 13.333;
const palette = {
  background: "F8FAFC",
  ink: "0F172A",
  muted: "475569",
  line: "CBD5E1",
  navy: "0F172A",
  cyan: "0891B2",
  emerald: "059669",
  amber: "D97706",
  red: "DC2626",
  white: "FFFFFF"
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanFileStem(value: string) {
  const cleaned = value.normalize("NFKC").replace(/[\\/:*?"<>|\u0000-\u001F]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned.slice(0, 80) || "courseware";
}

export function teacherCoursewareFileStem(manifest: TeacherCoursewareManifest, language: TeacherCoursewareLanguage) {
  return cleanFileStem(teacherCoursewareText(manifest.identity.title, language));
}

function localizedHtml(value: LocalizedText, language: TeacherCoursewareLanguage) {
  return escapeHtml(teacherCoursewareText(value, language));
}

function localizedCoursewareTerm(value: string, language: TeacherCoursewareLanguage) {
  if (language === "en") return value.replace(/-/g, " ");
  const labels: Record<string, { zh: string; zhHans: string }> = {
    approved: { zh: "已批准", zhHans: "已批准" },
    blocked: { zh: "未通過", zhHans: "未通过" },
    error: { zh: "錯誤", zhHans: "错误" },
    manual: { zh: "教師編寫", zhHans: "教师编写" },
    "ai-generated": { zh: "AI 生成", zhHans: "AI 生成" },
    "lesson-kit": { zh: "課節包", zhHans: "课时包" },
    "lesson-plan": { zh: "教案", zhHans: "教案" },
    "learning-guide": { zh: "學習指引", zhHans: "学习指引" },
    slides: { zh: "投影片", zhHans: "幻灯片" },
    "blackboard-design": { zh: "板書設計", zhHans: "板书设计" },
    objectives: { zh: "學習目標", zhHans: "学习目标" },
    "key-points": { zh: "核心要點", zhHans: "核心要点" },
    "worked-examples": { zh: "例題講解", zhHans: "例题讲解" },
    "class-practice": { zh: "課堂練習", zhHans: "课堂练习" },
    homework: { zh: "課後作業", zhHans: "课后作业" },
    "classroom-activity": { zh: "課堂活動", zhHans: "课堂活动" },
    "needs-review": { zh: "需複核", zhHans: "需复核" },
    "question-bank": { zh: "題庫", zhHans: "题库" },
    ready: { zh: "可匯出", zhHans: "可导出" },
    reviewed: { zh: "已審核", zhHans: "已审核" },
    "review-required": { zh: "需教師複核", zhHans: "需教师复核" },
    validated: { zh: "已驗證", zhHans: "已验证" },
    warning: { zh: "提示", zhHans: "提示" },
    covered: { zh: "完整覆蓋", zhHans: "完整覆盖" },
    partial: { zh: "部分覆蓋", zhHans: "部分覆盖" },
    uncovered: { zh: "未覆蓋", zhHans: "未覆盖" }
  };
  return labels[value]?.[language === "zh" ? "zh" : "zhHans"] ?? value.replace(/-/g, " ");
}

function localizedQualityCriterionLabel(criterion: TeacherCoursewareManifest["quality"]["criteria"][number], language: TeacherCoursewareLanguage) {
  if (language === "en") return criterion.label;
  const labels: Record<typeof criterion.id, { zh: string; zhHans: string }> = {
    objectives: { zh: "可觀察學習目標", zhHans: "可观察学习目标" },
    instruction: { zh: "教學內容覆蓋", zhHans: "教学内容覆盖" },
    practice: { zh: "主動練習", zhHans: "主动练习" },
    assessment: { zh: "評價證據", zhHans: "评价证据" },
    review: { zh: "教師與題目審核", zhHans: "教师与题目审核" },
    "export-readiness": { zh: "規範匯出準備", zhHans: "规范导出准备" }
  };
  return labels[criterion.id][language === "zh" ? "zh" : "zhHans"];
}

function localizedQualityIssue(issue: TeacherCoursewareManifest["quality"]["issues"][number], language: TeacherCoursewareLanguage) {
  if (language === "en") return issue.message;
  const objective = issue.objectiveId ? ` ${issue.objectiveId}` : "";
  const labels: Record<string, { zh: string; zhHans: string }> = {
    "objectives.missing": { zh: "課件缺少可觀察的學習目標。", zhHans: "课件缺少可观察的学习目标。" },
    "instruction.missing": { zh: "課件缺少支援學習目標的教學內容。", zhHans: "课件缺少支持学习目标的教学内容。" },
    "practice.missing": { zh: "課件缺少引導、獨立或課堂練習。", zhHans: "课件缺少引导、独立或课堂练习。" },
    "assessment.missing": { zh: "課件缺少可驗證學習目標的評價題目。", zhHans: "课件缺少可验证学习目标的评价题目。" },
    "assessment.needs-review": { zh: "此評價題目在發布前仍需教師複核。", zhHans: "此评价题目在发布前仍需教师复核。" },
    "ai.review-required": { zh: "AI 生成內容尚未獲教師批准。", zhHans: "AI 生成内容尚未获教师批准。" },
    "alignment.kit-level-inference": {
      zh: "目標對齊目前按整份課節包推斷；活動與題目尚未儲存明確的目標 ID。",
      zhHans: "目标对齐目前按整份课时包推断；活动与题目尚未存储明确的目标 ID。"
    }
  };
  if (labels[issue.code]) return labels[issue.code][language === "zh" ? "zh" : "zhHans"];
  if (issue.code.startsWith("alignment.")) {
    return language === "zh"
      ? `學習目標${objective}的教學、練習或評價證據尚未完整。`
      : `学习目标${objective}的教学、练习或评价证据尚未完整。`;
  }
  return issue.message;
}

export function renderTeacherCoursewareHtml(manifest: TeacherCoursewareManifest, language: TeacherCoursewareLanguage): Buffer {
  const label = language === "en"
    ? {
        objectives: "Learning objectives",
        alignment: "Instructional alignment",
        sections: "Courseware sections",
        assessment: "Assessment evidence",
        answer: "Answer",
        explanation: "Explanation",
        quality: "Teaching quality rubric",
        sources: "Source and review ledger",
        status: "Status",
        objective: "Objective",
        teach: "Teach",
        practise: "Practise",
        assess: "Assess"
      }
    : language === "zh"
      ? {
          objectives: "學習目標",
          alignment: "教學對齊",
          sections: "課件內容",
          assessment: "評價證據",
          answer: "答案",
          explanation: "解析",
          quality: "教學質量量規",
          sources: "來源與審核記錄",
          status: "狀態",
          objective: "目標",
          teach: "教學",
          practise: "練習",
          assess: "評價"
        }
      : {
        objectives: "学习目标",
        alignment: "教学对齐",
        sections: "课件内容",
        assessment: "评价证据",
        answer: "答案",
        explanation: "解析",
        quality: "教学质量量规",
        sources: "来源与审核记录",
        status: "状态",
        objective: "目标",
        teach: "教学",
        practise: "练习",
        assess: "评价"
        };
  const title = localizedHtml(manifest.identity.title, language);
  const chapter = localizedHtml(manifest.identity.chapterTitle, language);
  const hash = manifest.version.contentHash;
  const sectionMarkup = manifest.sections.map((section) => `
    <article id="${escapeHtml(section.id)}" data-courseware-section="${escapeHtml(section.id)}">
      <p class="eyebrow">${escapeHtml(localizedCoursewareTerm(section.kind, language))} · ${section.estimatedMinutes ?? "—"} min</p>
      <h3>${localizedHtml(section.title, language)}</h3>
      <p>${localizedHtml(section.content, language)}</p>
      ${section.items.length ? `<ul>${section.items.map((item) => `<li id="${escapeHtml(item.id)}">${localizedHtml(item.text, language)}</li>`).join("")}</ul>` : ""}
    </article>`).join("");
  const assessmentMarkup = manifest.assessmentItems.map((item) => `
    <article id="${escapeHtml(item.id)}" class="assessment-item">
      <p class="eyebrow">${escapeHtml(localizedCoursewareTerm(item.source, language))} · ${escapeHtml(localizedCoursewareTerm(item.validationStatus, language))}</p>
      <h3>${localizedHtml(item.prompt, language)}</h3>
      <details><summary>${label.answer}</summary><p>${escapeHtml(item.answer)}</p>${item.explanation ? `<p><strong>${label.explanation}:</strong> ${localizedHtml(item.explanation, language)}</p>` : ""}</details>
    </article>`).join("");

  const html = `<!doctype html>
<html lang="${language === "en" ? "en" : language === "zh" ? "zh-HK" : "zh-Hans"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="generator" content="MAIS canonical courseware renderer" />
  <meta name="mais-courseware-manifest-sha256" content="${hash}" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%230f172a'/%3E%3Ctext x='32' y='43' text-anchor='middle' font-size='34' fill='%23ffffff'%3EM%3C/text%3E%3C/svg%3E" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light; --ink:#0f172a; --muted:#475569; --line:#cbd5e1; --cyan:#0e7490; --paper:#f8fafc; --white:#fff; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font-family:Inter,"Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif; line-height:1.65; }
    header, main, footer { width:min(1040px,calc(100% - 32px)); margin-inline:auto; }
    header { padding:64px 0 32px; border-bottom:3px solid var(--cyan); }
    h1 { margin:8px 0 4px; font-size:clamp(2rem,5vw,4rem); line-height:1.08; }
    h2 { margin:48px 0 16px; font-size:1.65rem; }
    h3 { margin:6px 0 12px; font-size:1.15rem; }
    .eyebrow { margin:0; color:var(--cyan); font-size:.75rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
    .meta, .hash { color:var(--muted); overflow-wrap:anywhere; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:16px; }
    article, .criterion { background:var(--white); border:1px solid var(--line); border-radius:16px; padding:20px; break-inside:avoid; }
    ul, ol { padding-left:1.4rem; }
    li + li { margin-top:.45rem; }
    table { width:100%; border-collapse:collapse; background:var(--white); }
    th, td { border:1px solid var(--line); padding:10px; text-align:left; vertical-align:top; }
    summary { cursor:pointer; font-weight:800; }
    footer { padding:48px 0; font-size:.8rem; color:var(--muted); overflow-wrap:anywhere; }
    a { color:var(--cyan); }
    a:focus-visible, summary:focus-visible { outline:3px solid #22d3ee; outline-offset:3px; }
    @media print { body { background:#fff; } header, main, footer { width:auto; margin:0 14mm; } article,.criterion { box-shadow:none; } details { display:block; } details > * { display:block; } }
  </style>
</head>
<body>
  <header>
    <p class="eyebrow">${escapeHtml(manifest.identity.publisher)} · ${escapeHtml(String(manifest.identity.grade))}</p>
    <h1>${title}</h1>
    <p class="meta">${chapter} · ${manifest.identity.durationMinutes} min · ${escapeHtml(localizedCoursewareTerm(manifest.source.reviewStatus, language))}</p>
    <p class="hash">SHA-256: ${hash}</p>
  </header>
  <main>
    <section aria-labelledby="objectives-heading">
      <h2 id="objectives-heading">${label.objectives}</h2>
      <ol>${manifest.objectives.map((objective) => `<li id="${escapeHtml(objective.id)}">${localizedHtml(objective.statement, language)}</li>`).join("")}</ol>
    </section>
    <section aria-labelledby="alignment-heading">
      <h2 id="alignment-heading">${label.alignment}</h2>
      <table><thead><tr><th>${label.objective}</th><th>${label.status}</th><th>${label.teach}</th><th>${label.practise}</th><th>${label.assess}</th></tr></thead><tbody>
      ${manifest.alignment.map((entry, index) => {
        const objective = manifest.objectives.find((candidate) => candidate.id === entry.objectiveId);
        const objectiveLabel = objective ? teacherCoursewareText(objective.statement, language) : entry.objectiveId;
        return `<tr><td>${index + 1}. ${escapeHtml(objectiveLabel)}</td><td>${escapeHtml(localizedCoursewareTerm(entry.status, language))}</td><td>${entry.taughtBySectionIds.length}</td><td>${entry.practisedByActivityIds.length}</td><td>${entry.assessedByItemIds.length}</td></tr>`;
      }).join("")}
      </tbody></table>
    </section>
    <section aria-labelledby="sections-heading"><h2 id="sections-heading">${label.sections}</h2><div class="grid">${sectionMarkup}</div></section>
    <section aria-labelledby="assessment-heading"><h2 id="assessment-heading">${label.assessment}</h2><div class="grid">${assessmentMarkup || `<p>${language === "en" ? "No assessment items." : "暂无评价题目。"}</p>`}</div></section>
    <section aria-labelledby="quality-heading">
      <h2 id="quality-heading">${label.quality}: ${localizedCoursewareTerm(manifest.quality.status, language)} · ${manifest.quality.score}/${manifest.quality.possible}</h2>
      <div class="grid">${manifest.quality.criteria.map((criterion) => `<div class="criterion"><strong>${escapeHtml(localizedQualityCriterionLabel(criterion, language))}</strong><p>${criterion.earned}/${criterion.possible}</p></div>`).join("")}</div>
      <ul>${manifest.quality.issues.map((issue) => `<li><strong>${escapeHtml(localizedCoursewareTerm(issue.severity, language))}</strong> — ${escapeHtml(localizedQualityIssue(issue, language))}</li>`).join("")}</ul>
    </section>
    <section aria-labelledby="sources-heading"><h2 id="sources-heading">${label.sources}</h2><ul>${manifest.sourceLedger.map((source) => `<li>${escapeHtml(source.id)} · ${escapeHtml(localizedCoursewareTerm(source.kind, language))} · ${escapeHtml(localizedCoursewareTerm(source.reviewStatus, language))}</li>`).join("")}</ul></section>
  </main>
  <footer>MAIS ${escapeHtml(manifest.schemaVersion)} · source revision ${escapeHtml(manifest.version.sourceRevision)} · ${hash}</footer>
</body>
</html>`;
  return Buffer.from(html, "utf8");
}

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function splitText(value: string, maxLength: number) {
  const normalized = compact(value);
  if (!normalized) return [""];
  const chunks: string[] = [];
  let remaining = normalized;
  while (remaining.length > maxLength) {
    const candidate = remaining.slice(0, maxLength + 1);
    const boundary = Math.max(candidate.lastIndexOf("。"), candidate.lastIndexOf("."), candidate.lastIndexOf(" "), candidate.lastIndexOf("；"), candidate.lastIndexOf(";"));
    const cut = boundary > Math.floor(maxLength * 0.55) ? boundary + 1 : maxLength;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function addCoursewareSourceNotes(slide: any, manifest: TeacherCoursewareManifest) {
  if (typeof slide.addNotes !== "function") return;
  slide.addNotes([
    "[Sources]",
    ...manifest.sourceLedger.map((source) => `- ${source.id} | ${source.kind} | ${source.reviewStatus} | ${source.sourceIds.join(", ")}`),
    `- Canonical manifest SHA-256: ${manifest.version.contentHash}`
  ].join("\n"));
}

function addSlideFrame(slide: any, heading: string, manifest: TeacherCoursewareManifest, language: TeacherCoursewareLanguage, continuation = false) {
  slide.background = { color: palette.background };
  slide.addShape("rect", { x: 0, y: 0, w: slideWidth, h: 0.22, fill: { color: palette.navy }, line: { color: palette.navy } });
  slide.addText(`${heading}${continuation ? (language === "en" ? " (continued)" : "（续）") : ""}`, { x: 0.58, y: 0.42, w: 11.15, h: 0.66, fontFace: language === "en" ? "Arial" : "Microsoft YaHei", fontSize: 35, bold: true, color: palette.ink, fit: "shrink", margin: 0 });
  slide.addText(manifest.version.contentHash.slice(0, 12), { x: 11.45, y: 0.04, w: 1.35, h: 0.12, fontFace: "Courier New", fontSize: 6, color: "CFFAFE", align: "right", margin: 0 });
  slide.addShape("line", { x: 0.45, y: 7.05, w: 12.4, h: 0, line: { color: palette.line, width: 0.6 } });
  slide.addText(`${manifest.schemaVersion} · ${manifest.source.kitId}`, { x: 0.45, y: 7.12, w: 8.8, h: 0.18, fontSize: 7, color: palette.muted, margin: 0 });
  addCoursewareSourceNotes(slide, manifest);
}

function addBulletText(slide: any, values: string[], language: TeacherCoursewareLanguage, x = 0.8, y = 1.35, w = 11.7, h = 5.35) {
  const runs = values.filter(Boolean).map((value) => ({ text: value, options: { bullet: { type: "bullet" }, breakLine: true } }));
  slide.addText(runs.length ? runs : [{ text: language === "en" ? "No content" : "暂无内容" }], {
    x, y, w, h,
    fontFace: language === "en" ? "Arial" : "Microsoft YaHei",
    fontSize: 20,
    color: palette.ink,
    breakLine: false,
    fit: "shrink",
    valign: "top",
    margin: 0.08,
    paraSpaceAfterPt: 7
  });
}

export async function renderTeacherCoursewarePptx(manifest: TeacherCoursewareManifest, language: TeacherCoursewareLanguage): Promise<Buffer> {
  const pptxModule = await import("pptxgenjs");
  const PptxGenJS = (pptxModule.default ?? pptxModule) as any;
  const pptx = new PptxGenJS();
  const fontFace = language === "en" ? "Arial" : "Microsoft YaHei";
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "MAIS";
  pptx.company = "MAIS";
  pptx.title = teacherCoursewareText(manifest.identity.title, language);
  pptx.subject = `${manifest.schemaVersion}; sha256=${manifest.version.contentHash}`;
  pptx.lang = language === "en" ? "en-US" : language === "zh" ? "zh-HK" : "zh-CN";
  pptx.theme = { headFontFace: fontFace, bodyFontFace: fontFace, lang: pptx.lang };

  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: palette.background };
  titleSlide.addShape("rect", { x: 0, y: 0, w: slideWidth, h: 1.05, fill: { color: palette.navy }, line: { color: palette.navy } });
  titleSlide.addText(teacherCoursewareText(manifest.identity.title, language), { x: 0.75, y: 1.42, w: 11.8, h: 1.35, fontFace, fontSize: 50, bold: true, color: palette.ink, fit: "shrink", margin: 0 });
  titleSlide.addText(`${teacherCoursewareText(manifest.identity.chapterTitle, language)} · ${manifest.identity.durationMinutes} min`, { x: 0.78, y: 2.95, w: 11.5, h: 0.45, fontFace, fontSize: 24, color: palette.muted, margin: 0 });
  titleSlide.addText(`${localizedCoursewareTerm(manifest.source.reviewStatus, language)} · ${localizedCoursewareTerm(manifest.quality.status, language)} · ${manifest.quality.score}/${manifest.quality.possible}`, { x: 0.78, y: 3.75, w: 9.4, h: 0.5, fontFace, fontSize: 24, bold: true, color: manifest.quality.status === "blocked" ? palette.red : manifest.quality.status === "ready" ? palette.emerald : palette.amber, margin: 0 });
  titleSlide.addText(`SHA-256\n${manifest.version.contentHash}`, { x: 0.8, y: 5.35, w: 11.5, h: 0.52, fontFace: "Courier New", fontSize: 8, color: palette.muted, margin: 0 });
  addCoursewareSourceNotes(titleSlide, manifest);

  const objectiveChunks: string[][] = [];
  const objectiveLines = manifest.objectives.map((objective) => teacherCoursewareText(objective.statement, language));
  for (let index = 0; index < objectiveLines.length; index += 6) objectiveChunks.push(objectiveLines.slice(index, index + 6));
  for (const [index, values] of (objectiveChunks.length ? objectiveChunks : [[]]).entries()) {
    const slide = pptx.addSlide();
    addSlideFrame(slide, language === "en" ? "Learning objectives" : "学习目标", manifest, language, index > 0);
    addBulletText(slide, values, language);
  }

  for (const section of manifest.sections.filter((candidate) => candidate.kind !== "objectives")) {
    const heading = teacherCoursewareText(section.title, language);
    const contentChunks = splitText(teacherCoursewareText(section.content, language), 720);
    const itemLines = section.items.flatMap((item) => splitText(teacherCoursewareText(item.text, language), 240));
    const pages = Math.max(contentChunks.length, Math.ceil(itemLines.length / 6), 1);
    for (let page = 0; page < pages; page += 1) {
      const slide = pptx.addSlide();
      addSlideFrame(slide, heading, manifest, language, page > 0);
      const body = contentChunks[page] ?? "";
      slide.addText(body, { x: 0.75, y: 1.35, w: 11.8, h: 1.5, fontFace, fontSize: 20, color: palette.ink, fit: "shrink", valign: "top", margin: 0.08 });
      addBulletText(slide, itemLines.slice(page * 6, page * 6 + 6), language, 0.82, 3.05, 11.65, 3.45);
    }
  }

  for (const item of manifest.assessmentItems) {
    const slide = pptx.addSlide();
    addSlideFrame(slide, language === "en" ? "Assessment evidence" : "评价证据", manifest, language);
    slide.addText(teacherCoursewareText(item.prompt, language), { x: 0.75, y: 1.35, w: 11.8, h: 1.35, fontFace, fontSize: 26, bold: true, color: palette.ink, fit: "shrink", margin: 0.08 });
    slide.addText(`${language === "en" ? "Answer" : "答案"}: ${item.answer}`, { x: 0.8, y: 2.95, w: 11.6, h: 0.75, fontFace, fontSize: 22, bold: true, color: palette.emerald, fit: "shrink", margin: 0.05 });
    if (item.explanation) {
      slide.addText(`${language === "en" ? "Explanation" : "解析"}: ${teacherCoursewareText(item.explanation, language)}`, { x: 0.8, y: 3.95, w: 11.6, h: 1.65, fontFace, fontSize: 18, color: palette.muted, fit: "shrink", valign: "top", margin: 0.05 });
    }
    slide.addText(`${localizedCoursewareTerm(item.source, language)} · ${localizedCoursewareTerm(item.validationStatus, language)}`, { x: 0.8, y: 6.2, w: 11.5, h: 0.25, fontFace, fontSize: 10, color: palette.muted, margin: 0 });
  }

  const qualitySlide = pptx.addSlide();
  addSlideFrame(qualitySlide, language === "en" ? "Teacher appendix: quality rubric" : language === "zh" ? "教師附錄：教學質量量規" : "教师附录：教学质量量规", manifest, language);
  addBulletText(qualitySlide, [
    `${localizedCoursewareTerm(manifest.quality.status, language)}: ${manifest.quality.score}/${manifest.quality.possible}`,
    ...manifest.quality.criteria.map((criterion) => `${localizedQualityCriterionLabel(criterion, language)}: ${criterion.earned}/${criterion.possible}`),
    ...manifest.quality.issues.map((issue) => `${localizedCoursewareTerm(issue.severity, language)}: ${localizedQualityIssue(issue, language)}`)
  ], language, 0.75, 1.35, 11.8, 5.35);

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}

const coursewarePdfFontFiles: Record<TeacherCoursewareLanguage, string> = {
  en: "NotoSansSC-Regular.otf",
  zh: "NotoSansTC-Regular.otf",
  "zh-Hans": "NotoSansSC-Regular.otf"
};
const coursewarePdfFontBuffers = new Map<string, Promise<Buffer>>();

function loadCoursewarePdfFont(language: TeacherCoursewareLanguage) {
  const fileName = coursewarePdfFontFiles[language];
  const existing = coursewarePdfFontBuffers.get(fileName);
  if (existing) return existing;
  const pending = readFile(path.resolve(process.cwd(), "assets", "fonts", fileName));
  coursewarePdfFontBuffers.set(fileName, pending);
  return pending;
}

function coursewarePdfLabels(language: TeacherCoursewareLanguage) {
  if (language === "en") {
    return {
      objectives: "Learning objectives",
      alignment: "Instructional alignment",
      sections: "Courseware sections",
      assessment: "Assessment evidence",
      quality: "Teacher appendix · quality rubric",
      sources: "Source and review ledger",
      answer: "Answer",
      explanation: "Explanation",
      objective: "Objective",
      status: "Status",
      teach: "Teach",
      practise: "Practise",
      assess: "Assess",
      noAssessment: "No assessment items are present in the canonical manifest.",
      duration: "Duration",
      period: "Lesson period",
      review: "Review status"
    };
  }
  if (language === "zh") {
    return {
      objectives: "學習目標",
      alignment: "教學對齊",
      sections: "課件內容",
      assessment: "評價證據",
      quality: "教師附錄 · 教學質量量規",
      sources: "來源與審核記錄",
      answer: "答案",
      explanation: "解析",
      objective: "目標",
      status: "狀態",
      teach: "教學",
      practise: "練習",
      assess: "評價",
      noAssessment: "規範課件清單中暫無評價題目。",
      duration: "時長",
      period: "課時",
      review: "審核狀態"
    };
  }
  return {
    objectives: "学习目标",
    alignment: "教学对齐",
    sections: "课件内容",
    assessment: "评价证据",
    quality: "教师附录 · 教学质量量规",
    sources: "来源与审核记录",
    answer: "答案",
    explanation: "解析",
    objective: "目标",
    status: "状态",
    teach: "教学",
    practise: "练习",
    assess: "评价",
    noAssessment: "规范课件清单中暂无评价题目。",
    duration: "时长",
    period: "课时",
    review: "审核状态"
  };
}

function stablePdfDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date("2000-01-01T00:00:00.000Z") : date;
}

export async function renderTeacherCoursewarePdf(
  manifest: TeacherCoursewareManifest,
  language: TeacherCoursewareLanguage
): Promise<Buffer> {
  const font = await loadCoursewarePdfFont(language);
  const title = teacherCoursewareText(manifest.identity.title, language);
  const labels = coursewarePdfLabels(language);
  const document = new PDFDocument({
    size: "A4",
    margins: { top: 54, right: 54, bottom: 62, left: 54 },
    bufferPages: true,
    compress: true,
    displayTitle: true,
    lang: language === "en" ? "en-US" : language === "zh" ? "zh-Hant" : "zh-Hans",
    pdfVersion: "1.7",
    info: {
      Title: title,
      Author: "MAIS",
      Creator: "MAIS canonical courseware renderer",
      Producer: "MAIS canonical courseware renderer · PDFKit",
      Subject: manifest.schemaVersion,
      Keywords: manifest.version.contentHash,
      CreationDate: stablePdfDate(manifest.source.updatedAt),
      ModDate: stablePdfDate(manifest.source.updatedAt)
    }
  });
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => {
    document.on("data", (chunk: Buffer | Uint8Array) => chunks.push(Buffer.from(chunk)));
    document.once("end", () => resolve(Buffer.concat(chunks)));
    document.once("error", reject);
  });
  const fontName = "MAIS-Noto-Sans-CJK";
  document.registerFont(fontName, font);
  document.font(fontName);

  const pageLeft = document.page.margins.left;
  const pageRight = document.page.margins.right;
  const contentWidth = document.page.width - pageLeft - pageRight;
  const ink = `#${palette.ink}`;
  const muted = `#${palette.muted}`;
  const line = `#${palette.line}`;
  const navy = `#${palette.navy}`;
  const cyan = `#${palette.cyan}`;
  const emerald = `#${palette.emerald}`;
  const amber = `#${palette.amber}`;
  const red = `#${palette.red}`;
  const paper = `#${palette.background}`;

  function bottomEdge() {
    return document.page.height - document.page.margins.bottom;
  }

  function ensureSpace(height: number) {
    const usableHeight = document.page.height - document.page.margins.top - document.page.margins.bottom;
    if (height <= usableHeight && document.y + height > bottomEdge()) document.addPage();
  }

  function addSectionHeading(value: string) {
    ensureSpace(46);
    if (document.y > document.page.margins.top + 4) document.moveDown(0.85);
    const y = document.y;
    document.rect(pageLeft, y + 1, 4, 23).fill(cyan);
    document.fillColor(navy).font(fontName).fontSize(18).text(value, pageLeft + 14, y, {
      width: contentWidth - 14,
      lineGap: 1
    });
    document.y = Math.max(document.y, y + 30);
  }

  function addParagraph(value: string, options: { color?: string; size?: number; indent?: number; gap?: number } = {}) {
    const normalized = compact(value);
    if (!normalized) return;
    const size = options.size ?? 10.5;
    const indent = options.indent ?? 0;
    const width = contentWidth - indent;
    document.font(fontName).fontSize(size);
    const height = document.heightOfString(normalized, { width, lineGap: 3 });
    ensureSpace(height + (options.gap ?? 7));
    document.fillColor(options.color ?? ink).text(normalized, pageLeft + indent, document.y, {
      width,
      lineGap: 3
    });
    document.moveDown((options.gap ?? 7) / Math.max(document.currentLineHeight(), 1));
  }

  function addBullet(value: string, accent = cyan) {
    const normalized = compact(value);
    if (!normalized) return;
    document.font(fontName).fontSize(10.5);
    const textWidth = contentWidth - 22;
    const height = document.heightOfString(normalized, { width: textWidth, lineGap: 3 });
    ensureSpace(height + 8);
    const y = document.y;
    document.fillColor(accent).fontSize(12).text("•", pageLeft + 2, y - 1, { width: 12, lineBreak: false });
    document.fillColor(ink).fontSize(10.5).text(normalized, pageLeft + 22, y, { width: textWidth, lineGap: 3 });
    document.y = Math.max(document.y, y + height) + 7;
  }

  function addTableRow(cells: string[], widths: number[], header = false) {
    const fontSize = header ? 8.5 : 8.25;
    document.font(fontName).fontSize(fontSize);
    const heights = cells.map((cell, index) => document.heightOfString(compact(cell), {
      width: widths[index] - 10,
      lineGap: 2
    }));
    const rowHeight = Math.max(header ? 27 : 25, ...heights.map((height) => height + 10));
    ensureSpace(rowHeight);
    const y = document.y;
    document.rect(pageLeft, y, contentWidth, rowHeight).fillAndStroke(header ? navy : "#FFFFFF", line);
    let x = pageLeft;
    cells.forEach((cell, index) => {
      if (index) document.moveTo(x, y).lineTo(x, y + rowHeight).stroke(line);
      document.fillColor(header ? "#FFFFFF" : ink).fontSize(fontSize).text(compact(cell), x + 5, y + 5, {
        width: widths[index] - 10,
        height: rowHeight - 10,
        lineGap: 2
      });
      x += widths[index];
    });
    document.y = y + rowHeight;
  }

  document.rect(0, 0, document.page.width, 92).fill(navy);
  document.fillColor("#FFFFFF").fontSize(9).text(
    `${manifest.identity.publisher} · ${language === "en" ? "Grade" : "年级"} ${manifest.identity.grade}`,
    pageLeft,
    40,
    { width: contentWidth, characterSpacing: 0.7 }
  );
  document.y = 132;
  document.fillColor(ink).fontSize(28).text(title, pageLeft, document.y, { width: contentWidth, lineGap: 3 });
  document.moveDown(0.55);
  document.fillColor(muted).fontSize(14).text(teacherCoursewareText(manifest.identity.chapterTitle, language), {
    width: contentWidth,
    lineGap: 2
  });
  document.moveDown(1.2);
  const qualityColor = manifest.quality.status === "blocked" ? red : manifest.quality.status === "ready" ? emerald : amber;
  document.fillColor(qualityColor).fontSize(12).text(
    `${localizedCoursewareTerm(manifest.quality.status, language)} · ${manifest.quality.score}/${manifest.quality.possible}`,
    { width: contentWidth }
  );
  document.moveDown(0.65);
  document.fillColor(muted).fontSize(9.5).text(
    `${labels.duration}: ${manifest.identity.durationMinutes} min   ·   ${labels.period}: ${manifest.identity.lessonPeriod}   ·   ${labels.review}: ${localizedCoursewareTerm(manifest.source.reviewStatus, language)}`,
    { width: contentWidth, lineGap: 2 }
  );
  document.moveDown(0.55);
  document.fillColor(muted).fontSize(7.5).text(`SHA-256  ${manifest.version.contentHash}`, {
    width: contentWidth,
    lineGap: 2
  });

  addSectionHeading(labels.objectives);
  for (const objective of manifest.objectives) addBullet(teacherCoursewareText(objective.statement, language));

  addSectionHeading(labels.alignment);
  const tableWidths = [contentWidth * 0.48, contentWidth * 0.19, contentWidth * 0.11, contentWidth * 0.11, contentWidth * 0.11];
  addTableRow([labels.objective, labels.status, labels.teach, labels.practise, labels.assess], tableWidths, true);
  manifest.alignment.forEach((entry, index) => {
    const objective = manifest.objectives.find((candidate) => candidate.id === entry.objectiveId);
    addTableRow([
      `${index + 1}. ${objective ? teacherCoursewareText(objective.statement, language) : entry.objectiveId}`,
      localizedCoursewareTerm(entry.status, language),
      String(entry.taughtBySectionIds.length),
      String(entry.practisedByActivityIds.length),
      String(entry.assessedByItemIds.length)
    ], tableWidths);
  });

  addSectionHeading(labels.sections);
  for (const section of manifest.sections) {
    ensureSpace(64);
    document.fillColor(cyan).fontSize(8.5).text(
      `${localizedCoursewareTerm(section.kind, language)}${section.estimatedMinutes ? ` · ${section.estimatedMinutes} min` : ""}`,
      { width: contentWidth, characterSpacing: 0.35 }
    );
    document.moveDown(0.2);
    document.fillColor(ink).fontSize(14.5).text(teacherCoursewareText(section.title, language), {
      width: contentWidth,
      lineGap: 2
    });
    document.moveDown(0.35);
    addParagraph(teacherCoursewareText(section.content, language), { color: muted, size: 10.5, gap: 6 });
    for (const item of section.items) addBullet(teacherCoursewareText(item.text, language), emerald);
    document.moveDown(0.45);
  }

  addSectionHeading(labels.assessment);
  if (!manifest.assessmentItems.length) addParagraph(labels.noAssessment, { color: muted });
  for (const item of manifest.assessmentItems) {
    ensureSpace(104);
    const y = document.y;
    document.rect(pageLeft, y, 4, 84).fill(emerald);
    document.fillColor(muted).fontSize(8.5).text(
      `${localizedCoursewareTerm(item.source, language)} · ${localizedCoursewareTerm(item.validationStatus, language)}`,
      pageLeft + 16,
      y,
      { width: contentWidth - 16, characterSpacing: 0.25 }
    );
    document.moveDown(0.35);
    document.fillColor(ink).fontSize(12.5).text(teacherCoursewareText(item.prompt, language), pageLeft + 16, document.y, {
      width: contentWidth - 16,
      lineGap: 3
    });
    document.moveDown(0.45);
    document.fillColor(emerald).fontSize(10.5).text(`${labels.answer}: ${item.answer}`, pageLeft + 16, document.y, {
      width: contentWidth - 16,
      lineGap: 3
    });
    if (item.explanation) {
      document.moveDown(0.3);
      document.fillColor(muted).fontSize(9.75).text(
        `${labels.explanation}: ${teacherCoursewareText(item.explanation, language)}`,
        pageLeft + 16,
        document.y,
        { width: contentWidth - 16, lineGap: 3 }
      );
    }
    document.moveDown(0.95);
  }

  addSectionHeading(labels.quality);
  document.fillColor(qualityColor).fontSize(12).text(
    `${localizedCoursewareTerm(manifest.quality.status, language)} · ${manifest.quality.score}/${manifest.quality.possible}`,
    { width: contentWidth }
  );
  document.moveDown(0.55);
  const qualityWidths = [contentWidth * 0.72, contentWidth * 0.28];
  manifest.quality.criteria.forEach((criterion) => addTableRow([
    localizedQualityCriterionLabel(criterion, language),
    `${criterion.earned}/${criterion.possible}`
  ], qualityWidths));
  if (manifest.quality.issues.length) {
    document.moveDown(0.65);
    for (const issue of manifest.quality.issues) {
      addBullet(
        `${localizedCoursewareTerm(issue.severity, language)} · ${localizedQualityIssue(issue, language)}`,
        issue.severity === "error" ? red : amber
      );
    }
  }

  addSectionHeading(labels.sources);
  for (const source of manifest.sourceLedger) {
    addBullet(
      `${source.id} · ${localizedCoursewareTerm(source.kind, language)} · ${localizedCoursewareTerm(source.reviewStatus, language)} · ${source.sourceIds.join(", ")}`,
      muted
    );
  }

  const pageRange = document.bufferedPageRange();
  for (let offset = 0; offset < pageRange.count; offset += 1) {
    document.switchToPage(pageRange.start + offset);
    const footerY = document.page.height - 35;
    const originalBottomMargin = document.page.margins.bottom;
    document.page.margins.bottom = 0;
    document.moveTo(pageLeft, footerY - 9).lineTo(document.page.width - pageRight, footerY - 9).stroke(line);
    document.font(fontName).fillColor(muted).fontSize(7).text(
      `${manifest.schemaVersion} · ${manifest.version.contentHash.slice(0, 16)}`,
      pageLeft,
      footerY,
      { width: contentWidth * 0.76, lineBreak: false }
    );
    document.text(`${offset + 1}/${pageRange.count}`, pageLeft + contentWidth * 0.76, footerY, {
      width: contentWidth * 0.24,
      align: "right",
      lineBreak: false
    });
    document.page.margins.bottom = originalBottomMargin;
  }

  document.end();
  return completed;
}

export async function renderTeacherCoursewareExport(
  manifest: TeacherCoursewareManifest,
  format: TeacherCoursewareFormat,
  language: TeacherCoursewareLanguage
): Promise<TeacherCoursewareRenderedExport> {
  if (format === "html") return { bytes: renderTeacherCoursewareHtml(manifest, language), extension: "html", mimeType: "text/html; charset=utf-8" };
  if (format === "pdf") return { bytes: await renderTeacherCoursewarePdf(manifest, language), extension: "pdf", mimeType: "application/pdf" };
  return { bytes: await renderTeacherCoursewarePptx(manifest, language), extension: "pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
}

export function teacherCoursewareManifestJson(manifest: TeacherCoursewareManifest) {
  return Buffer.from(`${stableTeacherCoursewareJson(manifest)}\n`, "utf8");
}
