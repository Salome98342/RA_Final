#!/usr/bin/env python
import os
import django
from django.contrib.auth.hashers import make_password

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models.models import Coordinador

coordinadores = [
    {
        "nombre": "Ana Maria Torres",
        "codigo_coordinador": "COO001",
        "correo": "ana.torres@univalle.edu.co",
        "contrasena": "Coordinador123!"
    },
    {
        "nombre": "Felipe Gomez",
        "codigo_coordinador": "COO002",
        "correo": "felipe.gomez@univalle.edu.co",
        "contrasena": "Coordinador456!"
    }
]

created = []
for c in coordinadores:
    obj, created_flag = Coordinador.objects.get_or_create(
        codigo_coordinador=c["codigo_coordinador"],
        defaults={
            "nombre": c["nombre"],
            "correo": c["correo"],
            "contrasenia_coord": make_password(c["contrasena"]) 
        }
    )
    created.append((obj, c["contrasena"]))

print("Coordinadores creados/confirmados:")
for obj, pwd in created:
    print(f"- {obj.codigo_coordinador}: {obj.nombre} <{obj.correo}> — contraseña: {pwd}")
