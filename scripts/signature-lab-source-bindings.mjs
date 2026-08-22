import { createHash } from "node:crypto";

export const EXPECTED_AUDIT_LAB_PAIR_NAMES_SHA256 =
  "a8a1c611fefbadaa66b8095e1dc5e4edf6e4c12ef4a8d49fa5c26fb4e7e2e872";
export const EXPECTED_AUDIT_LAB_SOURCE_SHA256 =
  "a28c437e422a64485d9c189b74c20f6a0260226f85794b980af1bf5b081bd6e1";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function freezePairs(pairs) {
  for (const pair of pairs) Object.freeze(pair);
  return Object.freeze(pairs);
}

export function assertExactAuditLabSourceBindings(
  auditFiles,
  labFiles,
  sourceRecords,
) {
  if (!(sourceRecords instanceof Map)) {
    throw new Error("reviewed audit-to-Lab source records must be one Map");
  }
  const knownLabStems = new Set(labFiles.map((name) => name.slice(0, -4)));
  const pairs = auditFiles.map((audit) => {
    const auditRecord = sourceRecords.get(audit);
    if (auditRecord === undefined || !Buffer.isBuffer(auditRecord.bytes) ||
        typeof auditRecord.sha256 !== "string" ||
        sha256(auditRecord.bytes) !== auditRecord.sha256) {
      throw new Error(`${audit}: missing or invalid stable audit source record`);
    }
    const labStem = [...auditRecord.bytes.toString("utf8").matchAll(
      /\b([A-Z][A-Za-z0-9]*Lab)(?:\.jsx)?\b/gu,
    )].map((match) => match[1]).find((candidate) => knownLabStems.has(candidate));
    if (labStem === undefined) {
      throw new Error(`${audit}: missing reviewed paired Lab token`);
    }
    const lab = `${labStem}.jsx`;
    const labRecord = sourceRecords.get(lab);
    if (labRecord === undefined || !Buffer.isBuffer(labRecord.bytes) ||
        typeof labRecord.sha256 !== "string" ||
        sha256(labRecord.bytes) !== labRecord.sha256) {
      throw new Error(`${audit}: paired Lab ${lab} has no valid stable source record`);
    }
    return { audit, lab };
  });
  if (pairs.length !== 192 || new Set(auditFiles).size !== 192 ||
      new Set(labFiles).size !== 192 ||
      new Set(pairs.map((pair) => pair.audit)).size !== 192 ||
      new Set(pairs.map((pair) => pair.lab)).size !== 192) {
    throw new Error("reviewed audit-to-Lab binding is not one exact 192-to-192 bijection");
  }
  const nameManifest = Buffer.from(
    `${pairs.map((pair) => `${pair.audit}\t${pair.lab}`).join("\n")}\n`,
    "utf8",
  );
  const sourceManifest = Buffer.from(
    `${pairs.map((pair) => {
      const auditRecord = sourceRecords.get(pair.audit);
      const labRecord = sourceRecords.get(pair.lab);
      return [pair.audit, pair.lab, auditRecord.sha256, labRecord.sha256].join("\t");
    }).join("\n")}\n`,
    "utf8",
  );
  const pairNamesSha256 = sha256(nameManifest);
  const sourceSha256 = sha256(sourceManifest);
  if (pairNamesSha256 !== EXPECTED_AUDIT_LAB_PAIR_NAMES_SHA256 ||
      sourceSha256 !== EXPECTED_AUDIT_LAB_SOURCE_SHA256) {
    throw new Error(
      `reviewed audit-to-Lab source binding drifted (${pairNamesSha256}/${sourceSha256})`,
    );
  }
  return freezePairs(pairs);
}
