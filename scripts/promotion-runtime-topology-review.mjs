/** Preparation evidence only. The frozen native checker remains the final authority. */
import crypto from "node:crypto";
import { parsePromotionWorkflowJsonBytes } from "./promotion-workflow-json-guard.mjs";
import { fingerprint, RUNTIME_CLASSIFICATION_KINDS, TARGET_BASELINE_PROJECTION_PATHS } from "../coordination/integration/promotion-gate-lib.mjs";
import { projectV2RuntimePolicy, validateV2Evidence, PROMOTION_V2_REQUIRED_OWNER_ROLES } from "../coordination/integration/v2/promotion-gate-v2-lib.mjs";

const HEX = /^[a-f0-9]{64}$/u, COMMIT = /^[a-f0-9]{40}$/u;
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const fail = (reason) => { throw new Error(`topology review: ${reason}`); };
const same = (a, b) => fingerprint(a) === fingerprint(b);
const POLICY_KEYS = ["coveredFileCount","coveredFilesDigest","classificationsDigest","frameworkEntrypointCount","seedCount","reachablePathCount","reachablePathsDigest","edgeCount","edgeDigest","topologyEdgeCount","topologyEdgeDigest","nextDynamicCallCount","nextDynamicLiteralImportCount","nextDynamicNonliteralImportCount","nextDynamicCallsiteDigest","fsReadAllowlistCount","fsReadAllowlistDigest","zeroBaselineCallCount"];
function exact(value, keys, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || !same(Object.keys(value).sort(), [...keys].sort())) fail(`${label} schema is invalid`);
}
function digest(value, label) { if (typeof value !== "string" || !HEX.test(value)) fail(`${label} digest is invalid`); }
function commit(value, label) { if (typeof value !== "string" || !COMMIT.test(value)) fail(`${label} commit is invalid`); }
function safePath(value) {
  if (typeof value !== "string" || !value || value.length > 4096 || value.startsWith("/") || /^[a-z]:/iu.test(value)
    || /[\\\x00-\x1f\x7f]/u.test(value) || value.split("/").some(s => !s || [".","..",".git"].includes(s))) fail("file path is unsafe");
  return value;
}
function list(value, label, limit = 100_000) { if (!Array.isArray(value) || value.length > limit) fail(`${label} inventory exceeds limits`); return value; }
function paths(value, label) {
  list(value, label, 50_000).forEach(safePath);
  if (!same(value, [...new Set(value)].sort(compare))) fail(`${label} inventory is not unique canonical order`);
  return value;
}
function policy(value) {
  exact(value, POLICY_KEYS, "policy");
  for (const [key, item] of Object.entries(value)) {
    if (key.endsWith("Digest")) digest(item, "policy");
    else if (!Number.isSafeInteger(item) || item < 0 || item > 1_000_000) fail("policy count is invalid");
  }
}
const edgeKey = e => [e.from,e.specifier,e.to,e.kind,"0"].join("\0");
function edges(value) {
  list(value, "edge").forEach(e => {
    exact(e,["from","specifier","to","kind","typeOnly"],"edge"); safePath(e.from); safePath(e.to);
    if (typeof e.specifier !== "string" || !e.specifier || e.specifier.length > 4096 || /[\x00-\x1f]/u.test(e.specifier)
      || !["import","export","import-equals","require","dynamic-import","import-meta-url"].includes(e.kind) || e.typeOnly !== false) fail("edge schema is invalid");
  });
  if (!same(value,[...value].sort((a,b)=>compare(edgeKey(a),edgeKey(b))))) fail("edge inventory order is invalid");
  return value;
}
function topology(value) {
  return [...new Map(value.map(({from,to})=>[from+"\0"+to,{from,to}])).values()].sort((a,b)=>compare(a.from+"\0"+a.to,b.from+"\0"+b.to));
}
function subtract(right, left, key = x => x) {
  const counts = new Map(); for (const x of left) counts.set(key(x),(counts.get(key(x))??0)+1);
  return right.filter(x => { const n=counts.get(key(x))??0; if(n){counts.set(key(x),n-1);return false;}return true; });
}
function records(value, label) {
  list(value, label, 50_000).forEach(x => {
    exact(x,["path","mode","objectId"],`${label} file`); safePath(x.path);
    if (!["100644","100755"].includes(x.mode) || !COMMIT.test(x.objectId??"")) fail(`${label} file identity is invalid`);
  });
  paths(value.map(x=>x.path),`${label} file`);
  return new Map(value.map(x=>[x.path,x]));
}
function protectedPath(p) { return TARGET_BASELINE_PROJECTION_PATHS.some(root => p === root || p.startsWith(root + "/")); }
function validateObservation(o) {
  exact(o,["policy","coveredPaths","classifications","frameworkEntrypoints","runtimeSeeds","reachablePaths","edges","topologyEdges","fsReadAllowlist","nextDynamicCalls","zeroBaselineCalls","unresolvedCalls","resolverPolicyDigest","frameworkBoundaryDigest"],"observation");
  policy(o.policy); for(const k of ["coveredPaths","frameworkEntrypoints","runtimeSeeds","reachablePaths"]) paths(o[k],k);
  edges(o.edges); list(o.classifications,"classifications",50);
  if(!same(o.classifications.map(x=>x?.kind),[...RUNTIME_CLASSIFICATION_KINDS]))fail("classification inventory is not the native closed set");
  for(const c of o.classifications){exact(c,["kind","count","pathsDigest"],"classification");digest(c.pathsDigest,"classification");if(!Number.isSafeInteger(c.count)||c.count<0)fail("classification count is invalid");}
  if(o.classifications.reduce((n,c)=>n+c.count,0)!==o.coveredPaths.length)fail("classification inventory count differs");
  list(o.fsReadAllowlist,"loader"); list(o.nextDynamicCalls,"loader");
  list(o.zeroBaselineCalls,"loader"); list(o.unresolvedCalls,"unresolved");
  if(o.unresolvedCalls.length) fail("unresolved runtime references are forbidden");
  if(o.zeroBaselineCalls.length || o.policy.zeroBaselineCallCount || o.policy.nextDynamicNonliteralImportCount) fail("loader blind spots are forbidden");
  for(const k of ["resolverPolicyDigest","frameworkBoundaryDigest"]) digest(o[k],k);
  const actualTopology=topology(o.edges);
  if(!same(actualTopology,o.topologyEdges)) fail("topology projection is incomplete");
  const nodes=new Set(o.reachablePaths),covered=new Set([...o.coveredPaths,"middleware.ts","next.config.ts","tsconfig.json"]);
  if(o.reachablePaths.some(p=>!covered.has(p)) || o.runtimeSeeds.some(p=>!nodes.has(p)) || o.frameworkEntrypoints.some(p=>!o.runtimeSeeds.includes(p))
    || o.edges.some(e=>!nodes.has(e.from)||!nodes.has(e.to))) fail("graph inventory contains an unbound node");
  const actual={coveredFileCount:o.coveredPaths.length,coveredFilesDigest:fingerprint(o.coveredPaths),classificationsDigest:fingerprint(o.classifications),
    frameworkEntrypointCount:o.frameworkEntrypoints.length,seedCount:o.runtimeSeeds.length,reachablePathCount:o.reachablePaths.length,reachablePathsDigest:fingerprint(o.reachablePaths),
    edgeCount:o.edges.length,edgeDigest:fingerprint(o.edges),topologyEdgeCount:actualTopology.length,topologyEdgeDigest:fingerprint(actualTopology),
    nextDynamicCallCount:o.nextDynamicCalls.length,nextDynamicLiteralImportCount:o.nextDynamicCalls.reduce((n,c)=>n+list(c.literalImports,"literal import").length,0),
    nextDynamicNonliteralImportCount:o.nextDynamicCalls.reduce((n,c)=>n+c.nonliteralImportCount,0),nextDynamicCallsiteDigest:fingerprint(o.nextDynamicCalls),
    fsReadAllowlistCount:o.fsReadAllowlist.length,fsReadAllowlistDigest:fingerprint(o.fsReadAllowlist),zeroBaselineCallCount:o.zeroBaselineCalls.length};
  if(!same(actual,o.policy)) fail("policy differs from complete observation inventory");
}
export function projectRuntimeTopologyObservation(o) {
  return {policy:projectV2RuntimePolicy(o),coveredPaths:o.actualFiles,classifications:o.classifications,
    frameworkEntrypoints:o.frameworkEntrypoints,runtimeSeeds:o.graph.runtimeSeeds,reachablePaths:[...o.graph.reachablePaths].sort(compare),
    edges:o.graph.edges,topologyEdges:o.graph.topologyEdges,fsReadAllowlist:o.loaderPolicy.fsReadAllowlist,
    nextDynamicCalls:o.graph.loaderInventory.nextDynamicCalls.map(c=>Object.fromEntries(["sourcePath","sourceRawSha256","position","literalImports","nonliteralImportCount","normalizedExpressionDigest"].map(k=>[k,c[k]]))),
    zeroBaselineCalls:o.graph.loaderInventory.zeroBaselineCalls,unresolvedCalls:o.graph.unresolvedCalls,
    resolverPolicyDigest:fingerprint(o.resolverPolicy),frameworkBoundaryDigest:fingerprint(o.frameworkBoundary)};
}
export function buildRuntimeTopologyReview(input) {
  exact(input,["sourceCommit","targetCommit","sourceFiles","targetFiles","sourceExpectedPolicy","sourceObservation","targetObservation","sourceTreeDigest","targetTreeDigest","changedFiles","immutableBindings","nativeSemanticProof","scannerBindings"],"input");
  commit(input.sourceCommit,"source");commit(input.targetCommit,"target");if(input.sourceCommit===input.targetCommit)fail("source and target commits must differ");
  policy(input.sourceExpectedPolicy);validateObservation(input.sourceObservation);validateObservation(input.targetObservation);
  const s=input.sourceObservation,t=input.targetObservation;
  if(!same(input.sourceExpectedPolicy,s.policy))fail("source expected policy differs from its observed baseline");
  const before=records(input.sourceFiles,"source"),after=records(input.targetFiles,"target");
  if(fingerprint(input.sourceFiles)!==input.sourceTreeDigest || fingerprint(input.targetFiles)!==input.targetTreeDigest)fail("file tree digest differs from inventory");
  if(s.coveredPaths.some(p=>!before.has(p)) || t.coveredPaths.some(p=>!after.has(p)))fail("covered file inventory is not bound to Git objects");
  const allPaths=[...new Set([...before.keys(),...after.keys()])].sort(compare);
  const changed=allPaths.filter(p=>protectedPath(p) && !same(before.get(p)??null,after.get(p)??null));
  list(input.changedFiles,"changed file",50_000);paths(input.changedFiles.map(x=>x.path),"changed file");
  if(!same(changed,input.changedFiles.map(x=>x.path)))fail("changed file delta is incomplete");
  for(const x of input.changedFiles){
    exact(x,["path","before","after"],"changed file");
    for(const [key,map]of [["before",before],["after",after]]){
      const declared=x[key],actual=map.get(x.path);
      if(!actual){if(declared!==null)fail("changed file absence differs");continue;}
      exact(declared,["mode","objectId","rawSha256"],"changed file");digest(declared.rawSha256,"file");
      if(declared.mode!==actual.mode || declared.objectId!==actual.objectId)fail("changed file object identity differs");
    }
  }
  for(const key of ["resolverPolicyDigest","frameworkBoundaryDigest"])if(s[key]!==t[key])fail("resolver or framework boundary changed");
  if(!same(s.fsReadAllowlist,t.fsReadAllowlist) || !same(s.nextDynamicCalls,t.nextDynamicCalls))fail("loader inventory changed outside this mode");
  if(subtract(s.coveredPaths,t.coveredPaths).length || subtract(s.reachablePaths,t.reachablePaths).length || subtract(s.frameworkEntrypoints,t.frameworkEntrypoints).length
    || subtract(s.runtimeSeeds,t.runtimeSeeds).length || subtract(s.edges,t.edges,edgeKey).length)fail("only addition-only runtime topology is supported");
  const addedPaths=subtract(t.reachablePaths,s.reachablePaths),addedEdges=subtract(t.edges,s.edges,edgeKey);
  if(!addedPaths.length || !addedEdges.length)fail("addition-only topology review requires actual new nodes and edges");
  exact(input.immutableBindings,["candidateDigest","sourceCommit","checkerVersion","checkerBundleDigest","checkerReleaseCommit","compatibilityManifestRawSha256","legacyRegistryRawSha256"],"immutable binding");
  for(const [key,value]of Object.entries(input.immutableBindings)){
    if(key.endsWith("Commit"))commit(value,key);else if(key==="checkerVersion"){if(typeof value!=="string"||!value||value.length>100)fail("checker version is invalid");}else digest(value,key);
  }
  exact(input.nativeSemanticProof,["canonicalAuditDigest","resolutionProofsDigest","selectedIdentityHits","resolutionCount","approvedProjectionCount","dereachedCount","liveAllowed"],"native semantic");
  const semantic=input.nativeSemanticProof;
  if(semantic.selectedIdentityHits!==0 || semantic.resolutionCount!==18 || semantic.approvedProjectionCount!==3 || semantic.dereachedCount!==15 || semantic.liveAllowed!==false)fail("native semantic proof did not preserve the frozen pilot contract");
  digest(semantic.canonicalAuditDigest,"native semantic");digest(semantic.resolutionProofsDigest,"native semantic");
  list(input.scannerBindings,"scanner",10).forEach(x=>{exact(x,["path","rawSha256"],"scanner");safePath(x.path);digest(x.rawSha256,"scanner")});
  paths(input.scannerBindings.map(x=>x.path),"scanner");if(!input.scannerBindings.length)fail("scanner binding is required");
  const delta={changedFiles:input.changedFiles,protectedChangedPathsDigest:fingerprint(changed),
    addedCoveredPaths:subtract(t.coveredPaths,s.coveredPaths),addedReachablePaths:addedPaths,
    addedFrameworkEntrypoints:subtract(t.frameworkEntrypoints,s.frameworkEntrypoints),addedSeeds:subtract(t.runtimeSeeds,s.runtimeSeeds),
    addedEdges,addedTopologyEdges:subtract(t.topologyEdges,s.topologyEdges,e=>e.from+"\0"+e.to),removedReachablePaths:[],removedEdges:[]};
  const proof={schemaVersion:"promotion-runtime-topology-review.v1",sourceCommit:input.sourceCommit,targetCommit:input.targetCommit,
    sourceTreeDigest:input.sourceTreeDigest,targetTreeDigest:input.targetTreeDigest,sourcePolicy:s.policy,targetPolicy:t.policy,
    sourcePolicyDigest:fingerprint(s.policy),targetPolicyDigest:fingerprint(t.policy),immutableBindings:input.immutableBindings,
    nativeSemanticProof:semantic,scannerBindings:input.scannerBindings,delta,deltaDigest:fingerprint(delta),
    preparationEvidenceOnly:true,liveAllowed:false};
  return {...structuredClone(proof),proofDigest:fingerprint(proof)};
}


const INDEX_KEYS=["schemaVersion","sourceManifest","sourceBaselineCommit","targetBaselineCommit","revisionRoot","candidateDigest","sourceCommit","checkerVersion","checkerBundleDigest","runtimeTopologyProofDigest","targetRuntimePolicyDigest","legacyRegistryRawSha256","justification","reviews"];
const CURRENT_FACTS=new Set(["preflightResults","productionBuild","typeCheck","buildIsolationProof","worktreeCleanAfterChecks","reviewedCompositionCommit","targetBaselineCommit","mergedOriginMainCommit","runtimePolicyDigest","reviewedBranch","targetPullRequest","reviewSession","baselineReview","canonicalLegacyAuditDigest","runtimeBaselineDiff","externalSideEffects"]);
const sha=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
function date(value, label) {
  const match = typeof value === "string" && value.length <= 40
    ? value.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/u) : null;
  if (!match || !Number.isFinite(Date.parse(value))) fail(`${label} date is invalid`);
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1]
    || hour > 23 || minute > 59 || second > 59) fail(`${label} date is invalid`);
  return Date.parse(value);
}
function pin(value,label="artifact"){exact(value,["path","reviewedCommit","rawSha256"],label);safePath(value.path);commit(value.reviewedCommit,label);digest(value.rawSha256,label);return value;}
function pointer(value,selector){
  if(typeof selector!=="string"||selector.length>4096||!selector.startsWith("/")||/~(?![01])/u.test(selector))fail("field pointer is invalid");
  let item=value;
  for(const raw of selector.slice(1).split("/")){
    const key=raw.replaceAll("~1","/").replaceAll("~0","~");
    if(!key||["__proto__","prototype","constructor"].includes(key)||item===null||typeof item!=="object"||!Object.hasOwn(item,key))fail("field pointer does not select a value");
    item=item[key];
  }
  return item;
}
/** Reads only exact committed records. A role label is not authenticated reviewer identity. */
export async function prepareReviewedTopologyEvidence({indexPin,context,readCommitted,assertAncestor}){
  exact(indexPin,["path","reviewCommit","rawSha256"],"review index pin");safePath(indexPin.path);commit(indexPin.reviewCommit,"review index");digest(indexPin.rawSha256,"review index");
  if(typeof readCommitted!=="function"||typeof assertAncestor!=="function")fail("committed artifact/ancestry readers are required");
  const proof=context.runtimeTopologyProof;
  if(!proof||proof.schemaVersion!=="promotion-runtime-topology-review.v1"||proof.preparationEvidenceOnly!==true||proof.liveAllowed!==false
    ||proof.proofDigest!==fingerprint(Object.fromEntries(Object.entries(proof).filter(([key])=>key!=="proofDigest"))))fail("proof digest does not match recomputed content");
  const loaded=new Map();let totalBytes=0;
  const load=async reference=>{
    pin(reference);const key=reference.reviewedCommit+":"+reference.path+":"+reference.rawSha256;
    if(loaded.has(key))return loaded.get(key);
    await assertAncestor(reference.reviewedCommit,indexPin.reviewCommit);
    const file=await readCommitted(reference);
    if(!file||!(file.bytes instanceof Uint8Array)||!["100644","100755"].includes(file.mode))fail("committed artifact must be regular bytes");
    const bytes=Buffer.from(file.bytes);totalBytes+=bytes.length;
    if(bytes.length>32*1024*1024||totalBytes>64*1024*1024||loaded.size>=256)fail("committed artifact inventory exceeds limits");
    if(sha(bytes)!==reference.rawSha256)fail("committed artifact raw hash differs");
    const oid=crypto.createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    if(file.objectId!==oid)fail("committed artifact Git object differs");
    const value=parsePromotionWorkflowJsonBytes(bytes);loaded.set(key,value);return value;
  };
  const index=await load({path:indexPin.path,reviewedCommit:indexPin.reviewCommit,rawSha256:indexPin.rawSha256});
  exact(index,INDEX_KEYS,"review index");if(index.schemaVersion!=="promotion-baseline-review-index.v1")fail("review index schema is unsupported");
  const expected={sourceManifest:context.sourceManifest,sourceBaselineCommit:context.sourceBaselineCommit,targetBaselineCommit:context.targetBaselineCommit,
    revisionRoot:context.revisionRoot,candidateDigest:context.candidateDigest,sourceCommit:context.sourceCommit,checkerVersion:context.checkerVersion,checkerBundleDigest:context.checkerBundleDigest,
    runtimeTopologyProofDigest:context.runtimeTopologyProof.proofDigest,targetRuntimePolicyDigest:context.runtimeTopologyProof.targetPolicyDigest,legacyRegistryRawSha256:context.legacyRegistryRawSha256};
  for(const [key,value]of Object.entries(expected))if(!same(index[key],value))fail("review index binding differs from recomputed context");
  exact(index.sourceManifest,["path","rawSha256"],"source manifest");safePath(index.sourceManifest.path);digest(index.sourceManifest.rawSha256,"source manifest");safePath(index.revisionRoot);
  pin(index.justification,"justification");const justification=await load(index.justification);
  if(justification.targetBaselineCommit!==context.targetBaselineCommit)fail("justification target binding differs");
  const expectedRoles=[...PROMOTION_V2_REQUIRED_OWNER_ROLES];
  if(!Array.isArray(index.reviews)||!same(index.reviews.map(x=>x?.role),expectedRoles))fail("review role set and order must be exact");
  if(!Array.isArray(context.sourceEvidenceBindings)||!same(context.sourceEvidenceBindings.map(x=>x.role),expectedRoles))fail("source role set and order must be exact");
  const seenPaths=new Set(),evidence=[];
  for(const row of index.reviews){
    exact(row,["role","recordPath","reviewedCommit","rawSha256"],"role index entry");safePath(row.recordPath);
    if(seenPaths.has(row.recordPath))fail("role record paths must be distinct");seenPaths.add(row.recordPath);
    const reviewPin={path:row.recordPath,reviewedCommit:row.reviewedCommit,rawSha256:row.rawSha256};
    const record=await load(reviewPin);
    exact(record,["schemaVersion","role","reviewedAt","reviewer","sourceEvidence","evidence","fieldDisposition"],"role record");
    if(record.schemaVersion!=="promotion-baseline-role-review.v1"||record.role!==row.role)fail("role record identity differs");
    const reviewedAt=date(record.reviewedAt,"review");
    exact(record.reviewer,["identity","reference"],"reviewer");
    if(typeof record.reviewer.identity!=="string"||!record.reviewer.identity.trim()||record.reviewer.identity.length>200)fail("reviewer identity reference is absent");
    await load(record.reviewer.reference);
    const binding=context.sourceEvidenceBindings.find(x=>x.role===row.role);
    exact(record.sourceEvidence,["path","reviewedCommit","rawSha256","producedAt","targetBaselineCommit"],"historical source evidence");
    const sourcePin={path:record.sourceEvidence.path,reviewedCommit:record.sourceEvidence.reviewedCommit,rawSha256:record.sourceEvidence.rawSha256};
    if(!same(sourcePin,{path:binding.evidencePath,reviewedCommit:binding.reviewedCommit,rawSha256:binding.rawSha256}))fail("historical source evidence binding differs");
    const source=await load(sourcePin);
    if(source.role!==row.role||source.candidateDigest!==context.candidateDigest||source.sourceCommit!==context.sourceCommit||source.checkerVersion!==context.checkerVersion
      ||source.producedAt!==record.sourceEvidence.producedAt||source.targetBaselineCommit!==record.sourceEvidence.targetBaselineCommit
      ||source.targetBaselineCommit!==context.sourceBaselineCommit)fail("historical source evidence identity or date differs");
    if(reviewedAt<date(source.producedAt,"historical"))fail("review predates historical source");
    const next=structuredClone(record.evidence);validateV2Evidence(next);
    if(next.role!==row.role||next.result!==binding.expectedResult||next.evidenceId===source.evidenceId||next.producedAt!==record.reviewedAt
      ||next.candidateDigest!==context.candidateDigest||next.sourceCommit!==context.sourceCommit||next.targetBaselineCommit!==context.targetBaselineCommit
      ||next.checkerVersion!==context.checkerVersion)fail("new evidence role identity/currentness differs from review");
    if(next.semanticPayload.liveAllowed!==false||Object.hasOwn(next.semanticPayload,"baselineReaffirmation"))fail("role payload cannot supply derived authority or live permission");
    const fields=Object.keys(next.semanticPayload).sort();
    if(!Array.isArray(record.fieldDisposition)||!same([...record.fieldDisposition.map(x=>x?.field)].sort(),fields))fail("field disposition coverage is incomplete or duplicate");
    let freshCount=0;
    for(const disposition of record.fieldDisposition){
      exact(disposition,["field","mode","evidence","rationale"],"field disposition");
      if(!["fresh","carry-forward"].includes(disposition.mode)||typeof disposition.rationale!=="string"||disposition.rationale.trim().length<20||disposition.rationale.length>4000)fail("field disposition rationale or mode is invalid");
      const reference=disposition.evidence;
      exact(reference,["path","reviewedCommit","rawSha256","producedAt","valuePointer","targetBaselinePointer"],"field evidence");
      const fact=await load({path:reference.path,reviewedCommit:reference.reviewedCommit,rawSha256:reference.rawSha256});
      if(fact.producedAt!==reference.producedAt||date(reference.producedAt,"field evidence")>reviewedAt)fail("field evidence date differs or postdates review");
      if(!same(pointer(fact,reference.valuePointer),next.semanticPayload[disposition.field]))fail("field value differs from reviewed evidence pointer");
      const factBaseline=pointer(fact,reference.targetBaselinePointer);commit(factBaseline,"field evidence baseline");
      if(disposition.mode==="fresh"){
        freshCount++;if(factBaseline!==context.targetBaselineCommit)fail("fresh field target binding is stale");
      }else{
        if(CURRENT_FACTS.has(disposition.field))fail("current execution facts cannot be historical carry-forward");
        if(fact.role!==row.role||fact.candidateDigest!==context.candidateDigest||fact.sourceCommit!==context.sourceCommit||fact.checkerVersion!==context.checkerVersion
          ||!reference.valuePointer.startsWith("/semanticPayload/"))fail("historical field source identity differs");
        await assertAncestor(factBaseline,context.sourceBaselineCommit);
      }
    }
    if(!freshCount)fail("role record requires an actual fresh baseline review field");
    if(["A23","A25"].includes(row.role)&&(next.semanticPayload.targetBaselineCommit!==context.targetBaselineCommit
      ||next.semanticPayload.legacyResolutionRegistryPath!==context.legacyRegistryPath||next.semanticPayload.legacyResolutionRegistryRawSha256!==context.legacyRegistryRawSha256))fail("role target or revision registry binding differs");
    next.semanticPayload.baselineReaffirmation={schemaVersion:"promotion-baseline-reaffirmation.v1",revisionId:context.revisionRoot.split("/").at(-1),
      sourceEvidenceId:source.evidenceId,sourceEvidencePath:sourcePin.path,sourceEvidenceRawSha256:sourcePin.rawSha256,priorTargetBaselineCommit:context.sourceBaselineCommit,
      targetBaselineCommit:context.targetBaselineCommit,justificationPath:index.justification.path,
      protectedChangedPaths:context.runtimeTopologyProof.delta.changedFiles.map(x=>x.path),candidateBytesChanged:false,legacyCandidateBytesChanged:false,
      runtimePolicyReaffirmation:context.runtimeTopologyProof,baselineReviewIndex:structuredClone(indexPin),roleReview:reviewPin,
      fieldDispositionDigest:fingerprint(record.fieldDisposition),liveAllowed:false};
    const bytes=Buffer.from(JSON.stringify(next,null,2)+"\n");
    evidence.push({role:row.role,value:next,bytes,reviewPin,fieldDispositionDigest:fingerprint(record.fieldDisposition)});
  }
  return {indexPin:structuredClone(indexPin),index,justification:index.justification,evidence,reviewedRecordCount:evidence.length,
    independentReviewerIdentityCount:null,preparationEvidenceOnly:true};
}
export function verifyPreparedTopologyEvidence(prepared,committedByRole){
  if(!(committedByRole instanceof Map)||committedByRole.size!==prepared.evidence.length)fail("exact committed evidence bytes are incomplete");
  for(const record of prepared.evidence){const actual=committedByRole.get(record.role);if(!(actual instanceof Uint8Array)||!record.bytes.equals(Buffer.from(actual)))fail("exact committed evidence bytes differ from pinned reviews");}
  return true;
}


export function recoverCommittedTopologyReviewIndex(committedByRole,requestedPath){
  safePath(requestedPath);
  if(!(committedByRole instanceof Map)||!same([...committedByRole.keys()],[...PROMOTION_V2_REQUIRED_OWNER_ROLES]))fail("committed role set and order are incomplete");
  let common;
  for(const [role,bytes]of committedByRole){
    if(!(bytes instanceof Uint8Array))fail("committed role bytes are missing");
    const evidence=parsePromotionWorkflowJsonBytes(bytes);
    if(evidence.role!==role)fail("committed role identity differs");
    const pin=evidence.semanticPayload?.baselineReaffirmation?.baselineReviewIndex;
    exact(pin,["path","reviewCommit","rawSha256"],"committed index pin");safePath(pin.path);commit(pin.reviewCommit,"committed index pin");digest(pin.rawSha256,"committed index pin");
    if(pin.path!==requestedPath||(common&&!same(pin,common)))fail("committed role index pins disagree");common=pin;
  }
  return structuredClone(common);
}
