import { useState } from 'react'
import { UserRound } from 'lucide-react'

interface CharacterAvatarProps {
  src: string | null
  /** Lado em px (width/height fixos evitam layout shift) */
  size: number
  alt?: string
  rounded?: string
}

export function CharacterAvatar({ src, size, alt = '', rounded = 'rounded-xl' }: CharacterAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = Boolean(src) && failedSrc !== src

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-[var(--color-surface-2)] text-[var(--color-accent)] ${rounded}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <UserRound
          className="h-1/2 w-1/2"
          role={alt ? 'img' : undefined}
          aria-hidden={alt ? undefined : true}
          aria-label={alt || undefined}
        />
      )}
    </div>
  )
}
