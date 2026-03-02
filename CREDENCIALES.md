# 🔑 Credenciales de Acceso - RA Manager

## ✅ Problema Resuelto

Las contraseñas estaban almacenadas en texto plano y ahora han sido hasheadas correctamente. El login ya funciona.

---

## 👥 Credenciales de Usuarios

### 👨‍🏫 Docentes
| Código | Email | Contraseña |
|--------|-------|-----------|
| DOC-001 | (correo del docente 1) | `12345` |
| DOC-003 | cristian.rodriguez@univalle.edu.co | `12345` |

### 👨‍🎓 Estudiantes
| Código | Email | Contraseña |
|--------|-------|-----------|
| 2360529 | david.escobar@correounivalle.edu.co | `Escobar1234` |
| 2360800 | guadalupe.hincapie@correounivalle.edu.co | `Guadalupe2024` |
| 2360900 | andres.mejia@correounivalle.edu.co | `Andres2024!` |
| 2552295 | (correo estudiante) | `Sergio12345` |
| 2360792 | (correo estudiante) | `Salome12345` |
| 2360535 | (correo estudiante) | `Manuel12345` |
| 2360559 | (correo estudiante) | `Laura12345` |
| 2360531 | (correo estudiante) | `Harold12345` |
| 2360503 | (correo estudiante) | `Sergio12345` |
| 2360557 | (correo estudiante) | `Kevin123` |

### 👔 Coordinador
| Código | Email | Contraseña |
|--------|-------|-----------|
| 02-2724-Caice | tecnologia.software.caicedonia@correounivalle.edu.co | `Tedesoft1234` |

---

## 🚀 Cómo Usar

1. Abre tu navegador en: **http://localhost:5173**
2. Ingresa el **código** (por ejemplo: `DOC-003` o `2360529`)
3. Ingresa la **contraseña** correspondiente
4. ¡Listo! 🎉

---

## ⚠️ Notas Importantes

- **Todas las contraseñas están hasheadas** en la base de datos
- El sistema ahora usa `pbkdf2_sha256` de Django para verificar contraseñas
- Los intentos fallidos se registran en la tabla `login_attempt`
- Después de 3 intentos fallidos, la cuenta se bloquea por 30 minutos

### 🔐 Requisitos para Cambiar Contraseña

Al recuperar o cambiar tu contraseña, la nueva contraseña debe cumplir con:

- ✅ Mínimo 8 caracteres
- ✅ Al menos una mayúscula (A-Z)
- ✅ Al menos una minúscula (a-z)
- ✅ Al menos un número (0-9)
- ✅ Al menos un carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?)

**Ejemplo de contraseña válida:** `Salome2024!` o `Univalle#123`

---

## 📋 Scripts Útiles

- `backend\check_passwords.py` - Verificar el estado de las contraseñas
- `backend\hash_passwords.py` - Hashear contraseñas en texto plano
- `backend\crear_estudiante.py` - Crear un nuevo estudiante en la base de datos

---

## 👥 Agregar Estudiantes a Cursos (Docentes)

Como docente, puedes agregar estudiantes individualmente a tus cursos:

1. **Inicia sesión como docente** (ejemplo: `DOC-003`)
2. **Navega a "Recursos"** del curso donde deseas agregar al estudiante
3. **En la sección "Agregar estudiante individual":**
   - Ingresa el código del estudiante en formato: `codigo-programa`
   - Ejemplo: `2360900-2724` (donde 2724 es el código del programa)
   - También puedes usar solo el código: `2360900`
4. **Haz clic en "Buscar"**
5. **Verifica los datos** del estudiante en el modal
6. **Confirma** para agregarlo al curso
7. El estudiante recibirá una **notificación por email**

### 📝 Estudiantes disponibles para pruebas:
- **Andrés Mejía**: `2360900-2724`
- **Guadalupe Hincapié**: `2360800-2724`

### ⚠️ Validaciones automáticas:
- ✅ El programa del estudiante debe coincidir con el programa del curso
- ✅ No se puede agregar un estudiante que ya está matriculado
- ✅ Solo el docente del curso puede agregar estudiantes

---

## 🔧 Si el login aún no funciona

1. Verifica que ambos servidores estén corriendo:
   - Backend: http://127.0.0.1:8000
   - Frontend: http://localhost:5173

2. Abre la **consola del navegador** (F12) para ver errores

3. Verifica las credenciales:
   ```powershell
   .\env\Scripts\python.exe backend\check_passwords.py
   ```

4. Revisa los logs del backend en la terminal donde ejecutaste `python manage.py runserver`
