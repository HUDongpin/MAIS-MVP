import assert from "node:assert/strict";
import test from "node:test";

import { studentResourceHref, studentResourcesPath } from "./studentResourceRoutes";

test("student resource list lives at /resource", () => {
  assert.equal(studentResourcesPath, "/resource");
});

test("student resource hrefs encode the resource id", () => {
  assert.equal(studentResourceHref("resource-s3-quadratics-slides"), "/resource/resource-s3-quadratics-slides");
  assert.equal(studentResourceHref("resource assessment"), "/resource/resource%20assessment");
});
