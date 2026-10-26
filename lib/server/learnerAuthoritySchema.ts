import type postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { LearnerAuthorityError } from './learnerAuthorityState';

export type AuthoritySql = postgres.Sql | postgres.TransactionSql;
export const learnerAuthorityContract = 'mais-learner-authority-v1';
export const learnerAuthorityStorageLock = 'mais-postgres-storage-contract-v1';
export const learnerAuthorityMaintenanceLock = 'mais:learner-authority:maintenance:v1';
const tables = ['control','publications','accounts','states','claims','receipts','journal','invalidations','deletions'] as const;
export const learnerAuthorityRetiredProjectionTables = ['projection_attempts','projection_mistake_book_items','projection_learning_events',
  'projection_lesson_progress','projection_visualization_events','projection_visualization_sessions','projection_submissions','projection_reward_point_ledger','projection_gamification_events'] as const;
const sourceTables = ['app_state','projection_topics','projection_questions','auth_users','auth_student_profiles','auth_user_settings','auth_password_reset_tokens',...learnerAuthorityRetiredProjectionTables] as const;
const hotTables = ['practice_attempts','mistake_book_items','adaptive_skill_states','learning_events','learning_event_clears','reward_point_ledger'] as const;
const guardName = 'learner_authority_source_guard';
const participantSetting = 'mais.learner_authority_participant';

// This is a compatibility/freshness fence, not a secret or an alternative to
// application authorization. It prevents unadapted old writers from silently
// writing stale snapshots. Privileged schema changes remain deployment work.
export const learnerAuthorityGuardBody = `
DECLARE required_exclusive boolean; lock_key bigint; previous_epoch bigint; changed_count integer; actual_epoch bigint; actual_attested bigint;
BEGIN
  IF current_setting('session_replication_role') <> 'origin' THEN
    RAISE EXCEPTION 'learner-authority-replication-role-required';
  END IF;
  IF TG_TABLE_SCHEMA = 'learner_authority' AND TG_TABLE_NAME = 'publications' AND TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'learner-authority-publication-immutable';
  END IF;
  IF current_setting('${participantSetting}',true) IS DISTINCT FROM '${learnerAuthorityContract}' THEN
    RAISE EXCEPTION 'learner-authority-participant-required';
  END IF;
  IF current_setting('mais.learner_authority_narrow',true)='true' AND TG_TABLE_SCHEMA='learner_authority'
    AND TG_TABLE_NAME IN ('accounts','deletions','publications') THEN RAISE EXCEPTION 'authority-metadata-write-forbidden'; END IF;
  required_exclusive := TG_OP='TRUNCATE' OR (TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME NOT IN
    ('practice_attempts','mistake_book_items','adaptive_skill_states','learning_events','learning_event_clears','reward_point_ledger'))
    OR (TG_TABLE_SCHEMA = 'learner_authority' AND TG_TABLE_NAME IN ('control','publications','accounts','deletions'));
  IF required_exclusive AND current_setting('mais.learner_authority_mode',true) IS DISTINCT FROM 'exclusive' THEN
    RAISE EXCEPTION 'learner-authority-exclusive-admission-required';
  END IF;
  lock_key := pg_catalog.hashtextextended('${learnerAuthorityStorageLock}',0);
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_locks WHERE pid=pg_catalog.pg_backend_pid() AND locktype='advisory'
    AND classid=((lock_key >> 32) & 4294967295)::oid AND objid=(lock_key & 4294967295)::oid AND objsubid=1 AND granted) THEN
    RAISE EXCEPTION 'learner-authority-storage-admission-required';
  END IF;
  lock_key := pg_catalog.hashtextextended('${learnerAuthorityMaintenanceLock}',0);
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_locks WHERE pid=pg_catalog.pg_backend_pid() AND locktype='advisory'
    AND classid=((lock_key >> 32) & 4294967295)::oid AND objid=(lock_key & 4294967295)::oid AND objsubid=1 AND granted
    AND (NOT required_exclusive OR mode='ExclusiveLock')) THEN
    RAISE EXCEPTION 'learner-authority-maintenance-admission-required';
  END IF;
  IF TG_TABLE_SCHEMA = 'public' AND required_exclusive THEN
    PERFORM set_config('mais.learner_authority_sealing','false',true);
    SELECT content_epoch INTO STRICT previous_epoch FROM learner_authority.control WHERE id='primary' FOR UPDATE;
    UPDATE learner_authority.control SET content_epoch=content_epoch+1,attested_epoch=NULL WHERE id='primary';
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    SELECT content_epoch,attested_epoch INTO STRICT actual_epoch,actual_attested FROM learner_authority.control WHERE id='primary';
    IF changed_count<>1 OR actual_epoch IS DISTINCT FROM previous_epoch+1 OR actual_attested IS NOT NULL THEN
      RAISE EXCEPTION 'authority-source-invalidation-failed';
    END IF;
  END IF;
  RETURN NULL;
END
`;
const guardBody=learnerAuthorityGuardBody;
const ownedTables=['states','claims','receipts','journal','invalidations'] as const;
const ownedGuardBody=`
DECLARE row_data jsonb; expected_user text; expected_generation text; lock_key bigint;
BEGIN
  IF current_setting('mais.learner_authority_mode',true)='exclusive' THEN
    lock_key := pg_catalog.hashtextextended('${learnerAuthorityMaintenanceLock}',0);
    IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_locks WHERE pid=pg_backend_pid() AND locktype='advisory' AND granted
      AND classid=((lock_key >> 32) & 4294967295)::oid AND objid=(lock_key & 4294967295)::oid AND objsubid=1 AND mode='ExclusiveLock') THEN
      RAISE EXCEPTION 'authority-exclusive-label-invalid';
    END IF;
    IF current_setting('mais.learner_authority_narrow',true) IS DISTINCT FROM 'true' THEN
      IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;
  END IF;
  expected_user := current_setting('mais.learner_authority_user',true);
  expected_generation := current_setting('mais.learner_authority_generation',true);
  IF expected_user IS NULL OR expected_generation IS NULL THEN RAISE EXCEPTION 'authority-subject-required'; END IF;
  IF TG_OP<>'INSERT' THEN
    row_data := to_jsonb(OLD);
    IF COALESCE(row_data->>'user_id',row_data->>'owner') IS DISTINCT FROM expected_user
      OR row_data->>'generation' IS DISTINCT FROM expected_generation THEN RAISE EXCEPTION 'authority-foreign-write'; END IF;
  END IF;
  IF TG_OP<>'DELETE' THEN
    row_data := to_jsonb(NEW);
    IF COALESCE(row_data->>'user_id',row_data->>'owner') IS DISTINCT FROM expected_user
      OR row_data->>'generation' IS DISTINCT FROM expected_generation THEN RAISE EXCEPTION 'authority-foreign-write'; END IF;
  END IF;
  IF TG_TABLE_NAME IN ('receipts','journal') THEN
    IF TG_OP<>'INSERT' OR row_data->>'operation_id' IS DISTINCT FROM current_setting('mais.learner_authority_operation',true)
      OR row_data->>'revision' IS DISTINCT FROM current_setting('mais.learner_authority_revision',true) THEN
      RAISE EXCEPTION 'authority-history-write-forbidden';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END
`;
const controlGuardBody=`
BEGIN
  IF (NEW.shared_payload IS DISTINCT FROM OLD.shared_payload OR NEW.state_revision IS DISTINCT FROM OLD.state_revision OR NEW.definition_epoch IS DISTINCT FROM OLD.definition_epoch
    OR NEW.mode IS DISTINCT FROM OLD.mode) AND current_setting('mais.learner_authority_sealing',true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'authority-source-sealing-required';
  END IF;
  IF current_setting('mais.learner_authority_narrow',true)='true'
    AND (NEW.shared_payload IS DISTINCT FROM OLD.shared_payload OR NEW.mode IS DISTINCT FROM OLD.mode
      OR NEW.state_revision IS DISTINCT FROM OLD.state_revision OR NEW.definition_epoch IS DISTINCT FROM OLD.definition_epoch OR NEW.publication_id IS DISTINCT FROM OLD.publication_id) THEN
    RAISE EXCEPTION 'authority-control-write-forbidden';
  END IF;
  IF NEW.content_epoch < OLD.content_epoch THEN RAISE EXCEPTION 'authority-source-epoch-regression'; END IF;
  IF NEW.definition_epoch < OLD.definition_epoch THEN RAISE EXCEPTION 'authority-definition-epoch-regression'; END IF;
  IF NEW.content_epoch > OLD.content_epoch AND NEW.attested_epoch IS NOT NULL THEN RAISE EXCEPTION 'authority-source-epoch-unattested-required'; END IF;
  IF NEW.attested_epoch IS NOT NULL AND NEW.attested_epoch IS DISTINCT FROM OLD.attested_epoch
    AND current_setting('mais.learner_authority_sealing',true) IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'authority-source-sealing-required'; END IF;
  IF OLD.publication_id IS NOT NULL AND NEW.publication_id IS DISTINCT FROM OLD.publication_id
    AND current_setting('mais.learner_authority_sealing',true) IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'authority-publication-replacement-forbidden'; END IF;
  IF NEW.installation_id IS DISTINCT FROM OLD.installation_id OR NEW.contract IS DISTINCT FROM OLD.contract THEN RAISE EXCEPTION 'authority-installation-replacement-forbidden'; END IF;
  RETURN NEW;
END
`;

export async function hasAuthorityInstallation(sql:AuthoritySql):Promise<boolean>{
  const [row]=await sql<Array<{present:boolean;namespace_present:boolean;anchor_present:boolean}>>`
    SELECT pg_catalog.to_regclass('learner_authority.control') IS NOT NULL AS present,
      pg_catalog.to_regnamespace('learner_authority') IS NOT NULL AS namespace_present,
      EXISTS(SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid=pg_catalog.to_regclass('public.app_state')
        AND attname='learner_authority_installation' AND NOT attisdropped) AS anchor_present`;
  if(!row||((row.namespace_present||row.anchor_present)&&!(row.present&&row.anchor_present))){
    throw new LearnerAuthorityError('learner-authority-schema-unavailable');
  }
  return row.present;
}

/** Must precede activity, account and relation/state locks in all participants. */
export async function lockLearnerAuthority(sql: AuthoritySql, mode: 'shared' | 'exclusive'): Promise<boolean> {
  await sql`SELECT pg_catalog.pg_advisory_xact_lock_shared(pg_catalog.hashtextextended(${learnerAuthorityStorageLock},0))`;
  if(!await hasAuthorityInstallation(sql))return false;
  const [admission]=await sql<Array<{replication_role:string;shared_held:boolean;exclusive_held:boolean}>>`
    WITH key AS (SELECT pg_catalog.hashtextextended(${learnerAuthorityMaintenanceLock},0) AS value), held AS (
      SELECT locks.mode FROM pg_catalog.pg_locks AS locks,key
      WHERE locks.pid=pg_catalog.pg_backend_pid() AND locks.locktype='advisory' AND locks.granted
        AND locks.classid=((key.value >> 32) & 4294967295)::oid AND locks.objid=(key.value & 4294967295)::oid AND locks.objsubid=1
    ) SELECT current_setting('session_replication_role') AS replication_role,
      EXISTS(SELECT 1 FROM held WHERE mode='ShareLock') AS shared_held,
      EXISTS(SELECT 1 FROM held WHERE mode='ExclusiveLock') AS exclusive_held`;
  if(admission?.replication_role!=='origin')throw new LearnerAuthorityError('learner-authority-replication-role-required');
  if(mode==='exclusive'&&admission.shared_held&&!admission.exclusive_held)throw new LearnerAuthorityError('learner-authority-upgrade-forbidden');
  if(mode==='exclusive')await sql`SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(${learnerAuthorityMaintenanceLock},0))`;
  else await sql`SELECT pg_catalog.pg_advisory_xact_lock_shared(pg_catalog.hashtextextended(${learnerAuthorityMaintenanceLock},0))`;
  await sql`SELECT pg_catalog.set_config(${participantSetting},${learnerAuthorityContract},true),
    pg_catalog.set_config('mais.learner_authority_mode',${mode==='exclusive'||admission.exclusive_held?'exclusive':'shared'},true)`;
  return true;
}

const requiredConstraints = [
  {
    "relname": "accounts",
    "conname": "accounts_mode_check",
    "definition": "CHECK ((mode = ANY (ARRAY['legacy'::text, 'authoritative'::text, 'compatibility'::text, 'frozen'::text, 'erased'::text])))"
  },
  {
    "relname": "accounts",
    "conname": "accounts_pkey",
    "definition": "PRIMARY KEY (user_id)"
  },
  {
    "relname": "accounts",
    "conname": "accounts_user_id_generation_key",
    "definition": "UNIQUE (user_id, generation)"
  },
  {
    "relname": "claims",
    "conname": "claims_pkey",
    "definition": "PRIMARY KEY (component, owner, generation, slot)"
  },
  {
    "relname": "claims",
    "conname": "claims_slot_check",
    "definition": "CHECK ((slot >= 0))"
  },
  {
    "relname": "control",
    "conname": "control_attested_epoch_check",
    "definition": "CHECK (((attested_epoch >= 0) AND (attested_epoch <= '9007199254740991'::bigint)))"
  },
  {
    "relname": "control",
    "conname": "control_content_epoch_check",
    "definition": "CHECK (((content_epoch >= 0) AND (content_epoch <= '9007199254740991'::bigint)))"
  },
  {
    "relname": "control",
    "conname": "control_definition_epoch_check",
    "definition": "CHECK (((definition_epoch >= 0) AND (definition_epoch <= '9007199254740991'::bigint)))"
  },
  {
    "relname": "control",
    "conname": "control_id_check",
    "definition": "CHECK ((id = 'primary'::text))"
  },
  {
    "relname": "control",
    "conname": "control_mode_check",
    "definition": "CHECK ((mode = ANY (ARRAY['authoritative'::text, 'compatibility'::text, 'frozen'::text])))"
  },
  {
    "relname": "control",
    "conname": "control_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "relname": "control",
    "conname": "control_publication_id_fkey",
    "definition": "FOREIGN KEY (publication_id) REFERENCES learner_authority.publications(id)"
  },
  {
    "relname": "control",
    "conname": "control_shared_payload_check",
    "definition": "CHECK ((jsonb_typeof(shared_payload) = 'object'::text))"
  },
  {
    "relname": "deletions",
    "conname": "deletions_pkey",
    "definition": "PRIMARY KEY (user_id, generation)"
  },
  {
    "relname": "invalidations",
    "conname": "invalidations_pkey",
    "definition": "PRIMARY KEY (user_id, generation)"
  },
  {
    "relname": "journal",
    "conname": "journal_pkey",
    "definition": "PRIMARY KEY (user_id, generation, revision)"
  },
  {
    "relname": "publications",
    "conname": "publications_content_check",
    "definition": "CHECK ((jsonb_typeof(content) = 'object'::text))"
  },
  {
    "relname": "publications",
    "conname": "publications_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "relname": "receipts",
    "conname": "receipts_pkey",
    "definition": "PRIMARY KEY (user_id, generation, operation_id)"
  },
  {
    "relname": "states",
    "conname": "states_payload_check",
    "definition": "CHECK ((jsonb_typeof(payload) = 'object'::text))"
  },
  {
    "relname": "states",
    "conname": "states_pkey",
    "definition": "PRIMARY KEY (user_id, generation)"
  },
  {
    "relname": "states",
    "conname": "states_reset_epoch_check",
    "definition": "CHECK (((reset_epoch >= 0) AND (reset_epoch <= '9007199254740991'::bigint)))"
  },
  {
    "relname": "states",
    "conname": "states_revision_check",
    "definition": "CHECK (((revision >= 0) AND (revision <= '9007199254740991'::bigint)))"
  },
  {
    "relname": "states",
    "conname": "states_user_id_generation_fkey",
    "definition": "FOREIGN KEY (user_id, generation) REFERENCES learner_authority.accounts(user_id, generation)"
  }
] as const;

const requiredColumns: Record<string, Record<string, readonly [number, boolean]>> = {
  control: {id:[25,true],contract:[25,true],installation_id:[2950,true],publication_id:[2950,false],content_epoch:[20,true],definition_epoch:[20,true],attested_epoch:[20,false],shared_payload:[3802,true],state_revision:[20,false],mode:[25,true]},
  publications:{id:[2950,true],content:[3802,true],created_at:[1184,true]},
  accounts:{user_id:[25,true],generation:[2950,true],mode:[25,true],account_identity:[3802,true]},
  states:{user_id:[25,true],generation:[2950,true],revision:[20,true],reset_epoch:[20,true],payload:[3802,true]},
  claims:{component:[25,true],owner:[25,true],generation:[2950,true],slot:[23,true],id_key:[25,false],source_key:[25,false],record:[3802,true]},
  receipts:{user_id:[25,true],generation:[2950,true],operation_id:[25,true],session_revision:[20,true],reset_epoch:[20,true],request:[3802,true],result:[3802,true],previous_revision:[20,true],revision:[20,true],committed_at:[1184,true]},
  journal:{user_id:[25,true],generation:[2950,true],revision:[20,true],operation_id:[25,true],kind:[25,true],payload:[3802,false]},
  invalidations:{user_id:[25,true],generation:[2950,true],revision:[20,true]},
  deletions:{user_id:[25,true],generation:[2950,true],deleted_at:[1184,true]}
};

async function assertAuthorityStructure(sql:AuthoritySql):Promise<void>{
  const attributes=await sql<Array<{table_name:string;name:string;type_oid:number;not_null:boolean;exact_collation:boolean;identity:string;generated:string}>>`
    SELECT relation.relname::text AS table_name,attribute.attname::text AS name,
      attribute.atttypid::int AS type_oid,attribute.attnotnull AS not_null,
      attribute.attcollation=pg_catalog.to_regcollation('pg_catalog."C"') AS exact_collation,
      attribute.attidentity::text AS identity,attribute.attgenerated::text AS generated
    FROM pg_catalog.pg_attribute AS attribute JOIN pg_catalog.pg_class AS relation ON relation.oid=attribute.attrelid
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid=relation.relnamespace
    WHERE namespace.nspname='learner_authority' AND relation.relname=ANY(${[...tables]}::text[])
      AND attribute.attnum>0 AND NOT attribute.attisdropped`;
  const expectedCount=Object.values(requiredColumns).reduce((n,columns)=>n+Object.keys(columns).length,0);
  if(attributes.length!==expectedCount||attributes.some(row=>{
    const required=requiredColumns[row.table_name]?.[row.name];
    return !required||row.type_oid!==required[0]||row.not_null!==required[1]
      || (row.type_oid===25&&!row.exact_collation)||row.identity!==''||row.generated!=='';
  }))throw new LearnerAuthorityError('learner-authority-schema-unavailable');
  const constraints=await sql<Array<{relname:string;conname:string;definition:string;valid:boolean}>>`
    SELECT relation.relname::text,con.conname::text,pg_catalog.pg_get_constraintdef(con.oid) AS definition,
      con.convalidated AND NOT con.condeferrable AND NOT con.condeferred
      AND (con.conindid=0 OR (idx.indisvalid AND idx.indisready)) AS valid
    FROM pg_catalog.pg_constraint AS con JOIN pg_catalog.pg_class AS relation ON relation.oid=con.conrelid
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid=relation.relnamespace
    LEFT JOIN pg_catalog.pg_index AS idx ON idx.indexrelid=con.conindid
    WHERE namespace.nspname='learner_authority' AND relation.relname=ANY(${[...tables]}::text[])`;
  if(constraints.length!==requiredConstraints.length||requiredConstraints.some(required=>!constraints.some(actual=>
    actual.valid&&actual.relname===required.relname&&actual.conname===required.conname&&actual.definition===required.definition))){
    throw new LearnerAuthorityError('learner-authority-schema-unavailable');
  }
}

export async function assertLearnerAuthoritySchema(sql: AuthoritySql): Promise<void> {
  const [runtime]=await sql<Array<{role:string}>>`SELECT current_setting('session_replication_role') AS role`;
  if(runtime?.role!=='origin')throw new LearnerAuthorityError('learner-authority-replication-role-required');
  const required=[...tables.map(name=>`learner_authority.${name}`),...[...sourceTables,...hotTables].map(name=>`public.${name}`)];
  // ROW EXCLUSIVE locks coexist across learners but prevent trigger/table DDL
  // from changing these relations after the contract is observed.
  await sql.unsafe(`LOCK TABLE ${required.join(', ')} IN ROW EXCLUSIVE MODE`);
  const rows=await sql<Array<{name:string;relkind:string;relpersistence:string;rls:boolean;valid_guard:boolean}>>`
    SELECT required.name,relation.relkind::text,relation.relpersistence::text,
      relation.relrowsecurity OR relation.relforcerowsecurity AS rls,
      EXISTS (SELECT 1 FROM pg_catalog.pg_trigger AS trigger
        JOIN pg_catalog.pg_proc AS routine ON routine.oid=trigger.tgfoid
        JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid=routine.pronamespace
        WHERE trigger.tgrelid=relation.oid AND trigger.tgname=${guardName}
          AND NOT trigger.tgisinternal AND trigger.tgenabled='A' AND trigger.tgtype=62
          AND trigger.tgqual IS NULL AND trigger.tgnargs=0
          AND namespace.nspname='learner_authority' AND routine.proname='guard_write'
          AND routine.prosrc=${guardBody} AND routine.prorettype=2279 AND routine.pronargs=0 AND routine.prokind='f'
          AND routine.provolatile='v' AND NOT routine.prosecdef
          AND routine.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
          AND routine.proconfig=ARRAY['search_path=pg_catalog, learner_authority']::text[]
      ) AS valid_guard
    FROM pg_catalog.unnest(${required}::pg_catalog.text[]) AS required(name)
    JOIN pg_catalog.pg_class AS relation ON relation.oid=pg_catalog.to_regclass(required.name)
  `;
  if(rows.length!==required.length||rows.some(row=>row.relkind!=='r'||row.relpersistence!=='p'||row.rls||!row.valid_guard)){
    throw new LearnerAuthorityError('learner-authority-schema-unavailable');
  }
  const ownerGuards=await sql<Array<{name:string;valid:boolean}>>`SELECT relation.relname::text AS name,
    trigger.tgenabled='A' AND trigger.tgtype=29 AND trigger.tgqual IS NULL AND trigger.tgnargs=0
      AND routine.prosrc=${ownedGuardBody} AND routine.prorettype=2279 AND routine.pronargs=0 AND routine.prokind='f'
      AND routine.provolatile='v' AND NOT routine.prosecdef
      AND routine.pronamespace=pg_catalog.to_regnamespace('learner_authority') AND routine.proname='guard_owned_row'
      AND routine.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
      AND routine.proconfig=ARRAY['search_path=pg_catalog, learner_authority']::text[] AS valid
    FROM pg_catalog.pg_class relation JOIN pg_catalog.pg_trigger trigger ON trigger.tgrelid=relation.oid
    JOIN pg_catalog.pg_proc routine ON routine.oid=trigger.tgfoid
    WHERE relation.relnamespace=pg_catalog.to_regnamespace('learner_authority') AND relation.relname=ANY(${[...ownedTables]}::text[])
      AND trigger.tgname='learner_authority_owned_guard' AND NOT trigger.tgisinternal`;
  if(ownerGuards.length!==ownedTables.length||ownerGuards.some(row=>row.valid!==true))throw new LearnerAuthorityError('learner-authority-schema-unavailable');
  const controlGuards=await sql<Array<{valid:boolean}>>`SELECT trigger.tgenabled='A' AND trigger.tgtype=17 AND trigger.tgqual IS NULL AND trigger.tgnargs=0
    AND routine.prosrc=${controlGuardBody} AND routine.prorettype=2279 AND routine.pronargs=0 AND routine.prokind='f'
    AND routine.provolatile='v' AND NOT routine.prosecdef AND routine.pronamespace=pg_catalog.to_regnamespace('learner_authority')
    AND routine.proname='guard_control_row' AND routine.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
    AND routine.proconfig=ARRAY['search_path=pg_catalog, learner_authority']::text[] AS valid
    FROM pg_catalog.pg_trigger trigger JOIN pg_catalog.pg_proc routine ON routine.oid=trigger.tgfoid
    WHERE trigger.tgrelid='learner_authority.control'::regclass AND trigger.tgname='learner_authority_control_guard' AND NOT trigger.tgisinternal`;
  if(controlGuards.length!==1||controlGuards[0].valid!==true)throw new LearnerAuthorityError('learner-authority-schema-unavailable');
  await assertAuthorityStructure(sql);
  const control=await sql<Array<{contract:string;anchor_matches:boolean}>>`SELECT contract,
    installation_id=(SELECT learner_authority_installation FROM public.app_state WHERE id='primary') AS anchor_matches
    FROM learner_authority.control WHERE id='primary'`;
  if(control.length!==1||control[0].contract!==learnerAuthorityContract||control[0].anchor_matches!==true)throw new LearnerAuthorityError('learner-authority-schema-unavailable');
}

export async function installLearnerAuthoritySchema(client: postgres.Sql, initialize?: (sql:postgres.TransactionSql)=>Promise<void>): Promise<void> {
  await client.begin(async tx=>{
    await tx`SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(${learnerAuthorityStorageLock},0))`;
    if(await hasAuthorityInstallation(tx)){await lockLearnerAuthority(tx,'exclusive');await assertLearnerAuthoritySchema(tx);await initialize?.(tx);return;}
    await tx`SELECT pg_catalog.set_config(${participantSetting},${learnerAuthorityContract},true),pg_catalog.set_config('mais.learner_authority_mode','exclusive',true)`;
    await tx`SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(${learnerAuthorityMaintenanceLock},0))`;
    // First installation must drain an old hot writer before taking DDL locks:
    // old binaries know the activity lock, but do not know the new admission.
    // The exclusive storage lock already prevents all adapted new admissions.
    await tx`SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mais:student-activity',0))`;
    const installationId=randomUUID();
    // Catalog migration only: preserve the already-attested legacy payload and
    // revision. A DML UPDATE would legitimately invalidate its readiness marker.
    await tx.unsafe(`ALTER TABLE public.app_state ADD COLUMN learner_authority_installation uuid DEFAULT '${installationId}'::uuid`);
    await tx`ALTER TABLE public.app_state ALTER COLUMN learner_authority_installation DROP DEFAULT`;
    await tx`CREATE SCHEMA learner_authority`;
    await tx`CREATE TABLE learner_authority.publications(
      id uuid PRIMARY KEY,content jsonb NOT NULL CHECK(jsonb_typeof(content)='object'),created_at timestamptz NOT NULL DEFAULT clock_timestamp())`;
    await tx`CREATE TABLE learner_authority.control(
      id text COLLATE "C" PRIMARY KEY CHECK(id='primary'),contract text COLLATE "C" NOT NULL,installation_id uuid NOT NULL,
      publication_id uuid REFERENCES learner_authority.publications(id),
      content_epoch bigint NOT NULL DEFAULT 0 CHECK(content_epoch BETWEEN 0 AND 9007199254740991),
      definition_epoch bigint NOT NULL DEFAULT 0 CHECK(definition_epoch BETWEEN 0 AND 9007199254740991),
      attested_epoch bigint CHECK(attested_epoch BETWEEN 0 AND 9007199254740991),
      shared_payload jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(shared_payload)='object'),
      state_revision bigint,mode text COLLATE "C" NOT NULL DEFAULT 'compatibility' CHECK(mode IN ('authoritative','compatibility','frozen')))`;
    await tx`INSERT INTO learner_authority.control(id,contract,installation_id) VALUES('primary',${learnerAuthorityContract},${installationId}::uuid)`;
    await tx`CREATE TABLE learner_authority.accounts(
      user_id text COLLATE "C" PRIMARY KEY,generation uuid NOT NULL,
      mode text COLLATE "C" NOT NULL CHECK(mode IN ('legacy','authoritative','compatibility','frozen','erased')),
      account_identity jsonb NOT NULL,UNIQUE(user_id,generation))`;
    await tx`CREATE TABLE learner_authority.states(
      user_id text COLLATE "C" NOT NULL,generation uuid NOT NULL,
      revision bigint NOT NULL CHECK(revision BETWEEN 0 AND 9007199254740991),
      reset_epoch bigint NOT NULL DEFAULT 0 CHECK(reset_epoch BETWEEN 0 AND 9007199254740991),
      payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
      PRIMARY KEY(user_id,generation),FOREIGN KEY(user_id,generation) REFERENCES learner_authority.accounts(user_id,generation))`;
    await tx`CREATE TABLE learner_authority.claims(
      component text COLLATE "C" NOT NULL,owner text COLLATE "C" NOT NULL,generation uuid NOT NULL,
      slot integer NOT NULL CHECK(slot>=0),id_key text COLLATE "C",source_key text COLLATE "C",record jsonb NOT NULL,
      PRIMARY KEY(component,owner,generation,slot))`;
    await tx`CREATE INDEX learner_authority_claim_id ON learner_authority.claims(component,id_key)`;
    await tx`CREATE INDEX learner_authority_claim_source ON learner_authority.claims(source_key) WHERE component='reward_point_ledger'`;
    await tx`CREATE TABLE learner_authority.receipts(
      user_id text COLLATE "C" NOT NULL,generation uuid NOT NULL,operation_id text COLLATE "C" NOT NULL,
      session_revision bigint NOT NULL,reset_epoch bigint NOT NULL,request jsonb NOT NULL,result jsonb NOT NULL,
      previous_revision bigint NOT NULL,revision bigint NOT NULL,committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      PRIMARY KEY(user_id,generation,operation_id))`;
    await tx`CREATE TABLE learner_authority.journal(
      user_id text COLLATE "C" NOT NULL,generation uuid NOT NULL,revision bigint NOT NULL,
      operation_id text COLLATE "C" NOT NULL,kind text COLLATE "C" NOT NULL,payload jsonb,
      PRIMARY KEY(user_id,generation,revision))`;
    await tx`CREATE TABLE learner_authority.invalidations(
      user_id text COLLATE "C" NOT NULL,generation uuid NOT NULL,revision bigint NOT NULL,
      PRIMARY KEY(user_id,generation))`;
    await tx`CREATE TABLE learner_authority.deletions(
      user_id text COLLATE "C" NOT NULL,generation uuid NOT NULL,deleted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      PRIMARY KEY(user_id,generation))`;
    await tx.unsafe(`CREATE FUNCTION learner_authority.guard_write() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,learner_authority AS $guard$${guardBody}$guard$`);
    await tx.unsafe(`CREATE FUNCTION learner_authority.guard_owned_row() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,learner_authority AS $guard$${ownedGuardBody}$guard$`);
    await tx.unsafe(`CREATE FUNCTION learner_authority.guard_control_row() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,learner_authority AS $guard$${controlGuardBody}$guard$`);
    await tx`CREATE TRIGGER learner_authority_control_guard AFTER UPDATE ON learner_authority.control FOR EACH ROW EXECUTE FUNCTION learner_authority.guard_control_row()`;
    await tx`ALTER TABLE learner_authority.control ENABLE ALWAYS TRIGGER learner_authority_control_guard`;
    for(const relation of [...tables.map(name=>`learner_authority.${name}`),...[...sourceTables,...hotTables].map(name=>`public.${name}`)]){
      await tx.unsafe(`CREATE TRIGGER ${guardName} BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON ${relation} FOR EACH STATEMENT EXECUTE FUNCTION learner_authority.guard_write()`);
      await tx.unsafe(`ALTER TABLE ${relation} ENABLE ALWAYS TRIGGER ${guardName}`);
    }
    for(const table of ownedTables){
      await tx.unsafe(`CREATE TRIGGER learner_authority_owned_guard AFTER INSERT OR UPDATE OR DELETE ON learner_authority.${table} FOR EACH ROW EXECUTE FUNCTION learner_authority.guard_owned_row()`);
      await tx.unsafe(`ALTER TABLE learner_authority.${table} ENABLE ALWAYS TRIGGER learner_authority_owned_guard`);
    }
    await assertLearnerAuthoritySchema(tx);
    await initialize?.(tx);
  });
}

async function requireMaintenance(sql:AuthoritySql){
  const rows=await sql<Array<{allowed:boolean}>>`SELECT current_setting(${participantSetting},true)=${learnerAuthorityContract}
    AND current_setting('mais.learner_authority_mode',true)='exclusive' AS allowed`;
  if(rows[0]?.allowed!==true)throw new LearnerAuthorityError('learner-authority-maintenance-required');
}

export async function learnerAuthorityPublicationMatches(sql:AuthoritySql,id:string,content:unknown):Promise<boolean>{
  const rows=await sql<Array<{matches:boolean}>>`SELECT content=${JSON.stringify(content)}::pg_catalog.text::pg_catalog.jsonb AS matches
    FROM learner_authority.publications WHERE id=${id}::uuid`;
  return rows.length===1&&rows[0]?.matches===true;
}

/** Publish a new immutable version only from the exclusive, verified source transaction. */
export async function publishLearnerAuthorityContent(sql:AuthoritySql,content:unknown):Promise<string>{
  await requireMaintenance(sql);
  const rows=await sql<Array<{publication_id:string|null}>>`SELECT publication_id FROM learner_authority.control WHERE id='primary' FOR UPDATE`;
  if(rows.length!==1)throw new LearnerAuthorityError('learner-authority-schema-unavailable');
  const existing=rows[0].publication_id;
  if(existing){
    if(await learnerAuthorityPublicationMatches(sql,existing,content))return existing;
    const [permission]=await sql<Array<{allowed:boolean}>>`SELECT current_setting('mais.learner_authority_sealing',true)='true' AS allowed`;
    if(permission?.allowed!==true)throw new LearnerAuthorityError('learner-authority-source-version-mismatch');
  }
  const id=randomUUID();
  const inserted=await sql<Array<{id:string}>>`INSERT INTO learner_authority.publications(id,content) VALUES(${id}::uuid,${JSON.stringify(content)}::pg_catalog.text::pg_catalog.jsonb) RETURNING id`;
  if(inserted.length!==1||inserted[0].id!==id||!await learnerAuthorityPublicationMatches(sql,id,content))throw new LearnerAuthorityError('authority-publication-write-failed');
  await sql`UPDATE learner_authority.control SET publication_id=${id}::uuid,attested_epoch=NULL WHERE id='primary'`;
  return id;
}
