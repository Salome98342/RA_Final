# 📋 Transformación Automática: Sistema de Registro Académico → RA Manager

## ✨ ¿Qué cambió?

La importación de estudiantes ahora **detecta automáticamente** si el Excel viene del Sistema de Registro Académico y lo transforma al formato correcto, **sin pasos intermedios**.

## 🚀 Cómo usar

### OPCIÓN 1: Upload directo en RA Manager (Recomendado - Automático)

1. **Descarga el Excel** del Sistema de Registro Académico
   - Debe tener columnas: `Codigo`, `Nombres`, `Apellidos`, `Email`, `Documento Identidad`, `Programa Academico`

2. **Ve al Panel del Coordinador** → Importar Estudiantes

3. **Sube el archivo Excel directamente**
   - El sistema lo detectará automáticamente
   - Se transformará de forma transparente
   - Los datos se importarán correctamente

### OPCIÓN 2: Usar Script Python (Manual - si prefieres pre-procesar)

Si quieres transformar primero y luego subir CSV:

```bash
cd backend
python transform_estudiantes.py tu_archivo.xlsx
```

Esto genera: `tu_archivo_para_importar.csv`

Luego subes ese CSV en RA Manager.

## 📊 Transformación que ocurre

| Formato Origen (Registro Académico) | → | Formato RA Manager |
|-----|---|---|
| `Codigo` | → | `codigo_estudiante` |
| `Nombres` | → | `nombre` |
| `Apellidos` | → | `apellido` |
| `Email` | → | `correo` |
| `Documento Identidad` (ej: "CC 1061234567") | → | `tipo_documento`="CC", `num_documento`="1061234567" |
| `Programa Academico` | → | `jornada` (detecta DIURNA/NOCTURNA/VESPERTINA) |

## 📝 Consulta SQL (si trabajas directamente en PostgreSQL)

```sql
-- Transformar datos en PostgreSQL
SELECT
    "Codigo"                                      AS codigo_estudiante,
    "Nombres"                                     AS nombre,
    "Apellidos"                                   AS apellido,
    "Email"                                       AS correo,
    SPLIT_PART("Documento Identidad", ' ', 1)    AS tipo_documento,
    SPLIT_PART("Documento Identidad", ' ', 2)    AS num_documento,
    CASE
        WHEN "Programa Academico" ILIKE '%NOCTURNA%' 
          OR "Programa Academico" ILIKE '%NOCHE%' THEN 'NOCTURNA'
        WHEN "Programa Academico" ILIKE '%VESPERTINA%'
          OR "Programa Academico" ILIKE '%TARDE%' THEN 'VESPERTINA'
        ELSE 'DIURNA'
    END AS jornada
FROM [NOMBRE_TABLA]
WHERE 
    "Codigo" IS NOT NULL AND "Codigo" != ''
    AND "Nombres" IS NOT NULL AND "Nombres" != ''
    AND "Apellidos" IS NOT NULL AND "Apellidos" != ''
    AND "Email" IS NOT NULL AND "Email" != ''
    AND "Documento Identidad" IS NOT NULL AND "Documento Identidad" != '';
```

Luego exportas como CSV y subes en RA Manager.

## 🔍 Características

✅ Detección automática del formato origen  
✅ Transformación transparente (el usuario no hace nada)  
✅ Separación inteligente de "Tipo Identidad" + "Número"  
✅ Detección automática de jornada basada en nombre del programa  
✅ Compatible con Excel y CSV  
✅ Sin pasos intermedios - todo en un upload  
✅ Validación antes de importar  
✅ Logging detallado para debuggeo  

## 📌 Notas

- La transformación es **opcional**: si subes un archivo ya en formato RA Manager, funciona igual
- Las columnas de origen detectan variaciones (espacios, mayúsculas/minúsculas)
- La jornada se asigna a `DIURNA` por defecto si no se puede detectar del programa
- Todos los datos se validan antes de crearse en la BD

## 🐛 Debuggeo

Si algo sale mal, revisa:
1. **Logs del servidor Django**: Busca `[TRANSFORM]` para ver qué pasó
2. **Consola del navegador** (F12): Mira el mensaje de error exacto
3. **Headers del archivo**: Verifica que las columnas tengan los nombres esperados

---

**Archivos modificados:**
- `backend/api/views/views.py`: Agregadas funciones `_detect_and_transform_academic_registro()` y modificado `coordinador_import_estudiantes_view()`
- `backend/transform_estudiantes.py`: Script standalone para pre-procesar (opcional)
