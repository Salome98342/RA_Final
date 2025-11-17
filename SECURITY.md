# 🔒 Configuración de Seguridad - RA Manager

## ⚠️ IMPORTANTE: Variables de Entorno

Este proyecto usa variables de entorno para mantener la seguridad de credenciales y configuraciones sensibles.

## 📋 Configuración Inicial

### 1. Backend (Django)

1. **Copiar el archivo de ejemplo:**
   ```bash
   cd backend
   cp .env.example backend/.env
   ```

2. **Editar `backend/.env` con tus valores reales:**
   ```bash
   # NO subir este archivo a Git
   SECRET_KEY=genera-una-clave-secreta-aqui
   DEBUG=True
   DB_PASSWORD=tu-password-real
   ```

3. **Generar una SECRET_KEY segura:**
   ```python
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

### 2. Verificar que .env está en .gitignore

El archivo `.env` **NUNCA** debe subirse a Git. Verifica que esté en `.gitignore`:

```bash
# En .gitignore debe estar:
.env
*.env
!.env.example
```

## 🚨 Si Ya Subiste Credenciales a Git

Si accidentalmente subiste el archivo `.env` con credenciales:

1. **Cambiar TODAS las contraseñas inmediatamente**
2. **Generar nueva SECRET_KEY**
3. **Remover del historial de Git:**
   ```bash
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch backend/.env" \
   --prune-empty --tag-name-filter cat -- --all
   ```

## 📦 Instalación de Dependencias

Después de configurar `.env`:

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

## 🔐 Mejores Prácticas

1. ✅ Usa `.env.example` como plantilla (sin valores reales)
2. ✅ Mantén `.env` en `.gitignore`
3. ✅ Usa contraseñas fuertes y únicas
4. ✅ Cambia credenciales regularmente
5. ✅ Nunca hardcodees credenciales en el código
6. ❌ Nunca compartas tu archivo `.env`
7. ❌ Nunca subas `.env` a Git

## 🔍 Verificación

Para verificar que todo está bien configurado:

```bash
# Backend
cd backend
python manage.py check --deploy
```

## 📚 Variables de Entorno Disponibles

Ver archivo `.env.example` para la lista completa y documentación de cada variable.
