import path from "node:path";

function isInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function createGoogleOAuthE2ePathEnvironment({ cwd, e2eRunRoot }) {
  const workspace = path.resolve(cwd);
  const tmpRoot = path.join(workspace, ".tmp");
  const runRoot = path.resolve(workspace, e2eRunRoot);

  if (!isInside(runRoot, tmpRoot)) {
    throw new Error(`Google OAuth E2E root must stay under the workspace .tmp: ${runRoot}`);
  }

  const runtimeTmp = path.join(runRoot, "tmp");

  return {
    PLAYWRIGHT_BROWSERS_PATH: path.join(tmpRoot, "playwright-browsers"),
    npm_config_cache: path.join(tmpRoot, "npm-cache"),
    TMPDIR: runtimeTmp,
    TMP: runtimeTmp,
    TEMP: runtimeTmp,
    XDG_CACHE_HOME: path.join(runRoot, "cache"),
  };
}
