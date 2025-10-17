// ChordGrid tests - ensure chord grid component works correctly
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChordGrid } from '../ChordGrid'

describe('ChordGrid', () => {
  it('renders chord palette with 10 chords', () => {
    render(<ChordGrid />)

    // Check for specific chords in palette (use getByText for unique ones)
    expect(screen.getByTitle('Tonic')).toBeInTheDocument()
    expect(screen.getByTitle('Dominant')).toBeInTheDocument()
    expect(screen.getByTitle('Mediant')).toBeInTheDocument()
    expect(screen.getByTitle('Submediant')).toBeInTheDocument()
    expect(screen.getByTitle('Subtonic')).toBeInTheDocument()
  })

  it('renders 16 grid slots', () => {
    render(<ChordGrid />)

    // Check for grid slot numbers 1-16 (empty state shows numbers)
    for (let i = 1; i <= 16; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument()
    }
  })

  it('selects chord when palette button clicked', () => {
    render(<ChordGrid />)

    const tonicButton = screen.getByTitle('Tonic')
    fireEvent.click(tonicButton)

    // Selected chord gets ring styling (check for ring class)
    expect(tonicButton).toHaveClass('ring-2', 'ring-black/40')
  })

  it('places chord in grid when slot clicked after selecting chord', () => {
    render(<ChordGrid />)

    // Select chord from palette
    const tonicButton = screen.getByTitle('Tonic')
    fireEvent.click(tonicButton)

    // Click first grid slot
    const gridButtons = screen.getAllByRole('button')
    const firstSlot = gridButtons.find(btn => btn.textContent === '1')
    fireEvent.click(firstSlot!)

    // First slot should now show 'I' instead of '1'
    expect(firstSlot).toHaveTextContent('I')
  })

  it('clears grid slot on right-click', () => {
    render(<ChordGrid />)

    // Select and place a chord
    const tonicButton = screen.getByTitle('Tonic')
    fireEvent.click(tonicButton)

    const gridButtons = screen.getAllByRole('button')
    const firstSlot = gridButtons.find(btn => btn.textContent === '1')
    fireEvent.click(firstSlot!)

    // Verify chord placed
    expect(firstSlot).toHaveTextContent('I')

    // Right-click to clear
    fireEvent.contextMenu(firstSlot!)

    // Should show '1' again
    expect(firstSlot).toHaveTextContent('1')
  })

  it('applies Pop preset correctly', () => {
    const { container } = render(<ChordGrid />)

    const popButton = screen.getByText('Pop')
    fireEvent.click(popButton)

    // Pop preset: I-V-vi-IV repeated 4 times
    // Find the grid container (has class grid-cols-4)
    const gridContainer = container.querySelector('.grid-cols-4')
    expect(gridContainer).toBeTruthy()

    // Get all buttons within the grid
    const gridSlots = Array.from(gridContainer!.querySelectorAll('button'))

    // Should have exactly 16 grid slots
    expect(gridSlots.length).toBe(16)

    // Check first 4 bars (Pop: I-V-vi-IV)
    expect(gridSlots[0]).toHaveTextContent('I')
    expect(gridSlots[1]).toHaveTextContent('V')
    expect(gridSlots[2]).toHaveTextContent('vi')
    expect(gridSlots[3]).toHaveTextContent('IV')

    // Verify repetition (bars 4-7)
    expect(gridSlots[4]).toHaveTextContent('I')
    expect(gridSlots[5]).toHaveTextContent('V')
    expect(gridSlots[6]).toHaveTextContent('vi')
    expect(gridSlots[7]).toHaveTextContent('IV')
  })

  it('applies Sad preset correctly', () => {
    const { container } = render(<ChordGrid />)

    const sadButton = screen.getByText('Sad')
    fireEvent.click(sadButton)

    // Sad preset: vi-IV-I-V
    const gridContainer = container.querySelector('.grid-cols-4')
    const gridSlots = Array.from(gridContainer!.querySelectorAll('button'))

    // Check first 4 bars
    expect(gridSlots[0]).toHaveTextContent('vi')
    expect(gridSlots[1]).toHaveTextContent('IV')
    expect(gridSlots[2]).toHaveTextContent('I')
    expect(gridSlots[3]).toHaveTextContent('V')
  })

  it('clears entire grid when Clear button clicked', () => {
    render(<ChordGrid />)

    // Apply a preset first
    const popButton = screen.getByText('Pop')
    fireEvent.click(popButton)

    // Verify preset applied (first slot should have 'I')
    const gridButtons = screen.getAllByRole('button')
    const firstSlot = gridButtons.find(btn =>
      btn.textContent === 'I' || btn.textContent === '1'
    )
    expect(firstSlot).toHaveTextContent('I')

    // Click Clear button
    const clearButton = screen.getByText('Clear')
    fireEvent.click(clearButton)

    // All slots should show numbers 1-16 again
    for (let i = 1; i <= 16; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument()
    }
  })

  it('renders Chord Progression header', () => {
    render(<ChordGrid />)

    expect(screen.getByText('Chord Progression')).toBeInTheDocument()
  })

  it('renders all 4 preset buttons', () => {
    render(<ChordGrid />)

    expect(screen.getByText('Pop')).toBeInTheDocument()
    expect(screen.getByText('Sad')).toBeInTheDocument()
    expect(screen.getByText('Chill')).toBeInTheDocument()
    expect(screen.getByText('Shoegaze')).toBeInTheDocument()
  })
})
