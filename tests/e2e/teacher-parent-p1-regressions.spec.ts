import { expect, request as apiRequest, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  collectPageErrors,
  demoParent,
  demoParentUserId,
  demoStudent,
  demoTeacher,
  demoTeacherUserId
} from "./helpers";
import { startIsolatedApp, type IsolatedApp } from "./isolated-app";

test.setTimeout(180_000);

type LiveSessionPayload = {
  session: {
    id: string;
    joinCode: string;
    currentPrompt?: { id: string };
  };
};

async function loginContext(app: IsolatedApp, username: string, password: string) {
  const context = await apiRequest.newContext({ baseURL: app.baseURL });
  const response = await context.post("/api/auth/login", {
    data: {
      username,
      password,
      grade: "S3",
      language: "en",
      theme: "light"
    }
  });
  expect(response.ok(), `login ${username} failed with ${response.status()}`).toBeTruthy();
  return context;
}

async function disposeContexts(contexts: APIRequestContext[]) {
  await Promise.all(contexts.map(async (context) => {
    await context.dispose().catch(() => undefined);
  }));
}

async function writeSessionSyncSignal(page: Page, userId: string, userRole: string) {
  await page.evaluate(({ storageKey, userId: nextUserId, userRole: nextUserRole }) => {
    window.localStorage.setItem(storageKey, JSON.stringify({
      userId: nextUserId,
      userRole: nextUserRole,
      at: Date.now()
    }));
  }, {
    storageKey: "hk-math-session-sync",
    userId,
    userRole
  });
}

type ParentHydrationSignature = {
  language: string | null;
  dark: boolean;
  parentNavigationLabel: string | null;
  hasGuestLogin: boolean;
  hasParentAccount: boolean;
  hasLogout: boolean;
  languageSelectorLabel: string | null;
  themeActionLabel: string | null;
  parentShellCount: number;
};

async function readParentHydrationSignature(page: Page, responseHtml: string | null): Promise<ParentHydrationSignature> {
  return page.evaluate((source) => {
    const sourceDocument = source === null
      ? document
      : new DOMParser().parseFromString(source, "text/html");
    const root = sourceDocument.documentElement;
    const globalHeader = sourceDocument.querySelector("body > div.relative > header");
    const parentNavigation = sourceDocument.querySelector("[data-parent-shell] nav");
    const labelledButtons = Array.from(globalHeader?.querySelectorAll<HTMLButtonElement>("button[aria-label]") ?? []);
    const themeActionLabel = labelledButtons
      .map((button) => button.getAttribute("aria-label"))
      .find((label): label is string => Boolean(label && /(?:Switch to (?:light|dark) mode|切換至[淺深]色模式)/u.test(label))) ?? null;

    return {
      language: root.getAttribute("lang"),
      dark: root.classList.contains("dark"),
      parentNavigationLabel: parentNavigation?.getAttribute("aria-label") ?? null,
      hasGuestLogin: Boolean(globalHeader?.querySelector('a[href="/login"]')),
      hasParentAccount: Boolean(globalHeader?.querySelector('a[href="/parent"]')),
      hasLogout: Boolean(globalHeader?.querySelector('button[aria-label="登出"]')),
      languageSelectorLabel: globalHeader
        ?.querySelector('button[aria-haspopup="menu"]')
        ?.getAttribute("aria-label") ?? null,
      themeActionLabel,
      parentShellCount: sourceDocument.querySelectorAll("[data-parent-shell]").length
    };
  }, responseHtml);
}

test.describe("teacher and parent P1 regressions", () => {
  test.describe.configure({ retries: 0 });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "P1 regression coverage runs once on desktop Chrome.");
  });

  test("ended live-classroom join codes are no longer readable by students", async ({}, testInfo) => {
    const app = await startIsolatedApp("live-classroom-lifecycle-p1", testInfo);
    const contexts: APIRequestContext[] = [];

    try {
      const teacher = await loginContext(app, demoTeacher.username, demoTeacher.password);
      const student = await loginContext(app, demoStudent.username, demoStudent.password);
      contexts.push(teacher, student);

      const liveStart = await teacher.post("/api/teacher/live", {
        data: {
          classId: "class-s3a-2026",
          promptType: "poll",
          question: "Lifecycle regression prompt",
          correctOptionId: "a",
          topicId: "quadratic-functions"
        }
      });
      expect(liveStart.status()).toBe(201);
      const livePayload = await liveStart.json() as LiveSessionPayload;
      expect(livePayload.session.joinCode).toBeTruthy();
      expect(livePayload.session.currentPrompt?.id).toBeTruthy();

      const activeStudentJoin = await student.get(`/api/classroom/live?code=${encodeURIComponent(livePayload.session.joinCode)}`);
      expect(activeStudentJoin.status()).toBe(200);

      const liveEnd = await teacher.patch("/api/teacher/live", {
        data: { sessionId: livePayload.session.id, status: "ended" }
      });
      expect(liveEnd.status()).toBe(200);

      const endedStudentJoin = await student.get(`/api/classroom/live?code=${encodeURIComponent(livePayload.session.joinCode)}`);
      expect(endedStudentJoin.status()).toBe(404);

      const endedTeacherPreview = await teacher.get(`/api/classroom/live?code=${encodeURIComponent(livePayload.session.joinCode)}`);
      expect(endedTeacherPreview.status()).toBe(200);
    } finally {
      await disposeContexts(contexts);
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });

  test("teacher and parent SSR timestamps hydrate without page errors across UTC server and Hong Kong browser", async ({ browser }, testInfo) => {
    const app = await startIsolatedApp("teacher-parent-hydration-p1", testInfo, {
      env: { TZ: "UTC" }
    });
    const context = await browser.newContext({
      baseURL: app.baseURL,
      timezoneId: "Asia/Hong_Kong"
    });

    try {
      const teacherLogin = await context.request.post("/api/auth/login", {
        data: {
          username: demoTeacher.username,
          password: demoTeacher.password,
          grade: "S3",
          language: "en",
          theme: "light"
        }
      });
      expect(teacherLogin.status()).toBe(200);
      const teacherPage = await context.newPage();
      const teacherErrors = collectPageErrors(teacherPage);
      for (const route of ["/teacher", "/teacher/reports", "/teacher/rewards", "/teacher/classes/class-s3a-2026"]) {
        await teacherPage.goto(route);
        await expect(teacherPage.locator("main")).toBeVisible();
        expect(teacherErrors, `teacher hydration errors after ${route}`).toEqual([]);
      }

      const parentLogin = await context.request.post("/api/auth/login", {
        data: {
          username: demoParent.username,
          password: demoParent.password,
          grade: "S3",
          language: "zh",
          theme: "dark"
        }
      });
      expect(parentLogin.status()).toBe(200);
      const parentSession = await parentLogin.json() as {
        user?: { id?: unknown; role?: unknown };
      };
      expect(parentSession.user).toMatchObject({
        id: demoParentUserId,
        role: "parent"
      });

      // APIRequestContext only replaces the shared HttpOnly cookie. The real
      // client login path also publishes the matching durable identity before
      // replacing the document, so mirror that browser-side step explicitly.
      await writeSessionSyncSignal(teacherPage, demoParentUserId, "parent");

      const parentPage = await context.newPage();
      const parentErrors = collectPageErrors(parentPage);
      let initialSessionStateRequests = 0;
      parentPage.on("request", (request) => {
        if (new URL(request.url()).pathname === "/api/auth/session-state") initialSessionStateRequests += 1;
      });

      const firstParentResponse = await parentPage.goto("/parent/notices?studentId=student-peter", {
        waitUntil: "domcontentloaded"
      });
      expect(firstParentResponse?.status()).toBe(200);
      const firstParentHtml = await firstParentResponse!.text();
      const serverSignature = await readParentHydrationSignature(parentPage, firstParentHtml);

      const languageTrigger = parentPage.locator('header button[aria-haspopup="menu"]').first();
      await expect(languageTrigger).toBeVisible();
      await expect.poll(async () => {
        if ((await languageTrigger.getAttribute("aria-expanded")) !== "true") {
          await languageTrigger.click();
        }
        return languageTrigger.getAttribute("aria-expanded");
      }, { timeout: 8_000 }).toBe("true");
      await expect(parentPage.getByRole("menu")).toBeVisible();
      await parentPage.keyboard.press("Escape");
      await expect(parentPage.getByRole("menu")).toBeHidden();
      const firstClientSignature = await readParentHydrationSignature(parentPage, null);
      const expectedServerSignature: ParentHydrationSignature = {
        language: "zh-Hant-HK",
        dark: true,
        parentNavigationLabel: null,
        hasGuestLogin: false,
        hasParentAccount: false,
        hasLogout: false,
        languageSelectorLabel: null,
        themeActionLabel: null,
        parentShellCount: 0
      };
      const expectedClientSignature: ParentHydrationSignature = {
        language: "zh-Hant-HK",
        dark: true,
        parentNavigationLabel: "家長導覽",
        hasGuestLogin: false,
        hasParentAccount: true,
        hasLogout: true,
        languageSelectorLabel: "語言選擇",
        themeActionLabel: "切換至淺色模式",
        parentShellCount: 1
      };
      expect(
        { server: serverSignature, firstClient: firstClientSignature },
        "authenticated HTML must expose only neutral loading until the cookie is authoritatively revalidated"
      ).toEqual({ server: expectedServerSignature, firstClient: expectedClientSignature });
      expect(firstParentHtml).toContain('data-session-verification-mode="initial"');
      expect(firstParentHtml).toContain("正在載入你的工作空間");
      expect(firstParentHtml).not.toContain("For your privacy");
      expect(firstParentHtml).not.toContain("Check again");
      expect(firstParentHtml).not.toContain('data-parent-shell="true"');
      expect(initialSessionStateRequests, "an authenticated document must perform exactly one mount-time cookie validation").toBe(1);
      expect(parentErrors, "parent hydration errors after the first interactive document").toEqual([]);

      for (const route of [
        "/parent",
        "/parent/reports",
        "/parent/notices?studentId=student-peter",
        "/parent/messages?studentId=student-peter",
        "/parent/children/student-peter"
      ]) {
        await parentPage.goto(route);
        await expect(parentPage.locator("main")).toBeVisible();
        await expect(parentPage.locator("[data-parent-shell]"), `one parent shell after ${route}`).toHaveCount(1);
        await expect(parentPage.locator("html"), `server-seeded language after ${route}`).toHaveAttribute("lang", "zh-Hant-HK");
        await expect(parentPage.locator("html"), `server-seeded theme after ${route}`).toHaveClass(/\bdark\b/u);
        expect(parentErrors, `parent hydration errors after ${route}`).toEqual([]);
      }

      // A failed mount-time check stays neutral and offers an explicit retry
      // only after the failure. Retrying must complete the authoritative check
      // and mount the same parent account without any privacy-warning copy.
      const retryPage = await context.newPage();
      let retryPageSessionChecks = 0;
      await retryPage.route("**/api/auth/session-state**", async (route) => {
        retryPageSessionChecks += 1;
        if (retryPageSessionChecks === 1) {
          await route.abort("failed");
          return;
        }
        await route.continue();
      });
      await retryPage.goto("/parent", { waitUntil: "domcontentloaded" });
      const retryPageInitialGate = retryPage.locator(
        '[data-session-verification-gate="true"][data-session-verification-mode="initial"]'
      );
      await expect(retryPageInitialGate).toBeVisible();
      await expect(retryPage.getByRole("heading", { name: "正在載入你的工作空間" })).toBeVisible();
      await expect(retryPage.getByText(/私隱|隐私|privacy/iu)).toHaveCount(0);
      await expect(retryPage.locator("[data-parent-shell]")).toHaveCount(0);
      const retrySessionButton = retryPage.getByRole("button", { name: "再試一次" });
      await expect(retrySessionButton).toBeVisible({ timeout: 3_000 });
      await retrySessionButton.click();
      await expect.poll(() => retryPageSessionChecks, { timeout: 3_000 }).toBe(2);
      await expect(retryPageInitialGate).toHaveCount(0, { timeout: 15_000 });
      await expect(retryPage.locator("[data-parent-shell]")).toHaveCount(1);
      await retryPage.close();

      const parentHtml = await (await parentPage.request.get("/parent")).text();
      expect(parentHtml).not.toContain('<template id="B:');
      expect(parentHtml).not.toContain('<div hidden id="S:');
    } finally {
      await context.close();
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });

  test("cross-tab identity replacement quarantines stale parent content before session validation returns", async ({ browser }, testInfo) => {
    const app = await startIsolatedApp("parent-cross-tab-session-quarantine-p1", testInfo);
    const context = await browser.newContext({ baseURL: app.baseURL });
    let releaseSessionState: () => void = () => undefined;
    let releasePreHydrationChunks: () => void = () => undefined;
    let releasePreHydrationSessionState: () => void = () => undefined;
    let releaseStaleParentRsc: () => void = () => undefined;

    try {
      const parentLogin = await context.request.post("/api/auth/login", {
        data: {
          username: demoParent.username,
          password: demoParent.password,
          grade: "S3",
          language: "en",
          theme: "light"
        }
      });
      expect(parentLogin.status()).toBe(200);
      const parentSession = await parentLogin.json() as { user?: { id?: unknown; role?: unknown } };
      expect(parentSession.user).toMatchObject({ id: demoParentUserId, role: "parent" });

      const preHydrationSignalWriter = await context.newPage();
      await preHydrationSignalWriter.goto("/login", { waitUntil: "domcontentloaded" });
      await writeSessionSyncSignal(preHydrationSignalWriter, demoParentUserId, "parent");

      // Prove the server/client-coherent identity gate closes the gap between
      // an A-scoped response and listener installation. Hold every Next chunk,
      // replace the shared cookie with teacher B, persist B's durable signal,
      // and only then let AppProviders mount. No A-scoped account tree may be
      // present before or during the authoritative session check.
      const preHydrationPage = await context.newPage();
      const heldPreHydrationChunks = new Promise<void>((resolve) => {
        let released = false;
        releasePreHydrationChunks = () => {
          if (released) return;
          released = true;
          resolve();
        };
      });
      await preHydrationPage.route("**/_next/static/chunks/**", async (route) => {
        await heldPreHydrationChunks;
        await route.continue();
      });
      let preHydrationSessionStateRequests = 0;
      const heldPreHydrationSessionState = new Promise<void>((resolve) => {
        let released = false;
        releasePreHydrationSessionState = () => {
          if (released) return;
          released = true;
          resolve();
        };
      });
      await preHydrationPage.route("**/api/auth/session-state**", async (route) => {
        preHydrationSessionStateRequests += 1;
        await heldPreHydrationSessionState;
        await route.continue();
      });

      await preHydrationPage.goto("/parent/messages?studentId=student-peter", { waitUntil: "commit" });
      const preHydrationInitialGate = preHydrationPage.locator(
        '[data-session-verification-gate="true"][data-session-verification-mode="initial"]'
      );
      await expect(preHydrationInitialGate).toBeAttached();
      await expect(preHydrationPage.locator("[data-parent-shell]")).toHaveCount(0);
      await expect(preHydrationPage.getByText("Peter's Parent", { exact: true })).toHaveCount(0);

      // A storage event is never dispatched back to the window that performs
      // localStorage.setItem. Use a second same-origin document so the later
      // mount-time reconciliation observes a target that differs from the
      // response identity while the SSR identity gate remains in place.
      const preHydrationTeacherLogin = await context.request.post("/api/auth/login", {
        data: {
          username: demoTeacher.username,
          password: demoTeacher.password,
          grade: "S3",
          language: "en",
          theme: "light"
        }
      });
      expect(preHydrationTeacherLogin.status()).toBe(200);
      await writeSessionSyncSignal(preHydrationSignalWriter, demoTeacherUserId, "teacher");

      await expect(preHydrationInitialGate).toBeVisible({ timeout: 3_000 });
      await expect(preHydrationPage.locator("[data-parent-shell]")).toHaveCount(0);
      await expect(preHydrationPage.getByText("Peter's Parent", { exact: true })).toHaveCount(0);

      releasePreHydrationChunks();
      await preHydrationPage.waitForLoadState("domcontentloaded");
      const preHydrationIdentityGate = preHydrationPage.locator(
        '[data-session-verification-gate="true"][data-session-verification-mode="identity"]'
      );
      await expect(preHydrationIdentityGate).toBeVisible({ timeout: 8_000 });
      await expect.poll(() => preHydrationSessionStateRequests, { timeout: 3_000 }).toBe(1);
      await expect(preHydrationPage.locator("[data-parent-shell]")).toHaveCount(0);
      await expect(preHydrationPage.getByText("Peter's Parent", { exact: true })).toHaveCount(0);

      releasePreHydrationSessionState();
      await expect(preHydrationPage).toHaveURL(/\/login(?:\?|$)/u, { timeout: 15_000 });
      await preHydrationSignalWriter.close();

      // Restore the parent cookie and durable signal for the two existing
      // hydrated foreground/identity phases below.
      const restoredParentLogin = await context.request.post("/api/auth/login", {
        data: {
          username: demoParent.username,
          password: demoParent.password,
          grade: "S3",
          language: "en",
          theme: "light"
        }
      });
      expect(restoredParentLogin.status()).toBe(200);
      await writeSessionSyncSignal(preHydrationPage, demoParentUserId, "parent");
      await preHydrationPage.close();

      const parentPage = await context.newPage();
      const heldStaleParentRsc = new Promise<void>((resolve) => {
        let released = false;
        releaseStaleParentRsc = () => {
          if (released) return;
          released = true;
          resolve();
        };
      });
      let markStaleParentRscReady: () => void = () => undefined;
      const staleParentRscReady = new Promise<void>((resolve) => {
        markStaleParentRscReady = resolve;
      });
      let markStaleParentRscDelivered: (state: "fulfilled" | "failed") => void = () => undefined;
      const staleParentRscDelivered = new Promise<"fulfilled" | "failed">((resolve) => {
        markStaleParentRscDelivered = resolve;
      });
      await parentPage.route("**/parent/reports**", async (route) => {
        if (route.request().headers().rsc !== "1") {
          await route.continue();
          return;
        }
        // Capture the complete A-scoped response now, while A's cookie is
        // still active, but withhold it from Next until B's identity gate is
        // already waiting on session-state.
        const staleResponse = await route.fetch();
        markStaleParentRscReady();
        await heldStaleParentRsc;
        try {
          await route.fulfill({ response: staleResponse });
          markStaleParentRscDelivered("fulfilled");
        } catch (error) {
          markStaleParentRscDelivered("failed");
          throw error;
        }
      });
      await parentPage.goto("/parent/messages?studentId=student-peter", { waitUntil: "domcontentloaded" });
      await expect(parentPage.locator("[data-parent-shell]")).toBeVisible();
      await expect(parentPage.getByText("Peter's Parent", { exact: true }).first()).toBeVisible();
      await expect(parentPage.getByRole("option", { name: /HK Student Peter/u }).first()).toBeAttached();

      // Bring the account document through any foreground check before the
      // test deliberately holds that check below. Filling React-controlled
      // message inputs then proves hydration without changing page focus.
      await parentPage.bringToFront();
      await expect(parentPage.locator('[data-session-verification-gate="true"]')).toHaveCount(0);
      const languageTrigger = parentPage.locator('header button[aria-haspopup="menu"]').first();
      await expect.poll(async () => {
        if ((await languageTrigger.getAttribute("aria-expanded")) !== "true") {
          await languageTrigger.click();
        }
        return languageTrigger.getAttribute("aria-expanded");
      }, { timeout: 8_000 }).toBe("true");
      await parentPage.keyboard.press("Escape");
      const composeForm = parentPage.locator('form[aria-labelledby="parent-ask-teacher-heading"]');
      const draftSubjectInput = composeForm.locator('[name="subject"]');
      const draftBodyInput = composeForm.locator('[name="body"]');
      const parentMessagesLayout = parentPage.locator('[data-parent-messages-layout="three-panel"]');
      const foregroundDraftSubject = "Foreground verification draft";
      const foregroundDraftBody = "This text must remain mounted while the same parent session is verified.";
      await expect(composeForm).toBeVisible();
      await draftSubjectInput.fill(foregroundDraftSubject);
      await draftBodyInput.fill(foregroundDraftBody);
      await expect(draftSubjectInput).toHaveValue(foregroundDraftSubject);
      await expect(draftBodyInput).toHaveValue(foregroundDraftBody);

      let sessionStateRequests = 0;
      let failNextSessionState = false;
      let activeSessionStateHold = Promise.resolve();
      const armSessionStateHold = () => {
        let phaseReleased = false;
        let releasePhase: () => void = () => undefined;
        activeSessionStateHold = new Promise<void>((resolve) => {
          releasePhase = () => {
            if (phaseReleased) return;
            phaseReleased = true;
            resolve();
          };
        });
        releaseSessionState = releasePhase;
        return {
          requestBaseline: sessionStateRequests,
          release: releasePhase,
          isReleased: () => phaseReleased
        };
      };
      await parentPage.route("**/api/auth/session-state**", async (route) => {
        sessionStateRequests += 1;
        if (failNextSessionState) {
          failNextSessionState = false;
          await route.abort("failed");
          return;
        }
        const holdForThisRequest = activeSessionStateHold;
        await holdForThisRequest;
        await route.continue();
      });

      const accountBoundMutations: Array<{
        method: string;
        pathname: string;
        expectedUserId: string | null;
      }> = [];
      parentPage.on("request", (request) => {
        const method = request.method();
        const pathname = new URL(request.url()).pathname;
        if (!new Set(["POST", "PATCH", "DELETE"]).has(method)) return;
        if (!/^\/api\/(?:parent\/|learning-events|lesson-entry|attempts(?:\/|$)|ai-tutor(?:\/|$)|me\/(?:profile|settings)|media-objects|mistakes(?:\/|$))/u.test(pathname)) return;

        let bodyExpectedUserId: string | null = null;
        const rawBody = request.postData();
        if (rawBody) {
          try {
            const parsed = JSON.parse(rawBody) as { expectedUserId?: unknown };
            if (typeof parsed.expectedUserId === "string") bodyExpectedUserId = parsed.expectedUserId;
          } catch {
            // A beacon body may not be JSON-readable here; its guarded endpoint
            // is still rejected below unless it also carries the expected id.
          }
        }
        accountBoundMutations.push({
          method,
          pathname,
          expectedUserId: request.headers()["x-mais-expected-user-id"] ?? bodyExpectedUserId
        });
      });

      // Model a React portal such as SubwayNetworkMap's document.body portal.
      // It is a separate body child from the normal app-rendered nodes.
      await parentPage.evaluate(() => {
        const portalButton = document.createElement("button");
        portalButton.type = "button";
        portalButton.dataset.testForegroundPortal = "true";
        portalButton.textContent = "Detached account portal";
        document.body.append(portalButton);
      });
      const detachedPortal = parentPage.locator('[data-test-foreground-portal="true"]');
      await expect(detachedPortal).toBeVisible();

      // A normal blur (including macOS screenshot UI, app switching, and tab
      // switching) must not replace, hide, or inert the account UI. Returning
      // focus silently checks the cookie while preserving the mounted tree.
      const foregroundHold = armSessionStateHold();
      const sessionGate = parentPage.locator('[data-session-verification-gate="true"]');
      await parentPage.evaluate(() => window.dispatchEvent(new Event("blur")));
      await expect(sessionGate).toHaveCount(0);
      await expect(parentMessagesLayout).toBeVisible();
      await expect(detachedPortal).toBeVisible();
      expect(sessionStateRequests).toBe(foregroundHold.requestBaseline);

      await parentPage.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect.poll(
        () => sessionStateRequests,
        { timeout: 3_000 }
      ).toBe(foregroundHold.requestBaseline + 1);
      expect(
        foregroundHold.isReleased(),
        "silent foreground validation must remain held until the test releases it"
      ).toBe(false);
      await expect(sessionGate).toHaveCount(0);
      await expect(parentMessagesLayout).toHaveCount(1);
      await expect(parentMessagesLayout).toBeVisible();
      await expect(draftSubjectInput).toHaveCount(1);
      await expect(draftBodyInput).toHaveCount(1);
      await expect(draftSubjectInput).toHaveValue(foregroundDraftSubject);
      await expect(draftBodyInput).toHaveValue(foregroundDraftBody);
      expect(await detachedPortal.evaluate((node) => ({
        inert: (node as HTMLElement).inert,
        ariaHidden: node.getAttribute("aria-hidden")
      }))).toEqual({ inert: false, ariaHidden: null });

      foregroundHold.release();
      await expect(sessionGate).toHaveCount(0, { timeout: 15_000 });
      await expect(parentMessagesLayout).toBeVisible();
      await expect(draftSubjectInput).toHaveValue(foregroundDraftSubject);
      await expect(draftBodyInput).toHaveValue(foregroundDraftBody);
      await expect(parentPage).toHaveURL(/\/parent\/messages\?studentId=student-peter$/u);
      await expect(detachedPortal).toBeVisible();
      expect(await detachedPortal.evaluate((node) => ({
        inert: (node as HTMLElement).inert,
        ariaHidden: node.getAttribute("aria-hidden")
      }))).toEqual({ inert: false, ariaHidden: null });

      // A transient foreground-check transport failure must likewise leave
      // the same-account UI mounted and usable instead of trapping the user in
      // a full-screen retry state.
      const failedForegroundBaseline = sessionStateRequests;
      failNextSessionState = true;
      await parentPage.evaluate(() => {
        window.dispatchEvent(new Event("blur"));
        window.dispatchEvent(new Event("focus"));
      });
      await expect.poll(() => sessionStateRequests, { timeout: 3_000 })
        .toBe(failedForegroundBaseline + 1);
      await parentPage.waitForTimeout(250);
      await expect(sessionGate).toHaveCount(0);
      await expect(parentMessagesLayout).toBeVisible();
      await expect(draftSubjectInput).toHaveValue(foregroundDraftSubject);
      await expect(draftBodyInput).toHaveValue(foregroundDraftBody);
      await expect(detachedPortal).toBeVisible();
      await detachedPortal.evaluate((node) => node.remove());

      // Start an A-scoped RSC navigation and keep its complete response held.
      // It will be delivered only after the real B login has raised the gate.
      const reportsLink = parentPage
        .getByRole("navigation", { name: "Parent navigation" })
        .getByRole("link", { name: "Reports", exact: true });
      await expect(reportsLink).toHaveAttribute("href", /^\/parent\/reports(?:\?|$)/u);
      await reportsLink.evaluate((link) => (link as HTMLAnchorElement).click());
      await staleParentRscReady;

      // Register after AppProviders so this listener runs later in the same
      // native storage-event task. Its stale click probes the narrow interval
      // before React unmounts A, while the provider's synchronous block ref
      // must already reject the settings write.
      const nativeStorageProbeInstalled = await parentPage.evaluate(({
        storageKey,
        replacementUserId
      }) => {
        const staleThemeButton = document.querySelector<HTMLButtonElement>(
          'header button[aria-label="Switch to dark mode"]'
        );
        if (!staleThemeButton) return false;
        const receiver = window as typeof window & { __maisNativeSessionSignalSeen?: boolean };
        const handleNativeStorage = (event: StorageEvent) => {
          if (event.key !== storageKey || !event.newValue) return;
          try {
            const payload = JSON.parse(event.newValue) as { userId?: unknown; userRole?: unknown };
            if (payload.userId !== replacementUserId || payload.userRole !== "teacher") return;
          } catch {
            return;
          }
          receiver.__maisNativeSessionSignalSeen = true;
          window.removeEventListener("storage", handleNativeStorage);
          staleThemeButton.click();
        };
        window.addEventListener("storage", handleNativeStorage);
        return true;
      }, {
        storageKey: "hk-math-session-sync",
        replacementUserId: demoTeacherUserId
      });
      expect(nativeStorageProbeInstalled).toBe(true);

      const identityHold = armSessionStateHold();
      const teacherWriterPage = await context.newPage();
      await teacherWriterPage.goto("/login", { waitUntil: "domcontentloaded" });
      const teacherLoginForm = teacherWriterPage.locator('form[action="/api/auth/login"]');
      await teacherLoginForm.locator('[name="username"]').fill(demoTeacher.username);
      await teacherLoginForm.locator('[name="password"]').fill(demoTeacher.password);
      const teacherLoginSubmit = teacherLoginForm.locator('button[type="submit"]');
      await expect(teacherLoginSubmit).toBeEnabled();
      const teacherLoginResponsePromise = teacherWriterPage.waitForResponse((response) =>
        new URL(response.url()).pathname === "/api/auth/login" && response.request().method() === "POST"
      );
      await teacherLoginSubmit.click();
      const teacherLoginResponse = await teacherLoginResponsePromise;
      expect(teacherLoginResponse.status()).toBe(200);
      await expect(teacherWriterPage).toHaveURL(/\/teacher(?:\/|\?|$)/u, { timeout: 15_000 });
      await teacherWriterPage.waitForLoadState("domcontentloaded");
      await expect.poll(() => parentPage.evaluate(() =>
        Boolean((window as typeof window & { __maisNativeSessionSignalSeen?: boolean }).__maisNativeSessionSignalSeen)
      ), { timeout: 8_000 }).toBe(true);
      expect(await parentPage.evaluate((storageKey) => {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { userId?: unknown; userRole?: unknown };
        return { userId: parsed.userId, userRole: parsed.userRole };
      }, "hk-math-session-sync")).toEqual({ userId: demoTeacherUserId, userRole: "teacher" });

      const identityGate = parentPage.locator(
        '[data-session-verification-gate="true"][data-session-verification-mode="identity"]'
      );
      await expect(identityGate).toBeVisible({ timeout: 3_000 });
      await expect.poll(
        () => sessionStateRequests,
        { timeout: 3_000 }
      ).toBeGreaterThan(identityHold.requestBaseline);
      expect(identityHold.isReleased(), "the identity privacy gate must appear while session validation is held").toBe(false);
      await expect(parentPage.locator("[data-parent-shell]")).toHaveCount(0);
      await expect(parentPage.getByText("Peter's Parent", { exact: true })).toHaveCount(0);
      await expect(parentPage.getByRole("option", { name: /HK Student Peter/u })).toHaveCount(0);

      // Deliver a second native B signal and a real foreground transition while
      // B's RSC/document replacement is still unavailable. A B-in-memory match
      // must not clear the gate because the accepted server tree remains A.
      const requestsBeforeSecondSignal = sessionStateRequests;
      await teacherWriterPage.evaluate(({ storageKey, userId }) => {
        window.localStorage.setItem(storageKey, JSON.stringify({
          userId,
          userRole: "teacher",
          at: Date.now()
        }));
      }, { storageKey: "hk-math-session-sync", userId: demoTeacherUserId });
      await parentPage.bringToFront();
      await expect.poll(() => sessionStateRequests, { timeout: 3_000 })
        .toBeGreaterThan(requestsBeforeSecondSignal);
      await expect(identityGate).toBeVisible();
      await expect(parentPage.locator("[data-parent-shell]")).toHaveCount(0);

      // A's withheld RSC may now arrive, but it must neither abort the held
      // B session validation nor reopen A's server/client tree.
      releaseStaleParentRsc();
      expect(await staleParentRscDelivered).toBe("fulfilled");
      await expect(identityGate).toBeVisible();
      await expect(parentPage.locator("[data-parent-shell]")).toHaveCount(0);
      await expect(parentPage.getByText("Peter's Parent", { exact: true })).toHaveCount(0);

      // Let queued React effects run while the server check remains blocked.
      // The deliberately clicked stale theme action must not become a settings
      // write, and any other account-bound mutation must carry the old identity
      // so the server can reject it against the replacement cookie.
      await parentPage.waitForTimeout(600);
      expect(accountBoundMutations.filter((request) => request.pathname === "/api/me/settings")).toEqual([]);
      expect(accountBoundMutations.filter((request) => request.expectedUserId !== demoParentUserId)).toEqual([]);

      identityHold.release();
      await expect(parentPage).toHaveURL(/\/login(?:\?|$)/u, { timeout: 15_000 });
      await teacherWriterPage.close();
      await expect(identityGate).toHaveCount(0);
      await expect(parentPage.locator("[data-parent-shell]")).toHaveCount(0);
      await expect(parentPage.getByRole("option", { name: /HK Student Peter/u })).toHaveCount(0);
      expect(accountBoundMutations.filter((request) => request.expectedUserId === null)).toEqual([]);
    } finally {
      releasePreHydrationChunks();
      releasePreHydrationSessionState();
      releaseStaleParentRsc();
      releaseSessionState();
      await context.close();
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });

  test("same-role parent replacement keeps the hard gate until a fresh document belongs to the new family", async ({ browser }, testInfo) => {
    const app = await startIsolatedApp("parent-same-role-document-replacement-p1", testInfo);
    const setupContext = await apiRequest.newContext({ baseURL: app.baseURL });
    const context = await browser.newContext({ baseURL: app.baseURL });
    let releaseSessionState: () => void = () => undefined;
    let releaseReplacementDocument: () => void = () => undefined;

    try {
      const suffix = `${Date.now()}-${testInfo.workerIndex}`;
      const replacementParent = {
        name: `Replacement Parent ${suffix}`,
        username: `replacement-parent-${suffix}@example.test`,
        password: "start12345"
      };
      const registration = await setupContext.post("/api/auth/register", {
        data: {
          role: "parent",
          name: replacementParent.name,
          username: replacementParent.username,
          email: replacementParent.username,
          password: replacementParent.password,
          language: "en",
          theme: "light"
        }
      });
      expect(registration.status()).toBe(200);
      const replacementSession = await registration.json() as { user?: { id?: unknown; role?: unknown; name?: unknown } };
      expect(replacementSession.user).toMatchObject({ role: "parent", name: replacementParent.name });
      expect(typeof replacementSession.user?.id).toBe("string");
      const replacementParentId = replacementSession.user!.id as string;

      const originalLogin = await context.request.post("/api/auth/login", {
        data: {
          username: demoParent.username,
          password: demoParent.password,
          grade: "S3",
          language: "en",
          theme: "light"
        }
      });
      expect(originalLogin.status()).toBe(200);

      const initialSignalPage = await context.newPage();
      await initialSignalPage.goto("/login", { waitUntil: "domcontentloaded" });
      await writeSessionSyncSignal(initialSignalPage, demoParentUserId, "parent");
      await initialSignalPage.close();

      const parentPage = await context.newPage();
      await parentPage.goto("/parent/connect", { waitUntil: "domcontentloaded" });
      await expect(parentPage.locator("[data-parent-shell]")).toBeVisible();
      await expect(parentPage.getByText("Peter's Parent", { exact: true }).first()).toBeVisible();

      let sessionStateRequests = 0;
      const heldSessionState = new Promise<void>((resolve) => {
        let released = false;
        releaseSessionState = () => {
          if (released) return;
          released = true;
          resolve();
        };
      });
      await parentPage.route("**/api/auth/session-state**", async (route) => {
        sessionStateRequests += 1;
        await heldSessionState;
        await route.continue();
      });

      let markReplacementDocumentRequested: () => void = () => undefined;
      const replacementDocumentRequested = new Promise<void>((resolve) => {
        markReplacementDocumentRequested = resolve;
      });
      const heldReplacementDocument = new Promise<void>((resolve) => {
        let released = false;
        releaseReplacementDocument = () => {
          if (released) return;
          released = true;
          resolve();
        };
      });
      await parentPage.route("**/parent/connect", async (route) => {
        if (route.request().resourceType() !== "document") {
          await route.continue();
          return;
        }
        markReplacementDocumentRequested();
        await heldReplacementDocument;
        await route.continue();
      });

      const writerPage = await context.newPage();
      await writerPage.goto("/login", { waitUntil: "domcontentloaded" });
      const loginForm = writerPage.locator('form[action="/api/auth/login"]');
      await expect(loginForm).toBeVisible();
      await loginForm.locator('[name="username"]').fill(replacementParent.username);
      await loginForm.locator('[name="password"]').fill(replacementParent.password);
      const loginResponsePromise = writerPage.waitForResponse((response) =>
        new URL(response.url()).pathname === "/api/auth/login" && response.request().method() === "POST"
      );
      await loginForm.locator('button[type="submit"]').click();
      const loginResponse = await loginResponsePromise;
      expect(loginResponse.status()).toBe(200);
      await expect(writerPage).toHaveURL(/\/parent(?:\/|\?|$)/u, { timeout: 15_000 });

      const identityGate = parentPage.locator(
        '[data-session-verification-gate="true"][data-session-verification-mode="identity"]'
      );
      await expect(identityGate).toBeVisible({ timeout: 8_000 });
      await expect.poll(() => sessionStateRequests, { timeout: 5_000 }).toBeGreaterThan(0);
      await expect(parentPage.locator("[data-parent-shell]")).toHaveCount(0);
      await expect(parentPage.getByText("Peter's Parent", { exact: true })).toHaveCount(0);

      // Locator assertions auto-wait for an in-flight document navigation, so
      // they cannot inspect the deliberately held old document below. Record
      // every old-document mutation instead and carry the result through the
      // reload in sessionStorage. Any gate removal or A-shell reappearance is
      // sticky and therefore remains observable from B's fresh document.
      const oldDocumentProbeKey = `mais-parent-replacement-probe-${suffix}`;
      await parentPage.evaluate(({ probeKey, originalParentName }) => {
        type OldDocumentProbe = {
          beforeUnloadObserved: boolean;
          pageHideObserved: boolean;
          gateStayedVisible: boolean;
          originalUiStayedAbsent: boolean;
        };
        const readProbe = (): OldDocumentProbe => {
          const raw = window.sessionStorage.getItem(probeKey);
          if (!raw) {
            return {
              beforeUnloadObserved: false,
              pageHideObserved: false,
              gateStayedVisible: true,
              originalUiStayedAbsent: true
            };
          }
          return JSON.parse(raw) as OldDocumentProbe;
        };
        const recordSafety = ({
          beforeUnloadObserved = false,
          pageHideObserved = false
        }: {
          beforeUnloadObserved?: boolean;
          pageHideObserved?: boolean;
        } = {}) => {
          const previous = readProbe();
          const identityGate = document.querySelector(
            '[data-session-verification-gate="true"][data-session-verification-mode="identity"]'
          );
          const identityGateStyle = identityGate instanceof HTMLElement
            ? window.getComputedStyle(identityGate)
            : null;
          const identityGateRect = identityGate instanceof HTMLElement
            ? identityGate.getBoundingClientRect()
            : null;
          const identityGateIsVisible = Boolean(
            identityGate instanceof HTMLElement
            && !identityGate.hidden
            && identityGate.getAttribute("aria-hidden") !== "true"
            && identityGateStyle?.display !== "none"
            && identityGateStyle?.visibility !== "hidden"
            && Number(identityGateStyle?.opacity ?? "1") > 0
            && (identityGateRect?.width ?? 0) > 0
            && (identityGateRect?.height ?? 0) > 0
          );
          const parentShell = document.querySelector("[data-parent-shell]");
          const originalParentTextIsVisible = Array.from(
            document.querySelectorAll<HTMLElement>("body *")
          ).some((element) => {
            const hasDirectMatchingText = Array.from(element.childNodes).some((node) =>
              node.nodeType === Node.TEXT_NODE && node.textContent?.includes(originalParentName)
            );
            if (!hasDirectMatchingText || element.hidden || element.getAttribute("aria-hidden") === "true") {
              return false;
            }
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== "none"
              && style.visibility !== "hidden"
              && Number(style.opacity || "1") > 0
              && rect.width > 0
              && rect.height > 0;
          });
          window.sessionStorage.setItem(probeKey, JSON.stringify({
            beforeUnloadObserved: previous.beforeUnloadObserved || beforeUnloadObserved,
            pageHideObserved: previous.pageHideObserved || pageHideObserved,
            gateStayedVisible: previous.gateStayedVisible && identityGateIsVisible,
            originalUiStayedAbsent:
              previous.originalUiStayedAbsent
              && !parentShell
              && !originalParentTextIsVisible
          } satisfies OldDocumentProbe));
        };

        recordSafety();
        const observer = new MutationObserver(() => recordSafety());
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true
        });
        window.addEventListener("beforeunload", () => {
          recordSafety({ beforeUnloadObserved: true });
        }, { once: true });
        window.addEventListener("pagehide", () => {
          recordSafety({ pageHideObserved: true });
          observer.disconnect();
        }, { once: true });
      }, { probeKey: oldDocumentProbeKey, originalParentName: "Peter's Parent" });

      releaseSessionState();
      await replacementDocumentRequested;
      await new Promise<void>((resolve) => setTimeout(resolve, 250));

      const replacementNavigation = parentPage.waitForEvent(
        "framenavigated",
        (frame) => frame === parentPage.mainFrame()
      );
      releaseReplacementDocument();
      await replacementNavigation;
      await parentPage.waitForLoadState("domcontentloaded");
      await expect(parentPage).toHaveURL(/\/parent\/connect$/u);
      expect(await parentPage.evaluate((probeKey) => {
        const raw = window.sessionStorage.getItem(probeKey);
        return raw ? JSON.parse(raw) : null;
      }, oldDocumentProbeKey)).toEqual({
        beforeUnloadObserved: true,
        pageHideObserved: true,
        gateStayedVisible: true,
        originalUiStayedAbsent: true
      });
      await expect(parentPage.getByText(replacementParent.name, { exact: true }).first()).toBeVisible();
      await expect(parentPage.getByText("Peter's Parent", { exact: true })).toHaveCount(0);
      await expect(parentPage.locator('[data-session-verification-gate="true"]')).toHaveCount(0);
      await writerPage.close();
    } finally {
      releaseSessionState();
      releaseReplacementDocument();
      await context.close();
      await setupContext.dispose();
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });
});
