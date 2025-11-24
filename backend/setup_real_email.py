#!/usr/bin/env python
"""
Script para configurar correo real de prueba y habilitar envío SMTP
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models.models import Estudiante, Docente

def update_student_email(codigo, new_email):
    """Actualiza el correo de un estudiante"""
    try:
        estudiante = Estudiante.objects.get(codigo_estudiante=codigo)
        old_email = estudiante.correo
        estudiante.correo = new_email
        estudiante.save()
        print(f"✅ Correo actualizado exitosamente:")
        print(f"   Usuario: {estudiante.nombre} {estudiante.apellido} ({codigo})")
        print(f"   Anterior: {old_email}")
        print(f"   Nuevo: {new_email}")
        return True
    except Estudiante.DoesNotExist:
        print(f"❌ No se encontró estudiante con código: {codigo}")
        return False

def update_teacher_email(codigo, new_email):
    """Actualiza el correo de un docente"""
    try:
        docente = Docente.objects.get(codigo_docente=codigo)
        old_email = docente.correo
        docente.correo = new_email
        docente.save()
        print(f"✅ Correo actualizado exitosamente:")
        print(f"   Usuario: {docente.nombre} {docente.apellido} ({codigo})")
        print(f"   Anterior: {old_email}")
        print(f"   Nuevo: {new_email}")
        return True
    except Docente.DoesNotExist:
        print(f"❌ No se encontró docente con código: {codigo}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("CONFIGURACIÓN DE CORREO REAL PARA PRUEBAS OTP")
    print("=" * 60)
    print("\nUsuarios disponibles:")
    print("\nEstudiantes:")
    for e in Estudiante.objects.all()[:5]:
        print(f"  - {e.codigo_estudiante}: {e.nombre} {e.apellido} ({e.correo})")
    
    print("\nDocentes:")
    for d in Docente.objects.all()[:5]:
        print(f"  - {d.codigo_docente}: {d.nombre} {d.apellido} ({d.correo})")
    
    print("\n" + "=" * 60)
    print("\n📧 Ingresa los datos para actualizar:")
    print("   (Deja en blanco para cancelar)\n")
    
    tipo = input("¿Tipo de usuario? (estudiante/docente): ").strip().lower()
    if not tipo or tipo not in ['estudiante', 'docente']:
        print("❌ Operación cancelada")
        sys.exit(0)
    
    codigo = input(f"Código del {tipo}: ").strip().upper()
    if not codigo:
        print("❌ Operación cancelada")
        sys.exit(0)
    
    new_email = input("Tu correo real (Gmail recomendado): ").strip()
    if not new_email or '@' not in new_email:
        print("❌ Correo inválido")
        sys.exit(1)
    
    print(f"\n⚠️  Vas a actualizar el correo a: {new_email}")
    confirm = input("¿Confirmar? (si/no): ").strip().lower()
    
    if confirm == 'si':
        if tipo == 'estudiante':
            success = update_student_email(codigo, new_email)
        else:
            success = update_teacher_email(codigo, new_email)
        
        if success:
            print("\n" + "=" * 60)
            print("SIGUIENTE PASO: Configurar SMTP en .env")
            print("=" * 60)
            print("\nPara enviar correos reales, actualiza backend/backend/.env:")
            print("\n# Cambiar de console a smtp:")
            print("EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend")
            print("EMAIL_HOST=smtp.gmail.com")
            print("EMAIL_PORT=587")
            print("EMAIL_USE_TLS=True")
            print(f"EMAIL_HOST_USER={new_email}")
            print("EMAIL_HOST_PASSWORD=tu-app-password-de-gmail")
            print("DEFAULT_FROM_EMAIL=no-reply@univalle.edu.co")
            print("\n⚠️  IMPORTANTE:")
            print("   1. Usa 'App Password' de Gmail, NO tu contraseña normal")
            print("   2. Genera App Password en: https://myaccount.google.com/apppasswords")
            print("   3. Reinicia el servidor después de cambiar .env")
            print("\n✅ Usuario actualizado. Ya puedes probar el sistema OTP.")
    else:
        print("❌ Operación cancelada")
