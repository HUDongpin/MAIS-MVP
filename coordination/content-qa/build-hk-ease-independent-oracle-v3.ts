import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { buildHongKongEaseIndependentOracle } from "../../lib/hongKongEaseIndependentOracle";

const outputPath = join(
  process.cwd(),
  "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json"
);

writeFileSync(outputPath, `${JSON.stringify(buildHongKongEaseIndependentOracle(), null, 2)}\n`, "utf8");
