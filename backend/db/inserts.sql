
-- Elimina todos los datos de las tablas, respetando claves foráneas (de hijos a padres)
-- Luego reinicia las secuencias de los IDs autoincrementales

-- 1. Eliminar datos (de tablas hijas a padres)
TRUNCATE notas_actividad
  , matricula
  , ra_actividad
  , actividad
  , tipo_actividad
  , indicadores_de_logro
  , resultado_de_aprendizaje
  , asignatura
  , periodo_academico
  , programa
  , estudiante
  , docente
  , tipo_documento
RESTART IDENTITY CASCADE;

BEGIN;

---------------------------
-- 1) CATÁLOGOS BÁSICOS  --
---------------------------

-- Tipo de documento
INSERT INTO tipo_documento (id_tipo_documento, descripcion) VALUES
  (1, 'Cédula de Ciudadanía'),
  (2, 'Cédula de Extranjería'),
  (3, 'Pasaporte'),
  (4, 'Tarjeta de Identidad')
ON CONFLICT (id_tipo_documento) DO NOTHING;

-- Tipo de actividad
INSERT INTO tipo_actividad (id_tipo_actividad, descripcion) VALUES
  (1, 'Examen'),
  (2, 'Quiz'),
  (3, 'Taller'),
  (4, 'Proyecto'),
  (5, 'Laboratorio'),
  (6, 'Práctica'),
  (7, 'Foro'),
  (8, 'Tarea')
ON CONFLICT (id_tipo_actividad) DO NOTHING;

-- Programas
INSERT INTO programa (id_programa, nombre, codigo_programa) VALUES
  (1, 'Ingeniería de Sistemas', 'IS-01'),
  (2, 'Matemáticas',            'MA-01'),
  (3, 'Física',                 'FI-01'),
  (4, 'Administración',         'AD-01'),
  (5, 'Diseño Gráfico',         'DI-01')
ON CONFLICT (id_programa) DO NOTHING;

---------------------------
-- 2) PERSONAS           --
---------------------------

-- Docentes
INSERT INTO docente (
  id_docente, nombre, apellido, codigo_docente, contrasenia_docente,
  correo, id_tipo_documento, num_documento, num_telefono
) VALUES
  (1, 'Juan',   'Pérez',   'DOC-001', 'hash_pwd_juan',  'juan.perez@uni.edu',   1, '1001', '3001112233'),
  (2, 'Ana',    'Gómez',   'DOC-002', 'hash_pwd_ana',   'ana.gomez@uni.edu',    1, '1002', '3001112244'),
  (3, 'Pedro',  'López',   'DOC-003', 'hash_pwd_pedro', 'pedro.lopez@uni.edu',  2, '1003', '3001112255'),
  (4, 'Marta',  'Díaz',    'DOC-004', 'hash_pwd_marta', 'marta.diaz@uni.edu',   1, '1004', '3001112266'),
  (5, 'Luis',   'Herrera', 'DOC-005', 'hash_pwd_luis',  'luis.herrera@uni.edu', 1, '1005', '3001112277'),
  (6, 'Sofía',  'Rojas',   'DOC-006', 'hash_pwd_sofia', 'sofia.rojas@uni.edu',  3, '1006', '3001112288'),
  (7, 'Carlos', 'Medina',  'DOC-007', 'hash_pwd_cmed',  'carlos.medina@uni.edu',1, '1007', '3001112299'),
  (8, 'Elena',  'Vargas',  'DOC-008', 'hash_pwd_elena', 'elena.vargas@uni.edu', 2, '1008', '3001112300')
ON CONFLICT (id_docente) DO NOTHING;

-- Estudiantes (24)
INSERT INTO estudiante (
  id_estudiante, nombre, apellido, codigo_estudiante, contrasena_estudiante,
  id_tipo_documento, num_documento, correo, jornada
) VALUES
  (1,  'Carlos',   'Ruiz',      'EST-001', 'hash_pwd_carlos', 1, '2001', 'carlos.ruiz@correo.edu',    'Diurna'),
  (2,  'Luisa',    'Martínez',  'EST-002', 'hash_pwd_luisa',  1, '2002', 'luisa.martinez@correo.edu', 'Nocturna'),
  (3,  'Diego',    'López',     'EST-003', 'hash_pwd_diego',  2, '2003', 'diego.lopez@correo.edu',    'Diurna'),
  (4,  'Paula',    'García',    'EST-004', 'hash_pwd_paula',  1, '2004', 'paula.garcia@correo.edu',   'Diurna'),
  (5,  'Andrés',   'Torres',    'EST-005', 'hash_pwd_andres', 1, '2005', 'andres.torres@correo.edu',  'Nocturna'),
  (6,  'María',    'Santos',    'EST-006', 'hash_pwd_maria',  1, '2006', 'maria.santos@correo.edu',   'Diurna'),
  (7,  'Javier',   'Quintero',  'EST-007', 'hash_pwd_javier', 3, '2007', 'javier.quintero@correo.edu','Diurna'),
  (8,  'Natalia',  'Vega',      'EST-008', 'hash_pwd_natalia',1, '2008', 'natalia.vega@correo.edu',   'Nocturna'),
  (9,  'Sergio',   'Cano',      'EST-009', 'hash_pwd_sergio', 1, '2009', 'sergio.cano@correo.edu',    'Diurna'),
  (10, 'Camila',   'Pardo',     'EST-010', 'hash_pwd_camila', 2, '2010', 'camila.pardo@correo.edu',   'Diurna'),
  (11, 'Felipe',   'Acosta',    'EST-011', 'hash_pwd_felipe', 1, '2011', 'felipe.acosta@correo.edu',  'Nocturna'),
  (12, 'Valeria',  'Mejía',     'EST-012', 'hash_pwd_vale',   1, '2012', 'valeria.mejia@correo.edu',  'Diurna'),
  (13, 'Mario',    'Cortés',    'EST-013', 'hash_pwd_mario',  1, '2013', 'mario.cortes@correo.edu',   'Diurna'),
  (14, 'Sara',     'Rincón',    'EST-014', 'hash_pwd_sara',   4, '2014', 'sara.rincon@correo.edu',    'Nocturna'),
  (15, 'Tomás',    'Mora',      'EST-015', 'hash_pwd_tomas',  1, '2015', 'tomas.mora@correo.edu',     'Diurna'),
  (16, 'Daniela',  'Cruz',      'EST-016', 'hash_pwd_dani',   1, '2016', 'daniela.cruz@correo.edu',   'Diurna'),
  (17, 'Hugo',     'Peña',      'EST-017', 'hash_pwd_hugo',   1, '2017', 'hugo.pena@correo.edu',      'Nocturna'),
  (18, 'Laura',    'Silva',     'EST-018', 'hash_pwd_laura',  2, '2018', 'laura.silva@correo.edu',    'Diurna'),
  (19, 'Santiago', 'Rojas',     'EST-019', 'hash_pwd_santi',  1, '2019', 'santiago.rojas@correo.edu', 'Diurna'),
  (20, 'Juana',    'Castaño',   'EST-020', 'hash_pwd_juana',  1, '2020', 'juana.castano@correo.edu',  'Nocturna'),
  (21, 'Esteban',  'Mendoza',   'EST-021', 'hash_pwd_esteban',1, '2021', 'esteban.mendoza@correo.edu','Diurna'),
  (22, 'Karol',    'Ramírez',   'EST-022', 'hash_pwd_karol',  3, '2022', 'karol.ramirez@correo.edu',  'Diurna'),
  (23, 'Brayan',   'Padilla',   'EST-023', 'hash_pwd_brayan', 1, '2023', 'brayan.padilla@correo.edu', 'Nocturna'),
  (24, 'Juliana',  'Arias',     'EST-024', 'hash_pwd_juli',   1, '2024', 'juliana.arias@correo.edu',  'Diurna')
ON CONFLICT (id_estudiante) DO NOTHING;

---------------------------
-- 3) PERÍODOS/ASIGNAT.  --
---------------------------

-- Periodos académicos
INSERT INTO periodo_academico (id_periodo, descripcion, fecha_inicio, fecha_finalizacion) VALUES
  (1, '2024-2', DATE '2024-07-15', DATE '2024-12-15'),
  (2, '2025-1', DATE '2025-01-15', DATE '2025-06-15'),
  (3, '2025-2', DATE '2025-07-15', DATE '2025-12-15'),
  (4, '2026-1', DATE '2026-01-15', DATE '2026-06-15')
ON CONFLICT (id_periodo) DO NOTHING;

-- Asignaturas (10)
INSERT INTO asignatura (
  id_asignatura, nombre, codigo_asignatura, id_docente, grupo, id_programa
) VALUES
  (1,  'Bases de Datos',               'BD101',   1, 'A', 1),
  (2,  'Programación I',               'PR101',   2, 'A', 1),
  (3,  'Programación II',              'PR201',   2, 'B', 1),
  (4,  'Cálculo I',                    'MAT101',  5, 'A', 2),
  (5,  'Física I',                     'FIS101',  3, 'A', 3),
  (6,  'Fundamentos de Administración','ADM101',  4, 'A', 4),
  (7,  'Desarrollo Web',               'WEB301',  6, 'A', 1),
  (8,  'Inteligencia Artificial',      'AI201',   7, 'A', 1),
  (9,  'Diseño Gráfico I',             'DIS101',  8, 'A', 5),
  (10, 'Estadística',                  'EST101',  5, 'A', 2)
ON CONFLICT (id_asignatura) DO NOTHING;

---------------------------
-- 4) RAs e INDICADORES  --
---------------------------

-- RA por asignatura (2 por curso, suman 100%)
INSERT INTO resultado_de_aprendizaje (id_ra, id_asignatura, porcentaje_ra, descripcion) VALUES
  -- BD101
  (1,  1, 50.00, 'Modela bases de datos relacionales'),
  (2,  1, 50.00, 'Escribe consultas SQL'),
  -- PR101
  (3,  2, 40.00, 'Comprende algoritmos básicos'),
  (4,  2, 60.00, 'Programa soluciones estructuradas'),
  -- PR201
  (5,  3, 50.00, 'Aplica estructuras de datos'),
  (6,  3, 50.00, 'Domina programación orientada a objetos'),
  -- MAT101
  (7,  4, 50.00, 'Resuelve límites y derivadas'),
  (8,  4, 50.00, 'Aplica integrales en problemas'),
  -- FIS101
  (9,  5, 50.00, 'Comprende cinemática y dinámica'),
  (10, 5, 50.00, 'Aplica leyes de conservación'),
  -- ADM101
  (11, 6, 50.00, 'Entiende teorías administrativas'),
  (12, 6, 50.00, 'Aplica planeación estratégica'),
  -- WEB301
  (13, 7, 50.00, 'Diseña interfaces web'),
  (14, 7, 50.00, 'Construye APIs y backend'),
  -- AI201
  (15, 8, 50.00, 'Modela problemas de ML'),
  (16, 8, 50.00, 'Entrena y evalúa modelos'),
  -- DIS101
  (17, 9, 50.00, 'Aplica principios de composición'),
  (18, 9, 50.00, 'Utiliza tipografía y color'),
  -- EST101
  (19, 10, 50.00, 'Describe variables y distribuciones'),
  (20, 10, 50.00, 'Inferencia y pruebas de hipótesis')
ON CONFLICT (id_ra) DO NOTHING;

-- Indicadores (2 por RA, suman 100%)
INSERT INTO indicadores_de_logro (id_ind, id_ra, porcentaje_ind, descripcion) VALUES
  (1,  1, 50.00, 'Identifica entidades y atributos'),
  (2,  1, 50.00, 'Normaliza tablas'),
  (3,  2, 50.00, 'Escribe consultas SELECT'),
  (4,  2, 50.00, 'Utiliza JOIN correctamente'),
  (5,  3, 50.00, 'Analiza problemas elementales'),
  (6,  3, 50.00, 'Diseña algoritmos básicos'),
  (7,  4, 50.00, 'Estructuras de control'),
  (8,  4, 50.00, 'Funciones y modularización'),
  (9,  5, 50.00, 'Usa listas, colas y pilas'),
  (10, 5, 50.00, 'Usa árboles y grafos'),
  (11, 6, 50.00, 'Clases y objetos'),
  (12, 6, 50.00, 'Herencia y polimorfismo'),
  (13, 7, 50.00, 'Resuelve límites'),
  (14, 7, 50.00, 'Aplica derivadas'),
  (15, 8, 50.00, 'Cálculo de áreas'),
  (16, 8, 50.00, 'Integrales impropias'),
  (17, 9, 50.00, 'Movimiento rectilíneo'),
  (18, 9, 50.00, 'Leyes de Newton'),
  (19, 10,50.00, 'Energía mecánica'),
  (20, 10,50.00, 'Cantidad de movimiento'),
  (21, 11,50.00, 'Escuelas de administración'),
  (22, 11,50.00, 'Procesos organizacionales'),
  (23, 12,50.00, 'Análisis estratégico'),
  (24, 12,50.00, 'Indicadores de gestión'),
  (25, 13,50.00, 'Wireframes y prototipos'),
  (26, 13,50.00, 'Accesibilidad'),
  (27, 14,50.00, 'Endpoints REST'),
  (28, 14,50.00, 'Persistencia y ORM'),
  (29, 15,50.00, 'Preprocesamiento de datos'),
  (30, 15,50.00, 'Selección de modelos'),
  (31, 16,50.00, 'Métricas de evaluación'),
  (32, 16,50.00, 'Validación cruzada'),
  (33, 17,50.00, 'Regla de tercios'),
  (34, 17,50.00, 'Balance y contraste'),
  (35, 18,50.00, 'Tipografías'),
  (36, 18,50.00, 'Paletas de color'),
  (37, 19,50.00, 'Medidas de tendencia'),
  (38, 19,50.00, 'Dispersión'),
  (39, 20,50.00, 'Intervalos de confianza'),
  (40, 20,50.00, 'Pruebas t y chi-cuadrado')
ON CONFLICT (id_ind) DO NOTHING;

---------------------------
-- 5) ACTIVIDADES / RA   --
---------------------------

-- Actividades (40)
INSERT INTO actividad (
  id_actividad, id_tipo_actividad, nombre_actividad, descripcion,
  porcentaje_actividad, fecha_creacion, fecha_cierre
) VALUES
  -- BD101
  (1, 1, 'Examen Final BD',       'Examen final de Bases de Datos', 20.00, DATE '2025-05-30', DATE '2025-06-01'),
  (2, 4, 'Proyecto BD',           'Proyecto de modelado y SQL',     30.00, DATE '2025-03-01', DATE '2025-06-10'),
  (3, 2, 'Quiz SQL',              'Quiz de consultas SQL',          10.00, DATE '2025-04-15', DATE '2025-04-20'),
  (4, 3, 'Taller Modelo',         'Entidades y relaciones',         15.00, DATE '2025-03-10', DATE '2025-03-20'),
  -- PR101
  (5, 1, 'Examen Parcial PR1',    'Parcial del curso',              25.00, DATE '2025-04-20', DATE '2025-04-25'),
  (6, 2, 'Quiz Algoritmos',       'Quiz de algoritmos',             15.00, DATE '2025-03-10', DATE '2025-03-12'),
  (7, 3, 'Taller Algoritmos',     'Ejercicios prácticos',           20.00, DATE '2025-03-20', DATE '2025-03-30'),
  (8, 4, 'Proyecto Final PR1',    'Proyecto final del curso',       40.00, DATE '2025-05-01', DATE '2025-06-15'),
  -- PR201
  (9,  5, 'Lab Estructuras',      'Laboratorio con TDA',            20.00, DATE '2025-09-05', DATE '2025-09-10'),
  (10, 6, 'Práctica OOP',         'Práctica de POO',                20.00, DATE '2025-09-15', DATE '2025-09-20'),
  (11, 1, 'Examen PR2',           'Examen teórico',                 30.00, DATE '2025-10-10', DATE '2025-10-12'),
  (12, 4, 'Proyecto PR2',         'Proyecto estructuras/OOP',       30.00, DATE '2025-10-20', DATE '2025-12-01'),
  -- MAT101
  (13, 2, 'Quiz Límites',         'Quiz de límites',                10.00, DATE '2025-02-20', DATE '2025-02-22'),
  (14, 1, 'Examen Derivadas',     'Examen de derivadas',            30.00, DATE '2025-03-25', DATE '2025-03-28'),
  (15, 3, 'Taller Integrales',    'Taller aplicado',                20.00, DATE '2025-04-05', DATE '2025-04-10'),
  (16, 4, 'Proyecto Cálculo',     'Proyecto de aplicación',         40.00, DATE '2025-05-05', DATE '2025-06-05'),
  -- FIS101
  (17, 5, 'Lab Cinemática',       'Pista de movimiento',            25.00, DATE '2025-08-20', DATE '2025-08-25'),
  (18, 2, 'Quiz Dinámica',        'Leyes de Newton',                15.00, DATE '2025-09-05', DATE '2025-09-07'),
  (19, 1, 'Examen Física I',      'Examen global',                  30.00, DATE '2025-11-20', DATE '2025-11-22'),
  (20, 4, 'Proyecto Física',      'Conservación de energía',        30.00, DATE '2025-10-01', DATE '2025-12-01'),
  -- ADM101
  (21, 7, 'Foro Teorías',         'Discusión de escuelas',          10.00, DATE '2025-02-10', DATE '2025-02-15'),
  (22, 8, 'Tarea Casos',          'Estudio de casos',               20.00, DATE '2025-03-01', DATE '2025-03-10'),
  (23, 1, 'Examen Adm',           'Examen de medio curso',          30.00, DATE '2025-04-05', DATE '2025-04-07'),
  (24, 4, 'Proyecto Plan',        'Plan estratégico',               40.00, DATE '2025-05-01', DATE '2025-06-10'),
  -- WEB301
  (25, 3, 'Taller UI',            'Layouts y componentes',          20.00, DATE '2025-08-10', DATE '2025-08-20'),
  (26, 5, 'Lab Accesibilidad',    'Buenas prácticas',               20.00, DATE '2025-09-01', DATE '2025-09-05'),
  (27, 8, 'Tarea API',            'CRUD REST',                      20.00, DATE '2025-10-01', DATE '2025-10-05'),
  (28, 4, 'Proyecto Web',         'Full-stack app',                 40.00, DATE '2025-10-10', DATE '2025-12-10'),
  -- AI201
  (29, 8, 'Tarea Preproceso',     'Limpieza de datos',              15.00, DATE '2025-08-15', DATE '2025-08-20'),
  (30, 5, 'Lab Modelos',          'Modelos clásicos',               25.00, DATE '2025-09-10', DATE '2025-09-15'),
  (31, 1, 'Examen AI',            'Examen de teoría',               30.00, DATE '2025-11-05', DATE '2025-11-07'),
  (32, 4, 'Proyecto AI',          'Pipeline ML',                    30.00, DATE '2025-10-05', DATE '2025-12-05'),
  -- DIS101
  (33, 3, 'Taller Composición',   'Reglas básicas',                 20.00, DATE '2025-02-05', DATE '2025-02-10'),
  (34, 8, 'Tarea Tipografía',     'Familias y jerarquías',          20.00, DATE '2025-03-01', DATE '2025-03-05'),
  (35, 2, 'Quiz Color',           'Paletas y contraste',            20.00, DATE '2025-04-01', DATE '2025-04-03'),
  (36, 4, 'Proyecto Afiche',      'Diseño integral',                40.00, DATE '2025-05-01', DATE '2025-06-01'),
  -- EST101
  (37, 2, 'Quiz Descriptiva',     'Medidas descriptivas',           20.00, DATE '2025-02-20', DATE '2025-02-22'),
  (38, 8, 'Tarea Probabilidad',   'Problemas clásicos',             20.00, DATE '2025-03-10', DATE '2025-03-15'),
  (39, 1, 'Examen Inferencia',    'Pruebas e intervalos',           30.00, DATE '2025-04-25', DATE '2025-04-27'),
  (40, 4, 'Proyecto Datos',       'Análisis de dataset',            30.00, DATE '2025-05-10', DATE '2025-06-05')
ON CONFLICT (id_actividad) DO NOTHING;

-- Relación RA - Actividad (2 por RA, suman 100%)
INSERT INTO ra_actividad (id_ra_actividad, id_actividad, id_ra, porcentaje_ra_actividad) VALUES
  -- BD101
  (1,  4, 1, 40.00),
  (2,  2, 1, 60.00),
  (3,  3, 2, 40.00),
  (4,  1, 2, 60.00),
  -- PR101
  (5,  6, 3, 50.00),
  (6,  7, 3, 50.00),
  (7,  8, 4, 40.00),
  (8,  5, 4, 60.00),
  -- PR201
  (9,  9,  5, 50.00),
  (10, 11, 5, 50.00),
  (11, 10, 6, 40.00),
  (12, 12, 6, 60.00),
  -- MAT101
  (13, 13, 7, 40.00),
  (14, 14, 7, 60.00),
  (15, 15, 8, 50.00),
  (16, 16, 8, 50.00),
  -- FIS101
  (17, 17, 9, 50.00),
  (18, 18, 9, 50.00),
  (19, 19,10, 60.00),
  (20, 20,10, 40.00),
  -- ADM101
  (21, 21,11, 30.00),
  (22, 23,11, 70.00),
  (23, 22,12, 40.00),
  (24, 24,12, 60.00),
  -- WEB301
  (25, 25,13, 40.00),
  (26, 26,13, 60.00),
  (27, 27,14, 40.00),
  (28, 28,14, 60.00),
  -- AI201
  (29, 29,15, 40.00),
  (30, 30,15, 60.00),
  (31, 31,16, 50.00),
  (32, 32,16, 50.00),
  -- DIS101
  (33, 33,17, 50.00),
  (34, 36,17, 50.00),
  (35, 34,18, 40.00),
  (36, 35,18, 60.00),
  -- EST101
  (37, 37,19, 50.00),
  (38, 38,19, 50.00),
  (39, 39,20, 60.00),
  (40, 40,20, 40.00)
ON CONFLICT (id_ra_actividad) DO NOTHING;

---------------------------
-- 6) MATRÍCULAS         --
---------------------------

-- Nota: combina estudiantes y cursos en distintos periodos
INSERT INTO matricula (id_matricula, id_estudiante, id_periodo, id_asignatura, nota_final) VALUES
  -- 2025-1 (periodo 2)
  (1,  1, 2, 1, NULL),
  (2,  2, 2, 1, NULL),
  (3,  1, 3, 2, NULL),
  (4,  2, 3, 2, NULL),
  (5,  3, 2, 1, NULL),
  (6,  4, 2, 1, NULL),
  (7,  5, 2, 2, NULL),
  (8,  6, 2, 2, NULL),
  (9,  7, 2, 4, NULL),
  (10, 8, 2, 4, NULL),
  (11, 9, 2, 6, NULL),
  (12, 10,2, 6, NULL),
  -- 2025-2 (periodo 3)
  (13, 11,3, 5, NULL),
  (14, 12,3, 5, NULL),
  (15, 13,3, 7, NULL),
  (16, 14,3, 7, NULL),
  (17, 15,3, 8, NULL),
  (18, 16,3, 8, NULL),
  (19, 17,3, 10, NULL),
  (20, 18,3, 10, NULL),
  (21, 19,3, 3, NULL),
  (22, 20,3, 3, NULL),
  (23, 21,3, 9, NULL),
  (24, 22,3, 9, NULL),
  -- Extras
  (25, 3, 2, 2, NULL),
  (26, 4, 2, 2, NULL),
  (27, 5, 3, 5, NULL),
  (28, 6, 3, 5, NULL),
  (29, 23,3, 7, NULL),
  (30, 24,3, 7, NULL)
ON CONFLICT (id_matricula) DO NOTHING;

---------------------------
-- 7) NOTAS POR ACTIVIDAD
---------------------------

-- Helper: Para cada matrícula, califica las RA_Actividad del curso correspondiente
-- BD101 -> RA_Actividad {1,2,3,4} (RA1 y RA2)
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion, id_ind) VALUES
  (1, 1, 4.5, 'Buen taller', 1),
  (1, 2, 4.2, 'Proyecto sólido', 2),
  (1, 3, 3.8, 'Revisar subconsultas', 3),
  (1, 4, 4.1, 'Examen correcto', 4),
  (2, 1, 3.6, 'Puede mejorar modelo', 2),
  (2, 2, 3.9, 'Proyecto completo', 1),
  (2, 3, 3.7, 'Faltó optimizar', 4),
  (2, 4, 3.5, 'Parcial aceptable', 3),
  (5, 1, 4.0, 'Bien ER', 2),
  (5, 2, 4.3, 'Buen diseño', 1),
  (6, 3, 3.4, 'JOIN confusos', 4),
  (6, 4, 3.9, 'Examen ok', 3)
ON CONFLICT (id_matricula, id_ra_actividad) DO NOTHING;

-- PR101 -> RA_Actividad {5,6,7,8}
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion, id_ind) VALUES
  (7,  5, 4.1, 'Buen análisis', 5),
  (7,  6, 4.0, 'Buen taller',   6),
  (7,  7, 4.2, 'Proyecto claro', 8),
  (7,  8, 3.9, 'Parcial sólido', 7),
  (8,  5, 3.5, 'Mejorar lógica', 5),
  (8,  6, 3.8, 'Taller correcto',6),
  (8,  7, 3.6, 'Proyecto básico',8),
  (8,  8, 3.7, 'Parcial regular',7),
  (25, 5, 4.3, 'Muy bien', 6),
  (26, 6, 4.0, 'Aceptable', 5)
ON CONFLICT (id_matricula, id_ra_actividad) DO NOTHING;

-- MAT101 -> RA_Actividad {13,14,15,16}
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion, id_ind) VALUES
  (9,  13, 4.5, 'Límites bien', 13),
  (9,  14, 4.2, 'Derivadas bien',14),
  (10, 15, 3.9, 'Integrales ok', 15),
  (10, 16, 3.8, 'Aplicaciones ok',16)
ON CONFLICT (id_matricula, id_ra_actividad) DO NOTHING;

-- FIS101 -> RA_Actividad {17,18,19,20}
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion, id_ind) VALUES
  (13, 17, 4.0, 'Buen lab', 17),
  (13, 18, 3.7, 'Quiz aceptable', 18),
  (14, 19, 3.6, 'Examen regular', 19),
  (14, 20, 3.9, 'Proyecto correcto', 20),
  (27, 17, 4.2, 'Excelente', 18),
  (28, 18, 3.8, 'Bien', 17)
ON CONFLICT (id_matricula, id_ra_actividad) DO NOTHING;

-- ADM101 -> RA_Actividad {21,22,23,24}
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion, id_ind) VALUES
  (11, 21, 4.4, 'Foro activo', 21),
  (11, 22, 4.0, 'Buen examen', 22),
  (12, 23, 3.7, 'Tarea correcta', 23),
  (12, 24, 4.1, 'Proyecto con enfoque', 24)
ON CONFLICT (id_matricula, id_ra_actividad) DO NOTHING;

-- WEB301 -> RA_Actividad {25,26,27,28}
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion, id_ind) VALUES
  (15, 25, 4.2, 'UI consistente', 25),
  (15, 26, 4.0, 'Accesibilidad ok', 26),
  (16, 27, 3.8, 'CRUD correcto', 27),
  (16, 28, 4.0, 'Buen proyecto', 28),
  (29, 25, 3.9, 'Mejorar contraste', 26),
  (30, 28, 4.3, 'Excelente entrega', 28)
ON CONFLICT (id_matricula, id_ra_actividad) DO NOTHING;

-- AI201 -> RA_Actividad {29,30,31,32}
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion, id_ind) VALUES
  (17, 29, 4.1, 'Preproceso completo', 29),
  (17, 30, 3.9, 'Lab correcto',        30),
  (18, 31, 3.7, 'Examen correcto',     31),
  (18, 32, 4.0, 'Proyecto funcional',  32)
ON CONFLICT (id_matricula, id_ra_actividad) DO NOTHING;

-- DIS101 -> RA_Actividad {33,34,35,36}
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion, id_ind) VALUES
  (23, 33, 4.3, 'Composición sólida', 33),
  (23, 34, 4.0, 'Afiche correcto',    34),
  (24, 35, 3.6, 'Tipografías ok',     35),
  (24, 36, 3.9, 'Color adecuado',     36)
ON CONFLICT (id_matricula, id_ra_actividad) DO NOTHING;

-- EST101 -> RA_Actividad {37,38,39,40}
INSERT INTO notas_actividad (id_matricula, id_ra_actividad, nota_ra_actividad, retroalimentacion, id_ind) VALUES
  (19, 37, 4.2, 'Descriptiva bien', 37),
  (19, 38, 4.0, 'Tarea correcta',   38),
  (20, 39, 3.7, 'Examen correcto',  39),
  (20, 40, 3.9, 'Proyecto sólido',  40)
ON CONFLICT (id_matricula, id_ra_actividad) DO NOTHING;


COMMIT;

