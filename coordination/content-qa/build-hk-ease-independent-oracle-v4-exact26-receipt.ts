import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const HK_EASE_V4_EXACT26_SANITIZED_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json";
export const HK_EASE_V4_EXACT26_SUPPLEMENT_PREIMAGE_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/preimages/v4-row-specific-derivation-supplement-a855b861.json";
export const HK_EASE_V4_EXACT26_RECEIPT_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-independent-exact26-review-receipt.json";

export const HK_EASE_V4_EXACT26_SANITIZED_SHA256 =
  "1b36361daad78bbd54d1e8a42d1e58dbdd8b62ab65638783a8697943ddf10634";
export const HK_EASE_V4_EXACT26_SUPPLEMENT_PREIMAGE_SHA256 =
  "a855b86192312ca450c17969749f9d4643ce21b493e01dace10273bb57dbe763";
export const HK_EASE_V4_EXACT26_ORDERED_BASE_ID_SHA256 =
  "fe20c8ff458b6d67b911c20ee02675202b188c44b4cc933066a2f64bd965b66a";
export const HK_EASE_V4_EXACT26_OUTCOME_BYTE_LENGTH = 56_916;
export const HK_EASE_V4_EXACT26_OUTCOME_SHA256 =
  "e970336f13d7e16b30115a10de89e435af916dd1fd15e4ea113c464a95973c6b";

export type HongKongEaseV4Exact26Defect = {
  index: number;
  baseId: string;
  discrepancyNote: string;
};

export const HK_EASE_V4_EXACT26_LEDGER: readonly HongKongEaseV4Exact26Defect[] = [
  {
    index: 19,
    baseId: "hk-ease-10649",
    discrepancyNote: "metadata-only: prompt requires a greatest-to-least chain using >, but promptRequirements declares no inequality-symbol representation; response is correct."
  },
  {
    index: 28,
    baseId: "hk-ease-10660",
    discrepancyNote: "metadata-only: prompt requires a least-to-greatest chain using <, but promptRequirements declares no inequality-symbol representation; response is correct."
  },
  {
    index: 55,
    baseId: "hk-ease-10587",
    discrepancyNote: "metadata-only: prompt requires the rectangle-area formula and exact length × width = area form, but method and explicitFormat are null; response 15 × 6 = 90 cm² is correct."
  },
  {
    index: 62,
    baseId: "hk-ease-10594",
    discrepancyNote: "metadata-only: prompt requires the square-area formula and exact side × side = area form, but method and explicitFormat are null; response 7 × 7 = 49 cm² is correct."
  },
  {
    index: 72,
    baseId: "hk-ease-10391",
    discrepancyNote: "step/trace + metadata: prompt requires a commutative or associative property; method is null, and the executable trace computes (25 × 17) × 4 instead of deriving the response chain 25 × 4 × 17 = (25 × 4) × 17; final 1700 is correct."
  },
  {
    index: 73,
    baseId: "hk-ease-10392",
    discrepancyNote: "step/trace + metadata: nearest-ten estimation is required, but method is null and no typed rounding step derives 198 → 200 and 32 → 30 before 200 × 30; response 6000;6336 is numerically correct."
  },
  {
    index: 113,
    baseId: "hk-ease-10431",
    discrepancyNote: "metadata-only: prompt requires a complete factor list, but components omits complete-factor-list; response list is correct."
  },
  {
    index: 118,
    baseId: "hk-ease-10436",
    discrepancyNote: "metadata-only: prime/composite/neither classification is required, but components omits prime-composite-classification; response and reason are correct."
  },
  {
    index: 123,
    baseId: "hk-ease-10441",
    discrepancyNote: "metadata-only: prompt requires a complete factor list, but components omits complete-factor-list; response list is correct."
  },
  {
    index: 137,
    baseId: "hk-ease-10458",
    discrepancyNote: "metadata-only: an explicit decision plus reason is required, but components includes reason and omits decision; response is correct."
  },
  {
    index: 138,
    baseId: "hk-ease-10459",
    discrepancyNote: "metadata/fact coverage: explicit (a)…;(b)…;(c)… format and complete factor lists for 18 and 27 are required, but explicitFormat is null and components omits complete-factor-list; facts also omit the part-(c)/format request; response sets are correct."
  },
  {
    index: 146,
    baseId: "hk-ease-10467",
    discrepancyNote: "metadata-only: prompt asks for a truth decision, not a common-factor list; components incorrectly includes common-factor-list and omits decision; response True is correct."
  },
  {
    index: 148,
    baseId: "hk-ease-10457",
    discrepancyNote: "metadata/fact coverage: explicit (a)…;(b)…;(c)… format and the part-(c) first-two-common-multiples case are required, but explicitFormat is null and facts omit the part-(c)/format request; response lists are correct."
  },
  {
    index: 204,
    baseId: "hk-ease-10527",
    discrepancyNote: "metadata-only: prompt explicitly requires place;value format, but explicitFormat is null; response hundredths;0.03 is correct."
  },
  {
    index: 210,
    baseId: "hk-ease-10533",
    discrepancyNote: "metadata-only: prompt requires a largest-to-smallest chain using >, but promptRequirements declares no inequality-symbol representation; response is correct."
  },
  {
    index: 219,
    baseId: "hk-ease-10515",
    discrepancyNote: "metadata-only: prompt explicitly requires place of 4;place of 6 format, but explicitFormat is null; response is correct."
  },
  {
    index: 272,
    baseId: "hk-ease-182",
    discrepancyNote: "metadata-only: prompt requires a complete factor list, but components omits complete-factor-list; response factors and classification are correct."
  },
  {
    index: 273,
    baseId: "hk-ease-183",
    discrepancyNote: "metadata-only: prompt requires a complete factor list, but components omits complete-factor-list; response factors and classification are correct."
  },
  {
    index: 299,
    baseId: "hk-ease-667",
    discrepancyNote: "metadata-only: prompt requires a complete factor list, but components omits complete-factor-list; response factors, classification, and reason are correct."
  },
  {
    index: 305,
    baseId: "hk-ease-734",
    discrepancyNote: "metadata-only: prompt explicitly requires enumeration, but method is null; typed factor enumeration and response are correct."
  },
  {
    index: 358,
    baseId: "hk-ease-1071",
    discrepancyNote: "metadata-only: prompt requires a complete factor list, but components omits complete-factor-list; response list is correct."
  },
  {
    index: 376,
    baseId: "hk-ease-1089",
    discrepancyNote: "metadata-only: prompt has four labeled cases (a)-(d), but components stops at part-c and omits part-d; all four decisions are correct."
  },
  {
    index: 377,
    baseId: "hk-ease-1090",
    discrepancyNote: "metadata-only: prompt has four labeled cases (a)-(d), but components stops at part-c and omits part-d; all four decisions are correct."
  },
  {
    index: 389,
    baseId: "hk-ease-1102",
    discrepancyNote: "step/trace semantic defect: HCF short division must stop after 56,84 ÷2→28,42; ÷2→14,21; ÷7→2,3 because gcd(2,3)=1. The appended ÷2 and ÷3 steps do not divide every current value and are invalid HCF steps, although HCF 28 and the common-factor list are correct."
  },
  {
    index: 688,
    baseId: "hk-ease-864",
    discrepancyNote: "metadata-only: prompt has four labeled cases (a)-(d), but components stops at part-c and omits part-d; response groups are correct."
  },
  {
    index: 693,
    baseId: "hk-ease-1041",
    discrepancyNote: "response/bilingual + metadata: EN asks six ordered Yes/No groups while ZH explicitly requires a ✓/✗ template; response uses Yes/No, explicitFormat is null, and components stops at part-c, omitting part-d/e/f and decision. All divisibility decisions are correct."
  }
] as const;

type SanitizedRow = {
  index: number;
  baseId: string;
};

type SanitizedInput = {
  schemaVersion: string;
  questionCount: number;
  orderedBaseIdSha256: string;
  rows: SanitizedRow[];
};

export type HongKongEaseV4IndependentReviewOutcome = {
  index: number;
  baseId: string;
  status: "pass" | "fail";
  discrepancyNote: string;
};

export type HongKongEaseV4Exact26ReviewReceipt = {
  schemaVersion: "hk-ease-v4-independent-exact26-review-receipt-v1";
  status: "frozen-independent-review-authority-needs-semantic-repair";
  reviewBoundary: "sanitized bilingual prompts plus row-specific derivation supplement preimage; no production answer, accepted-answer, contract, mapper, v3, or generated-v4-oracle authority";
  sanitizedInput: { path: string; sha256: string };
  supplementPreimage: { path: string; sha256: string };
  orderedBaseIdSha256: string;
  outcomeCanonicalization: "UTF-8 JSON.stringify([{index,baseId,status,discrepancyNote}], sanitized row order)";
  outcomeByteLength: number;
  outcomeSha256: string;
  summary: { total: 701; pass: 675; fail: 26 };
  exact26LedgerSha256: string;
  exact26Ledger: HongKongEaseV4Exact26Defect[];
  outcomes: HongKongEaseV4IndependentReviewOutcome[];
};

const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

const fail = (code: string): never => {
  throw new Error(code);
};

export type HongKongEaseV4Exact26CanonicalOutcome = {
  orderedBaseIdSha256: string;
  outcomePayload: string;
  outcomeByteLength: number;
  outcomeSha256: string;
  outcomes: HongKongEaseV4IndependentReviewOutcome[];
};

export const buildHongKongEaseV4Exact26CanonicalOutcome = (
  sanitizedBytes: Buffer
): HongKongEaseV4Exact26CanonicalOutcome => {
  if (sha256(sanitizedBytes) !== HK_EASE_V4_EXACT26_SANITIZED_SHA256) {
    fail("V4_EXACT26_SANITIZED_PREIMAGE_DRIFT");
  }

  const sanitized = JSON.parse(sanitizedBytes.toString("utf8")) as SanitizedInput;
  if (sanitized.questionCount !== 701 || sanitized.rows.length !== 701) {
    fail("V4_EXACT26_SANITIZED_CARDINALITY_DRIFT");
  }
  if (sanitized.orderedBaseIdSha256 !== HK_EASE_V4_EXACT26_ORDERED_BASE_ID_SHA256) {
    fail("V4_EXACT26_ORDERED_BASE_ID_DECLARATION_DRIFT");
  }
  const orderedBaseIdSha256 = sha256(`${sanitized.rows.map(({ baseId }) => baseId).join("\n")}\n`);
  if (orderedBaseIdSha256 !== HK_EASE_V4_EXACT26_ORDERED_BASE_ID_SHA256) {
    fail("V4_EXACT26_ORDERED_BASE_ID_PAYLOAD_DRIFT");
  }

  if (HK_EASE_V4_EXACT26_LEDGER.length !== 26) {
    fail("V4_EXACT26_LEDGER_CARDINALITY_DRIFT");
  }
  const defectsByIndex = new Map<number, HongKongEaseV4Exact26Defect>();
  for (const defect of HK_EASE_V4_EXACT26_LEDGER) {
    if (defectsByIndex.has(defect.index)) fail("V4_EXACT26_DUPLICATE_INDEX");
    const source = sanitized.rows[defect.index];
    if (!source || source.index !== defect.index || source.baseId !== defect.baseId) {
      fail(`V4_EXACT26_ROW_IDENTITY_DRIFT:${defect.index}:${defect.baseId}`);
    }
    defectsByIndex.set(defect.index, defect);
  }

  const seenBaseIds = new Set<string>();
  const outcomes = sanitized.rows.map((row, position): HongKongEaseV4IndependentReviewOutcome => {
    if (row.index !== position) fail(`V4_EXACT26_ROW_ORDER_DRIFT:${position}:${row.index}`);
    if (seenBaseIds.has(row.baseId)) fail(`V4_EXACT26_DUPLICATE_BASE_ID:${row.baseId}`);
    seenBaseIds.add(row.baseId);
    const defect = defectsByIndex.get(position);
    return {
      index: position,
      baseId: row.baseId,
      status: defect ? "fail" : "pass",
      discrepancyNote: defect?.discrepancyNote ?? ""
    };
  });

  const outcomePayload = JSON.stringify(outcomes);
  const outcomeByteLength = Buffer.byteLength(outcomePayload, "utf8");
  const outcomeSha256 = sha256(outcomePayload);
  if (outcomeByteLength !== HK_EASE_V4_EXACT26_OUTCOME_BYTE_LENGTH) {
    fail(`V4_EXACT26_OUTCOME_BYTE_LENGTH_DRIFT:${outcomeByteLength}`);
  }
  if (outcomeSha256 !== HK_EASE_V4_EXACT26_OUTCOME_SHA256) {
    fail(`V4_EXACT26_OUTCOME_SHA256_DRIFT:${outcomeSha256}`);
  }

  const pass = outcomes.filter(({ status }) => status === "pass").length;
  const failed = outcomes.length - pass;
  if (pass !== 675 || failed !== 26) fail(`V4_EXACT26_OUTCOME_COUNTS_DRIFT:${pass}:${failed}`);

  return {
    orderedBaseIdSha256,
    outcomePayload,
    outcomeByteLength,
    outcomeSha256,
    outcomes
  };
};

export const buildHongKongEaseV4Exact26ReviewReceipt = (
  sanitizedBytes: Buffer,
  supplementPreimageBytes: Buffer
): HongKongEaseV4Exact26ReviewReceipt => {
  if (sha256(supplementPreimageBytes) !== HK_EASE_V4_EXACT26_SUPPLEMENT_PREIMAGE_SHA256) {
    fail("V4_EXACT26_SUPPLEMENT_PREIMAGE_DRIFT");
  }

  const {
    orderedBaseIdSha256,
    outcomeByteLength,
    outcomeSha256,
    outcomes
  } = buildHongKongEaseV4Exact26CanonicalOutcome(sanitizedBytes);

  const exact26Ledger = HK_EASE_V4_EXACT26_LEDGER.map((entry) => ({ ...entry }));
  return {
    schemaVersion: "hk-ease-v4-independent-exact26-review-receipt-v1",
    status: "frozen-independent-review-authority-needs-semantic-repair",
    reviewBoundary: "sanitized bilingual prompts plus row-specific derivation supplement preimage; no production answer, accepted-answer, contract, mapper, v3, or generated-v4-oracle authority",
    sanitizedInput: {
      path: HK_EASE_V4_EXACT26_SANITIZED_PATH,
      sha256: HK_EASE_V4_EXACT26_SANITIZED_SHA256
    },
    supplementPreimage: {
      path: HK_EASE_V4_EXACT26_SUPPLEMENT_PREIMAGE_PATH,
      sha256: HK_EASE_V4_EXACT26_SUPPLEMENT_PREIMAGE_SHA256
    },
    orderedBaseIdSha256,
    outcomeCanonicalization: "UTF-8 JSON.stringify([{index,baseId,status,discrepancyNote}], sanitized row order)",
    outcomeByteLength,
    outcomeSha256,
    summary: { total: 701, pass: 675, fail: 26 },
    exact26LedgerSha256: sha256(JSON.stringify(exact26Ledger)),
    exact26Ledger,
    outcomes
  };
};

export const renderHongKongEaseV4Exact26ReviewReceipt = (
  receipt: HongKongEaseV4Exact26ReviewReceipt
): string => `${JSON.stringify(receipt, null, 2)}\n`;

const main = (): void => {
  const receipt = buildHongKongEaseV4Exact26ReviewReceipt(
    readFileSync(resolve(REPOSITORY_ROOT, HK_EASE_V4_EXACT26_SANITIZED_PATH)),
    readFileSync(resolve(REPOSITORY_ROOT, HK_EASE_V4_EXACT26_SUPPLEMENT_PREIMAGE_PATH))
  );
  writeFileSync(
    resolve(REPOSITORY_ROOT, HK_EASE_V4_EXACT26_RECEIPT_PATH),
    renderHongKongEaseV4Exact26ReviewReceipt(receipt),
    "utf8"
  );
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
