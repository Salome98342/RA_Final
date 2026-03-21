from django.db import migrations
import unicodedata


def _normalize_text(value):
    if value is None:
        return ""
    text = str(value).strip().lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = " ".join(text.split())
    return text


CANONICAL_LABELS = {
    "cedula de ciudadania": "Cedula de Ciudadania",
    "tarjeta de identidad": "Tarjeta de Identidad",
    "cedula de extranjeria": "Cedula de Extranjeria",
    "pasaporte": "Pasaporte",
    "registro civil": "Registro Civil",
    "nuip": "NUIP",
}

ALIASES = {
    "cedula de ciudadania": [
        "cedula de ciudadania",
        "cedula de ciudadania ",
        "cedula de ciudadania.",
        "cedula de ciudadania",
        "cedula de ciudadania",
        "cc",
        "c.c",
        "c.c.",
        "cedula",
    ],
    "tarjeta de identidad": [
        "tarjeta de identidad",
        "ti",
        "t.i",
        "t.i.",
        "tarjeta identidad",
    ],
    "cedula de extranjeria": [
        "cedula de extranjeria",
        "ce",
        "c.e",
        "c.e.",
    ],
    "pasaporte": ["pasaporte", "pas"],
    "registro civil": ["registro civil", "rc"],
    "nuip": ["nuip"],
}


def _dedupe_by_id(records):
    seen = set()
    unique = []
    for rec in records:
        pk = rec.pk
        if pk in seen:
            continue
        seen.add(pk)
        unique.append(rec)
    return unique


def normalize_tipo_documento_values(apps, schema_editor):
    TipoDocumento = apps.get_model("api", "TipoDocumento")
    Docente = apps.get_model("api", "Docente")
    Estudiante = apps.get_model("api", "Estudiante")

    rows = list(TipoDocumento.objects.all().order_by("id_tipo_documento"))

    by_norm = {}
    for row in rows:
        key = _normalize_text(getattr(row, "descripcion", ""))
        by_norm.setdefault(key, []).append(row)

    for canonical_norm, canonical_label in CANONICAL_LABELS.items():
        alias_keys = {_normalize_text(x) for x in ALIASES.get(canonical_norm, [])}
        alias_keys.add(canonical_norm)

        matches = []
        for key in alias_keys:
            matches.extend(by_norm.get(key, []))

        matches = _dedupe_by_id(matches)

        if matches:
            keeper = sorted(matches, key=lambda x: x.id_tipo_documento)[0]
        else:
            keeper = TipoDocumento.objects.create(descripcion=canonical_label)

        if keeper.descripcion != canonical_label:
            keeper.descripcion = canonical_label
            keeper.save(update_fields=["descripcion"])

        for duplicate in matches:
            if duplicate.id_tipo_documento == keeper.id_tipo_documento:
                continue
            Docente.objects.filter(tipo_documento_id=duplicate.id_tipo_documento).update(
                tipo_documento_id=keeper.id_tipo_documento
            )
            Estudiante.objects.filter(tipo_documento_id=duplicate.id_tipo_documento).update(
                tipo_documento_id=keeper.id_tipo_documento
            )
            duplicate.delete()


def reverse_noop(apps, schema_editor):
    # Migracion de datos irreversible de forma segura: no-op en reversa.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0028_rename_login_attem_usuario_e8c9e8_idx_login_attem_usuario_24160f_idx_and_more"),
    ]

    operations = [
        migrations.RunPython(normalize_tipo_documento_values, reverse_noop),
    ]
