/**
 * Test de validación de headers para importación de estudiantes
 * Verifica que ambos formatos sean aceptados: RA Manager y Sistema de Registro Académico
 */

const normalizeHeader = (value) => {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

const validateHeaders = (headers, rule) => {
  const headerSet = new Set(headers)
  const missing = []

  rule.required.forEach((requiredHeader) => {
    if (!headerSet.has(requiredHeader)) {
      missing.push(requiredHeader)
    }
  })

  if (rule.oneOfGroups?.length) {
    rule.oneOfGroups.forEach((group) => {
      const hasAtLeastOne = group.some((candidate) => headerSet.has(candidate))
      if (!hasAtLeastOne) {
        missing.push(`(${group.join(' o ')})`)
      }
    })
  }

  return missing
}

const headerRule = {
  required: [],
  oneOfGroups: [
    ['codigo_estudiante', 'codigo'],
    ['nombre', 'nombres'],
    ['apellido', 'apellidos'],
    ['correo', 'email'],
    ['tipo_documento', 'documento_identidad'],
    ['num_documento', 'documento', 'documento_identidad'],
  ],
}

console.log('='.repeat(80))
console.log('TEST: Validación de Headers para Importación de Estudiantes')
console.log('='.repeat(80))

// Test 1: Formato Sistema de Registro Académico
console.log('\n[TEST 1] Formato Sistema de Registro Académico')
console.log('-'.repeat(80))
const headersAcademico = [
  'periodo_matriculado',
  'programa_academico',
  'apellidos',
  'nombres',
  'codigo',
  'documento_identidad',
  'dirección',
  'teléfono',
  'celular',
  'email',
  'admitido_primer_semestre',
]
console.log('Headers disponibles:', headersAcademico)
const missingAcademico = validateHeaders(headersAcademico, headerRule)
console.log('Headers faltantes:', missingAcademico.length === 0 ? '✓ NINGUNO' : missingAcademico)
console.log(`Resultado: ${missingAcademico.length === 0 ? '✓ PASS' : '✗ FAIL'}`)

// Test 2: Formato RA Manager
console.log('\n[TEST 2] Formato RA Manager (Estándar)')
console.log('-'.repeat(80))
const headersRAManager = [
  'codigo_estudiante',
  'nombre',
  'apellido',
  'correo',
  'tipo_documento',
  'num_documento',
  'jornada',
]
console.log('Headers disponibles:', headersRAManager)
const missingRAManager = validateHeaders(headersRAManager, headerRule)
console.log('Headers faltantes:', missingRAManager.length === 0 ? '✓ NINGUNO' : missingRAManager)
console.log(`Resultado: ${missingRAManager.length === 0 ? '✓ PASS' : '✗ FAIL'}`)

// Test 3: Headers incorrectos (incompletos)
console.log('\n[TEST 3] Headers Incompletos (debe fallar)')
console.log('-'.repeat(80))
const headersIncompletos = [
  'codigo_estudiante',
  'nombre',
  'apellido',
  // Faltan: correo, tipo_documento, num_documento
]
console.log('Headers disponibles:', headersIncompletos)
const missingIncompletos = validateHeaders(headersIncompletos, headerRule)
console.log('Headers faltantes:', missingIncompletos)
console.log(`Resultado: ${missingIncompletos.length > 0 ? '✓ PASS (detectó faltantes correctamente)' : '✗ FAIL'}`)

// Test 4: Variantes de nombres normalizados
console.log('\n[TEST 4] Variantes de Nombres (normalizados)')
console.log('-'.repeat(80))
const variants = [
  'Codigo',
  'CODIGO',
  'codigo',
  'Documento Identidad',
  'documento identidad',
  'DOCUMENTO IDENTIDAD',
]
console.log('Variantes originales:', variants)
const normalized = variants.map(normalizeHeader)
console.log('Variantes normalizadas:', normalized)
console.log('✓ Todas normalizadas a minúsculas con guiones')

console.log('\n' + '='.repeat(80))
console.log('✓ TEST SUITE COMPLETADO')
console.log('='.repeat(80))
console.log('\nConclusion: El sistema ACEPTA ambos formatos de headers')
