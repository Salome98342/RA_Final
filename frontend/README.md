# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
## Integración con Django (backend)

- Desarrollo:
  - Cliente HTTP unificado en `src/connections/http.ts` con CSRF + cookies.
  - Mapa de endpoints en `src/connections/endpoints.ts`.
  - Servicios de dominio en `src/services/*.ts` consumen esos endpoints.
  - Variables: `VITE_API_URL` (en dev es `/api` via proxy), `VITE_USE_MOCKS` para usar `src/mocks`.

- Autenticación esperada (ajústalo a tu back):
  - `POST /auth/login` con `{ code, password }` donde `code` es `codigo_docente` o `codigo_estudiante`.
  - `GET /auth/me` devuelve `{ id, nombre, rol, code }`.
  - `POST /auth/logout`.
  - Recuperación: `POST /auth/password/forgot`, `POST /auth/password/reset`.
  - Corre Django en http://127.0.0.1:8000 (con DRF + CORS habilitado para http://localhost:5173)
  - Vite proxea `/api` → `127.0.0.1:8000` (ver `vite.config.ts`)
  - Variables: ver `.env.development` (`VITE_API_URL=/api`, `VITE_USE_MOCKS=false`)

- Producción:
  - Ajusta `VITE_API_URL` en `.env.production` (por ejemplo, `https://tu-dominio.com/api`)
  - Ejecuta `npm run build` y sirve los estáticos donde corresponda

- Endpoints usados por el frontend (ajusta a tus rutas reales):
  - GET `/asignaturas/` → cursos
  - GET `/asignaturas/{codigo}/ras/` → resultados de aprendizaje de una asignatura
  - GET `/asignaturas/{codigo}/estudiantes/` → estudiantes inscritos
