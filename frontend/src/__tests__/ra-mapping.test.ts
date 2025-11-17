import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getRAsByCourse } from '@/services/api'
import { api } from '@/connections/http'

describe('RA mapping (no percentage text)', () => {
  const spy = vi.spyOn(api, 'get')
  beforeEach(() => {
    spy.mockReset()
  })
  afterEach(() => {
    spy.mockReset()
  })

  it('does not inject percentage string into RA info', async () => {
    spy.mockImplementationOnce(async () => ({
      data: [{ id_ra: 1, titulo: 'RA 1', porcentaje_ra: 40 }],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as import('axios').InternalAxiosRequestConfig,
    }))
    const list = await getRAsByCourse('CS101')
    expect(list[0].titulo).toBe('RA 1')
    expect(list[0].info ?? '').not.toMatch(/%/)
    expect(list[0].info ?? '').not.toMatch(/Peso/i)
  })
})
