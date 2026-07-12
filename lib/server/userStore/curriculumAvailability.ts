import { validGradeSet } from "@/data/grades";
import {
  contentMatchesCurriculumProfile,
  curriculumProfileForTrack,
  curriculumTrackForProfile,
  defaultCurriculumProfile
} from "@/lib/curriculumProfile";
import type { CurriculumProfile, CurriculumRegion, CurriculumTrack, GradeId, LocalizedText, TextbookPublisher } from "@/types";

export type CurriculumScope = CurriculumTrack | CurriculumProfile | undefined | null;

export const validCurriculumTrackSet = new Set<CurriculumTrack>([
  "HK",
  "MAINLAND_PEP_HIGH",
  "US_CA_MATH",
  "US_NC_MATH",
  "US_AR_MATH",
  "US_FL_MATH"
]);

const floridaMiddleSchoolGrades = new Set<GradeId>(["P6", "S1", "S2"]);
const usCaliforniaAdaptiveBetaGrades = new Set<GradeId>(["K", "P1", "P2", "P3", "P4", "P5"]);

export function isValidCurriculumTrackFromScope(value: unknown): value is CurriculumTrack {
  return validCurriculumTrackSet.has(value as CurriculumTrack);
}

export function normalizeCurriculumTrackFromScope(value: unknown) {
  return isValidCurriculumTrackFromScope(value) ? value : undefined;
}

export function curriculumProfileForScope(scope?: CurriculumScope): CurriculumProfile {
  if (typeof scope === "string") return curriculumProfileForTrack(scope);
  if (scope) return scope;
  return defaultCurriculumProfile;
}

export function curriculumTrackForScope(scope?: CurriculumScope): CurriculumTrack {
  return curriculumTrackForProfile(curriculumProfileForScope(scope));
}

function isMainlandPepContentEnabled() {
  const configured = process.env.MAINLAND_PEP_CONTENT_ENABLED?.trim().toLowerCase();
  if (configured === "true" || configured === "1" || configured === "yes" || configured === "on") return true;
  if (configured === "false" || configured === "0" || configured === "no" || configured === "off") return false;
  return true;
}

export function isMainlandPepProfile(profile: CurriculumProfile) {
  return profile.region === "MAINLAND" && profile.publisher === "MAINLAND_PEP";
}

export function curriculumContentEnabledFor(profile: CurriculumProfile) {
  return !isMainlandPepProfile(profile) || isMainlandPepContentEnabled();
}

export function curriculumContentMatchesScope(
  content: {
    curriculum_track?: CurriculumTrack | null;
    curriculum_region?: CurriculumRegion | null;
    textbook_publisher?: TextbookPublisher | null;
  },
  scope?: CurriculumScope
) {
  const profile = curriculumProfileForScope(scope);
  return curriculumContentEnabledFor(profile) && contentMatchesCurriculumProfile(
    {
      curriculumTrack: content.curriculum_track,
      region: content.curriculum_region,
      publisher: content.textbook_publisher
    },
    profile
  );
}

export function isLiveUnitedStatesContentProfile(profile: CurriculumProfile) {
  return profile.region === "US" && (profile.publisher === "US_CA_MATH" || profile.publisher === "US_AR_MATH" || profile.publisher === "US_FL_MATH");
}

export function isGradeAllowedForCurriculumProfile(grade: GradeId, profile: CurriculumProfile) {
  if (!validGradeSet.has(grade)) return false;
  if (profile.publisher === "US_FL_MATH") return floridaMiddleSchoolGrades.has(grade);
  return true;
}

export function contentUnavailableFor(scope: CurriculumScope, grade?: GradeId): LocalizedText | null {
  const profile = curriculumProfileForScope(scope);
  if (profile.region === "US" && !isLiveUnitedStatesContentProfile(profile)) {
    return {
      en: "This curriculum is not open in MAIS yet. Your adaptive route will appear after the US content pack is released.",
      zh: "此課程內容尚未在 MAIS 開放。美國課程題庫發布後，適性航線會在這裡顯示。",
      zhHans: "此课程内容尚未在 MAIS 开放。美国课程题库发布后，自适应航线会在这里显示。"
    };
  }

  if (profile.publisher === "MAINLAND_BNU") {
    return null;
  }

  if (isMainlandPepProfile(profile) && !isMainlandPepContentEnabled()) {
    return {
      en: "Mainland PEP mathematics content is not enabled for this deployment yet.",
      zh: "內地人教版數學內容尚未在此部署開放。",
      zhHans: "内地人教版数学内容尚未在此部署开放。"
    };
  }

  if (profile.region !== "MAINLAND") return null;
  return null;
}

export function getContentUnavailableForCurriculum(scope: CurriculumScope, grade?: GradeId): LocalizedText | null {
  return contentUnavailableFor(scope, grade);
}

export function adaptiveContentUnavailableFor(scope: CurriculumScope, grade?: GradeId): LocalizedText | null {
  const profile = curriculumProfileForScope(scope);
  if (profile.region !== "US") return contentUnavailableFor(scope, grade);

  if (profile.publisher === "US_CA_MATH") {
    if (!grade || usCaliforniaAdaptiveBetaGrades.has(grade)) return null;
    return {
      en: "US California adaptive practice is preparing. The beta question seed is currently open only for Kindergarten through Grade 5 after S18 content QA and S15 regression.",
      zh: "美國加州適性練習正在準備中。通過 S18 內容 QA 與 S15 回歸後，目前只先開放 Kindergarten 至 Grade 5 的 beta 題目種子。",
      zhHans: "美国加州自适应练习正在准备中。通过 S18 内容 QA 与 S15 回归后，目前只先开放 Kindergarten 至 Grade 5 的 beta 题目种子。"
    };
  }

  if (profile.publisher === "US_NC_MATH") {
    return {
      en: "US North Carolina adaptive practice is a candidate content pack. Beta recommendations will appear after S18 content signoff and S15 adaptive regression.",
      zh: "美國北卡適性練習仍是候選內容包。完成 S18 內容簽核與 S15 適性回歸後，beta 建議才會顯示。",
      zhHans: "美国北卡适性练习仍是候选内容包。完成 S18 内容签核与 S15 适性回归后，beta 建议才会显示。"
    };
  }

  return contentUnavailableFor(scope, grade);
}

export function getAdaptiveContentUnavailableForCurriculum(scope: CurriculumScope, grade?: GradeId): LocalizedText | null {
  return adaptiveContentUnavailableFor(scope, grade);
}
