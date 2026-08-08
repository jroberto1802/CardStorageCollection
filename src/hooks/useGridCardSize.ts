import { useCallback, useEffect, useState } from 'react'
import type { GridCardSize } from '@/types'

const STORAGE_KEY = 'csc-grid-card-size'

export const GRID_CARD_SIZE_OPTIONS: {
  value: GridCardSize
  label: string
  title: string
}[] = [
  { value: 'pp', label: 'PP', title: 'Quadros bem pequenos (mais por linha)' },
  { value: 'sm', label: 'P', title: 'Quadros pequenos' },
  { value: 'md', label: 'M', title: 'Quadros médios' },
  { value: 'lg', label: 'G', title: 'Quadros grandes (menos por linha)' },
]

export function gridCardSizeClass(size: GridCardSize): string {
  switch (size) {
    case 'pp':
      return 'grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-10'
    case 'sm':
      return 'grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8'
    case 'lg':
      return 'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
    case 'md':
    default:
      return 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
  }
}

function readStoredSize(): GridCardSize {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'pp' || stored === 'sm' || stored === 'md' || stored === 'lg'
    ? stored
    : 'md'
}

export function useGridCardSize() {
  const [gridSize, setGridSizeState] = useState<GridCardSize>(readStoredSize)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, gridSize)
  }, [gridSize])

  const setGridSize = useCallback((next: GridCardSize) => {
    setGridSizeState(next)
  }, [])

  return { gridSize, setGridSize }
}
