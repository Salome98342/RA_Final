import type { Course, RA } from '@/types'

export const courses: Course[] = [
  { id: 'INF-101', nombre: 'Introducción a la Programación', carrera: 'INF' },
  { id: 'INF-205', nombre: 'Estructuras de Datos', carrera: 'INF' },
  { id: 'ADM-110', nombre: 'Contabilidad I', carrera: 'ADM' },
  { id: 'MAT-120', nombre: 'Cálculo I', carrera: 'MAT' },
  { id: 'MAT-220', nombre: 'Álgebra Lineal', carrera: 'MAT' }
]

export const rasByCourse: Record<string, RA[]> = {
  'INF-101': [
    { id: 'RA1', titulo: 'Variables y tipos', info: 'Comprensión de tipos de datos' },
    { id: 'RA2', titulo: 'Estructuras de control', info: 'Uso de condicionales y bucles' },
    { id: 'RA3', titulo: 'Funciones', info: 'Modularización básica' }
  ],
  'INF-205': [
    { id: 'RA1', titulo: 'Listas y Pilas', info: 'Implementación y análisis' },
    { id: 'RA2', titulo: 'Colas y Árboles', info: 'Estructuras jerárquicas' },
    { id: 'RA3', titulo: 'Grafos', info: 'Representaciones y recorridos' }
  ],
  'ADM-110': [{ id: 'RA1', titulo: 'Asientos contables', info: 'Registro básico' }],
  'MAT-120': [{ id: 'RA1', titulo: 'Límites', info: 'Conceptos fundamentales' }],
  'MAT-220': [{ id: 'RA1', titulo: 'Vectores', info: 'Operaciones y propiedades' }]
}

export const studentsByCourse: Record<string, string[]> = {
  'INF-101': ['Ana Pérez', 'Juan Gómez', 'Luisa Rodríguez', 'Carlos Díaz', 'María López'],
  'INF-205': ['Elena Paz', 'Mario Cruz', 'Pedro Alfaro', 'Sofía Mena'],
  'ADM-110': ['Camila Ríos', 'Raúl Paredes'],
  'MAT-120': ['Alex Vega', 'Nora Arias', 'Iván Mora'],
  'MAT-220': ['Esteban Real', 'Lucía Ayala', 'Valeria Soto']
}
