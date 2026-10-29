#!/usr/bin/env node
// Trust entry: built-ins only until anchored strict parser and release bytes verified.
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  lstatSync,
  realpathSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = "coordination/integration/ca-textbook-successor";
const ANCHOR = "32f53da1b13b2c1fd28ae4eec1807fd355cc4c17";
const PARSER_SHA =
  "b7b919123df63442012446f704bd454f0721b2dcbed4f8aa824d4d5180ce88e5";
// Inner Git, snapshot and observer operations retain their 60-second bounds.
// A complete validation also performs authenticated Git/input/materialization
// work around its observer. Reserve a closed 120-second total for each of the
// 1, 2, 3 or 10 required validations; there is no caller override.
const OPERATION_TIMEOUTS = Object.freeze({
  validate: 120000,
  shadow: 240000,
  "verify-receipt": 360000,
  finalize: 1200000,
});
const EXPECTED = [
  "coordination/integration/ca-textbook-successor/adapter-provenance.v1.json",
  "coordination/integration/ca-textbook-successor/adapter.test.mjs",
  "coordination/integration/ca-textbook-successor/audit.mjs",
  "coordination/integration/ca-textbook-successor/candidate.mjs",
  "coordination/integration/ca-textbook-successor/canonical-observer-ca-v1.mjs",
  "coordination/integration/ca-textbook-successor/canonical-observer-ca-v1.patch",
  "coordination/integration/ca-textbook-successor/canonical-transition.json",
  "coordination/integration/ca-textbook-successor/capsule-entry.mjs",
  "coordination/integration/ca-textbook-successor/capsule.mjs",
  "coordination/integration/ca-textbook-successor/capsule.test.mjs",
  "coordination/integration/ca-textbook-successor/common.mjs",
  "coordination/integration/ca-textbook-successor/constants.mjs",
  "coordination/integration/ca-textbook-successor/contract.mjs",
  "coordination/integration/ca-textbook-successor/contract.test.mjs",
  "coordination/integration/ca-textbook-successor/evidence.mjs",
  "coordination/integration/ca-textbook-successor/observer.mjs",
  "coordination/integration/ca-textbook-successor/operation.mjs",
  "coordination/integration/ca-textbook-successor/phase.mjs",
  "coordination/integration/ca-textbook-successor/promotion.mjs",
  "coordination/integration/ca-textbook-successor/receipts.mjs",
  "coordination/integration/ca-textbook-successor/repository.mjs",
  "coordination/integration/ca-textbook-successor/repository.test.mjs",
  "coordination/integration/ca-textbook-successor/runtime.mjs",
  "coordination/integration/ca-textbook-successor/schema.mjs",
  "coordination/integration/ca-textbook-successor/schemas.json",
  "coordination/integration/ca-textbook-successor/storage-loader-policy-v1.mjs",
  "coordination/integration/ca-textbook-successor/storage-loader-profile.v1.json",
  "coordination/integration/ca-textbook-successor/test-fixtures.mjs",
  "coordination/integration/promotion-gate-lib.mjs",
  "lib/server/mediaOwnerErasure.ts",
  "package-lock.json",
  "package.json",
  "scripts/promotion-workflow-json-guard.mjs",
];
const env = {
  PATH: "/usr/bin:/bin",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_GRAFT_FILE: "/dev/null",
  GIT_OPTIONAL_LOCKS: "0",
  GIT_TERMINAL_PROMPT: "0",
  LC_ALL: "C",
};
const hash = (b) => createHash("sha256").update(b).digest("hex");
const need = (v, c) => {
  if (!v) throw new Error(c);
};
const relative = (p) => {
  need(
    typeof p === "string" &&
      !p.startsWith("/") &&
      !p.includes("\\") &&
      !p.includes("\0") &&
      p.split("/").every((x) => x && x !== "." && x !== ".."),
    "CA_PATH",
  );
  return p;
};
const stable = (v) =>
  Array.isArray(v)
    ? "[" + v.map(stable).join(",") + "]"
    : v && typeof v === "object"
      ? "{" +
        Object.keys(v)
          .sort()
          .map((k) => JSON.stringify(k) + ":" + stable(v[k]))
          .join(",") +
        "}"
      : JSON.stringify(v);
let owned, parseOutput;
try {
  need(
    !process.env.NODE_OPTIONS &&
      !process.env.NODE_PATH &&
      process.execArgv.every(
        (a) => !/^--?(?:loader|import|require|experimental-loader)/u.test(a),
      ),
    "CA_LOADER_HOOK",
  );
  const [operation, ...args] = process.argv.slice(2),
    options = {};
  need(
    ["validate", "shadow", "verify-receipt", "finalize"].includes(operation),
    "CA_USAGE",
  );
  const allowed =
    operation === "validate"
      ? ["repo", "manifest"]
      : operation === "shadow"
        ? ["repo", "manifest", "run-id", "execute"]
        : ["repo", "manifest", "path", "storage-commit", "sha256", "execute"];
  for (let i = 0; i < args.length; i++) {
    const key = args[i].startsWith("--") ? args[i].slice(2) : "";
    need(allowed.includes(key) && !Object.hasOwn(options, key), "CA_USAGE");
    if (key === "execute") options[key] = true;
    else {
      need(args[i + 1] && !args[i + 1].startsWith("--"), "CA_USAGE");
      options[key] = args[++i];
    }
  }
  need(
    options.repo &&
      options.manifest &&
      (operation === "validate" || options.execute === true),
    "CA_USAGE",
  );
  const root = realpathSync(options.repo);
  need(root === options.repo, "CA_ROOT_ALIAS");
  relative(options.manifest);
  need(options.manifest.startsWith(ROOT + "/attempts/"), "CA_MANIFEST_PATH");
  const entry = path.join(root, ".git"),
    st = lstatSync(entry);
  need(!st.isSymbolicLink(), "CA_GIT_ALIAS");
  const gitDir = st.isDirectory()
    ? realpathSync(entry)
    : realpathSync(
        path.resolve(
          root,
          readFileSync(entry, "utf8").match(
            /^gitdir: ([^\r\n\0]+)\n?$/u,
          )?.[1] ?? "INVALID",
        ),
      );
  const git = (...a) =>
    execFileSync(
      "/usr/bin/git",
      [
        "--no-replace-objects",
        "--literal-pathspecs",
        "--no-optional-locks",
        "--git-dir=" + gitDir,
        "--work-tree=" + root,
        "-c",
        "core.worktree=" + root,
        "-c",
        "core.fsmonitor=false",
        ...a,
      ],
      {
        cwd: root,
        env,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 60000,
        maxBuffer: 128 * 1024 * 1024,
      },
    );
  const parserBytes = git(
    "show",
    ANCHOR + ":scripts/promotion-workflow-json-guard.mjs",
  );
  need(hash(parserBytes) === PARSER_SHA, "CA_PARSER_ANCHOR");
  const { parsePromotionWorkflowJsonBytes: parse } = await import(
    "data:text/javascript;base64," + parserBytes.toString("base64")
  );
  parseOutput = parse;
  const regular = (p) => {
    relative(p);
    const f = path.join(root, p),
      s = lstatSync(f);
    need(
      s.isFile() &&
        !s.isSymbolicLink() &&
        s.nlink === 1 &&
        s.size < 32 * 1024 * 1024 &&
        realpathSync(f) === f,
      "CA_FILE",
    );
    return readFileSync(f);
  };
  need(
    fileURLToPath(import.meta.url) === path.join(root, ROOT, "promotion.mjs"),
    "CA_ENTRYPOINT",
  );
  const head = git("rev-parse", "HEAD").toString().trim();
  need(
    git("status", "--porcelain=v1", "--untracked-files=all").length === 0,
    "CA_DIRTY",
  );
  const m = parse(regular(options.manifest));
  need(/^ca-textbook-[a-z0-9-]{1,48}$/.test(m.attemptId ?? ""), "CA_ATTEMPT_ID");
  const attemptPrefix = ROOT + "/attempts/" + m.attemptId;
  need(options.manifest === attemptPrefix + "/manifest.json", "CA_MANIFEST_PATH");
  need(
    m.checkerLedger?.path === attemptPrefix + "/checker-release.json",
    "CA_LEDGER_PATH",
  );
  const ledgerBytes = regular(m.checkerLedger.path);
  need(hash(ledgerBytes) === m.checkerLedger.sha256, "CA_LEDGER_BYTES");
  const ledger = parse(ledgerBytes);
  need(
    ledger.schemaVersion === "ca-textbook-checker-ledger.v1" &&
      ledger.version === "ca-textbook-successor.v3" &&
      ledger.releaseCommit === m.checkerReleaseCommit &&
      /^[a-f0-9]{40}$/.test(ledger.releaseCommit),
    "CA_RELEASE",
  );
  git("merge-base", "--is-ancestor", ANCHOR, ledger.releaseCommit);
  git("merge-base", "--is-ancestor", ledger.releaseCommit, head);
  need(
    JSON.stringify(ledger.files.map((x) => x.path)) ===
      JSON.stringify(EXPECTED),
    "CA_BUNDLE_SCOPE",
  );
  need(
    hash(
      Buffer.from(
        stable({ files: ledger.files, dependencies: ledger.dependencies }),
      ),
    ) === ledger.bundleDigest && ledger.bundleDigest === m.checkerBundleDigest,
    "CA_BUNDLE_DIGEST",
  );
  const captured = [];
  for (const b of ledger.files) {
    const bytes = regular(b.path);
    need(
      hash(bytes) === b.sha256 &&
        bytes.equals(git("show", ledger.releaseCommit + ":" + b.path)),
      "CA_RELEASE_BYTES",
    );
    const row = git(
      "ls-tree",
      "-z",
      ledger.releaseCommit,
      "--",
      b.path,
    ).toString();
    need(
      row === b.mode + " blob " + b.objectId + "\t" + b.path + "\0",
      "CA_RELEASE_MODE",
    );
    need(
      (lstatSync(path.join(root, b.path)).mode & 0o111
        ? "100755"
        : "100644") === b.mode &&
        bytes.equals(git("show", head + ":" + b.path)),
      "CA_CURRENT_CODE",
    );
    captured.push([b, bytes]);
  }
  owned = mkdtempSync(path.join(realpathSync("/tmp"), "CA-code-"));
  for (const [b, bytes] of captured) {
    const dest = path.join(owned, b.path);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, bytes, {
      flag: "wx",
      mode: b.mode === "100755" ? 0o700 : 0o600,
    });
  }
  const transport =
    operation === "verify-receipt" || operation === "finalize"
      ? {
          path: options.path,
          storageCommit: options["storage-commit"],
          sha256: options.sha256,
        }
      : null;
  if (transport)
    need(
      typeof transport.path === "string" &&
        /^[a-f0-9]{40}$/.test(transport.storageCommit ?? "") &&
        /^[a-f0-9]{64}$/.test(transport.sha256 ?? ""),
      "CA_USAGE",
    );
  const request = path.join(owned, "request.json");
  writeFileSync(
    request,
    JSON.stringify({
      operation,
      manifest: options.manifest,
      runId: options["run-id"] ?? null,
      transport,
    }),
    { flag: "wx", mode: 0o600 },
  );
  const timeout = OPERATION_TIMEOUTS[operation];
  const result = execFileSync(
    process.execPath,
    [path.join(owned, ROOT, "operation.mjs"), root, request],
    {
      cwd: root,
      env: { ...env, NODE_ENV: "test" },
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  const payload = parse(result);
  need(
    payload.result === "pass" || payload.lifecycleState === "shadow_passed",
    "CA_OPERATION_BLOCKED",
  );
  process.stdout.write(JSON.stringify(payload) + "\n");
} catch (e) {
  if (e.stdout) {
    try {
      const result = parseOutput?.(e.stdout);
      if (/^CA_[A-Z_]+$/.test(result.code)) e.code = result.code;
    } catch {}
  }
  process.stdout.write(
    JSON.stringify({
      result: "blocked",
      code: /^CA_[A-Z_]+$/.test(e.code ?? e.message ?? "")
        ? (e.code ?? e.message)
        : "CA_BOOTSTRAP_FAILED",
      liveAllowed: false,
    }) + "\n",
  );
  process.exitCode = 2;
} finally {
  if (owned) rmSync(owned, { recursive: true, force: true });
}
