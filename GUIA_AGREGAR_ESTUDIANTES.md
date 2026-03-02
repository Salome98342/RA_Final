# 📝 Guía: Agregar Estudiantes Individualmente

## 🎯 Descripción

Como **coordinador**, puedes agregar estudiantes de forma individual utilizando un formulario intuitivo. El sistema automáticamente:
- ✅ Genera una contraseña provisional segura
- ✅ Envía un correo de bienvenida con las credenciales
- ✅ Valida que no existan duplicados

## 🚀 Cómo Acceder

1. Inicia sesión como **Coordinador**
2. En el menú lateral izquierdo, haz clic en **"Estudiantes"** (ícono de personas)
3. Verás la lista de estudiantes registrados

## ➕ Agregar un Nuevo Estudiante

### Paso 1: Abrir el Formulario
- Haz clic en el botón **"Agregar Estudiante Individual"**
- Se desplegará un formulario con todos los campos necesarios

### Paso 2: Completar los Datos

**Campos Obligatorios** (marcados con *):
- **Código de Estudiante**: Código único del estudiante (ej: `2360900`)
- **Correo Electrónico**: Email institucional donde recibirá las credenciales
- **Nombre**: Primer nombre del estudiante
- **Apellido**: Apellido del estudiante
- **Tipo de Documento**: Selecciona de la lista (ej: Cédula de Ciudadanía)
- **Número de Documento**: Número de identificación único

**Campo Opcional**:
- **Jornada**: Diurna, Nocturna, etc.

### Paso 3: Crear el Estudiante
- Haz clic en **"Crear Estudiante"**
- El sistema validará los datos
- Si todo está correcto:
  - ✅ El estudiante se crea en la base de datos
  - ✅ Se genera una contraseña provisional automáticamente
  - ✅ Se envía un correo de bienvenida al email indicado
  - ✅ Verás un mensaje de confirmación en verde

## 📧 ¿Qué Recibe el Estudiante?

El estudiante recibirá un correo con:
```
Asunto: Bienvenido a RA Manager

¡Bienvenido/a a RA Manager!

Hola [Nombre] [Apellido],

Tu cuenta ha sido creada exitosamente en el sistema RA Manager.

Tus credenciales de acceso son:
- Código de estudiante: [código]
- Correo: [correo]
- Contraseña provisional: [password_generada]

IMPORTANTE: Por tu seguridad, debes cambiar tu contraseña provisional 
en el primer inicio de sesión.
```

## 🔍 Buscar Estudiantes

Puedes buscar estudiantes usando el campo de búsqueda por:
- Código de estudiante
- Nombre
- Apellido
- Correo electrónico
- Número de documento

La búsqueda se actualiza automáticamente mientras escribes.

## ⚠️ Validaciones del Sistema

El sistema NO permitirá crear un estudiante si:
- ❌ El código de estudiante ya existe
- ❌ El correo electrónico ya está registrado
- ❌ El número de documento ya existe
- ❌ Falta algún campo obligatorio

En caso de error, verás un mensaje en rojo indicando el problema.

## 💡 Consejos

1. **Verificar correos**: Asegúrate de que el correo electrónico sea válido y esté activo
2. **Códigos únicos**: Cada estudiante debe tener un código único en el sistema
3. **Carga masiva**: Si necesitas agregar muchos estudiantes, usa la opción **"Carga masiva (CSV)"** en la parte superior de la página

## 🔗 Funcionalidades Relacionadas

- **Carga Masiva CSV**: Para importar múltiples estudiantes desde un archivo
- **Gestión de Matrículas**: Para inscribir estudiantes en asignaturas
- **Tipos de Documento**: Configurados en el sistema (CC, TI, Pasaporte, etc.)

## 📊 Vista de Lista

La tabla muestra:
- Código del estudiante (badge gris)
- Nombre completo
- Correo electrónico
- Tipo y número de documento
- Jornada (si fue especificada)

## 🛠️ Arquitectura Técnica

**Backend**:
- Endpoint: `POST /coordinador/estudiantes`
- Función: `coordinador_estudiantes_view()` en `views.py`
- Email: `_send_welcome_email()` con configuración SMTP

**Frontend**:
- Componente: `Estudiantes.tsx`
- Ruta: `/coordinador/estudiantes`
- Servicios: `createEstudiante()`, `fetchEstudiantes()`, `fetchTiposDocumento()`

---

✨ **Sistema RA Manager** - Gestión integral de resultados de aprendizaje
