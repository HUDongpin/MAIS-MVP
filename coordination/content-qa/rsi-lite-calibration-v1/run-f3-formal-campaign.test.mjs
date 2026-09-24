import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(new URL("./run-f3-formal-campaign.mjs", import.meta.url));

test("formal CLI cannot start without the exact execution flag and rejects production, deploy, commit, and push expansion", async () => {
  await assert.rejects(execFileAsync(process.execPath, [cliPath]), (error) => {
    assert.equal(error.code, 2);
    assert.match(error.stderr, /exact --execute-formal-48 flag is required/i);
    return true;
  });
  for (const forbidden of ["--production", "--deploy", "--commit", "--push"]) {
    await assert.rejects(execFileAsync(process.execPath, [cliPath, "--execute-formal-48", forbidden]), (error) => {
      assert.equal(error.code, 2);
      assert.match(error.stderr, /outside the F3 formal-calibration authorization/i);
      return true;
    });
  }
});
