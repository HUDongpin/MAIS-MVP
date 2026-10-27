"""Run two frozen local application workers against one fresh durable PostgreSQL fixture."""
import argparse,hashlib,json,os,pathlib,shutil,signal,socket,subprocess,time,uuid
p=argparse.ArgumentParser();p.add_argument('--build',required=True);p.add_argument('--learners',type=int,choices=[2,20],required=True);p.add_argument('--two-person');p.add_argument('--workload',choices=['saves','mixed'],default='saves');a=p.parse_args()
checkout=pathlib.Path(__file__).resolve().parents[2]
root=pathlib.Path(os.environ.get('MAIS_LEARNER_AUTHORITY_ARTIFACT_ROOT',str(checkout/'.local/learner-authority-runtime'))).resolve();root.mkdir(parents=True,exist_ok=True)
build=pathlib.Path(a.build).resolve();assert build.parent==root
build_receipt=json.loads((build/'receipt.json').read_text());assert build_receipt['status']=='built'
source=pathlib.Path(build_receipt['source']);assert source==build/'source'
driver=checkout/'scripts/learner-authority/http-load.mjs'
driver_digest=hashlib.sha256(driver.read_bytes()).hexdigest()
if a.learners==20:
 assert a.two_person,'A passing two-person result from this exact build is required.'
 gate_path=pathlib.Path(a.two_person).resolve();assert gate_path.parent==root
 gate=json.loads((gate_path/'http-result.json').read_text());assert gate['learners']==2 and gate['correctnessPassed'] and gate['sloPassed']
 assert gate['buildId']==build_receipt['buildId'] and gate['sourceManifestSha256']==build_receipt['sourceManifestSha256']
 assert gate.get('workload','saves')==a.workload and gate.get('driverSha256',driver_digest)==driver_digest
run=root/('http-'+str(a.learners)+'-'+uuid.uuid4().hex[:10]);run.mkdir();(run/'tmp').mkdir();data=run/'pg-data'
assert shutil.disk_usage(root).free>4*2**30
env={key:os.environ[key] for key in ['PATH','HOME','LANG','LC_ALL'] if key in os.environ}
env.update({'TMPDIR':str(run/'tmp'),'NODE_ENV':'production','NEXT_TELEMETRY_DISABLED':'1','NEXT_DIST_DIR':'.tmp/http-next',
 'NEXT_TSCONFIG_PATH':'tsconfig.next.json','AUTH_SESSION_SECRET':'synthetic-local-authority-validation-only',
 'HK_MATH_STORAGE_PROVIDER':'postgres','HK_MATH_POSTGRES_HOT_AUTH_TABLES':'true','HK_MATH_LEARNER_AUTHORITY':'independent',
 'HK_MATH_ENABLE_DEMO_USER':'false','HK_MATH_DB_PATH':str(run/'unused.sqlite'),'AI_TUTOR_PROVIDER_PROFILE':'offline-fixture',
 'AI_MEDIA_OBJECT_STORE_DIR':str(run/'media'),'POSTGRES_MAX_CONNECTIONS':'1','HK_MATH_POSTGRES_MAX_CONNECTIONS':'1',
 'POSTGRES_URL':'postgres://mais_authority_http_app@127.0.0.1:55462/mais_authority_http_tests','PGPASSFILE':'/dev/null',
 'MAIS_HTTP_OBSERVER_URL':'postgres://mais_authority_test@127.0.0.1:55462/mais_authority_http_tests',
 'MAIS_HTTP_LEARNERS':str(a.learners),'MAIS_HTTP_ARTIFACT_ROOT':str(root),'MAIS_HTTP_RUN':str(run),'MAIS_HTTP_SOURCE':str(source),
 'MAIS_HTTP_BUILD_ID':build_receipt['buildId'],'MAIS_HTTP_MANIFEST':build_receipt['sourceManifestSha256'],
 'LESSON_PERF_DEBUG':'true','MAIS_HTTP_WORKLOAD':a.workload,'MAIS_HTTP_DRIVER_SHA':driver_digest})
pgbin=pathlib.Path(shutil.which('postgres')).resolve().parent
socketdir=pathlib.Path('/private/tmp')/('mais-authority-http-'+uuid.uuid4().hex[:8]);socketdir.mkdir();assert len(str(socketdir))<100
pg=None;apps=[];children=[]
receipt={'run':str(run),'source':str(source),'buildId':build_receipt['buildId'],'learners':a.learners,'sourceManifestSha256':build_receipt['sourceManifestSha256'],
 'syntheticOnly':True,'deployment':False,'providerCalls':0,'status':'running','workload':a.workload,'driverSha256':driver_digest,'hostLoadStart':os.getloadavg(),'appConnectionLimit':2}
start=time.monotonic()
def command(label,args,timeout=180):
 with (run/(label+'.log')).open('x') as log:child=subprocess.Popen(args,cwd=source,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 children.append(child);deadline=time.monotonic()+timeout
 while child.poll() is None:
  if time.monotonic()>deadline or shutil.disk_usage(root).free<2*2**30:raise RuntimeError(label+' deadline or storage reserve')
  time.sleep(.25)
 if child.returncode not in [0,2]:raise RuntimeError(label+' exit '+str(child.returncode))
 return child.returncode
try:
 for port in [55462,3121,3122]:
  with socket.socket() as probe:probe.bind(('127.0.0.1',port))
 command('initdb',[str(pgbin/'initdb'),'-D',str(data),'-U','mais_authority_test','--encoding=UTF8','--no-locale','--auth-local=trust','--auth-host=trust'])
 with (data/'postgresql.conf').open('a') as f:f.write("\nlisten_addresses='127.0.0.1'\nport=55462\nmax_wal_size='128MB'\nmin_wal_size='32MB'\ncheckpoint_timeout='60s'\nfsync=on\nsynchronous_commit=on\nfull_page_writes=on\nshared_preload_libraries='pg_stat_statements'\npg_stat_statements.track='all'\n")
 with (run/'postgres.log').open('x') as log:pg=subprocess.Popen([str(pgbin/'postgres'),'-D',str(data),'-k',str(socketdir)],cwd=source,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 for _ in range(100):
  if pg.poll() is not None:raise RuntimeError('PostgreSQL exited')
  try:
   with socket.create_connection(('127.0.0.1',55462),timeout=.2):break
  except OSError:time.sleep(.1)
 else:raise RuntimeError('PostgreSQL readiness timeout')
 command('app-role',[str(pgbin/'psql'),'-h','127.0.0.1','-p','55462','-U','mais_authority_test','-d','postgres','-v','ON_ERROR_STOP=1','-c','CREATE ROLE mais_authority_http_app LOGIN CONNECTION LIMIT 2'])
 command('createdb',[str(pgbin/'createdb'),'-h','127.0.0.1','-p','55462','-U','mais_authority_test','-O','mais_authority_http_app','mais_authority_http_tests'])
 command('statistics',[str(pgbin/'psql'),'-h','127.0.0.1','-p','55462','-U','mais_authority_test','-d','mais_authority_http_tests','-v','ON_ERROR_STOP=1','-c','CREATE EXTENSION pg_stat_statements'])
 for index,port in enumerate([3121,3122]):
  with (run/f'worker-{index}.log').open('x') as log:app=subprocess.Popen(['node',str(source/'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',str(port)],cwd=source,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
  apps.append(app)
  for _ in range(200):
   if app.poll() is not None:raise RuntimeError('Application worker exited')
   try:
    with socket.create_connection(('127.0.0.1',port),timeout=.2):break
   except OSError:time.sleep(.1)
  else:raise RuntimeError('Application worker readiness timeout')
 exit_code=command('http',['node',str(driver)],600)
 receipt['status']='passed' if exit_code==0 else 'slo-failed'
except Exception as error:receipt.update(status='failed',error=str(error))
finally:
 for child in children+apps:
  if child.poll() is None:
   os.killpg(child.pid,signal.SIGTERM)
   try:child.wait(timeout=20)
   except subprocess.TimeoutExpired:
    os.killpg(child.pid,signal.SIGKILL);child.wait(timeout=5);receipt['forcedOwnedProcessStop']=True
 receipt['workerExitCodes']=[app.returncode for app in apps]
 if pg and pg.poll() is None:
  pid=(data/'postmaster.pid').read_text().splitlines();assert int(pid[0])==pg.pid and pathlib.Path(pid[1]).resolve()==data.resolve()
  stopped=subprocess.run([str(pgbin/'pg_ctl'),'-D',str(data),'stop','-m','smart','-t','20'],env=env,capture_output=True,text=True,timeout=25)
  receipt['postgresStopExit']=stopped.returncode;pg.wait(timeout=5)
 receipt['driverUnchanged']=hashlib.sha256(driver.read_bytes()).hexdigest()==driver_digest
 receipt.update(elapsedSeconds=time.monotonic()-start,hostLoadEnd=os.getloadavg(),clusterPidAbsent=not(data/'postmaster.pid').exists())
 (run/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
raise SystemExit(0 if receipt['status']=='passed' else 1)
