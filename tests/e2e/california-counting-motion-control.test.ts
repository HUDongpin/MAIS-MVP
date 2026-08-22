import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const countingLabSource = readFileSync(
  path.resolve(process.cwd(), "components/visualizations/signature/CountingLab.jsx"),
  "utf8"
);

test("CountingLab exposes Count as a reversible motion control without changing its visible learner copy", () => {
  assert.match(
    countingLabSource,
    /aria-label=\{counting \? 'Stop counting animation' : 'Play counting animation'\}/,
    "the Count toggle must identify both motion states to assistive technology and the interaction smoke contract"
  );
  assert.match(
    countingLabSource,
    /\{counting \? 'Counting…' : 'Count'\}/,
    "the concise visible learner-facing label must remain unchanged"
  );
  assert.match(
    countingLabSource,
    /if \(counting\) clearCount\(\);\s*else setCounting\(true\);/,
    "the accessible motion label must continue to describe the existing reversible animation behavior"
  );
});
