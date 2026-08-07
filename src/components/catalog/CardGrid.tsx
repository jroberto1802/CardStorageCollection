import type { CardImpression } from '@/types'
import { CatalogCard } from './CatalogCard'

interface CardGridProps {
  items: CardImpression[]
}

export function CardGrid({ items }: CardGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => (
        <CatalogCard key={item.key} impression={item} />
      ))}
    </div>
  )
}
