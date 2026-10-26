import assert from "node:assert/strict";
import test from "node:test";
import { topics } from "../data/topics";
import { topicsMetadata } from "../data/topicsMetadata";
import { auditTopicCourseMetadata, formatTopicPlacementLabel } from "./curriculumCourses";
import type { Topic } from "../types";

type TopicPlacement = Pick<Topic, "id" | "curriculumTrack" | "grade" | "courseId" | "courseLabel">;

const arkansas: TopicPlacement = {
  id: "example-ar-topic",
  curriculumTrack: "US_AR_MATH",
  grade: "S4"
};

test("course identity changes the topic label without changing its stored grade", () => {
  const topic: TopicPlacement = {
    ...arkansas,
    courseId: "source-backed-geometry",
    courseLabel: { en: "Geometry", zh: "幾何", zhHans: "几何" }
  };
  assert.equal(formatTopicPlacementLabel(topic, "en", true), "Geometry");
  assert.equal(formatTopicPlacementLabel(topic, "zh-Hans"), "几何");
  assert.equal(formatTopicPlacementLabel({ ...topic, curriculumTrack: "US_CA_MATH" }, "en"), "Geometry");
  assert.equal(topic.grade, "S4");
});

test("topics without course evidence keep their existing curriculum-specific grade label", () => {
  assert.equal(formatTopicPlacementLabel(arkansas, "en", true), "G10");
  assert.equal(formatTopicPlacementLabel({ ...arkansas, curriculumTrack: "US_CA_MATH" }, "zh", false), "Grade 10");
  assert.equal(formatTopicPlacementLabel({ ...arkansas, curriculumTrack: "HK" }, "en", true), "S4");
  assert.equal(formatTopicPlacementLabel({ ...arkansas, courseId: "geometry", courseLabel: { en: " ", zh: "幾何", zhHans: "几何" } }, "en", true), "G10");
});

test("incomplete course references fail the metadata audit", () => {
  assert.deepEqual(auditTopicCourseMetadata([
    { ...arkansas, id: "id-only", courseId: "geometry" },
    { ...arkansas, id: "label-only", courseLabel: { en: "Geometry", zh: "幾何", zhHans: "几何" } },
    { ...arkansas, id: "blank-id", courseId: " ", courseLabel: { en: "Geometry", zh: "幾何", zhHans: "几何" } },
    { ...arkansas, id: "blank-label", courseId: "geometry", courseLabel: { en: " ", zh: "幾何", zhHans: "几何" } }
  ]), [
    { topicId: "id-only", reason: "missing-course-label" },
    { topicId: "label-only", reason: "missing-course-id" },
    { topicId: "blank-id", reason: "blank-course-id" },
    { topicId: "blank-label", reason: "blank-course-label" }
  ]);
});

test("current live and client-snapshot topics contain no partial course references", () => {
  assert.deepEqual(auditTopicCourseMetadata(topics), []);
  assert.deepEqual(auditTopicCourseMetadata(topicsMetadata), []);
});
