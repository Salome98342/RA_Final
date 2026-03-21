from django.db import migrations, models


def backfill_asignatura_grupo(apps, schema_editor):
    Asignatura = apps.get_model('api', 'Asignatura')
    Asignatura.objects.filter(grupo__isnull=True).update(grupo='SIN-GRUPO')
    Asignatura.objects.filter(grupo='').update(grupo='SIN-GRUPO')


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0029_normalize_tipo_documento_values'),
    ]

    operations = [
        migrations.RunPython(backfill_asignatura_grupo, migrations.RunPython.noop),
        migrations.AddField(
            model_name='asignatura',
            name='creditos',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='asignatura',
            name='codigo_asignatura',
            field=models.CharField(max_length=50),
        ),
        migrations.AlterField(
            model_name='asignatura',
            name='grupo',
            field=models.CharField(max_length=20),
        ),
        migrations.AddConstraint(
            model_name='asignatura',
            constraint=models.UniqueConstraint(fields=('codigo_asignatura', 'grupo'), name='uq_asignatura_codigo_grupo'),
        ),
    ]
