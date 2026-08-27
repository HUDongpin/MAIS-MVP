import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { buildTeacherCoursewareManifest } from "./teacherCoursewareManifest";
import {
  renderTeacherCoursewareHtml,
  renderTeacherCoursewarePdf,
  renderTeacherCoursewarePptx,
  teacherCoursewareManifestJson
} from "./teacherCoursewareExports";
import { coursewareFixture } from "./teacherCoursewareTestFixture";

test("HTML, PDF and JSON exports preserve the canonical manifest identity", async () => {
  const manifest = buildTeacherCoursewareManifest(coursewareFixture());
  const html = renderTeacherCoursewareHtml(manifest, "zh-Hans").toString("utf8");
  const pdf = await renderTeacherCoursewarePdf(manifest, "zh-Hans");
  const json = JSON.parse(teacherCoursewareManifestJson(manifest).toString("utf8")) as typeof manifest;

  assert.match(html, /^<!doctype html>/u);
  assert.match(html, new RegExp(`mais-courseware-manifest-sha256" content="${manifest.version.contentHash}`));
  assert.match(html, /解一元一次方程/u);
  assert.match(html, /question-linear-1/u);
  assert.equal(pdf.subarray(0, 8).toString("ascii"), "%PDF-1.7");
  const pdfStructure = pdf.toString("latin1");
  assert.match(pdfStructure, /\/Type \/Page\b/u);
  assert.match(pdfStructure, /\/FontFile[23]\b/u, "portable PDF should embed its CJK font program");
  assert.doesNotMatch(pdfStructure, /STSong-Light/u, "PDF must not depend on a viewer-provided CJK font");
  assert.ok(pdf.includes(Buffer.from(manifest.version.contentHash, "ascii")), "PDF metadata should retain the canonical manifest hash");
  assert.equal(json.version.contentHash, manifest.version.contentHash);
  assert.equal(json.objectives.length, manifest.objectives.length);
  assert.equal(json.assessmentItems.length, manifest.assessmentItems.length);
});

test("PPTX export is a real Open XML package bound to the same manifest hash", async () => {
  const manifest = buildTeacherCoursewareManifest(coursewareFixture());
  const pptx = await renderTeacherCoursewarePptx(manifest, "en");
  assert.equal(pptx.subarray(0, 2).toString("ascii"), "PK");

  const archive = await JSZip.loadAsync(pptx);
  const core = await archive.file("docProps/core.xml")?.async("string");
  assert.ok(core);
  assert.match(core, new RegExp(manifest.version.contentHash));
  const slidePaths = Object.keys(archive.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/u.test(path));
  assert.ok(slidePaths.length >= manifest.sections.length + 3);
  const titleSlide = await archive.file("ppt/slides/slide1.xml")?.async("string");
  assert.match(titleSlide ?? "", /sz="5000"/u, "title slide should preserve a 50pt teaching-deck title");
  const contentSlide = await archive.file("ppt/slides/slide2.xml")?.async("string");
  assert.match(contentSlide ?? "", /sz="3500"/u, "content slides should preserve a 35pt title hierarchy");
  const notesPaths = Object.keys(archive.files).filter((path) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/u.test(path));
  assert.equal(notesPaths.length, slidePaths.length);
  const firstNotes = await archive.file(notesPaths[0])?.async("string");
  assert.match(firstNotes ?? "", /\[Sources\]/u);
});
