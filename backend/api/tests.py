from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from datetime import date, timedelta

from .models.models import (
    TipoDocumento, Docente, Programa, Asignatura,
	ResultadoDeAprendizaje, TipoActividad, Actividad, RaActividad, Coordinador, ImportAudit,
)
from django.core import signing

TOKEN_MAX_AGE = 60 * 60 * 24 * 7


class ActividadesMultiViewTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		# Catálogos mínimos
		self.tdoc = TipoDocumento.objects.create(descripcion="CC")
		self.doc = Docente.objects.create(
			nombre="Ana", apellido="P.", codigo_docente="D001",
			contrasenia_docente="pwd", correo="doc@example.com",
			tipo_documento=self.tdoc, num_documento="111"
		)
		self.prog = Programa.objects.create(nombre="Ing", codigo_programa="ING01")
		self.asig = Asignatura.objects.create(
			nombre="Algoritmos", codigo_asignatura="ALG-1", docente=self.doc, programa=self.prog
		)
		self.tipo_act = TipoActividad.objects.create(descripcion="Examen")

		# Dos RAs de la misma asignatura
		self.ra1 = ResultadoDeAprendizaje.objects.create(asignatura=self.asig, porcentaje_ra=50, descripcion="RA1")
		self.ra2 = ResultadoDeAprendizaje.objects.create(asignatura=self.asig, porcentaje_ra=50, descripcion="RA2")

	def test_happy_path_creates_activity_and_relations(self):
		payload = {
			"nombre_actividad": "Parcial 1",
			"id_tipo_actividad": self.tipo_act.id_tipo_actividad,
			"descripcion": "Temas 1-3",
			"fecha_cierre": (date.today() + timedelta(days=7)).isoformat(),
			"ras": [
				{"ra_id": self.ra1.id_ra, "porcentaje_ra_actividad": 50},
				{"ra_id": self.ra2.id_ra, "porcentaje_ra_actividad": 50},
			],
		}
		res = self.client.post("/api/actividades/multi", payload, format="json")
		self.assertEqual(res.status_code, 201, res.content)
		data = res.json()
		self.assertIn("id_actividad", data)
		self.assertEqual(len(data.get("relaciones", [])), 2)
		# Check DB
		self.assertTrue(Actividad.objects.filter(id_actividad=data["id_actividad"]).exists())
		self.assertEqual(RaActividad.objects.filter(actividad_id=data["id_actividad"]).count(), 2)

	def test_exceeds_ra_total_over_100_is_rejected(self):
		# Crear una actividad previa con aporte alto en RA1 para acercar la suma a 100
		act_prev = Actividad.objects.create(
			tipo_actividad=self.tipo_act, nombre_actividad="Quiz previo",
			fecha_creacion=date.today(), fecha_cierre=date.today() + timedelta(days=3)
		)
		RaActividad.objects.create(actividad=act_prev, ra=self.ra1, porcentaje_ra_actividad=95)

		payload = {
			"nombre_actividad": "Trabajo",
			"id_tipo_actividad": self.tipo_act.id_tipo_actividad,
			"ras": [
				{"ra_id": self.ra1.id_ra, "porcentaje_ra_actividad": 10},  # 95 + 10 = 105 > 100
			],
		}
		res = self.client.post("/api/actividades/multi", payload, format="json")
		self.assertEqual(res.status_code, 400)
		self.assertIn("excede 100%", (res.json().get("message") or ""))

	def test_fecha_cierre_in_past_is_rejected(self):
		payload = {
			"nombre_actividad": "Entrega",
			"id_tipo_actividad": self.tipo_act.id_tipo_actividad,
			"fecha_cierre": (date.today() - timedelta(days=1)).isoformat(),
			"ras": [
				{"ra_id": self.ra1.id_ra, "porcentaje_ra_actividad": 10},
			],
		}
		res = self.client.post("/api/actividades/multi", payload, format="json")
		self.assertEqual(res.status_code, 400)
		self.assertIn("no puede ser anterior", (res.json().get("message") or ""))

	def test_cross_asignatura_ras_are_rejected(self):
		# Crear otro curso y un RA que no pertenece al curso principal
		doc2 = Docente.objects.create(
			nombre="Luis", apellido="Q.", codigo_docente="D002",
			contrasenia_docente="pwd", correo="doc2@example.com",
			tipo_documento=self.tdoc, num_documento="222"
		)
		asig2 = Asignatura.objects.create(nombre="BD", codigo_asignatura="BD-1", docente=doc2, programa=self.prog)
		ra_other = ResultadoDeAprendizaje.objects.create(asignatura=asig2, porcentaje_ra=100, descripcion="RA ext")

		payload = {
			"nombre_actividad": "Proyecto",
			"id_tipo_actividad": self.tipo_act.id_tipo_actividad,
			"ras": [
				{"ra_id": self.ra1.id_ra, "porcentaje_ra_actividad": 5},
				{"ra_id": ra_other.id_ra, "porcentaje_ra_actividad": 5},
			],
		}
		res = self.client.post("/api/actividades/multi", payload, format="json")
		self.assertEqual(res.status_code, 400)
		self.assertIn("misma asignatura", (res.json().get("message") or ""))

	def test_missing_pct_defaults_to_zero_in_multi(self):
		payload = {
			"nombre_actividad": "Sin peso",
			"id_tipo_actividad": self.tipo_act.id_tipo_actividad,
			"ras": [
				{"ra_id": self.ra1.id_ra},  # sin porcentaje
				{"ra_id": self.ra2.id_ra, "porcentaje_ra_actividad": 10},
			],
		}
		res = self.client.post("/api/actividades/multi", payload, format="json")
		self.assertEqual(res.status_code, 201, res.content)
		data = res.json()
		rels = data.get("relaciones", [])
		self.assertEqual(len(rels), 2)
		# Validar que una relación quedó en 0
		pcts = sorted([float(r["porcentaje_ra_actividad"]) for r in rels])
		self.assertEqual(pcts[0], 0.0)


class RaActividadesSingleTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.tdoc = TipoDocumento.objects.create(descripcion="CC")
		self.doc = Docente.objects.create(
			nombre="Ana", apellido="P.", codigo_docente="D010",
			contrasenia_docente="pwd", correo="doc10@example.com",
			tipo_documento=self.tdoc, num_documento="9911"
		)
		self.prog = Programa.objects.create(nombre="Ing", codigo_programa="ING10")
		self.asig = Asignatura.objects.create(
			nombre="Cálculo", codigo_asignatura="CAL-1", docente=self.doc, programa=self.prog
		)
		self.tipo_act = TipoActividad.objects.create(descripcion="Taller")
		self.ra = ResultadoDeAprendizaje.objects.create(asignatura=self.asig, porcentaje_ra=100, descripcion="RA")

	def test_create_activity_without_pct_single_endpoint(self):
		payload = {
			"nombre_actividad": "Taller 1",
			"id_tipo_actividad": self.tipo_act.id_tipo_actividad,
			# sin porcentaje_ra_actividad
		}
		res = self.client.post(f"/api/ras/{self.ra.id_ra}/actividades/", payload, format="json")
		self.assertEqual(res.status_code, 201, res.content)
		data = res.json()
		self.assertIn("id_ra_actividad", data)
		self.assertEqual(float(data.get("porcentaje_ra_actividad", 999)), 0.0)


class CoordinadorEndpointsTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.tdoc = TipoDocumento.objects.create(descripcion="CC")
		self.coord = Coordinador.objects.create(
			nombre="Coord Uno", codigo_coordinador="C001",
			contrasenia_coord="pwd", correo="coord@example.com"
		)
		# Generar token firmado manual (imitando login_view)
		self.token = signing.dumps({"rol": "coordinador", "id": self.coord.pk})
		self.auth_header = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

		# Catálogos para asignaturas
		self.doc = Docente.objects.create(
			nombre="Ana", apellido="X", codigo_docente="D050",
			contrasenia_docente="pwd", correo="doc50@example.com",
			tipo_documento=self.tdoc, num_documento="5050"
		)
		self.prog = Programa.objects.create(nombre="Prog Test", codigo_programa="PRG-1")
		self.asig = Asignatura.objects.create(nombre="Estructuras", codigo_asignatura="EST-1", docente=self.doc, programa=self.prog)
		self.ra1 = ResultadoDeAprendizaje.objects.create(asignatura=self.asig, porcentaje_ra=40, descripcion="RA1")
		self.ra2 = ResultadoDeAprendizaje.objects.create(asignatura=self.asig, porcentaje_ra=60, descripcion="RA2")

	def test_coordinador_asignaturas_requires_auth(self):
		res = self.client.get("/api/coordinador/asignaturas")
		self.assertEqual(res.status_code, 401)  # sin token

	def test_coordinador_asignaturas_ok(self):
		res = self.client.get("/api/coordinador/asignaturas", **self.auth_header)
		self.assertEqual(res.status_code, 200, res.content)
		data = res.json()
		self.assertIn("results", data)

	def test_coordinador_asignatura_ras(self):
		res = self.client.get("/api/coordinador/asignaturas/ras", {"codigo_asignatura": "EST-1"}, **self.auth_header)
		self.assertEqual(res.status_code, 200, res.content)
		data = res.json()
		self.assertEqual(data.get("codigo_asignatura"), "EST-1")
		self.assertEqual(data.get("total_ras"), 2)

	def test_import_matriculados_missing_file(self):
		res = self.client.post("/api/coordinador/import/matriculados", {}, **self.auth_header)
		self.assertEqual(res.status_code, 400)
		self.assertIn("Archivo CSV", (res.json().get("detail") or ""))

	def test_import_docentes_wrong_mime(self):
		# Enviar archivo con extensión errónea
		from django.core.files.uploadedfile import SimpleUploadedFile
		f = SimpleUploadedFile("docentes.txt", b"codigo_docente,nombre,apellido,correo,tipo_documento,num_documento\nD100,Ana,X,ana@example.com,CC,999", content_type="text/plain")
		res = self.client.post("/api/coordinador/import/docentes", {"file": f}, **self.auth_header)
		# Nuestra validación exige extensión .csv o content-type que contenga 'csv'
		self.assertEqual(res.status_code, 400)

	def test_import_matriculados_invalid_mime(self):
		from django.core.files.uploadedfile import SimpleUploadedFile
		f = SimpleUploadedFile("matriculados.txt", b"codigo_estudiante,codigo_asignatura,periodo\nX,E1,2025-1", content_type="text/plain")
		res = self.client.post("/api/coordinador/import/matriculados", {"file": f}, **self.auth_header)
		self.assertEqual(res.status_code, 400)
		self.assertIn("csv", (res.json().get("detail") or "").lower())

	def test_import_asignaturas_ras_basic(self):
		from django.core.files.uploadedfile import SimpleUploadedFile
		content = b"codigo_asignatura,nombre_asignatura,codigo_docente,codigo_programa,ra_descripcion,ra_porcentaje\nEST-2,Estructuras2,D050,PRG-1,RA nuevo,30"
		f = SimpleUploadedFile("asignaturas.csv", content, content_type="text/csv")
		res = self.client.post("/api/coordinador/import/asignaturas-ras", {"file": f}, **self.auth_header)
		self.assertEqual(res.status_code, 200, res.content)
		data = res.json()
		self.assertGreaterEqual(data.get("created_asignaturas", 0), 1)
		self.assertGreaterEqual(data.get("created_ras", 0), 1)

	def test_import_matriculados_audit_created(self):
		# Crear período y estudiante para que import cree la matrícula
		from django.core.files.uploadedfile import SimpleUploadedFile
		from .models.models import Estudiante, PeriodoAcademico, Matricula
		per = PeriodoAcademico.objects.create(descripcion="2025-1", fecha_inicio=date.today(), fecha_finalizacion=date.today()+timedelta(days=120))
		est = Estudiante.objects.create(
			codigo_estudiante="E001", nombre="Eva", apellido="L.", correo="e001@example.com",
			contrasena_estudiante="pwd", tipo_documento=self.tdoc, num_documento="Z1"
		)
		csv_content = b"codigo_estudiante,codigo_asignatura,periodo\nE001,EST-1,2025-1"
		f = SimpleUploadedFile("matriculados.csv", csv_content, content_type="text/csv")
		res = self.client.post("/api/coordinador/import/matriculados", {"file": f}, **self.auth_header)
		self.assertEqual(res.status_code, 200, res.content)
		payload = res.json()
		self.assertEqual(payload.get("created"), 1)
		# Auditoría registrada
		self.assertTrue(ImportAudit.objects.filter(kind="matriculados", filename="matriculados.csv", created_count=1).exists())

	def test_import_docentes_row_limit_exceeded(self):
		# Generar CSV con 5001 filas válidas (duplicadas) para alcanzar el límite sin crear 5000 hashes.
		from django.core.files.uploadedfile import SimpleUploadedFile
		rows = [b"codigo_docente,nombre,apellido,correo,tipo_documento,num_documento,password"]
		# Primera fila creará el docente; las demás serán existentes (mismo codigo/correo/num_documento)
		for i in range(5001):
			rows.append(b"D9999,Ana,X,ana9999@example.com,CC,9999,pwd")
		content = b"\n".join(rows)
		f = SimpleUploadedFile("docentes.csv", content, content_type="text/csv")
		res = self.client.post("/api/coordinador/import/docentes", {"file": f}, **self.auth_header)
		self.assertEqual(res.status_code, 200, res.content)
		data = res.json()
		errors = data.get("errors", [])
		self.assertEqual(len(errors), 1, errors)
		self.assertIn("límite", (errors[0].get("error") or "").lower())
		self.assertTrue(ImportAudit.objects.filter(kind="docentes", filename="docentes.csv").exists())

