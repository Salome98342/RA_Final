from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0031_asignatura_sede_and_unique_codigo_grupo_sede'),
    ]

    operations = [
        migrations.AddField(
            model_name='asignatura',
            name='periodo',
            field=models.ForeignKey(blank=True, db_column='id_periodo', null=True, on_delete=models.RESTRICT, to='api.periodoacademico'),
        ),
        migrations.RemoveConstraint(
            model_name='asignatura',
            name='uq_asignatura_codigo_grupo_sede',
        ),
        migrations.AddConstraint(
            model_name='asignatura',
            constraint=models.UniqueConstraint(fields=('codigo_asignatura', 'grupo', 'sede', 'periodo'), name='uq_asignatura_codigo_grupo_sede_periodo'),
        ),
    ]
