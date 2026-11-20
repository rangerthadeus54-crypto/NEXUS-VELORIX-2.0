import { apiGet, apiPatch, apiPost } from './client'
import type {
  CommunityCreateRequest,
  CommunitySummary,
  GameSummary,
  LeaderboardEntry,
  PlayerProfileRecord,
  PlayerProfileUpdate,
  TeamSummary,
  TournamentStatus,
  TournamentSummary,
  UserSummary,
} from './types'

type ListOptions = {
  limit?: number
  offset?: number
  signal?: AbortSignal
}

type GameListOptions = ListOptions & { q?: string }
type CommunityListOptions = ListOptions & { game_id?: string }
type TeamListOptions = ListOptions & { game_id?: string }
type TournamentListOptions = ListOptions & {
  game_id?: string
  status?: TournamentStatus
}
type LeaderboardListOptions = ListOptions & {
  scope?: 'global' | 'country'
  game_id?: string
}

function queryString(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) query.set(key, String(value))
  }
  const encoded = query.toString()
  return encoded ? `?${encoded}` : ''
}

function listQuery(
  options: ListOptions,
  filters: Record<string, string | number | undefined> = {},
) {
  return queryString({
    ...filters,
    limit: options.limit,
    offset: options.offset,
  })
}

export const usersApi = {
  list(options: ListOptions = {}) {
    return apiGet<UserSummary[]>(
      `/api/v1/users${listQuery(options)}`,
      { signal: options.signal },
    )
  },
  get(userId: string, options: Pick<ListOptions, 'signal'> = {}) {
    return apiGet<UserSummary>(`/api/v1/users/${encodeURIComponent(userId)}`, options)
  },
}

export const profilesApi = {
  getCurrent(options: Pick<ListOptions, 'signal'> = {}) {
    return apiGet<PlayerProfileRecord>(
      '/api/v1/profiles/me',
      { authenticated: true, signal: options.signal },
    )
  },
  updateCurrent(profile: PlayerProfileUpdate, options: Pick<ListOptions, 'signal'> = {}) {
    return apiPatch<PlayerProfileRecord>(
      '/api/v1/profiles/me',
      profile,
      { authenticated: true, signal: options.signal },
    )
  },
  get(userId: string, options: Pick<ListOptions, 'signal'> = {}) {
    return apiGet<PlayerProfileRecord>(
      `/api/v1/profiles/${encodeURIComponent(userId)}`,
      { authenticated: true, signal: options.signal },
    )
  },
}

export const gamesApi = {
  list(options: GameListOptions = {}) {
    return apiGet<GameSummary[]>(
      `/api/v1/games${listQuery(options, { q: options.q })}`,
      { signal: options.signal },
    )
  },
  get(gameId: string, options: Pick<ListOptions, 'signal'> = {}) {
    return apiGet<GameSummary>(`/api/v1/games/${encodeURIComponent(gameId)}`, options)
  },
}

export const communitiesApi = {
  create(
    community: CommunityCreateRequest,
    idempotencyKey: string,
    options: Pick<ListOptions, 'signal'> = {},
  ) {
    return apiPost<CommunitySummary>('/api/v1/communities', community, {
      authenticated: true,
      headers: { 'Idempotency-Key': idempotencyKey },
      signal: options.signal,
    })
  },
  list(options: CommunityListOptions = {}) {
    return apiGet<CommunitySummary[]>(
      `/api/v1/communities${listQuery(options, { game_id: options.game_id })}`,
      { signal: options.signal },
    )
  },
  get(communityId: string, options: Pick<ListOptions, 'signal'> = {}) {
    return apiGet<CommunitySummary>(
      `/api/v1/communities/${encodeURIComponent(communityId)}`,
      options,
    )
  },
}

export const teamsApi = {
  list(options: TeamListOptions = {}) {
    return apiGet<TeamSummary[]>(
      `/api/v1/teams${listQuery(options, { game_id: options.game_id })}`,
      { signal: options.signal },
    )
  },
  get(teamId: string, options: Pick<ListOptions, 'signal'> = {}) {
    return apiGet<TeamSummary>(`/api/v1/teams/${encodeURIComponent(teamId)}`, options)
  },
}

export const tournamentsApi = {
  list(options: TournamentListOptions = {}) {
    return apiGet<TournamentSummary[]>(
      `/api/v1/tournaments${listQuery(options, {
        game_id: options.game_id,
        status: options.status,
      })}`,
      { signal: options.signal },
    )
  },
  get(tournamentId: string, options: Pick<ListOptions, 'signal'> = {}) {
    return apiGet<TournamentSummary>(
      `/api/v1/tournaments/${encodeURIComponent(tournamentId)}`,
      options,
    )
  },
}

export const leaderboardsApi = {
  list(options: LeaderboardListOptions = {}) {
    return apiGet<LeaderboardEntry[]>(
      `/api/v1/leaderboards${listQuery(options, {
        scope: options.scope,
        game_id: options.game_id,
      })}`,
      { signal: options.signal },
    )
  },
}
