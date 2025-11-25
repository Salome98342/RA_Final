from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, authentication_classes, action
from rest_framework.permissions import AllowAny
from django.core import signing
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.conf import settings
import uuid
from datetime import datetime as dt_module
import os
import io
import csv
import secrets
import random
from django.core.files.storage import default_storage
import logging
from django.utils.text import get_valid_filename
from django.db.models import Avg, Sum
from django.db import transaction, DatabaseError, IntegrityError
import datetime

from ..models.models import (
    TipoDocumento, TipoActividad, Programa, Docente, Estudiante, Asignatura,
    Task, ResultadoDeAprendizaje, Matricula, IndicadoresDeLogro, Actividad, RaActividad, NotasActividad, PeriodoAcademico, Recurso, RaActividadIndicador,
    Coordinador, ImportAudit,
)
from ..serializers.serializers import (
    TipoDocumentoSerializer, TipoActividadSerializer, ProgramaSerializer,
    DocenteSerializer, EstudianteSerializer, AsignaturaSerializer,
    TaskSerializer, ResultadoDeAprendizajeSerializer, RecursoSerializer,
    PasswordForgotSerializer, VerifyOTPSerializer, PasswordResetSerializer
)

TOKEN_MAX_AGE = 60 * 60 * 24 * 7
RESET_TOKEN_MAX_AGE = 60 * 60  # 1 hora
logger = logging.getLogger("ra_manager.coordinador")

# Sistema de notificaciones en memoria (cache simple por estudiante)
_NOTIFICATIONS_CACHE = {}  # {id_estudiante: [notificaciones...]}

def _add_notification(id_estudiante: int, kind: str, text: str, link: str = None):
    """Agregar notificación para un estudiante"""
    if id_estudiante not in _NOTIFICATIONS_CACHE:
        _NOTIFICATIONS_CACHE[id_estudiante] = []
    notif = {
        "id": str(uuid.uuid4()),
        "kind": kind,
        "text": text,
        "date": dt_module.now().isoformat(),
        "read": False,
        "link": link
    }
    _NOTIFICATIONS_CACHE[id_estudiante].append(notif)
    # Mantener solo últimas 50 notificaciones por estudiante
    if len(_NOTIFICATIONS_CACHE[id_estudiante]) > 50:
        _NOTIFICATIONS_CACHE[id_estudiante] = _NOTIFICATIONS_CACHE[id_estudiante][-50:]

def _normalize_login_payload(data: dict):
    email = data.get("email") or data.get("correo")
    codigo = data.get("code") or data.get("codigo") or data.get("codigo_docente") or data.get("codigo_estudiante")
    password = data.get("password") or data.get("contrasena") or data.get("contrasenia")
    rol = (data.get("rol") or data.get("role") or "").lower()
    return email, codigo, password, rol

def _serialize_user(u, rol: str):
    return {
        "id": u.pk, "rol": rol,
        "nombre": getattr(u, "nombre", None),
        "apellido": getattr(u, "apellido", None),
        "correo": getattr(u, "correo", None),
        "code": getattr(u, "codigo_docente", None) or getattr(u, "codigo_estudiante", None) or getattr(u, "codigo_coordinador", None),
    }

def _bearer_token(request):
    auth = request.headers.get("Authorization", "")
    return auth.split(" ", 1)[1] if auth.startswith("Bearer ") and " " in auth else None

@api_view(["POST", "GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def login_view(request):
    data = request.data if request.method == "POST" else request.query_params
    email, codigo, password, rol = _normalize_login_payload(data or {})
    if not (email or codigo):
        return Response({"detail": "Faltan credenciales"}, status=status.HTTP_400_BAD_REQUEST)

    def ok_pass(db_value: str | None) -> bool:
        if not password:
            return True
        if not db_value:
            return False
        try:
            if check_password(password, db_value):
                return True
        except Exception:
            pass
        return password == db_value

    user = None
    user_rol = None
    for r in ( ["docente", "estudiante", "coordinador"] if not rol else [rol] ):
        if r == "docente":
            u = (Docente.objects.filter(codigo_docente=codigo).first()
                 or Docente.objects.filter(correo=email).first())
            if u and ok_pass(u.contrasenia_docente):
                user = u; user_rol = "docente"; break
        elif r == "estudiante":
            u = (Estudiante.objects.filter(codigo_estudiante=codigo).first()
                 or Estudiante.objects.filter(correo=email).first())
            if u and ok_pass(u.contrasena_estudiante):
                user = u; user_rol = "estudiante"; break
        elif r == "coordinador":
            u = (Coordinador.objects.filter(codigo_coordinador=codigo).first()
                 or Coordinador.objects.filter(correo=email).first())
            if u and ok_pass(u.contrasenia_coord):
                user = u; user_rol = "coordinador"; break

    if not user:
        return Response({"detail": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)

    token = signing.dumps({"rol": user_rol, "id": user.pk})
    return Response({"token": token, "user": _serialize_user(user, user_rol)})

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def me_view(request):
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        data = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    rol, uid = data.get("rol"), data.get("id")
    if rol == "docente":
        u = Docente.objects.filter(pk=uid).first()
    elif rol == "estudiante":
        u = Estudiante.objects.filter(pk=uid).first()
    elif rol == "coordinador":
        u = Coordinador.objects.filter(pk=uid).first()
    else:
        u = None
    if not u:
        return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_401_UNAUTHORIZED)
    return Response({"user": _serialize_user(u, rol or "estudiante")})


def _require_coordinador(request):
    """Valida token y rol coordinador; retorna (coord, None) si ok, o (None, Response) si error."""
    token = _bearer_token(request)
    if not token:
        return None, Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        data = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return None, Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    if data.get("rol") != "coordinador":
        return None, Response({"detail": "Requiere rol coordinador"}, status=status.HTTP_403_FORBIDDEN)
    coord = Coordinador.objects.filter(pk=data.get("id")).first()
    if not coord:
        return None, Response({"detail": "Coordinador no encontrado"}, status=status.HTTP_401_UNAUTHORIZED)
    return coord, None

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_asignaturas_view(request):
    """Listado de asignaturas para coordinador, con filtros y paginación."""
    coord, err = _require_coordinador(request)
    if err:
        return err
    qs = Asignatura.objects.select_related("docente", "programa")
    prog_code = request.query_params.get("programa")
    docente_code = request.query_params.get("docente")
    periodo_desc = request.query_params.get("periodo")
    if prog_code:
        qs = qs.filter(programa__codigo_programa=prog_code)
    if docente_code:
        qs = qs.filter(docente__codigo_docente=docente_code)
    if periodo_desc:
        qs = qs.filter(matricula__periodo__descripcion=periodo_desc).distinct()
    page_size = int(request.query_params.get("page_size") or 20)
    page = int(request.query_params.get("page") or 1)
    if page < 1:
        page = 1
    offset = (page - 1) * page_size
    total = qs.count()
    rows = []
    for a in qs.order_by("nombre")[offset:offset+page_size]:
        total_estudiantes = Matricula.objects.filter(asignatura=a).count()
        ras_total = ResultadoDeAprendizaje.objects.filter(asignatura=a).count()
        rows.append({
            "codigo": a.codigo_asignatura,
            "nombre": a.nombre,
            "grupo": a.grupo,
            "programa": getattr(a.programa, "nombre", None),
            "programa_codigo": getattr(a.programa, "codigo_programa", None),
            "docente": getattr(a.docente, "nombre", None),
            "docente_codigo": getattr(a.docente, "codigo_docente", None),
            "total_estudiantes": total_estudiantes,
            "total_ras": ras_total,
        })
    return Response({
        "page": page,
        "page_size": page_size,
        "total": total,
        "results": rows,
    })

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_asignatura_ras_view(request):
    """Lista RAs y conteo de actividades por asignatura; opcional periodo. Solo coordinador.
    Query params:
      - codigo_asignatura (requerido)
      - periodo (opcional, para filtrar actividades asociadas a matrículas de ese periodo)
    """
    coord, err = _require_coordinador(request)
    if err:
        return err
    codigo = request.query_params.get("codigo_asignatura")
    if not codigo:
        return Response({"detail": "codigo_asignatura requerido"}, status=status.HTTP_400_BAD_REQUEST)
    periodo_desc = request.query_params.get("periodo")
    asig = Asignatura.objects.filter(codigo_asignatura=codigo).first()
    if not asig:
        return Response({"detail": "Asignatura no encontrada"}, status=status.HTTP_404_NOT_FOUND)
    ras = ResultadoDeAprendizaje.objects.filter(asignatura=asig).order_by("id_ra")
    out = []
    for ra in ras:
        rels = RaActividad.objects.filter(ra=ra)
        # Si se filtra periodo, contar solo actividades con al menos una nota de matriculas de ese periodo
        if periodo_desc:
            rels = rels.filter(notasactividad__matricula__periodo__descripcion=periodo_desc).distinct()
        out.append({
            "id_ra": ra.id_ra,
            "descripcion": ra.descripcion,
            "porcentaje_ra": float(ra.porcentaje_ra),
            "total_actividades": rels.count(),
        })
    return Response({
        "codigo_asignatura": codigo,
        "periodo": periodo_desc,
        "ras": out,
        "total_ras": len(out),
    })

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_asignatura_estudiantes_view(request):
    """Lista estudiantes de una asignatura y periodo (opcional), paginado. Solo coordinador."""
    coord, err = _require_coordinador(request)
    if err:
        return err
    codigo = request.query_params.get("codigo_asignatura")
    if not codigo:
        return Response({"detail": "codigo_asignatura requerido"}, status=status.HTTP_400_BAD_REQUEST)
    periodo_desc = request.query_params.get("periodo")
    asig = Asignatura.objects.filter(codigo_asignatura=codigo).first()
    if not asig:
        return Response({"detail": "Asignatura no encontrada"}, status=status.HTTP_404_NOT_FOUND)
    mats = Matricula.objects.filter(asignatura=asig).select_related("estudiante", "periodo")
    if periodo_desc:
        mats = mats.filter(periodo__descripcion=periodo_desc)
    page_size = int(request.query_params.get("page_size") or 20)
    page = int(request.query_params.get("page") or 1)
    if page < 1:
        page = 1
    offset = (page - 1) * page_size
    total = mats.count()
    rows = [{
        "id_matricula": m.id_matricula,
        "id_estudiante": m.estudiante_id,
        "nombre": m.estudiante.nombre,
        "apellido": m.estudiante.apellido,
        "codigo_estudiante": m.estudiante.codigo_estudiante,
        "periodo": m.periodo.descripcion,
    } for m in mats.order_by("estudiante__nombre", "estudiante__apellido")[offset:offset+page_size]]
    return Response({
        "page": page, "page_size": page_size, "total": total, "results": rows
    })

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_asignatura_avance_view(request):
    """Resumen de avance por asignatura para el coordinador.
    Devuelve promedios por RA y consolidado del curso a partir de las notas registradas.

    Query params:
      - codigo_asignatura (requerido)
      - periodo (opcional) para filtrar matrículas por periodo académico (descripcion)

    Respuesta:
    {
      codigo_asignatura, periodo, total_estudiantes,
      total: { avg: number, ok_pct: number, low_pct: number, coverage_avg: number, threshold: 3.0 },
      ras: [ { id_ra, descripcion, porcentaje_ra, avg: number, ok_pct: number, low_pct: number, coverage_avg: number } ]
    }
    """
    coord, err = _require_coordinador(request)
    if err:
        return err
    codigo = request.query_params.get("codigo_asignatura")
    if not codigo:
        return Response({"detail": "codigo_asignatura requerido"}, status=status.HTTP_400_BAD_REQUEST)
    periodo_desc = request.query_params.get("periodo")

    asig = Asignatura.objects.filter(codigo_asignatura=codigo).first()
    if not asig:
        return Response({"detail": "Asignatura no encontrada"}, status=status.HTTP_404_NOT_FOUND)

    mats = Matricula.objects.filter(asignatura=asig)
    if periodo_desc:
        mats = mats.filter(periodo__descripcion=periodo_desc)
    mats = list(mats)
    total_est = len(mats)

    # RAs y relaciones actividad-RA
    ras = list(ResultadoDeAprendizaje.objects.filter(asignatura=asig).order_by("id_ra"))
    rels_by_ra: dict[int, list[RaActividad]] = {r.id_ra: [] for r in ras}
    for rel in RaActividad.objects.filter(ra__asignatura=asig).select_related("actividad", "ra"):
        rels_by_ra.setdefault(rel.ra_id, []).append(rel)

    # Notas por (matricula, rel)
    notas = list(NotasActividad.objects.filter(matricula__in=mats, ra_actividad__ra__asignatura=asig)
                 .select_related("ra_actividad", "matricula"))
    notas_map: dict[tuple[int, int], NotasActividad] = {}
    for n in notas:
        notas_map[(n.matricula_id, n.ra_actividad_id)] = n

    threshold = 3.0
    ras_out = []

    # Para consolidado por curso por estudiante
    w_ra = {r.id_ra: float(r.porcentaje_ra) / 100.0 for r in ras}

    # Precalcular por estudiante: nota progresiva por RA y cobertura
    student_ra_prog: dict[tuple[int, int], tuple[float|None, float]] = {}
    for m in mats:
        for r in ras:
            rels = rels_by_ra.get(r.id_ra, [])
            sum_w = 0.0
            sum_wg = 0.0
            acc = 0.0
            for rel in rels:
                w = float(rel.porcentaje_ra_actividad) / 100.0
                sum_w += w
                n = notas_map.get((m.id_matricula, rel.id_ra_actividad))
                nota = float(n.nota_ra_actividad) if (n and n.nota_ra_actividad is not None) else None
                if nota is not None:
                    sum_wg += w
                    acc += nota * w
            prog = (acc / sum_wg) if sum_wg > 0 else None
            coverage = (sum_wg / sum_w) if sum_w > 0 else 0.0
            student_ra_prog[(m.id_matricula, r.id_ra)] = (prog, coverage)

    # Agregar métricas por RA
    for r in ras:
        vals = []
        oks = 0
        cov_acc = 0.0
        for m in mats:
            prog, cov = student_ra_prog.get((m.id_matricula, r.id_ra), (None, 0.0))
            if prog is not None:
                vals.append(prog)
                if prog >= threshold:
                    oks += 1
            cov_acc += cov
        avg = (sum(vals) / len(vals)) if vals else None
        total = total_est if total_est > 0 else 1
        ok_pct = (oks / total) * 100.0
        low_pct = 100.0 - ok_pct
        coverage_avg = (cov_acc / total)
        ras_out.append({
            "id_ra": r.id_ra,
            "descripcion": r.descripcion,
            "porcentaje_ra": float(r.porcentaje_ra),
            "avg": round(avg, 2) if avg is not None else None,
            "ok_pct": round(ok_pct, 2),
            "low_pct": round(low_pct, 2),
            "coverage_avg": round(coverage_avg, 4),
        })

    # Consolidado total por estudiante (promedio progresivo ponderado por RA)
    course_vals = []
    course_oks = 0
    course_cov_acc = 0.0
    for m in mats:
        acc = 0.0
        acc_w = 0.0
        cov_w = 0.0
        for r in ras:
            prog, cov = student_ra_prog.get((m.id_matricula, r.id_ra), (None, 0.0))
            w = w_ra.get(r.id_ra, 0.0)
            if prog is not None:
                acc += prog * w
            # Para cobertura ponderada por RA
            cov_w += cov * w
            acc_w += w
        # No normalizamos por acc_w para mantener compatibilidad con total.progressive de course_grade_view
        course_vals.append(acc)
        course_cov_acc += cov_w
        if acc >= threshold:
            course_oks += 1

    total_avg = (sum(course_vals) / len(course_vals)) if course_vals else None
    total_ok_pct = (course_oks / (total_est if total_est > 0 else 1)) * 100.0
    total_low_pct = 100.0 - total_ok_pct
    total_cov_avg = (course_cov_acc / (total_est if total_est > 0 else 1))

    return Response({
        "codigo_asignatura": codigo,
        "periodo": periodo_desc,
        "total_estudiantes": total_est,
        "total": {
            "avg": round(total_avg, 2) if total_avg is not None else None,
            "ok_pct": round(total_ok_pct, 2),
            "low_pct": round(total_low_pct, 2),
            "coverage_avg": round(total_cov_avg, 4),
            "threshold": threshold,
        },
        "ras": ras_out,
    })

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_import_matriculados_view(request):
    """Importa matriculados desde CSV. Solo coordinador.
    CSV esperado (cabeceras mínimas): codigo_estudiante, codigo_asignatura, periodo
    Campos aceptados (sinónimos por fila):
      - codigo_estudiante | estudiante | code
      - codigo_asignatura | asignatura | curso
      - periodo | periodo_academico
    """
    coord, err = _require_coordinador(request)
    if err:
        return err
    f = request.FILES.get("file") or request.FILES.get("csv")
    if not f:
        return Response({"detail": "Archivo CSV requerido como 'file'"}, status=status.HTTP_400_BAD_REQUEST)
    # Validar nombre y tipo básico
    fname = getattr(f, 'name', '')
    ctype = (getattr(f, 'content_type', '') or '').lower()
    if not fname.lower().endswith('.csv') and 'csv' not in ctype:
        return Response({"detail": "Se requiere archivo .csv"}, status=status.HTTP_400_BAD_REQUEST)
    if ctype and ctype not in ("text/csv", "application/vnd.ms-excel", "application/csv", "text/plain"):
        return Response({"detail": f"Tipo MIME no permitido: {ctype}"}, status=status.HTTP_400_BAD_REQUEST)
    # Límite básico 5MB
    try:
        size = int(getattr(f, "size", 0) or 0)
    except Exception:
        size = 0
    if size > 5 * 1024 * 1024:
        return Response({"detail": "El archivo supera 5MB"}, status=status.HTTP_400_BAD_REQUEST)
    # Lectura CSV
    try:
        text_stream = io.TextIOWrapper(f.file, encoding="utf-8-sig")
    except Exception:
        content = f.read()
        text_stream = io.StringIO(content.decode("utf-8", errors="ignore"))
    reader = csv.DictReader(text_stream)
    created = 0
    existing = 0
    errors = []
    rownum = 1
    max_rows = 5000
    for raw in reader:
        if rownum > max_rows:
            errors.append({"row": rownum, "error": f"Se excede límite de {max_rows} filas"})
            break
        rownum += 1
        d = { (k or "").strip().lower(): ( (v.strip() if isinstance(v, str) else v) ) for k, v in (raw or {}).items() }
        # Sanitizar longitud
        for k in list(d.keys()):
            v = d[k]
            if isinstance(v, str):
                d[k] = v.replace('\x00','').strip()[:255]
        cod_est = d.get("codigo_estudiante") or d.get("estudiante") or d.get("code")
        cod_asig = d.get("codigo_asignatura") or d.get("asignatura") or d.get("curso")
        periodo_desc = d.get("periodo") or d.get("periodo_academico")
        if not (cod_est and cod_asig and periodo_desc):
            errors.append({"row": rownum, "error": "Faltan columnas requeridas (codigo_estudiante, codigo_asignatura, periodo)"})
            continue
        est = Estudiante.objects.filter(codigo_estudiante=cod_est).first()
        if not est:
            errors.append({"row": rownum, "error": f"Estudiante no encontrado: {cod_est}"})
            continue
        asig = Asignatura.objects.filter(codigo_asignatura=cod_asig).first()
        if not asig:
            errors.append({"row": rownum, "error": f"Asignatura no encontrada: {cod_asig}"})
            continue
        per = PeriodoAcademico.objects.filter(descripcion=periodo_desc).first()
        if not per:
            errors.append({"row": rownum, "error": f"Periodo no encontrado: {periodo_desc}"})
            continue
        obj, was_created = Matricula.objects.get_or_create(
            estudiante=est, periodo=per, asignatura=asig,
            defaults={"nota_final": None}
        )
        if was_created:
            created += 1
        else:
            existing += 1
    if len(errors) > 100:
        errors = errors[:100] + [{"more": "se omitieron errores adicionales"}]
    payload = {"created": created, "existing": existing, "errors": errors}
    try:
        logger.info("import_matriculados: %s", {
            "coordinador": getattr(coord, "codigo_coordinador", None),
            "filename": getattr(f, "name", None),
            **{k: payload[k] for k in ("created", "existing")},
            "errors_count": len(errors)
        })
        # Persistir auditoría mínima
        ImportAudit.objects.create(
            coordinador=coord,
            kind="matriculados",
            filename=fname,
            created_count=created,
            existing_count=existing,
            errors_count=len(errors),
        )
    except Exception:
        pass
    return Response(payload, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def docente_import_estudiantes_view(request, codigo_asignatura: str):
    """Importa estudiantes matriculados desde CSV del SIRA. Solo docente puede importar para su curso.
    CSV esperado (cabeceras mínimas): codigo_estudiante, (periodo opcional - se usa periodo actual si no se especifica)
    Campos aceptados:
      - codigo_estudiante | estudiante | code | matricula
      - periodo | periodo_academico (opcional)
    """
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    
    if tok.get("rol") != "docente":
        return Response({"detail": "Solo docentes pueden importar estudiantes"}, status=status.HTTP_403_FORBIDDEN)
    
    docente_id = tok.get("id")
    # Verificar que el docente dicta el curso
    asignatura = Asignatura.objects.filter(
        codigo_asignatura=codigo_asignatura,
        docente_id=docente_id
    ).first()
    
    if not asignatura:
        return Response({"detail": "No tienes permisos para importar estudiantes en este curso"}, status=status.HTTP_403_FORBIDDEN)
    
    f = request.FILES.get("file") or request.FILES.get("csv")
    if not f:
        return Response({"detail": "Archivo CSV requerido como 'file'"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validar archivo
    fname = getattr(f, 'name', '')
    ctype = (getattr(f, 'content_type', '') or '').lower()
    if not fname.lower().endswith('.csv') and 'csv' not in ctype:
        return Response({"detail": "Se requiere archivo .csv"}, status=status.HTTP_400_BAD_REQUEST)
    
    size = int(getattr(f, "size", 0) or 0)
    if size > 5 * 1024 * 1024:
        return Response({"detail": "El archivo supera 5MB"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Obtener periodo actual o más reciente
    periodo_actual = PeriodoAcademico.objects.filter(
        fecha_inicio__lte=datetime.date.today(),
        fecha_fin__gte=datetime.date.today()
    ).first()
    
    if not periodo_actual:
        periodo_actual = PeriodoAcademico.objects.order_by('-fecha_inicio').first()
    
    if not periodo_actual:
        return Response({"detail": "No hay periodo académico configurado"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Lectura CSV
    try:
        text_stream = io.TextIOWrapper(f.file, encoding="utf-8-sig")
    except Exception:
        content = f.read()
        text_stream = io.StringIO(content.decode("utf-8", errors="ignore"))
    
    reader = csv.DictReader(text_stream)
    created = 0
    existing = 0
    errors = []
    rownum = 1
    max_rows = 1000
    
    for raw in reader:
        if rownum > max_rows:
            errors.append({"row": rownum, "error": f"Se excede límite de {max_rows} filas"})
            break
        rownum += 1
        
        d = {(k or "").strip().lower(): ((v.strip() if isinstance(v, str) else v)) for k, v in (raw or {}).items()}
        
        # Sanitizar
        for k in list(d.keys()):
            v = d[k]
            if isinstance(v, str):
                d[k] = v.replace('\x00', '').strip()[:255]
        
        cod_est = d.get("codigo_estudiante") or d.get("estudiante") or d.get("code") or d.get("matricula")
        periodo_desc = d.get("periodo") or d.get("periodo_academico")
        
        if not cod_est:
            errors.append({"row": rownum, "error": "Falta codigo_estudiante"})
            continue
        
        est = Estudiante.objects.filter(codigo_estudiante=cod_est).first()
        if not est:
            errors.append({"row": rownum, "error": f"Estudiante no encontrado: {cod_est}"})
            continue
        
        # Usar periodo especificado o periodo actual
        periodo_usar = periodo_actual
        if periodo_desc:
            per = PeriodoAcademico.objects.filter(descripcion=periodo_desc).first()
            if per:
                periodo_usar = per
            else:
                errors.append({"row": rownum, "error": f"Periodo no encontrado: {periodo_desc}, usando periodo actual"})
        
        obj, was_created = Matricula.objects.get_or_create(
            estudiante=est,
            periodo=periodo_usar,
            asignatura=asignatura,
            defaults={"nota_final": None}
        )
        
        if was_created:
            created += 1
        else:
            existing += 1
    
    if len(errors) > 100:
        errors = errors[:100] + [{"more": "se omitieron errores adicionales"}]
    
    return Response({
        "created": created,
        "existing": existing,
        "errors": errors,
        "summary": f"Se matricularon {created} nuevos estudiantes. {existing} ya estaban matriculados."
    }, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_import_docentes_view(request):
    """Importa docentes desde CSV. Solo coordinador.
    CSV columnas mínimas requeridas: codigo_docente, nombre, apellido, correo, tipo_documento, num_documento
    Opcionales: num_telefono, password (si no se provee se genera aleatoria de 10 chars).
    Sinónimos aceptados:
      - codigo_docente | docente | codigo
      - nombre | first_name
      - apellido | last_name
      - correo | email
      - tipo_documento | tipo_doc | doc_type
      - num_documento | documento | doc_number
      - num_telefono | telefono | phone
    """
    coord, err = _require_coordinador(request)
    if err:
        return err
    f = request.FILES.get("file") or request.FILES.get("csv")
    if not f:
        return Response({"detail": "Archivo CSV requerido"}, status=status.HTTP_400_BAD_REQUEST)
    fname = getattr(f, 'name', '')
    ctype = (getattr(f, 'content_type', '') or '').lower()
    if not fname.lower().endswith('.csv') and 'csv' not in ctype:
        return Response({"detail": "Se requiere archivo .csv"}, status=status.HTTP_400_BAD_REQUEST)
    if ctype and ctype not in ("text/csv", "application/vnd.ms-excel", "application/csv", "text/plain"):
        return Response({"detail": f"Tipo MIME no permitido: {ctype}"}, status=status.HTTP_400_BAD_REQUEST)
    size = int(getattr(f, "size", 0) or 0)
    if size > 5 * 1024 * 1024:
        return Response({"detail": "El archivo supera 5MB"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        text_stream = io.TextIOWrapper(f.file, encoding="utf-8-sig")
    except Exception:
        content = f.read()
        text_stream = io.StringIO(content.decode("utf-8", errors="ignore"))
    reader = csv.DictReader(text_stream)
    created = 0
    existing = 0
    errors = []
    max_rows = 5000
    for idx, raw in enumerate(reader, start=2):  # start=2 por header
        if idx-1 > max_rows:
            errors.append({"row": idx, "error": f"Se excede límite de {max_rows} filas"})
            break
        d = { (k or "").strip().lower(): (v.strip() if isinstance(v, str) else v) for k, v in (raw or {}).items() }
        for k in list(d.keys()):
            v = d[k]
            if isinstance(v, str):
                d[k] = v.replace('\x00','').strip()[:255]
        codigo = d.get("codigo_docente") or d.get("docente") or d.get("codigo")
        nombre = d.get("nombre") or d.get("first_name")
        apellido = d.get("apellido") or d.get("last_name")
        correo = d.get("correo") or d.get("email")
        tipo_doc_desc = d.get("tipo_documento") or d.get("tipo_doc") or d.get("doc_type")
        num_documento = d.get("num_documento") or d.get("documento") or d.get("doc_number")
        telefono = d.get("num_telefono") or d.get("telefono") or d.get("phone")
        raw_pass = d.get("password")
        if not (codigo and nombre and apellido and correo and tipo_doc_desc and num_documento):
            errors.append({"row": idx, "error": "Faltan columnas requeridas"}); continue
        # Tipo documento
        tipo_doc = TipoDocumento.objects.filter(descripcion__iexact=tipo_doc_desc).first()
        if not tipo_doc:
            errors.append({"row": idx, "error": f"TipoDocumento no encontrado: {tipo_doc_desc}"}); continue
        # Existente?
        doc = Docente.objects.filter(codigo_docente=codigo).first()
        if doc:
            existing += 1
            # Opcional: actualizar teléfono si viene
            if telefono and telefono != doc.num_telefono:
                doc.num_telefono = telefono
                doc.save(update_fields=["num_telefono"])
            continue
        # Generar contraseña si no viene
        password = raw_pass or secrets.token_urlsafe(8)  # ~11 chars base64
        hashed = make_password(password)
        try:
            Docente.objects.create(
                nombre=nombre, apellido=apellido, codigo_docente=codigo,
                contrasenia_docente=hashed, correo=correo, tipo_documento=tipo_doc,
                num_documento=num_documento, num_telefono=telefono or None,
            )
            created += 1
        except Exception as e:
            errors.append({"row": idx, "error": f"No se pudo crear ({e})"})
    if len(errors) > 100:
        errors = errors[:100] + [{"more": "se omitieron errores adicionales"}]
    payload = {"created": created, "existing": existing, "errors": errors}
    try:
        logger.info("import_docentes: %s", {
            "coordinador": getattr(coord, "codigo_coordinador", None),
            "filename": getattr(f, "name", None),
            **{k: payload[k] for k in ("created", "existing")},
            "errors_count": len(errors)
        })
        ImportAudit.objects.create(
            coordinador=coord,
            kind="docentes",
            filename=fname,
            created_count=created,
            existing_count=existing,
            errors_count=len(errors),
        )
    except Exception:
        pass
    return Response(payload, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_import_asignaturas_ras_view(request):
    """Importa asignaturas y RAs desde CSV. Solo coordinador.
    Columnas mínimas asignatura: codigo_asignatura, nombre_asignatura|nombre, codigo_docente, codigo_programa
    Columnas RA opcionales (si presentes se crea RA): ra_descripcion, ra_porcentaje
    Grupo opcional: grupo
    Sinónimos aceptados:
      - codigo_asignatura | asignatura | codigo
      - nombre_asignatura | nombre | nombre_curso
      - codigo_docente | docente
      - codigo_programa | programa
      - ra_descripcion | ra_desc | descripcion_ra
      - ra_porcentaje | ra_pct | porcentaje_ra
    Valida que suma de porcentajes de RA no exceda 100.
    """
    coord, err = _require_coordinador(request)
    if err:
        return err
    f = request.FILES.get("file") or request.FILES.get("csv")
    if not f:
        return Response({"detail": "Archivo CSV requerido"}, status=status.HTTP_400_BAD_REQUEST)
    fname = getattr(f, 'name', '')
    ctype = (getattr(f, 'content_type', '') or '').lower()
    if not fname.lower().endswith('.csv') and 'csv' not in ctype:
        return Response({"detail": "Se requiere archivo .csv"}, status=status.HTTP_400_BAD_REQUEST)
    if ctype and ctype not in ("text/csv", "application/vnd.ms-excel", "application/csv", "text/plain"):
        return Response({"detail": f"Tipo MIME no permitido: {ctype}"}, status=status.HTTP_400_BAD_REQUEST)
    size = int(getattr(f, "size", 0) or 0)
    if size > 5 * 1024 * 1024:
        return Response({"detail": "El archivo supera 5MB"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        text_stream = io.TextIOWrapper(f.file, encoding="utf-8-sig")
    except Exception:
        content = f.read(); text_stream = io.StringIO(content.decode("utf-8", errors="ignore"))
    reader = csv.DictReader(text_stream)
    created_asig = 0
    existing_asig = 0
    created_ras = 0
    errors = []
    max_rows = 5000
    for idx, raw in enumerate(reader, start=2):
        if idx-1 > max_rows:
            errors.append({"row": idx, "error": f"Se excede límite de {max_rows} filas"})
            break
        d = { (k or "").strip().lower(): (v.strip() if isinstance(v, str) else v) for k, v in (raw or {}).items() }
        for k in list(d.keys()):
            v = d[k]
            if isinstance(v, str):
                d[k] = v.replace('\x00','').strip()[:255]
        codigo = d.get("codigo_asignatura") or d.get("asignatura") or d.get("codigo")
        nombre = d.get("nombre_asignatura") or d.get("nombre") or d.get("nombre_curso")
        codigo_doc = d.get("codigo_docente") or d.get("docente")
        codigo_prog = d.get("codigo_programa") or d.get("programa")
        grupo = d.get("grupo") or None
        ra_desc = d.get("ra_descripcion") or d.get("ra_desc") or d.get("descripcion_ra")
        raw_pct = d.get("ra_porcentaje") or d.get("ra_pct") or d.get("porcentaje_ra")
        if not (codigo and nombre and codigo_doc and codigo_prog):
            errors.append({"row": idx, "error": "Faltan columnas requeridas asignatura"}); continue
        docente = Docente.objects.filter(codigo_docente=codigo_doc).first()
        if not docente:
            errors.append({"row": idx, "error": f"Docente no encontrado: {codigo_doc}"}); continue
        programa = Programa.objects.filter(codigo_programa=codigo_prog).first()
        if not programa:
            errors.append({"row": idx, "error": f"Programa no encontrado: {codigo_prog}"}); continue
        asign = Asignatura.objects.filter(codigo_asignatura=codigo).first()
        if not asign:
            try:
                asign = Asignatura.objects.create(
                    nombre=nombre, codigo_asignatura=codigo, docente=docente,
                    grupo=grupo, programa=programa
                )
                created_asig += 1
            except Exception as e:
                errors.append({"row": idx, "error": f"No se pudo crear asignatura ({e})"}); continue
        else:
            existing_asig += 1
            # Opcional: actualizar nombre/grupo si difiere
            changed = False
            if nombre and asign.nombre != nombre:
                asign.nombre = nombre; changed = True
            if grupo and asign.grupo != grupo:
                asign.grupo = grupo; changed = True
            if changed:
                try:
                    asign.save(update_fields=["nombre", "grupo"])
                except Exception:
                    pass
        # Crear RA si columnas presentes
        if ra_desc and raw_pct is not None and raw_pct != "":
            try:
                pct = float(raw_pct)
            except (TypeError, ValueError):
                errors.append({"row": idx, "error": f"ra_porcentaje inválido: {raw_pct}"}); continue
            if pct < 0 or pct > 100:
                errors.append({"row": idx, "error": f"ra_porcentaje fuera de rango: {pct}"}); continue
            suma_actual = (ResultadoDeAprendizaje.objects.filter(asignatura=asign).aggregate(v=Sum("porcentaje_ra"))["v"] or 0)
            if float(suma_actual) + pct > 100.0:
                errors.append({"row": idx, "error": f"Suma RA excede 100% ({float(suma_actual)+pct:.2f})"}); continue
            try:
                ResultadoDeAprendizaje.objects.create(asignatura=asign, porcentaje_ra=pct, descripcion=ra_desc)
                created_ras += 1
            except Exception as e:
                errors.append({"row": idx, "error": f"No se pudo crear RA ({e})"})
    if len(errors) > 100:
        errors = errors[:100] + [{"more": "se omitieron errores adicionales"}]
    payload = {
        "created_asignaturas": created_asig,
        "existing_asignaturas": existing_asig,
        "created_ras": created_ras,
        "errors": errors,
    }
    try:
        logger.info("import_asignaturas_ras: %s", {
            "coordinador": getattr(coord, "codigo_coordinador", None),
            "filename": getattr(f, "name", None),
            "created_asignaturas": created_asig,
            "existing_asignaturas": existing_asig,
            "created_ras": created_ras,
            "errors_count": len(errors)
        })
        ImportAudit.objects.create(
            coordinador=coord,
            kind="asignaturas_ras",
            filename=fname,
            created_count=(created_asig + created_ras),
            existing_count=existing_asig,
            errors_count=len(errors),
        )
    except Exception:
        pass
    return Response(payload, status=status.HTTP_200_OK)

@api_view(["POST", "GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def logout_view(request):
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def password_forgot_view(request):
    """
    Endpoint para solicitar recuperación de contraseña mediante OTP.
    
    Busca el correo primero en Estudiantes, luego en Docentes.
    Genera un código OTP de 6 dígitos y lo envía por correo electrónico.
    
    Request Body:
        - email (str): Correo electrónico del usuario
    
    Response:
        - 200: {"ok": true, "message": "Si el correo existe, recibirás un código OTP"}
        - 400: Error de validación
    """
    import random
    from django.utils import timezone
    from datetime import timedelta
    from ..models.models import PasswordResetOTP
    from ..serializers.serializers import PasswordForgotSerializer

    # Validar datos de entrada con serializer
    serializer = PasswordForgotSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"]
    
    # Buscar usuario por correo - PRIORIDAD: Estudiantes primero, luego Docentes
    user = None
    rol = None
    
    # 1. Buscar en Estudiantes
    estudiante = Estudiante.objects.filter(correo__iexact=email).first()
    if estudiante:
        user = estudiante
        rol = "estudiante"
    else:
        # 2. Si no es estudiante, buscar en Docentes
        docente = Docente.objects.filter(correo__iexact=email).first()
        if docente:
            user = docente
            rol = "docente"

    # Siempre responder 200 OK para evitar enumeración de usuarios
    # (no revelar si el email existe o no en la base de datos)
    if user and rol:
        try:
            # Invalidar todos los OTPs anteriores no usados del mismo email
            PasswordResetOTP.objects.filter(
                email__iexact=email, 
                is_used=False
            ).update(is_used=True)

            # Generar código OTP de 6 dígitos aleatorio
            otp_code = str(random.randint(100000, 999999))
            
            # Crear nuevo registro OTP con expiración de 5 minutos (según requisitos)
            expires_at = timezone.now() + timedelta(minutes=5)
            PasswordResetOTP.objects.create(
                email=email.lower(),
                otp_code=otp_code,
                expires_at=expires_at,
                rol=rol
            )

            # Preparar y enviar correo electrónico
            subject = "Código de Recuperación de Contraseña - RA Manager"
            message = (
                f"Hola {user.nombre},\n\n"
                "Recibimos una solicitud para restablecer tu contraseña en RA Manager.\n\n"
                f"Tu código de verificación es: {otp_code}\n\n"
                "⚠️ Este código es válido por 5 minutos.\n\n"
                "Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.\n\n"
                "Saludos,\n"
                "Equipo RA Manager\n"
                "Universidad del Valle"
            )
            
            # Enviar correo (fail_silently=False para capturar errores en desarrollo)
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False  # Cambiar a True en producción si se desea
            )
            
        except Exception as e:
            # Log del error pero no exponer detalles al usuario
            logger = logging.getLogger(__name__)
            logger.error(f"Error al enviar OTP a {email}: {str(e)}")
            # Continuar con respuesta genérica por seguridad

    return Response({
        "ok": True,
        "message": "Si el correo está registrado, recibirás un código de verificación"
    })

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def verify_otp_view(request):
    """
    Endpoint para verificar un código OTP.
    
    Valida que el código OTP sea correcto, no esté usado y no haya expirado.
    
    Request Body:
        - email (str): Correo electrónico del usuario
        - otp_code (str): Código OTP de 6 dígitos
    
    Response:
        - 200: {"ok": true, "message": "Código verificado correctamente"}
        - 400: Código inválido o expirado
    """
    from django.utils import timezone
    from ..models.models import PasswordResetOTP
    from ..serializers.serializers import VerifyOTPSerializer

    # Validar datos de entrada con serializer
    serializer = VerifyOTPSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"]
    otp_code = serializer.validated_data["otp_code"]

    # Buscar el OTP más reciente que coincida y sea válido
    otp = PasswordResetOTP.objects.filter(
        email__iexact=email,
        otp_code=otp_code,
        is_used=False,
        expires_at__gt=timezone.now()
    ).order_by('-created_at').first()

    if not otp:
        return Response(
            {"message": "Código OTP inválido o expirado. Por favor, solicita uno nuevo."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verificar si está a punto de expirar (opcional: advertir al usuario)
    time_remaining = (otp.expires_at - timezone.now()).total_seconds()
    warning = None
    if time_remaining < 60:  # Menos de 1 minuto restante
        warning = "Tu código expirará pronto. Completa el proceso rápidamente."

    response_data = {
        "ok": True,
        "message": "Código verificado correctamente. Procede a cambiar tu contraseña."
    }
    
    if warning:
        response_data["warning"] = warning

    return Response(response_data)

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def password_reset_view(request):
    """
    Endpoint para restablecer la contraseña usando un código OTP verificado.
    
    Cambia la contraseña del usuario y marca el OTP como usado.
    Utiliza transacciones para garantizar consistencia.
    
    Request Body:
        - email (str): Correo electrónico del usuario
        - otp_code (str): Código OTP de 6 dígitos
        - password (str): Nueva contraseña (mínimo 6 caracteres)
    
    Response:
        - 200: {"ok": true, "message": "Contraseña actualizada correctamente"}
        - 400: Error de validación o código inválido
        - 404: Usuario no encontrado
    """
    from django.utils import timezone
    from django.db import transaction
    from ..models.models import PasswordResetOTP
    from ..serializers.serializers import PasswordResetSerializer

    # Validar datos de entrada con serializer
    serializer = PasswordResetSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"]
    otp_code = serializer.validated_data["otp_code"]
    new_password = serializer.validated_data["password"]

    # Buscar el OTP más reciente que coincida y sea válido
    otp = PasswordResetOTP.objects.filter(
        email__iexact=email,
        otp_code=otp_code,
        is_used=False,
        expires_at__gt=timezone.now()
    ).order_by('-created_at').first()

    if not otp:
        return Response(
            {"message": "Código OTP inválido o expirado. Solicita un nuevo código."},
            status=status.HTTP_400_BAD_REQUEST
        )

    rol = otp.rol

    try:
        # Usar transacción para garantizar atomicidad
        with transaction.atomic():
            # Buscar y actualizar contraseña según el rol
            user = None
            
            if rol == "docente":
                user = Docente.objects.filter(correo__iexact=email).first()
                if not user:
                    return Response(
                        {"message": "Usuario docente no encontrado"},
                        status=status.HTTP_404_NOT_FOUND
                    )
                # Actualizar contraseña hasheada
                user.contrasenia_docente = make_password(new_password)
                user.save(update_fields=["contrasenia_docente"])
                
            elif rol == "estudiante":
                user = Estudiante.objects.filter(correo__iexact=email).first()
                if not user:
                    return Response(
                        {"message": "Usuario estudiante no encontrado"},
                        status=status.HTTP_404_NOT_FOUND
                    )
                # Actualizar contraseña hasheada
                user.contrasena_estudiante = make_password(new_password)
                user.save(update_fields=["contrasena_estudiante"])
            else:
                return Response(
                    {"message": "Rol de usuario no válido"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Marcar el OTP como usado para evitar reutilización
            otp.is_used = True
            otp.save(update_fields=["is_used"])

            # Invalidar cualquier otro OTP pendiente para este email por seguridad
            PasswordResetOTP.objects.filter(
                email__iexact=email,
                is_used=False
            ).exclude(id=otp.id).update(is_used=True)

        # Log de éxito (opcional)
        logger_instance = logging.getLogger(__name__)
        logger_instance.info(f"Contraseña restablecida exitosamente para {email} (rol: {rol})")

        return Response({
            "ok": True,
            "message": "Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión."
        })

    except Exception as e:
        # Log del error
        logger_instance = logging.getLogger(__name__)
        logger_instance.error(f"Error al restablecer contraseña para {email}: {str(e)}")
        
        return Response(
            {"message": "Error al actualizar la contraseña. Por favor, intenta nuevamente."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

class TipoDocumentoViewSet(viewsets.ModelViewSet):
    queryset = TipoDocumento.objects.all()
    serializer_class = TipoDocumentoSerializer

class TipoActividadViewSet(viewsets.ModelViewSet):
    queryset = TipoActividad.objects.all()
    serializer_class = TipoActividadSerializer

class ProgramaViewSet(viewsets.ModelViewSet):
    queryset = Programa.objects.all()
    serializer_class = ProgramaSerializer

class DocenteViewSet(viewsets.ModelViewSet):
    queryset = Docente.objects.all()
    serializer_class = DocenteSerializer

class EstudianteViewSet(viewsets.ModelViewSet):
    queryset = Estudiante.objects.all()
    serializer_class = EstudianteSerializer

class AsignaturaViewSet(viewsets.ModelViewSet):
    queryset = Asignatura.objects.all()
    serializer_class = AsignaturaSerializer
    lookup_field = "codigo_asignatura"

    def get_queryset(self):
        qs = super().get_queryset()
        req = self.request
        docente_id = req.query_params.get("id_docente")
        docente_code = req.query_params.get("docente") or req.query_params.get("codigo_docente") or req.query_params.get("codigo")
        estudiante_id = req.query_params.get("id_estudiante")
        estudiante_code = req.query_params.get("estudiante") or req.query_params.get("codigo_estudiante")
        if docente_id: return qs.filter(docente__id_docente=docente_id)
        if docente_code: return qs.filter(docente__codigo_docente=docente_code)
        if estudiante_id: return qs.filter(matricula__estudiante__id_estudiante=estudiante_id).distinct()
        if estudiante_code: return qs.filter(matricula__estudiante__codigo_estudiante=estudiante_code).distinct()
        token = _bearer_token(req)
        if token:
            try:
                data = signing.loads(token, max_age=TOKEN_MAX_AGE)
                if data.get("rol") == "docente":
                    return qs.filter(docente__id_docente=data.get("id"))
                if data.get("rol") == "estudiante":
                    return qs.filter(matricula__estudiante__id_estudiante=data.get("id")).distinct()
            except Exception:
                pass
        return qs

    @action(detail=True, methods=["get"])
    def estudiantes(self, request, codigo_asignatura=None):
        asignatura = self.get_object()
        qs = Matricula.objects.filter(asignatura=asignatura).select_related("estudiante", "periodo")
        pid = request.query_params.get("id_periodo")
        periodo_desc = request.query_params.get("periodo")
        if pid:
            qs = qs.filter(periodo_id=pid)
        elif periodo_desc:
            p = PeriodoAcademico.objects.filter(descripcion=periodo_desc).first()
            if p: qs = qs.filter(periodo=p)
        rows = [{
            "id_estudiante": m.estudiante_id,
            "codigo_estudiante": m.estudiante.codigo_estudiante,
            "nombre": m.estudiante.nombre,
            "apellido": m.estudiante.apellido,
            "primer_nombre": m.estudiante.nombre,  # Compatibilidad
            "primer_apellido": m.estudiante.apellido,  # Compatibilidad
            "id_matricula": m.id_matricula,
            "periodo": m.periodo.descripcion,
        } for m in qs.order_by("estudiante__nombre", "estudiante__apellido")]
        return Response(rows)

    @action(detail=True, methods=["get"], url_path="mi-matricula")
    def mi_matricula(self, request, codigo_asignatura=None):
        asignatura = self.get_object()
        token = _bearer_token(request)
        student_id = None
        if token:
            try:
                data = signing.loads(token, max_age=TOKEN_MAX_AGE)
                if data.get("rol") == "estudiante":
                    student_id = data.get("id")
            except Exception:
                pass
        if not student_id:
            student_id = request.query_params.get("id_estudiante")
        if not student_id:
            return Response({"detail": "id_estudiante requerido"}, status=status.HTTP_400_BAD_REQUEST)
        mat = Matricula.objects.filter(asignatura=asignatura, estudiante_id=student_id).order_by("-id_matricula").first()
        if not mat:
            return Response({"id_matricula": None}, status=status.HTTP_200_OK)
        return Response({"id_matricula": mat.id_matricula}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="periodos")
    def periodos(self, request, codigo_asignatura=None):
        asignatura = self.get_object()
        qs = (PeriodoAcademico.objects
              .filter(matricula__asignatura=asignatura)
              .distinct()
              .order_by("fecha_inicio"))
        return Response([{"id_periodo": p.id_periodo, "descripcion": p.descripcion} for p in qs])

    @action(detail=True, methods=["get"], url_path="ras")
    def ras(self, request, codigo_asignatura=None):
        asignatura = self.get_object()
        qs = ResultadoDeAprendizaje.objects.filter(asignatura=asignatura).order_by("id_ra")
        return Response([{
            "id_ra": r.id_ra,
            "id": r.id_ra,
            "porcentaje_ra": float(r.porcentaje_ra),
            "descripcion": r.descripcion,
        } for r in qs])

    @action(detail=True, methods=["get", "post"], url_path="recursos", permission_classes=[AllowAny], authentication_classes=[])
    def recursos(self, request, codigo_asignatura=None):
        # Buscar asignatura por código
        asign = Asignatura.objects.filter(codigo_asignatura=codigo_asignatura).first()
        if not asign:
            return Response({"detail": "Asignatura no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        # GET: listar recursos con URL absoluta para descarga
        if request.method.lower() == "get":
            qs = Recurso.objects.filter(asignatura=asign).order_by("-fecha_subida")
            base_url = request.build_absolute_uri("/")[:-1]  # http://localhost:8000
            out = []
            for r in qs:
                rel = r.archivo.url if hasattr(r.archivo, "url") else ""
                abs_url = (base_url + rel) if rel.startswith("/") else rel
                out.append({
                    "id_recurso": r.id_recurso,
                    "titulo": r.titulo,
                    "archivo": rel,
                    "archivo_url": abs_url,
                    "fecha_subida": r.fecha_subida,
                })
            return Response(out)

        # POST: subir archivo
        titulo = request.data.get("titulo") or request.data.get("title") or "Recurso"
        f = request.FILES.get("file") or request.FILES.get("archivo")
        if not f:
            return Response({"detail": "Archivo requerido (file)"}, status=status.HTTP_400_BAD_REQUEST)
        rec = Recurso.objects.create(asignatura=asign, titulo=titulo, archivo=f)
        abs_url = request.build_absolute_uri(rec.archivo.url)
        return Response({
            "id_recurso": rec.id_recurso,
            "titulo": rec.titulo,
            "archivo": rec.archivo.url,
            "archivo_url": abs_url,
            "fecha_subida": rec.fecha_subida,
        }, status=status.HTTP_201_CREATED)

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def ra_indicadores_view(request, ra_id: int):
    inds = IndicadoresDeLogro.objects.filter(ra_id=ra_id).order_by("id_ind")
    return Response([{
        "id": ind.id_ind,
        "id_ind": ind.id_ind,
        "descripcion": ind.descripcion,
        "porcentaje_ind": float(ind.porcentaje_ind),
    } for ind in inds])

@api_view(["DELETE"])
@permission_classes([AllowAny])
@authentication_classes([])
def ra_indicador_detail_view(request, ra_id: int, ind_id: int):
    """
    DELETE: Elimina un indicador de logro de un RA.
      Requiere:
        - Header Authorization con token de docente
        - Body: { password: "..." }

      Efectos:
        - Elimina el Indicador (cascada elimina vínculos ra_actividad_indicador)
        - En notas_actividad, el indicador asociado se establece en NULL (SET_NULL)
    """
    ind = IndicadoresDeLogro.objects.filter(pk=ind_id, ra_id=ra_id).first()
    if not ind:
        return Response({"detail": "Indicador no encontrado para este RA"}, status=status.HTTP_404_NOT_FOUND)

    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    if tok.get("rol") != "docente":
        return Response({"detail": "Sólo un docente puede eliminar indicadores"}, status=status.HTTP_403_FORBIDDEN)
    docente_id = tok.get("id")
    doc = Docente.objects.filter(pk=docente_id).first()
    if not doc:
        return Response({"detail": "Docente no encontrado"}, status=status.HTTP_401_UNAUTHORIZED)

    password = (request.data or {}).get("password")
    if not password:
        return Response({"message": "Se requiere la contraseña para confirmar la eliminación"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        if not check_password(password, doc.contrasenia_docente) and password != (doc.contrasenia_docente or ""):
            return Response({"message": "Contraseña incorrecta"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        pass

    with transaction.atomic():
        # Eliminación en cascada de relaciones se maneja por FK CASCADE en RaActividadIndicador
        ind.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def ra_actividades_view(request, ra_id: int):
    if request.method == "GET":
        id_matricula = request.query_params.get("id_matricula")
        rels = (RaActividad.objects
                .filter(ra_id=ra_id)
                .select_related("actividad__tipo_actividad")
                .prefetch_related("indicadores_rel__indicador"))
        out = []
        for rel in rels:
            act = rel.actividad
            inds = [
                {
                    "id_ind": rir.indicador_id,
                    "descripcion": rir.indicador.descripcion,
                    "porcentaje_ind": float(rir.indicador.porcentaje_ind),
                }
                for rir in rel.indicadores_rel.all()
            ]
            row = {
                "id_actividad": act.id_actividad,
                "id_ra_actividad": rel.id_ra_actividad,
                "nombre_actividad": act.nombre_actividad,
                "descripcion": act.descripcion,
                "porcentaje_ra_actividad": float(rel.porcentaje_ra_actividad),
                "id_tipo_actividad": act.tipo_actividad_id,
                "tipo_actividad": getattr(act.tipo_actividad, "descripcion", None),
                "fecha_cierre": act.fecha_cierre,
                "indicadores": inds,
            }
            if id_matricula:
                # Si hay múltiples indicadores, pueden existir múltiples notas
                # Devolver la nota con indicador coincidente si existe, sino la primera
                notas = list(NotasActividad.objects
                        .filter(matricula_id=id_matricula, ra_actividad_id=rel.id_ra_actividad)
                        .order_by('-indicador_id'))  # Priorizamos las que tienen indicador
                
                # Si solo hay un indicador asignado, buscar su nota específica
                if len(inds) == 1 and notas:
                    nota_especifica = next((n for n in notas if n.indicador_id == inds[0]["id_ind"]), None)
                    nota = nota_especifica or notas[0]
                elif notas:
                    # Si hay múltiples indicadores o ninguno, tomar la primera nota
                    nota = notas[0]
                else:
                    nota = None
                    
                if nota:
                    row["nota"] = float(nota.nota_ra_actividad) if nota.nota_ra_actividad is not None else None
                    row["retroalimentacion"] = nota.retroalimentacion
                    row["id_ind"] = nota.indicador_id
            out.append(row)
        return Response(out, status=status.HTTP_200_OK)

    body = request.data or {}
    nombre = body.get("nombre_actividad")
    id_tipo = body.get("id_tipo_actividad")
    porcentaje_ra_actividad = body.get("porcentaje_ra_actividad")
    descripcion = body.get("descripcion")
    fecha_cierre = body.get("fecha_cierre")
    indicadores = body.get("indicadores")  # Lista opcional de ids de indicadores

    if not (nombre and id_tipo is not None):
        return Response({"message": "Campos requeridos: nombre_actividad, id_tipo_actividad"},
                        status=status.HTTP_400_BAD_REQUEST)

    # fecha_cierre es obligatoria y no puede ser en el pasado
    if not fecha_cierre:
        return Response({"message": "fecha_cierre es requerido (AAAA-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        fecha_cierre_dt = datetime.datetime.strptime(str(fecha_cierre), "%Y-%m-%d").date()
    except ValueError:
        return Response({"message": "fecha_cierre debe tener formato AAAA-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
    hoy = datetime.date.today()
    if fecha_cierre_dt < hoy:
        return Response({"message": "fecha_cierre no puede ser anterior a hoy"}, status=status.HTTP_400_BAD_REQUEST)

    # porcentaje_ra_actividad es obligatorio y debe ser > 0 y <= 100
    if porcentaje_ra_actividad is None or str(porcentaje_ra_actividad).strip() == "":
        return Response({"message": "porcentaje_ra_actividad es requerido"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        pct_value = float(porcentaje_ra_actividad)
    except (TypeError, ValueError):
        return Response({"message": "porcentaje_ra_actividad debe ser numérico"}, status=status.HTTP_400_BAD_REQUEST)
    if pct_value <= 0 or pct_value > 100:
        return Response({"message": "porcentaje_ra_actividad debe ser mayor que 0 y no exceder 100"}, status=status.HTTP_400_BAD_REQUEST)

    suma_actual = (RaActividad.objects.filter(ra_id=ra_id)
                   .aggregate(v=Sum("porcentaje_ra_actividad"))["v"] or 0)
    nuevo_total = float(suma_actual) + float(pct_value)
    if nuevo_total > 100.0:
        return Response({"message": f"El porcentaje total del RA excede 100% ({nuevo_total:.2f}%). Ajusta porcentaje_ra_actividad."},
                        status=status.HTTP_400_BAD_REQUEST)

    # indicadores es obligatorio (al menos uno) y deben pertenecer al RA
    if not isinstance(indicadores, (list, tuple)) or len(indicadores) == 0:
        return Response({"message": "Debes asignar al menos un indicador del RA"}, status=status.HTTP_400_BAD_REQUEST)
    valid_inds = set(IndicadoresDeLogro.objects.filter(ra_id=ra_id, id_ind__in=indicadores).values_list("id_ind", flat=True))
    if not valid_inds:
        # Puede ser que el RA no tenga indicadores o que los ids no correspondan
        exists_any = IndicadoresDeLogro.objects.filter(ra_id=ra_id).exists()
        if not exists_any:
            return Response({"message": "Este RA no tiene indicadores definidos. No se puede crear la actividad sin indicadores."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": "Los indicadores enviados no corresponden al RA"}, status=status.HTTP_400_BAD_REQUEST)

    act = Actividad.objects.create(
        tipo_actividad_id=id_tipo,
        nombre_actividad=nombre,
        descripcion=descripcion,
        fecha_creacion=datetime.date.today(),
        fecha_cierre=fecha_cierre_dt,
    )
    rel = RaActividad.objects.create(actividad=act, ra_id=ra_id, porcentaje_ra_actividad=pct_value)
    # Asignar indicadores (obligatorios ya validados)
    bulk = [RaActividadIndicador(ra_actividad=rel, indicador_id=i) for i in valid_inds]
    RaActividadIndicador.objects.bulk_create(bulk, ignore_conflicts=True)
    
    # 🔔 Crear notificación personalizada para cada estudiante del curso
    try:
        ra_obj = ResultadoDeAprendizaje.objects.filter(pk=ra_id).select_related('asignatura').first()
        if ra_obj:
            asignatura = ra_obj.asignatura
            # Obtener todos los estudiantes matriculados en la asignatura
            matriculas = Matricula.objects.filter(asignatura=asignatura).select_related('estudiante')
            
            fecha_str = fecha_cierre_dt.strftime("%d/%m/%Y")
            notif_link = f"/estudiante?curso={asignatura.codigo_asignatura}"
            
            # Crear notificación personalizada para cada estudiante
            for mat in matriculas:
                notif_text = f"🎯 {mat.estudiante.primer_nombre}, nueva actividad en {asignatura.nombre}: {nombre} - Vence: {fecha_str}"
                _add_notification(mat.estudiante_id, "deadline", notif_text, notif_link)
    except Exception:
        pass  # No fallar si hay error en notificación
    
    return Response({
        "id_actividad": act.id_actividad,
        "id_ra_actividad": rel.id_ra_actividad,
        "nombre_actividad": act.nombre_actividad,
        "porcentaje_ra_actividad": float(rel.porcentaje_ra_actividad),
    }, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([AllowAny])
@authentication_classes([])
def ra_actividad_detail_view(request, ra_id: int, rel_id: int):
    """
    PATCH: Actualiza una actividad (y/o su relación con el RA) validando reglas de porcentajes.
      Body opcional:
    - nombre_actividad, descripcion, fecha_cierre (AAAA-MM-DD)
        - porcentaje_ra_actividad (para la relación actual con este RA)
        - indicadores: [ids] (reemplaza el set de indicadores para esta relación)

    DELETE: Elimina la relación RA-Actividad. Si la Actividad no queda asociada a ningún RA, elimina también la Actividad.
      Requiere password del perfil del docente en body: { password: "..." }
      (La doble confirmación se gestiona en el front; aquí sólo se valida contraseña y se elimina.)
    """
    rel = (RaActividad.objects
           .filter(pk=rel_id, ra_id=ra_id)
           .select_related("actividad")
           .first())
    if not rel:
        return Response({"detail": "Relación RA-Actividad no existe"}, status=status.HTTP_404_NOT_FOUND)

    act = rel.actividad

    if request.method == "PATCH":
        body = request.data or {}
        nombre = body.get("nombre_actividad")
        descripcion = body.get("descripcion")
        pct_rel = body.get("porcentaje_ra_actividad")
        fecha_cierre = body.get("fecha_cierre")
        indicadores = body.get("indicadores")

        # Parse fecha si viene
        fecha_cierre_dt = act.fecha_cierre
        if fecha_cierre is not None:
            if fecha_cierre == "" or fecha_cierre is None:
                fecha_cierre_dt = None
            else:
                try:
                    fecha_cierre_dt = datetime.datetime.strptime(str(fecha_cierre), "%Y-%m-%d").date()
                except ValueError:
                    return Response({"message": "fecha_cierre debe tener formato AAAA-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

        # Validaciones de porcentajes
        # 1) Si cambia porcentaje_ra_actividad, la suma en este RA no debe pasar 100
        if pct_rel is not None:
            try:
                pct_rel_f = float(pct_rel)
            except (TypeError, ValueError):
                return Response({"message": "porcentaje_ra_actividad debe ser numérico"}, status=status.HTTP_400_BAD_REQUEST)
            suma_otros = (RaActividad.objects
                          .filter(ra_id=ra_id)
                          .exclude(pk=rel.id_ra_actividad)
                          .aggregate(v=Sum("porcentaje_ra_actividad"))['v'] or 0)
            if float(suma_otros) + pct_rel_f > 100.0 + 1e-6:
                return Response({
                    "message": f"El RA {ra_id} excede 100% con este aporte ({float(suma_otros)+pct_rel_f:.2f}%). Ajusta porcentaje_ra_actividad.",
                    "ra_id": ra_id,
                    "suma_actual": float(suma_otros),
                }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Actualizar actividad
            updates_act = []
            if nombre is not None:
                act.nombre_actividad = nombre
                updates_act.append("nombre_actividad")
            if descripcion is not None:
                act.descripcion = descripcion
                updates_act.append("descripcion")
            if fecha_cierre is not None:
                act.fecha_cierre = fecha_cierre_dt
                updates_act.append("fecha_cierre")
            if updates_act:
                act.save(update_fields=updates_act)

            # Actualizar relación
            if pct_rel is not None:
                rel.porcentaje_ra_actividad = pct_rel
                rel.save(update_fields=["porcentaje_ra_actividad"])

            # Reemplazar indicadores si vienen
            if isinstance(indicadores, (list, tuple)):
                # Validar que sean del mismo RA
                valid_inds = set(IndicadoresDeLogro.objects.filter(ra_id=ra_id, id_ind__in=indicadores).values_list("id_ind", flat=True))
                # Borrar actuales y crear nuevos
                RaActividadIndicador.objects.filter(ra_actividad=rel).delete()
                bulk = [RaActividadIndicador(ra_actividad=rel, indicador_id=i) for i in valid_inds]
                if bulk:
                    RaActividadIndicador.objects.bulk_create(bulk, ignore_conflicts=True)

        return Response({
            "id_actividad": act.id_actividad,
            "id_ra_actividad": rel.id_ra_actividad,
            "nombre_actividad": act.nombre_actividad,
            "porcentaje_ra_actividad": float(rel.porcentaje_ra_actividad),
            "descripcion": act.descripcion,
            "fecha_cierre": act.fecha_cierre,
        })

    # DELETE
    # Validar token para conocer rol y usuario; exigir contraseña del docente
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    if tok.get("rol") != "docente":
        return Response({"detail": "Sólo un docente puede eliminar actividades"}, status=status.HTTP_403_FORBIDDEN)
    docente_id = tok.get("id")
    doc = Docente.objects.filter(pk=docente_id).first()
    if not doc:
        return Response({"detail": "Docente no encontrado"}, status=status.HTTP_401_UNAUTHORIZED)

    password = (request.data or {}).get("password")
    if not password:
        return Response({"message": "Se requiere la contraseña para confirmar la eliminación"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        if not check_password(password, doc.contrasenia_docente) and password != (doc.contrasenia_docente or ""):
            return Response({"message": "Contraseña incorrecta"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        # Si la contraseña en DB está en plano (entorno de prueba), permitir comparación directa arriba
        pass

    with transaction.atomic():
        # Eliminar relación y sus indicadores asociados
        RaActividadIndicador.objects.filter(ra_actividad=rel).delete()
        rel.delete()
        # Si la actividad ya no tiene más relaciones, eliminar la actividad (y notas vía FK)
        if not RaActividad.objects.filter(actividad=act).exists():
            act.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(["POST", "PUT"])
@permission_classes([AllowAny])
@authentication_classes([])
def notas_view(request):
    body = request.data or {}
    id_matricula = body.get("id_matricula")
    id_ra_actividad = body.get("id_ra_actividad")
    nota = body.get("nota")
    retro = body.get("retroalimentacion")
    id_ind = body.get("id_ind")
    if not (id_matricula and id_ra_actividad and nota is not None):
        return Response({"detail": "Campos requeridos"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Incluir indicador en la búsqueda para permitir múltiples notas por indicador
    obj, created = NotasActividad.objects.get_or_create(
        matricula_id=id_matricula,
        ra_actividad_id=id_ra_actividad,
        indicador_id=id_ind,  # Incluido en la clave única
        defaults={"nota_ra_actividad": nota, "retroalimentacion": retro},
    )
    if not created:
        obj.nota_ra_actividad = nota
        obj.retroalimentacion = retro
        obj.save(update_fields=["nota_ra_actividad", "retroalimentacion"])
    
    # 🔔 Crear notificación personalizada para el estudiante
    try:
        matricula = obj.matricula
        ra_act = obj.ra_actividad
        actividad = ra_act.actividad
        asignatura = ra_act.ra.asignatura
        estudiante = matricula.estudiante
        
        # Mensaje personalizado con el nombre del estudiante
        notif_text = f"📝 {estudiante.primer_nombre}, tu calificación en {asignatura.nombre}: {actividad.nombre_actividad} es {nota}/5"
        notif_link = f"/estudiante?curso={asignatura.codigo_asignatura}"
        
        _add_notification(estudiante.id_estudiante, "grade", notif_text, notif_link)
    except Exception:
        pass  # No fallar si hay error en notificación
    
    return Response({
        "id": obj.id,
        "id_matricula": obj.matricula_id,
        "id_ra_actividad": obj.ra_actividad_id,
        "nota": float(obj.nota_ra_actividad) if obj.nota_ra_actividad is not None else None,
        "retroalimentacion": obj.retroalimentacion,
        "id_ind": obj.indicador_id,
    }, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def course_student_indicators_view(request, codigo_asignatura: str, id_estudiante: int):
    asignatura = Asignatura.objects.filter(codigo_asignatura=codigo_asignatura).first()
    if not asignatura:
        return Response({"detail": "Asignatura no existe"}, status=status.HTTP_404_NOT_FOUND)
    mat = Matricula.objects.filter(asignatura=asignatura, estudiante_id=id_estudiante).order_by("-id_matricula").first()
    if not mat:
        return Response([], status=status.HTTP_200_OK)
    inds = IndicadoresDeLogro.objects.filter(ra__asignatura=asignatura).select_related("ra")
    rows = []
    for ind in inds:
        qs = NotasActividad.objects.filter(matricula=mat, indicador_id=ind.id_ind)
        avg_nota = qs.aggregate(v=Avg("nota_ra_actividad"))["v"]
        rows.append({
            "id_ind": ind.id_ind,
            "ra_id": ind.ra_id,
            "descripcion": ind.descripcion,
            "porcentaje_ind": float(ind.porcentaje_ind),
            "avg_nota": float(avg_nota) if avg_nota is not None else None,
            "avg_pct": float(avg_nota * 20) if avg_nota is not None else None,
        })
    return Response(rows)


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def course_grade_view(request, codigo_asignatura: str, id_estudiante: int):
    """
    Devuelve el consolidado de calificaciones de un estudiante en una asignatura,
    usando únicamente porcentajes de RA (porcentaje_ra) y los aportes de actividades
    dentro de cada RA (porcentaje_ra_actividad). El peso interno de la actividad NO existe.

    Calcula dos variantes:
      - strict: trata actividades no calificadas como 0 (aplican su peso igualmente).
      - progressive: normaliza sobre el peso ya calificado (no penaliza lo pendiente).

    Respuesta ejemplo:
    {
      "asignatura": { "codigo": "CS101", "nombre": "Curso" },
      "matricula_id": 123,
      "total": { "strict": 3.45, "progressive": 4.10, "coverage": 0.65 },
      "ras": [
        {
          "id_ra": 10,
          "descripcion": "...",
          "porcentaje_ra": 40.0,
          "strict": 3.30,
          "progressive": 4.12,
          "coverage": 0.50,
          "actividades": [
            { "id_ra_actividad": 55, "id_actividad": 77, "nombre": "Quiz", "porcentaje_ra_actividad": 25.0, "nota": 4.0 }
          ]
        }
      ]
    }
    """
    asig = Asignatura.objects.filter(codigo_asignatura=codigo_asignatura).first()
    if not asig:
        return Response({"detail": "Asignatura no existe"}, status=status.HTTP_404_NOT_FOUND)

    mat = (Matricula.objects
           .filter(asignatura=asig, estudiante_id=id_estudiante)
           .order_by("-id_matricula")
           .first())
    if not mat:
        return Response({"detail": "Sin matrícula para este estudiante en la asignatura"}, status=status.HTTP_404_NOT_FOUND)

    # RAs de la asignatura
    ras = list(ResultadoDeAprendizaje.objects.filter(asignatura=asig))

    out_ras = []
    total_strict = 0.0
    total_prog = 0.0
    total_coverage = 0.0  # cobertura ponderada por RA

    for ra in ras:
        rels = list(RaActividad.objects.filter(ra=ra).select_related("actividad"))

        # Construir lista de (nota, w_ra_act)
        items = []
        sum_w = 0.0
        sum_w_graded = 0.0
        acc_strict = 0.0
        for rel in rels:
            w = float(rel.porcentaje_ra_actividad) / 100.0
            sum_w += w
            nota_obj = NotasActividad.objects.filter(matricula=mat, ra_actividad=rel).first()
            nota = float(nota_obj.nota_ra_actividad) if (nota_obj and nota_obj.nota_ra_actividad is not None) else None
            if nota is not None:
                sum_w_graded += w
                acc_strict += nota * w
            items.append({
                "id_ra_actividad": rel.id_ra_actividad,
                "id_actividad": rel.actividad_id,
                "nombre": getattr(rel.actividad, "nombre_actividad", None),
                "porcentaje_ra_actividad": float(rel.porcentaje_ra_actividad),
                "nota": nota,
            })

        # Por robustez ante configuraciones incompletas, no asumimos exactamente 1.0
        # strict: actividades sin nota cuentan como 0 (ya contemplado en acc_strict)
        ra_strict = acc_strict  # escala 0..5

        # progressive: normaliza por peso ya calificado
        if sum_w_graded > 0.0:
            ra_prog = acc_strict / sum_w_graded
            coverage = min(1.0, max(0.0, sum_w_graded / (sum_w if sum_w > 0 else 1.0)))
        else:
            ra_prog = None
            coverage = 0.0

        w_ra = float(ra.porcentaje_ra) / 100.0
        total_strict += (ra_strict or 0.0) * w_ra
        total_prog += (ra_prog or 0.0) * w_ra
        total_coverage += coverage * w_ra

        out_ras.append({
            "id_ra": ra.id_ra,
            "descripcion": ra.descripcion,
            "porcentaje_ra": float(ra.porcentaje_ra),
            "strict": round(ra_strict, 2) if ra_strict is not None else None,
            "progressive": round(ra_prog, 2) if ra_prog is not None else None,
            "coverage": round(coverage, 4),
            "actividades": items,
        })

    return Response({
        "asignatura": {"codigo": asig.codigo_asignatura, "nombre": asig.nombre},
        "matricula_id": mat.id_matricula,
        "total": {
            "strict": round(total_strict, 2),
            "progressive": round(total_prog, 2) if total_prog != 0.0 else 0.0,
            "coverage": round(total_coverage, 4),
        },
        "ras": out_ras,
    })

@api_view(["GET", "PUT", "PATCH"])
@permission_classes([AllowAny])
@authentication_classes([])
def profile_view(request):
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)

    rol, uid = tok.get("rol"), tok.get("id")

    if request.method in ("PUT", "PATCH"):
        body = request.data or {}
        if rol == "docente":
            u = Docente.objects.filter(pk=uid).first()
            if not u: return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
            if "correo" in body: u.correo = body["correo"]
            if "telefono" in body or "num_telefono" in body: u.num_telefono = body.get("telefono") or body.get("num_telefono")
            u.save()
        else:
            u = Estudiante.objects.filter(pk=uid).first()
            if not u: return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
            if "correo" in body: u.correo = body["correo"]
            if "jornada" in body: u.jornada = body["jornada"]
            u.save()
        request.method = "GET"

    def _avatar_url_for(rol_value: str, uid_value: int):
        try:
            base = os.path.join("avatars", str(rol_value), str(uid_value))
            media_root = getattr(settings, "MEDIA_ROOT", None)
            media_url = getattr(settings, "MEDIA_URL", "/media/")
            if not media_root:
                return None
            folder = os.path.join(media_root, base)
            if not os.path.isdir(folder):
                return None
            files = [f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))]
            if not files:
                return None
            newest = sorted(files, key=lambda f: os.path.getmtime(os.path.join(folder, f)))[-1]
            rel_path = os.path.join(base, newest).replace("\\", "/")
            return request.build_absolute_uri(media_url + rel_path)
        except Exception:
            return None

    if rol == "docente":
        u = Docente.objects.filter(pk=uid).select_related("tipo_documento").first()
        if not u:
            return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        cursos_qs = Asignatura.objects.filter(docente=u).select_related("programa")
        cursos = [{"codigo": a.codigo_asignatura, "nombre": a.nombre, "grupo": a.grupo, "programa": getattr(a.programa, "nombre", None)} for a in cursos_qs]
        # Programas únicos dictados por el docente
        programas_set = set()
        programas = []
        for a in cursos_qs:
            prog = getattr(a, "programa", None)
            if prog:
                key = (getattr(prog, "codigo_programa", None), getattr(prog, "nombre", None))
                if key not in programas_set:
                    programas_set.add(key)
                    programas.append({"codigo": key[0], "nombre": key[1]})
        details = {
            "correo": u.correo,
            "codigo": u.codigo_docente,
            "documento": {"tipo": getattr(u.tipo_documento, "descripcion", None), "numero": u.num_documento},
            "telefono": u.num_telefono,
            "zona_horaria": settings.TIME_ZONE,
            "programas": programas,
            "total_cursos": cursos_qs.count(),
        }
        # Adjunta URL del avatar si existe
        details["avatar_url"] = _avatar_url_for(rol, uid)
        return Response({"user": _serialize_user(u, "docente"), "details": details, "cursos": cursos, "cursos_por_periodo": []})

    u = Estudiante.objects.filter(pk=uid).select_related("tipo_documento").first()
    if not u:
        return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
    mats = (Matricula.objects
            .filter(estudiante=u)
            .select_related("asignatura__programa", "periodo")
            .order_by("periodo__fecha_inicio"))
    cursos_actuales = []
    grupos = {}
    programas_set = set()
    programas = []
    for m in mats:
        a = m.asignatura
        p = m.periodo
        cursos_actuales.append({"codigo": a.codigo_asignatura, "nombre": a.nombre, "grupo": a.grupo, "programa": getattr(a.programa, "nombre", None)})
        key = str(p.id_periodo)
        if key not in grupos:
            grupos[key] = {"periodo": {"id": p.id_periodo, "descripcion": p.descripcion}, "cursos": []}
        grupos[key]["cursos"].append({"codigo": a.codigo_asignatura, "nombre": a.nombre, "grupo": a.grupo, "programa": getattr(a.programa, "nombre", None)})
        prog = getattr(a, "programa", None)
        if prog:
            prog_key = (getattr(prog, "codigo_programa", None), getattr(prog, "nombre", None))
            if prog_key not in programas_set:
                programas_set.add(prog_key)
                programas.append({"codigo": prog_key[0], "nombre": prog_key[1]})
    # Periodo actual (último por fecha de inicio) y total de cursos en ese periodo
    periodo_actual = None
    total_cursos_periodo_actual = None
    if grupos:
        # grupos mantiene orden de inserción acorde al orden de mats; tomar el último
        last_key = list(grupos.keys())[-1]
        periodo_actual = grupos[last_key]["periodo"]
        total_cursos_periodo_actual = len(grupos[last_key]["cursos"])
    details = {
        "correo": u.correo,
        "codigo": u.codigo_estudiante,
        "documento": {"tipo": getattr(u.tipo_documento, "descripcion", None), "numero": u.num_documento},
        "jornada": u.jornada,
        "zona_horaria": settings.TIME_ZONE,
        "programas": programas,
        "periodo_actual": periodo_actual,
        "total_cursos_periodo_actual": total_cursos_periodo_actual,
    }
    # Adjunta URL del avatar si existe
    details["avatar_url"] = _avatar_url_for(rol, uid)
    return Response({"user": _serialize_user(u, "estudiante"), "details": details, "cursos": cursos_actuales[-10:], "cursos_por_periodo": list(grupos.values())})

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def password_change_view(request):
    """Cambia la contraseña del usuario autenticado (docente/estudiante).
    Body: { current_password: str, new_password: str }
    Auth: Authorization: Bearer <token>
    """
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    rol, uid = tok.get("rol"), tok.get("id")

    body = request.data or {}
    cur = body.get("current_password")
    new = body.get("new_password")
    if not cur or not new:
        return Response({"message": "Se requieren current_password y new_password"}, status=status.HTTP_400_BAD_REQUEST)
    if len(str(new)) < 6:
        return Response({"message": "La nueva contraseña debe tener al menos 6 caracteres"}, status=status.HTTP_400_BAD_REQUEST)

    if rol == "docente":
        u = Docente.objects.filter(pk=uid).first()
        if not u:
            return Response({"message": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        try:
            ok = check_password(cur, u.contrasenia_docente)
        except Exception:
            ok = (cur == (u.contrasenia_docente or ""))
        if not ok:
            return Response({"message": "Contraseña actual incorrecta"}, status=status.HTTP_400_BAD_REQUEST)
        u.contrasenia_docente = make_password(new)
        u.save(update_fields=["contrasenia_docente"])
    else:
        u = Estudiante.objects.filter(pk=uid).first()
        if not u:
            return Response({"message": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        try:
            ok = check_password(cur, u.contrasena_estudiante)
        except Exception:
            ok = (cur == (u.contrasena_estudiante or ""))
        if not ok:
            return Response({"message": "Contraseña actual incorrecta"}, status=status.HTTP_400_BAD_REQUEST)
        u.contrasena_estudiante = make_password(new)
        u.save(update_fields=["contrasena_estudiante"])

    return Response({"ok": True})


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def profile_avatar_view(request):
    """Sube/actualiza el avatar del usuario autenticado. Campo esperado: 'avatar' (archivo)."""
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    rol, uid = tok.get("rol"), tok.get("id")
    f = request.FILES.get("avatar")
    if not f:
        return Response({"message": "Archivo 'avatar' requerido"}, status=status.HTTP_400_BAD_REQUEST)
    # Validaciones básicas de archivo: tipo MIME y tamaño (máx. 2MB)
    try:
        content_type = getattr(f, "content_type", "") or ""
        size = int(getattr(f, "size", 0) or 0)
    except Exception:
        content_type, size = "", 0
    allowed_types = {"image/png", "image/jpeg", "image/jpg"}
    if content_type.lower() not in allowed_types and not content_type.lower().startswith("image/"):
        return Response({"message": "Tipo de archivo no permitido. Solo PNG o JPG."}, status=status.HTTP_400_BAD_REQUEST)
    if size > 2 * 1024 * 1024:
        return Response({"message": "El archivo supera el tamaño máximo de 2MB."}, status=status.HTTP_400_BAD_REQUEST)
    fname = get_valid_filename(getattr(f, "name", "avatar"))
    base = os.path.join("avatars", str(rol or "user"), str(uid))
    path = os.path.join(base, fname)
    saved = default_storage.save(path, f)
    media_url = getattr(settings, "MEDIA_URL", "/media/")
    url = request.build_absolute_uri(media_url + saved.replace("\\", "/"))
    return Response({"url": url})

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def ra_validation_view(request, ra_id: int):
    ra = ResultadoDeAprendizaje.objects.filter(pk=ra_id).first()
    if not ra:
        return Response({"detail": "RA no existe"}, status=status.HTTP_404_NOT_FOUND)
    act_sum = RaActividad.objects.filter(ra_id=ra_id).aggregate(v=Sum("porcentaje_ra_actividad"))["v"] or 0
    ind_sum = IndicadoresDeLogro.objects.filter(ra_id=ra_id).aggregate(v=Sum("porcentaje_ind"))["v"] or 0
    return Response({
        "ra_id": ra_id,
        "actividades": {"suma": float(act_sum), "ok": float(act_sum) == 100.0, "faltante": max(0.0, 100.0 - float(act_sum))},
        "indicadores": {"suma": float(ind_sum), "ok": float(ind_sum) == 100.0, "faltante": max(0.0, 100.0 - float(ind_sum))},
    })

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def asignatura_validation_view(request, codigo_asignatura: str):
    asig = Asignatura.objects.filter(codigo_asignatura=codigo_asignatura).first()
    if not asig:
        return Response({"detail": "Asignatura no existe"}, status=status.HTTP_404_NOT_FOUND)
    ra_sum = ResultadoDeAprendizaje.objects.filter(asignatura=asig).aggregate(v=Sum("porcentaje_ra"))["v"] or 0
    return Response({
        "codigo_asignatura": codigo_asignatura,
        "ras": {"suma": float(ra_sum), "ok": float(ra_sum) == 100.0, "faltante": max(0.0, 100.0 - float(ra_sum))},
    })

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def notifications_view(request):
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    rol, uid = tok.get("rol"), tok.get("id")
    if rol != "estudiante":
        return Response([], status=status.HTTP_200_OK)
    
    # 🔔 Obtener notificaciones del cache
    cached_notifications = _NOTIFICATIONS_CACHE.get(uid, [])

    mats = Matricula.objects.filter(estudiante_id=uid).select_related("asignatura")
    hoy = datetime.date.today()
    limite = hoy + datetime.timedelta(days=7)
    hace_7_dias = hoy - datetime.timedelta(days=7)
    proximas, bajas, nuevas_notas, nuevas_actividades = [], [], [], []

    # 1. Actividades próximas a vencer (sin calificar)
    for m in mats:
        rels = RaActividad.objects.filter(ra__asignatura=m.asignatura).select_related("actividad", "ra")
        notas = {n.ra_actividad_id: n for n in NotasActividad.objects.filter(matricula=m)}
        for rel in rels:
            act = rel.actividad
            n = notas.get(rel.id_ra_actividad)
            if act.fecha_cierre and (hoy <= act.fecha_cierre <= limite) and (not n or n.nota_ra_actividad is None):
                proximas.append({"kind": "deadline", "text": f'Actividad "{act.nombre_actividad}" de {m.asignatura.nombre} vence {act.fecha_cierre.isoformat()}', "date": act.fecha_cierre.isoformat(), "id": f"deadline-{rel.id_ra_actividad}"})

    # 2. Notas recién calificadas (últimos 7 días) - NUEVO
    from django.db.models import Max
    for m in mats:
        # Buscar notas que fueron actualizadas recientemente
        # Nota: Necesitaríamos un campo `fecha_calificacion` en NotasActividad para ser preciso
        # Por ahora, mostramos notas que existen (asumiendo que son recientes si no se habían visto)
        notas_recientes = NotasActividad.objects.filter(
            matricula=m,
            nota_ra_actividad__isnull=False
        ).select_related('ra_actividad__actividad').order_by('-id')[:5]  # Últimas 5 notas
        
        for nota in notas_recientes:
            act_nombre = nota.ra_actividad.actividad.nombre_actividad
            nota_val = float(nota.nota_ra_actividad)
            nuevas_notas.append({
                "kind": "grade",
                "text": f'Nueva calificación en "{act_nombre}" de {m.asignatura.nombre}: {nota_val:.1f}/5',
                "id": f"grade-{nota.id}",
                "link": f"/estudiante?curso={m.asignatura.codigo_asignatura}"
            })

    # 3. Nuevas actividades creadas (últimos 7 días) - NUEVO
    for m in mats:
        acts_nuevas = Actividad.objects.filter(
            id_actividad__in=RaActividad.objects.filter(
                ra__asignatura=m.asignatura
            ).values_list('actividad_id', flat=True),
            fecha_creacion__gte=hace_7_dias
        ).order_by('-fecha_creacion')[:5]
        
        for act in acts_nuevas:
            nuevas_actividades.append({
                "kind": "resource",
                "text": f'Nueva actividad "{act.nombre_actividad}" en {m.asignatura.nombre}',
                "date": act.fecha_creacion.isoformat(),
                "id": f"activity-{act.id_actividad}",
                "link": f"/estudiante?curso={m.asignatura.codigo_asignatura}"
            })

    # 4. Promedios bajos
    for m in mats:
        qs = NotasActividad.objects.filter(matricula=m).exclude(nota_ra_actividad__isnull=True)
        avg = qs.aggregate(v=Avg("nota_ra_actividad"))["v"]
        if avg is not None and avg < 3.0:
            bajas.append({"kind": "danger", "text": f'Vas bajo en {m.asignatura.nombre}: promedio {avg:.2f}/5', "id": f"low-{m.id_matricula}"})

    # Combinar notificaciones del cache con las automáticas del sistema
    all_notifications = (
        cached_notifications +  # 🔔 Notificaciones en tiempo real (calificaciones, nuevas actividades)
        proximas[:10] +  # Actividades por vencer
        bajas[:5]  # Promedios bajos
    )
    # Retornar últimas 30 notificaciones
    return Response(all_notifications[-30:])


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def actividades_multi_view(request):
    """
    Crea una sola Actividad y la asocia a múltiples RAs (del mismo curso) en una sola operación.
    Body esperado:
    {
      "nombre_actividad": str,
      "id_tipo_actividad": int,
      "descripcion"?: str,
      "fecha_cierre"?: "AAAA-MM-DD",
      "ras": [
        { "ra_id": int, "porcentaje_ra_actividad": number, "indicadores"?: [int, ...] }, ...
      ]
    }
    Validaciones:
    - Todas las RAs deben pertenecer a la misma asignatura.
    - Para cada RA, la suma de porcentaje_ra_actividad no debe superar 100.
    """
    body = request.data or {}
    nombre = body.get("nombre_actividad")
    id_tipo = body.get("id_tipo_actividad")
    descripcion = body.get("descripcion")
    fecha_cierre = body.get("fecha_cierre")
    ras = body.get("ras")

    if not (nombre and id_tipo is not None and isinstance(ras, (list, tuple)) and len(ras) > 0):
        return Response({
            "message": "Campos requeridos: nombre_actividad, id_tipo_actividad y ras[]"
        }, status=status.HTTP_400_BAD_REQUEST)

    # fecha_cierre obligatoria
    if not fecha_cierre:
        return Response({"message": "fecha_cierre es requerido (AAAA-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        fecha_cierre_dt = datetime.datetime.strptime(str(fecha_cierre), "%Y-%m-%d").date()
    except ValueError:
        return Response({"message": "fecha_cierre debe tener formato AAAA-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

    # Validar: fecha_cierre >= hoy
    hoy = datetime.date.today()
    if fecha_cierre_dt < hoy:
        return Response({
            "message": "fecha_cierre no puede ser anterior a la fecha de creación (hoy). Elige hoy o una fecha futura.",
            "hoy": hoy.isoformat(),
            "fecha_cierre": fecha_cierre_dt.isoformat(),
        }, status=status.HTTP_400_BAD_REQUEST)

    # Cargar RAs y validar que pertenezcan a la misma asignatura
    ra_ids = [int(x.get("ra_id")) for x in ras if x and x.get("ra_id") is not None]
    if not ra_ids:
        return Response({"message": "ras debe incluir al menos un objeto con ra_id"}, status=status.HTTP_400_BAD_REQUEST)

    ra_objs = list(ResultadoDeAprendizaje.objects.filter(id_ra__in=ra_ids).select_related("asignatura"))
    if len(ra_objs) != len(set(ra_ids)):
        return Response({"message": "Algún ra_id no existe"}, status=status.HTTP_400_BAD_REQUEST)
    asig_ids = {r.asignatura_id for r in ra_objs}
    if len(asig_ids) != 1:
        return Response({"message": "Todas las RAs deben pertenecer a la misma asignatura"}, status=status.HTTP_400_BAD_REQUEST)

    # Validar porcentajes por RA e indicadores (ambos obligatorios, aporte > 0)
    for item in ras:
        try:
            rid = int(item.get("ra_id"))
        except (TypeError, ValueError):
            return Response({"message": "Cada elemento en ras debe incluir ra_id válido"}, status=status.HTTP_400_BAD_REQUEST)
        raw_pct = item.get("porcentaje_ra_actividad")
        if raw_pct is None or str(raw_pct).strip() == "":
            return Response({"message": f"porcentaje_ra_actividad es requerido para RA {rid}"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            pct = float(raw_pct)
        except (TypeError, ValueError):
            return Response({"message": "porcentaje_ra_actividad debe ser numérico"}, status=status.HTTP_400_BAD_REQUEST)
        if pct <= 0 or pct > 100:
            return Response({"message": "porcentaje_ra_actividad debe ser mayor que 0 y no exceder 100"}, status=status.HTTP_400_BAD_REQUEST)
        suma_actual = (RaActividad.objects.filter(ra_id=rid).aggregate(v=Sum("porcentaje_ra_actividad"))['v'] or 0)
        if float(suma_actual) + pct > 100.0:
            return Response({
                "message": f"El RA {rid} excede 100% con este aporte ({float(suma_actual)+pct:.2f}%). Ajusta porcentaje_ra_actividad.",
                "ra_id": rid,
                "suma_actual": float(suma_actual),
            }, status=status.HTTP_400_BAD_REQUEST)
        # Indicadores obligatorios por cada RA
        inds = item.get("indicadores") or []
        if not isinstance(inds, (list, tuple)) or len(inds) == 0:
            return Response({"message": f"Debes asignar al menos un indicador para el RA {rid}"}, status=status.HTTP_400_BAD_REQUEST)
        valid_inds = set(IndicadoresDeLogro.objects.filter(ra_id=rid, id_ind__in=inds).values_list("id_ind", flat=True))
        if not valid_inds:
            exists_any = IndicadoresDeLogro.objects.filter(ra_id=rid).exists()
            if not exists_any:
                return Response({"message": f"El RA {rid} no tiene indicadores definidos. No se puede crear la actividad sin indicadores."}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"message": f"Los indicadores enviados no corresponden al RA {rid}"}, status=status.HTTP_400_BAD_REQUEST)


    # Crear actividad y relaciones en una transacción para consistencia
    try:
        with transaction.atomic():
            act = Actividad.objects.create(
                tipo_actividad_id=id_tipo,
                nombre_actividad=nombre,
                descripcion=descripcion,
                fecha_creacion=hoy,
                fecha_cierre=fecha_cierre_dt,
            )

            relaciones = []
            for item in ras:
                rid = int(item["ra_id"])  # seguro por validaciones previas
                raw_pct = item.get("porcentaje_ra_actividad")
                pct = float(raw_pct)
                rel = RaActividad.objects.create(actividad=act, ra_id=rid, porcentaje_ra_actividad=pct)
                relaciones.append(rel)
                # Indicadores (opcionales) – asegurar que pertenezcan al mismo RA
                inds = item.get("indicadores") or []
                valid_inds = set(IndicadoresDeLogro.objects.filter(ra_id=rid, id_ind__in=inds).values_list("id_ind", flat=True))
                bulk = [RaActividadIndicador(ra_actividad=rel, indicador_id=i) for i in valid_inds]
                RaActividadIndicador.objects.bulk_create(bulk, ignore_conflicts=True)
            
            # 🔔 Crear notificación personalizada para cada estudiante del curso
            try:
                asignatura = ra_objs[0].asignatura if ra_objs else None
                if asignatura:
                    matriculas = Matricula.objects.filter(asignatura=asignatura).select_related('estudiante')
                    fecha_str = fecha_cierre_dt.strftime("%d/%m/%Y")
                    notif_link = f"/estudiante?curso={asignatura.codigo_asignatura}"
                    
                    # Crear notificación personalizada para cada estudiante
                    for mat in matriculas:
                        notif_text = f"🎯 {mat.estudiante.primer_nombre}, nueva actividad en {asignatura.nombre}: {nombre} - Vence: {fecha_str}"
                        _add_notification(mat.estudiante_id, "deadline", notif_text, notif_link)
            except Exception:
                pass  # No fallar si hay error en notificación
    except (IntegrityError, DatabaseError) as e:
        # Capturar mensajes del trigger para devolver 400 legible
        msg = str(e)
        # Limpiar un poco el mensaje si contiene línea de RAISE
        if ("deben sumar 100" in msg) or ("exced" in msg) or ("trg_check_sum_acts_por_ra" in msg):
            return Response({"message": msg}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": "No se pudo crear la actividad por una restricción de base de datos.", "detail": msg}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "id_actividad": act.id_actividad,
        "nombre_actividad": act.nombre_actividad,
        "fecha_cierre": act.fecha_cierre,
        "relaciones": [
            {
                "id_ra": r.ra_id,
                "id_ra_actividad": r.id_ra_actividad,
                "porcentaje_ra_actividad": float(r.porcentaje_ra_actividad),
            } for r in relaciones
        ]
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def current_period_view(request):
    """
    Devuelve el periodo académico actual basado en la fecha actual del sistema.
    El periodo actual es el que está activo según su fecha de inicio/fin.
    
    Respuesta:
    {
      "id_periodo": int,
      "descripcion": str,
      "fecha_inicio": "AAAA-MM-DD",
      "fecha_fin": "AAAA-MM-DD" | null,
      "is_current": true
    }
    """
    hoy = datetime.date.today()
    
    # Buscar periodo que esté activo (fecha_inicio <= hoy <= fecha_fin o sin fecha_fin definida)
    periodo = (PeriodoAcademico.objects
               .filter(fecha_inicio__lte=hoy)
               .order_by('-fecha_inicio')
               .first())
    
    if not periodo:
        # Si no hay periodo que haya comenzado, devolver el próximo
        periodo = PeriodoAcademico.objects.order_by('fecha_inicio').first()
    
    if not periodo:
        return Response({"detail": "No hay periodos académicos configurados"}, status=status.HTTP_404_NOT_FOUND)
    
    return Response({
        "id_periodo": periodo.id_periodo,
        "descripcion": periodo.descripcion,
        "fecha_inicio": periodo.fecha_inicio,
        "fecha_fin": getattr(periodo, 'fecha_fin', None),
        "is_current": True
    })


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def course_activities_grouped_view(request, codigo_asignatura: str):
    """
    Devuelve todas las actividades de una asignatura AGRUPADAS por ID de actividad.
    Cada actividad muestra todos los RAs a los que está asociada con sus porcentajes.
    
    Soluciona el problema de duplicación cuando una actividad pertenece a múltiples RAs.
    
    Query params:
      - id_matricula (opcional): Si se provee, incluye la nota del estudiante
    
    Respuesta:
    [
      {
        "id_actividad": int,
        "nombre_actividad": str,
        "descripcion": str | null,
        "fecha_creacion": "AAAA-MM-DD",
        "fecha_cierre": "AAAA-MM-DD" | null,
        "id_tipo_actividad": int,
        "tipo_actividad": str,
        "porcentaje_total": float,  // Suma de todos los porcentajes en todos los RAs
        "nota": float | null,  // Nota del estudiante (única para toda la actividad)
        "retroalimentacion": str | null,
        "ras_asociados": [
          {
            "id_ra": int,
            "id_ra_actividad": int,  // ID de la relación
            "titulo_ra": str,
            "porcentaje_ra": float,  // Porcentaje del RA en la asignatura
            "porcentaje_actividad": float,  // Porcentaje de esta actividad en este RA
            "indicadores": [
              {
                "id_ind": int,
                "descripcion": str,
                "porcentaje_ind": float
              }
            ]
          }
        ]
      }
    ]
    """
    asig = Asignatura.objects.filter(codigo_asignatura=codigo_asignatura).first()
    if not asig:
        return Response({"detail": "Asignatura no encontrada"}, status=status.HTTP_404_NOT_FOUND)
    
    id_matricula = request.query_params.get("id_matricula")
    
    # Obtener todas las relaciones RA-Actividad de esta asignatura
    rels = (RaActividad.objects
            .filter(ra__asignatura=asig)
            .select_related("actividad__tipo_actividad", "ra")
            .prefetch_related("indicadores_rel__indicador")
            .order_by("actividad__fecha_cierre", "actividad__nombre_actividad"))
    
    # Agrupar por ID de actividad
    activities_dict = {}
    for rel in rels:
        act = rel.actividad
        act_id = act.id_actividad
        
        # Si es la primera vez que vemos esta actividad, inicializar
        if act_id not in activities_dict:
            activities_dict[act_id] = {
                "id_actividad": act_id,
                "nombre_actividad": act.nombre_actividad,
                "descripcion": act.descripcion,
                "fecha_creacion": act.fecha_creacion,
                "fecha_cierre": act.fecha_cierre,
                "id_tipo_actividad": act.tipo_actividad_id,
                "tipo_actividad": getattr(act.tipo_actividad, "descripcion", None),
                "porcentaje_total": 0.0,
                "nota": None,
                "retroalimentacion": None,
                "ras_asociados": []
            }
        
        # Agregar este RA a la lista de RAs asociados
        indicadores = [
            {
                "id_ind": rir.indicador_id,
                "descripcion": rir.indicador.descripcion,
                "porcentaje_ind": float(rir.indicador.porcentaje_ind),
            }
            for rir in rel.indicadores_rel.all()
        ]
        
        activities_dict[act_id]["ras_asociados"].append({
            "id_ra": rel.ra_id,
            "id_ra_actividad": rel.id_ra_actividad,
            "titulo_ra": rel.ra.descripcion,
            "porcentaje_ra": float(rel.ra.porcentaje_ra),
            "porcentaje_actividad": float(rel.porcentaje_ra_actividad),
            "indicadores": indicadores
        })
        
        # Sumar al porcentaje total
        activities_dict[act_id]["porcentaje_total"] += float(rel.porcentaje_ra_actividad)
    
    # Si se proporcionó id_matricula, agregar notas
    if id_matricula:
        # Obtener todas las notas del estudiante para esta asignatura
        notas = list(NotasActividad.objects.filter(
            matricula_id=id_matricula,
            ra_actividad__ra__asignatura=asig
        ).select_related("ra_actividad"))
        
        # Mapear notas por ID de actividad (todas las relaciones de una actividad comparten la misma nota)
        notas_por_actividad = {}
        for nota in notas:
            act_id = nota.ra_actividad.actividad_id
            if act_id not in notas_por_actividad:
                notas_por_actividad[act_id] = nota
        
        # Agregar notas a las actividades
        for act_id, nota_obj in notas_por_actividad.items():
            if act_id in activities_dict:
                activities_dict[act_id]["nota"] = float(nota_obj.nota_ra_actividad) if nota_obj.nota_ra_actividad is not None else None
                activities_dict[act_id]["retroalimentacion"] = nota_obj.retroalimentacion
    
    # Convertir a lista y retornar
    result = list(activities_dict.values())
    
    return Response(result, status=status.HTTP_200_OK)