# Retrospectiva Sprint 1

Objetivo del sprint: desarrollar visualizaciones analíticas para identificar bajo desempeño estudiantil y asignaturas críticas.

| Funcionalidad encontrada | Archivo | Línea | Relación con el objetivo |
|---|---|---:|---|
| Contrato de datos del dashboard de desempeño | [frontend/src/services/coordinador.ts](frontend/src/services/coordinador.ts#L575) | 575 | Define la llamada al endpoint que alimenta el tablero analítico. |
| Endpoint que construye HU-10 y HU-11 | [backend/api/views/coordinador_desempenio.py](backend/api/views/coordinador_desempenio.py#L103) | 103 | Estructura la respuesta con estudiantes con bajo desempeño y ranking de asignaturas. |
| Carga de datos con filtros por período y asignatura | [frontend/src/pages/coordinador/DesempenioEstudiantes.tsx](frontend/src/pages/coordinador/DesempenioEstudiantes.tsx#L92) | 92 | Invoca el dashboard aplicando los filtros usados en el análisis. |
| Panel de estudiantes con bajo desempeño | [frontend/src/pages/coordinador/DesempenioEstudiantes.tsx](frontend/src/pages/coordinador/DesempenioEstudiantes.tsx#L424) | 424 | Muestra la vista de estudiantes con RA perdidos, lista completa y resumen gráfico. |
| Ranking y gráficos de asignaturas críticas | [frontend/src/pages/coordinador/DesempenioEstudiantes.tsx](frontend/src/pages/coordinador/DesempenioEstudiantes.tsx#L626) | 626 | Presenta el ranking por porcentaje de bajo desempeño y la distribución visual por asignatura. |
