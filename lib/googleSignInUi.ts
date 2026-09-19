export type GoogleSignInErrorCode = "teacher_invite_required" | "generic";

export type GoogleSignInUiState = {
  offerGoogle: boolean;
  showUnavailableNotice: boolean;
  errorCode: GoogleSignInErrorCode | null;
};

export function resolveGoogleSignInUi({
  available,
  googleError
}: {
  available: boolean;
  googleError: string;
}): GoogleSignInUiState {
  if (!available || googleError === "setup") {
    return {
      offerGoogle: false,
      showUnavailableNotice: true,
      errorCode: null
    };
  }

  if (!googleError) {
    return {
      offerGoogle: true,
      showUnavailableNotice: false,
      errorCode: null
    };
  }

  if (googleError === "teacher_invite_required") {
    return {
      offerGoogle: true,
      showUnavailableNotice: false,
      errorCode: "teacher_invite_required"
    };
  }

  return {
    offerGoogle: true,
    showUnavailableNotice: false,
    errorCode: "generic"
  };
}
