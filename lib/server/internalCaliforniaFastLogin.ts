import type {
  CurriculumProfile,
  CurriculumTrack,
  GradeId,
  Language,
  StudentAvatarId,
  StudentSession,
  ThemeMode
} from "@/types";

type InternalCaliforniaFastLoginInput = {
  username: string;
  password: string;
  grade?: unknown;
  curriculumTrack?: unknown;
  curriculumProfile?: unknown;
  language?: unknown;
  theme?: unknown;
};

type InternalCaliforniaFastLoginSession = {
  user: StudentSession;
  settings: {
    language: Language;
    theme: ThemeMode;
    selectedGrade: GradeId;
  };
  lessonEntryTarget: null;
};

type InternalCaliforniaFastLoginResult =
  | { status: "authenticated"; session: InternalCaliforniaFastLoginSession }
  | { status: "invalid" };

type InternalCaliforniaSeed = {
  id: string;
  username: string;
  email: string;
  role: StudentSession["role"];
  grade: GradeId;
  curriculumTrack: CurriculumTrack;
  curriculumProfile: CurriculumProfile;
  language: Language;
  avatarId: StudentAvatarId;
  allowRequestedGrade?: boolean;
};

const displayedDemoPassword = "12345";
const californiaProfile: CurriculumProfile = { region: "US", publisher: "US_CA_MATH" };
const californiaTrack: CurriculumTrack = "US_CA_MATH";
const validGrades = new Set<GradeId>(["K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"]);
const validLanguages = new Set<Language>(["en", "zh", "zh-Hans"]);
const validThemes = new Set<ThemeMode>(["dark", "light"]);
const internalCaliforniaSeeds: InternalCaliforniaSeed[] = [
  {
    id: "student-shirleen-us",
    username: "Student Shirleen",
    email: "student.shirleen@example.edu",
    role: "student",
    grade: "P1",
    curriculumTrack: californiaTrack,
    curriculumProfile: californiaProfile,
    language: "en",
    avatarId: "pi"
  },
  {
    id: "teacher-scott-us",
    username: "Teacher Scott",
    email: "teacher.scott@example.edu",
    role: "teacher",
    grade: "P1",
    curriculumTrack: californiaTrack,
    curriculumProfile: californiaProfile,
    language: "en",
    avatarId: "sigma"
  },
  {
    id: "student-li-mainland",
    username: "Student Peter",
    email: "student.ludwig@example.edu.cn",
    role: "student",
    grade: "S4",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
    language: "zh-Hans",
    avatarId: "delta"
  },
  {
    id: "teacher-mainland-phoebe",
    username: "Teacher Phoebe",
    email: "teacher.phoebe@example.edu.cn",
    role: "teacher",
    grade: "S4",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
    language: "zh-Hans",
    avatarId: "sigma"
  },
  {
    id: "student-peter",
    username: "HK Student Peter",
    email: "student.peter@example.edu.hk",
    role: "student",
    grade: "S4",
    curriculumTrack: "HK",
    curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
    language: "en",
    avatarId: "delta"
  },
  {
    id: "teacher-ms-chan",
    username: "HK Teacher Chan",
    email: "teacher.chan@example.edu.hk",
    role: "teacher",
    grade: "S4",
    curriculumTrack: "HK",
    curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
    language: "en",
    avatarId: "sigma"
  },
  {
    id: "student-jon-us-ca-super",
    username: "Student Jon",
    email: "student.jon.internal@example.edu",
    role: "student",
    grade: "P1",
    curriculumTrack: californiaTrack,
    curriculumProfile: californiaProfile,
    language: "en",
    allowRequestedGrade: true,
    avatarId: "pi"
  },
  {
    id: "teacher-rhi-us-ca-super",
    username: "Teacher Rhi",
    email: "teacher.rhi.internal@example.edu",
    role: "teacher",
    grade: "P1",
    curriculumTrack: californiaTrack,
    curriculumProfile: californiaProfile,
    language: "en",
    allowRequestedGrade: true,
    avatarId: "sigma"
  }
];

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function profileFromInput(value: unknown): CurriculumProfile | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<CurriculumProfile>;
  return typeof record.region === "string" && typeof record.publisher === "string"
    ? { region: record.region as CurriculumProfile["region"], publisher: record.publisher as CurriculumProfile["publisher"] }
    : null;
}

function requestedCurriculumTrack(value: unknown): CurriculumTrack | null {
  return typeof value === "string" ? (value as CurriculumTrack) : null;
}

function profilesEqual(left: CurriculumProfile, right: CurriculumProfile) {
  return left.region === right.region && left.publisher === right.publisher;
}

function seedMatchesRequestedCurriculum(seed: InternalCaliforniaSeed, profile: CurriculumProfile | null, track: CurriculumTrack | null) {
  if (profile) return profilesEqual(seed.curriculumProfile, profile);
  if (track) return seed.curriculumTrack === track;
  return true;
}

function matchingInternalCaliforniaSeed({
  username,
  grade,
  curriculumTrack,
  curriculumProfile
}: {
  username: string;
  grade?: unknown;
  curriculumTrack?: unknown;
  curriculumProfile?: unknown;
}) {
  const normalized = normalizeIdentifier(username);
  const normalizedEmail = isLikelyEmail(username) ? normalizeIdentifier(username) : "";
  const matchingSeeds = internalCaliforniaSeeds.filter((seed) =>
    normalizeIdentifier(seed.username) === normalized ||
    normalizeIdentifier(seed.email) === normalized ||
    (normalizedEmail && normalizeIdentifier(seed.email) === normalizedEmail)
  );
  if (matchingSeeds.length <= 1) return matchingSeeds[0] ?? null;

  const profile = profileFromInput(curriculumProfile);
  const track = requestedCurriculumTrack(curriculumTrack);
  const curriculumMatches = matchingSeeds.filter((seed) => seedMatchesRequestedCurriculum(seed, profile, track));
  if (curriculumMatches.length === 1) return curriculumMatches[0];

  if (typeof grade === "string" && validGrades.has(grade as GradeId)) {
    const gradeMatches = curriculumMatches.filter((seed) => seed.grade === grade);
    if (gradeMatches.length === 1) return gradeMatches[0];
  }

  return null;
}

function requestedGrade(value: unknown, fallback: GradeId) {
  return typeof value === "string" && validGrades.has(value as GradeId) ? (value as GradeId) : fallback;
}

function requestedLanguage(value: unknown, fallback: Language) {
  return typeof value === "string" && validLanguages.has(value as Language) ? (value as Language) : fallback;
}

function requestedTheme(value: unknown, fallback: ThemeMode) {
  return typeof value === "string" && validThemes.has(value as ThemeMode) ? (value as ThemeMode) : fallback;
}

function buildSeedSession(seed: InternalCaliforniaSeed, settings: { language: Language; theme: ThemeMode; selectedGrade: GradeId }): InternalCaliforniaFastLoginSession {
  return {
    user: {
      id: seed.id,
      name: seed.username,
      username: seed.username,
      email: seed.email,
      passwordMustChange: false,
      avatarId: seed.avatarId,
      grade: seed.grade,
      curriculumTrack: seed.curriculumTrack,
      curriculumProfile: seed.curriculumProfile,
      role: seed.role
    },
    settings,
    lessonEntryTarget: null
  };
}

export async function authenticateInternalCaliforniaFastLogin({
  username,
  password,
  grade,
  curriculumTrack,
  curriculumProfile,
  language,
  theme
}: InternalCaliforniaFastLoginInput): Promise<InternalCaliforniaFastLoginResult | null> {
  const seed = matchingInternalCaliforniaSeed({ username, grade, curriculumTrack, curriculumProfile });
  if (!seed) return null;
  if (password !== displayedDemoPassword) return { status: "invalid" };
  const fallbackSettings = {
    language: requestedLanguage(language, seed.language),
    theme: requestedTheme(theme, "dark"),
    selectedGrade: seed.allowRequestedGrade ? requestedGrade(grade, seed.grade) : seed.grade
  };
  return { status: "authenticated", session: buildSeedSession(seed, fallbackSettings) };
}
