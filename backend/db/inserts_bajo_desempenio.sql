-- =====================================================
-- Script Adicional: Datos de Bajo Desempeño Realista
-- Propósito: Poblar dashboard con estudiantes fallando
-- =====================================================

BEGIN;

-- ===========================
-- 1) ESTUDIANTES ADICIONALES
-- ===========================

INSERT INTO estudiante (
  id_estudiante, nombre, apellido, codigo_estudiante, contrasena_estudiante,
  id_tipo_documento, num_documento, correo, jornada
) VALUES
  (25, 'Rodrigo',   'Gutiérrez',  'EST-025', 'hash_pwd_rod',   1, '2025', 'rodrigo.gutierrez@correo.edu', 'Diurna'),
  (26, 'Ináira',    'Flores',     'EST-026', 'hash_pwd_ina',   1, '2026', 'inaras.flores@correo.edu',     'Nocturna'),
  (27, 'Gastón',    'Ramos',      'EST-027', 'hash_pwd_gaston',1, '2027', 'gaston.ramos@correo.edu',      'Diurna'),
  (28, 'Valentina', 'Ibáñez',     'EST-028', 'hash_pwd_val',   1, '2028', 'valentina.ibanez@correo.edu',  'Diurna'),
  (29, 'Iván',      'Soto',       'EST-029', 'hash_pwd_ivan',  2, '2029', 'ivan.soto@correo.edu',         'Nocturna'),
  (30, 'Belén',     'Fuentes',    'EST-030', 'hash_pwd_belen', 1, '2030', 'belen.fuentes@correo.edu',     'Diurna')
ON CONFLICT (id_estudiante) DO NOTHING;

-- ==============================
-- 2) MATRÍCULAS CON BAJO DESEMPEÑO
-- ==============================

-- Período 2 (2025-1): Rodrigo, Ináira, Gastón en BD101 y PR101
INSERT INTO matricula (id_matricula, id_estudiante, id_periodo, id_asignatura, nota_final) VALUES
  (31, 25, 2, 1, NULL),  -- Rodrigo en BD101 (período 2025-1)
  (32, 26, 2, 1, NULL),  -- Ináira en BD101
  (33, 27, 2, 2, NULL),  -- Gastón en PR101
  (34, 28, 2, 2, NULL),  -- Valentina en PR101
  -- Período 3 (2025-2): Los mismos más otros en otros cursos
  (35, 25, 3, 4, NULL),  -- Rodrigo en MAT101 (período 2025-2)
  (36, 26, 3, 5, NULL),  -- Ináira en FIS101
  (37, 27, 3, 8, NULL),  -- Gastón en AI201
  (38, 28, 3, 6, NULL),  -- Valentina en ADM101
  (39, 29, 3, 7, NULL),  -- Iván en WEB301
  (40, 30, 3, 9, NULL)   -- Belén en DIS101
ON CONFLICT (id_matricula) DO NOTHING;

-- ============================================
-- 3) CALIFICACIONES CON BAJO DESEMPEÑO (< 3.0)
-- ============================================

-- Rodrigo (id=25) en BD101 (Período 2025-1)
-- RA1 y RA2 -> bajo desempeño en ambos
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion) VALUES
  (31, 1, 2.5, 'Entidades confusas, revisar modelo ER'),
  (31, 2, 2.3, 'Proyecto incompleto, falta normalización'),
  (31, 3, 2.7, 'Consultas básicas OK, pero faltan JOINs complejos'),
  (31, 4, 2.8, 'Examen por debajo del promedio');

-- Ináira (id=26) en BD101 (Período 2025-1)
-- RA2 con desempeño bajo
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion) VALUES
  (32, 1, 3.8, 'Modelo correcto'),
  (32, 2, 3.9, 'Proyecto sólido'),
  (32, 3, 2.8, 'Consultas simples fallan'),
  (32, 4, 2.9, 'Examen débil en SQL avanzado');

-- Gastón (id=27) en PR101 (Período 2025-1)
-- Ambos RAs con desempeño bajo
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion) VALUES
  (33, 5, 2.4, 'Análisis muy superficial'),
  (33, 6, 2.6, 'Algoritmos sin estructura lógica clara'),
  (33, 7, 2.9, 'Código desordenado, falta estructura'),
  (33, 8, 2.7, 'Parcial con muchos errores');

-- Valentina (id=28) en PR101 (Período 2025-1)
-- RA3 con bajo desempeño
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion) VALUES
  (34, 5, 3.2, 'Algunos algoritmos correctos'),
  (34, 6, 3.4, 'Buen esfuerzo en taller'),
  (34, 7, 2.8, 'Código poco legible'),
  (34, 8, 2.6, 'Parcial pobres resultados');

-- Rodrigo (id=25) en MAT101 (Período 2025-2)
-- RA7 con bajo desempeño
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion) VALUES
  (35, 13, 2.5, 'Error conceptual en límites'),
  (35, 14, 2.7, 'Derivadas mal dirigidas'),
  (35, 15, 3.1, 'Integrales básicas ok'),
  (35, 16, 3.2, 'Aplicaciones elementales');

-- Ináira (id=26) en FIS101 (Período 2025-2)
-- Ambos RAs con bajo desempeño
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion) VALUES
  (36, 17, 2.3, 'Lab de cinemática muy deficiente'),
  (36, 18, 2.4, 'Quiz dinámica fallo'),
  (36, 19, 2.8, 'Examen por debajo, conceptos débiles'),
  (36, 20, 2.9, 'Proyecto energía incompleto');

-- Gastón (id=27) en AI201 (Período 2025-2)
-- RA15 con bajo desempeño
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion) VALUES
  (37, 29, 2.6, 'Preproceso incompleto'),
  (37, 30, 2.8, 'Lab modelos con error metodológico'),
  (37, 31, 3.1, 'Examen promedio'),
  (37, 32, 3.3, 'Proyecto menos ambicioso');

-- Valentina (id=28) en ADM101 (Período 2025-2)
-- Normal
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion) VALUES
  (38, 21, 3.5, 'Foro activo'),
  (38, 22, 3.6, 'Examen ok'),
  (38, 23, 3.4, 'Tarea regular'),
  (38, 24, 3.7, 'Proyecto básico');

-- Iván (id=29) en WEB301 (Período 2025-2)
-- RA14 (Backend/API) con bajo desempeño
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion) VALUES
  (39, 25, 3.6, 'UI aceptable'),
  (39, 26, 3.8, 'Accesibilidad ok'),
  (39, 27, 2.7, 'CRUD mal estructurado'),
  (39, 28, 2.8, 'API incompleta, proyecto débil');

-- Belén (id=30) en DIS101 (Período 2025-2)
-- Mixto
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion) VALUES
  (40, 33, 3.0, 'Composición elemental'),
  (40, 34, 2.9, 'Afiche poco polido'),
  (40, 35, 2.6, 'Tipografía inconsistente'),
  (40, 36, 2.8, 'Paleta de color pobre');

-- ====================================
-- 4) ACTUALIZAR NOTAS FINALES (Opcional)
-- ====================================
-- Si el sistema usa nota_final, calculamos el promedio ponderado:
-- Por ahora dejaremos como NULL para que el backend lo calcule

COMMIT;

-- Verificar que los datos se insertaron
SELECT COUNT(*) as total_matriculas FROM matricula WHERE id_matricula >= 31;
SELECT COUNT(*) as total_notas_bajo_desempenio FROM notas_actividad WHERE nota_ra_actividad < 3.0;
