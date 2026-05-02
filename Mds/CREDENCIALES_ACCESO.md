# 🔐 CREDENCIALES DE ACCESO - RA MANAGER

## 📋 Resumen de la base de datos
- **Programas**: 2 (Ingeniería Informática, Administración)
- **Períodos académicos**: 2025-1, 2025-2
- **Docentes**: 3
- **Asignaturas**: 3
- **Estudiantes**: 4
- **Matrículas activas**: 6
- **Actividades**: 2
- **Notas registradas**: 12

---

## 👨‍🏫 ACCESO DOCENTES

### Docente 1: Fundamentos de Programación
| Campo | Valor |
|-------|-------|
| **Nombre** | Cristian Rodriguez |
| **Código** | DOC001 |
| **Email/Usuario** | cristian.rodriguez@univalle.edu.co |
| **Contraseña** | Docente123! |
| **Asignatura** | Fundamentos de Programación (INF101) |
| **Créditos** | 4 |
| **Estudiantes** | 2 |

### Docente 2: Base de Datos
| Campo | Valor |
|-------|-------|
| **Nombre** | María Garcia |
| **Código** | DOC002 |
| **Email/Usuario** | maria.garcia@univalle.edu.co |
| **Contraseña** | Docente456! |
| **Asignatura** | Base de Datos (INF202) |
| **Créditos** | 3 |
| **Estudiantes** | 2 |

### Docente 3: Gestión de Proyectos
| Campo | Valor |
|-------|-------|
| **Nombre** | Juan López |
| **Código** | DOC003 |
| **Email/Usuario** | juan.lopez@univalle.edu.co |
| **Contraseña** | Docente789! |
| **Asignatura** | Gestión de Proyectos (ADM101) |
| **Créditos** | 3 |
| **Estudiantes** | 1 |

---

## 👨‍🎓 ACCESO ESTUDIANTES

### Estudiante 1: Ingeniería Informática - Diurna
| Campo | Valor |
|-------|-------|
| **Nombre completo** | David Escobar |
| **Código** | 2360529 |
| **Email/Usuario** | david.escobar@correounivalle.edu.co |
| **Contraseña** | Estudiante123! |
| **Programa** | Ingeniería Informática |
| **Jornada** | Diurna |
| **Asignaturas inscritas** | Fundamentos de Programación, Base de Datos |

### Estudiante 2: Ingeniería Informática - Diurna
| Campo | Valor |
|-------|-------|
| **Nombre completo** | Guadalupe Hincapie |
| **Código** | 2360800 |
| **Email/Usuario** | guadalupe.hincapie@correounivalle.edu.co |
| **Contraseña** | Estudiante456! |
| **Programa** | Ingeniería Informática |
| **Jornada** | Diurna |
| **Asignaturas inscritas** | Fundamentos de Programación, Base de Datos |

### Estudiante 3: Administración - Nocturna
| Campo | Valor |
|-------|-------|
| **Nombre completo** | Sofia Martinez |
| **Código** | 2360850 |
| **Email/Usuario** | sofia.martinez@correounivalle.edu.co |
| **Contraseña** | Estudiante789! |
| **Programa** | Administración de Empresas |
| **Jornada** | Nocturna |
| **Asignaturas inscritas** | Gestión de Proyectos |

### Estudiante 4: Ingeniería Informática - Diurna
| Campo | Valor |
|-------|-------|
| **Nombre completo** | Carlos Fernandez |
| **Código** | 2360900 |
| **Email/Usuario** | carlos.fernandez@correounivalle.edu.co |
| **Contraseña** | Estudiante321! |
| **Programa** | Ingeniería Informática |
| **Jornada** | Diurna |
| **Asignaturas inscritas** | Fundamentos de Programación, Base de Datos |

---

## 🧑‍💼 COORDINADORES POR PROGRAMA

- **Ingeniería Informática** (ING01)
   - **Coordinador**: Ana Maria Torres
   - **Código**: COO001
   - **Email/Usuario**: ana.torres@univalle.edu.co
   - **Contraseña**: Coordinador123!

- **Administración de Empresas** (ADM01)
   - **Coordinador**: Felipe Gomez
   - **Código**: COO002
   - **Email/Usuario**: felipe.gomez@univalle.edu.co
   - **Contraseña**: Coordinador456!


## 📚 ESTRUCTURA DE DATOS

### Asignaturas Ofrecidas
1. **Fundamentos de Programación** (INF101)
   - Docente: Cristian Rodriguez
   - Grupo: 01
   - Créditos: 4
   - Período: 2025-1
   - Estudiantes: David, Guadalupe, Carlos (3)

2. **Base de Datos** (INF202)
   - Docente: María García
   - Grupo: 01
   - Créditos: 3
   - Período: 2025-1
   - Estudiantes: David, Guadalupe, Carlos (3)

3. **Gestión de Proyectos** (ADM101)
   - Docente: Juan López
   - Grupo: 01
   - Créditos: 3
   - Período: 2025-1
   - Estudiantes: Sofia (1)

### Actividades Registradas
1. **Actividad 1** - Fundamentos de Programación
   - Tipo: Quiz
   - Fecha cierre: 2025-02-08
   - Nota promedio estudiantes: 4.5/5.0

2. **Actividad 2** - Base de Datos
   - Tipo: Taller
   - Fecha cierre: 2025-02-15
   - Nota promedio estudiantes: 4.5/5.0

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
print(f"Docentes: {Docente.objects.count()}")
print(f"Estudiantes: {Estudiante.objects.count()}")
print(f"Asignaturas: {Asignatura.objects.count()}")
print(f"Matrículas: {Matricula.objects.count()}")

# Listar todos los docentes
for doc in Docente.objects.all():
    print(f"- {doc.codigo_docente}: {doc.nombre} {doc.apellido}")

# Listar todos los estudiantes
for est in Estudiante.objects.all():
    print(f"- {est.codigo_estudiante}: {est.nombre} {est.apellido}")
```

---

## 📝 NOTAS IMPORTANTES

1. **Contraseñas**: Las contraseñas se han almacenado de forma segura con hashing PBKDF2
2. **Período académico activo**: 2025-1 (15 de enero - 30 de mayo)
3. **Notas de actividades**: Todas los estudiantes tienen notas de 4.5/5.0 en las actividades registradas
4. **Retroalimentación**: Se han incluido comentarios en todas las notas de actividades
5. **Estado de estudiantes**: Todos los estudiantes están marcados como activos

---

**Última actualización**: Mayo 1, 2026
**Estado de BD**: Limpia y lista para uso
