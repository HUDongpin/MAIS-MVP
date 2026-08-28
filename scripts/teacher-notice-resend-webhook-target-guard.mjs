import { createHash, timingSafeEqual } from "node:crypto";
import { lstatSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const allowedActions = new Set(["migrate", "maintain", "destroy-test"]);
const allowedPostgresHosts = new Set([
  "127.0.0.1",
  "localhost",
  "[::1]",
  "postgres",
  "resend-webhook-postgres"
]);
const disposableDatabasePattern =
  /^mais_resend_webhook_(?:ci|test)(?:_[a-z0-9][a-z0-9_-]{0,47})?$/u;
const sqliteFilePattern = /\.(?:db|sqlite|sqlite3)$/u;

function isStrictDescendant(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative !== "" && relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function lstatRequired(candidate, label) {
  try {
    return lstatSync(candidate);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error(`${label} must already exist.`);
    }
    throw error;
  }
}

function lstatOptional(candidate) {
  try {
    return lstatSync(candidate);
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

function canonicalExistingDirectory(candidate, label) {
  const resolved = path.resolve(candidate);
  const metadata = lstatRequired(resolved, label);
  if (metadata.isSymbolicLink()) {
    throw new Error(`${label} must not be a symbolic link (symlink).`);
  }
  if (!metadata.isDirectory()) throw new Error(`${label} must be a directory.`);
  return realpathSync.native(resolved);
}

function canonicalFileBelowRoot(root, candidate) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  if (!isStrictDescendant(resolvedRoot, resolvedCandidate)) {
    throw new Error("SQLite mutation target is outside the allowlisted local test directories.");
  }
  const canonicalRoot = canonicalExistingDirectory(resolvedRoot, "SQLite mutation allowlist root");
  const components = path.relative(resolvedRoot, resolvedCandidate).split(path.sep);
  let lexical = resolvedRoot;
  let canonical = canonicalRoot;
  for (let index = 0; index < components.length; index += 1) {
    lexical = path.join(lexical, components[index]);
    canonical = path.join(canonical, components[index]);
    const metadata = lstatOptional(lexical);
    const finalComponent = index === components.length - 1;
    if (!metadata) {
      if (!finalComponent) {
        throw new Error("SQLite mutation target parent directory must already exist.");
      }
      return canonical;
    }
    if (metadata.isSymbolicLink()) {
      throw new Error("SQLite mutation target must not contain symbolic links (symlinks).");
    }
    if (!finalComponent && !metadata.isDirectory()) {
      throw new Error("SQLite mutation target parent must be a directory.");
    }
    if (finalComponent && !metadata.isFile()) {
      throw new Error("SQLite mutation target must identify one regular database file.");
    }
    const physical = realpathSync.native(lexical);
    if (physical !== canonical) {
      throw new Error("SQLite mutation target physical path is not canonical.");
    }
  }
  return canonical;
}

function postgresTarget(postgresUrl) {
  if (typeof postgresUrl !== "string" || postgresUrl.trim() === "") {
    throw new Error("POSTGRES_URL is required for the explicit PostgreSQL target.");
  }
  let parsed;
  try {
    parsed = new URL(postgresUrl);
  } catch {
    throw new Error("PostgreSQL mutation target URL is invalid.");
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("PostgreSQL mutation target must use postgres or postgresql.");
  }
  if (parsed.search || parsed.hash) {
    throw new Error("PostgreSQL mutation target query and fragment fields are forbidden.");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (!allowedPostgresHosts.has(hostname)) {
    throw new Error("PostgreSQL mutation target must use an allowlisted loopback or container host.");
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//u, ""));
  if (!disposableDatabasePattern.test(database) || database.includes("/")) {
    throw new Error("PostgreSQL mutation target must use a disposable Resend webhook database.");
  }
  const port = parsed.port || "5432";
  if (!/^[1-9][0-9]{0,4}$/u.test(port) || Number(port) > 65_535) {
    throw new Error("PostgreSQL mutation target port is invalid.");
  }
  return `postgres:${hostname}:${port}/${database}`;
}

function sqliteTarget(sqlitePath, options) {
  if (typeof sqlitePath !== "string" || sqlitePath.trim() === "") {
    throw new Error("HK_MATH_DB_PATH is required for the explicit SQLite target.");
  }
  const candidate = path.resolve(sqlitePath);
  if (!sqliteFilePattern.test(candidate)) {
    throw new Error("SQLite mutation target must identify one database file.");
  }
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const tmpDirectory = path.resolve(options.tmpDirectory ?? tmpdir());
  const canonicalCwd = realpathSync.native(cwd);
  const canonicalTmpDirectory = realpathSync.native(tmpDirectory);
  const localRoot = path.resolve(cwd, ".local");
  const testRoot = path.resolve(
    options.tmpDirectory ?? tmpdir(),
    "mais-resend-webhook-tests"
  );
  let canonicalCandidate;
  if (isStrictDescendant(localRoot, candidate)) {
    const physicalLocalRoot = canonicalExistingDirectory(localRoot, "SQLite mutation allowlist root");
    if (!isStrictDescendant(canonicalCwd, physicalLocalRoot)) {
      throw new Error("SQLite mutation allowlist root escapes through a canonical symlink.");
    }
    canonicalCandidate = canonicalFileBelowRoot(localRoot, candidate);
  } else if (isStrictDescendant(testRoot, candidate)) {
    const physicalTestRoot = canonicalExistingDirectory(testRoot, "SQLite mutation allowlist root");
    if (!isStrictDescendant(canonicalTmpDirectory, physicalTestRoot)) {
      throw new Error("SQLite mutation allowlist root escapes through a canonical symlink.");
    }
    canonicalCandidate = canonicalFileBelowRoot(testRoot, candidate);
  } else {
    throw new Error("SQLite mutation target is outside the allowlisted local test directories.");
  }
  return `sqlite:${canonicalCandidate}`;
}

export function prepareTeacherNoticeResendWebhookMutationTarget({
  action,
  provider,
  postgresUrl,
  sqlitePath,
  cwd,
  tmpDirectory
}) {
  if (!allowedActions.has(action)) throw new Error("Webhook mutation action is invalid.");
  if (provider !== "postgres" && provider !== "sqlite") {
    throw new Error("An explicit storage provider is required.");
  }
  if (action === "destroy-test" && provider !== "postgres") {
    throw new Error("The destructive integration target must be PostgreSQL.");
  }
  const canonicalTarget = provider === "postgres"
    ? postgresTarget(postgresUrl)
    : sqliteTarget(sqlitePath, { cwd, tmpDirectory });
  const fingerprint = createHash("sha256")
    .update(`teacher-notice-resend-webhook-v2\0${action}\0${canonicalTarget}`)
    .digest("hex");
  return {
    action,
    provider,
    canonicalTarget,
    fingerprint,
    requiredConfirmation: `confirm:${action}:${fingerprint}`
  };
}

export function assertTeacherNoticeResendWebhookTargetConfirmation(target, confirmation) {
  const expected = Buffer.from(target.requiredConfirmation, "utf8");
  const actual = Buffer.from(typeof confirmation === "string" ? confirmation : "", "utf8");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("Target-bound mutation confirmation is missing or does not match.");
  }
}

export function assertTeacherNoticeResendWebhookTargetUnchanged(expected, current) {
  const expectedDigest = Buffer.from(expected?.fingerprint ?? "", "utf8");
  const currentDigest = Buffer.from(current?.fingerprint ?? "", "utf8");
  if (
    expected?.action !== current?.action ||
    expected?.provider !== current?.provider ||
    expectedDigest.length !== currentDigest.length ||
    !timingSafeEqual(expectedDigest, currentDigest)
  ) {
    throw new Error("Mutation target changed after target-bound confirmation.");
  }
}
