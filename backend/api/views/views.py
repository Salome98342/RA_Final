from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, authentication_classes, action
from rest_framework.permissions import AllowAny
from django.core import signing
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Avg, Sum
import datetime

from ..models.models import (
    TipoDocumento, TipoActividad, Programa, Docente, Estudiante, Asignatura,
    Task, ResultadoDeAprendizaje, Matricula, IndicadoresDeLogro, Actividad, RaActividad, NotasActividad, PeriodoAcademico, Recurso, RaActividadIndicador
)
from ..serializers.serializers import (
    TipoDocumentoSerializer, TipoActividadSerializer, ProgramaSerializer,
    DocenteSerializer, EstudianteSerializer, AsignaturaSerializer,
    TaskSerializer, ResultadoDeAprendizajeSerializer, RecursoSerializer
)

TOKEN_MAX_AGE = 60 * 60 * 24 * 7
RESET_TOKEN_MAX_AGE = 60 * 60  # 1 hora

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
        "code": getattr(u, "codigo_docente", None) or getattr(u, "codigo_estudiante", None),
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
    for r in (["docente", "estudiante"] if not rol else [rol]):
        if r == "docente":
            u = (Docente.objects.filter(codigo_docente=codigo).first()
                 or Docente.objects.filter(correo=email).first())
            if u and ok_pass(u.contrasenia_docente):
                user = u; user_rol = "docente"; break
        else:
            u = (Estudiante.objects.filter(codigo_estudiante=codigo).first()
                 or Estudiante.objects.filter(correo=email).first())
            if u and ok_pass(u.contrasena_estudiante):
                user = u; user_rol = "estudiante"; break

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
    u = Docente.objects.filter(pk=uid).first() if rol == "docente" else Estudiante.objects.filter(pk=uid).first()
    if not u:
        return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_401_UNAUTHORIZED)
    return Response({"user": _serialize_user(u, rol or "estudiante")})

@api_view(["POST", "GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def logout_view(request):
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def password_forgot_view(request):
    email = (request.data or {}).get("email")
    if not email:
        return Response({"message": "Email requerido"}, status=status.HTTP_400_BAD_REQUEST)

    # Buscar usuario por correo (estudiante o docente)
    u = Estudiante.objects.filter(correo=email).first()
    rol = "estudiante"
    if not u:
        u = Docente.objects.filter(correo=email).first()
        rol = "docente" if u else None

    # Siempre responder 200 para evitar enumeración de usuarios
    if u and rol:
        payload = {"kind": "pwdreset", "rol": rol, "id": u.pk, "ts": datetime.datetime.utcnow().timestamp()}
        token = signing.dumps(payload)
        front = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        reset_url = f"{front}/reset?token={token}"
        subject = "Recuperación de contraseña"
        message = (
            "Hola,\n\n"
            "Recibimos una solicitud para restablecer tu contraseña.\n"
            f"Usa el siguiente enlace (válido por 1 hora):\n{reset_url}\n\n"
            "Si no fuiste tú, puedes ignorar este mensaje.\n"
            "— Universidad del Valle"
        )
        try:
            send_mail(subject, message, getattr(settings, "DEFAULT_FROM_EMAIL", None), [email], fail_silently=True)
        except Exception:
            # En desarrollo con console backend no debería fallar; igual no exponemos detalles
            pass

    return Response({"ok": True})

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def password_reset_view(request):
    token = (request.data or {}).get("token")
    new_pass = (request.data or {}).get("password")
    if not token or not new_pass:
        return Response({"message": "Token y password requeridos"}, status=status.HTTP_400_BAD_REQUEST)
    if len(str(new_pass)) < 6:
        return Response({"message": "La nueva contraseña debe tener al menos 6 caracteres"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        data = signing.loads(token, max_age=RESET_TOKEN_MAX_AGE)
    except Exception:
        return Response({"message": "Token inválido o expirado"}, status=status.HTTP_400_BAD_REQUEST)

    if data.get("kind") != "pwdreset":
        return Response({"message": "Token inválido"}, status=status.HTTP_400_BAD_REQUEST)

    rol = data.get("rol")
    uid = data.get("id")

    if rol == "docente":
        u = Docente.objects.filter(pk=uid).first()
        if not u:
            return Response({"message": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        u.contrasenia_docente = make_password(new_pass)
        u.save(update_fields=["contrasenia_docente"])
    else:
        u = Estudiante.objects.filter(pk=uid).first()
        if not u:
            return Response({"message": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        u.contrasena_estudiante = make_password(new_pass)
        u.save(update_fields=["contrasena_estudiante"])

    return Response({"ok": True})

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
            "nombre": m.estudiante.nombre,
            "apellido": m.estudiante.apellido,
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

    @action(detail=True, methods=["get", "post"], url_path="recursos")
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
                "porcentaje_actividad": float(act.porcentaje_actividad),
                "porcentaje_ra_actividad": float(rel.porcentaje_ra_actividad),
                "id_tipo_actividad": act.tipo_actividad_id,
                "tipo_actividad": getattr(act.tipo_actividad, "descripcion", None),
                "fecha_cierre": act.fecha_cierre,
                "indicadores": inds,
            }
            if id_matricula:
                nota = (NotasActividad.objects
                        .filter(matricula_id=id_matricula, ra_actividad_id=rel.id_ra_actividad)
                        .first())
                if nota:
                    row["nota"] = float(nota.nota_ra_actividad) if nota.nota_ra_actividad is not None else None
                    row["retroalimentacion"] = nota.retroalimentacion
                    row["id_ind"] = nota.indicador_id
            out.append(row)
        return Response(out, status=status.HTTP_200_OK)

    body = request.data or {}
    nombre = body.get("nombre_actividad")
    id_tipo = body.get("id_tipo_actividad")
    porcentaje_actividad = body.get("porcentaje_actividad")
    porcentaje_ra_actividad = body.get("porcentaje_ra_actividad")
    descripcion = body.get("descripcion")
    fecha_cierre = body.get("fecha_cierre")
    indicadores = body.get("indicadores")  # Lista opcional de ids de indicadores

    if not (nombre and id_tipo is not None and porcentaje_actividad is not None and porcentaje_ra_actividad is not None):
        return Response({"message": "Campos requeridos: nombre_actividad, id_tipo_actividad, porcentaje_actividad, porcentaje_ra_actividad"},
                        status=status.HTTP_400_BAD_REQUEST)

    fecha_cierre_dt = None
    if fecha_cierre:
        try:
            fecha_cierre_dt = datetime.datetime.strptime(str(fecha_cierre), "%Y-%m-%d").date()
        except ValueError:
            return Response({"message": "fecha_cierre debe tener formato AAAA-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

    suma_actual = (RaActividad.objects.filter(ra_id=ra_id)
                   .aggregate(v=Sum("porcentaje_ra_actividad"))["v"] or 0)
    nuevo_total = float(suma_actual) + float(porcentaje_ra_actividad)
    if nuevo_total > 100.0:
        return Response({"message": f"El porcentaje total del RA excede 100% ({nuevo_total:.2f}%). Ajusta porcentaje_ra_actividad."},
                        status=status.HTTP_400_BAD_REQUEST)

    act = Actividad.objects.create(
        tipo_actividad_id=id_tipo,
        nombre_actividad=nombre,
        descripcion=descripcion,
        porcentaje_actividad=porcentaje_actividad,
        fecha_creacion=datetime.date.today(),
        fecha_cierre=fecha_cierre_dt,
    )
    rel = RaActividad.objects.create(actividad=act, ra_id=ra_id, porcentaje_ra_actividad=porcentaje_ra_actividad)
    # Asignar indicadores (opcionales), validando que pertenezcan al mismo RA
    if isinstance(indicadores, (list, tuple)) and len(indicadores) > 0:
        valid_inds = set(IndicadoresDeLogro.objects.filter(ra_id=ra_id, id_ind__in=indicadores).values_list("id_ind", flat=True))
        bulk = [RaActividadIndicador(ra_actividad=rel, indicador_id=i) for i in valid_inds]
        if bulk:
            RaActividadIndicador.objects.bulk_create(bulk, ignore_conflicts=True)
    return Response({
        "id_actividad": act.id_actividad,
        "id_ra_actividad": rel.id_ra_actividad,
        "nombre_actividad": act.nombre_actividad,
        "porcentaje_actividad": float(act.porcentaje_actividad),
        "porcentaje_ra_actividad": float(rel.porcentaje_ra_actividad),
    }, status=status.HTTP_201_CREATED)

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
    obj, created = NotasActividad.objects.get_or_create(
        matricula_id=id_matricula,
        ra_actividad_id=id_ra_actividad,
        defaults={"nota_ra_actividad": nota, "retroalimentacion": retro, "indicador_id": id_ind},
    )
    if not created:
        obj.nota_ra_actividad = nota
        obj.retroalimentacion = retro
        obj.indicador_id = id_ind
        obj.save(update_fields=["nota_ra_actividad", "retroalimentacion", "indicador_id"])
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

    if rol == "docente":
        u = Docente.objects.filter(pk=uid).select_related("tipo_documento").first()
        if not u:
            return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        cursos_qs = Asignatura.objects.filter(docente=u).select_related("programa")
        cursos = [{"codigo": a.codigo_asignatura, "nombre": a.nombre, "grupo": a.grupo, "programa": getattr(a.programa, "nombre", None)} for a in cursos_qs]
        details = {
            "correo": u.correo,
            "codigo": u.codigo_docente,
            "documento": {"tipo": getattr(u.tipo_documento, "descripcion", None), "numero": u.num_documento},
            "telefono": u.num_telefono,
            "zona_horaria": settings.TIME_ZONE,
        }
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
    for m in mats:
        a = m.asignatura
        p = m.periodo
        cursos_actuales.append({"codigo": a.codigo_asignatura, "nombre": a.nombre, "grupo": a.grupo, "programa": getattr(a.programa, "nombre", None)})
        key = str(p.id_periodo)
        if key not in grupos:
            grupos[key] = {"periodo": {"id": p.id_periodo, "descripcion": p.descripcion}, "cursos": []}
        grupos[key]["cursos"].append({"codigo": a.codigo_asignatura, "nombre": a.nombre, "grupo": a.grupo, "programa": getattr(a.programa, "nombre", None)})
    details = {
        "correo": u.correo,
        "codigo": u.codigo_estudiante,
        "documento": {"tipo": getattr(u.tipo_documento, "descripcion", None), "numero": u.num_documento},
        "jornada": u.jornada,
        "zona_horaria": settings.TIME_ZONE,
    }
    return Response({"user": _serialize_user(u, "estudiante"), "details": details, "cursos": cursos_actuales[-10:], "cursos_por_periodo": list(grupos.values())})

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

    mats = Matricula.objects.filter(estudiante_id=uid).select_related("asignatura")
    hoy = datetime.date.today()
    limite = hoy + datetime.timedelta(days=7)
    proximas, bajas = [], []

    for m in mats:
        rels = RaActividad.objects.filter(ra__asignatura=m.asignatura).select_related("actividad", "ra")
        notas = {n.ra_actividad_id: n for n in NotasActividad.objects.filter(matricula=m)}
        for rel in rels:
            act = rel.actividad
            n = notas.get(rel.id_ra_actividad)
            if act.fecha_cierre and (hoy <= act.fecha_cierre <= limite) and (not n or n.nota_ra_actividad is None):
                proximas.append({"kind": "warning", "text": f'Actividad "{act.nombre_actividad}" de {m.asignatura.nombre} vence {act.fecha_cierre.isoformat()}'})

    for m in mats:
        qs = NotasActividad.objects.filter(matricula=m).exclude(nota_ra_actividad__isnull=True)
        avg = qs.aggregate(v=Avg("nota_ra_actividad"))["v"]
        if avg is not None and avg < 3.0:
            bajas.append({"kind": "danger", "text": f'Vas bajo en {m.asignatura.nombre}: promedio {avg:.2f}/5'})

    return Response((proximas[:10] + bajas[:10])[:20])