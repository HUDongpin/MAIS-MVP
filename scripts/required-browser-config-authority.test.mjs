import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  syntheticNextConfigDependencyAuthoritySnapshot,
  syntheticNextConfigPhysicalTransitionSnapshot
} from "./active-browser-dependency-proof.test-helper.mjs";
import { createLiveHomeProof } from "./live-home-protection.mjs";
import {
  assertNextConfigReadOnlyAuthorityUnchanged,
  captureNextConfigReadOnlyAuthority,
  classifyNextConfigInvocationContext,
  validateNextConfigDependencyAuthoritySnapshot,
  validateNextConfigPhysicalTransitionSnapshot
} from "./next-config-read-only-authority.mjs";
import {
  assertRequiredBrowserPortableListInvocationUnchanged,
  captureRequiredBrowserPortableListInvocation,
  validateRequiredBrowserPortableListInvocationCaptureSnapshot
} from "./required-browser-execution-scope.mjs";

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableValue(value[key])])
  );
}

function domainHashObject(domain, value, omittedKey = "sha256") {
  const source = { ...value };
  delete source[omittedKey];
  return createHash("sha256")
    .update(`${domain}\0${JSON.stringify(stableValue(source))}`)
    .digest("hex");
}

function clone(value) {
  return structuredClone(value);
}

function changedIdentityNumber(value) {
  if (typeof value === "number") return value + 1;
  assert.match(value, /^\d+$/);
  return String(BigInt(value) + 1n);
}

function rehashPortableCapture(capture) {
  capture.playwrightPackage.sha256 = domainHashObject(
    "portable-playwright-package",
    capture.playwrightPackage
  );
  capture.semanticProof.analyzer.parser.sha256 = domainHashObject(
    "capability-parser",
    capture.semanticProof.analyzer.parser
  );
  capture.semanticProof.analyzer.ruleset.sha256 = domainHashObject(
    "capability-ruleset",
    capture.semanticProof.analyzer.ruleset
  );
  capture.semanticProof.analyzer.profile.sha256 = domainHashObject(
    "portable-playwright-config-profile",
    capture.semanticProof.analyzer.profile
  );
  capture.semanticProof.analyzer.sha256 = domainHashObject(
    "portable-playwright-config-analyzer",
    capture.semanticProof.analyzer
  );
  capture.semanticProof.sha256 = domainHashObject(
    "portable-playwright-config-semantics",
    capture.semanticProof
  );
  capture.environment.inventorySha256 = domainHashObject(
    "portable-playwright-list-environment",
    capture.environment,
    "inventorySha256"
  );
  capture.captureFingerprint = domainHashObject(
    "portable-playwright-list-capture",
    capture,
    "captureFingerprint"
  );
  return capture;
}

function rehashNextReadOnlyCapture(capture) {
  capture.authorityFingerprint = domainHashObject(
    "next-read-only-authority",
    capture,
    "authorityFingerprint"
  );
  return capture;
}

function incidentSafeHome() {
  const home = process.env.HOME;
  assert.equal(typeof home, "string");
  assert.notEqual(home, "");
  return home;
}

function portableFixture() {
  const cwd = realpathSync(process.cwd());
  const liveHomeProof = createLiveHomeProof();
  const environment = Object.freeze({
    HOME: incidentSafeHome(),
    PLAYWRIGHT_PORTABLE_LIST_ONLY: "1"
  });
  const argv = Object.freeze([
    realpathSync(process.execPath),
    join(cwd, "node_modules", "@playwright", "test", "cli.js"),
    "test",
    "--list"
  ]);
  const capture = captureRequiredBrowserPortableListInvocation({
    argv,
    cwd,
    environment,
    liveHomeProof
  });
  return { argv, capture, cwd, environment, liveHomeProof };
}

function nextReadOnlyFixture() {
  const cwd = realpathSync(process.cwd());
  const liveHomeProof = createLiveHomeProof();
  const environment = Object.freeze({
    HOME: incidentSafeHome(),
    NEXT_CONFIG_READ_ONLY_IMPORT: "1"
  });
  const argv = Object.freeze([
    process.execPath,
    join(cwd, "scripts", "next-config-read-only-importer.mjs")
  ]);
  const capture = captureNextConfigReadOnlyAuthority({
    argv,
    cwd,
    environment,
    liveHomeProof
  });
  return { argv, capture, cwd, environment, liveHomeProof };
}

function thrownError(action) {
  let error;
  try {
    action();
  } catch (caught) {
    error = caught;
  }
  assert.equal(error instanceof Error, true);
  return error;
}

function assertRejectsWithoutHomeLeak(action, pattern) {
  const error = thrownError(action);
  assert.match(error.message, pattern);
  assert.equal(String(error).includes(incidentSafeHome()), false);
}

test("portable list capture is exact, inert, live-rechecked, and hash-only", () => {
  const current = portableFixture();
  assert.deepEqual(
    validateRequiredBrowserPortableListInvocationCaptureSnapshot(current.capture),
    current.capture
  );
  assert.deepEqual(
    assertRequiredBrowserPortableListInvocationUnchanged(current.capture, current),
    current.capture
  );
  assert.equal(current.capture.mode, "portable-list-only");
  assert.deepEqual(current.capture.semanticProof.facts.forbiddenCapabilityCounts, {
    browser: 0,
    "dynamic-code": 0,
    "filesystem-delete": 0,
    "filesystem-write": 0,
    network: 0,
    shell: 0,
    subprocess: 0,
    unknown: 0
  });
  assert.deepEqual(current.capture.semanticProof.facts.sensitiveImportCounts, {
    browser: 0,
    dynamicCode: 0,
    filesystem: 0,
    network: 0,
    subprocess: 0
  });
  assert.equal(
    JSON.stringify(current.capture.semanticProof.facts).includes("tests/e2e/"),
    false
  );
  const serializedCapture = JSON.stringify(current.capture);
  assert.equal(serializedCapture.includes(incidentSafeHome()), false);
  assert.equal(serializedCapture.includes("liveHomeProof"), false);
  assert.throws(
    () => JSON.stringify(current.liveHomeProof),
    /opaque|proof|serial/i
  );
});

test("portable list rejects every argv and environment confusion without leaking HOME", () => {
  const current = portableFixture();
  const argvCases = [
    ["extra config", [...current.argv, "--config", "playwright.config.ts"]],
    ["project", [...current.argv, "--project=desktop-chrome"]],
    ["grep", [...current.argv, "--grep", "contract"]],
    ["repeat", [...current.argv, "--repeat-each=2"]],
    ["workers", [...current.argv, "--workers=2"]],
    ["snapshot update", [...current.argv, "--update-snapshots"]],
    ["reporter", [...current.argv, "--reporter=json"]],
    ["output", [...current.argv, "--output=.tmp/results"]],
    ["browser", [...current.argv, "--headed"]]
  ];
  for (const [label, argv] of argvCases) {
    assert.throws(
      () => captureRequiredBrowserPortableListInvocation({ ...current, argv }),
      /argv|exactly|command/i,
      label
    );
  }
  const environmentCases = [
    ["missing HOME", { PLAYWRIGHT_PORTABLE_LIST_ONLY: "1" }],
    ["empty HOME", { HOME: "", PLAYWRIGHT_PORTABLE_LIST_ONLY: "1" }],
    ["wrong order", { PLAYWRIGHT_PORTABLE_LIST_ONLY: "1", HOME: incidentSafeHome() }],
    ["extra key", { HOME: incidentSafeHome(), PLAYWRIGHT_PORTABLE_LIST_ONLY: "1", EXTRA: "1" }],
    ["NODE_OPTIONS", { HOME: incidentSafeHome(), PLAYWRIGHT_PORTABLE_LIST_ONLY: "1", NODE_OPTIONS: "--import=x" }],
    ["writable override", { HOME: incidentSafeHome(), PLAYWRIGHT_PORTABLE_LIST_ONLY: "1", PLAYWRIGHT_BROWSERS_PATH: ".tmp" }]
  ];
  for (const [label, environment] of environmentCases) {
    assert.throws(
      () => captureRequiredBrowserPortableListInvocation({ ...current, environment }),
      /environment|HOME|keys|order|exact/i,
      label
    );
  }
  assertRejectsWithoutHomeLeak(
    () => captureRequiredBrowserPortableListInvocation({
      ...current,
      environment: {
        HOME: `${incidentSafeHome()}/forged`,
        PLAYWRIGHT_PORTABLE_LIST_ONLY: "1"
      }
    }),
    /HOME|proof|environment/i
  );
});

test("portable snapshot rejects fully rehashed analyzer, parser, ruleset, and semantic forgeries", () => {
  const baseline = portableFixture().capture;
  const cases = [
    {
      label: "ruleset",
      mutate(capture) {
        capture.semanticProof.analyzer.ruleset.browserModules.push("forged-browser-module");
        capture.semanticProof.analyzer.ruleset.browserModules.sort();
      }
    },
    {
      label: "parser version",
      mutate(capture) {
        capture.semanticProof.analyzer.parser.version = "0.0.0";
      }
    },
    {
      label: "nonzero browser finding",
      mutate(capture) {
        capture.semanticProof.facts.forbiddenCapabilityCounts.browser = 1;
        capture.semanticProof.analyzer.profile.expectedFacts.forbiddenCapabilityCounts.browser = 1;
      }
    },
    {
      label: "unknown syntax",
      mutate(capture) {
        capture.semanticProof.facts.topLevelDeclarations.push("unknown:runtime-effect");
        capture.semanticProof.analyzer.profile.expectedFacts.topLevelDeclarations.push(
          "unknown:runtime-effect"
        );
      }
    },
    {
      label: "package version",
      mutate(capture) {
        capture.playwrightPackage.version = "0.0.0";
      }
    },
    {
      label: "analyzer source",
      mutate(capture) {
        capture.semanticProof.analyzer.authoritySource.path = "scripts/forged-authority.mjs";
        capture.semanticProof.analyzer.authoritySource.canonicalPath = join(
          capture.cwd,
          "scripts",
          "forged-authority.mjs"
        );
      }
    }
  ];
  for (const { label, mutate } of cases) {
    const forged = clone(baseline);
    mutate(forged);
    rehashPortableCapture(forged);
    assert.throws(
      () => validateRequiredBrowserPortableListInvocationCaptureSnapshot(forged),
      /analyzer|canonical|package|parser|pinned|profile|ruleset|semantic|source|version/i,
      label
    );
  }
});

test("fully rehashed historical portable snapshots cannot authorize current effects", () => {
  const current = portableFixture();
  const cases = [
    {
      label: "config content",
      mutate(capture) {
        capture.config.sha256 = "1".repeat(64);
        capture.semanticProof.configSourceSha256 = capture.config.sha256;
      }
    },
    {
      label: "CLI inode",
      mutate(capture) {
        capture.cli.ino = changedIdentityNumber(capture.cli.ino);
      }
    },
    {
      label: "HOME hash",
      mutate(capture) {
        capture.homeValueSha256 = "2".repeat(64);
        capture.environment.entries.find(({ key }) => key === "HOME").valueSha256 =
          capture.homeValueSha256;
      }
    }
  ];
  for (const { label, mutate } of cases) {
    const historical = clone(current.capture);
    mutate(historical);
    rehashPortableCapture(historical);
    assert.deepEqual(
      validateRequiredBrowserPortableListInvocationCaptureSnapshot(historical),
      historical,
      label
    );
    assert.throws(
      () => assertRequiredBrowserPortableListInvocationUnchanged(historical, current),
      /changed|drift|HOME|identity|proof/i,
      label
    );
  }
});

function nestedObjects(value, predicate, output = []) {
  if (!value || typeof value !== "object") return output;
  if (predicate(value)) output.push(value);
  for (const nested of Object.values(value)) nestedObjects(nested, predicate, output);
  return output;
}

function physicalObservations(snapshot) {
  return nestedObjects(snapshot, (value) =>
    !Array.isArray(value)
    && Object.hasOwn(value, "dev")
    && Object.hasOwn(value, "ino")
    && Object.hasOwn(value, "kind")
    && Object.hasOwn(value, "mode")
    && Object.hasOwn(value, "nlink")
  );
}

test("Next invocation classifier accepts only exact read-only, build, and service contexts", () => {
  const cwd = realpathSync(process.cwd());
  const node = process.execPath;
  const importer = join(cwd, "scripts", "next-config-read-only-importer.mjs");
  const nextCli = join(cwd, "node_modules", "next", "dist", "bin", "next");
  const home = incidentSafeHome();
  assert.deepEqual(
    classifyNextConfigInvocationContext({
      argv: [node, importer],
      cwd,
      environment: { HOME: home, NEXT_CONFIG_READ_ONLY_IMPORT: "1" }
    }),
    {
      commandId: "static.next-config-read-only-import",
      expectedPhase: "mais-next-config-read-only-import",
      mode: "read-only-import"
    }
  );
  assert.deepEqual(
    classifyNextConfigInvocationContext({
      argv: [node, nextCli, "build"],
      cwd,
      environment: { HOME: home }
    }),
    {
      commandId: "owner.next.build",
      expectedPhase: "phase-production-build",
      mode: "owner-build"
    }
  );
  assert.deepEqual(
    classifyNextConfigInvocationContext({
      argv: [node, nextCli, "start", "--hostname", "127.0.0.1", "--port", "32123"],
      cwd,
      environment: { HOME: home }
    }),
    {
      commandId: "owner.next.service",
      expectedPhase: "phase-production-server",
      mode: "owner-service"
    }
  );

  const denied = [
    {
      label: "read-only flag alone",
      argv: [node],
      environment: { HOME: home, NEXT_CONFIG_READ_ONLY_IMPORT: "1" }
    },
    {
      label: "node-e",
      argv: [node, "-e", "import('./next.config.ts')"],
      environment: { HOME: home, NEXT_CONFIG_READ_ONLY_IMPORT: "1" }
    },
    {
      label: "npm wrapper",
      argv: ["/usr/bin/npm", "exec", "next", "build"],
      environment: { HOME: home }
    },
    {
      label: "NODE_OPTIONS split",
      argv: [node, nextCli, "build"],
      environment: { HOME: home, NODE_OPTIONS: "--import ./loader.mjs" }
    },
    {
      label: "NODE_OPTIONS equals",
      argv: [node, nextCli, "build"],
      environment: { HOME: home, NODE_OPTIONS: "--require=./loader.cjs" }
    },
    {
      label: "unknown NEXT cache",
      argv: [node, nextCli, "build"],
      environment: { HOME: home, NEXT_CACHE_DIR: ".tmp/cache" }
    },
    {
      label: "dev",
      argv: [node, nextCli, "dev"],
      environment: { HOME: home }
    },
    {
      label: "export",
      argv: [node, nextCli, "export"],
      environment: { HOME: home }
    },
    {
      label: "build extra argv",
      argv: [node, nextCli, "build", "--debug"],
      environment: { HOME: home }
    },
    {
      label: "service invalid port",
      argv: [node, nextCli, "start", "--hostname", "127.0.0.1", "--port", "65536"],
      environment: { HOME: home }
    },
    {
      label: "read-only unknown writable env",
      argv: [node, importer],
      environment: {
        HOME: home,
        NEXT_CONFIG_READ_ONLY_IMPORT: "1",
        NEXT_DIST_DIR: ".tmp/next"
      }
    }
  ];
  for (const { label, argv, environment } of denied) {
    assert.throws(
      () => classifyNextConfigInvocationContext({ argv, cwd, environment }),
      /CONTEXT|DENIED|INVALID|environment|override/i,
      label
    );
  }
});

test("pure Next physical transition validator rejects symlink, special, hardlink, mode, and identity drift", () => {
  const valid = syntheticNextConfigPhysicalTransitionSnapshot();
  assert.deepEqual(validateNextConfigPhysicalTransitionSnapshot(valid), valid);
  const cases = [
    {
      label: "symlink",
      mutate(observations) { observations[0].kind = "symlink"; }
    },
    {
      label: "special entry",
      mutate(observations) { observations[0].kind = "fifo"; }
    },
    {
      label: "external hardlink",
      mutate(observations) {
        observations[0].nlink = typeof observations[0].nlink === "number" ? 2 : "2";
      }
    },
    {
      label: "mode 0666",
      mutate(observations) {
        observations[0].mode = typeof observations[0].mode === "number" ? 0o666 : "0666";
      }
    },
    {
      label: "TOCTOU inode",
      mutate(observations) {
        observations.at(-1).ino = changedIdentityNumber(observations.at(-1).ino);
      }
    }
  ];
  for (const { label, mutate } of cases) {
    const forged = clone(valid);
    const observations = physicalObservations(forged);
    assert.equal(observations.length >= 2, true, label);
    mutate(observations);
    assert.throws(
      () => validateNextConfigPhysicalTransitionSnapshot(forged),
      /hardlink|identity|kind|mode|permission|physical|special|symlink|transition/i,
      label
    );
  }
});

test("pure Next dependency authority rejects version, inventory, digest, and node_modules identity drift", () => {
  const valid = syntheticNextConfigDependencyAuthoritySnapshot();
  assert.deepEqual(validateNextConfigDependencyAuthoritySnapshot(valid), valid);
  const cases = [
    {
      label: "version",
      mutate(snapshot) { snapshot.version = "0.0.0"; }
    },
    {
      label: "source omission",
      mutate(snapshot) { snapshot.sources.pop(); }
    },
    {
      label: "CLI digest",
      mutate(snapshot) { snapshot.cli.sha256 = "3".repeat(64); }
    },
    {
      label: "manifest digest",
      mutate(snapshot) { snapshot.manifest.sha256 = "4".repeat(64); }
    },
    {
      label: "node_modules inode",
      mutate(snapshot) {
        snapshot.nodeModules.ino = changedIdentityNumber(snapshot.nodeModules.ino);
      }
    }
  ];
  for (const { label, mutate } of cases) {
    const forged = clone(valid);
    mutate(forged);
    assert.throws(
      () => validateNextConfigDependencyAuthoritySnapshot(forged),
      /binding|dependency|digest|identity|inventory|manifest|node_modules|source|version/i,
      label
    );
  }
});

test("Next read-only authority is exact, rechecked, and contains no raw HOME or proof", () => {
  const current = nextReadOnlyFixture();
  assert.deepEqual(
    assertNextConfigReadOnlyAuthorityUnchanged(current.capture, current),
    current.capture
  );
  assert.equal(current.capture.mode, "read-only-import");
  const serialized = JSON.stringify(current.capture);
  assert.equal(serialized.includes(incidentSafeHome()), false);
  assert.equal(serialized.includes("liveHomeProof"), false);
});

test("Next read-only capture rejects argv, env, wrapper, loader, and writable override confusion", () => {
  const current = nextReadOnlyFixture();
  const cases = [
    {
      label: "node-e",
      argv: [process.execPath, "-e", "import('./next.config.ts')"],
      environment: current.environment
    },
    {
      label: "npm wrapper",
      argv: ["/usr/bin/npm", "exec", "node", current.argv[1]],
      environment: current.environment
    },
    {
      label: "wrong flag",
      argv: current.argv,
      environment: { HOME: incidentSafeHome(), NEXT_CONFIG_READ_ONLY_IMPORT: "0" }
    },
    {
      label: "reordered env",
      argv: current.argv,
      environment: { NEXT_CONFIG_READ_ONLY_IMPORT: "1", HOME: incidentSafeHome() }
    },
    {
      label: "NODE_OPTIONS",
      argv: current.argv,
      environment: {
        HOME: incidentSafeHome(),
        NEXT_CONFIG_READ_ONLY_IMPORT: "1",
        NODE_OPTIONS: "--import=./loader.mjs"
      }
    },
    {
      label: "unknown NEXT path",
      argv: current.argv,
      environment: {
        HOME: incidentSafeHome(),
        NEXT_CONFIG_READ_ONLY_IMPORT: "1",
        NEXT_CACHE_DIR: ".tmp/cache"
      }
    }
  ];
  for (const { label, argv, environment } of cases) {
    assert.throws(
      () => captureNextConfigReadOnlyAuthority({ ...current, argv, environment }),
      /ARGV|CLI|CONTEXT|ENVIRONMENT|INVALID|DENIED/i,
      label
    );
  }
});

test("fully rehashed historical Next read-only identities cannot pass the live TOCTOU boundary", () => {
  const current = nextReadOnlyFixture();
  const cases = [
    {
      label: "importer inode",
      mutate(capture) {
        const importer = capture.sources.find(
          ({ path }) => path === "scripts/next-config-read-only-importer.mjs"
        );
        assert.ok(importer);
        importer.ino = changedIdentityNumber(importer.ino);
      }
    },
    {
      label: "authority source digest",
      mutate(capture) {
        const authority = capture.sources.find(
          ({ path }) => path === "scripts/next-config-read-only-authority.mjs"
        );
        assert.ok(authority);
        authority.sha256 = "5".repeat(64);
      }
    },
    {
      label: "HOME hash",
      mutate(capture) { capture.homeValueSha256 = "6".repeat(64); }
    },
    {
      label: "executable digest",
      mutate(capture) { capture.executable.sha256 = "7".repeat(64); }
    }
  ];
  for (const { label, mutate } of cases) {
    const historical = clone(current.capture);
    mutate(historical);
    rehashNextReadOnlyCapture(historical);
    assert.throws(
      () => assertNextConfigReadOnlyAuthorityUnchanged(historical, current),
      /DRIFT|FINGERPRINT|HOME|IDENTITY|INVALID|SOURCE/i,
      label
    );
  }
});

test("authority rejection errors and serialized captures never disclose raw HOME", () => {
  const portable = portableFixture();
  const nextReadOnly = nextReadOnlyFixture();
  assert.equal(JSON.stringify(portable.capture).includes(incidentSafeHome()), false);
  assert.equal(JSON.stringify(nextReadOnly.capture).includes(incidentSafeHome()), false);
  assertRejectsWithoutHomeLeak(
    () => assertRequiredBrowserPortableListInvocationUnchanged(portable.capture, {
      ...portable,
      environment: {
        HOME: `${incidentSafeHome()}/drift`,
        PLAYWRIGHT_PORTABLE_LIST_ONLY: "1"
      }
    }),
    /HOME|proof|environment/i
  );
  assertRejectsWithoutHomeLeak(
    () => assertNextConfigReadOnlyAuthorityUnchanged(nextReadOnly.capture, {
      ...nextReadOnly,
      environment: {
        HOME: `${incidentSafeHome()}/drift`,
        NEXT_CONFIG_READ_ONLY_IMPORT: "1"
      }
    }),
    /HOME|proof|environment/i
  );
});
