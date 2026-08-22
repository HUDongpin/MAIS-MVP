import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { lstatSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FIXED_REAL_MEASUREMENT_PROCEDURE,
  discoverCaliforniaSignatureFinalCompositorMeasurementEnvironment
} from "./california-signature-final-compositor-real-measurement-producer";
import { californiaSignatureFinalCompositorRealMeasurementProducerTestFixture as fixture } from
  "./california-signature-final-compositor-real-measurement-producer.test-fixture";

const WORKTREE = "/Volumes/Starship/MAIS-ca-viz-labs-wt";
const BROWSER = "/fixtures/physical-chrome";
const FONT = "/fixtures/Inter-Regular.ttf";

function bytes(value: string): Buffer {
  return Buffer.from(value, "utf8");
}

function createProbe(options: {
  commandOverrides?: Readonly<Record<string, string>>;
  driftExecutable?: string;
  monotonicValues?: readonly bigint[];
} = {}) {
  const readCounts = new Map<string, number>();
  const commands: Array<{ args: readonly string[]; executablePath: string }> = [];
  const monotonicValues = [...(options.monotonicValues ??
    Array.from({ length: 64 }, (_, index) => BigInt((index + 1) * 1_000_000)))];
  const commandOverrides = options.commandOverrides ?? {};

  const commandOutput = (executablePath: string, args: readonly string[]) => {
    const key = `${executablePath}\0${args.join("\0")}`;
    const override = commandOverrides[key];
    if (override !== undefined) return override;
    if (executablePath === BROWSER) {
      assert.deepEqual(args, ["--version"],
        "dry discovery must not launch a browser context");
      return "Google Chrome for Testing 140.0.7339.0\n";
    }
    if (executablePath === "/usr/sbin/sysctl") return "8\n";
    if (executablePath === "/usr/bin/pmset" && args.join(" ") === "-g batt") {
      return "Now drawing from 'AC Power'\n";
    }
    if (executablePath === "/usr/bin/pmset" && args.join(" ") === "-g therm") {
      return "Note: No thermal warning level has been recorded\n" +
        "Note: No performance warning level has been recorded\n";
    }
    if (executablePath === "/bin/df") {
      return "Filesystem 1024-blocks Used Available Capacity Mounted on\n" +
        "/dev/disk9s1 1000000 200000 800000 20% /Volumes/Starship\n";
    }
    if (executablePath === "/sbin/mount") {
      return "/dev/disk9s1 on /Volumes/Starship (apfs, local, journaled)\n";
    }
    if (executablePath === "/usr/bin/defaults") return "en_US\n";
    if (executablePath === "/usr/bin/readlink") {
      return "/var/db/timezone/zoneinfo/America/Los_Angeles\n";
    }
    if (executablePath === "/usr/sbin/system_profiler" &&
        args[0] === "SPDisplaysDataType") {
      return JSON.stringify({
        SPDisplaysDataType: [{
          _name: "Fixture GPU",
          spdisplays_ndrvs: [{
            _name: "Fixture Display",
            _spdisplays_pixels: "2560 x 1440",
            spdisplays_main: "spdisplays_yes",
            spdisplays_resolution: "1280 x 720 @ 60.00Hz"
          }]
        }]
      });
    }
    if (executablePath === "/usr/sbin/system_profiler" &&
        args[0] === "SPFontsDataType") {
      return JSON.stringify({
        SPFontsDataType: [{
          enabled: "yes",
          path: FONT,
          typefaces: [{
            _name: "Inter-Regular",
            enabled: "yes",
            family: "Inter",
            version: "Version 4.0"
          }]
        }]
      });
    }
    assert.fail(`unexpected fixture command ${key}`);
  };

  return {
    browserExecutablePath() {
      return BROWSER;
    },
    commands,
    nodeOsSnapshot() {
      return {
        architecture: "arm64",
        cpuLogicalCoreCount: 8,
        cpuModel: "Fixture CPU",
        kernelVersion: "24.6.0",
        loadAverage1mMilli: 125,
        nodeVersion: "v22.18.0",
        operatingSystem: "darwin",
        ramBytes: 34_359_738_368
      };
    },
    nowMonotonicNs() {
      assert.ok(monotonicValues.length > 0, "fixture monotonic clock exhausted");
      return monotonicValues.shift()!;
    },
    packageFilePath(packageName: string, relativePath: string) {
      return `/fixtures/modules/${packageName}/${relativePath}`;
    },
    readHeldFile(filePath: string) {
      const currentCount = (readCounts.get(filePath) ?? 0) + 1;
      readCounts.set(filePath, currentCount);
      if (filePath === path.join(WORKTREE, ".next/BUILD_ID")) {
        const error = new Error("fixture build is intentionally absent") as NodeJS.ErrnoException;
        error.code = "ENOENT";
        throw error;
      }
      let value = bytes(`fixture:${filePath}`);
      if (filePath.endsWith("playwright-core/browsers.json")) {
        value = bytes(JSON.stringify({
          browsers: [{ name: "chromium", revision: "fixture-1217" }]
        }));
      } else if (filePath.endsWith("playwright-core/package.json")) {
        value = bytes(JSON.stringify({ version: "1.59.1" }));
      } else if (filePath.endsWith("sharp/package.json")) {
        value = bytes(JSON.stringify({ version: "0.34.4" }));
      } else if (filePath.endsWith("next/package.json")) {
        value = bytes(JSON.stringify({ version: "15.5.23" }));
      } else if (filePath === FONT) {
        value = bytes("fixture-font-bitmap");
      }
      const drift = filePath === options.driftExecutable && currentCount > 1;
      return {
        bytes: drift ? Buffer.concat([value, bytes(":drift")]) : value,
        identity: {
          ctimeNs: drift ? "200" : "100",
          dev: "1",
          ino: drift ? "99" : String(10 + filePath.length),
          mode: filePath === BROWSER ? 0o755 : 0o644,
          mtimeNs: drift ? "200" : "100",
          nlink: 1,
          size: drift ? value.length + 6 : value.length
        },
        realPath: filePath,
        requestedPath: filePath
      };
    },
    runCommand(executablePath: string, args: readonly string[]) {
      commands.push({ args: [...args], executablePath });
      return {
        status: 0,
        signal: null,
        stderr: bytes(""),
        stdout: bytes(commandOutput(executablePath, args))
      };
    },
    sharpRuntimeVersions() {
      return { libvipsVersion: "8.17.2", sharpVersion: "0.34.4" };
    }
  };
}

function discoverWithProbe(probe: ReturnType<typeof createProbe>) {
  return fixture.runWithProbe(probe,
    () => discoverCaliforniaSignatureFinalCompositorMeasurementEnvironment());
}

test("dry discovery owns every environment fact, starts no browser context, and publishes on Starship", () => {
  const probe = createProbe();
  const publication = discoverWithProbe(probe);
  try {
    assert.equal(publication.receipt.formalExecutionAuthorized, false);
    assert.equal(publication.receipt.status, "diagnostic-environment-discovery");
    assert.equal(publication.receipt.measurementBoundary.browserContextStarted, false);
    assert.equal(publication.receipt.measurementBoundary.rawSampleCount, 0);
    assert.deepEqual(publication.receipt.measurementBoundary.rawSamples, []);
    assert.equal(publication.receipt.resourceLifecycle.browserProfilePath, null);
    assert.equal(publication.receipt.resourceLifecycle.browserProfileRemoved, true);
    assert.deepEqual(publication.receipt.fixedProcedure,
      CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FIXED_REAL_MEASUREMENT_PROCEDURE);
    assert.ok(publication.receipt.readinessBlockers.includes("clean-production-build-unavailable"));
    assert.ok(publication.receipt.readinessBlockers.includes(
      "real-browser-calibration-receipts-unavailable"));
    assert.ok(publication.receipt.readinessBlockers.includes(
      "formal-source-snapshot-receipt-unavailable"));
    assert.equal(path.dirname(publication.directoryPath), path.join(WORKTREE, ".tmp"));
    assert.equal(path.dirname(publication.filePath), publication.directoryPath);
    assert.equal(lstatSync(publication.directoryPath).mode & 0o777, 0o700);
    assert.equal(lstatSync(publication.filePath).mode & 0o777, 0o400);
    assert.equal(probe.commands.filter((command) => command.executablePath === BROWSER).length, 1);
    assert.deepEqual(probe.commands.find((command) => command.executablePath === BROWSER)?.args,
      ["--version"]);
  } finally {
    fixture.dispose(publication);
  }
});

test("production discovery rejects caller-authored environment and measurement claims", () => {
  const probe = createProbe();
  assert.throws(() => fixture.runWithProbe(probe, () =>
    (discoverCaliforniaSignatureFinalCompositorMeasurementEnvironment as unknown as
      (forged: unknown) => unknown)({
        browserVersion: "forged",
        environment: {},
        rawSamples: [{ durationMs: 1 }]
      })), /takes no caller-authored options/);
});

test("missing or unparseable authoritative environment probes fail closed", () => {
  const key = "/usr/bin/pmset\0-g\0therm";
  const probe = createProbe({ commandOverrides: { [key]: "unknown thermal payload\n" } });
  assert.throws(() => discoverWithProbe(probe), /thermal state.*unavailable/i);
});

test("a physical command executable that drifts during its probe is rejected", () => {
  const probe = createProbe({ driftExecutable: "/usr/sbin/sysctl" });
  assert.throws(() => discoverWithProbe(probe), /physical executable.*drifted/i);
});

test("the physical Chrome binary is re-read around its version probe and drift fails closed", () => {
  const probe = createProbe({ driftExecutable: BROWSER });
  assert.throws(() => discoverWithProbe(probe), /physical input drifted|physical executable drifted/i);
});

test("fixed baseline coverage cannot omit navigation, hydrate, replay, layout, or real Reset", () => {
  const publication = discoverWithProbe(createProbe());
  try {
    const forged = structuredClone(publication.receipt) as unknown as Record<string, unknown>;
    const fixedProcedure = forged.fixedProcedure as Record<string, unknown>;
    const baseline = fixedProcedure.baseline as Record<string, unknown>;
    baseline.stageSequence = ["navigation", "hydrate", "replay", "layout"];
    assert.throws(() => fixture.validate(forged), /fixed measurement procedure.*drifted/i);
  } finally {
    fixture.dispose(publication);
  }
});

test("dry discovery cannot forge samples, browser coverage, or authorization", () => {
  const publication = discoverWithProbe(createProbe());
  try {
    for (const mutate of [
      (value: Record<string, unknown>) => { value.formalExecutionAuthorized = true; },
      (value: Record<string, unknown>) => {
        (value.measurementBoundary as Record<string, unknown>).browserContextStarted = true;
      },
      (value: Record<string, unknown>) => {
        (value.measurementBoundary as Record<string, unknown>).rawSamples = [{ durationMs: 1 }];
        (value.measurementBoundary as Record<string, unknown>).rawSampleCount = 1;
      }
    ]) {
      const forged = structuredClone(publication.receipt) as unknown as Record<string, unknown>;
      mutate(forged);
      assert.throws(() => fixture.validate(forged),
        /diagnostic|measurement boundary|receipt.*derived|authorize/i);
    }
  } finally {
    fixture.dispose(publication);
  }
});

test("regressing or zero-duration monotonic clocks fail closed", () => {
  const values = [BigInt(1_000_000), BigInt(1_000_000),
    ...Array.from({ length: 62 }, (_, index) => BigInt((index + 2) * 1_000_000))];
  assert.throws(() => discoverWithProbe(createProbe({ monotonicValues: values })),
    /monotonic clock.*advance/i);
});

test("every subprocess must have an exact zero-exit process-success receipt", () => {
  const probe = createProbe();
  const originalRun = probe.runCommand;
  probe.runCommand = (executablePath: string, args: readonly string[]) => {
    const result = originalRun(executablePath, args);
    if (executablePath === "/bin/df") return { ...result, status: 9 };
    return result;
  };
  assert.throws(() => discoverWithProbe(probe), /command.*zero exit|process-success/i);
});

test("production injection hooks are absent outside the exact Node test entrypoint", () => {
  const sourcePath = path.join(
    WORKTREE,
    "tests/e2e/california-signature-final-compositor-real-measurement-producer.ts"
  );
  const script = [
    "import assert from 'node:assert/strict';",
    `import { discoverCaliforniaSignatureFinalCompositorMeasurementEnvironment as discover } ` +
      `from ${JSON.stringify(sourcePath)};`,
    "assert.equal(Object.getOwnPropertySymbols(globalThis).some((symbol) => " +
      "String(symbol).includes('real-measurement-producer.test-fixture')), false);",
    "assert.equal(discover.length, 0);"
  ].join("\n");
  const result = spawnSync(process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", script], {
      cwd: WORKTREE,
      encoding: "utf8"
    });
  assert.equal(result.status, 0, result.stderr);
});
