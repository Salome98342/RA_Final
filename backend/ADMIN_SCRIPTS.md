# Utilidades de Administración y Diagnóstico

Este documento describe las herramientas de línea de comandos disponibles para administración, diagnóstico y mantenimiento del sistema.

## 🔧 Scripts de Administración

### check_env.py
**Estado**: ✅ Activo  
**Propósito**: Validación completa del entorno de desarrollo/producción

#### Verificaciones realizadas:
- ✅ Existencia de archivo `.env`
- ✅ Versión de Python (>=3.10 requerida)
- ✅ Variables de entorno requeridas:
  - `SECRET_KEY`
  - `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
  - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
  - `DEBUG`, `ALLOWED_HOSTS`
- ✅ Conexión a PostgreSQL
- ✅ Salida con colores en terminal

#### Uso:
```bash
cd backend
python check_env.py
```

#### Cuándo usar:
- ✅ Antes de hacer deployment
- ✅ Cuando hay problemas de configuración
- ✅ Durante setup inicial
- ✅ Después de cambios en .env

---

### diagnostico.py
**Estado**: ✅ Activo  
**Propósito**: Diagnóstico completo del sistema y base de datos

#### Diagnósticos realizados:
- ✅ Conexión a base de datos PostgreSQL
- ✅ Conteo de registros en tablas principales:
  - Usuarios (estudiantes, docentes, coordinadores)
  - Programas académicos
  - Asignaturas
  - Resultados de Aprendizaje
  - Actividades
  - Matrículas
  - Calificaciones
- ✅ Registros de seguridad:
  - Intentos de login
  - Bloqueos de cuenta
  - Códigos OTP activos
  - Eventos de seguridad
- ✅ Configuración de Django:
  - `DEBUG` mode
  - `ALLOWED_HOSTS`
  - `CORS_ORIGIN_ALLOW_ALL`
  - Base de datos configurada

#### Uso:
```bash
cd backend
python diagnostico.py
```

#### Cuándo usar:
- ✅ Troubleshooting de problemas generales
- ✅ Verificar estado del sistema en producción
- ✅ Auditorías periódicas
- ✅ Después de migraciones

---

### unlock_accounts.py
**Estado**: ✅ Activo  
**Propósito**: Desbloqueo manual de cuentas bloqueadas por intentos fallidos

#### Funcionalidad:
- Muestra todas las cuentas actualmente bloqueadas
- Permite desbloquear una cuenta específica por código de usuario
- Resetea contador de intentos fallidos
- Limpia fechas de bloqueo

#### Uso:
```bash
cd backend
python unlock_accounts.py
```

#### Cuándo usar:
- ✅ Usuario legítimo bloqueado por error
- ✅ Soporte técnico necesita desbloquear cuenta
- ✅ Testing de sistema de lockout

#### Seguridad:
⚠️ Este script debe usarse con precaución. Solo personal autorizado debe tener acceso.

---

### generate_secret_key.py
**Estado**: ✅ Activo  
**Propósito**: Generación de SECRET_KEY segura para Django

#### Funcionalidad:
- Genera una clave criptográficamente segura de 50 caracteres
- Usa `secrets.choice()` para seguridad máxima
- Caracteres permitidos: letras, dígitos, signos de puntuación

#### Uso:
```bash
cd backend
python generate_secret_key.py
```

Copiar la salida y agregarla al archivo `.env`:
```env
SECRET_KEY='nueva_clave_generada_aqui'
```

#### Cuándo usar:
- ✅ Setup inicial del proyecto
- ✅ Rotación de SECRET_KEY (recomendado cada 6-12 meses en producción)
- ✅ Después de sospecha de compromiso de seguridad
- ✅ Antes de deployment a producción

#### ⚠️ IMPORTANTE:
- **NUNCA** compartir la SECRET_KEY
- **NUNCA** commitear SECRET_KEY a Git
- **Rotar** la clave periódicamente en producción
- **Cambiar** la clave default antes del primer deployment

---

### hash_passwords.py
**Estado**: 🗃️ Archivado  
**Propósito**: Migración de contraseñas de texto plano a hashes

#### Funcionalidad:
- Migra contraseñas de estudiantes, docentes y coordinadores
- Usa `pbkdf2_sha256` con 1,000,000 iteraciones
- Registra auditoría completa de cambios
- Modo dry-run disponible para preview

#### Nota:
✅ **Migración ya completada** (12 cuentas: 8 estudiantes, 3 docentes, 1 coordinador)

Este script se mantiene archivado por si:
- Se importan nuevos usuarios con contraseñas en texto plano
- Se necesita re-migrar después de restore de backup antiguo

#### Uso (si es necesario):
```bash
cd backend
python hash_passwords.py
```

---

## 🗂️ Scripts Eliminados (Obsoletos)

### ~~check_passwords.py~~ ❌
**Eliminado**: 25/02/2026  
**Razón**: Era solo para testing manual de hashes. Ya no es necesario después de la migración.

### ~~setup_real_email.py~~ ❌
**Eliminado**: 25/02/2026  
**Razón**: Era para testing de OTP. Sistema de email ya configurado y funcionando.

---

## 📋 Checklist de Deployment

Antes de hacer deployment a producción, ejecutar en orden:

1. ✅ **`generate_secret_key.py`** - Generar nueva SECRET_KEY
2. ✅ **Actualizar `.env`** con SECRET_KEY generada
3. ✅ **Cambiar `DEBUG=False`** en `.env`
4. ✅ **Configurar `ALLOWED_HOSTS`** con dominios reales
5. ✅ **`check_env.py`** - Validar toda la configuración
6. ✅ **`python manage.py migrate`** - Aplicar migraciones
7. ✅ **`diagnostico.py`** - Verificar estado del sistema
8. ✅ **Test manual** de login y funcionalidades críticas

---

## 🔒 Seguridad

### Acceso a scripts:
- ⚠️ Scripts de diagnóstico: Solo personal técnico autorizado
- 🔴 Scripts de unlock: Solo administradores senior
- 🔴 Scripts de generación de claves: Solo DevOps/administradores

### Protección de archivos:
En sistemas Unix/Linux, restringir permisos:
```bash
chmod 750 *.py  # Solo propietario y grupo pueden ejecutar
chmod 600 .env  # Solo propietario puede leer .env
```

### Logs:
Todos los scripts críticos registran su ejecución en:
- Django logs (`logs/`)
- SecurityEvent model (para acciones de seguridad)

---

## 📝 Mantenimiento

### Frecuencia recomendada:

| Script | Frecuencia | Momento |
|--------|-----------|---------|
| `check_env.py` | Semanal | Lunes por la mañana |
| `diagnostico.py` | Diaria | Automático vía cron |
| `unlock_accounts.py` | Según demanda | Cuando usuario reporta bloqueo |
| `generate_secret_key.py` | Semestral | Durante mantenimiento programado |

### Automatización:
Ejemplo de cron job para diagnóstico diario:
```cron
# Diagnóstico diario a las 6 AM
0 6 * * * cd /path/to/backend && /path/to/env/bin/python diagnostico.py >> /var/log/ra-manager/diagnostic.log 2>&1
```

---

## 🆘 Solución de Problemas

### Problema: check_env.py falla con error de importación
**Solución**: Activar entorno virtual primero
```bash
source ../env/bin/activate  # Linux/Mac
..\env\Scripts\activate     # Windows
```

### Problema: diagnostico.py muestra 0 registros
**Solución**: 
1. Verificar conexión a base de datos correcta
2. Verificar que `DB_NAME` en `.env` sea correcto
3. Ejecutar migraciones: `python manage.py migrate`

### Problema: unlock_accounts.py no encuentra cuentas bloqueadas
**Solución**: Verificar en Django admin o directamente en DB:
```sql
SELECT * FROM account_lockout WHERE bloqueado = true;
```

---

**Última actualización**: 25/02/2026  
**Mantenedor**: Equipo de desarrollo RA-Manager
