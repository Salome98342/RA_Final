from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ("api", "0002_actividad_docente_estudiante_programa_tipoactividad_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            """
            -- Solo PostgreSQL
            DO $$
            DECLARE
                pk_name text;
                has_id boolean;
                has_pk boolean;
                has_unique boolean;
            BEGIN
                -- 1) Drop PK actual si existe (sin asumir nombre)
                SELECT c.conname
                  INTO pk_name
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                WHERE c.contype = 'p' AND t.relname = 'notas_actividad';
                IF pk_name IS NOT NULL THEN
                    EXECUTE format('ALTER TABLE notas_actividad DROP CONSTRAINT %I', pk_name);
                END IF;

                -- 2) Añadir columna id si no existe
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'notas_actividad' AND column_name = 'id'
                ) INTO has_id;
                IF NOT has_id THEN
                    ALTER TABLE notas_actividad ADD COLUMN id BIGSERIAL;
                END IF;

                -- 3) Crear PK en id si aún no hay PK
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_constraint c
                    JOIN pg_class t ON t.oid = c.conrelid
                    WHERE c.contype = 'p' AND t.relname = 'notas_actividad'
                ) INTO has_pk;
                IF NOT has_pk THEN
                    ALTER TABLE notas_actividad ADD CONSTRAINT notas_actividad_pkey PRIMARY KEY (id);
                END IF;

                -- 4) Unique compuesto si no existe
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'uq_notas_actividad'
                ) INTO has_unique;
                IF NOT has_unique THEN
                    ALTER TABLE notas_actividad
                    ADD CONSTRAINT uq_notas_actividad UNIQUE (id_matricula, id_ra_actividad);
                END IF;
            END $$;
            """,
            """
            -- Reverso: vuelve a PK compuesta (opcional)
            DO $$
            DECLARE
                pk_name text;
            BEGIN
                -- Drop UNIQUE si existe
                IF EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'uq_notas_actividad'
                ) THEN
                    ALTER TABLE notas_actividad DROP CONSTRAINT uq_notas_actividad;
                END IF;

                -- Drop PK en id si existe
                SELECT c.conname
                  INTO pk_name
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                WHERE c.contype = 'p' AND t.relname = 'notas_actividad';
                IF pk_name IS NOT NULL THEN
                    EXECUTE format('ALTER TABLE notas_actividad DROP CONSTRAINT %I', pk_name);
                END IF;

                -- Restaurar PK compuesta
                ALTER TABLE notas_actividad
                ADD CONSTRAINT pk_notas_actividad PRIMARY KEY (id_matricula, id_ra_actividad);

                -- Quitar columna id si existe
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'notas_actividad' AND column_name = 'id'
                ) THEN
                    ALTER TABLE notas_actividad DROP COLUMN id;
                END IF;
            END $$;
            """,
        ),
    ]