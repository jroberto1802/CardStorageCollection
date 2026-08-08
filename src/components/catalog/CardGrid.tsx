import type { CardImpression, GridCardSize } from '@/types'
import { gridCardSizeClass } from '@/hooks/useGridCardSize'
import { CatalogCard } from './CatalogCard'

interface CardGridProps {
  items: CardImpression[]
  size?: GridCardSize
}

export function CardGrid({ items, size = 'md' }: CardGridProps) {
  return (
    <div className={gridCardSizeClass(size)}>
      {items.map((item) => (
        <CatalogCard key={item.key} impression={item} />
      ))}
    </div>
  )
}
