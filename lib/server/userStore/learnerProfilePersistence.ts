import type {
  LearnerProfile,
  LearnerProfileChallengeStart,
  LearnerProfileGoal,
  LearnerProfileHelpStyle,
  LearnerProfileOnboardingStatus,
  LearnerStartSetupAnswers,
  StudentSession
} from "@/types";

type UserRole = StudentSession["role"];

const learnerStartSetupVersion = "learner-start-v1" as const;

export type LearnerProfileRecord = {
  user_id: string;
  questionnaire_version: LearnerProfile["questionnaireVersion"];
  status: LearnerProfileOnboardingStatus;
  answers?: LearnerStartSetupAnswers;
  initialized_from: LearnerProfile["initializedFrom"];
  completed_at?: string;
  skipped_at?: string;
  updated_at: string;
};

export type LearnerProfilePersistenceDatabase = {
  learner_profiles: LearnerProfileRecord[];
  users: Array<{
    id: string;
    role: UserRole;
  }>;
};

export type LearnerProfilePersistenceStoreDependencies = {
  now?: () => Date;
  readDatabase: () => Promise<LearnerProfilePersistenceDatabase>;
  mutateDatabase: <T>(mutator: (database: LearnerProfilePersistenceDatabase) => T | Promise<T>) => Promise<T>;
};

export type LearnerProfilePersistenceStore = ReturnType<typeof createLearnerProfilePersistenceStore>;

const validLearnerGoals = new Set<LearnerProfileGoal>(["repair", "homework", "preview", "exam"]);
const validLearnerChallengeStarts = new Set<LearnerProfileChallengeStart>(["easy", "balanced", "hard"]);
const validLearnerHelpStyles = new Set<LearnerProfileHelpStyle>(["hint", "steps", "example", "method"]);
const validLearnerProfileStatuses = new Set<LearnerProfileOnboardingStatus>(["not-started", "completed", "skipped"]);

function defaultLearnerProfile(userId: string, now: string): LearnerProfile {
  return {
    userId,
    questionnaireVersion: learnerStartSetupVersion,
    status: "not-started",
    initializedFrom: "login-onboarding",
    updatedAt: now
  };
}

function toLearnerProfile(record: LearnerProfileRecord): LearnerProfile {
  return {
    userId: record.user_id,
    questionnaireVersion: record.questionnaire_version,
    status: record.status,
    ...(record.answers ? { answers: record.answers } : {}),
    initializedFrom: record.initialized_from,
    ...(record.completed_at ? { completedAt: record.completed_at } : {}),
    ...(record.skipped_at ? { skippedAt: record.skipped_at } : {}),
    updatedAt: record.updated_at
  };
}

export function normalizeLearnerStartSetupAnswers(value: unknown): LearnerStartSetupAnswers | undefined {
  if (!value || typeof value !== "object") return undefined;

  const record = value as Partial<LearnerStartSetupAnswers>;
  if (!validLearnerGoals.has(record.goal as LearnerProfileGoal)) return undefined;
  if (!validLearnerChallengeStarts.has(record.challenge as LearnerProfileChallengeStart)) return undefined;
  if (!validLearnerHelpStyles.has(record.help as LearnerProfileHelpStyle)) return undefined;

  return {
    goal: record.goal as LearnerProfileGoal,
    challenge: record.challenge as LearnerProfileChallengeStart,
    help: record.help as LearnerProfileHelpStyle
  };
}

export function normalizeLearnerProfileStatus(status: unknown): LearnerProfileOnboardingStatus {
  return validLearnerProfileStatuses.has(status as LearnerProfileOnboardingStatus)
    ? status as LearnerProfileOnboardingStatus
    : "not-started";
}

export function normalizeLearnerProfileRecord(
  record: Partial<LearnerProfileRecord>,
  now: string
): LearnerProfileRecord | null {
  if (typeof record.user_id !== "string" || !record.user_id.trim()) return null;

  const answers = normalizeLearnerStartSetupAnswers(record.answers);
  const requestedStatus = normalizeLearnerProfileStatus(record.status);
  const status = requestedStatus === "completed" && !answers ? "not-started" : requestedStatus;

  return {
    user_id: record.user_id,
    questionnaire_version: learnerStartSetupVersion,
    status,
    ...(answers ? { answers } : {}),
    initialized_from: "login-onboarding",
    ...(typeof record.completed_at === "string" && status === "completed" ? { completed_at: record.completed_at } : {}),
    ...(typeof record.skipped_at === "string" && status === "skipped" ? { skipped_at: record.skipped_at } : {}),
    updated_at: typeof record.updated_at === "string" ? record.updated_at : now
  };
}

function learnerProfileRecordFor(
  userId: string,
  status: Exclude<LearnerProfileOnboardingStatus, "not-started">,
  answers: LearnerStartSetupAnswers | undefined,
  now: string
): LearnerProfileRecord {
  return {
    user_id: userId,
    questionnaire_version: learnerStartSetupVersion,
    status,
    ...(answers ? { answers } : {}),
    initialized_from: "login-onboarding",
    ...(status === "completed" ? { completed_at: now } : {}),
    ...(status === "skipped" ? { skipped_at: now } : {}),
    updated_at: now
  };
}

export function createLearnerProfilePersistenceStore({
  mutateDatabase,
  now: currentTime = () => new Date(),
  readDatabase
}: LearnerProfilePersistenceStoreDependencies) {
  return {
    async getLearnerProfile(userId: string) {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (user?.role !== "student") return null;

      const profileRecord = database.learner_profiles.find((candidate) =>
        candidate.user_id === userId && candidate.questionnaire_version === learnerStartSetupVersion
      );

      return profileRecord ? toLearnerProfile(profileRecord) : defaultLearnerProfile(userId, currentTime().toISOString());
    },

    async updateLearnerProfile(
      userId: string,
      patch: {
        status: Exclude<LearnerProfileOnboardingStatus, "not-started">;
        answers?: LearnerStartSetupAnswers;
      }
    ) {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === userId);
        if (user?.role !== "student") return null;
        if (patch.status !== "completed" && patch.status !== "skipped") return null;

        const answers = normalizeLearnerStartSetupAnswers(patch.answers);
        if (patch.status === "completed" && !answers) return null;

        const now = currentTime().toISOString();
        const nextProfileRecord = learnerProfileRecordFor(userId, patch.status, answers, now);
        const existingIndex = database.learner_profiles.findIndex((candidate) =>
          candidate.user_id === userId && candidate.questionnaire_version === learnerStartSetupVersion
        );

        if (existingIndex >= 0) {
          database.learner_profiles[existingIndex] = nextProfileRecord;
        } else {
          database.learner_profiles.push(nextProfileRecord);
        }

        return toLearnerProfile(nextProfileRecord);
      });
    }
  };
}
