from django.db import migrations

SQL = r'''
-- Force drop any legacy triggers on ra_actividad related to sum_acts_por_ra
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT tgname FROM pg_trigger
    WHERE tgrelid = 'ra_actividad'::regclass
      AND tgname ILIKE '%sum_acts_por_ra%'
  ) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON ra_actividad', r.tgname);
  END LOOP;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- Drop legacy functions with CASCADE to remove dependent triggers
DO $$ BEGIN
  PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname = 'trg_check_sum_acts_por_ra' AND n.nspname = 'public';
  IF FOUND THEN
    DROP FUNCTION public.trg_check_sum_acts_por_ra() CASCADE;
  END IF;
EXCEPTION WHEN undefined_function THEN
  NULL;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname = 'check_sum_acts_por_ra' AND n.nspname = 'public';
  IF FOUND THEN
    DROP FUNCTION public.check_sum_acts_por_ra() CASCADE;
  END IF;
EXCEPTION WHEN undefined_function THEN
  NULL;
END $$;

-- Recreate relaxed function and trigger with correct id_ra column
CREATE OR REPLACE FUNCTION public.check_sum_acts_por_ra()
RETURNS trigger AS $$
DECLARE
  total numeric := 0;
  pa_new numeric := 0;
  pa_old numeric := 0;
  v_ra_id bigint := COALESCE(NEW.id_ra, OLD.id_ra);
BEGIN
  SELECT COALESCE(SUM(a.porcentaje_actividad), 0)
    INTO total
  FROM ra_actividad r
  JOIN actividad a ON a.id_actividad = r.id_actividad
  WHERE r.id_ra = v_ra_id;

  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(porcentaje_actividad, 0) INTO pa_new FROM actividad WHERE id_actividad = NEW.id_actividad;
    total := total + pa_new;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.id_actividad IS DISTINCT FROM OLD.id_actividad THEN
      SELECT COALESCE(porcentaje_actividad, 0) INTO pa_new FROM actividad WHERE id_actividad = NEW.id_actividad;
      SELECT COALESCE(porcentaje_actividad, 0) INTO pa_old FROM actividad WHERE id_actividad = OLD.id_actividad;
      total := total - pa_old + pa_new;
    END IF;
  END IF;

  IF total > 100.000001 THEN
    RAISE EXCEPTION 'Las actividades del RA % suman %%%, no pueden exceder 100', v_ra_id, total;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_sum_acts_por_ra
AFTER INSERT OR UPDATE ON ra_actividad
FOR EACH ROW
EXECUTE FUNCTION public.check_sum_acts_por_ra();
'''


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0011_cleanup_legacy_exact100_trigger"),
    ]

    operations = [
        migrations.RunSQL(SQL, reverse_sql=""),
    ]
