import type {
  CurriculumProfile,
  CurriculumRegion,
  CurriculumTrack,
  LocalizedText,
  TextbookPublisher
} from "@/types";

export const curriculumRegions = ["MAINLAND", "US", "HK"] as const satisfies CurriculumRegion[];
export const textbookPublishers = [
  "HK_UNITED_PRIME_MIA",
  "HK_EPH_MIF",
  "MAINLAND_PEP",
  "MAINLAND_BNU",
  "MAINLAND_HJB",
  "US_CA_MATH",
  "US_NC_MATH"
] as const satisfies TextbookPublisher[];

export const defaultHongKongCurriculumProfile: CurriculumProfile = {
  region: "HK",
  publisher: "HK_UNITED_PRIME_MIA"
};

export const defaultMainlandCurriculumProfile: CurriculumProfile = {
  region: "MAINLAND",
  publisher: "MAINLAND_PEP"
};

export const defaultUnitedStatesCurriculumProfile: CurriculumProfile = {
  region: "US",
  publisher: "US_CA_MATH"
};

export const defaultCurriculumProfile = defaultHongKongCurriculumProfile;

const publisherRegion: Record<TextbookPublisher, CurriculumRegion> = {
  HK_UNITED_PRIME_MIA: "HK",
  HK_EPH_MIF: "HK",
  MAINLAND_PEP: "MAINLAND",
  MAINLAND_BNU: "MAINLAND",
  MAINLAND_HJB: "MAINLAND",
  US_CA_MATH: "US",
  US_NC_MATH: "US"
};

export const publisherLabels: Record<TextbookPublisher, LocalizedText> = {
  HK_UNITED_PRIME_MIA: {
    en: "DSE UP",
    zh: "DSE UP",
    zhHans: "DSE UP"
  },
  HK_EPH_MIF: {
    en: "DSE EPH",
    zh: "DSE EPH",
    zhHans: "DSE EPH"
  },
  MAINLAND_PEP: {
    en: "PEP Mathematics",
    zh: "人教版數學",
    zhHans: "人教版数学"
  },
  MAINLAND_BNU: {
    en: "BNUP Mathematics",
    zh: "北師大版數學",
    zhHans: "北师大版数学"
  },
  MAINLAND_HJB: {
    en: "HJB Mathematics",
    zh: "滬教版數學",
    zhHans: "沪教版数学"
  },
  US_CA_MATH: {
    en: "California Curriculum",
    zh: "加州課程",
    zhHans: "加州课程"
  },
  US_NC_MATH: {
    en: "North Carolina Curriculum",
    zh: "北卡課程",
    zhHans: "北卡课程"
  }
};

export const regionLabels: Record<CurriculumRegion, LocalizedText> = {
  HK: { en: "Hong Kong Curriculum", zh: "香港課程", zhHans: "香港课程" },
  MAINLAND: { en: "Mainland Curriculum", zh: "內地課程", zhHans: "内地课程" },
  US: { en: "U.S. Curriculum", zh: "美國課程", zhHans: "美国课程" }
};

export function isCurriculumRegion(value: unknown): value is CurriculumRegion {
  return value === "HK" || value === "MAINLAND" || value === "US";
}

export function isTextbookPublisher(value: unknown): value is TextbookPublisher {
  return textbookPublishers.includes(value as TextbookPublisher);
}

export function publisherForRegion(region: CurriculumRegion): TextbookPublisher {
  if (region === "MAINLAND") return "MAINLAND_PEP";
  if (region === "US") return "US_CA_MATH";
  return "HK_UNITED_PRIME_MIA";
}

export function curriculumProfileForPublisher(publisher: TextbookPublisher): CurriculumProfile {
  return {
    region: publisherRegion[publisher],
    publisher
  };
}

export function curriculumProfileForTrack(track?: CurriculumTrack | null): CurriculumProfile {
  if (track === "MAINLAND_PEP_HIGH") return defaultMainlandCurriculumProfile;
  if (track === "US_CA_MATH") return defaultUnitedStatesCurriculumProfile;
  if (track === "US_NC_MATH") return { region: "US", publisher: "US_NC_MATH" };
  return defaultHongKongCurriculumProfile;
}

export function curriculumTrackForProfile(profile?: CurriculumProfile | null): CurriculumTrack {
  if (profile?.publisher === "US_CA_MATH") return "US_CA_MATH";
  if (profile?.publisher === "US_NC_MATH") return "US_NC_MATH";
  if (profile?.region === "MAINLAND") return "MAINLAND_PEP_HIGH";
  return "HK";
}

export function normalizeCurriculumProfile(value: unknown, fallback: CurriculumProfile = defaultCurriculumProfile): CurriculumProfile {
  const record = value as Partial<CurriculumProfile> | null;
  const publisher = record && isTextbookPublisher(record.publisher) ? record.publisher : null;
  if (publisher) return curriculumProfileForPublisher(publisher);

  const region = record && isCurriculumRegion(record.region) ? record.region : null;
  if (region) return {
    region,
    publisher: publisherForRegion(region)
  };

  return fallback;
}

export function normalizeStoredCurriculumProfile({
  curriculumTrack,
  region,
  publisher
}: {
  curriculumTrack?: CurriculumTrack | null;
  region?: unknown;
  publisher?: unknown;
}) {
  const legacyFallback = curriculumProfileForTrack(curriculumTrack);
  return normalizeCurriculumProfile({ region, publisher }, legacyFallback);
}

export function curriculumProfilesEqual(left: CurriculumProfile, right: CurriculumProfile) {
  return left.region === right.region && left.publisher === right.publisher;
}

export function contentMatchesCurriculumProfile(
  content: {
    curriculumTrack?: CurriculumTrack | null;
    region?: CurriculumRegion | null;
    publisher?: TextbookPublisher | null;
  },
  profile: CurriculumProfile
) {
  if (content.curriculumTrack === "MAINLAND_PEP_HIGH") return content.publisher ? content.publisher === profile.publisher : profile.publisher === "MAINLAND_PEP";
  if (content.curriculumTrack === "US_CA_MATH") return profile.publisher === "US_CA_MATH";
  if (content.curriculumTrack === "US_NC_MATH") return profile.publisher === "US_NC_MATH";
  if (content.curriculumTrack === "HK") return profile.region === "HK";
  if (content.publisher) return content.publisher === profile.publisher;
  if (content.region) return content.region === profile.region;
  return false;
}

export function curriculumProfileLabel(profile: CurriculumProfile): LocalizedText {
  return publisherLabels[profile.publisher];
}
