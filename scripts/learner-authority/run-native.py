"""Fresh disposable native authority database; no prior fixture or provider use."""
import argparse,hashlib,json,os,pathlib,shutil,signal,socket,subprocess,time,uuid
p=argparse.ArgumentParser();p.add_argument('--label',required=True);p.add_argument('--source');a=p.parse_args()
checkout=pathlib.Path(__file__).resolve().parents[2]
root=pathlib.Path(os.environ.get('MAIS_LEARNER_AUTHORITY_ARTIFACT_ROOT',str(checkout/'.local/learner-authority-runtime'))).resolve();root.mkdir(parents=True,exist_ok=True)
assert shutil.disk_usage(root).free>3*2**30 and shutil.disk_usage(checkout).free>3*2**30
run=root/(a.label+'-'+uuid.uuid4().hex[:8]);run.mkdir();(run/'tmp').mkdir();data=run/'pg-data'
env={key:os.environ[key] for key in ['PATH','HOME','LANG','LC_ALL'] if key in os.environ}
env.update({'TMPDIR':str(run/'tmp'),'PGPASSFILE':'/dev/null','TSX_DISABLE_CACHE':'1','NODE_ENV':'test','NEXT_TELEMETRY_DISABLED':'1','HK_MATH_DB_PATH':str(run/'synthetic.sqlite'),'HK_MATH_STORAGE_PROVIDER':'postgres','HK_MATH_ENABLE_DEMO_USER':'true','HK_MATH_POSTGRES_HOT_AUTH_TABLES':'true','AI_TUTOR_PROVIDER_PROFILE':'offline-fixture','AUTH_SESSION_SECRET':'synthetic-owned-validation-only','POSTGRES_URL':'postgres://mais_authority_test@127.0.0.1:55461/mais_authority_tests','MAIS_LEARNER_AUTHORITY_TEST_URL':'postgres://mais_authority_test@127.0.0.1:55461/mais_authority_tests','LESSON_PERF_DEBUG':'true'})
port=55461
source=(pathlib.Path(a.source) if a.source else checkout/'lib/server/learnerAuthorityPostgresIntegration.test.mjs').resolve()
assert source.is_relative_to(checkout) and source.name.endswith('.test.mjs')
receipt={'run':str(run),'checkout':str(checkout),'source':str(source),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'syntheticOnly':True,'providerCalls':0,'status':'running','hostLoadStart':os.getloadavg()}
pg=None;client=None;pgbin=pathlib.Path(shutil.which('postgres')).resolve().parent
socketdir=pathlib.Path('/private/tmp')/('mais-authority-pg-'+uuid.uuid4().hex[:8]);socketdir.mkdir()
assert len(str(socketdir))<100
start=time.monotonic()
def command(label,args,timeout=180):
 global client
 with (run/(label+'.log')).open('x') as log:client=subprocess.Popen(args,cwd=checkout,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 deadline=time.monotonic()+timeout
 while client.poll() is None:
  if time.monotonic()>deadline:raise RuntimeError(label+' timeout')
  if shutil.disk_usage(root).free<2*2**30:raise RuntimeError('external disk reserve')
  logs=sum(p.stat().st_size for p in run.glob('*.log'))
  wal=sum(p.stat().st_size for p in (data/'pg_wal').glob('*') if p.is_file())
  if logs>20*2**20 or wal>128*2**20:raise RuntimeError('test growth cap')
  time.sleep(.25)
 if client.returncode:raise RuntimeError(label+' exit '+str(client.returncode))
try:
 with socket.socket() as probe:
  probe.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);probe.bind(('127.0.0.1',port))
 command('initdb',[str(pgbin/'initdb'),'-D',str(data),'-U','mais_authority_test','--encoding=UTF8','--no-locale','--auth-local=trust','--auth-host=trust'])
 with (data/'postgresql.conf').open('a') as f:f.write("\nlisten_addresses='127.0.0.1'\nport="+str(port)+"\nmax_wal_size='64MB'\nmin_wal_size='32MB'\ncheckpoint_timeout='60s'\nshared_preload_libraries='pg_stat_statements'\npg_stat_statements.track='all'\npg_stat_statements.track_planning=on\nfsync=on\nsynchronous_commit=on\nfull_page_writes=on\n")
 with (run/'postgres.log').open('x') as log:pg=subprocess.Popen([str(pgbin/'postgres'),'-D',str(data),'-k',str(socketdir)],cwd=checkout,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 for _ in range(100):
  if pg.poll() is not None:raise RuntimeError('Postgres exited')
  try:
   with socket.create_connection(('127.0.0.1',port),timeout=.2):break
  except OSError:time.sleep(.1)
 else:raise RuntimeError('Postgres readiness timeout')
 command('createdb',[str(pgbin/'createdb'),'-h','127.0.0.1','-p',str(port),'-U','mais_authority_test','mais_authority_tests'])
 command('native',['node','--import','tsx','--test',str(source)],180)
 receipt['status']='passed'
except Exception as e:receipt.update(status='failed',error=str(e))
finally:
 if client and client.poll() is None:os.killpg(client.pid,signal.SIGTERM);client.wait(timeout=10)
 if pg and pg.poll() is None:
  lines=(data/'postmaster.pid').read_text().splitlines();assert int(lines[0])==pg.pid and pathlib.Path(lines[1]).resolve()==data.resolve()
  stopped=subprocess.run([str(pgbin/'pg_ctl'),'-D',str(data),'stop','-m','smart','-t','20'],env=env,capture_output=True,text=True,timeout=25)
  receipt['postgresStopExit']=stopped.returncode;pg.wait(timeout=5)
 receipt.update(hostLoadEnd=os.getloadavg(),elapsedSeconds=time.monotonic()-start,sourceUnchanged=hashlib.sha256(source.read_bytes()).hexdigest()==receipt['sourceSha256'],clusterPidAbsent=not(data/'postmaster.pid').exists())
 (run/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
raise SystemExit(0 if receipt['status']=='passed' else 1)
