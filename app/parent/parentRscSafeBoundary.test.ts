import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  appShellBootstrapIsAuthorized,
  appShellIdentityFromBootstrap,
  sameAppShellIdentity,
  toAuthenticatedAppShellBootstrap
} from "@/lib/appShellBootstrap";
import type { StudentSession } from "@/types";

async function source(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("parent server pages project raw persistence models before crossing into client components", async () => {
  const [foundation, childPage, reportsPage, noticesPage] = await Promise.all([
    source("app/parent/getParentFoundation.ts"),
    source("app/parent/children/[studentId]/page.tsx"),
    source("app/parent/reports/page.tsx"),
    source("app/parent/notices/page.tsx")
  ]);

  assert.match(foundation, /toParentFoundationSafeData/);
  assert.match(foundation, /return toParentFoundationSafeData\(foundation\)/);

  assert.match(childPage, /toParentChildSummarySafe/);
  assert.match(childPage, /const safeChild = toParentChildSummarySafe\(child\)/);
  assert.match(childPage, /<ParentChildDetail child=\{safeChild\}/);

  assert.match(reportsPage, /toParentReportDataSafe/);
  assert.match(reportsPage, /const safeData = toParentReportDataSafe\(data\)/);
  assert.match(reportsPage, /<ParentReportsView data=\{safeData\}/);

  assert.match(noticesPage, /toParentNoticeDataSafe/);
  assert.match(noticesPage, /const safeData = toParentNoticeDataSafe\(data\)/);
  assert.match(noticesPage, /<ParentNoticesView data=\{safeData\}/);
});

test("parent HTML and RSC responses are explicitly private and non-cacheable", async () => {
  const middleware = await source("middleware.ts");

  assert.match(middleware, /pathname === "\/parent" \|\| pathname\.startsWith\("\/parent\/"\)/u);
  assert.match(middleware, /response\.headers\.set\("Cache-Control", "private, no-store"\)/u);
  assert.match(middleware, /response\.headers\.set\("CDN-Cache-Control", "private, no-store"\)/u);
  assert.match(middleware, /response\.headers\.set\("Vercel-CDN-Cache-Control", "private, no-store"\)/u);
});

test("parent layout failures still reach a privacy-safe family-specific fallback", async () => {
  const [parentLayout, appError] = await Promise.all([
    source("app/parent/layout.tsx"),
    source("app/error.tsx")
  ]);

  assert.match(parentLayout, /await getParentFoundationForPage\(\)/u);
  assert.match(appError, /usePathname\(\)/u);
  assert.match(appError, /pathname === "\/parent" \|\| pathname\.startsWith\("\/parent\/"\)/u);
  assert.match(appError, /Family space is temporarily unavailable/u);
  assert.match(appError, /家庭空間暫時不可用/u);
  assert.match(appError, /家庭空间暂时不可用/u);
  assert.doesNotMatch(appError, /error\.(?:message|stack|cause)/u);
});

test("parent message filters and replies use explicit label-control associations", async () => {
  const [shell, views] = await Promise.all([
    source("components/parent/ParentShell.tsx"),
    source("components/parent/ParentViews.tsx")
  ]);

  assert.match(shell, /<label[^>]+htmlFor="parent-child-focus"/u);
  assert.match(shell, /<select\s+id="parent-child-focus"/u);
  assert.match(views, /<label[^>]+htmlFor="parent-message-reply"/u);
  assert.match(views, /<textarea\s+id="parent-message-reply"/u);
});

test("all parent client props accept only parent-safe DTO types", async () => {
  const [shell, views, notices, motivation] = await Promise.all([
    source("components/parent/ParentShell.tsx"),
    source("components/parent/ParentViews.tsx"),
    source("components/parent/ParentNoticesView.tsx"),
    source("components/gamification/ParentMotivationSummary.tsx")
  ]);

  assert.match(shell, /ParentIdentitySafe/);
  assert.match(shell, /ParentChildSummarySafe/);
  assert.doesNotMatch(shell, /\b(?:StudentSession|ParentChildSummary)\b/);

  for (const safeType of ["ParentChildSummarySafe", "ParentFoundationSafeData", "ParentReportSafeData", "ParentReportSafe"]) {
    assert.match(views, new RegExp(`\\b${safeType}\\b`));
  }
  assert.match(views, /\bParentMessagesSafeData\b/);
  assert.doesNotMatch(views, /\bParentMessagesData\b/);
  assert.doesNotMatch(views, /\b(?:ParentChildSummary|ParentFoundationData|ParentReportData|TeacherReport)\b/);

  assert.match(notices, /ParentNoticeSafeData/);
  assert.match(notices, /ParentNoticeRecipientSafe/);
  assert.doesNotMatch(notices, /\b(?:ParentNoticeData|TeacherNoticeRecipient)\b/);

  assert.match(motivation, /ParentMotivationSummarySafe/);
  assert.doesNotMatch(motivation, /\bGamificationSummary\b/);
});

test("an authenticated parent with an explicit invalid child selection reaches the 404 boundary", async () => {
  const foundation = await source("app/parent/getParentFoundation.ts");

  assert.match(foundation, /import \{ notFound, redirect \} from "next\/navigation"/);
  assert.match(
    foundation,
    /if \(!foundation\) \{\s*if \(selectedStudentId !== undefined && selectedStudentId !== null\) notFound\(\);\s*redirect\("\/dashboard"\);\s*\}/
  );
});

test("the server-seeded app shell serializes only its explicit safe user allowlist", async () => {
  const user: StudentSession = {
    id: "parent-private",
    name: "Private Parent",
    username: "private-parent@example.test",
    email: "private-parent@example.test",
    schoolId: "private-school",
    passwordMustChange: false,
    avatarId: "delta",
    avatarImageDataUrl: "data:image/png;base64,U0VDUkVU",
    avatarImageObjectKey: "profile-avatar/private-object-key.png",
    avatarImageUrl: "/api/media-objects/profile-avatar/private-object-key.png",
    grade: "S3",
    curriculumTrack: "HK",
    curriculumProfile: {
      region: "HK",
      publisher: "HK_UNITED_PRIME_MIA",
      privateNested: {
        guardianInviteCode: "NESTED-GUARDIAN-SECRET",
        diagnostics: { providerTokenUsage: 42 }
      }
    } as StudentSession["curriculumProfile"],
    role: "parent"
  };
  const bootstrap = toAuthenticatedAppShellBootstrap({
    user,
    settings: { language: "zh", theme: "dark", selectedGrade: "S3" }
  });
  const serialized = JSON.stringify(bootstrap);

  const parentAIdentity = appShellIdentityFromBootstrap(bootstrap);
  const parentBIdentity = { userId: "parent-b", userRole: "parent" } as const;
  const parentCIdentity = { userId: "parent-c", userRole: "parent" } as const;
  const parentBBootstrap = {
    ...bootstrap,
    user: { ...bootstrap.user, id: parentBIdentity.userId }
  };
  const parentCBootstrap = {
    ...bootstrap,
    user: { ...bootstrap.user, id: parentCIdentity.userId }
  };
  assert.equal(sameAppShellIdentity(parentAIdentity, parentAIdentity), true);
  assert.equal(sameAppShellIdentity(parentAIdentity, parentBIdentity), false);
  assert.equal(appShellBootstrapIsAuthorized({
    acceptedIdentity: parentAIdentity,
    incomingBootstrap: parentBBootstrap
  }), false, "an unrelated RSC account must be rejected before render");
  assert.equal(appShellBootstrapIsAuthorized({
    acceptedIdentity: parentAIdentity,
    incomingBootstrap: bootstrap
  }), true, "only the identity already accepted by this document may update its RSC tree");
  assert.equal(appShellBootstrapIsAuthorized({
    acceptedIdentity: parentAIdentity,
    incomingBootstrap: parentCBootstrap
  }), false, "a rapid A to B to C response cannot authorize a different account");
  assert.equal(appShellBootstrapIsAuthorized({
    acceptedIdentity: parentBIdentity,
    incomingBootstrap: bootstrap
  }), false, "a late A RSC remains rejected after B is accepted and the gate clears");

  assert.deepEqual(Object.keys(bootstrap.user).sort(), [
    "avatarId",
    "avatarImageDataUrl",
    "curriculumProfile",
    "curriculumTrack",
    "grade",
    "id",
    "name",
    "passwordMustChange",
    "role"
  ]);
  const avatarProxyUrl = bootstrap.user.avatarImageDataUrl;
  assert.ok(avatarProxyUrl);
  assert.match(
    avatarProxyUrl,
    /^\/api\/me\/avatar\?expectedUserId=parent-private&revision=[a-z0-9]+$/u
  );
  const avatarUrl = new URL(avatarProxyUrl, "https://mais.example.test");
  assert.deepEqual([...avatarUrl.searchParams.keys()], ["expectedUserId", "revision"]);
  assert.equal(avatarUrl.searchParams.get("expectedUserId"), user.id);
  assert.match(avatarUrl.searchParams.get("revision") ?? "", /^[a-z0-9]+$/u);
  const changedAvatarBootstrap = toAuthenticatedAppShellBootstrap({
    user: { ...user, avatarImageObjectKey: "profile-avatar/replacement-object.png" },
    settings: { language: "zh", theme: "dark", selectedGrade: "S3" }
  });
  assert.notEqual(
    changedAvatarBootstrap.user.avatarImageDataUrl,
    bootstrap.user.avatarImageDataUrl,
    "same-user avatar updates must change the proxy src and trigger a fresh request"
  );
  for (const forbidden of [
    "private-parent@example.test",
    "private-school",
    "U0VDUkVU",
    "private-object-key",
    "media-objects",
    "NESTED-GUARDIAN-SECRET",
    "providerTokenUsage"
  ]) {
    assert.equal(serialized.includes(forbidden), false, `bootstrap leaked ${forbidden}`);
  }

  const rootLayout = await source("app/layout.tsx");
  assert.match(rootLayout, /toAuthenticatedAppShellBootstrap\(requestSession\.authenticated\)/u);
  assert.match(rootLayout, /hadSessionCookie: requestSession\.hadSessionCookie/u);
  assert.doesNotMatch(rootLayout, /preHydrationSessionGuardScript/u);
  assert.doesNotMatch(rootLayout, /import Script from "next\/script"/u);
  assert.doesNotMatch(rootLayout, /id="mais-prehydration-session-guard"/u);
  assert.doesNotMatch(rootLayout, /strategy="beforeInteractive"/u);
  assert.doesNotMatch(rootLayout, /data-mais-prehydrate-privacy-cover/u);
  assert.doesNotMatch(rootLayout, /<style>\{`/u);
  assert.doesNotMatch(rootLayout, /<script\s+dangerouslySetInnerHTML/u);
  assert.doesNotMatch(rootLayout, /<AppProviders initialSession=\{requestSession\.authenticated\}/u);

  const globalStyles = await source("app/globals.css");
  assert.doesNotMatch(globalStyles, /data-mais-prehydrate-privacy-cover/u);
  assert.doesNotMatch(globalStyles, /data-mais-session-prehydrate-blocked/u);

  const avatarRoute = await source("app/api/me/avatar/route.ts");
  assert.match(avatarRoute, /expectedUserConstraintsFromRequest/u);
  assert.match(avatarRoute, /guardExpectedAuthenticatedUser/u);
  assert.match(
    avatarRoute,
    /guardExpectedAuthenticatedUser\(\s*authenticated,\s*expectedUserConstraintsFromRequest\(request\),\s*\{ requireConstraint: true \}\s*\)[\s\S]*if \(expectedUserConflict\) return expectedUserConflict;[\s\S]*readStoredMediaObject/u
  );
  assert.match(avatarRoute, /authenticated\.user\.avatarImageObjectKey/u);
  assert.match(avatarRoute, /requester: \{ id: authenticated\.user\.id, role: authenticated\.user\.role \}/u);
  assert.match(avatarRoute, /"Cache-Control": "private, no-store"/u);
  assert.match(avatarRoute, /"CDN-Cache-Control": "private, no-store"/u);
  assert.match(avatarRoute, /"Vercel-CDN-Cache-Control": "private, no-store"/u);
  assert.match(avatarRoute, /"X-Content-Type-Options": "nosniff"/u);
  assert.match(
    avatarRoute,
    /if \(result\.status === "rejected"\) \{\s*return privateJsonError\("Avatar is temporarily unavailable\.", 503\);\s*\}/u
  );
  assert.match(
    avatarRoute,
    /if \(result\.status !== "ok"\) \{\s*return privateJsonError\("Avatar is unavailable\.", 404\);\s*\}/u
  );
  assert.match(avatarRoute, /privateJsonError\("Avatar is temporarily unavailable\.", 503\)/u);
  assert.doesNotMatch(avatarRoute, /params:\s*Promise/u);

  const [appErrorBoundary, globalErrorBoundary, parentErrorBoundary] = await Promise.all([
    source("app/error.tsx"),
    source("app/global-error.tsx"),
    source("app/parent/error.tsx")
  ]);
  for (const boundary of [appErrorBoundary, globalErrorBoundary, parentErrorBoundary]) {
    assert.match(boundary, /^"use client";/u);
    assert.match(boundary, /role="alert"/u);
    assert.match(boundary, /onClick=\{reset\}/u);
    assert.doesNotMatch(boundary, /error\.(?:message|digest|stack|cause)/u);
  }
  for (const copy of ["Try again", "再試一次", "重试"]) {
    assert.match(appErrorBoundary, new RegExp(copy));
    assert.match(globalErrorBoundary, new RegExp(copy));
  }
  assert.match(globalErrorBoundary, /<html\b/u);
  assert.match(globalErrorBoundary, /<body\b/u);

  const studentProfile = await source("components/dashboard/StudentProfilePanel.tsx");
  assert.match(studentProfile, /<img key=\{currentUser\.id\} src=\{draftAvatarImagePreviewUrl\}/u);

  const providers = await source("components/providers/AppProviders.tsx");
  assert.match(providers, /<span hidden data-mais-session-react-guard-ready="true"/u);
  assert.doesNotMatch(providers, /document\.documentElement\.setAttribute/u);
  assert.doesNotMatch(providers, /document\.documentElement\.removeAttribute/u);
  assert.match(providers, /requestAuthEpoch !== authEpochRef\.current/u);
  assert.match(providers, /sessionRevalidationAbortRef\.current\?\.abort\(\)/u);
  assert.match(providers, /sessionRevalidationGenerationRef/u);
  assert.match(providers, /window\.addEventListener\("pageshow", handlePageShow\)/u);
  assert.match(providers, /initialBootstrap\.hadSessionCookie/u);
  assert.match(providers, /readLocalStorageItem/u);
  assert.match(providers, /resetLearningState/u);
  assert.match(providers, /dispatchCore\(\{\s*type: "apply-session"/u);
  assert.doesNotMatch(providers, /sessionRevalidationInFlightRef/u);
  assert.doesNotMatch(providers, /setCurrentUser\(/u);
});
