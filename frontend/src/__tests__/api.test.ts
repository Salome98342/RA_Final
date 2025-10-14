import { describe, it, expect } from 'vitest'
import { getCourses } from '@/services/api'

describe('api (mocks)', () => {
  it('returns courses', async () => {
    const list = await getCourses()
    expect(Array.isArray(list)).toBe(true)
    expect(list[0]).toHaveProperty('id')
  })
})
