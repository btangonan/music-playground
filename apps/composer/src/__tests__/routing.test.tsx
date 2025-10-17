// Routing tests - ensure navigation works
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoopBuilderView } from '../views/LoopBuilderView'
import { SongArrangementView } from '../views/SongArrangementView'

describe('LoopBuilderView', () => {
  it('renders loop builder interface', () => {
    render(
      <MemoryRouter>
        <LoopBuilderView />
      </MemoryRouter>
    )

    expect(screen.getByText('▶ Preview Loop')).toBeInTheDocument()
    expect(screen.getByText('💾 Save to Pad')).toBeInTheDocument()
    expect(screen.getByText('Chord Progression')).toBeInTheDocument()
  })

  it('shows navigation link to song view', () => {
    render(
      <MemoryRouter>
        <LoopBuilderView />
      </MemoryRouter>
    )

    const link = screen.getByText(/Switch to Song Arrangement/i)
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toBe('/song')
  })
})

describe('SongArrangementView', () => {
  it('renders song arrangement interface', () => {
    render(
      <MemoryRouter>
        <SongArrangementView />
      </MemoryRouter>
    )

    expect(screen.getByText('Song Timeline')).toBeInTheDocument()
    expect(screen.getByText('▶ Play Song')).toBeInTheDocument()
    expect(screen.getByText('◀ Back to Builder')).toBeInTheDocument()
  })

  it('renders 16 pad slots', () => {
    render(
      <MemoryRouter>
        <SongArrangementView />
      </MemoryRouter>
    )

    // Check for pad numbers 1-16
    for (let i = 1; i <= 16; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument()
    }
  })

  it('shows navigation link back to builder', () => {
    render(
      <MemoryRouter>
        <SongArrangementView />
      </MemoryRouter>
    )

    const link = screen.getByText('◀ Back to Builder')
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toBe('/')
  })
})
