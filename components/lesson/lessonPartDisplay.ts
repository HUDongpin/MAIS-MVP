export type LessonPartDisplay = {
  contentTitle: string;
  menuTitle: string;
  ordinal: string;
};

type LessonPartDisplayInput = {
  itemIndex: number;
  title: string;
  unitIndex: number;
};

const lessonTitleMarkerSource = [
  "[#*0-9]\\uFE0F?\\u20E3",
  "\\p{Regional_Indicator}{2}",
  "(?:\\p{Extended_Pictographic}|\\p{So})(?:\\uFE0E|\\uFE0F)?(?:\\p{Emoji_Modifier})?(?:\\u200D(?:\\p{Extended_Pictographic}|\\p{So})(?:\\uFE0E|\\uFE0F)?(?:\\p{Emoji_Modifier})?)*"
].join("|");
const leadingLessonTitleMarkerPattern = new RegExp(`^(${lessonTitleMarkerSource})\\s+([\\s\\S]+)$`, "u");

function splitLeadingCartoonMarker(title: string) {
  const trimmedTitle = title.trim();
  const markerMatch = leadingLessonTitleMarkerPattern.exec(trimmedTitle);

  if (!markerMatch) {
    return { contentTitle: trimmedTitle, marker: "" };
  }

  return { contentTitle: markerMatch[2].trim(), marker: markerMatch[1] };
}

/**
 * One display model for a lesson part across the left directory and its
 * matching right-side heading. Raw lesson/config titles remain untouched.
 */
export function formatLessonPartDisplay({ itemIndex, title, unitIndex }: LessonPartDisplayInput): LessonPartDisplay {
  const ordinal = `${unitIndex + 1}.${itemIndex + 1}`;
  const { contentTitle, marker } = splitLeadingCartoonMarker(title);
  const numberedTitle = `${ordinal} ${contentTitle}`;

  return {
    contentTitle: numberedTitle,
    menuTitle: marker ? `${numberedTitle} ${marker}` : numberedTitle,
    ordinal
  };
}
