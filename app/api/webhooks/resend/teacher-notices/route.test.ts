import assert from "node:assert/strict";
import test from "node:test";

import { POST, runtime } from "./route";

test("teacher notice Resend route is a Node raw-body POST endpoint", () => {
  assert.equal(runtime, "nodejs");
  assert.equal(typeof POST, "function");
});
