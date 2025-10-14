import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RaCard from '../components/RaCard'

describe('RaCard', () => {
  it('renders title and subtitle', () => {
    render(<RaCard title="Titulo" subtitle="Sub" />)
    expect(screen.getByText('Titulo')).toBeTruthy()
    expect(screen.getByText('Sub')).toBeTruthy()
  })
})
