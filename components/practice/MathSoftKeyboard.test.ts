import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MathSoftKeyboard, resolveMathKeyboardEqualsAction } from "@/components/practice/MathSoftKeyboard";
import type { Language } from "@/types";

// Next applies the automatic JSX transform during app builds. The focused
// `tsx --test` command preserves this TSX module's classic JSX output, so make
// React available to that test-only execution path as well.
Object.assign(globalThis, { React });

function renderedKeyboard(language: Language) {
  return renderToStaticMarkup(
    createElement(MathSoftKeyboard, {
      id: `math-keyboard-${language}`,
      value: "",
      targetRef: createRef<HTMLInputElement>(),
      language,
      onChange: () => undefined
    })
  );
}

function buttonOpeningTag(markup: string, accessibleName: string) {
  const escapedName = accessibleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markup.match(new RegExp(`<button[^>]*aria-label="${escapedName}"[^>]*>`));
  assert.ok(match, `expected a button named ${JSON.stringify(accessibleName)}`);
  return match[0];
}

test("equals is an accessible calculation action in every supported language", () => {
  for (const [language, accessibleName] of [
    ["en", "Calculate or insert equals sign"],
    ["zh", "計算或輸入等號"],
    ["zh-Hans", "计算或输入等号"]
  ] as const) {
    const tag = buttonOpeningTag(renderedKeyboard(language), accessibleName);
    assert.match(tag, /data-math-key-kind="action"/);
    assert.match(tag, /data-math-key-action="calculate-or-equals"/);
  }
});

test("undo and redo keep localized accessible names after equals becomes an action", () => {
  for (const [language, undoName, redoName] of [
    ["en", "Undo soft keyboard input", "Redo soft keyboard input"],
    ["zh", "復原軟鍵盤輸入", "重做軟鍵盤輸入"],
    ["zh-Hans", "复原软键盘输入", "重做软键盘输入"]
  ] as const) {
    const markup = renderedKeyboard(language);
    assert.match(buttonOpeningTag(markup, undoName), /data-math-key-action="undo"/);
    assert.match(buttonOpeningTag(markup, redoName), /data-math-key-action="redo"/);
  }
});

test("equals action preserves completed or literal equations without blocking mid-answer insertion", () => {
  const atEnd = (value: string) => resolveMathKeyboardEqualsAction(value, value.length, value.length);

  assert.deepEqual(atEnd("3+2+4"), { kind: "replace", value: "3+2+4=9" });
  assert.deepEqual(atEnd("3+2+4="), { kind: "replace", value: "3+2+4=9" });
  assert.deepEqual(atEnd("3+2+4=9"), { kind: "noop" });
  assert.deepEqual(atEnd("f(x)="), { kind: "noop" });
  assert.deepEqual(atEnd("f(x)"), { kind: "insert" });
  assert.deepEqual(resolveMathKeyboardEqualsAction("123", 1, 1), { kind: "insert" });
  assert.deepEqual(resolveMathKeyboardEqualsAction("123", 0, 3), { kind: "insert" });
});
