import {
  generatedCaliforniaQuestions,
} from "@/data/usCaliforniaTopics";
import {
  usCaliforniaQuestionGenerationMetadata,
  usCaliforniaQuestions,
} from "@/data/usCaliforniaQuestions";
import {
  __questionStoreTestHooks,
  getPublicQuestionsFromStore,
  getQuestionForAttemptFromStore,
  getQuestionTopicCatalogFromStore,
} from "@/lib/server/questionStore";
import type {
  CurriculumProfile,
  GradeId,
} from "@/types";

import type {
  CaliforniaRuntimeSourceAdapterV1,
  RuntimeQuestionLikeV1,
  RuntimeSourceItemLikeV1,
} from "./runtime-extractor";

const CALIFORNIA_PROFILE = Object.freeze({
  region: "US",
  publisher: "US_CA_MATH",
}) satisfies CurriculumProfile;

/**
 * Read-only adapter over the same store functions used by the student-facing
 * public and attempt paths. It never imports an API credential or provider
 * adapter and therefore cannot perform model egress.
 */
export function createQuestionStoreCaliforniaAdapterV1(): CaliforniaRuntimeSourceAdapterV1 {
  const invocationGrades: string[] = [];
  __questionStoreTestHooks.clearCaches();
  return {
    invocationGrades,
    async getRawQuestions() {
      return structuredClone(generatedCaliforniaQuestions) as unknown as RuntimeSourceItemLikeV1[];
    },
    async getConvertedQuestions() {
      return structuredClone(usCaliforniaQuestions) as unknown as RuntimeQuestionLikeV1[];
    },
    async getPublicQuestions(grade) {
      invocationGrades.push(grade);
      return structuredClone(await getPublicQuestionsFromStore({
        curriculumProfile: CALIFORNIA_PROFILE,
        grade: grade as GradeId,
      })) as unknown as RuntimeQuestionLikeV1[];
    },
    async getTopicCatalog(grade) {
      return structuredClone(await getQuestionTopicCatalogFromStore({
        curriculumProfile: CALIFORNIA_PROFILE,
        grade: grade as GradeId,
      }));
    },
    async getQuestionForAttempt(itemId) {
      const question = await getQuestionForAttemptFromStore(itemId, CALIFORNIA_PROFILE);
      return question === null ? null : structuredClone(question) as unknown as RuntimeQuestionLikeV1;
    },
    getGenerationMetadata(itemId) {
      const metadata = usCaliforniaQuestionGenerationMetadata[itemId];
      return metadata === undefined ? null : structuredClone(metadata);
    },
  };
}
