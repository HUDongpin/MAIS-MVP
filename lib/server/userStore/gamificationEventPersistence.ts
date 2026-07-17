import { gamificationEconomyVersion } from "@/data/gamification";
import { evaluateAntiAbuseEvent, gamificationRewardForSource } from "@/lib/gamification";
import type {
  AntiAbuseDecision,
  GamificationEvent,
  GamificationEventSource,
  GamificationEventStatus,
  LocalizedText
} from "@/types";

export type GamificationEventPersistenceRecord = {
  id?: string;
  student_id: string;
  xp?: number;
  reward_points?: number;
  source: GamificationEventSource | string;
  source_key: string;
  label_en?: string;
  label_zh?: string;
  status: GamificationEventStatus | string;
  anti_abuse_flags?: string[];
  economy_version?: string;
  campaign_id?: string;
  created_at: string;
};

export type GamificationEventPersistenceDatabase = {
  gamification_events?: GamificationEventPersistenceRecord[];
};

export function createGamificationRecordId(prefix: string, createId: () => string) {
  const id = createId();
  return id.startsWith(`${prefix}-`) ? id : `${prefix}-${id}`;
}

export function toGamificationEvent(record: GamificationEventPersistenceRecord): GamificationEvent {
  return {
    id: record.id ?? record.source_key,
    studentId: record.student_id,
    xp: record.xp ?? 0,
    rewardPoints: record.reward_points ?? 0,
    source: record.source as GamificationEventSource,
    sourceKey: record.source_key,
    label: {
      en: record.label_en ?? record.source_key,
      zh: record.label_zh ?? record.source_key
    },
    status: record.status as GamificationEventStatus,
    antiAbuseFlags: record.anti_abuse_flags ?? [],
    economyVersion: record.economy_version ?? gamificationEconomyVersion,
    campaignId: record.campaign_id,
    createdAt: record.created_at
  };
}

export function gamificationEventsForStudent(
  database: GamificationEventPersistenceDatabase,
  studentId: string
) {
  return (database.gamification_events ?? [])
    .filter((event) => event.student_id === studentId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(toGamificationEvent);
}

export function recordGamificationEventOnce(
  database: GamificationEventPersistenceDatabase,
  createId: () => string,
  {
    studentId,
    source,
    sourceKey,
    label,
    rewardPoints,
    campaignId,
    createdAt
  }: {
    studentId: string;
    source: GamificationEventSource;
    sourceKey: string;
    label: LocalizedText;
    rewardPoints?: number;
    campaignId?: string;
    createdAt: string;
  }
): AntiAbuseDecision {
  const reward = gamificationRewardForSource(source, rewardPoints);
  const decision = evaluateAntiAbuseEvent({
    source,
    sourceKey,
    requestedXp: reward.xp,
    requestedRewardPoints: reward.rewardPoints,
    existingEvents: gamificationEventsForStudent(database, studentId),
    now: createdAt
  });

  database.gamification_events ??= [];

  if (!decision.allowed) {
    if (decision.status !== "duplicate") {
      const cappedEvent: GamificationEventPersistenceRecord = {
        id: createGamificationRecordId("gamification-event", createId),
        student_id: studentId,
        xp: 0,
        reward_points: 0,
        source,
        source_key: sourceKey,
        label_en: label.en,
        label_zh: label.zh,
        status: decision.status,
        anti_abuse_flags: decision.flags,
        economy_version: gamificationEconomyVersion,
        created_at: createdAt
      };
      if (campaignId) cappedEvent.campaign_id = campaignId;
      database.gamification_events.unshift(cappedEvent);
    }
    return decision;
  }

  const event: GamificationEventPersistenceRecord = {
    id: createGamificationRecordId("gamification-event", createId),
    student_id: studentId,
    xp: decision.appliedXp,
    reward_points: decision.appliedRewardPoints,
    source,
    source_key: sourceKey.trim().replace(/\s+/g, "-").slice(0, 240),
    label_en: label.en,
    label_zh: label.zh,
    status: decision.status,
    anti_abuse_flags: decision.flags,
    economy_version: gamificationEconomyVersion,
    created_at: createdAt
  };
  if (campaignId) event.campaign_id = campaignId;
  database.gamification_events.unshift(event);

  return decision;
}
