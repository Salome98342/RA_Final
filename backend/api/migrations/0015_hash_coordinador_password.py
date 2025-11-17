from django.db import migrations
from django.contrib.auth.hashers import make_password, identify_hasher


def hash_coordinador_passwords(apps, schema_editor):
    Coordinador = apps.get_model("api", "Coordinador")
    for coord in Coordinador.objects.all():
        pwd = coord.contrasenia_coord or ""
        try:
            # If identify_hasher succeeds, it's already a hashed password
            identify_hasher(pwd)
        except Exception:
            # Not hashed (or empty) -> hash and save
            coord.contrasenia_coord = make_password(pwd)
            coord.save(update_fields=["contrasenia_coord"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0014_create_coordinador"),
    ]

    operations = [
        migrations.RunPython(hash_coordinador_passwords, reverse_code=migrations.RunPython.noop),
    ]
