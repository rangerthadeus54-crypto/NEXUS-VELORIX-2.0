import { useCallback, useState } from 'react'
import { allGames, gamesBySlug } from '../data/games'
import type { Game } from '../data/games'

const storageKey = 'nexus-velorix.recent-games.v1'
const maxRecentGames = 5

type RecentGamesState = {
  slugs: string[]
  storageAvailable: boolean
}

function readRecentGames(): RecentGamesState {
  if (typeof window === 'undefined') {
    return { slugs: [], storageAvailable: true }
  }

  try {
    const stored = window.localStorage.getItem(storageKey)
    const validSlugs = new Set(allGames.map(({ slug }) => slug))
    const slugs = (stored ?? '')
      .split(',')
      .filter((slug, index, list) => validSlugs.has(slug) && list.indexOf(slug) === index)
      .slice(0, maxRecentGames)
    return { slugs, storageAvailable: true }
  } catch (error) {
    if (error instanceof DOMException) {
      return { slugs: [], storageAvailable: false }
    }
    throw error
  }
}

export function useRecentlyPlayedGames() {
  const [recentState, setRecentState] = useState(readRecentGames)

  const markPlayed = useCallback((game: Game) => {
    const slugs = [game.slug, ...recentState.slugs.filter((slug) => slug !== game.slug)].slice(0, maxRecentGames)
    let storageAvailable = true

    try {
      window.localStorage.setItem(storageKey, slugs.join(','))
    } catch (error) {
      if (error instanceof DOMException) {
        storageAvailable = false
      } else {
        throw error
      }
    }
    setRecentState({ slugs, storageAvailable })
  }, [recentState.slugs])

  const recentlyPlayed = recentState.slugs
    .map((slug) => gamesBySlug.get(slug))
    .filter((game): game is Game => game !== undefined)

  return {
    recentlyPlayed,
    markPlayed,
    storageAvailable: recentState.storageAvailable,
  }
}
