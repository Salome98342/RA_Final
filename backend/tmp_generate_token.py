import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from django.core.signing import dumps
from api.models.models import Coordinador

try:
	c = Coordinador.objects.first()
	print("COORD_ID:", getattr(c, 'pk', None))
	print("TOKEN:", dumps({'id': getattr(c, 'pk', None), 'rol': 'coordinador'}))
except Exception as e:
	print('ERROR:', e)
	sys.exit(1)

# Hacer una petición interna usando Django Test Client para evitar problemas
try:
	token = dumps({'id': getattr(c, 'pk', None), 'rol': 'coordinador'})
	from django.test import Client
	client = Client(HTTP_AUTHORIZATION=f'Bearer {token}')
	# Evitar DisallowedHost usando SERVER_NAME
	resp = client.get('/api/coordinador/dashboard/desempenio/', SERVER_NAME='127.0.0.1')
	print('STATUS_CODE:', resp.status_code)
	# Mostrar resumen y la primera asignatura para inspección
	import json
	data = json.loads(resp.content.decode('utf-8')) if resp.content else {}
	def short(x):
		try:
			return json.dumps(x, indent=2)[:1000]
		except Exception:
			return str(x)
	print('RESUMEN:', short(data.get('resumen')))
	# Mostrar primera asignatura ras students counts
	if data.get('hu11_asignaturas_ranking'):
		a = data['hu11_asignaturas_ranking'][0]
		print('ASIG:', a.get('codigo'), 'total_matriculados:', a.get('total_matriculados'))
		print('ASIG full JSON:\n', json.dumps(a, indent=2))
except Exception as e:
	print('INNER_REQ_ERROR:', e)

# DEBUG: Reproducir la agregación localmente para la asignatura crítica (750026C)
try:
	from api.models.models import Asignatura, Matricula, ResultadoDeAprendizaje, RaActividad, NotasActividad
	asig = Asignatura.objects.filter(codigo_asignatura='750026C').first()
	if asig:
		mats = Matricula.objects.filter(asignatura=asig)
		print('DEBUG - matriculas count for 750026C:', mats.count())
		print('DEBUG - distinct estudiantes:', mats.values('estudiante_id').distinct().count())
		for ra in ResultadoDeAprendizaje.objects.filter(asignatura=asig):
			student_notas = {}
			rels = RaActividad.objects.filter(ra=ra)
			for mat in mats:
				estudiante = mat.estudiante
				suma_w = 0.0
				suma_w_graded = 0.0
				acc_nota = 0.0
				for rel in rels:
					w = float(rel.porcentaje_ra_actividad) / 100.0
					suma_w += w
					nota_obj = NotasActividad.objects.filter(matricula=mat, ra_actividad=rel).first()
					if nota_obj and nota_obj.nota_ra_actividad is not None:
						nota = float(nota_obj.nota_ra_actividad)
						suma_w_graded += w
						acc_nota += nota * w
				nota_ra = (acc_nota / suma_w_graded) if suma_w_graded > 0 else None
				student_notas[estudiante.id_estudiante] = {'nota_ra': round(nota_ra,2) if nota_ra is not None else None}
			print('DEBUG RA', ra.id_ra, 'student_notas keys count:', len(student_notas))
except Exception as e:
	print('DEBUG_ERROR:', e)
