from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0013_remove_peso_actividad"),
    ]

    operations = [
        migrations.CreateModel(
            name="Coordinador",
            fields=[
                ("id_coordinador", models.BigAutoField(primary_key=True, db_column="id_coordinador", serialize=False)),
                ("nombre", models.CharField(max_length=100)),
                ("codigo_coordinador", models.CharField(max_length=50, unique=True)),
                ("contrasenia_coord", models.CharField(max_length=255)),
                ("correo", models.EmailField(max_length=255, unique=True)),
            ],
            options={
                "db_table": "coordinador",
            },
        ),
        migrations.RunSQL(
            sql=(
                "INSERT INTO coordinador (nombre, codigo_coordinador, contrasenia_coord, correo)"
                " SELECT 'Ing. Mgr. David Ricardo Rodriguez Sarmiento', 'dir-2724-cai', 'hash_pwd_2724', 'direccion@university.edu'"
                " WHERE NOT EXISTS (SELECT 1 FROM coordinador WHERE codigo_coordinador = 'dir-2724-cai');"
            ),
            reverse_sql=(
                "DELETE FROM coordinador WHERE codigo_coordinador = 'dir-2724-cai';"
            ),
        ),
    ]
