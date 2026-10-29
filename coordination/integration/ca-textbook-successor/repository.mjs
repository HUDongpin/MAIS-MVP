import { execFileSync, spawn } from "node:child_process";
import {
  lstatSync,
  realpathSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { parse, need, relative, hash, digest, same } from "./common.mjs";
export const GIT_ENV = Object.freeze({
  PATH: "/usr/bin:/bin",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_OPTIONAL_LOCKS: "0",
  GIT_TERMINAL_PROMPT: "0",
  GIT_GRAFT_FILE: "/dev/null",
  LC_ALL: "C",
});
export class Repository {
  constructor(root) {
    this.root = realpathSync(root);
    need(root === this.root, "CA_ROOT_ALIAS");
    const f = path.join(root, ".git"),
      s = lstatSync(f);
    need(!s.isSymbolicLink(), "CA_GIT_ALIAS");
    this.gitDir = s.isDirectory()
      ? realpathSync(f)
      : realpathSync(
          path.resolve(
            root,
            readFileSync(f, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u)?.[1] ??
              "INVALID",
          ),
        );
    this.head = this.line("rev-parse", "HEAD");
    need(
      this.line("rev-parse", "--is-shallow-repository") === "false",
      "CA_SHALLOW",
    );
    need(
      this.line("for-each-ref", "--format=%(refname)", "refs/replace/") === "",
      "CA_REPLACE",
    );
    for (const d of new Set([
      this.gitDir,
      this.line("rev-parse", "--path-format=absolute", "--git-common-dir"),
    ])) {
      try {
        lstatSync(path.join(d, "info/grafts"));
        need(false, "CA_GRAFT");
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
    }
  }
  args() {
    return [
      "--no-replace-objects",
      "--literal-pathspecs",
      "--no-optional-locks",
      "--git-dir=" + this.gitDir,
      "--work-tree=" + this.root,
      "-c",
      "core.worktree=" + this.root,
      "-c",
      "core.fsmonitor=false",
    ];
  }
  git(...args) {
    return execFileSync("/usr/bin/git", [...this.args(), ...args], {
      cwd: this.root,
      env: GIT_ENV,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60000,
      maxBuffer: 128 * 1024 * 1024,
    });
  }
  line(...a) {
    return this.git(...a)
      .toString("utf8")
      .trim();
  }
  commit(ref) {
    need(/^[a-f0-9]{40}$/u.test(ref), "CA_COMMIT");
    need(this.line("cat-file", "-t", ref) === "commit", "CA_COMMIT");
    return ref;
  }
  ancestor(a, b) {
    this.commit(a);
    this.commit(b);
    this.git("merge-base", "--is-ancestor", a, b);
  }
  parents(ref) {
    return this.line("show", "-s", "--format=%P", this.commit(ref))
      .split(" ")
      .filter(Boolean);
  }
  tree(ref) {
    return this.line("rev-parse", this.commit(ref) + "^{tree}");
  }
  time(ref) {
    return (
      Number(this.line("show", "-s", "--format=%ct", this.commit(ref))) * 1000
    );
  }
  entries(ref) {
    this.commit(ref);
    return new TextDecoder("utf-8", { fatal: true })
      .decode(this.git("ls-tree", "-r", "-z", ref))
      .split("\0")
      .filter(Boolean)
      .map((row) => {
        const m = row.match(/^(100644|100755) blob ([a-f0-9]{40})\t([^\0]+)$/u);
        need(m, "CA_SOURCE_MODE");
        relative(m[3]);
        return { path: m[3], mode: m[1], objectId: m[2] };
      });
  }
  blob(ref, file) {
    relative(file);
    this.commit(ref);
    const row = this.git("ls-tree", "-z", ref, "--", file).toString();
    const m = row.match(/^(100644|100755) blob ([a-f0-9]{40})\t([^\0]+)\0$/u);
    need(m && m[3] === file, "CA_BLOB");
    const bytes = this.git("show", ref + ":" + file);
    return {
      path: file,
      mode: m[1],
      objectId: m[2],
      sha256: hash(bytes),
      bytes,
    };
  }
  absent(ref, file) {
    relative(file);
    need(
      this.git("ls-tree", "-z", this.commit(ref), "--", file).length === 0,
      "CA_FUTURE_FILE",
    );
  }
  working(file) {
    relative(file);
    const p = path.join(this.root, file),
      s = lstatSync(p);
    need(
      s.isFile() &&
        !s.isSymbolicLink() &&
        s.nlink === 1 &&
        s.size <= 32 * 1024 * 1024 &&
        realpathSync(p) === p,
      "CA_FILE",
    );
    const bytes = readFileSync(p);
    return {
      path: file,
      mode: s.mode & 0o111 ? "100755" : "100644",
      objectId: createHash("sha1")
        .update("blob " + bytes.length + "\0")
        .update(bytes)
        .digest("hex"),
      sha256: hash(bytes),
      bytes,
    };
  }
  read(ref, binding, current = true) {
    const b = this.blob(ref, binding.path);
    if (binding.sha256) need(b.sha256 === binding.sha256, "CA_BYTES");
    if (binding.mode)
      need(
        b.mode === binding.mode && b.objectId === binding.objectId,
        "CA_MODE_OBJECT",
      );
    if (current) {
      const w = this.working(binding.path);
      need(w.mode === b.mode && w.bytes.equals(b.bytes), "CA_WORKTREE_DRIFT");
    }
    return b;
  }
  json(ref, binding, current = true) {
    return parse(this.read(ref, binding, current).bytes);
  }
  changed(a, b) {
    return this.git("diff", "--name-only", "--no-renames", "-z", a, b)
      .toString()
      .split("\0")
      .filter(Boolean)
      .sort();
  }
  addition(file) {
    relative(file);
    const ids = this.line(
      "log",
      this.head,
      "--format=%H",
      "--diff-filter=A",
      "--",
      file,
    ).split("\n");
    need(ids.length === 1 && /^[a-f0-9]{40}$/u.test(ids[0]), "CA_FIRST_ADD");
    return ids[0];
  }
  clean(materialize = true) {
    need(
      this.line("rev-parse", "HEAD") === this.head &&
        this.git("status", "--porcelain=v1", "--untracked-files=all").length ===
          0,
      "CA_DIRTY",
    );
    need(
      this.git("ls-files", "-v", "-z")
        .toString()
        .split("\0")
        .filter(Boolean)
        .every((x) => x.startsWith("H ")),
      "CA_INDEX_FLAGS",
    );
    if (materialize)
      for (const b of this.entries(this.head)) {
        const w = this.working(b.path);
        need(
          w.mode === b.mode && w.objectId === b.objectId,
          "CA_MATERIALIZATION",
        );
      }
    return this.tree(this.head);
  }
}
export function dependency(root) {
  const name = "typescript",
    folder = path.join(root, "node_modules", name);
  need(realpathSync(folder) === folder, "CA_DEPENDENCY_ALIAS");
  const files = [];
  function walk(rel = "") {
    for (const name of readdirSync(path.join(folder, rel)).sort()) {
      const p = path.posix.join(rel, name),
        s = lstatSync(path.join(folder, p));
      need(!s.isSymbolicLink() && s.nlink >= 1, "CA_DEPENDENCY_ALIAS");
      if (s.isDirectory()) walk(p);
      else {
        need(s.isFile() && s.nlink === 1, "CA_DEPENDENCY_FILE");
        const bytes = readFileSync(path.join(folder, p));
        files.push({
          path: p,
          mode: s.mode & 0o111 ? "100755" : "100644",
          sha256: hash(bytes),
          bytes,
        });
      }
    }
  }
  walk();
  const pkg = parse(readFileSync(path.join(folder, "package.json"))),
    lock = parse(readFileSync(path.join(root, "package-lock.json"))).packages[
      "node_modules/typescript"
    ];
  need(
    pkg.version === lock?.version && typeof lock.integrity === "string",
    "CA_DEPENDENCY_LOCK",
  );
  return {
    binding: {
      name,
      version: pkg.version,
      integrity: lock.integrity,
      fileCount: files.length,
      treeDigest: digest(files.map(({ bytes, ...r }) => r)),
    },
    files,
  };
}
export async function snapshot(repo, run) {
  const owned = mkdtempSync(path.join(realpathSync("/tmp"), "CA-"));
  try {
    const child = spawn(
        "/usr/bin/git",
        [...repo.args(), "archive", "--format=tar", repo.head],
        { cwd: repo.root, env: GIT_ENV, stdio: ["ignore", "pipe", "pipe"] },
      ),
      tar = spawn("/usr/bin/tar", ["-xf", "-", "-C", owned], {
        env: GIT_ENV,
        stdio: ["pipe", "ignore", "pipe"],
      });
    const done = (p) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          p.kill("SIGTERM");
          reject(new Error("CA_SNAPSHOT_TIMEOUT"));
        }, 60000);
        p.on("error", (e) => {
          clearTimeout(timer);
          reject(e);
        });
        p.on("close", (code) => {
          clearTimeout(timer);
          code === 0 ? resolve() : reject(new Error("CA_SNAPSHOT_EXPORT"));
        });
      });
    child.stdout.on("error", () => tar.stdin.destroy());
    tar.stdin.on("error", () => child.stdout.destroy());
    child.stdout.pipe(tar.stdin);
    await Promise.all([done(child), done(tar)]);
    const verify = () => {
      for (const r of repo.entries(repo.head)) {
        const p = path.join(owned, r.path),
          s = lstatSync(p);
        need(
          s.isFile() && !s.isSymbolicLink() && realpathSync(p) === p,
          "CA_SNAPSHOT_FILE",
        );
        const b = readFileSync(p);
        need(
          createHash("sha1")
            .update("blob " + b.length + "\0")
            .update(b)
            .digest("hex") === r.objectId &&
            (s.mode & 0o111 ? "100755" : "100644") === r.mode,
          "CA_SNAPSHOT_BYTES",
        );
      }
    };
    verify();
    const result = await run(owned);
    verify();
    return result;
  } finally {
    rmSync(owned, { recursive: true, force: true });
  }
}
