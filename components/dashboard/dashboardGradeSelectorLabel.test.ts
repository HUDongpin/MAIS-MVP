import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { dashboardGradeSelectorGroupLabel } from "./dashboardGradeSelectorLabel";

test("announces a locked grade group as fixed, not selectable", () => {
  assert.deepEqual(dashboardGradeSelectorGroupLabel(true), {
    en: "Fixed grade",
    zh: "固定年級",
    zhHans: "固定年级"
  });
});

test("announces an unlocked grade group as selectable", () => {
  assert.deepEqual(dashboardGradeSelectorGroupLabel(false), {
    en: "Select grade",
    zh: "選擇年級",
    zhHans: "选择年级"
  });
});

test("every locale differs between the locked and unlocked group label", () => {
  const locked = dashboardGradeSelectorGroupLabel(true);
  const unlocked = dashboardGradeSelectorGroupLabel(false);
  for (const locale of ["en", "zh", "zhHans"] as const) {
    assert.notEqual(
      locked[locale],
      unlocked[locale],
      `${locale} must not announce a locked grade group with the selectable copy`
    );
  }
});

/**
 * The label and the `disabled` state are decided in two different places in the
 * component, so they can drift apart silently — that drift is the defect this
 * suite exists for: the grid announced "Select grade" while passing
 * `locked={Boolean(fixedStudentGrade)}` to all twelve tiles.
 *
 * Asserting the helper alone would not have caught it, because the component
 * never called a helper. This binds both reads to the SAME expression.
 */
test("the grid derives its group label and its tile lock from the same expression", () => {
  const source = readFileSync(
    join(process.cwd(), "components", "dashboard", "DashboardGradeSelectorGrid.tsx"),
    "utf8"
  );

  const lockExpression = /locked=\{Boolean\(fixedStudentGrade\)\}/;
  assert.match(
    source,
    lockExpression,
    "expected the tiles to stay locked by fixedStudentGrade"
  );

  assert.match(
    source,
    /aria-label=\{t\(dashboardGradeSelectorGroupLabel\(Boolean\(fixedStudentGrade\)\)\)\}/,
    "the radiogroup aria-label must be derived from the same fixedStudentGrade expression that locks the tiles"
  );

  assert.doesNotMatch(
    source,
    /aria-label=\{t\(\{\s*en:\s*"Select grade"/,
    "the radiogroup must not hardcode the selectable label"
  );
});
