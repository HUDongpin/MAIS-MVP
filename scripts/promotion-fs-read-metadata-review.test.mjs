import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { analyzeRuntimeLoaderCalls } from "../coordination/integration/promotion-gate-lib.mjs";
const tools = await import("./promotion-fs-read-metadata-review.mjs").catch(e => {
  if (e.code === "ERR_MODULE_NOT_FOUND") return {};
  throw e;
});
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
const oid = b => crypto.createHash("sha1").update(`blob ${b.length}\0`).update(b).digest("hex");
const path = "lib/server/userStore.ts";
const source = `import { readFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
function defaultDbDirectory() { return path.join(tmpdir(), "storage"); }
const configuredDbPath = process.env.HK_MATH_DB_PATH || null;
const dbDirectory = configuredDbPath ? path.dirname(configuredDbPath) : defaultDbDirectory();
const legacyJsonDbPath = path.join(dbDirectory, "hk-math-db.json");
async function readLegacyDatabase() { return readFile(legacyJsonDbPath, "utf8"); }
export function unrelated() { return 1; }
`;
function fixture(target = "// inserted unrelated metadata\n" + source.replace("return 1", "return 2")) {
  const bytes = { source: Buffer.from(source), target: Buffer.from(target) };
  const reads = side => analyzeRuntimeLoaderCalls(path, bytes[side].toString("utf8")).fsReads.map(r => ({sourcePath:path, sourceRawSha256:sha(bytes[side]), ...r}));
  return {sourceReads:reads("source"), targetReads:reads("target"),
    sourceFiles:[{path,mode:"100644",objectId:oid(bytes.source)}], targetFiles:[{path,mode:"100644",objectId:oid(bytes.target)}],
    readBlob:(side, p) => { assert.equal(p,path); return bytes[side]; }, bytes};
}
function build(f) {
  assert.equal(typeof tools.buildFsReadMetadataReview,"function","bounded metadata proof is not implemented");
  const { bytes, ...input } = f;
  return tools.buildFsReadMetadataReview(input);
}
test("fs metadata rebinding accepts only real source hash and position drift", () => {
  const f=fixture(), p=build(f);
  assert.equal(p.schemaVersion,"promotion-fs-read-metadata-review.v1");
  assert.equal(p.readCount,1); assert.equal(p.fileCount,1);
  assert.equal(p.preparationEvidenceOnly,true); assert.equal(p.liveAllowed,false);
  assert.notEqual(p.files[0].source.rawSha256,p.files[0].target.rawSha256);
  assert.equal(p.files[0].reads[0].source.position,f.sourceReads[0].position);
  assert.equal(p.files[0].reads[0].target.position,f.targetReads[0].position);
});
test("unchanged bare Node builtin imports are also source-bound", () => {
  const f=fixture();
  for(const side of ["source","target"]) {
    f.bytes[side]=Buffer.from(f.bytes[side].toString().replaceAll("node:",""));
    f[side+"Files"][0].objectId=oid(f.bytes[side]);
    f[side+"Reads"]=analyzeRuntimeLoaderCalls(path,f.bytes[side].toString()).fsReads.map(r=>({sourcePath:path,sourceRawSha256:sha(f.bytes[side]),...r}));
  }
  assert.equal(build(f).readCount,1);
});
test("real path declarations and enclosing read function cannot drift", () => {
  for(const [before,after] of [["hk-math-db.json","secret.json"],["HK_MATH_DB_PATH","OTHER_PATH"],["storage","other"],["return readFile","console.log(1); return readFile"],["utf8","ascii"]]) {
    assert.throws(()=>build(fixture(source.replace(before,after))),/binding|expression|inventory|declaration|reader/u);
  }
});
test("local shadowing and mutable path declarations fail closed", () => {
  assert.throws(()=>build(fixture(source.replace("return readFile",'const legacyJsonDbPath = "secret"; return readFile'))),/binding|reader|declaration/u);
  assert.throws(()=>build(fixture(source.replace("const dbDirectory", "let dbDirectory"))),/binding|declaration|mutable/u);
});
test("added and omitted reads cannot be normalized away", () => {
  const added=fixture(source+'\nreadFile(legacyJsonDbPath, "utf8");');
  assert.throws(()=>build(added),/inventory|count|reader/u);
  added.targetReads.pop(); assert.throws(()=>build(added),/inventory|complete/u);
  const removed=fixture(); removed.targetReads=[]; assert.throws(()=>build(removed),/inventory|count/u);
});
test("forged hash, position, policy, Git object, mode and blob are rejected", () => {
  for(const mutate of [f=>f.targetReads[0].sourceRawSha256="0".repeat(64), f=>f.targetReads[0].position++, f=>f.targetReads[0].policy="anything",
    f=>f.targetFiles[0].objectId="0".repeat(40),f=>f.targetFiles[0].mode="120000",f=>f.bytes.target=Buffer.from([255])]) {
    const f=fixture();mutate(f);assert.throws(()=>build(f),/hash|inventory|object|regular|UTF|bytes/u);
  }
});
test("path imports and writes cannot change behind identical read expressions", () => {
  assert.throws(()=>build(fixture(source.replace('"node:path"','"./evil"'))),/binding|declaration|import/u);
  assert.throws(()=>build(fixture(source+'\nprocess.env.HK_MATH_DB_PATH = "secret";')),/write|mutation|binding/u);
  assert.throws(()=>build(fixture(source+'\npath.join = () => "secret";')),/write|mutation|binding/u);
});
test("independent A11 counterexamples reject reflection, aliases and reader reassignment", () => {
  for(const insertion of ['Reflect.set(path, "join", () => "/secret");','const alias = path; alias.join = () => "/secret";', 'readLegacyDatabase = async () => null;']) {
    assert.throws(()=>build(fixture(source.replace("const legacyJsonDbPath",insertion+"\nconst legacyJsonDbPath"))),/reference|binding|mutation|reader/u);
  }
});
test("declaration order and relevant reference control context cannot be erased", () => {
  const declaration='const legacyJsonDbPath = path.join(dbDirectory, "hk-math-db.json");\n';
  assert.throws(()=>build(fixture(source.replace(declaration,"").replace("const dbDirectory",declaration+"const dbDirectory"))),/order|binding|reference/u);
  const f=fixture();
  f.bytes.source=Buffer.from(source+'\nprocess.env.HK_MATH_DB_PATH = "secret";');
  f.bytes.target=Buffer.from(source.replace("const configuredDbPath",'process.env.HK_MATH_DB_PATH = "secret";\nconst configuredDbPath'));
  for(const side of ["source","target"]) {
    f[side+"Files"][0].objectId=oid(f.bytes[side]);
    f[side+"Reads"]=analyzeRuntimeLoaderCalls(path,f.bytes[side].toString()).fsReads.map(r=>({sourcePath:path,sourceRawSha256:sha(f.bytes[side]),...r}));
  }
  assert.throws(()=>build(f),/order|binding|reference/u);
});
test("pre-existing object aliases cannot hide new indirect mutations", () => {
  const f=fixture();
  for(const side of ["source","target"]) {
    const alias='const alias = path;\n';
    f.bytes[side]=Buffer.from(source.replace("const legacyJsonDbPath",alias+(side==="target"?'alias.join = () => "secret";\n':"")+"const legacyJsonDbPath"));
    f[side+"Files"][0].objectId=oid(f.bytes[side]);
    f[side+"Reads"]=analyzeRuntimeLoaderCalls(path,f.bytes[side].toString()).fsReads.map(r=>({sourcePath:path,sourceRawSha256:sha(f.bytes[side]),...r}));
  }
  assert.throws(()=>build(f),/escape|alias|reference|binding/u);
});
test("frozen scalar-only environment default parameters do not expose the environment object", () => {
  const f=fixture();
  for(const side of ["source","target"]) {
    f.bytes[side]=Buffer.from(f.bytes[side].toString()+'\nfunction timeout(environment = process.env) { return environment.TIMEOUT; }');
    f[side+"Files"][0].objectId=oid(f.bytes[side]);
    f[side+"Reads"]=analyzeRuntimeLoaderCalls(path,f.bytes[side].toString()).fsReads.map(r=>({sourcePath:path,sourceRawSha256:sha(f.bytes[side]),...r}));
  }
  assert.equal(build(f).readCount,1);
  f.bytes.target=Buffer.from(f.bytes.target.toString().replace("return environment.TIMEOUT","return environment"));
  f.targetFiles[0].objectId=oid(f.bytes.target);
  f.targetReads=analyzeRuntimeLoaderCalls(path,f.bytes.target.toString()).fsReads.map(r=>({sourcePath:path,sourceRawSha256:sha(f.bytes.target),...r}));
  assert.throws(()=>build(f),/escape|binding/u);
});
test("captured primitive paths allow unchanged later environment wrappers", () => {
  const f=fixture();
  for(const side of ["source","target"]) {
    f.bytes[side]=Buffer.from(f.bytes[side].toString()+'\nfunction later() { return wrapper({environment:process.env}); }');
    f[side+"Files"][0].objectId=oid(f.bytes[side]);
    f[side+"Reads"]=analyzeRuntimeLoaderCalls(path,f.bytes[side].toString()).fsReads.map(r=>({sourcePath:path,sourceRawSha256:sha(f.bytes[side]),...r}));
  }
  assert.equal(build(f).readCount,1);
});
test("initialization closure rejects hidden calls, getters, object paths and suspension", () => {
  for(const change of [s=>s.replace("const legacyJsonDbPath",'unknown();\nconst legacyJsonDbPath'),s=>s.replace('path.join(dbDirectory, "hk-math-db.json")','({get path(){return "secret";}}).path'),
    s=>s.replace('path.join(dbDirectory, "hk-math-db.json")','unknown()'),s=>s.replace("const legacyJsonDbPath",'await Promise.resolve();\nconst legacyJsonDbPath')]) {
    assert.throws(()=>build(fixture(change(source))),/initialization|binding|declaration|unbound|primitive/u);
  }
});
test("shared initializer dependencies are analyzed without exponential work", () => {
  const f=fixture();const chain=['const x0 = 1;',...Array.from({length:20},(_,i)=>`const x${i+1} = x${i} + x${i};`)].join("\n");
  for(const side of ["source","target"]) {
    f.bytes[side]=Buffer.from(f.bytes[side].toString().replace("const legacyJsonDbPath",chain+"\nconst legacyJsonDbPath"));
    f[side+"Files"][0].objectId=oid(f.bytes[side]);
    f[side+"Reads"]=analyzeRuntimeLoaderCalls(path,f.bytes[side].toString()).fsReads.map(r=>({sourcePath:path,sourceRawSha256:sha(f.bytes[side]),...r}));
  }
  const start=performance.now();assert.equal(build(f).readCount,1);assert.ok(performance.now()-start<2000,"shared dependency classification must be memoized and bounded");
});
test("unknown fields, unsafe paths, unbounded blobs and empty rebinding are rejected", () => {
  const f=fixture();f.extra=true;assert.throws(()=>build(f),/schema/u);
  const j=fixture();j.targetReads[0].sourcePath="../bad";assert.throws(()=>build(j),/path|inventory/u);
  const k=fixture();k.bytes.target=Buffer.alloc(16*1024*1024+1);assert.throws(()=>build(k),/limit|bytes/u);
  assert.throws(()=>build(fixture(source)),/actual|drift|change/u);
});
