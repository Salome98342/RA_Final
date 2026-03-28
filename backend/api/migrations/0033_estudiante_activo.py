from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0032_asignatura_periodo_fk_unique_periodo'),
    ]

    operations = [
        migrations.AddField(
            model_name='estudiante',
            name='activo',
            field=models.BooleanField(db_index=True, default=True),
        ),
    ]
