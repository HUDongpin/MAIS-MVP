import assert from "node:assert/strict";
import test from "node:test";

import { normalizeEscapedProviderNewlines } from "./llmProvider";

test("Nova converts literal provider line breaks without changing LaTeX commands", () => {
  const reply = String.raw`First step\n\nSecond step: \(x \neq y\), \(\nabla f\), \(\nu\), \(\newline\)`;
  assert.equal(
    normalizeEscapedProviderNewlines(reply),
    "First step\n\nSecond step: \\(x \\neq y\\), \\(\\nabla f\\), \\(\\nu\\), \\(\\newline\\)"
  );
});

test("Nova decodes escaped newlines before lowercase prose and preserves paragraph breaks", () => {
  for (const [reply, expected] of [
    [String.raw`First step\nnext step`, "First step\nnext step"],
    [String.raw`First step\n\nnext step`, "First step\n\nnext step"],
    [String.raw`First\nnumber two\nthird`, "First\nnumber two\nthird"],
    [String.raw`第一步\n下一步`, "第一步\n下一步"],
    [String.raw`First\n2. next`, "First\n2. next"],
  ]) {
    assert.equal(normalizeEscapedProviderNewlines(reply), expected);
    assert.equal(normalizeEscapedProviderNewlines(expected), expected);
  }
});

test("Nova preserves complete mathematical regions including custom and uppercase commands", () => {
  for (const math of [
    String.raw`\(\ncustom{x} + \nu\)`,
    String.raw`\[x \nRightarrow y\]`,
    String.raw`$$\newcommand{\ncustom}{x}\ncustom$$`,
    String.raw`$\nabla f$`,
  ]) {
    assert.equal(normalizeEscapedProviderNewlines(`${math}\\nnext step`), `${math}\nnext step`);
  }
});

test("Nova preserves recognized bare math commands without hiding ordinary text behind a lowercase exclusion", () => {
  const commands = String.raw`\neq \nabla \nu \newline \nRightarrow \notin \natural \negthinspace`;
  assert.equal(normalizeEscapedProviderNewlines(`${commands}\\nnext step`), `${commands}\nnext step`);
});

test("Nova leaves explicit code spans and escaped backslashes intact", () => {
  const code = "Use `\\n` or ```js\nconst line = '\\n';\n```";
  assert.equal(normalizeEscapedProviderNewlines(`${code}\\nnext step`), `${code}\nnext step`);
  const escaped = String.raw`Literal \\nnext`;
  assert.equal(normalizeEscapedProviderNewlines(escaped), escaped);
});

test("Nova protects complete code delimiter runs and fence types before decoding following prose", () => {
  for (const code of [
    "``a \\n b``",
    "~~~js\nconst line = '\\n';\n~~~",
    "````js\n```\nconst line = '\\n';\n````",
    "```js\nconst line = '\\n';\n````",
    "~~~text\ninside `\\n` and \\nnext\n~~~~",
  ]) {
    assert.equal(normalizeEscapedProviderNewlines(`Use this:\n${code}\\nnext step`), `Use this:\n${code}\nnext step`);
  }
});

test("Nova preserves explicit fenced code through the end when a closing fence is absent", () => {
  for (const code of [
    "```js\nconst line = '\\n';",
    "~~~~js\n~~~\nconst line = '\\n';",
    "````js\n```\nconst line = '\\n';",
  ]) {
    assert.equal(normalizeEscapedProviderNewlines(`First\\nnext\n${code}`), `First\nnext\n${code}`);
  }
});
