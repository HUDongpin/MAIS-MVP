import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDesignRegistrationV5,
  buildPredecessorPackageInventoryV4,
  buildStatisticalPowerV5,
  buildV5PackageManifest,
} from "./design-contract.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

async function writeJson(filename, value) {
  await writeFile(path.join(HERE, filename), `${JSON.stringify(value, null, 2)}\n`, { mode: 0o644 });
}

if (!process.argv.includes("--write")) {
  throw new Error("refusing to write generated design artifacts without --write");
}

const inventory = await buildPredecessorPackageInventoryV4();
await writeJson("predecessor-package-inventory-v4.json", inventory);
const registration = await buildDesignRegistrationV5();
await writeJson("design-registration.json", registration);
await writeJson("statistical-power.json", buildStatisticalPowerV5(registration.registrationHash));
await writeJson("package-manifest.json", await buildV5PackageManifest());
