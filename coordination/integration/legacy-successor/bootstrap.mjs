// Trusted entrypoint bootstrap: built-ins and the bounded, built-in-only parser.
import { readFile, writeFile, lstat, realpath, mkdir, readdir, mkdtemp, rm, chmod } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { devNull } from "node:os";
// Embedded frozen bounded parser; no local or third-party import precedes authentication.
const PROMOTION_WORKFLOW_JSON_LIMITS = Object.freeze({
  maxBytes: 32 * 1024 * 1024,
  maxDepth: 128,
  maxWork: 64 * 1024 * 1024,
  maxNodes: 250_000
});

class PromotionWorkflowJsonError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PromotionWorkflowJsonError";
    this.code = code;
  }
}

const fatalUtf8Decoder = new TextDecoder("utf-8", { fatal: true });

function failInvalid() {
  throw new PromotionWorkflowJsonError(
    "PROMOTION_WORKFLOW_JSON_INVALID",
    "Promotion workflow JSON is invalid."
  );
}

function failDuplicateKey() {
  throw new PromotionWorkflowJsonError(
    "PROMOTION_WORKFLOW_JSON_DUPLICATE_KEY",
    "Promotion workflow JSON contains a duplicate object key."
  );
}

function failLimit() {
  throw new PromotionWorkflowJsonError(
    "PROMOTION_WORKFLOW_JSON_LIMIT_EXCEEDED",
    "Promotion workflow JSON exceeds frozen safety limits."
  );
}

function isDigit(character) {
  return character >= "0" && character <= "9";
}

function isNonZeroDigit(character) {
  return character >= "1" && character <= "9";
}

function isJsonWhitespace(character) {
  return character === " " || character === "\t" || character === "\n" || character === "\r";
}

function parsePromotionWorkflowJsonBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) failInvalid();
  if (bytes.byteLength > PROMOTION_WORKFLOW_JSON_LIMITS.maxBytes) failLimit();

  let source;
  try {
    source = fatalUtf8Decoder.decode(bytes);
  } catch {
    failInvalid();
  }

  let offset = 0;
  let work = 0;
  let nodes = 0;

  const spendWork = (amount = 1) => {
    work += amount;
    if (work > PROMOTION_WORKFLOW_JSON_LIMITS.maxWork) failLimit();
  };

  const consume = () => {
    if (offset >= source.length) failInvalid();
    spendWork();
    const character = source[offset];
    offset += 1;
    return character;
  };

  const skipWhitespace = () => {
    while (isJsonWhitespace(source[offset])) consume();
  };

  const scanString = (decode) => {
    if (consume() !== '"') failInvalid();
    let decoded = decode ? "" : null;
    while (offset < source.length) {
      const character = consume();
      if (character === '"') return decoded;
      if (character.charCodeAt(0) < 0x20) failInvalid();
      if (character !== "\\") {
        if (decode) decoded += character;
        continue;
      }

      const escaped = consume();
      const simpleEscapes = {
        '"': '"',
        "\\": "\\",
        "/": "/",
        b: "\b",
        f: "\f",
        n: "\n",
        r: "\r",
        t: "\t"
      };
      if (Object.hasOwn(simpleEscapes, escaped)) {
        if (decode) decoded += simpleEscapes[escaped];
        continue;
      }
      if (escaped !== "u") failInvalid();

      let codeUnit = 0;
      for (let digitIndex = 0; digitIndex < 4; digitIndex += 1) {
        const digit = consume();
        if (!/^[0-9a-fA-F]$/u.test(digit)) failInvalid();
        codeUnit = (codeUnit * 16) + Number.parseInt(digit, 16);
      }
      if (decode) decoded += String.fromCharCode(codeUnit);
    }
    failInvalid();
  };

  const scanLiteral = (literal) => {
    for (const expected of literal) {
      if (consume() !== expected) failInvalid();
    }
  };

  const scanNumber = () => {
    const start = offset;
    if (source[offset] === "-") consume();

    if (source[offset] === "0") {
      consume();
    } else if (isNonZeroDigit(source[offset])) {
      consume();
      while (isDigit(source[offset])) consume();
    } else {
      failInvalid();
    }

    if (source[offset] === ".") {
      consume();
      if (!isDigit(source[offset])) failInvalid();
      while (isDigit(source[offset])) consume();
    }

    if (source[offset] === "e" || source[offset] === "E") {
      consume();
      if (source[offset] === "+" || source[offset] === "-") consume();
      if (!isDigit(source[offset])) failInvalid();
      while (isDigit(source[offset])) consume();
    }

    if (!Number.isFinite(Number(source.slice(start, offset)))) failInvalid();
  };

  const scanValue = (depth) => {
    spendWork();
    if (depth > PROMOTION_WORKFLOW_JSON_LIMITS.maxDepth) failLimit();
    nodes += 1;
    if (nodes > PROMOTION_WORKFLOW_JSON_LIMITS.maxNodes) failLimit();
    skipWhitespace();

    const character = source[offset];
    if (character === '"') {
      scanString(false);
      return;
    }
    if (character === "{") {
      consume();
      skipWhitespace();
      if (source[offset] === "}") {
        consume();
        return;
      }
      const keys = new Set();
      while (offset < source.length) {
        skipWhitespace();
        if (source[offset] !== '"') failInvalid();
        const key = scanString(true);
        if (keys.has(key)) failDuplicateKey();
        keys.add(key);
        skipWhitespace();
        if (consume() !== ":") failInvalid();
        scanValue(depth + 1);
        skipWhitespace();
        const delimiter = consume();
        if (delimiter === "}") return;
        if (delimiter !== ",") failInvalid();
      }
      failInvalid();
    }
    if (character === "[") {
      consume();
      skipWhitespace();
      if (source[offset] === "]") {
        consume();
        return;
      }
      while (offset < source.length) {
        scanValue(depth + 1);
        skipWhitespace();
        const delimiter = consume();
        if (delimiter === "]") return;
        if (delimiter !== ",") failInvalid();
      }
      failInvalid();
    }
    if (character === "t") {
      scanLiteral("true");
      return;
    }
    if (character === "f") {
      scanLiteral("false");
      return;
    }
    if (character === "n") {
      scanLiteral("null");
      return;
    }
    scanNumber();
  };

  scanValue(0);
  skipWhitespace();
  if (offset !== source.length) failInvalid();

  try {
    return JSON.parse(source);
  } catch {
    failInvalid();
  }
}

export const TRUSTED_BUNDLE_PATHS = [
  "coordination/integration/finalization/promotion-shadow-finalization-v2-lib.mjs",
  "coordination/integration/finalization/schemas/promotion-lifecycle-registry.v2.schema.json",
  "coordination/integration/finalization/schemas/promotion-shadow-closure.v2.schema.json",
  "coordination/integration/legacy-successor/attempt-008/native-validation/failure-index.v1.json",
  "coordination/integration/legacy-successor/attempt-008/native-validation/validate-v1.json",
  "coordination/integration/legacy-successor/attempt-008/native-validation/validate-v2.json",
  "coordination/integration/legacy-successor/bootstrap.mjs",
  "coordination/integration/legacy-successor/contract.mjs",
  "coordination/integration/legacy-successor/contract.test.mjs",
  "coordination/integration/legacy-successor/dependencies.mjs",
  "coordination/integration/legacy-successor/frozen-dependency-bindings.v1.json",
  "coordination/integration/legacy-successor/observer.mjs",
  "coordination/integration/legacy-successor/promotion.mjs",
  "coordination/integration/legacy-successor/schemas/evidence.v1.schema.json",
  "coordination/integration/legacy-successor/schemas/manifest.v1.schema.json",
  "coordination/integration/legacy-successor/schemas/receipt.v1.schema.json",
  "coordination/integration/legacy-successor/schemas/successor.v1.schema.json",
  "coordination/integration/promotion-gate-lib.mjs",
  "coordination/integration/v2/promotion-gate-v2-lib.mjs",
  "coordination/integration/v2/promotion-gate-v2.mjs",
  "coordination/integration/v2/promotion-gate-v2.test.mjs",
  "coordination/integration/v2/schemas/promotion-evidence.v2.schema.json",
  "coordination/integration/v2/schemas/promotion-legacy-resolution-registry.v2.schema.json",
  "coordination/integration/v2/schemas/promotion-manifest.v2.schema.json",
  "coordination/integration/v2/schemas/promotion-receipt.v2.schema.json",
  "data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json",
  "lib/fullQuestionBankSolvability.test.ts",
  "package-lock.json",
  "package.json",
  "scripts/arkansas-correctness-solvers.mjs",
  "scripts/audit-us-math-item-quality.mjs",
  "scripts/promotion-workflow-json-guard.mjs"
];

const ROOT = "coordination/integration/legacy-successor";
export const PREVIOUS_EXECUTION = "cc8ae1018ccfc7329b383053a9a5513d7b66c6c6";
export const PREVIOUS_LEDGER_OBJECT = "ffd8d45f3f9559011cc020a8aa6f0c25aa8e41b2";
export const PREVIOUS_LEDGER_SHA = "6f1ec90ac803a3f378e8a5d68b585105faa1cd8d7a813c92f2b618c9a10cc3c3";
export const FAILED_ATTEMPT = Object.freeze({
  attemptId: "attempt-008", executionCommit: PREVIOUS_EXECUTION,
  manifest: { path: `${ROOT}/attempt-008/promotion-manifest.v1.json`, rawSha256: "73869fd0612d66f444e19d2fb8589ce1c53708495247d446922c56ef46b29973" },
  descriptor: { path: `${ROOT}/attempt-008/successor.v1.json`, rawSha256: "c30c33826d7c42e88c1c2880ff6cca6bf91a15ad80366f71910e24c83fab4478" },
  failureIndex: { path: `${ROOT}/attempt-008/native-validation/failure-index.v1.json`, rawSha256: "3716700b315313cbd319cd00ae4b4c054b4774bb4a04654afd1f225fcac2877c" },
  candidateChanged: false, checkerChanged: true, shadowApprovalInherited: false
});
export function anchoredLedgerEntry(anchorBytes, releasePrefixBytes, ledger) {
  requireThat(hash(anchorBytes) === PREVIOUS_LEDGER_SHA && anchorBytes.equals(releasePrefixBytes), "SUCCESSOR_LEDGER_ANCHOR_DRIFT");
  const anchor = parsePromotionWorkflowJsonBytes(anchorBytes);
  requireThat(canonical(Object.keys(ledger).sort()) === canonical(["entries", "schemaVersion"]) && ledger.schemaVersion === anchor.schemaVersion && Array.isArray(ledger.entries) && ledger.entries.length === anchor.entries.length + 1 && canonical(ledger.entries.slice(0, -1)) === canonical(anchor.entries), "SUCCESSOR_LEDGER_PREFIX_REWRITTEN");
  requireThat(anchor.entries.length === 1 && anchor.entries[0].version === "promotion-legacy-successor-v1" && ledger.entries.at(-1).version === "promotion-legacy-successor-v1.1" && new Set(ledger.entries.map(x => x.version)).size === ledger.entries.length, "SUCCESSOR_LEDGER_VERSION_INVALID");
  return ledger.entries.at(-1);
}

const NAMES = ["ajv", "fast-deep-equal", "fast-uri", "json-schema-traverse", "require-from-string", "typescript", "yaml"];
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value !== null && typeof value === "object" ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}` : JSON.stringify(value);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const digest = value => hash(canonical(value));
const requireThat = (condition, code) => { if (!condition) { const error = new Error(code); error.code = code; throw error; } };
const safe = file => requireThat(typeof file === "string" && !path.isAbsolute(file) && !/[\x00-\x1f\x7f\\:]/u.test(file) && file.split("/").every(part => part && part !== "." && part !== ".."), "SUCCESSOR_BOOTSTRAP_PATH_INVALID");
async function regular(root, file) {
  safe(file); let cursor = root;
  for (const part of file.split("/")) { cursor = path.join(cursor, part); requireThat(!(await lstat(cursor)).isSymbolicLink(), "SUCCESSOR_BOOTSTRAP_SYMLINK"); }
  const stat = await lstat(cursor); requireThat(stat.isFile() && stat.size <= 32 * 1024 * 1024, "SUCCESSOR_BOOTSTRAP_FILE_INVALID");
  return { bytes: await readFile(cursor), mode: stat.mode & 0o111 ? "100755" : "100644" };
}
export async function authenticateRuntime(root, args) {
  requireThat(await realpath(root) === root, "SUCCESSOR_BOOTSTRAP_ROOT_ALIAS");
  requireThat(!process.env.NODE_OPTIONS && !process.env.NODE_PATH && process.execArgv.every(arg => !/loader|import|require/.test(arg)), "SUCCESSOR_BOOTSTRAP_LOADER_HOOK");
  const [operation, ...flags] = args;
  requireThat(["validate", "shadow", "verify-receipt"].includes(operation), "SUCCESSOR_CLI_USAGE");
  const options = {};
  const allowed = operation === "validate" ? ["manifest", "json"] : operation === "shadow" ? ["manifest", "run-id", "json"] : ["receipt", "storage-commit", "receipt-sha256", "json"];
  for (let i = 0; i < flags.length; i++) {
    const key = flags[i].startsWith("--") ? flags[i].slice(2) : "";
    requireThat(allowed.includes(key) && !Object.hasOwn(options, key), "SUCCESSOR_CLI_USAGE");
    if (key === "json") options[key] = true;
    else { const value = flags[++i]; requireThat(value && !value.startsWith("--"), "SUCCESSOR_CLI_USAGE"); options[key] = value; }
  }
  requireThat(options.json === true, "SUCCESSOR_CLI_USAGE");
  const gitEntry = await lstat(path.join(root, ".git")); requireThat(!gitEntry.isSymbolicLink(), "SUCCESSOR_BOOTSTRAP_GIT_ALIAS");
  let gitDir = path.join(root, ".git");
  if (gitEntry.isFile()) {
    const match = (await readFile(gitDir, "utf8")).match(/^gitdir: ([^\r\n\0]+)\n?$/u); requireThat(match, "SUCCESSOR_BOOTSTRAP_GIT_INVALID"); gitDir = await realpath(path.resolve(root, match[1]));
  }
  const env = { PATH: "/usr/bin:/bin", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: devNull, GIT_GRAFT_FILE: devNull };
  const git = (...cmd) => execFileSync("/usr/bin/git", ["--no-replace-objects", "--literal-pathspecs", "--no-optional-locks", `--git-dir=${gitDir}`, `--work-tree=${root}`, "-c", `core.worktree=${root}`, "-c", "core.fsmonitor=false", ...cmd], { env, maxBuffer: 32 * 1024 * 1024, timeout: 30000 });
  const head = git("rev-parse", "HEAD").toString().trim();
  requireThat(git("status", "--porcelain=v1", "--untracked-files=all").length === 0, "SUCCESSOR_WORKTREE_DIRTY");
  const mp = `${ROOT}/attempt-009/promotion-manifest.v1.json`;
  requireThat(operation === "verify-receipt" || options.manifest === mp, "SUCCESSOR_MANIFEST_PATH_INVALID");
  const manifest = parsePromotionWorkflowJsonBytes((await regular(root, mp)).bytes);
  requireThat(manifest.checkerRelease?.ledgerPath === `${ROOT}/checker-releases.v1.json` && /^[a-f0-9]{40}$/u.test(manifest.checkerRelease.releaseCommit ?? ""), "SUCCESSOR_BOOTSTRAP_RELEASE_INVALID");
  const ledgerFile = await regular(root, manifest.checkerRelease.ledgerPath);
  requireThat(hash(ledgerFile.bytes) === manifest.checkerRelease.ledgerRawSha256, "SUCCESSOR_BOOTSTRAP_LEDGER_DRIFT");
  const ledger = parsePromotionWorkflowJsonBytes(ledgerFile.bytes);
  requireThat(ledger.schemaVersion === "promotion-checker-releases.legacy-successor.v1" && Array.isArray(ledger.entries), "SUCCESSOR_BOOTSTRAP_LEDGER_INVALID");
  git("merge-base", "--is-ancestor", PREVIOUS_EXECUTION, manifest.checkerRelease.releaseCommit);
  const anchorPath = `${ROOT}/checker-releases.v1.json`;
  const anchorRow = git("ls-tree", "-z", PREVIOUS_EXECUTION, "--", anchorPath).toString();
  requireThat(anchorRow === `100644 blob ${PREVIOUS_LEDGER_OBJECT}\t${anchorPath}\0`, "SUCCESSOR_LEDGER_ANCHOR_OBJECT_INVALID");
  const prefixRow = git("ls-tree", "-z", manifest.checkerRelease.releaseCommit, "--", anchorPath).toString();
  requireThat(prefixRow === anchorRow, "SUCCESSOR_LEDGER_RELEASE_PREFIX_DRIFT");
  const release = anchoredLedgerEntry(git("show", `${PREVIOUS_EXECUTION}:${anchorPath}`), git("show", `${manifest.checkerRelease.releaseCommit}:${anchorPath}`), ledger);
  requireThat(release.version === "promotion-legacy-successor-v1.1" && release.releaseCommit === manifest.checkerRelease.releaseCommit && release.bundleDigest === manifest.checkerRelease.bundleDigest && canonical(release.bundlePaths) === canonical(TRUSTED_BUNDLE_PATHS), "SUCCESSOR_BOOTSTRAP_RELEASE_INVALID");
  git("merge-base", "--is-ancestor", release.releaseCommit, head);
  const files = [], bindings = [];
  for (const file of TRUSTED_BUNDLE_PATHS) {
    const actual = await regular(root, file);
    const row = git("ls-tree", "-z", release.releaseCommit, "--", file).toString().match(/^([0-7]{6}) blob ([a-f0-9]{40})\t([^\0]+)\0$/u);
    requireThat(row && row[3] === file && row[1] === actual.mode, "SUCCESSOR_BOOTSTRAP_CODE_MODE_DRIFT");
    requireThat(actual.bytes.equals(git("show", `${release.releaseCommit}:${file}`)) && actual.bytes.equals(git("show", `${head}:${file}`)), "SUCCESSOR_BOOTSTRAP_CODE_DRIFT");
    bindings.push({ path: file, rawSha256: hash(actual.bytes) }); files.push({ path: file, ...actual });
  }
  requireThat(digest(bindings) === release.bundleDigest, "SUCCESSOR_BOOTSTRAP_BUNDLE_DRIFT");
  const frozenDependencies = parsePromotionWorkflowJsonBytes(files.find(f => f.path === `${ROOT}/frozen-dependency-bindings.v1.json`).bytes);
  requireThat(canonical(Object.keys(frozenDependencies).sort()) === canonical(["packages", "schemaVersion"]) && frozenDependencies.schemaVersion === "promotion-frozen-dependency-bindings.v1" && canonical(frozenDependencies.packages) === canonical(release.dependencyBindings), "SUCCESSOR_BOOTSTRAP_FROZEN_DEPENDENCY_DRIFT");
  const lock = parsePromotionWorkflowJsonBytes(files.find(f => f.path === "package-lock.json").bytes);
  const modules = path.join(root, "node_modules"); requireThat((await lstat(modules)).isDirectory() && await realpath(modules) === modules, "SUCCESSOR_DEPENDENCY_INSTALLATION_UNOWNED");
  const dependencyRows = [];
  for (const name of NAMES) {
    const directory = path.join(modules, name); requireThat(await realpath(directory) === directory, "SUCCESSOR_DEPENDENCY_ALIAS");
    const pkg = parsePromotionWorkflowJsonBytes((await regular(directory, "package.json")).bytes), declared = lock.packages[`node_modules/${name}`];
    requireThat(pkg.version === declared?.version && typeof declared.integrity === "string", "SUCCESSOR_DEPENDENCY_LOCK_DRIFT");
    const rows = [];
    const walk = async relative => {
      for (const item of (await readdir(path.join(directory, relative))).sort()) {
        const file = path.posix.join(relative, item), stat = await lstat(path.join(directory, file));
        requireThat(!stat.isSymbolicLink(), "SUCCESSOR_DEPENDENCY_SYMLINK");
        if (stat.isDirectory()) await walk(file);
        else { const value = await regular(directory, file); rows.push([file, value.mode, hash(value.bytes)]); files.push({ path: `node_modules/${name}/${file}`, ...value }); }
      }
    };
    await walk(""); dependencyRows.push({ name, version: pkg.version, integrity: declared.integrity, fileCount: rows.length, treeDigest: digest(rows) });
  }
  requireThat(canonical(dependencyRows) === canonical(release.dependencyBindings), "SUCCESSOR_BOOTSTRAP_DEPENDENCY_DRIFT");
  return { files, bundleDigest: release.bundleDigest, dependenciesDigest: digest(dependencyRows) };
}
export async function launch(root, args) {
  let owned;
  try {
    // No third-party module or candidate/app code has executed at this point.
    const authenticated = await authenticateRuntime(root, args);
    owned = await mkdtemp(path.join(await realpath("/tmp"), "LR-"));
    for (const file of authenticated.files) {
      const dest = path.join(owned, file.path); await mkdir(path.dirname(dest), { recursive: true, mode: 0o700 }); await writeFile(dest, file.bytes, { flag: "wx", mode: file.mode === "100755" ? 0o700 : 0o600 });
    }
    // This imports authenticated captured bytes, never the mutable original
    // node_modules. The worker's own relative imports share this private tree.
    const module = await import(pathToFileURL(path.join(owned, ROOT, "promotion.mjs")).href);
    return await module.main(args, root);
  } catch (error) {
    const code = /^[A-Z][A-Z0-9_]{2,95}$/u.test(error.code ?? "") ? error.code : "SUCCESSOR_BOOTSTRAP_INTERNAL";
    const internal = code === "SUCCESSOR_BOOTSTRAP_INTERNAL" || code === "ETIMEDOUT" || code.includes("TIMEOUT");
    process.stdout.write(`${JSON.stringify({ schemaVersion: "promotion-legacy-successor-error.v1", result: internal ? "internal" : "blocked", code, liveAllowed: false })}\n`); return internal ? 3 : 2;
  } finally { if (owned) await rm(owned, { recursive: true }); }
}
