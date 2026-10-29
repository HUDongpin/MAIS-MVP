// Synthetic Git/evidence fixtures only. Never author real review or candidate records.
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  realpathSync,
  cpSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROOT,
  ANCHOR,
  VERSION,
  BUNDLE_PATHS,
  CORE_FILES,
  SLUGS,
  MIDDLE,
  OLD_IDS,
  OLD_ASSETS,
  LESSON_ROOT,
  ROLES,
  ROUTES,
  PRIOR_REGISTRY,
  PRIOR_REGISTRY_SHA,
  HISTORICAL_REGISTRY,
  HISTORICAL_REGISTRY_SHA,
  COMPATIBILITY,
  COMPATIBILITY_SHA,
  TARGET,
  topicFor,
} from "./constants.mjs";
import { Repository, GIT_ENV, dependency } from "./repository.mjs";
import { hash, digest, parse } from "./common.mjs";
import { adaptSnapshot } from "./candidate.mjs";
import { canonicalAuditExpectation } from "./audit.mjs";
import { NEGATIVES } from "./evidence.mjs";
const project = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
  ),
  H = "a".repeat(64);
export function registeredFixture(
  run,
  {
    trackedAttack = null,
    ignoredAttack = null,
    future = false,
    extraParent = false,
    realTypescript = false,
    sourcePayload = false,
    releasePayload = false,
    declaredPayload = false,
  } = {},
) {
  const root = realpathSync(mkdtempSync("/tmp/ca-registered-"));
  const env = {
    ...GIT_ENV,
    GIT_AUTHOR_NAME: "Synthetic test",
    GIT_AUTHOR_EMAIL: "synthetic@example.invalid",
    GIT_COMMITTER_NAME: "Synthetic test",
    GIT_COMMITTER_EMAIL: "synthetic@example.invalid",
  };
  const git = (...args) =>
    execFileSync("/usr/bin/git", ["--no-replace-objects", ...args], {
      cwd: root,
      env,
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
    }).trim();
  const write = (file, bytes) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), bytes);
  };
  const commit = (files) => {
    git("add", "-f", "--", ...files);
    git("commit", "-qm", "Synthetic contract fixture; never approval");
    return git("rev-parse", "HEAD");
  };
  try {
    git("init", "-q", "--initial-branch=fixture");
    git("config", "commit.gpgsign", "false");
    git("config", "core.hooksPath", "/dev/null");
    const common = execFileSync(
      "/usr/bin/git",
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { cwd: project, env, encoding: "utf8" },
    ).trim();
    write(".git/objects/info/alternates", path.join(common, "objects") + "\n");
    const sourceFiles = new Set();
    const put = (file, bytes) => {
      write(file, bytes);
      sourceFiles.add(file);
    };
    for (const file of BUNDLE_PATHS.filter((p) => !p.startsWith(ROOT + "/")))
      put(file, readFileSync(path.join(project, file)));
    put(".gitignore", "node_modules/\n");
    const compat = parse(readFileSync(path.join(project, COMPATIBILITY))),
      prior = parse(readFileSync(path.join(project, PRIOR_REGISTRY)));
    put(COMPATIBILITY, readFileSync(path.join(project, COMPATIBILITY)));
    for (const file of [
      ...compat.liveReachability.entrypoints,
      ...compat.liveReachability.specialFiles,
    ])
      put(file, 'import "@/lib/server/mediaOwnerErasure"; export {};\n');
    for (const file of [
      "tsconfig.json",
      "tsconfig.next.json",
      "next.config.ts",
      "data/usCaliforniaMicroLessons.ts",
    ])
      put(file, readFileSync(path.join(project, file)));
    for (const row of prior.resolutions)
      for (const ref of [row.candidate, row.liveProjection].filter(Boolean))
        put(ref.path, readFileSync(path.join(project, ref.path)));
    for (const folder of [
      "public",
      "coordination/content-qa",
      "data/generated-content",
    ])
      put(folder + "/.fixture-placeholder", "Synthetic source data only.\n");
    if (sourcePayload)
      put(
        ROOT + "/package.json",
        JSON.stringify({ name: "typescript", exports: "./unreviewed.mjs" }),
      );
    git("add", "--", ...sourceFiles);
    const source = git(
      "commit-tree",
      git("write-tree"),
      "-p",
      ANCHOR,
      "-m",
      "Synthetic source; not real admission",
    );
    git("update-ref", "HEAD", source);
    const releasePaths = [
      ...BUNDLE_PATHS.filter((p) => p.startsWith(ROOT + "/")),
      ROOT + "/README.md",
      ROOT + "/lifecycle-A23-20261029.md",
    ].sort();
    for (const file of releasePaths)
      write(file, readFileSync(path.join(project, file)));
    if (releasePayload)
      write(
        ROOT + "/package.json",
        JSON.stringify({ name: "typescript", exports: "./unreviewed.mjs" }),
      );
    const release = commit([
      ...releasePaths,
      ...(releasePayload ? [ROOT + "/package.json"] : []),
    ]);
    if (realTypescript) {
      const from =
        process.env.CA_TEST_TYPESCRIPT_ROOT ??
        path.join(project, "node_modules/typescript");
      mkdirSync(path.join(root, "node_modules"), { recursive: true });
      cpSync(from, path.join(root, "node_modules/typescript"), {
        recursive: true,
      });
    } else {
      write(
        "node_modules/typescript/package.json",
        JSON.stringify({
          name: "typescript",
          version: "5.8.3",
          main: "./lib/typescript.js",
          synthetic: true,
        }),
      );
      write(
        "node_modules/typescript/lib/typescript.js",
        'module.exports={version:"5.8.3"};\n',
      );
    }
    let repo = new Repository(root);
    const bindings = BUNDLE_PATHS.map((file) => {
      const { bytes, ...binding } = repo.blob(release, file);
      return binding;
    });
    const dependencies = [dependency(root).binding],
      bundleDigest = digest({ files: bindings, dependencies });
    const prefix = ROOT + "/attempts/ca-textbook-fixture",
      ep = prefix + "/evidence",
      paths = new Set();
    const save = (file, value) => {
      const bytes = Buffer.from(
        typeof value === "string" ? value : JSON.stringify(value),
      );
      write(file, bytes);
      paths.add(file);
      return { path: file, sha256: hash(bytes) };
    };
    const ref = (file) => ({ path: file, sha256: H }),
      binding = (file) => ({
        path: file,
        mode: "100644",
        objectId: "b".repeat(40),
        sha256: H,
      });
    const snap = {
      packageId: "ccss-textbook-claude-v1",
      lessons: SLUGS.map((slug) => ({ slug, topicId: topicFor(slug) })),
      practiceBySlug: Object.fromEntries(
        SLUGS.map((slug) => [
          slug,
          [0, 1, 2].map((answer) => ({
            kind: "numeric",
            prompt: "Synthetic",
            explanation: "Synthetic",
            answer,
          })),
        ]),
      ),
    };
    const c = {
      schemaVersion: "ca-textbook-candidate.v1",
      sourceCommit: source,
      sourceTree: repo.tree(source),
      slugs: SLUGS,
      checksDigest: adaptSnapshot(snap).checksDigest,
      files: CORE_FILES.map(binding),
      removals: [],
      mappings: SLUGS.map((slug) => ({
        slug,
        topicId: topicFor(slug),
        primary: true,
      })),
      assets: OLD_ASSETS.map((file, i) => ({
        oldId: OLD_IDS[i],
        retained: binding(file),
        witnesses: [
          {
            kind: "new-opener",
            lessonId: MIDDLE[i],
            topicId: topicFor(MIDDLE[i]),
            source: binding(LESSON_ROOT + "/" + MIDDLE[i] + ".tsx"),
          },
        ],
        coverageReport: save(
          declaredPayload && i === 0
            ? ROOT + "/package.json"
            : ep + "/assets/old-" + String(i + 1).padStart(2, "0") + ".md",
          "Synthetic asset report, not acceptance.",
        ),
      })),
    };
    const candidate = save(prefix + "/inputs/candidate.json", c),
      audit = save(
        prefix + "/inputs/canonical-audit.json",
        canonicalAuditExpectation(),
      );
    const d = {
      schemaVersion: "ca-textbook-disposition.v1",
      resolutionId: TARGET,
      candidateDigest: digest(c),
      mappingDigest: digest(c.mappings),
      oldIds: OLD_IDS,
      middleSlugs: MIDDLE,
      additionalHighSlugs: SLUGS.filter((s) => !MIDDLE.includes(s)),
      contentChanged: true,
      baselineOnly: false,
      predecessorRegistry: { path: PRIOR_REGISTRY, sha256: PRIOR_REGISTRY_SHA },
      historicalRegistry: {
        path: HISTORICAL_REGISTRY,
        sha256: HISTORICAL_REGISTRY_SHA,
      },
      audit,
      assetsDigest: digest(c.assets),
      liveAllowed: false,
    };
    const disposition = save(prefix + "/inputs/disposition.json", d),
      registryValue = structuredClone(prior);
    registryValue.schemaVersion = "ca-textbook-registry.v1";
    registryValue.targetBaselineCommit = source;
    registryValue.expectedCanonicalAudit = canonicalAuditExpectation();
    const old = registryValue.resolutions.find(
      (r) => r.resolutionId === TARGET,
    );
    Object.assign(old, {
      decision: "retired-replaced-projection",
      historicalProjection: old.liveProjection,
      liveProjection: null,
      replacement: {
        candidateDigest: digest(c),
        mappingDigest: d.mappingDigest,
      },
      enforcement: {
        candidateMustBeUnreachable: true,
        liveProjectionMustBeReachable: false,
        liveAllowed: false,
      },
    });
    const registry = save(prefix + "/inputs/registry.json", registryValue);
    const sourceInventoryDigest = hash(repo.git("ls-tree", "-r", "-z", source)),
      entries = [];
    for (const role of ROLES) {
      const lower = role.toLowerCase(),
        report = save(
          ep + "/roles/" + lower + ".md",
          "Synthetic role report; no real approval.",
        );
      let details;
      if (role === "A18")
        details = {
          slugs: SLUGS,
          checksDigest: c.checksDigest,
          unresolvedFindings: 0,
          acceptance: "bounded-35-lessons-105-checks",
          previous105Review: null,
          limitations: ["Synthetic fixture only"],
          humanSignoff: false,
        };
      if (role === "A05")
        details = {
          mappingsDigest: digest(c.mappings),
          routeFiles: ROUTES,
          runtime: "35-primary-openers",
          noHiddenReviewOnlyClaim: true,
        };
      if (role === "A24")
        details = {
          assetsDigest: digest(c.assets),
          figureFileDigest: digest(
            c.files.filter(
              (f) => f.path.startsWith(LESSON_ROOT) && f.path.endsWith(".tsx"),
            ),
          ),
          baselineInventory: save(ep + "/a24/baseline-inventory.json", {
            synthetic: true,
          }),
          currentInventory: save(ep + "/a24/current-inventory.json", {
            synthetic: true,
          }),
          unresolvedReplacementFindings: 0,
          baselineFailuresPreserved: true,
        };
      if (role === "A11")
        details = {
          negativeCases: NEGATIVES,
          regressions: [
            {
              command: ["node", "--test", "synthetic-only"],
              exitCode: 0,
              report: save(
                ep + "/a11/regression-001.txt",
                "Synthetic report only.",
              ),
            },
          ],
          pageErrors: 0,
          retries: 0,
        };
      if (role === "A23")
        details = {
          dispositionDigest: digest(d),
          otherResolutionsPreserved: 17,
          otherApprovedProjectionsPreserved: 2,
          historicalAuthorityTransferred: false,
        };
      if (role === "A22")
        details = {
          sourceTree: repo.tree(source),
          buildId: "synthetic-build",
          attestation: save(ep + "/a22/build-attestation.json", {
            schemaVersion: 3,
            candidateSha: source,
            sourceTreeClean: true,
            sourceTreeStable: true,
            buildId: "synthetic-build",
            artifactTree: { root: H },
          }),
          buildLog: null,
          artifactRoot: H,
          exitCode: 0,
          deployed: false,
          clean: true,
        };
      if (role === "A25")
        details = {
          sourceInventoryDigest,
          historyDigest: H,
          custody: "preserved",
        };
      const record = save(ep + "/roles/" + lower + ".json", {
        schemaVersion: "ca-textbook-evidence.v1",
        role,
        reviewer: {
          sessionId: "synthetic-" + role,
          independence: ["A18", "A11", "A23"].includes(role)
            ? "independent-review"
            : "coordinator-execution",
        },
        reviewedAt: new Date().toISOString(),
        sourceCommit: source,
        sourceTree: repo.tree(source),
        checkerReleaseCommit: release,
        candidateDigest: digest(c),
        report,
        details,
        liveAllowed: false,
      });
      entries.push({ role, record });
    }
    const evidenceIndex = save(prefix + "/inputs/evidence-index.json", {
        schemaVersion: "ca-textbook-evidence-index.v1",
        entries,
      }),
      reviews = [];
    for (const role of ["A11", "A23"]) {
      const lower = role.toLowerCase(),
        report = save(
          ep + "/checker/" + lower + ".md",
          "Synthetic checker review, never authority.",
        );
      reviews.push(
        save(ep + "/checker/" + lower + ".json", {
          schemaVersion: "ca-textbook-checker-review.v1",
          role,
          reviewer: "synthetic-checker-" + role,
          reviewedAt: new Date().toISOString(),
          releaseCommit: release,
          bundleDigest,
          report,
          result: "approved-for-checker-freeze",
        }),
      );
    }
    const ledger = {
        schemaVersion: "ca-textbook-checker-ledger.v1",
        version: VERSION,
        releaseCommit: release,
        bundleDigest,
        files: bindings,
        dependencies,
        reviews,
      },
      ledgerPath = ROOT + "/checker-releases.json",
      checkerLedger = save(ledgerPath, ledger);
    const marker = path.join(root, "UNREVIEWED-PARSER-MARKER"),
      wrapper =
        'import {writeFileSync} from "node:fs"; import ts from ' +
        JSON.stringify(
          path.join(root, "node_modules/typescript/lib/typescript.js"),
        ) +
        ";writeFileSync(" +
        JSON.stringify(marker) +
        ',"executed");export default ts;\n';
    const inject = (kind) => {
      const files =
        kind === "nested"
          ? [
              ROOT + "/node_modules/typescript/package.json",
              ROOT + "/node_modules/typescript/index.js",
            ]
          : [ROOT + "/package.json", ROOT + "/shadow-parser.mjs"];
      write(
        files[0],
        JSON.stringify(
          kind === "nested"
            ? {
                name: "typescript",
                version: "5.8.3",
                type: "module",
                main: "index.js",
              }
            : {
                name: "typescript",
                version: "5.8.3",
                type: "module",
                exports: "./shadow-parser.mjs",
              },
        ),
      );
      write(files[1], wrapper);
      return files;
    };
    if (trackedAttack)
      for (const file of inject(trackedAttack)) paths.add(file);
    if (future) {
      write(prefix + "/canonical-receipt.json", "{}");
      paths.add(prefix + "/canonical-receipt.json");
    }
    const evidence = commit([...paths].sort());
    if (extraParent) {
      write(prefix + "/intermediate.txt", "Synthetic extra parent");
      commit([prefix + "/intermediate.txt"]);
    }
    const m = {
      schemaVersion: "ca-textbook-manifest.v1",
      version: VERSION,
      pullRequestNumber: 304,
      attemptId: "ca-textbook-fixture",
      baseCommit: ANCHOR,
      sourceCommit: source,
      sourceTree: repo.tree(source),
      sourceAuthors: ["synthetic-source-author"],
      checkerAuthors: ["synthetic-checker-author"],
      sourceInventoryDigest,
      candidate,
      registry,
      disposition,
      evidenceIndex,
      evidenceCommit: evidence,
      checkerLedger,
      checkerReleaseCommit: release,
      checkerBundleDigest: bundleDigest,
      descriptorPath: prefix + "/successor.json",
      canonicalReceiptPath: prefix + "/canonical-receipt.json",
      runtime: {
        compatibility: { path: COMPATIBILITY, sha256: COMPATIBILITY_SHA },
        policyDigest: H,
        auditDigest: canonicalAuditExpectation().auditDigest,
      },
      lifecycleState: "shadow_ready",
      liveAllowed: false,
    };
    const manifestPath = prefix + "/manifest.json",
      manifestBytes = Buffer.from(JSON.stringify(m));
    write(manifestPath, manifestBytes);
    write(
      m.descriptorPath,
      JSON.stringify({
        schemaVersion: "ca-textbook-successor.v1",
        relation: "immutable-content-successor",
        manifest: { path: manifestPath, sha256: hash(manifestBytes) },
        evidenceCommit: evidence,
        candidateChanged: true,
        checkerChanged: true,
        baselineOnly: false,
        historicalClosureOverwritten: false,
        liveAllowed: false,
      }),
    );
    const execution = commit([manifestPath, m.descriptorPath]);
    if (ignoredAttack) {
      const files = inject(ignoredAttack);
      write(".git/info/exclude", files.join("\n") + "\n");
    }
    repo = new Repository(root);
    const result = run({
      root,
      git,
      write,
      commit,
      repo,
      m,
      manifest: m,
      manifestPath,
      execution,
      source,
      release,
      evidence,
      ledger,
      ledgerPath,
      bundleDigest,
      reviews,
      candidate: c,
      registry: registryValue,
      marker,
      releasePaths,
      evidencePaths: [...paths].sort(),
    });
    if (result && typeof result.then === "function")
      return result.finally(() =>
        rmSync(root, { recursive: true, force: true }),
      );
    rmSync(root, { recursive: true, force: true });
    return result;
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}
