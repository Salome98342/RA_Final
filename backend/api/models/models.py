from django.db import models
from django.db.models import Q

class Task(models.Model):
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    completed = models.BooleanField(default=False)
    def __str__(self):
        return self.title
    


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
    codigo_asignatura = models.CharField(max_length=50, unique=True)
    docente = models.ForeignKey(Docente, on_delete=models.RESTRICT, db_column="id_docente")
    grupo = models.CharField(max_length=20, blank=True, null=True)
    programa = models.ForeignKey(Programa, on_delete=models.RESTRICT, db_column="id_programa")

    class Meta:
        db_table = "asignatura"

    def __str__(self):
        return self.nombre


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
    porcentaje_actividad = models.DecimalField(max_digits=5, decimal_places=2)
    fecha_creacion = models.DateField()
    fecha_cierre = models.DateField(blank=True, null=True)

    class Meta:
        db_table = "actividad"
        constraints = [
            models.CheckConstraint(
                check=Q(porcentaje_actividad__gte=0) & Q(porcentaje_actividad__lte=100),
                name="chk_act_pct",
            ),
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
            models.UniqueConstraint(fields=["matricula", "ra_actividad"], name="uq_notas_actividad"),
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