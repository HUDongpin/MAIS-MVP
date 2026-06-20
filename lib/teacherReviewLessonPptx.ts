import type {
  Language,
  LocalizedText,
  TeacherReviewLessonItem,
  TeacherReviewLessonItemCategory,
  TeacherReviewLessonPlan,
  TeacherReviewLessonPracticeQuestion
} from "@/types";

const slideWidth = 13.333;
const slideHeight = 7.5;
const colors = {
  background: "FAFBFC",
  ink: "111827",
  muted: "4B5563",
  line: "CBD5E1",
  teal: "0F766E",
  blue: "2563EB",
  amber: "B45309",
  red: "B91C1C",
  green: "15803D",
  white: "FFFFFF"
};

function text(value: LocalizedText | string | undefined | null, language: Language) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (language === "zh-Hans") return value.zhHans ?? value.zh ?? value.en;
  if (language === "zh") return value.zh ?? value.zhHans ?? value.en;
  return value.en || value.zhHans || value.zh || "";
}

function truncate(value: string, maxLength: number) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function pct(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}%` : "n/a";
}

function categoryLabel(category: TeacherReviewLessonItemCategory, language: Language) {
  const labels: Record<TeacherReviewLessonItemCategory, LocalizedText> = {
    "must-teach": { en: "Must teach", zh: "必讲题", zhHans: "必讲题" },
    "quick-review": { en: "Quick review", zh: "可略讲题", zhHans: "可略讲题" },
    "individual-support": { en: "Individual support", zh: "个别辅导题", zhHans: "个别辅导题" }
  };
  return text(labels[category], language);
}

function categoryColor(category: TeacherReviewLessonItemCategory) {
  if (category === "must-teach") return colors.red;
  if (category === "quick-review") return colors.amber;
  return colors.blue;
}

function addBackground(slide: any) {
  slide.background = { color: colors.background };
}

function addHeader(slide: any, title: string, subtitle?: string) {
  slide.addShape("rect", { x: 0, y: 0, w: slideWidth, h: 0.52, fill: { color: colors.teal }, line: { color: colors.teal } });
  slide.addText(title, {
    x: 0.45,
    y: 0.13,
    w: 8.9,
    h: 0.26,
    fontFace: "Arial",
    fontSize: 14,
    bold: true,
    color: colors.white,
    margin: 0
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 9.35,
      y: 0.15,
      w: 3.45,
      h: 0.24,
      fontFace: "Arial",
      fontSize: 9,
      color: "D1FAE5",
      align: "right",
      margin: 0
    });
  }
}

function addFooter(slide: any, plan: TeacherReviewLessonPlan) {
  slide.addShape("line", { x: 0.45, y: 7.04, w: 12.45, h: 0, line: { color: colors.line, width: 0.6 } });
  slide.addText(`${plan.className} | ${new Date(plan.generatedAt).toLocaleDateString("en-CA")}`, {
    x: 0.45,
    y: 7.12,
    w: 6.5,
    h: 0.2,
    fontSize: 7.5,
    color: colors.muted,
    margin: 0
  });
  slide.addText("Individual student names omitted from PPT export.", {
    x: 7.0,
    y: 7.12,
    w: 5.9,
    h: 0.2,
    fontSize: 7.5,
    color: colors.muted,
    align: "right",
    margin: 0
  });
}

function addBullets(slide: any, bullets: string[], x: number, y: number, w: number, h: number, options: Record<string, unknown> = {}) {
  const lines = bullets.filter(Boolean).slice(0, 8).map((line) => ({ text: line, options: { bullet: { type: "bullet" } } }));
  slide.addText(lines.length ? lines : [{ text: "No items", options: { bullet: { type: "bullet" } } }], {
    x,
    y,
    w,
    h,
    fontFace: "Arial",
    fontSize: 11,
    color: colors.ink,
    breakLine: false,
    fit: "shrink",
    margin: 0.04,
    paraSpaceAfterPt: 6,
    ...options
  });
}

function addMetricCard(slide: any, label: string, value: string, x: number, y: number, w: number, color: string) {
  slide.addShape("rect", {
    x,
    y,
    w,
    h: 0.82,
    rectRadius: 0.04,
    fill: { color: colors.white },
    line: { color }
  });
  slide.addText(value, { x: x + 0.1, y: y + 0.13, w: w - 0.2, h: 0.28, fontSize: 17, bold: true, color, align: "center", margin: 0 });
  slide.addText(label, { x: x + 0.08, y: y + 0.48, w: w - 0.16, h: 0.2, fontSize: 7.8, color: colors.muted, align: "center", margin: 0 });
}

function groupedItems(plan: TeacherReviewLessonPlan, category: TeacherReviewLessonItemCategory) {
  return plan.items
    .filter((item) => item.category === category)
    .sort((a, b) => a.order - b.order);
}

function statsLine(item: TeacherReviewLessonItem, language: Language) {
  const wrong = language === "en" ? "wrong" : "错";
  const responses = language === "en" ? "responses" : "有效作答";
  const common = item.commonWrongAnswer
    ? `${language === "en" ? "common wrong" : "高频错答"}: ${item.commonWrongAnswer} (${item.commonWrongAnswerCount})`
    : language === "en" ? "no repeated wrong answer" : "无集中错答";
  return `${pct(item.correctRate)} | ${item.wrongCount} ${wrong} / ${item.totalResponses} ${responses} | ${common}`;
}

function addTitleSlide(pptx: any, plan: TeacherReviewLessonPlan) {
  const slide = pptx.addSlide();
  addBackground(slide);
  slide.addShape("rect", { x: 0, y: 0, w: slideWidth, h: slideHeight, fill: { color: colors.background }, line: { color: colors.background } });
  slide.addShape("rect", { x: 0, y: 0, w: slideWidth, h: 1.0, fill: { color: colors.teal }, line: { color: colors.teal } });
  slide.addText(text(plan.title, plan.language), {
    x: 0.7,
    y: 1.45,
    w: 10.2,
    h: 0.65,
    fontFace: "Arial",
    fontSize: 27,
    bold: true,
    color: colors.ink,
    fit: "shrink",
    margin: 0
  });
  slide.addText([
    `${plan.className}`,
    text(plan.sourceSnapshot.assessmentTitle, plan.language),
    `${plan.sourceSnapshot.submittedCount}/${plan.sourceSnapshot.totalStudents} submissions`
  ].join(" | "), {
    x: 0.72,
    y: 2.26,
    w: 10.7,
    h: 0.28,
    fontSize: 11,
    color: colors.muted,
    margin: 0
  });
  addMetricCard(slide, categoryLabel("must-teach", plan.language), String(groupedItems(plan, "must-teach").length), 0.75, 3.1, 2.4, colors.red);
  addMetricCard(slide, categoryLabel("quick-review", plan.language), String(groupedItems(plan, "quick-review").length), 3.5, 3.1, 2.4, colors.amber);
  addMetricCard(slide, categoryLabel("individual-support", plan.language), String(groupedItems(plan, "individual-support").length), 6.25, 3.1, 2.4, colors.blue);
  addMetricCard(slide, "Duration", `${plan.durationMinutes} min`, 9.0, 3.1, 2.4, colors.green);
  addBullets(
    slide,
    plan.objectives.map((objective) => truncate(text(objective, plan.language), 90)),
    0.75,
    4.35,
    11.7,
    1.65,
    { fontSize: 12 }
  );
  addFooter(slide, plan);
}

function addObjectivesSlide(pptx: any, plan: TeacherReviewLessonPlan) {
  const slide = pptx.addSlide();
  addBackground(slide);
  addHeader(slide, "Review lesson flow", `${plan.durationMinutes} min`);
  addBullets(
    slide,
    plan.timeline.map((item) => `${item.minutes} min - ${truncate(text(item.label, plan.language), 90)}`),
    0.7,
    1.0,
    5.6,
    5.5,
    { fontSize: 12 }
  );
  slide.addText("Generation notes", { x: 7.0, y: 1.0, w: 5.2, h: 0.28, fontSize: 15, bold: true, color: colors.teal, margin: 0 });
  slide.addText(text(plan.generationNotes, plan.language), {
    x: 7.0,
    y: 1.42,
    w: 5.3,
    h: 1.4,
    fontSize: 11,
    color: colors.ink,
    fit: "shrink",
    valign: "top",
    margin: 0.04
  });
  slide.addText("Source snapshot", { x: 7.0, y: 3.25, w: 5.2, h: 0.28, fontSize: 15, bold: true, color: colors.teal, margin: 0 });
  addBullets(slide, [
    `Assessment updated: ${new Date(plan.sourceSnapshot.assessmentUpdatedAt).toLocaleString("en-CA")}`,
    `Generated: ${new Date(plan.generatedAt).toLocaleString("en-CA")}`,
    `Questions: ${plan.sourceSnapshot.questionCount}`,
    `Snapshot stale: ${plan.sourceSnapshotStale ? "yes" : "no"}`
  ], 7.0, 3.65, 5.35, 2.2, { fontSize: 11 });
  addFooter(slide, plan);
}

function addCategorySummarySlide(pptx: any, plan: TeacherReviewLessonPlan) {
  const slide = pptx.addSlide();
  addBackground(slide);
  addHeader(slide, "Question triage", text(plan.sourceSnapshot.assessmentTitle, plan.language));
  const columns: Array<[TeacherReviewLessonItemCategory, number]> = [
    ["must-teach", 0.65],
    ["quick-review", 4.65],
    ["individual-support", 8.65]
  ];
  columns.forEach(([category, x]) => {
    const items = groupedItems(plan, category).slice(0, 5);
    const color = categoryColor(category);
    slide.addShape("rect", { x, y: 1.0, w: 3.55, h: 5.75, fill: { color: colors.white }, line: { color } });
    slide.addText(categoryLabel(category, plan.language), { x: x + 0.15, y: 1.17, w: 3.25, h: 0.28, fontSize: 14, bold: true, color, margin: 0 });
    addBullets(
      slide,
      items.map((item) => `${truncate(text(item.prompt, plan.language), 72)} (${pct(item.correctRate)})`),
      x + 0.2,
      1.65,
      3.15,
      4.55,
      { fontSize: 9.5 }
    );
  });
  addFooter(slide, plan);
}

function addItemSlides(pptx: any, plan: TeacherReviewLessonPlan) {
  const focusItems = plan.items
    .filter((item) => item.category !== "individual-support")
    .sort((a, b) => a.order - b.order)
    .slice(0, 12);
  for (const item of focusItems) {
    const slide = pptx.addSlide();
    addBackground(slide);
    addHeader(slide, categoryLabel(item.category, plan.language), statsLine(item, plan.language));
    slide.addText(truncate(text(item.prompt, plan.language), 360), {
      x: 0.7,
      y: 0.9,
      w: 7.6,
      h: 1.2,
      fontSize: 16,
      bold: true,
      color: colors.ink,
      fit: "shrink",
      margin: 0.04
    });
    addBullets(slide, [
      `${plan.language === "en" ? "Correct answer" : "正确答案"}: ${item.correctAnswer ?? "n/a"}`,
      truncate(text(item.categoryReason, plan.language), 130),
      `${plan.language === "en" ? "Misconception tags" : "错因标签"}: ${item.misconceptionTags.join(", ")}`
    ], 0.75, 2.35, 4.95, 2.1, { fontSize: 10.5 });
    slide.addText(plan.language === "en" ? "Teaching script" : "讲解脚本", {
      x: 6.15,
      y: 2.35,
      w: 2.8,
      h: 0.28,
      fontSize: 14,
      bold: true,
      color: colors.teal,
      margin: 0
    });
    slide.addText(truncate(text(item.teachingScript, plan.language), 520), {
      x: 6.15,
      y: 2.75,
      w: 5.95,
      h: 2.25,
      fontSize: 10.5,
      color: colors.ink,
      fit: "shrink",
      valign: "top",
      margin: 0.05
    });
    if (item.explanation) {
      slide.addText(plan.language === "en" ? "Reference explanation" : "参考解析", {
        x: 0.75,
        y: 5.15,
        w: 3,
        h: 0.24,
        fontSize: 11,
        bold: true,
        color: colors.teal,
        margin: 0
      });
      slide.addText(truncate(text(item.explanation, plan.language), 260), {
        x: 0.75,
        y: 5.45,
        w: 11.35,
        h: 0.78,
        fontSize: 9,
        color: colors.muted,
        fit: "shrink",
        margin: 0.04
      });
    }
    if (typeof slide.addNotes === "function") slide.addNotes(text(item.teacherNotes, plan.language));
    addFooter(slide, plan);
  }
}

function addBoardSlide(pptx: any, plan: TeacherReviewLessonPlan) {
  const slide = pptx.addSlide();
  addBackground(slide);
  addHeader(slide, "Board plan", "print-friendly");
  const columns = plan.boardColumns.slice(0, 3);
  const width = 3.9;
  columns.forEach((column, index) => {
    const x = 0.7 + index * 4.15;
    slide.addShape("rect", { x, y: 1.0, w: width, h: 5.75, fill: { color: colors.white }, line: { color: colors.line } });
    slide.addText(text(column.title, plan.language), { x: x + 0.16, y: 1.16, w: width - 0.32, h: 0.3, fontSize: 13, bold: true, color: colors.teal, margin: 0 });
    addBullets(
      slide,
      column.blocks.map((block) => truncate(text(block, plan.language), 110)),
      x + 0.22,
      1.68,
      width - 0.44,
      4.7,
      { fontSize: 9.8 }
    );
  });
  addFooter(slide, plan);
}

function practiceLine(question: TeacherReviewLessonPracticeQuestion, language: Language) {
  const status = question.validationStatus === "validated"
    ? (language === "en" ? "reviewed" : "已确认")
    : (language === "en" ? "needs review" : "待确认");
  return `${truncate(text(question.prompt, language), 90)} [${status}]`;
}

function addPracticeSlide(pptx: any, plan: TeacherReviewLessonPlan) {
  const slide = pptx.addSlide();
  addBackground(slide);
  addHeader(slide, "Variation and remediation", "teacher review required for generated items");
  slide.addText("Same-type variation", { x: 0.7, y: 1.0, w: 5.5, h: 0.28, fontSize: 15, bold: true, color: colors.teal, margin: 0 });
  addBullets(slide, plan.variationQuestions.slice(0, 6).map((question) => practiceLine(question, plan.language)), 0.75, 1.45, 5.45, 4.8, { fontSize: 10 });
  slide.addText("After-class remediation", { x: 6.8, y: 1.0, w: 5.5, h: 0.28, fontSize: 15, bold: true, color: colors.teal, margin: 0 });
  addBullets(slide, plan.remediationQuestions.slice(0, 6).map((question) => practiceLine(question, plan.language)), 6.85, 1.45, 5.45, 4.8, { fontSize: 10 });
  addFooter(slide, plan);
}

export async function renderTeacherReviewLessonPptx(plan: TeacherReviewLessonPlan): Promise<Buffer> {
  const pptxModule = await import("pptxgenjs");
  const PptxGenJS = (pptxModule.default ?? pptxModule) as any;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "MAIS";
  pptx.subject = "Teacher review lesson plan";
  pptx.title = text(plan.title, plan.language);
  pptx.company = "MAIS";
  pptx.lang = plan.language === "en" ? "en-US" : plan.language === "zh" ? "zh-HK" : "zh-CN";
  pptx.theme = {
    headFontFace: "Arial",
    bodyFontFace: "Arial",
    lang: pptx.lang
  };

  addTitleSlide(pptx, plan);
  addObjectivesSlide(pptx, plan);
  addCategorySummarySlide(pptx, plan);
  addItemSlides(pptx, plan);
  addBoardSlide(pptx, plan);
  addPracticeSlide(pptx, plan);

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}
