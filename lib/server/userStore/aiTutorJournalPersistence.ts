export type AiTutorJournalRecord = {
  created_at: string;
  id: string;
};

export function mergeAiTutorJournalRecords<RecordType extends AiTutorJournalRecord>(
  snapshotRecords: readonly RecordType[],
  journalRecords: readonly RecordType[]
) {
  const journalById = new Map<string, RecordType>();
  for (const record of journalRecords) journalById.set(record.id, record);

  const snapshotIds = new Set<string>();
  const merged = snapshotRecords.flatMap((record) => {
    if (snapshotIds.has(record.id)) return [];
    snapshotIds.add(record.id);
    return [journalById.get(record.id) ?? record];
  });
  const journalOnly = Array.from(journalById.values())
    .filter((record) => !snapshotIds.has(record.id))
    .sort((left, right) => (
      left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id)
    ));
  return [...merged, ...journalOnly];
}

export function aiTutorJournalRecordsFromValue<RecordType extends AiTutorJournalRecord>(
  value: unknown
) {
  if (!Array.isArray(value)) return [];
  const records = new Map<string, RecordType>();
  for (const candidate of value) {
    const record = typeof candidate === "object" && candidate !== null
      ? candidate as Partial<RecordType>
      : null;
    if (
      !record
      || typeof record.id !== "string"
      || !record.id.trim()
      || typeof record.created_at !== "string"
      || !record.created_at.trim()
    ) continue;
    records.set(record.id, record as RecordType);
  }
  return Array.from(records.values());
}

export function createAiTutorPersistenceLane() {
  let queue: Promise<void> = Promise.resolve();
  return {
    run<Result>(operation: () => Promise<Result>) {
      const run = queue.then(operation);
      queue = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    }
  };
}
