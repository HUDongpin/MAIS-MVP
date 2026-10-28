import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, linkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as g from "./promotion-reviewed-code-pr299.mjs";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
const frozenChecks = {
  "schemaVersion": "pr299-source-checks.v1",
  "sourceCommit": "8bcb388e3eb27fb5d602557f0fa03ecfdb8755ea",
  "sourceTree": "1325966de5df35028c2f783413c51b03f9024f5d",
  "executedAt": "2026-10-28T04:55:36.178Z",
  "nodeMajor": 24,
  "liveProbePerformed": false,
  "commands": [
    {
      "name": "types",
      "args": [
        "--max-old-space-size=6144",
        "node_modules/typescript/bin/tsc",
        "--noEmit",
        "--incremental",
        "false"
      ],
      "exitCode": 0,
      "stdoutSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": null
    },
    {
      "name": "lesson-render-routing",
      "args": [
        "node_modules/tsx/dist/cli.mjs",
        "--tsconfig",
        "tsconfig.lesson-visualization-render.json",
        "--test",
        "--test-reporter=tap",
        "components/visualizations/lessonVisualizationRender.test.tsx",
        "components/visualizations/bespokeLabRouting.test.ts"
      ],
      "exitCode": 0,
      "stdoutSha256": "0f0def36a02054581c6fdba8177035d066f70797567c5debec2679fea4a56968",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "tests": 8,
        "suites": 0,
        "pass": 8,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "resultNamesDigest": "8b585d58dc37c6628a1eec352ff5ba17427660061e1393e8946c83a2b2fdefda"
      }
    },
    {
      "name": "zh-hans",
      "args": [
        "scripts/audit-zh-hans.mjs",
        "--fail-on-critical"
      ],
      "exitCode": 0,
      "stdoutSha256": "ec363d5a3025c50f4c7298e425f45d85281ad5e56585d5071e6a1ec80ae28acd",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "advisory": 3509,
        "ceiling": 3512,
        "nonPackCritical": 0,
        "packRegression": false
      }
    }
  ]
};
const frozenRuntime = {
  "schemaVersion": "pr299-local-browser-evidence.v1",
  "baseCommit": "6e38018d2ab794bdf4034286fa05bd031c699a23",
  "sourceCommit": "8bcb388e3eb27fb5d602557f0fa03ecfdb8755ea",
  "sourceTree": "1325966de5df35028c2f783413c51b03f9024f5d",
  "sourceFile": "data/lessons.ts",
  "sourceFileSha256": "ebef4b43e92c9a97d036bf5e86a563c04ab6cd650d6a14d0a299f62ef9fd02b2",
  "previousExecution": {
    "checkedAt": "2026-10-28T04:23:16.891267+00:00",
    "sourceWorktreeHeadAtExecution": "6e38018d2ab794bdf4034286fa05bd031c699a23",
    "sourceFileSha256": "ebef4b43e92c9a97d036bf5e86a563c04ab6cd650d6a14d0a299f62ef9fd02b2",
    "recordSha256": "3dcf0a955c63b15ec054dcb5c9ba3c6ee5d0721ee477433dba2322ce7144b4ef",
    "priorA18RecordSha256": "3c79b3f38da54932887cb8d63f0cff46217ddae25d98a2a71de4601ee501dd5c",
    "priorA18Reviewer": "/root/a18_p2_copy_review",
    "priorA18Verdict": "approved-for-integration-review"
  },
  "evidenceVerification": {
    "reviewer": "/root/p2_evidence_review",
    "manifestSha256": "1bd6042007531a88a03b458f96ec191e09b76cdffa5a9e675f40b8996b1d3f50",
    "originalIndependentA18Verified": true
  },
  "provenance": "Consumed prior local desktop execution at identical source and dependency bytes; no CI browser replay or production validation.",
  "browserReexecutedInCi": false,
  "liveAllowed": false,
  "wholeLessonApproved": false,
  "route": "/student/lessons/p2-length-data",
  "languages": [
    "en",
    "zh",
    "zhHans"
  ],
  "stateCount": 24,
  "results": [
    {
      "language": "en",
      "states": [
        {
          "label": "initial",
          "values": [
            6,
            9,
            12
          ],
          "total": 27,
          "longest": "C",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "A maximum with two longest",
          "values": [
            12,
            9,
            12
          ],
          "total": 33,
          "longest": "A, C",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "all maximum and three longest",
          "values": [
            12,
            12,
            12
          ],
          "total": 36,
          "longest": "A, B, C",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "C minimum",
          "values": [
            12,
            12,
            1
          ],
          "total": 25,
          "longest": "A, B",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "all minimum",
          "values": [
            1,
            1,
            1
          ],
          "total": 3,
          "longest": "A, B, C",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "keyboard unit step",
          "values": [
            1,
            2,
            1
          ],
          "total": 4,
          "longest": "B",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "pointer drag C maximum",
          "values": [
            1,
            2,
            12
          ],
          "total": 15,
          "longest": "C",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "reset",
          "values": [
            6,
            9,
            12
          ],
          "total": 27,
          "longest": "C",
          "barGeometryAndVisibleSummary": true
        }
      ],
      "pageErrors": [],
      "exactTitleAndCopyVisible": true
    },
    {
      "language": "zh",
      "states": [
        {
          "label": "initial",
          "values": [
            6,
            9,
            12
          ],
          "total": 27,
          "longest": "C",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "A maximum with two longest",
          "values": [
            12,
            9,
            12
          ],
          "total": 33,
          "longest": "A, C",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "all maximum and three longest",
          "values": [
            12,
            12,
            12
          ],
          "total": 36,
          "longest": "A, B, C",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "C minimum",
          "values": [
            12,
            12,
            1
          ],
          "total": 25,
          "longest": "A, B",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "all minimum",
          "values": [
            1,
            1,
            1
          ],
          "total": 3,
          "longest": "A, B, C",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "keyboard unit step",
          "values": [
            1,
            2,
            1
          ],
          "total": 4,
          "longest": "B",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "pointer drag C maximum",
          "values": [
            1,
            2,
            12
          ],
          "total": 15,
          "longest": "C",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "reset",
          "values": [
            6,
            9,
            12
          ],
          "total": 27,
          "longest": "C",
          "barGeometryAndVisibleSummary": true
        }
      ],
      "pageErrors": [],
      "exactTitleAndCopyVisible": true
    },
    {
      "language": "zhHans",
      "states": [
        {
          "label": "initial",
          "values": [
            6,
            9,
            12
          ],
          "total": 27,
          "longest": "C",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "A maximum with two longest",
          "values": [
            12,
            9,
            12
          ],
          "total": 33,
          "longest": "A, C",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "all maximum and three longest",
          "values": [
            12,
            12,
            12
          ],
          "total": 36,
          "longest": "A, B, C",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "C minimum",
          "values": [
            12,
            12,
            1
          ],
          "total": 25,
          "longest": "A, B",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "all minimum",
          "values": [
            1,
            1,
            1
          ],
          "total": 3,
          "longest": "A, B, C",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "keyboard unit step",
          "values": [
            1,
            2,
            1
          ],
          "total": 4,
          "longest": "B",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "pointer drag C maximum",
          "values": [
            1,
            2,
            12
          ],
          "total": 15,
          "longest": "C",
          "barGeometryAndVisibleSummary": true
        },
        {
          "label": "reset",
          "values": [
            6,
            9,
            12
          ],
          "total": 27,
          "longest": "C",
          "barGeometryAndVisibleSummary": true
        }
      ],
      "pageErrors": [],
      "exactTitleAndCopyVisible": true
    }
  ],
  "actions": "real keyboard Home/End/ArrowRight and mouse pointer drag",
  "artifacts": [
    {
      "path": ".local/pr172-p2-length-copy/candidate.json",
      "sha256": "a06a413478933ea21d6538b0bc93a9a7115487dfe967f19c3c7f9d69e6ec3e76",
      "bytes": 913
    },
    {
      "path": ".local/pr172-p2-length-copy/a18-review.json",
      "sha256": "3c79b3f38da54932887cb8d63f0cff46217ddae25d98a2a71de4601ee501dd5c",
      "bytes": 959
    },
    {
      "path": ".local/pr172-p2-length-copy/verification.json",
      "sha256": "3dcf0a955c63b15ec054dcb5c9ba3c6ee5d0721ee477433dba2322ce7144b4ef",
      "bytes": 10180
    },
    {
      "path": ".local/pr172-p2-length-copy/session.md",
      "sha256": "079ea72a58e36a0f4c082e565b150d290e97e898e5668d3fa91afa2b95fb7656",
      "bytes": 843
    },
    {
      "path": ".local/pr172-p2-length-copy/verification-dependency-versions.json",
      "sha256": "c4bbe14b88efab8dd6a48378f8a284070a0520c53e6e7b136804f796f9afbc2a",
      "bytes": 1146
    },
    {
      "path": ".local/pr172-p2-length-copy/type-check.log",
      "sha256": "78939b20b4cbed2bbcbadc97f795dcdf6e83cc9d056450516025776a9aa39f1d",
      "bytes": 77
    },
    {
      "path": ".local/pr172-p2-length-copy/targeted-regressions.log",
      "sha256": "319786c228f3267f14f4fb80e381f394cf122f29ae84b75d71d47d078231bd03",
      "bytes": 795
    },
    {
      "path": ".local/pr172-p2-length-copy/zh-hans-audit.log",
      "sha256": "3f78f32a3e2c24a5ad914d27026bde043fbf2b5abd67d5800016ce31e688d1f4",
      "bytes": 82572
    },
    {
      "path": ".local/pr172-p2-length-copy/browser-en.log",
      "sha256": "a95d4c1a224992e573a0d3c25c0ba6598db64e4b4816b6390b60c89195a857a9",
      "bytes": 5083
    },
    {
      "path": ".local/pr172-p2-length-copy/browser-zh.log",
      "sha256": "7bd0419241888a51fb3a36cbc66d8367046cccc4763cef57e71d766dc8cf0953",
      "bytes": 4891
    },
    {
      "path": ".local/pr172-p2-length-copy/browser-zh-Hans.log",
      "sha256": "ee3db541f19f4c5433a8f734037af7242a531e9302817cadedd52245478c2cb7",
      "bytes": 4830
    },
    {
      "path": ".local/pr172-p2-length-copy/browser-en-code.txt",
      "sha256": "6ae5ba15dda2315ece32250e0837d3baf79772399136bb9e3e8a12a85433654b",
      "bytes": 3815
    },
    {
      "path": ".local/pr172-p2-length-copy/browser-zh-code.txt",
      "sha256": "62df5db7809f3569af724b047df17b381a3bd885b14a45f1fa2c2ba7f21aed76",
      "bytes": 3811
    },
    {
      "path": ".local/pr172-p2-length-copy/browser-zh-Hans-code.txt",
      "sha256": "f42414c43fcd30e8d011ad17e267a868b646f3b10b9135da9ebca1f0c77dda50",
      "bytes": 3746
    },
    {
      "path": ".local/pr172-p2-length-copy/zh-Hans-reload-code.txt",
      "sha256": "a707e69e1b89df7c8f18b50bfad0d8529bd72b4958eab7d1802363aea0d45acf",
      "bytes": 1182
    }
  ],
  "dependencies": [
    {
      "path": "components/visualizations/GeometryExplorer.tsx",
      "sha256": "bed0fc1e081720293cdea19479ec734e3430536597ac22ad4fcaa593bfd7900c",
      "same_as_baseline": true
    },
    {
      "path": "components/lesson/LessonView.tsx",
      "sha256": "27d3c3420b986500f948d5f1b3bd4e204ea76c74e558c73413aa71991cd088bd",
      "same_as_baseline": true
    },
    {
      "path": "components/lesson/lessonContentText.ts",
      "sha256": "5a41082852116a890afc790e5fc418c59eadbb90272a75861de7f450a530351f",
      "same_as_baseline": true
    },
    {
      "path": "data/topics.ts",
      "sha256": "91215da1fd6b955d898459e32169742191442e6942e07a7880ddf7fe198268ff",
      "same_as_baseline": true
    },
    {
      "path": "data/visualizationLabs.ts",
      "sha256": "53e742b29845f014d378440829ea6e03c2b4ce2f26fe493b002d022890998923",
      "same_as_baseline": true
    },
    {
      "path": "lib/i18n.ts",
      "sha256": "9832c03eb485e7efec3ced47394bfe393006cae14a0d5748d5aae9f7e03a71bb",
      "same_as_baseline": true
    },
    {
      "path": "types/index.ts",
      "sha256": "b244961341a1f5296cdd6169c4bf5370f39c11eb8b27a8098bdc7837702985d7",
      "same_as_baseline": true
    },
    {
      "path": "components/visualizations/lessonVisualizationRender.test.tsx",
      "sha256": "0a1b3f63d3fe9d57d001ab810a7020c9132cfa631d066befe4f39387db327c45",
      "same_as_baseline": true
    },
    {
      "path": "components/visualizations/bespokeLabRouting.test.ts",
      "sha256": "567bcf43cc7bb4c0412b6c9335c067f7fd9fae5e116e2059c1112687df38c2da",
      "same_as_baseline": true
    },
    {
      "path": "tsconfig.lesson-visualization-render.json",
      "sha256": "325dcb622458e488c5fe4d14521a32c4545497c71f3d02c576f8c57bcdc9d37f",
      "same_as_baseline": true
    },
    {
      "path": "package.json",
      "sha256": "cea2ef7cd6e778a949fce8cf75a1002dc63503793fb12c6545b7f6e0ce26464f",
      "same_as_baseline": true
    },
    {
      "path": "package-lock.json",
      "sha256": "58fe996a95695b26e705e29eafb6d45de9f5444ebbd29e70e9af2895c3137767",
      "same_as_baseline": true
    }
  ],
  "screenshots": [
    {
      "path": "output/playwright/pr172-p2-length-copy/en-desktop.png",
      "sha256": "b560331e101b08bbdeb5a74c05af864038c46b42d2d332d8f86877953316a226",
      "bytes": 73182
    },
    {
      "path": "output/playwright/pr172-p2-length-copy/zh-desktop.png",
      "sha256": "793eb1b43b49e2c2c1c28c2aefe004abcae7ba7586095c58f33d23aa99da5d94",
      "bytes": 75039
    },
    {
      "path": "output/playwright/pr172-p2-length-copy/zh-Hans-desktop-reloaded.png",
      "sha256": "e7c69da322060b358674fa3ccbdbe77e5126935987718b0dd59aa0eff0782c4c",
      "bytes": 68197
    }
  ],
  "visualLimit": "all three review screenshots inspected; a partially painted Simplified Chinese screenshot was retained separately and fresh-reload screenshot verified complete"
};
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" };
const git = (cwd, ...args) => execFileSync("/usr/bin/git", ["--no-replace-objects", ...args], { cwd, env, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024 }).toString("utf8").trim();
const write = (repo, file, bytes) => { mkdirSync(path.dirname(path.join(repo, file)), { recursive: true }); writeFileSync(path.join(repo, file), bytes); };
const json = value => JSON.stringify(value, null, 2) + "\n";
function temporaryRepo(run) {
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr299-contract-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic PR299 Fixture"); git(repo, "config", "user.email", "fixture@example.invalid");
    git(repo, "config", "commit.gpgsign", "false"); git(repo, "config", "core.hooksPath", "/dev/null");
    run({ temporary, repo });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
function fixture(run, options = {}) {
  temporaryRepo(({ temporary, repo }) => {
    write(repo, ".git/objects/info/alternates", path.join(git(root, "rev-parse", "--path-format=absolute", "--git-common-dir"), "objects") + "\n");
    git(repo, "config", "core.sparseCheckout", "true");
    write(repo, ".git/info/sparse-checkout", [...g.CODE_PATHS, ...g.SOURCE_PATHS, g.DIRECTORY + "/"].map(p => "/" + p).join("\n") + "\n");
    git(repo, "checkout", "--detach", "-q", g.SOURCE);
    const commit = files => { git(repo, "add", "--sparse", "--", ...files); git(repo, "commit", "-qm", "Synthetic PR299 test fixture; not an approval"); };
    for (const file of g.CODE_PATHS) write(repo, file, readFileSync(path.join(root, file)));
    options.tooling?.(repo);
    for (const file of options.extraTooling ?? []) write(repo, file, "Unreviewed delta\n");
    commit([...g.CODE_PATHS, ...(options.extraTooling ?? [])]);
    const tooling = git(repo, "rev-parse", "HEAD");
    const admission = { schemaVersion: "pr299-admission.v1", pullRequest: 299, scope: g.SCOPE, baseCommit: g.BASE,
      sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, sourceInventoryDigest: g.SOURCE_INVENTORY,
      toolingCommit: tooling, toolingTree: git(repo, "rev-parse", "HEAD^{tree}"), toolingInventoryDigest: g.digest(g.inventory(repo, g.SOURCE, tooling)),
      checksRawSha256: g.CHECKS_SHA, runtimeEvidenceRawSha256: g.RUNTIME_SHA, reviews: {}, permissions: g.PERMISSIONS };
    const core = {
      "source-inventory.json": Buffer.from(json({ schemaVersion: "pr299-source-inventory.v1", baseCommit: g.BASE,
        sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, inventoryDigest: g.SOURCE_INVENTORY,
        entries: g.inventory(root, g.BASE, g.SOURCE) })),
      "source-checks.json": Buffer.from(json(frozenChecks)),
      "runtime-evidence.json": Buffer.from(json(frozenRuntime))
    };
    for (const [file, bytes] of Object.entries(core)) {
      write(repo, g.DIRECTORY + "/" + file, options.core?.(file, bytes) ?? bytes);
    }
    for (const role of ["A18", "A11", "A23"]) {
      const report = Buffer.from("Synthetic PR299 contract fixture. Not an actual review or approval.\n");
      const review = { schemaVersion: "pr299-independent-review.v1", role, reviewerIdentity: g.IDENTITIES[role],
        result: role === "A18" ? "approved-for-integration-review" : "approved-for-exact-pr299-required-check", scope: g.SCOPE,
        sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, sourceInventoryDigest: g.SOURCE_INVENTORY,
        toolingCommit: tooling, toolingTree: admission.toolingTree, toolingInventoryDigest: admission.toolingInventoryDigest,
        checksRawSha256: g.CHECKS_SHA, runtimeEvidenceRawSha256: g.RUNTIME_SHA, reportRawSha256: g.hash(report),
        permissions: g.PERMISSIONS, reviewedAt: new Date().toISOString(), findings: ["Synthetic shape test only; not independent reviewer evidence."] };
      options.review?.(role, review);
      const decision = Buffer.from(json(review)), prefix = g.DIRECTORY + "/" + role.toLowerCase() + "-review";
      write(repo, prefix + ".json", decision); write(repo, prefix + ".md", report);
      admission.reviews[role] = { decisionRawSha256: g.hash(decision), reportRawSha256: g.hash(report) };
    }
    options.admission?.(admission);
    let bytes = json(admission);
    if (options.duplicate) bytes = bytes.replace('"schemaVersion":', '"pullRequest": 299, "schemaVersion":');
    write(repo, g.ADMISSION, bytes);
    for (const file of options.extraEvidence ?? []) write(repo, file, "Extra unreviewed evidence\n");
    commit([...g.EVIDENCE_PATHS, ...(options.extraEvidence ?? [])]);
    const evidence = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const event = () => ({ repository: { full_name: "HUDongpin/MAIS-MVP" }, number: 299,
      pull_request: { number: 299, base: { ref: "main", sha: g.BASE, repo: { full_name: "HUDongpin/MAIS-MVP" } },
        head: { sha: git(repo, "rev-parse", "HEAD"), repo: { full_name: "HUDongpin/MAIS-MVP" } } } });
    const check = (eventName = "pull_request", value = event()) => { writeFileSync(eventPath, json(value)); return g.preflight({ repoRoot: repo, eventName, eventPath }); };
    run({ repo, temporary, tooling, evidence, event, check, commit, eventPath });
  });
}

test("source is exactly the six-string P2 copy delta on the fixed base", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.equal(entries.length, 1); assert.equal(g.digest(entries), g.SOURCE_INVENTORY);
  g.validateSourceInventory(entries);
  assert.deepEqual(entries.map(e => e.path), g.SOURCE_PATHS);
  assert.deepEqual(git(root, "show", "-s", "--format=%P", g.SOURCE).split(" "), [g.BASE]);
  const before=execFileSync("git",["show",g.BASE+":data/lessons.ts"],{cwd:root});
  const after=execFileSync("git",["show",g.SOURCE+":data/lessons.ts"],{cwd:root});
  g.validateSourceBytes(before,after);
});
test("a second source path or source mode/hash drift is rejected", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.throws(() => g.validateSourceInventory([...entries, { ...entries[0], path: "app/unreviewed.ts" }]), /PR299_SOURCE/);
  const changed = structuredClone(entries); changed[0].after.mode = "100755";
  assert.throws(() => g.validateSourceInventory(changed), /PR299_SOURCE/);
  const wrong = structuredClone(entries); wrong[0].after.rawSha256="0".repeat(64); assert.throws(() => g.validateSourceInventory(wrong), /PR299_SOURCE/);
});
test("workflow is exactly the three deterministic insertions with old actions and steps retained", () => {
  const before = execFileSync("git",["show",g.SOURCE+":.github/workflows/promotion-shadow.yml"],{cwd:root}).toString();
  assert.equal(readFileSync(path.join(root,".github/workflows/promotion-shadow.yml"),"utf8"),g.expectedWorkflow(before));
  assert.throws(()=>g.expectedWorkflow("unknown workflow"),/PR299_WORKFLOW/);
  assert.ok(g.expectedWorkflow(before).indexOf("pr299-v1")<g.expectedWorkflow(before).indexOf("pr298-v1/admission"));
});
test("complete synthetic S T E chain accepts exactly PR299 and no deployment permissions", () => fixture(({check,evidence})=>{
  const result=check();assert.equal(result.evidenceCommit,evidence);assert.ok(Object.values(result.admission.permissions).every(v=>v===false));
}));
test("wrong PR repository fork ref base and head fail closed", () => fixture(({check,event})=>{
  for(const mutate of [e=>{e.number=296;},e=>{e.pull_request.number=300;},e=>{e.repository.full_name="other/repo";},
    e=>{e.pull_request.head.repo.full_name="other/repo";},e=>{e.pull_request.base.repo.full_name="other/repo";},
    e=>{e.pull_request.base.ref="dev";},e=>{e.pull_request.base.sha=g.SOURCE;},e=>{e.pull_request.head.sha=g.SOURCE;}]){
    const e=event();mutate(e);assert.throws(()=>check("pull_request",e),/PR299_EVENT/);
  }
}));
test("only ordered B E parents and equal E tree admit the main merge", () => fixture(({repo,evidence,check})=>{
  const merge=git(repo,"commit-tree",evidence+"^{tree}","-p",g.BASE,"-p",evidence,"-m","Synthetic merge");
  git(repo,"checkout","--detach","-q",merge);
  const event={repository:{full_name:"HUDongpin/MAIS-MVP"},ref:"refs/heads/main",before:g.BASE,after:merge};
  assert.equal(check("push",event).head,merge);
  for(const parents of [[evidence,g.BASE],[g.BASE],[evidence]]){
    const next=git(repo,"commit-tree",evidence+"^{tree}",...parents.flatMap(p=>["-p",p]),"-m","Invalid composition");
    git(repo,"checkout","--detach","-q",next);assert.throws(()=>check("push",{...event,after:next}),/PR299_(EVENT|EVIDENCE)/);
  }
}));
test("same-tree empty descendants cannot reuse E", () => fixture(({repo,check})=>{
  git(repo,"commit","--allow-empty","-qm","Unreviewed descendant");assert.throws(check,/PR299_EVENT_PR/);
}));
test("extra tooling runtime path is rejected even with recomputed inventory", () => fixture(({check})=>assert.throws(check,/PR299_TOOLING_PATHS/),{extraTooling:["lib/pr299-extra.ts"]}));
test("old checker edits are not admitted as tooling", () => fixture(({check})=>assert.throws(check,/PR299_TOOLING_PATHS/),{extraTooling:["scripts/promotion-reviewed-code-pr295.mjs"]}));
test("workflow weakening fails deterministic reconstruction", () => fixture(({check})=>assert.throws(check,/PR299_WORKFLOW/),{
  tooling:repo=>{const p=path.join(repo,".github/workflows/promotion-shadow.yml");writeFileSync(p,readFileSync(p,"utf8").replace("    runs-on: ubuntu-latest","    continue-on-error: true\n    runs-on: ubuntu-latest"));}
}));
test("extra evidence path fails exact E partition", () => fixture(({check})=>assert.throws(check,/PR299_EVIDENCE_PATHS/),{extraEvidence:[g.DIRECTORY+"/extra.json"]}));
test("source retargeting and unsupported live claims change the frozen execution bytes", () => fixture(({check})=>assert.throws(check,/PR299_EXECUTION_EVIDENCE/),{
  core:(file,bytes)=>file==="source-checks.json"?Buffer.from(json({...parse(bytes),liveProbePerformed:true,sourceCommit:g.BASE})):bytes
}));
test("changed commands cannot be hidden by recomputing admission hashes", () => fixture(({check})=>assert.throws(check,/PR299_SCOPE/),{admission:a=>{a.checksRawSha256="0".repeat(64);}}));
test("wrong independent identity is rejected despite internally consistent review hashes", () => fixture(({check})=>assert.throws(check,/PR299_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A23")r.reviewerIdentity=g.IDENTITIES.A11;}}));
test("reviewers cannot upgrade the bounded decision to whole-pack admission", () => fixture(({check})=>assert.throws(check,/PR299_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A11")r.result="approved-for-whole-pack";}}));
test("stale tooling binding and future review time fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR299_REVIEW_BINDING/),{review:(role,r)=>{if(role==="A11")r.toolingCommit=g.SOURCE;}});
  fixture(({repo,check})=>{
    assert.throws(check,/PR299_REVIEW_FACTS/);
    const a=parse(readFileSync(path.join(repo,g.ADMISSION))),r=parse(readFileSync(path.join(repo,g.DIRECTORY,"a11-review.json"))),report=readFileSync(path.join(repo,g.DIRECTORY,"a11-review.md"));
    for(const reviewedAt of [0,["2026-10-26"],"2026-10-26","2026-02-30T00:00:00.000Z","not-a-date"])assert.throws(()=>g.validateReview({...r,reviewedAt},"A11",a,report),/PR299_REVIEW_FACTS/);
    g.validateReview({...r,reviewedAt:"2026-10-26T00:00:00.000Z"},"A11",a,report);
  },{review:(role,r)=>{if(role==="A11")r.reviewedAt="2999-01-01T00:00:00.000Z";}});
});
test("permission widening and unknown admission keys fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR299_PERMISSION/),{admission:a=>{a.permissions={...a.permissions,deployAllowed:true};}});
  fixture(({check})=>assert.throws(check,/PR299_SCHEMA/),{admission:a=>{a.allowDescendants=true;}});
});
test("duplicate JSON authority is rejected", () => fixture(({check})=>assert.throws(check,error=>error.code==="PROMOTION_WORKFLOW_JSON_DUPLICATE_KEY"),{duplicate:true}));
test("dirty source and symlink or hardlink evidence fail closed", () => fixture(({repo,temporary,check})=>{
  write(repo,"extra-untracked.txt","x");assert.throws(check,/PR299_DIRTY/);rmSync(path.join(repo,"extra-untracked.txt"));
  const p=path.join(repo,g.ADMISSION),bytes=readFileSync(p),outside=path.join(temporary,"admission.json");writeFileSync(outside,bytes);
  rmSync(p);symlinkSync(outside,p);assert.throws(check,/PR299_(DIRTY|FILE)/);rmSync(p);linkSync(outside,p);assert.throws(check,/PR299_FILE/);
}));
test("materialization rejects hidden index flags and changed bytes", () => temporaryRepo(({repo})=>{
  write(repo,"source.txt","original\n");git(repo,"add","--","source.txt");git(repo,"commit","-qm","fixture");const head=git(repo,"rev-parse","HEAD");
  g.assertMaterializedTree(repo,head);git(repo,"update-index","--assume-unchanged","source.txt");assert.throws(()=>g.assertMaterializedTree(repo,head),/INDEX_FLAGS/);
  git(repo,"update-index","--no-assume-unchanged","source.txt");write(repo,"source.txt","changed\n");assert.throws(()=>g.assertMaterializedTree(repo,head),/SOURCE_BYTES/);
}));
const nested = `TAP version 13
# Subtest: parent
    # Subtest: child
    ok 1 - child
      ---
      duration_ms: 1.0
      type: 'test'
      ...
    1..1
ok 1 - parent
  ---
  duration_ms: 2.0
  type: 'test'
  ...
1..1
# tests 2
# suites 0
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3.0
`;
test("nested t.test parent remains a test and is counted accurately",()=>{
  const result=g.testSummary(Buffer.from(nested));assert.equal(result.tests,2);assert.equal(result.resultNamesDigest,g.digest(["child","parent"]));
  const suite=nested.replace("  type: 'test'\n  ...\n1..1","  type: 'suite'\n  ...\n1..1").replace("# tests 2","# tests 1").replace("# suites 0","# suites 1").replace("# pass 2","# pass 1");
  assert.equal(g.testSummary(Buffer.from(suite)).suites,1);
});
test("TAP rejects false child plans truncation duplicated summaries and unconsumed results",()=>{
  for(const value of [nested.replace("    1..1","    1..2"),nested.slice(0,nested.indexOf("# tests")),nested+"# tests 2\n",nested+"ok 2 - hidden\n",nested.replace("ok 1 - child","ok 2 - child"),nested.replace("# Subtest: child","# Subtest: false")])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR299_TEST/);
});
test("TAP rejects failure skipped zero tests TODO and malformed UTF8",()=>{
  for(const value of [nested.replace("ok 1 - child","not ok 1 - child"),nested.replace("ok 1 - child","ok 1 - child # SKIP"),nested.replace("ok 1 - child","ok 1 - child # TODO"),"TAP version 13\n1..0\n# tests 0\n",nested+"Bail out!\n"])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR299_TEST/);
  assert.throws(()=>g.testSummary(Buffer.from([0xff])));
});
test("only the exact type routing-render and Simplified Chinese checks are rerun", () => {
  assert.deepEqual(g.COMMANDS, frozenChecks.commands.map(({name,args,summary})=>({name,args,summary})));
  assert.equal(g.COMMANDS[1].summary.tests,8); assert.equal(g.COMMANDS[1].summary.skipped,0);
  assert.deepEqual(g.COMMANDS[0].args,["--max-old-space-size=6144","node_modules/typescript/bin/tsc","--noEmit","--incremental","false"]);
});
test("child environment excludes health credentials provider keys database URLs and NODE_OPTIONS", () => {
  const names = ["NODE_OPTIONS", "DATABASE_URL", "OPENAI_API_KEY", "TEACHER_NOTICE_HEALTH_SECRET", "CRON_SECRET", "NODE_PATH"];
  const before = Object.fromEntries(names.map(k => [k, process.env[k]]));
  try {
    for (const name of names) process.env[name] = "synthetic-private-value";
    const env = g.commandEnvironment();
    for (const name of names) assert.equal(env[name], undefined);
    assert.equal(env.NODE_ENV, "test");
  } finally { for (const [k,v] of Object.entries(before)) if (v === undefined) delete process.env[k]; else process.env[k] = v; }
});
test("artifact output requires a fresh private canonical temporary directory outside the repository", () => temporaryRepo(({ temporary, repo }) => {
  const before = process.env.RUNNER_TEMP; process.env.RUNNER_TEMP = temporary;
  try {
    const output = path.join(temporary, "proof"); mkdirSync(output, { mode: 0o700 });
    assert.equal(g.assertArtifactRoot(output, repo), output);
    writeFileSync(path.join(output, "old.json"), "{}"); assert.throws(() => g.assertArtifactRoot(output, repo), /PR299_ARTIFACT/);
    rmSync(path.join(output, "old.json"));
    const publicOutput = path.join(temporary, "public-proof"); mkdirSync(publicOutput); chmodSync(publicOutput, 0o755); assert.throws(() => g.assertArtifactRoot(publicOutput, repo), /PR299_ARTIFACT/);
    const alias = path.join(temporary, "alias"); symlinkSync(output, alias); assert.throws(() => g.assertArtifactRoot(alias, repo), /PR299_ARTIFACT/);
    const inside = path.join(repo, "proof"); mkdirSync(inside, { mode: 0o700 }); assert.throws(() => g.assertArtifactRoot(inside, repo), /PR299_ARTIFACT/);
    const outside = path.dirname(temporary); assert.throws(() => g.assertArtifactRoot(outside, repo), /PR299_ARTIFACT/);
  } finally { if (before === undefined) delete process.env.RUNNER_TEMP; else process.env.RUNNER_TEMP = before; }
}));
test("reviews cannot predate the tooling commit", () => fixture(({ check }) => {
  assert.throws(check, /PR299_REVIEW_TIME/);
}, { review: (role, review) => { if (role === "A11") review.reviewedAt = "2026-10-26T00:00:00.000Z"; } }));
test("grafts replace refs and shallow histories fail closed", () => {
  fixture(({repo,check}) => { write(repo, ".git/info/grafts", "synthetic\n"); assert.throws(check, /PR299_GRAFT/); });
  fixture(({repo,check}) => { git(repo,"update-ref","refs/replace/"+g.SOURCE,g.BASE); assert.throws(check, /PR299_REPLACE/); });
  fixture(({repo,check}) => { write(repo,".git/shallow",g.SOURCE+"\n"); assert.throws(check, /PR299_SHALLOW/); });
});
test("reintroduced admission markers cannot become a fresh approval", () => fixture(({repo,check,commit}) => {
  const admission = readFileSync(path.join(repo,g.ADMISSION));
  git(repo,"rm","--",g.ADMISSION); git(repo,"commit","-qm","Synthetic marker deletion; not an approval");
  write(repo,g.ADMISSION,admission); commit([g.ADMISSION]);
  assert.throws(check,/PR299_EVIDENCE_HISTORY/);
}));
test("copy evidence cannot add a production acceptance claim", () => fixture(({check}) => {
  assert.throws(check, /PR299_SCHEMA/);
}, {admission: a => { a.productionValidated = true; }}));

function flatReport(names) {
  return Buffer.from("TAP version 13\n" + names.map((name, i) => `# Subtest: ${name}\nok ${i + 1} - ${name}\n  ---\n  duration_ms: 1.0\n  type: 'test'\n  ...\n`).join("") + `1..${names.length}\n# tests ${names.length}\n# suites 0\n# pass ${names.length}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1.0\n`);
}
const lessonNames = [
  "topics with a purpose-built instrument resolve to it in the lab registry",
  "the lesson embed and the lab page resolve the same module for every topic",
  "the purpose-built instruments cover the capability the template lacks",
  "every routed lesson visualization renders non-empty static markup",
  "the lab registry routes each topic to the module the render test mounts",
  "each re-routed topic shows the capability its template could not express",
  "place value and decimals render hundreds and hundredths text",
  "a visualization renders in Chinese as well as English"
];
test("a failed child cannot be accepted merely because it printed a passing report", () => {
  const stdout = flatReport(lessonNames);
  assert.deepEqual(g.verifyExecution("lesson-render-routing", { status: 0, stdout }), g.COMMANDS[1].summary);
  for (const result of [{status: 1, stdout}, {status: null, signal: "SIGTERM", stdout}, {status: 0, error: new Error("synthetic"), stdout}]) {
    assert.throws(() => g.verifyExecution("lesson-render-routing", result), /PR299_COMMAND_FAILED/);
  }
});
test("fresh lesson and checker reports must retain their exact count and names", () => {
  assert.throws(() => g.verifyExecution("lesson-render-routing", {status: 0, stdout: flatReport(["replacement"])}), /PR299_TEST_COUNT_OR_NAMES/);
  assert.throws(() => g.verifyExecution("gate-contract", {status: 0, stdout: flatReport(["replacement"])}), /PR299_CONTRACT_COUNT/);
  assert.throws(() => g.verifyExecution("unregistered", {status: 0, stdout: flatReport(lessonNames)}), /PR299_COMMANDS/);
  assert.ok(g.COMMANDS.every(command=>Object.isFrozen(command)&&Object.isFrozen(command.args)) && Object.isFrozen(g.COMMANDS[1].summary));
});

test("changes elsewhere in lessons or within the exact copy fail the full-file source contract", () => {
  const before=execFileSync("git",["show",g.BASE+":data/lessons.ts"],{cwd:root});
  const after=g.expectedLessonSource(before);g.validateSourceBytes(before,after);
  assert.throws(()=>g.validateSourceBytes(before,Buffer.concat([after,Buffer.from("\n// unrelated lesson change\n")])),/PR299_SOURCE_COPY_SCOPE/);
  assert.throws(()=>g.validateSourceBytes(before,Buffer.from(after.toString().replace("Adjust lengths and compare bars","Unreviewed copy"))),/PR299_SOURCE_COPY_SCOPE/);
  assert.throws(()=>g.expectedLessonSource(Buffer.concat([before,Buffer.from("\n")])),/PR299_SOURCE_BASE_BYTES/);
});
test("data mutation in the tooling commit is outside the exact tooling partition", () => fixture(({check})=>{
  assert.throws(check,/PR299_(SOURCE_COPY_DRIFT|TOOLING_PATHS)/);
},{extraTooling:["data/lessons.ts"]}));
test("browser evidence has exactly the three-language twenty-four-state consumed scope", () => {
  g.validateRuntimeEvidence(frozenRuntime);
  for(const patch of [{browserReexecutedInCi:true},{liveAllowed:true},{wholeLessonApproved:true},{stateCount:23},{sourceCommit:g.BASE}]){
    assert.throws(()=>g.validateRuntimeEvidence({...frozenRuntime,...patch}),/PR299_RUNTIME/);
  }
});
test("runtime math outcomes languages and page errors cannot be rewritten", () => {
  for(const mutate of [r=>{r.results[0].states[0].total=28;},r=>{r.results[1].pageErrors=["error"];},r=>{r.languages.reverse();},r=>{r.results[2].exactTitleAndCopyVisible=false;}]){
    const r=structuredClone(frozenRuntime);mutate(r);assert.throws(()=>g.validateRuntimeEvidence(r),/PR299_RUNTIME/);
  }
});
test("prior runtime and content provenance cannot be relabelled as a new execution", () => {
  for(const mutate of [r=>{r.previousExecution.sourceWorktreeHeadAtExecution=g.SOURCE;},r=>{r.previousExecution.recordSha256="0".repeat(64);},
    r=>{r.previousExecution.priorA18Reviewer=g.IDENTITIES.A18;},r=>{r.previousExecution.checkedAt="2999-01-01T00:00:00.000Z";},
    r=>{r.evidenceVerification.originalIndependentA18Verified=false;},r=>{r.provenance="CI replayed all browser states";}]){
    const r=structuredClone(frozenRuntime);mutate(r);assert.throws(()=>g.validateRuntimeEvidence(r),/PR299_RUNTIME_PROVENANCE/);
  }
});
test("runtime dependency and artifact inventories are closed", () => {
  for(const mutate of [r=>{r.dependencies.pop();},r=>{r.dependencies[0].sha256="0".repeat(64);},r=>{r.artifacts.pop();},
    r=>{r.artifacts[0].path="../outside";},r=>{r.screenshots[0].bytes=-1;},r=>{r.extra=true;}]){
    const r=structuredClone(frozenRuntime);mutate(r);assert.throws(()=>g.validateRuntimeEvidence(r),/PR299_RUNTIME/);
  }
});
test("runtime evidence cannot change even if an admission points at its new hash", () => {
  fixture(({check})=>assert.throws(check,/PR299_EXECUTION_EVIDENCE/),{core:(file,bytes)=>file==="runtime-evidence.json"?Buffer.from(json({...frozenRuntime,browserReexecutedInCi:true})):bytes});
  fixture(({check})=>assert.throws(check,/PR299_SCOPE/),{admission:a=>{a.runtimeEvidenceRawSha256="0".repeat(64);}});
});
test("all three actual review roles are mandatory and independently identified", () => {
  for(const role of ["A18","A11","A23"]){
    fixture(({check})=>assert.throws(check,/PR299_REVIEWS/),{admission:a=>{delete a.reviews[role];}});
  }
  fixture(({check})=>assert.throws(check,/PR299_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A18")r.reviewerIdentity=g.IDENTITIES.A11;}});
  fixture(({check})=>assert.throws(check,/PR299_REVIEW_BINDING/),{review:(role,r)=>{if(role==="A23")r.runtimeEvidenceRawSha256="0".repeat(64);}});
});
test("the content role accepts only its bounded integration-review verdict", () => fixture(({check})=>{
  assert.throws(check,/PR299_REVIEW_DECISION/);
},{review:(role,r)=>{if(role==="A18")r.result="approved-for-exact-pr299-required-check";}}));
test("source command schemas and chronology reject unsupported evidence", () => {
  g.validateSourceChecks(frozenChecks);
  for(const mutate of [c=>{c.nodeMajor=22;},c=>{c.liveProbePerformed=true;},c=>{c.executedAt="2026-02-30T00:00:00.000Z";},
    c=>{c.commands[0].args=c.commands[0].args.slice(1);},c=>{c.commands[1].summary.skipped=1;},c=>{c.commands[2].summary.nonPackCritical=1;},c=>{c.commands[0].exitCode=1;}]){
    const c=structuredClone(frozenChecks);mutate(c);assert.throws(()=>g.validateSourceChecks(c),/PR299_/);
  }
});
test("type and zh-Hans execution outcomes cannot be accepted as generic passing TAP", () => {
  assert.equal(g.verifyExecution("types",{status:0,stdout:Buffer.alloc(0)}),null);
  assert.throws(()=>g.verifyExecution("types",{status:0,stdout:Buffer.from("warning")}),/PR299_COMMAND_REPORT/);
  assert.deepEqual(g.verifyExecution("zh-hans",{status:0,stdout:Buffer.from("Gate passed (advisory 3509/3512, non-pack critical 0, no pack regression).\n")}),g.COMMANDS[2].summary);
  assert.throws(()=>g.verifyExecution("zh-hans",{status:0,stdout:Buffer.from("Gate passed (advisory 3510/3512, non-pack critical 0, no pack regression).\n")}),/PR299_TEST_COUNT_OR_NAMES/);
  assert.throws(()=>g.verifyExecution("zh-hans",{status:0,stdout:Buffer.from("Gate FAILED: example\n")}),/PR299_COMMAND_REPORT/);
});
