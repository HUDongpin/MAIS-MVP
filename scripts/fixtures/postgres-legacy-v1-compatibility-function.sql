DECLARE
  class_enrollments_changed BOOLEAN := TRUE;
  old_state_payload JSONB := '{}'::jsonb;
  new_state_payload JSONB;
  teacher_classes_changed BOOLEAN := TRUE;
  policies_changed BOOLEAN := TRUE;
  tutor_messages_changed BOOLEAN := TRUE;
  tutor_usage_changed BOOLEAN := TRUE;
BEGIN
  IF NEW.id <> 'primary' THEN
    RETURN NEW;
  END IF;

  new_state_payload := CASE
    WHEN jsonb_typeof(NEW.payload) = 'string' THEN (NEW.payload #>> '{}')::jsonb
    ELSE NEW.payload
  END;
  IF jsonb_typeof(new_state_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Primary app state payload must be a JSON object.'
      USING ERRCODE = '22023';
  END IF;
  NEW.payload := new_state_payload;

  IF TG_OP = 'UPDATE' THEN
    old_state_payload := CASE
      WHEN jsonb_typeof(OLD.payload) = 'string' THEN (OLD.payload #>> '{}')::jsonb
      ELSE OLD.payload
    END;
    class_enrollments_changed := old_state_payload->'class_enrollments'
      IS DISTINCT FROM new_state_payload->'class_enrollments';
    teacher_classes_changed := old_state_payload->'teacher_classes'
      IS DISTINCT FROM new_state_payload->'teacher_classes';
    policies_changed := old_state_payload->'class_ai_tutor_policies'
      IS DISTINCT FROM new_state_payload->'class_ai_tutor_policies';
    tutor_messages_changed := old_state_payload->'ai_tutor_messages'
      IS DISTINCT FROM new_state_payload->'ai_tutor_messages';
    tutor_usage_changed := old_state_payload->'ai_tutor_usage'
      IS DISTINCT FROM new_state_payload->'ai_tutor_usage';
  END IF;

  IF teacher_classes_changed THEN
    WITH normalized_classes AS (
      SELECT DISTINCT ON (class_record->>'id')
        class_record->>'id' AS id,
        class_record->>'teacher_id' AS teacher_id,
        NULLIF(class_record->>'school_id', '') AS school_id,
        class_record->>'grade' AS grade,
        class_record->>'updated_at' AS updated_at,
        class_record
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(new_state_payload->'teacher_classes') = 'array'
          THEN new_state_payload->'teacher_classes' ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS class_items(class_record, ordinality)
      WHERE COALESCE(class_record->>'id', '') <> ''
        AND COALESCE(class_record->>'teacher_id', '') <> ''
        AND COALESCE(class_record->>'grade', '') <> ''
        AND COALESCE(class_record->>'updated_at', '') <> ''
      ORDER BY class_record->>'id', ordinality DESC
    )
    INSERT INTO projection_teacher_classes (id, teacher_id, school_id, grade, updated_at, record)
    SELECT id, teacher_id, school_id, grade, updated_at, class_record
    FROM normalized_classes
    ON CONFLICT (id) DO UPDATE SET
      teacher_id = excluded.teacher_id,
      school_id = excluded.school_id,
      grade = excluded.grade,
      updated_at = excluded.updated_at,
      record = excluded.record;

    DELETE FROM projection_teacher_classes AS teacher_class
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(new_state_payload->'teacher_classes') = 'array'
          THEN new_state_payload->'teacher_classes' ELSE '[]'::jsonb END
      ) AS class_items(class_record)
      WHERE class_record->>'id' = teacher_class.id
        AND COALESCE(class_record->>'teacher_id', '') <> ''
        AND COALESCE(class_record->>'grade', '') <> ''
        AND COALESCE(class_record->>'updated_at', '') <> ''
    );
  END IF;

  IF class_enrollments_changed THEN
    WITH normalized_enrollments AS (
      SELECT DISTINCT ON (enrollment_record->>'id')
        enrollment_record->>'id' AS id,
        enrollment_record->>'class_id' AS class_id,
        enrollment_record->>'student_id' AS student_id,
        enrollment_record
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(new_state_payload->'class_enrollments') = 'array'
          THEN new_state_payload->'class_enrollments' ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS enrollment_items(enrollment_record, ordinality)
      WHERE COALESCE(enrollment_record->>'id', '') <> ''
        AND COALESCE(enrollment_record->>'class_id', '') <> ''
        AND COALESCE(enrollment_record->>'student_id', '') <> ''
      ORDER BY enrollment_record->>'id', ordinality DESC
    )
    INSERT INTO projection_class_enrollments (id, class_id, student_id, record)
    SELECT id, class_id, student_id, enrollment_record
    FROM normalized_enrollments
    ON CONFLICT (id) DO UPDATE SET
      class_id = excluded.class_id,
      student_id = excluded.student_id,
      record = excluded.record;

    DELETE FROM projection_class_enrollments AS enrollment
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(new_state_payload->'class_enrollments') = 'array'
          THEN new_state_payload->'class_enrollments' ELSE '[]'::jsonb END
      ) AS enrollment_items(enrollment_record)
      WHERE enrollment_record->>'id' = enrollment.id
        AND COALESCE(enrollment_record->>'class_id', '') <> ''
        AND COALESCE(enrollment_record->>'student_id', '') <> ''
    );
  END IF;

  IF policies_changed THEN
    WITH normalized_policies AS (
      SELECT DISTINCT ON (policy_record->>'class_id')
        policy_record->>'class_id' AS class_id,
        policy_record
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(new_state_payload->'class_ai_tutor_policies') = 'array'
          THEN new_state_payload->'class_ai_tutor_policies' ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS policy_items(policy_record, ordinality)
      WHERE COALESCE(policy_record->>'class_id', '') <> ''
      ORDER BY policy_record->>'class_id', ordinality DESC
    )
    INSERT INTO projection_class_ai_tutor_policies (class_id, record)
    SELECT class_id, policy_record
    FROM normalized_policies
    ON CONFLICT (class_id) DO UPDATE SET record = excluded.record;

    DELETE FROM projection_class_ai_tutor_policies AS policy
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(new_state_payload->'class_ai_tutor_policies') = 'array'
          THEN new_state_payload->'class_ai_tutor_policies' ELSE '[]'::jsonb END
      ) AS policy_items(policy_record)
      WHERE policy_record->>'class_id' = policy.class_id
    );
  END IF;

  IF tutor_messages_changed THEN
    INSERT INTO projection_ai_tutor_messages (id, user_id, created_at, record)
    SELECT id, user_id, created_at, message_record
    FROM (
      SELECT DISTINCT ON (message_record->>'id')
        message_record->>'id' AS id,
        message_record->>'user_id' AS user_id,
        message_record->>'created_at' AS created_at,
        message_record,
        ordinality
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(new_state_payload->'ai_tutor_messages') = 'array'
          THEN new_state_payload->'ai_tutor_messages' ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS message_items(message_record, ordinality)
      WHERE COALESCE(message_record->>'id', '') <> ''
        AND COALESCE(message_record->>'user_id', '') <> ''
        AND COALESCE(message_record->>'created_at', '') <> ''
      ORDER BY message_record->>'id', ordinality DESC
    ) AS normalized_messages
    ON CONFLICT (id) DO UPDATE SET
      user_id = excluded.user_id,
      created_at = excluded.created_at,
      record = excluded.record;

    DELETE FROM projection_ai_tutor_messages AS projected_message
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(new_state_payload->'ai_tutor_messages') = 'array'
          THEN new_state_payload->'ai_tutor_messages' ELSE '[]'::jsonb END
      ) AS message_items(message_record)
      WHERE message_record->>'id' = projected_message.id
        AND COALESCE(message_record->>'user_id', '') <> ''
        AND COALESCE(message_record->>'created_at', '') <> ''
    );

    INSERT INTO ai_tutor_message_journal (id, user_id, created_at, record)
    SELECT
      message_record->>'id',
      message_record->>'user_id',
      message_record->>'created_at',
      message_record
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(new_state_payload->'ai_tutor_messages') = 'array'
        THEN new_state_payload->'ai_tutor_messages' ELSE '[]'::jsonb END
    ) AS message_items(message_record)
    WHERE COALESCE(message_record->>'id', '') <> ''
      AND COALESCE(message_record->>'user_id', '') <> ''
      AND COALESCE(message_record->>'created_at', '') <> ''
    ON CONFLICT (id) DO NOTHING;

    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(new_state_payload->'ai_tutor_messages') = 'array'
          THEN new_state_payload->'ai_tutor_messages' ELSE '[]'::jsonb END
      ) AS message_items(message_record)
      JOIN ai_tutor_message_journal AS journal
        ON journal.id = message_record->>'id'
      WHERE journal.user_id IS DISTINCT FROM message_record->>'user_id'
        OR journal.created_at IS DISTINCT FROM message_record->>'created_at'
        OR journal.record IS DISTINCT FROM message_record
    ) THEN
      RAISE EXCEPTION 'AI Tutor message journal conflict during legacy compatibility sync.'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  IF tutor_usage_changed THEN
    INSERT INTO ai_tutor_usage_journal (id, user_id, created_at, accounted_tokens, record)
    SELECT
      usage_record->>'id',
      usage_record->>'user_id',
      usage_record->>'created_at',
      CASE WHEN jsonb_typeof(usage_record->'total_tokens') = 'number'
        THEN (usage_record->>'total_tokens')::double precision
        ELSE
          CASE WHEN jsonb_typeof(usage_record->'prompt_tokens') = 'number'
            THEN (usage_record->>'prompt_tokens')::double precision ELSE 0 END
          + CASE WHEN jsonb_typeof(usage_record->'completion_tokens') = 'number'
            THEN (usage_record->>'completion_tokens')::double precision ELSE 0 END
      END,
      usage_record
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(new_state_payload->'ai_tutor_usage') = 'array'
        THEN new_state_payload->'ai_tutor_usage' ELSE '[]'::jsonb END
    ) AS usage_items(usage_record)
    WHERE COALESCE(usage_record->>'id', '') <> ''
      AND COALESCE(usage_record->>'user_id', '') <> ''
      AND COALESCE(usage_record->>'created_at', '') <> ''
    ON CONFLICT (id) DO NOTHING;

    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(new_state_payload->'ai_tutor_usage') = 'array'
          THEN new_state_payload->'ai_tutor_usage' ELSE '[]'::jsonb END
      ) AS usage_items(usage_record)
      JOIN ai_tutor_usage_journal AS journal
        ON journal.id = usage_record->>'id'
      WHERE journal.user_id IS DISTINCT FROM usage_record->>'user_id'
        OR journal.created_at IS DISTINCT FROM usage_record->>'created_at'
        OR journal.accounted_tokens IS DISTINCT FROM (
          CASE WHEN jsonb_typeof(usage_record->'total_tokens') = 'number'
            THEN (usage_record->>'total_tokens')::double precision
            ELSE
              CASE WHEN jsonb_typeof(usage_record->'prompt_tokens') = 'number'
                THEN (usage_record->>'prompt_tokens')::double precision ELSE 0 END
              + CASE WHEN jsonb_typeof(usage_record->'completion_tokens') = 'number'
                THEN (usage_record->>'completion_tokens')::double precision ELSE 0 END
          END
        )
        OR journal.record IS DISTINCT FROM usage_record
    ) THEN
      RAISE EXCEPTION 'AI Tutor usage journal conflict during legacy compatibility sync.'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
