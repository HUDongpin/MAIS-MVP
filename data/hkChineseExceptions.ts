export type HkChineseException = {
  phrase: string;
  reason: string;
  scope: readonly string[];
  ownerSession: "S09" | "S10";
  reviewBy: string;
  sourceRefs: readonly string[];
  notes: string;
};

export const hkChineseExceptions = [
  {
    phrase: "MAIS",
    reason: "Product brand acronym.",
    scope: ["app/**", "components/**", "data/**", "lib/**"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Keep the English acronym where the UI or documentation introduces the product name."
  },
  {
    phrase: "AI",
    reason: "Widely understood product and technical acronym.",
    scope: ["app/**", "components/**", "data/**", "lib/**"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Allowed in bilingual labels such as AI Tutor and 生成式 AI."
  },
  {
    phrase: "Peter",
    reason: "Demo learner name.",
    scope: ["app/**", "components/**", "data/**", "lib/**"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Demo persona text may use Peter while Chinese display text can use 彼得同學."
  },
  {
    phrase: "HK Teacher Chan",
    reason: "Hong Kong demo teacher account name.",
    scope: ["app/**", "components/**", "data/**", "lib/**"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Keep as a demo account/persona name unless a later localization pass assigns a Chinese name."
  },
  {
    phrase: "Mainland Teacher Phoebe",
    reason: "Mainland demo teacher account name.",
    scope: ["app/**", "components/**", "data/**", "lib/**"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Keep as a demo account/persona name unless a later localization pass assigns a Chinese name."
  },
  {
    phrase: "Delta",
    reason: "Avatar style name.",
    scope: ["components/dashboard/StudentProfilePanel.tsx"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Greek-letter avatar family names are intentionally retained."
  },
  {
    phrase: "Pi",
    reason: "Avatar style name.",
    scope: ["components/dashboard/StudentProfilePanel.tsx"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Greek-letter avatar family names are intentionally retained."
  },
  {
    phrase: "Sigma",
    reason: "Avatar style name.",
    scope: ["components/dashboard/StudentProfilePanel.tsx"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Greek-letter avatar family names are intentionally retained."
  },
  {
    phrase: "Theta",
    reason: "Avatar style name.",
    scope: ["components/dashboard/StudentProfilePanel.tsx"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Greek-letter avatar family names are intentionally retained."
  },
  {
    phrase: "AUTH_SESSION_SECRET",
    reason: "Environment variable name.",
    scope: ["app/**", "components/**", "lib/**"],
    ownerSession: "S10",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Do not translate environment variable identifiers."
  },
  {
    phrase: "NEXTAUTH_SECRET",
    reason: "Environment variable name.",
    scope: ["app/**", "components/**", "lib/**"],
    ownerSession: "S10",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Do not translate environment variable identifiers."
  },
  {
    phrase: "JPG",
    reason: "Image file type.",
    scope: ["components/dashboard/StudentProfilePanel.tsx"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Keep common file extensions in uppercase English."
  },
  {
    phrase: "PNG",
    reason: "Image file type.",
    scope: ["components/dashboard/StudentProfilePanel.tsx"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Keep common file extensions in uppercase English."
  },
  {
    phrase: "WebP",
    reason: "Image file type.",
    scope: ["components/dashboard/StudentProfilePanel.tsx"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Keep common file extensions in their canonical casing."
  },
  {
    phrase: "使用简体中文",
    reason: "Intentional Simplified Chinese label for the zh-Hans language option.",
    scope: ["components/ui/LanguageToggle.tsx"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "This is the one place where Simplified Chinese is expected in UI chrome."
  },
  {
    phrase: "简",
    reason: "Intentional one-character Simplified Chinese language toggle label.",
    scope: ["components/ui/LanguageToggle.tsx"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Allowed only for the zh-Hans toggle control."
  },
  {
    phrase: "胡",
    reason: "Founder surname mark in the footer logo.",
    scope: ["components/layout/Footer.tsx"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Personal-name mark, not a vocabulary term."
  },
  {
    phrase: "新界",
    reason: "Hong Kong place name used in the transit-style roadmap.",
    scope: ["components/learning/SubwayNetworkMap.tsx"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Place names in the map background are allowed proper nouns."
  },
  {
    phrase: "九龍",
    reason: "Hong Kong place name used in the transit-style roadmap.",
    scope: ["components/learning/SubwayNetworkMap.tsx"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Place names in the map background are allowed proper nouns."
  },
  {
    phrase: "香港島",
    reason: "Hong Kong place name used in the transit-style roadmap.",
    scope: ["components/learning/SubwayNetworkMap.tsx"],
    ownerSession: "S09",
    reviewBy: "2026-08-31",
    sourceRefs: ["maisProductDecision"],
    notes: "Place names in the map background are allowed proper nouns."
  }
] as const satisfies readonly HkChineseException[];
