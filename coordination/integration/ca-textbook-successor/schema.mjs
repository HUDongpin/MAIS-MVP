import { readFileSync } from "node:fs";
import { parse, need, same } from "./common.mjs";
const schemas = parse(readFileSync(new URL("./schemas.json", import.meta.url)));
// This interpreter accepts only the assertion vocabulary in this fixed bundled file.
// No public operation accepts a schema path or caller schema.
function check(s, v) {
  for (const k of Object.keys(s))
    need(
      [
        "$ref",
        "type",
        "const",
        "enum",
        "minLength",
        "maxLength",
        "pattern",
        "minimum",
        "minItems",
        "maxItems",
        "items",
        "required",
        "properties",
        "additionalProperties",
        "anyOf",
      ].includes(k),
      "CA_SCHEMA_KEYWORD",
    );
  if (s.$ref) {
    need(s.$ref.startsWith("#/$defs/"), "CA_SCHEMA_REF");
    return check(schemas.$defs[s.$ref.slice(8)], v);
  }
  if (s.anyOf) {
    need(
      s.anyOf.some((x) => {
        try {
          check(x, v);
          return true;
        } catch {
          return false;
        }
      }),
      "CA_SCHEMA",
    );
    return;
  }
  if (Object.hasOwn(s, "const")) same(v, s.const, "CA_SCHEMA");
  if (s.enum)
    need(
      s.enum.some((x) => JSON.stringify(x) === JSON.stringify(v)),
      "CA_SCHEMA",
    );
  if (s.type === "object") {
    need(v && typeof v === "object" && !Array.isArray(v), "CA_SCHEMA");
    need(s.additionalProperties === false, "CA_SCHEMA_OPEN");
    same(Object.keys(v).sort(), s.required.slice().sort(), "CA_SCHEMA");
    for (const [k, x] of Object.entries(s.properties)) check(x, v[k]);
  }
  if (s.type === "array") {
    need(
      Array.isArray(v) &&
        v.length >= (s.minItems ?? 0) &&
        v.length <= (s.maxItems ?? 10000),
      "CA_SCHEMA",
    );
    for (let i = 0; i < v.length; i++) {
      need(Object.hasOwn(v, i), "CA_SCHEMA");
      check(s.items, v[i]);
    }
  }
  if (s.type === "string")
    need(
      typeof v === "string" &&
        v.length >= (s.minLength ?? 0) &&
        v.length <= (s.maxLength ?? 65536) &&
        (!s.pattern || new RegExp(s.pattern, "u").test(v)),
      "CA_SCHEMA",
    );
  if (s.type === "integer")
    need(Number.isSafeInteger(v) && v >= (s.minimum ?? 0), "CA_SCHEMA");
}
export function validateSchema(name, value) {
  need(Object.hasOwn(schemas.$defs, name), "CA_SCHEMA_NAME");
  check(schemas.$defs[name], value);
  return value;
}
