import { executeSacrificialRoleTask } from "./sacrificial-runner.mjs";

let input = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) input += chunk;

try {
  const payload = JSON.parse(input);
  const result = executeSacrificialRoleTask(payload);
  process.stdout.write(JSON.stringify(result));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
