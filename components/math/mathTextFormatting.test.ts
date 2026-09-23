import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MathText } from "./MathText";
import { normalizeMathTextForDisplay } from "./mathTextFormatting";

// The direct tsx runner uses classic JSX for this Next.js source module.
(globalThis as typeof globalThis & { React?: typeof React }).React = React;

const reply = "First step\n\nSecond step: \\(x \\neq y\\), \\(\\nabla f\\)";

test("math display normalization preserves paragraph breaks", () => {
  assert.equal(normalizeMathTextForDisplay(reply), reply);
});

test("MathText renders paragraphs alongside LaTeX without errors", () => {
  const html = renderToStaticMarkup(React.createElement(MathText, { text: reply }));
  assert.ok(html.includes("First step\n\nSecond step"));
  assert.equal((html.match(/class="katex"/g) ?? []).length, 2);
  assert.ok(!html.includes("katex-error"));
});
