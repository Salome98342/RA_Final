import os
import django
from django.contrib.auth.hashers import make_password

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models.models import Coordinador

coordinador = Coordinador.objects.create(
    nombre='Coordinador Tecnología en Desarrollo de Software',
    codigo_coordinador='COOR001',
    correo='coordinador.tdds@example.com',
    contrasenia_coord=make_password('Coordinador123!')
)

print('✓ Coordinador creado exitosamente')
print(f'  Código: {coordinador.codigo_coordinador}')
print(f'  Nombre: {coordinador.nombre}')
print(f'  Email: {coordinador.correo}')
print(f'  Contraseña: Coordinador123!')
