from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ("api", "0006_recurso"),
    ]

    operations = [
        migrations.RunSQL(
            """
            DO $$
            DECLARE pk_name text; has_id boolean; has_pk boolean;
            BEGIN
              -- 1) Quitar PK compuesta si existe
              SELECT c.conname INTO pk_name
              FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
              WHERE c.contype='p' AND t.relname='notas_actividad';
              IF pk_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE notas_actividad DROP CONSTRAINT %I', pk_name);
              END IF;

              -- 2) Añadir columna id si no existe y ponerla como PK
              SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                 WHERE table_name='notas_actividad' AND column_name='id'
              ) INTO has_id;
              IF NOT has_id THEN
                ALTER TABLE notas_actividad ADD COLUMN id BIGSERIAL;
              END IF;

              SELECT EXISTS (
                SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
                WHERE c.contype='p' AND t.relname='notas_actividad'
              ) INTO has_pk;
              IF NOT has_pk THEN
                ALTER TABLE notas_actividad ADD CONSTRAINT notas_actividad_pkey PRIMARY KEY (id);
              END IF;

              -- 3) Unique (id_matricula, id_ra_actividad) si no existe
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname='uq_notas_actividad'
              ) THEN
                ALTER TABLE notas_actividad
                  ADD CONSTRAINT uq_notas_actividad UNIQUE (id_matricula, id_ra_actividad);
              END IF;

              -- 4) Asegurar columna id_ind existe y es NULLABLE
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                 WHERE table_name='notas_actividad' AND column_name='id_ind'
              ) THEN
                ALTER TABLE notas_actividad ADD COLUMN id_ind BIGINT NULL;
              END IF;
              ALTER TABLE notas_actividad ALTER COLUMN id_ind DROP NOT NULL;

              -- 5) FK a indicadores (ON DELETE SET NULL)
              -- Borrar FK previa si hay
              DO $inner$
              DECLARE fk_name text;
              BEGIN
                SELECT c.conname INTO fk_name
                FROM pg_constraint c
                JOIN pg_class t ON t.oid=c.conrelid
                WHERE c.contype='f' AND t.relname='notas_actividad'
                  AND pg_get_constraintdef(c.oid) LIKE '%REFERENCES indicadores_de_logro%';
                IF fk_name IS NOT NULL THEN
                  EXECUTE format('ALTER TABLE notas_actividad DROP CONSTRAINT %I', fk_name);
                END IF;
              END $inner$;

              ALTER TABLE notas_actividad
                ADD CONSTRAINT fk_notas_ind
                FOREIGN KEY (id_ind) REFERENCES indicadores_de_logro(id_ind)
                ON UPDATE CASCADE ON DELETE SET NULL;
            END $$;

            -- Reemplazar trigger de consistencia por versión que permite NULL
            DROP TRIGGER IF EXISTS notas_actividad_ind_ra_consistente ON notas_actividad;
            DROP FUNCTION IF EXISTS trg_notas_actividad_ind_ra_consistente();
            CREATE FUNCTION trg_notas_actividad_ind_ra_consistente()
            RETURNS trigger AS $$
            DECLARE ra_from_ra_act BIGINT; ra_from_ind BIGINT;
            BEGIN
              IF NEW.id_ind IS NULL THEN RETURN NEW; END IF;
              SELECT id_ra INTO ra_from_ra_act FROM ra_actividad WHERE id_ra_actividad = NEW.id_ra_actividad;
              SELECT id_ra INTO ra_from_ind    FROM indicadores_de_logro WHERE id_ind = NEW.id_ind;
              IF ra_from_ra_act IS NULL OR ra_from_ind IS NULL OR ra_from_ra_act <> ra_from_ind THEN
                RAISE EXCEPTION 'El indicador (%) no pertenece al mismo RA que ra_actividad (%)', NEW.id_ind, NEW.id_ra_actividad;
              END IF;
              RETURN NEW;
            END; $$ LANGUAGE plpgsql;

            CREATE TRIGGER notas_actividad_ind_ra_consistente
            BEFORE INSERT OR UPDATE ON notas_actividad
            FOR EACH ROW
            EXECUTE FUNCTION trg_notas_actividad_ind_ra_consistente();
            """,
            reverse_sql="""
            -- No-op (no revertimos a PK compuesta)
            """,
        ),
    ]