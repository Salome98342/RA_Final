#!/usr/bin/env python
"""
Script de verificación de configuración del entorno
Ejecutar: python check_env.py
"""
import os
import sys
from pathlib import Path

# Colores para terminal
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def check_mark():
    return f"{GREEN}✓{RESET}"

def cross_mark():
    return f"{RED}✗{RESET}"

def warn_mark():
    return f"{YELLOW}⚠{RESET}"

def print_header(text):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text.center(60)}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def check_env_file():
    """Verifica si existe el archivo .env"""
    env_path = Path(__file__).resolve().parent / '.env'
    env_example_path = Path(__file__).resolve().parent / '.env.example'
    
    print_header("VERIFICACIÓN DE ARCHIVO .env")
    
    if env_path.exists():
        print(f"{check_mark()} Archivo .env encontrado en: {env_path}")
        return True
    else:
        print(f"{cross_mark()} Archivo .env NO encontrado")
        print(f"\n{YELLOW}SOLUCIÓN:{RESET}")
        if env_example_path.exists():
            print(f"   1. Copia el archivo .env.example:")
            print(f"      Windows: copy .env.example .env")
            print(f"      Linux/Mac: cp .env.example .env")
            print(f"   2. Edita .env con tus credenciales")
        else:
            print(f"   {cross_mark()} .env.example tampoco existe. Contacta al equipo.")
        return False

def check_python_version():
    """Verifica la versión de Python"""
    print_header("VERIFICACIÓN DE PYTHON")
    
    version = sys.version_info
    if version.major >= 3 and version.minor >= 10:
        print(f"{check_mark()} Python {version.major}.{version.minor}.{version.micro} (OK)")
        return True
    else:
        print(f"{cross_mark()} Python {version.major}.{version.minor}.{version.micro} (Se requiere 3.10+)")
        return False

def check_env_variables():
    """Verifica las variables de entorno críticas"""
    print_header("VERIFICACIÓN DE VARIABLES DE ENTORNO")
    
    # Cargar .env
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        print(f"{cross_mark()} Módulo 'python-dotenv' no instalado")
        print(f"   Ejecuta: pip install python-dotenv")
        return False
    
    required_vars = {
        'SECRET_KEY': 'Clave secreta de Django',
        'DB_NAME': 'Nombre de la base de datos',
        'DB_USER': 'Usuario de PostgreSQL',
        'DB_PASSWORD': 'Contraseña de PostgreSQL',
        'EMAIL_BACKEND': 'Backend de email',
    }
    
    all_ok = True
    for var, description in required_vars.items():
        value = os.getenv(var)
        if value:
            # Ocultar contraseñas
            if 'PASSWORD' in var or 'KEY' in var:
                display_value = '***' + value[-4:] if len(value) > 4 else '***'
            else:
                display_value = value[:50] + '...' if len(value) > 50 else value
            print(f"{check_mark()} {var}: {display_value}")
        else:
            print(f"{cross_mark()} {var}: NO CONFIGURADA ({description})")
            all_ok = False
    
    # Verificar valores por defecto que deben cambiarse
    secret_key = os.getenv('SECRET_KEY', '')
    if 'change' in secret_key.lower() or 'fallback' in secret_key.lower():
        print(f"\n{warn_mark()} SECRET_KEY usa un valor de ejemplo. Cámbialo por uno único.")
        all_ok = False
    
    db_password = os.getenv('DB_PASSWORD', '')
    if 'tu' in db_password.lower() or 'password' in db_password.lower() or not db_password:
        print(f"{warn_mark()} DB_PASSWORD parece ser un placeholder. Configura tu contraseña real.")
        all_ok = False
    
    return all_ok

def check_dependencies():
    """Verifica que las dependencias estén instaladas"""
    print_header("VERIFICACIÓN DE DEPENDENCIAS")
    
    required_packages = [
        ('django', 'Django'),
        ('rest_framework', 'Django REST Framework'),
        ('psycopg2', 'PostgreSQL adapter'),
        ('corsheaders', 'django-cors-headers'),
        ('dotenv', 'python-dotenv'),
    ]
    
    all_ok = True
    for package, name in required_packages:
        try:
            __import__(package)
            print(f"{check_mark()} {name}")
        except ImportError:
            print(f"{cross_mark()} {name} NO instalado")
            all_ok = False
    
    if not all_ok:
        print(f"\n{YELLOW}SOLUCIÓN:{RESET}")
        print(f"   pip install -r requirements.txt")
    
    return all_ok

def check_database_connection():
    """Verifica la conexión a la base de datos"""
    print_header("VERIFICACIÓN DE BASE DE DATOS")
    
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        import psycopg2
        
        conn = psycopg2.connect(
            dbname=os.getenv('DB_NAME', 'ra_manager'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', ''),
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432')
        )
        conn.close()
        print(f"{check_mark()} Conexión a PostgreSQL exitosa")
        print(f"   Base de datos: {os.getenv('DB_NAME', 'ra_manager')}")
        return True
    except ImportError:
        print(f"{cross_mark()} psycopg2 no instalado")
        print(f"   pip install psycopg2-binary")
        return False
    except Exception as e:
        print(f"{cross_mark()} Error de conexión a PostgreSQL:")
        print(f"   {str(e)}")
        print(f"\n{YELLOW}POSIBLES SOLUCIONES:{RESET}")
        print(f"   1. Verifica que PostgreSQL esté corriendo")
        print(f"   2. Verifica DB_PASSWORD en tu .env")
        print(f"   3. Verifica que la base de datos exista:")
        print(f"      psql -U postgres -c 'CREATE DATABASE ra_manager;'")
        return False

def check_migrations():
    """Verifica si hay migraciones pendientes"""
    print_header("VERIFICACIÓN DE MIGRACIONES")
    
    try:
        # Setup Django
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
        import django
        django.setup()
        
        from django.core.management import call_command
        from io import StringIO
        
        out = StringIO()
        call_command('showmigrations', '--plan', stdout=out)
        output = out.getvalue()
        
        if '[X]' in output:
            applied = output.count('[X]')
            total = output.count('[')
            pending = total - applied
            
            if pending == 0:
                print(f"{check_mark()} Todas las migraciones aplicadas ({applied}/{total})")
                return True
            else:
                print(f"{warn_mark()} Hay {pending} migraciones pendientes")
                print(f"\n{YELLOW}SOLUCIÓN:{RESET}")
                print(f"   python manage.py migrate")
                return False
        else:
            print(f"{warn_mark()} No se pudo verificar el estado de migraciones")
            return False
            
    except Exception as e:
        print(f"{warn_mark()} No se pudo verificar migraciones: {str(e)}")
        print(f"   Esto es normal si es tu primera vez")
        print(f"\n{YELLOW}EJECUTA:{RESET}")
        print(f"   python manage.py migrate")
        return False

def main():
    print(f"\n{GREEN}╔═══════════════════════════════════════════════════════════╗{RESET}")
    print(f"{GREEN}║       VERIFICADOR DE CONFIGURACIÓN - RA MANAGER          ║{RESET}")
    print(f"{GREEN}╚═══════════════════════════════════════════════════════════╝{RESET}")
    
    checks = [
        ('Python', check_python_version),
        ('Archivo .env', check_env_file),
        ('Variables de entorno', check_env_variables),
        ('Dependencias', check_dependencies),
        ('Base de datos', check_database_connection),
        ('Migraciones', check_migrations),
    ]
    
    results = {}
    for name, check_func in checks:
        results[name] = check_func()
    
    # Resumen final
    print_header("RESUMEN")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, success in results.items():
        symbol = check_mark() if success else cross_mark()
        print(f"{symbol} {name}")
    
    print(f"\n{'='*60}")
    if passed == total:
        print(f"{GREEN}✓ CONFIGURACIÓN COMPLETA ({passed}/{total}){RESET}")
        print(f"\n{GREEN}¡Todo listo! Puedes ejecutar:{RESET}")
        print(f"   python manage.py runserver")
    else:
        print(f"{YELLOW}⚠ CONFIGURACIÓN INCOMPLETA ({passed}/{total}){RESET}")
        print(f"\n{YELLOW}Por favor, corrige los errores arriba antes de continuar.{RESET}")
        print(f"\n{BLUE}Ayuda adicional:{RESET}")
        print(f"   - Lee SETUP.md para instrucciones detalladas")
        print(f"   - Lee ENV_GUIDE.md para entender el archivo .env")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()
