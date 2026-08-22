import fs from "node:fs";
import fsPromises from "node:fs/promises";

async function assertDenied(label, operation) {
  try {
    await operation();
  } catch (error) {
    if (/signature audit capsule rejected (?:unbound filesystem access|an undeclared builtin acquisition)/u.test(
      error?.message ?? "",
    )) {
      return;
    }
    throw new Error(`${label} failed for the wrong reason: ${error?.message ?? error}`);
  }
  throw new Error(`${label} reached one unbound capability`);
}

await assertDenied("openSync", () => fs.openSync(process.execPath, "r"));
await assertDenied("openAsBlob", () => fs.openAsBlob(process.execPath));
await assertDenied("globSync", () => fs.globSync(process.execPath));
await assertDenied("promise glob", async () => {
  for await (const entry of fsPromises.glob(process.execPath)) return entry;
  return null;
});
await assertDenied("loadEnvFile", () => process.loadEnvFile(process.execPath));
await assertDenied("execve", () =>
  process.execve("/definitely-not-one-reviewed-executable", ["blocked"], {}));
await assertDenied("getBuiltinModule", () =>
  process.getBuiltinModule("node:child_process"));

process.stdout.write("DENIED_ALTERNATES 7\n");
