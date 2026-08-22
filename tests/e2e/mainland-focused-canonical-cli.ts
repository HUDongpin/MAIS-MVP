const canonicalSpecFiles = Object.freeze([
  "tests/e2e/china-mainland-g03-signed-real-production.spec.ts",
  "tests/e2e/china-mainland-g04-fraction-operations-production.spec.ts",
  "tests/e2e/china-mainland-g05-percent-applications-production.spec.ts",
  "tests/e2e/china-mainland-g06-ratio-proportion-scale-production.spec.ts",
] as const);

export type MainlandFocusedCanonicalSpecFile =
  (typeof canonicalSpecFiles)[number];

export type MainlandFocusedCanonicalCliReceipt = Readonly<{
  listOnly: boolean;
  reporters: readonly string[];
  requiredSpec: MainlandFocusedCanonicalSpecFile;
  retries: 0;
  selectedSpecs: readonly MainlandFocusedCanonicalSpecFile[];
  workers: 1;
}>;

export const MAINLAND_FOCUSED_CANONICAL_CLI_CONTRACT = Object.freeze({
  allowedReporters: Object.freeze(["json", "list"] as const),
  allowedSpecFiles: canonicalSpecFiles,
  retries: 0,
  schemaVersion: "mainland-focused-canonical-cli.v1",
  workers: 1,
});

function fail(message: string): never {
  throw new TypeError(`Mainland focused canonical CLI rejected: ${message}`);
}

function normalizeSpec(value: string) {
  const normalized = value.replaceAll("\\", "/");
  if (canonicalSpecFiles.includes(normalized as MainlandFocusedCanonicalSpecFile)) {
    return normalized;
  }
  const cwdPrefix = `${process.cwd().replaceAll("\\", "/").replace(/\/$/u, "")}/`;
  if (normalized.startsWith(cwdPrefix)) return normalized.slice(cwdPrefix.length);
  return normalized;
}

function optionValue(
  args: readonly string[],
  index: number,
  longFlag: string,
  shortFlag?: string,
) {
  const argument = args[index] ?? "";
  if (argument === longFlag || (shortFlag !== undefined && argument === shortFlag)) {
    const value = args[index + 1];
    if (!value || value.startsWith("-")) fail(`${argument} requires a value`);
    return { consumed: 2, value } as const;
  }
  if (argument.startsWith(`${longFlag}=`)) {
    const value = argument.slice(longFlag.length + 1);
    if (!value) fail(`${longFlag} requires a value`);
    return { consumed: 1, value } as const;
  }
  if (shortFlag && argument.startsWith(`${shortFlag}=`)) {
    const value = argument.slice(shortFlag.length + 1);
    if (!value) fail(`${shortFlag} requires a value`);
    return { consumed: 1, value } as const;
  }
  if (
    shortFlag &&
    argument.startsWith(shortFlag) &&
    argument.length > shortFlag.length
  ) {
    return { consumed: 1, value: argument.slice(shortFlag.length) } as const;
  }
  return null;
}

function canonicalProcessArgv() {
  const sealed = process.env.MAIS_FOCUSED_PLAYWRIGHT_ARGS_JSON;
  if (sealed === undefined) return process.argv;
  let parsed: unknown;
  try {
    parsed = JSON.parse(sealed);
  } catch (error) {
    fail(`wrapper-sealed CLI JSON is invalid: ${String(error)}`);
  }
  if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "string")) {
    fail("wrapper-sealed CLI JSON must be an array of strings");
  }
  return parsed as string[];
}

export function assertMainlandFocusedCanonicalCli({
  argv = canonicalProcessArgv(),
  requiredSpec,
}: {
  argv?: readonly string[];
  requiredSpec: MainlandFocusedCanonicalSpecFile;
}): MainlandFocusedCanonicalCliReceipt {
  if (!canonicalSpecFiles.includes(requiredSpec)) {
    fail(`unknown required spec ${requiredSpec}`);
  }
  const testCommandIndexes = argv.flatMap((argument, index) =>
    argument === "test" ? [index] : [],
  );
  if (testCommandIndexes.length === 0) fail("Playwright test command is missing");
  if (testCommandIndexes.length !== 1) {
    fail("exactly one Playwright test command is required");
  }
  const testCommandIndex = testCommandIndexes[0] ?? -1;
  if (testCommandIndex !== 0 && testCommandIndex !== 2) {
    fail(`Playwright test command has an invalid boundary at argv[${testCommandIndex}]`);
  }
  const args = argv.slice(testCommandIndex + 1);
  const selectedSpecs: MainlandFocusedCanonicalSpecFile[] = [];
  const reporters: string[] = [];
  let listOnly = false;
  let workers: 1 = 1;
  let retries: 0 = 0;
  let workerOptionCount = 0;
  let retryOptionCount = 0;

  for (let index = 0; index < args.length;) {
    const argument = args[index] ?? "";
    if (argument === "--list") {
      if (listOnly) fail("--list is duplicated");
      listOnly = true;
      index += 1;
      continue;
    }

    const workerOption = optionValue(args, index, "--workers", "-j");
    if (workerOption) {
      workerOptionCount += 1;
      if (workerOption.value !== "1") {
        fail(`workers must equal 1; actual=${workerOption.value}`);
      }
      workers = 1;
      index += workerOption.consumed;
      continue;
    }

    const retryOption = optionValue(args, index, "--retries");
    if (retryOption) {
      retryOptionCount += 1;
      if (retryOption.value !== "0") {
        fail(`retries must equal 0; actual=${retryOption.value}`);
      }
      retries = 0;
      index += retryOption.consumed;
      continue;
    }

    const reporterOption = optionValue(args, index, "--reporter");
    if (reporterOption) {
      const parsed = reporterOption.value.split(",").filter(Boolean);
      if (
        parsed.length === 0 ||
        parsed.some((reporter) =>
          !MAINLAND_FOCUSED_CANONICAL_CLI_CONTRACT.allowedReporters.includes(
            reporter as "json" | "list",
          )
        ) ||
        new Set(parsed).size !== parsed.length
      ) {
        fail(`reporters must be unique list/json reporters; actual=${reporterOption.value}`);
      }
      reporters.push(...parsed);
      index += reporterOption.consumed;
      continue;
    }

    if (argument.startsWith("-")) {
      fail(`forbidden or unknown option ${argument}`);
    }

    const normalized = normalizeSpec(argument);
    if (
      !canonicalSpecFiles.includes(
        normalized as MainlandFocusedCanonicalSpecFile,
      )
    ) {
      fail(`unexpected positional test filter ${argument}`);
    }
    selectedSpecs.push(normalized as MainlandFocusedCanonicalSpecFile);
    index += 1;
  }

  if (selectedSpecs.length === 0) fail("no exact focused spec was selected");
  if (new Set(selectedSpecs).size !== selectedSpecs.length) {
    fail("focused spec paths are duplicated");
  }
  if (!selectedSpecs.includes(requiredSpec)) {
    fail(`required spec ${requiredSpec} is absent`);
  }
  if (workerOptionCount !== 1) {
    fail(`exactly one explicit workers=1 option is required; actual=${workerOptionCount}`);
  }
  if (retryOptionCount !== 1) {
    fail(`exactly one explicit retries=0 option is required; actual=${retryOptionCount}`);
  }
  if (reporters.length > 0 && new Set(reporters).size !== reporters.length) {
    fail("reporters are duplicated across CLI options");
  }
  if (
    !listOnly &&
    (reporters.length !== 2 ||
      !reporters.includes("list") ||
      !reporters.includes("json"))
  ) {
    fail("final execution requires exactly the list and json reporters");
  }

  return Object.freeze({
    listOnly,
    reporters: Object.freeze(reporters),
    requiredSpec,
    retries,
    selectedSpecs: Object.freeze(selectedSpecs),
    workers,
  });
}
