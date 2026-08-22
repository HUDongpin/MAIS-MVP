import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const HISTORICAL_CACHE_RELATIVE_PATH =
  ".tmp/hk-ease-independent-oracle-tdd/green/tsx-501/17866-9396cafdfc09c1deecabfc772c5b683043120ef4";
const HISTORICAL_CACHE_ABSOLUTE_PATH =
  "/Volumes/Starship/MAIS-hk-ease-v2-qa-wt/.tmp/hk-ease-independent-oracle-tdd/green/tsx-501/17866-9396cafdfc09c1deecabfc772c5b683043120ef4";
const CACHE_SHA256 = "cf1723ab41cec7dfafdb0e947994c53c6855f8d8fde2aa3ee5d08681fbca4e82";
const CACHE_BYTE_LENGTH = 544299;
const EXPECTED_SOURCE_PATH = "/Volumes/Starship/MAIS-hk-ease-v2-qa-wt/data/questions.ts";
const EXPECTED_SOURCE_SHA256 = "24ec6fb77921f0d22a8281179ac3a07f55817351ad31894a94cf72cfa5cc8f7a";
const EXPECTED_SOURCE_BYTE_LENGTH = 202554;
export const RESIDUAL28_SOURCE_MAP_CONTAINER_PATH =
  "coordination/content-qa/authoritative/2026-08-13-data-questions-residual28-preimage-source-map.json.txt";
export const RESIDUAL28_SOURCE_PREIMAGE_PATH =
  "coordination/content-qa/authoritative/2026-08-13-data-questions-residual28-preimage.txt";
export const RESIDUAL28_SOURCE_RECOVERY_RECEIPT_PATH =
  "coordination/content-qa/authoritative/2026-08-13-hk-residual28-source-recovery-receipt.json";

const TOP_LEVEL_KEYS = ["code", "map", "warnings"] as const;
const SOURCE_MAP_KEYS = ["ignoreList", "mappings", "names", "sources", "sourcesContent", "version"] as const;
const SECRET_PATTERNS = {
  bearer: /bearer\s+[a-z0-9._~+\/-]+=*/gi,
  authorizationHeader: /authorization\s*[:=]/gi,
  cookie: /\bcookie\s*[:=]/gi,
  privateKey: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  openai: /\bsk-[a-z0-9_-]{16,}/gi,
  aws: /\bAKIA[0-9A-Z]{16}\b/g,
  jwt: /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/g,
  envSecret: /(?:API_KEY|SECRET|PASSWORD|TOKEN)\s*=\s*[^\s"']+/gi
} as const;

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

type AuditedCache = {
  map: { sources: string[]; sourcesContent: unknown[] };
};

export function auditHongKongResidual28SourceMapContainer(cacheBytes: Buffer) {
  assert.equal(cacheBytes.length, CACHE_BYTE_LENGTH, "source-map container byte length drift");
  assert.equal(sha256(cacheBytes), CACHE_SHA256, "source-map container SHA drift");
  const parsed = JSON.parse(cacheBytes.toString("utf8")) as Record<string, unknown>;
  assert.deepEqual(Object.keys(parsed).sort(), [...TOP_LEVEL_KEYS], "source-map container top-level shape drift");
  assert.ok(parsed.map && typeof parsed.map === "object" && !Array.isArray(parsed.map));
  const map = parsed.map as Record<string, unknown>;
  assert.deepEqual(Object.keys(map).sort(), [...SOURCE_MAP_KEYS], "source-map payload shape drift");
  assert.ok(Array.isArray(map.sources));
  assert.ok(Array.isArray(map.sourcesContent));
  assert.equal(map.sources.length, 1, "source-map source cardinality drift");
  assert.equal(map.sourcesContent.length, 1, "source-map content cardinality drift");

  const text = cacheBytes.toString("utf8");
  const secretPatternCounts = Object.fromEntries(
    Object.entries(SECRET_PATTERNS).map(([name, pattern]) => [name, text.match(pattern)?.length ?? 0])
  );
  assert.deepEqual(
    secretPatternCounts,
    Object.fromEntries(Object.keys(SECRET_PATTERNS).map((name) => [name, 0])),
    "source-map container contains secret-like material"
  );
  return {
    cache: parsed as unknown as AuditedCache,
    audit: {
      auditVersion: "hk-residual28-source-map-container-secret-pattern-audit-v1",
      topLevelKeys: [...TOP_LEVEL_KEYS],
      sourceMapKeys: [...SOURCE_MAP_KEYS],
      sourceCount: map.sources.length,
      sourcesContentCount: map.sourcesContent.length,
      secretPatternCounts
    }
  };
}

export function extractHongKongResidual28SourcePreimage(
  cacheRelativePath = RESIDUAL28_SOURCE_MAP_CONTAINER_PATH
) {
  const { cache } = auditHongKongResidual28SourceMapContainer(
    readFileSync(join(process.cwd(), cacheRelativePath))
  );
  const matchingIndices = cache.map.sources
    .map((source, index) => ({ source, index }))
    .filter(({ source }) => source === EXPECTED_SOURCE_PATH)
    .map(({ index }) => index);
  assert.deepEqual(matchingIndices, [0], "container must contain exactly one exact questions.ts source coordinate");
  const source = cache.map.sourcesContent[matchingIndices[0]];
  assert.ok(typeof source === "string");
  const sourceBytes = Buffer.from(source, "utf8");
  assert.equal(sourceBytes.length, EXPECTED_SOURCE_BYTE_LENGTH);
  assert.equal(sha256(sourceBytes), EXPECTED_SOURCE_SHA256);
  return sourceBytes;
}

export function buildHongKongResidual28SourceRecoveryReceipt() {
  const { audit } = auditHongKongResidual28SourceMapContainer(
    readFileSync(join(process.cwd(), RESIDUAL28_SOURCE_MAP_CONTAINER_PATH))
  );
  return {
    schemaVersion: 2,
    artifact: "hk-residual28-source-recovery-receipt",
    status: "immutable-recovery-evidence",
    recoveryAlgorithm:
      "Audit and parse the exact package-local tsx source-map container; require map.sources to contain the exact original questions.ts coordinate exactly once at index 0; encode map.sourcesContent[0] as UTF-8 without transformation; require byte length 202554 and SHA-256 24ec6f...; compare those exact bytes with the package-local non-compilable source preimage.",
    historicalCacheContainer: {
      classification: "non-authoritative-recovery-coordinate",
      historicalPath: HISTORICAL_CACHE_ABSOLUTE_PATH,
      historicalSha256: CACHE_SHA256,
      byteLength: CACHE_BYTE_LENGTH
    },
    immutableCacheContainer: {
      classification: "immutable-artifact-resolvable",
      path: RESIDUAL28_SOURCE_MAP_CONTAINER_PATH,
      sha256: CACHE_SHA256,
      byteLength: CACHE_BYTE_LENGTH
    },
    containerContentAudit: audit,
    sourceMapExtraction: {
      classification: "non-authoritative-recovery-coordinate",
      sourceIndex: 0,
      historicalPath: EXPECTED_SOURCE_PATH,
      matchingSourceCount: 1,
      utf8ByteLength: EXPECTED_SOURCE_BYTE_LENGTH,
      historicalSha256: EXPECTED_SOURCE_SHA256
    },
    recoveredArtifact: {
      classification: "immutable-artifact-resolvable",
      path: RESIDUAL28_SOURCE_PREIMAGE_PATH,
      sha256: EXPECTED_SOURCE_SHA256,
      byteLength: EXPECTED_SOURCE_BYTE_LENGTH
    }
  } as const;
}

export function assertCheckedInHongKongResidual28SourcePreimage() {
  const checkedIn = readFileSync(join(process.cwd(), RESIDUAL28_SOURCE_PREIMAGE_PATH));
  assert.equal(checkedIn.length, EXPECTED_SOURCE_BYTE_LENGTH);
  assert.equal(sha256(checkedIn), EXPECTED_SOURCE_SHA256);
  assert.deepEqual(extractHongKongResidual28SourcePreimage(), checkedIn);
  const receipt = JSON.parse(
    readFileSync(join(process.cwd(), RESIDUAL28_SOURCE_RECOVERY_RECEIPT_PATH), "utf8")
  );
  assert.deepEqual(receipt, buildHongKongResidual28SourceRecoveryReceipt());
  return checkedIn;
}

if (process.argv[1]?.endsWith("extract-hk-residual28-source-preimage.ts")) {
  if (process.argv.includes("--materialize-container")) {
    const historicalBytes = readFileSync(join(process.cwd(), HISTORICAL_CACHE_RELATIVE_PATH));
    auditHongKongResidual28SourceMapContainer(historicalBytes);
    writeFileSync(join(process.cwd(), RESIDUAL28_SOURCE_MAP_CONTAINER_PATH), historicalBytes);
    writeFileSync(
      join(process.cwd(), RESIDUAL28_SOURCE_RECOVERY_RECEIPT_PATH),
      `${JSON.stringify(buildHongKongResidual28SourceRecoveryReceipt(), null, 2)}\n`
    );
    assertCheckedInHongKongResidual28SourcePreimage();
    process.stdout.write("HK residual28 source-map container: audited immutable bytes and receipt materialized\n");
  } else {
    assertCheckedInHongKongResidual28SourcePreimage();
    process.stdout.write("HK residual28 questions source preimage: immutable recovery chain verified\n");
  }
}
