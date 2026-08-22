import { createHash } from "node:crypto";

export function legacyLearningEventClearRequestId({
  userId,
  generation,
  clearedAt
}: {
  userId: string;
  generation: number;
  clearedAt: string;
}) {
  if (
    userId.length === 0 ||
    userId !== userId.trim() ||
    !Number.isSafeInteger(generation) ||
    generation <= 0 ||
    new Date(clearedAt).toISOString() !== clearedAt
  ) throw new TypeError("Cannot derive a legacy clear identity from non-canonical state.");
  const digest = createHash("sha256")
    .update(JSON.stringify([userId, generation, clearedAt]))
    .digest("hex");
  return `legacy-clear-v1-${digest}`;
}
