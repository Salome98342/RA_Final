"""
Endpoint para dashboard de desempeño de estudiantes.
Implementa:
- HU-10: Listar estudiantes con bajo desempeño (≥1 RA con nota < 3.0)
- HU-11: Ranking de asignaturas por % de estudiantes con bajo desempeño
"""

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.http import JsonResponse
from django.core.signing import dumps, loads
from django.db.models import Q, Count, Avg, Sum, F, Case, When, IntegerField, FloatField
from datetime import datetime

import logging

from ..models.models import (
    Estudiante, Matricula, NotasActividad, ResultadoDeAprendizaje,
    RaActividad, PeriodoAcademico, Asignatura, Coordinador, Programa
)

logger = logging.getLogger(__name__)
TOKEN_MAX_AGE = 60 * 60 * 24 * 7  # 7 días


def _norm_code(value: str) -> str:
    return (value or "").strip().upper()


def _infer_program_for_coordinador(coord: Coordinador):
    import re

    programas = list(Programa.objects.all())
    if not programas:
        return None

    coord_code = _norm_code(getattr(coord, "codigo_coordinador", ""))
    coord_email_local = (getattr(coord, "correo", "") or "").split("@")[0].upper()
    name_tokens = set()
    if getattr(coord, "nombre", None):
        name_tokens.update([t.upper() for t in re.split(r"\s+", coord.nombre.strip()) if t])
    if getattr(coord, "apellido", None):
        name_tokens.update([t.upper() for t in re.split(r"\s+", coord.apellido.strip()) if t])

    tokens = set(re.split(r"[-_/\s]+", coord_code)) if coord_code else set()
    if coord_email_local:
        tokens.update(re.split(r"[._\-\s]+", coord_email_local))

    # Exact match
    for p in programas:
        if _norm_code(p.codigo_programa) == coord_code and coord_code:
            return p

    # Token match
    if tokens:
        for p in programas:
            p_code = _norm_code(p.codigo_programa)
            if p_code in tokens:
                return p

    # Partial match against program name or code
    for p in programas:
        p_code = _norm_code(p.codigo_programa)
        p_name = (getattr(p, "nombre", "") or "").upper()
        if coord_code and p_code and p_code in coord_code:
            return p
        for nt in re.split(r"\s+", p_name):
            if not nt:
                continue
            if nt in tokens or nt in name_tokens or nt in coord_email_local.upper():
                return p

    if len(programas) == 1:
        return programas[0]

    return None


def _bearer_token(request):
    """Extrae token Bearer del header Authorization"""
    auth = request.headers.get("Authorization", "")
    return auth.split(" ", 1)[1] if auth.startswith("Bearer ") and " " in auth else None


def _require_coordinador(request):
    """Valida token y rol coordinador; retorna (coord, None) si ok, o (None, Response) si error."""
    token = _bearer_token(request)
    if not token:
        return None, Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        from django.core.signing import BadSignature
        data = loads(token, max_age=TOKEN_MAX_AGE)
    except Exception as e:
        logger.warning(f"Token inválido: {e}")
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
def coordinador_dashboard_desempenio_view(request):
    """
    Endpoint GET /coordinador/dashboard/desempenio/
    
    Retorna datos para el dashboard de desempeño de estudiantes.
    Implementa:
    - HU-10: Estudiantes con bajo desempeño (≥1 RA con nota < 3.0)
    - HU-11: Ranking de asignaturas por % de estudiantes con bajo desempeño
    
        Query Params (opcionales):
            - periodo: Filtrar por descripción del período (ej: "2025-1")
            - asignatura: Filtrar por código de asignatura (ej: "INF101")
            - cohorte: Filtrar por cohorte (si existe en el modelo)
    
    Response Structure:
    {
      "hu10_estudiantes_bajo_desempenio": [
        {
          "id_estudiante": int,
          "nombre": str,
          "apellido": str,
          "codigo": str,
          "ras_perdidos": [{"id_ra": int, "nombre": str, "nota_promedio": float}],
          "asignaturas_perdidas": [{"codigo": str, "nombre": str}],
          "total_ras_perdidos": int
        }
      ],
      "hu11_asignaturas_ranking": [
        {
          "codigo": str,
          "nombre": str,
          "grupo": str,
                    "sede": str,
          "total_matriculados": int,
          "estudiantes_bajo_desempenio": int,
          "porcentaje_bajo_desempenio": float,
          "ras_afectados": [{"id_ra": int, "nombre": str, "% bajo desempenio": float}]
        }
      ],
            "filtros_aplicados": {
                "periodo": str | null,
                "asignatura": str | null
            },
      "resumen": {
        "total_estudiantes_bajo_desempenio": int,
        "total_asignaturas": int,
        "asignatura_con_mas_bajo_desempenio": str
      }
    }
    """
    
    # Validar coordinador
    coord, error = _require_coordinador(request)
    if error:
        return error
    
    # Obtener parámetros de filtro
    periodo_desc = (request.query_params.get("periodo") or "").strip()
    asignatura_codigo = (request.query_params.get("asignatura") or "").strip()
    grupo = (request.query_params.get("grupo") or "").strip()
    id_asignatura = (request.query_params.get("id_asignatura") or "").strip()
    cohorte = (request.query_params.get("cohorte") or "").strip()
    
    # ==================== HU-10: ESTUDIANTES CON BAJO DESEMPEÑO ====================
    
    # Construir queryset de matrículas base (aplicar filtros)
    matriculas = Matricula.objects.select_related(
        'estudiante', 'asignatura', 'asignatura__programa', 'periodo'
    ).all()

    programa_detectado = _infer_program_for_coordinador(coord)
    if programa_detectado:
        matriculas = matriculas.filter(asignatura__programa=programa_detectado)
    
    if periodo_desc:
        matriculas = matriculas.filter(periodo__descripcion=periodo_desc)
    
    if asignatura_codigo:
        matriculas = matriculas.filter(asignatura__codigo_asignatura=asignatura_codigo)

    if grupo:
        matriculas = matriculas.filter(asignatura__grupo=grupo)

    if id_asignatura:
        try:
            matriculas = matriculas.filter(asignatura__id_asignatura=int(id_asignatura))
        except (TypeError, ValueError):
            pass
    
    if cohorte:
        # Si existe campo cohorte en estudiante, filtrar
        matriculas = matriculas.filter(estudiante__cohorte=cohorte)
    
    total_estudiantes_considerados = matriculas.values("estudiante_id").distinct().count()

    # Calcular notas de estudiantes por RA
    # La nota de un estudiante en un RA es el promedio ponderado de sus actividades en ese RA
    estudiantes_bajo_desempenio_dict = {}  # {id_estudiante: {datos}}
    
    for mat in matriculas:
        estudiante = mat.estudiante
        asignatura = mat.asignatura
        
        # Obtener RAs de la asignatura
        ras = ResultadoDeAprendizaje.objects.filter(asignatura=asignatura)
        
        ras_perdidos = []  # RAs donde el estudiante tiene nota < 3.0
        
        for ra in ras:
            # Obtener actividades del RA
            rels = RaActividad.objects.filter(ra=ra).select_related('actividad')
            
            suma_w = 0.0
            suma_w_graded = 0.0
            acc_nota = 0.0
            
            for rel in rels:
                w = float(rel.porcentaje_ra_actividad) / 100.0
                suma_w += w
                
                # Obtener nota del estudiante en esta actividad
                nota_obj = NotasActividad.objects.filter(
                    matricula=mat, 
                    ra_actividad=rel
                ).first()
                
                if nota_obj and nota_obj.nota_ra_actividad is not None:
                    nota = float(nota_obj.nota_ra_actividad)
                    suma_w_graded += w
                    acc_nota += nota * w
            
            # Calcular nota promedio en el RA (progresiva)
            if suma_w_graded > 0:
                nota_ra = acc_nota / suma_w_graded
            else:
                nota_ra = None
            
            # Marcar como bajo desempeño si nota < 3.0
            if nota_ra is not None and nota_ra < 3.0:
                ras_perdidos.append({
                    "id_ra": ra.id_ra,
                    "nombre": ra.descripcion,
                    "nota_promedio": round(nota_ra, 2)
                })
        
        # Si el estudiante tiene ≥1 RA con bajo desempeño, agregar a lista HU-10
        if ras_perdidos:
            est_key = estudiante.id_estudiante
            
            if est_key not in estudiantes_bajo_desempenio_dict:
                estudiantes_bajo_desempenio_dict[est_key] = {
                    "id_estudiante": estudiante.id_estudiante,
                    "nombre": estudiante.nombre,
                    "apellido": estudiante.apellido,
                    "codigo": estudiante.codigo_estudiante,
                    "ras_perdidos": [],
                    "asignaturas_perdidas": set(),  # Usar set para evitar duplicados
                }
            
            # Agrega RAs perdidos (evitando duplicados)
            ra_ids_existentes = {r["id_ra"] for r in estudiantes_bajo_desempenio_dict[est_key]["ras_perdidos"]}
            for ra_perdido in ras_perdidos:
                if ra_perdido["id_ra"] not in ra_ids_existentes:
                    estudiantes_bajo_desempenio_dict[est_key]["ras_perdidos"].append(ra_perdido)
            
            # Agregar asignatura a la lista de asignaturas perdidas
            estudiantes_bajo_desempenio_dict[est_key]["asignaturas_perdidas"].add(
                (asignatura.codigo_asignatura, asignatura.nombre)
            )
    
    # Convertir a lista y formatear asignaturas_perdidas
    hu10_estudiantes = []
    for est_data in estudiantes_bajo_desempenio_dict.values():
        asignaturas_list = [
            {"codigo": cod, "nombre": nom} 
            for cod, nom in est_data["asignaturas_perdidas"]
        ]
        est_data["asignaturas_perdidas"] = asignaturas_list
        est_data["total_ras_perdidos"] = len(est_data["ras_perdidos"])
        hu10_estudiantes.append(est_data)
    
    # Ordenar por total de RAs perdidos (descendente)
    hu10_estudiantes.sort(key=lambda x: x["total_ras_perdidos"], reverse=True)
    
    # ==================== HU-11: RANKING DE ASIGNATURAS ====================
    
    # Agrupar matrículas por (asignatura, programa, periodo) para calcular estadísticas
    asignaturas_stats = {}  # {(codigo, grupo): {datos}}
    
    for mat in matriculas:
        asignatura = mat.asignatura
        asig_key = (asignatura.id_asignatura, asignatura.codigo_asignatura, asignatura.grupo)
        
        if asig_key not in asignaturas_stats:
            asignaturas_stats[asig_key] = {
                "codigo": asignatura.codigo_asignatura,
                "nombre": asignatura.nombre,
                "grupo": asignatura.grupo,
                "sede": getattr(asignatura, "sede", None),
                "total_matriculados": 0,
                "estudiantes_con_bajo_desempenio": set(),  # Set para evitar duplicados
                "estudiantes_promedio_sobre_3": set(),
                "estudiantes_promedio_bajo_3": set(),
                "ras_afectados": {},  # {id_ra: {count, total}}
            }
        
        asignaturas_stats[asig_key]["total_matriculados"] += 1
        
        # Calcular si este estudiante tiene bajo desempeño en algún RA de esta asignatura
        ras = ResultadoDeAprendizaje.objects.filter(asignatura=asignatura)
        
        tiene_bajo_desempenio = False
        
        notas_ra_estudiante = []

        for ra in ras:
            rels = RaActividad.objects.filter(ra=ra)
            
            suma_w = 0.0
            suma_w_graded = 0.0
            acc_nota = 0.0
            
            for rel in rels:
                w = float(rel.porcentaje_ra_actividad) / 100.0
                suma_w += w
                
                nota_obj = NotasActividad.objects.filter(
                    matricula=mat,
                    ra_actividad=rel
                ).first()
                
                if nota_obj and nota_obj.nota_ra_actividad is not None:
                    nota = float(nota_obj.nota_ra_actividad)
                    suma_w_graded += w
                    acc_nota += nota * w
            
            # Calcular nota promedio
            if suma_w_graded > 0:
                nota_ra = acc_nota / suma_w_graded
                notas_ra_estudiante.append(nota_ra)
            else:
                nota_ra = None
            
            # Track RA bajo desempeño
            if nota_ra is not None and nota_ra < 3.0:
                tiene_bajo_desempenio = True
                
                if ra.id_ra not in asignaturas_stats[asig_key]["ras_afectados"]:
                    asignaturas_stats[asig_key]["ras_afectados"][ra.id_ra] = {
                        "nombre": ra.descripcion,
                        "count": 0,  # Estudiantes con bajo desempeño en este RA
                        "total": 0   # Estudiantes total en esta asignatura
                    }
                asignaturas_stats[asig_key]["ras_afectados"][ra.id_ra]["count"] += 1
        
        # Agregar estudiante a lista si tiene bajo desempeño
        if tiene_bajo_desempenio:
            asignaturas_stats[asig_key]["estudiantes_con_bajo_desempenio"].add(
                mat.estudiante.id_estudiante
            )

        # Clasificar por promedio final del estudiante en la asignatura.
        # Si no hay notas aún, se clasifica como "no bajo" para mantener
        # consistencia total: sobre_3 + bajo_3 == total_matriculados.
        if notas_ra_estudiante:
            promedio_asignatura = sum(notas_ra_estudiante) / len(notas_ra_estudiante)
            if promedio_asignatura < 3.0:
                asignaturas_stats[asig_key]["estudiantes_promedio_bajo_3"].add(
                    mat.estudiante.id_estudiante
                )
            else:
                asignaturas_stats[asig_key]["estudiantes_promedio_sobre_3"].add(
                    mat.estudiante.id_estudiante
                )
        else:
            asignaturas_stats[asig_key]["estudiantes_promedio_sobre_3"].add(
                mat.estudiante.id_estudiante
            )
        
        # Actualizar total para cada RA
        for ra in ras:
            if ra.id_ra not in asignaturas_stats[asig_key]["ras_afectados"]:
                asignaturas_stats[asig_key]["ras_afectados"][ra.id_ra] = {
                    "nombre": ra.descripcion,
                    "count": 0,
                    "total": 0
                }
            asignaturas_stats[asig_key]["ras_afectados"][ra.id_ra]["total"] += 1
    
    # Convertir a lista con porcentajes
    hu11_ranking = []
    
    for asig_key, asig_data in asignaturas_stats.items():
        total_bajo = len(asig_data["estudiantes_con_bajo_desempenio"])
        total_promedio_sobre_3 = len(asig_data["estudiantes_promedio_sobre_3"])
        total_promedio_bajo_3 = len(asig_data["estudiantes_promedio_bajo_3"])
        total_mat = asig_data["total_matriculados"]
        
        porcentaje_bajo = (total_bajo / total_mat * 100) if total_mat > 0 else 0
        porcentaje_promedio_sobre_3 = (total_promedio_sobre_3 / total_mat * 100) if total_mat > 0 else 0
        porcentaje_promedio_bajo_3 = (total_promedio_bajo_3 / total_mat * 100) if total_mat > 0 else 0
        
        # Calcular porcentaje de bajo desempeño por RA
        ras_afectados_list = []
        for ra_id, ra_stats in asig_data["ras_afectados"].items():
            pct_bajo_ra = (ra_stats["count"] / ra_stats["total"] * 100) if ra_stats["total"] > 0 else 0
            ras_afectados_list.append({
                "id_ra": ra_id,
                "nombre": ra_stats["nombre"],
                "porcentaje_bajo_desempenio": round(pct_bajo_ra, 1)
            })
        
        # Ordenar RAs por porcentaje de bajo desempeño
        ras_afectados_list.sort(key=lambda x: x["porcentaje_bajo_desempenio"], reverse=True)
        
        hu11_ranking.append({
            "codigo": asig_data["codigo"],
            "nombre": asig_data["nombre"],
            "grupo": asig_data["grupo"],
            "sede": asig_data["sede"],
            "total_matriculados": total_mat,
            "estudiantes_bajo_desempenio": total_bajo,
            "porcentaje_bajo_desempenio": round(porcentaje_bajo, 1),
            "estudiantes_promedio_sobre_3": total_promedio_sobre_3,
            "estudiantes_promedio_bajo_3": total_promedio_bajo_3,
            "porcentaje_promedio_sobre_3": round(porcentaje_promedio_sobre_3, 1),
            "porcentaje_promedio_bajo_3": round(porcentaje_promedio_bajo_3, 1),
            "ras_afectados": ras_afectados_list
        })
    
    # Ordenar por porcentaje de bajo desempeño (descendente)
    hu11_ranking.sort(key=lambda x: x["porcentaje_bajo_desempenio"], reverse=True)
    
    # ==================== RESUMEN Y RESPUESTA FINAL ====================
    
    asignaturas_criticas = [
        a for a in hu11_ranking
        if a["estudiantes_bajo_desempenio"] > 0 and a["porcentaje_bajo_desempenio"] > 0
    ]

    asignatura_con_mas_bajo = asignaturas_criticas[0]["nombre"] if asignaturas_criticas else None
    
    respuesta = {
        "hu10_estudiantes_bajo_desempenio": hu10_estudiantes,
        "hu11_asignaturas_ranking": hu11_ranking,
        "filtros_aplicados": {
            "periodo": periodo_desc if periodo_desc else None,
            "asignatura": asignatura_codigo if asignatura_codigo else None,
            "grupo": grupo if grupo else None,
            "id_asignatura": int(id_asignatura) if id_asignatura.isdigit() else None,
            "cohorte": cohorte if cohorte else None
        },
        "resumen": {
            "total_estudiantes_bajo_desempenio": len(hu10_estudiantes),
            "total_estudiantes_considerados": total_estudiantes_considerados,
            "total_asignaturas": len(asignaturas_criticas),
            "asignatura_con_mas_bajo_desempenio": asignatura_con_mas_bajo
        }
    }
    
    logger.info(f"Dashboard desempeño consultado por {coord.codigo_coordinador}")
    
    return Response(respuesta, status=status.HTTP_200_OK)
