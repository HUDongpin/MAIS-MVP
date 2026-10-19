import { writeFileSync } from "node:fs";

import { authenticateUserForLogin } from "@/lib/server/userStore";

const resultPath = process.env.PROBE_RESULT_PATH;

async function main() {
  if (!resultPath) throw new Error("PROBE_RESULT_PATH is required");
  if (!process.env.HK_MATH_DB_PATH) throw new Error("HK_MATH_DB_PATH is required");
  const jon = await authenticateUserForLogin("Student Jon", "12345");
  const peter = await authenticateUserForLogin("HK Student Peter", "12345");
  writeFileSync(resultPath, JSON.stringify({
    jonStatus: jon.status,
    peterStatus: peter.status
  }));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "probe failed";
  if (resultPath) {
    writeFileSync(resultPath, JSON.stringify({ error: message }));
  }
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
