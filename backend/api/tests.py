from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from datetime import date, timedelta

from .models.models import (
	TipoDocumento, Docente, Programa, Asignatura,
	ResultadoDeAprendizaje, TipoActividad, Actividad, RaActividad,
)


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
			"porcentaje_actividad": 20,
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

	def test_exceeds_activities_total_over_100_is_rejected(self):
		# Crear una actividad previa de 90% en RA1 para que el total de actividades del RA1 sea alto
		act_prev = Actividad.objects.create(
			tipo_actividad=self.tipo_act, nombre_actividad="Quiz previo", porcentaje_actividad=90,
			fecha_creacion=date.today(), fecha_cierre=date.today() + timedelta(days=3)
		)
		RaActividad.objects.create(actividad=act_prev, ra=self.ra1, porcentaje_ra_actividad=50)

		payload = {
			"nombre_actividad": "Trabajo",
			"id_tipo_actividad": self.tipo_act.id_tipo_actividad,
			"porcentaje_actividad": 20,  # 90 + 20 = 110 > 100
			"ras": [
				{"ra_id": self.ra1.id_ra, "porcentaje_ra_actividad": 10},
			],
		}
		res = self.client.post("/api/actividades/multi", payload, format="json")
		self.assertEqual(res.status_code, 400)
		self.assertIn("excederían 100%", (res.json().get("message") or ""))

	def test_fecha_cierre_in_past_is_rejected(self):
		payload = {
			"nombre_actividad": "Entrega",
			"id_tipo_actividad": self.tipo_act.id_tipo_actividad,
			"porcentaje_actividad": 10,
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
			"porcentaje_actividad": 10,
			"ras": [
				{"ra_id": self.ra1.id_ra, "porcentaje_ra_actividad": 5},
				{"ra_id": ra_other.id_ra, "porcentaje_ra_actividad": 5},
			],
		}
		res = self.client.post("/api/actividades/multi", payload, format="json")
		self.assertEqual(res.status_code, 400)
		self.assertIn("misma asignatura", (res.json().get("message") or ""))

