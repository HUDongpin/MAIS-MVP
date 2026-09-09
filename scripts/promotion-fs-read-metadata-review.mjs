/** Preparation-only structural proof; never substitutes for native validation. */
import crypto from "node:crypto";
import ts from "typescript";
import { analyzeRuntimeLoaderCalls, fingerprint } from "../coordination/integration/promotion-gate-lib.mjs";

const fail = reason => { throw new Error(`fs metadata review: ${reason}`); };
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
const same = (a,b) => fingerprint(a) === fingerprint(b);
const compare = (a,b) => a < b ? -1 : a > b ? 1 : 0;
function exact(value, keys) {
  if (!value || ![Object.prototype,null].includes(Object.getPrototypeOf(value)) || !same(Object.keys(value).sort(),keys.sort())) fail("schema differs");
}
function safePath(p) {
  if(typeof p!=="string" || !p || p.length>4096 || /^[a-z]:|^\/|[\\\x00-\x1f\x7f]/iu.test(p) || p.split("/").some(x=>!x||[".","..",".git"].includes(x))) fail("unsafe path");
}
function visit(node, fn) { fn(node); ts.forEachChild(node, child => visit(child,fn)); }
function topStatement(node, source) { while(node.parent && node.parent!==source) node=node.parent; return node; }
function primitiveInitialization(source,checker,call,dependencies) {
  const functions=new Set(), active=new Set(), classified=new Map();let work=0,depth=0;
  const declaration=id=>{
    const defs=checker.getSymbolAtLocation(id)?.declarations;
    if(!defs||defs.length!==1) fail("initialization binding must resolve uniquely");
    return defs[0];
  };
  const builtin=id=>{
    const d=declaration(id),statement=topStatement(d,source);
    if(!ts.isImportDeclaration(statement)) return null;
    return {module:statement.moduleSpecifier.text.replace(/^node:/u,""),name:ts.isImportSpecifier(d)?(d.propertyName??d.name).text:"default"};
  };
  const ambient=(node,name)=>ts.isIdentifier(node)&&node.text===name&&!checker.getSymbolAtLocation(node)?.declarations?.length;
  const value=node=>{
    if(classified.has(node)) return classified.get(node);
    if(++work>100_000||depth>=256) fail("initialization analysis work/depth budget exceeded");
    depth++;
    try {const result=evaluate(node);classified.set(node,result);return result;} finally {depth--;}
  };
  const evaluate=node=>{
    if(!node) fail("initialization primitive is missing");
    if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)) return "string";
    if(ts.isNumericLiteral(node)||[ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword,ts.SyntaxKind.NullKeyword].includes(node.kind)) return "primitive";
    if(ts.isParenthesizedExpression(node)) return value(node.expression);
    if(ts.isConditionalExpression(node)) {value(node.condition);const a=value(node.whenTrue),b=value(node.whenFalse);return a===b?a:"primitive";}
    if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.QuestionQuestionToken,ts.SyntaxKind.BarBarToken,ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.PlusToken,ts.SyntaxKind.MinusToken,ts.SyntaxKind.GreaterThanToken,ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(node.operatorToken.kind)) {value(node.left);value(node.right);return "primitive";}
    if(ts.isPropertyAccessExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==="env"&&ambient(node.expression.expression,"process")) return "primitive";
    if(ts.isIdentifier(node)) {
      const d=declaration(node);
      if(!ts.isVariableDeclaration(d)||!ts.isVariableDeclarationList(d.parent)||!(d.parent.flags&ts.NodeFlags.Const)||!ts.isIdentifier(d.name)||!d.initializer) fail("initialization requires immutable primitive bindings");
      if(active.has(d)) fail("initialization dependency cycle");active.add(d);const result=value(d.initializer);active.delete(d);return result;
    }
    if(ts.isCallExpression(node)) {
      if(node.arguments.some(ts.isSpreadElement)) fail("initialization spread call is unsupported");
      node.arguments.forEach(value);
      const callee=node.expression;
      if(ts.isPropertyAccessExpression(callee)) {
        const base=callee.expression,name=callee.name.text;
        if(ambient(base,"process")&&name==="cwd") return "string";
        if(ambient(base,"Number")&&["parseInt","isFinite"].includes(name)) return "primitive";
        if(ambient(base,"Math")&&["min","max"].includes(name)) return "primitive";
        if(ts.isIdentifier(base)&&checker.getSymbolAtLocation(base)?.declarations?.some(d=>ts.isImportDeclaration(topStatement(d,source)))) {
          const imported=builtin(base);
          if(imported.module==="path"&&imported.name==="default"&&["join","resolve","dirname"].includes(name)) return "string";
          fail("initialization builtin call is unsupported");
        }
        if(["trim","toLowerCase"].includes(name)) {value(base);return "string";}
      }
      if(ts.isIdentifier(callee)) {
        const d=declaration(callee),statement=topStatement(d,source);
        if(ts.isImportDeclaration(statement)) {
          const imported=builtin(callee);if(imported.module==="os"&&imported.name==="tmpdir"&&!node.arguments.length) return "string";
        }
        if(ts.isFunctionDeclaration(d)&&d.parent===source&&d.body&&!d.parameters.length&&!node.arguments.length&&!d.asteriskToken&&!d.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword)) {
          if(active.has(d)) fail("initialization call cycle");active.add(d);functions.add(d);
          const returns=[];for(const s of d.body.statements) statementValue(s,returns);
          active.delete(d);
          if(!ts.isReturnStatement(d.body.statements.at(-1))||!returns.length) fail("initialization function must return a primitive on every path");
          return returns.every(x=>x==="string")?"string":"primitive";
        }
      }
    }
    fail("initialization binding expression is outside the closed primitive grammar");
  };
  const statementValue=(statement,returns=[])=>{
    if(ts.isVariableStatement(statement)) {
      if(!(statement.declarationList.flags&ts.NodeFlags.Const)) fail("initialization contains a mutable declaration");
      for(const d of statement.declarationList.declarations) {if(!ts.isIdentifier(d.name)) fail("initialization binding is unsupported");value(d.initializer);}
    } else if(ts.isIfStatement(statement)) {value(statement.expression);statementValue(statement.thenStatement,returns);if(statement.elseStatement) statementValue(statement.elseStatement,returns);}
    else if(ts.isBlock(statement)) statement.statements.forEach(s=>statementValue(s,returns));
    else if(ts.isReturnStatement(statement)) returns.push(value(statement.expression));
    else if(ts.isThrowStatement(statement)&&ts.isNewExpression(statement.expression)&&ambient(statement.expression.expression,"Error")) (statement.expression.arguments??[]).forEach(value);
    else if(ts.isExpressionStatement(statement)) value(statement.expression);
    else fail(`initialization binding statement ${ts.SyntaxKind[statement.kind]} is outside the closed execution grammar at offset ${statement.getStart(source)}`);
  };
  if(value(call.arguments[0])!=="string") fail("read argument must capture an immutable primitive string");
  const boundary=Math.max(...[...dependencies].filter(ts.isVariableStatement).map(s=>s.end));
  if(!Number.isFinite(boundary)) fail("captured path requires an initialized const");
  const typeOnly=s=>ts.isTypeAliasDeclaration(s)||ts.isInterfaceDeclaration(s)||(ts.isExportDeclaration(s)&&(s.isTypeOnly||(s.exportClause&&ts.isNamedExports(s.exportClause)&&s.exportClause.elements.length>0&&s.exportClause.elements.every(e=>e.isTypeOnly))));
  const prefix=source.statements.filter(s=>s.end<=boundary&&!ts.isImportDeclaration(s)&&!ts.isFunctionDeclaration(s)&&!typeOnly(s));
  prefix.forEach(s=>statementValue(s));
  return {prefix:prefix.map(s=>s.getText(source)),calledFunctions:source.statements.filter(s=>functions.has(s)).map(s=>s.getText(source))};
}
function structuralBindings(source, checker, call) {
  const reader=topStatement(call,source);
  if(!ts.isFunctionDeclaration(reader) || !reader.name) fail("reader must be a named top-level function");
  const readerSymbol=checker.getSymbolAtLocation(reader.name);
  const pending=[], seen=new Set(), globals=new Set(), symbols=new Set([readerSymbol]), nonEscaping=new Set([readerSymbol]);
  const enqueue = node => {
    visit(node, id => {
      if(!ts.isIdentifier(id) || (ts.isPropertyAccessExpression(id.parent) && id.parent.name===id)) return;
      const symbol=checker.getSymbolAtLocation(id), defs=symbol?.declarations;
      if(!defs?.length) {
        if(!["process","undefined"].includes(id.text)) fail(`unbound path binding: ${id.text}`);
        globals.add(id.text); return;
      }
      for(const def of defs) {
        if(def.getSourceFile()!==source) fail("external path declaration is unsupported");
        const statement=topStatement(def,source);
        if(statement===reader) fail("local or shadowed path binding is unsupported");
        symbols.add(symbol);
        if(ts.isImportDeclaration(statement)||ts.isFunctionDeclaration(statement)) nonEscaping.add(symbol);
        if(!seen.has(statement)) { seen.add(statement); pending.push(statement); }
      }
    });
  };
  enqueue(call);
  while(pending.length) {
    if(seen.size>256) fail("path declaration limit exceeded");
    const statement=pending.pop();
    if(ts.isImportDeclaration(statement)) {
      if(!ts.isStringLiteral(statement.moduleSpecifier) || !["fs/promises","fs","path","os"].includes(statement.moduleSpecifier.text.replace(/^node:/u,""))) fail("path import is outside the bounded node builtin contract");
    } else if(ts.isVariableStatement(statement)) {
      if(!(statement.declarationList.flags & ts.NodeFlags.Const)) fail("mutable path declaration is unsupported");
      for(const declaration of statement.declarationList.declarations) {
        if(!ts.isIdentifier(declaration.name) || !declaration.initializer) fail("path declaration must be a simple initialized const");
        enqueue(declaration.initializer);
      }
    } else if(ts.isFunctionDeclaration(statement)) {
      if(!statement.body || statement.parameters.length) fail("path function declaration is unsupported");
      enqueue(statement.body);
    } else fail("path declaration is unsupported");
  }
  const initialization=primitiveInitialization(source,checker,call,seen);
  // Preserve all lexical reference contexts, not just direct assignment syntax.
  // This rejects aliases/reflection/escapes and reordered initialization without
  // pretending to solve general JavaScript alias or inter-module side effects.
  const contexts=new Set([...seen,reader]);
  visit(source,node=>{
    if(!ts.isIdentifier(node) || (ts.isPropertyAccessExpression(node.parent)&&node.parent.name===node)) return;
    const symbol=checker.getSymbolAtLocation(node);
    if((symbol&&symbols.has(symbol)) || (!symbol&&globals.has(node.text))) {
      contexts.add(topStatement(node,source));
      if(nonEscaping.has(symbol)) {
        if(symbol?.declarations?.some(d=>d.name===node)) return;
        let expression=node;const members=[];
        while(ts.isPropertyAccessExpression(expression.parent)&&expression.parent.expression===expression) { expression=expression.parent;members.push(expression.name.text); }
        const directCall=ts.isCallExpression(expression.parent)&&expression.parent.expression===expression;
        if(!directCall) fail(`protected binding object/function alias or value escape is unsupported at offset ${node.getStart(source)}`);
      }
    }
  });
  return {expression:call.getText(source),reader:reader.getText(source),
    declarations:source.statements.filter(s=>seen.has(s)).map(s=>s.getText(source)),
    referenceContexts:source.statements.filter(s=>contexts.has(s)).map(s=>s.getText(source)),initialization};
}
function parseBindings(p,text,reads) {
  const source=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true,p.endsWith("x")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  if(source.parseDiagnostics.length) fail("source syntax is invalid");
  const host={getSourceFile:name=>name===p?source:undefined,getDefaultLibFileName:()=>"",writeFile:()=>{},getCurrentDirectory:()=>"",getDirectories:()=>[],fileExists:name=>name===p,
    readFile:name=>name===p?text:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=>"\n"};
  const checker=ts.createProgram([p],{noLib:true,noResolve:true},host).getTypeChecker();
  const calls=new Map();visit(source,node=>{if(ts.isCallExpression(node)) calls.set(node.expression.getStart(source),node);});
  return reads.map(read=>{
    const call=calls.get(read.position);if(!call) fail("read expression position differs");
    return structuralBindings(source,checker,call);
  });
}
export function buildFsReadMetadataReview(input) {
  exact(input,["sourceReads","targetReads","sourceFiles","targetFiles","readBlob"]);
  if(typeof input.readBlob!=="function") fail("real Git blob reader is required");
  for(const name of ["sourceReads","targetReads"]) {
    const rows=input[name];if(!Array.isArray(rows)||rows.length>100_000) fail("read inventory limit exceeded");
    for(const row of rows) {
      exact(row,["sourcePath","sourceRawSha256","callee","position","argumentShape","normalizedExpressionDigest","policy"]);safePath(row.sourcePath);
    }
  }
  const sourcePaths=[...new Set(input.sourceReads.map(r=>r.sourcePath))].sort(compare),targetPaths=[...new Set(input.targetReads.map(r=>r.sourcePath))].sort(compare);
  if(!sourcePaths.length||sourcePaths.length>10_000||!same(sourcePaths,targetPaths)||input.sourceReads.length!==input.targetReads.length) fail("read inventory path/count differs");
  const trees={};
  for(const side of ["source","target"]) {
    const rows=input[side+"Files"];if(!Array.isArray(rows)||rows.length>100_000) fail("file inventory limit exceeded");
    trees[side]=new Map();for(const row of rows) {
      exact(row,["path","mode","objectId"]);safePath(row.path);
      if(trees[side].has(row.path)) fail("duplicate file inventory");trees[side].set(row.path,row);
    }
  }
  let total=0,changed=0;
  const files=sourcePaths.map(p=>{
    const sides={};
    for(const side of ["source","target"]) {
      const file=trees[side].get(p);if(!file||!["100644","100755"].includes(file.mode)) fail("read file must be regular");
      const raw=input.readBlob(side,p);if(!(raw instanceof Uint8Array)) fail("blob bytes are required");
      const bytes=Buffer.from(raw);total+=bytes.length;
      if(bytes.length>16*1024*1024||total>64*1024*1024) fail("blob bytes limit exceeded");
      const objectId=crypto.createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
      if(file.objectId!==objectId) fail("Git object differs from actual blob bytes");
      let text;try{text=new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(bytes);}catch{fail("invalid UTF8 bytes");}
      const rawSha256=sha(bytes),native=analyzeRuntimeLoaderCalls(p,text);
      const reads=native.fsReads.map(r=>({sourcePath:p,sourceRawSha256:rawSha256,...r}));
      if(!same(reads,input[side+"Reads"].filter(r=>r.sourcePath===p))) fail("complete native read inventory/hash differs");
      sides[side]={mode:file.mode,objectId,rawSha256,reads,text};
    }
    const {source:s,target:t}=sides;
    if(s.mode!==t.mode) fail("read file mode changed");
    if(s.reads.length!==t.reads.length) fail("read inventory count differs");
    const stable=r=>Object.fromEntries(Object.entries(r).filter(([k])=>!["sourceRawSha256","position"].includes(k)));
    if(!same(s.reads.map(stable),t.reads.map(stable))) fail("read inventory expression or capability changed");
    const changedFile=s.rawSha256!==t.rawSha256;
    const sb=changedFile?parseBindings(p,s.text,s.reads):null,tb=changedFile?parseBindings(p,t.text,t.reads):null;
    if(changedFile) {
      changed++;
      if(!same(sb,tb)) fail("read expression, reader, path binding declaration or mutation changed");
    }
    const identity=x=>({mode:x.mode,objectId:x.objectId,rawSha256:x.rawSha256});
    return {path:p,source:identity(s),target:identity(t),reads:s.reads.map((r,n)=>({source:r,target:t.reads[n],structuralBindingDigest:sb?fingerprint(sb[n]):null})),
      unchangedFileBytes:!changedFile};
  });
  if(!changed) fail("metadata rebinding requires actual source byte drift");
  const proof={schemaVersion:"promotion-fs-read-metadata-review.v1",fileCount:files.length,readCount:input.sourceReads.length,changedFileCount:changed,
    sourceInventoryDigest:fingerprint(input.sourceReads),targetInventoryDigest:fingerprint(input.targetReads),files,preparationEvidenceOnly:true,liveAllowed:false};
  return {...proof,proofDigest:fingerprint(proof)};
}
