import { gamificationEconomyVersion } from "@/data/gamification";
import { gamificationRewardForSource } from "@/lib/gamification";

export type HotPracticeAccuracyReward = {
  id: string;
  student_id: string;
  amount: number;
  reason: "practice-accuracy";
  label_en: string;
  label_zh: string;
  source_key: string;
  created_at: string;
};

type RewardLedgerLike = {
  source_key?: string;
};

type GamificationEventLike = {
  id?: string;
  student_id?: string;
  xp?: number;
  reward_points?: number;
  source?: string;
  source_key?: string;
  label_en?: string;
  label_zh?: string;
  status?: string;
  anti_abuse_flags?: string[];
  economy_version?: string;
  created_at?: string;
};

export type PracticeAccuracyRewardOverlayDatabase = {
  reward_point_ledger: RewardLedgerLike[];
  gamification_events: GamificationEventLike[];
};

export function overlayHotPracticeAccuracyRewards(
  database: PracticeAccuracyRewardOverlayDatabase,
  rows: readonly HotPracticeAccuracyReward[]
) {
  const ledgerSourceKeys = new Set(database.reward_point_ledger.map((entry) => entry.source_key));
  const eventSourceKeys = new Set(database.gamification_events.map((entry) => entry.source_key));
  const reward = gamificationRewardForSource("practice-accuracy");
  let insertedLedgerRows = 0;

  for (const row of rows) {
    if (!ledgerSourceKeys.has(row.source_key)) {
      database.reward_point_ledger.push(row);
      ledgerSourceKeys.add(row.source_key);
      insertedLedgerRows += 1;
    }
    if (!eventSourceKeys.has(row.source_key)) {
      database.gamification_events.push({
        id: `gamification-event-hot-${row.id}`,
        student_id: row.student_id,
        xp: reward.xp,
        reward_points: row.amount,
        source: "practice-accuracy",
        source_key: row.source_key,
        label_en: row.label_en,
        label_zh: row.label_zh,
        status: "awarded",
        anti_abuse_flags: [],
        economy_version: gamificationEconomyVersion,
        created_at: row.created_at
      });
      eventSourceKeys.add(row.source_key);
    }
  }

  return insertedLedgerRows;
}
