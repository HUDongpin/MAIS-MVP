#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export * from "./prod-certification-core.mjs";

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { runProductionCertification } = await import("./prod-certification-runtime.mjs");
  await runProductionCertification(process.argv.slice(2));
}
