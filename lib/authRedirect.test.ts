import assert from "node:assert/strict";
import test from "node:test";
import { safePasswordChangeNextPath, safeRelativeAppPath } from "./authRedirect";

test("safeRelativeAppPath accepts local paths and rejects network-path evasions", () => {
  assert.equal(safeRelativeAppPath("/dashboard?tab=progress#today", "/fallback"), "/dashboard?tab=progress#today");

  for (const unsafe of [
    "https://evil.example/path",
    "//evil.example/path",
    "/\\evil.example/path",
    "/%5cevil.example/path",
    "/%255cevil.example/path",
    "/%25255cevil.example/path",
    "/%2525255cevil.example/path",
    "/%252525255cevil.example/path",
    "/%2e%2e//evil.example/path",
    "/safe/%2e%2e//evil.example/path",
    "/%2fevil.example/path",
    "/%252fevil.example/path",
    "/%0aevil.example/path",
    "/%",
  ]) {
    assert.equal(safeRelativeAppPath(unsafe, "/fallback"), "/fallback", unsafe);
  }
});

test("safePasswordChangeNextPath permits only the exact Google-link login continuation", () => {
  assert.equal(safePasswordChangeNextPath("/teacher/dashboard", "/fallback"), "/teacher/dashboard");
  assert.equal(safePasswordChangeNextPath("/login?googleLink=1", "/fallback"), "/login?googleLink=1");

  for (const disallowedLoginPath of [
    "/login",
    "/login/",
    "/login?googleLink=0",
    "/login?googleLink=1&next=%2Fadmin",
    "/login?next=%2Fdashboard",
    "/login#googleLink=1",
  ]) {
    assert.equal(safePasswordChangeNextPath(disallowedLoginPath, "/fallback"), "/fallback", disallowedLoginPath);
  }
});
