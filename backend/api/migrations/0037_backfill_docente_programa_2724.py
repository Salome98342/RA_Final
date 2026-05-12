from django.db import migrations


def forwards(apps, schema_editor):
    Docente = apps.get_model('api', 'Docente')
    Programa = apps.get_model('api', 'Programa')

    programa_2724 = Programa.objects.filter(codigo_programa='2724').first()
    if not programa_2724:
        return

    Docente.objects.filter(codigo_docente='1113783123', programa__isnull=True).update(programa=programa_2724)


def backwards(apps, schema_editor):
    Docente = apps.get_model('api', 'Docente')
    Docente.objects.filter(codigo_docente='1113783123').update(programa=None)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0036_remove_actividad_chk_act_pct_docente_programa'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]