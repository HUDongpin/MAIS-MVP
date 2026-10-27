"""Freeze this candidate and build a disposable local application, without deployment."""
import hashlib,json,os,pathlib,shutil,subprocess,time,uuid
checkout=pathlib.Path(__file__).resolve().parents[2]
root=pathlib.Path(os.environ.get('MAIS_LEARNER_AUTHORITY_ARTIFACT_ROOT',str(checkout/'.local/learner-authority-runtime'))).resolve();root.mkdir(parents=True,exist_ok=True)
run=root/('http-build-'+uuid.uuid4().hex[:10]);source=run/'source'
assert shutil.disk_usage(root).free>6*2**30
source.mkdir(parents=True);(run/'tmp').mkdir()
directories=['app','components','data','lib','public','scripts','tests','types']
files=['package.json','package-lock.json','next.config.ts','next-env.d.ts','middleware.ts','postcss.config.mjs','tailwind.config.ts','playwright.config.ts']
files += [p.name for p in checkout.glob('tsconfig*.json') if '.tmp.' not in p.name]
manifest={}
for directory in directories:
 for item in (checkout/directory).rglob('*'):
  if not item.is_file() or item.name=='.DS_Store':continue
  assert not item.is_symlink(),str(item)
  relative=item.relative_to(checkout);target=source/relative;target.parent.mkdir(parents=True,exist_ok=True)
  shutil.copy2(item,target);manifest[str(relative)]=hashlib.sha256(target.read_bytes()).hexdigest()
for name in files:
 shutil.copy2(checkout/name,source/name);manifest[name]=hashlib.sha256((source/name).read_bytes()).hexdigest()
(source/'node_modules').symlink_to((checkout/'node_modules').resolve(),target_is_directory=True)
manifest_hash=hashlib.sha256(json.dumps(manifest,sort_keys=True).encode()).hexdigest()
(run/'source-manifest.json').write_text(json.dumps({'checkout':str(checkout),'files':manifest,'sha256':manifest_hash},indent=2)+'\n')
env={key:os.environ[key] for key in ['PATH','HOME','LANG','LC_ALL'] if key in os.environ}
env.update({'TMPDIR':str(run/'tmp'),'NODE_ENV':'production','NEXT_TELEMETRY_DISABLED':'1','NEXT_DIST_DIR':'.tmp/http-next',
 'NEXT_TSCONFIG_PATH':'tsconfig.next.json','AUTH_SESSION_SECRET':'synthetic-local-authority-validation-only',
 'HK_MATH_STORAGE_PROVIDER':'sqlite','HK_MATH_DB_PATH':str(run/'build-only.sqlite'),'HK_MATH_ENABLE_DEMO_USER':'false',
 'AI_TUTOR_PROVIDER_PROFILE':'offline-fixture','AI_MEDIA_OBJECT_STORE_DIR':str(run/'media')})
receipt={'source':str(source),'sourceManifestSha256':manifest_hash,'syntheticOnly':True,'deployment':False,'providerCalls':0,'status':'building'}
start=time.monotonic()
with (run/'build.log').open('x') as log:
 process=subprocess.Popen(['npm','run','build'],cwd=source,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 while process.poll() is None:
  if time.monotonic()-start>1200 or shutil.disk_usage(root).free<3*2**30:
   process.terminate();process.wait(timeout=30);break
  time.sleep(.5)
receipt.update(exitCode=process.returncode,elapsedSeconds=time.monotonic()-start,status='built' if process.returncode==0 else 'failed')
receipt['originalSourceUnchanged']=all(hashlib.sha256((checkout/name).read_bytes()).hexdigest()==digest for name,digest in manifest.items())
receipt['snapshotSourceUnchanged']=all(hashlib.sha256((source/name).read_bytes()).hexdigest()==digest for name,digest in manifest.items() if name!='tsconfig.next.json')
if process.returncode==0:
 receipt['buildId']=(source/'.tmp/http-next/BUILD_ID').read_text().strip()
(run/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
raise SystemExit(0 if receipt['status']=='built' and receipt['originalSourceUnchanged'] and receipt['snapshotSourceUnchanged'] else 1)
