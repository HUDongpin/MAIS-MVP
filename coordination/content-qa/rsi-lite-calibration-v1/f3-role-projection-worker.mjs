import { buildRoleProjection } from "./f3-execution-contract.mjs";
import { readFile, writeFile } from "node:fs/promises";

let input;
const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (inputPath) {
  input = await readFile(inputPath, "utf8");
} else {
  input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
}

try {
  const payload = JSON.parse(input);
  const sensitiveEnvironmentKeys = Object.keys(process.env).filter((key) => /(?:API[_-]?KEY|TOKEN|SECRET|CREDENTIAL|PASSWORD|AUTHORIZATION)/i.test(key));
  const projection = buildRoleProjection({ role: payload.role, packageContent: payload.packageContent });
  const output = JSON.stringify({
    role: payload.role,
    projection,
    credentialEnvironmentAbsent: sensitiveEnvironmentKeys.length === 0
  });
  if (outputPath) await writeFile(outputPath, output, { encoding: "utf8", mode: 0o600, flag: "wx" });
  else process.stdout.write(output);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
