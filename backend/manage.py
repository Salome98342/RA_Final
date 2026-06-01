#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    
    execute_from_command_line(sys.argv)
    
    # Crear superusuario automáticamente si se proporcionan las variables de entorno
    # Esto se ejecuta después de migrate en el deploy
    if len(sys.argv) > 1 and sys.argv[1] == 'migrate' and os.getenv('CREATE_SUPERUSER') == 'true':
        import django
        django.setup()
        from django.contrib.auth.models import User
        
        username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')
        email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'changeme')
        
        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username, email, password)
            print(f"✅ Superusuario '{username}' creado exitosamente")
        else:
            print(f"ℹ️ El superusuario '{username}' ya existe")



if __name__ == '__main__':
    main()
