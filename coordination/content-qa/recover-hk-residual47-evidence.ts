import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RECOVERIES = [
  {
    source: ".tmp/hk-residual-audit/evidence/residual-content.txt",
    target: "coordination/content-qa/authoritative/2026-08-13-hk-residual47-learner-content.txt",
    sha256: "250aeec93a13ae0efd7b1ddc1dc161120eb785d8c4ea97bdc0b3e415912a1442",
    byteLength: 48686
  },
  {
    source: ".tmp/hk-residual-audit/evidence/residual-semantic-audit.json",
    target: "coordination/content-qa/authoritative/2026-08-13-hk-residual47-semantic-audit-v1-superseded.json",
    sha256: "5021bcdb57c085fc2d9fcc9a573554da69a6f5aa4555b9e3ddaf774d2d7cb7da",
    byteLength: 24397
  },
  {
    source: ".tmp/hk-residual-audit/evidence/residual-semantic-audit-addendum-v2.json",
    target: "coordination/content-qa/authoritative/2026-08-13-hk-residual47-semantic-audit-addendum-v2.json",
    sha256: "302eeb11c0eb36a7ca254caf82dd1e167c6c8107872cb4fec622433a35b37d1b",
    byteLength: 4970
  },
  {
    source: ".tmp/hk-residual-audit/evidence/residual-rewrite-recommendations.md",
    target: "coordination/content-qa/authoritative/2026-08-13-hk-residual47-rewrite-recommendations-proposal.md",
    sha256: "a6c15272c5dcd0ff81e9f55205fc2ea711244c6c261b7769238b25f67d531eda",
    byteLength: 14205
  }
] as const;

function sha256(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function assertBytes(bytes: Buffer, recovery: (typeof RECOVERIES)[number]) {
  assert.equal(bytes.length, recovery.byteLength, `${recovery.target}: byte length`);
  assert.equal(sha256(bytes), recovery.sha256, `${recovery.target}: SHA-256`);
}

export function assertCheckedInHongKongResidual47Evidence() {
  for (const recovery of RECOVERIES) {
    assertBytes(readFileSync(join(process.cwd(), recovery.target)), recovery);
  }
  return RECOVERIES;
}

if (process.argv[1]?.endsWith("recover-hk-residual47-evidence.ts")) {
  if (process.argv.includes("--write")) {
    for (const recovery of RECOVERIES) {
      const bytes = readFileSync(join(process.cwd(), recovery.source));
      assertBytes(bytes, recovery);
      writeFileSync(join(process.cwd(), recovery.target), bytes);
    }
    process.stdout.write("HK residual47 evidence: exact Starship recovery bytes materialized\n");
  } else {
    assertCheckedInHongKongResidual47Evidence();
    process.stdout.write("HK residual47 evidence: package-local immutable bytes verified\n");
  }
}
