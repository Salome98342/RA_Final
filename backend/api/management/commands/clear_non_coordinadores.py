from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings
import logging

from ...models.models import (
    PasswordResetOTP, TipoDocumento, Docente, Estudiante, Asignatura,
    ResultadoDeAprendizaje, Matricula, IndicadoresDeLogro, Actividad,
    RaActividad, NotasActividad, PeriodoAcademico, Programa, Recurso,
    RaActividadIndicador, TipoActividad, ImportAudit, Anuncio,
    LoginAttempt, AccountLockout, SecurityEvent, Notificacion
)

logger = logging.getLogger("ra_manager.management")


class Command(BaseCommand):
    help = "Elimina todos los datos del sistema excepto los Coordinador. Usar --dry-run para ver conteos. REQUIERE --confirm para ejecutar."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Solo mostrar conteos sin borrar')
        parser.add_argument('--confirm', action='store_true', help='Confirmar ejecución (real)')

    def handle(self, *args, **options):
        dry_run = options.get('dry_run')
        confirm = options.get('confirm')

        # List of (display_name, queryset_callable)
        targets = [
            ("NotasActividad", lambda: NotasActividad.objects.all()),
            ("RaActividadIndicador", lambda: RaActividadIndicador.objects.all()),
            ("RaActividad", lambda: RaActividad.objects.all()),
            ("IndicadoresDeLogro", lambda: IndicadoresDeLogro.objects.all()),
            ("ResultadoDeAprendizaje", lambda: ResultadoDeAprendizaje.objects.all()),
            ("Anuncio", lambda: Anuncio.objects.all()),
            ("Recurso", lambda: Recurso.objects.all()),
            ("Matricula", lambda: Matricula.objects.all()),
            ("Asignatura", lambda: Asignatura.objects.all()),
            ("Actividad", lambda: Actividad.objects.all()),
            ("TipoActividad", lambda: TipoActividad.objects.all()),
            ("Estudiante", lambda: Estudiante.objects.all()),
            ("Docente", lambda: Docente.objects.all()),
            ("ImportAudit", lambda: ImportAudit.objects.all()),
            ("Programa", lambda: Programa.objects.all()),
            ("PeriodoAcademico", lambda: PeriodoAcademico.objects.all()),
            ("TipoDocumento", lambda: TipoDocumento.objects.all()),
            ("PasswordResetOTP", lambda: PasswordResetOTP.objects.all()),
            ("LoginAttempt", lambda: LoginAttempt.objects.all()),
            ("AccountLockout", lambda: AccountLockout.objects.all()),
            ("SecurityEvent", lambda: SecurityEvent.objects.all()),
            ("Notificacion", lambda: Notificacion.objects.all()),
        ]

        self.stdout.write(self.style.WARNING('Resumen antes de la operación:'))
        total = 0
        counts = []
        for name, qs_fn in targets:
            try:
                cnt = qs_fn().count()
            except Exception:
                cnt = 'ERR'
            counts.append((name, cnt))
            total = total + (cnt if isinstance(cnt, int) else 0)
            self.stdout.write(f" - {name}: {cnt}")

        self.stdout.write(self.style.WARNING(f"Total estimado de registros a eliminar (suma simple): {total}"))

        if dry_run or not confirm:
            if dry_run:
                self.stdout.write(self.style.SUCCESS('Dry-run solicitado: no se realizarán borrados.'))
            else:
                self.stdout.write(self.style.ERROR('No se confirmó la ejecución. Ejecuta con --confirm para proceder.'))
            return

        # Realizar borrado en transacción
        try:
            with transaction.atomic():
                for name, qs_fn in targets:
                    try:
                        qs = qs_fn()
                        deleted, _ = qs.delete()
                        self.stdout.write(self.style.SUCCESS(f"Borrados {deleted} registros de {name}"))
                    except Exception as e:
                        logger.exception(f"Error borrando {name}: {e}")
                        self.stdout.write(self.style.ERROR(f"Error borrando {name}: {e}"))

            self.stdout.write(self.style.SUCCESS('Operación completada: se eliminaron los datos indicados (excepto Coordinador).'))
        except Exception as e:
            logger.exception(f"Transacción fallida: {e}")
            self.stdout.write(self.style.ERROR(f"Transacción fallida: {e}"))
