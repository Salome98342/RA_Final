from django.db import migrations


SQL_DROP_TRIGGERS = r'''
-- Drop trigger and function enforcing sum of actividad porcentaje per RA (if exist)
DO $$
BEGIN
  -- Drop trigger on ra_actividad
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'ra_actividad'::regclass AND tgname = 'trg_check_sum_acts_por_ra'
  ) THEN
    DROP TRIGGER IF EXISTS trg_check_sum_acts_por_ra ON ra_actividad;
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

DO $$
BEGIN
  -- Drop function variants if present
  PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname IN ('check_sum_acts_por_ra', 'trg_check_sum_acts_por_ra') AND n.nspname = 'public';
  IF FOUND THEN
    -- Attempt to drop both possible function names
    DROP FUNCTION IF EXISTS public.check_sum_acts_por_ra() CASCADE;
    DROP FUNCTION IF EXISTS public.trg_check_sum_acts_por_ra() CASCADE;
  END IF;
EXCEPTION WHEN undefined_function THEN
  NULL;
END $$;
'''


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0012_force_drop_legacy_triggers_and_recreate"),
    ]

    operations = [
        migrations.RunSQL(SQL_DROP_TRIGGERS, reverse_sql=""),
        # En algunos entornos el constraint pudo no existir o tener otro nombre;
        # usamos SQL defensivo para intentarlo sin fallar la migración si no está.
        migrations.RunSQL(
            sql=r'''
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'actividad'
      AND n.nspname = 'public'
      AND c.conname = 'chk_act_pct'
  ) THEN
    ALTER TABLE public.actividad DROP CONSTRAINT IF EXISTS chk_act_pct;
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;
''',
            reverse_sql="",
        ),
        migrations.RemoveField(
            model_name="actividad",
            name="porcentaje_actividad",
        ),
    ]
