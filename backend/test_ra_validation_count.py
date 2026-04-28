"""
Test for ra_validation_view endpoint to verify it returns activity count
"""
from django.test import TestCase
from rest_framework.test import APIClient
from datetime import date, timedelta
from api.models.models import (
    TipoDocumento, Docente, Programa, Asignatura,
    ResultadoDeAprendizaje, TipoActividad, Actividad, RaActividad, IndicadoresDeLogro
)


class RAValidationViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create minimum required catalog entries
        self.tdoc = TipoDocumento.objects.create(descripcion="CC")
        self.doc = Docente.objects.create(
            nombre="Juan", apellido="Pérez", codigo_docente="D001",
            contrasenia_docente="pwd", correo="juan@example.com",
            tipo_documento=self.tdoc, num_documento="111"
        )
        self.prog = Programa.objects.create(nombre="Ingeniería", codigo_programa="ING01")
        self.asig = Asignatura.objects.create(
            nombre="Programación", codigo_asignatura="PROG-1", 
            docente=self.doc, programa=self.prog
        )
        self.tipo_act = TipoActividad.objects.create(descripcion="Examen")
        
        # Create a single RA
        self.ra = ResultadoDeAprendizaje.objects.create(
            asignatura=self.asig, 
            porcentaje_ra=100, 
            descripcion="RA1"
        )
    
    def test_ra_validation_returns_activity_count(self):
        """Test that ra_validation_view returns activity count along with percentage sum"""
        # Initially, RA should have 0 activities and count=0
        response = self.client.get(f"/api/validacion/ra/{self.ra.id_ra}")
        self.assertEqual(response.status_code, 200, f"Response: {response.content}")
        data = response.json()
        
        self.assertIn("actividades", data)
        self.assertEqual(data["actividades"]["count"], 0)
        self.assertEqual(data["actividades"]["suma"], 0.0)
        self.assertFalse(data["actividades"]["ok"])
        self.assertEqual(data["actividades"]["faltante"], 100.0)
        
    def test_ra_validation_activity_count_increases_with_activities(self):
        """Test that activity count increases when activities are created"""
        # Create 2 activities linked to the RA
        act1 = Actividad.objects.create(
            tipo_actividad=self.tipo_act,
            nombre_actividad="Actividad 1",
            fecha_creacion=date.today(),
            fecha_cierre=date.today() + timedelta(days=7)
        )
        RaActividad.objects.create(
            ra=self.ra,
            actividad=act1,
            porcentaje_ra_actividad=50.0
        )
        
        act2 = Actividad.objects.create(
            tipo_actividad=self.tipo_act,
            nombre_actividad="Actividad 2",
            fecha_creacion=date.today(),
            fecha_cierre=date.today() + timedelta(days=14)
        )
        RaActividad.objects.create(
            ra=self.ra,
            actividad=act2,
            porcentaje_ra_actividad=50.0
        )
        
        # Check validation now returns count=2 and suma=100.0
        response = self.client.get(f"/api/validacion/ra/{self.ra.id_ra}")
        self.assertEqual(response.status_code, 200, f"Response: {response.content}")
        data = response.json()
        
        self.assertEqual(data["actividades"]["count"], 2)
        self.assertEqual(data["actividades"]["suma"], 100.0)
        self.assertTrue(data["actividades"]["ok"])
        self.assertEqual(data["actividades"]["faltante"], 0.0)
