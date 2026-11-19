import { useState } from 'react'
import { ArrowRight, ChevronDown, Clock3, Gamepad2, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { allGames, gameCategories } from '../data/games'
import type { Game } from '../data/games'
import GameIcon from './GameIcon'

export default function GamesSidebar({
  activeGameSlug,
  query,
  onQueryChange,
  recentlyPlayed,
  storageAvailable,
}: {
  activeGameSlug?: string
  query: string
  onQueryChange: (value: string) => void
  recentlyPlayed: Game[]
  storageAvailable: boolean
}) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set([gameCategories[0]]))
  const normalizedQuery = query.trim().toLowerCase()

  const toggleCategory = (category: string) => {
    setOpenCategories((current) => {
      const next = new Set(current)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  return (
    <aside className="games-sidebar" aria-label="Game library">
      <div className="games-sidebar-heading">
        <span className="games-sidebar-mark"><Gamepad2 size={17} aria-hidden="true" /></span>
        <div><span>THE LIBRARY</span><strong>{allGames.length} GAMES</strong></div>
      </div>

      <label className="games-sidebar-search">
        <Search size={15} aria-hidden="true" />
        <span className="visually-hidden">Search games</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search games..."
        />
      </label>

      <section className="games-sidebar-recent" aria-labelledby="recent-games-title">
        <div className="games-sidebar-section-heading">
          <h2 id="recent-games-title"><Clock3 size={13} aria-hidden="true" /> Recently played</h2>
          <span>LOCAL</span>
        </div>
        {recentlyPlayed.length > 0 ? (
          <div className="games-sidebar-recent-list">
            {recentlyPlayed.map((game) => (
              <Link
                className={`games-sidebar-item${activeGameSlug === game.slug ? ' is-active' : ''}`}
                to={`/games/${game.slug}`}
                key={game.slug}
                aria-current={activeGameSlug === game.slug ? 'page' : undefined}
              >
                <GameIcon game={game} size="small" />
                <span>{game.name}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="games-sidebar-empty">Mark a game as played from its game page to keep it here.</p>
        )}
        {!storageAvailable && (
          <p className="games-sidebar-storage-note" role="status">
            Recent games will only be kept for this session because browser storage is unavailable.
          </p>
        )}
      </section>

      <nav className="games-sidebar-categories" aria-label="Game categories">
        {gameCategories.map((category) => {
          const categoryId = `game-category-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
          const categoryGames = allGames.filter((game) => {
            if (game.category !== category) return false
            return !normalizedQuery || `${game.name} ${game.genre} ${game.category}`.toLowerCase().includes(normalizedQuery)
          })
          if (categoryGames.length === 0) return null

          const isOpen = normalizedQuery.length > 0 || openCategories.has(category)
          return (
            <section className="games-sidebar-category" key={category}>
              <button
                className="games-sidebar-category-toggle"
                type="button"
                aria-expanded={isOpen}
                aria-controls={categoryId}
                onClick={() => toggleCategory(category)}
              >
                <span>{category}</span>
                <span className="games-sidebar-category-count">{categoryGames.length}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              <div className="games-sidebar-category-games" id={categoryId} hidden={!isOpen}>
                {categoryGames.map((game) => (
                  <Link
                    className={`games-sidebar-item${activeGameSlug === game.slug ? ' is-active' : ''}`}
                    to={`/games/${game.slug}`}
                    key={game.slug}
                    aria-current={activeGameSlug === game.slug ? 'page' : undefined}
                  >
                    <GameIcon game={game} size="small" />
                    <span>{game.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </nav>

      <Link to="/games" className="games-sidebar-view-all">
        View all games <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </aside>
  )
}
