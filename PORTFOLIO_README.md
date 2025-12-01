# Portfolio Personal - Salomé Rodríguez Moscoso 🎨

Portafolio personal moderno con diseño gradient, animaciones fluidas y arquitectura completa full-stack.

## 🌟 Características

- **Frontend React** con TypeScript, TailwindCSS y Framer Motion
- **Backend Node.js + Express** con validaciones
- **Base de datos Supabase** (PostgreSQL)
- **Diseño moderno** con gradientes y glassmorphism
- **Animaciones fluidas** con Framer Motion
- **Totalmente responsivo** y accesible (WCAG 2.1)

## 🛠️ Stack Tecnológico

### Frontend
- React 19 + TypeScript
- TailwindCSS (diseño moderno)
- Framer Motion (animaciones)
- React Router (navegación)
- Axios (cliente HTTP)
- Vite (build tool)

### Backend
- Node.js + Express
- Supabase SDK
- Express Validator
- CORS habilitado

### Base de Datos
- Supabase (PostgreSQL)
- Row Level Security (RLS)
- Políticas de acceso configuradas

## 📦 Estructura del Proyecto

```
RA_Final/
├── frontend/                 # Aplicación React
│   ├── src/
│   │   ├── portfolio/       # Código del portafolio
│   │   │   ├── pages/       # Páginas del portafolio
│   │   │   ├── components/  # Componentes reutilizables
│   │   │   └── services/    # Servicios API
│   │   └── ...              # Otros archivos del proyecto académico
│   ├── tailwind.config.js   # Configuración TailwindCSS
│   └── package.json
├── portfolio-backend/        # API Node.js
│   ├── config/              # Configuración Supabase
│   ├── controllers/         # Controladores
│   ├── routes/              # Rutas de la API
│   ├── database/            # Scripts SQL
│   └── server.js            # Servidor Express
└── netlify.toml             # Configuración deploy frontend
```

## 🚀 Instalación y Ejecución

### 1. Configurar Backend

```bash
cd portfolio-backend
npm install
cp .env.example .env
# Editar .env con tus credenciales de Supabase
npm start
```

### 2. Configurar Base de Datos (Supabase)

1. Crear cuenta en [supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Ir a SQL Editor
4. Ejecutar el script en `portfolio-backend/database/schema.sql`
5. Copiar URL y Anon Key desde Project Settings > API

### 3. Configurar Frontend

```bash
cd frontend
npm install
cp .env.example .env.development
# Editar .env.development con la URL del backend
npm run dev
```

### 4. Acceder al Portfolio

Abre tu navegador en `http://localhost:5173/portfolio`

## 🎨 Secciones del Portfolio

1. **Inicio** - Hero section con animación de gradiente
2. **Sobre mí** - Información personal y experiencia
3. **Habilidades** - Organizadas por categorías (Frontend, Backend, etc.)
4. **Proyectos** - Portafolio de proyectos realizados
5. **Contacto** - Formulario funcional conectado al backend

## 📡 API Endpoints

### GET /api/profile
Obtiene información del perfil

### GET /api/skills
Obtiene todas las habilidades organizadas por categoría

### GET /api/projects
Obtiene todos los proyectos

### POST /api/contact
Envía un mensaje de contacto
```json
{
  "name": "Nombre",
  "email": "email@example.com",
  "message": "Mensaje"
}
```

## 🚢 Deployment

### Frontend (Netlify)

1. Conectar repositorio en Netlify
2. Configurar:
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
   - Base directory: `frontend`
3. Agregar variables de entorno:
   - `VITE_PORTFOLIO_API_URL`: URL del backend desplegado
4. Deploy!

### Backend (Render)

1. Crear Web Service en Render
2. Conectar repositorio
3. Configurar:
   - Root directory: `portfolio-backend`
   - Build command: `npm install`
   - Start command: `npm start`
4. Agregar variables de entorno:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
5. Deploy!

## 🎯 Personalización

Para personalizar con tu información:

1. **Base de datos**: Editar datos en `portfolio-backend/database/schema.sql`
2. **Información por defecto**: Editar controladores en `portfolio-backend/controllers/`
3. **Estilos**: Modificar `frontend/tailwind.config.js` para colores y animaciones
4. **Contenido**: Los datos se cargan dinámicamente desde Supabase

## 🔐 Seguridad

- Row Level Security (RLS) habilitado en Supabase
- Políticas de solo lectura para datos públicos
- Validación de datos en el backend
- Variables de entorno para credenciales sensibles
- CORS configurado correctamente

## 📝 Licencia

MIT - Salomé Rodríguez Moscoso

## 📧 Contacto

- Email: salomerodriguezmoscoso@gmail.com
- GitHub: [@Salome98342](https://github.com/Salome98342)

---

Hecho con ❤️ usando React, Node.js y Supabase
