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
