from django.db import migrations

RELAX_TRIGGER_SQL = r'''
-- Drop existing trigger/function if they enforce EXACT 100
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_sum_acts_por_ra'
  ) THEN
    DROP TRIGGER IF EXISTS trg_check_sum_acts_por_ra ON ra_actividad;
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- Table may not exist yet in some environments
  NULL;
END $$;

DO $$ BEGIN
  PERFORM 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'check_sum_acts_por_ra' AND n.nspname = 'public';
  IF FOUND THEN
    DROP FUNCTION public.check_sum_acts_por_ra();
  END IF;
EXCEPTION WHEN undefined_function THEN
  NULL;
END $$;

-- Create function that enforces total <= 100 instead of exactly 100
CREATE OR REPLACE FUNCTION public.check_sum_acts_por_ra()
RETURNS trigger AS $$
DECLARE
  total numeric := 0;
  pa_new numeric := 0;
  pa_old numeric := 0;
BEGIN
  -- Sum current total porcentaje_actividad for the RA
  SELECT COALESCE(SUM(a.porcentaje_actividad), 0)
    INTO total
  FROM ra_actividad r
  JOIN actividad a ON a.id_actividad = r.id_actividad
  WHERE r.ra_id = COALESCE(NEW.ra_id, OLD.ra_id);

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
    RAISE EXCEPTION 'Las actividades del RA % suman %%%, no pueden exceder 100', COALESCE(NEW.ra_id, OLD.ra_id), total;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create trigger
CREATE TRIGGER trg_check_sum_acts_por_ra
AFTER INSERT OR UPDATE ON ra_actividad
FOR EACH ROW
EXECUTE FUNCTION public.check_sum_acts_por_ra();
'''

class Migration(migrations.Migration):
    dependencies = [
        ("api", "0008_raactividadindicador"),
    ]

    operations = [
        migrations.RunSQL(RELAX_TRIGGER_SQL, reverse_sql=""),
    ]
