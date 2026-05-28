"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "@/components/ui/Motion";
import { useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel, formatLearnerName, isChineseLanguage, localeForLanguage, simplifyChineseText } from "@/lib/i18n";
import { learningAnalyticsUpdatedEventName } from "@/lib/learningAnalytics";
import type { Language, LearningAnalyticsExportSummary, LearningAnalyticsSummary, Topic } from "@/types";

function simplifyRecord<T extends Record<string, string>>(record: T, language: Language): T {
  if (language !== "zh-Hans") return record;
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, simplifyChineseText(value, language)])) as T;
}

function formatDuration(seconds: number | null, language: Language) {
  if (seconds === null) return "—";
  if (seconds < 60) return isChineseLanguage(language) ? simplifyChineseText(`${seconds}秒`, language) : `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return isChineseLanguage(language) ? simplifyChineseText(`${minutes}分${remainingSeconds}秒`, language) : `${minutes}m ${remainingSeconds}s`;
}

function widthFor(value: number, max: number) {
  if (value <= 0 || max <= 0) return "0%";
  return `${Math.max(8, Math.round((value / max) * 100))}%`;
}

type WorkbookCell = string | number | null;
type WorkbookRow = WorkbookCell[];
type WorkbookSheet = {
  name: string;
  rows: WorkbookRow[];
};

const xlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const textEncoder = new TextEncoder();
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeXmlAttribute(value: string) {
  return escapeXml(value).replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function columnName(index: number) {
  let value = index;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function cellXml(cell: WorkbookCell, rowIndex: number, columnIndex: number) {
  const cellReference = `${columnName(columnIndex)}${rowIndex}`;
  if (typeof cell === "number" && Number.isFinite(cell)) {
    return `<c r="${cellReference}"><v>${cell}</v></c>`;
  }

  const text = cell === null ? "" : String(cell);
  const preserveSpace = text.trim() !== text ? ' xml:space="preserve"' : "";
  return `<c r="${cellReference}" t="inlineStr"><is><t${preserveSpace}>${escapeXml(text)}</t></is></c>`;
}

function worksheetXml(rows: WorkbookRow[]) {
  const rowCount = Math.max(rows.length, 1);
  const maxColumns = Math.max(1, ...rows.map((row) => row.length));
  const dimension = `A1:${columnName(maxColumns)}${rowCount}`;
  const thirdColumnWidth = maxColumns >= 3
    ? `<col min="3" max="${maxColumns}" width="64" customWidth="1"/>`
    : "";
  const sheetRows = rows
    .map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((cell, columnIndex) => cellXml(cell, rowIndex + 1, columnIndex + 1)).join("")}</row>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimension}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <cols>
    <col min="1" max="1" width="32" customWidth="1"/>
    <col min="2" max="2" width="20" customWidth="1"/>
    ${thirdColumnWidth}
  </cols>
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(parts: Uint8Array[]) {
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function localFileHeader(nameBytes: Uint8Array, contentBytes: Uint8Array, crc: number) {
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, contentBytes.length, true);
  view.setUint32(22, contentBytes.length, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  header.set(nameBytes, 30);
  return header;
}

function centralDirectoryHeader(nameBytes: Uint8Array, contentBytes: Uint8Array, crc: number, localHeaderOffset: number) {
  const header = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, contentBytes.length, true);
  view.setUint32(24, contentBytes.length, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localHeaderOffset, true);
  header.set(nameBytes, 46);
  return header;
}

function zipFiles(files: { path: string; content: string }[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.path);
    const contentBytes = textEncoder.encode(file.content);
    const crc = crc32(contentBytes);
    const localHeader = localFileHeader(nameBytes, contentBytes, crc);
    const centralHeader = centralDirectoryHeader(nameBytes, contentBytes, crc, localOffset);

    localParts.push(localHeader, contentBytes);
    centralParts.push(centralHeader);
    localOffset += localHeader.length + contentBytes.length;
  }

  const centralOffset = localOffset;
  const centralDirectory = concatBytes(centralParts);
  const endOfCentralDirectory = new Uint8Array(22);
  const view = new DataView(endOfCentralDirectory.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, files.length, true);
  view.setUint16(10, files.length, true);
  view.setUint32(12, centralDirectory.length, true);
  view.setUint32(16, centralOffset, true);

  return concatBytes([...localParts, centralDirectory, endOfCentralDirectory]);
}

function workbookXml(sheets: WorkbookSheet[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets.map((sheet, index) => `<sheet name="${escapeXmlAttribute(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}
  </sheets>
</workbook>`;
}

function workbookRelationshipsXml(sheets: WorkbookSheet[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets.map((_sheet, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}
</Relationships>`;
}

function contentTypesXml(sheets: WorkbookSheet[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${sheets.map((_sheet, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
</Types>`;
}

function buildXlsxWorkbook(sheets: WorkbookSheet[]) {
  const files = [
    {
      path: "[Content_Types].xml",
      content: contentTypesXml(sheets)
    },
    {
      path: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    },
    {
      path: "xl/workbook.xml",
      content: workbookXml(sheets)
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      content: workbookRelationshipsXml(sheets)
    },
    ...sheets.map((sheet, index) => ({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      content: worksheetXml(sheet.rows)
    }))
  ];

  return zipFiles(files);
}

function formatWorkbookDate(value: string | null, language: Language) {
  if (!value) return isChineseLanguage(language) ? simplifyChineseText("未有資料", language) : "Not available";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function workbookLabels(language: Language) {
  return isChineseLanguage(language)
    ? simplifyRecord({
        summarySheet: "摘要",
        eventsSheet: "事件訊號",
        timingSheet: "作答時間",
        privacySheet: "私隱",
        title: "個人學習分析摘要",
        generatedAt: "產生時間",
        studentId: "學生 ID",
        grade: "級別",
        window: "分析期間",
        firstEvent: "首個事件",
        lastEvent: "最近事件",
        metric: "指標",
        value: "數值",
        eventCount: "學習事件總數",
        hasActivity: "是否有學習活動",
        engagement: "參與度",
        totalAnswers: "作答總數",
        accuracy: "答對率",
        averageAnswerTime: "平均作答時間（秒）",
        yes: "是",
        no: "否",
        notAvailable: "未有資料",
        signal: "訊號",
        count: "數量",
        meaning: "說明",
        mouseClicks: "滑鼠點擊",
        mouseDetail: "練習選項與學習工具操作",
        keyboardEvents: "鍵盤事件",
        keyboardDetail: "短答輸入與坐標輸入",
        correctAnswers: "答對題目",
        correctDetail: "練習場即時回饋",
        wrongAnswers: "答錯題目",
        wrongDetail: "作答事件中的錯誤",
        hintRequests: "智能提示",
        hintDetail: "概念、題目與錯題支援",
        visualizationEvents: "視覺化互動",
        visualizationDetail: "滑桿、拖曳、模擬、重設與完成",
        pageViews: "頁面瀏覽",
        pageViewDetail: "課節、練習與學習路徑切換",
        mistakeReviews: "錯題重溫",
        mistakeReviewDetail: "重新檢視已儲存錯題",
        bucket: "分類",
        range: "範圍",
        fast: "快速檢查",
        fastRange: "少於 1 分鐘",
        steady: "推理作答",
        steadyRange: "1 至 3 分鐘",
        slow: "深度或卡關",
        slowRange: "超過 3 分鐘",
        privacyNote: "私隱說明",
        formatNote: "匯出格式",
        aggregateOnly: "Excel 檔案只包含已匯總的摘要，不包含原始答案、坐標或逐項事件時間。"
      }, language)
    : {
        summarySheet: "Summary",
        eventsSheet: "Event Signals",
        timingSheet: "Answer Timing",
        privacySheet: "Privacy",
        title: "Personal learning analytics summary",
        generatedAt: "Generated at",
        studentId: "Student ID",
        grade: "Grade",
        window: "Analysis window",
        firstEvent: "First event",
        lastEvent: "Latest event",
        metric: "Metric",
        value: "Value",
        eventCount: "Learning events",
        hasActivity: "Has learning activity",
        engagement: "Engagement score",
        totalAnswers: "Total answers",
        accuracy: "Accuracy",
        averageAnswerTime: "Average answer time (seconds)",
        yes: "Yes",
        no: "No",
        notAvailable: "Not available",
        signal: "Signal",
        count: "Count",
        meaning: "Meaning",
        mouseClicks: "Mouse clicks",
        mouseDetail: "Practice choices and learning tool controls",
        keyboardEvents: "Keyboard events",
        keyboardDetail: "Short-answer and coordinate inputs",
        correctAnswers: "Right answers",
        correctDetail: "Practice Arena instant feedback",
        wrongAnswers: "Wrong answers",
        wrongDetail: "Wrong answer events",
        hintRequests: "AI hints",
        hintDetail: "Concept, question, and mistake support",
        visualizationEvents: "Visualization interactions",
        visualizationDetail: "Sliders, drags, simulations, resets, and completions",
        pageViews: "Page views",
        pageViewDetail: "Lesson, practice, and pathway movement",
        mistakeReviews: "Mistake reviews",
        mistakeReviewDetail: "Saved wrong answers reopened",
        bucket: "Bucket",
        range: "Range",
        fast: "Fast checks",
        fastRange: "Under 1 minute",
        steady: "Reasoned work",
        steadyRange: "1 to 3 minutes",
        slow: "Deep work or stuck",
        slowRange: "Over 3 minutes",
        privacyNote: "Privacy note",
        formatNote: "Export format",
        aggregateOnly: "This Excel file contains aggregated summary data only. It does not include raw answers, coordinates, or per-event timestamps."
      };
}

function buildLearningAnalyticsWorkbook(exported: LearningAnalyticsExportSummary, language: Language) {
  const labels = workbookLabels(language);
  const { summary } = exported;
  const notAvailable = labels.notAvailable;
  const accuracy = summary.answerStats.accuracy === null ? notAvailable : `${summary.answerStats.accuracy}%`;
  const engagement = summary.engagementScore === null ? notAvailable : `${summary.engagementScore}%`;
  const averageSeconds = summary.duration.averageSeconds ?? notAvailable;

  return buildXlsxWorkbook([
    {
      name: labels.summarySheet,
      rows: [
        [labels.title],
        [labels.generatedAt, formatWorkbookDate(exported.generatedAt, language)],
        [labels.studentId, exported.studentId],
        [labels.grade, exported.grade],
        [labels.window, `${summary.windowDays} days`],
        [labels.firstEvent, formatWorkbookDate(summary.firstEventAt, language)],
        [labels.lastEvent, formatWorkbookDate(summary.lastEventAt, language)],
        [],
        [labels.metric, labels.value],
        [labels.eventCount, summary.eventCount],
        [labels.hasActivity, summary.hasActivity ? labels.yes : labels.no],
        [labels.engagement, engagement],
        [labels.totalAnswers, summary.answerStats.total],
        [labels.accuracy, accuracy],
        [labels.averageAnswerTime, averageSeconds]
      ]
    },
    {
      name: labels.eventsSheet,
      rows: [
        [labels.signal, labels.count, labels.meaning],
        [labels.mouseClicks, summary.counts.mouseClicks, labels.mouseDetail],
        [labels.keyboardEvents, summary.counts.keyboardEvents, labels.keyboardDetail],
        [labels.correctAnswers, summary.counts.correctAnswers, labels.correctDetail],
        [labels.wrongAnswers, summary.counts.wrongAnswers, labels.wrongDetail],
        [labels.hintRequests, summary.counts.hintRequests, labels.hintDetail],
        [labels.visualizationEvents, summary.counts.visualizationEvents, labels.visualizationDetail],
        [labels.pageViews, summary.counts.pageViews, labels.pageViewDetail],
        [labels.mistakeReviews, summary.counts.mistakeReviews, labels.mistakeReviewDetail]
      ]
    },
    {
      name: labels.timingSheet,
      rows: [
        [labels.bucket, labels.count, labels.range],
        [labels.fast, summary.duration.buckets.fast, labels.fastRange],
        [labels.steady, summary.duration.buckets.steady, labels.steadyRange],
        [labels.slow, summary.duration.buckets.slow, labels.slowRange]
      ]
    },
    {
      name: labels.privacySheet,
      rows: [
        [labels.privacyNote, exported.privacy],
        [labels.formatNote, labels.aggregateOnly]
      ]
    }
  ]);
}

function emptyLearningAnalyticsSummary(windowDays = 7): LearningAnalyticsSummary {
  return {
    windowDays,
    eventCount: 0,
    hasActivity: false,
    firstEventAt: null,
    lastEventAt: null,
    counts: {
      mouseClicks: 0,
      keyboardEvents: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      hintRequests: 0,
      visualizationEvents: 0,
      pageViews: 0,
      mistakeReviews: 0
    },
    answerStats: {
      total: 0,
      accuracy: null
    },
    duration: {
      averageSeconds: null,
      buckets: {
        fast: 0,
        steady: 0,
        slow: 0
      }
    },
    engagementScore: null
  };
}

export function LearningAnalyticsReport({ focusTopic }: { focusTopic?: Topic }) {
  const {
    currentUser,
    language,
    mistakeRecords,
    selectedGrade,
    text
  } = useSettings();
  const [summary, setSummary] = useState<LearningAnalyticsSummary>(() => emptyLearningAnalyticsSummary());
  const [isExporting, setIsExporting] = useState(false);
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);

  const loadSummary = useCallback(async (signal?: AbortSignal) => {
    if (!currentUser) {
      setSummary(emptyLearningAnalyticsSummary());
      return;
    }

    try {
      const response = await fetch(`/api/analytics/summary?grade=${selectedGrade}&window=7d`, { cache: "no-store", signal });
      if (!response.ok) return;
      const body = (await response.json()) as { summary?: LearningAnalyticsSummary };
      if (!signal?.aborted && body.summary) setSummary(body.summary);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        // Keep the last summary if the refresh fails.
      }
    }
  }, [currentUser?.id, selectedGrade]);

  useEffect(() => {
    const controller = new AbortController();

    void loadSummary(controller.signal);
    const intervalHandle = window.setInterval(() => {
      void loadSummary();
    }, 5000);
    const refreshReport = () => {
      void loadSummary();
    };
    window.addEventListener(learningAnalyticsUpdatedEventName, refreshReport);

    return () => {
      controller.abort();
      window.clearInterval(intervalHandle);
      window.removeEventListener(learningAnalyticsUpdatedEventName, refreshReport);
    };
  }, [loadSummary]);

  const copy = isChineseLanguage(language)
    ? simplifyRecord({
        eyebrow: "學習分析",
        title: "個人學習分析報告",
        window: "最近 7 日",
        demoStudent: "展示學生",
        eventSignals: "學習事件訊號",
        durationTitle: "作答時間分佈",
        reportTitle: "個人化判讀",
        recommendations: "下一步建議",
        privacyTitle: "私隱控制",
        export: "匯出 Excel",
        exporting: "準備 Excel...",
        exportFailed: "未能匯出分析摘要，請稍後再試。",
        exportAuthFailed: "登入狀態已過期，請重新登入後再匯出。",
        requestDeletion: "申請刪除數據",
        requestingDeletion: "正在發送申請...",
        deletionRequestSubject: "數據刪除申請",
        deletionRequestBody: `我想申請刪除 ${selectedGrade} 的學習分析數據。請在刪除任何紀錄前與我一起審核此私隱申請。`,
        deletionRequestSent: "數據刪除申請已發送給老師。",
        deletionRequestFailed: "暫時未能發送數據刪除申請，請稍後再試。",
        deletionRequestAuthFailed: "登入狀態已過期，請重新登入後再發送申請。",
        engagement: "參與度",
        accuracy: "答對率",
        avgDuration: "平均作答時間",
        activeReview: "待重溫錯題",
        scopedEvents: "只統計已標記的學習互動",
        answerMix: "由作答事件計算",
        paceDetail: "最近作答節奏",
        reviewDetail: "錯題集待重溫項目",
        mouseClicks: "滑鼠點擊",
        mouseDetail: "練習選項與學習工具操作",
        keyboardEvents: "鍵盤事件",
        keyboardDetail: "短答輸入與坐標輸入",
        rightAnswers: "答對題目",
        rightDetail: "練習場即時回饋",
        wrongAnswers: "答錯題目",
        wrongDetail: "作答事件中的錯誤",
        hints: "智能提示",
        hintsDetail: "概念、題目與錯題支援",
        visualizations: "視覺化互動",
        visualizationsDetail: "滑桿、拖曳、模擬、重設與完成",
        pageViews: "頁面瀏覽",
        pageViewsDetail: "課節、練習與學習路徑切換",
        mistakeReviews: "錯題重溫",
        mistakeReviewsDetail: "重新檢視已儲存錯題",
        fast: "快速檢查",
        steady: "推理作答",
        slow: "深度或卡關",
        fastDetail: "少於 1 分鐘",
        steadyDetail: "1 至 3 分鐘",
        slowDetail: "超過 3 分鐘",
        noActivity: "暫未有足夠學習事件。",
        noAnswers: "完成一題練習後，系統會計算答對率。",
        noPace: "完成一題練習後，系統會分析作答時間。",
        clickPattern: "主要透過選項點擊與工具控制完成學習任務。",
        keyboardPattern: "短答輸入和修正較多，適合加入步驟草稿與符號檢查。",
        highAccuracy: "答對率穩定，可加入更高挑戰題。",
        midAccuracy: "答對率正在建立，重點是減少重複錯誤。",
        lowAccuracy: "答錯訊號偏高，需要先回到基礎概念和例題。",
        fastPace: "作答速度快，提交前可加入一次檢查。",
        steadyPace: "作答時間穩定，節奏適合持續練習。",
        slowPace: "部分題目耗時較長，需要拆步驟或先看視覺化模型。",
        focusPrefix: "本週重點",
        recommendationReview: "先完成錯題集中的待重溫項目，再開始新課。",
        recommendationVisual: "練習前先開啟相關視覺化，觀察規律再作答。",
        recommendationPace: "若單題超過 3 分鐘，先寫下已知條件、公式和要求。"
      }, language)
    : {
        eyebrow: "Learning analytics",
        title: "Personalized learning analytics report",
        window: "Last 7 days",
        demoStudent: "Demo student",
        eventSignals: "Learning event signals",
        durationTitle: "Answer duration distribution",
        reportTitle: "Personalized interpretation",
        recommendations: "Next actions",
        privacyTitle: "Privacy controls",
        export: "Export Excel",
        exporting: "Preparing Excel...",
        exportFailed: "Could not export the analytics summary. Please try again.",
        exportAuthFailed: "Your session expired. Sign in again before exporting.",
        requestDeletion: "Request data deletion",
        requestingDeletion: "Sending request...",
        deletionRequestSubject: "Data deletion request",
        deletionRequestBody: `I am requesting deletion of my learning analytics data for ${selectedGrade}. Please review this privacy request with me before any records are deleted.`,
        deletionRequestSent: "Data deletion request sent to your teacher.",
        deletionRequestFailed: "Could not send the data deletion request. Please try again.",
        deletionRequestAuthFailed: "Your session expired. Sign in again before sending this request.",
        engagement: "Engagement",
        accuracy: "Accuracy",
        avgDuration: "Avg answer time",
        activeReview: "Active review",
        scopedEvents: "Only tagged learning interactions counted",
        answerMix: "Calculated from answer events",
        paceDetail: "Recent answering rhythm",
        reviewDetail: "Open Mistake Book items",
        mouseClicks: "Mouse clicks",
        mouseDetail: "Practice choices and learning tool controls",
        keyboardEvents: "Keyboard events",
        keyboardDetail: "Short-answer and coordinate inputs",
        rightAnswers: "Right answers",
        rightDetail: "Practice Arena instant feedback",
        wrongAnswers: "Wrong answers",
        wrongDetail: "Wrong answer events",
        hints: "AI hints",
        hintsDetail: "Concept, question, and mistake support",
        visualizations: "Visualization interactions",
        visualizationsDetail: "Sliders, drags, simulations, resets, and completions",
        pageViews: "Page views",
        pageViewsDetail: "Lesson, practice, and pathway movement",
        mistakeReviews: "Mistake reviews",
        mistakeReviewsDetail: "Saved wrong answers reopened",
        fast: "Fast checks",
        steady: "Reasoned work",
        slow: "Deep work or stuck",
        fastDetail: "Under 1 minute",
        steadyDetail: "1 to 3 minutes",
        slowDetail: "Over 3 minutes",
        noActivity: "Not enough learning events yet.",
        noAnswers: "Complete one practice item to calculate accuracy.",
        noPace: "Complete one practice item to analyze answer timing.",
        clickPattern: "The student mostly completes tasks through choice clicks and tool controls.",
        keyboardPattern: "Short-answer input and revisions are frequent, so step drafts and symbol checks will help.",
        highAccuracy: "Accuracy is stable enough to introduce more challenge questions.",
        midAccuracy: "Accuracy is building; the priority is reducing repeated errors.",
        lowAccuracy: "Wrong-answer signals are high, so return to foundation concepts and worked examples first.",
        fastPace: "Answering is quick; add one check before submitting.",
        steadyPace: "Answer timing is steady and suitable for continued practice.",
        slowPace: "Some items take longer; split the work into steps or start with a visualization.",
        focusPrefix: "This week focus",
        recommendationReview: "Finish active Mistake Book items before starting the next lesson.",
        recommendationVisual: "Open the related visualization before practice and name the pattern first.",
        recommendationPace: "If one item passes 3 minutes, write the given facts, formula, and target."
      };

  const studentName = currentUser ? formatLearnerName(currentUser.name, language) : copy.demoStudent;
  const activeReviewCount = mistakeRecords.filter((record) => !record.mastered).length;
  const selectedGradeLabel = formatGradeLabel(selectedGrade, language, true);
  const focusLabel = focusTopic ? text(focusTopic.title) : selectedGradeLabel;
  const accuracy = summary.answerStats.accuracy;
  const averageDuration = summary.duration.averageSeconds;
  const interactionPattern = !summary.hasActivity
    ? copy.noActivity
    : summary.counts.keyboardEvents > summary.counts.mouseClicks * 0.45
      ? copy.keyboardPattern
      : copy.clickPattern;
  const accuracyPattern = accuracy === null
    ? copy.noAnswers
    : accuracy >= 80
      ? copy.highAccuracy
      : accuracy >= 65
        ? copy.midAccuracy
        : copy.lowAccuracy;
  const pacePattern = averageDuration === null
    ? copy.noPace
    : averageDuration > 180
      ? copy.slowPace
      : averageDuration < 75
        ? copy.fastPace
        : copy.steadyPace;

  const metricTiles = [
    { label: copy.engagement, value: summary.engagementScore === null ? "—" : `${summary.engagementScore}%`, detail: copy.scopedEvents },
    { label: copy.accuracy, value: accuracy === null ? "—" : `${accuracy}%`, detail: copy.answerMix },
    { label: copy.avgDuration, value: formatDuration(averageDuration, language), detail: copy.paceDetail },
    { label: copy.activeReview, value: String(activeReviewCount), detail: copy.reviewDetail }
  ];

  const eventRows = [
    {
      label: copy.mouseClicks,
      value: summary.counts.mouseClicks,
      detail: copy.mouseDetail,
      barClass: "bg-cyan-400"
    },
    {
      label: copy.keyboardEvents,
      value: summary.counts.keyboardEvents,
      detail: copy.keyboardDetail,
      barClass: "bg-emerald-400"
    },
    {
      label: copy.rightAnswers,
      value: summary.counts.correctAnswers,
      detail: copy.rightDetail,
      barClass: "bg-lime-400"
    },
    {
      label: copy.wrongAnswers,
      value: summary.counts.wrongAnswers,
      detail: copy.wrongDetail,
      barClass: "bg-amber-400"
    },
    {
      label: copy.hints,
      value: summary.counts.hintRequests,
      detail: copy.hintsDetail,
      barClass: "bg-violet-400"
    },
    {
      label: copy.visualizations,
      value: summary.counts.visualizationEvents,
      detail: copy.visualizationsDetail,
      barClass: "bg-fuchsia-400"
    },
    {
      label: copy.pageViews,
      value: summary.counts.pageViews,
      detail: copy.pageViewsDetail,
      barClass: "bg-sky-400"
    },
    {
      label: copy.mistakeReviews,
      value: summary.counts.mistakeReviews,
      detail: copy.mistakeReviewsDetail,
      barClass: "bg-rose-400"
    }
  ];
  const maxEventValue = Math.max(...eventRows.map((row) => row.value), 1);

  const durationBuckets = [
    {
      label: copy.fast,
      detail: copy.fastDetail,
      value: summary.duration.buckets.fast,
      barClass: "bg-emerald-400"
    },
    {
      label: copy.steady,
      detail: copy.steadyDetail,
      value: summary.duration.buckets.steady,
      barClass: "bg-cyan-400"
    },
    {
      label: copy.slow,
      detail: copy.slowDetail,
      value: summary.duration.buckets.slow,
      barClass: "bg-amber-400"
    }
  ];
  const maxBucketValue = Math.max(...durationBuckets.map((bucket) => bucket.value), 1);

  async function handleExport() {
    if (isExporting) return;

    setIsExporting(true);
    setExportError(null);
    setPrivacyMessage(null);
    try {
      const response = await fetch(`/api/analytics/export?grade=${selectedGrade}&window=7d`, { cache: "no-store" });
      if (!response.ok) {
        setExportError(response.status === 401 ? copy.exportAuthFailed : copy.exportFailed);
        return;
      }
      const exported = (await response.json()) as LearningAnalyticsExportSummary;
      const workbook = buildLearningAnalyticsWorkbook(exported, language);
      downloadBlob(
        `learning-analytics-${selectedGrade}.xlsx`,
        new Blob([workbook], { type: xlsxContentType })
      );
    } catch {
      setExportError(copy.exportFailed);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDataDeletionRequest() {
    if (isRequestingDeletion) return;

    setIsRequestingDeletion(true);
    setPrivacyMessage(null);
    setExportError(null);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: copy.deletionRequestSubject,
          body: copy.deletionRequestBody,
          priority: "urgent"
        })
      });

      if (!response.ok) {
        setPrivacyMessage(response.status === 401 ? copy.deletionRequestAuthFailed : copy.deletionRequestFailed);
        return;
      }

      setPrivacyMessage(copy.deletionRequestSent);
    } catch {
      setPrivacyMessage(copy.deletionRequestFailed);
    } finally {
      setIsRequestingDeletion(false);
    }
  }

  return (
    <motion.section
      className="mt-8 overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/20 sm:p-6"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-black text-cyan-600 dark:text-cyan-300">{copy.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">{copy.title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {studentName} · {selectedGradeLabel} · {copy.window}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:w-[560px] xl:grid-cols-4">
          {metricTiles.map((metric) => (
            <div key={metric.label} className="grid min-h-36 grid-rows-[3rem_3rem_1fr] rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.055]">
              <p className="self-start text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">{metric.label}</p>
              <p className="self-start text-2xl font-black leading-none text-slate-950 dark:text-white">{metric.value}</p>
              <p className="self-start text-xs leading-5 text-slate-500 dark:text-slate-400">{metric.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">{copy.eventSignals}</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {eventRows.map((row) => (
                <div key={row.label} className="rounded-2xl border border-slate-200/70 bg-white/65 p-4 dark:border-white/10 dark:bg-white/[0.045]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-slate-950 dark:text-white">{row.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{row.detail}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white dark:bg-white dark:text-slate-950">
                      {row.value}
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <motion.div
                      className={`h-full rounded-full ${row.barClass}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: widthFor(row.value, maxEventValue) }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/65 p-4 dark:border-white/10 dark:bg-white/[0.045]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-black text-slate-950 dark:text-white">{copy.durationTitle}</h3>
              <span className="text-sm font-black text-cyan-600 dark:text-cyan-300">
                {formatDuration(averageDuration, language)}
              </span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {durationBuckets.map((bucket) => (
                <div key={bucket.label}>
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-800 dark:text-slate-100">{bucket.label}</p>
                      <p className="text-sm leading-5 text-slate-600 dark:text-slate-300">{bucket.detail}</p>
                    </div>
                    <span className="text-sm font-black text-slate-500 dark:text-slate-300">{bucket.value}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <motion.div
                      className={`h-full rounded-full ${bucket.barClass}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: widthFor(bucket.value, maxBucketValue) }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-cyan-300/35 bg-cyan-50/80 p-5 text-slate-800 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-50">
          <p className="text-sm font-black text-cyan-700 dark:text-cyan-200">{copy.reportTitle}</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
            {copy.focusPrefix}: {focusLabel}
          </h3>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700 dark:text-cyan-50/90">
            <p>{interactionPattern}</p>
            <p>{accuracyPattern}</p>
            <p>{pacePattern}</p>
          </div>

          <div className="mt-6 border-t border-cyan-300/35 pt-5 dark:border-cyan-200/20">
            <p className="text-sm font-black text-cyan-700 dark:text-cyan-200">{copy.recommendations}</p>
            <div className="mt-3 space-y-3 text-sm font-semibold leading-6 text-slate-700 dark:text-cyan-50/90">
              <p>{copy.recommendationReview}</p>
              <p>{copy.recommendationVisual}</p>
              <p>{copy.recommendationPace}</p>
            </div>
          </div>

          <div className="mt-6 border-t border-cyan-300/35 pt-5 dark:border-cyan-200/20">
            <p className="text-sm font-black text-cyan-700 dark:text-cyan-200">{copy.privacyTitle}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row xl:flex-col">
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950"
              >
                {isExporting ? copy.exporting : copy.export}
              </button>
              <button
                type="button"
                onClick={handleDataDeletionRequest}
                disabled={isRequestingDeletion}
                className="focus-ring rounded-full border border-rose-300/60 bg-rose-400/10 px-4 py-2 text-sm font-black text-rose-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-100"
              >
                {isRequestingDeletion ? copy.requestingDeletion : copy.requestDeletion}
              </button>
            </div>
            {exportError ? (
              <p className="mt-3 text-sm font-semibold leading-5 text-rose-700 dark:text-rose-100">{exportError}</p>
            ) : null}
            {privacyMessage ? (
              <p className="mt-3 text-sm font-semibold leading-5 text-cyan-800 dark:text-cyan-100">{privacyMessage}</p>
            ) : null}
          </div>
        </aside>
      </div>
    </motion.section>
  );
}
