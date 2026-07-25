import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

import { findMissingLocalImportTargets } from "./check-import-targets.mjs";

const execFileAsync = promisify(execFile);

test("findMissingLocalImportTargets reports unresolved @/ and relative imports", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "mais-import-targets-"));

  try {
    await mkdir(path.join(rootDir, "app"), { recursive: true });
    await mkdir(path.join(rootDir, "components", "ui"), { recursive: true });
    await writeFile(path.join(rootDir, "components", "ui", "Button.tsx"), "export const Button = null;\n");
    await writeFile(
      path.join(rootDir, "app", "page.tsx"),
      [
        'import { Button } from "@/components/ui/Button";',
        'import { MissingAlias } from "@/components/ui/MissingAlias";',
        'import { MissingRelative } from "../components/ui/MissingRelative";',
        'import react from "react";',
        "export default function Page() { return Button || MissingAlias || MissingRelative || react; }",
        ""
      ].join("\n")
    );

    const missing = await findMissingLocalImportTargets({
      rootDir,
      filePaths: ["app/page.tsx"]
    });

    assert.deepEqual(
      missing.map((entry) => ({
        importer: entry.importer,
        specifier: entry.specifier
      })),
      [
        {
          importer: "app/page.tsx",
          specifier: "@/components/ui/MissingAlias"
        },
        {
          importer: "app/page.tsx",
          specifier: "../components/ui/MissingRelative"
        }
      ]
    );
  } finally {
    await rm(rootDir, { force: true, recursive: true });
  }
});

test("findMissingLocalImportTargets skips deleted files listed by git", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "mais-import-targets-deleted-"));

  try {
    await mkdir(path.join(rootDir, "app"), { recursive: true });
    await writeFile(path.join(rootDir, "app", "page.tsx"), "export default function Page() { return null; }\n");

    const missing = await findMissingLocalImportTargets({
      rootDir,
      filePaths: ["app/page.tsx", "app/deleted-page.tsx"]
    });

    assert.deepEqual(missing, []);
  } finally {
    await rm(rootDir, { force: true, recursive: true });
  }
});

test("findMissingLocalImportTargets scans untracked non-ignored source files in a Git worktree", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "mais-import-targets-git-inventory-"));

  try {
    await execFileAsync("git", ["init", "--quiet"], { cwd: rootDir });
    await mkdir(path.join(rootDir, "app"), { recursive: true });
    await writeFile(path.join(rootDir, "app", "tracked.ts"), "export const tracked = true;\n");
    await execFileAsync("git", ["add", "app/tracked.ts"], { cwd: rootDir });
    await writeFile(
      path.join(rootDir, "app", "untracked.ts"),
      'import { missing } from "./missing-untracked-target";\nexport { missing };\n'
    );

    const missing = await findMissingLocalImportTargets({ rootDir });

    assert.deepEqual(missing, [
      {
        importer: "app/untracked.ts",
        specifier: "./missing-untracked-target"
      }
    ]);
  } finally {
    await rm(rootDir, { force: true, recursive: true });
  }
});

test("findMissingLocalImportTargets rejects lexical and canonical escapes without reading external files", async () => {
  const workspaceDir = await mkdtemp(path.join(tmpdir(), "mais-import-targets-containment-"));
  const rootDir = path.join(workspaceDir, "repo");
  const externalTarget = path.join(workspaceDir, "external.ts");
  const externalImporter = path.join(workspaceDir, "external-importer.ts");
  const sentinel = "EXTERNAL_SECRET_SENTINEL_MUST_NOT_LEAK";

  try {
    await mkdir(path.join(rootDir, "app"), { recursive: true });
    await mkdir(path.join(rootDir, "lib"), { recursive: true });
    await writeFile(externalTarget, `export const external = ${JSON.stringify(sentinel)};\n`);
    await writeFile(externalImporter, `import ${JSON.stringify(sentinel)} from "react";\n`);
    await symlink(externalTarget, path.join(rootDir, "lib", "external-link.ts"));
    await writeFile(
      path.join(rootDir, "app", "page.ts"),
      [
        'import { aliasEscape } from "@/../external";',
        'import { relativeEscape } from "../../external";',
        'import { symlinkEscape } from "@/lib/external-link";',
        "export { aliasEscape, relativeEscape, symlinkEscape };",
        ""
      ].join("\n")
    );

    const missing = await findMissingLocalImportTargets({
      rootDir,
      filePaths: ["app/page.ts", "../external-importer.ts"]
    });

    assert.deepEqual(missing, [
      {
        importer: "app/page.ts",
        specifier: "@/../external",
        reason: "target-outside-root"
      },
      {
        importer: "app/page.ts",
        specifier: "../../external",
        reason: "target-outside-root"
      },
      {
        importer: "app/page.ts",
        specifier: "@/lib/external-link",
        reason: "target-outside-root"
      },
      {
        importer: "../external-importer.ts",
        specifier: "",
        reason: "importer-outside-root"
      }
    ]);
    assert.equal(JSON.stringify(missing).includes(sentinel), false);
  } finally {
    await rm(workspaceDir, { force: true, recursive: true });
  }
});

test("findMissingLocalImportTargets parses literal local CommonJS requires in .cjs and .js files", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "mais-import-targets-commonjs-"));

  try {
    await mkdir(path.join(rootDir, "app"), { recursive: true });
    await writeFile(path.join(rootDir, "app", "existing.cjs"), "module.exports = true;\n");
    await writeFile(
      path.join(rootDir, "app", "main.cjs"),
      [
        'require("./existing");',
        'require("./missing-cjs");',
        'require("react");',
        "require(dynamicTarget);",
        ""
      ].join("\n")
    );
    await writeFile(path.join(rootDir, "app", "main.js"), 'require("./missing-js");\n');

    const missing = await findMissingLocalImportTargets({
      rootDir,
      filePaths: ["app/main.cjs", "app/main.js"]
    });

    assert.deepEqual(missing, [
      {
        importer: "app/main.cjs",
        specifier: "./missing-cjs"
      },
      {
        importer: "app/main.js",
        specifier: "./missing-js"
      }
    ]);
  } finally {
    await rm(rootDir, { force: true, recursive: true });
  }
});

test("findMissingLocalImportTargets exempts targets inside generated directories", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "mais-import-targets-generated-"));

  try {
    await mkdir(path.join(rootDir, "scripts"), { recursive: true });
    await writeFile(
      path.join(rootDir, "scripts", "eval-runner.mjs"),
      [
        'import { report } from "../.tmp/eval/lib/report.js";',
        'import { missing } from "./missing-helper.mjs";',
        "export { report, missing };",
        ""
      ].join("\n")
    );

    const missing = await findMissingLocalImportTargets({
      rootDir,
      filePaths: ["scripts/eval-runner.mjs"]
    });

    assert.deepEqual(missing, [
      {
        importer: "scripts/eval-runner.mjs",
        specifier: "./missing-helper.mjs"
      }
    ]);
  } finally {
    await rm(rootDir, { force: true, recursive: true });
  }
});

test("findMissingLocalImportTargets ignores import-like text inside a template string", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "mais-import-targets-template-string-"));

  try {
    await mkdir(path.join(rootDir, "app"), { recursive: true });
    await writeFile(
      path.join(rootDir, "app", "runner.ts"),
      [
        "const childProcessSource = `",
        '  import("./lib/server/runtime-target.ts").then(() => {});',
        "`;",
        "export { childProcessSource };",
        ""
      ].join("\n")
    );

    const missing = await findMissingLocalImportTargets({
      rootDir,
      filePaths: ["app/runner.ts"]
    });

    assert.deepEqual(missing, []);
  } finally {
    await rm(rootDir, { force: true, recursive: true });
  }
});
