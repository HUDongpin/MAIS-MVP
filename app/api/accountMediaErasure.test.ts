import { createRequire } from "node:module";
import path from "node:path";

// Native entry point. Fixtures import CURRENT product modules and root source.
// Root deletion is isolated at its DB boundary; no real account storage is used.
const requireFixture = createRequire(path.join(process.cwd(), "package.json"));
requireFixture(path.join(process.cwd(), "app/api/accountMediaErasure.regressions.cjs"));
