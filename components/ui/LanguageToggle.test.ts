import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  languageToggleLabels,
  nextLanguageMenuIndex
} from "@/components/ui/LanguageToggle";

test("language selector and menu labels follow all three interface languages", () => {
  assert.deepEqual(languageToggleLabels("en"), {
    selector: "Language selector",
    menu: "Language menu"
  });
  assert.deepEqual(languageToggleLabels("zh"), {
    selector: "語言選擇",
    menu: "語言選單"
  });
  assert.deepEqual(languageToggleLabels("zh-Hans"), {
    selector: "语言选择",
    menu: "语言菜单"
  });
});

test("language menu arrow, Home and End keys move focus with wrapping", () => {
  assert.equal(nextLanguageMenuIndex(0, "ArrowDown", 3), 1);
  assert.equal(nextLanguageMenuIndex(2, "ArrowDown", 3), 0);
  assert.equal(nextLanguageMenuIndex(0, "ArrowUp", 3), 2);
  assert.equal(nextLanguageMenuIndex(1, "Home", 3), 0);
  assert.equal(nextLanguageMenuIndex(1, "End", 3), 2);
});

test("the rendered menu wires the keyboard focus model to its public controls", () => {
  const source = readFileSync(
    join(process.cwd(), "components", "ui", "LanguageToggle.tsx"),
    "utf8"
  );

  assert.match(source, /ref=\{triggerRef\}/, "the trigger must be available for focus restoration");
  assert.match(source, /event\.key === "Enter"[\s\S]*?event\.key === " "[\s\S]*?event\.key === "ArrowDown"/);
  assert.match(source, /ref=\{\(element\) => \{[\s\S]*?optionRefs\.current\[index\] = element;/);
  assert.match(source, /tabIndex=\{focusedIndex === index \? 0 : -1\}/, "menu items need one roving tab stop");
  assert.match(source, /nextLanguageMenuIndex\(\s*focusedIndex,\s*key,\s*visibleLanguageOptions\.length\s*\)/);
  assert.match(source, /event\.key === "Escape"[\s\S]*?closeMenuAndRestoreFocus\(\)/);
  assert.match(
    source,
    /event\.key === "Tab"[\s\S]*?setOpen\(false\)/,
    "Tab and Shift+Tab must dismiss the menu without trapping focus"
  );
  assert.match(source, /setLanguage\(option\.value\);[\s\S]*?closeMenuAndRestoreFocus\(\)/);
});
