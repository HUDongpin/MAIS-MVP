import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sourcePath = path.join(process.cwd(), "components/dashboard/StudentRewardsPanel.tsx");

test("student reward history and gift request panels contain long labels without sibling overlap", async () => {
  const source = await readFile(sourcePath, "utf8");

  assert.match(
    source,
    /mt-6 grid gap-4 lg:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\]/,
    "the history/request grid must allow both desktop columns to shrink inside the dashboard width"
  );
  assert.match(
    source,
    /aria-labelledby="point-history-title" className="soft-panel min-w-0 overflow-hidden p-4 sm:p-5"/,
    "the point history panel must be a shrinkable overflow boundary"
  );
  assert.match(
    source,
    /aria-labelledby="gift-requests-title" className="soft-panel min-w-0 overflow-hidden p-4 sm:p-5"/,
    "the gift requests panel must be a shrinkable overflow boundary"
  );
  assert.match(
    source,
    /entry\.id} className="grid min-w-0 gap-2 overflow-hidden rounded-2xl/,
    "ledger rows must not let long labels expand the card"
  );
  assert.match(
    source,
    /className="block min-w-0 flex-1 truncate font-bold leading-5/,
    "ledger labels must truncate inside the available row space"
  );
  assert.match(
    source,
    /request\.id} className="min-w-0 overflow-hidden rounded-2xl/,
    "request rows must also contain long reward names"
  );
  assert.match(
    source,
    /className="block min-w-0 flex-1 truncate font-black/,
    "request item names must truncate inside the available row space"
  );
});
