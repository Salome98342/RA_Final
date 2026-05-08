# 🔐 CREDENCIALES DE ACCESO - RA MANAGER

## 📋 Resumen de la base de datos
- **Programa**: 1 (Tecnología en Desarrollo de Software)
- **Período académico**: 2025-1
- **Docentes**: 4
- **Asignaturas**: 4
- **Estudiantes**: 20
- **Matrículas activas**: 20
- **Resultados de Aprendizaje**: 12 (3 por asignatura)
- **Indicadores de Logro**: 24 (2 por RA)
- **Actividades**: 24 (2 por RA)
- **Notas registradas**: 240 (todas calificadas)

---

## 👨‍🏫 ACCESO DOCENTES

### Docente 1: Fundamentos de Programación
| Campo | Valor |
|-------|-------|
| **Nombre** | Cristian Rodriguez |
| **Código** | DOC001 |
| **Email/Usuario** | cristian.rodriguez@example.com |
| **Contraseña** | Docente123! |
| **Asignatura** | Fundamentos de Programación (INF101) |
| **Créditos** | 4 |
| **Estudiantes** | 5 |

### Docente 2: Base de Datos
| Campo | Valor |
|-------|-------|
| **Nombre** | María Garcia |
| **Código** | DOC002 |
| **Email/Usuario** | maria.garcia@example.com |
| **Contraseña** | Docente123! |
| **Asignatura** | Base de Datos (INF202) |
| **Créditos** | 3 |
| **Estudiantes** | 5 |

### Docente 3: Arquitectura de Software
| Campo | Valor |
|-------|-------|
| **Nombre** | Juan López |
| **Código** | DOC003 |
| **Email/Usuario** | juan.lopez@example.com |
| **Contraseña** | Docente123! |
| **Asignatura** | Arquitectura de Software (INF303) |
| **Créditos** | 3 |
| **Estudiantes** | 5 |

### Docente 4: Desarrollo Web Avanzado
| Campo | Valor |
|-------|-------|
| **Nombre** | Ana Martinez |
| **Código** | DOC004 |
| **Email/Usuario** | ana.martinez@example.com |
| **Contraseña** | Docente123! |
| **Asignatura** | Desarrollo Web Avanzado (INF404) |
| **Créditos** | 4 |
| **Estudiantes** | 5 |

---

## 👨‍🎓 ACCESO ESTUDIANTES (20 estudiantes)

Todos los estudiantes siguen el mismo patrón:
- **Programa**: Tecnología en Desarrollo de Software
- **Contraseña para todos**: `Estudiante123!`
- **Correos**: `estudiante1@example.com` a `estudiante20@example.com`
- **Códigos**: `EST0001` a `EST0020`
- **Jornada**: Alternada (Diurna/Nocturna)
- **Estado**: Activos

### Distribución de estudiantes por asignatura:
- **Fundamentos de Programación**: Estudiantes 1-5
- **Base de Datos**: Estudiantes 6-10
- **Arquitectura de Software**: Estudiantes 11-15
- **Desarrollo Web Avanzado**: Estudiantes 16-20

#### Ejemplo de acceso - Estudiante 1
| Campo | Valor |
|-------|-------|
| **Nombre** | Estudiante1 DeTest |
| **Código** | EST0001 |
| **Email** | estudiante1@example.com |
| **Contraseña** | Estudiante123! |
| **Jornada** | Nocturna |

#### Ejemplo de acceso - Estudiante 10
| Campo | Valor |
|-------|-------|
| **Nombre** | Estudiante10 DeTest |
| **Código** | EST0010 |
| **Email** | estudiante10@example.com |
| **Contraseña** | Estudiante123! |
| **Jornada** | Diurna |

> **Patrón para cualquier estudiante**: `estudiante<N>@example.com` (donde N va de 1 a 20)

---

## 📚 ESTRUCTURA DE DATOS POR ASIGNATURA

### Asignatura 1: Fundamentos de Programación (INF101)
- **Docente**: Cristian Rodriguez
- **Créditos**: 4
- **Estudiantes inscritos**: 5 (EST0001-EST0005)
- **Resultados de Aprendizaje**: 3
  - RA 1 (33.33%): 2 indicadores + 2 actividades
  - RA 2 (33.33%): 2 indicadores + 2 actividades
  - RA 3 (33.33%): 2 indicadores + 2 actividades

### Asignatura 2: Base de Datos (INF202)
- **Docente**: María Garcia
- **Créditos**: 3
- **Estudiantes inscritos**: 5 (EST0006-EST0010)
- **Resultados de Aprendizaje**: 3 (misma estructura)

### Asignatura 3: Arquitectura de Software (INF303)
- **Docente**: Juan López
- **Créditos**: 3
- **Estudiantes inscritos**: 5 (EST0011-EST0015)
- **Resultados de Aprendizaje**: 3 (misma estructura)

### Asignatura 4: Desarrollo Web Avanzado (INF404)
- **Docente**: Ana Martinez
- **Créditos**: 4
- **Estudiantes inscritos**: 5 (EST0016-EST0020)
- **Resultados de Aprendizaje**: 3 (misma estructura)

---

## 📊 ACTIVIDADES Y CALIFICACIONES

**Estructura por RA:**
- **Actividad 1**: Quiz
  - Fecha de cierre: 7 días después de creación
  - Notas: Todas calificadas (3.0 - 5.0)

- **Actividad 2**: Taller
  - Fecha de cierre: 14 días después de creación
  - Notas: Todas calificadas (3.0 - 5.0)

**Total de calificaciones**: 240 notas registradas
- 24 actividades × 5 estudiantes × 2 indicadores = 240 notas

---

## 🔗 URLs DE ACCESO

| Servicio | URL | Puerto |
|----------|-----|--------|
| Backend (API) | http://localhost:8000 | 8000 |
| Frontend | http://localhost:5173 | 5173 |
| Admin Django | http://localhost:8000/admin | 8000 |

---

## ✅ VERIFICACIÓN DE DATOS

Para verificar que los datos se cargaron correctamente, ejecuta en el shell de Django:

```python
python manage.py shell

from api.models.models import *

# Ver cantidad de registros
print(f"Programas: {Programa.objects.count()}")
print(f"Docentes: {Docente.objects.count()}")
print(f"Estudiantes: {Estudiante.objects.count()}")
print(f"Asignaturas: {Asignatura.objects.count()}")
print(f"Matrículas: {Matricula.objects.count()}")
print(f"RAs: {ResultadoDeAprendizaje.objects.count()}")
print(f"Indicadores: {IndicadoresDeLogro.objects.count()}")
print(f"Actividades: {Actividad.objects.count()}")
print(f"Notas: {NotasActividad.objects.count()}")

# Listar todos los docentes
for doc in Docente.objects.all():
    print(f"- {doc.codigo_docente}: {doc.nombre} {doc.apellido} ({doc.correo})")

# Listar estudiantes de una asignatura
asig = Asignatura.objects.first()
for mat in Matricula.objects.filter(asignatura=asig):
    print(f"- {mat.estudiante.codigo_estudiante}: {mat.estudiante.nombre} ({mat.estudiante.correo})")
```

---

## 📝 NOTAS IMPORTANTES

1. **Contraseñas uniformes**: Todas usan patrones simples (Docente123!, Estudiante123!) para facilitar pruebas
2. **Correos .example**: Se usan dominios .example para evitar confusiones y validaciones reales
3. **Programa único**: Solo "Tecnología en Desarrollo de Software"
4. **Período académico**: 2025-1 (15 enero - 30 mayo 2025)
5. **Calificaciones**: Todas las actividades están completamente calificadas (240 notas)
6. **Indicadores de Logro**: Cada RA tiene exactamente 2 indicadores sin porcentajes
7. **Actividades**: Cada RA tiene 2 actividades (Quiz y Taller)
8. **Indicadores por Actividad**: Cada actividad está vinculada a los 2 indicadores de su RA

---

**Última actualización**: Mayo 6, 2026
**Estado de BD**: Limpia y lista para uso con datos de prueba completos
**Cambios realizados**: Migración de 2 programas a 1, 3 docentes a 4, datos de prueba mejorados

