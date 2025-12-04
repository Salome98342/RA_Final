# Documentación del Proyecto RA-Manager

**Versión**: 1.0  
**Fecha**: Diciembre 2025  
**Sistema**: RA-Manager (Results of Learning Manager)

---

## 📚 Índice de Documentación

Esta carpeta contiene toda la documentación del proyecto RA-Manager, organizada por tipo y audiencia.

---

## 1. Documentación Técnica

### 1.1 Requerimientos y Análisis

- **[REQUERIMIENTOS.md](REQUERIMIENTOS.md)** ⭐
  - Requerimientos funcionales (RF-001 a RF-020)
  - Requerimientos no funcionales (RNF-001 a RNF-018)
  - Restricciones técnicas
  - Priorización de requerimientos

### 1.2 Diseño de Base de Datos

- **[MODELO_RELACIONAL.md](MODELO_RELACIONAL.md)** ⭐
  - Entidades principales (18 tablas)
  - Relaciones y cardinalidades
  - Restricciones de integridad
  - Índices y optimización
  - Consultas SQL frecuentes

### 1.3 Casos de Uso

- **[CASOS_DE_USO.md](CASOS_DE_USO.md)** ⭐
  - Casos de uso del Estudiante (CU-EST-001 a CU-EST-008)
  - Casos de uso del Docente (CU-DOC-001 a CU-DOC-007)
  - Casos de uso del Coordinador (CU-COORD-001 a CU-COORD-008)
  - Reglas de negocio
  - Priorización de casos de uso

### 1.4 Arquitectura del Proyecto

- **[ESTRUCTURA_CARPETAS.md](ESTRUCTURA_CARPETAS.md)** ⭐
  - Estructura completa del backend (Django)
  - Estructura completa del frontend (React + TypeScript)
  - Convenciones de nomenclatura
  - Archivos de configuración
  - Comandos útiles

---

## 2. Diagramas UML (PlantUML)

Directorio: **[diagramas/](diagramas/)**

### 2.1 Navegación Rápida

- **[README.md](diagramas/README.md)** - Guía de uso de diagramas PlantUML
- **[INDICE.md](diagramas/INDICE.md)** - Índice completo de todos los diagramas (607 líneas)
- **[RESUMEN_COMPLETO.md](diagramas/RESUMEN_COMPLETO.md)** - Resumen del sistema completo

### 2.2 Tipos de Diagramas (18 archivos .puml)

| **Tipo** | **Archivos** | **Descripción** |
|----------|-------------|-----------------|
| **Casos de Uso** | 3 | Diagramas por rol (estudiante, docente, coordinador) |
| **Secuencia** | 10 | Flujos detallados de interacciones |
| **Flujo (Actividad)** | 3 | Procesos complejos (calificación, importación, multi-RA) |
| **Clases** | 1 | Modelo de dominio con 18+ clases |
| **Paquetes** | 1 | Organización modular del sistema |
| **Entidad-Relación** | 1 | Modelo de base de datos completo |
| **Componentes** | 1 | Arquitectura de 3 capas |
| **Despliegue** | 1 | Infraestructura de producción |

---

## 3. Manuales de Usuario

### 3.1 Manual de Usuario (Estudiantes y Docentes)

- **[MANUAL_USUARIO.md](MANUAL_USUARIO.md)** ⭐
  - **Audiencia**: Estudiantes y Docentes
  - **Contenido**:
    * Acceso al sistema (login, recuperación de contraseña)
    * Funcionalidades del Estudiante (cursos, actividades, calificaciones, recursos)
    * Funcionalidades del Docente (crear actividades multi-RA, calificar, recursos)
    * Notificaciones y gestión de perfil
    * FAQ y solución de problemas

### 3.2 Manual de Administrador (Coordinadores)

- **[MANUAL_ADMINISTRADOR.md](MANUAL_ADMINISTRADOR.md)** ⭐
  - **Audiencia**: Coordinadores Académicos
  - **Contenido**:
    * Dashboard de estadísticas globales
    * Gestión de asignaturas y avance académico
    * **Importaciones masivas** (estudiantes, docentes, asignaturas y RAs)
    * Auditoría y historial de importaciones
    * Reportes y exportaciones
    * Mejores prácticas de administración

### 3.3 Manual de Instalación

- **[MANUAL_INSTALACION.md](MANUAL_INSTALACION.md)** ⭐
  - **Audiencia**: DevOps, Administradores de Sistema
  - **Contenido**:
    * Requisitos del sistema
    * Instalación en desarrollo local
    * **Instalación en producción** (PostgreSQL, Gunicorn, Nginx, SSL)
    * Configuración de email SMTP (Gmail)
    * Backup y mantenimiento
    * Troubleshooting y seguridad

---

## 4. Documentación de Características Específicas

### 4.1 Actividades Multi-RA

- **[ACTIVIDADES_AGRUPADAS.md](ACTIVIDADES_AGRUPADAS.md)**
  - Explicación del sistema de actividades multi-RA
  - Cómo una actividad evalúa múltiples RAs simultáneamente
  - Vista agrupada sin duplicación

### 4.2 Validación de Notas Multi-RA

- **[VALIDACION_NOTAS_MULTI_RA.md](VALIDACION_NOTAS_MULTI_RA.md)**
  - Cálculo de notas progresivas y estrictas
  - Distribución de notas entre RAs
  - Validaciones de suma de porcentajes

---

## 5. Documentación en la Raíz del Proyecto

Archivos en `../`:

### 5.1 Documentación Principal

- **[../README.md](../README.md)** (1438 líneas)
  - Descripción general del proyecto
  - Stack tecnológico
  - Guía rápida de inicio
  - Estructura del proyecto

### 5.2 Documentación de Desarrollo

- **[../DEVELOPMENT.md](../DEVELOPMENT.md)**
  - Guía de contribución al código
  - Estándares de codificación
  - Flujo de trabajo con Git
  - Testing

- **[../CONTRIBUTING.md](../CONTRIBUTING.md)**
  - Cómo contribuir al proyecto
  - Pull requests
  - Code review

- **[../CHANGELOG.md](../CHANGELOG.md)**
  - Historial de versiones
  - Cambios por versión

### 5.3 Documentación de Seguridad y Arquitectura

- **[../SECURITY.md](../SECURITY.md)**
  - Políticas de seguridad
  - Reporte de vulnerabilidades
  - Buenas prácticas

- **[../ARQUITECTURA_MEJORAS.md](../ARQUITECTURA_MEJORAS.md)**
  - Propuestas de mejoras arquitectónicas
  - Optimizaciones planificadas

- **[../OPTIMIZATIONS.md](../OPTIMIZATIONS.md)**
  - Optimizaciones implementadas
  - Performance tuning

### 5.4 Documentación del Sistema OTP

- **[../DIAGRAMS_OTP_SYSTEM.md](../DIAGRAMS_OTP_SYSTEM.md)**
  - Diagramas del sistema de recuperación de contraseña
  - Flujo de OTP

- **[../README_OTP_FILES.md](../README_OTP_FILES.md)**
  - Archivos relacionados con OTP
  - Configuración de email

---

## 6. Documentación del Backend

Directorio: `../backend/docs/`

- **EMAIL_SETUP.md** - Configuración de email SMTP
- **OTP_IMPLEMENTATION_SUMMARY.md** - Resumen de implementación OTP
- **OTP_SYSTEM_COMPLETE.md** - Sistema OTP completo
- **OTP_SYSTEM.md** - Documentación del sistema OTP

Archivos en `../backend/`:

- **ENV_GUIDE.md** - Guía de variables de entorno
- **GMAIL_SETUP.md** - Configuración específica de Gmail
- **SETUP.md** - Guía de setup inicial del backend

---

## 7. Documentación del Frontend

Directorio: `../frontend/docs/`

- **ALERTS_IMPROVEMENTS_SUMMARY.md** - Mejoras del sistema de alertas
- **ALERTS_SYSTEM.md** - Sistema de alertas y notificaciones
- **API_CONTRACT.md** - Contrato de API (endpoints)
- **COORDINADOR_IMPORTS.md** - Importaciones del coordinador
- **PASSWORD_RECOVERY_INTEGRATION.md** - Integración de recuperación de contraseña
- **SESSION_ISOLATION.md** - Aislamiento de sesiones por rol

---

## 8. Rutas Rápidas por Audiencia

### 👨‍🎓 Si eres Estudiante o Docente:
1. Lee **[MANUAL_USUARIO.md](MANUAL_USUARIO.md)**
2. Revisa **[CASOS_DE_USO.md](CASOS_DE_USO.md)** para casos de uso específicos
3. Consulta **[diagramas/secuencia/](diagramas/secuencia/)** para flujos detallados

### 👨‍💼 Si eres Coordinador:
1. Lee **[MANUAL_ADMINISTRADOR.md](MANUAL_ADMINISTRADOR.md)**
2. Revisa **[CASOS_DE_USO.md](CASOS_DE_USO.md)** sección de Coordinador
3. Consulta **[diagramas/flujo/flujo_importacion.puml](diagramas/flujo/flujo_importacion.puml)**

### 👨‍💻 Si eres Desarrollador:
1. Lee **[../README.md](../README.md)** y **[../DEVELOPMENT.md](../DEVELOPMENT.md)**
2. Revisa **[REQUERIMIENTOS.md](REQUERIMIENTOS.md)** y **[MODELO_RELACIONAL.md](MODELO_RELACIONAL.md)**
3. Explora **[ESTRUCTURA_CARPETAS.md](ESTRUCTURA_CARPETAS.md)**
4. Consulta **[diagramas/INDICE.md](diagramas/INDICE.md)** para todos los diagramas

### 🛠️ Si eres DevOps/Sysadmin:
1. Lee **[MANUAL_INSTALACION.md](MANUAL_INSTALACION.md)**
2. Revisa **[diagramas/despliegue/](diagramas/despliegue/)** para arquitectura
3. Consulta **[../SECURITY.md](../SECURITY.md)** para seguridad

---

## 9. Herramientas Recomendadas

### 9.1 Para Visualizar Diagramas PlantUML

**Online**:
- http://www.plantuml.com/plantuml/

**Local**:
- **VS Code**: Instala extensión "PlantUML" por jebbs
- **CLI**: `java -jar plantuml.jar archivo.puml`

### 9.2 Para Editar Documentación

- **VS Code** con extensiones:
  - Markdown All in One
  - Markdown Preview Enhanced
  - PlantUML

---

## 10. Contribución a la Documentación

Si encuentras errores o deseas mejorar la documentación:

1. Lee **[../CONTRIBUTING.md](../CONTRIBUTING.md)**
2. Crea un issue en GitHub
3. Envía un pull request con tus cambios

**Mantener actualizado**:
- Actualiza documentación junto con cambios de código
- Incrementa la versión en el encabezado
- Actualiza fecha de última modificación

---

## 11. Resumen de Archivos Creados

### Documentación Principal (docs/)

| **Archivo** | **Líneas** | **Descripción** |
|-------------|-----------|-----------------|
| REQUERIMIENTOS.md | ~700 | Requerimientos funcionales y no funcionales |
| MODELO_RELACIONAL.md | ~900 | Modelo de base de datos completo |
| CASOS_DE_USO.md | ~600 | Casos de uso textuales por rol |
| ESTRUCTURA_CARPETAS.md | ~450 | Estructura completa del proyecto |
| MANUAL_USUARIO.md | ~550 | Manual para estudiantes y docentes |
| MANUAL_ADMINISTRADOR.md | ~650 | Manual para coordinadores |
| MANUAL_INSTALACION.md | ~750 | Guía de instalación y despliegue |
| **TOTAL** | **~4,600 líneas** | **7 documentos principales** |

### Diagramas PlantUML (docs/diagramas/)

| **Categoría** | **Archivos** | **Descripción** |
|---------------|-------------|-----------------|
| Casos de uso | 3 | Por rol de usuario |
| Secuencia | 10 | Flujos de interacción |
| Flujo (Actividad) | 3 | Procesos complejos |
| Estructurales | 5 | Clases, ER, paquetes, componentes, despliegue |
| Documentación | 3 | README, INDICE, RESUMEN_COMPLETO |
| **TOTAL** | **24 archivos** | **18 diagramas + 3 guías** |

---

## 12. Contacto y Soporte

Para preguntas sobre la documentación:

- **Email**: docs@ra-manager.edu
- **Issues**: https://github.com/tu-org/RA-Manager/issues
- **Wiki**: https://github.com/tu-org/RA-Manager/wiki

---

## 13. Licencia

Este proyecto y su documentación están bajo la licencia especificada en `../LICENSE`.

---

**Fecha de última actualización**: Diciembre 4, 2025  
**Versión del índice**: 1.0  
**Responsable**: Equipo de Desarrollo RA-Manager

---

## 14. Leyenda de Símbolos

- ⭐ = Documento esencial (lectura prioritaria)
- 📚 = Documentación técnica detallada
- 🛠️ = Guía de configuración/instalación
- 👨‍💻 = Para desarrolladores
- 👨‍🎓 = Para usuarios finales
- 👨‍💼 = Para administradores
