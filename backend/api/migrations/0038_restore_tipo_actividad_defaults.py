from django.db import migrations


DEFAULT_TYPES = [
    (1, 'Examen'),
    (2, 'Quiz'),
    (3, 'Taller'),
    (4, 'Proyecto'),
    (5, 'Laboratorio'),
    (6, 'Práctica'),
    (7, 'Foro'),
    (8, 'Tarea'),
]


def forwards(apps, schema_editor):
    TipoActividad = apps.get_model('api', 'TipoActividad')
    db_alias = schema_editor.connection.alias

    for tipo_id, descripcion in DEFAULT_TYPES:
        TipoActividad.objects.using(db_alias).update_or_create(
            id_tipo_actividad=tipo_id,
            defaults={'descripcion': descripcion},
        )

    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute(
            "SELECT setval(pg_get_serial_sequence('tipo_actividad', 'id_tipo_actividad'), (SELECT COALESCE(MAX(id_tipo_actividad), 1) FROM tipo_actividad), true);"
        )


def backwards(apps, schema_editor):
    TipoActividad = apps.get_model('api', 'TipoActividad')
    db_alias = schema_editor.connection.alias
    TipoActividad.objects.using(db_alias).filter(id_tipo_actividad__in=[item[0] for item in DEFAULT_TYPES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0037_backfill_docente_programa_2724'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]