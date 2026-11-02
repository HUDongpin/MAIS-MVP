// Preparation only: pure closed-scope predicates; registration/CLI is not yet implemented.
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, realpathSync, lstatSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
export const ROOT = "coordination/integration/ca-textbook-currentness-v1";
export const ATTEMPT = "ca-textbook-004";
export const PREFIX = ROOT + "/attempts/" + ATTEMPT;
export const MANIFEST = PREFIX + "/manifest.json";
export const BASE = "4847c89770f4a735c395773616f1d1a4a413152f";
export const SOURCE = "54d6080cfb7c137c03a83ba5da1c5d1bb7256b5e";
export const SOURCE_TREE = "d53bd544a4da00c7243a561b61635967e8f7b899";
export const CANDIDATE_DIGEST = "fda75f734941c94020fe069fb6791efa22fa84c625eb0019eba906f69c17e8ea";
export const SOURCE_INVENTORY_DIGEST = "52fb40e8f49f6d057faed1483e64f4245cd8d26c3d90e1deca70147f06c58706";
export const CODE_PATHS = Object.freeze([
  ".github/workflows/ca004-currentness-finalize.yml",
  ...["promotion.mjs", "currentness.mjs", "currentness.test.mjs", "README.md"].map(file => ROOT + "/" + file)
].sort());
export const OUTER_CODE_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml", "scripts/promotion-reviewed-code-pr308.mjs",
  "scripts/promotion-reviewed-code-pr308.test.mjs", "docs/pr308-reviewed-code-gate.md", "scripts/release-governance.test.mjs"
].sort());
export const ROLES = Object.freeze(["A18", "A11", "A23", "A22", "A25"]);
export const NATIVE_EVIDENCE_PATHS = Object.freeze([
  "candidate.json", "source-inventory.json", "checker-release.json", "runtime.json",
  "diagnostic-execution.json", "diagnostic-observation.json", "diagnostic-source-binding.json",
  "diagnostic.stdout", "diagnostic.stderr", ...ROLES.flatMap(role => ["evidence/" + role.toLowerCase() + ".json", "evidence/" + role.toLowerCase() + ".md"])
].map(file => PREFIX + "/" + file).sort());
export const OUTER_EVIDENCE_PATHS = Object.freeze([
  "admission.json", "source-inventory.json", "source-checks.json",
  "a11-review.json", "a11-review.md", "a23-review.json", "a23-review.md"
].map(file => "coordination/integration/reviewed-code/pr308-v1/" + file).sort());
export const EVIDENCE_PATHS = Object.freeze([...NATIVE_EVIDENCE_PATHS, ...OUTER_EVIDENCE_PATHS].sort());
export const EXECUTION_PATHS = Object.freeze([MANIFEST, PREFIX + "/successor.json"].sort());
export const RECEIPT_PATHS = Object.freeze([PREFIX + "/canonical-receipt.json", PREFIX + "/receipts/fresh.json", PREFIX + "/receipts/replay.json"]);
export const SOURCE_AUTHORS = Object.freeze(["/root", "/root/low_frequency_release", "/root/health_diagnosis", "original-pr225-authors"]);
export const CHECKER_AUTHORS = Object.freeze(["/root/content_release_review", "/root/health_diagnosis"]);
export const REVIEWERS = Object.freeze({A18:"/root/content_release_review",A11:"/root/ca004_release_a11",A23:"/root/ca004_release_a23",A22:"/root",A25:"/root"});
export const ZERO_EFFECTS = Object.freeze({ network: 0, provider: 0, database: 0, deploy: 0, liveWrites: 0 });
export const REQUIRED_CHECKS = Object.freeze(["snapshot","validate","postgres-integration","visualization-browser","teacher-notice-outbox-postgres16","resend-webhook-postgres-integration","teacher-parent-e2e","promotion-shadow-gate"].sort());
const OLD_ROOT = "coordination/integration/ca-textbook-successor";
const OLD_PREFIX = OLD_ROOT + "/attempts/ca-textbook-003";
const OLD_EXECUTION = "360966efb0427a0d679d462d10dccf53ee135424";
const OLD_FINALIZATION = "dd61016253fa9e8d869ef19abbd6bccee7e342c5";
const OLD_LEDGER_SHA = "18638f93abc473fb67f853faa7720d08deb60dbca0bf2979e38da3da4d5b13a3";
const OLD_RESULT_SHA = "03e0f924f438842982bae8326a25c79b027020b2d933e823fa76e5df922d6e41";
const OLD_EXECUTION_RECORD_SHA = "72b06b876862c35a84c6096bcdfabfb277a40c8cf082ca2f7fa471665b0f091b";
const OLD_CLOSURE = "d6d6068c0b6a293b986d5c2d4309b2a22164d00b54353cf3a11e0d5938bab64f";
const PACKAGE_HASHES = Object.freeze({ "package.json": "ccf3a4efc6cf34acd0a191cfce0472252e1337eecd7cd158e903f965ff4901bd", "package-lock.json": "d39348a625c9e6376161d3083960255817e86596eb9ebacb23b8e8a0246291a4" });
const OBSERVER_BUNDLE = "4035acd0f9dbce53803755cdec48778d52b4ea1b6278da4341e69185a3380e11";
const POLICY_DIGEST = "0a27a0c36c6256121cc5a13166b2d6809f7cfbeb3a0d4464ccdae93c2f54b505";
const AUDIT_DIGEST = "b20edcfbfd4ea4a09243e467128a4c54ecb8c363faa93fc022fa571904120df4";
export const CANDIDATE_TOOLING_PATHS = Object.freeze([
  "lib/californiaGradeAware.test.ts",
  "scripts/audit-math-diagram-inventory.ts",
  "tests/e2e/math-diagram-source-geometry.test.ts"
]);
export const SOURCE_KEYS = Object.freeze(["schemaVersion", "sourceCommit", "sourceTree", "slugs", "checksDigest", "files", "removals", "mappings", "assets"]);
const SHA = /^[a-f0-9]{40}$/u;
const HASH = /^[a-f0-9]{64}$/u;
export function need(value, code = "CA004_CONTRACT") {
  if (!value) { const error = new Error(code); error.code = code; throw error; }
}
export function stable(value) {
  if (Array.isArray(value)) {
    need(Array.from({length:value.length},(_,i)=>Object.hasOwn(value,i)).every(Boolean), "CA004_SPARSE_ARRAY");
    return "[" + value.map(stable).join(",") + "]";
  }
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(key=>JSON.stringify(key)+":"+stable(value[key])).join(",") + "}";
  need(value !== undefined && (typeof value !== "number" || Number.isFinite(value)), "CA004_JSON_VALUE");
  return JSON.stringify(value);
}
export const hash = bytes => createHash("sha256").update(bytes).digest("hex");
export const digest = value => hash(Buffer.from(stable(value)));
export const same = (a,b,code) => need(stable(a)===stable(b),code);
export function keys(value, expected, code = "CA004_SCHEMA") {
  need(value && typeof value === "object" && !Array.isArray(value),code);
  same(Object.keys(value).sort(),[...expected].sort(),code);
}
export function relative(file) {
  need(typeof file === "string" && file.length < 2048 && !file.startsWith("/") && !file.includes("\\") && !file.includes("\0") && file.split("/").every(part=>part && part!=="." && part!==".."), "CA004_PATH");
  return file;
}
export function binding(row) {
  keys(row,["path","mode","objectId","sha256"],"CA004_BINDING");
  relative(row.path);
  need(["100644","100755"].includes(row.mode) && SHA.test(row.objectId) && HASH.test(row.sha256), "CA004_BINDING");
  return row;
}
function candidateShape(candidate) {
  keys(candidate,SOURCE_KEYS,"CA004_CANDIDATE_SCHEMA");
  need(candidate.schemaVersion === "ca-textbook-candidate.v1" && SHA.test(candidate.sourceCommit) && SHA.test(candidate.sourceTree) && HASH.test(candidate.checksDigest),"CA004_CANDIDATE_SCHEMA");
  need(Array.isArray(candidate.files) && candidate.files.length === 137 && Array.isArray(candidate.slugs) && candidate.slugs.length === 35 && Array.isArray(candidate.mappings) && candidate.mappings.length === 35 && Array.isArray(candidate.assets) && candidate.assets.length === 15 && Array.isArray(candidate.removals) && candidate.removals.length === 2,"CA004_CANDIDATE_SCOPE");
  candidate.files.forEach(binding);
  const paths=candidate.files.map(row=>row.path);
  need(new Set(paths).size===paths.length,"CA004_CANDIDATE_DUPLICATE");same(paths,[...paths].sort(),"CA004_CANDIDATE_ORDER");
}
export function validateCandidateDelta(prior, candidate) {
  candidateShape(prior); candidateShape(candidate);
  need(candidate.sourceCommit!==prior.sourceCommit && candidate.sourceTree!==prior.sourceTree,"CA004_SOURCE_NOT_NEW");
  for (const field of ["schemaVersion","slugs","checksDigest","removals","mappings","assets"]) same(candidate[field],prior[field],"CA004_SUBSTANTIVE_DRIFT");
  same(candidate.files.map(row=>row.path),prior.files.map(row=>row.path),"CA004_CANDIDATE_PATHS");
  const changedPaths=[];
  for (let index=0;index<prior.files.length;index++) {
    const before=prior.files[index],after=candidate.files[index];
    need(before.mode===after.mode,"CA004_MODE_DRIFT");
    if (stable(before)!==stable(after)) {
      need(CANDIDATE_TOOLING_PATHS.includes(after.path),"CA004_SUBSTANTIVE_DRIFT");
      need(before.objectId!==after.objectId && before.sha256!==after.sha256,"CA004_INCONSISTENT_BINDING");
      changedPaths.push(after.path);
    }
  }
  same(changedPaths,CANDIDATE_TOOLING_PATHS,"CA004_TOOLING_DELTA");
  return {changedPaths,substantiveContentUnchanged:true,priorCandidateDigest:digest(prior),candidateDigest:digest(candidate)};
}
export function validatePhaseDelta({actualParents,expectedParent,actualPaths,expectedPaths}) {
  need(SHA.test(expectedParent),"CA004_PHASE_COMMIT");same(actualParents,[expectedParent],"CA004_PHASE_PARENT");
  need(Array.isArray(actualPaths) && Array.isArray(expectedPaths) && new Set(actualPaths).size===actualPaths.length && new Set(expectedPaths).size===expectedPaths.length,"CA004_PHASE_PATHS");
  actualPaths.forEach(relative);expectedPaths.forEach(relative);same([...actualPaths].sort(),[...expectedPaths].sort(),"CA004_PHASE_SCOPE");
  return [...actualPaths].sort();
}
export function validateMergeBinding(value) {
  keys(value,["baseCommit","releaseCommit","mergeCommit","mergeParents","releaseTree","mergeTree"],"CA004_MERGE_SCHEMA");
  need([value.baseCommit,value.releaseCommit,value.mergeCommit,value.releaseTree,value.mergeTree].every(x=>SHA.test(x)),"CA004_MERGE_SHA");
  need(new Set([value.baseCommit,value.releaseCommit,value.mergeCommit]).size===3,"CA004_MERGE_SHA");
  same(value.mergeParents,[value.baseCommit,value.releaseCommit],"CA004_MERGE_PARENTS");
  need(value.releaseTree===value.mergeTree,"CA004_MERGE_TREE");return value;
}

export function validateObservationBundle(historicalLedger, bundle, sourcePackageBindings) {
  keys(bundle,["files","dependencies"],"CA004_OBSERVER_SCHEMA");
  need(Array.isArray(historicalLedger.files) && historicalLedger.files.length===33 && Array.isArray(bundle.files) && bundle.files.length===33,"CA004_OBSERVER_SCOPE");
  const packagePaths=["package-lock.json","package.json"];
  need(Array.isArray(sourcePackageBindings) && sourcePackageBindings.length===2,"CA004_PACKAGE_SCOPE");sourcePackageBindings.forEach(binding);
  same(sourcePackageBindings.map(row=>row.path).sort(),packagePaths,"CA004_PACKAGE_SCOPE");
  same(bundle.dependencies,historicalLedger.dependencies,"CA004_TYPESCRIPT_DRIFT");
  same(bundle.files.map(row=>row.path),historicalLedger.files.map(row=>row.path),"CA004_OBSERVER_SCOPE");
  let preservedCodeFiles=0;
  for(let i=0;i<bundle.files.length;i++){
    const current=bundle.files[i],original=historicalLedger.files[i];binding(current);binding(original);
    if(packagePaths.includes(current.path))same(current,sourcePackageBindings.find(row=>row.path===current.path),"CA004_PACKAGE_BINDING");
    else {same(current,original,"CA004_OBSERVER_CODE_DRIFT");preservedCodeFiles++;}
  }
  need(preservedCodeFiles===31,"CA004_OBSERVER_SCOPE");
  return {preservedCodeFiles,packageInputs:2,bundleDigest:digest(bundle)};
}

export function validateCanonicalAuditIdentity(historicalAudit, observedAudit) {
  // The immutable native observer separately validates the old closed audit.
  // A changed expected hash cannot approve changed legacy discovery semantics.
  same(observedAudit,historicalAudit,"CA004_CANONICAL_AUDIT_DRIFT");
  return digest(observedAudit);
}
function treeEntries(rows) {
  need(Array.isArray(rows),"CA004_TREE_ENTRIES");
  const map=new Map();
  for(const row of rows){
    keys(row,["path","mode","objectId"],"CA004_TREE_ENTRY");relative(row.path);
    need(["100644","100755"].includes(row.mode) && SHA.test(row.objectId) && !map.has(row.path),"CA004_TREE_ENTRY");map.set(row.path,row);
  }
  return map;
}
export function validateObservedTreeProjection(sourceEntries,observedEntries,permittedDelta,expectedPaths) {
  const source=treeEntries(sourceEntries),observed=treeEntries(observedEntries);
  need(Array.isArray(permittedDelta) && Array.isArray(expectedPaths) && new Set(expectedPaths).size===expectedPaths.length,"CA004_TREE_DELTA");
  expectedPaths.forEach(relative);
  const paths=permittedDelta.map(row=>{keys(row,["path","before","after"],"CA004_TREE_DELTA");relative(row.path);return row.path;});
  need(new Set(paths).size===paths.length,"CA004_TREE_DELTA");same([...paths].sort(),[...expectedPaths].sort(),"CA004_TREE_SCOPE");
  const actual=[];
  for(const path of [...new Set([...source.keys(),...observed.keys()])].sort()){
    const before=source.get(path)??null,after=observed.get(path)??null;
    if(stable(before)!==stable(after))actual.push({path,before,after});
  }
  same(actual,[...permittedDelta].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0),"CA004_OBSERVED_TREE_DRIFT");
  return {sourceFiles:source.size,observedFiles:observed.size,changedPaths:actual.map(row=>row.path),deltaDigest:digest(actual)};
}

function reference(row) { keys(row,["path","sha256"],"CA004_REFERENCE");relative(row.path);need(HASH.test(row.sha256),"CA004_REFERENCE");return row; }
function time(value) { need(typeof value==="string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString()===value && Date.parse(value)<=Date.now(),"CA004_TIME");return Date.parse(value); }
export function validateManifest(m) {
  keys(m,["schemaVersion","attemptId","pullRequestNumber","baseCommit","sourceCommit","sourceTree","checkerInnerCommit","checkerReleaseCommit","checkerBundleDigest","evidenceCommit","candidateDigest","data","sourceAuthors","checkerAuthors","liveAllowed"],"CA004_MANIFEST_SCHEMA");
  need(m.schemaVersion==="ca004-manifest.v1" && m.attemptId===ATTEMPT && m.pullRequestNumber===308 && m.baseCommit===BASE && m.sourceCommit===SOURCE && m.sourceTree===SOURCE_TREE && m.candidateDigest===CANDIDATE_DIGEST && m.liveAllowed===false,"CA004_MANIFEST_BINDING");
  need([m.checkerInnerCommit,m.checkerReleaseCommit,m.evidenceCommit].every(v=>SHA.test(v)) && new Set([SOURCE,m.checkerInnerCommit,m.checkerReleaseCommit,m.evidenceCommit]).size===4 && HASH.test(m.checkerBundleDigest),"CA004_MANIFEST_PHASES");
  need(Array.isArray(m.data),"CA004_MANIFEST_DATA");m.data.forEach(reference);same(m.data.map(r=>r.path),NATIVE_EVIDENCE_PATHS,"CA004_MANIFEST_DATA");
  same(m.sourceAuthors,SOURCE_AUTHORS,"CA004_AUTHORS");same(m.checkerAuthors,CHECKER_AUTHORS,"CA004_AUTHORS");return m;
}

let nativePromise;
async function nativeModules() {
  nativePromise ??= Promise.all(["repository.mjs","common.mjs","receipts.mjs","candidate.mjs","runtime.mjs","capsule.mjs","schema.mjs"].map(name => import(new URL("../ca-textbook-successor/" + name, import.meta.url)))).then(([repository,common,receipts,candidate,runtime,capsule,schema])=>({ ...repository,...common,...receipts,...candidate,...runtime,...capsule,...schema }));
  return nativePromise;
}
function getData(ctx, name, json = true) {
  const file = PREFIX + "/" + name;
  const ref = ctx.m.data.find(row=>row.path===file);
  need(ref,"CA004_DATA_MISSING");
  const record = ctx.repo.read(ctx.m.evidenceCommit,ref);
  need(record.mode==="100644","CA004_DATA_MODE");
  return json ? ctx.native.parse(record.bytes) : record.bytes;
}
function exactBindingFiles(repo, ref, files, expectedPaths) {
  need(Array.isArray(files),"CA004_CODE_BINDINGS");
  same(files.map(row=>row.path),expectedPaths,"CA004_CODE_PATHS");
  for(const file of files){binding(file);need(file.mode==="100644","CA004_CODE_MODE");repo.read(ref,file);}
}
function verifySourceComposition(repo) {
  need(repo.tree(SOURCE)===SOURCE_TREE,"CA004_SOURCE_TREE");
  same(repo.parents(SOURCE),["5c77f4d3fde75eb9274268a064dad1cb771633d5"],"CA004_SOURCE_COMPOSITION");
  same(repo.parents("5c77f4d3fde75eb9274268a064dad1cb771633d5"),["9e29c05bb0fe334f19035b6e4c908d69d9e66f9d",OLD_FINALIZATION],"CA004_SOURCE_COMPOSITION");
  same(repo.parents("9e29c05bb0fe334f19035b6e4c908d69d9e66f9d"),[BASE,"4490ee972ba6b2a746501bca0341b4b43d0b7da2"],"CA004_SOURCE_COMPOSITION");
  for(const ref of [BASE,OLD_FINALIZATION,"6bb35e00111e20a8b1bb6c683dd6438f388eb27c","4490ee972ba6b2a746501bca0341b4b43d0b7da2"])repo.ancestor(ref,SOURCE);
}
function verifyHistorical(ctx) {
  const {repo,native}=ctx;
  const oldManifestBinding=repo.blob(OLD_EXECUTION,OLD_PREFIX+"/manifest.json");
  const old=repo.json(SOURCE,oldManifestBinding);
  const oldLedger=repo.json(OLD_EXECUTION,{path:OLD_PREFIX+"/checker-release.json",sha256:OLD_LEDGER_SHA},false);
  const historicalResult=repo.json(SOURCE,{path:OLD_PREFIX+"/finalization/native-result.json",sha256:OLD_RESULT_SHA});
  const historicalExecution=repo.json(SOURCE,{path:OLD_PREFIX+"/finalization/native-execution.json",sha256:OLD_EXECUTION_RECORD_SHA});
  native.verifyFinalizationRecord(historicalResult,native.sealFinalization(historicalResult.closure));
  need(historicalResult.closure.closureDigest===OLD_CLOSURE && historicalResult.closure.finalizationCommit===OLD_FINALIZATION && historicalResult.closure.binding.executionCommit===OLD_EXECUTION && historicalResult.liveAllowed===false,"CA004_HISTORICAL_CLOSURE");
  need(historicalExecution.runId==="41380582363" && historicalExecution.runAttempt==="1" && historicalExecution.exitCode===0 && historicalExecution.storageCommit===OLD_FINALIZATION && historicalExecution.stdout.sha256===OLD_RESULT_SHA && historicalExecution.stderr.bytes===0,"CA004_HISTORICAL_RUN");
  const input=repo.json(OLD_FINALIZATION,{path:OLD_PREFIX+"/finalization-input.json",sha256:historicalExecution.inputSha256},false);
  same(historicalResult.closure.receipts,input.receipts,"CA004_HISTORICAL_TRANSPORT");
  const stored=input.receipts.map(t=>native.readStoredReceipt(repo,old,historicalResult.closure.binding,t).receipt);
  native.compareReceipts(stored,historicalResult.closure.binding);
  const oldCandidate=repo.json(SOURCE,old.candidate),oldRegistry=repo.json(SOURCE,old.registry);
  const index=repo.json(SOURCE,old.evidenceIndex);
  // Reuse exact substantive A18/A05/A24 records without changing their source/run scope.
  for(const role of ["A18","A05","A24"]){
    const ref=index.entries.find(row=>row.role===role)?.record;need(ref,"CA004_HISTORICAL_ROLE");
    const value=repo.json(SOURCE,ref);repo.read(SOURCE,value.report);
    need(value.sourceCommit===old.sourceCommit && value.candidateDigest===historicalResult.closure.binding.candidateDigest && value.liveAllowed===false,"CA004_HISTORICAL_ROLE");
  }
  return {old,oldLedger,oldCandidate,oldRegistry,historicalResult};
}
function verifySourceInventory(ctx) {
  const value=getData(ctx,"source-inventory.json");
  keys(value,["result","baseCommit","J2","sourceCommit","sourceTree","sourceInventoryDigest","sourcePaths","parentDelta","artifactSource","entries"],"CA004_SOURCE_INVENTORY_SCHEMA");
  need(value.result==="pass" && value.baseCommit===BASE && value.sourceCommit===SOURCE && value.sourceTree===SOURCE_TREE && value.sourcePaths===19 && value.sourceInventoryDigest===SOURCE_INVENTORY_DIGEST,"CA004_SOURCE_INVENTORY");
  same(value.entries.map(row=>row.path),ctx.repo.changed(BASE,SOURCE),"CA004_SOURCE_INVENTORY");
  for(const row of value.entries){
    keys(row,["path","before","after"],"CA004_SOURCE_INVENTORY");relative(row.path);
    for(const [key,ref] of [["before",BASE],["after",SOURCE]]){
      if(row[key]===null){ctx.repo.absent(ref,row.path);continue;}
      keys(row[key],["mode","objectId","sha256"],"CA004_SOURCE_INVENTORY");
      ctx.repo.read(ref,{path:row.path,...row[key]},false);
    }
  }
  need(digest(value.entries)===SOURCE_INVENTORY_DIGEST,"CA004_SOURCE_INVENTORY_DIGEST");
}
export function validateLedger(ledger,m) {
  keys(ledger,["schemaVersion","sourceCommit","sourceTree","innerCommit","releaseCommit","codeFiles","outerFiles","observerFiles","dependencies","bundleDigest"],"CA004_LEDGER_SCHEMA");
  need(ledger.schemaVersion==="ca004-checker-ledger.v1" && ledger.sourceCommit===SOURCE && ledger.sourceTree===SOURCE_TREE && ledger.innerCommit===m.checkerInnerCommit && ledger.releaseCommit===m.checkerReleaseCommit,"CA004_LEDGER_BINDING");
  need(digest({codeFiles:ledger.codeFiles,outerFiles:ledger.outerFiles,observerFiles:ledger.observerFiles,dependencies:ledger.dependencies})===ledger.bundleDigest && ledger.bundleDigest===m.checkerBundleDigest,"CA004_LEDGER_DIGEST");return ledger;
}
export function validateEvidenceRecord(record,role,ctx,reportBytes) {
  keys(record,["schemaVersion","role","reviewer","reviewedAt","sourceCommit","sourceTree","candidateDigest","checkerReleaseCommit","checkerBundleDigest","report","decision","scope","liveAllowed"],"CA004_REVIEW_SCHEMA");
  need(record.schemaVersion==="ca004-review.v1" && record.role===role && ROLES.includes(role) && typeof record.reviewer==="string" && record.reviewer.length>0 && record.decision==="approved-for-ca004-bounded-readiness" && record.liveAllowed===false,"CA004_REVIEW_DECISION");
  need(record.reviewer===REVIEWERS[role],"CA004_REVIEW_IDENTITY");
  need(record.sourceCommit===SOURCE && record.sourceTree===SOURCE_TREE && record.candidateDigest===CANDIDATE_DIGEST && record.checkerReleaseCommit===ctx.m.checkerReleaseCommit && record.checkerBundleDigest===ctx.m.checkerBundleDigest,"CA004_REVIEW_BINDING");
  reference(record.report);need(record.report.path===PREFIX+"/evidence/"+role.toLowerCase()+".md" && record.report.sha256===hash(reportBytes) && reportBytes.length>0,"CA004_REVIEW_REPORT");
  const scope={A18:"unchanged-content-and-exact-tooling-delta",A11:"source-regression-and-checker-freeze",A23:"source-currentness-and-checker-freeze",A22:"source-build-and-release-boundaries",A25:"source-ancestry-and-custody"};
  need(record.scope===scope[role],"CA004_REVIEW_SCOPE");
  const reviewed=time(record.reviewedAt);need(reviewed>=ctx.repo.time(ctx.m.checkerReleaseCommit) && Math.floor(reviewed/1000)<=ctx.repo.time(ctx.m.evidenceCommit)/1000,"CA004_REVIEW_TIME");
  if(["A18","A11","A23"].includes(role))need(!ctx.m.sourceAuthors.includes(record.reviewer),"CA004_REVIEW_INDEPENDENCE");
  if(["A11","A23"].includes(role))need(!ctx.m.checkerAuthors.includes(record.reviewer),"CA004_REVIEW_INDEPENDENCE");return record;
}
function verifyDiagnostic(ctx) {
  const rawHashes={"runtime.json":"997b517c5689f3077a1b852e0b3e82d86cb475faf47b61ea324ed055804ad10c","diagnostic-execution.json":"ac38c9dc31eec68f4d6a1a8057e446471c3e937dc1510caacee19493e047db54","diagnostic-observation.json":"e112aa1f801a49d86dec9afe19ca360db26e92c5f439d8d8eca853868d200174","diagnostic-source-binding.json":"8153dacd85d21070ad01030967c1c4a40a9c96108633fea39cf098f5d3b7fc2f"};
  for(const [file,expected] of Object.entries(rawHashes))need(hash(getData(ctx,file,false))===expected,"CA004_FROZEN_DIAGNOSTIC");
  const runtime=getData(ctx,"runtime.json"),execution=getData(ctx,"diagnostic-execution.json"),observed=getData(ctx,"diagnostic-observation.json"),sourceBinding=getData(ctx,"diagnostic-source-binding.json");
  need(runtime.result==="observed" && runtime.observedHead===SOURCE && runtime.observedTree===SOURCE_TREE && runtime.diagnosticOnly===true && runtime.nativeCA004Executed===false && runtime.liveAllowed===false,"CA004_DIAGNOSTIC_SCOPE");
  need(execution.runId==="41382737777" && execution.runAttempt==="1" && execution.observedHead===SOURCE && execution.exitCode===0 && execution.diagnosticOnly===true && execution.liveAllowed===false,"CA004_DIAGNOSTIC_EXECUTION");
  const mapping={"diagnostic.json":"runtime.json","diagnostic.stdout":"diagnostic.stdout","diagnostic.stderr":"diagnostic.stderr","observation.json":"diagnostic-observation.json","source-binding.json":"diagnostic-source-binding.json"};
  same(execution.files.map(row=>row.name),Object.keys(mapping).sort(),"CA004_DIAGNOSTIC_FILES");
  for(const record of execution.files){keys(record,["name","bytes","sha256"],"CA004_DIAGNOSTIC_FILE");const bytes=getData(ctx,mapping[record.name],false);need(bytes.length===record.bytes && hash(bytes)===record.sha256,"CA004_DIAGNOSTIC_HASH");}
  need(getData(ctx,"diagnostic.stderr",false).length===0,"CA004_DIAGNOSTIC_STDERR");
  need(sourceBinding.observedHead===SOURCE && sourceBinding.observedTree===SOURCE_TREE && sourceBinding.observerBundleDigest===OBSERVER_BUNDLE,"CA004_DIAGNOSTIC_BUNDLE");
  same(sourceBinding.observerFiles,ctx.ledger.observerFiles,"CA004_DIAGNOSTIC_BUNDLE");same([sourceBinding.dependency],ctx.ledger.dependencies,"CA004_DIAGNOSTIC_DEPENDENCY");
  const adapter={...ctx.history.old,sourceCommit:SOURCE,sourceTree:SOURCE_TREE,checkerReleaseCommit:SOURCE,checkerBundleDigest:OBSERVER_BUNDLE,runtime:{...ctx.history.old.runtime,policyDigest:POLICY_DIGEST}};
  const projection=ctx.native.validateRuntimeResult(observed,adapter,ctx.history.oldRegistry,ctx.candidate);
  validateCanonicalAuditIdentity(ctx.history.oldRegistry.expectedCanonicalAudit,observed.audit);
  same(projection,runtime.projection,"CA004_DIAGNOSTIC_PROJECTION");
  need(projection.policyDigest===POLICY_DIGEST && projection.auditDigest===AUDIT_DIGEST,"CA004_DIAGNOSTIC_POLICY");
  return runtime;
}
export async function phasePreflight(repoRoot,manifestPath=MANIFEST) {
  need(manifestPath===MANIFEST && path.isAbsolute(repoRoot) && realpathSync(repoRoot)===repoRoot,"CA004_ROOT");
  const native=await nativeModules(),repo=new native.Repository(repoRoot);repo.clean();verifySourceComposition(repo);
  const m=validateManifest(repo.json(repo.head,{path:MANIFEST}));
  const executionCommit=repo.addition(MANIFEST);need(repo.head===executionCommit,"CA004_EXECUTION_CHECKOUT");
  validatePhaseDelta({actualParents:repo.parents(m.checkerInnerCommit),expectedParent:SOURCE,actualPaths:repo.changed(SOURCE,m.checkerInnerCommit),expectedPaths:CODE_PATHS});
  validatePhaseDelta({actualParents:repo.parents(m.checkerReleaseCommit),expectedParent:m.checkerInnerCommit,actualPaths:repo.changed(m.checkerInnerCommit,m.checkerReleaseCommit),expectedPaths:OUTER_CODE_PATHS});
  validatePhaseDelta({actualParents:repo.parents(m.evidenceCommit),expectedParent:m.checkerReleaseCommit,actualPaths:repo.changed(m.checkerReleaseCommit,m.evidenceCommit),expectedPaths:EVIDENCE_PATHS});
  validatePhaseDelta({actualParents:repo.parents(executionCommit),expectedParent:m.evidenceCommit,actualPaths:repo.changed(m.evidenceCommit,executionCommit),expectedPaths:EXECUTION_PATHS});
  for(const file of CODE_PATHS)repo.absent(SOURCE,file);
  for(const file of EVIDENCE_PATHS){repo.absent(m.checkerReleaseCommit,file);need(repo.addition(file)===m.evidenceCommit,"CA004_EVIDENCE_FIRST_ADD");const bytes=repo.read(m.evidenceCommit,{path:file}).bytes;if(file.endsWith(".json"))native.parse(bytes);}
  for(const file of EXECUTION_PATHS){repo.absent(m.evidenceCommit,file);need(repo.addition(file)===executionCommit,"CA004_EXECUTION_FIRST_ADD");}
  for(const file of RECEIPT_PATHS)repo.absent(executionCommit,file);
  const descriptor=repo.json(executionCommit,{path:PREFIX+"/successor.json"});
  keys(descriptor,["schemaVersion","manifest","evidenceCommit","candidateChanged","substantiveContentChanged","historicalClosureOverwritten","liveAllowed"],"CA004_DESCRIPTOR_SCHEMA");
  need(descriptor.schemaVersion==="ca004-successor.v1" && descriptor.evidenceCommit===m.evidenceCommit && descriptor.candidateChanged===true && descriptor.substantiveContentChanged===false && descriptor.historicalClosureOverwritten===false && descriptor.liveAllowed===false,"CA004_DESCRIPTOR");
  same(descriptor.manifest,{path:MANIFEST,sha256:hash(repo.read(executionCommit,{path:MANIFEST}).bytes)},"CA004_DESCRIPTOR");
  const ctx={repo,native,m,executionCommit,executionTree:repo.tree(executionCommit)};
  ctx.history=verifyHistorical(ctx);ctx.ledger=validateLedger(getData(ctx,"checker-release.json"),m);
  exactBindingFiles(repo,m.checkerInnerCommit,ctx.ledger.codeFiles,CODE_PATHS);exactBindingFiles(repo,m.checkerReleaseCommit,ctx.ledger.codeFiles,CODE_PATHS);
  exactBindingFiles(repo,m.checkerReleaseCommit,ctx.ledger.outerFiles,OUTER_CODE_PATHS);
  const packages=Object.keys(PACKAGE_HASHES).sort().map(file=>{const record=repo.read(SOURCE,{path:file,sha256:PACKAGE_HASHES[file]});const {bytes,...binding}=record;return binding;});
  validateObservationBundle(ctx.history.oldLedger,{files:ctx.ledger.observerFiles,dependencies:ctx.ledger.dependencies},packages);
  need(digest({files:ctx.ledger.observerFiles,dependencies:ctx.ledger.dependencies})===OBSERVER_BUNDLE,"CA004_OBSERVER_BUNDLE");
  for(const file of ctx.ledger.observerFiles)repo.read(m.checkerReleaseCommit,file);
  same([native.dependency(repo.root).binding],ctx.ledger.dependencies,"CA004_INSTALLED_DEPENDENCY");
  verifySourceInventory(ctx);ctx.candidate=getData(ctx,"candidate.json");native.validateSchema("candidate",ctx.candidate);validateCandidateDelta(ctx.history.oldCandidate,ctx.candidate);
  need(digest(ctx.candidate)===CANDIDATE_DIGEST,"CA004_CANDIDATE_DIGEST");
  for(const file of ctx.candidate.files){repo.read(SOURCE,file);repo.read(executionCommit,file);}
  for(const file of ctx.candidate.removals){repo.absent(SOURCE,file);repo.absent(executionCommit,file);}
  native.validateCandidate(ctx.candidate,repo.json(SOURCE,{path:"data/generated-content/ccss-textbook-claude-v1/source.json"}),file=>repo.json(SOURCE,{path:file}));
  for(const asset of ctx.candidate.assets){repo.read(SOURCE,asset.retained);repo.read(SOURCE,asset.coverageReport);for(const witness of asset.witnesses)repo.read(SOURCE,witness.source);}
  ctx.reviews=ROLES.map(role=>validateEvidenceRecord(getData(ctx,"evidence/"+role.toLowerCase()+".json"),role,ctx,getData(ctx,"evidence/"+role.toLowerCase()+".md",false)));
  need(new Set(ctx.reviews.filter(row=>["A11","A23"].includes(row.role)).map(row=>row.reviewer)).size===2,"CA004_DISTINCT_REVIEWERS");
  ctx.diagnostic=verifyDiagnostic(ctx);
  repo.clean();return ctx;
}

function expectedPostSourceTree(ctx,observedRepo,receiptStorage=null) {
  const phases=[
    [ctx.m.checkerInnerCommit,CODE_PATHS], [ctx.m.checkerReleaseCommit,OUTER_CODE_PATHS],
    [ctx.m.evidenceCommit,EVIDENCE_PATHS], [ctx.executionCommit,EXECUTION_PATHS],
    ...(receiptStorage ? [[receiptStorage,[...RECEIPT_PATHS].sort()]] : [])
  ];
  const source=ctx.repo.entries(SOURCE),sourceMap=new Map(source.map(row=>[row.path,row]));
  const delta=phases.flatMap(([commit,paths])=>paths.map(file=>{
    const row=ctx.repo.blob(commit,file);return {path:file,before:sourceMap.get(file)??null,after:{path:file,mode:row.mode,objectId:row.objectId}};
  }));
  return validateObservedTreeProjection(source,observedRepo.entries(observedRepo.head),delta,phases.flatMap(([,paths])=>paths).sort());
}
function registryForCandidate(ctx) {
  const registry=structuredClone(ctx.history.oldRegistry);
  registry.targetBaselineCommit=SOURCE;
  const row=registry.resolutions.find(row=>row.resolutionId==="approved-projection-california-middle-lessons-v2");
  need(row?.decision==="retired-replaced-projection","CA004_REGISTRY_TARGET");
  row.replacement.candidateDigest=CANDIDATE_DIGEST;
  const oldDisposition=ctx.repo.json(SOURCE,ctx.history.old.disposition);
  const disposition={...oldDisposition,candidateDigest:CANDIDATE_DIGEST};
  ctx.native.validateRegistry(ctx.repo.json(SOURCE,oldDisposition.predecessorRegistry),registry,disposition,CANDIDATE_DIGEST,SOURCE,registry.expectedCanonicalAudit);
  return registry;
}
export async function observeCurrentHead(ctx,observedRepoRoot=ctx.repo.root) {
  need(path.isAbsolute(observedRepoRoot) && realpathSync(observedRepoRoot)===observedRepoRoot,"CA004_OBSERVED_ROOT");
  const repo=new ctx.native.Repository(observedRepoRoot);repo.clean();
  let storage=null,event="execution";
  if(repo.head!==ctx.executionCommit){
    storage=repo.addition(RECEIPT_PATHS[0]);
    validatePhaseDelta({actualParents:repo.parents(storage),expectedParent:ctx.executionCommit,actualPaths:repo.changed(ctx.executionCommit,storage),expectedPaths:[...RECEIPT_PATHS].sort()});
    for(const file of RECEIPT_PATHS)need(repo.addition(file)===storage,"CA004_RECEIPT_FIRST_ADD");
    if(repo.head===storage)event="pull_request";
    else {event="push";validateMergeBinding({baseCommit:BASE,releaseCommit:storage,mergeCommit:repo.head,mergeParents:repo.parents(repo.head),releaseTree:repo.tree(storage),mergeTree:repo.tree(repo.head)});}
  }
  ctx.repo.ancestor(SOURCE,repo.head);
  const projection=expectedPostSourceTree(ctx,repo,storage);
  const adapter={...ctx.history.old,sourceCommit:SOURCE,sourceTree:SOURCE_TREE,checkerReleaseCommit:ctx.m.checkerReleaseCommit,checkerBundleDigest:OBSERVER_BUNDLE,runtime:{...ctx.history.old.runtime,policyDigest:POLICY_DIGEST}};
  const registry=registryForCandidate(ctx);
  const observed=await ctx.native.runCapturedObserver(repo,adapter,registry,ctx.ledger.dependencies[0]);
  need(observed.result==="pass",/^CA_[A-Z_]+$/.test(observed.code??"")?observed.code:"CA004_OBSERVER_BLOCKED");
  validateCanonicalAuditIdentity(ctx.history.oldRegistry.expectedCanonicalAudit,observed.audit);
  const runtime=ctx.native.validateRuntimeResult(observed,adapter,registry,ctx.candidate);
  const {dependencyResolutionDigest:unused,...graph}=runtime;
  const {dependencyResolutionDigest:diagnosticDependency,...expectedGraph}=ctx.diagnostic.projection;
  same(graph,expectedGraph,"CA004_CURRENT_GRAPH_DRIFT");
  // The captured native observer independently verifies actual R2/B4 and the
  // executed TypeScript entry; this digest correctly differs from diagnostic C.
  need(HASH.test(runtime.dependencyResolutionDigest),"CA004_CURRENT_DEPENDENCY");
  repo.clean();same(expectedPostSourceTree(ctx,repo,storage),projection,"CA004_POST_OBSERVATION_DRIFT");
  return {schemaVersion:"ca004-current-observation.v1",sourceCommit:SOURCE,sourceTree:SOURCE_TREE,executionCommit:repo.head,observedHead:repo.head,observedTree:repo.tree(repo.head),event,receiptStorage:storage,treeProjectionDigest:projection.deltaDigest,runtime,registryDigest:digest(registry),liveAllowed:false};
}
export async function validateAttempt(repoRoot,manifestPath=MANIFEST) {
  const ctx=await phasePreflight(repoRoot,manifestPath);
  const observation=await observeCurrentHead(ctx);
  const binding={sourceCommit:SOURCE,sourceTree:SOURCE_TREE,candidateDigest:CANDIDATE_DIGEST,checkerReleaseCommit:ctx.m.checkerReleaseCommit,checkerBundleDigest:ctx.m.checkerBundleDigest,evidenceCommit:ctx.m.evidenceCommit,executionCommit:ctx.executionCommit,executionTree:ctx.executionTree,manifestSha256:hash(ctx.repo.read(ctx.executionCommit,{path:MANIFEST}).bytes),observerBundleDigest:OBSERVER_BUNDLE,policyDigest:POLICY_DIGEST,auditDigest:AUDIT_DIGEST,historicalClosureDigest:OLD_CLOSURE,runtimeDigest:digest(observation.runtime)};
  return {schemaVersion:"ca004-validation.v1",result:"pass",binding,observation,lifecycleState:"shadow_ready",liveAllowed:false};
}
function validateProof(proof) {
  keys(proof,["sourceCommit","sourceTree","candidateDigest","checkerReleaseCommit","checkerBundleDigest","evidenceCommit","executionCommit","executionTree","manifestSha256","observerBundleDigest","policyDigest","auditDigest","historicalClosureDigest","runtimeDigest"],"CA004_PROOF_SCHEMA");
  need(proof.sourceCommit===SOURCE && proof.sourceTree===SOURCE_TREE && proof.candidateDigest===CANDIDATE_DIGEST,"CA004_PROOF_SOURCE");
  for(const key of ["sourceCommit","sourceTree","checkerReleaseCommit","evidenceCommit","executionCommit","executionTree"])need(SHA.test(proof[key]),"CA004_PROOF_SHA");
  for(const key of ["candidateDigest","checkerBundleDigest","manifestSha256","observerBundleDigest","policyDigest","auditDigest","historicalClosureDigest","runtimeDigest"])need(HASH.test(proof[key]),"CA004_PROOF_HASH");
}
export const receiptSemantics = receipt => ({binding:receipt.binding,effects:receipt.effects,rehearsal:receipt.rehearsal,lifecycleState:receipt.lifecycleState,liveAllowed:receipt.liveAllowed});
export function sealReceipt(binding,runId,outputDigest) {
  validateProof(binding);need(typeof runId==="string" && /^[a-zA-Z0-9][a-zA-Z0-9.-]{5,159}$/.test(runId) && HASH.test(outputDigest),"CA004_RUN_ID");
  const receipt={schemaVersion:"ca004-receipt.v1",mode:"shadow",result:"pass",runId,producedAt:new Date().toISOString(),binding:structuredClone(binding),effects:{...ZERO_EFFECTS},rehearsal:{outputDigest,temporaryOnly:true,rollbackComplete:true},lifecycleState:"shadow_ready",liveAllowed:false};
  receipt.semanticDigest=digest(receiptSemantics(receipt));receipt.rawDigest=digest(receipt);return receipt;
}
export function verifyReceiptRecord(receipt,proof) {
  keys(receipt,["schemaVersion","mode","result","runId","producedAt","binding","effects","rehearsal","lifecycleState","liveAllowed","semanticDigest","rawDigest"],"CA004_RECEIPT_SCHEMA");
  need(receipt.schemaVersion==="ca004-receipt.v1" && receipt.mode==="shadow" && receipt.result==="pass" && receipt.lifecycleState==="shadow_ready" && receipt.liveAllowed===false,"CA004_RECEIPT_SCOPE");
  validateProof(receipt.binding);same(receipt.binding,proof,"CA004_RECEIPT_BINDING");time(receipt.producedAt);
  need(typeof receipt.runId==="string" && /^[a-zA-Z0-9][a-zA-Z0-9.-]{5,159}$/.test(receipt.runId),"CA004_RUN_ID");
  same(receipt.effects,ZERO_EFFECTS,"CA004_RECEIPT_EFFECTS");keys(receipt.rehearsal,["outputDigest","temporaryOnly","rollbackComplete"],"CA004_REHEARSAL");
  need(HASH.test(receipt.rehearsal.outputDigest) && receipt.rehearsal.temporaryOnly===true && receipt.rehearsal.rollbackComplete===true,"CA004_REHEARSAL");
  const {rawDigest,...body}=receipt;need(digest(body)===rawDigest && digest(receiptSemantics(receipt))===receipt.semanticDigest,"CA004_RECEIPT_DIGEST");return receipt;
}
export function compareReceipts(receipts,proof) {
  need(Array.isArray(receipts) && receipts.length===3,"CA004_RECEIPT_COUNT");receipts.forEach(r=>verifyReceiptRecord(r,proof));
  need(new Set(receipts.map(r=>r.runId)).size===3,"CA004_RECEIPT_DISTINCT");same(receipts.map(r=>r.semanticDigest),Array(3).fill(receipts[0].semanticDigest),"CA004_RECEIPT_SEMANTICS");
  return {semanticDigest:receipts[0].semanticDigest,comparisonDigest:digest(receipts.map(r=>({runId:r.runId,rawDigest:r.rawDigest,semanticDigest:r.semanticDigest}))),distinctExecutions:3};
}
export async function shadowAttempt(repoRoot,manifestPath,runId) {
  const before=await validateAttempt(repoRoot,manifestPath);let owned,outputDigest;
  try {owned=mkdtempSync(path.join(realpathSync("/tmp"),"CA004-shadow-"));const bytes=Buffer.from(stable({binding:before.binding,observation:before.observation}));writeFileSync(path.join(owned,"shadow.json"),bytes,{flag:"wx",mode:0o600});outputDigest=hash(readFileSync(path.join(owned,"shadow.json")));}
  finally {if(owned)rmSync(owned,{recursive:true,force:true});}
  need(owned && !existsSync(owned),"CA004_TEMP_ROLLBACK");const after=await validateAttempt(repoRoot,manifestPath);same(after,before,"CA004_SHADOW_DRIFT");return sealReceipt(before.binding,runId,outputDigest);
}
function readTransport(ctx,transport) {
  keys(transport,["path","storageCommit","sha256"],"CA004_TRANSPORT_SCHEMA");need(RECEIPT_PATHS.includes(transport.path) && SHA.test(transport.storageCommit) && HASH.test(transport.sha256),"CA004_TRANSPORT");
  validatePhaseDelta({actualParents:ctx.repo.parents(transport.storageCommit),expectedParent:ctx.executionCommit,actualPaths:ctx.repo.changed(ctx.executionCommit,transport.storageCommit),expectedPaths:[...RECEIPT_PATHS].sort()});
  const record=ctx.repo.read(transport.storageCommit,{path:transport.path,sha256:transport.sha256},false);need(record.mode==="100644","CA004_TRANSPORT_MODE");
  const receipt=ctx.native.parse(record.bytes);validateReceiptChronology(receipt,ctx.repo.time(ctx.executionCommit),ctx.repo.time(transport.storageCommit));return receipt;
}
export function validateReceiptChronology(receipt,executionTime,storageTime) {const produced=time(receipt.producedAt);need(Number.isFinite(executionTime)&&Number.isFinite(storageTime)&&produced>=executionTime&&Math.floor(produced/1000)<=storageTime/1000,"CA004_RECEIPT_TIME");}
export async function verifyStoredReceipt(repoRoot,manifestPath,transport) {
  const ctx=await phasePreflight(repoRoot,manifestPath),validation=await validateAttempt(repoRoot,manifestPath),stored=readTransport(ctx,transport);
  verifyReceiptRecord(stored,validation.binding);const replay=await shadowAttempt(repoRoot,manifestPath,"verify-"+randomUUID());need(replay.semanticDigest===stored.semanticDigest,"CA004_TRANSPORT_REPLAY");
  return {schemaVersion:"ca004-verification.v1",result:"pass",transport,binding:validation.binding,semanticDigest:stored.semanticDigest,replayRunId:replay.runId,liveAllowed:false};
}

const issuedCiProjections = new WeakMap();
function freezeData(value) {if(value&&typeof value==="object"){for(const child of Object.values(value))freezeData(child);Object.freeze(value);}return value;}
export function validateCiProviderProjection(provider,mergeCommit,releaseCommit) {
  const issued=provider&&issuedCiProjections.get(provider);
  need(issued && issued.digest===digest(provider) && issued.mergeCommit===mergeCommit && issued.releaseCommit===releaseCommit,"CA004_CI_UNISSUED");
  return validateCiProviderStructure(provider,mergeCommit,releaseCommit);
}
function validateCiProviderStructure(provider,mergeCommit,releaseCommit) {
  keys(provider,["schemaVersion","repository","repositoryId","pullRequestNumber","baseCommit","releaseCommit","mergeCommit","mainRef","observedAt","checks","responses"],"CA004_CI_SCHEMA");
  need(provider.schemaVersion==="ca004-ci-provider.v1" && provider.repository==="HUDongpin/MAIS-MVP" && provider.repositoryId===1287988109 && provider.pullRequestNumber===308 && provider.baseCommit===BASE && provider.releaseCommit===releaseCommit && provider.mergeCommit===mergeCommit && provider.mainRef===mergeCommit,"CA004_CI_TARGET");
  time(provider.observedAt);need(Array.isArray(provider.checks)&&provider.checks.length===16,"CA004_CI_COUNT");
  const runs={};
  for(const [phase,head,event] of [["pr",releaseCommit,"pull_request"],["main",mergeCommit,"push"]]){
    const rows=provider.checks.filter(row=>row.phase===phase);
    same(rows.map(row=>row.name),REQUIRED_CHECKS,"CA004_CI_NAMES");
    for(const row of rows){
      keys(row,["phase","name","head","status","conclusion","appId","runId","runAttempt","jobId","workflowPath","event","runStatus","runConclusion","completedAt"],"CA004_CI_CHECK_SCHEMA");
      need(row.head===head && row.status==="completed" && row.conclusion==="success" && row.appId===15368 && row.runStatus==="completed" && row.runConclusion==="success" && row.event===event,"CA004_CI_RESULT");
      need([row.runId,row.runAttempt,row.jobId].every(n=>Number.isSafeInteger(n)&&n>0),"CA004_CI_ID");
      const workflow=row.name==="promotion-shadow-gate"?".github/workflows/promotion-shadow.yml":".github/workflows/ci.yml";
      need(row.workflowPath===workflow,"CA004_CI_WORKFLOW");time(row.completedAt);
    }
    const ciRows=rows.filter(row=>row.name!=="promotion-shadow-gate");need(new Set(ciRows.map(row=>row.runId)).size===1 && new Set(ciRows.map(row=>row.runAttempt)).size===1,"CA004_CI_RUN_COHERENCE");
    runs[phase+"Ci"]=ciRows[0].runId;runs[phase+"Promotion"]=rows.find(row=>row.name==="promotion-shadow-gate").runId;
  }
  const api="/repos/HUDongpin/MAIS-MVP";
  const endpoints={repository:api,pullRequest:api+"/pulls/308",mainBefore:api+"/git/ref/heads/main",mainAfter:api+"/git/ref/heads/main",prChecks:api+"/commits/"+releaseCommit+"/check-runs?filter=all&per_page=100",mainChecks:api+"/commits/"+mergeCommit+"/check-runs?filter=all&per_page=100",...Object.fromEntries(Object.entries(runs).map(([name,id])=>[name,api+"/actions/runs/"+id]))};
  need(Array.isArray(provider.responses),"CA004_CI_RESPONSES");same(provider.responses.map(row=>row.name),Object.keys(endpoints).sort(),"CA004_CI_RESPONSES");
  for(const row of provider.responses){keys(row,["name","path","sha256"],"CA004_CI_RESPONSE");need(row.path===endpoints[row.name]&&HASH.test(row.sha256),"CA004_CI_RESPONSE");}
  return {ciBindingDigest:digest({repositoryId:provider.repositoryId,pullRequestNumber:308,baseCommit:BASE,releaseCommit,mergeCommit,checks:provider.checks}),latestCompletedAt:Math.max(...provider.checks.map(row=>Date.parse(row.completedAt)))};
}
export async function collectGithubEvidence({mergeCommit,releaseCommit,token,fetchImpl=globalThis.fetch}) {
  need(SHA.test(mergeCommit)&&SHA.test(releaseCommit)&&mergeCommit!==releaseCommit&&typeof token==="string"&&token.length>=20&&token.length<=2048&&!/[\s\u0000-\u001f\u007f]/u.test(token)&&typeof fetchImpl==="function","CA004_GITHUB_AUTH");
  const native=await nativeModules(),api="/repos/HUDongpin/MAIS-MVP",responses=[];
  const request=async(name,pathname)=>{
    need(pathname===api||pathname.startsWith(api+"/"),"CA004_GITHUB_BOUNDARY");
    let response;try{response=await fetchImpl("https://api.github.com"+pathname,{method:"GET",redirect:"error",signal:AbortSignal.timeout(15000),headers:{accept:"application/vnd.github+json",authorization:"Bearer "+token,"x-github-api-version":"2022-11-28"}});}catch{need(false,"CA004_GITHUB_REQUEST");}
    need(response?.status===200&&response.body&&/application\/(?:[^;]+\+)?json/i.test(response.headers.get("content-type")??""),"CA004_GITHUB_RESPONSE");
    const reader=response.body.getReader(),chunks=[];let size=0;
    try{for(;;){const row=await reader.read();if(row.done)break;size+=row.value.length;need(size<=4*1024*1024,"CA004_GITHUB_SIZE");chunks.push(Buffer.from(row.value));}}finally{await reader.cancel().catch(()=>{});}
    const bytes=Buffer.concat(chunks),value=native.parse(bytes);responses.push({name,path:pathname,sha256:hash(bytes)});return value;
  };
  const repository=await request("repository",api);
  need(repository.id===1287988109&&repository.full_name==="HUDongpin/MAIS-MVP"&&repository.html_url==="https://github.com/HUDongpin/MAIS-MVP","CA004_GITHUB_REPOSITORY");
  const pr=await request("pullRequest",api+"/pulls/308");
  need(pr.number===308&&pr.state==="closed"&&pr.merged===true&&pr.merge_commit_sha===mergeCommit&&pr.head?.sha===releaseCommit&&pr.base?.sha===BASE&&pr.base?.ref==="main"&&pr.base.repo?.id===1287988109&&pr.head.repo?.id===1287988109,"CA004_GITHUB_PR");
  const before=await request("mainBefore",api+"/git/ref/heads/main");need(before.ref==="refs/heads/main"&&before.object?.sha===mergeCommit,"CA004_GITHUB_MAIN");
  const checks=[];
  const runOf=check=>{
    const match=String(check.details_url??"").match(/^https:\/\/github\.com\/HUDongpin\/MAIS-MVP\/actions\/runs\/([1-9][0-9]*)\/job\/([1-9][0-9]*)$/u);
    need(match,"CA004_GITHUB_JOB_URL");const runId=Number(match[1]),jobId=Number(match[2]);need(Number.isSafeInteger(runId)&&Number.isSafeInteger(jobId),"CA004_GITHUB_JOB_ID");return {runId,jobId};
  };
  for(const [phase,head,event] of [["pr",releaseCommit,"pull_request"],["main",mergeCommit,"push"]]){
    const payload=await request(phase+"Checks",api+"/commits/"+head+"/check-runs?filter=all&per_page=100");
    need(Number.isSafeInteger(payload.total_count)&&payload.total_count<=100&&Array.isArray(payload.check_runs),"CA004_GITHUB_CHECK_LIMIT");
    const matching=payload.check_runs.filter(row=>row.head_sha===head&&row.app?.id===15368&&row.app?.slug==="github-actions"&&REQUIRED_CHECKS.includes(row.name));
    const latest=name=>matching.filter(row=>row.name===name&&row.conclusion!=="skipped").sort((a,b)=>b.id-a.id)[0];
    const latestCi=latest("validate"),latestPromotion=latest("promotion-shadow-gate");need(latestCi&&latestPromotion,"CA004_GITHUB_REQUIRED_CHECK");
    const ciId=runOf(latestCi).runId,promotionId=runOf(latestPromotion).runId;
    const ciRun=await request(phase+"Ci",api+"/actions/runs/"+ciId),promotionRun=await request(phase+"Promotion",api+"/actions/runs/"+promotionId);
    for(const [run,id,workflow] of [[ciRun,ciId,".github/workflows/ci.yml"],[promotionRun,promotionId,".github/workflows/promotion-shadow.yml"]])need(run.id===id&&run.head_sha===head&&run.event===event&&run.path===workflow&&run.repository?.id===1287988109&&run.head_repository?.id===1287988109&&run.status==="completed"&&run.conclusion==="success"&&Number.isSafeInteger(run.run_attempt)&&run.run_attempt>0,"CA004_GITHUB_RUN");
    for(const name of REQUIRED_CHECKS){
      const promotion=name==="promotion-shadow-gate",run=promotion?promotionRun:ciRun,runId=promotion?promotionId:ciId;
      const row=matching.filter(row=>row.name===name&&runOf(row).runId===runId).sort((a,b)=>b.id-a.id)[0];
      need(row&&row.status==="completed"&&row.conclusion==="success"&&Number.isFinite(Date.parse(row.completed_at)),"CA004_GITHUB_CHECK_FAILED");
      checks.push({phase,name,head,status:row.status,conclusion:row.conclusion,appId:row.app.id,runId,runAttempt:run.run_attempt,jobId:runOf(row).jobId,workflowPath:run.path,event:run.event,runStatus:run.status,runConclusion:run.conclusion,completedAt:new Date(row.completed_at).toISOString()});
    }
  }
  const after=await request("mainAfter",api+"/git/ref/heads/main");need(after.ref==="refs/heads/main"&&after.object?.sha===mergeCommit,"CA004_GITHUB_MAIN_MOVED");
  const provider={schemaVersion:"ca004-ci-provider.v1",repository:"HUDongpin/MAIS-MVP",repositoryId:1287988109,pullRequestNumber:308,baseCommit:BASE,releaseCommit,mergeCommit,mainRef:mergeCommit,observedAt:new Date().toISOString(),checks,responses:responses.sort((a,b)=>a.name.localeCompare(b.name))};
  validateCiProviderStructure(provider,mergeCommit,releaseCommit);
  issuedCiProjections.set(provider,{digest:digest(provider),mergeCommit,releaseCommit});return freezeData(provider);
}
export function validatePostMergeEvidence(value,ctx,observation,receipts,provider) {
  keys(value,["schemaVersion","mergeCommit","reviews","ownerAuthorization"],"CA004_FINAL_EVIDENCE_SCHEMA");
  need(value.schemaVersion==="ca004-finalization-evidence.v1" && observation.event==="push" && value.mergeCommit===observation.observedHead,"CA004_FINAL_HEAD");
  const ci=validateCiProviderProjection(provider,observation.observedHead,observation.receiptStorage);
  need(Array.isArray(value.reviews),"CA004_FINAL_REVIEWS");same(value.reviews.map(row=>row.role),["A11","A23","A22","A25"],"CA004_FINAL_ROLES");
  for(const review of value.reviews){
    keys(review,["schemaVersion","role","reviewer","reviewedAt","sourceCommit","candidateDigest","checkerReleaseCommit","checkerBundleDigest","executionCommit","mergeCommit","receiptHashes","ciBindingDigest","report","decision","liveAllowed"],"CA004_FINAL_REVIEW_SCHEMA");
    need(review.schemaVersion==="ca004-postmerge-review.v1" && review.reviewer===REVIEWERS[review.role] && review.decision==="approved-for-exact-ca004-finalization" && review.liveAllowed===false,"CA004_FINAL_REVIEW");
    need(review.sourceCommit===SOURCE && review.candidateDigest===CANDIDATE_DIGEST && review.checkerReleaseCommit===ctx.m.checkerReleaseCommit && review.checkerBundleDigest===ctx.m.checkerBundleDigest && review.executionCommit===ctx.executionCommit && review.mergeCommit===observation.observedHead && review.ciBindingDigest===ci.ciBindingDigest,"CA004_FINAL_REVIEW_BINDING");
    same(review.receiptHashes,receipts.map(row=>row.sha256),"CA004_FINAL_RECEIPTS");
    const reviewed=time(review.reviewedAt);need(reviewed>=ci.latestCompletedAt && reviewed>=ctx.repo.time(observation.observedHead),"CA004_FINAL_REVIEW_TIME");
    keys(review.report,["text","sha256"],"CA004_FINAL_REPORT");need(typeof review.report.text==="string" && Buffer.byteLength(review.report.text)>0 && Buffer.byteLength(review.report.text)<=16384 && hash(Buffer.from(review.report.text))===review.report.sha256,"CA004_FINAL_REPORT");
  }
  const owner=value.ownerAuthorization;
  keys(owner,["schemaVersion","releaseSha","target","actions","reference","recordedAt"],"CA004_OWNER_SCHEMA");
  need(owner.schemaVersion==="ca004-owner-release-auth.v1" && owner.releaseSha===observation.observedHead && owner.target==="production:www.mais.ac,www.mais.hk" && owner.reference==="owner-chat-01a19836-d9ec-7151-b60f-9481ac983f11","CA004_OWNER_AUTHORIZATION");
  same(owner.actions,["deploy","promote","enable-hourly-scheduler"],"CA004_OWNER_ACTIONS");time(owner.recordedAt);
  return {ciBindingDigest:ci.ciBindingDigest,evidenceDigest:digest(value),providerProof:provider,reviewers:value.reviews.map(row=>({role:row.role,reviewer:row.reviewer,reviewedAt:row.reviewedAt,reportSha256:row.report.sha256})),ownerAuthorization:owner};
}
function validateCurrentObservation(value,proof) {
  keys(value,["schemaVersion","sourceCommit","sourceTree","executionCommit","observedHead","observedTree","event","receiptStorage","treeProjectionDigest","runtime","registryDigest","liveAllowed"],"CA004_OBSERVATION_SCHEMA");
  need(value.schemaVersion==="ca004-current-observation.v1" && value.sourceCommit===SOURCE && value.sourceTree===SOURCE_TREE && value.executionCommit===value.observedHead && SHA.test(value.observedHead) && SHA.test(value.observedTree) && value.event==="push" && SHA.test(value.receiptStorage) && HASH.test(value.treeProjectionDigest) && value.registryDigest==="8706d9312d41725f7a0ba5cbc91356b78639119be4611c500a3619abeafb34c9" && value.liveAllowed===false,"CA004_OBSERVATION_BINDING");
  const dependencyResolution={schemaVersion:"ca-dependency-resolution.v1",strategy:"explicit-captured-file-url",entryRelativePath:"node_modules/typescript/lib/typescript.js",entrySha256:"dd17428736a07e1db1a138d8a14295ddb2699ba780ee15038acdd2c6da5373a0",dependencyTreeDigest:"5d20297c46dda5c56c1634b953e2fd33972c9dab2e6426fd0d1d8ccc119610dd",version:"5.8.3",checkerReleaseCommit:proof.checkerReleaseCommit,checkerBundleDigest:OBSERVER_BUNDLE,entryExecuted:true,sourceSnapshotExecuted:false,codeAndDataSeparated:true};
  const expected={policyDigest:POLICY_DIGEST,auditDigest:AUDIT_DIGEST,jsonConsumerCount:65,jsonConsumerDigest:"c601bed8c6f9dfa2d32973289147e558e84324d32defbc6ed594ddaa5eeac8c3",mappingsDigest:"636a7684bbc9ae04e16e4e6103c0f87f398bfa5de5884ef078c7f27a3d70f15e",witnessMembershipDigest:"257102962aff1c1844def2f9f35180c5d37a2052dda3551b8a8b390613c77bff",rawDetectedLoaders:4,reviewedStorageLoaders:4,unclassifiedLoaders:0,storageLoaderPartitionDigest:"ebde0b1704369fb76edd2b6518deece3b940a589538b92d34a8d637e64a00238",issuedObservationDigest:"a9f4f4ef3cff23fed86fab780f5ba70807c6681da379df98bedc2c323de2d6ed",dependencyResolutionDigest:digest(dependencyResolution),retiredProjectionUnreachable:true,newLessonCount:35,effects:ZERO_EFFECTS};
  same(value.runtime,expected,"CA004_FINAL_RUNTIME");need(digest(value.runtime)===proof.runtimeDigest,"CA004_FINAL_RUNTIME_BINDING");return value;
}
function validateClosure(closure) {
  keys(closure,["schemaVersion","binding","receipts","receiptComparison","currentObservation","externalEvidence","acquisitionContext","lifecycleState","currentness","liveBoundary","liveAllowed","closureDigest"],"CA004_CLOSURE_SCHEMA");
  need(closure.schemaVersion==="ca004-closure.v1" && closure.lifecycleState==="shadow_passed" && closure.currentness==="current" && closure.liveBoundary==="unproven" && closure.liveAllowed===false,"CA004_CLOSURE_SCOPE");
  validateProof(closure.binding);const observation=validateCurrentObservation(closure.currentObservation,closure.binding);
  need(Array.isArray(closure.receipts)&&closure.receipts.length===3,"CA004_CLOSURE_RECEIPTS");same(closure.receipts.map(r=>r.path),RECEIPT_PATHS,"CA004_CLOSURE_RECEIPTS");
  for(const ref of closure.receipts){keys(ref,["path","storageCommit","sha256"],"CA004_CLOSURE_TRANSPORT");need(ref.storageCommit===observation.receiptStorage&&HASH.test(ref.sha256),"CA004_CLOSURE_TRANSPORT");}
  keys(closure.receiptComparison,["semanticDigest","comparisonDigest","distinctExecutions"],"CA004_CLOSURE_COMPARISON");need(HASH.test(closure.receiptComparison.semanticDigest)&&HASH.test(closure.receiptComparison.comparisonDigest)&&closure.receiptComparison.distinctExecutions===3,"CA004_CLOSURE_COMPARISON");
  const evidence=closure.externalEvidence;keys(evidence,["ciBindingDigest","evidenceDigest","providerProof","reviewers","ownerAuthorization"],"CA004_CLOSURE_EVIDENCE");
  const ci=validateCiProviderStructure(evidence.providerProof,observation.observedHead,observation.receiptStorage);need(evidence.ciBindingDigest===ci.ciBindingDigest&&HASH.test(evidence.evidenceDigest),"CA004_CLOSURE_CI");
  need(Array.isArray(evidence.reviewers),"CA004_CLOSURE_REVIEWS");same(evidence.reviewers.map(row=>row.role),["A11","A23","A22","A25"],"CA004_CLOSURE_REVIEWS");
  for(const row of evidence.reviewers){keys(row,["role","reviewer","reviewedAt","reportSha256"],"CA004_CLOSURE_REVIEW");need(row.reviewer===REVIEWERS[row.role]&&HASH.test(row.reportSha256)&&time(row.reviewedAt)>=ci.latestCompletedAt,"CA004_CLOSURE_REVIEW");}
  const owner=evidence.ownerAuthorization;keys(owner,["schemaVersion","releaseSha","target","actions","reference","recordedAt"],"CA004_CLOSURE_OWNER");
  need(owner.schemaVersion==="ca004-owner-release-auth.v1"&&owner.releaseSha===observation.observedHead&&owner.target==="production:www.mais.ac,www.mais.hk"&&owner.reference==="owner-chat-01a19836-d9ec-7151-b60f-9481ac983f11","CA004_CLOSURE_OWNER");same(owner.actions,["deploy","promote","enable-hourly-scheduler"],"CA004_CLOSURE_OWNER");time(owner.recordedAt);
  keys(closure.acquisitionContext,["workflowRef","runId","runAttempt","head","event","providerOrigin"],"CA004_ACQUISITION_CONTEXT");
  need(closure.acquisitionContext.workflowRef==="HUDongpin/MAIS-MVP/.github/workflows/ca004-currentness-finalize.yml@refs/heads/main"&&closure.acquisitionContext.head===observation.observedHead&&closure.acquisitionContext.event==="workflow_dispatch"&&closure.acquisitionContext.providerOrigin==="https://api.github.com"&&[closure.acquisitionContext.runId,closure.acquisitionContext.runAttempt].every(n=>Number.isSafeInteger(n)&&n>0),"CA004_ACQUISITION_CONTEXT");
  const {closureDigest,...body}=closure;need(digest(body)===closureDigest,"CA004_CLOSURE_DIGEST");return closure;
}
export function sealFinalization(closure) {
  validateClosure(closure);
  const registered={type:"registered",state:"shadow_ready",commit:closure.binding.executionCommit,previousEventDigest:null,bindingDigest:digest(closure.binding),closureDigest:null,liveAllowed:false};registered.eventDigest=digest(registered);
  const finalized={type:"finalized",state:"shadow_passed",commit:closure.currentObservation.observedHead,previousEventDigest:registered.eventDigest,bindingDigest:digest(closure.binding),closureDigest:closure.closureDigest,liveAllowed:false};finalized.eventDigest=digest(finalized);
  const registry={schemaVersion:"ca004-lifecycle-registry.v1",binding:closure.binding,events:[registered,finalized],state:"shadow_passed",currentness:"current",observedHead:closure.currentObservation.observedHead,closureDigest:closure.closureDigest,liveAllowed:false};registry.registryDigest=digest(registry);
  return {schemaVersion:"ca004-finalization-result.v1",result:"pass",closure,registry,lifecycleState:"shadow_passed",liveAllowed:false};
}
export function validateFinalizationShape(value) {
  keys(value,["schemaVersion","result","closure","registry","lifecycleState","liveAllowed"],"CA004_FINALIZATION_SCHEMA");need(value.schemaVersion==="ca004-finalization-result.v1"&&value.result==="pass"&&value.lifecycleState==="shadow_passed"&&value.liveAllowed===false,"CA004_FINALIZATION_SCOPE");
  validateClosure(value.closure);same(value,sealFinalization(value.closure),"CA004_REGISTRY_CHAIN");return value;
}
export function verifyFinalizationRecord(value,expected) {
  validateFinalizationShape(value);keys(expected,["provider","binding","observation","receipts","receiptComparison","externalEvidence","acquisitionContext"],"CA004_FINALIZATION_CONTEXT");
  validateCiProviderProjection(expected.provider,value.closure.currentObservation.observedHead,value.closure.currentObservation.receiptStorage);
  same(value.closure.externalEvidence.providerProof,expected.provider,"CA004_FINALIZATION_PROVIDER");
  same(value.closure.binding,expected.binding,"CA004_FINALIZATION_BINDING");same(value.closure.currentObservation,expected.observation,"CA004_FINALIZATION_OBSERVATION");
  same(value.closure.receipts,expected.receipts,"CA004_FINALIZATION_RECEIPTS");
  same(value.closure.receiptComparison,expected.receiptComparison,"CA004_FINALIZATION_COMPARISON");
  same(value.closure.externalEvidence,expected.externalEvidence,"CA004_FINALIZATION_EVIDENCE");
  same(value.closure.acquisitionContext,expected.acquisitionContext,"CA004_FINALIZATION_ACQUISITION");return value;
}
function finalizationContext(head) {
  need(process.env.GITHUB_ACTIONS==="true"&&process.env.GITHUB_REPOSITORY==="HUDongpin/MAIS-MVP"&&process.env.GITHUB_REPOSITORY_ID==="1287988109"&&process.env.GITHUB_REF==="refs/heads/main"&&process.env.GITHUB_REF_PROTECTED==="true"&&process.env.GITHUB_SHA===head&&process.env.GITHUB_EVENT_NAME==="workflow_dispatch"&&process.env.GITHUB_WORKFLOW_REF==="HUDongpin/MAIS-MVP/.github/workflows/ca004-currentness-finalize.yml@refs/heads/main","CA004_FINALIZATION_RUNNER");
  const runId=Number(process.env.GITHUB_RUN_ID),runAttempt=Number(process.env.GITHUB_RUN_ATTEMPT);need([runId,runAttempt].every(n=>Number.isSafeInteger(n)&&n>0),"CA004_FINALIZATION_RUNNER");
  return {workflowRef:process.env.GITHUB_WORKFLOW_REF,runId,runAttempt,head,event:"workflow_dispatch",providerOrigin:"https://api.github.com"};
}
export async function finalizeAttempt(repoRoot,manifestPath,observedRepoRoot,evidenceTransport) {
  keys(evidenceTransport,["path","sha256"],"CA004_FINAL_TRANSPORT");need(path.isAbsolute(evidenceTransport.path)&&realpathSync(evidenceTransport.path)===evidenceTransport.path&&HASH.test(evidenceTransport.sha256),"CA004_FINAL_TRANSPORT");
  const stat=lstatSync(evidenceTransport.path);need(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&stat.size<=256*1024,"CA004_FINAL_TRANSPORT");
  const bytes=readFileSync(evidenceTransport.path);need(hash(bytes)===evidenceTransport.sha256,"CA004_FINAL_TRANSPORT");
  const ctx=await phasePreflight(repoRoot,manifestPath),validation=await validateAttempt(repoRoot,manifestPath);
  const observedRepo=new ctx.native.Repository(observedRepoRoot);observedRepo.clean();
  const acquisitionContext=finalizationContext(observedRepo.head);
  const storage=observedRepo.addition(RECEIPT_PATHS[0]);
  const transports=RECEIPT_PATHS.map(file=>({path:file,storageCommit:storage,sha256:observedRepo.blob(storage,file).sha256}));
  const receipts=[];
  for(const transport of transports){receipts.push(readTransport(ctx,transport));await verifyStoredReceipt(repoRoot,manifestPath,transport);}
  const receiptComparison=compareReceipts(receipts,validation.binding);
  const observation=await observeCurrentHead(ctx,observedRepoRoot);
  // Only this coordinator reads GitHub. Captured observer/Git children receive
  // their unchanged credential-free environments and still have zero effects.
  const provider=await collectGithubEvidence({mergeCommit:observation.observedHead,releaseCommit:observation.receiptStorage,token:process.env.GITHUB_TOKEN});
  const externalEvidence=validatePostMergeEvidence(ctx.native.parse(bytes),ctx,observation,transports,provider);
  need(hash(readFileSync(evidenceTransport.path))===evidenceTransport.sha256,"CA004_FINAL_EVIDENCE_MOVED");ctx.repo.clean();observedRepo.clean();
  const closure={schemaVersion:"ca004-closure.v1",binding:validation.binding,receipts:transports,receiptComparison,currentObservation:observation,externalEvidence,acquisitionContext,lifecycleState:"shadow_passed",currentness:"current",liveBoundary:"unproven",liveAllowed:false};
  closure.closureDigest=digest(closure);return verifyFinalizationRecord(sealFinalization(closure),{provider,binding:validation.binding,observation,receipts:transports,receiptComparison,externalEvidence,acquisitionContext});
}

async function capturedMain() {
  const [repoRoot,requestPath]=process.argv.slice(2);
  const codeRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
  need(codeRoot!==repoRoot && path.basename(codeRoot).startsWith("CA004-code-") && requestPath===path.join(codeRoot,"request.json"),"CA004_CAPTURE_REQUIRED");
  const native=await nativeModules(),request=native.parse(readFileSync(requestPath));
  keys(request,["operation","repoRoot","manifestPath","runId","transport","observedRepoRoot","evidenceTransport"],"CA004_REQUEST");need(request.repoRoot===repoRoot,"CA004_REQUEST_ROOT");
  let result;
  if(request.operation==="validate")result=await validateAttempt(repoRoot,request.manifestPath);
  else if(request.operation==="shadow")result=await shadowAttempt(repoRoot,request.manifestPath,request.runId);
  else if(request.operation==="verify-receipt")result=await verifyStoredReceipt(repoRoot,request.manifestPath,request.transport);
  else if(request.operation==="observe-current"){const ctx=await phasePreflight(repoRoot,request.manifestPath);result={result:"pass",observation:await observeCurrentHead(ctx,request.observedRepoRoot),liveAllowed:false};}
  else if(request.operation==="finalize")result=await finalizeAttempt(repoRoot,request.manifestPath,request.observedRepoRoot,request.evidenceTransport);
  else need(false,"CA004_OPERATION");
  process.stdout.write(JSON.stringify(result)+"\n");
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))capturedMain().catch(error=>{
  process.stdout.write(JSON.stringify({schemaVersion:"ca004-error.v1",result:"blocked",code:/^CA[A-Z0-9_]+$/.test(error.code??error.message??"")?(error.code??error.message):"CA004_OPERATION_FAILED",liveAllowed:false})+"\n");process.exitCode=2;
});
