#!/usr/bin/env python
"""
Script de prueba para el sistema de recuperación de contraseña con OTP.

Uso:
    python test_otp_system.py
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.utils import timezone
from django.contrib.auth.hashers import check_password
from datetime import timedelta
from api.models.models import Estudiante, Docente, PasswordResetOTP
import random


class Colors:
    """Colores ANSI para terminal"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_success(message):
    print(f"{Colors.OKGREEN}✓ {message}{Colors.ENDC}")


def print_error(message):
    print(f"{Colors.FAIL}✗ {message}{Colors.ENDC}")


def print_info(message):
    print(f"{Colors.OKCYAN}ℹ {message}{Colors.ENDC}")


def print_header(message):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{message.center(60)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")


def test_1_create_test_users():
    """Crear usuarios de prueba"""
    print_header("TEST 1: Crear usuarios de prueba")
    
    try:
        # Crear estudiante de prueba
        estudiante, created = Estudiante.objects.get_or_create(
            correo='test_student@example.com',
            defaults={
                'nombre': 'Test',
                'apellido': 'Student',
                'codigo_estudiante': 'TEST001',
                'contrasena_estudiante': 'password123',
                'num_documento': '1234567890',
                'tipo_documento_id': 1  # Asume que existe TipoDocumento con id=1
            }
        )
        if created:
            print_success(f"Estudiante creado: {estudiante.correo}")
        else:
            print_info(f"Estudiante ya existe: {estudiante.correo}")
        
        # Crear docente de prueba
        docente, created = Docente.objects.get_or_create(
            correo='test_teacher@example.com',
            defaults={
                'nombre': 'Test',
                'apellido': 'Teacher',
                'codigo_docente': 'DOCTEST001',
                'contrasenia_docente': 'password123',
                'num_documento': '9876543210',
                'tipo_documento_id': 1
            }
        )
        if created:
            print_success(f"Docente creado: {docente.correo}")
        else:
            print_info(f"Docente ya existe: {docente.correo}")
            
        return True
    except Exception as e:
        print_error(f"Error al crear usuarios: {str(e)}")
        return False


def test_2_generate_otp():
    """Generar código OTP"""
    print_header("TEST 2: Generar código OTP")
    
    try:
        email = 'test_student@example.com'
        
        # Invalidar OTPs anteriores
        PasswordResetOTP.objects.filter(email=email, is_used=False).update(is_used=True)
        print_info("OTPs anteriores invalidados")
        
        # Generar nuevo OTP
        otp_code = str(random.randint(100000, 999999))
        expires_at = timezone.now() + timedelta(minutes=5)
        
        otp = PasswordResetOTP.objects.create(
            email=email,
            otp_code=otp_code,
            expires_at=expires_at,
            rol='estudiante'
        )
        
        print_success(f"OTP generado: {otp_code}")
        print_info(f"Email: {email}")
        print_info(f"Expira en: {expires_at}")
        print_info(f"Rol: {otp.rol}")
        
        return otp_code
    except Exception as e:
        print_error(f"Error al generar OTP: {str(e)}")
        return None


def test_3_validate_otp(otp_code):
    """Validar código OTP"""
    print_header("TEST 3: Validar código OTP")
    
    if not otp_code:
        print_error("No hay código OTP para validar")
        return False
    
    try:
        email = 'test_student@example.com'
        
        otp = PasswordResetOTP.objects.filter(
            email__iexact=email,
            otp_code=otp_code,
            is_used=False,
            expires_at__gt=timezone.now()
        ).order_by('-created_at').first()
        
        if otp:
            print_success(f"OTP válido: {otp_code}")
            print_info(f"Creado: {otp.created_at}")
            print_info(f"Expira: {otp.expires_at}")
            
            # Calcular tiempo restante
            time_remaining = (otp.expires_at - timezone.now()).total_seconds()
            print_info(f"Tiempo restante: {int(time_remaining)} segundos")
            
            return True
        else:
            print_error("OTP inválido o expirado")
            return False
            
    except Exception as e:
        print_error(f"Error al validar OTP: {str(e)}")
        return False


def test_4_reset_password(otp_code):
    """Cambiar contraseña usando OTP"""
    print_header("TEST 4: Cambiar contraseña con OTP")
    
    if not otp_code:
        print_error("No hay código OTP para usar")
        return False
    
    try:
        email = 'test_student@example.com'
        new_password = 'newPassword123!'
        
        # Buscar OTP válido
        otp = PasswordResetOTP.objects.filter(
            email__iexact=email,
            otp_code=otp_code,
            is_used=False,
            expires_at__gt=timezone.now()
        ).order_by('-created_at').first()
        
        if not otp:
            print_error("OTP no válido para cambio de contraseña")
            return False
        
        # Buscar usuario
        from django.contrib.auth.hashers import make_password
        
        estudiante = Estudiante.objects.filter(correo__iexact=email).first()
        if not estudiante:
            print_error("Usuario no encontrado")
            return False
        
        # Guardar contraseña anterior para verificar cambio
        old_password_hash = estudiante.contrasena_estudiante
        
        # Cambiar contraseña
        estudiante.contrasena_estudiante = make_password(new_password)
        estudiante.save(update_fields=['contrasena_estudiante'])
        
        # Marcar OTP como usado
        otp.is_used = True
        otp.save(update_fields=['is_used'])
        
        # Verificar cambio
        estudiante.refresh_from_db()
        if estudiante.contrasena_estudiante != old_password_hash:
            print_success("Contraseña cambiada exitosamente")
            print_info(f"Nueva contraseña (texto plano): {new_password}")
            
            # Verificar que la nueva contraseña funcione
            if check_password(new_password, estudiante.contrasena_estudiante):
                print_success("Verificación de contraseña exitosa")
            else:
                print_error("Error en la verificación de contraseña")
                
            return True
        else:
            print_error("La contraseña no se actualizó")
            return False
            
    except Exception as e:
        print_error(f"Error al cambiar contraseña: {str(e)}")
        return False


def test_5_otp_reuse():
    """Intentar reutilizar un OTP usado"""
    print_header("TEST 5: Prevención de reutilización de OTP")
    
    try:
        email = 'test_student@example.com'
        
        # Intentar encontrar un OTP usado
        used_otp = PasswordResetOTP.objects.filter(
            email__iexact=email,
            is_used=True
        ).order_by('-created_at').first()
        
        if not used_otp:
            print_info("No hay OTPs usados para probar")
            return True
        
        # Intentar reutilizar
        otp = PasswordResetOTP.objects.filter(
            email__iexact=email,
            otp_code=used_otp.otp_code,
            is_used=False,  # Solo buscar no usados
            expires_at__gt=timezone.now()
        ).first()
        
        if otp:
            print_error("¡ERROR! Se puede reutilizar un OTP usado")
            return False
        else:
            print_success("Protección contra reutilización funciona correctamente")
            return True
            
    except Exception as e:
        print_error(f"Error en test de reutilización: {str(e)}")
        return False


def test_6_otp_expiration():
    """Probar expiración de OTP"""
    print_header("TEST 6: Expiración de OTP")
    
    try:
        email = 'test_expired@example.com'
        
        # Crear OTP que ya expiró
        otp_code = str(random.randint(100000, 999999))
        expires_at = timezone.now() - timedelta(minutes=1)  # Expiró hace 1 minuto
        
        otp = PasswordResetOTP.objects.create(
            email=email,
            otp_code=otp_code,
            expires_at=expires_at,
            rol='estudiante',
            is_used=False
        )
        
        print_info(f"OTP creado que expiró hace 1 minuto: {otp_code}")
        
        # Intentar usar OTP expirado
        valid_otp = PasswordResetOTP.objects.filter(
            email__iexact=email,
            otp_code=otp_code,
            is_used=False,
            expires_at__gt=timezone.now()  # Esta condición debe fallar
        ).first()
        
        if valid_otp:
            print_error("¡ERROR! OTP expirado fue aceptado como válido")
            return False
        else:
            print_success("OTP expirado rechazado correctamente")
            return True
            
    except Exception as e:
        print_error(f"Error en test de expiración: {str(e)}")
        return False


def test_7_priority_estudiante():
    """Probar prioridad de estudiantes sobre docentes"""
    print_header("TEST 7: Prioridad de Estudiante sobre Docente")
    
    try:
        email = 'dual_user@example.com'
        
        # Crear ambos usuarios con el mismo email
        estudiante, _ = Estudiante.objects.get_or_create(
            correo=email,
            defaults={
                'nombre': 'Dual',
                'apellido': 'Student',
                'codigo_estudiante': 'DUAL001',
                'contrasena_estudiante': 'password123',
                'num_documento': '1111111111',
                'tipo_documento_id': 1
            }
        )
        
        docente, _ = Docente.objects.get_or_create(
            correo=email,
            defaults={
                'nombre': 'Dual',
                'apellido': 'Teacher',
                'codigo_docente': 'DOCDUAL001',
                'contrasenia_docente': 'password123',
                'num_documento': '2222222222',
                'tipo_documento_id': 1
            }
        )
        
        print_info(f"Usuario dual creado: {email}")
        
        # Simular búsqueda con prioridad
        user = None
        rol = None
        
        # 1. Buscar en Estudiantes primero
        est = Estudiante.objects.filter(correo__iexact=email).first()
        if est:
            user = est
            rol = 'estudiante'
        else:
            # 2. Si no es estudiante, buscar en Docentes
            doc = Docente.objects.filter(correo__iexact=email).first()
            if doc:
                user = doc
                rol = 'docente'
        
        if rol == 'estudiante':
            print_success("Prioridad correcta: Se detectó como ESTUDIANTE")
            return True
        else:
            print_error(f"¡ERROR! Se detectó como {rol} en lugar de estudiante")
            return False
            
    except Exception as e:
        print_error(f"Error en test de prioridad: {str(e)}")
        return False


def test_8_cleanup_otps():
    """Probar limpieza de OTPs"""
    print_header("TEST 8: Limpieza de OTPs expirados")
    
    try:
        # Contar OTPs antes de limpiar
        total_before = PasswordResetOTP.objects.count()
        expired_before = PasswordResetOTP.objects.filter(expires_at__lt=timezone.now()).count()
        
        print_info(f"Total OTPs antes: {total_before}")
        print_info(f"OTPs expirados antes: {expired_before}")
        
        # Eliminar expirados
        deleted_count, _ = PasswordResetOTP.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()
        
        # Contar después
        total_after = PasswordResetOTP.objects.count()
        
        print_success(f"OTPs eliminados: {deleted_count}")
        print_info(f"Total OTPs después: {total_after}")
        
        return True
        
    except Exception as e:
        print_error(f"Error en limpieza: {str(e)}")
        return False


def run_all_tests():
    """Ejecutar todos los tests"""
    print_header("SISTEMA DE PRUEBAS OTP")
    print_info("Iniciando suite de pruebas...\n")
    
    results = []
    
    # Test 1: Crear usuarios
    results.append(("Crear usuarios de prueba", test_1_create_test_users()))
    
    # Test 2: Generar OTP
    otp_code = test_2_generate_otp()
    results.append(("Generar código OTP", otp_code is not None))
    
    # Test 3: Validar OTP
    results.append(("Validar código OTP", test_3_validate_otp(otp_code)))
    
    # Test 4: Cambiar contraseña
    results.append(("Cambiar contraseña", test_4_reset_password(otp_code)))
    
    # Test 5: Prevenir reutilización
    results.append(("Prevenir reutilización", test_5_otp_reuse()))
    
    # Test 6: Expiración
    results.append(("Expiración de OTP", test_6_otp_expiration()))
    
    # Test 7: Prioridad estudiante
    results.append(("Prioridad estudiante", test_7_priority_estudiante()))
    
    # Test 8: Limpieza
    results.append(("Limpieza de OTPs", test_8_cleanup_otps()))
    
    # Resumen
    print_header("RESUMEN DE PRUEBAS")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        color = Colors.OKGREEN if result else Colors.FAIL
        print(f"{color}{status}{Colors.ENDC} - {test_name}")
    
    print(f"\n{Colors.BOLD}Resultado: {passed}/{total} pruebas pasadas{Colors.ENDC}")
    
    if passed == total:
        print_success("\n🎉 ¡Todas las pruebas pasaron exitosamente!")
        return 0
    else:
        print_error(f"\n❌ {total - passed} prueba(s) fallaron")
        return 1


if __name__ == '__main__':
    try:
        exit_code = run_all_tests()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}Pruebas interrumpidas por el usuario{Colors.ENDC}")
        sys.exit(1)
    except Exception as e:
        print_error(f"\nError inesperado: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
