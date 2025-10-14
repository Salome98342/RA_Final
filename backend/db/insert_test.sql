-- backend/db/test_inserts.sql

\set ON_ERROR_STOP on

BEGIN;

-- 1) Basic presence and counts tailored to backend/db/inserts.sql
DO $$
DECLARE
  v_count int;
BEGIN
  -- Catalogs
  SELECT COUNT(*) INTO v_count FROM tipo_documento;
  IF v_count < 4 THEN RAISE EXCEPTION 'Fallo: tipo_documento esperados >= 4, got %', v_count; END IF;
  RAISE NOTICE 'PASS: tipo_documento >= 4 (%).', v_count;

  SELECT COUNT(*) INTO v_count FROM tipo_actividad;
  IF v_count < 8 THEN RAISE EXCEPTION 'Fallo: tipo_actividad esperados >= 8, got %', v_count; END IF;
  RAISE NOTICE 'PASS: tipo_actividad >= 8 (%).', v_count;

  SELECT COUNT(*) INTO v_count FROM programa;
  IF v_count < 5 THEN RAISE EXCEPTION 'Fallo: programa esperados >= 5, got %', v_count; END IF;
  RAISE NOTICE 'PASS: programa >= 5 (%).', v_count;

  -- People
  SELECT COUNT(*) INTO v_count FROM docente;
  IF v_count <> 8 THEN RAISE EXCEPTION 'Fallo: docentes esperados = 8, got %', v_count; END IF;
  RAISE NOTICE 'PASS: docentes = 8.';

  SELECT COUNT(*) INTO v_count FROM estudiante;
  IF v_count <> 24 THEN RAISE EXCEPTION 'Fallo: estudiantes esperados = 24, got %', v_count; END IF;
  RAISE NOTICE 'PASS: estudiantes = 24.';

  -- Academic structures
  SELECT COUNT(*) INTO v_count FROM periodo_academico;
  IF v_count <> 4 THEN RAISE EXCEPTION 'Fallo: periodos esperados = 4, got %', v_count; END IF;
  RAISE NOTICE 'PASS: periodos = 4.';

  SELECT COUNT(*) INTO v_count FROM asignatura;
  IF v_count <> 10 THEN RAISE EXCEPTION 'Fallo: asignaturas esperadas = 10, got %', v_count; END IF;
  RAISE NOTICE 'PASS: asignaturas = 10.';

  SELECT COUNT(*) INTO v_count FROM resultado_de_aprendizaje;
  IF v_count <> 20 THEN RAISE EXCEPTION 'Fallo: RAs esperados = 20, got %', v_count; END IF;
  RAISE NOTICE 'PASS: RAs = 20.';

  SELECT COUNT(*) INTO v_count FROM indicadores_de_logro;
  IF v_count <> 40 THEN RAISE EXCEPTION 'Fallo: indicadores esperados = 40, got %', v_count; END IF;
  RAISE NOTICE 'PASS: indicadores = 40.';

  SELECT COUNT(*) INTO v_count FROM actividad;
  IF v_count <> 40 THEN RAISE EXCEPTION 'Fallo: actividades esperadas = 40, got %', v_count; END IF;
  RAISE NOTICE 'PASS: actividades = 40.';

  SELECT COUNT(*) INTO v_count FROM ra_actividad;
  IF v_count <> 40 THEN RAISE EXCEPTION 'Fallo: ra_actividad esperadas = 40, got %', v_count; END IF;
  RAISE NOTICE 'PASS: ra_actividad = 40.';

  SELECT COUNT(*) INTO v_count FROM matricula;
  IF v_count <> 30 THEN RAISE EXCEPTION 'Fallo: matrículas esperadas = 30, got %', v_count; END IF;
  RAISE NOTICE 'PASS: matrículas = 30.';

  SELECT COUNT(*) INTO v_count FROM notas_actividad;
  IF v_count <> 54 THEN RAISE EXCEPTION 'Fallo: notas_actividad esperadas = 54, got %', v_count; END IF;
  RAISE NOTICE 'PASS: notas_actividad = 54.';
END $$;

-- 2) Estructura: por asignatura, 2 RAs y suman ~100%
DO $$
DECLARE v_bad int;
BEGIN
  -- Dos RAs por asignatura
  SELECT COUNT(*) INTO v_bad
  FROM (
    SELECT id_asignatura, COUNT(*) c
    FROM resultado_de_aprendizaje
    GROUP BY id_asignatura
    HAVING COUNT(*) <> 2
  ) t;
  IF v_bad > 0 THEN RAISE EXCEPTION 'Fallo: asignaturas con #RA != 2: %', v_bad; END IF;
  RAISE NOTICE 'PASS: cada asignatura tiene 2 RAs.';

  -- Suma de porcentaje_ra ≈ 100
  SELECT COUNT(*) INTO v_bad
  FROM (
    SELECT id_asignatura, SUM(porcentaje_ra) s
    FROM resultado_de_aprendizaje
    GROUP BY id_asignatura
    HAVING ABS(SUM(porcentaje_ra) - 100) > 0.01
  ) t;
  IF v_bad > 0 THEN RAISE EXCEPTION 'Fallo: asignaturas con suma porcentaje_ra != 100: %', v_bad; END IF;
  RAISE NOTICE 'PASS: porcentaje_ra por asignatura suma 100.';
END $$;

-- 3) Estructura: por RA, 2 indicadores y suman ~100%
DO $$
DECLARE v_bad int;
BEGIN
  -- Dos indicadores por RA
  SELECT COUNT(*) INTO v_bad
  FROM (
    SELECT id_ra, COUNT(*) c
    FROM indicadores_de_logro
    GROUP BY id_ra
    HAVING COUNT(*) <> 2
  ) t;
  IF v_bad > 0 THEN RAISE EXCEPTION 'Fallo: RAs con #indicadores != 2: %', v_bad; END IF;
  RAISE NOTICE 'PASS: cada RA tiene 2 indicadores.';

  -- Suma de porcentaje_ind ≈ 100
  SELECT COUNT(*) INTO v_bad
  FROM (
    SELECT id_ra, SUM(porcentaje_ind) s
    FROM indicadores_de_logro
    GROUP BY id_ra
    HAVING ABS(SUM(porcentaje_ind) - 100) > 0.01
  ) t;
  IF v_bad > 0 THEN RAISE EXCEPTION 'Fallo: RAs con suma porcentaje_ind != 100: %', v_bad; END IF;
  RAISE NOTICE 'PASS: porcentaje_ind por RA suma 100.';
END $$;

-- 4) Estructura: por RA, ra_actividad suma ~100% y existen referencias válidas
DO $$
DECLARE v_bad int;
BEGIN
  -- Dos actividades por RA
  SELECT COUNT(*) INTO v_bad
  FROM (
    SELECT id_ra, COUNT(*) c
    FROM ra_actividad
    GROUP BY id_ra
    HAVING COUNT(*) <> 2
  ) t;
  IF v_bad > 0 THEN RAISE EXCEPTION 'Fallo: RAs con #ra_actividad != 2: %', v_bad; END IF;
  RAISE NOTICE 'PASS: cada RA tiene 2 ra_actividad.';

  -- Suma de porcentaje_ra_actividad ≈ 100
  SELECT COUNT(*) INTO v_bad
  FROM (
    SELECT id_ra, SUM(porcentaje_ra_actividad) s
    FROM ra_actividad
    GROUP BY id_ra
    HAVING ABS(SUM(porcentaje_ra_actividad) - 100) > 0.01
  ) t;
  IF v_bad > 0 THEN RAISE EXCEPTION 'Fallo: RAs con suma porcentaje_ra_actividad != 100: %', v_bad; END IF;
  RAISE NOTICE 'PASS: porcentaje_ra_actividad por RA suma 100.';

  -- Referencias válidas a actividad y RA
  SELECT COUNT(*) INTO v_bad
  FROM ra_actividad ra
  LEFT JOIN actividad a ON a.id_actividad = ra.id_actividad
  LEFT JOIN resultado_de_aprendizaje r ON r.id_ra = ra.id_ra
  WHERE a.id_actividad IS NULL OR r.id_ra IS NULL;
  IF v_bad > 0 THEN RAISE EXCEPTION 'Fallo: ra_actividad con FK inválidas: %', v_bad; END IF;
  RAISE NOTICE 'PASS: ra_actividad referencia actividad y RA válidos.';
END $$;

-- 5) Notas: consistencia de referencias y del indicador vs RA
DO $$
DECLARE v_bad int;
BEGIN
  -- FK a matricula y ra_actividad
  SELECT COUNT(*) INTO v_bad
  FROM notas_actividad n
  LEFT JOIN matricula m ON m.id_matricula = n.id_matricula
  LEFT JOIN ra_actividad ra ON ra.id_ra_actividad = n.id_ra_actividad
  WHERE m.id_matricula IS NULL OR ra.id_ra_actividad IS NULL;
  IF v_bad > 0 THEN RAISE EXCEPTION 'Fallo: notas con FK (matricula/ra_actividad) inválidas: %', v_bad; END IF;
  RAISE NOTICE 'PASS: notas referencian matricula y ra_actividad válidos.';

  -- Indicador pertenece al mismo RA que ra_actividad
  SELECT COUNT(*) INTO v_bad
  FROM notas_actividad n
  JOIN ra_actividad ra ON ra.id_ra_actividad = n.id_ra_actividad
  JOIN indicadores_de_logro ind ON ind.id_ind = n.id_ind
  WHERE ind.id_ra <> ra.id_ra;
  IF v_bad > 0 THEN RAISE EXCEPTION 'Fallo: notas con indicador de RA distinto al de ra_actividad: %', v_bad; END IF;
  RAISE NOTICE 'PASS: indicador en notas coincide con RA de ra_actividad.';
END $$;

-- 6) Idempotencia: ON CONFLICT DO NOTHING no altera conteos
DO $$
DECLARE c1 int; c2 int;
BEGIN
  SELECT COUNT(*) INTO c1 FROM tipo_actividad;
  INSERT INTO tipo_actividad (id_tipo_actividad, descripcion) VALUES (1, 'Examen')
  ON CONFLICT (id_tipo_actividad) DO NOTHING;
  SELECT COUNT(*) INTO c2 FROM tipo_actividad;
  IF c1 <> c2 THEN RAISE EXCEPTION 'Fallo: tipo_actividad cambió de % a % con ON CONFLICT', c1, c2; END IF;
  RAISE NOTICE 'PASS: idempotencia tipo_actividad.';

  SELECT COUNT(*) INTO c1 FROM programa;
  INSERT INTO programa (id_programa, nombre, codigo_programa) VALUES (1, 'Ingeniería de Sistemas', 'IS-01')
  ON CONFLICT (id_programa) DO NOTHING;
  SELECT COUNT(*) INTO c2 FROM programa;
  IF c1 <> c2 THEN RAISE EXCEPTION 'Fallo: programa cambió de % a % con ON CONFLICT', c1, c2; END IF;
  RAISE NOTICE 'PASS: idempotencia programa.';
END $$;

-- 7) Unicidad/PK: insertar docente existente debe fallar (simula IntegrityError del API)
DO $$
BEGIN
  BEGIN
    INSERT INTO docente (
      id_docente, nombre, apellido, codigo_docente, contrasenia_docente,
      correo, id_tipo_documento, num_documento, num_telefono
    ) VALUES (4, 'Dup', 'Dup', 'DUP-004', 'x', 'dup@uni.edu', 1, '9999', '000');
    -- Si llega acá, no hay restricción de PK.
    RAISE EXCEPTION 'Fallo: se permitió insertar docente con PK duplicada (id=4).';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS: PK de docente impide duplicados (id=4).';
  END;
END $$;

-- 8) No cambiar estado
ROLLBACK;

