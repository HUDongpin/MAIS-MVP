// Internal worker only. Parse immutable source; never import candidate/app code.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import { syncBuiltinESMExports } from "node:module";
import { parse, digest, need, same } from "./common.mjs";
import { ZERO_EFFECTS, SLUGS, topicFor } from "./constants.mjs";
import {
  strictStaticConsumers,
  strictReachableConsumers,
  validateCanonicalAudit,
} from "./audit.mjs";
export async function correlateCandidateMarkers(root, reachablePaths, registry, readAuthoritativeFile) {
  const rows = registry.resolutions.map((row) => ({
    id: row.resolutionId,
    markers: [row.candidate.path, row.candidate.packageId].filter(Boolean),
  }));
  const correlated = Object.fromEntries(rows.map((row) => [row.id, 0]));
  for (const file of reachablePaths) {
    if (!/\.[cm]?[jt]sx?$|\.json$/u.test(file)) continue;
    const text = (await readAuthoritativeFile(root, file)).bytes.toString("utf8");
    for (const row of rows)
      if (row.markers.some((marker) => text.includes(marker))) correlated[row.id]++;
  }
  return correlated;
}
export async function observeSnapshot(root, request) {
  need(path.isAbsolute(root ?? ""), "CA_OBSERVER_ARGS");
  const blocked = () => {
    throw new Error("CA_NETWORK_FORBIDDEN");
  };
  globalThis.fetch = blocked;
  net.Socket.prototype.connect = blocked;
  http.request = blocked;
  https.request = blocked;
  dns.lookup = blocked;
  syncBuiltinESMExports();
  const { manifest: m, registry } = request;
  const staticConsumers = strictStaticConsumers(root, registry, [
    m.runtime.compatibility.path,
  ]);
  const compatibility = parse(
    readFileSync(path.join(root, m.runtime.compatibility.path)),
  );
  const {
    observeCanonicalRuntimePolicy,
    auditCanonicalLegacyConflictUnion,
    readAuthoritativeFile,
  } = await import("./canonical-observer-ca-v1.mjs");
  const observation = await observeCanonicalRuntimePolicy(root, compatibility);
  const jsonConsumers = strictReachableConsumers(
    root,
    observation.graph.reachablePaths,
    staticConsumers,
  );
  const audit = await auditCanonicalLegacyConflictUnion(
    root,
    compatibility,
    observation,
  );
  validateCanonicalAudit(audit);
  const { default: ts } =
    await import("../../../node_modules/typescript/lib/typescript.js");
  const correlated = await correlateCandidateMarkers(
    root, observation.graph.reachablePaths, registry, readAuthoritativeFile,
  );
  const source = readFileSync(
      path.join(root, "data/ccssLessonAssignments.ts"),
      "utf8",
    ),
    ast = ts.createSourceFile(
      "assignments.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
    ),
    found = [],
    memberships = [];
  function visit(n) {
    if (
      ts.isVariableDeclaration(n) &&
      n.name.getText(ast) === "ccssLessonAssignments"
    ) {
      need(ts.isObjectLiteralExpression(n.initializer), "CA_MAPPING_AST");
      for (const prop of n.initializer.properties) {
        need(
          ts.isPropertyAssignment(prop) &&
            ts.isStringLiteral(prop.name) &&
            ts.isObjectLiteralExpression(prop.initializer),
          "CA_MAPPING_AST",
        );
        const primary = prop.initializer.properties.filter(
          (p) =>
            ts.isPropertyAssignment(p) && p.name.getText(ast) === "primary",
        );
        need(
          primary.length === 1 && ts.isStringLiteral(primary[0].initializer),
          "CA_MAPPING_AST",
        );
        const slug = primary[0].initializer.text;
        if (SLUGS.includes(slug)) {
          found.push({ slug, topicId: prop.name.text, primary: true });
          memberships.push({
            kind: "new-opener",
            lessonId: slug,
            topicId: prop.name.text,
          });
          const related = prop.initializer.properties.filter(
            (p) =>
              ts.isPropertyAssignment(p) && p.name.getText(ast) === "related",
          );
          need(related.length <= 1, "CA_MAPPING_AST");
          if (related.length) {
            need(
              ts.isArrayLiteralExpression(related[0].initializer),
              "CA_MAPPING_AST",
            );
            for (const element of related[0].initializer.elements) {
              need(ts.isStringLiteral(element), "CA_MAPPING_AST");
              memberships.push({
                kind: "retained-related",
                lessonId: element.text,
                topicId: prop.name.text,
              });
            }
          }
        }
      }
    }
    ts.forEachChild(n, visit);
  }
  visit(ast);
  found.sort((a, b) => a.slug.localeCompare(b.slug));
  same(
    found,
    SLUGS.map((slug) => ({ slug, topicId: topicFor(slug), primary: true })),
    "CA_MAPPING_AST",
  );
  return {
    result: "pass",
    sourceCommit: m.sourceCommit,
    policyDigest: digest({
      graphPolicy: observation.graphPolicy,
      loaderPolicy: observation.loaderPolicy,
      anchors: observation.sensitiveAnchorsDigest,
      adapterVersion: "ca-canonical-observer.v1",
      storageLoaderPartitionDigest:
        observation.storageLoaderProof.partitionDigest,
      issuedObservationDigest: observation.issuedObservationDigest,
    }),
    audit,
    jsonConsumers,
    reachable: [...observation.graph.reachablePaths].sort(),
    correlated,
    mappingsDigest: digest(found),
    memberships,
    unresolvedImports:
      observation.graph.unresolvedCalls.length +
      observation.loaderPolicy.nextDynamic.nonliteralImportCount,
    storageLoaderProof: observation.storageLoaderProof,
    issuedObservationDigest: observation.issuedObservationDigest,
    rawDetectedLoaders: observation.storageLoaderProof.rawDetectedCount,
    reviewedStorageLoaders: observation.storageLoaderProof.reviewedStorageCount,
    unregisteredLoaders: observation.storageLoaderProof.unclassifiedCount,
    effects: ZERO_EFFECTS,
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.stdout.write(
    JSON.stringify({
      result: "blocked",
      code: "CA_CAPSULE_REQUIRED",
      liveAllowed: false,
    }) + "\n",
  );
  process.exitCode = 2;
}
