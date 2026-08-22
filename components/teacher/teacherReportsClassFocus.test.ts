import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { initialReportClassId } from "./teacherReportsClassFocus";

const classes = [
  { id: "class-s1-foundation-2026", studentCount: 0 },
  { id: "class-s3a-2026", studentCount: 1 }
];

test("honours the shell Class focus even when that class is empty", () => {
  // The exact defect: shell said S1 Foundation (0 students), the form stayed on S3A.
  assert.equal(initialReportClassId(classes, "class-s1-foundation-2026"), "class-s1-foundation-2026");
});

test("honours the shell Class focus for a populated class", () => {
  assert.equal(initialReportClassId(classes, "class-s3a-2026"), "class-s3a-2026");
});

test("falls back to a class with students when no class is focused", () => {
  assert.equal(initialReportClassId(classes, null), "class-s3a-2026");
  assert.equal(initialReportClassId(classes, ""), "class-s3a-2026");
  assert.equal(initialReportClassId(classes, "   "), "class-s3a-2026");
});

test("treats the shell's 'all' sentinel as no selection, not as a class id", () => {
  assert.equal(initialReportClassId(classes, "all"), "class-s3a-2026");
});

test("ignores a classId that names no class the teacher owns", () => {
  // A stale or hand-edited URL must not leave the form pointing at nothing.
  assert.equal(initialReportClassId(classes, "class-someone-elses-2026"), "class-s3a-2026");
});

test("degrades safely when the teacher has no classes at all", () => {
  assert.equal(initialReportClassId([], "class-s3a-2026"), "");
  assert.equal(initialReportClassId([], null), "");
});

test("falls back to the first class when none have students", () => {
  assert.equal(
    initialReportClassId([{ id: "class-empty-a", studentCount: 0 }, { id: "class-empty-b", studentCount: 0 }], null),
    "class-empty-a"
  );
});

/**
 * The helper is only half the fix: the shell navigates client-side without
 * remounting this view, so a `useState` initializer alone would honour the param
 * on first load and then silently ignore every later change to Class focus —
 * which is the same "control does nothing" symptom, just harder to spot.
 *
 * This binds the view to both reads so that failure mode cannot come back.
 */
test("the reports view both seeds from and follows the Class focus param", () => {
  const source = readFileSync(
    join(process.cwd(), "components", "teacher", "TeacherReportsView.tsx"),
    "utf8"
  );

  assert.match(
    source,
    /useSearchParams\(\)\.get\("classId"\)/,
    "the view must read the shell's classId param"
  );
  assert.match(
    source,
    /useState\(\(\) => initialReportClassId\(reports\.classes, requestedClassId\)\)/,
    "initial class must come from the shared helper, not a private default"
  );
  assert.match(
    source,
    /useEffect\([\s\S]{0,400}initialReportClassId\(reports\.classes, requestedClassId\)[\s\S]{0,400}\[reports\.classes, requestedClassId\]\)/,
    "the view must also follow later Class focus changes, not only the first render"
  );
});
