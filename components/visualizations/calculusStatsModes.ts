export type CalculusStatsLabMode = "tangent" | "normal";

// Statistics topics must never expose the unrelated calculus tangent mode;
// the available modes derive from the topic, not from user interaction.
export function calculusStatsModesForTopic(topicId: string): readonly CalculusStatsLabMode[] {
  return topicId === "statistics-s6" ? ["normal"] : ["tangent", "normal"];
}
