# Retrospectiva Sprint 0

Objetivo del sprint: implementar el seguimiento académico del estudiante, mostrando el avance de una asignatura y el estado de resultados de aprendizaje.

| Funcionalidad encontrada | Archivo | Línea | Relación con el objetivo |
|---|---|---:|---|
| Consumo del detalle completo de la asignatura del estudiante | [frontend/src/services/api.ts](frontend/src/services/api.ts#L189) | 189 | Solicita el endpoint que trae el detalle académico necesario para mostrar el progreso del curso. |
| Vista de desempeño personal dentro de la asignatura | [frontend/src/pages/estudiante/MateriaDetalle.tsx](frontend/src/pages/estudiante/MateriaDetalle.tsx#L187) | 187 | Presenta la sección Mi Desempeño con nota progresiva, cobertura y actividades calificadas. |
| Desglose por resultados de aprendizaje | [frontend/src/pages/estudiante/MateriaDetalle.tsx](frontend/src/pages/estudiante/MateriaDetalle.tsx#L231) | 231 | Muestra cada RA con peso, nota y cobertura para que el estudiante vea qué le falta por completar. |
| Resumen del curso y métricas por RA | [frontend/src/components/GradeSummary.tsx](frontend/src/components/GradeSummary.tsx#L39) | 39 | Complementa el seguimiento académico con el resumen del curso y la tabla de resultados de aprendizaje. |
