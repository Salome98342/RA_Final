import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api } from '@/connections/http'
import { getActivitiesByRA } from '@/services/api'

type AxiosMockResult<T> = { data: T; status: number; statusText: string; headers: Record<string,string>; config: unknown }

// Ensure our mapping of nota/retroalimentacion/indicadorId from backend to Activity is stable.
describe('getActivitiesByRA grade mapping', () => {
  const spy = vi.spyOn(api, 'get')
  beforeEach(() => { spy.mockReset() })
  afterEach(() => { spy.mockReset() })

  it('maps nota, retroalimentacion, id_ind when backend supplies them', async () => {
    spy.mockImplementationOnce(async (): Promise<AxiosMockResult<unknown[]>> => ({
      data: [
        {
          id_actividad: 10,
          id_ra_actividad: 55,
          nombre_actividad: 'Actividad X',
          descripcion: 'Desc',
          porcentaje_ra_actividad: 50,
          id_tipo_actividad: 3,
          tipo_actividad: 'Ensayo',
          fecha_cierre: '2025-11-30',
          indicadores: [{ id_ind: 7, descripcion: 'Ind 1', porcentaje_ind: 40 }],
          nota: 4.2,
          retroalimentacion: 'Buen trabajo',
          id_ind: 7,
        }
      ],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as unknown,
    }))
    const list = await getActivitiesByRA('55', { matriculaId: '123' })
    expect(list).toHaveLength(1)
    const act = list[0]
    expect(act.raActividadId).toBe('55')
    expect(act.nota).toBe(4.2)
    expect(act.retroalimentacion).toBe('Buen trabajo')
    expect(act.indicadorId).toBe('7')
    expect(Array.isArray(act.indicadores)).toBe(true)
    expect(act.indicadores?.[0].id).toBe('7')
  })

  it('gracefully handles activities without nota (ungraded)', async () => {
    spy.mockImplementationOnce(async (): Promise<AxiosMockResult<unknown[]>> => ({
      data: [
        {
          id_actividad: 11,
          id_ra_actividad: 77,
          nombre_actividad: 'Actividad Y',
          porcentaje_ra_actividad: 30,
          indicadores: [],
        }
      ],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as unknown,
    }))
    const list = await getActivitiesByRA('77', { matriculaId: '999' })
    expect(list[0].nota).toBeNull()
    expect(list[0].retroalimentacion).toBeNull()
    expect(list[0].indicadorId).toBeNull()
  })
})
