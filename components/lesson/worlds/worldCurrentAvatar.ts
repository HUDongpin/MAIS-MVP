import type { StudentAvatarId } from "@/types";

type LessonWorldCurrentAvatarInput = {
  avatarId?: unknown;
  avatarImageDataUrl?: string | null;
};

export type LessonWorldCurrentAvatarDisplay = {
  fallbackGlyph: string;
  imageSrc: string | null;
};

const lessonWorldAvatarGlyphs = {
  delta: "🐱",
  pi: "👽",
  sigma: "🐶",
  theta: "🛸",
  function: "🐰",
  radical: "🌟"
} satisfies Record<StudentAvatarId, string>;

function lessonWorldAvatarGlyph(avatarId: unknown) {
  if (
    typeof avatarId !== "string"
    || !Object.prototype.hasOwnProperty.call(lessonWorldAvatarGlyphs, avatarId)
  ) return "👤";
  return lessonWorldAvatarGlyphs[avatarId as StudentAvatarId];
}

export function lessonWorldCurrentAvatarDisplay({
  avatarId,
  avatarImageDataUrl
}: LessonWorldCurrentAvatarInput): LessonWorldCurrentAvatarDisplay {
  return {
    fallbackGlyph: lessonWorldAvatarGlyph(avatarId),
    imageSrc: avatarImageDataUrl?.trim() || null
  };
}
