import {
  combineProviderPolicyRegions,
  providerPolicyRegionFromProfile,
  type ProviderPolicyRegion
} from "@/lib/aiProviderCompanyPolicy";

type PolicyDatabase = {
  student_profiles: Array<{ user_id: string; curriculum_region?: string | null; curriculum_track?: string | null; textbook_publisher?: string | null }>;
  teacher_classes: Array<{ id: string; teacher_id: string }>;
  class_enrollments: Array<{ class_id: string; student_id: string }>;
};

export function storedUserProviderRegion(database: Pick<PolicyDatabase, "student_profiles">, userId: string): ProviderPolicyRegion {
  const profile = database.student_profiles.find(row => row.user_id === userId);
  return providerPolicyRegionFromProfile({ region: profile?.curriculum_region, curriculumTrack: profile?.curriculum_track, publisher: profile?.textbook_publisher });
}

// Callers must authorize class access before consuming its content. A regional
// actor may not relax restrictions attached to another learner's included data.
export function classProviderRegion(database: PolicyDatabase, classId: string, actorId?: string): ProviderPolicyRegion {
  const teacherClass = database.teacher_classes.find(row => row.id === classId);
  if (!teacherClass) return null;
  const userIds = new Set([
    teacherClass.teacher_id,
    ...(actorId ? [actorId] : []),
    ...database.class_enrollments.filter(row => row.class_id === classId).map(row => row.student_id)
  ]);
  return combineProviderPolicyRegions(...Array.from(userIds, id => storedUserProviderRegion(database, id)));
}

export function trustedTutorProviderHistory(messages: readonly {
  user_id: string; role: "student" | "tutor"; content: string; created_at: string;
  context_json?: Record<string, unknown> | null;
}[], userId: string) {
  return messages.filter(message => message.user_id === userId)
    .slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6).reverse()
    .filter(message => message.context_json && Object.hasOwn(message.context_json, "providerPolicyRegion") &&
      ["US", "HK", "MAINLAND", null].includes(message.context_json.providerPolicyRegion as ProviderPolicyRegion))
    .map(message => ({ role: message.role, content: message.content, providerPolicyRegion: message.context_json!.providerPolicyRegion as ProviderPolicyRegion }));
}
