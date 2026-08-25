import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function providerSource() {
  return readFile(path.join(process.cwd(), "components/providers/AppProviders.tsx"), "utf8");
}

test("cross-tab identity uncertainty immediately gates account UI and account-bound writes", async () => {
  const source = await providerSource();
  const quarantineStart = source.indexOf("const quarantineForSessionCheck");
  const quarantineEnd = source.indexOf("const appendLearningEventsToQueues", quarantineStart);
  const quarantineSource = source.slice(quarantineStart, quarantineEnd);

  assert.match(source, /type SessionVerificationMode = "none" \| "foreground" \| "identity"/u);
  assert.match(source, /sessionVerificationTargetRef/u);
  assert.match(source, /sessionVerificationPending/u);
  assert.match(source, /accountWorkBlockedRef\.current = true/u);
  assert.match(source, /quarantineForSessionCheck/u);
  assert.match(source, /sameAccountBoundary/u);
  assert.match(source, /router\.refresh\(\)/u);
  assert.match(source, /window\.location\.replace\(`/u);
  assert.match(source, /expectedUserId/u);
  assert.match(source, /X-MAIS-Expected-User-Id/u);
  assert.match(source, /account-updated-session-refresh-required/u);
  assert.match(source, /password-updated-sign-in-required/u);
  assert.match(source, /event\.persisted/u);
  assert.match(source, /window\.addEventListener\("blur", handleBlur\)/u);
  assert.match(source, /displayedSessionVerificationMode === "identity" \? sessionVerificationGate/u);
  assert.match(source, /data-session-verification-gate="true"/u);
  assert.doesNotMatch(source, /data-session-verification-content/u);
  assert.match(source, /Array\.from\(document\.body\.children\)\.forEach\(isolateBodyChild\)/u);
  assert.match(source, /element\.style\.visibility = "hidden"[\s\S]*?element\.style\.pointerEvents = "none"/u);
  assert.match(
    quarantineSource,
    /if \(mode === "identity"\) \{[\s\S]*?setMistakeRecords\(\[\]\)[\s\S]*?analyticsFlushGenerationRef\.current \+= 1/u
  );
  assert.equal(
    quarantineSource.match(/analyticsFlushGenerationRef\.current \+= 1/gu)?.length,
    1,
    "foreground quarantine must not invalidate an already-issued analytics batch"
  );
  assert.match(source, /role="status"/u);
  assert.match(source, /useLayoutEffect\(\(\) => \{[\s\S]*?document\.body\.children[\s\S]*?new MutationObserver/u);
  assert.match(source, /element\.inert = true[\s\S]*?element\.setAttribute\("aria-hidden", "true"\)/u);
  assert.match(source, /className="fixed inset-0[^"]*?w-full[^"]*?bg-slate-50/u);
  assert.doesNotMatch(source, /className="page-container fixed inset-0/u);
  assert.match(source, /const reconcileSignalledIdentity[\s\S]*?quarantineForSessionCheck\(\)[\s\S]*?revalidateSession/u);
  assert.match(source, /const handleStorage[\s\S]*?reconcileSignalledIdentity\(readSessionSyncIdentity\(event\.newValue\), true\)/u);
  assert.match(source, /new BroadcastChannel\(sessionSyncStorageKey\)/u);
  assert.match(source, /sourceDocumentId: sessionSyncDocumentId/u);
  assert.match(source, /event\.data\.sourceDocumentId === sessionSyncDocumentId/u);
  assert.match(source, /const handleBroadcastMessage/u);
  assert.match(source, /persistedSessionSignal[\s\S]*?reconcileSignalledIdentity\(readSessionSyncIdentity\(persistedSessionSignal\), false\)/u);
  assert.match(source, /const handleBlur[\s\S]*?needsForegroundValidation = true/u);
  assert.match(
    source,
    /const handleBlur[\s\S]*?quarantineForSessionCheck\("foreground"\)/u
  );
  assert.match(source, /const handlePageHide[\s\S]*?flushSync/u);
  assert.match(source, /window\.addEventListener\("pagehide", handlePageHide\)/u);
  assert.match(source, /let needsForegroundValidation = document\.visibilityState === "hidden"/u);
  assert.match(
    source,
    /const validateAfterForegroundReturn[\s\S]*?quarantineForSessionCheck\("foreground"\)[\s\S]*?revalidateSession/u
  );
  assert.match(source, /const handlePageShow[\s\S]*?quarantineForSessionCheck\("foreground"\)[\s\S]*?revalidateSession/u);
  assert.match(
    source,
    /if \(!acceptedBootstrapMatchesSession\) \{[\s\S]*?quarantineForSessionCheck\("identity"\)/u
  );
  assert.match(
    source,
    /if \(pendingVerificationMode !== "none"\) \{[\s\S]*?return;[\s\S]*?\}/u
  );
  assert.match(source, /acceptedBootstrapIdentityRef/u);
  assert.match(source, /bootstrapBoundaryMismatch/u);
  assert.match(source, /displayedSessionVerificationMode/u);
  assert.match(source, /const acceptedBootstrapMatchesSession/u);
  assert.match(
    source,
    /keepVerificationGate:\s*shouldGateDuringCheck\s*&&\s*!acceptedBootstrapMatchesSession/u
  );
  assert.match(source, /else if \(!acceptedBootstrapMatchesSession\) \{/u);
  assert.match(
    source,
    /else if \(!acceptedBootstrapMatchesSession\) \{[\s\S]*?window\.location\.reload\(\)/u
  );
  assert.match(source, /<Fragment key=\{accountTreeKey\}>\{children\}<\/Fragment>/u);
  assert.doesNotMatch(
    source,
    /const coreStateRef = useRef\(coreState\);\s*coreStateRef\.current = coreState;/u
  );
  assert.doesNotMatch(
    source,
    /const currentUserRef = useRef<AppShellUserSafe \| null>\(currentUser\);\s*currentUserRef\.current = currentUser;/u
  );
  assert.match(
    source,
    /useLayoutEffect\(\(\) => \{\s*coreStateRef\.current = coreState;\s*currentUserRef\.current = currentUser;/u
  );
  assert.match(source, /user === null[\s\S]*?broadcastSessionChange\(null\)[\s\S]*?clearLocalSession\(\)/u);
  assert.match(source, /if \(isRoleProtectedPath\(currentPathname\)\)[\s\S]*?window\.location\.reload\(\)/u);
  assert.match(source, /if \(sameUser\) \{[\s\S]*?refreshMistakeRecords\(\)[\s\S]*?setPendingLearningEvents/u);
  assert.match(
    source,
    /responseCode === "account-updated-session-refresh-required"[\s\S]*?broadcastSessionChange\(null\)[\s\S]*?window\.location\.replace/u
  );
  assert.doesNotMatch(source, /let lastCheckAt = Date\.now\(\)/u);
});

test("per-user mistake and lesson-entry reads cannot repopulate a replacement identity", async () => {
  const source = await providerSource();

  assert.match(source, /mistakeReadGenerationRef/u);
  assert.match(source, /mistakeReadAbortRef/u);
  assert.match(source, /lessonEntryReadGenerationRef/u);
  assert.match(source, /lessonEntryReadAbortRef/u);
  assert.match(source, /requestedUserRole/u);
  assert.match(
    source,
    /sameAccountBoundary\(currentUserRef\.current, \{ id: requestedUserId, role: requestedUserRole \}\)/u
  );
  assert.match(source, /setMistakeRecords\(\[\]\)/u);
});

test("same-account settings remain ordered, dirty-aware, and retryable", async () => {
  const source = await providerSource();

  assert.match(source, /settingsDirtyRef/u);
  assert.match(source, /settingsRetryNonce/u);
  assert.match(source, /pendingSettingsKeyRef\.current !== null \|\|\s*settingsDirtyRef\.current/u);
  assert.doesNotMatch(source, /window\.setTimeout\(\(\) => controller\.abort\(\), 10_000\)/u);
  assert.doesNotMatch(
    source,
    /pendingSettingsKeyRef\.current !== nextSettingsKey\s*\) \{\s*settingsWriteAbortRef\.current\?\.abort\(\)/u
  );
});

test("identity-changing auth responses remain gated until a full document replacement", async () => {
  const [provider, loginPage, registerPage, resetPage, navbar] = await Promise.all([
    providerSource(),
    readFile(path.join(process.cwd(), "app/login/page.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "app/register/page.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "app/reset-password/page.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "components/layout/Navbar.tsx"), "utf8")
  ]);

  assert.match(provider, /const beginAuthenticatedDocumentTransition/u);
  assert.match(
    provider,
    /beginAuthenticatedDocumentTransition[\s\S]*?flushSync\(\(\) => quarantineForSessionCheck\("identity"\)\)[\s\S]*?authEpochRef\.current \+= 1[\s\S]*?broadcastSessionChange/u
  );
  assert.equal(
    provider.match(/beginAuthenticatedDocumentTransition\(session\)/gu)?.length,
    3,
    "login, register and reset confirmation must all use the document transition"
  );
  assert.doesNotMatch(provider, /locallyAuthorizedBootstrapTargetRef/u);
  assert.doesNotMatch(provider, /locallyAuthorizedTarget/u);
  assert.match(loginPage, /window\.location\.replace\(routeTarget\)/u);
  assert.doesNotMatch(loginPage, /router\.(?:replace|push)\(routeTarget\)/u);
  assert.match(registerPage, /window\.location\.replace\(successRedirect\)/u);
  assert.match(resetPage, /window\.location\.replace\(workspaceForRole\(result\.role\)\)/u);
  assert.match(navbar, /const handleLogout[\s\S]*?await logout\(\);/u);
  assert.doesNotMatch(
    navbar,
    /const handleLogout[\s\S]*?await logout\(\);[\s\S]*?router\.(?:replace|push)\("\/login"\)/u
  );
});

test("authenticated root documents remain React-gated until authoritative mount validation", async () => {
  const [layout, provider] = await Promise.all([
    readFile(path.join(process.cwd(), "app/layout.tsx"), "utf8"),
    providerSource()
  ]);

  assert.doesNotMatch(layout, /preHydrationSessionGuardScript/u);
  assert.doesNotMatch(layout, /import Script from "next\/script"/u);
  assert.doesNotMatch(layout, /data-mais-prehydrate-privacy-cover/u);
  assert.match(provider, /const initialSessionVerificationMode[\s\S]*initialBootstrap\.kind === "authenticated"[\s\S]*\? "identity"[\s\S]*: "none"/u);
  assert.match(provider, /const initialSessionVerificationPending = initialSessionVerificationMode !== "none"/u);
  assert.match(provider, /accountWorkBlockedRef = useRef\(initialSessionVerificationPending\)/u);
  assert.match(provider, /void revalidateSession\(mountedIdentity, true\)/u);
  assert.doesNotMatch(provider, /appShellPreHydrationBlockAttribute/u);
});
