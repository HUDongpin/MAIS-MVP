const generatedActivityPrefixPatterns = [
  /^\s*(?:Activity|Practice activity)\s*\d+\s*[:：]\s*(?:(?:DeepSeek\s*)?practice\s*[:：]\s*)?/i,
  /^\s*(?:練習活動|练习活动|活動|活动)\s*\d+\s*[:：]\s*(?:(?:DeepSeek|深度求索)\s*(?:練習|练习)\s*[:：]?\s*)?/i
];

export function cleanPracticeQuestionPromptText(value: string) {
  return generatedActivityPrefixPatterns
    .reduce((current, pattern) => current.replace(pattern, ""), value)
    .replace(/\bDeepSeek\b\s*(?:practice|練習|练习)?\s*[:：]?\s*/gi, "")
    .replace(/深度求索\s*(?:練習|练习)\s*[:：]?\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
