#!/usr/bin/env node
// Built-ins only until the anchored parser and exact R2 code/dependencies are captured.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, lstatSync, realpathSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = "coordination/integration/ca-textbook-currentness-v1";
const PREFIX = ROOT + "/attempts/ca-textbook-004";
const OLD_ROOT = "coordination/integration/ca-textbook-successor";
const OLD_PREFIX = OLD_ROOT + "/attempts/ca-textbook-003";
const SOURCE = "54d6080cfb7c137c03a83ba5da1c5d1bb7256b5e";
const CODE = [".github/workflows/ca004-currentness-finalize.yml", ...["promotion.mjs","currentness.mjs","currentness.test.mjs","README.md"].map(f=>ROOT+"/"+f)].sort();
const OUTER = [".github/workflows/promotion-shadow.yml","scripts/promotion-reviewed-code-pr308.mjs","scripts/promotion-reviewed-code-pr308.test.mjs","docs/pr308-reviewed-code-gate.md","scripts/release-governance.test.mjs"].sort();
const ROLES = ["A18","A11","A23","A22","A25"];
const REVIEWERS = {A18:"/root/content_release_review",A11:"/root/ca004_release_a11",A23:"/root/ca004_release_a23",A22:"/root",A25:"/root"};
const DATA = ["candidate.json","source-inventory.json","checker-release.json","runtime.json","diagnostic-execution.json","diagnostic-observation.json","diagnostic-source-binding.json","diagnostic.stdout","diagnostic.stderr",...ROLES.flatMap(role=>["evidence/"+role.toLowerCase()+".json","evidence/"+role.toLowerCase()+".md"])].map(f=>PREFIX+"/"+f).sort();
const OUTER_DATA = ["admission.json","source-inventory.json","source-checks.json","a11-review.json","a11-review.md","a23-review.json","a23-review.md"].map(f=>"coordination/integration/reviewed-code/pr308-v1/"+f).sort();
const PACKAGE_HASHES = {"package.json":"ccf3a4efc6cf34acd0a191cfce0472252e1337eecd7cd158e903f965ff4901bd","package-lock.json":"d39348a625c9e6376161d3083960255817e86596eb9ebacb23b8e8a0246291a4"};
const TIMEOUTS = Object.freeze({validate:180000,shadow:360000,"verify-receipt":540000,"observe-current":360000,finalize:2100000});
const ENV = Object.freeze({PATH:"/usr/bin:/bin",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_NOSYSTEM:"1",GIT_GRAFT_FILE:"/dev/null",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",LC_ALL:"C",NODE_ENV:"test"});
const hash = b=>createHash("sha256").update(b).digest("hex");
const stable = v=>Array.isArray(v)?"["+v.map(stable).join(",")+"]":v&&typeof v==="object"?"{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stable(v[k])).join(",")+"}":JSON.stringify(v);
const need=(ok,code)=>{if(!ok){const e=new Error(code);e.code=code;throw e;}};
let owned, parse;
try {
  need(!process.env.NODE_OPTIONS && !process.env.NODE_PATH && process.execArgv.every(a=>!/^--?(?:loader|import|require|experimental-loader)/u.test(a)),"CA004_LOADER_HOOK");
  const [operation,...args]=process.argv.slice(2);need(Object.hasOwn(TIMEOUTS,operation),"CA004_USAGE");
  const common=["repo","manifest"],allowed={validate:common,shadow:[...common,"run-id","execute"],"verify-receipt":[...common,"path","storage-commit","sha256","execute"],"observe-current":[...common,"observed-repo","execute"],finalize:[...common,"observed-repo","evidence-file","evidence-sha256","execute"]}[operation];
  const options={};
  for(let i=0;i<args.length;i++){
    const key=args[i]?.startsWith("--")?args[i].slice(2):"";need(allowed.includes(key)&&!Object.hasOwn(options,key),"CA004_USAGE");
    if(key==="execute")options[key]=true;
    else {need(args[i+1]&&!args[i+1].startsWith("--"),"CA004_USAGE");options[key]=args[++i];}
  }
  need(allowed.every(key=>Object.hasOwn(options,key)) && options.manifest===PREFIX+"/manifest.json","CA004_USAGE");
  const root=realpathSync(options.repo);need(root===options.repo && path.isAbsolute(root),"CA004_ROOT");
  need(fileURLToPath(import.meta.url)===path.join(root,ROOT,"promotion.mjs"),"CA004_ENTRYPOINT");
  const entry=path.join(root,".git"),st=lstatSync(entry);need(!st.isSymbolicLink(),"CA004_GIT_ALIAS");
  const gitDir=st.isDirectory()?realpathSync(entry):realpathSync(path.resolve(root,readFileSync(entry,"utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u)?.[1]??"INVALID"));
  const git=(...a)=>execFileSync("/usr/bin/git",["--no-replace-objects","--literal-pathspecs","--no-optional-locks","--git-dir="+gitDir,"--work-tree="+root,"-c","core.worktree="+root,"-c","core.fsmonitor=false",...a],{cwd:root,env:ENV,stdio:["ignore","pipe","pipe"],timeout:60000,maxBuffer:128*1024*1024});
  const parserBytes=git("show","32f53da1b13b2c1fd28ae4eec1807fd355cc4c17:scripts/promotion-workflow-json-guard.mjs");
  need(hash(parserBytes)==="b7b919123df63442012446f704bd454f0721b2dcbed4f8aa824d4d5180ce88e5","CA004_PARSER_ANCHOR");
  ({parsePromotionWorkflowJsonBytes:parse}=await import("data:text/javascript;base64,"+parserBytes.toString("base64")));
  const regular=file=>{
    need(typeof file==="string"&&!file.startsWith("/")&&!file.includes("\\")&&file.split("/").every(x=>x&&x!=="."&&x!==".."),"CA004_PATH");
    const absolute=path.join(root,file),stat=lstatSync(absolute);
    need(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&stat.size<=32*1024*1024&&realpathSync(absolute)===absolute,"CA004_FILE");return readFileSync(absolute);
  };
  need(git("status","--porcelain=v1","--untracked-files=all").length===0,"CA004_DIRTY");
  const head=git("rev-parse","HEAD").toString().trim(),m=parse(regular(options.manifest));
  need(m.schemaVersion==="ca004-manifest.v1"&&m.sourceCommit===SOURCE&&/^[a-f0-9]{40}$/.test(m.checkerReleaseCommit??"")&&Array.isArray(m.data),"CA004_BOOTSTRAP_MANIFEST");
  const ledgerRef=m.data.find(r=>r.path===PREFIX+"/checker-release.json");need(ledgerRef&&/^[a-f0-9]{64}$/.test(ledgerRef.sha256),"CA004_BOOTSTRAP_LEDGER");
  const ledgerBytes=regular(ledgerRef.path);need(hash(ledgerBytes)===ledgerRef.sha256,"CA004_BOOTSTRAP_LEDGER");const ledger=parse(ledgerBytes);
  need(ledger.schemaVersion==="ca004-checker-ledger.v1"&&ledger.releaseCommit===m.checkerReleaseCommit&&ledger.bundleDigest===m.checkerBundleDigest,"CA004_BOOTSTRAP_LEDGER");
  need(stable(ledger.codeFiles.map(r=>r.path))===stable(CODE)&&stable(ledger.outerFiles.map(r=>r.path))===stable(OUTER),"CA004_BOOTSTRAP_SCOPE");
  need(hash(Buffer.from(stable({codeFiles:ledger.codeFiles,outerFiles:ledger.outerFiles,observerFiles:ledger.observerFiles,dependencies:ledger.dependencies})))===ledger.bundleDigest,"CA004_BOOTSTRAP_DIGEST");
  // Direct CLI entry has the same code-admission ordering as the trusted outer
  // PR gate: validate finite code/evidence phases and the real reviewer bindings
  // before any newly supplied module is imported or executed.
  const parents=ref=>git("show","-s","--format=%P",ref).toString().trim().split(" ");
  const changed=(a,b)=>git("diff","--name-only","--no-renames","-z",a,b).toString().split("\0").filter(Boolean).sort();
  const exact=(a,b)=>need(stable(a)===stable(b),"CA004_BOOTSTRAP_PHASE");
  need([m.checkerInnerCommit,m.checkerReleaseCommit,m.evidenceCommit,head].every(v=>/^[a-f0-9]{40}$/.test(v??"")),"CA004_BOOTSTRAP_PHASE");
  exact(parents(m.checkerInnerCommit),[SOURCE]);exact(changed(SOURCE,m.checkerInnerCommit),CODE);
  exact(parents(m.checkerReleaseCommit),[m.checkerInnerCommit]);exact(changed(m.checkerInnerCommit,m.checkerReleaseCommit),OUTER);
  exact(parents(m.evidenceCommit),[m.checkerReleaseCommit]);exact(changed(m.checkerReleaseCommit,m.evidenceCommit),[...DATA,...OUTER_DATA].sort());
  exact(parents(head),[m.evidenceCommit]);exact(changed(m.evidenceCommit,head),[PREFIX+"/manifest.json",PREFIX+"/successor.json"].sort());
  exact(m.data.map(row=>row.path),DATA);
  for(const file of [...DATA,...OUTER_DATA])need(git("ls-tree",m.checkerReleaseCommit,"--",file).length===0,"CA004_BOOTSTRAP_NEW_EVIDENCE");
  for(const ref of m.data){need(/^[a-f0-9]{64}$/.test(ref.sha256??""),"CA004_BOOTSTRAP_DATA");const bytes=regular(ref.path);need(hash(bytes)===ref.sha256&&bytes.equals(git("show",m.evidenceCommit+":"+ref.path)),"CA004_BOOTSTRAP_DATA");}
  const releaseTime=Number(git("show","-s","--format=%ct",m.checkerReleaseCommit).toString())*1000;
  const evidenceTime=Number(git("show","-s","--format=%ct",m.evidenceCommit).toString())*1000;
  for(const role of ROLES){
    const file=PREFIX+"/evidence/"+role.toLowerCase(),review=parse(regular(file+".json")),report=regular(file+".md");
    need(review.schemaVersion==="ca004-review.v1"&&review.role===role&&review.reviewer===REVIEWERS[role]&&review.decision==="approved-for-ca004-bounded-readiness"&&review.liveAllowed===false,"CA004_BOOTSTRAP_REVIEW");
    need(review.sourceCommit===SOURCE&&review.sourceTree==="d53bd544a4da00c7243a561b61635967e8f7b899"&&review.candidateDigest==="fda75f734941c94020fe069fb6791efa22fa84c625eb0019eba906f69c17e8ea"&&review.checkerReleaseCommit===m.checkerReleaseCommit&&review.checkerBundleDigest===m.checkerBundleDigest,"CA004_BOOTSTRAP_REVIEW_BINDING");
    need(review.report?.path===file+".md"&&review.report.sha256===hash(report)&&report.length>0,"CA004_BOOTSTRAP_REVIEW_REPORT");
    const reviewed=Date.parse(review.reviewedAt);need(Number.isFinite(reviewed)&&new Date(reviewed).toISOString()===review.reviewedAt&&reviewed>=releaseTime&&Math.floor(reviewed/1000)<=evidenceTime/1000&&reviewed<=Date.now(),"CA004_BOOTSTRAP_REVIEW_TIME");
  }
  const oldLedgerBytes=git("show","360966efb0427a0d679d462d10dccf53ee135424:"+OLD_PREFIX+"/checker-release.json");
  need(hash(oldLedgerBytes)==="18638f93abc473fb67f853faa7720d08deb60dbca0bf2979e38da3da4d5b13a3","CA004_OLD_LEDGER");const oldLedger=parse(oldLedgerBytes);
  need(stable(ledger.observerFiles.map(r=>r.path))===stable(oldLedger.files.map(r=>r.path))&&stable(ledger.dependencies)===stable(oldLedger.dependencies),"CA004_OBSERVER_DEPENDENCY");
  for(let i=0;i<ledger.observerFiles.length;i++){
    const file=ledger.observerFiles[i];
    if(Object.hasOwn(PACKAGE_HASHES,file.path))need(file.sha256===PACKAGE_HASHES[file.path]&&regular(file.path).equals(git("show",SOURCE+":"+file.path)),"CA004_PACKAGE_INPUT");
    else need(stable(file)===stable(oldLedger.files[i]),"CA004_OBSERVER_CODE");
  }
  git("merge-base","--is-ancestor",SOURCE,m.checkerReleaseCommit);git("merge-base","--is-ancestor",m.checkerReleaseCommit,head);
  const captured=[];
  for(const file of [...ledger.codeFiles,...ledger.outerFiles,...ledger.observerFiles]){
    const bytes=regular(file.path);need(file.mode==="100644"&&hash(bytes)===file.sha256&&bytes.equals(git("show",m.checkerReleaseCommit+":"+file.path))&&bytes.equals(git("show",head+":"+file.path)),"CA004_CAPTURE_BYTES");
    need(git("ls-tree","-z",m.checkerReleaseCommit,"--",file.path).toString()===file.mode+" blob "+file.objectId+"\t"+file.path+"\0" && (lstatSync(path.join(root,file.path)).mode&0o111?"100755":"100644")===file.mode,"CA004_CAPTURE_MODE");
    captured.push([file.path,bytes]);
  }
  owned=mkdtempSync(path.join(realpathSync("/tmp"),"CA004-code-"));
  for(const [file,bytes] of captured){const target=path.join(owned,file);mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,bytes,{flag:"wx",mode:0o600});}
  const request={operation,repoRoot:root,manifestPath:options.manifest,runId:options["run-id"]??null,transport:operation==="verify-receipt"?{path:options.path,storageCommit:options["storage-commit"],sha256:options.sha256}:null,observedRepoRoot:options["observed-repo"]??null,evidenceTransport:operation==="finalize"?{path:options["evidence-file"],sha256:options["evidence-sha256"]}:null};
  const requestPath=path.join(owned,"request.json");writeFileSync(requestPath,JSON.stringify(request),{flag:"wx",mode:0o600});
  const childEnv={...ENV};
  // Only finalization's fixed-repository metadata collector receives the
  // read-only workflow token/public run context. Native observer children use
  // their own unchanged credential-free environment; no token is serialized.
  if(operation==="finalize")for(const name of ["GITHUB_TOKEN","GITHUB_ACTIONS","GITHUB_REPOSITORY","GITHUB_REPOSITORY_ID","GITHUB_REF","GITHUB_REF_PROTECTED","GITHUB_SHA","GITHUB_EVENT_NAME","GITHUB_WORKFLOW_REF","GITHUB_RUN_ID","GITHUB_RUN_ATTEMPT"]){if(typeof process.env[name]==="string")childEnv[name]=process.env[name];}
  const result=execFileSync(process.execPath,[path.join(owned,ROOT,"currentness.mjs"),root,requestPath],{cwd:root,env:childEnv,stdio:["ignore","pipe","pipe"],timeout:TIMEOUTS[operation],maxBuffer:32*1024*1024});
  const output=parse(result);need(output.result==="pass","CA004_OPERATION_FAILED");process.stdout.write(JSON.stringify(output)+"\n");
} catch(error) {
  if(error.stdout){try{const result=parse?.(error.stdout);if(/^CA[A-Z0-9_]+$/.test(result?.code??""))error.code=result.code;}catch{}}
  const code=/^CA[A-Z0-9_]+$/.test(error.code??error.message??"")?(error.code??error.message):"CA004_BOOTSTRAP_FAILED";
  process.stdout.write(JSON.stringify({schemaVersion:"ca004-error.v1",result:"blocked",code,liveAllowed:false})+"\n");process.exitCode=2;
} finally {if(owned)rmSync(owned,{recursive:true,force:true});}
