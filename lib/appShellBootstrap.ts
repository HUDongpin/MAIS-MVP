import type {
  GradeId,
  Language,
  StudentAvatarId,
  StudentSession,
  ThemeMode
} from "@/types";

export type AppShellUserSafe = Pick<
  StudentSession,
  "id" | "name" | "role" | "passwordMustChange" | "avatarId" | "grade" | "curriculumTrack" | "curriculumProfile"
> & {
  avatarImageDataUrl?: `/api/me/avatar?expectedUserId=${string}&revision=${string}`;
};

export type AppShellIdentity =
  | { userId: null; userRole: null }
  | { userId: string; userRole: AppShellUserSafe["role"] };

export type AuthenticatedAppShellBootstrap = {
  kind: "authenticated";
  user: AppShellUserSafe;
  settings: {
    language: Language;
    theme: ThemeMode;
    selectedGrade: GradeId;
  };
};

export type GuestAppShellBootstrap = {
  kind: "guest";
  /**
   * Safe, non-identifying signal used only to expire an invalid or revoked
   * cookie after hydration. Never include the cookie value in this payload.
   */
  hadSessionCookie: boolean;
};

export type AppShellBootstrap = AuthenticatedAppShellBootstrap | GuestAppShellBootstrap;

export const appShellSessionSyncStorageKey = "hk-math-session-sync";

export function appShellIdentityFromUser(
  user: Pick<AppShellUserSafe, "id" | "role">
): AppShellIdentity {
  return { userId: user.id, userRole: user.role };
}

export function appShellIdentityFromBootstrap(bootstrap: AppShellBootstrap): AppShellIdentity {
  return bootstrap.kind === "authenticated"
    ? appShellIdentityFromUser(bootstrap.user)
    : { userId: null, userRole: null };
}

export function sameAppShellIdentity(left: AppShellIdentity, right: AppShellIdentity) {
  if (left.userId === null || right.userId === null) {
    return left.userId === null && right.userId === null;
  }
  return left.userId === right.userId && left.userRole === right.userRole;
}

export function appShellBootstrapIsAuthorized({
  acceptedIdentity,
  incomingBootstrap
}: {
  acceptedIdentity: AppShellIdentity;
  incomingBootstrap: AppShellBootstrap;
}) {
  const incomingIdentity = appShellIdentityFromBootstrap(incomingBootstrap);
  return sameAppShellIdentity(acceptedIdentity, incomingIdentity);
}

type AppShellSessionSource = {
  user: StudentSession;
  settings: {
    language: Language;
    theme: ThemeMode;
    selectedGrade: GradeId;
  };
};

function hasPrivateAvatar(source: StudentSession) {
  return Boolean(
    source.avatarImageObjectKey ||
    (typeof source.avatarImageDataUrl === "string" && source.avatarImageDataUrl.startsWith("data:image/"))
  );
}

function privateAvatarRevision(source: StudentSession) {
  const value = source.avatarImageObjectKey ?? source.avatarImageDataUrl ?? source.avatarImageUrl ?? "";
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + index), 0x85ebca6b);
  }
  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

/**
 * The root layout serializes this value into HTML/RSC. Keep the allowlist
 * explicit. The opaque internal user id is required for client-side
 * expected-user race guards; login identifiers, email/school metadata, raw
 * image data and media object keys must never cross this boundary.
 */
export function toAuthenticatedAppShellBootstrap(source: AppShellSessionSource): AuthenticatedAppShellBootstrap {
  const avatarImageDataUrl = `/api/me/avatar?expectedUserId=${encodeURIComponent(source.user.id)}&revision=${privateAvatarRevision(source.user)}` as const;

  return {
    kind: "authenticated",
    user: {
      id: source.user.id,
      name: source.user.name,
      role: source.user.role,
      passwordMustChange: source.user.passwordMustChange,
      avatarId: source.user.avatarId,
      ...(hasPrivateAvatar(source.user) ? { avatarImageDataUrl } : {}),
      grade: source.user.grade,
      curriculumTrack: source.user.curriculumTrack,
      curriculumProfile: {
        region: source.user.curriculumProfile.region,
        publisher: source.user.curriculumProfile.publisher
      }
    },
    settings: {
      language: source.settings.language,
      theme: source.settings.theme,
      selectedGrade: source.settings.selectedGrade
    }
  };
}
