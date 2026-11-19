import { useState } from 'react'
import type { Game } from '../data/games'

export default function GameIcon({ game, size = 'regular' }: {
  game: Game
  size?: 'small' | 'regular' | 'large' | 'featured'
}) {
  const [imageState, setImageState] = useState<{ url: string; status: 'loaded' | 'error' }>()
  const status = imageState?.url === game.artwork ? imageState.status : 'loading'

  return (
    <span
      className={`game-icon game-icon--${size} is-${status}`}
      aria-hidden="true"
      title={status === 'error' ? 'Artwork unavailable' : undefined}
    >
      {status === 'error' ? (
        <span className="game-icon-fallback">Artwork unavailable</span>
      ) : (
        <img
          src={game.artwork}
          alt=""
          loading={size === 'large' ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setImageState({ url: game.artwork, status: 'loaded' })}
          onError={() => setImageState({ url: game.artwork, status: 'error' })}
        />
      )}
    </span>
  )
}
