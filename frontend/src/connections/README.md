# connections

Fuente única de verdad para conectarse al backend:

- `http.ts`: cliente Axios con baseURL (VITE_API_URL), cookies y CSRF.
- `endpoints.ts`: rutas centralizadas de la API y tipo `UserProfile`.

Los servicios en `src/services/*` deben importar desde aquí.
