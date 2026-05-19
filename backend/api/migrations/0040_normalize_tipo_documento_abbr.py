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


def _compact(value):
    return _normalize_text(value).replace(" ", "").replace(".", "")


CANONICAL = {
    "cc": "C.C.",
    "ti": "T.I.",
    "cr": "C.R.",
}

ALIASES = {
    "cc": [
        "cc",
        "c.c",
        "c.c.",
        "cedula de ciudadania",
        "cedula ciudadania",
        "cedula",
    ],
    "ti": [
        "ti",
        "t.i",
        "t.i.",
        "tarjeta de identidad",
        "tarjeta identidad",
    ],
    "cr": [
        "cr",
        "c.r",
        "c.r.",
        "rc",
        "registro civil",
    ],
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


def normalize_tipo_documento_abbr(apps, schema_editor):
    TipoDocumento = apps.get_model("api", "TipoDocumento")
    Docente = apps.get_model("api", "Docente")
    Estudiante = apps.get_model("api", "Estudiante")

    rows = list(TipoDocumento.objects.all().order_by("id_tipo_documento"))

    by_compact = {}
    for row in rows:
        key = _compact(getattr(row, "descripcion", ""))
        by_compact.setdefault(key, []).append(row)

    for canonical_key, canonical_label in CANONICAL.items():
        alias_compacts = {_compact(x) for x in ALIASES.get(canonical_key, [])}
        alias_compacts.add(_compact(canonical_label))

        matches = []
        for key in alias_compacts:
            matches.extend(by_compact.get(key, []))

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
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0039_add_numero_ra_field"),
    ]

    operations = [
        migrations.RunPython(normalize_tipo_documento_abbr, reverse_noop),
    ]
