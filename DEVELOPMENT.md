# Guía de Desarrollo y Mejores Prácticas - RA-Manager

## 📋 Tabla de Contenidos
1. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
2. [Convenciones de Código](#convenciones-de-código)
3. [Gestión de Logs](#gestión-de-logs)
4. [Testing](#testing)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitectura del Proyecto

### Backend (Django + PostgreSQL)
```
backend/
├── api/                    # App principal
│   ├── models/            # Modelos de datos
│   ├── serializers/       # Serializers DRF
│   ├── views/             # Vistas y lógica de negocio
│   ├── urls/              # Configuración de rutas
│   └── migrations/        # Migraciones de BD
├── backend/               # Configuración del proyecto
│   ├── settings.py        # Configuración (usa .env)
│   └── urls.py            # Rutas principales
├── db/                    # Scripts SQL
├── media/                 # Archivos subidos (avatares, recursos)
└── .env                   # Variables de entorno (NO en Git)
```

### Frontend (React + TypeScript)
```
frontend/
├── src/
│   ├── pages/            # Vistas principales (Docente, Estudiante, Coordinador)
│   ├── components/       # Componentes reutilizables (HeaderBar, Sidebar, Cards)
│   ├── services/         # Lógica de API y autenticación
│   ├── connections/      # Cliente HTTP (http.ts)
│   ├── state/            # Context API (SessionContext)
│   └── styles/           # Estilos globales
└── public/               # Assets estáticos
```

---

## 📝 Convenciones de Código

### Backend (Python/Django)

#### Nomenclatura
- **Clases**: PascalCase (`Docente`, `ResultadoDeAprendizaje`)
- **Funciones/métodos**: snake_case (`get_profile`, `calculate_average`)
- **Constantes**: UPPER_SNAKE_CASE (`MAX_GRADE`, `DEFAULT_TIMEOUT`)
- **Variables privadas**: Prefijo `_` (`_internal_method`)

#### Estructura de vistas
```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def my_view(request):
    """
    Docstring explicando el propósito de la vista.
    
    GET: Obtiene lista de recursos
    POST: Crea un nuevo recurso
    """
    if request.method == 'GET':
        # Lógica GET
        return Response(data, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = MySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

#### Logging
```python
import logging

logger = logging.getLogger(__name__)

def my_function():
    logger.debug('Mensaje de debug (solo en DEBUG=True)')
    logger.info('Información general')
    logger.warning('Advertencia')
    logger.error('Error no crítico')
    logger.critical('Error crítico')
```

### Frontend (TypeScript/React)

#### Nomenclatura
- **Componentes**: PascalCase (`HeaderBar`, `StudentList`)
- **Funciones/hooks**: camelCase (`getProfile`, `useSession`)
- **Constantes**: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_FILE_SIZE`)
- **Tipos/Interfaces**: PascalCase (`ProfileData`, `ActivityResponse`)

#### Estructura de componentes
```tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './MyComponent.css'

interface MyComponentProps {
  id: number
  title: string
  onAction?: () => void
}

const MyComponent: React.FC<MyComponentProps> = ({ id, title, onAction }) => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Efecto de carga inicial
  }, [id])

  return (
    <div className="my-component">
      <h1>{title}</h1>
      {/* Contenido */}
    </div>
  )
}

export default MyComponent
```

#### Logging (solo en desarrollo)
```typescript
// ✅ CORRECTO: Condicional para desarrollo
if (import.meta.env.DEV) {
  console.debug('Debug info', data)
}

// ❌ INCORRECTO: Log sin condicional
console.log('Esto aparecerá en producción!')
```

---

## 📊 Gestión de Logs

### Backend

#### Configuración en `.env`
```bash
# Nivel de log de Django (DEBUG, INFO, WARNING, ERROR, CRITICAL)
DJANGO_LOG_LEVEL=INFO
```

#### Niveles de log por entorno
- **Desarrollo**: `DEBUG` - Logs detallados
- **Staging**: `INFO` - Información general
- **Producción**: `WARNING` - Solo advertencias y errores

#### Ubicación de logs
- **Consola**: Todos los logs aparecen en terminal cuando `DEBUG=True`
- **Archivo**: Los logs se guardan en `backend/logs/` (pendiente implementar file handler si es necesario)

### Frontend

#### Logs en desarrollo
```typescript
if (import.meta.env.DEV) {
  console.debug('Debug:', variable)
  console.log('Info:', data)
}
```

#### Logs en producción
- **Evitar** `console.log` sin condicional
- **Usar** herramientas de monitoreo (Sentry, LogRocket) si se implementan

---

## 🧪 Testing

### Backend (Django)

#### Ejecutar tests
```bash
# Activar entorno virtual
source env/bin/activate  # Linux/Mac
.\env\Scripts\Activate.ps1  # Windows

# Ejecutar todos los tests
python manage.py test

# Ejecutar tests de una app específica
python manage.py test api

# Ejecutar con cobertura
coverage run --source='.' manage.py test
coverage report
```

#### Estructura de tests
```python
from django.test import TestCase, Client
from api.models import Docente

class DocenteTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.docente = Docente.objects.create(
            nombre='Test Docente',
            correo='test@univalle.edu.co'
        )

    def test_docente_creation(self):
        self.assertEqual(self.docente.nombre, 'Test Docente')

    def test_api_endpoint(self):
        response = self.client.get('/api/docentes/')
        self.assertEqual(response.status_code, 200)
```

### Frontend (Vitest)

#### Ejecutar tests
```bash
# Desde la carpeta frontend
npm run test

# Con cobertura
npm run test:coverage

# Watch mode
npm run test:watch
```

#### Estructura de tests
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<MyComponent onAction={handleClick} />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```

---

## 🚀 Deployment

### Preparación para Producción

#### Backend
1. **Variables de entorno**:
   ```bash
   DEBUG=False
   SECRET_KEY=<generar-nuevo-secret-key>
   ALLOWED_HOSTS=tudominio.com,www.tudominio.com
   CORS_ORIGINS=https://tudominio.com
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   ```

2. **Migraciones**:
   ```bash
   python manage.py migrate
   python manage.py collectstatic
   ```

3. **Servidor**: Usar Gunicorn + Nginx
   ```bash
   pip install gunicorn
   gunicorn backend.wsgi:application --bind 0.0.0.0:8000
   ```

#### Frontend
1. **Build de producción**:
   ```bash
   npm run build
   ```

2. **Servidor estático**: Nginx/Caddy para servir `dist/`

3. **Variables de entorno**:
   ```bash
   VITE_API_URL=https://api.tudominio.com
   ```

### Checklist de Seguridad
- [ ] `DEBUG=False` en producción
- [ ] SECRET_KEY único y seguro (mínimo 50 caracteres)
- [ ] HTTPS habilitado (certificado SSL/TLS)
- [ ] CORS configurado solo para dominios autorizados
- [ ] `.env` no está en Git (verificar `.gitignore`)
- [ ] Credenciales de BD seguras (no usar defaults)
- [ ] Cambiar contraseña de coordinador por defecto
- [ ] Configurar copias de seguridad de BD

---

## 🔧 Troubleshooting

### Errores Comunes

#### "No module named 'dotenv'"
```bash
pip install python-dotenv
```

#### "SECRET_KEY not found"
```bash
# Verificar que .env existe y tiene SECRET_KEY
cat backend/backend/.env  # Linux/Mac
type backend\backend\.env  # Windows

# Si no existe, copiar desde .env.example
cp backend/.env.example backend/backend/.env
```

#### "CORS error" en frontend
- Verificar `CORS_ORIGINS` en `.env`
- Verificar que backend está corriendo
- Verificar URL en `frontend/src/connections/http.ts`

#### Migraciones no se aplican
```bash
# Ver migraciones pendientes
python manage.py showmigrations

# Aplicar todas
python manage.py migrate

# Si hay conflictos, resolver con:
python manage.py migrate --fake api <numero_migracion>
```

#### Frontend no conecta con backend
1. Verificar backend corriendo: `http://localhost:8000/api/`
2. Verificar CORS configurado
3. Verificar `API_BASE_URL` en frontend

---

## 📚 Recursos Adicionales

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/)

---

**Última actualización**: Noviembre 2025  
**Equipo**: RA-Manager Development Team
