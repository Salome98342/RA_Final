# Retrospectiva Sprint 2

Objetivo del sprint: mejorar la usabilidad del sistema RA-Manager con una interfaz clara, organizada, accesible y adaptable.

| Funcionalidad encontrada | Archivo | Línea | Relación con el objetivo |
|---|---|---:|---|
| Estilo visual general del dashboard | [frontend/src/styles/app.css](frontend/src/styles/app.css#L345) | 345 | Define el fondo, la base visual y la presentación general del área de trabajo. |
| Estructura responsive con sidebar y contenido | [frontend/src/styles/app.css](frontend/src/styles/app.css#L454) | 454 | Organiza la pantalla en una grilla adaptable entre navegación lateral y contenido principal. |
| Prevención de desbordes y mejora de lectura | [frontend/src/styles/app.css](frontend/src/styles/app.css#L482) | 482 | Evita que textos, tablas y etiquetas se rompan en pantallas pequeñas o con contenido largo. |
| Reutilización de layout por rol | [frontend/src/components/RoleHomeLayout.tsx](frontend/src/components/RoleHomeLayout.tsx#L98) | 98 | Centraliza la estructura de inicio con header, sidebar y tarjetas de acceso rápido. |
| Normalización de nomenclaturas de documento | [frontend/src/utils/documento.ts](frontend/src/utils/documento.ts#L20) | 20 | Estándariza términos como C.C., C.R., T.I. y PPT para mantener consistencia en la interfaz. |
