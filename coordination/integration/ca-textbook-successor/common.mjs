import { createHash } from "node:crypto";
import { parsePromotionWorkflowJsonBytes } from "../../../scripts/promotion-workflow-json-guard.mjs";
export const parse = parsePromotionWorkflowJsonBytes;
export const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function fail(code) {
  const e = new Error(code);
  e.code = code;
  throw e;
}
export function need(ok, code = "CA_CONTRACT_INVALID") {
  if (!ok) fail(code);
}
export function stable(v) {
  if (Array.isArray(v)) {
    need(
      Array.from({ length: v.length }, (_, i) => Object.hasOwn(v, i)).every(
        Boolean,
      ),
    );
    return "[" + v.map(stable).join(",") + "]";
  }
  if (v && typeof v === "object")
    return (
      "{" +
      Object.keys(v)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + stable(v[k]))
        .join(",") +
      "}"
    );
  need(v !== undefined && (typeof v !== "number" || Number.isFinite(v)));
  return JSON.stringify(v);
}
export const digest = (v) => hash(Buffer.from(stable(v)));
export const same = (a, b, code) => need(stable(a) === stable(b), code);
export function relative(p) {
  need(
    typeof p === "string" &&
      p.length < 2048 &&
      !p.startsWith("/") &&
      !p.includes("\\") &&
      !p.includes("\0") &&
      p.split("/").every((s) => s && s !== "." && s !== ".."),
    "CA_PATH",
  );
  return p;
}
export function time(t) {
  need(
    typeof t === "string" &&
      Number.isFinite(Date.parse(t)) &&
      new Date(t).toISOString() === t &&
      Date.parse(t) <= Date.now(),
    "CA_TIME",
  );
  return Date.parse(t);
}
export function unique(a) {
  need(Array.isArray(a) && a.length === new Set(a).size, "CA_DUPLICATE");
}
