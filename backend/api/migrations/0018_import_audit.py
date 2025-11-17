from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0018_importaudit_remove_actividad_chk_act_pct_and_more"),
    ]

    operations = [
        migrations.RunSQL(sql="SELECT 1;", reverse_sql="SELECT 1;"),
    ]
