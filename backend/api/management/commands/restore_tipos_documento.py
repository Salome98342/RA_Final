from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Restore default TipoDocumento entries (idempotent).'

    def add_arguments(self, parser):
        parser.add_argument('--confirm', action='store_true', help='Actually create missing entries')

    def handle(self, *args, **options):
        try:
            from api.models.models import TipoDocumento
        except Exception as e:
            self.stderr.write(f'Error importing TipoDocumento model: {e}')
            return

        defaults = [
            'Cédula de Ciudadanía',
            'Tarjeta de Identidad',
            'Registro Civil',
            'Cédula de Extranjería',
            'Pasaporte',
            'Documento Militar',
            'NIT',
            'Permiso Temporal',
            'Tarjeta de Residencia',
            'Otro',
        ]

        existing = set(TipoDocumento.objects.values_list('descripcion', flat=True))
        to_create = [d for d in defaults if d not in existing]

        if not options.get('confirm'):
            self.stdout.write(f'Found {len(existing)} existing TipoDocumento(s).')
            self.stdout.write(f'Will create {len(to_create)} missing TipoDocumento(s): {to_create}')
            self.stdout.write('Run this command again with --confirm to apply changes.')
            return

        objs = [TipoDocumento(descripcion=d) for d in to_create]
        if objs:
            TipoDocumento.objects.bulk_create(objs)
        self.stdout.write(f'Created {len(objs)} TipoDocumento(s).')
