import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLoginRedirectUrl } from "./middlewareRedirect";

test("protected-route login redirect preserves the middleware request URL host", () => {
  const redirectUrl = buildLoginRedirectUrl({
    pathname: "/dashboard",
    requestUrl: "http://127.0.0.1:3051/dashboard"
  });

  assert.equal(redirectUrl.toString(), "http://127.0.0.1:3051/login?next=%2Fdashboard");
});

test("protected-route login redirect keeps query params in the next destination", () => {
  const redirectUrl = buildLoginRedirectUrl({
    pathname: "/dashboard",
    requestUrl: "http://127.0.0.1:3051/dashboard?tab=overview",
    search: "?tab=overview"
  });

  assert.equal(redirectUrl.toString(), "http://127.0.0.1:3051/login?next=%2Fdashboard%3Ftab%3Doverview");
});
