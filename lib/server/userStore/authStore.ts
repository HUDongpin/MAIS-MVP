import type { CurriculumProfile, GradeId } from "@/types";
import type { AuthAdminStoragePersistenceStore } from "./authAdminStoragePersistence";
import type { AuthProvisioningPersistenceStore } from "./authProvisioningPersistence";
import type { AuthSession, AuthSessionPersistenceStore } from "./authSessionPersistence";
import type { LearnerProfilePersistenceStore } from "./learnerProfilePersistence";

export type AuthUserStoreDependencies = {
  authAdminStoragePersistenceStore: AuthAdminStoragePersistenceStore;
  authProvisioningPersistenceStore: AuthProvisioningPersistenceStore;
  authSessionPersistenceStore: AuthSessionPersistenceStore;
  getAuthenticatedUserByIdForAiTutorAdmissionBeforeSnapshot: (
    userId: string,
    signal: AbortSignal
  ) => Promise<AuthSession | null | undefined>;
  isGradeAllowedForCurriculumProfile: (grade: GradeId, profile: CurriculumProfile) => boolean;
  learnerProfilePersistenceStore: LearnerProfilePersistenceStore;
};

export function createAuthUserStore({
  authAdminStoragePersistenceStore,
  authProvisioningPersistenceStore,
  authSessionPersistenceStore,
  getAuthenticatedUserByIdForAiTutorAdmissionBeforeSnapshot,
  isGradeAllowedForCurriculumProfile,
  learnerProfilePersistenceStore
}: AuthUserStoreDependencies) {
  return {
    isGradeAllowedForCurriculumProfile,
    shouldRetryDemoLoginAfterFastInvalid: authSessionPersistenceStore.shouldRetryDemoLoginAfterFastInvalid,
    authenticatedUserForCredentials: authSessionPersistenceStore.authenticatedUserForCredentials,
    authenticateUser: authSessionPersistenceStore.authenticateUser,
    authenticateUserForLogin: authSessionPersistenceStore.authenticateUserForLogin,
    authenticateFlexibleExampleAccountForLogin: authSessionPersistenceStore.authenticateFlexibleExampleAccountForLogin,
    createStudentUser: authSessionPersistenceStore.createStudentUser,
    createTeacherUser: authSessionPersistenceStore.createTeacherUser,
    createParentUser: authSessionPersistenceStore.createParentUser,
    completeStudentCurriculumTrackSelection: authSessionPersistenceStore.completeStudentCurriculumTrackSelection,
    validateSchoolProvisioning: authProvisioningPersistenceStore.validateSchoolProvisioning,
    createSchoolProvisioningBatch: authProvisioningPersistenceStore.createSchoolProvisioningBatch,
    getProvisioningBatchForAdmin: authProvisioningPersistenceStore.getProvisioningBatchForAdmin,
    getProvisioningBatchCredentialCsvForAdmin: authProvisioningPersistenceStore.getProvisioningBatchCredentialCsvForAdmin,
    changeAuthenticatedUserPassword: authSessionPersistenceStore.changeAuthenticatedUserPassword,
    createPasswordResetRequest: authSessionPersistenceStore.createPasswordResetRequest,
    resetUserPassword: authSessionPersistenceStore.resetUserPassword,
    getAuthenticatedUserById: authSessionPersistenceStore.getAuthenticatedUserById,
    getAuthenticatedUserByIdForAiTutorAdmission: async (userId: string, signal: AbortSignal) => {
      const authenticated = await getAuthenticatedUserByIdForAiTutorAdmissionBeforeSnapshot(userId, signal);
      if (authenticated !== undefined) return authenticated;
      return authSessionPersistenceStore.getAuthenticatedUserById(userId);
    },
    buildRedactedAdminStorageSnapshot: authAdminStoragePersistenceStore.buildRedactedAdminStorageSnapshot,
    exportDatabaseSnapshotForAdmin: authAdminStoragePersistenceStore.exportDatabaseSnapshotForAdmin,
    backfillPostgresHotAuthTablesForAdmin: authAdminStoragePersistenceStore.backfillPostgresHotAuthTablesForAdmin,
    cleanupTemporaryBootstrapAdminsForAdmin: authAdminStoragePersistenceStore.cleanupTemporaryBootstrapAdminsForAdmin,
    getStorageReadinessSnapshot: authAdminStoragePersistenceStore.getStorageReadinessSnapshot,
    updateUserSettings: authSessionPersistenceStore.updateUserSettings,
    updateUserProfile: authSessionPersistenceStore.updateUserProfile,
    getLearnerProfile: learnerProfilePersistenceStore.getLearnerProfile,
    updateLearnerProfile: learnerProfilePersistenceStore.updateLearnerProfile
  };
}
