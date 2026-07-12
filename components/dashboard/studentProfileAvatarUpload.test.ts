import assert from "node:assert/strict";
import test from "node:test";
import { avatarUploadImageDataUrl, isSupportedAvatarUploadFile } from "./studentProfileAvatarUpload";

test("accepts a valid PNG upload when the browser omits the MIME type", () => {
  assert.equal(
    isSupportedAvatarUploadFile({
      name: "shirleen-avatar.png",
      size: 400 * 1024,
      type: ""
    }),
    true
  );
});

test("accepts legacy PNG MIME labels from file pickers", () => {
  assert.equal(
    isSupportedAvatarUploadFile({
      name: "shirleen-avatar.PNG",
      size: 400 * 1024,
      type: "image/x-png"
    }),
    true
  );
});

test("normalizes generic local file picker MIME types before image decoding", () => {
  assert.equal(
    avatarUploadImageDataUrl(
      {
        name: "shirleen-avatar.png",
        type: "application/octet-stream"
      },
      "data:application/octet-stream;base64,QUJD"
    ),
    "data:image/png;base64,QUJD"
  );
});

test("rejects oversized or non-image profile uploads", () => {
  assert.equal(
    isSupportedAvatarUploadFile({
      name: "too-large.png",
      size: 5 * 1024 * 1024 + 1,
      type: "image/png"
    }),
    false
  );

  assert.equal(
    isSupportedAvatarUploadFile({
      name: "notes.txt",
      size: 4 * 1024,
      type: "text/plain"
    }),
    false
  );
});
