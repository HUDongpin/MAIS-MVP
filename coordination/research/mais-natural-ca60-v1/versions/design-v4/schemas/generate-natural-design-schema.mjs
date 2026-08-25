#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const schemaDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageDirectory = path.dirname(schemaDirectory);
const registrationPath = path.join(packageDirectory, "design-registration.json");
const outputPath = path.join(schemaDirectory, "NaturalCaPilotDesignRegistrationV4.schema.json");
const registration = JSON.parse(await readFile(registrationPath, "utf8"));

const derivedHashes = new Set([
  registration.registrationHash,
  registration.interfaces?.schemaSetHash,
  registration.hashDependencyDag?.dagDefinitionHash,
  ...Object.values(registration.interfaces?.canonicalSchemaHashes ?? {}),
  ...Object.values(registration.frozenContractHashes ?? {}),
].filter((value) => typeof value === "string" && /^[0-9a-f]{64}$/u.test(value)));

function schemaFor(value) {
  if (value === null) return { type: "null", const: null };
  if (Array.isArray(value)) {
    if (value.length > 0 && value[0] !== null && typeof value[0] === "object") {
      return { type: "array", items: schemaFor(value[0]) };
    }
    return { type: "array", const: value };
  }
  if (typeof value === "object") {
    const properties = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, schemaFor(child)]));
    return {
      type: "object",
      additionalProperties: false,
      required: Object.keys(value),
      properties,
    };
  }
  if (typeof value === "string" && derivedHashes.has(value)) return { $ref: "#/$defs/sha256" };
  if (typeof value === "string" && /^[0-9a-f]{40}$/u.test(value)) return { $ref: "#/$defs/gitOid" };
  return { type: typeof value, const: value };
}

const root = schemaFor(registration);
const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://mais.hk/schemas/research/NaturalCaPilotDesignRegistrationV4.schema.json",
  title: "NaturalCaPilotDesignRegistrationV4",
  ...root,
  $defs: {
    sha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
    gitOid: { type: "string", pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$" },
  },
};

await writeFile(outputPath, `${JSON.stringify(schema, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });
