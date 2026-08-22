import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";

import { createGoogleOAuthE2ePathEnvironment } from "./google-oauth-e2e-environment.mjs";

test("Google OAuth browser verification keeps browser, cache, and temp paths under the workspace .tmp", () => {
  const cwd = "/Volumes/Starship/MAIS-google-oauth-wt";
  const e2eRunRoot = path.join(cwd, ".tmp", "e2e-run-contract");
  const environment = createGoogleOAuthE2ePathEnvironment({ cwd, e2eRunRoot });
  const tmpRoot = path.join(cwd, ".tmp");

  for (const [name, value] of Object.entries(environment)) {
    const relative = path.relative(tmpRoot, value);
    assert.equal(
      relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)),
      true,
      `${name} must stay under ${tmpRoot}`
    );
  }

  assert.equal(environment.PLAYWRIGHT_BROWSERS_PATH, path.join(tmpRoot, "playwright-browsers"));
  assert.equal(environment.npm_config_cache, path.join(tmpRoot, "npm-cache"));
  assert.equal(environment.TMPDIR, path.join(e2eRunRoot, "tmp"));
  assert.equal(environment.TMP, environment.TMPDIR);
  assert.equal(environment.TEMP, environment.TMPDIR);
  assert.equal(environment.XDG_CACHE_HOME, path.join(e2eRunRoot, "cache"));

  assert.throws(
    () => createGoogleOAuthE2ePathEnvironment({ cwd, e2eRunRoot: "/private/tmp/google-oauth" }),
    /must stay under the workspace \.tmp/u
  );
});
