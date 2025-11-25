"""
Comando de gestión Django para limpiar códigos OTP expirados.

Uso:
    python manage.py clean_expired_otps
    python manage.py clean_expired_otps --days=7  # Limpiar OTPs con más de 7 días
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models.models import PasswordResetOTP


class Command(BaseCommand):
    help = 'Elimina códigos OTP expirados y usados de la base de datos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=1,
            help='Eliminar OTPs con más de N días de antigüedad (default: 1)'
        )
        parser.add_argument(
            '--only-used',
            action='store_true',
            help='Eliminar solo OTPs ya usados'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simular la eliminación sin borrar registros'
        )

    def handle(self, *args, **options):
        days = options['days']
        only_used = options['only_used']
        dry_run = options['dry_run']

        # Calcular fecha límite
        cutoff_date = timezone.now() - timedelta(days=days)

        # Construir query base
        query = PasswordResetOTP.objects.filter(created_at__lt=cutoff_date)

        if only_used:
            query = query.filter(is_used=True)
            self.stdout.write(
                self.style.WARNING(f'Buscando OTPs USADOS con más de {days} día(s) de antigüedad...')
            )
        else:
            # Eliminar expirados o usados
            query = query.filter(
                models.Q(expires_at__lt=timezone.now()) | models.Q(is_used=True)
            )
            self.stdout.write(
                self.style.WARNING(f'Buscando OTPs EXPIRADOS o USADOS con más de {days} día(s) de antigüedad...')
            )

        # Contar registros a eliminar
        count = query.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('✓ No hay OTPs para eliminar.'))
            return

        # Mostrar información detallada
        self.stdout.write(f'\n📊 Registros encontrados: {count}')
        
        # Estadísticas
        total_expired = PasswordResetOTP.objects.filter(expires_at__lt=timezone.now()).count()
        total_used = PasswordResetOTP.objects.filter(is_used=True).count()
        total_all = PasswordResetOTP.objects.count()

        self.stdout.write(f'\n📈 Estadísticas actuales:')
        self.stdout.write(f'   - Total OTPs en BD: {total_all}')
        self.stdout.write(f'   - OTPs expirados: {total_expired}')
        self.stdout.write(f'   - OTPs usados: {total_used}')
        self.stdout.write(f'   - OTPs activos: {total_all - total_expired - total_used}\n')

        # Modo dry-run
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'🔍 Modo DRY-RUN: Se eliminarían {count} registro(s), pero no se borra nada.'
                )
            )
            # Mostrar algunos ejemplos
            sample = query[:5]
            self.stdout.write('\n📄 Ejemplos de OTPs que se eliminarían:')
            for otp in sample:
                status = 'USADO' if otp.is_used else 'EXPIRADO'
                self.stdout.write(
                    f'   - {otp.email} | {otp.otp_code} | {status} | {otp.created_at}'
                )
            if count > 5:
                self.stdout.write(f'   ... y {count - 5} más.')
            return

        # Confirmación en producción
        if not options.get('verbosity', 1) == 0:
            confirm = input(f'\n⚠️  ¿Confirmas eliminar {count} OTP(s)? (s/N): ')
            if confirm.lower() not in ['s', 'si', 'sí', 'y', 'yes']:
                self.stdout.write(self.style.ERROR('❌ Operación cancelada.'))
                return

        # Eliminar registros
        try:
            deleted_count, _ = query.delete()
            self.stdout.write(
                self.style.SUCCESS(f'✅ Eliminados {deleted_count} OTP(s) exitosamente.')
            )
            
            # Estadísticas finales
            remaining = PasswordResetOTP.objects.count()
            self.stdout.write(f'\n📊 Registros restantes en BD: {remaining}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error al eliminar OTPs: {str(e)}')
            )


# Importar Q para consultas complejas
from django.db import models
