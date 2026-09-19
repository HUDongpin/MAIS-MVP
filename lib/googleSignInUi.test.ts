import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveGoogleSignInUi } from "./googleSignInUi";

test("hides Google sign-in and shows the unavailable notice when OAuth is unset", () => {
  assert.deepEqual(resolveGoogleSignInUi({ available: false, googleError: "" }), {
    offerGoogle: false,
    showUnavailableNotice: true,
    errorCode: null
  });
});

test("hides Google sign-in for googleError=setup even if availability was true", () => {
  assert.deepEqual(resolveGoogleSignInUi({ available: true, googleError: "setup" }), {
    offerGoogle: false,
    showUnavailableNotice: true,
    errorCode: null
  });
});

test("treats googleError=setup the same as unset config", () => {
  assert.deepEqual(resolveGoogleSignInUi({ available: false, googleError: "setup" }), {
    offerGoogle: false,
    showUnavailableNotice: true,
    errorCode: null
  });
});

test("offers Google sign-in when OAuth is configured and there is no error", () => {
  assert.deepEqual(resolveGoogleSignInUi({ available: true, googleError: "" }), {
    offerGoogle: true,
    showUnavailableNotice: false,
    errorCode: null
  });
});

test("keeps Google sign-in available for teacher invite and generic provider errors", () => {
  assert.deepEqual(resolveGoogleSignInUi({ available: true, googleError: "teacher_invite_required" }), {
    offerGoogle: true,
    showUnavailableNotice: false,
    errorCode: "teacher_invite_required"
  });

  assert.deepEqual(resolveGoogleSignInUi({ available: true, googleError: "state_invalid" }), {
    offerGoogle: true,
    showUnavailableNotice: false,
    errorCode: "generic"
  });
});
