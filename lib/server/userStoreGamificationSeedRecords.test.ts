import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("gamification seed records own reward normalization helpers instead of root userStore", async () => {
  const helpers = await import("@/lib/server/userStore/gamificationSeedRecords").catch(() => ({} as Record<string, unknown>));
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationSeedRecords.ts"), "utf8").catch(() => "");

  const normalizeAdventureIslandSourceKey = helpers.normalizeAdventureIslandSourceKey;
  const normalizeRewardPointReason = helpers.normalizeRewardPointReason;
  const normalizeGamificationEventSource = helpers.normalizeGamificationEventSource;
  const adventureIslandLedgerLabel = helpers.adventureIslandLedgerLabel;
  const canonicalRewardCatalogPointCostFor = helpers.canonicalRewardCatalogPointCostFor;
  const rewardCatalogPointCostsNeedSync = helpers.rewardCatalogPointCostsNeedSync;
  const isValidRewardPointReason = helpers.isValidRewardPointReason;
  const isValidGamificationEventSource = helpers.isValidGamificationEventSource;
  const isValidGamificationEventStatus = helpers.isValidGamificationEventStatus;
  const isValidRewardCatalogCategory = helpers.isValidRewardCatalogCategory;
  const isValidRewardCampaignStatus = helpers.isValidRewardCampaignStatus;
  const seedRewardCatalogRecords = helpers.seedRewardCatalogRecords;
  const gamificationEventRecordFromRewardLedger = helpers.gamificationEventRecordFromRewardLedger;
  const gamificationEventsFromRewardLedger = helpers.gamificationEventsFromRewardLedger;
  const inferredRewardSourceKey = helpers.inferredRewardSourceKey;

  for (const [name, helper] of Object.entries({
    normalizeAdventureIslandSourceKey,
    normalizeRewardPointReason,
    normalizeGamificationEventSource,
    adventureIslandLedgerLabel,
    canonicalRewardCatalogPointCostFor,
    rewardCatalogPointCostsNeedSync,
    isValidRewardPointReason,
    isValidGamificationEventSource,
    isValidGamificationEventStatus,
    isValidRewardCatalogCategory,
    isValidRewardCampaignStatus,
    seedRewardCatalogRecords,
    gamificationEventRecordFromRewardLedger,
    gamificationEventsFromRewardLedger,
    inferredRewardSourceKey
  })) {
    assert.equal(typeof helper, "function", `${name} should be exported by gamificationSeedRecords`);
  }

  assert.doesNotMatch(helperSource, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(helperSource, /from ["']@\/lib\/server\/userStore["']/);
  assert.match(rootSource, /from ["']@\/lib\/server\/userStore\/gamificationSeedRecords["']/);
  assert.doesNotMatch(rootSource, /function normalizeAdventureIslandSourceKey\b/);
  assert.doesNotMatch(rootSource, /function normalizeRewardPointReason\b/);
  assert.doesNotMatch(rootSource, /function normalizeGamificationEventSource\b/);
  assert.doesNotMatch(rootSource, /function adventureIslandLedgerLabel\b/);
  assert.doesNotMatch(rootSource, /function canonicalRewardCatalogPointCostFor\b/);
  assert.doesNotMatch(rootSource, /function rewardCatalogPointCostsNeedSync\b/);
  assert.doesNotMatch(rootSource, /function seedRewardCatalogRecords\b/);
  assert.doesNotMatch(rootSource, /function gamificationEventRecordFromRewardLedger\b/);
  assert.doesNotMatch(rootSource, /function gamificationEventsFromRewardLedger\b/);
  assert.doesNotMatch(rootSource, /function inferredRewardSourceKey\b/);
  assert.doesNotMatch(rootSource, /const validRewardPointReasons\b/);
  assert.doesNotMatch(rootSource, /const validGamificationEventSources\b/);

  assert.equal((normalizeAdventureIslandSourceKey as (sourceKey: unknown) => string)("bonus-game-complete:student:quadratic:seed"), "adventure-island-complete:student:adventure-island:seed");
  assert.equal((normalizeRewardPointReason as (reason: unknown) => string)("bonus-game-complete"), "adventure-island-complete");
  assert.equal((normalizeRewardPointReason as (reason: unknown) => string)("unknown"), "teacher-award");
  assert.equal((normalizeGamificationEventSource as (source: unknown) => string)("bonus-game-complete"), "adventure-island-complete");
  assert.deepEqual((adventureIslandLedgerLabel as (reason: string, fallbackEn: string, fallbackZh: string) => { en: string; zh: string })(
    "adventure-island-complete",
    "legacy",
    ""
  ), {
    en: "Cleared the grade-level Adventure Island",
    zh: "完成年级探险岛"
  });

  assert.equal((canonicalRewardCatalogPointCostFor as (itemId: string) => number | null)("reward-ball-pen"), 350);
  assert.deepEqual((seedRewardCatalogRecords as () => Array<{ id: string; points_cost: number }>)().map((item) => ({
    id: item.id,
    points_cost: item.points_cost
  })), [
    { id: "reward-plush-toy", points_cost: 1200 },
    { id: "reward-pencil-set", points_cost: 120 },
    { id: "reward-ball-pen", points_cost: 350 },
    { id: "reward-eraser", points_cost: 150 },
    { id: "reward-learning-kit", points_cost: 900 }
  ]);
  assert.equal((rewardCatalogPointCostsNeedSync as (records: unknown) => boolean)([
    { id: "reward-ball-pen", points_cost: 35 }
  ]), true);
  assert.equal((isValidRewardPointReason as (reason: unknown) => boolean)("fishing-game-complete"), true);
  assert.equal((isValidGamificationEventSource as (source: unknown) => boolean)("bonus-game-complete"), false);
  assert.equal((isValidGamificationEventStatus as (status: unknown) => boolean)("awarded"), true);
  assert.equal((isValidRewardCatalogCategory as (category: unknown) => boolean)("stationery"), true);
  assert.equal((isValidRewardCampaignStatus as (status: unknown) => boolean)("active"), true);

  const lessonLedger = {
    id: "reward-ledger-peter-lesson-complete",
    student_id: "student-peter",
    amount: 40,
    reason: "lesson-complete",
    label_en: "Completed quadratic functions lesson",
    label_zh: "完成二次函數課節",
    created_at: "2026-06-20T10:00:00.000Z"
  };
  assert.equal((inferredRewardSourceKey as (entry: typeof lessonLedger, options?: { demoUserId?: string }) => string)(
    lessonLedger,
    { demoUserId: "student-peter" }
  ), "lesson-complete:student-peter:quadratic-functions");

  assert.deepEqual((gamificationEventRecordFromRewardLedger as (
    entry: typeof lessonLedger,
    options?: { demoUserId?: string }
  ) => Record<string, unknown> | null)(lessonLedger, { demoUserId: "student-peter" }), {
    id: "gamification-event-peter-lesson-complete",
    student_id: "student-peter",
    xp: 90,
    reward_points: 40,
    source: "lesson-complete",
    source_key: "lesson-complete:student-peter:quadratic-functions",
    label_en: "Completed quadratic functions lesson",
    label_zh: "完成二次函數課節",
    status: "awarded",
    anti_abuse_flags: [],
    economy_version: "gamification-core-v1",
    created_at: "2026-06-20T10:00:00.000Z"
  });

  assert.deepEqual((gamificationEventsFromRewardLedger as (
    records: Array<typeof lessonLedger | (typeof lessonLedger & { amount: number; reason: string })>,
    options?: { demoUserId?: string }
  ) => unknown[])([
    lessonLedger,
    { ...lessonLedger, id: "reward-ledger-spent", amount: -10, reason: "redemption-spent" }
  ], { demoUserId: "student-peter" }).map((event) => (event as { id: string }).id), [
    "gamification-event-peter-lesson-complete"
  ]);
});

test("gamification seed records own reward catalog record normalization for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/gamificationSeedRecords") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationSeedRecords.ts"), "utf8");

  const normalizeRewardCatalogRecord = helpers.normalizeRewardCatalogRecord;

  assert.equal(typeof normalizeRewardCatalogRecord, "function", "normalizeRewardCatalogRecord should be exported by gamificationSeedRecords");
  assert.match(helperSource, /export function normalizeRewardCatalogRecord\b/);
  assert.match(rootSource, /normalizeRewardCatalogRecord as normalizeRewardCatalogRecordFromGamificationSeedRecords/);
  assert.doesNotMatch(rootSource, /category: isValidRewardCatalogCategory\(item\.category\) \? item\.category : "stationery"/);
  assert.doesNotMatch(rootSource, /thumbnail_label: item\.thumbnail_label \|\| item\.name_en\.slice\(0, 3\)/);

  type NormalizeRewardCatalogRecord = (
    record: {
      id: string;
      name_en: string;
      name_zh: string;
      description_en: string;
      description_zh: string;
      category?: unknown;
      points_cost?: unknown;
      available?: boolean;
      accent?: string;
      thumbnail_label?: string;
      sort_order?: unknown;
    },
    index: number
  ) => Record<string, unknown>;
  const normalize = normalizeRewardCatalogRecord as NormalizeRewardCatalogRecord;

  assert.deepEqual(normalize({
    id: "custom-compass",
    name_en: "Compass kit",
    name_zh: "Compass kit",
    description_en: "A compact compass for geometry practice.",
    description_zh: "A compact compass for geometry practice.",
    category: "unknown-category",
    points_cost: 0,
    available: undefined,
    accent: "",
    thumbnail_label: "",
    sort_order: undefined
  }, 4), {
    id: "custom-compass",
    name_en: "Compass kit",
    name_zh: "Compass kit",
    description_en: "A compact compass for geometry practice.",
    description_zh: "A compact compass for geometry practice.",
    category: "stationery",
    points_cost: 1,
    available: true,
    accent: "from-cyan-300 via-blue-400 to-violet-400",
    thumbnail_label: "Com",
    sort_order: 4
  });

  assert.deepEqual(normalize({
    id: "reward-pencil-set",
    name_en: "Pencil set",
    name_zh: "Pencil set",
    description_en: "Two pencils.",
    description_zh: "Two pencils.",
    category: "toy",
    points_cost: 999,
    available: false,
    accent: "custom-accent",
    thumbnail_label: "Pen",
    sort_order: 12
  }, 0), {
    id: "reward-pencil-set",
    name_en: "Pencil set",
    name_zh: "Pencil set",
    description_en: "Two pencils.",
    description_zh: "Two pencils.",
    category: "toy",
    points_cost: 120,
    available: false,
    accent: "custom-accent",
    thumbnail_label: "Pen",
    sort_order: 12
  });
});

test("gamification seed records own reward catalog collection normalization for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/gamificationSeedRecords") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationSeedRecords.ts"), "utf8");

  const normalizeRewardCatalogRecords = helpers.normalizeRewardCatalogRecords as ((records?: Array<{
    id: string;
    name_en: string;
    name_zh: string;
    description_en: string;
    description_zh: string;
    category?: unknown;
    points_cost?: unknown;
    available?: boolean | null;
    accent?: string | null;
    thumbnail_label?: string | null;
    sort_order?: unknown;
  }>) => Array<Record<string, unknown>>) | undefined;

  assert.equal(typeof normalizeRewardCatalogRecords, "function", "normalizeRewardCatalogRecords should be exported by gamificationSeedRecords");
  assert.match(helperSource, /export function normalizeRewardCatalogRecords\b/);
  assert.match(rootSource, /normalizeRewardCatalogRecords as normalizeRewardCatalogRecordsFromGamificationSeedRecords/);
  assert.doesNotMatch(rootSource, /reward_catalog: mergeSeedRecordsPreservingExisting\(database\.reward_catalog, seedRewardCatalogRecords\(\), \(item\) => item\.id\)/);

  const records = normalizeRewardCatalogRecords?.([
    {
      id: "reward-pencil-set",
      name_en: "Legacy pencil",
      name_zh: "Legacy pencil",
      description_en: "Legacy description",
      description_zh: "Legacy description",
      category: "bad-category",
      points_cost: 999,
      available: false,
      accent: "",
      thumbnail_label: "",
      sort_order: undefined
    },
    {
      id: "custom-compass",
      name_en: "Compass kit",
      name_zh: "Compass kit",
      description_en: "A compact compass for geometry practice.",
      description_zh: "A compact compass for geometry practice.",
      category: "learning-tool",
      points_cost: "25.6",
      available: undefined,
      accent: "custom-accent",
      thumbnail_label: "Geo",
      sort_order: 99
    }
  ]);

  assert.equal(records?.length, 6);
  assert.deepEqual(records?.map((item) => item.id), [
    "reward-plush-toy",
    "reward-pencil-set",
    "reward-ball-pen",
    "reward-eraser",
    "reward-learning-kit",
    "custom-compass"
  ]);
  assert.deepEqual(records?.find((item) => item.id === "reward-pencil-set"), {
    id: "reward-pencil-set",
    name_en: "Legacy pencil",
    name_zh: "Legacy pencil",
    description_en: "Legacy description",
    description_zh: "Legacy description",
    category: "stationery",
    points_cost: 120,
    available: false,
    accent: "from-cyan-300 via-blue-400 to-violet-400",
    thumbnail_label: "Leg",
    sort_order: 1
  });
  assert.deepEqual(records?.find((item) => item.id === "custom-compass"), {
    id: "custom-compass",
    name_en: "Compass kit",
    name_zh: "Compass kit",
    description_en: "A compact compass for geometry practice.",
    description_zh: "A compact compass for geometry practice.",
    category: "learning-tool",
    points_cost: 26,
    available: true,
    accent: "custom-accent",
    thumbnail_label: "Geo",
    sort_order: 99
  });
});

test("gamification seed records own reward point ledger record normalization for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/gamificationSeedRecords") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationSeedRecords.ts"), "utf8");

  const normalizeRewardPointLedgerRecord = helpers.normalizeRewardPointLedgerRecord;

  assert.equal(typeof normalizeRewardPointLedgerRecord, "function", "normalizeRewardPointLedgerRecord should be exported by gamificationSeedRecords");
  assert.match(helperSource, /export function normalizeRewardPointLedgerRecord\b/);
  assert.doesNotMatch(rootSource, /normalizeRewardPointLedgerRecord as normalizeRewardPointLedgerRecordFromGamificationSeedRecords/);
  assert.doesNotMatch(rootSource, /const reason = normalizeRewardPointReason\(entry\.reason\)/);
  assert.doesNotMatch(rootSource, /source_key: inferredRewardSourceKey\(entry, \{ demoUserId \}\)/);

  type NormalizeRewardPointLedgerRecord = (
    record: {
      id: string;
      student_id: string;
      amount?: unknown;
      reason?: unknown;
      label_en: string;
      label_zh: string;
      source_key?: unknown;
      created_at?: string | null;
    },
    options: { demoUserId?: string; now: string }
  ) => Record<string, unknown>;
  const normalize = normalizeRewardPointLedgerRecord as NormalizeRewardPointLedgerRecord;

  assert.deepEqual(normalize({
    id: "reward-ledger-custom",
    student_id: "student-peter",
    amount: "12.7",
    reason: "unknown-reason",
    label_en: "Teacher encouragement",
    label_zh: "",
    created_at: null
  }, {
    demoUserId: "student-peter",
    now: "2026-06-20T12:00:00.000Z"
  }), {
    id: "reward-ledger-custom",
    student_id: "student-peter",
    amount: 13,
    reason: "teacher-award",
    label_en: "Teacher encouragement",
    label_zh: "Teacher encouragement",
    source_key: "",
    created_at: "2026-06-20T12:00:00.000Z"
  });

  assert.deepEqual(normalize({
    id: "reward-ledger-adventure",
    student_id: "student-peter",
    amount: -10.4,
    reason: "bonus-game-complete",
    label_en: "Legacy bonus game",
    label_zh: "",
    source_key: "bonus-game-complete:student-peter:quadratic:seed",
    created_at: "2026-06-19T08:00:00.000Z"
  }, {
    demoUserId: "student-peter",
    now: "2026-06-20T12:00:00.000Z"
  }), {
    id: "reward-ledger-adventure",
    student_id: "student-peter",
    amount: -10,
    reason: "adventure-island-complete",
    label_en: "Cleared the grade-level Adventure Island",
    label_zh: "完成年级探险岛",
    source_key: "adventure-island-complete:student-peter:adventure-island:seed",
    created_at: "2026-06-19T08:00:00.000Z"
  });
});

test("gamification seed records own reward point ledger collection normalization for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/gamificationSeedRecords") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationSeedRecords.ts"), "utf8");

  const normalizeRewardPointLedgerRecords = helpers.normalizeRewardPointLedgerRecords as ((records: Array<{
    id: string;
    student_id: string;
    amount?: unknown;
    reason?: unknown;
    label_en: string;
    label_zh: string;
    source_key?: unknown;
    created_at?: string | null;
  }> | undefined, now: string, options: {
    shouldSeedDemoUser: () => boolean;
    demoUserId: string;
    demoTeacherId: string;
  }) => Array<Record<string, unknown>>) | undefined;

  assert.equal(typeof normalizeRewardPointLedgerRecords, "function", "normalizeRewardPointLedgerRecords should be exported by gamificationSeedRecords");
  assert.match(helperSource, /export function normalizeRewardPointLedgerRecords\b/);
  assert.match(rootSource, /normalizeRewardPointLedgerRecords as normalizeRewardPointLedgerRecordsFromGamificationSeedRecords/);
  assert.doesNotMatch(rootSource, /reward_point_ledger: mergeSeedRecordsPreservingExisting\(/);

  const records = normalizeRewardPointLedgerRecords?.([
    {
      id: "reward-ledger-peter-lesson-complete",
      student_id: "student-peter",
      amount: "12.7",
      reason: "unknown-reason",
      label_en: "Teacher encouragement",
      label_zh: "",
      created_at: null
    },
    {
      id: "reward-ledger-custom-adventure",
      student_id: "student-peter",
      amount: -10.4,
      reason: "bonus-game-complete",
      label_en: "Legacy bonus",
      label_zh: "",
      source_key: "bonus-game-complete:student-peter:quadratic:seed",
      created_at: "2026-06-19T08:00:00.000Z"
    }
  ], "2026-06-20T12:00:00.000Z", {
    shouldSeedDemoUser: () => true,
    demoUserId: "student-peter",
    demoTeacherId: "teacher-ms-chan"
  });

  assert.equal(records?.length, 8);
  assert.deepEqual(records?.map((entry) => entry.id), [
    "reward-ledger-peter-lesson-complete",
    "reward-ledger-peter-practice-accuracy",
    "reward-ledger-peter-streak",
    "reward-ledger-peter-visualization",
    "reward-ledger-peter-mistake-review",
    "reward-ledger-peter-teacher-effort",
    "reward-ledger-peter-fulfilled-ball-pen",
    "reward-ledger-custom-adventure"
  ]);
  assert.deepEqual(records?.[0], {
    id: "reward-ledger-peter-lesson-complete",
    student_id: "student-peter",
    amount: 13,
    reason: "teacher-award",
    label_en: "Teacher encouragement",
    label_zh: "Teacher encouragement",
    source_key: "lesson-complete:student-peter:quadratic-functions",
    created_at: "2026-06-20T12:00:00.000Z"
  });
  assert.deepEqual(records?.[7], {
    id: "reward-ledger-custom-adventure",
    student_id: "student-peter",
    amount: -10,
    reason: "adventure-island-complete",
    label_en: "Cleared the grade-level Adventure Island",
    label_zh: "完成年级探险岛",
    source_key: "adventure-island-complete:student-peter:adventure-island:seed",
    created_at: "2026-06-19T08:00:00.000Z"
  });
  assert.deepEqual(normalizeRewardPointLedgerRecords?.([], "2026-06-20T12:00:00.000Z", {
    shouldSeedDemoUser: () => false,
    demoUserId: "student-peter",
    demoTeacherId: "teacher-ms-chan"
  }), []);
});

test("gamification seed records own reward redemption record normalization for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/gamificationSeedRecords") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationSeedRecords.ts"), "utf8");

  const normalizeRewardRedemptionRecord = helpers.normalizeRewardRedemptionRecord;

  assert.equal(typeof normalizeRewardRedemptionRecord, "function", "normalizeRewardRedemptionRecord should be exported by gamificationSeedRecords");
  assert.match(helperSource, /export function normalizeRewardRedemptionRecord\b/);
  assert.doesNotMatch(rootSource, /normalizeRewardRedemptionRecord as normalizeRewardRedemptionRecordFromGamificationSeedRecords/);
  assert.doesNotMatch(rootSource, /points_cost: Math\.max\(1, Math\.round\(Number\(redemption\.points_cost\) \|\| 1\)\)/);
  assert.doesNotMatch(rootSource, /requested_at: redemption\.requested_at \?\? now/);

  type NormalizeRewardRedemptionRecord = (
    record: {
      id: string;
      student_id: string;
      item_id: string;
      points_cost?: unknown;
      status?: unknown;
      requested_at?: string | null;
      decided_at?: string | null;
      fulfilled_at?: string | null;
    },
    now: string
  ) => Record<string, unknown>;
  const normalize = normalizeRewardRedemptionRecord as NormalizeRewardRedemptionRecord;

  assert.deepEqual(normalize({
    id: "redemption-custom",
    student_id: "student-peter",
    item_id: "reward-pencil-set",
    points_cost: "0",
    status: "cancelled",
    requested_at: null,
    decided_at: undefined,
    fulfilled_at: undefined
  }, "2026-06-20T12:00:00.000Z"), {
    id: "redemption-custom",
    student_id: "student-peter",
    item_id: "reward-pencil-set",
    points_cost: 1,
    status: "pending",
    requested_at: "2026-06-20T12:00:00.000Z",
    decided_at: null,
    fulfilled_at: null
  });

  assert.deepEqual(normalize({
    id: "redemption-approved",
    student_id: "student-peter",
    item_id: "reward-ball-pen",
    points_cost: 349.6,
    status: "fulfilled",
    requested_at: "2026-06-18T09:00:00.000Z",
    decided_at: "2026-06-19T09:00:00.000Z",
    fulfilled_at: "2026-06-20T09:00:00.000Z"
  }, "2026-06-20T12:00:00.000Z"), {
    id: "redemption-approved",
    student_id: "student-peter",
    item_id: "reward-ball-pen",
    points_cost: 350,
    status: "fulfilled",
    requested_at: "2026-06-18T09:00:00.000Z",
    decided_at: "2026-06-19T09:00:00.000Z",
    fulfilled_at: "2026-06-20T09:00:00.000Z"
  });
});

test("gamification seed records own reward redemption collection normalization for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/gamificationSeedRecords") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationSeedRecords.ts"), "utf8");

  const normalizeRewardRedemptionRecords = helpers.normalizeRewardRedemptionRecords;

  assert.equal(typeof normalizeRewardRedemptionRecords, "function", "normalizeRewardRedemptionRecords should be exported by gamificationSeedRecords");
  assert.match(helperSource, /export function normalizeRewardRedemptionRecords\b/);
  assert.match(rootSource, /normalizeRewardRedemptionRecords as normalizeRewardRedemptionRecordsFromGamificationSeedRecords/);
  assert.doesNotMatch(rootSource, /reward_redemptions: mergeSeedRecordsPreservingExisting\(/);

  type NormalizeRewardRedemptionRecords = (
    records: Array<{
      id: string;
      student_id: string;
      item_id: string;
      points_cost?: unknown;
      status?: unknown;
      requested_at?: string | null;
      decided_at?: string | null;
      fulfilled_at?: string | null;
      decided_by?: string;
      teacher_note?: string;
    }> | undefined,
    now: string,
    options: {
      shouldSeedDemoUser: () => boolean;
      demoUserId: string;
      demoTeacherId: string;
    }
  ) => Array<Record<string, unknown>>;
  const normalize = normalizeRewardRedemptionRecords as NormalizeRewardRedemptionRecords;
  const now = "2026-06-20T12:00:00.000Z";
  const options = {
    shouldSeedDemoUser: () => true,
    demoUserId: "student-peter",
    demoTeacherId: "teacher-ms-chan"
  };

  const records = normalize([
    {
      id: "reward-redemption-peter-ball-pen",
      student_id: "student-peter",
      item_id: "reward-ball-pen",
      points_cost: "0",
      status: "cancelled",
      requested_at: null,
      decided_at: undefined,
      fulfilled_at: undefined,
      decided_by: "teacher-custom",
      teacher_note: "Legacy row"
    },
    {
      id: "reward-redemption-custom-kit",
      student_id: "student-peter",
      item_id: "reward-learning-kit",
      points_cost: 899.6,
      status: "fulfilled",
      requested_at: "2026-06-18T09:00:00.000Z",
      decided_at: "2026-06-19T09:00:00.000Z",
      fulfilled_at: "2026-06-20T09:00:00.000Z",
      decided_by: "teacher-custom"
    }
  ], now, options);

  assert.equal(records.length, 3);
  assert.deepEqual(records.map((redemption) => redemption.id), [
    "reward-redemption-peter-ball-pen",
    "reward-redemption-peter-eraser",
    "reward-redemption-custom-kit"
  ]);
  assert.deepEqual(records[0], {
    id: "reward-redemption-peter-ball-pen",
    student_id: "student-peter",
    item_id: "reward-ball-pen",
    points_cost: 1,
    status: "pending",
    requested_at: now,
    decided_at: null,
    fulfilled_at: null,
    decided_by: "teacher-custom",
    teacher_note: "Legacy row"
  });
  assert.deepEqual(records[2], {
    id: "reward-redemption-custom-kit",
    student_id: "student-peter",
    item_id: "reward-learning-kit",
    points_cost: 900,
    status: "fulfilled",
    requested_at: "2026-06-18T09:00:00.000Z",
    decided_at: "2026-06-19T09:00:00.000Z",
    fulfilled_at: "2026-06-20T09:00:00.000Z",
    decided_by: "teacher-custom"
  });
  assert.deepEqual(normalize([], now, {
    shouldSeedDemoUser: () => false,
    demoUserId: "student-peter",
    demoTeacherId: "teacher-ms-chan"
  }), []);
});

test("gamification seed records own gamification event record normalization for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/gamificationSeedRecords") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationSeedRecords.ts"), "utf8");

  const normalizeGamificationEventRecord = helpers.normalizeGamificationEventRecord;

  assert.equal(typeof normalizeGamificationEventRecord, "function", "normalizeGamificationEventRecord should be exported by gamificationSeedRecords");
  assert.match(helperSource, /export function normalizeGamificationEventRecord\b/);
  assert.doesNotMatch(rootSource, /normalizeGamificationEventRecord as normalizeGamificationEventRecordFromGamificationSeedRecords/);
  assert.doesNotMatch(rootSource, /const source = normalizeGamificationEventSource\(event\.source\)/);
  assert.doesNotMatch(rootSource, /economy_version: event\.economy_version \|\| gamificationEconomyVersion/);

  type NormalizeGamificationEventRecord = (
    record: {
      id: string;
      student_id: string;
      xp?: unknown;
      reward_points?: unknown;
      source?: unknown;
      source_key?: unknown;
      label_en: string;
      label_zh: string;
      status?: unknown;
      anti_abuse_flags?: unknown;
      economy_version?: string | null;
      created_at?: string | null;
    },
    now: string
  ) => Record<string, unknown>;
  const normalize = normalizeGamificationEventRecord as NormalizeGamificationEventRecord;

  assert.deepEqual(normalize({
    id: "event-adventure",
    student_id: "student-peter",
    xp: -4,
    reward_points: "-4.6",
    source: "bonus-game-complete",
    source_key: "bonus-game-complete:student-peter:quadratic:seed",
    label_en: "Legacy bonus",
    label_zh: "",
    status: "unknown-status",
    anti_abuse_flags: ["a", 42, "b", "c", "d", "e", "f", "g", "h", "i"],
    economy_version: "",
    created_at: null
  }, "2026-06-20T12:00:00.000Z"), {
    id: "event-adventure",
    student_id: "student-peter",
    xp: 0,
    reward_points: -5,
    source: "adventure-island-complete",
    source_key: "adventure-island-complete:student-peter:adventure-island:seed",
    label_en: "Cleared the grade-level Adventure Island",
    label_zh: "完成年级探险岛",
    status: "awarded",
    anti_abuse_flags: ["a", "b", "c", "d", "e", "f", "g", "h"],
    economy_version: "gamification-core-v1",
    created_at: "2026-06-20T12:00:00.000Z"
  });

  assert.deepEqual(normalize({
    id: "event-teacher",
    student_id: "student-peter",
    xp: "8.4",
    reward_points: "2.4",
    source: "teacher-award",
    label_en: "Great explanation",
    label_zh: "",
    status: "flagged",
    anti_abuse_flags: "not-array",
    economy_version: "custom-economy",
    created_at: "2026-06-19T08:00:00.000Z"
  }, "2026-06-20T12:00:00.000Z"), {
    id: "event-teacher",
    student_id: "student-peter",
    xp: 8,
    reward_points: 2,
    source: "teacher-award",
    source_key: "event-teacher",
    label_en: "Great explanation",
    label_zh: "Great explanation",
    status: "flagged",
    anti_abuse_flags: [],
    economy_version: "custom-economy",
    created_at: "2026-06-19T08:00:00.000Z"
  });
});

test("gamification seed records own gamification event collection normalization for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/gamificationSeedRecords") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationSeedRecords.ts"), "utf8");

  const normalizeGamificationEventRecords = helpers.normalizeGamificationEventRecords;

  assert.equal(typeof normalizeGamificationEventRecords, "function", "normalizeGamificationEventRecords should be exported by gamificationSeedRecords");
  assert.match(helperSource, /export function normalizeGamificationEventRecords\b/);
  assert.match(rootSource, /normalizeGamificationEventRecords as normalizeGamificationEventRecordsFromGamificationSeedRecords/);
  assert.doesNotMatch(rootSource, /gamification_events: mergeSeedRecordsPreservingExisting\(/);

  type NormalizeGamificationEventRecords = (
    records: Array<{
      id: string;
      student_id: string;
      xp?: unknown;
      reward_points?: unknown;
      source?: unknown;
      source_key?: unknown;
      label_en: string;
      label_zh: string;
      status?: unknown;
      anti_abuse_flags?: unknown;
      economy_version?: string | null;
      created_at?: string | null;
    }> | undefined,
    rewardPointLedgerRecords: Array<{
      id: string;
      student_id: string;
      amount: number;
      reason: "mistake-review";
      label_en: string;
      label_zh: string;
      source_key?: string;
      created_at: string;
    }> | undefined,
    now: string,
    options: {
      shouldSeedDemoUser: () => boolean;
      demoUserId: string;
      demoTeacherId: string;
    }
  ) => Array<Record<string, unknown>>;
  const normalize = normalizeGamificationEventRecords as NormalizeGamificationEventRecords;
  const now = "2026-06-20T12:00:00.000Z";
  const options = {
    shouldSeedDemoUser: () => true,
    demoUserId: "student-peter",
    demoTeacherId: "teacher-ms-chan"
  };

  const records = normalize([
    {
      id: "gamification-event-peter-lesson-complete",
      student_id: "student-peter",
      xp: "-4",
      reward_points: "41.6",
      source: "unknown-source",
      source_key: "",
      label_en: "Legacy lesson override",
      label_zh: "",
      status: "unknown-status",
      anti_abuse_flags: ["a", 42, "b"],
      economy_version: "",
      created_at: null
    },
    {
      id: "gamification-event-custom-teacher",
      student_id: "student-peter",
      xp: "12.4",
      reward_points: "3.4",
      source: "teacher-award",
      label_en: "Custom praise",
      label_zh: "",
      status: "flagged",
      anti_abuse_flags: "not-array",
      economy_version: "custom-economy",
      created_at: "2026-06-19T08:00:00.000Z"
    }
  ], [], now, options);

  assert.equal(records.length, 7);
  assert.deepEqual(records.map((event) => event.id), [
    "gamification-event-peter-lesson-complete",
    "gamification-event-peter-practice-accuracy",
    "gamification-event-peter-streak",
    "gamification-event-peter-visualization",
    "gamification-event-peter-mistake-review",
    "gamification-event-peter-teacher-effort",
    "gamification-event-custom-teacher"
  ]);
  assert.deepEqual(records[0], {
    id: "gamification-event-peter-lesson-complete",
    student_id: "student-peter",
    xp: 0,
    reward_points: 42,
    source: "teacher-award",
    source_key: "gamification-event-peter-lesson-complete",
    label_en: "Legacy lesson override",
    label_zh: "Legacy lesson override",
    status: "awarded",
    anti_abuse_flags: ["a", "b"],
    economy_version: "gamification-core-v1",
    created_at: now
  });
  assert.deepEqual(records[6], {
    id: "gamification-event-custom-teacher",
    student_id: "student-peter",
    xp: 12,
    reward_points: 3,
    source: "teacher-award",
    source_key: "gamification-event-custom-teacher",
    label_en: "Custom praise",
    label_zh: "Custom praise",
    status: "flagged",
    anti_abuse_flags: [],
    economy_version: "custom-economy",
    created_at: "2026-06-19T08:00:00.000Z"
  });

  const derivedRecords = normalize([], [
    {
      id: "reward-ledger-custom-mistake",
      student_id: "student-peter",
      amount: 7,
      reason: "mistake-review",
      label_en: "Fixed mistakes",
      label_zh: "",
      source_key: "mistake-review:student-peter:custom",
      created_at: "2026-06-18T09:00:00.000Z"
    }
  ], now, {
    shouldSeedDemoUser: () => false,
    demoUserId: "student-peter",
    demoTeacherId: "teacher-ms-chan"
  });

  assert.deepEqual(derivedRecords, [
    {
      id: "gamification-event-custom-mistake",
      student_id: "student-peter",
      xp: 35,
      reward_points: 7,
      source: "mistake-review",
      source_key: "mistake-review:student-peter:custom",
      label_en: "Fixed mistakes",
      label_zh: "Fixed mistakes",
      status: "awarded",
      anti_abuse_flags: [],
      economy_version: "gamification-core-v1",
      created_at: "2026-06-18T09:00:00.000Z"
    }
  ]);
});

test("gamification seed records own reward campaign record normalization for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/gamificationSeedRecords") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationSeedRecords.ts"), "utf8");

  const normalizeRewardCampaignRecord = helpers.normalizeRewardCampaignRecord;

  assert.equal(typeof normalizeRewardCampaignRecord, "function", "normalizeRewardCampaignRecord should be exported by gamificationSeedRecords");
  assert.match(helperSource, /export function normalizeRewardCampaignRecord\b/);
  assert.doesNotMatch(rootSource, /normalizeRewardCampaignRecord as normalizeRewardCampaignRecordFromGamificationSeedRecords/);
  assert.doesNotMatch(rootSource, /status: isValidRewardCampaignStatus\(campaign\.status\) \? campaign\.status : "draft"/);
  assert.doesNotMatch(rootSource, /dailyQuestDefinitions\.some\(\(quest\) => quest\.id === questId\)/);

  type NormalizeRewardCampaignRecord = (
    record: {
      id: string;
      teacher_id: string;
      class_id: string;
      title_en: string;
      title_zh: string;
      description_en: string;
      description_zh: string;
      status?: unknown;
      budget_points?: unknown;
      awarded_points?: unknown;
      quest_ids?: unknown;
      starts_at?: string | null;
      ends_at?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    },
    now: string
  ) => Record<string, unknown>;
  const normalize = normalizeRewardCampaignRecord as NormalizeRewardCampaignRecord;

  assert.deepEqual(normalize({
    id: "campaign-custom",
    teacher_id: "teacher-1",
    class_id: "class-1",
    title_en: "Custom campaign",
    title_zh: "Custom campaign",
    description_en: "Custom campaign",
    description_zh: "Custom campaign",
    status: "archived",
    budget_points: -4,
    awarded_points: "12.6",
    quest_ids: ["daily-correct-answers", 42, "missing-quest", "daily-repair"],
    starts_at: null,
    ends_at: undefined,
    created_at: null,
    updated_at: undefined
  }, "2026-06-20T12:00:00.000Z"), {
    id: "campaign-custom",
    teacher_id: "teacher-1",
    class_id: "class-1",
    title_en: "Custom campaign",
    title_zh: "Custom campaign",
    description_en: "Custom campaign",
    description_zh: "Custom campaign",
    status: "draft",
    budget_points: 0,
    awarded_points: 13,
    quest_ids: ["daily-correct-answers", "daily-repair"],
    starts_at: "2026-06-20T12:00:00.000Z",
    ends_at: "2026-06-20T12:00:00.000Z",
    created_at: "2026-06-20T12:00:00.000Z",
    updated_at: "2026-06-20T12:00:00.000Z"
  });

  assert.deepEqual(normalize({
    id: "campaign-active",
    teacher_id: "teacher-1",
    class_id: "class-1",
    title_en: "Active campaign",
    title_zh: "Active campaign",
    description_en: "Active campaign",
    description_zh: "Active campaign",
    status: "active",
    budget_points: "99.5",
    awarded_points: 3.2,
    quest_ids: "not-array",
    starts_at: "2026-06-18T12:00:00.000Z",
    ends_at: "2026-06-22T12:00:00.000Z",
    created_at: "2026-06-18T08:00:00.000Z",
    updated_at: null
  }, "2026-06-20T12:00:00.000Z"), {
    id: "campaign-active",
    teacher_id: "teacher-1",
    class_id: "class-1",
    title_en: "Active campaign",
    title_zh: "Active campaign",
    description_en: "Active campaign",
    description_zh: "Active campaign",
    status: "active",
    budget_points: 100,
    awarded_points: 3,
    quest_ids: [],
    starts_at: "2026-06-18T12:00:00.000Z",
    ends_at: "2026-06-22T12:00:00.000Z",
    created_at: "2026-06-18T08:00:00.000Z",
    updated_at: "2026-06-18T08:00:00.000Z"
  });
});

test("gamification seed records own reward campaign collection normalization for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/gamificationSeedRecords") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationSeedRecords.ts"), "utf8");

  const normalizeRewardCampaignRecords = helpers.normalizeRewardCampaignRecords;

  assert.equal(typeof normalizeRewardCampaignRecords, "function", "normalizeRewardCampaignRecords should be exported by gamificationSeedRecords");
  assert.match(helperSource, /export function normalizeRewardCampaignRecords\b/);
  assert.match(rootSource, /normalizeRewardCampaignRecords as normalizeRewardCampaignRecordsFromGamificationSeedRecords/);
  assert.doesNotMatch(rootSource, /reward_campaigns: mergeSeedRecordsPreservingExisting\(/);

  type NormalizeRewardCampaignRecords = (
    records: Array<{
      id: string;
      teacher_id: string;
      class_id: string;
      title_en: string;
      title_zh: string;
      description_en: string;
      description_zh: string;
      status?: unknown;
      budget_points?: unknown;
      awarded_points?: unknown;
      quest_ids?: unknown;
      starts_at?: string | null;
      ends_at?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    }> | undefined,
    now: string,
    options: {
      shouldSeedDemoUser: () => boolean;
      demoUserId: string;
      demoTeacherId: string;
    }
  ) => Array<Record<string, unknown>>;
  const normalize = normalizeRewardCampaignRecords as NormalizeRewardCampaignRecords;
  const now = "2026-06-20T12:00:00.000Z";
  const options = {
    shouldSeedDemoUser: () => true,
    demoUserId: "student-peter",
    demoTeacherId: "teacher-ms-chan"
  };

  const records = normalize([
    {
      id: "campaign-s3a-steady-week",
      teacher_id: "teacher-ms-chan",
      class_id: "class-s3a-2026",
      title_en: "Legacy steady week",
      title_zh: "Legacy steady week",
      description_en: "Legacy campaign",
      description_zh: "Legacy campaign",
      status: "archived",
      budget_points: -4,
      awarded_points: "12.6",
      quest_ids: ["daily-correct-answers", 42, "missing-quest"],
      starts_at: null,
      ends_at: undefined,
      created_at: null,
      updated_at: undefined
    },
    {
      id: "campaign-custom-sprint",
      teacher_id: "teacher-ms-chan",
      class_id: "class-s3a-2026",
      title_en: "Custom sprint",
      title_zh: "Custom sprint",
      description_en: "Custom sprint",
      description_zh: "Custom sprint",
      status: "paused",
      budget_points: "99.5",
      awarded_points: 3.2,
      quest_ids: "not-array",
      starts_at: "2026-06-18T12:00:00.000Z",
      ends_at: "2026-06-22T12:00:00.000Z",
      created_at: "2026-06-18T08:00:00.000Z",
      updated_at: null
    }
  ], now, options);

  assert.equal(records.length, 2);
  assert.deepEqual(records.map((campaign) => campaign.id), [
    "campaign-s3a-steady-week",
    "campaign-custom-sprint"
  ]);
  assert.deepEqual(records[0], {
    id: "campaign-s3a-steady-week",
    teacher_id: "teacher-ms-chan",
    class_id: "class-s3a-2026",
    title_en: "Legacy steady week",
    title_zh: "Legacy steady week",
    description_en: "Legacy campaign",
    description_zh: "Legacy campaign",
    status: "draft",
    budget_points: 0,
    awarded_points: 13,
    quest_ids: ["daily-correct-answers"],
    starts_at: now,
    ends_at: now,
    created_at: now,
    updated_at: now
  });
  assert.deepEqual(records[1], {
    id: "campaign-custom-sprint",
    teacher_id: "teacher-ms-chan",
    class_id: "class-s3a-2026",
    title_en: "Custom sprint",
    title_zh: "Custom sprint",
    description_en: "Custom sprint",
    description_zh: "Custom sprint",
    status: "paused",
    budget_points: 100,
    awarded_points: 3,
    quest_ids: [],
    starts_at: "2026-06-18T12:00:00.000Z",
    ends_at: "2026-06-22T12:00:00.000Z",
    created_at: "2026-06-18T08:00:00.000Z",
    updated_at: "2026-06-18T08:00:00.000Z"
  });
  assert.deepEqual(normalize([], now, {
    shouldSeedDemoUser: () => false,
    demoUserId: "student-peter",
    demoTeacherId: "teacher-ms-chan"
  }), []);
});

test("gamification seed records own demo reward seed helpers instead of root userStore", async () => {
  const helpers = await import("@/lib/server/userStore/gamificationSeedRecords") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationSeedRecords.ts"), "utf8");

  const seedRewardPointLedgerRecords = helpers.seedRewardPointLedgerRecords;
  const seedRewardRedemptionRecords = helpers.seedRewardRedemptionRecords;
  const seedGamificationEventRecords = helpers.seedGamificationEventRecords;
  const seedRewardCampaignRecords = helpers.seedRewardCampaignRecords;

  for (const [name, helper] of Object.entries({
    seedRewardPointLedgerRecords,
    seedRewardRedemptionRecords,
    seedGamificationEventRecords,
    seedRewardCampaignRecords
  })) {
    assert.equal(typeof helper, "function", `${name} should be exported by gamificationSeedRecords`);
    assert.match(helperSource, new RegExp(`export function ${name}\\b`));
    assert.match(rootSource, new RegExp(`${name} as ${name}FromGamificationSeedRecords`));
    assert.doesNotMatch(rootSource, new RegExp(`function ${name}\\(`));
  }

  const now = "2026-06-20T12:00:00.000Z";
  type SeedOptions = {
    demoTeacherId: string;
    demoUserId: string;
    shouldSeedDemoUser: () => boolean;
  };
  const options: SeedOptions = {
    demoUserId: "student-peter",
    demoTeacherId: "teacher-ms-chan",
    shouldSeedDemoUser: () => true
  };
  const disabledOptions: SeedOptions = {
    ...options,
    shouldSeedDemoUser: () => false
  };
  const seedLedger = seedRewardPointLedgerRecords as (
    now: string,
    options?: SeedOptions
  ) => Array<{ id: string; student_id: string; awarded_by?: string; redemption_id?: string; created_at: string }>;
  const seedRedemptions = seedRewardRedemptionRecords as (
    now: string,
    options?: SeedOptions
  ) => Array<{ id: string; status: string; decided_by?: string; fulfilled_at: string | null }>;
  const seedEvents = seedGamificationEventRecords as (
    now: string,
    options?: SeedOptions
  ) => Array<{ id: string; source: string; reward_points: number }>;
  const seedCampaigns = seedRewardCampaignRecords as (
    now: string,
    options?: SeedOptions
  ) => Array<{ id: string; teacher_id: string; status: string; awarded_points: number; updated_at: string }>;

  const ledger = seedLedger(now, options);
  assert.equal(ledger.length, 7);
  assert.equal(ledger[0].id, "reward-ledger-peter-lesson-complete");
  assert.equal(ledger[0].student_id, "student-peter");
  assert.equal(ledger[0].created_at, "2026-06-14T12:00:00.000Z");
  assert.equal(ledger[5].awarded_by, "teacher-ms-chan");
  assert.equal(ledger[6].redemption_id, "reward-redemption-peter-ball-pen");
  assert.deepEqual(seedLedger(now, disabledOptions), []);

  const redemptions = seedRedemptions(now, options);
  assert.deepEqual(redemptions.map((redemption) => ({
    id: redemption.id,
    status: redemption.status,
    decidedBy: redemption.decided_by,
    fulfilledAt: redemption.fulfilled_at
  })), [
    {
      id: "reward-redemption-peter-ball-pen",
      status: "fulfilled",
      decidedBy: "teacher-ms-chan",
      fulfilledAt: "2026-06-20T00:00:00.000Z"
    },
    {
      id: "reward-redemption-peter-eraser",
      status: "pending",
      decidedBy: undefined,
      fulfilledAt: null
    }
  ]);
  assert.deepEqual(seedRedemptions(now, disabledOptions), []);

  assert.deepEqual(seedEvents(now, options).map((event) => ({
    id: event.id,
    source: event.source,
    points: event.reward_points
  })), [
    { id: "gamification-event-peter-lesson-complete", source: "lesson-complete", points: 40 },
    { id: "gamification-event-peter-practice-accuracy", source: "practice-accuracy", points: 30 },
    { id: "gamification-event-peter-streak", source: "streak", points: 25 },
    { id: "gamification-event-peter-visualization", source: "visualization-complete", points: 20 },
    { id: "gamification-event-peter-mistake-review", source: "mistake-review", points: 15 },
    { id: "gamification-event-peter-teacher-effort", source: "teacher-award", points: 50 }
  ]);
  assert.deepEqual(seedEvents(now, disabledOptions), []);

  assert.deepEqual(seedCampaigns(now, options).map((campaign) => ({
    id: campaign.id,
    teacher_id: campaign.teacher_id,
    status: campaign.status,
    awarded_points: campaign.awarded_points,
    updated_at: campaign.updated_at
  })), [
    {
      id: "campaign-s3a-steady-week",
      teacher_id: "teacher-ms-chan",
      status: "active",
      awarded_points: 130,
      updated_at: now
    }
  ]);
  assert.deepEqual(seedCampaigns(now, disabledOptions), []);
});

test("gamification seed records own reward redemption status helpers instead of root userStore", async () => {
  const helpers = await import("@/lib/server/userStore/gamificationSeedRecords") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationSeedRecords.ts"), "utf8");

  const isValidRewardRedemptionStatus = helpers.isValidRewardRedemptionStatus;
  const normalizeRewardRedemptionStatus = helpers.normalizeRewardRedemptionStatus;

  for (const [name, helper] of Object.entries({
    isValidRewardRedemptionStatus,
    normalizeRewardRedemptionStatus
  })) {
    assert.equal(typeof helper, "function", `${name} should be exported by gamificationSeedRecords`);
    assert.match(helperSource, new RegExp(`export function ${name}\\b`));
  }

  assert.match(rootSource, /isValidRewardRedemptionStatus as isValidRewardRedemptionStatusFromGamificationSeedRecords/);
  assert.doesNotMatch(rootSource, /normalizeRewardRedemptionStatus as normalizeRewardRedemptionStatusFromGamificationSeedRecords/);
  assert.doesNotMatch(rootSource, /const validRewardRedemptionStatuses\b/);
  assert.equal((isValidRewardRedemptionStatus as (status: unknown) => boolean)("fulfilled"), true);
  assert.equal((isValidRewardRedemptionStatus as (status: unknown) => boolean)("cancelled"), false);
  assert.equal((normalizeRewardRedemptionStatus as (status: unknown) => string)("approved"), "approved");
  assert.equal((normalizeRewardRedemptionStatus as (status: unknown) => string)("cancelled"), "pending");
});
