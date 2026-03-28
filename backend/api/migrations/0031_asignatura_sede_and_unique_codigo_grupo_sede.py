from django.db import migrations, models


def backfill_asignatura_sede(apps, schema_editor):
    Asignatura = apps.get_model('api', 'Asignatura')
    Asignatura.objects.filter(sede__isnull=True).update(sede='PRINCIPAL')
    Asignatura.objects.filter(sede='').update(sede='PRINCIPAL')


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0030_asignatura_grupo_required_creditos'),
    ]

    operations = [
        migrations.AddField(
            model_name='asignatura',
            name='sede',
            field=models.CharField(default='PRINCIPAL', max_length=80),
            preserve_default=False,
        ),
        migrations.RunPython(backfill_asignatura_sede, migrations.RunPython.noop),
        migrations.RemoveConstraint(
            model_name='asignatura',
            name='uq_asignatura_codigo_grupo',
        ),
        migrations.AddConstraint(
            model_name='asignatura',
            constraint=models.UniqueConstraint(fields=('codigo_asignatura', 'grupo', 'sede'), name='uq_asignatura_codigo_grupo_sede'),
        ),
    ]
