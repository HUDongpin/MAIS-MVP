const mathLikeOptionPattern = /(?:\\[a-zA-Z]+|[\d=+\-*/^<>()[\]{}])/;

export function formatPracticeOptionDisplayText(value: string) {
  if (!value || mathLikeOptionPattern.test(value)) return value;

  const firstLetterIndex = value.search(/[A-Za-z]/);
  if (firstLetterIndex === -1) return value;

  const firstLetter = value[firstLetterIndex];
  return `${value.slice(0, firstLetterIndex)}${firstLetter.toUpperCase()}${value.slice(firstLetterIndex + 1)}`;
}
