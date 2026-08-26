import { randomUUID } from "node:crypto";
import { chmod, link, mkdir, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";

import { canonicalJsonV5R3, validateSelfHashV5R3 } from "./execution-integrity-v5-r3.mjs";

const ROUTE_SCHEMAS = new Set(["OpenAIProjectRoutePreflightReceiptV2", "DeepSeekDirectRouteProbeReceiptV1"]);

async function syncDirectory(root) {
  const handle = await open(root, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}

export async function writeRouteReceiptV5R3({ root, receipt }) {
  if (!path.isAbsolute(root)) throw new TypeError("route receipt root must be absolute");
  if (!validateSelfHashV5R3(receipt) || !ROUTE_SCHEMAS.has(receipt.schemaVersion)) throw new TypeError("sealed route receipt is required");
  await mkdir(root, { recursive: true, mode: 0o700 });
  await chmod(root, 0o700);
  const filename = `${receipt.schemaVersion}-${receipt.selfHash}.json`;
  const finalPath = path.join(root, filename);
  const temporaryPath = path.join(root, `.${filename}.${randomUUID()}.tmp`);
  const exactBytes = canonicalJsonV5R3(receipt);
  const handle = await open(temporaryPath, "wx", 0o600);
  try {
    await handle.writeFile(exactBytes, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  let created = false;
  try {
    await link(temporaryPath, finalPath);
    await chmod(finalPath, 0o600);
    await syncDirectory(root);
    created = true;
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    let existing;
    try { existing = await readFile(finalPath, "utf8"); } catch { existing = null; }
    if (existing !== exactBytes) throw new Error("immutable route receipt conflict");
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
  return Object.freeze({ path: finalPath, created, receiptHash: receipt.selfHash });
}
