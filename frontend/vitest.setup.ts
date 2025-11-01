import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { api } from './src/connections/http'

// Simple API mock for tests to avoid real network calls
vi.spyOn(api, 'get').mockImplementation(async (url: unknown) => {
	const path = typeof url === 'string' ? url : ''
	if (path.includes('/asignaturas')) {
			const resp: AxiosResponse = {
			data: [
				{ codigo_asignatura: 'CS101', nombre: 'Curso Mock', programa: { nombre: 'Ingeniería' } },
			],
			status: 200,
			statusText: 'OK',
			headers: {},
				config: {} as InternalAxiosRequestConfig,
		}
		return resp
	}
	return {
		data: [],
		status: 200,
		statusText: 'OK',
		headers: {},
				config: {} as InternalAxiosRequestConfig,
	} as AxiosResponse
})
