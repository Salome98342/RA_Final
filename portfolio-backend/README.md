# Portfolio Backend

Backend API para el portafolio personal de Salomé Rodríguez Moscoso.

## 🛠️ Stack Tecnológico

- **Node.js** + **Express** - Framework web
- **Supabase** - Base de datos PostgreSQL en la nube
- **Express Validator** - Validación de datos

## 📋 Requisitos previos

- Node.js 18+ instalado
- Cuenta de Supabase configurada

## 🚀 Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de Supabase:
```
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
PORT=5000
```

3. Ejecutar el script SQL en Supabase:
- Ir a tu proyecto de Supabase
- Navegar a SQL Editor
- Ejecutar el contenido de `database/schema.sql`

## 🏃 Ejecución

Modo desarrollo:
```bash
npm run dev
```

Modo producción:
```bash
npm start
```

## 📡 Endpoints

### GET /api/profile
Obtiene la información del perfil

### GET /api/skills
Obtiene todas las habilidades organizadas por categoría

### GET /api/projects
Obtiene todos los proyectos

### POST /api/contact
Envía un mensaje de contacto

**Body:**
```json
{
  "name": "Nombre",
  "email": "email@example.com",
  "message": "Mensaje"
}
```

### GET /api/health
Verifica el estado de la API

## 🔐 Configuración de Supabase

1. Crear cuenta en [supabase.com](https://supabase.com)
2. Crear un nuevo proyecto
3. Obtener URL y Anon Key desde Project Settings > API
4. Ejecutar el script SQL desde `database/schema.sql`

## 📦 Deploy en Render/Vercel

### Render
1. Conectar repositorio
2. Configurar build command: `npm install`
3. Configurar start command: `npm start`
4. Agregar variables de entorno

### Vercel
1. Instalar Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel`
3. Configurar variables de entorno en dashboard

## 📄 Licencia

MIT - Salomé Rodríguez Moscoso
