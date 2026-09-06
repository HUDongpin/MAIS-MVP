import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

// Exercise the exact production browser controller and policy in a real Window, with
// every URL fulfilled locally. This fixture never talks to the app, a provider or a sink.
function browserFixture() {
  const modules = Object.fromEntries(["errorPolicy", "browserReporter"].map((name) => [
    `./${name}`,
    ts.transpileModule(readFileSync(path.join(process.cwd(), `lib/observability/${name}.ts`), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText
  ]));
  return `(() => {
    const sources = ${JSON.stringify(modules)}; const cache = {};
    function load(id) { if (cache[id]) return cache[id].exports;
      const module = { exports: {} }; cache[id] = module;
      new Function('require', 'module', 'exports', sources[id])(load, module, module.exports);
      return module.exports;
    }
    const api = load('./browserReporter');
    window.__observabilityFixture = { ...api, stop: api.installClientErrorListeners(window) };
  })();`;
}

async function prepare(page: Page, pagePath = "/teacher/private-learner") {
  const bodies: string[] = [];
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).pathname === "/api/observability/client-error") {
      bodies.push(route.request().postData() ?? "");
      await route.fulfill({ status: 204 });
    } else {
      await route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Observability fixture</title><main>Fixture</main>" });
    }
  });
  await page.goto(pagePath);
  await page.addScriptTag({ content: browserFixture() });
  return bodies;
}

type BrowserFixture = {
  stop: () => void;
  installClientErrorListeners: (target: Window) => () => void;
  reportClientErrorPayload: (value: unknown) => void;
};

declare global {
  interface Window { __observabilityFixture?: BrowserFixture }
}

test("browser errors, rejections and root-boundary reports are private, deduplicated and capped per document", async ({ page }) => {
  const bodies = await prepare(page);
  await page.evaluate(() => {
    const api = window.__observabilityFixture;
    if (!api) throw new Error("Observability fixture was not installed");
    const emit = (error: Error) => window.dispatchEvent(new ErrorEvent("error", { error, message: error.message }));
    emit(new TypeError("cannot read properties of private learner"));
    emit(new TypeError("cannot read properties of another private learner"));
    window.dispatchEvent(new PromiseRejectionEvent("unhandledrejection", { reason: "private learner draft", promise: Promise.resolve() }));
    api.reportClientErrorPayload({ name: "RenderError", message: "private root content", stack: "private stack", route: location.pathname, source: "global-error-boundary" });
    emit(new Error("failed to fetch private note"));
    emit(new RangeError("private range"));
    emit(Object.assign(new Error("loading chunk private failed"), { name: "ChunkLoadError" }));
  });
  await expect.poll(() => bodies.length).toBe(5);
  expect(bodies.join("\n")).not.toMatch(/private|learner|draft|stack"\s*:\s*"[^"\s]/i);
  const reports = bodies.map((body) => JSON.parse(body));
  expect(reports.filter((report) => report.name === "TypeError")).toHaveLength(1);
  expect(reports.some((report) => report.source === "unhandledrejection")).toBe(true);
  expect(reports.some((report) => report.source === "global-error-boundary")).toBe(true);
  expect(reports.every((report) => report.route === "/teacher/[path]" && report.stack === "")).toBe(true);
});

test("the first report omits the private page referrer while retaining its same-origin header", async ({ page }) => {
  await prepare(page, "/teacher/private-learner?draft=private-note");
  const pending = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/observability/client-error");
  await page.evaluate(() => {
    window.__observabilityFixture?.reportClientErrorPayload({
      name: "Error", message: "private-note", route: location.pathname, source: "window.onerror"
    });
  });
  const request = await pending;
  const headers = await request.allHeaders();
  expect(headers.referer).toBeUndefined();
  expect(headers.origin).toBe(new URL(page.url()).origin);
  expect(Object.values(headers).join("\n")).not.toMatch(/private-learner|private-note/);
});

test("cleanup removes listeners and reinstalling does not reset the document budget", async ({ page }) => {
  const bodies = await prepare(page);
  await page.evaluate(() => {
    const api = window.__observabilityFixture;
    if (!api) throw new Error("Observability fixture was not installed");
    api.stop();
    window.dispatchEvent(new ErrorEvent("error", { error: new TypeError("private before reinstall") }));
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(bodies).toHaveLength(0);
  await page.evaluate(() => {
    const api = window.__observabilityFixture;
    if (!api) throw new Error("Observability fixture was not installed");
    api.stop = api.installClientErrorListeners(window);
    for (const name of ["TypeError", "RangeError", "SyntaxError", "ReferenceError", "AbortError", "ChunkLoadError"]) {
      window.dispatchEvent(new ErrorEvent("error", { error: Object.assign(new Error("private"), { name }) }));
    }
    api.stop(); api.stop = api.installClientErrorListeners(window);
    window.dispatchEvent(new ErrorEvent("error", { error: Object.assign(new Error("private after remount"), { name: "RenderError" }) }));
  });
  await expect.poll(() => bodies.length).toBe(5);
  expect(bodies.map((body) => JSON.parse(body).name)).toEqual(["TypeError", "RangeError", "SyntaxError", "ReferenceError", "AbortError"]);
  expect(bodies.join("\n")).not.toContain("private");
});
