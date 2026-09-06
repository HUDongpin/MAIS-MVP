import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MathSoftKeyboard,
  reconcileMathKeyboardControlledValue,
  resolveMathKeyboardFocusScrollLeft,
  resolveMathKeyboardEqualsAction
} from "@/components/practice/MathSoftKeyboard";
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

test("focused keys align completely inside only their bounded horizontal row", () => {
  const common = {
    rowClientWidth: 200,
    rowLeft: 100,
    rowRight: 300,
    rowScrollWidth: 500
  };

  assert.equal(resolveMathKeyboardFocusScrollLeft({
    ...common,
    currentScrollLeft: 120,
    keyLeft: 150,
    keyRight: 194
  }), null);
  assert.equal(resolveMathKeyboardFocusScrollLeft({
    ...common,
    currentScrollLeft: 120,
    keyLeft: 100.75,
    keyRight: 144.75
  }), 119.75);
  assert.equal(resolveMathKeyboardFocusScrollLeft({
    ...common,
    currentScrollLeft: 200,
    keyLeft: 75,
    keyRight: 119
  }), 174);
  assert.equal(resolveMathKeyboardFocusScrollLeft({
    ...common,
    currentScrollLeft: 0,
    keyLeft: 280,
    keyRight: 330
  }), 31);
  assert.equal(resolveMathKeyboardFocusScrollLeft({
    ...common,
    currentScrollLeft: 10,
    keyLeft: 0,
    keyRight: 44
  }), 0);
  assert.equal(resolveMathKeyboardFocusScrollLeft({
    ...common,
    currentScrollLeft: 280,
    keyLeft: 306,
    keyRight: 350
  }), 300);
  assert.equal(resolveMathKeyboardFocusScrollLeft({
    ...common,
    currentScrollLeft: 0,
    keyLeft: Number.NaN,
    keyRight: 144
  }), null);
  assert.equal(resolveMathKeyboardFocusScrollLeft({
    ...common,
    currentScrollLeft: 0,
    keyLeft: 120,
    keyRight: 164,
    rowClientWidth: 500
  }), null);
});

test("the shared keyboard advertises a compact touch-safe layout without oversized breakpoint keys", () => {
  const markup = renderedKeyboard("en");
  const regularKey = buttonOpeningTag(markup, "Insert 7");
  const editingKey = buttonOpeningTag(markup, "Move cursor left");
  const categoryTab = buttonOpeningTag(markup, "123");
  const editingRow = markup.match(
    /<div role="group" aria-label="Soft keyboard editing controls"[^>]*>/
  )?.[0];

  assert.match(markup, /data-math-keyboard-layout="compact"/);
  assert.match(markup, /max-w-\[38rem\]/);
  assert.match(markup, /data-math-keyboard-row=/);
  assert.match(markup, /flex-nowrap/);
  assert.match(markup, /overflow-x-auto/);
  assert.match(markup, /\[scrollbar-width:thin\]/);
  assert.match(markup, /Swipe or scroll each row for more keys\./);
  assert.match(regularKey, /data-math-key-size="regular"/);
  assert.match(regularKey, /h-11/);
  assert.match(regularKey, /min-w-11/);
  assert.match(regularKey, /focus-visible:ring-inset/);
  assert.match(editingKey, /data-math-key-size="editing"/);
  assert.match(editingKey, /h-11/);
  assert.match(editingKey, /min-w-11/);
  assert.match(categoryTab, /min-h-11/);
  assert.match(categoryTab, /min-w-11/);
  assert.ok(editingRow, "expected the editing controls group");
  assert.match(editingRow, /data-math-keyboard-row="editing-controls"/);
  assert.match(editingRow, /aria-describedby="math-keyboard-en-scroll-hint"/);
  assert.match(editingRow, /tabindex="-1"/);
  assert.match(editingRow, /flex-nowrap/);
  assert.match(editingRow, /overflow-x-auto/);
  assert.match(editingRow, /overscroll-x-contain/);
  assert.match(editingRow, /\[scrollbar-width:thin\]/);
  assert.doesNotMatch(editingRow, /flex-wrap/);
  assert.match(buttonOpeningTag(markup, "Toggle shift"), /data-math-key-size="extra-wide"/);
  assert.ok(
    [...markup.matchAll(/<button[^>]*aria-label="Clear answer"[^>]*>/g)]
      .some(([tag]) => /data-math-key-size="wide"/.test(tag)),
    "the keypad clear action must retain the distinct wide-key geometry hook"
  );
  assert.doesNotMatch(markup, /sm:h-16/);
  assert.doesNotMatch(markup, /sm:min-w-\[5\.7rem\]/);
  assert.doesNotMatch(markup, /sm:flex-\[1_1_5\.7rem\]/);
  assert.doesNotMatch(markup, /scrollbar-width:none|scrollbar\]:hidden|touch-pan-x/);

  assert.match(renderedKeyboard("zh"), /滑動或捲動每一列以查看更多按鍵。/);
  assert.match(renderedKeyboard("zh-Hans"), /滑动或滚动每一行以查看更多按键。/);
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

test("controlled value sync preserves internal undo and redo but invalidates redo after an external edit", () => {
  let lastReceivedValue = "3+2+4";

  for (const nextInternalValue of ["3+2+4=9", "3+2+4", "3+2+4=9", "3+2+4"]) {
    const sync = reconcileMathKeyboardControlledValue(lastReceivedValue, nextInternalValue, nextInternalValue);
    assert.equal(sync.shouldClearRedo, false, `internal value ${nextInternalValue} must preserve redo history`);
    assert.equal(sync.pendingOwnValue, null);
    lastReceivedValue = sync.lastReceivedValue;
  }

  assert.deepEqual(reconcileMathKeyboardControlledValue(lastReceivedValue, null, "7+1"), {
    lastReceivedValue: "7+1",
    pendingOwnValue: null,
    shouldClearRedo: true
  });
});
