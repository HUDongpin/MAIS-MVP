import { dailyQuestDefinitions, gamificationEconomyVersion } from "@/data/gamification";
import { gamificationRewardForSource } from "@/lib/gamification";
import type {
  GamificationEventSource,
  GamificationEventStatus,
  RewardCatalogCategory,
  RewardCampaignStatus,
  RewardPointReason,
  RewardRedemptionStatus
} from "@/types";

export type GamificationSeedRewardCatalogRecord = {
  id: string;
  name_en: string;
  name_zh: string;
  description_en: string;
  description_zh: string;
  category: RewardCatalogCategory;
  points_cost: number;
  available: boolean;
  accent: string;
  thumbnail_label: string;
  sort_order: number;
};

export type GamificationSeedRewardPointLedgerRecord = {
  id: string;
  student_id: string;
  amount: number;
  reason: RewardPointReason;
  label_en: string;
  label_zh: string;
  note?: string;
  awarded_by?: string;
  redemption_id?: string;
  source_key?: string;
  created_at: string;
};

export type GamificationSeedRewardRedemptionRecord = {
  id: string;
  student_id: string;
  item_id: string;
  points_cost: number;
  status: RewardRedemptionStatus;
  requested_at: string;
  decided_at: string | null;
  fulfilled_at: string | null;
  decided_by?: string;
  teacher_note?: string;
};

export type GamificationSeedEventRecord = {
  id: string;
  student_id: string;
  xp: number;
  reward_points: number;
  source: GamificationEventSource;
  source_key: string;
  label_en: string;
  label_zh: string;
  status: GamificationEventStatus;
  anti_abuse_flags: string[];
  economy_version: string;
  created_at: string;
};

export type GamificationSeedRewardCampaignRecord = {
  id: string;
  teacher_id: string;
  class_id: string;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  status: RewardCampaignStatus;
  budget_points: number;
  awarded_points: number;
  quest_ids: string[];
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
};

export type GamificationDemoSeedOptions = {
  dayMs?: number;
  demoTeacherId?: string;
  demoUserId?: string;
  shouldSeedDemoUser?: () => boolean;
};

const defaultDayMs = 24 * 60 * 60 * 1000;

const canonicalRewardCatalogPointCosts = {
  "reward-plush-toy": 1200,
  "reward-pencil-set": 120,
  "reward-ball-pen": 350,
  "reward-eraser": 150,
  "reward-learning-kit": 900
} as const;

const validRewardCatalogCategories = new Set<RewardCatalogCategory>(["toy", "stationery", "learning-tool"]);
const validRewardPointReasons = new Set<RewardPointReason>([
  "lesson-complete",
  "practice-accuracy",
  "streak",
  "visualization-complete",
  "mistake-review",
  "teacher-award",
  "redemption-spent",
  "adventure-island-complete",
  "fishing-game-complete"
]);
const validGamificationEventSources = new Set<GamificationEventSource>([
  "lesson-complete",
  "practice-accuracy",
  "streak",
  "visualization-complete",
  "mistake-review",
  "teacher-award",
  "quest-complete",
  "campaign-bonus",
  "badge-earned",
  "adventure-island-complete",
  "fishing-game-complete"
]);
const validGamificationEventStatuses = new Set<GamificationEventStatus>(["awarded", "duplicate", "capped", "flagged"]);
const validRewardCampaignStatuses = new Set<RewardCampaignStatus>(["draft", "active", "paused", "ended"]);
const validRewardRedemptionStatuses = new Set<RewardRedemptionStatus>(["pending", "approved", "rejected", "fulfilled"]);

export function isValidRewardCatalogCategory(category: unknown): category is RewardCatalogCategory {
  return validRewardCatalogCategories.has(category as RewardCatalogCategory);
}

export function isValidRewardPointReason(reason: unknown): reason is RewardPointReason {
  return validRewardPointReasons.has(reason as RewardPointReason);
}

export function isValidGamificationEventSource(source: unknown): source is GamificationEventSource {
  return validGamificationEventSources.has(source as GamificationEventSource);
}

export function isValidGamificationEventStatus(status: unknown): status is GamificationEventStatus {
  return validGamificationEventStatuses.has(status as GamificationEventStatus);
}

export function isValidRewardCampaignStatus(status: unknown): status is RewardCampaignStatus {
  return validRewardCampaignStatuses.has(status as RewardCampaignStatus);
}

export function isValidRewardRedemptionStatus(status: unknown): status is RewardRedemptionStatus {
  return validRewardRedemptionStatuses.has(status as RewardRedemptionStatus);
}

export function normalizeRewardRedemptionStatus(status: unknown): RewardRedemptionStatus {
  return isValidRewardRedemptionStatus(status) ? status : "pending";
}

export function normalizeAdventureIslandSourceKey(sourceKey: unknown) {
  const cleanSourceKey = typeof sourceKey === "string" ? sourceKey.trim() : "";
  if (!cleanSourceKey) return cleanSourceKey;

  return cleanSourceKey
    .replace(/^bonus-game-complete:/, "adventure-island-complete:")
    .replace(/:quadratic:/, ":adventure-island:")
    .slice(0, 240);
}

export function normalizeRewardPointReason(reason: unknown): RewardPointReason {
  if (reason === "bonus-game-complete") return "adventure-island-complete";
  return isValidRewardPointReason(reason) ? reason : "teacher-award";
}

export function normalizeGamificationEventSource(source: unknown): GamificationEventSource {
  if (source === "bonus-game-complete") return "adventure-island-complete";
  return isValidGamificationEventSource(source) ? source : "teacher-award";
}

export function adventureIslandLedgerLabel(reason: RewardPointReason, fallbackEn: string, fallbackZh: string) {
  if (reason !== "adventure-island-complete") return { en: fallbackEn, zh: fallbackZh || fallbackEn };
  return {
    en: "Cleared the grade-level Adventure Island",
    zh: "完成年级探险岛"
  };
}

export function canonicalRewardCatalogPointCostFor(itemId: string) {
  return canonicalRewardCatalogPointCosts[itemId as keyof typeof canonicalRewardCatalogPointCosts] ?? null;
}

export function rewardCatalogPointCostsNeedSync(records: unknown) {
  if (!Array.isArray(records)) return false;

  return records.some((record) => {
    const item = record as Partial<Pick<GamificationSeedRewardCatalogRecord, "id" | "points_cost">>;
    const pointCost = typeof item.id === "string" ? canonicalRewardCatalogPointCostFor(item.id) : null;

    return pointCost !== null && item.points_cost !== pointCost;
  });
}

export type GamificationRewardCatalogNormalizationInput = {
  id: string;
  name_en: string;
  category?: unknown;
  points_cost?: unknown;
  available?: boolean | null;
  accent?: string | null;
  thumbnail_label?: string | null;
  sort_order?: unknown;
};

export type GamificationRewardCatalogCollectionRecord = Omit<
  GamificationSeedRewardCatalogRecord,
  "category" | "points_cost" | "available" | "accent" | "thumbnail_label" | "sort_order"
> & GamificationRewardCatalogNormalizationInput;

function mergeGamificationSeedRecordsPreservingExisting<T>(
  existingRecords: T[] | undefined,
  seedRecords: T[],
  keyFor: (record: T) => string
) {
  const existingByKey = new Map((existingRecords ?? []).map((record) => [keyFor(record), record]));
  const seedKeys = new Set(seedRecords.map(keyFor));
  const seedOrExistingRecords = seedRecords.map((record) => existingByKey.get(keyFor(record)) ?? record);
  const extraRecords = (existingRecords ?? []).filter((record) => !seedKeys.has(keyFor(record)));
  return [...seedOrExistingRecords, ...extraRecords];
}

export function normalizeRewardCatalogRecord<Record extends GamificationRewardCatalogNormalizationInput>(
  item: Record,
  index: number
): Record & {
  category: RewardCatalogCategory;
  points_cost: number;
  available: boolean;
  accent: string;
  thumbnail_label: string;
  sort_order: number;
} {
  return {
    ...item,
    category: isValidRewardCatalogCategory(item.category) ? item.category : "stationery",
    points_cost: canonicalRewardCatalogPointCostFor(item.id) ?? Math.max(1, Math.round(Number(item.points_cost) || 1)),
    available: item.available ?? true,
    accent: item.accent || "from-cyan-300 via-blue-400 to-violet-400",
    thumbnail_label: item.thumbnail_label || item.name_en.slice(0, 3),
    sort_order: typeof item.sort_order === "number" ? item.sort_order : index
  };
}

export function normalizeRewardCatalogRecords(
  records?: GamificationRewardCatalogCollectionRecord[]
): GamificationSeedRewardCatalogRecord[] {
  return mergeGamificationSeedRecordsPreservingExisting(
    records,
    seedRewardCatalogRecords(),
    (item) => item.id
  ).map((item, index) => normalizeRewardCatalogRecord(item, index));
}

export type GamificationRewardPointLedgerNormalizationInput = {
  id: string;
  amount?: unknown;
  reason?: unknown;
  label_en: string;
  label_zh: string;
  source_key?: unknown;
  created_at?: string | null;
};

export type GamificationRewardPointLedgerCollectionRecord = Omit<
  GamificationSeedRewardPointLedgerRecord,
  "amount" | "reason" | "source_key" | "created_at"
> & GamificationRewardPointLedgerNormalizationInput;

export function normalizeRewardPointLedgerRecord<Record extends GamificationRewardPointLedgerNormalizationInput>(
  entry: Record,
  { demoUserId, now }: { demoUserId?: string; now: string }
): Record & {
  amount: number;
  reason: RewardPointReason;
  label_en: string;
  label_zh: string;
  source_key: string;
  created_at: string;
} {
  const reason = normalizeRewardPointReason(entry.reason);
  const label = adventureIslandLedgerLabel(reason, entry.label_en, entry.label_zh);
  const sourceKeyEntry = {
    id: entry.id,
    source_key: typeof entry.source_key === "string" ? entry.source_key : undefined
  };

  return {
    ...entry,
    amount: Math.round(Number(entry.amount) || 0),
    reason,
    label_en: label.en,
    label_zh: label.zh,
    source_key: inferredRewardSourceKey(sourceKeyEntry, { demoUserId }),
    created_at: entry.created_at ?? now
  };
}

export function normalizeRewardPointLedgerRecords(
  records: GamificationRewardPointLedgerCollectionRecord[] | undefined,
  now: string,
  options: GamificationDemoSeedOptions = {}
): GamificationSeedRewardPointLedgerRecord[] {
  const { demoUserId } = demoSeedContext(options);
  return mergeGamificationSeedRecordsPreservingExisting(
    records,
    seedRewardPointLedgerRecords(now, options),
    (entry) => entry.id
  ).map((entry) => normalizeRewardPointLedgerRecord(entry, { demoUserId, now }));
}

export type GamificationRewardRedemptionNormalizationInput = {
  points_cost?: unknown;
  status?: unknown;
  requested_at?: string | null;
  decided_at?: string | null;
  fulfilled_at?: string | null;
};

export type GamificationRewardRedemptionCollectionRecord = Omit<
  GamificationSeedRewardRedemptionRecord,
  "points_cost" | "status" | "requested_at" | "decided_at" | "fulfilled_at"
> & GamificationRewardRedemptionNormalizationInput;

export function normalizeRewardRedemptionRecord<Record extends GamificationRewardRedemptionNormalizationInput>(
  redemption: Record,
  now: string
): Record & {
  points_cost: number;
  status: RewardRedemptionStatus;
  requested_at: string;
  decided_at: string | null;
  fulfilled_at: string | null;
} {
  return {
    ...redemption,
    points_cost: Math.max(1, Math.round(Number(redemption.points_cost) || 1)),
    status: normalizeRewardRedemptionStatus(redemption.status),
    requested_at: redemption.requested_at ?? now,
    decided_at: redemption.decided_at ?? null,
    fulfilled_at: redemption.fulfilled_at ?? null
  };
}

export function normalizeRewardRedemptionRecords(
  records: GamificationRewardRedemptionCollectionRecord[] | undefined,
  now: string,
  options: GamificationDemoSeedOptions = {}
): GamificationSeedRewardRedemptionRecord[] {
  return mergeGamificationSeedRecordsPreservingExisting<
    GamificationRewardRedemptionCollectionRecord | GamificationSeedRewardRedemptionRecord
  >(
    records,
    seedRewardRedemptionRecords(now, options),
    (redemption) => redemption.id
  ).map((redemption) => normalizeRewardRedemptionRecord(redemption, now));
}

export type GamificationEventNormalizationInput = {
  id: string;
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
};

export type GamificationEventCollectionRecord = Omit<
  GamificationSeedEventRecord,
  "xp" | "reward_points" | "source" | "source_key" | "status" | "anti_abuse_flags" | "economy_version" | "created_at"
> & GamificationEventNormalizationInput;

export function normalizeGamificationEventRecord<Record extends GamificationEventNormalizationInput>(
  event: Record,
  now: string
): Record & {
  xp: number;
  reward_points: number;
  source: GamificationEventSource;
  source_key: string;
  label_en: string;
  label_zh: string;
  status: GamificationEventStatus;
  anti_abuse_flags: string[];
  economy_version: string;
  created_at: string;
} {
  const source = normalizeGamificationEventSource(event.source);
  const label = adventureIslandLedgerLabel(
    source === "adventure-island-complete" ? "adventure-island-complete" : "teacher-award",
    event.label_en,
    event.label_zh
  );

  return {
    ...event,
    xp: Math.max(0, Math.round(Number(event.xp) || 0)),
    reward_points: Math.round(Number(event.reward_points) || 0),
    source,
    source_key: typeof event.source_key === "string" && event.source_key.trim() ? normalizeAdventureIslandSourceKey(event.source_key) : event.id,
    label_en: label.en,
    label_zh: label.zh,
    status: isValidGamificationEventStatus(event.status) ? event.status : "awarded",
    anti_abuse_flags: Array.isArray(event.anti_abuse_flags)
      ? event.anti_abuse_flags.filter((flag): flag is string => typeof flag === "string").slice(0, 8)
      : [],
    economy_version: event.economy_version || gamificationEconomyVersion,
    created_at: event.created_at ?? now
  };
}

export function normalizeGamificationEventRecords(
  records: GamificationEventCollectionRecord[] | undefined,
  rewardPointLedgerRecords: GamificationSeedRewardPointLedgerRecord[] | undefined,
  now: string,
  options: GamificationDemoSeedOptions = {}
): GamificationSeedEventRecord[] {
  const { demoUserId } = demoSeedContext(options);
  const existingRecords = records?.length
    ? records
    : gamificationEventsFromRewardLedger(rewardPointLedgerRecords ?? [], { demoUserId });

  return mergeGamificationSeedRecordsPreservingExisting<
    GamificationEventCollectionRecord | GamificationSeedEventRecord
  >(
    existingRecords,
    seedGamificationEventRecords(now, options),
    (event) => event.id
  ).map((event) => normalizeGamificationEventRecord(event, now));
}

export type GamificationRewardCampaignNormalizationInput = {
  status?: unknown;
  budget_points?: unknown;
  awarded_points?: unknown;
  quest_ids?: unknown;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type GamificationRewardCampaignCollectionRecord = Omit<
  GamificationSeedRewardCampaignRecord,
  "status" | "budget_points" | "awarded_points" | "quest_ids" | "starts_at" | "ends_at" | "created_at" | "updated_at"
> & GamificationRewardCampaignNormalizationInput;

export function normalizeRewardCampaignRecord<Record extends GamificationRewardCampaignNormalizationInput>(
  campaign: Record,
  now: string
): Record & {
  status: RewardCampaignStatus;
  budget_points: number;
  awarded_points: number;
  quest_ids: string[];
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
} {
  return {
    ...campaign,
    status: isValidRewardCampaignStatus(campaign.status) ? campaign.status : "draft",
    budget_points: Math.max(0, Math.round(Number(campaign.budget_points) || 0)),
    awarded_points: Math.max(0, Math.round(Number(campaign.awarded_points) || 0)),
    quest_ids: Array.isArray(campaign.quest_ids)
      ? campaign.quest_ids.filter((questId): questId is string => typeof questId === "string" && dailyQuestDefinitions.some((quest) => quest.id === questId))
      : [],
    starts_at: campaign.starts_at ?? now,
    ends_at: campaign.ends_at ?? now,
    created_at: campaign.created_at ?? now,
    updated_at: campaign.updated_at ?? campaign.created_at ?? now
  };
}

export function normalizeRewardCampaignRecords(
  records: GamificationRewardCampaignCollectionRecord[] | undefined,
  now: string,
  options: GamificationDemoSeedOptions = {}
): GamificationSeedRewardCampaignRecord[] {
  return mergeGamificationSeedRecordsPreservingExisting<
    GamificationRewardCampaignCollectionRecord | GamificationSeedRewardCampaignRecord
  >(
    records,
    seedRewardCampaignRecords(now, options),
    (campaign) => campaign.id
  ).map((campaign) => normalizeRewardCampaignRecord(campaign, now));
}

export function seedRewardCatalogRecords(): GamificationSeedRewardCatalogRecord[] {
  return [
    {
      id: "reward-plush-toy",
      name_en: "Math plush toy",
      name_zh: "數學毛公仔",
      description_en: "A small classroom plush for steady learning effort.",
      description_zh: "獎勵穩定學習投入的小型課室毛公仔。",
      category: "toy",
      points_cost: canonicalRewardCatalogPointCosts["reward-plush-toy"],
      available: true,
      accent: "from-pink-300 via-rose-400 to-orange-300",
      thumbnail_label: "Toy",
      sort_order: 10
    },
    {
      id: "reward-pencil-set",
      name_en: "Pencil set",
      name_zh: "鉛筆套裝",
      description_en: "Two pencils for showing working clearly.",
      description_zh: "兩支鉛筆，鼓勵清楚寫出演算步驟。",
      category: "stationery",
      points_cost: canonicalRewardCatalogPointCosts["reward-pencil-set"],
      available: true,
      accent: "from-amber-200 via-yellow-400 to-orange-400",
      thumbnail_label: "2B",
      sort_order: 20
    },
    {
      id: "reward-ball-pen",
      name_en: "Ball pen",
      name_zh: "原子筆",
      description_en: "A smooth pen for corrections and lesson notes.",
      description_zh: "順滑原子筆，用於改正和課堂筆記。",
      category: "stationery",
      points_cost: canonicalRewardCatalogPointCosts["reward-ball-pen"],
      available: true,
      accent: "from-sky-300 via-cyan-400 to-teal-300",
      thumbnail_label: "Pen",
      sort_order: 30
    },
    {
      id: "reward-eraser",
      name_en: "Eraser",
      name_zh: "橡皮擦",
      description_en: "A reminder that revising mistakes is part of mastery.",
      description_zh: "提醒學生改正錯題也是掌握的一部分。",
      category: "stationery",
      points_cost: canonicalRewardCatalogPointCosts["reward-eraser"],
      available: true,
      accent: "from-slate-200 via-white to-cyan-200",
      thumbnail_label: "Erase",
      sort_order: 40
    },
    {
      id: "reward-learning-kit",
      name_en: "Learning stationery kit",
      name_zh: "學習文具套裝",
      description_en: "Notebook, ruler, and sticky notes for revision planning.",
      description_zh: "筆記簿、間尺和便條紙，支援溫習規劃。",
      category: "learning-tool",
      points_cost: canonicalRewardCatalogPointCosts["reward-learning-kit"],
      available: true,
      accent: "from-emerald-300 via-cyan-400 to-blue-400",
      thumbnail_label: "Kit",
      sort_order: 50
    }
  ];
}

export function gamificationSourceForRewardReason(reason: RewardPointReason): GamificationEventSource | null {
  if (reason === "redemption-spent") return null;
  return reason;
}

export function inferredRewardSourceKey(
  entry: Pick<GamificationSeedRewardPointLedgerRecord, "id" | "source_key">,
  { demoUserId = "student-peter" }: { demoUserId?: string } = {}
) {
  const existingSourceKey = typeof entry.source_key === "string" ? entry.source_key.trim() : "";
  if (existingSourceKey) return normalizeAdventureIslandSourceKey(existingSourceKey);

  const demoSourceKeys: Record<string, string> = {
    "reward-ledger-peter-lesson-complete": `lesson-complete:${demoUserId}:quadratic-functions`,
    "reward-ledger-peter-practice-accuracy": `practice-accuracy:${demoUserId}:quadratic-patterns:seed`,
    "reward-ledger-peter-streak": `streak:${demoUserId}:3-day`,
    "reward-ledger-peter-visualization": `visualization-complete:${demoUserId}:function-graph`,
    "reward-ledger-peter-mistake-review": `mistake-review:${demoUserId}:seed`
  };

  return normalizeAdventureIslandSourceKey(demoSourceKeys[entry.id]);
}

export function gamificationEventRecordFromRewardLedger(
  entry: GamificationSeedRewardPointLedgerRecord,
  options: { demoUserId?: string } = {}
): GamificationSeedEventRecord | null {
  const reason = normalizeRewardPointReason(entry.reason);
  const source = gamificationSourceForRewardReason(reason);
  if (!source || entry.amount <= 0) return null;
  const reward = gamificationRewardForSource(source, entry.amount);

  return {
    id: `gamification-event-${entry.id.replace(/^reward-ledger-/, "")}`,
    student_id: entry.student_id,
    xp: reward.xp,
    reward_points: Math.max(0, entry.amount),
    source,
    source_key: entry.source_key ?? inferredRewardSourceKey(entry, options),
    label_en: entry.label_en,
    label_zh: entry.label_zh,
    status: "awarded",
    anti_abuse_flags: [],
    economy_version: gamificationEconomyVersion,
    created_at: entry.created_at
  };
}

export function gamificationEventsFromRewardLedger(
  records: GamificationSeedRewardPointLedgerRecord[],
  options: { demoUserId?: string } = {}
) {
  return records
    .map((entry) => gamificationEventRecordFromRewardLedger(entry, options))
    .filter((entry): entry is GamificationSeedEventRecord => Boolean(entry));
}

function demoSeedContext(options: GamificationDemoSeedOptions = {}) {
  return {
    dayMs: options.dayMs ?? defaultDayMs,
    demoTeacherId: options.demoTeacherId ?? "teacher-ms-chan",
    demoUserId: options.demoUserId ?? "student-peter",
    shouldSeedDemoUser: options.shouldSeedDemoUser ?? (() => true)
  };
}

export function seedRewardPointLedgerRecords(
  now: string,
  options: GamificationDemoSeedOptions = {}
): GamificationSeedRewardPointLedgerRecord[] {
  const { dayMs, demoTeacherId, demoUserId, shouldSeedDemoUser } = demoSeedContext(options);
  if (!shouldSeedDemoUser()) return [];
  const nowMs = Date.parse(now);

  return [
    {
      id: "reward-ledger-peter-lesson-complete",
      student_id: demoUserId,
      amount: 40,
      reason: "lesson-complete",
      label_en: "Completed quadratic functions lesson",
      label_zh: "完成二次函數課節",
      source_key: `lesson-complete:${demoUserId}:quadratic-functions`,
      created_at: new Date(nowMs - 6 * dayMs).toISOString()
    },
    {
      id: "reward-ledger-peter-practice-accuracy",
      student_id: demoUserId,
      amount: 30,
      reason: "practice-accuracy",
      label_en: "Strong Practice Arena accuracy",
      label_zh: "練習場準確率表現良好",
      source_key: `practice-accuracy:${demoUserId}:quadratic-patterns:seed`,
      created_at: new Date(nowMs - 5 * dayMs).toISOString()
    },
    {
      id: "reward-ledger-peter-streak",
      student_id: demoUserId,
      amount: 25,
      reason: "streak",
      label_en: "Three-day learning streak",
      label_zh: "連續三日學習",
      source_key: `streak:${demoUserId}:3-day`,
      created_at: new Date(nowMs - 4 * dayMs).toISOString()
    },
    {
      id: "reward-ledger-peter-visualization",
      student_id: demoUserId,
      amount: 20,
      reason: "visualization-complete",
      label_en: "Explored the function graph visualization",
      label_zh: "完成函數圖像視覺化探索",
      source_key: `visualization-complete:${demoUserId}:function-graph`,
      created_at: new Date(nowMs - 3 * dayMs).toISOString()
    },
    {
      id: "reward-ledger-peter-mistake-review",
      student_id: demoUserId,
      amount: 15,
      reason: "mistake-review",
      label_en: "Reviewed mistake-book items",
      label_zh: "重溫錯題簿項目",
      source_key: `mistake-review:${demoUserId}:seed`,
      created_at: new Date(nowMs - 2 * dayMs).toISOString()
    },
    {
      id: "reward-ledger-peter-teacher-effort",
      student_id: demoUserId,
      amount: 50,
      reason: "teacher-award",
      label_en: "Teacher bonus: Great effort",
      label_zh: "教師獎勵：努力學習",
      note: "Kept improving the explanation after feedback.",
      awarded_by: demoTeacherId,
      created_at: new Date(nowMs - dayMs).toISOString()
    },
    {
      id: "reward-ledger-peter-fulfilled-ball-pen",
      student_id: demoUserId,
      amount: -35,
      reason: "redemption-spent",
      label_en: "Redeemed ball pen",
      label_zh: "兌換原子筆",
      redemption_id: "reward-redemption-peter-ball-pen",
      created_at: new Date(nowMs - 12 * 60 * 60 * 1000).toISOString()
    }
  ];
}

export function seedRewardRedemptionRecords(
  now: string,
  options: GamificationDemoSeedOptions = {}
): GamificationSeedRewardRedemptionRecord[] {
  const { dayMs, demoTeacherId, demoUserId, shouldSeedDemoUser } = demoSeedContext(options);
  if (!shouldSeedDemoUser()) return [];
  const nowMs = Date.parse(now);

  return [
    {
      id: "reward-redemption-peter-ball-pen",
      student_id: demoUserId,
      item_id: "reward-ball-pen",
      points_cost: 35,
      status: "fulfilled",
      requested_at: new Date(nowMs - 2 * dayMs).toISOString(),
      decided_at: new Date(nowMs - dayMs).toISOString(),
      fulfilled_at: new Date(nowMs - 12 * 60 * 60 * 1000).toISOString(),
      decided_by: demoTeacherId,
      teacher_note: "Handed to HK Student Peter after class."
    },
    {
      id: "reward-redemption-peter-eraser",
      student_id: demoUserId,
      item_id: "reward-eraser",
      points_cost: 15,
      status: "pending",
      requested_at: new Date(nowMs - 4 * 60 * 60 * 1000).toISOString(),
      decided_at: null,
      fulfilled_at: null
    }
  ];
}

export function seedGamificationEventRecords(
  now: string,
  options: GamificationDemoSeedOptions = {}
) {
  const { demoUserId } = demoSeedContext(options);
  return gamificationEventsFromRewardLedger(seedRewardPointLedgerRecords(now, options), { demoUserId });
}

export function seedRewardCampaignRecords(
  now: string,
  options: GamificationDemoSeedOptions = {}
): GamificationSeedRewardCampaignRecord[] {
  const { dayMs, demoTeacherId, shouldSeedDemoUser } = demoSeedContext(options);
  if (!shouldSeedDemoUser()) return [];
  const nowMs = Date.parse(now);

  return [
    {
      id: "campaign-s3a-steady-week",
      teacher_id: demoTeacherId,
      class_id: "class-s3a-2026",
      title_en: "Steady Week Challenge",
      title_zh: "穩定學習週挑戰",
      description_en: "Reward students for careful practice, mistake repair, and lesson completion across the week.",
      description_zh: "獎勵學生一週內保持細心練習、修正錯題和完成課節。",
      status: "active",
      budget_points: 900,
      awarded_points: 130,
      quest_ids: ["daily-correct-answers", "daily-lesson-step", "daily-repair"],
      starts_at: new Date(nowMs - 2 * dayMs).toISOString(),
      ends_at: new Date(nowMs + 5 * dayMs).toISOString(),
      created_at: new Date(nowMs - 2 * dayMs).toISOString(),
      updated_at: now
    }
  ];
}
