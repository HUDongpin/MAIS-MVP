type LoginCompletionStatus = "authenticated" | "invalid" | "requires-curriculum-track";

export function shouldCompleteCurriculumTrackSelectionForLogin({
  authenticatedStatus,
  flexibleExampleAccountApplied,
  hasCurriculumSelection
}: {
  authenticatedStatus: LoginCompletionStatus;
  flexibleExampleAccountApplied: boolean;
  hasCurriculumSelection: boolean;
}) {
  return (
    !flexibleExampleAccountApplied &&
    hasCurriculumSelection &&
    authenticatedStatus === "requires-curriculum-track"
  );
}
