import fs from "node:fs";
import path from "node:path";
import { mainlandPepRoadmapNodes, mainlandPepMapDistrictLabels } from "@/data/mainlandPepRoadmap";
import { mainlandPepHighTopics } from "@/data/mainlandPepHighTopics";
import { mainlandPepJuniorTopics } from "@/data/mainlandPepJuniorTopics";
import { mainlandPepPrimaryTopics } from "@/data/mainlandPepPrimaryTopics";
import { questions } from "@/data/questions";
import type { GradeId } from "@/types";

const outputDir = path.join(process.cwd(), "coordination", "content-qa", "mainland-pep-roadmaps-v1");
const expectedCountsByGrade: Record<GradeId, number> = {
  K: 0,
  P1: 4,
  P2: 4,
  P3: 4,
  P4: 4,
  P5: 4,
  P6: 4,
  S1: 5,
  S2: 4,
  S3: 2,
  S4: 10,
  S5: 5,
  S6: 7
};
const forbiddenVisiblePattern = /\b(?:undefined|NaN|OCR|locator|PDF|candidate|RAG)\b|扫描|截图/i;
const hongKongPlacePattern = /新界|九龙|九龍|香港岛|香港島|Kowloon|Hong Kong Island|New Territories/i;

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function writeCsv(fileName: string, rows: Array<Record<string, unknown>>) {
  const headers = Object.keys(rows[0] ?? {});
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ];
  fs.writeFileSync(path.join(outputDir, fileName), `${lines.join("\n")}\n`);
}

function visibleTextForNode(node: (typeof mainlandPepRoadmapNodes)[number]) {
  return JSON.stringify({
    topicId: node.topicId,
    grade: node.grade,
    moduleLabel: node.moduleLabel,
    unitTitle: node.unitTitle,
    routeName: node.routeName,
    stations: node.stations.map((station) => ({
      station: station.stationLabel,
      busStops: station.busStopLabels
    }))
  });
}

function practiceQuestionCount(topicId: string) {
  return questions.filter((question) =>
    question.topicId === topicId &&
    question.curriculumTrack === "MAINLAND_PEP_HIGH" &&
    (!question.publisher || question.publisher === "MAINLAND_PEP")
  ).length;
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

fs.mkdirSync(outputDir, { recursive: true });

const sourceTopics = [...mainlandPepPrimaryTopics, ...mainlandPepJuniorTopics, ...mainlandPepHighTopics];
const sourceTopicIds = new Set(sourceTopics.map((topic) => topic.id));
const nodeTopicIds = new Set(mainlandPepRoadmapNodes.map((node) => node.topicId));
const errors: string[] = [];

try {
  assert(mainlandPepRoadmapNodes.length === 57, `Expected 57 Mainland PEP roadmap nodes, received ${mainlandPepRoadmapNodes.length}.`);
  sourceTopicIds.forEach((topicId) => assert(nodeTopicIds.has(topicId), `Missing roadmap node for topic ${topicId}.`));

  Object.entries(expectedCountsByGrade).forEach(([grade, expected]) => {
    const count = mainlandPepRoadmapNodes.filter((node) => node.grade === grade).length;
    assert(count === expected, `Expected ${expected} ${grade} roadmap nodes, received ${count}.`);
  });

  mainlandPepRoadmapNodes.forEach((node) => {
    assert(node.lessonSlug.length > 0, `${node.topicId} is missing a lesson slug.`);
    assert(node.practiceTopicId === node.topicId, `${node.topicId} practice topic is not self-linked.`);
    assert(practiceQuestionCount(node.topicId) > 0, `${node.topicId} has no scoped Mainland PEP practice questions.`);
    assert(node.stations.length === 4, `${node.topicId} must have exactly 4 station branches.`);
    node.stations.forEach((station, stationIndex) => {
      assert(station.busStopLabels.length >= 3 && station.busStopLabels.length <= 5, `${node.topicId} station ${stationIndex + 1} must have 3-5 stops.`);
      assert(station.stationLabel.zhHans?.trim() || station.stationLabel.zh?.trim(), `${node.topicId} station ${stationIndex + 1} needs Chinese label.`);
    });
    assert(!forbiddenVisiblePattern.test(visibleTextForNode(node)), `${node.topicId} exposes an internal or invalid visible label.`);
  });

  const mainlandDistrictText = JSON.stringify(mainlandPepMapDistrictLabels.map((district) => district.label));
  assert(!hongKongPlacePattern.test(mainlandDistrictText), "Mainland map district labels still contain Hong Kong place names.");
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
}

const graph = {
  generatedAt: new Date().toISOString(),
  source: "Existing QA-approved Mainland PEP topics, lesson slugs, question bank scope, and safe RAG card metadata.",
  totalNodes: mainlandPepRoadmapNodes.length,
  districtLabels: mainlandPepMapDistrictLabels,
  nodes: mainlandPepRoadmapNodes
};

fs.writeFileSync(path.join(outputDir, "roadmap-graph.json"), `${JSON.stringify(graph, null, 2)}\n`);

writeCsv("coverage-matrix.csv", mainlandPepRoadmapNodes.map((node) => ({
  grade: node.grade,
  stage: node.stage,
  semester: node.semester,
  topicId: node.topicId,
  unitTitle: node.unitTitle.zhHans ?? node.unitTitle.zh,
  routeName: node.routeName.zhHans ?? node.routeName.zh,
  stationCount: node.stations.length,
  busStopCount: node.stations.reduce((count, station) => count + station.busStopLabels.length, 0),
  lessonSlug: node.lessonSlug,
  practiceQuestionCount: practiceQuestionCount(node.topicId),
  evidenceRefs: node.sourceRefs.join("; ")
})));

writeCsv("manual-review-queue.csv", mainlandPepRoadmapNodes.map((node, index) => ({
  reviewId: `roadmap-review-${String(index + 1).padStart(2, "0")}`,
  grade: node.grade,
  stage: node.stage,
  topicId: node.topicId,
  unitTitle: node.unitTitle.zhHans ?? node.unitTitle.zh,
  routeName: node.routeName.zhHans ?? node.routeName.zh,
  stations: node.stations.map((station) => station.stationLabel.zhHans ?? station.stationLabel.zh).join(" / "),
  busStops: node.stations.flatMap((station) => station.busStopLabels.map((stop) => stop.zhHans ?? stop.zh)).join(" / "),
  reviewFocus: "教材顺序、概念层级、中文表达、Lesson/Practice联动"
})));

const report = [
  "# Mainland PEP Roadmaps v1 QA Report",
  "",
  `- Generated at: ${graph.generatedAt}`,
  `- Status: ${errors.length ? "blocked" : "pass"}`,
  `- Roadmap nodes: ${mainlandPepRoadmapNodes.length}`,
  `- Primary nodes: ${mainlandPepRoadmapNodes.filter((node) => node.band === "primary").length}`,
  `- Secondary nodes: ${mainlandPepRoadmapNodes.filter((node) => node.band === "secondary").length}`,
  `- District labels: ${mainlandPepMapDistrictLabels.map((district) => district.label.zhHans ?? district.label.zh).join("、")}`,
  "",
  "## Gate Results",
  "",
  `- P1-S6 topic coverage: ${sourceTopicIds.size === nodeTopicIds.size ? "pass" : "fail"}`,
  `- Station and minibus coverage: ${mainlandPepRoadmapNodes.every((node) => node.stations.length === 4 && node.stations.every((station) => station.busStopLabels.length >= 3 && station.busStopLabels.length <= 5)) ? "pass" : "fail"}`,
  `- Lesson slug linkage: ${mainlandPepRoadmapNodes.every((node) => node.lessonSlug.length > 0) ? "pass" : "fail"}`,
  `- Practice question linkage: ${mainlandPepRoadmapNodes.every((node) => practiceQuestionCount(node.topicId) > 0) ? "pass" : "fail"}`,
  `- Mainland district labels without HK place names: ${hongKongPlacePattern.test(JSON.stringify(mainlandPepMapDistrictLabels.map((district) => district.label))) ? "fail" : "pass"}`,
  `- Visible internal artifact scan: ${mainlandPepRoadmapNodes.some((node) => forbiddenVisiblePattern.test(visibleTextForNode(node))) ? "fail" : "pass"}`,
  "",
  "## Errors",
  "",
  ...(errors.length ? errors.map((error) => `- ${error}`) : ["- None."]),
  ""
].join("\n");

fs.writeFileSync(path.join(outputDir, "qa-report.md"), report);

if (errors.length) {
  console.error(report);
  process.exit(1);
}

console.log(report);
