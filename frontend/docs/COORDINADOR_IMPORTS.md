# Importaciones del Coordinador

Este documento describe el formato esperado de los archivos CSV que el rol `coordinador` puede subir y la semántica de cada campo. Todos los endpoints requieren autenticación mediante `Authorization: Bearer <token>` con rol `coordinador`.

## Reglas Globales

- Formato: CSV con encabezado en la primera fila (UTF-8, se admite BOM).
- Tamaño máximo: 5 MB.
- Máximo filas (sin contar header): 5000. Si se excede se corta el procesamiento y se devuelve error de límite.
- MIME permitido: `text/csv`, `application/csv`, `application/vnd.ms-excel`, `text/plain` (solo si la extensión es `.csv`).
- Sanitización: Se eliminan bytes nulos (`\x00`) y se truncan cadenas a 255 caracteres.
- Respuesta: `{ created: n, existing: m, errors: [ { row, error }, ... ] }` (el arreglo de errores se recorta a 100 entradas; si hay más se agrega `{ more: 'se omitieron errores adicionales' }`).
- Auditoría: Cada import crea un registro en la tabla `import_audit` con agregados mínimos (tipo, filename, conteos, timestamp).

## 1. Matriculados

Endpoint: `POST /api/coordinador/import/matriculados`

Columnas mínimas (sinónimos aceptados):
| Requerido | Cabecera principal | Sinónimos |
|-----------|--------------------|-----------|
| Sí | `codigo_estudiante` | `estudiante`, `code` |
| Sí | `codigo_asignatura` | `asignatura`, `curso` |
| Sí | `periodo` | `periodo_academico` |

Flujo:
1. Busca estudiante por `codigo_estudiante`.
2. Busca asignatura por `codigo_asignatura`.
3. Busca período académico por descripción exacta (`periodo`).
4. Hace `get_or_create` en `matricula` para la combinación (estudiante, periodo, asignatura).

Errores comunes:
- Estudiante/Asignatura/Periodo no encontrado.
- Faltan columnas requeridas.
- Límite de filas excedido.

## 2. Docentes

Endpoint: `POST /api/coordinador/import/docentes`

Columnas mínimas:
| Requerido | Cabecera principal | Sinónimos |
|-----------|--------------------|-----------|
| Sí | `codigo_docente` | `docente`, `codigo` |
| Sí | `nombre` | `first_name` |
| Sí | `apellido` | `last_name` |
| Sí | `correo` | `email` |
| Sí | `tipo_documento` | `tipo_doc`, `doc_type` |
| Sí | `num_documento` | `documento`, `doc_number` |
| No | `num_telefono` | `telefono`, `phone` |
| No | `password` | — |

Flujo:
1. Valida existencia del `TipoDocumento` por descripción (case-insensitive).
2. Si el docente ya existe por `codigo_docente`, se cuenta como `existing` y opcionalmente se actualiza teléfono.
3. Si no existe, se crea con contraseña hasheada (`make_password`). Si no se proporciona `password` se genera aleatoria (`secrets.token_urlsafe(8)`).

Errores adicionales:
- `TipoDocumento` no encontrado.
- Violaciones al crear (unicidad de correo/código/documento).

## 3. Asignaturas + RAs

Endpoint: `POST /api/coordinador/import/asignaturas-ras`

Columnas mínimas para crear/actualizar asignatura:
| Requerido | Cabecera principal | Sinónimos |
|-----------|--------------------|-----------|
| Sí | `codigo_asignatura` | `asignatura`, `codigo` |
| Sí | `nombre_asignatura` | `nombre`, `nombre_curso` |
| Sí | `codigo_docente` | `docente` |
| Sí | `codigo_programa` | `programa` |
| No | `grupo` | — |

Columnas opcionales para crear un RA:
| Requerido | Cabecera principal | Sinónimos |
|-----------|--------------------|-----------|
| Sí (para crear RA) | `ra_descripcion` | `ra_desc`, `descripcion_ra` |
| Sí (para crear RA) | `ra_porcentaje` | `ra_pct`, `porcentaje_ra` |

Reglas RA:
- `ra_porcentaje` debe ser numérico 0..100.
- La suma de porcentajes existentes + el nuevo no debe exceder 100.

Actualización asignatura:
- Si ya existe, se incrementa `existing_asignaturas` y se actualizan `nombre` / `grupo` si cambiaron.

## Auditoría (`import_audit`)

Campos:
| Campo | Descripción |
|-------|-------------|
| `kind` | Tipo de import (`matriculados`, `docentes`, `asignaturas_ras`). |
| `filename` | Nombre original del archivo. |
| `created_count` | Total de entidades creadas (para asignaturas+RAs se suma ambos). |
| `existing_count` | Total de entidades ya existentes. |
| `errors_count` | Número de errores devueltos (tras recorte a 100). |
| `created_at` | Timestamp de la operación. |

Consulta futura: Se puede exponer un endpoint de sólo lectura para listar auditoría paginada y filtrar por `kind` y rango de fechas.

## Ejemplos rápidos

Matriculados:
```csv
codigo_estudiante,codigo_asignatura,periodo
EST001,ALG-1,2025-1
EST002,ALG-1,2025-1
```

Docentes:
```csv
codigo_docente,nombre,apellido,correo,tipo_documento,num_documento,num_telefono
D100,Ana,Perez,ana.perez@example.com,CC,123456,5551234
```

Asignaturas+RAs:
```csv
codigo_asignatura,nombre_asignatura,codigo_docente,codigo_programa,grupo,ra_descripcion,ra_porcentaje
EST-2,Estructuras II,D050,PRG-1,A,Resolver problemas de ... ,30
EST-2,Estructuras II,D050,PRG-1,A,Aplicar técnicas de ... ,20
```

## Próximos pasos
- Endpoint de listar auditoría.
- Validaciones adicionales (ej. dominios de correo, formato de período, background processing para archivos grandes).
- Notificación por correo al completar import con resumen.
