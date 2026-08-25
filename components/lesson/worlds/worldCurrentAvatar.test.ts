import assert from "node:assert/strict";
import test from "node:test";
import { lessonWorldCurrentAvatarDisplay } from "./worldCurrentAvatar";

test("lesson-world current position prefers the learner's uploaded avatar over their preset mascot", () => {
  assert.deepEqual(
    lessonWorldCurrentAvatarDisplay({
      avatarImageDataUrl: "data:image/png;base64,QUJD",
      avatarId: "pi"
    }),
    {
      fallbackGlyph: "👽",
      imageSrc: "data:image/png;base64,QUJD"
    }
  );
});

test("lesson-world current position maps every learner preset and fails closed to a neutral guest", () => {
  for (const [avatarId, fallbackGlyph] of [
    ["delta", "🐱"],
    ["pi", "👽"],
    ["sigma", "🐶"],
    ["theta", "🛸"],
    ["function", "🐰"],
    ["radical", "🌟"]
  ] as const) {
    assert.deepEqual(
      lessonWorldCurrentAvatarDisplay({ avatarId, avatarImageDataUrl: "  " }),
      { fallbackGlyph, imageSrc: null }
    );
  }

  assert.deepEqual(
    lessonWorldCurrentAvatarDisplay({ avatarId: "not-a-real-avatar" }),
    { fallbackGlyph: "👤", imageSrc: null }
  );
  assert.deepEqual(
    lessonWorldCurrentAvatarDisplay({}),
    { fallbackGlyph: "👤", imageSrc: null }
  );
});
