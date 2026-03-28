from django.db import models
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
import uuid


class PasswordResetOTP(models.Model):
    """Modelo para almacenar códigos OTP de recuperación de contraseña"""
    id = models.BigAutoField(primary_key=True)
    email = models.EmailField(max_length=255, db_index=True)
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    rol = models.CharField(max_length=20)  # 'estudiante' o 'docente'

    class Meta:
        db_table = "password_reset_otp"
        ordering = ['-created_at']

    def is_valid(self):
        """Verifica si el OTP aún es válido (no usado y no expirado)"""
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"OTP {self.otp_code} para {self.email}"
    


class TipoDocumento(models.Model):
    id_tipo_documento = models.BigAutoField(primary_key=True, db_column="id_tipo_documento")
    descripcion = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "tipo_documento"

    def __str__(self):
        return self.descripcion



class Docente(models.Model):
    id_docente = models.BigAutoField(primary_key=True, db_column="id_docente")
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    codigo_docente = models.CharField(max_length=50, unique=True)
    contrasenia_docente = models.CharField(max_length=255)
    correo = models.EmailField(max_length=255, unique=True)
    tipo_documento = models.ForeignKey(TipoDocumento, on_delete=models.RESTRICT, db_column="id_tipo_documento")
    num_documento = models.CharField(max_length=50, unique=True)
    num_telefono = models.CharField(max_length=30, blank=True, null=True)

    class Meta:
        db_table = "docente"

    def __str__(self):
        return f"{self.nombre} {self.apellido}"


class Coordinador(models.Model):
    id_coordinador = models.BigAutoField(primary_key=True, db_column="id_coordinador")
    nombre = models.CharField(max_length=100)
    codigo_coordinador = models.CharField(max_length=50, unique=True)
    contrasenia_coord = models.CharField(max_length=255)
    correo = models.EmailField(max_length=255, unique=True)

    class Meta:
        db_table = "coordinador"

    def __str__(self):
        return self.nombre


class ImportAudit(models.Model):
    """
    Registro de auditoría para importaciones realizadas por coordinadores.
    Guarda métricas mínimas para trazabilidad sin exponer datos sensibles.
    """
    KIND_CHOICES = (
        ("matriculados", "Matriculados"),
        ("estudiantes", "Estudiantes"),
        ("docentes", "Docentes"),
        ("asignaturas_ras", "Asignaturas y RAs"),
    )

    id = models.BigAutoField(primary_key=True)
    coordinador = models.ForeignKey(Coordinador, on_delete=models.SET_NULL, null=True, db_column="id_coordinador")
    kind = models.CharField(max_length=32, choices=KIND_CHOICES)
    filename = models.CharField(max_length=255, blank=True, null=True)
    created_count = models.IntegerField(default=0)
    existing_count = models.IntegerField(default=0)
    errors_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "import_audit"
        indexes = [
            models.Index(fields=["kind", "created_at"], name="idx_import_kind_created"),
        ]

    def __str__(self):
        who = getattr(self.coordinador, "codigo_coordinador", None) or "?"
        return f"{self.kind} by {who} @ {self.created_at:%Y-%m-%d %H:%M}"


class Estudiante(models.Model):
    id_estudiante = models.BigAutoField(primary_key=True, db_column="id_estudiante")
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    codigo_estudiante = models.CharField(max_length=50, unique=True)
    contrasena_estudiante = models.CharField(max_length=255)
    tipo_documento = models.ForeignKey(TipoDocumento, on_delete=models.RESTRICT, db_column="id_tipo_documento")
    num_documento = models.CharField(max_length=50, unique=True)
    correo = models.EmailField(max_length=255, unique=True)
    jornada = models.CharField(max_length=50, blank=True, null=True)
    activo = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = "estudiante"

    def __str__(self):
        return f"{self.nombre} {self.apellido}"


class Programa(models.Model):
    id_programa = models.BigAutoField(primary_key=True, db_column="id_programa")
    nombre = models.CharField(max_length=150)
    codigo_programa = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = "programa"

    def __str__(self):
        return self.nombre


class PeriodoAcademico(models.Model):
    id_periodo = models.BigAutoField(primary_key=True, db_column="id_periodo")
    descripcion = models.CharField(max_length=100, unique=True)
    fecha_inicio = models.DateField()
    fecha_finalizacion = models.DateField()

    class Meta:
        db_table = "periodo_academico"
        constraints = [
            models.CheckConstraint(
                check=Q(fecha_finalizacion__gte=models.F("fecha_inicio")),
                name="chk_periodo_fechas",
            ),
        ]

    def __str__(self):
        return self.descripcion


class Asignatura(models.Model):
    id_asignatura = models.BigAutoField(primary_key=True, db_column="id_asignatura")
    nombre = models.CharField(max_length=150)
    codigo_asignatura = models.CharField(max_length=50)
    docente = models.ForeignKey(Docente, on_delete=models.RESTRICT, db_column="id_docente")
    periodo = models.ForeignKey(PeriodoAcademico, on_delete=models.RESTRICT, db_column="id_periodo", null=True, blank=True)
    grupo = models.CharField(max_length=20)
    sede = models.CharField(max_length=80)
    creditos = models.PositiveSmallIntegerField(default=0)
    programa = models.ForeignKey(Programa, on_delete=models.RESTRICT, db_column="id_programa")

    class Meta:
        db_table = "asignatura"
        constraints = [
            models.UniqueConstraint(fields=["codigo_asignatura", "grupo", "sede", "periodo"], name="uq_asignatura_codigo_grupo_sede_periodo"),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.codigo_asignatura} - {self.grupo} - {self.sede})"


class ResultadoDeAprendizaje(models.Model):
    id_ra = models.BigAutoField(primary_key=True, db_column="id_ra")
    asignatura = models.ForeignKey(Asignatura, on_delete=models.CASCADE, db_column="id_asignatura")
    porcentaje_ra = models.DecimalField(max_digits=5, decimal_places=2)
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "resultado_de_aprendizaje"
        constraints = [
            models.CheckConstraint(
                check=Q(porcentaje_ra__gte=0) & Q(porcentaje_ra__lte=100),
                name="chk_ra_pct",
            ),
        ]

    def __str__(self):
        return f"RA {self.id_ra} - {self.asignatura}"


class IndicadoresDeLogro(models.Model):
    id_ind = models.BigAutoField(primary_key=True, db_column="id_ind")
    ra = models.ForeignKey(ResultadoDeAprendizaje, on_delete=models.CASCADE, db_column="id_ra")
    porcentaje_ind = models.DecimalField(max_digits=5, decimal_places=2)
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "indicadores_de_logro"
        constraints = [
            models.CheckConstraint(
                check=Q(porcentaje_ind__gte=0) & Q(porcentaje_ind__lte=100),
                name="chk_ind_pct",
            ),
        ]


class TipoActividad(models.Model):
    id_tipo_actividad = models.BigAutoField(primary_key=True, db_column="id_tipo_actividad")
    descripcion = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "tipo_actividad"

    def __str__(self):
        return self.descripcion


class Actividad(models.Model):
    id_actividad = models.BigAutoField(primary_key=True, db_column="id_actividad")
    tipo_actividad = models.ForeignKey(TipoActividad, on_delete=models.RESTRICT, db_column="id_tipo_actividad")
    nombre_actividad = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    fecha_creacion = models.DateField()
    fecha_cierre = models.DateField(blank=True, null=True)

    class Meta:
        db_table = "actividad"
        constraints = [
            models.CheckConstraint(
                check=Q(fecha_cierre__isnull=True) | Q(fecha_cierre__gte=models.F("fecha_creacion")),
                name="chk_act_fechas",
            ),
        ]

    def __str__(self):
        return self.nombre_actividad


class RaActividad(models.Model):
    id_ra_actividad = models.BigAutoField(primary_key=True, db_column="id_ra_actividad")
    actividad = models.ForeignKey(Actividad, on_delete=models.CASCADE, db_column="id_actividad")
    ra = models.ForeignKey(ResultadoDeAprendizaje, on_delete=models.CASCADE, db_column="id_ra")
    porcentaje_ra_actividad = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        db_table = "ra_actividad"
        constraints = [
            models.UniqueConstraint(fields=["actividad", "ra"], name="uq_ra_act"),
            models.CheckConstraint(
                check=Q(porcentaje_ra_actividad__gte=0) & Q(porcentaje_ra_actividad__lte=100),
                name="chk_ra_act_pct",
            ),
        ]


class Matricula(models.Model):
    id_matricula = models.BigAutoField(primary_key=True, db_column="id_matricula")
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, db_column="id_estudiante")
    periodo = models.ForeignKey(PeriodoAcademico, on_delete=models.RESTRICT, db_column="id_periodo")
    asignatura = models.ForeignKey(Asignatura, on_delete=models.RESTRICT, db_column="id_asignatura")
    nota_final = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)

    class Meta:
        db_table = "matricula"
        constraints = [
            models.CheckConstraint(
                check=Q(nota_final__isnull=True) | (Q(nota_final__gte=0) & Q(nota_final__lte=5)),
                name="chk_nota_final",
            ),
            models.UniqueConstraint(fields=["estudiante", "periodo", "asignatura"], name="uq_matricula"),
        ]


class NotasActividad(models.Model):
    id = models.BigAutoField(primary_key=True)  # PK surrogate
    matricula = models.ForeignKey(Matricula, on_delete=models.CASCADE, db_column="id_matricula")
    ra_actividad = models.ForeignKey(RaActividad, on_delete=models.CASCADE, db_column="id_ra_actividad")
    nota_ra_actividad = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    retroalimentacion = models.TextField(blank=True, null=True)
    # Nuevo: indicador asociado a la calificación (opcional)
    indicador = models.ForeignKey(IndicadoresDeLogro, on_delete=models.SET_NULL, null=True, blank=True, db_column="id_ind")

    class Meta:
        db_table = "notas_actividad"
        constraints = [
            # Permite múltiples notas por ra_actividad si son para indicadores diferentes
            # o una sola nota sin indicador específico
            models.UniqueConstraint(
                fields=["matricula", "ra_actividad", "indicador"], 
                name="uq_notas_actividad_indicador"
            ),
            models.CheckConstraint(
                check=Q(nota_ra_actividad__isnull=True) | (Q(nota_ra_actividad__gte=0) & Q(nota_ra_actividad__lte=5)),
                name="chk_nota_ra",
            ),
        ]


class Recurso(models.Model):
    id_recurso = models.BigAutoField(primary_key=True, db_column="id_recurso")
    asignatura = models.ForeignKey(Asignatura, on_delete=models.CASCADE, db_column="id_asignatura")
    titulo = models.CharField(max_length=200)
    archivo = models.FileField(upload_to="recursos/%Y/%m/%d")
    fecha_subida = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "recurso"

    def __str__(self):
        return self.titulo


class RaActividadIndicador(models.Model):
    """
    Relación N a N entre una relación RA-Actividad y los Indicadores de Logro del mismo RA.
    Permite asignar una misma actividad a múltiples indicadores.
    """
    id = models.BigAutoField(primary_key=True)
    ra_actividad = models.ForeignKey(RaActividad, on_delete=models.CASCADE, db_column="id_ra_actividad", related_name="indicadores_rel")
    indicador = models.ForeignKey(IndicadoresDeLogro, on_delete=models.CASCADE, db_column="id_ind", related_name="ra_actividades_rel")

    class Meta:
        db_table = "ra_actividad_indicador"
        constraints = [
            models.UniqueConstraint(fields=["ra_actividad", "indicador"], name="uq_ra_actividad_indicador"),
        ]


# ==================== MODELOS DE SEGURIDAD ====================

class LoginAttempt(models.Model):
    """
    Registro de intentos de login (exitosos y fallidos) para auditoría y seguridad.
    Permite rastrear intentos de acceso no autorizados y detectar ataques de fuerza bruta.
    """
    id = models.BigAutoField(primary_key=True)
    usuario_codigo = models.CharField(max_length=100, db_index=True, help_text="Código del usuario que intentó autenticarse")
    usuario_email = models.EmailField(max_length=255, null=True, blank=True, help_text="Email usado en el intento")
    rol_intentado = models.CharField(max_length=20, null=True, blank=True, help_text="Rol que intentó usar (docente/estudiante/coordinador)")
    
    # Resultado del intento
    exito = models.BooleanField(default=False, help_text="Si el login fue exitoso")
    motivo_fallo = models.CharField(max_length=200, null=True, blank=True, help_text="Razón del fallo si aplica")
    
    # Datos del intento
    ip_address = models.GenericIPAddressField(help_text="Dirección IP desde donde se realizó el intento")
    user_agent = models.TextField(null=True, blank=True, help_text="User-Agent del navegador")
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True, help_text="Fecha y hora del intento")
    
    class Meta:
        db_table = "login_attempt"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['usuario_codigo', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
        ]
    
    def __str__(self):
        status = "✓ Exitoso" if self.exito else "✗ Fallido"
        return f"{status} - {self.usuario_codigo} desde {self.ip_address} ({self.timestamp})"


class AccountLockout(models.Model):
    """
    Bloqueos temporales de cuentas por intentos fallidos consecutivos.
    Implementa protección contra ataques de fuerza bruta.
    """
    id = models.BigAutoField(primary_key=True)
    usuario_codigo = models.CharField(max_length=100, unique=True, db_index=True, help_text="Código del usuario bloqueado")
    
    # Control de bloqueo
    intentos_fallidos = models.IntegerField(default=0, help_text="Contador de intentos fallidos consecutivos")
    bloqueado = models.BooleanField(default=False, db_index=True, help_text="Si la cuenta está actualmente bloqueada")
    fecha_bloqueo = models.DateTimeField(null=True, blank=True, help_text="Fecha y hora del bloqueo")
    fecha_desbloqueo = models.DateTimeField(null=True, blank=True, help_text="Fecha y hora programada para desbloqueo automático")
    
    # Auditoría
    ultimo_intento_fallido = models.DateTimeField(null=True, blank=True, help_text="Timestamp del último intento fallido")
    ultimo_intento_ip = models.GenericIPAddressField(null=True, blank=True, help_text="IP del último intento fallido")
    notificacion_enviada = models.BooleanField(default=False, help_text="Si se envió email de alerta al usuario")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "account_lockout"
        ordering = ['-updated_at']
    
    def __str__(self):
        estado = "BLOQUEADO" if self.bloqueado else f"{self.intentos_fallidos} intentos"
        return f"{self.usuario_codigo} - {estado}"
    
    def is_locked(self):
        """Verifica si la cuenta está actualmente bloqueada"""
        if not self.bloqueado:
            return False
        
        # Si tiene fecha de desbloqueo automático, verificar si ya pasó
        if self.fecha_desbloqueo and timezone.now() >= self.fecha_desbloqueo:
            self.desbloquear()
            return False
        
        return True
    
    def bloquear(self, duracion_minutos=30):
        """Bloquea la cuenta por un tiempo determinado"""
        self.bloqueado = True
        self.fecha_bloqueo = timezone.now()
        self.fecha_desbloqueo = timezone.now() + timedelta(minutes=duracion_minutos)
        self.save()
    
    def desbloquear(self):
        """Desbloquea la cuenta y resetea contadores"""
        self.bloqueado = False
        self.intentos_fallidos = 0
        self.fecha_bloqueo = None
        self.fecha_desbloqueo = None
        self.notificacion_enviada = False
        self.save()
    
    def registrar_intento_fallido(self, ip_address):
        """Incrementa el contador de intentos fallidos"""
        self.intentos_fallidos += 1
        self.ultimo_intento_fallido = timezone.now()
        self.ultimo_intento_ip = ip_address
        self.save()


class SecurityEvent(models.Model):
    """
    Bitácora de eventos de seguridad para auditoría y análisis.
    Registra todos los eventos importantes relacionados con seguridad.
    """
    EVENTO_CHOICES = [
        ('LOGIN_SUCCESS', 'Login exitoso'),
        ('LOGIN_FAILED', 'Login fallido'),
        ('ACCOUNT_LOCKED', 'Cuenta bloqueada'),
        ('ACCOUNT_UNLOCKED', 'Cuenta desbloqueada'),
        ('PASSWORD_RESET_REQUEST', 'Solicitud de recuperación de contraseña'),
        ('PASSWORD_RESET_SUCCESS', 'Contraseña restablecida'),
        ('OTP_GENERATED', 'OTP generado'),
        ('OTP_VERIFIED', 'OTP verificado'),
        ('OTP_FAILED', 'OTP inválido'),
        ('SUSPICIOUS_ACTIVITY', 'Actividad sospechosa'),
        ('RATE_LIMIT_EXCEEDED', 'Rate limit excedido'),
    ]
    
    id = models.BigAutoField(primary_key=True)
    evento = models.CharField(max_length=50, choices=EVENTO_CHOICES, db_index=True)
    usuario_codigo = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    detalles = models.TextField(null=True, blank=True, help_text="Detalles adicionales del evento en formato JSON")
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = "security_event"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['evento', 'timestamp']),
            models.Index(fields=['usuario_codigo', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.get_evento_display()} - {self.usuario_codigo} ({self.timestamp})"


class Anuncio(models.Model):
    """Modelo para anuncios de docentes a estudiantes de una asignatura"""
    id = models.BigAutoField(primary_key=True)
    asignatura = models.ForeignKey('Asignatura', on_delete=models.CASCADE, related_name='anuncios')
    docente = models.ForeignKey('Docente', on_delete=models.CASCADE, related_name='anuncios')
    titulo = models.CharField(max_length=200)
    contenido = models.TextField()
    fecha_publicacion = models.DateTimeField(auto_now_add=True, db_index=True)
    es_importante = models.BooleanField(default=False, help_text="Marca si el anuncio es urgente/importante")
    
    class Meta:
        db_table = "anuncio"
        ordering = ['-fecha_publicacion']
        indexes = [
            models.Index(fields=['asignatura', '-fecha_publicacion']),
        ]
    
    def __str__(self):
        return f"{self.titulo} - {self.asignatura.nombre} ({self.fecha_publicacion.strftime('%Y-%m-%d')})"


class Notificacion(models.Model):
    """
    Modelo para notificaciones persistentes a estudiantes.
    Reemplaza el sistema de caché en memoria por almacenamiento en BD.
    """
    TIPO_CHOICES = [
        ('grade', 'Calificación'),
        ('resource', 'Recurso'),
        ('deadline', 'Fecha límite'),
        ('message', 'Mensaje'),
        ('announcement', 'Anuncio'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    estudiante = models.ForeignKey('Estudiante', on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='message', db_index=True)
    texto = models.TextField(help_text="Contenido de la notificación")
    enlace = models.CharField(max_length=500, null=True, blank=True, help_text="URL opcional para redirigir")
    leida = models.BooleanField(default=False, db_index=True, help_text="Si el estudiante ya leyó esta notificación")
    fecha_creacion = models.DateTimeField(auto_now_add=True, db_index=True)
    fecha_lectura = models.DateTimeField(null=True, blank=True, help_text="Fecha en que se marcó como leída")
    
    class Meta:
        db_table = "notificacion"
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['estudiante', '-fecha_creacion']),
            models.Index(fields=['estudiante', 'leida']),
        ]
    
    def __str__(self):
        estado = "✓ Leída" if self.leida else "✗ No leída"
        return f"{self.get_tipo_display()} - {self.estudiante.codigo_estudiante} - {estado}"
    
    def marcar_leida(self):
        """Marca la notificación como leída"""
        if not self.leida:
            self.leida = True
            self.fecha_lectura = timezone.now()
            self.save()